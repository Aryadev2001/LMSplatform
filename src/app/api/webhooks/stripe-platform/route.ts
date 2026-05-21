import { NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { getPlatformStripe, platformStripeConfigured } from "@/lib/billing/platform-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook for the PLATFORM's Stripe account — receives lifecycle events for
 * partner tier subscriptions. Distinct from /api/webhooks/stripe/<tenantId>
 * (which handles student-payment events on the tenant's own Stripe account).
 *
 * Register this URL once in the Stripe dashboard:
 *   https://eurodigital.coach/api/webhooks/stripe-platform
 * and store the signing secret in env STRIPE_PLATFORM_WEBHOOK_SECRET.
 *
 * Events handled:
 *   - customer.subscription.created  → upgrade tier, mark active
 *   - customer.subscription.updated  → keep tier in sync (price changes,
 *     status flips like past_due / canceled scheduled)
 *   - customer.subscription.deleted  → downgrade to basic, mark canceled
 *
 * We never trust the request body before signature verification. The tier
 * to set comes from the subscription's metadata (set during checkout) or,
 * as a fallback, the matching priceId. tenantId always comes from
 * subscription.metadata so we can't be tricked into mutating the wrong row.
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  const whsec = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
  if (!platformStripeConfigured() || !whsec) {
    return NextResponse.json(
      { error: "platform billing not configured" },
      { status: 503 },
    );
  }
  if (!sig) {
    return NextResponse.json({ error: "missing stripe-signature" }, { status: 400 });
  }

  const stripe = getPlatformStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (e) {
    console.error("[stripe-platform] bad signature:", e);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await markCanceled(sub);
        break;
      }
      default:
        // No-op: we accept the event to avoid Stripe retries.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error(`[stripe-platform] ${event.type} handler failed:`, e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "handler failed" },
      { status: 500 },
    );
  }
}

function tierFromSubscription(sub: Stripe.Subscription): "standard" | "premium" | null {
  // 1. Trust metadata first — we set it in checkout/checkout.ts.
  const metaTier = sub.metadata?.tier;
  if (metaTier === "standard" || metaTier === "premium") return metaTier;

  // 2. Fallback: derive from priceId so a manually-created subscription
  //    (or a portal-driven swap) still lands the right tier.
  const priceIds = sub.items.data.map((i) => i.price.id);
  if (priceIds.includes(process.env.STRIPE_PRICE_PREMIUM ?? "")) return "premium";
  if (priceIds.includes(process.env.STRIPE_PRICE_STANDARD ?? "")) return "standard";

  return null;
}

function billingStatusFromStripe(
  s: Stripe.Subscription.Status,
): "none" | "active" | "trialing" | "past_due" | "canceled" {
  switch (s) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
      return "none";
    default:
      return "none";
  }
}

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const tenantId = sub.metadata?.tenantId;
  if (!tenantId) {
    console.warn(`[stripe-platform] subscription ${sub.id} has no tenantId — skipping`);
    return;
  }

  const tier = tierFromSubscription(sub);
  if (!tier) {
    console.warn(`[stripe-platform] subscription ${sub.id} has no recognised tier — skipping`);
    return;
  }

  const status = billingStatusFromStripe(sub.status);

  // Newer Stripe Node SDKs moved `current_period_end` off Subscription onto
  // the individual SubscriptionItem. The numeric timestamp is still in the
  // payload — we read it via cast so a future SDK shift doesn't break the
  // webhook silently.
  type WithPeriod = { current_period_end?: number };
  const item = sub.items.data[0] as Stripe.SubscriptionItem & WithPeriod;
  const subWithLegacyField = sub as Stripe.Subscription & WithPeriod;
  const cpe =
    typeof subWithLegacyField.current_period_end === "number"
      ? subWithLegacyField.current_period_end
      : typeof item?.current_period_end === "number"
        ? item.current_period_end
        : null;
  const periodEnd = cpe ? new Date(cpe * 1000) : null;

  // If the subscription is past_due or canceled we keep the tier so they can
  // see what they had — billing_status carries the access decision. (The
  // canceled deletion event is the one that actually downgrades.)
  await db
    .update(tenants)
    .set({
      tier,
      billingStatus: status,
      platformStripeSubscriptionId: sub.id,
      platformCurrentPeriodEnd: periodEnd,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
}

async function markCanceled(sub: Stripe.Subscription): Promise<void> {
  const tenantId = sub.metadata?.tenantId;
  if (!tenantId) return;

  await db
    .update(tenants)
    .set({
      tier: "basic",
      billingStatus: "canceled",
      platformStripeSubscriptionId: null,
      platformCurrentPeriodEnd: null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
}
