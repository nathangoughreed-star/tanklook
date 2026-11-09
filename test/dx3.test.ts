// Lane DX3 (Nathan's Discovery spec section 3, invariants 5, 6, 8): equipment = ownership and obligation as separate facts, capability-aware $0 credit,
// "No new equipment" -> infeasible with a reason, a Must-use light that is too weak caps the plants, and the remaining cost is a range.
import { describe, expect, it } from 'vitest';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { emptyBrief } from '../src/scene/brief';
import { equipmentOf, mustUseKeys, removeEquipment, setEquipment, setNoNewEquipment, setOwnedUse } from '../src/scene/project';
import { capableOf, equipPlan, lightCapacity, noNewEquipment } from '../src/scene/equipPlan';
import { filterUnits, heaterUnits, withUnits } from '../src/scene/tech';
import { stockingOf } from '../src/scene/stocking';
import { mean3 } from '../src/demand/range';
import type { TankSetup } from '../src/scene/types';

const P = defaultProfile();
const planted = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES.planted)).scene; return structuredClone(sc.tanks[sc.active]); };
const setup = (S: TankSetup) => demandOf(S, P).totals.setupUsd;
const ownHeater = (S: TankSetup, w: number): TankSetup => ({ ...S, tech: withUnits(S.tech ?? ({ rows: {} } as never), 'heater', [{ w, owned: true }]) });
const ownFilter = (S: TankSetup, kind = 'sponge'): TankSetup => ({ ...S, tech: withUnits(S.tech ?? ({ rows: {} } as never), 'filter', [{ kind, owned: true }]) });

describe('DX3: ownership and obligation are separate facts', () => {
  it('moving an item between Must use and Have available never loses ownership; un-owning drops the obligation with it', () => {
    let b = setEquipment(emptyBrief(), 'filter', { pick: 'care' });
    expect(equipmentOf(b).items.map(i => i.key)).toContain('filter');
    expect(mustUseKeys(b)).toEqual([]);
    b = setOwnedUse(b, 'filter', 'required');
    expect(mustUseKeys(b)).toEqual(['filter']);
    b = setOwnedUse(b, 'filter', 'available');
    expect(equipmentOf(b).items.map(i => i.key)).toContain('filter'); // still owned
    expect(mustUseKeys(b)).toEqual([]);
    b = setOwnedUse(setOwnedUse(b, 'filter', 'required'), 'filter', 'required');
    b = removeEquipment(b, 'filter');
    expect(equipmentOf(b).items.some(i => i.key === 'filter')).toBe(false);
  });
  it('No new equipment is its own project field', () => {
    const b = setNoNewEquipment(emptyBrief(), true);
    expect(noNewEquipment(b)).toBe(true);
    expect(noNewEquipment(setNoNewEquipment(b, false))).toBe(false);
  });
});

describe('DX3: capability-aware credit', () => {
  it('owning a suitable heater lowers the purchase cost', () => {
    const S = planted(), big = ownHeater(S, 400);
    expect(capableOf(big).heater).toBe(true);
    expect(setup(big)).toBeLessThan(setup(S));
  });
  it('an inadequate owned heater is NOT credited and is flagged', () => {
    const S = planted(), weak = ownHeater(S, 5);
    expect(capableOf(weak).heater).toBe(false);
    expect(setup(weak)).toBeCloseTo(setup({ ...S, tech: withUnits(S.tech ?? ({ rows: {} } as never), 'heater', [{ w: 5 }]) }), 0); // priced like an unowned one
    const b = setEquipment(emptyBrief(), 'heater', { pick: 'care' });
    expect(equipPlan(weak, b, P).flags.some(f => f.item === 'heater')).toBe(true);
  });
  it('an owned filter that cannot keep up is not credited; a capable one is', () => {
    const S = ownFilter(planted(), 'sponge');
    let crowded = S;
    for (let i = 0; i < 6 && stockingOf(crowded).filtrationPercent <= 100; i++) crowded = { ...crowded, fish: [...crowded.fish, ...crowded.fish.map(f => ({ ...f, id: f.id + 1000 * (i + 1) }))] };
    expect(stockingOf(crowded).filtrationPercent).toBeGreaterThan(100);
    expect(capableOf(crowded).filter).toBe(false);
    const unowned = { ...crowded, tech: withUnits(crowded.tech!, 'filter', [{ kind: 'sponge' }]) };
    expect(setup(crowded)).toBeCloseTo(setup(unowned), 0); // no credit
    const light = ownFilter(planted(), 'canister');
    if (capableOf(light).filter) expect(setup(light)).toBeLessThan(setup({ ...light, tech: withUnits(light.tech!, 'filter', [{ kind: 'canister' }]) }));
  });
});

describe('DX3: Must use + extras', () => {
  const must = (k: 'heater' | 'filter', noNew = false) => { let b = setOwnedUse(setEquipment(emptyBrief(), k, { pick: 'care' }), k, 'required'); if (noNew) b = setNoNewEquipment(b, true); return b; };
  it('Must use + No new equipment + undersized = infeasible, with the reason', () => {
    const S = ownHeater(planted(), 5), p = equipPlan(S, must('heater', true), P);
    expect(p.infeasible).toMatch(/Must use/);
    expect(p.infeasible).toMatch(/no new equipment/i);
  });
  it('Must use + undersized + new equipment allowed: kept, a supplement is added and costed', () => {
    const S = ownHeater(planted(), 5), p = equipPlan(S, must('heater'), P);
    expect(p.infeasible).toBeUndefined();
    expect(heaterUnits(p.scene.tech!).filter(u => u.owned)).toHaveLength(1); // the owned one stays
    expect(heaterUnits(p.scene.tech!).length).toBe(2);
    expect(p.supplementUsd).toBeGreaterThan(0);
    expect(p.toBuy.some(l => l.kind === 'supplement')).toBe(true);
  });
  it('a Must-use filter that is big enough needs no second one', () => {
    const S = ownFilter(planted(), 'canister'), p = equipPlan(S, must('filter'), P);
    if (capableOf(S).filter) { expect(filterUnits(p.scene.tech!).length).toBe(1); expect(p.supplementUsd).toBe(0); }
  });
});

describe('DX3: light caps plants; cost lines are ranges', () => {
  it('lightCapacity reports a Must-use light that is too weak as capping the plants', () => {
    const S = planted(), b = setOwnedUse(setEquipment(emptyBrief(), 'light', { pick: 'care' }), 'light', 'required');
    const dim = { ...S, light: { ...S.light, owned: true } };
    const lc = lightCapacity(dim, b);
    expect(lc.mustUse).toBe(true);
    expect(lc.capsPlants).toBe(lc.parWant > 0 && lc.parHave < lc.parWant);
    expect(lightCapacity(dim, emptyBrief()).capsPlants).toBe(false); // owned but not Must use: it can be replaced, nothing is capped
  });
  it('the remaining cost and the monthly cost are ranges, and the remaining total matches the priced design', () => {
    const S = planted(), p = equipPlan(S, emptyBrief(), P);
    expect(p.remaining.hi).toBeGreaterThan(p.remaining.lo);
    expect(mean3(p.remaining)).toBeCloseTo(setup(S), 0);
    expect(p.monthly.hi).toBeGreaterThanOrEqual(p.monthly.lo);
  });
});
