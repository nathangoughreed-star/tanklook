// Tank footprint (scene v8): the floor outline of every tank shape, and the geometry questions asked of it. Shapes are
// rect, bowfront, round and regular polygons. L x D stays the BOUNDING BOX of the outline, with the front-most point at
// depth 0 on the centre line, so everything keyed to the box (heightfield u = x/L, v = depth/D, camera, walls, orbit,
// rescale) keeps working; only "is this spot in the tank" and the glass follow the outline. Every shape is convex.
// Points are [x, depth]: x along the length 0..L, depth mm behind the front 0..D. No three.js here.
import type { Tank, TankShape } from './types';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)); // physics imports this module

export type P = [number, number];

/** One glass wall: a flat pane (two points) or a curved shell (a polyline). Walls run round the tank in order. */
export interface Wall { pts: P[]; curved: boolean }

interface Edge { a: P; b: P; n: P; len: number; s0: number; wall: number }
export interface Footprint { walls: Wall[]; ring: P[]; edges: Edge[]; area: number; perimeter: number }

/** Segments in a full circle and in the bowfront arc. */
const ROUND_SEG = 64, BOW_SEG = 32;

export const SHAPES: Record<TankShape, string> = { rect: 'Rectangle', bow: 'Bowfront', round: 'Round (cylinder)', poly: 'Polygon' };
export const POLY_SIDES = [3, 5, 6] as const;
export const shapeOf = (T: Tank): TankShape => T.shape ?? 'rect';

/** Unit regular n-gon with a flat face toward the viewer (front edge centred on x = 0), as [x, depth] points. */
function unitPoly(n: number): P[] {
  return Array.from({ length: n }, (_, k) => { const b = -Math.PI / n + 2 * Math.PI * k / n; return [Math.sin(b), -Math.cos(b)] as P; });
}

/** Depth / width of a regular n-gon (flat face front): the derived D for a polygon tank of width L. */
export function polyRatio(n: number) {
  const p = unitPoly(n), xs = p.map(q => q[0]), ds = p.map(q => q[1]);
  return (Math.max(...ds) - Math.min(...ds)) / (Math.max(...xs) - Math.min(...xs));
}

/** Smallest end depth of a bowfront: the arc may not be more than a half circle (it would bulge past L). */
export const bowMinLimit = (T: Tank) => Math.max(0, T.D - T.L / 2);

/**
 * A tank with its shape's constraints applied: round D = L (diameter); polygon D from L and the side count; bowfront
 * end depth between the half-circle limit and D. A rectangle is plain { L, H, D }, as in files before v8.
 */
export function normTank(T: Tank): Tank {
  const s = shapeOf(T);
  if (s === 'rect') return { L: T.L, H: T.H, D: T.D }; // stored as plain L x H x D, like every file before v8
  if (s === 'round') return { ...T, D: T.L, sides: undefined, bowMin: undefined };
  if (s === 'poly') { const n = (POLY_SIDES as readonly number[]).includes(T.sides ?? 0) ? T.sides! : 6; return { ...T, sides: n, D: +(T.L * polyRatio(n)).toFixed(1), bowMin: undefined }; }
  const lo = bowMinLimit(T), b = T.bowMin ?? T.D * 0.75;
  return { ...T, sides: undefined, bowMin: +clamp(b, Math.min(T.D, Math.max(lo, 20)), T.D).toFixed(1) };
}

