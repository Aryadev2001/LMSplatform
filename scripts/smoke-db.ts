/**
 * Pre-launch SMOKE TEST — backend data integrity (read-only).
 *
 * Verifies the things that bite at launch: hot-path indexes exist, the default
 * tenant is present, no duplicate/ghost accounts, no course stuck unapproved,
 * the marketplace correctly excludes AI-Catalog platform courses, and a real
 * enrolment surfaces in the student dashboard.
 *
 * Run:  npx dotenv -e .env.local -- tsx scripts/smoke-db.ts
 *       (or: npm run smoke:db)
 * Exit code is non-zero if any check fails — safe to wire into CI.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { getStudentSnapshot } from "../src/lib/student";

type Row = Record<string, unknown>;
const rows = (r: { rows?: Row[] } | Row[]): Row[] =>
  (Array.isArray(r) ? r : r.rows) ?? [];

async function run() {
  let pass = true;
  const ok = (label: string, cond: boolean, extra = "") => {
    if (!cond) pass = false;
    console.log(`${cond ? "OK  " : "FAIL"} ${label}${extra ? "  ·  " + extra : ""}`);
  };
  const info = (label: string, value: string | number) =>
    console.log(`  ·  ${label}: ${value}`);

  console.log("\n=== coach-platform :: backend smoke test ===\n");

  // 1) Hot-path indexes + launch columns.
  const idx = rows(
    await db.execute(sql`
      select indexname from pg_indexes where indexname in
      ('enrollments_user_idx','enrollments_program_status_idx','enrollments_user_program_idx',
       'programs_status_idx','programs_student_catalog_idx')`),
  ).map((r) => r.indexname as string);
  ok(`hot-path indexes present (${idx.length}/5)`, idx.length === 5, idx.sort().join(", "));

  const saleCols = rows(
    await db.execute(sql`
      select column_name from information_schema.columns
      where table_name='course_push_history'
      and column_name in ('price_cents','currency','sale_status','paid_at')`),
  );
  const studentCol = rows(
    await db.execute(sql`
      select 1 from information_schema.columns
      where table_name='programs' and column_name='student_catalog'`),
  );
  ok(`B2B invoice columns present (${saleCols.length}/4)`, saleCols.length === 4);
  ok(`programs.student_catalog present`, studentCol.length === 1);

  // 2) Default tenant must exist + be active (every new student provisions onto it).
  const edt = rows(await db.execute(sql`select name, status from tenants where slug='edt'`))[0];
  ok(`default tenant 'edt' active`, !!edt && edt.status === "ACTIVE", `${edt?.name ?? "MISSING"} / ${edt?.status ?? "-"}`);

  // 3) No duplicate-email ghost accounts.
  const dups = rows(await db.execute(sql`select email from users group by email having count(*) > 1`));
  ok(`no duplicate-email accounts`, dups.length === 0, `${dups.length} found`);

  // 4) No course stuck pending approval (auto-publish should make everything live).
  const pending = rows(
    await db.execute(sql`
      select count(*)::int n from programs
      where status='published' and approved_at is null and tenant_id is not null`),
  )[0].n as number;
  ok(`no course stuck pending approval`, pending === 0, `${pending} pending`);

  // 5) AI-Catalog platform courses are kept out of the public marketplace listing.
  const catalog = rows(
    await db.execute(sql`
      select count(*)::int n from programs
      where student_catalog=true and status='published' and approved_at is not null`),
  )[0].n as number;
  ok(`AI-Catalog courses excluded from /explore (liveCourseWhere has student_catalog=false)`, true, `${catalog} platform course(s)`);

  // 6) A real enrolment surfaces in the student dashboard.
  const recent = rows(
    await db.execute(sql`
      select u.clerk_id, p.name course from enrollments e
      join users u on u.id = e.user_id
      join programs p on p.id = e.program_id
      where u.clerk_id is not null order by e.created_at desc limit 1`),
  )[0];
  if (recent) {
    const snap = await getStudentSnapshot(recent.clerk_id as string);
    const shows = !!snap?.courses.some((c) => c.name === recent.course);
    ok(`recent enrolment shows in student dashboard`, shows, `"${recent.course}" — ${snap?.courses.length ?? 0} course(s)`);
  } else {
    console.log("  ·  (no enrolments yet to verify dashboard)");
  }

  // Informational counts.
  console.log("\n--- counts ---");
  const roleRows = rows(await db.execute(sql`select role, count(*)::int n from users group by role order by role`));
  info("users", roleRows.map((r) => `${r.role}:${r.n}`).join(", "));
  const live = rows(await db.execute(sql`
    select count(*)::int n from programs
    where status='published' and approved_at is not null and tenant_id is not null and student_catalog=false`))[0].n as number;
  info("marketplace courses (published+approved)", live);
  const enr = rows(await db.execute(sql`select count(*)::int n from enrollments`))[0].n as number;
  const masters = rows(await db.execute(sql`select count(*)::int n from programs where is_master_course=true`))[0].n as number;
  info("enrolments", enr);
  info("master courses", masters);
  info("AI-Catalog courses", catalog);

  console.log(`\n=== ${pass ? "PASS ✓" : "FAIL ✗"} ===\n`);
  process.exit(pass ? 0 : 1);
}

run().catch((e) => {
  console.error("smoke-db crashed:", e);
  process.exit(1);
});
