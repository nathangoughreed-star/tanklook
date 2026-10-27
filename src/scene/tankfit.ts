// Tank fit engine for path 1, "an animal I want" (lane P2, 2026-10-20). Pure functions, no UI: given the animals the user picked, which
// catalogue tank do they need, which sizes come next, and what does the build cost. It READS stockingOf (lane SE2 owns it), the tank
// catalogue (data/tanks.ts) and the demand model; it changes none of them.
//   tankFor(animals)             the smallest catalogue tank that meets the space limit (stockingOf space <= 100 %), the species' length and
//                                depth limits and their floor-area need by zone
//   stepUps(animals, tank, n)    the next n good sizes up, each with its cost increase and the space / filtration bars it would give
//   buildSpan(animals, tank)     setup dollars and minutes a week, cheapest build to balanced build
// GroupCare (lane P1, src/data/groups.ts, plan-path1-animal-first.md) is read through CARE when it lands; until then the defaults hold:
// recommended minimum = CARE.group else 1, no depth limit, no length limit, zone from the species' own `zone` / `level`.
import { careOf } from './zone';
import { getSpecies } from '../data/species';
import { getTankModel, pickRimless, TANK_MODELS, tankFromModel, type TankModel, type TankVariant } from '../data/tanks';
import { defaultProfile, demandOf, type DemandOpts } from '../demand';
import { bareSetup } from './defaults';
import { volume } from './physics';
import { countsAgainstWater, isOver, stockingOf } from './stocking';
import { MIN_SLACK_PCT } from './animalfit';
import { geometryOf, minDataOf, speciesMinimum, tankMinimum } from './tankMin';
import { floorFor, HERP, SQFT_MM2 } from '../data/herpstock';
import { dryNeedsOf, dryRowsFor, type DryBuild } from './drygear';
import { footprint } from './shape';
import { sharedRange } from './temprange';
import { WATER } from '../data/climatedata';
import { CARE } from '../data/care';
import { drySetup } from './drygear';
import { applyPreset, optionCost, PRESETS, ROOM_C, rowsFor, sumpOffered, techOf, tempFit, withChoice } from './tech';
import type { Fish, TankSetup, Units } from './types';

/** What the user has picked: n animals of a species, each at `tl` mm (the adult length when omitted). */
export interface AnimalCount { species: string; n: number; tl?: number; /** how many of the n are females, drawn at the female's adult length (the rest at tl or the species length) */ f?: number }
export { careOf, recommendedMin, zoneOf, type Zone } from './zone';


export interface Needs {
  /** the longest red-line length any of them has, mm (scene/tankMin.ts lines); 0 = no demand */
  minLengthMm: number;
  /** the shallowest water any of them tolerates, mm (GroupCare maxDepthMm); Infinity = no limit. It counts even where tankmin.json has a sourced advisory maximum (ADF: 18 in limit, 24 in advice; Nathan 2026-10-22) */
  maxDepthMm: number;
  /** salt water needed */
  salt: boolean;
}

function wet(animals: AnimalCount[]) {
  return animals.flatMap(a => { const sp = getSpecies(a.species); return sp && a.n > 0 && countsAgainstWater(sp) ? [{ sp, n: a.n, tl: a.tl ?? sp.tl }] : []; });
}

/** Land animals only (lane LT, 2026-10-26): the picks live in a terrarium and are judged on floor and height, not water. A mix of land and
 *  water animals is a paludarium (lane S241, below). */
export function allLand(animals: AnimalCount[]): boolean {
  const sps = animals.filter(a => a.n > 0).map(a => getSpecies(a.species));
  return sps.length > 0 && sps.every(sp => sp?.habitat === 'land');
}
/** A paludarium (lane S241, Nathan 2026-10-26): at least one land pick and at least one pick that is not land. Part water, part land. */
export function isMixed(animals: AnimalCount[]): boolean {
  const sps = animals.filter(a => a.n > 0).map(a => getSpecies(a.species)).filter(sp => !!sp);
  return sps.some(sp => sp!.habitat === 'land') && sps.some(sp => sp!.habitat !== 'land');
}
/** The land side's need: the herpstock minimum floor of every land animal and of each semi-aquatic one that has a rule (it uses the bank
 *  as well as the pool), sq ft; and the tallest height the land animals ask for, in. */
