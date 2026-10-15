// AR on iPhone (lane T, 2026-10-14): iOS Safari has no WebXR, so the tank goes to Apple's AR Quick Look as a .usdz
// (three's USDZExporter). Quick Look places it in the room itself (tap to place, true size, its own shadow).
// The export is a simplified COPY of the viewer's build; nothing in the viewer's scene is changed:
// - what makes no sense in the room is left out (scale person, room floor, wall, terrain dots), as in lane Q's prepScene;
// - the custom shaders (lighting patches, water volume, outlines) don't exist in USD, so every mesh gets a plain
//   MeshStandardMaterial (base colour, map, opacity); lines and outline hulls are dropped;
// - Quick Look ignores vertex colours, so they are baked into a small atlas: per part, its colours are fitted by a plane
//   in RGB (the top two principal axes), and a bilinear texture tile reproduces a plane exactly; meshes with a map
//   drop their vertex colours (form shading there; Quick Look lights the model itself) for their mean;
// - dense meshes are thinned (meshoptimizer) to a triangle budget, then merged per material;
// - the root is in metres with its origin at the base centre (lane Q's baseCentre): Quick Look stands the stand's foot
//   on the floor. Loaded on demand (the exporter, fflate, meshoptimizer), so the normal page doesn't grow.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MM, baseCentre, roomObjects } from './ar';
import type { Viewport } from './viewer';
import { cpuGeometry } from './plant3d';

/**
 * Triangles in the whole export at most (~100 bytes a triangle after trimUsda). Nathan 2026-10-14: 250k (~25 MB) over
 * the brief's ~15 MB, so a heavily planted 40 breeder keeps nearly all its stem-plant leaves.
 */
export const BUDGET = 250_000;
/** Opacity floors / fixed values in Quick Look (its own lighting, no water shader). */
export const GLASS_MIN = 0.1, WATER_OPACITY = 0.12, FROST_OPACITY = 0.8;
/** Atlas tile (px) and its padding: the plane is extended into the padding so the first mip levels stay right. */
export const TILE = 8, PAD = 2;
/** Largest texture side in the export: fins and bodies stay sharp at phone distance; PNG size and encode time go with it. */
export const TEX_MAX = 512;

export interface Spec {
  color: THREE.Color;
  map: THREE.Texture | null;
  opacity: number;
  transparent: boolean;
  alphaTest: number;
  emissive: boolean;
  /** Seen from both sides: exported with a reversed copy (USD has no double-sided flag Quick Look honours). */
  double: boolean;
  /** Bake the vertex colours into the atlas (no map); else they are dropped for their mean. */
  bake: boolean;
  roughness: number;
}

const STANDARD = new Set(['MeshBasicMaterial', 'MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial']);

/**
 * The plain material a mesh's material becomes in Quick Look, or null to leave the mesh out (outline hulls, lines,
 * the decal shadows under the animals: Quick Look casts its own).
 */
export function specOf(m: THREE.Material, vc: boolean, meshData: Record<string, unknown> = {}): Spec | null {
  const u = { ...meshData, ...m.userData }, base = (m as THREE.MeshBasicMaterial).color ?? new THREE.Color(1, 1, 1);
  const s: Spec = { color: base.clone(), map: null, opacity: 1, transparent: false, alphaTest: 0, emissive: false, double: m.side === THREE.DoubleSide, bake: false, roughness: 0.65 };
  const sh = m as THREE.ShaderMaterial;
  if (sh.isShaderMaterial) {
    if (!sh.uniforms?.uWCol) return null; // outlines (fish, stand, items)
    return { ...s, color: (sh.uniforms.uWCol.value as THREE.Color).clone(), opacity: WATER_OPACITY, transparent: true, roughness: 0.2, double: false };
  }
  if (!STANDARD.has(m.type) || !m.visible || !m.colorWrite) return null; // also the snails' invisible hit cards
  const map = (m as THREE.MeshBasicMaterial).map ?? null;
  if (u.frost) return { ...s, opacity: FROST_OPACITY, transparent: true, double: true, roughness: 0.9 };
  if (u.glow) return { ...s, emissive: true };
  if (u.nolight && map && m.transparent && m.opacity < 1) return null; // contact shadows, light pools
  s.map = map; s.transparent = m.transparent; s.opacity = m.opacity;
  s.alphaTest = m.alphaTest;
  if (m.alphaToCoverage && map) s.transparent = true; // soft fin cards: their alpha is mostly under 0.5, so blend it
  if (u.waterSurf) { s.roughness = 0.1; s.double = true; }
  else if (m.transparent && !map) { s.opacity = Math.max(m.opacity, GLASS_MIN); s.roughness = 0.1; } // glass
  s.bake = vc && !map;
  return s;
}

