// Lane TG: a tank started from a bundle gets the bundle's own filter and heater (drawn, and as its gear rows), and the
// bundle's one price still covers them: no part counted twice.
import { describe, expect, it } from 'vitest';
import { DEALS, dealAsKit } from '../src/data/deals';
import { sceneFromDeal } from '../src/demand/dealscene';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import { matchFilter } from '../src/demand/gear';
import { gearPicks } from '../src/render/gear3d';
import { parseScene } from '../src/scene/validate';

const NOW = Date.parse('2026-10-19'), P = defaultProfile();
const bundles = DEALS.map(d => ({ d, S: sceneFromDeal(d)?.tanks[0] })).filter(b => b.S?.tech);

describe('bundle gear', () => {
  it('sets the tech for bundles that ship a filter or heater', () => { expect(bundles.length).toBeGreaterThan(10); });

  it('draws the bundle filter, matched like the engine matches it', () => {
    for (const { d, S } of bundles) {
      const k = dealAsKit(d);
      if (!k.filter) continue;
      const fm = matchFilter({ ...k.filter, gal: k.filter.gal ?? d.gal })!.model;
      expect(gearPicks(S!).map(p => p.id), d.id).toContain(fm.id);
    }
  });

  it('counts no part twice: the setup total is the same with the bundle tech as without it', () => {
    for (const { d, S } of bundles) {
      const kit = dealAsKit(d), a = demandOf({ ...S!, tech: undefined }, P, { kit, now: NOW }), b = demandOf(S!, P, { kit, now: NOW });
      expect(b.totals.setupUsd, d.id).toBeCloseTo(a.totals.setupUsd, 6);
      for (const key of ['filter', 'heater']) if (d.includes.includes(key)) expect(b.items.find(i => i.key === key)?.setup, `${d.id} ${key}`).toBeUndefined();
    }
  });

  it('an old saved bundle scene (no tech) still parses as it was', () => {
    const { d, S } = bundles[0], old = { ...sceneFromDeal(d)!, tanks: [{ ...S!, tech: undefined }] };
    const back = parseScene(JSON.parse(JSON.stringify(old))).scene.tanks[0];
    expect(back.tech).toBeUndefined();
  });
});
