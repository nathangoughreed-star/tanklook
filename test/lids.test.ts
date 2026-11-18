// TL1 (R122 R123): stand rating allows the sold-as vs true volume gap; glass lids and mesh tops are real products for standard sizes.
import { describe, expect, it } from 'vitest';
import { LID_PRODUCTS, lidsFor, lidOf } from '../src/data/lids';
import { standCheck } from '../src/data/stands';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { bareSetup } from '../src/scene/defaults';
import { setLid } from '../src/scene/tankEdit';
import { defaultProfile, demandOf } from '../src/demand';

const setup = (id: string) => { const S = bareSetup(); S.tank = tankFromModel(getTankModel(id)!); S.water.on = true; return S; };

describe('R122 stand rating', () => {
  it('a 55 stand under a true 56 gal 55 is fine; a real 65 gal on it is flagged', () => {
    expect(standCheck({ ratedGal: 55 }, 600, 56)).toBeUndefined();
    expect(standCheck({ ratedGal: 55 }, 600, 58)).toBeUndefined();
    expect(standCheck({ ratedGal: 55 }, 700, 65)?.level).toBe('soft');
  });
});
describe('R123 lid products', () => {
  it('every product has a price, https url and date', () => {
    for (const p of LID_PRODUCTS) { expect(p.priceUsd).toBeGreaterThan(0); expect(p.url).toMatch(/^https:/); expect(p.asOf).toMatch(/^\d{4}-\d\d-\d\d$/); expect(p.fitsGal.length).toBeGreaterThan(0); }
  });
  it('a standard 55 has glass lids and a mesh top; a 29, 40 breeder and 75 have glass', () => {
    expect(lidsFor(setup('g55').tank, 'glass').length).toBeGreaterThanOrEqual(2);
    expect(lidsFor(setup('g55').tank, 'mesh').length).toBeGreaterThanOrEqual(1);
    for (const id of ['g29', 'g40b', 'g75', 'g10']) expect(lidsFor(setup(id).tank, 'glass').length, id).toBeGreaterThan(0);
  });
  it('the lid in use is priced as that product', () => {
    const S = setup('g55'); setLid(S, 'glass');
    const p = lidOf(S)!; expect(p.id).toBe('marineland-glass-canopy-48x13');
    const row = demandOf(S, defaultProfile(), { now: Date.parse('2026-11-18') }).items.find(i => i.key === 'lid')!;
    expect(row.label).toContain('Marineland');
  });
});

describe('R124 kits with a lid start with it', () => {
  it('every deal that lists a lid starts a scene whose lid is not open; the 55 gal kits start with a hood', async () => {
    const { DEALS } = await import('../src/data/deals');
    const { sceneFromDeal } = await import('../src/demand/dealscene');
    for (const d of DEALS.filter(x => x.includes.includes('lid') && x.tank)) { const sc = sceneFromDeal(d); if (sc) expect(sc.tanks[0].lid, d.id).not.toBe('open'); }
    for (const id of ['petco-imagitarium-led-55', 'petsmart-top-fin-essentials-55']) expect(sceneFromDeal(DEALS.find(x => x.id === id)!)!.tanks[0].lid, id).toBe('hood');
  });
});
