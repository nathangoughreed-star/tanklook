import dd from '../data/demand-defaults.json';
// Our own stocking engine (lane SE, 2026-10-19): the answer AqAdvisor gave ("stocking level 78%, over or under, why, what to
// change") from our own data, with its reasoning in the open. No network, nothing depends on AqAdvisor.
//   LOAD     = sum over animals of  mass^0.75 x metabolism x temperature factor   (standard metabolic scaling: a big fish counts for
//              more than a small one but for less per gram; load units LU).
//   Two limits, as AqAdvisor separates them (Nathan 2026-10-19):
//   SPACE        = sum of mass^0.45 / (litres x SPACE_PER_L): how full the tank itself is; no filter fixes it, only more water or fewer animals.
//                  Fitted to 24 AqAdvisor answers (research/aq-compare.md): its stocking level grows like mass^0.45 (about length^1.4), much
//                  slower than waste does, and metabolism does not show in it (typical scatter about +-40 %, species-specific in AqAdvisor).
//   FILTRATION   = waste load / (litres x LU_PER_L x filter (tech.ts stockCapacity) x live-plant factor): how hard the filter works.
//                  Lane HB (2026-10-21, research/habitat-model.md): Space is the larger of that WATER limit and a FLOOR limit, the floor
//                  area the bottom dwellers use (FLOOR_SQIN_PER_IN of floor per inch of mass-equivalent length) over the tank's floor, so a
//                  taller tank on the same floor gives bottom dwellers no more room. The water limit keeps its AqAdvisor fit.
//   percent      = the larger of the two (over 100 = overstocked). Compatibility (waterchem, animalfit, group minimums) stays separate.
//   2026-10-22 (Nathan, after the kuhli sanity check, research/habitat-model.md): the school discount in SPACE is one curve over all the
//              fish in the water (AqAdvisor is concave in the whole tank's load, not per species), and a species that piles into shared
//              caves (kuhli) uses FLOOR_FACTOR of its floor footprint.
// Mass is FishBase length-weight at the animal's length (data/bodymass.json; shrimp, snails and herps are keeper-reference
// estimates, marked 'estimate'). The 3D bodies' volume is only the cross-check that flags outliers (scripts/body-mass.mjs).
import bm from '../data/bodymass.json';
import { getSpecies, type Species } from '../data/species';
import { FLOOR_FACTOR, SPACE_FACTOR, SPACE_FACTOR_CLASS, SPACE_NUDGE } from '../data/spacefactor';
import { bioloadLitres } from './starter';
import { feedingOf, isLivePlantPatch, nitrogenBudget, tanOf, type Nitrogen } from './nitrogen';
import { heatLoss, rowsFor, setWaterChangeFraction, stockCapacity, sumpLitres } from './tech';
import { floorOf } from './tankMin';
import { zoneOf, type Zone } from './zone';
import type { Fish, TankSetup } from './types';

interface Mass { a: number; b: number; src: string; model?: number; flag?: boolean }
const MASS = bm.species as unknown as Record<string, Mass>;

/** Grams of one animal of species `id` at total length `tlMm` (the species' adult length when omitted); 0 if unknown. */
export function massG(id: string, tlMm?: number): number {
  const m = MASS[id], sp = getSpecies(id);
  const L = tlMm ?? sp?.tl;
  return m && L ? m.a * (L / 10) ** m.b : 0;
}

/**
 * Relative food eaten and waste made per unit of metabolic mass, as a few classes (not one number per species). Sources:
 * activity and diet classes after the usual bioload rules of thumb (goldfish and big predatory cichlids are the messy ones;
 * schooling swimmers, rainbowfish and tangs run hot; sit-and-wait and algae-grazing species and cold-blooded herps run low).
 */
