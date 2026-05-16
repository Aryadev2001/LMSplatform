import Link from "next/link";
import { db } from "@/db/client";
import { users, students, programs, modules, lessons, lessonProgress } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "@/lib/auth";
import { BookOpen, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const auth = await requireRole("student");
  const [me] = await db.select().from(users).where(eq(users.clerkId, auth.userId)).limit(1);
  if (!me) return null;

  const [stu] = await db
    .select()
    .from(students)
    .where(eq(students.userId, me.id))
    .limit(1);

  const course = stu?.assignedProgramId
    ? (await db.select().from(programs).where(eq(programs.id, stu.assignedProgramId)).limit(1))[0]
    : null;

  let percent = 0;
  if (course) {
    const mods = await db.select({ id: modules.id }).from(modules).where(eq(modules.courseId, course.id));
    const modIds = mods.map((m) => m.id);
    const courseLessons = modIds.length
      ? await db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.moduleId, modIds))
      : [];
    const lessonIds = courseLessons.map((l) => l.id);
    const done = lessonIds.length
      ? await db
          .select({ id: lessonProgress.id })
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, me.id),
              inArray(lessonProgress.lessonId, lessonIds),
              eq(lessonProgress.percentComplete, 100),
            ),
          )
      : [];
    percent =
      lessonIds.length === 0 ? 0 : Math.round((done.length / lessonIds.length) * 100);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="— My courses"
        title="Your learning"
        description="Continue where you left off."
      />

      {!course ? (
        <Card className="border-none bg-card shadow-card">
          <CardContent className="py-4">
            <EmptyState
              icon={BookOpen}
              title="No course yet"
              description="Take the Business X-Ray to get matched, or enrol in a program."
              action={
                <Link
                  href="/diagnostic"
                  className={buttonVariants({ size: "sm", className: "rounded-xl" })}
                >
                  Take the Business X-Ray
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Link
          href={`/student/courses/${course.slug}`}
          className="block overflow-hidden rounded-2xl bg-card shadow-card transition-shadow hover:shadow-soft"
        >
          <div className="bg-brand-gradient p-6 text-white">
            <div className="text-[10px] uppercase tracking-widest text-white/70">
              Enrolled program
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{course.name}</div>
            <div className="text-sm text-white/80">{course.tagline}</div>
          </div>
          <div className="p-6">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium">Progress</span>
              <span className="tabular-nums text-muted-foreground">{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-brand-gradient"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {percent === 100 ? "Completed 🎉" : "Continue learning"}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-medium">
                Open course <ArrowRight className="size-4" />
              </span>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
