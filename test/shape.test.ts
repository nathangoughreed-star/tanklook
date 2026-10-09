import { describe, expect, it } from 'vitest';
import { rng } from '../src/art/paint';
import { defaultSetup } from '../src/scene/defaults';
import { IN, clampFish, glassThickness, spawnSnail, volume } from '../src/scene/physics';
import { chord, clampIn, footprint, inside, nearestGlass, normTank, offsetRing, polyRatio, ringArea } from '../src/scene/shape';
import type { Tank } from '../src/scene/types';
import { parseScene } from '../src/scene/validate';
import { tankWeight } from '../src/scene/weight';

const rect: Tank = { L: 600, H: 400, D: 300 };
const round = normTank({ L: 500, H: 450, D: 1, shape: 'round' });
const hex = normTank({ L: 600, H: 400, D: 1, shape: 'poly', sides: 6 });
const bow = normTank({ L: 900, H: 500, D: 400, shape: 'bow', bowMin: 250 });

describe('tank footprints', () => {
  it('a rectangle is its bounding box, with mitred outer glass', () => {
    const f = footprint(rect);
    expect(f.area).toBeCloseTo(600 * 300, 6); expect(f.perimeter).toBeCloseTo(1800, 6);
    expect(ringArea(offsetRing(rect, 10))).toBeCloseTo(620 * 320, 3);
    expect(volume(rect).litres).toBeCloseTo(72, 6);
  });
  it('round: D is the diameter, area and volume of a circle', () => {
    expect(round.D).toBe(500);
    expect(footprint(round).area / (Math.PI * 250 ** 2)).toBeGreaterThan(0.995);
    expect(volume(round).litres).toBeCloseTo(Math.PI * 250 ** 2 * 450 / 1e6, 0);
    expect(inside(round, 250, 250)).toBe(true); expect(inside(round, 10, 10)).toBe(false);
  });
  it('polygons: flat face toward the viewer at depth 0, D from the width', () => {
    expect(hex.D).toBeCloseTo(600 * Math.sqrt(3) / 2, 0);
    expect(polyRatio(3)).toBeCloseTo(Math.sqrt(3) / 2, 6); // triangle, point to the back
    const c = chord(hex, 0, 300)!; expect(c[0]).toBeCloseTo(0, 6); expect(c[1]).toBeCloseTo(hex.D, 1);
    expect(chord(hex, 0, 5)).not.toBeNull(); // the side corners are at the full width
  });
  it('bowfront: a circular arc from the end depth out to the full depth at the centre', () => {
    expect(chord(bow, 0, 450)![0]).toBeCloseTo(0, 1);            // apex on the front line
    expect(chord(bow, 0, 0.01)![0]).toBeCloseTo(400 - 250, 0);    // the ends are bowMin deep
    expect(chord(bow, 0, 450)![1]).toBeCloseTo(400, 6);           // flat back
    // the bow stays at most a half circle, so it never bulges past L
    expect(normTank({ ...bow, L: 300, bowMin: 10 }).bowMin).toBeGreaterThanOrEqual(400 - 150);
  });
  it('clamps points into the outline, and finds the glass and its normal', () => {
    const q = clampIn(round, 0, 0, 20);
    expect(Math.hypot(q.x - 250, q.depth - 250)).toBeCloseTo(230, 0);
    const g = nearestGlass(round, 250, 600);
    expect(g.depth).toBeCloseTo(500, 1); expect(g.n[1]).toBeCloseTo(1, 3); // the back of the circle faces back
  });
});

describe('fish and snails in shaped tanks', () => {
  it('spawns glass snails on the curved glass and floor snails inside it', () => {
    const r = rng(7);
    for (let i = 0; i < 400; i++) {
      const s = spawnSnail(() => 20, round, 24, r);
      const d = Math.hypot(s.x - 250, s.depth - 250);
      if (s.surface === 'glass') expect(d).toBeGreaterThan(249); else expect(d).toBeLessThanOrEqual(250 - 12 + 1e-6);
    }
  });
  it('keeps fish inside the outline and glass snails on the glass', () => {
    const f = { id: 1, species: 'neon', x: 5, y: 100, depth: 5, yaw: 0, pitch: 0, roll: 0, bend: 0 };
    clampFish(f, round); expect(inside(round, f.x, f.depth)).toBe(true);
    const s = { ...f, species: 'nerite', surface: 'glass' as const, x: 250, depth: 240 };
    clampFish(s, round); expect(Math.hypot(s.x - 250, s.depth - 250)).toBeCloseTo(250, -0.5);
  });
});

describe('weight and files', () => {
  it('a rectangle weighs as before (panes, bottom, water)', () => {
    const S = defaultSetup(), T = S.tank, t = glassThickness(T, S.render.glass), w = tankWeight(S);
    const old = ((T.L + 2 * t) * (T.D + 2 * t) * t + 2 * (T.L + 2 * t) * T.H * t + 2 * T.D * T.H * t) / 1e6 * 2.5;
    expect(w.glass).toBeCloseTo(old + (S.lid === 'glass' ? T.L * T.D * 4 / 1e6 * 2.5 : 0), 6);
  });
  it('round tanks hold the circle\'s water, not the bounding box\'s', () => {
    const S = { ...defaultSetup(), tank: round }; S.substrate = { ...S.substrate, show: false }; S.layout = { id: 'none', seed: 1 };
    expect(tankWeight(S).waterLitres / (footprint(round).area * (S.water.level * (450 - 25)) / 1e6)).toBeCloseTo(1, 2);
  });
  it('reads shapes from v8 files; older files are rectangles', () => {
    const s = defaultSetup();
    const v8 = parseScene({ version: 8, name: 'r', units: 'cm', tanks: [{ ...s, tank: { L: 400, H: 400, D: 123, shape: 'round' } }] }).scene;
    expect(v8.tanks[0].tank).toMatchObject({ shape: 'round', D: 400 });
    const v7 = parseScene({ version: 7, name: 'r', units: 'cm', tanks: [{ ...s, tank: { L: 24 * IN, H: 12 * IN, D: 12 * IN } }] }).scene;
    expect(v7.tanks[0].tank.shape).toBeUndefined();
  });
});