export const MET_CLASS = { messy: 1.5, active: 1.2, normal: 1, sedentary: 0.7, grazer: 0.6, shrimp: 0.5, shell: 0.3, applesnail: 0.6, herp: 0.4 } as const;
export type MetClass = keyof typeof MET_CLASS;
const MET_BY_ID: Record<string, MetClass> = {
  goldfish: 'messy', comet: 'messy', oscar: 'messy', clownloach: 'active',
  danio: 'active', cpd: 'active', tigerbarb: 'active', hatchet: 'active', boesemani: 'active', labeo: 'active', auratus: 'active', demasoni: 'active',
  yellowtang: 'active', bluetang: 'active', chromis: 'active', sae: 'active', swordtail: 'active',
  bronzecory: 'sedentary', sterbai: 'sedentary', pandacory: 'sedentary', pygmycory: 'sedentary', betta: 'sedentary', bristlenose: 'grazer', oto: 'grazer', hillstream: 'grazer', mandarin: 'sedentary', banggai: 'sedentary', royalgramma: 'sedentary',
  watchman: 'sedentary', discus: 'sedentary', gbr: 'sedentary', angel: 'sedentary', kuhli: 'sedentary', peapuffer: 'sedentary', firefish: 'sedentary',
  axolotl: 'herp', firenewt: 'herp', adf: 'herp', firetoad: 'herp',
  hermit: 'shell',
  // lane SN (2026-10-22): apple snails eat and foul like small fish ("waste equivalent to several small fish", furrycritter; "excrete a lot of
  // waste", petfishonline), so they waste like a fish of their mass; the small snails keep the shell class ("minimal waste", furrycritter)
  mystery: 'applesnail',
};
/** Class of a species: by id, else by category (shrimp, snails), else normal. */
export function metClass(sp: Species): MetClass {
  return MET_BY_ID[sp.id] ?? (sp.kind === 'snail' ? 'shell' : sp.cat.endsWith('invert') ? 'shrimp' : 'normal');
}

/** Waste doubles about every 10 K (Q10 = 2); 25 C is the reference. */
const Q10 = 2, T_REF = 25;
export const tempFactor = (c: number) => Q10 ** ((Math.min(32, Math.max(4, c)) - T_REF) / 10);
/** Marine fish eat more per gram and are less forgiving of nitrate (the old rule of thumb: half again). */
const SALT_LOAD = 1.5;
/** Load units one litre clears at filtration 1 (calibrated in step 3 of lane SE: with it the starters keep about their old animal counts (research/stocking-calibration.md)). */
export const LU_PER_L = 0.3;
/** Space: how a body counts against the tank's water, mass^SPACE_EXP, and the g^SPACE_EXP one litre holds at 100 % (fit 2026-10-20 to
 *  24 AqAdvisor combinations, scripts/aq-compare.mjs; with it the median of ours / AqAdvisor is 1.0). */
/** Animals that live in the water load it; land animals (geckos, anoles, snakes, spiders, tree frogs) do not. */
export function countsAgainstWater(sp: Species) { return sp.habitat !== 'land'; }
export const SPACE_EXP = 0.45, SPACE_PER_L = 1.564 * 0.9374 / 3.96; // per effective litre (floor area x credited height, lane HC); 1/3.96 was per raw litre (4.242 before the per-species factors, /1.07 re-centred the 24 AqAdvisor combinations); x1.564 held the 37 published lists at their median 74 % at the published max; x0.9374 re-centred 2026-10-22 when the school discount became tank-wide (median 71.1 -> 74.2 % again)
/** Fitted-to-AqAdvisor multiplier on a species' space load (data/spacefactor.ts): its own row, else its class (tiny / mid / big fish, invert, amphibian). */
/** Published stockings (research/expert-stockings.md, 2026-10-21; Nathan: trust the experts over AqAdvisor) read nano schools 100-145 %:
 *  animals under 2 g count TINY_EXPERT of their AqAdvisor-fitted space. */
