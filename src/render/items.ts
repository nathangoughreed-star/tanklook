// Meshes for aquascape items (scene/items.ts). Stones, wood and caves are real 3D, shaded per vertex (a top-front-left
// light baked in, like the hood and substrate); plants are real 3D from their `PLANT3D` entry (render/plant3d.ts).
// Each item is ONE mesh, so picking and the selection box are simple. Shapes are cached by (variant, seed, size) and the
// baked colours by turn as well: the scene rebuilds on every drag step.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { PLANT3D, growthOf, isCarpet, isFloat, isVine, type PlantType } from '../art/plants';
import { CARPET_W, SHELLS, itemDims, itemSink, seatHook, stoneDims, woodLimbs, type Limb } from '../scene/items';
import { turnOut, type AnchorProbe, type V3 } from '../scene/anchors';
import { lampHeight } from '../scene/lightout';
import { D2R, waterY } from '../scene/physics';
import { bowlDims, footprint, shapeOf } from '../scene/shape';
import { clampGround, groundHeight, groundInsideBy } from '../scene/terrain';
import type { Item, Tank, TankSetup } from '../scene/types';
import { bendPlant, carpetOnGround, clumpOnGround, dropPlant, growShader, grownView, plant3d, plantGeometry, plantRaycast, revealPlant, unpackGeometry, uploadPlant, type JobOut, type PlantJob } from './plant3d';
import { reefShape } from './coral3d';
import { CELL_N, NOISE_N, gritUniforms } from './gritTex';

type R = () => number;
const LIGHT = new THREE.Vector3(-0.35, 1, 0.55).normalize();
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const C = (hex: string) => new THREE.Color(hex);

/** Smooth pseudo-noise from a few random plane waves (enough for stones and bark; no texture needed). */
export function waves(r: R, n = 6) {
  const w = Array.from({ length: n }, () => ({ d: V(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(1 + r() * 3), ph: r() * 6.28 }));
  return (p: THREE.Vector3) => w.reduce((a, q) => a + Math.sin(p.dot(q.d) + q.ph), 0) / n;
}

/** Set the unlit colour per vertex (stored in 'color'; bake() multiplies the light in). */
export function paint(g: THREE.BufferGeometry, col: (p: THREE.Vector3, i: number) => THREE.Color) {
  const p = g.attributes.position, out = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { const c = col(v.fromBufferAttribute(p, i), i); out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g;
}
const shade = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);

/** Flip a geometry inside out (the inner wall of a cave). */
function inward(g: THREE.BufferGeometry) {
  const idx = g.index!;
  for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); }
  g.computeVertexNormals();
  return g;
}
/** Keep only position, normal, colour and grit, all indexed or all not, so pieces merge. */
export function clean(g: THREE.BufferGeometry, indexed: boolean) {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'aGrit'].includes(k)) g.deleteAttribute(k);
  return indexed ? g : g.index ? g.toNonIndexed() : g;
}

// ---------- Surface grit ----------
// Every solid carries aGrit = (noise coordinates in mm, kind); the shader (GRIT) draws the fine detail per pixel from it:
// grain, pits and cracks on stone, grain, splits and knots on wood. Kinds: 1 river, 2 seiryu / arch, 3 dragon, 4 lava,
// 5 slate, 6 bark (coordinates = along the limb, angle around, radius), 7 terracotta, 8 coconut, 9 end grain, 10 plain wood,
// 11 hard coral (corallite dots), 12 soft coral tissue (polyp fuzz); the reef pieces (render/coral3d.ts) set their own.
const GRIT_KIND: Record<string, number> = { river: 1, seiryu: 2, dragon: 3, lava: 4, slate: 5, ledge: 2, tube: 7, coconut: 8, arch: 2, dish: 7, stonedish: 2 };
const gritOffset = (seed: number) => [0.6180339, 0.4142135, 0.7320508].map((k, i) => ((seed * k + i * 0.37) % 1) * 400);
/** aGrit from the vertex positions (shifted per seed so no two pieces share a pattern); left alone if already set. */
export function grit(g: THREE.BufferGeometry, kind: number, seed: number) {
  if (g.attributes.aGrit) return g;
  const p = g.attributes.position, o = gritOffset(seed), a = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) { a[i * 4] = p.getX(i) + o[0]; a[i * 4 + 1] = p.getY(i) + o[1]; a[i * 4 + 2] = p.getZ(i) + o[2]; a[i * 4 + 3] = kind; }
  g.setAttribute('aGrit', new THREE.BufferAttribute(a, 4));
  return g;
}

// ---------- Stones ----------
const STONE: Record<string, string[]> = {
  river: ['#8a8378', '#9a9184', '#6e6a64', '#a89f90', '#7c7466', '#5f5c58'],
  seiryu: ['#6f7377', '#7d8084', '#62666b'],
  dragon: ['#8b6b4a', '#7d6248', '#94785a'],
  lava: ['#5a2f28', '#4a2b26', '#63362b'],
  slate: ['#4c5058', '#55534f', '#4a4d52'],
  ledge: ['#7e7262', '#8a7d6a', '#736a5e'], // weathered sandstone
};
function stoneShape(variant: string, seed: number, size: number) {
  const r = rng(seed), [l, h, w] = stoneDims(variant, seed, size), base = C(STONE[variant][Math.floor(r() * STONE[variant].length)]);
  if (variant === 'slate' || variant === 'ledge') return slab(r, l, h, w, base, variant === 'ledge');
  const angular = variant !== 'river', crag = variant === 'seiryu';
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, crag ? 3 : 4);
  const nz = waves(r), fine = waves(r, 8), p = g.attributes.position, v = new THREE.Vector3(), cut = -0.55;
  const top = crag ? 1.25 : 1, hk = h / (top - cut), dent = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let k = 1 + (variant === 'river' ? 0.06 : 0.2) * nz(v.clone().multiplyScalar(angular ? 1.7 : 1.1));
    if (variant === 'dragon') k -= 0.2 * Math.max(0, fine(v.clone().multiplyScalar(5)) - 0.12); // pits and holes
    if (variant === 'lava') k += 0.08 * fine(v.clone().multiplyScalar(9)) - 0.1 * Math.max(0, nz(v.clone().multiplyScalar(14)) - 0.2);
    dent[i] = k;
    v.multiplyScalar(k);
    if (crag) v.y += 0.25 * Math.max(0, v.y); // taller, more upright crags
    p.setXYZ(i, v.x * l / 2, (Math.max(v.y, cut) - cut) * hk, v.z * w / 2);
  }
  if (crag) g.rotateZ((r() - 0.5) * 0.3);
  if (!angular) { g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g); } // smooth normals; others keep flat facets
  g.computeVertexNormals();
  const mot = waves(r, 5), vein = waves(r, 3);
  return paint(g, (q, i) => {
    let k = 1 + 0.16 * mot(q.clone().multiplyScalar(0.06));
    if (variant === 'dragon' || variant === 'lava') k *= 0.55 + 0.45 * Math.min(1, Math.max(0, (dent[i] - 0.8) / 0.25)); // dark crevices
    const c = shade(base, k);
    if (crag && Math.abs(Math.sin(q.y * 0.11 + 4 * vein(q.clone().multiplyScalar(0.02)))) < 0.06) c.lerp(C('#d9dcd8'), 0.55); // calcite veins
    return c;
  });
}
/** Slate: a slab with chipped edges and layered bands. */
function slab(r: R, l: number, h: number, w: number, base: THREE.Color, level = false) {
  const g = new THREE.BoxGeometry(1, 1, 1, level ? 12 : 6, level ? 6 : 3, level ? 10 : 5), nz = waves(r), p = g.attributes.position, v = new THREE.Vector3();
  // a ledge (lane CP, Nathan 2026-10-16): each one draws how worn it is, wv (0 = fractured: flat facets, chipped rim, sharp
  // corners; 1 = weathered: rolled corners and rim, smooth faces), how irregular it is, nv (0.05 = near a clean block), and
  // how much its sides lean and swell, so no two ledges look alike. A ledge keeps a top flat enough to sit on.
  const wv = level ? r() : 0, nv = level ? 0.05 + 0.2 * r() : 0.12, lk = level ? 0.1 + 0.35 * r() : 0;
  const lean = level ? [(r() - 0.5) * lk, (r() - 0.5) * lk, (0.04 + r() * 0.2) * lk * 2, (r() - 0.5) * 0.1, (r() - 0.5) * 0.08] : [0, 0, 0, 0, 0];
  const soft = level ? waves(r, 2) : () => 0, chip = level ? waves(r, 9) : () => 0, coarse = level ? waves(r, 3) : () => 0;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const e = nz(v.clone().multiplyScalar(3.2)), ax = Math.abs(v.x) * 2, az = Math.abs(v.z) * 2, edge = Math.max(ax, az); // 1 at the rim
    const yy = v.y + 0.5, tp = level ? 1 - lean[2] * yy : 1, k = nv;
    let x = v.x * tp * (1 + k * e) + lean[0] * yy * 0.5, z = v.z * tp * (1 + k * nz(v.clone().addScalar(3).multiplyScalar(2.6))) + lean[1] * yy * 0.5;
    let y = yy * (v.y > 0 ? (level ? 1 + 0.04 * soft(v.clone().multiplyScalar(2)) + lean[3] * v.x + lean[4] * v.z : 1 - 0.25 * Math.max(0, edge - 0.6) + 0.06 * e) : 1);
    if (level) {
      const fr = 1 - wv, roll = Math.max(0, edge - 0.7) / 0.3, mid = Math.sin(Math.PI * Math.min(1, Math.max(0, yy)));
      // fractured: a chipped, ragged rim
      if (edge > 0.6 && fr > 0.05) {
        const c = 0.07 * fr * (edge - 0.6) * (chip(v.clone().multiplyScalar(7)) + 0.6 * coarse(v.clone().multiplyScalar(2)));
        x += v.x * c * 2; z += v.z * c * 2;
        if (v.y > 0) y *= 1 - 0.3 * fr * Math.max(0, edge - 0.72) * (0.55 + 0.9 * Math.abs(chip(v.clone().multiplyScalar(5)))) + c * 0.6;
      }
      // weathered: the middle swells, the corners and the top rim roll over
      const corner = ax * az;
      x *= 1 + 0.06 * wv * mid; z *= 1 + 0.06 * wv * mid;
      x *= 1 - 0.2 * wv * corner * corner * corner; z *= 1 - 0.2 * wv * corner * corner * corner;
      if (v.y > 0) { const f = wv * roll * roll; x *= 1 - 0.1 * f; z *= 1 - 0.1 * f; y *= 1 - 0.12 * f; }
    }
    p.setXYZ(i, x * l, y * h, z * w);
  }
  let ng = clean(g, false) as THREE.BufferGeometry;
  if (level && wv > 0.5) { ng.deleteAttribute('normal'); ng.deleteAttribute('uv'); ng = mergeVertices(ng); } // smooth, worn faces
  ng.computeVertexNormals();
  return paint(ng, q => shade(base, 1 + 0.1 * Math.sin(q.y / h * 22 + q.x * 0.01) + 0.06 * Math.sin(q.x * 0.05 + q.z * 0.07)));
}

