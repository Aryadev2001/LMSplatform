"use server";

import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import {
  exams,
  examQuestions,
  examAttempts,
  enrollments,
  users,
} from "@/db/schema";
import { getCurrentUser, requireRole } from "@/lib/auth";

/**
 * Student-side exam flow:
 *   startAttempt(examId)      → enrollment check, create pending row
 *   submitAttempt(...)        → score, mark submitted, persist answers
 *
 * Every action re-derives identity from the session — a student cannot
 * submit answers as someone else, cannot start an attempt for an exam they
 * don't have a paid enrollment to, and cannot retroactively edit a
 * submitted attempt.
 */

const PAID_STATUSES = ["paid", "account_created", "assigned"] as const;

async function loadStudent(): Promise<{ userId: string; dbUserId: string } | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!u) return null;
  return { userId: me.userId, dbUserId: u.id };
}

interface ExamForAttempt {
  id: string;
  programId: string;
  tenantId: string;
  durationMinutes: number;
  passingMarks: number;
  totalMarks: number;
  isActive: boolean;
}

async function loadExam(examId: string): Promise<ExamForAttempt | null> {
  const [row] = await db
    .select({
      id: exams.id,
      programId: exams.programId,
      tenantId: exams.tenantId,
      durationMinutes: exams.durationMinutes,
      passingMarks: exams.passingMarks,
      totalMarks: exams.totalMarks,
      isActive: exams.isActive,
    })
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);
  return row ?? null;
}

async function paidEnrollmentFor(
  dbUserId: string,
  programId: string,
): Promise<string | null> {
  const [e] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, dbUserId),
        eq(enrollments.programId, programId),
        inArray(enrollments.status, [...PAID_STATUSES]),
      ),
    )
    .orderBy(desc(enrollments.createdAt))
    .limit(1);
  return e?.id ?? null;
}

export type StartResult =
  | { success: true; attemptId: string }
  | { success: false; error: string };

export async function startAttempt(examId: string): Promise<StartResult> {
  await requireRole("student");
  const me = await loadStudent();
  if (!me) return { success: false, error: "Sign in first." };

  const exam = await loadExam(examId);
  if (!exam) return { success: false, error: "Exam not found." };
  if (!exam.isActive) {
    return {
      success: false,
      error: "This exam isn't accepting attempts right now.",
    };
  }

  const enrollmentId = await paidEnrollmentFor(me.dbUserId, exam.programId);
  if (!enrollmentId) {
    return {
      success: false,
      error: "Enrol in this course before attempting its exam.",
    };
  }

  // Resume the most recent in-progress attempt instead of starting a fresh
  // one when the student reloads — prevents accidental "start over" loss of
  // partial answers if they navigate away and back.
  const [inProgress] = await db
    .select({ id: examAttempts.id })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, examId),
        eq(examAttempts.userId, me.dbUserId),
      ),
    )
    .orderBy(desc(examAttempts.startedAt))
    .limit(1);
  if (inProgress) {
    const [check] = await db
      .select({ submittedAt: examAttempts.submittedAt })
      .from(examAttempts)
      .where(eq(examAttempts.id, inProgress.id))
      .limit(1);
    if (check && !check.submittedAt) {
      return { success: true, attemptId: inProgress.id };
    }
  }

  const [row] = await db
    .insert(examAttempts)
    .values({
      examId,
      tenantId: exam.tenantId,
      userId: me.dbUserId,
      enrollmentId,
    })
    .returning({ id: examAttempts.id });

  return { success: true, attemptId: row.id };
}

const SubmitSchema = z.object({
  attemptId: z.uuid(),
  /** Map of questionId → selectedOptionIndex. Missing keys = unanswered. */
  answers: z.record(z.uuid(), z.coerce.number().int().min(0).max(20)),
});

export type SubmitResult =
  | { success: true; attemptId: string; score: number; maxScore: number; passed: boolean }
  | { success: false; error: string };

interface OptionShape {
  label: string;
  isCorrect: boolean;
}

function normaliseOptions(raw: unknown): OptionShape[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (!o || typeof o !== "object") return null;
      const r = o as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label : "";
      const isCorrect = r.isCorrect === true;
      return { label, isCorrect };
    })
    .filter((o): o is OptionShape => o !== null);
}

export async function submitAttempt(input: unknown): Promise<SubmitResult> {
  await requireRole("student");
  const me = await loadStudent();
  if (!me) return { success: false, error: "Sign in first." };

  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid submission",
    };
  }
  const { attemptId, answers } = parsed.data;

  const [attempt] = await db
    .select({
      id: examAttempts.id,
      examId: examAttempts.examId,
      userId: examAttempts.userId,
      submittedAt: examAttempts.submittedAt,
    })
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!attempt || attempt.userId !== me.dbUserId) {
    return { success: false, error: "Attempt not found." };
  }
  if (attempt.submittedAt) {
    return { success: false, error: "This attempt was already submitted." };
  }

  const exam = await loadExam(attempt.examId);
  if (!exam) return { success: false, error: "Exam no longer exists." };

  const questions = await db
    .select({
      id: examQuestions.id,
      options: examQuestions.options,
      marks: examQuestions.marks,
    })
    .from(examQuestions)
    .where(eq(examQuestions.examId, attempt.examId));

  let score = 0;
  let maxScore = 0;
  for (const q of questions) {
    maxScore += q.marks;
    const picked = answers[q.id];
    if (typeof picked !== "number") continue;
    const opts = normaliseOptions(q.options);
    const sel = opts[picked];
    if (sel?.isCorrect) score += q.marks;
  }
  const passingMarks = exam.passingMarks;
  const passed = score >= passingMarks;

  await db
    .update(examAttempts)
    .set({
      submittedAt: new Date(),
      answers,
      score,
      maxScore,
      passingMarks,
      passed,
    })
    .where(eq(examAttempts.id, attemptId));

  revalidatePath(`/student/exams/attempts/${attemptId}`);
  revalidatePath(`/student/exams/${exam.id}`);
  return { success: true, attemptId, score, maxScore, passed };
}

/**
 * Helper for the take page — when called from the client AFTER the timer
 * expires, the page sends best-effort answers and the server submits.
 * Same security guarantees as submitAttempt; this is just a callable
 * shortcut from auto-submit JS.
 */
export async function autoSubmitAttempt(
  attemptId: string,
  answers: Record<string, number>,
): Promise<void> {
  const r = await submitAttempt({ attemptId, answers });
  if (r.success) {
    redirect(`/student/exams/attempts/${attemptId}`);
  }
  // If the attempt is already submitted (the student raced the timer), the
  // redirect below still lands them on the result page.
  redirect(`/student/exams/attempts/${attemptId}`);
}
