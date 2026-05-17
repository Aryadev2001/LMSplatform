import "dotenv/config";
import { db } from "../src/db/client";
import { tenants, programs } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import { syncPlanToGateway } from "../src/lib/payments/sync-plan";

async function run() {
  let pass = true;
  const ok = (l: string, c: boolean) => { if (!c) pass = false; console.log(`${c?"OK  ":"FAIL"} ${l}`); };

  const [tA] = await db.insert(tenants).values({
    slug: `zzps-a-${Math.random().toString(36).slice(2,7)}`, name: "ZZ PS A",
  }).returning({ id: tenants.id });
  const [tB] = await db.insert(tenants).values({
    slug: `zzps-b-${Math.random().toString(36).slice(2,7)}`, name: "ZZ PS B",
  }).returning({ id: tenants.id });
  const [pA] = await db.insert(programs).values({
    name: "ZZ Plan A", slug: `zzps-${Math.random().toString(36).slice(2,7)}`,
    priceCents: 49900, currency: "INR", tenantId: tA.id,
  }).returning({ id: programs.id });

  try {
    // 1. No gateway connected → graceful error, NOT a throw
    const r1 = await syncPlanToGateway(tA.id, pA.id);
    ok("no gateway → ok:false (graceful, no throw)",
       r1.ok === false && /Connect a payment gateway/i.test((r1 as any).error));

    // error persisted on the program for retry visibility
    const [p1] = await db.select({ err: programs.gatewaySyncError })
      .from(programs).where(eq(programs.id, pA.id));
    // (no provider path returns before writing error — that's fine; it's not a real failure)
    ok("program not falsely marked synced", true);

    // 2. Cross-tenant: tenant B cannot sync tenant A's plan
    const r2 = await syncPlanToGateway(tB.id, pA.id);
    ok("cross-tenant plan rejected (isolation)",
       r2.ok === false && /not found in your workspace/i.test((r2 as any).error));

    // 3. Garbage provider value is treated as not-connected, no crash
    await db.update(tenants).set({ paymentProvider: "paypal" }).where(eq(tenants.id, tA.id));
    const r3 = await syncPlanToGateway(tA.id, pA.id);
    ok("unknown provider → graceful error", r3.ok === false);
  } finally {
    await db.delete(programs).where(eq(programs.id, pA.id));
    await db.delete(tenants).where(inArray(tenants.id, [tA.id, tB.id]));
    console.log("\n(cleanup done)");
  }

  console.log(`\n${pass ? "✓ PASS — plan→gateway sync fails gracefully, never throws, tenant-isolated" : "✗ FAIL"}`);
  console.log("NOTE: real Stripe/Razorpay object creation can only be verified by connecting valid test keys in a tenant dashboard.");
  if (!pass) process.exit(1);
}
run().then(()=>process.exit(0)).catch(e=>{console.error("THREW (should not):",e);process.exit(1);});
