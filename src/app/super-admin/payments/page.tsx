import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { payments, enrollments, users, tenants, programs } from "@/db/schema";
import { requireSuper, type SuperRole } from "@/lib/auth";
import { canSeeFinancials } from "@/lib/super";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
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

export const dynamic = "force-dynamic";

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  succeeded: "default",
  pending: "secondary",
  refunded: "outline",
  failed: "destructive",
};

export default async function SuperPaymentsPage() {
  const me = await requireSuper();
  const showMoney = canSeeFinancials(me.rawRole as SuperRole);

  const [summary, rows] = await Promise.all([
    db
      .select({
        collected: sql<number>`coalesce(sum(amount_cents) filter (where status in ('succeeded','refunded'))::bigint, 0)`,
        refunded: sql<number>`coalesce(sum(refunded_cents)::bigint, 0)`,
        pendingCount: sql<number>`count(*) filter (where status = 'pending')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(payments),
    db
      .select({
        id: payments.id,
        amountCents: payments.amountCents,
        refundedCents: payments.refundedCents,
        currency: payments.currency,
        status: payments.status,
        description: payments.description,
        paymentMethodLabel: payments.paymentMethodLabel,
        stripePaymentIntentId: payments.stripePaymentIntentId,
        receiptUrl: payments.receiptUrl,
        createdAt: payments.createdAt,
        tenantId: payments.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        programName: programs.name,
        enrollmentName: enrollments.fullName,
        enrollmentEmail: enrollments.email,
        studentName: users.fullName,
        studentEmail: users.email,
      })
      .from(payments)
      .leftJoin(tenants, eq(payments.tenantId, tenants.id))
      .leftJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
      .leftJoin(programs, eq(enrollments.programId, programs.id))
      .leftJoin(users, eq(payments.studentUserId, users.id))
      .orderBy(desc(payments.createdAt))
      .limit(500),
  ]);

  const s = summary[0];
  const collected = Number(s?.collected ?? 0);
  const refunded = Number(s?.refunded ?? 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="— Payments"
        title="Cross-tenant payments"
        description="Every student payment across every partner. Read-only — for monitoring and reconciliation."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Gross collected"
          value={showMoney ? formatCurrency(collected, "INR") : "—"}
          delay={0}
        />
        <StatCard
          label="Refunded"
          value={showMoney ? formatCurrency(refunded, "INR") : "—"}
          delay={0.06}
        />
        <StatCard
          label="Net revenue"
          value={
            showMoney ? formatCurrency(collected - refunded, "INR") : "—"
          }
          delay={0.12}
        />
        <StatCard
          label="Pending"
          value={(s?.pendingCount ?? 0).toString()}
          delay={0.18}
        />
      </div>

      <Card className="border-none bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No payments yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => {
              const customerName = p.studentName ?? p.enrollmentName ?? "—";
              const customerEmail = p.studentEmail ?? p.enrollmentEmail ?? "";
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(p.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.tenantSlug ? (
                      <Link
                        href={`/super-admin/tenants/${p.tenantId}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {p.tenantName ?? p.tenantSlug}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{customerName}</div>
                    {customerEmail && (
                      <div className="text-[11px] text-muted-foreground">
                        {customerEmail}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.programName ?? p.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {showMoney
                      ? formatCurrency(p.amountCents, p.currency)
                      : "—"}
                    {p.refundedCents > 0 && showMoney && (
                      <div className="text-[10px] text-muted-foreground">
                        refunded {formatCurrency(p.refundedCents, p.currency)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANTS[p.status] ?? "outline"}
                      className="font-normal capitalize"
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.paymentMethodLabel ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.receiptUrl ? (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium underline-offset-2 hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
