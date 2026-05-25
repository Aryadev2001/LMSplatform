import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  BookOpen,
  GraduationCap,
  Award,
  Coins,
  ArrowRight,
  UserSquare2,
  CheckCircle2,
} from "lucide-react";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { db } from "@/db/client";
import { students, users } from "@/db/schema";
import { getStudentSnapshot } from "@/lib/student";
import { AI_SERVICES, formatAiPrice } from "@/lib/ai-services";

export const dynamic = "force-dynamic";

const CARD_BG: Record<string, string> = {
  Career: "linear-gradient(135deg,#00aeef 0%,#0091c7 100%)",
  Learning: "linear-gradient(135deg,#8dc63f 0%,#6fa62a 100%)",
  Productivity: "linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)",
  Developer: "linear-gradient(135deg,#14b8a6 0%,#0d9488 100%)",
};

export default async function StudentDashboard() {
  const auth = await requireRole("student");
  const snap = await getStudentSnapshot(auth.userId);
  if (!snap) return null;

  // Profile-completion gate banner — when students.profile_completed_at is
  // null we nudge the learner to /student/profile (and block paid checkout
  // downstream when the gate ships).
  const me = await getCurrentUser();
  const [meRow] = me
    ? await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, me.userId))
        .limit(1)
    : [];
  const [stRow] = meRow
    ? await db
        .select({ profileCompletedAt: students.profileCompletedAt })
        .from(students)
        .where(eq(students.userId, meRow.id))
        .limit(1)
    : [];
  const profileComplete = !!stRow?.profileCompletedAt;

  const c = snap.counts;
  const stats = [
    {
      label: "Active courses",
      value: `${c.activeCourses}`,
      sub: c.newThisMonth > 0 ? `+${c.newThisMonth} this month` : "Lifetime access",
      icon: BookOpen,
    },
    {
      label: "Lessons done",
      value: `${c.lessonsDone}`,
      sub: "across your courses",
      icon: GraduationCap,
    },
    {
      label: "Certificates",
      value: `${c.certificates}`,
      sub: c.certificates > 0 ? `${c.certificates} ready` : "complete a course",
      icon: Award,
    },
    {
      label: "Reward points",
      value: snap.pointsBalance.toLocaleString(),
      sub: "1 pt = ₹1",
      icon: Coins,
    },
  ];

  const aiCards = AI_SERVICES.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <h1
          className="font-display text-2xl font-extrabold tracking-tight md:text-3xl"
          style={{ color: "var(--ed-ink)" }}
        >
          Welcome back, {snap.firstName}.{" "}
          <span style={{ color: "var(--ed-mute)" }}>
            Pick up where you left off.
          </span>
        </h1>
      </div>

      {!profileComplete && (
        <div
          className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor: "rgba(0,174,239,0.30)",
            background: "rgba(0,174,239,0.08)",
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--ed-blue)" }}
            >
              <UserSquare2 className="size-4 text-white" />
            </span>
            <div>
              <div
                className="text-sm font-bold"
                style={{ color: "var(--ed-ink)" }}
              >
                Complete your profile
              </div>
              <div
                className="mt-0.5 text-xs"
                style={{ color: "var(--ed-ink-2)" }}
              >
                We need a few details (mobile, T&amp;C consent, optional
                professional info) before you can enroll in a paid course.
                Takes about a minute.
              </div>
            </div>
          </div>
          <Link
            href="/student/profile"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ed-gradient)" }}
          >
            Complete profile
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
      {profileComplete && (
        <div className="hidden">
          <CheckCircle2 className="size-3.5" />
        </div>
      )}

      {/* Stat cards — all real */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border bg-white p-5"
            style={{ borderColor: "var(--ed-line)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--ed-mute)" }}
              >
                {s.label}
              </span>
              <s.icon className="size-4" style={{ color: "var(--ed-mute)" }} />
            </div>
            <div
              className="mt-3 text-3xl font-extrabold tracking-tight"
              style={{ color: "var(--ed-ink)" }}
            >
              {s.value}
            </div>
            <div className="mt-1 text-[12px]" style={{ color: "var(--ed-mute)" }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* AI Services catalog */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: "var(--ed-ink)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "var(--ed-green)", color: "var(--ed-ink)" }}
            >
              AI Add-on Services
            </span>
            <span className="ml-2 text-[11px] text-white/40">europic.ai</span>
            <h2 className="mt-2 text-lg font-extrabold text-white">
              AI Services Catalog
            </h2>
          </div>
          <span
            className="rounded-lg px-3 py-1.5 text-xs font-bold"
            style={{
              background: "rgba(141,198,63,0.12)",
              border: "1px solid rgba(141,198,63,0.4)",
              color: "var(--ed-green)",
            }}
          >
            🔥 {snap.pointsBalance.toLocaleString()} pts
          </span>
        </div>
        <div className="mt-1 px-6 text-[12px] text-white/45">
          Boost your learning with AI tools
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {aiCards.map((s) => (
            <div
              key={s.id}
              className="flex flex-col overflow-hidden rounded-xl bg-white"
            >
              <div
                className="relative flex h-28 items-center justify-center text-4xl"
                style={{ background: CARD_BG[s.category] ?? CARD_BG.Career }}
              >
                <span
                  className="absolute left-2 top-2 rounded bg-black/35 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                >
                  ▶ Video
                </span>
                {s.badge && (
                  <span
                    className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                    style={{ background: "var(--ed-pink)" }}
                  >
                    {s.badge}
                  </span>
                )}
                <span aria-hidden>{s.icon}</span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--ed-mute)" }}
                >
                  {s.category}
                </div>
                <div
                  className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {s.name}
                </div>
                <div
                  className="mt-2 rounded-md px-2 py-1 text-center text-[11px] font-bold"
                  style={{
                    background: "rgba(141,198,63,0.12)",
                    color: "var(--ed-green-dark)",
                  }}
                >
                  🔥 +{s.rewardPoints} pts
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className="text-sm font-extrabold"
                    style={{ color: "var(--ed-ink)" }}
                  >
                    {formatAiPrice(s)}
                  </span>
                  <Link
                    href="/student/ai-services"
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                    style={{ background: "var(--ed-blue)" }}
                  >
                    Get
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Continue learning */}
      <div
        className="rounded-2xl border bg-white p-6"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
            Continue learning
          </h2>
          <Link
            href="/student/courses"
            className="inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: "var(--ed-blue)" }}
          >
            All courses <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {snap.courses.length === 0 ? (
          <div
            className="mt-4 rounded-xl border border-dashed py-10 text-center text-sm"
            style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
          >
            No courses yet —{" "}
            <Link
              href="/explore"
              className="font-semibold underline"
              style={{ color: "var(--ed-blue)" }}
            >
              explore the marketplace
            </Link>
            .
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snap.courses.slice(0, 3).map((co) => (
              <Link
                key={co.enrollmentId}
                href={co.slug ? `/student/courses/${co.slug}` : "/student/courses"}
                className="rounded-xl border p-4 transition-shadow hover:shadow-md"
                style={{ borderColor: "var(--ed-line)" }}
              >
                <div
                  className="line-clamp-2 text-sm font-bold"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {co.name}
                </div>
                <div
                  className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
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
                <div
                  className="mt-1.5 text-[11px]"
                  style={{ color: "var(--ed-mute)" }}
                >
                  {co.percent}% · {co.completed ? "Completed" : "In progress"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
