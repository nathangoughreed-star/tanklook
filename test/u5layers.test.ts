// Lane U5: the four standards of a finished tank (welfare / complete / display / enhancements), the bare / minimal option and the stated compromise.
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
  it('a complete set-up prices the test kit, dechlorinator, siphon, net and thermometer', () => {
    const l = r.proposals[0].costLines.find(x => x.layer === 'complete' && /test kit/.test(x.label));
    expect(l && l.usd).toBeGreaterThan(40);
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

describe('bare / minimal', () => {
  const r = run({ constraints: { startupUsd: cap(150) }, animals: betta, minimal: true, owned: { filter: 'care', heater: 'care', lid: 'care', light: 'care' } });
  it('a bare-bottom betta tank exists under $150 when the person owns the gear, and says it was chosen', () => {
    expect(r.proposals.length).toBeGreaterThan(0);
    const p = r.proposals[0];
    expect(p.totals.startupUsd).toBeLessThanOrEqual(150);
    expect(p.build.finish?.tier).toBe('bare');
    expect(p.build.setup.substrate.show).toBe(false);
    expect(p.build.setup.items.some(i => i.kind === 'plant' || i.kind === 'artificial')).toBe(false);
    expect(p.build.setup.items.length).toBeLessThanOrEqual(1); // one hide
    expect(p.finishNote?.kind).toBe('chosen');
    expect(p.finishNote?.text).toMatch(/display baseline/);
  });
  it('welfare is unchanged: the water test kit, supplies and the life-support gear stay in the price', () => {
    const all = run({ constraints: {}, animals: betta, minimal: true }).proposals[0];
    expect(all.costLines.some(l => /test kit/.test(l.label))).toBe(true);
    expect(all.layers.map(l => l.layer)).toEqual(expect.arrayContaining(['welfare', 'complete']));
    expect(all.layers.some(l => l.layer === 'display')).toBe(false);
  });
  it('is never offered to a salt tank, a terrarium or a vivarium (their substrate is husbandry)', () => {
    for (const kind of ['saltwater', 'terrarium', 'vivarium'] as const) {
      const q = run({ kinds: [kind], constraints: {}, minimal: true });
      for (const p of q.proposals) expect(p.build.finish?.tier).not.toBe('bare');
    }
  });
});

describe('stated compromise', () => {
  it('a budget that cannot carry the display baseline gets a bare bottom with the compromise stated, never a silent strip', () => {
    const r = run({ constraints: { startupUsd: cap(215) } });
    const bare = r.proposals.filter(p => p.build.finish?.tier === 'bare');
    expect(bare.length).toBeGreaterThan(0);
    for (const p of bare) { expect(p.finishNote?.kind).toBe('compromise'); expect(p.finishNote?.text).toMatch(/\$\d+/); }
  });
  it('an ample budget never produces a bare tank or a compromise by default', () => {
    const r = run({ constraints: { startupUsd: cap(900) } });
    for (const p of r.proposals) { expect(p.build.finish?.tier).not.toBe('bare'); expect(p.finishNote).toBeUndefined(); }
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
