// OpenStreetMap の線路 (data/osm/rail_raw.json) から data/rail.json を組み立てる。
//   node tools/fetch_rail.mjs && node tools/build_rail.mjs
// ・同じ路線名の way を端点でつないで 1 本の折れ線にする
// ・コースの周り (BBOX) だけ切り出して 60m 間隔に間引く
// ・h (地面からの高さ) は OSM の bridge=yes が付いた所だけ高架。地上との境目は ramp m で傾ける
// ・呉線は休山・川原石の下をトンネルで抜ける。トンネルは描かないので、呉駅を含む地上区間だけ使う
// データは © OpenStreetMap contributors (ODbL)。
import { readFileSync, writeFileSync } from 'node:fs';

const BB = { latMin: 34.2300, latMax: 34.2600, lonMin: 132.5300, lonMax: 132.6040 };
const KURE_STA = { lat: 34.2446363, lon: 132.5574725 };
const ky = 110950, kx = 111320 * Math.cos(34.24 * Math.PI / 180);

const raw = JSON.parse(readFileSync('data/osm/rail_raw.json', 'utf8')).elements;
const key = p => p.lat.toFixed(7) + ',' + p.lon.toFixed(7);

/** 同じ路線の way を端点でつないで、連結成分を長い順に折れ線で返す */
function stitch(ways) {
  // 高架かどうかは way 単位のタグなので、点に持たせてから連結する
  const segs = ways.map(w => w.geometry.map(p => ({ lat: p.lat, lon: p.lon, br: w.tags?.bridge === 'yes', tn: w.tags?.tunnel === 'yes' })));
  const out = [];
  while (segs.length) {
    let cur = segs.shift();
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (key(s[0]) === key(cur[cur.length - 1])) { cur = cur.concat(s.slice(1)); segs.splice(i, 1); grew = true; break; }
        if (key(s[s.length - 1]) === key(cur[0])) { cur = s.concat(cur.slice(1)); segs.splice(i, 1); grew = true; break; }
        if (key(s[s.length - 1]) === key(cur[cur.length - 1])) { cur = cur.concat(s.slice(0, -1).reverse()); segs.splice(i, 1); grew = true; break; }
        if (key(s[0]) === key(cur[0])) { cur = s.slice(1).reverse().concat(cur); segs.splice(i, 1); grew = true; break; }
      }
    }
    out.push(cur);
  }
  const len = p => { let L = 0; for (let i = 0; i + 1 < p.length; i++) L += Math.hypot((p[i].lat - p[i + 1].lat) * ky, (p[i].lon - p[i + 1].lon) * kx); return L; };
  out.sort((a, b) => len(b) - len(a));
  return out;
}

const inBB = p => p.lat >= BB.latMin && p.lat <= BB.latMax && p.lon >= BB.lonMin && p.lon <= BB.lonMax;

/** BBOX の中でトンネルを除いて連続している部分のうち、呉駅にいちばん近いものを取る */
function clip(comps) {
  const runs = [];
  for (const pts of comps) {
    let cur = [];
    for (const p of pts) { if (inBB(p) && !p.tn) cur.push(p); else { if (cur.length > 1) runs.push(cur); cur = []; } }
    if (cur.length > 1) runs.push(cur);
  }
  const dSta = r => Math.min(...r.map(p => Math.hypot((p.lat - KURE_STA.lat) * ky, (p.lon - KURE_STA.lon) * kx)));
  runs.sort((a, b) => dSta(a) - dSta(b));
  return runs[0] ?? [];
}

/** 約 step m 間隔に間引く */
function thin(pts, step) {
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += Math.hypot((pts[i].lat - pts[i - 1].lat) * ky, (pts[i].lon - pts[i - 1].lon) * kx);
    if (acc >= step || i === pts.length - 1) { out.push(pts[i]); acc = 0; }
  }
  return out;
}

/**
 * OSM の bridge=yes が付いた区間だけ高さ h にする。地上の点までの距離が ramp m 未満なら
 * その分だけ下げて、取り付けを傾ける。BBOX で切った両端も地上とみなして 0 まで落とす
 * (地面に潜らせないため)。
 */
function withHeight(pts, h, ramp) {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot((pts[i].lat - pts[i - 1].lat) * ky, (pts[i].lon - pts[i - 1].lon) * kx));
  const total = d[d.length - 1];
  return pts.map((p, i) => {
    if (!p.br) return { lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), h: 0 };
    let gap = Math.min(d[i], total - d[i]);            // 折れ線の端まで
    for (let j = 0; j < pts.length; j++) if (!pts[j].br) gap = Math.min(gap, Math.abs(d[j] - d[i]));
    return { lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), h: +(h * Math.min(1, gap / ramp)).toFixed(2) };
  });
}

function line(name, h, ramp, step) {
  // 駅の構内は上下 2 本の線路が同じ端点を結んでいる。つなぐと枝分かれするので 1 本にする
  const seenEnds = new Set();
  const ways = raw.filter(e => e.type === 'way' && e.tags?.name === name).filter(w => {
    const g = w.geometry, k = [key(g[0]), key(g[g.length - 1])].sort().join('|');
    if (seenEnds.has(k)) return false;
    seenEnds.add(k);
    return true;
  });
  const pts = thin(clip(stitch(ways)), step);
  console.log(`${name}: way ${ways.length} → ${pts.length} 点`);
  return withHeight(pts, h, ramp);
}

// 呉駅は地上駅。川原石側のトンネルを出て、国道31号の下をくぐって呉駅に入り、
// 東は休山の下のトンネルへ入る。高架は川を渡る橋だけ。
const kure = line('JR呉線', 6, 120, 60);

writeFileSync('data/rail.json', JSON.stringify({
  comment: '呉市内の鉄道の実在位置 (緯度経度)。線形は OpenStreetMap (ODbL) の JR呉線から取った。h は地面からの高さ (m)。新幹線は通っていないので shinkansen は null。tools/build_rail.mjs が生成。',
  shinkansen: null,
  jr: {
    name: 'JR呉線 (呉駅付近)',
    trackSpacing: 0,
    embankment: 0.8,
    viaductHeight: 6,
    stations: [{ name: '呉駅', lat: KURE_STA.lat, lon: KURE_STA.lon }],
    path: kure,
  },
  landmarks: JSON.parse(readFileSync('data/landmarks.json', 'utf8')),
}, null, 1));
console.log('data/rail.json を書き出しました');
