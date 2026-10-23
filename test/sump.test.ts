import { describe, expect, it } from 'vitest';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { bareSetup } from '../src/scene/defaults';
import { volume } from '../src/scene/physics';
import { stockingOf } from '../src/scene/stocking';
import { tankMinimum } from '../src/scene/tankMin';
import { fitIn, tankFor, type AnimalCount } from '../src/scene/tankfit';
import { buildsFor } from '../src/scene/builds';
import { applyPreset, optionCost, parseTech, SUMP_MODELS, sumpLitres, sumpOf, sumpOffered, withUnits, type TechSetup } from '../src/scene/tech';
import { demandOf, defaultProfile } from '../src/demand';
import type { Fish, TankSetup } from '../src/scene/types';

// Lane SU (Nathan 2026-10-22): the sump is a second tank under the display, sized from the tank presets or a custom size,
// in its own Tech section; tankfit and the builds offer it on the same tanks.
const NOW = Date.parse('2026-10-22');
const tankOf = (id: string, animals: AnimalCount[] = [], salt = false, tech?: TechSetup): TankSetup => {
  const S = bareSetup();
  S.tank = tankFromModel(getTankModel(id)!);
  S.water.on = true; S.water.level = 0.9; S.water.salt = salt;
  let k = 1;
  S.fish = animals.flatMap(a => Array.from({ length: a.n }, (): Fish => ({ id: k++, species: a.species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 })));
  if (tech) S.tech = tech;
  return S;
};
const sumpTech = (sump?: TechSetup['sump']): TechSetup => ({ ...withUnits({ rows: {} }, 'filter', [{ kind: 'sump' }]), ...(sump ? { sump } : {}) });

describe('SU: the sump size is saved on the tech', () => {
  it('reads a preset sump by its model, a custom size clamped, and drops junk', () => {
    const T = tankFromModel(getTankModel('g20l')!);
    expect(parseTech({ rows: { filter: 'sump' }, sump: { model: 'g20l', L: 1, D: 1, H: 1 } })?.sump).toEqual({ model: 'g20l', L: T.L, D: T.D, H: T.H });
    expect(parseTech({ rows: { filter: 'sump' }, sump: { L: 600, D: 9999, H: 10 } })?.sump).toEqual({ L: 600, D: 3000, H: 50 });
    expect(parseTech({ rows: { filter: 'sump' }, sump: { model: 'nope' } })?.sump).toBeUndefined();
    expect(parseTech({ rows: { filter: 'sump' }, sump: 'big' })?.sump).toBeUndefined();
  });
  it('an older file (a sump filter, no size) still loads, and gets the default sump', () => {
    const t = parseTech({ rows: { filter: 'sump' } })!;
    expect(t.rows.filter).toBe('sump');
    expect(t.sump).toBeUndefined();
    const S = tankOf('g75', [], true, t), d = sumpOf(S)!;
    expect(d).toBeDefined();
    expect(volume({ ...S.tank, ...d }).litres).toBeGreaterThanOrEqual(0.25 * volume(S.tank).litres);
    expect(d.L).toBeLessThanOrEqual(S.tank.L); // fits under the display's stand
  });
  it('no sump filter, no sump', () => {
    expect(sumpOf(tankOf('g75', [], true, { rows: { filter: 'canister' }, sump: { model: 'g20l', L: 1, D: 1, H: 1 } }))).toBeUndefined();
  });
  it('a preset keeps the sump size', () => {
    const S = tankOf('g75', [], true, { ...sumpTech({ model: 'g40b', L: 1, D: 1, H: 1 }) });
    expect(applyPreset(S, 'lps').sump?.model).toBe('g40b');
  });
});

describe('SU: the sump water counts for dilution, not for swimming room', () => {
  const fish = [{ species: 'yellowtang', n: 3 }];
  const small = tankOf('g75', fish, true, sumpTech({ model: 'g10', ...tankFromModel(getTankModel('g10')!) }));
  const big = tankOf('g75', fish, true, sumpTech({ model: 'g40b', ...tankFromModel(getTankModel('g40b')!) }));
  it('a bigger sump lowers the filtration bar; space and the tank minimum do not move', () => {
    expect(sumpLitres(big)).toBeGreaterThan(sumpLitres(small));
    expect(stockingOf(big).filtrationPercent).toBeLessThan(stockingOf(small).filtrationPercent);
    expect(stockingOf(big).spacePercent).toBeCloseTo(stockingOf(small).spacePercent, 6);
    expect(tankMinimum(big).percent).toBeCloseTo(tankMinimum(small).percent, 6);
  });
  it('the weekly water change is of the whole system: a sump adds gallons to change', () => {
    const wc = (S: TankSetup) => demandOf(S, defaultProfile(), { now: NOW }).items.find(r => r.key === 'waterchange')!.label;
    const gal = (S: TankSetup) => demandOf(S, defaultProfile(), { now: NOW }).items.find(r => r.key === 'waterchange')!;
    expect(wc(big)).toMatch(/Water changes/);
    expect(gal(big).minutes!.mode).toBeGreaterThan(gal(small).minutes!.mode);
  });
});

