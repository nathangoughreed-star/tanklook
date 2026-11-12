// Lane VF-B (plan VF stage VF2): plant variety. With the `variety` switch off every plant is built exactly as before
// (fingerprints taken on origin/main 6e128a41, before the lane); with it on, the plant keeps its leaf count, stays under
// its size on average and inside its footprint, and its look changes.
import PLANTED4 from '../research/visual/vf0/scenes/planted4.json';
import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { plant3d, plantGeometry } from '../src/render/plant3d';
import type { PlantType } from '../src/art/plants';

/** A fingerprint of positions and colours (order-sensitive), and the counts. */
function print(g: THREE.BufferGeometry) {
  let h = 0;
  for (const k of ['position', 'color'] as const) {
    const a = g.attributes[k].array as ArrayLike<number>;
    for (let i = 0; i < a.length; i++) h = (h * 31 + Math.round(a[i] * 1000)) % 2147483647;
  }
  return `${g.attributes.position.count}/${g.index?.count ?? 0}/${h}`;
}
/** One attribute's fingerprint (order-sensitive). */
function hash(g: THREE.BufferGeometry, k: 'position' | 'color') {
  let h = 0;
  const a = g.attributes[k].array as ArrayLike<number>;
  for (let i = 0; i < a.length; i++) h = (h * 31 + Math.round(a[i] * 1000)) % 2147483647;
  return h;
}
const CASES: [PlantType, number, number, { spread?: number; stems?: number }?][] = [
  ['grass', 238044534, 174], ['grass', 77, 300, { spread: 120, stems: 6 }], ['sword', 4242, 250], ['crypt', 99, 120],
  ['fern', 5, 160], ['stem', 31, 260], ['carpet', 12, 200], ['anubias', 8, 110],
];
// Shapes: origin/main 6e128a41 (variety did not exist), the same builds; positions only, since the greens retune
// (VF2 item 2, 2026-11-12) changed the colours of grass, sword, stem and carpet and nothing else.
const SHAPES: Record<string, string> = {"0:grass":"12498/48240/-1591015293","1:grass":"7368/28200/2073202265","2:sword":"19880/96768/-966899705","3:crypt":"8946/43992/192289920","4:fern":"6187/29904/187262587","5:stem":"44015/142608/843836865","6:carpet":"92502/246672/-947992290","7:anubias":"3247/15432/-1823626568"};
// Colours: pinned after the greens retune (crypt, fern, anubias as on 6e128a41)
const COLOURS: Record<string, number> = {"0:grass":808689901,"1:grass":45662753,"2:sword":339655657,"3:crypt":1839327576,"4:fern":1283638375,"5:stem":1657260957,"6:carpet":286083969,"7:anubias":900876781};

afterEach(() => { plant3d.variety = false; });

describe('plant variety (lane VF-B)', () => {
  it('switch off: every plant exactly as before', () => {
    plant3d.variety = false;
    const gs = CASES.map(([t, s, h, c], i) => [`${i}:${t}`, plantGeometry(t, s, h, c)] as const);
    expect(Object.fromEntries(gs.map(([k, g]) => [k, `${g.attributes.position.count}/${g.index?.count ?? 0}/${hash(g, 'position')}`]))).toEqual(SHAPES);
    expect(Object.fromEntries(gs.map(([k, g]) => [k, hash(g, 'color')]))).toEqual(COLOURS);
  });

  it('switch on: same leaves, under its size, inside its footprint, a different look', () => {
    for (const [t, s, h, c] of CASES) {
      plant3d.variety = false;
      const a = plantGeometry(t, s, h, c);
      plant3d.variety = true;
      const b = plantGeometry(t, s, h, c);
      expect(b.attributes.position.count, t).toBe(a.attributes.position.count);
      expect(b.index!.count, t).toBe(a.index!.count);
      // the footprint: the plant as an old save shows it (its own part, nothing grown on); a crown leaning on its own
      // may reach a little further on one side (grass by about a quarter)
      plant3d.variety = false;
      const a0 = plantGeometry(t, s, h, c, undefined, false);
      plant3d.variety = true;
      const b0 = plantGeometry(t, s, h, c, undefined, false);
      a0.computeBoundingBox(); b0.computeBoundingBox();
      const A = a0.boundingBox!, B = b0.boundingBox!;
      expect(B.max.y, t).toBeLessThanOrEqual(Math.max(A.max.y, h) * 1.07 + 0.5);
      const reach = (x: THREE.Box3) => Math.max(-x.min.x, x.max.x, -x.min.z, x.max.z);
      expect(reach(B), t).toBeLessThanOrEqual(reach(A) * 1.3 + 1);
      expect(print(b), t).not.toBe(print(a));
    }
  });

  it('switch on: the saved size stays the average height (up and down, not only down)', () => {
    plant3d.variety = true;
    const k: number[] = [];
    for (let s = 1; s <= 40; s++) { const g = plantGeometry('sword', s * 7717, 250, {}, undefined, false); g.computeBoundingBox(); k.push(g.boundingBox!.max.y / 250); }
    const mean = k.reduce((a, b) => a + b) / k.length;
    expect(Math.abs(mean - 1)).toBeLessThan(0.025);
    expect(Math.max(...k)).toBeGreaterThan(1.02);
    expect(Math.min(...k)).toBeLessThan(0.98);
    expect(Math.max(...k)).toBeLessThanOrEqual(1.07 + 1e-3);
    // a plant capped under the lid (built at h under its saved size) never goes above h
    for (let s = 1; s <= 20; s++) { const g = plantGeometry('sword', s * 7717, 200, {}, undefined, false, 250); g.computeBoundingBox(); expect(g.boundingBox!.max.y).toBeLessThanOrEqual(200.5); }
  });

  it('switch on: adding or removing a plant leaves every other plant as it was', () => {
    // the planted 4 ft reference tank's plants (research/visual/vf0/scenes): build them all, then again without one and
    // in another order; each remaining plant must come out the same (its variety hangs on its own seed only)
    plant3d.variety = true;
    const S = PLANTED4;
    const P = (S.tanks[0].items as unknown as { kind: string; variant: PlantType; seed: number; size: number }[]).filter(i => i.kind === 'plant');
    const one = (i: { variant: PlantType; seed: number; size: number }) => print(plantGeometry(i.variant, i.seed, i.size, {}, undefined, false));
    const all = P.map(one);
    const fewer = P.slice(1).reverse().map(one).reverse();
    expect(fewer).toEqual(all.slice(1));
    const more = [...P.slice(0, 5), { variant: 'grass' as PlantType, seed: 123456, size: 200 }, ...P.slice(5)].map(one);
    expect([...more.slice(0, 5), ...more.slice(6)]).toEqual(all);
  });

  it('switch on: deterministic from the seed', () => {
    plant3d.variety = true;
    for (const [t, s, h, c] of CASES.slice(0, 3)) expect(print(plantGeometry(t, s, h, c))).toBe(print(plantGeometry(t, s, h, c)));
  });
});
