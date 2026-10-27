// The room inside the stand a sump stands in (lane SF, Nathan 2026-10-26: "just say it wont fit in the stand and dont allow both
// the sump and stand. no sticking out of the stand walls"). The sizes follow how render/build.ts draws each stand style.
import { glassThickness } from './physics';
import { TABLE_TOP } from './table';
import { sumpOf } from './tech';
import type { TankSetup } from './types';

/** A cabinet's panel thickness, mm (sides, back, top; the doors stand proud of the carcass, build.ts DOOR_T). */
export const STAND_PANEL = 18;
/** A frame stand's square tube, mm (build.ts TUBE). */
const TUBE = 38;

export interface Room { L: number; D: number; H: number }
type Box = { L: number; D: number; H: number };

/** Inside the stand (mm): a cabinet less its panels and kick plate, a frame less its tubes, under a table top and apron between
 *  its legs. Undefined when no stand is shown: the tank sits on the floor and a sump stands beside it. */
export function standInside(S: TankSetup): Room | undefined {
  if (!S.stand.show) return undefined;
  const T = S.tank, h = S.stand.height, t = glassThickness(T, S.render.glass), tb = S.stand.table;
  // the outline: the tank's outer glass (cabinet, frame) or the table top (table, custom); a round top holds its inscribed square
  const [L, D] = S.stand.style === 'table' || S.stand.style === 'custom' ? (tb.shape === 'round' ? [tb.L / Math.SQRT2, tb.L / Math.SQRT2] : [tb.L, tb.D]) : [T.L + 2 * t, T.D + 2 * t];
  if (S.stand.style === 'frame') { const s = Math.min(TUBE, h / 6); return { L: L - 2 * s, D: D - 2 * s, H: h - 2 * s }; }
  if (S.stand.style === 'table') {
    const topT = Math.min(TABLE_TOP, h / 4), apronH = Math.min(90, h / 6), leg = Math.min(60, h / 8), inset = Math.min(50, tb.L / 8, tb.D / 8);
    return { L: L - 2 * (inset + leg), D: D - 2 * (inset + leg), H: h - topT - apronH };
  }
  return { L: L - 2 * STAND_PANEL, D: D - 2 * STAND_PANEL, H: h - STAND_PANEL - Math.min(70, h * 0.12) };
}

/** Does a box this size stand inside the stand (any box fits with no stand: it goes beside the tank)? */
export function fitsInStand(S: TankSetup, z: Box): boolean {
  const r = standInside(S);
  return !r || (z.L <= r.L && z.D <= r.D && z.H <= r.H);
}

/** The tank's sump fits inside its stand (true with no sump, or no stand). */
export const sumpFitsStand = (S: TankSetup): boolean => { const z = sumpOf(S); return !z || fitsInStand(S, z); };

/** Where a box is too big for the stand: each side that does not fit, the box's size and the room inside (mm). */
export function standMisfit(S: TankSetup, z: Box): { side: 'long' | 'deep' | 'tall'; size: number; room: number }[] {
  const r = standInside(S); if (!r) return [];
  return ([['long', 'L'], ['deep', 'D'], ['tall', 'H']] as const).filter(([, k]) => z[k] > r[k]).map(([side, k]) => ({ side, size: z[k], room: r[k] }));
}
