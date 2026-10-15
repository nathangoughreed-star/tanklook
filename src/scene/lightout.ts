// Real light output (lane K, 2026-10-14; design: reference/light-output-draft.md). Watts and the light technology give
// photons; the fixture's emitters and beam (moved here from render/lighting.ts, which re-exports them) put those photons
// in place, in µmol/m²/s, through the air, the water surface (loss, refraction), off the side glass (mirror images) and
// through the water (three colour bands, each with its own absorption). The one source of truth for PAR and lux: the
// Light map shader (render/lighting.ts aqIrr) is a port of `bandsAt`, and the hover readout calls it directly.
// Pure (no three.js), unit-tested in test/lightout.test.ts against published PAR-at-depth data.
import { D2R, clamp, waterK, waterY } from './physics';
import { footprint, insideBy, shapeOf, type P } from './shape';
import { groundHeight, groundInsideBy, type Ground } from './terrain';
import type { LidType, LightSettings, LightTech, LightType, Tank, WaterSettings } from './types';

// ---------- fixture geometry (was render/lighting.ts) ----------

export const AQ_MAX = 48, LAMP_Y = 50;
/** [x, y, z, halfLength]: halfLength > 0 means a line emitter along x. */
export type Emitter = [number, number, number, number];

/** Fixture height above the tank top (mm): the setting, or LAMP_Y inside a hood. */
export const lampHeight = (l: LightSettings, lid: string) => (lid === 'hood' ? LAMP_Y : l.height ?? LAMP_Y);
/** How the fixture is held: its setting, or by height for files from before the choice (hung above 110 mm). */
export const mountOf = (l: Pick<LightSettings, 'mount' | 'height'>) => l.mount ?? ((l.height ?? LAMP_Y) > 110 ? 'hang' : 'legs');

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
  if (l.type === 'tube') { const h = tubeOf(l, T).lamp / 2; for (const z of tubeLayout(T, l).zs) E.push([L / 2, y, z, h]); }
  if (l.type === 'led') {
    const cols = clamp(Math.round(L * 0.9 / 45), 2, 24);
    const zc = barZ(T, l, ledBarDepth(T));
    for (const r of [-0.12, 0.12]) for (let c = 0; c < cols; c++) E.push([L * (0.05 + 0.9 * (c + 0.5) / cols), y, zc - D * r, 0]);
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
  /** Fixtures it comes in (FIXTURES). */
  on: Fixture[];
  /** Its usual colour temperatures, K: [low, high, default]. The slider shows the band and goes past it (with a note). */
  k: [number, number, number];
  /** Photon efficacy (µmol/J) and the fixture's own losses (lens, reflector, ballast, ageing): photons out = W x ppe x eta. */
  ppe: number; eta: number;
  /** Share of its photons in each band (sums to 1). */
  split: Band;
  /** How far the estimate can be off (fraction), from the calibration: LED about ±30%, the rest ±50%. */
  unc: number;
}
// Calibration (reference/par-calibration-data.md, test/lightout.test.ts): reef LED PPE 1.75 fits the AI Hydra 32 HD
// (in air, -9..+6%), white LED 1.6 x 0.9 the JBL Solar Natur (in water, -26..+14%). T5 HO with reflectors fits the
// Barr Report readings at eta 0.65 once the side glass is modelled (the first hand check, which left the glass out,
// suggested 0.4-0.5); bare T5 and T8 scaled with it. LED band splits are set from the lux factors (white ~67, planted
// ~48, reef ~26 lux per µmol), not measured.
// Lane K2 (2026-10-14): metal halide from Joshi's lab tests (reefs.com, grade A). Bare lamps at 18 in give 0.34-0.49
// PPFD per wall watt for 10K bulbs, 0.23-0.35 for 13-14K, 0.17-0.24 for 20K; as photons (between a sin θ and an
// isotropic lamp) ppe ~0.83 for 10-14K and ~0.47 for 20K. Four pendant reflectors with one 400 W 14K lamp fit the cos^m
// beam within ±10% at 50-100°, with ppe x eta 0.50-0.86: eta 0.77 (one value for all). 20K band split: an ESTIMATE
// (bluer, no spectrum data read). CFL ppe 0.8 = typical CFL efficacy over the fluorescent lux factor, close to Nelson &
// Bugbee's T8 fixture (0.84, grade A); its eta 0.5 is an ESTIMATE (no PAR data for power compacts found). Halogen: split
// from a 3000 K blackbody (gives 47 lux per µmol, AGi32 incandescent 49); ppe 0.3 and eta 0.6 are ESTIMATES (blackbody
// 0.3-0.4 bare, one MR11 spec 0.1; no PAR-at-distance data found). T8: scaled from T5, no dataset.
// Added 2026-10-15 (Nathan: only real fixture / lamp pairings), all ESTIMATES: LED screw-in bulb (omni, ~90 lm/W, much
// of it sideways: eta 0.6, warmer split); LED T8 tube (directional, eta 0.8, white LED split); T12 (older, below T8).
// Colour ranges (k) are what each is usually sold as, not limits.
export const TECHS: Record<LightTech, Tech> = {
  'led-white': { label: 'LED, white', on: ['puck', 'led'], k: [5000, 10000, 6500], ppe: 1.6, eta: 0.9, split: [0.22, 0.53, 0.25], unc: 0.3 },
  'led-planted': { label: 'LED, planted RGB', on: ['puck', 'led'], k: [6000, 8000, 7000], ppe: 1.8, eta: 0.9, split: [0.33, 0.33, 0.34], unc: 0.3 },
  'led-reef': { label: 'LED, reef (blue)', on: ['puck', 'led'], k: [10000, 20000, 14000], ppe: 1.75, eta: 0.9, split: [0.78, 0.13, 0.09], unc: 0.3 },
  't5-refl': { label: 'T5 HO, own reflectors', on: ['tube'], k: [5000, 20000, 6500], ppe: 1.2, eta: 0.65, split: [0.2, 0.6, 0.2], unc: 0.5 },
  't5-bare': { label: 'T5 HO, bare', on: ['tube'], k: [5000, 20000, 6500], ppe: 1.2, eta: 0.4, split: [0.2, 0.6, 0.2], unc: 0.5 },
  't8': { label: 'T8', on: ['tube'], k: [3000, 10000, 6500], ppe: 0.85, eta: 0.45, split: [0.2, 0.6, 0.2], unc: 0.5 },
  't12': { label: 'T12 (older)', on: ['tube'], k: [3000, 10000, 6500], ppe: 0.7, eta: 0.45, split: [0.2, 0.6, 0.2], unc: 0.5 },
  'led-tube': { label: 'LED tube (T8 size)', on: ['tube'], k: [4000, 6500, 6500], ppe: 1.5, eta: 0.8, split: [0.22, 0.53, 0.25], unc: 0.4 },
  'cfl': { label: 'CFL / power compact', on: ['bulb', 'tube'], k: [2700, 10000, 6500], ppe: 0.8, eta: 0.5, split: [0.2, 0.59, 0.21], unc: 0.5 },
  'led-bulb': { label: 'LED bulb', on: ['bulb'], k: [2700, 6500, 5000], ppe: 1.3, eta: 0.6, split: [0.18, 0.52, 0.3], unc: 0.4 },
  'halogen': { label: 'Incandescent / halogen', on: ['bulb'], k: [2700, 3200, 2900], ppe: 0.3, eta: 0.6, split: [0.1, 0.3, 0.6], unc: 0.5 },
  'mh': { label: 'Metal halide, 10-14K', on: ['pendant'], k: [10000, 14000, 10000], ppe: 0.83, eta: 0.77, split: [0.24, 0.57, 0.19], unc: 0.5 },
  'mh-20k': { label: 'Metal halide, 20K', on: ['pendant'], k: [18000, 20000, 20000], ppe: 0.47, eta: 0.77, split: [0.45, 0.42, 0.13], unc: 0.5 },
};
export const TECH_IDS = Object.keys(TECHS) as LightTech[];

