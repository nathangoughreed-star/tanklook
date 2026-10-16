import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { DEFAULT_DENS, LIBRARY, heightAt, layerOf, starterItems, starterStyle } from '../src/scene/items';
import { IN } from '../src/scene/physics';
import { handEdits, regenerate, shuffleHard } from '../src/scene/starter';
import { groundEdited, styleGround } from '../src/scene/scapeground';
import { groundHeight } from '../src/scene/terrain';
import { COMP_IDS, parseScene } from '../src/scene/validate';
import type { CompId, Item, LayerDens, LayoutId } from '../src/scene/types';

// lane SS (2026-10-15): Nature aquarium, Dutch, Jungle and Forest, and the Composition picker
const NEW = ['nature', 'dutch', 'jungle', 'forest'] as const;
const setup = (id: LayoutId, seed: number, comp?: CompId, dens: LayerDens = DEFAULT_DENS, T = { L: 36 * IN, H: 18 * IN, D: 18 * IN }) => {
  const s = defaultSetup(); s.tank = { ...s.tank, ...T };
  s.layout = { id, seed, dens: { ...dens }, ...(comp ? { comp } : {}) }; s.fish = []; return s;
};
const hard = (items: Item[]) => items.filter(it => layerOf(it) === 'hard');
const plants = (items: Item[]) => items.filter(it => layerOf(it) === 'plant');

