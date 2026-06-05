import { chromium } from "playwright-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "https://eurodigital.coach";

const ROUTES = [
  "/",
  "/explore",
  "/pricing",
  "/partner-program",
  "/for-institutes",
  "/about",
  "/contact",
  "/help",
  "/diagnostic",
  "/enroll",
  "/cart",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  "/legal/refund",
  "/sign-in",
  "/sign-up",
  "/admin/login",
  "/courses/figma-full-course-il3a9",
  "/institute/physic-walla",
  "/bundles/__verify_bundle__",
];

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// The page-side audit: find big overlays + any interactive control that is
// NOT the top element at its own center (i.e. something is covering it).
const AUDIT = () => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const desc = (el) =>
    !el
      ? "none"
      : el.tagName +
        (typeof el.className === "string" && el.className
          ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
          : "") +
        (el.id ? "#" + el.id : "");
  const decorative = (el) => {
    const c = typeof el.className === "string" ? el.className : "";
    return /inset-0|halftone|opacity|backdrop|-z-10|absolute|fixed/.test(c);
  };

  // Big overlays currently intercepting pointer events.
  const bigOverlays = [];
  for (const el of document.body.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "absolute") continue;
    if (cs.pointerEvents === "none" || cs.visibility === "hidden" || cs.display === "none") continue;
    const r = el.getBoundingClientRect();
    if (r.width >= vw * 0.85 && r.height >= vh * 0.7) {
      bigOverlays.push(desc(el) + ` z=${cs.zIndex}`);
    }
  }

  // Interactive controls covered by something else.
  const covered = [];
  const controls = document.querySelectorAll(
    'a[href], button, input, select, textarea, [role="button"]',
  );
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue; // not in viewport
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none") continue;
    const top = document.elementFromPoint(cx, cy);
    if (!top) continue;
    if (top === el || el.contains(top) || top.contains(el)) continue;
    // Something unrelated is on top. Ignore IFRAME (Clerk) blockers.
    if (top.tagName === "IFRAME") continue;
    covered.push({
      control: desc(el) + " :: " + (el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 24),
      blocker: desc(top),
      blockerDecorative: decorative(top),
    });
    if (covered.length >= 10) break;
  }
  return { bigOverlays, covered };
};

const results = [];
for (const route of ROUTES) {
  const url = BASE + route;
  const page = await ctx.newPage();
  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    status = resp ? resp.status() : 0;
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
  } catch (e) {
    results.push({ route, status, error: e.message.split("\n")[0] });
    await page.close();
    continue;
  }
  const top = await page.evaluate(AUDIT).catch((e) => ({ error: e.message }));
  // Re-check after scrolling to the middle of the page.
  await page.evaluate(() => window.scrollTo(0, Math.round(document.body.scrollHeight * 0.45))).catch(() => {});
  await page.waitForTimeout(400);
  const mid = await page.evaluate(AUDIT).catch((e) => ({ error: e.message }));
  results.push({ route, status, top, mid });
  await page.close();
}

await browser.close();

// Report
let problems = 0;
for (const r of results) {
  const probTop = (r.top?.covered || []).filter((c) => c.blockerDecorative);
  const probMid = (r.mid?.covered || []).filter((c) => c.blockerDecorative);
  const bigTop = r.top?.bigOverlays || [];
  const flagged = probTop.length || probMid.length || bigTop.length || r.error;
  if (flagged) problems++;
  const tag = r.error ? "ERR" : flagged ? "⚠ CHECK" : "OK";
  console.log(`\n[${tag}] ${r.route}  (status ${r.status})`);
  if (r.error) { console.log("   error: " + r.error); continue; }
  if (bigTop.length) console.log("   big overlays intercepting: " + JSON.stringify(bigTop));
  if (probTop.length) console.log("   covered@top: " + JSON.stringify(probTop, null, 0));
  if (probMid.length) console.log("   covered@mid: " + JSON.stringify(probMid, null, 0));
  // Also show non-decorative covers (could be false positives — sticky headers) for awareness, briefly.
  const otherTop = (r.top?.covered || []).filter((c) => !c.blockerDecorative);
  if (otherTop.length) console.log("   (info) other covers@top: " + otherTop.map((c) => c.control + " <- " + c.blocker).join(" | "));
}
console.log(`\n==== ${results.length} routes checked, ${problems} flagged ====`);
