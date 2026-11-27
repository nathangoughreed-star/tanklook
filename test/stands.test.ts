// Lane SP1 (Nathan 2026-11-16): stands are real products: fit filter, price row, drawn style follows the pick, old files still load.
import { describe, expect, it } from 'vitest';
import { STAND_PRODUCTS, standOf, standsFor, standFits, standProduct } from '../src/data/stands';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { defaultProfile, demandOf } from '../src/demand';
import { bareSetup } from '../src/scene/defaults';
import { setStandProduct } from '../src/scene/placement';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';

const NOW = Date.parse('2026-11-23'); // price sweep 2026-11-23: sales re-checked that day are live from it
const setup = (id: string, style: 'cabinet' | 'frame' = 'cabinet') => { const S = bareSetup(); S.tank = tankFromModel(getTankModel(id)!); S.water.on = true; S.stand = { ...S.stand, show: true, style, need: 'added' }; return S; };
const custom = () => { const S = setup('g20l'); S.tank = { ...S.tank, L: 37 * 25.4, D: 15 * 25.4 }; return S; };
const D = (S: TankSetup) => demandOf(S, defaultProfile(), { now: NOW });

describe('stand products', () => {
  it('every product has fits, height, price with seller and dated source', () => {
    expect(STAND_PRODUCTS.length).toBeGreaterThanOrEqual(12);
    for (const p of STAND_PRODUCTS) {
      expect(p.fits.length).toBeGreaterThan(0); expect(p.heightIn).toBeGreaterThan(20); expect(p.priceUsd).toBeGreaterThan(0);
      expect(p.url).toMatch(/^https:/); expect(p.asOf).toMatch(/^\d{4}-\d\d-\d\d$/); expect(['cabinet', 'frame']).toContain(p.kind);
    }
  });
  it('fit filter: a 20 long has stands, a custom 37 x 15 has none, a 30 x 12 stand does not fit a 55', () => {
    expect(standsFor(setup('g20l').tank).length).toBeGreaterThan(1);
    expect(standsFor(custom().tank)).toEqual([]);
    expect(standFits(standProduct('aqueon-cabinet-30')!, setup('g55').tank)).toBe(false);
  });
});

describe('the cost line shows the product', () => {
  it('20 long, cabinet: the cheapest fitting cabinet by default, priced as that product', () => {
    const S = setup('g20l'), p = standOf(S)!;
    expect(p.kind).toBe('cabinet');
    expect(p.finish).toBe(S.stand.finish); // the finish the scene shows
    expect(p.priceUsd).toBe(Math.min(...standsFor(S.tank).filter(x => x.kind === 'cabinet' && x.finish === S.stand.finish).map(x => x.priceUsd)));
    const row = D(S).items.find(i => i.key === 'stand')!;
    expect(row.label).toContain(`${p.brand} ${p.line}`); expect(row.setup!.mode).toBeCloseTo(p.priceUsd, 0);
  });
  it('a frame scene gets a frame; a custom tank stays on the generic estimate', () => {
    expect(standOf(setup('g20l', 'frame'))!.kind).toBe('frame');
    expect(standOf(custom())).toBeUndefined();
    expect(D(custom()).items.find(i => i.key === 'stand')!.label).toMatch(/estimate/);
  });
});

describe('the pick drives the drawn stand', () => {
  it('setStandProduct sets style, finish, height and the product; the row follows', () => {
    const S = setup('g20l'), p = standProduct('aqueon-forge-30')!;
    setStandProduct(S, p);
    expect(S.stand.style).toBe('frame'); expect(S.stand.finish).toBe(p.finish); expect(S.stand.height / 25.4).toBeCloseTo(p.heightIn, 1); expect(S.stand.product).toBe(p.id);
    expect(D(S).items.find(i => i.key === 'stand')!.label).toContain('Forge');
  });
  it('an old file with no stand product loads; an unknown product id is dropped', () => {
    const S = setup('g20l');
    expect(S.stand.product).toBeUndefined();
    const o = parseScene(JSON.stringify({ version: 1, active: 0, tanks: [{ ...JSON.parse(JSON.stringify(S)), stand: { ...S.stand, product: 'no-such-stand' } }] }));
    expect(o.scene.tanks[0].stand.product).toBeUndefined();
  });
});

describe('R96: every stand has a look read off its photos', () => {
  it('each stand has a look; colours are 6-digit hex; unphotographed looks are flagged as estimates', () => {
    for (const p of STAND_PRODUCTS) {
      expect(p.look, p.id).toBeTruthy();
      for (const c of [p.look!.front, p.look!.top, p.look!.tube, p.look!.shelfHex, p.look!.handleHex, p.look!.baseHex]) if (c) expect(c, p.id).toMatch(/^#[0-9a-f]{6}$/i);
      if (p.kind === 'frame') expect(p.look!.tube, p.id).toBeTruthy(); else expect(p.look!.front, p.id).toBeTruthy();
    }
    for (const id of ['af-10-metal', 'marineland-modern-48', 'seapora-monarch-48x18', 'imagitarium-brooklyn-10']) expect(standProduct(id)!.look!.est?.length, id).toBeGreaterThan(0);
  });
  it('a stand with an unknown tank footprint is hidden from the picker and the default', () => {
    expect(standProduct('helloreef-15')!.hidden).toBe(true);
    expect(standsFor(setup('g20h').tank).some(p => p.id === 'helloreef-15')).toBe(false);
  });
  it('every baked tile exists', async () => {
    // @ts-expect-error node only (no node types in this project)
    const { existsSync } = await import('node:fs');
    for (const p of STAND_PRODUCTS) expect(existsSync(`public/gallery/stands/${p.id}.webp`), p.id).toBe(true);
  });
});
