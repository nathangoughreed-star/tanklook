// Lane SP1 (Nathan 2026-11-16): stands are real products: fit filter, price row, drawn style follows the pick, old files still load.
import { describe, expect, it } from 'vitest';
import { STAND_PRODUCTS, standOf, standsFor, standFits, standProduct } from '../src/data/stands';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { defaultProfile, demandOf } from '../src/demand';
import { bareSetup } from '../src/scene/defaults';
import { setStandProduct } from '../src/scene/placement';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';

const NOW = Date.parse('2026-11-16');
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
    expect(p.priceUsd).toBe(Math.min(...standsFor(S.tank).filter(x => x.kind === 'cabinet').map(x => x.priceUsd)));
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
