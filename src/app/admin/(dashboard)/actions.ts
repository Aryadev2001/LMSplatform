"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { programs, students, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole, isStudentRole } from "@/lib/auth";

// ---------- Program CRUD ----------
const ProgramSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).default("USD"),
  durationMonths: z.number().int().min(1).max(60),
  isActive: z.boolean().default(true),
});

export type ProgramResult = { success: true; id: string } | { success: false; error: string };

export async function createProgram(input: z.infer<typeof ProgramSchema>): Promise<ProgramResult> {
  await requireRole("admin");
  const parsed = ProgramSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const [row] = await db
    .insert(programs)
    .values({
      name: parsed.data.name,
      description: parsed.data.description || null,
      priceCents: parsed.data.priceCents,
      currency: parsed.data.currency,
      durationMonths: parsed.data.durationMonths,
      isActive: parsed.data.isActive,
    })
    .returning({ id: programs.id });
  revalidatePath("/admin/programs");
  return { success: true, id: row.id };
}

export async function updateProgram(
  id: string,
  input: z.infer<typeof ProgramSchema>,
): Promise<ProgramResult> {
  await requireRole("admin");
  const parsed = ProgramSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db
    .update(programs)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      priceCents: parsed.data.priceCents,
      currency: parsed.data.currency,
      durationMonths: parsed.data.durationMonths,
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(programs.id, id));
  revalidatePath("/admin/programs");
  return { success: true, id };
}

export async function toggleProgramActive(id: string, isActive: boolean) {
  await requireRole("admin");
  await db.update(programs).set({ isActive, updatedAt: new Date() }).where(eq(programs.id, id));
  revalidatePath("/admin/programs");
  return { success: true as const };
}

// ---------- Assign student to a program/course ----------
const AssignSchema = z.object({
  studentUserId: z.uuid(),
  programId: z.uuid().nullable(),
});

export async function assignStudent(input: z.infer<typeof AssignSchema>) {
  await requireRole("admin");
  const parsed = AssignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, parsed.data.studentUserId))
    .limit(1);
  if (existing.length === 0 || !isStudentRole(existing[0].role)) {
    return { success: false as const, error: "Student not found" };
  }

  const existingStudent = await db
    .select()
    .from(students)
    .where(eq(students.userId, parsed.data.studentUserId))
    .limit(1);
  if (existingStudent.length === 0) {
    await db.insert(students).values({
      userId: parsed.data.studentUserId,
      assignedProgramId: parsed.data.programId,
    });
  } else {
    await db
      .update(students)
      .set({ assignedProgramId: parsed.data.programId })
      .where(eq(students.userId, parsed.data.studentUserId));
  }

  revalidatePath("/admin/students");
  return { success: true as const };
}
