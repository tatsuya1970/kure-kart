// 実在ランドマーク
//   潜水艦あきしお     — てつのくじら館 (海上自衛隊呉史料館) の前に陸揚げされた全長 76m の潜水艦
//   アレイからすこじま — 目の前の岸壁に係留された海上自衛隊の潜水艦 (3 隻)
//   音戸大橋           — 音戸の瀬戸を渡る朱色のアーチ橋。コースはこの上を渡ってゴール
//   第二音戸大橋       — 音戸大橋の北に並ぶ朱色の中路アーチ橋 (遠景)
//   大和ミュージアム   — Unity プロジェクトの FBX から起こした GLB (public/models/yamato_museum.glb)
//   戦艦大和           — Unity プロジェクトの glTF (OriginalAsset/1077519.gltf) から起こした GLB
//                        (public/models/yamato.glb)。音戸の瀬戸の北の呉湾を航行する
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import railData from '../data/rail.json';
import { llToXZ, assetUrl } from './geo';
import type { Terrain } from './terrain';
import type { Track } from './track';
import { makeSignTexture } from './textures';

type LandmarkInfo = {
  name: string; lat: number; lon: number; headingDeg: number; excludeRadius: number;
  /** 建物を消す矩形 [中心の東へのずれ m, 南へのずれ m, 東西の半幅 m, 南北の半幅 m] */
  excludeRects?: [number, number, number, number][];
  model?: string; radiusEW?: number; radiusNS?: number; speed?: number;
  from?: { lat: number; lon: number }; to?: { lat: number; lon: number }; path?: [number, number][];
};
const LM = (railData as any).landmarks as Record<string, LandmarkInfo>;

/**
 * ランドマークの専用モデルと重なる PLATEAU 建物を除く。
 *
 * tools/convert_citygml.mjs も同じ除外を行うが、あちらはデータ生成時にしか効かない。
 * 生成済みの public/data/ を作り直さずにランドマークを足せるよう、実行時にも判定する。
 */
export function landmarkBlocksBuilding(ring: number[]): boolean {
  for (const info of Object.values(LM)) {
    if (info.excludeRects) {
      // 専用モデルに置き換える建物: 重心が矩形に入るものを消す
      const [lx, lz] = llToXZ(info.lat, info.lon);
      let cx = 0, cz = 0;
      const m = ring.length / 2;
      for (let k = 0; k + 1 < ring.length; k += 2) { cx += ring[k]; cz += ring[k + 1]; }
      cx /= m; cz /= m;
      for (const [dx, dz, hx, hz] of info.excludeRects) {
        if (Math.abs(cx - lx - dx) < hx && Math.abs(cz - lz - dz) < hz) return true;
      }
    }
    if (!info.excludeRadius) continue;
    const [lx, lz] = llToXZ(info.lat, info.lon);
    const r2 = info.excludeRadius * info.excludeRadius;
    for (let k = 0; k + 1 < ring.length; k += 2) {
      const dx = ring[k] - lx, dz = ring[k + 1] - lz;
      if (dx * dx + dz * dz < r2) return true;
    }
  }
  return false;
}

/** 方位 (北から時計回りの度) を、ローカル +Z をその向きへ回す rotation.y に直す */
const yawOfBearing = (deg: number) => Math.PI - THREE.MathUtils.degToRad(deg);

const HULL = 0x33383f; // 真っ黒にすると陰影が消えて影絵になるので、少し明るめの黒

/**
 * 潜水艦 1 隻 (ゆうしお型 / そうりゅう型の共通の形)。ローカル +Z が艦首、原点は船体の中心軸。
 * 涙滴形の船体を回転体で起こし、艦橋 (セイル) と潜舵、艦尾の十字舵を足す。
 */
