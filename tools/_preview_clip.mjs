// 撮影前の確認: クリップの 0 / 中ほど / 終わりの 3 コマだけ撮る
//   node tools/_preview_clip.mjs <名前> <秒数> <warm> <クエリ> [start]
import { chromium } from 'playwright';
const [name, secs, warm, query, start] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 960), height: Number(process.env.H ?? 540) } });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${process.env.PORT ?? 5184}/?${query}`, { waitUntil: 'load' });
if (start) {
  await page.waitForFunction(() => { const b = document.getElementById('startBtn'); return b && !b.disabled && window.__recStep; }, null, { timeout: 600000 });
  await page.waitForTimeout(1500);
  await page.click('#startBtn');
  await page.evaluate(() => { for (const id of ['hud', 'touch']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } });
} else await page.waitForFunction(() => window.__debug && window.__recStep, null, { timeout: 600000 });
await page.waitForTimeout(1000);
const step = n => page.evaluate(k => { window.__recStep(k); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, n);
for (let d = 0; d < Number(warm); d += 10) await step(Math.min(10, Number(warm) - d));
const total = Math.round(Number(secs) * 30);
let at = 0;
for (const t of [0, Math.round(total / 2), total - 1]) {
  if (t > at) { for (let d = at; d < t; d += 10) await step(Math.min(10, t - d)); at = t; }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `data/shots/pv_${name}_${t}.png`, timeout: 300000 });
  const info = await page.evaluate(() => window.__debug ? window.__debug.karts.map(k => k.trackIdx).join(',') : '-');
  console.log(name, t, info);
}
await browser.close();
