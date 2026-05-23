/**
 * Pre-launch readiness audit. Read-only. Reports:
 *   - User & content counts (real signups, tenants, courses, payments)
 *   - Critical config hints (env vars that smell wrong)
 *   - Migration sanity (latest migration ID)
 *   - Real-user profile completeness (phone-verified, T&C accepted)
 *
 * Run before onboarding a real client:
 *   npx dotenv -e .env.local -- tsx scripts/preflight-audit.ts
 */
import "dotenv/config";
import { eq, desc, inArray, ne, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import {
  users,
  students,
  tenants,
  programs,
  enrollments,
  payments,
  courseReviews,
} from "../src/db/schema";

function ok(label: string, value: string) {
  console.log(`  \x1b[32m✓\x1b[0m ${label.padEnd(38)} ${value}`);
}
function warn(label: string, value: string) {
  console.log(`  \x1b[33m⚠\x1b[0m ${label.padEnd(38)} ${value}`);
}
function fail(label: string, value: string) {
  console.log(`  \x1b[31m✗\x1b[0m ${label.padEnd(38)} ${value}`);
}
function section(t: string) {
  console.log(`\n\x1b[1m${t}\x1b[0m`);
}

async function main() {
  // ── Section: environment
  section("Environment");
  const env = (k: string, opt = false) => {
    const v = process.env[k];
    if (v) ok(k, "set");
    else if (opt) warn(k, "NOT set (optional)");
    else fail(k, "NOT set");
  };
  env("DATABASE_URL");
  if (
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("-pooler")
  ) {
    warn("DATABASE_URL pooler", "host has no '-pooler' — using direct endpoint");
  }
  env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  env("CLERK_SECRET_KEY");
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")) {
    warn("Clerk environment", "using TEST keys (pk_test_…) — switch to pk_live_ for prod");
  }
  env("NEXT_PUBLIC_APP_URL");
  env("NEXT_PUBLIC_ROOT_DOMAIN");
  env("APP_ENCRYPTION_KEY");
  env("BLOB_READ_WRITE_TOKEN");
  env("STRIPE_PLATFORM_SECRET_KEY", true);
  env("STRIPE_PLATFORM_WEBHOOK_SECRET", true);
  env("STRIPE_PRICE_STANDARD", true);
  env("STRIPE_PRICE_PREMIUM", true);
  env("RESEND_API_KEY", true);
  env("SENTRY_DSN", true);

  // ── Section: data sanity
  section("Data sanity");
  const [{ n: tenantCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tenants)
    .where(ne(tenants.status, "SUSPENDED"));
  ok("Active tenants", String(tenantCount));

  const [{ n: pubCourseCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(programs)
    .where(
      sql`status = 'published' AND is_active = true AND tenant_id IS NOT NULL`,
    );
  ok("Published+active courses", String(pubCourseCount));

  const [{ n: paidCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(programs)
    .where(sql`status = 'published' AND price_cents > 0`);
  if (Number(paidCount) === 0)
    warn("Paid courses", "0 — marketplace will look free-only");
  else ok("Paid published courses", String(paidCount));

  const [{ n: realLearnerCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(
      sql`role IN ('student','STUDENT') AND email NOT LIKE 'seed.learner.%'`,
    );
  ok("Real (non-seed) learners", String(realLearnerCount));

  const [{ n: paidPaymentCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(payments)
    .where(sql`status = 'succeeded'`);
  ok("Successful payments (all-time)", String(paidPaymentCount));

  const [{ n: reviewCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(courseReviews)
    .where(sql`hidden_at IS NULL`);
  ok("Visible reviews", String(reviewCount));

  // ── Section: profile + verification gaps for real learners
  section("Real-learner profile completeness");
  const reals = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(
      sql`role IN ('student','STUDENT') AND email NOT LIKE 'seed.learner.%' AND email NOT LIKE '%@ozsaip.com' AND email NOT LIKE '%@okcpress.com'`,
    )
    .orderBy(desc(users.createdAt))
    .limit(20);

  if (reals.length === 0) {
    warn("Real learners", "none signed up yet");
  } else {
    for (const u of reals) {
      const [s] = await db
        .select()
        .from(students)
        .where(eq(students.userId, u.id))
        .limit(1);
      const enr = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          inArray(enrollments.status, ["paid", "account_created", "assigned"]),
        );
      const flags: string[] = [];
      if (!s) flags.push("NO students row");
      else {
        if (!s.profileCompletedAt) flags.push("profile incomplete");
        if (!s.phoneVerifiedAt) flags.push("phone unverified");
        if (!s.termsAcceptedAt) flags.push("T&C not accepted");
        if (!s.disclaimerAcceptedAt) flags.push("disclaimer not accepted");
      }
      const hasPaid = enr.length > 0;
      const summary =
        flags.length === 0
          ? hasPaid
            ? "FULL ✓ + paid"
            : "FULL ✓ (no purchase yet)"
          : flags.join(", ");
      const fn = u.fullName ?? "(no name)";
      console.log(`  • ${u.email.padEnd(40)} ${fn.padEnd(22)} ${summary}`);
    }
  }

  // ── Section: migrations
  section("Migrations");
  const { readdirSync } = await import("node:fs");
  const files = readdirSync("./drizzle")
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
  ok("Migration files on disk", String(files.length));
  console.log(`  Latest: ${files[files.length - 1] ?? "(none)"}`);

  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
