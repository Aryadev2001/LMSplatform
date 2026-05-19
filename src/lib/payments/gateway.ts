import { createHmac, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import Razorpay from "razorpay";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";

/**
 * Per-tenant payment gateway. Each institute connects THEIR OWN Stripe or
 * Razorpay (secret encrypted at rest); a charge for an institute's course
 * goes directly to that institute's account. No platform Connect account
 * is involved — so an order is always single-institute (enforced upstream).
 */

export type TenantGateway =
  | { provider: "razorpay"; keyId: string; keySecret: string }
  | { provider: "stripe"; secretKey: string }
  | { provider: "none" };

/** Decrypts the active gateway's secret. Never returns plaintext to a client. */
export async function resolveTenantGateway(
  tenantId: string,
): Promise<TenantGateway> {
  const [t] = await db
    .select({
      provider: tenants.paymentProvider,
      rzpId: tenants.razorpayKeyId,
      rzpSecret: tenants.razorpayKeySecret,
      stripeSecret: tenants.stripeSecretKey,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!t) return { provider: "none" };

  if (t.provider === "razorpay" && t.rzpId && t.rzpSecret) {
    return {
      provider: "razorpay",
      keyId: t.rzpId,
      keySecret: decryptSecret(t.rzpSecret),
    };
  }
  if (t.provider === "stripe" && t.stripeSecret) {
    return { provider: "stripe", secretKey: decryptSecret(t.stripeSecret) };
  }
  return { provider: "none" };
}

export type ChargeInit =
  | {
      provider: "razorpay";
      keyId: string;
      rzpOrderId: string;
      amountCents: number;
      currency: string;
    }
  | { provider: "stripe"; sessionId: string; url: string };

/**
 * Open a charge on the tenant's gateway for the already-computed net amount
 * (a single line for the whole order — itemisation is cosmetic and the
 * authoritative breakdown lives in our order_items).
 */
export async function createGatewayCharge(
  gw: Exclude<TenantGateway, { provider: "none" }>,
  args: {
    amountCents: number;
    currency: string;
    orderRef: string;
    orderId: string;
    institute: string;
    email: string;
    successUrl: string;
    cancelUrl: string;
  },
): Promise<ChargeInit> {
  if (gw.provider === "razorpay") {
    const rzp = new Razorpay({ key_id: gw.keyId, key_secret: gw.keySecret });
    const order = await rzp.orders.create({
      amount: args.amountCents,
      currency: args.currency,
      receipt: args.orderRef,
      notes: { orderId: args.orderId },
    });
    return {
      provider: "razorpay",
      keyId: gw.keyId,
      rzpOrderId: order.id,
      amountCents: args.amountCents,
      currency: args.currency,
    };
  }

  const stripe = new Stripe(gw.secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: args.currency.toLowerCase(),
          unit_amount: args.amountCents,
          product_data: { name: `${args.institute} — ${args.orderRef}` },
        },
      },
    ],
    client_reference_id: args.orderId,
    customer_email: args.email,
    metadata: { orderId: args.orderId },
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
  });
  return { provider: "stripe", sessionId: session.id, url: session.url ?? "" };
}

/**
 * Server-side proof a payment really happened, using the tenant's own
 * credentials — Razorpay HMAC signature (timing-safe), Stripe session
 * retrieve. Returns the gateway payment id to store on our payment row.
 */
export async function verifyGatewayPayment(
  gw: Exclude<TenantGateway, { provider: "none" }>,
  payload:
    | {
        provider: "razorpay";
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
        expectedRzpOrderId: string;
      }
    | { provider: "stripe"; sessionId: string; orderId: string },
): Promise<{ ok: true; paymentId: string } | { ok: false; error: string }> {
  if (gw.provider === "razorpay" && payload.provider === "razorpay") {
    if (payload.razorpayOrderId !== payload.expectedRzpOrderId) {
      return { ok: false, error: "Order mismatch." };
    }
    const expected = createHmac("sha256", gw.keySecret)
      .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(payload.razorpaySignature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "Signature verification failed." };
    }
    return { ok: true, paymentId: payload.razorpayPaymentId };
  }

  if (gw.provider === "stripe" && payload.provider === "stripe") {
    const stripe = new Stripe(gw.secretKey);
    const s = await stripe.checkout.sessions.retrieve(payload.sessionId);
    if (s.client_reference_id !== payload.orderId) {
      return { ok: false, error: "Order mismatch." };
    }
    if (s.payment_status !== "paid") {
      return { ok: false, error: "Payment not completed." };
    }
    const pi =
      typeof s.payment_intent === "string"
        ? s.payment_intent
        : (s.payment_intent?.id ?? s.id);
    return { ok: true, paymentId: pi };
  }

  return { ok: false, error: "Gateway/payload mismatch." };
}
