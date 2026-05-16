import Link from "next/link";
import { db } from "@/db/client";
import { users, programs, enrollments, payments } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatDate, initialsOf } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUpRight, Plus, Users, Activity, ClipboardList, BookOpen } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  account_created: "Account",
  assigned: "Assigned",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  paid: "default",
  account_created: "default",
  assigned: "default",
  cancelled: "destructive",
  refunded: "destructive",
};

export default async function AdminOverviewPage() {
  // Run every query in parallel — was previously 6 sequential round-trips.
  const [counts, pendingEnrollments, revenueRow, recentEnrollments, topProgramsRows] =
    await Promise.all([
      db
        .select({
          students: sql<number>`count(*) filter (where role in ('student','STUDENT','coach'))::int`,
        })
        .from(users),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(eq(enrollments.status, "paid")),
      db
        .select({ sum: sql<number>`coalesce(sum(amount_cents)::int, 0)` })
        .from(payments)
        .where(eq(payments.status, "succeeded")),
      db
        .select({
          id: enrollments.id,
          fullName: enrollments.fullName,
          email: enrollments.email,
          status: enrollments.status,
          createdAt: enrollments.createdAt,
        })
        .from(enrollments)
        .orderBy(desc(enrollments.createdAt))
        .limit(5),
      db
        .select({
          id: programs.id,
          name: programs.name,
          priceCents: programs.priceCents,
          currency: programs.currency,
          isActive: programs.isActive,
        })
        .from(programs)
        .orderBy(desc(programs.createdAt))
        .limit(4),
    ]);

  const stats = {
    students: counts[0]?.students ?? 0,
    pendingEnrollments: pendingEnrollments[0]?.count ?? 0,
    revenueCents: revenueRow[0]?.sum ?? 0,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="— Overview"
        title="Platform at a glance"
        description="Students, courses, diagnostics and revenue across the business."
        actions={
          <Link
            href="/admin/programs"
            className={buttonVariants({ size: "sm", className: "rounded-xl" })}
          >
            <Plus className="size-4" />
            New course
          </Link>
        }
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total students"
          value={stats.students.toString()}
          sparkline={generateSpark(stats.students)}
          delay={0}
        />
        <StatCard
          label="Pending enrollments"
          value={stats.pendingEnrollments.toString()}
          sparkline={generateSpark(stats.pendingEnrollments)}
          delay={0.06}
        />
        <StatCard
          label="Total revenue"
          value={formatCurrency(stats.revenueCents)}
          sparkline={generateSpark(stats.revenueCents / 100)}
          delay={0.12}
        />
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/admin/students" icon={Users} label="Students" hint="Manage enrollments" />
        <QuickLink href="/admin/programs" icon={BookOpen} label="Courses" hint="Create & edit" />
        <QuickLink href="/admin/diagnostics" icon={Activity} label="Diagnostics" hint="Review submissions" />
        <QuickLink href="/admin/enrollments" icon={ClipboardList} label="Enrollments" hint="Track sign-ups" />
      </div>

      {/* Two-column lower section */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none bg-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent enrollments</CardTitle>
            <Link
              href="/admin/enrollments"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEnrollments.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No enrollments yet"
                description="Once a student fills the public enrollment form, they'll show up here."
              />
            ) : (
              recentEnrollments.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-secondary/40 p-3 transition-colors hover:bg-secondary"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-foreground/5 text-xs">
                        {initialsOf(r.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.fullName}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="hidden text-muted-foreground sm:inline">
                      {formatDate(r.createdAt)}
                    </span>
                    <Badge
                      variant={STATUS_VARIANTS[r.status] ?? "secondary"}
                      className="font-normal"
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Programs</CardTitle>
            <Link
              href="/admin/programs"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Manage
              <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {topProgramsRows.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No programs yet"
                description="Programs define the packages students can enroll in."
                action={
                  <Link href="/admin/programs" className={buttonVariants({ size: "sm", className: "rounded-xl" })}>
                    <Plus className="size-3.5" />
                    Create program
                  </Link>
                }
              />
            ) : (
              topProgramsRows.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-secondary/40 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(p.priceCents, p.currency)}
                    </div>
                  </div>
                  <Badge
                    variant={p.isActive ? "default" : "secondary"}
                    className="font-normal"
                  >
                    {p.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: typeof Users;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl bg-card p-4 shadow-card transition-shadow hover:shadow-soft"
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{hint}</div>
      </div>
      <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

// Generate a believable sparkline shape from a single value
function generateSpark(value: number): number[] {
  const base = Math.max(value, 1);
  const noise = (i: number) => Math.sin(i * 1.4) * 0.15 + Math.cos(i * 0.7) * 0.1;
  return Array.from({ length: 12 }, (_, i) => base * (0.5 + i * 0.045 + noise(i)));
}