// ---------- Wood ----------
const WOOD: Record<string, [string, string]> = { climb: ['#8d8170', '#7a6e60'], branch: ['#6b4a2e', '#5e4128'], spider: ['#a3845e', '#8e7050'], manzanita: ['#74392a', '#8b4a36'], mopani: ['#3e2a1c', '#a3855c'] };
/** Limb radius at t: linear taper, a flared root on thick limbs, and the last 14% rounding off into a worn tip (no flat cut). */
function tipRad(L: Limb, t: number) {
  const flare = L.r0 > 6 ? 1 + 0.3 * Math.pow(1 - t, 4) : 1, e = Math.max(0, (t - 0.86) / 0.14);
  return (L.r0 + (L.r1 - L.r0) * t) * flare * (1 - 0.62 * e * e);
}
function limbGeo(r: R, rs: R, L: Limb, cols: [string, string], variant: string, s0: number) {
  const curve = new THREE.CatmullRomCurve3(L.pts.map(p => V(...p))), len = curve.getLength(), TS = Math.max(8, Math.min(48, Math.round(len / Math.max(4, L.r0)))), RS = L.r0 > 6 ? 10 : 7;
  const g = new THREE.TubeGeometry(curve, TS, 1, RS, false), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), knot = r() * 10;
  for (let i = 0; i <= TS; i++) {
    const t = i / TS; curve.getPointAt(t, c);
    const rad = tipRad(L, t) * (1 + 0.1 * Math.sin(t * 19 + knot));
    for (let j = 0; j <= RS; j++) { const k = i * (RS + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(rad * (1 + 0.07 * Math.sin(j * 2.3 + i * 0.7))).add(c); p.setXYZ(k, v.x, v.y, v.z); }
  }
  g.computeVertexNormals();
  const ga = new Float32Array(p.count * 4);
  for (let i = 0; i <= TS; i++) for (let j = 0; j <= RS; j++) ga.set([s0 + i / TS * len, j / RS * Math.PI * 2, L.r0 + (L.r1 - L.r0) * i / TS, 6], (i * (RS + 1) + j) * 4);
  g.setAttribute('aGrit', new THREE.BufferAttribute(ga, 4));
  const base = C(cols[L.tone]), light = C(cols[1]), patch = waves(r, 4);
  paint(g, (q, i) => {
    const j = i % (RS + 1), grain = 1 + 0.16 * Math.sin(j * 2.9 + knot) + 0.06 * Math.sin(i * 0.37);
    if (variant === 'mopani') return base.clone().lerp(light, Math.min(1, Math.max(0, patch(q.clone().multiplyScalar(0.025)) * 2.2 + 0.35))).multiplyScalar(grain); // two-tone
    return shade(base, grain);
  });
  const parts = [clean(g, true)];
  for (const [t, rad] of [[0, tipRad(L, 0)], [1, tipRad(L, 1)]] as const) {
    const s = new THREE.SphereGeometry(rad * 1.02, RS, 6); s.translate(...curve.getPointAt(t).toArray() as [number, number, number]);
    parts.push(clean(grit(paint(s, () => shade(base, t ? 1.0 : 1.08)), 10, s0), true));
  }
  // broken-off side branches: short stubs with a dark, ringed end (0-2 on a limb thick enough to show them)
  const n = L.r0 < 2.5 ? 0 : Math.floor(rs() * 2.6), up = V(0, 1, 0);
  for (let k = 0; k < n; k++) {
    const t = 0.15 + rs() * 0.6, c0 = curve.getPointAt(t), tan = curve.getTangentAt(t), rad = L.r0 + (L.r1 - L.r0) * t;
    const b1 = tan.clone().cross(Math.abs(tan.y) < 0.9 ? up : V(1, 0, 0)).normalize(), b2 = tan.clone().cross(b1), a = rs() * Math.PI * 2;
    const dir = b1.multiplyScalar(Math.cos(a)).add(b2.multiplyScalar(Math.sin(a))).addScaledVector(tan, rs() * 0.8).normalize();
    const sr = rad * (0.35 + rs() * 0.2), sl = rad * (1.5 + rs() * 0.9), st = new THREE.CylinderGeometry(sr * 0.8, sr, sl, Math.max(6, RS - 2), 1).translate(0, sl / 2, 0);
    const sp = st.attributes.position, sn = st.attributes.normal, sa = new Float32Array(sp.count * 4), off = s0 + 500 + k * 97;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i);
      sa.set(sn.getY(i) > 0.9 ? [x, z, 0, 9] : [off + y, Math.atan2(z, x) + Math.PI, sr, 6], i * 4);
    }
    st.setAttribute('aGrit', new THREE.BufferAttribute(sa, 4));
    paint(st, q => shade(base, q.y > sl - 0.01 ? 0.8 : 1));
    st.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir)).translate(c0.x, c0.y, c0.z);
    parts.push(clean(st, true));
  }
  return mergeGeometries(parts)!;
}
function woodShape(variant: string, seed: number, size: number) {
  if (variant in SHELLS) return shellShape(variant, seed, size);
  const r = rng(seed * 13 + 5), rs = rng(seed * 29 + 1), o = gritOffset(seed)[0];
  return mergeGeometries(woodLimbs(variant, seed, size).map((L, i) => limbGeo(r, rs, L, WOOD[variant] ?? WOOD.branch, variant, o + i * 977)))!;
}

