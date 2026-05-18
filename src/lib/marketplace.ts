import { and, desc, eq, ilike, isNotNull, or, sql, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants, programs, users } from "@/db/schema";

/**
 * Cross-tenant marketplace reads for the public eurodigital.coach pages.
 * Only NON-suspended institutes and their PUBLISHED, active, tenant-scoped
 * courses are ever exposed (master courses — tenantId null — are excluded).
 */

export interface MarketCourse {
  id: string;
  slug: string | null;
  title: string;
  tagline: string | null;
  priceCents: number;
  currency: string;
  tier: "low" | "mid" | "high";
  type: "one_time" | "subscription";
  instituteName: string;
  instituteSlug: string;
}

export interface MarketInstitute {
  slug: string;
  name: string;
  logoUrl: string | null;
  heroTagline: string | null;
  courseCount: number;
}

const liveCourseWhere = and(
  eq(programs.status, "published"),
  eq(programs.isActive, true),
  isNotNull(programs.tenantId),
  ne(tenants.status, "SUSPENDED"),
);

export async function getMarketStats(): Promise<{
  courses: number;
  institutes: number;
  learners: number;
}> {
  const [[c], [i], [l]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(programs)
      .innerJoin(tenants, eq(tenants.id, programs.tenantId))
      .where(liveCourseWhere),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(tenants)
      .where(ne(tenants.status, "SUSPENDED")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`role in ('student','STUDENT','coach')`),
  ]);
  return {
    courses: c?.n ?? 0,
    institutes: i?.n ?? 0,
    learners: l?.n ?? 0,
  };
}

export async function getMarketCourses(opts?: {
  q?: string;
  limit?: number;
}): Promise<MarketCourse[]> {
  const q = opts?.q?.trim();
  const where = q
    ? and(
        liveCourseWhere,
        or(ilike(programs.name, `%${q}%`), ilike(programs.tagline, `%${q}%`)),
      )
    : liveCourseWhere;

  const rows = await db
    .select({
      id: programs.id,
      slug: programs.slug,
      title: programs.name,
      tagline: programs.tagline,
      priceCents: programs.priceCents,
      currency: programs.currency,
      tier: programs.tier,
      type: programs.type,
      instituteName: tenants.name,
      instituteSlug: tenants.slug,
    })
    .from(programs)
    .innerJoin(tenants, eq(tenants.id, programs.tenantId))
    .where(where)
    .orderBy(desc(programs.createdAt))
    .limit(opts?.limit ?? 60);
  return rows;
}

export async function getFeaturedInstitutes(
  limit = 8,
): Promise<MarketInstitute[]> {
  const rows = await db
    .select({
      slug: tenants.slug,
      name: tenants.name,
      logoUrl: tenants.logoUrl,
      heroTagline: tenants.heroTagline,
      courseCount: sql<number>`(
        select count(*)::int from ${programs} p
        where p.tenant_id = ${tenants.id}
          and p.status = 'published' and p.is_active = true
      )`,
    })
    .from(tenants)
    .where(ne(tenants.status, "SUSPENDED"))
    .orderBy(desc(tenants.createdAt))
    .limit(limit);
  return rows;
}