export function landNeed(animals: AnimalCount[]): { floorSqFt: number; hMin: number } {
  let floorSqFt = 0, hMin = 0;
  for (const a of animals) {
    const sp = getSpecies(a.species), rule = sp && a.n > 0 && sp.habitat !== 'water' ? HERP[sp.sci] : undefined;
    if (!sp || !rule) continue;
    floorSqFt += floorFor(rule, a.n)[0];
    if (sp.habitat === 'land') hMin = Math.max(hMin, rule.hMin ?? 0);
  }
  return { floorSqFt, hMin };
}
/** The pool's depth as a share of the tank's height (the paludarium starter's water line sits near 0.42; Nathan's design 2026-10-26: half). */
const POOL_DEPTH = 0.5;
/** The share of the floor left for the pool once the land has its minimum (at least 2 %: a tank with no room left reads as over-full, never as an error). */
const poolShare = (T: TankSetup['tank'], animals: AnimalCount[]) => Math.max(0.02, 1 - landNeed(animals).floorSqFt / (footprint(T).area / SQFT_MM2));
const dry = (animals: AnimalCount[]) => animals.flatMap(a => { const sp = getSpecies(a.species); return sp && a.n > 0 && sp.habitat === 'land' ? [{ sp, n: a.n }] : []; });

export function needsOf(animals: AnimalCount[]): Needs {
  let minLengthMm = 0, maxDepthMm = Infinity, salt = false;
  for (const { sp } of wet(animals)) {
    minLengthMm = Math.max(minLengthMm, minDataOf(sp.id)?.red?.L ?? 0);
    maxDepthMm = Math.min(maxDepthMm, careOf(sp.id)?.maxDepthMm ?? Infinity); // Nathan 2026-10-22: the ADF's 450 mm is a limit (a warning, never a block); the sourced 24 in stays as the advice line
    salt ||= !!sp.salt;
  }
  return { minLengthMm, maxDepthMm, salt };
}

/** A tank candidate: a plain rectangular catalogue size (round, bow, pie and bowl shapes and the terrariums are not offered as steps). */
const WATER_LEVEL = 1; // tanks start full (Nathan 2026-10-22)
const CANDIDATES = TANK_MODELS.filter(m => !m.terrarium && (m.shape ?? 'rect') === 'rect' && /^[\d.]+ (gal|ft)/.test(m.name)) // generic sizes, not one maker's product
  .map(m => { const T = tankFromModel(m); return { m, T, litres: volume(T).litres }; })
  .sort((a, b) => a.litres - b.litres || a.m.id.localeCompare(b.m.id));
type Candidate = (typeof CANDIDATES)[number];
/** Wide shallow tanks a paludarium can use beyond the plain rectangular sizes (Nathan 2026-10-26: the Imagitarium Frameless Shallow 28 gal; its depth is an estimate). */
const PALUDARIUM_EXTRA = ['n_imagitarium_shallow_28'];
const PALUDARIA: Candidate[] = [...CANDIDATES, ...PALUDARIUM_EXTRA.flatMap(id => { const m = getTankModel(id); return m ? [(() => { const T = tankFromModel(m); return { m, T, litres: volume(T).litres }; })()] : []; })]
  .sort((a, b) => a.litres - b.litres || a.m.id.localeCompare(b.m.id));
/** The terrarium sizes, for land animals (every catalogue terrarium: the generic presets and the three real products), least air first. */
const TERRARIA: Candidate[] = TANK_MODELS.filter(m => m.terrarium)
  .map(m => { const T = tankFromModel(m); return { m, T, litres: volume(T).litres }; })
  .sort((a, b) => a.litres - b.litres || a.m.id.localeCompare(b.m.id));
