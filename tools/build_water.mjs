// OpenStreetMap の水面の輪郭 (data/osm/water_raw.json) を data/water.json にまとめる。
//   node tools/fetch_water.mjs && node tools/build_water.mjs
// tools/convert_citygml.mjs がこれを読んで、DEM の標高では見分けられない川の水面を
// 水にする。リレーション (マルチポリゴン) の outer は端点でつないで環にする。
import { readFileSync, writeFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('data/osm/water_raw.json', 'utf8')).elements;
const key = p => p.lat.toFixed(7) + ',' + p.lon.toFixed(7);

/** way の並びを端点でつないで環にする (閉じたものだけ返す) */
function rings(ways) {
  const segs = ways.filter(w => w.geometry?.length > 1).map(w => w.geometry.slice());
  const out = [];
  while (segs.length) {
    let cur = segs.shift();
    let grew = true;
    while (grew && key(cur[0]) !== key(cur[cur.length - 1])) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (key(s[0]) === key(cur[cur.length - 1])) { cur = cur.concat(s.slice(1)); segs.splice(i, 1); grew = true; break; }
        if (key(s[s.length - 1]) === key(cur[cur.length - 1])) { cur = cur.concat(s.slice(0, -1).reverse()); segs.splice(i, 1); grew = true; break; }
        if (key(s[s.length - 1]) === key(cur[0])) { cur = s.slice(0, -1).concat(cur); segs.splice(i, 1); grew = true; break; }
        if (key(s[0]) === key(cur[0])) { cur = s.slice(1).reverse().concat(cur); segs.splice(i, 1); grew = true; break; }
      }
    }
    if (key(cur[0]) === key(cur[cur.length - 1]) && cur.length > 3) out.push(cur);
  }
  return out;
}

const polys = [];
const open = [];   // 閉じていない way (リレーションの outer の断片)
// 海岸線 (natural=coastline) は水面の多角形ではなく、海と陸の境の線として別に持つ
const coastlines = [];
for (const e of raw) {
  if (e.type !== 'way') continue;
  const g = e.geometry;
  if (e.tags?.natural === 'coastline') { if (g?.length > 1) coastlines.push(g.map(q => [+q.lat.toFixed(6), +q.lon.toFixed(6)])); continue; }
  if (!g || g.length < 3) continue;
  if (key(g[0]) === key(g[g.length - 1]) && g.length >= 4) polys.push({ name: e.tags?.name ?? '', ring: g });
  else open.push(e);
}
// 断片は端点でつないで環にする (芦田川の水面はこちら)
const joined = rings(open);
console.log(`閉じた way ${polys.length} / 断片 ${open.length} → 環 ${joined.length}`);
for (const r of joined) polys.push({ name: '', ring: r });

const out = polys.map(p => ({
  name: p.name,
  ring: p.ring.slice(0, -1).map(q => [+q.lat.toFixed(6), +q.lon.toFixed(6)]),
}));
writeFileSync('data/water.json', JSON.stringify({
  comment: '川・池の水面の輪郭 ([緯度, 経度] の閉じない多角形) と海岸線 (coastlines, [緯度, 経度] の折れ線)。OpenStreetMap (ODbL)。tools/build_water.mjs が生成。',
  polygons: out,
  coastlines,
}));
console.log(`海岸線 ${coastlines.length} 本 / 頂点 ${coastlines.reduce((s, c) => s + c.length, 0)}`);
console.log(`水面 ${out.length} 面 / 頂点 ${out.reduce((s, p) => s + p.ring.length, 0)}`);
for (const p of out.filter(p => p.ring.length > 30)) console.log(`  ${p.name || '(無名)'} ${p.ring.length} 点`);
