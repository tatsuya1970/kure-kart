// 公園の輪郭を Overpass API から取る (PLATEAU には公園の輪郭が無い)
//   node tools/fetch_parks.mjs   → data/osm/parks_raw.json
// データは © OpenStreetMap contributors (ODbL)。
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const BBOX = '34.186,132.525,34.262,132.605';
const query = `[out:json][timeout:180];(
  way["leisure"~"^(park|garden)$"](${BBOX});
  way["landuse"="recreation_ground"](${BBOX});
);out geom tags;`;
mkdirSync('data/osm', { recursive: true });
writeFileSync('data/osm/parks_query.txt', query);
execFileSync('curl', ['-s', '-m', '240', '-A', 'kure-kart', '--data-urlencode', 'data@data/osm/parks_query.txt', 'https://overpass-api.de/api/interpreter', '-o', 'data/osm/parks_raw.json'], { stdio: 'inherit' });
console.log('data/osm/parks_raw.json を書き出しました');
