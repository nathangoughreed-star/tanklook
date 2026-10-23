// Expert calibration rounds (chat XC 2026-10-23, research/expert-calibration.md): a seeded generator of survey tanks and, for
// each tank, the engine tables the fit (scripts/calib-fit.mjs) re-reads under new space factors without running the engine.
// Deterministic for a seed and an engine: same seed, same round.
// Round 1 (research/calib/round-1.json, with renders) came from the first version of this generator; it is frozen data, not
// regenerated. From round 2 (Nathan 2026-10-23, survey v2): text-only tanks, quotas by which dimension is tight (floor, water,
// both), paired tanks (same gallons, another footprint), each species' recommended minimum tank, a tankmate count.
import { defaultSetup } from '../scene/defaults';
import { starterItems } from '../scene/items';
import { IN } from '../scene/physics';
import { IDEAL_MAX, FLOOR_SHARE, stockingOf, countsAgainstWater, massG } from '../scene/stocking';
import { compatRisks, crowdWarnings } from '../scene/territory';
import { tankMinimum } from '../scene/tankMin';
import { groupShort } from '../scene/animalfit';
import { sharedRange } from '../scene/temprange';
import { zoneOf } from '../scene/zone';
import { SPECIES, getSpecies, type Species } from '../data/species';
import { FLOOR_FACTOR, SPACE_FACTOR } from '../data/spacefactor';
import { CARE } from '../data/care';
import type { TankSetup } from '../scene/types';

/** The two anchors the experts answer on (Nathan 2026-10-23): 75 % = ideal (green up to here), 100 % = the limit past which
 *  long-term problems are likely (red beyond); in between, tread carefully. */
export const IDEAL_PCT = IDEAL_MAX, LIMIT_PCT = 100;

type Dims = [number, number, number];
/** Standard US glass tanks, gal and inches L x D x H (as test/expert.test.ts), 10 gal and up. */
export const TANKS: [number, Dims][] = [[10, [20, 10, 12]], [15, [24, 12, 12]], [20, [24, 12, 16]], [29, [30, 12, 18]],
  [30, [36, 12, 16]], [40, [36, 18, 16]], [55, [48, 13, 21]], [75, [48, 18, 21]], [90, [48, 18, 24]], [125, [72, 18, 21]]];
/** Same gallons, another footprint: tests whether floor area or height matters more (Nathan's f12 note, 2026-10-23). */
export const PAIRS: [[number, Dims], [number, Dims]][] = [[[20, [24, 12, 16]], [20, [30, 12, 12]]], [[29, [30, 12, 18]], [30, [36, 12, 16]]],
  [[40, [36, 18, 16]], [40, [48, 12, 16]]]];