function submarine(length: number, beam: number, opts: { draft?: number; xRudder?: boolean } = {}): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: HULL });
  const R = beam / 2;
  // 回転体の母線 (y = 半径, x = 艦首からの距離)。艦首は丸く、艦尾はすぼまる
  const pts: THREE.Vector2[] = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let r: number;
    if (t < 0.12) r = R * Math.sqrt(1 - ((0.12 - t) / 0.12) ** 2);
    else if (t < 0.62) r = R;
    else r = R * Math.max(0.04, Math.cos(((t - 0.62) / 0.38) * Math.PI / 2) ** 0.8);
    pts.push(new THREE.Vector2(Math.max(0.01, r), (0.5 - t) * length));
  }
  const hull = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat);
  hull.rotation.x = Math.PI / 2; // 回転体の軸 (y) を +Z へ
  hull.castShadow = true;
  g.add(hull);
  // 艦橋 (セイル)。艦首から 1/3 ほどの所に立つ
  const sailLen = length * 0.15, sailH = beam * 0.62;
  const sail = new THREE.Mesh(new THREE.BoxGeometry(1.9, sailH, sailLen), mat);
  sail.position.set(0, R + sailH / 2 - 0.3, length * 0.17);
  sail.castShadow = true;
  g.add(sail);
  const sailTop = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, sailLen, 10, 1, false, 0, Math.PI), mat);
  sailTop.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  sailTop.position.set(0, R + sailH - 0.3, length * 0.17);
  g.add(sailTop);
  // 潜舵 (セイルの両脇)
  const plane = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.95, 0.25, 2.2), mat);
  plane.position.set(0, R + sailH * 0.62, length * 0.19);
  g.add(plane);
  // 艦尾の舵 (十字か X 字)
  const rud = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, beam * 0.55, 3.4), mat);
    fin.position.y = beam * 0.32;
    const arm = new THREE.Group();
    arm.add(fin);
    arm.rotation.z = (k * Math.PI) / 2 + (opts.xRudder ? Math.PI / 4 : 0);
    rud.add(arm);
  }
  rud.position.z = -length * 0.44;
  g.add(rud);
  return g;
}

/**
 * てつのくじら館の潜水艦あきしお。陸の上に据え台で持ち上げて横たえてある。
 * 位置と向きは OpenStreetMap の船体の輪郭 (data/landmarks.json) に合わせる。
 */
export function buildAkishio(terrain: Terrain): THREE.Group {
  const info = LM.akishio;
  const g = new THREE.Group();
  const [x, z] = llToXZ(info.lat, info.lon);
  const ground = terrain.groundHeight(x, z);
  g.position.set(x, ground, z);
  g.rotation.y = yawOfBearing(info.headingDeg);
  const LEN = 76.2, BEAM = 9.9;
  const sub = submarine(LEN, BEAM);
  sub.position.y = 2.2 + BEAM / 2;
  g.add(sub);
  // 据え台 (コンクリートの台座を 5 基)
  const baseMat = new THREE.MeshLambertMaterial({ color: 0xb8b4aa });
  for (let k = -2; k <= 2; k++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(BEAM * 0.7, 2.6, 3), baseMat);
    b.position.set(0, 1.3, k * 13);
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }
  // 艦番号 579 (セイルの両側)
  const numTex = makeSignTexture('579', 'SS-579 AKISHIO');
  for (const s of [-1, 1]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.6), new THREE.MeshBasicMaterial({ map: numTex, transparent: true }));
    board.position.set(s * 1.0, 2.2 + BEAM + 2.2, LEN * 0.17);
    board.rotation.y = s * Math.PI / 2;
    g.add(board);
  }
  return g;
}

/**
 * アレイからすこじまの前の岸壁に係留された潜水艦。
 * 岸と平行な向きで、船体がまるごと水面に収まる位置のうち、公園に近い所から 3 隻並べる。
 */
