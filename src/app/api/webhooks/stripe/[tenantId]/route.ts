import { NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveTenantGateway, getTenantWebhookSecret } from "@/lib/payments/gateway";
import {
  recordWebhook,
  markWebhookProcessed,
  processOrderPayment,
} from "@/lib/payments/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe webhook, scoped to one tenant via the URL. The tenant pastes
// `<app>/api/webhooks/stripe/<tenantId>` into THEIR Stripe dashboard and
// stores the endpoint signing secret in Settings → Payment gateway.
// Signature is verified with that tenant's own secret before any action.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  const gw = await resolveTenantGateway(tenantId);
  const whsec = await getTenantWebhookSecret(tenantId, "stripe");
  if (gw.provider !== "stripe" || !sig || !whsec) {
    // Not configured for Stripe webhooks — refuse without side effects.
    return NextResponse.json({ error: "not configured" }, { status: 400 });
  }

  const stripe = new Stripe(gw.secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch {
    // Bad signature → never trust the payload.
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let orderId: string | null = null;
  let paymentId: string | null = null;
  let shouldFulfill = false;
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const s = event.data.object as Stripe.Checkout.Session;
    orderId = s.client_reference_id ?? null;
    paymentId =
      typeof s.payment_intent === "string"
        ? s.payment_intent
        : (s.payment_intent?.id ?? s.id);
    shouldFulfill = s.payment_status === "paid";
  }

  const rec = await recordWebhook({
    provider: "stripe",
    eventId: event.id,
    eventType: event.type,
    orderId,
    payload: event,
    signatureValid: true,
  });
  // Replay / retry of an event we already stored → ack without redoing work.
  if (!rec.fresh) return NextResponse.json({ received: true });

  if (shouldFulfill && orderId) {
    await processOrderPayment({
      orderId,
      provider: "stripe",
      providerPaymentId: paymentId,
    });
  }
  if (rec.id) await markWebhookProcessed(rec.id);

  return NextResponse.json({ received: true });
}
