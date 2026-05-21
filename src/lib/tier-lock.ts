import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

/**
 * Partner-tier gating.
 *
 * Basic (free) — the default. Only Overview / Partner Setup / Students /
 * Settings are visible; everything else redirects to /admin/partner with
 * an upgrade nudge.
 *
 * Standard — unlocks Courses, Enrollments, Payments (the core publish
 * & earn loop).
 *
 * Premium — unlocks AI Services and Diagnostics on top.
 *
 * Super-admins bypass everything (they're not bound by a tenant tier).
 */

export type PartnerTier = "basic" | "standard" | "premium";

const TIER_ORDER: Record<PartnerTier, number> = {
  basic: 0,
  standard: 1,
  premium: 2,
};

export const TIER_LABEL: Record<PartnerTier, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

export function tierAtLeast(have: PartnerTier, min: PartnerTier): boolean {
  return TIER_ORDER[have] >= TIER_ORDER[min];
}

/**
 * Resolve the active tenant's tier. Request-cached. Falls back to 'basic'
 * if no tenant/row (safest default — locked).
 */
export const getActiveTier = cache(async (): Promise<PartnerTier> => {
  const me = await getCurrentUser();
  if (!me?.tenantId) return "basic";
  const [row] = await db
    .select({ tier: tenants.tier })
    .from(tenants)
    .where(eq(tenants.id, me.tenantId))
    .limit(1);
  return (row?.tier ?? "basic") as PartnerTier;
});

/**
 * Gate an admin route by minimum required tier. Super-admins bypass.
 * Throws-redirects to /admin/partner?locked=<feature>&min=<tier> for the
 * upgrade-nudge UI.
 */
export async function requireTier(
  min: PartnerTier,
  feature: string,
): Promise<void> {
  const me = await getCurrentUser();
  // Super-admins are not bound by tier (they operate cross-tenant).
  if (me?.role === "super") return;
  const have = await getActiveTier();
  if (!tierAtLeast(have, min)) {
    redirect(
      `/admin/partner?locked=${encodeURIComponent(feature)}&min=${encodeURIComponent(min)}`,
    );
  }
}

/** Per-route minimum tier (matches NAV_ITEMS keys, for the sidebar lock UI). */
export const ROUTE_MIN_TIER: Record<string, PartnerTier> = {
  "/admin": "basic",
  "/admin/partner": "basic",
  "/admin/students": "basic",
  "/admin/settings": "basic",
  "/admin/programs": "standard",
  "/admin/enrollments": "standard",
  "/admin/payments": "standard",
  "/admin/ai-services": "premium",
  "/admin/diagnostics": "premium",
};
