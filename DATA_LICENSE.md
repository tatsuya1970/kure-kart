# データのライセンス

このリポジトリは、**コード**と**データ**で異なるライセンスが適用されます。

| 対象 | ライセンス |
| --- | --- |
| ソースコード（`src/`, `tools/`, `index.html`, 設定ファイル） | MIT（[LICENSE](LICENSE)） |
| 3D 都市データ（`public/data/`, `data/` の PLATEAU 由来のもの） | CC BY 4.0（下記） |
| OpenStreetMap 由来のデータ（`data/osm/`, `data/drawn_route.json`, `data/rail.json` の線形, `data/parks.json` と `data/water.json` の輪郭・海岸線, `data/course.json` の音戸大橋の螺旋の線形） | ODbL 1.0（下記） |

## 3D 都市データ（PLATEAU）

`public/data/` および `data/` に含まれる 3D 都市データは、以下を加工して作成したものです。

> 出典: 国土交通省「3D都市モデル（Project PLATEAU）呉市（2020年度）」
> https://www.mlit.go.jp/plateau/
> ライセンス: クリエイティブ・コモンズ 表示 4.0 国際 (CC BY 4.0)
> https://creativecommons.org/licenses/by/4.0/deed.ja

加工内容:

| ファイル | 元データ | 加工 |
| --- | --- | --- |
| `public/data/buildings.json` | 建築物モデル `bldg` (LOD1 Solid) | フットプリントと高さを抽出 |
| `public/data/roads.json` | 交通（道路）モデル `tran` (LOD1) | 道路面ポリゴンを抽出 |
| `public/data/terrain.bin`, `terrain.json` | 地形モデル `dem` (LOD1 TIN) | 5m グリッドの標高マップへリサンプル。水面を判定（呉湾・音戸の瀬戸は OSM の海岸線、二河川・堺川は OSM の水面の輪郭を併用） |
| `data/course_path.json` | 交通（道路）モデル `tran` (LOD1) | 道路面上を A* 探索して得た走行線 |
| `public/course.geojson`, `.kml`, `.gpx` | 同上 | 走行線を地図用フォーマットへ書き出し |

呉市 2020 年度の LOD2 には実写テクスチャが含まれていないため、`public/data/lod2.*` は空です（建物はすべて LOD1 で描いています）。

CC BY 4.0 は再配布・改変・商用利用を許諾しています。本リポジトリのデータを利用する場合は、上記の出典表示を継承してください。

## OpenStreetMap 由来のデータ

> © OpenStreetMap contributors
> https://www.openstreetmap.org/copyright
> ライセンス: Open Data Commons Open Database License (ODbL) 1.0

| ファイル | 使い方 |
| --- | --- |
| `data/osm/kure.json` | 道路・鉄道の取得結果（`tools/fetch_osm.mjs`） |
| `data/osm/rail_raw.json`, `parks_raw.json`, `water_raw.json` | 鉄道・公園・水面と海岸線の取得結果（`tools/fetch_rail.mjs` ほか） |
| `data/drawn_route.json` | 経由地を OSM の道路網でつないだ案内線。走行線の探索（A*）の重みにだけ使い、走行線そのものは PLATEAU の道路面の上にある |
| `data/course.json` の `stationPass` | 音戸大橋の両岸の螺旋の線形（国道487号） |
| `data/rail.json` | JR 呉線の線形 |
| `data/landmarks.json` | 潜水艦あきしおの位置と向き（船体の輪郭から算出）、第二音戸大橋の両端 |
| `data/water.json` | 川・池の水面の輪郭と海岸線（呉湾・音戸の瀬戸の水面判定に使用） |
| `data/parks.json` | 公園の輪郭（間引き済み） |

## Unity プロジェクト由来のモデル

| ファイル | 元 |
| --- | --- |
| `public/models/yamato_museum.glb` | `Kure-Hanabi2026-2-web` の `Assets/PlateauFBX/yamato-musium0526.fbx`（PLATEAU の建物に独自のテクスチャを貼ったもの）の大和ミュージアム本体と呉中央桟橋ターミナル |

戦艦大和は独自モデル（`src/landmarks.ts` の `buildYamatoModel`、MIT）で、他所から入手した 3D モデルは配信していません。

## PLATEAU・OSM 由来ではない要素

以下はこのリポジトリの独自実装であり、MIT ライセンスの対象です。

- 潜水艦あきしお・係留された潜水艦・音戸大橋のアーチ・第二音戸大橋・戦艦大和のモデル（`src/landmarks.ts`）
- トンネル（坑道の筒・照明・坑口）のモデル（`src/track.ts`）
- 車両・高架橋・駅のモデル（`src/rail.ts`）
- プロシージャルテクスチャ（`src/textures.ts`）
- カート物理・アイテム・HUD・効果音