describe('SU: the sump priced as gear rows', () => {
  it('the sump tank (by its size), its plumbing and the return pump', () => {
    const S = tankOf('g75', [], true, sumpTech({ model: 'g20l', ...tankFromModel(getTankModel('g20l')!) }));
    const B = tankOf('g75', [], true, sumpTech({ model: 'g40b', ...tankFromModel(getTankModel('g40b')!) }));
    const c = optionCost(S, 'filter', 'sump'), gears = c.parts.map(p => p.gear);
    expect(gears).toEqual(expect.arrayContaining(['sump', 'plumbing', 'returnpump']));
    const tankPart = (x: typeof c) => x.parts.find(p => p.gear === 'sump')!;
    expect(tankPart(c).setup!.mode).toBeGreaterThan(0);
    expect(tankPart(c).est).toBe(false);
    expect(tankPart(optionCost(B, 'filter', 'sump')).setup!.mode).toBeGreaterThan(tankPart(c).setup!.mode);
  });
});

describe('SU: tankfit and the builds offer a sump on the same tanks', () => {
  it('any wet tank (Nathan 2026-10-23: "offer it on any tank. Why not?")', () => {
    for (const [id, salt] of [['g2_5', true], ['g20l', true], ['g55', false], ['g10', false], ['g180', false]] as const) expect(sumpOffered(tankOf(id, [], salt)), id).toBe(true);
    const dry = tankOf('g20l'); dry.water.on = false;
    expect(sumpOffered(dry)).toBe(false);
  });
  it("tankfit's fallback filter (none meets the target) is the one with the lowest filtration, as the builds' (not the highest rated capacity)", () => {
    for (const [a, id] of [[[{ species: 'mystery', n: 50 }], 'g2_5'], [[{ species: 'turbo', n: 12 }], 'g15'], [[{ species: 'oscar', n: 25 }], 'c8']] as const) {
      const f = fitIn([...a], id)!, best = Math.min(...buildsFor([...a], getTankModel(id)!, NOW).map(b => b.filtrationPct));
      expect(f.filtrationPct, `${a[0].species} in ${id}`).toBeLessThanOrEqual(best + 0.5);
    }
  });
  const cases: AnimalCount[][] = [[{ species: 'yellowtang', n: 6 }], [{ species: 'bluetang', n: 3 }], [{ species: 'oscar', n: 3 }], [{ species: 'turbo', n: 12 }]];
  it('the tank tankFor picks has a build that carries the stocking (no sump counted that builds never offer)', () => {
    for (const a of cases) {
      const fit = tankFor(a)!;
      if (fit.fails.length) continue;
      const bs = buildsFor(a, fit.tank, NOW);
      expect(Math.min(...bs.map(b => b.filtrationPct)), `${a[0].species} x${a[0].n} in ${fit.tank.id}`).toBeLessThanOrEqual(100);
    }
  });
  it('a salt stocking that needs one gets a sump build', () => {
    const a = [{ species: 'yellowtang', n: 6 }], fit = tankFor(a)!;
    const b = buildsFor(a, getTankModel('g55')!, NOW).find(x => x.id === 'balanced')!;
    expect(b.setup.tech?.rows.filter).toBe('sump');
    expect(b.gear[0]).toMatch(/^Filter: Sump \(15 gal tank, \d+ L of water\) \+ return pump$/);
    expect(fit.fails).toEqual([]);
  });
});

describe('SU: coordinator review', () => {
  it('the plan counts the sump once (in the Filtration row): canister + sump costs the canister plus the sump unit', () => {
    // the same skimmer on both (lane SF: an unset skimmer follows the filters, so only the sump unit differs)
    const can = tankOf('g75', [], true, withUnits({ rows: { skimmer: 'hob' } }, 'filter', [{ kind: 'canister' }]));
    const both = tankOf('g75', [], true, { ...withUnits({ rows: { skimmer: 'hob' } }, 'filter', [{ kind: 'canister' }, { kind: 'sump' }]), sump: { model: 'g20h', ...tankFromModel(getTankModel('g20h')!) } });
    const usd = (S: TankSetup) => demandOf(S, defaultProfile(), { now: NOW }).totals.setupUsd;
    const sumpUnit = optionCost(both, 'filter', 'sump', { tech: { ...both.tech!, filters: [{ kind: 'sump' }] } });
    const mean = (r: { lo: number; mode: number; hi: number }) => (r.lo + r.mode + r.hi) / 3;
    expect(Math.abs(usd(both) - usd(can) - mean(sumpUnit.setup))).toBeLessThan(mean(sumpUnit.setup) * 0.05);
  });
  it('the sump sizes start at 5 gal (lane SF, Nathan 2026-10-23; was 10)', () => {
    expect(Math.min(...SUMP_MODELS.map(m => m.ratedGal))).toBe(5);
    expect(parseTech({ rows: {}, sump: { model: 'g2_5' } })?.sump).toBeUndefined();
  });
});

describe('SU: a sump is one filter unit among the others (Nathan 2026-10-23)', () => {
  it('adding a sump keeps the other filters; one sump per tank', () => {
    const t = withUnits({ rows: {} }, 'filter', [{ kind: 'canister' }, { kind: 'hob' }, { kind: 'sump' }]);
    const S = tankOf('g75', [], true, t);
    expect(sumpOf(S)).toBeDefined();
    expect(stockingOf(S).filtrationPercent).toBeGreaterThanOrEqual(0);
    expect(withUnits(t, 'filter', [...t.filters!, { kind: 'sump' }]).filters!.filter(u => u.kind === 'sump').length).toBe(1);
  });
});
