// PLATEAU CityGML (呉市 2020) → ゲーム用データ変換
//   bldg (LOD1 Solid) → public/data/buildings.json
//   tran (LOD1 道路面) → public/data/roads.json
//   dem  (LOD1 TIN)   → public/data/terrain.json + terrain.bin (Int16, 単位dm, 水面 = -32768)
import { readFileSync, writeFileSync, createReadStream, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const course = JSON.parse(readFileSync('data/course.json', 'utf8'));
const lat0 = course.origin.lat, lon0 = course.origin.lon;
const mPerLat = 110950;
const mPerLon = 111320 * Math.cos(lat0 * Math.PI / 180);

// 出力範囲 (コース + 余白)。北は県道174号の峠 (34.253) の先、南は音戸大橋を渡った倉橋島の北端、
// 東は阿賀・呉工業高校の先まで。遠景に灰ヶ峰・休山・江田島が入るよう少し広めに取る。
const BB = { latMin: 34.1870, latMax: 34.2620, lonMin: 132.5250, lonMax: 132.6040 };

// コースから離れた建物・道路は出さない。範囲が松江版の 10 倍あるので、
// 矩形のまま出すと数十 MB になって読み込みが持たない。
// 地形 (DEM) は BBOX 全体を出す (遠景の山並みが要るため)。
const BLDG_CORRIDOR = 700; // 建物を残す、案内線からの距離 (m)
const ROAD_CORRIDOR = 400; // 道路面を残す距離 (m)。A* は案内線に沿うのでこれで足りる

// LOD2 (実写テクスチャ) で描画する建物は LOD1 では出さない
let lod2Skip = new Set();
try {
  const l2 = JSON.parse(readFileSync('public/data/lod2.json', 'utf8'));
  lod2Skip = new Set(l2.skipIds ?? []);
  console.log(`LOD2 で描画する ${lod2Skip.size} 棟を LOD1 から除外`);
} catch { console.log('lod2.json が無いため LOD1 のみで出力'); }
const toXZ = (lat, lon) => [(lon - lon0) * mPerLon, -(lat - lat0) * mPerLat];
const inBB = (lat, lon) => lat >= BB.latMin && lat <= BB.latMax && lon >= BB.lonMin && lon <= BB.lonMax;
const r1 = v => Math.round(v * 10) / 10;

// ---------- コース回廊 ----------
// 案内線 (data/drawn_route.json, tools/plan_route_osm.mjs が生成) からの距離で絞る。
// 100m 角のバケットに線上の点を入れておき、周りのバケットだけ見る。
const routeXZ = JSON.parse(readFileSync('data/drawn_route.json', 'utf8')).points.map(p => toXZ(p.lat, p.lon));
const CORRIDOR_CELL = 100;
const routeGrid = new Map();
{
  // 10m 間隔に細分してから登録する (折れ線の頂点だけだと間が抜ける)
  const put = (x, z) => {
    const k = Math.floor(x / CORRIDOR_CELL) * 100000 + Math.floor(z / CORRIDOR_CELL);
    let a = routeGrid.get(k);
    if (!a) { a = []; routeGrid.set(k, a); }
    a.push(x, z);
  };
  for (let i = 0; i + 1 < routeXZ.length; i++) {
    const a = routeXZ[i], b = routeXZ[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / 10));
    for (let k = 0; k < n; k++) put(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n);
  }
  put(routeXZ[routeXZ.length - 1][0], routeXZ[routeXZ.length - 1][1]);
}
function nearRoute(x, z, d) {
  const r = Math.ceil(d / CORRIDOR_CELL);
  const ci = Math.floor(x / CORRIDOR_CELL), cj = Math.floor(z / CORRIDOR_CELL);
  const d2 = d * d;
  for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const a = routeGrid.get((ci + di) * 100000 + (cj + dj));
    if (!a) continue;
    for (let k = 0; k < a.length; k += 2) if ((a[k] - x) ** 2 + (a[k + 1] - z) ** 2 < d2) return true;
  }
  return false;
}

