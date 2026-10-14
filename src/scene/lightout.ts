// Real light output (lane K, 2026-10-14; design: reference/light-output-draft.md). Watts and the light technology give
// photons; the fixture's emitters and beam (moved here from render/lighting.ts, which re-exports them) put those photons
// in place, in µmol/m²/s, through the air, the water surface (loss, refraction), off the side glass (mirror images) and
// through the water (three colour bands, each with its own absorption). The one source of truth for PAR and lux: the
// Light map shader (render/lighting.ts aqIrr) is a port of `bandsAt`, and the hover readout calls it directly.
// Pure (no three.js), unit-tested in test/lightout.test.ts against published PAR-at-depth data.
import { D2R, clamp, waterK, waterY } from './physics';
import { insideBy, shapeOf, type P } from './shape';
import { groundHeight, groundInsideBy, type Ground } from './terrain';
import type { LidType, LightSettings, LightTech, LightType, Tank, WaterSettings } from './types';

// ---------- fixture geometry (was render/lighting.ts) ----------

export const AQ_MAX = 48, LAMP_Y = 50;
export const CONES: Record<Exclude<LightType, 'flat'>, [number, number]> = {
  spot: [Math.cos(18 * D2R), Math.cos(34 * D2R)], tube: [0.45, -0.15], led: [Math.cos(45 * D2R), Math.cos(75 * D2R)],
};
/** Spot beam (full angle, degrees) -> [cos inner, cos outer] half-angles; the default 52° gives the old 18°/34°. */
const spotCone = (deg: number): [number, number] => [Math.cos(Math.min(deg * 0.35, 80) * D2R), Math.cos(Math.min(deg * 0.65, 85) * D2R)];
/** The fixture's beam, and how much brighter it is per unit area than the standard one (same output, narrower beam). */
export function beam(l: LightSettings): { cone: [number, number]; gain: number } {
  if (l.type !== 'spot') return { cone: CONES[l.type as Exclude<LightType, 'flat'>], gain: 1 };
  const deg = l.cone ?? 52, solid = (a: number) => 1 - Math.cos(a / 2 * D2R);
  return { cone: spotCone(deg), gain: solid(52) / solid(deg) };
}
/** [x, y, z, halfLength]: halfLength > 0 means a line emitter along x. */
export type Emitter = [number, number, number, number];

/** Fixture height above the tank top (mm): the setting, or LAMP_Y inside a hood. */
export const lampHeight = (l: LightSettings, lid: string) => (lid === 'hood' ? LAMP_Y : l.height ?? LAMP_Y);

export function emitters(T: Tank, l: LightSettings, height = l.height ?? LAMP_Y): Emitter[] {
  const { L, H, D } = T, y = H + height, n = l.count, E: Emitter[] = [];
  // spots: a count × rows grid (rows run front to back), centred over the tank. Auto spacing (0) spreads it to fill
  // the tank; a set spacing is centre to centre, with rows √3/2 of it apart in the triangular pattern. 'tri' staggers
  // the rows: the middle row (or the back one, with an even number) has `count` bulbs, its neighbours one fewer.
  if (l.type === 'spot' && l.pattern === 'fit') for (const [x, d] of fitSpots(T, n)) E.push([x, y, -d, 0]);
  else if (l.type === 'spot') {
    const m = l.rows ?? 1, s = l.spacing ?? 0, tri = l.pattern === 'tri';
    const sx = s > 0 ? s : L / n, sz = s > 0 ? (tri ? s * Math.sqrt(3) / 2 : s) : D / m;
    for (let j = 0; j < m; j++) {
      const k = tri && j % 2 !== (m % 2 ? ((m - 1) / 2) % 2 : 1) ? Math.max(n - 1, 1) : n, z = -D / 2 - (j - (m - 1) / 2) * sz;
      for (let i = 0; i < k; i++) E.push([L / 2 + (i - (k - 1) / 2) * sx, y, z, 0]);
    }
  }
  if (l.type === 'tube') for (let i = 0; i < n; i++) E.push([L / 2, y, -D * (i + 0.5) / n, L * 0.45]);
  if (l.type === 'led') {
    const cols = clamp(Math.round(L * 0.9 / 45), 2, 24);
    for (const r of [0.38, 0.62]) for (let c = 0; c < cols; c++) E.push([L * (0.05 + 0.9 * (c + 0.5) / cols), y, -D * r, 0]);
  }
  return E.slice(0, AQ_MAX);
}

