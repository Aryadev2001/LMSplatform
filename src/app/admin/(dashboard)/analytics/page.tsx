import { TrendingUp, Users, BookOpen, Star, IndianRupee, Clock } from "lucide-react";
import { requireTenantId } from "@/lib/tenant";
import { getPartnerAnalytics } from "@/lib/analytics";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { AnalyticsCharts } from "./analytics-charts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics — eurodigital.coach" };

export default async function PartnerAnalyticsPage() {
  const tenantId = await requireTenantId();
  const a = await getPartnerAnalytics(tenantId);

  const kpis = [
    { label: "Revenue", value: formatCurrency(a.kpis.revenueCents, a.currency), icon: IndianRupee },
    { label: "Enrollments", value: String(a.kpis.enrollments), icon: TrendingUp },
    { label: "Students", value: String(a.kpis.students), icon: Users },
    { label: "Published courses", value: String(a.kpis.publishedCourses), icon: BookOpen },
    {
      label: "Avg rating",
      value: a.kpis.reviews > 0 ? `${a.kpis.avgRating.toFixed(1)} (${a.kpis.reviews})` : "—",
      icon: Star,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="— Analytics"
        title="Your performance"
        description="Revenue, enrollments and top courses across your catalog. Updated live."
      />

      {a.kpis.pendingCourses > 0 && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}
        >
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          {a.kpis.pendingCourses} course{a.kpis.pendingCourses === 1 ? "" : "s"} awaiting super-admin approval — not yet visible on the marketplace.
        </div>
      )}

      {/* KPI row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="border-none bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {k.label}
              </span>
              <k.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight">{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <AnalyticsCharts daily={a.daily} currency={a.currency} />

      {/* Top courses */}
      <Card className="mt-6 border-none bg-card p-5 shadow-card">
        <div className="mb-4 text-sm font-semibold">Top courses</div>
        {a.topCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses yet.</p>
        ) : (
          <ul className="divide-y">
            {a.topCourses.map((c, i) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
                  <span className="truncate text-sm font-medium">{c.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {c.enrollments} enrolled
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(c.revenueCents, a.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
