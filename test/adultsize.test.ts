// 2026-10-21 (Nathan): animals are drawn at adult length by default, with only a few percent of natural spread; smaller sizes
// only when the user picks them (the New animal size slider). The pick screen and the editor then agree on space.
import { expect, it } from 'vitest';
import { rng } from '../src/art/paint';
import { randomSize } from '../src/scene/scatter';
import { getSpecies } from '../src/data/species';
import { litresPerAnimal, spaceOf, SPACE_PER_L } from '../src/scene/stocking';
import type { Fish } from '../src/scene/types';

const sizes = (id: string, pct: number) => {
  const sp = getSpecies(id)!, r = rng(5), out: number[] = [];
  for (let i = 0; i < 400; i++) { const f = { id: i, species: id } as Fish; randomSize(f, sp, pct, r); out.push((f.tl ?? sp.tl) / sp.tl); }
  return out;
};
it('default size centres on adult with a few percent spread and no giants', () => {
  const v = sizes('neon', 100), mean = v.reduce((a, b) => a + b, 0) / v.length;
  expect(mean).toBeGreaterThan(0.98); expect(mean).toBeLessThan(1.02);
  expect(Math.max(...v)).toBeLessThanOrEqual(1.07); expect(Math.min(...v)).toBeGreaterThan(0.85);
});
it('a juvenile size the user picks is honoured', () => {
  const v = sizes('neon', 50), mean = v.reduce((a, b) => a + b, 0) / v.length;
  expect(mean).toBeGreaterThan(0.48); expect(mean).toBeLessThan(0.52);
});
it('starter budget per animal is its space at full adult length', () => {
  const sp = getSpecies('neon')!;
  expect(litresPerAnimal(sp)).toBeGreaterThanOrEqual(spaceOf(sp, sp.tl) / SPACE_PER_L - 1e-9);
});
