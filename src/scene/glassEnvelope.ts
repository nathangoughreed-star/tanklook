// GS2 (2026-11-15; Nathan: "three variables in the glass solver that are inter-related"): the glass, the tank geometry (with its bracing) and the
// minimum safety factor, any two given, the third solved. Pure; built on GS1's plate solver (scene/glassSolver.ts), same method, same limits.
//
//   given glass + SF + footprint   -> largest height (maxHeight) or, for a height, the longest tank (maxLength)
//   given geometry + SF            -> thinnest stock glass (minGlass)          [what Glass check already did]
//   given glass + geometry         -> the safety factor achieved (evaluate)
//
// Why plain bisection is honest: with everything else fixed, the stress in a wall rises with height H and with length L, and falls with thickness
// t (sigma ~ gamma H^3 / t^2 times a factor that grows with L/H), so "passes" is true up to a boundary and false beyond it. A stiffer top (brace,
// cross braces, a rim) only removes load from the wall: it never lowers the wall's safety factor, but the strip itself can fail, so bracing is
// checked as its own member (BraceResult.sf) and a brace level is reported as it is, never silently swapped for a better one. Depth D is NOT
// monotone for the tank as a whole (deeper loads the ends and the bottom more, the front barely notices), so D is an input, not a solved variable.
//
// Fully filled: water depth = height (Nathan 2026-11-15: conservative). Glass is one thickness for every wall and the bottom unless glassEnds /
// glassBottom say otherwise (mixed glass, Nathan 2026-11-24); brace strips have their own thickness, a MINIMUM: a thicker strip is stiffer and
// widens its bond. Bracing is a level with the person's strips, 'custom' (their own brace, b.brace), or with autoStrips the strongest strips
// that fit (as wide as leaves 6 in clear, up to 4 in, in the thickest wall glass): what "Optimized" bracing means when solving for size.
import { DEFAULT_SF, GAMMA_FRESH, IN_MM, solveGlass, type BraceSpec, type GlassSolution, type PaneId } from './glassSolver';

export type BraceLevel = 'rimmed' | 'none' | 'perimeter' | 'cross1' | 'cross2' | 'custom';
export const BRACE_LEVELS: { id: BraceLevel; label: string }[] = [
  { id: 'none', label: 'No brace' }, { id: 'perimeter', label: 'Perimeter' }, { id: 'cross1', label: 'Perimeter + 1 cross' },
  { id: 'cross2', label: 'Perimeter + 2 cross' }, { id: 'rimmed', label: 'Rimmed (trim)' }, { id: 'custom', label: 'Your brace' },
];

export interface EnvelopeBase {
  /** Front and back glass thickness (mm); also the ends and the bottom unless given below. */
  glass: number;
  /** Mixed glass: the end walls' and the bottom's own thickness (mm). */
  glassEnds?: number; glassBottom?: number;
  /** The person's own brace, used by level 'custom' (null = no brace). */
  brace?: BraceSpec | null;
  /** Levels perimeter / cross1 / cross2 get the strongest strips that fit, not strip / stripWidth. */
  autoStrips?: boolean;
  /** Minimum brace strip thickness (mm) and width (mm). */
  strip: number; stripWidth: number;
  /** Minimum safety factor. */
  sf: number;
  /** Front-to-back depth (mm), interior. */
  D: number;
  gamma?: number;
  bottom?: 'full' | 'perimeter';
  /** Smallest clear opening each way inside the strips (mm), default 6 in, the same as the optimizer. */
  minOpening?: number;
}

/** The three thicknesses (mm): front / back, ends, bottom. */
export const wallsOf = (b: Pick<EnvelopeBase, 'glass' | 'glassEnds' | 'glassBottom'>) => ({ long: b.glass, end: b.glassEnds ?? b.glass, bottom: b.glassBottom ?? b.glass });

/** Widest strip (mm, 1/4 in steps, 2-4 in) that leaves `minOpen` clear front to back and between n cross strips; < 2 in when nothing fits. */
export function widestStrip(L: number, D: number, cross: number, minOpen = 6 * IN_MM): number {
  const w = Math.min(4 * IN_MM, (D - minOpen) / 2, cross ? (L - minOpen * (cross + 1)) / (cross + 2) : Infinity);
  const q = IN_MM / 4;
  return Math.max(0, Math.floor(w / q + 1e-9) * q);
}

