// Live loop propagation (lane NG3, 2026-10-29; plan research/design/guided-sandbox-plan.md gap 5): pure diffs for the "what changed" strip.
// `inputsOf` snapshots what the generator was asked (limits with their targets, the tank the person has, owned gear, locked animals);
// `inputChanges` says what moved between two snapshots; `resultDiff` says what that bought in the shown concepts (upgrades that now fit,
// more swim length, more animals). Nothing here ranks or filters: welfare stays the generator's own gate, so a diff never reads as a tradeoff on it.
import type { Brief } from '../scene/brief';
import { targetOf, valueOf } from '../scene/brief';
import type { TankModel } from '../data/tanks';
import type { Proposal, Suggestions, Wants } from './suggest';

export interface Inputs {
  startup?: number; startupTarget?: number; monthly?: number; time?: number;
  owned: string[];
  tank?: { gal: number; L: number; D: number; H: number };
  locked: { species: string; n: number }[];
  kinds: string[];
}
const round = (n: number) => Math.round(n);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** What the generator was asked, from its Wants (the budget target comes from the brief: the Wants carry only the max). */
export function inputsOf(w: Wants, b?: Brief): Inputs {
  const c = w.constraints, t: TankModel | undefined = w.ownTank;
  const tgt = b ? targetOf(b, 'constraints.budget') : undefined;
  return {
    ...(c.startupUsd?.on ? { startup: c.startupUsd.value } : {}), ...(tgt !== undefined ? { startupTarget: tgt } : {}),
    ...(c.monthlyUsd?.on ? { monthly: c.monthlyUsd.value } : {}), ...(c.minutesPerWeek?.on ? { time: c.minutesPerWeek.value } : {}),
    owned: Object.keys(w.owned ?? {}).sort(),
    ...(t ? { tank: { gal: t.ratedGal, L: t.outer.L, D: t.outer.D, H: t.outer.H } } : {}),
    locked: (w.animals ?? []).map(a => ({ species: a.species, n: a.n })).sort((x, y) => x.species.localeCompare(y.species)),
    kinds: [...(w.kinds ?? [])].sort(),
  };
}

const LIMITS: readonly [keyof Inputs, string, string][] = [['startup', 'Budget', '$'], ['monthly', 'Monthly budget', '$'], ['time', 'Care time', 'min']];
const lim = (n: number | undefined, unit: string) => n === undefined ? 'no limit' : unit === '$' ? usd(n) : `${round(n)} min a week`;

/** Tank edit in plain words: "20 gal high -> 20 gal long" when the volume holds and the footprint turns, else the gallons. */
export function tankShift(a: NonNullable<Inputs['tank']>, b: NonNullable<Inputs['tank']>): string {
  const sameVol = Math.abs(a.gal - b.gal) <= Math.max(1, a.gal * 0.08);
  const shape = (t: NonNullable<Inputs['tank']>) => t.H >= t.L * 0.65 ? 'high' : t.L >= t.H * 1.8 ? 'long' : 'standard';
  if (sameVol && shape(a) !== shape(b)) return `${round(a.gal)} gal ${shape(a)} -> ${round(b.gal)} gal ${shape(b)}`;
  return `${round(a.gal)} gal -> ${round(b.gal)} gal`;
}

/** What moved between two asks, one short phrase each, in a fixed order. */
export function inputChanges(a: Inputs, b: Inputs): string[] {
  const out: string[] = [];
  for (const [k, label, unit] of LIMITS) { const x = a[k] as number | undefined, y = b[k] as number | undefined; if (x !== y) out.push(`${label} ${lim(x, unit)} -> ${lim(y, unit)}`); }
  if (a.startupTarget !== b.startupTarget && a.startup === b.startup) out.push(`Budget target ${a.startupTarget === undefined ? 'none' : usd(a.startupTarget)} -> ${b.startupTarget === undefined ? 'none' : usd(b.startupTarget)}`);
  if (a.tank && b.tank && (a.tank.L !== b.tank.L || a.tank.D !== b.tank.D || a.tank.H !== b.tank.H)) out.push(`Tank ${tankShift(a.tank, b.tank)}`);
  else if (!a.tank && b.tank) out.push(`Your tank: ${round(b.tank.gal)} gal`);
  else if (a.tank && !b.tank) out.push('Your tank removed');
  for (const o of b.owned.filter(x => !a.owned.includes(x))) out.push(`You own a ${o}`);
  for (const o of a.owned.filter(x => !b.owned.includes(x))) out.push(`You no longer own a ${o}`);
  const na = a.locked.reduce((t, x) => t + x.n, 0), nb = b.locked.reduce((t, x) => t + x.n, 0);
  if (JSON.stringify(a.locked) !== JSON.stringify(b.locked)) out.push(`Locked animals ${na} -> ${nb}`);
  if (a.kinds.join() !== b.kinds.join()) out.push('Kind of setup changed');
  return out;
}

