/**
 * Phase-7 data backfill.
 *   DRY RUN (default): npx tsx scripts/backfill-tenant.ts
 *   APPLY:             APPLY=1 SUPER_OWNER_EMAIL=you@x.com npx tsx scripts/backfill-tenant.ts
 *
 * Steps (exactly as the spec sequences them):
 *  1. Create the "edt" Tenant from existing data.
 *  2. Backfill tenantId on users / programs / payments → edt tenant.
 *  3. Remap roles: admin → TENANT_ADMIN, student → STUDENT (legacy values stay in enum).
 *  4. Create one SUPER_OWNER from SUPER_OWNER_EMAIL (tenantId NULL).
 *  5. Generate referral codes for every student.
 *  6. currentTier already defaults to NONE.
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { tenants, users, programs, payments } from "../src/db/schema";
import { sql, eq, isNull, and } from "drizzle-orm";

const APPLY = process.env.APPLY === "1";
const SUPER_OWNER_EMAIL = (process.env.SUPER_OWNER_EMAIL ?? "").trim().toLowerCase();
const EDT_SLUG = "edt";

function code(slug: string) {
  const r = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${slug}-${r.slice(0, 6).padEnd(6, "X")}`;
}

async function run() {
  console.log(`\n=== Phase-7 backfill — ${APPLY ? "APPLY" : "DRY RUN"} ===\n`);

  // Counts before
  const [{ uc }] = await db.select({ uc: sql<number>`count(*)::int` }).from(users);
  const [{ pc }] = await db.select({ pc: sql<number>`count(*)::int` }).from(programs);
  const [{ payc }] = await db.select({ payc: sql<number>`count(*)::int` }).from(payments);
  const [{ adminc }] = await db
    .select({ adminc: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "admin"));
  const [{ studc }] = await db
    .select({ studc: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "student"));

  console.log("Current data:");
  console.log(`  users=${uc} (admin=${adminc}, student=${studc})  programs=${pc}  payments=${payc}`);

  const existingEdt = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, EDT_SLUG))
    .limit(1);

  console.log("\nPlanned actions:");
  console.log(
    `  1. ${existingEdt.length ? "EDT tenant EXISTS — reuse" : 'CREATE tenant slug="edt" (Euro Digital Technologies)'}`,
  );
  console.log(`  2. Set tenantId=edt on ${uc} users, ${pc} programs, ${payc} payments`);
  console.log(`  3. Remap role: ${adminc} admin→TENANT_ADMIN, ${studc} student→STUDENT`);
  console.log(
    `  4. SUPER_OWNER: ${SUPER_OWNER_EMAIL || "(none provided — will SKIP; set SUPER_OWNER_EMAIL)"}`,
  );
  console.log(`  5. Generate referral codes for ${studc} students (where missing)`);

  if (!APPLY) {
    console.log(`\n(DRY RUN — nothing changed. Re-run with APPLY=1 SUPER_OWNER_EMAIL=... )\n`);
    return;
  }

  // ---- APPLY ----
  let tenantId: string;
  if (existingEdt.length) {
    tenantId = existingEdt[0].id;
  } else {
    const [t] = await db
      .insert(tenants)
      .values({
        slug: EDT_SLUG,
        name: "Euro Digital Technologies",
        brandPrimaryColor: "#8CC63F",
        brandSecondaryColor: "#1AADE0",
        status: "ACTIVE",
      })
      .returning({ id: tenants.id });
    tenantId = t.id;
  }
  console.log(`\nEDT tenant id: ${tenantId}`);

  await db.update(programs).set({ tenantId }).where(isNull(programs.tenantId));
  await db.update(payments).set({ tenantId }).where(isNull(payments.tenantId));
  // users: everyone except future SUPER_* gets the edt tenant
  await db.update(users).set({ tenantId }).where(isNull(users.tenantId));

  await db.update(users).set({ role: "TENANT_ADMIN" }).where(eq(users.role, "admin"));
  await db.update(users).set({ role: "STUDENT" }).where(eq(users.role, "student"));
  // Legacy 'coach' test accounts → STUDENT in the edt tenant
  await db.update(users).set({ role: "STUDENT" }).where(eq(users.role, "coach"));

  // Referral codes for students missing one
  const studentsNoCode = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "STUDENT"), isNull(users.referralCode)));
  for (const s of studentsNoCode) {
    await db.update(users).set({ referralCode: code(EDT_SLUG) }).where(eq(users.id, s.id));
  }
  console.log(`Generated ${studentsNoCode.length} referral codes`);

  // SUPER_OWNER
  if (SUPER_OWNER_EMAIL) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, SUPER_OWNER_EMAIL))
      .limit(1);
    if (existing.length) {
      await db
        .update(users)
        .set({ role: "SUPER_OWNER", isSuperAdmin: true, tenantId: null })
        .where(eq(users.id, existing[0].id));
      console.log(`Promoted existing user ${SUPER_OWNER_EMAIL} → SUPER_OWNER (tenantId cleared)`);
    } else {
      console.log(
        `NOTE: ${SUPER_OWNER_EMAIL} has no account yet. Provision via Clerk separately, then re-run to promote, or use the super-admin bootstrap.`,
      );
    }
  }

  console.log(`\n✓ Backfill applied.\n`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
