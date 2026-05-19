/**
 * One-shot: assign a persisted unique student_code to every existing
 * STUDENT user that doesn't have one. Idempotent — safe to re-run.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/backfill-student-codes.ts
 */
import { and, inArray, isNull } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema";
import { STUDENT_DB_ROLES } from "../src/lib/auth";
import { ensureStudentCode } from "../src/lib/student";

async function main() {
  const rows = await db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(
      and(
        inArray(users.role, [...STUDENT_DB_ROLES]),
        isNull(users.studentCode),
      ),
    );

  console.log(`Backfilling ${rows.length} student(s)…`);
  let done = 0;
  for (const r of rows) {
    const code = await ensureStudentCode(r.id, r.tenantId);
    done += 1;
    console.log(`  ${done}/${rows.length}  ${r.id} → ${code}`);
  }
  console.log(`✓ Done. ${done} assigned.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
