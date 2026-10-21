// Nitrogen budget (lane SE2, 2026-10-20): waste by feeding level, filter capacity from media litres, plants taking ammonium first.
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { getSpecies } from '../src/data/species';
import { NITRATE_TARGET_N, NO3_TO_N, filterCapacity, nitrogenBudget, plantUptake, tanOf, waterChangeState, type Nitrogen } from '../src/scene/nitrogen';
import { stockingOf, massG, waterChangeFraction } from '../src/scene/stocking';
import { withChoice } from '../src/scene/tech';
import { nitrogenRows, waterChangeText } from '../src/ui/fullnessTile';
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

// Lane NB (2026-10-21): the mass balance behind the water-change figure, and Decision 2's three states.
describe('nitrogen ledger and water-change states', () => {
  /** The review's tank (S183 / S185): 20 gal long (30 x 12 x 12 in), 13 tiger barbs, 77 F, small internal filter, 31 root feeders
   *  counted at half; the review's other plants are not known, 13 stems bring the plant capacity to its 22-25 mg N a day. */
  const barbs = (plants = true): TankSetup => {
    const s = bare(Array(13).fill('tigerbarb')); s.tank = { ...s.tank, L: 30 * IN, D: 12 * IN, H: 12 * IN }; s.water.level = 1;
    if (plants) s.items = [...Array.from({ length: 31 }, (_, i) => plant(i % 2 ? 'sword' : 'crypt', i)), ...Array.from({ length: 13 }, (_, i) => plant('stem', 50 + i))];
    return { ...s, tech: withChoice(s, 'filter', 'internal') };
  };
  /** g N a day a weekly change of waterChangePct removes at the target, with tap water at `tap` mg N/L */
  const removed = (n: Nitrogen, litres: number, tap = 0) => n.waterChangePct / 100 * (NITRATE_TARGET_N - tap) * litres / 7 / 1000;
  it('balances: the animals N = plants (ammonium + nitrate) + water changes + unprocessed, per day', () => {
    for (const s of [barbs(), barbs(false), bare(Array(10).fill('goldfish'))]) {
      const r = stockingOf(s), n = r.nitrogen;
      expect(n.byPlants + n.nitrateByPlants + removed(n, r.capacity.litres) + n.unprocessed).toBeCloseTo(n.tan, 9);
      expect(n.byPlants + n.byBacteria + n.unprocessed).toBeCloseTo(n.tan, 12);
    }
  });
  it('4 ppm of nitrate a week (as NO3) asks for 10 % a week', () => {
    const L = 100, rise = 4 * NO3_TO_N, tan = rise * L / 7 / 1000, n = nitrogenBudget(withTech(bare(), 'canister'), L, 25, tan);
    expect(n.unprocessed).toBe(0); expect(n.nitrateMgNPerWeek).toBeCloseTo(rise, 9);
    expect(n.waterChangePct).toBeCloseTo(10, 0); expect(n.waterChange.state).toBe('routine');
  });
  it('pins the 13 tiger barbs: about 2.6 % a week nitrate-only (the 10 % floor schedules), filter 16 % with plants vs 39 % without', () => {
    const r = stockingOf(barbs()), n = r.nitrogen;
    expect(r.capacity.litres).toBeCloseTo(70.8, 0); expect(n.tan * 1000).toBeCloseTo(27.4, 0);
    expect(n.byPlants * 1000).toBeCloseTo(16.5, 0); expect(n.plants.gN * 1000).toBeCloseTo(25.1, 0); expect(n.plants.rootCount).toBe(31);
    expect(n.waterChangePct).toBeCloseTo(2.6, 0); expect(n.waterChange.state).toBe('routine');
    expect(n.ammoniaPercent).toBeCloseTo(15.6, 0); expect(n.plantFreeAmmoniaPercent).toBeCloseTo(39, 0);
    expect(waterChangeFraction(barbs())).toBe(0.1);
  });
  it('plants removed: every gram of the animals N ends as nitrate, the plant-free figure', () => {
    const r = stockingOf(barbs(false)), n = r.nitrogen, L = r.capacity.litres;
    expect(n.byPlants).toBe(0); expect(n.nitrateByPlants).toBe(0);
    expect(n.waterChangePct).toBeCloseTo(n.tan * 7000 / L / NITRATE_TARGET_N * 100, 9);
    expect(n.waterChangePct).toBeCloseTo(30, 0);
    expect(n.ammoniaPercent).toBeCloseTo(n.plantFreeAmmoniaPercent, 9);
  });
  it('tap nitrate raises the change; at or above the target it is an environmental failure, not a percentage', () => {
    expect(waterChangeState(0.9, 0).uncappedPct).toBeCloseTo(10, 9);
    expect(waterChangeState(0.9, 4.5).uncappedPct).toBeCloseTo(20, 9); // half the headroom, twice the change
    const f = waterChangeState(0.9, NITRATE_TARGET_N);
    expect(f.state).toBe('failure'); expect(f.why).toBe('tap'); expect(f.uncappedPct).toBe(Infinity);
    const s = barbs(), wet = { ...s, water: { ...s.water, tapNitrate: 40 } }, n = stockingOf(wet).nitrogen;
    expect(n.waterChange.state).toBe('failure'); expect(n.waterChangePct).toBe(100);
    const some = stockingOf({ ...s, water: { ...s.water, tapNitrate: 10 } }).nitrogen;
    expect(some.waterChangePct).toBeGreaterThan(stockingOf(s).nitrogen.waterChangePct);
  });
  it('over 50 % in one change is high maintenance: the uncapped figure, two smaller changes; over two 50 % changes fails', () => {
    expect(waterChangeState(4.5).state).toBe('routine'); // exactly 50 %
    const h = waterChangeState(5.4); expect(h.state).toBe('high'); expect(h.uncappedPct).toBeCloseTo(60, 9); expect(h.changes).toBe(2); expect(h.perChangePct).toBeCloseTo(30, 9);
    const x = waterChangeState(10); expect(x.state).toBe('failure'); expect(x.why).toBe('too-much'); expect(x.uncappedPct).toBeGreaterThan(100);
  });
});
describe('nitrogen wording (lane NB)', () => {
  const at = (rise: number, tapPpm = 0) => {
    const n = nitrogenBudget(withTech(bare(), 'canister'), 100, 25, rise * 100 / 7 / 1000);
    return waterChangeText({ ...n, waterChange: waterChangeState(rise, tapPpm * NO3_TO_N) });
  };
  it('labels the figure nitrate-only beside the routine floor, and says mg N', () => {
    const rows = nitrogenRows(stockingOf(bare(Array(8).fill('goldfish'))).nitrogen);
    expect(rows.at(-1)!.label).toBe('Nitrate-only water change'); expect(rows.at(-1)!.note).toMatch(/routine 10 %/);
    expect(rows[0].value).toMatch(/ mg N$/); expect(rows[0].note).toMatch(/TAN/);
  });
  it('shows the plant-free filter load beside the plant-assisted one', () => {
    const s = bare(Array(10).fill('goldfish')); s.items = Array.from({ length: 10 }, (_, i) => plant('stem', i));
    expect(nitrogenRows(stockingOf(s).nitrogen).map(r => r.label)).toContain('Filter load without plants');
  });
  it('words the three states', () => {
    expect(at(0.9).value).toBe('10% a week');
    expect(at(5.4).note).toMatch(/high maintenance.*Two changes of about 30%/);
    expect(at(10).note).toMatch(/more than two 50 % changes/);
    expect(at(0.9, 45).value).toBe('cannot be met');
  });
});
