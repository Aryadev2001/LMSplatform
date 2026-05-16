/**
 * Applies a drizzle SQL migration file statement-by-statement in autocommit
 * (no wrapping transaction) so `ALTER TYPE ... ADD VALUE` is safe.
 * Usage: tsx scripts/apply-migration.ts drizzle/0001_phase7_multitenant.sql
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/db/client";
import { sql } from "drizzle-orm";

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error("Pass the .sql file path");
    process.exit(1);
  }
  const raw = readFileSync(file, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Applying ${statements.length} statements from ${file}\n`);
  let ok = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].replace(/;\s*$/, "");
    const label = stmt.split("\n")[0].slice(0, 90);
    try {
      await db.execute(sql.raw(stmt));
      ok++;
      console.log(`  [${i + 1}/${statements.length}] OK  ${label}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // "already exists" = idempotent re-run; treat as non-fatal
      if (/already exists|duplicate/i.test(msg)) {
        console.log(`  [${i + 1}/${statements.length}] SKIP (exists)  ${label}`);
        ok++;
      } else {
        console.error(`  [${i + 1}/${statements.length}] FAIL  ${label}`);
        console.error(`      → ${msg}`);
        process.exit(1);
      }
    }
  }
  console.log(`\n✓ Applied ${ok}/${statements.length} statements.`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
