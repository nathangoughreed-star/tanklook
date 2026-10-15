import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { itemMesh } from '../src/render/items';
import { cpuGeometry } from '../src/render/plant3d';
import { defaultScene } from '../src/scene/defaults';
import { makeItem } from '../src/scene/items';
import { sampleTerrain } from '../src/scene/terrain';
import type { TankSetup } from '../src/scene/types';

// Lane E2 #2 (fixed in GR4, 2026-10-15): a carpet's cached ground followed only its own place, so after a terrain or
// substrate edit it kept lying on the old ground (floating or buried).
/** How much higher the carpet lies at the back than at the front (world y, back half minus front half). */
function rise(S: TankSetup) {
  const it = S.items[0], m = itemMesh(S, S.tank, it)!;
  m.updateMatrixWorld(true);
  const g = cpuGeometry(m), p = g.attributes.position, I = g.index!.array, v = new THREE.Vector3();
  let back = 0, nb = 0, front = 0, nf = 0;
  for (let i = 0; i < I.length; i++) {
    v.fromBufferAttribute(p, I[i]).applyMatrix4(m.matrixWorld);
    if (-v.z > it.depth + 30) { back += v.y; nb++; } else if (-v.z < it.depth - 30) { front += v.y; nf++; }
  }
  return back / nb - front / nf;
}

describe('carpet on the ground', () => {
  it('follows a substrate or terrain edit (the cached ground is keyed on the ground)', () => {
    const S = defaultScene().tanks[0], T = S.tank;
    S.substrate = { ...S.substrate, show: true, fl: 40, fr: 40, bl: 40, br: 40 };
    S.items = [makeItem(T, 'carpet', 1, 7, T.L / 2, T.D / 2, { growth: 0.6 }, S)];
    expect(Math.abs(rise(S))).toBeLessThan(2); // flat
    S.substrate = { ...S.substrate, fl: 20, fr: 20, bl: 90, br: 90 };
    expect(rise(S)).toBeGreaterThan(10); // sloping up to the back
    S.terrain = sampleTerrain({ ...S, substrate: { ...S.substrate, fl: 40, fr: 40, bl: 40, br: 40 } }, T, 9);
    expect(Math.abs(rise(S))).toBeLessThan(2); // custom terrain, flat again
    S.terrain = { ...S.terrain, h: S.terrain.h.map((h, i) => h + 60 * Math.floor(i / S.terrain.cols) / S.terrain.rows) };
    expect(rise(S)).toBeGreaterThan(5); // a terrain edit raising the back
  });
});
