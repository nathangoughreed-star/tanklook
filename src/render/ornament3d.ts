// Procedural ornaments (lane DS2, 2026-11-13): a sunken sailing ship and a treasure chest, built from three.js primitives and
// lofted surfaces, in real material colours (weathered oak, tarred rope, canvas, iron, brass, gold). Not painted, not cartoony:
// every surface is a vertex-coloured solid shaded like the stones and wood (render/items.ts bake + grit), so it sits in the tank
// like the rest of the hardscape. All lengths in mm; the ship lies along x (size = its length), the chest's size = its width.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { clean, grit, paint, waves } from './items';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const C = (hex: string) => new THREE.Color(hex);
const mix = (a: string, b: string, t: number) => C(a).lerp(C(b), Math.max(0, Math.min(1, t)));
const sm = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Grit kinds (render/items.ts): 0 = smooth (metal, cloth, gold), 10 = plain weathered wood. */
const SMOOTH = 0, WOOD = 10;

/** An indexed (nu+1) x (nv+1) surface from f(u, v) with u, v in 0..1. */
function grid(nu: number, nv: number, f: (u: number, v: number) => THREE.Vector3, skip?: (i: number, j: number) => boolean) {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const p = f(i / nu, j / nv); pos.push(p.x, p.y, p.z); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    if (skip?.(i, j)) continue;
    const a = i * (nv + 1) + j, b = (i + 1) * (nv + 1) + j, c = b + 1, d = a + 1;
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Flip the triangles so the average normal points away from `inside` (the lighting is baked from normals, so they must face out). */
function faceAway(g: THREE.BufferGeometry, inside: THREE.Vector3) {
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), w = new THREE.Vector3();
  let s = 0;
  for (let i = 0; i < p.count; i++) s += w.fromBufferAttribute(n, i).dot(v.fromBufferAttribute(p, i).sub(inside).normalize());
  if (s < 0) { const idx = g.index!; for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); } g.computeVertexNormals(); }
  return g;
}
/** A round rod from a to b. */
function rod(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1 = r0, seg = 7) {
  const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r1, r0, d.length(), seg, 1);
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1)));
  return g;
}
const boxAt = (w: number, h: number, d: number, x: number, y: number, z: number, sx = 1, sz = 1) => new THREE.BoxGeometry(w, h, d, sx, 1, sz).translate(x, y, z);

class Parts {
  private list: THREE.BufferGeometry[] = [];
  constructor(private seed: number) {}
  add(g: THREE.BufferGeometry, kind: number, col: (p: THREE.Vector3, i: number) => THREE.Color) {
    paint(g, col); grit(g, kind, this.seed); this.list.push(clean(g, false));
  }
  merged() { return mergeGeometries(this.list)!; }
}

