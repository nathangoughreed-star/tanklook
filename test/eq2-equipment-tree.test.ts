// Lane EQ2 (2026-11-15; R58): Equipment as category -> kind -> type -> size band. Every product lands once; the tank's band sorts first.
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { categories, categoryGroups, categoryView, buyTree } from '../src/shell/logic/equipment';
import { FILTER_PRODUCTS, HEATER_PRODUCTS } from '../src/data/gearCatalog';

const kindsOf = (S: Store['tank']) => categories(S).map(c => c.id);

describe('Equipment tree', () => {
  it("shows Nathan's five categories in order, each kind once", () => {
    const g = categoryGroups(new Store().tank);
    expect(g.slice(0, 3).map(x => x.label)).toEqual(['Filtration & Water Clarity', 'Temperature Control', 'Lighting']);
    expect(g[0].kinds.map(k => k.id)).toEqual(expect.arrayContaining(['filter']));
    const all = g.flatMap(x => x.kinds.map(k => k.id));
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(kindsOf(new Store().tank).sort());
    expect(g.every(x => x.kinds.every(k => k.status.length > 0))).toBe(true);
  });
  for (const gallons of ['default', 'bigger']) {
    it(`every product lands in exactly one type and band (${gallons} tank), and the tank's band is first`, () => {
      const st = new Store(); if (gallons === 'bigger') st.edit(s => { s.tank.L = 1200; s.tank.D = 450; s.tank.H = 500; });
      const S = st.tank;
      for (const cat of kindsOf(S)) {
        const v = categoryView(S, cat, 'in', { showAll: true }), tree = buyTree(S, cat, 'in');
        const items = tree.flatMap(t => t.bands.flatMap(b => b.rows.map(r => r.item)));
        expect(items.length, cat).toBe(v.buy.length);
        expect(new Set(items).size, cat).toBe(items.length);
        for (const t of tree) {
          expect(t.count).toBe(t.bands.reduce((n, b) => n + b.rows.length, 0));
          expect(t.bands.every(b => b.rows.every(r => r.type === t.label && r.band === b.label)), `${cat}/${t.label}`).toBe(true);
          const i = t.bands.findIndex(b => b.hasTank);
          if (i >= 0) expect(i, `${cat}/${t.label}: tank band first`).toBe(0);
        }
      }
    });
  }
  it('filters and heaters are typed and banded from catalogue data', () => {
    const S = new Store().tank, f = buyTree(S, 'filter', 'in'), h = buyTree(S, 'heater', 'in');
    const rows = (t: ReturnType<typeof buyTree>) => t.flatMap(x => x.bands.flatMap(b => b.rows)).filter(r => r.item !== 'generic' && r.type !== 'Any brand');
    expect(rows(f).length).toBe(FILTER_PRODUCTS.length);
    expect(rows(h).length).toBe(HEATER_PRODUCTS.length);
    expect(f.some(t => /canister/i.test(t.label))).toBe(true);
    expect(f.flatMap(t => t.bands).some(b => /gal/.test(b.label))).toBe(true);
    expect(h.flatMap(t => t.bands).some(b => / W/.test(b.label))).toBe(true);
  });
  it('a 30-gal-class tank puts the 20-40 gal filter band first', () => {
    const st = new Store(); st.edit(s => { s.tank.L = 914; s.tank.D = 305; s.tank.H = 305; });
    const t = buyTree(st.tank, 'filter', 'in');
    const first = t.filter(x => x.bands.some(b => b.hasTank)).map(x => x.bands[0].label);
    expect(first.length).toBeGreaterThan(0);
    expect(new Set(first)).toEqual(new Set(['20-40 gal']));
  });
});
