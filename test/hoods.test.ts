// Lane HD1 (Nathan 2026-11-13): a hood is one product with its light built in, offered only where a product fits.
import { describe, expect, it } from 'vitest';
import { HOOD_PRODUCTS, hoodExists, hoodsFor, hoodOf, NO_HOOD_NOTE } from '../src/data/hoods';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { defaultProfile, demandOf } from '../src/demand';
import { bareSetup } from '../src/scene/defaults';
import { setLid, lidLocked } from '../src/scene/tankEdit';
import { wattsOf } from '../src/scene/lightout';
import type { TankSetup } from '../src/scene/types';

const NOW = Date.parse('2026-11-13');
const setup = (id: string, lid: TankSetup['lid']) => { const S = bareSetup(); S.tank = tankFromModel(getTankModel(id)!); S.water.on = true; S.lid = lid; return S; };
const custom = (lid: TankSetup['lid']) => { const S = bareSetup(); S.tank = { ...tankFromModel(getTankModel('g20l')!), L: 37 * 25.4, D: 15 * 25.4 }; S.water.on = true; S.lid = lid; return S; };

describe('hood products', () => {
  it('every product has fits, a price with source, and a light type and wattage', () => {
    expect(HOOD_PRODUCTS.length).toBeGreaterThanOrEqual(6);
    for (const h of HOOD_PRODUCTS) {
      expect(h.fitsGal.length).toBeGreaterThan(0); expect(h.lengthIn).toBeGreaterThan(0); expect(h.priceUsd).toBeGreaterThan(0);
      expect(h.url).toMatch(/^https:/); expect(h.asOf).toMatch(/^\d{4}-\d\d-\d\d$/); expect(['led', 'tube']).toContain(h.light.type); expect(h.light.watts).toBeGreaterThan(0);
    }
  });
  it('a 20 gal long has hoods; a custom 37 x 15 in tank, a 55 and a 75 have none', () => {
    expect(hoodsFor(setup('g20l', 'hood').tank).length).toBeGreaterThan(0);
    expect(hoodExists(custom('hood').tank)).toBe(false);
    expect(hoodExists(setup('g55', 'hood').tank)).toBe(false); expect(hoodExists(setup('g75', 'hood').tank)).toBe(false);
    expect(lidLocked(custom('open').tank, false, 'hood')).toBe(true); expect(lidLocked(setup('g20l', 'open').tank, false, 'hood')).toBe(false);
  });
});

describe('a hood is one line item with its light', () => {
  const D = (S: TankSetup) => demandOf(S, defaultProfile(), { now: NOW });
  it('20 gal long with a hood: one hood row, no separate light row, its wattage drives the light model and power', () => {
    const S = setup('g20l', 'hood'); setLid(S, 'hood'); const h = hoodOf(S)!;
    expect(wattsOf(S)).toBe(h.light.watts); expect(S.hoodProduct).toBe(h.id);
    const d = D(S);
    const lid = d.items.filter(i => i.key === 'lid'); expect(lid).toHaveLength(1); expect(lid[0].label).toMatch(/^Hood with light/);
    expect(d.items.some(i => i.key === 'light')).toBe(false);
    expect(lid[0].kwhMo ?? 0).toBeGreaterThan(0); // the hood's watts are the power draw
    expect(d.warnings).not.toContain(NO_HOOD_NOTE);
  });
  it('legacy scene (hood, no hoodProduct, a 30 W light): the engine still prices one hood and uses its watts', () => {
    const S = setup('g20l', 'hood'); S.light = { ...S.light, type: 'led', tech: 'led-white', watts: 30 };
    const d = D(S); expect(d.items.filter(i => i.key === 'lid')).toHaveLength(1); expect(d.items.some(i => i.key === 'light')).toBe(false);
  });
  it('a hood on a tank no product fits: kept in the scene, priced as a glass lid plus the light they had, with the note', () => {
    const S = custom('hood'); S.light = { ...S.light, type: 'led', tech: 'led-white', watts: 30 };
    const d = D(S);
    expect(S.lid).toBe('hood'); expect(d.warnings).toContain(NO_HOOD_NOTE);
    expect(d.items.find(i => i.key === 'lid')!.label).toMatch(/glass/); expect(d.items.some(i => i.key === 'light')).toBe(true);
  });
});
