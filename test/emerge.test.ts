import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { growthLen, growthOf } from '../src/art/plants';
import { bendPlant, plantGeometry, revealPlant, type GrowData } from '../src/render/plant3d';

// Emersed growth, spreading, lily pads (lane GR2, 2026-10-15)
/** The box round what shows (hidden vertices wait at their anchors, so the geometry's own box is wider). */
const box = (g: THREE.BufferGeometry) => {
  const b = new THREE.Box3(), p = g.attributes.position, I = g.index!.array, v = new THREE.Vector3();
  for (let i = 0; i < I.length; i++) b.expandByPoint(v.fromBufferAttribute(p, I[i]));
  return b;
};
/** Vertices of a form (2 = emersed twin, 3 = pad) that show at growth g. */
const shown = (g: THREE.BufferGeometry, form: number, at = 1) => {
  const G = g.userData.grow as GrowData;
  let n = 0;
  if (G.em) for (let v = 0; v < G.em.length; v++) if (G.em[v] === form && G.gr[v * 2] <= at && (form !== 2 || (G.cut?.[v] ?? Infinity) <= at)) n++;
  return n;
};

describe('emersed growth', () => {
  it('with room above the water an emerging plant climbs out, its leaves above the line emersed; without, it lies over', () => {
    for (const type of ['stem', 'stemred', 'ludwigia', 'sword', 'ozelot'] as const) {
      const full = plantGeometry(type, 2, 250), F = 150;
      expect(shown(full, 2), type).toBe(0); // the twins are hidden until bent
      const out = bendPlant(full, F, { ceil: 400, water: true }), v = box(revealPlant(out, 1));
      expect(v.max.y, type).toBeGreaterThan(F + 50);
      expect(v.max.y, type).toBeLessThan(412); // under the ceiling (a blade's width over its midrib)
      expect(shown(out, 2), type).toBeGreaterThan(0);
      // no ceiling (a plant with no growth of its own, a dry tank) or too little room: it lies over as in GR1
      for (const o of [{}, { ceil: F + 30, water: true }]) {
        const b = bendPlant(full, F, o);
        expect(box(revealPlant(b, 1)).max.y, type).toBeLessThan(F + 25);
        expect(shown(b, 2), type).toBe(0);
      }
    }
  });

  it('a young sword stays submersed: a leaf turns emersed only once grown long enough to reach out', () => {
    const full = plantGeometry('sword', 4, 250), F = 200, out = bendPlant(full, F, { ceil: 450, water: true });
    expect(shown(out, 2, 0)).toBe(0);
    expect(shown(out, 2, 1)).toBeGreaterThan(0);
    // about half its leaves that reach out go emersed, the rest still lie at the surface
    const G = out.userData.grow as GrowData, cuts = new Set<number>();
    for (let v = 0; v < G.em!.length; v++) if (G.em![v] === 2) cuts.add(G.cut![v]);
    expect([...cuts].some(c => c === Infinity) && [...cuts].some(c => c < 1)).toBe(true);
  });

  it('a plant nobody has grown gets no twins (it costs what it did)', () => {
    const g = plantGeometry('stem', 2, 250, {}, growthOf('stem', 250), false);
    expect((g.userData.grow as GrowData).em).toBeUndefined();
  });

  it('sagittaria spreads into a lawn: much wider by growth 1, not much taller', () => {
    const full = plantGeometry('sagittaria', 5, 70), a = box(revealPlant(full, growthOf('sagittaria', 70))), b = box(revealPlant(full, 1));
    const wa = Math.max(a.max.x - a.min.x, a.max.z - a.min.z), wb = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
    expect(wb / wa).toBeGreaterThan(1.8);
    expect(b.max.y / a.max.y).toBeLessThan(wb / wa);
  });

  it('a tiger lotus sends pads up to lie on the water, none without water', () => {
    const full = plantGeometry('lotus', 3, 120), F = 260;
    const wet = bendPlant(full, F, { water: true }), v = box(revealPlant(wet, 1));
    expect(shown(wet, 3)).toBeGreaterThan(0);
    expect(v.max.y).toBeGreaterThan(F + 2);
    expect(v.max.y).toBeLessThan(F + 8);
    const dry = bendPlant(full, F, { water: false });
    expect(shown(dry, 3)).toBe(0);
    expect(box(revealPlant(dry, 1)).max.y).toBeLessThan(growthLen('lotus', 1) * 1.2);
    // pads come with growth: none just planted
    expect(revealPlant(wet, 0).index!.count).toBeLessThan(revealPlant(wet, 1).index!.count);
  });
});
