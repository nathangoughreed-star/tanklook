import { describe, expect, it } from 'vitest';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { bareSetup } from '../src/scene/defaults';
import { OVERFLOW_PRODUCTS, SUMP_PRODUCTS, reefProduct } from '../src/data/gearCatalog';
import { optionCost, parseTech, sumpOf, withUnits, type TechSetup } from '../src/scene/tech';
import { setRowProduct } from '../src/scene/techEdit';
import { categories, categoryView, inUseItem } from '../src/shell/logic/equipment';
import { demandOf, defaultProfile } from '../src/demand';
import type { TankSetup } from '../src/scene/types';

// Lane PB2 (R100, 2026-11-17): overflow boxes and sump tanks as real catalogue products (data/gear/overflows.json, sumps.json).
const tank = (tech?: TechSetup): TankSetup => {
  const S = bareSetup();
  S.tank = tankFromModel(getTankModel('g75')!);
  S.water.on = true; S.water.level = 0.9; S.water.salt = true;
  if (tech) S.tech = tech;
  return S;
};
const sumpTech = (): TechSetup => withUnits({ rows: {} }, 'filter', [{ kind: 'sump' }]);

describe('PB2: the rows are real products', () => {
  it('every overflow box carries the maker figure, a page URL, a price and a date', () => {
    expect(OVERFLOW_PRODUCTS.length).toBeGreaterThanOrEqual(6);
    for (const p of OVERFLOW_PRODUCTS) {
      expect(p.ratedGph, p.id).toBeGreaterThan(0);
      expect(p.url, p.id).toMatch(/^https:\/\//);
      expect(p.priceUsd, p.id).toBeGreaterThan(0);
      expect(p.asOf, p.id).toMatch(/^\d{4}-\d\d-\d\d$/);
      expect(p.seller, p.id).toBeTruthy();
    }
  });
  it('every sump has outer dimensions, a price, a URL, and a missing volume is named', () => {
    expect(SUMP_PRODUCTS.length).toBeGreaterThanOrEqual(6);
    for (const p of SUMP_PRODUCTS) {
      expect(p.dimsIn.l * p.dimsIn.w * p.dimsIn.h, p.id).toBeGreaterThan(0);
      expect(p.url, p.id).toMatch(/^https:\/\//);
      expect(p.priceUsd, p.id).toBeGreaterThan(0);
      if (p.waterGal === undefined) expect(p.needSpec, p.id).toContain('waterGal');
    }
    expect(new Set([...OVERFLOW_PRODUCTS, ...SUMP_PRODUCTS].map(p => p.id)).size).toBe(OVERFLOW_PRODUCTS.length + SUMP_PRODUCTS.length);
  });
});

describe('PB2: the picker and the cost engine', () => {
  it('offers the two categories only under a sump', () => {
    expect(categories(tank()).map(c => c.id)).not.toContain('sump');
    const ids = categories(tank(sumpTech())).map(c => c.id);
    expect(ids).toContain('sump'); expect(ids).toContain('overflow');
  });
  it('a picked sump is its own size and price; a picked overflow box is bought on top of the plumbing', () => {
    const base = optionCost(tank(sumpTech()), 'filter', 'sump');
    const sp = SUMP_PRODUCTS.find(p => p.id === 'trigger-crystal-36')!, ov = OVERFLOW_PRODUCTS.find(p => p.id === 'eshopps-pf-1000')!;
    let S = tank(sumpTech());
    S.tech = setRowProduct(S, 'sump', sp.id);
    expect(sumpOf(S)!.L).toBe(Math.round(36 * 25.4));
    const withSump = optionCost(S, 'filter', 'sump');
    expect(withSump.parts.find(p => p.gear === 'sump')!.setup!.mode).toBeCloseTo(sp.priceUsd!, 2);
    S.tech = setRowProduct(S, 'overflow', ov.id);
    const both = optionCost(S, 'filter', 'sump');
    const plumb = (c: typeof both) => c.parts.find(p => p.gear === 'plumbing')!.setup!.mode;
    expect(plumb(both) - plumb(base)).toBeCloseTo(ov.priceUsd!, 2);
    expect(inUseItem(S, 'sump')).toBe(sp.id); expect(inUseItem(S, 'overflow')).toBe(ov.id);
  });
  it('the demand engine counts the picked products in the setup total', () => {
    const usd = (S: TankSetup) => demandOf(S, defaultProfile(), { now: Date.parse('2026-11-17') }).totals.setupUsd;
    const S = tank(sumpTech()), base = usd(S);
    S.tech = setRowProduct(S, 'overflow', 'eshopps-pf-1000');
    const withOv = usd(S);
    expect(withOv - base).toBeGreaterThan(100); expect(withOv - base).toBeLessThan(200); // $159.99 listed, cheaper-than-list rounding aside
    S.tech = setRowProduct(S, 'sump', 'trigger-platinum-39-v2');
    expect(usd(S) - withOv).toBeGreaterThan(400); // the $949.99 sump replaces a bare-glass sump of a few dozen dollars
  });
  it('lists the products with their rated figures and a fit against the return flow', () => {
    const S = tank(sumpTech());
    const ov = categoryView(S, 'overflow', 'in', { showAll: true });
    expect(ov.buy.length).toBe(OVERFLOW_PRODUCTS.length);
    expect(ov.buy.some(r => r.sub.includes('gph rated'))).toBe(true);
    const su = categoryView(S, 'sump', 'in', { showAll: true });
    expect(su.buy.some(r => r.price.startsWith('$'))).toBe(true);
  });
  it('a product only survives in saved tech under a sump', () => {
    const ok = parseTech({ rows: { filter: 'sump' }, products: { sump: 'trigger-crystal-36', overflow: 'eshopps-pf-1000' } });
    expect(ok?.products).toEqual({ sump: 'trigger-crystal-36', overflow: 'eshopps-pf-1000' });
    expect(parseTech({ rows: { filter: 'hob' }, products: { sump: 'trigger-crystal-36' } })?.products).toBeUndefined();
    expect(reefProduct('overflow', 'eshopps-pf-1000')?.id).toBe('eshopps-pf-1000');
  });
});
