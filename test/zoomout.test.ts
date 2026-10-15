// Lane V (Nathan 2026-10-14: "allow farther zooming out"): zoom goes down to 0.25; below 0.5 the lens stays at
// 0.5's field of view and the eye steps back instead.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { fovFor, frameStraightOn, placeCamera } from '../src/render/camera';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { LENS_ZOOM_MIN, eyeDist, lensZoom } from '../src/scene/orbit';
import { SCENE_VERSION } from '../src/scene/types';
import { LIMITS, parseScene } from '../src/scene/validate';

const withZoom = (zoom: number) => {
  const s = defaultScene();
  s.tanks[0].camera.zoom = zoom;
  return JSON.parse(JSON.stringify(s));
};

describe('zoom out further', () => {
  it('the limit is 0.1 to 12', () => {
    expect(LIMITS.zoom).toEqual([0.1, 12]);
  });

  it('loads zooms in the old range unchanged, keeps the new ones, clamps below the minimum; no version bump', () => {
    for (const z of [0.5, 0.75, 1, 12, 0.3, 0.25]) {
      const { scene } = parseScene(withZoom(z));
      expect(scene.tanks[0].camera.zoom).toBe(z);
      expect(scene.version).toBe(SCENE_VERSION);
      // round trip: save the loaded scene and load it again
      expect(parseScene(JSON.parse(JSON.stringify(scene))).scene.tanks[0].camera.zoom).toBe(z);
    }
    expect(parseScene(withZoom(0.05)).scene.tanks[0].camera.zoom).toBe(0.1);
  });

  it('at and above 0.5 the eye stays at the Eye distance; below it the eye steps back and the lens holds', () => {
    const c = { dist: 3000, az: 0, el: 0, zoom: 1 };
    for (const zoom of [0.5, 1, 4]) {
      expect(eyeDist({ ...c, zoom })).toBe(3000);
      expect(lensZoom({ ...c, zoom })).toBe(zoom);
    }
    expect(eyeDist({ ...c, zoom: 0.25 })).toBe(6000);
    expect(lensZoom({ ...c, zoom: 0.25 })).toBe(LENS_ZOOM_MIN);
  });

  it('stepping back keeps the field of view and shrinks the tank smoothly from 0.5 down', () => {
    const S = defaultSetup(), T = S.tank, aspect = 16 / 9;
    const fov = (zoom: number) => fovFor(frameStraightOn(T, { ...S.camera, zoom }, aspect, 0).t, lensZoom({ ...S.camera, zoom }));
    expect(fov(0.25)).toBeCloseTo(fov(0.5), 6);
    // on-screen width of the front glass: halving the zoom below 0.5 about halves it, like a lens zoom would
    const width = (zoom: number) => {
      const cam = new THREE.PerspectiveCamera(fov(zoom), aspect, 10, 40000);
      placeCamera(cam, T, { ...S.camera, zoom }); cam.updateProjectionMatrix();
      const a = new THREE.Vector3(0, T.H / 2, 0).project(cam), b = new THREE.Vector3(T.L, T.H / 2, 0).project(cam);
      return Math.abs(b.x - a.x);
    };
    expect(width(0.25) / width(0.5)).toBeGreaterThan(0.45);
    expect(width(0.25) / width(0.5)).toBeLessThan(0.55);
    expect(width(0.49) / width(0.5)).toBeGreaterThan(0.97); // no jump at the switch
  });

  it('at 0.1 the eye steps back 5x and the clip planes grow with it, so the far room is not cut off', () => {
    const S = defaultSetup(), T = S.tank, cam = new THREE.PerspectiveCamera();
    const c = { ...S.camera, dist: 5000, zoom: 0.1 };
    expect(eyeDist(c)).toBe(25000);
    placeCamera(cam, T, c);
    expect(cam.far).toBeGreaterThan(cam.position.distanceTo(new THREE.Vector3(T.L / 2, T.H / 2, -T.D / 2)) + 40000);
    expect(cam.far / cam.near).toBe(4000); // same depth precision as the fixed eye
    placeCamera(cam, T, { ...c, zoom: 1 });
    expect([cam.near, cam.far]).toEqual([10, 40000]);
  });
});
