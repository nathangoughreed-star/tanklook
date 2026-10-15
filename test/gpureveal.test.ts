import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PLANT3D, growthOf, type PlantType } from '../src/art/plants';
import { bendPlant, carpetOnGround, grownView, plantGeometry, revealPlant, shaderReveal } from '../src/render/plant3d';

// GPU reveal (lane GR4, 2026-10-15): the vertex shader's reveal (mirrored on the CPU by shaderReveal) draws the same
// triangles as revealPlant at every growth: what revealPlant keeps lands where it puts it, what it drops has no area.
const TYPES = Object.keys(PLANT3D) as PlantType[];
const GROWTHS = [0, 0.01, ...Array.from({ length: 10 }, (_, i) => 0.05 + i * 0.1), 0.999, 1];

function compare(src: THREE.BufferGeometry, g: number, what: string) {
  const cpu = revealPlant(src, g), gpu = shaderReveal(src, g), I = gpu.index;
  const P = cpu.attributes.position.array as Float32Array;
  // the triangles revealPlant keeps, in the same order (all of them when it hands back src: everything is shown)
  const CI = cpu === src ? I : cpu.index!.array;
  let j = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let bad = 0, far = 0, n = 0;
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]];
    if (j < CI.length && CI[j] === v[0] && CI[j + 1] === v[1] && CI[j + 2] === v[2]) {
      n++; j += 3;
      for (const i of v) for (let q = 0; q < 3; q++) if (Math.abs(gpu.pos[i * 3 + q] - P[i * 3 + q]) > 1e-3) far++;
    } else {
      a.fromArray(gpu.pos, v[0] * 3); b.fromArray(gpu.pos, v[1] * 3); c.fromArray(gpu.pos, v[2] * 3);
      if (b.clone().sub(a).cross(c.clone().sub(a)).length() > 1e-6) bad++;
    }
  }
  expect(n * 3, `${what} @${g}: kept`).toBe(CI.length);
  expect(far, `${what} @${g}: corners off`).toBe(0);
  expect(bad, `${what} @${g}: dropped triangles with area`).toBe(0);
}

describe('GPU reveal', () => {
  it('draws exactly the triangles revealPlant shows, every species, built / lying over / climbing out / on the ground', () => {
    for (const type of TYPES) for (const seed of [3]) {
      const P = PLANT3D[type]!, carpet = P.form === 'carpet', h = carpet ? 160 : 220;
      for (const more of [false, true]) {
        const full = plantGeometry(type, seed, h, {}, growthOf(type, h), more), w = `${type} ${seed}${more ? '+' : ''}`;
        const srcs: [string, THREE.BufferGeometry][] = [['built', full]];
        if (carpet) srcs.push(['ground', carpetOnGround(full, (x, z) => (Math.abs(x) > 60 ? null : { x, y: 0.02 * z, z, w: 20 }))]);
        else {
          srcs.push(['over', bendPlant(full, 120, { water: true })]);
          if (more && P.grow.overflow === 'emerge') srcs.push(['climb', bendPlant(full, 120, { ceil: 400, water: true })]);
        }
        for (const [k, src] of srcs) for (const g of [...GROWTHS, growthOf(type, h)]) compare(src, g, `${w} ${k}`);
      }
    }
  }, 300_000);

  it('a view shares the plant buffers, boxes only what shows, and picks against what shows', () => {
    const full = plantGeometry('stem', 5, 220), v = grownView(full, 0.1), cpu = revealPlant(full, 0.1);
    expect(v.attributes.position).toBe(full.attributes.position);
    expect(v.boundingBox!.max.y).toBeCloseTo(cpu.boundingBox!.max.y, 3);
    expect(v.boundingBox!.max.y).toBeLessThan(new THREE.Box3().setFromBufferAttribute(full.attributes.position as THREE.BufferAttribute).max.y);
  });
});