const fitCache = new Map<string, P[]>();
/**
 * `n` bulb positions [x, depth] that cover the tank's outline evenly, for odd shapes a grid fits badly (Nathan,
 * 2026-10-13: a 90° pie wants one bulb toward the corner and one near each end of the arc). Centroidal Voronoi:
 * every bulb sits at the centre of the floor area nearer to it than to any other bulb, which minimises the mean
 * distance from the floor to its nearest bulb. Lloyd's iteration over a sample grid of the footprint, from a few
 * deterministic starts (farthest-point seeding), keeping the best; cached per outline and count.
 */
export function fitSpots(T: Tank, n: number): P[] {
  const key = `${shapeOf(T)}|${T.L}|${T.D}|${T.sides}|${T.bowMin}|${T.bowlFloor}|${T.pieDeg}|${n}`;
  const hit = fitCache.get(key);
  if (hit) return hit;
  const g = 48, S: P[] = [];
  for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) {
    const x = T.L * (i + 0.5) / g, d = T.D * (j + 0.5) / g;
    if (insideBy(T, x, d) > 0) S.push([x, d]);
  }
  if (!S.length) S.push([T.L / 2, T.D / 2]);
  const near = (p: P, c: P[]) => { let k = 0, b = Infinity; c.forEach((q, i) => { const v = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (v < b) { b = v; k = i; } }); return [k, b]; };
  let best: P[] = [], bestE = Infinity;
  // starts: farthest-point seeding from the centroid, and from each of a few spread samples
  const mean: P = [S.reduce((a, p) => a + p[0], 0) / S.length, S.reduce((a, p) => a + p[1], 0) / S.length];
  for (const first of [mean, S[0], S[S.length >> 1], S[S.length - 1], S[Math.floor(S.length / 3)]]) {
    let c: P[] = [first];
    while (c.length < n) { let f = S[0], fd = -1; for (const p of S) { const v = near(p, c)[1]; if (v > fd) { fd = v; f = p; } } c.push(f); }
    for (let it = 0; it < 120; it++) {
      const acc = c.map(() => [0, 0, 0]);
      for (const p of S) { const a = acc[near(p, c)[0]]; a[0] += p[0]; a[1] += p[1]; a[2]++; }
      const next = acc.map((a, i): P => (a[2] ? [a[0] / a[2], a[1] / a[2]] : c[i]));
      const moved = Math.max(...next.map((q, i) => Math.hypot(q[0] - c[i][0], q[1] - c[i][1])));
      c = next;
      if (moved < 0.05) break;
    }
    const E = S.reduce((a, p) => a + near(p, c)[1], 0);
    if (!best.length || E < bestE * (1 - 1e-6)) { bestE = E; best = c; }
  }
  // front to back, left to right, so the bulbs keep a stable order
  best = best.map(p => [+p[0].toFixed(1), +p[1].toFixed(1)] as P).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  fitCache.set(key, best); if (fitCache.size > 32) fitCache.delete(fitCache.keys().next().value!);
  return best;
}

// ---------- light technologies ----------

/** Blue (400-500 nm), green (500-600), red (600-700): a per-band value. */
export type Band = [number, number, number];
/**
 * Lux per µmol/m²/s of each band: 683 lm/W x the eye's response V(λ) x the energy of a µmol of photons, averaged over
 * the band (V is small at both ends of PAR). With a tech's photon split these give its lux factor (TECHS, `luxPer`),
 * checked against Apogee's (Thimijan & Heins 1982): cool-white fluorescent 74, metal halide 71, sunlight 54.
 */