// ランドマークは専用の詳細モデルを置くため、PLATEAU 側の同じ建物は除外する
const landmarks = JSON.parse(readFileSync('data/rail.json', 'utf8')).landmarks;
const LANDMARK_ZONES = Object.values(landmarks).map(l => {
  const [x, z] = toXZ(l.lat, l.lon);
  return { name: l.name, x, z, r: l.excludeRadius ?? 25 };
});
let domeSkipped = 0;
let farSkipped = 0;
let farRoads = 0;

const DIR = 'data/citygml';
const files = readdirSync(DIR);
const POSLIST = /<gml:posList>([^<]*)<\/gml:posList>/g;

// ---------- 建築物 ----------
function parseBuildings(text) {
  const out = [];
  let idx = 0;
  while (true) {
    const s = text.indexOf('<bldg:Building ', idx);
    if (s < 0) break;
    const e = text.indexOf('</bldg:Building>', s);
    if (e < 0) break;
    idx = e + 16;
    const blk = text.slice(s, e);
    const gid = /gml:id="([^"]+)"/.exec(blk);
    if (gid && lod2Skip.has(gid[1])) continue;
    const mh = /<bldg:measuredHeight[^>]*>([\d.]+)</.exec(blk);
    const us = /<bldg:usage[^>]*>(\d+)</.exec(blk);
    const ls = blk.indexOf('<bldg:lod1Solid>');
    if (ls < 0) continue;
    const le = blk.indexOf('</bldg:lod1Solid>', ls);
    const solid = blk.slice(ls, le);
    const re = new RegExp(POSLIST.source, 'g');
    let m, zMin = Infinity, zMax = -Infinity, base = null, baseZ = Infinity;
    while ((m = re.exec(solid))) {
      const v = m[1].trim().split(/\s+/).map(Number);
      let pzMin = Infinity, pzMax = -Infinity;
      for (let i = 2; i < v.length; i += 3) { if (v[i] < pzMin) pzMin = v[i]; if (v[i] > pzMax) pzMax = v[i]; }
      if (pzMin < zMin) zMin = pzMin;
      if (pzMax > zMax) zMax = pzMax;
      // 水平な面 (底面 or 天井面) のうち最も低いものを底面とみなす
      if (Math.abs(pzMax - pzMin) < 1e-6 && pzMin < baseZ) { baseZ = pzMin; base = v; }
    }
    if (!base) continue;
    let h = zMax - zMin;
    if (!(h > 0.5) && mh) h = parseFloat(mh[1]);
    if (!(h > 0.5)) h = 3;
    // 重心で範囲判定
    let cla = 0, clo = 0;
    const n = base.length / 3 - 1;
    for (let i = 0; i < n; i++) { cla += base[i * 3]; clo += base[i * 3 + 1]; }
    cla /= n; clo /= n;
    if (!inBB(cla, clo)) continue;
    {
      const [bx, bz] = toXZ(cla, clo);
      if (!nearRoute(bx, bz, BLDG_CORRIDOR)) { farSkipped++; continue; }
      let inLandmark = false;
      for (const L of LANDMARK_ZONES) if (Math.hypot(bx - L.x, bz - L.z) < L.r) { inLandmark = true; break; }
      if (inLandmark) { domeSkipped++; continue; }
    }
    const ring = [];
    for (let i = 0; i < n; i++) { const [x, z] = toXZ(base[i * 3], base[i * 3 + 1]); ring.push(r1(x), r1(z)); }
    if (ring.length < 6) continue;
    out.push([r1(h), r1(baseZ), us ? parseInt(us[1]) : 0, ...ring]);
  }
  return out;
}

const buildings = [];
const ONLY_TERRAIN = !!process.env.ONLY_TERRAIN; // 地形だけ作り直す
for (const f of ONLY_TERRAIN ? [] : files.filter(f => f.endsWith('_bldg.gml'))) {
  const t = readFileSync(path.join(DIR, f), 'utf8');
  const b = parseBuildings(t);
  buildings.push(...b);
  console.log('bldg ' + f + ': ' + b.length);
}
if (!ONLY_TERRAIN) writeFileSync('public/data/buildings.json', JSON.stringify({ origin: course.origin, count: buildings.length, items: buildings }));
console.log('buildings total', buildings.length, `(ランドマーク位置で除外 ${domeSkipped} 棟 / 回廊の外 ${farSkipped} 棟)`);

