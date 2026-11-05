// What the tank stands on (lane ST1, Nathan 2026-11-05): the floor, a stand, or the person's own furniture. One home, many entrances: the New-tank
// picker's "Put it on" step and the Room section both write these fields, nothing else. Own furniture IS the existing `table` stand style
// (TableSettings + stand.height, scene/table.ts), with the user's own measurements; no new field. The budget counts a stand only for the
// cabinet / frame / custom styles (demand/engine.ts), so floor and furniture add no stand cost.
import { LIMITS } from './validate';
import { fitTable, tableRange } from './table';
import { IN, clamp } from './physics';
import type { StandFinish, TankSetup } from './types';

export type Placement = 'floor' | 'stand' | 'furniture';
export const PLACEMENTS: [Placement, string, string][] = [
  ['floor', 'The floor', 'Straight on the floor: no stand and none counted in the budget'],
  ['stand', 'A stand', 'A cabinet or an open metal frame, in black, white or oak'],
  ['furniture', 'My own furniture', 'A table, dresser or counter you already have: its height and the size of its top'],
];

/** Where this setup's tank stands now. */
export function placementOf(S: TankSetup): Placement {
  if (!S.stand.show) return 'floor';
  return S.stand.style === 'table' ? 'furniture' : 'stand';
}

export interface Furniture { shape: 'rect' | 'round'; /** top length (rect) or diameter (round), mm */ L: number; /** top depth (rect), mm */ D: number; /** floor to top, mm */ height: number }

/** The tank on the floor: no stand drawn, none counted. */
export function putOnFloor(S: TankSetup): void { S.stand.show = false; S.stand.need = 'none'; }

/** The tank on a bought stand: a cabinet or an open frame (a custom-size cabinet stays what it is), in a finish. */
export function putOnStand(S: TankSetup, o: { style?: 'cabinet' | 'frame'; finish?: StandFinish } = {}): void {
  S.stand.show = true; S.stand.need = 'added';
  if (o.style) S.stand.style = o.style; else if (S.stand.style === 'table') S.stand.style = 'cabinet';
  if (o.finish) S.stand.finish = o.finish;
}

/** The tank on the person's own table / counter. The top is grown to hold the tank (fitTable); the result says whether it had to be. */
export function putOnFurniture(S: TankSetup, f: Furniture): { grown: boolean; minL: number; minD: number } {
  S.stand.show = true; S.stand.need = 'added'; S.stand.style = 'table';
  S.stand.height = clamp(f.height, LIMITS.stand[0], LIMITS.stand[1]);
  const round = f.shape === 'round';
  S.stand.table = { shape: f.shape, L: f.L, D: round ? f.L : f.D, x: 0, z: 0 };
  const r = tableRange(S), wasL = S.stand.table.L, wasD = S.stand.table.D;
  fitTable(S);
  return { grown: S.stand.table.L > wasL + 0.5 || (!round && S.stand.table.D > wasD + 0.5), minL: r.minL, minD: round ? r.minL : r.minD };
}

/** The smallest top (mm) that holds this tank, for a rect or round table: what "Your top is too small" tells the person. */
export function minTop(S: TankSetup, shape: 'rect' | 'round'): { L: number; D: number } {
  const c = structuredClone(S); c.stand.show = true; c.stand.style = 'table'; c.stand.table = { shape, L: 1, D: 1, x: 0, z: 0 };
  fitTable(c); return { L: c.stand.table.L, D: c.stand.table.D };
}

/** "My own furniture" picked: a table / dresser / counter, 30 in high with a 36 x 18 in top to start from (each at least what holds the tank), or what it already is. The person then types their own measurements. */
export function putOnMyFurniture(S: TankSetup) {
  const t = S.stand.table, was = placementOf(S) === 'furniture';
  return putOnFurniture(S, was ? { shape: t.shape, L: t.L, D: t.D, height: S.stand.height } : { shape: 'rect', L: Math.max(t.L, 36 * IN), D: Math.max(t.D, 18 * IN), height: 30 * IN });
}
