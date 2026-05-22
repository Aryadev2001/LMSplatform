"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db/client";
import { courseReviews } from "@/db/schema";
import { requireSuper, type SuperRole } from "@/lib/auth";
import { canWrite } from "@/lib/super";
import { recordAudit } from "@/lib/audit";

const HideSchema = z.object({
  reviewId: z.uuid(),
  reason: z.string().trim().max(240).optional().or(z.literal("")),
});

export type ModResult = { success: true } | { success: false; error: string };

/** Mark a review as hidden — it disappears from public aggregates,
 *  the course detail page, the storefront, and per-course card ratings. */
export async function hideReview(
  input: z.infer<typeof HideSchema>,
): Promise<ModResult> {
  const me = await requireSuper();
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — cannot moderate." };
  }
  const parsed = HideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const d = parsed.data;
  const [row] = await db
    .select({ tenantId: courseReviews.tenantId, courseId: courseReviews.courseId })
    .from(courseReviews)
    .where(eq(courseReviews.id, d.reviewId))
    .limit(1);
  if (!row) return { success: false, error: "Review not found." };

  await db
    .update(courseReviews)
    .set({
      hiddenAt: new Date(),
      hiddenReason: d.reason && d.reason.length > 0 ? d.reason : null,
    })
    .where(eq(courseReviews.id, d.reviewId));

  await recordAudit({
    action: "review.hide",
    targetType: "course_review",
    targetId: d.reviewId,
    metadata: { tenantId: row.tenantId, reason: d.reason ?? null },
  });

  revalidatePath("/super-admin/reviews");
  revalidateTag("course", "default");
  revalidateTag("tenant", "default");
  revalidateTag("marketplace", "default");
  return { success: true };
}

export async function unhideReview(reviewId: string): Promise<ModResult> {
  const me = await requireSuper();
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — cannot moderate." };
  }
  if (!z.uuid().safeParse(reviewId).success) {
    return { success: false, error: "Invalid review id." };
  }
  await db
    .update(courseReviews)
    .set({ hiddenAt: null, hiddenReason: null })
    .where(eq(courseReviews.id, reviewId));

  await recordAudit({
    action: "review.unhide",
    targetType: "course_review",
    targetId: reviewId,
    metadata: {},
  });

  revalidatePath("/super-admin/reviews");
  revalidateTag("course", "default");
  revalidateTag("tenant", "default");
  revalidateTag("marketplace", "default");
  return { success: true };
}
