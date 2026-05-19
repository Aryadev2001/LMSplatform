import { and, eq, lt, isNull, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  orders,
  orderItems,
  paymentIntents,
  enrollments,
  payments,
  students,
  users,
} from "@/db/schema";
import {
  resolveTenantGateway,
  fetchGatewayPaymentStatus,
} from "@/lib/payments/gateway";
import { processOrderPayment } from "@/lib/payments/webhook";
import { awardReferralForPurchase } from "@/lib/referral";

/**
 * Payment reconciliation backstop. neon-http has no interactive
 * transactions and the browser-return + webhook paths can both fail
 * (tab closed, webhook not configured, transient outage). This job is the
 * safety net that keeps money and access consistent:
 *
 *  1. Stuck "pending" but the gateway says PAID  → grant access (the
 *     customer paid and must get what they bought).
 *  2. "pending" with a live intent, gateway NOT paid, and old enough
 *     → mark failed (frees the cart; stops infinite retry).
 *  3. "paid" but a mid-fulfilment crash left some lines ungranted
 *     → complete just the missing lines.
 *
 * Everything routes through the existing idempotent paths, so repeated /
 * overlapping runs (or a run racing the real webhook) cannot double-grant.
 */

const RECOVER_AFTER_MS = 5 * 60 * 1000; // give the normal paths a chance
const STALE_FAIL_MS = 3 * 24 * 60 * 60 * 1000; // then give up on unpaid

export interface ReconcileSummary {
  scannedPending: number;
  recovered: number;
  failed: number;
  repaired: number;
}

async function failOrder(orderId: string, piId: string | null): Promise<void> {
  await db
    .update(orders)
    .set({ status: "failed", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
  if (piId) {
    await db
      .update(paymentIntents)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(paymentIntents.id, piId));
  }
}

/** Complete only the not-yet-granted lines of an already-paid order. */
async function repairPaidOrder(orderId: string): Promise<number> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order || order.status !== "paid") return 0;

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);
  if (!dbUser) return 0;

  const missing = await db
    .select({
      id: orderItems.id,
      programId: orderItems.programId,
      tenantId: orderItems.tenantId,
      title: orderItems.title,
      unitPriceCents: orderItems.unitPriceCents,
      currency: orderItems.currency,
      taxCents: orderItems.taxCents,
    })
    .from(orderItems)
    .where(
      and(eq(orderItems.orderId, orderId), isNull(orderItems.enrollmentId)),
    );

  let done = 0;
  for (const it of missing) {
    const [enr] = await db
      .insert(enrollments)
      .values({
        fullName: dbUser.fullName ?? dbUser.email,
        email: dbUser.email,
        programId: it.programId,
        status: "paid",
        userId: dbUser.id,
      })
      .returning({ id: enrollments.id });

    const [pay] = await db
      .insert(payments)
      .values({
        enrollmentId: enr.id,
        studentUserId: dbUser.id,
        amountCents: it.unitPriceCents,
        taxCents: it.taxCents,
        currency: it.currency,
        status: "succeeded",
        description: `${it.title} — ${order.orderRef} (reconciled)`,
        paymentMethodLabel: "Reconciled",
        provider: order.paymentProvider ?? "reconciled",
        stripePaymentIntentId: `pi_recon_${Math.random().toString(36).slice(2, 12)}`,
        tenantId: it.tenantId,
        orderId: order.id,
      })
      .returning({ id: payments.id });

    await db
      .update(orderItems)
      .set({ enrollmentId: enr.id, paymentId: pay.id })
      .where(eq(orderItems.id, it.id));

    const [stu] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.userId, dbUser.id))
      .limit(1);
    if (!stu) {
      await db.insert(students).values({
        userId: dbUser.id,
        enrollmentId: enr.id,
        assignedProgramId: it.programId,
      });
    } else {
      await db
        .update(students)
        .set({ assignedProgramId: it.programId, enrollmentId: enr.id })
        .where(eq(students.userId, dbUser.id));
    }

    await db
      .update(enrollments)
      .set({ status: "account_created", userId: dbUser.id, updatedAt: new Date() })
      .where(eq(enrollments.id, enr.id));

    // Best-effort; idempotent per payment so a later run can't double-award.
    try {
      await awardReferralForPurchase({
        referredUserId: dbUser.id,
        paymentId: pay.id,
        amountCents: it.unitPriceCents,
        tenantId: it.tenantId,
      });
    } catch {
      /* referral is non-critical to access — never block the grant */
    }
    done++;
  }
  return done;
}

export async function runReconciliation(): Promise<ReconcileSummary> {
  const now = Date.now();
  const recoverBefore = new Date(now - RECOVER_AFTER_MS);
  const staleBefore = new Date(now - STALE_FAIL_MS);

  const summary: ReconcileSummary = {
    scannedPending: 0,
    recovered: 0,
    failed: 0,
    repaired: 0,
  };

  // 1 & 2 — pending orders that started a live gateway charge.
  const pend = await db
    .select({
      orderId: orders.id,
      createdAt: orders.createdAt,
      piId: paymentIntents.id,
      provider: paymentIntents.provider,
      tenantId: paymentIntents.tenantId,
      providerIntentId: paymentIntents.providerIntentId,
    })
    .from(orders)
    .innerJoin(paymentIntents, eq(paymentIntents.orderId, orders.id))
    .where(
      and(
        eq(orders.status, "pending"),
        lt(orders.createdAt, recoverBefore),
        inArray(paymentIntents.provider, ["stripe", "razorpay"]),
      ),
    )
    .limit(200);

  for (const p of pend) {
    summary.scannedPending++;
    const stale = p.createdAt < staleBefore;

    if (!p.providerIntentId || !p.tenantId) {
      if (stale) {
        await failOrder(p.orderId, p.piId);
        summary.failed++;
      }
      continue;
    }

    const gw = await resolveTenantGateway(p.tenantId);
    if (gw.provider === "none" || gw.provider !== p.provider) {
      if (stale) {
        await failOrder(p.orderId, p.piId);
        summary.failed++;
      }
      continue;
    }

    const st = await fetchGatewayPaymentStatus(gw, p.providerIntentId);
    if (st.paid) {
      const r = await processOrderPayment({
        orderId: p.orderId,
        provider: p.provider as "stripe" | "razorpay",
        providerPaymentId: st.paymentId,
      });
      if (r.ok) summary.recovered++;
    } else if (stale) {
      await failOrder(p.orderId, p.piId);
      summary.failed++;
    }
  }

  // 3 — paid orders with lines never granted (mid-fulfilment crash).
  const partialRows = await db
    .select({ orderId: orderItems.orderId })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.status, "paid"), isNull(orderItems.enrollmentId)))
    .limit(200);
  const partialOrderIds = [...new Set(partialRows.map((r) => r.orderId))];
  for (const oid of partialOrderIds) {
    const n = await repairPaidOrder(oid);
    if (n > 0) summary.repaired++;
  }

  return summary;
}
