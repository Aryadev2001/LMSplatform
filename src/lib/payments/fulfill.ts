import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  orders,
  orderItems,
  enrollments,
  payments,
  students,
  carts,
  users,
  programs,
} from "@/db/schema";
import {
  redeemPointsAtCheckout,
  awardReferralForPurchase,
} from "@/lib/referral";
import { createInvoiceForOrder } from "@/lib/payments/invoice";
import { sendEmail } from "@/lib/email";

/**
 * Grant access for a paid order. THE single fulfilment path — the mock and
 * every live gateway funnel through here so there is exactly one place that
 * creates enrollments/payments and applies points + referral.
 *
 * Idempotent by construction: the very first thing it does is a guarded
 * `pending → paid` transition. Only the caller that wins that transition
 * proceeds to grant; any retry / double webhook / double click sees the
 * order already paid and returns success WITHOUT granting twice. This is
 * the money-correctness keystone (no DB transactions on neon-http).
 */
export async function fulfillOrderById(
  orderId: string,
  opts: {
    provider: string; // "test" | "stripe" | "razorpay"
    paymentLabel: string; // human label stored on the payment
    providerPaymentId?: string | null;
    redeemPoints: boolean;
  },
): Promise<
  | { ok: true; orderRef: string; items: number; pointsRedeemed: number }
  | { ok: false; error: string }
> {
  // Atomically claim fulfilment. If no row comes back the order was not
  // "pending" (already fulfilled, or gone) — treat an already-paid order as
  // success so retries are safe.
  const claimed = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning({ id: orders.id });

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return { ok: false, error: "Order not found." };

  if (claimed.length === 0) {
    if (order.status === "paid") {
      const its = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      return {
        ok: true,
        orderRef: order.orderRef,
        items: its.length,
        pointsRedeemed: 0, // already applied on the original fulfilment
      };
    }
    return { ok: false, error: "Order is not payable." };
  }

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);
  if (!dbUser) return { ok: false, error: "Buyer account missing." };

  // Snapshot whether this is the learner's first paid enrollment BEFORE we
  // create the new rows — checking after would always be false (the new
  // rows would themselves count). Used at the end to send the welcome
  // email exactly once per learner lifetime.
  const priorEnrollments = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(eq(enrollments.userId, dbUser.id))
    .limit(1);
  const isFirstPurchase = priorEnrollments.length === 0;

  const its = await db
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
    .where(eq(orderItems.orderId, orderId));

  const created: {
    paymentId: string;
    tenantId: string;
    amountCents: number;
  }[] = [];

  for (const it of its) {
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

    const piRef =
      opts.provider === "stripe" && opts.providerPaymentId
        ? opts.providerPaymentId
        : `pi_${opts.provider}_${Math.random().toString(36).slice(2, 12)}`;

    const [pay] = await db
      .insert(payments)
      .values({
        enrollmentId: enr.id,
        studentUserId: dbUser.id,
        amountCents: it.unitPriceCents,
        taxCents: it.taxCents,
        currency: it.currency,
        status: "succeeded",
        description: `${it.title} — ${order.orderRef}`,
        paymentMethodLabel: opts.paymentLabel,
        provider: opts.provider,
        stripePaymentIntentId: piRef,
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

    created.push({
      paymentId: pay.id,
      tenantId: it.tenantId,
      amountCents: it.unitPriceCents,
    });
  }

  // Points — single-institute carts only (per-tenant engine), same rule as
  // before. Charged amount was already net of this discount for the live
  // path; here we record the ledger + reduce the first line's payment.
  const singleTenant =
    created.length > 0 &&
    created.every((c) => c.tenantId === created[0].tenantId);
  let pointsRedeemed = 0;
  let pointsDiscountCents = 0;
  if (opts.redeemPoints && singleTenant) {
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

  for (const c of created) {
    await awardReferralForPurchase({
      referredUserId: dbUser.id,
      paymentId: c.paymentId,
      amountCents: c.amountCents,
      tenantId: c.tenantId,
    });
  }

  const totalCents = Math.max(
    0,
    order.subtotalCents + order.taxCents - pointsDiscountCents,
  );
  await db
    .update(orders)
    .set({
      pointsRedeemedCents: pointsDiscountCents,
      totalCents,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await db
    .update(carts)
    .set({ status: "converted", updatedAt: new Date() })
    .where(and(eq(carts.userId, dbUser.id), eq(carts.status, "open")));

  // Receipt — best-effort: a paid order with access granted must never be
  // blocked by an invoice write. Idempotent, so reconcile re-issues if this
  // ever misses.
  try {
    await createInvoiceForOrder(order.id);
  } catch {
    /* non-critical to access; reconcile/replay will re-attempt */
  }

  // Welcome email — only on the learner's FIRST paid enrollment, using the
  // pre-fulfilment snapshot. Best-effort (the seam just logs today; swap to
  // a real provider in src/lib/email.ts).
  if (isFirstPurchase && dbUser.email) {
    try {
      const firstItem = its[0];
      const [course] = firstItem
        ? await db
            .select({ name: programs.name, slug: programs.slug })
            .from(programs)
            .where(eq(programs.id, firstItem.programId))
            .limit(1)
        : [];
      const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
      await sendEmail({
        to: dbUser.email,
        template: "dashboard_unlocked",
        data: {
          learnerName: dbUser.fullName ?? dbUser.email.split("@")[0],
          courseName: course?.name ?? firstItem?.title ?? "your course",
          courseUrl: course?.slug ? `${base}/courses/${course.slug}` : null,
          dashboardUrl: `${base}/student`,
          orderRef: order.orderRef,
        },
      });
    } catch {
      /* email is non-critical; never block access on it */
    }
  }

  return {
    ok: true,
    orderRef: order.orderRef,
    items: created.length,
    pointsRedeemed,
  };
}
