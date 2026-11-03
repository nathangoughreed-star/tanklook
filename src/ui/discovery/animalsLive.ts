// Lane DA1 (2026-11-03): the Discovery "Which animals would suit it?" step shows what each animal does to the tank, live. Pure (no DOM): the roster as counts + the tank -> a
// stocking meter, the set-up / monthly / care-time change, per-species requirement lines and the roster-level welfare lines with their verified fixes. Everything is read from the
// engines that already know (scene/tankfit fitIn, demand/tiers, stockPlanLogic notesOf / overWarn / rosterWarnings / tempLinesOf); nothing is worked out here, and nothing is ever
// removed for the person (GS6 invariant 5): a count below the group minimum, a clash, an overstock are all flagged, with the fix offered as a button.
import { CARE } from '../../data/care';
import { getSpecies } from '../../data/species';
import { tankFromModel, type TankModel } from '../../data/tanks';
import { rosterTiers } from '../../demand/tiers';
import { volume } from '../../scene/physics';
import { fitIn, lenTxt, speciesVerdictIn, type AnimalCount } from '../../scene/tankfit';
import { minDataOf, type Fmt, type MinData, type MinRow } from '../../scene/tankMin';
import { fmtC } from '../../scene/temprange';
import {
  FAIL_WORD, notesOf, overWarn, rosterWarnings, spaceBand, tempLinesOf,
  type Pk, type RosterFixOp, type RosterLimits, type RosterWarning,
} from '../stockPlanLogic';
import { dropAnimal } from './animals';

/** The roster as the stocking logic's picks: females split out of the total (AnimalCount counts every animal in `n`, a pick counts the males in `n`). */
export const picksOfChosen = (chosen: readonly AnimalCount[]): Pk[] =>
  chosen.map(c => ({ id: c.species, n: c.n - (c.f ?? 0), ...(c.f ? { f: c.f } : {}), ...(c.tl ? { tl: c.tl } : {}) }));
/** A stable key for a roster (order does not matter). */
export const rosterKeyOf = (chosen: readonly AnimalCount[]): string => chosen.map(c => `${c.species}${c.n}${c.f ? 'f' + c.f : ''}`).sort().join(',');

/** The group size a species is kept in (its recommended smallest). */
export const groupMin = (id: string): number => CARE[id]?.bands?.ok ?? CARE[id]?.group ?? 1;

/** One step of a count: +1 or -1 animal. A species kept by sex keeps near its ratio (the sex that brings the mix closest to it gets the change), never below one animal in all:
 *  taking the last one out is Remove's job. A count under the group minimum is allowed (flagged, never corrected here). */
export function stepCount(c: AnimalCount, d: 1 | -1): AnimalCount {
  const n = Math.max(1, c.n + d); if (n === c.n) return c;
  const r = CARE[c.species]?.sexed?.ratio, f = c.f ?? 0, m = c.n - f;
  if (!r || !c.f) return { ...c, n };
  const wantShare = r[1] / ((r[0] + r[1]) || 1), miss = (mm: number, ff: number) => Math.abs(ff / (mm + ff) - wantShare);
  const options = d === 1 ? [[m + 1, f], [m, f + 1]] : [[m - 1, f], [m, f - 1]];
  const ok = options.filter(([mm, ff]) => mm >= 0 && ff >= 0 && mm + ff === n);
  if (!ok.length) return { ...c, n };
  const [mm, ff] = ok.reduce((x, y) => miss(y[0], y[1]) < miss(x[0], x[1]) ? y : x);
  return withF({ ...c, n: mm + ff }, ff);
}
const withF = (c: AnimalCount, f: number): AnimalCount => { const { f: _f, ...rest } = c; return f > 0 ? { ...rest, f } : rest; };

/** One fix from the roster warnings, applied to the roster: remove the species, or add animals to its group. (A tank fix changes the tank, not the roster: the caller does that.) */
export function applyFixToChosen(chosen: readonly AnimalCount[], op: RosterFixOp): AnimalCount[] {
  if (op.op === 'remove') return dropAnimal(chosen, op.id);
  if (op.op === 'add') return chosen.map(c => { if (c.species !== op.id) return c; let x = c; for (let i = 0; i < op.n; i++) x = stepCount(x, 1); return x; });
  return [...chosen];
}

