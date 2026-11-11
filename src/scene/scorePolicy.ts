// DQ1 (spec section 4.3): ONE SCORING POLICY for the live A/B ranking. Pure; `pairGen.scoreOf` calls `scoreBreakdown`, and `?debug` prints the terms.
//   STATED  what the person said (size / floor / height range, plants, a cost or care TARGET, the look cards: archetype and the four look axes, a hand-set "You told us" key). Each term is a bounded nudge; a stated
//           preference only ranks (a firm bound filtered the candidate before it got here).
//   LEARNED what the A/B choices taught (aspect weights from events, attribute picks as thumbs). Weaker: the learned total is CAPPED at LEARNED_CAP, and at the lower LEARNED_CAP_WITH_STATED when anything is stated,
//           so a few votes never outweigh a clear stated preference (spec scenario 5). A told weight is never counted as learned.
// The cards write both `told` keys and QuickPrefs fields; each card effect is scored ONCE: the layout/family terms and the four look axes below. The told keys the cards derive (see readQuickPrefs `told`) are left out.
import type { TankSetup } from './types';
import type { CandidateFacts } from './discoveryTypes';
import type { QuickPrefs } from './quickPrefs';
import { thumbBonus, type ThumbMap } from './attrs';
import { designAxes, type DesignAxes } from './designAxes';
import type { Weight } from '../explore/aspects';
import { leanBonus, type Lean } from './learning';

/** The size of every stated nudge. Documented so a change is a decision, not a drift. */
export const STATED = { sizeIn: 0.5, sizeOut: -0.2, floorIn: 0.3, floorOut: -0.1, heightIn: 0.3, heightOut: -0.1, plantsFit: 0.3, plantsMiss: -0.2, axis: 0.3, layout: 0.6, family: 0.4, told: 0.4, overTarget: 0.3 } as const;
export const LEARNED_CAP = 0.8, LEARNED_CAP_WITH_STATED = 0.4;

export interface ScoreTerm { name: string; v: number; group: 'stated' | 'learned'; why?: string }
export interface ScoreBreakdown { total: number; stated: number; learned: number; /** the learned sum before the cap */ learnedRaw: number; cap: number; terms: ScoreTerm[]; axes: Pick<DesignAxes, 'natural' | 'lush' | 'colourful' | 'ordered' | 'rockWood' | 'plantMode'> }
export interface ScoreInput {
  pf: QuickPrefs; S: TankSetup; facts: Pick<CandidateFacts, 'gallons'> & Partial<CandidateFacts>; features: readonly string[]; archetypeId: string; familyId: string;
  totals: { setupUsd: number; minPerWeek: number }; weights: Map<string, Weight>; thumbs?: ThumbMap; /** DQ3: the practical lean from cost reasons */ lean?: Lean;
}
/** SZ1: a range preference as a smooth fit, 0..1. Flat 1 inside [lo, hi]; outside, a Gaussian on a LOG scale: z = ln(g/hi)/sigma above, ln(lo/g)/sigma below, fit = exp(-z^2/2).
 *  sigma = ln(hi/lo)/2 (the edges of a range are +-1 SD in log space), floored at ln(1.25) so a narrow range is not a cliff. 20-40 gal: 55 gal 0.66, 80 gal 0.14, 10 gal 0.14.
 *  An open end (hi infinite, lo 0) never penalises that side. */
export const SIZE_SIGMA_FLOOR = Math.log(1.25);
export function rangeFit(x: number, r: { lo: number; hi: number }): number {
  if (!(x > 0)) return 0;
  const sigma = Math.max(SIZE_SIGMA_FLOOR, Number.isFinite(r.hi) && r.lo > 0 ? Math.log(r.hi / r.lo) / 2 : SIZE_SIGMA_FLOOR);
  const z = x > r.hi ? Math.log(x / r.hi) / sigma : x < r.lo ? Math.log(r.lo / x) / sigma : 0;
  return Math.exp(-z * z / 2);
}
/** the stated term for a range: fit 1 gives `inV`, fit 0 gives `outV`, linear between (so the span in..out is today's span) */
const fitV = (fit: number, inV: number, outV: number) => outV + fit * (inV - outV);
const AXES = ['natural', 'lush', 'colourful', 'ordered'] as const;

/** Does the person's own word (not a vote) speak about this candidate at all? Drives the learned cap. */
export const hasStated = (pf: QuickPrefs): boolean =>
  !!(pf.sizeGal || pf.floorSqIn || pf.heightIn || pf.plants || pf.budgetUsd || pf.careMinPerWeek || Object.keys(pf.look).length || pf.arch.interested.length || pf.arch.avoid.length || Object.keys(pf.told ?? {}).length);

