// The ground: the substrate (four corner depths) plus, for the swamp layout, land masses rising above the water with
// pools cut into them. Pure functions of scene data, shared by the renderer (substrate mesh, layouts, fish) and the
// placement rules (fish stay in the water). Pool shapes are fractions of L and D, the land height a fraction of H, so
// Tank B gets the same arrangement at the same relative spots.
import { rng } from '../art/paint';
import { clamp, substrateHeight } from './physics';
import { PIE_DEFAULT, bowlDims, bowlRadius, clampIn, inside, insideBy, shapeOf } from './shape';
import type { BackdropSettings, LayoutSettings, SubstrateSettings, Tank, TerrainSettings } from './types';

export interface Ground { substrate: SubstrateSettings; layout: LayoutSettings; terrain?: TerrainSettings; backdrop?: BackdropSettings }

/** Land top in the swamp layout, as a fraction of interior height (the water is set below it when it is chosen). */
export const SWAMP_LAND = 0.62;
/** Water level the swamp layout starts with (fraction of full), well below the land. */
export const SWAMP_LEVEL = 0.42;

interface Pool { x: number; d: number; rx: number; rd: number }
interface Swamp { pools: Pool[]; waves: [number, number, number, number][] }

const swamps = new Map<number, Swamp>();
/** The swamp's pools and land undulation for a seed (fractions of L, D). */
function swamp(seed: number): Swamp {
  let s = swamps.get(seed);
  if (s) return s;
  const r = rng(seed * 2654435761 + 17);
  // one pool always opens onto the front glass, so the water (and the fish) can be seen; often a second one behind
  const pools: Pool[] = [{ x: 0.3 + r() * 0.4, d: r() * 0.15, rx: 0.2 + r() * 0.12, rd: 0.45 + r() * 0.2 }];
  if (r() < 0.6) {
    const left = pools[0].x > 0.5;
    pools.push({ x: left ? 0.12 + r() * 0.12 : 0.76 + r() * 0.12, d: 0.35 + r() * 0.4, rx: 0.1 + r() * 0.06, rd: 0.18 + r() * 0.1 });
  }
  const waves = Array.from({ length: 4 }, () => [(r() - 0.5) * 14, (r() - 0.5) * 14, r() * 6.28, 0.4 + r() * 0.6] as [number, number, number, number]);
  s = { pools, waves }; swamps.set(seed, s);
  return s;
}

/** Swamp land height (mm) at (x, depth): a rolling bank at ~SWAMP_LAND x H, falling to 0 inside the pools. */
export function swampLand(T: Tank, seed: number, x: number, depth: number): number {
  const { pools, waves } = swamp(seed), u = clamp(x / T.L, 0, 1), v = clamp(depth / T.D, 0, 1);
  let wet = 0; // 1 inside a pool's core, easing to 0 across its bank
  for (const p of pools) {
    const e = Math.hypot((u - p.x) / p.rx, (v - p.d) / p.rd), k = clamp((1 - e) / 0.35, 0, 1);
    wet = Math.max(wet, k * k * (3 - 2 * k));
  }
  let n = 0; for (const [a, b, ph, amp] of waves) n += amp * Math.sin(a * u + b * v + ph);
  const top = T.H * (SWAMP_LAND + 0.05 * n / waves.length) - 0.06 * T.H * (1 - v); // a little lower toward the front
  return Math.max(0, top) * (1 - wet);
}

/** Catmull-Rom through p1..p2 at t (passes through every point; smooth slopes across them). */
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));

/** Custom terrain height at (x, depth): a smooth surface through every grid point, clamped to the tank. */
export function terrainHeight(t: TerrainSettings, T: Tank, x: number, depth: number): number {
  return clamp(t.radial ? (t.arc ? pieHeight(t, T, x, depth) : radialHeight(t, T, x, depth)) : rectHeight(t, T, x, depth), 0, T.H * 0.95); // overshoot can dip below 0
}

/** Rectangular grid: bicubic Catmull-Rom through the cols x rows points. */
function rectHeight(t: TerrainSettings, T: Tank, x: number, depth: number): number {
  const { cols, rows, h } = t, u = clamp(x / T.L, 0, 1) * (cols - 1), v = clamp(depth / T.D, 0, 1) * (rows - 1);
  const i = Math.min(Math.floor(u), cols - 2), j = Math.min(Math.floor(v), rows - 2), fu = u - i, fv = v - j;
  const at = (a: number, b: number) => h[clamp(b, 0, rows - 1) * cols + clamp(a, 0, cols - 1)];
  const row = (b: number) => cr(at(i - 1, b), at(i, b), at(i + 1, b), at(i + 2, b), fu);
  return cr(row(j - 1), row(j), row(j + 1), row(j + 2), fv);
}

