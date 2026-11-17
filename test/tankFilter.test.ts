// Lane TP1 (R109): the commercial picker's filters, sort, count and remembered state.
import { describe, expect, it } from 'vitest';
import { emptyScene } from '../src/scene/defaults';
import { commercialRows } from '../src/shell/logic/tank';
import { activeCount, factsOf, freshFilter, loadFilter, saveFilter, tileOf, type TankFilter } from '../src/shell/logic/tankFilter';

const S = emptyScene().tanks[0];
const run = (patch: Partial<TankFilter> = {}) => commercialRows(S, 'in', { f: { ...freshFilter(), ...patch } });
const all = run();
const facts = (r: (typeof all.rows)[number]) => factsOf(r.opt!);

describe('tank picker filters (TP1)', () => {
  it('no filter shows every tank and the count is the total', () => {
    expect(all.rows.length).toBe(all.total);
    expect(all.total).toBeGreaterThan(700);
  });
  it('capacity range', () => {
    const r = run({ gal: [20, 40] });
    expect(r.rows.length).toBeGreaterThan(0); expect(r.rows.length).toBeLessThan(all.total);
    expect(r.rows.every(x => facts(x).gal >= 20 && facts(x).gal <= 40)).toBe(true);
    expect(run({ gal: [null, 5] }).rows.every(x => facts(x).gal <= 5)).toBe(true);
  });
  it('length, depth and height ranges', () => {
    expect(run({ L: [46, 50] }).rows.every(x => facts(x).L >= 46 - 1e-6 && facts(x).L <= 50 + 1e-6)).toBe(true);
    expect(run({ D: [null, 14] }).rows.every(x => facts(x).D <= 14 + 1e-6)).toBe(true);
    expect(run({ H: [24, null] }).rows.every(x => facts(x).H >= 24 - 1e-6)).toBe(true);
    expect(run({ L: [46, 50] }).rows.length).toBeGreaterThan(0);
  });
  it('price range uses the shown (sale) price and drops tanks with no known price', () => {
    const r = run({ price: [50, 200] });
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.every(x => facts(x).price != null && facts(x).price! >= 50 && facts(x).price! <= 200)).toBe(true);
  });
  it('rimmed and rimless split the list', () => {
    const a = run({ rim: 'rimmed' }), b = run({ rim: 'rimless' });
    expect(a.rows.length + b.rows.length).toBe(all.total);
    expect(a.rows.every(x => !facts(x).rimless)).toBe(true); expect(b.rows.every(x => facts(x).rimless)).toBe(true);
    expect(a.rows.length).toBeGreaterThan(0); expect(b.rows.length).toBeGreaterThan(0);
  });
  it('glass vs acrylic', () => {
    const ac = run({ mat: 'acrylic' }), gl = run({ mat: 'glass' });
    expect(ac.rows.length).toBeGreaterThan(0); expect(ac.rows.length + gl.rows.length).toBe(all.total);
    expect(ac.rows.every(x => facts(x).acrylic)).toBe(true);
  });
  it('shape', () => {
    const bow = run({ shapes: ['bow'] }), cube = run({ shapes: ['cube'] });
    expect(bow.rows.length).toBeGreaterThan(0); expect(bow.rows.every(x => facts(x).shape === 'bow')).toBe(true);
    expect(cube.rows.length).toBeGreaterThan(0); expect(cube.rows.every(x => facts(x).shape === 'cube')).toBe(true);
    expect(run({ shapes: ['bow', 'cube'] }).rows.length).toBe(bow.rows.length + cube.rows.length);
  });
  it('brand and the brand list', () => {
    expect(all.brands[0][1]).toBeGreaterThanOrEqual(all.brands[1][1]);
    const name = all.brands[0][0], r = run({ brands: [name] });
    expect(r.rows.length).toBe(all.brands[0][1]); expect(r.rows.every(x => x.opt!.v?.brand === name)).toBe(true);
  });
  it('kits only vs tank only', () => {
    const k = run({ build: 'kit' }), t = run({ build: 'tank' });
    expect(k.rows.length).toBeGreaterThan(0); expect(k.rows.length + t.rows.length).toBe(all.total);
    expect(k.rows.every(x => facts(x).kit)).toBe(true);
  });
  it('filters combine (every one must hold)', () => {
    const f: Partial<TankFilter> = { gal: [20, 75], rim: 'rimless', build: 'tank', price: [null, 1500], L: [30, null] };
    const r = run(f);
    expect(r.rows.length).toBeGreaterThan(0); expect(r.rows.length).toBeLessThan(run({ gal: [20, 75] }).rows.length);
    expect(r.rows.every(x => { const q = facts(x); return q.gal >= 20 && q.gal <= 75 && q.rimless && !q.kit && q.price! <= 1500 && q.L >= 30 - 1e-6; })).toBe(true);
    expect(run({ ...f, shapes: ['bow'], brands: ['Nobody'] }).rows.length).toBe(0);
  });
  it('combines with the existing size chips, search and On sale', () => {
    const base = commercialRows(S, 'in', { chips: new Set(['20-40'] as const), f: { ...freshFilter(), rim: 'rimless' } });
    expect(base.rows.every(x => x.opt!.gal >= 20 && x.opt!.gal < 40 && facts(x).rimless)).toBe(true);
    const sale = commercialRows(S, 'in', { sale: true, f: freshFilter() });
    expect(sale.rows.every(x => x.sale)).toBe(true);
  });
  it('sort by price, gallons, length and name', () => {
    const price = run({ sort: 'price-asc' }).rows.map(x => facts(x).price);
    const known = price.filter((p): p is number => p != null);
    expect(known).toEqual([...known].sort((a, b) => a - b));
    expect(price.slice(known.length).every(p => p == null)).toBe(true); // unpriced last
    const desc = run({ sort: 'price-desc' }).rows.map(x => facts(x).price).filter((p): p is number => p != null);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    const g = run({ sort: 'gal-desc' }).rows.map(x => facts(x).gal); expect(g).toEqual([...g].sort((a, b) => b - a));
    const l = run({ sort: 'len-asc' }).rows.map(x => facts(x).L); expect(l).toEqual([...l].sort((a, b) => a - b));
    const n = run({ sort: 'name' }).rows.map(x => x.name); expect(n).toEqual([...n].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })));
  });
  it('activeCount counts set filters, not sort', () => {
    expect(activeCount(freshFilter())).toBe(0);
    expect(activeCount({ ...freshFilter(), sort: 'name' })).toBe(0);
    expect(activeCount({ ...freshFilter(), gal: [10, null], rim: 'rimless', brands: ['A', 'B'] })).toBe(3);
  });
  it('remembers the last filters, and survives bad or blocked storage', () => {
    const mem = new Map<string, string>(), kv = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const f = { ...freshFilter(), gal: [10, 30] as [number, number], rim: 'rimless' as const, shapes: ['cube' as const], sort: 'price-asc' as const };
    saveFilter(f, kv); expect(loadFilter(kv)).toEqual(f);
    mem.set([...mem.keys()][0], '{not json'); expect(loadFilter(kv)).toEqual(freshFilter());
    expect(() => saveFilter(f, { getItem: () => null, setItem: () => { throw new Error('blocked'); } })).not.toThrow();
    expect(loadFilter({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toEqual(freshFilter());
  });
  it('every row has a tile key, and many rows share one', () => {
    const keys = new Set(all.rows.map(r => r.tile));
    expect(all.rows.every(r => !!r.tile)).toBe(true);
    expect(keys.size).toBeLessThan(all.total / 2);
    expect(tileOf(all.rows[0].opt!).key).toBe(all.rows[0].tile);
  });
});