export const TINY_EXPERT = 0.8;
export function spaceFactor(sp: Species): number {
  const g = massG(sp.id, sp.tl);
  return spaceFactorAq(sp, g) * (g < 2 ? TINY_EXPERT : 1) * (SPACE_NUDGE[sp.id]?.[0] ?? 1);
}
function spaceFactorAq(sp: Species, g: number): number {
  const own = SPACE_FACTOR[sp.id];
  if (own) return own[0];
  if (sp.salt) return 1;
  const k = sp.cat === 'fw-invert' ? 'invert' : sp.cat === 'amphibian' ? 'amphibian' : sp.cat === 'fw-fish' ? (g < 2 ? 'tiny' : g < 30 ? 'mid' : 'big') : '';
  return SPACE_FACTOR_CLASS[k]?.[0] ?? 1;
}
// Snails crawl on the glass and substrate and take no swimming room (2026-10-21: the AqAdvisor fit read 10 trumpet snails as 109 % of a
// 5 gal); their waste counts in filtration and their footprint on the floor (snailFloorCm2, lane SN).
export const spaceOf = (sp: Species, tlMm: number) => sp.kind === 'snail' ? 0 : massG(sp.id, tlMm) ** SPACE_EXP * spaceFactor(sp);
/** Water space is not linear in count (Nathan 2026-10-21): above SCHOOL_REF fish in the water, n fish take
 *  SCHOOL_REF x (n / SCHOOL_REF)^SCHOOL_EXP fish's worth of room, so later fish add less; up to SCHOOL_REF each fish counts in full
 *  (only AqAdvisor reads lone fish higher; the experts' single-fish rules, e.g. one fancy goldfish per 20 gal, do not). Waste
 *  (filtration) and floor stay linear.
 *  2026-10-22 (Nathan's decision after the kuhli sanity check): ONE curve over every fish in the water, not one per species. Six
 *  AqAdvisor answers for the same 36 x 18 x 18 in tank (17 kuhli 49 %, 15 danio 41 %, 8 + 8 45 %, 17 + 1 50 %, 1 + 15 43 %, but
 *  17 + 15 74 %, not 90 %) fit one curve, stocking ~ (weighted fish)^0.72 across species; the per-species rule (exp 0.85, fitted
 *  2026-10-21 on the published lists and 24 AqAdvisor mixes) added the two schools linearly and read that tank 104 %. SPACE_PER_L
 *  was re-centred with it so the 37 published lists keep their median 74 % at the published max (research/habitat-model.md). */
export const SCHOOL_EXP = 0.72, SCHOOL_REF = 10;
export const schoolScale = (n: number) => n > SCHOOL_REF ? (n / SCHOOL_REF) ** (SCHOOL_EXP - 1) : 1;
/** The k-th animal's share of the curve (1-based): 1 up to SCHOOL_REF, then what the k-th adds to SCHOOL_REF x (k / SCHOOL_REF)^SCHOOL_EXP.
 *  2026-10-22 (the caveat in research/habitat-model.md, shown wrong): the animals are ranked by their own space, biggest first, so a
 *  big fish keeps its full count and the small ones take the tail. One flat factor schoolScale(n) on every animal made adding an animal
 *  LOWER the reading (6 angels in a 55 gal 79 % -> 65 % with 30 cherry shrimp; 10 angels 131 % -> 120 % with 10 embers); ranked, each
 *  added animal adds at least its own tail share. A single species reads exactly as before (the shares of n sum to n x schoolScale(n)). */
export const schoolShare = (k: number) => k <= SCHOOL_REF ? 1 : SCHOOL_REF * ((k / SCHOOL_REF) ** SCHOOL_EXP - ((k - 1) / SCHOOL_REF) ** SCHOOL_EXP);
/**
 * Floor (lane HB, research/habitat-model.md, Nathan's yes 2026-10-21): a bottom dweller uses FLOOR_SQIN_PER_IN sq in of floor per inch
 * of its length. Sources give 12-24 sq in per inch (Scotcat "six to eight inches of fish to every square foot of base area"; Seriously
 * Fish's footprints for a group of bronze cory ~20, kuhli ~12, clown loach 10-17); 15 is the smallest value that reads a shallow-wide tank
 * roomier than a tall one of equal water, and leaves the AqAdvisor median at 1.03. The length is mass-equivalent: the length of a
 * bronze cory of the same mass (an eel-shaped kuhli is long but light; by its total length 6 kuhlis would overfill Seriously Fish's own
 * minimum tank for them). "All"-zone fish use the floor half the time (est); midwater and top fish none. Snails count their footprint (snailFloorCm2, lane SN);
 * other aquatic invertebrates (shrimp, crabs) take the fish rule times INVERT_FLOOR (Nathan 2026-10-22); land animals count 0. A species in FLOOR_FACTOR (data/spacefactor.ts) spreads over that
 * share of its footprint (kuhli 0.6: piles into shared caves; est, Nathan 2026-10-22); the floor stays linear in count (audit F).
 */
