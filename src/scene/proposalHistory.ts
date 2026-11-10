// Discovery v2 (A/B), lane AB2: the PROPOSAL HISTORY (spec 6.3, 5.4, 10, journey G). Every candidate ever shown (A, B, losers, skips) is kept as an immutable CandidateRecord, per project, browser-local.
// Storage follows src/explore/store.ts: `tanklook.history.<project>` is the index (every record but its snapshot, plus the flags), `tanklook.history.<project>.<id>` the heavy snapshot, so paging the drawer never
// parses a scene. Every storage call is in try/catch and the store WORKS WITH STORAGE ABSENT: records live in memory and `persisted` is false ("not saved in this browser").
// A record is NEVER edited: only the flags (favourite, champion, thumb) move. Cap: 200 snapshots; favourites and champions are never evicted; the oldest unfavourited go first and their index line stays as
// "design no longer stored" (plan decision 7). `reEvaluate` gives then-vs-now facts and the lock / scope conflicts against the CURRENT project and never touches the record (spec 5.4, journey G).
import type { Brief } from './brief';
import type { Tab } from './scope';
import { diffTouches, outOfScope } from './scope';
import { lockViolations, type Violation } from './locks';
import { verdictOf } from './verdict';
import { equipPlan, type BuyLine } from './equipPlan';
import type { TankSetup } from './types';
import { SCENE_VERSION } from './types';
import { loadSnapshot } from '../explore/candidate';
import type { CandidateFacts, CandidateRecord, Figure, ProposalPurpose } from './discoveryTypes';
import type { Verdict } from './verdict';

export const HISTORY_CAP = 200;
/** index lines kept for evicted designs, so the drawer can still say what was there */
export const GONE_LINE_CAP = 2000;
/** a thumbnail is a small picture, never the source of truth */
export const THUMB_MAX = 12000;
export const HISTORY_KEY = (project: string) => `tanklook.history.${project}`;
const snapKey = (project: string, id: string) => `tanklook.history.${project}.${id}`;

type St = Storage | undefined;
const ls = (): St => { try { return globalThis.localStorage; } catch { return undefined; } };

/** What the index keeps of a stored record: everything but the heavy snapshot, plus the three flags. */
export type HistoryLite = Omit<CandidateRecord, 'snapshot'> & { favourite: boolean; champion: boolean; gone?: false; sceneVersion: number };
/** An evicted record: the line stays, the design is no longer stored. */
export interface HistoryGone { gone: true; id: string; sessionId: string; createdAt: number; purpose: ProposalPurpose; title: string; baseRev: number; key?: string; favourite: false; champion: false }
export type HistoryLine = HistoryLite | HistoryGone;
/** A full record as read back, with its flags. The record itself is the immutable part. */
export type StoredRecord = CandidateRecord & { favourite: boolean; champion: boolean };

export interface HistoryPage { items: HistoryLine[]; total: number; offset: number; hasMore: boolean }
export interface PutOutcome {
  /** false when an equal candidate (same id, or same dedupe key in the same session) is already kept: nothing was added */
  stored: boolean;
  /** the id to use from here on: the new one, or the kept duplicate's */
  id: string;
  duplicateOf?: string;
  evicted: string[];
}

