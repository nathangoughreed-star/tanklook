// Explore, stage X2 (lane OX4): the SAVED CANDIDATE STORE (reconcile section 2; Nathan 2026-11-02 Q6: browser-local like "My tanks", capped at 60, likes and saves never evicted, not in share links).
// `tanklook.explore` holds the index (every record but its snapshot: identity, roster, the frozen estimate, the reaction, the status) and `tanklook.explore.<id>` the heavy snapshot, so listing the favourites never
// parses a scene. The pattern is scene/library.ts: every storage call is in try/catch, the snapshot goes back through parseScene when read, and the store WORKS WITH STORAGE ABSENT (a private window, a full quota):
// the records then live in memory for the session and `persisted` is false, so the UI can say "not saved in this browser".
// Staleness (reconcile 8.4 criterion 9): `recheck(w)` runs the CURRENT brief's gate over each record's frozen estimate. A candidate that no longer fits a firm limit becomes `status: 'stale'` naming the limit,
// never deleted, and returns to `current` when the limit allows it. The preference profile is not here and is never touched by it.
import { getTankModel } from '../data/tanks';
import type { Wants } from '../demand/suggest';
import { gateCandidate, type GateId, type Verdict } from './gate';
import { loadSnapshot, type CandidateStatus, type Reaction, type ReactionState, type StoredCandidate, type StoredLite } from './candidate';
import { STORE_CAP } from './constants';

export const EXPLORE_KEY = 'tanklook.explore';
const snapKey = (id: string) => `tanklook.explore.${id}`;
type St = Storage | undefined;
const ls = (): St => { try { return globalThis.localStorage; } catch { return undefined; } };

const isLite = (e: unknown): e is StoredLite => {
  const x = e as StoredLite;
  return !!x && typeof x.id === 'string' && typeof x.key === 'string' && !!x.reaction && typeof x.reaction.at === 'number' && ['unrated', 'liked', 'passed'].includes(x.reaction.state)
    && (x.status === 'current' || x.status === 'stale') && !!x.estimate && !!x.fp && !!x.identity && Array.isArray(x.roster) && Array.isArray(x.features) && typeof x.tankId === 'string';
};
const lite = (c: StoredCandidate): StoredLite => { const { snapshot: _s, ...rest } = c; return rest; };
/** A candidate the person kept (liked, saved or chosen) is never evicted to make room. */
export const isProtected = (c: StoredLite): boolean => c.reaction.state === 'liked' || c.reaction.saved || c.chosenAt !== undefined;

// ---------------------------------------------------------------------------------------------------------------- the staleness re-check
export interface Recheck { status: CandidateStatus; verdict: Verdict; /** the broken limit and what it says, while stale */ limit?: GateId; because?: string }
/** The CURRENT brief's gate over a record's frozen estimate: no regeneration, no preference read. A record is stale when the gate would block it now; a limit nobody set never does. */
export function recheckCandidate(c: StoredLite, w: Wants): Recheck {
  const tank = getTankModel(c.tankId);
  if (!tank) return { status: 'stale', verdict: 'blocked', limit: 'equipment', because: 'This tank is no longer in the catalogue.' };
  const unknown = c.verdict.welfareUnknown ? [c.verdict.welfareUnknown.replace(/^Not enough information: /, '')] : [];
  // welfare was decided when the candidate was generated and does not depend on a limit; the gate takes it as it was
  const g = gateCandidate({ w, ev: { welfareWords: [], unknown, needsOk: true } as never, est: c.estimate, world: c.identity.world, water: c.identity.water === 'none' ? 'freshwater' : c.identity.water, tank, roster: c.roster, holds: true });
  const broken = g.reasons.find(r => r.severity === 'blocked');
  return broken ? { status: 'stale', verdict: 'blocked', limit: broken.gate, because: broken.text } : { status: 'current', verdict: g.verdict };
}

// ---------------------------------------------------------------------------------------------------------------- the store
export interface PutResult { /** false when the record could not be kept (the store is full of kept candidates and this one is not) */ stored: boolean; evicted: string[] }
export interface ExploreStore {
  /** false once a write failed or storage is absent: the records then live in memory for this session */
  readonly persisted: boolean;
  /** the records, newest first (all, or one exploration's) */
  list(project?: string): StoredLite[];
  has(id: string): boolean;
  /** the record with its snapshot read back through parseScene, or undefined when it is gone or damaged */
  get(id: string): StoredCandidate | undefined;
  put(c: StoredCandidate): PutResult;
  /** change a record's reaction (like / pass / unrated, and Favourites separately); undefined when there is no such record */
  react(id: string, r: { state?: ReactionState; saved?: boolean }, now?: number): StoredLite | undefined;
  /** Make This Mine: the record is kept and marked chosen (and liked), so Undo and "back to my favourites" both work */
  choose(id: string, now?: number): StoredLite | undefined;
  remove(id: string): void;
  clear(project?: string): void;
  /** re-label every record against the current limits; returns the ones whose status changed */
  recheck(w: Wants): { id: string; from: CandidateStatus; to: CandidateStatus; limit?: GateId; because?: string }[];
}