const gal = (p: Proposal) => Math.round(p.build.tank.ratedGal);
const lenMm = (p: Proposal) => p.build.tank.outer.L;
const level = (p: Proposal) => p.build.finish?.level ?? 0;
const count = (p: Proposal) => p.build.animals.reduce((t, x) => t + x.n, 0);
const twinOf = (p: Proposal, before: Proposal[]) => before.find(q => q.strategy === p.strategy && q.archetype.id === p.archetype.id) ?? before.find(q => q.archetype.id === p.archetype.id);

export interface ResultDiff {
  /** concepts that came out better than their earlier twin (bigger tank, finish tier up, more animals) */
  upgrades: number;
  /** concepts that are new / gone */
  added: number; dropped: number;
  /** the most telling lines: swim length, animals, tank, finish */
  lines: string[];
}

/** What the new concepts are against the old, concept by concept (twin = same strategy and archetype). */
export function resultDiff(before: Suggestions | undefined, after: Suggestions): ResultDiff {
  const out: ResultDiff = { upgrades: 0, added: 0, dropped: 0, lines: [] };
  if (!before) return out;
  const bp = before.proposals, ap = after.proposals;
  const seen = new Set<Proposal>();
  for (const p of ap) {
    const q = twinOf(p, bp);
    if (!q) { out.added++; continue; }
    seen.add(q);
    const up = gal(p) > gal(q) || level(p) > level(q) || count(p) > count(q) || lenMm(p) > lenMm(q) + 20;
    if (up) out.upgrades++;
    const bits: string[] = [];
    if (lenMm(p) > lenMm(q) + 20) bits.push('more swim length');
    else if (lenMm(p) + 20 < lenMm(q)) bits.push('less swim length');
    if (count(p) !== count(q)) bits.push(count(p) > count(q) ? `${count(p) - count(q)} more ${noun(p)}` : `${count(q) - count(p)} fewer ${noun(p)}`);
    if (gal(p) !== gal(q)) bits.push(`${gal(q)} -> ${gal(p)} gal`);
    if (level(p) !== level(q)) bits.push(level(p) > level(q) ? 'a fuller finish' : 'a plainer finish');
    if (bits.length) out.lines.push(bits.join(', '));
  }
  out.dropped = bp.filter(q => !seen.has(q)).length;
  out.lines = [...new Set(out.lines)].slice(0, 2);
  return out;
}
const noun = (p: Proposal) => { const a = [...p.build.animals].sort((x, y) => y.n - x.n)[0]; return a ? a.species.replace(/s$/, '') + 's' : 'animals'; };

export interface Strip { text: string; lines: string[] }

/** The "what changed" strip: the input change, then what it bought. undefined when nothing the person asked moved. */
export function changeStrip(a: Inputs, b: Inputs, before: Suggestions | undefined, after: Suggestions): Strip | undefined {
  const ch = inputChanges(a, b);
  if (!ch.length) return undefined;
  const d = resultDiff(before, after);
  if (!after.proposals.length) return { text: `${ch.join('; ')}: no setup fits now.`, lines: [] };
  const got = d.upgrades ? `${d.upgrades} upgrade${d.upgrades === 1 ? '' : 's'} now fit${d.upgrades === 1 ? 's' : ''}` : d.added || d.dropped ? 'the concepts changed' : 'the setups are unchanged';
  const loosened = (b.startup ?? Infinity) > (a.startup ?? Infinity);
  return { text: `${ch.join('; ')}: ${got}${!d.upgrades && loosened ? ' (the budget is a ceiling, so a cheaper concept is not penalised)' : ''}.`, lines: d.lines };
}

/** The brief's budget target, for callers that hold only a brief. */
export const budgetOf = (b: Brief): { max?: number; target?: number } => ({ max: valueOf(b, 'constraints.budget'), target: targetOf(b, 'constraints.budget') });
