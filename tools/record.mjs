// Records the demo frame by frame: the title, then the bot plays the levels. Each frame is a screenshot (with the page's
// text on it); blender/frames_to_mp4.py turns them into tools/out/demo.mp4. Frame-exact, so the video never stutters.
// node tools/record.mjs [levels, e.g. 1,2,3]   (needs the dev server on :5180)
import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/keos_macbook_pro/Desktop/framiad-by-claude_10.1026/.worktrees/nav-variants/app-identity/node_modules/playwright-core");
const OUT = process.env.CLEAN ? "tools/out/frames-clean" : "tools/out/frames";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const levels = (process.argv[2] ?? "1,2,3").split(",").map((n) => Number(n) - 1);
const FPS = 30;

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:5180/?manual=1${process.env.CLEAN ? "&clean=1&right=1" : ""}`);
await page.waitForFunction(() => window.__tidelight?.platformsNow);

let n = 0;
const shot = () => page.screenshot({ path: `${OUT}/${String(n++).padStart(5, "0")}.jpg`, type: "jpeg", quality: 88 });

// The title for three seconds (it does not move, so one capture is repeated).
for (let i = 0; i < FPS * 3; i++) await shot();
for (const i of levels) {
  await page.evaluate((i) => window.__tidelight.start(i), i);
  await page.evaluate(() => window.__tidelight.enableBot());
  let litFor = 0;
  for (let f = 0; f < FPS * 150 && litFor < FPS * 6.5; f++) {
    const lit = await page.evaluate(() => {
      window.__tidelight.advance(1, 1 / 30);
      return window.__tidelight.state.lit;
    });
    if (lit) litFor++;
    await shot();
  }
  console.log(`level ${i + 1} done, ${n} frames so far`);
}
await browser.close();
console.log(`${n} frames in ${OUT}`);
