import { and, asc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  tenants,
  referrals,
  pointsTransactions,
  tierRewards,
  enrollments,
  programs,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";

export type Tier = "NONE" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

/** Progressive tiers by ACTIVATED (paid) referral count. Spec §Referrals. */
export const TIER_THRESHOLDS: { tier: Exclude<Tier, "NONE">; min: number }[] = [
  { tier: "BRONZE", min: 1 },
  { tier: "SILVER", min: 5 },
  { tier: "GOLD", min: 15 },
  { tier: "PLATINUM", min: 30 },
];

const TIER_RANK: Record<Tier, number> = {
  NONE: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
};

const POINT_EXPIRY_MONTHS = 12;

export function tierForCount(activated: number): Tier {
  let t: Tier = "NONE";
  for (const { tier, min } of TIER_THRESHOLDS) if (activated >= min) t = tier;
  return t;
}

/** Tiers strictly between `from` (exclusive) and `to` (inclusive). */
export function tiersCrossed(from: Tier, to: Tier): Exclude<Tier, "NONE">[] {
  return TIER_THRESHOLDS.filter(
    (x) => TIER_RANK[x.tier] > TIER_RANK[from] && TIER_RANK[x.tier] <= TIER_RANK[to],
  ).map((x) => x.tier);
}

function randomCode(len = 6): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < len; i++)
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

/** Ensure a user has a unique `{tenantSlug}-{6}` referral code; returns it. */
export async function ensureReferralCode(
  userId: string,
  tenantSlug: string,
): Promise<string> {
  const [u] = await db
    .select({ code: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (u?.code) return u.code;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `${tenantSlug}-${randomCode()}`;
    const clash = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);
    if (clash.length === 0) {
      await db
        .update(users)
        .set({ referralCode: code, updatedAt: new Date() })
        .where(eq(users.id, userId));
      return code;
    }
  }
  throw new Error("Could not allocate a unique referral code");
}

/** Resolve a referral code to its owner (scoped to the tenant). */
export async function resolveReferrer(
  code: string,
  tenantId: string,
): Promise<{ id: string; email: string; fullName: string | null } | null> {
  const [r] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .where(and(eq(users.referralCode, code), eq(users.tenantId, tenantId)))
    .limit(1);
  return r ?? null;
}

async function activatedCount(referrerId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(referrals)
    .where(and(eq(referrals.referrerId, referrerId), eq(referrals.status, "ACTIVATED")));
  return row?.n ?? 0;
}

/**
 * A referred user just paid. Activates the referral, awards the referrer
 * `amount × tenant.referralPointsPercent` points (1pt = ₹1, 12-month expiry),
 * and applies any tier unlocks (free reward enrollments + emails). Idempotent
 * per (payment): a payment is only ever earned against once.
 */
