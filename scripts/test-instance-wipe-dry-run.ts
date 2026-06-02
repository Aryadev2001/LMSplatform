/**
 * Dry-run for wiping users (and their cascading data) that were created
 * under the dev/test Clerk instance. After cutover to production Clerk,
 * every row in `users` has a `clerkId` issued by a now-defunct app — none
 * of those IDs will match a session from the live instance.
 *
 * Read-only. Reports counts per role and previews the cascade impact so
 * the destructive script can be authored against exact numbers.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db/client";

async function rawCount(table: string, where?: string) {
  const q = where
    ? `select count(*)::int as n from ${table} where ${where}`
    : `select count(*)::int as n from ${table}`;
  const res = await db.execute(sql.raw(q));
  // drizzle-orm/neon-http returns rows on .rows
  const rows = (res as unknown as { rows: Array<{ n: number }> }).rows ?? [];
  return rows[0]?.n ?? 0;
}

async function main() {
  console.log("\n\x1b[1m═══ Users in DB ═══\x1b[0m");
  const roles = ["student", "STUDENT", "admin", "TENANT_ADMIN", "INSTRUCTOR", "SUPER_OWNER", "SUPER_STAFF", "SUPER_SUPPORT", "coach"];
  for (const r of roles) {
    const n = await rawCount("users", `role = '${r}'`);
    if (n > 0) console.log(`  ${r.padEnd(18)} ${n}`);
  }
  const total = await rawCount("users");
  console.log(`  \x1b[1mTOTAL              ${total}\x1b[0m`);

  console.log("\n\x1b[1m═══ Cascade impact (rows that reference users) ═══\x1b[0m");
  const tablesUserId = [
    "students",
    "enrollments",
    "payments",
    "audit_log",
    "lesson_progress",
    "course_reviews",
    "orders",
    "carts",
    "cart_items",
    "wishlists",
    "wishlist_items",
    "referrals",
    "referral_codes",
    "points_ledger",
    "course_questions",
    "course_answers",
    "exam_attempts",
    "exam_attempt_answers",
    "certificates",
  ];
  for (const t of tablesUserId) {
    try {
      const n = await rawCount(t);
      console.log(`  ${t.padEnd(24)} ${n}`);
    } catch {
      // table doesn't exist in this schema — skip silently
    }
  }

  console.log("\n\x1b[1m═══ Super-admin emails (to bootstrap after re-signup on live Clerk) ═══\x1b[0m");
  const supersRes = await db.execute(
    sql.raw(
      "select email, role, full_name, created_at from users where role in ('SUPER_OWNER','SUPER_STAFF','SUPER_SUPPORT','admin') order by created_at asc",
    ),
  );
  const supers = (supersRes as unknown as { rows: Array<{ email: string; role: string; full_name: string | null; created_at: string }> }).rows ?? [];
  for (const u of supers) {
    console.log(`  ${u.email.padEnd(36)} ${u.role.padEnd(14)} ${u.full_name ?? "(no name)"}`);
  }

  console.log("\n\x1b[1m═══ Tenant admins (partners) — these run institutes ═══\x1b[0m");
  const adminsRes = await db.execute(
    sql.raw(
      "select u.email, u.role, t.name as tenant from users u left join tenants t on t.id = u.tenant_id where u.role in ('TENANT_ADMIN','admin') and u.role not in ('SUPER_OWNER','SUPER_STAFF','SUPER_SUPPORT') order by t.name nulls last",
    ),
  );
  const admins = (adminsRes as unknown as { rows: Array<{ email: string; role: string; tenant: string | null }> }).rows ?? [];
  for (const u of admins) {
    console.log(`  ${u.email.padEnd(36)} ${u.role.padEnd(14)} ${u.tenant ?? "(no tenant)"}`);
  }

  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
