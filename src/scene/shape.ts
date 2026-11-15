// Tank footprint (scene v8): the floor outline of every tank shape, and the geometry questions asked of it. Shapes are
// rect, bowfront, round, regular polygons and pie slices. L x D stays the BOUNDING BOX of the outline, with the front-most point at
// depth 0 on the centre line, so everything keyed to the box (heightfield u = x/L, v = depth/D, camera, walls, orbit,
// rescale) keeps working; only "is this spot in the tank" and the glass follow the outline. Every shape is convex.
// The bowl is the one shape whose walls are not upright: a sphere cut flat at the floor and at the opening. Its footprint
// is the flat floor disc (substrate, hardscape and stand live there); what changes with height (fish room, glass, water
// surface, volume) asks `bowlRadius`. L x D is still its bounding box (the equator), front-most point at depth 0.
// The arch (Fluval Flex) is the other: its front pane is an arc in SIDE view (a horizontal axis), flush with the frame at the floor and
// the opening and bulging out by `frontBulge` at mid-height. Its footprint is the flat rectangle behind the frame line (depth
// frontBulge..D); only the front's depth varies with height (`frontAt`), D stays the box including the bulge.
// Points are [x, depth]: x along the length 0..L, depth mm behind the front 0..D. No three.js here.
import type { Tank, TankShape } from './types';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)); // physics imports this module

export type P = [number, number];

/** One glass wall: a flat pane (two points) or a curved shell (a polyline). Walls run round the tank in order. */
export interface Wall { pts: P[]; curved: boolean }

interface Edge { a: P; b: P; n: P; len: number; s0: number; wall: number }
export interface Footprint { walls: Wall[]; ring: P[]; edges: Edge[]; area: number; perimeter: number; /** false for a pie slice past 180 deg: the apex notch makes the outline concave */ convex: boolean }

/** Segments in a full circle and in the bowfront arc. */
const ROUND_SEG = 64, BOW_SEG = 32;

export const SHAPES: Record<TankShape, string> = { rect: 'Rectangle', bow: 'Bowfront', round: 'Round (cylinder)', poly: 'Polygon', bowl: 'Bowl (sphere)', pie: 'Pie slice (corner / half round)', arch: 'Curved front (top to bottom)' };
export const POLY_SIDES = [3, 5, 6] as const;
/** The custom tank maker takes any number of sides from 3 to 24 (above that a polygon is a round tank for every purpose). */
export const POLY_MIN = 3, POLY_MAX = 24, POLY_SIDE_MIN = 25.4;
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

/**
 * An irregular polygon from its side lengths (mm, in order round the tank, side 0 along the front). The corners lie on one circle (a cyclic
 * polygon), which is what makes the lengths alone fix the shape: any lengths close up into exactly one convex polygon, as long as the longest side
 * is shorter than all the others added together. Returns the corners ([x, depth], side i runs from corner i to corner i + 1, left to right across the
 * front, counter-clockwise) with the front-left corner at depth 0 and the box starting at x = 0, or a one-line reason when the sides cannot close.
 */