export async function awardReferralForPurchase(params: {
  referredUserId: string;
  paymentId: string;
  amountCents: number;
  tenantId: string;
}): Promise<{ awarded: number } | null> {
  const { referredUserId, paymentId, amountCents, tenantId } = params;

  // Already earned against this payment? (idempotency)
  const dup = await db
    .select({ id: pointsTransactions.id })
    .from(pointsTransactions)
    .where(
      and(
        eq(pointsTransactions.relatedPaymentId, paymentId),
        eq(pointsTransactions.type, "EARNED_REFERRAL"),
      ),
    )
    .limit(1);
  if (dup.length > 0) return null;

  const [referred] = await db
    .select({ referredById: users.referredById })
    .from(users)
    .where(eq(users.id, referredUserId))
    .limit(1);
  if (!referred?.referredById) return null;
  const referrerId = referred.referredById;
  if (referrerId === referredUserId) return null;

  const [tenant] = await db
    .select({
      slug: tenants.slug,
      pct: tenants.referralPointsPercent,
      enabled: tenants.referralEnabled,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant || !tenant.enabled) return null;

  // Upsert the referral pair; activate on first purchase.
  const [existing] = await db
    .select({ id: referrals.id, status: referrals.status })
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerId, referrerId),
        eq(referrals.referredUserId, referredUserId),
      ),
    )
    .limit(1);

  let referralId: string;
  let firstActivation = false;
  if (!existing) {
    const [ins] = await db
      .insert(referrals)
      .values({
        tenantId,
        referrerId,
        referredUserId,
        status: "ACTIVATED",
        firstPurchaseAt: new Date(),
      })
      .returning({ id: referrals.id });
    referralId = ins.id;
    firstActivation = true;
  } else {
    referralId = existing.id;
    if (existing.status !== "ACTIVATED") {
      await db
        .update(referrals)
        .set({ status: "ACTIVATED", firstPurchaseAt: new Date() })
        .where(eq(referrals.id, referralId));
      firstActivation = true;
    }
  }

  const rupees = Math.floor(amountCents / 100);
  const points = Math.floor((rupees * tenant.pct) / 100);
  if (points <= 0) return { awarded: 0 };

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + POINT_EXPIRY_MONTHS);

  await db.insert(pointsTransactions).values({
    userId: referrerId,
    tenantId,
    type: "EARNED_REFERRAL",
    pointsDelta: points,
    relatedPaymentId: paymentId,
    relatedReferralId: referralId,
    note: `Referral purchase (₹${rupees})`,
    expiresAt,
  });

  const [referrer] = await db
    .select({
      email: users.email,
      pointsBalance: users.pointsBalance,
      currentTier: users.currentTier,
      tierUnlockedAt: users.tierUnlockedAt,
    })
    .from(users)
    .where(eq(users.id, referrerId))
    .limit(1);

  await db
    .update(users)
    .set({ pointsBalance: (referrer?.pointsBalance ?? 0) + points, updatedAt: new Date() })
    .where(eq(users.id, referrerId));

  if (firstActivation && referrer) {
    await sendEmail({
      to: referrer.email,
      template: "referral_activated",
      data: { points, tenant: tenant.slug },
    });
  }

  // Tier recompute (only meaningful on a fresh activation).
  if (firstActivation) {
    const count = await activatedCount(referrerId);
    const fromTier = (referrer?.currentTier ?? "NONE") as Tier;
    const toTier = tierForCount(count);
    const crossed = tiersCrossed(fromTier, toTier);

    if (crossed.length > 0 && referrer) {
      const unlocked = {
        ...(referrer.tierUnlockedAt as Record<string, string> | null),
      } as Record<string, string>;
      const nowIso = new Date().toISOString();
      for (const t of crossed) unlocked[t] = nowIso;

      await db
        .update(users)
        .set({ currentTier: toTier, tierUnlockedAt: unlocked, updatedAt: new Date() })
        .where(eq(users.id, referrerId));

      // Free reward enrollments for every tier just crossed.
      for (const t of crossed) {
        const rewards = await db
          .select({ courseId: tierRewards.courseId })
          .from(tierRewards)
          .where(and(eq(tierRewards.tenantId, tenantId), eq(tierRewards.tier, t)));

        for (const rw of rewards) {
          const dupEnr = await db
            .select({ id: enrollments.id })
            .from(enrollments)
            .where(
              and(
                eq(enrollments.userId, referrerId),
                eq(enrollments.programId, rw.courseId),
              ),
            )
            .limit(1);
          if (dupEnr.length > 0) continue;

          await db.insert(enrollments).values({
            fullName: referrer.email,
            email: referrer.email,
            programId: rw.courseId,
            userId: referrerId,
            status: "account_created",
            notes: `Tier reward (${t})`,
          });
        }
      }

      await sendEmail({
        to: referrer.email,
        template: "tier_upgraded",
        data: { tier: toTier, crossed, tenant: tenant.slug },
      });
    }
  }

  return { awarded: points };
}

/** Pure redemption math. Never returns more than the cart (no negative order). */
export function computeRedeemable(args: {
  pointsBalance: number;
  cartCents: number;
  redeemMaxPercent: number;
}): { points: number; discountCents: number } {
  const { pointsBalance, cartCents, redeemMaxPercent } = args;
  if (pointsBalance <= 0 || cartCents <= 0) return { points: 0, discountCents: 0 };
  const capCents = Math.floor((cartCents * redeemMaxPercent) / 100);
  const balanceCents = pointsBalance * 100; // 1 point = ₹1 = 100 paise
  const discountCents = Math.min(balanceCents, capCents, cartCents);
  const points = Math.floor(discountCents / 100);
  return { points, discountCents: points * 100 };
}

/**
 * Redeem points at checkout. Returns the discount actually applied. Writes a
 * negative ledger row + decrements the cached balance. Guarantees the order
 * never goes negative (discount ≤ cart).
 */
