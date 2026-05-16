import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants, users, programs, payments } from "@/db/schema";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSuper, type SuperRole } from "@/lib/auth";
import { canSeeFinancials, SUPER_ROLE_LABEL } from "@/lib/super";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SuperAdminOverviewPage() {
  const me = await requireSuper();
  const role = me.rawRole as SuperRole;
  const showMoney = canSeeFinancials(role);

  const [[tCount], [uCount], [cCount], [rev], byStatus] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(tenants),
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(*)::int` }).from(programs),
    db
      .select({ sum: sql<number>`coalesce(sum(amount_cents)::bigint, 0)` })
      .from(payments)
      .where(sql`status = 'succeeded'`),
    db
      .select({ status: tenants.status, n: sql<number>`count(*)::int` })
      .from(tenants)
      .groupBy(tenants.status),
  ]);

  const stats: { label: string; value: string }[] = [
    { label: "Tenants", value: String(tCount?.n ?? 0) },
    { label: "Users (all tenants)", value: String(uCount?.n ?? 0) },
    { label: "Courses", value: String(cCount?.n ?? 0) },
    {
      label: "Platform revenue",
      value: showMoney ? formatCurrency(Number(rev?.sum ?? 0), "INR") : "—",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Platform overview"
        description="EDT operates above all tenant institutes. Single database, row-level isolation."
        actions={<Badge variant="secondary">{SUPER_ROLE_LABEL[role]}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!showMoney && (
        <p className="mt-4 text-xs text-muted-foreground">
          Platform-wide financials are visible to the Owner role only.
        </p>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Tenants by status
        </h2>
        <div className="flex flex-wrap gap-2">
          {byStatus.length === 0 && (
            <span className="text-sm text-muted-foreground">No tenants yet.</span>
          )}
          {byStatus.map((s) => (
            <Badge key={s.status} variant="outline">
              {s.status}: {s.n}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