export const FLOOR_SQIN_PER_IN = 15;
/**
 * Height (lane HC, Nathan's decision 2026-10-21): the water limit counts floor area linearly and height with diminishing returns. A
 * swimmer's room is floor area x credited height, Hs x (1 - exp(-H / Hs)) for water height H (with Hs 12 in: 6/12/18/24/30 in credit
 * 4.7/7.6/9.3/10.4/11.0 in). Hs is per species (Nathan: "an oscar going from 12 to 18 inches is a lot more helpful than a school of
 * danios"): HS_K x body depth (card height, fins included), never under HS_MIN_CM (12 in), times a class multiplier: low (HS_LOW) for
 * fast horizontal schoolers and surface fish, high (HS_HIGH) for tall-bodied fish, gouramis and big cichlids. Middle and top
 * fish use the curve in full; bottom dwellers are credited the curve at BOTTOM_REF_CM whatever the depth (height does not help them); "all"-zone fish use
 * half curve, half raw height (ALL_CURVE). Constants chosen on the 37 published lists (research/height-curve.md): the experts do not
 * separate the classes (sdlog of percent at the published max 0.474 vs 0.463 for raw litres), so the classes are Nathan's call, not a fit.
 * In a mixed tank each species is divided by its own effective room. SPACE_PER_L carries the re-fit.
 */
export const HS_MIN_CM = 30.5, HS_K = 8, HS_LOW = 0.7, HS_HIGH = 1.5, ALL_CURVE = 0.5;
/** Bottom dwellers (Nathan 2026-10-22, after 10 kuhlis read 146 % in a 30 x 12 x 6 in tank and 54 % in a 30 x 12 x 50 in): they do not use
 *  the height, so their water room is floor area x the credited height at BOTTOM_REF_CM of water, whatever the tank's depth; their reading
 *  depends on the floor only. 35 cm (about 14 in of water) is the depth at which every calibration test still passes (33 and 37 each fail one). */
export const BOTTOM_REF_CM = 35;
/** Class by id (lane HC, Nathan 2026-10-21: "an oscar going from 12 to 18 inches is a lot more helpful than a school of danios"):
 *  fast horizontal schoolers and surface fish use little of the height (low); tall-bodied fish, hoverers and big cichlids use more (high). */
const HS_LOW_IDS = new Set(['danio', 'whitecloud', 'cpd', 'harlequin', 'chili', 'tigerbarb', 'cherrybarb', 'sae']);
const HS_HIGH_IDS = new Set(['gourami', 'dwarfgourami', 'honeygourami', 'livingstonii', 'kadango']);
export function heightClass(sp: Species): 'low' | 'mid' | 'high' {
  return HS_HIGH_IDS.has(sp.id) || sp.aspect >= 0.9 ? 'high' : HS_LOW_IDS.has(sp.id) || zoneOf(sp) === 'top' ? 'low' : 'mid';
}
/** The height scale Hs of one species, cm: its body depth (card height, fins included) x HS_K, never under HS_MIN_CM, x its class. */
export const hsCm = (sp: Species) => { const c = heightClass(sp); return Math.max(HS_MIN_CM, HS_K * sp.tl * sp.aspect / 10) * (c === 'low' ? HS_LOW : c === 'high' ? HS_HIGH : 1); };
/** What one litre of this animal's water counts for in the water limit: raw height over credited height (1 at no height, grows with a tall tank). */
export function heightMul(sp: Species, meanDepthCm: number): number {
  if (!(meanDepthCm > 0)) return 1;
  const hs = hsCm(sp);
  if (zoneOf(sp) === 'bottom') return meanDepthCm / (hs * (1 - Math.exp(-BOTTOM_REF_CM / hs)));
  const r = hs * (1 - Math.exp(-meanDepthCm / hs)) / meanDepthCm;
  const w = zoneOf(sp) === 'all' ? ALL_CURVE : 1;
  return 1 / (w * r + (1 - w));
}
export const FLOOR_SHARE: Record<Zone, number> = { bottom: 1, all: 0.5, middle: 0, top: 0 };
const FLOOR_REF = { id: 'bronzecory', tlMm: 65 }, SQIN_CM2 = 6.4516, IN_MM = 25.4;
const isInvert = (sp: Species) => sp.kind === 'snail' || sp.cat.endsWith('invert');
/** The length of a bronze cory with this animal's mass, mm (the floor model's body length). */
export const habitatLengthMm = (sp: Species, tlMm: number) => FLOOR_REF.tlMm * (massG(sp.id, tlMm) / massG(FLOOR_REF.id, FLOOR_REF.tlMm)) ** (1 / 3);
/**
 * Snails on the floor (lane SN, Nathan 2026-10-22: "realistically they dont need much space, I feel like most fish probably treat them as
 * hardscape ... they should take up SOME space, relative to their adult size"): a snail's footprint, SNAIL_FOOT_K x mass^(2/3) cm2 (its
 * shell's ground plan: 19 cm2 for a 51 mm mystery snail, 1.3 cm2 for a 19 mm trumpet snail), times SNAIL_ROOM footprints of floor each.
 * Area by mass^(2/3), not by length like a fish, so small snails stay nearly free (S187) and a big one counts. They use the glass too,
 * which the room factor absorbs. Water space stays 0 (spaceOf).
 */