// ---------- Bark shells: cork flat, cork tube, half-log hide ----------
// Lying along x (scene/items.ts SHELLS). Bark outside: thick plates between furrows that run along the length; plain
// wood (a flat, the log) or a dark hollow (the tube) inside; the cut ends in end grain; a flat's long edges broken.
const SHELL_LOOK: Record<string, { bark: [string, string, string]; inner: string; end: string; deep: number; plate: number }> = {
  corkflat: { bark: ['#241911', '#5e4733', '#8f7656'], inner: '#8a6a4a', end: '#9a7a58', deep: 0.045, plate: 9 },
  corktube: { bark: ['#241911', '#5e4733', '#8f7656'], inner: '#3e2c1f', end: '#9a7a58', deep: 0.04, plate: 9 },
  halflog: { bark: ['#2a2019', '#4f3e2e', '#6f5b45'], inner: '#b39670', end: '#bf9f76', deep: 0.025, plate: 6 },
};
function shellShape(variant: string, seed: number, size: number) {
  const r = rng(seed * 19 + 5), { R, arc, t } = SHELLS[variant], L = SHELL_LOOK[variant], s = size, full = arc >= 2 * Math.PI;
  const Ro = R * s, Ri = (R - t) * s, a = Math.min(arc, 2 * Math.PI) / 2, cy = full ? Ro : -Ro * Math.cos(a);
  // rows every ~3 mm round the bark (its plates must not alias into a sawtooth), ~6 mm along it
  const NX = Math.max(16, Math.min(96, Math.round(s / 6))), NT = Math.max(24, Math.min(160, Math.round(arc * Ro / 3)));
  const furrow = waves(r, 7), knob = waves(r, 5), rag = waves(r, 4), wob = waves(r, 4), deep = L.deep * s, pl = L.plate;
  // bark relief 0 (furrow) .. 1 (plate top) on the cylinder: ridged noise, stretched along the length
  const relief = (th: number, x: number) => {
    const q = V(Math.cos(th) * Ro / (pl * 1.8), Math.sin(th) * Ro / (pl * 1.8), x / (pl * 9));
    const f = Math.abs(furrow(q) + 0.45 * furrow(q.clone().multiplyScalar(2.1).addScalar(4)) + 0.2 * furrow(V(q.x * 5, q.y * 5, x / pl)));
    return Math.min(1, Math.max(0, (f - 0.05) / 0.18)) ** 0.6; // flat-topped plates, narrow deep furrows
  };
  // ragged ends (and a flat's long edges): the grid's edges pulled in a little by noise
  const xEnd = (th: number, side: number) => side * s / 2 * (1 - 0.04 * (1 + rag(V(Math.cos(th) * 3, Math.sin(th) * 3, side * 5))));
  const thEdge = (x: number, side: number) => side * a * (1 - 0.05 * (1 + rag(V(x / (s * 0.25), side * 7, 1))));
  const grid = (outer: boolean) => {
    const pos: number[] = [], col: number[] = [], gr: number[] = [], idx: number[] = [];
    const [c0, c1, c2] = L.bark.map(C), inner = C(L.inner), c = new THREE.Color();
    for (let i = 0; i <= NX; i++) for (let j = 0; j <= NT; j++) {
      const u = i / NX, v = j / NT, xm = (u - 0.5) * s;
      const th = full ? (v - 0.5) * 2 * Math.PI : thEdge(xm, -1) + (thEdge(xm, 1) - thEdge(xm, -1)) * v;
      const x = xEnd(th, -1) + (xEnd(th, 1) - xEnd(th, -1)) * u;
      const h = relief(th, x), k = 0.5 + 0.5 * knob(V(Math.cos(th) * Ro / 18, Math.sin(th) * Ro / 18, x / 25));
      const rad = outer ? Ro - deep * (1 - h) + deep * 0.12 * h * k : Ri + 0.012 * s * wob(V(Math.cos(th) * 2, Math.sin(th) * 2, x / (s * 0.15)));
      const y = cy + rad * Math.cos(th), z = rad * Math.sin(th);
      pos.push(x, y, z); gr.push(x, y, z, 10);
      if (outer) c.copy(c0).lerp(c1, Math.min(1, h * h * 1.6)).lerp(c2, Math.max(0, Math.min(0.55, (h * (0.4 + k) - 0.55) * 1.6)));
      else c.copy(inner).multiplyScalar(0.9 + 0.2 * k);
      col.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NT; j++) { const p0 = i * (NT + 1) + j, p1 = p0 + NT + 1; idx.push(p0, p0 + 1, p1, p1, p0 + 1, p1 + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aGrit', new THREE.Float32BufferAttribute(gr, 4)); g.setIndex(idx); g.computeVertexNormals();
    // winding: the outer skin faces away from the axis, the inner one toward it
    const P = g.attributes.position, N = g.attributes.normal, m = (NX >> 1) * (NT + 1) + (NT >> 1);
    if (((P.getY(m) - cy) * N.getY(m) + P.getZ(m) * N.getZ(m) > 0) !== outer) {
      for (let q = 0; q < idx.length; q += 3) [idx[q + 1], idx[q + 2]] = [idx[q + 2], idx[q + 1]];
      g.setIndex(idx); g.computeVertexNormals();
    }
    return { g, pos };
  };
  const o = grid(true), i = grid(false);
  // the rims joining outer and inner skins: the two cut ends (end grain) and a flat's long broken edges
  const rim: number[] = [], rimGr: number[] = [], rimCol: number[] = [], endC = C(L.end);
  const at = (q: number[], k: number) => [q[k * 3], q[k * 3 + 1], q[k * 3 + 2]];
  const strip = (ks: number[], end: boolean) => {
    for (let n = 0; n + 1 < ks.length; n++) {
      const A = at(o.pos, ks[n]), B = at(o.pos, ks[n + 1]), Ci = at(i.pos, ks[n]), Di = at(i.pos, ks[n + 1]), k = end ? 1 : 0.62;
      for (const v of [A, Ci, B, B, Ci, Di, A, B, Ci, B, Di, Ci]) { // both windings: it faces whichever way it is seen
        rim.push(...v); rimGr.push(...(end ? [v[1] - cy, v[2], 0, 9] : [v[0], v[1], v[2], 10])); rimCol.push(endC.r * k, endC.g * k, endC.b * k);
      }
    }
  };
  const ring = (i0: number) => Array.from({ length: NT + 1 }, (_, j) => i0 * (NT + 1) + j);
  strip(ring(0), true); strip(ring(NX), true);
  if (!full) for (const j of [0, NT]) strip(Array.from({ length: NX + 1 }, (_, k) => k * (NT + 1) + j), false);
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(rimCol, 3));
  rg.setAttribute('aGrit', new THREE.Float32BufferAttribute(rimGr, 4)); rg.computeVertexNormals();
  return mergeGeometries([o.g.toNonIndexed(), i.g.toNonIndexed(), rg])!;
}

// ---------- Caves ----------
/** A shallow water / feeding dish, lathed: wall, rolled rim, floor, and a clear slightly blue water surface (a darker
 *  ring at the wall where it climbs in a meniscus, a pale line at the rim of the water). Width = s, height 0.2 s. */
function dishShape(variant: string, seed: number, s: number) {
  const r = rng(seed * 5 + 3), stone = variant === 'stonedish', R = s / 2, H = 0.2 * s, wall = Math.max(1.6, 0.045 * s), nz = waves(r, 4);
  const body = stone ? [C('#7d8084'), C('#9a9c9c')] : [C('#c9633c'), C('#e8e0cf')], inner = stone ? C('#8f9296') : C('#efe8d8'), glaze = stone ? C('#8c8f92') : C('#35607a');
  const level = 0.84 * H, floorY = 0.1 * H, parts: THREE.BufferGeometry[] = [];
  const lathe = (pts: [number, number][], col: (q: THREE.Vector3) => THREE.Color, flip: boolean) => {
    let g: THREE.BufferGeometry = new THREE.LatheGeometry(pts.map(q => new THREE.Vector2(q[0], q[1])), 48);
    if (flip) g = inward(g); else g.computeVertexNormals();
    return paint(clean(g, true), col);
  };
  const out: [number, number][] = [[0.001, 0], [R * 0.55, 0], [R * 0.8, 0.05 * H], [R * 0.96, 0.4 * H], [R, 0.9 * H], [R * 0.985, H]];
  const rim: [number, number][] = [[R * 0.985, H], [R - wall * 0.5, H * 1.03], [R - wall, H]];
  const inn: [number, number][] = [[R - wall, H], [R - wall * 1.6, 0.8 * H], [R * 0.78, 0.35 * H], [R * 0.5, floorY], [0.001, floorY]];
  parts.push(lathe(out, q => shade(body[0].clone().lerp(body[1], stone ? 0.1 + 0.2 * nz(q.clone().multiplyScalar(0.05)) : Math.max(0, q.y / H - 0.7) * 3), 1 + 0.06 * nz(q.clone().multiplyScalar(0.08))), false));
  parts.push(lathe(rim, () => shade(body[1], 0.95), false));
  parts.push(lathe(inn, q => shade(stone ? inner : glaze.clone().lerp(inner, 0.35), q.y > level ? 1.15 : 0.85), true));
  // the water: a flat disc, clear blue-green over the pale floor, brighter ring at the edge (the meniscus line)
  const rw = R - wall * 1.6 - (H * 0.8 - level) / (0.8 * H - 0.35 * H) * (R - wall * 1.6 - R * 0.78) ;
  const w = new THREE.CircleGeometry(rw, 48).rotateX(-Math.PI / 2).translate(0, level, 0);
  const ring = new THREE.RingGeometry(rw * 0.965, rw, 48).rotateX(-Math.PI / 2).translate(0, level + 0.15, 0);
  parts.push(paint(clean(w, true), q => C('#4a8fa8').lerp(C('#79b6c8'), Math.min(1, Math.hypot(q.x, q.z) / rw) ** 2 * 0.6).multiplyScalar(1 + 0.025 * nz(q.clone().multiplyScalar(0.12)))));
  parts.push(paint(clean(ring, true), () => C('#b8dde8')));
  // glaze and water are smooth (grit kind 0); a stone dish's own body takes the stone grain
  parts.forEach((g, i) => grit(g, stone && i < 3 ? 2 : 0, seed));
  return mergeGeometries(parts)!;
}
function caveShape(variant: string, seed: number, size: number) {
  if (variant === 'dish' || variant === 'stonedish') return dishShape(variant, seed, size);
  const r = rng(seed * 7 + 11), s = size;
  if (variant === 'tube') {
    const rad = 0.21 * s, outer = C('#b0603a'), inner = C('#6a3a24'), nz = waves(r, 4);
    const o = new THREE.CylinderGeometry(rad, rad, s, 24, 1, true), i = inward(new THREE.CylinderGeometry(rad * 0.84, rad * 0.84, s, 24, 1, true));
    const parts = [paint(o, q => shade(outer, 1 + 0.08 * nz(q.clone().multiplyScalar(0.05)))), paint(i, () => inner)];
    for (const y of [-s / 2, s / 2]) { const ring = new THREE.RingGeometry(rad * 0.84, rad, 24).rotateX(y > 0 ? -Math.PI / 2 : Math.PI / 2).translate(0, y, 0); parts.push(paint(ring, () => shade(outer, 0.9))); }
    const g = mergeGeometries(parts.map(q => clean(q, true)))!;
    return g.rotateZ(Math.PI / 2).translate(0, rad, 0);
  }
  if (variant === 'coconut') {
    const rad = s / 2, outer = C('#4e3423'), inner = C('#7a5a3a'), fib = waves(r, 5);
    // doorway: a rounded-square opening with a slightly ragged, hand-broken rim. The shell is a (azimuth x elevation) grid whose
    // columns start at the doorway edge instead of the equator, so the rim is one smooth polyline (no triangle sawtooth).
    const N = 120, M = 40, th0 = 0.42, epsTop = 0.58, ph = [r() * 6.28, r() * 6.28, r() * 6.28];
    const edge = (j: number) => { // elevation (rad) of the shell edge at column j (0 = equator)
      const t = ((j / N + 0.5) % 1 - 0.5) * 2 * Math.PI, u = Math.abs(t) / th0;
      if (u >= 1) return 0;
      const rg = 0.03 * Math.sin(t * 17 + ph[0]) + 0.014 * Math.sin(t * 37 + ph[1]) + 0.005 * Math.sin(t * 61 + ph[2]);
      return Math.max(0, epsTop * Math.pow(1 - Math.pow(u, 4), 0.25) + rg * Math.min(1, (1 - u) * 6));
    };
    const half = (k: number, flip: boolean) => {
      const pos: number[] = [], idx: number[] = [];
      for (let j = 0; j <= N; j++) {
        const t = (j % N) / N * Math.PI * 2, h = edge(j);
        for (let i = 0; i <= M; i++) { const e = h + (Math.PI / 2 - h) * i / M; pos.push(rad * k * Math.cos(e) * Math.sin(t), rad * k * Math.sin(e) * 0.92, rad * k * Math.cos(e) * Math.cos(t)); }
      }
      for (let j = 0; j < N; j++) for (let i = 0; i < M; i++) {
        const a0 = j * (M + 1) + i, b0 = (j + 1) * (M + 1) + i, c0 = b0 + 1, d0 = a0 + 1;
        idx.push(...(flip ? [a0, d0, b0, b0, d0, c0] : [a0, b0, d0, b0, c0, d0]));
      }
      let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      g = mergeVertices(g); g.computeVertexNormals();
      return g;
    };
    // winding: the outer shell's face normals must point away from the centre; the inner shell takes the opposite
    const facing = (g: THREE.BufferGeometry) => { const p0 = g.attributes.position, n0 = g.attributes.normal, m = Math.floor(p0.count / 3); return p0.getX(m) * n0.getX(m) + p0.getY(m) * n0.getY(m) + p0.getZ(m) * n0.getZ(m) > 0; };
    let o = half(1, false); const fl = !facing(o); if (fl) o = half(1, true);
    const i = half(0.93, !fl);
    // shell thickness: a rim strip along the edge loop of the outer half, joined to the inner half
    const rim: number[] = [];
    for (let j = 0; j < N; j++) {
      const P = (k: number, jj: number) => { const t = (jj % N) / N * Math.PI * 2, h = edge(jj); return [rad * k * Math.cos(h) * Math.sin(t), rad * k * Math.sin(h) * 0.92, rad * k * Math.cos(h) * Math.cos(t)]; };
      const a = P(1, j), b = P(1, j + 1), c = P(0.93, j), d = P(0.93, j + 1);
      rim.push(...a, ...c, ...b, ...b, ...c, ...d, ...a, ...b, ...c, ...b, ...d, ...c); // both windings: faces whichever way the camera sees it
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3)); rg.setIndex([...Array(rim.length / 3).keys()]); rg.computeVertexNormals();
    paint(o, q => shade(outer, 1 + 0.14 * Math.sin(Math.atan2(q.z, q.x) * 40 + 3 * fib(q.clone().multiplyScalar(0.05)))));
    paint(i, () => inner);
    paint(rg, () => shade(inner, 0.78));
    return mergeGeometries([o, i, rg])!;
  }
  if (variant in SHELLS) return shellShape(variant, seed, size);
  // arch: half a rough torus standing on its two feet
  const tr = 0.16 * s, R0 = 0.5 * s - tr, g0 = new THREE.TorusGeometry(R0, tr, 9, 30, Math.PI), nz = waves(r), p = g0.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.y, v.x), c = V(Math.cos(a) * R0, Math.sin(a) * R0, 0), d = v.clone().sub(c);
    d.multiplyScalar(1 + 0.25 * nz(v.clone().multiplyScalar(2.2 / s * 3)));
    v.copy(c).add(d.setZ(d.z * 1.4));
    p.setXYZ(i, v.x, Math.max(0, v.y), v.z);
  }
  const g = clean(g0, false), base = C(r() < 0.5 ? STONE.seiryu[0] : '#7d7064'), mot = waves(r, 5);
  g.computeVertexNormals();
  return paint(g, q => shade(base, 1 + 0.16 * mot(q.clone().multiplyScalar(0.05))));
}

