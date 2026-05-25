import "dotenv/config";
import { eq, and, isNotNull, sql, ne } from "drizzle-orm";
import { db } from "../src/db/client";
import { programs, tenants } from "../src/db/schema";

async function main() {
  const rows = await db
    .select({
      courseSlug: programs.slug,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
    })
    .from(programs)
    .innerJoin(tenants, eq(tenants.id, programs.tenantId))
    .where(
      and(
        eq(programs.status, "published"),
        eq(programs.isActive, true),
        isNotNull(programs.slug),
        ne(tenants.status, "SUSPENDED"),
      ),
    )
    .orderBy(sql`random()`)
    .limit(5);

  for (const r of rows) {
    console.log(`/courses/${r.courseSlug}  (institute: ${r.tenantSlug})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
