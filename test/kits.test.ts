// Lane KB: the kit catalog stays well formed (data only; prices are estimates with an as-of date).
import { describe, expect, it } from 'vitest';
import { KITS } from '../src/data/kits';
import { TECHS } from '../src/scene/lightout';

// Lane KA's tank catalog, when it has landed.
const tanksFile = Object.values(import.meta.glob('../src/data/tanks.json', { eager: true, import: 'default' }))[0] as { tanks: { id: string }[] } | undefined;
const tankIds = tanksFile?.tanks.map((x) => x.id);
const LIDS = ['open', 'glass', 'hood', 'mesh'];

describe('kit catalog', () => {
  it('has unique ids and kits', () => {
    expect(KITS.length).toBeGreaterThan(0);
    expect(new Set(KITS.map((k) => k.id)).size).toBe(KITS.length);
  });
  for (const k of KITS) {
    it(`${k.id} is valid`, () => {
      expect(k.brand && k.name).toBeTruthy();
      expect(k.source.length).toBeGreaterThan(0);
      expect(k.source.every((u) => /^https?:\/\//.test(u))).toBe(true);
      expect(['fresh', 'salt']).toContain(k.water);
      expect(['budget', 'mid', 'plant', 'reef']).toContain(k.tier);
      expect(LIDS).toContain(k.lid);
      expect(k.tankRatedGal).toBeGreaterThan(0);
      if (k.tankDims) for (const d of [k.tankDims.L, k.tankDims.H, k.tankDims.D]) expect(d).toBeGreaterThan(50);
      else expect(k.note).toBeTruthy();
      const t = TECHS[k.light.tech];
      expect(t, `tech ${k.light.tech}`).toBeTruthy();
      if (k.light.type === 'led' || k.light.type === 'tube') expect(t.on).toContain(k.light.type);
      expect(k.light.count).toBeGreaterThan(0);
      if (k.light.type !== 'flat') {
        if (k.light.watts === null) expect(k.light.spec).toBe('guess');
        else expect(k.light.watts).toBeGreaterThan(0);
      }
      if (k.light.spec === 'published') expect(k.light.par).toBeGreaterThan(0);
      if (k.light.spec === 'guess') expect(k.note).toBeTruthy();
      if (k.price) {
        expect(k.price.usd).toBeGreaterThan(0);
        expect(Number.isNaN(Date.parse(k.price.asOf))).toBe(false);
        expect(k.price.url).toMatch(/^https?:\/\//);
      } else expect(k.note).toBeTruthy();
      if (k.tank && tankIds) expect(tankIds).toContain(k.tank);
    });
  }
});

import { DEALS } from '../src/data/deals';
describe('deals catalog (lane KD)', () => {
  it('has unique ids and well formed rows', () => {
    expect(new Set(DEALS.map((d) => d.id)).size).toBe(DEALS.length);
    for (const d of DEALS) {
      expect(d.gal, d.id).toBeGreaterThan(0);
      expect(d.includes, d.id).toContain('tank');
      expect(d.price.usd, d.id).toBeGreaterThan(0);
      if (d.price.regularUsd) expect(d.price.regularUsd, d.id).toBeGreaterThan(d.price.usd);
      expect(d.url, d.id).toMatch(/^https?:\/\//);
      expect(d.asOf, d.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
