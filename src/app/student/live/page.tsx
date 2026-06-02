import { and, asc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { CalendarClock, Video } from "lucide-react";
import { db } from "@/db/client";
import { liveSessions, programs, enrollments, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Classes — eurodigital.coach" };

const PAID = ["paid", "account_created", "assigned"] as const;

function fmt(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function StudentLivePage() {
  const me = await requireRole("student");

  const [u] = await db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!u) return null;

  // Programs the student is actually enrolled in.
  const enrolled = await db
    .select({ programId: enrollments.programId })
    .from(enrollments)
    .where(and(eq(enrollments.userId, u.id), inArray(enrollments.status, [...PAID])));
  const programIds = [...new Set(enrolled.map((e) => e.programId).filter(Boolean))] as string[];

  const now = new Date();
  // Course-specific sessions for courses they own, OR institute-wide sessions
  // (no course) from their home institute.
  const scope = or(
    programIds.length > 0 ? inArray(liveSessions.programId, programIds) : sql`false`,
    u.tenantId ? and(isNull(liveSessions.programId), eq(liveSessions.tenantId, u.tenantId)) : sql`false`,
  );

  const sessions = await db
    .select({
      id: liveSessions.id,
      title: liveSessions.title,
      description: liveSessions.description,
      startsAt: liveSessions.startsAt,
      durationMinutes: liveSessions.durationMinutes,
      joinUrl: liveSessions.joinUrl,
      programName: programs.name,
    })
    .from(liveSessions)
    .leftJoin(programs, eq(programs.id, liveSessions.programId))
    .where(and(gte(liveSessions.startsAt, now), scope))
    .orderBy(asc(liveSessions.startsAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="— Live Classes"
        title="Upcoming live classes"
        description="Live sessions from your institutes. Join from here when it's time."
      />

      {sessions.length === 0 ? (
        <Card className="border-none bg-card p-12 text-center shadow-card">
          <Video className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No live classes scheduled right now. Check back soon.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const joinable = s.startsAt.getTime() - now.getTime() < 15 * 60 * 1000; // 15 min before
            return (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 border-none bg-card p-5 shadow-card">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="size-4 shrink-0 text-[#1AADE0]" />
                      <span className="truncate text-sm font-semibold">{s.title}</span>
                      <Badge variant="secondary" className="font-normal">
                        {s.programName ?? "All students"}
                      </Badge>
                    </div>
                    <div className="mt-1 pl-6 text-xs text-muted-foreground">
                      {fmt(s.startsAt)} · {s.durationMinutes} min
                    </div>
                    {s.description && (
                      <p className="mt-1.5 pl-6 text-xs text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                  <a
                    href={s.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 ${joinable ? "" : "opacity-60"}`}
                    style={{ background: "linear-gradient(135deg,#8CC63F 0%,#1AADE0 100%)" }}
                    title={joinable ? "Join now" : "Join opens 15 minutes before start"}
                  >
                    {joinable ? "Join now" : "Join"}
                  </a>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
