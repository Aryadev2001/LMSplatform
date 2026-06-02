import "dotenv/config";
import { db } from "../src/db/client";
import { users } from "../src/db/schema";
import { inArray } from "drizzle-orm";
import { normalizeRole } from "../src/lib/auth";
import { canWrite, canManageTeam, canSeeFinancials, isSuperRole } from "../src/lib/super";

async function run() {
  const su = await db
    .select({ email: users.email, role: users.role, tenant: users.tenantId, sa: users.isSuperAdmin })
    .from(users)
    .where(inArray(users.role, ["SUPER_OWNER", "SUPER_STAFF", "SUPER_SUPPORT"]));

  console.log("Super-team rows:");
  su.forEach((u) =>
    console.log(`  ${u.email} | ${u.role} | normalize=${normalizeRole(u.role as Parameters<typeof normalizeRole>[0])} | tenant=${u.tenant ? "edt" : "NULL"} | isSuperAdmin=${u.sa}`),
  );

  const cap = (r: Parameters<typeof canWrite>[0]) =>
    `write=${canWrite(r)} team=${canManageTeam(r)} financials=${canSeeFinancials(r)}`;
  console.log("\nCapability matrix (spec §Roles):");
  console.log(`  OWNER   → ${cap("SUPER_OWNER")}`);
  console.log(`  STAFF   → ${cap("SUPER_STAFF")}`);
  console.log(`  SUPPORT → ${cap("SUPER_SUPPORT")}`);

  const owner = su.find((u) => u.role === "SUPER_OWNER");
  const pass =
    !!owner &&
    owner.email === "arya@closerx.ai" &&
    owner.tenant === null &&
    normalizeRole("SUPER_OWNER") === "super" &&
    !isSuperRole("TENANT_ADMIN") &&
    canWrite("SUPER_OWNER") && !canWrite("SUPER_SUPPORT") &&
    canManageTeam("SUPER_OWNER") && !canManageTeam("SUPER_STAFF") &&
    canSeeFinancials("SUPER_OWNER") && !canSeeFinancials("SUPER_STAFF");

  console.log(`\n${pass ? "✓ PASS — SUPER_OWNER provisioned, gates correct" : "✗ FAIL — review above"}`);
  if (!pass) process.exit(1);
}
run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
