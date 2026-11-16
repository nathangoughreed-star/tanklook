// The collision field for the current scene, built once and shared by everything that moves through the tank (swimmers and crawlers).
import { buildSwimField } from './swimField';
import type { SwimField } from '../scene/swimTypes';
import type { Tank, TankSetup } from '../scene/types';

export interface SwimWorld { S: TankSetup; T: Tank; rise?: (x: number, depth: number) => number }
let lastKey = '', lastField: SwimField | null = null, lastMs = 0;
export const worldKey = (w: SwimWorld) => JSON.stringify([w.S.tank, w.S.items, w.S.terrain, w.S.water.level, w.S.substrate, w.S.layout]);
/** The field for this scene (memoised on what shapes it). `ms` = what the last real build cost. */
export function swimFieldFor(w: SwimWorld): { field: SwimField; key: string; ms: number } {
  const key = worldKey(w);
  if (key !== lastKey || !lastField) { const t0 = performance.now(); lastField = buildSwimField(w.S, w.T, { rise: w.rise }); lastKey = key; lastMs = performance.now() - t0; }
  return { field: lastField, key, ms: lastMs };
}