export function braceFor(level: BraceLevel, b: Pick<EnvelopeBase, 'strip' | 'stripWidth'> & Partial<EnvelopeBase>, L?: number): BraceSpec | null {
  if (level === 'none' || level === 'rimmed') return null;
  if (level === 'custom') return b.brace ?? null;
  const cross = level === 'cross1' ? 1 : level === 'cross2' ? 2 : 0;
  if (b.autoStrips && L != null && b.D != null && b.glass != null) {
    const w = widestStrip(L, b.D, cross, b.minOpening), walls = wallsOf(b as EnvelopeBase);
    return { width: Math.max(w, 2 * IN_MM), thickness: Math.max(walls.long, walls.end), cross };
  }
  return { width: b.stripWidth, thickness: b.strip, cross };
}

/** Does the brace leave room: the optimizer's rule (clear depth; clear length between cross strips). */
export function braceFits(L: number, D: number, br: BraceSpec | null, minOpen = 6 * IN_MM): boolean {
  if (!br) return true;
  const n = br.cross ?? 0, cw = br.crossWidth ?? br.width;
  return D - 2 * br.width >= minOpen && (!n || (L - 2 * br.width - n * cw) / (n + 1) >= minOpen);
}

export type Governs = 'front' | 'ends' | 'bottom' | 'brace' | 'deflection';
export interface TankCheck {
  /** every pane, the brace and the deflection limit meet the safety factor (silicone joints are reported apart) */
  ok: boolean;
  /** lowest safety factor over the walls, the brace and (bottom not on a stand) the bottom */
  minSf: number;
  /** safety factor of each member */
  sf: { front: number; ends: number; bottom: number | null; brace: number | null };
  governs: Governs;
  /** deflection / thickness of the worst wall (limit 1) */
  deflRatio: number;
  fits: boolean;
  jointsOk: boolean; badJoints: string[];
  solution: GlassSolution;
}

/**
 * Check one tank at one thickness, all five panes. One solveGlass call with the criteria relaxed so every pane is evaluated at exactly `glass`
 * (a pane that would fail still reports its real stress); the safety factor and deflection limits are then applied here.
 */
export function checkTank(L: number, H: number, level: BraceLevel, b: EnvelopeBase): TankCheck {
  const br = braceFor(level, b, L), fits = braceFits(L, b.D, br, b.minOpening), w = wallsOf(b);
  const sol = solveGlass({ L, D: b.D, H, waterDepth: H }, {
    safetyFactor: 0.01, deflection: { thicknessRatio: 1e6 }, fixed: w, continuous: false,
    topEdge: level === 'rimmed' ? 'held' : 'free', brace: br, bottomSupport: b.bottom ?? 'full', gamma: b.gamma ?? GAMMA_FRESH,
  });
  const p = (id: PaneId) => sol.panes[id];
  const front = p('front').sf, ends = p('left').sf, bottom = p('bottom').governs === 'rule' ? null : p('bottom').sf, brace = sol.brace ? sol.brace.sf : null;
  const defl = Math.max(p('front').deflection / w.long, p('left').deflection / w.end);
  const cand: [Governs, number][] = [['front', front], ['ends', ends], ['bottom', bottom ?? Infinity], ['brace', brace ?? Infinity]];
  cand.sort((x, y) => x[1] - y[1]);
  const minSf = cand[0][1];
  const ok = fits && minSf + 1e-9 >= b.sf && defl <= 1 + 1e-9;
  const governs: Governs = defl > 1 && minSf + 1e-9 >= b.sf ? 'deflection' : cand[0][0];
  const bad = sol.joints.filter(j => !j.ok).map(j => j.joint);
  return { ok, minSf, sf: { front, ends, bottom, brace }, governs, deflRatio: defl, fits, jointsOk: bad.length === 0, badJoints: bad, solution: sol };
}

