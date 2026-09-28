// PLATEAU (国土交通省) 呉市 2020 CityGML ダウンロードスクリプト
// 対象: 呉駅〜大和ミュージアム〜休山〜アレイからすこじま〜音戸大橋 の回廊 (BBOX から 3次メッシュを列挙)
//   node tools/download_plateau.mjs            建物・道路・地形をすべて
//   node tools/download_plateau.mjs bldg tran  種類を絞る
import { mkdir, writeFile, stat, rename } from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const BASE = 'https://assets.cms.plateau.reearth.io/assets/85/3651b8-c70c-435f-b94c-d725aca148b5/34202_kure-shi_city_2020_citygml_7_op/udx';
const OUT = path.resolve('data/citygml');

// コース回廊 + 余白。data/course.json の BBOX (tools/convert_citygml.mjs) より少し広め。
const BB = { latMin: 34.1850, latMax: 34.2640, lonMin: 132.5230, lonMax: 132.6050 };

/** BBOX に重なる 3次メッシュ (1km) のコードを列挙する */
function meshes(bb) {
  const out = [];
  // 1次メッシュ 5132 = 緯度 34.0-34.6667 / 経度 132-133
  const LAT0 = 34.0, LON0 = 132.0, D2LAT = 1 / 12, D2LON = 1 / 8, D3LAT = 1 / 120, D3LON = 1 / 80;
  for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
    const la = LAT0 + a * D2LAT, lo = LON0 + b * D2LON;
    if (la + D2LAT <= bb.latMin || la >= bb.latMax || lo + D2LON <= bb.lonMin || lo >= bb.lonMax) continue;
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      const la3 = la + r * D3LAT, lo3 = lo + c * D3LON;
      if (la3 + D3LAT <= bb.latMin || la3 >= bb.latMax || lo3 + D3LON <= bb.lonMin || lo3 >= bb.lonMax) continue;
      out.push({ code: `5132${a}${b}${r}${c}`, sec: `5132${a}${b}` });
    }
  }
  return out;
}

const want = process.argv.slice(2).length ? new Set(process.argv.slice(2)) : new Set(['bldg', 'tran', 'dem']);
const list = meshes(BB);
const secs = [...new Set(list.map(m => m.sec))];
console.log(`3次メッシュ ${list.length} 枚 / 2次メッシュ ${secs.join(', ')}`);

const jobs = [];
for (const m of list) {
  if (want.has('bldg')) jobs.push({ url: `${BASE}/bldg/${m.code}_bldg_6697_op.gml`, file: `${m.code}_bldg.gml` });
  if (want.has('tran')) jobs.push({ url: `${BASE}/tran/${m.code}_tran_6697_op.gml`, file: `${m.code}_tran.gml` });
}
// DEM は 2次メッシュ単位。大きいものは 4 分割 (00 / 05 / 50 / 55)、小さいものは分割なし。
// どちらで配信されているかは市によって違うので両方試して 404 は飛ばす。
if (want.has('dem')) for (const s of secs) {
  jobs.push({ url: `${BASE}/dem/${s}_dem_6697_op.gml`, file: `${s}_dem.gml` });
  for (const q of ['00', '05', '50', '55']) jobs.push({ url: `${BASE}/dem/${s}_dem_6697_${q}_op.gml`, file: `${s}_dem_${q}.gml` });
}

await mkdir(OUT, { recursive: true });

async function download(job) {
  const dest = path.join(OUT, job.file);
  try {
    const s = await stat(dest);
    if (s.size > 1000) { console.log(`skip (exists) ${job.file} ${(s.size / 1e6).toFixed(1)}MB`); return; }
  } catch {}
  const res = await fetch(job.url);
  if (!res.ok) { console.log(`MISSING ${job.file} (${res.status})`); return; }
  // 数GB になる DEM があるので、メモリに溜めずに書き出す
  const tmp = dest + '.part';
  const ws = createWriteStream(tmp);
  await pipeline(Readable.fromWeb(res.body), ws);
  const s = await stat(tmp);
  await rename(tmp, dest);
  console.log(`ok ${job.file} ${(s.size / 1e6).toFixed(1)}MB`);
}

// 4並列
let i = 0;
async function worker() { while (i < jobs.length) { const j = jobs[i++]; try { await download(j); } catch (e) { console.log(`ERR ${j.file}: ${e.message}`); } } }
await Promise.all([worker(), worker(), worker(), worker()]);
console.log('done');