/** The catalogue sizes smallest first, wet (plain rectangular) or land (terrariums): for the group-minimum tank (groupMin.ts). */
export const catalogueSizes = (land: boolean): Candidate[] => land ? TERRARIA : CANDIDATES;

/**
 * The two builds, for these animals in this tank (the animals' part of a build: plants and CO2 belong to the scape step, lane P6).
 * Both start from the bare-minimum gear preset (lowtech fresh, fowlr salt: filter, heater, water conditioner, test kit), plus a basic LED
 * light (the demand model prices one only when the scene has one) and no heater when every animal is comfortable at room temperature
 * (the preset always carries one); they differ in the
 * filter: cheapest is the lowest-priced filter that keeps filtration at or under 100 %, balanced the lowest-priced that leaves it at or
 * under 70 % and is a hang-on-back or better (headroom for a missed water change). Falls back to the strongest filter when none is enough.
 */
const BASE_PRESET = { fresh: 'lowtech', salt: 'fowlr' } as const;
/** True when the water must be heated: salt water, or any animal whose comfortable band (or unknown band) does not hold room temperature. */
const needsHeater = (animals: AnimalCount[], salt: boolean) => salt || wet(animals).some(({ sp }) => tempFit(sp.id, ROOM_C) !== 'ok');
const FILTRATION_TARGET = { cheapest: 100, balanced: 70 } as const;
export type BuildKind = keyof typeof FILTRATION_TARGET;

/** A paludarium's water: the pool is what is left of the floor after the land's minimum, at POOL_DEPTH of the height; the paludarium scape, a mesh top. */
export function setPool(S: TankSetup, animals: AnimalCount[]): void {
  S.water.level = poolShare(S.tank, animals) * POOL_DEPTH;
  S.layout.id = 'paludarium'; S.lid = 'mesh';
}
/** The land side's gear rows (heat, thermostat, UVB, gauge, misting, timer) for a paludarium build, merged into the setup's Tech rows. */
export function withDryGear(S: TankSetup, animals: AnimalCount[], build: DryBuild): TankSetup {
  const t = techOf(S), land = animals.filter(a => a.n > 0 && getSpecies(a.species)?.habitat === 'land').map(a => a.species);
  return { ...S, tech: { ...t, rows: { ...t.rows, ...dryRowsFor(dryNeedsOf(land), build) } } };
}

/** The bare tank with the animals in it and the build's gear: what stockingOf and the demand model are asked about. */
function setupFor(c: Candidate, animals: AnimalCount[], build: BuildKind): TankSetup {
  const S = bareSetup(), salt = needsOf(animals).salt;
  S.tank = c.T;
  S.water.on = true; S.water.level = WATER_LEVEL; S.water.salt = salt;
  if (isMixed(animals)) setPool(S, animals);
  let id = 1;
  // females at their own adult length (a molly female is 96 mm to the male's 85): the tank list then reads what the tile reads
  S.fish = animals.flatMap(a => { const fem = getSpecies(a.species)?.female; return Array.from({ length: Math.max(0, a.n) }, (_, i): Fish => ({ id: id++, species: a.species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0,
    ...(fem && i < (a.f ?? 0) ? { sex: 'f' as const, tl: fem.tl } : a.tl ? { tl: a.tl } : {}) })); });
  const preset = BASE_PRESET[salt ? 'salt' : 'fresh'];
  if (PRESETS.some(p => p.id === preset)) S.tech = applyPreset(S, preset);
  S.light = { ...S.light, type: 'led', tech: 'led-white', count: 1, watts: undefined };
  if (!needsHeater(animals, salt)) S.tech = withChoice(S, 'heater', 'none');
  if (isMixed(animals)) return withDryGear(applyFilter(S, build), animals, build === 'balanced' ? 'balanced' : 'cheapest');
  return applyFilter(S, build);
}
/** The build's filter: the cheapest that keeps filtration at its target (see setupFor). */
function applyFilter(S: TankSetup, build: BuildKind): TankSetup {
  const options = rowsFor(S).find(r => r.id === 'filter')?.options ?? [];
  let best: { opt: string; usd: number } | undefined, strongest: { opt: string; pct: number } | undefined;
  for (const o of options) {
    if (o.id === 'none' || (o.id === 'sump' && !sumpOffered(S))) continue; // a sump only where the builds offer one (lane SU)
    const t = withChoice(S, 'filter', o.id), usd = optionCost(S, 'filter', o.id).setup.mode, pct = stockingOf({ ...S, tech: t }).filtrationPercent;
    // the fallback is the filter that leaves the lowest filtration, as the builds' (lane SU: by rated capacity a sump won on a nano whose media is a few litres)
    if (!strongest || pct < strongest.pct) strongest = { opt: o.id, pct };
    if ((build === 'cheapest' || (o.capacity ?? 1) >= 1) && pct <= FILTRATION_TARGET[build] && (!best || usd < best.usd)) best = { opt: o.id, usd };
  }
  const pick = best?.opt ?? strongest?.opt;
  if (pick) S.tech = withChoice(S, 'filter', pick);
  return S;
}

