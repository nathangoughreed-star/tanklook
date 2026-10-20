// The owner's space as a dashed outline (lane P3, 2026-10-20): a dashed rectangle on the stand top, a dashed box when a
// height is set; centred on the tank's length, back edge on the tank's back (tanks stand against a wall). Teal while the
// tank fits, red once it goes past. Dashes are thin bars, not GL lines (1 px lines vanish on a phone); a faint copy drawn
// through everything shows where the space runs under the tank's glass and gravel.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tankUnderside } from '../scene/physics';
import { spaceFit, tankExtent } from '../scene/space';
import type { Tank, TankSetup } from '../scene/types';

const DASH = 36, GAP = 24, BAR = 5; // mm
export const OUTLINE_FIT = 0x1f7a8c, OUTLINE_OVER = 0xd8432f;

/** The outline's edges as [from, to] in world mm (x, y, z = -depth); empty when no space is set. */
export function outlineEdges(S: TankSetup, T: Tank): [THREE.Vector3, THREE.Vector3][] {
  const s = S.layout.space; if (!s) return [];
  const e = tankExtent(T), y0 = tankUnderside(T, S.render) + BAR / 2 + 0.5;
  const x0 = e.w / 2 - s.w / 2, x1 = e.w / 2 + s.w / 2, z0 = -e.d, z1 = -(e.d - s.d); // back, front
  const ring = (y: number) => [new THREE.Vector3(x0, y, z1), new THREE.Vector3(x1, y, z1), new THREE.Vector3(x1, y, z0), new THREE.Vector3(x0, y, z0)];
  const lo = ring(y0), out: [THREE.Vector3, THREE.Vector3][] = lo.map((p, i) => [p, lo[(i + 1) % 4]]);
  if (s.h) { const hi = ring(y0 + s.h); hi.forEach((p, i) => { out.push([p, hi[(i + 1) % 4]], [lo[i], p]); }); }
  return out;
}

/** The dashes of one edge, as bar geometries (a dash always sits on each corner, so the corners read). */
function dashes(a: THREE.Vector3, b: THREE.Vector3): THREE.BufferGeometry[] {
  const len = a.distanceTo(b), n = Math.max(1, Math.round((len + GAP) / (DASH + GAP))), step = len / n, d = Math.min(DASH, step * 0.6);
  const dir = b.clone().sub(a).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir), out: THREE.BufferGeometry[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i === 0 ? d / 4 : i === n ? len - d / 4 : i * step, w = i === 0 || i === n ? d / 2 : d; // half dashes at the ends
    const g = new THREE.BoxGeometry(w, BAR, BAR); g.applyQuaternion(q); g.translate(...a.clone().addScaledVector(dir, t).toArray());
    out.push(g);
  }
  return out;
}

/** The outline's meshes (solid + see-through ghost), or none when no space is set. */
export function spaceOutline(S: TankSetup, T: Tank): THREE.Object3D[] {
  const s = S.layout.space; if (!s) return [];
  const parts = outlineEdges(S, T).flatMap(([a, b]) => dashes(a, b)), g = mergeGeometries(parts); for (const p of parts) p.dispose();
  const color = spaceFit(T, s).fits ? OUTLINE_FIT : OUTLINE_OVER;
  const solid = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color }));
  const ghost = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthTest: false, depthWrite: false }));
  ghost.renderOrder = 10;
  for (const m of [solid, ghost]) { m.userData.nolight = true; m.userData.spaceOutline = true; }
  return [solid, ghost];
}

/** What the outline depends on (the build reuses it while this is unchanged). */
export const outlineKey = (S: TankSetup, T: Tank) => 'space' + JSON.stringify([S.layout.space ?? null, T, S.render.glass, S.render.rim]);