export interface Solved {
  /** the answer (mm); 0 when even the smallest tried size fails */
  value: number;
  /** the search ran into its limit: any size up to it passes */
  capped: boolean;
  /** the check at the answer */
  at: TankCheck | null;
}

const STEP = 0.1 * IN_MM;
const floorStep = (v: number) => Math.floor(v / STEP + 1e-9) * STEP;
/** The largest 0.1 in grid value that passes, given hi fails and lo passes with hi - lo <= STEP / 2: walk down from hi's grid value (at most 2 steps).
 *  (Flooring lo instead could land one step low whenever the boundary falls within half a step of a grid line: the 17.8 vs 17.7 in oddity.) */
function gridTop(ok: (v: number) => boolean, lo: number, hi: number, floor: number): number {
  let g = floorStep(hi);
  while (g > lo + 1e-9 && !ok(g)) g -= STEP;
  return Math.max(floor, g > lo + 1e-9 ? g : ok(floorStep(lo)) ? floorStep(lo) : floor);
}

/** Largest height (mm) for a length: bisection over H, to 0.1 in. */
export function maxHeight(L: number, level: BraceLevel, b: EnvelopeBase, opts: { min?: number; max?: number } = {}): Solved {
  const lo0 = opts.min ?? 4 * IN_MM, hi0 = opts.max ?? 72 * IN_MM;
  if (!checkTank(L, lo0, level, b).ok) return { value: 0, capped: false, at: null };
  if (checkTank(L, hi0, level, b).ok) return { value: hi0, capped: true, at: checkTank(L, hi0, level, b) };
  let lo = lo0, hi = hi0;
  while (hi - lo > STEP / 2) { const m = (lo + hi) / 2; if (checkTank(L, m, level, b).ok) lo = m; else hi = m; }
  const h = gridTop(m => checkTank(L, m, level, b).ok, lo, hi, lo0);
  return { value: h, capped: false, at: checkTank(L, h, level, b) };
}

/** Longest tank (mm) for a height: bisection over L, to 0.1 in. */
export function maxLength(H: number, level: BraceLevel, b: EnvelopeBase, opts: { min?: number; max?: number } = {}): Solved {
  const lo0 = opts.min ?? 8 * IN_MM, hi0 = opts.max ?? 240 * IN_MM;
  if (!checkTank(lo0, H, level, b).ok) return { value: 0, capped: false, at: null };
  if (checkTank(hi0, H, level, b).ok) return { value: hi0, capped: true, at: checkTank(hi0, H, level, b) };
  let lo = lo0, hi = hi0;
  while (hi - lo > STEP / 2) { const m = (lo + hi) / 2; if (checkTank(m, H, level, b).ok) lo = m; else hi = m; }
  const l = gridTop(m => checkTank(m, H, level, b).ok, lo, hi, lo0);
  return { value: l, capped: false, at: checkTank(l, H, level, b) };
}

/** Thinnest stock glass (mm) for a tank, null when even the thickest fails. */
export function minGlass(L: number, H: number, level: BraceLevel, b: Omit<EnvelopeBase, 'glass'>, stock: number[]): { glass: number | null; at: TankCheck | null } {
  for (const t of [...stock].sort((x, y) => x - y)) { const c = checkTank(L, H, level, { ...b, glass: t }); if (c.ok) return { glass: t, at: c }; }
  return { glass: null, at: null };
}

/** The safety factor achieved at a given glass and geometry. */
export const achievedSf = (L: number, H: number, level: BraceLevel, b: EnvelopeBase): TankCheck => checkTank(L, H, level, b);

export interface EnvelopeCell { level: BraceLevel; L: number; solved: Solved; fits: boolean }
/** The "what can I build" table: largest height for each brace level at each length. */
export function heightTable(levels: BraceLevel[], lengths: number[], b: EnvelopeBase, opts: { min?: number; max?: number } = {}): EnvelopeCell[][] {
  return levels.map(level => lengths.map(L => {
    const fits = braceFits(L, b.D, braceFor(level, b, L), b.minOpening);
    return { level, L, fits, solved: fits ? maxHeight(L, level, b, opts) : { value: 0, capped: false, at: null } };
  }));
}

export { DEFAULT_SF };
