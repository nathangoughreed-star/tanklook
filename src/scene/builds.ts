// The three builds of path 1, "an animal I want" (lane P6a, 2026-10-20): for these animals in this tank, three finished tanks
// (tank + filter + heater + light, a bundle where one fits): cheapest, least work, balanced. Each one meets the stocking's needs
// (filtration at or under 100 %, every species' space / length / depth limits through the tank the caller passes from tankfit) and
// carries its set-up $, expected $ a month and minutes a week (the demand model's means: one number each, no range) with the live
// tank, gear and bundle deals that apply. Pure functions; src/ui/buildPick.ts draws them. It READS tankfit, stocking and the demand
// model; it changes none of them. Plants, CO2 and the scape are the next step (lane P6b): the builds here are animals and gear only.
import { getSpecies } from '../data/species';
import { tankSaleFor, tankFromModel, type TankModel } from '../data/tanks';
import { dealAsKit, type Deal } from '../data/deals';
import { productName } from '../data/gearCatalog';
import type { GearDeal } from '../data/gearDeals';
import { defaultProfile, demandOf, type Demand, type DemandOpts } from '../demand';
import { dealMatches, MIN_SAVING_FRAC, MIN_SAVING_USD } from '../demand/dealmatch';
import { filterName } from '../demand/gear';
import { gearOffers, gearParts, pinGear } from '../demand/gearDeals';
import { kitTech } from '../demand/tech';
import { bareSetup } from './defaults';
import { volume } from './physics';
import { countsAgainstWater, stockingOf } from './stocking';
import { filterFor, filterUnits, heaterUnits, heatLoss, applyPreset, PRESETS, ROOM_C, rowsFor, techOf, tempFit, withChoice } from './tech';
import { needsOf, type AnimalCount } from './tankfit';
import type { Fish, TankSetup } from './types';

export type BuildId = 'cheapest' | 'leastWork' | 'balanced';
export const BUILD_LABEL: Record<BuildId, string> = { cheapest: 'Cheapest', leastWork: 'Least work', balanced: 'Balanced' };
export const BUILD_BLURB: Record<BuildId, string> = {
  cheapest: 'The lowest price that still keeps these animals within what the filter can clear.',
  leastWork: 'The fewest minutes a week, at a cost: quality-of-life gear (a water-change hose, an automatic feeder, an auto top-off on salt) and the filter that is least work to clean.',
  balanced: 'Filter headroom (at 70 % or less of its limit) for a missed water change, at a fair price.',
};

const WATER_LEVEL = 0.9;
const BASE_PRESET = { fresh: 'lowtech', salt: 'fowlr' } as const;
/** The filtration limit each build keeps the stocking under, percent. */
export const FILTRATION_LIMIT: Record<BuildId, number> = { cheapest: 100, leastWork: 100, balanced: 70 };

export interface Build {
  id: BuildId;
  label: string;
  blurb: string;
  tank: TankModel;
  animals: AnimalCount[];
  /** the finished tank, animals unplaced: the scene the editor opens (ui/buildPick.ts places them) */
  setup: TankSetup;
  /** gear in plain words, one line each: "Filter: ...", "Heater: ...", "Light: ..." */
  gear: string[];
  /** expected set-up dollars, whole, with the deals below applied */
  setupUsd: number;
  /** the same at listed prices (no deals) */
  listUsd: number;
  /** expected dollars a month (the demand model's mean, electricity and replacement of losses included) */
  upkeepUsdMo: number;
  minPerWeek: number;
  /** stocking limits under this gear, percent */
  filtrationPct: number;
  spacePct: number;
  /** gear sales that fit and are priced in (lane GD) */
  gearDeals: GearDeal[];
  /** the tank's own sale price when it beats the catalogue's median price */
  tankDeal?: { retailer: string; usd: number; regularUsd: number; saleEnds?: string };
  /** a bundle (tank + gear in one price) that replaces its parts in this build, when one fits (lane DM) */
  bundle?: Deal;
  /** dollars the deals save against the list prices, whole */
  savingUsd: number;
}

