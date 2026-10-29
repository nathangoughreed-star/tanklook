// Swap suggestions (lane KK): "what drives this bar and which swap lowers it". A swap replaces every animal of one species (or
// every plant of one kind) with a cheaper / easier one that suits the tank, and reports the effect on all three bars. Means only
// (no Monte Carlo), so it is cheap enough to try every candidate when a bar is clicked.
import { CARE } from '../data/care';
import { SPECIES, getSpecies } from '../data/species';
import { hasCorals, whyAnimal } from '../scene/animalfit';
import { isCarpet, isFloat } from '../art/plants';
import { LIBRARY } from '../scene/items';
import { NEEDS, isCoralNeed, isLand } from '../scene/lightneeds';
import { volume } from '../scene/physics';
import { filterFor, filterUnits, heatLoss, optionDef, ownKeep, stockCapacity, techOf, withUnits, type FilterUnit, type HeaterUnit } from '../scene/tech';
import { HEATER_PRODUCTS, filtersNear, listedPrice, productName } from '../data/gearCatalog';
import { minFit } from '../scene/tankMin';
import type { TankSetup } from '../scene/types';
import { demandOf, plantDifficulty, type DemandOpts } from './engine';
import type { UserProfile } from './types';

export type Bar = 'setup' | 'upkeep' | 'minutes' | 'risk';
export interface Delta { setup: number; upkeep: number; minutes: number; risk: number }
export interface Swap { key: string; from: string; to: string; toId: string; kind: 'animal' | 'plant' | 'remove'; delta: Delta }

const totals = (S: TankSetup, P: UserProfile, o: DemandOpts) => { const t = demandOf(S, P, o).totals; return { setup: t.setupUsd, upkeep: t.upkeepUsdMo, minutes: t.minPerWeek, risk: t.risk }; };
const diff = (a: Delta, b: Delta): Delta => ({ setup: a.setup - b.setup, upkeep: a.upkeep - b.upkeep, minutes: a.minutes - b.minutes, risk: a.risk - b.risk });
const succulent = (v: string) => (NEEDS[v] as { note?: string } | undefined)?.note === 'succulent';
const norm: Delta = { setup: 100, upkeep: 10, minutes: 10, risk: 1 };

/** Swaps for one driver row (its key from Demand.items), best first for `bar`. At most `n`; an empty list when nothing helps. */
export function swapsFor(S: TankSetup, P: UserProfile, key: string, bar: Bar, opts: DemandOpts = {}, n = 3): Swap[] {
  const base = totals(S, P, opts), out: Swap[] = [];
  const [kind, id] = key.split(':');
  const label = (to: string, delta: Delta): Swap | null => (delta[bar] < -1e-6 ? { key, from: key, to, toId: '', kind: 'remove', delta } : null);
  const litres = volume(S.tank).litres;
  if (kind === 'animal') {
    const sp = getSpecies(id);
    if (!sp) return [];
    const rm = label('nothing', diff(totals({ ...S, fish: S.fish.filter(f => f.species !== id) }, P, opts), base));
    if (rm) out.push(rm);
    const present = [...new Set(S.fish.filter(f => f.species !== id).map(f => getSpecies(f.species)!).filter(Boolean))];
    for (const c of SPECIES) {
      if (c.id === id || c.cat !== sp.cat || !CARE[c.id] || (CARE[c.id].care > (CARE[id]?.care ?? 3))) continue;
      if (whyAnimal(c, litres, 3, present, { corals: hasCorals(S.items), fit: minFit(S) })) continue;
      const d = diff(totals({ ...S, fish: S.fish.map(f => (f.species === id ? { ...f, species: c.id, tl: undefined } : f)) }, P, opts), base);
      if (d[bar] < -1e-6) out.push({ key, from: sp.name, to: c.name, toId: c.id, kind: 'animal', delta: d });
    }
  } else if (kind === 'plant') {
    const lv = LIBRARY[id], need = NEEDS[id];
    if (!lv || !need) return [];
    const rm = label('nothing', diff(totals({ ...S, items: S.items.filter(i => i.variant !== id) }, P, opts), base));
    if (rm) out.push(rm);
    for (const [v, nd] of Object.entries(NEEDS)) {
      if (v === id || LIBRARY[v]?.kind !== lv.kind || isLand(nd) !== isLand(need) || isCoralNeed(nd) !== isCoralNeed(need)) continue;
      if (plantDifficulty(v) > plantDifficulty(id)) continue;
      if (isFloat(v) !== isFloat(id) || isCarpet(v) !== isCarpet(id) || succulent(v) !== succulent(id)) continue; // a floater stays a floater, a carpet a carpet
      const d = diff(totals({ ...S, items: S.items.map(i => (i.variant === id ? { ...i, variant: v } : i)) }, P, opts), base);
      if (d[bar] < -1e-6) out.push({ key, from: lv.label, to: LIBRARY[v].label, toId: v, kind: 'plant', delta: d });
    }
  }
  // best for the chosen bar, without making the other bars much worse (each bar's change in its own "noticeable" units)
  const worse = (d: Delta) => (['setup', 'upkeep', 'minutes', 'risk'] as Bar[]).reduce((s, k) => s + (k === bar ? 0 : Math.max(0, d[k]) / norm[k]), 0);
  return out.sort((a, b) => a.delta[bar] / norm[bar] + worse(a.delta) - (b.delta[bar] / norm[bar] + worse(b.delta))).slice(0, n);
}