export function cyclicPolygon(lens: readonly number[]): { pts: P[]; L: number; D: number } | string {
  const n = lens.length, inch = (v: number) => `${+(v / 25.4).toFixed(2)} in`;
  if (n < POLY_MIN || n > POLY_MAX) return `A polygon has ${POLY_MIN} to ${POLY_MAX} sides.`;
  const bad = lens.findIndex(v => !Number.isFinite(v) || v < POLY_SIDE_MIN - 1e-6);
  if (bad >= 0) return `Side ${bad + 1} must be at least ${inch(POLY_SIDE_MIN)}.`;
  const m = lens.indexOf(Math.max(...lens)), total = lens.reduce((a, b) => a + b, 0), rest = total - lens[m];
  if (lens[m] >= rest - 1e-6) return `Side ${m + 1} (${inch(lens[m])}) has to be shorter than the other sides together (${inch(rest)}), or the shape cannot close.`;
  const half = (s: number, R: number) => Math.asin(Math.min(1, s / (2 * R)));
  const others = lens.filter((_, i) => i !== m), Rmin = lens[m] / 2;
  // the circle's radius: all central angles add to 2 pi when the centre is inside; else the others together span the longest side's arc
  const f = (R: number) => lens.reduce((a, s) => a + half(s, R), 0) - Math.PI;
  const g = (R: number) => others.reduce((a, s) => a + half(s, R), 0) - half(lens[m], R);
  const inside = f(Rmin) >= 0, h = inside ? f : g;
  let lo = Rmin, hi = Math.max(total, 1);
  if (inside) { while (h(hi) > 0 && hi < 1e9) hi *= 2; for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (h(mid) > 0) lo = mid; else hi = mid; } } // f falls from >= 0 to -pi
  else { while (h(hi) <= 0 && hi < 1e9) hi *= 2; for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (h(mid) > 0) hi = mid; else lo = mid; } } // g rises from < 0 to > 0
  const R = (lo + hi) / 2, order = Array.from({ length: n }, (_, j) => (m + 1 + j) % n); // the longest side last
  const V: P[] = [[R, 0]]; let a = 0;
  order.forEach((i, j) => {
    const step = 2 * half(lens[i], R) * (!inside && i === m ? -1 : 1);
    a += step; if (j < n - 1) V.push([R * Math.cos(a), R * Math.sin(a)]);
  });
  const start = new Map<number, P>(order.map((i, j) => [i, V[j]]));
  const pts = Array.from({ length: n }, (_, i) => start.get(i)!);
  const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1], ang = Math.atan2(dy, dx), c = Math.cos(-ang), s = Math.sin(-ang);
  const rot = pts.map(p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c] as P);
  const x0 = Math.min(...rot.map(p => p[0])), y0 = Math.min(...rot.map(p => p[1]));
  const out = rot.map(p => [p[0] - x0, p[1] - y0] as P);
  return { pts: out, L: Math.max(...out.map(p => p[0])), D: Math.max(...out.map(p => p[1])) };
}

/** The side lengths (mm) of a polygon tank, regular or not. */
export function polySides(T: Tank): number[] {
  if (T.sideLens?.length === (T.sides ?? 6)) return [...T.sideLens];
  const n = clamp(Math.round(T.sides ?? 6), POLY_MIN, POLY_MAX), u = unitPoly(n), w = Math.max(...u.map(q => q[0])) - Math.min(...u.map(q => q[0]));
  return Array(n).fill(T.L / w * 2 * Math.sin(Math.PI / n));
}
/** The width (box L) of a regular polygon whose sides are each `s` mm. */
export function regularWidth(n: number, s: number) { const u = unitPoly(n); return s / (2 * Math.sin(Math.PI / n)) * (Math.max(...u.map(q => q[0])) - Math.min(...u.map(q => q[0]))); }

/** Pie slice: the angle (degrees) of the arc, 30 to 360 (lane CT1, R38: 360 is a full cylinder, so "round" is a pie). Past 180 the two flat back panes fold inward and the outline is no longer convex. */
export const PIE_MIN = 30, PIE_MAX = 360, PIE_DEFAULT = 90;
const pieHalf = (T: Tank) => (clamp(T.pieDeg ?? PIE_DEFAULT, PIE_MIN, PIE_MAX) * Math.PI) / 360;
/** Width of a pie slice of radius r: the chord between the arc's ends (2r at a half circle). */
export const pieWidth = (r: number, deg: number) => 2 * r * Math.sin(Math.min(Math.PI / 2, (clamp(deg, PIE_MIN, PIE_MAX) * Math.PI) / 360));
/** Depth of the box round a pie slice of radius r: r up to a half circle, more past it (the arc runs back beyond the apex). The tank's D is this. */
export const pieDepth = (r: number, deg: number) => r * (1 - Math.cos(Math.max(Math.PI / 2, (clamp(deg, PIE_MIN, PIE_MAX) * Math.PI) / 360)));
/** The radius of a pie tank (the arc's circle), from its box depth D. */
export const pieRadius = (T: Tank) => T.D / (1 - Math.cos(Math.max(Math.PI / 2, pieHalf(T))));

