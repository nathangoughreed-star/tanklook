import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PLANT3D, growthLen, growthOf, grownSize, type PlantType } from '../src/art/plants';
import { defaultScene } from '../src/scene/defaults';
import { clampItem, itemDims, makeItem } from '../src/scene/items';
import { parseScene } from '../src/scene/validate';
import { bendPlant, plantGeometry, revealPlant } from '../src/render/plant3d';
import { plantGeometry as plantBefore } from './fixtures/plant3d_before_growth';

// Plant growth (lane GR1, 2026-10-15)
const TYPES = Object.keys(PLANT3D) as PlantType[];
/** The species the pre-growth fixture knows (lane GR2 added frogbit, water lettuce and tiger lotus after it; lane T2 the
 *  land plants). */
const OLD = TYPES.filter(t => !['frogbit', 'lettuce', 'lotus', 'pothos', 'bromeliad', 'tropfern', 'fittonia', 'sphagnum', 'creeper', 'hairgrass', 'hornwort', 'anacharis', 'echeveria', 'haworthia', 'jade', 'aloe', 'burrotail', 'barrel', 'sansevieria', 'agave', 'columnar'].includes(t));

/** The visible triangles as sorted strings of their corners (order-free: the growth build interleaves its extras). */
function tris(g: THREE.BufferGeometry) {
  const p = g.attributes.position, c = g.attributes.color, I = g.index!.array, out: string[] = [];
  const v = (i: number) => [p.getX(i), p.getY(i), p.getZ(i), c.getX(i), c.getY(i), c.getZ(i)].map(x => x.toFixed(3)).join(',');
  for (let t = 0; t < I.length; t += 3) out.push([v(I[t]), v(I[t + 1]), v(I[t + 2])].join('|'));
  return out.sort();
}

describe('plant growth', () => {
  it('a plant with no growth of its own draws exactly as before growth existed', () => {
    for (const type of OLD) for (const seed of [1, 7, 4242]) {
      const h = { carpet: 160, redroot: 200, salvinia: 200 }[type as string] ?? [60, 150, 320][seed % 3];
      const clump = type === 'stem' && seed === 7 ? { spread: 120, stems: 9 } : {};
      const now = revealPlant(plantGeometry(type, seed, h, clump), growthOf(type, h));
      expect(tris(now), `${type} seed ${seed}`).toEqual(tris(plantBefore(type, seed, h, clump)));
    }
  });

  it('growth is back-solved from the saved size, and the grown size follows the species curve', () => {
    expect(growthOf('grass', 120)).toBe(0);
    expect(growthOf('grass', 900)).toBe(1);
    expect(growthLen('grass', growthOf('grass', 280))).toBeCloseTo(280, 6);
    expect(grownSize('grass', 280)).toBe(280); // no growth: the saved size
    expect(grownSize('grass', 280, 1)).toBeCloseTo(900, 6);
    expect(grownSize('grass', 280, 0)).toBeCloseTo(120, 6);
    // a size outside the species' range keeps its own scale
    expect(grownSize('anubias', 300, 0)).toBeCloseTo(300 * 40 / 180, 6);
  });

  it('more growth shows more: never fewer triangles, and the plant gets bigger', () => {
    for (const type of TYPES) {
      const full = plantGeometry(type, 3, growthLen(type, 0.5));
      let last = 0, lastH = 0;
      for (const g of [0, 0.25, 0.5, 0.75, 1]) {
        const v = revealPlant(full, g), n = v.index!.count;
        v.computeBoundingBox();
        const size = Math.max(v.boundingBox!.max.y - v.boundingBox!.min.y, v.boundingBox!.max.x - v.boundingBox!.min.x);
        expect(n, `${type} at ${g}`).toBeGreaterThanOrEqual(last);
        expect(size, `${type} at ${g}`).toBeGreaterThanOrEqual(lastH - 1e-6);
        last = n; lastH = size;
      }
      expect(revealPlant(full, 0).index!.count, type).toBeLessThan(revealPlant(full, 1).index!.count);
    }
  });

  it('scrubbing reveals: the same build, the leaves that show stay put', () => {
    const full = plantGeometry('stem', 5, 220), a = revealPlant(full, 0.6), b = revealPlant(full, 0.9);
    // every vertex full at 0.6 is in the same place at 0.9
    const P = full.attributes.position, A = a.attributes.position, B = b.attributes.position;
    let same = 0;
    for (let i = 0; i < P.count; i++) if (A.getX(i) === P.getX(i) && A.getY(i) === P.getY(i) && A.getZ(i) === P.getZ(i)) { expect(B.getY(i)).toBe(P.getY(i)); same++; }
    expect(same).toBeGreaterThan(100);
  });

  it('longer than the water above it, it lies over at the surface', () => {
    for (const type of ['grass', 'balansae', 'rotala', 'stem'] as PlantType[]) {
      const full = plantGeometry(type, 2, 250), F = 150, b = bendPlant(full, F), v = revealPlant(b, 1);
      v.computeBoundingBox(); full.computeBoundingBox();
      expect(full.boundingBox!.max.y, type).toBeGreaterThan(F + 50); // it would have reached well past the surface
      expect(v.boundingBox!.max.y, type).toBeLessThan(F + 25); // lies at it instead (a leaf's width above its midrib)
      expect(bendPlant(full, 1e4)).toBe(full); // nothing reaches a surface that high: no rebuild
    }
  });

  it('round-trips through a saved file and is clamped on load; only plants keep it', () => {
    const s = defaultScene(), t = s.tanks[0];
    t.items = [makeItem(t.tank, 'grass', 1, 7, 300, 150, { growth: 0.73 }), makeItem(t.tank, 'stem', 2, 8, 500, 150, { growth: 3 }), makeItem(t.tank, 'sword', 3, 9, 700, 150)];
    (t.items[2] as { growth?: number }).growth = -1;
    const back = parseScene(JSON.stringify(s)).scene.tanks[0].items;
    expect(back[0].growth).toBe(0.73);
    expect(back[1].growth).toBe(1);
    expect(back[2].growth).toBe(0);
    const rock = { ...makeItem(t.tank, 'grass', 4, 7, 300, 150), kind: 'stone' as const, variant: 'seiryu', growth: 0.5 };
    clampItem(rock, t.tank);
    expect(rock.growth).toBeUndefined();
    const old = makeItem(t.tank, 'grass', 5, 7, 300, 150);
    expect('growth' in old).toBe(false);
    expect(itemDims(old)[1]).toBe(old.size); // no growth: the picking size is the saved size, as before
    expect(itemDims({ ...old, growth: 1 })[1]).toBeGreaterThan(old.size);
  });
});