export function buildAlleySubs(terrain: Terrain): THREE.Group {
  const info = LM.alleySubs;
  const g = new THREE.Group();
  const [cx, cz] = llToXZ(info.lat, info.lon);
  const yaw = yawOfBearing(info.headingDeg);
  // 岸に沿う向き (ax, az) と、それに直交する向き (sx, sz)
  const ax = Math.sin(yaw), az = Math.cos(yaw);
  const sx = -az, sz = ax;
  const LEN = 84, BEAM = 9.1; // そうりゅう型
  // 船体の外周 (岸壁との隙間 4m を含む) がすべて水面か
  const fits = (x: number, z: number) => {
    for (let t = -0.5; t <= 0.5; t += 0.125) for (const o of [-BEAM / 2 - 4, 0, BEAM / 2 + 4]) {
      if (!terrain.isWater(x + ax * LEN * t + sx * o, z + az * LEN * t + sz * o)) return false;
    }
    return true;
  };
  const cand: { x: number; z: number; d: number }[] = [];
  for (let u = -300; u <= 300; u += 8) for (let v = -300; v <= 300; v += 4) {
    const x = cx + ax * u + sx * v, z = cz + az * u + sz * v;
    if (fits(x, z)) cand.push({ x, z, d: Math.hypot(u * 0.6, v) });
  }
  cand.sort((p, q) => p.d - q.d);
  const placed: { x: number; z: number }[] = [];
  for (const c of cand) {
    if (placed.length >= 3) break;
    // 既に置いた艦とは、横に 16m か縦に 1 隻分以上離す
    if (placed.some(p => {
      const du = Math.abs((c.x - p.x) * ax + (c.z - p.z) * az), dv = Math.abs((c.x - p.x) * sx + (c.z - p.z) * sz);
      return dv < 16 && du < LEN + 10;
    })) continue;
    placed.push(c);
    const sub = submarine(LEN, BEAM, { xRudder: true });
    // 船体の上 1/3 ほどが水面の上に出る
    sub.position.set(c.x, terrain.WATER_LEVEL + BEAM * 0.18, c.z);
    sub.rotation.y = yaw + (placed.length % 2 ? 0 : Math.PI);
    g.add(sub);
  }
  if (!placed.length) console.warn('アレイからすこじまの潜水艦を置ける水面が見つかりませんでした');
  return g;
}

/** 始点と終点を通る管 (ケーブル・吊材) */
function tube(from: THREE.Vector3, to: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

/** 主桁の両端に最も近い、高架 (elev > 8) のコースの点 */
function deckIndex(track: Track, lat: number, lon: number): number {
  const [x, z] = llToXZ(lat, lon);
  let best = -1, bd = Infinity;
  for (let i = 0; i < track.n; i++) {
    if (track.elev[i] < 8) continue;
    const d = Math.hypot(track.px[i] - x, track.pz[i] - z);
    if (d < bd) { bd = d; best = i; }
  }
  return bd < 60 ? best : -1;
}

const VERMILION = 0xd2412e;

/**
 * 音戸大橋のアーチ。コースの主桁 (from → to) の両側に朱色のアーチリブを立て、
 * 吊材で桁とつなぎ、頂部を横梁で結ぶ。桁の側面も朱色の板で覆う。
 */
export function buildOndoBridge(track: Track): THREE.Group {
  const info = LM.ondoBridge;
  const g = new THREE.Group();
  if (!info.from || !info.to) return g;
  let a = deckIndex(track, info.from.lat, info.from.lon);
  let b = deckIndex(track, info.to.lat, info.to.lon);
  if (a < 0 || b < 0) { console.warn('音戸大橋の主桁が見つかりませんでした'); return g; }
  if (a > b) [a, b] = [b, a];
  const span = b - a;
  if (span < 20) return g;
  const red = new THREE.MeshLambertMaterial({ color: VERMILION });
  const RISE = 17;                              // 桁からのアーチの高さ
  const archY = (t: number) => RISE * Math.sin(Math.PI * t);
  for (const s of [-1, 1]) {
    const lat = (i: number) => s * (track.hw[i] + 1.6);
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 24; k++) {
      const i = a + Math.round((span * k) / 24);
      pts.push(new THREE.Vector3(track.px[i] + track.nx[i] * lat(i), track.py[i] + 0.5 + archY(k / 24), track.pz[i] + track.nz[i] * lat(i)));
    }
    const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.75, 8, false), red);
    rib.castShadow = true;
    g.add(rib);
    // 桁の側面 (朱色の板)
    const pos: number[] = [], idx: number[] = [];
    for (let i = a; i <= b; i++) {
      const o = lat(i);
      const x = track.px[i] + track.nx[i] * o, z = track.pz[i] + track.nz[i] * o;
      pos.push(x, track.py[i] - 1.95, z, x, track.py[i] + 0.35, z);
      if (i < b) { const q = (i - a) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    pg.setIndex(idx);
    pg.computeVertexNormals();
    const plate = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ color: VERMILION, side: THREE.DoubleSide }));
    plate.castShadow = true;
    g.add(plate);
    // 吊材 (約 8m 間隔)
    for (let k = 1; k < 20; k++) {
      const t = k / 20, i = a + Math.round(span * t);
      const bottom = new THREE.Vector3(track.px[i] + track.nx[i] * lat(i), track.py[i] + 0.4, track.pz[i] + track.nz[i] * lat(i));
      const top = bottom.clone(); top.y += archY(t);
      if (archY(t) > 1.2) g.add(tube(bottom, top, 0.22, red));
    }
  }
  // 横梁 (アーチの上部をつなぐ)
  for (let k = 5; k <= 15; k += 2) {
    const t = k / 20, i = a + Math.round(span * t);
    const w = track.hw[i] + 1.6, y = track.py[i] + 0.5 + archY(t);
    const p = new THREE.Vector3(track.px[i] + track.nx[i] * w, y, track.pz[i] + track.nz[i] * w);
    const q = new THREE.Vector3(track.px[i] - track.nx[i] * w, y, track.pz[i] - track.nz[i] * w);
    g.add(tube(p, q, 0.45, red));
  }
  return g;
}

