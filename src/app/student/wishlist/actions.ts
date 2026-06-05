"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getSellableCoursesByIds, type SellableCourse } from "@/lib/catalog";

const Schema = z.array(z.string().uuid()).max(100);

/** Kept for the wishlist page's existing import. */
export type FreshWishItem = SellableCourse;

/**
 * Revalidate saved wishlist items against the live marketplace. The wishlist is
 * stored in the browser, so its prices/titles/images go stale and a course can
 * be unpublished after it was saved. Returns fresh, authoritative data for only
 * the still-sellable courses; the client prunes ids that come back missing.
 */
export async function revalidateWishlist(
  programIds: unknown,
): Promise<FreshWishItem[]> {
  // Wishlist lives under the student area; only serve signed-in callers.
  const me = await getCurrentUser();
  if (!me) return [];

  const parsed = Schema.safeParse(programIds);
  if (!parsed.success || parsed.data.length === 0) return [];

  return getSellableCoursesByIds(parsed.data);
}
