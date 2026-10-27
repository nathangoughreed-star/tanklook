// Nitrogen budget of a tank (lane SE2, 2026-10-20), from the research notes (side-session-notes research-*.md). Grams of nitrogen a day.
//   PRODUCED  per animal: fasted base 0.00035 x W^0.75 g TAN/day (about 350 x W^-0.25 mg/kg/day, 25 C, +-40 %) plus about 0.02 g TAN per g
//             of feed, feed = feeding level x body weight (light 0.5, normal 1, heavy 2 % a day). Temperature 1.07 per degree. Shrimp, snails,
//             herps by class factor (guessed), bottom grazers 0.75 of the fit (loricariids measured 0.6-0.9).
//   FILTER    nitrifying bacteria: media litres x rate per litre x temperature; rates are low-confidence (ceramic 0.06 g TAN/L/day measured in a
//             fish farm, foam untested). Flow only gates it (oxygen: at least 2 m3 a day through the media per g TAN a day).
//   PLANTS    take ammonium first, nitrate once it is gone: fresh weight x rate per 100 g (slow 0.001, medium 0.003, fast 0.006 g N/day,
//             extrapolated from one measured Egeria study), times light and CO2, less 30 % returned by die-off; floaters 0.3 g N/m2/day.
//             Root feeders (swords, crypts, vals, lotus, carpets) draw about half their nitrogen from the substrate (root tabs, mulm), so
//             only half their uptake counts against the water column (Nathan 2026-10-20).
//   SHARING   plants and bacteria take ammonium side by side, and plants take little at night: plants get at most 60 % of the
//             day's TAN, the filter always sees the rest (a buffer for feeding peaks and a dead fish). Nitrate the bacteria make
//             still goes to plants with room left. A guess, documented: no study pins the split.
//   FERTS     a water-column fertilizer adds nitrate (KNO3, urea): all-in-one about 5 ppm NO3 a week, a dosing pump about 10,
//             EI about 60 (3 x 20). Plants take the animals' nitrogen first; fert nitrogen they cannot use is nitrate to change
//             out. Root tabs feed the substrate, not the water. When the animals already cover what the plants take, a fert
//             without nitrogen (potassium, iron, trace) does the job.
// Two verdicts: AMMONIA SAFETY = (TAN the plants do not take) / 70 % of the filter's capacity (30 % headroom); NITRATE BURDEN = what no
// plant takes, as the water change per week that holds nitrate at about 40 ppm. Units: g (or mg) of NITROGEN throughout, TAN and nitrate
// alike (9 mg N/L = 40 ppm as NO3; 1 ppm NO3 = 0.226 mg N/L).
// WATER CHANGE (lane NB 2026-10-21, research/tank-minimum-first-principles.md Decision 2): steady state of weekly dilution, nitrate
// held at target T with tap water at C: changed share = rise per week / (T - C). Nitrate only: hardness, organics and phosphate are why the
// routine floor (10 %, scene/stocking.ts) applies on top. Three states: (a) routine, one change of at most 50 %; (b) high maintenance,
// over 50 %: the uncapped figure shown, split into two changes a week (linear, the steady-state model; e.g. 2 x 30 % = 60 %) or less stock;
// (c) environmental failure: tap nitrate at or above the target (no change can lower it), or more than two 50 % changes a week.
import { FILTER_MEDIA_L, MEDIA_L_PER_GPH, SPONGE_L_PER_GAL } from '../data/filtermedia';
import type { Species } from '../data/species';
import { LIBRARY } from './items';
import type { Patch, TankSetup } from './types';
import { feedOf, filterFor, optionDef, singleFilter, techOf } from './tech';
import { MET_CLASS, metClass, tempFactor } from './stocking';

export type Feeding = 'light' | 'normal' | 'heavy';
export const FEED_PCT: Record<Feeding, number> = { light: 0.5, normal: 1, heavy: 2 };
export const feedingOf = (S: TankSetup): Feeding => S.feeding ?? 'normal';