/**
 * 第二音戸大橋 (遠景)。コースは通らないので、桁と中路アーチをまとめて置く。
 * 桁は両端の地形の高さを結び、瀬戸の上では 30m 以上に保つ。
 */
export function buildSecondOndoBridge(terrain: Terrain): THREE.Group {
  const info = LM.secondOndoBridge;
  const g = new THREE.Group();
  if (!info.path) return g;
  const [p0, p1] = info.path.map(([la, lo]) => llToXZ(la, lo));
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const ux = (p1[0] - p0[0]) / L, uz = (p1[1] - p0[1]) / L;
  const nx = uz, nz = -ux;
  const h0 = Math.max(terrain.groundHeight(p0[0], p0[1]), 8), h1 = Math.max(terrain.groundHeight(p1[0], p1[1]), 8);
  const DECK = 34, HW = 7.5, N = 60;
  const deckY = (t: number) => Math.max(h0 + (h1 - h0) * t, DECK * Math.min(1, Math.sin(Math.PI * t) * 2.2));
  const at = (t: number, o: number, y: number) => new THREE.Vector3(p0[0] + ux * L * t + nx * o, y, p0[1] + uz * L * t + nz * o);
  // 桁 (箱)
  const pos: number[] = [], idx: number[] = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N, y = deckY(t);
    for (const [o, dy] of [[HW, 0], [-HW, 0], [-HW, -2.4], [HW, -2.4]] as [number, number][]) { const v = at(t, o, y + dy); pos.push(v.x, v.y, v.z); }
    if (k < N) {
      const q = k * 4;
      for (let e = 0; e < 4; e++) { const a = q + e, b = q + ((e + 1) % 4); idx.push(a, b, a + 4, b, b + 4, a + 4); }
    }
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  dg.setIndex(idx);
  dg.computeVertexNormals();
  const deck = new THREE.Mesh(dg, new THREE.MeshLambertMaterial({ color: VERMILION, side: THREE.DoubleSide }));
  deck.castShadow = true;
  g.add(deck);
  // 中路アーチ: 瀬戸の両岸 (全長の 20%〜80%) の水面近くから立ち上がり、桁を貫いて上へ
  const red = new THREE.MeshLambertMaterial({ color: VERMILION });
  const t0 = 0.2, t1 = 0.8;
  for (const s of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 24; k++) {
      const u = k / 24, t = t0 + (t1 - t0) * u;
      pts.push(at(t, s * (HW + 0.8), 6 + (DECK + 22 - 6) * Math.sin(Math.PI * u)));
    }
    const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 1.1, 8, false), red);
    rib.castShadow = true;
    g.add(rib);
    for (let k = 1; k < 24; k++) {
      const u = k / 24, t = t0 + (t1 - t0) * u;
      const ay = 6 + (DECK + 22 - 6) * Math.sin(Math.PI * u), dy = deckY(t);
      if (Math.abs(ay - dy) < 2) continue;
      g.add(tube(at(t, s * (HW + 0.8), Math.min(ay, dy)), at(t, s * (HW + 0.8), Math.max(ay, dy)), 0.3, red));
    }
  }
  for (let k = 8; k <= 16; k += 2) {
    const u = k / 24, t = t0 + (t1 - t0) * u, y = 6 + (DECK + 22 - 6) * Math.sin(Math.PI * u);
    g.add(tube(at(t, HW + 0.8, y), at(t, -HW - 0.8, y), 0.6, red));
  }
  // 橋脚 (陸に掛かる所)
  const pierMat = new THREE.MeshLambertMaterial({ color: 0xb4b0a6 });
  for (const t of [0.08, 0.14, 0.86, 0.92]) {
    const c = at(t, 0, 0);
    const gy = terrain.groundHeight(c.x, c.z), top = deckY(t) - 2.4;
    if (top - gy < 2) continue;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(5, top - gy, 3), pierMat);
    pier.position.set(c.x, (top + gy) / 2, c.z);
    pier.rotation.y = Math.atan2(ux, uz);
    g.add(pier);
  }
  return g;
}

