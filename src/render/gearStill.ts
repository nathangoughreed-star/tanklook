// Lane EQ2 (R61, 2026-11-15): a still of one catalogue product from its real 3D model (the one the tank draws, in the product's own part colours), on its
// own small renderer with the same flat-light key the fish and plant stills use. Used by scripts/bake-gallery.mjs to bake public/gallery/gear/<stem>.webp
// and by the Equipment rows as a live-drawn fallback when a still is missing. Transparent background; WebGL only (returns null without it).
import * as THREE from 'three';
import { defaultSetup } from '../scene/defaults';
import { pickLightProduct } from '../scene/techEdit';
import { LU, addFixture, applyLighting } from './lighting';
import { addHood } from './build';
import { hoodProduct, withHoodLight } from '../data/hoods';
import { gearModel } from './gear3d';
import { Kit } from './gear/common';
import type { StillSpec } from '../shell/logic/gearArt';

const FOV = 28, YAW = 0.5;
let rig: { r: THREE.WebGLRenderer; canvas: HTMLCanvasElement } | null | undefined;

/** The product's own body: the largest part and every part touching its neighbourhood (a gap under 60 % of its size), so a pump in the cabinet, a hose
 *  rod or a drop checker metres away does not shrink the picture. `shift` is where gearModel moved the model to centre it. */
function bodyBox(all: NonNullable<typeof Kit.log> | null, main0?: string, shift?: THREE.Vector3): THREE.Box3 | null {
  if (!all?.length) return null;
  const log = all.map(e => e.box), pool = main0 ? all.filter(e => e.bucket === main0).map(e => e.box) : log;
  const size = (b: THREE.Box3) => b.getSize(new THREE.Vector3()), vol = (b: THREE.Box3) => { const s = size(b); return Math.max(s.x, 1) * Math.max(s.y, 1) * Math.max(s.z, 1); };
  const main = (pool.length ? pool : log).reduce((a, b) => (vol(b) > vol(a) ? b : a)), reach = Math.max(...size(main).toArray()) * 0.6 + 15, box = main.clone();
  for (const b of log) if (b.clone().expandByScalar(reach).intersectsBox(main)) box.union(b);
  return shift ? box.translate(shift) : box;
}

export function gearStill(spec: StillSpec, w = 480, h = 300, view?: { yaw?: number; pitch?: number }): string | null {
  if (rig === undefined) { try { const canvas = document.createElement('canvas'), r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor(0x000000, 0); rig = { r, canvas }; } catch { rig = null; } }
  if (!rig) return null;
  const S = defaultSetup(), sc = new THREE.Scene();
  S.water.on = true;
  let obj: THREE.Object3D, body: THREE.Box3 | null = null;
  if (spec.kind === 'gear') { Kit.noTubes = true; Kit.log = []; try { obj = gearModel(S, { id: 'still', label: 'still', picks: spec.picks, ...(spec.salt ? { salt: true } : {}) }); } finally { Kit.noTubes = false; } body = bodyBox(Kit.log, spec.main, obj.children[0]?.position); Kit.log = null; }
  else if (spec.kind === 'hood') {   // PM1: the hood on its own, on a bare frame of its footprint (no water, no rim)
    const h = hoodProduct(spec.id); if (!h) return null;
    S.lid = 'hood'; S.hoodProduct = h.id; S.render.rim = false; S.tank = { ...S.tank, L: h.lengthIn * 25.4, D: h.depthIn * 25.4, H: 300 };
    addHood(sc, withHoodLight(S), S.tank);
    obj = sc;
  } else {
    pickLightProduct(S, spec.id); S.tank.L = Math.max(S.tank.L, 300);
    addFixture(sc, S.tank, S.light);
    obj = sc;
  }
  if (obj !== sc) sc.add(obj);
  applyLighting(sc);
  const fit = body ?? new THREE.Box3().setFromObject(sc);
  if (fit.isEmpty()) return null;
  const c = fit.getCenter(new THREE.Vector3()), sph = fit.getBoundingSphere(new THREE.Sphere());
  const cam = new THREE.PerspectiveCamera(FOV, w / h, sph.radius / 50, sph.radius * 20), d = sph.radius / Math.sin(FOV / 2 * THREE.MathUtils.DEG2RAD) * 0.85;
  const PITCH = view?.pitch ?? (spec.kind === 'light' && spec.view ? spec.view.pitch : spec.kind === 'light' ? 0.55 : spec.kind === 'hood' ? 0.3 : 0.22), YAWV = view?.yaw ?? (spec.kind === 'light' && spec.view ? spec.view.yaw : YAW);
  cam.position.set(Math.sin(YAWV) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAWV) * Math.cos(PITCH)).multiplyScalar(d).add(c); cam.lookAt(c);
  rig.r.setSize(w, h, false);
  const mode = LU.uMode.value, water = LU.uWater.value.w; LU.uMode.value = 0; LU.uWater.value.w = 0;
  rig.r.render(sc, cam);
  LU.uMode.value = mode; LU.uWater.value.w = water;
  return rig.canvas.toDataURL('image/png');
}
