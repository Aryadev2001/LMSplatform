import { and, eq, isNull, isNotNull, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { programs, tenants, coursePushHistory } from "@/db/schema";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSuper, type SuperRole } from "@/lib/auth";
import { canWrite } from "@/lib/super";
import { MasterCourseManager } from "./master-course-manager";

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
        title="Master courses"
        description="Author once, push scoped copies into tenants. Sync re-pushes structure and keeps each tenant's price."
      />

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
