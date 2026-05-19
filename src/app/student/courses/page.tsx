import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getStudentSnapshot } from "@/lib/student";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const auth = await requireRole("student");
  const snap = await getStudentSnapshot(auth.userId);
  if (!snap) return null;

  const active = snap.courses.filter((c) => !c.completed);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1
          className="font-display text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--ed-ink)" }}
        >
          My courses
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
          {snap.courses.length} enrolled · {active.length} in progress
        </p>
      </div>

      {snap.courses.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center"
          style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
        >
          <BookOpen className="size-9" />
          <p className="text-sm">You haven&apos;t enrolled in any courses yet.</p>
          <Link
            href="/explore"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--ed-gradient)" }}
          >
            Explore courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {snap.courses.map((co) => (
            <Link
              key={co.enrollmentId}
              href={co.slug ? `/student/courses/${co.slug}` : "#"}
              className="flex flex-col rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <div
                className="text-base font-bold leading-snug"
                style={{ color: "var(--ed-ink)" }}
              >
                {co.name}
              </div>
              {co.tagline && (
                <p
                  className="mt-1 line-clamp-2 text-xs"
                  style={{ color: "var(--ed-mute)" }}
                >
                  {co.tagline}
                </p>
              )}
              <div className="mt-auto pt-4">
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ background: "var(--ed-bg)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${co.percent}%`,
                      background: "var(--ed-gradient)",
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className="text-[12px] font-semibold"
                    style={{
                      color: co.completed
                        ? "var(--ed-green-dark)"
                        : "var(--ed-mute)",
                    }}
                  >
                    {co.completed
                      ? "Completed 🎉"
                      : `${co.percent}% · ${co.doneLessons}/${co.totalLessons} lessons`}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-[12px] font-bold"
                    style={{ color: "var(--ed-blue)" }}
                  >
                    {co.completed ? "Review" : "Continue"}{" "}
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
