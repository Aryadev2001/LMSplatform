import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentWebhooks, paymentIntents } from "@/db/schema";
import { fulfillOrderById } from "@/lib/payments/fulfill";

/**
 * Record an inbound webhook, deduped on (provider, event_id). Gateways
 * retry aggressively; the unique index makes a replay a no-op insert, so
 * `fresh:false` tells the caller to ack 200 WITHOUT reprocessing. Always
 * called AFTER signature verification — we never store/act on an unverified
 * payload's side effects (signatureValid is recorded either way for audit).
 */
export async function recordWebhook(args: {
  provider: string;
  eventId: string;
  eventType: string | null;
  orderId?: string | null;
  paymentIntentId?: string | null;
  payload: unknown;
  signatureValid: boolean;
}): Promise<{ fresh: boolean; id: string | null }> {
  const [row] = await db
    .insert(paymentWebhooks)
    .values({
      provider: args.provider,
      eventId: args.eventId,
      eventType: args.eventType,
      orderId: args.orderId ?? null,
      paymentIntentId: args.paymentIntentId ?? null,
      payload: args.payload as object,
      signatureValid: args.signatureValid,
    })
    .onConflictDoNothing({
      target: [paymentWebhooks.provider, paymentWebhooks.eventId],
    })
    .returning({ id: paymentWebhooks.id });
  return { fresh: !!row, id: row?.id ?? null };
}

export async function markWebhookProcessed(id: string): Promise<void> {
  await db
    .update(paymentWebhooks)
    .set({ processed: true, processedAt: new Date() })
    .where(eq(paymentWebhooks.id, id));
}

/**
 * Grant access for an order off the back of a verified webhook. Reuses the
 * single idempotent fulfilment path — if the browser return-path already
 * fulfilled this order, the guarded pending→paid claim makes this a safe
 * no-op (no double grant).
 */
export async function processOrderPayment(args: {
  orderId: string;
  provider: "stripe" | "razorpay";
  providerPaymentId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const [pi] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.orderId, args.orderId))
    .limit(1);

  const redeemPoints =
    !!(pi?.rawPayload as { redeemPoints?: boolean } | null)?.redeemPoints;

  if (pi) {
    await db
      .update(paymentIntents)
      .set({ status: "succeeded", updatedAt: new Date() })
      .where(eq(paymentIntents.id, pi.id));
  }

  const f = await fulfillOrderById(args.orderId, {
    provider: args.provider,
    paymentLabel: args.provider === "stripe" ? "Stripe" : "Razorpay",
    providerPaymentId: args.providerPaymentId,
    redeemPoints,
  });
  return f.ok ? { ok: true } : { ok: false, error: f.error };
}
