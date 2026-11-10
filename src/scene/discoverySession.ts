// Discovery v2 (A/B), lane AB0: the DISCOVERY SESSION state machine (spec research/design/discovery-v2-handoff.md sections 3, 5.1-5.2, 6.2, 10).
// PURE: no DOM, no store writes, no lock writes (locks stay DX0's: src/scene/locks.ts). Every function returns a NEW session and never mutates its input.
// The champion is a specific saved candidate id. It changes only when a candidate BEATS it head to head (or `setFavourite`). A fresh-pair winner waits in `pendingFreshId`
// and must beat the champion in a 'final' pair. Like both / Like neither / Skip never change the champion (plan decision 4). Skip leaves no taste signal (`tasteSignal`).
import type { Tab } from './scope';
import { TABS } from './scope';
import type { Comparison, DiscoverySession, HabitatDirection, Outcome, ReasonKey, TabFreeze } from './discoveryTypes';

export type PairType = Comparison['type'];
/** What the pair generator should draw next. `keep` = the id that stays on screen (the champion); `broaden` = draw the challenger from further away (Like neither). */
export interface NextPair { type: PairType; keep?: string; broaden?: boolean }

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const clone = (s: DiscoverySession): DiscoverySession => ({
  ...s, scope: [...s.scope], freezes: s.freezes.map(f => ({ ...f })), comparisons: s.comparisons.map(c => ({ ...c })), current: s.current ? { ...s.current } : undefined,
});

// ---------------------------------------------------------------------------------------------------------------- lifecycle
export function startSession(rev: number, scope: readonly Tab[] = TABS, direction: HabitatDirection = 'unsure', id: string = uid('ds')): DiscoverySession {
  return { id, baseRev: rev, scope: TABS.filter(t => scope.includes(t)), freezes: [], direction, comparisons: [], status: 'active' };
}
export const pause = (s: DiscoverySession): DiscoverySession => ({ ...clone(s), status: 'paused' });

export type ResumeResult = { needsRebase: false; session: DiscoverySession } | { needsRebase: true; session: DiscoverySession };
/** Re-entering a session. The project changed since `baseRev`: the session is returned UNCHANGED (still paused) with `needsRebase`, and the caller offers "Continue (re-check)" (`rebase`) or "New session" (spec 6.2). */
export function resume(s: DiscoverySession, currentRev: number): ResumeResult {
  if (currentRev !== s.baseRev) return { needsRebase: true, session: clone(s) };
  return { needsRebase: false, session: { ...clone(s), status: 'active' } };
}

export interface RebaseResult { session: DiscoverySession; /** freezes dropped because they pointed at the OLD working project */ droppedFreezes: TabFreeze[]; /** the pair on screen was generated against the old revision and is cleared */ droppedCurrent: boolean; message: string }
/** Keeps the champion, the pending fresh winner, every comparison and id. Drops freezes whose source is 'working' at an older rev (that project no longer exists) and the stale on-screen pair, and says so. Candidate-sourced freezes stay. */
export function rebase(s: DiscoverySession, rev: number): RebaseResult {
  const out = clone(s);
  const droppedFreezes = out.freezes.filter(f => f.source === 'working' && (f.rev ?? s.baseRev) !== rev);
  out.freezes = out.freezes.filter(f => !droppedFreezes.includes(f));
  const droppedCurrent = !!out.current && rev !== s.baseRev;
  if (droppedCurrent) out.current = undefined;
  out.baseRev = rev; out.status = 'active';
  const bits: string[] = [];
  if (droppedFreezes.length) bits.push(`released ${droppedFreezes.length} kept-for-now tab${droppedFreezes.length > 1 ? 's' : ''} (${droppedFreezes.map(f => f.tab).join(', ')}) that pointed at the earlier version of your project`);
  if (droppedCurrent) bits.push('the pair on screen is being re-checked');
  return { session: out, droppedFreezes, droppedCurrent, message: bits.length ? `Your project changed: ${bits.join('; ')}. Your favourite and history are kept.` : 'Your project changed; your favourite, history and kept tabs are all still valid.' };
}

/** The caller shows the generated pair (ids) and tells the session; the type says how `record` will read the answer. */
export function setCurrent(s: DiscoverySession, aId: string, bId: string, type: PairType): DiscoverySession {
  return { ...clone(s), current: { aId, bId, type } };
}

// ---------------------------------------------------------------------------------------------------------------- the champion rules
export interface RecordResult {
  session: DiscoverySession;
  /** the saved comparison (undefined when there was no pair on screen) */
  comparison?: Comparison;
  next: NextPair;
  /** the candidate whose taste events are positive / negative; Skip leaves both empty (spec 3.4) */
  tasteSignal: { winner?: string; loser?: string; liked: string[]; disliked: string[] };
}

const nextAfter = (s: DiscoverySession): NextPair =>
  s.championId ? { type: 'champion', keep: s.championId } : { type: 'first' };

