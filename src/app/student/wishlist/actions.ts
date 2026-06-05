"use server";

import { z } from "zod";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { programs, tenants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const Schema = z.array(z.string().uuid()).max(100);

export interface FreshWishItem {
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
 * Revalidate saved wishlist items against the live marketplace. The wishlist
 * is stored in the browser (localStorage), so prices/titles/images there go
 * stale and a course can be unpublished after it was saved. Given the saved
 * program ids, this returns FRESH, authoritative data for only the courses
 * that are still publicly sellable (published + super-admin approved + the
 * institute not suspended) — the same visibility rule as the public course
 * page. Ids that come back missing are no longer available and the client
 * prunes them.
 */
export async function revalidateWishlist(
  programIds: unknown,
): Promise<FreshWishItem[]> {
  // Wishlist lives under the student area; only serve signed-in callers.
  const me = await getCurrentUser();
  if (!me) return [];

  const parsed = Schema.safeParse(programIds);
  if (!parsed.success || parsed.data.length === 0) return [];

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
        inArray(programs.id, parsed.data),
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
