// Generated rocks (lane HG1, R187, 2026-11-27): one form per type, from the seed and the piece's look settings
// (scene/hardgen.ts): rounded river stone, faceted and ridged seiryu, wrinkled and pitted dragon stone, porous lava,
// lacy holed lace rock, round-holed limestone, layered and stepped shale, stacked flat slate plates. Each is a unit
// icosphere pushed in and out along its normals by noise (slate: extruded plates), then sized to stoneDims and given
// unlit colours per vertex (cavities darker, the type's own staining); render/items.ts bakes the light and adds the grit.
// Looks written down from photos: research/hardscape/refs.md.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { STONE_COLS, STONE_SEEDED, hsv } from '../scene/hardgen';
import { stoneDims } from '../scene/items';
import type { HardStyle } from '../scene/types';

type N3 = (x: number, y: number, z: number) => number;
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Seeded value noise in 0..1, smooth (quintic), period 256. */
export function noise3(seed: number): N3 {
  const r = rng(seed * 7 + 11), perm = new Uint8Array(512), val = new Float32Array(256);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) val[i] = r();
  const h = (x: number, y: number, z: number) => val[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]];
  const f = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = f(x - xi), v = f(y - yi), w = f(z - zi);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
  };
}
/** Fractal sum, -1..1 roughly. */
const fbm = (n: N3, x: number, y: number, z: number, oct = 4) => { let a = 0, w = 0.5, s = 0; for (let k = 0; k < oct; k++) { a += w * (n(x, y, z) * 2 - 1); s += w; x = x * 2.03 + 17.1; y = y * 2.03 + 3.7; z = z * 2.03 + 9.2; w *= 0.5; } return a / s; };
/** Ridged fractal, 0..1: sharp crests where the noise crosses its middle. */
const ridged = (n: N3, x: number, y: number, z: number, oct = 3) => { let a = 0, w = 0.5, s = 0; for (let k = 0; k < oct; k++) { a += w * (1 - Math.abs(n(x, y, z) * 2 - 1)) ** 2; s += w; x = x * 2.1 + 5.3; y = y * 2.1 + 1.1; z = z * 2.1 + 7.9; w *= 0.5; } return a / s; };
/** Cell noise: distances to the nearest and second nearest jittered point [F1, F2] (cell size 1). */
export function worley(seed: number) {
  const n = noise3(seed * 3 + 1), m = noise3(seed * 5 + 2), o = noise3(seed * 11 + 3);
  return (x: number, y: number, z: number): [number, number] => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let d1 = 9, d2 = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const X = xi + a, Y = yi + b, Z = zi + c, px = X + n(X + 0.5, Y + 0.5, Z + 0.5), py = Y + m(X + 0.5, Y + 0.5, Z + 0.5), pz = Z + o(X + 0.5, Y + 0.5, Z + 0.5);
      const d = Math.hypot(px - x, py - y, pz - z);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return [d1, d2];
  };
}

/** The colour a stone draws in (its swatch, or one picked from the seed as before HG1), with its shade. */
export function stoneBase(variant: string, seed: number, hs?: HardStyle) {
  const cols = STONE_COLS[variant] ?? STONE_COLS.river, r = rng(seed);
  const i = hs?.col != null && hs.col < cols.length ? hs.col : Math.floor(r() * (STONE_SEEDED[variant] ?? cols.length));
  return new THREE.Color(cols[i].hex).multiplyScalar(shadeK(hs));
}
/** Shade setting -> brightness factor (0.5 = 1). */
export const shadeK = (hs?: HardStyle) => 0.55 + 0.9 * hsv(hs, 'tone');

const GEN = new Set(['river', 'seiryu', 'dragon', 'holey', 'lace', 'lava', 'shale', 'slate']);
export const isGenRock = (v: string) => GEN.has(v);

