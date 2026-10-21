import { describe, expect, it } from 'vitest';
import { parseScene } from '../src/scene/validate';
import { Store as SceneStore } from '../src/scene/store';
import { holdIntegrated, locksOf, tankSig } from '../src/scene/integrated';
import { filterUnits } from '../src/scene/tech';
import { kitById } from '../src/data/kits';
import { TANK_MODELS, modelOfVariant, tankFromModel } from '../src/data/tanks';
import { TECHS } from '../src/scene/lightout';
import type { TankSetup } from '../src/scene/types';

const flex9 = () => { const m = TANK_MODELS.find(x => x.id === 'n_flex_9gal')!; return { m, v: m.variants![0] }; };
/** What the tank picker does on a pick (ui/panels.ts apply + standFor), minus the dialog. */
function pick(store: SceneStore, id: string, kit?: boolean) {
  const m = TANK_MODELS.find(x => x.id === id)!, v = m.variants?.find(x => x.kit) ?? m.variants?.[0];
  store.edit(s => { if (kit && v?.kit) s.integrated = { kit: v.kit }; else delete s.integrated; s.tank = tankFromModel(v ? modelOfVariant(m, v) : m); });
  return store.tank;
}

describe('integrated kits: data', () => {
  it('every variant that names a kit names a real one, of about the same size', () => {
    const named = TANK_MODELS.flatMap(m => (m.variants ?? []).filter(v => v.kit).map(v => ({ m, v })));
    expect(named.length).toBeGreaterThanOrEqual(4);
    for (const { m, v } of named) { const k = kitById(v.kit!); expect(k, `${m.id}: ${v.kit}`).toBeDefined(); expect(Math.abs(k!.tankRatedGal - m.ratedGal)).toBeLessThanOrEqual(2.5); }
  });
  it('the Flex 9 is an all-in-one', () => {
    const { m, v } = flex9();
    expect(v.kit).toBe('fluval-flex-9'); expect(m.ratedGal).toBe(9);
  });
  it('a kit whose light is sold separately does not lock the light', () => {
    const S = { integrated: { kit: 'waterbox-aio-20-cube' } } as TankSetup;
    expect(locksOf(S)).toMatchObject({ light: false, lid: true, filter: true, heater: false });
    expect(locksOf({ integrated: { kit: 'fluval-flex-9' } } as TankSetup)).toMatchObject({ light: true, lid: true, filter: true, heater: false });
    expect(locksOf({} as TankSetup)).toBeUndefined();
  });
});

describe('integrated kits: apply and hold', () => {
  it('picking the Flex 9 applies its 7 W light, hood and filter, and records the tank', () => {
    const store = new SceneStore(), T = pick(store, 'n_flex_9gal', true);
    expect(T.integrated?.sig).toBe(tankSig(T.tank));
    expect(T.light).toMatchObject({ watts: 7, tech: 'led-planted' });
    expect(T.lid).toBe('hood');
    expect(T.tech && filterUnits(T.tech)).toHaveLength(1);
    expect(filterUnits(T.tech!)[0].kit).toBe(true);
    expect(TECHS[T.light.tech!]).toBeDefined();
  });
  it('the light, lid and filter cannot be changed: an edit is put back', () => {
    const store = new SceneStore(); pick(store, 'n_flex_9gal', true);
    const before = JSON.stringify([store.tank.light, store.tank.lid, store.tank.tech?.filters, store.tank.tech?.rows.filter]);
    store.edit(s => { s.light.watts = 60; s.light.type = 'tube'; s.light.count = 4; s.light.tech = 'led-white'; delete s.light.par; });
    store.edit(s => { s.lid = 'open'; });
    store.edit(s => { s.tech!.rows.filter = 'canister'; s.tech!.filters = [{ kind: 'canister' }, { kind: 'sump' }]; s.tech!.filterProduct = 'x'; });
    expect(JSON.stringify([store.tank.light, store.tank.lid, store.tank.tech?.filters, store.tank.tech?.rows.filter])).toBe(before);
    expect(store.tank.tech?.filterProduct).toBeUndefined();
  });
  it('what the kit does not supply stays free: the heater, exposure, room light', () => {
    const store = new SceneStore(); pick(store, 'n_flex_9gal', true);
    store.edit(s => { s.tech!.rows.heater = 'one'; s.tech!.heaters = [{ w: 50 }]; s.light.bright = 1.7; s.light.room = 0.4; });
    expect(store.tank.tech?.heaters).toEqual([{ w: 50 }]);
    expect(store.tank.light.bright).toBe(1.7); expect(store.tank.light.room).toBe(0.4);
    expect(store.tank.integrated).toBeDefined();
  });
  it('a new size or shape releases it: the tank is an ordinary one with the gear it had', () => {
    const store = new SceneStore(); pick(store, 'n_flex_9gal', true);
    const w = store.tank.light.watts;
    store.edit(s => { s.tank = { ...s.tank, L: s.tank.L + 50 }; });
    expect(store.tank.integrated).toBeUndefined();
    store.edit(s => { s.light.watts = 40; s.lid = 'open'; });
    expect(store.tank.light.watts).toBe(40); expect(store.tank.lid).toBe('open'); expect(w).toBe(7);
  });
  it('picking any other tank drops the kit, and an ordinary kit variant is never locked', () => {
    const store = new SceneStore(); pick(store, 'n_flex_9gal', true);
    pick(store, 'g10');
    expect(store.tank.integrated).toBeUndefined();
    store.edit(s => { s.light.watts = 33; s.lid = 'glass'; });
    expect(store.tank.light.watts).toBe(33); expect(store.tank.lid).toBe('glass');
  });
  it('survives a save and reload, still held', () => {
    const store = new SceneStore(); pick(store, 'n_flex_9gal', true);
    const back = new SceneStore(parseScene(JSON.parse(JSON.stringify(store.scene))).scene);
    expect(back.tank.integrated?.kit).toBe('fluval-flex-9');
    back.edit(s => { s.light.watts = 99; });
    expect(back.tank.light.watts).toBe(7);
  });
  it('holdIntegrated is a no-op on an ordinary tank and drops an unknown kit', () => {
    const store = new SceneStore(), t = store.tank, before = JSON.stringify(t);
    holdIntegrated(t); expect(JSON.stringify(t)).toBe(before);
    t.integrated = { kit: 'no-such-kit' }; holdIntegrated(t); expect(t.integrated).toBeUndefined();
  });
});
