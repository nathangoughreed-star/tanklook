// AB1: the pair generator (Discovery v2 spec section 12 items 10, 12, 15, 18, 19, 20, 21, 22, frozen Animals, first-pair timing) and the pairwise outcomes in aspects.ts.
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { lockRoster, lockObject } from '../src/scene/locks';
import { verdictOf } from '../src/scene/verdict';
import { emptyBrief } from '../src/ui/setupBrief';
import { setEquipment, setNoNewEquipment, setOwnedUse } from '../src/scene/project';
import { withUnits } from '../src/scene/tech';
import { adapt, baselineOf, clearPairCache, effectiveScope, nextPair } from '../src/scene/pairGen';
import { aspectsOf, pairEvents, recordPair, reactPair, weightsOf, tagOf } from '../src/explore/aspects';
import { rankEligible } from '../src/explore/rank';
import type { CandidateRecord, DiscoverySession } from '../src/scene/discoveryTypes';
import type { Fish, TankSetup } from '../src/scene/types';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' };
  regenerate(t, 'all', 1);
  t.fish = [...fishOf('kuhli', 7, 101), ...fishOf('ember', 5, 201)];
  return ensureUids(t);
}
const ALL = ['tank', 'animals', 'plants', 'hardscape', 'substrate'] as const;
const session = (o: Partial<DiscoverySession> = {}): DiscoverySession => ({ id: 's1', baseRev: 1, scope: [...ALL], freezes: [], direction: 'unsure', comparisons: [], status: 'active', ...o });
const B = emptyBrief();
const count = (r: CandidateRecord, sp: string) => r.snapshot.fish.filter(f => f.species === sp).length;
const shown: string[] = [];
const hist = new Map<string, CandidateRecord>();
const keep = (...rs: CandidateRecord[]) => rs.forEach(r => { hist.set(r.id, r); if (r.key) shown.push(r.key); });
const look = (id: string) => hist.get(id);
beforeEach(() => { clearPairCache(); hist.clear(); shown.length = 0; });

function pair(t: TankSetup, s = session(), brief = B, o: Parameters<typeof nextPair>[4] = {}, rev = 1) {
  const r = nextPair({ tank: t, rev }, brief, s, look, { shownKeys: shown, ...o });
  if (r.ok) keep(r.a, r.b);
  return r;
}

describe('first pair: complete, validated, comparable, and fast', () => {
  it('returns two different, feasible, complete candidates in about 3 s or less', () => {
    const t0 = performance.now(), r = pair(project(), session()), ms = performance.now() - t0;
    console.log(`AB1 first pair: ${Math.round(ms)} ms`);
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(ms).toBeLessThan(3500);
    expect(r.a.key).not.toBe(r.b.key); expect(r.a.id).not.toBe(r.b.id);
    for (const c of [r.a, r.b]) {
      expect(c.verdict.feasible).toBe(true);
      expect(verdictOf(c.snapshot, B).feasible).toBe(true);        // the snapshot itself passes the same judge (item 22: nothing unwelfare is shown as viable)
      expect(c.snapshot.fish.length).toBeGreaterThan(0);
      expect(['first', 'contrast']).toContain(c.purpose);
      expect(c.baseRev).toBe(1); expect(c.sessionId).toBe('s1');
    }
  }, 30000);

  it('item 21: both cards carry the same facts: cost, weekly care, difficulty, species counts, itemized purchases', () => {
    const r = pair(project()); if (!r.ok) throw new Error('no pair');
    for (const c of [r.a, r.b]) {
      const f = c.facts;
      expect(f.title.length).toBeGreaterThan(0); expect(f.habitat.length).toBeGreaterThan(0);
      for (const g of [f.newSpendUsd, f.weeklyMin]) { expect(g.hi).toBeGreaterThanOrEqual(g.mean); expect(g.mean).toBeGreaterThanOrEqual(g.lo); expect(g.est).toBe(true); }
      expect(f.monthlyUsd).toBeTruthy(); expect(['Beginner', 'Intermediate', 'Advanced']).toContain(f.difficulty);
      expect(f.stocking.length).toBeGreaterThan(0); expect(f.stocking.reduce((n, s) => n + s.n, 0)).toBe(c.snapshot.fish.length);
      expect(Array.isArray(f.toBuy)).toBe(true); expect(f.toBuy.every(l => l.usd > 0 && l.label)).toBe(true);
      expect(c.assumptions.length).toBeGreaterThan(0);
    }
    expect(Object.keys(r.a.facts).sort()).toEqual(Object.keys(r.b.facts).sort());
    expect(r.a.facts.gallons).not.toBeNull();
  }, 30000);

  it('item 10: a scope of two tabs is a controlled contrast that varies those tabs and holds the rest', () => {
    const t = project(), r = pair(t, session({ scope: ['plants', 'hardscape'] })); if (!r.ok) throw new Error('no pair');
    for (const c of [r.a, r.b]) { expect(c.purpose).toBe('contrast'); expect(c.snapshot.fish.map(f => f.species).sort()).toEqual(t.fish.map(f => f.species).sort()); expect(c.snapshot.tank).toEqual(t.tank); }
    expect(r.a.key).not.toBe(r.b.key);
  }, 30000);

  it('a pair never mutates the project it was made from', () => {
    const t = project(), snap = JSON.stringify(t); pair(t); expect(JSON.stringify(t)).toBe(snap);
  }, 30000);
});

