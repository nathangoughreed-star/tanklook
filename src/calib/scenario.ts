// Expert calibration rounds (chat XC 2026-10-23, research/expert-calibration.md): a seeded generator of survey tanks and, for
// each tank, the engine table the fit (scripts/calib-fit.mjs) re-reads under new space factors without running the engine.
// Deterministic for a seed and an engine: same seed, same round.
import { defaultSetup } from '../scene/defaults';
import { starterItems } from '../scene/items';
import { IN } from '../scene/physics';
import { stockingOf, countsAgainstWater, massG } from '../scene/stocking';
import { compatRisks, crowdWarnings } from '../scene/territory';
import { tankMinimum } from '../scene/tankMin';
import { groupShort } from '../scene/animalfit';
import { sharedRange } from '../scene/temprange';
import { zoneOf } from '../scene/zone';
import { SPECIES, getSpecies, type Species } from '../data/species';
import { SPACE_FACTOR } from '../data/spacefactor';
import { CARE } from '../data/care';
import type { TankSetup } from '../scene/types';

/** The two anchors the experts answer on (Nathan 2026-10-23): 75 % = ideal (green up to here), 100 % = the limit past which
 *  long-term problems are likely (red beyond); in between, tread carefully. */
export const IDEAL_PCT = 75, LIMIT_PCT = 100;

/** Standard US glass tanks, gal and inches L x D x H (as test/expert.test.ts), 10 gal and up. */
export const TANKS: [number, [number, number, number]][] = [[10, [20, 10, 12]], [15, [24, 12, 12]], [20, [24, 12, 16]], [29, [30, 12, 18]],
  [30, [36, 12, 16]], [40, [36, 18, 16]], [55, [48, 13, 21]], [75, [48, 18, 21]], [90, [48, 18, 24]], [125, [72, 18, 21]]];

export type Kind = 'single' | 'mix-ok' | 'mix-flagged';
export interface Scenario {
  id: string;
  kind: Kind;
  gal: number; dimsIn: [number, number, number];
  /** species and counts as shown; the focal species is the one the count questions ask about */
  stock: [string, number][];
  focal: string;
  /** compatRisks level for mixes ('ok' = none); null for one species */
  gate: 'ok' | 'concern' | 'high' | null;
  gateItems: string[];
  /** the engine's reading as shown (never shown to experts) */
  pct: { space: number; water: number; floor: number };
  /** engine table: for focal count n (index), each species' water-% contribution and the floor % */
  table: { n: number; water: Record<string, number>; floor: number }[];
  /** 'fresh' | 'repeat' (of `of`) | 'anchor' (held-out pool) */
  role: 'fresh' | 'repeat' | 'anchor';
  of?: string;
  /** seed of the animals' positions in the render */
  seed: number;
}

/** mulberry32: a small seeded PRNG, uniform in [0, 1). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
function pickW<T>(r: () => number, xs: T[], w: (x: T) => number): T {
  const ws = xs.map(w), tot = ws.reduce((a, b) => a + b, 0);
  let u = r() * tot;
  for (let i = 0; i < xs.length; i++) if ((u -= ws[i]) <= 0) return xs[i];
  return xs[xs.length - 1];
}

/** Species a survey may show: freshwater animals that live in the water and take water room (snails take none), with a mass. */
export const POOL: Species[] = SPECIES.filter(sp => (sp.cat === 'fw-fish' || sp.cat === 'fw-invert') && !sp.salt && sp.kind !== 'snail'
  && countsAgainstWater(sp) && massG(sp.id) > 0);

/** A tank with these animals, sparse decor (river stones), water to the rim, fish spread by zone with a seeded layout. */
export function setupOf(dimsIn: [number, number, number], stock: [string, number][], seed = 1): TankSetup {
  const s = defaultSetup();
  s.tank = { ...s.tank, L: dimsIn[0] * IN, D: dimsIn[1] * IN, H: dimsIn[2] * IN };
  s.water.on = true; s.water.level = 1; s.water.salt = false;
  s.layout.id = 'stones'; s.items = starterItems(s);
  s.camera = { ...s.camera, zoom: 0.8 };
  const r = rng(seed);
  let id = 1;
  s.fish = [];
  for (const [sp, n] of stock) {
    const z = zoneOf(getSpecies(sp)!);
    for (let i = 0; i < n; i++) s.fish.push({ id: id++, species: sp, x: (0.08 + 0.84 * r()) * s.tank.L,
      y: (z === 'bottom' ? 0.17 + 0.04 * r() : z === 'top' ? 0.75 + 0.15 * r() : 0.3 + 0.5 * r()) * s.tank.H,
      depth: (0.15 + 0.7 * r()) * s.tank.D, yaw: r() < 0.5 ? 0 : Math.PI, pitch: 0, roll: 0, bend: 0 });
  }
  return s;
}