export function createExploreStore(st: St = ls()): ExploreStore {
  let persisted = !!st, index: StoredLite[] = [];
  const mem = new Map<string, unknown>();   // snapshots not (yet) in storage
  try { const a: unknown = JSON.parse(st?.getItem(EXPLORE_KEY) ?? '[]'); if (Array.isArray(a)) index = a.filter(isLite); } catch { /* blocked or damaged: start empty */ }
  const flush = () => { if (!st) return; try { st.setItem(EXPLORE_KEY, JSON.stringify(index)); } catch { persisted = false; } };
  const drop = (id: string) => { mem.delete(id); try { st?.removeItem(snapKey(id)); } catch { /* blocked */ } };
  const touch = (id: string, f: (e: StoredLite) => StoredLite) => { const i = index.findIndex(e => e.id === id); if (i < 0) return undefined; index[i] = f(index[i]); flush(); return index[i]; };
  /** room for one more: passed first, then unrated, oldest first; a kept candidate is never evicted */
  const evictions = (extra: StoredLite): string[] => {
    const over = index.length + 1 - STORE_CAP; if (over <= 0) return [];
    const order = (e: StoredLite) => e.reaction.state === 'passed' ? 0 : 1;
    const out = [...index, extra].filter(e => !isProtected(e)).sort((a, b) => order(a) - order(b) || a.reaction.at - b.reaction.at || a.created - b.created).slice(0, over).map(e => e.id);
    return out;
  };

  return {
    get persisted() { return persisted; },
    list: project => (project === undefined ? index : index.filter(e => e.project === project)).slice().sort((a, b) => b.created - a.created || a.id.localeCompare(b.id)),
    has: id => index.some(e => e.id === id),
    get(id) {
      const e = index.find(x => x.id === id); if (!e) return undefined;
      try {
        const raw = mem.has(id) ? mem.get(id) : JSON.parse(st?.getItem(snapKey(id)) ?? 'null');
        return raw ? { ...e, snapshot: loadSnapshot(raw, e.sceneVersion) } : undefined;
      } catch { return undefined; }
    },
    put(c) {
      const rec = lite(c), had = index.some(e => e.id === c.id);
      const gone = had ? [] : evictions(rec);
      if (gone.includes(c.id)) return { stored: false, evicted: [] };   // full of kept candidates, and this one is not one
      for (const id of gone) { index = index.filter(e => e.id !== id); drop(id); }
      index = [rec, ...index.filter(e => e.id !== c.id)];
      mem.delete(c.id);
      try { if (!st) throw new Error('no storage'); st.setItem(snapKey(c.id), JSON.stringify(c.snapshot)); } catch { persisted = false; mem.set(c.id, structuredClone(c.snapshot)); }
      flush();
      return { stored: true, evicted: gone };
    },
    react(id, r, now = Date.now()) { return touch(id, e => ({ ...e, reaction: { state: r.state ?? e.reaction.state, saved: r.saved ?? e.reaction.saved, at: now } satisfies Reaction })); },
    choose(id, now = Date.now()) { return touch(id, e => ({ ...e, chosenAt: now, reaction: { state: 'liked', saved: e.reaction.saved, at: now } })); },
    remove(id) { index = index.filter(e => e.id !== id); drop(id); flush(); },
    clear(project) { for (const e of index.filter(x => project === undefined || x.project === project)) drop(e.id); index = project === undefined ? [] : index.filter(e => e.project !== project); flush(); },
    recheck(w) {
      const changed: ReturnType<ExploreStore['recheck']> = [];
      index = index.map(e => {
        const r = recheckCandidate(e, w), { staleLimit: _l, staleBecause: _b, ...rest } = e;
        if (r.status !== e.status) changed.push({ id: e.id, from: e.status, to: r.status, ...(r.limit ? { limit: r.limit } : {}), ...(r.because ? { because: r.because } : {}) });
        return { ...rest, status: r.status, verdict: { ...e.verdict, state: r.verdict }, ...(r.status === 'stale' ? { staleLimit: r.limit, staleBecause: r.because } : {}) } as StoredLite;
      });
      flush();
      return changed;
    },
  };
}
