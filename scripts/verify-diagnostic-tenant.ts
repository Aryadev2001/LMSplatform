import "dotenv/config";
import { db } from "../src/db/client";
import { tenants, users, diagnosticSubmissions } from "../src/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

async function run() {
  let pass = true;
  const ok = (l: string, c: boolean) => { if (!c) pass = false; console.log(`${c ? "OK  " : "FAIL"} ${l}`); };

  // 1. backfill complete — no NULL tenant_id remains
  const [{ nulls }] = await db
    .select({ nulls: sql<number>`count(*)::int` })
    .from(diagnosticSubmissions)
    .where(isNull(diagnosticSubmissions.tenantId));
  ok(`no NULL tenant_id remains (got ${nulls})`, nulls === 0);

  // 2. every row points at a real tenant
  const [{ orphans }] = await db
    .select({ orphans: sql<number>`count(*)::int` })
    .from(diagnosticSubmissions)
    .leftJoin(tenants, eq(tenants.id, diagnosticSubmissions.tenantId))
    .where(isNull(tenants.id));
  ok(`no row references a missing tenant (got ${orphans})`, orphans === 0);

  // 3. cross-tenant isolation on the NEW column (2 throwaway tenants)
  const mk = async (tag: string) => {
    const [t] = await db.insert(tenants).values({
      slug: `zzdx-${tag}-${Math.random().toString(36).slice(2,7)}`, name: `ZZ DX ${tag}`,
    }).returning({ id: tenants.id });
    const [d] = await db.insert(diagnosticSubmissions).values({
      tenantId: t.id, email: `zzdx-${tag}@t.test`, name: `ZZ ${tag}`,
      answers: {}, layerScores: {}, businessHealthScore: 50,
      stage: "growth", topBottlenecks: [], firmographics: {},
    }).returning({ id: diagnosticSubmissions.id });
    return { tId: t.id, dId: d.id };
  };
  const A = await mk("A");
  const B = await mk("B");
  try {
    const aRows = await db.select({ id: diagnosticSubmissions.id })
      .from(diagnosticSubmissions)
      .where(eq(diagnosticSubmissions.tenantId, A.tId));
    ok("A's diagnostics query returns only A, excludes B",
       aRows.length === 1 && aRows[0].id === A.dId && !aRows.some(r => r.id === B.dId));
    const bRows = await db.select({ id: diagnosticSubmissions.id })
      .from(diagnosticSubmissions)
      .where(eq(diagnosticSubmissions.tenantId, B.tId));
    ok("symmetry: B excludes A",
       bRows.length === 1 && bRows[0].id === B.dId && !bRows.some(r => r.id === A.dId));

    // anonymous (userId NULL) row is still tenant-attributed → visible to its tenant
    const [anon] = await db.select({ uid: diagnosticSubmissions.userId, tid: diagnosticSubmissions.tenantId })
      .from(diagnosticSubmissions).where(eq(diagnosticSubmissions.id, A.dId));
    ok("anonymous lead (no userId) is tenant-attributed", anon.uid === null && anon.tid === A.tId);
  } finally {
    await db.delete(diagnosticSubmissions).where(eq(diagnosticSubmissions.id, A.dId));
    await db.delete(diagnosticSubmissions).where(eq(diagnosticSubmissions.id, B.dId));
    await db.delete(tenants).where(eq(tenants.id, A.tId));
    await db.delete(tenants).where(eq(tenants.id, B.tId));
    console.log("\n(cleanup done)");
  }

  console.log(`\n${pass ? "✓ PASS — diagnostic_submissions tenant-scoped, backfilled, isolated, anon-attributed" : "✗ FAIL"}`);
  if (!pass) process.exit(1);
}
run().then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1);});
