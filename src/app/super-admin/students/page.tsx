import Link from "next/link";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  students,
  tenants,
  enrollments,
  payments,
} from "@/db/schema";
import { requireSuper, STUDENT_DB_ROLES, type SuperRole } from "@/lib/auth";
import { canSeeFinancials } from "@/lib/super";
import { PageHeader } from "@/components/dashboard/page-header";
import { TableToolbar } from "@/components/dashboard/table-toolbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Students — eurodigital.coach" };

export default async function SuperStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await requireSuper();
  const showMoney = canSeeFinancials(me.rawRole as SuperRole);
  const { q } = await searchParams;
  const search = q?.trim();

  // Cross-tenant student list with their tenant, profile completion, mobile,
  // total spend, and paid-enrollment count. Sourced from the users + students
  // join so unenrolled (free signups) also appear.
  const conditions: (SQL | undefined)[] = [
    inArray(users.role, [...STUDENT_DB_ROLES]),
  ];
  if (search) {
    conditions.push(
      or(
        ilike(users.fullName, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(students.phone, `%${search}%`),
      ),
    );
  }
  const where = and(...conditions.filter((c): c is SQL => Boolean(c)));

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      createdAt: users.createdAt,
      tenantId: users.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      phone: students.phone,
      paymentMode: students.paymentModePreference,
      whatsappConsent: students.whatsappConsent,
      profileCompletedAt: students.profileCompletedAt,
      termsAcceptedAt: students.termsAcceptedAt,
      spendCents: sql<number>`coalesce((
        select sum(p.amount_cents)::bigint
        from ${payments} p
        where p.student_user_id = ${users.id} and p.status = 'succeeded'
      ), 0)`,
      paidEnrollmentCount: sql<number>`coalesce((
        select count(*)::int
        from ${enrollments} e
        where e.user_id = ${users.id}
          and e.status in ('paid','account_created','assigned')
      ), 0)`,
    })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(tenants, eq(tenants.id, users.tenantId))
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(500);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="— Students"
        title="Cross-tenant students"
        description="Every learner across every tenant — read-only. Click a name (or the View column) to open the full profile: personal, professional, financial, enrollments, and per-payment history."
      />

      <div className="mb-4">
        <TableToolbar searchPlaceholder="Search by name, email or mobile…" />
      </div>

      <Card className="border-none bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Paid courses</TableHead>
              <TableHead className="text-right">Lifetime spend</TableHead>
              <TableHead className="text-right">Joined</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {search
                    ? `No students match "${search}"`
                    : "No students yet."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const spend = Number(r.spendCents ?? 0);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/super-admin/students/${r.id}`}
                      className="block min-w-0 hover:underline"
                    >
                      <div className="text-sm font-bold">
                        {r.fullName ?? "(no name yet)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.email}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.tenantId ? (
                      <Link
                        href={`/super-admin/tenants/${r.tenantId}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {r.tenantName ?? r.tenantSlug}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.phone ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {r.profileCompletedAt ? (
                      <Badge variant="default" className="font-normal">
                        <CheckCircle2 className="size-3" /> Complete
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">
                        <Circle className="size-3" /> Incomplete
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.whatsappConsent ? (
                      <Badge variant="default" className="font-normal">
                        Opted in
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <strong className="text-foreground">
                      {r.paidEnrollmentCount}
                    </strong>{" "}
                    course{r.paidEnrollmentCount === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {showMoney
                      ? formatCurrency(spend, "INR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/super-admin/students/${r.id}`}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors hover:bg-secondary"
                    >
                      View
                      <ArrowRight className="size-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {!showMoney && (
        <p className="text-[11px] text-muted-foreground">
          Lifetime spend is hidden for your role — promote to{" "}
          <strong>SUPER_STAFF</strong> or higher to view financial figures.
        </p>
      )}
    </div>
  );
}

