// プロモ動画で使う日本語フォントを、使う文字だけに絞って取ってくる。
//   node tools/fetch_promo_font.mjs <出力ディレクトリ>
//
// HyperFrames のレンダリングは素の headless Chrome で走るので、システムの日本語フォント
// (Yu Gothic / Hiragino など) は入っていない。ファイルとして同梱した @font-face しか効かない。
// Google Fonts の css2 API は text= を付けると「その文字だけ」の woff2 を返すので、
// フルの CJK (1書体 5MB 超) を持ち込まずに済む。
// Noto Sans JP — SIL Open Font License 1.1。
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) { console.error('使い方: node tools/fetch_promo_font.mjs <出力ディレクトリ>'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

// 動画に出る文字 + 取りこぼし対策 (ASCII 全部・かな全部・よく使う記号)
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const HIRAGANA = Array.from({ length: 96 }, (_, i) => String.fromCharCode(0x3041 + i)).join('');
const KATAKANA = Array.from({ length: 96 }, (_, i) => String.fromCharCode(0x30a1 + i)).join('');
const SYMBOLS = '、。・「」『』（）［］〈〉ー〜…‥／＼％＋－×÷＝→←↑↓©℃　';
const COPY = [
  '実在の福山', '福山グランプリ', 'FUKUYAMA KART',
  '最大8人', 'オンライン対戦',
  'この街はつくり物じゃない', '国土交通省 PLATEAU 3D都市モデル 福山市 2020年度',
  '芦田川大橋', 'Ashidagawa Ohashi Bridge',
  '福山駅から', 'km', '県道22号', '鞆の浦',
  'GOAL', '鞆の浦 常夜燈', '1859年 高さ11m', 'Tomonoura Joyato',
  'tatsuya1970.github.io/fukuyama-kart',
  'ブラウザでいますぐ', 'インストール不要',
].join('');

const chars = [...new Set((ASCII + HIRAGANA + KATAKANA + SYMBOLS + COPY).split(''))].join('');
console.log(`字数 ${chars.length}`);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

for (const weight of [400, 700, 900]) {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&text=${encodeURIComponent(chars)}`;
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  // text= で絞ると URL は拡張子なし (fonts.gstatic.com/l/font?kit=...) になる
  const m = /src:\s*url\((https:\/\/[^)]+)\)\s*format\('woff2'\)/.exec(css) || /src:\s*url\((https:\/\/[^)]+)\)/.exec(css);
  if (!m) { console.error(`weight ${weight}: woff2 の URL が取れませんでした\n${css.slice(0, 400)}`); process.exit(1); }
  const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
  const file = path.join(outDir, `NotoSansJP-${weight}.woff2`);
  writeFileSync(file, buf);
  console.log(`weight ${weight}: ${file} ${(buf.length / 1024).toFixed(0)}KB`);
}
console.log('done — Noto Sans JP / SIL Open Font License 1.1');