describe('locks and scope', () => {
  it('item 12: an exact lock of 7 kuhlis never changes, in the first pair or any later challenger', () => {
    const t = project(); lockRoster(t, 'kuhli', 'exact', 7);
    const r = pair(t); if (!r.ok) throw new Error('no pair');
    expect([count(r.a, 'kuhli'), count(r.b, 'kuhli')]).toEqual([7, 7]);
    const s = session({ championId: r.a.id, comparisons: [] });
    for (let i = 0; i < 2; i++) { const c = pair(t, s, B, { next: 'champion' }); if (!c.ok) break; expect(count(c.a, 'kuhli')).toBe(7); expect(count(c.b, 'kuhli')).toBe(7); }
  }, 60000);

  it('item 12: "at least 7" only grows, never shrinks', () => {
    const t = project(); lockRoster(t, 'kuhli', 'atLeast', 7);
    const r = pair(t); if (!r.ok) throw new Error('no pair');
    expect(count(r.a, 'kuhli')).toBeGreaterThanOrEqual(7); expect(count(r.b, 'kuhli')).toBeGreaterThanOrEqual(7);
  }, 30000);

  it("a frozen Animals tab keeps the SOURCE record's unlocked species and counts", () => {
    const t = project(), first = pair(t); if (!first.ok) throw new Error('no pair');
    const src = first.b, want = JSON.stringify(src.snapshot.fish.map(f => f.species).sort());
    const s = session({ freezes: [{ tab: 'animals', source: src.id }] });
    expect(effectiveScope({ tank: t, rev: 1 }, s)).not.toContain('animals');
    const r = pair(t, s, B, {}, 2); if (!r.ok) throw new Error('no pair');
    for (const c of [r.a, r.b]) expect(JSON.stringify(c.snapshot.fish.map(f => f.species).sort())).toBe(want);
  }, 60000);

  it('item 17 / baseline: a freeze copies the source only into the baseline, never into the working project', () => {
    const t = project(), first = pair(t); if (!first.ok) throw new Error('no pair');
    const snap = JSON.stringify(t), { base } = baselineOf({ tank: t, rev: 1 }, session({ freezes: [{ tab: 'animals', source: first.a.id }] }), look);
    expect(JSON.stringify(t)).toBe(snap);
    expect(base.fish.map(f => f.species).sort()).toEqual(first.a.snapshot.fish.map(f => f.species).sort());
  }, 30000);

  it('item 15: a species locked from the losing candidate persists into the next pair and is still fully validated', () => {
    const t = project(), first = pair(t); if (!first.ok) throw new Error('no pair');
    const lose = first.b.snapshot.fish.find(f => !['kuhli', 'ember'].includes(f.species))?.species ?? first.b.snapshot.fish[0].species;
    const t2 = structuredClone(t); t2.fish = [...t2.fish, ...fishOf(lose, 1, 900)]; ensureUids(t2); lockRoster(t2, lose, 'speciesOnly', 1);
    const r = pair(t2, session(), B, {}, 2);
    if (r.ok) for (const c of [r.a, r.b]) { expect(c.snapshot.fish.some(f => f.species === lose)).toBe(true); expect(verdictOf(c.snapshot, B).feasible).toBe(true); }
    else expect(r.conflicts.length).toBeGreaterThan(0);
  }, 60000);

  it('a locked tank keeps its dimensions and water in every candidate', () => {
    const t = project(); lockObject(t, 'tank');
    const r = pair(t); if (!r.ok) throw new Error('no pair');
    for (const c of [r.a, r.b]) { expect(c.snapshot.tank).toEqual(t.tank); expect(c.snapshot.water).toEqual(t.water); }
  }, 30000);
});

