import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { itemDims, layerOf, starterItems } from '../src/scene/items';
import { IN } from '../src/scene/physics';
import type { LayoutId, TankSetup } from '../src/scene/types';

const small = (id: LayoutId, seed: number, hard: number): TankSetup => {
  const s = defaultSetup(); s.tank = { ...s.tank, L: 12 * IN, H: 14 * IN, D: 12 * IN };
  s.layout = { ...s.layout, id, seed, dens: { hard, plant: 0, animal: 0 } } as TankSetup['layout'];
  return s;
};
/** Share of the floor within reach of a piece's footprint (a disc of 0.35 of its longer side). */
const cover = (s: TankSetup) => {
  const ps = starterItems(s).filter(it => layerOf(it) === 'hard' && !it.lift), { L, D } = s.tank; let hit = 0, n = 0;
  for (let x = 6; x < L; x += 12) for (let d = 6; d < D; d += 12) { n++; if (ps.some(it => { const [l, , w] = itemDims(it); return Math.hypot(x - it.x, d - it.depth) < 0.35 * Math.max(l, w); })) hit++; }
  return { c: hit / n, ps };
};
describe('hardscape fills a small floor when pushed dense', () => {
  for (const id of ['driftwood', 'stones'] as LayoutId[]) it(`${id}: coverage grows with the slider, pieces stay inside the glass`, () => {
    for (const seed of [2, 3, 4]) {
      const lo = cover(small(id, seed, 2)).c, hi = cover(small(id, seed, 5));
      expect(hi.c).toBeGreaterThan(Math.max(lo, 0.6));
      for (const p of hi.ps) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(s0(id).tank.L); expect(p.depth).toBeLessThanOrEqual(s0(id).tank.D); }
    }
  });
});
const s0 = (id: LayoutId) => small(id, 2, 2);
