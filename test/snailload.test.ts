// Lane SN (2026-10-22, Nathan: "realistically they dont need much space ... But the waste production is real. Also yes they should take up
// SOME space, relative to their adult size"): snails take a small floor share by adult size and make real waste.
import { describe, expect, it } from 'vitest';
import { tankFor } from '../src/scene/tankfit';
import { stockingOf } from '../src/scene/stocking';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';

const tank = (L: number, D: number, H: number, animals: [string, number][]) => {
  const s = defaultSetup(); s.tank = { ...s.tank, L: L * IN, D: D * IN, H: H * IN }; s.water.on = true; s.water.salt = false; s.water.level = 0.9;
  let id = 1; s.fish = animals.flatMap(([species, n]) => Array.from({ length: n }, () => ({ id: id++, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 })));
  return s;
};

describe('snail waste and space (lane SN)', () => {
  it('50 mystery snails fit neither a 2.5 gal nor a 10 gal: the smallest tank that holds them is at least 20 gal', () => {
    const f = tankFor([{ species: 'mystery', n: 50 }])!;
    expect(f.fails).toEqual([]);
    expect(f.gallons).toBeGreaterThanOrEqual(20);
  });
  it('snails take some floor, by adult size: a mystery snail more than a trumpet snail', () => {
    const big = stockingOf(tank(20, 10, 12, [['mystery', 1]])).floor.usedCm2, small = stockingOf(tank(20, 10, 12, [['trumpet', 1]])).floor.usedCm2;
    expect(small).toBeGreaterThan(0); expect(big).toBeGreaterThan(5 * small);
  });
  it('small snails stay nearly free (S187): 10 trumpet snails in a 5 gal use under 10 % of its Space', () => {
    const r = stockingOf(tank(16, 8, 10, [['trumpet', 10]]));
    expect(r.spacePercent).toBeLessThan(10); expect(r.percent).toBeLessThan(100);
  });
});
