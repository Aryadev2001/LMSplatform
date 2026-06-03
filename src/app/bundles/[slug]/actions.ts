"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bundles,
  bundleItems,
  programs,
  tenants,
  orders,
  orderItems,
  users,
  students,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fulfillOrderById } from "@/lib/payments/fulfill";

export type BundlePurchase =
  | { ok: true; orderRef: string }
  | { ok: false; error?: string; needsProfile?: string };

/**
 * Buy a bundle → enrol in ALL its courses in one order. Reuses the single
 * fulfilment keystone (fulfillOrderById) so enrollments/payment/invoice are
 * created exactly as a normal purchase. The order is priced at the bundle
 * price (allocated across its courses for payout accounting). Mirrors the
 * gated enroll flow: student profile + phone must be complete first.
 */
export async function placeBundleOrder(slug: string): Promise<BundlePurchase> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Please sign in to enroll." };

  const [bundle] = await db
    .select()
    .from(bundles)
    .where(and(eq(bundles.slug, slug), eq(bundles.isActive, true)))
    .limit(1);
  if (!bundle) return { ok: false, error: "This bundle isn't available." };

  // This action grants access via the free/mock fulfilment path (no charge).
  // A PAID bundle must NOT be granted for free — until the gateway charge path
  // exists for bundles, paid bundles are not purchasable here.
  if (bundle.priceCents > 0) {
    return {
      ok: false,
      error:
        "Paid bundles aren't available for purchase yet. Please contact the institute.",
    };
  }

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!dbUser) return { ok: false, error: "Your account isn't provisioned yet." };

  // Same form-then-pay gate as course checkout (students only).
  if (me.role === "student") {
    const [st] = await db
      .select({
        profile: students.profileCompletedAt,
        phone: students.phoneVerifiedAt,
      })
      .from(students)
      .where(eq(students.userId, dbUser.id))
      .limit(1);
    if (!st?.profile)
      return { ok: false, needsProfile: `/student/profile?required=1&returnTo=/bundles/${slug}` };
    if (!st?.phone)
      return { ok: false, needsProfile: `/student/profile?required=phone&returnTo=/bundles/${slug}` };
  }

  // Component courses — only published + approved ones are sellable.
  const progs = await db
    .select({
      id: programs.id,
      name: programs.name,
      priceCents: programs.priceCents,
      tenantId: programs.tenantId,
      platformFeeBps: tenants.platformFeeBps,
    })
    .from(bundleItems)
    .innerJoin(programs, eq(programs.id, bundleItems.programId))
    .leftJoin(tenants, eq(tenants.id, programs.tenantId))
    .where(
      and(
        eq(bundleItems.bundleId, bundle.id),
        eq(programs.status, "published"),
        isNotNull(programs.approvedAt),
      ),
    );
  if (progs.length === 0) return { ok: false, error: "This bundle has no available courses." };
  if (progs.some((p) => !p.tenantId))
    return { ok: false, error: "A course in this bundle is unavailable." };

  const orderRef = `EDC-B-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  const [order] = await db
    .insert(orders)
    .values({
      orderRef,
      userId: dbUser.id,
      status: "pending",
      billingName: dbUser.fullName ?? dbUser.email,
      billingEmail: dbUser.email,
      currency: bundle.currency,
      subtotalCents: bundle.priceCents,
      discountCents: 0,
      taxCents: 0,
      taxRateBps: 0,
      totalCents: bundle.priceCents,
      paymentProvider: "test",
    })
    .returning({ id: orders.id });

  // Allocate the bundle price across courses (proportional to list price;
  // remainder to the last) so per-course payout splits stay sensible.
  const sumPrices = progs.reduce((s, p) => s + p.priceCents, 0);
  let allocated = 0;
  for (let i = 0; i < progs.length; i++) {
    const p = progs[i];
    const last = i === progs.length - 1;
    const line = last
      ? bundle.priceCents - allocated
      : sumPrices > 0
        ? Math.floor((bundle.priceCents * p.priceCents) / sumPrices)
        : Math.floor(bundle.priceCents / progs.length);
    allocated += line;
    // Clamp to 50% (5000 bps) to match checkout's clampBps — keeps partner
    // payout accounting consistent across direct and bundle sales.
    const bps = Math.min(5000, Math.max(0, p.platformFeeBps ?? 1500));
    const fee = Math.round((line * bps) / 10000);
    await db.insert(orderItems).values({
      orderId: order.id,
      programId: p.id,
      tenantId: p.tenantId as string,
      title: p.name,
      unitPriceCents: line,
      currency: bundle.currency,
      quantity: 1,
      taxCents: 0,
      lineTotalCents: line,
      platformFeeCents: fee,
      partnerPayoutCents: line - fee,
    });
  }

  const f = await fulfillOrderById(order.id, {
    provider: "test",
    paymentLabel: "Test mode",
    providerPaymentId: null,
    redeemPoints: false,
  });
  if (!f.ok) return { ok: false, error: f.error };
  return { ok: true, orderRef: f.orderRef };
}
