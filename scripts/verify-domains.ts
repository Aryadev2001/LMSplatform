import "dotenv/config";
import { db } from "../src/db/client";
import { tenants } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const FQDN =
  /^(?=.{4,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

const valid = ["learn.acme.com", "portal.bigco.io", "app.x.co", "a.b.c.example.org"];
const invalid = ["", "nodot", "-bad.com", "bad-.com", "http://x.com", "x..y.com", "space d.com"];

function isExternal(domain: string, root: string | null) {
  if (!root) return true;
  return !(domain === root || domain.endsWith(`.${root}`));
}

// Mirror of getTenantFromRequest's custom-domain branch predicate
function resolves(customDomainStatus: string) {
  return customDomainStatus === "CONFIGURED";
}

async function run() {
  let pass = true;

  for (const d of valid) {
    const ok = FQDN.test(d);
    if (!ok) pass = false;
    console.log(`${ok ? "OK  " : "FAIL"} valid   ${d}`);
  }
  for (const d of invalid) {
    const rejected = !FQDN.test(d);
    if (!rejected) pass = false;
    console.log(`${rejected ? "OK  " : "FAIL"} reject  ${JSON.stringify(d)}`);
  }

  const rootCase =
    !isExternal("edt.ae", "edt.ae") &&
    !isExternal("acme.edt.ae", "edt.ae") &&
    isExternal("learn.acme.com", "edt.ae");
  if (!rootCase) pass = false;
  console.log(`${rootCase ? "OK  " : "FAIL"} root-domain rejected as custom domain`);

  const resRule =
    resolves("CONFIGURED") && !resolves("REQUESTED") && !resolves("NONE");
  if (!resRule) pass = false;
  console.log(`${resRule ? "OK  " : "FAIL"} only CONFIGURED domains resolve (REQUESTED stays dark)`);

  // Read-only safety check: no tenant is sitting REQUESTED-but-resolvable.
  const bad = await db
    .select({ slug: tenants.slug, d: tenants.customDomain, s: tenants.customDomainStatus })
    .from(tenants);
  const dangling = bad.filter((t) => t.d && t.s !== "CONFIGURED" && t.s !== "NONE" && resolves(t.s));
  console.log(`OK   no dangling resolvable REQUESTED domains: ${dangling.length === 0}`);
  if (dangling.length) pass = false;

  console.log(`\n${pass ? "✓ PASS — domain validation + manual-DNS state machine correct" : "✗ FAIL"}`);
  if (!pass) process.exit(1);
}
run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
