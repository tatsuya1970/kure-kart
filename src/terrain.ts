// 地形 (PLATEAU DEM) と地面テクスチャ (PLATEAU 道路面をラスタライズ)
import * as THREE from 'three';
import { assetUrl } from './geo';
import { fetchBuffer, fetchJson } from './fetch';

/** 地面テクスチャへの描き込み (ワールド m → px の倍率 sx, sz を受け取る) */
export type GroundPaint = (ctx: CanvasRenderingContext2D, sx: number, sz: number) => void;

export interface TerrainMeta {
  w: number;
  h: number;
  cell: number;
  x0: number;
  z0: number;
  water: number;
  scale: number;
}

export class Terrain {
  meta: TerrainMeta;
  data: Int16Array;
  mesh!: THREE.Mesh;
  waterMesh!: THREE.Mesh;
  readonly WATER_LEVEL = -0.4;
  /** 地形に穴を開けるセル (トンネルの坑口付近。坑道の筒が見えるように) */
  hole: Uint8Array | null = null;

  constructor(meta: TerrainMeta, data: Int16Array) {
    this.meta = meta;
    this.data = data;
  }

  get xMin() { return this.meta.x0; }
  get zMin() { return this.meta.z0; }
  get xMax() { return this.meta.x0 + (this.meta.w - 1) * this.meta.cell; }
  get zMax() { return this.meta.z0 + (this.meta.h - 1) * this.meta.cell; }

  /** セル値 (水面は null) */
  cell(i: number, j: number): number | null {
    const { w, h, water, scale } = this.meta;
    if (i < 0 || j < 0 || i >= w || j >= h) return null;
    const v = this.data[j * w + i];
    return v === water ? null : v * scale;
  }

  isWater(x: number, z: number): boolean {
    const { cell, x0, z0 } = this.meta;
    const i = Math.round((x - x0) / cell), j = Math.round((z - z0) / cell);
    return this.cell(i, j) === null;
  }

