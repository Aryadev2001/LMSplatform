"use server";

import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  programs,
  enrollments,
  payments,
  students,
  users,
  carts,
  orders,
  orderItems,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { taxRateFor } from "@/lib/tax";
import {
  redeemPointsAtCheckout,
  awardReferralForPurchase,
} from "@/lib/referral";

const Schema = z.object({
  programIds: z.array(z.string().uuid()).min(1).max(20),
  billingCountry: z.string().trim().max(60),
  redeemPoints: z.boolean(),
});

type Result =
  | {
      success: true;
      orderRef: string;
      orderId: string;
      items: number;
      currency: string;
      pointsRedeemed: number;
    }
  | { success: false; error: string };

/**
 * Platform commission, in basis points, taken from each line's gross
 * price; the remainder is the institute's payout. There is no per-tenant
 * commission column yet, so this is a single platform-wide default —
 * revisit when tenants get a negotiated rate.
 */
const PLATFORM_FEE_BPS = 1500; // 15%

/**
 * MOCK order placement — no live Stripe/Razorpay charge yet (that is the
 * dedicated money-path build). For an authenticated learner it now writes
 * a real `orders` + `order_items` record (with tax + per-institute
 * platform-fee / partner-payout split) alongside the enrollment + payment
 * rows that grant access, and applies the verified points + referral
 * engine.
 *
 * NOTE: the neon-http driver has no interactive transactions, so these
 * writes are sequential, not atomic. The order row is created first so
 * every child FK is valid; a mid-flight failure would leave a partial
 * order. Real atomicity (pool driver / webhook reconciliation) comes with
 * live payment processing.
 */
