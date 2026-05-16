import Link from "next/link";
import { db } from "@/db/client";
import { users, students, programs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "@/lib/auth";
import { Activity, BookOpen, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function StudentOverviewPage() {
  const auth = await requireRole("student");

  const [me] = await db.select().from(users).where(eq(users.clerkId, auth.userId)).limit(1);
  if (!me) return null;

  const [myStudent] = await db
    .select()
    .from(students)
    .where(eq(students.userId, me.id))
    .limit(1);

  const program = myStudent?.assignedProgramId
    ? (await db.select().from(programs).where(eq(programs.id, myStudent.assignedProgramId)).limit(1))[0]
    : null;

  const firstName = me.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow={`— ${greeting()}`}
        title={`Welcome back, ${firstName}`}
        description="Your enrolled course and your Business X-Ray."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden border-none bg-foreground text-background shadow-card">
          <CardHeader>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-background/60">
              — Your course
            </div>
            <CardTitle className="text-2xl tracking-tight">
              {program?.name ?? "No course yet"}
            </CardTitle>
            <CardDescription className="text-background/70">
              {program
                ? `${program.durationMonths} month program — start learning below.`
                : "Take the Business X-Ray to get your personalised recommendation."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={program ? "/student/courses" : "/diagnostic"}
              className={buttonVariants({
                className:
                  "group h-10 rounded-xl bg-background px-5 text-sm text-foreground hover:bg-background/90",
              })}
            >
              {program ? "Go to my course" : "Take the Business X-Ray"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none bg-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              Business X-Ray
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              title="No diagnostic yet"
              description="Run the 7-layer scan to see your Business Health Score."
              action={
                <Link
                  href="/diagnostic"
                  className={buttonVariants({ size: "sm", className: "rounded-xl" })}
                >
                  Start
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4" />
            My courses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {program ? (
            <Link
              href="/student/courses"
              className="flex items-center justify-between rounded-xl bg-secondary/40 p-4 transition-colors hover:bg-secondary"
            >
              <div>
                <div className="text-sm font-medium">{program.name}</div>
                <div className="text-xs text-muted-foreground">
                  {program.durationMonths} month program
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No courses enrolled"
              description="Your courses appear here once you enroll."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
