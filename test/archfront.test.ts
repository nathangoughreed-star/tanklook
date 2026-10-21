import { describe, expect, it } from 'vitest';
import { rng } from '../src/art/paint';
import { checkModel } from '../src/data/tankcheck';
import { getTankModel, outerOf, tankFromModel } from '../src/data/tanks';
import { clampFish, spawnSnail, volume } from '../src/scene/physics';
import { archBulge, footprint, frontAt, glassFrame, levelRing, nearestGlass, normTank, volumeBetween } from '../src/scene/shape';
import type { Fish, Tank } from '../src/scene/types';
import { parseScene } from '../src/scene/validate';
import { emptyScene } from '../src/scene/defaults';

// a front pane curved about a HORIZONTAL axis (Fluval Flex): flush with the frame at the floor and the opening, out by `frontBulge` at mid-height
const arch: Tank = normTank({ L: 400, H: 300, D: 330, shape: 'arch', frontBulge: 30 });

describe('arch front (curved about a horizontal axis)', () => {
  it('the floor outline is the flat box behind the frame line; D stays the full depth', () => {
    expect(arch.D).toBe(330); expect(archBulge(arch)).toBe(30);
    const f = footprint(arch);
    expect(f.area).toBeCloseTo(400 * 300, 6);
    expect(Math.min(...f.ring.map(p => p[1]))).toBeCloseTo(30, 6);
    expect(normTank({ ...arch, shape: 'rect' })).toEqual({ L: 400, H: 300, D: 330 }); // back to a plain rectangle drops the bulge
  });
  it('the front is an arc: frame line at the floor and the opening, depth 0 at mid-height, symmetric', () => {
    expect(frontAt(arch, 0)).toBeCloseTo(30, 6); expect(frontAt(arch, 300)).toBeCloseTo(30, 6); expect(frontAt(arch, 150)).toBeCloseTo(0, 6);
    expect(frontAt(arch, 60)).toBeCloseTo(frontAt(arch, 240), 9);
    expect(frontAt(arch, 75)).toBeLessThan(frontAt(arch, 30)); // monotone toward the middle
    expect(frontAt({ L: 400, H: 300, D: 330 }, 150)).toBe(0); // a plain rectangle has no bulge
  });
  it('volume follows the profile (closed form = numeric integral) and sits between the box and the box less the bulge', () => {
    let num = 0; const n = 20000;
    for (let i = 0; i < n; i++) num += 400 * (330 - frontAt(arch, (i + 0.5) * 300 / n)) * 300 / n;
    expect(volumeBetween(arch, 0, 300)).toBeCloseTo(num, -2);
    expect(volume(arch).litres).toBeGreaterThan(400 * 300 * 300 / 1e6); // more than the flat-front box behind the frame
    expect(volume(arch).litres).toBeLessThan(400 * 300 * 330 / 1e6);
    expect(volumeBetween(arch, 0, 150) + volumeBetween(arch, 150, 300)).toBeCloseTo(volumeBetween(arch, 0, 300), 3);
    expect(volumeBetween(arch, 100, 100)).toBe(0);
  });
  it('the water surface reaches out to the glass at its height', () => {
    expect(Math.min(...levelRing(arch, 150).map(p => p[1]))).toBeCloseTo(0, 6);
    expect(Math.min(...levelRing(arch, 300).map(p => p[1]))).toBeCloseTo(30, 6);
  });
  it('a fish swims out to the bulge at mid-height but not past the frame line at the floor', () => {
    const fish = (y: number): Fish => ({ x: 200, y, depth: 0 } as Fish);
    const mid = fish(150); clampFish(mid, arch); expect(mid.depth).toBeCloseTo(0, 6);
    const low = fish(0); clampFish(low, arch); expect(low.depth).toBeCloseTo(30, 6);
    const near = fish(75); clampFish(near, arch); expect(near.depth).toBeCloseTo(frontAt(arch, 75), 6);
    const side = { x: -40, y: 150, depth: 100 } as Fish; clampFish(side, arch); expect(side.x).toBe(0);
  });
  it('a snail on the front glass sits on the arc and the pane normal leans up above mid-height', () => {
    expect(nearestGlass(arch, 200, 5, 200).depth).toBeCloseTo(frontAt(arch, 200), 6);
    expect(glassFrame(arch, 200, 5, 250).n[1]).toBeGreaterThan(0.1);
    expect(glassFrame(arch, 200, 5, 50).n[1]).toBeLessThan(-0.1);
    expect(glassFrame(arch, 200, 5, 150).n[1]).toBeCloseTo(0, 6);
    const r = rng(7);
    for (let k = 0; k < 200; k++) {
      const s = spawnSnail(() => 0, arch, 20, r, 290);
      if (s.surface === 'glass' && s.depth < 31) expect(s.depth).toBeCloseTo(frontAt(arch, s.y), 5);
    }
  });
  it('survives a save and reload', () => {
    const sc = emptyScene(); sc.tanks[0].tank = arch;
    expect(parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].tank).toEqual(arch);
  });
});

describe('Fluval Flex catalogue entries', () => {
  for (const [id, gal] of [['n_flex_9gal', 9], ['n_flex_15gal', 15]] as const) {
    it(`${id}: curved front, rated ${gal} gal within tolerance, outer size round-trips`, () => {
      const m = getTankModel(id)!, T = tankFromModel(m);
      expect(m.shape).toBe('arch'); expect(T.shape).toBe('arch'); expect(archBulge(T)).toBeGreaterThan(20);
      expect(m.note).toMatch(/ESTIMATE/);
      expect(checkModel(m).problems).toEqual([]);
      const o = outerOf(T, m.glassMm);
      expect(o.L).toBeCloseTo(m.outer.L, 1); expect(o.D).toBeCloseTo(m.outer.D, 1); expect(o.H).toBeCloseTo(m.outer.H, 1);
      expect(volume(T).gallons / gal).toBeGreaterThan(0.92); expect(volume(T).gallons / gal).toBeLessThan(1.08);
    });
  }
  it('the Flex 15 kit is its own catalogue entry, not a variant of the rectangular 15 gal', () => {
    expect((getTankModel('g15')!.variants ?? []).some(v => v.kit === 'fluval-flex-15')).toBe(false);
    expect((getTankModel('n_flex_15gal')!.variants ?? []).some(v => v.kit === 'fluval-flex-15')).toBe(true);
  });
});
