// Lane S6 (2026-11-14; UI2 §7 step 6): the Equipment section's view-models and edits (src/shell/logic/equipment.ts, lighting.ts) and the Owned pill.
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { gearOfTank, isLockedItem, isOwned, inUseOf, editGear, ownItem, GENERIC } from '../src/scene/gearOwn';
import { categories, categoryView, presetLadder, applyPresetEdit, useItem, setOwned, setLock, inUseItem } from '../src/shell/logic/equipment';
import { lightView, mapView, setMapOn, setMapUnit, setMapStep } from '../src/shell/logic/lighting';
import { commercialRows } from '../src/shell/logic/tank';
import { HEATER_PRODUCTS, FILTER_PRODUCTS, LIGHT_PRODUCTS, lightsFor } from '../src/data/gearCatalog';
import { hoodsFor } from '../src/data/hoods';
import { heaterUnits, techOf } from '../src/scene/tech';

const mk = () => new Store();

describe('categories and presets', () => {
  it('always offers Filter, Heater and Light; the ladder lists fresh presets', () => {
    const S = mk().tank, ids = categories(S).map(c => c.id);
    expect(ids.slice(0, 3)).toEqual(['filter', 'heater', 'light']);
    expect(presetLadder(S).map(p => p.id)).toContain('walstad');
  });
  it('a preset applies through techEdit and lights up on the ladder', () => {
    const st = mk(); st.edit(s => applyPresetEdit(s, 'hightech'));
    expect(presetLadder(st.tank).find(p => p.id === 'hightech')!.on).toBe(true);
    expect(presetLadder(st.tank).find(p => p.id === 'walstad')!.on).toBe(false);
  });
});

describe('Heater category', () => {
  it('Buy lists catalogue products with a fit line; the room is read-only text', () => {
    const v = categoryView(mk().tank, 'heater', 'in');
    expect(v.buy.length).toBeGreaterThan(1); expect(v.roomLink).toBe(true);
    expect(v.note).toMatch(/room \d+(\.\d)? °F/);
    expect(v.buyTotal).toBe(HEATER_PRODUCTS.length + 1);
    expect(v.buy.some(r => r.fit)).toBe(true);
  });
  it('Use puts the heater on the design and records it as in use; owning is separate', () => {
    const st = mk(), id = HEATER_PRODUCTS[0].id;
    st.edit(s => useItem(s, 'heater', id));
    expect(heaterUnits(techOf(st.tank))[0].product).toBe(id);
    expect(inUseItem(st.tank, 'heater')).toBe(id);
    expect(inUseOf(gearOfTank(st.tank), 'heater')).toBe(id);
    expect(isOwned(gearOfTank(st.tank), 'heater', id)).toBe(false);
  });
  it('owned items move to I own at $0 and stay out of Buy; "Use" on an owned one swaps the design', () => {
    const st = mk(), [a, b] = HEATER_PRODUCTS;
    st.edit(s => setOwned(s, 'heater', b.id, true));
    const v = categoryView(st.tank, 'heater', 'in', { showAll: true });
    expect(v.owned.map(r => r.item)).toEqual([b.id]); expect(v.owned[0].price).toBe('Owned · $0');
    expect(v.buy.some(r => r.item === b.id)).toBe(false);
    st.edit(s => useItem(s, 'heater', a.id));
    expect(categoryView(st.tank, 'heater', 'in').owned[0].inUse).toBe(false);
    st.edit(s => useItem(s, 'heater', b.id));
    expect(categoryView(st.tank, 'heater', 'in').owned[0].inUse).toBe(true);
    st.edit(s => setOwned(s, 'heater', b.id, false));
    expect(categoryView(st.tank, 'heater', 'in').owned).toEqual([]);
  });
  it('the lock is independent of owned and in use, one undo step', () => {
    const st = mk(), id = HEATER_PRODUCTS[2].id;
    st.edit(s => setLock(s, 'heater', id, true));
    expect(isLockedItem(gearOfTank(st.tank), 'heater', id)).toBe(true);
    expect(inUseItem(st.tank, 'heater')).not.toBe(id);
    expect(categoryView(st.tank, 'heater', 'in', { showAll: true }).buy.find(r => r.item === id)?.locked).toBe(true);
    st.undo(); expect(isLockedItem(gearOfTank(st.tank), 'heater', id)).toBe(false);
  });
});

describe('Filter, Light, others', () => {
  it('Use on a filter product adds it when the tank has none and swaps it when it has one', () => {
    const st = mk(), [a, b] = FILTER_PRODUCTS.filter(f => f.kind === 'hob');
    st.edit(s => useItem(s, 'filter', a.id)); expect(inUseItem(st.tank, 'filter')).toBe(a.id);
    st.edit(s => useItem(s, 'filter', b.id)); expect(inUseItem(st.tank, 'filter')).toBe(b.id);
    st.edit(s => useItem(s, 'filter', GENERIC)); expect(inUseItem(st.tank, 'filter')).toBe(GENERIC);
  });
  it('Light offers fitting products; a hood (HD1) brings its own light, a light product puts the hood away', () => {
    const st = mk(), L = Math.round((LIGHT_PRODUCTS[0].fitMinMm + LIGHT_PRODUCTS[0].fitMaxMm) / 2); st.edit(s => { s.tank.L = L; });
    const hood = hoodsFor(st.tank.tank)[0], lights = lightsFor(st.tank.tank.L);
    expect(lights.length).toBeGreaterThan(0);
    const v = categoryView(st.tank, 'light', 'in', { showAll: true });
    expect(v.buy.filter(r => !r.hood).length).toBe(lights.length + 1);
    if (hood) {
      expect(v.buy.some(r => r.hood && r.item === hood.id)).toBe(true);
      st.edit(s => useItem(s, 'light', hood.id));
      expect(st.tank.lid).toBe('hood'); expect(inUseItem(st.tank, 'light')).toBe(hood.id);
      expect(lightView(st.tank).inHood).toBe(true); expect(lightView(st.tank).watts).toBe(hood.light.watts);
    }
    st.edit(s => useItem(s, 'light', lights[0].id));
    expect(st.tank.lid).not.toBe('hood'); expect(st.tank.light.product).toBe(lights[0].id); expect(inUseItem(st.tank, 'light')).toBe(lights[0].id);
  });
  it('every category view builds on a fresh tank and names its rows', () => {
    const st = mk();
    for (const c of categories(st.tank)) { const v = categoryView(st.tank, c.id, 'in', { showAll: true }); for (const r of [...v.owned, ...v.buy]) expect(r.name.length).toBeGreaterThan(0); }
  });
});

describe('Light map', () => {
  it('starts off; the toggle, unit and contour write the light settings', () => {
    const st = mk(); expect(mapView(st.tank).on).toBe(false);
    st.edit(s => { s.light.type = 'led'; setMapOn(s, true); setMapUnit(s, 'lux'); setMapStep(s, 1000); });
    const m = mapView(st.tank); expect(m.on).toBe(true); expect(m.unit).toBe('lux'); expect(m.step).toBe(1000); expect(st.tank.light.mapStepLux).toBe(1000);
  });
});

describe('Owned pill on commercial tank rows', () => {
  it('a tank in the owned list shows owned on its picker row', () => {
    const st = mk(), first = commercialRows(st.tank, 'in').rows[0];
    expect(commercialRows(st.tank, 'in').rows.some(r => r.owned)).toBe(false);
    st.edit(s => editGear(s, g => ownItem(g, 'tank', first.opt!.m.id)));
    expect(commercialRows(st.tank, 'in').rows.find(r => r.key === first.key)!.owned).toBe(true);
  });
});