/** What each build is asked about its tank: the caller passes the tank the stocking needs (tankfit's tankFor, or a step-up). */
const wetAnimals = (animals: AnimalCount[]) => animals.flatMap(a => { const sp = getSpecies(a.species); return sp && a.n > 0 && countsAgainstWater(sp) ? [{ sp, n: a.n }] : []; });
const needsHeater = (animals: AnimalCount[], salt: boolean) => salt || wetAnimals(animals).some(({ sp }) => tempFit(sp.id, ROOM_C) !== 'ok');

/** The bare tank with the animals in it, the base preset's gear and a basic LED light; heater and filter are the build's to choose. */
function baseSetup(tank: TankModel, animals: AnimalCount[]): TankSetup {
  const S = bareSetup(), salt = needsOf(animals).salt;
  S.tank = tankFromModel(tank);
  S.water.on = true; S.water.level = WATER_LEVEL; S.water.salt = salt;
  let id = 1;
  S.fish = animals.flatMap(a => Array.from({ length: Math.max(0, a.n) }, (): Fish => ({ id: id++, species: a.species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0, ...(a.tl ? { tl: a.tl } : {}) })));
  const preset = BASE_PRESET[salt ? 'salt' : 'fresh'];
  if (PRESETS.some(p => p.id === preset)) S.tech = applyPreset(S, preset);
  S.light = { ...S.light, type: 'led', tech: 'led-white', count: 1, watts: undefined };
  if (!needsHeater(animals, salt)) S.tech = withChoice(S, 'heater', 'none');
  return S;
}

/** The live sale on the tank, when the demand model priced the tank by it (the same call the editor's cost panel makes, so the numbers agree). */
function tankDealOf(D: Demand, S: TankSetup, now: number): Build['tankDeal'] {
  if (!D.items.find(r => r.key === 'tank')?.label.includes('on sale at')) return undefined;
  const sale = tankSaleFor(volume(S.tank).gallons, S.tank.shape ?? 'rect', now, undefined, undefined, S.tank);
  return sale && { retailer: sale.retailer, usd: sale.usd, regularUsd: sale.regularUsd, ...(sale.saleEnds ? { saleEnds: sale.saleEnds } : {}) };
}

interface Priced { S: TankSetup; D: Demand; gearDeals: GearDeal[]; bundle?: Deal; tankDeal?: Build['tankDeal']; filtrationPct: number; spacePct: number }

/** Price a setup: the tank's price, the bundle (a kit price over its parts) when given, else gear sales pinned onto its rows. */
function price(S0: TankSetup, now: number, bundle?: Deal, withGearDeals = true): Priced {
  const P = defaultProfile(), S = structuredClone(S0);
  const opts: DemandOpts = { now, ...(bundle ? { kit: dealAsKit(bundle) } : {}) };
  let D = demandOf(S, P, opts);
  const gearDeals: GearDeal[] = [];
  if (withGearDeals && !bundle) {
    for (const d of gearOffers(S, D, now)) { pinGear(S, d); gearDeals.push(d); }
    if (gearDeals.length) D = demandOf(S, P, { ...opts, parts: gearParts(S, now) });
  }
  const r = stockingOf(S);
  const tankDeal = bundle ? undefined : tankDealOf(D, S, now);
  return { S, D, gearDeals, ...(bundle ? { bundle } : {}), ...(tankDeal ? { tankDeal } : {}), filtrationPct: r.filtrationPercent, spacePct: r.spacePercent };
}

interface Candidate { opt: string; S: TankSetup; usd: number; min: number; filtration: number; capacity: number }