/**
 * The Fixture menu (Nathan 2026-10-15): the style, which sets the geometry (`type`) and which lamps it really comes in.
 * The three spot styles share `type: 'spot'` and are told apart by the lamp: a metal halide is a pendant, a screw-in
 * lamp a bulb, anything else (LED) a puck. Pendants never go in a hood (too hot).
 */
export type Fixture = 'flat' | 'puck' | 'bulb' | 'pendant' | 'tube' | 'led';
export const FIXTURES: Record<Fixture, { label: string; type: LightType }> = {
  flat: { label: 'None (flat, even light)', type: 'flat' },
  puck: { label: 'LED pucks / spots', type: 'spot' },
  bulb: { label: 'Screw-in bulbs', type: 'spot' },
  pendant: { label: 'Metal halide pendants', type: 'spot' },
  tube: { label: 'Tubes (fluorescent / LED)', type: 'tube' },
  led: { label: 'LED bar (full length)', type: 'led' },
};
export const techsFor = (f: Fixture) => TECH_IDS.filter(t => TECHS[t].on.includes(f));
export function fixtureOf(l: Pick<LightSettings, 'type' | 'tech'>): Fixture {
  if (l.type !== 'spot') return l.type;
  const on = l.tech ? TECHS[l.tech].on : [];
  return on.includes('pendant') ? 'pendant' : on.includes('bulb') ? 'bulb' : 'puck';
}
/** The fixture's lamp: its setting if that fits the fixture, else the fixture's first. */
export function techOf(l: Pick<LightSettings, 'type' | 'tech'>): LightTech {
  const f = fixtureOf(l);
  return l.tech && TECHS[l.tech].on.includes(f) ? l.tech : techsFor(f)[0] ?? 'led-white';
}