/** The tank's own price from the catalogue's real products: the median list price of the standard bare glass tanks (not a kit, rimless,
 *  acrylic, discontinued or a premium line: low-iron, reef systems), when there are three or more (two from 75 gal up, few makers
 *  sell those). Fewer fall back to the big-box stores' own tanks (Petco / PetSmart / Chewy), else to the demand model's $/gallon rule:
 *  one premium product must not set a size's planning price, and a sale is tankSaleFor's, not the planning price (S224b). */
const PREMIUM = /low[- ]?iron|ultra[- ]?clear|starphire|opti-?white|reefer|waterbox|red sea|innovative marine|ultum|neptunian|fiji cube/i;
const catalogPrice = (c: Candidate): DemandOpts['tankPrice'] => () => {
  const live = (c.m.variants ?? []).filter(v => !v.discontinued && v.price_usd && v.price_kind !== 'kit' && !/acrylic/i.test(`${v.line ?? ''} ${v.price_note ?? ''}`) && !PREMIUM.test(`${v.brand} ${v.line ?? ''}`));
  const usd = (vs: TankVariant[]) => { const ps = vs.map(v => v.regular_usd ?? v.price_usd!).sort((a, b) => a - b); return ps.length ? ps[Math.floor(ps.length / 2)] : undefined; };
  const std = live.filter(v => !pickRimless(c.m, v));
  return (std.length >= (c.m.ratedGal >= 75 ? 2 : 3) ? usd(std) : undefined) ?? usd(live.filter(v => /^(Petco|PetSmart|Chewy)$/.test(v.retailer ?? '')));
};

export interface Fit {
  /** a paludarium only: the floor the land animals need at the sources' minimum, percent of the tank's floor (spacePct is then the pool's Space) */
  landPct?: number;
  /** space limit of this tank, percent (stockingOf spacePercent) */
  spacePct: number;
  /** filtration limit under the balanced build, percent */
  filtrationPct: number;
  /** the tank's size against the most demanding species' minimum (the Fullness tile's third bar), percent; over 100 / 0.9 = too small */
  minPct: number;
  /** workable but cramped for some species (comfortable size over the tank) */
  cramped: boolean;
  /** why a tank is out, empty when it fits */
  fails: ('space' | 'minimum' | 'length' | 'depth' | 'floor' | 'filtration' | 'height' | 'temperature')[];
}

/**
 * Land animals in a terrarium (lane LT): no water, so no space or filtration limit. The same two rule sets the editor uses, nothing new:
 * each species' red / green lines (tankMin.ts, sourced footprint and height: the Fullness tile's minimum bar) and the herp floor per
 * animal and shortest enclosure (data/herpstock.ts, what herpCheck warns on, with its 5 % / 1 in of slack). `spacePct` = the floor the
 * animals need at the sources' minimum over the floor there is; `minPct` the red-line bar.
 */