/** Every filter the Tech menu offers this tank (not "none" or a sump, which needs a drilled tank), priced and judged. */
function filterCandidates(base: TankSetup, now: number): Candidate[] {
  const out: Candidate[] = [];
  const opts = rowsFor(base).find(r => r.id === 'filter')?.options ?? [];
  for (const o of opts) {
    if (o.id === 'none' || o.id === 'sump') continue;
    const S = { ...base, tech: withChoice(base, 'filter', o.id) };
    const p = price(S, now, undefined, false);
    out.push({ opt: o.id, S, usd: p.D.totals.setupUsd, min: p.D.totals.minPerWeek, filtration: p.filtrationPct, capacity: o.capacity ?? 1 });
  }
  return out;
}

/** The quality-of-life gear that takes chores off the user's hands (lane MW 2026-10-21): an auto top-off on salt, a water-change hose, an automatic feeder.
 *  Each is added when the demand model counts fewer minutes with it, so the least-work build pays for exactly the gear that saves time. */
const QOL_CHOICES: [row: string, option: string][] = [['ato', 'ato'], ['wcmethod', 'hose'], ['feeder', 'auto']];
const withLessWork = (S: TankSetup, now: number): TankSetup => {
  let out = S, min = price(S, now, undefined, false).D.totals.minPerWeek;
  for (const [row, option] of QOL_CHOICES) {
    if (!rowsFor(out).some(r => r.id === row) || (row === 'ato' && !out.water.salt)) continue; // an auto top-off is a reef item
    const T = { ...out, tech: withChoice(out, row, option) }, m = price(T, now, undefined, false).D.totals.minPerWeek;
    if (m < min - 0.05) { out = T; min = m; }
  }
  return out;
};

const pick = (list: Candidate[], less: (a: Candidate, b: Candidate) => number) => [...list].sort(less)[0];
/** The filter the stocking can use: under the build's limit, else the strongest there is (the caller's tank is then too small: `meets` is false). */
function choose(id: BuildId, list: Candidate[]): Candidate | undefined {
  const ok = list.filter(c => c.filtration <= FILTRATION_LIMIT[id] && (id !== 'balanced' || c.capacity >= 1));
  const strongest = pick(list, (a, b) => a.filtration - b.filtration);
  if (!ok.length) return strongest;
  if (id === 'cheapest') return pick(ok, (a, b) => a.usd - b.usd || a.min - b.min);
  if (id === 'leastWork') return pick(ok, (a, b) => a.min - b.min || a.filtration - b.filtration || a.usd - b.usd);
  return pick(ok, (a, b) => a.usd - b.usd);
}

const gearLines = (S: TankSetup): string[] => {
  const lines: string[] = [];
  const t = techOf(S);
  const fs = filterUnits(t);
  if (fs.length) lines.push(`Filter: ${fs.map(u => { const f = filterFor(S, u.kind as never, u.model, u.product); return f.product ? productName(f.product) : filterName(f.model); }).join(' + ')}`);
  const hs = heaterUnits(t);
  if (t.rows.heater && t.rows.heater !== 'none' && hs.length) lines.push(`Heater: about ${Math.round(heatLoss(S, t).heater.watts)} W${hs.length > 1 ? ' x ' + hs.length : ''}`);
  else lines.push('No heater: these animals are comfortable at room temperature');
  lines.push(`Light: ${S.light.watts ? Math.round(S.light.watts) + ' W ' : ''}LED`);
  if (t.rows.ato === 'ato') lines.push('Quality of life: auto top-off');
  if (t.rows.wcmethod === 'hose') lines.push('Quality of life: water-change hose (drains and fills from the tap)');
  if (t.rows.feeder === 'auto') lines.push('Quality of life: automatic feeder');
  return lines;
};

