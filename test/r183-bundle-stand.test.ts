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

// Bundle parts sweep (2026-11-26): a bundle-only stand is drawn as itself but priced as the cheapest real stand sold alone for its footprint.
import { standsFor } from '../src/data/stands';
import dealsRaw from '../src/data/deals.json?raw';
describe('a bundle-only stand', () => {
  it('the Marineland HD 45 gets its own stand, priced as the Aqueon 36 x 12 ($269.99), never offered in the picker', () => {
    const d = deal('petsmart-marineland-hd-45'), S = sceneFromDeal(d)!.tanks[0];
    expect(standOf(S)?.id).toBe('marineland-hd-45-stand');
    const row = demandOf(S, defaultProfile()).items.find(i => i.key === 'stand')!;
    expect(row.setup!.mode).toBeCloseTo(269.99, 0);
    expect(row.label).toContain('bundle only; priced as Aqueon');
    expect(standsFor(S.tank).map(p => p.id)).not.toContain('marineland-hd-45-stand');
  });
  it('the Marineland HD 75 gets its own barn-door stand, priced as the Top Fin Raven Oak 55-75 ($254.99)', () => {
    const S = sceneFromDeal(deal('petsmart-marineland-hd-led-ensemble-75'))!.tanks[0];
    expect(standOf(S)?.id).toBe('marineland-hd-75-stand');
    expect(standProduct('marineland-hd-75-stand')!.look).toMatchObject({ open: 'center', doorStyle: 'barn' });
    expect(demandOf(S, defaultProfile()).items.find(i => i.key === 'stand')!.setup!.mode).toBeCloseTo(254.99, 0);
  });
  it('no deal has a field twice (JSON keeps the last one silently)', () => {
    const raw = dealsRaw.replace(/\r\n/g, '\n');
    for (const blk of raw.split(/\n  \{/).slice(1)) { const keys = [...blk.matchAll(/^   "(\w+)":/gm)].map(m => m[1]); expect(keys.length, blk.slice(0, 60)).toBe(new Set(keys).size); }
  });
});

// Parts sweep 2026-11-26: a tank that measures far over its label (bow front 36 about 41 gal, Imagitarium 55 about 61) is still offered its own bundle.
describe('every bundle is offered for its own tank', () => {
  it('each aquarium bundle with a scene shows up in dealOffers for that scene', () => {
    const now = Date.parse('2026-11-26T12:00:00');
    for (const d of DEALS.filter(x => !x.terrarium && (!x.saleEnds || Date.parse(x.saleEnds) >= now))) {
      const sc = sceneFromDeal(d); if (!sc) continue;
      expect(dealOffers(sc.tanks[0], defaultProfile(), { now }, [d]).length, d.id).toBe(1);
    }
  });
});
