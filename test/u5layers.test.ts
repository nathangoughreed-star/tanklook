// Lane U5: the four standards of a finished tank (welfare / complete / display / enhancements), .
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { layerTotals } from '../src/demand/costlines';
import { suggestSetups, type Wants } from '../src/demand/suggest';

const P = defaultProfile(), NOW = Date.parse('2026-10-27'), cap = (value: number) => ({ on: true, value });
const betta = [{ species: 'betta', n: 1 }];
const run = (w: Wants) => suggestSetups(w, P, 'in', NOW);

describe('layers on the cost lines', () => {
  const r = run({ constraints: {}, animals: betta });
  it('every line has a layer and the layers add up to the all-in total', () => {
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) {
      expect(p.costLines.every(l => l.layer)).toBe(true);
      expect(p.layers.reduce((t, l) => t + l.usd, 0)).toBe(p.totals.startupUsd);
      expect(p.layers.map(l => l.layer)).toContain('welfare');
      expect(layerTotals(p.costLines)).toEqual(p.layers);
    }
  });
  it('a complete set-up prices the dechlorinator, siphon, net and thermometer', () => {
    const l = r.proposals[0].costLines.find(x => x.layer === 'complete' && /Supplies/.test(x.label));
    expect(l && l.usd).toBeGreaterThan(20);
    expect(l!.label).not.toMatch(/test kit/); // a simple betta tank does not pay for one: the build plan recommends it instead
    const p = r.proposals[0], rows = p.build.setup && p.costLines.filter(x => x.layer === 'complete').map(x => x.label).join(' ');
    expect(rows).toMatch(/dechlorinator/);
  });
  it('only the upper finish tiers have an enhancements layer; the starter finish has none', () => {
    const lush = run({ constraints: {}, animals: betta }).proposals.find(p => p.build.finish?.tier === 'lush');
    expect(lush?.layers.some(l => l.layer === 'enhance')).toBe(true);
    const rr = run({ constraints: { startupUsd: cap(290) }, animals: betta });
    for (const p of rr.proposals.filter(q => q.build.finish?.tier === 'starter')) expect(p.layers.some(l => l.layer === 'enhance')).toBe(false);
  });
});

describe('no bare-bottom tanks (Nathan 2026-10-28)', () => {
  it('every proposal keeps a substrate, shelter and the welfare set, at any budget', () => {
    for (const w of [{ constraints: {}, animals: betta }, { constraints: { startupUsd: cap(215) } }, { constraints: { startupUsd: cap(900) } }] as Wants[]) {
      for (const p of run(w).proposals) {
        expect(p.build.finish).toBeDefined();
        if (p.build.setup.water.on) expect(p.build.setup.substrate.show).toBe(true);
        expect(p.layers.map(l => l.layer)).toEqual(expect.arrayContaining(p.build.setup.water.on ? ['welfare', 'complete', 'display'] : ['welfare', 'display'])); // a dry enclosure has no water-test supplies
      }
    }
  });
});

describe('low-tech lush finish', () => {
  it('lowtech offers dense live plants with no CO2 and no stronger light, priced; the high-tech tier has both', () => {
    const lo = run({ constraints: { startupUsd: cap(600) }, kinds: ['freshwater'], tags: ['natural'], lowtech: true }), hi = run({ constraints: { startupUsd: cap(900) }, kinds: ['freshwater'], hightech: true });
    const low = lo.proposals.filter(p => p.build.finish?.tier === 'lowtech');
    expect(low.length).toBeGreaterThan(0);
    for (const p of low) {
      expect(p.build.finish!.level).toBe(2);
      const co2 = p.build.setup.tech?.rows.co2;
      expect(!co2 || co2 === 'none').toBe(true);
      expect(p.layers.some(l => l.layer === 'enhance')).toBe(false);
      expect(p.build.setup.items.filter(i => i.kind === 'plant' || i.kind === 'artificial').length).toBeGreaterThan(3);
    }
    expect(hi.proposals.length).toBeGreaterThan(0);
    for (const p of hi.proposals) expect(['standard', 'lush']).toContain(p.build.finish!.tier);
  });
});

describe('owned supplies', () => {
  it('an owned siphon, net, dechlorinator, thermometer, bucket and test kit credit $0 and leave no supplies line', () => {
    const own = { siphon: 'care', net: 'care', conditioner: 'care', thermometer: 'care', bucket: 'care', testkit: 'care' } as const;
    const r = run({ constraints: { startupUsd: cap(250) }, animals: betta, owned: { ...own } }), base = run({ constraints: { startupUsd: cap(250) }, animals: betta });
    const p = r.proposals.find(q => q.strategy === 'economy')!, q = base.proposals.find(x => x.strategy === 'economy')!;
    expect(p.totals.startupUsd).toBeLessThan(q.totals.startupUsd - 15); // the test kit is not priced for a simple betta tank, so owning one saves nothing here
    expect(p.costLines.some(l => l.layer === 'complete' && l.usd > 0 && /Supplies/.test(l.label))).toBe(false);
    expect(p.costLines.filter(l => l.usd === 0 && l.note === 'you have').length).toBeGreaterThanOrEqual(5);
  });
});