/** A generated rock: base on y = 0, [length, height, width] = stoneDims, unlit 'color' per vertex. */
export function genRock(variant: string, seed: number, size: number, hs?: HardStyle): THREE.BufferGeometry {
  const [l, h, w] = stoneDims(variant, seed, size, hs), base = stoneBase(variant, seed, hs);
  if (variant === 'slate') return slatePlates(seed, l, h, w, base, hs);
  const r = rng(seed * 101 + 7), tex = hsv(hs, 'tex'), holes = hsv(hs, 'holes'), layers = hsv(hs, 'layers');
  const N = noise3(seed), N2 = noise3(seed + 999), W = worley(seed), W2 = worley(seed + 77);
  const det = ({ river: 12, seiryu: 16, dragon: 22, lava: 24, lace: 26, holey: 22, shale: 14 } as Record<string, number>)[variant] ?? 16;
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, det);
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  const p = g.attributes.position, cnt = p.count, cav = new Float32Array(cnt), aux = new Float32Array(cnt);
  const ox = r() * 50, oy = r() * 50, oz = r() * 50;
  // plane cuts (seiryu, shale): flat fractured faces, leaning up and out, a few steep
  const cuts = variant === 'shale' || variant === 'seiryu' ? Array.from({ length: variant === 'shale' ? 12 : 14 }, () => ({ n: new THREE.Vector3(r() - 0.5, r() * 0.9 - 0.1, r() - 0.5).normalize(), d: (variant === 'shale' ? 0.62 : 0.6) + 0.25 * r() })) : [];
  const nL = 3 + Math.round(layers * 7), lay = Array.from({ length: 12 }, () => 0.8 + 0.28 * r());
  const v = new THREE.Vector3();
  for (let i = 0; i < cnt; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const x = v.x + ox, y = v.y + oy, z = v.z + oz;
    // the bulk: a lopsided lump (big slow bulges and a few smaller ones), so no two pieces are the same dome
    const bulk = 0.32 * fbm(N, x * 0.8, y * 0.8, z * 0.8, 3) + 0.12 * fbm(N, x * 2.1 + 9, y * 2.1, z * 2.1, 2);
    let rho = 1, c = 0, a = 0;
    switch (variant) {
      case 'river': rho = 1 + 0.35 * bulk + 0.006 * tex * fbm(N2, x * 8, y * 8, z * 8, 2); break;
      case 'seiryu': { // a craggy lump with deep vertical grooves and sharp crests
        const gr = ridged(N2, x * 4.5, y * 1.3, z * 4.5);
        rho = 1 + bulk + (0.05 + 0.1 * layers) * (gr - 0.5) * (0.6 + tex * 0.8);
        c = Math.max(0, 0.5 - gr) * 1.4; a = gr; break;
      }
      case 'dragon': { // craggy: stacked scaly ridges (squashed vertically), pitted, with a jagged top
        const wr = ridged(N2, x * 2.2, y * 7, z * 2.2), [f1] = W(x * (3 + 3 * holes), y * (5 + 4 * holes), z * (3 + 3 * holes)), pit = smooth(0.38, 0.06, f1);
        rho = 1 + 1.1 * bulk + 0.18 * Math.max(0, fbm(N2, x * 2.5, y * 1.2, z * 2.5, 2)) * Math.max(0, v.y + 0.3) + (0.05 + 0.08 * tex) * wr - pit * (0.04 + 0.16 * holes);
        c = Math.min(1, pit * 1.2 + (1 - wr) * 0.35); break;
      }
      case 'lava': { // porous: big and small vesicles all over
        const [f1] = W(x * (6 + 6 * holes), y * (6 + 6 * holes), z * (6 + 6 * holes)), [g1] = W2(x * 16, y * 16, z * 16), p1 = smooth(0.4, 0.1, f1), p2 = smooth(0.35, 0.05, g1);
        rho = 1 + bulk - p1 * (0.03 + 0.12 * holes) - p2 * 0.025 * (0.5 + tex);
        c = Math.min(1, p1 + 0.6 * p2); break;
      }
      case 'lace': { // lacy: the cell middles eaten out, ridges left along the cell borders, deep holes between
        const k = 2.4 + 2.4 * holes, [f1, f2] = W(x * k, y * k, z * k), [g1] = W2(x * 7, y * 7, z * 7);
        const mid = smooth(0.1, 0.4, f2 - f1) ** 1.5, pock = smooth(0.3, 0.08, g1);
        rho = 1 + 1.2 * bulk - mid * (0.12 + 0.3 * holes) - pock * (0.02 + 0.04 * tex);
        const mid2 = pock;
        c = Math.min(1, mid * 0.9 + mid2 * 0.4); a = smooth(0.3, 0.8, N2(x * 2, y * 2, z * 2)); break;
      }
      case 'holey': { // limestone with big round holes and smaller pocks
        const k = 2 + 2.2 * holes, [f1] = W(x * k, y * k, z * k), [g1] = W2(x * 7, y * 7, z * 7), hole = smooth(0.46, 0.2, f1) ** 1.5, pock = smooth(0.32, 0.1, g1);
        rho = 1 + bulk - hole * (0.18 + 0.4 * holes) - pock * 0.05;
        c = Math.min(1, hole * 1.1 + pock * 0.5); break;
      }
      case 'shale': rho = 1.25 + 0.4 * bulk + 0.04 * fbm(N, x * 3, y * 3, z * 3); break;
    }
    v.multiplyScalar(rho);
    if (variant === 'dragon' || variant === 'lace' || variant === 'seiryu') { // a jagged skyline: a few peaks and saddles on top
      const pk = fbm(N2, x * 1.6 + 40, 0, z * 1.6, 3);
      v.y += (variant === 'seiryu' ? 0.35 : 0.55) * Math.max(0, pk + 0.1) * Math.max(0, v.y + 0.2);
    }
    if (variant === 'shale') { // layers: each band set in or out, so the sides step like stacked plates
      const t = (v.y + 1.3) / 2.6 * nL + 0.35 * fbm(N2, x * 2, 0, z * 2), li = Math.max(0, Math.min(11, Math.floor(t))), f = t - Math.floor(t);
      const k = lay[li]; v.x *= k; v.z *= k;
      c = f < 0.12 ? 1 - f / 0.12 : 0; // the seam between two layers
    }
    for (const q of cuts) { const t = v.dot(q.n); if (t > q.d) v.multiplyScalar(q.d / t); }
    p.setXYZ(i, v.x, v.y, v.z); cav[i] = c; aux[i] = a;
  }
  // size it: x and z to the dims, the base cut flat a little above the bottom, the top to the height
  let lo = Infinity, hi = -Infinity, xl = Infinity, xh = -Infinity, zl = Infinity, zh = -Infinity;
  for (let i = 0; i < cnt; i++) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); xl = Math.min(xl, p.getX(i)); xh = Math.max(xh, p.getX(i)); zl = Math.min(zl, p.getZ(i)); zh = Math.max(zh, p.getZ(i)); }
  const cut = lo + (hi - lo) * (variant === 'river' ? 0.22 : 0.12), kx = l / (xh - xl), kz = w / (zh - zl), ky = h / (hi - cut), cx = (xl + xh) / 2, cz = (zl + zh) / 2;
  for (let i = 0; i < cnt; i++) p.setXYZ(i, (p.getX(i) - cx) * kx, (Math.max(p.getY(i), cut) - cut) * ky, (p.getZ(i) - cz) * kz);
  const facets = variant === 'shale' || variant === 'seiryu';
  g.computeVertexNormals();
  const hollow = cavity(g, Math.max(l, w) / 40);
  // unlit colours
  const col = new Float32Array(cnt * 3), q = new THREE.Color(), nm = g.attributes.normal;
  const rust = new THREE.Color('#7e6636'), rust2 = new THREE.Color('#664630'), vein = new THREE.Color('#d9dcd8'), crust = new THREE.Color('#7a6248'), dark = new THREE.Color('#141110');
  for (let i = 0; i < cnt; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), mot = fbm(N2, X * 0.02 + 3, Y * 0.02, Z * 0.02, 3);
    q.copy(base).multiplyScalar(1 + 0.18 * mot);
    const c = cav[i];
    if (variant === 'shale') { // iron stain: patches of dull gold and rust, strongest on the upper faces
      const st = smooth(0.1, 0.45, fbm(N, X * 0.012, Y * 0.03, Z * 0.012, 3)) * (0.5 + 0.5 * Math.max(0, nm.getY(i)));
      q.lerp(rust.clone().lerp(rust2, smooth(-0.3, 0.3, mot)), 0.55 * st).multiplyScalar(1 - 0.45 * c);
    } else if (variant === 'seiryu') {
      q.multiplyScalar(0.7 + 0.3 * aux[i]);
      if (Math.abs(Math.sin(Y * 0.05 + X * 0.012 + 6 * fbm(N, X * 0.008, Y * 0.008, Z * 0.008, 2))) < 0.025 + 0.02 * tex) q.lerp(vein, 0.35); // calcite veins
    } else if (variant === 'lace') { // grey crests, rust-brown crust down in the holes
      q.lerp(crust, 0.5 * c * (0.5 + 0.5 * aux[i])).multiplyScalar(1 - 0.55 * c);
    } else if (variant === 'lava') q.lerp(dark, 0.6 * c);
    else if (variant === 'river') q.multiplyScalar(1 + 0.06 * fbm(N, X * 0.08, Y * 0.08, Z * 0.08, 2));
    else q.multiplyScalar(1 - (variant === 'holey' ? 0.55 : 0.5) * c);
    // R191: the form reads without the light: hollows and crevices darken, worn crests and edges lighten a little
    const hv = hollow[i]; q.multiplyScalar(hv > 0 ? 1 - CAV_DARK * smooth(0, 1, hv) : 1 + 0.14 * smooth(0, 1, -hv));
    col[i * 3] = q.r; col[i * 3 + 1] = q.g; col[i * 3 + 2] = q.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (facets) { g = g.toNonIndexed(); g.computeVertexNormals(); }
  return g;
}

