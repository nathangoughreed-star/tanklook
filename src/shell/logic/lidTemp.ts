// LW1 (Nathan 2026-11-17, parity audit ranks 3 and 4): the old UI's open-top / lid warning and its heater / chiller "hold the temperature" warnings,
// back in the shell as Notes advisories, one-click fixes (NF1 registry, noteFixes.ts) and the Tank screen's lid group.
// Pure: no DOM. Reuses the engine as is (demand/lid.ts, data/lidNeed.ts, scene/temprange.ts, scene/tech.ts); no maths changes.
// The engine's verdict (scene/verdict.ts) does NOT carry these, so the shell adds them here, as Advice (never a gate, never blocks).
import type { Issue } from '../../scene/verdict';
import type { TankSetup, Units } from '../../scene/types';
import { emptyBrief } from '../../scene/brief';
import { lidAdvice } from '../../demand/lid';
import { defaultLid, lidFreeChosen, lidFreeProsCons, openTopProblem, setLidFree } from '../../data/lidNeed';
import { setLid, lidLocked } from '../../scene/tankEdit';
import { lidHeld } from './tank';
import { commitTech } from '../../scene/techEdit';
import { heatLoss, offerChiller, techOf, tempEvidence, withChoice, withUnits } from '../../scene/tech';
import { holdCheck, measuredCheck, operatingCheck, sharedRange } from '../../scene/temprange';
import { HEATER_MODELS } from '../../demand/gear';
import { getSpecies } from '../../data/species';

export type PriceOf = (S: TankSetup) => number;
const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
const degF = (c: number) => `${Math.round(c * 9 / 5 + 32)} °F`;
const temp = (c: number, us: boolean) => us ? degF(c) : `${Math.round(c * 2) / 2} °C`;
/** "(about $39)" from a priced dry run, or '' when the price is unknown or the change is free. */
const about = (price: PriceOf | undefined, before: TankSetup, after: TankSetup): string => {
  if (!price) return '';
  try { const d = price(after) - price(before); return d >= 0.5 ? ` (about ${usd(d)})` : ''; } catch { return ''; }
};

// ---------------------------------------------------------------- lid
export interface LidView {
  /** the open top has a problem: who needs a lid, in one sentence (lidAdvice's wording); undefined with a lid, or when nobody needs one */
  warn?: { text: string; kind: 'glass' | 'mesh' | 'hood' };
  /** the kit holds its own lid: nothing to add */
  held: boolean;
  /** the user chose to go without (stored in the brief) */
  lidFree: boolean;
}
export function lidView(S: TankSetup): LidView {
  const adv = lidAdvice(S), prob = openTopProblem(S), held = lidHeld(S).lid;
  const kind = adv?.lid ?? defaultLid(S);
  const text = adv?.text ?? (prob ? `${prob.text}.` : undefined);
  return { ...(text ? { warn: { text, kind } } : {}), held, lidFree: lidFreeChosen(S.brief) };
}
/** The lid note for the Notes drawer (Advice); empty when the top is closed or nobody needs one. */
export function lidIssues(S: TankSetup): Issue[] {
  const v = lidView(S);
  if (!v.warn || S.lid !== 'open') return [];
  return [{ id: 'lid:open', tab: 'tank', uids: [], text: (v.lidFree ? 'You chose no lid, but ' + v.warn.text.charAt(0).toLowerCase() + v.warn.text.slice(1) : v.warn.text)  }];
}
/** The lid, put on: the engine's own pick for these animals (glass on a wet tank, mesh on a dry one), and the "no lid" choice withdrawn. One edit. */
export function addLid(t: TankSetup): boolean {
  const k = lidAdvice(t)?.lid ?? defaultLid(t);   // the lid the note names (glass on a wet tank)
  if (t.lid !== 'open' || lidLocked(t.tank, lidHeld(t).lid, k)) return false;
  setLid(t, k);
  if (lidFreeChosen(t.brief)) t.brief = setLidFree(t.brief ?? emptyBrief(), false);
  return true;
}
/** The fix plan's ingredients for the open-top note: what it does, with the price; undefined when there is nothing to add or the lid is held. */
export function lidFix(S: TankSetup, price?: PriceOf): { what: string; describe: string; apply: (t: TankSetup) => void } | undefined {
  if (S.lid !== 'open') return undefined;
  const copy = structuredClone(S);
  if (!addLid(copy)) return undefined;
  const kind = copy.lid === 'mesh' ? 'mesh' : 'glass', p = about(price, S, copy);
  return {
    what: `Add a ${kind} top${p}`,
    describe: `Changes the lid from Open to a ${kind} top${p}. ${kind === 'glass' ? 'It keeps the animals in and the heat and water in.' : 'It keeps the animals in and lets air through.'} ${lidFreeChosen(S.brief) ? 'Your "no lid" choice is withdrawn. ' : ''}Nothing else changes.`.replace(/ +/g, ' ').trim(),
    apply: t => { addLid(t); },
  };
}
/** The lid-free pros and cons for this tank (the old panel's lists), with the engine's own heat-loss model. */
export const lidFreeView = (S: TankSetup) => lidFreeProsCons(S, l => heatLoss({ ...S, lid: l }).lossW);
/** Go without a lid on purpose (or withdraw that choice): the brief's flag only; the lid itself is the Lid buttons' business. */
export const setNoLid = (t: TankSetup, on: boolean): void => { t.brief = setLidFree(t.brief ?? emptyBrief(), on); };

