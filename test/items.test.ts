import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { LIBRARY, clampItem, itemDims, makeItem, starterItems, woodLimbs } from '../src/scene/items';
import { IN, rescaleTank } from '../src/scene/physics';
import { Store } from '../src/scene/store';
import { parseScene } from '../src/scene/validate';
import { LAYOUT_IDS } from '../src/scene/validate';
import { SCENE_VERSION, type LayoutId } from '../src/scene/types';

const v8 = (layout: LayoutId) => {
  const s = defaultScene() as unknown as Record<string, unknown>, t = (s.tanks as Record<string, unknown>[])[0];
  s.version = 8; delete t.items; t.layout = { id: layout, seed: 3 };
  return s;
};

describe('aquascape items (scene v9)', () => {
  it('a v8 file gets its layout as editable items, the same every time', () => {
    for (const id of LAYOUT_IDS) {
      const a = parseScene(v8(id)).scene.tanks[0], b = parseScene(v8(id)).scene.tanks[0];
      expect(a.items).toEqual(b.items);
      expect(a.items.length > 0).toBe(id !== 'none');
      expect(parseScene(v8(id)).scene.version).toBe(SCENE_VERSION);
    }
  });
  it('every starter piece is a library variant, inside the tank, with a unique id', () => {
    for (const id of LAYOUT_IDS) for (const T of [{ L: 24 * IN, H: 12 * IN, D: 12 * IN }, { L: 60 * IN, H: 24 * IN, D: 24 * IN }, { L: 12 * IN, H: 8 * IN, D: 8 * IN }]) {
      const s = defaultSetup(); s.tank = T; s.layout = { id, seed: 7 };
      const items = starterItems(s), ids = new Set(items.map(i => i.id));
      expect(ids.size).toBe(items.length);
      for (const it of items) {
        expect(LIBRARY[it.variant]?.kind).toBe(it.kind);
        expect(it.x).toBeGreaterThanOrEqual(0); expect(it.x).toBeLessThanOrEqual(T.L);
        expect(it.depth).toBeGreaterThanOrEqual(0); expect(it.depth).toBeLessThanOrEqual(T.D);
        expect(it.lift).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('driftwood ties its ferns onto the wood (raised off the ground)', () => {
    const s = defaultSetup(); s.layout = { id: 'driftwood', seed: 2 };
    const items = starterItems(s);
    expect(items.filter(i => i.variant === 'branch')).toHaveLength(1);
    expect(items.filter(i => i.variant === 'fern' && i.lift > 10).length).toBeGreaterThan(0);
  });
  it('items survive a save and load unchanged', () => {
    const sc = defaultScene();
    sc.tanks[0].items.push(makeItem(sc.tanks[0].tank, 'coconut', 999, 42, 100, 120, { yaw: 30, tilt: -5, lift: 12 }));
    const back = parseScene(JSON.stringify(sc)).scene;
    expect(back.tanks[0].items).toEqual(sc.tanks[0].items);
  });
  it('unknown variants are skipped with a warning; numbers are clamped into the tank', () => {
    const sc = defaultScene() as unknown as { tanks: { items: unknown[] }[] };
    sc.tanks[0].items = [{ id: 1, variant: 'unobtainium' }, { id: 2, variant: 'river', x: -500, depth: 1e6, size: 1e9, tilt: 99 }];
    const { scene, warnings } = parseScene(sc);
    expect(warnings.join()).toMatch(/1 unknown aquascape/);
    const it = scene.tanks[0].items[0];
    expect(it.x).toBeGreaterThan(0); expect(it.depth).toBeLessThan(scene.tanks[0].tank.D); expect(it.tilt).toBe(45);
    expect(it.size).toBeLessThanOrEqual(LIBRARY.river.max);
  });
  it('a plant is never wider than the tank; sizes stay in the variant range', () => {
    const T = { L: 200, H: 300, D: 100 }, it = makeItem(T, 'sword', 1, 1, 100, 50, { size: 600 });
    expect(itemDims(it)[0]).toBeLessThanOrEqual(T.D);
    const s = makeItem(T, 'slate', 2, 1, 100, 50, { size: 1 }); expect(s.size).toBe(LIBRARY.slate.min);
  });
  it('resizing the tank keeps pieces at the same relative spot and their real size', () => {
    const s = defaultSetup(), before = structuredClone(s.items);
    rescaleTank(s, { L: 48 * IN, H: 12 * IN, D: 12 * IN });
    s.items.forEach((it, k) => { expect(it.x).toBeCloseTo(before[k].x * 2); expect(it.size).toBe(before[k].size); });
  });
  it('wood skeletons are deterministic and sit on y >= 0', () => {
    for (const v of ['branch', 'spider', 'manzanita', 'mopani']) {
      const a = woodLimbs(v, 5, 300);
      expect(a).toEqual(woodLimbs(v, 5, 300));
      for (const l of a) for (const p of l.pts) expect(p[1]).toBeGreaterThan(-0.01);
    }
  });
  it('selecting an item clears the fish selection and the other way round; undo keeps it valid', () => {
    const st = new Store(defaultScene()), id = st.tank.items[0].id;
    st.selectItem(id); expect(st.selId).toBeNull(); expect(st.selectedItem?.id).toBe(id);
    st.select(st.tank.fish[0].id); expect(st.selItem).toBeNull();
    st.selectItem(id);
    st.edit(t => { t.items = []; }); expect(st.selItem).toBeNull();
    st.undo(); expect(st.tank.items.length).toBeGreaterThan(0);
    const it = st.tank.items[0]; it.x = -100; clampItem(it, st.tank.tank); expect(it.x).toBeGreaterThan(0);
  });
});