// ---------- 道路 ----------
const roads = [];
for (const f of ONLY_TERRAIN ? [] : files.filter(f => f.endsWith('_tran.gml'))) {
  const t = readFileSync(path.join(DIR, f), 'utf8');
  let idx = 0, c = 0;
  while (true) {
    const s = t.indexOf('<tran:Road ', idx); if (s < 0) break;
    const e = t.indexOf('</tran:Road>', s); if (e < 0) break;
    idx = e + 12;
    const blk = t.slice(s, e);
    const fn = /<tran:function[^>]*>(\d+)</.exec(blk);
    const ls = blk.indexOf('<tran:lod1MultiSurface>'); if (ls < 0) continue;
    const solid = blk.slice(ls, blk.indexOf('</tran:lod1MultiSurface>', ls));
    const re = new RegExp(POSLIST.source, 'g');
    let m;
    while ((m = re.exec(solid))) {
      const v = m[1].trim().split(/\s+/).map(Number);
      const n = v.length / 3 - 1;
      let cla = 0, clo = 0;
      for (let i = 0; i < n; i++) { cla += v[i * 3]; clo += v[i * 3 + 1]; }
      cla /= n; clo /= n;
      if (!inBB(cla, clo)) continue;
      {
        const [rx, rz] = toXZ(cla, clo);
        if (!nearRoute(rx, rz, ROAD_CORRIDOR)) { farRoads++; continue; }
      }
      const ring = [];
      for (let i = 0; i < n; i++) { const [x, z] = toXZ(v[i * 3], v[i * 3 + 1]); ring.push(r1(x), r1(z)); }
      roads.push([fn ? parseInt(fn[1]) : 0, ...ring]);
      c++;
    }
  }
  console.log('tran ' + f + ': ' + c);
}
if (!ONLY_TERRAIN) writeFileSync('public/data/roads.json', JSON.stringify({ items: roads }));
console.log('roads total', roads.length, `(回廊の外 ${farRoads} 面)`);

// ---------- 地形 (DEM) ----------
const CELL = 5;
const [xMin, zMax] = toXZ(BB.latMin, BB.lonMin);
const [xMax, zMin] = toXZ(BB.latMax, BB.lonMax);
const W = Math.ceil((xMax - xMin) / CELL) + 1, H = Math.ceil((zMax - zMin) / CELL) + 1;
const hsum = new Float32Array(W * H), hcnt = new Uint16Array(W * H);
console.log('terrain grid', W, H);

