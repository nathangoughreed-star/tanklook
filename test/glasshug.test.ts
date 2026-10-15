import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bendPlant, plantGeometry, revealPlant } from '../src/render/plant3d';

// Leaves along the glass (Nathan 2026-10-15): a plant near a pane curves its leaves along it instead of being cut off
const box = (g: THREE.BufferGeometry) => {
  const b = new THREE.Box3(), p = g.attributes.position, I = g.index!.array, v = new THREE.Vector3();
  for (let i = 0; i < I.length; i++) b.expandByPoint(v.fromBufferAttribute(p, I[i]));
  return b;
};

describe('leaves along the glass', () => {
  it('nothing crosses a pane on +x 30 mm away; the plant keeps its height and spreads along the glass', () => {
    for (const type of ['grass', 'stem', 'sword'] as const) {
      const full = plantGeometry(type, 3, 250), before = box(revealPlant(full, 1));
      expect(before.max.x, type).toBeGreaterThan(30); // (the test means something: it did reach past the pane)
      const out = bendPlant(full, Infinity, { walls: [1, 0, 30] }), after = box(revealPlant(out, 1));
      expect(out, type).not.toBe(full);
      expect(after.max.x, type).toBeLessThan(31);
      expect(after.max.y, type).toBeGreaterThan(before.max.y * 0.95);
      expect(after.max.z - after.min.z, type).toBeGreaterThanOrEqual((before.max.z - before.min.z) * 0.98);
    }
  });

  it('a pane out of reach changes nothing; with the water too, leaves stay under it', () => {
    const full = plantGeometry('grass', 3, 250);
    expect(bendPlant(full, Infinity, { walls: [1, 0, 2000] })).toBe(full);
    const out = bendPlant(full, 150, { walls: [0, -1, 25] }), b = box(revealPlant(out, 1));
    expect(b.min.z).toBeGreaterThan(-26);
    expect(b.max.y).toBeLessThan(175);
  });
});
