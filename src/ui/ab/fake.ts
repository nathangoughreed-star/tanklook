// A stand-in AbEngine (lane AB3) so the A/B screen works before AB0 (session), AB1 (pairs) and AB2 (history) land. It makes candidates from the working project with DX2 `propose`
// (scoped, lock-aware), keeps the session, champion rules and history IN MEMORY, and is replaced by `real.ts` as those lanes merge. It never writes the working project.
import { propose, type DiscoveryProposal } from '../../scene/discover';
import { previewProposal } from '../../scene/proposal';
import { TABS, type Tab } from '../../scene/scope';
import { verdictOf, type VerdictOpts } from '../../scene/verdict';
import { equipPlan } from '../../scene/equipPlan';
import { volume } from '../../scene/physics';
import { layerOf, LIBRARY } from '../../scene/items';
import { getSpecies } from '../../data/species';
import { demandOf } from '../../demand/engine';
import { defaultProfile } from '../../demand/types';
import { difficultyOf } from '../../explore/difficulty';
import { getBrief } from '../setupBrief';
import { discoverTabs } from '../../scene/discoverScope';
import { ensureUids } from '../../scene/uid';
import { adaptToLocks, championConflicts, lockConflicts } from './logic';
import type { Store } from '../../scene/store';
import type { TankSetup } from '../../scene/types';
import type { CandidateFacts, CandidateRecord, Comparison, DiscoverySession, Figure, Outcome, PairResult, ReasonKey } from '../../scene/discoveryTypes';
import type { AbEngine, AdaptResult, HistoryPage, ReEval } from './adapter';

const tally = (names: string[]) => { const m = new Map<string, number>(); for (const n of names) m.set(n, (m.get(n) ?? 0) + 1); return [...m].map(([n, k]) => k > 1 ? `${k} ${n}` : n); };
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** A short name for a card: its animals, else its style (fake-grade; AB1 names candidates itself). */
function titleOf(S: TankSetup, p?: Pick<DiscoveryProposal, 'summary' | 'axes'>): string {
  const sp = [...new Set(S.fish.map(f => getSpecies(f.species)?.name ?? f.species))].slice(0, 2);
  const lead = sp.length ? sp.join(' and ') : cap(p?.axes.style && p.axes.style !== 'none' ? p.axes.style : 'tank');
  return p?.axes.sizeClass && p.axes.sizeClass !== 'none' ? `${lead}, ${p.axes.sizeClass}` : lead;
}
const fig = (lo: number, mean: number, hi: number, est = true): Figure => ({ lo, mean, hi, est });

/** Everything a card shows, read from a complete design (fake-grade: AB1 fills these from pairFacts). */
export function factsOf(S: TankSetup, p: Pick<DiscoveryProposal, 'cost' | 'summary' | 'axes'> | undefined, opts: VerdictOpts = {}): CandidateFacts {
  const b = getBrief(), ep = equipPlan(S, b), min = demandOf(S, defaultProfile()).totals.minPerWeek;
  const rem = p?.cost.remaining ?? ep.remaining, mo = p?.cost.monthly ?? ep.monthly;
  void opts;
  const fish = new Map<string, number>(); for (const f of S.fish) fish.set(f.species, (fish.get(f.species) ?? 0) + 1);
  const label = (v: string) => LIBRARY[v]?.label ?? v;
  return {
    title: titleOf(S, p), habitat: cap(p?.axes.style && p.axes.style !== 'none' ? p.axes.style : S.water.on ? (S.water.salt ? 'Saltwater' : 'Freshwater') : 'Terrarium'),
    gallons: S.water.on ? Math.round(volume(S.tank).gallons) : null,
    newSpendUsd: fig(rem.lo, rem.mode, rem.hi), monthlyUsd: fig(mo.lo, mo.mode, mo.hi), weeklyMin: fig(min * 0.8, min, min * 1.25),
    difficulty: difficultyOf(S).level, toBuy: ep.toBuy, reused: ep.available.map(i => i.key), mustUse: ep.mustUse.map(i => i.key),
    stocking: [...fish].map(([species, n]) => ({ species, name: getSpecies(species)?.name ?? species, n })),
    plants: tally(S.items.filter(i => layerOf(i) === 'plant').map(i => label(i.variant))), hardscape: tally(S.items.filter(i => layerOf(i) !== 'plant').map(i => label(i.variant))),
    substrate: [S.substrate ? 'Substrate as designed' : 'Bare floor'],
  };
}