// DEM は 2 次メッシュ単位 (大きいものは 4 分割: 00 / 05 / 50 / 55)。福山は 4 枚の
// 2 次メッシュにまたがり合計 6GB あって読むのに十数分かかるので、格子に落とした結果を
// data/dem_grid.bin に残し、範囲が同じなら次回からはそれを使う (水面判定の調整用)。
const demFiles = files.filter(f => /_dem(_\d\d)?\.gml$/.test(f)).map(f => path.join(DIR, f));
const CACHE = 'data/dem_grid.bin';
const cacheKey = `${W}x${H}@${xMin.toFixed(2)},${zMin.toFixed(2)}`;
let cached = false;
if (existsSync(CACHE) && existsSync(CACHE + '.key') && readFileSync(CACHE + '.key', 'utf8') === cacheKey) {
  const b = readFileSync(CACHE);
  hsum.set(new Float32Array(b.buffer, b.byteOffset, W * H));
  hcnt.set(new Uint16Array(b.buffer.slice(b.byteOffset + W * H * 4, b.byteOffset + W * H * 6)));
  cached = true;
  console.log('DEM はキャッシュを使います', CACHE);
}
let tri = 0;
for (const demFile of cached ? [] : demFiles) {
console.log('dem', demFile);
let rest = '';
await new Promise((res, rej) => {
  const s = createReadStream(demFile, { encoding: 'utf8', highWaterMark: 1 << 22 });
  s.on('data', chunk => {
    let buf = rest + chunk;
    const last = buf.lastIndexOf('</gml:posList>');
    if (last < 0) { rest = buf; return; }
    rest = buf.slice(last + 14); buf = buf.slice(0, last + 14);
    const re = new RegExp(POSLIST.source, 'g');
    let m;
    while ((m = re.exec(buf))) {
      const v = m[1].trim().split(/\s+/).map(Number);
      if (v.length < 9) continue;
      const [ax, az] = toXZ(v[0], v[1]), [bx, bz] = toXZ(v[3], v[4]), [cx, cz] = toXZ(v[6], v[7]);
      const ay = v[2], by = v[5], cy = v[8];
      const txMin = Math.min(ax, bx, cx), txMax = Math.max(ax, bx, cx);
      const tzMin = Math.min(az, bz, cz), tzMax = Math.max(az, bz, cz);
      if (txMax < xMin || txMin > xMax || tzMax < zMin || tzMin > zMax) continue;
      tri++;
      const i0 = Math.max(0, Math.floor((txMin - xMin) / CELL)), i1 = Math.min(W - 1, Math.ceil((txMax - xMin) / CELL));
      const j0 = Math.max(0, Math.floor((tzMin - zMin) / CELL)), j1 = Math.min(H - 1, Math.ceil((tzMax - zMin) / CELL));
      const det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
      if (Math.abs(det) < 1e-9) continue;
      for (let j = j0; j <= j1; j++) {
        const pz = zMin + j * CELL;
        for (let i = i0; i <= i1; i++) {
          const px = xMin + i * CELL;
          const l1 = ((bx - px) * (cz - pz) - (cx - px) * (bz - pz)) / det;
          const l2 = ((cx - px) * (az - pz) - (ax - px) * (cz - pz)) / det;
          const l3 = 1 - l1 - l2;
          const eps = -0.02;
          if (l1 < eps || l2 < eps || l3 < eps) continue;
          hsum[j * W + i] += l1 * ay + l2 * by + l3 * cy;
          hcnt[j * W + i]++;
        }
      }
    }
  });
  s.on('end', res);
  s.on('error', rej);
});
}
if (!cached) {
  writeFileSync(CACHE, Buffer.concat([Buffer.from(hsum.buffer), Buffer.from(hcnt.buffer)]));
  writeFileSync(CACHE + '.key', cacheKey);
  console.log('dem triangles used', tri);
}

// 水面判定 (呉): 瀬戸内海 (呉湾・音戸の瀬戸) は DEM が欠測。埋立地 (宝町・昭和町) も
// 2m 以上あるので、松江・福山と同じしきい値でよい。
//   DEM 欠測 or 標高 0.3m 未満 → 水面
//   標高 0.3-0.6m → 水面から 2 セル (10m) 以内に限り水面 (護岸の縁)
const raw = new Float32Array(W * H);
const isWater = new Uint8Array(W * H); // 1 = 確定, 3 = 候補(縁)
for (let k = 0; k < W * H; k++) {
  if (hcnt[k] === 0) { isWater[k] = 1; raw[k] = 0; continue; }
  const h = hsum[k] / hcnt[k];
  raw[k] = h;
  if (h < 0.3) isWater[k] = 1; else if (h < 0.6) isWater[k] = 3;
}

// 二河川・堺川は護岸に囲まれた水路で、DEM の標高だけでは水面と見分けにくいので
// OpenStreetMap の水面の輪郭 (data/water.json) を重ねて水にする。橋の桁が DEM に入っている所まで沈めないよう、標高の上限をつける。
{
  const RIVER_MAX_H = 6;   // これより高い所は橋・堰・堤防とみなして水にしない
  const water = JSON.parse(readFileSync('data/water.json', 'utf8')).polygons;
  let filled = 0;
  for (const poly of water) {
    const xs = [], zs = [];
    for (const [la, lo] of poly.ring) { const [x, z] = toXZ(la, lo); xs.push((x - xMin) / CELL); zs.push((z - zMin) / CELL); }
    const n = xs.length;
    if (n < 3) continue;
    const j0 = Math.max(0, Math.floor(Math.min(...zs))), j1 = Math.min(H - 1, Math.ceil(Math.max(...zs)));
    for (let j = j0; j <= j1; j++) {
      const y = j;
      const cross = [];
      for (let k = 0; k < n; k++) {
        const k2 = (k + 1) % n;
        const z1 = zs[k], z2 = zs[k2];
        if ((z1 <= y && z2 > y) || (z2 <= y && z1 > y)) cross.push(xs[k] + ((y - z1) / (z2 - z1)) * (xs[k2] - xs[k]));
      }
      cross.sort((a, b) => a - b);
      for (let k = 0; k + 1 < cross.length; k += 2) {
        const a = Math.max(0, Math.ceil(cross[k])), b = Math.min(W - 1, Math.floor(cross[k + 1]));
        for (let i = a; i <= b; i++) {
          const kk = j * W + i;
          if (isWater[kk] === 1 || raw[kk] > RIVER_MAX_H) continue;
          isWater[kk] = 1;
          filled++;
        }
      }
    }
  }
  console.log(`OSM の水面の輪郭で ${filled} セルを水にしました`);
}

