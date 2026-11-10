// The AbEngine over the REAL session (AB0 scene/discoverySession.ts) and history (AB2 scene/proposalHistory.ts). Pairs still come from the stand-in source in fake.ts (`createDrawer`)
// until AB1's `nextPair` / `adapt` merge: swap `draw` / `adaptRecord` below for them and nothing else changes. Nothing here writes the working project.
import { discoverTabs } from '../../scene/discoverScope';
import { TABS, type Tab } from '../../scene/scope';
import { effectiveScope, freeze as freezeTab, loadSession, pause as pauseSession, rebase as rebaseSession, record as recordOutcome, resume, saveSession, setCurrent, setFavourite as setFav, startSession, unfreeze, type NextPair } from '../../scene/discoverySession';
import { createProposalHistory, reEvaluate as reEval } from '../../scene/proposalHistory';
import { getBrief } from '../setupBrief';
import { adaptRecord, createDrawer } from './fake';
import { championConflicts, lockConflicts } from './logic';
import type { Store } from '../../scene/store';
import type { VerdictOpts } from '../../scene/verdict';
import type { CandidateRecord, DiscoverySession, Outcome, PairResult, ReasonKey } from '../../scene/discoveryTypes';
import type { AbEngine, HistoryPage, ReEval } from './adapter';

const PROJECT = 'tanklook.scene';
const PAGE = 6;

