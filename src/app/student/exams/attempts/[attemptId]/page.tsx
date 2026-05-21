import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  Repeat,
  Clock,
} from "lucide-react";
import { db } from "@/db/client";
import {
  examAttempts,
  examQuestions,
  exams,
  programs,
  users,
} from "@/db/schema";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

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

export default async function AttemptResultPage({
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
      score: examAttempts.score,
      maxScore: examAttempts.maxScore,
      passingMarks: examAttempts.passingMarks,
      passed: examAttempts.passed,
    })
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!attempt) notFound();
  if (attempt.userId !== meRow.id) notFound();

  // In-progress attempts get sent to the take page; only show this page
  // after a final submission so the score is real.
  if (!attempt.submittedAt) {
    redirect(`/student/exams/attempts/${attempt.id}/take`);
  }

  const [exam] = await db
    .select({
      id: exams.id,
      title: exams.title,
      durationMinutes: exams.durationMinutes,
      programId: exams.programId,
      courseName: programs.name,
      courseSlug: programs.slug,
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

  const answers = (attempt.answers ?? {}) as Record<string, number>;

  const score = attempt.score ?? 0;
  const maxScore = attempt.maxScore ?? 0;
  const passed = !!attempt.passed;
  const pct = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  const durationMs =
    new Date(attempt.submittedAt).getTime() -
    new Date(attempt.startedAt).getTime();
  const durationMin = Math.max(1, Math.round(durationMs / 60_000));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/student/exams/${exam.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to exam
      </Link>

      <PageHeader
        eyebrow={`— ${exam.courseName}`}
        title={exam.title}
        description={`Submitted ${formatDate(attempt.submittedAt)} · finished in ${durationMin} min`}
      />

      {/* Result hero */}
      <Card
        className="relative overflow-hidden border-none p-8 text-white shadow-card"
        style={{
          background: passed
            ? "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)"
            : "linear-gradient(135deg, #6B7280 0%, #374151 100%)",
        }}
      >
        <div className="flex items-start gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15">
            {passed ? (
              <Trophy className="size-7" />
            ) : (
              <Repeat className="size-7" />
            )}
          </span>
          <div className="flex-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">
              {passed ? "You passed" : "Not yet — give it another go"}
            </div>
            <div className="mt-1 text-4xl font-extrabold leading-none">
              {score}
              <span className="text-2xl text-white/70">/{maxScore}</span>
              <span className="ml-3 text-lg font-bold text-white/80">
                ({pct}%)
              </span>
            </div>
            <div className="mt-2 text-xs text-white/80">
              Passing mark: <strong>{attempt.passingMarks}</strong>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-none bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold">Question by question</h2>
        <ol className="space-y-4">
          {questionRows.map((q, idx) => {
            const opts = normaliseOptions(q.options);
            const correctIdx = opts.findIndex((o) => o.isCorrect);
            const picked = answers[q.id];
            const pickedOpt =
              typeof picked === "number" ? opts[picked] : undefined;
            const isCorrect = pickedOpt?.isCorrect === true;
            const wasAnswered = typeof picked === "number";
            return (
              <li
                key={q.id}
                className="rounded-2xl border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Q{idx + 1} · {q.marks} mark{q.marks === 1 ? "" : "s"}
                  </div>
                  {wasAnswered ? (
                    isCorrect ? (
                      <Badge variant="default" className="font-normal">
                        <CheckCircle2 className="size-3" /> Correct
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="font-normal">
                        <XCircle className="size-3" /> Incorrect
                      </Badge>
                    )
                  ) : (
                    <Badge variant="secondary" className="font-normal">
                      Unanswered
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold leading-snug">
                  {q.question}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {opts.map((o, i) => {
                    const isPicked = picked === i;
                    const isCorrectOpt = i === correctIdx;
                    return (
                      <li
                        key={i}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                          isCorrectOpt
                            ? "bg-emerald-50 text-emerald-900"
                            : isPicked
                              ? "bg-red-50 text-red-900"
                              : "text-muted-foreground"
                        }`}
                      >
                        {isCorrectOpt ? (
                          <CheckCircle2
                            className="size-3.5 shrink-0 text-emerald-600"
                            strokeWidth={2.5}
                          />
                        ) : isPicked ? (
                          <XCircle className="size-3.5 shrink-0 text-red-600" />
                        ) : (
                          <span className="size-3.5 shrink-0" />
                        )}
                        <span>{o.label}</span>
                        {isPicked && !isCorrectOpt && (
                          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-red-600">
                            Your pick
                          </span>
                        )}
                        {isCorrectOpt && !isPicked && (
                          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                            Correct
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/student/exams/${exam.id}`}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background transition-opacity hover:opacity-90"
        >
          <Repeat className="size-4" />
          Retake exam
        </Link>
        {exam.courseSlug && (
          <Link
            href={`/student/courses/${exam.courseSlug}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            Back to course
          </Link>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground">
        <Clock className="mr-1 inline size-3" />
        Started {formatDate(attempt.startedAt)} · submitted{" "}
        {formatDate(attempt.submittedAt)}
      </div>
    </div>
  );
}