describe('new scape styles and the composition picker (lane SS)', () => {
  it('every style x composition places library pieces inside the tank, unique ids, in small and big tanks', () => {
    const tanks = [{ L: 24 * IN, H: 12 * IN, D: 12 * IN }, { L: 60 * IN, H: 24 * IN, D: 24 * IN }, { L: 12 * IN, H: 8 * IN, D: 8 * IN }];
    for (const id of [...NEW, 'iwagumi', 'reef', 'stones', 'driftwood', 'planted', 'swamp'] as const) for (const comp of COMP_IDS) for (const T of tanks) for (const seed of [1, 9]) {
      const s = setup(id, seed, comp, { hard: 3, plant: 3, animal: 0 }, T); s.water.salt = id === 'reef';
      const items = starterItems(s);
      expect(new Set(items.map(i => i.id)).size).toBe(items.length);
      expect(items.length, `${id} ${comp}`).toBeGreaterThan(0);
      for (const it of items) {
        expect(LIBRARY[it.variant]?.kind).toBe(it.kind);
        expect(it.x).toBeGreaterThanOrEqual(0); expect(it.x).toBeLessThanOrEqual(s.tank.L);
        expect(it.depth).toBeGreaterThanOrEqual(0); expect(it.depth).toBeLessThanOrEqual(s.tank.D);
        expect(it.lift).toBeGreaterThanOrEqual(0);
      }
    }
  }, 60000);
  it('the same seed, composition and stops give the same tank', () => {
    for (const id of NEW) for (const comp of COMP_IDS) {
      const d = { hard: 1, plant: 3, animal: 0 };
      expect(starterItems(setup(id, 17, comp, d))).toEqual(starterItems(setup(id, 17, comp, d)));
    }
  });
  it('density stops behave as in lane SD: more plants and more hardscape at fuller stops, plants alone leave the hardscape', () => {
    for (const id of NEW) for (const comp of COMP_IDS) {
      let p0 = 0, p4 = 0, h0 = 0, h4 = 0;
      for (let seed = 2; seed < 8; seed++) {
        p0 += plants(starterItems(setup(id, seed, comp, { hard: 2, plant: 0, animal: 0 }))).length;
        p4 += plants(starterItems(setup(id, seed, comp, { hard: 2, plant: 4, animal: 0 }))).length;
        h0 += hard(starterItems(setup(id, seed, comp, { hard: 0, plant: 2, animal: 0 }))).length;
        h4 += hard(starterItems(setup(id, seed, comp, { hard: 4, plant: 2, animal: 0 }))).length;
        expect(hard(starterItems(setup(id, seed, comp, { hard: 3, plant: 0, animal: 0 }))))
          .toEqual(hard(starterItems(setup(id, seed, comp, { hard: 3, plant: 4, animal: 0 }))));
      }
      expect(p4, `${id} ${comp} plants`).toBeGreaterThan(p0 * 1.5);
      expect(h4, `${id} ${comp} hardscape`).toBeGreaterThan(h0);
    }
  });
  it('each style keeps its character', () => {
    for (let seed = 1; seed < 12; seed++) {
      const nat = starterItems(setup('nature', seed));
      expect(nat.some(i => i.kind === 'wood') && nat.some(i => i.kind === 'stone')).toBe(true); // wood and stone together
      expect(nat.some(i => i.variant === 'moss' && i.lift > 0)).toBe(true);                     // moss up on the hardscape
      const du = starterItems(setup('dutch', seed));
      expect(du.filter(i => i.variant === 'carpet')).toHaveLength(0);                             // no carpet
      expect(hard(du)).toHaveLength(0);                                                           // no hardscape at Medium
      expect(new Set(plants(du).map(i => i.variant)).size).toBeGreaterThanOrEqual(4);              // streets of several species
      const ju = starterItems(setup('jungle', seed));
      expect(ju.some(i => i.variant === 'frogbit' || i.variant === 'salvinia' || i.variant === 'redroot' || i.variant === 'lettuce')).toBe(true);
      expect(plants(ju).filter(i => i.variant === 'grass' || i.variant === 'balansae').length).toBeGreaterThan(5);
      const fo = starterItems(setup('forest', seed));
      expect(fo.filter(i => i.variant === 'manzanita').length).toBeGreaterThanOrEqual(3);         // a stand of trunks
      expect(fo.filter(i => i.variant === 'carpet').length).toBeGreaterThan(10);                  // a fine carpet
    }
    // Dutch past Medium gets a stone or a piece of wood at most a handful
    expect(hard(starterItems(setup('dutch', 3, 'any', { hard: 4, plant: 2, animal: 0 }))).length).toBeLessThanOrEqual(2);
  });
  it('a composition puts the weight where it says: one side high, U high at both ends, a mound in the middle', () => {
    for (let seed = 1; seed < 20; seed++) {
      const side = starterStyle(seed, 'side').foci[0].x, u = starterStyle(seed, 'u').foci, m = starterStyle(seed, 'mound').foci;
      expect(Math.abs(side - 0.5)).toBeGreaterThan(0.2);
      expect(u.map(f => f.x).sort()[0]).toBeLessThan(0.25); expect(u.map(f => f.x).sort()[1]).toBeGreaterThan(0.75);
      expect(heightAt(u, 0.5)).toBeLessThan(heightAt(u, 0.15) * 0.75);
      expect(m).toHaveLength(1); expect(Math.abs(m[0].x - 0.5)).toBeLessThan(0.05);
      expect(starterStyle(seed, 'scattered').foci.length).toBeGreaterThanOrEqual(3);
      expect(starterStyle(seed, 'v').foci).toHaveLength(2);
    }
    // the plants of a one-sided Dutch tank stand taller on its high side
    for (const seed of [2, 5, 8]) {
      const s = setup('dutch', seed, 'side'), hi = starterStyle(seed, 'side').foci[0].x < 0.5;
      const ps = plants(starterItems(s)), mid = s.tank.L / 2;
      const avg = (a: Item[]) => a.reduce((t, i) => t + i.size, 0) / a.length;
      const left = avg(ps.filter(i => i.x < mid && i.depth > s.tank.D * 0.5)), right = avg(ps.filter(i => i.x >= mid && i.depth > s.tank.D * 0.5));
      expect(hi ? left > right : right > left).toBe(true);
    }
  });
  it('Any is the old roll, so every older tank and seed is drawn exactly as before', () => {
    for (const id of ['stones', 'iwagumi', 'driftwood', 'planted', 'reef'] as const) for (const seed of [1, 4, 33]) {
      const a = setup(id, seed), b = setup(id, seed, 'any');
      expect(starterItems(b)).toEqual(starterItems(a));
    }
  });
  it('Shuffle keeps the style, the composition and the stops; the composition round-trips through a file', () => {
    const s = setup('forest', 3, 'u', { hard: 3, plant: 1, animal: 0 }); s.items = starterItems(s);
    shuffleHard(s, 77);
    expect(s.layout).toMatchObject({ id: 'forest', comp: 'u', dens: { hard: 3, plant: 1, animal: 0 }, seed: 77 });
    const sc = defaultScene(); sc.tanks[0].layout = { id: 'jungle', seed: 5, dens: { ...DEFAULT_DENS }, comp: 'v' };
    expect(parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].layout.comp).toBe('v');
    sc.tanks[0].layout = { id: 'jungle', seed: 5, dens: { ...DEFAULT_DENS } };
    expect(parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].layout.comp).toBeUndefined();
    (sc.tanks[0].layout as { comp?: string }).comp = 'spiral';
    expect(parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].layout.comp).toBeUndefined();
  });
});