// ---------- The ship ----------
/** A three-masted sailing ship settled on the bottom, a few degrees over, canvas hanging in tatters. Length = size. */
function shipShape(seed: number, size: number) {
  const L = size, r = rng(seed * 13 + 5), nz = waves(r, 6), nz2 = waves(r, 5), P = new Parts(seed);
  const Hh = 0.19 * L, Bm = 0.15 * L;
  // hull lines: half-beam factor, sheer (deck edge height) and keel depth along the length u (0 stern, 1 bow)
  const prof = (u: number) => u < 0.3 ? 0.62 + 0.38 * Math.sin(u / 0.3 * Math.PI / 2) : u < 0.58 ? 1 : Math.pow(Math.max(0, Math.cos(Math.min(1, (u - 0.58) / 0.42) * Math.PI / 2)), 0.75);
  const sheer = (u: number) => Hh * (1 + 0.3 * Math.pow(1 - u, 3) + 0.2 * Math.pow(u, 4));
  const keel = (u: number) => Hh * (1.05 - 0.72 * Math.pow(u, 3) - 0.22 * Math.pow(1 - u, 2.5));
  const X = (u: number) => (u - 0.5) * L;
  const hull = (u: number, a: number) => V(X(u), sheer(u) - keel(u) * Math.pow(Math.max(0, Math.cos(a)), 0.7), Bm * prof(u) * Math.sin(a) * (1 + 0.14 * Math.cos(a)));
  const deckY = (u: number) => sheer(u) - 0.06 * Hh;
  const half = (u: number) => Bm * prof(u);

  // hull planking: strakes follow the lines of the hull, one plank = three rows (the middle of the seam row darker); tarred wale; algae below
  const NV = 48;
  const hullG = grid(60, NV, (u, v) => hull(u, (v - 0.5) * Math.PI));
  faceAway(hullG, V(0, 0, 0).setY(Hh * 0.6));
  P.add(hullG, WOOD, (p, i) => {
    const row = i % (NV + 1), rg = Math.min(row, NV - row), t = 1 - rg / (NV / 2), plank = Math.floor(rg / 3);
    let c = mix('#74593a', '#46392a', t * 1.1);
    c.lerp(C(['#7b6140', '#6b5236', '#806646', '#5d482f'][(plank * 7 + seed) % 4]), 0.35);
    if (rg >= 8 && rg <= 10) c = mix('#2d241b', '#3a2e22', nz(p.clone().multiplyScalar(0.05)) * 0.5 + 0.5); // the wale: tarred black
    c.lerp(C('#3c4a2c'), 0.42 * sm(0.5, 1, t) * (0.6 + 0.4 * nz2(p.clone().multiplyScalar(0.03)))); // green slime on the lower hull
    c.multiplyScalar(1 + 0.12 * nz(p.clone().multiplyScalar(0.12)));
    if (rg % 3 === 0) c.multiplyScalar(0.58); // plank seam
    return c;
  });
  // deck: lengthwise planks
  const deck = grid(40, 24, (u, k) => V(X(u), deckY(u), (k - 0.5) * 2 * half(u) * 0.93));
  faceAway(deck, V(0, -Hh, 0));
  P.add(deck, WOOD, (p, i) => {
    const k = i % 25, plank = Math.floor(k / 2);
    const c = mix('#9a8764', '#7a6a4c', ((plank * 5 + seed) % 7) / 7 + 0.25 * nz(p.clone().multiplyScalar(0.1)));
    c.lerp(C('#4c5a3a'), 0.12 * (0.5 + 0.5 * nz2(p.clone().multiplyScalar(0.06))));
    return k % 2 === 0 ? c.multiplyScalar(0.62) : c;
  });
  // bulwarks: outer wall, inner wall and the cap rail on both sides
  const BW = 0.075 * Hh * 1.3;
  for (const sg of [-1, 1]) {
    const wall = (inset: number, y0: (u: number) => number, y1: (u: number) => number, inside: THREE.Vector3) => {
      const g = grid(40, 1, (u, v) => V(X(u), y0(u) + (y1(u) - y0(u)) * v, sg * half(u) * (1 - inset)));
      return faceAway(g, inside);
    };
    const top = (u: number) => sheer(u) + BW * (u < 0.2 ? 1.6 : 1);
    const col = (p: THREE.Vector3) => mix('#6c5a40', '#8a7656', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.1))).multiplyScalar(0.92);
    P.add(wall(0, sheer, top, V(0, 0, 0)), WOOD, col);
    P.add(wall(0.05, sheer, top, V(0, 0, sg * 4 * Bm)), WOOD, col);
    const cap = grid(40, 1, (u, v) => V(X(u), top(u), sg * half(u) * (1 - 0.05 * v)));
    P.add(faceAway(cap, V(0, -Hh, 0)), WOOD, p => mix('#a08c68', '#85734f', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.12))));
  }
  // stern castle with its windows, and a lower forecastle
  const cx0 = X(0), cL = 0.2 * L, cH = 0.1 * L, cb = deckY(0.1), cw = half(0.1) * 1.8;
  // taper: the sides lean in toward the top, the top edge slopes down toward the bow, the corners are rounded off
  const taper = (g: THREE.BufferGeometry, x0: number, lenX: number, yb: number, hh: number, lean: number, slope: number) => {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) - yb) / hh, f = (p.getX(i) - x0) / lenX; p.setZ(i, p.getZ(i) * (1 - lean * t * (0.6 + 0.8 * f))); p.setY(i, p.getY(i) - hh * slope * t * f * f); p.setX(i, p.getX(i) - lenX * 0.06 * t * f); }
    g.computeVertexNormals(); return g;
  };
  P.add(taper(boxAt(cL, cH, cw, cx0 + cL / 2, cb + cH / 2, 0, 12, 12), cx0, cL, cb, cH, 0.16, 0.45), WOOD, (p) => {
    const t = (p.y - cb) / cH, c = mix('#6b5538', '#4a3a28', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.1)));
    c.lerp(C('#3c4a2c'), 0.1); return Math.abs(((t * 6) % 1 + 1) % 1) < 0.08 ? c.multiplyScalar(0.6) : c;
  });
    for (let k = -1; k <= 1; k++) { // stern windows: dark glass in a brass-green frame
    const wz = k * cw * 0.28, wy = cb + cH * 0.55;
    P.add(boxAt(0.006 * L, cH * 0.46, cw * 0.19, cx0 - 0.003 * L, wy, wz), SMOOTH, () => C('#171a18'));
    P.add(boxAt(0.009 * L, cH * 0.56, cw * 0.23, cx0 - 0.001 * L, wy, wz), SMOOTH, p => mix('#4f5a3f', '#6a6a44', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.3))));
  }
  const fx = X(0.82), fL = 0.1 * L, fH = 0.045 * L;
  P.add(taper(boxAt(fL, fH, half(0.82) * 1.7, fx, deckY(0.82) + fH / 2, 0, 8, 8), fx - fL / 2, fL, deckY(0.82), fH, 0.3, 0.5), WOOD, p => mix('#6b5538', '#52402c', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.12))));
  // gun ports with the muzzle of a cannon in each, both sides
  const portU = [0.3, 0.38, 0.46, 0.54, 0.62], pa = 1.12;
  for (const sg of [-1, 1]) for (const u of portU) {
    const a = sg * pa, p0 = hull(u, a), du = hull(u + 0.01, a).sub(hull(u - 0.01, a)).normalize(), da = hull(u, a + 0.01).sub(hull(u, a - 0.01)).normalize();
    const n = new THREE.Vector3().crossVectors(du, da).normalize(); if (n.z * sg < 0) n.negate();
    const yb = new THREE.Vector3().crossVectors(n, du).normalize(), M = new THREE.Matrix4().makeBasis(du, yb, n).setPosition(p0);
    const lid = boxAt(0.034 * L, 0.03 * L, 0.012 * L, 0, 0, 0.002 * L).applyMatrix4(M);
    P.add(lid, SMOOTH, () => C('#14110d'));
    const mz = new THREE.CylinderGeometry(0.0065 * L, 0.0085 * L, 0.02 * L, 8).rotateX(Math.PI / 2).translate(0, 0, 0.004 * L).applyMatrix4(M);
    P.add(mz, SMOOTH, p => mix('#1f2022', '#35373a', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.4))));
  }
  // masts, yards, sails
  const masts = [{ u: 0.69, h: 0.5, sails: 2 }, { u: 0.45, h: 0.6, sails: 2 }, { u: 0.2, h: 0.36, sails: 1 }];
  const wood = (p: THREE.Vector3) => mix('#5e4a32', '#7a6246', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.2)));
  for (const m of masts) {
    const x = X(m.u), y0 = deckY(m.u) - 0.02 * L, yt = y0 + m.h * L;
    P.add(rod(V(x, y0, 0), V(x, yt, 0), 0.0075 * L, 0.0045 * L, 9), WOOD, wood);
    let yTop = yt - 0.035 * L;
    for (let s = 0; s < m.sails; s++) {
      const wd = (s === 0 ? 0.3 : 0.23) * L * (m.u < 0.3 ? 0.8 : 1), hd = (s === 0 ? 0.2 : 0.15) * L * (m.u < 0.3 ? 0.85 : 1), yB = yTop - hd;
      P.add(rod(V(x, yTop, -wd * 0.54), V(x, yTop, wd * 0.54), 0.0045 * L, 0.0035 * L, 6), WOOD, wood);
      const rr = rng(seed * 31 + Math.round(m.u * 100) + s), nzs = waves(rr, 5);
      // tattered canvas: a fine grid whose foot is cut into streamers of different lengths, a few narrow vertical tears and
      // frayed side edges; each sail is turned a little about its mast and billows, so none is edge-on from every side
      const NU = 48, NV = 40, ang = (rr() - 0.5) * 1.0, ca = Math.cos(ang), sa = Math.sin(ang);
      const hash = (k: number) => { const q = Math.sin(k * 127.1 + seed * 31.7 + s * 11.3) * 43758.5453; return q - Math.floor(q); };
      const foot = Array.from({ length: NU }, (_, i) => Math.floor(Math.pow(hash(i >> 1), 1.6) * 0.34 * NV + 0.25 * NV * 0.15 * (0.5 + 0.5 * nzs(V(i * 0.4, 1, 2)))));
      const slits = Array.from({ length: 3 }, (_, k) => ({ i: 6 + Math.floor(hash(k + 5) * (NU - 12)), j0: Math.floor(NV * (0.35 + 0.3 * hash(k + 9))), n: 6 + Math.floor(hash(k + 13) * 12) }));
      const sail = grid(NU, NV, (u, v) => {
        const bil = 0.11 * wd * Math.sin(Math.PI * u) * Math.sin(Math.PI * (0.08 + 0.84 * v)) + 0.025 * wd * nzs(V(u * 6, v * 4, 0));
        const dx = (bil * (0.6 + 0.4 * v) + 0.012 * L) , dz = (u - 0.5) * wd * (0.82 + 0.18 * (1 - v));
        return V(x + dx * ca - dz * sa, yB + hd * v + 0.008 * L * Math.sin(u * 9 + s), dx * sa + dz * ca);
      }, (i, j) => j < foot[i] || (i < 1 || i > NU - 2) && hash(i * 7 + j) < 0.35 + 0.4 * (1 - j / NV) || slits.some(t => i === t.i + (j - t.j0 > t.n / 2 ? 0 : 0) && j >= t.j0 && j < t.j0 + t.n));
      P.add(faceAway(sail, V(-1000 * L, 0, 0)), SMOOTH, (p, i) => {
        const iu = Math.floor(i / 41), v = (p.y - yB) / hd;
        const c = mix('#dccfb0', '#b9ac8b', 0.5 + 0.5 * nzs(p.clone().multiplyScalar(0.07)));
        c.lerp(C('#82795a'), 0.5 * sm(0.5, 0, v)).lerp(C('#4a5a38'), 0.12 * sm(0.4, 0, v)); // grime and algae toward the foot
        return c.multiplyScalar(iu % 6 === 0 ? 0.88 : 1);
      });
      yTop = yB - 0.01 * L;
    }
  }
  // standing rigging: shrouds from each mast to the rail, a forestay and a bowsprit
  const rope = (p: THREE.Vector3) => mix('#2a231b', '#40362a', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.5)));
  for (const m of masts) for (const sg of [-1, 1]) for (let k = 0; k < 4; k++) {
    const u = m.u - 0.04 + k * 0.026, x = X(m.u), y1 = deckY(m.u) - 0.02 * L + m.h * L * 0.62;
    P.add(rod(V(x, y1, sg * 0.004 * L), V(X(u), sheer(u) + BW, sg * half(u) * 0.97), 0.0022 * L, 0.0022 * L, 5), SMOOTH, rope);
  }
  const bsA = V(X(0.93), sheer(0.93) + 0.01 * L, 0), bsB = V(X(1) + 0.09 * L, sheer(1) + 0.09 * L, 0);
  P.add(rod(bsA, bsB, 0.0075 * L, 0.0045 * L, 7), WOOD, wood);
  P.add(rod(V(X(0.69), deckY(0.69) - 0.02 * L + 0.5 * L, 0), bsB, 0.0022 * L, 0.0022 * L, 5), SMOOTH, rope);
  // a few barrels, a hatch and the capstan on deck
  const barrel = (u: number, z: number) => {
    const g = new THREE.CylinderGeometry(0.02 * L, 0.02 * L, 0.04 * L, 14, 4).translate(X(u), deckY(u) + 0.02 * L, z);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const rel = (p.getY(i) - deckY(u)) / (0.04 * L) - 0.5, k = 1 + 0.12 * (1 - 4 * rel * rel); p.setX(i, X(u) + (p.getX(i) - X(u)) * k); p.setZ(i, z + (p.getZ(i) - z) * k); }
    g.computeVertexNormals(); return g;
  };
  P.add(barrel(0.54, half(0.54) * 0.55), WOOD, p => mix('#6b5236', '#4c3a28', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.3))));
  P.add(barrel(0.57, -half(0.57) * 0.6), WOOD, p => mix('#6b5236', '#4c3a28', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.3))));
  P.add(boxAt(0.07 * L, 0.012 * L, 0.05 * L, X(0.36), deckY(0.36) + 0.006 * L, 0, 5, 4), WOOD, (p) => (Math.floor((p.x * 1000) / 7) % 2 ? mix('#2a2218', '#3a2e22', 0.5) : mix('#6a583c', '#7a6648', 0.5)));
  P.add(new THREE.CylinderGeometry(0.01 * L, 0.012 * L, 0.025 * L, 10).translate(X(0.6), deckY(0.6) + 0.012 * L, 0), WOOD, () => C('#5a4630'));
  // the rudder hanging off the stern
  P.add(boxAt(0.012 * L, Hh * 0.9, 0.05 * L, X(0) - 0.012 * L, sheer(0) - keel(0) * 0.45, 0, 1, 3), WOOD, () => C('#3a2f22'));

  const g = P.merged();
  g.rotateX(7 * Math.PI / 180); // the wreck lists a little
  g.computeBoundingBox(); const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  return g;
}

