// The Show view (plan VF2 stage S6, lane VF2-B, R190 / R192; Nathan 2026-11-27: two looks, Edit and Show). Edit is the
// app as it is, crisp, for building. Show is the picture people share: the tank from the front, the eye low and close to
// the glass (so the underside of the water mirrors the scape, render/surface.ts), the water filling the frame (no frame,
// lid or stand), every panel hidden, the full effects whatever the Performance level. The scene's own camera is never
// touched: leaving Show gives back the view as it was. The shell switches it (shell/fullscreen.tsx, View > Window).
import * as THREE from 'three';
import { D2R, waterY } from '../scene/physics';
import type { CameraSettings, TankSetup } from '../scene/types';

let on = false;
const subs = new Set<() => void>();
export const showView = () => on;
export function setShowView(v: boolean) { if (v === on) return; on = v; subs.forEach(f => f()); }
export function onShowView(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }

/** The eye's height as a share of the water depth (under the water line: the surface mirrors from there). */
export const SHOW_EYE = 0.38;

/**
 * The Show camera for a tank (orbit settings: placeCamera looks at the tank centre). Straight on, the eye at SHOW_EYE of the
 * water depth and as far from the front glass as frames the length at about a 60 degree lens (at least 14 in, at most 5 ft).
 */
export function showCamera(S: TankSetup): CameraSettings {
  const T = S.tank, wy = S.water.on ? waterY(T, S.water.level) : T.H;
  const glass = Math.min(1500, Math.max(350, 0.5 * T.L / Math.tan(30 * D2R)));
  const yE = SHOW_EYE * wy, back = glass + T.D / 2, up = yE - T.H / 2;
  return { ...S.camera, az: 0, el: Math.atan2(up, back) / D2R, dist: Math.hypot(back, up) - T.D / 2, zoom: 1 };
}

/**
 * The image window for Show (tan units from the view axis, as viewer.ts frames): the front glass from just above the
 * front of the substrate to just under the water line (no air gap or lid), inside the side panes (no room past them), scaled to COVER the view (the
 * longer side is cropped), so no glass edge, frame or room shows.
 */
export function showFrame(cam: THREE.PerspectiveCamera, S: TankSetup, aspect: number) {
  const T = S.tank, wy = S.water.on ? waterY(T, S.water.level) : T.H, sub = Math.min(S.substrate.fl, S.substrate.fr);
  const inv = cam.matrixWorldInverse, v = new THREE.Vector3();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const x of [T.L * 0.06, T.L * 0.94]) for (const y of [sub * 0.6, wy - 3]) {
    v.set(x, y, 0).applyMatrix4(inv); const d = -v.z; if (d <= 1) continue;
    x0 = Math.min(x0, v.x / d); x1 = Math.max(x1, v.x / d); y0 = Math.min(y0, v.y / d); y1 = Math.max(y1, v.y / d);
  }
  if (!Number.isFinite(x0)) return null;
  const hy = Math.min((y1 - y0) / 2, (x1 - x0) / 2 / aspect), hx = hy * aspect;
  // cropped: keep the top (the mirrored band) and trim the bottom when the height is what overflows
  const cy = (y1 - y0) / 2 > hy ? y1 - hy : (y0 + y1) / 2;
  return { fov: 2 * Math.atan(hy) / D2R, hx, hy, c: { cx: (x0 + x1) / 2, cy } };
}

if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __show: unknown }).__show = setShowView; // the shot scripts (vf-shots.mjs 'show')