export const SNAIL_FOOT_K = 3.2, SNAIL_ROOM = 3;
export const snailFloorCm2 = (sp: Species, tlMm: number) => SNAIL_FOOT_K * massG(sp.id, tlMm) ** (2 / 3) * SNAIL_ROOM;
/**
 * Shrimp and crabs on the floor (Nathan 2026-10-22: "apply similar ground/floor rules to inverts as we do for things like kuhlis"): the
 * fish rule (mass-equivalent length x FLOOR_SQIN_PER_IN x their zone's FLOOR_SHARE, 0.5 for the "all"-zone shrimp and crabs) times
 * INVERT_FLOOR. 0.3 makes 10 cherry shrimp per gallon a full floor (100 in a 20 x 10 in base: 13.3 sq in each before share and factor),
 * the top of the usual 5-10 per gallon keeper guidance (est); 12 cherries take 24 sq in. Big shrimp and crabs count more through their
 * mass; FLOOR_FACTOR overrides per species.
 */
export const INVERT_FLOOR = 0.3;
/** Floor area one animal uses, cm2 (0 for swimmers and land animals; snails by footprint, lane SN; shrimp and crabs at INVERT_FLOOR). */
export const floorUseCm2 = (sp: Species, tlMm: number) => !countsAgainstWater(sp) ? 0 : sp.kind === 'snail' ? snailFloorCm2(sp, tlMm)
  : FLOOR_SHARE[zoneOf(sp)] * FLOOR_SQIN_PER_IN * SQIN_CM2 * habitatLengthMm(sp, tlMm) / IN_MM * (FLOOR_FACTOR[sp.id]?.[0] ?? (isInvert(sp) ? INVERT_FLOOR : 1));
/** Live plants take up nitrogen: up to +25 % at 15 plants per 100 L (a painted patch counts as 3 plants). A documented guess. */
const PLANT_MAX = 0.25, PLANTS_PER_100L_FULL = 15, PATCH_PLANTS = 3;


