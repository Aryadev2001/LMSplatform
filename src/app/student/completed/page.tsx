import Link from "next/link";
import { CheckCircle2, Award, Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getStudentSnapshot } from "@/lib/student";
import { CourseCover } from "@/components/student/course-card";

export const dynamic = "force-dynamic";

export default async function StudentCompletedPage() {
  const auth = await requireRole("student");
  const snap = await getStudentSnapshot(auth.userId);
  if (!snap) return null;

  const done = snap.courses.filter((c) => c.completed);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ed-green-dark)" }}>
          Achievements
        </div>
        <h1
          className="mt-1 font-display text-3xl font-extrabold tracking-tight"
          style={{ color: "var(--ed-ink)" }}
        >
          Completed
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
          {done.length === 0
            ? "Finish every lesson of a course to earn a verifiable certificate."
            : `${done.length} course${done.length === 1 ? "" : "s"} finished — each comes with a verifiable, shareable certificate.`}
        </p>
      </div>

      {done.length === 0 ? (
        <div
          className="flex flex-col items-center gap-4 rounded-3xl border border-dashed bg-white py-20 text-center"
          style={{ borderColor: "var(--ed-line)" }}
        >
          <span
            className="flex size-16 items-center justify-center rounded-2xl"
            style={{ background: "rgba(141,198,63,0.12)", color: "var(--ed-green-dark)" }}
          >
            <CheckCircle2 className="size-8" />
          </span>
          <div>
            <p className="text-base font-bold" style={{ color: "var(--ed-ink)" }}>
              No completed courses yet
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
              Complete all lessons of a course to unlock its certificate.
            </p>
          </div>
          <Link
            href="/student/courses"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ed-gradient)" }}
          >
            Go to my courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {done.map((co) => (
            <div
              key={co.enrollmentId}
              className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-lg"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <CourseCover co={co} />
              <div className="flex flex-1 flex-col p-5">
                <h3
                  className="line-clamp-2 text-base font-extrabold leading-snug"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {co.name}
                </h3>
                <div
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: "var(--ed-green-dark)" }}
                >
                  <Trophy className="size-3.5" /> Certificate earned
                </div>

                <div className="mt-auto flex gap-2 pt-5">
                  <Link
                    href={`/certificate/${co.enrollmentId}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--ed-gradient)" }}
                  >
                    <Award className="size-3.5" /> View certificate
                  </Link>
                  {co.slug && (
                    <Link
                      href={`/student/courses/${co.slug}`}
                      className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors hover:bg-[var(--ed-bg)]"
                      style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}
                    >
                      Review
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