function makeWalls(T: Tank): Wall[] {
  const { L, D } = T, s = shapeOf(T);
  if (s === 'round') {
    const R = L / 2, pts: P[] = [];
    for (let i = 0; i <= ROUND_SEG; i++) { const a = -Math.PI + 2 * Math.PI * i / ROUND_SEG; pts.push([R + R * Math.sin(a), R - R * Math.cos(a)]); }
    return [{ pts, curved: true }];
  }
  if (s === 'poly') {
    const u = unitPoly(T.sides ?? 6), x0 = Math.min(...u.map(q => q[0])), x1 = Math.max(...u.map(q => q[0])), d0 = Math.min(...u.map(q => q[1]));
    const k = L / (x1 - x0), v = u.map(q => [(q[0] - x0) * k, (q[1] - d0) * k] as P);
    return v.map((p, i) => ({ pts: [p, v[(i + 1) % v.length]], curved: false }));
  }
  // rect, or bowfront: a circular arc through (0, e), (L/2, 0), (L, e) across the front, e = D - bowMin
  const e = s === 'bow' ? clamp(D - (T.bowMin ?? D), 0, L / 2) : 0;
  let front: Wall = { pts: [[0, 0], [L, 0]], curved: false };
  if (e > 0.5) {
    const R = (L * L / 4 + e * e) / (2 * e), a0 = Math.asin(clamp(L / 2 / R, -1, 1)), pts: P[] = [];
    for (let i = 0; i <= BOW_SEG; i++) { const a = -a0 + 2 * a0 * i / BOW_SEG; pts.push([L / 2 + R * Math.sin(a), R - R * Math.cos(a)]); }
    pts[0] = [0, e]; pts[BOW_SEG] = [L, e];
    front = { pts, curved: true };
  }
  return [front, { pts: [[L, e], [L, D]], curved: false }, { pts: [[L, D], [0, D]], curved: false }, { pts: [[0, D], [0, e]], curved: false }];
}

const cache = new Map<string, Footprint>();
/** The footprint of tank T (cached by its shape parameters). */
export function footprint(T: Tank): Footprint {
  const key = `${shapeOf(T)}|${T.L}|${T.D}|${T.sides}|${T.bowMin}`;
  let f = cache.get(key);
  if (f) return f;
  const walls = makeWalls(T), ring: P[] = [], edges: Edge[] = [];
  let s = 0;
  walls.forEach((w, wi) => {
    for (let i = 0; i < w.pts.length - 1; i++) {
      const a = w.pts[i], b = w.pts[i + 1], dx = b[0] - a[0], dd = b[1] - a[1], len = Math.hypot(dx, dd);
      if (len < 1e-9) continue;
      ring.push(a); edges.push({ a, b, n: [dd / len, -dx / len], len, s0: s, wall: wi }); s += len;
    }
  });
  let area = 0;
  for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; area += p[0] * q[1] - q[0] * p[1]; }
  f = { walls, ring, edges, area: Math.abs(area) / 2, perimeter: s };
  cache.set(key, f); if (cache.size > 32) cache.delete(cache.keys().next().value!);
  return f;
}

/** Signed distance (mm) from (x, depth) to the outline: positive inside. Exact for convex outlines away from corners. */
export function insideBy(T: Tank, x: number, d: number): number {
  let m = Infinity;
  for (const e of footprint(T).edges) m = Math.min(m, -((x - e.a[0]) * e.n[0] + (d - e.a[1]) * e.n[1]));
  return m;
}

/** Is (x, depth) inside the footprint, at least `inset` mm from the glass? */
export const inside = (T: Tank, x: number, d: number, inset = 0) => insideBy(T, x, d) >= inset - 1e-6;

/** The nearest spot at least `inset` mm inside the glass (unchanged if it already is). Too big an inset: the middle. */
export function clampIn(T: Tank, x: number, d: number, inset = 0): { x: number; depth: number } {
  const { edges } = footprint(T);
  for (let k = 0; k < 12; k++) {
    let worst = Infinity, n: P = [0, 0];
    for (const e of edges) { const v = -((x - e.a[0]) * e.n[0] + (d - e.a[1]) * e.n[1]); if (v < worst) { worst = v; n = e.n; } }
    if (worst >= inset - 1e-6) return { x, depth: d };
    x -= n[0] * (inset - worst); d -= n[1] * (inset - worst);
  }
  return inside(T, x, d, inset * 0.5) ? { x, depth: d } : { x: T.L / 2, depth: T.D / 2 };
}

