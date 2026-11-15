import type { SwimmerSpec } from '../src/scene/swimTypes';
import { boxTank, type Obs } from './swimFieldDouble';

export const L = 900, D = 450, TOP = 450, GROUND = 30;
export const OBS: Obs[] = [
  { kind: 'box', min: [150, 0, -300], max: [260, 140, -200] },          // low rock
  { kind: 'box', min: [420, 0, -250], max: [470, 330, -190] },          // tall driftwood trunk
  { kind: 'box', min: [600, 0, -120], max: [820, 90, -30] },            // rock shelf
  { kind: 'cyl', x: 330, z: -330, r: 45, y0: 0, y1: 300 },              // plant clump
  { kind: 'cyl', x: 720, z: -300, r: 35, y0: 0, y1: 380 },
  { kind: 'cyl', x: 110, z: -100, r: 40, y0: 0, y1: 250 },
];
export const field = boxTank(L, D, TOP, GROUND, OBS);

export function cast(): SwimmerSpec[] {
  const out: SwimmerSpec[] = []; let id = 1;
  const home = (x: number, y: number, z: number, yaw = 0) => ({ x, y, z, yaw, pitch: 0, roll: 0 });
  for (let k = 0; k < 12; k++) out.push({ id: id++, len: 40, zone: 'water', band: [0.4, 0.8], group: { key: 'danio', tight: true }, home: home(520 + (k % 4) * 25, 250 + Math.floor(k / 4) * 25, -100 - (k % 3) * 20, 20) });
  for (let k = 0; k < 8; k++) out.push({ id: id++, len: 50, zone: 'water', band: [0.2, 0.6], group: { key: 'tetra', tight: false }, home: home(100 + (k % 4) * 40, 150 + Math.floor(k / 2) * 20, -380 + (k % 2) * 30, 180) });
  for (let k = 0; k < 3; k++) out.push({ id: id++, len: 50, zone: 'bottom', band: [0, 0.05], group: { key: 'cory', tight: false }, home: home(560 + k * 40, GROUND + 7, -380, 90 * k) });
  out.push({ id: id++, len: 120, zone: 'bottom', band: [0, 0.05], home: home(300, GROUND + 15, -60) });
  for (let k = 0; k < 16; k++) out.push({ id: id++, len: 60 + k * 6, zone: 'water', band: [0.1 + (k % 5) * 0.15, 0.3 + (k % 5) * 0.15], home: home(100 + k * 45, 120 + k * 15, -60 - (k % 6) * 60, k * 40) });
  return out;
}