/** The pair SOURCE: k new complete candidates for a session (DX2 propose, scoped, lock-aware, frozen tabs left alone). AB1's `nextPair` replaces this; the real engine and the fake engine both use it until then. */
export interface Drawn { recs: CandidateRecord[]; conflicts: string[]; relaxations: string[] }
export type Draw = (s: DiscoverySession, k: number, purpose: CandidateRecord['purpose'], known: (key: string) => boolean) => Drawn;
export function createDrawer(store: Store, opts: () => VerdictOpts = () => ({})): Draw {
  let serial = 0, seedShift = 0;
  const make = (s: DiscoverySession, p: DiscoveryProposal, purpose: CandidateRecord['purpose']): CandidateRecord => {
    const snap = ensureUids(previewProposal(store.effTank, p));
    return { id: `c${++serial}-${s.id}`, sessionId: s.id, createdAt: Date.now(), baseRev: store.rev, purpose, snapshot: snap, facts: factsOf(snap, p), verdict: p.verdict, assumptions: ['Prices and minutes are estimates.'], key: p.source + '|' + JSON.stringify(p.delta).length };
  };
  return (s, k, purpose, known) => {
    const scope = s.scope.filter(t => !s.freezes.some(f => f.tab === t));
    const d = propose(store, getBrief(), { scope, objective: 'explore' }, k + 4, { ...opts(), units: store.scene.units, seed: store.effTank.layout.seed + 977 * ++seedShift });
    const out: CandidateRecord[] = [];
    for (const p of d.proposals) { const r = make(s, p, purpose); if (!known(r.key!) && !out.some(x => x.key === r.key)) out.push(r); if (out.length === k) break; }
    return { recs: out, conflicts: (d.noSolution?.conflicts ?? []).map(c => c.text), relaxations: d.noSolution?.relaxations ?? [] };
  };
}
/** An adapted copy of a record (new id, parentId set), or a refusal. */
export function adaptRecord(store: Store, r: CandidateRecord, id: string, opts: () => VerdictOpts = () => ({})): AdaptResult {
  const S = adaptToLocks(r.snapshot, store.effTank); if (!S) return { ok: false, reason: 'It cannot be made to keep what you kept without changing it into a different design.' };
  const { thumb: _t, ...rest } = r;
  return { ok: true, record: { ...rest, id, createdAt: Date.now(), baseRev: store.rev, purpose: 'adapted', parentId: r.id, snapshot: S, facts: factsOf(S, undefined), verdict: verdictOf(S, getBrief(), opts()), key: (r.key ?? r.id) + '|adapted' } };
}

