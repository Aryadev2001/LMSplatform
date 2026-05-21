import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  examAttempts,
  examQuestions,
  exams,
  programs,
  users,
} from "@/db/schema";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { TakeExamClient, type TakeQuestion } from "./take-client";

export const dynamic = "force-dynamic";

interface OptionShape {
  label: string;
  isCorrect: boolean;
}

function normaliseOptions(raw: unknown): { label: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (!o || typeof o !== "object") return null;
      const r = o as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label : "";
      return { label };
    })
    .filter((o): o is { label: string } => o !== null && o.label.length > 0);
}

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  await requireRole("student");
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");
  const { attemptId } = await params;

  const [meRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!meRow) redirect("/sign-in");

  const [attempt] = await db
    .select({
      id: examAttempts.id,
      examId: examAttempts.examId,
      userId: examAttempts.userId,
      startedAt: examAttempts.startedAt,
      submittedAt: examAttempts.submittedAt,
      answers: examAttempts.answers,
    })
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!attempt) notFound();
  // Tenant scope: a student can't fetch another user's attempt — the
  // userId check is the entire trust boundary here.
  if (attempt.userId !== meRow.id) notFound();
  if (attempt.submittedAt) {
    // Already submitted → take them to the result page.
    redirect(`/student/exams/attempts/${attempt.id}`);
  }

  const [exam] = await db
    .select({
      id: exams.id,
      title: exams.title,
      durationMinutes: exams.durationMinutes,
      programId: exams.programId,
      courseName: programs.name,
    })
    .from(exams)
    .innerJoin(programs, eq(programs.id, exams.programId))
    .where(eq(exams.id, attempt.examId))
    .limit(1);
  if (!exam) notFound();

  const questionRows = await db
    .select({
      id: examQuestions.id,
      question: examQuestions.question,
      options: examQuestions.options,
      marks: examQuestions.marks,
    })
    .from(examQuestions)
    .where(eq(examQuestions.examId, exam.id))
    .orderBy(asc(examQuestions.orderIndex));

  const questions: TakeQuestion[] = questionRows.map((q) => ({
    id: q.id,
    question: q.question,
    options: normaliseOptions(q.options),
    marks: q.marks,
  }));

  // Existing answers (e.g. if they refreshed mid-attempt — we don't yet
  // persist intermediate answers, but pass through whatever's on the row).
  const savedAnswers = (attempt.answers ?? {}) as Record<string, number>;

  const deadlineMs =
    new Date(attempt.startedAt).getTime() + exam.durationMinutes * 60_000;

  return (
    <TakeExamClient
      attemptId={attempt.id}
      examTitle={exam.title}
      courseName={exam.courseName}
      durationMinutes={exam.durationMinutes}
      deadlineMs={deadlineMs}
      questions={questions}
      initialAnswers={savedAnswers}
    />
  );
}

// Keep the OptionShape type exported for future review-page reuse.
export type { OptionShape };
