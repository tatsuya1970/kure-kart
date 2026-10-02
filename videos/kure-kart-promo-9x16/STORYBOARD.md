---
format: 1080x1920
duration: 30s
message: "実在の呉が、そのままコースになる — ブラウザで、8人で"
arc: 呉駅で掴む → 8人で出走 → 大和ミュージアム → 宮原の造船所 → アレイからすこじま → 音戸大橋 → 音戸にゴール → URL
audience: 呉にゆかりのある人と、PLATEAU / 3D都市モデルに関心のある人
mode: collaborative
music: assets/audio/bgm.mp3 (ユーザー指定「急加速のカーブ.mp3」)
---

## Video direction

- **縦型 (1080x1920)** — 16:9 版と同じ構成・文言・タイミングを、縦の画面に組み直す。映像は縦で撮り直したもの。
  文字は画面の中ほど〜下 1/3 (上下 12% はスマホの UI に隠れるので避ける)。横幅が狭いので、見出しは 1 行に収まる大きさにする。
  エンドカードの URL は大きく、画面の中央に。

- **パレット（`frame.md` の役割どおり。色を発明しない）** — 地 = 濃紺 `#0B1A2A` / 本文 = 白 /
  アクセント = 黄 `#FFD83D` ただ一色。第二のアクセントは作らない。
  実写フレーム (1〜6) は**映像そのものが地**で、文字の下敷きだけが濃紺 75%。
  declarative なエンドカード (7) だけが濃紺のベタ地を持つ。
- **タイポ** — `frame.md` の役割名で指定する（display / h1 / h2 / lead / label）。生のフォント名や px は書かない。
  日本語が載るので `frame.md` のフォントスタックをそのまま使うこと。
- **モーション文法** — 既定のイージングは長い尾を引く `power3`（弾ませない）。
  入場は spring-pop entrance を smooth settle で。語の出現は per-word staggered reveal、
  言い換えは hard-cut word-swap（フェードしない）。
- **出し方のモデル（前倒し禁止）** — このビデオは**無音**なので、声の代わりに「画が語る順番」に合わせて出す。
  各フレームは必ず**映像だけの無文字の窓から始め**、文字はその後ろ半分に散らして出す。
  t=0 に全部載せることを禁ずる。
- **地名の見出し（3〜5 共通の型）** — 各カーチェイスの場所は、左下のネームプレート（黄の rule + h2 の地名 +
  label の英語名）を**同じ位置・同じ動き**で出す。場所が変わっても型が変わらないことで「コースを進んでいる」と読ませる。
- **静止の配分** — フレーム 7（エンドカード）は**意図的に止めるフレーム**（URL を読ませる）。
  それ以外は最後の窓で hold に入る。hold 中に動かしてよいのは映像そのものだけ。
- **カット** — 1→6 はすべてハードカット（レースの速度感はカットの速さで出す）。6→7 だけ 0.4s クロスフェード。
- **可読性** — 明るい昼景の上に白文字を置くので、**文字には必ず下敷き**（濃紺 75% の帯、または下方向グラデーション）。
  文字は上下左右 5.5cqw の内側、かつ下端 17%（キャプション帯）には置かない。
- **やらないこと** — 無限ループ（particles / marquee / 回り続けるロゴ）、`Math.random` や `Date.now`、
  保持中の lazy breathing（カードの拡大縮小ループ）、後半の遅いパン/プッシュ、
  第二のアクセント色、角丸・影・グラデーション地（broadside は平面）、
  2 つの失敗形（前倒しして固まる「スライドショー」／全部が独立に漂う「スクリーンセーバー」）。

## Frame 1 — 呉駅で掴む

- scene: 呉駅の駅ビル（「JR 呉 駅 KURE STATION」）に寄り、振り向くと駅を背にカートが並んでいる。タイトルが組み上がる
- duration: 4s
- transition_in: cut
- status: animated
- src: compositions/frames/01-station.html
- poster: 3.6s
- type: hook
- blueprint: kinetic-type-beats (Adapt)
- focal: assets/station.mp4
- roles: station.mp4 = background (full-bleed, 減光なし — 昼景そのものを見せる)
- asset_candidates: assets/station.mp4 — ゲームの発走前の演出を撮ったもの。呉駅の正面に寄り、呉駅を背にした 8 台へ回り込む (4.0s)
- onscreen: 「実在の、呉。」→「呉グランプリ」/ 小さく「KURE KART」