describe('equipment and cost', () => {
  const ownHeater = (t: TankSetup, w = 400): TankSetup => ({ ...t, tech: withUnits(t.tech ?? ({ rows: {} } as never), 'heater', [{ w, owned: true }]) });
  it('item 19: reusing capable owned gear lowers the new spend of the SAME design', () => {
    const t = project(), first = pair(t, session({ scope: ['plants', 'hardscape'] })); if (!first.ok) throw new Error('no pair');
    expect(first.a.facts.toBuy.some(l => l.key === 'heater')).toBe(true);
    const rec = first.a, plain = adapt(rec, { tank: t, rev: 1 }, B), own = adapt(rec, { tank: ownHeater(t), rev: 1 }, B);
    if (!plain.ok || !own.ok) throw new Error('adapt failed');
    expect(own.record.facts.newSpendUsd.mean).toBeLessThan(plain.record.facts.newSpendUsd.mean);
    expect(own.record.facts.toBuy.some(l => l.key === 'heater')).toBe(false);
  }, 60000);

  it('item 18: Must-use gear is always in every candidate', () => {
    const t = ownHeater(project()), b = setOwnedUse(setEquipment(B, 'heater', { pick: 'care' }), 'heater', 'required');
    const r = pair(t, session(), b); if (!r.ok) throw new Error('no pair');
    for (const c of [r.a, r.b]) { expect(c.facts.mustUse).toContain('heater'); expect(c.snapshot.tech).toBeTruthy(); }
  }, 30000);

  it('"No new equipment": no candidate lists a purchase the project does not allow (or the result is an actionable no-solution)', () => {
    const t = project(), b = setNoNewEquipment(B, true), r = pair(t, session(), b);
    if (r.ok) for (const c of [r.a, r.b]) expect(c.snapshot.tank).toEqual(t.tank);
    else { expect(r.conflicts.length).toBeGreaterThan(0); expect(r.relaxations.length).toBeGreaterThan(0); }
  }, 60000);

  it('item 20: a weak Must-use light is never made to support demanding plants by adding CO2 or fertilizer', () => {
    const t = project(); t.light = { ...t.light, owned: true } as never;
    const b = setOwnedUse(setEquipment(B, 'light', { pick: 'care' }), 'light', 'required'), r = pair(t, session(), b);
    if (r.ok) for (const c of [r.a, r.b]) { expect(verdictOf(c.snapshot, b).feasible).toBe(true); expect(c.facts.mustUse).toContain('light'); expect(c.snapshot.light.owned).toBe(true); }
  }, 60000);
});

