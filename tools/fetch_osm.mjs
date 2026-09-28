// ルート計画用の OpenStreetMap データ (道路・鉄道) を Overpass API から取る
//   node tools/fetch_osm.mjs   → data/osm/kure.json
// Node の fetch では Overpass に繋がらない環境があったので curl を使う。
// データは © OpenStreetMap contributors (ODbL)。
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

// 呉駅〜休山〜音戸大橋の回廊。倉橋島の北端 (音戸) まで入れる。
const BBOX = '34.180,132.515,34.272,132.625';
const query = `[out:json][timeout:180];(
  way["highway"~"^(trunk|primary|secondary|tertiary|trunk_link|primary_link|unclassified|residential)$"](${BBOX});
  way["railway"~"rail|light_rail"](${BBOX});
  node["railway"="station"](${BBOX});
);out geom tags;`;
mkdirSync('data/osm', { recursive: true });
const tmp = 'data/osm/query.txt';
writeFileSync(tmp, query);
execFileSync('curl', ['-s', '-m', '240', '-A', 'kure-kart', '--data-urlencode', `data@${tmp}`, 'https://overpass-api.de/api/interpreter', '-o', 'data/osm/kure.json'], { stdio: 'inherit' });
console.log('data/osm/kure.json を書き出しました');
