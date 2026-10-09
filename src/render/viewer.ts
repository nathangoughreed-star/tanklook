// Owns the WebGL renderer and the one or two viewports (one per tank setup; two after a split). Render-on-demand.
import * as THREE from 'three';
import { fishTL, getSpecies } from '../data/species';
import { D2R, depthRatio, floorY, tankUnderside } from '../scene/physics';
import { tableOn, tableRing } from '../scene/table';
import type { Store } from '../scene/store';
import type { Fish, Tank, TankSetup } from '../scene/types';
import { HOOD_H, buildTank, disposeScene, personSpot, straightOnEye, type BuiltTank } from './build';
import { drawViewMap } from './viewmap';
import { applyFraming, fovFor, frameBox, frameStraightOn, placeCamera, windowCentre } from './camera';
import { roomLevel, setLightUniforms, setWaterUniforms } from './lighting';
import { setMaxAnisotropy } from './textures';

export interface Viewport extends Partial<BuiltTank> {
  /** Index into scene.tanks (0 = A, 1 = B). */
  i: number;
  key: 'A' | 'B';
  cam: THREE.PerspectiveCamera;
  S: TankSetup;
  T: Tank;
  x: number; y: number; w: number; h: number;
}

export interface Measurement {
  fish: Fish;
  len: number;          // on-screen length, px (active tank)
  ref: number;          // same pose slid to the front glass, px
  formula: number;      // straight-on d / (d + z)
  sideAngle: number;    // degrees off side-on
}