/**
 * Tubes come in set lengths, each at a set power (Nathan 2026-10-15: power follows the tubes). [nominal in, W per tube,
 * the tube's true length end to end in mm (pins off)]. The longest whose fixture (tube + sockets and end plates,
 * TUBE_ENDS) fits within the tank's width is used, the shortest if none does (Nathan 2026-10-15: "the largest tube
 * that will fit within the width of the tank ... that's how wide the housing should be too"). Lamp = the glowing
 * length (the metal end caps off). PC (straight power compact) and LED tube watts are ESTIMATES from common aquarium lamps.
 */
const TUBES: Partial<Record<LightTech, [number, number, number][]>> = {
  't5-refl': [[24, 24, 549], [36, 39, 849], [48, 54, 1149], [60, 80, 1449]], 't5-bare': [[24, 24, 549], [36, 39, 849], [48, 54, 1149], [60, 80, 1449]],
  't8': [[18, 15, 451], [24, 17, 604], [36, 25, 909], [48, 32, 1213]], 't12': [[18, 15, 451], [24, 20, 604], [36, 30, 909], [48, 40, 1213]],
  'cfl': [[12, 32, 310], [16, 36, 411], [21, 55, 533], [34, 96, 868]], 'led-tube': [[24, 9, 590], [36, 14, 895], [48, 18, 1198]],
};
/** What a tube fixture adds to the tube's length: a socket and an end plate at each end (mm). */
export const TUBE_ENDS = 36;
export function tubeOf(l: Pick<LightSettings, 'type' | 'tech'>, T: Pick<Tank, 'L'>) {
  const sizes = TUBES[techOf(l)] ?? [[24, 24, 549]], fit = sizes.filter(([, , mm]) => mm + TUBE_ENDS <= T.L);
  const [inch, w, len] = fit.length ? fit[fit.length - 1] : sizes[0];
  return { inch, w, len, lamp: len - 28, housing: len + TUBE_ENDS };
}
/** Tube diameter (mm) by lamp: T5 16, T8 and the LED T8 26, T12 38; a straight power compact is twin 17 mm legs. */
const TUBE_DIA: Partial<Record<LightTech, number>> = { 't5-refl': 16, 't5-bare': 16, 't8': 26, 't12': 38, 'led-tube': 26, 'cfl': 17 };
/** Tube spacing slider's top (mm, centre to centre). */
export const TUBE_SP_MAX = 300;
/**
 * Where a tube fixture's tubes sit front to back and how deep its housing is (Nathan 2026-10-15). Auto spacing (0)
 * spreads the tubes over the tank's depth in a housing 90% of it; a set spacing is centre to centre (never closer
 * than the tubes allow), centred over the tank, and the housing follows: the tubes' spread plus a margin each side
 * of half a spacing (at least clear of the reflector), so more or wider-spaced tubes make a deeper hood.
 * `wide` = one lamp's width (a power compact's two legs side by side).
 */
