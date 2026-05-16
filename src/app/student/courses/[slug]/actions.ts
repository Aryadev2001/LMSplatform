"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { users, lessonProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

const Schema = z.object({ lessonId: z.uuid(), slug: z.string() });

export async function markLessonComplete(input: z.infer<typeof Schema>) {
  const auth = await requireRole("student");
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid input" };

  const [me] = await db.select().from(users).where(eq(users.clerkId, auth.userId)).limit(1);
  if (!me) return { success: false as const, error: "User not found" };

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