const BASE = 0.00035, TAN_PER_FEED = 0.02;
/** g TAN a day from one animal of mass `w` g at `tempC`: fasted base plus the feed. */
export function tanOf(sp: Species, w: number, feeding: Feeding, tempC: number, salt: boolean): number {
  const cls = metClass(sp), invert = cls === 'shrimp' || cls === 'shell' || cls === 'applesnail' || cls === 'herp';
  const f = cls === 'grazer' ? 0.75 : invert ? MET_CLASS[cls] / 0.6 : 1;
  return (BASE * w ** 0.75 + TAN_PER_FEED * (FEED_PCT[feeding] / 100) * w) * tempFactor(tempC) * f * (salt && sp.salt ? 1.5 : 1);
}

/** g TAN per litre of media per day at 25 C by filter kind (low confidence; foam set to 0.15 like the other cartridge media, the validation note called 0.4 optimistic). */
const MEDIA_RATE = { hob: 0.15, canister: 0.1, internal: 0.15, sponge: 0.15, sump: 0.1 } as const;
/** Share of the rated flow that really passes the media (hang-on-back water spills round the cartridge). */
const THROUGH = { hob: 0.6, canister: 0.9, internal: 0.8, sponge: 0.9, sump: 0.9 } as const;
/** Bacteria on glass, substrate and decor: a small floor (g TAN per litre of water per day), also what a filterless Walstad tank has. */
const SURFACE_RATE = 0.0004;
const HEADROOM = 0.7;
/** The most a filter bigger than the tank's baseline (the generic model of its kind fitted to the tank) adds to the capacity: +50 % (Nathan 2026-10-26). */
export const FILTER_BOOST_MAX = 0.5;
const warm = (c: number) => Math.min(1.5, 1.07 ** (c - 25));

export interface FilterCap { kind: string; mediaL: number; src: string; gDay: number; flowGate: number; label: string; /** g TAN a day of the tank's baseline filter of this kind (0: none or a sump, uncapped) */ baseG?: number }
/** What the bacteria in this tank's filter (option `opt`, else the chosen one) can nitrify, g TAN a day, at `tempC`. */
export function filterCapacity(S: TankSetup, litres: number, tempC: number, opt?: string): FilterCap {
  const t = techOf(S);
  // several filters (Nathan 2026-10-20): each one's bacteria added up, the surface counted once
  if (!opt && t.filters?.length) {
    const surface = litres * SURFACE_RATE * warm(tempC), each = t.filters.map(u => filterCapacity({ ...S, tech: singleFilter(t, u) }, litres, tempC));
    const top = each.reduce((a, c) => c.gDay > a.gDay ? c : a);
    const sum = surface + each.reduce((a, c) => a + c.gDay - surface, 0), base = top.baseG ?? 0; // several filters share the one +50 % over a single baseline filter (lane SR)
    return { kind: top.kind, mediaL: each.reduce((a, c) => a + c.mediaL, 0), src: top.src, gDay: base > 0 ? Math.min(sum, surface + base * (1 + FILTER_BOOST_MAX)) : sum, flowGate: top.flowGate, label: each.map(c => c.label).join(' + '), baseG: base };
  }
  const choice = opt ?? t.rows.filter ?? 'none', def = optionDef('filter', choice);
  const surface = litres * SURFACE_RATE * warm(tempC);
  if (choice === 'none' || !def) return { kind: 'none', mediaL: 0, src: 'none', gDay: surface, flowGate: 1, label: 'no filter' };
  const sump = choice === 'sump', kind = (sump ? 'sump' : def.kind ?? 'hob') as keyof typeof MEDIA_RATE;
  let mediaL: number, src = 'derived', gph = 0, label = def.label, baseG = 0;
  // a filter's own capacity: its media x the kind's rate, gated by the flow that reaches the media
  const capOf = (m: number, flow: number) => { const g = m * MEDIA_RATE[kind] * warm(tempC), gate = g > 0 && flow > 0 ? Math.min(1, flow * 3.785 * 24 / 1000 * THROUGH[kind] / (2 * g)) : 1; return { g, gate }; };
  const mediaOf = (f: ReturnType<typeof filterFor>) => {
    const row = FILTER_MEDIA_L[f.product?.id ?? f.model.id];
    return { row, mediaL: (row ? row[0] : kind === 'sponge' ? SPONGE_L_PER_GAL * f.model.galMax : (f.product?.gph ?? f.model.gph) * (MEDIA_L_PER_GPH as Record<string, number>)[kind]) * f.n };
  };
  if (sump) { mediaL = litres * 0.05; gph = litres / 3.785 * 5; label = 'sump'; }
  else {
    const f = filterFor(S, def.kind!, opt ? undefined : t.filterModel, opt ? undefined : t.filterProduct), m = mediaOf(f);
    gph = f.gph; label = `${f.n > 1 ? f.n + ' x ' : ''}${f.product ? f.product.model : f.model.label}`;
    mediaL = m.mediaL; src = m.row ? m.row[1] : 'estimated by kind';
    // lane SR (Nathan 2026-10-26, "sure"): a bigger or better filter than the tank's baseline (the generic model of this kind fitted to its size)
    // earns at most FILTER_BOOST_MAX extra capacity; it never changes space or floor
    const b = mediaOf(filterFor(S, def.kind!)), c0 = capOf(b.mediaL, filterFor(S, def.kind!).gph);
    baseG = c0.g * c0.gate;
  }
  const { g, gate: flowGate } = capOf(mediaL, gph);
  const gDay = baseG > 0 ? Math.min(surface + g * flowGate, surface + baseG * (1 + FILTER_BOOST_MAX)) : surface + g * flowGate;
  return { kind, mediaL, src, gDay, flowGate, label, baseG };
}

