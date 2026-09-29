# Kure Kart — 呉グランプリ

国土交通省 **PLATEAU** の 3D 都市モデル（呉市 2020 年度, CityGML）を使った、実在の呉の街を走るカートレースゲームです。ブラウザ (three.js) で動作します。[Fukuyama Kart](https://github.com/tatsuya1970/fukuyama-kart)（福山グランプリ）の呉市版です。

## コース

**呉駅前のバスターミナル（スタート）→ 今西通りを北東へ → 三津田橋で二河川を渡る → 三条から国道31号を南西へ（JR呉線を跨線橋で越える）→ 南下して てつのくじら館 → 大和ミュージアム → 堺川沿いの蔵本通りを北東へ → 呉市役所 → 呉本通りを南西へ → めがね橋 → 国道487号で入船山記念館の脇を南へ → 宮原 → 造船所沿いの道を南西へ → アレイからすこじま → 湾沿いを南へ → 警固屋 → 音戸大橋（螺旋を上って渡る）→ 音戸（ゴール、倉橋島側）**

**12.8 km のワンウェイ。周回しません。** スタートとゴールが別の場所にあるので、`Track` は閉ループではなく開いた経路として扱います（福山版と同じ。後述）。

| 必ず通る地点 | どう通るか |
| --- | --- |
| 呉駅 | 駅前のバスターミナルがスタート（ここから今西通りの入口までは OSM に道が無いので `route_vias.json` の `links` でつなぐ）。今西通りを北東へ、三津田橋で二河川を渡り、三条で国道31号に入って南西へ。三条通りの跨線橋で JR 呉線を越える。発走前は呉駅を映してから、呉駅を背にしたカートのまわりをカメラが 180 度回る演出（`introCamera`、`?nointro=1` で省略） |
| てつのくじら館 | 国道31号から南へ下り、宝町の海沿いを東へ。陸に横たわる潜水艦「あきしお」（全長 76m）の脇を抜ける |
| 大和ミュージアム | あきしおの向かい。呉港線で北へ上がる |
| 蔵本通り・呉市役所 | 堺川沿いの蔵本通りを南西の端から北東へ 1.1km。呉市役所は蔵本通りの北東の端に建つ |
| 呉本通り | 国道185号を南西へ 0.9km 下る |
| めがね橋 | 本通りの南西の端の交差点。国道487号に入ってすぐ |
| 入船山記念館 | めがね橋から国道487号で入船山公園の西側を南へ、宮原まで下る |
| アレイからすこじま | 宮原で国道487号を離れ、IHI の造船所沿いの道（昭和町）を南西へ。目の前の岸壁に**海上自衛隊の護衛艦と潜水艦**が並ぶ |
| 音戸大橋 | 国道487号を警固屋まで南下し、**二重の螺旋を上って**朱色のアーチ橋で音戸の瀬戸を渡る。倉橋島側の螺旋を下りきった所がゴール |

走っている道は 0〜1.2km が国道31号（三条通り）、1.2〜2.4km が宝町の市道と呉港線、2.4〜3.5km が蔵本通り、3.5〜4.4km が呉本通り、4.4〜5.8km がめがね橋から宮原までの国道487号、5.8〜9.0km が造船所沿いからアレイを通って警固屋への湾沿いの道、9.0〜10.7km が国道487号、10.7〜12.2km が音戸大橋と両岸の螺旋です。

全 AI で走らせると **約 3 分半**（`node tools/airace.mjs`。8 台すべてがスピンも詰まりもなくゴールし、ゴール後は止まる）。

### 路面の幅は区間ごとに変わります

福山版と同じく、**PLATEAU の道路面の縁までの距離をそのまま路面の半幅として使い**、区間ごとに変えています（`tools/build_course.mjs` が `course_path.json` の `halfWidth` に書き出し、`Track.hw` が読む）。国道31号・185号・487号では 18〜20m、蔵本通りや宮原の市道では 9〜12m です。

`data/course.json` の `roadWidth` が上限（20m）、`minHalfWidth` が下限の半幅（4.5m = 幅 9m）です。

**走行線は PLATEAU の道路データ (tran) の上を通ります**（道路上 100%）。作り方は福山版と同じ 2 段です。

1. **経由地を OSM の道路網でつなぐ**（`tools/plan_route_osm.mjs`）。`tools/route_vias.json` の経由地どうしを OpenStreetMap の道路網の最短路でつなぎ、案内線 `data/drawn_route.json` を作ります。経由地には道路の絞り込み（`"蔵本"` なら蔵本通り）を付けられます。
2. **PLATEAU の道路面の上で A* 探索**（`tools/build_course.mjs`）。道路面を 2m グリッドにラスタライズし、道路の中央寄り・案内線寄りを通るように重みを付けて探索します。結果は `data/course_path.json`（2m 間隔の点列）です。

経由地を置くときに気を付けたこと:

- **大和ミュージアムから呉市役所へは蔵本通りで行く。** 呉市役所は蔵本通りの北東の端にあります。市役所へ先に向かう経由地にすると、最短路は国道31号を呉駅の前まで戻ってスタート地点で右に折れ、蔵本通りより 1 本北の通りを抜けてしまいました。呉港線から蔵本通りの南西の端に入り、堺川沿いに市役所の前まで走らせています。
- **めがね橋から先は国道487号。** 入船山公園の東側の市道に入らないよう、国道487号の上に経由地を並べています。宮原からは国道487号を離れ、造船所沿いの道に経由地を置いてアレイからすこじまへ出しています（宮原の南の内陸の市道や串山公園の脇を回らないように）。
- **てつのくじら館の前は、あきしおと大和ミュージアムのあいだの道。** 潜水艦の艦尾に経由地を置くと、史料館の裏の広場を抜ける経路になりました。

### トンネル（今のコースでは使っていない）

最初の版のコースは休山トンネル（1.7km）を通っていたので、エンジンをトンネルに対応させてあります。`data/course.json` に `tunnels`（坑道の線形と半幅）を書くと使われます。

| 箇所 | 中身 |
| --- | --- |
| `tools/build_course.mjs` | PLATEAU の `tran` にも地形にも坑道は無いので、線形を帯として道路のラスタに描き足す（足さないと A* が山越えの道へ回り込む）。経路が一方の坑口に着いてからもう一方に着くまでを `course_path.json` の `tunnel` に書く |
| `Track`（`src/track.ts`） | トンネルの中の路面の高さは山の標高ではなく、両側の坑口の高さを直線でつなぐ。坑道の筒（壁と天井）・照明・坑口の額縁を描く。トンネルの上の建物は消さない |
| `Terrain.flattenAlong` | トンネルの点が最寄りのセルは削らない（山を残す）。坑口から 30m 以内と、天井より地形が低い所は地形に穴を開ける（`Terrain.hole`）。穴を開けないと坑口が山肌の三角形でふさがる |

休山トンネルの定義は次のとおりでした（戻すときの参考）。

```json
"tunnels": [{ "name": "休山トンネル", "en": "Yasumiyama Tunnel", "halfWidth": 5,
  "points": [[34.248942,132.577203],[34.247658,132.579473],[34.246811,132.581167],[34.246103,132.582713],[34.243471,132.588796],[34.242429,132.591122],[34.242087,132.591958],[34.241495,132.593369]] }]
```

### 音戸大橋の螺旋

音戸大橋は船を通すため桁が高く、**両岸とも螺旋（ループ）で上り下りします**。平面の A* では同じ場所を高さを変えて 2 周できないので、広島版の「駅の 2 階を貫く区間」（`stationPass`）の仕組みを使い、OSM の国道487号の線形（way 1034058372 → 155398938 → 155398941 → 133334031 → 133333989 → 155398944 → 391653160）に高さ `h` を付けてそのまま差し込んでいます（`data/course.json` の `stationPass`）。

| 区間 | 高さ（地面からのかさ上げ） |
| --- | --- |
| 本州側の 1 周目 | 1m → 8.5m（1 周して自分の上を越える） |
| 本州側の 2 周目 | 8.5m → 18m |
| 主桁（音戸の瀬戸） | 18m |
| 倉橋島側の 1 周目 | 18m → 11m |
| 倉橋島側の 2 周目 | 11m → 4m → ゴール |

これに合わせて次も直しています。

- **往復の除去に高さを入れた。** `build_course.mjs` は同じ 6m 格子に戻ってきた所を往復として切り落とします。螺旋は真上を通るので丸ごと消えていました。格子のキーに高さ（4m 刻み）を足しています。
- **差し込み区間がゴールで終わる場合。** 一本道の最後の点を足すのは A* の区間だけだったので、差し込み区間の最後の点もゴールとして足すようにしています。
- **橋脚が下の道に立たない。** 高架の橋脚は 30m おきに地面から立てますが、螺旋の上の段の橋脚が下の段の路面を突き抜けていました。真下を自分のコースが低い所で通っていれば橋脚を立てません（`Track.overCourse`）。

カートの高さは `Track.nearest()` の局所探索（前後 80m）で拾った点の高さなので、真上と真下で 1 周（150m 以上）離れている螺旋でも取り違えません。

アーチ・吊材・朱色の桁は `src/landmarks.ts` の `buildOndoBridge` が、主桁の両端（`data/landmarks.json` の `from` / `to`）に最も近い高架の点を拾って足しています。

### 三条通りの跨線橋

国道31号（三条通り）は JR 呉線を跨線橋で越えます。DEM には橋の桁が入っていないので、`data/course.json` の `lifts` で中心から前後 150m の路面を最高 7m 持ち上げています（`build_course.mjs` が `elevated` に書く）。呉線は地上のままその下を通ります。

### 周回しないコース（一本道）

福山版と同じです。`tools/route_vias.json` に `"open": true` を書くと、`plan_route_osm.mjs` と `build_course.mjs` は開いた経路として扱い、ゲーム側は `Track.open` を見て周回数・HUD・看板・AI の停止などを切り替えます。

コースを変えるときは `tools/route_vias.json` を直して次を順に実行します。

```bash
node tools/plan_route_osm.mjs      # data/drawn_route.json
node tools/convert_citygml.mjs     # 案内線から 400m の道路面・700m の建物を選び直す (DEM はキャッシュ)
node tools/build_course.mjs        # data/course_path.json と data/course_map.png
node tools/build_parks.mjs         # コース沿いの公園を選び直す
node tools/export_course_geo.mjs   # 地図用の書き出し
```

地名の看板は `data/course.json` の `waypoints`（`label: true` のもの）から作ります。英語名は `en`、地図用の短い名前は `short` です。

## コースを地図で見る

`tools/export_course_geo.mjs` が完成したコースを地図用に書き出します。

| ファイル | 用途 |
| --- | --- |
| `public/course-map.html` | OpenStreetMap / 地理院地図 / 空中写真に重ねて表示する単体ページ |
| `public/course.geojson` | geojson.io、QGIS など |
| `public/course.kml` | Google マイマップ、Google Earth |
| `public/course.gpx` | GPX トラック |

開発サーバー起動中なら http://localhost:5184/course-map.html で見られます。

## 使用している PLATEAU データ

| 地物 | 用途 |
| --- | --- |
| 建築物モデル `bldg` (LOD1 Solid) | 案内線から 700m の建物。高さ・用途からプロシージャル生成した壁面テクスチャを貼付 |
| 交通（道路）モデル `tran` (LOD1) | 走行線の探索と地面テクスチャの道路面 |
| 地形モデル `dem` (LOD1 TIN) | 5m グリッドの標高マップ（1455×1666）。水面は OSM の海岸線と合わせて判定し、橋を自動生成 |

出典: 国土交通省 PLATEAU「3D都市モデル（Project PLATEAU）呉市（2020年度）」(CC BY 4.0)

ダウンロード元は `tools/download_plateau.mjs` の `BASE`（`34202_kure-shi_city_2020_citygml_7_op`）です。

### LOD2 について

呉市 2020 年度のデータにも LOD2 の建物（呉駅・本通・宝町の周りの 5 メッシュ、約 2,300 棟）はありますが、**実写テクスチャ（`app:ParameterizedTexture`）も色（`X3DMaterial`）も入っていません**。福山版の LOD2 の処理（`tools/convert_lod2.mjs` → テクスチャのダウンロード → アトラス）は実写テクスチャが前提なので、呉版では 0 棟になり、建物はすべて LOD1 で描いています（`public/data/lod2.bin` は空、`src/lod2.ts` は頂点 0 なら何も描かない）。LOD2 の形だけを単色やプロシージャルの壁で描くのは今後の課題です。

### 地形と水面

DEM は 2 次メッシュ 513224 / 513234（それぞれ 4 分割、計 3.3GB）です。格子に落とした結果を `data/dem_grid.bin` にキャッシュし、`ONLY_TERRAIN=1 node tools/convert_citygml.mjs` で水面判定だけやり直せます。

**呉の DEM は海の上にも三角形が張られています。** 対岸の護岸どうしをつないだ 3m 前後の面が呉湾や音戸の瀬戸の上に入っていて、松江・福山の「標高 0.3m 未満は水面」では海がまるごと陸になりました（アレイからすこじまの前の潜水艦が置けなかったことで気づきました）。そこで OpenStreetMap の海岸線（`natural=coastline`）を使っています。

1. 海岸線を 5m 格子に 8 近傍でつながる線として描き、4 近傍でつないだ領域に分ける（海岸線で区切られた領域が 56 個できる）
2. OSM の約束（線の進む向きの右が海）で、海岸線の右と左に落ちた標本を領域ごとに数え、右が多い領域を海にする

最初は「DEM が欠測しているセルから塗りつぶす」方式にしましたが、BBOX の縁で閉じた倉橋島の中に欠測が 1 セルあるだけで島ごと沈み、次に「海岸線のすぐ右を種にして塗る」方式にしたら、狭い入り江で対岸に落ちた種 1 つで陸ごと沈みました。領域ごとの多数決はどちらにも強いです。

二河川・堺川は護岸に囲まれた水路なので、OSM の水面の輪郭（`data/water.json`）を重ねて水にしています（福山版の芦田川と同じ）。

コースが丘を切り通す所（宮原の坂、音戸大橋の螺旋の取り付けなど）は `Terrain.flattenAlong` が走行線沿いの地形を路面の下まで削ります。トンネルの所は削りません（上記）。

## 日本語 / 英語

**言語ごとに URL が分かれています。** 日本語は `/`、英語は `/en/` です。英語に実体のある URL を与えているのは検索と SNS のためで、理由は後述の「SEO」に書いてあります。判定は `/en/` → `?lang=ja|en` → `localStorage` → `navigator.language` の順です（`src/i18n.ts`）。IP から国を見るにはサーバーが要るので、GitHub Pages の静的配信では使えません。日本語環境から英語で見たい人（その逆も）がいるので、画質ボタンの隣に手動の切り替えを必ず出しています。切り替えは看板やラベルを作り直す必要があるため、その言語の URL へ移動して読み込み直します。開発サーバーには `/en/` が無いので、そこでは `?lang=en` を使います。

差し替えの場所は 2 つに分けています。

| 対象 | 持たせ方 |
| --- | --- |
| `index.html` の固定文言 | 日本語をそのまま置き、英語を `data-en` / `data-en-html` / `data-en-placeholder` 属性に持たせる。`applyDomLang()` がまとめて差し替える |
| TypeScript 側の文言 | `src/i18n.ts` の辞書を `t('key', ...)` で引く |

日本語をソースに残す形にしたのは、読んで意味が分かるほうが直しやすいためです。

**コースの看板は常に二か国語です。** 選んだ言語を大きく、もう一方を副題に出します（看板の副題行はもともと空いていたので、切り替えずに両方出せます）。地名の英語は `data/course.json` の `en` に持たせ、`tools/build_course.mjs` が `course_path.json` へ書き出します。

```
呉駅 → Kure Sta. / 蔵本通り → Kuramoto-dori / 音戸大橋 → Ondo Bridge
```

`?lang=en` を付ければ日本語環境でも英語で確認できます。

## SEO

検索と SNS のカードのために、次を入れてあります。**日本語と英語で別々の URL** を持たせているのが要です。

| URL | 言語 | 中身 |
| --- | --- | --- |
| `https://kure.citykart.jp/` | 日本語 | `dist/index.html` |
| `https://kure.citykart.jp/en/` | 英語 | `dist/en/index.html`（中身は同じで head だけ英語） |

**なぜ URL を分けるのか。** X や Facebook のカードを作るクローラは JavaScript を実行しません。1 つの URL で実行時に英語へ差し替えても、共有カードは日本語のままになります。検索も、1 つの URL に 2 言語が同居していると、どちらの言語のページとして出すか決めきれません。

**英語ページの作り方。** ページを二重管理しないよう、`index.html` は 1 つだけです。head の言語依存部分を `<!-- ==== SEO:ja ==== -->` と `<!-- ==== /SEO:ja ==== -->` で囲んであり、ビルド後に `tools/build_en_page.mjs` がそこを `tools/seo-en.html` の中身へ差し替え、`<html lang>` を `en` にして `dist/en/index.html` として書き出します（`npm run build` に組み込み済み）。**目印のコメントを消さないでください。** 画面の文言は `applyDomLang()` が `/en/` を見て英語にします。

**紹介文（本文）。** 検索の順位に効くのは meta description ではなく本文です。タイトル画面の下に、ゲームの説明・コースの通過地点・遊び方を日本語と英語で置いてあります（`#about`）。クローラは JavaScript を実行しないので、`tools/build_en_page.mjs` が`/en/` 側では日本語を取り除き、`data-en` を持つ要素の文言も静的に英語へ置き換えます。AI の検索に引用されやすいよう、距離・地名・人数などの事実をそのまま書いています。

入れてあるもの。

| 項目 | 場所 |
| --- | --- |
| 見出しと説明（言語別） | `index.html` の SEO ブロック / `tools/seo-en.html` |
| canonical と hreflang（ja / en / x-default） | 同上。各ページが自分を canonical に指す |
| OGP と Twitter カード（`summary_large_image`） | 同上 |
| 構造化データ（schema.org の `VideoGame`） | 同上。JSON-LD |
| カード画像 1200x630 | `public/ogp.png`（日本語）/ `public/ogp-en.png`（英語） |
| サイトマップ | `public/sitemap.xml`。2 言語を hreflang で結んである |
| 紹介文（本文、言語別） | `index.html` の `#about`（ABOUT ブロック） |
| 構造化データ（`BreadcrumbList`、`isPartOf`） | 入口サイト citykart.jp の一部であることを示す |
| 相互リンク | `index.html` の `.sites`。ほかの 2 作と citykart.jp へ |

カード画像は `PORT=5184 node tools/make_ogp.mjs` で作り直せます。音戸大橋と両岸の螺旋を南東の海の上から撮り、HUD を消してタイトル帯を重ねたものです。文字はブラウザに描かせているので日本語のフォントも崩れません。背景を変えたいときは `QUERY` の `photo=緯度,経度,注視高さ,距離,方位角` を差し替えてください。

**robots.txt と AI のクローラー。** 独自ドメインに移したので `/robots.txt` は読まれます。検索エンジンに加えて、生成AI・AI検索のクローラー (GPTBot、OAI-SearchBot、ClaudeBot、PerplexityBot、Google-Extended、Applebot-Extended、CCBot ほか) も明示的に許可しています。拒否したくなったら `public/robots.txt` のその行を `Disallow: /` に変えてください。サイトマップは Search Console にも登録します (このドメインでの所有権確認が要ります)。

**ドメインを変えるとき。** URL は `index.html` の SEO ブロック、`tools/seo-en.html`、`public/sitemap.xml`、`public/robots.txt` の 4 か所に書いてあります。GitHub Pages で独自ドメインを設定すると `github.io` 側は 301 で転送されるので、リンクの評価は引き継がれます。

## オンライン対戦

タイトル画面で「対戦PLAY」を押すと公開ロビーに入り、**2 人そろった時点で 30 秒のカウントダウン**が始まって自動的に発走します。集まった人どうしで最大 8 人、空いた枠は AI が走ります。1 人のあいだは相手が来るまで待ち、待たずに走りたければ「すぐ始める」で AI と走れます。相手が入ると短いジングルが鳴り、別のタブを見ていればタブの見出しが点滅します（トップ画面にいるときに待ち人が現れた場合も同じ）。

部屋は押した人が作ります（`OPEN` + 5 文字）。同じ部屋に集まる手段は後述の presence で、待っている人の部屋が見えていればそこへ入り、見えていなければ新しい部屋を作ります。お互いに見えないまま部屋が 2 つできたときは、1 人で待っている側が部屋名の小さいほうへ移って合流します（`src/main.ts` の `maybeMergeLobby`）。以前は壁時計を 30 秒で区切った部屋名にしていましたが、「2 人そろってから」にするには締切を人数で決める必要があり、時刻から決まる部屋名とは相容れないので変えました。

締切はホストが 2 人目の席を配るときに決めて座席表に載せます（`LobbyInfo.deadline`）。1 人に戻ったら締切を消し、相手が抜けたのに 1 人で発走することはありません。発走の合図はホストが出して足並みを揃え、締切を 2 秒過ぎても合図が来なければ（ホストが落ちた等）各自で始めます。席が無いまま発走したら 1 人で走ります（席が無いのに 0 番を名乗ると、ホストとカートを奪い合うため）。レース中の部屋に入ってしまった人には `busy` を返し、新しい部屋で待ち直してもらいます。

**トップ画面に「対戦待ち」の状況を出します。** 対戦PLAY を押す前から、レースの部屋とは別の常設の部屋（`mk-presence`）に全員が入り、「トップ画面にいる / 対戦待ち / レース中」を伝え合います（`src/net.ts` の `Presence`）。誰かが待っていれば「いま 1 人が対戦待ち（たろう）対戦相手を待っています」、カウントダウン中なら「発走まで 18 秒」と緑で光り、ロビーで待っている側にも「トップ画面に 1 人います」と出ます。

**presence は人が増えたら分室に分かれます。** WebRTC は全員どうしで張るので、1 つの部屋に N 人いると 1 台あたり N-1 本の接続になり、人が集まった瞬間にスマホの CPU と回線が先に尽きます。最初の部屋（`mk-presence`）が 12 人（`PRESENCE_SPLIT_AT`）を超えたら、トップ画面の人は ID で決まる 4 つの分室（`mk-presence-0`〜`3`）のどれかへ移ります。対戦待ちの人は最初の部屋と全分室に入るので、どこにいる人からも見え、待っている人どうしも互いに見えます。代わりに、分かれた後のトップ画面の人数は自分の部屋の分だけです。分室を増やすと、対戦待ちの人が入る部屋ごとにリレーへの告知が増えるので、流量制限に掛からないよう 4 にしてあります。

**座席表と発走の合図は、自分から見たホストからだけ受け取ります**（`src/net.ts` の `acceptLobby`）。直結できない組（対称型 NAT どうしで TURN が無い等）がいると、ホストの見え方が人によって食い違います。誰からでも受け取ると、自分がホストだと思い込んだ 2 人の座席表が交互に届いて席が揺れるので、食い違った相手の座席表は捨てます。ホストとつながっていない人は席をもらえないまま発走し、1 人で走ります。

trystero 0.25 は同じ appId なら部屋をまたいで WebRTC 接続を共有します（`@trystero-p2p/core` の SharedPeerManager）。そのため、トップ画面でつながった相手とは、対戦PLAY を押した瞬間にリレーの往復なしで同じ部屋に入れます。相手とつながるまでの 8〜19 秒はページの読み込み中に済み、カウントダウン中の部屋にも締切の 3 秒前（`JOIN_MIN_WAIT`）まで入れます。

合言葉で部屋を作る方式はコメントアウトしてあります（同時に遊ぶ人が少ないうちは、待ち時間が読めるほうが遊びやすいため）。`index.html` と `src/main.ts` の「合言葉」の箇所を戻せば復活します。URL に `?room=XXXXX` を付けると、今でも合言葉の部屋へ直接入れます。

**サーバーはありません。** GitHub Pages で配信しているので常駐サーバーを置けず、[trystero](https://github.com/dmotz/trystero) で WebRTC のブラウザ直結にしています。公開リレーを通るのは「どの部屋に誰がいるか」のシグナリングだけで、レース中の通信はブラウザ同士を直接流れます（`src/net.ts`）。

同期の考え方は次のとおりです。

| 対象 | 誰が決めるか |
| --- | --- |
| 自分のカート | 自分だけが物理計算する。他の人のカートは受信位置へ寄せるだけで、物理は回さない |
| 空き枠の AI | ホストだけが計算して位置を配る |
| アイテムボックスの取得・被弾 | そのカートを持っている側だけが判定し、結果をイベントで配る |
| アイテムの発射 | 使った人が位置とともに配り、各自の画面で同じものを出す |
| ホスト | 合言葉の部屋では作った人。公開ロビーには作成者がいないので ID が最小の人。抜けたら次の人へ移る |

位置は 15Hz で送り、受信側は速度で前へ進めながら（デッドレコニング）表示位置を寄せます。取得と被弾を持ち主の側に寄せていないと、各自の画面で別々に当たったことになります。

送信間隔は `dt` ではなく実時間で測ります。`dt` は 0.05 秒で頭打ちにしてあるので、fps が落ちた端末では送信間隔まで一緒に間延びし、相手の画面で 100m 以上ずれます（検証環境で実測）。

**待っている人がいるのに「見当たりません」と出るとき。** 次の順に疑ってください。

1. **どちらかが古いページのまま。** 配信後もブラウザのキャッシュに前の版が残ることがあり、古い版は新しい版の「対戦待ち」を読めません（「1 人がレース中」と出ます）。タイトル画面の一番下に `build <コミット> (<時刻>)` を出しているので、両方の端末で同じか見てください。違えば再読み込み（スマホは一度タブを閉じて開き直す）です。
2. **見つかるまで 1 分近くかかる。** trystero の nostr 戦略は「自分の告知を受け取った相手が接続してくる」仕組みで、相手の再告知は 60 秒おきです。リレーは購読した時刻より新しい出来事しか流さないため、端末の時計が数秒ずれていると相手からの応答が捨てられ、相手の次の再告知まで待ちます。そのためトップ画面の「確認しています...」は 70 秒続けます。相手が現れれば音で知らせるので、待っていて構いません。
3. **リレーにつながっていない。** 誰も見えないあいだは「リレー 4/8 に接続中」のように接続数を添えています。0 なら回線か、社内ネットワーク等で WebSocket が塞がれています。trystero が既定で選ぶリレーのうち 1 つは落ちていたので（`nostr.data.haus`、実測）、使うリレーを 5 から 8 に増やしてあります（`src/net.ts` の `RELAY_CONFIG`。全員が同じ組になるよう appId から順が決まります）。
4. **開発サーバーと本番は別の世界。** `vite` の開発サーバーでは appId を `kure-kart-dev` にして本番の利用者と切り離しています（テスト用のブラウザが本番の画面に映っていたため）。PC の開発サーバーとスマホの本番ページでは互いに見えません。開発サーバーから本番の相手と試すときは `?net=prod` を付けてください。
5. **待っている側の画面が消えている。** スマホで画面を消したりタブを裏にしたりすると、ブラウザが接続を止めるので相手から見えなくなります。画面に戻れば数秒で復帰します。
6. **携帯回線 (5G / 4G) と家庭の回線の組み合わせ。** リレーにつながっていて告知も届いているのに相手が見えないときは、ここがいちばん怪しいです。WebRTC の直結は STUN で自分の外側の住所を相手に伝える方式で、携帯回線の CGNAT（対称型 NAT）と家庭のルータ（ポート制限コーン）の組み合わせでは直結できません。これを中継するのが TURN で、サーバーが要ります。トップ画面では STUN サーバー 2 つに聞いて NAT の種類を推定し、対称型なら「相手と直結しにくい種類の NAT です」と出します（`src/net.ts` の `natProbe`）。対処は下の「TURN の設定」です。
7. **アプリ内ブラウザ (Facebook / Instagram / LINE / X)。** WebView は WebRTC が制限されていたり、裏に回ると接続が切れたりします。検出したら「Safari / Chrome で開いてください」と出します（`inAppBrowser`）。

**TURN の設定。** 誰でも使える無料の公開 TURN（Open Relay）は候補が取れなくなっていた（2026-09 実測）ので、サイトの持ち主が用意します。`public/turn.json` を置くと、ページ読み込み時に読んで trystero の `turnConfig` に渡します。無ければ STUN だけで動きます（直結できる相手とだけつながる）。

本番デプロイでは TURN を必須にしています。GitHub Actions の repository variable `TURN_CONFIG_URL` に、短期の資格情報を返す HTTPS API を設定してください。**`turn.json` は配信されて誰でも読めるので、固定の資格情報（`username` / `credential`）も、`?apiKey=...` のように鍵を付けた URL も入れられません。** `npm run turn:prepare` と配信物の点検（`tools/check_site.mjs`）は、資格情報を直接書いた設定や鍵付きの URL を見つけるとデプロイを止めます。以前の secret `TURN_CONFIG_JSON` は同じ理由で廃止しました（残っているとデプロイが止まるので削除してください）。`npm run turn:prepare` は設定 API を呼び、応答に `turn:` または `turns:` が無ければデプロイを停止します。ローカルで本番相当のビルドを確認するときも、先に同じコマンドを実行してください。

中継は [metered.ca](https://www.metered.ca/stun-turn) の無料プラン（月 500 MB、上りと下りの合計）を使います。カード登録が無いので枠を超えても請求は発生せず、費用の上限がはっきりします（枠を超えたときに中継が止まるかどうかは公式には明記されていません）。代わりに、枠が尽きた月は直結できない組（携帯回線どうしなど）が翌月まで対戦できないと考えてください。中継 1 組の 5 分レースが 4〜8 MB なので、月に 60〜120 組ぶんです。使用量は metered.ca のダッシュボードで見られます。

登録してアプリを作り、TURN Server の画面で資格情報（credential）を 1 つ作ると、その行の「Show API Key」に資格情報用の API キーが出ます。ドメイン（`<アプリ名>.metered.live`）は左メニューの Developers にあります。`https://<アプリ名>.metered.live/api/v1/turn/credentials?apiKey=<資格情報の API キー>` が資格情報を返す URL です。Developers にある Secret key はアカウント全体の鍵なので、この URL には使いません。この URL が鍵そのものなので `turn.json` には書かず、`workers/turn/` の Cloudflare Worker に持たせます。資格情報は既定では期限切れにならないので、漏れたと思ったらダッシュボードで無効化して作り直し、Worker の secret を入れ替えます。Worker はサイトの Origin からの GET だけを metered.ca へ通し、1 つの IP からの回数と 1 日の発行回数を制限し、応答を 60 秒使い回します（`worker.js` の冒頭に、守れることと守れないことを書いてあります）。松江・広島・福山・呉で 1 つを共有し、どのリポジトリからデプロイしても同じ Worker が更新されます。

1. metered.ca でアプリと資格情報を 1 つ作り、資格情報の API キーで上の URL を組み立てます。`curl` で開いて `turn:` を含む JSON が返れば正しい URL です。
2. Worker に secret を入れてデプロイします。

   ```sh
   cd workers/turn
   npx wrangler login
   npx wrangler secret put TURN_API_URL      # metered.ca の ?apiKey=... 付きの URL
   npx wrangler deploy                       # 出てきた URL を各リポジトリの TURN_CONFIG_URL に設定する
   ```

3. 表示された Worker の URL を、松江・広島・福山・呉それぞれの repository variable `TURN_CONFIG_URL` に同じ値で設定します。

1 日に発行する回数の上限は `wrangler.toml` の `DAILY_CAP`（既定 500、日本時間の日付で数える）です。達した日は Worker が 503 と `{ "error": "daily_cap" }` を返し、ページ側は対戦PLAY を出さず、その下に「今日は対戦はできません。午前 0 時にリセットします」と出します（`src/net.ts` の `turnState`、`src/main.ts` の `updateOnlineAvailability`）。資格情報 API がそれ以外の理由で応答しないときは「中継サーバーの設定を取得できないため、いまは対戦できません」と出します。定期監視（`monitor.yml`）も同じ API を呼ぶので、止まっている間は監視が失敗して GitHub から通知が届きます。翌日 0 時に戻ります。通常は、通信を許可した人のページ表示 1 回が 1 回にあたります（独自ドメインでキャッシュが効いていれば 1 分に 1 回まで）。いまの数は `https://<Worker の URL>/status` で見られます。この上限は資格情報を大量に取られて月の枠が一気に尽きるのを防ぐためのもので、転送量そのものの上限は metered.ca のプランで決まります。数は Durable Object（`worker.js` の `DailyCounter`）で数えており、無料プランで使える SQLite 方式にしてあります。

`npm run turn:prepare` と `tools/check_site.mjs` は `public/CNAME` のドメインを Origin として名乗って Worker を呼ぶので、CI と定期監視からも検査できます。Worker を `*.workers.dev` のまま使うと Cache API は効かず、発行 API を守るのは回数制限だけになります。`citykart.jp` の DNS が Cloudflare にあるなら、`turn.citykart.jp` のような独自ドメインに載せるとキャッシュも効きます。

別の上流に切り替えるとき:

- [Cloudflare の TURN](https://developers.cloudflare.com/realtime/turn/) は月 1,000 GB まで無料ですが、超過分は 1 GB あたり 0.05 ドルの従量課金で、上限を設定する仕組みがありません。Bearer 認証の POST で資格情報を発行するので、`TURN_API_URL` に `https://rtc.live.cloudflare.com/v1/turn/keys/<Key ID>/credentials/generate-ice-servers`、`TURN_API_TOKEN` に TURN Key の API トークンを入れ、`wrangler.toml` の `TURN_API_METHOD = "POST"` と `TURN_API_BODY` のコメントを外します。本文の `ttl` が資格情報の有効期間（秒）です。応答の `iceServers` が配列でなくても Worker が配列にそろえます。

- 自前の TURN（coturn 等）なら、TURN の REST API 方式（共有鍵から期限付きの資格情報を作る）で資格情報を発行する小さな API を用意し、その URL を `TURN_API_URL` に入れます。**固定の資格情報を ICE サーバーの一覧に直接書くのはやめてください。** `turn.json` は配信されるので誰でも読め、第三者に中継を使われます（転送量の課金や上限の枯渇、踏み台）。

中継が通っているかは、対称型 NAT の端末でトップ画面に「TURN で中継できます」と出るかで分かります。レースの位置情報は 1 組あたり毎秒 10 KB ほどなので、5 分のレースで 3〜4 MB です。

**相手と初めてつながるまでに 8〜19 秒かかります**（公開リレー経由の WebRTC ハンドシェイク。実測値）。ただし上記の presence でページ読み込み中につながっていれば、ロビーでの合流は 2 秒ほどです（`tools/nettest.mjs` で実測 1.9 秒）。それでも人が集まらないようなら `src/net.ts` の `OPEN_PERIOD` を延ばしてください。

参加した直後は相手の挨拶がまだ届かず、作成者が誰か分かりません。そのまま ID 順でホストを決めると、参加した側が一瞬ホストだと思い込んで座席表を配ってしまい、席が入れ替わります。そのため作成者でない場合は 5 秒待ってからホストを名乗ります。

`PORT=5183 node tools/nettest.mjs` でブラウザを 2 つ立ち上げ、同時に押して合流・カウントダウン・発走・位置の一致まで通しで確認できます。`PORT=5183 node tools/presencetest.mjs` は、トップ画面に対戦待ちが出るか、押すと同じ部屋に入って 2 人でカウントダウンが始まるかを確認します。

## 実在の鉄道（走行します）

| 路線 | 表現 |
| --- | --- |
| JR 呉線 | 呉駅を東西に抜ける単線の電化路線。西は川原石、東は休山の下のトンネルに入るので、そのあいだの地上区間（約 1.7km）だけを描く。227系「Red Wing」を模した 4 両編成が 2 本走る |

呉には新幹線が通っていないので、`data/rail.json` の `shinkansen` は `null` です。`src/rail.ts` と `tools/convert_lod2.mjs` は新幹線が無い場合も動くようにしてあります。

線形は OpenStreetMap の way を端点でつないだもので、`tools/fetch_rail.mjs` → `tools/build_rail.mjs` が `data/rail.json` を書き出します（`npm run data:rail`）。福山版から次を変えています。

- **トンネルで切る。** トンネル（`tunnel=yes`）は描かないので、BBOX の中でトンネルを除いて連続している部分のうち、呉駅にいちばん近いものを使います。両端は坑口なので、線路の先を伸ばす処理（`withTail`）も掛けません（伸ばすと山肌を登る）。
- **駅の構内の 2 本目の線路を捨てる。** 呉駅の構内は上下 2 本の線路が同じ端点を結んでいて、つなぐと枝分かれして駅の手前で切れていました。

**コースに踏切はありません。** 呉線とコースが交わるのは 3 か所で、三条通りでは跨線橋でコースが上を通り（`lifts`）、呉港線（亀山橋西詰の先、高さ制限 2.6m）とめがね橋では道路が線路の下をくぐります。呉港線のアンダーパスは、線路は地面の高さのままで、道路のほうを掘り下げています（`data/course.json` の `lifts` で `h` を負にすると路面を下げる）。地盤が海面から 2〜3m しか無く、DEM にも掘り割りのくぼみが入っているので、そのまま下げると路面が海の水面より下になって水に沈みます。`Track` で、掘り下げた所の路面は水面より 1m 以上高く保つようにしています。線路は掘り割りの上を短い橋で渡ります（`tools/build_rail.mjs` の `UNDERPASSES`。近くの OSM の `bridge=yes` による緩い上り下りは取り消す）。

## 実在ランドマーク

| ランドマーク | 作り方 |
| --- | --- |
| 潜水艦あきしお（てつのくじら館） | 独自モデル。涙滴形の船体（全長 76.2m・幅 9.9m）・セイル・潜舵・十字舵を据え台に載せる。位置と向きは OSM の船体の輪郭（way 170619760）の中心と主軸（方位 68.7°） |
| 呉駅 | 独自モデル（`buildKureStation`）。バスターミナル側の正面: 左の低い棟（れんが色の壁と白い額縁の絵）、緑のアーチ枠のガラスの入口（CREST）、右の高いベージュのタイルの棟と屋上のパーゴラ、濃いグレーの大屋根と白い柱。PLATEAU の LOD1 の駅ビルは `excludeRects` で消す |
| アレイからすこじまの護衛艦と潜水艦 | 独自モデル。護衛艦（全長 151m、艦首の砲・艦橋・格子マストとレーダーのドーム・煙突 2 本・格納庫、艦番号）を 2 隻と、潜水艦（そうりゅう型、X 舵）を 3 隻。岸と平行な向きで、船体がまるごと水面に収まる位置のうち公園に近い所から並べる |
| 音戸大橋 | 独自モデル。PLATEAU の `tran` には路面しか無いので、主桁の両端に最も近い高架の点を拾って朱色のアーチリブ・吊材・横梁・桁の側板を足す |
| 大和ミュージアムと呉中央桟橋ターミナル | Unity プロジェクト（`C:UnityProjectsKure-Hanabi2026-2-web`）の `Assets/PlateauFBX/yamato-musium0526.fbx` から、専用テクスチャの 2 棟（本体と、南東の緑の屋根の「Yanato-dome」）を GLB にしたもの（`public/models/yamato_museum.glb`）。配置は Unity のシーン（`WebOptimized/CombinedMeshes` の `cell_-1_1_マテリアル_0` と `cell_0_1_Yanato-dome001_002_0`）と同じ。Unity から FBX を経て Blender に入ると x と y が両方反転する（180 度回る）ので、`tools/convert_models.py` で戻している（OSM の輪郭と平均 1.6m で一致）。LOD1 の箱は `excludeRects` で消す |
| 戦艦大和 | 独自モデル（`buildYamatoModel`）。全長 263m・幅 38.9m の船体（艦首の反り・木の甲板・喫水線）、46cm 三連装の主砲 3 基、副砲 2 基、前檣楼、後ろへ傾いた煙突、後檣、艦尾のクレーン。他所から入手した 3D モデルは再配布の条件があるので使わない。音戸大橋の北、警固屋の沖の呉湾で楕円（東西 280m × 南北 700m）を描いて 8m/s で航行する。レース中は経過時間から位置を決め、先頭のカートが警固屋の海沿いを走る 2 分 40 秒ごろに楕円の南の端（音戸大橋寄り、進む先の右手）に来る。|
| 宮原の造船所 | 独自モデル（`buildShipyard`）。ジャパン マリンユナイテッドと IHI の造船所に、赤白のジブクレーン 14 基・3 つのドック（縁の壁・底の水面・建造中の船体）・大屋根の工場を置く。位置は OSM のクレーン（`man_made=crane`）・ドック（`waterway=dock`）・大屋根の輪郭（`data/landmarks.json` の `shipyard`） |
| 第二音戸大橋 | 独自モデル（遠景）。コースは通らないので、OSM の警固屋音戸バイパスの橋（way 157260072）の両端を結ぶ朱色の桁と中路アーチを置く |

位置は `data/landmarks.json` にあり、`tools/build_rail.mjs` が `data/rail.json` の `landmarks` へ埋め込みます。大和ミュージアムの建物は PLATEAU の LOD1 です。

## 公園

入船山公園・串山公園・恵下山公園・アレイからすこじまなど 15 か所、樹木 592 本を芝生と樹木で再現しています（`src/parks.ts` と `data/parks.json`）。PLATEAU には公園の輪郭が無いので、OpenStreetMap の輪郭を `tools/fetch_parks.mjs` → `tools/build_parks.mjs` で取り込み、コースから 400m 以内・面積 2000m² 以上のものだけを残しています。山の公園（入船山・串山・恵下山・金毘羅山・寺迫）は樹林にしています。

## セットアップ

```bash
npm install
npm run data:download                 # PLATEAU CityGML を data/citygml/ に (建物・道路 + DEM 3.3GB)
node tools/fetch_osm.mjs              # ルート計画用の OSM 道路・鉄道
npm run data:water                    # 水面の輪郭と海岸線 → data/water.json
npm run data:rail                     # 鉄道の線形 → data/rail.json
node tools/plan_route_osm.mjs         # 案内線 → data/drawn_route.json
npm run data:convert                  # 地形・道路・LOD1 建物 (初回は DEM の読み込みに数分)
node tools/build_course.mjs           # 走行線 → data/course_path.json
node tools/convert_lod2.mjs           # LOD2 (呉は実写テクスチャが無いので 0 棟。lod2.json を空で書く)
npm run data:parks                    # 公園の輪郭 → data/parks.json
node tools/export_course_geo.mjs      # 地図用の書き出し
# 大和ミュージアムと戦艦大和の GLB (Blender 5.1 と Unity プロジェクトの FBX が要る。生成済みなら不要)
"C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --factory-startup --python tools/convert_models.py -- "C:/UnityProjects/Kure-Hanabi2026-2-web/Assets"
npm run dev             # http://localhost:5184/
```

`public/data/` に生成済みデータが含まれていれば、`npm run dev` だけで遊べます。

## デプロイ

`main` に push すると GitHub Actions が GitHub Pages へ公開します（`.github/workflows/deploy.yml`）。

公開先: **https://kure.citykart.jp/**

デプロイの流れは次のとおりです。どこかで失敗すると GitHub から通知が届きます。

1. **テスト**（`npm test`。`tests/` の vitest）
2. **ビルド**
3. **配信物の点検**（`npm run check:dist` = `tools/check_site.mjs dist`）。index.html から読む JS があるか、地形・LOD2 の `.bin` が `.json` の頂点数と同じ長さか、アトラスとテクスチャが揃っているかを見ます。欠けていれば配信しません。
4. **配信**
5. **配信後の確認**（`smoke` ジョブ）。本番の URL を同じ点検にかけ、バンドルに埋め込んだコミットがいま配信されている版と一致するまで最大 10 分待ちます。

**切り戻し。** GitHub の Actions → Deploy to GitHub Pages → Run workflow で、`ref` に戻したいコミットの SHA（かタグ）を入れて実行すると、その版を配信し直します。次に `main` へ push すると `main` の先頭が配信されるので、原因を直すまでは `git revert` で `main` 自体を戻しておくのが確実です。

**外形監視と通知。** `.github/workflows/monitor.yml` が 3 時間おきに本番を点検し、対戦のシグナリングに使う nostr リレー 8 つのうち 3 つ以上につながるかも見ます（`node tools/check_site.mjs https://kure.citykart.jp/ --relays` で手元でも実行できます）。本番のトップ画面をブラウザで開くと利用者の「対戦待ち」表示に監視が映ってしまうので、HTTP とリレーの口だけを見ています。失敗すると Issue「本番の外形監視が失敗しています」を作って（開いていればコメントを足して）知らせ、通るようになったら「復旧」とコメントして閉じます（`tools/alert_issue.mjs`）。Issue は持ち主を担当者にして @メンションするので、リポジトリを Watch していなくてもメールが届きます。ジョブ自体も失敗にするので、Actions の失敗通知も別に届きます。リポジトリに 60 日動きが無いと GitHub は定期実行を止めるので、実行のたびに自分を有効化し直して時計を戻しています。

**本番で起きたことの記録と通知。** 捕まえ損ねた例外、読み込みの失敗、WebGL のコンテキスト喪失、読み込み完了までの時間、presence で誰かとつながるまでの時間、対戦の発走人数を `src/telemetry.ts` が記録します。送り先はリポジトリ変数 `TELEMETRY_URL`（ビルド時に `VITE_TELEMETRY_URL` として埋め込む。値は TURN と同じ Worker の URL に `/telemetry` を付けたもの）で、未設定なら送らずにページ内に残すだけです（コンソールで `__telemetry()`）。Worker（`workers/turn/` の `TelemetryLog`）はサイトごとに新しい 1,000 件を残し、定期監視が 3 時間おきに未通知の記録を読み出して（`tools/telemetry_report.mjs`。リポジトリの secret `TELEMETRY_TOKEN` を Worker の secret と同じ値にしておく）、例外・読み込み失敗・WebGL の喪失があれば同じ内容ごとにまとめて Issue「利用者のブラウザでエラーが起きています」に足します。この Issue は直したら手で閉じてください。読み込み時間や対戦の記録は通知せず、件数だけ添えます。送るのは種類・内容・ビルド・画質・言語・パス・UA だけで、名前や peer ID は送りません。残っている記録を手元で全部見るには `TELEMETRY_URL=… TELEMETRY_TOKEN=… node tools/telemetry_report.mjs --site kure --all` です。

**ランキング。** ゴールするとリザルト画面に上位 10 件が出て、名前を入れて自分のタイムを登録できます（`src/ranking.ts`）。記録は TURN と同じ Worker（`workers/turn/` の `Leaderboard`）がサイトごとに上位 100 件を保存します。送り先はリポジトリ変数 `RANKING_URL`（ビルド時に `VITE_RANKING_URL`、値は Worker の URL に `/ranking` を付けたもの）で、未設定ならランキングは出ません。タイムはブラウザで計算しているので、改造すれば速いタイムを送れます。Worker はありえない速さ（コースの全長 ÷ 100 m/s より速いもの）を拒否し、回数を制限するだけです。不適切な名前や不正な記録は、管理用の合言葉（`npx wrangler secret put ADMIN_TOKEN` で設定）を付けて消します。

使えない言葉を含む名前は「その名前は使えません」と出して登録させません（`workers/turn/ngwords.js`。ページと Worker が同じ一覧を使います）。全角・カタカナ・空白・よくある当て字はそろえてから比べますが、一覧は完全ではありません。すり抜けたものは下の方法で消してください。

```sh
curl -X DELETE -H "Authorization: Bearer <ADMIN_TOKEN>" "https://<Worker の URL>/ranking?site=matsue&id=<記録の id>"
```

記録の id は、サイトを開いた状態のブラウザのコンソールで `fetch('<RANKING_URL>').then(r => r.json())` を実行すると見られます。デバッグ用の URL（`?debug=1`、`?steps=`、`?ai=1` など）で走った記録は登録できません。

プロジェクトページはサブパス配信なので `base` が要ります。`vite preview` は `command` が `'serve'` 扱いになり、`command === 'build'` で分岐するとビルド成果物を root で配信してしまって検証にならないため、環境変数で渡しています。

```bash
BASE_PATH=/kure-kart/ npm run build
BASE_PATH=/kure-kart/ npm run preview   # http://127.0.0.1:4173/kure-kart/
```

`npm run build` は最後に `tools/build_en_page.mjs` を呼び、英語版 `dist/en/index.html` を書き出します（「SEO」の項）。Git Bash から実行するときは `MSYS_NO_PATHCONV=1` を付けてください。付けないと `/kure-kart/` が Windows のパスへ変換され、`base` が `/Program Files/Git/kure-kart/` になります。

`public/` 配下のアセットは絶対パスで直書きせず、`src/geo.ts` の `assetUrl()` が `import.meta.env.BASE_URL` を基準に解決します。新しくデータを読む箇所を足すときはこれを使ってください。

初回ロードは「中」画質で約 19MB（2048px アトラス 1.2MB ＋ LOD2 形状 6.5MB ＋ 建物 4.4MB ＋ 地形 6.3MB ＋ 道路 1.7MB）。GitHub Pages の帯域ソフト制限は月 100GB です。

## 操作

| キー | 操作 |
| --- | --- |
| ↑ / W | アクセル |
| ↓ / S | ブレーキ・バック |
| ← → / A D | ハンドル |
| Shift / Space | ドリフト（離すとミニターボ） |
| Ctrl / Enter / X | アイテム使用 |
| B | 後方視点 |
| C | カメラ切替 |
| M | ミュート |

アイテム: ダッシュ（加速）、オイル（後方に設置）、ボール（前方に発射・壁で反射）、むてき（無敵）。コインを取ると最高速が少し上がります。

### スマホ / タブレット

タッチ操作に対応しています。**横向き推奨**ですが、縦向きでも遊べます（Facebook などアプリ内ブラウザは縦に固定されていることがあるため）。

| ボタン | 操作 |
| --- | --- |
| ◀ ▶（左下） | ハンドル |
| D（右下） | ドリフト（離すとミニターボ） |
| ▼ | ブレーキ・バック |
| ★ | アイテム使用 |

**アクセルは自動です。** 親指 2 本でハンドル・ドリフト・アイテムを賄うので、アクセルを押しっぱなしにする指がありません。ブレーキを押している間だけアクセルが離れます。

タッチは各ボタンではなく画面全面（`#touch`）で受け、指ごとに座標からボタンを引き直します（`src/input.ts`）。ボタンに `touchstart` を付ける方式だと、◀ に置いた指を ▶ へ滑らせても ◀ が押されたままになるためです。

Android の Chrome では PLAY を押すと全画面にして横向きに固定します。iPhone は全画面 API も向きの固定も無いので、縦向きのときはタイトル画面に「横向きにすると見やすくなります」と出すだけです。HUD とボタンはノッチ・ホームバーを避けて置きます（`viewport-fit=cover` と `env(safe-area-inset-*)`）。ミニマップはスマホでは出しません。

## 画質プリセット

公開環境では GPU を選べないため、タイトル画面に画質切り替えを置いています。初回は WebGL の `WEBGL_debug_renderer_info` から GPU 名を読んで自動選択し、以後は localStorage に保存します（`src/quality.ts`）。アトラスの解像度が変わるので、切り替えはページ再読み込みで反映されます。

| プリセット | アトラス | 影 | 解像度上限 | 描画距離 |
| --- | --- | --- | --- | --- |
| 高（専用GPU向け） | 4096px | 2048 シャドウマップ | DPR 1.5 | 4200m |
| 中（内蔵GPU向け） | 2048px | 1024 シャドウマップ | DPR 1.0 | 3000m |
| 低（最軽量） | 2048px | なし | DPR 1.0 | 2000m |

自動判定は、ソフトウェアラスタライザとモバイルを「低」、Intel UHD/Iris など内蔵 GPU を「中」、GeForce/Radeon RX/Apple M 系を「高」に割り当てます。

**最大のコストは三角形数ではなくテクスチャ VRAM です。** LOD2 は 92,815 三角形で、ジオメトリはまとめてあるのでドローコールも少ない一方、4096px のアトラス 2 枚は非圧縮 RGBA + ミップで約 170MB を占めます。2048px 版に落とすと約 43MB になり、転送量も 4.9MB → 1.2MB に減ります。呉版は LOD2 のアトラスを持たない（実写テクスチャが無い）ので、この負担はありません。代わりに LOD1 の建物と地形（1455×1666）がすべてです。

低画質用のアトラスは既存の 4096px 版から生成します（PLATEAU の元データは不要）。UV はアトラス内の正規化座標なので、画像を縮小しても `lod2.bin` 側は変更不要です。

```bash
npm run data:lq            # public/data/lod2_atlas_N_2k.jpg を生成
```

### 実測値（広島版での値）

Intel UHD Graphics（内蔵 GPU）/ 1920×1080 / DPR 1.5 / 本番ビルド / 全 AI 走行時の中央値:

| プリセット | fps | 読み込み |
| --- | --- | --- |
| 高 | 16 | 4.6s |
| 中 | 28 | 4.7s |
| 低 | 35 | 3.9s |

同じシーンを GeForce RTX 3070 Laptop で動かすと「高」でも 93fps 出ます。内蔵 GPU との差が大きいので、公開時は自動判定に任せるのが前提です。なお連続計測すると熱で 3 割ほど落ちるため、上表は各プリセットを冷えた状態で 1 番目に測った値です。

## 開発用デバッグ

URL パラメータでカウントダウン無しに任意地点から開始できます。

```
http://localhost:5184/?debug=1&wp=5&cam=0      # 経由地 5 (蔵本通り) から開始
http://localhost:5184/?debug=1&idx=2000&cam=0  # スプラインのサンプル番号 2000 から
http://localhost:5184/?debug=1&ai=1&steps=60   # プレイヤーも AI 操作 + 物理を 60 倍速 (低速環境での検証用)
http://localhost:5184/?debug=1&photo=34.19505,132.53735,14,230,150  # 指定した緯度経度を撮影 (注視高さ, 距離, 方位角)。これは音戸大橋
```

`norail=1` `nolod2=1` `nobldg=1` `nodome=1` `nopark=1` `noshadow=1` `lod2basic=1` で要素を切り分けられます。

ポート 5184 が別プロジェクトに使われている場合は `npx vite --port 5183 --strictPort` で起動し、`PORT=5183 node tools/shots.mjs ...` のように `PORT` を渡します（`shots.mjs` と `airace.mjs` が対応しています）。

画面左上（タイマーの下）に FPS を常時表示します。50 以上で緑、30 以上で黄、それ未満は赤。`nofps=1` で非表示にできます。

`?q=low` `?q=medium` `?q=high` で画質プリセットを固定できます（自動判定と localStorage より優先）。

戦艦大和の位置は `?shipt=<秒>` で進められます（撮影・確認用。例: `?debug=1&idx=5100&shipt=160`）。

`cam` は 0: 追従, 1: 遠め, 2: ボンネット, 3: 俯瞰。`tools/shots.mjs` と `tools/airace.mjs` は Playwright (SwiftShader) でこれらを自動実行します。

## 構成

```
data/course.json           地点名・看板 (緯度経度・英語名)
data/drawn_route.json      走行線探索の案内線 (plan_route_osm.mjs が生成)
data/course_path.json      道路上を通る走行線 (build_course.mjs が生成)
data/rail.json             鉄道・軌道・ランドマークの実在位置
data/parks.json            公園の輪郭 (OSM)
data/osm/kure.json         ルート計画用の OSM 道路・鉄道 (tools/fetch_osm.mjs)
data/landmarks.json        ランドマークの実在位置 (build_rail.mjs が rail.json へ埋める)
data/water.json            水面の輪郭と海岸線 (OSM)
tools/download_plateau.mjs PLATEAU CityGML ダウンロード
tools/fetch_osm.mjs        ルート計画用の OSM 道路・鉄道を取得
tools/route_vias.json      コースの経由地 (道路の絞り込み・OSM で切れている所の手動接続つき)
tools/plan_route_osm.mjs   経由地を OSM の道路網でつなぎ data/drawn_route.json を作る
tools/fetch_rail.mjs       鉄道の線形を OSM から取得
tools/build_rail.mjs       OSM の way をつないで data/rail.json を作る
tools/fetch_water.mjs      水面の輪郭を OSM から取得
tools/build_water.mjs      リレーションの outer を環にして data/water.json を作る
tools/fetch_parks.mjs      公園の輪郭を OSM から取得
tools/build_parks.mjs      コース沿いの公園だけ残して data/parks.json を作る
tools/triangulate.mjs      多角形の三角形分割 (LOD2 で使用)
tools/convert_citygml.mjs  CityGML → buildings.json / roads.json / terrain.bin (LOD1)
tools/convert_lod2.mjs     CityGML → lod2.bin / lod2.json (LOD2 実写テクスチャ)
tools/download_lod2_tex.mjs LOD2 テクスチャ画像のダウンロード
tools/build_lod2_atlas.mjs テクスチャアトラス生成 (ベタ塗り面の補正込み)
tools/build_lod2_atlas_lq.mjs 低画質用 2048px アトラス生成 (既存アトラスから)
tools/build_course.mjs     走行線を PLATEAU の道路面の上に載せる (A* 探索)
tools/export_course_geo.mjs コースを GeoJSON / KML / GPX / OSM 地図ページへ書き出す
tools/convert_models.py    Unity プロジェクトの FBX (大和ミュージアム) を GLB に (Blender で実行。戦艦大和の glTF は配信しない data/models_private/ へ)
tools/inspect_fbx.py       FBX の中身 (オブジェクト・大きさ・マテリアル) を表示 (Blender で実行)
tools/screenshot.mjs       Playwright による動作確認スクリーンショット
tools/mobile_check.mjs     スマホ表示 (横持ち / 縦持ち) とタッチ操作の確認
tools/shots.mjs            任意地点のスクリーンショット
tools/airace.mjs           全 AI による高速レース検証
tools/nettest.mjs          オンライン対戦の疎通確認 (ブラウザ 2 つ)
tools/presencetest.mjs     トップ画面の「対戦待ち」表示と、待っている人の部屋へ即座に入れるかの確認
tools/make_ogp.mjs         SNS のカード画像 (1200x630, 日本語 / 英語) を作る
tools/build_en_page.mjs    ビルド後に英語版 dist/en/index.html を書き出す (head だけ差し替え)
tools/probe_scene.mjs      画面前方の物体をレイキャストで特定
tools/probe_uv.mjs         UV とアトラス参照先の特定
tools/check_trains.mjs     車両が走行しているかの確認
tools/check_site.mjs       配信物の点検 (dist/ か本番 URL。.bin と .json の食い違い・JS の参照切れ・リレー)
tools/telemetry_report.mjs 本番で起きたことの記録を Worker から取り出して Issue 用にまとめる
tools/alert_issue.mjs      監視の結果を GitHub の Issue で知らせる (作る・足す・復旧で閉じる)
tests/                     vitest の単体テスト (npm test)
tools/record_clip.mjs      ?rec=1 で 1/30 秒ずつ進めて連番 PNG を撮る (プロモ動画の素材)
tools/record_promo.mjs     プロモ動画の 6 カットの撮影位置とウォームアップ
tools/clips_to_mp4.mjs     連番 PNG → mp4 (HyperFrames がシークできるよう GOP を短く)
tools/fetch_promo_font.mjs 使う文字だけに絞った Noto Sans JP (レンダラに和文フォントが無いため)
src/fetch.ts      アセットの取得 (状態の確認・時間切れ・再試行・長さの検証)
src/telemetry.ts  本番で起きた例外・読み込み失敗・対戦の成否の記録
src/geo.ts        座標変換 (等距円筒近似, 原点 = 呉駅前)
src/terrain.ts    地形メッシュ + 地面テクスチャ (道路・河川)
src/buildings.ts  LOD1 建物メッシュ (テクスチャ 6 種)
src/textures.ts   プロシージャルテクスチャ
src/track.ts      スプライン・路面・高架・トンネル・欄干・看板・最寄点検索
src/lod2.ts       LOD2 実写テクスチャ建物の読み込み
src/quality.ts    画質プリセット (GPU 自動判定・localStorage 保存)
src/rail.ts       JR 呉線の線路と走行車両 (新幹線は rail.json にあれば描く)
src/landmarks.ts  潜水艦あきしお・アレイの潜水艦・音戸大橋のアーチ・第二音戸大橋・戦艦大和 (独自モデル)・大和ミュージアム (GLB)
src/parks.ts      公園の芝・樹木 (濠を持つ公園にも対応)
src/net.ts        オンライン対戦 (サーバー無しの P2P, WebRTC) と「対戦待ち」の伝え合い (presence)
src/i18n.ts       日本語 / 英語の切り替え
src/kart.ts       カート物理・モデル・AI
src/items.ts      アイテムボックス・コイン・オイル・ボール
src/hud.ts        HUD・ミニマップ
src/audio.ts      WebAudio 効果音
src/main.ts       シーン構築・レース進行
```

## プロモ動画

呉版のプロモ動画はまだ作っていません。撮影の仕組み（`?rec=1` で 1/30 秒ずつ進めて連番 PNG を撮る `tools/record_clip.mjs`、カットを並べる `tools/record_promo.mjs`、連番を mp4 にする `tools/clips_to_mp4.mjs`、使う文字だけに絞ったフォントを取る `tools/fetch_promo_font.mjs`）は福山版のまま残してあります。`tools/record_promo.mjs` のカットの位置（`idx`）と `tools/fetch_promo_font.mjs` の文言は福山版のものなので、呉版で作るときは直してください。

撮影用に足したクエリ:

| パラメータ | 用途 |
| --- | --- |
| `?rec=1` | 実時間から切り離し、`window.__recStep(n)` で n コマ進める |
| `?fovadd=<度>` | 画角を広げる。three.js の `fov` は垂直画角なので、縦長で撮ると水平の見える範囲が 16:9 の半分以下 (102°→43°) になる |
| `?campan=<m>` | カメラは後ろのまま**視線だけ横に振る**。縦長では画角が狭く、コースの脇の被写体が外れるため |
| `?camk=<倍率>` | 追従カメラを硬くする (高速でもカートが小さくならない) |
| `?photo=<lat>,<lon>,<高さ>,<距離>,<方位>` + `?orbit=<度/秒>` | 撮影カメラ。OGP 画像の音戸大橋に使っている |

## ライセンス

| 対象 | ライセンス |
| --- | --- |
| ソースコード (`src/`, `tools/`, `index.html`) | MIT — [LICENSE](LICENSE) |
| 3D 都市データ (`public/data/`, `data/`) | CC BY 4.0 — [DATA_LICENSE.md](DATA_LICENSE.md) |

データの出典は国土交通省「3D都市モデル（Project PLATEAU）呉市（2020年度）」、ルート計画・鉄道の線形・公園と水面の輪郭・海岸線・トンネルと螺旋の線形は © OpenStreetMap contributors (ODbL) です。加工内容の一覧は [DATA_LICENSE.md](DATA_LICENSE.md) にあります。
