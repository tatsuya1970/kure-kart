// OpenStreetMap の公園の輪郭 (data/osm/parks_raw.json) から data/parks.json を作る。
//   node tools/fetch_parks.mjs && node tools/build_parks.mjs
// PLATEAU には公園の輪郭が無いので、芝と樹木はここから起こす。
// コースから離れた公園と、小さすぎるものは落とす。
import { readFileSync, writeFileSync } from 'node:fs';

const MIN_AREA = 2000;      // m^2
const MAX_DIST = 400;       // コースからの距離 (m)
const MAX_POINTS = 60;      // 輪郭の点数の上限
const SIMPLIFY = 8;         // これより近い点は間引く (m)

// 樹木の多い公園 (城址・山の公園) は grove、それ以外は lawn
const GROVE = /入船山公園|串山公園|恵下山公園|金毘羅山公園|寺迫公園/;

const course = JSON.parse(readFileSync('data/course_path.json', 'utf8'));
const o = course.origin;
const mPerLat = 110950, mPerLon = 111320 * Math.cos(o.lat * Math.PI / 180);
const toXZ = (lat, lon) => [(lon - o.lon) * mPerLon, -(lat - o.lat) * mPerLat];

const raw = JSON.parse(readFileSync('data/osm/parks_raw.json', 'utf8')).elements;
const areas = [];
for (const e of raw) {
  const g = e.geometry;
  if (!g || g.length < 4 || !e.tags?.name) continue;
  const pts = g.map(p => toXZ(p.lat, p.lon));
  let A = 0, cx = 0, cz = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const f = a[0] * b[1] - b[0] * a[1];
    A += f; cx += (a[0] + b[0]) * f; cz += (a[1] + b[1]) * f;
  }
  A /= 2;
  if (Math.abs(A) < MIN_AREA) continue;
  cx /= 6 * A; cz /= 6 * A;
  let d = Infinity;
  for (const p of course.points) { const dd = Math.hypot(p[0] - cx, p[1] - cz); if (dd < d) d = dd; }
  if (d > MAX_DIST) continue;

  // 閉じの重複点を落として間引く
  const ll = g.slice(0, -1);
  const keep = [ll[0]];
  for (const p of ll.slice(1)) {
    const q = keep[keep.length - 1];
    if (Math.hypot((p.lat - q.lat) * mPerLat, (p.lon - q.lon) * mPerLon) >= SIMPLIFY) keep.push(p);
  }
  const step = Math.ceil(keep.length / MAX_POINTS);
  const ring = keep.filter((_, i) => i % step === 0).map(p => [+p.lat.toFixed(6), +p.lon.toFixed(6)]);
  if (ring.length < 4) continue;

  const grove = GROVE.test(e.tags.name);
  areas.push({
    name: e.tags.name,
    kind: grove ? 'grove' : 'lawn',
    trees: Math.min(grove ? 500 : 80, Math.round(Math.abs(A) / (grove ? 330 : 1400))),
    comment: `輪郭は OpenStreetMap (ODbL) の way ${e.id} を間引いたもの。面積 ${Math.round(Math.abs(A))}m²、コースから ${Math.round(d)}m。`,
    ring,
  });
}
areas.sort((a, b) => b.trees - a.trees);

writeFileSync('data/parks.json', JSON.stringify({
  comment: '公園の緑地。PLATEAU には公園の輪郭が無いため、OpenStreetMap の公園の輪郭を使う。ring は [緯度, 経度] の閉じない多角形。濠を持つ公園は無い (moat は null)。tools/build_parks.mjs が生成。',
  areas,
  moat: null,
}, null, 1));
console.log(`公園 ${areas.length} か所 / 樹木 ${areas.reduce((s, a) => s + a.trees, 0)} 本`);
for (const a of areas) console.log(`  ${a.name} (${a.kind}) 木 ${a.trees} 点 ${a.ring.length}`);