// ---------- Plants ----------
// ---------- Grit shader ----------
/** Fragment code: gritK() = how much darker or lighter this pixel of a solid is, from vGrit (see grit()). Detail finer than
 *  about a pixel fades out (px = mm per pixel), so distant pieces do not shimmer. */
const GRIT = `varying vec4 vGrit;
uniform mediump sampler3D gNoiseT;
uniform mediump sampler3D gCellT;
// random numbers from the baked tables (render/gritTex.ts), not hashed here: the D3D compiler inlines every hash, which
// made this the slowest program to link and most of the reef's GPU time (lane SG)
float gH(vec3 id) { return texelFetch(gNoiseT, ivec3(id) & ${NOISE_N - 1}, 0).r; }  // id: whole numbers
// value noise: one trilinear fetch at the lattice cell plus the smoothstepped fraction = the 8-corner smoothstep blend
float gN(vec3 x) { vec3 i = floor(x), f = fract(x); return textureLod(gNoiseT, (i + f * f * (3.0 - 2.0 * f) + 0.5) / ${NOISE_N}.0, 0.0).r; }
float gF(vec3 p) { float a = 0.0, w = 0.5; for (int k = 0; k < 3; k++) { a += w * gN(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); w *= 0.5; } return a / 0.875; }
// distance to the nearest cell border of a jittered grid: zero along a network of cracks
float gEdge(vec3 p) {
  vec3 i = floor(p), f = fract(p); ivec3 c = ivec3(i); float d1 = 8.0, d2 = 8.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(x, y, z), o = texelFetch(gCellT, (c + ivec3(x, y, z)) & ${CELL_N - 1}, 0).rgb;
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2 - d1;
}
float gFade(float f, float px) { return 1.0 - smoothstep(0.4, 0.9, px * f); }
// turned off the grid axes, so thresholded spots come out round instead of square (stone and clay only: wood keeps its grain axis)
const mat3 gR = mat3(0.0, 0.8, 0.6, -0.8, 0.36, -0.48, -0.6, -0.48, 0.64);
// a line where e < w, antialiased, thinning out (instead of shimmering) once it is under a pixel wide
float gLine(float e, float w) { float fw = fwidth(e) + 1e-4; return (1.0 - smoothstep(max(w - fw, 0.0), w + fw, e)) * min(1.0, 2.0 * w / fw); }
float gStone(vec3 p, float px, float rough, float cracks) {
  float k = 1.0 + (gF(p * 0.4) - 0.5) * 0.24 * gFade(0.4, px) + (gF(p * 0.07 + 3.0) - 0.5) * 0.2;
  k *= 1.0 - 0.45 * rough * smoothstep(0.66, 0.76, gN(p * 0.5 + 5.0)) * gFade(0.5, px);  // pits
  k *= 1.0 - 0.3 * rough * smoothstep(0.7, 0.8, gN(p * 0.18 + 2.0));                         // bigger pocks
  vec3 q = p * 0.026 + 0.7 * vec3(gN(p * 0.07), gN(p * 0.07 + 3.1), gN(p * 0.07 + 7.7));
  float e = gEdge(q), m = smoothstep(0.5, 0.68, gN(p * 0.02 + 13.0)) * smoothstep(0.3, 0.55, gN(p * 0.06 + 21.0)) * cracks, c = gLine(e, 0.03) * m;
  float lip = (1.0 - smoothstep(0.03, 0.1, e)) * m * gFade(0.12, px);
  return k * (1.0 + 0.1 * lip * (1.0 - c)) * (1.0 - 0.62 * c);
}
float gWood(vec3 g) {
  float s = g.x, th = g.y, r = max(g.z, 0.5);
  float px = length(fwidth(vec3(s, r * cos(th), r * sin(th))));
  // knots: at most one per cell (55 mm along, a third of the way round): dark core, rings, the grain bent around it
  float core = 0.0, ring = 0.0, warp = 0.0, cs = 55.0, i0 = floor(s / cs);
  for (int a = -1; a <= 1; a++) for (int j = 0; j < 3; j++) {
    vec3 id = vec3(i0 + float(a), float(j), 3.0);
    if (gH(id + vec3(41, 9, 0)) > 0.42) continue;
    float sc = (id.x + 0.2 + 0.6 * gH(id + vec3(0, 5, 1))) * cs, tc = (float(j) + gH(id + vec3(17, 3, 2))) * 2.094395;
    float dt = mod(th - tc + 3.14159, 6.28318) - 3.14159, sz = r * (0.22 + 0.3 * gH(id + vec3(63, 1, 4)));
    float dd = length(vec2((s - sc) / (sz * 1.7), dt * r / sz));
    core = max(core, 1.0 - smoothstep(0.5, 0.75, dd));
    ring = max(ring, (1.0 - smoothstep(0.9, 2.4, dd)) * (0.5 + 0.5 * sin(dd * 9.0)));
    warp += exp(-dd * dd * 0.25) * sign(dt) * 0.9 * sz / r;
  }
  float t2 = th + warp;
  vec3 c = vec3(s, r * cos(t2), r * sin(t2));
  float k = 1.0 + (gN(vec3(s * 0.03, c.y * 0.45, c.z * 0.45)) - 0.5) * 0.32 * gFade(0.4, px)  // fine grain streaks
              + (gF(vec3(s * 0.006, c.y * 0.15, c.z * 0.15)) - 0.5) * 0.22;                   // weathered patches
  float e = abs(gN(vec3(s * 0.009, c.y * 0.28, c.z * 0.28) + 5.0) * 2.0 - 1.0);             // splits along the grain
  float m = smoothstep(0.45, 0.65, gN(vec3(s * 0.011, c.y * 0.05, c.z * 0.05) + 9.0));
  k *= 1.0 - 0.6 * gLine(e, 0.045) * m;
  return k * (1.0 - 0.22 * ring - 0.5 * core);
}
float gritK() {
  int t = int(vGrit.w + 0.5); vec3 p = vGrit.xyz; float px = length(fwidth(p)), k = 1.0; vec3 q = gR * p;
  // stones 1-5 share ONE gStone call (roughness and cracks picked first): the D3D compiler inlines each call site, and
  // five copies of its crack search made this program take 10-22 s to link on a first visit (lane E1 / EF1)
  if (t >= 1 && t <= 5) {
    float rough = t == 1 ? 0.25 : t == 2 ? 0.6 : t == 3 ? 1.1 : t == 4 ? 1.4 : 0.4, cracks = t == 1 ? 0.3 : t == 2 ? 1.0 : t == 3 ? 0.6 : t == 4 ? 0.35 : 0.5;
    k = gStone(q, px, rough, cracks);
    if (t == 5) {  // slate: fissures along the layers over the fine grain
      float e = abs(gN(vec3(p.x * 0.02, p.y * 0.35, p.z * 0.02)) * 2.0 - 1.0), m = smoothstep(0.4, 0.6, gN(p * 0.03 + 4.0));
      k *= 1.0 - 0.55 * gLine(e, 0.05) * m;
    }
  }
  else if (t == 6) k = gWood(p);
  else if (t == 7) k = (1.0 + (gF(q * 0.4) - 0.5) * 0.34 * gFade(0.4, px) + (gF(q * 0.05) - 0.5) * 0.3   // clay grain and firing blotches
                   + 0.18 * smoothstep(0.74, 0.84, gN(q * 0.5 + 9.0)) * gFade(0.5, px))                    // pale grit
                   * (1.0 - 0.4 * smoothstep(0.7, 0.8, gN(q * 0.45 + 2.0)) * gFade(0.45, px));             // pinholes
  else if (t == 8) k = 1.0 + (gN(vec3(p.x * 0.7, p.y * 0.05, p.z * 0.7)) - 0.5) * 0.5 * gFade(0.6, px) + (gF(p * 0.1) - 0.5) * 0.2;
  else if (t == 9) { float d = length(p.xy); k = (0.7 + 0.14 * sin(d * 2.6 + 2.0 * gN(p * 0.4))) * (1.0 - 0.5 * gLine(abs(gN(vec3(atan(p.y, p.x) * 3.0, 0.0, 1.0)) * 2.0 - 1.0), 0.06)); }
  else if (t == 10) k = 1.0 + (gF(p * 0.3) - 0.5) * 0.22 * gFade(0.6, px);
  else if (t == 11) k = (1.0 + (gF(q * 0.08) - 0.5) * 0.2 + (gN(q * 0.45) - 0.5) * 0.18 * gFade(0.45, px))   // hard coral: mottling, corallite cups
                   * (1.0 - 0.3 * smoothstep(0.6, 0.72, gN(q * 0.7 + 3.0)) * gFade(0.7, px));
  else if (t == 12) k = 1.0 + (gF(q * 0.06) - 0.5) * 0.18 + 0.22 * smoothstep(0.55, 0.7, gN(q * 0.6 + 5.0)) * gFade(0.6, px); // soft: pale polyp fuzz
  return k;
}
`;

// ---------- Caches and assembly ----------
/**
 * Hardscape may pass through the glass (Nathan 2026-10-12): whatever lies outside the inner glass surface is not drawn,
 * so a piece pushed into a pane looks cut off by it. One material per tank outline: a clipping plane on each straight run
 * of the footprint (all outlines are convex) and one under the floor; a bowl clips to its sphere in the shader instead,
 * below the opening (its walls flare past the floor disc). Needs the renderer's localClippingEnabled.
 */
const glassMats = new Map<string, THREE.MeshBasicMaterial>();
const glassKey = (T: Tank) => `${shapeOf(T)}|${T.L}|${T.D}|${T.H}|${T.sides}|${T.bowMin}|${T.bowlFloor}|${T.bowlTop}`;
/** The clipping planes and the bowl's sphere cut (a shader patch adding vGlassW) for one tank outline; `vary` alone
 *  declares what the cut needs without cutting (the cap's count passes). */
