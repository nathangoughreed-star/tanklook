import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { optionCost, parseTech, reefChecks, rowProduct, techOf, techParts, techRisk, withChoice, type TechSetup } from '../src/scene/tech';
import { ATO_PRODUCTS, CHILLER_PRODUCTS, CO2_PRODUCTS, REEF_ROWS, SKIMMER_PRODUCTS, UV_PRODUCTS, reefOptionProducts, skimmerSuitsGal } from '../src/data/gearCatalog';
import type { TankSetup } from '../src/scene/types';

const tankOf = (id: string) => parseScene(SCENES[id]).scene.tanks[0];
/** A tank of the planted example, resized (mm), no animals, with its tech made explicit. */
function sized(L: number, D: number, H: number, rows: Record<string, string> = {}, products?: Record<string, string>, extra: Partial<TechSetup> = {}): TankSetup {
  const S = structuredClone(tankOf('planted'));
  S.tank = { ...S.tank, L, D, H }; S.fish = [];
  delete S.tech;
  const t = techOf(S);
  S.tech = { ...t, rows: { ...t.rows, ...rows }, ...(products ? { products } : {}), ...extra };
  return S;
}
const G20 = () => ({ L: 762, D: 305, H: 305 }), G75 = () => ({ L: 1219, D: 457, H: 533 });

describe('reef and planted gear catalogue (lane GX)', () => {
  it('about 35 products, each with a real https source URL, a price and a date, and a unique id', () => {
    const all = Object.values(REEF_ROWS).flat(), ids = new Set<string>();
    expect(SKIMMER_PRODUCTS.length + UV_PRODUCTS.length + CO2_PRODUCTS.length + ATO_PRODUCTS.length + CHILLER_PRODUCTS.length).toBeGreaterThanOrEqual(35);
    for (const p of new Set(all)) { expect(ids.has(p.id)).toBe(false); ids.add(p.id); expect(p.url).toMatch(/^https:\/\/\S+$/); expect(p.priceUsd).toBeGreaterThan(0); expect(p.asOf).toMatch(/^2026-10-(27|29)$/); }
  });
  it('a protein skimmer is rated for 1.5-2 times its real tank; a surface skimmer for its tank', () => {
    const m130 = SKIMMER_PRODUCTS.find(p => p.id === 'magtool-n130plus')!, oase = SKIMMER_PRODUCTS.find(p => p.id === 'oase-crystalskim-350')!;
    expect(skimmerSuitsGal(m130)).toBeGreaterThan(135 / 2); expect(skimmerSuitsGal(m130)).toBeLessThan(135 / 1.5);
    expect(skimmerSuitsGal(oase)).toBe(92);
    expect(skimmerSuitsGal(SKIMMER_PRODUCTS.find(p => p.id === 'magtool-n100plus')!)).toBeUndefined(); // no rating on the listing: not invented
  });
  it('each option offers only its own kind of product', () => {
    expect(reefOptionProducts('skimmer', 'hob').every(p => (p as { kind: string }).kind === 'hob')).toBe(true);
    expect(reefOptionProducts('skimmer', 'sump').every(p => (p as { kind: string }).kind === 'sump')).toBe(true);
    expect(reefOptionProducts('co2', 'cartridge').length).toBe(4);
    expect(reefOptionProducts('co2', 'diy').length).toBe(2);
    expect(reefOptionProducts('chiller', 'fan').length).toBe(2);
    expect(reefOptionProducts('co2', 'liquid')).toEqual([]);
  });
});

