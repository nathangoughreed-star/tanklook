// Tank fit engine for path 1, "an animal I want" (lane P2, 2026-10-20). Pure functions, no UI: given the animals the user picked, which
// catalogue tank do they need, which sizes come next, and what does the build cost. It READS stockingOf (lane SE2 owns it), the tank
// catalogue (data/tanks.ts) and the demand model; it changes none of them.
//   tankFor(animals)             the smallest catalogue tank that meets the space limit (stockingOf space <= 100 %), the species' length and
//                                depth limits and their floor-area need by zone
//   stepUps(animals, tank, n)    the next n good sizes up, each with its cost increase and the space / filtration bars it would give
//   buildSpan(animals, tank)     setup dollars and minutes a week, cheapest build to balanced build
// GroupCare (lane P1, src/data/groups.ts, plan-path1-animal-first.md) is read through CARE when it lands; until then the defaults hold:
// recommended minimum = CARE.group else 1, no depth limit, no length limit, zone from the species' own `zone` / `level`.
import { careOf, zoneOf, type Zone } from './zone';
import { getSpecies } from '../data/species';
import { getTankModel, TANK_MODELS, tankFromModel, type TankModel } from '../data/tanks';
import { defaultProfile, demandOf, type DemandOpts } from '../demand';
import { bareSetup } from './defaults';
import { volume } from './physics';
import { countsAgainstWater, floorUseCm2, stockingOf } from './stocking';
import { MIN_SLACK_PCT } from './animalfit';
import { minDataOf, tankMinimum } from './tankMin';
import { applyPreset, optionCost, PRESETS, ROOM_C, rowsFor, stockCapacity, tempFit, withChoice } from './tech';
import type { Fish, TankSetup, Units } from './types';

/** What the user has picked: n animals of a species, each at `tl` mm (the adult length when omitted). */
export interface AnimalCount { species: string; n: number; tl?: number }
export { careOf, recommendedMin, zoneOf, type Zone } from './zone';


export interface Needs {
  /** floor area used by zone, cm2 (the stocking engine's floor model, floorUseCm2; animals that live in the water only) */
  floorCm2: Record<Zone, number>;
  /** the longest red-line length any of them has, mm (scene/tankMin.ts lines); 0 = no demand */
  minLengthMm: number;
  /** the shallowest water any of them tolerates, mm (GroupCare maxDepthMm); Infinity = no limit. A sourced maximum depth that is advisory (ADF, Decision 3) is not counted */
  maxDepthMm: number;
  /** the largest smallest-tank any of them has (CARE.minL, litres): below it the tank is not sane even when the space number is */
  minLitres: number;
  /** salt water needed */
  salt: boolean;
}

function wet(animals: AnimalCount[]) {
  return animals.flatMap(a => { const sp = getSpecies(a.species); return sp && a.n > 0 && countsAgainstWater(sp) ? [{ sp, n: a.n, tl: a.tl ?? sp.tl }] : []; });
}

export function needsOf(animals: AnimalCount[]): Needs {
  const floorCm2: Record<Zone, number> = { bottom: 0, middle: 0, top: 0, all: 0 };
  let minLengthMm = 0, maxDepthMm = Infinity, minLitres = 0, salt = false;
  for (const { sp, n, tl } of wet(animals)) {
    floorCm2[zoneOf(sp)] += n * floorUseCm2(sp, tl);
    minLengthMm = Math.max(minLengthMm, minDataOf(sp.id)?.red?.L ?? 0);
    if (!minDataOf(sp.id)?.depth?.maxWaterDepthMm) maxDepthMm = Math.min(maxDepthMm, careOf(sp.id)?.maxDepthMm ?? Infinity); // lane MM: ADF's 24 in is an advisory with the count picker
    minLitres = Math.max(minLitres, careOf(sp.id)?.minL ?? 0);
    salt ||= !!sp.salt;
  }
  return { floorCm2, minLengthMm, maxDepthMm, minLitres, salt };
}