掴みは**街そのもの**。見覚えのある呉駅の正面（CREST の緑のアーチと「JR 呉 駅 KURE STATION」）から入り、
カメラが回り込むとそこに 8 台が並んでいる、という順で「これは実在の呉で、レースが始まる」と分からせる。

Adapt: ビートで文を組み上げる signature（各ビートが自分の動きを持ち、最後に payoff が pop する）は残す。
組み上げる場所が素のキャンバスではなく**実写映像の上**で、payoff が一文ではなくワードマークになる。

Scene 1 (0.0–1.5s): `station.mp4` のみ全面。呉駅の正面へ寄っていく。文字ゼロ。
Scene 2 (1.5–2.5s): 下 1/3 に濃紺 75% の帯が下からワイプで入り、その上に「実在の、」「呉。」が per-word staggered reveal で 2 拍。rule-of-thirds の下段左、帯の高さは画面の ~18%。
Scene 3 (2.5–3.0s): 文が hard-cut word-swap で消え、同じベースラインに黄の rule（36×2 のスタブ）が左から引かれる。映像はカートへ回り込んでいく。
Scene 4 (3.0–4.0s): rule の上に display で「呉グランプリ」が spring-pop entrance（smooth settle）で着地し、その右下に label で小さく「KURE KART」。以後 held — 文字は動かさず、映像の回り込みだけが生きている。

## Frame 2 — 8人で出走

- scene: 呉駅前のスタート。8 台が一斉に走り出し、押し合いながら今西通りへ。8 色のドライバーチップが順に並ぶ
- duration: 3.5s
- transition_in: cut
- status: animated
- src: compositions/frames/02-start.html
- poster: 3.5s
- type: benefit_highlight
- blueprint: grid-card-assemble (Adapt)
- focal: assets/start.mp4
- roles: start.mp4 = background (full-bleed)
- asset_candidates: assets/start.mp4 — 呉駅前のスタートグリッドから 8 台が発進し、団子のまま最初のコーナーへ (4.0s)
- onscreen: 8 色のドライバーチップが左から順に並ぶ → 「最大8人」→「オンライン対戦」

必ず伝える 3 点のうちの 1 つ。**数を見せる** — 8 台が画に入っている映像の上に、
ゲーム内の 8 人の色そのままのチップを左から順に置いていく。8 つ揃った瞬間に言葉が来るので、
言葉より先に数が伝わる。

Adapt: N 個が**段差をつけて自己組み立てする** signature は残す。組み上がるのがカードのグリッドではなく
実写映像の上の 8 個のチップ列で、末尾の zoom-out は使わない（映像が動いているので不要）。

Scene 1 (0.0–0.8s): `start.mp4` のみ全面。8 台が一斉に発進する。文字ゼロ。
Scene 2 (0.8–2.1s): 下段に濃紺 75% の帯がワイプイン。その上に 8 個の丸いドライバーチップが**左から 1 つずつ**着地（per-item stagger、各チップは spring-pop entrance の smooth settle）。色はゲーム内の 8 台と同じ。full-width strip、帯の高さ ~14%。
Scene 3 (2.1–3.5s): 8 個目が着地した拍で、チップ列の右に h2 で「最大8人」が spring-pop、半拍遅れて label で「オンライン対戦」が fade。以後 held。

## Frame 3 — 大和ミュージアム

- scene: 大和ミュージアムの前を、2〜3 台が横に並んで抜けていく。PLATEAU の出典を控えめに置く
- duration: 3.5s（撮影は 4.5s、data-media-start で区間を選ぶ）
- transition_in: cut
- status: animated
- src: compositions/frames/03-museum.html
- poster: 4s
- type: feature_showcase
- blueprint: titlecard-reveal (Adapt)
- focal: assets/museum.mp4
- roles: museum.mp4 = background (full-bleed)
- asset_candidates: assets/museum.mp4 — 大和ミュージアムの前の通りを団子で並走する (4.5s)
- onscreen: 「大和ミュージアム」/ 小さく「Yamato Museum」/ 左上に小さく「国土交通省 PLATEAU 3D都市モデル / 呉市 2020年度」

