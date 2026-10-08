// Owns the WebGL renderer and the one or two viewports (Tank A, optional Tank B). Render-on-demand.
import * as THREE from 'three';
import { fishTL, getSpecies } from '../data/species';
import { D2R, depthRatio, floorY, mapToTank } from '../scene/physics';
import type { Store } from '../scene/store';
import type { Fish, Tank } from '../scene/types';
import { HOOD_H, buildTank, disposeScene, personSpot, type BuiltTank } from './build';
import { drawViewMap } from './viewmap';
import { applyFraming, fovFor, frameBox, frameStraightOn, placeCamera, windowCentre } from './camera';
import { roomLevel, setLightUniforms, setWaterUniforms } from './lighting';
import { setMaxAnisotropy } from './textures';

export interface Viewport extends Partial<BuiltTank> {
  key: 'A' | 'B';
  cam: THREE.PerspectiveCamera;
  T: Tank;
  x: number; y: number; w: number; h: number;
}

export interface Measurement {
  fish: Fish;
  len: number;          // on-screen length, px (Tank A)
  ref: number;          // same pose slid to the front glass, px
  formula: number;      // straight-on d / (d + z)
  sideAngle: number;    // degrees off side-on
  lenB?: number;        // same fish in Tank B, px
  depthB?: number;
}