/** Outward unit normal at arc length `s` along edge i: flat panes use the pane's normal; curved shells blend smoothly. */
function normalAt(f: Footprint, i: number, t: number): P {
  const e = f.edges[i];
  if (!f.walls[e.wall].curved) return e.n;
  const prev = f.edges[(i - 1 + f.edges.length) % f.edges.length], next = f.edges[(i + 1) % f.edges.length];
  const na = prev.wall === e.wall ? mid(prev.n, e.n) : e.n, nb = next.wall === e.wall ? mid(e.n, next.n) : e.n;
  const n: P = [na[0] + (nb[0] - na[0]) * t, na[1] + (nb[1] - na[1]) * t], l = Math.hypot(n[0], n[1]) || 1;
  return [n[0] / l, n[1] / l];
}
const mid = (a: P, b: P): P => { const n: P = [a[0] + b[0], a[1] + b[1]], l = Math.hypot(n[0], n[1]) || 1; return [n[0] / l, n[1] / l]; };

export interface OnGlass { x: number; depth: number; n: P; s: number; wall: number }

/** The nearest point on the glass (inside face) to (x, depth), with its outward normal and arc length. */
export function nearestGlass(T: Tank, x: number, d: number): OnGlass {
  const f = footprint(T);
  let best: OnGlass = { x, depth: d, n: [0, -1], s: 0, wall: 0 }, bd = Infinity;
  f.edges.forEach((e, i) => {
    const dx = e.b[0] - e.a[0], dd = e.b[1] - e.a[1], t = clamp(((x - e.a[0]) * dx + (d - e.a[1]) * dd) / (e.len * e.len), 0, 1);
    const px = e.a[0] + dx * t, pd = e.a[1] + dd * t, q = (px - x) ** 2 + (pd - d) ** 2;
    if (q < bd - 1e-9) { bd = q; best = { x: px, depth: pd, n: normalAt(f, i, t), s: e.s0 + e.len * t, wall: e.wall }; }
  });
  return best;
}

/** The point on the glass at arc length `s` (wraps round). */
export function glassAt(T: Tank, s: number): OnGlass {
  const f = footprint(T), P0 = f.perimeter, ss = ((s % P0) + P0) % P0;
  let i = f.edges.findIndex(e => ss < e.s0 + e.len); if (i < 0) i = f.edges.length - 1;
  const e = f.edges[i], t = clamp((ss - e.s0) / e.len, 0, 1);
  return { x: e.a[0] + (e.b[0] - e.a[0]) * t, depth: e.a[1] + (e.b[1] - e.a[1]) * t, n: normalAt(f, i, t), s: ss, wall: e.wall };
}

/** Arc-length span [s0, s1] of wall w. */
export function wallSpan(T: Tank, w: number): [number, number] {
  const es = footprint(T).edges.filter(e => e.wall === w);
  return [es[0].s0, es[es.length - 1].s0 + es[es.length - 1].len];
}

/**
 * The outline pushed outward by `t` mm (outer glass face, rim, stand), one point per ring point, corners mitred so a
 * rectangle grows to (L + 2t) x (D + 2t). Returned per wall so pane i of the outer ring matches pane i of the inner.
 */
export function offsetWalls(T: Tank, t: number): P[][] {
  const f = footprint(T), n = f.edges.length;
  const shifted = f.edges.map((e, i) => {
    const p = f.edges[(i - 1 + n) % n].n, q = e.n, k = t / Math.max(0.2, 1 + p[0] * q[0] + p[1] * q[1]);
    return [e.a[0] + (p[0] + q[0]) * k, e.a[1] + (p[1] + q[1]) * k] as P;
  });
  const out: P[][] = f.walls.map(() => []);
  f.edges.forEach((e, i) => { out[e.wall].push(shifted[i]); });
  f.walls.forEach((_, w) => { const nextEdge = f.edges.findIndex(e => e.wall === (w + 1) % f.walls.length); out[w].push(shifted[nextEdge < 0 ? 0 : nextEdge]); });
  return out;
}

/** The whole offset ring (closed polygon, no repeated point). */
export const offsetRing = (T: Tank, t: number): P[] => offsetWalls(T, t).flatMap(w => w.slice(0, -1));