const gltf = new GLTFLoader();
async function loadModel(path: string): Promise<THREE.Group> {
  const g = await gltf.loadAsync(assetUrl(path));
  g.scene.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  return g.scene;
}

/**
 * 大和ミュージアムと呉中央桟橋ターミナル。PLATEAU の LOD1 の箱の代わりに、Unity プロジェクトで作った
 * テクスチャ付きの建物を置く (LOD1 の同じ建物は landmarkBlocksBuilding の excludeRects で消える)。
 * モデルの y は標高 (T.P.) で、足元は約 3.1m。ゲームの地面の高さに合わせて上下だけずらす。
 */
export async function loadYamatoMuseum(terrain: Terrain): Promise<THREE.Object3D> {
  const info = LM.yamatoMuseum;
  const model = await loadModel(info.model!);
  const [x, z] = llToXZ(info.lat, info.lon);
  const box = new THREE.Box3().setFromObject(model);
  model.position.set(x, terrain.groundHeight(x, z) - box.min.y - 0.05, z);
  return model;
}

/**
 * (旧モデル yamato_01.FBX 用。今のモデル 1077519.gltf はテクスチャ付きなので使っていない)
 * 戦艦大和の塗り分け。元の FBX のテクスチャ (yamato_01.tga) は無く、Unity 側も単色のグレーだったので、
 * 面の向きと高さで塗る: 上を向いた低い面は木の甲板、喫水線の近くは濃いグレー、それ以外は軍艦色。
 */
export function paintShip(model: THREE.Object3D): void {
  const deck = new THREE.Color(0x9c8467), hull = new THREE.Color(0x707780), low = new THREE.Color(0x3f444b);
  model.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    geo.computeVertexNormals();
    const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal');
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 3) {
      const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const ny = (nor.getY(i) + nor.getY(i + 1) + nor.getY(i + 2)) / 3;
      // 上甲板は艦底から 16m (船体を 8m 沈めるので水面から 8m)
      const c = ny > 0.75 && y > 15 && y < 17.5 ? deck : y < 9 ? low : hull;
      for (let k = 0; k < 3; k++) c.toArray(col, (i + k) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    mesh.geometry = geo;
    mesh.material = new THREE.MeshLambertMaterial({ vertexColors: true });
  });
}

/**
 * 戦艦大和 (独自モデル)。全長 263m・幅 38.9m。ローカル +y が上、艦首が -z、艦底が y = 0。
 * 走っているカートからは 250m 以上離れて見えるので、特徴 (艦首の反りと広い甲板、46cm 三連装の
 * 主砲 3 基、前檣楼 (塔型の艦橋)、後ろへ傾いた煙突、後檣、艦尾のクレーン) が分かる程度に作る。
 */