function glassClip(T: Tank) {
  const bowl = shapeOf(T) === 'bowl', planes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
  // keep where -((x - a.x) n.x + (depth - a.d) n.d) >= 0, i.e. insideBy; world z = -depth
  if (!bowl) for (const e of footprint(T).edges) planes.push(new THREE.Plane(new THREE.Vector3(-e.n[0], 0, e.n[1]), e.a[0] * e.n[0] + e.a[1] * e.n[1]));
  const b = bowl ? bowlDims(T) : null;
  const uC = { value: new THREE.Vector3(T.L / 2, b?.c ?? 0, -T.D / 2) }, uR = { value: b?.R ?? 1e9 }, uTop = { value: b?.H ?? 0 };
  const vary = (sh: THREE.WebGLProgramParametersWithUniforms) => {
    Object.assign(sh.uniforms, { uC, uR, uTop });
    sh.vertexShader = 'varying vec3 vGlassW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vGlassW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vGlassW;\nuniform vec3 uC;\nuniform float uR;\nuniform float uTop;\n' + sh.fragmentShader;
  };
  const patch = (sh: THREE.WebGLProgramParametersWithUniforms) => {
    vary(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (vGlassW.y < uTop && distance(vGlassW, uC) > uR) discard;');
  };
  return { planes, patch, vary };
}
/** The hardscape's grain and algae, and its inside (seen where the glass cuts it open) drawn darker by `k`. */
const solidLook = (k: number) => (sh: THREE.WebGLProgramParametersWithUniforms) => {
  Object.assign(sh.uniforms, gritUniforms());
  sh.vertexShader = 'attribute vec4 aGrit;\nvarying vec4 vGrit;\nattribute float aNoAlg;\nvarying float vNoAlg;\n' + sh.vertexShader.replace('vGlassW = ', 'vGrit = aGrit; vNoAlg = aNoAlg; vGlassW = ');
  // condition view (lane AL, render/algae.ts): algae keyed to the piece's seeded local position, none on corals
  sh.fragmentShader = 'varying float vNoAlg;\n#define ALG_MASK (1.0 - vNoAlg)\n#define ALG_POS vGrit.xyz\n' + GRIT + sh.fragmentShader
    .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= gritK();')
    .replace('#include <dithering_fragment>', `#include <dithering_fragment>\n  if (!gl_FrontFacing) gl_FragColor.rgb *= ${k.toFixed(2)};`);
};
export function solidMaterial(T: Tank) {
  const k = glassKey(T);
  let m = glassMats.get(k);
  if (m) return m;
  const { planes, patch } = glassClip(T), look = solidLook(0.55);
  // both sides drawn: where the glass cuts a piece open its inside shows, darker (a piece crossing the glass is capped
  // over that, `capPasses`; this is what shows where no cap is drawn)
  m = new THREE.MeshBasicMaterial({ vertexColors: true, clippingPlanes: planes, side: THREE.DoubleSide });
  // the lighting pass (render/lighting.ts aqPatch) takes over onBeforeCompile and runs userData.pre first
  const pre = (sh: THREE.WebGLProgramParametersWithUniforms) => { patch(sh); look(sh); };
  m.onBeforeCompile = pre;
  m.customProgramCacheKey = () => 'glass-clip';
  Object.assign(m.userData, { keep: true, solid: true, pre });
  return remember(glassMats, k, m, 16, x => x.dispose());
}

/**
 * The cut face (Nathan 2026-10-15): through the opening the glass leaves, the camera saw the piece's inside (its back
 * faces), a hollow shell from any angle but head-on. A piece crossing the glass is capped (stencil capping): along each
 * sightline, from where it enters the kept region (the last clipping plane or the bowl's sphere it crosses from outside;
 * `ENTRY`), two passes count the piece's surfaces (back faces +1, front faces -1, no depth test), which leaves the
 * stencil non-zero exactly where that entry point is inside the piece; there the piece's back faces draw the flat cap:
 * lit at the entry point with the glass's outward normal (render/lighting.ts reads vAqP / vAqN, here plain variables set
 * at the top of main()), at its depth (a carpet or the gravel reaching inside stays hidden), clearing the stencil. Each
 * piece's passes run one after the other (renderOrder), after the opaque scene and before the overlays drawn on top.
 * Needs the renderer's stencil buffer (render/viewer.ts sets `capping.on`).
 */
const ENTRY = `
// the sightline camera -> this fragment (at s = 1): where it enters the kept region (s; -1: the camera is inside), and
// the glass's outward normal there
float glassEntry(out vec3 n) {
  float t = -1.0; n = vec3(0.0, 0.0, 1.0);
#if NUM_CLIPPING_PLANES > 0
  // view space, camera at the origin: kept where dot(n, q) + c >= 0 (three's clippingPlanes, q = -vClipPosition)
  vec3 q = -vClipPosition;
  for (int i = 0; i < NUM_CLIPPING_PLANES; i++) {
    vec4 pl = clippingPlanes[i]; float dn = dot(pl.xyz, q);
    if (pl.w < 0.0 && dn > 0.0) { float s = -pl.w / dn; if (s > t) { t = s; n = -pl.xyz * mat3(viewMatrix); } }
  }
#endif
  vec3 o = cameraPosition, v = vGlassW - o, oc = o - uC;
  float a = dot(v, v), b = dot(oc, v), c = dot(oc, oc) - uR * uR, disc = b * b - a * c;
  if (c > 0.0 && disc > 0.0) { float s = (-b - sqrt(disc)) / a; if (s > t && o.y + s * v.y < uTop) { t = s; n = o + s * v - uC; } }
  n = normalize(n);
  return t;
}
`;
const capShader = (sh: THREE.WebGLProgramParametersWithUniforms) => {
  sh.fragmentShader = sh.fragmentShader
    .replace('varying vec3 vAqP; varying vec3 vAqN;', 'varying vec3 vAqP; varying vec3 vAqN;\nuniform mat4 projectionMatrix;\nvec3 aqCapP; vec3 aqCapN;\n#define vAqP aqCapP\n#define vAqN aqCapN')
    .replace('void main() {', `${ENTRY}void main() {
#undef vAqP
#undef vAqN
  aqCapP = vAqP; aqCapN = vAqN;
#define vAqP aqCapP
#define vAqN aqCapN
  gl_FragDepth = gl_FragCoord.z;
  vec3 capN; float capT = glassEntry(capN);
  if (capT > 0.0 && capT <= 1.0) {
    aqCapP = mix(cameraPosition, vGlassW, capT); aqCapN = capN;
    vec4 cp = projectionMatrix * viewMatrix * vec4(aqCapP, 1.0); gl_FragDepth = 0.5 + 0.5 * cp.z / cp.w;
  } else discard; // no glass entry along this sightline (open top, camera inside the piece): nothing to cap, never show the piece's raw back faces`);
};
type CapMats = { front: THREE.MeshBasicMaterial; back: THREE.MeshBasicMaterial; cap: THREE.MeshBasicMaterial };
const capMats = new Map<string, CapMats>();
function capMaterials(T: Tank): CapMats {
  const k = glassKey(T), had = capMats.get(k);
  if (had) return had;
  const { planes, patch, vary } = glassClip(T), look = solidLook(0.75);
  const count = (side: THREE.Side, op: THREE.StencilOp) => {
    // no colour: a blend keeping what is there (the viewer locks the colour mask on, so colorWrite: false would not hold)
    const m = new THREE.MeshBasicMaterial({ clippingPlanes: planes, side, depthWrite: false, depthTest: false,
      blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneFactor,
      stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilFail: op, stencilZFail: op, stencilZPass: op });
    // not cut at the glass: only what lies before the entry point is left out (past a pane the camera is inside of, the
    // piece still counts)
    m.onBeforeCompile = sh => {
      vary(sh);
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', ENTRY + 'void main() {')
        .replace('#include <clipping_planes_fragment>', '{ vec3 capN; if (glassEntry(capN) > 1.0) discard; }');
    };
    m.customProgramCacheKey = () => 'glass-count';
    m.userData.keep = true;
    return m;
  };
  const cap = new THREE.MeshBasicMaterial({ vertexColors: true, clippingPlanes: planes, side: THREE.BackSide,
    stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilZFail: THREE.ZeroStencilOp, stencilZPass: THREE.ZeroStencilOp });
  const pre = (sh: THREE.WebGLProgramParametersWithUniforms) => { patch(sh); look(sh); };
  cap.onBeforeCompile = pre;
  cap.customProgramCacheKey = () => 'glass-cap';
  Object.assign(cap.userData, { keep: true, solid: true, pre, post: capShader });
  const out = { front: count(THREE.FrontSide, THREE.DecrementWrapStencilOp), back: count(THREE.BackSide, THREE.IncrementWrapStencilOp), cap };
  return remember(capMats, k, out, 16, x => { x.front.dispose(); x.back.dispose(); x.cap.dispose(); });
}
/** Whether pieces crossing the glass are capped: only where the renderer has a stencil buffer (render/viewer.ts). */
export const capping = { on: false };
const _box = new THREE.Box3(), _p = new THREE.Vector3(), _c = new THREE.Vector3();
/** The cap passes for solid piece `m` (placed) if its bounds cross the glass: children of it, never picked or exported.
 *  Each piece's three passes draw together, in an order set by its item `id`: a running count made an incremental build
 *  (one piece rebuilt, numbered last) stack two overlapping capped pieces differently from a full rebuild. */
function capPasses(m: THREE.Mesh, T: Tank, id: number) {
  if (!capping.on) return;
  const g = m.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  m.updateMatrix();
  _box.copy(g.boundingBox!).applyMatrix4(m.matrix);
  const { planes } = glassClip(T), bowl = shapeOf(T) === 'bowl' ? bowlDims(T) : null;
  if (bowl) _c.set(T.L / 2, bowl.c, -T.D / 2);
  let cut = false;
  for (let i = 0; i < 8 && !cut; i++) {
    _p.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z);
    cut = planes.some(pl => pl.distanceToPoint(_p) < 0) || (!!bowl && _p.y < bowl.H && _p.distanceTo(_c) > bowl.R);
  }
  if (!cut) return;
  const M = capMaterials(T), ro = 6 + (Math.abs(id) % 4000) * 2e-4;
  for (const [mat, r] of [[M.back, ro], [M.front, ro], [M.cap, ro + 1e-4]] as const) {
    const o = new THREE.Mesh(g, mat);
    o.renderOrder = r; o.raycast = () => {};
    Object.assign(o.userData, { capPass: true, nolight: mat !== M.cap });
    m.add(o);
  }
}
/** 3D plants are cut off at the glass the same way (a leaf arching past a pane stops at it), one material per outline;
 *  its shader shows each plant at its own growth (plant3d growShader, lane GR4). */
const plantMats = new Map<string, THREE.MeshBasicMaterial>();
function plantMaterial(T: Tank) {
  const k = glassKey(T);
  let m = plantMats.get(k);
  if (m) return m;
  const { planes, patch } = glassClip(T);
  m = new THREE.MeshBasicMaterial({ vertexColors: true, clippingPlanes: planes });
  m.onBeforeCompile = sh => { patch(sh); growShader(sh); };
  m.customProgramCacheKey = () => 'plant-clip';
  // above the water (an emersed stem or sword leaf, lane GR2) there is no water haze: it fades out over the first few
  // mm, so leaves lying at the surface keep theirs
  const post = (sh: THREE.WebGLProgramParametersWithUniforms) => {
    sh.fragmentShader = sh.fragmentShader.replace('float aqF = (1.0 - exp(-uWater.w * aqWaterPath()))', '$& * (1.0 - smoothstep(uWater.y + 6.0, uWater.y + 14.0, vAqP.y))');
    growShader(sh); // (after the lighting's vAqP: the haze and the light need the grown position)
  };
  Object.assign(m.userData, { cached: true, keep: true, plantClip: true, pre: patch, post });
  return remember(plantMats, k, m, 16, x => x.dispose());
}
const shapes = new Map<string, THREE.BufferGeometry>(), baked = new Map<string, THREE.BufferGeometry>(), plants = new Map<string, THREE.BufferGeometry>();
/** 3D plants lying over at the surface (per water level), and shown at a growth on the CPU (picking, the USDZ export). */
const PLANTS_MAX = 600, BENT_MAX = 360, bent = new Map<string, THREE.BufferGeometry>(), unbent = new Set<string>(), shown = new Map<string, THREE.BufferGeometry>(), shownCpu = new Map<string, THREE.BufferGeometry>();
function remember<T>(m: Map<string, T>, k: string, v: T, max: number, drop?: (v: T) => void) {
  m.set(k, v);
  if (m.size > max) { const [k0, v0] = m.entries().next().value!; m.delete(k0); drop?.(v0); }
  return v;
}
const dispose = (g: THREE.BufferGeometry) => g.dispose();

function solidShape(it: Item) {
  const k = `${it.variant}|${it.seed}|${it.size}`;
  const make = () => noAlgae(it, grit(it.kind === 'coral' || it.variant === 'liverock' ? reefShape(it.variant, it.seed, it.size) : it.kind === 'stone' ? stoneShape(it.variant, it.seed, it.size) : it.kind === 'wood' ? woodShape(it.variant, it.seed, it.size) : caveShape(it.variant, it.seed, it.size), GRIT_KIND[it.variant] ?? 2, it.seed));
  return shapes.get(k) ?? remember(shapes, k, make(), 150, dispose);
}
/** Corals stay clean in the condition view (lane AL, render/algae.ts): aNoAlg = 1 (absent = 0, algae allowed). */
function noAlgae(it: Item, g: THREE.BufferGeometry) {
  if (it.kind === 'coral') g.setAttribute('aNoAlg', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(1), 1));
  return g;
}
/** A piece's turn: yaw about the vertical, then pitch (tip forward / back), then roll (lean sideways). */
const itemEuler = (it: Item) => new THREE.Euler(it.pitch * D2R, it.yaw * D2R, it.tilt * D2R, 'YXZ');

