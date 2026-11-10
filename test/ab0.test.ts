import { describe, expect, it } from 'vitest';
import { clearSession, defaultFreezeSource, effectiveScope, freeze, loadSession, pause, rebase, record, resume, saveSession, setCurrent, setFavourite, startSession, unfreeze } from '../src/scene/discoverySession';
import type { DiscoverySession, Outcome } from '../src/scene/discoveryTypes';
import type { PairType } from '../src/scene/discoverySession';

const show = (s: DiscoverySession, a: string, b: string, t: PairType) => setCurrent(s, a, b, t);
const ans = (s: DiscoverySession, o: Outcome) => record(s, o);
const fakeStorage = (): Storage => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage; };

describe('AB0 journey F', () => {
  it('A beats B, C beats A, C beats D; fresh E/F, E wins; E vs C both ways', () => {
    let s = startSession(1);
    let r = ans(show(s, 'A', 'B', 'first'), 'A'); s = r.session;
    expect(s.championId).toBe('A'); expect(r.next).toEqual({ type: 'champion', keep: 'A' });
    r = ans(show(s, 'A', 'C', 'champion'), 'B'); s = r.session;
    expect(s.championId).toBe('C'); expect(r.comparison!.championBefore).toBe('A'); expect(r.comparison!.championAfter).toBe('C');
    r = ans(show(s, 'C', 'D', 'champion'), 'A'); s = r.session;
    expect(s.championId).toBe('C');
    r = ans(show(s, 'E', 'F', 'fresh'), 'A'); s = r.session;
    expect(s.championId).toBe('C'); expect(s.pendingFreshId).toBe('E'); expect(r.next).toEqual({ type: 'final', keep: 'C' });
    // E vs C: E wins -> champion
    const w = ans(show(s, 'E', 'C', 'final'), 'A').session;
    expect(w.championId).toBe('E'); expect(w.pendingFreshId).toBeUndefined();
    // C wins -> stays
    const l = ans(show(s, 'E', 'C', 'final'), 'B').session;
    expect(l.championId).toBe('C'); expect(l.pendingFreshId).toBeUndefined();
    expect(l.comparisons).toHaveLength(5);
  });
  it('a fresh winner never takes the champion by itself, and with no champion yet it becomes it', () => {
    const s0 = ans(show(startSession(1), 'A', 'B', 'first'), 'A').session;
    expect(ans(show(s0, 'E', 'F', 'fresh'), 'B').session.championId).toBe('A');
    const none = ans(show(startSession(1), 'E', 'F', 'fresh'), 'A').session;
    expect(none.championId).toBe('E');
  });
});

describe('AB0 outcomes', () => {
  const withChamp = () => ans(show(startSession(1), 'A', 'B', 'first'), 'A').session;
  it('like both / like neither / skip never change the champion', () => {
    for (const o of ['both', 'neither', 'skip'] as Outcome[]) {
      const r = ans(show(withChamp(), 'A', 'C', 'champion'), o);
      expect(r.session.championId).toBe('A'); expect(r.next.keep).toBe('A');
    }
    expect(ans(show(withChamp(), 'A', 'C', 'champion'), 'neither').next.broaden).toBe(true);
  });
  it('first pair like both does not crown anyone and asks for another first pair', () => {
    const r = ans(show(startSession(1), 'A', 'B', 'first'), 'both');
    expect(r.session.championId).toBeUndefined(); expect(r.next.type).toBe('first');
  });
  it('skip leaves no taste record; both / neither are signals; reasons kept only on A/B', () => {
    const s = show(withChamp(), 'A', 'C', 'champion');
    const sk = record(s, 'skip', ['look']);
    expect(sk.tasteSignal).toEqual({ winner: undefined, loser: undefined, liked: [], disliked: [] });
    expect(sk.comparison!.why).toBeUndefined();
    expect(record(s, 'both').tasteSignal.liked).toEqual(['A', 'C']);
    expect(record(s, 'neither').tasteSignal.disliked).toEqual(['A', 'C']);
    const ab = record(s, 'A', ['plants', 'look'], ['upfront']);
    expect(ab.comparison!.why).toEqual(['plants', 'look']); expect(ab.comparison!.otherGood).toEqual(['upfront']);
    expect(ab.tasteSignal).toEqual({ winner: 'A', loser: 'C', liked: ['A'], disliked: ['C'] });
  });
  it('skip on the final moves on (never repeats the pair); both on the final clears it too; champion unchanged', () => {
    let s = withChamp(); s = ans(show(s, 'E', 'F', 'fresh'), 'A').session;
    const sk = ans(show(s, 'E', 'A', 'final'), 'skip');
    expect(sk.session.pendingFreshId).toBeUndefined(); expect(sk.next.type).not.toBe('final'); expect(sk.session.championId).toBe('A'); expect(sk.tasteSignal.liked).toEqual([]); expect(sk.tasteSignal.disliked).toEqual([]);
    for (const t of ['first', 'champion', 'fresh'] as const) { const r = ans(show(withChamp(), 'X', 'Y', t), 'skip'); expect(r.next.keep === undefined || r.next.type !== 'final').toBe(true); }
    const both = ans(show(s, 'E', 'A', 'final'), 'both');
    expect(both.session.pendingFreshId).toBeUndefined(); expect(both.session.championId).toBe('A');
  });
  it('setFavourite is the explicit override', () => {
    let s = withChamp(); s = ans(show(s, 'E', 'F', 'fresh'), 'A').session;
    const r = setFavourite(s, 'E');
    expect(r.session.championId).toBe('E'); expect(r.session.pendingFreshId).toBeUndefined();
  });
  it('record never mutates its input', () => {
    const s = show(withChamp(), 'A', 'C', 'champion');
    const snap = JSON.stringify(s);
    record(s, 'B', ['look']); setFavourite(s, 'Z'); freeze(s, 'plants'); rebase(s, 9); pause(s);
    expect(JSON.stringify(s)).toBe(snap);
  });
  it('with nothing on screen record is a no-op', () => {
    const s = startSession(1); const r = record(s, 'A');
    expect(r.comparison).toBeUndefined(); expect(r.session.comparisons).toHaveLength(0);
  });
});

