// Lane EQ2 (R61, 2026-11-15): every catalogue product with a 3D model has a baked picture in public/gallery/gear/, generic models share one.
import { describe, expect, it } from 'vitest';
import { FILTER_PRODUCTS, HEATER_PRODUCTS, LIGHT_PRODUCTS } from '../src/data/gearCatalog';
import { allArt, artOf } from '../src/shell/logic/gearArt';
import { GENERIC } from '../src/scene/gearOwn';

const BAKED = new Set(Object.keys(import.meta.glob('../public/gallery/gear/*.webp')).map(f => f.replace(/^.*\//, '').replace(/\.webp$/, '')));
describe('gear pictures', () => {
  it('filters, heaters and lights each get their own picture', () => {
    for (const p of FILTER_PRODUCTS) expect(artOf('filter', p.id)?.stem, p.id).toBe(p.id);
    for (const p of HEATER_PRODUCTS) expect(artOf('heater', p.id)?.stem, p.id).toBe(p.id);
    for (const p of LIGHT_PRODUCTS) expect(artOf('light', p.id)?.stem).toBe(p.id);
  });
  it('the generic row has no picture (it keeps the icon)', () => { expect(artOf('filter', GENERIC)).toBeUndefined(); });
  it('every picture the catalogue needs is baked as a webp', () => {
    const stems = [...allArt().keys()], missing = stems.filter(s => !BAKED.has(s));
    expect(stems.length).toBeGreaterThan(100);
    expect(missing).toEqual([]);
  });
  it('products sharing a generic model share one picture', () => {
    const stems = [...allArt().keys()];
    expect(stems.filter(s => s.startsWith('generic-')).length).toBeGreaterThan(0);
    expect(new Set(stems).size).toBe(stems.length);
  });
});