export function createRealEngine(store: Store, opts: () => VerdictOpts = () => ({}), project: string = PROJECT): AbEngine {
  const hist = createProposalHistory(project), draw = createDrawer(store, opts), mem = new Map<string, CandidateRecord>();
  let s: DiscoverySession = startSession(store.rev, discoverTabs(store.tank)), stale = false, serial = 0;
  const save = () => { saveSession(project, s); };
  const rec = (id: string | undefined): CandidateRecord | undefined => id ? hist.get(id) ?? mem.get(id) : undefined;
  const nothing = (c: string[], r: string[]): PairResult => ({ ok: false, conflicts: c.length ? c : ['Every candidate broke a lock or a limit.'], relaxations: r.length ? r : ['Open a tab (check its switch) or relax a lock.'] });
  const known = (key: string) => !!hist.byKey(key, s.id) || [...mem.values()].some(r => r.key === key);
  const show = (a: CandidateRecord, b: CandidateRecord, type: NextPair['type']): PairResult => {
    const ids: string[] = [];
    for (const r of [a, b]) { mem.set(r.id, r); const o = hist.put(r); ids.push(o.stored ? r.id : o.id); }
    s = setCurrent(s, ids[0], ids[1], type); save();
    return { ok: true, a: rec(ids[0]) ?? a, b: rec(ids[1]) ?? b };
  };
  const drawFor = (np: NextPair): PairResult => {
    const champ = rec(s.championId);
    if (np.type === 'final' && champ && rec(s.pendingFreshId)) return show(champ, rec(s.pendingFreshId)!, 'final');
    if ((np.type === 'champion' || np.type === 'final') && champ) { const g = draw(s, 1, 'challenger', known); return g.recs.length ? show(champ, g.recs[0], 'champion') : nothing(g.conflicts, g.relaxations); }
    const g = draw(s, 2, np.type === 'fresh' ? 'fresh' : 'first', known);
    return g.recs.length < 2 ? nothing(g.conflicts, g.relaxations) : show(g.recs[0], g.recs[1], np.type === 'fresh' ? 'fresh' : 'first');
  };
  const nextNow = (): NextPair => s.pendingFreshId && s.championId ? { type: 'final', keep: s.championId } : s.championId ? { type: 'champion', keep: s.championId } : { type: 'first' };
  const markChampion = (before: string | undefined) => { if (s.championId && s.championId !== before) hist.markChampion(s.championId); else if (!s.championId && before) hist.clearChampion(s.id); };

  return {
    session: () => s,
    record: id => rec(id),
    open(scope) {
      const prev = loadSession(project);
      if (prev && prev.comparisons.length) { const r = resume(prev, store.rev); s = r.session; stale = r.needsRebase; }
      else { s = startSession(store.rev, scope ?? discoverTabs(store.tank)); stale = false; }
      if (scope) s = { ...s, scope: [...scope], status: 'active' };
      save();
    },
    isStale: () => stale,
    rebase() { const before = s.championId; s = rebaseSession(s, store.rev).session; stale = false; markChampion(before); save(); },
    restart() { s = startSession(store.rev, s.scope); stale = false; save(); },
    next() { const c = s.current, a = rec(c?.aId), b = rec(c?.bId); return a && b ? { ok: true, a, b } : drawFor(nextNow()); },
    choose(outcome: Outcome, why?: ReasonKey[], otherGood?: ReasonKey[]) {
      const before = s.championId, r = recordOutcome(s, outcome, why, otherGood);
      s = r.session; markChampion(before); save();
      // taste events (aspects.ts) are AB1's: it reads `session.comparisons` / the returned tasteSignal when it lands
      return drawFor(r.next);
    },
    different() { s = { ...s, current: undefined }; return drawFor({ type: 'fresh' }); },
    setScope(tab: Tab, on: boolean) {
      s = on ? unfreeze({ ...s, scope: TABS.filter(t => s.scope.includes(t) || t === tab) }, tab) : freezeTab({ ...s, scope: s.scope.filter(t => t !== tab) }, tab);
      save();
    },
    freeze(tab, source) { s = freezeTab({ ...s, scope: s.scope.filter(t => t !== tab) }, tab, source); save(); },
    recheckChampion() {
      const c = rec(s.championId), conflicts = championConflicts(store.tank, c);
      if (conflicts.length && c) { const before = s.championId; s = { ...s, championId: undefined, pendingFreshId: undefined, current: undefined }; markChampion(before); save(); }
      return { ok: !conflicts.length, conflicts };
    },
    history(page): HistoryPage {
      const total = hist.page(undefined, 0, 1).total, pages = Math.max(1, Math.ceil(total / PAGE)), p = Math.min(Math.max(0, page), pages - 1);
      const rows = hist.page(undefined, p * PAGE, PAGE).items.flatMap(l => { if (l.gone) return []; const r = rec(l.id); return r ? [{ rec: r, favourite: l.favourite, champion: l.champion }] : []; });
      return { rows, total, page: p, pages };
    },
    favourite(id, on) { hist.favourite(id, on); },
    bringBack(id) {
      const r = rec(id), c = rec(s.championId); if (!r) return nothing([], []);
      const bad = lockConflicts(store.tank, r.snapshot); if (bad.length) return nothing(bad, ['Adapt it first (Make It Yours offers that).']);
      if (!c) { const g = draw(s, 1, 'challenger', known); return g.recs.length ? show(r, g.recs[0], 'first') : nothing(g.conflicts, g.relaxations); }
      return show(c, r, 'champion');
    },
    setFavourite(id) {
      const r = rec(id); if (!r) return { ok: false, reason: 'Not found.' };
      const bad = lockConflicts(store.tank, r.snapshot); if (bad.length) return { ok: false, reason: `It breaks what you kept: ${bad.join(' ')}` };
      const before = s.championId; s = setFav(s, id).session; markChampion(before); save(); return { ok: true };
    },
    reEvaluate(id): ReEval {
      const r = rec(id)!, e = reEval(r, store.tank, getBrief(), { scope: effectiveScope(s), currentRev: store.rev });
      return { verdict: e.now.verdict, facts: { ...r.facts, newSpendUsd: e.now.newSpendUsd, toBuy: e.now.toBuy, mustUse: e.now.mustUse }, conflicts: e.conflicts };
    },
    adapt(id) {
      const r = rec(id); if (!r) return { ok: false, reason: 'Not found.' };
      const out = adaptRecord(store, r, `a${++serial}-${s.id}`, opts);
      if (out.ok) { mem.set(out.record.id, out.record); hist.put(out.record); }
      return out;
    },
    pause() { s = pauseSession(s); save(); },
  };
}
