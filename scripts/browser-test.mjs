// BodyOS browser / device test (Week 9). Opens the public pages in real browser
// engines at phone, tablet and desktop sizes and checks for layout and script problems.
//
//   1. npm run build && npm start               (in one terminal)
//   2. npx playwright install chromium firefox webkit   (once; webkit = Safari's engine)
//   3. BROWSERS=chromium,firefox,webkit node scripts/browser-test.mjs
//
// Screenshots are saved to test-results/browser/.
import { chromium, firefox, webkit } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ENGINES = { chromium, firefox, webkit };
const browsers = (process.env.BROWSERS ?? "chromium").split(",").map((s) => s.trim());
const OUT = "test-results/browser";
fs.mkdirSync(OUT, { recursive: true });

const DEVICES = [
  { name: "Small phone 320px", width: 320, height: 568, mobile: true },
  { name: "iPhone 390px", width: 390, height: 844, mobile: true },
  { name: "iPad 768px", width: 768, height: 1024, mobile: true },
  { name: "Laptop 1366px", width: 1366, height: 768, mobile: false },
  { name: "Desktop 1920px", width: 1920, height: 1080, mobile: false },
];
const PAGES = ["/", "/auth/login", "/auth/sign-up", "/auth/forgot-password"];

const results = [];
let failures = 0;

for (const engineName of browsers) {
  const engine = ENGINES[engineName];
  if (!engine) throw new Error(`Unknown browser ${engineName}`);
  const browser = await engine.launch();

  for (const d of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: d.width, height: d.height },
      isMobile: engineName !== "firefox" && d.mobile, // Firefox has no mobile emulation
      hasTouch: d.mobile,
    });
    for (const path of PAGES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
      const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
      const check = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        // Tap targets smaller than 40px are hard to hit on a phone.
        const small = [...document.querySelectorAll("a, button, input, select")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.height < 40 && getComputedStyle(el).visibility !== "hidden";
          })
          .map((el) => (el.textContent || el.getAttribute("name") || el.tagName).trim().slice(0, 30));
        const font = getComputedStyle(document.body).fontFamily;
        return { overflow, small, fontLoaded: document.fonts.check("16px " + font.split(",")[0]) };
      });
      const problems = [];
      if (!res || res.status() >= 400) problems.push(`HTTP ${res?.status()}`);
      if (check.overflow > 1) problems.push(`sideways scroll ${check.overflow}px`);
      if (errors.length) problems.push(`script errors: ${errors.join(" | ").slice(0, 120)}`);
      if (problems.length) failures++;
      results.push({
        Browser: engineName,
        Device: d.name,
        Page: path,
        Result: problems.length ? "FAIL" : "PASS",
        Notes: [...problems, check.small.length ? `${check.small.length} small tap target(s)` : "", check.fontLoaded ? "" : "font fallback"]
          .filter(Boolean)
          .join("; "),
      });
      if (path === "/" || path === "/auth/login") {
        const file = `${OUT}/${engineName}-${d.width}${path === "/" ? "-home" : path.replaceAll("/", "-")}.png`;
        await page.screenshot({ path: file, fullPage: path === "/" });
      }
      await page.close();
    }
    await ctx.close();
  }

  // Older browsers or locked-down machines may block JavaScript. Public pages should still work.
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const p = await noJs.newPage();
  await p.goto(BASE + "/");
  const links = await p.$$eval("a[href='/auth/sign-up']", (a) => a.length);
  results.push({ Browser: engineName, Device: "JavaScript OFF", Page: "/", Result: links > 0 ? "PASS" : "FAIL", Notes: `${links} sign-up link(s) visible` });
  if (!links) failures++;
  await noJs.close();
  await browser.close();
}

console.table(results);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(failures ? `FAIL: ${failures} problem(s)` : `PASS: ${results.length} checks`);
process.exit(failures ? 1 : 0);
