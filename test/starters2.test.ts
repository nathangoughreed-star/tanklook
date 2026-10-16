// Lane SS2 (2026-10-16): terrarium starters, freshwater biotopes, marine sub-styles.
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { STYLES, STYLE_GROUPS, STYLE_KIND, isLandStyle, isReefy, starterItems, LAYOUTS } from '../src/scene/items';
import { styleGround } from '../src/scene/scapeground';
import { starterAnimals } from '../src/scene/starter';
import { getSpecies } from '../src/data/species';
import { LAYOUT_IDS } from '../src/scene/validate';
import type { LayoutId } from '../src/scene/types';

const NEW: LayoutId[] = ['rainforest', 'arid', 'jumper', 'python', 'burrow', 'frogs', 'paludarium', 'blackwater', 'malawi', 'stream', 'hillstream', 'softreef', 'spsreef', 'clownnano'];
const setup = (id: LayoutId, seed: number, animal = 3) => {
  const s = defaultSetup(); s.tank = { ...s.tank, L: 900, H: 500, D: 450 };
  s.layout = { id, seed, dens: { hard: 2, plant: 2, animal } }; s.fish = [];
  if (isLandStyle(id)) s.water.on = false;
  if (isReefy(id)) s.water.salt = true;
  styleGround(s); return s;
};
describe('starter styles batch 2 (lane SS2)', () => {
  it('every new style is known, labelled, grouped and pooled', () => {
    for (const id of NEW) { expect(LAYOUT_IDS).toContain(id); expect(LAYOUTS[id].label).toBeTruthy(); expect(STYLES[id as Exclude<LayoutId, 'none'>].animals.length).toBeGreaterThan(0); expect(STYLE_GROUPS.some(g => g.ids.includes(id))).toBe(true); for (const a of STYLES[id as Exclude<LayoutId, 'none'>].animals) expect(getSpecies(a), a).toBeTruthy(); }
    expect(STYLE_KIND.softreef).toBe('salt'); expect(STYLE_KIND.rainforest).toBe('land');
  });
  it('deterministic, in bounds, never empty', () => {
    for (const id of NEW) for (const seed of [1, 7, 23]) {
      const s = setup(id, seed), a = starterItems(s);
      expect(starterItems(s), id).toEqual(a);
      expect(a.length, id).toBeGreaterThan(2);
      for (const it of a) { expect(it.x).toBeGreaterThanOrEqual(0); expect(it.x).toBeLessThanOrEqual(900); expect(it.depth).toBeGreaterThanOrEqual(0); expect(it.depth).toBeLessThanOrEqual(450); }
    }
  });
  it('terrariums stock their own animals, marine styles stock salt animals', () => {
    for (const id of NEW) {
      const fish = starterAnimals(setup(id, 5), 1);
      expect(fish.length, id).toBeGreaterThan(0);
      for (const f of fish) { expect(STYLES[id as Exclude<LayoutId, 'none'>].animals).toContain(f.species); expect(!!getSpecies(f.species)!.salt).toBe(isReefy(id)); }
    }
    expect(starterAnimals(setup('python', 1), 1).map(f => f.species)).toEqual(['ballpython']);
  });
  it('terrarium grounds are dry types; blackwater lays catappa litter; an older style leaves litter alone', () => {
    expect(['soil', 'layered', 'tsand', 'clay', 'bark']).toContain(setup('arid', 3).substrate.type === 'custom' ? 'soil' : setup('arid', 3).substrate.type);
    expect(setup('blackwater', 3).substrate.litter?.leaf).toBe('catappa');
    const s = defaultSetup(); s.substrate.litter = { leaf: 'oak', density: 50, seed: 4 }; s.layout = { id: 'planted', seed: 2 }; styleGround(s);
    expect(s.substrate.litter).toEqual({ leaf: 'oak', density: 50, seed: 4 });
  });
});