export function createFakeEngine(store: Store, opts: () => VerdictOpts = () => ({})): AbEngine {
  const recs = new Map<string, CandidateRecord>(), order: string[] = [], favs = new Set<string>();
  let n = 0, serial = 0, s: DiscoverySession = fresh();
  const draw = createDrawer(store, opts);
  function fresh(scope?: Tab[]): DiscoverySession {
    return { id: 'fake-' + ++n, baseRev: store.rev, scope: scope ?? discoverTabs(store.effTank), freezes: [], direction: 'unsure', comparisons: [], status: 'active' };
  }
    const gen = (k: number, purpose: CandidateRecord['purpose']) => draw(s, k, purpose, key => [...recs.values()].some(x => x.key === key));
  const put = (r: CandidateRecord) => { recs.set(r.id, r); order.unshift(r.id); };
  const show = (a: CandidateRecord, b: CandidateRecord, type: Comparison['type']): PairResult => {
    for (const r of [a, b]) if (!recs.has(r.id)) put(r);
    s.current = { aId: a.id, bId: b.id, type }; return { ok: true, a, b };
  };
  const nothing = (c: string[], r: string[]): PairResult => ({ ok: false, conflicts: c.length ? c : ['Every candidate broke a lock or a limit.'], relaxations: r.length ? r : ['Open a tab (check its switch) or relax a lock.'] });
  const champ = () => s.championId ? recs.get(s.championId) : undefined;
  const challenger = (type: Comparison['type'], purpose: CandidateRecord['purpose']): PairResult => {
    const c = champ(); if (!c) return pairFresh('first');
    const g = gen(1, purpose); if (!g.recs.length) return nothing(g.conflicts, g.relaxations);
    return show(c, g.recs[0], type);
  };
  const pairFresh = (type: Comparison['type']): PairResult => {
    const g = gen(2, type === 'first' ? 'first' : 'fresh'); if (g.recs.length < 2) return nothing(g.conflicts, g.relaxations);
    return show(g.recs[0], g.recs[1], type);
  };
  const nextFor = (): PairResult => {
    if (s.pendingFreshId && champ() && recs.get(s.pendingFreshId)) return show(champ()!, recs.get(s.pendingFreshId)!, 'final');
    return s.championId ? challenger('champion', 'challenger') : pairFresh('first');
  };
  return {
    session: () => s,
    record: id => recs.get(id),
    open(scope) { if (scope) { s.scope = scope; } s.status = 'active'; },
    isStale: () => s.baseRev !== store.rev && !!s.comparisons.length,
    rebase() { s.baseRev = store.rev; s.current = undefined; },
    restart() { const scope = s.scope; s = fresh(scope); },
    next() { const c = s.current; const a = c && recs.get(c.aId), b = c && recs.get(c.bId); return a && b ? { ok: true, a, b } : nextFor(); },
    choose(outcome: Outcome, why?: ReasonKey[], otherGood?: ReasonKey[], _rel?: unknown) {
      const cur = s.current; if (!cur) return nextFor();
      const a = recs.get(cur.aId)!, b = recs.get(cur.bId)!, winner = outcome === 'A' ? a : outcome === 'B' ? b : undefined, before = s.championId;
      const cmp: Comparison = { id: `cmp${s.comparisons.length + 1}`, aId: a.id, bId: b.id, type: cur.type, outcome, ...(why?.length ? { why } : {}), ...(otherGood?.length ? { otherGood } : {}), ...(before ? { championBefore: before } : {}), at: Date.now() };
      if (cur.type === 'first') { if (winner) s.championId = winner.id; }
      else if (cur.type === 'champion') { if (winner && winner.id !== before) s.championId = winner.id; }
      else if (cur.type === 'fresh') {
        const w = winner ?? (outcome === 'both' ? a : undefined);
        if (w) { if (champ()) s.pendingFreshId = w.id; else s.championId = w.id; }
      } else if (cur.type === 'final') { if (winner && winner.id === s.pendingFreshId) s.championId = winner.id; s.pendingFreshId = undefined; }
      if (s.championId !== before) cmp.championAfter = s.championId;
      s.comparisons.push(cmp); s.current = undefined;
      return nextFor();
    },
    different() { s.current = undefined; return pairFresh('fresh'); },
    setScope(tab, on) {
      s.scope = on ? TABS.filter(t => s.scope.includes(t) || t === tab) : s.scope.filter(t => t !== tab);
      if (on) s.freezes = s.freezes.filter(f => f.tab !== tab); else if (!s.freezes.some(f => f.tab === tab)) s.freezes.push({ tab, source: s.championId ?? 'working', ...(s.championId ? {} : { rev: store.rev }) });
    },
    freeze(tab, source) { s.scope = s.scope.filter(t => t !== tab); s.freezes = s.freezes.filter(f => f.tab !== tab); s.freezes.push({ tab, source, ...(source === 'working' ? { rev: store.rev } : {}) }); },
    recheckChampion() {
      const c = champ(), conflicts = championConflicts(store.effTank, c);
      if (conflicts.length && c) { s.championId = undefined; s.pendingFreshId = undefined; s.current = undefined; }
      return { ok: !conflicts.length, conflicts };
    },
    history(page) {
      const size = 6, pages = Math.max(1, Math.ceil(order.length / size)), p = Math.min(Math.max(0, page), pages - 1);
      return { rows: order.slice(p * size, p * size + size).map(id => ({ rec: recs.get(id)!, favourite: favs.has(id), champion: id === s.championId })), total: order.length, page: p, pages } satisfies HistoryPage;
    },
    favourite(id, on) { if (on) favs.add(id); else favs.delete(id); },
    bringBack(id) {
      const r = recs.get(id), c = champ(); if (!r) return nothing([], []);
      if (lockConflicts(store.effTank, r.snapshot).length) return nothing(lockConflicts(store.effTank, r.snapshot), ['Adapt it first (Make It Yours offers that).']);
      if (!c) { const g = gen(1, 'challenger'); if (!g.recs.length) return nothing(g.conflicts, g.relaxations); return show(r, g.recs[0], 'first'); }
      return show(c, r, 'champion');
    },
    setFavourite(id) {
      const r = recs.get(id); if (!r) return { ok: false, reason: 'Not found.' };
      const bad = lockConflicts(store.effTank, r.snapshot); if (bad.length) return { ok: false, reason: `It breaks what you kept: ${bad.join(' ')}` };
      s.championId = id; s.pendingFreshId = undefined; s.current = undefined; return { ok: true };
    },
    reEvaluate(id): ReEval {
      const r = recs.get(id)!, v = verdictOf(r.snapshot, getBrief(), opts());
      return { verdict: v, facts: factsOf(r.snapshot, undefined), conflicts: lockConflicts(store.effTank, r.snapshot) };
    },
    adapt(id): AdaptResult {
      const r = recs.get(id); if (!r) return { ok: false, reason: 'Not found.' };
      const out = adaptRecord(store, r, `a${++serial}-${s.id}`, opts); if (out.ok) put(out.record); return out;
    },
    pause() { s.status = 'paused'; },
  };
}
