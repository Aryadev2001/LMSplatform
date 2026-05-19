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
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
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
      items: number;
      currency: string;
      pointsRedeemed: number;
    }
  | { success: false; error: string };

/**
 * MOCK order placement — consistent with the platform's documented
 * mock-payment paradigm (no live Stripe/Razorpay charge yet; that is the
 * dedicated money-path build). For an authenticated learner it turns the
 * cart into real enrollment + payment rows, grants access, and applies the
 * already-verified points-redeem + referral engine.
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

  const currency = progs[0].currency;
  const singleTenant = progs.every((p) => p.tenantId === progs[0].tenantId);

  const orderRef = `EDC-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  // Per item: enrollment → payment (mock succeeded) → access.
  const created: { paymentId: string; tenantId: string; amountCents: number }[] = [];
  for (const p of progs) {
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
        currency: p.currency,
        status: "succeeded",
        description: `${p.name} — ${orderRef}`,
        paymentMethodLabel: "Test mode",
        stripePaymentIntentId: `pi_mock_${Math.random().toString(36).slice(2, 12)}`,
        tenantId: p.tenantId,
      })
      .returning({ id: payments.id });

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

  // Empty the persisted cart — the open cart becomes this purchase.
  await db
    .update(carts)
    .set({ status: "converted", updatedAt: new Date() })
    .where(and(eq(carts.userId, dbUser.id), eq(carts.status, "open")));

  return {
    success: true,
    orderRef,
    items: created.length,
    currency,
    pointsRedeemed,
  };
}
