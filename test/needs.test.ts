// Lane GV2 (2026-10-30): the tool assumes nothing until a species or plant needs it. needsOf, the stock-first tank's gear, the priced light tiers.
import { describe, expect, it } from 'vitest';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import { needsOf, basicLight, lightFor, withNeedGear } from '../src/demand/needs';
import { bareSetup } from '../src/scene/defaults';
import { makeItem } from '../src/scene/items';
import { IN } from '../src/scene/physics';
import { filterState, inferTech, keepSet, techOf, tempEvidence, withChoice, withUnits, type TechSetup } from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';

const P = defaultProfile();
const F = (f: number) => (f - 32) * 5 / 9;
/** A tank started from its animals: `species` in a 20 gal long (30 x 12 x 12 in), the room at `roomF` deg F. */
function tankOf(species: string[], roomF?: number, wet = true): TankSetup {
  const S = bareSetup();
  S.tank = { L: 30 * IN, H: 12 * IN, D: 12 * IN }; S.stockFirst = true; S.water.on = wet;
  S.fish = species.map((sp, i) => ({ id: i + 1, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
  if (roomF !== undefined) S.tech = { rows: {}, roomC: F(roomF) } as TechSetup;
  return S;
}
/** A 40 gal (36 x 16 x 16 in): deep enough that the cheapest light gives about 34 PAR at the substrate. */
const deep = (S: TankSetup) => { S.tank = { L: 36 * IN, H: 16 * IN, D: 16 * IN }; return S; };
const plant = (S: TankSetup, variant: string, id: number) => { S.items.push(makeItem(S.tank, variant, id, 1, 0.5 * S.tank.L, 0.5 * S.tank.D)); return S; };
const kinds = (S: TankSetup) => needsOf(S).map(n => n.kind);
const rowOf = (S: TankSetup, key: string) => demandOf(S, P).items.find(i => i.key === key);

describe('need-driven gear', () => {
  it('an empty stock-first tank needs nothing', () => {
    const S = tankOf([]);
    expect(needsOf(S)).toEqual([]);
    expect(inferTech(S).rows.filter).toBe('none'); expect(inferTech(S).rows.heater).toBe('none');
  });
  it('neon tetras in a 68 deg F room need a heater; at 76 deg F they do not', () => {
    const cold = needsOf(tankOf(['neon', 'neon', 'neon'], 68)).find(n => n.kind === 'heater');
    expect(cold).toBeTruthy(); expect(cold!.species).toEqual(['neon']); expect(cold!.fix!.deltaUsd).toBeGreaterThan(0);
    expect(cold!.why).toContain('°F');
    expect(kinds(tankOf(['neon', 'neon', 'neon'], 76))).not.toContain('heater');
    expect(inferTech(tankOf(['neon'], 68)).rows.heater).toBe('one'); expect(inferTech(tankOf(['neon'], 76)).rows.heater).toBe('none');
  });
  it('an unset room is assumed 70 deg F and says so', () => {
    const n = needsOf(tankOf(['cardinal'])).find(x => x.kind === 'heater')!;
    expect(n.why).toContain('assumed');
  });
  it('the heater and filter reach the price only once a species needs them', () => {
    expect(rowOf(tankOf([]), 'heater')).toBeUndefined(); expect(rowOf(tankOf([]), 'filter')).toBeUndefined();
    const S = tankOf(['cardinal', 'cardinal'], 68);
    expect(rowOf(S, 'heater')?.setup?.mode).toBeGreaterThan(5); expect(rowOf(S, 'filter')?.setup?.mode).toBeGreaterThan(5);
    expect(rowOf(tankOf(['cardinal'], 80), 'heater')).toBeUndefined();
  });
  it('isopods in a terrarium need no filter', () => {
    const S = tankOf(['zebraisopod'], undefined, false);
    expect(kinds(S)).not.toContain('filter'); expect(kinds(S)).not.toContain('heater');
    expect(rowOf(S, 'filter')).toBeUndefined();
  });
  it('an owned heater satisfies the heater need at $0', () => {
    const S = tankOf(['neon'], 68);
    S.tech = { ...S.tech!, rows: { heater: 'one' }, heaters: [{ product: 'topfin-50', owned: true, paidUsd: 14 }] };
    const n = needsOf(S).find(x => x.kind === 'heater')!;
    expect(n.have).toBe(true); expect(n.fix).toBeUndefined();
    expect(rowOf(S, 'heater')?.setup).toBeUndefined();
  });
  it('a brief pick of an owned heater satisfies the need', () => {
    const S = tankOf(['neon'], 68);
    const brief = { items: { 'constraints.owned': { value: { heater: 'topfin-50' } } } } as never;
    expect(needsOf(S, brief).find(x => x.kind === 'heater')!.have).toBe(true);
  });
  it('the tank need names the smallest comfortable tank for the roster', () => {
    const S = tankOf(Array(12).fill('neon'));
    S.tank = { L: 18 * IN, H: 10 * IN, D: 10 * IN };
    const n = needsOf(S).find(x => x.kind === 'tank')!;
    expect(n.have).toBe(false); expect(n.fix!.deltaUsd).toBeGreaterThan(0);
  });
});

describe('light tiers', () => {
  it('starts basic: the cheapest catalogue light that fits, priced in', () => {
    const S = tankOf(['cardinal'], 68), b = basicLight(S)!;
    expect(b.tier).toBe('basic'); expect(b.priceUsd).toBeLessThan(40);
    expect(rowOf(S, 'light')?.setup?.mode).toBeLessThan(60);
    expect(needsOf(S).some(n => n.kind === 'light')).toBe(false);
    expect(lightFor(S)!.product.id).toBe(b.product.id);
  });
  it('a high-light carpet raises the tier and brings CO2 and ferts, with a $ delta', () => {
    const S = deep(tankOf(['cardinal'], 68)), before = demandOf(S, P).totals.setupUsd;
    plant(S, 'carpet', 90);
    const needs = needsOf(S), light = needs.find(n => n.kind === 'light')!;
    expect(lightFor(S)!.tier).toBe('planted');
    expect(light.fix!.deltaUsd).toBeGreaterThan(0); expect(needs.some(n => n.kind === 'co2')).toBe(true); expect(needs.some(n => n.kind === 'ferts')).toBe(true);
    expect(withNeedGear(S).grow.feed).toBe('co2');
    expect(rowOf(S, 'co2')).toBeTruthy();
    expect(demandOf(S, P).totals.setupUsd).toBeGreaterThan(before + light.fix!.deltaUsd * 0.9);
  });
  it('an owned light satisfies the light need', () => {
    const S = plant(deep(tankOf(['cardinal'], 68)), 'carpet', 90);
    const brief = { items: { 'constraints.owned': { value: { light: 'some-light' } } } } as never;
    expect(needsOf(S, brief).find(n => n.kind === 'light')!.fix).toBeUndefined();
  });
  it('techOf keeps filterState unset until a species needs it', () => { expect(filterState(tankOf(['neon'], 68))).toBe('unset'); expect(techOf(tankOf(['neon'], 68)).rows.filter).not.toBe('none'); });
});

describe('the Tech panel and the price agree', () => {
  it('a plant that requires CO2 and ferts sets the inferred CO2 and ferts rows', () => {
    const S = plant(deep(tankOf(['cardinal'], 68)), 'carpet', 90), r = techOf(S).rows;
    expect(r.co2).toBe('pressurized'); expect(r.ferts).not.toBe('none');
    expect(techOf(deep(tankOf(['cardinal'], 68))).rows.co2).toBe('none');
  });
  it("the brief's room temperature is the room in the tech and the temperature checks", () => {
    const S = tankOf(['cardinal']); S.brief = { v: 2, items: { 'constraints.roomTempC': { status: 'hard', value: 20 } } } as never;
    expect(techOf(S).roomC).toBe(20); expect(tempEvidence(S)!.room).toBe(20); expect(tempEvidence(S)!.roomSet).toBe(true);
    S.tech = { rows: {}, roomC: 25 } as TechSetup; expect(techOf(S).roomC).toBe(25);
  });
});

// Lane GV9 fix 6: a Tech-menu edit saves only the rows the person set, so need-driven gear keeps following the animals and the room.
describe('Tech-menu edits keep untouched rows inferred', () => {
  it('a heater added for a 68 deg F room goes when the room is raised to 76 deg F in the Tech menu', () => {
    const S = tankOf(['neon', 'neon', 'neon'], 68);
    expect(techOf(S).rows.heater).toBe('one');
    S.tech = keepSet(S, { ...techOf(S), roomC: F(76) }); // the Tech menu's room box
    expect(S.tech.rows).toEqual({});
    expect(techOf(S).rows.heater).toBe('none');
    expect(needsOf(S).some(n => n.kind === 'heater')).toBe(false);
    S.tech = keepSet(S, { ...techOf(S), roomC: F(68) }); // and back
    expect(techOf(S).rows.heater).toBe('one');
  });
  it('a row the person edited stays as set; the other rows still follow', () => {
    const S = tankOf(['neon', 'neon', 'neon'], 68);
    S.tech = keepSet(S, withChoice(S, 'air', 'airstone'));
    expect(Object.keys(S.tech.rows)).toEqual(['air']);
    S.tech = keepSet(S, withUnits(techOf(S), 'heater', [{ w: 50 }])); // a heater unit set by hand
    S.tech = keepSet(S, { ...techOf(S), roomC: F(76) });
    expect(techOf(S).rows.heater).toBe('one');
    expect(techOf(S).rows.air).toBe('airstone');
    expect(S.tech.rows.filter).toBeUndefined(); // never touched: still the inferred filter
    expect(techOf(S).rows.filter).toBe(inferTech(S).rows.filter);
  });
});
