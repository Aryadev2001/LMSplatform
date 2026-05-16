import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { users, students, lessonProgress } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getCourseBySlug } from "@/lib/courses";
import { CoursePlayer } from "./course-player";
import { Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentCourseDeliveryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const auth = await requireRole("student");
  const [me] = await db.select().from(users).where(eq(users.clerkId, auth.userId)).limit(1);
  if (!me) return null;

  const data = await getCourseBySlug(slug);
  if (!data) notFound();
  const { course, modules } = data;

  const [stu] = await db
    .select()
    .from(students)
    .where(eq(students.userId, me.id))
    .limit(1);
  const enrolled = stu?.assignedProgramId === course.id;

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

  const modulesForPlayer = modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    lessons: mod.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      durationSeconds: l.durationSeconds,
      videoUrl: l.videoUrl,
      resources: (l.resources as { label: string; url: string }[] | null) ?? [],
      completed: doneSet.has(l.id),
    })),
  }));

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
          <div>
            <div className="text-lg font-semibold">Certificate of completion</div>
            <div className="text-sm text-white/80">
              You&apos;ve completed {course.name}. Congratulations, {me.fullName ?? "graduate"}!
            </div>
          </div>
        </div>
      )}

      <CoursePlayer slug={slug} modules={modulesForPlayer} locked={!enrolled} />
    </div>
  );
}