export const LUXW: Band = [13, 111, 21];
/** Pure water's absorption per metre, averaged over each band (about 0.01 /m in the blue, 0.35 /m at 650 nm). */
export const KWATER: Band = [0.012, 0.07, 0.35];
/** How much of the water's visual tint (`opacity`, as `waterK`) also dims the light. */
export const TINT_SHARE = 0.5;
export const NWATER = 1.33, FRESNEL = 0.97, GLASS_LID = 0.9, WALL_W = 0.7;

export interface Tech {
  label: string;
  /** Fixture types it can go in. */
  on: LightType[];
  /** Photon efficacy (µmol/J) and the fixture's own losses (lens, reflector, ballast, ageing): photons out = W x ppe x eta. */
  ppe: number; eta: number;
  /** Share of its photons in each band (sums to 1). */
  split: Band;
  /** How far the estimate can be off (fraction), from the calibration: LED about ±30%, the rest ±50%. */
  unc: number;
}
// Calibration (reference/par-calibration-data.md, test/lightout.test.ts): reef LED PPE 1.75 fits the AI Hydra 32 HD
// (in air, -7..+9%), white LED 1.6 x 0.9 the JBL Solar Natur (in water, -20..+22%). T5 HO with reflectors fits the
// Barr Report readings at eta 0.75 once the side glass is modelled (the first hand check, which left the glass out,
// suggested 0.4-0.5). T8, CFL, metal halide, halogen: no dataset yet. LED band splits are set from the lux factors
// (white ~67, planted ~48, reef ~26 lux per µmol), not measured.
export const TECHS: Record<LightTech, Tech> = {
  'led-white': { label: 'LED, white', on: ['spot', 'tube', 'led'], ppe: 1.6, eta: 0.9, split: [0.22, 0.53, 0.25], unc: 0.3 },
  'led-planted': { label: 'LED, planted RGB', on: ['spot', 'led'], ppe: 1.8, eta: 0.9, split: [0.33, 0.33, 0.34], unc: 0.3 },
  'led-reef': { label: 'LED, reef (blue)', on: ['spot', 'led'], ppe: 1.75, eta: 0.9, split: [0.78, 0.13, 0.09], unc: 0.3 },
  't5-refl': { label: 'T5 HO, own reflectors', on: ['tube'], ppe: 1.2, eta: 0.75, split: [0.2, 0.6, 0.2], unc: 0.5 },
  't5-bare': { label: 'T5 HO, bare', on: ['tube'], ppe: 1.2, eta: 0.45, split: [0.2, 0.6, 0.2], unc: 0.5 },
  't8': { label: 'T8', on: ['tube'], ppe: 0.85, eta: 0.5, split: [0.2, 0.6, 0.2], unc: 0.5 },
  'cfl': { label: 'CFL / power compact', on: ['spot', 'tube'], ppe: 0.8, eta: 0.5, split: [0.2, 0.59, 0.21], unc: 0.5 },
  'mh': { label: 'Metal halide pendant', on: ['spot'], ppe: 1.3, eta: 0.7, split: [0.24, 0.57, 0.19], unc: 0.5 },
  'halogen': { label: 'Incandescent / halogen', on: ['spot'], ppe: 0.3, eta: 0.6, split: [0.08, 0.36, 0.56], unc: 0.5 },
};
export const TECH_IDS = Object.keys(TECHS) as LightTech[];
export const techsFor = (type: LightType) => TECH_IDS.filter(t => TECHS[t].on.includes(type));
/** The fixture's tech: its setting if that fits the type, else the type's usual one. */
export function techOf(l: LightSettings): LightTech {
  if (l.tech && TECHS[l.tech].on.includes(l.type)) return l.tech;
  return l.type === 'tube' ? 't5-refl' : 'led-white';
}
/** Lux per µmol/m²/s of a tech's light in air. */
export const luxPer = (t: LightTech) => TECHS[t].split.reduce((a, s, i) => a + s * LUXW[i], 0);
export const parOf = (b: Band) => b[0] + b[1] + b[2];
export const luxOf = (b: Band) => b[0] * LUXW[0] + b[1] * LUXW[1] + b[2] * LUXW[2];

// ---------- the model ----------