/** The scene after a swap (pure): every animal of the species, or every plant of the kind, replaced. 'remove' drops them. */
export function applySwap(S: TankSetup, s: Swap): TankSetup {
  const [kind, id] = s.key.split(':');
  if (kind === 'animal') return { ...S, fish: s.kind === 'remove' ? S.fish.filter(f => f.species !== id) : S.fish.map(f => (f.species === id ? { ...f, species: s.toId, tl: undefined } : f)) };
  return { ...S, items: s.kind === 'remove' ? S.items.filter(i => i.variant !== id) : S.items.map(i => (i.variant === id ? { ...i, variant: s.toId } : i)) };
}

// ---- gear swaps (lane GM6, design gear-model.md section 4): the library alternatives to one heater or filter, each with its stat change, the
// price change and the welfare effect. A swap is offered ONLY if it passes the welfare check the tank is judged by (a heater must still hold the
// cold-night need, a filter must carry at least the stocking the current one does): a cheaper pick never loosens a gate.
export interface GearSwap {
  row: 'heater' | 'filter'; index: number; toId: string; name: string;
  /** stat change: the driver stat (watts or gph) and the power draw, library alternative minus current */
  dStat: number; dWatts: number; stat: 'watts' | 'gph'; delta: Delta;
  /** the welfare effect in words (always passing: failing alternatives are not listed) */
  welfare: string;
}
const sign = (v: number, unit: string, d = 0) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)} ${unit}`;
/** The one-line label of a swap: "+40 gph, +$12, +3 W" (units as the model stores them: US gallons per hour, watts, dollars). */
export const swapText = (g: GearSwap) => [sign(g.dStat, g.stat === 'watts' ? 'W' : 'gph'), `${g.delta.setup >= 0 ? '+' : '−'}$${Math.abs(g.delta.setup).toFixed(0)}`, ...(g.stat === 'gph' ? [sign(g.dWatts, 'W')] : [])].join(', ');

/** Alternatives for unit `index` of `row`, cheapest set-up first, at most `n`. Owned units swap to a bought product (the alternative is never owned). */
export function gearSwapsFor(S: TankSetup, P: UserProfile, row: 'heater' | 'filter', index: number, opts: DemandOpts = {}, n = 5): GearSwap[] {
  const t = techOf(S);
  const withUnit = (u: HeaterUnit | FilterUnit): TankSetup => ({ ...S, tech: row === 'heater' ? withUnits(t, 'heater', heatLoss(S, t).units.map((x, k) => k === index ? u as HeaterUnit : { ...(x.product ? { product: x.product.id } : { w: x.watts }), ...(x.kit ? { kit: true } : {}), ...ownKeep(x) })) : withUnits(t, 'filter', filterUnits(t).map((x, k) => k === index ? u as FilterUnit : x)) });
  const base = totals(S, P, opts), cap0 = stockCapacity(S, t);
  const out: GearSwap[] = [];
  if (row === 'heater') {
    const cur = heatLoss(S, t), now = cur.units[index];
    if (!now) return [];
    for (const p of HEATER_PRODUCTS) {
      if (p.id === now.product?.id || !listedPrice(p)) continue;
      const S2 = withUnit({ product: p.id }), h2 = heatLoss(S2, techOf(S2));
      if (h2.totalW < h2.needW) continue; // welfare gate: still holds the tank on a cold night
      const d = diff(totals(S2, P, opts), base);
      out.push({ row, index, toId: p.id, name: productName(p), stat: 'watts', dStat: p.watts - now.watts, dWatts: p.watts - now.watts, delta: d, welfare: `Still holds the tank on a cold night (${Math.round(h2.totalW)} W of ${Math.round(h2.needW)} W needed)` });
    }
  } else {
    const us = filterUnits(t), now = us[index];
    if (!now) return [];
    const f0 = optionDef('filter', now.kind)?.kind && filterFor(S, optionDef('filter', now.kind)!.kind!, now.model, now.product);
    for (const p of filtersNear(now.kind, volume(S.tank).gallons, 40)) {
      if (p.id === now.product || !listedPrice(p) || !p.gph) continue;
      const S2 = withUnit({ kind: now.kind, product: p.id }), t2 = techOf(S2), cap = stockCapacity(S2, t2);
      if (cap < Math.min(cap0, 1) - 1e-9) continue; // welfare gate: carries at least the stocking the current filtration does
      const d = diff(totals(S2, P, opts), base);
      out.push({ row, index, toId: p.id, name: productName(p), stat: 'gph', dStat: p.gph - (f0 ? f0.product?.gph ?? f0.model.gph : p.gph), dWatts: (p.watts ?? 0) - (f0 ? f0.product?.watts ?? f0.model.watts : 0), delta: d, welfare: `Carries ${Math.round(cap * 100)} % of a normal stocking${cap >= cap0 ? '' : ' (no less than now)'}` });
    }
  }
  return out.sort((a, b) => a.delta.setup - b.delta.setup || a.name.localeCompare(b.name)).slice(0, n);
}
