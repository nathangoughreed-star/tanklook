// Fish swim in place (lane FX1, 2026-11-15): a tail beat and a body wave done in the vertex shader, like the plant sway
// (plant3d SWAY_VERT) and with the same kind of switch. The wave runs along the card / body's own u axis (uv.x: 0 tail ..
// 1 nose, the same on the card and on the solid body, so the two move as one) and out of the card's plane (local z).
// Per geometry `aSwL` = the lateral scale (the card: the fish's width in mm; the unit body: 1; 0 = this fish holds still:
// bottom dwellers, shrimp, fish clinging to glass or hanging under a leaf, split tails). The shared `uSwim` = (time s,
// strength: 0 = the still pose, which is what picking, the selection box and exports see). Every fish part that must
// move with the body shares this code: the card, the body, and the outline shell.
import * as THREE from 'three';

/** The shared swim uniform: x time in seconds, y strength (0 = still). The viewer sets it per frame. */
export const SWIM = { uSwim: { value: new THREE.Vector2(0, 0) } };
export const SWIM_DECL = 'attribute float aSwL; uniform vec2 uSwim;';

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
  transformed.z += uSwim.y * aSwL * ${SWIM_AMP} * swG * swE * sin(swW);
}`;

// ---------- Drift (lane FX1, part 2): each free swimmer wanders in a small volume round its placed spot ----------
// Done on the CPU, moving the fish's card mesh (its solid body and outline are children): a few dozen transforms a frame.
// The placed spot stays the truth (saved, picked, exported): `home` is remembered on first use and put back whenever the
// motion is off or an export is made. Offsets are in the fish's own frame (nose = +x): mostly fore and aft, a little
// sideways and up and down, plus a slow yaw and pitch sway so it turns a little rather than sliding. They are small
// (at most 0.4 body lengths) and never carry the centre toward a wall, the water surface or the floor beyond where it
// was placed: `lo` / `hi` is the box the centre may roam (the tank less the fish's own reach), clamped around home.
export interface Drift { len: number; lo: [number, number, number]; hi: [number, number, number] }
interface Home { p: THREE.Vector3; q: THREE.Quaternion; ph: number }
const _o = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _a = new THREE.Quaternion();
export function applyDrift(meshes: THREE.Object3D[], t: number, on: boolean) {
  for (const m of meshes) {
    const d = m.userData.drift as Drift | undefined; if (!d) continue;
    let h = m.userData.home as Home | undefined;
    if (!h) { if (!on) continue; h = { p: m.position.clone(), q: m.quaternion.clone(), ph: m.position.x * 0.0173 + m.position.z * 0.0291 }; m.userData.home = h; }
    if (!on) { if (m.userData.moved) { m.position.copy(h.p); m.quaternion.copy(h.q); m.updateMatrix(); m.updateMatrixWorld(true); m.userData.moved = false; } continue; }
    const L = d.len, ph = h.ph;
    _o.set(L * (0.26 * Math.sin(0.21 * t + ph) + 0.1 * Math.sin(0.53 * t + 2 * ph)), L * 0.07 * Math.sin(0.19 * t + 0.7 * ph), L * 0.16 * Math.sin(0.27 * t + 1.3 * ph)).applyQuaternion(h.q).add(h.p);
    m.position.set(Math.min(Math.max(_o.x, Math.min(d.lo[0], h.p.x)), Math.max(d.hi[0], h.p.x)), Math.min(Math.max(_o.y, Math.min(d.lo[1], h.p.y)), Math.max(d.hi[1], h.p.y)), Math.min(Math.max(_o.z, Math.min(d.lo[2], h.p.z)), Math.max(d.hi[2], h.p.z)));
    _q.setFromEuler(_e.set(0, 0.1 * Math.sin(0.33 * t + 1.1 * ph), 0, 'YXZ')); _a.setFromEuler(_e.set(0, 0, 0.03 * Math.sin(0.25 * t + 0.9 * ph), 'XYZ'));
    m.quaternion.copy(_q).multiply(h.q).multiply(_a);
    m.updateMatrix(); m.updateMatrixWorld(true); m.userData.moved = true;
  }
}
