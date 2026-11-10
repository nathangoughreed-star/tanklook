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
