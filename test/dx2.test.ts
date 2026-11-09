// DX2: the scoped, lock-aware discovery engine. Spec section 9 invariants 1, 2 (exact and atLeast), 7, 9, 10 and journeys B, C, E at the engine level.
// No proposal ever mutates the store.
import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { layerOf } from '../src/scene/items';
import { lockObject, lockRoster } from '../src/scene/locks';
import { checkProposal, previewProposal, type Proposal } from '../src/scene/proposal';
import { verdictOf } from '../src/scene/verdict';
import { propose, type DiscoveryRequest } from '../src/scene/discover';
import { emptyBrief } from '../src/ui/setupBrief';
import type { Fish, TankSetup } from '../src/scene/types';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false;
  t.layout = { ...t.layout, id: 'nature' };
  regenerate(t, 'all', 1);
  t.fish = [...fishOf('kuhli', 7, 101), ...fishOf('ember', 5, 201)];
  return ensureUids(t);
}
const storeOf = (t: TankSetup) => new Store({ ...defaultScene(), tanks: [t] });
const B = emptyBrief();
const plants = (t: TankSetup) => t.items.filter(it => layerOf(it) === 'plant');
const hard = (t: TankSetup) => t.items.filter(it => layerOf(it) === 'hard');
const count = (t: TankSetup, sp: string) => t.fish.filter(f => f.species === sp).length;
/** run the engine and assert it never touched the store */
const run = (t: TankSetup, req: DiscoveryRequest, n = 3) => {
  const s = storeOf(t), snap = JSON.stringify(s.tank), rev = s.rev, d = propose(s, B, req, n);
  expect(JSON.stringify(s.tank)).toBe(snap); expect(s.rev).toBe(rev);
  return { d, s };
};
const after = (t: TankSetup, p: Proposal) => previewProposal(t, p);

describe('invariant 1: nothing outside the checked tabs changes', () => {
  it('Plants only: fish, hardscape, tank and substrate stay; every proposal passes checkProposal', () => {
    const { d, s } = run(project(), { scope: ['plants'], objective: 'explore' });
    expect(d.proposals.length).toBeGreaterThan(0);
    for (const p of d.proposals) {
      expect(p.scope).toEqual(['plants']); expect(checkProposal(s.tank, p).ok).toBe(true);
      const a = after(s.tank, p);
      expect(a.fish).toEqual(s.tank.fish); expect(hard(a)).toEqual(hard(s.tank)); expect(a.tank).toEqual(s.tank.tank); expect(a.substrate).toEqual(s.tank.substrate);
    }
  });
  it('Animals only leaves every item alone; the brief and locks are never edited', () => {
    const { d, s } = run(project(), { scope: ['animals'], objective: 'explore' });
    for (const p of d.proposals) { const a = after(s.tank, p); expect(a.items).toEqual(s.tank.items); expect(a.locks).toEqual(s.tank.locks); expect(p.delta.set?.brief).toBeUndefined(); }
  });
});

describe('invariant 2: locks hold', () => {
  it('exact 7 kuhlis stay exactly 7 in every proposal with Animals checked', () => {
    const t = project(); t.locks = lockRoster(t, 'kuhli', 'exact', 7);
    const { d, s } = run(t, { scope: ['animals', 'plants', 'hardscape'], objective: 'explore' });
    expect(d.proposals.length).toBeGreaterThan(0);
    for (const p of d.proposals) expect(count(after(s.tank, p), 'kuhli')).toBe(7);
  });
  it('atLeast 7 kuhlis never drops below 7 (it may grow)', () => {
    const t = project(); t.locks = lockRoster(t, 'kuhli', 'atLeast', 7);
    const { d, s } = run(t, { scope: ['animals', 'plants', 'hardscape'], objective: 'explore' });
    for (const p of d.proposals) expect(count(after(s.tank, p), 'kuhli')).toBeGreaterThanOrEqual(7);
  });
  it('a locked piece stays put and a locked tank stays the same size', () => {
    const t = project(), rock = hard(t)[0], plant = plants(t)[0];
    t.locks = lockObject(t, rock.uid!); t.locks = lockObject(t, plant.uid!, ['position']); t.locks = lockObject(t, 'tank');
    const { d, s } = run(t, { scope: ['tank', 'plants', 'hardscape'], objective: 'explore' });
    expect(d.proposals.length).toBeGreaterThan(0);
    for (const p of d.proposals) {
      const a = after(s.tank, p), r = a.items.find(i => i.uid === rock.uid)!, pl = a.items.find(i => i.uid === plant.uid)!;
      expect(r).toEqual(rock); expect([pl.x, pl.depth, pl.lift]).toEqual([plant.x, plant.depth, plant.lift]); expect(a.tank).toEqual(s.tank.tank);
    }
  });
});

describe('invariant 7: generators see the whole tank', () => {
  it('a plants-only redraw never adds a gate the project did not already have', () => {
    const t = project(), base = new Set(verdictOf(t, B).gates.map(i => i.id)), { d } = run(t, { scope: ['plants'], objective: 'explore' });
    expect(d.proposals.length).toBeGreaterThan(0);
    for (const p of d.proposals) for (const g of p.verdict.gates) expect(base.has(g.id)).toBe(true);
  });
});

