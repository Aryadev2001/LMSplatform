"use server";

import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  courseReviews,
  enrollments,
  programs,
  users,
} from "@/db/schema";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

/**
 * Course reviews — submit + delete.
 *
 * Eligibility: only an enrolled student (paid / account_created / assigned)
 * may leave a review. One review per (user, course) — the table's unique
 * index enforces this, and the action upserts via that constraint.
 */

const PAID_STATUSES = ["paid", "account_created", "assigned"] as const;

const SubmitSchema = z.object({
  courseId: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type SubmitReviewResult =
  | { success: true }
  | { success: false; error: string };

async function loadStudent(): Promise<string | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  return u?.id ?? null;
}

export async function submitReview(
  input: z.infer<typeof SubmitSchema>,
): Promise<SubmitReviewResult> {
  await requireRole("student");
  const dbUserId = await loadStudent();
  if (!dbUserId) return { success: false, error: "Sign in first." };

  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid review",
    };
  }
  const { courseId, rating, body } = parsed.data;

  // Find the course + its tenant — we need tenant_id on the review row.
  const [course] = await db
    .select({ tenantId: programs.tenantId, slug: programs.slug })
    .from(programs)
    .where(eq(programs.id, courseId))
    .limit(1);
  if (!course || !course.tenantId) {
    return { success: false, error: "Course not found." };
  }

  // Enrollment check — most recent paid enrollment links the review to a
  // real purchase (or assigned access), which we surface in the audit log.
  const [enrolment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, dbUserId),
        eq(enrollments.programId, courseId),
        inArray(enrollments.status, [...PAID_STATUSES]),
      ),
    )
    .orderBy(desc(enrollments.createdAt))
    .limit(1);
  if (!enrolment) {
    return {
      success: false,
      error: "Only enrolled students can review this course.",
    };
  }

  await db
    .insert(courseReviews)
    .values({
      courseId,
      userId: dbUserId,
      tenantId: course.tenantId,
      enrollmentId: enrolment.id,
      rating,
      body: body && body.length > 0 ? body : null,
    })
    .onConflictDoUpdate({
      target: [courseReviews.courseId, courseReviews.userId],
      set: {
        rating,
        body: body && body.length > 0 ? body : null,
        enrollmentId: enrolment.id,
      },
    });

  await recordAudit({
    action: "review.submit",
    targetType: "course",
    targetId: courseId,
    metadata: { rating, hasBody: !!(body && body.length > 0) },
  });

  // Revalidate every page that surfaces the rating.
  revalidatePath("/student/courses");
  revalidatePath(`/student/courses/${course.slug ?? ""}`);
  if (course.slug) revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/explore");
  revalidatePath("/");
  return { success: true };
}

export async function deleteMyReview(
  courseId: string,
): Promise<SubmitReviewResult> {
  await requireRole("student");
  const dbUserId = await loadStudent();
  if (!dbUserId) return { success: false, error: "Sign in first." };

  const [course] = await db
    .select({ slug: programs.slug })
    .from(programs)
    .where(eq(programs.id, courseId))
    .limit(1);

  await db
    .delete(courseReviews)
    .where(
      and(
        eq(courseReviews.courseId, courseId),
        eq(courseReviews.userId, dbUserId),
      ),
    );

  await recordAudit({
    action: "review.delete",
    targetType: "course",
    targetId: courseId,
    metadata: {},
  });

  revalidatePath("/student/courses");
  if (course?.slug) {
    revalidatePath(`/student/courses/${course.slug}`);
    revalidatePath(`/courses/${course.slug}`);
  }
  revalidatePath("/explore");
  revalidatePath("/");
  return { success: true };
}