export function tubeLayout(T: Pick<Tank, 'D'>, l: Pick<LightSettings, 'type' | 'tech' | 'count' | 'spacing' | 'pos'>) {
  const n = Math.max(1, l.count), tech = techOf(l), dia = TUBE_DIA[tech] ?? 26, twin = tech === 'cfl', wide = twin ? dia * 2 + 3 : dia;
  const set = (l.spacing ?? 0) > 0, s = set ? clamp(l.spacing, wide + 8, TUBE_SP_MAX) : T.D / n;
  const depth = set ? (n - 1) * s + 2 * Math.max(s / 2, wide / 2 + 22) : T.D * 0.9, zc = barZ(T, l, depth);
  const zs = Array.from({ length: n }, (_, i) => zc - (i - (n - 1) / 2) * s);
  return { zs, s, set, dia, twin, wide, depth, zc };
}
/**
 * A bar fixture's (tubes, LED bar) front-to-back place (Nathan 2026-10-15: "allow the fixture to be moved front to back
 * along the top of the tank"): `pos` mm from the middle, + toward the back, held so the housing stays over the tank
 * (posMax). Returns the housing's centre z (z = -depth from the front).
 */
export const posMax = (T: Pick<Tank, 'D'>, depth: number) => Math.max(0, (T.D - depth) / 2);
export const barZ = (T: Pick<Tank, 'D'>, l: Pick<LightSettings, 'pos'>, depth: number) => { const m = posMax(T, depth); return -T.D / 2 - clamp(l.pos ?? 0, -m, m); };
/** The LED bar's depth front to back (mm). */
export const ledBarDepth = (T: Pick<Tank, 'D'>) => T.D * 0.45;
const posCache = new Map<string, number>();
/**
 * The front-to-back place that lights the floor most evenly (Nathan 2026-10-15: like the bulbs' "fit" pattern, for a
 * bar): the rule fitSpots uses, here along one axis since a bar's rows run the tank's length: the `pos` that makes the
 * mean squared distance from the floor (every point of the footprint, so a bow front's extra floor counts) to the
 * nearest row of lights smallest. A rectangle or a round tank gives the middle; a bow front (shallow at its ends)
 * moves it back, a pie forward. Rounded to 5 mm (the
 * slider's step). Null for fixtures that are not bars.
 */
export function bestPos(T: Tank, l: LightSettings): number | null {
  const tl = l.type === 'tube' ? tubeLayout(T, { ...l, pos: 0 }) : null, dep = tl ? tl.depth : l.type === 'led' ? ledBarDepth(T) : 0;
  if (!dep) return null;
  const offs = tl ? tl.zs.map(z => -z - T.D / 2) : [-0.12 * T.D, 0.12 * T.D]; // rows' depth from the bar's centre
  const key = `${shapeOf(T)}|${T.L}|${T.D}|${T.sides}|${T.bowMin}|${T.bowlFloor}|${T.pieDeg}|${dep}|${offs.join(',')}`;
  const hit = posCache.get(key);
  if (hit != null) return hit;
  const g = 64, ds: number[] = [];
  for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) { const x = T.L * (i + 0.5) / g, d = T.D * (j + 0.5) / g; if (insideBy(T, x, d) > 0) ds.push(d); }
  const m = Math.floor(posMax(T, dep) / 5) * 5, cost = (p: number) => ds.reduce((a, d) => a + Math.min(...offs.map(o => (d - T.D / 2 - p - o) ** 2)), 0);
  let best = 0, bc = Infinity;
  for (let p = -m; p <= m; p += 5) { const c = cost(p); if (c < bc - 1e-6 || (Math.abs(c - bc) <= 1e-6 && Math.abs(p) < Math.abs(best))) { bc = c; best = p; } }
  posCache.set(key, best); if (posCache.size > 32) posCache.delete(posCache.keys().next().value!);
  return best;
}

/** Metal halide bulb sizes (W each). */
export const MH_BULBS = [70, 150, 250, 400] as const;
/**
 * The light's power draw (W), what the model is fed: tubes and pendants by their lamps (W per tube x tubes; W per bulb
 * x bulbs), the rest the Total Power setting; not set (0 or absent), the fixture's typical power for the tank
 * (powerRange's default; Nathan 2026-10-15: no more "set Power first" before PAR and the dark zones show). 0 = no light.
 */
