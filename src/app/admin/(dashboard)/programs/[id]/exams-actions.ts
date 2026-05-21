"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { exams, examQuestions, modules, programs } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";

/**
 * Exam + question CRUD. Every mutation:
 *   1. Re-checks the admin role.
 *   2. Confirms the target course (and exam, where applicable) belongs to
 *      the caller's tenant via the session's tenantId.
 *   3. Audits the action.
 * Tenant scope is derived from the session, never the request body — a
 * tenant-admin cannot mutate another tenant's exam by id-guessing.
 */

async function ownsCourse(courseId: string, tenantId: string): Promise<boolean> {
  const [c] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.id, courseId), eq(programs.tenantId, tenantId)))
    .limit(1);
  return !!c;
}

async function ownsExam(examId: string, tenantId: string): Promise<{ examId: string; programId: string } | null> {
  const [row] = await db
    .select({ id: exams.id, programId: exams.programId })
    .from(exams)
    .where(and(eq(exams.id, examId), eq(exams.tenantId, tenantId)))
    .limit(1);
  return row ? { examId: row.id, programId: row.programId } : null;
}

async function recomputeTotalMarks(examId: string): Promise<void> {
  const [{ total }] = await db
    .select({ total: sql<number>`coalesce(sum(marks), 0)::int` })
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId));
  await db
    .update(exams)
    .set({ totalMarks: total ?? 0, updatedAt: new Date() })
    .where(eq(exams.id, examId));
}

// ---------- Exam ----------
const ExamSchema = z.object({
  courseId: z.uuid(),
  title: z.string().trim().min(2, "Title is required").max(240),
  moduleId: z.string().uuid().nullable().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  passingMarks: z.coerce.number().int().min(0).max(10000),
  isActive: z.boolean().optional().default(true),
});

export type ExamResult =
  | { success: true; examId: string }
  | { success: false; error: string };

export async function createExam(
  input: z.infer<typeof ExamSchema>,
): Promise<ExamResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = ExamSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  if (!(await ownsCourse(d.courseId, tenantId))) {
    return { success: false, error: "Course not found in your workspace." };
  }
  // If a module is supplied, it must belong to this course.
  if (d.moduleId) {
    const [m] = await db
      .select({ id: modules.id })
      .from(modules)
      .where(and(eq(modules.id, d.moduleId), eq(modules.courseId, d.courseId)))
      .limit(1);
    if (!m) {
      return { success: false, error: "Module is not part of this course." };
    }
  }
  const [row] = await db
    .insert(exams)
    .values({
      tenantId,
      programId: d.courseId,
      moduleId: d.moduleId ?? null,
      title: d.title,
      durationMinutes: d.durationMinutes,
      totalMarks: 0,
      passingMarks: d.passingMarks,
      isActive: d.isActive ?? true,
    })
    .returning({ id: exams.id });
  await recordAudit({
    action: "exam.create",
    targetType: "exam",
    targetId: row.id,
    metadata: { tenantId, programId: d.courseId, title: d.title },
  });
  revalidatePath(`/admin/programs/${d.courseId}`);
  return { success: true, examId: row.id };
}

const UpdateExamSchema = ExamSchema.extend({ examId: z.uuid() });

