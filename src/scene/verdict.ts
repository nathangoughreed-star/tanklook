// One verdict for the project on screen (lane DX1, discovery architecture 2026-11-09). Pure: composes the checks that already exist (stockingOf, summaryOf,
// herpCheck, growthCheck, ownedFit, conflictsOf, compliance) into four buckets that must never be confused:
//   gates      welfare + physical: the animals / the water / the room cannot do it. Never traded for money, never "optional". Block feasibility.
//   hard       the person's own hard limits (budget, upkeep, time, space). Block feasibility, but a different failure: money can fix it, welfare cannot.
//   targets    soft preferences (a flexible limit that is over): rank designs, never block.
//   advisories experience, caution-level notes, growth, "your light is not used": information.
// No generator, lock or start flow is involved: the same call judges a hand-built tank, a proposed stocking, or a discovery candidate.
import type { Brief } from './brief';
import { withSupplements } from './equipCredit';
import type { TankSetup } from './types';
import type { Limits } from '../demand/types';
import type { CostTotals } from './constraints';
import { compliance, effectiveLimits } from './constraints';
import { conflictsOf, constraintOf, requiredEquipment, type ConstraintId } from './project';
import { isOver, stockingOf } from './stocking';
import { summaryOf } from '../ui/stockSummary';
import { herpCheck, type StockIssue } from './herpcheck';
import { growthCheck } from './growcheck';
import { ownedFit } from './ownedFit';
import { lightFitNote } from './lightcheck';
import { getSpecies } from '../data/species';
import { volume } from './physics';
import { cabinetGear } from './cabinetGear';

export type VerdictTab = 'tank' | 'animals' | 'plants' | 'hardscape' | 'substrate' | 'equipment';
export interface Issue {
  /** stable across edits that do not change the problem (no numbers) */
  id: string;
  tab: VerdictTab;
  /** who it is about, as `fish:<id>`; empty = the whole project */
  uids: string[];
  /** one short line */
  text: string;
  /** the smallest relaxation, when there is one: said, never applied */
  relax?: string;
}
export interface Verdict { gates: Issue[]; hard: Issue[]; targets: Issue[]; advisories: Issue[]; feasible: boolean }
export interface VerdictOpts {
  /** the cost engine's expected totals, when known (the budget / upkeep / time checks need them; without, they are skipped) */
  totals?: CostTotals;
  /** the person's profile limits (a tank's own guardrails win over them) */
  limits?: Limits;
  units?: 'cm' | 'in';
}

const fishUids = (S: TankSetup, pred: (f: TankSetup['fish'][number]) => boolean = () => true) => S.fish.filter(pred).map(f => `fish:${f.id}`);
const GUARD_CONSTRAINT: Record<string, ConstraintId> = { startup: 'startup', monthly: 'ongoing', time: 'care', space: 'space' };