const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** ∫ beam profile over the sphere (sr): what turns a point emitter's µmol/s into µmol/s/sr. */
export const pointNorm = (c: [number, number]) => 2 * Math.PI * ((1 - c[0]) + (c[0] - Math.max(c[1], -1)) / 2);
/** ∫ beam profile round the tube's axis (rad), the 2D equivalent for a line emitter. */
export function lineNorm(c: [number, number]) {
  let s = 0; const n = 720;
  for (let i = 0; i < n; i++) s += smooth(c[1], c[0], Math.cos(-Math.PI + 2 * Math.PI * (i + 0.5) / n));
  return s * 2 * Math.PI / n;
}

/** Everything `bandsAt` needs, from the settings once (lightEnv) or built by hand (the calibration tests). */
export interface LightEnv {
  E: Emitter[];
  /** µmol/s per emitter (a line emitter: over its whole length). */
  phi: number;
  cone: [number, number];
  /** pointNorm or lineNorm of the cone (by the emitters' kind). */
  norm: number;
  split: Band;
  /** Absorption per mm of water, per band. */
  k: Band;
  /** Water surface height (mm); -Infinity for a dry tank. */
  ys: number;
  /** Lid and other losses on the way down (glass lid 0.9). */
  trans: number;
  /** Rectangular tank: the side glass as mirrors, weight w (others: null). */
  walls: { L: number; D: number; w: number } | null;
  /** PAR override: scales every value so the substrate mean matches the user's reading (1 = estimate). */
  scale: number;
}

/** Add one emitter's light at p (normal n) into out, by band; weight w (a wall image: WALL_W x the gate). */
function addSrc(env: LightEnv, px: number, py: number, pz: number, nx: number, ny: number, nz: number, ex: number, ey: number, ez: number, h: number, w: number, out: Band) {
  // refraction (paraxial): below the surface, a depth of w counts as w / 1.33 of distance, as if seen from above
  const wd = py < env.ys ? env.ys - py : 0, dy = wd > 0 ? ey - env.ys + wd / NWATER : ey - py;
  if (dy <= 0) return;
  let e0: number, sinA: number;
  if (h > 0) { // line along x: 2D beam round the axis x the finite-length factor (exact for a uniform line, 1 when long)
    const dz = ez - pz, r = Math.max(Math.hypot(dy, dz), 1), xr = px - ex;
    const f = 0.5 * ((h - xr) / Math.hypot(r, h - xr) + (h + xr) / Math.hypot(r, h + xr));
    const inc = Math.max((ny * dy + nz * dz) / r, 0);
    e0 = (env.phi / (2 * h)) * 1e6 * smooth(env.cone[1], env.cone[0], dy / r) * inc * f / (env.norm * r);
    sinA = Math.abs(dz) / r;
  } else {
    const dx = ex - px, dz = ez - pz, d = Math.max(Math.hypot(dx, dy, dz), 1);
    const inc = Math.max((nx * dx + ny * dy + nz * dz) / d, 0);
    e0 = env.phi * 1e6 * smooth(env.cone[1], env.cone[0], dy / d) * inc / (env.norm * d * d);
    sinA = Math.hypot(dx, dz) / d;
  }
  e0 *= w * env.trans;
  if (wd > 0) { // through the surface, then Beer-Lambert along the refracted path
    const s = sinA / NWATER, path = wd / Math.sqrt(1 - s * s);
    for (let i = 0; i < 3; i++) out[i] += e0 * FRESNEL * env.split[i] * Math.exp(-env.k[i] * path);
  } else for (let i = 0; i < 3; i++) out[i] += e0 * env.split[i];
}

/**
 * Light arriving at p = [x, y, z] (mm, tank coordinates: z = -depth) on a surface facing n, per band, µmol/m²/s.
 * Under water in a rectangular tank, each emitter also has a mirror image across each side wall (first order, weight
 * WALL_W): light reaching the glass from inside at a steep angle is mostly reflected back in. The image counts only
 * where its ray meets the wall below the surface (gated over the top 20 mm of water).
 */
