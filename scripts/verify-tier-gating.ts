/**
 * Read-only verification of the partner tier-gating against LIVE data.
 * Mirrors hasFeatureFor() for the two new Standard+ features and prints the
 * locked/unlocked decision for every real tenant — so we can confirm Basic
 * tenants are gated and Standard/Premium (or overridden) tenants are not.
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/verify-tier-gating.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db/client";

const ORDER: Record<string, number> = { basic: 0, standard: 1, premium: 2 };
// Both new features unlock at Standard.
function unlocked(
  tier: string,
  overrides: Record<string, boolean | null | undefined>,
  feature: string,
): boolean {
  const ex = overrides?.[feature];
  if (ex === true) return true;
  if (ex === false) return false;
  return (ORDER[tier] ?? 0) >= ORDER["standard"];
}

async function main() {
  const rows = await db.execute(sql`
    SELECT id, name, slug, tier, COALESCE(feature_overrides, '{}'::jsonb) AS ov
    FROM tenants ORDER BY created_at
  `);
  const tenants = (rows.rows ?? rows) as Array<{
    name: string; slug: string; tier: string; ov: Record<string, boolean>;
  }>;

  console.log(`Tenants: ${tenants.length}\n`);
  console.log(
    "TIER".padEnd(9) +
      "PAID_COURSES".padEnd(14) +
      "STUDENT_DETAILS".padEnd(17) +
      "NAME",
  );
  console.log("-".repeat(70));
  for (const t of tenants) {
    const ov = (t.ov ?? {}) as Record<string, boolean>;
    const paid = unlocked(t.tier, ov, "paid_courses") ? "unlocked" : "LOCKED";
    const det = unlocked(t.tier, ov, "student_details") ? "unlocked" : "LOCKED";
    console.log(
      String(t.tier).padEnd(9) +
        paid.padEnd(14) +
        det.padEnd(17) +
        `${t.name} (${t.slug})`,
    );
  }
  console.log(
    "\nExpected: basic → LOCKED on both; standard/premium (or override) → unlocked.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