type PlantClass = 'slow' | 'medium' | 'fast' | 'float';
/** Root feeders: about half their nitrogen comes from the substrate, not the water. */
const ROOT_FEEDERS = new Set(['sword', 'ozelot', 'crypt', 'balansae', 'lotus', 'sagittaria', 'grass', 'hairgrass', 'carpet']);
const ROOT_WATER = 0.5;
/** Most of the day's TAN plants can take as ammonium; the filter always sees the rest. */
export const PLANT_SHARE_MAX = 0.6;
/** mg N per litre per week a water-column fertilizer adds (as nitrate), by ferts option. Root tabs feed the substrate. */
export const FERT_N: Record<string, number> = { none: 0, roottabs: 0, aio: 1.1, doser: 2.3, ei: 13.5 };
/** Plant variant -> growth class and fresh weight g (floaters: cover in m2); guesses at the item's default size. */
const PLANTS: Record<string, [PlantClass, number]> = {
  fern: ['slow', 40], anubias: ['slow', 25], crypt: ['slow', 25], buce: ['slow', 8], balansae: ['slow', 40], moss: ['slow', 15], lotus: ['slow', 40], sagittaria: ['slow', 20],
  sword: ['medium', 80], ozelot: ['medium', 60], grass: ['medium', 40], hairgrass: ['medium', 10], carpet: ['medium', 20], pothos: ['medium', 60], creeper: ['medium', 40],
  stem: ['fast', 40], stemred: ['fast', 40], rotala: ['fast', 40], ludwigia: ['fast', 40], hornwort: ['fast', 50], anacharis: ['fast', 50],
  redroot: ['float', 0.015], salvinia: ['float', 0.015], frogbit: ['float', 0.015], lettuce: ['float', 0.02],
};
/** Land plants (succulents, bromeliads, ferns, moss on the bank) do not stand in the water. Anything else not listed counts as a medium plant. */
const DRY_PLANTS = new Set(['echeveria', 'haworthia', 'jade', 'aloe', 'burrotail', 'barrel', 'sansevieria', 'agave', 'columnar', 'bromeliad', 'tropfern', 'fittonia', 'sphagnum']);
const DEFAULT_PLANT: [PlantClass, number] = ['medium', 30];
const RATE_100G = { slow: 0.001, medium: 0.003, fast: 0.006 } as const, FLOAT_M2 = 0.3, DIE_OFF_RETURN = 0.3, PATCH_FW = 30;
export const PATCH_PLANTS = 3;

