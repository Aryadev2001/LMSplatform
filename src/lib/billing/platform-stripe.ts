import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";

/**
 * The PLATFORM's Stripe account — used for partner-subscription billing
 * (Standard / Premium tier upgrades). Distinct from the per-tenant Stripe
 * gateways in src/lib/payments/gateway.ts, which receive student payments
 * for that tenant's own courses. Never mix the two.
 *
 * Required env vars (test-mode is fine for staging):
 *   STRIPE_PLATFORM_SECRET_KEY      sk_test_… or sk_live_…
 *   STRIPE_PLATFORM_WEBHOOK_SECRET  whsec_…
 *   STRIPE_PRICE_STANDARD           price_…  (Stripe Price id for Standard tier)
 *   STRIPE_PRICE_PREMIUM            price_…  (Stripe Price id for Premium tier)
 *
 * If any are missing the billing UI degrades gracefully — the buttons go
 * disabled with a "Billing not configured yet" hint, and the webhook 503s.
 */

export type UpgradeableTier = "standard" | "premium";

export interface TierDisplay {
  label: string;
  /** USD whole-dollar amount for display only — the actual charged amount
   *  is whatever Stripe's Price object says. */
  monthly: number;
}

export const TIER_DISPLAY: Record<UpgradeableTier, TierDisplay> = {
  standard: { label: "Standard", monthly: 49 },
  premium: { label: "Premium", monthly: 149 },
};

let _stripe: Stripe | null = null;

export function platformStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_PLATFORM_SECRET_KEY &&
      process.env.STRIPE_PRICE_STANDARD &&
      process.env.STRIPE_PRICE_PREMIUM,
  );
}

export function getPlatformStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_PLATFORM_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_PLATFORM_SECRET_KEY is not set — platform billing is not configured.",
    );
  }
  _stripe = new Stripe(key);
  return _stripe;
}

export function priceIdFor(tier: UpgradeableTier): string {
  const id =
    tier === "standard"
      ? process.env.STRIPE_PRICE_STANDARD
      : process.env.STRIPE_PRICE_PREMIUM;
  if (!id) {
    throw new Error(
      `STRIPE_PRICE_${tier.toUpperCase()} is not set — cannot start checkout.`,
    );
  }
  return id;
}

/**
 * Ensure the tenant has a Stripe customer on the platform account. Creates
 * one if missing and persists the id. Idempotent.
 */
export async function ensurePlatformCustomer(
  tenantId: string,
  email: string,
  name: string | null,
): Promise<string> {
  const [row] = await db
    .select({ customerId: tenants.platformStripeCustomerId })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (row?.customerId) return row.customerId;

  const stripe = getPlatformStripe();
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { tenantId },
  });

  await db
    .update(tenants)
    .set({ platformStripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  return customer.id;
}
