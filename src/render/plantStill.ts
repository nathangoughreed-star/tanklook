// Lane PC1 (2026-11-15): a still of one plant from its real 3D model (the one the tank draws, at the size Add gives), on its own small
// renderer with the flat-light key the fish stills use (see preview3d.ts). Used by scripts/bake-gallery.mjs to bake public/gallery/plants/<id>.webp,
// and by the Plants picker as a live-drawn fallback when a still is missing. Transparent background; WebGL only (returns null without it).
import * as THREE from 'three';
import { defaultSetup } from '../scene/defaults';
import { LIBRARY, makeItem } from '../scene/items';
import { LU, applyLighting } from './lighting';
import { itemMesh } from './items';

const FOV = 28, YAW = 0.5, PITCH = 0.22;
let rig: { r: THREE.WebGLRenderer; canvas: HTMLCanvasElement } | null | undefined;

/** The plant `id` as a transparent PNG data URL of `w` x `h` px, cropped by the caller if it wants (bake does), or null if it cannot be drawn. */
export function plantStill(id: string, w = 480, h = 300, growth?: number): string | null {
  if (!LIBRARY[id]) return null;
  if (rig === undefined) { try { const canvas = document.createElement('canvas'), r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor(0x000000, 0); rig = { r, canvas }; } catch { rig = null; } }
  if (!rig) return null;
  const S = defaultSetup(), T = S.tank;
  S.water.on = true;
  const it = makeItem(T, id, 1, 7, 0, 0, growth == null ? {} : { growth }, S);
  const m = itemMesh(S, T, it);
  if (!m) return null;
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0);
  const sc = new THREE.Scene(); sc.add(m); applyLighting(sc);
  const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), sph = box.getBoundingSphere(new THREE.Sphere());
  const cam = new THREE.PerspectiveCamera(FOV, w / h, sph.radius / 50, sph.radius * 20), d = sph.radius / Math.sin(FOV / 2 * THREE.MathUtils.DEG2RAD) * 0.85;
  cam.position.set(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH)).multiplyScalar(d).add(c); cam.lookAt(c);
  rig.r.setSize(w, h, false);
  const mode = LU.uMode.value, water = LU.uWater.value.w; LU.uMode.value = 0; LU.uWater.value.w = 0;
  rig.r.render(sc, cam);
  LU.uMode.value = mode; LU.uWater.value.w = water;
  const url = rig.canvas.toDataURL('image/png');
  m.geometry.dispose?.();
  return url;
}
