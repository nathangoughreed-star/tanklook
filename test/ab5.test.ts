// Lane AB5: Combine (milestone 1), adaptive breadth (2), loop metrics (3).
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { emptyBrief } from '../src/ui/setupBrief';
import { clearPairCache, combine, nextPair } from '../src/scene/pairGen';
import { startSession } from '../src/scene/discoverySession';
import { verdictOf } from '../src/scene/verdict';
import { layerOf } from '../src/scene/items';
import { lockObject } from '../src/scene/locks';
import { setEquipment, setOwnedUse } from '../src/scene/project';
import { withUnits } from '../src/scene/tech';
import type { Fish, TankSetup } from '../src/scene/types';
import type { CandidateRecord } from '../src/scene/discoveryTypes';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + (i % 8) * 60, y: 100, depth: 60 + (i % 5) * 60, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fishOf('ember', 6, 201);
  return ensureUids(t);
}
const B0 = emptyBrief();
const plantsOf = (t: TankSetup) => t.items.filter(i => layerOf(i) === 'plant').map(i => i.uid!).sort();
const hardOf = (t: TankSetup) => t.items.filter(i => layerOf(i) !== 'plant').map(i => i.uid!).sort();
let A: CandidateRecord, B: CandidateRecord, T: TankSetup;
beforeEach(() => {
  clearPairCache(); T = project();
  const r = nextPair({ tank: T, rev: 1 }, B0, startSession(1, ['plants', 'hardscape', 'animals'], 'unsure', 's1'), () => undefined); if (!r.ok) throw new Error('no pair');
  A = r.a; B = { ...structuredClone(r.b), id: 'B', key: 'Bk' };
});
const P = () => ({ tank: T, rev: 1 });