export function dryFit(T: TankSetup['tank'], animals: AnimalCount[]): Fit {
  const S = bareSetup(); S.tank = T; S.water.on = false;
  const g = geometryOf(S), raw = footprint(T).area / SQFT_MM2, area = raw * 1.05, height = T.H / 25.4 + 1, fails: Fit['fails'] = [];
  let minPct = 0, comfort = 0, need = 0, want = 0;
  for (const { sp, n } of dry(animals)) {
    const r = speciesMinimum(sp, g), rule = HERP[sp.sci];
    minPct = Math.max(minPct, r.pct); comfort = Math.max(comfort, r.comfortPct);
    if (!rule) continue;
    const [mn, rc] = floorFor(rule, n); need += mn; want += rc;
    if (rule.hMin && height < rule.hMin && !fails.includes('height')) fails.push('height');
  }
  if (minPct > MIN_SLACK_PCT) fails.unshift('minimum');
  if (area < need) fails.push('floor');
  return { spacePct: need ? 100 * need / raw : 0, filtrationPct: 0, minPct, cramped: comfort > 100 || area < want, fails };
}

function fitOf(c: Candidate, animals: AnimalCount[]): Fit {
  const S = setupFor(c, animals, 'balanced'), r = stockingOf(S), fails: Fit['fails'] = [], mixed = isMixed(animals);
  if (isOver(r.spacePercent)) fails.push('space');
  // the balanced build already takes the strongest catalogue filter when none keeps it at 70 %: still over 100 % means no filter can carry this stocking here
  if (isOver(r.filtrationPercent)) fails.push('filtration');
  const tm = tankMinimum(S);
  if (tm.percent > MIN_SLACK_PCT) fails.push('minimum'); // the Fullness tile's own red lines (length, width, floor area, height; tankMin.ts), 10 % slack
  // lane HB: every limit is the engines' own (stockingOf: water and floor; tankMinimum: red lines, length with the same 10 % slack (S207), depth); no math here
  if (tm.lengthShort) fails.push('length');
  if (tm.tooDeep) fails.push('depth');
  if (mixed) { // the land side: its herpstock floor and height (the same rules as a terrarium), the pool's are the water engines' above
    const { floorSqFt, hMin } = landNeed(animals), raw = footprint(c.T).area / SQFT_MM2;
    if (raw * 1.05 < floorSqFt) fails.push('floor');
    if (hMin && c.T.H / 25.4 + 1 < hMin) fails.push('height');
    return { spacePct: r.spacePercent, filtrationPct: r.filtrationPercent, minPct: Math.min(tm.percent, 999), cramped: tm.comfortPercent > 100 || raw * 1.05 < floorSqFt * 1.3, fails, landPct: 100 * floorSqFt / raw };
  }
  return { spacePct: r.spacePercent, filtrationPct: r.filtrationPercent, minPct: tm.percent, cramped: tm.comfortPercent > 100, fails };
}

export interface TankFit extends Fit {
  tank: TankModel;
  litres: number;
  gallons: number;
  needs: Needs;
}
/** S245 (Nathan 2026-10-26, S244 F4): animals whose tolerable temperatures do not meet fit no tank; extra space never rescues them. */
export const sharedOf = (animals: AnimalCount[]) => sharedRange(wet(animals).map(w => w.sp));
/** Temperature of a stocking, from the comfortable ranges first and the tolerable ones (climatedata WATER.tol) second (Coordinator 11, 2026-10-26):
 *  'none' = not even the tolerable ranges meet (axolotl + boesemani): no tank fits. 'compromise' = only the comfortable ranges miss (angel + neon):
 *  a tank still fits, with a caution naming the compromise temperature (the middle of the tolerable overlap). */
