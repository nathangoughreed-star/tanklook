// SB1 (2026-11-26, R185 / R186): the substrate picker is type first, then colours and real products; old files keep loading.
import { describe, expect, it } from 'vitest';
import { SUBSTRATES } from '../src/art/placeholder';
import { BRANDS, brandOf, brandUsdPerL } from '../src/data/substrateBrands';
import { BLEND_PRESETS, migrateBlend } from '../src/scene/blend';
import { defaultScene } from '../src/scene/defaults';
import { bedOf } from '../src/scene/substrateCheck';
import { parseScene } from '../src/scene/validate';
import { subOptOn, subTypeOf, substrateTypes } from '../src/shell/logic/workspace';

const sceneWith = (patch: Record<string, unknown>) => {
  const s = JSON.parse(JSON.stringify(defaultScene())); Object.assign(s.tanks[0].substrate, patch);
  return parseScene(s).scene.tanks[0].substrate;
};

describe('substrate picker model', () => {
  it('lists the types in order, each with options; every option resolves to a look', () => {
    const t = substrateTypes();
    expect(t.map(x => x.id).slice(0, 8)).toEqual(['bare', 'gravel', 'natural', 'pea', 'sand', 'soil', 'marine', 'custom']);
    for (const ty of t) for (const o of ty.options) if (!o.preset && o.id !== 'custom') expect(SUBSTRATES[o.id as keyof typeof SUBSTRATES], o.id).toBeTruthy();
    expect(t.find(x => x.id === 'gravel')!.options.map(o => o.label)).toEqual(expect.arrayContaining(['Blue', 'Red', 'Black', 'White', 'Pink', 'Green', 'Clown puke']));
  });
  it('every product has a sourced price, a dated url and a look; ids are unique', () => {
    expect(new Set(BRANDS.map(b => b.id)).size).toBe(BRANDS.length);
    for (const b of BRANDS) { expect(b.price, b.id).toBeGreaterThan(0); expect(b.url, b.id).toMatch(/^https:\/\//); expect(b.date).toBe('2026-11-26'); expect(SUBSTRATES[b.id]).toBeTruthy(); expect(b.mm[1]).toBeGreaterThanOrEqual(b.mm[0]); }
  });
  it('clown puke is a custom blend preset, listed under aquarium gravel', () => {
    const sub = { show: true, type: 'custom', custom: BLEND_PRESETS.clownpuke };
    expect(subTypeOf(sub)).toBe('gravel');
    expect(subOptOn(sub, substrateTypes().find(x => x.id === 'gravel')!.options.find(o => o.preset === 'clownpuke')!)).toBe(true);
    expect(subTypeOf({ show: true, type: 'custom', custom: { grains: [], mix: 0 } as never })).toBe('custom');
  });
});

describe('saved files', () => {
  it('old substrate ids and a plain custom blend still load', () => {
    for (const t of ['gravel', 'clown', 'blue', 'onyx', 'aragonite', 'custom']) expect(sceneWith({ type: t }).type).toBe(t);
    expect(migrateBlend({ grain: 'sand', color: '#cbb894', grain2: 'none', mix: 0.5 }, defaultScene().tanks[0].substrate.custom).preset).toBeUndefined();
  });
  it('new colour ids, brand ids, the preset flag and the price override survive; unknown ids fall back', () => {
    expect(sceneWith({ type: 'red' }).type).toBe('red');
    const id = BRANDS[0].id;
    expect(sceneWith({ type: id }).type).toBe(id);
    expect(sceneWith({ type: 'sb-not-a-product' }).type).toBe('gravel');
    expect(sceneWith({ type: 'custom', custom: BLEND_PRESETS.clownpuke }).custom.preset).toBe('clownpuke');
    expect(sceneWith({ priceLb: 2.5 }).priceLb).toBe(2.5);
    expect(sceneWith({ priceLb: -3 }).priceLb).toBeUndefined();
    expect(sceneWith({}).priceLb).toBeUndefined();
  });
  it('a product bed takes its grain from its stated size', () => {
    const S = defaultScene().tanks[0]; const sand = BRANDS.find(b => b.mm[1] <= 2.5)!, gravel = BRANDS.find(b => b.mm[1] > 2.5 && b.mm[1] <= 9)!;
    S.substrate.show = true; S.substrate.type = sand.id; expect(bedOf(S)!.grain).toBe('sand');
    S.substrate.type = gravel.id; expect(bedOf(S)!.grain).toBe('gravel');
    expect(brandOf(gravel.id)).toBeTruthy();
  });
  it('the cost per litre comes from the product page, or from the user own price', () => {
    const lb = BRANDS.find(b => b.per === 'lb')!, l = BRANDS.find(b => b.per === 'L')!;
    expect(brandUsdPerL(lb.id)!.usd).toBeCloseTo(lb.price * 3.527, 2);
    expect(brandUsdPerL(lb.id, 2)).toMatchObject({ own: true, usd: expect.closeTo(7.05, 1) });
    expect(brandUsdPerL(l.id)!.usd).toBe(l.price);
    expect(brandUsdPerL('gravel')).toBeNull();
  });
});