describe('Combine', () => {
  it("A's hardscape plus B's plants is a NEW valid record; A and B stay byte-identical", () => {
    const a0 = JSON.stringify(A), b0 = JSON.stringify(B);
    const o = combine(A, B, 'plants', P(), B0); expect(o.ok).toBe(true); if (!o.ok) return;
    const c = o.record;
    expect(c.id).not.toBe(A.id); expect(c.id).not.toBe(B.id); expect(c.purpose).toBe('adapted'); expect(c.parentId).toBe(A.id);
    expect(hardOf(c.snapshot)).toEqual(hardOf(A.snapshot)); expect(plantsOf(c.snapshot).length).toBeGreaterThan(0);
    expect(c.assumptions.some(x => /^Combined:/.test(x))).toBe(true);
    const v = verdictOf(c.snapshot, B0); expect(v.feasible).toBe(true); expect(v.gates).toEqual([]);
    expect(JSON.stringify(A)).toBe(a0); expect(JSON.stringify(B)).toBe(b0);
  }, 120000);
  it('the other way: B with A\'s hardscape', () => {
    const o = combine(B, A, 'hardscape', P(), B0); expect(o.ok).toBe(true); if (!o.ok) return;
    expect(hardOf(o.record.snapshot)).toEqual(hardOf(A.snapshot)); expect(o.record.parentId).toBe('B');
  }, 120000);
  it('high-light plants moved into a low-light design get a stronger light, and the gear says so', () => {
    const low = structuredClone(A); low.snapshot.light = { ...low.snapshot.light, type: 'led', tech: 'led-white', count: 1, watts: 8 } as never;
    const hi = structuredClone(B); hi.snapshot.items = hi.snapshot.items.filter(i => layerOf(i) !== 'plant' || ['carpet', 'stemred', 'rotala'].includes(i.variant));
    const o = combine(low, hi, 'plants', P(), B0); expect(o.ok).toBe(true); if (!o.ok) return;
    expect(o.record.snapshot.light.watts).toBeGreaterThan(8); expect(o.notes.some(n => /stronger light/.test(n))).toBe(true);
    const buy = o.record.facts.toBuy.find(l => /^Light/.test(l.label)); expect(buy).toBeTruthy(); expect(buy!.label).not.toMatch(/\(8 W\)/);
  }, 120000);
  it("B's big animals in a small A are trimmed or refused with a reason, never an invalid design", () => {
    const big = structuredClone(B); big.snapshot.fish = fishOf('oscar', 5, 300);
    const o = combine(A, big, 'animals', P(), B0);
    if (o.ok) { expect(verdictOf(o.record.snapshot, B0).feasible).toBe(true); expect(o.notes.length).toBeGreaterThan(0); expect(o.record.snapshot.fish.length).toBeLessThan(5); }
    else { expect(o.conflicts.length).toBeGreaterThan(0); expect(o.conflicts.join(' ')).toMatch(/animals|oscar|room|too many/i); }
  }, 120000);
  it("B's crowd of small fish in A is trimmed to what fits, and says so", () => {
    const crowd = structuredClone(B); crowd.snapshot.fish = fishOf('ember', 400, 300);
    const o = combine(A, crowd, 'animals', P(), B0);
    expect(o.ok).toBe(true); if (!o.ok) return;
    expect(o.record.snapshot.fish.length).toBeLessThan(400); expect(o.notes.join(' ')).toMatch(/fewer animals/); expect(verdictOf(o.record.snapshot, B0).feasible).toBe(true);
    expect(crowd.snapshot.fish.length).toBe(400);
  }, 120000);
  it('a locked tank cannot be combined, a switched-off tab is refused, and no lock is written', () => {
    const t2 = structuredClone(T); lockObject(t2, 'tank'); const before = JSON.stringify(t2.locks);
    const small = structuredClone(B); small.snapshot.tank = { ...small.snapshot.tank, L: 24 * IN };
    const o = combine(A, small, 'tank', { tank: t2, rev: 1 }, B0); expect(o.ok).toBe(false);
    const t3 = structuredClone(T); t3.discoverOn = ['animals', 'hardscape'];
    const off = combine(A, B, 'plants', { tank: t3, rev: 1 }, B0); expect(off.ok).toBe(false); if (!off.ok) expect(off.conflicts[0]).toMatch(/switched off/);
    expect(JSON.stringify(t2.locks)).toBe(before);
  }, 120000);
  it('a locked plant stays when plants are combined in', () => {
    const t2 = structuredClone(T), keep = A.snapshot.items.find(i => layerOf(i) === 'plant')!.uid!; lockObject(t2, keep);
    const o = combine(A, B, 'plants', { tank: t2, rev: 1 }, B0);
    if (o.ok) expect(plantsOf(o.record.snapshot)).toContain(keep); else expect(o.conflicts.length).toBeGreaterThan(0);
  }, 120000);
  it('the gear is re-derived: an owned heater that is too small is not credited in the combined design', () => {
    const t2 = { ...structuredClone(T), tech: withUnits(T.tech ?? ({ rows: {} } as never), 'heater', [{ w: 5, owned: true }]) } as TankSetup, b = setOwnedUse(setEquipment(B0, 'heater', { pick: 'care' }), 'heater', 'optional' as never);
    const o = combine(A, B, 'plants', { tank: t2, rev: 1 }, b); expect(o.ok).toBe(true); if (!o.ok) return;
    expect(o.record.facts.reused).not.toContain('heater'); expect(o.record.facts.toBuy.some(l => l.key === 'heater')).toBe(true);
  }, 120000);
  it('combining the same design or an identical tab says nothing would change', () => {
    expect(combine(A, A, 'plants', P(), B0).ok).toBe(false);
    const same = structuredClone(B); same.snapshot.fish = structuredClone(A.snapshot.fish);
    const o = combine(A, same, 'animals', P(), B0); expect(o.ok).toBe(false); if (!o.ok) expect(o.conflicts[0]).toMatch(/nothing would change|same/);
  }, 120000);
});

