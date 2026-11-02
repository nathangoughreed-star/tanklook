// What the brief's choices cost, read from the engines that already know (lane U3): no numbers are worked out here.
//  - evaluateAnimals: the locked animals' smallest tank (ui/stockPlanLogic planFor) and the cheapest finished build for it (scene/builds buildsFor),
//    against the budget ceiling, so "goldfish + $200" is answered BEFORE anything is proposed.
//  - consequence: the tank on screen's totals against the brief's limits, through scene/constraints compliance.
import { getSpecies } from '../data/species';
import { demandOf, type DemandOpts } from '../demand/engine';
import type { UserProfile } from '../demand/types';
import { suggestSetups, type Proposal } from '../demand/suggest';
import { loadProfile } from './demandPanel';
import { compliance, type Constraints } from '../scene/constraints';
import type { Units, TankSetup } from '../scene/types';
import { planFor } from './stockPlanLogic';
import { briefToWants, rangeOf, type Brief as SceneBrief } from '../scene/brief';
import { adaptToTank, stockingChange } from '../scene/reeval';
import { applyChange, feasibilityOf, type Feasibility } from '../scene/project';
import type { Tank } from '../scene/types';
import { budgetOf, lockedStock, spaceOf, type Brief } from './setupBrief';

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export interface Evaluation { gal?: number; tank?: string; cheapestUsd?: number; fits?: boolean; text: string }
/** The cheapest honest build for the locked animals, from the generator itself (the same figure the Suggest panel's "no setup fits" card shows: one source). Money limits off, everything else the brief says kept. Remembered per brief. */
const CHEAP = new Map<string, Proposal | null>();
function cheapestFor(b: Brief): Proposal | undefined {
  const w = briefToWants(b), c = w.constraints, off = <T extends { on: boolean }>(x: T | undefined) => x ? { ...x, on: false } : undefined;
  const key = JSON.stringify({ a: w.animals, o: w.owned, t: w.ownTank?.id, x: w.taxPct, s: w.needStand, sp: w.space, h: w.hightech, sc: c.space });
  if (!CHEAP.has(key)) {
    if (CHEAP.size > 20) CHEAP.clear();
    const r = suggestSetups({ ...w, mins: undefined, tankGal: undefined, startupTarget: undefined, setupHoursTarget: undefined, phased: false, constraints: { ...c, startupUsd: off(c.startupUsd), monthlyUsd: off(c.monthlyUsd), minutesPerWeek: off(c.minutesPerWeek) } }, loadProfile(), 'in');
    CHEAP.set(key, r.cheapest ?? r.proposals[0] ?? null);
  }
  return CHEAP.get(key) ?? undefined;
}
/** The locked animals against the budget: the cheapest welfare-appropriate build (the generator's, all-in) and whether that is within the ceiling. */
export function evaluateAnimals(b: Brief): Evaluation {
  const animals = lockedStock(b).filter(v => getSpecies(v.species));
  if (!animals.length) return { text: '' };
  const plan = planFor(animals.map(a => ({ id: a.species, n: a.n })));
  if (!plan.need?.tank) return { text: 'These animals do not live in a tank from the catalogue, so a cost cannot be read yet.' };
  const p = cheapestFor(b);
  if (!p) return { gal: plan.need.tank.ratedGal, tank: plan.need.tank.name, text: 'No welfare-appropriate setup for these animals can be built with the other things the brief says.' };
  const m = p.build.tank, price = p.totals.startupUsd, cap = budgetOf(b);
  const base = `The cheapest welfare-appropriate build is ${usd(price)} all-in, in a ${Math.round(m.ratedGal)} gal tank.`;
  if (cap === undefined) return { gal: m.ratedGal, tank: m.name, cheapestUsd: price, text: base };
  const fits = price <= cap;
  return { gal: m.ratedGal, tank: m.name, cheapestUsd: price, fits,
    text: `${base} ${fits ? `That is within your ${usd(cap)} ceiling, with ${usd(cap - price)} to spare.` : `That is ${usd(price - cap)} over your ${usd(cap)} ceiling: the animals' needs are not changed to fit it. Raise the ceiling, use gear you own, or pick other animals.`}` };
}

/** The brief's limits as the guardrail shape the tank stores (U1's adapter). */
export const constraintsFrom = (b: Brief): Constraints => briefToWants(b).constraints;
/** The tank on screen against the brief's limits: its totals, and how they stand against the ceiling, time and space. */
export function consequence(T: TankSetup, b: Brief, P: UserProfile, units: Units, kit?: DemandOpts['kit']): { totals: string; line?: string; over: boolean } {
  const D = demandOf(T, P, kit ? { kit } : {}), t = D.totals; // `kit`: a pinned starter-kit price (demand/pinned.ts pinnedKit), as the demand panel prices it
  const totals = `${usd(t.setupUsd)} to set up, ${usd(t.upkeepUsdMo)} a month, ${Math.round(t.minPerWeek)} min a week`;
  const c = constraintsFrom(b), lo = rangeOf(b, 'constraints.budget').min, under = lo !== undefined && t.setupUsd < lo;
  if (!Object.keys(c).length) return under ? { totals, line: `Set-up ${usd(t.setupUsd)} is under your ${usd(lo!)} minimum.`, over: false } : { totals, over: false };
  const S = { constraints: c, layout: { ...T.layout, space: spaceOf(b) ?? T.layout.space }, tank: T.tank };
  const r = compliance(S, t, P.limits, units);
  return { totals, line: under ? `${r.line ? r.line + ' ' : ''}Set-up ${usd(t.setupUsd)} is under your ${usd(lo!)} minimum.` : r.line, over: r.over > 0 };
}

// ---- lane GS6 (2026-11-02): re-evaluation instead of replacement ----
/** What a change to the tank did to the design, for the brief bar to show: plain sentences, and a named warning when the animals are over for the new tank. */
export interface ReevalNote { lines: string[]; warning?: string }
const noteListeners = new Set<(n: ReevalNote) => void>();
export const onReeval = (fn: (n: ReevalNote) => void) => { noteListeners.add(fn); return () => { noteListeners.delete(fn); }; };
/** The tank's dimensions change inside a store edit: the same pieces are scaled, repositioned and thinned (scene/reeval.ts adaptToTank), never regenerated, and the stocking is re-assessed
 *  with a named warning when over. A slider drag (`thin` false) only moves and scales; thinning waits for a discrete choice, so dragging back and forth loses nothing. */
export function adaptForEdit(s: TankSetup, next: Tank, thin: boolean): void {
  const before = s.fish.length && thin ? structuredClone(s) : undefined, rep = adaptToTank(s, next, { thin });
  if (!rep.lines.length) return;
  const stock = before ? stockingChange(before, s) : undefined, note: ReevalNote = { lines: rep.lines, ...(stock?.warning ? { warning: stock.warning } : {}) };
  queueMicrotask(() => noteListeners.forEach(fn => fn(note)));
}
/** What was asked for but cannot work as things stand: each is kept in the project with the reason and the viable adjustments, never dropped (Nathan 2026-11-02). */
export function retainedHtml(f: Feasibility, esc: (s: string) => string): string {
  if (!f.retained.length) return '';
  return `<div class="bbKeep" role="status"><b>Kept as your request, but it cannot work as things stand:</b><ul>${f.retained.map((r, i) => `<li class="${r.severity}"><span><b>${esc(r.what)}.</b> ${esc(r.reason)}</span>${r.fixes.map((x, j) => `<button type="button" data-keepfix="${i}.${j}">${esc(x.label)}</button>`).join('')}</li>`).join('')}</ul></div>`;
}
/** Apply one of the offered adjustments (the person's click); everything else in the project stays. */
export function applyRetainedFix(b: SceneBrief, f: Feasibility, key: string): SceneBrief | undefined {
  const [i, j] = key.split('.').map(Number), fix = f.retained[i]?.fixes[j];
  return fix ? applyChange(b, fix.patch).state : undefined;
}
export const feasibilityNow = (b: SceneBrief, T?: TankSetup): Feasibility => feasibilityOf(b, T?.product ? { product: T.product } : undefined);
