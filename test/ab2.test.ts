// AB2: the proposal history (spec 6.3, 5.4, 10, journey G; acceptance 23, 24, 26 data side). Pure: no WebGL.
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { emptyBrief } from '../src/scene/brief';
import { lockRoster } from '../src/scene/locks';
import type { Fish, TankSetup } from '../src/scene/types';
import type { CandidateRecord } from '../src/scene/discoveryTypes';
import { createProposalHistory, HISTORY_CAP, HISTORY_KEY, reEvaluate } from '../src/scene/proposalHistory';
import { verdictOf } from '../src/scene/verdict';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
function tank(fish: Fish[] = fishOf('kuhli', 3)): TankSetup { const t = structuredClone(defaultSetup()); t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fish; return ensureUids(t); }
const rng = (m: number) => ({ lo: m * 0.8, mean: m, hi: m * 1.3 });
function rec(id: string, o: Partial<CandidateRecord> = {}, snap: TankSetup = tank()): CandidateRecord {
  return { id, sessionId: 's1', createdAt: 1000, baseRev: 1, purpose: 'first', snapshot: snap, key: `k-${id}`, assumptions: ['prices estimated'],
    facts: { title: `Tank ${id}`, habitat: 'Freshwater planted', gallons: 20, newSpendUsd: rng(300), weeklyMin: rng(30), difficulty: 'Beginner', toBuy: [{ key: 'filter', label: 'Filter', usd: 40, kind: 'design' }], reused: [], mustUse: [], stocking: [], plants: [], hardscape: [], substrate: [] },
    verdict: { gates: [], hard: [], targets: [], advisories: [], feasible: true }, ...o };
}
function fakeStorage(o: { full?: boolean; blocked?: boolean } = {}): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get length() { return data.size; }, clear: () => data.clear(), key: i => [...data.keys()][i] ?? null,
    getItem: k => { if (o.blocked) throw new Error('blocked'); return data.get(k) ?? null; }, removeItem: k => { data.delete(k); },
    setItem: (k, v) => { if (o.blocked || o.full) throw new Error('quota'); data.set(k, String(v)); } };
}

describe('every shown candidate is kept as structured data (acceptance 23)', () => {
  it('put / get round-trips a record, a loser and a skip included, with its snapshot and facts', () => {
    const h = createProposalHistory('p', fakeStorage());
    for (const id of ['a', 'b', 'loser', 'skipped']) expect(h.put(rec(id)).stored).toBe(true);
    const g = h.get('loser')!;
    expect(g.facts.title).toBe('Tank loser'); expect(g.snapshot.fish.length).toBe(3); expect(g.snapshot.fish[0].uid).toBeTruthy();
    expect(g.verdict.feasible).toBe(true); expect(g.assumptions).toEqual(['prices estimated']);
  });
  it('a reload reads the same records back through parseScene, uids stable', () => {
    const st = fakeStorage(), h = createProposalHistory('p', st), r = rec('a');
    h.put(r); h.favourite('a', true); h.markChampion('a');
    const h2 = createProposalHistory('p', st), g = h2.get('a')!;
    expect(h2.persisted).toBe(true); expect(g.favourite && g.champion).toBe(true);
    expect(g.snapshot.fish.map(f => f.uid)).toEqual(r.snapshot.fish.map(f => f.uid));
    expect(g.snapshot.tank).toEqual(r.snapshot.tank);
    expect(createProposalHistory('other', st).page(undefined, 0, 9).total).toBe(0);
  });
  it('paging is newest first, per session or whole project', () => {
    const h = createProposalHistory('p', fakeStorage());
    for (let i = 0; i < 7; i++) h.put(rec(`r${i}`, { createdAt: 100 + i, sessionId: i % 2 ? 's2' : 's1' }));
    const p = h.page(undefined, 0, 3);
    expect(p.items.map(e => e.id)).toEqual(['r6', 'r5', 'r4']); expect(p.total).toBe(7); expect(p.hasMore).toBe(true);
    expect(h.page(undefined, 6, 3).items.map(e => e.id)).toEqual(['r0']);
    expect(h.page('s2', 0, 9).items.map(e => e.id)).toEqual(['r5', 'r3', 'r1']);
  });
});

