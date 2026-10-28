// Shared by the arthropod families (art/arth/*.ts); see art/arthropods.ts for the frame and the units.
import type { Pt } from '../paint';
import type { Herp3D } from '../herps';

export interface ArthSpec { aspect: number; h: Herp3D }
export const ground = (aspect: number) => aspect / 2 - 0.015;

/** A plain capsule body with no limbs: the placeholder every family starts from until its real drawing replaces it. */
export function stub(aspect: number, col: string): ArthSpec {
  const g = ground(aspect), top = g - 0.16, side: Pt[] = [[0.98, g - 0.08, 'c'], [0.9, top + 0.03], [0.6, top], [0.2, top + 0.01], [0.04, g - 0.08, 'c'], [0.2, g - 0.01], [0.6, g], [0.9, g - 0.01]];
  return { aspect, h: { side, wid: [[0.04, 0.03], [0.5, 0.08], [0.96, 0.03]], belly: 2.4, tone: [[0, col], [0.5, col], [1, col]], marks: [], limbs: [], legCol: [col, col],
    eye: { u: 0.9, th: 0.3, r: 0.012, iris: ['#2a2420', '#080606'], pupil: 'dark', bulge: 0.6 }, ground: g } };
}
