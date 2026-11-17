// GB1 (2026-11-17): the custom substrate blend is an ordered list of 1-5 grains with shares summing to 100.
// The two-grain fields of older saves / links / recipes read into a 1- or 2-entry list that draws the same.
import { describe, expect, it } from 'vitest';
import { blendLabel, blendWeights, blendZone } from '../src/art/placeholder';
import { MAX_GRAINS, addGrain, blendFrom, blendOrder, migrateBlend, normalizeShares, removeGrain, setShare } from '../src/scene/blend';
import { defaultScene } from '../src/scene/defaults';
import { bedOf } from '../src/scene/substrateCheck';
import { parseScene } from '../src/scene/validate';
import type { BlendGrain, SubstrateBlend } from '../src/scene/types';

const sum = (gs: BlendGrain[]) => gs.reduce((a, g) => a + g.share, 0);
const dflt = defaultScene().tanks[0].substrate.custom;
const five: SubstrateBlend = { mix: 0.5, grains: [
  { grain: 'sand', color: '#cdb994', share: 40 }, { grain: 'gravel', color: '#6f6556', share: 20 }, { grain: 'pebble', color: '#8d8173', share: 15 },
  { grain: 'mud', color: '#2f2620', share: 15 }, { grain: 'gravel', color: '#b5a58c', share: 10 }] };

describe('migrating the two-grain fields', () => {
  it('one grain: grain2 none -> a one-entry list at 100 %', () => {
    const b = migrateBlend({ grain: 'sand', color: '#CBB894', grain2: 'none', color2: '#6f6556', share: 30, mix: 0.5 }, dflt);
    expect(b).toEqual({ grains: [{ grain: 'sand', color: '#cbb894', share: 100 }], mix: 0.5 });
  });
  it('two grains: share is the second grain\'s % (the first gets the rest)', () => {
    const b = migrateBlend({ grain: 'pebble', color: '#8d8173', grain2: 'gravel', color2: '#b5a58c', share: 40, mix: 0.7 }, dflt);
    expect(b).toEqual({ grains: [{ grain: 'pebble', color: '#8d8173', share: 60 }, { grain: 'gravel', color: '#b5a58c', share: 40 }], mix: 0.7 });
    expect(b).toEqual(blendFrom('pebble', '#8d8173', 'gravel', '#b5a58c', 40, 0.7));
  });
  it('the old share range (5-95) and defaults hold; bad values fall back', () => {
    expect(migrateBlend({ grain: 'sand', color: '#cbb894', grain2: 'gravel', color2: '#000000', share: 99, mix: 3 }, dflt).grains.map(g => g.share)).toEqual([5, 95]);
    expect(migrateBlend(undefined, dflt)).toEqual(dflt);
    expect(migrateBlend({ grain: 'nonsense', color: 'red' }, dflt).grains[0]).toEqual(dflt.grains[0]);
  });
  it('a list is sanitised: at most 5, shares whole and summing to 100', () => {
    const b = migrateBlend({ grains: [...five.grains, ...five.grains], mix: 0.2 }, dflt);
    expect(b.grains).toHaveLength(MAX_GRAINS); expect(sum(b.grains)).toBe(100);
    expect(sum(migrateBlend({ grains: [{ grain: 'sand', color: '#cbb894', share: 0 }, { grain: 'gravel', color: '#111111', share: 0 }] }, dflt).grains)).toBe(100);
  });
  it('an old saved scene (fields only) loads into the list and round-trips', () => {
    const sc = defaultScene(), tk = sc.tanks[0] as unknown as { substrate: { type: string; custom: unknown } };
    tk.substrate.type = 'custom';
    tk.substrate.custom = { grain: 'sand', color: '#cbb894', grain2: 'gravel', color2: '#4a4034', share: 35, mix: 0.3 };
    const a = parseScene(JSON.parse(JSON.stringify(sc))).scene, c = a.tanks[0].substrate.custom;
    expect(c.grains.map(g => [g.grain, g.color, g.share])).toEqual([['sand', '#cbb894', 65], ['gravel', '#4a4034', 35]]);
    expect(parseScene(JSON.parse(JSON.stringify(a))).scene.tanks[0].substrate.custom).toEqual(c);
  });
});

describe('editing the list', () => {
  it('a share slider renormalizes the others and keeps the sum at 100', () => {
    for (let i = 0; i < 5; i++) for (const v of [0, 7, 33, 61, 100]) expect(sum(setShare(five.grains, i, v))).toBe(100);
    const g = setShare(five.grains, 0, 70); expect(g[0].share).toBe(70);
    expect(g[1].share / g[2].share).toBeCloseTo(20 / 15, 0); // the rest keep their proportions
  });
  it('add up to 5, remove down to 1', () => {
    let gs = blendFrom('sand', '#cbb894').grains;
    for (let i = 0; i < 8; i++) { gs = addGrain(gs); expect(sum(gs)).toBe(100); }
    expect(gs).toHaveLength(MAX_GRAINS);
    for (let i = 0; i < 8; i++) { gs = removeGrain(gs, 0); expect(sum(gs)).toBe(100); }
    expect(gs).toHaveLength(1); expect(gs[0].share).toBe(100);
  });
  it('normalizeShares rounds to whole numbers summing to the total', () => {
    expect(sum(normalizeShares([33.3, 33.3, 33.4].map(share => ({ grain: 'sand' as const, color: '#000000', share }))))).toBe(100);
  });
});

describe('drawing the list', () => {
  it('the label and the order', () => {
    expect(blendLabel(five)).toBe('Sand 40 % + gravel 20 % + pebbles 15 % + mud 15 % + gravel 10 %');
    expect(blendLabel(blendFrom('pebble', '#111111', 'gravel', '#222222', 40))).toBe('Pebbles 60 % + gravel 40 %');
    expect(blendOrder(five)[0].share).toBe(40); // 3+ grains: the largest share is the remainder
    expect(blendOrder(blendFrom('pebble', '#111111', 'gravel', '#222222', 70))[0].grain).toBe('pebble'); // two: as before
  });
  it('per-grain ratios sum to 1 and their floor-wide means follow the shares', () => {
    const z = blendZone(five), n = 60, mean = [0, 0, 0, 0, 0];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const w = blendWeights(five, i * 40, j * 40, z); expect(w.reduce((a, v) => a + v, 0)).toBeCloseTo(1, 9);
      w.forEach((v, k) => { mean[k] += v / (n * n); });
    }
    const ord = blendOrder(five);
    ord.forEach((g, k) => expect(Math.abs(mean[k] * 100 - g.share)).toBeLessThan(9)); // the others' sum may pass 1 in places and is scaled down
  });
  it('two grains draw as before: ratio of the second = old blendRatio', () => {
    const b = blendFrom('sand', '#c9b48a', 'gravel', '#3a342c', 30, 0.5), z = blendZone(b);
    const w = blendWeights(b, 123, 456, z); expect(w[0] + w[1]).toBeCloseTo(1, 12); expect(w[1]).toBeGreaterThan(0);
    expect(z.biases[1]).toBe(z.bias);
  });
  it('the bed (substrate check) is the coarsest grain with a quarter of the floor', () => {
    const S = defaultScene().tanks[0]; S.substrate.type = 'custom'; S.substrate.show = true;
    S.substrate.custom = five; expect(bedOf(S)!.grain).toBe('sand'); // pebbles are only 15 %
    S.substrate.custom = { ...five, grains: setShare(five.grains, 2, 30) }; expect(bedOf(S)!.grain).toBe('pebble');
  });
});
