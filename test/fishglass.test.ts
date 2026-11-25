import { describe, expect, it } from 'vitest';
import { clampFish } from '../src/scene/physics';
import { insideBy } from '../src/scene/shape';
import { fishTL, speciesOf } from '../src/data/species';
import type { Fish, Tank } from '../src/scene/types';

// Nathan 2026-11-25: a gourami near a side pane, turned toward it, had its head out through the glass; clampFish only kept the centre in.
const T = { L: 610, H: 305, D: 305 } as Tank;
const ends = (f: Fish) => {
  const h = fishTL(f, speciesOf(f)!) / 2, a = f.yaw * Math.PI / 180;
  return [[f.x + Math.cos(a) * h, f.depth + Math.sin(a) * h], [f.x - Math.cos(a) * h, f.depth - Math.sin(a) * h]];
};

describe('fish stay behind the glass', () => {
  for (const yaw of [0, 30, 90, 180, -135]) it(`nose and tail inside at yaw ${yaw}`, () => {
    for (const [x, depth] of [[5, 150], [605, 150], [300, 5], [300, 300], [8, 8]]) {
      const f = { id: 'a', species: 'gourami', x, depth, y: 150, yaw, pitch: 0, roll: 0 } as unknown as Fish;
      clampFish(f, T);
      for (const [ex, ed] of ends(f)) expect(insideBy(T, ex, ed)).toBeGreaterThan(0);
    }
  });
});
