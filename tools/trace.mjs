// Frame-by-frame trace of the bot for debugging: node tools/trace.mjs <level> <seconds>
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/keos_macbook_pro/Desktop/framiad-by-claude_10.1026/.worktrees/nav-variants/app-identity/node_modules/playwright-core");
const browser = await chromium.launch({ executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing` });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto("http://localhost:5180/?manual=1");
await page.waitForFunction(() => window.__tidelight?.platformsNow);
const lvl = Number(process.argv[2] ?? 1) - 1, secs = Number(process.argv[3] ?? 6);
const rows = await page.evaluate(async ([lvl, secs]) => {
  const T = window.__tidelight; await T.start(lvl); T.enableBot();
  const out = [];
  for (let f = 0; f < secs * 30; f++) { T.advance(1); const s = T.state; out.push(`${f} x${s.x.toFixed(2)} y${s.y.toFixed(2)} z${s.z.toFixed(2)} g${s.grounded ? 1 : 0} on${s.groundIndex} fwd${T.bot.forward.toFixed(2)} r${T.bot.right.toFixed(2)} falls${s.falls}`); }
  return out;
}, [lvl, secs]);
console.log(rows.filter((_, i) => i % 3 === 0).join("\n"));
await browser.close();