export interface Contributor { id: string; name: string; n: number; load: number; space: number; /** floor area used, cm2 (lane HB) */ floor: number; share: number; grams: number; cls: MetClass; /** fitted space multiplier, counted as e.g. "1.4x" in the breakdown */ spaceFactor: number }
export interface CapacityParts { /** load units the tank's water holds, filter aside */ space: number; litres: number; perL: number; filter: number; plants: number; plantCount: number; tempC: number; capacity: number }
export interface Stocking {
  /** the nitrogen budget behind filtrationPercent (lane SE2): waste, filter bacteria, plants, nitrate */
  nitrogen: Nitrogen;
  /** the larger of space and filtration, percent; over 100 = overstocked. 0 with no animals. */
  percent: number;
  /** the larger of waterPercent and floorPercent: how full the tank itself is (the filter does not change it) */
  spacePercent: number;
  /** space load / what the tank's water holds, percent (the AqAdvisor-fitted per-litre number) */
  waterPercent: number;
  /** floor the bottom dwellers use / the tank's floor area, percent (lane HB) */
  floorPercent: number;
  /** which of the two binds Space */
  spaceBy: 'water' | 'floor';
  /** the tank's floor area and what the animals use of it, cm2 */
  floor: { areaCm2: number; usedCm2: number };
  /** load / what the chosen filtration (and plants) clear, percent */
  filtrationPercent: number;
  load: number;
  contributors: Contributor[];
  capacity: CapacityParts;
  /** plain-words reasons: the biggest contributors, what to change */
  reasons: string[];
  /** the smallest filtration option that reaches 100 %, when the filter is what is short */
  fixFilter?: { option: string; percent: number };
}

/** Load units of one animal at its own length in water at `tempC`. */
export function loadOf(f: Pick<Fish, 'species' | 'tl'>, tempC = T_REF, salt = false): number {
  const sp = getSpecies(f.species);
  return !sp || !countsAgainstWater(sp) ? 0 : animalLoad(sp, f.tl ?? sp.tl, tempC, salt);
}
/** The load of an animal of this species at length `tlMm`, wherever it lives (the starters size land animals by it too). */
export function animalLoad(sp: Species, tlMm: number, tempC = T_REF, salt = false): number {
  return massG(sp.id, tlMm) ** 0.75 * MET_CLASS[metClass(sp)] * tempFactor(tempC) * (salt && sp.salt ? SALT_LOAD : 1);
}
/** Litres of water one adult of this species takes up (its load over what a litre clears): the starters' budget unit. */
export const litresPerAnimal = (sp: Species, depthCm = 0) => Math.max(animalLoad(sp, sp.tl, T_REF, !!sp.salt) / LU_PER_L,
  // SE2 (2026-10-20): the starters also respect the space limit, so Full reads about 90 % by the space number (animals in the water only)
  countsAgainstWater(sp) ? spaceOf(sp, sp.tl) * heightMul(sp, depthCm) / SPACE_PER_L : 0); // depthCm: the tank's mean water depth (lane HC), 0 = no height effect // starters draw animals at adult length (a few % either way): budgeted at adult so what is drawn matches (2026-10-21)
/** Floor area one adult takes, cm2, sized like litresPerAnimal (at adult length): the starters' floor budget unit (lane HB). */
export const floorPerAnimal = (sp: Species) => floorUseCm2(sp, sp.tl);

export function capacityOf(S: TankSetup): CapacityParts {
  const litres = bioloadLitres(S), tempC = S.water.on ? heatLoss(S).targetC : T_REF;
  const filter = S.water.on ? stockCapacity(S) : 1;
  const plantCount = S.items.filter(i => i.kind === 'plant').length + (S.patches ?? []).filter(isLivePlantPatch).length * PATCH_PLANTS;
  const plants = 1 + PLANT_MAX * Math.min(1, plantCount / Math.max(litres / 100, 0.1) / PLANTS_PER_100L_FULL);
  return { litres, perL: LU_PER_L, filter, plants, plantCount, tempC, capacity: litres * LU_PER_L * filter * plants, space: litres * SPACE_PER_L };
}

/** "8 Kuhli loaches": a name ending in fish or s is its own plural (goldfish, Discus, corydoras); ch / sh / x / z take "es"; the rest "s". */
export const plural = (n: number, name: string) => n === 1 ? `1 ${name}` : `${n} ${name}${/(fish|s)$/i.test(name) ? '' : /(ch|sh|x|z)$/i.test(name) ? 'es' : 's'}`;

