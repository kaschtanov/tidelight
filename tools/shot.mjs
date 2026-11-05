// Screenshots of the game at chosen moments: node tools/shot.mjs <level> <seconds,...> [prefix]
// The bot plays; a picture is taken at each given game second (tools/out/<prefix>-<level>-<sec>.jpg).
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/keos_macbook_pro/Desktop/framiad-by-claude_10.1026/.worktrees/nav-variants/app-identity/node_modules/playwright-core");
mkdirSync("tools/out", { recursive: true });
const browser = await chromium.launch({ executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
await page.goto("http://localhost:5180/?manual=1");
await page.waitForFunction(() => window.__tidelight?.platformsNow, null, { timeout: 30000 });
const lvl = Number(process.argv[2] ?? 1), at = (process.argv[3] ?? "2").split(",").map(Number), prefix = process.argv[4] ?? "shot";
await page.evaluate((i) => window.__tidelight.start(i), lvl - 1);
await page.evaluate(() => window.__tidelight.enableBot());
let t = 0;
for (const sec of at) {
  await page.evaluate((n) => window.__tidelight.advance(n), Math.round((sec - t) * 30));
  t = sec;
  await page.screenshot({ path: `tools/out/${prefix}-${lvl}-${sec}.jpg`, quality: 82 });
}
console.log(JSON.stringify(await page.evaluate(() => window.__tidelight.state)));
await browser.close();
