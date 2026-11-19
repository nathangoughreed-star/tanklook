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

describe('R133 a bundle start keeps its tank product', () => {
  it('every deal with a catalogue tank starts as a commercial tank, never the stale custom name', async () => {
    const { DEALS } = await import('../src/data/deals');
    const { sceneFromDeal } = await import('../src/demand/dealscene');
    const { modelCard } = await import('../src/shell/logic/tank');
    for (const d of DEALS.filter(x => x.tank)) {
      const sc = sceneFromDeal(d); if (!sc) continue;
      const S = sc.tanks[0], c = modelCard(S, 'us' as never, []);
      expect(S.customTank, d.id).toBeUndefined(); expect(c.kind, d.id).toBe('commercial'); expect(c.title, d.id).not.toMatch(/^Custom/);
    }
  });
});

describe('R134 R135 a bundle keeps its own lid', () => {
  it('the 55 bundle starts with its own hood: no catalogue hood, no glass-top claim, priced as the bundle hood', async () => {
    const { DEALS } = await import('../src/data/deals');
    const { sceneFromDeal } = await import('../src/demand/dealscene');
    const { hoodOf } = await import('../src/data/hoods');
    const { lockNote, includesNote } = await import('../src/scene/integrated');
    const { chooseHood, lidDetail } = await import('../src/shell/logic/tank');
    const S = sceneFromDeal(DEALS.find(x => x.id === 'petco-imagitarium-led-55')!)!.tanks[0];
    expect(S.lid).toBe('hood'); expect(S.bundleLid).toContain('Imagitarium'); expect(hoodOf(S)).toBeUndefined();
    expect(lockNote(S, 'lid')).toMatch(/This bundle comes with a hood/); expect(lockNote(S, 'lid')).not.toMatch(/glass top/);
    expect(includesNote(S)).toMatch(/Comes with a hood/); expect(includesNote(S)).not.toMatch(/glass top/);
    expect(lidDetail(S)).toMatch(/comes with the bundle/);
    const d = demandOf(S, defaultProfile(), { now: Date.parse('2026-11-19') }).items.find(i => i.key === 'lid')!;
    expect(d.label).toMatch(/comes with the bundle/); expect(d.kwhMo ?? 0).toBe(0); // the catalogue hood's tubes are not the bundle's light
    chooseHood(S, 'aqueon-t8-hood-48'); expect(S.bundleLid).toBeUndefined(); expect(hoodOf(S)?.id).toBe('aqueon-t8-hood-48');
  });
});
