import { and, eq, isNull, isNotNull, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { programs, tenants, coursePushHistory } from "@/db/schema";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSuper, type SuperRole } from "@/lib/auth";
import { canWrite } from "@/lib/super";
import { formatCurrency } from "@/lib/format";
import { MasterCourseManager } from "./master-course-manager";
import { CourseApprovalButtons } from "./course-approval-buttons";

export const dynamic = "force-dynamic";

export default async function SuperCoursesPage() {
  const me = await requireSuper();
  const writable = canWrite(me.rawRole as SuperRole);

  const masters = await db
    .select({
      id: programs.id,
      name: programs.name,
      tier: programs.tier,
      status: programs.status,
      copies: sql<number>`(select count(*)::int from ${programs} c where c.source_course_id = ${programs.id})`,
      studentPublished: sql<boolean>`exists (select 1 from ${programs} c where c.source_course_id = ${programs.id} and c.student_catalog = true)`,
    })
    .from(programs)
    .where(eq(programs.isMasterCourse, true))
    .orderBy(desc(programs.createdAt));

  // Original authored courses (not masters, not pushed copies) → promotable.
  const promotable = await db
    .select({ id: programs.id, name: programs.name })
    .from(programs)
    .where(
      and(
        eq(programs.isMasterCourse, false),
        isNull(programs.sourceCourseId),
        isNotNull(programs.tenantId),
      ),
    )
    .orderBy(desc(programs.createdAt));

  const activeTenants = await db
    .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.status, "ACTIVE"))
    .orderBy(tenants.name);

  // Partner-submitted courses awaiting (or holding) approval. Only published,
  // tenant-scoped, non-master courses go through the approval gate.
  const reviewCourses = await db
    .select({
      id: programs.id,
      name: programs.name,
      slug: programs.slug,
      priceCents: programs.priceCents,
      currency: programs.currency,
      approvedAt: programs.approvedAt,
      createdAt: programs.createdAt,
      tenantName: tenants.name,
    })
    .from(programs)
    .innerJoin(tenants, eq(tenants.id, programs.tenantId))
    .where(
      and(
        eq(programs.isMasterCourse, false),
        isNull(programs.sourceCourseId),
        eq(programs.status, "published"),
        eq(programs.isActive, true),
      ),
    )
    .orderBy(desc(programs.createdAt));
  const pendingCourses = reviewCourses.filter((c) => !c.approvedAt);

  const pushed = await db
    .select({
      masterId: coursePushHistory.masterCourseId,
      tenantId: coursePushHistory.targetTenantId,
      pushedAt: coursePushHistory.pushedAt,
      syncedAt: coursePushHistory.syncedAt,
    })
    .from(coursePushHistory);

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Courses"
        description="Approve partner-submitted courses for the marketplace, and author master courses to push into tenants."
      />

      {/* Course approval queue — partner courses are hidden from the public
          marketplace until approved here. */}
      <Card className="mb-8">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm">
            Course approval
            {pendingCourses.length > 0 && (
              <Badge variant="destructive" className="ml-2 font-normal">
                {pendingCourses.length} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviewCourses.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No partner courses submitted yet.
            </p>
          ) : (
            <ul className="divide-y">
              {reviewCourses.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      {c.approvedAt ? (
                        <Badge variant="secondary" className="font-normal">Live</Badge>
                      ) : (
                        <Badge variant="destructive" className="font-normal">Pending review</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.tenantName} · {formatCurrency(c.priceCents, c.currency)}
                    </div>
                  </div>
                  <CourseApprovalButtons
                    programId={c.id}
                    approved={!!c.approvedAt}
                    writable={writable}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!writable && (
        <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Read-only role — promote/push/sync is disabled for you.
        </p>
      )}

      <MasterCourseManager
        writable={writable}
        masters={masters}
        promotable={promotable}
        tenants={activeTenants}
        pushed={pushed.map((p) => ({
          masterId: p.masterId,
          tenantId: p.tenantId,
          synced: !!p.syncedAt,
        }))}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-sm">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>• Promote turns one of your authored courses into a master (eurodigital.coach catalog, no tenant).</p>
          <p>• Push deep-clones the master (modules + lessons) into each selected tenant.</p>
          <p>• Sync re-pushes structure to every tenant copy; their price/status/tier-eligibility are preserved.</p>
        </CardContent>
      </Card>
    </div>
  );
}