export function tempVerdict(animals: AnimalCount[]): { level: 'ok' | 'compromise' | 'none'; range?: [number, number]; at?: number } {
  const sps = wet(animals).map(w => w.sp);
  if (sharedRange(sps).state !== 'none') return { level: 'ok' };
  const rs = sps.filter(s => s.habitat !== 'land').map(s => WATER[s.id]?.tol ?? CARE[s.id]?.temp).filter((r): r is [number, number] => !!r);
  const lo = Math.max(...rs.map(r => r[0])), hi = Math.min(...rs.map(r => r[1]));
  return hi < lo ? { level: 'none' } : { level: 'compromise', range: [lo, hi], at: Math.round((lo + hi) / 2 * 2) / 2 };
}
const noSharedTemp = (animals: AnimalCount[]) => tempVerdict(animals).level === 'none';
const fitOfTank = (c: Candidate, animals: AnimalCount[], needs: Needs): TankFit => {
  const f = allLand(animals) ? dryFit(c.T, animals) : fitOf(c, animals);
  if (noSharedTemp(animals)) f.fails.unshift('temperature');
  return { ...f, tank: c.m, litres: c.litres, gallons: c.litres / 3.785, needs };
};
/** The sizes these animals are judged against: terrariums for land animals, else the plain rectangular tanks; empty with nothing to judge. */
const candidatesFor = (animals: AnimalCount[]): Candidate[] => allLand(animals) ? TERRARIA : isMixed(animals) ? PALUDARIA : wet(animals).length ? CANDIDATES : [];

/** The smallest catalogue tank that holds these animals (space, filtration with the strongest catalogue filter, species limits); the largest one (still failing, `fails` says why) when none does. Undefined with no animals in the water. */
export function tankFor(animals: AnimalCount[]): TankFit | undefined {
  const list = candidatesFor(animals);
  if (!list.length) return undefined;
  const needs = needsOf(animals);
  let last: TankFit | undefined;
  for (const c of list) { last = fitOfTank(c, animals, needs); if (!last.fails.length) return last; }
  return last;
}

/** Every catalogue size, smallest first, each judged for these animals (`fails` empty = it holds them). For the stocking screen's tank list. */
export function tankOptions(animals: AnimalCount[]): TankFit[] {
  const needs = needsOf(animals);
  return candidatesFor(animals).map(c => fitOfTank(c, animals, needs));
}

/** A model as a candidate: its catalogue entry, else (the editor's own tank) built from the model. */
const candidateOf = (m: TankModel): Candidate => PALUDARIA.find(c => c.m.id === m.id) ?? TERRARIA.find(c => c.m.id === m.id) ?? { m, T: tankFromModel(m), litres: volume(tankFromModel(m)).litres };

/** These animals judged in ONE given tank (the verdict tankOptions gives that size): the chosen tank with a tankmate added, the fork card's
 *  in-space tank. A tank with more litres can still fail where a smaller one holds them (cubes and talls fail length / minimum), so comparing
 *  litres against tankFor's answer is not a fit (S207 2026-10-22). Undefined with no animals in the water. */
export function fitIn(animals: AnimalCount[], tank: TankModel | string): TankFit | undefined {
  const m = typeof tank === 'string' ? getTankModel(tank) : tank;
  if (!m || !candidatesFor(animals).length) return undefined;
  return fitOfTank(candidateOf(m), animals, needsOf(animals));
}

export interface StepUp {
  tank: TankModel;
  litres: number;
  /** setup cost increase over the current tank, balanced build, whole dollars (animals and gear scaled with the tank) */
  costDeltaUsd: number;
  spacePct: number;
  filtrationPct: number;
}
/** A good next size is at least this much more water than the one before (the catalogue's sizes are finer than a person weighs). */
const STEP_RATIO = 1.25;