最初のカーチェイス。ミュージアムの建物を画に入れたまま、並走しているカートを追う。
出典は表示義務でもあるので、読める大きさで、しかし映像を邪魔しない位置（左上）に置く。

Adapt: **動きはただ 1 つ、あとは静止**という signature を残す。中央のタイトルカードではなく、
実写の上の左下ネームプレート（Video direction の共通の型）として出す。

Scene 1 (0.0–1.2s): `museum.mp4` のみ全面。ミュージアムの前へ団子で飛び込む。文字ゼロ。
Scene 2 (1.2–2.0s): 左下に黄の rule と h2「大和ミュージアム」が **slide-up crossfade** で一度だけ入る。rule-of-thirds 左下、下敷きは濃紺 75% の小さな帯。
Scene 3 (2.0–3.5s): そのすぐ下に label で「Yamato Museum」が fade、同時に左上に label で出典が fade-in。以後 held — 文字は一切動かさない。

## Frame 3b — 宮原の造船所

- scene: 宮原の造船所。赤白のジブクレーンとドックを右前に見ながら団子で走る（ユーザー指定で追加）
- duration: 3.5s
- transition_in: cut
- status: animated
- src: compositions/frames/03b-shipyard.html
- poster: 3s
- type: feature_showcase
- blueprint: titlecard-reveal (Adapt)
- focal: assets/shipyard.mp4 (data-media-start 0)
- roles: shipyard.mp4 = background (full-bleed)
- onscreen: なし（ユーザー指定でテロップ削除）

映像のみ。クレーンが右前に迫る 3.5s をそのまま見せる。

## Frame 4 — アレイからすこじま

- scene: 護衛艦と潜水艦が並ぶ岸壁の横を、競り合いながら走り抜ける
- duration: 3.5s（撮影は 4.5s、data-media-start で区間を選ぶ）
- transition_in: cut
- status: animated
- src: compositions/frames/04-alley.html
- poster: 4s
- type: feature_showcase
- blueprint: titlecard-reveal (Adapt)
- focal: assets/alley.mp4
- roles: alley.mp4 = background (full-bleed)
- asset_candidates: assets/alley.mp4 — アレイからすこじまの海沿い。右手の海に護衛艦と潜水艦が並び、その手前を抜きつ抜かれつ (4.5s)
- onscreen: 「アレイからすこじま」/ 小さく「護衛艦と潜水艦が並ぶ岸壁」

2 つ目のカーチェイス。**艦が見えることが見せ場**なので、文字はネームプレートだけ。

Adapt: Frame 3 と同じ左下ネームプレートの型（位置・動きとも同じ）。

Scene 1 (0.0–1.2s): `alley.mp4` のみ全面。岸壁に沿って艦が迫ってくる。文字ゼロ。
Scene 2 (1.2–2.0s): 左下に黄の rule と h2「アレイからすこじま」が slide-up crossfade で一度だけ入る。
Scene 3 (2.0–3.5s): そのすぐ下に label で「護衛艦と潜水艦が並ぶ岸壁」が fade。以後 held。

## Frame 5 — 音戸大橋

- scene: 音戸大橋を渡った倉橋島側の螺旋（ぐるぐる回って下る所）で、ぶつかり合いながら団子で競り合う。回るたびに第二音戸大橋がチラッと見える（ユーザー指定で本州側の上りから変更）
- duration: 3.5s（撮影は 4.5s、data-media-start で区間を選ぶ）
- transition_in: cut
- status: animated
- src: compositions/frames/05-ondo.html
- poster: 4s
- type: feature_showcase
- blueprint: titlecard-reveal (Adapt)
- focal: assets/spiral.mp4
- roles: spiral.mp4 = background (full-bleed)
- asset_candidates: assets/spiral.mp4 — 倉橋島側の螺旋を団子で下る。カートがぶつかり合い、回るたびに第二音戸大橋が前を横切る (4.5s)
- onscreen: 「音戸大橋」/ 小さく「Ondo Bridge ・ 音戸の瀬戸」

