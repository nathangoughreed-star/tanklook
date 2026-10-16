// Auto-populate by light and care (lane PG step 4, 2026-10-16). With `layout.fit` set, the starter set keeps only plants
// (corals in a reef) whose light band and care demand fit the tank: the style draws its usual scape, then any plant that
// does not fit is swapped for the most similar one that does (same spot, same relative size), so the layout quality is
// the same either way. Care is the tank's growth feed (low-tech / ferts / CO2 + ferts). Absent `fit` = nothing changes.
import { NEEDS, isCoralNeed, isLand, parRange, type CoralNeed, type Dosing, type PlantNeed } from './lightneeds';
import type { GrowFeed, Item } from './types';

export type FitLight = 'low' | 'medium' | 'high';
export const FIT_LIGHTS: FitLight[] = ['low', 'medium', 'high'];
export const FIT_LABEL: Record<FitLight, { fresh: string; reef: string }> = {
  low: { fresh: 'Low light (about 25 PAR)', reef: 'Soft corals (about 75 PAR)' },
  medium: { fresh: 'Medium light (about 40 PAR)', reef: 'LPS (about 110 PAR)' },
  high: { fresh: 'High light (about 65 PAR)', reef: 'SPS (about 250 PAR)' },
};
/** The PAR each level stands for. */
export const FIT_PAR: Record<'fresh' | 'reef', Record<FitLight, number>> = { fresh: { low: 25, medium: 40, high: 65 }, reef: { low: 75, medium: 110, high: 250 } };
export const CARE_NAME: Record<GrowFeed, string> = { low: 'low-tech', ferts: 'ferts', co2: 'CO2 + ferts' };
const DOSE_MAX: Record<GrowFeed, Dosing> = { low: 'light', ferts: 'regular', co2: 'daily' };
const DOSE = { none: 0, light: 1, regular: 2, daily: 3 } as const;

/** Does this variant fit a tank giving `par` at the plants and the owner's care? Land plants and unknowns always do. */
export function fits(variant: string, par: number, care: GrowFeed): boolean {
  const n = NEEDS[variant];
  if (!n || isLand(n)) return true;
  const [lo, hi] = parRange(n);
  // shade plants (low band) are kept up to 80 PAR: they go under floaters and canopy, where the light is far less
  const top = !isCoralNeed(n) && (n as PlantNeed).band === 'low' ? Math.max(hi, 80) : hi;
  if (par < lo * 0.85 || par > top) return false;
  if (isCoralNeed(n)) return DOSE[(n as CoralNeed).dosing] <= DOSE[DOSE_MAX[care]];
  const p = n as PlantNeed;
  return !(p.co2 === 'required' && care !== 'co2') && !(p.ferts === 'required' && care === 'low');
}

/** Swap-ins for each variant, most similar first (a shape-alike that fits the light and care, then the safe ones). */
const SWAP: Record<string, string[]> = {
  stem: ['hornwort', 'anacharis', 'grass', 'balansae', 'sword'], stemred: ['ludwigia', 'rotala', 'hornwort', 'anacharis', 'grass', 'balansae'],
  rotala: ['ludwigia', 'hornwort', 'anacharis', 'grass', 'balansae'], ludwigia: ['stem', 'hornwort', 'anacharis', 'grass', 'balansae'],
  carpet: ['hairgrass', 'sagittaria', 'moss', 'crypt'], hairgrass: ['sagittaria', 'moss', 'crypt'], sagittaria: ['moss', 'crypt', 'hairgrass'],
  sword: ['ozelot', 'crypt', 'balansae', 'grass'], ozelot: ['sword', 'crypt', 'balansae'], lotus: ['sword', 'ozelot', 'crypt'], grass: ['balansae', 'sword', 'crypt'],
  anubias: ['buce', 'crypt', 'moss'], fern: ['anubias', 'buce', 'moss'], buce: ['anubias', 'moss'], crypt: ['balansae', 'anubias', 'moss'], balansae: ['grass', 'crypt', 'sword'],
  redroot: ['frogbit', 'salvinia', 'lettuce'], frogbit: ['salvinia', 'lettuce', 'redroot'], salvinia: ['frogbit', 'lettuce', 'redroot'], lettuce: ['frogbit', 'salvinia', 'redroot'],
  hornwort: ['anacharis', 'grass'], anacharis: ['hornwort', 'grass'], moss: ['anubias', 'crypt'],
  acropora: ['acrofine', 'montipora', 'montiplate', 'hammer', 'torch', 'zoanthid', 'leather', 'mushroom'], acrofine: ['acropora', 'montipora', 'montiplate', 'hammer', 'torch', 'zoanthid', 'leather', 'mushroom'],
  montipora: ['montiplate', 'acrofine', 'hammer', 'torch', 'zoanthid', 'leather', 'mushroom'], montiplate: ['montipora', 'acrofine', 'hammer', 'torch', 'zoanthid', 'leather', 'mushroom'],
  hammer: ['torch', 'anemone', 'zoanthid', 'leather', 'mushroom', 'montipora'], torch: ['hammer', 'anemone', 'zoanthid', 'leather', 'mushroom', 'montipora'], anemone: ['hammer', 'torch', 'leather', 'zoanthid'],
  leather: ['zoanthid', 'seafan', 'mushroom', 'macroalgae', 'hammer'], zoanthid: ['leather', 'mushroom', 'macroalgae', 'hammer'], mushroom: ['zoanthid', 'leather', 'macroalgae'], seafan: ['leather', 'zoanthid', 'macroalgae'], macroalgae: ['mushroom', 'zoanthid', 'leather'],
};

export interface Lib { [variant: string]: { size: number; min: number; max: number } }
/** The starter items with every plant / coral that does not fit swapped for one that does (none fits: it stays). */
export function fitItems(items: Item[], fit: FitLight, care: GrowFeed, salt: boolean, lib: Lib): Item[] {
  const par = FIT_PAR[salt ? 'reef' : 'fresh'][fit], swap = new Map<string, string | null>();
  const pickFor = (v: string) => {
    if (!swap.has(v)) swap.set(v, fits(v, par, care) ? null : (SWAP[v] ?? []).find(c => fits(c, par, care)) ?? null);
    return swap.get(v)!;
  };
  return items.map(it => {
    if (it.kind !== 'plant' && it.kind !== 'coral') return it;
    const to = pickFor(it.variant);
    if (!to) return it;
    const k = it.size / lib[it.variant].size, size = Math.round(Math.min(lib[to].max, Math.max(lib[to].min, lib[to].size * k)));
    const { spread: _s, stems: _t, dens: _d, ...rest } = it;
    return { ...rest, variant: to, size };
  });
}

/** One line for the starter-set panel: what was chosen and why. */
export function fitCaption(items: Item[], fit: FitLight, care: GrowFeed, salt: boolean, label: (v: string) => string): string {
  const kinds = [...new Set(items.filter(i => i.kind === (salt ? 'coral' : 'plant') && NEEDS[i.variant] && !isLand(NEEDS[i.variant])).map(i => label(i.variant)))];
  const why = salt ? `${FIT_LABEL[fit].reef.split(' (')[0]}, ${CARE_NAME[care]} dosing` : `${fit} light, ${CARE_NAME[care]}`;
  return kinds.length ? `Chosen for ${why}: ${kinds.join(', ')}.` : `Nothing in this set depends on ${why}.`;
}
