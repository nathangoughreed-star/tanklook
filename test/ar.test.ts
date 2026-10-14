// Lane Q (AR view): the pure parts. The session itself needs a phone (WebXR immersive-ar); prepScene / restore are
// checked in the browser from window.__gb.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MM, baseCentre, dragYaw, faceYaw, isLevel, rigMatrix, sizeText } from '../src/render/ar';
import { floorY } from '../src/scene/physics';
import { defaultSetup } from '../src/scene/defaults';

const close = (a: THREE.Vector3, b: THREE.Vector3, eps = 1e-6) => expect(a.distanceTo(b)).toBeLessThan(eps);

describe('AR placement', () => {
  it('maps 1 mm of the scene to 0.001 m of the room', () => expect(MM).toBe(0.001));

  it('puts the base centre on the hit point, at true size, turned by yaw', () => {
    const c = new THREE.Vector3(450, -800, -225), hit = new THREE.Vector3(0.3, -1.4, -2), yaw = 0.7;
    const rig = rigMatrix(hit, yaw, c), toTank = (X: THREE.Vector3) => X.clone().applyMatrix4(rig);
    close(toTank(hit), c, 1e-4);
    // one metre along the tank's turned x axis is 1000 mm along the tank's x
    const xAxis = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); // R(yaw) applied to +x
    close(toTank(hit.clone().add(xAxis)), c.clone().add(new THREE.Vector3(1000, 0, 0)), 1e-3);
    // up stays up, unscaled apart from the mm
    close(toTank(hit.clone().add(new THREE.Vector3(0, 0.25, 0))), c.clone().add(new THREE.Vector3(0, 250, 0)), 1e-3);
    // the inverse (tank -> room) keeps lengths in m: a 900 mm tank is 0.9 m long
    const inv = rig.clone().invert(), a = new THREE.Vector3(0, 0, 0).applyMatrix4(inv), b = new THREE.Vector3(900, 0, 0).applyMatrix4(inv);
    expect(a.distanceTo(b)).toBeCloseTo(0.9, 9);
  });

  it('turns the front (+z) of the tank toward the eye', () => {
    const hit = new THREE.Vector3(1, 0, -2), eye = new THREE.Vector3(-1, 1.5, 0), yaw = faceYaw(hit, eye);
    const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw), to = eye.clone().sub(hit).setY(0).normalize();
    expect(front.dot(to)).toBeCloseTo(1, 9);
  });

  it('turns half a turn per screen-width drag', () => {
    expect(dragYaw(400, 400)).toBeCloseTo(Math.PI);
    expect(dragYaw(-100, 400)).toBeCloseTo(-Math.PI / 4);
  });

  it('stands the tank only on level surfaces', () => {
    expect(isLevel(new THREE.Matrix4().toArray())).toBe(true);                                   // floor
    expect(isLevel(new THREE.Matrix4().makeRotationX(Math.PI / 2).toArray())).toBe(false);       // wall
    expect(isLevel(new THREE.Matrix4().makeRotationZ(10 * Math.PI / 180).toArray())).toBe(true); // a slight slope
  });

  it('sits the bottom of the stand (or the tank) on the surface', () => {
    const S = defaultSetup(), T = S.tank;
    const c = baseCentre(S);
    expect(c.y).toBe(floorY(T, S.render, S.stand));
    expect(c.x).toBeCloseTo(T.L / 2); expect(c.z).toBeCloseTo(-T.D / 2);
    S.stand.show = false;
    expect(baseCentre(S).y).toBe(floorY(T, S.render, S.stand));
    S.stand.show = true; // toggled off in AR: the tank's own underside on the surface
    expect(baseCentre(S, T, false).y).toBe(floorY(T, S.render, { ...S.stand, show: false }));
  });
});

describe('AR size check', () => {
  it('reads L x D x H in the user units, with the stand', () => {
    const S = defaultSetup();
    Object.assign(S.tank, { L: 914.4, D: 457.2, H: 406.4 }); S.stand.show = true; S.stand.height = 711.2;
    expect(sizeText(S, 'in')).toBe('Size check: 36 × 18 × 16″ (L × D × H) on a 28″ stand');
    expect(sizeText(S, 'in', false)).toBe('Size check: 36 × 18 × 16″ (L × D × H)'); // stand toggled off in AR
    S.stand.show = false;
    expect(sizeText(S, 'cm')).toBe('Size check: 91.4 × 45.7 × 40.6 cm (L × D × H)');
  });
});

describe('AR photo', () => {
  it('names the file by local date and time', async () => {
    const { photoName } = await import('../src/render/arPhoto');
    expect(photoName(new Date(2026, 9, 14, 9, 5, 7))).toBe('tanklook-ar-2026-10-14-090507.jpg');
  });
});
