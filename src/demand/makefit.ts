// Find solutions v1 (lane C3, 2026-10-27, Nathan's guardrails design). Pure and on demand (a click, never every edit): when an
// enabled guardrail is over, try a short list of levers on COPIES of the scene and re-check every candidate against ALL enabled
// guardrails (compliance(), C2) AND the husbandry categories (ui/stockSummary.ts). Nathan's solver rules, binding:
//  - a candidate that creates a new husbandry Problem (six fish to three breaks the social group; a bigger tank that fixes crowding
//    but breaks space or upkeep) is never offered as a solution; it is listed under `rejected` with the reason;
//  - "compliant" = every enabled guardrail passes on KNOWN data; an unknown guardrail is never green;
//  - a candidate that fails only a money / time cap goes in a separate "needs +$X / +N min" group, never the compliant one;
//  - a lever is credited only where the existing model supports it: the demand engine's own totals decide (a bigger filter is not a
//    lever and earns no time credit; the auto water changer is a model gap and is not offered; the feeder saves what the engine's
//    refill row says, weekly minutes only, not daily attention);
//  - few, trustworthy options: Pareto-filtered on set-up $, $/month, min/week and animals removed; nothing is padded to a count;
//  - when nothing satisfies all enabled guardrails the answer says so ("No available suggestions ..."), never "impossible".
// Levers (only these): undo the last change; fewer of a species (each species, last-added first); the water-change hose; the
// automatic feeder; the next catalogue tank size. Numbers, thresholds and oracles are untouched; every figure is the engine's.
import { compliance, effectiveLimits, type Compliance } from '../scene/constraints';
import { catalogueSizes, tankLabel } from '../scene/tankfit';
import { choiceOf, filterState, rowsFor, techOf, withChoice } from '../scene/tech';
import { volume } from '../scene/physics';
import type { TankSetup, Units } from '../scene/types';
import { getSpecies } from '../data/species';
import { summaryOf } from '../ui/stockSummary';
import { minOf } from '../ui/stockPlanLogic';
import { demandOf, type DemandOpts } from './engine';
import type { UserProfile } from './types';

export type Lever = 'undo' | 'fewer' | 'hose' | 'feeder' | 'tank';
export interface Money { startupUsd: number; monthlyUsd: number; minPerWeek: number }
export interface Option {
  id: string; lever: Lever; title: string; detail: string;
  scene: TankSetup;
  totals: Money;
  /** this option minus the current scene (negative = cheaper / less work) */
  delta: Money;
  /** animals taken out (0 for the gear levers): how far it moves from the current stocking */
  removed: number;
  /** every enabled guardrail with its state after the change */
  status: Compliance['results'];
  /** the amount each money / time cap must be RAISED for this option to be compliant (absent = already within it) */
  needs: Partial<Money>;
  /** husbandry lines that are Problems here and were not before (empty on every offered option) */
  newProblems: string[];
  /** husbandry lines that read "not enough information" here and did not before (the option is offered, with this caveat) */
  newUnknown: string[];
  /** the saving rests on minute figures that are estimates (all of them are, today) */
  estimate: boolean;
}
export interface Solutions {
  /** why there is nothing to solve: the scene is not over any enabled guardrail */
  status: 'over' | 'within' | 'unknown' | 'off';
  compliant: Option[];
  needsRelaxing: Option[];
  /** tried and refused for a new husbandry Problem or a broken guardrail, with the reason (at most a few, for the no-suggestion card) */
  rejected: { title: string; reason: string }[];
  message?: string;
}

export interface FindOpts {
  /** the engine's own options (pinned kit, deal prices) for the CURRENT scene */
  demand?: DemandOpts;
  units?: Units;
  /** the tank as it was before the last change (store history), for the undo lever */
  previous?: TankSetup;
  /** cap on candidates evaluated (each is a demandOf + stockSummary) */
  maxTries?: number;
}

export const NO_SUGGESTION = 'No available suggestions satisfy all your enabled guardrails.';

const totalsOf = (S: TankSetup, P: UserProfile, o: DemandOpts): Money => { const t = demandOf(S, P, o).totals; return { startupUsd: t.setupUsd, monthlyUsd: t.upkeepUsdMo, minPerWeek: t.minPerWeek }; };
/** Husbandry Problems / unknown lines per category (counted, not matched by wording: a count in the text changes with the stocking). */
interface Husb { p: Map<string, string[]>; u: Map<string, string[]> }
const husbOf = (S: TankSetup, units: Units): Husb => { const h: Husb = { p: new Map(), u: new Map() };
  for (const c of summaryOf(S, units).cats) for (const i of c.items) { const m = i.level === 'problem' ? h.p : i.level === 'unknown' ? h.u : undefined; if (m) m.set(c.id, [...(m.get(c.id) ?? []), i.text]); }
  return h; };
