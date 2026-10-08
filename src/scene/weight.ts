// Approximate filled weight of the tank: water over the ground, the substrate / land, and the glass. Not included:
// the stand, rocks, wood, plants, rim trim and equipment.
import { glassThickness, waterY } from './physics';
import { groundHeight } from './terrain';
import type { Tank, TankSetup } from './types';

/** kg per litre: fresh water; soda-lime glass; dry gravel / soil (bulk); water held in the gaps of submerged substrate. */
export const DENSITY = { water: 1.0, glass: 2.5, substrate: 1.6, pore: 0.35 };
/** Lid panels are 4 mm glass (see the lid builder). */
const LID_GLASS = 4;

export interface Weight { water: number; substrate: number; glass: number; total: number; waterLitres: number }

/** Weight in kg, integrating water depth and ground height over a grid on the floor (so slopes, terrain and land count). */
export function tankWeight(S: TankSetup, T: Tank = S.tank, n = 60): Weight {
  const top = S.water.on ? waterY(T, S.water.level) : 0, cell = (T.L / n) * (T.D / n) / 1e6; // litres per mm of height
  let water = 0, under = 0, over = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const g = groundHeight(S, T, T.L * (i + 0.5) / n, T.D * (j + 0.5) / n);
    water += Math.max(0, top - g) * cell; under += Math.min(g, top) * cell; over += Math.max(0, g - top) * cell;
  }
  const t = glassThickness(T, S.render.glass), { L, H, D } = T;
  // bottom under everything; front/back span the ends; the ends sit between them (matches the renderer's panes)
  let glassL = ((L + 2 * t) * (D + 2 * t) * t + 2 * (L + 2 * t) * H * t + 2 * D * H * t) / 1e6;
  if (S.lid === 'glass') glassL += L * D * LID_GLASS / 1e6;
  const w = {
    water: water * DENSITY.water,
    substrate: (under + over) * DENSITY.substrate + under * DENSITY.pore,
    glass: glassL * DENSITY.glass,
    waterLitres: water,
  };
  return { ...w, total: w.water + w.substrate + w.glass };
}