export function bandsAt(env: LightEnv, p: readonly number[], n: readonly number[] = [0, 1, 0]): Band {
  const out: Band = [0, 0, 0], [px, py, pz] = p, [nx, ny, nz] = n, W = env.walls;
  const under = py < env.ys, pv = env.ys - (env.ys - py) / NWATER; // p's apparent height, seen through the surface
  for (const [ex, ey, ez, h] of env.E) {
    addSrc(env, px, py, pz, nx, ny, nz, ex, ey, ez, h, 1, out);
    if (!W || !under || ex < 0 || ex > W.L || ez > 0 || ez < -W.D) continue;
    // [axis 0 = x / 2 = z, wall coordinate, image x, image z]
    for (const [ax, c, ix, iz] of [[0, 0, -ex, ez], [0, W.L, 2 * W.L - ex, ez], [2, 0, ex, -ez], [2, -W.D, ex, -2 * W.D - ez]]) {
      const pa = ax === 0 ? px : pz, qa = ax === 0 ? (h > 0 ? clamp(px, ix - h, ix + h) : ix) : iz;
      if (Math.abs(pa - qa) < 1e-6) continue;
      const t = (pa - c) / (pa - qa), yv = pv + t * (ey - pv), g = smooth(0, 20, (env.ys - yv) * NWATER);
      if (g > 0) addSrc(env, px, py, pz, nx, ny, nz, ix, ey, iz, h, W.w * g, out);
    }
  }
  if (env.scale !== 1) for (let i = 0; i < 3; i++) out[i] *= env.scale;
  return out;
}

/** The setup fields the model reads (a TankSetup has them all). */
export type LightScene = Ground & { tank: Tank; light: LightSettings; lid: LidType | string; water: WaterSettings };

/** The model's inputs from the settings; null when the light is flat or watts is not set. `scale` is 1 here (lightOut sets it). */
export function lightEnv(S: LightScene): LightEnv | null {
  const { tank: T, light: l, water: w } = S;
  if (l.type === 'flat' || !(l.watts && l.watts > 0)) return null;
  const tech = TECHS[techOf(l)], E = emitters(T, l, lampHeight(l, S.lid)), { cone } = beam(l), line = l.type === 'tube';
  const tint = w.on ? TINT_SHARE * waterK(w.opacity) : 0;
  return {
    E, phi: (l.watts * tech.ppe * tech.eta) / Math.max(E.length, 1), cone, norm: line ? lineNorm(cone) : pointNorm(cone),
    split: tech.split, k: KWATER.map(k => k / 1000 + tint) as Band,
    ys: w.on ? waterY(T, w.level) : -Infinity, trans: S.lid === 'glass' ? GLASS_LID : 1,
    walls: shapeOf(T) === 'rect' ? { L: T.L, D: T.D, w: WALL_W } : null, scale: 1,
  };
}

export type ParBand = 'low' | 'medium' | 'high' | 'very high';
/** Planted-tank light classes at the substrate (µmol/m²/s): low < 30, medium 30-50, high 50-80, very high > 80. */
export const parBand = (v: number): ParBand => (v < 30 ? 'low' : v < 50 ? 'medium' : v < 80 ? 'high' : 'very high');

export interface LightOut {
  /** PAR just under the water surface above the brightest substrate point (the rim, in a dry tank). */
  surface: number;
  /** PAR at the substrate: mean, min, max over a 24 x 24 grid of the footprint. */
  mean: number; min: number; max: number;
  /** Lux at the substrate (mean), and at mid-water (mean; what the render brightness follows). */
  luxMean: number; luxMid: number;
  band: ParBand;
  /** Applied PAR-override scale (1 = estimate); the shader uses it too. */
  scale: number;
  tech: LightTech;
}

/** The substrate's sample points: [x, y, z] just above the ground and its normal, over a g x g grid of the footprint. */
export function substratePoints(S: LightScene, g = 24) {
  const T = S.tank, pts: { p: [number, number, number]; n: [number, number, number] }[] = [];
  const h = (x: number, d: number) => groundHeight(S, T, x, d);
  for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) {
    const x = T.L * (i + 0.5) / g, d = T.D * (j + 0.5) / g;
    if (groundInsideBy(S, T, x, d) <= 2) continue;
    const hx = (h(x + 5, d) - h(x - 5, d)) / 10, hd = (h(x, d + 5) - h(x, d - 5)) / 10, k = Math.hypot(hx, 1, hd);
    pts.push({ p: [x, h(x, d) + 0.5, -d], n: [-hx / k, 1 / k, hd / k] });
  }
  return pts;
}

