// Fit a build to the user's limits (lane KK phase 5): after Shuffle (or any restock) the build that goes over a limit is
// swapped toward cheaper / easier choices, using the same driver list and swap suggestions the panel shows. Greedy: take the
// bar that is furthest over its limit, try the best swap among its top drivers, repeat until every limit holds or nothing helps.
import { costDistribution, limitState, type LimitState } from './cost';
import { demandOf, FACTORS, type DemandOpts } from './engine';
import { mean3 } from './range';
import { applySwap, swapsFor, type Bar, type Swap } from './swaps';
import type { Demand, UserProfile } from './types';
import type { TankSetup } from '../scene/types';

export const hasLimits = (P: UserProfile) => { const l = P.limits; return l.setupUsd !== undefined || !!l.upkeep && l.upkeep !== 'flex' || l.minPerWeek !== undefined || !!l.risk && l.risk !== 'any'; };

/** How far over each bar is, as a ratio of its limit (0 = within). Risk: the score against the cut point of the allowed label. */
function overBy(L: LimitState, D: Demand): Record<Bar, number> {
  const r = (b: { value: number; limit?: number; over: boolean }) => (b.over && b.limit ? b.value / b.limit - 1 : 0);
  return { setup: r(L.setup), upkeep: r(L.upkeep), minutes: r(L.minutes), risk: L.risk.over ? Math.max(0.01, D.totals.risk / 3 - 1) : 0 };
}

/** What the tank, gear and routine work alone ask (no swap can lower it): the least each bar can reach by swapping plants and animals. */
export interface FitResult { swaps: Swap[]; scene: TankSetup; left: Bar[]; before: LimitState; after: LimitState; floor: { setup: number; upkeep: number; minutes: number } }
export function fitToLimits(S0: TankSetup, P: UserProfile, opts: DemandOpts = {}, maxSteps = 8): FitResult {
  const eval1 = (S: TankSetup) => { const D = demandOf(S, P, opts), C = costDistribution(D, P, { draws: 300 }); return { D, C, L: limitState(D, C, P) }; };
  let S = S0, cur = eval1(S);
  const before = cur.L, swaps: Swap[] = [], tried = new Set<string>(), locked = new Set<string>(); // locked: a swapped-in kind is not swapped again
  for (let step = 0; step < maxSteps; step++) {
    const over = overBy(cur.L, cur.D), bars = (Object.keys(over) as Bar[]).filter(b => over[b] > 0).sort((a, b) => over[b] - over[a]);
    if (!bars.length) break;
    let best: { swap: Swap; bar: Bar } | null = null;
    for (const bar of bars) {
      const rows = [...cur.D.items].filter(c => (c.key.startsWith('animal:') || c.key.startsWith('plant:')) && !tried.has(bar + c.key) && !locked.has(c.key))
        .sort((a, b) => (bar === 'risk' ? b.risk - a.risk : bar === 'setup' ? (b.setup?.mode ?? 0) - (a.setup?.mode ?? 0) : bar === 'minutes' ? (b.minutes?.mode ?? 0) - (a.minutes?.mode ?? 0) : (b.upkeep?.mode ?? 0) - (a.upkeep?.mode ?? 0))).slice(0, 2);
      for (const r of rows) {
        const s = swapsFor(S, P, r.key, bar, opts, 3).find(x => x.kind !== 'remove');
        if (!s) { tried.add(bar + r.key); continue; }
        if (!best || s.delta[bar] / (bar === 'setup' ? 100 : bar === 'risk' ? 1 : 10) < best.swap.delta[best.bar] / (best.bar === 'setup' ? 100 : best.bar === 'risk' ? 1 : 10)) best = { swap: s, bar };
      }
      if (best) break; // the worst-offending bar that has any swap wins
    }
    if (!best) break;
    locked.add(`${best.swap.key.split(':')[0]}:${best.swap.toId}`); swaps.push(best.swap); S = applySwap(S, best.swap); cur = eval1(S);
  }
  const over = overBy(cur.L, cur.D);
  const fixed = cur.D.items.filter(c => c.group !== 'plant' && c.group !== 'animal'), kwh = P.kwhUsd ?? mean3(FACTORS.kwhUsd);
  const floor = {
    setup: fixed.reduce((t, c) => t + (c.setup ? mean3(c.setup) : 0), 0) * mean3(FACTORS.priceLevel),
    upkeep: fixed.reduce((t, c) => t + (c.upkeep ? mean3(c.upkeep) : 0) + (c.kwhMo ?? 0) * kwh, 0),
    minutes: fixed.reduce((t, c) => t + (c.minutes ? mean3(c.minutes) : 0), 0),
  };
  return { swaps, scene: S, left: (Object.keys(over) as Bar[]).filter(b => over[b] > 0), before, after: cur.L, floor };
}
