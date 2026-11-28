// Sessile livestock (2026-11-28, research/design/sessile-livestock.md): the bubble-tip anemone is a stocked animal that sits, hosts, and counts.
import { describe, expect, it } from 'vitest';
import { getSpecies } from '../src/data/species';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { parseScene } from '../src/scene/validate';
import { migrateAnemoneItems } from '../src/scene/sessileMigrate';
import { floorUseCm2, massG, metClass, spaceOf, stockingOf } from '../src/scene/stocking';
import { shuffleFish } from '../src/scene/scatter';
import { regenerate, starterAnimals } from '../src/scene/starter';
import clownnano from '../src/examples/ss2-clownnano.json';
import type { Fish, Item, TankSetup } from '../src/scene/types';

const salt = (): TankSetup => { const s = defaultSetup(); s.tank = { ...s.tank, L: 24 * IN, D: 12 * IN, H: 16 * IN }; s.water.on = true; s.water.level = 0.9; s.water.salt = true; s.fish = []; s.items = []; return s; };
const fish = (id: number, species: string): Fish => ({ id, species, x: 300, y: 100, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0 });

describe('sessile livestock', () => {
  it('bta is a salt invertebrate animal that rests, does not swim, and hosts the clownfish', () => {
    const sp = getSpecies('bta')!;
    expect(sp.kind).toBe('sessile'); expect(sp.salt).toBe(true); expect(sp.cat).toBe('sw-invert');
    expect(sp.hosts).toContain('ocellaris'); expect(sp.surfaces).toEqual(['floor', 'hardscape']);
  });
  it('counts in stocking: bioload class, no swimming room, a floor patch for its disc', () => {
    const sp = getSpecies('bta')!;
    expect(metClass(sp)).toBe('sessile'); expect(spaceOf(sp, sp.tl)).toBe(0);
    expect(floorUseCm2(sp, 150)).toBeCloseTo(Math.PI / 4 * 15 * 15, 5);
    expect(massG('bta', 150)).toBeGreaterThan(50);
    const s = salt(); const none = stockingOf(s).loadPercent; s.fish = [fish(1, 'bta')];
    expect(stockingOf(s).loadPercent).toBeGreaterThan(none);
  });
  it('an anemone coral item in a saved tank becomes the animal on load, keeping place, size and uid', () => {
    const s = salt();
    s.items = [{ id: 1, uid: 'i-keep', kind: 'coral', variant: 'anemone', seed: 3, x: 200, depth: 100, lift: 0, yaw: 20, pitch: 0, tilt: 0, size: 120 } as Item, { id: 2, kind: 'coral', variant: 'zoanthid', seed: 1, x: 100, depth: 100, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: 60 } as Item];
    expect(migrateAnemoneItems(s)).toBe(1);
    expect(s.items.map(i => i.variant)).toEqual(['zoanthid']);
    expect(s.fish).toHaveLength(1); expect(s.fish[0]).toMatchObject({ species: 'bta', uid: 'i-keep', x: 200, depth: 100, tl: 120, surface: 'floor' });
    expect(migrateAnemoneItems(s)).toBe(0); // idempotent
  });
  it('the saved clownnano example loads with the anemone as an animal and no anemone item', () => {
    const { scene } = parseScene(clownnano);
    for (const t of scene.tanks) { expect(t.items.some(i => i.variant === 'anemone')).toBe(false); }
    const had = JSON.stringify(clownnano).includes('"anemone"');
    if (had) expect(scene.tanks.some(t => t.fish.some(f => f.species === 'bta'))).toBe(true);
  });
  it('Shuffle puts the anemone on rock or floor and the clownfish pair in it', () => {
    const s = salt(); s.fish = [fish(1, 'bta'), fish(2, 'ocellaris'), fish(3, 'ocellaris')];
    shuffleFish(s, (() => { let a = 7; return () => (a = (a * 16807) % 2147483647) / 2147483647; })());
    const a = s.fish[0], c = s.fish[1];
    expect(['floor', 'hardscape']).toContain(a.surface);
    expect(Math.hypot(c.x - a.x, c.depth - a.depth)).toBeLessThan(a.tl ?? 150);
  });
  it('regenerating the clownnano layout with animals at None still brings its one anemone', () => {
    const s = salt(); s.layout = { ...s.layout, id: 'clownnano', seed: 4 } as TankSetup['layout']; s.layout.dens = { hard: 2, plant: 2, animal: 0 };
    regenerate(s, 'all', 1);
    expect(s.fish.filter(x => x.species === 'bta')).toHaveLength(1); expect(s.items.some(i => i.variant === 'anemone')).toBe(false);
  });
  it('the clownfish nano starter set is built round one anemone', () => {
    const s = salt(); s.layout = { ...s.layout, id: 'clownnano', seed: 4 } as TankSetup['layout'];
    s.layout.dens = { hard: 2, plant: 2, animal: 3 }; const f = starterAnimals(s, 1);
    expect(f.filter(x => x.species === 'bta')).toHaveLength(1); expect(f.some(x => x.species === 'ocellaris')).toBe(true);
  });
});
