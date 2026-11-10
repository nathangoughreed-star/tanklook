// Discovery v2 cross-lane integration (Coordinator 21): the real AB0 session, AB2 history (in-memory storage) and AB1 pair generator together.
// Main scenario: A champion, B challenger; the user locks 8 pygmy corydoras FROM B (DX0 lockRoster), unchecks Hardscape (AB0 freeze, source A); the next pair keeps exactly 8 cories and A's hardscape.
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { layerOf } from '../src/scene/items';
import { lockRoster } from '../src/scene/locks';
import { verdictOf } from '../src/scene/verdict';
import { emptyBrief } from '../src/ui/setupBrief';
import { setEquipment, setOwnedUse } from '../src/scene/project';
import { withUnits } from '../src/scene/tech';
import { equipPlan } from '../src/scene/equipPlan';
import { mean3 } from '../src/demand/range';
import { clearPairCache, nextPair } from '../src/scene/pairGen';
import { freeze, record, setCurrent, startSession } from '../src/scene/discoverySession';
import { createProposalHistory, reEvaluate, type ProposalHistory } from '../src/scene/proposalHistory';
import { aspectsOf, recordPair } from '../src/explore/aspects';
import type { CandidateRecord, DiscoverySession } from '../src/scene/discoveryTypes';
import type { Fish, TankSetup } from '../src/scene/types';

const ALL = ['tank', 'animals', 'plants', 'hardscape', 'substrate'] as const;
const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 200 + i * 25, y: 100, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' };
  regenerate(t, 'all', 1);
  t.fish = fishOf('ember', 6, 201);
  return ensureUids(t);
}
const B0 = emptyBrief();
const memStorage = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, get length() { return m.size; }, dump: () => JSON.stringify([...m].sort()) } as unknown as Storage & { dump(): string }; };
const hardOf = (t: TankSetup) => t.items.filter(i => layerOf(i) !== 'plant').map(i => `${i.uid}@${Math.round(i.x)},${Math.round(i.depth)}`).sort();
const cories = (r: CandidateRecord) => r.snapshot.fish.filter(f => f.species === 'pygmycory').length;

let st: ReturnType<typeof memStorage>, H: ProposalHistory;
const look = (id: string) => H.get(id);
beforeEach(() => { clearPairCache(); st = memStorage(); H = createProposalHistory('proj', st); });

/** A (a design that keeps this tank: plants and hardscape contrast) and B (the same family with 8 pygmy cories as its animals), both stored. */
function setup(t: TankSetup, brief = B0, scope: ('tank' | 'animals' | 'plants' | 'hardscape' | 'substrate')[] = ['plants', 'hardscape']) {
  const s0 = startSession(1, scope, 'unsure', 's1');
  const r = nextPair({ tank: t, rev: 1 }, brief, s0, look); if (!r.ok) throw new Error('no first pair');
  const A = r.a, B: CandidateRecord = { ...structuredClone(r.b), id: 'B-cories', key: 'B-cories-key', snapshot: { ...structuredClone(r.b.snapshot), fish: fishOf('pygmycory', 8, 500) } };
  ensureUids(B.snapshot); H.put(A); H.put(B);
  let s: DiscoverySession = setCurrent(startSession(1, [...ALL], 'unsure', 's1'), A.id, B.id, 'first');
  s = record(s, 'A').session;                       // A becomes the champion
  return { A, B, s };
}
const snapAll = () => JSON.stringify(H.page(undefined, 0, 500).items.map(l => l.gone ? l : H.get(l.id)));

