// Swap suggestions (lane KK): "what drives this bar and which swap lowers it". A swap replaces every animal of one species (or
// every plant of one kind) with a cheaper / easier one that suits the tank, and reports the effect on all three bars. Means only
// (no Monte Carlo), so it is cheap enough to try every candidate when a bar is clicked.
import { CARE } from '../data/care';
import { SPECIES, getSpecies } from '../data/species';
import { whyAnimal } from '../scene/animalfit';
import { LIBRARY } from '../scene/items';
import { NEEDS, isCoralNeed, isLand } from '../scene/lightneeds';
import { volume } from '../scene/physics';
import type { TankSetup } from '../scene/types';
import { demandOf, plantDifficulty, type DemandOpts } from './engine';
import type { UserProfile } from './types';

export type Bar = 'setup' | 'upkeep' | 'minutes' | 'risk';
export interface Delta { setup: number; upkeep: number; minutes: number; risk: number }
export interface Swap { key: string; from: string; to: string; toId: string; kind: 'animal' | 'plant' | 'remove'; delta: Delta }

const totals = (S: TankSetup, P: UserProfile, o: DemandOpts) => { const t = demandOf(S, P, o).totals; return { setup: t.setupUsd, upkeep: t.upkeepUsdMo, minutes: t.minPerWeek, risk: t.risk }; };
const diff = (a: Delta, b: Delta): Delta => ({ setup: a.setup - b.setup, upkeep: a.upkeep - b.upkeep, minutes: a.minutes - b.minutes, risk: a.risk - b.risk });
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
      if (whyAnimal(c, litres, 3, present)) continue;
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
      const d = diff(totals({ ...S, items: S.items.map(i => (i.variant === id ? { ...i, variant: v } : i)) }, P, opts), base);
      if (d[bar] < -1e-6) out.push({ key, from: lv.label, to: LIBRARY[v].label, toId: v, kind: 'plant', delta: d });
    }
  }
  // best for the chosen bar, without making the other bars much worse (each bar's change in its own "noticeable" units)
  const worse = (d: Delta) => (['setup', 'upkeep', 'minutes', 'risk'] as Bar[]).reduce((s, k) => s + (k === bar ? 0 : Math.max(0, d[k]) / norm[k]), 0);
  return out.sort((a, b) => a.delta[bar] / norm[bar] + worse(a.delta) - (b.delta[bar] / norm[bar] + worse(b.delta))).slice(0, n);
}
