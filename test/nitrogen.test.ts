// Nitrogen budget (lane SE2, 2026-10-20): waste by feeding level, filter capacity from media litres, plants taking ammonium first.
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { getSpecies } from '../src/data/species';
import { filterCapacity, nitrogenBudget, plantUptake, tanOf } from '../src/scene/nitrogen';
import { stockingOf, massG } from '../src/scene/stocking';
import { withChoice } from '../src/scene/tech';
import type { Item, TankSetup } from '../src/scene/types';

const bare = (stock: string[] = []): TankSetup => {
  const s = defaultSetup(); s.tank = { ...s.tank, L: 48 * IN, D: 13 * IN, H: 20 * IN }; s.water.on = true; s.water.level = 0.9; s.water.salt = false;
  s.items = s.items.filter(i => i.kind !== 'plant'); s.patches = [];
  s.fish = stock.map((species, i) => ({ id: i + 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
  return s;
};
const plant = (variant: string, i: number) => ({ id: 100 + i, kind: 'plant', variant, seed: i, x: 0, depth: 0, lift: 0, yaw: 0 }) as unknown as Item;

describe('nitrogen budget', () => {
  it('heavier feeding makes more waste; a bigger fish makes more but less per gram', () => {
    const sp = getSpecies('goldfish')!, w = massG('goldfish');
    expect(tanOf(sp, w, 'heavy', 25, false)).toBeGreaterThan(tanOf(sp, w, 'normal', 25, false));
    expect(tanOf(sp, w, 'normal', 25, false)).toBeGreaterThan(tanOf(sp, w, 'light', 25, false));
    const neon = getSpecies('neon')!, wn = massG('neon');
    expect(tanOf(sp, w, 'normal', 25, false) / w).toBeLessThan(tanOf(neon, wn, 'normal', 25, false) / wn);
    expect(tanOf(sp, w, 'normal', 30, false)).toBeGreaterThan(tanOf(sp, w, 'normal', 22, false));
  });
  it('a filter beats none, and a sourced canister uses its manual media litres', () => {
    const s = bare(['danio']), none = filterCapacity(withTech(s, 'none'), 150, 25), can = filterCapacity(withTech(s, 'canister'), 150, 25);
    expect(can.gDay).toBeGreaterThan(none.gDay); expect(none.mediaL).toBe(0);
    expect(can.mediaL).toBeGreaterThan(0); expect(can.kind).toBe('canister');
  });
  it('plants take ammonium first and relieve the filter', () => {
    const s = bare(Array(10).fill('goldfish')), p = bare(Array(10).fill('goldfish'));
    p.items = Array.from({ length: 10 }, (_, i) => plant('stem', i));
    const a = stockingOf(s).nitrogen, b = stockingOf(p).nitrogen;
    expect(b.byPlants).toBeGreaterThan(0); expect(b.ammoniaPercent).toBeLessThan(a.ammoniaPercent);
    expect(plantUptake(p).gN).toBeGreaterThan(plantUptake(s).gN);
    expect(b.split.plants + b.split.waterChanges + b.split.unprocessed).toBeCloseTo(1, 6);
  });
  it('unprocessed ammonia appears only when the filter and plants are overwhelmed, and a water change need only when nitrate is left', () => {
    const n = nitrogenBudget(withTech(bare(), 'hob'), 150, 25, 5);
    expect(n.unprocessed).toBeGreaterThan(0); expect(n.ammoniaPercent).toBeGreaterThan(100);
    const m = nitrogenBudget(withTech(bare(), 'hob'), 150, 25, 0.01);
    expect(m.unprocessed).toBe(0); expect(m.waterChangePct).toBeLessThan(10);
  });
  it('the feeding setting flows through stockingOf', () => {
    const s = bare(Array(8).fill('goldfish')), h = { ...s, feeding: 'heavy' as const };
    expect(stockingOf(h).nitrogen.tan).toBeGreaterThan(stockingOf(s).nitrogen.tan);
  });
});
it('several filters add up their bacteria, the surface counts once', () => {
  const s = bare(['danio']), one = withTech(s, 'canister'), t = one.tech!;
  const two = { ...one, tech: { ...t, filters: [{ kind: 'canister' }, { kind: 'canister' }] } } as unknown as TankSetup;
  const a = filterCapacity(one, 150, 25), b = filterCapacity(two, 150, 25);
  expect(b.gDay).toBeGreaterThan(a.gDay); expect(b.gDay).toBeLessThan(2 * a.gDay); expect(b.mediaL).toBeGreaterThan(a.mediaL);
});
function withTech(s: TankSetup, filter: string): TankSetup { return { ...s, tech: withChoice(s, 'filter', filter) }; }
describe('plant share, root feeders, fertilizer nitrogen', () => {
  const planted = (variant: string, n = 40, stock = ['danio']) => { const s = bare(stock); s.items = Array.from({ length: n }, (_, i) => plant(variant, i)); return s; };
  it('plants never take more than their share of the TAN: the filter always sees the rest', () => {
    const n = stockingOf(planted('stem')).nitrogen;
    expect(n.byPlants).toBeLessThanOrEqual(n.tan * 0.6 + 1e-12); expect(n.ammoniaPercent).toBeGreaterThan(0);
  });
  it('a root feeder counts half against the water column', () => {
    expect(plantUptake(planted('sword', 10)).gN).toBeCloseTo(plantUptake(planted('stemred', 10)).gN * 0.5, 9); // sword 80 g medium = stemred 40 g fast, before the root half;
    expect(plantUptake(planted('sword', 10)).rootCount).toBe(10);
  });
  it('a water-column fert adds nitrate the plants use first; root tabs add none; few animals leave room an N fert fills', () => {
    const s = planted('stem'), aio = { ...s, tech: withChoice(s, 'ferts', 'aio') }, tabs = { ...s, tech: withChoice(s, 'ferts', 'roottabs') };
    const a = stockingOf(aio).nitrogen, t = stockingOf(tabs).nitrogen;
    expect(a.fert.gN).toBeGreaterThan(0); expect(t.fert.gN).toBe(0);
    expect(a.fert.toPlants + a.fert.toNitrate).toBeCloseTo(a.fert.gN, 12);
    expect(t.fishCoverPlants).toBe(false); expect(t.plantRoom).toBeGreaterThan(a.plantRoom - 1e-12);
  });
  it('enough animals cover the plants: fert nitrogen is then all left over', () => {
    const s = planted('stem', 2, Array(10).fill('goldfish')), n = stockingOf({ ...s, tech: withChoice(s, 'ferts', 'aio') }).nitrogen;
    expect(n.fishCoverPlants).toBe(true); expect(n.fert.toPlants).toBe(0); expect(n.fert.toNitrate).toBeCloseTo(n.fert.gN, 12);
  });
});