/**
 * The shape with the light baked in for its turn and lean (the light stays put in the room while the piece turns).
 * userData.rise = how far to raise it so its lowest point, once turned, sits where the unturned shape's base sits (a
 * piece tipped on its side or rolled over rests on the ground instead of sinking into it).
 */
function bakedShape(it: Item) {
  const k = `${it.variant}|${it.seed}|${it.size}|${it.yaw}|${it.pitch}|${it.tilt}`;
  let g = baked.get(k);
  if (g) return g;
  const src = solidShape(it), q = new THREE.Quaternion().setFromEuler(itemEuler(it)).invert();
  const L = LIGHT.clone().applyQuaternion(q), U = V(0, 1, 0).applyQuaternion(q);
  g = src.clone();
  const n = g.attributes.normal, a = src.attributes.color, out = new Float32Array(n.count * 3), nn = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    nn.fromBufferAttribute(n, i);
    const k2 = 0.42 + 0.72 * Math.max(0, nn.dot(L)) + 0.08 * nn.dot(U);
    out[i * 3] = a.getX(i) * k2; out[i * 3 + 1] = a.getY(i) * k2; out[i * 3 + 2] = a.getZ(i) * k2;
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  g.computeBoundingBox(); g.computeBoundingSphere();
  const pos = src.attributes.position, qt = q.clone().invert(), pv = new THREE.Vector3();
  let low0 = Infinity, low = Infinity;
  for (let i = 0; i < pos.count; i++) { pv.fromBufferAttribute(pos, i); low0 = Math.min(low0, pv.y); low = Math.min(low, pv.applyQuaternion(qt).y); }
  g.userData.rise = pos.count ? low0 - low : 0;
  g.userData.keep = true;
  return remember(baked, k, g, 400, dispose);
}

/** What the ground's shape depends on (terrain.ts groundHeight): custom terrain (with pools, cut down to the substrate's
 *  corner depths), else the substrate's corner depths. */
function groundKey(S: TankSetup) {
  const t = S.terrain, b = S.substrate, c = [b.fl, b.fr, b.bl, b.br].join(',');
  if (t?.on && t.h.length) return `t${t.cols},${t.rows},${t.radial ? 'r' : ''}${t.arc ?? ''},${t.h.join(',')}${t.pools?.length ? `|p${t.pools.map(p => [p.x, p.d, p.rx, p.rd, p.bank].join(',')).join(';')}|${c}` : ''}`;
  return `s${b.show ? c : '-'}`;
}
/** How far from a vine's crown (mm, sideways) wood must come for its vines to find it (lane T2). */
const VINE_REACH = 320;
/**
 * The limbs of the wood near a vine (lane T2, on T3's anchors): every limb of a piece with one within VINE_REACH of its
 * crown, placed as the piece's mesh is (turnOut + its rise) and given in the vine's own frame (base at its origin, its
 * yaw undone), to 1 mm. Flat: per limb [n, r0, r1, x, y, z x n]. Empty = nothing to run along.
 */
function vineLimbs(S: TankSetup, T: Tank, it: Item, y: number, c: number, s: number): number[] {
  const out: number[] = [];
  for (const w of S.items) {
    if (w.kind !== 'wood' && !(w.variant in SHELLS)) continue;
    const ls = woodLimbs(w.variant, w.seed, w.size);
    if (!ls.length) continue;
    const wy = groundHeight(S, T, w.x, w.depth) + w.lift - itemSink(w) + (bakedShape(w).userData.rise ?? 0);
    const tank = ls.map(l => l.pts.map(p => { const t = turnOut(w, p); return [w.x + t[0], wy + t[1], w.depth + t[2]] as const; }));
    if (!tank.some(l => l.some(p => Math.hypot(p[0] - it.x, p[2] - it.depth) < VINE_REACH))) continue;
    ls.forEach((l, i) => {
      out.push(l.pts.length, Math.round(l.r0 * 10) / 10, Math.round(l.r1 * 10) / 10);
      for (const p of tank[i]) { const dx = p[0] - it.x, dd = p[2] - it.depth; out.push(Math.round(dx * c + dd * s), Math.round(p[1] - y), Math.round(dx * s - dd * c)); }
    });
  }
  return out;
}
/** What else an item's mesh depends on besides its own data (render/build.ts item key): for a vine, the wood it runs
 *  along (lane T2); '' for everything else. */
export function itemDeps(S: TankSetup, it: Item) {
  if (it.kind !== 'plant' || !isVine(it.variant) || it.pitch || it.tilt) return '';
  const y = groundHeight(S, S.tank, it.x, it.depth) + it.lift - itemSink(it), c = Math.cos(it.yaw * D2R), s = Math.sin(it.yaw * D2R), l = vineLimbs(S, S.tank, it, y, c, s);
  return l.length ? `|L${hashNums(l)}` : '';
}
/** A short hash of a number list (cache keys). */
const hashNums = (a: number[]) => { let h = 0; for (const v of a) h = (Math.imul(h, 31) + Math.round(v * 10)) | 0; return `${a.length}:${h}`; };
/**
 * How a plant item is built (itemMesh, and the idle prebuild, which must land on the same cache keys): its height `h`,
 * cache keys, plantGeometry's arguments, and how it lies over (`bend`: water over its base F, ceiling C). `more` = with
 * what grows past its own growth (a plant that has a growth of its own; the prebuild asks for it ahead of time).
 * Null = nothing to draw (a floater in a dry tank, no room under the lid).
 */