/** Lines in `to` beyond what `from` has in the same category. */
const moreIn = (to: Map<string, string[]>, from: Map<string, string[]>) => [...to].flatMap(([k, v]) => v.length > (from.get(k)?.length ?? 0) ? [v[0]] : []);
const fewerIn = (to: Map<string, string[]>, from: Map<string, string[]>) => [...from].some(([k, v]) => v.length > (to.get(k)?.length ?? 0));
const sig = (S: TankSetup) => JSON.stringify([S.fish.map(f => [f.id, f.species]), S.items.length, S.tank, S.tech]);
/** Fewer animals of a species that leave 1..min-1 of it (below its recommended group) is a social-group break, the one husbandry
 *  regression the summary words as a caution, not a Problem (Nathan: six fish to three that breaks the minimum group is no solution). */
const countsOf = (S: TankSetup) => { const m = new Map<string, number>(); for (const f of S.fish) m.set(f.species, (m.get(f.species) ?? 0) + 1); return m; };
const groupBreaks = (S: TankSetup, was: Map<string, number>) => [...countsOf(S)].filter(([id, n]) => n < (was.get(id) ?? 0) && n < minOf(id))
  .map(([id, n]) => `${getSpecies(id)?.name ?? id}: a group of ${n} is under its recommended minimum of ${minOf(id)}`);
const CAP_OF: Record<string, keyof Money | undefined> = { startup: 'startupUsd', monthly: 'monthlyUsd', time: 'minPerWeek' };