export function wattsOf(S: { tank: Tank; light: LightSettings }): number {
  const l = S.light, f = fixtureOf(l);
  if (f === 'flat') return 0;
  if (f === 'tube') return tubeOf(l, S.tank).w * l.count;
  if (f === 'pendant') return (l.bulbW ?? 150) * emitters(S.tank, l).length;
  return l.watts && l.watts > 0 ? l.watts : powerRange(l, S.tank)?.[2] ?? 0;
}

/**
 * What each fixture style is usually like (Nathan 2026-10-15), [low, high, default]: hanging height above the tank (mm;
 * a hood fixes it), beam angle (°; spots only), power per bulb or puck (W; per inch of tank for an LED bar), and the
 * most bulbs. A fixture change sets the defaults; older files are clamped into the ranges on load. Pendants hang well
 * clear of the water (heat, spread); pucks have lenses; a screw-in bulb is a wide bare lamp or a narrow halogen spot.
 */
type Range = readonly [number, number, number];
export const FIX_SPEC: Partial<Record<Fixture, { h: Range; cone?: Range; perW?: Range; maxCount?: number; maxRows?: number }>> = {
  puck: { h: [20, 600, 150], cone: [30, 120, 90], perW: [10, 200, 40] },
  bulb: { h: [10, 400, 50], cone: [10, 120, 90], perW: [5, 100, 15] },
  pendant: { h: [150, 600, 250], cone: [60, 120, 90], maxCount: 4, maxRows: 2 },
  tube: { h: [0, 300, 20] },
  led: { h: [0, 600, 50], perW: [0.3, 3, 1] },
};
/** A screw-in bulb's usual power by lamp (W): a 50 W halogen, a 15 W CFL, a 10 W LED bulb. */
const BULB_W: Partial<Record<LightTech, number>> = { halogen: 50, cfl: 15, 'led-bulb': 10 };
/** The Total Power slider's range for a fixture that takes it, [0, high, default] (W); null = set by the lamps or no light. */
export function powerRange(l: LightSettings, T: Tank): Range | null {
  const f = fixtureOf(l), p = FIX_SPEC[f]?.perW;
  if (!p) return null;
  const units = f === 'led' ? T.L / 25.4 : emitters(T, l).length, def = f === 'bulb' ? BULB_W[techOf(l)] ?? p[2] : p[2];
  return [0, Math.max(10, Math.ceil(units * p[1] / 10) * 10), Math.round(units * def)];
}
/**
 * Keep the light within its fixture's ranges. `fresh` (the fixture or lamp was just changed): its usual height, beam and
 * power too; otherwise only clamped (old files, a hood). The count and rows are capped for pendants.
 */
export function fitFixture(l: LightSettings, T: Tank, fresh: boolean) {
  const sp = FIX_SPEC[fixtureOf(l)];
  if (!sp) return;
  const fit = (v: number, r: Range) => clamp(v, r[0], r[1]);
  l.height = fresh ? sp.h[2] : fit(l.height, sp.h);
  if (sp.cone) l.cone = fresh ? sp.cone[2] : fit(l.cone, sp.cone);
  if (sp.maxCount) l.count = Math.min(l.count, sp.maxCount);
  if (sp.maxRows) l.rows = Math.min(l.rows, sp.maxRows);
  const pw = powerRange(l, T);
  if (fresh && pw) delete l.watts; // back to the typical power (it follows the tank until set)
}
/** Lux per µmol/m²/s of a tech's light in air. */
export const luxPer = (t: LightTech) => TECHS[t].split.reduce((a, s, i) => a + s * LUXW[i], 0);
export const parOf = (b: Band) => b[0] + b[1] + b[2];
export const luxOf = (b: Band) => b[0] * LUXW[0] + b[1] * LUXW[1] + b[2] * LUXW[2];

// ---------- the model ----------

const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/**
 * The beam as a power of the cosine off straight down, cos^m (an LED with a lens, a reflector), its exponent set so the
 * printed beam angle is where it falls to half (the usual way a beam angle is quoted): light tails off past the beam
 * angle instead of stopping (Nathan 2026-10-14: corners went black under a hard cut-off). A bare LED is m = 1 (Lambertian,
 * half at 60°: an LED bar); a tube's cross-section the same, half at 60° either side (reflector or the lamp's own spread).
 */