// ---------------------------------------------------------------------------------------------------------------- Milestone 2: adaptive breadth
import { breadthOf, confidenceOf, suggestNarrowing, targetDistance, visuallyDistinct, worldKey, balanceOf } from '../src/scene/breadth';
import { record, setCurrent, freeze } from '../src/scene/discoverySession';
import { lockRoster } from '../src/scene/locks';
import type { DiscoverySession } from '../src/scene/discoveryTypes';

const withWorld = (r: CandidateRecord, id: string, salt: boolean): CandidateRecord => { const c = structuredClone(r); c.id = id; c.key = id; c.snapshot.water.salt = salt; c.snapshot.layout.id = (salt ? 'iwagumi' : 'nature') as never; return c; };
type Play = { o: 'A' | 'B' | 'neither' | 'skip' | 'both'; aSalt: boolean; bSalt: boolean };
/** a session in which the person answered `outcomes` on pairs whose A and B have the given worlds */
function played(outcomes: Play[]): { s: DiscoverySession; look: (id: string) => CandidateRecord | undefined } {
  const recs = new Map<string, CandidateRecord>(); let s = startSession(1, ['tank', 'animals', 'plants', 'hardscape', 'substrate'], 'unsure', 'sx');
  outcomes.forEach((x, i) => { const a = withWorld(A, `a${i}`, x.aSalt), b = withWorld(A, `b${i}`, x.bSalt); recs.set(a.id, a); recs.set(b.id, b); s = record(setCurrent(s, a.id, b.id, i ? 'champion' : 'first'), x.o).session; });
  return { s, look: id => recs.get(id) };
}
const FRESH_WINS: Play = { o: 'A', aSalt: false, bSalt: true };
const ALL5 = ['tank', 'animals', 'plants', 'hardscape', 'substrate'] as const;
describe('adaptive breadth', () => {
  it('no evidence and nothing fixed is as broad as it gets; there is no round count', () => {
    const { s, look } = played([]); const b = breadthOf(T, s, look, ALL5); expect(b.breadth).toBe(1); expect(b.objective).toBe('explore');
    const many = played(Array.from({ length: 30 }, (_, i): Play => ({ o: i % 2 ? 'A' : 'B', aSalt: false, bSalt: true })));
    expect(breadthOf(T, many.s, many.look, ALL5).confidence).toBeLessThan(0.5);            // thirty contradictory rounds do not narrow by themselves
  });
  it('a consistent run (always the freshwater side) narrows within that world; the same count of contradictory rounds stays broad', () => {
    const win = played(Array.from({ length: 5 }, () => FRESH_WINS)), mix = played(Array.from({ length: 5 }, (_, i): Play => ({ o: 'A', aSalt: i % 2 === 0, bSalt: i % 2 !== 0 })));
    const bw = breadthOf(T, win.s, win.look, ALL5), bm = breadthOf(T, mix.s, mix.look, ALL5);
    expect(bw.confidence).toBeGreaterThan(0.6); expect(bw.leaning).toEqual({ world: 'fresh', picks: 5 }); expect(bw.breadth).toBeLessThan(bm.breadth); expect(targetDistance(bw)).toBeLessThan(targetDistance(bm));
    expect(bm.confidence).toBeLessThan(0.3);
  });
  it('neither and skipped rounds dilute confidence', () => {
    const clean = played(Array.from({ length: 4 }, () => FRESH_WINS)), noisy = played([...Array.from({ length: 4 }, () => FRESH_WINS), { ...FRESH_WINS, o: 'neither' }, { ...FRESH_WINS, o: 'skip' }]);
    expect(confidenceOf(noisy.s, noisy.look).confidence).toBeLessThan(confidenceOf(clean.s, clean.look).confidence);
  });
  it('explicit structure narrows first (switches, holds, locks), with no choices at all', () => {
    const { s, look } = played([]), t2 = structuredClone(T); lockRoster(t2, 'ember', 'exact', 6);
    const open = breadthOf(T, s, look, ALL5), fewer = breadthOf(t2, freeze(s, 'hardscape', 'working'), look, ['plants']);
    expect(fewer.structure).toBeGreaterThan(open.structure); expect(fewer.breadth).toBeLessThan(open.breadth); expect(fewer.objective).toBe('refine');
  });
  it('Explore Something Different is always broad, whatever was learned', () => {
    const win = played(Array.from({ length: 6 }, () => FRESH_WINS));
    expect(breadthOf(T, win.s, win.look, ALL5, 'champion').breadth).toBeLessThan(0.8); expect(breadthOf(T, win.s, win.look, ALL5, 'fresh').breadth).toBe(1);
  });
  it('the narrowing line is only a suggestion: it names what to switch, and never appears when the Tank is locked or already off', () => {
    const win = played(Array.from({ length: 4 }, () => FRESH_WINS));
    const g = suggestNarrowing(T, win.s, win.look, ALL5); expect(g?.tab).toBe('tank'); expect(g?.text).toMatch(/picked freshwater 4 times\. Switch Tank off/);
    expect(suggestNarrowing(T, win.s, win.look, ['animals', 'plants'])).toBeUndefined();
    const locked = structuredClone(T); lockObject(locked, 'tank'); expect(suggestNarrowing(locked, win.s, win.look, ALL5)).toBeUndefined();
    expect(T.discoverOn).toBeUndefined();                                                  // nothing was switched
  });
  it('learned preference never blocks a candidate and the switches always win', () => {
    const t3 = structuredClone(T); t3.discoverOn = ['plants', 'hardscape'];
    const win = played(Array.from({ length: 6 }, () => FRESH_WINS)), notes: string[] = []; let seen: ReturnType<typeof breadthOf> | undefined;
    const r = nextPair({ tank: t3, rev: 1 }, B0, { ...win.s, scope: ['plants', 'hardscape'], current: undefined }, win.look, { next: 'first', notes, breadth: x => (seen = x) });
    expect(seen!.confidence).toBeGreaterThan(0.6); expect(seen!.breadth).toBeLessThan(1);
    expect(r.ok).toBe(true); if (!r.ok) return;
    for (const c of [r.a, r.b]) { expect(c.snapshot.tank).toEqual(t3.tank); expect(c.snapshot.water.salt).toBe(t3.water.salt); expect(c.snapshot.fish.length).toBe(t3.fish.length); expect(verdictOf(c.snapshot, B0).feasible).toBe(true); }
  }, 120000);
  it('exploration pairs look different at a glance: world, look family or hardscape-to-plant balance', () => {
    const a = structuredClone(T), b = structuredClone(T); expect(visuallyDistinct(a, b)).toBe(false);
    b.layout.id = 'iwagumi' as never; expect(visuallyDistinct(a, b)).toBe(true);
    const c = structuredClone(T); c.items = c.items.filter(i => layerOf(i) !== 'plant'); expect(Math.abs(balanceOf(c) - balanceOf(T))).toBeGreaterThanOrEqual(0.25); expect(visuallyDistinct(T, c)).toBe(true);
    expect(worldKey(T)).toBe('fresh');
  });
  it('a first pair with the Tank open is visually distinct', () => {
    const r = nextPair({ tank: T, rev: 1 }, B0, startSession(1, [...ALL5], 'unsure', 'sd'), () => undefined, { next: 'first' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(visuallyDistinct(r.a.snapshot, r.b.snapshot)).toBe(true);
  }, 120000);
  it('when most of the design is fixed the challenger is a controlled contrast (purpose contrast) that varies only the open tab', () => {
    const t4 = structuredClone(T); t4.discoverOn = ['plants'];
    const s0 = { ...startSession(1, ['plants'], 'unsure', 'sr'), championId: A.id }; let seen: ReturnType<typeof breadthOf> | undefined;
    const r = nextPair({ tank: t4, rev: 1 }, B0, s0, id => id === A.id ? A : undefined, { next: 'champion', breadth: x => (seen = x) });
    expect(seen!.objective).toBe('refine'); expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.b.purpose).toBe('contrast'); expect(hardOf(r.b.snapshot)).toEqual(hardOf(t4)); expect(r.b.snapshot.fish.length).toBe(t4.fish.length);
  }, 120000);
});

// ---------------------------------------------------------------------------------------------------------------- Milestone 3: loop metrics
import { createMetrics, summarize, statsHtml, METRICS_CAP, type MetricEvent } from '../src/ui/ab/metrics';
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };
describe('loop metrics (local only)', () => {
  const cmp = (type: string, outcome: MetricEvent extends never ? never : 'A' | 'B' | 'both' | 'neither' | 'skip', ms: number, why?: never[]): MetricEvent => ({ k: 'compare', t: 1, type, outcome, ms, ...(why ? { why } : {}), n: 1 });
  it('counts comparisons by type and outcome, reasons, combines, keeps, freezes, history, Make It Yours and abandons', () => {
    const ev: MetricEvent[] = [
      cmp('first', 'A', 4000), { ...cmp('champion', 'B', 2000), why: ['plants', 'look'] } as MetricEvent, cmp('champion', 'skip', 1000), cmp('fresh', 'neither', 3000),
      { k: 'combine', t: 1, tab: 'plants', ok: true, n: 2 }, { k: 'combine', t: 1, tab: 'animals', ok: false, n: 3 },
      { k: 'keep', t: 1, target: 'fish', locked: true, n: 3 }, { k: 'freeze', t: 1, tab: 'hardscape', n: 3 },
      { k: 'history', t: 1, op: 'open' }, { k: 'history', t: 1, op: 'bringBack' }, { k: 'history', t: 1, op: 'setFavourite' },
      { k: 'miy', t: 1, rounds: 4 }, { k: 'close', t: 1, adopted: true, rounds: 4 }, { k: 'close', t: 1, adopted: false, rounds: 2 },
    ];
    const s = summarize(ev);
    expect(s.comparisons).toBe(4); expect(s.byType).toEqual({ first: 1, champion: 2, fresh: 1 }); expect(s.byOutcome).toEqual({ A: 1, B: 1, skip: 1, neither: 1 }); expect(s.byTypeOutcome['champion|B']).toBe(1);
    expect(s.reasons).toEqual({ plants: 1, look: 1 }); expect(s.combines).toEqual({ total: 2, ok: 1, refused: 1, byTab: { plants: 1, animals: 1 } });
    expect(s.locks).toBe(1); expect(s.freezes).toBe(1); expect(s.history).toEqual({ open: 1, bringBack: 1, setFavourite: 1, import: 0 });
    expect(s.makeItYours).toBe(1); expect(s.roundsToMakeItYours).toEqual([4]); expect(s.abandons).toEqual({ count: 1, atRound: [2] });
    expect(s.medianMs).toBe(2500); expect(s.combineRate).toBeCloseTo(0.25); expect(s.lockRate).toBeCloseTo(0.25); expect(s.abandonRate).toBeCloseTo(0.5);
    expect(statsHtml(s)).toMatch(/Discovery stats[\s\S]*Comparisons<\/b> 4/);
  });
  it('is stored in localStorage, capped, survives a reload, and a broken storage never throws', () => {
    const st = mem(), m = createMetrics(st, 'k');
    for (let i = 0; i < METRICS_CAP + 25; i++) m.log({ k: 'history', t: i, op: 'open' });
    expect(m.all().length).toBe(METRICS_CAP); expect((m.all()[0] as { t: number }).t).toBe(25);
    expect(createMetrics(st, 'k').all().length).toBe(METRICS_CAP);
    m.clear(); expect(createMetrics(st, 'k').all()).toEqual([]);
    const bad = createMetrics({ getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } }, 'k');
    expect(() => { bad.log({ k: 'freeze', t: 1, tab: 'plants', n: 1 }); bad.clear(); }).not.toThrow();
    expect(createMetrics(undefined).all()).toEqual([]);
  });
  it('measures the time per comparison from when the pair was shown, and sends nothing anywhere', () => {
    const m = createMetrics(mem(), 'k'); expect(m.elapsed(5000)).toBe(0); m.shown(1000); expect(m.elapsed(3500)).toBe(2500);
    const real = globalThis.fetch; let calls = 0; globalThis.fetch = (() => { calls++; return Promise.reject(new Error('no network')); }) as never;
    m.log({ k: 'open', t: 1, resumed: false }); summarize(m.all()); expect(calls).toBe(0); globalThis.fetch = real;
  });
});

