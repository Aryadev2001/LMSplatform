import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  getPlatformStripe,
  platformStripeConfigured,
} from "@/lib/billing/platform-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  return new URL(req.url).origin;
}

/**
 * Opens Stripe's Customer Portal so the tenant can cancel, upgrade, swap
 * payment method, or download invoices. The portal must be configured once
 * in the Stripe dashboard (https://dashboard.stripe.com/settings/billing/portal)
 * — without that, Stripe returns "configuration is not set" and we surface
 * a clear error.
 */
export async function POST(req: Request) {
  if (!platformStripeConfigured()) {
    return NextResponse.json(
      { error: "Platform billing is not configured yet." },
      { status: 503 },
    );
  }

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (me.role !== "admin" || !me.tenantId) {
    return NextResponse.json(
      { error: "Only tenant admins can manage their subscription." },
      { status: 403 },
    );
  }

  const [row] = await db
    .select({ customerId: tenants.platformStripeCustomerId })
    .from(tenants)
    .where(eq(tenants.id, me.tenantId))
    .limit(1);
  if (!row?.customerId) {
    return NextResponse.json(
      { error: "No subscription yet — start one via Upgrade first." },
      { status: 400 },
    );
  }

  const stripe = getPlatformStripe();
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: row.customerId,
      return_url: `${appUrl(req)}/admin/partner/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Stripe portal error: ${e.message}`
            : "Stripe portal error",
      },
      { status: 502 },
    );
  }
}