/** A bundle that lowers this build's cost and keeps it within the build's filtration limit, or undefined. */
function bundleFor(id: BuildId, S: TankSetup, now: number): { S: TankSetup; deal: Deal } | undefined {
  const P = defaultProfile();
  for (const m of dealMatches(S, P, { now })) {
    if (m.breaks.length || m.savingUsd <= MIN_SAVING_USD || m.savingUsd <= MIN_SAVING_FRAC * m.partsUsd) continue;
    const T = structuredClone(m.setup), kit = dealAsKit(m.deal), t = kitTech(T, kit);
    // kitTech starts from the inferred gear (a heater): a kit without one keeps the build's own heater choice ('none' when nothing needs it)
    if (t && !kit.heater && !kit.includes?.includes('heater')) t.rows.heater = techOf(T).rows.heater;
    if (t) T.tech = t;
    // the balanced build wants a hang-on-back filter or better: a bundle with a sponge or an internal filter is the cheapest build's
    if (id === 'balanced' && !['hob', 'canister', 'sump'].includes(techOf(T).rows.filter)) continue;
    if (stockingOf(T).filtrationPercent <= FILTRATION_LIMIT[id]) return { S: T, deal: m.deal };
  }
  return undefined;
}

function finish(id: BuildId, tank: TankModel, animals: AnimalCount[], S0: TankSetup, now: number): Build {
  const lessWork = id === 'leastWork' ? withLessWork(S0, now) : S0;
  const listed = price(lessWork, now, undefined, false);
  let best = price(lessWork, now), bundle: Deal | undefined;
  const b = id === 'leastWork' ? undefined : bundleFor(id, lessWork, now); // a bundle's gear is fixed, so it cannot be the least-work pick
  if (b) { const p = price(b.S, now, b.deal); if (p.D.totals.setupUsd < best.D.totals.setupUsd) { best = p; bundle = b.deal; } }
  const T = best.S, setupUsd = Math.round(best.D.totals.setupUsd), listUsd = Math.round(listed.D.totals.setupUsd);
  return {
    id, label: BUILD_LABEL[id], blurb: BUILD_BLURB[id], tank, animals, setup: T, gear: gearLines(T),
    setupUsd, listUsd,
    upkeepUsdMo: Math.round(best.D.totals.upkeepUsdMo), minPerWeek: Math.round(best.D.totals.minPerWeek),
    filtrationPct: best.filtrationPct, spacePct: best.spacePct, gearDeals: best.gearDeals,
    ...(best.tankDeal ? { tankDeal: best.tankDeal } : {}),
    ...(bundle ? { bundle } : {}),
    savingUsd: Math.max(0, listUsd - setupUsd),
  };
}

/**
 * The three builds for these animals in this tank, in the order cheapest, least work, balanced. Guarantees: filtration at or under the
 * build's limit whenever any filter can do it; cheapest costs no more than balanced; least work takes no more minutes than either.
 */
export function buildsFor(animals: AnimalCount[], tank: TankModel, now = Date.now()): Build[] {
  const base = baseSetup(tank, animals), list = filterCandidates(base, now);
  const make = (id: BuildId) => { const c = choose(id, list); return finish(id, tank, animals, c ? c.S : base, now); };
  const out = { cheapest: make('cheapest'), leastWork: make('leastWork'), balanced: make('balanced') };
  // a bundle or sale can make one build cheaper than the build meant to be cheaper: the cheaper of the two is the cheapest
  if (out.cheapest.setupUsd > out.balanced.setupUsd) out.cheapest = { ...out.balanced, id: 'cheapest', label: BUILD_LABEL.cheapest, blurb: BUILD_BLURB.cheapest };
  // gear that saves no minutes is no "least work": when the model finds no lever (fresh water mostly: the water changes are set by the stocking), it is the cheapest or balanced build
  const least = Math.min(out.cheapest.minPerWeek, out.balanced.minPerWeek);
  if (out.leastWork.minPerWeek >= least) out.leastWork = { ...(out.cheapest.minPerWeek <= out.balanced.minPerWeek ? out.cheapest : out.balanced), id: 'leastWork', label: BUILD_LABEL.leastWork, blurb: BUILD_BLURB.leastWork };
  return [out.cheapest, out.leastWork, out.balanced];
}

/** True when this build keeps the stocking within its own filtration limit (false: no filter on the list carries it in this tank). */
export const meetsNeeds = (b: Build) => b.filtrationPct <= FILTRATION_LIMIT[b.id] && b.spacePct <= 100;