/** PAR and lux for a setup (null when watts is not set): the Lighting panel readout and the render brightness. */
export function lightOut(S: LightScene): LightOut | null {
  const env = lightEnv(S);
  if (!env) return null;
  const pts = substratePoints(S);
  if (!pts.length) return null;
  let sum = 0, lux = 0, mid = 0, min = Infinity, max = -Infinity, top = pts[0].p;
  const ys = Number.isFinite(env.ys) ? env.ys : S.tank.H;
  for (const { p, n } of pts) {
    const b = bandsAt(env, p, n), v = parOf(b);
    sum += v; lux += luxOf(b); min = Math.min(min, v);
    if (v > max) { max = v; top = p; }
    mid += luxOf(bandsAt(env, [p[0], (p[1] + Math.max(ys, p[1])) / 2, p[2]]));
  }
  const k = pts.length, mean = sum / k, scale = S.light.par && S.light.par > 0 && mean > 0 ? S.light.par / mean : 1;
  const surface = parOf(bandsAt(env, [top[0], ys - 0.01, top[2]]));
  return {
    surface: surface * scale, mean: mean * scale, min: min * scale, max: max * scale,
    luxMean: lux / k * scale, luxMid: mid / k * scale, band: parBand(mean * scale), scale, tech: techOf(S.light),
  };
}

const outCache = new Map<string, LightOut | null>();
/** lightOut, cached on the settings it reads (the viewer asks every frame, per viewport; the panel on every edit). */
export function lightOutCached(S: LightScene): LightOut | null {
  const l = S.light;
  if (l.type === 'flat' || !(l.watts && l.watts > 0)) return null;
  const key = JSON.stringify([S.tank, l, S.lid, S.water, S.substrate, S.layout.id, S.layout.seed, S.terrain]);
  if (outCache.has(key)) return outCache.get(key)!;
  const o = lightOut(S);
  outCache.set(key, o); if (outCache.size > 8) outCache.delete(outCache.keys().next().value!);
  return o;
}

/** Lux at mid-water that renders at Brightness 1: a 24 x 12 x 12 in tank under a 20 W white LED bar gives about this
 * (typical setups land at 6,000-12,000 lux mid-water, so they render at 0.9-1.25 before the Exposure knob). */
export const LREF = 8000;
/** Render brightness while watts is set: (lux / LREF)^0.5 (eyes and cameras adapt: 4x the light looks about 2x as
 * bright), clamped to 0.2-2.5, times the Exposure knob (the Brightness slider, x0.5-2). */
export const renderBright = (o: LightOut, exposure: number) => clamp(Math.sqrt(o.luxMid / LREF), 0.2, 2.5) * clamp(exposure, 0.5, 2);

const nice = (v: number) => (v >= 20 ? Math.round(v / 5) * 5 : Math.round(v));
const thou = (v: number) => { const r = v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10; return r.toLocaleString('en-US'); };
/**
 * The Lighting panel line, e.g. "PAR at substrate ≈ 35-60 µmol (medium-high) · surface ≈ 140 · ≈ 2,900 lux · estimate".
 * The range is the tech's uncertainty round the mean, or min-max across the substrate where that is wider.
 */
export function readout(o: LightOut, own = o.scale !== 1): string {
  const surf = `surface ≈ ${nice(o.surface)} · ≈ ${thou(o.luxMean)} lux`;
  if (own) return `PAR at substrate ${nice(o.mean)} µmol (yours; ${o.band}) · ${surf}`;
  const u = TECHS[o.tech].unc, lo = Math.min(o.mean * (1 - u), o.min), hi = Math.max(o.mean * (1 + u), o.max);
  const a = parBand(lo), b = parBand(hi), bands = a === b ? a : `${a}-${b}`;
  return `PAR at substrate ≈ ${nice(lo)}-${nice(hi)} µmol (${bands}) · ${surf} · estimate`;
}

