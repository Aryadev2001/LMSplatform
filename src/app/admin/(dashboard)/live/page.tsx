import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { CalendarClock, Video, ExternalLink } from "lucide-react";
import { db } from "@/db/client";
import { liveSessions, programs } from "@/db/schema";
import { requireTenantId } from "@/lib/tenant";
import { requireFeature } from "@/lib/tier-lock";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewSessionDialog, DeleteSessionButton } from "./session-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Classes — eurodigital.coach" };

function fmt(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminLivePage() {
  // Standard+ feature — Basic partners are redirected to the upgrade prompt.
  await requireFeature("live_classes");
  const tenantId = await requireTenantId();
  const now = new Date();

  const [upcoming, past, courses] = await Promise.all([
    db
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
      .where(and(eq(liveSessions.tenantId, tenantId), gte(liveSessions.startsAt, now)))
      .orderBy(asc(liveSessions.startsAt)),
    db
      .select({
        id: liveSessions.id,
        title: liveSessions.title,
        startsAt: liveSessions.startsAt,
        programName: programs.name,
      })
      .from(liveSessions)
      .leftJoin(programs, eq(programs.id, liveSessions.programId))
      .where(and(eq(liveSessions.tenantId, tenantId), lt(liveSessions.startsAt, now)))
      .orderBy(desc(liveSessions.startsAt))
      .limit(10),
    db
      .select({ id: programs.id, name: programs.name })
      .from(programs)
      .where(eq(programs.tenantId, tenantId))
      .orderBy(asc(programs.name)),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="— Live Classes"
        title="Live classes"
        description="Schedule live sessions with a Zoom / Meet / Teams link. Enrolled students see them in their dashboard with a join button."
        actions={<NewSessionDialog courses={courses} />}
      />

      <Card className="border-none bg-card p-0 shadow-card">
        <div className="border-b px-5 py-3 text-sm font-semibold">Upcoming</div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No upcoming live classes. Schedule one to get started.
          </div>
        ) : (
          <ul className="divide-y">
            {upcoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
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
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={s.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1AADE0] hover:bg-secondary"
                  >
                    <ExternalLink className="size-3.5" /> Open link
                  </a>
                  <DeleteSessionButton id={s.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {past.length > 0 && (
        <Card className="mt-6 border-none bg-card p-0 shadow-card">
          <div className="border-b px-5 py-3 text-sm font-semibold text-muted-foreground">Past</div>
          <ul className="divide-y">
            {past.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Video className="size-4 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </span>
                <span className="shrink-0 text-xs">{fmt(s.startsAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
