import Stripe from "stripe";
import Razorpay from "razorpay";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { programs, tenants } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";

/**
 * Mirror a tenant's plan (a `programs` row) into the tenant's OWN connected
 * payment gateway, using their decrypted secret:
 *  - Stripe: create a Product + a Price (recurring monthly if subscription).
 *  - Razorpay: subscription → Plan; one-time → Item.
 *
 * Persists the returned IDs + last sync status on the program. Never throws
 * into the caller — returns { ok, error? } so a gateway outage can't break
 * plan management; the failure is stored + shown for retry.
 *
 * The caller must have already authorized the tenant↔program ownership.
 */
export async function syncPlanToGateway(
  tenantId: string,
  programId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [program] = await db
    .select()
    .from(programs)
    .where(eq(programs.id, programId))
    .limit(1);
  if (!program || program.tenantId !== tenantId) {
    return { ok: false, error: "Plan not found in your workspace." };
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) return { ok: false, error: "Tenant not found." };

  const provider = tenant.paymentProvider;
  if (provider !== "stripe" && provider !== "razorpay") {
    return {
      ok: false,
      error: "Connect a payment gateway first (Settings → Payment gateway).",
    };
  }

  const isSub = program.type === "subscription";

  try {
    if (provider === "stripe") {
      if (!tenant.stripeSecretKey) {
        return { ok: false, error: "Stripe secret not set." };
      }
      const stripe = new Stripe(decryptSecret(tenant.stripeSecretKey));
      const product = await stripe.products.create({
        name: program.name,
        ...(program.tagline ? { description: program.tagline } : {}),
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: program.priceCents,
        currency: program.currency.toLowerCase(),
        ...(isSub ? { recurring: { interval: "month" as const } } : {}),
      });
      await db
        .update(programs)
        .set({
          stripeProductId: product.id,
          stripePriceId: price.id,
          gatewaySyncedAt: new Date(),
          gatewaySyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(programs.id, programId));
      return { ok: true };
    }

    // Razorpay
    if (!tenant.razorpayKeyId || !tenant.razorpayKeySecret) {
      return { ok: false, error: "Razorpay keys not set." };
    }
    const rzp = new Razorpay({
      key_id: tenant.razorpayKeyId,
      key_secret: decryptSecret(tenant.razorpayKeySecret),
    });

    let externalId: string;
    if (isSub) {
      const plan = await rzp.plans.create({
        period: "monthly",
        interval: 1,
        item: {
          name: program.name,
          amount: program.priceCents,
          currency: program.currency,
          ...(program.tagline ? { description: program.tagline } : {}),
        },
      });
      externalId = plan.id;
    } else {
      const item = await rzp.items.create({
        name: program.name,
        amount: program.priceCents,
        currency: program.currency,
        ...(program.tagline ? { description: program.tagline } : {}),
      });
      externalId = item.id;
    }
    await db
      .update(programs)
      .set({
        razorpayPlanId: externalId,
        gatewaySyncedAt: new Date(),
        gatewaySyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(programs.id, programId));
    return { ok: true };
  } catch (e) {
    const error =
      e instanceof Error ? e.message : "Gateway rejected the plan.";
    await db
      .update(programs)
      .set({ gatewaySyncError: error, updatedAt: new Date() })
      .where(eq(programs.id, programId));
    return { ok: false, error };
  }
}