最後のカーチェイス。**螺旋のカーブで競り合う**のが見せ場（ユーザー指定）。橋はゴールではない（ゴールは渡り切った先の音戸）。
Frame 3・4 と同じ左下ネームプレートの型で出す。

Scene 1 (0.0–1.2s): `spiral.mp4` のみ全面。螺旋のカーブを団子で下る。文字ゼロ。
Scene 2 (1.2–2.0s): 左下に黄の rule と h2「音戸大橋」が slide-up crossfade で一度だけ入る。
Scene 3 (2.0–3.5s): そのすぐ下に label で「Ondo Bridge ・ 音戸の瀬戸」が fade。以後 held。

## Frame 6 — 音戸にゴール

- scene: 音戸大橋を渡り切り、倉橋島側の螺旋を下りきった音戸でゴール。GOAL が地名に入れ替わる
- duration: 5s
- transition_in: cut
- status: animated
- src: compositions/frames/06-goal.html
- poster: 4.5s
- type: feature_showcase
- blueprint: titlecard-reveal (Adapt)
- focal: assets/goal.mp4
- roles: goal.mp4 = background (full-bleed)
- asset_candidates: assets/goal.mp4 — 倉橋島側の螺旋を下り、音戸のゴールゲートを抜ける (5.0s)
- onscreen: 「GOAL」→（入れ替え）「音戸」/ 小さく「Ondo ・ 倉橋島」

ゴールの瞬間に GOAL を出し、収まってから地名に**入れ替える**。

Adapt: 「ひとつの抑制された動きで出して静止させる」signature を残しつつ、カードを 1 枚ではなく
**2 枚の入れ替え**にする（GOAL → 地名）。入れ替えは scale-swap で、同じ画面中心を受け渡す。

Scene 1 (0.0–2.0s): `goal.mp4` のみ全面。螺旋を下りきってゴールゲートが迫る。文字ゼロ。
Scene 2 (2.0–2.8s): ゲートをくぐる拍で、画面中央に display の「GOAL」が黄で spring-pop entrance（大きく、~55% 幅）。centered。
Scene 3 (2.8–3.8s): 「GOAL」が **scale-swap** で縮みながら上へ退き、入れ替わりに h1「音戸」が同じ中心に着地。下敷きは濃紺 75% の帯。
Scene 4 (3.8–5.0s): その下に label で「Ondo ・ 倉橋島」が fade。以後 held。

## Frame 7 — エンドカード

- scene: 濃紺の地にロゴと URL。ブラウザで今すぐ遊べることを言い切る
- duration: 3.5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/07-endcard.html
- poster: 3s
- type: cta
- blueprint: logo-assemble-lockup (Adapt)
- focal: (映像なし・タイポグラフィのみ)
- roles: —
- asset_candidates: none — 映像は使わない。地は frame.md の ink-black、タイポグラフィのみ
- onscreen: 「KURE KART / 呉グランプリ」+「kure.citykart.jp」+「ブラウザで、いますぐ ・ インストール不要 ・ 最大8人」

唯一の静止フレームで、唯一のベタ地フレーム。ここまで動きっぱなしなので、止まることが効く。
URL は最後の 1.5 秒はフルに読める状態で完全静止させる（**意図的に止めるフレーム**）。

Adapt: **マークが画面上に「出来上がる」** signature を残す（文字がカスケードして組み上がる）。
衛星やオービットは使わず、組み上がったロックアップをそのまま URL へ延長する。

Scene 1 (0.0–1.1s): 濃紺全面。中央に display で「KURE KART」が per-word（チャンク）カスケードで組み上がる。centered、幅 ~60%、chrome は出さない（declarative フレーム）。
Scene 2 (1.1–1.8s): 直下に黄の rule が左から引かれ、h3 で「呉グランプリ」が fade-in。
Scene 3 (1.8–2.5s): その下に URL「kure.citykart.jp」が**黄地・濃紺文字のピル**として spring-pop。ピルは角 0（broadside は平面）。
Scene 4 (2.5–3.5s): 最下段に label で「ブラウザで、いますぐ ・ インストール不要 ・ 最大8人」が fade。以後**完全静止** — jitter も入れない。
