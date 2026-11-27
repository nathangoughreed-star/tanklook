// R183 / R184 (Nathan 2026-11-26): a bundle's stand is its own product or the generic, never another real product standing in;
// turning a bundle to salt adds no gear by itself.
import { describe, expect, it } from 'vitest';
import { DEALS } from '../src/data/deals';
import { sceneFromDeal } from '../src/demand/dealscene';
import { standOf, standProduct } from '../src/data/stands';
import { techOf } from '../src/scene/tech';

const deal = (id: string) => DEALS.find(d => d.id === id)!;
describe('bundle stands (R183)', () => {
  it('the Marineland Modern 60 gets its own Marineland Modern stand', () => {
    const S = sceneFromDeal(deal('petsmart-marineland-modern-60'))!.tanks[0];
    expect(standOf(S)?.id).toBe('marineland-modern-48x13');
    expect(standProduct('marineland-modern-48x13')!.look).toMatchObject({ open: 'half', halfClosed: 'left', halfDoor: true });
  });
  it('a bundle with a stand we have no product for stays generic', () => {
    for (const d of DEALS.filter(d => d.includes.includes('stand') && !d.look?.stand)) {
      const sc = sceneFromDeal(d); if (!sc) continue;
      expect(sc.tanks[0].stand.generic, d.id).toBe(true);
      expect(standOf(sc.tanks[0]), d.id).toBeUndefined();
    }
  });
  it('picking a stand by hand still wins over the generic flag', () => {
    const S = sceneFromDeal(deal('petsmart-marineland-modern-60'))!.tanks[0];
    S.stand = { ...S.stand, product: undefined, generic: true };
    expect(standOf(S)).toBeUndefined();
    S.stand.product = 'marineland-modern-48x13';
    expect(standOf(S)?.id).toBe('marineland-modern-48x13');
  });
});
describe('a bundle turned salt (R184)', () => {
  it('adds no skimmer, flow, dosing, refractometer or salt mix by itself', () => {
    for (const d of DEALS) {
      const sc = sceneFromDeal(d); if (!sc) continue;
      const S = sc.tanks[0]; if (!S.water.on) continue;
      S.water = { ...S.water, salt: true };
      const r = techOf(S).rows;
      for (const k of ['skimmer', 'flow', 'dosing', 'salinity', 'saltmix']) expect(r[k], `${d.id} ${k}`).toBe('none');
    }
  });
});

// Nathan 2026-11-26: a bundle's own light (no price of its own) is compared with a basic LED bar, not a planted light.
import { demandOf, defaultProfile } from '../src/demand';
import { BASIC_LED_USD_PER_IN } from '../src/demand/engine';
import { dealOffers } from '../src/demand/deals';
describe('a bundle light is priced as a basic LED', () => {
  const lightOf = (S: Parameters<typeof demandOf>[0]) => demandOf(S, defaultProfile()).items.find(i => i.key === 'light')!;
  it('the Marineland 60 kit light is about $0.70 an inch, about $34', () => {
    const S = sceneFromDeal(deal('petsmart-marineland-modern-60'))!.tanks[0];
    const l = lightOf(S);
    expect(l.setup!.mode).toBeCloseTo(BASIC_LED_USD_PER_IN.mode * S.tank.L / 25.4, 0);
    expect(l.setup!.mode).toBeLessThan(40);
    expect(l.label).toContain('basic LED');
  });
  it('more watts than the bundle light: back to the usual light estimate', () => {
    const S = sceneFromDeal(deal('petsmart-marineland-modern-60'))!.tanks[0];
    S.light = { ...S.light, watts: (S.light.watts ?? 0) + 20 };
    expect(lightOf(S).label).not.toContain('basic LED');
  });
  it('the saving vs the parts', () => {
    const d = deal('petsmart-marineland-modern-60'), S = sceneFromDeal(d)!.tanks[0];
    const o = dealOffers(S, defaultProfile(), {}, [d])[0];
    expect(o.savingUsd).toBeGreaterThan(0);
  });
});
