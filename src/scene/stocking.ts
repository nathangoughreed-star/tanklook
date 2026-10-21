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
//   percent      = the larger of the two (over 100 = overstocked). Compatibility (waterchem, animalfit, group minimums) stays separate.
// Mass is FishBase length-weight at the animal's length (data/bodymass.json; shrimp, snails and herps are keeper-reference
// estimates, marked 'estimate'). The 3D bodies' volume is only the cross-check that flags outliers (scripts/body-mass.mjs).
import bm from '../data/bodymass.json';
import { getSpecies, type Species } from '../data/species';
import { SPACE_FACTOR, SPACE_FACTOR_CLASS } from '../data/spacefactor';
import { bioloadLitres } from './starter';
import { feedingOf, isLivePlantPatch, nitrogenBudget, tanOf, type Nitrogen } from './nitrogen';
import { heatLoss, rowsFor, setWaterChangeFraction, stockCapacity } from './tech';
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
export const MET_CLASS = { messy: 1.5, active: 1.2, normal: 1, sedentary: 0.7, grazer: 0.6, shrimp: 0.5, shell: 0.3, herp: 0.4 } as const;
export type MetClass = keyof typeof MET_CLASS;
const MET_BY_ID: Record<string, MetClass> = {
  goldfish: 'messy', comet: 'messy', oscar: 'messy', clownloach: 'active',
  danio: 'active', cpd: 'active', tigerbarb: 'active', hatchet: 'active', boesemani: 'active', labeo: 'active', auratus: 'active', demasoni: 'active',
  yellowtang: 'active', bluetang: 'active', chromis: 'active', sae: 'active', swordtail: 'active',
  bronzecory: 'sedentary', pandacory: 'sedentary', pygmycory: 'sedentary', betta: 'sedentary', bristlenose: 'grazer', oto: 'grazer', hillstream: 'grazer', mandarin: 'sedentary', banggai: 'sedentary', royalgramma: 'sedentary',
  watchman: 'sedentary', discus: 'sedentary', gbr: 'sedentary', angel: 'sedentary', kuhli: 'sedentary', peapuffer: 'sedentary', firefish: 'sedentary',
  axolotl: 'herp', firenewt: 'herp', adf: 'herp', firetoad: 'herp',
  hermit: 'shell',
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
export const SPACE_EXP = 0.45, SPACE_PER_L = 1 / 3.96; // 4.242 before the per-species factors (data/spacefactor.ts); /1.07 re-centres the 24 mixed combinations (median ours / AqAdvisor 1.00)
/** Fitted-to-AqAdvisor multiplier on a species' space load (data/spacefactor.ts): its own row, else its class (tiny / mid / big fish, invert, amphibian). */
export function spaceFactor(sp: Species): number {
  const own = SPACE_FACTOR[sp.id];
  if (own) return own[0];
  if (sp.salt) return 1;
  const g = massG(sp.id, sp.tl), k = sp.cat === 'fw-invert' ? 'invert' : sp.cat === 'amphibian' ? 'amphibian' : sp.cat === 'fw-fish' ? (g < 2 ? 'tiny' : g < 30 ? 'mid' : 'big') : '';
  return SPACE_FACTOR_CLASS[k]?.[0] ?? 1;
}
// Snails crawl on the glass and substrate and take no swimming room (2026-10-21: the AqAdvisor fit read 10 trumpet snails as 109 % of a
// 5 gal); their waste still counts in filtration, which is what limits the big ones (mystery snails).
export const spaceOf = (sp: Species, tlMm: number) => sp.kind === 'snail' ? 0 : massG(sp.id, tlMm) ** SPACE_EXP * spaceFactor(sp);
/** Live plants take up nitrogen: up to +25 % at 15 plants per 100 L (a painted patch counts as 3 plants). A documented guess. */
const PLANT_MAX = 0.25, PLANTS_PER_100L_FULL = 15, PATCH_PLANTS = 3;

/** Animals that live in the water load it; land animals (geckos, anoles, snakes, spiders, tree frogs) do not. */
export const countsAgainstWater = (sp: Species) => sp.habitat !== 'land';

export interface Contributor { id: string; name: string; n: number; load: number; space: number; share: number; grams: number; cls: MetClass; /** fitted space multiplier, counted as e.g. "1.4x" in the breakdown */ spaceFactor: number }
export interface CapacityParts { /** load units the tank's water holds, filter aside */ space: number; litres: number; perL: number; filter: number; plants: number; plantCount: number; tempC: number; capacity: number }
export interface Stocking {
  /** the nitrogen budget behind filtrationPercent (lane SE2): waste, filter bacteria, plants, nitrate */
  nitrogen: Nitrogen;
  /** the larger of space and filtration, percent; over 100 = overstocked. 0 with no animals. */
  percent: number;
  /** load / what the tank's water holds, percent (the filter does not change it) */
  spacePercent: number;
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
export const litresPerAnimal = (sp: Species) => Math.max(animalLoad(sp, sp.tl, T_REF, !!sp.salt) / LU_PER_L,
  // SE2 (2026-10-20): the starters also respect the space limit, so Full reads about 90 % by the space number (animals in the water only)
  countsAgainstWater(sp) ? spaceOf(sp, sp.tl * 0.97) / SPACE_PER_L : 0); // starters draw animals at 92 % of adult length on average, a few up to ~100 %: sized at 97 % so Full stays at or under 100 %

export function capacityOf(S: TankSetup): CapacityParts {
  const litres = bioloadLitres(S), tempC = S.water.on ? heatLoss(S).targetC : T_REF;
  const filter = S.water.on ? stockCapacity(S) : 1;
  const plantCount = S.items.filter(i => i.kind === 'plant').length + (S.patches ?? []).filter(isLivePlantPatch).length * PATCH_PLANTS;
  const plants = 1 + PLANT_MAX * Math.min(1, plantCount / Math.max(litres / 100, 0.1) / PLANTS_PER_100L_FULL);
  return { litres, perL: LU_PER_L, filter, plants, plantCount, tempC, capacity: litres * LU_PER_L * filter * plants, space: litres * SPACE_PER_L };
}

const plural = (n: number, name: string) => n === 1 ? `1 ${name}` : `${n} ${name}${/(s|ish|ox)$/i.test(name) ? '' : 's'}`;

export function stockingOf(S: TankSetup): Stocking {
  const cap = capacityOf(S), salt = !!(S.water.on && S.water.salt), by = new Map<string, Contributor>(), feeding = feedingOf(S);
  let load = 0, spaceLoad = 0;
  for (const f of S.fish) {
    const sp = getSpecies(f.species), l = !sp || !countsAgainstWater(sp) ? 0 : tanOf(sp, massG(sp.id, f.tl ?? sp.tl), feeding, cap.tempC, salt);
    if (!sp || l <= 0) continue;
    load += l;
    const c = by.get(sp.id) ?? { id: sp.id, name: sp.name, n: 0, load: 0, space: 0, share: 0, grams: 0, cls: metClass(sp), spaceFactor: spaceFactor(sp) };
    c.n++; c.load += l; c.space += spaceOf(sp, f.tl ?? sp.tl); spaceLoad += spaceOf(sp, f.tl ?? sp.tl); c.grams += massG(sp.id, f.tl ?? sp.tl); by.set(sp.id, c);
  }
  const pc = (l: number, cp: number) => cp > 0 ? l / cp * 100 : l > 0 ? Infinity : 0;
  const nitrogen = nitrogenBudget(S, cap.litres, cap.tempC, load), spacePercent = pc(spaceLoad, cap.space), filtrationPercent = nitrogen.ammoniaPercent, percent = Math.max(spacePercent, filtrationPercent);
  // shares are of the limit that binds
  const bySpace = spacePercent >= filtrationPercent;
  const contributors = [...by.values()].sort((a, b) => bySpace ? b.space - a.space : b.load - a.load);
  for (const c of contributors) c.share = bySpace ? (spaceLoad ? c.space / spaceLoad : 0) : (load ? c.load / load : 0);
  const reasons: string[] = [];
  let fixFilter: Stocking['fixFilter'];
  if (!contributors.length) reasons.push('No animals in the water.');
  else if (percent > 100) {
    const top = contributors[0];
    reasons.push(top.share >= 0.4 ? `Overstocked mainly because of the ${plural(top.n, top.name)} (${Math.round(top.share * 100)}% of the load).`
      : `Overstocked: ${contributors.slice(0, 3).map(c => `${plural(c.n, c.name)} ${Math.round(c.share * 100)}%`).join(', ')} of the load.`);
    if (spacePercent > 100) reasons.push(`The tank itself is too small for them (${Math.round(spacePercent)}% of its space): no filter fixes that, it needs about ${Math.ceil(cap.litres * spacePercent / 100)} L of water or fewer animals.`);
    else {
      const fr = rowsFor(S).find(r => r.id === 'filter');
      for (const o of [...(fr?.options ?? [])].sort((a, b) => (a.capacity ?? 1) - (b.capacity ?? 1))) {
        const p = Math.max(nitrogenBudget(S, cap.litres, cap.tempC, load, o.id).ammoniaPercent, spacePercent);
        if (p <= 100) { fixFilter = { option: o.id, percent: Math.round(p) }; reasons.push(`A ${o.label.toLowerCase()} would bring it to ${Math.round(p)}%.`); break; }
      }
      if (!fixFilter) reasons.push(`Even the best filter leaves ammonia high: it needs fewer animals, more plants, lighter feeding or a bigger tank.`);
    }
  } else if (percent >= 85) reasons.push('Cramped but doable: keep up with water changes.');
  else reasons.push(`Room for about ${Math.round(100 - percent)}% more load.`);
  return { nitrogen, percent, spacePercent, filtrationPercent, load, contributors, capacity: cap, reasons, ...(fixFilter ? { fixFilter } : {}) };
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

/** One line for the panel and the view label: "Stocking 78%", "Stocking 240%, overstocked". */
export const stockingLine = (r: Stocking) => `Stocking ${r.percent === Infinity ? 'over 999' : Math.round(r.percent)}%${r.percent > 100 ? ', overstocked' : ''}`;
/** The breakdown for a tooltip or list: every contributor with its count, mass and share of the load. */
export const stockingDetail = (r: Stocking) => [`Space ${Math.round(r.spacePercent)}% of the tank's water, filtration ${Math.round(r.filtrationPercent)}% of what the filter clears`].concat(r.contributors.map(c => `${c.n} ${c.name}: ${Math.round(c.share * 100)}% of the load (${c.grams >= 10 ? Math.round(c.grams / c.n) : (c.grams / c.n).toFixed(1)} g each${Math.abs(c.spaceFactor - 1) >= 0.15 ? `, counted ${c.spaceFactor.toFixed(1)}x for space` : ''})`));