export type Kind = 'single' | 'mix-ok' | 'mix-flagged';
export type Tight = 'floor' | 'water' | 'both';
export interface TableRow { n: number; water: Record<string, number>; floor: number }
export interface Scenario {
  id: string;
  kind: Kind;
  /** which dimension the engine finds tight as shown */
  tight: Tight;
  gal: number; dimsIn: Dims;
  /** species and counts as shown; the focal species is the one the main count questions ask about */
  stock: [string, number][];
  focal: string;
  /** the tankmate the second count question asks about (the largest other contributor), if any */
  mate?: string;
  /** compatRisks level for mixes ('ok' = none); null for one species */
  gate: 'ok' | 'concern' | 'high' | null;
  gateItems: string[];
  /** the engine's reading as shown (never shown to experts) */
  pct: { space: number; water: number; floor: number };
  /** engine table: for focal count n (index), each species' water-% contribution and the floor % */
  table: TableRow[];
  /** the same for the tankmate's count, the focal species as shown */
  mateTable?: TableRow[];
  /** what each species takes, as the engine counts it: water room, and its share of the floor (0, 0.5 or 1) */
  uses: Record<string, { water: boolean; floor: number }>;
  /** no limit count is asked for the focal species (shrimp: Nathan 2026-10-23, grazing and food set it, not dimensions) */
  noLimit: boolean;
  /** 'fresh' | 'repeat' (of `of`) | 'anchor' (held-out pool) | 'pair' (the same stock as `of` in another footprint) */
  role: 'fresh' | 'repeat' | 'anchor' | 'pair';
  of?: string;
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
const isInvert = (sp: Species) => sp.cat === 'fw-invert';
/** The floor share the engine gives a species (stocking.ts floorUseCm2): none for shrimp, else by zone. */
// S212 (2026-10-23): times FLOOR_FACTOR, as the engine's floorUseCm2 does, so a species the engine counts at half the floor (mbuna 0.5) or none (white cloud 0) is not drawn as a floorer
export const floorShareOf = (sp: Species) => isInvert(sp) ? 0 : FLOOR_SHARE[zoneOf(sp)] * (FLOOR_FACTOR[sp.id]?.[0] ?? 1);

/** A tank with these animals, sparse decor (river stones), water to the rim, fish spread by zone with a seeded layout. */
export function setupOf(dimsIn: Dims, stock: [string, number][], seed = 1): TankSetup {
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
export function readSpace(dimsIn: Dims, stock: [string, number][]) {
  const st = stockingOf(setupOf(dimsIn, stock));
  const water: Record<string, number> = {};
  for (const c of st.contributors) water[c.id] = c.space / st.capacity.space * 100;
  return { space: st.spacePercent, water: st.waterPercent, floor: st.floorPercent, byWater: water };
}

/** Every species fits this tank on its own minimums (length, area, depth): "too small" never stands in for "too full". From round 2
 *  also the recommended (comfort) minimum, not only the red line (Nathan's f5, 2026-10-23: a 19 cm synodontis passed the 29 gal red line
 *  while the source recommends 48 in). */
export function fitsTank(dimsIn: Dims, ids: string[], comfort = true): boolean {
  const m = tankMinimum(setupOf(dimsIn, ids.map(id => [id, 1])));
  return m.percent <= 100 && !m.lengthShort && !m.tooDeep && (!comfort || m.comfortPercent <= 100);
}
const groupMin = (id: string) => CARE[id]?.group ?? 1;
/** Information weight of a species: fewer answers so far weigh more; a species riding on a class factor (no own row) counts double. */
export const needOf = (id: string, answers: Record<string, number>) => (SPACE_FACTOR[id] ? 1 : 2) / (1 + (answers[id] ?? 0)) ** 2; // squared: one round spreads over species

/** The smallest count of `focal` (others fixed) whose space reading reaches `target`, or null if it never does by `max`. */
function countFor(dims: Dims, others: [string, number][], focal: string, target: number, max = 300): number | null {
  const at = (n: number) => readSpace(dims, [...others, [focal, n]]).space;
  if (at(max) < target) return null;
  let lo = 0, hi = max;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (at(mid) >= target) hi = mid; else lo = mid; }
  return Math.abs(at(lo) - target) < Math.abs(at(hi) - target) && lo > 0 ? lo : hi;
}

/** The engine table for counts 0..nmax of `who`, the others as in `stock`: what the fit re-reads. nmax: where the reading passes
 *  1.8 x the limit, at least 2 x shown. */
export function tableOf(dims: Dims, stock: [string, number][], who: string): TableRow[] {
  const others = stock.filter(([id]) => id !== who), shown = stock.find(([id]) => id === who)![1];
  const out: TableRow[] = [];
  for (let n = 0; n <= 400; n++) {
    const r = readSpace(dims, [...others, ...(n ? [[who, n] as [string, number]] : [])]);
    out.push({ n, water: r.byWater, floor: r.floor });
    if (n >= 2 * shown && r.space > 1.8 * LIMIT_PCT) break;
  }
  return out;
}

/** Which dimension is tight as read: one clearly above the other (by a quarter), or both close and both well filled. */
export function tightOf(water: number, floor: number): Tight | null {
  if (water >= 55 && floor < 0.75 * water) return 'water';
  if (floor >= 55 && water < 0.75 * floor) return 'floor';
  if (water >= 55 && floor >= 55) return 'both';
  return null;
}

export interface Slot { tight: Tight; kind: Kind }
/** Round 2's 16 fresh slots: floor-tight and water-tight tanks of each kind, and mixes where both are tight. */
export const SLOTS: Slot[] = [
  ...(['single', 'single', 'single', 'mix-ok', 'mix-ok', 'mix-flagged'] as Kind[]).map(kind => ({ tight: 'floor' as Tight, kind })),
  ...(['single', 'single', 'single', 'mix-ok', 'mix-ok', 'mix-flagged'] as Kind[]).map(kind => ({ tight: 'water' as Tight, kind })),
  ...(['mix-ok', 'mix-ok', 'mix-ok', 'mix-flagged'] as Kind[]).map(kind => ({ tight: 'both' as Tight, kind })),
];

/** One tank for a slot (in `tank` when given), or null when the draw fails a gate (the caller retries). */
export function drawOne(r: () => number, slot: Slot, answers: Record<string, number>, id: string, tank?: [number, Dims]): Scenario | null {
  const [gal, dims] = tank ?? TANKS[Math.floor(r() * TANKS.length)];
  const fits = POOL.filter(sp => fitsTank(dims, [sp.id]));
  const floorers = fits.filter(sp => floorShareOf(sp) === 1), swimmers = fits.filter(sp => floorShareOf(sp) < 1);
  // the focal species fills the dimension the slot tests; "both" puts a bottom dweller with swimmers
  // shrimp are never the focal species or the main school (Nathan 2026-10-23: their capacity is grazing and food, not dimensions); they stay as tankmates
  const fish = (xs: Species[]) => xs.filter(sp => !isInvert(sp));
  const pool = slot.tight === 'water' ? fish(swimmers.filter(sp => floorShareOf(sp) === 0)) : floorers;
  if (pool.length < 2 || swimmers.length < 2) return null;
  const focal = pickW(r, pool, sp => needOf(sp.id, answers));
  const ids = [focal.id];
  if (slot.kind !== 'single') {
    const k = r() < 0.6 ? 1 : 2;
    for (let i = 0; i < k; i++) {
      const rest = (slot.tight === 'floor' && i === 0 ? fits : slot.tight === 'both' && i === 0 ? fish(swimmers) : swimmers).filter(sp => !ids.includes(sp.id));
      if (!rest.length) return null;
      ids.push(pickW(r, rest, sp => needOf(sp.id, answers)).id);
    }
  }
  if (!fitsTank(dims, ids)) return null;
  const sps = ids.map(i => getSpecies(i)!);
  let gate: Scenario['gate'] = null, gateItems: string[] = [];
  if (slot.kind !== 'single') {
    const cr = compatRisks(setupOf(dims, ids.map(i => [i, groupMin(i)])));
    gate = cr ? cr.level : 'ok'; gateItems = cr?.items ?? [];
    if (slot.kind === 'mix-ok' && (gate !== 'ok' || sharedRange(sps).state === 'none')) return null;
    if (slot.kind === 'mix-flagged' && gate === 'ok') return null;
  }
  // the reading to aim at: half near the ideal, half near the limit (log-normal, sd 0.25), clamped to 50-130 % (Nathan: spread)
  const target = Math.min(130, Math.max(50, (r() < 0.5 ? IDEAL_PCT : LIMIT_PCT) * Math.exp(0.25 * gauss(r))));
  // tankmates first: each alone takes 15-45 % of the target (for "both", a swimmer school takes 55-85 % of the water), never under its group
  const others: [string, number][] = [];
  for (const o of ids.slice(1)) {
    const share = slot.tight === 'both' && floorShareOf(getSpecies(o)!) < 1 ? 0.55 + 0.3 * r() : 0.15 + 0.3 * r();
    const n = countFor(dims, [], o, target * share) ?? groupMin(o);
    others.push([o, Math.max(groupMin(o), n)]);
  }
  if (slot.tight !== 'both' && readSpace(dims, others).space >= target * 0.85) return null;
  const n = countFor(dims, others, focal.id, target);
  // at least 3 of the focal species, so the count questions are not mostly rounding (2 vs 3 fish is a 50 % step)
  if (n === null || n < Math.max(3, groupMin(focal.id)) || groupShort(focal, n)) return null;
  const stock: [string, number][] = [[focal.id, n], ...others];
  if (crowdWarnings(setupOf(dims, stock)).length) return null; // fighting limits are their own flag, never the stocking reading
  const rd = readSpace(dims, stock), tight = tightOf(rd.water, rd.floor);
  if (tight !== slot.tight) return null;
  const mate = others.length ? [...others].sort((a, b) => (rd.byWater[b[0]] ?? 0) - (rd.byWater[a[0]] ?? 0))[0][0] : undefined;
  return { id, kind: slot.kind, tight, gal, dimsIn: dims, stock, focal: focal.id, mate, gate, gateItems,
    pct: { space: rd.space, water: rd.water, floor: rd.floor }, table: tableOf(dims, stock, focal.id),
    ...(mate ? { mateTable: tableOf(dims, stock, mate) } : {}),
    uses: Object.fromEntries(ids.map(i => [i, { water: true, floor: floorShareOf(getSpecies(i)!) }])),
    noLimit: isInvert(focal), role: 'fresh', seed: Math.floor(r() * 1e9) };
}

/** The same stock in another tank (a pair's second footprint), or null if a species does not fit it. */
export function inTank(s: Scenario, [gal, dims]: [number, Dims], id: string): Scenario | null {
  if (!fitsTank(dims, s.stock.map(x => x[0]))) return null;
  const rd = readSpace(dims, s.stock);
  return { ...s, id, gal, dimsIn: dims, role: 'pair', of: s.id, tight: tightOf(rd.water, rd.floor) ?? s.tight,
    pct: { space: rd.space, water: rd.water, floor: rd.floor }, table: tableOf(dims, s.stock, s.focal),
    ...(s.mate ? { mateTable: tableOf(dims, s.stock, s.mate) } : {}) };
}

/** Round 3's 16 fresh tanks (Nathan 2026-10-23: round 2 drew every size alike and the fit gate pushed retries into big tanks, so none
 *  was 10 or 15 gal and 40 gal came up 8 times). Centred on the sizes people keep, 10 to 55 gal, with three outliers (5.5, 75; the
 *  anchor is the 125). Each size is used once per entry: its species are redrawn in that tank, never moved to a bigger one. A 5.5 gal
 *  nano was tried and no slot could fill it (every fish's recommended minimum is above it), so a 15 gal takes its place. */
export const SIZES_R3: [number, Dims][] = [[15, [24, 12, 12]], [10, [20, 10, 12]], [10, [20, 10, 12]], [10, [20, 10, 12]],
  [20, [24, 12, 16]], [20, [24, 12, 16]], [20, [30, 12, 12]], [20, [30, 12, 12]], [29, [30, 12, 18]], [29, [30, 12, 18]], [29, [30, 12, 18]],
  [40, [36, 18, 16]], [40, [36, 18, 16]], [55, [48, 13, 21]], [55, [48, 13, 21]], [75, [48, 18, 21]]];

export interface RoundOpts { seed: number; answers?: Record<string, number>; anchorSeed?: number; pairs?: number; repeats?: number; sizes?: [number, Dims][];
  /** the anchor's stock held from an earlier round, read under today's factors (2026-10-23: the length audit's refit moved the drawn
   *  anchor from 87 to 171 harlequins; the anchor is the one tank every round shares) */
  anchorStock?: [string, number][] }

/** Fixed sizes: the smallest first (hardest to fill), each tries the open slots in a seeded order, a flagged mix relaxing to a passing
 *  one and a mix to a single before the next slot; a size no slot can fill is dropped (reported by the test). */
function fillSized(r: () => number, slots: Slot[], sizes: [number, Dims][], answers: Record<string, number>, prefix: string): Scenario[] {
  const out: Scenario[] = [], seen = { ...answers }, open = [...slots];
  for (const tank of [...sizes].sort((a, b) => a[0] - b[0])) {
    const order = open.map((_, i) => [r(), i] as [number, number]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    let got: Scenario | null = null, used = -1;
    for (const relax of [0, 1, 2]) {
      for (const i of order) {
        const want = open[i], kind: Kind = relax === 0 ? want.kind : relax === 1 ? (want.kind === 'mix-flagged' ? 'mix-ok' : want.kind) : 'single';
        for (let tries = 0; tries < 150 && !got; tries++) got = drawOne(r, { ...want, kind }, seen, `${prefix}${out.length + 1}`, tank);
        if (got) { used = i; break; }
      }
      if (got) break;
    }
    if (!got) continue;
    open.splice(used, 1);
    for (const [id] of got.stock) seen[id] = (seen[id] ?? 0) + 1;
    out.push(got);
  }
  return out;
}

function fill(r: () => number, slots: Slot[], answers: Record<string, number>, prefix: string): Scenario[] {
  const out: Scenario[] = [], seen = { ...answers };
  for (const want of slots) {
    for (let tries = 0; tries < 800; tries++) {
      // a flagged mix is rare in some tanks: after 400 tries take a passing mix for that slot
      const slot = tries >= 400 && want.kind === 'mix-flagged' ? { ...want, kind: 'mix-ok' as Kind } : want;
      const s = drawOne(r, slot, seen, `${prefix}${out.length + 1}`);
      if (!s) continue;
      for (const [id] of s.stock) seen[id] = (seen[id] ?? 0) + 1; // spread the round over species
      out.push(s); break;
    }
  }
  return out;
}

/** A round from round 2 on: the 16 SLOTS, `pairs` pairs (2 tanks each), one held-out anchor (the same every round) and `repeats`
 *  repeats, in a seeded order with every repeat at least 5 tanks after its original. Ids: f1.., p1a/p1b.., a1, r1... */
export function makeRound(o: RoundOpts): Scenario[] {
  const r = rng(o.seed), answers = o.answers ?? {};
  const order: Scenario[] = o.sizes ? fillSized(r, SLOTS, o.sizes, answers, 'f') : fill(r, SLOTS, answers, 'f');
  const pairSlots: Slot[] = [{ tight: 'water', kind: 'single' }, { tight: 'floor', kind: 'single' }, { tight: 'water', kind: 'mix-ok' }];
  for (let k = 0, tries = 0; k < (o.pairs ?? 2) && tries < 400; tries++) {
    const pr = PAIRS[(k + tries) % PAIRS.length], a = drawOne(r, pairSlots[k % pairSlots.length], answers, `p${k + 1}a`, pr[0]);
    const b = a && inTank(a, pr[1], `p${k + 1}b`);
    if (a && b) { order.push({ ...a, role: 'pair' }, b); k++; }
  }
  const ar = rng(o.anchorSeed ?? 7_500_200);
  for (let tries = 0; tries < 400; tries++) { const a = drawOne(ar, { tight: 'water', kind: 'mix-ok' }, {}, 'a1'); if (!a) continue;
    const held = o.anchorStock ? inTank({ ...a, stock: o.anchorStock, focal: o.anchorStock[0][0], mate: o.anchorStock[1]?.[0] }, [a.gal, a.dimsIn], 'a1') : a;
    if (held) { const { of: _of, ...h } = held; order.push({ ...h, role: 'anchor' }); break; } }
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const early = order.slice(0, Math.max(1, order.length - 5)).filter(s => s.role === 'fresh');
  for (let k = 0; k < (o.repeats ?? 1) && early.length; k++) {
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
