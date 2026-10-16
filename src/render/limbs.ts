// Shared limb and hair helpers (lane JS, 2026-10-16) for the body plans built round jointed chains: the jumping spider
// first (render/spider3d.ts), the ball python and the tarantula after it. lizard3d.ts keeps its own copies of ik / walk /
// the surfaces (shipped and tested as they are); new body plans import these.
//   ik        two-bone IK: the middle joint of a chain from A to B
//   plane / cylinder / walk   the surfaces feet stand on (a discrete geodesic over them)
//   fuzz      fine hair: thousands of tiny tapered blades scattered over a mesh by area, each carrying its root colour
//   bandedChain   a leg of real segments (one tapered tube per segment, a knuckle at every joint)
//   shadeBy / tint   form shading baked into vertex colours (the animals are unlit)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { jointTube } from './herp3d';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (a: number, b: number, x: number) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const TAU = Math.PI * 2;

/** Two-bone IK: the middle joint of a chain a + b from A to B, bent toward `pole`. */
export function ik(A: THREE.Vector3, B: THREE.Vector3, a: number, b: number, pole: THREE.Vector3) {
  const d = B.clone().sub(A), L = Math.max(1e-6, Math.min(d.length(), (a + b) * 0.999)), dir = d.normalize();
  const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (pp.lengthSq() < 1e-9) pp.set(0, 1, 0).addScaledVector(dir, -dir.y);
  pp.normalize();
  return A.clone().addScaledVector(dir, x).addScaledVector(pp, h);
}

// ---------- surfaces ----------

export interface Surf { snap(p: THREE.Vector3): THREE.Vector3; n(p: THREE.Vector3): THREE.Vector3 }
export const plane = (y0: number): Surf => ({ snap: p => V(p.x, y0, p.z), n: () => V(0, 1, 0) });
/** A limb along x with its axis at height yA, radius R. */
export const cylinder = (yA: number, R: number): Surf => ({
  snap: p => { const r = V(0, p.y - yA, p.z); if (r.lengthSq() < 1e-14) r.set(0, 1, 0); r.setLength(R); return V(p.x, yA + r.y, r.z); },
  n: p => { const r = V(0, p.y - yA, p.z); return r.lengthSq() < 1e-14 ? V(0, 1, 0) : r.normalize(); },
});
/** Points over the surface from p0, setting off along dir (kept in the surface as it goes). */
export function walk(S: Surf, p0: THREE.Vector3, dir: THREE.Vector3, len: number, n: number) {
  const pts = [S.snap(p0)], d = dir.clone();
  for (let k = 1; k <= n; k++) {
    const prev = pts[k - 1], nn = S.n(prev); d.addScaledVector(nn, -d.dot(nn)).normalize();
    pts.push(S.snap(prev.clone().addScaledVector(d, len / n)));
  }
  return pts;
}

// ---------- shading ----------

/** Undersides darker, tops a touch lighter, against `up`; multiplies the vertex colours in place. */
export function shadeBy(g: THREE.BufferGeometry, dark = 0.3, up = V(0, 1, 0), lift = 0.05) {
  const n = g.attributes.normal, c = g.attributes.color, q = V();
  for (let i = 0; i < n.count; i++) {
    const ny = q.fromBufferAttribute(n, i).dot(up), k = 1 - dark * Math.max(0, -ny) + lift * Math.max(0, ny);
    c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
  }
  return g;
}
/** Set every vertex's colour from f(vertex normal y, position). */
export function tint(g: THREE.BufferGeometry, f: (ny: number, p: THREE.Vector3, n: THREE.Vector3) => THREE.Color) {
  const n = g.attributes.normal, p = g.attributes.position, out: number[] = [], P = V(), N = V();
  for (let i = 0; i < n.count; i++) { const c = f(n.getY(i), P.fromBufferAttribute(p, i), N.fromBufferAttribute(n, i)); out.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(out, 3));
  return g;
}

// ---------- hair ----------

export interface FuzzOpts {
  count: number;
  /** Strand length range and root radius (same units as the mesh). */
  len: [number, number]; rad: number;
  seed: number;
  /** 0 = strands stand on the surface normal, 1 = they lie along `flow`. */
  lean?: number;
  /** The way the hair runs at a point (default: none, strands stand up). */
  flow?: (p: THREE.Vector3, n: THREE.Vector3) => THREE.Vector3;
  /** The root colour at a point (default: the mesh's vertex colour there). */
  colour?: (p: THREE.Vector3, uv: THREE.Vector2 | null, c: THREE.Color) => THREE.Color;
  /** Share of strands kept at a point, 0..1 (e.g. thinner under the belly). */
  keep?: (p: THREE.Vector3, n: THREE.Vector3) => number;
  /** Strand tips lighter by this much (frost on a dark coat); default 0.18. */
  frost?: number;
}
/**
 * Fine hair over a mesh: `count` strands (single tapered triangles, non-indexed with colours and normals; draw them double-sided) scattered over
 * its triangles by area, each in the colour of its root with a little brightness noise and a lighter tip, leaning along
 * the flow. The result merges into one geometry per body part and is cached with the pose.
 */
