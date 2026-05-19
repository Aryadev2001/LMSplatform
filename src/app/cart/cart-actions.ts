"use server";

import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { carts, cartItems, programs, tenants, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { CartItem } from "@/lib/cart";

/**
 * Server-persisted cart.
 *
 * The cart is owned by the *buyer* and is intentionally cross-institute —
 * a learner can have courses from several tenants in one cart (the
 * marketplace model; mirrors orders having no tenant header, with the
 * tenant carried per line). So it is deliberately NOT tenant-scoped:
 * the only ownership boundary is `carts.userId = current user`. Every
 * query below is scoped by the authenticated user's DB id; a cart id is
 * never accepted from the client.
 *
 * Price / title / institute are always re-derived from `programs` +
 * `tenants` here — the client value is display-only and never trusted.
 */

export type CartSync = { authed: boolean; items: CartItem[] };

const EMPTY: CartSync = { authed: false, items: [] };

const Uuid = z.string().uuid();
const UuidList = z.array(Uuid).max(50);

async function dbUserId(clerkId: string): Promise<string | null> {
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return u?.id ?? null;
}

/** The user's single open cart, created lazily. Safe under the
 *  `carts_user_open_idx` partial-unique race. */
async function openCartId(userId: string): Promise<string> {
  const [existing] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(and(eq(carts.userId, userId), eq(carts.status, "open")))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(carts)
    .values({ userId })
    .onConflictDoNothing()
    .returning({ id: carts.id });
  if (created) return created.id;

  // Lost the insert race — re-read the row the winner created.
  const [again] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(and(eq(carts.userId, userId), eq(carts.status, "open")))
    .limit(1);
  return again.id;
}

async function readItems(cartId: string): Promise<CartItem[]> {
  const rows = await db
    .select({
      programId: cartItems.programId,
      unitPriceCents: cartItems.unitPriceCents,
      currency: cartItems.currency,
      slug: programs.slug,
      title: programs.name,
      instituteSlug: tenants.slug,
      instituteName: tenants.name,
    })
    .from(cartItems)
    .innerJoin(programs, eq(cartItems.programId, programs.id))
    .innerJoin(tenants, eq(cartItems.tenantId, tenants.id))
    .where(eq(cartItems.cartId, cartId));

  return rows.map((r) => ({
    programId: r.programId,
    slug: r.slug,
    title: r.title,
    priceCents: r.unitPriceCents,
    currency: r.currency,
    instituteSlug: r.instituteSlug,
    instituteName: r.instituteName,
  }));
}

/** Published, purchasable (tenant-owned) programs among the given ids. */
async function purchasable(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({
      id: programs.id,
      priceCents: programs.priceCents,
      currency: programs.currency,
      tenantId: programs.tenantId,
    })
    .from(programs)
    .where(
      and(inArray(programs.id, ids), eq(programs.status, "published")),
    );
}

/**
 * Read the server cart, first merging any guest (localStorage) items the
 * client passes in. Called once on mount — this is the login-merge path.
 */
export async function getOrSyncCart(localProgramIds: unknown): Promise<CartSync> {
  const me = await getCurrentUser();
  if (!me) return EMPTY;
  const userId = await dbUserId(me.userId);
  if (!userId) return EMPTY;

  const cartId = await openCartId(userId);

  const parsed = UuidList.safeParse(localProgramIds);
  const guestIds = parsed.success ? parsed.data : [];
  if (guestIds.length > 0) {
    const progs = await purchasable(guestIds);
    const rows = progs
      .filter((p) => p.tenantId)
      .map((p) => ({
        cartId,
        programId: p.id,
        tenantId: p.tenantId as string,
        unitPriceCents: p.priceCents,
        currency: p.currency,
      }));
    if (rows.length > 0) {
      await db.insert(cartItems).values(rows).onConflictDoNothing();
    }
  }

  return { authed: true, items: await readItems(cartId) };
}

export async function serverAddItem(programId: unknown): Promise<CartSync> {
  const me = await getCurrentUser();
  if (!me) return EMPTY;
  const id = Uuid.safeParse(programId);
  if (!id.success) return { authed: true, items: [] };
  const userId = await dbUserId(me.userId);
  if (!userId) return EMPTY;

  const cartId = await openCartId(userId);
  const [p] = await purchasable([id.data]);
  if (p && p.tenantId) {
    await db
      .insert(cartItems)
      .values({
        cartId,
        programId: p.id,
        tenantId: p.tenantId,
        unitPriceCents: p.priceCents,
        currency: p.currency,
      })
      .onConflictDoNothing();
  }
  return { authed: true, items: await readItems(cartId) };
}

export async function serverRemoveItem(programId: unknown): Promise<CartSync> {
  const me = await getCurrentUser();
  if (!me) return EMPTY;
  const id = Uuid.safeParse(programId);
  const userId = await dbUserId(me.userId);
  if (!userId) return EMPTY;
  const cartId = await openCartId(userId);
  if (id.success) {
    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.programId, id.data),
        ),
      );
  }
  return { authed: true, items: await readItems(cartId) };
}

export async function serverClearCart(): Promise<CartSync> {
  const me = await getCurrentUser();
  if (!me) return EMPTY;
  const userId = await dbUserId(me.userId);
  if (!userId) return EMPTY;
  const cartId = await openCartId(userId);
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  return { authed: true, items: [] };
}