function plantPlan(S: TankSetup, T: Tank, it: Item, more = it.growth != null) {
  const ground = groundHeight(S, T, it.x, it.depth), y = ground + it.lift - itemSink(it);
  const type = it.variant as PlantType, carpet = isCarpet(type), float = isFloat(type), vine = isVine(type);
  if (float && !S.water.on) return null; // floaters need water
  // built at full growth from its saved size (`h`: as before growth, capped under the lid) and shown at its growth
  const g0 = growthOf(type, it.size), gr = it.growth ?? g0;
  // stops at the lid (the old layouts' rule), to whole mm: a capped plant dragged up or down reuses its build until the
  // room under the lid changes by a mm (lane E2 #10: it rebuilt on every move)
  // (a vine's size is its length, not a height: it runs along the lid instead, lane T2)
  const cap = (s: number) => carpet || float || vine ? s : Math.min(s, Math.floor(T.H - y - 15));
  const h = cap(it.size);
  if (h < 15) return null;
  const c = Math.cos(it.yaw * D2R), s = Math.sin(it.yaw * D2R);
  // a vine lifted onto wood or rock: how high it sits over the ground (its trailers hang down to it), to 5 mm
  const drop = vine ? Math.max(0, Math.round(it.lift / 5) * 5) : 0;
  // the wood near it, in its own frame: its vines run along the limbs and across to the next (lane T2; not tipped)
  const limbs = vine && !it.pitch && !it.tilt ? vineLimbs(S, T, it, y, c, s) : [];
  // a plant whose own spread reaches the glass: the panes it reaches, in its own frame (plantGeometry sets its stems,
  // crowns or rosettes down inside them), to 4 mm and 3 decimals so a drag reuses a build until it moves that far. Not
  // in a bowl (its spread is kept inside) nor tipped
  const clip: number[] = [];
  if (it.spread && !carpet && shapeOf(T) !== 'bowl' && !it.pitch && !it.tilt) for (const e of footprint(T).edges) {
    const e0 = -((it.x - e.a[0]) * e.n[0] + (it.depth - e.a[1]) * e.n[1]);
    if (e0 < it.spread / 2 + 4) clip.push(+(c * e.n[0] + s * e.n[1]).toFixed(3), +(s * e.n[0] - c * e.n[1]).toFixed(3), Math.round(e0 / 4) * 4);
  }
  // a carpet hugs the ground under each leaflet: its key carries the spot (rebuilt only while it moves); the rest key on
  // the exact height they are built with (a rounded one let two near-equal plants share the first one's mesh)
  // (a carpet's ground: everything groundHeight reads, lane E2 #2: a terrain or substrate edit left it on the old ground)
  const k = carpet ? `${type}|${it.seed}|${it.size}|${h}|${it.x}|${it.depth}|${it.yaw}|${it.lift}|${T.shape}|${T.L}|${T.D}|${T.H}|${T.sides}|${T.bowMin}|${T.bowlFloor}|${T.bowlTop}|${groundKey(S)}` : `${type}|${it.seed}|${it.size}|${h}|${it.spread ?? ''}|${it.stems ?? ''}|${it.dens ?? ''}|${clip.join(',')}${vine ? `|d${drop}|L${limbs.length ? hashNums(limbs) : ''}` : ''}`;
  // near the glass a leaflet is cut down to the width it has room for, so the carpet runs right up to the glass without
  // poking through; a leaflet past the edge line is mirrored back in by as much (keeping the edge thick), and one more
  // than half a leaflet past it is left out
  const EDGE = 8;
  const at = (lx: number, lz: number) => {
    let x = it.x + lx * c + lz * s, d = it.depth + lx * s - lz * c;
    const e = EDGE - groundInsideBy(S, T, x, d);
    if (e > CARPET_W / 2) return null;
    if (e > 0) ({ x, depth: d } = clampGround(S, T, x, d, EDGE + e));
    const dx = x - it.x, dd = d - it.depth;
    return { x: dx * c + dd * s, y: groundHeight(S, T, x, d) - ground, z: dx * s - dd * c, w: Math.min(CARPET_W, 2 * groundInsideBy(S, T, x, d)) };
  };
  // (what grows past g0 is only built once the plant has a growth of its own: a starter set costs what it did)
  const sw = `3d${plant3d.sway ? 's' : ''}${more ? '+' : ''}${plant3d.emerse ? '' : 'n'}|`, kf = sw + (carpet ? `${type}|${it.seed}|${it.size}` : k);
  const args = [type, it.seed, h, { spread: it.spread, stems: it.stems, dens: it.dens, clip: clip.length ? clip : undefined, drop: drop || undefined, limbs: limbs.length ? limbs : undefined }, g0, more, it.size] as const;
  let bend: { F: number; C?: number; water: boolean; walls: number[]; ks: string } | undefined;
  if (!carpet && !float) {
    // longer than the water above it: lies over at the surface (`F` over its base, to 2 mm, so a drag reuses it). A
    // plant with no growth of its own keeps the old allowance (tips up to the lid in a full tank, as they always
    // were) and only lies over when it would poke out further than that
    const depth = S.water.on ? waterY(T, S.water.level) - y : T.H - 15 - y, P3 = PLANT3D[type]!;
    let F = Math.round((depth - 3) / 2) * 2;
    if (!more && h <= depth + 14 && !P3.pads && !vine) F = Infinity; // (a vine's h is a length: it may reach the lid) // (a lily's pads always go to the surface)
    // an emerging plant grown on climbs out of the water up to what is over it (lane GR2): the lid or the hood, or
    // over an open tank the light (its fixture, a little under the height it hangs at)
    const C = more && S.water.on && P3.grow.overflow === 'emerge'
      ? Math.round(((S.lid === 'glass' || S.lid === 'mesh' ? T.H - 4 : T.H + lampHeight(S.light, S.lid) - 20) - y) / 2) * 2 : undefined;
    // the panes within its reach, in its own frame (to 2 mm and a degree, so a drag along the glass reuses it): its
    // leaves curve along them instead of being cut off at the glass (Nathan 2026-10-15). Not in a bowl (the glass is
    // a sphere there) nor for a tipped plant: those are still cut off
    const walls: number[] = [];
    if (shapeOf(T) !== 'bowl' && !it.pitch && !it.tilt) for (const e of footprint(T).edges) {
      const d = -((it.x - e.a[0]) * e.n[0] + (it.depth - e.a[1]) * e.n[1]);
      if (d > h + 40) continue;
      // the outward normal in the tank (x, z = -depth), turned into the plant's frame (its yaw)
      const wx = e.n[0], wz = -e.n[1], a = Math.round(Math.atan2(wx * s + wz * c, wx * c - wz * s) / D2R), dd = Math.round(d / 2) * 2;
      let dup = false;
      for (let i = 0; i < walls.length; i += 4) if (walls[i + 3] === a && walls[i + 2] === dd) dup = true;
      if (!dup) walls.push(+Math.cos(a * D2R).toFixed(4), +Math.sin(a * D2R).toFixed(4), dd, a);
    }
    const W = walls.filter((_, i) => i % 4 !== 3);
    if (Number.isFinite(F) || W.length) bend = { F, C, water: S.water.on, walls: W, ks: `${kf}|${F}|${C ?? ''}|${S.water.on ? 'w' : ''}|${walls.filter((_, i) => i % 4 > 1).join(',')}` };
  }
  // a clump on sloping ground (sitting on it, not on a piece): each crown on the ground under it (clumpOnGround)
  const off = !carpet && !float && it.lift <= 2
    ? (lx: number, lz: number) => groundHeight(S, T, it.x + lx * c + lz * s, it.depth + lx * s - lz * c) - ground : undefined;
  return { type, carpet, float, gr, h, k, at, off, kf, ks: sw + k, args, bend };
}

// ---------- Idle prebuild (lane GR4) ----------
// A plant's first growth builds what grows past its own growth (plantGeometry with `more`) and lies it over at the
// water: 65..350 ms on the main thread. prebuildPlants() has a worker build them ahead of time (after a tank loads and
// when the Plants panel opens), one plant at a time, and drops each into the caches itemMesh reads, so the first drag
// finds it there. Without a worker (tests, the single-file build opened from disk) nothing is built ahead.
let worker: Worker | null | undefined, busy = false, jobId = 0;
type Want = { key: string; P: NonNullable<ReturnType<typeof plantPlan>> };
const queue: Want[] = [], inFlight = new Map<number, Want>();
function plantWorker() {
  if (worker !== undefined) return worker;
  try { worker = typeof Worker === 'undefined' ? null : new Worker(new URL('./plantWorker.ts', import.meta.url), { type: 'module' }); } catch { worker = null; }
  if (worker) {
    worker.onmessage = (e: MessageEvent<JobOut>) => { busy = false; landed(e.data); pump(); };
    worker.onerror = () => { worker?.terminate(); worker = null; busy = false; queue.length = 0; };
  }
  return worker;
}
/** The renderer to send prebuilt plants to the GPU with (set by the UI); without one they upload on their first draw. */
export const prebuildHooks: { renderer: THREE.WebGLRenderer | null } = { renderer: null };
const uploads: [THREE.BufferGeometry, number][] = [];
/** One buffer of a plant to the GPU per slice (a few ms each), between frames. */
function uploadNext() {
  const u = uploads[0], r = prebuildHooks.renderer!;
  const next = u[0].attributes.position ? uploadPlant(r, u[0], u[1]) : -1; // (dropped from the cache meanwhile: nothing to send)
  if (next < 0) uploads.shift(); else u[1] = next;
  if (uploads.length) setTimeout(uploadNext, 0);
}
const toUpload = (g: THREE.BufferGeometry) => { if (prebuildHooks.renderer && uploads.push([g, 0]) === 1) setTimeout(uploadNext, 0); };
/** Is this plant's full growth (with its lying over at the water) built? Then its first growth costs nothing extra. */
export function plantWarm(S: TankSetup, it: Item) {
  const P = it.kind === 'plant' ? plantPlan(S, S.tank, it, true) : null;
  return !P || (plants.has(P.kf) && (!P.carpet || plants.has(P.ks)) && (!P.bend || bent.has(P.bend.ks) || unbent.has(P.bend.ks)));
}
/** Where the prebuild stands (debugging, timings). */
export const prebuildState = () => ({ queued: queue.length, busy, inFlight: [...inFlight.values()].map(w => w.key), worker: !!worker, uploads: uploads.length });
/** Can plants be built ahead (a worker)? Without one a cold plant builds on the main thread on its first growth. */
export const canPrebuild = () => plant3d.gpu && !!plantWorker();
/**
 * Build every plant of the tanks ahead of its first growth, in a worker. `first` = plants of tank S as they are about
 * to be (a drag's next step: their new growth and place), built before the rest, which are left out while it runs. The
 * queue is made afresh (plants since removed drop out); cheap when everything is built: it only looks the plants up.
 */
