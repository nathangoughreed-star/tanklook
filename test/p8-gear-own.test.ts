// Lane P8: the gear model (scene/gearOwn.ts): operations, migration round trip, locks that Suggest keeps, an owned heater Suggest credits at $0.
import { describe, expect, it } from 'vitest';
import { GENERIC, emptyGear, gearOf, gearWants, inUseOf, isLockedItem, isOwned, legacyOf, lockItem, lockedGearParts, migrateGear, mustUse, mustUseAll, ownedFor, ownedList, ownItem, parseGear, reconcileGear, setGear, setInUse, unlockItem, unownItem } from '../src/scene/gearOwn';
import { briefToWants, emptyBrief } from '../src/scene/brief';
import { removeEquipment, setEquipment, setOwnedUse } from '../src/scene/project';
import { lockObject } from '../src/scene/locks';
import { emptyScene } from '../src/scene/defaults';
import { defaultProfile } from '../src/demand/types';
import { ownedAssess, suggestSetups } from '../src/demand/suggest';
import { buildsFor } from '../src/scene/builds';
import { HEATER_PRODUCTS } from '../src/data/gearCatalog';

const P = defaultProfile(), NOW = Date.parse('2026-11-02'), cap = (value: number) => ({ on: true, value });

describe('operations', () => {
  it('own / unown: first owned item becomes the one in use; unowning moves use on', () => {
    let g = ownItem(emptyGear(), 'heater', 'h1');
    expect(ownedFor(g, 'heater')).toEqual(['h1']); expect(inUseOf(g, 'heater')).toBe('h1');
    g = ownItem(g, 'heater', 'h2'); expect(inUseOf(g, 'heater')).toBe('h1');
    g = unownItem(g, 'heater', 'h1'); expect(ownedFor(g, 'heater')).toEqual(['h2']); expect(inUseOf(g, 'heater')).toBe('h2');
    g = unownItem(g, 'heater', 'h2'); expect(g).toEqual({});
  });
  it('in use is independent of ownership (a bought item can be in use)', () => {
    const g = setInUse(ownItem(emptyGear(), 'filter', 'f1'), 'filter', 'bought');
    expect(inUseOf(g, 'filter')).toBe('bought'); expect(isOwned(g, 'filter', 'bought')).toBe(false); expect(ownedFor(g, 'filter')).toEqual(['f1']);
    expect(inUseOf(setInUse(g, 'filter', undefined), 'filter')).toBeUndefined();
  });
  it('lock is independent of ownership and survives unowning; unlock removes it', () => {
    let g = lockItem(emptyGear(), 'light', 'L9');
    expect(mustUse(g, 'light')).toEqual({ item: 'L9', owned: false }); expect(isOwned(g, 'light', 'L9')).toBe(false);
    g = ownItem(g, 'light', 'L9'); expect(mustUse(g, 'light')).toEqual({ item: 'L9', owned: true });
    g = unownItem(g, 'light', 'L9'); expect(isLockedItem(g, 'light', 'L9')).toBe(true);
    g = unlockItem(g, 'light', 'L9'); expect(g).toEqual({});
    expect(mustUse(g, 'light')).toBeUndefined();
  });
  it('mustUse prefers the locked item in use; ownedList / mustUseAll read across categories', () => {
    let g = ownItem(ownItem(emptyGear(), 'heater', 'a'), 'heater', 'b');
    g = lockItem(lockItem(g, 'heater', 'a'), 'heater', 'b'); g = setInUse(g, 'heater', 'b');
    expect(mustUse(g, 'heater')!.item).toBe('b');
    g = ownItem(g, 'filter', GENERIC);
    expect(ownedList(g).map(x => `${x.cat}:${x.item}:${x.inUse}`)).toEqual(['heater:a:false', 'heater:b:true', 'filter:generic:true']);
    expect(mustUseAll(g)).toEqual([{ cat: 'heater', item: 'b', owned: true }]);
  });
  it('parseGear validates, drops junk, and is idempotent', () => {
    const g = ownItem(lockItem(emptyGear(), 'heater', 'x'), 'heater', 'x');
    expect(parseGear(JSON.parse(JSON.stringify(g)))).toEqual(g);
    expect(parseGear({ heater: { owned: [1, 'a'], locked: 'no', use: 7 }, '': {}, bad: 3 })).toEqual({ heater: { owned: ['a'], locked: [] } });
    expect(parseGear(null)).toBeUndefined(); expect(parseGear({})).toBeUndefined();
  });
});