/** Radial grid (round tanks): points on ring k, which has ringCount(k) of them evenly round it (ring 0 = the centre). */
export const ringCount = (k: number) => (k === 0 ? 1 : Math.round(2 * Math.PI * k)); // arc spacing ~ ring spacing
/** Index in h of the first point on ring k. */
const ringStart = (k: number) => { let n = 0; for (let q = 0; q < k; q++) n += ringCount(q); return n; };
/** Points in a radial grid of `rings` rings round the centre. */
export const radialSize = (rings: number) => ringStart(rings + 1);
/** Rings for a slider value (points across the tank), so the spacing matches a rectangular grid of that many columns. */
export const terrainRings = (cols: number) => Math.max(1, Math.round((cols - 1) / 2));

/**
 * Radial grid: Catmull-Rom round each ring (periodic) at the angle, then across the rings at the radius. Ring -1 is
 * ring 1 seen from the opposite side, so the surface is smooth through the centre; past the outer ring it holds that
 * ring's value. Radius and angle are measured in terrainDisc.
 */
function radialHeight(t: TerrainSettings, T: Tank, x: number, depth: number): number {
  const N = t.rows, h = t.h, c = terrainDisc(T), ex = (x - c.x) / c.rx, ed = (depth - c.depth) / c.rd;
  const rho = Math.min(Math.hypot(ex, ed), 1) * N, th = Math.atan2(ed, ex);
  const ring = (k: number, a: number): number => {
    if (k < 0) return ring(-k, a + Math.PI);
    k = Math.min(k, N);
    if (k === 0) return h[0];
    const n = ringCount(k), s = ringStart(k), u = ((((a - RING_A0) / (2 * Math.PI)) % 1 + 1) % 1) * n;
    const i = Math.floor(u), f = u - i, at = (q: number) => h[s + ((q % n) + n) % n];
    return cr(at(i - 1), at(i), at(i + 1), at(i + 2), f);
  };
  const k = Math.min(Math.floor(rho), N - 1), f = rho - k;
  return cr(ring(k - 1, th), ring(k, th), ring(k + 1, th), ring(k + 2, th), f);
}
/** Round tanks and bowls shape their terrain on rings round the centre; every other shape on a rectangular grid. */
export const radialTerrain = (T: Tank) => shapeOf(T) === 'round' || shapeOf(T) === 'bowl';

/**
 * Pie slice grid (Nathan 2026-10-13: the same polar editing as a round tank): ring k is an arc of radius k / rows of the
 * slice's radius round its apex (ring 0 = the apex), from one flat pane to the other, with pieSegs(k) segments so the
 * arc spacing matches the ring spacing. Arc angle in degrees.
 */
export const pieSegs = (k: number, arc: number) => Math.max(1, Math.round(k * arc * Math.PI / 180));
const pieStart = (k: number, arc: number) => { let n = k > 0 ? 1 : 0; for (let q = 1; q < k; q++) n += pieSegs(q, arc) + 1; return n; };
/** Points in a pie grid of `rings` arcs. */
export const pieSize = (rings: number, arc: number) => pieStart(rings + 1, arc);
/** The grid a tank's terrain is shaped on: rectangular, rings (round, bowl) or arcs round a pie slice's apex. */
export const terrainGrid = (T: Tank): { radial?: true; arc?: number } =>
  shapeOf(T) === 'pie' ? { radial: true, arc: T.pieDeg ?? PIE_DEFAULT } : radialTerrain(T) ? { radial: true } : {};
/** Is terrain t on the grid tank T uses (else it is resampled onto it)? */
export const sameGrid = (t: TerrainSettings, T: Tank) => { const g = terrainGrid(T); return !!t.radial === !!g.radial && (t.arc ?? 0) === (g.arc ?? 0); };
/**
 * A spot as (rho, angle) round the pie apex: rho in slice radii, angle from straight ahead (toward the front glass),
 * positive to the right. Exact in a pie slice of that arc; in another shape (Tank B) the slice stretched to L x D.
 */