export function stockingOf(S: TankSetup): Stocking {
  const cap = capacityOf(S), salt = !!(S.water.on && S.water.salt), by = new Map<string, Contributor>(), feeding = feedingOf(S);
  let load = 0, spaceLoad = 0, floorUse = 0;
  const each: { c: Contributor; s: number }[] = [];
  const meanDepthCm = cap.litres * 1000 / Math.max(1e-9, floorOf(S.tank).areaCm2);
  for (const f of S.fish) {
    const sp = getSpecies(f.species), l = !sp || !countsAgainstWater(sp) ? 0 : tanOf(sp, massG(sp.id, f.tl ?? sp.tl), feeding, cap.tempC, salt);
    if (!sp || l <= 0) continue;
    load += l;
    const c = by.get(sp.id) ?? { id: sp.id, name: sp.name, n: 0, load: 0, space: 0, share: 0, grams: 0, cls: metClass(sp), floor: 0, spaceFactor: spaceFactor(sp) };
    const fl = floorUseCm2(sp, f.tl ?? sp.tl);
    const s = spaceOf(sp, f.tl ?? sp.tl) * heightMul(sp, meanDepthCm);
    if (s > 0) each.push({ c, s });
    c.n++; c.load += l; c.floor += fl; floorUse += fl; c.grams += massG(sp.id, f.tl ?? sp.tl); by.set(sp.id, c);
  }
  // one school curve over every animal that takes room in the water (2026-10-22), shares by rank, biggest first (schoolShare); snails take none
  each.sort((a, b) => b.s - a.s).forEach((e, i) => { const v = e.s * schoolShare(i + 1); e.c.space += v; spaceLoad += v; });
  const pc = (l: number, cp: number) => cp > 0 ? l / cp * 100 : l > 0 ? Infinity : 0;
  const areaCm2 = floorOf(S.tank).areaCm2, waterPercent = pc(spaceLoad, cap.space), floorPercent = pc(floorUse, areaCm2);
  const spaceBy = floorPercent > waterPercent ? 'floor' as const : 'water' as const, spacePercent = Math.max(waterPercent, floorPercent);
  const nitrogen = nitrogenBudget(S, cap.litres + sumpLitres(S), cap.tempC, load), // lane SU: the sump's water dilutes the waste too (not the swimming room)
    filtrationPercent = nitrogen.ammoniaPercent, percent = Math.max(spacePercent, filtrationPercent);
  // shares are of the limit that binds
  const bySpace = spacePercent >= filtrationPercent;
  const contributors = [...by.values()].sort((a, b) => bySpace ? b.space - a.space : b.load - a.load);
  const spaceUse = (c: Contributor) => spaceBy === 'floor' ? c.floor : c.space, spaceSum = spaceBy === 'floor' ? floorUse : spaceLoad;
  if (bySpace) contributors.sort((a, b) => spaceUse(b) - spaceUse(a));
  for (const c of contributors) c.share = bySpace ? (spaceSum ? spaceUse(c) / spaceSum : 0) : (load ? c.load / load : 0);
  const reasons: string[] = [];
  let fixFilter: Stocking['fixFilter'];
  if (!contributors.length) reasons.push('No animals in the water.');
  else if (isOver(percent)) {
    const top = contributors[0];
    reasons.push(top.share >= 0.4 ? `Overstocked mainly because of the ${plural(top.n, top.name)} (${Math.round(top.share * 100)}% of the load).`
      : `Overstocked: ${contributors.slice(0, 3).map(c => `${plural(c.n, c.name)} ${Math.round(c.share * 100)}%`).join(', ')} of the load.`);
    if (isOver(spacePercent) && spaceBy === 'floor') reasons.push(`The floor is too small for the bottom dwellers (${Math.round(floorPercent)}% of it): no filter or extra height fixes that, it needs about ${Math.ceil(floorUse / SQIN_CM2)} sq in of floor (the tank has ${Math.round(areaCm2 / SQIN_CM2)}) or fewer bottom dwellers.`);
    else if (isOver(spacePercent)) reasons.push(`The tank itself is too small for them (${Math.round(spacePercent)}% of its space): no filter fixes that, it needs about ${Math.ceil(cap.litres * waterPercent / 100)} L of water or fewer animals.`);
    else {
      const fr = rowsFor(S).find(r => r.id === 'filter');
      for (const o of [...(fr?.options ?? [])].sort((a, b) => (a.capacity ?? 1) - (b.capacity ?? 1))) {
        const p = Math.max(nitrogenBudget(S, cap.litres + (o.id === 'sump' ? sumpLitres(S, true) : 0), cap.tempC, load, o.id).ammoniaPercent, spacePercent);
        if (!isOver(p)) { fixFilter = { option: o.id, percent: Math.round(p) }; reasons.push(`A ${o.label.toLowerCase()} would bring it to ${Math.round(p)}%.`); break; }
      }
      if (!fixFilter) reasons.push(`Even the best filter leaves ammonia high: it needs fewer animals, more plants, lighter feeding or a bigger tank.`);
    }
  } else if (Math.round(percent) >= IDEAL_MAX) reasons.push(spacePercent < filtrationPercent ? 'Past ideal, tread carefully: keep up with water changes and add nothing big.'
    // space binds (2026-10-22): water changes add no room, so name what does
    : spaceBy === 'floor' ? 'Past ideal by floor: water changes do not add floor; fewer bottom dwellers or a tank with a bigger base would.'
    : 'Past ideal by swimming room: water changes do not add room; fewer animals or a longer tank would.');
  else reasons.push(`Room for about ${Math.round(IDEAL_MAX - percent)}% more load before it is past ideal.`);
  return { nitrogen, percent, spacePercent, waterPercent, floorPercent, spaceBy, floor: { areaCm2, usedCm2: floorUse }, filtrationPercent, load, contributors, capacity: cap, reasons, ...(fixFilter ? { fixFilter } : {}) };
}

