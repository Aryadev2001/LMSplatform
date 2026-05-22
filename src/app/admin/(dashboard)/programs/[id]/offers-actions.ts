"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { courseOffers, programs } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";

/**
 * Per-course offers (reward points / reward percentage / voucher codes).
 * Schema lives in migration 0013. All mutations re-derive tenantId from the
 * session and confirm the target course (and offer, where applicable)
 * belongs to it. A tenant admin cannot mutate another tenant's offer.
 */

const OfferTypeEnum = z.enum([
  "reward_points",
  "reward_percentage",
  "voucher_code",
]);

const OfferSchema = z.object({
  courseId: z.uuid(),
  type: OfferTypeEnum,
  /** Points (any int), or percentage 0-100, or voucher discount % 0-100. */
  valueInt: z.coerce.number().int().min(0).max(100000),
  voucherCode: z.string().trim().max(40).optional().or(z.literal("")),
  maxRedemptions: z.coerce.number().int().min(0).max(1_000_000).optional(),
  startsAt: z.string().trim().optional().or(z.literal("")), // ISO date-time
  expiresAt: z.string().trim().optional().or(z.literal("")), // ISO date-time
  isActive: z.boolean().optional().default(true),
});

export type OfferResult =
  | { success: true; offerId: string }
  | { success: false; error: string };

async function assertOwnsCourse(
  courseId: string,
  tenantId: string,
): Promise<boolean> {
  const [c] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.id, courseId), eq(programs.tenantId, tenantId)))
    .limit(1);
  return !!c;
}

function parseDateOrNull(s: string | undefined | null): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

export async function createOffer(
  input: z.infer<typeof OfferSchema>,
): Promise<OfferResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = OfferSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const d = parsed.data;
  if (!(await assertOwnsCourse(d.courseId, tenantId))) {
    return { success: false, error: "Course not found in your workspace." };
  }
  // Voucher type requires a code; the others must NOT carry one.
  const code =
    d.type === "voucher_code" && d.voucherCode
      ? d.voucherCode.trim().toUpperCase()
      : null;
  if (d.type === "voucher_code" && !code) {
    return {
      success: false,
      error: "voucherCode: required for voucher offers.",
    };
  }
  // Percentage clamping (0-100) for the two pct-style types.
  if (
    (d.type === "reward_percentage" || d.type === "voucher_code") &&
    d.valueInt > 100
  ) {
    return {
      success: false,
      error: "valueInt: percentages can't exceed 100.",
    };
  }
  const [row] = await db
    .insert(courseOffers)
    .values({
      tenantId,
      programId: d.courseId,
      type: d.type,
      valueInt: d.valueInt,
      voucherCode: code,
      maxRedemptions: d.maxRedemptions ?? null,
      redemptionsUsed: 0,
      startsAt: parseDateOrNull(d.startsAt),
      expiresAt: parseDateOrNull(d.expiresAt),
      isActive: d.isActive ?? true,
    })
    .returning({ id: courseOffers.id });
  await recordAudit({
    action: "offer.create",
    targetType: "course_offer",
    targetId: row.id,
    metadata: { tenantId, courseId: d.courseId, type: d.type },
  });
  revalidatePath(`/admin/programs/${d.courseId}`);
  revalidatePath(`/courses`);
  return { success: true, offerId: row.id };
}

const UpdateOfferSchema = OfferSchema.extend({ offerId: z.uuid() });

export async function updateOffer(
  input: z.infer<typeof UpdateOfferSchema>,
): Promise<OfferResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = UpdateOfferSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const d = parsed.data;
  // Ownership chain: offer.tenant === session.tenant AND offer.program === courseId
  const [own] = await db
    .select({ programId: courseOffers.programId })
    .from(courseOffers)
    .where(
      and(eq(courseOffers.id, d.offerId), eq(courseOffers.tenantId, tenantId)),
    )
    .limit(1);
  if (!own || own.programId !== d.courseId) {
    return { success: false, error: "Offer not found in your workspace." };
  }
  const code =
    d.type === "voucher_code" && d.voucherCode
      ? d.voucherCode.trim().toUpperCase()
      : null;
  if (d.type === "voucher_code" && !code) {
    return {
      success: false,
      error: "voucherCode: required for voucher offers.",
    };
  }
  if (
    (d.type === "reward_percentage" || d.type === "voucher_code") &&
    d.valueInt > 100
  ) {
    return {
      success: false,
      error: "valueInt: percentages can't exceed 100.",
    };
  }
  await db
    .update(courseOffers)
    .set({
      type: d.type,
      valueInt: d.valueInt,
      voucherCode: code,
      maxRedemptions: d.maxRedemptions ?? null,
      startsAt: parseDateOrNull(d.startsAt),
      expiresAt: parseDateOrNull(d.expiresAt),
      isActive: d.isActive ?? true,
    })
    .where(
      and(eq(courseOffers.id, d.offerId), eq(courseOffers.tenantId, tenantId)),
    );
  await recordAudit({
    action: "offer.update",
    targetType: "course_offer",
    targetId: d.offerId,
    metadata: { tenantId, courseId: d.courseId, type: d.type },
  });
  revalidatePath(`/admin/programs/${d.courseId}`);
  return { success: true, offerId: d.offerId };
}

export async function deleteOffer(
  offerId: string,
  courseId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const [own] = await db
    .select({ programId: courseOffers.programId })
    .from(courseOffers)
    .where(
      and(eq(courseOffers.id, offerId), eq(courseOffers.tenantId, tenantId)),
    )
    .limit(1);
  if (!own || own.programId !== courseId) {
    return { success: false, error: "Offer not found in your workspace." };
  }
  await db
    .delete(courseOffers)
    .where(
      and(eq(courseOffers.id, offerId), eq(courseOffers.tenantId, tenantId)),
    );
  await recordAudit({
    action: "offer.delete",
    targetType: "course_offer",
    targetId: offerId,
    metadata: { tenantId, courseId },
  });
  revalidatePath(`/admin/programs/${courseId}`);
  return { success: true };
}