function compute(S: TankSetup, b: Brief, o: VerdictOpts): Verdict {
  const gates: Issue[] = [], hard: Issue[] = [], targets: Issue[] = [], advisories: Issue[] = [];
  const seen = new Set<string>();
  const put = (to: Issue[], i: Issue) => { if (!seen.has(i.text)) { seen.add(i.text); to.push(i); } };
  const bySpecies = (name: string) => fishUids(S, f => getSpecies(f.species)?.name === name);

  // ---- welfare / physical: stocking (room and filtration)
  if (S.fish.length) {
    const st = stockingOf(S), gal = volume(S.tank).gallons, pct = st.spacePercent;
    if (isOver(pct)) put(gates, { id: 'stock:room', tab: 'animals', uids: fishUids(S), text: `Too many animals for the room (${Number.isFinite(pct) ? Math.round(pct) : 'over 999'}% of it).`,
      relax: Number.isFinite(pct) ? `a tank of about ${Math.ceil(gal * pct / 100)} gal, or fewer animals` : 'a bigger tank or fewer animals' });
    else if (isOver(st.filtrationPercent)) put(gates, { id: 'stock:filter', tab: 'equipment', uids: fishUids(S), text: `The filtration is too little for these animals (${Math.round(st.filtrationPercent)}%).`, relax: 'a bigger filter, or fewer animals' });
  }
  // ---- welfare: the five husbandry categories (fullness is the line above)
  try {
    for (const c of summaryOf(S, o.units ?? 'cm').cats) {
      if (c.id === 'fullness') continue;
      for (const it of c.items) {
        if (it.level === 'problem') put(gates, { id: `cat:${c.id}`, tab: 'animals', uids: fishUids(S), text: it.text });
        else if (it.level === 'caution') put(advisories, { id: `cat:${c.id}:caution`, tab: 'animals', uids: fishUids(S), text: it.text });
      }
    }
  } catch { /* an unfinished scene has nothing to judge */ }
  // ---- welfare: reptiles and amphibians, growth
  const stock = (x: StockIssue, to: Issue[], id: string) => put(to, { id, tab: 'animals', uids: bySpecies(x.who), text: `${x.who}: ${x.text}` });
  for (const x of herpCheck(S)) stock(x, x.level === 'warn' ? gates : advisories, `herp:${x.level}`);
  for (const x of growthCheck(S)) stock(x, advisories, 'grow');
  // ---- the brief's conflicts: the animals against the water / the look / the enclosure
  for (const c of conflictsOf(b, S)) {
    const tab: VerdictTab = c.subject === 'animals' ? 'animals' : c.subject === 'equipment' ? 'equipment' : 'tank';
    const i: Issue = { id: `conflict:${c.id}`, tab, uids: c.species?.length ? c.species.flatMap(bySpecies) : [], text: c.text, ...(c.fixes[0] ? { relax: c.fixes[0].label } : {}) };
    if (c.severity !== 'hard') put(advisories, i);
    else if (c.kind === 'enclosure-vs-space') put(hard, i);   // the person's room limit, not the animals' welfare
    else put(gates, i);
  }
  // ---- owned gear against the design: a Required item that is too weak is a gate (CO2 and ferts do not add light); an owned-but-optional one is advice
  const required = new Set(requiredEquipment(b).map(i => i.key as string));
  let lightSaid = false;
  for (const n of ownedFit(S, b)) {
    if (n.id === 'tank:small') continue;   // the room gate above says it
    if (n.item === 'light') lightSaid = true;
    const weak = n.id.endsWith(':dim') || n.id.endsWith(':small');
    const i: Issue = { id: `gear:${n.id}`, tab: 'equipment', uids: [], text: n.text,
      ...(n.id === 'light:dim' ? { relax: 'plants that want less light, or a stronger light (CO2 and fertilizer do not add light)' } : n.id.endsWith(':small') ? { relax: `a bigger ${n.item}, or stop requiring this one` } : {}) };
    put(weak && required.has(n.item) ? gates : advisories, i);
  }
  // lane DX3: a Must-use item that is too small while the project allows no new equipment (or a Must-use tank too small): the project's own rules, so a hard failure with the reason
  try { const why = withSupplements(S, b).infeasible; if (why) put(hard, { id: 'equip:infeasible', tab: 'equipment', uids: [], text: why, relax: 'allow new equipment, or stop requiring that item' }); } catch { /* nothing to judge yet */ }
  if (!lightSaid) { const ln = lightFitNote(S); if (ln) put(advisories, { id: 'light:fit', tab: 'plants', uids: [], text: ln }); }
  // ---- gear that does not fit inside the cabinet stands beside it (lane CB1)
  try { for (const n of cabinetGear(S)?.notes ?? []) put(advisories, { id: `stand:gear:${n.includes('CO2') ? 'co2' : 'canister'}`, tab: 'tank', uids: [], text: n, relax: 'a taller or wider stand, or a smaller filter' }); } catch { /* nothing to judge yet */ }
  // ---- the person's limits: a hard limit that is over blocks, a flexible one only ranks
  if (o.totals || S.constraints || o.limits) {
    const lim = o.limits ?? {}, L = effectiveLimits(S, lim), cmp = compliance(S, o.totals, lim, o.units ?? 'cm');
    for (const r of cmp.results) {
      if (r.state !== 'over') continue;
      const c = constraintOf(b, GUARD_CONSTRAINT[r.id]), kind = c.unknown ? 'hard' : c.kind;   // a limit with no brief item is the tank's own guardrail: hard
      const v = r.id === 'startup' ? o.totals?.setupUsd : r.id === 'monthly' ? o.totals?.upkeepUsdMo : o.totals?.minPerWeek;
      const cap = r.id === 'startup' ? L.setupUsd : r.id === 'monthly' ? L.upkeepUsd : L.minPerWeek;
      const relax = r.id === 'space' ? 'a smaller tank, or a bigger space'
        : v !== undefined && cap !== undefined ? r.id === 'time' ? `raise the time limit to ${Math.ceil(v)} min a week` : `raise the ${r.id === 'startup' ? 'budget' : 'monthly limit'} by $${Math.ceil(v - cap)}` : undefined;
      put(kind === 'flexible' ? targets : hard, { id: `limit:${r.id}`, tab: r.id === 'space' ? 'tank' : 'equipment', uids: [], text: `${r.label}: ${r.text}`, ...(relax ? { relax } : {}) });
    }
  }
  return { gates, hard, targets, advisories, feasible: !gates.length && !hard.length };
}

// One-entry memo: the strip asks on every store change, the answer only moves when the project does. `rev` (DX0) when the tank has it, else the content.
let memo: { key: string; v: Verdict } | undefined;
const keyOf = (S: TankSetup, b: Brief, o: VerdictOpts): string => {
  const rev = (S as { rev?: number }).rev;
  return JSON.stringify([rev !== undefined ? rev : S, b, o.totals, o.limits, o.units]);
};

export function verdictOf(S: TankSetup, b: Brief, o: VerdictOpts = {}): Verdict {
  const key = keyOf(S, b, o);
  if (memo?.key === key) return memo.v;
  const v = compute(S, b, o);
  memo = { key, v };
  return v;
}
