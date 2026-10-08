// Camera rule: the eye is a fixed physical distance from the front glass, the same for every tank.
// Zoom only changes field of view (crop), never perspective. Pure apart from three.js maths, so it is testable.
import * as THREE from 'three';
import { D2R } from '../scene/physics';
import type { CameraSettings, Tank } from '../scene/types';

/** Orbit about the tank centre; radius chosen so that straight-on the eye is exactly `dist` from the front glass. */
export function placeCamera(cam: THREE.PerspectiveCamera, T: Tank, c: CameraSettings) {
  const az = c.az * D2R, el = c.el * D2R, P = new THREE.Vector3(T.L / 2, T.H / 2, -T.D / 2), r = c.dist + T.D / 2;
  cam.position.set(P.x + r * Math.sin(az) * Math.cos(el), P.y + r * Math.sin(el), P.z + r * Math.cos(az) * Math.cos(el));
  cam.lookAt(P); cam.updateMatrixWorld();
}

/**
 * Bounds of the tank (plus fixture headroom above, down to `bottom`, e.g. a stand, and any `extra` points such as the
 * scale person) as seen from the camera,
 * in tan units: t = half-height needed, (cx, cy) = centre of the bounds relative to the view axis.
 */
export function frameBox(cam: THREE.PerspectiveCamera, T: Tank, aspect: number, headroom: number, bottom = 0, extra: THREE.Vector3[] = []) {
  const { L, H, D } = T, inv = cam.matrixWorldInverse, v = new THREE.Vector3();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const pts: THREE.Vector3[] = [...extra];
  for (const x of [-12, L + 12]) for (const y of [Math.min(0, bottom), H + headroom]) for (const z of [12, -D - 12]) pts.push(new THREE.Vector3(x, y, z));
  for (const p of pts) {
    v.copy(p).applyMatrix4(inv); const d = -v.z; if (d <= 1) continue;
    x0 = Math.min(x0, v.x / d); x1 = Math.max(x1, v.x / d); y0 = Math.min(y0, v.y / d); y1 = Math.max(y1, v.y / d);
  }
  if (!Number.isFinite(x0)) return { t: 1, cx: 0, cy: 0, x0: -1, x1: 1, y0: -1, y1: 1 };
  return { t: Math.max((y1 - y0) / 2, (x1 - x0) / 2 / aspect), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, x0, x1, y0, y1 };
}
export const neededTan = (...a: Parameters<typeof frameBox>) => frameBox(...a).t;

/**
 * The lens is fixed by the STRAIGHT-ON view and kept while orbiting: walking around a tank changes the angle,
 * never the eye distance or the focal length. (Framing each angle afresh widened the lens whenever the stand or
 * the scale person came near the eye, so the tank shrank as if the viewer had stepped back.)
 */
const refCam = new THREE.PerspectiveCamera();
export function frameStraightOn(T: Tank, c: CameraSettings, aspect: number, headroom: number, bottom = 0, extra: THREE.Vector3[] = []) {
  placeCamera(refCam, T, { ...c, az: 0, el: 0 });
  return frameBox(refCam, T, aspect, headroom, bottom, extra);
}

/**
 * Apply one shared FOV, then shift the image window (a lens shift, like a view camera) so the framed bounds sit
 * centred. The eye point and orientation do not move, so perspective is unchanged.
 */
export function applyFraming(cam: THREE.PerspectiveCamera, fov: number, w: number, h: number, cx: number, cy: number) {
  cam.fov = fov; cam.aspect = w / h;
  const tanHalf = Math.tan(fov * D2R / 2);
  cam.setViewOffset(w, h, (cx / (tanHalf * cam.aspect)) * w / 2, (-cy / tanHalf) * h / 2, w, h);
  cam.updateProjectionMatrix();
}

/**
 * Image-window centre (tan units) for a lens of half-size (hx, hy): the centre of `all` (tank + stand + person), moved
 * just enough to keep `tank` (the tank and its fixture headroom) wholly in frame; if the tank itself is bigger than the window, its centre.
 * So zooming in crops the room first and the tank last.
 */
export function windowCentre(all: { cx: number; cy: number }, tank: { x0: number; x1: number; y0: number; y1: number }, hx: number, hy: number) {
  const keep = (c: number, a: number, b: number, h: number) => (b - a >= 2 * h ? (a + b) / 2 : Math.min(Math.max(c, b - h), a + h));
  return { cx: keep(all.cx, tank.x0, tank.x1, hx), cy: keep(all.cy, tank.y0, tank.y1, hy) };
}

/** One FOV for all viewports, so pixel sizes are directly comparable between tanks. */
export const fovFor = (tan: number, zoom: number) => 2 * Math.atan(tan * 1.06 / zoom) / D2R;
