import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { defaultProfile, demandOf } from '../src/demand';
import { gearFits, gearOffers, gearParts, pinGear, pinnedGear, unpinGear } from '../src/demand/gearDeals';
import { GEAR_DEALS, type GearDeal } from '../src/data/gearDeals';
import { heatLoss } from '../src/scene/tech';
import { volume } from '../src/scene/physics';
import { parseScene } from '../src/scene/validate';

// Gear sales from specialist stores (lane GD, 2026-10-20). Fixed rows and a fixed `now`, so the live file can change freely.
const NOW = Date.parse('2026-10-21');
const tank = (id: string) => parseScene(SCENES[id]).scene.tanks[0];
const deal = (o: Partial<GearDeal> & Pick<GearDeal, 'slot'>): GearDeal => ({
  id: 'x-' + o.slot, store: 'Test Store', salt: false, title: 'Test ' + o.slot, price: { usd: 50, regularUsd: 80 }, url: 'https://example.com', asOf: '2026-10-20', ...o,
});

describe('gear-deals.json', () => {
  it('rows are on sale, in a known slot, and the ids are unique', () => {
    const ids = new Set<string>();
    for (const d of GEAR_DEALS) {
      expect(['light', 'filter', 'heater', 'skimmer', 'co2']).toContain(d.slot);
      expect(d.price.usd).toBeLessThan(d.price.regularUsd);
      expect(d.url.startsWith('https://')).toBe(true);
      expect(ids.has(d.id), d.id).toBe(false); ids.add(d.id);
    }
  });
});

describe('gearFits', () => {
  const S = tank('planted');
  it('a light fits by tank length and water type', () => {
    expect(gearFits(S, deal({ slot: 'light', fitMm: [S.tank.L - 50, S.tank.L + 50] }), NOW)).toBe(true);
    expect(gearFits(S, deal({ slot: 'light', fitMm: [S.tank.L + 100, S.tank.L + 300] }), NOW)).toBe(false);
    expect(gearFits(S, deal({ slot: 'light', salt: true, fitMm: [S.tank.L - 50, S.tank.L + 50] }), NOW)).toBe(false);
    expect(gearFits(S, deal({ slot: 'light' }), NOW), 'unsized').toBe(false);
  });
  it('a heater fits near the watts the build needs; a filter by its rated gallons', () => {
    const w = heatLoss(S).heater.watts, gal = volume(S.tank).gallons;
    expect(gearFits(S, deal({ slot: 'heater', watts: w }), NOW)).toBe(true);
    expect(gearFits(S, deal({ slot: 'heater', watts: w * 3 }), NOW)).toBe(false);
    expect(gearFits(S, deal({ slot: 'filter', galMax: Math.ceil(gal * 1.5) }), NOW)).toBe(true);
    expect(gearFits(S, deal({ slot: 'filter', galMax: Math.floor(gal / 2) }), NOW)).toBe(false);
  });
  it('a sale older than 30 days is not offered', () => {
    expect(gearFits(S, deal({ slot: 'co2', asOf: '2026-08-01' }), NOW)).toBe(false);
    expect(gearFits(S, deal({ slot: 'co2' }), NOW)).toBe(true);
  });
});

describe('pinning a gear sale prices that row', () => {
  it('the heater row costs the sale price while pinned, and the typical price after unpinning', () => {
    const S = tank('planted'), P = defaultProfile(), w = heatLoss(S).heater.watts, d = deal({ slot: 'heater', watts: w, price: { usd: 300, regularUsd: 400 } });
    const before = demandOf(S, P, { now: NOW }).items.find(c => c.key === 'heater')!.setup!.mode;
    pinGear(S, d);
    expect(pinnedGear(S, NOW, [d]).map(x => x.id)).toEqual([d.id]);
    const parts = { heater: { usd: 300, asOf: d.asOf, label: d.title } };
    const row = demandOf(S, P, { now: NOW, parts }).items.find(c => c.key === 'heater')!;
    expect(row.setup!.mode).toBeCloseTo(300, 0);
    expect(row.label).toContain(d.title);
    expect(before).not.toBeCloseTo(300, 0);
    unpinGear(S, 'heater');
    expect(pinnedGear(S, NOW, [d])).toEqual([]);
    expect(gearParts(S, NOW)).toEqual({});
  });
  it('offers skip pinned rows and gear far dearer than the row', () => {
    const S = tank('planted'), P = defaultProfile(), D = demandOf(S, P, { now: NOW }), w = heatLoss(S).heater.watts;
    const cheap = deal({ slot: 'heater', watts: w, id: 'cheap' }), dear = deal({ slot: 'heater', watts: w, id: 'dear', price: { usd: 5000, regularUsd: 9000 } });
    expect(gearOffers(S, D, NOW, 2.5, [cheap, dear]).map(d => d.id)).toEqual(['cheap']);
    pinGear(S, cheap);
    expect(gearOffers(S, D, NOW, 2.5, [cheap, dear])).toEqual([]);
  });
});