export async function redeemPointsAtCheckout(params: {
  userId: string;
  tenantId: string;
  paymentId: string;
  cartCents: number;
}): Promise<{ points: number; discountCents: number }> {
  const { userId, tenantId, paymentId, cartCents } = params;

  const [u] = await db
    .select({ bal: users.pointsBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const [t] = await db
    .select({ maxPct: tenants.referralRedeemMaxPercent, enabled: tenants.referralEnabled })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!u || !t || !t.enabled) return { points: 0, discountCents: 0 };

  const { points, discountCents } = computeRedeemable({
    pointsBalance: u.bal,
    cartCents,
    redeemMaxPercent: t.maxPct,
  });
  if (points <= 0) return { points: 0, discountCents: 0 };

  await db.insert(pointsTransactions).values({
    userId,
    tenantId,
    type: "REDEEMED_AT_CHECKOUT",
    pointsDelta: -points,
    relatedPaymentId: paymentId,
    note: `Redeemed at checkout (−₹${points})`,
  });

  await db
    .update(users)
    .set({ pointsBalance: u.bal - points, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { points, discountCents };
}

/**
 * Daily job: expire EARNED points >12 months old, FIFO. A redemption/expiry
 * consumes the oldest earned lots first; whatever remains of a lot past its
 * expiry is written off with an EXPIRED ledger row. Returns users touched.
 */
export async function expireOldPoints(): Promise<{ expiredPoints: number; users: number }> {
  const now = new Date();

  // Users that have at least one expired-but-possibly-live earned lot.
  const candidates = await db
    .selectDistinct({ userId: pointsTransactions.userId })
    .from(pointsTransactions)
    .where(
      and(
        eq(pointsTransactions.type, "EARNED_REFERRAL"),
        lt(pointsTransactions.expiresAt, now),
      ),
    );

  let totalExpired = 0;
  let touched = 0;

  for (const { userId } of candidates) {
    const ledger = await db
      .select({
        type: pointsTransactions.type,
        delta: pointsTransactions.pointsDelta,
        expiresAt: pointsTransactions.expiresAt,
        createdAt: pointsTransactions.createdAt,
      })
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, userId))
      .orderBy(asc(pointsTransactions.createdAt));

    // FIFO lot accounting.
    type Lot = { remaining: number; expiresAt: Date | null };
    const lots: Lot[] = [];
    let consumption = 0; // total points already redeemed/expired/negative-adjusted

    for (const row of ledger) {
      if (row.type === "EARNED_REFERRAL" && row.delta > 0) {
        lots.push({ remaining: row.delta, expiresAt: row.expiresAt });
      } else if (row.delta < 0) {
        consumption += -row.delta;
      } else if (row.type === "ADMIN_ADJUSTMENT" && row.delta > 0) {
        // positive admin grant — treat as an immortal lot
        lots.push({ remaining: row.delta, expiresAt: null });
      }
    }

    // Drain consumption against oldest lots first.
    for (const lot of lots) {
      if (consumption <= 0) break;
      const take = Math.min(lot.remaining, consumption);
      lot.remaining -= take;
      consumption -= take;
    }

    // Expire whatever remains of lots past their expiry.
    let userExpired = 0;
    for (const lot of lots) {
      if (lot.expiresAt && lot.expiresAt < now && lot.remaining > 0) {
        userExpired += lot.remaining;
        lot.remaining = 0;
      }
    }

    if (userExpired > 0) {
      const [u] = await db
        .select({ bal: users.pointsBalance, tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // Fall back to a ledger row's tenant if the user somehow has none.
      let txnTenantId = u?.tenantId ?? null;
      if (!txnTenantId) {
        const [anyTxn] = await db
          .select({ t: pointsTransactions.tenantId })
          .from(pointsTransactions)
          .where(eq(pointsTransactions.userId, userId))
          .limit(1);
        txnTenantId = anyTxn?.t ?? null;
      }
      if (!txnTenantId) continue; // can't attribute — skip safely

      await db.insert(pointsTransactions).values({
        userId,
        tenantId: txnTenantId,
        type: "EXPIRED",
        pointsDelta: -userExpired,
        note: "12-month expiry",
      });

      await db
        .update(users)
        .set({
          pointsBalance: Math.max(0, (u?.bal ?? 0) - userExpired),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      totalExpired += userExpired;
      touched += 1;
    }
  }

  return { expiredPoints: totalExpired, users: touched };
}
