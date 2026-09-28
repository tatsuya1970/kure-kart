// 水面 (川・池) の輪郭を Overpass API から取る
//   node tools/fetch_water.mjs   → data/osm/water_raw.json
// PLATEAU の DEM は川の水面も「地面」として標高を持つ。芦田川は河口堰で
// 水位が T.P. 1.8m に保たれていて、標高だけでは水面と見分けられないので輪郭が要る。
// データは © OpenStreetMap contributors (ODbL)。
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const BBOX = '34.182,132.518,34.268,132.612';
// リレーション (マルチポリゴン) は out geom だけでは members が返らないので、
// outer の way を way(r:"outer") で別に取る。
const query = `[out:json][timeout:180];(
  way["natural"="water"](${BBOX});
  way["natural"="coastline"](${BBOX});
  way["waterway"="riverbank"](${BBOX});
  rel["natural"="water"](${BBOX})->.r;
  way(r.r:"outer");
);out geom tags;`;
mkdirSync('data/osm', { recursive: true });
writeFileSync('data/osm/water_query.txt', query);
execFileSync('curl', ['-s', '-m', '240', '-A', 'kure-kart', '--data-urlencode', 'data@data/osm/water_query.txt', 'https://overpass-api.de/api/interpreter', '-o', 'data/osm/water_raw.json'], { stdio: 'inherit' });
console.log('data/osm/water_raw.json を書き出しました');
