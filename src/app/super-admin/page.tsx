import { sql, eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants, users, programs, payments, orders } from "@/db/schema";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  requireSuper,
  type SuperRole,
  isStudentRole,
  isAdminRole,
  STUDENT_DB_ROLES,
} from "@/lib/auth";
import { canSeeFinancials, SUPER_ROLE_LABEL } from "@/lib/super";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function roleLabel(r: string | null): string {
  if (!r) return "—";
  if (isStudentRole(r)) return "Student";
  if (isAdminRole(r)) return "Institute admin";
  if (r.startsWith("SUPER")) return "Super-admin";
  if (r === "INSTRUCTOR") return "Instructor";
  return r;
}

export default async function SuperAdminOverviewPage() {
  const me = await requireSuper();
  const role = me.rawRole as SuperRole;
  const showMoney = canSeeFinancials(role);

  const [
    [tCount],
    [uCount],
    [stuCount],
    [cCount],
    [freeCount],
    [pubCount],
    [ordCount],
    [rev],
    byStatus,
    freeCourses,
    recentSignups,
    recentCourses,
    recentOrders,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(tenants),
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(inArray(users.role, [...STUDENT_DB_ROLES])),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(programs)
      .where(eq(programs.isMasterCourse, false)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(programs)
      .where(and(eq(programs.isMasterCourse, false), eq(programs.priceCents, 0))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(programs)
      .where(
        and(eq(programs.isMasterCourse, false), eq(programs.status, "published")),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.status, "paid")),
    db
      .select({ sum: sql<number>`coalesce(sum(amount_cents)::bigint, 0)` })
      .from(payments)
      .where(sql`status = 'succeeded'`),
    db
      .select({ status: tenants.status, n: sql<number>`count(*)::int` })
      .from(tenants)
      .groupBy(tenants.status),
    db
      .select({
        id: programs.id,
        name: programs.name,
        status: programs.status,
        createdAt: programs.createdAt,
        tenant: tenants.name,
      })
      .from(programs)
      .leftJoin(tenants, eq(programs.tenantId, tenants.id))
      .where(and(eq(programs.isMasterCourse, false), eq(programs.priceCents, 0)))
      .orderBy(desc(programs.createdAt))
      .limit(10),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        studentCode: users.studentCode,
        createdAt: users.createdAt,
        tenant: tenants.name,
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .orderBy(desc(users.createdAt))
      .limit(10),
    db
      .select({
        id: programs.id,
        name: programs.name,
        priceCents: programs.priceCents,
        currency: programs.currency,
        status: programs.status,
        createdAt: programs.createdAt,
        tenant: tenants.name,
      })
      .from(programs)
      .leftJoin(tenants, eq(programs.tenantId, tenants.id))
      .where(eq(programs.isMasterCourse, false))
      .orderBy(desc(programs.createdAt))
      .limit(10),
    db
      .select({
        id: orders.id,
        ref: orders.orderRef,
        total: orders.totalCents,
        currency: orders.currency,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(8),
  ]);

  const stats: { label: string; value: string }[] = [
    { label: "Tenants", value: String(tCount?.n ?? 0) },
    { label: "Students", value: String(stuCount?.n ?? 0) },
    { label: "Users (all)", value: String(uCount?.n ?? 0) },
    { label: "Courses", value: String(cCount?.n ?? 0) },
    { label: "Free courses", value: String(freeCount?.n ?? 0) },
    { label: "Published", value: String(pubCount?.n ?? 0) },
    { label: "Paid orders", value: String(ordCount?.n ?? 0) },
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
        description="Live activity across every institute — signups, course uploads, free courses and orders."
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

      <div className="mt-6 flex flex-wrap gap-2">
        {byStatus.map((s) => (
          <Badge key={s.status} variant="outline">
            {s.status}: {s.n}
          </Badge>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Who's signing up */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent signups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSignups.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No users yet.
                    </TableCell>
                  </TableRow>
                )}
                {recentSignups.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.fullName ?? u.email}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {u.studentCode ?? u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabel(u.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.tenant ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Who's uploading free courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Free courses uploaded</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {freeCourses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No free courses.
                    </TableCell>
                  </TableRow>
                )}
                {freeCourses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.tenant ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* All recent course uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent course uploads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCourses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No courses yet.
                    </TableCell>
                  </TableRow>
                )}
                {recentCourses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.tenant ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.priceCents === 0 ? (
                        <Badge variant="secondary">Free</Badge>
                      ) : (
                        formatCurrency(c.priceCents, c.currency)
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent orders (financials gated) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!showMoney ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Orders are visible to the Owner role only.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.ref}</TableCell>
                      <TableCell>
                        <Badge
                          variant={o.status === "paid" ? "default" : "outline"}
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(o.total, o.currency)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(o.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