// ---------- The treasure chest ----------
/** An oak sea chest with iron bands and a brass lock, lid propped open on a heap of gold coins. Width = size. */
function chestShape(seed: number, size: number) {
  const s = size, r = rng(seed * 17 + 3), nz = waves(r, 6), P = new Parts(seed);
  const w = s, h = 0.36 * s, d = 0.56 * s, lr = d / 2;
  const iron = (p: THREE.Vector3) => mix('#1f2022', '#34363a', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.4)));
  const oak = (p: THREE.Vector3, band: number) => { const c = mix('#5a3d26', '#7a5636', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.07))); c.lerp(C('#3c4a2c'), 0.08); return c.multiplyScalar(band); };
  const seam = (t: number) => { const f = ((t % 1) + 1) % 1; return f < 0.1 || f > 0.9 ? 0.55 : 1; };
  // body: boards run along the width, four courses
  P.add(new THREE.BoxGeometry(w, h, d, 24, 12, 12).translate(0, h / 2, 0), WOOD, p => oak(p, seam(p.y / h * 4)));
  // lid: a half cylinder hinged on the back top edge, opened about 62 degrees, with its underside, end plates and iron bands
  const hinge = V(0, h, -lr), open = -62 * Math.PI / 180, M = new THREE.Matrix4().makeTranslation(hinge.x, hinge.y, hinge.z).multiply(new THREE.Matrix4().makeRotationX(open));
  const toLid = (g: THREE.BufferGeometry) => g.applyMatrix4(M); // lid built with its back edge at the origin, arch toward +y, front toward +z
  // the arch: y = r sin t, z = r - r cos t, for t in 0..pi
  const archG = grid(28, 24, (u, v) => { const t = Math.PI * v; return V((u - 0.5) * w, lr * Math.sin(t), lr + lr * -Math.cos(t)); });
  faceAway(archG, V(0, 0, lr));
  toLid(archG);
  P.add(archG, WOOD, (p, i) => oak(p, seam((i % 25) / 25 * 4 * 1.0)));
  for (const sx of [-1, 1]) {
    const cap = new THREE.CircleGeometry(lr, 28, 0, Math.PI).rotateY(sx * Math.PI / 2).translate(sx * w / 2, 0, lr); // half disc, flat edge down
    P.add(toLid(cap), WOOD, p => oak(p, 0.8));
  }
  P.add(toLid(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2).translate(0, 0.002 * s, lr)), WOOD, p => oak(p, 0.55)); // underside of the lid
  // iron bands: on the body (front, top is hidden by the heap, back) and around the lid arch
  for (const bx of [-0.34 * s, 0.34 * s]) {
    P.add(boxAt(0.07 * s, h * 1.0, 0.012 * s, bx, h / 2, d / 2 + 0.003 * s), SMOOTH, iron);
    P.add(boxAt(0.07 * s, h * 1.0, 0.012 * s, bx, h / 2, -d / 2 - 0.003 * s), SMOOTH, iron);
    const bandG = grid(2, 24, (u, v) => { const t = Math.PI * v, rr = lr + 0.007 * s; return V(bx + (u - 0.5) * 0.07 * s, rr * Math.sin(t), lr - rr * Math.cos(t)); });
    P.add(toLid(faceAway(bandG, V(bx, 0, lr))), SMOOTH, iron);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { // corner straps
    P.add(boxAt(0.012 * s, h * 0.28, 0.07 * s, sx * (w / 2 + 0.002 * s), h * 0.86, sz * (d / 2 - 0.05 * s)), SMOOTH, iron);
    P.add(boxAt(0.05 * s, 0.012 * s, 0.07 * s, sx * (w / 2 - 0.02 * s), h * 0.9, sz * (d / 2 - 0.05 * s)), SMOOTH, iron);
  }
  P.add(boxAt(w * 1.01, 0.03 * s, d * 1.01, 0, 0.015 * s, 0), SMOOTH, iron); // iron foot rail
  // rivets along the front bands
  for (const bx of [-0.34 * s, 0.34 * s]) for (let k = 0; k < 5; k++) P.add(new THREE.SphereGeometry(0.0085 * s, 6, 5).translate(bx, h * (0.1 + 0.2 * k), d / 2 + 0.01 * s), SMOOTH, () => C('#4a4c50'));
  // brass lock plate on the front, with its keyhole
  P.add(boxAt(0.11 * s, 0.14 * s, 0.012 * s, 0, h * 0.8, d / 2 + 0.004 * s), SMOOTH, p => mix('#7c6430', '#94793a', 0.5 + 0.5 * nz(p.clone().multiplyScalar(0.6))));
  P.add(boxAt(0.012 * s, 0.03 * s, 0.004 * s, 0, h * 0.8, d / 2 + 0.011 * s), SMOOTH, () => C('#14110d'));
  // the heap of coins in the open body, and a few spilled in front
  const gold = () => mix('#564520', '#7a6532', r()).multiplyScalar(0.8 + 0.2 * r());
  const rc = 0.032 * s, coin = (x: number, y: number, z: number, tiltX: number, tiltZ: number, spin: number) => {
    const g = new THREE.CylinderGeometry(rc, rc, 0.006 * s, 12).rotateY(spin).rotateX(tiltX).rotateZ(tiltZ).translate(x, y, z);
    const c = gold(); P.add(g, SMOOTH, p => c.clone().multiplyScalar(0.94 + 0.1 * Math.sin(p.x * 2 + p.z)));
  };
  for (let i = 0; i < 260; i++) {
    const x = (r() - 0.5) * (w - 0.12 * s), z = (r() - 0.5) * (d - 0.1 * s), nxm = x / (w / 2), nzm = z / (d / 2);
    const dome = Math.max(0, 1 - 0.8 * (nxm * nxm) - 0.7 * (nzm * nzm));
    coin(x, h + 0.006 * s + 0.1 * s * dome + 0.012 * s * r(), z, (r() - 0.5) * 0.9, (r() - 0.5) * 0.9, r() * 6);
  }
  for (let i = 0; i < 14; i++) { const a = r(); coin((r() - 0.5) * w * 0.8, 0.004 * s * (1 + 2 * r()), d / 2 + 0.05 * s + 0.2 * s * a, (r() - 0.5) * 0.15, (r() - 0.5) * 0.15, r() * 6); }
  const g = P.merged();
  g.computeBoundingBox(); const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  return g;
}

export function ornamentShape(variant: string, seed: number, size: number) {
  return variant === 'treasurechest' ? chestShape(seed, size) : shipShape(seed, size);
}