describe('main scenario: lock 8 pygmy cories from B, keep A\'s hardscape', () => {
  it('every candidate has exactly 8 pygmy cories and A\'s hardscape, passes the gates, and history is untouched', () => {
    const t = project(), { A, B, s } = setup(t), hist0 = snapAll(), dump0 = st.dump();
    expect(s.championId).toBe(A.id);
    const t2 = structuredClone(t); lockRoster(t2, 'pygmycory', 'exact', 8);      // explicit user action (DX0), never written by the generator
    const s2 = freeze(s, 'hardscape');                                           // "uncheck Hardscape": source = the champion A
    expect(s2.freezes).toEqual([{ tab: 'hardscape', source: A.id }]);
    const locksBefore = JSON.stringify(t2.locks), notes: string[] = [], t0 = performance.now();
    const r = nextPair({ tank: t2, rev: 2 }, B0, s2, look, { next: 'champion', notes });
    const ms = performance.now() - t0; console.log(`AB integration next pair: ${Math.round(ms)} ms`);
    expect(r.ok).toBe(true); if (!r.ok) return;
    for (const c of [r.a, r.b]) {
      expect(cories(c)).toBe(8); expect(c.snapshot.fish.length).toBeGreaterThanOrEqual(8);
      expect(hardOf(c.snapshot)).toEqual(hardOf(A.snapshot));
      const v = verdictOf(c.snapshot, B0); expect(v.gates).toEqual([]); expect(v.feasible).toBe(true);
    }
    expect(r.a.parentId).toBe(A.id);                                              // the champion appears as a NEW adapted record of A (A itself is never edited)
    expect(r.a.purpose).toBe('adapted');
    expect(notes.some(n => /pygmycory/.test(n))).toBe(true);                      // the kept species was added, and said so
    expect(JSON.stringify(t2.locks)).toBe(locksBefore);                           // no lock written
    expect(snapAll()).toBe(hist0); expect(st.dump()).toBe(dump0); void B;
  }, 120000);

  it('a lock on a species the baseline lacks still works with the Animals tab unchecked (the lock adds it; the rest stay)', () => {
    const t = project(), { s } = setup(t), t2 = structuredClone(t); lockRoster(t2, 'pygmycory', 'exact', 8);
    const s2 = freeze(s, 'animals', 'working');
    const r = nextPair({ tank: t2, rev: 2 }, B0, s2, look, { next: 'champion' });
    if (r.ok) for (const c of [r.a, r.b]) { expect(cories(c)).toBe(8); expect(verdictOf(c.snapshot, B0).feasible).toBe(true); }
    else { expect(r.conflicts.length).toBeGreaterThan(0); expect(r.relaxations.length).toBeGreaterThan(0); }
  }, 120000);

  it('a species that cannot live with the locked rest gives a specific no-solution, never an invalid pair', () => {
    const t = project(); t.water.salt = true;                                    // saltwater tank, locked: cories cannot live there
    const { s } = setup(project()), t2 = structuredClone(t); lockRoster(t2, 'pygmycory', 'exact', 8); t2.locks!.objects.push({ target: 'tank' });
    const r = nextPair({ tank: t2, rev: 2 }, B0, freeze(s, 'hardscape'), look, { next: 'champion', budgetMs: 800 });
    if (r.ok) for (const c of [r.a, r.b]) expect(verdictOf(c.snapshot, B0).feasible).toBe(true);
    else { expect(r.conflicts.length).toBeGreaterThan(0); expect(r.relaxations.length).toBeGreaterThan(0); }
  }, 120000);
});

describe('(a) a champion that cannot take the new lock', () => {
  it('is reported by reEvaluate, replaced by valid challengers (or ok:false), never shown as valid, lock never dropped', () => {
    const t = project(), { A, s } = setup(t);
    const terr: CandidateRecord = { ...structuredClone(A), id: 'A-terrarium', key: 'A-terr-key', snapshot: { ...structuredClone(A.snapshot), water: { ...A.snapshot.water, on: false } } };
    H.put(terr); const s1 = { ...s, championId: terr.id }, hist0 = snapAll();
    const t2 = structuredClone(t); lockRoster(t2, 'pygmycory', 'exact', 8);
    const re = reEvaluate(H.get(terr.id)!, t2, B0, { currentRev: 2 });
    expect(re.usable).toBe(false); expect(re.conflicts.length).toBeGreaterThan(0);
    const locks = JSON.stringify(t2.locks), notes: string[] = [];
    const r = nextPair({ tank: t2, rev: 2 }, B0, s1, look, { next: 'champion', notes });
    expect(JSON.stringify(t2.locks)).toBe(locks);
    if (r.ok) { for (const c of [r.a, r.b]) { expect(c.id).not.toBe(terr.id); expect(cories(c)).toBe(8); expect(verdictOf(c.snapshot, B0).feasible).toBe(true); } expect(notes.some(n => /favourite/.test(n))).toBe(true); }
    else expect(r.conflicts.length).toBeGreaterThan(0);
    expect(snapAll()).toBe(hist0);
  }, 120000);
});

