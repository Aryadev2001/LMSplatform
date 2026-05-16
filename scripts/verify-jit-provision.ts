import "dotenv/config";
import { db } from "../src/db/client";
import { tenants, users } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  isAdminRole, isStudentRole, CANONICAL_ADMIN, CANONICAL_STUDENT,
  normalizeRole, type RawRole,
} from "../src/lib/auth";

const SUPER = ["SUPER_OWNER", "SUPER_STAFF", "SUPER_SUPPORT"];

// Exact replica of the JIT branch decision in getCurrentUser()
function decide(rawMeta: string, metaTenantId: string | null) {
  const canonical: RawRole = isAdminRole(rawMeta)
    ? CANONICAL_ADMIN
    : isStudentRole(rawMeta)
      ? CANONICAL_STUDENT
      : (rawMeta as RawRole);
  const isSuper = SUPER.includes(canonical);
  const tenantId = !isSuper && typeof metaTenantId === "string" ? metaTenantId : null;
  return { canonical, isSuper, tenantId };
}

async function jit(clerkId: string, email: string, rawMeta: string, metaTenantId: string | null) {
  const [existing] = await db.select({ role: users.role, tenantId: users.tenantId })
    .from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (existing) return { ...existing, created: false };
  const { canonical, isSuper, tenantId } = decide(rawMeta, metaTenantId);
  try {
    await db.insert(users).values({
      clerkId, email, fullName: "ZZ JIT", role: canonical, isSuperAdmin: isSuper, tenantId,
    });
  } catch { /* race */ }
  const [row] = await db.select({ role: users.role, tenantId: users.tenantId })
    .from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return { ...row, created: true };
}

async function run() {
  let pass = true;
  const ok = (l: string, c: boolean) => { if (!c) pass = false; console.log(`${c?"OK  ":"FAIL"} ${l}`); };

  const [t] = await db.insert(tenants).values({
    slug: `zzjit-${Math.random().toString(36).slice(2,7)}`, name: "ZZ JIT",
  }).returning({ id: tenants.id });
  const ids = [`zzjit_a_${Date.now()}`, `zzjit_s_${Date.now()}`, `zzjit_o_${Date.now()}`];
  try {
    // invited tenant-admin (legacy lowercase meta + tenantId)
    const a = await jit(ids[0], "zzjit-a@t.test", "admin", t.id);
    ok("admin invite → TENANT_ADMIN, tenant scoped, normalizes to admin",
       a.role === CANONICAL_ADMIN && a.tenantId === t.id && normalizeRole(a.role as RawRole) === "admin");

    // invited student
    const s = await jit(ids[1], "zzjit-s@t.test", "student", t.id);
    ok("student invite → STUDENT, tenant scoped",
       s.role === CANONICAL_STUDENT && s.tenantId === t.id);

    // super invite ignores any tenantId in metadata (stays tenant-less)
    const o = await jit(ids[2], "zzjit-o@t.test", "SUPER_OWNER", t.id);
    ok("super invite → SUPER_OWNER, tenantId NULL even if metadata had one",
       o.role === "SUPER_OWNER" && o.tenantId === null);

    // idempotent: second resolve returns the SAME persisted row, no dupe
    const a2 = await jit(ids[0], "zzjit-a@t.test", "admin", t.id);
    const [{ n }] = await db.select({ n: (await import("drizzle-orm")).sql<number>`count(*)::int` })
      .from(users).where(eq(users.clerkId, ids[0]));
    ok("idempotent: re-resolve, exactly 1 row, unchanged",
       a2.created === false && Number(n) === 1 && a2.tenantId === t.id);
  } finally {
    await db.delete(users).where(inArray(users.clerkId, ids));
    await db.delete(tenants).where(eq(tenants.id, t.id));
    console.log("\n(cleanup done)");
  }
  console.log(`\n${pass ? "✓ PASS — JIT provisioning: invited admins/students get tenant-scoped rows, super stays tenant-less, idempotent" : "✗ FAIL"}`);
  if (!pass) process.exit(1);
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
