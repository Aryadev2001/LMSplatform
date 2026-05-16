import "dotenv/config";
import { db } from "../src/db/client";
import { tenants, users, payments } from "../src/db/schema";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { CANONICAL_STUDENT, CANONICAL_ADMIN } from "../src/lib/auth";

/**
 * One-time idempotent remediation of pre-P7-6 orphans: rows created by the
 * old enroll flow before signups carried a tenantId. Single real tenant is
 * 'edt' and localhost/apex resolves to it, so a tenant-less signup was an
 * edt signup. Also canonicalize any leftover lowercase roles.
 */
async function run() {
  const [edt] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, "edt"))
    .limit(1);
  if (!edt) throw new Error("edt tenant missing — cannot backfill");

  const orphanUsers = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(
      and(
        isNull(users.tenantId),
        ne(users.role, "SUPER_OWNER"),
        ne(users.role, "SUPER_STAFF"),
        ne(users.role, "SUPER_SUPPORT"),
      ),
    );

  for (const u of orphanUsers) {
    const role =
      u.role === "admin" || u.role === "TENANT_ADMIN"
        ? CANONICAL_ADMIN
        : CANONICAL_STUDENT;
    await db
      .update(users)
      .set({ tenantId: edt.id, role, updatedAt: new Date() })
      .where(eq(users.id, u.id));
    console.log(`user ${u.email}: tenant→edt, role ${u.role}→${role}`);
  }

  const payRes = await db
    .update(payments)
    .set({ tenantId: edt.id })
    .where(isNull(payments.tenantId))
    .returning({ id: payments.id });
  console.log(`payments backfilled to edt: ${payRes.length}`);

  const [{ remaining }] = await db
    .select({ remaining: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        isNull(users.tenantId),
        ne(users.role, "SUPER_OWNER"),
        ne(users.role, "SUPER_STAFF"),
        ne(users.role, "SUPER_SUPPORT"),
      ),
    );
  console.log(`\nremaining non-super tenant-less users: ${remaining} (expect 0)`);
  if (remaining !== 0) process.exit(1);
}
run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
