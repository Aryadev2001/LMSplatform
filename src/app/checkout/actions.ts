"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  programs,
  orders,
  orderItems,
  paymentIntents,
  users,
  tenants,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { taxRateFor } from "@/lib/tax";
import { computeRedeemable } from "@/lib/referral";
import { fulfillOrderById } from "@/lib/payments/fulfill";
import {
  resolveTenantGateway,
  createGatewayCharge,
  verifyGatewayPayment,
} from "@/lib/payments/gateway";

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
 * Fallback platform commission (basis points) if a tenant row somehow
 * lacks a rate. Real rate is per-tenant (`tenants.platform_fee_bps`,
 * super-admin managed); this is only a defensive default.
 */
const DEFAULT_PLATFORM_FEE_BPS = 1500; // 15%
const clampBps = (n: number | null | undefined) =>
  Math.min(5000, Math.max(0, n ?? DEFAULT_PLATFORM_FEE_BPS));

/**
 * Build the base URL for gateway return links from the *current* request,
 * so a Stripe checkout started on student.<root> returns the buyer to
 * student.<root> (not the apex). Falls back to NEXT_PUBLIC_APP_URL.
 */
async function appBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ??
        (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* headers() unavailable — fall through */
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

interface CheckoutCtx {
  dbUser: { id: string; email: string; fullName: string | null };
  progs: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    tenantId: string;
    platformFeeBps: number | null;
  }[];
  currency: string;
  singleTenant: boolean;
  tenantId: string;
  subtotalCents: number;
  taxRateBps: number;
  taxCentsTotal: number;
  taxByIndex: number[];
  orderRef: string;
  billingCountry: string | null;
}

/**
 * Validate the cart, resolve the buyer + purchasable programs, enforce
 * single-currency, and compute money (tax + per-line allocation). Shared
 * by the mock path and the live gateway path so the numbers can never
 * diverge between "what we show / charge" and "what we record".
 */
async function loadCheckout(
  input: unknown,
  clerkUserId: string,
): Promise<{ ok: true; ctx: CheckoutCtx } | { ok: false; error: string }> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid cart",
    };
  }

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);
  if (!dbUser) return { ok: false, error: "Account not provisioned yet." };

  const rows = await db
    .select({
      id: programs.id,
      name: programs.name,
      priceCents: programs.priceCents,
      currency: programs.currency,
      tenantId: programs.tenantId,
      platformFeeBps: tenants.platformFeeBps,
    })
    .from(programs)
    .leftJoin(tenants, eq(programs.tenantId, tenants.id))
    .where(
      and(
        inArray(programs.id, parsed.data.programIds),
        eq(programs.status, "published"),
      ),
    );

  if (rows.length === 0) {
    return { ok: false, error: "No purchasable items in cart." };
  }
  if (rows.some((p) => !p.tenantId)) {
    return { ok: false, error: "An item is not available for purchase." };
  }
  const progs = rows.map((p) => ({ ...p, tenantId: p.tenantId as string }));

  const currency = progs[0].currency;
  if (progs.some((p) => p.currency !== currency)) {
    return {
      ok: false,
      error:
        "Your cart mixes currencies — please check out one institute at a time.",
    };
  }
  const singleTenant = progs.every((p) => p.tenantId === progs[0].tenantId);

  const subtotalCents = progs.reduce((s, p) => s + p.priceCents, 0);
  const tax = taxRateFor(parsed.data.billingCountry);
  const taxCentsTotal = Math.round(subtotalCents * tax.rate);

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

  return {
    ok: true,
    ctx: {
      dbUser,
      progs,
      currency,
      singleTenant,
      tenantId: progs[0].tenantId,
      subtotalCents,
      taxRateBps: tax.rateBps,
      taxCentsTotal,
      taxByIndex,
      orderRef,
      billingCountry,
    },
  };
}

/**
 * Create the pending order + its lines (enrollment/payment are filled in by
 * fulfilment once paid). Returns the new order id.
 */
