// Cast shadows from the fixture (lane SH1, request R191a, Nathan 2026-11-27: "add real cast shadows for the hardscape").
// The scene is lit by our own shader (lighting.ts aqLight), not three.js lights, so three's shadow maps never reach it.
// Instead render/castPass.ts draws the depth of the rock, wood, plants and gear as seen from the fixture into a depth
// texture, only when the scene or the light changes; aqLight reads it here and dims the fixture's share of the light
// (the room light and the water's scatter stay). Uniforms only: shared by every lit program, switching never recompiles.
import * as THREE from 'three';

/** How much of the fixture's light a cast shadow takes away (the rest is light scattered in the water and bounced off the glass and the sand). */
export const CAST_DEPTH = 0.82;

/** Bound while there is no shadow map (a shadow sampler must always hold a depth texture with a compare mode, or the draw fails). */
const NONE = new THREE.DepthTexture(1, 1); NONE.compareFunction = THREE.LessEqualCompare;
export const castNone = () => NONE;

export const CAST = {
  uCastOn: { value: 0 },
  uCastMap: { value: NONE as THREE.Texture },
  uCastMat: { value: new THREE.Matrix4() },
  // near, far (mm, the shadow camera's), 1 / resolution
  uCastNF: { value: new THREE.Vector3(1, 1000, 1 / 2048) },
  // penumbra in shadow-map texels along x, along z (a tube or an LED bar is a line along x: softer that way)
  uCastSoft: { value: new THREE.Vector2(1, 1) },
  uCastK: { value: CAST_DEPTH },
};

/**
 * GLSL for the fragment (after the declarations of vAqP, uCard, uPane, uFish): aqCast(n) = 1 in the light, down to
 * 1 - uCastK in full shadow. Hardware PCF (sampler2DShadow, each tap a 2x2 bilinear compare), 3 x 3 taps: crisp edges
 * a few texels wide. The receiver is pushed off its surface along the normal (no acne on slopes) and toward the light
 * by a small bias in mm.
 */
export const CAST_GLSL = `
uniform float uCastOn, uCastK; uniform sampler2DShadow uCastMap; uniform mat4 uCastMat; uniform vec3 uCastNF; uniform vec2 uCastSoft;
float aqCastK = 1.0;
float aqCast(vec3 n) {
  if (uCastOn < 0.5 || uPane > 0.5) return 1.0;
  float card = uCard > 0.5 || uFish > 0.5 ? 1.0 : 0.0;
  vec3 p = vAqP + n * mix(1.2, 0.6, card);
  vec4 c = uCastMat * vec4(p, 1.0);
  if (c.w <= uCastNF.x) return 1.0;
  vec2 uv = c.xy / c.w * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 1.0;
  float z = max(c.w - mix(1.5, 4.0, card), uCastNF.x), f = uCastNF.y, nr = uCastNF.x;
  float ref = clamp(f * (z - nr) / (z * (f - nr)), 0.0, 1.0);
  vec2 s = uCastSoft * uCastNF.z; float lit = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) lit += texture(uCastMap, vec3(uv + vec2(float(i), float(j)) * s, ref));
  return 1.0 - uCastK * (1.0 - lit / 9.0);
}
`;
