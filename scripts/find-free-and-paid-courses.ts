/**
 * Find one free + one paid published course for smoke-testing the
 * EnrollNowButton on production. Read-only.
 */
import "dotenv/config";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { programs, tenants } from "../src/db/schema";

async function main() {
  const free = await db
    .select({
      slug: programs.slug,
      name: programs.name,
      tenantSlug: tenants.slug,
      priceCents: programs.priceCents,
    })
    .from(programs)
    .innerJoin(tenants, eq(programs.tenantId, tenants.id))
    .where(
      and(
        eq(programs.status, "published"),
        sql`${programs.priceCents} = 0`,
        sql`${programs.requiresApplication} = false`,
        sql`${tenants.status} != 'SUSPENDED'`,
      ),
    )
    .orderBy(asc(programs.name))
    .limit(3);

  const paid = await db
    .select({
      slug: programs.slug,
      name: programs.name,
      tenantSlug: tenants.slug,
      priceCents: programs.priceCents,
    })
    .from(programs)
    .innerJoin(tenants, eq(programs.tenantId, tenants.id))
    .where(
      and(
        eq(programs.status, "published"),
        sql`${programs.priceCents} > 0`,
        sql`${programs.requiresApplication} = false`,
        sql`${tenants.status} != 'SUSPENDED'`,
      ),
    )
    .orderBy(asc(programs.name))
    .limit(3);

  console.log("\nFREE published courses:");
  for (const c of free) {
    console.log(`  /courses/${c.slug}  [${c.tenantSlug}]  ${c.name}`);
  }
  console.log("\nPAID published courses:");
  for (const c of paid) {
    console.log(
      `  /courses/${c.slug}  [${c.tenantSlug}]  ${c.name}  (${c.priceCents}¢)`,
    );
  }
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
