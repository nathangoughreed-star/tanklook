// Fish swim in place (lane FX1, 2026-11-15): a tail beat and a body wave done in the vertex shader, like the plant sway
// (plant3d SWAY_VERT) and with the same kind of switch. The wave runs along the card / body's own u axis (uv.x: 0 tail ..
// 1 nose, the same on the card and on the solid body, so the two move as one) and out of the card's plane (local z).
// Per geometry `aSwL` = the lateral scale (the card: the fish's width in mm; the unit body: 1; 0 = this fish holds still:
// bottom dwellers, shrimp, fish clinging to glass or hanging under a leaf, split tails). The shared `uSwim` = (time s,
// strength: 0 = the still pose, which is what picking, the selection box and exports see). Every fish part that must
// move with the body shares this code: the card, the body, and the outline shell.
import * as THREE from 'three';

/** The shared swim uniform: x time in seconds, y strength (0 = still). The viewer sets it per frame. */
export const SWIM = { uSwim: { value: new THREE.Vector2(0, 0) }, uCalm: { value: 1 } }; // uCalm (FB1): this fish's tail-beat strength, set per draw by `hookCalm` (1 = the usual beat, near 0 = hovering, above 1 = a wriggle)
export const SWIM_DECL = 'attribute float aSwL; uniform vec2 uSwim; uniform float uCalm;';

/** Tail-beat peak (fraction of body length) at the tail tip; a head at rest, growing toward the tail. */
export const SWIM_AMP = 0.055;

/** Moves `transformed` (the vertex in local space); put it right after begin_vertex, before anything reads the position. */
export const SWIM_VERT = `if (uSwim.y > 0.0 && aSwL > 0.0) {
  float swLen = max(aSwL, length(modelMatrix[0].xyz));
  float swS = 1.0 - uv.x;
  float swHz = clamp(2.6 * pow(60.0 / swLen, 0.35), 1.1, 3.4);
  float swPh = dot(modelMatrix[3].xz, vec2(0.0173, 0.0291));
  float swE = smoothstep(0.2, 1.0, swS); swE *= sqrt(swE);
  float swG = 0.78 + 0.22 * sin(uSwim.x * 0.37 + swPh * 1.7);
  float swW = 6.2832 * swHz * uSwim.x + swPh - 5.0 * swS;
  transformed.z += uSwim.y * uCalm * aSwL * ${SWIM_AMP} * swG * swE * sin(swW);
}`;


/** Gives every swim-shaded mesh under `root` a per-draw tail strength read from `root.userData.calm` (default 1), so one fish can hover while the next beats on (the materials are shared between fish). */
export function hookCalm(root: THREE.Object3D) {
  root.traverse(o => {
    const mesh = o as THREE.Mesh, mat = mesh.material as THREE.Material | undefined;
    if (!mesh.isMesh || !mat || Array.isArray(mat)) return;
    if (!(mat.userData.swim || (mat as THREE.ShaderMaterial).uniforms?.uCalm)) return;
    mesh.onBeforeRender = () => { SWIM.uCalm.value = (root.userData.calm as number | undefined) ?? 1; (mat as THREE.ShaderMaterial).uniformsNeedUpdate = true; };
  });
}