// ---------------------------------------------------------------- temperature
const speciesOf = (S: TankSetup) => [...new Set(S.fish.map(f => f.species))].map(getSpecies).filter((x): x is NonNullable<typeof x> => !!x);
/** The old Tech menu's warnings, as Advice: the same four checks and the chiller line, on the same evidence (scene/tech.ts tempEvidence). Wet tanks only. */
export function tempIssues(S: TankSetup, units: Units = 'in'): Issue[] {
  if (!S.water.on) return [];
  const us = units === 'in', out: Issue[] = [], ev = tempEvidence(S, undefined, us);
  if (!ev) return out;
  const shared = sharedRange(speciesOf(S)), t = techOf(S), h = heatLoss(S, t);
  const add = (id: string, text: string, relax?: string) => out.push({ id, tab: 'equipment', uids: [], text, ...(relax ? { relax } : {}) });
  const bad = (k: { state: string } | null): boolean => !!k && (k.state === 'outside' || k.state === 'conditional');
  if (shared.range) {
    const op = operatingCheck(shared, ev), hold = holdCheck(ev), me = measuredCheck(shared, ev);
    if (bad(op)) add('temp:target', `${op.text}.`, op.fix);
    if (hold && bad(hold)) {
      const tg = ev.target!, id = tg > ev.room + 0.5 ? (!ev.heater ? 'temp:hold:noheater' : 'temp:hold:weak') : 'temp:hold:cool';
      add(id, `${hold.text}.`, hold.fix);
    }
    if (bad(me)) add('temp:measured', `${me!.text}.`, me!.fix);
  }
  if (offerChiller(S) && t.rows.chiller !== 'chiller' && !out.some(i => i.id === 'temp:hold:cool'))
    add('temp:chiller', `The room (${temp(h.roomC, us)}) is warmer than the tank should be (${temp(h.targetC, us)}): a chiller, or a cooler room.`, 'a chiller, or a cooler room');
  return out;
}
/** The same lines for the Equipment > Temperature control row (text only, in the order shown). */
export const tempLines = (S: TankSetup, units: Units = 'in'): string[] => tempIssues(S, units).map(i => i.text);

