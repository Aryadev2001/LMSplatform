/**
 * Pre-launch SMOKE TEST — HTTP routes + production health (no DB needed).
 *
 * Confirms every public page returns 200, every gated route redirects to the
 * CORRECT login, and the live service worker is the safe kill-switch (not a
 * caching SW that can strand clients on stale chunks).
 *
 * Run:  npx tsx scripts/smoke-http.ts                      (defaults to prod)
 *       npx tsx scripts/smoke-http.ts http://localhost:3000
 *       (or: npm run smoke:http)
 * Exit code is non-zero if any check fails.
 */
const BASE = (process.argv[2] || process.env.SMOKE_URL || "https://eurodigital.coach").replace(/\/$/, "");

const PUBLIC = [
  "/", "/explore", "/pricing", "/partner-program", "/for-institutes",
  "/about", "/contact", "/help", "/sign-in", "/sign-up", "/admin/login",
  "/legal/terms", "/legal/privacy", "/legal/refund", "/legal/cookies",
  "/legal/shipping", "/cart", "/diagnostic",
];

// gated path -> the login path its redirect must point at
const GATED: Record<string, string> = {
  "/student": "/sign-in",
  "/student/courses": "/sign-in",
  "/student/ai-services": "/sign-in",
  "/checkout": "/sign-in",
  "/admin": "/admin/login",
  "/super-admin": "/admin/login",
};

async function run() {
  let pass = true;
  const ok = (label: string, cond: boolean, extra = "") => {
    if (!cond) pass = false;
    console.log(`${cond ? "OK  " : "FAIL"} ${label}${extra ? "  ·  " + extra : ""}`);
  };

  console.log(`\n=== coach-platform :: HTTP smoke test (${BASE}) ===\n`);

  console.log("--- public routes (expect 200) ---");
  for (const p of PUBLIC) {
    let code = 0;
    try {
      const res = await fetch(BASE + p, { redirect: "manual" });
      code = res.status;
    } catch (e) {
      ok(`${p}`, false, e instanceof Error ? e.message : "fetch failed");
      continue;
    }
    ok(`${p} → ${code}`, code === 200);
  }

  console.log("\n--- gated routes (expect redirect to the right login) ---");
  for (const [p, expect] of Object.entries(GATED)) {
    try {
      const res = await fetch(BASE + p, { redirect: "manual" });
      const loc = res.headers.get("location") ?? "";
      const redirected = res.status >= 300 && res.status < 400;
      ok(`${p} → ${res.status} ${loc.replace(BASE, "")}`, redirected && loc.includes(expect), redirected ? "" : "no redirect");
    } catch (e) {
      ok(`${p}`, false, e instanceof Error ? e.message : "fetch failed");
    }
  }

  console.log("\n--- production health ---");
  try {
    const sw = await fetch(BASE + "/sw.js").then((r) => r.text());
    ok("service worker is the kill-switch (not a caching SW)", sw.includes("self-destroying"));
  } catch (e) {
    ok("service worker reachable", false, e instanceof Error ? e.message : "fetch failed");
  }

  console.log(`\n=== ${pass ? "PASS ✓" : "FAIL ✗"} ===\n`);
  process.exit(pass ? 0 : 1);
}

run().catch((e) => {
  console.error("smoke-http crashed:", e);
  process.exit(1);
});