describe('AB0 freezes (spec 12: 11 state side, 13, 14, 17)', () => {
  it('unchecking before a champion freezes the working project; after, the champion', () => {
    let s = startSession(3);
    expect(defaultFreezeSource(s)).toBe('working');
    s = freeze(s, 'hardscape');
    expect(s.freezes).toEqual([{ tab: 'hardscape', source: 'working', rev: 3 }]);
    s = ans(show(s, 'A', 'B', 'first'), 'A').session;
    s = freeze(s, 'animals');
    expect(s.freezes.find(f => f.tab === 'animals')!.source).toBe('A');
  });
  it("Keep A's hardscape freezes A even with B on screen and a different champion", () => {
    let s = ans(show(startSession(1), 'C', 'B', 'first'), 'A').session; // champion C
    s = show(s, 'A', 'B', 'champion');
    s = freeze(s, 'hardscape', 'A');
    expect(s.freezes[0]).toEqual({ tab: 'hardscape', source: 'A' });
    expect(s.freezes.some(f => f.source === 'B')).toBe(false);
  });
  it('effective scope is scope minus frozen; unfreeze restores; freezing does not touch scope, champion or comparisons', () => {
    let s = startSession(1, ['animals', 'plants', 'hardscape']);
    s = freeze(s, 'animals');
    expect(effectiveScope(s)).toEqual(['plants', 'hardscape']); expect(s.scope).toEqual(['animals', 'plants', 'hardscape']);
    s = unfreeze(s, 'animals');
    expect(effectiveScope(s)).toEqual(['animals', 'plants', 'hardscape']);
    expect(s.championId).toBeUndefined(); expect(s.comparisons).toHaveLength(0);
  });
  it('refreezing a tab replaces its source', () => {
    let s = freeze(startSession(1), 'plants', 'A'); s = freeze(s, 'plants', 'B');
    expect(s.freezes).toEqual([{ tab: 'plants', source: 'B' }]);
  });
});

describe('AB0 lifecycle and rebase (spec 6.2, 12: 14-17)', () => {
  it('resume on the same rev continues; a changed rev asks first and leaves the session untouched', () => {
    const p = pause(startSession(4));
    expect(p.status).toBe('paused');
    const ok = resume(p, 4); expect(ok.needsRebase).toBe(false); expect(ok.session.status).toBe('active');
    const stale = resume(p, 5); expect(stale.needsRebase).toBe(true); expect(stale.session.baseRev).toBe(4); expect(stale.session.status).toBe('paused');
  });
  it('rebase keeps champion, comparisons and ids; drops working-sourced freezes and the stale pair, keeps candidate freezes', () => {
    let s = ans(show(startSession(1), 'A', 'B', 'first'), 'A').session;
    s = freeze(s, 'hardscape', 'working'); s = freeze(s, 'plants', 'A'); s = show(s, 'A', 'C', 'champion');
    const id = s.id;
    const r = rebase(s, 2);
    expect(r.session.id).toBe(id); expect(r.session.championId).toBe('A'); expect(r.session.comparisons).toHaveLength(1);
    expect(r.session.baseRev).toBe(2); expect(r.session.status).toBe('active');
    expect(r.droppedFreezes.map(f => f.tab)).toEqual(['hardscape']);
    expect(r.session.freezes).toEqual([{ tab: 'plants', source: 'A' }]);
    expect(r.droppedCurrent).toBe(true); expect(r.session.current).toBeUndefined();
    expect(r.message).toContain('hardscape');
  });
});

describe('AB0 persistence (spec 12: 14, 17)', () => {
  it('round-trips per project, survives a reload, and projects are separate', () => {
    const st = fakeStorage();
    const s = ans(show(startSession(1), 'A', 'B', 'first'), 'A').session;
    expect(saveSession('p1', s, st)).toBe(true);
    expect(loadSession('p1', st)).toEqual(s);
    expect(loadSession('p2', st)).toBeUndefined();
    clearSession('p1', st); expect(loadSession('p1', st)).toBeUndefined();
  });
  it('uses its own key, never the scene key', () => {
    const st = fakeStorage(); const keys: string[] = [];
    const spy = { ...st, setItem: (k: string, v: string) => { keys.push(k); st.setItem(k, v); } } as Storage;
    saveSession('p', startSession(1), spy);
    expect(keys).toHaveLength(1); expect(keys[0]).toMatch(/^tanklook\.discovery\./);
  });
  it('falls back to memory when storage throws or is absent; garbage reads as none', () => {
    const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } } as unknown as Storage;
    const s = startSession(7);
    expect(saveSession('mem', s, bad)).toBe(false);
    expect(loadSession('mem', bad)).toEqual(s);
    expect(saveSession('mem2', s, undefined)).toBe(false);
    expect(loadSession('mem2', undefined)).toEqual(s);
    const st = fakeStorage(); st.setItem('tanklook.discovery.g', '{not json');
    expect(loadSession('g', st)).toBeUndefined();
  });
});
