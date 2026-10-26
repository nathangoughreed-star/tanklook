import { describe, expect, it } from 'vitest';
import { buildsFor, FILTRATION_LIMIT, meetsNeeds } from '../src/scene/builds';
import { stockingOf } from '../src/scene/stocking';
import { sceneForBuild } from '../src/ui/buildPick';
import { tankFor, type AnimalCount } from '../src/scene/tankfit';
import { filterUnits, techOf } from '../src/scene/tech';

const SMALL: AnimalCount[] = [{ species: 'betta', n: 1 }];
const MID: AnimalCount[] = [{ species: 'neon', n: 10 }, { species: 'bronzecory', n: 6 }];
const BIG: AnimalCount[] = [{ species: 'neon', n: 12 }, { species: 'pandacory', n: 6 }, { species: 'kribensis', n: 4 }, { species: 'platy', n: 6 }]; // S245: was 4 angels, which share no temperature with neons (21-25 vs 26-29 C): planFor now refuses that mix at every size;
const SALT: AnimalCount[] = [{ species: 'ocellaris', n: 2 }];
const cases: [string, AnimalCount[]][] = [['small', SMALL], ['mid', MID], ['big', BIG], ['salt', SALT]];
const NOW = Date.parse('2026-10-20');

describe('buildsFor', () => {
  for (const [name, animals] of cases) {
    const need = tankFor(animals)!;
    const [cheap, least, bal] = buildsFor(animals, need.tank, NOW);
    it(`${name}: three builds in order, each a whole tank`, () => {
      expect([cheap.id, least.id, bal.id]).toEqual(['cheapest', 'leastWork', 'balanced']);
      for (const b of [cheap, least, bal]) {
        expect(b.tank.id).toBe(need.tank.id);
        expect(b.setup.fish.length).toBe(animals.reduce((s, a) => s + a.n, 0));
        expect(filterUnits(techOf(b.setup)).length).toBeGreaterThan(0);
        expect(b.gear.some(g => g.startsWith('Filter'))).toBe(true);
        expect(Number.isInteger(b.setupUsd) && Number.isInteger(b.upkeepUsdMo) && Number.isInteger(b.minPerWeek)).toBe(true);
      }
    });
    it(`${name}: the stocking's needs are met (filtration within each build's limit, space within 100 %)`, () => {
      expect(need.fails).toEqual([]);
      for (const b of [cheap, least, bal]) {
        expect(meetsNeeds(b)).toBe(true);
        expect(stockingOf(b.setup).filtrationPercent).toBeLessThanOrEqual(FILTRATION_LIMIT[b.id] + 1e-9);
      }
      expect(bal.filtrationPct).toBeLessThanOrEqual(70 + 1e-9);
    });
    it(`${name}: cheapest costs no more than balanced; least work takes no more minutes than either`, () => {
      expect(cheap.setupUsd).toBeLessThanOrEqual(bal.setupUsd);
      expect(least.minPerWeek).toBeLessThanOrEqual(cheap.minPerWeek);
      expect(least.minPerWeek).toBeLessThanOrEqual(bal.minPerWeek);
    });
    it(`${name}: deals only lower the price`, () => {
      for (const b of [cheap, least, bal]) { expect(b.setupUsd).toBeLessThanOrEqual(b.listUsd); expect(b.savingUsd).toBe(Math.max(0, b.listUsd - b.setupUsd)); }
    });
  }

  it('a gear sale that fits is priced in, and is a deal listed on the build', () => {
    const all = cases.flatMap(([, a]) => buildsFor(a, tankFor(a)!.tank, NOW));
    const withDeal = all.filter(b => b.gearDeals.length || b.bundle || b.tankDeal);
    expect(withDeal.length).toBeGreaterThan(0);
    for (const b of withDeal) expect(b.savingUsd).toBeGreaterThan(0);
  });

  it('no animals in the water gives builds that still price (empty stocking is the caller\'s case): none', () => {
    expect(tankFor([])).toBeUndefined();
  });

  it('salt water: least work takes the auto top-off and saves the minutes it is worth', () => {
    const [cheap, least] = buildsFor(SALT, tankFor(SALT)!.tank, NOW);
    expect(least.setup.tech?.rows.ato).toBe('ato');
    expect(least.minPerWeek).toBeLessThan(cheap.minPerWeek);
  });

  it('the scene the editor opens holds the build: its tank, gear and animals placed inside the glass', () => {
    const b = buildsFor(MID, tankFor(MID)!.tank, NOW)[2], sc = sceneForBuild(b, 'in'), T = sc.tanks[0];
    expect(sc.units).toBe('in');
    expect(T.fish.length).toBe(16);
    expect(T.tank.L).toBe(b.setup.tank.L);
    expect(techOf(T).rows.filter).toBe(techOf(b.setup).rows.filter);
    for (const f of T.fish) expect(Math.abs(f.x)).toBeLessThanOrEqual(T.tank.L);
  });
});
