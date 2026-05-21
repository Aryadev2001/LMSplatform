import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

/**
 * Partner-tier gating + per-feature overrides.
 *
 * - Basic (free) — the default; full publishing toolkit per the registration
 *   spec, but premium-only features (AI Services, Diagnostics, White-label)
 *   are locked.
 * - Standard — same as Basic for now (room for future Standard-only features).
 * - Premium — unlocks AI Services, Diagnostics, and white-label storefront.
 *
 * Super-admin can override on a per-feature, per-tenant basis via
 * tenants.feature_overrides ({ [feature]: true | false }) which beats the
 * tier's default — letting them grant features without bumping the tier,
 * or revoke a feature even from a paid tier.
 *
 * Super-admins themselves bypass all of this — they operate cross-tenant.
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
 * The full feature catalog. Adding a new gated feature is a 3-step change:
 * (1) add it here, (2) call requireFeature(key) on the route, (3) add a
 * checkbox in the super-admin tenant edit form.
 */
export const FEATURES = {
  ai_services: {
    label: "AI Services",
    minTier: "premium" as PartnerTier,
    description: "Sell AI subscriptions to enrolled students.",
  },
  diagnostics: {
    label: "Diagnostics",
    minTier: "premium" as PartnerTier,
    description: "Business X-Ray diagnostics for the tenant's students.",
  },
  white_label: {
    label: "White-label storefront",
    minTier: "premium" as PartnerTier,
    description:
      "Hide the eurodigital.coach platform logo / nav / footer on the public storefront.",
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;

export interface TenantAccess {
  tier: PartnerTier;
  overrides: Partial<Record<FeatureKey, boolean>>;
  hidePlatformLogo: boolean;
}

/**
 * Read the current request's tenant tier + overrides. Cached per request.
 * Falls back to the safest defaults (Basic, no overrides) if anything's
 * missing.
 */
export const getTenantAccess = cache(async (): Promise<TenantAccess> => {
  const me = await getCurrentUser();
  if (!me?.tenantId) {
    return { tier: "basic", overrides: {}, hidePlatformLogo: false };
  }
  const [row] = await db
    .select({
      tier: tenants.tier,
      featureOverrides: tenants.featureOverrides,
      hidePlatformLogo: tenants.hidePlatformLogo,
    })
    .from(tenants)
    .where(eq(tenants.id, me.tenantId))
    .limit(1);
  return {
    tier: (row?.tier ?? "basic") as PartnerTier,
    overrides:
      (row?.featureOverrides ?? {}) as Partial<Record<FeatureKey, boolean>>,
    hidePlatformLogo: !!row?.hidePlatformLogo,
  };
});

/** Backwards-compatible alias — the old call shape still works elsewhere. */
export const getActiveTier = cache(async (): Promise<PartnerTier> => {
  return (await getTenantAccess()).tier;
});

/**
 * Pure decision function: given a tenant's access record + a feature key,
 * is it currently enabled? Explicit overrides win over the tier default.
 */
export function hasFeatureFor(
  access: TenantAccess,
  feature: FeatureKey,
): boolean {
  const explicit = access.overrides[feature];
  if (explicit === true) return true;
  if (explicit === false) return false;
  return tierAtLeast(access.tier, FEATURES[feature].minTier);
}

/**
 * Read-only check from a request server component — does the current tenant
 * have this feature? Super-admins always return true (they're cross-tenant).
 */
export async function hasFeature(feature: FeatureKey): Promise<boolean> {
  const me = await getCurrentUser();
  if (me?.role === "super") return true;
  const access = await getTenantAccess();
  return hasFeatureFor(access, feature);
}

/**
 * Gate an admin route by a single feature key. Replaces the old `requireTier`
 * call shape — the difference is that overrides are honoured. Throws-redirects
 * to /admin/partner?locked=<label>&min=<tier> on insufficient access.
 */
export async function requireFeature(feature: FeatureKey): Promise<void> {
  const me = await getCurrentUser();
  if (me?.role === "super") return;
  const access = await getTenantAccess();
  if (!hasFeatureFor(access, feature)) {
    const f = FEATURES[feature];
    redirect(
      `/admin/partner?locked=${encodeURIComponent(f.label)}&min=${encodeURIComponent(f.minTier)}`,
    );
  }
}

/**
 * Legacy tier gate — kept so any leftover call sites don't break. New code
 * should use `requireFeature` so super-admin overrides apply.
 */
export async function requireTier(
  min: PartnerTier,
  feature: string,
): Promise<void> {
  const me = await getCurrentUser();
  if (me?.role === "super") return;
  const have = await getActiveTier();
  if (!tierAtLeast(have, min)) {
    redirect(
      `/admin/partner?locked=${encodeURIComponent(feature)}&min=${encodeURIComponent(min)}`,
    );
  }
}

/** Per-route minimum tier (sidebar lock UI fallback). */
export const ROUTE_MIN_TIER: Record<string, PartnerTier> = {
  "/admin": "basic",
  "/admin/partner": "basic",
  "/admin/students": "basic",
  "/admin/settings": "basic",
  "/admin/programs": "basic",
  "/admin/enrollments": "basic",
  "/admin/payments": "basic",
  "/admin/ai-services": "premium",
  "/admin/diagnostics": "premium",
};
