"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { modules, lessons } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

async function gate() {
  await requireRole("admin");
}

const ResourceSchema = z.object({
  label: z.string().min(1).max(160),
  url: z.string().url("Enter a valid URL"),
});

// ---------- Modules ----------
const ModuleSchema = z.object({
  courseId: z.uuid(),
  title: z.string().min(2, "Title is required").max(240),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export async function createModule(input: z.infer<typeof ModuleSchema>) {
  await gate();
  const p = ModuleSchema.safeParse(input);
  if (!p.success) return { success: false as const, error: p.error.issues[0]?.message ?? "Invalid" };
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(order_index), -1)::int` })
    .from(modules)
    .where(eq(modules.courseId, p.data.courseId));
  await db.insert(modules).values({
    courseId: p.data.courseId,
    title: p.data.title,
    description: p.data.description || null,
    orderIndex: (max ?? -1) + 1,
  });
  revalidatePath(`/admin/programs/${p.data.courseId}`);
  return { success: true as const };
}

export async function updateModule(
  moduleId: string,
  courseId: string,
  title: string,
  description: string,
) {
  await gate();
  if (title.trim().length < 2) return { success: false as const, error: "Title too short" };
  await db
    .update(modules)
    .set({ title: title.trim(), description: description || null })
    .where(eq(modules.id, moduleId));
  revalidatePath(`/admin/programs/${courseId}`);
  return { success: true as const };
}

export async function deleteModule(
  moduleId: string,
  courseId: string,
): Promise<{ success: boolean; error?: string }> {
  await gate();
  try {
    await db.delete(modules).where(eq(modules.id, moduleId));
    revalidatePath(`/admin/programs/${courseId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}

// ---------- Lessons ----------
const LessonSchema = z.object({
  moduleId: z.uuid(),
  courseId: z.uuid(),
  title: z.string().min(2, "Title is required").max(240),
  videoUrl: z.string().url("Enter a valid video URL").optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).max(600),
  resources: z.array(ResourceSchema).max(20),
});

export async function createLesson(input: z.infer<typeof LessonSchema>) {
  await gate();
  const p = LessonSchema.safeParse(input);
  if (!p.success) return { success: false as const, error: p.error.issues[0]?.message ?? "Invalid" };
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(order_index), -1)::int` })
    .from(lessons)
    .where(eq(lessons.moduleId, p.data.moduleId));
  await db.insert(lessons).values({
    moduleId: p.data.moduleId,
    title: p.data.title,
    videoUrl: p.data.videoUrl || null,
    durationSeconds: p.data.durationMinutes * 60,
    resources: p.data.resources,
    orderIndex: (max ?? -1) + 1,
  });
  revalidatePath(`/admin/programs/${p.data.courseId}`);
  return { success: true as const };
}

export async function updateLesson(
  lessonId: string,
  input: z.infer<typeof LessonSchema>,
) {
  await gate();
  const p = LessonSchema.safeParse(input);
  if (!p.success) return { success: false as const, error: p.error.issues[0]?.message ?? "Invalid" };
  await db
    .update(lessons)
    .set({
      title: p.data.title,
      videoUrl: p.data.videoUrl || null,
      durationSeconds: p.data.durationMinutes * 60,
      resources: p.data.resources,
    })
    .where(eq(lessons.id, lessonId));
  revalidatePath(`/admin/programs/${p.data.courseId}`);
  return { success: true as const };
}

export async function deleteLesson(
  lessonId: string,
  courseId: string,
): Promise<{ success: boolean; error?: string }> {
  await gate();
  try {
    await db.delete(lessons).where(eq(lessons.id, lessonId));
    revalidatePath(`/admin/programs/${courseId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
