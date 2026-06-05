import { eq, and, ne, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants, coursePushHistory, programs } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/format";
import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { platformStripeConfigured } from "@/lib/billing/platform-stripe";
import { BillingActions } from "./upgrade-buttons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Billing — eurodigital.coach" };

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trialing: "default",
  past_due: "destructive",
  canceled: "outline",
  none: "secondary",
};

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  active: CheckCircle2,
  trialing: Clock,
  past_due: AlertCircle,
  canceled: XCircle,
  none: Clock,
};

const TIER_LABEL = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
} as const;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; canceled?: string }>;
}) {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const { upgraded, canceled } = await searchParams;

  const [row] = await db
    .select({
      tier: tenants.tier,
      billingStatus: tenants.billingStatus,
      platformStripeCustomerId: tenants.platformStripeCustomerId,
      platformStripeSubscriptionId: tenants.platformStripeSubscriptionId,
      platformCurrentPeriodEnd: tenants.platformCurrentPeriodEnd,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  // Course invoices EuroDigital raised to this institute (B2B master-course sales).
  const courseInvoices = await db
    .select({
      id: coursePushHistory.id,
      courseName: programs.name,
      priceCents: coursePushHistory.priceCents,
      currency: coursePushHistory.currency,
      status: coursePushHistory.saleStatus,
      soldAt: coursePushHistory.pushedAt,
    })
    .from(coursePushHistory)
    .innerJoin(programs, eq(programs.id, coursePushHistory.masterCourseId))
    .where(
      and(
        eq(coursePushHistory.targetTenantId, tenantId),
        ne(coursePushHistory.saleStatus, "free"),
      ),
    )
    .orderBy(desc(coursePushHistory.pushedAt));
  const courseDue = courseInvoices
    .filter((i) => i.status === "pending")
    .reduce((a, i) => a + (i.priceCents ?? 0), 0);

  const tier = (row?.tier ?? "basic") as "basic" | "standard" | "premium";
  const status = row?.billingStatus ?? "none";
  const StatusIcon = STATUS_ICON[status] ?? Clock;
  const configured = platformStripeConfigured();
  const hasSubscription = Boolean(row?.platformStripeSubscriptionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Your platform-subscription plan and payment method. Per-student payments go to your own gateway in Settings."
      />

      {upgraded && (
        <div
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{
            borderColor: "rgba(141,198,63,0.4)",
            background: "rgba(141,198,63,0.10)",
          }}
        >
          <CheckCircle2 className="size-5" style={{ color: "var(--ed-green)" }} />
          <div>
            <div className="text-sm font-bold">
              Upgrade started — finishing up
            </div>
            <p className="text-xs" style={{ color: "var(--ed-ink-2)" }}>
              Stripe will confirm the payment in a moment. Your tier will flip
              to <strong>{TIER_LABEL[upgraded as keyof typeof TIER_LABEL] ?? upgraded}</strong> as soon as the
              webhook lands (usually a few seconds).
            </p>
          </div>
        </div>
      )}
      {canceled && (
        <div
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: "var(--ed-line)" }}
        >
          <XCircle className="size-5" style={{ color: "var(--ed-mute)" }} />
          <p className="text-xs" style={{ color: "var(--ed-mute)" }}>
            Checkout was canceled. No charge was made — you can pick up where
            you left off below.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-extrabold tracking-tight">
                {TIER_LABEL[tier]}
              </div>
              {row?.platformCurrentPeriodEnd && status === "active" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Renews{" "}
                  <strong>{formatDate(row.platformCurrentPeriodEnd)}</strong>
                </p>
              )}
              {row?.platformCurrentPeriodEnd && status === "canceled" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Access ends{" "}
                  <strong>{formatDate(row.platformCurrentPeriodEnd)}</strong>
                </p>
              )}
            </div>
            <Badge
              variant={STATUS_VARIANTS[status] ?? "secondary"}
              className="inline-flex items-center gap-1.5 capitalize"
            >
              <StatusIcon className="size-3.5" />
              {status.replace("_", " ")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <BillingActions
        currentTier={tier}
        hasSubscription={hasSubscription}
        configured={configured}
      />

      {courseInvoices.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm">Course invoices from EuroDigital</CardTitle>
            {courseDue > 0 && (
              <Badge variant="destructive" className="font-normal">
                {formatCurrency(courseDue, courseInvoices[0].currency)} due
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {courseInvoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{i.courseName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Acquired {formatDate(i.soldAt)}
                    </div>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {formatCurrency(i.priceCents ?? 0, i.currency)}
                  </span>
                  {i.status === "paid" ? (
                    <Badge
                      className="border-transparent font-normal text-white"
                      style={{ background: "var(--ed-green-dark)" }}
                    >
                      <CheckCircle2 className="size-3" /> Paid
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="font-normal">
                      Due
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Courses EuroDigital sold to your institute. Payment is collected
              once the platform gateway is connected — your account manager will
              confirm settlement.
            </p>
          </CardContent>
        </Card>
      )}

      <div
        className="rounded-xl border border-dashed p-3 text-[11px] leading-relaxed"
        style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
      >
        Need an invoice for accounting? Open the Stripe portal — every paid
        invoice is downloadable as a PDF and emailed automatically to the
        billing email on file.
      </div>
    </div>
  );
}
