// Nitrogen budget of a tank (lane SE2, 2026-10-20), from the research notes (side-session-notes research-*.md). Grams of nitrogen a day.
//   PRODUCED  per animal: fasted base 0.00035 x W^0.75 g TAN/day (about 350 x W^-0.25 mg/kg/day, 25 C, +-40 %) plus about 0.02 g TAN per g
//             of feed, feed = feeding level x body weight (light 0.5, normal 1, heavy 2 % a day). Temperature 1.07 per degree. Shrimp, snails,
//             herps by class factor (guessed), bottom grazers 0.75 of the fit (loricariids measured 0.6-0.9).
//   FILTER    nitrifying bacteria: media litres x rate per litre x temperature; rates are low-confidence (ceramic 0.06 g TAN/L/day measured in a
//             fish farm, foam untested). Flow only gates it (oxygen: at least 2 m3 a day through the media per g TAN a day).
//   PLANTS    take ammonium first, nitrate once it is gone: fresh weight x rate per 100 g (slow 0.001, medium 0.003, fast 0.006 g N/day,
//             extrapolated from one measured Egeria study), times light and CO2, less 30 % returned by die-off; floaters 0.3 g N/m2/day.
// Two verdicts: AMMONIA SAFETY = (TAN the plants do not take) / 70 % of the filter's capacity (30 % headroom); NITRATE BURDEN = what no
// plant takes, as the water change per week that holds nitrate at about 40 ppm.
import { FILTER_MEDIA_L, MEDIA_L_PER_GPH, SPONGE_L_PER_GAL } from '../data/filtermedia';
import type { Species } from '../data/species';
import { LIBRARY } from './items';
import type { Patch, TankSetup } from './types';
import { feedOf, filterFor, optionDef, techOf } from './tech';
import { MET_CLASS, metClass, tempFactor } from './stocking';

export type Feeding = 'light' | 'normal' | 'heavy';
export const FEED_PCT: Record<Feeding, number> = { light: 0.5, normal: 1, heavy: 2 };
export const feedingOf = (S: TankSetup): Feeding => S.feeding ?? 'normal';