export function scoreBreakdown(i: ScoreInput): ScoreBreakdown {
  const { pf, S, facts, features } = i, terms: ScoreTerm[] = [], add = (name: string, v: number, group: ScoreTerm['group'], why?: string) => { if (v) terms.push({ name, v, group, ...(why ? { why } : {}) }); };
  const ax = designAxes(S), g = facts.gallons, plants = S.items.filter(x => x.kind === 'plant').length;
  // ---- stated: ranges (a preferred range, never a bound)
  if (pf.sizeGal && g != null) { const f = rangeFit(g, pf.sizeGal.value); add('size', fitV(f, STATED.sizeIn, STATED.sizeOut), 'stated', `${g} gal vs preferred ${pf.sizeGal.value.lo}-${pf.sizeGal.value.hi}: fit ${f.toFixed(2)}`); }
  if (pf.floorSqIn) { const v = S.tank.L * S.tank.D / (25.4 * 25.4), f = rangeFit(v, pf.floorSqIn.value); add('floor', fitV(f, STATED.floorIn, STATED.floorOut), 'stated', `${Math.round(v)} sq in: fit ${f.toFixed(2)}`); }
  if (pf.heightIn) { const v = S.tank.H / 25.4, f = rangeFit(v, pf.heightIn.value); add('height', fitV(f, STATED.heightIn, STATED.heightOut), 'stated', `${v.toFixed(1)} in: fit ${f.toFixed(2)}`); }
  if (pf.plants?.strength === 'prefer') add('plants', (pf.plants.value === 'live') === (plants >= 6) ? STATED.plantsFit : STATED.plantsMiss, 'stated');
  // ---- stated: a cost or care TARGET ranks the candidates over it lower in proportion to how far over (a firm maximum already filtered)
  const over = (t: number, x: number) => t > 0 && x > t ? Math.min(1, x / t - 1) : 0;
  if (pf.budgetUsd?.strength === 'prefer') add('cost target', -STATED.overTarget * over(pf.budgetUsd.value, i.totals.setupUsd), 'stated', `$${Math.round(i.totals.setupUsd)} vs target $${pf.budgetUsd.value}`);
  if (pf.careMinPerWeek?.strength === 'prefer') add('care target', -STATED.overTarget * over(pf.careMinPerWeek.value, i.totals.minPerWeek), 'stated', `${Math.round(i.totals.minPerWeek)} min vs target ${pf.careMinPerWeek.value}`);
  // ---- stated: the look cards. Archetype (layout first, then family): Interested +, Avoid -; the four look axes against what the design actually is
  const lay = pf.arch.layouts[i.archetypeId], fam = pf.arch.families[i.familyId];
  if (lay) add('card layout', lay * STATED.layout, 'stated', i.archetypeId); else if (fam) add('card family', fam * STATED.family, 'stated', i.familyId);
  for (const a of AXES) { const w = pf.look[a]; if (w) add(`look:${a}`, w * ax[a] * STATED.axis, 'stated', `${w > 0 ? 'wants' : 'avoids'} ${a} x design ${ax[a].toFixed(2)}`); }
  for (const [k, v] of Object.entries(pf.told ?? {})) if (features.includes(k)) add(`told ${k}`, v * STATED.told, 'stated');
  // ---- learned: aspect weights from events (never the told ones), plus attribute-pick thumbs; capped
  let learnedRaw = 0; for (const k of features) { const w = i.weights.get(k); if (w && w.source === 'learned') learnedRaw += w.w; }
  const thumbs = thumbBonus(i.thumbs, S, facts as CandidateFacts); learnedRaw += thumbs;
  const lean = leanBonus(i.lean, i.totals.setupUsd, facts.monthlyUsd?.mean); learnedRaw += lean.v;
  const cap = hasStated(pf) ? LEARNED_CAP_WITH_STATED : LEARNED_CAP, learned = Math.max(-cap, Math.min(cap, learnedRaw));
  add('learned', learned, 'learned', `votes ${(learnedRaw - thumbs - lean.v).toFixed(2)} + attribute picks ${thumbs.toFixed(2)} + cost lean ${lean.v.toFixed(2)}${lean.why ? ` (${lean.why})` : ''}, capped at ${cap}`);
  const stated = terms.filter(t => t.group === 'stated').reduce((t, x) => t + x.v, 0);
  return { total: stated + learned, stated, learned, learnedRaw, cap, terms, axes: { natural: ax.natural, lush: ax.lush, colourful: ax.colourful, ordered: ax.ordered, rockWood: ax.rockWood, plantMode: ax.plantMode } };
}