export function buildYamatoModel(): THREE.Group {
  const g = new THREE.Group();
  const LEN = 263, BEAM = 38.9;
  const DECK = 18;                         // 艦底から上甲板まで (中央部)
  const gray = new THREE.MeshLambertMaterial({ color: 0x7b828a });
  const darkGray = new THREE.MeshLambertMaterial({ color: 0x5b6168 });
  const wood = new THREE.MeshLambertMaterial({ color: 0xa88b62, side: THREE.DoubleSide });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  // ---- 船体 ----
  // 艦首 (u = 0) から艦尾 (u = 1) までの断面を並べて張る。半幅は艦首で 0、中央で最大、艦尾は角型 (トランサム)
  const N = 48;
  const halfW = (u: number) => {
    if (u < 0.36) return (BEAM / 2) * Math.pow(Math.sin((u / 0.36) * Math.PI / 2), 0.75);
    if (u < 0.74) return BEAM / 2;
    return (BEAM / 2) * (1 - 0.42 * Math.pow((u - 0.74) / 0.26, 1.6));
  };
  // 甲板の高さ: 艦首へ向けて大きく反り上がる (大和の特徴)。艦尾は一段低い
  const deckY = (u: number) => DECK + 5.5 * Math.pow(Math.max(0, 0.32 - u) / 0.32, 1.7) - 1.2 * Math.max(0, u - 0.8) / 0.2;
  // 断面の形 (片舷): 甲板の縁から艦底へ。[横の倍率, 高さの倍率]
  const SEC: [number, number][] = [[1, 1], [0.99, 0.62], [0.93, 0.34], [0.75, 0.12], [0.4, 0.02], [0, 0]];
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  // 水面から上は軍艦色、喫水線は黒、下は赤 (喫水 10m で沈める)
  const cHull = new THREE.Color(0x777e86), cBoot = new THREE.Color(0x24282c), cBottom = new THREE.Color(0x7a2d24);
  const ring = SEC.length * 2 - 1;
  for (let i = 0; i <= N; i++) {
    const u = i / N, z = -LEN / 2 + u * LEN, w = Math.max(0.3, halfW(u)), top = deckY(u);
    const pts: [number, number][] = [];
    for (const [fx, fy] of SEC) pts.push([-w * fx, top * fy]);
    for (let k = SEC.length - 2; k >= 0; k--) pts.push([w * SEC[k][0], top * SEC[k][1]]);
    for (const [x, y] of pts) {
      pos.push(x, y, z);
      const c = y > 10.8 ? cHull : y > 9.2 ? cBoot : cBottom;
      col.push(c.r, c.g, c.b);
    }
    if (i < N) {
      const a = i * ring, b = (i + 1) * ring;
      for (let k = 0; k < ring - 1; k++) idx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1);
    }
  }
  // 艦尾の平らな面 (トランサム)
  {
    const a = N * ring;
    for (let k = 1; k < ring - 1; k++) idx.push(a, a + k + 1, a + k);
  }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hullGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  hullGeo.setIndex(idx);
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  hull.castShadow = true;
  g.add(hull);
  // 上甲板 (木): 断面の縁をつないだ面
  {
    const dp: number[] = [], di: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, z = -LEN / 2 + u * LEN, w = Math.max(0.3, halfW(u)) - 0.3, y = deckY(u) + 0.05;
      dp.push(-w, y, z, w, y, z);
      if (i < N) { const a = i * 2; di.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
    dg.setIndex(di);
    dg.computeVertexNormals();
    const deck = new THREE.Mesh(dg, wood);
    deck.receiveShadow = true;
    g.add(deck);
  }
  const deckAt = (z: number) => deckY((z + LEN / 2) / LEN);

  // ---- 主砲 (46cm 三連装) と副砲 (15.5cm 三連装) ----
  // 前向き 2 基 (2 番砲塔は背負い式で一段高い)、後ろ向き 1 基
  const turret = (z: number, lift: number, dir: 1 | -1, scale = 1, barrelLen = 21) => {
    const t = new THREE.Group();
    const w = 14 * scale, h = 5.5 * scale, l = 17 * scale;
    // 前面を絞った形 (上から見て台形)。Shape の +y が砲口側
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, -l / 2); sh.lineTo(w / 2, -l / 2); sh.lineTo(w * 0.36, l / 2); sh.lineTo(-w * 0.36, l / 2); sh.lineTo(-w / 2, -l / 2);
    const bodyGeo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
    // Shape の平面 (x, y) を水平 (x, z) に寝かせ、押し出しを上 (+y) へ向ける
    bodyGeo.rotateX(-Math.PI / 2);
    bodyGeo.scale(1, 1, -1);
    const body = new THREE.Mesh(bodyGeo, gray);
    body.castShadow = true;
    t.add(body);
    const barbette = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.52, lift + 1, 16), darkGray);
    barbette.position.y = -(lift + 1) / 2;
    t.add(barbette);
    for (let k = 0; k < 3; k++) {
      const bx = (k - 1) * 3.2 * scale;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * scale, 0.65 * scale, barrelLen * scale, 8), darkGray);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(bx, h * 0.45, l * 0.5 + (barrelLen * scale) / 2 - 1);
      t.add(barrel);
    }
    // ローカル +z が砲口の向き。艦首 (-z) を向く砲塔は 180 度回す
    t.rotation.y = dir === 1 ? Math.PI : 0;
    t.position.set(0, deckAt(z) + lift, z);
    g.add(t);
  };
  turret(-LEN / 2 + 70, 0.5, 1);
  turret(-LEN / 2 + 92, 4.5, 1);
  turret(LEN / 2 - 68, 0.5, -1);
  turret(-LEN / 2 + 110, 9, 1, 0.55, 14);
  turret(LEN / 2 - 90, 6, -1, 0.55, 14);

  // ---- 前檣楼 (塔型の艦橋) ----
  const towerZ = -LEN / 2 + 125;
  const base = deckAt(towerZ);
  const block = (w: number, h: number, l: number, y: number, z = towerZ, mat: THREE.Material = gray) => add(new THREE.BoxGeometry(w, h, l), mat, 0, y + h / 2, z);
  block(20, 7, 26, base);                 // 甲板室
  block(13, 9, 14, base + 7);
  block(10, 9, 11, base + 16, towerZ + 1);
  block(8, 7, 8, base + 25, towerZ + 1.5);
  block(6, 5, 6.5, base + 32, towerZ + 2);
  add(new THREE.BoxGeometry(17, 2.4, 2.6), darkGray, 0, base + 38.5, towerZ + 1);   // 15m 測距儀
  add(new THREE.CylinderGeometry(2.4, 2.8, 3, 10), gray, 0, base + 36, towerZ + 2);
  add(new THREE.CylinderGeometry(0.35, 0.5, 12, 6), darkGray, 0, base + 45, towerZ + 3); // 檣
  // 張り出し (見張り所・高角砲の台) を両舷に
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(5, 1.2, 9), gray, sx * 9, base + 15, towerZ + 1);
    add(new THREE.BoxGeometry(4, 1, 7), gray, sx * 7, base + 24, towerZ + 1);
  }

  // ---- 煙突 (後ろへ傾いた一本煙突) ----
  const funnelZ = towerZ + 26;
  block(22, 6, 30, deckAt(funnelZ), funnelZ);   // 煙突のまわりの甲板室
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 20, 14), gray);
  funnel.scale.set(1, 1, 1.7);
  funnel.rotation.x = 0.33;               // 艦尾側 (+z) へ傾ける
  funnel.position.set(0, deckAt(funnelZ) + 14, funnelZ + 2);
  funnel.castShadow = true;
  g.add(funnel);
  const cap = add(new THREE.CylinderGeometry(4.3, 4.3, 1.2, 14), darkGray, 0, deckAt(funnelZ) + 23.5, funnelZ + 5.3);
  cap.scale.set(1, 1, 1.7);
  cap.rotation.x = 0.33;

  // ---- 後檣 ----
  const mastZ = funnelZ + 30;
  block(9, 8, 10, deckAt(mastZ), mastZ);
  add(new THREE.CylinderGeometry(0.4, 0.6, 26, 6), darkGray, 0, deckAt(mastZ) + 19, mastZ);
  add(new THREE.BoxGeometry(12, 0.4, 0.4), darkGray, 0, deckAt(mastZ) + 26, mastZ);

  // ---- 高角砲・機銃 (両舷に小さな箱を並べる) ----
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const z = towerZ + 6 + k * 9;
      add(new THREE.BoxGeometry(4, 2.2, 5), gray, sx * 14, deckAt(z) + 1.1, z);
      const gun = add(new THREE.CylinderGeometry(0.25, 0.25, 5, 6), darkGray, sx * 14, deckAt(z) + 2.8, z - 3);
      gun.rotation.x = Math.PI / 2 - 0.5;
    }
  }

  // ---- 艦尾のクレーンとカタパルト ----
  const craneZ = LEN / 2 - 12;
  add(new THREE.CylinderGeometry(0.6, 0.8, 12, 8), darkGray, 0, deckAt(craneZ) + 6, craneZ);
  const jib = add(new THREE.BoxGeometry(0.8, 0.8, 20), darkGray, 0, deckAt(craneZ) + 11, craneZ - 8);
  jib.rotation.x = -0.35;
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(1.2, 1.4, 20), darkGray, sx * 11, deckAt(LEN / 2 - 28) + 0.7, LEN / 2 - 28);

  // 艦首の菊の御紋 (金色の小さな円)
  add(new THREE.CircleGeometry(0.9, 16), new THREE.MeshBasicMaterial({ color: 0xd4af37, side: THREE.DoubleSide }), 0, deckY(0.01) - 1.5, -LEN / 2 + 1.2);
  return g;
}