export const beamExp = (l: { type: LightType; cone?: number }) =>
  l.type === 'spot' ? Math.log(0.5) / Math.log(Math.cos(clamp(l.cone ?? 52, 5, 170) / 2 * D2R)) : 1;
/** ∫ cos^m over the lower hemisphere (sr): what turns a point emitter's µmol/s into µmol/s/sr. */
export const pointNorm = (m: number) => 2 * Math.PI / (m + 1);
/** ∫ cos^m round the tube's axis over the lower half (rad), the 2D equivalent for a line emitter. */
export function lineNorm(m: number) {
  let s = 0; const n = 720;
  for (let i = 0; i < n; i++) s += Math.cos(-Math.PI / 2 + Math.PI * (i + 0.5) / n) ** m;
  return s * Math.PI / n;
}
/** Diffuse reflectance (PAR) of each substrate, for the light it bounces back into the tank; bare glass bottom 0.1. */
export const SUB_ALBEDO: Record<string, number> = {
  gravel: 0.2, pea: 0.3, clown: 0.15, blue: 0.08, onyx: 0.05, black: 0.06, white: 0.55, aragonite: 0.6, coral: 0.55,
};
const hexLum = (h: string) => { const c = [1, 3, 5].map(i => (parseInt(h.slice(i, i + 2), 16) / 255) ** 2.2); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export function subAlbedo(sub: { show: boolean; type: string; custom?: { color: string } }) {
  if (!sub.show) return 0.1;
  if (sub.type === 'custom') return clamp(hexLum(sub.custom?.color ?? '#808080') * 1.1, 0.04, 0.7);
  return SUB_ALBEDO[sub.type] ?? 0.2;
}
/** Diffuse light kept in by the water surface and the glass (about 1 - 1/n² of it is totally reflected back in). */
export const KEEP_SURFACE = 0.45, KEEP_GLASS = 0.43;

/** Everything `bandsAt` needs, from the settings once (lightEnv) or built by hand (the calibration tests). */
export interface LightEnv {
  E: Emitter[];
  /** µmol/s per emitter (a line emitter: over its whole length). */
  phi: number;
  /** Beam exponent (cos^m, beamExp) and its pointNorm / lineNorm (by the emitters' kind). */
  m: number;
  norm: number;
  /** Bounced light (µmol/m²/s per band, losses included): light reflected by the substrate, kept in by the surface and
   * glass, spread evenly; added under water (everywhere in a dry tank). */
  ind: Band;
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
    e0 = (env.phi / (2 * h)) * 1e6 * (dy / r) ** env.m * inc * f / (env.norm * r);
    sinA = Math.abs(dz) / r;
  } else {
    const dx = ex - px, dz = ez - pz, d = Math.max(Math.hypot(dx, dy, dz), 1);
    const inc = Math.max((nx * dx + ny * dy + nz * dz) / d, 0);
    e0 = env.phi * 1e6 * (dy / d) ** env.m * inc / (env.norm * d * d);
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
  if (under || !Number.isFinite(env.ys)) for (let i = 0; i < 3; i++) out[i] += env.ind[i];
  if (env.scale !== 1) for (let i = 0; i < 3; i++) out[i] *= env.scale;
  return out;
}

/** The setup fields the model reads (a TankSetup has them all). */
export type LightScene = Ground & { tank: Tank; light: LightSettings; lid: LidType | string; water: WaterSettings };

/** The model's inputs from the settings; null when the light is flat or watts is not set (callers pass wattsOf's). `scale` is 1 here (lightOut sets it). */
export function lightEnv(S: LightScene): LightEnv | null {
  const { tank: T, light: l, water: w } = S;
  if (l.type === 'flat' || !(l.watts && l.watts > 0)) return null;
  const tech = TECHS[techOf(l)], E = emitters(T, l, lampHeight(l, S.lid)), m = beamExp(l), line = l.type === 'tube';
  const tint = w.on ? TINT_SHARE * waterK(w.opacity) : 0;
  const env: LightEnv = {
    E, phi: (l.watts * tech.ppe * tech.eta) / Math.max(E.length, 1), m, norm: line ? lineNorm(m) : pointNorm(m), ind: [0, 0, 0],
    split: tech.split, k: KWATER.map(k => k / 1000 + tint) as Band,
    ys: w.on ? waterY(T, w.level) : -Infinity, trans: S.lid === 'glass' ? GLASS_LID : 1,
    walls: shapeOf(T) === 'rect' ? { L: T.L, D: T.D, w: WALL_W } : null, scale: 1,
  };
  env.ind = bounce(S, env);
  return env;
}

/**
 * The bounced light, as in an integrating cavity: the light reaching the floor (sampled just above it, direct + glass
 * images), times the substrate's reflectance, spread over every inside surface and multiplied up by how much of the
 * diffuse light the surface, the glass and the floor send back in: E = rho_s x flux / (area x (1 - mean reflectance)).
 */
function bounce(S: LightScene, env: LightEnv): Band {
  const T = S.tank, { area, perimeter: perim } = footprint(T), g = 10, fl: Band = [0, 0, 0];
  let k = 0, y = 0;
  for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) {
    const x = T.L * (i + 0.5) / g, d = T.D * (j + 0.5) / g;
    if (insideBy(T, x, d) <= 0) continue;
    const h = groundHeight(S, T, x, d), b = bandsAt(env, [x, h + 0.5, -d]); k++; y += h;
    for (let c = 0; c < 3; c++) fl[c] += b[c];
  }
  if (!k) return [0, 0, 0];
  const wet = Number.isFinite(env.ys), top = wet ? env.ys : T.H, depth = Math.max(top - y / k, 1), rho = subAlbedo(S.substrate);
  const A = 2 * area + perim * depth, keep = (area * rho + (wet ? area * KEEP_SURFACE : 0) + perim * depth * KEEP_GLASS) / A;
  return fl.map(v => (v / k) * area * rho / (A * (1 - keep))) as Band;
}