export function prebuildPlants(tanks: TankSetup | TankSetup[], first?: { S: TankSetup; items: Item[] }) {
  if (!plant3d.gpu || !plantWorker()) return;
  const front: Want[] = [], rest: Want[] = [], seen = new Set([...inFlight.values()].map(w => w.key));
  const all: [TankSetup, Item, boolean][] = first ? first.items.map(it => [first.S, it, true]) : [];
  if (!first) for (const S of ([] as TankSetup[]).concat(tanks)) for (const it of S.items) all.push([S, it, false]);
  for (const [S, it, urgent] of all) {
    if (it.kind !== 'plant' || plantWarm(S, it)) continue;
    const P = plantPlan(S, S.tank, it, true)!, key = `${P.kf}|${P.bend?.ks ?? ''}|${P.carpet ? P.ks : ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (urgent ? front : rest).push({ key, P });
  }
  queue.length = 0; queue.push(...front, ...rest);
  pump();
}
function pump() {
  if (busy || !worker) return;
  const w = queue.shift();
  if (!w) return;
  const { P } = w;
  if (plants.has(P.kf) && (!P.bend || bent.has(P.bend.ks) || unbent.has(P.bend.ks)) && (!P.carpet || plants.has(P.ks))) return pump(); // (built on the main thread meanwhile)
  busy = true;
  const id = ++jobId;
  inFlight.set(id, w);
  worker.postMessage({ id, args: [...P.args], switches: { ...plant3d }, bend: P.bend && { F: P.bend.F, C: P.bend.C, water: P.bend.water, walls: P.bend.walls }, carpet: P.carpet } satisfies PlantJob);
}
function landed(out: JobOut) {
  const w = inFlight.get(out.id);
  if (!w) return;
  const { P } = w;
  // a carpet: where each leaflet lands is looked up here (the ground), a few ms at a time between frames; the worker
  // then sets it on the ground (12..40 ms in one go on this thread)
  if (out.anchors) { busy = true; spotsFor(P, out.anchors, q => worker?.postMessage({ id: out.id, ground: q } satisfies PlantJob, [q.buffer])); return; }
  inFlight.delete(out.id);
  const full = plants.get(P.kf) ?? remember(plants, P.kf, unpackGeometry(out.full!), PLANTS_MAX, dropPlant);
  let drawn = full;
  if (out.bent && P.bend && !bent.has(P.bend.ks)) drawn = remember(bent, P.bend.ks, unpackGeometry(out.bent, full), BENT_MAX, dropPlant);
  else if (P.bend && !out.bent) noBend(P.bend.ks);
  if (out.ground && !plants.has(P.ks)) {
    // (sharing the colours, normals and triangles of the built carpet in the cache, as carpetOnGround would)
    const g = unpackGeometry(out.ground, full);
    if (g.userData.grow && full.userData.grow) g.userData.grow = { ...full.userData.grow, anc: (g.userData.grow as { anc: Float32Array }).anc };
    drawn = remember(plants, P.ks, g, PLANTS_MAX, dropPlant);
  }
  toUpload(drawn);
}
/** Each leaflet's spot on the ground (x, y, z, w; NaN = left out), looked up at most ~4 ms at a time. */
function spotsFor(P: Want['P'], a: Float32Array, done: (q: Float32Array) => void) {
  const n = a.length / 2, q = new Float32Array(n * 4);
  let i = 0;
  const slice = () => {
    for (const t0 = performance.now(); i < n && performance.now() - t0 < 4; i++) {
      const p = P.at(a[i * 2], a[i * 2 + 1]);
      if (p) q.set([p.x, p.y, p.z, p.w], i * 4); else q[i * 4] = NaN;
    }
    if (i < n) setTimeout(slice, 0); else done(q);
  };
  slice();
}

/** A bend that changes nothing (nothing reaches the water or the glass): remembered so it is not tried again. */
const noBend = (ks: string) => { if (unbent.size > 4000) unbent.clear(); unbent.add(ks); };

/** One placed item as a mesh in tank space (userData.item = its id, userData.plant for plants). Null = no room for it. */
export function itemMesh(S: TankSetup, T: Tank, it: Item): THREE.Mesh | null {
  const ground = groundHeight(S, T, it.x, it.depth), y = ground + it.lift - itemSink(it);
  let m: THREE.Mesh;
  if (it.kind === 'plant') {
    const P = plantPlan(S, T, it);
    if (!P) return null;
    const { carpet, gr, at } = P;
    let g: THREE.BufferGeometry;
    {
      // full growth, built once per (seed, size, clump); a carpet is then set on the ground (per place)
      const full = plants.get(P.kf) ?? remember(plants, P.kf, plantGeometry(...P.args), PLANTS_MAX, dropPlant);
      let src = full, ks = P.kf;
      if (carpet) { ks = P.ks; src = plants.get(ks) ?? remember(plants, ks, carpetOnGround(full, at), PLANTS_MAX, dropPlant); }
      else if (P.bend) {
        const { F, C, water, walls } = P.bend;
        ks = P.bend.ks;
        src = bent.get(ks) ?? (unbent.has(ks) ? full : (() => { const b = bendPlant(full, F, { ceil: C, water, walls }); if (b === full) noBend(ks); return b === full ? b : remember(bent, ks, b, BENT_MAX, dropPlant); })());
      }
      const cg = P.off && clumpOnGround(src, P.off, P.bend?.F);
      if (cg) { ks = `${ks}|${cg.key}`; src = plants.get(ks) ?? remember(plants, ks, cg.build(), PLANTS_MAX, dropPlant); }
      // the growth: the plant already built, revealed at gr by its material's shader (a slider drag touches no geometry);
      // what the CPU needs of it (picking, the selection box, the USDZ export) is revealed on the CPU when asked
      const kr = `${ks}|${gr}`, from = src;
      if (plant3d.gpu) g = grownView(src, gr, () => shown.get(kr) ?? remember(shown, kr, revealPlant(from, gr), 80));
      else g = shownCpu.get(kr) ?? (() => { const v = revealPlant(src, gr); return v === src ? v : remember(shownCpu, kr, v, 80, dispose); })(); // (review switch: GR3's CPU reveal)
    }
    m = new THREE.Mesh(g, plantMaterial(T));
    if (g.userData.cpu) m.raycast = plantRaycast;
    m.userData.plant = true;
  } else m = new THREE.Mesh(bakedShape(it), solidMaterial(T));
  m.position.set(it.x, it.kind === 'plant' && isFloat(it.variant) ? waterY(T, S.water.level) : y + (m.geometry.userData.rise ?? 0), -it.depth);
  m.rotation.copy(itemEuler(it));
  // stencil capping counts surfaces along a sightline, so it needs a watertight mesh: only stone is (wood limbs have a
  // seam crack and open joints, caves and bark shells are open shells), and a leaking one paints black blobs through it
  if (it.kind === 'stone') capPasses(m, T, it.id);
  m.userData.item = it.id;
  if (it.kind === 'coral') m.userData.coral = true;
  return m;
}

const PROBE_RAY = new THREE.Raycaster(), PROBE_DOWN = V(0, -1, 0), _o = V(0, 0, 0), _nm = new THREE.Matrix3();
/**
 * The anchors' look straight down onto the solid pieces (scene/anchors.ts): the highest hit on `solids` (matrices up to
 * date; no corals) under (x, depth), from above the room. `T` sets how high the ray starts.
 */
export function solidProbe(T: Tank, solids: THREE.Object3D[]): NonNullable<AnchorProbe['down']> {
  return (x, depth) => {
    PROBE_RAY.set(_o.set(x, T.H * 3 + 1000, -depth), PROBE_DOWN);
    const h = PROBE_RAY.intersectObjects(solids, false)[0];
    if (!h) return null;
    const o = h.object, n = h.face ? h.face.normal.clone().applyMatrix3(_nm.getNormalMatrix(o.matrixWorld)).normalize() : V(0, 1, 0);
    const l = o.worldToLocal(h.point.clone());
    return {
      y: h.point.y, n: [n.x, n.y, -n.z], item: o.userData.item, local: [l.x, l.y, l.z],
      toTank: v => { const w = o.localToWorld(V(...v)); return [w.x, w.y, -w.z]; },
    };
  };
}

/**
 * The anchors' look straight down onto plant leaves (scene/anchors.ts `leaf`): the first leaf surface under (x, depth)
 * whose normal points up at least `up` (its y component: 0.6 = a perch, 0.3 = steep enough for an animal that clings) and
 * that sits at least `clear` mm above the ground there (the carpet and the crowns are the ground's).
 * `plants` = the plant meshes (matrices up to date); they are raycast on what shows at their growth (plantRaycast).
 */
export function leafProbe(T: Tank, plants: THREE.Object3D[], ground: (x: number, depth: number) => number, clear = 8): NonNullable<AnchorProbe['leaf']> {
  const rc = new THREE.Raycaster(), nm = new THREE.Matrix3();
  return (x, depth, up) => {
    rc.set(_o.set(x, T.H * 3 + 1000, -depth), PROBE_DOWN);
    const g = ground(x, depth);
    for (const h of rc.intersectObjects(plants, false)) {
      if (!h.face || h.point.y < g + clear) continue;
      const n = h.face.normal.clone().applyMatrix3(nm.getNormalMatrix(h.object.matrixWorld)).normalize();
      if (n.y < 0) n.negate();
      if (n.y >= up) return { y: h.point.y, n: [n.x, n.y, -n.z] };
    }
    return null;
  };
}

/**
 * The anchors' look straight up from the ground at the undersides of plant leaves (anchors `under`): of the leaf surfaces
 * over (x, depth) that face down at least `up` (their normal's -y) and clear the ground by `clear` mm, the one nearest
 * height `y0`, with its normal turned to point down.
 */
export function leafUnderProbe(plants: THREE.Object3D[], ground: (x: number, depth: number) => number, clear = 8): NonNullable<AnchorProbe['under']> {
  const rc = new THREE.Raycaster(), nm = new THREE.Matrix3(), UPV = V(0, 1, 0);
  return (x, depth, y0, up) => {
    const g = ground(x, depth);
    rc.set(_o.set(x, g + 1, -depth), UPV);
    let best: { y: number; n: V3 } | null = null;
    for (const h of rc.intersectObjects(plants, false)) {
      if (!h.face || h.point.y < g + clear) continue;
      const n = h.face.normal.clone().applyMatrix3(nm.getNormalMatrix(h.object.matrixWorld)).normalize();
      if (n.y > 0) n.negate();
      if (-n.y >= up && (!best || Math.abs(h.point.y - y0) < Math.abs(best.y - y0))) best = { y: h.point.y, n: [n.x, n.y, -n.z] };
    }
    return best;
  };
}

/** mm a seated coral's base goes into the rock (it rests on it, never a hair above). */
export const SEAT_SINK = 3;

const BOTH_SIDES = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const _n = V(0, 0, 0);
/**
 * The rock surface a coral planned at height `y` over (x, depth) rests on: with `y` in the water, the first top below
 * it; with `y` inside a rock (a guessed or tipped top), that rock's own top above it. Null = no rock under it. `solids`
 * are see-from-both-sides copies, so the ray finds where it goes into a rock (face up) and out of it (face down).
 */
function restingTop(solids: THREE.Object3D[], x: number, depth: number, y: number): number | null {
  const hits = new THREE.Raycaster(V(x, 1e5, -depth), V(0, -1, 0)).intersectObjects(solids, false);
  let inside = 0, last: number | null = null, below = false;
  for (const h of hits) {
    if (!below && h.point.y < y) { below = true; if (inside > 0) return last; }
    if (_n.copy(h.face!.normal).transformDirection(h.object.matrixWorld).y > 0) {
      if (inside === 0) { if (below) return h.point.y; last = h.point.y; }
      inside++;
    } else inside = Math.max(0, inside - 1);
  }
  return !below && inside > 0 ? last : null;
}

/**
 * Lift (above the ground) that seats a coral of `it`'s size at (x, depth), planned at height `y`, on the rock: the
 * highest resting top (restingTop) under the middle of its foot, SEAT_SINK into it (a top more than a steep slope above
 * the middle's is a wall, skipped); 0 = no rock under it, so the ground.
 * Going by the planned height (not the sky) keeps a coral on its ledge under a higher rock.
 */
export function coralSeat(S: TankSetup, it: Item, solids: THREE.Object3D[], y: number, x = it.x, depth = it.depth): number {
  const r = itemDims(it)[0] * 0.08, g = groundHeight(S, S.tank, x, depth);
  const both = solids.map(o => { const m = new THREE.Mesh((o as THREE.Mesh).geometry, BOTH_SIDES); m.matrixWorld.copy(o.matrixWorld); return m; });
  // the middle of the foot says which rock; the rest raise it on a slope, but a rock face rising past the foot (a higher
  // rock it is tucked under) is a wall, not a seat. With no rock under the middle, the foot hangs from the rock's edge.
  const mid = restingTop(both, x, depth, y), around = [[r, 0], [-r, 0], [0, r], [0, -r]].map(([dx, dd]) => restingTop(both, x + dx, depth + dd, y)).filter((t): t is number => t != null);
  const top = mid == null ? Math.max(-Infinity, ...around) : Math.max(mid, ...around.filter(t => t <= mid + 2 * r));
  return top > g ? Math.round(top - g - SEAT_SINK) : 0;
}

/**
 * Seat each raised coral of a fresh layout on the rock it was meant for (coralSeat from its planned base, so not onto a
 * rock stacked higher up): the layouts only guess a rock's top from its box.
 */
export function seatCorals(S: TankSetup) {
  const T = S.tank, rocks = S.items.filter(it => it.kind !== 'plant' && it.kind !== 'coral').map(it => itemMesh(S, T, it)).filter((m): m is THREE.Mesh => !!m);
  for (const m of rocks) m.updateMatrixWorld(true);
  for (const it of S.items) {
    if (it.kind !== 'coral' || it.lift <= 0) continue;
    it.lift = coralSeat(S, it, rocks, groundHeight(S, T, it.x, it.depth) + it.lift);
  }
}
seatHook.corals = seatCorals;