const BASE = 0.00035, TAN_PER_FEED = 0.02;
/** g TAN a day from one animal of mass `w` g at `tempC`: fasted base plus the feed. */
export function tanOf(sp: Species, w: number, feeding: Feeding, tempC: number, salt: boolean): number {
  const cls = metClass(sp), invert = cls === 'shrimp' || cls === 'shell' || cls === 'herp';
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
const warm = (c: number) => Math.min(1.5, 1.07 ** (c - 25));

export interface FilterCap { kind: string; mediaL: number; src: string; gDay: number; flowGate: number; label: string }
/** What the bacteria in this tank's filter (option `opt`, else the chosen one) can nitrify, g TAN a day, at `tempC`. */
export function filterCapacity(S: TankSetup, litres: number, tempC: number, opt?: string): FilterCap {
  const t = techOf(S), choice = opt ?? t.rows.filter ?? 'none', def = optionDef('filter', choice);
  const surface = litres * SURFACE_RATE * warm(tempC);
  if (choice === 'none' || !def) return { kind: 'none', mediaL: 0, src: 'none', gDay: surface, flowGate: 1, label: 'no filter' };
  const sump = choice === 'sump', kind = (sump ? 'sump' : def.kind ?? 'hob') as keyof typeof MEDIA_RATE;
  let mediaL: number, src = 'derived', gph = 0, label = def.label;
  if (sump) { mediaL = litres * 0.05; gph = litres / 3.785 * 5; label = 'sump'; }
  else {
    const f = filterFor(S, def.kind!, opt ? undefined : t.filterModel, opt ? undefined : t.filterProduct);
    const id = f.product?.id ?? f.model.id, row = FILTER_MEDIA_L[id];
    gph = f.gph; label = `${f.n > 1 ? f.n + ' x ' : ''}${f.product ? f.product.model : f.model.label}`;
    const per = row ? row[0] : kind === 'sponge' ? SPONGE_L_PER_GAL * f.model.galMax : (f.product?.gph ?? f.model.gph) * (MEDIA_L_PER_GPH as Record<string, number>)[kind];
    mediaL = per * f.n; src = row ? row[1] : 'estimated by kind';
  }
  const g = mediaL * MEDIA_RATE[kind] * warm(tempC);
  const flowM3 = gph * 3.785 * 24 / 1000 * THROUGH[kind], flowGate = g > 0 && gph > 0 ? Math.min(1, flowM3 / (2 * g)) : 1;
  return { kind, mediaL, src, gDay: surface + g * flowGate, flowGate, label };
}

type PlantClass = 'slow' | 'medium' | 'fast' | 'float';
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
const RATE_100G = { slow: 0.001, medium: 0.003, fast: 0.006 } as const, FLOAT_M2 = 0.3, DIE_OFF_RETURN = 0.3, PATCH_FW = 30, PATCH_PLANTS = 3;

/** A painted patch of live plants: brush `plant:<variant>` whose variant is not an artificial (silk / plastic) kind (lane P4 2026-10-20). */
export const isLivePlantPatch = (p: Patch) => p.brush.startsWith('plant:') && (LIBRARY[p.brush.slice(6)]?.kind ?? 'plant') === 'plant';

export interface PlantParts { gN: number; count: number; light: number; co2: number }
/** g N a day the plants can take (ammonium first), from the items and painted plant patches. */
export function plantUptake(S: TankSetup): PlantParts {
  let gN = 0, count = 0;
  const light = S.light && (S.light as { on?: boolean }).on === false ? 0.3 : 0.7;
  const feed = feedOf(techOf(S)), co2 = feed === 'co2' ? 1.3 : feed === 'ferts' ? 1.1 : 1;
  for (const it of S.items) {
    if (it.kind !== 'plant' || DRY_PLANTS.has(it.variant)) continue;
    const p = PLANTS[it.variant] ?? DEFAULT_PLANT;
    count++;
    gN += p[0] === 'float' ? p[1] * FLOAT_M2 * light : (p[1] / 100) * RATE_100G[p[0]] * light * co2;
  }
  for (const p of S.patches ?? []) if (isLivePlantPatch(p)) { count += PATCH_PLANTS; gN += PATCH_PLANTS * (PATCH_FW / 100) * RATE_100G.medium * light * co2; }
  return { gN: gN * (1 - DIE_OFF_RETURN), count, light, co2 };
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
  /** nitrate: mg N per litre per week left after plants, and the weekly water change that holds about 40 ppm nitrate (9 mg N/L) */
  nitrateMgNPerWeek: number; waterChangePct: number;
  /** share of the day's nitrogen that ends in plants (ammonium and nitrate), in water changes, unprocessed */
  split: { plants: number; waterChanges: number; unprocessed: number };
}

const NITRATE_TARGET_N = 9;
export function nitrogenBudget(S: TankSetup, litres: number, tempC: number, tan: number, opt?: string): Nitrogen {
  const filter = filterCapacity(S, litres, tempC, opt), plants = plantUptake(S), feeding = feedingOf(S);
  const byPlants = Math.min(tan, plants.gN), after = tan - byPlants, spare = plants.gN - byPlants;
  const safeG = filter.gDay * HEADROOM, byBacteria = Math.min(after, filter.gDay), unprocessed = Math.max(0, after - filter.gDay);
  const ammoniaPercent = safeG > 0 ? after / safeG * 100 : after > 0 ? Infinity : 0;
  // what the bacteria convert ends as nitrate; plants with capacity left take it before it counts
  const fromNitrate = Math.min(spare, byBacteria), nitrateG = byBacteria - fromNitrate;
  const nitrateMgNPerWeek = litres > 0 ? nitrateG * 7 * 1000 / litres : 0;
  const waterChangePct = Math.min(100, nitrateMgNPerWeek / NITRATE_TARGET_N * 100), total = tan || 1;
  return { feeding, tan, filter, filterG: filter.gDay, safeG, plants, byPlants, byBacteria, unprocessed, ammoniaPercent, nitrateMgNPerWeek, waterChangePct,
    split: { plants: (byPlants + fromNitrate) / total, waterChanges: nitrateG / total, unprocessed: unprocessed / total } };
}
