// The AbEngine over the REAL session (AB0 scene/discoverySession.ts), pair generator (AB1 scene/pairGen.ts: nextPair, adapt; taste via explore/aspects.ts recordPair) and history (AB2
// scene/proposalHistory.ts). The shipped screen never uses fake.ts (tests only). Nothing here writes the working project; a taste event writes only the brief's aspects item.
import { discoverTabs } from '../../scene/discoverScope';
import { TABS, type Tab } from '../../scene/scope';
import { effectiveScope, freeze as freezeTab, loadSession, pause as pauseSession, rebase as rebaseSession, record as recordOutcome, resume, saveSession, setCurrent, setFavourite as setFav, startSession, unfreeze, type NextPair } from '../../scene/discoverySession';
import { createProposalHistory, reEvaluate as reEval } from '../../scene/proposalHistory';
import { getBrief } from '../setupBrief';
import { suggestNarrowing } from '../../scene/breadth';
import { adapt as adaptPair, combine as combinePair, nextPair, type ScoredRow } from '../../scene/pairGen';
import { featuresFor, scoreScene } from '../../scene/pairFacts';
import { reasonTags, recordAspect, recordPair, undoAspectsOf } from '../../explore/aspects';
import { ATTR_TAGS, setThumb as putThumb, thumbKey, type AttrKey, type ThumbMap } from '../../scene/attrs';
import { customTankWants } from '../../demand/suggest';
import { briefToWants } from '../../scene/brief';
import { editBrief } from '../setupBrief';
import { championConflicts, lockConflicts } from './logic';
import type { Store } from '../../scene/store';
import type { VerdictOpts } from '../../scene/verdict';
import type { CandidateRecord, DiscoverySession, Outcome, PairResult, ReasonKey } from '../../scene/discoveryTypes';
import { projectExtras, setProjectExtras, type Brief } from '../../scene/brief';
import { adjustmentsOf } from '../../scene/combine';
import { getSpecies } from '../../data/species';
import type { AbEngine, CombineOutcome, CombineProposal, HistoryPage, ReEval } from './adapter';

const PROJECT = 'tanklook.scene';
const PAGE = 6;

