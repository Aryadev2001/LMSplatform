import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { enrollments, programs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Brand } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/courses";
import { getTenantFromRequest } from "@/lib/tenant";
import { computeRedeemable } from "@/lib/referral";
import { PayButton } from "./pay-button";
import { CheckCircle2, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Secure checkout — eurodigital.coach" };

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; ref?: string }>;
}) {
  const { e, ref } = await searchParams;
  if (!e) notFound();

  const [enr] = await db.select().from(enrollments).where(eq(enrollments.id, e)).limit(1);
  if (!enr) notFound();

  // Already paid? Send them to the success page.
  if (enr.status !== "pending") {
    return (
      <CenteredCard>
        <CheckCircle2 className="mx-auto size-10 text-[#8CC63F]" />
        <h1 className="mt-4 text-xl font-semibold">This enrollment is already paid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your email for your magic-link login.
        </p>
        <Link
          href="/sign-in"
          className="mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
        >
          Go to sign in
        </Link>
      </CenteredCard>
    );
  }

  const [course] = enr.programId
    ? await db.select().from(programs).where(eq(programs.id, enr.programId)).limit(1)
    : [];
  if (!course) notFound();

  const amount = formatInr(course.priceCents);

  // Returning buyer with a points balance → offer redemption (no negative order).
  const tenant = await getTenantFromRequest();
  const [existingBuyer] = await db
    .select({ bal: users.pointsBalance })
    .from(users)
    .where(eq(users.email, enr.email.toLowerCase()))
    .limit(1);

  let redeem: { points: number; discountLabel: string; netLabel: string } | null = null;
  if (
    tenant?.referralEnabled &&
    existingBuyer &&
    existingBuyer.bal > 0
  ) {
    const r = computeRedeemable({
      pointsBalance: existingBuyer.bal,
      cartCents: course.priceCents,
      redeemMaxPercent: tenant.referralRedeemMaxPercent,
    });
    if (r.points > 0) {
      redeem = {
        points: r.points,
        discountLabel: formatInr(r.discountCents),
        netLabel: formatInr(course.priceCents - r.discountCents),
      };
    }
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-secondary/20 px-6 py-12">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />
      <Link href="/" className="absolute left-6 top-6">
        <Brand />
      </Link>

      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Step 2 of 2 — Secure checkout
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Complete your payment</h1>
        </div>

        <Card className="border-none bg-card p-6 shadow-soft">
          {/* Order summary */}
          <div className="rounded-xl bg-secondary/50 p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Order summary
            </div>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">{course.name}</div>
                <div className="text-xs text-muted-foreground">{course.tagline}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{amount}</div>
                <div className="text-[10px] text-muted-foreground">
                  {course.type === "subscription" ? "per quarter" : "one-time"}
                </div>
              </div>
            </div>
            <div className="mt-3 border-t border-black/5 pt-3 text-xs text-muted-foreground">
              Billed to <span className="font-medium text-foreground">{enr.email}</span>
            </div>
          </div>

          {/* Mock card panel */}
          <div className="mt-4 rounded-xl border border-black/8 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CreditCard className="size-3.5" /> Test payment (Stripe/Razorpay coming soon)
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
              <div className="rounded-lg border border-dashed border-black/10 px-3 py-2">
                Card · 4242 4242 4242 4242
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-dashed border-black/10 px-3 py-2">
                  12 / 34
                </div>
                <div className="rounded-lg border border-dashed border-black/10 px-3 py-2">
                  CVC 123
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <PayButton
              enrollmentId={enr.id}
              amountLabel={amount}
              email={enr.email}
              referralCode={ref ?? null}
              redeem={redeem}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-secondary/20 px-6">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />
      <Card className="w-full max-w-md border-none bg-card p-8 text-center shadow-soft">
        {children}
      </Card>
    </div>
  );
}