function piePolar(T: Tank, arc: number, x: number, depth: number) {
  const h = arc * Math.PI / 360, X = (x - T.L / 2) / (T.L / 2) * Math.sin(h), Y = (T.D - depth) / T.D;
  return { rho: Math.hypot(X, Y), a: Math.atan2(X, Y) };
}
/** Floor-plan spot at (rho, angle) round the pie apex (inverse of piePolar). */
function piePoint(T: Tank, arc: number, rho: number, a: number) {
  const h = arc * Math.PI / 360;
  return { x: T.L / 2 + rho * Math.sin(a) * (T.L / 2) / Math.sin(h), depth: T.D - rho * Math.cos(a) * T.D };
}
/** Pie grid: Catmull-Rom along each arc at the angle (ends held), then across the arcs at the radius. */
function pieHeight(t: TerrainSettings, T: Tank, x: number, depth: number): number {
  const N = t.rows, h = t.h, arc = t.arc!, hh = arc * Math.PI / 360, p = piePolar(T, arc, x, depth);
  const rho = Math.min(p.rho, 1) * N, a = clamp(p.a, -hh, hh);
  const ring = (k: number): number => {
    k = clamp(k, 0, N);
    if (k === 0) return h[0];
    const n = pieSegs(k, arc), s = pieStart(k, arc), u = (a + hh) / (2 * hh) * n;
    const i = Math.min(Math.floor(u), n - 1), f = u - i, at = (q: number) => h[s + clamp(q, 0, n)];
    return cr(at(i - 1), at(i), at(i + 1), at(i + 2), f);
  };
  const k = Math.min(Math.floor(rho), N - 1), f = rho - k;
  return cr(ring(k - 1), ring(k), ring(k + 1), ring(k + 2), f);
}
/**
 * The disc a radial grid spans, in floor-plan mm: the bowl's floor circle (the renderer flares the ground out from it
 * to meet the sloping glass), else the ellipse inscribed in L x D (the circle of a round tank).
 */
export function terrainDisc(T: Tank) {
  const r = shapeOf(T) === 'bowl' ? bowlDims(T).rb : 0;
  return { x: T.L / 2, depth: T.D / 2, rx: r || T.L / 2, rd: r || T.D / 2 };
}
/** Angle of the first point on every ring: straight to the front glass, so a dot sits at the front centre. */
const RING_A0 = -Math.PI / 2;

/** Grid rows for a column count, so cells stay roughly square. */
export const terrainRows = (T: Tank, cols: number) => clamp(Math.round((cols - 1) * T.D / T.L) + 1, 2, 25);

/** Position (mm, Tank T) of every grid point, in the order of h. */
export function terrainPoints(t: TerrainSettings, T: Tank): { x: number; depth: number }[] {
  const out: { x: number; depth: number }[] = [];
  if (t.radial && t.arc) {
    const arc = t.arc, hh = arc * Math.PI / 360;
    out.push(piePoint(T, arc, 0, 0));
    for (let k = 1; k <= t.rows; k++) for (let i = 0, n = pieSegs(k, arc); i <= n; i++) out.push(piePoint(T, arc, k / t.rows, -hh + 2 * hh * i / n));
  } else if (t.radial) {
    const c = terrainDisc(T);
    for (let k = 0; k <= t.rows; k++) for (let i = 0, n = ringCount(k); i < n; i++) {
      const a = RING_A0 + 2 * Math.PI * i / n, r = k / t.rows;
      out.push({ x: c.x + c.rx * r * Math.cos(a), depth: c.depth + c.rd * r * Math.sin(a) });
    }
  } else for (let j = 0; j < t.rows; j++) for (let i = 0; i < t.cols; i++) out.push({ x: T.L * i / (t.cols - 1), depth: T.D * j / (t.rows - 1) });
  return out;
}

/**
 * A fresh grid sampled from the current ground (custom terrain if on, else substrate / swamp land): `cols` points across
 * for a rectangular grid, or for a round tank or bowl concentric rings at that spacing, a dot at the centre and the outer ring
 * on the glass; a pie slice, arcs round its apex at that spacing, the outer one on the curved glass.
 */
export function sampleTerrain(g: Ground, T: Tank, cols: number): TerrainSettings {
  const grid = terrainGrid(T);
  const rows = grid.arc ? Math.max(1, Math.round((cols - 1) * T.D / T.L)) : grid.radial ? terrainRings(cols) : terrainRows(T, cols);
  const t: TerrainSettings = { on: true, cols, rows, h: [], ...grid };
  // custom terrain always shows a substrate, so sample as if it were shown: from a bare bottom the grid starts at the
  // corner depths, not all zeros (audit #14: a zero-thickness floor that z-fought into stripes)
  const shown = { ...g, substrate: { ...g.substrate, show: true } };
  t.h = terrainPoints(t, T).map(p => +groundHeight(shown, T, p.x, p.depth).toFixed(1));
  return t;
}

/** Ground height (mm above the tank floor) at (x, depth): custom terrain, else substrate or swamp land where higher. */
export function groundHeight(g: Ground, T: Tank, x: number, depth: number): number {
  if (g.terrain?.on && g.terrain.h.length) return terrainHeight(g.terrain, T, x, depth);
  const base = substrateHeight(g.substrate, T, x, depth);
  return g.layout.id === 'swamp' ? Math.max(base, swampLand(T, g.layout.seed, x, depth)) : base;
}