export function createRealEngine(store: Store, _opts: () => VerdictOpts = () => ({}), project: string = PROJECT): AbEngine {
  const hist = createProposalHistory(project), mem = new Map<string, CandidateRecord>();
  const dir = () => projectExtras(getBrief()).direction ?? 'unsure';   // the habitat picked at Start New
  let s: DiscoverySession = startSession(store.rev, discoverTabs(store.effTank), dir()), stale = false;
  const save = () => { saveSession(project, s); };
  const rec = (id: string | undefined): CandidateRecord | undefined => id ? hist.get(id) ?? mem.get(id) : undefined;
  const nothing = (c: string[], r: string[]): PairResult => ({ ok: false, conflicts: c.length ? c : ['Every candidate broke a lock or a limit.'], relaxations: r.length ? r : ['Open a tab (check its switch) or relax a lock.'] });
  const proj = () => ({ tank: store.effTank, rev: store.rev });
  let scores: ScoredRow[] = [];
  const pair = (type: NextPair['type']): PairResult => nextPair(proj(), getBrief(), s, id => rec(id), { scores: rows => { scores = rows; }, next: type, shownKeys: [...mem.values()].flatMap(r => r.key ? [r.key] : []), units: store.scene.units });
  const sideOf = (r: CandidateRecord) => { const b = getBrief(); return { id: r.id, features: featuresFor(r.snapshot, scoreScene(r.snapshot, b, customTankWants(b, briefToWants(b)))) }; };
  const show = (a: CandidateRecord, b: CandidateRecord, type: NextPair['type']): PairResult => {
    const ids: string[] = [];
    for (const r of [a, b]) { mem.set(r.id, r); const o = hist.put(r); ids.push(o.stored ? r.id : o.id); }
    s = setCurrent(s, ids[0], ids[1], type); save();
    return { ok: true, a: rec(ids[0]) ?? a, b: rec(ids[1]) ?? b };
  };
  const drawFor = (np: NextPair): PairResult => {
    const r = pair(np.type);
    if (!r.ok && r.single) { mem.set(r.single.id, r.single); hist.put(r.single); }
    return r.ok ? show(r.a, r.b, np.type) : r;
  };
  const nextNow = (): NextPair => s.pendingFreshId && s.championId ? { type: 'final', keep: s.championId } : s.championId ? { type: 'champion', keep: s.championId } : { type: 'first' };
  const markChampion = (before: string | undefined) => { if (s.championId && s.championId !== before) hist.markChampion(s.championId); else if (!s.championId && before) hist.clearChampion(s.id); };

  const writeThumb = (br: Brief, attr: AttrKey, elements: string[], v: 1 | -1 | 0): Brief => {
    const x = projectExtras(br), next = putThumb(x.thumbs as ThumbMap | undefined, attr, elements, v), { thumbs: _t, ...rest } = x;
    return setProjectExtras(br, Object.keys(next).length ? { ...rest, thumbs: next } : rest);
  };
  /** An AB13 attribute pick: the preferred value's thumb entry, and nothing else (DQ1 P4). Any older tagged event for the same value is taken back so a repeated pick never stacks. */
  const putPick = (_id: string, attr: AttrKey, elements: string[]) => editBrief(br => undoAspectsOf(writeThumb(br, attr, elements, 1), `thumb:${thumbKey(attr, elements)}`.slice(0, 120)));
  return {
    session: () => s,
    lastScores: () => scores,
    record: id => rec(id),
    open(scope) {
      const prev = loadSession(project);
      if (prev && prev.comparisons.length) { const r = resume(prev, store.rev); s = r.session; stale = r.needsRebase; }
      else { s = startSession(store.rev, scope ?? discoverTabs(store.effTank), dir()); stale = false; }
      if (scope) s = { ...s, scope: [...scope], status: 'active' };
      save();
    },
    isStale: () => stale,
    rebase() { const before = s.championId; s = rebaseSession(s, store.rev).session; stale = false; markChampion(before); save(); },
    restart() { s = startSession(store.rev, s.scope, dir()); stale = false; save(); },
    next() { const c = s.current, a = rec(c?.aId), b = rec(c?.bId); return a && b ? { ok: true, a, b } : drawFor(nextNow()); },
    choose(outcome: Outcome, why?: ReasonKey[], otherGood?: ReasonKey[], rel?: { attr: AttrKey; elements: string[]; side: 'A' | 'B' }[]) {
      const before = s.championId, a = rec(s.current?.aId), b = rec(s.current?.bId), r = recordOutcome(s, outcome, why, otherGood);
      s = r.session; markChampion(before); save();
      // taste (aspects.ts): ranking only, never a lock; Skip records nothing
      if (a && b && outcome !== 'skip') editBrief(br => recordPair(br, { outcome, a: sideOf(a), b: sideOf(b), ...(why?.length ? { why } : {}), ...(otherGood?.length ? { otherGood } : {}) }));
      // AB13: the optional A / B attribute picks land at the SAME boundary as the overall vote (never for Skip), as soft +1 evidence on the preferred value only
      if (a && b && outcome !== 'skip' && rel?.length) for (const x of rel) putPick((x.side === 'A' ? a : b).id, x.attr, x.elements);   // DQ1 (P4): exactly ONE learning event per pick: the thumb entry (scored once, by thumbBonus); no second tagged aspect event
      return drawFor(r.next);
    },
    different() { s = { ...s, current: undefined }; return drawFor({ type: 'fresh' }); },
    setScope(tab: Tab, on: boolean) {
      s = on ? unfreeze({ ...s, scope: TABS.filter(t => s.scope.includes(t) || t === tab) }, tab) : freezeTab({ ...s, scope: s.scope.filter(t => t !== tab) }, tab);
      save();
    },
    freeze(tab, source) { s = freezeTab({ ...s, scope: s.scope.filter(t => t !== tab) }, tab, source); save(); },
    recheckChampion() {
      const c = rec(s.championId), conflicts = championConflicts(store.effTank, c);
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
      const bad = lockConflicts(store.effTank, r.snapshot); if (bad.length) return nothing(bad, ['Adapt it first (Make It Yours offers that).']);
      if (!c) { const g = pair('first'); if (!g.ok) return g; const other = g.a.id === r.id ? g.b : g.a; return show(r, other, 'first'); }
      return show(c, r, 'champion');
    },
    setFavourite(id) {
      const r = rec(id); if (!r) return { ok: false, reason: 'Not found.' };
      const bad = lockConflicts(store.effTank, r.snapshot); if (bad.length) return { ok: false, reason: `It breaks what you kept: ${bad.join(' ')}` };
      const before = s.championId; s = setFav(s, id).session; markChampion(before); save(); return { ok: true };
    },
    reEvaluate(id): ReEval {
      const r = rec(id)!, e = reEval(r, store.effTank, getBrief(), { scope: effectiveScope(s), currentRev: store.rev });
      return { verdict: e.now.verdict, facts: { ...r.facts, newSpendUsd: e.now.newSpendUsd, toBuy: e.now.toBuy, mustUse: e.now.mustUse }, conflicts: e.conflicts };
    },
    adapt(id) {
      const r = rec(id); if (!r) return { ok: false, reason: 'Not found.' };
      const out = adaptPair(r, proj(), getBrief(), { sessionId: s.id, scope: effectiveScope(s), units: store.scene.units });
      if (!out.ok) return { ok: false, reason: (([...new Set(out.conflicts.map(c => c.replace(/\.+$/, '')))].join('; ') + (out.relaxations.length ? `. Smallest change: ${[...new Set(out.relaxations.map(c => c.replace(/\.+$/, '')))].join('; ')}` : '')) || 'It cannot be adapted to what you kept') + '.' };
      mem.set(out.record.id, out.record); hist.put(out.record); return { ok: true, record: out.record };
    },
    combine(targetId, donorId, tab): CombineOutcome {
      const t = rec(targetId), d = rec(donorId); if (!t || !d) return { ok: false, reason: 'One of the designs is no longer there.', relaxations: [] };
      const out = combinePair(t, d, tab, proj(), getBrief(), { sessionId: s.id, units: store.scene.units });
      if (!out.ok) { const dedupe = (xs: string[]) => [...new Set(xs.map(c => c.replace(/\.+$/, '')))]; return { ok: false, reason: dedupe(out.conflicts).join('. ') + '.', relaxations: dedupe(out.relaxations) }; }
      const adjustments = adjustmentsOf(t, out.record, tab, sp => getSpecies(sp)?.name ?? sp), m = (x: { mean: number }) => Math.round(x.mean);
      const spendLine = m(out.record.facts.newSpendUsd) === m(t.facts.newSpendUsd) ? '' : `New spend $${m(t.facts.newSpendUsd)} to $${m(out.record.facts.newSpendUsd)}.`;
      return { ok: true, proposal: { record: out.record, targetId, donorId, tab, adjustments, spendLine } };
    },
    acceptCombine(p: CombineProposal): PairResult {
      const t = rec(p.targetId), d = rec(p.donorId); mem.set(p.record.id, p.record);
      // taste: the donor's tab is LIKED (ranking only, never a lock; the substrate has no taste tags)
      const on = reasonTags([p.tab]); if (d && on.length) editBrief(br => recordAspect(br, { kind: 'like', c: `${d.id}#${p.tab}`, features: sideOf(d).features, on }));
      const champ = rec(s.championId);
      return champ && champ.id !== p.record.id ? show(champ, p.record, 'champion') : show(t ?? p.record, p.record, 'first');
    },
    thumbs: () => (projectExtras(getBrief()).thumbs ?? {}) as ThumbMap,
    setThumb(id, attr: AttrKey, elements, v) {
      // soft guidance (AB7): the value is remembered for the ranking nudge, and where the learner has a tag for the attribute a tagged taste event is written (replacing the earlier one for this value, so up / down are exclusive)
      const r = rec(id), tags = ATTR_TAGS[attr], c = `thumb:${thumbKey(attr, elements)}`.slice(0, 120);
      editBrief(br => {
        let out = writeThumb(br, attr, elements, v);
        out = undoAspectsOf(out, c);
        if (v && r && tags.length) out = recordAspect(out, { kind: 'tag', c, features: sideOf(r).features, ...(v > 0 ? { on: tags } : { off: tags }) });
        return out;
      });
    },
    suggestion() { return suggestNarrowing(store.effTank, s, id => rec(id), effectiveScope(s).filter(t => discoverTabs(store.effTank).includes(t))); },
    pause() { s = pauseSession(s); save(); },
  };
}
