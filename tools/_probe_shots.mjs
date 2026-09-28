// 1 回の読み込みで、コース上の複数地点の絵を小さく撮って見比べる (見せ場探し用)。
//   node tools/_probe_shots.mjs <出力ディレクトリ> <cam> <idx...>
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';

const [outDir, camArg, ...idxs] = process.argv.slice(2);
const PORT = process.env.PORT ?? '5184';
const W = Number(process.env.W ?? 960), H = Number(process.env.H ?? 540);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${PORT}/?rec=1&nohud=1&nofps=1&debug=1&q=mid&ai=1&ahead=1&idx=${idxs[0]}&cam=${camArg}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__debug && window.__recStep, null, { timeout: 600000 });
await page.waitForTimeout(1500);

for (const idx of idxs) {
  await page.evaluate(i => {
    const d = window.__debug;
    d.karts.forEach((k, n) => k.placeAt(d.track, n === 0 ? i : i + 4 * n, n === 0 ? 0 : (n % 2 ? 3.5 : -3.5)));
  }, Number(idx));
  for (let n = 0; n < 45; n++) {
    await page.evaluate(() => { window.__recStep(1); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
  }
  await page.screenshot({ path: `${outDir}/${idx}.png`, timeout: 300000 });
  console.log(`${outDir}/${idx}.png`);
}
await browser.close();