/** Floor and opening diameters of a bowl, as fractions of its diameter L. */
export const BOWL_MIN = 0.2, BOWL_MAX = 0.95, BOWL_DEFAULT = 0.6;

/** A bowl's sphere radius R, floor and opening radii, and the height of the sphere's centre above the floor. */
export function bowlDims(T: Tank) {
  const R = T.L / 2, rb = clamp((T.bowlFloor ?? T.L * BOWL_DEFAULT) / 2, 0, R), rt = clamp((T.bowlTop ?? T.L * BOWL_DEFAULT) / 2, 0, R);
  const c = Math.sqrt(R * R - rb * rb);
  return { R, rb, rt, c, H: c + Math.sqrt(R * R - rt * rt) };
}

/** Radius (mm) of a bowl's cross-section at height y above the floor; Infinity for upright-walled shapes. */
export function bowlRadius(T: Tank, y: number) {
  if (shapeOf(T) !== 'bowl') return Infinity;
  const { R, c } = bowlDims(T), z = y - c;
  return Math.sqrt(Math.max(0, R * R - z * z));
}

/** Default and largest front bulge of an arch tank, as fractions of its depth D. */
export const ARCH_DEFAULT = 0.08, ARCH_MAX = 0.3;
/** An arch tank's front bulge (mm), 0 for every other shape. */
export const archBulge = (T: Tank) => (shapeOf(T) === 'arch' ? clamp(T.frontBulge ?? T.D * ARCH_DEFAULT, 0, T.D * ARCH_MAX) : 0);

/** Radius of the arch's side-view arc: chord H (floor to opening), sagitta b. Infinity when b is 0. */
const archRadius = (H: number, b: number) => (b > 1e-6 ? (H * H / 4 + b * b) / (2 * b) : Infinity);

/** Depth (mm behind the box front) of an arch tank's inside front glass at height y: the frame line b at floor and opening, 0 at mid-height. */
export function frontAt(T: Tank, y: number) {
  const b = archBulge(T);
  if (b <= 1e-6) return 0;
  const R = archRadius(T.H, b), z = clamp(y, 0, T.H) - T.H / 2;
  return b - (Math.sqrt(Math.max(0, R * R - z * z)) - (R - b));
}

/** Slope d(depth)/d(y) of that front glass (positive above mid-height, where the pane leans back). */
export function frontSlope(T: Tank, y: number) {
  const b = archBulge(T);
  if (b <= 1e-6) return 0;
  const R = archRadius(T.H, b), z = clamp(y, 0, T.H) - T.H / 2;
  return z / Math.sqrt(Math.max(1e-9, R * R - z * z));
}

/** The footprint ring at height y: an arch's front sits at the glass there (a fish or the water surface reaches the bulge); else the floor outline. */
export function levelRing(T: Tank, y: number): P[] {
  const f = footprint(T);
  if (shapeOf(T) !== 'arch') return f.ring;
  const d = frontAt(T, y);
  return f.ring.map(p => (p[1] < archBulge(T) + 1e-6 && p[1] < T.D / 2 ? [p[0], d] as P : p));
}

/** A circle of radius r round the centre of the L x D box, as a ring in the footprint's order (no repeated point). */
export function circleRing(T: Tank, r: number, n = ROUND_SEG): P[] {
  return Array.from({ length: n }, (_, i) => { const a = -Math.PI + 2 * Math.PI * i / n; return [T.L / 2 + r * Math.sin(a), T.D / 2 - r * Math.cos(a)] as P; });
}

