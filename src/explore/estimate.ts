// Explore, stage X1 (lane OX3): the estimate of a candidate with its RANGES and a confidence per figure (reconcile section 3.2-3.3, Nathan 2026-11-02 Q1). Pure.
// The demand model exposes only means; here the conservative ends are added from the same rows: each figure's range is its mean plus the rows' own spread (price-age widening included),
// money certifies on the upper end of the price range, and the minutes and setup hours (every one a stated estimate of ours, effort.ts) certify on the upper end shown AS an estimate.
// Nothing here gates: the gate (gate.ts) reads this and decides.
import { mean3 } from '../demand/range';
import { careFigure, costFigure, setupEffortOf, type Figure } from '../demand/effort';
import { cyclingOf, habitatOf } from '../demand/buildplan';
import { PRICES_AS_OF } from '../demand/prices';
import type { ConceptEval, Proposal } from '../demand/suggest';
import type { UserProfile } from '../demand/types';
import { modelGallons } from '../data/tanks';
import type { Build } from '../scene/builds';
import { difficultyOf, type Difficulty } from './difficulty';
import { SETUP_HOURS_SPREAD } from './constants';

/** A figure with its spread: `mean` is what the rest of the app shows, `hi` what a firm limit is certified against. */
export interface Range { lo: number; mean: number; hi: number }
export interface Estimate {
  startupUsd: Range; monthlyUsd: Range; minPerWeek: Range; setupHours: Range;
  /** weeks of cycling / establishing, flagged apart from the hands-on setup time (absent for a dry enclosure) */
  cycleWeeks?: [number, number];
  gal: number;
  /** outer size of the enclosure, inches (L x D x H) */
  footprintIn: { L: number; D: number; H: number };
  /** how far each figure can be trusted (effort.ts `Figure`): startup = share of the price backed by a retailer listing; monthly, care and setup are always our own stated estimate */
  figures: { startup: Figure; monthly: Figure; care: Figure; setup: Figure };
  difficulty: Difficulty;
  /** the facts a claim rests on, in plain words (the gate adds the limits that were never set) */
  assumptions: string[];
}
const IN = 25.4, round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
const range = (mean: number, lo: number, hi: number, d = 0): Range => ({ lo: round(Math.max(0, Math.min(lo, mean)), d), mean: round(mean, d), hi: round(Math.max(hi, mean), d) });

/** The estimate of one evaluated concept: `ev` is `evaluateCandidate`'s answer for the scene that will open, `build` its build. */
export function estimateOf(ev: ConceptEval, build: Build, P: UserProfile, now: number): Estimate {
  const items = ev.demand.items, pseudo = { build: { ...build, setup: ev.scene, animals: build.animals } } as unknown as Proposal;
  // money: the gross price spread by the rows' own lo / hi (the owned credit is exact, so it comes off both ends), then tax
  const sums = items.reduce((t, c) => c.setup ? { m: t.m + mean3(c.setup), lo: t.lo + c.setup.lo, hi: t.hi + c.setup.hi } : t, { m: 0, lo: 0, hi: 0 });
  const kLo = sums.m > 0 ? sums.lo / sums.m : 1, kHi = sums.m > 0 ? sums.hi / sums.m : 1, tax = 1 + ev.taxPct / 100;
  const startupUsd = range(ev.totals.startupUsd, (ev.grossUsd * kLo - ev.saved) * tax, (ev.grossUsd * kHi - ev.saved) * tax);
  const spread = (pick: (c: typeof items[number]) => { lo: number; hi: number; m: number } | undefined, mean: number): Range => {
    let lo = 0, hi = 0; for (const c of items) { const r = pick(c); if (r) { lo += r.lo - r.m; hi += r.hi - r.m; } }
    return range(mean, mean + lo, mean + hi);
  };
  const triangle = (r: { lo: number; mode: number; hi: number } | undefined) => r ? { lo: r.lo, hi: r.hi, m: mean3(r) } : undefined;
  const monthlyUsd = spread(c => triangle(c.upkeep), ev.totals.monthlyUsd), minPerWeek = spread(c => triangle(c.minutes), ev.totals.minPerWeek);
  const h = habitatOf(pseudo), gal = modelGallons(build.tank), cyc = cyclingOf(pseudo, h, false);
  const effort = setupEffortOf(pseudo, h, gal, P, cyc?.weeks), hours = effort.hours;
  const setupHours = range(hours, hours * SETUP_HOURS_SPREAD.lo, hours * SETUP_HOURS_SPREAD.hi, 1);
  const o = build.tank.outer;
  return {
    startupUsd, monthlyUsd, minPerWeek, setupHours, ...(cyc ? { cycleWeeks: cyc.weeks } : {}), gal: round(gal, 1), footprintIn: { L: round(o.L / IN, 1), D: round(o.D / IN, 1), H: round(o.H / IN, 1) },
    figures: { startup: costFigure(pseudo, P), monthly: { conf: 'provisional', why: 'Monthly cost is food, conditioner, power and the expected loss of animals, from listing prices plus a stated loss rate.' }, care: careFigure(), setup: effort },
    difficulty: difficultyOf(ev.scene, now),
    assumptions: [`Prices as of ${PRICES_AS_OF}, from retailer listings where there are any and a rule of thumb where there are not.`,
      'Minutes a week and setup hours are our own estimates: no page states them.',
      'Animals at their smallest recommended group; density never raises the stocking.'],
  };
}