// 呉の DEM は海の上にも三角形が張られていて (対岸の護岸どうしをつないだ 3m 前後の面)、
// 標高では呉湾・音戸の瀬戸を水面と見分けられない。OpenStreetMap の海岸線を壁として
// 格子に描いて領域に分け、OSM の約束 (線の進む向きの右が海) で領域ごとに海か陸かを決める。
// 海岸線は 8 近傍でつながる線として描くので、4 近傍でつないだ領域は線を越えない。
// DEM の欠測を種に塗ると、BBOX の縁で閉じた島 (倉橋島) の中に欠測が 1 セルあるだけで
// 島ごと沈むので使わない。
{
  const coast = JSON.parse(readFileSync('data/water.json', 'utf8')).coastlines ?? [];
  if (coast.length) {
    const wall = new Uint8Array(W * H);
    for (const line of coast) {
      for (let s = 0; s + 1 < line.length; s++) {
        const [ax, az] = toXZ(line[s][0], line[s][1]), [bx, bz] = toXZ(line[s + 1][0], line[s + 1][1]);
        const L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.ceil(L / (CELL / 4)));
        for (let q = 0; q <= m; q++) {
          const i = Math.round((ax + (bx - ax) * q / m - xMin) / CELL), j = Math.round((az + (bz - az) * q / m - zMin) / CELL);
          if (i >= 0 && j >= 0 && i < W && j < H) wall[j * W + i] = 1;
        }
      }
    }
    // 海岸線で区切られた領域ごとに、線の右 (海) と左 (陸) に落ちた標本を数え、多いほうに決める。
    // 1 点の種から塗ると、狭い入り江で対岸に落ちた種 1 つで陸ごと沈むので多数決にする。
    const comp = new Int32Array(W * H).fill(-1);
    let nComp = 0;
    const stack = [];
    for (let k0 = 0; k0 < W * H; k0++) {
      if (wall[k0] || comp[k0] >= 0) continue;
      comp[k0] = nComp; stack.push(k0);
      while (stack.length) {
        const k = stack.pop(), i = k % W, j = (k - i) / W;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ii = i + di, jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
          const kk = jj * W + ii;
          if (wall[kk] || comp[kk] >= 0) continue;
          comp[kk] = nComp; stack.push(kk);
        }
      }
      nComp++;
    }
    const seaVote = new Float64Array(nComp), landVote = new Float64Array(nComp);
    const cellAt = (x, z) => { const i = Math.round((x - xMin) / CELL), j = Math.round((z - zMin) / CELL); return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i; };
    for (const line of coast) {
      for (let s = 0; s + 1 < line.length; s++) {
        const [ax, az] = toXZ(line[s][0], line[s][1]), [bx, bz] = toXZ(line[s + 1][0], line[s + 1][1]);
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 1e-6) continue;
        // 右側の法線 (x = 東, z = 南 の座標で (-dz, dx))
        const rx = -(bz - az) / L, rz = (bx - ax) / L;
        const m = Math.max(1, Math.ceil(L / CELL));
        for (let q = 0; q < m; q++) {
          const t = (q + 0.5) / m, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
          for (const off of [1.2, 2.2]) {
            const kr = cellAt(x + rx * CELL * off, z + rz * CELL * off), kl = cellAt(x - rx * CELL * off, z - rz * CELL * off);
            if (kr >= 0 && comp[kr] >= 0) seaVote[comp[kr]]++;
            if (kl >= 0 && comp[kl] >= 0) landVote[comp[kl]]++;
          }
        }
      }
    }
    const sea = new Uint8Array(W * H);
    for (let k = 0; k < W * H; k++) { const c = comp[k]; if (c >= 0 && seaVote[c] > landVote[c]) sea[k] = 1; }
    // 海岸線そのもの (壁) のセルは、4 近傍に海が 2 つ以上あれば海にする
    for (let k = 0; k < W * H; k++) {
      if (!wall[k]) continue;
      const i = k % W, j = (k - i) / W;
      let n = 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < W && jj < H && sea[jj * W + ii]) n++; }
      if (n >= 2) sea[k] = 2;
    }
    console.log(`海岸線で区切った領域 ${nComp} 個のうち海 ${[...seaVote].filter((v, c) => v > landVote[c]).length} 個`);
    let added = 0;
    for (let k = 0; k < W * H; k++) if (sea[k] && isWater[k] !== 1) { isWater[k] = 1; added++; }
    console.log(`海岸線の海側の ${added} セルを海にしました`);
  }
}
const budget = new Uint8Array(W * H);
const stack = [];
for (let k = 0; k < W * H; k++) if (isWater[k] === 1) { budget[k] = 3; stack.push(k); }
while (stack.length) {
  const k = stack.pop();
  const i = k % W, j = (k - i) / W;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const ii = i + di, jj = j + dj;
    if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
    const kk = jj * W + ii;
    if (isWater[kk] === 3 && budget[k] > 1) { isWater[kk] = 1; budget[kk] = budget[k] - 1; stack.push(kk); }
  }
}
const heights = new Int16Array(W * H);
let water = 0;
for (let k = 0; k < W * H; k++) {
  if (isWater[k] === 1) { heights[k] = -32768; water++; continue; }
  heights[k] = Math.round(raw[k] * 10);
}
// 孤立した水セル/陸セルのノイズ除去 (3x3多数決)
const cleaned = new Int16Array(heights);
for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
  let w = 0, sum = 0, n = 0;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const v = heights[(j + dj) * W + i + di];
    if (v === -32768) w++; else { sum += v; n++; }
  }
  const k = j * W + i;
  if (heights[k] === -32768 && w <= 2) cleaned[k] = Math.round(sum / n);
  else if (heights[k] !== -32768 && w >= 7) cleaned[k] = -32768;
}
// 海の中に残る浅瀬 (DEM に 0.3-1.5m の細長い帯として入っている) は水面へ戻す。
// 周囲をすべて水に囲まれた小さな陸のうち、最高点が 1.5m 未満のものが対象。
// 弁天島・仙酔島は 1.5m より高いので残る。
{
  const seen = new Uint8Array(W * H);
  let removed = 0;
  for (let k0 = 0; k0 < W * H; k0++) {
    if (seen[k0] || cleaned[k0] === -32768) continue;
    const comp = [k0];
    seen[k0] = 1;
    let top = -Infinity, touchesEdge = false;
    for (let q = 0; q < comp.length; q++) {
      const k = comp[q], i = k % W, j = (k - i) / W;
      top = Math.max(top, cleaned[k]);
      if (i === 0 || j === 0 || i === W - 1 || j === H - 1) touchesEdge = true;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
        const kk = jj * W + ii;
        if (seen[kk] || cleaned[kk] === -32768) continue;
        seen[kk] = 1;
        comp.push(kk);
      }
    }
    if (comp.length > 4000 || touchesEdge || top >= 15) continue;
    for (const k of comp) cleaned[k] = -32768;
    removed += comp.length;
  }
  console.log(`海の浅瀬を水面に戻したセル ${removed}`);
}
writeFileSync('public/data/terrain.bin', Buffer.from(cleaned.buffer));
writeFileSync('public/data/terrain.json', JSON.stringify({ w: W, h: H, cell: CELL, x0: xMin, z0: zMin, water: -32768, scale: 0.1 }));
console.log('terrain written, water cells', water, 'of', W * H);
