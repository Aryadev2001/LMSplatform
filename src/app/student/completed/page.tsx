import Link from "next/link";
import { CheckCircle2, Award } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getStudentSnapshot } from "@/lib/student";

export const dynamic = "force-dynamic";

export default async function StudentCompletedPage() {
  const auth = await requireRole("student");
  const snap = await getStudentSnapshot(auth.userId);
  if (!snap) return null;

  const done = snap.courses.filter((c) => c.completed);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1
          className="font-display text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--ed-ink)" }}
        >
          Completed
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
          {done.length} course{done.length === 1 ? "" : "s"} finished — each has
          a verifiable certificate.
        </p>
      </div>

      {done.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center"
          style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
        >
          <CheckCircle2 className="size-9" />
          <p className="text-sm">
            Finish all lessons of a course to earn its certificate.
          </p>
          <Link
            href="/student/courses"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--ed-gradient)" }}
          >
            Go to my courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {done.map((co) => (
            <div
              key={co.enrollmentId}
              className="flex flex-col rounded-2xl border bg-white p-5"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="size-4"
                  style={{ color: "var(--ed-green-dark)" }}
                />
                <span
                  className="text-base font-bold"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {co.name}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/certificate/${co.enrollmentId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white"
                  style={{ background: "var(--ed-gradient)" }}
                >
                  <Award className="size-3.5" /> View certificate
                </Link>
                {co.slug && (
                  <Link
                    href={`/student/courses/${co.slug}`}
                    className="inline-flex items-center rounded-xl border px-4 py-2 text-xs font-bold"
                    style={{
                      borderColor: "var(--ed-line)",
                      color: "var(--ed-ink-2)",
                    }}
                  >
                    Review course
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
