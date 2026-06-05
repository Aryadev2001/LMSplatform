import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  PlayCircle,
  GraduationCap,
  Trophy,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getStudentSnapshot } from "@/lib/student";
import { CourseCard } from "@/components/student/course-card";

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