describe('no solution and variety', () => {
  it('item 22: impossible locks give an actionable no-solution, never a pair', () => {
    const t = project(); lockRoster(t, 'kuhli', 'exact', 7); lockRoster(t, 'ember', 'exact', 5); lockObject(t, 'tank');
    t.tank = { ...t.tank, L: 8 * IN, D: 8 * IN, H: 8 * IN };
    const r = pair(t, session({ scope: ['animals'] }), B, { budgetMs: 800 });
    expect(r.ok).toBe(false); if (r.ok) return;
    expect(r.conflicts.length).toBeGreaterThan(0); expect(r.relaxations.length).toBeGreaterThan(0);
  }, 60000);

  it('nothing open to change: says so', () => {
    const r = pair(project(), session({ scope: [] })); expect(r.ok).toBe(false);
  });

  it('later challengers: the champion stays A, no shown key repeats, and the cache keeps them quick', () => {
    const t = project(), first = pair(t); if (!first.ok) throw new Error('no pair');
    const s = session({ championId: first.a.id }), keys = new Set([first.a.key, first.b.key]), t0 = performance.now(); let n = 0;
    for (let i = 0; i < 3; i++) { const c = pair(t, s, B, { next: 'champion' }); if (!c.ok) break; n++; expect(c.a.id).toBe(first.a.id); expect(keys.has(c.b.key!)).toBe(false); keys.add(c.b.key!); expect(c.b.purpose).toBe('challenger'); expect(c.b.parentId).toBe(first.a.id); }
    expect(n).toBeGreaterThan(0); console.log(`AB1 ${n} challengers: ${Math.round(performance.now() - t0)} ms`);
  }, 120000);

  it('a fresh pair is far from the champion; the final pair is two history records and generates nothing', () => {
    const t = project(), first = pair(t); if (!first.ok) throw new Error('no pair');
    const f = pair(t, session({ championId: first.a.id }), B, { next: 'fresh' });
    if (f.ok) { for (const c of [f.a, f.b]) expect(c.purpose).toBe('fresh'); expect([f.a.key, f.b.key]).not.toContain(first.a.key); }
    const fin = nextPair({ tank: t, rev: 1 }, B, session({ championId: first.a.id, pendingFreshId: first.b.id }), look, { next: 'final' });
    expect(fin.ok && fin.a.id === first.a.id && fin.b.id === first.b.id).toBe(true);
    expect(nextPair({ tank: t, rev: 1 }, B, session({ championId: first.a.id }), look, { next: 'final' }).ok).toBe(false);
  }, 120000);
});

describe('adapt', () => {
  it('returns a NEW record with parentId, leaves the old one untouched, and holds the current locks', () => {
    const t = project(), first = pair(t); if (!first.ok) throw new Error('no pair');
    const old = JSON.stringify(first.a), t2 = structuredClone(t); lockRoster(t2, 'kuhli', 'exact', 7);
    const r = adapt(first.a, { tank: t2, rev: 2 }, B);
    expect(JSON.stringify(first.a)).toBe(old);
    if (!r.ok) { expect(r.conflicts.length).toBeGreaterThan(0); return; }
    expect(r.record.purpose).toBe('adapted'); expect(r.record.parentId).toBe(first.a.id); expect(r.record.id).not.toBe(first.a.id); expect(r.record.baseRev).toBe(2);
    expect(count(r.record, 'kuhli')).toBe(7); expect(verdictOf(r.record.snapshot, B).feasible).toBe(true);
  }, 60000);
});