export function fuzz(src: THREE.BufferGeometry, o: FuzzOpts): THREE.BufferGeometry | null {
  const g = src.index ? src.toNonIndexed() : src, pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color, uvs = g.attributes.uv;
  const tris = pos.count / 3, area: number[] = [], A = V(), B = V(), C = V();
  let tot = 0;
  for (let t = 0; t < tris; t++) {
    A.fromBufferAttribute(pos, 3 * t); B.fromBufferAttribute(pos, 3 * t + 1); C.fromBufferAttribute(pos, 3 * t + 2);
    tot += B.sub(A).cross(C.sub(A)).length() / 2; area.push(tot);
  }
  if (!(tot > 0)) return null;
  const r = rng(o.seed), outP: number[] = [], outN: number[] = [], outC: number[] = [], frost = o.frost ?? 0.18;
  const pa = V(), pb = V(), pc = V(), na = V(), nb = V(), nc = V(), p = V(), n = V(), dir = V(), t1 = V(), t2 = V();
  const c0 = new THREE.Color(), c1 = new THREE.Color(), uv = new THREE.Vector2();
  for (let k = 0; k < o.count; k++) {
    // the triangle (binary search over the running area)
    const x = r() * tot; let lo = 0, hi = tris - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (area[m] < x) lo = m + 1; else hi = m; }
    const i = 3 * lo;
    let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v;
    pa.fromBufferAttribute(pos, i); pb.fromBufferAttribute(pos, i + 1); pc.fromBufferAttribute(pos, i + 2);
    na.fromBufferAttribute(nor, i); nb.fromBufferAttribute(nor, i + 1); nc.fromBufferAttribute(nor, i + 2);
    p.set(0, 0, 0).addScaledVector(pa, w).addScaledVector(pb, u).addScaledVector(pc, v);
    n.set(0, 0, 0).addScaledVector(na, w).addScaledVector(nb, u).addScaledVector(nc, v).normalize();
    if (o.keep && r() > o.keep(p, n)) continue;
    if (uvs) uv.set(uvs.getX(i) * w + uvs.getX(i + 1) * u + uvs.getX(i + 2) * v, uvs.getY(i) * w + uvs.getY(i + 1) * u + uvs.getY(i + 2) * v);
    if (o.colour) c0.copy(o.colour(p, uvs ? uv : null, c1));
    else if (col) c0.setRGB(col.getX(i) * w + col.getX(i + 1) * u + col.getX(i + 2) * v, col.getY(i) * w + col.getY(i + 1) * u + col.getY(i + 2) * v, col.getZ(i) * w + col.getZ(i + 1) * u + col.getZ(i + 2) * v);
    else c0.setRGB(0.5, 0.5, 0.5);
    dir.copy(n);
    if (o.flow && o.lean) { const f = o.flow(p, n); if (f.lengthSq() > 1e-12) dir.lerp(f.clone().normalize(), o.lean).normalize(); }
    dir.x += (r() - 0.5) * 0.35; dir.y += (r() - 0.5) * 0.35; dir.z += (r() - 0.5) * 0.35; dir.normalize();
    const len = o.len[0] + r() * (o.len[1] - o.len[0]), rad = o.rad * (0.7 + 0.6 * r());
    const br = 0.86 + 0.28 * r();
    // one tapered blade per strand (a single triangle, turned about its own axis at random): thousands cost little, and
    // seen from any side they read as a dense soft coat rather than as spikes
    t1.crossVectors(dir, Math.abs(dir.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).normalize(); t2.crossVectors(dir, t1);
    const ang = r() * TAU, wd = t1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(t2, Math.sin(ang)).multiplyScalar(rad);
    const a0 = p.clone().addScaledVector(wd, -1).addScaledVector(n, -rad * 0.4), a1 = p.clone().add(wd).addScaledVector(n, -rad * 0.4), tip = p.clone().addScaledVector(dir, len);
    c1.copy(c0).multiplyScalar(br); const ct = c1.clone().lerp(new THREE.Color(1, 1, 1), frost).multiplyScalar(1.05);
    outP.push(a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, tip.x, tip.y, tip.z);
    for (let m = 0; m < 3; m++) outN.push(dir.x * 0.6 + n.x * 0.4, dir.y * 0.6 + n.y * 0.4, dir.z * 0.6 + n.z * 0.4);
    outC.push(c1.r, c1.g, c1.b, c1.r, c1.g, c1.b, ct.r, ct.g, ct.b);
  }
  if (src.index) g.dispose();
  if (!outP.length) return null;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(outN, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(outC, 3));
  return out;
}

// ---------- segmented limb ----------

/**
 * A leg of real segments: one tapered tube per segment (pts[i] to pts[i+1], radii r[i] to r[i+1]), swelling between narrower
 * joints, round ends so every joint reads as a knuckle. `colour(i, ny)` = the colour of segment i at a normal's y.
 * Returns the segments' geometries (coloured, non-indexed, position / normal / color only) in order.
 */
export function bandedChain(pts: THREE.Vector3[], r: number[], colour: (seg: number, ny: number) => THREE.Color) {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const g = jointTube([pts[i], pts[i + 1]], [r[i], r[i + 1]], 0, true), n = g.attributes.normal, c: number[] = [];
    for (let k = 0; k < n.count; k++) { const q = colour(i, n.getY(k)); c.push(q.r, q.g, q.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
    out.push(g);
  }
  return out;
}
export const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map(g => (g.index ? g.toNonIndexed() : g)))!;
