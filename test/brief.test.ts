// Setup brief (lane U1): items, status, serialisation, the Wants adapter, and travelling with the project (save / load / undo).
import { describe, expect, it } from 'vitest';
import { briefFromWants, briefToWants, clearItem, emptyBrief, getItem, isSpecified, lock, lockedIds, hardIds, openGroups, parseBrief, serializeBrief, setItem, setOff, taxPct, unlock, valueOf } from '../src/scene/brief';
import type { Wants } from '../src/demand/suggest';
import { defaultScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';
import { Store } from '../src/scene/store';

const WANTS: Wants = {
  kinds: ['freshwater', 'vivarium'], groups: ['herp'], owned: { filter: 'care', heater: 'unknown', light: 'x' }, needStand: false,
  constraints: { startupUsd: { on: true, value: 400 }, monthlyUsd: { on: false, value: 20 }, minutesPerWeek: { on: true, value: 45 }, space: { on: true }, effort: 'low', experience: 1 },
  space: { w: 900, d: 400, h: 600 }, tags: ['calm', 'natural'],
};

describe('setup brief', () => {
  it('set / lock / unlock / clear', () => {
    let b = setItem(emptyBrief(), 'constraints.budget', 300, 'hard');
    b = setItem(b, 'appearance.look', 'iwagumi');
    expect(getItem(b, 'appearance.look')?.status).toBe('preference');
    b = lock(b, 'appearance.look');
    expect(lockedIds(b)).toEqual(['appearance.look']);
    b = setItem(b, 'appearance.look', 'dutch'); // a new value keeps the lock
    expect(getItem(b, 'appearance.look')).toEqual({ value: 'dutch', status: 'locked' });
    b = unlock(unlock(b, 'appearance.look'), 'constraints.budget'); // a hard constraint is not a lock
    expect(getItem(b, 'constraints.budget')?.status).toBe('hard');
    expect(hardIds(b)).toEqual(['constraints.budget']);
    expect(lockedIds(b)).toEqual([]);
    expect(clearItem(b, 'constraints.budget').items['constraints.budget']).toBeUndefined();
    expect(b.items['constraints.budget']).toBeDefined(); // immutable
  });
  it('groups: specified / open; off items do not count; tax defaults to 0', () => {
    let b = emptyBrief();
    expect(openGroups(b)).toHaveLength(5);
    expect(taxPct(b)).toBe(0);
    b = setItem(b, 'constraints.careMin', 30, 'hard'); b = setItem(b, 'animals.kinds', ['saltwater']);
    expect(isSpecified(b, 'constraints')).toBe(true);
    expect(openGroups(b)).toEqual(['appearance', 'equipment', 'preferences']);
    b = setOff(b, 'constraints.careMin', true);
    expect(isSpecified(b, 'constraints')).toBe(false);
    expect(valueOf(b, 'constraints.careMin')).toBeUndefined();
    expect(getItem(b, 'constraints.careMin')?.value).toBe(30);
    expect(taxPct(setItem(b, 'constraints.taxPct', 8.25))).toBe(8.25);
  });
  it('serialisation round-trip; junk is dropped, empty is undefined', () => {
    const b = briefFromWants(WANTS);
    const c = setItem(setItem(setItem(b, 'animals.stock', [{ species: 'neon-tetra', count: 6 }], 'locked'), 'constraints.taxPct', 7), 'appearance.plantMode', 'mixed');
    expect(parseBrief(JSON.parse(serializeBrief(c)))).toEqual(c);
    expect(parseBrief(undefined)).toBeUndefined();
    expect(parseBrief({ v: 1, items: {} })).toBeUndefined();
    expect(parseBrief({ v: 1, items: { 'constraints.budget': { value: -5, status: 'hard' }, 'preferences.tags': { value: ['nope'], status: 'preference' }, bogus: { value: 1, status: 'hard' } } })).toBeUndefined();
    expect(parseBrief({ v: 9, items: { 'constraints.budget': { value: 50, status: 'weird' } } })?.items['constraints.budget']).toEqual({ value: 50, status: 'preference' });
  });
  it('Wants <-> Brief is lossless', () => {
    expect(briefToWants(briefFromWants(WANTS))).toEqual(WANTS);
    for (const w of [{ constraints: {} }, { constraints: { space: { on: true } } }, { constraints: {}, space: { w: 1, d: 2 } }, { constraints: { startupUsd: { on: false, value: 0 } }, tags: [] }] as Wants[]) {
      const back = briefToWants(briefFromWants(w));
      // an empty list is "nothing chosen": the adapter drops it only when the validator would (tags: [] is kept in memory)
      expect(back).toEqual(w);
    }
    expect(briefToWants(parseBrief(JSON.parse(serializeBrief(briefFromWants(WANTS))))!)).toEqual(WANTS);
  });
  it('travels with the project: save, load, undo; an old save without a brief loads', () => {
    expect(parseScene(JSON.stringify(defaultScene())).scene.tanks[0].brief).toBeUndefined();
    const s = defaultScene(); s.tanks[0].brief = lock(setItem(emptyBrief(), 'equipment.tank', { model: 'x' }), 'equipment.tank');
    expect(parseScene(JSON.stringify(s)).scene.tanks[0].brief).toEqual(s.tanks[0].brief);
    const st = new Store(defaultScene());
    st.edit(t => { t.brief = setItem(emptyBrief(), 'constraints.budget', 250, 'hard'); });
    expect(valueOf(st.tank.brief!, 'constraints.budget')).toBe(250);
    st.undo();
    expect(st.tank.brief).toBeUndefined();
    st.redo();
    expect(valueOf(st.tank.brief!, 'constraints.budget')).toBe(250);
  });
});
