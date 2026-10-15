import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { LIBRARY, clampItem, itemDims, makeItem, starterItems, woodLimbs } from '../src/scene/items';
import { IN, rescaleTank } from '../src/scene/physics';
import { bowlDims, bowlRadius, normTank } from '../src/scene/shape';
import { Store } from '../src/scene/store';
import { groundHeight } from '../src/scene/terrain';
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
    for (const id of LAYOUT_IDS) for (const T of [{ L: 24 * IN, H: 12 * IN, D: 12 * IN }, { L: 60 * IN, H: 24 * IN, D: 24 * IN }, { L: 12 * IN, H: 8 * IN, D: 8 * IN }]) for (const seed of [1, 7, 8, 13, 99, 1234]) {
      const s = defaultSetup(); s.tank = T; s.layout = { id, seed };
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
    const s = defaultSetup(); s.layout = { id: 'driftwood', seed: 1 };
    const items = starterItems(s);
    expect(items.filter(i => i.variant === 'branch')).toHaveLength(1);
    expect(items.filter(i => i.variant === 'fern' && i.lift > 10).length).toBeGreaterThan(0);
    // shuffled: any wood, still with plants tied on somewhere
    let tied = 0;
    for (let seed = 2; seed < 22; seed++) { s.layout.seed = seed; tied += +starterItems(s).some(i => i.kind === 'plant' && i.variant !== 'carpet' && i.lift > 10); }
    expect(tied).toBeGreaterThan(14);
  });
  it('items survive a save and load unchanged', () => {
    const sc = defaultScene();
    sc.tanks[0].items.push(makeItem(sc.tanks[0].tank, 'coconut', 999, 42, 100, 120, { yaw: 30, tilt: -5, lift: 12 }));
    const back = parseScene(JSON.stringify(sc)).scene;
    expect(back.tanks[0].items).toEqual(sc.tanks[0].items);
  });
  it('unknown variants are skipped with a warning; numbers are clamped into the tank (hardscape anchors up to the glass)', () => {
    const sc = defaultScene() as unknown as { tanks: { items: unknown[] }[] };
    sc.tanks[0].items = [{ id: 1, variant: 'unobtainium' }, { id: 2, variant: 'river', x: -500, depth: 1e6, size: 1e9, tilt: 99 }];
    const { scene, warnings } = parseScene(sc);
    expect(warnings.join()).toMatch(/1 unknown aquascape/);
    const it = scene.tanks[0].items[0];
    expect(it.x).toBe(0); expect(it.depth).toBe(scene.tanks[0].tank.D); expect(it.tilt).toBe(99); expect(it.pitch).toBe(0);
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
  it('a bowl spreads its layout over the whole substrate, not a ring round the floor disc (2026-10-12)', () => {
    for (const id of LAYOUT_IDS) for (const seed of [1, 7, 13]) {
      if (id === 'none') continue;
      const s = defaultSetup(); s.tank = normTank({ L: 16 * IN, H: 1, D: 1, shape: 'bowl' }); s.layout = { id, seed };
      const T = s.tank, rb = bowlDims(T).rb, items = starterItems(s);
      const q = (it: { x: number; depth: number }) => Math.hypot(it.x - T.L / 2, it.depth - T.D / 2);
      // every anchor is inside the glass at its ground; a plant stays inside it over its whole height
      for (const it of items) {
        const y = groundHeight(s, T, it.x, it.depth) + Math.max(0, it.lift);
        expect(q(it)).toBeLessThanOrEqual(bowlRadius(T, y) + 0.5);
        if (it.kind === 'plant' && it.variant !== 'carpet') expect(q(it) + itemDims(it)[0] / 2).toBeLessThanOrEqual(bowlRadius(T, Math.min(y + it.size, T.H - 15)) + 0.5);
      }
      // and the set as designed reaches out past the floor disc, left and right, not one ring (stones is one central
      // cluster anyway; a shuffled set may sit to one side on purpose)
      if (id !== 'stones' && seed === 1) {
        expect(items.filter(it => q(it) > rb).length).toBeGreaterThan(0);
        if (id === 'planted') expect(items.filter(it => q(it) < rb * 0.4).length).toBeGreaterThan(0); // a mound, not a bare middle
        expect(Math.min(...items.map(it => it.x))).toBeLessThan(T.L / 2 - rb * 0.7);
        expect(Math.max(...items.map(it => it.x))).toBeGreaterThan(T.L / 2 + rb * 0.7);
      }
    }
  });
  it('Shuffle rolls genuinely different sets: sparse and packed, different materials, groups in different places (2026-10-13)', () => {
    // density comes from the sliders since lane SD (2026-10-15): the seeds here step through the stops as well
    const s = defaultSetup();
    for (const id of LAYOUT_IDS) {
      if (id === 'none') continue;
      s.layout = { id, seed: 1 };
      const counts: number[] = [], kinds = new Set<string>(), xs: number[] = [];
      for (let seed = 2; seed < 42; seed++) {
        s.layout.seed = seed; s.layout.dens = { hard: seed % 5, plant: seed % 5, animal: 0 }; const items = starterItems(s);
        counts.push(items.length); items.filter(i => i.kind !== 'plant').forEach(i => kinds.add(i.variant));
        const solid = items.filter(i => i.kind !== 'plant' || i.variant !== 'carpet');
        // Dutch fills the whole floor; its composition is in how tall the terraces stand, so it is weighed by plant height
        const w = (i: { size: number }) => id === 'dutch' ? i.size : 1, W = solid.reduce((a, i) => a + w(i), 0);
        if (solid.length) xs.push(solid.reduce((a, i) => a + i.x * w(i), 0) / W / s.tank.L);
      }
      expect(Math.max(...counts) / Math.max(1, Math.min(...counts))).toBeGreaterThan(id === 'swamp' ? 2 : 2.5);
      if (id === 'stones' || id === 'iwagumi' || id === 'driftwood') expect(kinds.size).toBeGreaterThan(2);
      if (id !== 'swamp') expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(id === 'planted' || id === 'dutch' ? 0.1 : 0.2); // the weight of the set moves about
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