export type ParBand = 'low' | 'medium' | 'high' | 'very high';
/** Planted-tank light classes at the substrate (µmol/m²/s): low < 30, medium 30-50, high 50-80, very high > 80. */
export const parBand = (v: number): ParBand => (v < 30 ? 'low' : v < 50 ? 'medium' : v < 80 ? 'high' : 'very high');

export interface LightOut {
  /** PAR just under the water surface at its brightest (the rim's height, in a dry tank). */
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
  let sum = 0, lux = 0, mid = 0, min = Infinity, max = -Infinity, surface = 0;
  const ys = Number.isFinite(env.ys) ? env.ys : S.tank.H;
  for (const { p, n } of pts) {
    const b = bandsAt(env, p, n), v = parOf(b);
    sum += v; lux += luxOf(b); min = Math.min(min, v);
    max = Math.max(max, v);
    surface = Math.max(surface, parOf(bandsAt(env, [p[0], ys - 0.01, p[2]])));
    mid += luxOf(bandsAt(env, [p[0], (p[1] + Math.max(ys, p[1])) / 2, p[2]]));
  }
  const k = pts.length, mean = sum / k, scale = S.light.par && S.light.par > 0 && mean > 0 ? S.light.par / mean : 1;
  return {
    surface: surface * scale, mean: mean * scale, min: min * scale, max: max * scale,
    luxMean: lux / k * scale, luxMid: mid / k * scale, band: parBand(mean * scale), scale, tech: techOf(S.light),
  };
}