describe('picking a product (lane GX)', () => {
  it('no products: the tech and its costs are exactly as before', () => {
    const a = sized(762, 305, 305, { uv: 'uv' }), b = sized(762, 305, 305, { uv: 'uv' }, {});
    delete b.tech!.products;
    expect(optionCost(a, 'uv', 'uv')).toEqual(optionCost(b, 'uv', 'uv'));
  });
  it('a UV product prices at its listing and runs at its watts', () => {
    const S = sized(762, 305, 305, { uv: 'uv' }, { uv: 'uv-13w-clarifier' }), c = optionCost(S, 'uv', 'uv');
    expect(c.setup.mode).toBeCloseTo(19.99, 1); expect(c.parts[0].watts).toBe(13); expect(c.est).toBe(false);
    expect(techParts(S).find(p => p.gear === 'uv')?.product).toBe('uv-13w-clarifier');
  });
  it('a CO2 regulator is a floor price (the cylinder is extra), a cartridge kit is priced from its listing', () => {
    const S = sized(762, 305, 305, { co2: 'pressurized' }, { co2: 'fzone-cga320-dual' });
    const c = optionCost(S, 'co2', 'pressurized');
    expect(c.parts.find(p => p.gear === 'co2kit')?.setup?.mode).toBeCloseTo(135.99, 1); expect(c.est).toBe(true);
    expect(reefChecks(S).some(k => k.row === 'co2' && /cylinder/.test(k.text))).toBe(true);
    const K = sized(762, 305, 305, { co2: 'cartridge' }, { co2: 'fzone-desktop-45g' });
    expect(optionCost(K, 'co2', 'cartridge').parts.find(p => p.gear === 'co2cart')?.setup?.mode).toBeCloseTo(47.99, 1);
  });
  it('changing the option drops the product; a saved product of another option is ignored on load', () => {
    const S = sized(762, 305, 305, { uv: 'uv' }, { uv: 'uv-13w-clarifier' });
    expect(withChoice(S, 'uv', 'none').products).toBeUndefined();
    const t = parseTech({ rows: { co2: 'cartridge' }, products: { co2: 'fzone-cga320-dual', uv: 'uv-13w-clarifier', nope: 'x' } });
    expect(t?.products).toBeUndefined();
    expect(parseTech({ rows: { co2: 'pressurized' }, products: { co2: 'fzone-cga320-dual' } })?.products).toEqual({ co2: 'fzone-cga320-dual' });
    expect(rowProduct({ rows: { co2: 'cartridge' }, products: { co2: 'fzone-cga320-dual' } }, 'co2')).toBeUndefined();
  });
});

describe('under-sized warnings (lane GX)', () => {
  it('a skimmer too small for the water warns, in real-tank terms', () => {
    const big = sized(G75().L, G75().D, G75().H, { filter: 'hob', skimmer: 'hob' }, { skimmer: 'coralife-biocube' }); // 75 gal on a 32 gal rating
    const w = reefChecks(big).filter(k => k.row === 'skimmer' && k.level === 'warn');
    expect(w.length).toBe(1); expect(w[0].text).toMatch(/rated for 32 gal.*about 18 gal of real tank/);
    expect(reefChecks(sized(G20().L, G20().D, G20().H, { skimmer: 'hob' }, { skimmer: 'macroaqua-m50' })).filter(k => k.level === 'warn')).toEqual([]);
  });
  it('a chiller fan that cannot hold the room warns; a compressor outside its gallons warns', () => {
    const hot = sized(G20().L, G20().D, G20().H, { chiller: 'fan' }, { chiller: 'aquasmith-fan' }, { roomC: 32, targetC: 22 });
    expect(reefChecks(hot).some(k => k.level === 'warn' && /evaporation will not hold/.test(k.text))).toBe(true);
    const mild = sized(G20().L, G20().D, G20().H, { chiller: 'fan' }, { chiller: 'aquasmith-fan' }, { roomC: 24, targetC: 22 });
    expect(reefChecks(mild).filter(k => k.level === 'warn')).toEqual([]);
    const small = sized(G75().L, G75().D, G75().H, { chiller: 'chiller' }, { chiller: 'chiller-110-42gal-b' }, { roomC: 25, targetC: 24 });
    expect(reefChecks(small).some(k => k.level === 'warn' && /for 42 gal/.test(k.text))).toBe(true);
  });
  it('an ATO whose listing gives no sensor count is noted, not judged; the risk moves only for a known single sensor', () => {
    const S = sized(G20().L, G20().D, G20().H, { ato: 'ato' }, { ato: 'ato-generic-qst' });
    expect(reefChecks(S).some(k => k.row === 'ato' && k.level === 'note')).toBe(true);
    expect(techRisk(S)).toBe(techRisk({ ...S, tech: { ...S.tech!, products: undefined } }));
  });
});