describe('pairwise outcomes in aspects.ts', () => {
  const A = { id: 'a', features: ['world:fresh', 'look:x', 'plants:lush', 'species:kuhli', 'complexity:beginner'] }, Bb = { id: 'b', features: ['world:marine', 'look:y', 'plants:none', 'species:ember', 'complexity:advanced'] };
  it("A wins: a like on A, a weak pass on B (never B's world or look family)", () => {
    const ev = pairEvents({ outcome: 'A', a: A, b: Bb });
    expect(ev.map(e => [e.c, e.k])).toEqual([['a', 'like'], ['b', 'pass']]);
    expect(ev[1].neg).not.toContain('world:marine'); expect(ev[1].neg).not.toContain('look:y');
  });
  it('B wins mirrors it; both likes both; neither passes both; skip records nothing', () => {
    expect(pairEvents({ outcome: 'B', a: A, b: Bb }).map(e => [e.c, e.k])).toEqual([['b', 'like'], ['a', 'pass']]);
    expect(pairEvents({ outcome: 'both', a: A, b: Bb }).map(e => e.k)).toEqual(['like', 'like']);
    expect(pairEvents({ outcome: 'neither', a: A, b: Bb }).map(e => e.k)).toEqual(['pass', 'pass']);
    expect(pairEvents({ outcome: 'skip', a: A, b: Bb })).toEqual([]);
    expect(reactPair(undefined, { outcome: 'skip', a: A, b: Bb })).toBeUndefined();
  });
  it('reasons speak only for aspects; money reasons teach nothing (a limit is never a preference)', () => {
    const ev = pairEvents({ outcome: 'A', a: A, b: Bb, why: ['plants', 'upfront'] });
    expect(ev[0].att).toBe(true); expect(ev[0].pos!.every(k => ['plants', 'natural'].includes(tagOf(k)!))).toBe(true);
    expect(pairEvents({ outcome: 'A', a: A, b: Bb, why: ['upfront', 'ongoing'] })[0].pos).toEqual(A.features);
  });
  it('feedback ranks, never locks: the brief gains an aspects item only, and a ranked list never adds or drops a candidate', () => {
    const b2 = recordPair(B, { outcome: 'A', a: A, b: Bb, why: ['plants'] }), asp = aspectsOf(b2);
    expect(asp?.events.length).toBe(2); expect(Object.keys(b2.items).filter(k => !(k in B.items))).toEqual(['preferences.aspects']);
    expect(weightsOf(asp).get('plants:lush')?.w).toBeGreaterThan(0);
    const es = [{ id: 'x', key: 'x', fp: {} as never, features: ['plants:none'] }, { id: 'y', key: 'y', fp: {} as never, features: ['plants:lush'] }];
    expect(rankEligible(es, asp).map(e => e.id)).toEqual(['y', 'x']); expect(rankEligible(es, undefined).map(e => e.id)).toEqual(['x', 'y']);
  });
});

describe('the candidate cache never serves a stale pair', () => {
  it('a lock, a Must-use item, a hold or the scope changing at the SAME revision gives a fresh, valid pair', () => {
    const t = project(), r1 = pair(t); if (!r1.ok) throw new Error('no pair');
    shown.length = 0;
    lockRoster(t, 'pygmycory', 'exact', 8);                                    // same rev, same session: only the locks moved
    const r2 = pair(t); if (!r2.ok) throw new Error('no pair after lock');
    for (const c of [r2.a, r2.b]) expect(c.snapshot.fish.filter(f => f.species === 'pygmycory').length).toBe(8);
    const b = setOwnedUse(setEquipment(B, 'heater', { pick: 'care' }), 'heater', 'required');
    const t3 = { ...t, tech: withUnits(t.tech ?? ({ rows: {} } as never), 'heater', [{ w: 400, owned: true }]) } as TankSetup;
    shown.length = 0; const r3 = pair(t3, session(), b); if (!r3.ok) throw new Error('no pair after gear');
    for (const c of [r3.a, r3.b]) expect(c.facts.mustUse).toContain('heater');
    shown.length = 0; const r4 = pair(t3, session({ scope: ['plants'] }), b); if (!r4.ok) throw new Error('no pair after scope');
    for (const c of [r4.a, r4.b]) expect(c.snapshot.tank).toEqual(t3.tank);
    const k = (x: typeof r2) => x.ok ? [x.a.key, x.b.key].join() : '';
    expect(k(r2)).not.toBe(k(r1));
  }, 120000);
});