// Everything the model gives is proportional to the watts (photons, so the direct light, the bounce and every reading),
// so the caches hold one run at 1 W with no PAR override and scale it (lane J2: a Power step re-ran the model, ~100 ms).
// The key leaves out the light fields the model does not read (Exposure, colour, room light, map unit), and the water
// and substrate fields it does not read (water colour; the substrate's look but for its albedo), so a water colour or
// substrate colour step under a powered light does not re-run it (~45 ms; lane EF2).
const unitKey = (S: LightScene) => {
  const { watts: _w, par: _p, bright: _b, kelvin: _k, room: _r, mapUnit: _m, mapStep: _ms, mapStepLux: _ml, bulbW: _bw, mapSlice: _sl, mapShells: _sh, mapDark: _dk, ...l } = S.light;
  const w = S.water, b = S.substrate;
  return JSON.stringify([S.tank, l, S.lid, [w.on, w.level, w.opacity], [b.show, b.fl, b.fr, b.bl, b.br, subAlbedo(b)], S.layout.id, S.layout.seed, S.terrain]);
};
const unitS = (S: LightScene): LightScene => ({ ...S, light: { ...S.light, watts: 1, par: undefined } });
function cached<T>(cache: Map<string, T>, key: string, make: () => T): T {
  if (!cache.has(key)) { cache.set(key, make()); if (cache.size > 8) cache.delete(cache.keys().next().value!); }
  return cache.get(key)!;
}
const outCache = new Map<string, LightOut | null>(), envCache = new Map<string, LightEnv | null>();
/** lightOut, cached on the settings it reads (the viewer asks every frame, per viewport; the panel on every edit). */
export function lightOutCached(S: LightScene): LightOut | null {
  const l = S.light;
  if (!(wattsOf(S) > 0)) return null;
  const u = cached(outCache, unitKey(S), () => lightOut(unitS(S)));
  if (!u) return null;
  const w = wattsOf(S), scale = l.par && l.par > 0 && u.mean > 0 ? l.par / (u.mean * w) : 1, f = w * scale;
  return {
    surface: u.surface * f, mean: u.mean * f, min: u.min * f, max: u.max * f, luxMean: u.luxMean * f, luxMid: u.luxMid * f,
    band: parBand(u.mean * f), scale, tech: u.tech,
  };
}

/** lightEnv with the PAR-override scale applied (as the shader gets it), cached like lightOutCached: for the hover readout. */
export function lightEnvCached(S: LightScene): LightEnv | null {
  const o = lightOutCached(S);
  if (!o) return null;
  const e = cached(envCache, unitKey(S), () => lightEnv(unitS(S)));
  if (!e) return null;
  const w = wattsOf(S);
  return { ...e, phi: e.phi * w, ind: e.ind.map(v => v * w) as Band, scale: o.scale };
}

/** Lux at mid-water that renders at Brightness 1: a 24 x 12 x 12 in tank under a 20 W white LED bar gives about this
 * (typical setups land at 6,000-12,000 lux mid-water, so they render at 0.9-1.25 before EXPOSE and the Exposure knob). */
export const LREF = 8000;
/** Exposure gain on every light (Nathan 2026-10-15: the default looked dim; 1.8x what x1 used to give). */
export const EXPOSE = 1.8;
/** The Exposure knob's range (x1/4 to x16; the slider runs in stops, -2 to +4): past x4 the tank washes out, on purpose. */
export const EXP_MIN = 0.25, EXP_MAX = 16;
/** Render brightness while watts is set: (lux / LREF)^0.5 (eyes and cameras adapt: 4x the light looks about 2x as
 * bright), clamped to 0.1-5 (a sunlit pond reaches 5), times EXPOSE and the Exposure knob (the Brightness slider). */
export const renderBright = (o: LightOut, exposure: number) => EXPOSE * clamp(Math.sqrt(o.luxMid / LREF), 0.1, 5) * clamp(exposure, EXP_MIN, EXP_MAX);

const nice = (v: number) => (v >= 20 ? Math.round(v / 5) * 5 : Math.round(v));
const thou = (v: number) => { const r = v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10; return r.toLocaleString('en-US'); };
/**
 * The Lighting panel line, e.g. "PAR at substrate ≈ 35-60 µmol (medium-high) · surface ≈ 140 · ≈ 2,900 lux · estimate".
 * The range is the tech's uncertainty round the mean, or min-max across the substrate where that is wider.
 */
export function readout(o: LightOut, own = o.scale !== 1): string {
  const surf = `surface ≈ ${o.surface >= 1000 ? thou(o.surface) : nice(o.surface)} · ≈ ${thou(o.luxMean)} lux`;
  if (own) return `PAR at substrate ${nice(o.mean)} µmol (yours; ${o.band}) · ${surf}`;
  const u = TECHS[o.tech].unc, lo = Math.min(o.mean * (1 - u), o.min), hi = Math.max(o.mean * (1 + u), o.max);
  const a = parBand(lo), b = parBand(hi), bands = a === b ? a : `${a}-${b}`;
  return `PAR at substrate ≈ ${nice(lo)}-${nice(hi)} µmol (${bands}) · ${surf} · estimate`;
}