/**
 * How far (x, depth) lies inside the glass at ground level, mm (negative outside). A bowl's glass there is the sphere's
 * circle at the ground's height, wider than its floor disc (the footprint); every other shape's walls are upright.
 */
export function groundInsideBy(g: Ground, T: Tank, x: number, depth: number): number {
  if (shapeOf(T) !== 'bowl') return insideBy(T, x, depth);
  return bowlRadius(T, groundHeight(g, T, x, depth)) - Math.hypot(x - T.L / 2, depth - T.D / 2);
}

/**
 * The nearest spot at least `inset` mm inside the glass, for a piece standing on the ground there from `from` to `to`
 * mm above it. Upright walls: clampIn. A bowl: inside the sphere's circle at both ends of that span (the sphere bulges
 * between them), so a piece can stand anywhere on the substrate, not just over the floor disc (2026-10-12).
 */
export function clampGround(g: Ground, T: Tank, x: number, depth: number, inset = 0, from = 0, to = from) {
  if (shapeOf(T) !== 'bowl') return clampIn(T, x, depth, inset);
  const cx = T.L / 2, cd = T.D / 2;
  for (let k = 0; k < 8; k++) { // the ground may slope: re-read its height where the spot moved to
    const y = groundHeight(g, T, x, depth), top = Math.min(y + to, T.H - 15);
    const r = Math.min(bowlRadius(T, y + from), bowlRadius(T, Math.max(top, y + from))) - inset, q = Math.hypot(x - cx, depth - cd);
    if (r <= 0) return { x: cx, depth: cd };
    if (q <= r + 1e-6) break;
    x = cx + (x - cx) * r / q; depth = cd + (depth - cd) * r / q;
  }
  return { x, depth };
}

/**
 * The nearest spot (x, depth) to the given one where at least `need` mm of water stands over the ground, sampled on a
 * grid. If no spot has that much (a fish taller than the water anywhere), the nearest spot with at least 3/4 of the
 * deepest water, or the given spot itself if it already has that (audit #1: the old "deepest spot" fallback sent every
 * fish on a flat floor to the first grid corner, x = 12 mm); null only if the water is below all the land.
 */
export function nearestWater(g: Ground, T: Tank, top: number, x: number, depth: number, need: number) {
  const N = 40, spots: { x: number; depth: number; water: number; dd: number }[] = [];
  let dw = 0;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const px = T.L * (0.02 + 0.96 * i / N), pd = T.D * (0.02 + 0.96 * j / N);
    if (!inside(T, px, pd, 0.02 * Math.min(T.L, T.D))) continue;
    const water = top - groundHeight(g, T, px, pd); dw = Math.max(dw, water);
    spots.push({ x: px, depth: pd, water, dd: (px - x) ** 2 + (pd - depth) ** 2 });
  }
  if (dw <= 0) return null;
  const want = Math.min(need, dw * 0.75);
  if (want < need && top - groundHeight(g, T, x, depth) >= want) return { x, depth };
  let best: { x: number; depth: number } | null = null, bd = Infinity;
  for (const p of spots) if (p.water >= want && p.dd < bd) { bd = p.dd; best = { x: p.x, depth: p.depth }; }
  return best;
}

/** The nearest spot (x, depth) to the given one where the ground stands above the water surface `top`; null if none. */
export function nearestLand(g: Ground, T: Tank, top: number, x: number, depth: number) {
  const N = 40;
  let best: { x: number; depth: number } | null = null, bd = Infinity;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const px = T.L * (0.02 + 0.96 * i / N), pd = T.D * (0.02 + 0.96 * j / N);
    if (!inside(T, px, pd, 0.02 * Math.min(T.L, T.D)) || groundHeight(g, T, px, pd) < top) continue;
    const dd = (px - x) ** 2 + (pd - depth) ** 2;
    if (dd < bd) { bd = dd; best = { x: px, depth: pd }; }
  }
  return best;
}

/** A random spot on ground above the water surface `top` (any ground when `top` <= 0); null if there is no land. */
export function randomLand(g: Ground, T: Tank, top: number, r: () => number) {
  for (let k = 0; k < 400; k++) {
    const x = T.L * (0.05 + 0.9 * r()), depth = T.D * (0.08 + 0.84 * r());
    if (inside(T, x, depth, 0.05 * Math.min(T.L, T.D)) && groundHeight(g, T, x, depth) >= top) return { x, depth };
  }
  return nearestLand(g, T, top, T.L * r(), T.D * r());
}