/** A tank candidate: a plain rectangular catalogue size (round, bow, pie and bowl shapes and the terrariums are not offered as steps). */
const WATER_LEVEL = 0.9;
const CANDIDATES = TANK_MODELS.filter(m => !m.terrarium && (m.shape ?? 'rect') === 'rect' && /^[\d.]+ (gal|ft)/.test(m.name)) // generic sizes, not one maker's product
  .map(m => { const T = tankFromModel(m); return { m, T, litres: volume(T).litres }; })
  .sort((a, b) => a.litres - b.litres || a.m.id.localeCompare(b.m.id));
type Candidate = (typeof CANDIDATES)[number];

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

/** The bare tank with the animals in it and the build's gear: what stockingOf and the demand model are asked about. */
function setupFor(c: Candidate, animals: AnimalCount[], build: BuildKind): TankSetup {
  const S = bareSetup(), salt = needsOf(animals).salt;
  S.tank = c.T;
  S.water.on = true; S.water.level = WATER_LEVEL; S.water.salt = salt;
  let id = 1;
  S.fish = animals.flatMap(a => Array.from({ length: Math.max(0, a.n) }, (): Fish => ({ id: id++, species: a.species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0, ...(a.tl ? { tl: a.tl } : {}) })));
  const preset = BASE_PRESET[salt ? 'salt' : 'fresh'];
  if (PRESETS.some(p => p.id === preset)) S.tech = applyPreset(S, preset);
  S.light = { ...S.light, type: 'led', tech: 'led-white', count: 1, watts: undefined };
  if (!needsHeater(animals, salt)) S.tech = withChoice(S, 'heater', 'none');
  const options = rowsFor(S).find(r => r.id === 'filter')?.options ?? [];
  let best: { opt: string; usd: number } | undefined, strongest: { opt: string; cap: number } | undefined;
  for (const o of options) {
    if (o.id === 'none') continue;
    const t = withChoice(S, 'filter', o.id), usd = optionCost(S, 'filter', o.id).setup.mode, cap = stockCapacity({ ...S, tech: t });
    if (!strongest || cap > strongest.cap) strongest = { opt: o.id, cap };
    if ((build === 'cheapest' || (o.capacity ?? 1) >= 1) && stockingOf({ ...S, tech: t }).filtrationPercent <= FILTRATION_TARGET[build] && (!best || usd < best.usd)) best = { opt: o.id, usd };
  }
  const pick = best?.opt ?? strongest?.opt;
  if (pick) S.tech = withChoice(S, 'filter', pick);
  return S;
}

/** The tank's own price from the catalogue's real products (median of the listed prices), else the demand model's $/gallon rule. */
const catalogPrice = (c: Candidate): DemandOpts['tankPrice'] => () => {
  const ps = (c.m.variants ?? []).filter(v => !v.discontinued && v.price_usd && v.price_kind !== 'kit').map(v => v.price_usd!).sort((a, b) => a - b);
  return ps.length ? ps[Math.floor(ps.length / 2)] : undefined;
};

export interface Fit {
  /** space limit of this tank, percent (stockingOf spacePercent) */
  spacePct: number;
  /** filtration limit under the balanced build, percent */
  filtrationPct: number;
  /** the tank's size against the most demanding species' minimum (the Fullness tile's third bar), percent; over 100 / 0.9 = too small */
  minPct: number;
  /** workable but cramped for some species (comfortable size over the tank) */
  cramped: boolean;
  /** why a tank is out, empty when it fits */
  fails: ('space' | 'minimum' | 'length' | 'depth' | 'floor' | 'filtration')[];
}