/** `stockingOf` remembered by what it reads (the UI asks every frame): animals and lengths, tank, water, tech, plants. */
const memo = new Map<string, Stocking>();
export function stockingMemo(S: TankSetup): Stocking {
  const key = JSON.stringify([S.fish.map(f => [f.species, f.tl]), S.tank, S.water.on, S.water.level, S.water.salt, S.water.tapNitrate, S.tech, S.lid,
    S.feeding, S.items.filter(i => i.kind === 'plant').map(i => i.variant).join(), (S.patches ?? []).filter(isLivePlantPatch).length]);
  let r = memo.get(key);
  if (!r) { r = stockingOf(S); if (memo.size > 16) memo.delete(memo.keys().next().value!); memo.set(key, r); }
  return r;
}

/** Share of the tank changed each week (lane MW 2026-10-21): the nitrogen budget's water change (what plants and the filter leave as nitrate),
 *  floored at the 10 % the hobby sources give and capped; with no animals, the floor. A dry tank changes none. */
export function waterChangeFraction(S: TankSetup): number {
  const w = dd.time.waterChangeFraction;
  if (!S.water.on) return w.terrarium;
  return S.fish.length ? Math.min(w.cap, Math.max(w.floor, stockingMemo(S).nitrogen.waterChangePct / 100)) : w.floor;
}

setWaterChangeFraction(waterChangeFraction);

/** Stocking bands (Nathan 2026-10-23): up to IDEAL_MAX is ideal (green), IDEAL_MAX to 100 is caution (amber: tread carefully),
 *  over 100 is likely to cause problems long term (red). Every bar and verdict reads these two lines. */
export const IDEAL_MAX = 75;

/** One line for the panel and the view label: "Stocking 78%", "Stocking 240%, overstocked". */
/** Over the limit as shown (2026-10-22): the rounded percent, so 100.3 % reads "100%" and not overstocked, and 100.6 % reads "101%, overstocked". */
export const isOver = (p: number) => Math.round(p) > 100;
export const stockingLine = (r: Stocking) => `Stocking ${r.percent === Infinity ? 'over 999' : Math.round(r.percent)}%${isOver(r.percent) ? ', overstocked' : ''}`;
/** The breakdown for a tooltip or list: every contributor with its count, mass and share of the load. */
export const stockingDetail = (r: Stocking) => [`Space ${Math.round(r.spacePercent)}% of the tank's water, filtration ${Math.round(r.filtrationPercent)}% of what the filter clears`].concat(r.contributors.map(c => `${c.n} ${c.name}: ${Math.round(c.share * 100)}% of the load (${c.grams >= 10 ? Math.round(c.grams / c.n) : (c.grams / c.n).toFixed(1)} g each${Math.abs(c.spaceFactor - 1) >= 0.15 ? `, counted ${c.spaceFactor.toFixed(1)}x for space` : ''})`));