describe('(b) equipment stays derived', () => {
  const own = (t: TankSetup, w: number, light = false): TankSetup => { const x = { ...t, tech: withUnits(t.tech ?? ({ rows: {} } as never), 'heater', [{ w, owned: true }]) }; if (light) x.light = { ...x.light, owned: true } as never; return x; };
  it('a capable owned heater is $0 and named; Must-use light is in every candidate; new spend is the remaining cost, not retail', () => {
    const t = own(project(), 400, true); t.items = t.items.filter(i => layerOf(i) !== 'plant');
    let b = setEquipment(B0, 'heater', { pick: 'care' }); b = setOwnedUse(setEquipment(b, 'light', { pick: 'care' }), 'light', 'required');
    const { s } = setup(t, b, ['hardscape', 'animals']), r = nextPair({ tank: t, rev: 1 }, b, s, look, { next: 'champion' });
    if (!r.ok) throw new Error('no pair');
    for (const c of [r.a, r.b]) {
      expect(c.facts.mustUse).toContain('light'); expect(c.snapshot.light.owned).toBe(true);
      expect(c.facts.toBuy.some(l => l.key === 'heater')).toBe(false); expect(c.facts.reused).toContain('heater');
      const plan = equipPlan(c.snapshot, b); expect(Math.abs(c.facts.newSpendUsd.mean - Math.round(mean3(plan.remaining)))).toBeLessThanOrEqual(1);
    }
  }, 120000);
  it('an owned heater too small to work is flagged, not credited, and a purchase is added', () => {
    const t = own(project(), 5), b = setEquipment(B0, 'heater', { pick: 'care' });
    const { s } = setup(t, b), r = nextPair({ tank: t, rev: 1 }, b, s, look, { next: 'champion' });
    if (!r.ok) throw new Error('no pair');
    for (const c of [r.a, r.b]) { expect(c.facts.reused).not.toContain('heater'); expect(c.facts.toBuy.some(l => l.key === 'heater')).toBe(true); }
  }, 120000);
});

describe('(c) Skip and Like both', () => {
  it('Skip records no taste signal and never repeats the pair', () => {
    const t = project(), s0 = startSession(1, [...ALL], 'unsure', 's1'), r = nextPair({ tank: t, rev: 1 }, B0, s0, look); if (!r.ok) throw new Error('no pair');
    H.put(r.a); H.put(r.b);
    const out = record(setCurrent(s0, r.a.id, r.b.id, 'first'), 'skip');
    expect(out.tasteSignal).toEqual({ winner: undefined, loser: undefined, liked: [], disliked: [] });
    expect(recordPair(B0, { outcome: 'skip', a: { id: r.a.id, features: ['world:fresh'] }, b: { id: r.b.id, features: ['world:fresh'] } })).toBe(B0);
    const n = nextPair({ tank: t, rev: 1 }, B0, out.session, look, { shownKeys: [r.a.key!, r.b.key!] });
    if (n.ok) for (const c of [n.a, n.b]) expect([r.a.key, r.b.key]).not.toContain(c.key);
  }, 120000);
  it('Like both records positives for both, even with no champion', () => {
    const t = project(), s0 = startSession(1, [...ALL], 'unsure', 's1'), r = nextPair({ tank: t, rev: 1 }, B0, s0, look); if (!r.ok) throw new Error('no pair');
    const out = record(setCurrent(s0, r.a.id, r.b.id, 'first'), 'both');
    expect(out.tasteSignal.liked.sort()).toEqual([r.a.id, r.b.id].sort()); expect(out.session.championId).toBeUndefined();
    const b2 = recordPair(B0, { outcome: 'both', a: { id: r.a.id, features: ['plants:lush', 'species:ember'] }, b: { id: r.b.id, features: ['plants:none', 'species:cherry'] } });
    const ev = aspectsOf(b2)!.events; expect(ev.map(e => e.c).sort()).toEqual([r.a.id, r.b.id].sort()); expect(ev.every(e => e.k === 'like' && (e.pos?.length ?? 0) > 0)).toBe(true);
  }, 120000);
});
