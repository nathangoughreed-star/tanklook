import { starterItems } from './items';
import { IN } from './physics';
import { SCENE_VERSION, type Fish, type Scene, type TankSetup } from './types';

export function defaultScene(): Scene {
  return { version: SCENE_VERSION, name: 'My tank', units: 'in', tanks: [defaultSetup()], active: 0, camLock: true };
}

/** What a first visit and New start from: one bare tank (bareSetup). */
export function emptyScene(): Scene {
  return { ...defaultScene(), tanks: [bareSetup()] };
}

/** The stocked demo tank (planted layout, a few fish); also the base other setups and old files are filled in from. */
export function defaultSetup(): TankSetup {
  const A = { L: 24 * IN, H: 12 * IN, D: 12 * IN };
  let id = 1;
  const fish = (species: string, x: number, y: number, depth: number): Fish =>
    ({ id: id++, species, x, y, depth, yaw: 0, pitch: 0, roll: 0, bend: 0 });
  const s: TankSetup = {
    tank: A,
    camera: { dist: 3000, az: 0, el: 0, zoom: 1 },
    render: { edge: 'a2c', grid: true, rim: true, edges: true, beams: false, pop: 0.15, bg: 'blue', bgSides: ['back'], bgArc: 145, bgImages: [], glass: 'auto', glassType: 'standard' },
    light: { type: 'flat', count: 2, rows: 1, pattern: 'grid', spacing: 0, cone: 52, bright: 1, kelvin: 6500, room: 0.15, height: 50 },
    substrate: { show: true, type: 'gravel', custom: { grain: 'sand', color: '#cbb894', grain2: 'none', color2: '#6f6556', share: 30, mix: 0.5 }, fl: 1 * IN, fr: 1 * IN, bl: 3 * IN, br: 3 * IN },
    layout: { id: 'planted', seed: 1, dens: { hard: 2, plant: 2, animal: 0 } },
    terrain: { on: false, cols: 7, rows: 0, h: [], pools: [] },
    water: { on: true, level: 1, color: '#7fb8a8', opacity: 0 },
    lid: 'open',
    stand: { show: true, height: 30 * IN, finish: 'black', style: 'cabinet', table: { shape: 'rect', L: 36 * IN, D: 18 * IN, x: 0, z: 0 } },
    wall: { show: false, side: 'back', color: '#d8d2c6' },
    person: { show: false, height: 1750, side: 'left' },
    backdrop: { kind: 'none', depth: 50, seed: 1 },
    grow: { feed: 'low', time: 0, mode: 'rel' },
    condition: { level: 0 },
    fish: [
      fish('angel', 0.45 * A.L, 0.55 * A.H, 0.5 * A.D),
      fish('neon', 0.8 * A.L, 0.22 * A.H, 0.05 * A.D),
      fish('neon', 0.8 * A.L, 0.34 * A.H, 0.5 * A.D),
      fish('neon', 0.8 * A.L, 0.46 * A.H, 0.95 * A.D),
    ],
    items: [],
  };
  s.items = starterItems(s);
  return s;
}

/** A bare, empty tank (Nathan 2026-10-13): no animals, background, grid, substrate or hardscape. */
export function bareSetup(): TankSetup {
  const s = defaultSetup();
  s.fish = []; s.items = []; s.layout.id = 'none';
  s.render.bg = 'none'; s.render.grid = false; s.substrate.show = false;
  return s;
}

// The tank presets moved to the catalog (src/data/tanks.json, lane KA 2026-10-19): see tankChoices() in data/tanks.ts.