describe('invariant 9: narrow objectives give narrow deltas', () => {
  it('refine rear plants: only plants in the back third change; fish and hardscape are untouched', () => {
    const { d, s } = run(project(), { scope: ['plants', 'hardscape', 'animals'], objective: 'refine', focus: { tab: 'plants', region: 'back', text: 'taller rear plants' } });
    const D = s.tank.tank.D;
    for (const p of d.proposals) {
      const a = after(s.tank, p);
      expect(a.fish).toEqual(s.tank.fish); expect(hard(a)).toEqual(hard(s.tank));
      for (const it of plants(a)) {
        const was = s.tank.items.find(i => i.uid === it.uid);
        if (!was) expect(it.depth / D).toBeGreaterThan(2 / 3 - 1e-9);
        else if (JSON.stringify(was) !== JSON.stringify(it)) expect(was.depth / D).toBeGreaterThan(2 / 3 - 1e-9);
      }
      expect(p.summary).toContain('taller rear plants');
    }
  });
  it('refine on a uid changes only that piece', () => {
    const t = project(), target = plants(t)[0], { d, s } = run(t, { scope: ['plants'], objective: 'refine', focus: { tab: 'plants', uids: [target.uid!] } });
    for (const p of d.proposals) {
      const ids = [...(p.delta.items?.remove ?? []), ...(p.delta.items?.change ?? []).map(c => c.uid)];
      expect(ids.every(u => u === target.uid)).toBe(true); expect(p.delta.items?.add).toBeUndefined(); expect(after(s.tank, p).fish).toEqual(s.tank.fish);
    }
  });
});

describe('invariant 10: no solution is explained, never relaxed', () => {
  it('locked overstock: solve never removes the locked animals; when nothing passes it names the conflicts', () => {
    const t = project(); t.fish = [...fishOf('kuhli', 7, 101), ...fishOf('oscar', 3, 301)]; ensureUids(t);
    t.locks = lockRoster(t, 'oscar', 'exact', 3); t.locks = lockRoster(t, 'kuhli', 'exact', 7);
    const { d, s } = run(t, { scope: ['animals', 'plants'], objective: 'solve' });
    expect(verdictOf(t, B).gates.length).toBeGreaterThan(0); // the premise: the locked stocking already fails a gate
    expect(d.proposals).toEqual([]);
    expect(d.noSolution?.conflicts.length).toBeGreaterThan(0); expect(d.noSolution?.relaxations.length).toBeGreaterThan(0);
    expect(count(s.tank, 'oscar')).toBe(3); expect(s.tank.locks).toEqual(t.locks); // nothing relaxed on the person's behalf
  });
});

describe('journeys', () => {
  it('B: lush tank with exact 7 kuhlis and everything else open: distinct proposals, kuhlis kept, gear listed', () => {
    const t = project(); t.locks = lockRoster(t, 'kuhli', 'exact', 7);
    const { d, s } = run(t, { scope: ['tank', 'animals', 'plants', 'hardscape', 'substrate'], objective: 'explore' }, 3);
    expect(d.proposals.length).toBeGreaterThan(1);
    expect(new Set(d.proposals.map(p => JSON.stringify(p.delta))).size).toBe(d.proposals.length);
    for (const p of d.proposals) { expect(count(after(s.tank, p), 'kuhli')).toBe(7); expect(Array.isArray(p.gear)).toBe(true); }
  });
  it('C: a locked 40 gal breeder: Animals checked keeps the tank; Animals unchecked keeps every fish', () => {
    const t = project(); t.locks = lockObject(t, 'tank');
    const a = run(t, { scope: ['animals'], objective: 'explore' });
    for (const p of a.d.proposals) expect(after(a.s.tank, p).tank).toEqual(a.s.tank.tank);
    const b = run(t, { scope: ['plants', 'hardscape'], objective: 'explore' });
    for (const p of b.d.proposals) expect(after(b.s.tank, p).fish).toEqual(b.s.tank.fish);
  });
  it('E: three sessions, one project: locked substrate survives all; session 2 leaves Animals alone; session 3 keeps the locked kuhlis', () => {
    const t = project(); t.locks = lockObject(t, 'substrate'); t.locks = lockRoster(t, 'kuhli', 'exact', 7);
    const s1 = run(t, { scope: ['animals', 'plants', 'hardscape'], objective: 'explore' });
    for (const p of s1.d.proposals) { const x = after(s1.s.tank, p); expect(x.substrate).toEqual(t.substrate); expect(x.terrain).toEqual(t.terrain); expect(x.patches).toEqual(t.patches); }
    const s2 = run(t, { scope: ['plants', 'hardscape'], objective: 'explore' });
    for (const p of s2.d.proposals) expect(after(s2.s.tank, p).fish).toEqual(t.fish);
    const s3 = run(t, { scope: ['animals'], objective: 'explore' });
    for (const p of s3.d.proposals) { const x = after(s3.s.tank, p); expect(count(x, 'kuhli')).toBe(7); expect(x.items).toEqual(t.items); expect(x.substrate).toEqual(t.substrate); }
  });
});
