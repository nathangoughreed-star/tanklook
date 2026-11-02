// Explore, stage X1 (lane OX3): the FIRM GATE, run on every candidate BEFORE anything is shown (spec section 6, reconcile section 3.3, Nathan 2026-11-02 Q1-Q4).
// Constraints decide what may be recommended; preferences decide priority: nothing here reads a preference or a taste (the function takes none, so a purity test can prove it).
// Three verdicts:
//   eligible    welfare passes AND every FIRM limit holds on the conservative (upper) end of its range AND no essential figure is missing  -> the recommendation set
//   provisional welfare passes and nothing is broken, but a firm limit is only met on the mean, or on a stated estimate within NEAR_CAP of the cap, or welfare has a "not enough information"
//               line, or the world's figures are not from the aquarium model yet (Q2)                                                          -> a separate, marked strip, never "fits your budget"
//   blocked     any firm limit over on the mean, welfare failed, a Required item not honoured, a species without support data, brackish (Q3)   -> never shown, only counted and explained
// A flexible limit never filters: it is recorded as 'over' (the card says "over your target") but never changes the verdict. A limit nobody set is 'unknown': it neither filters nor certifies.
import { getSpecies } from '../data/species';
import { CARE } from '../data/care';
import { tankFromModel, type TankModel } from '../data/tanks';
import { spaceFit } from '../scene/space';
import type { Env, Water } from '../scene/archetypes';
import type { ConceptEval, Wants } from '../demand/suggest';
import type { AnimalCount } from '../scene/tankfit';
import type { Estimate, Range } from './estimate';
import { BRACKISH_ROSTER_READY, NEAR_CAP, WORLD_MODEL_READY } from './constants';

export type Verdict = 'eligible' | 'provisional' | 'blocked';
export type GateId = 'welfare' | 'equipment' | 'world' | 'budget' | 'monthly' | 'care' | 'setup' | 'space' | 'size' | 'lower';
/** pass = holds; over = broken (a firm limit: blocks; a flexible one: shown as over the target); uncertain = holds on the mean but not on the conservative end / the estimate is too close to call; unknown = no limit was set (or the figure is missing): neither filters nor certifies */
export type GateState = 'pass' | 'over' | 'uncertain' | 'unknown';
export interface GateResult { id: GateId; kind: 'firm' | 'flexible' | 'rule' | 'none'; state: GateState; text: string; cap?: number; mean?: number; hi?: number }
export interface Reason { gate: GateId; severity: 'blocked' | 'provisional'; text: string }
export interface GateVerdict { verdict: Verdict; gates: GateResult[]; reasons: Reason[]; /** limits nobody set, worded for the card's assumptions list */ assumptions: string[] }
export interface GateInput { w: Wants; ev: ConceptEval; est: Estimate; world: Env; water: Water; tank: TankModel; roster: AnimalCount[]; /** the roster fits the tank by the stocking screen's own fit (tankfit `fitIn`: no fails) */ holds: boolean }

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US'), min = (n: number) => `${Math.round(n)} min`;