/** Applies one answer to the pair on screen. `why` / `otherGood` are optional and stored on A/B choices only. */
export function record(session: DiscoverySession, outcome: Outcome, why?: ReasonKey[], otherGood?: ReasonKey[], now: number = Date.now()): RecordResult {
  const s = clone(session);
  const cur = s.current;
  if (!cur) return { session: s, next: nextAfter(s), tasteSignal: { liked: [], disliked: [] } };
  const { aId, bId, type } = cur;
  const champBefore = s.championId;
  const decisive = outcome === 'A' || outcome === 'B';
  const winner = outcome === 'A' ? aId : outcome === 'B' ? bId : undefined;
  const loser = outcome === 'A' ? bId : outcome === 'B' ? aId : undefined;
  let next: NextPair;

  if (decisive) {
    if (type === 'first') {
      s.championId = winner; next = nextAfter(s);
    } else if (type === 'champion') {
      // a challenger replaces the champion only by winning; the champion winning changes nothing
      if (winner !== champBefore) s.championId = winner;
      next = nextAfter(s);
    } else if (type === 'fresh') {
      // never straight to the champion: it waits to face it. With no champion yet there is nothing to face, so it simply becomes the champion.
      if (champBefore) { s.pendingFreshId = winner; next = { type: 'final', keep: champBefore }; }
      else { s.championId = winner; s.pendingFreshId = undefined; next = nextAfter(s); }
    } else { // final: pending vs champion
      if (winner !== champBefore) s.championId = winner;
      s.pendingFreshId = undefined; next = nextAfter(s);
    }
  } else {
    // like both / like neither / skip: the champion never changes
    if (type === 'fresh') next = { type: 'fresh' };
    else if (type === 'final') {
      if (outcome === 'skip') next = { type: 'final', keep: champBefore }; // still owes the head-to-head
      else { s.pendingFreshId = undefined; next = nextAfter(s); } // both stay in history; the pending winner is not forced
    } else next = nextAfter(s);
    if (outcome === 'neither' && type !== 'fresh') next = { ...next, broaden: true };
    if (outcome === 'neither' && type === 'fresh') next = { type: 'fresh', broaden: true };
  }

  const cmp: Comparison = {
    id: uid('cmp'), aId, bId, type, outcome,
    ...(decisive && why?.length ? { why: [...why] } : {}),
    ...(decisive && otherGood?.length ? { otherGood: [...otherGood] } : {}),
    championBefore: champBefore, championAfter: s.championId, at: now,
  };
  s.comparisons.push(cmp);
  s.current = undefined;
  const tasteSignal = {
    winner, loser,
    liked: outcome === 'both' ? [aId, bId] : winner ? [winner] : [],
    disliked: outcome === 'neither' ? [aId, bId] : loser ? [loser] : [],
  };
  return { session: s, comparison: cmp, next, tasteSignal };
}

/** The explicit override: this saved candidate is now the favourite (spec 3.2). Clears a pending fresh winner that is the same id. */
export function setFavourite(session: DiscoverySession, id: string): { session: DiscoverySession; next: NextPair } {
  const s = clone(session);
  s.championId = id;
  if (s.pendingFreshId === id) s.pendingFreshId = undefined;
  s.current = undefined;
  return { session: s, next: nextAfter(s) };
}

/** The user asked for Explore Something Different: the next pair is 'fresh' (callers show it with `setCurrent`). */
export const exploreNext = (): NextPair => ({ type: 'fresh' });

// ---------------------------------------------------------------------------------------------------------------- freezes (temporary; never a lock)
/** Source for "uncheck this tab": the champion, else the working project (spec 5.2). */
export const defaultFreezeSource = (s: DiscoverySession): string => s.championId ?? 'working';
/** Freeze a tab on `source` (a candidate id, or 'working'). "Keep A's hardscape" passes A's id, whatever else is on screen. Replaces an earlier freeze on the same tab. Never writes a lock. */
export function freeze(session: DiscoverySession, tab: Tab, source: string = defaultFreezeSource(session)): DiscoverySession {
  const s = clone(session);
  s.freezes = s.freezes.filter(f => f.tab !== tab);
  s.freezes.push(source === 'working' ? { tab, source, rev: s.baseRev } : { tab, source });
  return s;
}
export function unfreeze(session: DiscoverySession, tab: Tab): DiscoverySession {
  const s = clone(session); s.freezes = s.freezes.filter(f => f.tab !== tab); return s;
}
export const frozenSource = (s: DiscoverySession, tab: Tab): string | undefined => s.freezes.find(f => f.tab === tab)?.source;
/** Tabs a run may vary: scope minus frozen tabs. Persistent locks (DX0) still apply inside them. */
export const effectiveScope = (s: DiscoverySession): Tab[] => s.scope.filter(t => !s.freezes.some(f => f.tab === t));

// ---------------------------------------------------------------------------------------------------------------- persistence (per project, browser-local, not a brief field, not in share links)
export const SESSION_KEY = 'tanklook.discovery';
const keyFor = (projectKey: string) => `${SESSION_KEY}.${projectKey}`;
type St = Storage | undefined;
const ls = (): St => { try { return globalThis.localStorage; } catch { return undefined; } };
const memory = new Map<string, string>();

const isSession = (x: unknown): x is DiscoverySession => {
  const s = x as DiscoverySession;
  return !!s && typeof s.id === 'string' && typeof s.baseRev === 'number' && Array.isArray(s.scope) && Array.isArray(s.freezes) && Array.isArray(s.comparisons)
    && (s.status === 'active' || s.status === 'paused') && typeof s.direction === 'string';
};
/** `projectKey` ties the session to the scene's identity (the caller passes whatever names the open project). Storage failures fall back to memory for this page. */
export function saveSession(projectKey: string, session: DiscoverySession, storage: St = ls()): boolean {
  const txt = JSON.stringify(session);
  memory.set(projectKey, txt);
  try { storage?.setItem(keyFor(projectKey), txt); return !!storage; } catch { return false; }
}
export function loadSession(projectKey: string, storage: St = ls()): DiscoverySession | undefined {
  let txt: string | null | undefined;
  try { txt = storage?.getItem(keyFor(projectKey)); } catch { txt = undefined; }
  txt ??= memory.get(projectKey);
  if (!txt) return undefined;
  try { const o = JSON.parse(txt); return isSession(o) ? o : undefined; } catch { return undefined; }
}
export function clearSession(projectKey: string, storage: St = ls()): void {
  memory.delete(projectKey);
  try { storage?.removeItem(keyFor(projectKey)); } catch { /* ignore */ }
}