/** How far the widest outline sticks out past the footprint (mm): a bowl's equator past its floor, an arch's front past its frame line; else 0. */
export const bulge = (T: Tank) => (shapeOf(T) === 'bowl' ? T.L / 2 - bowlDims(T).rb : archBulge(T));

/** Interior volume (mm³) between heights y0 and y1: footprint area x height, or a slice of the bowl's sphere. */
export function volumeBetween(T: Tank, y0: number, y1: number, area = footprint(T).area) {
  if (y1 <= y0) return 0;
  if (shapeOf(T) === 'arch') { // the flat box behind the frame line, plus the segment of the side-view arc in front of it
    const b = archBulge(T), H = T.H, R = archRadius(H, b);
    if (b <= 1e-6) return area * (y1 - y0);
    const F = (y: number) => { const z = clamp(y, 0, H) - H / 2; return (z * Math.sqrt(Math.max(0, R * R - z * z)) + R * R * Math.asin(clamp(z / R, -1, 1))) / 2 - (R - b) * z; };
    return area * (y1 - y0) + T.L * (F(y1) - F(y0));
  }
  if (shapeOf(T) !== 'bowl') return area * (y1 - y0);
  const { R, c } = bowlDims(T), F = (y: number) => { const z = clamp(y, 0, T.H) - c; return R * R * z - z * z * z / 3; };
  return Math.PI * (F(y1) - F(y0));
}

/** Smallest end depth of a bowfront: the arc may not be more than a half circle (it would bulge past L). */
export const bowMinLimit = (T: Tank) => Math.max(0, T.D - T.L / 2);

/**
 * A tank with its shape's constraints applied: round D = L (diameter); polygon D from L and the side count; bowfront
 * end depth between the half-circle limit and D; pie slice L from its radius D and angle. A rectangle is plain { L, H, D }, as in files before v8.
 */
export function normTank(T: Tank): Tank {
  const s = shapeOf(T);
  if (s === 'rect') return { L: T.L, H: T.H, D: T.D }; // stored as plain L x H x D, like every file before v8
  if (s === 'bowl') {
    const lo = T.L * BOWL_MIN, hi = T.L * BOWL_MAX, f = +clamp(T.bowlFloor ?? T.L * BOWL_DEFAULT, lo, hi).toFixed(1), t = +clamp(T.bowlTop ?? T.L * BOWL_DEFAULT, lo, hi).toFixed(1);
    const B: Tank = { L: T.L, H: T.H, D: T.L, shape: 'bowl', bowlFloor: f, bowlTop: t };
    return { ...B, H: +bowlDims(B).H.toFixed(1) };
  }
  if (s === 'pie') { const deg = Math.round(clamp(T.pieDeg ?? PIE_DEFAULT, PIE_MIN, PIE_MAX)), r = T.D / (1 - Math.cos(Math.max(Math.PI / 2, deg * Math.PI / 360))); return { L: +pieWidth(r, deg).toFixed(1), H: T.H, D: T.D, shape: 'pie', pieDeg: deg }; }
  if (s === 'arch') return { L: T.L, H: T.H, D: T.D, shape: 'arch', frontBulge: +archBulge(T).toFixed(1) };
  T = { ...T, bowlFloor: undefined, bowlTop: undefined, pieDeg: undefined, frontBulge: undefined, ...(s === 'poly' ? {} : { sideLens: undefined }) };
  if (s === 'round') return { ...T, D: T.L, sides: undefined, bowMin: undefined };
  if (s === 'poly') {
    const n = clamp(Math.round(T.sides ?? 6), POLY_MIN, POLY_MAX), lens = T.sideLens?.length === n ? T.sideLens : undefined, g = lens ? cyclicPolygon(lens) : undefined;
    if (lens && g && typeof g !== 'string' && Math.max(...lens) - Math.min(...lens) > 0.05) return { ...T, sides: n, sideLens: lens.map(v => +v.toFixed(1)), L: +g.L.toFixed(1), D: +g.D.toFixed(1), bowMin: undefined };
    return { ...T, sides: n, sideLens: undefined, D: +(T.L * polyRatio(n)).toFixed(1), bowMin: undefined };
  }
  const lo = bowMinLimit(T), b = T.bowMin ?? T.D * 0.75;
  return { ...T, sides: undefined, bowMin: +clamp(b, Math.min(T.D, Math.max(lo, 20)), T.D).toFixed(1) };
}

