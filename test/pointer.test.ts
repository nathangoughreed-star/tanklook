import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EDGE_ON_EL, wallPlane } from '../src/interact/pointer';

const camAt = (el: number) => {
  const cam = new THREE.PerspectiveCamera(30, 1.5, 1, 10000), r = el * Math.PI / 180;
  cam.position.set(300, 150 + 1500 * Math.sin(r), 1500 * Math.cos(r)); cam.lookAt(300, 150, -150); cam.updateMatrixWorld();
  return cam;
};

describe('aquascape drag in a near edge-on view (audit #3)', () => {
  it('straight on (and 2° up), a piece slides left / right at its own depth, never snapping to the front glass', () => {
    const at = new THREE.Vector3(250, 20, -159);
    for (const el of [0, 2, -5]) {
      const cam = camAt(el), plane = wallPlane(cam, el, at)!;
      expect(plane).not.toBeNull();
      // a pointer 200 px to the right of the grab point: the ray from the eye through a point further right
      const ray = new THREE.Ray(cam.position.clone(), new THREE.Vector3(450, 40, -159).sub(cam.position).normalize());
      const p = ray.intersectPlane(plane, new THREE.Vector3())!;
      expect(p.z).toBeCloseTo(-159, 0); // depth kept
      expect(p.x).toBeGreaterThan(400);  // follows the pointer across
    }
  });
  it('a tilted view keeps the ground-following drag', () => {
    expect(wallPlane(camAt(EDGE_ON_EL + 5), EDGE_ON_EL + 5, new THREE.Vector3())).toBeNull();
  });
});
