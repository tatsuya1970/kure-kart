// 発走前の演出 (呉駅 → 呉駅を背にしたカート → 180 度回って追走カメラ) を 1/30 秒ずつ進めて撮る (確認用)
//   PORT=5184 node tools/capture_intro.mjs [出力フォルダ] [秒,秒,...]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? 'data/shots/intro';
const TIMES = (process.argv[3] ?? '0.5,2.5,3.5,5,6.5,7.6,8.6,9.5').split(',').map(Number);
const BASE = 'http://localhost:' + (process.env.PORT ?? '5184') + '/';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
await page.goto(BASE + '?rec=1&nofps=1&q=medium', { waitUntil: 'load' });
await page.waitForFunction(() => { const b = document.getElementById('startBtn'); return b && !b.disabled; }, null, { timeout: 300000 });
await page.waitForTimeout(1500);
await page.click('#startBtn');
let t = 0;
for (const target of TIMES) {
  const n = Math.round((target - t) * 30);
  if (n > 0) await page.evaluate(k => window.__recStep(k), n);
  t = target;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/t${String(target).replace('.', '_')}.png`, timeout: 180000 });
  console.log('shot', target);
}
await browser.close();
