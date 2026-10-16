// Lane T1 (dry ground): terrestrial substrate types and leaf litter load safely, and the shared scatter tool strews
// its copies over the ground deterministically, off the glass, never under the ground and never over a drop.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SUBSTRATES } from '../src/art/placeholder';
import { grainLook } from '../src/render/grains';
import { scatter, type GroundAt } from '../src/render/scatter';
import { defaultScene } from '../src/scene/defaults';
import { insideBy } from '../src/scene/shape';
import type { Tank } from '../src/scene/types';
import { parseScene } from '../src/scene/validate';

const load = (sub: Record<string, unknown>) => {
  const s = JSON.parse(JSON.stringify(defaultScene())); Object.assign(s.tanks[0].substrate, sub);
  return parseScene(s).scene.tanks[0].substrate;
};

describe('terrestrial ground (lane T1)', () => {
  it('new types load; unknown types fall back; old files keep no litter', () => {
    for (const type of ['soil', 'tsand', 'clay', 'bark', 'layered']) { expect(load({ type }).type).toBe(type); expect(SUBSTRATES[type as 'soil'].terra).toBe(true); }
    expect(load({ type: 'moonrock' }).type).toBe('gravel');
    expect('litter' in load({})).toBe(false);
    for (const k of Object.keys(SUBSTRATES)) if (!['soil', 'tsand', 'clay', 'bark', 'layered'].includes(k)) expect(SUBSTRATES[k as 'gravel'].terra).toBeFalsy();
  });
  it('litter is validated and clamped', () => {
    expect(load({ litter: { leaf: 'oak', density: 140, seed: 7.4 } }).litter).toEqual({ leaf: 'oak', density: 100, seed: 7 });
    expect(load({ litter: { leaf: 'fern', density: 'x' } }).litter).toEqual({ leaf: 'mixed', density: 50, seed: 1 });
  });
});

describe('3D grains (render/grains.ts)', () => {
  const sub = (type: string, custom = {}) => ({ ...defaultScene().tanks[0].substrate, type, custom: { ...defaultScene().tanks[0].substrate.custom, ...custom } }) as never;
  it('coarse grounds get grains, fine ones stay painted', () => {
    expect(grainLook(sub('bark'))?.shape).toBe('chip');
    for (const t of ['gravel', 'pea', 'clown', 'blue', 'onyx']) expect(grainLook(sub(t))?.shape).toBe('stone');
    for (const t of ['soil', 'tsand', 'clay', 'layered', 'white', 'black', 'aragonite', 'coral']) expect(grainLook(sub(t))).toBeNull();
    expect(grainLook(sub('custom', { grain: 'pebble', grain2: 'none' }))?.size).toEqual([12, 26]);
    expect(grainLook(sub('custom', { grain: 'sand', grain2: 'none' }))).toBeNull();
    expect(grainLook(sub('custom', { grain: 'pebble', grain2: 'sand' }))).toBeNull(); // blends: not yet
  });
});

describe('scatter (render/scatter.ts)', () => {
  const T: Tank = { L: 600, D: 300, H: 400 };
  const geo = new THREE.PlaneGeometry(1, 0.5).rotateX(-Math.PI / 2), mat = new THREE.MeshBasicMaterial();
  const kinds = [{ geo, mat, weight: 1, size: [40, 80] as [number, number], reach: 0.5 }];
  // a slope rising to the back with a 60 mm step (a bank) across the middle
  const hill = (x: number, d: number) => 30 + d * 0.1 + (x > 300 ? 60 : 0);
  const ground: GroundAt = (x, d) => [x, hill(x, d), -d];
  const spec = { seed: 3, count: 300, kinds, lift: [0.5, 1.5] as [number, number], pile: 2.5, tilt: 0.1, slope: 0.55, clump: 0.7 };
  const copies = (seed = 3) => scatter(T, ground, { ...spec, seed }).flatMap(m => Array.from({ length: m.count }, (_, i) => {
    const mx = new THREE.Matrix4(); m.getMatrixAt(i, mx); const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); mx.decompose(p, q, s);
    return { p, size: Math.abs(s.x) };
  }));
  it('is deterministic per seed and differs between seeds', () => {
    const a = copies(), b = copies(), c = copies(4);
    expect(a.length).toBeGreaterThan(150);
    expect(a.map(o => o.p.toArray())).toEqual(b.map(o => o.p.toArray()));
    expect(c.map(o => o.p.x)).not.toEqual(a.map(o => o.p.x));
  });
  it('keeps every copy off the glass, on (never under) the ground, and off the edge of the bank', () => {
    for (const { p, size } of copies()) {
      const d = -p.z;
      expect(insideBy(T, p.x, d)).toBeGreaterThanOrEqual(size * 0.11); // its ends and sides are checked against the glass too
      expect(p.y).toBeGreaterThan(hill(p.x, d) - 0.01);
      expect(p.y - hill(p.x, d)).toBeLessThan(40); // piled, not floating
      expect(Math.abs(p.x - 300)).toBeGreaterThan(size * 0.12); // not straddling the step
    }
  });
});
