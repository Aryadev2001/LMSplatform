import "dotenv/config";
import { db } from "../src/db/client";
import { tenants, users, programs, payments } from "../src/db/schema";
import { sql, isNull, and, ne, eq } from "drizzle-orm";

async function run() {
  console.log("\n=== Phase-7 backfill verification ===\n");

  const t = await db.select().from(tenants);
  console.log(`Tenants (${t.length}):`);
  t.forEach((x) => console.log(`  ${x.slug} | ${x.name} | ${x.status} | id=${x.id}`));

  const u = await db
    .select({
      email: users.email,
      role: users.role,
      tenantId: users.tenantId,
      ref: users.referralCode,
    })
    .from(users);
  console.log(`\nUsers (${u.length}):`);
  u.forEach((x) =>
    console.log(
      `  ${x.email} | role=${x.role} | tenant=${x.tenantId ? "edt" : "NULL"} | ref=${x.ref ?? "-"}`,
    ),
  );

  const [{ pc }] = await db
    .select({ pc: sql<number>`count(*)::int` })
    .from(programs);
  // NULL tenantId is valid ONLY for master courses (P7-7). A non-master
  // program with no tenant is the actual bug we're guarding against.
  const [{ pNull }] = await db
    .select({ pNull: sql<number>`count(*)::int` })
    .from(programs)
    .where(and(isNull(programs.tenantId), eq(programs.isMasterCourse, false)));
  const [{ payc }] = await db.select({ payc: sql<number>`count(*)::int` }).from(payments);
  const [{ payNull }] = await db
    .select({ payNull: sql<number>`count(*)::int` })
    .from(payments)
    .where(isNull(payments.tenantId));

  console.log(`\nScoping:`);
  console.log(`  programs: ${pc} total, ${pNull} non-master with NULL tenantId (expect 0)`);
  console.log(`  payments: ${payc} total, ${payNull} with NULL tenantId (expect 0)`);

  // Regression checks
  const [{ orphanUsers }] = await db
    .select({ orphanUsers: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        isNull(users.tenantId),
        ne(users.role, "SUPER_OWNER"),
        ne(users.role, "SUPER_STAFF"),
        ne(users.role, "SUPER_SUPPORT"),
      ),
    );
  console.log(
    `  non-super users with NULL tenantId: ${orphanUsers} (expect 0 — only super users are tenant-less)`,
  );

  // Post go-live the platform is multi-tenant; "exactly one tenant" is no
  // longer an invariant. What must hold: the founding 'edt' tenant exists.
  const pass =
    t.some((x) => x.slug === "edt") &&
    pNull === 0 &&
    payNull === 0 &&
    orphanUsers === 0 &&
    u.some((x) => x.email === "aryaabinash2001@gmail.com" && x.role === "TENANT_ADMIN" && x.tenantId) &&
    u.some((x) => x.email === "arya@closerx.ai" && x.role === "SUPER_OWNER" && !x.tenantId);

  console.log(`\n${pass ? "✓ PASS — backfill correct, no orphans, roles + scoping right" : "✗ FAIL — review above"}\n`);
  if (!pass) process.exit(1);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
