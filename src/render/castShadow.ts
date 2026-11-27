// Cast shadows from the fixture (lane SH1, request R191a, Nathan 2026-11-27: "add real cast shadows for the hardscape").
// The scene is lit by our own shader (lighting.ts aqLight), not three.js lights, so three's shadow maps never reach it.
// Instead render/castPass.ts draws the depth of the rock, wood, plants and gear as seen from the fixture into a depth
// texture, only when the scene or the light changes; aqLight reads it here and dims the fixture's share of the light
// (the room light and the water's scatter stay). Uniforms only: shared by every lit program, switching never recompiles.
import * as THREE from 'three';

/** How much of the fixture's light a cast shadow takes away (the rest is light scattered in the water and bounced off the glass and the sand). */
export const CAST_DEPTH = 0.82;

/** Bound while there is no shadow map: any plain texture (a plain sampler2D, not sampler2DShadow: a shadow sampler with no
 *  depth texture behind it fails every draw, and the stills / fish preview share these programs in other GL contexts). */
const NONE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); NONE.needsUpdate = true;
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
 * 1 - uCastK in full shadow. PCF by hand on the depth texture (nearest): a 4 x 4 grid of compares, tent-weighted by
 * the sub-texel position (= 3 x 3 bilinear compares), so the edge is smooth and a few texels wide. The receiver is pushed off its surface along the normal (no acne on slopes) and toward the light
 * by a small bias in mm.
 */
export const CAST_GLSL = `
uniform float uCastOn, uCastK; uniform sampler2D uCastMap; uniform mat4 uCastMat; uniform vec3 uCastNF; uniform vec2 uCastSoft;
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
  float ref = f * (z - nr) / (z * (f - nr));  // the receiver's depth-buffer value
  vec2 st = uCastSoft * uCastNF.z, t = uv / st - 0.5, b = floor(t), fr = t - b;
  vec4 wx = vec4(1.0 - fr.x, 1.0, 1.0, fr.x), wy = vec4(1.0 - fr.y, 1.0, 1.0, fr.y);
  float lit = 0.0;
  for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) {
    float d = texture2D(uCastMap, (b + vec2(float(i) - 0.5, float(j) - 0.5)) * st).r;
    lit += wx[i] * wy[j] * step(ref, d);
  }
  return 1.0 - uCastK * (1.0 - lit / 9.0);
}
`;
