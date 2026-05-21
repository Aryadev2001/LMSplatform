import { db } from "@/db/client";
import { payments, enrollments, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireTenantId } from "@/lib/tenant";
import { requireTier } from "@/lib/tier-lock";
import { PageHeader } from "@/components/dashboard/page-header";
import { TableToolbar } from "@/components/dashboard/table-toolbar";
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
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatCurrency, formatDate, initialsOf } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreditCard } from "lucide-react";
import { SyncStripeButton } from "./sync-button";
import { PaymentDetail } from "./payment-detail";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["all", "succeeded", "pending", "refunded", "failed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  await requireTier("standard", "Payments");
  const tenantId = await requireTenantId();
  const search = q?.trim()?.toLowerCase();
  const activeFilter: StatusFilter = (STATUS_FILTERS as readonly string[]).includes(status ?? "")
    ? (status as StatusFilter)
    : "all";

  const [summaryRows, rows] = await Promise.all([
    db
      .select({
        collected: sql<number>`coalesce(sum(amount_cents) filter (where status in ('succeeded','refunded'))::int, 0)`,
        refunded: sql<number>`coalesce(sum(refunded_cents)::int, 0)`,
        pendingCount: sql<number>`count(*) filter (where status = 'pending')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(eq(payments.tenantId, tenantId)),
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
        stripeChargeId: payments.stripeChargeId,
        stripeCustomerId: payments.stripeCustomerId,
        receiptUrl: payments.receiptUrl,
        createdAt: payments.createdAt,
        enrollmentName: enrollments.fullName,
        enrollmentEmail: enrollments.email,
        studentName: users.fullName,
        studentEmail: users.email,
      })
      .from(payments)
      .leftJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
      .leftJoin(users, eq(payments.studentUserId, users.id))
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.createdAt)),
  ]);

  const summary = summaryRows[0];
  const collected = summary?.collected ?? 0;
  const refunded = summary?.refunded ?? 0;

  const filtered = rows.filter((r) => {
    if (activeFilter !== "all" && r.status !== activeFilter) return false;
    if (search) {
      const name = (r.studentName ?? r.enrollmentName ?? "").toLowerCase();
      const email = (r.studentEmail ?? r.enrollmentEmail ?? "").toLowerCase();
      if (!name.includes(search) && !email.includes(search)) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="— Payments"
        title="Payment tracking"
        description="Every payment from students. Syncs from Stripe once connected."
        actions={<SyncStripeButton />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross collected" value={formatCurrency(collected)} delay={0} />
        <StatCard label="Refunded" value={formatCurrency(refunded)} delay={0.06} />
        <StatCard label="Net revenue" value={formatCurrency(collected - refunded)} delay={0.12} />
        <StatCard
          label="Pending"
          value={(summary?.pendingCount ?? 0).toString()}
          delay={0.18}
        />
      </div>

      <TableToolbar
        searchPlaceholder="Search by customer name or email…"
        filter={{
          paramKey: "status",
          options: STATUS_FILTERS.map((s) => ({ value: s, label: s })),
        }}
      />

      <Card className="border-none bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Customer</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Date</TableHead>
              <TableHead className="pr-6 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={CreditCard}
                    title={
                      activeFilter === "all" ? "No payments yet" : `No ${activeFilter} payments`
                    }
                    description="Payments appear here once students pay. Connect Stripe to pull live data."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const name = r.studentName ?? r.enrollmentName ?? "—";
                const email = r.studentEmail ?? r.enrollmentEmail ?? "—";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-secondary text-xs">
                            {initialsOf(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{name}</div>
                          <div className="truncate text-xs text-muted-foreground">{email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.paymentMethodLabel ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(r.amountCents, r.currency)}
                      {r.refundedCents > 0 && (
                        <div className="text-[11px] text-rose-600">
                          -{formatCurrency(r.refundedCents, r.currency)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "succeeded"
                            ? "default"
                            : r.status === "refunded" || r.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="font-normal capitalize"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <PaymentDetail
                        payment={{
                          id: r.id,
                          studentName: name,
                          studentEmail: email,
                          amountCents: r.amountCents,
                          refundedCents: r.refundedCents,
                          currency: r.currency,
                          status: r.status,
                          description: r.description,
                          paymentMethodLabel: r.paymentMethodLabel,
                          stripePaymentIntentId: r.stripePaymentIntentId,
                          stripeChargeId: r.stripeChargeId,
                          stripeCustomerId: r.stripeCustomerId,
                          receiptUrl: r.receiptUrl,
                          createdAt: r.createdAt.toISOString(),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
