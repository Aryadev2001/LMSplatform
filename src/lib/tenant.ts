import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

/**
 * Tenant resolution.
 *
 * Architecture note (deviates from the literal spec, intentionally):
 * the brief said "inject tenantId via request headers". This repo's auth layer
 * deliberately keeps the DB out of `proxy.ts` (middleware) — role checks are
 * DB-backed but run in a cached server helper, not middleware. We mirror that:
 * `proxy.ts` does pure host string-parsing and injects the host CONTEXT
 * (slug/domain) as headers; the DB lookup happens here in a request-cached
 * helper. Same end result, fast middleware, one consistent pattern.
 */

export const TENANT_SLUG_HEADER = "x-tenant-slug";
export const TENANT_DOMAIN_HEADER = "x-tenant-domain";

/** Subdomains that never map to a tenant (platform-reserved). Per spec. */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "super",
  "edt",
  "mail",
  "support",
  // Portal subdomains — never a tenant storefront slug.
  "partner",
  "student",
]);

/**
 * Which product portal a host points at. `partner.<root>` → the tenant
 * dashboard, `student.<root>` → the student dashboard, `admin.<root>` →
 * the super-admin console, anything else (apex / institute subdomain /
 * local) → null (the public LMS). Pure string parse — safe for middleware.
 */
export function portalForHost(
  hostHeader: string | null | undefined,
): "partner" | "student" | "super" | null {
  if (!hostHeader) return null;
  const host = hostHeader.toLowerCase().split(":")[0].trim();
  const root = getRootDomain();
  if (!root) return null;
  if (host === `partner.${root}`) return "partner";
  if (host === `student.${root}`) return "student";
  if (host === `admin.${root}`) return "super";
  return null;
}

/** The original/primary tenant — existing EDT data lives here (zero-regression). */
export const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? "edt";

/** e.g. "edt.ae". Unset in local/preview → everything resolves to the default tenant. */
export function getRootDomain(): string | null {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase().trim() || null;
}

export type ParsedHost =
  | { kind: "apex" } // root domain / www / reserved subdomain → default tenant
  | { kind: "local" } // localhost / *.vercel.app / preview → default tenant
  | { kind: "subdomain"; slug: string } // slug.<root>
  | { kind: "custom"; domain: string }; // a tenant's own custom domain

/**
 * Pure host → tenant-context classifier. No DB, no I/O — safe for middleware.
 * `hostHeader` is the raw `Host` header (may include `:port`).
 */
export function parseTenantHost(hostHeader: string | null | undefined): ParsedHost {
  if (!hostHeader) return { kind: "local" };

  const host = hostHeader.toLowerCase().split(":")[0].trim();

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".vercel.app")
  ) {
    return { kind: "local" };
  }

  const root = getRootDomain();

  if (root) {
    if (host === root || host === `www.${root}`) return { kind: "apex" };

    if (host.endsWith(`.${root}`)) {
      const label = host.slice(0, host.length - root.length - 1);
      // Take the left-most label for nested hosts (e.g. a.b.edt.ae → "a").
      const slug = label.split(".")[0];
      if (!slug || RESERVED_SUBDOMAINS.has(slug)) return { kind: "apex" };
      return { kind: "subdomain", slug };
    }
  }

  // Not under the root domain and not local → a tenant's own custom domain.
  return { kind: "custom", domain: host };
}

export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  heroTagline: string | null;
  customDomain: string | null;
  customDomainStatus: "NONE" | "REQUESTED" | "CONFIGURED";
  status: "ACTIVE" | "SUSPENDED" | "TRIAL" | "CHURNED";
  referralEnabled: boolean;
  referralPointsPercent: number;
  referralRedeemMaxPercent: number;
}

const TENANT_COLUMNS = {
  id: tenants.id,
  slug: tenants.slug,
  name: tenants.name,
  logoUrl: tenants.logoUrl,
  brandPrimaryColor: tenants.brandPrimaryColor,
  brandSecondaryColor: tenants.brandSecondaryColor,
  heroTagline: tenants.heroTagline,
  customDomain: tenants.customDomain,
  customDomainStatus: tenants.customDomainStatus,
  status: tenants.status,
  referralEnabled: tenants.referralEnabled,
  referralPointsPercent: tenants.referralPointsPercent,
  referralRedeemMaxPercent: tenants.referralRedeemMaxPercent,
} as const;

const getDefaultTenant = cache(async (): Promise<ResolvedTenant | null> => {
  const [row] = await db
    .select(TENANT_COLUMNS)
    .from(tenants)
    .where(eq(tenants.slug, DEFAULT_TENANT_SLUG))
    .limit(1);
  return row ?? null;
});

/**
 * Resolve the tenant for the *current request's host*. Falls back to the
 * default tenant so existing single-tenant URLs (localhost, apex, preview)
 * keep working unchanged. Request-cached.
 */
export const getTenantFromRequest = cache(async (): Promise<ResolvedTenant | null> => {
  const h = await headers();
  const slug = h.get(TENANT_SLUG_HEADER)?.trim() || null;
  const domain = h.get(TENANT_DOMAIN_HEADER)?.trim() || null;

  if (slug) {
    const [row] = await db
      .select(TENANT_COLUMNS)
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (row) return row;
  }

  if (domain) {
    const [row] = await db
      .select(TENANT_COLUMNS)
      .from(tenants)
      .where(eq(tenants.customDomain, domain))
      .limit(1);
    // Only honor a custom domain the super-admin has marked configured.
    if (row && row.customDomainStatus === "CONFIGURED") return row;
  }

  return getDefaultTenant();
});

/**
 * The tenant whose data the current viewer is allowed to act within.
 *
 * - Authenticated tenant users: their own `user.tenantId` is the trust
 *   boundary (URL/host tampering can't widen it — acceptance criterion #5).
 * - Super users (tenantId = null): they operate cross-tenant, so the active
 *   tenant is whatever host they're viewing.
 * - Anonymous (public pages): the host tenant.
 */
export const getActiveTenant = cache(async (): Promise<ResolvedTenant | null> => {
  const [hostTenant, user] = await Promise.all([
    getTenantFromRequest(),
    getCurrentUser(),
  ]);

  if (!user || user.role === "super" || !user.tenantId) return hostTenant;

  if (hostTenant && hostTenant.id === user.tenantId) return hostTenant;

  // User belongs to a different tenant than the host → trust the user's tenant.
  const [own] = await db
    .select(TENANT_COLUMNS)
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);
  return own ?? hostTenant;
});

/** Throw-if-missing variant for tenant-scoped server code. */
export async function requireTenant(): Promise<ResolvedTenant> {
  const t = await getActiveTenant();
  if (!t) throw new Error("No tenant resolved for this request");
  return t;
}

/**
 * The tenantId a dashboard viewer is hard-locked to (spec invariant #12 — the
 * trust boundary). Every admin/student query MUST filter by this. It comes
 * from the authenticated user's own row, never from the host/URL, so tampering
 * cannot widen scope (acceptance #5/#6). Super users have no tenant and must
 * use /super-admin — they're redirected out of tenant dashboards.
 */
export async function requireTenantId(): Promise<string> {
  const u = await getCurrentUser();
  if (!u || !u.tenantId) redirect("/forbidden");
  return u.tenantId;
}
