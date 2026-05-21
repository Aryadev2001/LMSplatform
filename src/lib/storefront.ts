import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  tenants,
  programs,
  users,
  courseOffers,
  modules,
  courseReviews,
} from "@/db/schema";

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
  imageUrl: string | null;
  introVideoUrl: string | null;
  language: "en" | "ar" | "hi";
  totalDurationHours: number;
  moduleCount: number;
  avgRating: number;
  reviewCount: number;
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
    tier: "basic" | "standard" | "premium";
    sinceYear: number;
    learnerCount: number;
    companyProfile: string | null;
    ownerName: string | null;
    ownerTitle: string | null;
    ownerProfile: string | null;
    ownerPhotoUrl: string | null;
    activeOffers: number;
    /** True when the storefront should hide eurodigital.coach branding —
     *  tenant has the white_label feature granted (via tier or override)
     *  AND has actively enabled the hide-platform-logo flag. */
    whiteLabel: boolean;
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
      tier: tenants.tier,
      companyProfile: tenants.companyProfile,
      ownerName: tenants.ownerName,
      ownerTitle: tenants.ownerTitle,
      ownerProfile: tenants.ownerProfile,
      ownerPhotoUrl: tenants.ownerPhotoUrl,
      hidePlatformLogo: tenants.hidePlatformLogo,
      featureOverrides: tenants.featureOverrides,
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
      imageUrl: programs.imageUrl,
      introVideoUrl: programs.introVideoUrl,
      language: programs.language,
      totalDurationHours: programs.totalDurationHours,
      moduleCount: sql<number>`(
        select count(*)::int from ${modules} m where m.course_id = ${programs.id}
      )`,
      avgRating: sql<number>`coalesce((
        select avg(rating)::float8 from ${courseReviews} cr
        where cr.course_id = ${programs.id}
      ), 0)`,
      reviewCount: sql<number>`coalesce((
        select count(*)::int from ${courseReviews} cr
        where cr.course_id = ${programs.id}
      ), 0)`,
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

  const [{ offerCount }] = await db
    .select({ offerCount: sql<number>`count(*)::int` })
    .from(courseOffers)
    .where(
      and(eq(courseOffers.tenantId, tenant.id), eq(courseOffers.isActive, true)),
    );

  // White-label is on iff the tenant has the feature (via tier or override)
  // AND has actively enabled hide_platform_logo. Tier check duplicated here
  // because storefront pages are PUBLIC — no authed user to call requireFeature.
  const overrides = (tenant.featureOverrides ?? {}) as {
    white_label?: boolean;
  };
  const featureAllowed =
    overrides.white_label === true ||
    (overrides.white_label !== false && tenant.tier === "premium");
  const whiteLabel = featureAllowed && tenant.hidePlatformLogo === true;

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
      tier: tenant.tier,
      sinceYear: (tenant.createdAt ?? new Date()).getFullYear(),
      learnerCount: learners ?? 0,
      companyProfile: tenant.companyProfile,
      ownerName: tenant.ownerName,
      ownerTitle: tenant.ownerTitle,
      ownerProfile: tenant.ownerProfile,
      ownerPhotoUrl: tenant.ownerPhotoUrl,
      activeOffers: offerCount ?? 0,
      whiteLabel,
    },
    courses,
  };
}
