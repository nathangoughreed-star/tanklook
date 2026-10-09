import { describe, expect, it } from 'vitest';
import { rng } from '../src/art/paint';
import { defaultSetup } from '../src/scene/defaults';
import { waterY } from '../src/scene/physics';
import { shuffleFish } from '../src/scene/scatter';
import { inside } from '../src/scene/shape';
import { groundHeight } from '../src/scene/terrain';
import type { Fish, TankSetup } from '../src/scene/types';
import { keepInWater } from '../src/scene/water';

function stocked(): TankSetup {
  const s = defaultSetup(); let id = 1;
  const add = (species: string, n: number, extra: Partial<Fish> = {}) => {
    for (let i = 0; i < n; i++) s.fish.push({ id: id++, species, x: s.tank.L / 2, y: 100, depth: s.tank.D / 2, yaw: 0, pitch: 0, roll: 0, bend: 0, ...extra });
  };
  add('neon', 12); add('bronzecory', 6); add('betta', 1); add('gbr', 1, { tl: 40 }); add('nerite', 2, { surface: 'floor' });
  return s;
}
const yawGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('shuffle', () => {
  it('keeps every animal, its species, id and size, inside the tank and the rules', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = stocked(), before = s.fish.map(f => `${f.id}:${f.species}:${f.tl ?? ''}`);
      shuffleFish(s, rng(seed)); keepInWater(s);
      expect(s.fish.map(f => `${f.id}:${f.species}:${f.tl ?? ''}`)).toEqual(before);
      const A = s.tank, top = waterY(A, s.water.level);
      for (const f of s.fish) {
        if (f.surface !== 'glass') expect(inside(A, f.x, f.depth, -1)).toBe(true);
        expect(f.y).toBeLessThanOrEqual(top + 1e-6);
      }
      for (const f of s.fish.filter(q => q.species === 'bronzecory')) expect(f.y).toBeCloseTo(groundHeight(s, A, f.x, f.depth), 3);
      const betta = s.fish.find(f => f.species === 'betta')!, g = groundHeight(s, A, betta.x, betta.depth);
      expect((betta.y - g) / (top - g)).toBeGreaterThan(0.5); // a top swimmer stays in the upper water
    }
  });
  it('keeps a school together and heading one way', () => {
    let together = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = stocked(); shuffleFish(s, rng(seed));
      const neons = s.fish.filter(f => f.species === 'neon'), xs = neons.map(f => f.x);
      if (Math.max(...xs) - Math.min(...xs) < s.tank.L * 0.5) together++;
      // one or two schools; within one, every heading near another's
      const heads = neons.map(f => f.yaw);
      expect(heads.every(a => heads.filter(b => yawGap(a, b) <= 30).length >= 3)).toBe(true);
    }
    expect(together).toBeGreaterThan(20); // split schools aside, it stays compact
  });
  it('is repeatable from a seed (the same draws in every edited tank)', () => {
    const a = stocked(), b = stocked();
    shuffleFish(a, rng(7)); shuffleFish(b, rng(7));
    expect(a.fish).toEqual(b.fish);
  });
});