describe('brief storage and migration', () => {
  const H = HEATER_PRODUCTS[0].id;
  it('survives a save / load round trip (project.gear) and projects to the older fields', () => {
    const g = lockItem(ownItem(emptyGear(), 'heater', H), 'heater', H);
    const b = setGear(emptyBrief(), g), re = JSON.parse(JSON.stringify(b));
    expect(gearOf(re)).toEqual(g);
    expect(legacyOf(g)).toEqual({ owned: { heater: H }, use: { heater: 'required' } });
    expect(b.items['constraints.owned']).toMatchObject({ value: { heater: H } });
  });
  it('an old save (constraints.owned + project.use + existingTank) maps in, and back out unchanged', () => {
    let b = setEquipment(emptyBrief(), 'tank', { model: 'm20' });
    b = setEquipment(b, 'heater', { pick: H, use: 'required' });
    b = setEquipment(b, 'filter', { pick: 'care' });
    const g = migrateGear(b);
    expect(g).toEqual({ tank: { owned: ['m20'], locked: [], use: 'm20' }, heater: { owned: [H], locked: [H], use: H }, filter: { owned: ['care'], locked: [], use: 'care' } });
    const L = legacyOf(g);
    expect(L.owned).toEqual({ heater: H, filter: 'care' }); expect(L.tank).toBe('m20');
    expect(L.use).toMatchObject({ heater: 'required', filter: 'available', tank: 'available' });
    expect(migrateGear(setGear(b, g))).toEqual(g);
    expect(gearOf(emptyBrief())).toEqual({});
  });
  it("the scene's owned flags and Discover's gear lock fold into the model", () => {
    const S = emptyScene().tanks[0]; S.light.owned = true; S.light.product = 'L1';
    lockObject(S, 'light');
    const g = migrateGear(emptyBrief(), S);
    expect(g.light).toEqual({ owned: ['L1'], locked: ['L1'], use: 'L1' });
    expect(lockedGearParts(g)).toEqual(['light']);
  });
  it('older-field edits (the Equipment sheet) are folded into an existing model', () => {
    let b = setGear(emptyBrief(), lockItem(ownItem(ownItem(emptyGear(), 'heater', 'a'), 'heater', 'b'), 'heater', 'z'));
    b = setEquipment(b, 'heater', { pick: 'c' });
    expect(ownedFor(gearOf(b), 'heater')).toContain('c'); expect(isLockedItem(gearOf(b), 'heater', 'z')).toBe(true);
    b = setOwnedUse(b, 'heater', 'required'); expect(mustUse(gearOf(b), 'heater')!.owned).toBe(true);
    b = removeEquipment(b, 'heater'); expect(isOwned(gearOf(b), 'heater', 'c')).toBe(false);
    expect(reconcileGear(emptyBrief())).toEqual(emptyBrief());
  });
});

describe('Suggest reads the model', () => {
  const base = suggestSetups({ constraints: { startupUsd: cap(5000) }, animals: [{ species: 'betta', n: 1 }] }, P, 'in', NOW).proposals[0];
  const b = buildsFor(base.build.animals, base.build.tank, NOW).find(x => x.id === base.build.id) ?? base.build;
  const tiny = [...HEATER_PRODUCTS].sort((a, c) => a.watts - c.watts)[0], big = [...HEATER_PRODUCTS].sort((a, c) => c.watts - a.watts)[0];

  it('no owned items and no locks: wants are exactly what they were', () => {
    expect(briefToWants(emptyBrief())).toEqual(briefToWants(setGear(emptyBrief(), emptyGear())));
    expect(gearWants(emptyBrief())).toEqual({ requiredOwned: [], lockedGear: {} });
  });
  it('an owned heater is credited at $0 over a bought one', () => {
    const w = briefToWants(setGear(emptyBrief(), ownItem(emptyGear(), 'heater', 'care')));
    const own = ownedAssess(b, w.owned ?? {}, true, P), none = ownedAssess(b, {}, true, P);
    expect(w.owned).toEqual({ heater: 'care' }); expect(own.saved).toBeGreaterThan(none.saved);
    expect(own.rows).toContain('heater');
  });
  it('a locked owned item is Required (kept); a locked UNOWNED item is kept and priced as bought', () => {
    const wo = briefToWants(setGear(emptyBrief(), lockItem(ownItem(emptyGear(), 'heater', tiny.id), 'heater', tiny.id)));
    expect(wo.requiredOwned).toEqual(['heater']);
    const kept = ownedAssess(b, wo.owned!, true, P, false, { required: wo.requiredOwned });
    expect(kept.notes.some(n => /You marked it Required/.test(n.text))).toBe(true);
    const wu = briefToWants(setGear(emptyBrief(), lockItem(emptyGear(), 'heater', big.id)));
    expect(wu.lockedGear).toEqual({ heater: big.id }); expect(wu.owned).toBeUndefined();
    const locked = ownedAssess(b, {}, true, P, false, { locked: wu.lockedGear }), none = ownedAssess(b, {}, true, P);
    expect(locked.saved).toBe(none.saved);
    expect(locked.notes.some(n => /Locked:/.test(n.text))).toBe(true);
  });
  it('the whole generator accepts the lock', () => {
    const w = briefToWants(setGear(emptyBrief(), lockItem(emptyGear(), 'heater', big.id)));
    const r = suggestSetups({ ...w, constraints: { ...w.constraints, startupUsd: cap(5000) }, animals: [{ species: 'betta', n: 1 }] }, P, 'in', NOW);
    expect(r.proposals.length).toBeGreaterThan(0);
  });
});