/** How dark the deepest hollows get (R191). */
const CAV_DARK = 0.62;
/**
 * Concavity per vertex of an indexed mesh, about -1 (a crest) .. 1 (a hollow): how far the average of its neighbours,
 * spread over a few rings, sits out along its normal, in units of `scale` mm. Baked into the colour so a rock's form
 * shows under flat light too (R191, after Aquascaper Studio's cavity-darkened stones).
 */
export function cavity(g: THREE.BufferGeometry, scale: number): Float32Array {
  const p = g.attributes.position, n = g.attributes.normal, cnt = p.count, idx = g.index!;
  const nb: number[][] = Array.from({ length: cnt }, () => []);
  for (let k = 0; k < idx.count; k += 3) { const a = idx.getX(k), b = idx.getX(k + 1), c = idx.getX(k + 2); nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
  // the neighbourhood's centre, widened by a few smoothing passes (so a pit reads as one dark patch, not speckle)
  let cx = new Float32Array(cnt * 3);
  for (let i = 0; i < cnt; i++) { cx[i * 3] = p.getX(i); cx[i * 3 + 1] = p.getY(i); cx[i * 3 + 2] = p.getZ(i); }
  for (let pass = 0; pass < 4; pass++) {
    const nx = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) {
      const L = nb[i]; let x = 0, y = 0, z = 0;
      for (const j of L) { x += cx[j * 3]; y += cx[j * 3 + 1]; z += cx[j * 3 + 2]; }
      const k = L.length || 1; nx[i * 3] = x / k; nx[i * 3 + 1] = y / k; nx[i * 3 + 2] = z / k;
    }
    cx = nx;
  }
  const out = new Float32Array(cnt);
  for (let i = 0; i < cnt; i++) {
    const d = (cx[i * 3] - p.getX(i)) * n.getX(i) + (cx[i * 3 + 1] - p.getY(i)) * n.getY(i) + (cx[i * 3 + 2] - p.getZ(i)) * n.getZ(i);
    out[i] = Math.max(-1, Math.min(1, d / scale));
  }
  return out;
}