export async function placeOrder(input: unknown): Promise<Result> {
  const me = await getCurrentUser();
  if (!me) return { success: false, error: "Please sign in to check out." };

  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid cart" };
  }

  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!dbUser) return { success: false, error: "Account not provisioned yet." };

  const progs = await db
    .select({
      id: programs.id,
      name: programs.name,
      priceCents: programs.priceCents,
      currency: programs.currency,
      tenantId: programs.tenantId,
      status: programs.status,
    })
    .from(programs)
    .where(
      and(
        inArray(programs.id, parsed.data.programIds),
        eq(programs.status, "published"),
      ),
    );

  if (progs.length === 0) {
    return { success: false, error: "No purchasable items in cart." };
  }
  if (progs.some((p) => !p.tenantId)) {
    return { success: false, error: "An item is not available for purchase." };
  }

  // One order = one currency (money-correctness; the cart UI already warns
  // about mixed currencies). Mixed → check out one institute at a time.
  const currency = progs[0].currency;
  if (progs.some((p) => p.currency !== currency)) {
    return {
      success: false,
      error:
        "Your cart mixes currencies — please check out one institute at a time.",
    };
  }
  const singleTenant = progs.every((p) => p.tenantId === progs[0].tenantId);

  // Money — mirrors the checkout UI exactly so the charged total equals the
  // shown total: tax on subtotal (pre-points), points subtracted after.
  const subtotalCents = progs.reduce((s, p) => s + p.priceCents, 0);
  const tax = taxRateFor(parsed.data.billingCountry);
  const taxCentsTotal = Math.round(subtotalCents * tax.rate);

  // Proportional per-line tax allocation; last line absorbs the rounding
  // remainder so Σ line tax === order tax.
  const taxByIndex: number[] = [];
  let taxAllocated = 0;
  progs.forEach((p, i) => {
    const isLast = i === progs.length - 1;
    const alloc =
      subtotalCents === 0
        ? 0
        : isLast
          ? taxCentsTotal - taxAllocated
          : Math.floor((taxCentsTotal * p.priceCents) / subtotalCents);
    taxByIndex.push(alloc);
    taxAllocated += alloc;
  });

  const orderRef = `EDC-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
  const billingCountry =
    parsed.data.billingCountry.length === 2
      ? parsed.data.billingCountry.toUpperCase()
      : null;

  // Order header first so every child FK (order_items, payments.order_id)
  // is valid. Finalized to "paid" once the lines succeed.
  const [order] = await db
    .insert(orders)
    .values({
      orderRef,
      userId: dbUser.id,
      status: "pending",
      billingName: dbUser.fullName ?? dbUser.email,
      billingEmail: dbUser.email,
      billingCountry,
      currency,
      subtotalCents,
      taxCents: taxCentsTotal,
      taxRateBps: tax.rateBps,
      totalCents: subtotalCents + taxCentsTotal,
      paymentProvider: "test",
    })
    .returning({ id: orders.id });

  // Per item: enrollment → payment (mock succeeded) → order_item → access.
  const created: {
    paymentId: string;
    tenantId: string;
    amountCents: number;
  }[] = [];
  for (let i = 0; i < progs.length; i++) {
    const p = progs[i];
    const lineTax = taxByIndex[i];
    const platformFeeCents = Math.round(
      (p.priceCents * PLATFORM_FEE_BPS) / 10000,
    );
    const partnerPayoutCents = p.priceCents - platformFeeCents;

    const [enr] = await db
      .insert(enrollments)
      .values({
        fullName: dbUser.fullName ?? dbUser.email,
        email: dbUser.email,
        programId: p.id,
        status: "paid",
        userId: dbUser.id,
      })
      .returning({ id: enrollments.id });

    const [pay] = await db
      .insert(payments)
      .values({
        enrollmentId: enr.id,
        studentUserId: dbUser.id,
        amountCents: p.priceCents,
        taxCents: lineTax,
        currency: p.currency,
        status: "succeeded",
        description: `${p.name} — ${orderRef}`,
        paymentMethodLabel: "Test mode",
        provider: "test",
        stripePaymentIntentId: `pi_mock_${Math.random().toString(36).slice(2, 12)}`,
        tenantId: p.tenantId,
        orderId: order.id,
      })
      .returning({ id: payments.id });

    await db.insert(orderItems).values({
      orderId: order.id,
      programId: p.id,
      tenantId: p.tenantId as string,
      enrollmentId: enr.id,
      paymentId: pay.id,
      title: p.name,
      unitPriceCents: p.priceCents,
      currency: p.currency,
      quantity: 1,
      taxCents: lineTax,
      lineTotalCents: p.priceCents,
      platformFeeCents,
      partnerPayoutCents,
    });

    const [stu] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.userId, dbUser.id))
      .limit(1);
    if (!stu) {
      await db.insert(students).values({
        userId: dbUser.id,
        enrollmentId: enr.id,
        assignedProgramId: p.id,
      });
    } else {
      await db
        .update(students)
        .set({ assignedProgramId: p.id, enrollmentId: enr.id })
        .where(eq(students.userId, dbUser.id));
    }

    await db
      .update(enrollments)
      .set({ status: "account_created", userId: dbUser.id, updatedAt: new Date() })
      .where(eq(enrollments.id, enr.id));

    created.push({
      paymentId: pay.id,
      tenantId: p.tenantId as string,
      amountCents: p.priceCents,
    });
  }

  // Points redemption — only for a single-institute cart (per-tenant engine);
  // mixed-institute carts skip it (conservative, money-correct).
  let pointsRedeemed = 0;
  let pointsDiscountCents = 0;
  if (parsed.data.redeemPoints && singleTenant) {
    const cartCents = created.reduce((s, c) => s + c.amountCents, 0);
    const r = await redeemPointsAtCheckout({
      userId: dbUser.id,
      tenantId: created[0].tenantId,
      paymentId: created[0].paymentId,
      cartCents,
    });
    pointsRedeemed = r.points;
    if (r.discountCents > 0) {
      pointsDiscountCents = r.discountCents;
      const net = Math.max(0, created[0].amountCents - r.discountCents);
      await db
        .update(payments)
        .set({ amountCents: net, pointsRedeemed: r.points })
        .where(eq(payments.id, created[0].paymentId));
      created[0].amountCents = net;
    }
  }

  // Referral attribution (verified, idempotent per payment).
  for (const c of created) {
    await awardReferralForPurchase({
      referredUserId: dbUser.id,
      paymentId: c.paymentId,
      amountCents: c.amountCents,
      tenantId: c.tenantId,
    });
  }

  // Finalize the order — paid, with the final points-adjusted total.
  const totalCents = Math.max(
    0,
    subtotalCents + taxCentsTotal - pointsDiscountCents,
  );
  await db
    .update(orders)
    .set({
      status: "paid",
      paidAt: new Date(),
      pointsRedeemedCents: pointsDiscountCents,
      totalCents,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  // Empty the persisted cart — the open cart becomes this purchase.
  await db
    .update(carts)
    .set({ status: "converted", updatedAt: new Date() })
    .where(and(eq(carts.userId, dbUser.id), eq(carts.status, "open")));

  return {
    success: true,
    orderRef,
    orderId: order.id,
    items: created.length,
    currency,
    pointsRedeemed,
  };
}
