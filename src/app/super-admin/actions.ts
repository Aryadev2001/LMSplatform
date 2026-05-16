"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants, users } from "@/db/schema";
import { requireSuper, type SuperRole } from "@/lib/auth";
import { canWrite, canManageTeam } from "@/lib/super";
import { recordAudit } from "@/lib/audit";
import { RESERVED_SUBDOMAINS } from "@/lib/tenant";

type Result = { success: true } | { success: false; error: string };

const HEX = /^#[0-9a-fA-F]{6}$/;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug must be at least 2 characters")
  .max(63, "Slug must be at most 63 characters")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
    "Lowercase letters, numbers and hyphens only; cannot start/end with a hyphen",
  )
  .refine((s) => !RESERVED_SUBDOMAINS.has(s), "That subdomain is reserved");

const CreateTenantSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: slugSchema,
  brandPrimaryColor: z.string().regex(HEX).optional(),
  brandSecondaryColor: z.string().regex(HEX).optional(),
  heroTagline: z.string().trim().max(240).optional().or(z.literal("")),
});

const UpdateTenantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL", "CHURNED"]),
  brandPrimaryColor: z.string().regex(HEX),
  brandSecondaryColor: z.string().regex(HEX),
  heroTagline: z.string().trim().max(240).optional().or(z.literal("")),
  referralEnabled: z.boolean(),
  referralPointsPercent: z.coerce.number().min(0).max(100),
  referralRedeemMaxPercent: z.coerce.number().min(0).max(100),
});

const InviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  fullName: z.string().trim().max(200).optional().or(z.literal("")),
  superRole: z.enum(["SUPER_OWNER", "SUPER_STAFF", "SUPER_SUPPORT"]),
});

export async function createTenant(input: unknown): Promise<Result> {
  const me = await requireSuper(); // any super may reach here…
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — you cannot create tenants." };
  }
  const parsed = CreateTenantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const clash = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, data.slug))
    .limit(1);
  if (clash.length > 0) {
    return { success: false, error: `Slug "${data.slug}" is already taken.` };
  }

  const [row] = await db
    .insert(tenants)
    .values({
      name: data.name,
      slug: data.slug,
      ...(data.brandPrimaryColor ? { brandPrimaryColor: data.brandPrimaryColor } : {}),
      ...(data.brandSecondaryColor ? { brandSecondaryColor: data.brandSecondaryColor } : {}),
      heroTagline: data.heroTagline || null,
    })
    .returning({ id: tenants.id });

  const audited = await recordAudit({
    action: "tenant.create",
    targetType: "tenant",
    targetId: row.id,
    metadata: { slug: data.slug, name: data.name },
  });
  if (!audited) {
    // Don't leave an unaudited super write — roll the row back.
    await db.delete(tenants).where(eq(tenants.id, row.id));
    return { success: false, error: "Could not record audit entry — tenant not created." };
  }

  revalidatePath("/super-admin/tenants");
  return { success: true };
}

export async function updateTenant(input: unknown): Promise<Result> {
  const me = await requireSuper();
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — you cannot edit tenants." };
  }
  const parsed = UpdateTenantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const exists = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, d.tenantId))
    .limit(1);
  if (exists.length === 0) {
    return { success: false, error: "Tenant not found." };
  }

  await db
    .update(tenants)
    .set({
      name: d.name,
      status: d.status,
      brandPrimaryColor: d.brandPrimaryColor,
      brandSecondaryColor: d.brandSecondaryColor,
      heroTagline: d.heroTagline || null,
      referralEnabled: d.referralEnabled,
      referralPointsPercent: d.referralPointsPercent,
      referralRedeemMaxPercent: d.referralRedeemMaxPercent,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, d.tenantId));

  await recordAudit({
    action: "tenant.update",
    targetType: "tenant",
    targetId: d.tenantId,
    metadata: { name: d.name, status: d.status },
  });

  revalidatePath(`/super-admin/tenants/${d.tenantId}`);
  revalidatePath("/super-admin/tenants");
  return { success: true };
}

export async function inviteSuperMember(input: unknown): Promise<Result> {
  const me = await requireSuper();
  if (!canManageTeam(me.rawRole as SuperRole)) {
    return { success: false, error: "Only the Owner can manage the super-admin team." };
  }
  const parsed = InviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, fullName, superRole } = parsed.data;

  const clerk = await clerkClient();
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  const clerkUser = existing.data[0];

  if (clerkUser) {
    await clerk.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { ...(clerkUser.publicMetadata ?? {}), role: superRole },
    });
    const dbRow = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkUser.id))
      .limit(1);
    if (dbRow.length === 0) {
      await db.insert(users).values({
        clerkId: clerkUser.id,
        email,
        fullName: fullName || "EDT Team",
        role: superRole,
        isSuperAdmin: true,
        tenantId: null,
      });
    } else {
      await db
        .update(users)
        .set({ role: superRole, isSuperAdmin: true, tenantId: null, updatedAt: new Date() })
        .where(eq(users.clerkId, clerkUser.id));
    }
  } else {
    try {
      await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/post-login`,
        publicMetadata: { role: superRole },
        notify: true,
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send invitation",
      };
    }
  }

  await recordAudit({
    action: "super_team.invite",
    targetType: "user",
    targetId: email,
    metadata: { superRole, existed: !!clerkUser },
  });

  revalidatePath("/super-admin/team");
  return { success: true };
}
