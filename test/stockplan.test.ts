import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { SPECIES } from '../src/data/species';
import { spaceFit } from '../src/scene/space';
import { tankFromModel } from '../src/data/tanks';
import { animalsOf, bump, conflictOf, forkOptions, maxOf, minOf, notesOf, planFor, rankTankmates, startPick, totalOf } from '../src/ui/stockPlanLogic';

describe('stocking screen logic (lane P5, 2026-10-20)', () => {
  it('a species starts at its recommended minimum; a sexed one at a whole multiple of its ratio', () => {
    for (const s of SPECIES) {
      const p = startPick(s.id);
      expect(totalOf(p), s.id).toBeGreaterThanOrEqual(Math.min(minOf(s.id), maxOf(s.id)));
      const r = CARE[s.id]?.sexed?.ratio;
      if (r && r[0] && r[1]) expect((p.f ?? 0) * r[0], `${s.id} ratio`).toBe(p.n * r[1]);
    }
    expect(startPick('adf').n).toBe(2); // African dwarf frog: 2 is the minimum the data calls doable
  });
  it('+ and - respect zero and the most a tank takes, per sex', () => {
    expect(bump({ id: 'betta', n: 1 }, 'n', 1).n).toBe(1); // solo: capped
    expect(bump({ id: 'neon', n: 6 }, 'n', -1).n).toBe(5);
    expect(bump({ id: 'neon', n: 0 }, 'n', -1).n).toBe(0);
    const g = startPick('guppy');
    expect(bump(g, 'f', 1).f).toBe((g.f ?? 0) + 1);
    expect(totalOf(bump({ id: 'guppy', n: 1, f: maxOf('guppy') - 1 }, 'n', 1))).toBe(maxOf('guppy'));
  });
  it('band lines follow the count, habitat notes carry depth and flow', () => {
    expect(notesOf({ id: 'adf', n: 1 }).band).toBe('avoid');
    expect(notesOf({ id: 'adf', n: 2 }).band).toBe('ok');
    expect(notesOf({ id: 'adf', n: 7 }).band).toBe('great');
    const h = notesOf({ id: 'adf', n: 2 }).habitat.join(' | ');
    expect(h).toMatch(/Shallow water/); expect(h).toMatch(/flow/);
    expect(notesOf({ id: 'guppy', n: 1, f: 0 }).ratio).toMatch(/female/);
  });
  it('tankmates: compatible first, never an animal that eats or is eaten, salt stays with salt', () => {
    const list = rankTankmates([{ id: 'adf', n: 2 }]);
    const ok = list.filter(m => m.ok), bad = list.filter(m => !m.ok);
    expect(ok.length).toBeGreaterThan(3);
    expect(list.findIndex(m => !m.ok)).toBe(ok.length); // all the suitable ones come before the first unsuitable one
    expect(bad.find(m => m.sp.id === 'axolotl')?.why).toMatch(/eat/);
    expect(bad.find(m => m.sp.salt)?.why).toMatch(/Salt water/); // salt animals are listed too, greyed out
    const two = rankTankmates([{ id: 'adf', n: 2 }, { id: 'oscar', n: 1 }]); // every occupant gates, not just the first
    expect(two.find(m => m.sp.id === 'neon')?.ok).toBe(false);
    expect(rankTankmates([])).toEqual([]);
    for (let i = 1; i < ok.length; i++) expect(ok[i - 1].score).toBeGreaterThanOrEqual(ok[i].score);
    expect(conflictOf([{ id: 'adf', n: 2 }, { id: 'banggai', n: 2 }], 'banggai')).toMatch(/Salt water/);
    expect(conflictOf([{ id: 'adf', n: 2 }], 'adf')).toBeUndefined();
  });
  it('the plan steps up with the count and names the tank', () => {
    const small = planFor([{ id: 'neon', n: 6 }]), big = planFor([{ id: 'neon', n: 40 }]);
    expect(small.tank && big.tank).toBeTruthy();
    expect(big.litres).toBeGreaterThan(small.litres);
    expect(small.steps.length).toBeGreaterThan(0);
    for (const s of small.steps) { expect(s.tank.id).not.toBe(small.tank!.id); expect(s.costDeltaUsd).toBeGreaterThan(0); }
    expect(small.span!.setupUsd.balanced).toBeGreaterThanOrEqual(small.span!.setupUsd.cheapest);
    // a bigger tank the user chose holds while it is bigger than the need, and falls back to the need when too small
    const pick = small.steps[0].tank.id;
    expect(planFor([{ id: 'neon', n: 6 }], pick).tank!.id).toBe(pick);
    expect(planFor([{ id: 'neon', n: 40 }], pick).tank!.id).toBe(big.need!.tank.id);
    expect(planFor([]).tank).toBeUndefined();
  });
  it('a stocking no filter can carry is worded as such', () => {
    const p = planFor([{ id: 'goldfish', n: 99 }]);
    expect(p.problem).toBeTruthy();
  });
  it('fork options: make room lists sizes with cost, keep-my-space stays inside the space and swaps fit it', () => {
    const animals = animalsOf([{ id: 'neon', n: 6 }, { id: 'cardinal', n: 6 }]);
    const limit = { w: 520, d: 300 };
    const f = forkOptions(animals, limit);
    expect(f.room.length).toBeGreaterThan(0);
    expect(f.room.every(r => r.costUsd && r.costUsd > 0)).toBe(true);
    expect(f.inSpace && spaceFit(tankFromModel(f.inSpace.tank), limit).fits).toBe(true);
    expect(f.fitsAsIs).toBe(false);
    expect(f.swaps.length).toBeGreaterThan(0);
    for (const s of f.swaps) { expect(s.shared.length).toBeGreaterThan(0); expect(spaceFit(tankFromModel(s.tank), limit).fits).toBe(true); expect(['neon', 'cardinal']).not.toContain(s.to.id); }
    // plenty of room: the animals fit as they are and no swap is needed
    const roomy = forkOptions(animalsOf([{ id: 'neon', n: 6 }]), { w: 2000, d: 800 });
    expect(roomy.fitsAsIs).toBe(true); expect(roomy.swaps).toEqual([]);
  });
});
