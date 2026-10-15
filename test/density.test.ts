import { describe, expect, it } from 'vitest';
import { getSpecies } from '../src/data/species';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { DEFAULT_DENS, STYLES, layerOf, legacyDens, starterItems, stopDens } from '../src/scene/items';
import { IN } from '../src/scene/physics';
import { bioload, bioloadLitres, handEdits, regenerate, starterAnimals } from '../src/scene/starter';
import { LAYOUT_IDS, parseScene } from '../src/scene/validate';
import type { Item, LayerDens, LayoutId, TankSetup } from '../src/scene/types';

const LAYOUTS = LAYOUT_IDS.filter(id => id !== 'none') as Exclude<LayoutId, 'none'>[];
const setup = (id: LayoutId, seed: number, dens: LayerDens = DEFAULT_DENS, salt = id === 'reef') => {
  const s = defaultSetup(); s.tank = { ...s.tank, L: 36 * IN, H: 18 * IN, D: 18 * IN };
  s.layout = { id, seed, dens: { ...dens } }; s.water.salt = salt; s.fish = []; return s;
};
const hard = (items: Item[]) => items.filter(it => layerOf(it) === 'hard');
const plants = (items: Item[]) => items.filter(it => layerOf(it) === 'plant');

describe('density sliders and per-layer streams (lane SD, 2026-10-15)', () => {
  it('the same layout, seed and stops give the same tank', () => {
    for (const id of LAYOUTS) for (const seed of [1, 5, 77]) {
      const d = { hard: seed % 5, plant: (seed + 2) % 5, animal: 3 };
      expect(starterItems(setup(id, seed, d))).toEqual(starterItems(setup(id, seed, d)));
      expect(starterAnimals(setup(id, seed, d), 1)).toEqual(starterAnimals(setup(id, seed, d), 1));
    }
  });
  it('a plant-stop change leaves every hardscape piece exactly as it was', () => {
    for (const id of LAYOUTS) for (const seed of [1, 2, 9, 31]) for (const h of [0, 2, 4]) {
      const a = starterItems(setup(id, seed, { hard: h, plant: 0, animal: 0 })), b = starterItems(setup(id, seed, { hard: h, plant: 4, animal: 0 }));
      expect(hard(b)).toEqual(hard(a));
    }
  });
  it('the plant stop sets how full the tank is planted; the hardscape stop how much rock and wood', () => {
    for (const id of LAYOUTS) {
      let p0 = 0, p4 = 0, h0 = 0, h4 = 0;
      for (let seed = 2; seed < 12; seed++) {
        p0 += plants(starterItems(setup(id, seed, { hard: 2, plant: 0, animal: 0 }))).length;
        p4 += plants(starterItems(setup(id, seed, { hard: 2, plant: 4, animal: 0 }))).length;
        h0 += hard(starterItems(setup(id, seed, { hard: 0, plant: 2, animal: 0 }))).length;
        h4 += hard(starterItems(setup(id, seed, { hard: 4, plant: 2, animal: 0 }))).length;
      }
      expect(p4, `${id} plants`).toBeGreaterThan(p0 * 1.5);
      expect(h4, `${id} hardscape`).toBeGreaterThan(h0 * (id === 'iwagumi' ? 1.8 : 1.5));
    }
  });
  it('iwagumi keeps its rule at every stop: an odd number of stones, 7 at most', () => {
    for (let seed = 1; seed < 30; seed++) for (let stop = 0; stop <= 4; stop++) {
      const n = hard(starterItems(setup('iwagumi', seed, { hard: stop, plant: 2, animal: 0 }))).length;
      expect(n).toBe(STYLES.iwagumi.stones![stop]);
    }
  });
  it('seed 1 at the default stops is the set as designed (the classic iwagumi: five seiryu stones)', () => {
    const it = hard(starterItems(setup('iwagumi', 1)));
    expect(it.map(i => i.variant)).toEqual(['seiryu', 'seiryu', 'seiryu', 'seiryu', 'seiryu']);
    expect(stopDens(2, [0.3, 2.4])).toBe(1);
  });
  it('a plants-only regenerate keeps the hardscape where the user moved it and plants round it', () => {
    const s = setup('iwagumi', 4, { hard: 3, plant: 2, animal: 0 });
    s.items = starterItems(s);
    const moved = hard(s.items)[0]; moved.x = 200; moved.depth = 150;
    const before = JSON.stringify(hard(s.items));
    s.layout.dens!.plant = 4; regenerate(s, 'plant', 1);
    expect(JSON.stringify(hard(s.items))).toBe(before);
    expect(new Set(s.items.map(i => i.id)).size).toBe(s.items.length);
    // the carpet keeps off the moved stone where it stands now
    expect(s.items.filter(i => i.variant === 'carpet').every(c => Math.hypot(c.x - 200, c.depth - 150) > 30)).toBe(true);
  });
  it('Shuffle (a new seed) keeps the stops; a hardscape regenerate leaves the animals alone', () => {
    const s = setup('planted', 3, { hard: 1, plant: 3, animal: 2 });
    regenerate(s, 'all', 1); const fish = JSON.stringify(s.fish);
    expect(s.fish.length).toBeGreaterThan(0);
    s.layout.dens!.hard = 4; regenerate(s, 'hard', 100);
    expect(JSON.stringify(s.fish)).toBe(fish);
    s.layout.seed = 8; regenerate(s, 'all', 100);
    expect(s.layout.dens).toEqual({ hard: 4, plant: 3, animal: 2 });
  });
  it('animals: more at a fuller stop, never past a safe bioload, fresh or salt as the tank is', () => {
    for (const id of LAYOUTS) for (const seed of [1, 6, 19]) {
      let last = 0;
      for (let stop = 1; stop <= 4; stop++) {
        const s = setup(id, seed, { hard: 2, plant: 2, animal: stop }), fish = starterAnimals(s, 1);
        expect(bioload(fish)).toBeLessThanOrEqual(bioloadLitres(s) * 0.9 + 1e-9);
        expect(bioload(fish)).toBeGreaterThanOrEqual(last);
        last = bioload(fish);
        for (const f of fish) expect(!!getSpecies(f.species)!.salt).toBe(id === 'reef');
        expect(new Set(fish.map(f => f.id)).size).toBe(fish.length);
      }
      if (id !== 'swamp') expect(last, id).toBeGreaterThan(0);
    }
  });
  it('animal stop None: a new layout or Shuffle leaves the user\'s own animals alone', () => {
    const s = setup('planted', 1); s.fish = defaultSetup().fish; const own = JSON.stringify(s.fish);
    expect(s.fish.length).toBeGreaterThan(0);
    s.layout.seed = 12; regenerate(s, 'all', 50);
    expect(JSON.stringify(s.fish)).toBe(own);
  });
  it('old files: no stops saved = the stops nearest the density the seed used to roll; saved stops round-trip', () => {
    expect(legacyDens(1)).toEqual(DEFAULT_DENS);
    const stops = new Set<number>();
    for (let seed = 2; seed < 60; seed++) { const d = legacyDens(seed); expect(d.hard).toBe(d.plant); expect(d.animal).toBe(0); stops.add(d.hard); }
    expect(stops.size).toBeGreaterThanOrEqual(4);
    const sc = defaultScene(), t = sc.tanks[0] as TankSetup;
    t.layout = { id: 'stones', seed: 7 }; // no dens: a file from before lane SD
    expect(parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].layout.dens).toEqual(legacyDens(7));
    t.layout = { id: 'stones', seed: 7, dens: { hard: 4, plant: 0, animal: 3 } };
    expect(parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].layout.dens).toEqual({ hard: 4, plant: 0, animal: 3 });
  });
  it('hand edits are spotted, so the redraw can warn first (Nathan 2026-10-15); a fresh set needs no warning', () => {
    for (const id of LAYOUTS) {
      const s = setup(id, 5, { hard: 3, plant: 1, animal: 2 }); regenerate(s, 'all', 1);
      expect(handEdits(s, 'all'), id).toEqual([]);
      expect(handEdits(s, 'animal'), id).toEqual([]);
    }
    const s = setup('iwagumi', 5); regenerate(s, 'all', 1);
    const st = hard(s.items)[0]; st.x += 40;
    expect(handEdits(s, 'hard')).toContain('hardscape');
    expect(handEdits(s, 'animal')).toEqual([]);
    const t = setup('planted', 2); regenerate(t, 'all', 1);
    t.items.splice(t.items.findIndex(i => i.kind === 'plant'), 1);
    expect(handEdits(t, 'plant')).toEqual(['plants']);
    expect(handEdits(t, 'hard')).toEqual(['plants']); // a hardscape redraw redraws the plants round it as well
    const u = setup('planted', 2); u.fish = defaultSetup().fish; // the user's own animals, stop None
    expect(handEdits(u, 'animal')).toEqual(['animals']);
    expect(handEdits(u, 'all')).not.toContain('animals'); // at None a new set leaves them alone
  });
});