export async function updateExam(
  input: z.infer<typeof UpdateExamSchema>,
): Promise<ExamResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = UpdateExamSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const owned = await ownsExam(d.examId, tenantId);
  if (!owned || owned.programId !== d.courseId) {
    return { success: false, error: "Exam not found in your workspace." };
  }
  if (d.moduleId) {
    const [m] = await db
      .select({ id: modules.id })
      .from(modules)
      .where(and(eq(modules.id, d.moduleId), eq(modules.courseId, d.courseId)))
      .limit(1);
    if (!m) {
      return { success: false, error: "Module is not part of this course." };
    }
  }
  await db
    .update(exams)
    .set({
      title: d.title,
      moduleId: d.moduleId ?? null,
      durationMinutes: d.durationMinutes,
      passingMarks: d.passingMarks,
      isActive: d.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(and(eq(exams.id, d.examId), eq(exams.tenantId, tenantId)));
  await recordAudit({
    action: "exam.update",
    targetType: "exam",
    targetId: d.examId,
    metadata: { tenantId, programId: d.courseId, title: d.title },
  });
  revalidatePath(`/admin/programs/${d.courseId}`);
  revalidatePath(`/admin/programs/${d.courseId}/exams/${d.examId}`);
  return { success: true, examId: d.examId };
}

export async function deleteExam(
  examId: string,
  courseId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const owned = await ownsExam(examId, tenantId);
  if (!owned || owned.programId !== courseId) {
    return { success: false, error: "Exam not found in your workspace." };
  }
  await db.delete(exams).where(and(eq(exams.id, examId), eq(exams.tenantId, tenantId)));
  await recordAudit({
    action: "exam.delete",
    targetType: "exam",
    targetId: examId,
    metadata: { tenantId, programId: courseId },
  });
  revalidatePath(`/admin/programs/${courseId}`);
  return { success: true };
}

// ---------- Questions ----------
const OptionSchema = z.object({
  label: z.string().trim().min(1, "Each option needs text").max(500),
  isCorrect: z.boolean(),
});

const QuestionSchema = z.object({
  examId: z.uuid(),
  courseId: z.uuid(),
  question: z.string().trim().min(2, "Question text is required").max(2000),
  options: z
    .array(OptionSchema)
    .min(2, "At least 2 options")
    .max(6, "At most 6 options")
    .refine(
      (o) => o.filter((x) => x.isCorrect).length === 1,
      "Mark exactly one option as correct",
    ),
  marks: z.coerce.number().int().min(1).max(100),
});

export type QuestionResult =
  | { success: true; questionId: string }
  | { success: false; error: string };

export async function createQuestion(
  input: z.infer<typeof QuestionSchema>,
): Promise<QuestionResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = QuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const owned = await ownsExam(d.examId, tenantId);
  if (!owned || owned.programId !== d.courseId) {
    return { success: false, error: "Exam not found in your workspace." };
  }
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(order_index), -1)::int` })
    .from(examQuestions)
    .where(eq(examQuestions.examId, d.examId));
  const [row] = await db
    .insert(examQuestions)
    .values({
      tenantId,
      examId: d.examId,
      question: d.question,
      options: d.options,
      marks: d.marks,
      orderIndex: (max ?? -1) + 1,
    })
    .returning({ id: examQuestions.id });
  await recomputeTotalMarks(d.examId);
  await recordAudit({
    action: "exam.question.create",
    targetType: "exam_question",
    targetId: row.id,
    metadata: { tenantId, examId: d.examId, marks: d.marks },
  });
  revalidatePath(`/admin/programs/${d.courseId}/exams/${d.examId}`);
  revalidatePath(`/admin/programs/${d.courseId}`);
  return { success: true, questionId: row.id };
}

const UpdateQuestionSchema = QuestionSchema.extend({ questionId: z.uuid() });

export async function updateQuestion(
  input: z.infer<typeof UpdateQuestionSchema>,
): Promise<QuestionResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = UpdateQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const owned = await ownsExam(d.examId, tenantId);
  if (!owned || owned.programId !== d.courseId) {
    return { success: false, error: "Exam not found in your workspace." };
  }
  // Tenant scope on the question row itself — belt and braces.
  await db
    .update(examQuestions)
    .set({
      question: d.question,
      options: d.options,
      marks: d.marks,
    })
    .where(
      and(
        eq(examQuestions.id, d.questionId),
        eq(examQuestions.examId, d.examId),
        eq(examQuestions.tenantId, tenantId),
      ),
    );
  await recomputeTotalMarks(d.examId);
  await recordAudit({
    action: "exam.question.update",
    targetType: "exam_question",
    targetId: d.questionId,
    metadata: { tenantId, examId: d.examId, marks: d.marks },
  });
  revalidatePath(`/admin/programs/${d.courseId}/exams/${d.examId}`);
  return { success: true, questionId: d.questionId };
}

export async function deleteQuestion(
  questionId: string,
  examId: string,
  courseId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const owned = await ownsExam(examId, tenantId);
  if (!owned || owned.programId !== courseId) {
    return { success: false, error: "Exam not found in your workspace." };
  }
  await db
    .delete(examQuestions)
    .where(
      and(
        eq(examQuestions.id, questionId),
        eq(examQuestions.examId, examId),
        eq(examQuestions.tenantId, tenantId),
      ),
    );
  await recomputeTotalMarks(examId);
  await recordAudit({
    action: "exam.question.delete",
    targetType: "exam_question",
    targetId: questionId,
    metadata: { tenantId, examId },
  });
  revalidatePath(`/admin/programs/${courseId}/exams/${examId}`);
  return { success: true };
}