const GAP = 8;

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly vps: Viewport[];
  private dirty = true;
  private needsBuild = true;
  /** Custom terrain editing: show grid dots in Tank A; `hot` = the dot being dragged. UI state, not scene data. */
  terrainEdit: { on: boolean; hot: number | null } = { on: false, hot: null };
  private drawnListeners = new Set<() => void>();

  constructor(readonly canvas: HTMLCanvasElement, readonly host: HTMLElement, readonly store: Store) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
    const S = store.scene;
    this.vps = (['A', 'B'] as const).map(key => ({ key, cam: new THREE.PerspectiveCamera(40, 1, 10, 40000), T: key === 'A' ? S.tankA : S.tankB, x: 0, y: 0, w: 1, h: 1 }));
    store.subscribe(kind => { if (kind !== 'view') this.needsBuild = true; this.dirty = true; });
    new ResizeObserver(() => { this.dirty = true; }).observe(host);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { this.dirty = true; });
    const loop = () => { if (this.dirty) { this.dirty = false; this.draw(); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  onDrawn(fn: () => void) { this.drawnListeners.add(fn); }
  invalidate() { this.dirty = true; }
  /** Rebuild on the next frame (UI-only state that changes the scene, like terrain editing). */
  rebuild() { this.needsBuild = this.dirty = true; }

  get active() { return this.vps.slice(0, this.store.scene.compare ? 2 : 1); }

  private build() {
    const S = this.store.scene;
    for (const vp of this.vps) {
      disposeScene(vp.scene);
      vp.T = vp.key === 'A' ? S.tankA : S.tankB;
      Object.assign(vp, buildTank(S, vp.T, this.store.selId, vp.key === 'A' && this.terrainEdit.on ? this.terrainEdit : undefined));
    }
    this.needsBuild = false;
  }

  /** Lay out viewports, frame cameras with one shared FOV, render. Synchronous, so readouts are never a frame behind. */
  draw() {
    if (this.needsBuild) this.build();
    const S = this.store.scene, w = this.host.clientWidth, h = this.host.clientHeight, r = this.renderer;
    r.setSize(w, h, false);
    const active = this.active, hw = (w - GAP) / 2;
    if (active.length === 1) Object.assign(active[0], { x: 0, y: 0, w, h });
    else { Object.assign(active[0], { x: 0, y: 0, w: hw, h }); Object.assign(active[1], { x: hw + GAP, y: 0, w: hw, h }); }
    for (const vp of active) placeCamera(vp.cam, vp.T, S.camera);
    const headroom = S.lid === 'hood' ? HOOD_H + 6 : S.light.type === 'flat' ? 4 : 60 + S.light.height;
    const bottom = (T: Tank) => (S.stand.show ? floorY(T, S.render, S.stand) : 0);
    // the scale person: its card's corners (it turns to face the camera, so use its width both ways)
    const extra = (vp: Viewport) => {
      if (!S.person.show) return [];
      const p = personSpot(S, vp.T), pts: THREE.Vector3[] = [];
      for (const dx of [-p.w / 2, p.w / 2]) for (const dz of [-p.w / 2, p.w / 2]) for (const y of [p.floor, p.floor + p.h]) pts.push(new THREE.Vector3(p.x + dx, y, p.z + dz));
      return pts;
    };
    for (const vp of active) {      // the person stays put and turns to face the viewer
      const m = vp.scene?.getObjectByName('person');
      if (!m) continue;
      m.rotation.y = Math.atan2(vp.cam.position.x - m.position.x, vp.cam.position.z - m.position.z); m.updateMatrixWorld();
    }
    // lens from the straight-on view, kept at every orbit angle (see frameStraightOn)
    const boxes = active.map(vp => frameStraightOn(vp.T, S.camera, vp.w / vp.h, headroom, bottom(vp.T), extra(vp)));
    const fov = fovFor(Math.max(...boxes.map(b => b.t)), S.camera.zoom); // one FOV for all: sizes stay comparable
    r.setScissorTest(true);
    r.setViewport(0, 0, w, h); r.setScissor(0, 0, w, h);
    r.setClearColor(new THREE.Color(getComputedStyle(this.host).getPropertyValue('--stage-gap').trim() || '#eef0f3')); r.clear();
    for (const vp of active) {
      // the lens SIZE comes from the straight-on view (above), but the image window is re-centred at every orbit angle
      // (Nathan 2026-10-08) on tank + stand + person; zooming in crops the room first and keeps the tank itself whole
      // while it fits (windowCentre)
      const hy = Math.tan(fov * D2R / 2), hx = hy * vp.w / vp.h;
      const tank = frameBox(vp.cam, vp.T, vp.w / vp.h, headroom), all = frameBox(vp.cam, vp.T, vp.w / vp.h, headroom, bottom(vp.T), extra(vp));
      const c = windowCentre(all, tank, hx, hy);
      applyFraming(vp.cam, fov, vp.w, vp.h, c.cx, c.cy);
      r.setViewport(vp.x, vp.y, vp.w, vp.h); r.setScissor(vp.x, vp.y, vp.w, vp.h);
      r.setClearColor(new THREE.Color(0xd9dde2).multiplyScalar(0.06 + 0.94 * roomLevel(S.light.room))); r.clear(); // the space beyond the room dims with the room light
      setLightUniforms(vp.T, S.light, S.lid); setWaterUniforms(vp.T, S.water);
      r.render(vp.scene!, vp.cam);
    }
    r.setScissorTest(false);
    const map = document.getElementById('viewmap') as HTMLCanvasElement | null, A = active[0];
    if (map && !map.classList.contains('off')) {
      const eye = { x: A.cam.position.x, z: A.cam.position.z };
      // floor-plan direction through the image at NDC x (lens shift included)
      const at = (nx: number) => { const p = new THREE.Vector3(nx, 0, 0.5).unproject(A.cam); return Math.atan2(p.z - eye.z, p.x - eye.x); };
      const view = { left: at(-1), right: at(1), mid: at(0) };
      const pp = S.person.show ? personSpot(S, A.T) : null;
      drawViewMap(map, S, A.T, eye, view, pp && { x: pp.x, z: pp.z, w: pp.w });
    }
    for (const fn of this.drawnListeners) fn();
  }

  // ---------- Measurement: verifies the perspective model numerically ----------
  private toPx(v: THREE.Vector3, vp: Viewport) {
    const p = v.clone().project(vp.cam);
    return new THREE.Vector2((p.x + 1) / 2 * vp.w, (1 - p.y) / 2 * vp.h);
  }
  private screenLen(vp: Viewport, f: Fish) {
    const m = vp.meshById?.get(f.id), sp = getSpecies(f.species);
    if (!m || !sp) return null;
    const tl = fishTL(f, sp), a = new THREE.Vector3(-tl / 2, 0, 0).applyMatrix4(m.matrixWorld), b = new THREE.Vector3(tl / 2, 0, 0).applyMatrix4(m.matrixWorld);
    // reference: the identical fish (same pose) slid forward to the front glass, so the ratio isolates depth
    const shift = new THREE.Vector3(0, 0, -m.position.z), ra = a.clone().add(shift), rb = b.clone().add(shift);
    return { len: this.toPx(a, vp).distanceTo(this.toPx(b, vp)), ref: this.toPx(ra, vp).distanceTo(this.toPx(rb, vp)) };
  }
  measure(f: Fish): Measurement | null {
    const [A, B] = this.active, sA = this.screenLen(A, f), m = A.meshById?.get(f.id);
    if (!sA || !m) return null;
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion), v = A.cam.position.clone().sub(m.position).normalize();
    const out: Measurement = {
      fish: f, ...sA, formula: depthRatio(this.store.scene.camera.dist, f.depth),
      sideAngle: Math.acos(Math.min(1, Math.abs(n.dot(v)))) / D2R,
    };
    if (B) { const sB = this.screenLen(B, f); out.lenB = sB?.len; out.depthB = mapToTank(this.store.scene.tankA, B.T, f).depth; }
    return out;
  }

  // ---------- Picking ----------
  private ray = new THREE.Raycaster();
  /** Viewport and normalised device coords under a client point. */
  hitTest(clientX: number, clientY: number) {
    const r = this.host.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
    const vp = this.active.find(v => x >= v.x && x <= v.x + v.w);
    if (!vp) return null;
    const ndc = new THREE.Vector2((x - vp.x) / vp.w * 2 - 1, -(y - vp.y) / vp.h * 2 + 1);
    this.ray.setFromCamera(ndc, vp.cam);
    const dot = this.terrainEdit.on ? this.ray.intersectObjects(vp.dotMeshes ?? [], false)[0] : undefined;
    if (dot) return { vp, ray: this.ray.ray.clone(), fishId: null, mesh: dot.object as THREE.Mesh, dot: dot.object.userData.dot as number };
    const hit = this.ray.intersectObjects(vp.fishMeshes ?? [], false)[0];
    return { vp, ray: this.ray.ray.clone(), fishId: hit ? (hit.object.userData.id as number) : null, mesh: hit?.object as THREE.Mesh | undefined, dot: null as number | null };
  }

  // ---------- Export: render bigger, then save ----------
  exportPNG(mult: number): Promise<Blob> {
    const dpr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(dpr * mult);
    this.draw();
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(b => {
        this.renderer.setPixelRatio(dpr); this.dirty = true;
        if (b) resolve(b); else reject(new Error('The browser could not create the image (it may be too large; try a smaller size).'));
      }, 'image/png');
    });
  }
}
