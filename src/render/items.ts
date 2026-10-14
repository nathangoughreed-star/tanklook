// Meshes for aquascape items (scene/items.ts). Stones, wood and caves are real 3D, shaded per vertex (a top-front-left
// light baked in, like the hood and substrate); plants are real 3D where the species has a `PLANT3D` entry
// (render/plant3d.ts), crossed cards otherwise (one facing the glass, one edge-on, so they keep some body when orbiting).
// Each item is ONE mesh, so picking and the selection box are simple. Shapes are cached by (variant, seed, size) and the
// baked colours by turn as well: the scene rebuilds on every drag step.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { PLANT_ASPECT, isCarpet, isFloat, type PlantType } from '../art/plants';
import { CARPET_H, CARPET_W, itemDims, itemSink, seatHook, stoneDims, woodLimbs, type Limb } from '../scene/items';
import { D2R, waterY } from '../scene/physics';
import { bowlDims, footprint, shapeOf } from '../scene/shape';
import { clampGround, groundHeight, groundInsideBy } from '../scene/terrain';
import type { Item, Tank, TankSetup } from '../scene/types';
import { carpetOnGround, has3DPlant, plant3d, plantGeometry } from './plant3d';
import { reefShape } from './coral3d';
import { cardMaterial, plantTexture } from './textures';

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
const GRIT_KIND: Record<string, number> = { river: 1, seiryu: 2, dragon: 3, lava: 4, slate: 5, tube: 7, coconut: 8, arch: 2 };
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
};
function stoneShape(variant: string, seed: number, size: number) {
  const r = rng(seed), [l, h, w] = stoneDims(variant, seed, size), base = C(STONE[variant][Math.floor(r() * STONE[variant].length)]);
  if (variant === 'slate') return slab(r, l, h, w, base);
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
function slab(r: R, l: number, h: number, w: number, base: THREE.Color) {
  const g = new THREE.BoxGeometry(1, 1, 1, 6, 3, 5), nz = waves(r), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const e = nz(v.clone().multiplyScalar(3.2)), edge = Math.max(Math.abs(v.x), Math.abs(v.z)) * 2; // 1 at the rim
    const x = v.x * (1 + 0.12 * e), z = v.z * (1 + 0.12 * nz(v.clone().addScalar(3).multiplyScalar(2.6)));
    const y = (v.y + 0.5) * (v.y > 0 ? 1 - 0.25 * Math.max(0, edge - 0.6) + 0.06 * e : 1);
    p.setXYZ(i, x * l, y * h, z * w);
  }
  const ng = clean(g, false) as THREE.BufferGeometry;
  ng.computeVertexNormals();
  return paint(ng, q => shade(base, 1 + 0.1 * Math.sin(q.y / h * 22 + q.x * 0.01) + 0.06 * Math.sin(q.x * 0.05 + q.z * 0.07)));
}

// ---------- Wood ----------
const WOOD: Record<string, [string, string]> = { branch: ['#6b4a2e', '#5e4128'], spider: ['#a3845e', '#8e7050'], manzanita: ['#74392a', '#8b4a36'], mopani: ['#3e2a1c', '#a3855c'] };
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
  const r = rng(seed * 13 + 5), rs = rng(seed * 29 + 1), o = gritOffset(seed)[0];
  return mergeGeometries(woodLimbs(variant, seed, size).map((L, i) => limbGeo(r, rs, L, WOOD[variant] ?? WOOD.branch, variant, o + i * 977)))!;
}

