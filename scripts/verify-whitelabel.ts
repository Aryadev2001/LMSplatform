import "dotenv/config";
import { db } from "../src/db/client";
import { tenants } from "../src/db/schema";
import { eq } from "drizzle-orm";

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const EDT_PRIMARY = "#8cc63f";
const EDT_SECONDARY = "#1aade0";
const safeHex = (v: string | null | undefined, fb: string) =>
  v && HEX6.test(v) ? v.toLowerCase() : fb;

// Mirror of TenantBrandStyle's decision
function styleFor(p?: string | null, s?: string | null) {
  const primary = safeHex(p, EDT_PRIMARY);
  const secondary = safeHex(s, EDT_SECONDARY);
  if (primary === EDT_PRIMARY && secondary === EDT_SECONDARY) return null;
  return `:root{--brand-green:${primary};--brand-blue:${secondary};--brand-gradient:linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);--primary:${primary};--ring:${secondary};}`;
}

async function run() {
  const [edt] = await db
    .select({
      slug: tenants.slug,
      p: tenants.brandPrimaryColor,
      s: tenants.brandSecondaryColor,
      logo: tenants.logoUrl,
    })
    .from(tenants)
    .where(eq(tenants.slug, "edt"))
    .limit(1);

  console.log(`edt tenant: primary=${edt?.p} secondary=${edt?.s} logo=${edt?.logo ?? "none"}`);
  const edtStyle = styleFor(edt?.p, edt?.s);
  const zeroReg = edtStyle === null;
  console.log(`zero-regression (edt emits NO override): ${zeroReg ? "OK" : "FAIL → " + edtStyle}`);

  const custom = styleFor("#FF0000", "#0000FF");
  const customOk =
    !!custom && custom.includes("--primary:#ff0000") && custom.includes("--ring:#0000ff");
  console.log(`custom tenant emits override: ${customOk ? "OK" : "FAIL"}`);
  console.log(`  → ${custom}`);

  const injection = styleFor("#fff;}</style><script>", "#1aade0");
  const injSafe = injection === null || !injection.includes("<script>");
  console.log(`injection rejected (non-hex ignored): ${injSafe ? "OK" : "FAIL"}`);

  const pass = zeroReg && customOk && injSafe;
  console.log(`\n${pass ? "✓ PASS — whitelabel CSS-var logic correct & safe" : "✗ FAIL"}`);
  if (!pass) process.exit(1);
}
run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
