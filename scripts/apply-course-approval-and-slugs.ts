/**
 * One-off, idempotent migration for the course-approval + slug fixes.
 *
 * The drizzle migration journal is out of sync with the live DB (the team
 * provisions schema via `db:push`, not migrate), so a generated migration
 * would try to recreate existing tables. Instead we apply ONLY the two new
 * columns directly, then backfill:
 *
 *   1. ADD COLUMN approved_at / approved_by   (the super-admin approval gate)
 *   2. Backfill slugs for any tenant course with a NULL/empty slug — a
 *      slugless course's storefront card linked to /sign-in (the
 *      "enroll → login" bug).
 *   3. Grandfather EXISTING published courses (approved_at = now()) so the
 *      new gate doesn't yank currently-live courses offline. New courses
 *      created after this point start unapproved and require review.
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/apply-course-approval-and-slugs.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db/client";

async function main() {
  console.log("1/4  Adding approval columns (idempotent)…");
  await db.execute(
    sql`ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone`,
  );
  await db.execute(
    sql`ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "approved_by" uuid`,
  );

  console.log("2/4  Backfilling slugs for slugless tenant courses…");
  const slugged = await db.execute(sql`
    UPDATE "programs"
    SET "slug" = NULLIF(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), '') || '-' || substr("id"::text, 1, 8)
    WHERE ("slug" IS NULL OR "slug" = '')
      AND "tenant_id" IS NOT NULL
  `);
  console.log(`      slugs written: ${slugged.rowCount ?? 0}`);

  console.log("3/4  Grandfathering existing published courses as approved…");
  const approved = await db.execute(sql`
    UPDATE "programs"
    SET "approved_at" = now()
    WHERE "approved_at" IS NULL
      AND "status" = 'published'
      AND "tenant_id" IS NOT NULL
  `);
  console.log(`      courses grandfathered: ${approved.rowCount ?? 0}`);

  console.log("4/4  Verifying — any remaining slugless tenant courses?");
  const remaining = await db.execute(sql`
    SELECT count(*)::int AS n FROM "programs"
    WHERE ("slug" IS NULL OR "slug" = '') AND "tenant_id" IS NOT NULL
  `);
  console.log(`      remaining slugless: ${(remaining.rows?.[0] as { n: number })?.n ?? "?"}`);

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
