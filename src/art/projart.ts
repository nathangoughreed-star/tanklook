/**
 * Projected face textures for the 3D fish body (fish model method, research/fish-model-sheet-method.md).
 * The body is painted from the side card only; from above and from the front that smears. A species listed here also gets
 * a TOP layer (the sheet's top view, same x scale as the card, centre line on the axis) and a FRONT layer (the sheet's front
 * view), each a transparent copy of the body with its own projected UVs and a per-vertex alpha that fades in where the surface
 * faces up / forward. A species not listed here is untouched.
 */
export interface ProjLayer {
  img: HTMLCanvasElement | ImageBitmap | HTMLImageElement;
  /** front only: image px per card unit (card width = 1), and the card y (up) of the image's centre row */
  k?: number; ky?: number; y0?: number;   // ky: vertical px per card unit when the front panel's face is stretched against the side view (default = k)
  /** top only: the body's width / the image's drawn width (render.photo thickx). The sheet draws the top view wider than the real fish and the
   *  build squeezes the body to the measured width; the image squeezes with it, else its outer third (the danio's flank stripes and eyes) fell off the body.
   *  A list of [u, factor] (u: 0 tail .. 1 nose) per station (photofish.ts widthScale). */
  sy?: number | [number, number][];
  /** alpha ramps on the surface normal: [from, to] (top: normal.y, front: normal.x) */
  ramp?: [number, number];
}
export const PROJ_ART: Record<string, { top?: ProjLayer; front?: ProjLayer }> = {};
