import { describe, expect, it } from 'vitest';
import { emitters, fitSpots } from '../src/render/lighting';
import { insideBy, normTank } from '../src/scene/shape';
import type { LightSettings, Tank } from '../src/scene/types';

const pie = normTank({ L: 0, H: 400, D: 600, shape: 'pie', pieDeg: 90 } as Tank);

describe('optimised spot pattern', () => {
  it('a 90° pie with 3 bulbs: one toward the corner, one near each end of the arc', () => {
    const p = fitSpots(pie, 3), mid = pie.L / 2;
    const corner = p.find(q => Math.abs(q[0] - mid) < 5)!;
    expect(corner[1]).toBeGreaterThan(pie.D * 0.6); // on the bisector, back toward the apex
    const ends = p.filter(q => q !== corner);
    expect(ends).toHaveLength(2);
    expect(Math.abs(ends[0][0] - mid - (mid - ends[1][0]))).toBeLessThan(5); // mirror images
    for (const q of ends) { expect(Math.abs(q[0] - mid)).toBeGreaterThan(pie.L * 0.2); expect(q[1]).toBeLessThan(pie.D * 0.4); } // out toward the arc ends
  });
  it('stays inside every shape, n bulbs, deterministic', () => {
    const tanks: Tank[] = [{ L: 900, H: 450, D: 400 }, normTank({ L: 600, H: 500, D: 0, shape: 'round' } as Tank), normTank({ L: 0, H: 400, D: 500, shape: 'pie', pieDeg: 180 } as Tank), normTank({ L: 700, H: 400, D: 0, shape: 'poly', sides: 6 } as Tank)];
    for (const T of tanks) for (const n of [1, 2, 4, 7, 12]) {
      const p = fitSpots(T, n);
      expect(p).toHaveLength(n);
      for (const q of p) expect(insideBy(T, q[0], q[1])).toBeGreaterThan(0);
      expect(fitSpots({ ...T }, n)).toEqual(p);
    }
  });
  it('a rectangle with 2 bulbs puts them at the quarter points', () => {
    const p = fitSpots({ L: 800, H: 400, D: 400 }, 2);
    expect(p.map(q => Math.round(q[0])).sort((a, b) => a - b)).toEqual([200, 600]);
  });
  it('emitters use count alone (rows ignored)', () => {
    const l = { type: 'spot', count: 5, rows: 3, pattern: 'fit', spacing: 0, cone: 52, bright: 1, kelvin: 6500, room: 0.15, height: 50 } as LightSettings;
    expect(emitters(pie, l)).toHaveLength(5);
  });
});
