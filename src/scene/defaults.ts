import { IN } from './physics';
import { SCENE_VERSION, type Fish, type Scene, type TankSetup } from './types';

export function defaultScene(): Scene {
  return { version: SCENE_VERSION, name: 'My tank', units: 'in', tanks: [defaultSetup()], active: 0, camLock: true };
}

export function defaultSetup(): TankSetup {
  const A = { L: 24 * IN, H: 12 * IN, D: 12 * IN };
  let id = 1;
  const fish = (species: string, x: number, y: number, depth: number): Fish =>
    ({ id: id++, species, x, y, depth, yaw: 0, pitch: 0, roll: 0, bend: 0 });
  return {
    tank: A,
    camera: { dist: 3000, az: 0, el: 0, zoom: 1 },
    render: { edge: 'a2c', grid: true, rim: true, bg: 'blue', glass: 'auto', glassType: 'standard' },
    light: { type: 'flat', count: 2, bright: 1, kelvin: 6500, room: 0.15, height: 50 },
    substrate: { show: true, type: 'gravel', fl: 1 * IN, fr: 1 * IN, bl: 3 * IN, br: 3 * IN },
    layout: { id: 'planted', seed: 1 },
    terrain: { on: false, cols: 7, rows: 0, h: [] },
    water: { on: true, level: 1, color: '#7fb8a8', opacity: 0 },
    lid: 'open',
    stand: { show: false, height: 30 * IN, finish: 'black', style: 'cabinet' },
    wall: { show: false, side: 'back', color: '#d8d2c6' },
    person: { show: false, height: 1750, side: 'left' },
    fish: [
      fish('angel', 0.45 * A.L, 0.55 * A.H, 0.5 * A.D),
      fish('neon', 0.8 * A.L, 0.22 * A.H, 0.05 * A.D),
      fish('neon', 0.8 * A.L, 0.34 * A.H, 0.5 * A.D),
      fish('neon', 0.8 * A.L, 0.46 * A.H, 0.95 * A.D),
    ],
  };
}

export const TANK_PRESETS: [label: string, L: number, H: number, D: number][] = [
  ['10 gal 20×12×10', 20, 12, 10], ['20 long 30×12×12', 30, 12, 12], ['20 high 24×16×12', 24, 16, 12],
  ['29 gal 30×18×12', 30, 18, 12], ['40 breeder 36×16×18', 36, 16, 18], ['55 gal 48×21×13', 48, 21, 13],
  ['75 gal 48×21×18', 48, 21, 18], ['125 gal 72×22×18', 72, 22, 18], ['24×12×12 cube-ish', 24, 12, 12],
  ['24×12×24 deep', 24, 12, 24],
];
