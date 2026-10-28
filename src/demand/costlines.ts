// The set-up total of a Suggest card, itemised (lane C9, Nathan 2026-10-27): tank, stand, the finish (substrate, hardscape, plants), animals and gear
// (heat, UVB, lights, filter ...), summing to the card's set-up price, with anything the person already owns shown as $0 "you have". Read off the
// demand model's own rows (each row's list price scaled by the build's price / list-price ratio, so deals are in the lines), never priced here.
import { demandOf } from './engine';
import { mean3 } from './range';
import type { Build } from '../scene/builds';
import { lightShare } from '../scene/finish';
import type { UserProfile } from './types';

/** The four standards of a finished aquarium (lane U5, Nathan 2026-10-28), in the order they are paid for, plus sales tax (which belongs to none of them).
 *  welfare: what responsible long-term care needs, never optional, never cut for price (the tank, the animals, their life-support gear: heat, filtration, light, lid, UVB).
 *  complete: the rest of what a working tank needs on day one (stand, water test kit, dechlorinator, siphon, net, thermometer).
 *  display: the coherent, attractive habitat we recommend by default (substrate, hardscape or shelter, plants).
 *  enhance: premium extras (CO2, fertiliser, a stronger light, dosing, auto top-off): the finish ladder's upper tiers. */
export type Layer = 'welfare' | 'complete' | 'display' | 'enhance' | 'tax';
export const LAYER_LABEL: Record<Layer, string> = { welfare: 'Welfare requirements', complete: 'Complete set-up', display: 'Display-quality baseline', enhance: 'Enhancements', tax: 'Sales tax' };
export const LAYER_BLURB: Record<Layer, string> = {
  welfare: 'Needed for the animals to live well long-term: never optional, never cut for price.',
  complete: 'The equipment, supplies and maintenance tools a working tank needs from day one.',
  display: 'A coherent, attractive habitat: substrate, shelter or hardscape, plants. Our default.',
  enhance: 'Premium extras that make it better, not safer: stronger light, CO2, fertiliser, dosing.',
  tax: '',
};
export const LAYERS: readonly Layer[] = ['welfare', 'complete', 'display', 'enhance', 'tax'];
export interface CostLine { label: string; usd: number; note?: string; layer?: Layer }
const FINISH = (key: string) => key === 'substrate' || key === 'patch' || key.startsWith('hard:') || key.startsWith('plant:');
const ENHANCE_KEYS = new Set(['co2', 'ferts', 'ato', 'dosing']);
const SUPPLY_KEYS = new Set(['testkit', 'rounit', 'startconditioner', 'siphon', 'net', 'thermometer', 'refractometer']);
const GROUPS: { id: string; label: string; layer: Layer; of: (key: string) => boolean }[] = [
  { id: 'tank', label: 'Tank', layer: 'welfare', of: k => k === 'tank' },
  { id: 'stand', label: 'Stand', layer: 'complete', of: k => k === 'stand' },
  { id: 'finish', label: 'Substrate, hardscape and plants', layer: 'display', of: FINISH },
  { id: 'animals', label: 'Animals', layer: 'welfare', of: k => k.startsWith('animal:') },
  // what the demand model prices as a set-up purchase to start the tank (lane U5: test kit, first dechlorinator, siphon, net, thermometer, refractometer, an RO unit); refills of food, conditioner and salt mix are in the monthly upkeep
  { id: 'supplies', label: 'Supplies and maintenance tools (test kit, dechlorinator, siphon, net, thermometer)', layer: 'complete', of: k => SUPPLY_KEYS.has(k) },
  { id: 'enhance', label: 'Extras (stronger light, CO2, fertiliser, dosing)', layer: 'enhance', of: k => ENHANCE_KEYS.has(k) || k === 'light+' },
];
/**
 * `owned`: the demand rows the person owns or needs not buy (ownedAssess's `rows`, a stand not wanted among them); `total`: the card's ALL-IN set-up price after
 * them, sales tax included (lane U2). The lines add up to `total` exactly (the rounding goes to the biggest line). Gear is everything else that has a set-up
 * price. `tax`: the sales tax in whole dollars, its own line (`taxLabel`), taken off `total` before the rest are itemised.
 */
export function costLines(b: Build, owned: readonly string[], total: number, needStand: boolean, P: UserProfile, tax = 0, taxLabel = 'Sales tax'): CostLine[] {
  total -= tax;
  const D = demandOf(b.setup, P), own = new Set(owned), list = D.totals.setupUsd, k = list > 0 ? b.setupUsd / list : 1;
  const up = lightShare(b.finish?.tier ?? 'starter'); // the stronger light a finish tier adds is an enhancement (its share of the light's price), the rest is the light every tank needs
  const priced = D.items.filter(i => i.setup).flatMap(i => { const usd = mean3(i.setup!) * k; return i.key === 'light' && up > 0 && !own.has('light') ? [{ key: 'light', label: i.label, usd: usd * (1 - up) }, { key: 'light+', label: 'Stronger light', usd: usd * up }] : [{ key: i.key, label: i.label, usd }]; });
  const buy = priced.filter(i => !own.has(i.key)), lines: CostLine[] = [];
  const sum = new Map<string, number>(), gearId = 'gear';
  for (const i of buy) { const g = GROUPS.find(x => x.of(i.key))?.id ?? gearId; sum.set(g, (sum.get(g) ?? 0) + i.usd); }
  for (const g of [...GROUPS, { id: gearId, label: 'Life-support gear (heat, UVB, lights, filter and the rest)', layer: 'welfare' as Layer }]) if ((sum.get(g.id) ?? 0) > 0.5) lines.push({ label: g.label, usd: Math.round(sum.get(g.id)!), layer: g.layer });
  if (lines.length) { // the rounding goes to the biggest line, so the lines are exactly the card's total
    const big = lines.reduce((m, l) => l.usd > m.usd ? l : m, lines[0]);
    big.usd += Math.round(total) - lines.reduce((t, l) => t + l.usd, 0);
  }
  if (tax > 0) lines.push({ label: taxLabel, usd: tax, note: 'estimate', layer: 'tax' });
  for (const i of priced.filter(x => own.has(x.key))) lines.push({ label: i.label, usd: 0, note: i.key === 'stand' && !needStand ? 'not needed' : 'you have', layer: GROUPS.find(x => x.of(i.key))?.layer ?? 'welfare' });
  return lines;
}

/** The dollars of each layer, in order, those with money only. */
export function layerTotals(lines: readonly CostLine[]): { layer: Layer; label: string; usd: number }[] {
  return LAYERS.map(layer => ({ layer, label: LAYER_LABEL[layer], usd: lines.filter(l => (l.layer ?? 'welfare') === layer).reduce((t, l) => t + l.usd, 0) })).filter(x => x.usd > 0);
}
