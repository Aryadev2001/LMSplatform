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

/** Keep each option's ORIGINAL index (position in the stored array) — grading
 *  resolves the answer as `options[selectedIndex].isCorrect`, so the index we
 *  submit must always be the original one even after we shuffle for display. */
function normaliseOptions(raw: unknown): { label: string; originalIndex: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o, idx) => {
      if (!o || typeof o !== "object") return null;
      const r = o as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label : "";
      return { label, originalIndex: idx };
    })
    .filter(
      (o): o is { label: string; originalIndex: number } =>
        o !== null && o.label.length > 0,
    );
}

/**
 * Deterministic shuffle so answer options aren't presented in setup order (a
 * teacher who always puts the correct answer first must NOT make it always the
 * first option for students). Seeded by attemptId + questionId so the order is:
 *   - stable across refreshes within one attempt (no jumping while answering),
 *   - different per attempt/student (and re-shuffled on a retake).
 * xfnv1a hash → mulberry32 PRNG → Fisher–Yates.
 */
function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  let a = h >>> 0;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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

  // Shuffle the QUESTION order per attempt (stable across refreshes within an
  // attempt, different per attempt/student). Grading and the result page key
  // off questionId, so reordering here changes only what the student sees, not
  // scoring. Questions are fetched in canonical orderIndex order first so the
  // seeded permutation is reproducible.
  const questions: TakeQuestion[] = seededShuffle(
    questionRows.map((q) => ({
      id: q.id,
      question: q.question,
      // Shuffle each question's options too (stable per attempt+question); each
      // option still carries its real originalIndex, so the submitted answer +
      // grading are unaffected by the reorder.
      options: seededShuffle(normaliseOptions(q.options), `${attempt.id}:${q.id}`),
      marks: q.marks,
    })),
    `${attempt.id}:questions`,
  );

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