  /** バイリニア補間した標高。水面セルは null */
  heightAt(x: number, z: number): number | null {
    const { cell, x0, z0 } = this.meta;
    const fx = (x - x0) / cell, fz = (z - z0) / cell;
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j;
    const a = this.cell(i, j), b = this.cell(i + 1, j), c = this.cell(i, j + 1), d = this.cell(i + 1, j + 1);
    if (a === null || b === null || c === null || d === null) {
      const vals = [a, b, c, d].filter((v): v is number => v !== null);
      if (vals.length === 0) return null;
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    }
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  /** 陸地の標高 (水面上なら近傍の陸地から推定) */
  groundHeight(x: number, z: number): number {
    const h = this.heightAt(x, z);
    if (h !== null) return h;
    const { cell, x0, z0 } = this.meta;
    const i = Math.round((x - x0) / cell), j = Math.round((z - z0) / cell);
    for (let r = 1; r < 60; r++) {
      let s = 0, n = 0;
      for (let dj = -r; dj <= r; dj += r) for (let di = -r; di <= r; di += r) {
        const v = this.cell(i + di, j + dj);
        if (v !== null) { s += v; n++; }
      }
      if (n) return s / n;
    }
    return 2;
  }

  /**
   * コースが丘を切り通す所 (宮原の坂、音戸の螺旋の取り付けなど) では、DEM の斜面が路面より
   * 高く、地形が路面の縁にはみ出す。路面の下まで削り、外側は 0.8 の勾配で元の斜面へ戻す。
   * 路面より低い所 (盛土) と水面 (橋) は触らない。Track を作った後、build の前に呼ぶ。
   * 削る幅は区間ごとの路面の半幅 (track.hw) に合わせる。細い市道で必要以上に
   * 山を削ると、現地より広い切り通しができてしまう。
   */
  flattenAlong(track: { n: number; px: Float32Array; py: Float32Array; pz: Float32Array; elev: Float32Array; hw: Float32Array; tunnel?: Uint8Array }): void {
    const { w, h, cell, x0, z0, water, scale } = this.meta;
    const bestD = new Float32Array(w * h).fill(Infinity);
    const target = new Float32Array(w * h);
    const inner = new Float32Array(w * h);
    // トンネルの点が最寄りのセルは削らない (山を残す)。坑口から 30m 以内で坑道の筒の
    // 内側に掛かるセルと、坑道の天井より低いセルは穴にする
    const tunnelAt = new Int32Array(w * h).fill(-1);
    const tun = track.tunnel;
    const portalDist = new Float32Array(track.n).fill(Infinity);
    if (tun) {
      let last = -Infinity;
      for (let s = 0; s < track.n; s++) { if (!tun[s]) last = s; else portalDist[s] = (s - last) * 2; }
      last = Infinity;
      for (let s = track.n - 1; s >= 0; s--) { if (!tun[s]) last = s; else portalDist[s] = Math.min(portalDist[s], (last - s) * 2); }
    }
    for (let s = 0; s < track.n; s++) {
      if (track.elev[s] > 1.5) continue;
      const px = track.px[s], pz = track.pz[s];
      const inTunnel = !!tun?.[s];
      const R = track.hw[s] + (inTunnel ? 4 : 16);
      const i0 = Math.max(0, Math.floor((px - R - x0) / cell)), i1 = Math.min(w - 1, Math.ceil((px + R - x0) / cell));
      const j0 = Math.max(0, Math.floor((pz - R - z0) / cell)), j1 = Math.min(h - 1, Math.ceil((pz + R - z0) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const d = Math.hypot(x0 + i * cell - px, z0 + j * cell - pz);
        if (d >= R) continue;
        const k = j * w + i;
        if (d < bestD[k]) { bestD[k] = d; target[k] = track.py[s] - 0.45; inner[k] = track.hw[s] + 2; tunnelAt[k] = inTunnel ? s : -1; }
      }
    }
    let cut = 0, holes = 0;
    this.hole = new Uint8Array(w * h);
    for (let k = 0; k < w * h; k++) {
      if (!Number.isFinite(bestD[k]) || this.data[k] === water) continue;
      const s = tunnelAt[k];
      if (s >= 0) {
        const inside = bestD[k] < track.hw[s] + 0.5;
        if (inside && (portalDist[s] < 30 || this.data[k] * scale < track.py[s] + 9)) { this.hole[k] = 1; holes++; }
        continue;
      }
      const limit = target[k] + Math.max(0, bestD[k] - inner[k]) * 0.8;
      const cur = this.data[k] * scale;
      if (cur > limit) { this.data[k] = Math.round(limit / scale); cut++; }
    }
    console.log(`コース沿いの地形を ${cut} セル削りました${holes ? ` (トンネルの坑口に ${holes} セルの穴)` : ''}`);
  }

  /** 地形メッシュを生成。roads は地面テクスチャに描画する道路ポリゴン */
  build(roads: number[][], trackMask: GroundPaint, parkMask?: GroundPaint): THREE.Group {
    const { w, h, cell, x0, z0, water, scale } = this.meta;
    const group = new THREE.Group();

    // ---- 地面テクスチャ ----
    const worldW = (w - 1) * cell, worldH = (h - 1) * cell;
    const texW = Math.min(4096, Math.round(worldW)), texH = Math.min(4096, Math.round(worldH));
    const cv = document.createElement('canvas');
    cv.width = texW; cv.height = texH;
    const ctx = cv.getContext('2d')!;
    const sx = texW / worldW, sz = texH / worldH;
    // 街区のベース色
    ctx.fillStyle = '#b9b3a6';
    ctx.fillRect(0, 0, texW, texH);
    // 微妙なノイズ (街区のバリエーション)
    for (let k = 0; k < 4000; k++) {
      const px = Math.random() * texW, py = Math.random() * texH, r = 8 + Math.random() * 40;
      ctx.fillStyle = `rgba(${150 + Math.random() * 60 | 0},${150 + Math.random() * 50 | 0},${130 + Math.random() * 40 | 0},0.25)`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
    // 公園の芝・濠 (道路より先。交差する所は道路が上に来る)
    parkMask?.(ctx, sx, sz);
    // 道路 (PLATEAU tran)
    ctx.fillStyle = '#5c5d61';
    ctx.strokeStyle = '#8b8c90';
    ctx.lineWidth = 1.2;
    for (const poly of roads) {
      ctx.beginPath();
      for (let i = 1; i < poly.length; i += 2) {
        const px = (poly[i] - x0) * sx, py = (poly[i + 1] - z0) * sz;
        if (i === 1) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    trackMask(ctx, sx, sz);
    (window as any).__groundCanvas = cv; // デバッグ用
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.flipY = false;

    // ---- 地形ジオメトリ ----
    const geo = new THREE.PlaneGeometry(worldW, worldH, w - 1, h - 1);
    geo.rotateX(-Math.PI / 2); // XZ平面, 法線 +Y
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const c = new THREE.Color();
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i;
        const raw = this.data[k];
        const isWater = raw === water;
        const y = isWater ? -1.8 : raw * scale;
        pos.setXYZ(k, x0 + i * cell, y, z0 + j * cell);
        uv.setXY(k, i / (w - 1), j / (h - 1));
        if (isWater) c.setRGB(0.35, 0.4, 0.42);
        else if (y > 25) c.setRGB(0.42, 0.6, 0.35);
        else if (y > 9) { const t = (y - 9) / 16; c.setRGB(1 - 0.55 * t, 1 - 0.35 * t, 1 - 0.6 * t); }
        else c.setRGB(1, 1, 1);
        colors[k * 3] = c.r; colors[k * 3 + 1] = c.g; colors[k * 3 + 2] = c.b;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // トンネルの坑口付近は三角形を抜いて穴にする (頂点を 1 つでも含むものを抜く)
    if (this.hole?.some(v => v)) {
      const src = geo.index!.array;
      const keep: number[] = [];
      for (let t = 0; t < src.length; t += 3) {
        const a = src[t], b = src[t + 1], c = src[t + 2];
        if (this.hole[a] || this.hole[b] || this.hole[c]) continue;
        keep.push(a, b, c);
      }
      geo.setIndex(keep);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    group.add(this.mesh);

    // ---- 水面 ----
    // 瀬戸内海は南へ何十 km も続くので、遠景の山並み (main.ts) の外まで広げておく
    const wgeo = new THREE.PlaneGeometry(worldW + 24000, worldH + 24000);
    wgeo.rotateX(-Math.PI / 2);
    const wmat = new THREE.MeshPhongMaterial({ color: 0x2f7fb8, shininess: 25, specular: 0x334f66, transparent: true, opacity: 0.85 });
    this.waterMesh = new THREE.Mesh(wgeo, wmat);
    this.waterMesh.position.set(x0 + worldW / 2, this.WATER_LEVEL, z0 + worldH / 2);
    group.add(this.waterMesh);
    return group;
  }
}

export async function loadTerrain(onProgress?: (p: number) => void): Promise<Terrain> {
  const meta = await fetchJson<TerrainMeta>(assetUrl('data/terrain.json'));
  onProgress?.(0.5);
  // 標高は int16 で w × h 個。足りなければ途中で切れたか、json と版が違う
  const bytes = meta.w * meta.h * 2;
  const buf = await fetchBuffer(assetUrl('data/terrain.bin'), bytes);
  onProgress?.(1);
  return new Terrain(meta, new Int16Array(buf, 0, meta.w * meta.h));
}