// ---------- the stocking meter ----------
export interface Meter {
  /** the space percent (100 = what the tank holds, 75 = the ideal), 0 with nothing chosen */
  pct: number;
  band: 'empty' | 'ok' | 'near' | 'over';
  /** one short phrase: how full it is, in words */
  word: string;
  /** the tank's other limits that fail (too short, too small for them ...), in words */
  fails: string[];
  filtrationPct: number;
  minPct: number;
}
export function meterOf(chosen: readonly AnimalCount[], tank: TankModel): Meter {
  if (!chosen.length) return { pct: 0, band: 'empty', word: 'An empty tank: add an animal to see how full it gets', fails: [], filtrationPct: 0, minPct: 0 };
  const fit = fitIn([...chosen], tank);
  if (!fit) return { pct: 0, band: 'empty', word: 'This tank cannot be judged for these animals', fails: [], filtrationPct: 0, minPct: 0 };
  const pct = fit.spacePct, sb = spaceBand(pct), fails = fit.fails.map(f => FAIL_WORD[f] ?? f);
  const band = sb === 'over' || fails.length ? 'over' : sb;
  const word = band === 'over' ? (sb === 'over' ? 'Over what this tank holds' : `Does not suit this tank: ${fails.join(', ')}`) : band === 'near' ? 'Past the ideal: tread carefully' : pct < 40 ? 'Plenty of room' : 'Comfortably stocked';
  return { pct, band, word, fails, filtrationPct: fit.filtrationPct, minPct: fit.minPct };
}

