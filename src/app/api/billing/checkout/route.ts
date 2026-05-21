import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { tenants, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  ensurePlatformCustomer,
  getPlatformStripe,
  platformStripeConfigured,
  priceIdFor,
  type UpgradeableTier,
} from "@/lib/billing/platform-stripe";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  tier: z.enum(["standard", "premium"]),
});

function appUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  // Fallback — derive from the request's origin so previews still work.
  return new URL(req.url).origin;
}

/**
 * Creates a Stripe Checkout session (mode: subscription) for a tier upgrade.
 *
 * Auth: caller MUST be a tenant admin — we use their session's tenantId so
 * a malicious client can't upgrade someone else's tenant. The tenant's
 * platform Stripe customer is created on first checkout and stored on the
 * tenant row, so all future invoices group under the same customer.
 *
 * The session metadata carries { tenantId, tier } — the webhook reads those
 * to find which tenant to upgrade when the subscription is created.
 */
export async function POST(req: Request) {
  if (!platformStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Platform billing is not configured yet (STRIPE_PLATFORM_SECRET_KEY / STRIPE_PRICE_STANDARD / STRIPE_PRICE_PREMIUM missing).",
      },
      { status: 503 },
    );
  }

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (me.role !== "admin" || !me.tenantId) {
    return NextResponse.json(
      { error: "Only tenant admins can upgrade their plan." },
      { status: 403 },
    );
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Invalid request body — expected { tier: 'standard' | 'premium' }",
      },
      { status: 400 },
    );
  }
  const tier: UpgradeableTier = parsed.tier;

  // Fetch tenant + admin info we need for Stripe customer creation. Email
  // comes from the admin's user row so customer emails are real.
  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      tier: tenants.tier,
    })
    .from(tenants)
    .where(eq(tenants.id, me.tenantId))
    .limit(1);
  if (!tenant) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const [u] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  const email = u?.email ?? me.email ?? "owner@unknown.example";

  let customerId: string;
  try {
    customerId = await ensurePlatformCustomer(tenant.id, email, tenant.name);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Could not create customer",
      },
      { status: 500 },
    );
  }

  const stripe = getPlatformStripe();
  const base = appUrl(req);
  let priceId: string;
  try {
    priceId = priceIdFor(tier);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Price not configured" },
      { status: 503 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/admin/partner/billing?upgraded=${tier}`,
      cancel_url: `${base}/admin/partner/billing?canceled=1`,
      allow_promotion_codes: true,
      // Carry tenantId + tier so the webhook can authoritatively flip the
      // tier when the subscription is confirmed. The session itself doesn't
      // change tier — we wait for the webhook so cancelled/uncompleted
      // checkouts don't leave a tenant prematurely upgraded.
      metadata: { tenantId: tenant.id, tier },
      subscription_data: {
        metadata: { tenantId: tenant.id, tier },
      },
      client_reference_id: tenant.id,
    });
    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a session URL" },
        { status: 502 },
      );
    }
    await recordAudit({
      action: "platform.checkout.start",
      targetType: "tenant",
      targetId: tenant.id,
      metadata: { tier, sessionId: session.id, fromTier: tenant.tier },
    });
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Stripe rejected the checkout: ${e.message}`
            : "Stripe rejected the checkout",
      },
      { status: 502 },
    );
  }
}
