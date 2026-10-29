import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { applyPreset, feedFor, optionCost, parseTech, pumpTurnover, reefFeedOf, techOf, techParts, flowTierCap } from '../src/scene/tech';
import { PUMP_PRODUCTS, PUMP_GEAR_KINDS, pumpProduct, pumpsFor, pumpRatedFor } from '../src/data/gearCatalog';
import { volume } from '../src/scene/physics';
import { gearPicks } from '../src/render/gear3d';
import type { TankSetup } from '../src/scene/types';

const tankOf = (id: string) => parseScene(SCENES[id]).scene.tanks[0];
const mean = (r: { lo: number; mode: number; hi: number }) => (r.lo + r.mode + r.hi) / 3;

describe('pump catalogue (lane GP)', () => {
  it('has about 35 products, each with a price, watts, a source and a colour', () => {
    expect(PUMP_PRODUCTS.length).toBeGreaterThanOrEqual(32);
    expect(new Set(PUMP_PRODUCTS.map(p => p.id)).size).toBe(PUMP_PRODUCTS.length);
    for (const p of PUMP_PRODUCTS) {
      expect(p.priceUsd, p.id).toBeGreaterThan(0); expect(p.watts, p.id).toBeGreaterThan(0);
      expect(p.url, p.id).toMatch(/^https:\/\/\S+$/); expect(p.asOf, p.id).toMatch(/^2026-10-(27|29)$/);
      expect(p.colors.body, p.id).toMatch(/^#[0-9a-f]{6}$/i);
      if (p.kind !== 'air') expect(p.gph, p.id).toBeGreaterThan(0);
      if (p.kind === 'wavemaker') expect(p.controller, p.id).toBe(true);
    }
  });
  it('a gear part accepts only its kinds; a wavemaker also runs as a powerhead', () => {
    expect(pumpsFor('airpump', 20).every(p => p.kind === 'air')).toBe(true);
    expect(pumpsFor('wavemaker', 55).every(p => p.kind === 'wavemaker')).toBe(true);
    expect(pumpsFor('powerhead', 55).some(p => p.kind === 'wavemaker')).toBe(true);
    expect(PUMP_GEAR_KINDS.airpump).toEqual(['air']);
  });
  it('lists the pumps rated for the tank first', () => {
    const l = pumpsFor('airpump', 200), firstOff = l.findIndex(p => pumpRatedFor(p, 200) === false);
    expect(firstOff).toBeGreaterThan(0);
    expect(l.slice(firstOff).every(p => pumpRatedFor(p, 200) === false)).toBe(true);
  });
});

describe('a picked pump changes the numbers; without one nothing moves', () => {
  const reef = () => structuredClone(tankOf('reef')), planted = () => structuredClone(tankOf('planted'));
  it('an air pump replaces the generic price and watts; an old file prices as before', () => {
    const S = planted(); S.tech = { rows: { ...techOf(S).rows, air: 'airstone' } };
    const base = optionCost(S, 'air', 'airstone');
    const p = pumpProduct('uniclife-ul080')!, S2 = { ...S, tech: { ...S.tech!, pumps: { airpump: p.id } } };
    const c = optionCost(S2, 'air', 'airstone');
    expect(c.est).toBe(false);
    expect(mean(c.setup)).toBeCloseTo(p.priceUsd, 0);
    expect(c.parts[0].watts).toBe(p.watts);
    expect(optionCost(S, 'air', 'airstone')).toEqual(base); // no field: unchanged
  });
  it('powerheads: the flow row gets a turnover from the pump\'s real gph, and the coral tier follows it', () => {
    const S = reef(), gal = volume(S.tank).gallons;
    S.tech = { rows: { ...techOf(S).rows, flow: 'two' }, pumps: { powerhead: 'pulaco-95-pump' } };
    const x = pumpTurnover(S.tech, gal)!, p = pumpProduct('pulaco-95-pump')!;
    expect(x).toBeCloseTo(2 * p.gph! / gal, 6);
    expect(optionCost(S, 'flow', 'two').turnover).toBeCloseTo(x, 6);
    // too little flow for the tank: capped under the option's own tier; plenty of flow: no cap
    expect(flowTierCap({ ...S.tech!, pumps: { powerhead: 'freesea-magnetic-1600' } }, 55)).toBe(2); // 2 x 1600 gph on 55 gal: 58x
    const small = { ...S.tech!, rows: { ...S.tech!.rows, flow: 'one' }, pumps: { powerhead: 'pulaco-95-pump' } };
    expect(flowTierCap(small, 200)).toBe(0);
    expect(reefFeedOf(small, 'low', 200)).toBe('low');
    // no product picked: the cap never applies
    expect(flowTierCap({ rows: { flow: 'wave' } }, 200)).toBe(2);
    expect(reefFeedOf({ rows: { ...applyPreset(reef(), 'sps').rows } }, 'low', 200)).toBe('co2');
  });
  it('a picked powerhead is passed to the 3D part with its product', () => {
    const S = reef();
    S.tech = { rows: { ...techOf(S).rows, flow: 'one' }, pumps: { powerhead: 'aquamiracle-135-powerhead' } };
    expect(techParts(S).find(p => p.gear === 'powerhead')?.product).toBe('aquamiracle-135-powerhead');
    expect(gearPicks(S).find(g => g.id === 'powerhead')?.product).toBe('aquamiracle-135-powerhead');
    const S0 = reef(); S0.tech = { rows: { ...techOf(S0).rows, flow: 'one' } };
    expect(gearPicks(S0).find(g => g.id === 'powerhead')?.product).toBeUndefined();
  });
  it('a sponge filter runs on the picked air pump', () => {
    const S = planted(); S.tech = { rows: { ...techOf(S).rows, filter: 'sponge' } };
    const a = optionCost(S, 'filter', 'sponge'), b = optionCost({ ...S, tech: { ...S.tech!, pumps: { airpump: 'aquamiracle-1w-50gph' } } }, 'filter', 'sponge');
    expect(b.kwhMo).toBeLessThan(a.kwhMo);
  });
  it('a saved file keeps valid picks and drops unknown or mismatched ones', () => {
    const t = parseTech({ rows: { air: 'airstone' }, pumps: { airpump: 'tetra-whisper-10', powerhead: 'nope', wavemaker: 'tetra-whisper-10', other: 'pulaco-95-pump' } })!;
    expect(t.pumps).toEqual({ airpump: 'tetra-whisper-10' });
    expect(parseTech({ rows: { air: 'airstone' }, pumps: { powerhead: 'nope' } })!.pumps).toBeUndefined();
    const S = tankOf('planted') as TankSetup; expect(feedFor(S)).toBe(S.grow.feed);
  });
});
