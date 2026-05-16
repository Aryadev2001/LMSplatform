import "dotenv/config";
import { db } from "../src/db/client";
import {
  tenants, users, programs, enrollments, payments,
  referrals, pointsTransactions, tierRewards,
} from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  awardReferralForPurchase, computeRedeemable,
  redeemPointsAtCheckout, expireOldPoints, tierForCount,
} from "../src/lib/referral";

async function run() {
  let pass = true;
  const ok = (label: string, cond: boolean) => {
    if (!cond) pass = false;
    console.log(`${cond ? "OK  " : "FAIL"} ${label}`);
  };

  // ---- setup throwaway tenant + users + reward course ----
  const [t] = await db.insert(tenants).values({
    slug: `zztest-${Math.random().toString(36).slice(2, 8)}`,
    name: "ZZ Test Tenant",
  }).returning({ id: tenants.id, slug: tenants.slug });

  const [reward] = await db.insert(programs).values({
    name: "ZZ Reward Course", slug: `zz-reward-${Math.random().toString(36).slice(2,8)}`,
    priceCents: 0, tenantId: t.id,
  }).returning({ id: programs.id });

  const [referrer] = await db.insert(users).values({
    clerkId: `zz_ref_${Math.random().toString(36).slice(2,10)}`,
    email: `zzref-${Math.random().toString(36).slice(2,8)}@t.test`,
    fullName: "ZZ Referrer", role: "STUDENT", tenantId: t.id,
  }).returning({ id: users.id });

  const [referred] = await db.insert(users).values({
    clerkId: `zz_red_${Math.random().toString(36).slice(2,10)}`,
    email: `zzred-${Math.random().toString(36).slice(2,8)}@t.test`,
    fullName: "ZZ Referred", role: "STUDENT", tenantId: t.id,
    referredById: referrer.id,
  }).returning({ id: users.id });

  await db.insert(tierRewards).values({ tenantId: t.id, tier: "BRONZE", courseId: reward.id });

  const [enr] = await db.insert(enrollments).values({
    fullName: "ZZ Referred", email: "zzred@t.test", programId: reward.id, status: "paid",
  }).returning({ id: enrollments.id });
  const [pay] = await db.insert(payments).values({
    enrollmentId: enr.id, amountCents: 999900, currency: "INR", status: "succeeded",
    tenantId: t.id, studentUserId: referred.id,
  }).returning({ id: payments.id });

  const tenantIds = [t.id];
  try {
    // ---- 1. EARN + ACTIVATE + TIER UNLOCK ----
    const res = await awardReferralForPurchase({
      referredUserId: referred.id, paymentId: pay.id,
      amountCents: 999900, tenantId: t.id,
    });
    ok("earn: 499 pts for ₹9999 @ 5%", res?.awarded === 499);

    const [rr] = await db.select({ bal: users.pointsBalance, tier: users.currentTier })
      .from(users).where(eq(users.id, referrer.id));
    ok("referrer balance = 499", rr.bal === 499);
    ok("tier unlocked = BRONZE", rr.tier === "BRONZE" && tierForCount(1) === "BRONZE");

    const [ref] = await db.select({ s: referrals.status }).from(referrals)
      .where(eq(referrals.referrerId, referrer.id));
    ok("referral ACTIVATED", ref.s === "ACTIVATED");

    const freeEnr = await db.select({ id: enrollments.id }).from(enrollments)
      .where(eq(enrollments.userId, referrer.id));
    ok("free reward enrollment created", freeEnr.length === 1);

    // idempotency: same payment must not double-earn
    const again = await awardReferralForPurchase({
      referredUserId: referred.id, paymentId: pay.id, amountCents: 999900, tenantId: t.id,
    });
    ok("idempotent: no double earn on same payment", again === null);

    // ---- 2. REDEMPTION MATH (no negative order) ----
    const m = computeRedeemable({ pointsBalance: 499, cartCents: 999900, redeemMaxPercent: 50 });
    ok("redeemable = 499 pts (≤50% cap, ≤cart)", m.points === 499 && m.discountCents === 49900);
    const tiny = computeRedeemable({ pointsBalance: 100000, cartCents: 5000, redeemMaxPercent: 50 });
    ok("never exceeds cart (no negative order)", tiny.discountCents <= 5000);

    const redeemed = await redeemPointsAtCheckout({
      userId: referrer.id, tenantId: t.id, paymentId: pay.id, cartCents: 999900,
    });
    ok("redeem applied 499 pts / ₹499", redeemed.points === 499 && redeemed.discountCents === 49900);
    const [rb] = await db.select({ bal: users.pointsBalance }).from(users).where(eq(users.id, referrer.id));
    ok("balance after redeem = 0", rb.bal === 0);

    // ---- 3. EXPIRY (FIFO, 12-month) ----
    // fresh lot, backdated past expiry, no consumption
    const [ru2] = await db.insert(users).values({
      clerkId: `zz_exp_${Math.random().toString(36).slice(2,10)}`,
      email: `zzexp-${Math.random().toString(36).slice(2,8)}@t.test`,
      role: "STUDENT", tenantId: t.id, pointsBalance: 300,
    }).returning({ id: users.id });
    const past = new Date(); past.setFullYear(past.getFullYear() - 2);
    await db.insert(pointsTransactions).values({
      userId: ru2.id, tenantId: t.id, type: "EARNED_REFERRAL",
      pointsDelta: 300, note: "old lot", expiresAt: past,
    });
    const exp = await expireOldPoints();
    ok("expiry job ran & expired the old lot", exp.expiredPoints >= 300);
    const [eb] = await db.select({ bal: users.pointsBalance }).from(users).where(eq(users.id, ru2.id));
    ok("expired user balance floored to 0", eb.bal === 0);
  } finally {
    // ---- teardown (reverse FK order) ----
    const us = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, t.id));
    const uids = us.map((x) => x.id);
    await db.delete(pointsTransactions).where(eq(pointsTransactions.tenantId, t.id));
    await db.delete(referrals).where(eq(referrals.tenantId, t.id));
    await db.delete(tierRewards).where(eq(tierRewards.tenantId, t.id));
    await db.delete(payments).where(eq(payments.tenantId, t.id));
    if (uids.length) await db.delete(enrollments).where(inArray(enrollments.userId, uids));
    await db.delete(enrollments).where(eq(enrollments.id, enr.id));
    if (uids.length) await db.delete(users).where(inArray(users.id, uids));
    await db.delete(programs).where(eq(programs.tenantId, t.id));
    await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    console.log("\n(cleanup done — throwaway tenant removed)");
  }

  console.log(`\n${pass ? "✓ PASS — referral lifecycle correct (earn/tier/redeem/expire, idempotent, no negative order)" : "✗ FAIL"}`);
  if (!pass) process.exit(1);
}
run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