// ---------- Caves ----------
function caveShape(variant: string, seed: number, size: number) {
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
/** Crossed cards, base at y = 0; a carpet patch = many small crossed cards in a disc, each set on the ground under it
 *  (spot() moves a card in from the glass and gives the width it has room for, or null leaves it out). */
function plantGeo(type: PlantType, seed: number, h: number, spot?: (lx: number, lz: number) => { x: number; y: number; z: number; w: number } | null, spread?: number) {
  const cards: THREE.BufferGeometry[] = [];
  const card = (w: number, hh: number, x: number, y: number, z: number, turn: number, crop = 1) => {
    for (const k of [0, 1]) {
      const pg = new THREE.PlaneGeometry(w, hh), uv = pg.attributes.uv;
      if (crop < 1) for (let i = 0; i < uv.count; i++) uv.setX(i, 0.5 + (uv.getX(i) - 0.5) * crop); // a narrowed card shows the middle of the picture, not a squeezed one
      cards.push(pg.translate(0, hh / 2, 0).rotateY(turn + k * Math.PI / 2).translate(x, y, z));
    }
  };
  if (isCarpet(type)) {
    const r = rng(seed), rad = h / 2 - CARPET_W * 0.35, n = Math.max(3, Math.round(h * h / 4200));
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * Math.max(0, rad), x = Math.cos(a) * d, z = Math.sin(a) * d;
      const hh = CARPET_H * (0.8 + r() * 0.4), turn = (r() - 0.5) * 0.5, p = spot ? spot(x, z) : { x, y: 0, z, w: CARPET_W }; // draws taken even for a dropped card: the rest stay put
      if (p) card(p.w, hh, p.x, p.y, p.z, turn, p.w / CARPET_W);
    }
  } else if (isFloat(type)) card(h, h * PLANT_ASPECT[type], 0, -h * PLANT_ASPECT[type] * 0.92, 0, 0); // the card's top band at the surface
  else card(spread ? Math.max(spread, h / PLANT_ASPECT[type]) : h / PLANT_ASPECT[type], h, 0, 0, 0, 0);
  const g = mergeGeometries(cards)!;
  g.userData.keep = true;
  return g;
}

// ---------- Grit shader ----------
/** Fragment code: gritK() = how much darker or lighter this pixel of a solid is, from vGrit (see grit()). Detail finer than
 *  about a pixel fades out (px = mm per pixel), so distant pieces do not shimmer. */
