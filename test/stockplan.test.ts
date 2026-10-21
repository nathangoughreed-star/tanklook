import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { SPECIES } from '../src/data/species';
import { spaceFit } from '../src/scene/space';
import { tankFromModel } from '../src/data/tanks';
import { animalsOf, bump, conflictOf, forkOptions, maxOf, minOf, notesOf, overWarn, planFor, rankTankmates, startPick, totalOf } from '../src/ui/stockPlanLogic';

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
    expect(bump({ id: 'betta', n: 1 }, 'n', 1).n).toBe(2); // never blocked, only warned
    expect(overWarn({ id: 'betta', n: 2 })).toMatch(/one to a tank/); expect(overWarn({ id: 'oscar', n: 2 })).toMatch(/one to a tank/); expect(overWarn({ id: 'tigerbarb', n: 20 })).toMatch(/not advised/); expect(overWarn({ id: 'oscar', n: 1 })).toBeUndefined();
    expect(bump({ id: 'neon', n: 6 }, 'n', -1).n).toBe(5);
    expect(bump({ id: 'neon', n: 0 }, 'n', -1).n).toBe(0);
    const g = startPick('guppy');
    expect(bump(g, 'f', 1).f).toBe((g.f ?? 0) + 1);
    expect(totalOf(bump({ id: 'guppy', n: 1, f: maxOf('guppy') - 1 }, 'n', 1))).toBe(maxOf('guppy') + 1);
  });
  it('band lines follow the count, habitat notes carry depth and flow', () => {
    expect(notesOf({ id: 'adf', n: 1 }).band).toBe('avoid');
    expect(notesOf({ id: 'adf', n: 2 }).band).toBe('ok');
    expect(notesOf({ id: 'adf', n: 7 }).band).toBe('great');
    const h = notesOf({ id: 'adf', n: 2 }).habitat.join(' | ');
    expect(h).toMatch(/no deeper than 61 cm \(advice/); // lane MM: the sourced 24 in maximum, an advisory expect(h).toMatch(/flow/);
    expect(notesOf({ id: 'guppy', n: 1, f: 0 }).ratio).toMatch(/female/);
  });
  it('tankmates: compatible first, never an animal that eats or is eaten, salt stays with salt', () => {
    const list = rankTankmates([{ id: 'adf', n: 2 }], planFor([{ id: 'adf', n: 2 }]).need!.tank);
    const ok = list.filter(m => m.ok), bad = list.filter(m => !m.ok);
    expect(ok.length).toBeGreaterThan(3);
    expect(list.findIndex(m => !m.ok)).toBe(ok.length); // all the suitable ones come before the first unsuitable one
    expect(bad.find(m => m.sp.id === 'axolotl')?.why).toMatch(/eat/);
    expect(bad.find(m => m.sp.salt)?.why).toMatch(/Salt water/); // salt animals are listed too, greyed out
    const two = rankTankmates([{ id: 'adf', n: 2 }, { id: 'oscar', n: 1 }]); // every occupant gates, not just the first
    expect(two.find(m => m.sp.id === 'neon')?.ok).toBe(false);
    expect(rankTankmates([])).toEqual([]);
    const fit = list.filter(m => m.fits), big = list.filter(m => m.ok && !m.fits);
    expect(list.slice(0, fit.length).every(m => m.fits)).toBe(true); // runs: fits the tank, then compatible-but-bigger, then unsuitable
    expect(big.every(m => !!m.bigger)).toBe(true);
    for (let i = 1; i < fit.length; i++) expect(fit[i - 1].score).toBeGreaterThanOrEqual(fit[i].score);
    for (let i = 1; i < big.length; i++) expect(big[i - 1].score).toBeGreaterThanOrEqual(big[i].score);
    // on the smallest tank that holds the picks, some compatible animals must need more room
    expect(big.length).toBeGreaterThan(0);
    expect(conflictOf([{ id: 'adf', n: 2 }, { id: 'banggai', n: 2 }], 'banggai')).toMatch(/Salt water/);
    expect(conflictOf([{ id: 'adf', n: 2 }], 'adf')).toBeUndefined();
  });
  it('the plan steps up with the count and names the tank', () => {
    const small = planFor([{ id: 'neon', n: 6 }]), big = planFor([{ id: 'neon', n: 40 }]);
    expect(small.tank).toBeUndefined(); // no tank until the user picks one
    expect(small.need && big.need).toBeTruthy();
    expect(big.need!.litres).toBeGreaterThan(small.need!.litres);
    // every size is listed smallest first; the ones below the need are out, and the need and bigger (to a point) are in
    const lit = small.options.map(o => o.litres); expect([...lit].sort((a, b) => a - b)).toEqual(lit);
    const firstOk = small.options.findIndex(o => !o.fails.length);
    expect(firstOk).toBeGreaterThan(0); expect(small.options[firstOk].tank.id).toBe(small.need!.tank.id);
    expect(small.options.slice(0, firstOk).every(o => o.fails.length > 0)).toBe(true);
    expect(small.options.slice(firstOk).filter(o => !o.fails.length).length).toBeGreaterThan(3);
    // the chosen tank holds as animals are added: it is never swapped, only flagged when it gets too small
    const pick = small.need!.tank.id;
    expect(planFor([{ id: 'neon', n: 6 }], pick).tank!.id).toBe(pick);
    expect(planFor([{ id: 'neon', n: 6 }], pick).problem).toBeUndefined();
    const crowded = planFor([{ id: 'neon', n: 40 }], pick);
    expect(crowded.tank!.id).toBe(pick); expect(crowded.problem).toMatch(/pick a bigger|take fewer/);
    expect(small.options[0].minPct).toBeGreaterThan(0);
    expect(planFor([]).tank).toBeUndefined(); expect(planFor([]).options).toEqual([]);
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
  it('the oscar tank sizes: more oscars never need a smaller tank, 5 need a bigger one than 1; only holding sizes are open', () => {
    const one = planFor([{ id: 'oscar', n: 1 }]), three = planFor([{ id: 'oscar', n: 3 }]), five = planFor([{ id: 'oscar', n: 5 }]);
    expect(three.need!.litres).toBeGreaterThanOrEqual(one.need!.litres);
    expect(five.need!.litres).toBeGreaterThan(one.need!.litres);
    for (const p of [one, three, five]) for (const o of p.options.filter(o => !o.fails.length)) expect(o.spacePct).toBeLessThanOrEqual(100);
  });
});
