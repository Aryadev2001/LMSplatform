import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { programs, tenants } from "@/db/schema";

/** Fresh, authoritative marketplace data for a saved course (wishlist / cart).
 *  Only ever returned for courses that are still publicly sellable. */
export interface SellableCourse {
  programId: string;
  slug: string | null;
  title: string;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  instituteName: string | null;
  instituteSlug: string | null;
}

/**
 * Resolve the given program ids to their CURRENT sellable state — used to
 * revalidate the browser-stored wishlist and cart (prices/titles/images go
 * stale and a course can be unpublished after it was saved). Returns only the
 * courses that are still publicly purchasable: published + super-admin approved
 * + the institute not suspended (the same visibility rule as the public course
 * page). Ids missing from the result are no longer available and the caller
 * prunes them.
 */
export async function getSellableCoursesByIds(
  ids: string[],
): Promise<SellableCourse[]> {
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      programId: programs.id,
      slug: programs.slug,
      title: programs.name,
      imageUrl: programs.imageUrl,
      priceCents: programs.priceCents,
      currency: programs.currency,
      instituteName: tenants.name,
      instituteSlug: tenants.slug,
      tenantStatus: tenants.status,
    })
    .from(programs)
    .innerJoin(tenants, eq(programs.tenantId, tenants.id))
    .where(
      and(
        inArray(programs.id, ids),
        eq(programs.status, "published"),
        isNotNull(programs.approvedAt),
      ),
    );

  return rows
    .filter((r) => r.tenantStatus !== "SUSPENDED")
    .map((r) => ({
      programId: r.programId,
      slug: r.slug,
      title: r.title,
      imageUrl: r.imageUrl,
      priceCents: r.priceCents,
      currency: r.currency,
      instituteName: r.instituteName,
      instituteSlug: r.instituteSlug,
    }));
}