// ---------- cost and care time ----------
export interface Money {
  /** the whole set-up with these animals: the good build (ideal) and the cheapest that keeps them well (minimum), US $ */
  setupUsd: number; minSetupUsd: number;
  monthlyUsd: number; minPerWeek: number;
  /** what the animals add to the same tank empty */
  addSetupUsd: number; addMonthlyUsd: number; addMinPerWeek: number;
}
const MONEY = new Map<string, Money | undefined>();
export function moneyOf(chosen: readonly AnimalCount[], tank: TankModel): Money | undefined {
  if (!chosen.length) return undefined;
  const k = `${tank.id}|${rosterKeyOf(chosen)}`;
  if (MONEY.has(k)) return MONEY.get(k);
  const t = rosterTiers([...chosen], tank), z = rosterTiers([], tank).ideal;
  const m: Money = {
    setupUsd: Math.round(t.ideal.setupUsd), minSetupUsd: Math.round(t.minimum.setupUsd), monthlyUsd: Math.round(t.ideal.upkeepUsdMo), minPerWeek: Math.round(t.ideal.minPerWeek),
    addSetupUsd: Math.round(t.ideal.setupUsd - z.setupUsd), addMonthlyUsd: Math.round(t.ideal.upkeepUsdMo - z.upkeepUsdMo), addMinPerWeek: Math.round(t.ideal.minPerWeek - z.minPerWeek),
  };
  if (MONEY.size >= 500) MONEY.delete(MONEY.keys().next().value!);
  MONEY.set(k, m); return m;
}
/** What the last change did: the difference between two states (an empty roster counts as zero). */
export interface Delta { setupUsd: number; monthlyUsd: number; minPerWeek: number }
export const deltaOf = (before: Money | undefined, now: Money | undefined): Delta => ({
  setupUsd: (now?.setupUsd ?? 0) - (before?.setupUsd ?? 0), monthlyUsd: (now?.monthlyUsd ?? 0) - (before?.monthlyUsd ?? 0), minPerWeek: (now?.minPerWeek ?? 0) - (before?.minPerWeek ?? 0),
});
export const usdWord = (n: number, signed = false) => `${signed ? (n < 0 ? '-' : n > 0 ? '+' : '') : n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;

// ---------- welfare, per species and for the roster ----------
export type Tone = 'ok' | 'note' | 'warn' | 'bad';
export interface Line { text: string; tone: Tone }
export interface SpeciesLive {
  id: string; name: string; n: number;
  /** the count is under the group it is kept in (allowed, flagged) */
  belowGroup: boolean; min: number;
  /** the count may not go below this (one animal); Remove is the way out */
  canStepDown: boolean;
  lines: Line[];
}

/** A measure in the viewer's units; `d` decimals so a need and a have that round to the same whole number still read as two numbers (DA2). */
const fmtIn = (us: boolean, d: number): Fmt => ({
  len: mm => us ? `${+(mm / 25.4).toFixed(d)} in` : `${+(mm / 10).toFixed(d)} cm`,
  area: cm2 => us ? `${Math.round(cm2 / 6.4516)} sq in` : `${Math.round(cm2)} cm2`,
  vol: l => `${+(l / 3.785).toFixed(d)} gal`,
});
/** The decimals at which the limiting measure's need and have differ on the page (0, else 1, else 2). */
const decimalsFor = (m: { need: number; have: number; limiting: string }, us: boolean): number => {
  const f = (d: number) => { const x = fmtIn(us, d), g = m.limiting === 'length' || m.limiting === 'width' || m.limiting === 'height' ? x.len : m.limiting === 'floor area' ? x.area : x.vol!; return g(m.need) !== g(m.have); };
  return f(0) ? 0 : f(1) ? 1 : 2;
};
/** The tank-size lines of one species. Its verdict is the gate's (speciesVerdictIn: tankMin's red lines with the 10 % slack, `fails` from the tank-fit engine); this only says it in words:
 *  'bad' exactly when the gate fails, a note "just under, within the 10 % allowance" when the tank is under the line but inside the slack. */
function sizeLines(row: MinRow, fails: readonly string[], md: MinData | undefined, u: 'in' | 'cm'): Line[] {
  const us = u === 'in', short = fails.includes('minimum') || fails.includes('length'), m = row.measure, under = row.assessed && row.pct > 100, d = decimalsFor(m, us), F = fmtIn(us, d);
  const head = md?.red ? `Tank at least ${lenTxt(md.red.L, u)} long${md.vol?.gal ? `, about ${Math.round(md.vol.gal)} gal` : ''}${md.green && md.green.L > md.red.L ? `; ${lenTxt(md.green.L, u)} recommended` : ''}`
    : md?.vol ? `Tank of about ${Math.round(md.vol.gal)} gal or more` : '';
  const val = (n: number) => m.limiting === 'length' || m.limiting === 'width' || m.limiting === 'height' ? F.len(n) : m.limiting === 'floor area' ? F.area(n) : F.vol!(n);
  const nums = `${m.limiting}: wants about ${val(m.need)}, this tank has ${val(m.have)}`;
  const tail = short ? (m.limiting === 'length' ? `This one is ${F.len(m.have)}: too short` : `Too small for it, ${nums}`)
    : under ? (m.limiting === 'length' ? `This one is ${F.len(m.have)}: just under, within the 10 % allowance` : `Just under, within the 10 % allowance, ${nums}`) : '';
  if (!head && !tail) return [];
  return [{ text: `${head || 'Tank size'}${tail ? `${head ? '. ' : ': '}${tail}` : ''}`, tone: short ? 'bad' : 'note' }];
}

/** Each chosen animal: its count, the group it is kept in, and its requirements in this tank (temperature, tank size in gallons and inches, group and sex mix, depth / flow, diet and
 *  other special needs), each flagged when this tank or this count does not meet it. */
export function speciesLive(chosen: readonly AnimalCount[], tank: TankModel, us = true): SpeciesLive[] {
  const picks = picksOfChosen(chosen), t = tankFromModel(tank), litres = volume(t).litres, u = us ? 'in' : 'cm';
  return chosen.map((c, i) => {
    const p = picks[i], sp = getSpecies(c.species), care = CARE[c.species], nt = notesOf(p, u), md = minDataOf(c.species), lines: Line[] = [], min = groupMin(c.species);
    if (nt.line) lines.push({ text: nt.line, tone: nt.tone });
    const over = overWarn(p, litres, t.L); if (over) lines.push({ text: over, tone: 'warn' });
    if (nt.ratio) lines.push({ text: nt.ratio, tone: /Your mix/.test(nt.ratio) ? 'warn' : 'note' });
    if (nt.pairing && nt.pairing.status !== 'established') lines.push({ text: nt.pairing.line, tone: 'note' });
    if (care?.temp) lines.push({ text: `Water ${fmtC(care.temp, us)}`, tone: 'note' });
    const v = speciesVerdictIn(c, tank), size = v ? sizeLines(v.row, v.fails, md, u) : [];
    lines.push(...size);
    const hab = nt.habitat.filter(h => !/^(Tank at least|Recommended:)/.test(h)); if (hab.length) lines.push({ text: hab.join(' · '), tone: v?.fails.includes('depth') ? 'bad' : 'note' });
    if (v?.fails.includes('depth')) lines.push({ text: `This tank's water is ${lenTxt(v.row.depthMm, u)} deep: deeper than it tolerates`, tone: 'bad' });
    for (const n of nt.needs) lines.push({ text: n.text, tone: n.severity === 'S3' ? 'warn' : 'note' });
    return { id: c.species, name: sp?.name ?? c.species, n: c.n, belowGroup: min > 1 && c.n < min && !care?.solo, min, canStepDown: c.n > 1, lines };
  });
}