/** Material key: parts with equal keys merge into one mesh. */
export const specKey = (s: Spec) => [s.bake ? 'atlas' : s.map?.uuid ?? '-', s.color.getHexString(), s.opacity.toFixed(3), +s.transparent, s.alphaTest, +s.emissive, s.roughness].join('|');

/** Scene (mm, origin anywhere) -> USD root (m, origin at the base centre `c`). */
export const rootMatrix = (c: THREE.Vector3) => new THREE.Matrix4().makeScale(MM, MM, MM).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));

// ---------- geometry ----------

/** A mesh's geometry (one material group) in world space, indexed, with position + normal (+ uv, + color). */
function worldPart(mesh: THREE.Mesh, start: number, count: number, uv: boolean, vc: boolean) {
  const src = cpuGeometry(mesh), g = new THREE.BufferGeometry(); // (a plant: what shows at its growth, revealed on the CPU)
  for (const k of ['position', 'normal', ...(uv ? ['uv'] : []), ...(vc ? ['color'] : [])]) if (src.attributes[k]) g.setAttribute(k, src.attributes[k].clone());
  const n = src.index ? src.index.count : src.attributes.position.count, end = Math.min(n, start + count);
  const idx: number[] = [];
  for (let i = start; i < end; i++) idx.push(src.index ? src.index.getX(i) : i);
  if (mesh.matrixWorld.determinant() < 0) for (let i = 0; i + 2 < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  g.setIndex(idx);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.applyMatrix4(mesh.matrixWorld);
  return g;
}

/** Drop the triangles a material's clipping planes cut away (by centroid; world space). */
export function clipTriangles(g: THREE.BufferGeometry, planes: THREE.Plane[]) {
  if (!planes.length) return g;
  const p = g.attributes.position, idx = g.index!, keep: number[] = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(p, idx.getX(i)); b.fromBufferAttribute(p, idx.getX(i + 1)); c.fromBufferAttribute(p, idx.getX(i + 2));
    a.add(b).add(c).divideScalar(3);
    if (planes.every(pl => pl.distanceToPoint(a) >= 0)) keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
  }
  g.setIndex(keep);
  return g;
}

/** Keep only the vertices an index list uses (attributes copied, indices renumbered). */
export function compact(g: THREE.BufferGeometry, idx: ArrayLike<number>) {
  const map = new Map<number, number>(), order: number[] = [], out = new THREE.BufferGeometry(), tri = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) {
    let j = map.get(idx[i]);
    if (j === undefined) { j = order.length; map.set(idx[i], j); order.push(idx[i]); }
    tri[i] = j;
  }
  for (const [k, a] of Object.entries(g.attributes)) {
    const n = a.itemSize, arr = new Float32Array(order.length * n);
    order.forEach((v, i) => { for (let c = 0; c < n; c++) arr[i * n + c] = a.getComponent(v, c); });
    out.setAttribute(k, new THREE.BufferAttribute(arr, n));
  }
  out.setIndex(new THREE.BufferAttribute(tri, 1));
  return out;
}

const floats = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, n = a.itemSize) => {
  const out = new Float32Array(a.count * n);
  for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) out[i * n + c] = a.getComponent(i, c);
  return out;
};

/**
 * Weld a triangle soup: vertices at the same place with the same uv and colour become one, their normals averaged
 * (some animal models draw each triangle with its own vertices; the simplifier can only collapse shared ones).
 */
