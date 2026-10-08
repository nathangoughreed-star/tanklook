import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyFraming, fovFor, frameBox, frameStraightOn, neededTan, placeCamera } from '../src/render/camera';
import { personPlacement, personSpot } from '../src/render/build';
import { defaultScene } from '../src/scene/defaults';
import { IN, depthRatio } from '../src/scene/physics';

// Project a horizontal segment of length `len` centred at (x, y, -depth) and return its on-screen length in px.
function screenLen(cam: THREE.PerspectiveCamera, x: number, y: number, depth: number, len: number, W: number, H: number) {
  const px = (v: THREE.Vector3) => { const p = v.project(cam); return new THREE.Vector2((p.x + 1) / 2 * W, (1 - p.y) / 2 * H); };
  return px(new THREE.Vector3(x - len / 2, y, -depth)).distanceTo(px(new THREE.Vector3(x + len / 2, y, -depth)));
}
function setup(T: { L: number; H: number; D: number }, dist: number, fov = 40) {
  const cam = new THREE.PerspectiveCamera(fov, 16 / 9, 10, 40000);
  placeCamera(cam, T, { dist, az: 0, el: 0, zoom: 1 });
  cam.updateProjectionMatrix();
  return cam;
}

describe('perspective rule', () => {
  const T = { L: 24 * IN, H: 12 * IN, D: 12 * IN };

  it('straight on, the eye is exactly `dist` from the front glass', () => {
    const cam = setup(T, 1200);
    expect(cam.position.z).toBeCloseTo(1200, 6);
    expect(cam.position.x).toBeCloseTo(T.L / 2, 6);
  });

  it('on-screen ratio vs the front glass equals d / (d + z) straight on, at the tank centre line', () => {
    for (const depth of [0, 50, T.D / 2, T.D]) {
      const cam = setup(T, 1200);
      const r = screenLen(cam, T.L / 2, T.H / 2, depth, 35, 1600, 900) / screenLen(cam, T.L / 2, T.H / 2, 0, 35, 1600, 900);
      expect(r).toBeCloseTo(depthRatio(1200, depth), 4);
    }
  });

  it('the same fish at the same physical depth has the same pixel size in tanks of different depth', () => {
    const shallow = setup(T, 1200), deep = setup({ ...T, D: 24 * IN }, 1200);
    const a = screenLen(shallow, T.L / 2, T.H / 2, 100, 150, 1600, 900), b = screenLen(deep, T.L / 2, T.H / 2, 100, 150, 1600, 900);
    expect(a).toBeCloseTo(b, 6);
  });

  it('framing a tall stand shifts the image window but keeps the eye and the d / (d + z) ratio exact', () => {
    const cam = setup(T, 1200), eye = cam.position.clone();
    const sym = frameBox(cam, T, 16 / 9, 4, 0), withStand = frameBox(cam, T, 16 / 9, 4, -800);
    expect(sym.cy).toBeCloseTo(0, 1);
    expect(withStand.cy).toBeLessThan(-0.1); // bounds centre is below the view axis
    applyFraming(cam, fovFor(withStand.t, 1), 1600, 900, withStand.cx, withStand.cy);
    expect(cam.position.distanceTo(eye)).toBe(0);
    for (const depth of [50, T.D]) {
      const r = screenLen(cam, T.L / 2, T.H / 2, depth, 35, 1600, 900) / screenLen(cam, T.L / 2, T.H / 2, 0, 35, 1600, 900);
      expect(r).toBeCloseTo(depthRatio(1200, depth), 4);
    }
    // the stand's floor line and the tank top now both fit, with equal margins
    const toY = (y: number) => { const p = new THREE.Vector3(T.L / 2, y, 12).project(cam); return p.y; };
    expect(toY(-800)).toBeGreaterThanOrEqual(-1); expect(toY(T.H + 4)).toBeLessThanOrEqual(1);
  });

  it('zoom changes FOV only, never the camera position', () => {
    const cam = setup(T, 1200), before = cam.position.clone();
    const t = neededTan(cam, T, 16 / 9, 4);
    expect(fovFor(t, 2)).toBeLessThan(fovFor(t, 1));
    placeCamera(cam, T, { dist: 1200, az: 0, el: 0, zoom: 3 });
    expect(cam.position.distanceTo(before)).toBeCloseTo(0, 9);
  });
});

describe('orbit keeps the lens', () => {
  it('frames from the straight-on view, so FOV and lens shift do not change with the orbit angle', () => {
    const T = { L: 610, H: 305, D: 305 }, base = { dist: 1200, az: 0, el: 0, zoom: 1 };
    const person = [new THREE.Vector3(-400, -800, -150), new THREE.Vector3(-400, 950, -150)];
    const a = frameStraightOn(T, base, 16 / 9, 4, -800, person);
    for (const [az, el] of [[60, 0], [-85, 10], [30, 25], [0, 60]]) {
      expect(frameStraightOn(T, { ...base, az, el }, 16 / 9, 4, -800, person)).toEqual(a);
    }
  });
  it('keeps the eye at the same distance from the tank centre at every angle', () => {
    const T = { L: 610, H: 305, D: 305 }, cam = new THREE.PerspectiveCamera(), C = new THREE.Vector3(305, 152.5, -152.5);
    const r = (az: number, el: number) => { placeCamera(cam, T, { dist: 1200, az, el, zoom: 1 }); return cam.position.distanceTo(C); };
    for (const [az, el] of [[0, 0], [90, 0], [-45, 30], [180, 10]]) expect(r(az, el)).toBeCloseTo(1200 + 152.5, 6);
  });
});

describe('scale person', () => {
  const S = defaultScene(); S.person.show = true; S.stand.show = true;
  const T = S.tankA, C = { x: T.L / 2, z: -T.D / 2 };
  const eyeAt = (az: number) => { const cam = new THREE.PerspectiveCamera(); placeCamera(cam, T, { ...S.camera, az, el: 0 }); return { x: cam.position.x, z: cam.position.z }; };
  it('stays put while orbiting: one spot, as far from the straight-on eye as the tank centre', () => {
    const p = personSpot(S, T), e = { x: T.L / 2, z: S.camera.dist };
    expect(Math.hypot(p.x - e.x, p.z - e.z)).toBeCloseTo(Math.hypot(C.x - e.x, C.z - e.z), 6);
    for (const az of [-30, -85, 45]) expect(personSpot({ ...S, camera: { ...S.camera, az } }, T)).toEqual(p);
  });
  it('stays on the chosen side of the screen, and swaps sides rather than standing behind the wall', () => {
    const e = eyeAt(0), left = personPlacement(S, T, e);
    expect(left.x).toBeLessThan(0);
    S.wall.show = true; S.wall.side = 'back';
    const e2 = eyeAt(-85), p = personPlacement(S, T, e2);
    expect(p.z - p.w / 2).toBeGreaterThanOrEqual(-T.D - 60 - 1); // never behind the back wall
  });
});

describe('peninsula', () => {
  it('moves the person off the wall end to the open side', () => {
    const S = defaultScene(); S.person.show = true; S.person.side = 'right'; S.wall.show = true; S.wall.side = 'peninsula';
    const T = S.tankA, p = personPlacement(S, T, { x: T.L / 2, z: S.camera.dist });
    expect(p.side).toBe(-1); expect(p.x + p.w / 2).toBeLessThan(T.L);
  });
});
