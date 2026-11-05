// Automated playtest: the bot plays every level frame by frame and reports falls, time and whether the lamp was lit.
// node tools/playtest.mjs [level] [--shots]   (needs the dev server on :5180)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? "/Users/keos_macbook_pro/Desktop/framiad-by-claude_10.1026/.worktrees/nav-variants/app-identity/node_modules/playwright-core");

const only = process.argv[2] && !process.argv[2].startsWith("--") ? [Number(process.argv[2]) - 1] : [0, 1, 2];
const shots = process.argv.includes("--shots");
mkdirSync("tools/out", { recursive: true });

const executablePath = process.env.CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
await page.goto("http://localhost:5180/?manual=1");
await page.waitForFunction(() => window.__tidelight?.platformsNow);

for (const i of only) {
  await page.evaluate((i) => window.__tidelight.start(i), i);
  await page.evaluate(() => window.__tidelight.enableBot());
  const t0 = Date.now();
  let result;
  for (let sec = 0; sec < 240; sec++) {
    result = await page.evaluate(() => {
      window.__tidelight.advance(30);
      return window.__tidelight.state;
    });
    if (shots && sec % 10 === 0) await page.screenshot({ path: `tools/out/l${i + 1}-${String(sec).padStart(3, "0")}.jpg`, quality: 70 });
    if (result.lit) break;
  }
  // let the lamp scene play for the record
  await page.evaluate(() => window.__tidelight.advance(60));
  if (shots) await page.screenshot({ path: `tools/out/l${i + 1}-lit.jpg`, quality: 80 });
  const log = await page.evaluate(() => window.__tidelight.botLog?.() ?? []);
  console.log(JSON.stringify({ level: i + 1, lit: result.lit, falls: result.falls, gameSeconds: Math.round(result.time), wallSeconds: Math.round((Date.now() - t0) / 1000), end: { x: +result.x.toFixed(1), z: +result.z.toFixed(1) }, log }));
}
await browser.close();