/** A painted patch of live plants: brush `plant:<variant>` whose variant is not an artificial (silk / plastic) kind (lane P4 2026-10-20). */
export const isLivePlantPatch = (p: Patch) => p.brush.startsWith('plant:') && (LIBRARY[p.brush.slice(6)]?.kind ?? 'plant') === 'plant';

export interface PlantParts { /** g N a day the plants take from the water */ gN: number; /** of it, from root feeders (half their uptake) */ rootGN: number; count: number; rootCount: number; light: number; co2: number }
/** g N a day the plants can take (ammonium first), from the items and painted plant patches. */
export function plantUptake(S: TankSetup): PlantParts {
  let gN = 0, count = 0, rootGN = 0, rootCount = 0;
  const light = 0.7; // a lit tank's share of full uptake; LightSettings has no off state, so the 0.3 'light off' branch was dead (S207 review)
  const feed = feedOf(techOf(S)), co2 = feed === 'co2' ? 1.3 : feed === 'ferts' ? 1.1 : 1;
  for (const it of S.items) {
    if (it.kind !== 'plant' || DRY_PLANTS.has(it.variant)) continue;
    const p = PLANTS[it.variant] ?? DEFAULT_PLANT;
    count++;
    const g = p[0] === 'float' ? p[1] * FLOAT_M2 * light : (p[1] / 100) * RATE_100G[p[0]] * light * co2;
    if (ROOT_FEEDERS.has(it.variant)) { rootCount++; rootGN += g * ROOT_WATER; gN += g * ROOT_WATER; } else gN += g;
  }
  for (const p of S.patches ?? []) if (isLivePlantPatch(p)) { count += PATCH_PLANTS; gN += PATCH_PLANTS * (PATCH_FW / 100) * RATE_100G.medium * light * co2; }
  return { gN: gN * (1 - DIE_OFF_RETURN), rootGN: rootGN * (1 - DIE_OFF_RETURN), count, rootCount, light, co2 };
}

export interface Nitrogen {
  feeding: Feeding;
  /** g TAN a day the animals make */
  tan: number;
  filter: FilterCap;
  /** g TAN a day the filter can nitrify, and the safe share of it */
  filterG: number; safeG: number;
  plants: PlantParts;
  /** TAN the plants take first, TAN the bacteria handle, TAN neither handles (ammonia rises) */
  byPlants: number; byBacteria: number; unprocessed: number;
  /** ammonia safety, percent of the safe load (100 = at the headroom line) */
  ammoniaPercent: number;
  /** nitrate: mg N per litre per week left after plants, and the weekly water change that holds about 40 ppm nitrate (9 mg N/L);
   *  waterChangePct is the nitrate-only figure (with the tap water's nitrate), held to 100 for the schedule; waterChange has the state */
  nitrateMgNPerWeek: number; waterChangePct: number;
  waterChange: WaterChange;
  /** of the TAN the bacteria convert, g N a day the plants then take as nitrate */
  nitrateByPlants: number;
  /** ammonia safety with no plants: all the animals' TAN on the filter (a new tank before the plants grow in) */
  plantFreeAmmoniaPercent: number;
  /** water-column fertilizer: its option, g N a day it adds, what plants take of it, what ends as nitrate */
  fert: { option: string; gN: number; toPlants: number; toNitrate: number };
  /** g N a day the plants could still take after the animals' nitrogen and the fert (an N fert or more animals would feed it) */
  plantRoom: number;
  /** the animals alone supply what the plants take: a fert without nitrogen is enough */
  fishCoverPlants: boolean;
  /** share of the day's nitrogen that ends in plants (ammonium and nitrate), in water changes, unprocessed */
  split: { plants: number; waterChanges: number; unprocessed: number };
}