export interface ProposalHistory {
  readonly project: string;
  /** false once a write failed or storage is absent: records then live in memory for this session */
  readonly persisted: boolean;
  put(r: CandidateRecord): PutOutcome;
  /** the record with its snapshot read back through parseScene, plus flags; undefined when gone, unknown or damaged */
  get(id: string): StoredRecord | undefined;
  /** the index line (stored or gone) without parsing a scene */
  line(id: string): HistoryLine | undefined;
  /** newest first; one session's, or all of the project's */
  page(sessionId: string | undefined, offset: number, n: number): HistoryPage;
  /** an earlier shown candidate with this dedupe key (in this session when given) */
  byKey(key: string, sessionId?: string): HistoryLite | undefined;
  /** only a stored design can be favourited; a favourite is never evicted */
  favourite(id: string, on: boolean): boolean;
  /** one champion per session: setting it clears the session's previous one; a champion is never evicted */
  markChampion(id: string): boolean;
  clearChampion(sessionId: string): void;
  /** lazily set the small picture; ignored unless it is a small image data URL */
  setThumb(id: string, dataUrl: string): boolean;
  /** how many designs are stored (gone lines excluded) */
  storedCount(): number;
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isLine = (e: unknown): e is HistoryLine => {
  const x = e as HistoryLine; if (!x || !isStr(x.id) || !isStr(x.sessionId) || !isNum(x.createdAt)) return false;
  if (x.gone === true) return isStr((x as HistoryGone).title);
  const l = x as HistoryLite; return typeof l.favourite === 'boolean' && typeof l.champion === 'boolean' && !!l.facts && !!l.verdict && isNum(l.baseRev) && Array.isArray(l.assumptions);
};
const protectedLine = (e: HistoryLine) => !e.gone && (e.favourite || e.champion);

export function createProposalHistory(project: string, st: St = ls()): ProposalHistory {
  let persisted = !!st, index: HistoryLine[] = [];   // newest first
  const mem = new Map<string, unknown>();
  try { const a: unknown = JSON.parse(st?.getItem(HISTORY_KEY(project)) ?? '[]'); if (Array.isArray(a)) index = a.filter(isLine); } catch { /* blocked or damaged: start empty */ }
  const flush = () => { if (!st) return; try { st.setItem(HISTORY_KEY(project), JSON.stringify(index)); } catch { persisted = false; } };
  const drop = (id: string) => { mem.delete(id); try { st?.removeItem(snapKey(project, id)); } catch { /* blocked */ } };
  const at = (id: string) => index.findIndex(e => e.id === id);
  const lite = (id: string): HistoryLite | undefined => { const e = index.find(x => x.id === id); return e && !e.gone ? e : undefined; };
  const patch = (id: string, f: (e: HistoryLite) => HistoryLite): boolean => { const i = at(id), e = index[i]; if (i < 0 || e.gone) return false; index[i] = f(e); flush(); return true; };

  return {
    project,
    get persisted() { return persisted; },
    storedCount: () => index.filter(e => !e.gone).length,
    line: id => index.find(e => e.id === id),
    byKey(key, sessionId) { return index.find((e): e is HistoryLite => !e.gone && e.key === key && (sessionId === undefined || e.sessionId === sessionId)); },
    page(sessionId, offset, n) {
      const all = index.filter(e => sessionId === undefined || e.sessionId === sessionId).sort((a, b) => b.createdAt - a.createdAt);   // stable: ties keep newest-inserted first
      const o = Math.max(0, Math.floor(offset)), k = Math.max(0, Math.floor(n));
      return { items: all.slice(o, o + k), total: all.length, offset: o, hasMore: o + k < all.length };
    },
    get(id) {
      const e = lite(id); if (!e) return undefined;
      try {
        const raw = mem.has(id) ? mem.get(id) : JSON.parse(st?.getItem(snapKey(project, id)) ?? 'null');
        if (!raw) return undefined;
        const { favourite, champion, gone: _g, sceneVersion, ...rec } = e;
        return { ...structuredClone(rec), snapshot: loadSnapshot(raw, sceneVersion), favourite, champion };
      } catch { return undefined; }
    },
    put(r) {
      const same = index.find((e): e is HistoryLite => !e.gone && (e.id === r.id || (r.key !== undefined && e.key === r.key && e.sessionId === r.sessionId)));
      const dup = same?.id;
      if (dup) return { stored: false, id: dup, duplicateOf: dup, evicted: [] };
      const { snapshot, ...rest } = structuredClone(r);
      const thumb = rest.thumb && /^data:image\//.test(rest.thumb) && rest.thumb.length <= THUMB_MAX ? rest.thumb : undefined;
      if (thumb === undefined) delete rest.thumb;
      const entry: HistoryLite = { ...rest, favourite: false, champion: false, sceneVersion: SCENE_VERSION };
      // a re-put of an id that was evicted brings its line back as a stored design
      index = index.filter(e => e.id !== r.id);
      index.unshift(entry);
      try { if (!st) throw new Error('no storage'); st.setItem(snapKey(project, r.id), JSON.stringify(snapshot)); } catch { persisted = false; mem.set(r.id, snapshot); }
      // room: the oldest unfavourited, non-champion design goes first (never the one just added); its line stays
      const evicted: string[] = [];
      while (index.filter(e => !e.gone).length > HISTORY_CAP) {
        const victim = index.filter((e): e is HistoryLite => !e.gone && e.id !== r.id && !protectedLine(e)).sort((a, b) => a.createdAt - b.createdAt)[0];
        if (!victim) break;   // everything left is kept by the person: the cap yields, a kept design is never lost
        const i = at(victim.id);
        index[i] = { gone: true, id: victim.id, sessionId: victim.sessionId, createdAt: victim.createdAt, purpose: victim.purpose, title: victim.facts.title, baseRev: victim.baseRev, ...(victim.key ? { key: victim.key } : {}), favourite: false, champion: false };
        drop(victim.id); evicted.push(victim.id);
      }
      const gones = index.filter(e => e.gone);
      if (gones.length > GONE_LINE_CAP) { const cut = new Set(gones.sort((a, b) => a.createdAt - b.createdAt).slice(0, gones.length - GONE_LINE_CAP).map(e => e.id)); index = index.filter(e => !cut.has(e.id)); }
      flush();
      return { stored: true, id: r.id, evicted };
    },
    favourite: (id, on) => patch(id, e => ({ ...e, favourite: on })),
    markChampion(id) {
      const e = lite(id); if (!e) return false;
      index = index.map(x => x.gone || x.sessionId !== e.sessionId ? x : { ...x, champion: x.id === id });
      flush(); return true;
    },
    clearChampion(sessionId) { index = index.map(x => x.gone || x.sessionId !== sessionId || !x.champion ? x : { ...x, champion: false }); flush(); },
    setThumb(id, dataUrl) {
      if (!/^data:image\//.test(dataUrl) || dataUrl.length > THUMB_MAX) return false;
      return patch(id, e => ({ ...e, thumb: dataUrl }));
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------- re-evaluation (spec 5.4, 6.3; journey G)
export interface ThenFacts { facts: CandidateFacts; verdict: Verdict; baseRev: number; createdAt: number; assumptions: string[] }
export interface NowFacts {
  /** the verdict of the saved design under the CURRENT brief */
  verdict: Verdict;
  /** the derived purchases and what is still to pay now (owned and capable gear = $0), recomputed */
  toBuy: BuyLine[];
  newSpendUsd: Figure;
  mustUse: string[];
  /** set when the design cannot work under the project's present equipment rules */
  infeasible?: string;
}
export interface ReEvaluation {
  /** the record's own frozen facts, untouched: never shown as current */
  then: ThenFacts;
  now: NowFacts;
  /** the project changed after the candidate was made (spec 12 item 26): needs revalidation before it can be installed */
  stale: boolean;
  lockConflicts: Violation[];
  /** tabs the candidate would change that the current scope has frozen */
  scopeConflicts: Tab[];
  /** every conflict as one plain line: locks, scope, equipment, hard limits */
  conflicts: string[];
  /** nothing blocks Use this design as-is: not stale, no conflicts, feasible now. Otherwise adopting needs user-approved adaptation (never silent). */
  usable: boolean;
}
export interface ReEvalOpts {
  /** the tabs this run may change; omitted = no scope limit */
  scope?: readonly Tab[];
  /** store.rev of the working project now; omitted = staleness is not judged */
  currentRev?: number;
}

/** The saved design, judged against the project, brief and scope as they are NOW. Pure and read-only: the record is returned untouched inside `then`, never rewritten, and a past estimate is never presented as current. */
export function reEvaluate(record: CandidateRecord, project: TankSetup, brief: Brief, opts: ReEvalOpts = {}): ReEvaluation {
  const S = record.snapshot;
  const verdict = verdictOf(S, brief), plan = equipPlan(S, brief);
  const lockConflicts = lockViolations(project, S, project.locks);
  const scopeConflicts = opts.scope ? outOfScope(diffTouches(project, S), opts.scope) : [];
  const stale = opts.currentRev !== undefined && opts.currentRev !== record.baseRev;
  const conflicts: string[] = [
    ...lockConflicts.map(v => v.detail),
    ...scopeConflicts.map(t => `This design changes the ${t} tab, which is held fixed for this run.`),
    ...(plan.infeasible ? [plan.infeasible] : []),
    ...verdict.gates.map(i => i.text), ...verdict.hard.map(i => i.text),
  ];
  const now: NowFacts = {
    verdict, toBuy: plan.toBuy.map(l => ({ ...l })),
    newSpendUsd: { lo: Math.round(plan.remaining.lo), mean: Math.round(plan.remaining.mode), hi: Math.round(plan.remaining.hi), est: record.facts.newSpendUsd.est },
    mustUse: plan.mustUse.map(i => String(i.key)),
    ...(plan.infeasible ? { infeasible: plan.infeasible } : {}),
  };
  return {
    then: { facts: record.facts, verdict: record.verdict, baseRev: record.baseRev, createdAt: record.createdAt, assumptions: record.assumptions },
    now, stale, lockConflicts, scopeConflicts, conflicts, usable: !stale && !conflicts.length,
  };
}
