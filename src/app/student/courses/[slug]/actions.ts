"use server";

import { z } from "zod";
import { db } from "@/db/client";
import {
  users,
  lessonProgress,
  lessons,
  modules,
  programs,
  enrollments,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

const Schema = z.object({ lessonId: z.uuid(), slug: z.string() });

export async function markLessonComplete(input: z.infer<typeof Schema>) {
  const auth = await requireRole("student");
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid input" };

  const [me] = await db.select().from(users).where(eq(users.clerkId, auth.userId)).limit(1);
  if (!me) return { success: false as const, error: "User not found" };

  // Resolve the lesson's course, then verify the student is ENROLLED in it.
  // Entitlement is the enrollment row, NOT a tenant match — in the marketplace
  // a learner (e.g. on the apex) is routinely enrolled in another institute's
  // course, so the old `programs.tenantId === requireTenantId()` check rejected
  // every cross-institute lesson and the "Mark complete" button silently failed.
  const [owns] = await db
    .select({ programId: programs.id })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(programs, eq(programs.id, modules.courseId))
    .where(eq(lessons.id, parsed.data.lessonId))
    .limit(1);
  if (!owns) return { success: false as const, error: "Lesson not found" };

  const [enr] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, me.id),
        eq(enrollments.programId, owns.programId),
        inArray(enrollments.status, ["paid", "account_created", "assigned"]),
      ),
    )
    .limit(1);
  if (!enr) return { success: false as const, error: "You're not enrolled in this course." };

  const existing = await db
    .select({ id: lessonProgress.id })
    .from(lessonProgress)
    .where(
      and(eq(lessonProgress.userId, me.id), eq(lessonProgress.lessonId, parsed.data.lessonId)),
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(lessonProgress).values({
      userId: me.id,
      lessonId: parsed.data.lessonId,
      percentComplete: 100,
      completedAt: new Date(),
    });
  } else {
    await db
      .update(lessonProgress)
      .set({ percentComplete: 100, completedAt: new Date(), lastWatchedAt: new Date() })
      .where(eq(lessonProgress.id, existing[0].id));
  }

  revalidatePath(`/student/courses/${parsed.data.slug}`);
  return { success: true as const };
}
