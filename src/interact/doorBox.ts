// The cabinet doors open only from a click inside a box around their handle(s) (Nathan 2026-11-12: "only open the door
// if you click inside a box around the handles"). The handles are tagged `userData.handle` in build.ts; each one's box is
// grown by HANDLE_PAD on every side (1.5 in). A swung-open door is tagged `userData.openDoor` and shuts again on a click.
import * as THREE from 'three';

export const HANDLE_PAD = 38.1; // mm: 1.5 in around each handle

/** The boxes (world mm) a click may open or close the doors from. */
export function doorBoxes(scene: THREE.Object3D): THREE.Box3[] {
  const out: THREE.Box3[] = [];
  for (const o of scene.children) {
    if (!o.userData.handle && !o.userData.openDoor) continue;
    const b = new THREE.Box3().expandByObject(o); if (b.isEmpty()) continue;
    out.push(o.userData.handle ? b.expandByScalar(HANDLE_PAD) : b);
  }
  return out;
}

/** Does the ray pass through a handle box (or an open door)? */
export const rayHitsDoorBox = (scene: THREE.Object3D, ray: THREE.Ray): boolean => doorBoxes(scene).some(b => ray.intersectsBox(b));
