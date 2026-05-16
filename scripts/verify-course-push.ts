import "dotenv/config";
import { db } from "../src/db/client";
import { tenants, programs, modules, lessons, coursePushHistory } from "../src/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { promoteToMaster, pushMasterToTenant, syncMasterToAllTenants } from "../src/lib/course-push";

async function run() {
  let pass = true;
  const ok = (l: string, c: boolean) => { if (!c) pass = false; console.log(`${c ? "OK  " : "FAIL"} ${l}`); };

  const [t] = await db.insert(tenants).values({
    slug: `zzcp-${Math.random().toString(36).slice(2,8)}`, name: "ZZ CP Tenant",
  }).returning({ id: tenants.id, slug: tenants.slug });

  // authored source course w/ 2 modules, lessons
  const [src] = await db.insert(programs).values({
    name: "ZZ Source Course", slug: `zz-src-${Math.random().toString(36).slice(2,8)}`,
    priceCents: 500000, tenantId: t.id,
  }).returning({ id: programs.id });
  const [m1] = await db.insert(modules).values({ courseId: src.id, title: "M1", orderIndex: 0 }).returning({ id: modules.id });
  const [m2] = await db.insert(modules).values({ courseId: src.id, title: "M2", orderIndex: 1 }).returning({ id: modules.id });
  await db.insert(lessons).values([
    { moduleId: m1.id, title: "L1", durationSeconds: 60, orderIndex: 0 },
    { moduleId: m1.id, title: "L2", durationSeconds: 90, orderIndex: 1 },
    { moduleId: m2.id, title: "L3", durationSeconds: 30, orderIndex: 0 },
  ]);

  const masterIds: string[] = [];
  const tenantIds = [t.id];
  try {
    // promote → master
    const masterId = await promoteToMaster(src.id);
    masterIds.push(masterId);
    const [master] = await db.select().from(programs).where(eq(programs.id, masterId));
    ok("master created (isMasterCourse, tenantId NULL)", master.isMasterCourse === true && master.tenantId === null);
    const mMods = await db.select().from(modules).where(eq(modules.courseId, masterId));
    ok("master cloned 2 modules", mMods.length === 2);

    // push → tenant
    const r1 = await pushMasterToTenant({ masterId, tenantId: t.id, pushedByUserId: null });
    ok("fresh push (not a sync)", r1.synced === false);
    const [copy] = await db.select().from(programs).where(eq(programs.id, r1.copyId));
    ok("copy scoped to tenant + sourceCourseId=master", copy.tenantId === t.id && copy.sourceCourseId === masterId && copy.isMasterCourse === false);
    const cMods = await db.select().from(modules).where(eq(modules.courseId, copy.id));
    ok("copy has 2 modules", cMods.length === 2);
    const cLessons = await db.select().from(lessons).where(inArray(lessons.moduleId, cMods.map(x=>x.id)));
    ok("copy has 3 lessons (deep clone)", cLessons.length === 3);
    const [ph] = await db.select().from(coursePushHistory).where(and(eq(coursePushHistory.masterCourseId, masterId), eq(coursePushHistory.targetTenantId, t.id)));
    ok("push history recorded", !!ph && ph.copyCourseId === copy.id);

    // tenant edits price + publishes
    await db.update(programs).set({ priceCents: 123456, status: "published", tierUnlockEligible: true }).where(eq(programs.id, copy.id));
    // master structure changes
    await db.update(programs).set({ name: "ZZ Source Course v2" }).where(eq(programs.id, masterId));
    await db.insert(modules).values({ courseId: masterId, title: "M3-new", orderIndex: 2 });

    // sync
    const s = await syncMasterToAllTenants({ masterId, pushedByUserId: null });
    ok("sync touched 1 tenant", s.tenants === 1);
    const [copy2] = await db.select().from(programs).where(eq(programs.id, copy.id));
    ok("sync preserved tenant price", copy2.priceCents === 123456);
    ok("sync preserved tenant publish status", copy2.status === "published");
    ok("sync preserved tierUnlockEligible", copy2.tierUnlockEligible === true);
    ok("sync overwrote structural name", copy2.name === "ZZ Source Course v2");
    const cMods2 = await db.select().from(modules).where(eq(modules.courseId, copy.id));
    ok("sync rebuilt structure (now 3 modules)", cMods2.length === 3);
    const [ph2] = await db.select().from(coursePushHistory).where(and(eq(coursePushHistory.masterCourseId, masterId), eq(coursePushHistory.targetTenantId, t.id)));
    ok("push history syncedAt set", !!ph2.syncedAt);
  } finally {
    await db.delete(coursePushHistory).where(inArray(coursePushHistory.masterCourseId, masterIds));
    // delete tenant copies + source + masters (modules/lessons cascade)
    const progs = await db.select({ id: programs.id }).from(programs).where(eq(programs.tenantId, t.id));
    const pid = progs.map(p=>p.id);
    if (pid.length) await db.delete(programs).where(inArray(programs.id, pid));
    if (masterIds.length) await db.delete(programs).where(inArray(programs.id, masterIds));
    await db.delete(programs).where(eq(programs.id, src.id));
    await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    console.log("\n(cleanup done — throwaway tenant + courses removed)");
  }

  console.log(`\n${pass ? "✓ PASS — push deep-clones; sync rebuilds structure & preserves tenant price/status" : "✗ FAIL"}`);
  if (!pass) process.exit(1);
}
run().then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1);});