function fitOf(c: Candidate, animals: AnimalCount[]): Fit {
  const S = setupFor(c, animals, 'balanced'), r = stockingOf(S), fails: Fit['fails'] = [];
  if (r.spacePercent > 100) fails.push('space');
  // the balanced build already takes the strongest catalogue filter when none keeps it at 70 %: still over 100 % means no filter can carry this stocking here
  if (r.filtrationPercent > 100) fails.push('filtration');
  const tm = tankMinimum(S);
  if (tm.percent > MIN_SLACK_PCT) fails.push('minimum'); // the Fullness tile's own red lines (length, width, floor area, height; tankMin.ts), 10 % slack
  // lane HB: every limit is the engines' own (stockingOf: water and floor; tankMinimum: red lines, strict length, depth); no math here
  if (tm.lengthShort) fails.push('length');
  if (tm.tooDeep) fails.push('depth');
  return { spacePct: r.spacePercent, filtrationPct: r.filtrationPercent, minPct: tm.percent, cramped: tm.comfortPercent > 100, fails };
}

export interface TankFit extends Fit {
  tank: TankModel;
  litres: number;
  gallons: number;
  needs: Needs;
}
const fitOfTank = (c: Candidate, animals: AnimalCount[], needs: Needs): TankFit => ({ ...fitOf(c, animals), tank: c.m, litres: c.litres, gallons: c.litres / 3.785, needs });

/** The smallest catalogue tank that holds these animals (space, filtration with the strongest catalogue filter, species limits); the largest one (still failing, `fails` says why) when none does. Undefined with no animals in the water. */
export function tankFor(animals: AnimalCount[]): TankFit | undefined {
  if (!wet(animals).length) return undefined;
  const needs = needsOf(animals);
  let last: TankFit | undefined;
  for (const c of CANDIDATES) { last = fitOfTank(c, animals, needs); if (!last.fails.length) return last; }
  return last;
}

/** Every catalogue size, smallest first, each judged for these animals (`fails` empty = it holds them). For the stocking screen's tank list. */
export function tankOptions(animals: AnimalCount[]): TankFit[] {
  if (!wet(animals).length) return [];
  const needs = needsOf(animals);
  return CANDIDATES.map(c => fitOfTank(c, animals, needs));
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
  if (!cur || !wet(animals).length) return [];
  const c0 = CANDIDATES.find(c => c.m.id === cur.id) ?? { m: cur, T: tankFromModel(cur), litres: volume(tankFromModel(cur)).litres };
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
  return demandOf(setupFor(c, animals, build), defaultProfile(), { tankPrice: catalogPrice(c) }).totals;
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
  const c = CANDIDATES.find(x => x.m.id === m.id) ?? { m, T: tankFromModel(m), litres: volume(tankFromModel(m)).litres };
  const a = demand(c, animals, 'cheapest'), b = demand(c, animals, 'balanced');
  return { setupUsd: { cheapest: Math.round(a.setupUsd), balanced: Math.round(b.setupUsd) }, minPerWeek: { cheapest: Math.round(a.minPerWeek), balanced: Math.round(b.minPerWeek) } };
}

/** A length in the viewer's units, whole inches or whole cm. */
export const lenTxt = (mm: number, u: Units = 'cm') => u === 'in' ? `${Math.round(mm / 25.4)} in` : `${Math.round(mm / 10)} cm`;
/** "30 x 12 in" / "76 x 30 cm": a footprint in the viewer's units. */
export const sizeTxt = (L: number, D: number, u: Units = 'cm') => u === 'in' ? `${Math.round(L / 25.4)} x ${Math.round(D / 25.4)} in` : `${Math.round(L / 10)} x ${Math.round(D / 10)} cm`;

/** "About a 20 gal long (76 x 30 cm)" style label for the viewer: nearest whole gallons, the maker-free outer size in the viewer's units. */
export function tankLabel(m: TankModel, u: Units = 'cm'): string {
  const { L, D } = m.outer, suffix = /^[\d.]+ gal(?: (.+))?$/.exec(m.name);
  if (!suffix) return `About ${m.name} (${sizeTxt(L, D, u)})`;
  return `About a ${m.ratedGal} gal ${suffix[1] ?? 'tank'} (${sizeTxt(L, D, u)})`;
}