function makeWalls(T: Tank): Wall[] {
  const { L, D } = T, s = shapeOf(T);
  if (s === 'round' || s === 'bowl') {
    const R = L / 2, r = s === 'bowl' ? bowlDims(T).rb : R, pts: P[] = [];
    for (let i = 0; i <= ROUND_SEG; i++) { const a = -Math.PI + 2 * Math.PI * i / ROUND_SEG; pts.push([R + r * Math.sin(a), R - r * Math.cos(a)]); }
    return [{ pts, curved: true }];
  }
  if (s === 'pie') {
    // apex at the back centre (depth D = radius), the arc toward the viewer, then the right pane back to the apex and
    // the left pane out to the arc's start: a corner tank (90°) points its corner away, a half round has a flat back
    const r = pieRadius(T), h = pieHalf(T), n = Math.max(8, Math.ceil(ROUND_SEG * h / Math.PI)), pts: P[] = [];
    for (let i = 0; i <= n; i++) { const a = -h + 2 * h * i / n; pts.push([L / 2 + r * Math.sin(a), r - r * Math.cos(a)]); }
    if (h > Math.PI - 1e-6) return [{ pts, curved: true }]; // 360 deg: a full cylinder, no flat panes (exactly a round tank)
    if (Math.abs(h - Math.PI / 2) < 1e-6) return [{ pts, curved: true }, { pts: [pts[n], pts[0]], curved: false }]; // half round: one flat back pane
    const apex: P = [L / 2, r];
    return [{ pts, curved: true }, { pts: [pts[n], apex], curved: false }, { pts: [apex, pts[0]], curved: false }];
  }
  if (s === 'poly') {
    const g = T.sideLens ? cyclicPolygon(T.sideLens) : undefined;
    const u = unitPoly(T.sides ?? 6), x0 = Math.min(...u.map(q => q[0])), x1 = Math.max(...u.map(q => q[0])), d0 = Math.min(...u.map(q => q[1]));
    const k = L / (x1 - x0), v = g && typeof g !== 'string' ? g.pts : u.map(q => [(q[0] - x0) * k, (q[1] - d0) * k] as P);
    return v.map((p, i) => ({ pts: [p, v[(i + 1) % v.length]], curved: false }));
  }
  if (s === 'arch') { // the flat rectangle behind the frame line; the front pane's curve is in height (frontAt)
    const e = archBulge(T);
    return [{ pts: [[0, e], [L, e]], curved: false }, { pts: [[L, e], [L, D]], curved: false }, { pts: [[L, D], [0, D]], curved: false }, { pts: [[0, D], [0, e]], curved: false }];
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
  const key = `${shapeOf(T)}|${T.L}|${T.D}|${T.sides}|${T.sideLens}|${T.sideLens}|${T.bowMin}|${T.bowlFloor}|${T.pieDeg}|${T.frontBulge}`;
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
  let convex = true;
  for (let i = 0; i < edges.length; i++) { const a = edges[i], b = edges[(i + 1) % edges.length]; if ((a.b[0] - a.a[0]) * (b.b[1] - b.a[1]) - (a.b[1] - a.a[1]) * (b.b[0] - b.a[0]) < -1e-6) { convex = false; break; } }
  f = { walls, ring, edges, area: Math.abs(area) / 2, perimeter: s, convex };
  cache.set(key, f); if (cache.size > 32) cache.delete(cache.keys().next().value!);
  return f;
}

/** Signed distance (mm) from (x, depth) to the outline: positive inside. Exact for convex outlines away from corners. */
export function insideBy(T: Tank, x: number, d: number): number {
  const f = footprint(T);
  if (!f.convex) { // a concave outline (a pie past 180 deg): inside by winding, distance to the nearest glass
    let m = Infinity, wind = 0;
    for (const e of f.edges) {
      const dx = e.b[0] - e.a[0], dd = e.b[1] - e.a[1], t = clamp(((x - e.a[0]) * dx + (d - e.a[1]) * dd) / (e.len * e.len), 0, 1);
      m = Math.min(m, Math.hypot(e.a[0] + dx * t - x, e.a[1] + dd * t - d));
      if ((e.a[1] <= d) !== (e.b[1] <= d) && x < e.a[0] + (d - e.a[1]) / dd * dx) wind += dd > 0 ? 1 : -1;
    }
    return wind !== 0 ? m : -m;
  }
  let m = Infinity;
  for (const e of f.edges) m = Math.min(m, -((x - e.a[0]) * e.n[0] + (d - e.a[1]) * e.n[1]));
  return m;
}

/** Is (x, depth) inside the footprint, at least `inset` mm from the glass? */
export const inside = (T: Tank, x: number, d: number, inset = 0) => insideBy(T, x, d) >= inset - 1e-6;

/** The nearest spot at least `inset` mm inside the glass (unchanged if it already is). Too big an inset: the middle. */
export function clampIn(T: Tank, x: number, d: number, inset = 0): { x: number; depth: number } {
  const { edges, convex } = footprint(T);
  if (!convex) { // concave: step in from the nearest glass
    if (inside(T, x, d, inset)) return { x, depth: d };
    const g = nearestGlass(T, x, d), px = g.x - g.n[0] * inset, pd = g.depth - g.n[1] * inset;
    return inside(T, px, pd, inset * 0.5) ? { x: px, depth: pd } : { x: T.L / 2, depth: Math.min(T.D / 2, pieRadius(T) * 0.5) };
  }
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

/**
 * The nearest point on the glass (inside face) to (x, depth), with its outward normal and arc length. A bowl's glass
 * depends on the height: give `y` and the point is on the sphere's circle there (else on the floor's edge).
 */
export function nearestGlass(T: Tank, x: number, d: number, y?: number): OnGlass {
  const f = footprint(T);
  if (y !== undefined && shapeOf(T) === 'bowl') {
    const R = T.L / 2, r = bowlRadius(T, y), a = Math.atan2(x - R, -(d - R)) || 0, n: P = [Math.sin(a), -Math.cos(a)];
    return { x: R + r * n[0], depth: R + r * n[1], n, s: ((a + Math.PI) / (2 * Math.PI)) * f.perimeter, wall: 0 };
  }
  if (y !== undefined && shapeOf(T) === 'arch') { // the front pane is the arc at that height
    const g = nearestGlass(T, x, d);
    return g.n[1] < -0.5 ? { ...g, depth: frontAt(T, y) } : g;
  }
  let best: OnGlass = { x, depth: d, n: [0, -1], s: 0, wall: 0 }, bd = Infinity;
  f.edges.forEach((e, i) => {
    const dx = e.b[0] - e.a[0], dd = e.b[1] - e.a[1], t = clamp(((x - e.a[0]) * dx + (d - e.a[1]) * dd) / (e.len * e.len), 0, 1);
    const px = e.a[0] + dx * t, pd = e.a[1] + dd * t, q = (px - x) ** 2 + (pd - d) ** 2;
    if (q < bd - 1e-9) { bd = q; best = { x: px, depth: pd, n: normalAt(f, i, t), s: e.s0 + e.len * t, wall: e.wall }; }
  });
  return best;
}

/**
 * The glass at height y nearest (x, depth), with its outward normal in 3D as [along x, up, along depth]: upright panes
 * have no vertical part; a bowl's sphere leans in above the equator (normal tilts up) and out below it (tilts down).
 */
export function glassFrame(T: Tank, x: number, d: number, y: number): { x: number; depth: number; n: [number, number, number] } {
  const g = nearestGlass(T, x, d, y);
  if (shapeOf(T) === 'arch' && g.n[1] < -0.5) { const k = frontSlope(T, y), l = Math.hypot(1, k); return { x: g.x, depth: g.depth, n: [0, k / l, -1 / l] }; } // leans up above mid-height
  if (shapeOf(T) !== 'bowl') return { x: g.x, depth: g.depth, n: [g.n[0], 0, g.n[1]] };
  const { R, c } = bowlDims(T), ny = clamp((y - c) / R, -1, 1), h = Math.sqrt(1 - ny * ny);
  return { x: g.x, depth: g.depth, n: [g.n[0] * h, ny, g.n[1] * h] };
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
  if (!footprint(T).convex) { const c = poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]); return inside(T, c[0], c[1]) ? poly : []; } // concave: a cell is kept whole or dropped
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
  if (!footprint(T).convex) { // concave: the outer span of where the line crosses the outline (the notch is not left out)
    const xs: number[] = [];
    for (const e of footprint(T).edges) {
      const a = axis === 0 ? e.a : [e.a[1], e.a[0]], b = axis === 0 ? e.b : [e.b[1], e.b[0]];
      if ((a[0] <= v) !== (b[0] <= v)) xs.push(a[1] + (v - a[0]) / (b[0] - a[0]) * (b[1] - a[1]));
    }
    return xs.length < 2 ? null : [Math.min(...xs), Math.max(...xs)];
  }
  let lo = -Infinity, hi = Infinity;
  for (const e of footprint(T).edges) {
    // inside: (p - a) . n <= 0 with p = (v, w) or (w, v); linear in w
    const c = axis === 0 ? (v - e.a[0]) * e.n[0] - e.a[1] * e.n[1] : (v - e.a[1]) * e.n[1] - e.a[0] * e.n[0], k = axis === 0 ? e.n[1] : e.n[0];
    if (Math.abs(k) < 1e-12) { if (c > 1e-6) return null; continue; }
    const w = -c / k; if (k > 0) hi = Math.min(hi, w); else lo = Math.max(lo, w);
  }
  return lo <= hi ? [lo, hi] : null;
}

