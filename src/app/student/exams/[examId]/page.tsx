import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  ArrowLeft,
  Clock,
  ClipboardList,
  Hash,
  CheckCircle2,
  XCircle,
  Play,
} from "lucide-react";
import { db } from "@/db/client";
import {
  exams,
  examQuestions,
  examAttempts,
  enrollments,
  programs,
  users,
} from "@/db/schema";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { StartAttemptButton } from "./start-button";

export const dynamic = "force-dynamic";

const PAID_STATUSES = ["paid", "account_created", "assigned"] as const;

export default async function StudentExamIntroPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  await requireRole("student");
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");

  const { examId } = await params;
  const [meRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!meRow) redirect("/sign-in");

  const [exam] = await db
    .select({
      id: exams.id,
      title: exams.title,
      programId: exams.programId,
      tenantId: exams.tenantId,
      durationMinutes: exams.durationMinutes,
      passingMarks: exams.passingMarks,
      totalMarks: exams.totalMarks,
      isActive: exams.isActive,
      courseName: programs.name,
      courseSlug: programs.slug,
    })
    .from(exams)
    .innerJoin(programs, eq(programs.id, exams.programId))
    .where(eq(exams.id, examId))
    .limit(1);
  if (!exam) notFound();

  // Enrollment check — must be a paid student in the owning course.
  const [enr] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, meRow.id),
        eq(enrollments.programId, exam.programId),
        inArray(enrollments.status, [...PAID_STATUSES]),
      ),
    )
    .limit(1);

  const [{ qCount }] = await db
    .select({ qCount: sql<number>`count(*)::int` })
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId));

  const attempts = await db
    .select({
      id: examAttempts.id,
      startedAt: examAttempts.startedAt,
      submittedAt: examAttempts.submittedAt,
      score: examAttempts.score,
      maxScore: examAttempts.maxScore,
      passed: examAttempts.passed,
    })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, examId),
        eq(examAttempts.userId, meRow.id),
      ),
    )
    .orderBy(desc(examAttempts.startedAt));

  const inProgress = attempts.find((a) => !a.submittedAt);
  const bestSubmitted = attempts
    .filter((a) => a.submittedAt)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={
          exam.courseSlug
            ? `/student/courses/${exam.courseSlug}`
            : "/student/courses"
        }
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to {exam.courseName}
      </Link>

      <PageHeader
        eyebrow={`— ${exam.courseName}`}
        title={exam.title}
        description={`${qCount} question${qCount === 1 ? "" : "s"} · ${exam.totalMarks} total marks · ${exam.durationMinutes} minutes`}
      />

      {!enr && (
        <Card className="border-destructive/30 bg-destructive/5 p-5 text-sm">
          You need an active paid enrollment in <strong>{exam.courseName}</strong>{" "}
          to attempt this exam. Visit{" "}
          <Link
            href={exam.courseSlug ? `/courses/${exam.courseSlug}` : "/explore"}
            className="font-semibold underline underline-offset-2"
          >
            the course page
          </Link>{" "}
          to enrol.
        </Card>
      )}

      {!exam.isActive && (
        <Card className="border-amber-500/30 bg-amber-50/40 p-5 text-sm">
          This exam is currently <strong>not accepting attempts</strong>. The
          institute will activate it when it&apos;s ready.
        </Card>
      )}

      <Card className="grid grid-cols-2 gap-4 border-none bg-card p-5 shadow-card sm:grid-cols-4">
        <Meta icon={ClipboardList} label="Questions" value={String(qCount)} />
        <Meta icon={Clock} label="Time limit" value={`${exam.durationMinutes} min`} />
        <Meta icon={Hash} label="Total marks" value={String(exam.totalMarks)} />
        <Meta
          icon={CheckCircle2}
          label="Passing"
          value={String(exam.passingMarks)}
        />
      </Card>

      <Card className="border-none bg-card p-6 shadow-card">
        <h2 className="text-base font-bold">Before you start</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/30" />
            <span>
              The timer starts the moment you click <strong>Start exam</strong>.
              If you close the tab, the attempt stays in progress and the
              timer keeps ticking server-side.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/30" />
            <span>
              You can review and change answers any time before submitting.
              Hitting <strong>Submit</strong> finalises the attempt — no edits
              after that.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/30" />
            <span>
              If the timer runs out, your current answers are auto-submitted
              automatically.
            </span>
          </li>
        </ul>

        <div className="mt-6">
          {inProgress ? (
            <Link
              href={`/student/exams/attempts/${inProgress.id}/take`}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background transition-opacity hover:opacity-90"
            >
              <Play className="size-4" />
              Resume in-progress attempt
            </Link>
          ) : (
            <StartAttemptButton
              examId={exam.id}
              disabled={!enr || !exam.isActive || qCount === 0}
              disabledReason={
                !enr
                  ? "Enrol first"
                  : !exam.isActive
                    ? "Exam not active"
                    : qCount === 0
                      ? "No questions yet"
                      : null
              }
            />
          )}
        </div>
      </Card>

      {attempts.length > 0 && (
        <Card className="border-none bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Your attempts</h2>
            {bestSubmitted && (
              <Badge
                variant={bestSubmitted.passed ? "default" : "secondary"}
                className="font-normal"
              >
                Best: {bestSubmitted.score}/{bestSubmitted.maxScore}
              </Badge>
            )}
          </div>
          <ul className="divide-y">
            {attempts.map((a) => {
              const isSubmitted = !!a.submittedAt;
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="text-xs">
                    <div className="font-medium">
                      {isSubmitted
                        ? `Submitted ${formatDate(a.submittedAt!)}`
                        : `Started ${formatDate(a.startedAt)} — in progress`}
                    </div>
                    {isSubmitted && (
                      <div className="text-muted-foreground">
                        {a.score}/{a.maxScore} marks ·{" "}
                        {a.passed ? (
                          <span className="font-semibold text-emerald-600">
                            Passed
                          </span>
                        ) : (
                          <span className="font-semibold text-destructive">
                            Did not pass
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Link
                    href={
                      isSubmitted
                        ? `/student/exams/attempts/${a.id}`
                        : `/student/exams/attempts/${a.id}/take`
                    }
                    className="text-xs font-semibold text-foreground underline-offset-2 hover:underline"
                  >
                    {isSubmitted ? "View result" : "Resume"}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

// Suppress unused-import noise; XCircle / Play are referenced in JSX above.
void XCircle;