export function gateCandidate(x: GateInput): GateVerdict {
  const { w, ev, est, world, water, tank, roster } = x, C = w.constraints, fx = w.flexLimits ?? {};
  const gates: GateResult[] = [], reasons: Reason[] = [], assumptions: string[] = [];
  const block = (gate: GateId, text: string) => reasons.push({ gate, severity: 'blocked', text });
  const soft = (gate: GateId, text: string) => reasons.push({ gate, severity: 'provisional', text });

  // ---- welfare: an independent gate (never traded for money or time, never flexible) ----
  const lacking = roster.filter(a => !getSpecies(a.species) || !CARE[a.species]).map(a => a.species);
  if (!roster.length) { gates.push({ id: 'welfare', kind: 'rule', state: 'over', text: 'No animals suit this setup.' }); block('welfare', 'No animals suit this setup, and a complete setup needs animals.'); }
  else if (lacking.length) { gates.push({ id: 'welfare', kind: 'rule', state: 'over', text: `No care data for ${lacking.join(', ')}.` }); block('welfare', `No care data for ${lacking.join(', ')}: it cannot be checked, so it is not recommended.`); }
  else if (!x.holds || !ev.needsOk || ev.welfareWords.length) {
    const t = ev.welfareWords[0] ?? (!x.holds ? 'These animals do not fit this tank by the stocking rules.' : "The filtration or space is past what this build's gear allows.");
    gates.push({ id: 'welfare', kind: 'rule', state: 'over', text: t }); block('welfare', t);
  } else if (ev.unknown.length) { const t = `Not enough information: ${ev.unknown[0]}`; gates.push({ id: 'welfare', kind: 'rule', state: 'uncertain', text: t }); soft('welfare', `${t} (unconfirmed, so it is not certified).`); }
  else gates.push({ id: 'welfare', kind: 'rule', state: 'pass', text: 'Passes the stocking rules.' });

  // ---- the world: brackish has no roster (Q3); terrarium / paludarium figures are not from the aquarium model yet (Q2) ----
  if (water === 'brackish' && !BRACKISH_ROSTER_READY) { gates.push({ id: 'world', kind: 'rule', state: 'over', text: 'No brackish animals are in the data yet.' }); block('world', 'No brackish animals are in the data yet, so a brackish setup cannot be stocked honestly.'); }
  else if (!WORLD_MODEL_READY[world]) { const t = `A ${world}'s cost and care figures do not come from the aquarium model yet.`; gates.push({ id: 'world', kind: 'rule', state: 'uncertain', text: t }); soft('world', `${t} It is shown as provisional.`); }
  else gates.push({ id: 'world', kind: 'rule', state: 'pass', text: `A ${water} ${world}.` });

  // ---- Required equipment: the Required tank is the tank of every candidate and must hold the roster ----
  if (w.ownTank) {
    const ok = tank.id === w.ownTank.id && x.holds;
    gates.push({ id: 'equipment', kind: 'rule', state: ok ? 'pass' : 'over', text: ok ? 'Uses your Required tank.' : 'Your Required tank does not suit this setup.' });
    if (!ok) block('equipment', 'Your Required tank does not suit this setup.');
  } else gates.push({ id: 'equipment', kind: 'rule', state: 'pass', text: w.availTank ? 'Your Available tank may be used or replaced.' : 'No equipment is Required.' });

  // ---- the numeric limits: certified on the UPPER end of the range; unset = unknown ----
  const numeric = (id: GateId, label: string, cap: number | undefined, flex: boolean, r: Range, conf: 'validated' | 'provisional', fmt: (n: number) => string, unit: string) => {
    if (cap === undefined || !(cap > 0)) { gates.push({ id, kind: 'none', state: 'unknown', text: `No ${label} limit set.` }); assumptions.push(`No ${label} limit is set, so none was applied.`); return; }
    const kind = flex ? 'flexible' : 'firm', over = r.mean > cap, hiOver = r.hi > cap, near = conf === 'provisional' && r.hi > cap * (1 - NEAR_CAP);
    const state: GateState = over ? 'over' : hiOver || near ? 'uncertain' : 'pass';
    const text = over ? `${fmt(r.mean)}${unit} against ${flex ? 'a target' : 'a firm limit'} of ${fmt(cap)}${unit}.` : hiOver ? `About ${fmt(r.mean)}${unit}, up to ${fmt(r.hi)}${unit}: over ${fmt(cap)}${unit} at the high end.` : near ? `About ${fmt(r.mean)}${unit}, up to ${fmt(r.hi)}${unit}: an estimate within ${Math.round(NEAR_CAP * 100)} % of ${fmt(cap)}${unit}.` : `Up to ${fmt(r.hi)}${unit} against ${fmt(cap)}${unit}.`;
    gates.push({ id, kind, state, text, cap, mean: r.mean, hi: r.hi });
    if (flex) return;   // a flexible limit ranks and warns elsewhere (suggest.ts flexReview); it is never a filter
    if (over) block(id, `${label[0].toUpperCase()}${label.slice(1)}: ${text}`);
    else if (state === 'uncertain') soft(id, `${label[0].toUpperCase()}${label.slice(1)}: ${text} It is an estimate, so it is not certified.`);
  };
  numeric('budget', 'set-up budget', C.startupUsd?.on ? C.startupUsd.value : undefined, !!fx.startupUsd, est.startupUsd, est.figures.startup.conf, usd, '');
  numeric('monthly', 'monthly', C.monthlyUsd?.on ? C.monthlyUsd.value : undefined, !!fx.monthlyUsd, est.monthlyUsd, est.figures.monthly.conf, usd, ' a month');
  numeric('care', 'care-time', C.minutesPerWeek?.on ? C.minutesPerWeek.value : undefined, !!fx.minPerWeek, est.minPerWeek, est.figures.care.conf, min, ' a week');
  numeric('setup', 'set-up time', w.setupHours, !!fx.setupHours, est.setupHours, est.figures.setup.conf, n => `${Math.round(n * 10) / 10} h`, '');

  // ---- space and the tank's size: exact, no estimate in them ----
  const space = C.space?.on === false ? undefined : w.space;
  if (!space) { gates.push({ id: 'space', kind: 'none', state: 'unknown', text: 'No space limit set.' }); assumptions.push('No space limit is set, so no size was checked against your room.'); }
  else {
    const fits = spaceFit(tankFromModel(tank), space).fits, flex = !!fx.space;
    gates.push({ id: 'space', kind: flex ? 'flexible' : 'firm', state: fits ? 'pass' : 'over', text: fits ? 'Fits your space.' : 'Does not fit your space.' });
    if (!fits && !flex) block('space', 'It does not fit your space.');
  }
  const g = w.tankGal, tooLong = w.maxLengthMm !== undefined && tank.outer.L > w.maxLengthMm, galBad = !!g && ((g.min !== undefined && tank.ratedGal < g.min) || (g.max !== undefined && tank.ratedGal > g.max));
  if (tooLong || galBad) { gates.push({ id: 'size', kind: 'firm', state: 'over', text: tooLong ? 'Longer than you allowed.' : 'Outside the tank size range you set.' }); block('size', tooLong ? 'The tank is longer than you allowed.' : 'The tank is outside the size range you set.'); }
  else gates.push({ id: 'size', kind: g || w.maxLengthMm !== undefined ? 'firm' : 'none', state: g || w.maxLengthMm !== undefined ? 'pass' : 'unknown', text: g || w.maxLengthMm !== undefined ? 'Within your size range.' : 'No tank size range set.' });

  // ---- lower bounds ("do not offer builds under this"): a figure under a firm floor is not offered ----
  const lo = w.mins, under: string[] = [];
  if (lo) {
    if (lo.startupUsd !== undefined && !fx.startupUsd && est.startupUsd.mean < lo.startupUsd) under.push(`set-up under your ${usd(lo.startupUsd)} floor`);
    if (lo.monthlyUsd !== undefined && !fx.monthlyUsd && est.monthlyUsd.mean < lo.monthlyUsd) under.push(`upkeep under your ${usd(lo.monthlyUsd)} a month floor`);
    if (lo.minPerWeek !== undefined && !fx.minPerWeek && est.minPerWeek.mean < lo.minPerWeek) under.push(`care under your ${lo.minPerWeek} min a week floor`);
    if (lo.setupHours !== undefined && !fx.setupHours && est.setupHours.mean < lo.setupHours) under.push(`set-up time under your ${lo.setupHours} h floor`);
  }
  if (under.length) { gates.push({ id: 'lower', kind: 'firm', state: 'over', text: under.join('; ') }); block('lower', `Under a lower bound you set: ${under.join('; ')}.`); }

  const verdict: Verdict = reasons.some(r => r.severity === 'blocked') ? 'blocked' : reasons.length ? 'provisional' : 'eligible';
  return { verdict, gates, reasons, assumptions };
}