export function weld(g: THREE.BufferGeometry) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, col = g.attributes.color, idx = g.index!;
  const ids = new Map<string, number>(), remap = new Int32Array(p.count), first: number[] = [], nsum: number[] = [];
  const q = (v: number, k: number) => Math.round(v * k);
  for (let i = 0; i < p.count; i++) {
    let key = `${q(p.getX(i), 1e3)},${q(p.getY(i), 1e3)},${q(p.getZ(i), 1e3)}`;
    if (uv) key += `|${q(uv.getX(i), 1e5)},${q(uv.getY(i), 1e5)}`;
    if (col) key += `|${q(col.getX(i), 1e3)},${q(col.getY(i), 1e3)},${q(col.getZ(i), 1e3)}`;
    let id = ids.get(key);
    if (id === undefined) { id = first.length; ids.set(key, id); first.push(i); nsum.push(0, 0, 0); }
    remap[i] = id;
    nsum[id * 3] += n.getX(i); nsum[id * 3 + 1] += n.getY(i); nsum[id * 3 + 2] += n.getZ(i);
  }
  if (first.length === p.count) return g;
  const out = compact(g, first);
  const on = out.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < first.length; i++) { v.fromArray(nsum, i * 3).normalize(); on.setXYZ(i, v.x, v.y, v.z); }
  const tri = new Uint32Array(idx.count);
  for (let i = 0; i < idx.count; i++) tri[i] = remap[idx.getX(i)];
  out.setIndex(new THREE.BufferAttribute(tri, 1));
  return out;
}