// ---------------------------------------------------------------------------------------------------------------- the main-view dock: render-only preview, frozen working design, three states
import { defaultScene } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { createRealEngine } from '../src/ui/ab/real';
import { adjustmentsOf } from '../src/scene/combine';
import { locksOf } from '../src/scene/locks';

const mkStore = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); return s; };
const designOf = (s: Store) => Store.designKey(s.scene);
describe('Discovery in the main view: the working design is never written', () => {
  it('a frozen store refuses design edits (and says so), allows locks, switches and the camera, and leaves no undo step', () => {
    const s = mkStore(), before = designOf(s); let blocked = 0; s.frozen = true; s.onBlocked = () => blocked++;
    s.update(t => { t.tanks[t.active].fish.pop(); });
    s.edit(t => { t.tank = { ...t.tank, L: t.tank.L + 50 }; });
    expect(blocked).toBe(2); expect(designOf(s)).toBe(before);
    s.update(t => { lockObject(t.tanks[t.active], 'tank'); });                                  // a Discovery requirement: allowed
    s.update(t => { t.tanks[t.active].discoverOn = ['plants']; });
    s.cam(c => { c.az = 12; });
    expect(blocked).toBe(2); expect(locksOf(s.tank).objects.length).toBe(1); expect(s.tank.discoverOn).toEqual(['plants']); expect(designOf(s)).toBe(before);
    s.undo(); expect(blocked).toBe(3); expect(locksOf(s.tank).objects.length).toBe(1);          // no undo entry was made for the lock, so nothing steps back (and undo is refused while frozen)
    s.frozen = false; s.update(t => { t.tanks[t.active].fish.pop(); }); expect(designOf(s)).not.toBe(before);   // Make It Yours / Close: editing is back
  });
  it('showing 5 pairs through the real engine, then closing, leaves the tank design byte-identical; a lock made meanwhile survives and the design does NOT gain it', () => {
    const s = mkStore(), e = createRealEngine(s, () => ({}), 'ab5-main-' + Math.random()), before = designOf(s), rev0 = s.rev, fish0 = s.tank.fish.length;
    s.frozen = true; e.open(['plants', 'hardscape', 'animals']);
    let r = e.next(); expect(r.ok).toBe(true);
    for (let i = 0; i < 5 && r.ok; i++) { r = e.choose(i % 2 ? 'A' : 'B'); expect(designOf(s)).toBe(before); }
    const lockedAt = s.rev; s.update(t => { lockRoster(t.tanks[t.active], 'pygmycory', 'exact', 8); });
    e.pause(); s.frozen = false;
    expect(designOf(s)).toBe(before); expect(s.rev).toBeGreaterThanOrEqual(rev0); expect(s.tank.fish.length).toBe(fish0);
    expect(locksOf(s.tank).roster).toEqual([{ species: 'pygmycory', mode: 'exact', n: 8 }]); expect(s.tank.fish.some(f => f.species === 'pygmycory')).toBe(false); void lockedAt;
  }, 240000);
  it('Combine is a proposal: it lists every dependent change and stores nothing until accepted; accepting makes combined vs favourite', () => {
    const s = mkStore(), e = createRealEngine(s, () => ({}), 'ab5-prop-' + Math.random()); s.frozen = true; e.open(['plants', 'hardscape', 'animals']);
    const r = e.next(); if (!r.ok) throw new Error('no pair'); e.choose('A');
    const n0 = e.history(0).total, o = e.combine!(r.a.id, r.b.id, 'plants');
    expect(o.ok).toBe(true); if (!o.ok) return;
    expect(e.history(0).total).toBe(n0); expect(e.record(o.proposal.record.id)).toBeUndefined();                // nothing stored or shown yet
    expect(Array.isArray(o.proposal.adjustments)).toBe(true);
    const next = e.acceptCombine!(o.proposal); expect(next.ok).toBe(true); if (!next.ok) return;
    expect(next.b.id).toBe(o.proposal.record.id); expect(next.b.parentId).toBe(r.a.id); expect(e.session().current?.type).toBe('champion');
    e.pause(); s.frozen = false;
  }, 240000);
  it('the adjustments name fewer animals, a stronger light and each purchase the combined design adds', () => {
    const A0 = project(), B0x = structuredClone(A0); B0x.fish = B0x.fish.slice(0, 3); B0x.light = { ...B0x.light, type: 'led', tech: 'led-white', count: 1, watts: 20 } as never;
    const mk2 = (S: TankSetup, buy: { label: string; usd: number }[]) => ({ snapshot: S, facts: { toBuy: buy, newSpendUsd: { mean: 1 } } });
    const adj = adjustmentsOf(mk2(A0, [{ label: 'Filter', usd: 50 }]), mk2(B0x, [{ label: 'Filter', usd: 50 }, { label: 'Light (20 W)', usd: 85 }]), 'plants', sp => sp === 'ember' ? 'ember tetras' : sp);
    expect(adj).toEqual(expect.arrayContaining(['3 ember tetras fewer', '+ Light (20 W) ($85)'])); expect(adj.join(' ')).toMatch(/stronger light/);
  });
  it('a locked animal count is never trimmed by a combination', () => {
    const t2 = structuredClone(T); lockRoster(t2, 'ember', 'exact', 6);
    const crowd = structuredClone(B); crowd.snapshot.fish = fishOf('ember', 400, 300);
    const o = combine(A, crowd, 'animals', { tank: t2, rev: 1 }, B0);
    if (o.ok) expect(o.record.snapshot.fish.filter(f => f.species === 'ember').length).toBe(6); else expect(o.conflicts.length).toBeGreaterThan(0);
  }, 120000);
});

// ---------------------------------------------------------------------------------------------------------------- cleanup: a dry candidate in the pair has no water-only readout
import { tankDiff } from '../src/ui/diff';
import { fmtSize } from '../src/scene/physics';
describe('a dry habitat in the pair shows no water-only readout', () => {
  it('the size line has floor area and no gallons / litres, and the A / B differences never mention water volume for the dry side', () => {
    const wet = project(), dry = structuredClone(wet); dry.water.on = false; dry.tank = { ...dry.tank, L: 18 * IN, D: 18 * IN, H: 18 * IN };
    for (const u of ['in', 'cm'] as const) { const t = fmtSize(dry.tank, u, false); expect(t).toMatch(/floor/); expect(t).not.toMatch(/gallon| L,/); expect(fmtSize(wet.tank, u, true)).toMatch(/gallon| L,/); }
    const rows = tankDiff(wet, dry, 'in'), dryText = rows.map(r => String(r[1])).join(' | '), wetText = rows.map(r => String(r[0])).join(' | ');
    expect(dryText).not.toMatch(/gallon/); expect(wetText).toMatch(/gallon/); expect(dryText).toMatch(/Dry/);
  });
});
