import { chromium } from "playwright-core";

const URL = process.argv[2] || "https://eurodigital.coach/courses/figma-full-course-il3a9";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on("console", (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[PAGEERROR] ${e.message}\n${e.stack ?? ""}`));
page.on("requestfailed", (r) =>
  logs.push(`[REQFAILED] ${r.url()} :: ${r.failure()?.errorText}`),
);

await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 }).catch((e) =>
  logs.push(`[GOTO ERROR] ${e.message}`),
);

// Give hydration a beat.
await page.waitForTimeout(2500);

// What element is actually at the center of the "Enroll free" button?
const probe = await page.evaluate(() => {
  const out = {};
  const btn = [...document.querySelectorAll("button, a")].find((el) =>
    /enroll free/i.test(el.textContent || ""),
  );
  if (btn) {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    out.enrollBtnFound = true;
    out.enrollRect = { x: Math.round(cx), y: Math.round(cy), w: Math.round(r.width), h: Math.round(r.height) };
    out.topElementAtEnroll =
      top
        ? top.tagName +
          "." +
          (typeof top.className === "string" ? top.className.split(" ").slice(0, 3).join(".") : "") +
          " :: text=" +
          (top.textContent || "").slice(0, 30)
        : "none";
    out.topIsButtonOrInside = !!(top && (top === btn || btn.contains(top) || top.contains(btn)));
  } else {
    out.enrollBtnFound = false;
  }
  // Any full-viewport overlay?
  const vw = window.innerWidth, vh = window.innerHeight;
  const overlays = [];
  for (const el of document.body.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if ((cs.position === "fixed" || cs.position === "absolute")) {
      const r = el.getBoundingClientRect();
      if (r.width >= vw * 0.9 && r.height >= vh * 0.9 && cs.pointerEvents !== "none") {
        overlays.push(
          el.tagName +
            "." +
            (typeof el.className === "string" ? el.className.split(" ").slice(0, 4).join(".") : "") +
            ` z=${cs.zIndex} pe=${cs.pointerEvents} pos=${cs.position}`,
        );
      }
    }
  }
  out.fullViewportOverlays = overlays;
  out.reactRootHydrated = !!document.querySelector("[data-reactroot], #__next, body > div");
  return out;
});

// Try an actual click on Enroll free and see if URL changes.
const before = page.url();
let clickErr = null;
try {
  await page.getByText(/enroll free/i).first().click({ timeout: 4000 });
  await page.waitForTimeout(1500);
} catch (e) {
  clickErr = e.message;
}
const after = page.url();

console.log("URL:", URL);
console.log("PROBE:", JSON.stringify(probe, null, 2));
console.log("CLICK before:", before);
console.log("CLICK after :", after);
console.log("CLICK changed URL:", before !== after, clickErr ? `(err: ${clickErr})` : "");
console.log("---- LOGS (" + logs.length + ") ----");
console.log(logs.join("\n"));

await browser.close();