/** The engine's space reading of a tank: water and floor percent (filtration is held ample, so it never binds). */
export function readSpace(dimsIn: [number, number, number], stock: [string, number][]) {
  const st = stockingOf(setupOf(dimsIn, stock));
  const water: Record<string, number> = {};
  for (const c of st.contributors) water[c.id] = c.space / st.capacity.space * 100;
  return { space: st.spacePercent, water: st.waterPercent, floor: st.floorPercent, byWater: water };
}

/** Every species fits this tank on its own minimums (length, area, depth): "too small" never stands in for "too full". */
export function fitsTank(dimsIn: [number, number, number], ids: string[]): boolean {
  const m = tankMinimum(setupOf(dimsIn, ids.map(id => [id, 1])));
  return m.percent <= 100 && !m.lengthShort && !m.tooDeep;
}
const groupMin = (id: string) => CARE[id]?.group ?? 1;
/** Information weight of a species: fewer answers so far weigh more; a species riding on a class factor (no own row) counts double. */
export const needOf = (id: string, answers: Record<string, number>) => (SPACE_FACTOR[id] ? 1 : 2) / (1 + (answers[id] ?? 0));

/** The smallest count of `focal` (others fixed) whose space reading reaches `target`, or null if it never does by `max`. */
function countFor(dims: [number, number, number], others: [string, number][], focal: string, target: number, max = 300): number | null {
  const at = (n: number) => readSpace(dims, [...others, [focal, n]]).space;
  if (at(max) < target) return null;
  let lo = 0, hi = max;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (at(mid) >= target) hi = mid; else lo = mid; }
  return Math.abs(at(lo) - target) < Math.abs(at(hi) - target) && lo > 0 ? lo : hi;
}

/** The engine table for focal counts 0..nmax: what the fit re-reads. nmax: where the reading passes 1.8 x the limit, at least 2 x shown. */
export function tableOf(dims: [number, number, number], stock: [string, number][], focal: string) {
  const others = stock.filter(([id]) => id !== focal), shown = stock.find(([id]) => id === focal)![1];
  const out: Scenario['table'] = [];
  for (let n = 0; n <= 400; n++) {
    const r = readSpace(dims, [...others, ...(n ? [[focal, n] as [string, number]] : [])]);
    out.push({ n, water: r.byWater, floor: r.floor });
    if (n >= 2 * shown && r.space > 1.8 * LIMIT_PCT) break;
  }
  return out;
}

export interface RoundOpts { seed: number; fresh?: number; answers?: Record<string, number>; anchorSeed?: number; anchors?: number; repeats?: number }

