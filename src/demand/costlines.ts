// The set-up total of a Suggest card, itemised (lane C9, Nathan 2026-10-27): tank, stand, the finish (substrate, hardscape, plants), animals and gear
// (heat, UVB, lights, filter ...), summing to the card's set-up price, with anything the person already owns shown as $0 "you have". Read off the
// demand model's own rows (each row's list price scaled by the build's price / list-price ratio, so deals are in the lines), never priced here.
import { demandOf } from './engine';
import { mean3 } from './range';
import type { Build } from '../scene/builds';
import type { UserProfile } from './types';

export interface CostLine { label: string; usd: number; note?: string }
const FINISH = (key: string) => key === 'substrate' || key === 'patch' || key.startsWith('hard:') || key.startsWith('plant:');
const GROUPS: { id: string; label: string; of: (key: string) => boolean }[] = [
  { id: 'tank', label: 'Tank', of: k => k === 'tank' },
  { id: 'stand', label: 'Stand', of: k => k === 'stand' },
  { id: 'finish', label: 'Substrate, hardscape and plants', of: FINISH },
  { id: 'animals', label: 'Animals', of: k => k.startsWith('animal:') },
  // what the demand model prices as a set-up purchase to start the tank (a test kit, an RO unit); food, conditioner and salt mix are in the monthly upkeep, not here
  { id: 'supplies', label: 'Supplies (water test kit and the like)', of: k => k === 'testkit' || k === 'rounit' },
];
/**
 * `owned`: the demand rows the person owns or needs not buy (ownedAssess's `rows`, a stand not wanted among them); `total`: the card's ALL-IN set-up price after
 * them, sales tax included (lane U2). The lines add up to `total` exactly (the rounding goes to the biggest line). Gear is everything else that has a set-up
 * price. `tax`: the sales tax in whole dollars, its own line (`taxLabel`), taken off `total` before the rest are itemised.
 */
export function costLines(b: Build, owned: readonly string[], total: number, needStand: boolean, P: UserProfile, tax = 0, taxLabel = 'Sales tax'): CostLine[] {
  total -= tax;
  const D = demandOf(b.setup, P), own = new Set(owned), list = D.totals.setupUsd, k = list > 0 ? b.setupUsd / list : 1;
  const priced = D.items.filter(i => i.setup).map(i => ({ key: i.key, label: i.label, usd: mean3(i.setup!) * k }));
  const buy = priced.filter(i => !own.has(i.key)), lines: CostLine[] = [];
  const sum = new Map<string, number>(), gearId = 'gear';
  for (const i of buy) { const g = GROUPS.find(x => x.of(i.key))?.id ?? gearId; sum.set(g, (sum.get(g) ?? 0) + i.usd); }
  for (const g of [...GROUPS, { id: gearId, label: 'Gear (heat, UVB, lights, filter and the rest)' }]) if ((sum.get(g.id) ?? 0) > 0.5) lines.push({ label: g.label, usd: Math.round(sum.get(g.id)!) });
  if (lines.length) { // the rounding goes to the biggest line, so the lines are exactly the card's total
    const big = lines.reduce((m, l) => l.usd > m.usd ? l : m, lines[0]);
    big.usd += Math.round(total) - lines.reduce((t, l) => t + l.usd, 0);
  }
  if (tax > 0) lines.push({ label: taxLabel, usd: tax, note: 'estimate' });
  for (const i of priced.filter(x => own.has(x.key))) lines.push({ label: i.label, usd: 0, note: i.key === 'stand' && !needStand ? 'not needed' : 'you have' });
  return lines;
}
