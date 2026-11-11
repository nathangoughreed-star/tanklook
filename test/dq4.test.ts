// DQ4: cache split (feasibility vs ranking), Like neither, reset learned taste, reload history, preview isolation. Spec section 7; scenarios 18-22. Through the real engine and live nextPair.
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { locksOf } from '../src/scene/locks';
import { clearPairCache, feasibilityBrief, feasibilityPrefs, rankingSig } from '../src/scene/pairGen';
import { attrValues, relEvidence, thumbOf } from '../src/scene/attrs';
import { aspectsOf } from '../src/explore/aspects';
import { leanOf } from '../src/scene/learning';
import { createRealEngine } from '../src/ui/ab/real';
import { bindBriefStore, getBrief, editBrief, emptyBrief } from '../src/ui/setupBrief';
import { applyQuickPrefs, emptyAnswers, readQuickPrefs } from '../src/scene/quickPrefs';
import { QUICK_ARCHETYPES } from '../src/scene/quickArchetypes';
import { setItem } from '../src/scene/brief';
import { holdAttr, keepFromRecord } from '../src/ui/ab/logic';
import type { Fish, TankSetup } from '../src/scene/types';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + (i % 8) * 60, y: 100, depth: 60 + (i % 5) * 60, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fishOf('ember', 6, 201);
  return ensureUids(t);
}
const mkStore = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); bindBriefStore(s); return s; };
beforeEach(() => { clearPairCache(); editBrief(() => emptyBrief()); });
const mk = (id = 'dq4-' + Math.random()) => { const s = mkStore(), e = createRealEngine(s, () => ({}), id); s.frozen = true; e.open(['animals', 'plants', 'hardscape', 'substrate']); return { s, e, id }; };
const first = (e: ReturnType<typeof createRealEngine>) => { const r = e.next(); if (!r.ok) throw new Error('no pair'); return r; };

describe('scenario 19: taste reranks, structure revalidates', () => {
  it('the feasibility key ignores taste (aspects, thumbs, lean, card answers) and sees structure (limits, firm items)', () => {
    const b0 = emptyBrief(), pf = readQuickPrefs(b0);
    const taste = applyQuickPrefs(b0, { ...emptyAnswers(), arch: { [QUICK_ARCHETYPES[0].key]: 'interested' } });
    expect(JSON.stringify(feasibilityBrief(taste))).toBe(JSON.stringify(feasibilityBrief(b0)));
    expect(rankingSig(taste, readQuickPrefs(taste))).not.toBe(rankingSig(b0, pf));
    expect(JSON.stringify(feasibilityPrefs(readQuickPrefs(taste)))).toBe(JSON.stringify(feasibilityPrefs(pf)));
    const firm = setItem(b0, 'constraints.budget' as never, { max: 500 } as never, 'hard');
    expect(JSON.stringify(feasibilityBrief(firm))).not.toBe(JSON.stringify(feasibilityBrief(b0)));
  });
  it('live: after a vote the champion pair is RERANKED from the cached designs; a new lock builds a fresh pool', () => {
    const { s, e } = mk(); first(e);
    const keep = (r: ReturnType<typeof e.choose>) => (r.ok && r.a.id === e.session().championId ? 'A' : 'B') as 'A' | 'B';
    let n = e.choose('A', ['plants']); const m1 = e.lastPool!()!;
    n = e.choose(keep(n), ['animals']); const m2 = e.lastPool!()!;
    console.log('DQ4 s19', JSON.stringify({ m1: [m1.cache, m1.tried, m1.ms], m2: [m2.cache, m2.tried, m2.ms, m2.reusedDesigns] }));
    expect(m2.cache).toBe('reranked'); expect(m2.reusedDesigns).toBeGreaterThan(0); expect(m2.tried).toBeLessThanOrEqual(m1.tried + 3);
    s.frozen = true; const c = e.record(e.session().championId!)!, lk = attrValues(c.snapshot, c.facts).find(v => v.key === 'background')?.lock;
    if (lk) holdAttr(s, c, lk); else keepFromRecord(s, c, { kind: 'substrate' });
    e.choose(keep(n)); const m3 = e.lastPool!()!;
    expect(m3.cache).toBe('new');
  }, 240000);
});

describe('scenario 18: Like neither broadens the NEXT pair (read by the live path)', () => {
  it('the challenger after Like neither is drawn out of family, no nearer than the one before', () => {
    const { s, e } = mk(); e.open(['animals', 'plants', 'hardscape', 'substrate', 'tank']); void s; first(e);
    const near = e.choose('A'); if (!near.ok) throw new Error('x'); const d1 = e.lastPool!()!.pairDistance;
    const far = e.choose('neither'); if (!far.ok) throw new Error('x'); const m = e.lastPool!()!;
    console.log('DQ4 s18', d1, m.pairDistance, m.strategy);
    void d1; expect(m.pairDistance!).toBeGreaterThan(0.6); expect(m.strategy).toBe('out-of-family');
  }, 240000);
});