describe('dedupe, flags, champion', () => {
  it('the same key in the same session adds nothing and points at the kept one; another session keeps its own', () => {
    const h = createProposalHistory('p', fakeStorage());
    h.put(rec('a', { key: 'K' }));
    expect(h.put(rec('a2', { key: 'K' }))).toMatchObject({ stored: false, id: 'a', duplicateOf: 'a' });
    expect(h.put(rec('a', { key: 'Z' })).stored).toBe(false);
    expect(h.put(rec('c', { key: 'K', sessionId: 's2' })).stored).toBe(true);
    expect(h.byKey('K', 's1')!.id).toBe('a');
  });
  it('one champion per session; flags never change the record', () => {
    const h = createProposalHistory('p', fakeStorage());
    h.put(rec('a')); h.put(rec('b')); h.put(rec('c', { sessionId: 's2' }));
    h.markChampion('a'); h.markChampion('c'); h.markChampion('b');
    expect([h.get('a')!.champion, h.get('b')!.champion, h.get('c')!.champion]).toEqual([false, true, true]);
    const before = JSON.stringify(h.get('a')!.facts); h.favourite('a', true); h.setThumb('a', 'data:image/png;base64,AAAA');
    expect(JSON.stringify(h.get('a')!.facts)).toBe(before); expect(h.get('a')!.thumb).toMatch(/^data:image/);
    expect(h.setThumb('a', 'http://x/y.png')).toBe(false); expect(h.setThumb('a', 'data:image/png;base64,' + 'A'.repeat(20000))).toBe(false);
    expect(h.favourite('nope', true)).toBe(false);
  });
});

describe('the 200-snapshot cap', () => {
  const small = tank([]);
  const fill = (n: number, h = createProposalHistory('p', fakeStorage())) => { for (let i = 0; i < n; i++) h.put(rec(`r${i}`, { createdAt: 1000 + i, key: `k${i}` }, small)); return h; };
  it('the oldest unfavourited go first and their line stays as "no longer stored"', () => {
    const h = fill(HISTORY_CAP + 5);
    expect(h.storedCount()).toBe(HISTORY_CAP);
    const l = h.line('r0')!; expect(l.gone).toBe(true); expect(h.get('r0')).toBeUndefined(); expect(l).toMatchObject({ title: 'Tank r0' });
    expect(h.get('r5')).toBeDefined(); expect(h.page(undefined, 0, 999).total).toBe(HISTORY_CAP + 5);
  });
  it('favourites and champions are never evicted', () => {
    const h = createProposalHistory('p', fakeStorage());
    h.put(rec('keep', { createdAt: 1 }, small)); h.put(rec('champ', { createdAt: 2 }, small)); h.favourite('keep', true); h.markChampion('champ');
    fill(HISTORY_CAP + 10, h);
    expect(h.get('keep')).toBeDefined(); expect(h.get('champ')).toBeDefined(); expect(h.storedCount()).toBe(HISTORY_CAP);
  });
  it('a store full of kept designs still keeps the new one (nothing shown is dropped)', () => {
    const h = createProposalHistory('p', fakeStorage());
    for (let i = 0; i < HISTORY_CAP; i++) { h.put(rec(`f${i}`, { createdAt: i }, small)); h.favourite(`f${i}`, true); }
    expect(h.put(rec('new', { createdAt: 9999 }, small))).toMatchObject({ stored: true, evicted: [] });
    expect(h.get('new')).toBeDefined(); expect(h.get('f0')).toBeDefined();
  });
});

