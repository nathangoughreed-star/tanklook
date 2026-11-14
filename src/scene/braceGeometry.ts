// Lane CT1 (2026-11-14): the eurobrace as boxes, for the 3D tank. Pure (no three.js). GS1's BraceSpec: a strip of glass `width` x `thickness`
// glued flat along the inside top of all four walls, plus `cross` front-to-back strips of `crossWidth` evenly spaced (the solver's tie
// positions: L (i + 1) / (n + 1)). Interior coordinates in mm: x along the length 0..L, d from the front glass 0..D, y up from the floor.
import type { Tank } from './types';

export interface BraceBox { x0: number; x1: number; d0: number; d1: number; y0: number; y1: number; kind: 'front' | 'back' | 'left' | 'right' | 'cross' }
export interface BraceDims { width: number; thickness: number; cross?: number; crossWidth?: number }

/** The strips of a brace on a box tank: four perimeter strips (front and back full length, the ends between them) and the cross strips. */
export function braceBoxes(T: Pick<Tank, 'L' | 'D' | 'H'>, b: BraceDims): BraceBox[] {
  const { L, D, H } = T, w = Math.min(b.width, D / 2 - 1, L / 2 - 1), y0 = H - b.thickness, y1 = H, n = Math.round(b.cross ?? 0), cw = b.crossWidth ?? b.width;
  const out: BraceBox[] = [
    { kind: 'front', x0: 0, x1: L, d0: 0, d1: w, y0, y1 }, { kind: 'back', x0: 0, x1: L, d0: D - w, d1: D, y0, y1 },
    { kind: 'left', x0: 0, x1: w, d0: w, d1: D - w, y0, y1 }, { kind: 'right', x0: L - w, x1: L, d0: w, d1: D - w, y0, y1 },
  ];
  for (let i = 0; i < n; i++) { const c = L * (i + 1) / (n + 1); out.push({ kind: 'cross', x0: c - cw / 2, x1: c + cw / 2, d0: w, d1: D - w, y0, y1 }); }
  return out;
}

/** Glass volume of the boxes (mm^3); equals GS1's glassWeight() brace term. */
export const braceVolume = (boxes: readonly BraceBox[]) => boxes.reduce((s, b) => s + (b.x1 - b.x0) * (b.d1 - b.d0) * (b.y1 - b.y0), 0);