const GRIT = `varying vec4 vGrit;
float gH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float gN(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gH(i), gH(i + vec3(1, 0, 0)), f.x), mix(gH(i + vec3(0, 1, 0)), gH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(gH(i + vec3(0, 0, 1)), gH(i + vec3(1, 0, 1)), f.x), mix(gH(i + vec3(0, 1, 1)), gH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float gF(vec3 p) { float a = 0.0, w = 0.5; for (int k = 0; k < 3; k++) { a += w * gN(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); w *= 0.5; } return a / 0.875; }
// distance to the nearest cell border of a jittered grid: zero along a network of cracks
float gEdge(vec3 p) {
  vec3 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(x, y, z), o = vec3(gH(i + g), gH(i + g + 11.3), gH(i + g + 27.1));
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
    if (gH(id + 41.9) > 0.42) continue;
    float sc = (id.x + 0.2 + 0.6 * gH(id + 0.5)) * cs, tc = (float(j) + gH(id + 17.3)) * 2.094395;
    float dt = mod(th - tc + 3.14159, 6.28318) - 3.14159, sz = r * (0.22 + 0.3 * gH(id + 63.1));
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
  if (t == 1) k = gStone(q, px, 0.25, 0.3);
  else if (t == 2) k = gStone(q, px, 0.6, 1.0);
  else if (t == 3) k = gStone(q, px, 1.1, 0.6);
  else if (t == 4) k = gStone(q, px, 1.4, 0.35);
  else if (t == 5) {  // slate: fissures along the layers over the fine grain
    float e = abs(gN(vec3(p.x * 0.02, p.y * 0.35, p.z * 0.02)) * 2.0 - 1.0), m = smoothstep(0.4, 0.6, gN(p * 0.03 + 4.0));
    k = gStone(q, px, 0.4, 0.5) * (1.0 - 0.55 * gLine(e, 0.05) * m);
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
/** The clipping planes and the bowl's sphere cut (a shader patch adding vGlassW) for one tank outline. */
function glassClip(T: Tank) {
  const bowl = shapeOf(T) === 'bowl', planes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
  // keep where -((x - a.x) n.x + (depth - a.d) n.d) >= 0, i.e. insideBy; world z = -depth
  if (!bowl) for (const e of footprint(T).edges) planes.push(new THREE.Plane(new THREE.Vector3(-e.n[0], 0, e.n[1]), e.a[0] * e.n[0] + e.a[1] * e.n[1]));
  const b = bowl ? bowlDims(T) : null;
  const uC = { value: new THREE.Vector3(T.L / 2, b?.c ?? 0, -T.D / 2) }, uR = { value: b?.R ?? 1e9 }, uTop = { value: b?.H ?? 0 };
  const patch = (sh: THREE.WebGLProgramParametersWithUniforms) => {
    Object.assign(sh.uniforms, { uC, uR, uTop });
    sh.vertexShader = 'varying vec3 vGlassW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vGlassW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vGlassW;\nuniform vec3 uC;\nuniform float uR;\nuniform float uTop;\n' + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (vGlassW.y < uTop && distance(vGlassW, uC) > uR) discard;');
  };
  return { planes, patch };
}
function solidMaterial(T: Tank) {
  const k = glassKey(T);
  let m = glassMats.get(k);
  if (m) return m;
  const { planes, patch } = glassClip(T);
  // both sides drawn: where the glass cuts a piece open, its inside shows as a flat darker cut face, so it reads solid
  m = new THREE.MeshBasicMaterial({ vertexColors: true, clippingPlanes: planes, side: THREE.DoubleSide });
  // the lighting pass (render/lighting.ts aqPatch) takes over onBeforeCompile and runs userData.pre first
  const pre = (sh: THREE.WebGLProgramParametersWithUniforms) => {
    patch(sh);
    sh.vertexShader = 'attribute vec4 aGrit;\nvarying vec4 vGrit;\n' + sh.vertexShader.replace('vGlassW = ', 'vGrit = aGrit; vGlassW = ');
    sh.fragmentShader = GRIT + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= gritK();')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  if (!gl_FrontFacing) gl_FragColor.rgb *= 0.55;');
  };
  m.onBeforeCompile = pre;
  m.customProgramCacheKey = () => 'glass-clip';
  Object.assign(m.userData, { keep: true, solid: true, pre });
  return remember(glassMats, k, m, 16, x => x.dispose());
}
/** 3D plants are cut off at the glass the same way (a leaf arching past a pane stops at it), one material per outline. */
const plantMats = new Map<string, THREE.MeshBasicMaterial>();
function plantMaterial(T: Tank) {
  const k = glassKey(T);
  let m = plantMats.get(k);
  if (m) return m;
  const { planes, patch } = glassClip(T);
  m = new THREE.MeshBasicMaterial({ vertexColors: true, clippingPlanes: planes });
  m.onBeforeCompile = patch;
  m.customProgramCacheKey = () => 'plant-clip';
  Object.assign(m.userData, { cached: true, keep: true, plantClip: true, pre: patch });
  return remember(plantMats, k, m, 16, x => x.dispose());
}
const shapes = new Map<string, THREE.BufferGeometry>(), baked = new Map<string, THREE.BufferGeometry>(), plants = new Map<string, THREE.BufferGeometry>();
function remember<T>(m: Map<string, T>, k: string, v: T, max: number, drop?: (v: T) => void) {
  m.set(k, v);
  if (m.size > max) { const [k0, v0] = m.entries().next().value!; m.delete(k0); drop?.(v0); }
  return v;
}
const dispose = (g: THREE.BufferGeometry) => g.dispose();

function solidShape(it: Item) {
  const k = `${it.variant}|${it.seed}|${it.size}`;
  const make = () => grit(it.kind === 'coral' || it.variant === 'liverock' ? reefShape(it.variant, it.seed, it.size) : it.kind === 'stone' ? stoneShape(it.variant, it.seed, it.size) : it.kind === 'wood' ? woodShape(it.variant, it.seed, it.size) : caveShape(it.variant, it.seed, it.size), GRIT_KIND[it.variant] ?? 2, it.seed);
  return shapes.get(k) ?? remember(shapes, k, make(), 150, dispose);
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

/** One placed item as a mesh in tank space (userData.item = its id, userData.plant for plants). Null = no room for it. */
export function itemMesh(S: TankSetup, T: Tank, it: Item): THREE.Mesh | null {
  const ground = groundHeight(S, T, it.x, it.depth), y = ground + it.lift - itemSink(it);
  let m: THREE.Mesh;
  if (it.kind === 'plant') {
    const type = it.variant as PlantType, carpet = isCarpet(type), float = isFloat(type);
    if (float && !S.water.on) return null; // floaters need water
    const h = carpet || float ? it.size : Math.min(it.size, T.H - y - 15); // stops at the water line (the old layouts' rule)
    if (h < 15) return null;
    const c = Math.cos(it.yaw * D2R), s = Math.sin(it.yaw * D2R);
    // a carpet hugs the ground under each card: its key carries the spot (rebuilt only while it moves); the rest key on
    // the exact height they are built with (a rounded one let two near-equal plants share the first one's mesh)
    const k = carpet ? `${type}|${it.seed}|${it.size}|${it.x}|${it.depth}|${it.yaw}|${it.lift}|${T.shape}|${T.L}|${T.D}|${T.sides}|${T.bowMin}|${T.bowlFloor}|${T.bowlTop}` : `${type}|${it.seed}|${h}|${it.spread ?? ''}|${it.stems ?? ''}`;
    // near the glass a card is cut down to the width it has room for, so the carpet runs right up to the glass without
    // poking through; a card past the edge line is mirrored back in by as much (keeping the edge thick), and one more
    // than half a card past it is left out
    const EDGE = 8;
    const at = (lx: number, lz: number) => {
      let x = it.x + lx * c + lz * s, d = it.depth + lx * s - lz * c;
      const e = EDGE - groundInsideBy(S, T, x, d);
      if (e > CARPET_W / 2) return null;
      if (e > 0) ({ x, depth: d } = clampGround(S, T, x, d, EDGE + e));
      const dx = x - it.x, dd = d - it.depth;
      return { x: dx * c + dd * s, y: groundHeight(S, T, x, d) - ground, z: dx * s - dd * c, w: Math.min(CARPET_W, 2 * groundInsideBy(S, T, x, d)) };
    };
    const solid = has3DPlant(type), k3 = (solid ? `3d${plant3d.sway ? 's' : ''}|` : '') + k;
    // a 3D carpet is built once per (seed, size), then only set on the ground here
    const make = () => !solid ? plantGeo(type, it.seed, h, carpet ? at : undefined, it.spread) : !carpet ? plantGeometry(type, it.seed, h, { spread: it.spread, stems: it.stems })
      : carpetOnGround(plants.get(`3d${plant3d.sway ? 's' : ''}|${type}|${it.seed}|${it.size}`) ?? remember(plants, `3d${plant3d.sway ? 's' : ''}|${type}|${it.seed}|${it.size}`, plantGeometry(type, it.seed, h), 300, dispose), at);
    const g = plants.get(k3) ?? remember(plants, k3, make(), 300, dispose);
    if (carpet) g.computeBoundingBox();
    m = new THREE.Mesh(g, solid ? plantMaterial(T) : cardMaterial('plant:' + type, plantTexture(type), S.render.edge));
    m.userData.plant = true;
  } else m = new THREE.Mesh(bakedShape(it), solidMaterial(T));
  m.position.set(it.x, it.kind === 'plant' && isFloat(it.variant) ? waterY(T, S.water.level) : y + (m.geometry.userData.rise ?? 0), -it.depth);
  m.rotation.copy(itemEuler(it));
  m.userData.item = it.id;
  if (it.kind === 'coral') m.userData.coral = true;
  return m;
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
