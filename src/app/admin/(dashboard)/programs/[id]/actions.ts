"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { modules, lessons, programs } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";

async function gate() {
  await requireRole("admin");
}

/** The course must belong to the caller's tenant (acceptance #6). */
async function ownsCourse(courseId: string): Promise<boolean> {
  const tenantId = await requireTenantId();
  const [c] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.id, courseId), eq(programs.tenantId, tenantId)))
    .limit(1);
  return !!c;
}

async function moduleInCourse(moduleId: string, courseId: string): Promise<boolean> {
  const [m] = await db
    .select({ id: modules.id })
    .from(modules)
    .where(and(eq(modules.id, moduleId), eq(modules.courseId, courseId)))
    .limit(1);
  return !!m;
}

async function lessonInCourse(lessonId: string, courseId: string): Promise<boolean> {
  const [l] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(and(eq(lessons.id, lessonId), eq(modules.courseId, courseId)))
    .limit(1);
  return !!l;
}

const DENIED = { success: false as const, error: "Not found in your workspace." };

const ResourceSchema = z.object({
  label: z.string().min(1).max(160),
  url: z.string().url("Enter a valid URL"),
});

// ---------- Modules ----------
const ModuleSchema = z.object({
  courseId: z.uuid(),
  title: z.string().min(2, "Title is required").max(240),
  description: z.string().max(2000).optional().or(z.literal("")),
  // Drip: absolute release date and/or "unlock N days after enrollment".
  releaseAt: z.string().optional().nullable(),
  unlockAfterDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
});

/** Parse a datetime-local / ISO string to a Date, or null when empty/invalid. */
function parseReleaseAt(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createModule(input: z.infer<typeof ModuleSchema>) {
  await gate();
  const p = ModuleSchema.safeParse(input);
  if (!p.success) return { success: false as const, error: p.error.issues[0]?.message ?? "Invalid" };
  if (!(await ownsCourse(p.data.courseId))) return DENIED;
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(order_index), -1)::int` })
    .from(modules)
    .where(eq(modules.courseId, p.data.courseId));
  await db.insert(modules).values({
    courseId: p.data.courseId,
    title: p.data.title,
    description: p.data.description || null,
    releaseAt: parseReleaseAt(p.data.releaseAt),
    unlockAfterDays: p.data.unlockAfterDays ?? null,
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
  releaseAt?: string | null,
  unlockAfterDays?: number | null,
) {
  await gate();
  if (title.trim().length < 2) return { success: false as const, error: "Title too short" };
  if (!(await ownsCourse(courseId)) || !(await moduleInCourse(moduleId, courseId)))
    return DENIED;
  await db
    .update(modules)
    .set({
      title: title.trim(),
      description: description || null,
      releaseAt: parseReleaseAt(releaseAt),
      unlockAfterDays:
        unlockAfterDays === undefined || unlockAfterDays === null || Number.isNaN(unlockAfterDays)
          ? null
          : unlockAfterDays,
    })
    .where(eq(modules.id, moduleId));
  revalidatePath(`/admin/programs/${courseId}`);
  return { success: true as const };
}

export async function deleteModule(
  moduleId: string,
  courseId: string,
): Promise<{ success: boolean; error?: string }> {
  await gate();
  if (!(await ownsCourse(courseId)) || !(await moduleInCourse(moduleId, courseId)))
    return DENIED;
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
  if (!(await ownsCourse(p.data.courseId)) || !(await moduleInCourse(p.data.moduleId, p.data.courseId)))
    return DENIED;
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
  if (!(await ownsCourse(p.data.courseId)) || !(await lessonInCourse(lessonId, p.data.courseId)))
    return DENIED;
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
  if (!(await ownsCourse(courseId)) || !(await lessonInCourse(lessonId, courseId)))
    return DENIED;
  try {
    await db.delete(lessons).where(eq(lessons.id, lessonId));
    revalidatePath(`/admin/programs/${courseId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
