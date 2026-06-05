import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  Building2,
  GraduationCap,
  Trophy,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getStudentSnapshot, type StudentCourse } from "@/lib/student";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const auth = await requireRole("student");
  const snap = await getStudentSnapshot(auth.userId);
  if (!snap) return null;

  const active = snap.courses.filter((c) => !c.completed);
  const completed = snap.courses.filter((c) => c.completed);
  // In-progress first (most-complete first so the closest-to-finish is up top),
  // then freshly-started, then completed at the end.
  const ordered = [...active.sort((a, b) => b.percent - a.percent), ...completed];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ed-blue)" }}>
            Learning
          </div>
          <h1
            className="mt-1 font-display text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--ed-ink)" }}
          >
            My courses
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
            Pick up where you left off and keep your streak going.
          </p>
        </div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--ed-gradient)" }}
        >
          <GraduationCap className="size-4" /> Browse more courses
        </Link>
      </div>

      {/* Stat pills */}
      {snap.courses.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={BookOpen} label="Enrolled" value={snap.courses.length} tint="var(--ed-blue)" />
          <Stat icon={PlayCircle} label="In progress" value={active.length} tint="#6366f1" />
          <Stat icon={Trophy} label="Completed" value={completed.length} tint="var(--ed-green-dark)" />
          <Stat icon={CheckCircle2} label="Lessons done" value={snap.counts.lessonsDone} tint="#0ea5e9" />
        </div>
      )}

      {snap.courses.length === 0 ? (
        <div
          className="flex flex-col items-center gap-4 rounded-3xl border border-dashed py-20 text-center"
          style={{ borderColor: "var(--ed-line)", background: "white" }}
        >
          <span
            className="flex size-16 items-center justify-center rounded-2xl"
            style={{ background: "rgba(141,198,63,0.12)", color: "var(--ed-green-dark)" }}
          >
            <BookOpen className="size-8" />
          </span>
          <div>
            <p className="text-base font-bold" style={{ color: "var(--ed-ink)" }}>
              No courses yet
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
              Enroll in a course and it’ll show up here, ready to learn.
            </p>
          </div>
          <Link
            href="/explore"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ed-gradient)" }}
          >
            Explore courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ordered.map((co) => (
            <CourseCard key={co.enrollmentId} co={co} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border bg-white p-4"
      style={{ borderColor: "var(--ed-line)" }}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${tint} 12%, white)`, color: tint }}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-extrabold leading-none tabular-nums" style={{ color: "var(--ed-ink)" }}>
          {value}
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ed-mute)" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function CourseCard({ co }: { co: StudentCourse }) {
  const href = co.slug ? `/student/courses/${co.slug}` : "#";
  const initial = co.name.trim().charAt(0).toUpperCase() || "•";

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{ borderColor: "var(--ed-line)" }}
    >
      {/* Cover */}
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
        {/* gradient scrim for legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />

        {/* institute chip */}
        {co.instituteName && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur">
            <Building2 className="size-3" /> {co.instituteName}
          </span>
        )}

        {/* status pill */}
        {co.completed ? (
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
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur">
            New
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3
          className="line-clamp-2 text-base font-extrabold leading-snug"
          style={{ color: "var(--ed-ink)" }}
        >
          {co.name}
        </h3>
        {co.tagline && (
          <p className="mt-1.5 line-clamp-2 text-xs" style={{ color: "var(--ed-mute)" }}>
            {co.tagline}
          </p>
        )}

        <div className="mt-auto pt-5">
          {/* progress */}
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--ed-bg)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${co.percent}%`, background: "var(--ed-gradient)" }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[12px] font-semibold" style={{ color: "var(--ed-mute)" }}>
              {co.completed
                ? `${co.totalLessons} lessons · done`
                : `${co.doneLessons}/${co.totalLessons} lessons`}
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
