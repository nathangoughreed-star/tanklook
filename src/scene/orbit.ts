// Orbit limit (Nathan 2026-10-08): with the room wall on, the eye cannot orbit through it. Same eye maths as
// placeCamera (orbit about the tank centre, radius dist + D/2), without three.js so the store can use it.
import { D2R } from './physics';
import { wallPlane } from './table';
import type { CameraSettings, TankSetup } from './types';

/** How close the eye may come to the wall's room face, mm. */
export const WALL_CLEAR = 150;

/** True when the eye for camera `c` is on the room side of this tank's wall (or there is no wall). */
export function eyeClear(S: TankSetup, c: CameraSettings) {
  if (!S.wall.show) return true;
  const T = S.tank, r = c.dist + T.D / 2, az = c.az * D2R, el = c.el * D2R, w = wallPlane(S, T);
  const x = T.L / 2 + r * Math.sin(az) * Math.cos(el), z = -T.D / 2 + r * Math.cos(az) * Math.cos(el);
  const s = S.wall.side;
  return s === 'back' ? z > w.back + WALL_CLEAR : s === 'right' ? x < w.right - WALL_CLEAR : x > w.left + WALL_CLEAR;
}

const wrap = (a: number) => ((a + 540) % 360) - 180;

/**
 * The camera to use when moving from `prev` to `next`: `next` if its eye is clear; otherwise the last clear step on the
 * way there (az along the shorter way round), so a drag stops at the wall instead of passing through. If `prev` is
 * itself behind the wall (the wall was just turned on, or moved), the clear az nearest `next`.
 */
export function limitOrbit(prev: CameraSettings, next: CameraSettings, ok: (c: CameraSettings) => boolean): CameraSettings {
  if (ok(next)) return next;
  if (!ok(prev)) {
    for (let d = 1; d <= 180; d++) for (const s of [1, -1]) { const c = { ...next, az: wrap(next.az + s * d) }; if (ok(c)) return c; }
    return next;
  }
  const daz = wrap(next.az - prev.az), del = next.el - prev.el, n = Math.max(1, Math.ceil(Math.max(Math.abs(daz), Math.abs(del))));
  let best = prev;
  for (let i = 1; i <= n; i++) {
    const f = i / n, c = { ...next, az: wrap(Math.round(prev.az + daz * f)), el: Math.round(prev.el + del * f), dist: prev.dist + (next.dist - prev.dist) * f };
    if (!ok(c)) break;
    best = c;
  }
  return best;
}

/** Bring every camera in front of its wall (after the wall, tank size or glass changes). */
export function clearCams(tanks: TankSetup[], locked: boolean) {
  const ok = (c: CameraSettings) => (locked ? tanks : []).every(t => eyeClear(t, c));
  for (const t of tanks) if (!eyeClear(t, t.camera) || !ok(t.camera)) t.camera = limitOrbit(t.camera, t.camera, c => eyeClear(t, c) && ok(c));
  if (locked) for (const t of tanks) t.camera = { ...tanks[0].camera };
}