export const NITRATE_TARGET_N = 9;
/** ppm as NO3 -> mg N per litre */
export const NO3_TO_N = 14.007 / 62.004;
/** One water change past this share is high maintenance (Decision 2 state b); two of them a week is the most the schedule plans. */
export const ONE_CHANGE_MAX = 50, CHANGES_MAX = 2;
export type WaterChangeState = 'routine' | 'high' | 'failure';
export interface WaterChange {
  state: WaterChangeState;
  /** nitrate-only weekly share, uncapped (Infinity when tap nitrate is at or above the target) */
  uncappedPct: number;
  /** how the week's share is split: one change, or two smaller ones */
  changes: number; perChangePct: number;
  /** tap (source) nitrate, mg N/L, and why a failure is one */
  tapMgN: number; why?: 'tap' | 'too-much';
}
/** Decision 2's three states from the weekly nitrate rise (mg N/L) and the tap water's nitrate (mg N/L). */
export function waterChangeState(risePerWeek: number, tapMgN = 0): WaterChange {
  const head = NITRATE_TARGET_N - tapMgN;
  if (head <= 0) return { state: 'failure', uncappedPct: Infinity, changes: 0, perChangePct: 0, tapMgN, why: 'tap' };
  const pct = risePerWeek / head * 100;
  if (pct <= ONE_CHANGE_MAX) return { state: 'routine', uncappedPct: pct, changes: 1, perChangePct: pct, tapMgN };
  if (pct <= ONE_CHANGE_MAX * CHANGES_MAX) return { state: 'high', uncappedPct: pct, changes: CHANGES_MAX, perChangePct: pct / CHANGES_MAX, tapMgN };
  return { state: 'failure', uncappedPct: pct, changes: CHANGES_MAX, perChangePct: ONE_CHANGE_MAX, tapMgN, why: 'too-much' };
}
/** The tank's tap (source) water nitrate, mg N/L: the setting is ppm as NO3, default 0 (no reading entered). */
export const tapNitrateMgN = (S: TankSetup) => Math.max(0, S.water.tapNitrate ?? 0) * NO3_TO_N;
export function nitrogenBudget(S: TankSetup, litres: number, tempC: number, tan: number, opt?: string): Nitrogen {
  const filter = filterCapacity(S, litres, tempC, opt), plants = plantUptake(S), feeding = feedingOf(S);
  const byPlants = Math.min(tan * PLANT_SHARE_MAX, plants.gN), after = tan - byPlants, spare = plants.gN - byPlants;
  const safeG = filter.gDay * HEADROOM, byBacteria = Math.min(after, filter.gDay), unprocessed = Math.max(0, after - filter.gDay);
  const ammoniaPercent = safeG > 0 ? after / safeG * 100 : after > 0 ? Infinity : 0;
  // what the bacteria convert ends as nitrate; plants with capacity left take it before it counts
  const fromNitrate = Math.min(spare, byBacteria), room = spare - fromNitrate;
  const fOpt = S.water.salt ? 'none' : techOf(S).rows.ferts ?? 'none', fertG = (FERT_N[fOpt] ?? 0) * litres / 7 / 1000, fertToPlants = Math.min(room, fertG);
  // EI doses to excess on purpose and resets with its own big weekly change: its leftover is not counted toward the change asked of the animals
  const fishNitrate = byBacteria - fromNitrate, nitrateG = fishNitrate + (fOpt === 'ei' ? 0 : fertG - fertToPlants);
  const nitrateMgNPerWeek = litres > 0 ? nitrateG * 7 * 1000 / litres : 0;
  const waterChange = waterChangeState(nitrateMgNPerWeek, tapNitrateMgN(S));
  const waterChangePct = Math.min(100, waterChange.uncappedPct), total = tan || 1;
  const plantFreeAmmoniaPercent = safeG > 0 ? tan / safeG * 100 : tan > 0 ? Infinity : 0;
  return { feeding, tan, filter, filterG: filter.gDay, safeG, plants, byPlants, byBacteria, unprocessed, ammoniaPercent, nitrateMgNPerWeek, waterChangePct,
    waterChange, nitrateByPlants: fromNitrate, plantFreeAmmoniaPercent,
    fert: { option: fOpt, gN: fertG, toPlants: fertToPlants, toNitrate: fertG - fertToPlants }, plantRoom: room - fertToPlants,
    fishCoverPlants: plants.gN > 0 && byPlants + fromNitrate >= plants.gN - 1e-12,
    split: { plants: (byPlants + fromNitrate) / total, waterChanges: fishNitrate / total, unprocessed: unprocessed / total } };
}
