// Lane GM1 (2026-10-29): the gear foundation changes no number. The per-type catalogue merges to the old shape, and
// statsOf(product) equals the product's own fields while statsOf(generic copy) equals it too (the design's parity rule).
import { describe, expect, it } from 'vitest';
import { gearCatalog } from '../src/data/gear';
import { FILTER_PRODUCTS, HEATER_PRODUCTS, LIGHT_PRODUCTS, PUMP_PRODUCTS, SKIMMER_PRODUCTS, UV_PRODUCTS, CO2_PRODUCTS, ATO_PRODUCTS, CHILLER_PRODUCTS } from '../src/data/gearCatalog';
import { GEAR_CLASS, GEAR_TYPES, filterRef, heaterRef, lightRef, productStats, statsOf, type GearType } from '../src/scene/gearSpec';

describe('gear catalogue split per type', () => {
  it('keeps the old key order and counts', () => {
    expect(Object.keys(gearCatalog)).toEqual(['asOf', 'note', 'skimmers', 'uv', 'co2', 'ato', 'chillers', 'heaters', 'filters', 'lights', 'pumps']);
    expect([gearCatalog.skimmers, gearCatalog.uv, gearCatalog.co2, gearCatalog.ato, gearCatalog.chillers, gearCatalog.heaters, gearCatalog.filters, gearCatalog.lights, gearCatalog.pumps].map(a => a.length))
      .toEqual([12, 9, 8, 6, 7, 40, 79, 35, 34]);
  });
  it('the wrappers expose the same arrays', () => {
    expect(HEATER_PRODUCTS).toBe(gearCatalog.heaters);
    expect(FILTER_PRODUCTS).toBe(gearCatalog.filters);
    expect(LIGHT_PRODUCTS).toBe(gearCatalog.lights);
    expect(PUMP_PRODUCTS).toBe(gearCatalog.pumps);
    expect(SKIMMER_PRODUCTS.length + UV_PRODUCTS.length + CO2_PRODUCTS.length + ATO_PRODUCTS.length + CHILLER_PRODUCTS.length).toBe(42);
  });
});

describe('statsOf parity', () => {
  it('every library type is class library', () => { for (const t of GEAR_TYPES) expect(GEAR_CLASS[t]).toBe('library'); });
  const all: [GearType, { id: string }[]][] = [
    ['heater', HEATER_PRODUCTS], ['filter', FILTER_PRODUCTS], ['light', LIGHT_PRODUCTS], ['powerhead', PUMP_PRODUCTS.filter(p => p.kind !== 'air')],
    ['airpump', PUMP_PRODUCTS.filter(p => p.kind === 'air')], ['skimmer', SKIMMER_PRODUCTS], ['uv', UV_PRODUCTS], ['co2', CO2_PRODUCTS], ['ato', ATO_PRODUCTS], ['chiller', CHILLER_PRODUCTS],
  ];
  for (const [type, list] of all) {
    it(`${type}: product stats equal the generic copy of them`, () => {
      for (const p of list) {
        const locked = productStats(type, p.id);
        expect(locked, p.id).toBeDefined();
        expect(statsOf({ type, product: p.id })).toEqual(locked);
        // "Tune as generic": the same stats with the product dropped give the same block
        expect(statsOf({ type, stats: locked as never })).toEqual(locked);
      }
    });
  }
  it('heater numbers are the product watts', () => { for (const h of HEATER_PRODUCTS) expect(statsOf({ type: 'heater', product: h.id }).watts).toBe(h.watts); });
  it('light numbers are the product watts / kelvin / par', () => {
    for (const l of LIGHT_PRODUCTS) { const s = statsOf({ type: 'light', product: l.id }); expect(s.watts).toBe(l.watts); expect(s.kelvin).toBe(l.kelvin); expect(s.par).toBe(l.par); }
  });
  it('an unknown product falls back to the generic', () => { expect(statsOf({ type: 'heater', product: 'nope', stats: { watts: 75 } }).watts).toBe(75); });
  it('adapters read the old fields', () => {
    expect(statsOf(heaterRef({ w: 100 })).watts).toBe(100);
    expect(statsOf(heaterRef({ product: HEATER_PRODUCTS[0].id })).watts).toBe(HEATER_PRODUCTS[0].watts);
    expect(statsOf(filterRef({ kind: 'hob', model: 'x' })).kind).toBe('hob');
    expect(statsOf(lightRef({ watts: 30, kelvin: 6500 }))).toEqual({ watts: 30, kelvin: 6500 });
  });
});
