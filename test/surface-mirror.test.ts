// VF2 S4 (lane VF2-B): the mirrored camera of render/surface.ts. A point under the water, drawn into the mirror picture,
// lands where the eye sees its reflection on the surface; nothing above the water line is drawn; the camera stays
// right-handed (no face winding turned round); the mirror is wanted only from under the water, on Full quality.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mirrorCamera, mirrorMatrix, mirrorWanted } from '../src/render/surface';
import { setFx, FX } from '../src/render/fx';

const eye = () => {
  const cam = new THREE.PerspectiveCamera(30, 1.4, 10, 40000);
  cam.position.set(560, 180, 3100); cam.lookAt(610, 260, -250);
  cam.setViewOffset(1400, 1000, 60, -40, 1400, 1000); // a lens shift, as applyFraming
  cam.updateMatrixWorld(); return cam;
};
const W = 500; // water line, mm

describe('mirror camera', () => {
  it('draws a point under water where its reflection meets the surface', () => {
    const cam = eye(), vc = mirrorCamera(cam, W), M = mirrorMatrix(vc);
    for (const X of [new THREE.Vector3(300, 120, -200), new THREE.Vector3(900, 420, -450), new THREE.Vector3(610, 20, -100)]) {
      // where the eye sees the mirror image of X: the sightline to X' = X mirrored at y = W, crossing the surface
      const Xm = new THREE.Vector3(X.x, 2 * W - X.y, X.z), d = Xm.clone().sub(cam.position);
      const S = cam.position.clone().addScaledVector(d, (W - cam.position.y) / d.y);
      const s = new THREE.Vector4(S.x, S.y, S.z, 1).applyMatrix4(M), x = new THREE.Vector4(X.x, X.y, X.z, 1).applyMatrix4(M);
      expect(s.x / s.w).toBeCloseTo(x.x / x.w, 5); expect(s.y / s.w).toBeCloseTo(x.y / x.w, 5);
    }
  });
  it('clips what is above the water line and keeps what is under it', () => {
    const vc = mirrorCamera(eye(), W), PV = new THREE.Matrix4().multiplyMatrices(vc.projectionMatrix, vc.matrixWorldInverse);
    const z = (y: number) => { const c = new THREE.Vector4(610, y, -250, 1).applyMatrix4(PV); return c.z / c.w; };
    expect(z(W + 20)).toBeLessThan(-1);
    expect(z(W - 20)).toBeGreaterThan(-1); expect(z(W - 20)).toBeLessThan(1);
  });
  it('is a right-handed camera (faces keep their winding)', () => {
    expect(mirrorCamera(eye(), W).matrixWorld.determinant()).toBeGreaterThan(0);
  });
  it('is wanted from under the water only, on Full quality, with its switch on', () => {
    const was = FX.mirror; setFx({ mirror: true });
    expect(mirrorWanted(300, W, 0)).toBe(true);
    expect(mirrorWanted(700, W, 0)).toBe(false);
    expect(mirrorWanted(300, W, 1)).toBe(false);
    setFx({ mirror: false }); expect(mirrorWanted(300, W, 0)).toBe(false);
    setFx({ mirror: was });
  });
});