/** Smooth shading: every vertex at a place gets the mean normal of all vertices there (rocks and wood are drawn flat-faced). */
export function smoothNormals(g: THREE.BufferGeometry) {
  const p = g.attributes.position, n = g.attributes.normal, sum = new Map<string, number[]>(), keys: string[] = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 1e3)},${Math.round(p.getY(i) * 1e3)},${Math.round(p.getZ(i) * 1e3)}`;
    keys.push(k);
    let s = sum.get(k);
    if (!s) sum.set(k, (s = [0, 0, 0]));
    s[0] += n.getX(i); s[1] += n.getY(i); s[2] += n.getZ(i);
  }
  const v = new THREE.Vector3();
  keys.forEach((k, i) => { v.fromArray(sum.get(k)!).normalize(); n.setXYZ(i, v.x, v.y, v.z); });
  return g;
}

/** Connected pieces of an indexed mesh (leaves, blades): union-find over the triangles; returns a piece id per triangle. */
export function pieces(idx: ArrayLike<number>, nVerts: number) {
  const par = new Int32Array(nVerts).map((_, i) => i);
  const find = (x: number) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let i = 0; i < idx.length; i += 3) { const a = find(idx[i]); par[find(idx[i + 1])] = a; par[find(idx[i + 2])] = a; }
  const tri = new Int32Array(idx.length / 3);
  for (let i = 0; i < tri.length; i++) tri[i] = find(idx[i * 3]);
  return tri;
}

/**
 * Keep about a share `f` of a mesh's pieces (a carpet's blades, a stem plant's leaves), spread evenly. A leaf's
 * front and back are separate pieces at the same place, so pieces go by where they are (centroid to 0.5 mm): both
 * sides stay or go together.
 */
export function keepShare(g: THREE.BufferGeometry, f: number) {
  const idx = g.index!.array, p = g.attributes.position, tri = pieces(idx, p.count), sum = new Map<number, number[]>();
  for (let t = 0; t < tri.length; t++) {
    let s = sum.get(tri[t]);
    if (!s) sum.set(tri[t], (s = [0, 0, 0, 0]));
    for (let k = 0; k < 3; k++) { const v = idx[t * 3 + k]; s[0] += p.getX(v); s[1] += p.getY(v); s[2] += p.getZ(v); s[3]++; }
  }
  const keep = new Map<number, boolean>();
  for (const [id, s] of sum) {
    const h = Math.imul(Math.round(s[0] / s[3] * 2), 73856093) ^ Math.imul(Math.round(s[1] / s[3] * 2), 19349663) ^ Math.imul(Math.round(s[2] / s[3] * 2), 83492791);
    keep.set(id, ((h >>> 0) % 1000) / 1000 < f);
  }
  const out: number[] = [];
  for (let t = 0; t < tri.length; t++) if (keep.get(tri[t])) out.push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]);
  return out;
}

/**
 * How hard each kind of part is simplified: error (mm) and attribute weights. Plant leaves are small open strips (all
 * border), so they hardly simplify; letting the simplifier move borders (Permissive) turned leaves into sticks and
 * erased carpets, so plants are thinned by share instead (keepShare). Their colours and normals weigh little.
 */
export const THIN: Record<string, { err: number; wn: number; wuv: number; wc: number }> = {
  plants: { err: 0.5, wn: 0.02, wuv: 0, wc: 0.05 },
  other: { err: 0.5, wn: 0.25, wuv: 2, wc: 1 },
};
/**
 * If simplifying alone misses the budget, plants keep only a share of their pieces: parts with CARPET pieces or more
 * (carpets: blades) first, down to CARPET_MIN, then parts with LEAFY or more (stem plants: leaves), down to LEAF_MIN.
 */
export const CARPET = 1000, CARPET_MIN = 0.2, LEAFY = 40, LEAF_MIN = 0.15;

/**
 * Thin the parts to about `budget` triangles in all: meshoptimizer's simplifier per THIN (normals, uvs and colours
 * count in the error, so seams and colour changes hold); if that is not enough, plants keep only a share of their
 * blades and leaves (see CARPET). Returns the shares kept (1 = all).
 */
export async function thin(parts: { g: THREE.BufferGeometry; kind?: string }[], budget: number) {
  const { MeshoptSimplifier: M } = await import('meshoptimizer/simplifier');
  await M.ready;
  for (const p of parts) if (p.g.attributes.position.count > 1.5 * p.g.index!.count / 3) p.g = weld(p.g); // triangle soups
  const idx = parts.map(p => {
    const g = p.g, ix = new Uint32Array(g.index!.array), o = THIN[p.kind ?? ''] ?? THIN.other;
    if (ix.length / 3 < 64) return ix;
    const extra = [g.attributes.normal, g.attributes.uv, g.attributes.color].filter(Boolean) as THREE.BufferAttribute[];
    const w = extra.reduce((s, a) => s + a.itemSize, 0), attr = new Float32Array(g.attributes.position.count * w), weights: number[] = [];
    let k = 0;
    for (const a of extra) {
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) attr[i * w + k + c] = a.getComponent(i, c);
      for (let c = 0; c < a.itemSize; c++) weights.push(a === g.attributes.normal ? o.wn : a === g.attributes.uv ? o.wuv : o.wc);
      k += a.itemSize;
    }
    return M.simplifyWithAttributes(ix, floats(g.attributes.position, 3), 3, attr, w, weights, null, 0, o.err, ['ErrorAbsolute'])[0];
  });
  parts.forEach((p, i) => { p.g = compact(p.g, idx[i]); });
  const tris = (g: THREE.BufferGeometry) => g.index!.count / 3;
  const total = parts.reduce((s, p) => s + tris(p.g), 0);
  if (total <= budget) return { carpets: 1, leaves: 1 };
  // carpets (thousands of blades) give way first, down to CARPET_MIN; then the other leafy plants share what's left
  const plant = parts.filter(p => p.kind === 'plants').map(p => ({ p, n: new Set(pieces(p.g.index!.array, p.g.attributes.position.count)).size }));
  const carpets = plant.filter(x => x.n >= CARPET).map(x => x.p), leafy = plant.filter(x => x.n >= LEAFY && x.n < CARPET).map(x => x.p);
  const sum = (ps: { g: THREE.BufferGeometry }[]) => ps.reduce((s, p) => s + tris(p.g), 0);
  const ct = sum(carpets), lt = sum(leafy), rest = total - ct - lt;
  const fc = Math.max(CARPET_MIN, Math.min(1, (budget - rest - lt) / Math.max(1, ct)));
  const fl = Math.max(LEAF_MIN, Math.min(1, (budget - rest - ct * fc) / Math.max(1, lt)));
  for (const p of carpets) p.g = compact(p.g, keepShare(p.g, fc));
  if (fl < 1) for (const p of leafy) p.g = compact(p.g, keepShare(p.g, fl));
  return { carpets: +fc.toFixed(2), leaves: +fl.toFixed(2) };
}

/** The same surface seen from the other side: reversed winding, flipped normals. */
export function backFaces(g: THREE.BufferGeometry) {
  const b = g.clone(), idx = b.index!, n = b.attributes.normal;
  for (let i = 0; i < idx.count; i += 3) { const t = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, t); }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return b;
}

// ---------- vertex colours -> atlas ----------

export interface ColourPlane { mean: THREE.Vector3; a: THREE.Vector3; b: THREE.Vector3; s: [number, number]; t: [number, number]; err: number }

/** Top eigenvector of a symmetric 3x3 (power iteration). */
function topAxis(m: number[][], seed: THREE.Vector3) {
  const v = seed.clone();
  for (let k = 0; k < 40; k++) {
    const x = m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z, y = m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z, z = m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z;
    const l = Math.hypot(x, y, z);
    if (l < 1e-12) return v.set(0, 0, 0);
    v.set(x / l, y / l, z / l);
  }
  return v;
}

/**
 * The plane through a set of RGB colours that fits them best: colour ~ mean + s a + t b with s, t in the given
 * ranges. `err` is the largest distance of a colour from the plane (what the bake loses).
 */
export function colourPlane(cols: ArrayLike<number>, stride = 3): ColourPlane {
  const n = cols.length / stride, mean = new THREE.Vector3();
  for (let i = 0; i < n; i++) mean.x += cols[i * stride], mean.y += cols[i * stride + 1], mean.z += cols[i * stride + 2];
  mean.divideScalar(Math.max(1, n));
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], d = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    d[0] = cols[i * stride] - mean.x; d[1] = cols[i * stride + 1] - mean.y; d[2] = cols[i * stride + 2] - mean.z;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r][c] += d[r] * d[c];
  }
  const a = topAxis(C, new THREE.Vector3(0.58, 0.57, 0.58));
  const la = a.x * (C[0][0] * a.x + C[0][1] * a.y + C[0][2] * a.z) + a.y * (C[1][0] * a.x + C[1][1] * a.y + C[1][2] * a.z) + a.z * (C[2][0] * a.x + C[2][1] * a.y + C[2][2] * a.z);
  const D = C.map((row, r) => row.map((v, c) => v - la * a.getComponent(r) * a.getComponent(c)));
  const b = topAxis(D, new THREE.Vector3(0.7, -0.7, 0.1).sub(a.clone().multiplyScalar(a.dot(new THREE.Vector3(0.7, -0.7, 0.1)))));
  if (b.lengthSq() < 0.5) b.set(0, 0, 0); // a line (or a single colour): the plane collapses, still exact
  const s: [number, number] = [Infinity, -Infinity], t: [number, number] = [Infinity, -Infinity], v = new THREE.Vector3();
  let err = 0;
  for (let i = 0; i < n; i++) {
    v.set(cols[i * stride], cols[i * stride + 1], cols[i * stride + 2]).sub(mean);
    const ps = v.dot(a), pt = v.dot(b);
    s[0] = Math.min(s[0], ps); s[1] = Math.max(s[1], ps); t[0] = Math.min(t[0], pt); t[1] = Math.max(t[1], pt);
    err = Math.max(err, v.sub(a.clone().multiplyScalar(ps)).sub(b.clone().multiplyScalar(pt)).length());
  }
  if (!n) { s[0] = s[1] = t[0] = t[1] = 0; }
  return { mean, a, b, s, t, err };
}

/** Where a colour falls in its plane's tile, as (0..1, 0..1). */
export function planeST(pl: ColourPlane, r: number, g: number, b: number) {
  const v = new THREE.Vector3(r, g, b).sub(pl.mean), ds = pl.s[1] - pl.s[0], dt = pl.t[1] - pl.t[0];
  return [ds > 1e-9 ? (v.dot(pl.a) - pl.s[0]) / ds : 0.5, dt > 1e-9 ? (v.dot(pl.b) - pl.t[0]) / dt : 0.5];
}

/** The plane's colour at (s, t) in 0..1 (may lie outside: the padding extends the plane). */
export function planeAt(pl: ColourPlane, s: number, t: number, out = new THREE.Color()) {
  const ps = pl.s[0] + s * (pl.s[1] - pl.s[0]), pt = pl.t[0] + t * (pl.t[1] - pl.t[0]);
  const v = pl.mean.clone().addScaledVector(pl.a, ps).addScaledVector(pl.b, pt);
  return out.setRGB(THREE.MathUtils.clamp(v.x, 0, 1), THREE.MathUtils.clamp(v.y, 0, 1), THREE.MathUtils.clamp(v.z, 0, 1));
}

/** Atlas layout: tile k's pixel origin (top-left) in a square grid of `cols` tiles. */
export const tileOrigin = (k: number, cols: number) => [(k % cols) * TILE, Math.floor(k / cols) * TILE];

/** A colour's uv in the atlas (three's convention: v = 0 at the bottom of the image, flipY on). */
export function atlasUV(k: number, cols: number, s: number, t: number) {
  const W = cols * TILE, [x0, y0] = tileOrigin(k, cols), inner = TILE - 2 * PAD;
  return [(x0 + PAD + s * inner) / W, 1 - (y0 + PAD + t * inner) / W];
}

function drawAtlas(planes: ColourPlane[]) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(planes.length))), W = cols * TILE;
  const cv = document.createElement('canvas'); cv.width = cv.height = W;
  const g = cv.getContext('2d')!, img = g.createImageData(W, W), c = new THREE.Color(), inner = TILE - 2 * PAD;
  planes.forEach((pl, k) => {
    const [x0, y0] = tileOrigin(k, cols);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      planeAt(pl, (x + 0.5 - PAD) / inner, (y + 0.5 - PAD) / inner, c).convertLinearToSRGB();
      const o = ((y0 + y) * W + x0 + x) * 4;
      img.data[o] = Math.round(c.r * 255); img.data[o + 1] = Math.round(c.g * 255); img.data[o + 2] = Math.round(c.b * 255); img.data[o + 3] = 255;
    }
  });
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, cols };
}

// ---------- textures the exporter can't read ----------

const canvasCache = new WeakMap<THREE.Texture, THREE.Texture | null>();
/** A texture the exporter can draw (it takes images and canvases only); DataTextures are copied to a canvas. */
function drawable(t: THREE.Texture | null): THREE.Texture | null {
  if (!t) return null;
  const im = t.image as { data?: ArrayLike<number>; width: number; height: number } | undefined;
  if (!im || !im.data) return t;
  if (canvasCache.has(t)) return canvasCache.get(t)!;
  let out: THREE.Texture | null = null;
  if (im.data instanceof Uint8Array || im.data instanceof Uint8ClampedArray) {
    const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d')!, img = g.createImageData(im.width, im.height), px = im.width * im.height;
    const ch = im.data.length / px;
    for (let i = 0; i < px; i++) for (let k = 0; k < 4; k++) img.data[i * 4 + k] = k < ch ? im.data[i * ch + k] : k === 3 ? 255 : im.data[i * ch];
    g.putImageData(img, 0, 0);
    out = new THREE.CanvasTexture(cv); out.colorSpace = t.colorSpace; out.flipY = !t.flipY; // DataTextures aren't flipped; canvases are
    out.wrapS = t.wrapS; out.wrapT = t.wrapT; out.repeat.copy(t.repeat); out.offset.copy(t.offset);
  }
  canvasCache.set(t, out);
  return out;
}

/** A copy of a texture with its alpha scaled (Quick Look takes a transparent map's opacity from its alpha only). */
const alphaCache = new Map<string, THREE.Texture>();
function fadedTexture(t: THREE.Texture, k: number) {
  const key = t.uuid + '|' + k.toFixed(3);
  let f = alphaCache.get(key);
  if (f) return f;
  const im = t.image as CanvasImageSource & { width: number; height: number };
  const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
  const g = cv.getContext('2d')!; g.globalAlpha = k; g.drawImage(im, 0, 0);
  f = new THREE.CanvasTexture(cv); f.colorSpace = t.colorSpace; f.flipY = t.flipY; f.wrapS = t.wrapS; f.wrapT = t.wrapT; f.repeat.copy(t.repeat); f.offset.copy(t.offset);
  alphaCache.set(key, f);
  if (alphaCache.size > 64) alphaCache.delete(alphaCache.keys().next().value!);
  return f;
}

// ---------- the export ----------

export interface UsdzStats { meshes: number; trisIn: number; tris: number; materials: number; bakeErr: number; share: { carpets: number; leaves: number }; byKind: Record<string, number>; steps?: Record<string, number>; ms: number; bytes: number }

/** Objects left out of the export, with their subtrees (lane Q's prepScene list). */
export function droppedObjects(vp: Pick<Viewport, 'scene' | 'dotMeshes'>) {
  return new Set<THREE.Object3D>([...roomObjects(vp.scene!), ...(vp.dotMeshes ?? [])]);
}

/** Build the plain, merged, metre-scale copy of a viewport's tank, ready for the USDZ exporter. */
export async function usdzScene(vp: Viewport, budget = BUDGET) {
  const sc = vp.scene!, drop = droppedObjects(vp);
  sc.updateMatrixWorld(true);
  let parts: { g: THREE.BufferGeometry; s: Spec; plane?: number; kind: string }[] = [];
  const planes: ColourPlane[] = [];
  let meshes = 0, trisIn = 0;
  const add = (mesh: THREE.Mesh) => {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material], src = cpuGeometry(mesh);
    const groups = Array.isArray(mesh.material) && src.groups.length ? src.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
    for (const gr of groups) {
      const m = mats[gr.materialIndex ?? 0];
      const vc = !!(m && (m as THREE.MeshBasicMaterial).vertexColors && src.attributes.color);
      const s = m && specOf(m, vc, mesh.userData);
      if (!s) continue;
      s.map = drawable(s.map);
      const g = worldPart(mesh, gr.start, gr.count, !!s.map, vc);
      if (m.clippingPlanes?.length) clipTriangles(g, m.clippingPlanes);
      const n = g.index!.count / 3;
      if (!n) continue;
      meshes++; trisIn += n;
      const col = g.attributes.color;
      if (col && !s.bake) { // a map carries the colour: keep the vertex colours' mean as a tint
        const mean = colourPlane(col.array, col.itemSize).mean;
        s.color.multiply(new THREE.Color(mean.x, mean.y, mean.z)); g.deleteAttribute('color');
      } else if (col) { // the colours to bake, material colour included (RGB only)
        const a = new Float32Array(col.count * 3);
        for (let i = 0; i < col.count; i++) a.set([col.getX(i) * s.color.r, col.getY(i) * s.color.g, col.getZ(i) * s.color.b], i * 3);
        g.setAttribute('color', new THREE.BufferAttribute(a, 3)); s.color.setRGB(1, 1, 1);
      }
      if (s.map && s.transparent && s.opacity < 1) { s.map = fadedTexture(s.map, s.opacity); s.opacity = 1; }
      const u = m.userData ?? {};
      if (u.solid) smoothNormals(g);
      parts.push({ g, s, kind: u.fish || u.fishCard ? 'animals' : u.plantClip ? 'plants' : u.solid ? 'hardscape' : 'tank' });
    }
  };
  const walk = (o: THREE.Object3D) => {
    if (!o.visible || drop.has(o) || o.userData.capPass) return; // (the glass cap's passes: render/items.ts capPasses)
    if ((o as THREE.Mesh).isMesh) add(o as THREE.Mesh);
    for (const c of o.children) walk(c);
  };
  walk(sc);
  if (import.meta.env?.DEV) (globalThis as { __usdzParts?: unknown }).__usdzParts = parts.map(p => ({ ...p, g0: p.g }));
  const share = await thin(parts, budget), byKind: Record<string, number> = {};
  for (const p of parts) byKind[p.kind] = (byKind[p.kind] ?? 0) + p.g.index!.count / 3;
  parts = parts.flatMap(p => {
    if (p.s.bake && p.g.attributes.color) { p.plane = planes.length; planes.push(colourPlane(p.g.attributes.color.array)); }
    return p.s.double ? [p, { ...p, g: backFaces(p.g) }] : [p];
  });

  // atlas uvs for the baked parts
  const atlas = planes.length ? drawAtlas(planes) : null;
  for (const p of parts) {
    if (p.plane === undefined || !atlas) continue;
    const col = p.g.attributes.color, uv = new Float32Array(col.count * 2), pl = planes[p.plane];
    for (let i = 0; i < col.count; i++) {
      const [s, t] = planeST(pl, col.getX(i), col.getY(i), col.getZ(i));
      uv.set(atlasUV(p.plane, atlas.cols, s, t), i * 2);
    }
    p.g = p.g.clone(); p.g.deleteAttribute('color'); p.g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    p.s = { ...p.s, map: atlas.tex };
  }

  // merge per material, in metres around the base centre
  const root = rootMatrix(baseCentre(vp.S, vp.T)), byKey = new Map<string, { s: Spec; gs: THREE.BufferGeometry[] }>();
  for (const p of parts) {
    const k = specKey(p.s);
    let e = byKey.get(k);
    if (!e) byKey.set(k, (e = { s: p.s, gs: [] }));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', p.g.attributes.position); g.setAttribute('normal', p.g.attributes.normal);
    if (p.s.map) g.setAttribute('uv', p.g.attributes.uv);
    g.setIndex(p.g.index);
    e.gs.push(g);
  }
  const out = new THREE.Scene();
  let tris = 0, bakeErr = 0;
  for (const pl of planes) bakeErr = Math.max(bakeErr, pl.err);
  for (const { s, gs } of byKey.values()) {
    const g = (gs.length > 1 ? mergeGeometries(gs) : gs[0].clone())!;
    g.applyMatrix4(root); roundGeometry(g);
    tris += g.index!.count / 3;
    const m = new THREE.MeshStandardMaterial({ color: s.color, map: s.map, opacity: s.opacity, transparent: s.transparent, alphaTest: s.alphaTest, roughness: s.roughness, metalness: 0 });
    if (s.emissive) m.emissive.copy(s.color);
    const mesh = new THREE.Mesh(g, m);
    if (s.transparent) mesh.renderOrder = 1;
    out.add(mesh);
  }
  out.updateMatrixWorld(true);
  return { scene: out, stats: { meshes, trisIn: Math.round(trisIn), tris: Math.round(tris), materials: byKey.size, bakeErr, share, byKind } };
}

/** Decimals kept in the geometry files: points (m; 4 = 0.1 mm), normals, uvs. */
export const DIGITS = { points: 4, normals: 2, st: 4 };

/** Round a geometry's points, normals and uvs to DIGITS (the exporter then prints them with trailing zeros: trimUsda). */
export function roundGeometry(g: THREE.BufferGeometry) {
  for (const [k, d] of [['position', DIGITS.points], ['normal', DIGITS.normals], ['uv', DIGITS.st]] as const) {
    const a = g.attributes[k]?.array as Float32Array | undefined, m = 10 ** d;
    if (a) for (let i = 0; i < a.length; i++) a[i] = Math.round(a[i] * m) / m || 0;
  }
}

/**
 * Drop the trailing zeros the exporter prints (7 significant digits) from numbers ending at "," or ")":
 * "0.1235000" -> "0.1235", "1.000000" -> "1", "-0.000000" -> "0". Integers (indices) have no point and stay.
 */
export const trimUsda = (text: string) => text.replace(/(\.\d*?[1-9])0+(?=[,)])/g, '$1').replace(/\.0+(?=[,)])/g, '').replace(/(?<=[(\s])-0(?=[,)])/g, '0');

/**
 * Pack files as a USDZ: a stored (uncompressed) zip whose file data each start on a 64-byte boundary, the padding in
 * each local header's extra field (zip local header = 30 bytes + name + extra; the extra field = 4 bytes + data).
 */
export async function packUsdz(files: Record<string, Uint8Array>) {
  const { zipSync } = await import('three/examples/jsm/libs/fflate.module.js');
  const out: Record<string, [Uint8Array, { extra: Record<number, Uint8Array> }]> = {};
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const base = offset + 30 + new TextEncoder().encode(name).length + 4, pad = (64 - (base % 64)) % 64;
    out[name] = [data, { extra: { 12345: new Uint8Array(pad) } }];
    offset = base + pad + data.length;
  }
  return zipSync(out, { level: 0 });
}

/** Trim the geometry files of a .usdz (see trimUsda) and pack it again; model.usda stays first (Quick Look reads it first). */
async function trimUsdz(bytes: Uint8Array) {
  const { unzipSync, strFromU8, strToU8 } = await import('three/examples/jsm/libs/fflate.module.js');
  const files = unzipSync(bytes);
  for (const name of Object.keys(files)) if (name.startsWith('geometries/')) files[name] = strToU8(trimUsda(strFromU8(files[name])));
  return packUsdz(files);
}

/**
 * Run `f` with canvas.toBlob encoding synchronously (toDataURL). Chromium encodes toBlob in idle time, so during a
 * busy export each texture waited ~1 s; the exporter calls toBlob once per texture.
 */
async function withSyncToBlob<T>(f: () => Promise<T>) {
  const proto = HTMLCanvasElement.prototype, own = proto.toBlob;
  proto.toBlob = function (this: HTMLCanvasElement, cb: BlobCallback, type?: string, q?: number) {
    const url = this.toDataURL(type, q), bin = atob(url.slice(url.indexOf(',') + 1)), a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    cb(new Blob([a], { type: type ?? 'image/png' }));
  };
  try { return await f(); } finally { proto.toBlob = own; }
}

/** Export a viewport's tank as a .usdz Blob (three's USDZExporter, loaded on demand). */
export async function exportUSDZ(vp: Viewport, budget = BUDGET): Promise<{ blob: Blob; stats: UsdzStats }> {
  const t0 = performance.now();
  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
  const t1 = performance.now(), { scene, stats } = await usdzScene(vp, budget), t2 = performance.now();
  const raw = await withSyncToBlob(() => new USDZExporter().parseAsync(scene, { quickLookCompatible: true, maxTextureSize: TEX_MAX })), t3 = performance.now();
  const bytes = await trimUsdz(raw), steps = { load: t1 - t0, scene: t2 - t1, usdz: t3 - t2, trim: performance.now() - t3 };
  for (const o of scene.children) { const m = o as THREE.Mesh; m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'model/vnd.usdz+zip' });
  return { blob, stats: { ...stats, ms: Math.round(performance.now() - t0), steps: Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, Math.round(v)])), bytes: blob.size } };
}
