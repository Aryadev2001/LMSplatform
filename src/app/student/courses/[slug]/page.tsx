import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import {
  users,
  students,
  lessonProgress,
  enrollments,
  exams,
  examQuestions,
  examAttempts,
} from "@/db/schema";
import { eq, and, inArray, asc, desc, sql } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { getCourseBySlug } from "@/lib/courses";
import { lessonMediaFor } from "@/lib/lesson-media";
import { isModuleLocked, moduleUnlockAt } from "@/lib/drip";
import { CoursePlayer } from "./course-player";
import { ReviewForm } from "./review-form";
import { getMyReview, getCourseRating, listCourseReviews } from "@/lib/reviews";
import {
  Award,
  ClipboardList,
  Clock,
  Hash,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Star,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentCourseDeliveryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const auth = await requireRole("student");
  const tenantId = await requireTenantId();
  const [me] = await db.select().from(users).where(eq(users.clerkId, auth.userId)).limit(1);
  if (!me) return null;

  const data = await getCourseBySlug(slug);
  // Cross-tenant course access blocked (acceptance #6): a student can only
  // open a course inside their own tenant.
  if (!data || data.course.tenantId !== tenantId) notFound();
  const { course, modules } = data;

  const [stu] = await db
    .select()
    .from(students)
    .where(eq(students.userId, me.id))
    .limit(1);

  // Entitlement = an actual qualifying enrollment in THIS course (not the
  // single students.assignedProgramId slot, which only ever matches one
  // course and locked the player for multi-course learners). Earliest row so
  // "unlock N days after enrollment" drip anchors on first enrollment.
  const [enr] = await db
    .select({ id: enrollments.id, createdAt: enrollments.createdAt })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, me.id),
        eq(enrollments.programId, course.id),
        inArray(enrollments.status, ["paid", "account_created", "assigned"]),
      ),
    )
    .orderBy(asc(enrollments.createdAt))
    .limit(1);
  const enrolled = !!enr;
  const enrolledAt = enr?.createdAt ?? null;

  const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const done = allLessonIds.length
    ? await db
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, me.id),
            inArray(lessonProgress.lessonId, allLessonIds),
            eq(lessonProgress.percentComplete, 100),
          ),
        )
    : [];
  const doneSet = new Set(done.map((d) => d.lessonId));
  const percent =
    allLessonIds.length === 0
      ? 0
      : Math.round((doneSet.size / allLessonIds.length) * 100);

  // Active exams for this course + the student's best attempt at each.
  const examRows = await db
    .select({
      id: exams.id,
      title: exams.title,
      durationMinutes: exams.durationMinutes,
      totalMarks: exams.totalMarks,
      passingMarks: exams.passingMarks,
      questionCount: sql<number>`(
        select count(*)::int from ${examQuestions} q where q.exam_id = ${exams.id}
      )`,
    })
    .from(exams)
    .where(and(eq(exams.programId, course.id), eq(exams.isActive, true)))
    .orderBy(desc(exams.createdAt));

  const myAttempts = examRows.length
    ? await db
        .select({
          examId: examAttempts.examId,
          id: examAttempts.id,
          score: examAttempts.score,
          maxScore: examAttempts.maxScore,
          passed: examAttempts.passed,
          submittedAt: examAttempts.submittedAt,
        })
        .from(examAttempts)
        .where(
          and(
            eq(examAttempts.userId, me.id),
            inArray(
              examAttempts.examId,
              examRows.map((e) => e.id),
            ),
          ),
        )
        .orderBy(desc(examAttempts.startedAt))
    : [];
  const bestByExam = new Map<
    string,
    { id: string; score: number | null; maxScore: number | null; passed: boolean | null; submittedAt: Date | null }
  >();
  for (const a of myAttempts) {
    if (!a.submittedAt) continue;
    const prev = bestByExam.get(a.examId);
    if (!prev || (a.score ?? -1) > (prev.score ?? -1)) {
      bestByExam.set(a.examId, {
        id: a.id,
        score: a.score,
        maxScore: a.maxScore,
        passed: a.passed,
        submittedAt: a.submittedAt,
      });
    }
  }
  const inProgressByExam = new Map<string, string>();
  for (const a of myAttempts) {
    if (a.submittedAt) continue;
    if (!inProgressByExam.has(a.examId)) inProgressByExam.set(a.examId, a.id);
  }

  // Reviews — student's own review (for the form prefill) + aggregate +
  // a small list of recent reviews from other learners.
  const [myReview, rating, recentReviews] = await Promise.all([
    getMyReview(me.id, course.id),
    getCourseRating(course.id),
    listCourseReviews(course.id, { limit: 6 }),
  ]);

  const dripNow = new Date();
  const modulesForPlayer = modules.map((mod) => {
    const drip = {
      releaseAt: mod.releaseAt ?? null,
      unlockAfterDays: mod.unlockAfterDays ?? null,
    };
    const locked = enrolled ? isModuleLocked(drip, enrolledAt, dripNow) : false;
    const unlockAt = locked ? moduleUnlockAt(drip, enrolledAt) : null;
    return {
      id: mod.id,
      title: mod.title,
      // Drip: a not-yet-released module is locked with the unlock date; its
      // lessons get no media (so the protected stream can't be reached).
      locked,
      unlockAt: unlockAt ? unlockAt.toISOString() : null,
      lessons: mod.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        durationSeconds: l.durationSeconds,
        media: enrolled && !locked ? lessonMediaFor(l.id, l.videoUrl) : null,
        resources: (l.resources as { label: string; url: string }[] | null) ?? [],
        completed: doneSet.has(l.id),
      })),
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/student/courses"
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All courses
      </Link>

      <PageHeader
        eyebrow={`— ${course.tagline ?? "Course"}`}
        title={course.name}
        description={`${percent}% complete`}
      />

      <Card className="border-none bg-card p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">Overall progress</span>
          <span className="tabular-nums text-muted-foreground">{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${percent}%` }} />
        </div>
      </Card>

      {percent === 100 && (
        <div
          className="flex items-center gap-4 rounded-2xl p-6 text-white shadow-card"
          style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
        >
          <Award className="size-10" />
          <div className="flex-1">
            <div className="text-lg font-semibold">Certificate of completion</div>
            <div className="text-sm text-white/80">
              You&apos;ve completed {course.name}. Congratulations, {me.fullName ?? "graduate"}!
            </div>
          </div>
          {enr && (
            <Link
              href={`/certificate/${enr.id}`}
              className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-foreground"
            >
              View certificate
            </Link>
          )}
        </div>
      )}

      <CoursePlayer slug={slug} modules={modulesForPlayer} locked={!enrolled} />

      {/* Reviews — leave-your-review form (enrolled only) + public list. */}
      <Card className="border-none bg-card p-6 shadow-card">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              — Reviews
            </div>
            <h2 className="mt-1 text-lg font-bold">
              {rating.count === 0
                ? "No reviews yet — be the first."
                : `${rating.avg.toFixed(1)} / 5 from ${rating.count} review${rating.count === 1 ? "" : "s"}`}
            </h2>
          </div>
          {rating.count > 0 && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`size-4 ${rating.avg >= n - 0.5 ? "fill-current" : ""}`}
                  style={{
                    color:
                      rating.avg >= n - 0.5
                        ? "#F59E0B"
                        : "var(--ed-line, #E2E8F0)",
                  }}
                  strokeWidth={1.5}
                />
              ))}
            </div>
          )}
        </div>

        {enrolled ? (
          <div className="mb-6 rounded-xl border p-4">
            <ReviewForm
              courseId={course.id}
              initial={
                myReview
                  ? { rating: myReview.rating, body: myReview.body ?? "" }
                  : null
              }
            />
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
            Enroll in this course to leave a review.
          </div>
        )}

        {recentReviews.length > 0 && (
          <ul className="divide-y">
            {recentReviews.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`size-3.5 ${r.rating >= n ? "fill-current" : ""}`}
                        style={{
                          color:
                            r.rating >= n ? "#F59E0B" : "var(--ed-line, #E2E8F0)",
                        }}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">
                    {r.authorName ?? "Anonymous learner"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {r.createdAt.toISOString().slice(0, 10)}
                  </span>
                </div>
                {r.body && (
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {r.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {examRows.length > 0 && (
        <Card className="border-none bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                — Assessments
              </div>
              <h2 className="mt-1 text-lg font-bold">
                Exams ({examRows.length})
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pass to validate your learning — best attempt counts.
              </p>
            </div>
          </div>

          <ul className="divide-y">
            {examRows.map((ex) => {
              const best = bestByExam.get(ex.id);
              const inProgressId = inProgressByExam.get(ex.id);
              return (
                <li
                  key={ex.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{ex.title}</span>
                      {best?.passed === true && (
                        <Badge variant="default" className="font-normal">
                          <CheckCircle2 className="size-3" /> Passed
                        </Badge>
                      )}
                      {best && best.passed === false && (
                        <Badge variant="destructive" className="font-normal">
                          <XCircle className="size-3" /> Not passed
                        </Badge>
                      )}
                      {inProgressId && (
                        <Badge variant="secondary" className="font-normal">
                          In progress
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ClipboardList className="size-3" />
                        {ex.questionCount} q
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {ex.durationMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Hash className="size-3" />
                        {ex.totalMarks} marks · pass {ex.passingMarks}
                      </span>
                      {best && (
                        <span className="font-semibold text-foreground">
                          Best {best.score}/{best.maxScore}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={
                      inProgressId
                        ? `/student/exams/attempts/${inProgressId}/take`
                        : `/student/exams/${ex.id}`
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3 text-xs font-bold text-background transition-opacity hover:opacity-90"
                  >
                    {inProgressId
                      ? "Resume"
                      : best
                        ? "Retake"
                        : "Take exam"}
                    <ArrowRight className="size-3.5" />
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
