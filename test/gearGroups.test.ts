// Lane GG1: heaters / filters grouped by the maker's rated range, lights by the tank length they fit (pucks apart).
import { describe, expect, it } from 'vitest';
import { FILTER_PRODUCTS, HEATER_PRODUCTS, LIGHT_PRODUCTS, lightsFor, productName } from '../src/data/gearCatalog';
import { PUCK_GROUP, PUCK_MOUNTS, HANGING_GROUP, lightGroups, ratedFits, ratedGroups, ratedLabel } from '../src/ui/gearGroups';

const byW = (a: { watts: number }, b: { watts: number }) => a.watts - b.watts;

describe('ratedLabel', () => {
  it('words a range as the maker states it', () => {
    expect(ratedLabel({ galMin: 30, galMax: 40 })).toBe('Rated for 30-40 gal');
    expect(ratedLabel({ galMin: 0, galMax: 250 })).toBe('Rated for up to 250 gal');
    expect(ratedLabel({ galMax: 20 })).toBe('Rated for up to 20 gal');
    expect(ratedLabel({ galMin: 40 })).toBe('Rated for 40+ gal');
    expect(ratedLabel({ galMin: 5, galMax: 5.5 })).toBe('Rated for 5-5.5 gal');
    expect(ratedLabel({})).toBe('No rated range listed');
  });
  it('says so when the range was estimated', () => {
    expect(ratedLabel({ galMin: 5, galMax: 15, est: ['galMin'] })).toBe('Rated for 5-15 gal (estimated)');
    expect(ratedLabel({ galMin: 5, galMax: 15, est: ['priceUsd', 'diaMm'] })).toBe('Rated for 5-15 gal');
  });
});

describe('ratedGroups', () => {
  const items = [
    { id: 'a', watts: 100, galMin: 20, galMax: 30 }, { id: 'b', watts: 50, galMin: 5, galMax: 15 }, { id: 'c', watts: 75, galMin: 20, galMax: 30 },
    { id: 'd', watts: 300, galMin: 40, galMax: 75 }, { id: 'e', watts: 25 }, { id: 'f', watts: 10, galMin: 0, galMax: 1 }, { id: 'g', watts: 60, galMin: 5, galMax: 15, est: ['galMax'] },
  ];
  const g = ratedGroups(items, 29, byW);
  it('orders ranges small to large and puts "no range" last', () => {
    expect(g.map(x => x.id)).toEqual(['Rated for up to 1 gal', 'Rated for 5-15 gal', 'Rated for 5-15 gal (estimated)', 'Rated for 20-30 gal', 'Rated for 40-75 gal', 'No rated range listed']);
  });
  it('orders inside a group by watts', () => {
    expect(g.find(x => x.id === 'Rated for 20-30 gal')!.items.map(p => p.id)).toEqual(['c', 'a']);
  });
  it('marks the range that holds the tank and hides none', () => {
    expect(g.filter(x => x.fits).map(x => x.label)).toEqual(['Rated for 20-30 gal · fits your 29 gal']);
    expect(g.flatMap(x => x.items)).toHaveLength(items.length);
    expect(ratedFits({}, 29)).toBeUndefined();
    expect(ratedFits({ galMin: 20, galMax: 30 }, 30.4)).toBe(true);   // a tank reads a little over its nominal size
    expect(ratedFits({ galMin: 20, galMax: 30 }, 33)).toBe(false);
  });
});

describe('catalogue heaters and filters', () => {
  it('every heater lands in exactly one group, ranges ascending', () => {
    for (const gal of [5, 29, 55, 120]) {
      const gs = ratedGroups(HEATER_PRODUCTS, gal, byW);
      expect(gs.flatMap(x => x.items).map(p => p.id).sort()).toEqual(HEATER_PRODUCTS.map(p => p.id).sort());
      expect(new Set(gs.map(x => x.id)).size).toBe(gs.length);
      const tops = gs.filter(x => x.id !== 'No rated range listed').map(x => x.items[0].galMax ?? Infinity);
      expect(tops).toEqual([...tops].sort((a, b) => a - b));
    }
  });
  it('a 29 gal tank marks groups whose range holds it, never one that does not', () => {
    for (const x of ratedGroups(FILTER_PRODUCTS, 29, (a, b) => (a.gph ?? 0) - (b.gph ?? 0))) {
      for (const p of x.items) expect(ratedFits(p, 29) ?? false).toBe(x.fits);
    }
  });
  it('filters of one kind group the same way', () => {
    const gs = ratedGroups(FILTER_PRODUCTS.filter(f => f.kind === 'sponge'), 20, (a, b) => productName(a).localeCompare(productName(b)));
    expect(gs.length).toBeGreaterThan(1);
    expect(gs.every(x => x.label.startsWith('Rated for') || x.label === 'No rated range listed')).toBe(true);
  });
});

describe('lightGroups', () => {
  const gs = lightGroups(LIGHT_PRODUCTS);
  const lengthGroups = gs.filter(x => x.id !== 'puck' && x.id !== 'hanging');
  it('puts pucks (gooseneck, submersible) in their own group, after the length order', () => {
    expect(PUCK_MOUNTS).toEqual(['gooseneck', 'submersible']);
    const puck = gs.find(x => x.id === 'puck')!;
    expect(puck.label).toBe(PUCK_GROUP);
    expect(puck.items.every(p => PUCK_MOUNTS.includes(p.mount))).toBe(true);
    expect(lengthGroups.flatMap(x => x.items).some(p => PUCK_MOUNTS.includes(p.mount))).toBe(false);
    expect(gs.indexOf(puck)).toBeGreaterThan(gs.indexOf(lengthGroups[lengthGroups.length - 1]));
  });
  it('hanging reef fixtures are their own last group', () => {
    expect(gs[gs.length - 1].label).toBe(HANGING_GROUP);
    expect(gs[gs.length - 1].items.every(p => p.mount === 'hanging')).toBe(true);
  });
  it('orders the rest by the inch span they fit, shortest tanks first', () => {
    const spans = lengthGroups.map(x => x.label.match(/Fits (\d+)-(\d+) in tanks/)!.slice(1).map(Number));
    expect(spans.length).toBeGreaterThan(3);
    for (let i = 1; i < spans.length; i++) expect(spans[i][0] > spans[i - 1][0] || (spans[i][0] === spans[i - 1][0] && spans[i][1] >= spans[i - 1][1])).toBe(true);
    expect(lengthGroups[0].label).toBe('Fits 10-13 in tanks');
  });
  it('no light is dropped', () => {
    expect(gs.flatMap(x => x.items)).toHaveLength(LIGHT_PRODUCTS.length);
  });
  it('a 36 in tank sees only lights that fit it, still grouped', () => {
    const fit = lightsFor(36 * 25.4), g = lightGroups(fit);
    expect(g.flatMap(x => x.items).map(p => p.id).sort()).toEqual(fit.map(p => p.id).sort());
    for (const x of g) if (x.id !== 'puck' && x.id !== 'hanging') for (const p of x.items) expect(36 * 25.4 >= p.fitMinMm && 36 * 25.4 <= p.fitMaxMm).toBe(true);
  });
});
