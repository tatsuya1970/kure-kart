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
import { spawnSync } from 'node:child_process';

const OUT = process.env.OUT ?? 'videos/clips';
// Q_<クリップ名> でそのクリップだけクエリを足せる。縦型でゴールの画角を広げるなど。
// 元のクエリにある項目 (idx など) は Q_ の値で上書きする。
//   Q_goal='&fovadd=18&campan=-2' node tools/record_promo.mjs goal
// 縦型では左右が狭く、大和ミュージアムとアレイの艦がコースの右手で画面の外に出る。
// 撮る区間を艦・建物に近い所へずらし、視線を右へ振って撮った (museum は入れない指定のてつのくじら館の看板を消す):
//   Q_museum='&idx=990&fovadd=15&campan=8&nogate=くじら館' Q_alley='&idx=3630&fovadd=15&campan=11'
// 縦型の音戸大橋は、倉橋島側の螺旋を下る所 (回るたびに第二音戸大橋が前を横切る) に替えた:
//   Q_spiral='&idx=6092&fovadd=15'
const withExtra = (q, name) => {
  const p = new URLSearchParams(q);
  for (const [k, v] of new URLSearchParams(process.env[`Q_${name}`] ?? '')) p.set(k, v);
  return decodeURIComponent(p.toString());
};

const BASE = 'rec=1&nohud=1&nofps=1&debug=1&q=high';
const CLIPS = [
  // 発走前の演出: 呉駅の正面に寄り、呉駅を背にした 8 台へ回り込む (演出の 1.0〜5.0 秒)
  { name: 'station', secs: 4.0, warm: 30, start: true, q: 'rec=1&nohud=1&nofps=1&q=high' },
  // 呉駅前のスタート。ライバルを前に並べて 8 台が画に入るようにする (ここだけは静止発進が正しい)
  { name: 'start', secs: 4.0, warm: 16, q: `${BASE}&ai=1&ahead=1&idx=14&cam=1` },
  // 大和ミュージアムの前 (地名看板 idx 1204) を団子で並走する。巡航はおよそ 1 idx/コマ
  { name: 'museum', secs: 4.5, warm: 120, q: `${BASE}&ai=1&ahead=1&idx=1040&cam=1` },
  // 宮原の造船所。赤白のジブクレーンとドックがコースの右前に並ぶ (idx 2875-2950)。縦型は Q_shipyard='&fovadd=15'
  { name: 'shipyard', secs: 4.5, warm: 120, q: `${BASE}&ai=1&ahead=1&idx=2810&cam=1&campan=9` },
  // アレイからすこじま (地名看板 idx 3872)。右手の海に護衛艦と潜水艦
  { name: 'alley', secs: 4.5, warm: 120, q: `${BASE}&ai=1&ahead=1&idx=3680&cam=1` },
  // 音戸大橋。螺旋の上段から主桁 (idx 6059-6149) へ。螺旋では 0.7 idx/コマほどに落ちる
  { name: 'ondo', secs: 5.0, warm: 120, q: `${BASE}&ai=1&ahead=1&idx=5963&cam=1` },
  // 音戸大橋の本州側の螺旋で団子のカーチェイス。頭上に上の段と橋脚、上るにつれて朱色のアーチと下の段が見える
  { name: 'spiral', secs: 4.5, warm: 120, q: `${BASE}&ai=1&ahead=1&idx=5840&cam=1` },
  // 音戸でゴール。倉橋島側の螺旋を下りきってゴール (idx 6388) を 63 コマ目 = 2.1s に通す (6180 から 288 コマで到達)
  { name: 'goal', secs: 5.0, warm: 225, q: `${BASE}&ai=1&ahead=1&idx=6180&cam=1` },
];

const want = process.argv.slice(2);
for (const c of CLIPS) {
  if (want.length && !want.includes(c.name)) continue;
  console.log(`=== ${c.name} (${c.secs}s)`);
  const r = spawnSync(process.execPath, ['tools/record_clip.mjs', `${OUT}/${c.name}`, String(c.secs), withExtra(c.q, c.name)],
    { stdio: 'inherit', env: { ...process.env, WARM: String(c.warm), START: c.start ? '1' : '' } });
  if (r.status !== 0) { console.error(`${c.name} で失敗しました`); process.exit(1); }
}
console.log('done');