const GAP = 8;

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly vps: Viewport[];
  private dirty = true;
  private needsBuild = true;
  /** Custom terrain editing: show grid dots in the edited tanks; `hot` = the dot being dragged. UI state, not scene data. */
  terrainEdit: { on: boolean; hot: number | null } = { on: false, hot: null };
  private drawnListeners = new Set<() => void>();
  /**
   * Temporary middle-drag pan, screen px: slides the image window (a lens shift, like the framing), so the eye,
   * perspective and orbit centre are untouched. `i` = the view being panned (both when locked). Eases back on release.
   */
  pan = { i: 0, x: 0, y: 0 };
  private panAnim = 0;
  setPan(i: number, x: number, y: number) { cancelAnimationFrame(this.panAnim); this.pan = { i, x, y }; this.dirty = true; }
  releasePan() {
    const { x, y } = this.pan, t0 = performance.now(), ms = 220;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3;
      this.pan.x = x * (1 - e); this.pan.y = y * (1 - e); this.dirty = true;
      if (k < 1) this.panAnim = requestAnimationFrame(step);
    };
    this.panAnim = requestAnimationFrame(step);
  }

  constructor(readonly canvas: HTMLCanvasElement, readonly host: HTMLElement, readonly store: Store) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
    const S = store.scene;
    this.vps = (['A', 'B'] as const).map((key, i) => ({ i, key, cam: new THREE.PerspectiveCamera(40, 1, 10, 40000), S: S.tanks[0], T: S.tanks[0].tank, x: 0, y: 0, w: 1, h: 1 }));
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

  /** The viewports on screen: one per tank. */
  get active() { return this.vps.slice(0, this.store.scene.tanks.length); }
  /** The viewport of the tank the panel edits. */
  get current() { return this.active[this.store.scene.active] ?? this.active[0]; }

  private build() {
    const sc = this.store.scene;
    for (const vp of this.vps) {
      disposeScene(vp.scene); vp.scene = undefined;
      const S = sc.tanks[vp.i]; if (!S) continue;
      const on = this.store.isEditing(vp.i); // selection outline and terrain dots only in the tanks being edited
      vp.S = S; vp.T = S.tank;
      Object.assign(vp, buildTank({ ...S, units: sc.units }, S.tank, on ? this.store.selId : null, on && this.terrainEdit.on ? this.terrainEdit : undefined, on ? this.store.selItem : null));
    }
    this.needsBuild = false;
  }

  /** Lay out viewports, frame cameras, render. Synchronous, so readouts are never a frame behind. */
  draw() {
    if (this.needsBuild) this.build();
    const sc = this.store.scene, w = this.host.clientWidth, h = this.host.clientHeight, r = this.renderer;
    r.setSize(w, h, false);
    const active = this.active, hw = (w - GAP) / 2;
    if (active.length === 1) Object.assign(active[0], { x: 0, y: 0, w, h });
    else { Object.assign(active[0], { x: 0, y: 0, w: hw, h }); Object.assign(active[1], { x: hw + GAP, y: 0, w: hw, h }); }
    for (const vp of active) placeCamera(vp.cam, vp.T, vp.S.camera);
    const headroom = (S: TankSetup) => (S.lid === 'hood' ? HOOD_H + 6 : S.light.type === 'flat' ? 4 : 60 + S.light.height);
    const bottom = (S: TankSetup) => (S.stand.show ? floorY(S.tank, S.render, S.stand) : 0);
    // the scale person: its card's corners as it stands facing `eye` (a w×w footprint instead put a near corner well
    // outside the silhouette, leaving extra empty space on the person's side)
    const extra = (vp: Viewport, eye: { x: number; z: number } = vp.cam.position) => {
      const S = vp.S, pts: THREE.Vector3[] = [];
      if (tableOn(S)) for (const [x, d] of tableRing(vp.T, S.stand.table)) for (const y of [floorY(vp.T, S.render, S.stand), tankUnderside(vp.T, S.render)]) pts.push(new THREE.Vector3(x, y, -d)); // a table wider than the tank
      if (!S.person.show) return pts;
      const p = personSpot(S, vp.T);
      const dx = eye.x - p.x, dz = eye.z - p.z, r = Math.hypot(dx, dz) || 1, px = -dz / r * p.w / 2, pz = dx / r * p.w / 2;
      for (const k of [-1, 1]) for (const y of [p.floor, p.floor + p.h]) pts.push(new THREE.Vector3(p.x + k * px, y, p.z + k * pz));
      return pts;
    };
    for (const vp of active) {      // the person stays put and turns to face the viewer
      const m = vp.scene?.getObjectByName('person');
      if (!m) continue;
      m.rotation.y = Math.atan2(vp.cam.position.x - m.position.x, vp.cam.position.z - m.position.z); m.updateMatrixWorld();
    }
    // lens from the straight-on view, kept at every orbit angle (see frameStraightOn)
    const boxes = active.map(vp => frameStraightOn(vp.T, vp.S.camera, vp.w / vp.h, headroom(vp.S), bottom(vp.S), extra(vp, straightOnEye(vp.S, vp.T))));
    // locked (or one tank): one FOV for all, so sizes stay directly comparable; unlocked: each view frames itself
    const shared = fovFor(Math.max(...boxes.map(b => b.t)), active[0].S.camera.zoom);
    const fovOf = (k: number) => (sc.camLock || active.length === 1 ? shared : fovFor(boxes[k].t, active[k].S.camera.zoom));
    r.setScissorTest(true);
    r.setViewport(0, 0, w, h); r.setScissor(0, 0, w, h);
    r.setClearColor(new THREE.Color(getComputedStyle(this.host).getPropertyValue('--stage-gap').trim() || '#eef0f3')); r.clear();
    // the lens SIZE comes from the straight-on view (above), but the image window is re-centred at every orbit angle
    // (Nathan 2026-10-08) on tank + stand + person; zooming in crops the room first and keeps the tank itself whole
    // while it fits (windowCentre)
    const wins = active.map(vp => ({
      tank: frameBox(vp.cam, vp.T, vp.w / vp.h, headroom(vp.S)),
      all: frameBox(vp.cam, vp.T, vp.w / vp.h, headroom(vp.S), bottom(vp.S), extra(vp)),
    }));
    // locked: one window for both, from the union of their bounds, so identical tanks and stands sit at identical
    // pixels even when one view's fixtures hang higher (otherwise each view centres on its own headroom)
    const union = (bs: { x0: number; x1: number; y0: number; y1: number }[]) => {
      const x0 = Math.min(...bs.map(b => b.x0)), x1 = Math.max(...bs.map(b => b.x1)), y0 = Math.min(...bs.map(b => b.y0)), y1 = Math.max(...bs.map(b => b.y1));
      return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    };
    const lockedWin = sc.camLock && active.length > 1 ? { tank: union(wins.map(b => b.tank)), all: union(wins.map(b => b.all)) } : null;
    for (const [k, vp] of active.entries()) {
      const S = vp.S, fov = fovOf(k);
      const hy = Math.tan(fov * D2R / 2), hx = hy * vp.w / vp.h;
      const { tank, all } = lockedWin ?? wins[k];
      // locked and zoomed past the union: shift only as far as this view's own tank needs (whole while it fits, else
      // its centre), so a taller or longer tank beside it never leaves this one cropped to the wall (Nathan 2026-10-09)
      const c = windowCentre(windowCentre(all, tank, hx, hy), wins[k].tank, hx, hy);
      if (lockedWin || this.pan.i === vp.i) { c.cx -= this.pan.x * 2 * hx / vp.w; c.cy += this.pan.y * 2 * hy / vp.h; } // the picture follows the pointer
      applyFraming(vp.cam, fov, vp.w, vp.h, c.cx, c.cy);
      r.setViewport(vp.x, vp.y, vp.w, vp.h); r.setScissor(vp.x, vp.y, vp.w, vp.h);
      r.setClearColor(new THREE.Color(0xd9dde2).multiplyScalar(0.06 + 0.94 * roomLevel(S.light.room))); r.clear(); // the space beyond the room dims with the room light
      setLightUniforms(vp.T, S.light, S.lid); setWaterUniforms(vp.T, S.water);
      // keep the cleared alpha (1): alpha-to-coverage fins would otherwise leave a translucent canvas, through which
      // the page shows on screen and a viewer's background (often white) in an exported PNG
      const cb = r.state.buffers.color, gl = r.getContext();
      cb.setMask(true); gl.colorMask(true, true, true, false); cb.setLocked(true);
      r.render(vp.scene!, vp.cam);
      cb.setLocked(false); cb.setMask(true); gl.colorMask(true, true, true, true);
    }
    r.setScissorTest(false);
    // one viewpoint map per view, at its bottom-left corner, drawn from that view's own camera, tank and person
    const mapOn = (document.getElementById('mapOn') as HTMLInputElement | null)?.checked ?? true;
    for (const k of [0, 1]) {
      const box = document.getElementById('vmap' + k), A = active[k];
      if (!box) continue;
      box.classList.toggle('off', !mapOn || !A);
      if (!mapOn || !A) continue;
      box.style.left = (A.x + 10) + 'px';
      const eye = { x: A.cam.position.x, z: A.cam.position.z };
      // floor-plan direction through the image at NDC x (lens shift included)
      const at = (nx: number) => { const p = new THREE.Vector3(nx, 0, 0.5).unproject(A.cam); return Math.atan2(p.z - eye.z, p.x - eye.x); };
      const view = { left: at(-1), right: at(1), mid: at(0) };
      const pp = A.S.person.show ? personSpot(A.S, A.T) : null;
      drawViewMap(box.querySelector('canvas')!, A.S, A.T, sc.units, eye, view, pp && { x: pp.x, z: pp.z, w: pp.w });
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
    const A = this.current, sA = this.screenLen(A, f), m = A.meshById?.get(f.id);
    if (!sA || !m) return null;
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion), v = A.cam.position.clone().sub(m.position).normalize();
    return {
      fish: f, ...sA, formula: depthRatio(A.S.camera.dist, f.depth),
      sideAngle: Math.acos(Math.min(1, Math.abs(n.dot(v)))) / D2R,
    };
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
    const none = { fishId: null as number | null, itemId: null as number | null, dot: null as number | null };
    if (dot) return { vp, ray: this.ray.ray.clone(), ...none, mesh: dot.object as THREE.Mesh, dot: dot.object.userData.dot as number };
    // the nearest fish, rock, wood or cave; a plant only when nothing else is under the pointer (its cards are mostly
    // see-through, so it would otherwise hide the fish behind it)
    const items = vp.itemMeshes ?? [];
    const hit = this.ray.intersectObjects([...(vp.fishMeshes ?? []), ...items.filter(m => !m.userData.plant)], false)[0]
      ?? this.ray.intersectObjects(items.filter(m => m.userData.plant), false)[0];
    const o = hit?.object;
    return { vp, ray: this.ray.ray.clone(), ...none, fishId: o && o.userData.item == null ? (o.userData.id as number) : null, itemId: o?.userData.item ?? null, mesh: o as THREE.Mesh | undefined };
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
