import { sql } from "drizzle-orm";
import { db } from "../src/db/client";

async function main() {
  const r1 = await db.execute(sql`
    UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug='edt' LIMIT 1)
    WHERE role IN ('student','STUDENT','coach') AND tenant_id IS NULL
  `);
  console.log("learners reassigned to edt:", (r1 as { rowCount?: number }).rowCount);

  const r2 = await db.execute(sql`
    UPDATE tenants SET brand_primary_color='#8CC63F', brand_secondary_color='#1AADE0'
    WHERE slug='edt'
  `);
  console.log("reset edt brand colors:", (r2 as { rowCount?: number }).rowCount);
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