/** Area (mm²) of a polygon ring. */
export function ringArea(r: P[]) {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return Math.abs(a) / 2;
}

/** Clip a convex polygon (cell of a floor grid) to the footprint; [] if it lies outside. */
export function clipToFootprint(T: Tank, poly: P[]): P[] {
  if (shapeOf(T) === 'rect' || poly.every(p => inside(T, p[0], p[1]))) return poly;
  let out = poly;
  for (const e of footprint(T).edges) {
    const din = (p: P) => -((p[0] - e.a[0]) * e.n[0] + (p[1] - e.a[1]) * e.n[1]), next: P[] = [];
    for (let i = 0; i < out.length; i++) {
      const p = out[i], q = out[(i + 1) % out.length], dp = din(p), dq = din(q);
      if (dp >= 0) next.push(p);
      if ((dp >= 0) !== (dq >= 0)) { const k = dp / (dp - dq); next.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]); }
    }
    out = next; if (!out.length) return out;
  }
  return out;
}

/** The part of the line x = const (axis 0) or depth = const (axis 1) inside the footprint: [lo, hi] or null. */
export function chord(T: Tank, axis: 0 | 1, v: number): [number, number] | null {
  let lo = -Infinity, hi = Infinity;
  for (const e of footprint(T).edges) {
    // inside: (p - a) . n <= 0 with p = (v, w) or (w, v); linear in w
    const c = axis === 0 ? (v - e.a[0]) * e.n[0] - e.a[1] * e.n[1] : (v - e.a[1]) * e.n[1] - e.a[0] * e.n[0], k = axis === 0 ? e.n[1] : e.n[0];
    if (Math.abs(k) < 1e-12) { if (c > 1e-6) return null; continue; }
    const w = -c / k; if (k > 0) hi = Math.min(hi, w); else lo = Math.max(lo, w);
  }
  return lo <= hi ? [lo, hi] : null;
}

/** Half the footprint's width (grown by `grow` mm) across a horizontal view direction (ux, uz); z = -depth. */
export function halfWidth(T: Tank, ux: number, uz: number, grow: number) {
  const cx = T.L / 2, cd = T.D / 2;
  let m = 0;
  for (const p of offsetRing(T, grow)) m = Math.max(m, Math.abs((p[0] - cx) * -uz + (-(p[1] - cd)) * ux));
  return m;
}

/** Runs of the outer ring (offset t) whose outward normal faces direction `dir` within `cos` (e.g. the front: [0, -1]). */
export function facingRuns(T: Tank, t: number, dir: P, cos = 0.5): P[][] {
  const f = footprint(T), ring = offsetRing(T, t), n = f.edges.length, ok = f.edges.map(e => e.n[0] * dir[0] + e.n[1] * dir[1] > cos);
  if (ok.every(Boolean)) return [[...ring, ring[0]]];
  const start = ok.findIndex(v => !v), runs: P[][] = [];
  let cur: P[] | null = null;
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (ok[i]) { if (!cur) cur = [ring[i]]; cur.push(ring[(i + 1) % n]); } else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs;
}

/** Length of a polyline. */
export const runLength = (r: P[]) => r.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - r[i][0], p[1] - r[i][1]), 0);

/** Point at distance `s` along a polyline. */
export function alongRun(r: P[], s: number): P {
  for (let i = 1; i < r.length; i++) {
    const l = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
    if (s <= l || i === r.length - 1) { const t = l ? clamp(s / l, 0, 1) : 0; return [r[i - 1][0] + (r[i][0] - r[i - 1][0]) * t, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * t]; }
    s -= l;
  }
  return r[0];
}

/** The polyline from s0 to s1 along a run (for door seams inset from the ends). */
export function subRun(r: P[], s0: number, s1: number): P[] {
  const out: P[] = [alongRun(r, s0)];
  let acc = 0;
  for (let i = 1; i < r.length; i++) {
    acc += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
    if (acc > s0 && acc < s1) out.push(r[i]);
  }
  out.push(alongRun(r, s1));
  return out;
}
