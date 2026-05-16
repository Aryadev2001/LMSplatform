import "dotenv/config";
import { parseTenantHost, DEFAULT_TENANT_SLUG } from "../src/lib/tenant";
import { db } from "../src/db/client";
import { tenants } from "../src/db/schema";
import { eq } from "drizzle-orm";

const cases: [string | null, string][] = [
  ["localhost:3000", "local"],
  ["127.0.0.1", "local"],
  ["coach-platform-abc.vercel.app", "local"],
  ["edt.ae", "apex"],
  ["www.edt.ae", "apex"],
  ["super.edt.ae", "apex"],         // reserved
  ["admin.edt.ae", "apex"],         // reserved
  ["acme.edt.ae", "subdomain"],
  ["acme.edt.ae:443", "subdomain"],
  ["learn.bigco.com", "custom"],
  [null, "local"],
];

async function run() {
  // NEXT_PUBLIC_ROOT_DOMAIN must be set for subdomain/apex cases to classify.
  process.env.NEXT_PUBLIC_ROOT_DOMAIN = "edt.ae";
  let pass = true;
  console.log(`ROOT_DOMAIN=edt.ae  DEFAULT_TENANT=${DEFAULT_TENANT_SLUG}\n`);
  for (const [host, expected] of cases) {
    const r = parseTenantHost(host);
    const ok = r.kind === expected;
    if (!ok) pass = false;
    const extra = "slug" in r ? ` slug=${r.slug}` : "domain" in r ? ` domain=${r.domain}` : "";
    console.log(`${ok ? "OK " : "FAIL"}  ${String(host).padEnd(34)} → ${r.kind}${extra}  (want ${expected})`);
  }

  // No-root-domain (local/preview) → everything not local becomes custom; local stays local
  delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  const noRoot = parseTenantHost("localhost:3000");
  const noRootOk = noRoot.kind === "local";
  if (!noRootOk) pass = false;
  console.log(`\n${noRootOk ? "OK " : "FAIL"}  no-root localhost → ${noRoot.kind} (want local)`);

  const [edt] = await db
    .select({ id: tenants.id, slug: tenants.slug, name: tenants.name, status: tenants.status })
    .from(tenants)
    .where(eq(tenants.slug, DEFAULT_TENANT_SLUG))
    .limit(1);
  const dbOk = !!edt;
  if (!dbOk) pass = false;
  console.log(
    `\n${dbOk ? "OK " : "FAIL"}  default tenant '${DEFAULT_TENANT_SLUG}' in DB: ` +
      (edt ? `${edt.name} (${edt.status}) id=${edt.id}` : "NOT FOUND"),
  );

  console.log(`\n${pass ? "✓ PASS — tenant resolution correct, zero-regression fallback intact" : "✗ FAIL"}`);
  if (!pass) process.exit(1);
}
run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
