import type { MetadataRoute } from "next";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { programs, tenants } from "@/db/schema";

/**
 * XML sitemap of every publicly-indexable page. Static marketing pages
 * are listed inline; institute storefronts and course detail pages are
 * generated from the live programs / tenants tables (only NON-suspended
 * tenants and published+active courses are included — same filters as
 * the marketplace storefront reads).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://eurodigital.coach";

  const now = new Date();

  // Static, always-on marketing surfaces.
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/partner-program`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/for-institutes`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/help`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/disclaimer`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Live tenant storefronts.
  let tenantEntries: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({ slug: tenants.slug, updatedAt: tenants.updatedAt })
      .from(tenants)
      .where(ne(tenants.status, "SUSPENDED"));
    tenantEntries = rows.map((t) => ({
      url: `${base}/institute/${t.slug}`,
      lastModified: t.updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    /* sitemap should never 500 — fall through with whatever we have */
  }

  // Live, published courses.
  let courseEntries: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({
        slug: programs.slug,
        updatedAt: programs.updatedAt,
      })
      .from(programs)
      .innerJoin(tenants, eq(tenants.id, programs.tenantId))
      .where(
        and(
          eq(programs.status, "published"),
          eq(programs.isActive, true),
          isNotNull(programs.slug),
          ne(tenants.status, "SUSPENDED"),
        ),
      );
    courseEntries = rows
      .filter((c): c is { slug: string; updatedAt: Date } => !!c.slug)
      .map((c) => ({
        url: `${base}/courses/${c.slug}`,
        lastModified: c.updatedAt ?? now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch {
    /* same — fail open */
  }

  return [...staticEntries, ...tenantEntries, ...courseEntries];
}