/**
 * 戦艦大和。音戸の瀬戸の北、警固屋の沖の呉湾に、南北に長い楕円を描いて航行させる。
 * 艦首はモデルの -z。水面に 8m ほど沈め (喫水)、ゆっくり揺らす。
 */
export async function loadYamatoShip(terrain: Terrain): Promise<{ object: THREE.Object3D; update(dt: number, raceTime: number | null): void }> {
  const info = LM.yamatoShip;
  // 独自モデル (他所から入手した 3D モデルは再配布の条件があるので使わない)
  const model = buildYamatoModel();
  const holder = new THREE.Group();
  holder.add(model);
  const [cx, cz] = llToXZ(info.lat, info.lon);
  const rx = info.radiusEW ?? 180, rz = info.radiusNS ?? 400, speed = info.speed ?? 8;
  const DRAFT = 10; // 喫水 (実物は約 10.4m)
  // 楕円の一周の長さ (ラマヌジャンの近似) から角速度を決める
  const perim = Math.PI * (3 * (rx + rz) - Math.sqrt((3 * rx + rz) * (rx + 3 * rz)));
  // 楕円の上の位置 t (ラジアン)。レース中は経過時間から決める。
  // 先頭のカートが警固屋の海沿いを走る 2 分 40 秒ごろに、楕円の南の端 (音戸大橋寄り、
  // カートの進む先の右手) に来るようにしてある。レース前 (タイトル・カウントダウン) はそこで止めておく
  const omega = (speed / perim) * Math.PI * 2;
  const MEET = 160, SOUTH = Math.PI * 1.5;
  const t0 = SOUTH - omega * MEET;
  let t = t0, time = 0;
  const place = () => {
    const x = cx + Math.cos(t) * rx, z = cz - Math.sin(t) * rz;
    // 進む向き (t が増える向きの接線)。反時計回り (上から見て) に回る
    const tx = -Math.sin(t) * rx, tz = -Math.cos(t) * rz;
    holder.position.set(x, terrain.WATER_LEVEL - DRAFT + Math.sin(time * 0.5) * 0.3, z);
    // モデルの -z を (tx, tz) へ向ける
    holder.rotation.set(Math.sin(time * 0.4) * 0.01, Math.atan2(-tx, -tz), 0);
  };
  place();
  // 航路が陸に掛かっていないか (データを作り直したときの確認用)
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    if (!terrain.isWater(cx + Math.cos(a) * rx, cz - Math.sin(a) * rz)) { console.warn('戦艦大和の航路が陸に掛かっています', k); break; }
  }
  return {
    object: holder,
    update(dt: number, raceTime: number | null) {
      time += dt;
      t = t0 + omega * (raceTime ?? 0);
      place();
    },
  };
}