/** The next `n` good sizes above `current`: bigger water each time with a lower Space bar (floor-bound animals need more floor), none that fails the length or depth the animals need. */
export function stepUps(animals: AnimalCount[], current: TankModel | string, n = 3, ratio = STEP_RATIO): StepUp[] {
  const cur = typeof current === 'string' ? getTankModel(current) : current;
  if (!cur || !wet(animals).length || allLand(animals) || isMixed(animals)) return []; // a terrarium's next size is the list itself (lane LT)
  const c0 = candidateOf(cur);
  const base = setupUsd(c0, animals, 'balanced'), out: StepUp[] = [];
  let from = c0.litres, room = fitOf(c0, animals).spacePct;
  for (const c of CANDIDATES) {
    if (out.length >= n) break;
    if (c.litres < from * ratio) continue;
    const f = fitOf(c, animals);
    if (f.fails.some(x => x !== 'space' && x !== 'minimum')) continue; // 'filtration' too: a step that no filter can carry is not a step
    if (f.spacePct >= room) continue; // lane HB: more water on the same floor gives floor-bound animals no more room: not a step
    room = f.spacePct;
    out.push({ tank: c.m, litres: c.litres, costDeltaUsd: Math.round(setupUsd(c, animals, 'balanced') - base), spacePct: f.spacePct, filtrationPct: f.filtrationPct });
    from = c.litres;
  }
  return out;
}

function demand(c: Candidate, animals: AnimalCount[], build: BuildKind) {
  const S = allLand(animals) ? drySetup(c.m, animals, build === 'balanced' ? 'balanced' : 'cheapest') : setupFor(c, animals, build);
  return demandOf(S, defaultProfile(), { tankPrice: catalogPrice(c) }).totals;
}
const setupUsd = (c: Candidate, animals: AnimalCount[], build: BuildKind) => demand(c, animals, build).setupUsd;

export interface BuildSpan {
  /** setup dollars, whole, cheapest build to balanced build */
  setupUsd: { cheapest: number; balanced: number };
  /** minutes a week (means), cheapest build to balanced build */
  minPerWeek: { cheapest: number; balanced: number };
}
/** What this stocking in this tank costs to set up and how much work it is, from the cheapest build to the balanced one. */
export function buildSpan(animals: AnimalCount[], tank: TankModel | string): BuildSpan | undefined {
  const m = typeof tank === 'string' ? getTankModel(tank) : tank;
  if (!m) return undefined;
  const c = candidateOf(m);
  const a = demand(c, animals, 'cheapest'), b = demand(c, animals, 'balanced');
  return { setupUsd: { cheapest: Math.round(a.setupUsd), balanced: Math.round(b.setupUsd) }, minPerWeek: { cheapest: Math.round(a.minPerWeek), balanced: Math.round(b.minPerWeek) } };
}

/** A length in the viewer's units, whole inches or whole cm. */
export const lenTxt = (mm: number, u: Units = 'cm') => u === 'in' ? `${Math.round(mm / 25.4)} in` : `${Math.round(mm / 10)} cm`;
/** "30 x 12 in" / "76 x 30 cm": a footprint in the viewer's units. */
export const sizeTxt = (L: number, D: number, u: Units = 'cm') => u === 'in' ? `${Math.round(L / 25.4)} x ${Math.round(D / 25.4)} in` : `${Math.round(L / 10)} x ${Math.round(D / 10)} cm`;

/** "About a 20 gal long (76 x 30 cm)" style label for the viewer: nearest whole gallons, the maker-free outer size in the viewer's units. */
export function tankLabel(m: TankModel, u: Units = 'cm'): string {
  if (m.terrarium) return `Terrarium ${sizeTxt(m.outer.L, m.outer.D, u)}, ${lenTxt(m.outer.H, u)} tall`; // a terrarium's height matters to climbers (lane LT)
  const { L, D } = m.outer, suffix = /^[\d.]+ gal(?: (.+))?$/.exec(m.name);
  if (!suffix) return `About ${m.name} (${sizeTxt(L, D, u)})`;
  return `About a ${m.ratedGal} gal ${suffix[1] ?? 'tank'} (${sizeTxt(L, D, u)})`;
}