/** Slate: flat plates stacked, each a fractured polygon (straight broken edges, chipped), smaller and shifted going up,
 *  so the sides show stepped layers. */
function slatePlates(seed: number, l: number, h: number, w: number, base: THREE.Color, hs?: HardStyle): THREE.BufferGeometry {
  const r = rng(seed * 53 + 9), nP = 1 + Math.round(hsv(hs, 'layers') * 5), tex = hsv(hs, 'tex'), N = noise3(seed + 5);
  const parts: THREE.BufferGeometry[] = [];
  let y = 0;
  const thick = Array.from({ length: nP }, () => 0.6 + r() * 0.8), tsum = thick.reduce((a, b) => a + b, 0);
  for (let k = 0; k < nP; k++) {
    const sc = k === 0 ? 1 : Math.pow(0.9, k) * (0.8 + r() * 0.25), t = h * thick[k] / tsum;
    const shape = new THREE.Shape(), pts: [number, number][] = [], M = 28;
    // the outline: an ellipse cut by a few straight breaks, then chipped
    const breaks = Array.from({ length: 5 + Math.floor(r() * 4) }, () => { const a = r() * Math.PI * 2; return { a, d: 0.7 + r() * 0.28 }; });
    for (let i = 0; i < M; i++) {
      const a = i / M * Math.PI * 2; let rr = 1;
      for (const b of breaks) { const c = Math.cos(a - b.a); if (c > 0.05) rr = Math.min(rr, b.d / c); }
      rr *= 1 - (0.02 + 0.06 * tex) * Math.abs(fbm(N, Math.cos(a) * 3 + k * 7, Math.sin(a) * 3, k, 2));
      pts.push([Math.cos(a) * rr * l / 2 * sc, Math.sin(a) * rr * w / 2 * sc]);
    }
    const dx = (r() - 0.5) * l * 0.4 * (k ? 1 : 0), dz = (r() - 0.5) * w * 0.3 * (k ? 1 : 0);
    pts.forEach(([a, b], i) => i ? shape.lineTo(a + dx, b + dz) : shape.moveTo(a + dx, b + dz));
    const e = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: true, bevelThickness: t * 0.18, bevelSize: Math.min(t * 0.25, 4), bevelSegments: 1, steps: 1 });
    e.rotateX(-Math.PI / 2); // extrude along +y; the outline's y becomes -z
    e.translate(0, y + t * 0.18, 0);
    e.deleteAttribute('uv');
    const pp = e.attributes.position, c = new Float32Array(pp.count * 3), tone = 0.92 + 0.16 * r(), q = new THREE.Color();
    for (let i = 0; i < pp.count; i++) {
      const Y = pp.getY(i), mot = fbm(N, pp.getX(i) * 0.015, Y * 0.2, pp.getZ(i) * 0.015, 3);
      q.copy(base).multiplyScalar(tone * (1 + 0.14 * mot + 0.05 * Math.sin(Y / Math.max(1, t) * 9)));
      c[i * 3] = q.r; c[i * 3 + 1] = q.g; c[i * 3 + 2] = q.b;
    }
    e.setAttribute('color', new THREE.BufferAttribute(c, 3));
    e.computeVertexNormals();
    parts.push(e.index ? e.toNonIndexed() : e);
    y += t * 0.98;
  }
  const g = mergeGeometries(parts)!;
  g.computeBoundingBox();
  const b = g.boundingBox!; g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  return g;
}