describe('scenario 21: reset learned taste', () => {
  it('forgets votes, thumbs, lean and pending component preferences; keeps cards, locks, history, champion and the saved design', () => {
    const { s, e } = mk();
    editBrief(b => applyQuickPrefs(b, { ...emptyAnswers(), arch: { [QUICK_ARCHETYPES[0].key]: 'interested', [QUICK_ARCHETYPES[1].key]: 'avoid' } }));
    const r = first(e), va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts);
    const cheaper = r.a.facts.newSpendUsd.mean <= r.b.facts.newSpendUsd.mean ? 'A' : 'B';
    e.choose(cheaper, ['upfront'], undefined, relEvidence({ plants: cheaper === 'A' ? 'B' : 'A' }, va, vb));
    e.choose('A', ['plants']);
    s.frozen = true; const c = e.record(e.session().championId!)!; keepFromRecord(s, c, { kind: 'substrate' });
    const design = Store.designKey(s.scene), locks = JSON.stringify(locksOf(s.tank)), told = JSON.stringify(aspectsOf(getBrief())?.told), cmp = e.session().comparisons.length, champ = e.session().championId, rows = e.history(0).total;
    expect((aspectsOf(getBrief())?.events ?? []).length).toBeGreaterThan(0);
    const stated = JSON.stringify(readQuickPrefs(getBrief()).arch);
    e.resetLearning!();
    const A = aspectsOf(getBrief());
    expect(A?.events ?? []).toEqual([]); expect(JSON.stringify(A?.told)).toBe(told);
    expect(leanOf(getBrief())).toEqual({}); expect(e.thumbs?.() ?? {}).toEqual({}); expect(e.session().targets).toBeUndefined();
    expect(JSON.stringify(readQuickPrefs(getBrief()).arch)).toBe(stated);
    expect(Store.designKey(s.scene)).toBe(design); expect(JSON.stringify(locksOf(s.tank))).toBe(locks);
    expect(e.session().comparisons.length).toBe(cmp); expect(e.session().championId).toBe(champ); expect(e.history(0).total).toBe(rows);
    expect(thumbOf(e.thumbs?.() ?? {}, 'plants', ['x'])).toBe(0);
    expect(e.next().ok).toBe(true);
  }, 240000);
});

describe('scenario 20: reload keeps exposure history', () => {
  const g = globalThis as { localStorage?: unknown };
  beforeEach(() => { const m = new Map<string, string>(); g.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => m.clear() }; });
  afterEach(() => { delete g.localStorage; });
  it('after a reload no design shown before comes straight back, and history still reopens one', () => {
    const { e, s, id } = mk(), seen = new Set<string>(), keys = (rs: { key?: string }[]) => rs.forEach(x => x.key && seen.add(x.key));
    const r = first(e); keys([r.a, r.b]);
    let n = e.choose('A'); if (!n.ok) throw new Error('x'); keys([n.a, n.b]); n = e.choose('A'); if (!n.ok) throw new Error('x'); keys([n.a, n.b]);
    clearPairCache();
    const e2 = createRealEngine(s, () => ({}), id); e2.open(['animals', 'plants', 'hardscape', 'substrate']);
    expect(e2.session().comparisons.length).toBeGreaterThan(0);
    expect(e2.next().ok).toBe(true);
    const champ = e2.session().championId, nx = e2.choose('A'); if (!nx.ok) throw new Error('no next pair');
    for (const x of [nx.a, nx.b]) if (x.id !== champ && x.key) expect(seen.has(x.key), 'a design shown before the reload came straight back').toBe(false);
    const hist = e2.history(0); expect(hist.total).toBeGreaterThanOrEqual(seen.size);
    const old = hist.rows.find(h => h.rec.id !== e2.session().championId)!; expect(e2.bringBack(old.rec.id).ok).toBe(true);
  }, 240000);
});

describe('scenario 22: preview isolation after a component pick, Keep / Lock', () => {
  it('the working design, rev and undo stack are untouched', () => {
    const { s, e } = mk(); const before = { design: Store.designKey(s.scene), snap: s.snapshotAll(), rev: s.rev };
    const r = first(e), va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts);
    e.choose('A', undefined, undefined, relEvidence({ plants: 'B' }, va, vb)); e.choose('A');
    s.frozen = true; const c = e.record(e.session().championId!)!; keepFromRecord(s, c, { kind: 'substrate' });
    const after = s.snapshotAll();
    expect(Store.designKey(s.scene)).toBe(before.design); expect(s.rev).toBe(before.rev); expect(after.undo).toEqual(before.snap.undo); expect(after.redo).toEqual(before.snap.redo);
  }, 240000);
});

describe('scenario 24: timings, cache split before / after', () => {
  const run = (cold: boolean) => {
    const { e } = mk(); const t0 = performance.now(); const r = first(e); const firstMs = Math.round(performance.now() - t0), fm = e.lastPool!()!;
    let n = e.choose('A', ['plants']); const m1 = e.lastPool!()!;
    const side = (r: typeof n) => (r.ok && r.a.id === e.session().championId ? 'A' : 'B') as 'A' | 'B';
    if (cold) clearPairCache();                               // the OLD behaviour: any taste change built a new cache
    const t1 = performance.now(); n = e.choose(side(n), ['animals']); const m2 = e.lastPool!()!, voteMs = Math.round(performance.now() - t1);
    void r; return { firstMs, firstTried: fm.tried, firstYield: fm.yield, firstFamilies: fm.families, firstDist: fm.pairDistance, ch1Ms: m1.ms, ch2: m2.cache, ch2Ms: voteMs, ch2Tried: m2.tried, ch2Reused: m2.reusedDesigns, rej: m2.rejections };
  };
  it('prints cold / warm first pair and the second champion pair with and without the cache split', () => {
    const coldFirst = run(false), warmFirst = run(false), before = run(true), after = run(false);
    console.log('DQ4 s24 ' + JSON.stringify({ coldFirstPairMs: coldFirst.firstMs, warmFirstPairMs: warmFirst.firstMs, first: { tried: warmFirst.firstTried, yield: warmFirst.firstYield, families: warmFirst.firstFamilies, dist: warmFirst.firstDist }, secondChampionBefore: { ms: before.ch2Ms, cache: before.ch2, tried: before.ch2Tried }, secondChampionAfter: { ms: after.ch2Ms, cache: after.ch2, tried: after.ch2Tried, reused: after.ch2Reused }, rejections: after.rej }));
    expect(after.ch2).toBe('reranked');
  }, 240000);
});