describe('storage absent or failing', () => {
  it('blocked storage: works in memory, persisted false', () => {
    const h = createProposalHistory('p', fakeStorage({ blocked: true }));
    expect(h.put(rec('a')).stored).toBe(true); expect(h.persisted).toBe(false); expect(h.get('a')!.snapshot.fish.length).toBe(3);
  });
  it('no storage object at all, and a full quota', () => {
    const h = createProposalHistory('p', undefined); h.put(rec('a')); expect(h.persisted).toBe(false); expect(h.get('a')).toBeDefined();
    const f = createProposalHistory('p', fakeStorage({ full: true })); f.put(rec('a')); expect(f.persisted).toBe(false); expect(f.get('a')).toBeDefined();
  });
  it('a damaged index starts clean; a damaged snapshot reads as undefined, never throws', () => {
    const st = fakeStorage(); st.setItem(HISTORY_KEY('p'), '{not json'); expect(createProposalHistory('p', st).page(undefined, 0, 5).total).toBe(0);
    const h = createProposalHistory('p', st); h.put(rec('a')); st.setItem('tanklook.history.p.a', 'not json');
    expect(createProposalHistory('p', st).get('a')).toBeUndefined();
  });
});

describe('reEvaluate: then vs now, never overwriting (acceptance 24, 26; journey G)', () => {
  it('journey G: lock a species, re-evaluate an old record without it: the conflict is listed, the record is unchanged', () => {
    const h = createProposalHistory('p', fakeStorage()), old = rec('old', {}, tank(fishOf('ember', 4, 300)));
    h.put(old);
    const project = tank([...fishOf('kuhli', 6, 500), ...fishOf('ember', 4, 300)]); lockRoster(project, 'kuhli', 'exact', 6);
    const before = JSON.stringify(h.get('old')), snapBefore = JSON.stringify(old.snapshot);
    const r = reEvaluate(h.get('old')!, project, emptyBrief());
    expect(r.lockConflicts.some(v => v.kind === 'roster' && v.target === 'kuhli')).toBe(true);
    expect(r.conflicts.length).toBeGreaterThan(0); expect(r.usable).toBe(false);
    expect(JSON.stringify(h.get('old'))).toBe(before); expect(JSON.stringify(old.snapshot)).toBe(snapBefore);
  });
  it('then keeps the old costs verbatim; now is recomputed', () => {
    const r0 = rec('a'), r = reEvaluate(r0, tank(), emptyBrief());
    expect(r.then.facts.newSpendUsd).toEqual(rng(300)); expect(r.then.createdAt).toBe(1000);
    expect(r.now.verdict).toEqual(verdictOf(r0.snapshot, emptyBrief()));
    expect(r.now.toBuy.every(l => typeof l.usd === 'number')).toBe(true);
    expect(r0.facts.newSpendUsd).toEqual(rng(300));
  });
  it('an old baseRev reports stale (item 26); the same rev does not; no rev = not judged', () => {
    const r0 = rec('a', { baseRev: 3 }), p = tank();
    expect(reEvaluate(r0, p, emptyBrief(), { currentRev: 9 }).stale).toBe(true);
    expect(reEvaluate(r0, p, emptyBrief(), { currentRev: 3 }).stale).toBe(false);
    expect(reEvaluate(r0, p, emptyBrief()).stale).toBe(false);
    expect(reEvaluate(r0, p, emptyBrief(), { currentRev: 9 }).usable).toBe(false);
  });
  it('a frozen tab the design would change is a scope conflict', () => {
    const p = tank(fishOf('kuhli', 3)), other = tank(fishOf('ember', 5, 300));
    expect(reEvaluate(rec('a', {}, other), p, emptyBrief(), { scope: ['plants'] }).scopeConflicts).toContain('animals');
    expect(reEvaluate(rec('a', {}, other), p, emptyBrief(), { scope: ['animals'] }).scopeConflicts).not.toContain('animals');
  });
});