/** Half the widest outline's width (grown by `grow` mm) across a horizontal view direction (ux, uz); z = -depth. */
export function halfWidth(T: Tank, ux: number, uz: number, grow: number) {
  const cx = T.L / 2, cd = T.D / 2;
  let m = 0;
  for (const p of offsetRing(T, grow + bulge(T))) m = Math.max(m, Math.abs((p[0] - cx) * -uz + (-(p[1] - cd)) * ux));
  return m;
}

/**
 * Runs of the outer ring (offset t) whose outward normal faces direction `dir` within `cos` (e.g. the front: [0, -1]);
 * given several directions, an edge facing any of them.
 */
export function facingRuns(T: Tank, t: number, dir: P | P[], cos = 0.5): P[][] {
  const dirs = (typeof dir[0] === 'number' ? [dir] : dir) as P[];
  const f = footprint(T), ring = offsetRing(T, t), n = f.edges.length, ok = f.edges.map(e => dirs.some(d => e.n[0] * d[0] + e.n[1] * d[1] > cos));
  if (!ok.some(Boolean)) return [];
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

/** The sides a background can cover, as directions from the tank (footprint coordinates: depth grows toward the back). */
export const BG_DIRS = { back: [0, 1], left: [-1, 0], right: [1, 0], front: [0, -1] } as const satisfies Record<string, P>;

/**
 * Runs of the glass the background covers: every pane facing one of `sides` (within ~72°, so an angled pane between
 * two chosen sides is covered once). A round tank instead takes an arc of `arcDeg` degrees centred on each chosen side;
 * overlapping arcs merge, 360° is the whole shell. Each run goes from its front-left end. `out` = 0: just inside the
 * inner glass; `out` > 0: that far outside the inner glass (t + a hair: on the outer face, as a real background is).
 */
export function backgroundRuns(T: Tank, sides: readonly (keyof typeof BG_DIRS)[], arcDeg: number, out = 0): P[][] {
  if (!sides.length) return [];
  let runs: P[][];
  if (shapeOf(T) === 'round' || shapeOf(T) === 'bowl') { // a bowl: arcs round the axis (addBowl draws them on its sphere)
    // inside every chord of the inner shell, or (out > 0) outside every chord of the shell grown by out, so the
    // background never pokes into the glass between its vertices
    const R = T.L / 2, cs = Math.cos(Math.PI / ROUND_SEG), r = out > 0 ? R + out / cs : R * cs, TAU = 2 * Math.PI, half = (clamp(arcDeg, 0, 360) / 360) * Math.PI;
    const pt = (a: number): P => [R + r * Math.sin(a), R - r * Math.cos(a)];
    const iv = sides.map(k => { const [x, d] = BG_DIRS[k], c = (Math.atan2(x, -d) + TAU) % TAU; return [c - half, c + half]; }).sort((a, b) => a[0] - b[0]);
    const m: number[][] = [];
    for (const [a, b] of iv) { const l = m[m.length - 1]; if (l && a <= l[1]) l[1] = Math.max(l[1], b); else m.push([a, b]); }
    if (m.length > 1 && m[m.length - 1][1] >= m[0][0] + TAU) { m[0][0] = m[m.length - 1][0] - TAU; m[0][1] = Math.max(m[0][1], m[m.length - 1][1] - TAU); m.pop(); }
    if (m[0][1] - m[0][0] >= TAU - 1e-6) return [Array.from({ length: ROUND_SEG + 1 }, (_, i) => pt(TAU * i / ROUND_SEG))];
    runs = m.filter(([a, b]) => b - a > 1e-6).map(([a, b]) => { const n = Math.max(2, Math.ceil((b - a) / (TAU / ROUND_SEG))); return Array.from({ length: n + 1 }, (_, i) => pt(a + (b - a) * i / n)); });
  } else {
    runs = facingRuns(T, out, sides.map(k => BG_DIRS[k] as unknown as P), 0.3);
  }
  return runs.map(q => (q[0][0] + q[0][1] > q[q.length - 1][0] + q[q.length - 1][1] ? [...q].reverse() : q));
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

/** Triangles (index triples into `ring`) of a simple polygon, convex or not (ear clipping): what a flat floor or water surface is drawn with. */
export function triangulate(ring: readonly P[]): [number, number, number][] {
  const n = ring.length, out: [number, number, number][] = [];
  if (n < 3) return out;
  let area = 0; for (let i = 0; i < n; i++) { const p = ring[i], q = ring[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; }
  const idx = Array.from({ length: n }, (_, i) => i); if (area < 0) idx.reverse();
  const cross = (a: P, b: P, c: P) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  let guard = n * n;
  while (idx.length > 3 && guard-- > 0) {
    let cut = false;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length], a = ring[i0], b = ring[i1], c = ring[i2];
      if (cross(a, b, c) <= 1e-9) continue;
      if (idx.some(j => j !== i0 && j !== i1 && j !== i2 && cross(a, b, ring[j]) >= -1e-9 && cross(b, c, ring[j]) >= -1e-9 && cross(c, a, ring[j]) >= -1e-9)) continue;
      out.push([i0, i1, i2]); idx.splice(k, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}