/** One tank drawn for `kind`, or null when the draw fails a gate (the caller retries). */
export function drawOne(r: () => number, kind: Kind, answers: Record<string, number>, id: string): Scenario | null {
  const [gal, dims] = TANKS[Math.floor(r() * TANKS.length)];
  const fits = POOL.filter(sp => fitsTank(dims, [sp.id]));
  if (fits.length < 3) return null;
  const focal = pickW(r, fits, sp => needOf(sp.id, answers));
  const ids = [focal.id];
  if (kind !== 'single') {
    const k = r() < 0.6 ? 1 : 2;
    for (let i = 0; i < k; i++) {
      const rest = fits.filter(sp => !ids.includes(sp.id));
      ids.push(pickW(r, rest, sp => needOf(sp.id, answers)).id);
    }
  }
  if (!fitsTank(dims, ids)) return null;
  const sps = ids.map(i => getSpecies(i)!);
  let gate: Scenario['gate'] = null, gateItems: string[] = [];
  if (kind !== 'single') {
    const cr = compatRisks(setupOf(dims, ids.map(i => [i, groupMin(i)])));
    const temp = sharedRange(sps).state;
    gate = cr ? cr.level : 'ok'; gateItems = cr?.items ?? [];
    if (kind === 'mix-ok' && (gate !== 'ok' || temp === 'none')) return null;
    if (kind === 'mix-flagged' && gate === 'ok') return null;
  }
  // the reading to aim at: half near the ideal, half near the limit (log-normal, sd 0.25)
  const target = Math.min(150, Math.max(50, (r() < 0.5 ? IDEAL_PCT : LIMIT_PCT) * Math.exp(0.25 * gauss(r))));
  // tankmates first: each alone takes 15-45 % of the target, never under its group
  const others: [string, number][] = [];
  for (const o of ids.slice(1)) {
    const n = countFor(dims, [], o, target * (0.15 + 0.3 * r())) ?? groupMin(o);
    others.push([o, Math.max(groupMin(o), n)]);
  }
  if (readSpace(dims, others).space >= target * 0.85) return null;
  const n = countFor(dims, others, focal.id, target);
  // at least 3 of the focal species, so the count questions are not mostly rounding (2 vs 3 fish is a 50 % step)
  if (n === null || n < Math.max(3, groupMin(focal.id)) || groupShort(focal, n)) return null;
  const stock: [string, number][] = [[focal.id, n], ...others];
  if (crowdWarnings(setupOf(dims, stock)).length) return null; // fighting limits are their own flag, never the stocking reading
  const rd = readSpace(dims, stock);
  return { id, kind, gal, dimsIn: dims, stock, focal: focal.id, gate, gateItems, pct: { space: rd.space, water: rd.water, floor: rd.floor },
    table: tableOf(dims, stock, focal.id), role: 'fresh', seed: Math.floor(r() * 1e9) };
}

const KIND_SHARE: [Kind, number][] = [['single', 0.4], ['mix-ok', 0.4], ['mix-flagged', 0.2]];

function draws(seed: number, count: number, answers: Record<string, number>, prefix: string): Scenario[] {
  const r = rng(seed), out: Scenario[] = [], seen = { ...answers };
  // kinds by quota (largest remainder), shuffled
  const kinds: Kind[] = KIND_SHARE.flatMap(([k, s]) => Array<Kind>(Math.round(s * count)).fill(k)).slice(0, count);
  while (kinds.length < count) kinds.push('single');
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  for (const kind of kinds) {
    for (let tries = 0; tries < 200; tries++) {
      const s = drawOne(r, kind, seen, `${prefix}${out.length + 1}`);
      if (!s) continue;
      for (const [id] of s.stock) seen[id] = (seen[id] ?? 0) + 1; // spread the round over species
      out.push(s); break;
    }
  }
  return out;
}

/** A round: `fresh` new tanks, ~10 % held-out anchors (the same pool every round), ~10 % repeats, in a seeded order with every
 *  repeat at least 5 tanks after its original. Ids: f1.., a1.., r1... */
export function makeRound(o: RoundOpts): Scenario[] {
  const fresh = o.fresh ?? 20, nA = o.anchors ?? Math.max(1, Math.round(fresh / 10)), nR = o.repeats ?? Math.max(1, Math.round(fresh / 10));
  const f = draws(o.seed, fresh, o.answers ?? {}, 'f');
  const a = draws(o.anchorSeed ?? 7_500_100, nA, {}, 'a').map(s => ({ ...s, role: 'anchor' as const }));
  const r = rng(o.seed ^ 0x5bd1e995);
  const order: Scenario[] = [...f, ...a];
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const early = order.slice(0, Math.max(1, order.length - 5)).filter(s => s.role === 'fresh');
  for (let k = 0; k < nR && early.length; k++) {
    const src = early.splice(Math.floor(r() * early.length), 1)[0], at = order.indexOf(src);
    const pos = Math.min(order.length, at + 5 + Math.floor(r() * Math.max(1, order.length - at - 5)));
    order.splice(pos, 0, { ...src, id: `r${k + 1}`, role: 'repeat', of: src.id, seed: Math.floor(r() * 1e9) });
  }
  return order;
}

/** The space-factor class a species falls back to (stocking.ts spaceFactorAq): the fit's hierarchy groups species by it. */
export function classOf(id: string): string {
  const sp = getSpecies(id)!, g = massG(id);
  return sp.cat === 'fw-invert' ? 'invert' : sp.cat === 'amphibian' ? 'amphibian' : g < 2 ? 'tiny' : g < 30 ? 'mid' : 'big';
}
