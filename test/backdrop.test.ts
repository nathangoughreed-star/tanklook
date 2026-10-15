import { describe, expect, it } from 'vitest';
import { backdropGeometry } from '../src/render/backdrop';
import { defaultScene } from '../src/scene/defaults';
import { makeItem } from '../src/scene/items';
import { clampFish } from '../src/scene/physics';
import { parseScene } from '../src/scene/validate';
import type { BackdropKind, Fish, Tank } from '../src/scene/types';

const KINDS: BackdropKind[] = ['rock', 'river', 'reef', 'cork', 'moss'];

describe('3D back wall (2026-10-15)', () => {
  it('older files open without one; untrusted settings are cleaned', () => {
    const file = JSON.parse(JSON.stringify(defaultScene()));
    delete file.tanks[0].backdrop;
    expect(parseScene(file).scene.tanks[0].backdrop).toEqual({ kind: 'none', depth: 50, seed: 1 });
    file.tanks[0].backdrop = { kind: 'lava', depth: 9999, seed: -4 };
    expect(parseScene(file).scene.tanks[0].backdrop).toEqual({ kind: 'none', depth: 100, seed: 1 });
    file.tanks[0].backdrop = { kind: 'cork', depth: 35, seed: 77 };
    expect(parseScene(file).scene.tanks[0].backdrop).toEqual({ kind: 'cork', depth: 35, seed: 77 });
  });

  it('every style stays between the back glass and its depth, across the full width and height', () => {
    const T = defaultScene().tanks[0].tank;
    for (const kind of KINDS) {
      const g = backdropGeometry(T, { kind, depth: 60, seed: 3 })!, p = g.attributes.position;
      let minD = Infinity, maxD = -Infinity, minX = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < p.count; i++) {
        const d = -p.getZ(i);
        minD = Math.min(minD, d); maxD = Math.max(maxD, d); minX = Math.min(minX, p.getX(i)); maxX = Math.max(maxX, p.getX(i)); maxY = Math.max(maxY, p.getY(i));
      }
      expect(maxD, kind).toBeLessThanOrEqual(T.D + 1e-6);
      expect(minD, kind).toBeGreaterThanOrEqual(T.D - 60 - 1e-6);
      expect(maxD - minD, kind).toBeGreaterThan(25); // real relief, not a flat sheet
      expect(minX).toBeCloseTo(0); expect(maxX).toBeCloseTo(T.L); expect(maxY).toBeGreaterThan(T.H - 5);
    }
  });

  it('none, or a bowl, has no wall; a round tank gets one on its back arc', () => {
    const T = defaultScene().tanks[0].tank;
    expect(backdropGeometry(T, { kind: 'none', depth: 50, seed: 1 })).toBeNull();
    expect(backdropGeometry({ ...T, shape: 'bowl' } as Tank, { kind: 'rock', depth: 50, seed: 1 })).toBeNull();
    const R = { ...T, shape: 'round', L: 500, D: 500 } as Tank;
    expect(backdropGeometry(R, { kind: 'river', depth: 50, seed: 1 })!.attributes.position.count).toBeGreaterThan(100);
  });

  it('fish and plants stay in front of it', () => {
    const s = defaultScene(), T = s.tanks[0].tank;
    const f = { id: 1, species: 'neon', x: T.L / 2, y: 100, depth: T.D } as Fish;
    clampFish(f, T, 60);
    expect(f.depth).toBe(T.D - 70);
    s.tanks[0].backdrop = { kind: 'moss', depth: 60, seed: 1 };
    const plant = makeItem(T, 'anubias', 9, 1, T.L / 2, T.D, {}, s.tanks[0]);
    expect(plant.depth).toBeLessThanOrEqual(T.D - 42);
  });

  it('covers every chosen side, round the corner, and keeps fish and plants clear of each (Nathan 2026-10-15)', () => {
    const s = defaultScene(), T = s.tanks[0].tank, b = { kind: 'cork' as const, depth: 50, seed: 2 };
    const box = (sides: ('back' | 'left' | 'right' | 'front')[]) => { const g = backdropGeometry(T, b, false, sides)!; g.computeBoundingBox(); return g.boundingBox!; };
    const back = box(['back']), bl = box(['back', 'left']), all = box(['back', 'left', 'right', 'front']);
    expect(-back.max.z).toBeGreaterThan(T.D - 51); // back only: nothing out in the middle of the tank
    expect(bl.max.x).toBeCloseTo(T.L); expect(-bl.max.z).toBeLessThan(1); // the left wall runs to the front glass
    expect(backdropGeometry(T, b, false, [])).toBeNull();
    expect(all.min.x).toBeLessThan(2); expect(all.max.x).toBeGreaterThan(T.L - 2); expect(-all.max.z).toBeLessThan(2); // a closed ring, just in from the glass
    // the left wall is in from the left glass only by its depth
    const g = backdropGeometry(T, b, false, ['left'])!, p = g.attributes.position;
    let maxX = 0; for (let i = 0; i < p.count; i++) maxX = Math.max(maxX, p.getX(i));
    expect(maxX).toBeLessThanOrEqual(50 + 1e-6);
    const f = { id: 1, species: 'neon', x: 0, y: 100, depth: T.D } as Fish;
    clampFish(f, T, 50, ['back', 'left']);
    expect(f.x).toBeCloseTo(60); expect(f.depth).toBeCloseTo(T.D - 60);
    s.tanks[0].backdrop = { kind: 'moss', depth: 60, seed: 1 }; s.tanks[0].render.bgSides = ['right'];
    const plant = makeItem(T, 'anubias', 9, 1, T.L, T.D / 2, {}, s.tanks[0]);
    expect(plant.x).toBeLessThanOrEqual(T.L - 42);
  });
});
