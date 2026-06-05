"use server";

import { z } from "zod";
import { getSellableCoursesByIds, type SellableCourse } from "@/lib/catalog";

const Schema = z.array(z.string().uuid()).max(100);

export type FreshCartItem = SellableCourse;

/**
 * Revalidate the browser-stored cart against the live marketplace so prices,
 * titles, images and availability are current before checkout. Intentionally
 * NOT auth-gated: the cart is a guest-first feature (anonymous shoppers fill a
 * cart before signing up), and this only returns already-public course data.
 * Checkout itself re-reads prices server-side, so this is for an accurate
 * pre-checkout display; ids missing from the result are pruned by the client.
 */
export async function revalidateCart(
  programIds: unknown,
): Promise<FreshCartItem[]> {
  const parsed = Schema.safeParse(programIds);
  if (!parsed.success || parsed.data.length === 0) return [];

  return getSellableCoursesByIds(parsed.data);
}