export interface RosterLive {
  lines: RosterWarning[];
  /** the water temperature they share, said once: 'ok' they all fit it, 'bad' they cannot share any */
  temp?: { text: string; tone: Tone };
}
const ROSTER = new Map<string, RosterLive>();
/** One animal that clashes with two others raises one warning per pair, each with the same button: shown once, naming every animal it clashes with ("... (Blue-nosed mbuna, Yellow lab cichlid)"). */
function sameFix(ws: RosterWarning[]): RosterWarning[] {
  const out: RosterWarning[] = [], seen = new Map<string, { at: number; others: string[] }>();
  for (const w of ws) {
    const key = w.fix && w.kind !== 'budget' ? `${w.kind}|${JSON.stringify(w.fix.op)}` : '', other = /\(([^)]+)\)\s*$/.exec(w.text)?.[1], hit = key ? seen.get(key) : undefined;
    if (hit && other && hit.others.length) { if (!hit.others.includes(other)) hit.others.push(other); continue; }
    if (key && other) seen.set(key, { at: out.length, others: [other] });
    out.push(w);
  }
  for (const h of seen.values()) if (h.others.length > 1) out[h.at] = { ...out[h.at], text: out[h.at].text.replace(/\(([^)]+)\)\s*$/, `(${h.others.join(', ')})`) };
  return out;
}
/** The roster-level welfare lines: clashes (temperament, temperature), the group sizes, the tank being too small or over-stocked and the budget, each with the fix the engine verified
 *  (`rosterWarnings`). `canChangeTank` false (the person's own tank, marked Required) leaves out the tank fixes; the line stays, flagged. Nothing here changes the roster. */
export function rosterLive(chosen: readonly AnimalCount[], tank: TankModel, o: { limits?: RosterLimits; us?: boolean; canChangeTank?: boolean } = {}): RosterLive {
  const us = o.us ?? true, key = `${tank.id}|${rosterKeyOf(chosen)}|${JSON.stringify(o.limits ?? {})}|${us}|${o.canChangeTank ?? true}`;
  const got = ROSTER.get(key); if (got) return got;
  const picks = picksOfChosen(chosen), out: RosterLive = { lines: [] };
  if (chosen.length) {
    out.lines = sameFix(rosterWarnings({ picks, chosen: tank.id }, o.limits ?? {}, us).map(w => w.fix?.op.op === 'tank' && o.canChangeTank === false ? { ...w, fix: undefined } : w));
    const fit = fitIn([...chosen], tank);
    // over-stock the tank engine reports but rosterWarnings has no tank step to offer (the biggest tank, or one the person owns): said once, with no button, never auto-fixed
    if (fit?.fails.length && !out.lines.some(w => w.kind === 'tank') && !fit.fails.includes('temperature'))
      out.lines.push({ kind: 'tank', welfare: true, text: `This tank does not suit these animals (${fit.fails.map(f => FAIL_WORD[f] ?? f).join(', ')}): take fewer, or use a bigger tank` });
    const tl = tempLinesOf(picks, us);
    if (tl) out.temp = { text: tl.range.replace(/^Temperature: /, ''), tone: tl.rangeState === 'none' ? 'bad' : tl.rangeState === 'single' ? 'warn' : 'ok' };
  }
  if (ROSTER.size >= 300) ROSTER.delete(ROSTER.keys().next().value!);
  ROSTER.set(key, out); return out;
}
