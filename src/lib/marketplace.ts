import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
  ne,
  gte,
  lte,
  type SQL,
} from "drizzle-orm";
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
  imageUrl: string | null;
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

export type CourseLevel = "low" | "mid" | "high";
export type CoursePriceBucket = "free" | "paid" | "under50" | "50_200";
export type CourseDurationBucket = "0_3" | "3_6" | "6_12" | "12_plus";

export interface CourseFilters {
  q?: string;
  /** Tier maps to Beginner=low / Intermediate=mid / Advanced=high. */
  levels?: CourseLevel[];
  /** Free / Paid / Under $50 / $50-$200. Price filter is INR-paise normalised
   *  via simple thresholds (we use cents as the underlying unit). */
  prices?: CoursePriceBucket[];
  /** Duration buckets in MONTHS — we store durationMonths, not hours. */
  durations?: CourseDurationBucket[];
}

// Match thresholds expressed in *cents* (priceCents). $50 = 5000, $200 = 20000.
const PRICE_UNDER_50 = 5000;
const PRICE_50_200_MIN = 5000;
const PRICE_50_200_MAX = 20000;

export async function getMarketCourses(opts?: {
  q?: string;
  limit?: number;
} & Pick<CourseFilters, "levels" | "prices" | "durations">): Promise<MarketCourse[]> {
  const q = opts?.q?.trim();
  const conditions: (SQL | undefined)[] = [liveCourseWhere];

  if (q) {
    conditions.push(
      or(ilike(programs.name, `%${q}%`), ilike(programs.tagline, `%${q}%`)),
    );
  }

  if (opts?.levels && opts.levels.length > 0) {
    conditions.push(inArray(programs.tier, opts.levels));
  }

  if (opts?.prices && opts.prices.length > 0) {
    const priceOrs: SQL[] = [];
    for (const p of opts.prices) {
      if (p === "free") priceOrs.push(eq(programs.priceCents, 0));
      else if (p === "paid") priceOrs.push(sql`${programs.priceCents} > 0`);
      else if (p === "under50")
        priceOrs.push(
          and(
            sql`${programs.priceCents} > 0`,
            lte(programs.priceCents, PRICE_UNDER_50),
          )!,
        );
      else if (p === "50_200")
        priceOrs.push(
          and(
            gte(programs.priceCents, PRICE_50_200_MIN),
            lte(programs.priceCents, PRICE_50_200_MAX),
          )!,
        );
    }
    if (priceOrs.length) conditions.push(or(...priceOrs));
  }

  if (opts?.durations && opts.durations.length > 0) {
    const dOrs: SQL[] = [];
    for (const d of opts.durations) {
      if (d === "0_3") dOrs.push(lte(programs.durationMonths, 3));
      else if (d === "3_6")
        dOrs.push(
          and(
            gte(programs.durationMonths, 4),
            lte(programs.durationMonths, 6),
          )!,
        );
      else if (d === "6_12")
        dOrs.push(
          and(
            gte(programs.durationMonths, 7),
            lte(programs.durationMonths, 12),
          )!,
        );
      else if (d === "12_plus") dOrs.push(gte(programs.durationMonths, 13));
    }
    if (dOrs.length) conditions.push(or(...dOrs));
  }

  const where = and(...conditions.filter((c): c is SQL => Boolean(c)));

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
      imageUrl: programs.imageUrl,
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

/** Other published courses from the same institute (for "Recommended next"). */
export async function getRelatedCourses(
  tenantId: string,
  excludeProgramId: string,
  limit = 3,
): Promise<MarketCourse[]> {
  return db
    .select({
      id: programs.id,
      slug: programs.slug,
      title: programs.name,
      tagline: programs.tagline,
      priceCents: programs.priceCents,
      currency: programs.currency,
      tier: programs.tier,
      type: programs.type,
      imageUrl: programs.imageUrl,
      instituteName: tenants.name,
      instituteSlug: tenants.slug,
    })
    .from(programs)
    .innerJoin(tenants, eq(tenants.id, programs.tenantId))
    .where(
      and(
        liveCourseWhere,
        eq(programs.tenantId, tenantId),
        ne(programs.id, excludeProgramId),
      ),
    )
    .orderBy(desc(programs.createdAt))
    .limit(limit);
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