export function findSolutions(S: TankSetup, P0: UserProfile, o: FindOpts = {}): Solutions {
  const units = o.units ?? 'cm', demand = o.demand ?? {};
  const P: UserProfile = { ...P0, limits: effectiveLimits(S, P0.limits) };
  const base = totalsOf(S, P, demand), c0 = compliance(S, { setupUsd: base.startupUsd, upkeepUsdMo: base.monthlyUsd, minPerWeek: base.minPerWeek }, P.limits, units);
  const out: Solutions = { status: c0.overall, compliant: [], needsRelaxing: [], rejected: [] };
  if (c0.overall !== 'over') return out;
  const b0 = husbOf(S, units), bExplicit = S.tech ? b0 : husbOf({ ...S, tech: techOf(S) }, units), was = countsOf(S);

  type Cand = { lever: Lever; title: string; detail: string; scene: TankSetup; removed: number; demand: DemandOpts };
  const cands: Cand[] = [], seen = new Set<string>([sig(S)]);
  const push = (c: Cand) => { const k = sig(c.scene); if (seen.has(k)) return; seen.add(k); cands.push(c); };

  // undo the last change
  if (o.previous) { const pv = { ...o.previous, constraints: S.constraints, layout: { ...o.previous.layout, space: S.layout.space } };
    push({ lever: 'undo', title: 'Undo your last change', detail: 'Go back to the tank as it was before your last edit.', scene: pv, removed: Math.max(0, S.fish.length - pv.fish.length), demand }); }

  // fewer of a species: every species, last-added first, one fewer down to none
  const lastId = new Map<string, number>(), count = new Map<string, number>();
  for (const f of S.fish) { lastId.set(f.species, Math.max(lastId.get(f.species) ?? 0, f.id)); count.set(f.species, (count.get(f.species) ?? 0) + 1); }
  const species = [...count.keys()].sort((a, b) => lastId.get(b)! - lastId.get(a)!);
  species.forEach((id, rank) => {
    const n = count.get(id)!, name = getSpecies(id)?.name ?? id, mine = S.fish.filter(f => f.species === id).sort((a, b) => b.id - a.id);
    for (let k = 1; k <= n; k++) {
      const drop = new Set(mine.slice(0, k).map(f => f.id));
      push({ lever: 'fewer', title: k === n ? `No ${name}` : `${n - k} ${name} instead of ${n}`, detail: rank === 0 ? 'The species you added last.' : 'Fewer of this species.', scene: { ...S, fish: S.fish.filter(f => !drop.has(f.id)) }, removed: k, demand });
    }
  });

  // gear that saves work in the engine's own rows
  for (const [row, opt, title, detail] of [['wcmethod', 'hose', 'Water-change hose', 'Drains and fills from the tap: no buckets to carry.'], ['feeder', 'auto', 'Automatic feeder', 'Drops the daily feeding trips; you refill it every few weeks. Weekly minutes only; the daily attention it saves is not modelled.']] as const) {
    if (!S.water.on || !rowsFor(S).some(r => r.id === row) || choiceOf(S, row) === opt) continue;
    // a gear change writes the whole inferred tech out, so the assumed filter of a no-filter tank (filterState 'unset') would become the owner's choice: say so
    const note = filterState(S) === 'unset' && !S.tech ? ' It also records the filter the budget assumed (a default one) as your choice: you have not picked a filter yet.' : '';
    push({ lever: row === 'wcmethod' ? 'hose' : 'feeder', title, detail: detail + note, scene: { ...S, tech: withChoice(S, row, opt) }, removed: 0, demand });
  }

  // the next catalogue tank size (a pinned kit or deal prices the OLD tank, so the new one is priced by the engine's own rule)
  if (S.water.on) { const cur = volume(S.tank).litres, next = catalogueSizes(false).find(c => c.litres >= cur * 1.25);
    if (next) { const { product: _p, ...rest } = S; push({ lever: 'tank', title: `The next size up: ${tankLabel(next.m, units)}`, detail: 'More water on a bigger footprint; gear and animals stay as they are.', scene: { ...rest, tank: next.T }, removed: 0, demand: { ...demand, kit: undefined } }); } }

  const ok: Option[] = [], relax: Option[] = [];
  for (const c of cands.slice(0, o.maxTries ?? 400)) {
    const t = totalsOf(c.scene, P, c.demand), cp = compliance(c.scene, { setupUsd: t.startupUsd, upkeepUsdMo: t.monthlyUsd, minPerWeek: t.minPerWeek }, P.limits, units);
    // a gear lever writes the tank's tech out, which the summary reads more strictly than inferred gear: compare like with like
    const hs = husbOf(c.scene, units), bb = c.scene.tech && !S.tech ? bExplicit : b0;
    const newProblems = moreIn(hs.p, bb.p);
    newProblems.push(...groupBreaks(c.scene, was));
    const newUnknown = moreIn(hs.u, bb.u);
    const delta = { startupUsd: t.startupUsd - base.startupUsd, monthlyUsd: t.monthlyUsd - base.monthlyUsd, minPerWeek: t.minPerWeek - base.minPerWeek };
    // useful = it lowers a quantity whose guardrail is over now (rounded as shown), or clears a husbandry Problem the scene has now
    const helps = c0.results.some(r => r.state === 'over' && CAP_OF[r.id] && -delta[CAP_OF[r.id]!] >= (CAP_OF[r.id] === 'minPerWeek' ? 0.5 : 1)) || fewerIn(hs.p, bb.p);
    if (!helps) continue;
    const needs: Partial<Money> = {};
    for (const r of cp.results) if (r.state === 'over' && CAP_OF[r.id]) { const key = CAP_OF[r.id]!, cap = { startupUsd: P.limits.setupUsd, monthlyUsd: P.limits.upkeepUsd, minPerWeek: P.limits.minPerWeek }[key]; if (cap !== undefined) needs[key] = Math.ceil(t[key] - cap); }
    const opt: Option = { id: `${c.lever}:${c.title}`, lever: c.lever, title: c.title, detail: c.detail, scene: c.scene, totals: t, delta, removed: c.removed, status: cp.results, needs, newProblems, newUnknown, estimate: delta.minPerWeek !== 0 };
    const spaceOver = cp.results.some(r => r.id === 'space' && r.state !== 'pass');
    if (newProblems.length) { out.rejected.push({ title: c.title, reason: `breaks a husbandry requirement: ${newProblems[0]}` }); continue; }
    if (cp.overall === 'within') ok.push(opt);
    else if (!spaceOver && cp.unknown === 0 && Object.keys(needs).length) relax.push(opt);
    else if (spaceOver) out.rejected.push({ title: c.title, reason: 'does not fit your space' });
  }

  const dom = (a: number[], b: number[]) => a.every((x, i) => x <= b[i]) && a.some((x, i) => x < b[i]);
  const pareto = (xs: Option[], v: (o: Option) => number[]) => xs.filter(a => !xs.some(b => b !== a && dom(v(b), v(a))));
  const relaxSize = (x: Option) => (x.needs.startupUsd ?? 0) / 100 + (x.needs.monthlyUsd ?? 0) / 10 + (x.needs.minPerWeek ?? 0) / 10;
  out.compliant = pareto(ok, x => [x.delta.startupUsd, x.delta.monthlyUsd, x.delta.minPerWeek, x.removed]).sort((a, b) => a.removed - b.removed || a.delta.minPerWeek - b.delta.minPerWeek).slice(0, 4);
  out.needsRelaxing = pareto(relax, x => [x.needs.startupUsd ?? 0, x.needs.monthlyUsd ?? 0, x.needs.minPerWeek ?? 0, x.removed]).sort((a, b) => relaxSize(a) - relaxSize(b)).slice(0, 3);
  out.rejected = out.rejected.slice(0, 3);
  if (!out.compliant.length) out.message = NO_SUGGESTION;
  return out;
}