describe('Quick aquascape setup: the style draws its substrate and terrain too (Nathan 2026-10-15)', () => {
  const ALL = ['stones', 'driftwood', 'planted', 'iwagumi', 'swamp', 'nature', 'dutch', 'jungle', 'forest'] as const;
  it('every style: deterministic, its own kind of substrate, a terrain sloping up to the back, inside the limits', () => {
    for (const id of ALL) for (const seed of [1, 4, 23]) for (const comp of ['any', 'u'] as CompId[]) {
      const a = setup(id, seed, comp), b = setup(id, seed, comp);
      styleGround(a); styleGround(b);
      expect(a.substrate).toEqual(b.substrate); expect(a.terrain).toEqual(b.terrain);
      expect(a.layout.ground).toBe(true);
      expect(['aragonite', 'coral']).not.toContain(a.substrate.type); // fresh water: no marine sand
      const H = a.tank.H;
      expect(a.terrain.on).toBe(true);
      if (id === 'swamp') { expect(a.terrain.pools!.length).toBeGreaterThan(0); continue; } // land with pools, as terrain data
      for (const h of a.terrain.h) { expect(h).toBeGreaterThanOrEqual(8); expect(h).toBeLessThanOrEqual(H * 0.35 + 1e-9); }
      expect(a.substrate.bl + a.substrate.br).toBeGreaterThan(a.substrate.fl + a.substrate.fr);
    }
  });
  it('a salt tank gets marine sand; seeds give different grounds; the density sliders leave it alone', () => {
    const s = setup('reef', 3); s.water.salt = true; styleGround(s);
    expect(['aragonite', 'coral']).toContain(s.substrate.type);
    const keys = new Set<string>();
    for (let seed = 2; seed < 12; seed++) { const t = setup('nature', seed); styleGround(t); keys.add(JSON.stringify([t.substrate, t.terrain.h])); }
    expect(keys.size).toBe(10);
    const t = setup('jungle', 5); styleGround(t); const before = JSON.stringify([t.substrate, t.terrain]);
    t.layout.dens = { hard: 4, plant: 0, animal: 2 }; regenerate(t, 'hard', 1); regenerate(t, 'plant', 1);
    expect(JSON.stringify([t.substrate, t.terrain])).toBe(before);
  });
  it('hills stand under the groups: a U composition is higher at both ends than in the middle', () => {
    for (const seed of [2, 7, 11]) {
      const s = setup('nature', seed, 'u'); styleGround(s);
      const g = (x: number) => groundHeight(s, s.tank, s.tank.L * x, s.tank.D * 0.62);
      expect(Math.min(g(0.15), g(0.85))).toBeGreaterThan(g(0.5));
    }
  });
  it('a hand edit of the ground is spotted (warning first); a ground never styled is only "edited" when it is not the default', () => {
    const s = setup('forest', 4); expect(groundEdited(s)).toBe(false); // the default substrate, never styled
    expect(handEdits(s, 'all', true)).not.toContain('substrate');
    styleGround(s); regenerate(s, 'all', 1);
    expect(groundEdited(s)).toBe(false); expect(handEdits(s, 'hard', true)).toEqual([]);
    s.terrain.h[3] += 20;
    expect(handEdits(s, 'hard', true)).toContain('substrate');
    expect(handEdits(s, 'hard')).not.toContain('substrate'); // a density slider does not touch the ground
    const u = setup('forest', 4); u.substrate.type = 'blue';
    expect(groundEdited(u)).toBe(true);
    const sc = defaultScene(); sc.tanks[0].layout = { id: 'nature', seed: 2, dens: { ...DEFAULT_DENS }, ground: true };
    expect(parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].layout.ground).toBe(true);
  });
});
