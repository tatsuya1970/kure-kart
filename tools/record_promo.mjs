// プロモ動画の素材を一括で撮る。
//   node tools/record_promo.mjs [クリップ名...]
// 名前を省くと全部撮る。撮り終わったら tools/clips_to_mp4.mjs で mp4 にする。
//
// warm は「撮り始める前に空回しするコマ数」。?idx= で置いた車は速度 0 から始まるので、
// 流し撮りのクリップは巡航速度に乗るまで (およそ 100 コマ) 空回ししてから撮る。
// 見せ場 (主塔・ゴール) の到達コマは tools/_probe_idx.mjs で実測した値から逆算してある。
// idx は data/course_path.json の通し番号。コースを引き直したらここも直すこと。
//
// 縦型 (9:16) を撮るときは出力先と画面サイズを環境変数で渡す:
//   OUT=videos/clips9x16 W=1080 H=1920 node tools/record_promo.mjs
// three.js の fov は垂直画角なので、縦長にしても被写体の大きさは変わらず左右だけ狭くなる。
// 橋の主塔・常夜燈・天守はどれも縦長なので、画角はそのままのほうが収まりが良い。
import { spawnSync } from 'node:child_process';

const OUT = process.env.OUT ?? 'videos/clips';
// Q_<クリップ名> でそのクリップだけクエリを足せる。縦型でゴールの画角を広げるなど。
//   Q_goal='&fovadd=18&campan=-2' node tools/record_promo.mjs goal
const extraFor = name => process.env[`Q_${name}`] ?? '';

const BASE = 'rec=1&nohud=1&nofps=1&debug=1&q=high';
const CLIPS = [
  // 福山城を空から。撮影カメラを 7度/秒 で回す (wp=2 が福山城)
  { name: 'castle', secs: 5.0, warm: 2, q: `${BASE}&wp=2&photo=34.49104,133.36113,16,110,140&orbit=7` },
  // 福山駅のスタート。ライバルを前に並べて 8 台が画に入るようにする (ここだけは静止発進が正しい)。
  // warm=16 は、スタート地点に立っている「福山駅」の地名看板をカメラが通り抜けるまで空回しするため。
  { name: 'grid', secs: 3.5, warm: 16, q: `${BASE}&ai=1&ahead=1&idx=14&cam=1` },
  // 駅を出て国道2号を東へ。市街地の疾走
  { name: 'city', secs: 4.5, warm: 120, q: `${BASE}&ai=1&ahead=1&idx=350&cam=0` },
  // 芦田川大橋の主塔をくぐる。主塔 (idx 6200) を 63 コマ目 = 2.1s に通す
  { name: 'bridge', secs: 4.5, warm: 186, q: `${BASE}&ai=1&ahead=1&idx=6018&cam=0` },
  // 県道22号の海沿い。瀬戸内海が左手に開けるのは idx 8130〜8630 の間だけ
  { name: 'coast', secs: 4.0, warm: 120, q: `${BASE}&ai=1&ahead=1&idx=8436&cam=1` },
  // 鞆の浦・常夜燈へのゴール。ゴール (idx 10350) を 64 コマ目 = 2.1s に通す
  { name: 'goal', secs: 5.0, warm: 251, q: `${BASE}&ai=1&ahead=1&idx=10139&cam=0` },
];

const want = process.argv.slice(2);
for (const c of CLIPS) {
  if (want.length && !want.includes(c.name)) continue;
  console.log(`=== ${c.name} (${c.secs}s)`);
  const r = spawnSync(process.execPath, ['tools/record_clip.mjs', `${OUT}/${c.name}`, String(c.secs), c.q + extraFor(c.name)],
    { stdio: 'inherit', env: { ...process.env, WARM: String(c.warm) } });
  if (r.status !== 0) { console.error(`${c.name} で失敗しました`); process.exit(1); }
}
console.log('done');
