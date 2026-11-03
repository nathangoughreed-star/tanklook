/**
 * The water's colour as a filter seen through the glass (lane WT1, Nathan 2026-11-03: the old haze grew with depth and
 * "looked like a fog inside the tank"). Everything behind the water is multiplied by one colour, whatever the depth or the
 * view angle, so fish, wood and plants keep their contrast; only the sightlines that cross the water are filtered, so
 * nothing above the water line is tinted. Pure and DOM-free: `lighting.ts` runs the same formula in GLSL
 * (`WATER_FILTER_GLSL`), test/waterTint.test.ts pins the numbers.
 *
 * The filter is Beer-Lambert shaped: the water colour, normalised so its brightest channel is 1 (its hue), raised to a
 * power that grows with the slider (`opacity`), with a small dimming for a dark water colour. Clear water (opacity 0) is
 * exactly white (no change).
 */
export type RGB = [number, number, number];
export type Hue = [number, number, number, number];

/** `waterK` (scene/physics) is -ln(1 - opacity) / WATER_SPAN: the opacity the old haze reached across 300 mm of water. */
export const WATER_SPAN = 300;
/** How hard the hue is applied at opacity 1 (the exponent), and how much a dark colour also dims the light. */
export const TINT_EXP = 1.0, TINT_DIM = 0.25;
/** Channel floor of the hue, so a pure red or blue water never goes fully black in the other channels. */
const HUE_FLOOR = 0.02;

/** The slider value (0..1) behind a per-mm tint `k` (inverse of `waterK`). */
export const opacityOfK = (k: number) => k > 0 ? 1 - Math.exp(-WATER_SPAN * k) : 0;

/** Water colour (linear RGB) to the uniform: hue (brightest channel 1) and, in w, how dark the colour is (0..1). */
export function waterHue(c: RGB): Hue {
  const m = Math.max(c[0], c[1], c[2], 1e-4);
  return [Math.max(c[0] / m, HUE_FLOOR), Math.max(c[1] / m, HUE_FLOOR), Math.max(c[2] / m, HUE_FLOOR), 1 - Math.min(m, 1)];
}

/** The colour every sightline through the water is multiplied by. No depth, view angle or position in it, by design. */
export function waterFilter(h: Hue, opacity: number): RGB {
  const o = Math.min(Math.max(opacity, 0), 0.97), dim = 1 - TINT_DIM * o * h[3], e = TINT_EXP * o * (0.4 + 0.6 * h[3]); // a pale colour (salt blue) absorbs less than a dark one (tea)
  return [Math.pow(h[0], e) * dim, Math.pow(h[1], e) * dim, Math.pow(h[2], e) * dim];
}

/**
 * A multiply cannot colour black (a dark background behind amber water stays black), so the glass also carries a faint
 * veil of the water's hue, added to what is seen through it: constant like the filter, never growing with depth.
 */
export const TINT_VEIL = 0.12;
export function waterVeil(h: Hue, opacity: number): RGB {
  const k = TINT_VEIL * Math.min(Math.max(opacity, 0), 0.97);
  return [h[0] * k, h[1] * k, h[2] * k];
}

/** GLSL of `waterFilter` / `waterVeil` from `uWater.w` (= waterK) and `uWTint` (= waterHue). Needs `uniform vec4 uWater, uWTint;`. */
export const WATER_FILTER_GLSL = `
vec3 aqWaterFilter() {
  float o = 1.0 - exp(-${WATER_SPAN.toFixed(1)} * uWater.w);
  return pow(uWTint.rgb, vec3(${TINT_EXP.toFixed(2)} * o * (0.4 + 0.6 * uWTint.w))) * (1.0 - ${TINT_DIM.toFixed(2)} * o * uWTint.w);
}
vec3 aqWaterVeil() { return uWTint.rgb * (${TINT_VEIL.toFixed(2)} * (1.0 - exp(-${WATER_SPAN.toFixed(1)} * uWater.w))); }`;

