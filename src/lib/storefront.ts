import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants, programs, users } from "@/db/schema";

/**
 * Generic per-tenant storefront data. Every institute gets the SAME layout —
 * only logo, name, colors and their own course list differ. Tenant-scoped:
 * a storefront only ever exposes its own published courses.
 */
export interface StorefrontCourse {
  id: string;
  slug: string | null;
  title: string;
  tagline: string | null;
  priceCents: number;
  currency: string;
  tier: "low" | "mid" | "high";
  type: "one_time" | "subscription";
  badgeColor: string | null;
  durationMonths: number;
}

export interface Storefront {
  tenant: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    heroTagline: string | null;
    status: "ACTIVE" | "TRIAL" | "CHURNED";
    sinceYear: number;
    learnerCount: number;
  };
  courses: StorefrontCourse[];
}

export async function getStorefront(slug: string): Promise<Storefront | null> {
  const [tenant] = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      logoUrl: tenants.logoUrl,
      brandPrimaryColor: tenants.brandPrimaryColor,
      brandSecondaryColor: tenants.brandSecondaryColor,
      heroTagline: tenants.heroTagline,
      status: tenants.status,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .where(eq(tenants.slug, slug.toLowerCase()))
    .limit(1);

  // No storefront for a missing or suspended institute.
  if (!tenant || tenant.status === "SUSPENDED") return null;

  const [{ learners }] = await db
    .select({ learners: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenant.id),
        sql`${users.role} in ('student','STUDENT','coach')`,
      ),
    );

  const courses = await db
    .select({
      id: programs.id,
      slug: programs.slug,
      title: programs.name,
      tagline: programs.tagline,
      priceCents: programs.priceCents,
      currency: programs.currency,
      tier: programs.tier,
      type: programs.type,
      badgeColor: programs.badgeColor,
      durationMonths: programs.durationMonths,
    })
    .from(programs)
    .where(
      and(
        eq(programs.tenantId, tenant.id),
        eq(programs.status, "published"),
        eq(programs.isActive, true),
      ),
    )
    .orderBy(desc(programs.createdAt));

  return {
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.logoUrl,
      brandPrimaryColor: tenant.brandPrimaryColor,
      brandSecondaryColor: tenant.brandSecondaryColor,
      heroTagline: tenant.heroTagline,
      status: tenant.status,
      sinceYear: (tenant.createdAt ?? new Date()).getFullYear(),
      learnerCount: learners ?? 0,
    },
    courses,
  };
}
