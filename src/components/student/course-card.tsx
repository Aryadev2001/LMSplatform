import Link from "next/link";
import { ArrowRight, Building2, Trophy } from "lucide-react";
import type { StudentCourse } from "@/lib/student";

/**
 * Shared course visuals for the student area so My Courses, the dashboard
 * "Continue learning" row, and Completed all render an identical, professional
 * card. `CourseCover` is the image/gradient header (with institute chip +
 * status pill); `CourseCard` is the full clickable card.
 */
export function CourseCover({
  co,
  status,
}: {
  co: StudentCourse;
  /** Override the default status pill (e.g. an Award on the certificate page). */
  status?: React.ReactNode;
}) {
  const initial = co.name.trim().charAt(0).toUpperCase() || "•";
  return (
    <div className="relative h-36 overflow-hidden" style={{ background: "var(--ed-gradient)" }}>
      {co.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={co.imageUrl}
          alt={co.name}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ background: "var(--ed-halftone)" }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/90">
            {initial}
          </span>
        </>
      )}
      {/* scrim for legibility over busy images */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />

      {co.instituteName && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur">
          <Building2 className="size-3" /> {co.instituteName}
        </span>
      )}

      {status ?? (
        co.completed ? (
          <span
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: "var(--ed-green-dark)" }}
          >
            <Trophy className="size-3" /> Completed
          </span>
        ) : co.percent > 0 ? (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold tabular-nums text-foreground backdrop-blur">
            {co.percent}%
          </span>
        ) : (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur">
            New
          </span>
        )
      )}
    </div>
  );
}

export function CourseCard({ co, href }: { co: StudentCourse; href?: string }) {
  const dest = href ?? (co.slug ? `/student/courses/${co.slug}` : "#");
  return (
    <Link
      href={dest}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{ borderColor: "var(--ed-line)" }}
    >
      <CourseCover co={co} />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-extrabold leading-snug" style={{ color: "var(--ed-ink)" }}>
          {co.name}
        </h3>
        {co.tagline && (
          <p className="mt-1.5 line-clamp-2 text-xs" style={{ color: "var(--ed-mute)" }}>
            {co.tagline}
          </p>
        )}

        <div className="mt-auto pt-5">
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--ed-bg)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${co.percent}%`, background: "var(--ed-gradient)" }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[12px] font-semibold" style={{ color: "var(--ed-mute)" }}>
              {co.completed ? `${co.totalLessons} lessons · done` : `${co.doneLessons}/${co.totalLessons} lessons`}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[12px] font-bold transition-transform group-hover:translate-x-0.5"
              style={{ color: "var(--ed-blue)" }}
            >
              {co.completed ? "Review" : co.percent > 0 ? "Continue" : "Start"}
              <ArrowRight className="size-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