async function insertPendingOrder(
  ctx: CheckoutCtx,
  provider: string,
): Promise<string> {
  const [order] = await db
    .insert(orders)
    .values({
      orderRef: ctx.orderRef,
      userId: ctx.dbUser.id,
      status: "pending",
      billingName: ctx.dbUser.fullName ?? ctx.dbUser.email,
      billingEmail: ctx.dbUser.email,
      billingCountry: ctx.billingCountry,
      currency: ctx.currency,
      subtotalCents: ctx.subtotalCents,
      taxCents: ctx.taxCentsTotal,
      taxRateBps: ctx.taxRateBps,
      totalCents: ctx.subtotalCents + ctx.taxCentsTotal,
      paymentProvider: provider,
    })
    .returning({ id: orders.id });

  for (let i = 0; i < ctx.progs.length; i++) {
    const p = ctx.progs[i];
    const lineTax = ctx.taxByIndex[i];
    const platformFeeCents = Math.round(
      (p.priceCents * clampBps(p.platformFeeBps)) / 10000,
    );
    await db.insert(orderItems).values({
      orderId: order.id,
      programId: p.id,
      tenantId: p.tenantId,
      title: p.name,
      unitPriceCents: p.priceCents,
      currency: p.currency,
      quantity: 1,
      taxCents: lineTax,
      lineTotalCents: p.priceCents,
      platformFeeCents,
      partnerPayoutCents: p.priceCents - platformFeeCents,
    });
  }
  return order.id;
}

/**
 * MOCK / fallback order placement — used when the institute has not
 * connected a live gateway. Creates the order and grants access
 * immediately via the shared fulfilment path.
 */
export async function placeOrder(input: unknown): Promise<Result> {
  const me = await getCurrentUser();
  if (!me) return { success: false, error: "Please sign in to check out." };

  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid cart" };
  }

  const loaded = await loadCheckout(input, me.userId);
  if (!loaded.ok) return { success: false, error: loaded.error };
  const ctx = loaded.ctx;

  // Mock/test grant path (no real charge). A priced order may use it ONLY
  // while the institute has not connected a live gateway — in that pre-gateway
  // phase the platform grants access in test mode so institutes can sell
  // immediately. The moment a gateway IS connected, a priced order must go
  // through it (beginCheckout opens the real charge), so we refuse the mock
  // grant here to prevent bypassing a live gateway.
  if (ctx.subtotalCents > 0 && ctx.singleTenant) {
    const gw = await resolveTenantGateway(ctx.tenantId);
    if (gw.provider !== "none") {
      return {
        success: false,
        error: "Please complete payment to enroll in this course.",
      };
    }
  }

  const orderId = await insertPendingOrder(ctx, "test");
  const f = await fulfillOrderById(orderId, {
    provider: "test",
    paymentLabel: "Test mode",
    providerPaymentId: null,
    redeemPoints: parsed.data.redeemPoints,
  });
  if (!f.ok) return { success: false, error: f.error };

  return {
    success: true,
    orderRef: f.orderRef,
    orderId,
    items: f.items,
    currency: ctx.currency,
    pointsRedeemed: f.pointsRedeemed,
  };
}

type BeginResult =
  | { ok: true; provider: "mock" }
  | {
      ok: true;
      provider: "razorpay";
      orderId: string;
      orderRef: string;
      keyId: string;
      rzpOrderId: string;
      amountCents: number;
      currency: string;
      institute: string;
      email: string;
    }
  | { ok: true; provider: "stripe"; checkoutUrl: string }
  | { ok: false; error: string };

/**
 * Live checkout — single institute only (per-tenant gateways cannot be
 * combined). Creates the pending order, computes the net charge (points
 * applied up front so the gateway amount equals the net owed), and opens
 * the charge on the institute's own gateway. If the institute has not
 * connected a gateway we tell the client to use the mock path instead.
 */
export async function beginCheckout(input: unknown): Promise<BeginResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Please sign in to check out." };

  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid cart" };

  const loaded = await loadCheckout(input, me.userId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const ctx = loaded.ctx;

  if (!ctx.singleTenant) {
    return {
      ok: false,
      error:
        "Live checkout is one institute at a time — your cart has courses from more than one institute.",
    };
  }

  const gw = await resolveTenantGateway(ctx.tenantId);
  if (gw.provider === "none") {
    return { ok: true, provider: "mock" };
  }

  // Net charge = subtotal + tax − points (computed up front so the gateway
  // amount equals the net owed; fulfilment records the ledger).
  let pointsDiscountCents = 0;
  if (parsed.data.redeemPoints) {
    const [u] = await db
      .select({ bal: users.pointsBalance })
      .from(users)
      .where(eq(users.id, ctx.dbUser.id))
      .limit(1);
    const [t] = await db
      .select({ maxPct: tenants.referralRedeemMaxPercent })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);
    pointsDiscountCents = computeRedeemable({
      pointsBalance: u?.bal ?? 0,
      cartCents: ctx.subtotalCents,
      redeemMaxPercent: t?.maxPct ?? 0,
    }).discountCents;
  }
  const chargeCents = Math.max(
    0,
    ctx.subtotalCents + ctx.taxCentsTotal - pointsDiscountCents,
  );

  // Free enrolment (₹0 course, or fully covered by points) — never open a
  // gateway charge for a zero amount (Stripe/Razorpay reject it). Grant via
  // the free/mock fulfilment path. This is what lets institutes publish
  // free courses with no payment setup and still enrol students.
  if (chargeCents <= 0) {
    return { ok: true, provider: "mock" };
  }

  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1);
  const institute = tenant?.name ?? "Institute";

  const orderId = await insertPendingOrder(ctx, gw.provider);

  const base = await appBaseUrl();
  const charge = await createGatewayCharge(gw, {
    amountCents: chargeCents,
    currency: ctx.currency,
    orderRef: ctx.orderRef,
    orderId,
    institute,
    email: ctx.dbUser.email,
    successUrl: `${base}/checkout/success?provider=stripe&order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/checkout?canceled=1`,
  });

  const providerIntentId =
    charge.provider === "razorpay" ? charge.rzpOrderId : charge.sessionId;

  await db.insert(paymentIntents).values({
    orderId,
    tenantId: ctx.tenantId,
    provider: gw.provider,
    providerIntentId,
    amountCents: chargeCents,
    currency: ctx.currency,
    status: "requires_payment",
    rawPayload: { redeemPoints: parsed.data.redeemPoints, chargeCents },
  });

  if (charge.provider === "razorpay") {
    return {
      ok: true,
      provider: "razorpay",
      orderId,
      orderRef: ctx.orderRef,
      keyId: charge.keyId,
      rzpOrderId: charge.rzpOrderId,
      amountCents: charge.amountCents,
      currency: charge.currency,
      institute,
      email: ctx.dbUser.email,
    };
  }
  return { ok: true, provider: "stripe", checkoutUrl: charge.url };
}

const ConfirmSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("razorpay"),
    orderId: z.string().uuid(),
    razorpayOrderId: z.string().min(4).max(120),
    razorpayPaymentId: z.string().min(4).max(120),
    razorpaySignature: z.string().min(8).max(256),
  }),
  z.object({
    provider: z.literal("stripe"),
    orderId: z.string().uuid(),
    sessionId: z.string().min(8).max(256),
  }),
]);

/**
 * Confirm a live payment with server-side proof (Razorpay HMAC / Stripe
 * session retrieve) using the institute's own credentials, then grant
 * access via the shared idempotent fulfilment path.
 */
export async function confirmCheckout(input: unknown): Promise<Result> {
  const me = await getCurrentUser();
  if (!me) return { success: false, error: "Please sign in." };

  const parsed = ConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid confirmation." };
  }
  const d = parsed.data;

  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!dbUser) return { success: false, error: "Account missing." };

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, d.orderId))
    .limit(1);
  if (!order || order.userId !== dbUser.id) {
    return { success: false, error: "Order not found." };
  }

  const [pi] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.orderId, d.orderId))
    .limit(1);
  if (!pi || !pi.tenantId || pi.provider !== d.provider) {
    return { success: false, error: "Payment session not found." };
  }

  const gw = await resolveTenantGateway(pi.tenantId);
  if (gw.provider === "none" || gw.provider !== d.provider) {
    return { success: false, error: "Gateway unavailable." };
  }

  const verified =
    d.provider === "razorpay" && gw.provider === "razorpay"
      ? await verifyGatewayPayment(gw, {
          provider: "razorpay",
          razorpayOrderId: d.razorpayOrderId,
          razorpayPaymentId: d.razorpayPaymentId,
          razorpaySignature: d.razorpaySignature,
          expectedRzpOrderId: pi.providerIntentId ?? "",
        })
      : d.provider === "stripe" && gw.provider === "stripe"
        ? await verifyGatewayPayment(gw, {
            provider: "stripe",
            sessionId: d.sessionId,
            orderId: d.orderId,
          })
        : ({ ok: false, error: "Gateway/payload mismatch." } as const);

  if (!verified.ok) {
    await db
      .update(paymentIntents)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(paymentIntents.id, pi.id));
    return { success: false, error: verified.error };
  }

  await db
    .update(paymentIntents)
    .set({
      status: "succeeded",
      providerIntentId: pi.providerIntentId,
      updatedAt: new Date(),
    })
    .where(eq(paymentIntents.id, pi.id));

  const redeemPoints =
    !!(pi.rawPayload as { redeemPoints?: boolean } | null)?.redeemPoints;

  const f = await fulfillOrderById(d.orderId, {
    provider: d.provider,
    paymentLabel: d.provider === "razorpay" ? "Razorpay" : "Stripe",
    providerPaymentId: verified.paymentId,
    redeemPoints,
  });
  if (!f.ok) return { success: false, error: f.error };

  return {
    success: true,
    orderRef: f.orderRef,
    orderId: d.orderId,
    items: f.items,
    currency: order.currency,
    pointsRedeemed: f.pointsRedeemed,
  };
}
