// DQ3 (spec section 6, 2026-11-11): the LEARNING CONTRACT of the A/B screen. Pure; no DOM, no store, no locks.
//   Overall vote (explore/aspects.ts pairEvents): Prefer A / B = relative whole-design evidence (what the designs do NOT share); Like both / neither = a holistic like / pass on each; Skip = nothing.
//   Reasons: aspect reasons teach their aspects; Upfront / Ongoing cost teach only the practical LEAN below (never a plant or a fish); Maintenance / Difficulty teach the ownership aspects.
//   Attribute pick (AB13: A / No opinion / B per differing attribute): ONE explicit event, the preferred value's thumb (attrs.ts thumbBonus, scored once). A blank row records nothing. When the picked value
//   belongs to the design that LOST overall ("A overall, B's plants"), it also leaves a COMPONENT PREFERENCE on the session (`targets`): a soft, recent hint the next challenger answers (pairGen targeted
//   challenger). It is not a lock, not a copy and not a second taste event. Lock and Combine are project actions and teach nothing here.
import { COMBINE_ATTR_TAB as ATTR_TAB, type AttrKey } from './attrs';
import type { CandidateRecord, ComponentPref, DiscoverySession, Outcome, ReasonKey } from './discoveryTypes';
import { clearLearnedAspects } from '../explore/aspects';
import { projectExtras, setProjectExtras, type Brief, type ProjectExtras } from './brief';

/** A component pick can be tested on the five Combine tabs (attrs.ts COMBINE_ATTR_TAB); gear attributes (light, filter, heater, stand, background) have no tab: a pick on them is a thumb only. */
/** Picks older than this many comparisons are no longer "recent". */
export const TARGET_RECENT = 2;

export interface AttrPick { attr: AttrKey; elements: string[]; side: 'A' | 'B' }

/** Component preferences from one decisive vote: a pick on the side that lost overall, on an attribute with a tab. Returns the session with the new targets (older unused ones for the same tab are replaced). */
export function withTargets(session: DiscoverySession, outcome: Outcome, a: CandidateRecord | undefined, b: CandidateRecord | undefined, picks: readonly AttrPick[] | undefined): DiscoverySession {
  if (!a || !b || !picks?.length || (outcome !== 'A' && outcome !== 'B')) return session;
  const win = outcome === 'A' ? a : b, lose = outcome === 'A' ? b : a, loseSide = outcome === 'A' ? 'B' : 'A';
  const at = session.comparisons.length, fresh: ComponentPref[] = [];
  for (const p of picks) {
    const tab = ATTR_TAB[p.attr]; if (!tab || p.side !== loseSide) continue;
    fresh.push({ id: `tp-${at}-${p.attr}`, tab, attr: p.attr, baseId: win.id, donorId: lose.id, donorSide: loseSide, at });
  }
  if (!fresh.length) return session;
  const keep = (session.targets ?? []).filter(t => !fresh.some(f => f.tab === t.tab));
  return { ...session, targets: [...keep, ...fresh].slice(-6) };
}
/** The component preference the next challenger should answer: unused, recent, and about the design that is the favourite now. */
export function pendingTarget(session: DiscoverySession, championId: string | undefined): ComponentPref | undefined {
  if (!championId) return undefined;
  const n = session.comparisons.length;
  return [...(session.targets ?? [])].reverse().find(t => !t.used && t.baseId === championId && n - t.at <= TARGET_RECENT);
}
export const markTargetUsed = (session: DiscoverySession, id: string): DiscoverySession => ({ ...session, targets: (session.targets ?? []).map(t => t.id === id ? { ...t, used: true as const } : t) });

// ---------------------------------------------------------------------------------------------------------------- practical lean (cost reasons)
export type Lean = NonNullable<ProjectExtras['lean']>;
/** DQ4 "Reset learned taste": the learned parts of the brief only (A / B aspect events, attribute thumbs, the cost lean). Stated preferences (cards, told keys, limits, locks) and the project are untouched. */
export function resetLearnedBrief(b: Brief): Brief {
  const x = projectExtras(b), { thumbs: _t, lean: _l, ...rest } = x;
  return setProjectExtras(clearLearnedAspects(b), rest);
}
/** ... and the session's learned side: pending component preferences. Comparisons, champion, locks, scope and history stay. */
export const resetLearnedSession = (s: DiscoverySession): DiscoverySession => { const { targets: _t, ...rest } = s; return rest as DiscoverySession; };
export const leanOf = (b: Brief): Lean => projectExtras(b).lean ?? {};
const LEAN_STEP = 0.1, LEAN_MIN_GAP = 0.05;
/** "Upfront cost" / "Ongoing cost" given as the reason a design won: when the winner really is the cheaper one (by at least 5 %), lean toward cheaper on that dimension; otherwise nothing (the reason is ambiguous). */
export function recordLean(b: Brief, winner: CandidateRecord, loser: CandidateRecord, why: readonly ReasonKey[] | undefined): Brief {
  if (!why?.length) return b;
  const cur: Lean = { ...leanOf(b) }; let changed = false;
  const figs: [ 'upfront' | 'ongoing', (r: CandidateRecord) => number | undefined ][] = [['upfront', r => r.facts.newSpendUsd.mean], ['ongoing', r => r.facts.monthlyUsd?.mean]];
  for (const [key, fig] of figs) {
    if (!why.includes(key)) continue;
    const w = fig(winner), l = fig(loser); if (w == null || l == null || l <= 0 || (l - w) / l < LEAN_MIN_GAP) continue;
    const prev = cur[key]; cur[key] = { n: Math.min(3, (prev?.n ?? 0) + 1), ref: Math.max(1, Math.round((w + l) / 2)) }; changed = true;
  }
  if (!changed) return b;
  return setProjectExtras(b, { ...projectExtras(b), lean: cur });
}
/** The ranking nudge of the lean for one design: cheaper than the reference scores up, dearer scores down, bounded by +-LEAN_STEP * n. Learned evidence (inside the learned cap). */
export function leanBonus(lean: Lean | undefined, spendUsd: number, monthlyUsd: number | undefined): { v: number; why: string } {
  let v = 0; const bits: string[] = [];
  const rows: ['upfront' | 'ongoing', number | undefined][] = [['upfront', spendUsd], ['ongoing', monthlyUsd]];
  for (const [key, x] of rows) {
    const e = lean?.[key]; if (!e || x == null) continue;
    const t = Math.max(-1, Math.min(1, (e.ref - x) / e.ref)); v += LEAN_STEP * e.n * t; bits.push(`${key} $${Math.round(x)} vs $${e.ref}`);
  }
  return { v, why: bits.join('; ') };
}
