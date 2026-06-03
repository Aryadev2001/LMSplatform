import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentIntents } from "@/db/schema";
import { getTenantWebhookSecret } from "@/lib/payments/gateway";
import {
  recordWebhook,
  markWebhookProcessed,
  processOrderPayment,
} from "@/lib/payments/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Razorpay webhook, scoped to one tenant via the URL. Signature = HMAC-SHA256
// of the RAW body with the tenant's webhook secret; verified (timing-safe)
// before any action. Our order is resolved from the Razorpay order id we
// stored on payment_intents — robust regardless of notes propagation.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const sig = req.headers.get("x-razorpay-signature");
  const body = await req.text();

  const secret = await getTenantWebhookSecret(tenantId, "razorpay");
  if (!secret || !sig) {
    return NextResponse.json({ error: "not configured" }, { status: 400 });
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let evt: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    evt = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const type = evt.event ?? null;
  const rzpOrderId =
    evt.payload?.payment?.entity?.order_id ??
    evt.payload?.order?.entity?.id ??
    null;
  const rzpPaymentId = evt.payload?.payment?.entity?.id ?? null;
  const eventId =
    req.headers.get("x-razorpay-event-id") ?? rzpPaymentId ?? `${type}:${rzpOrderId}`;

  // Map the Razorpay order back to our order via what we stored at begin.
  let orderId: string | null = null;
  if (rzpOrderId) {
    const [pi] = await db
      .select({ orderId: paymentIntents.orderId })
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.tenantId, tenantId),
          eq(paymentIntents.provider, "razorpay"),
          eq(paymentIntents.providerIntentId, rzpOrderId),
        ),
      )
      .limit(1);
    orderId = pi?.orderId ?? null;
  }

  const rec = await recordWebhook({
    provider: "razorpay",
    eventId,
    eventType: type,
    orderId,
    payload: evt,
    signatureValid: true,
  });
  if (!rec.fresh) return NextResponse.json({ received: true });

  if ((type === "payment.captured" || type === "order.paid") && orderId) {
    await processOrderPayment({
      orderId,
      provider: "razorpay",
      providerPaymentId: rzpPaymentId,
    });
  }
  if (rec.id) await markWebhookProcessed(rec.id);

  return NextResponse.json({ received: true });
}