/** A bigger heater: the smallest generic class (gear-models.json) whose watts, times the heaters there are, cover the night need (heatLoss.needW), or two of one class. */
export function biggerHeater(S: TankSetup): { watts: number; n: number } | undefined {
  const h = heatLoss(S);
  if (h.units.some(u => u.builtIn || u.inline)) return undefined;  // a heater inside a filter or on its hose is not swapped from here
  const models = [...HEATER_MODELS].sort((a, b) => a.watts - b.watts);
  for (const n of [Math.max(1, h.n), 2]) {
    if (n < h.n) continue;
    const m = models.find(x => x.watts * n >= h.needW && x.watts * n > h.totalW);
    if (m) return { watts: m.watts, n };
  }
  return undefined;
}
const setHeaters = (t: TankSetup, watts: number, n: number): void => commitTech(t, s => withUnits(techOf(s), 'heater', Array.from({ length: n }, () => ({ w: watts }))));
const setChiller = (t: TankSetup): void => commitTech(t, s => withChoice(s, 'chiller', 'chiller'));

export interface TempFix { kind: 'heater' | 'chiller'; ids: string[]; what: string; describe: string; apply: (t: TankSetup) => void }
/** The exact fixes for the temperature notes, each proved on a dry run (the note clears and nothing else is touched); the rest are warning only. */
export function tempFixes(S: TankSetup, ids: string[], price?: PriceOf, units: Units = 'in'): TempFix[] {
  const out: TempFix[] = [], us = units === 'in', has = (i: string) => ids.includes(i);
  const t = techOf(S), h = heatLoss(S, t);
  // 1. heater: none at all, or too small to hold the target in the room
  const heaterIds = ['temp:hold:noheater', 'temp:hold:weak'].filter(has);
  if (heaterIds.length) {
    const noHeater = has('temp:hold:noheater'), big = biggerHeater(S);
    const w = noHeater ? undefined : big?.watts, n = noHeater ? 1 : big?.n;
    let watts = w, count = n;
    if (noHeater) { const m = [...HEATER_MODELS].sort((a, b) => a.watts - b.watts).find(x => x.watts >= h.needW); watts = m?.watts; count = 1; }
    if (watts && count) {
      const copy = structuredClone(S); setHeaters(copy, watts, count);
      const ev = tempEvidence(copy);
      if (ev && ev.heatHolds !== false && ev.heater) {
        const p = about(price, S, copy), now = h.units.map(u => `${Math.round(u.watts)} W`).join(' + ');
        out.push({ kind: 'heater', ids: heaterIds,
          what: noHeater ? `Add a ${watts} W heater${p}` : `Use ${count === 1 ? 'a' : count} ${watts} W heater${count === 1 ? '' : 's'}${p}`,
          describe: `${noHeater ? `Adds ${count === 1 ? 'one' : count} ${watts} W heater${count === 1 ? '' : 's'}` : `Replaces the ${now} heater${h.units.length > 1 ? 's' : ''} with ${count === 1 ? 'one' : count} ${watts} W (a generic heater of the size the tank needs)`}${p}. The tank loses about ${Math.round(h.lossW)} W to the ${temp(h.roomC, us)} room at ${temp(h.targetC, us)}, and the night need is about ${Math.round(h.needW)} W; ${count * watts} W covers it. Nothing else changes.`,
          apply: x => setHeaters(x, watts!, count!) });
      }
    }
  }
  // 2. chiller: the room is warmer than the tank should be
  const chIds = ['temp:hold:cool', 'temp:chiller'].filter(has);
  if (chIds.length && t.rows.chiller !== 'chiller') {
    const copy = structuredClone(S); setChiller(copy);
    if (techOf(copy).rows.chiller === 'chiller') {
      const p = about(price, S, copy), ev = tempEvidence(copy);
      if (!ev || ev.chiller) out.push({ kind: 'chiller', ids: chIds,
        what: `Add a chiller${p}`,
        describe: `Adds a chiller${p}, sized from the heat to take out: the ${temp(h.roomC, us)} room is warmer than the ${temp(h.targetC, us)} tank should be, about ${Math.round(h.coolW)} W of cooling. It also adds its power use to the monthly cost. Nothing else changes.`,
        apply: setChiller });
    }
  }
  return out;
}
