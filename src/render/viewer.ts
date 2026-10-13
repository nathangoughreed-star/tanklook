// Owns the WebGL renderer and the one or two viewports (one per tank setup; two after a split). Render-on-demand.
import * as THREE from 'three';
import { fishTL, speciesOf } from '../data/species';
import { D2R, depthRatio, floorY, tankUnderside } from '../scene/physics';
import { tableOn, tableRing } from '../scene/table';
import type { Store } from '../scene/store';
import type { Fish, Tank, TankSetup } from '../scene/types';
import { HOOD_H, buildTank, disposeScene, personSpot, type BuiltTank } from './build';
import { drawViewMap } from './viewmap';
import { applyFraming, fovFor, frameBox, frameStraightOn, placeCamera, windowCentre } from './camera';
import { roomLevel, setLightUniforms, setWaterUniforms } from './lighting';
import { setMaxAnisotropy } from './textures';
import { PERSON_BODY, PERSON_HEAD } from '../art/placeholder';

type Pt2 = [number, number];
const cross = (o: Pt2, a: Pt2, b: Pt2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Convex hull (monotone chain), anticlockwise. */
function convexHull(pts: Pt2[]): Pt2[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), lo: Pt2[] = [], up: Pt2[] = [];
  for (const q of p) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
const inside = (q: Pt2, poly: Pt2[]) => {   // even-odd rule, any simple polygon
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > q[1]) !== (yj > q[1]) && q[0] < (xj - xi) * (q[1] - yi) / (yj - yi) + xi) r = !r;
  }
  return r;
};
/** Do two simple polygons overlap (an edge crossing, or one inside the other)? */
function polysOverlap(a: Pt2[], b: Pt2[]) {
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const r = b[j], s = b[(j + 1) % b.length];
      if (cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0) return true;
    }
  }
  return inside(a[0], b) || inside(b[0], a);
}

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
    this.renderer.localClippingEnabled = true; // hardscape is cut off at the glass (render/items.ts solidMaterial)
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
    // framing counts the tank and a hood on it, never the lights above: a fixture shows only once zoomed out enough (Nathan 2026-10-09)
    const headroom = (S: TankSetup) => (S.lid === 'hood' ? HOOD_H + 6 : 0);
    const bottom = (S: TankSetup) => (S.stand.show ? floorY(S.tank, S.render, S.stand) : 0);
    // a table wider than the tank; the scale person never counts, so a tall person beside a small tank no longer
    // shrinks it in the default view, and shows only once zoomed out enough, like the lights (Nathan 2026-10-09)
    const extra = (vp: Viewport) => {
      const S = vp.S, pts: THREE.Vector3[] = [];
      if (tableOn(S)) for (const [x, d] of tableRing(vp.T, S.stand.table)) for (const y of [floorY(vp.T, S.render, S.stand), tankUnderside(vp.T, S.render)]) pts.push(new THREE.Vector3(x, y, -d));
      return pts;
    };
    for (const vp of active) {      // the person stays put and turns to face the viewer
      const m = vp.scene?.getObjectByName('person');
      if (!m) continue;
      m.rotation.y = Math.atan2(vp.cam.position.x - m.position.x, vp.cam.position.z - m.position.z); m.updateMatrixWorld();
    }
    // lens from the straight-on view, kept at every orbit angle (see frameStraightOn)
    const boxes = active.map(vp => frameStraightOn(vp.T, vp.S.camera, vp.w / vp.h, headroom(vp.S), bottom(vp.S), extra(vp)));
    // locked (or one tank): one FOV for all, so sizes stay directly comparable; unlocked: each view frames itself
    const shared = fovFor(Math.max(...boxes.map(b => b.t)), active[0].S.camera.zoom);
    const fovOf = (k: number) => (sc.camLock || active.length === 1 ? shared : fovFor(boxes[k].t, active[k].S.camera.zoom));
    r.setScissorTest(true);
    r.setViewport(0, 0, w, h); r.setScissor(0, 0, w, h);
    r.setClearColor(new THREE.Color(getComputedStyle(this.host).getPropertyValue('--stage-gap').trim() || '#eef0f3')); r.clear();
    // the lens SIZE comes from the straight-on view (above), but the image window is re-centred at every orbit angle
    // (Nathan 2026-10-08) on tank + stand; zooming in crops the room first
    // and keeps the tank itself whole while it fits (windowCentre)
    const wins = active.map(vp => ({
      tank: frameBox(vp.cam, vp.T, vp.w / vp.h, headroom(vp.S)),
      all: frameBox(vp.cam, vp.T, vp.w / vp.h, headroom(vp.S), bottom(vp.S), extra(vp)),
    }));
    // locked: one window for both, from the union of their bounds, so identical tanks and stands sit at identical
    // pixels even when one view has a hood (otherwise each view centres on its own)
    const union = (bs: { x0: number; x1: number; y0: number; y1: number }[]) => {
      const x0 = Math.min(...bs.map(b => b.x0)), x1 = Math.max(...bs.map(b => b.x1)), y0 = Math.min(...bs.map(b => b.y0)), y1 = Math.max(...bs.map(b => b.y1));
      return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    };
    const lockedWin = sc.camLock && active.length > 1 ? { tank: union(wins.map(b => b.tank)), all: union(wins.map(b => b.all)) } : null;
    for (const [k, vp] of active.entries()) {
      const S = vp.S, fov = fovOf(k);
      const hy = Math.tan(fov * D2R / 2), hx = hy * vp.w / vp.h;
      // locked: the shared window while both tanks fit in it; zoomed past that, each view frames
      // its own tank, so a taller tank beside it never leaves this one cropped to the wall (Nathan 2026-10-09)
      const own = wins[k], u = lockedWin?.tank;
      const { tank, all } = u && u.x1 - u.x0 <= 2 * hx && u.y1 - u.y0 <= 2 * hy ? lockedWin! : own;
      const c = windowCentre(all, tank, hx, hy);
      if (lockedWin || this.pan.i === vp.i) { c.cx -= this.pan.x * 2 * hx / vp.w; c.cy += this.pan.y * 2 * hy / vp.h; } // the picture follows the pointer
      applyFraming(vp.cam, fov, vp.w, vp.h, c.cx, c.cy);
      const person = vp.scene?.getObjectByName('person');
      if (person) person.visible = !this.personBlocks(vp, person, headroom(S), bottom(S));
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
    const m = vp.meshById?.get(f.id), sp = speciesOf(f);
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

  /** Does the scale person stand between the camera and the tank or stand, covering part of them on screen?
   *  Then it is hidden for this view; it comes back once the view turns so it stands clear (Nathan 2026-10-13). */
  private personBlocks(vp: Viewport, person: THREE.Object3D, headroom: number, bottom: number) {
    const cam = vp.cam; cam.updateMatrixWorld();
    const tank = new THREE.Box3(new THREE.Vector3(0, bottom, -vp.T.D), new THREE.Vector3(vp.T.L, vp.T.H + headroom, 0));
    const body = new THREE.Box3().setFromObject(person);
    if (body.distanceToPoint(cam.position) >= tank.distanceToPoint(cam.position)) return false; // behind: the tank covers it
    // compare the shapes actually drawn, not their screen boxes: the drawn figure (not its card or the card's
    // turned bounding box) against the tank's own outline (not the rectangle around it, whose empty corners beside a
    // turned tank used to hide a person standing clear of the glass)
    const h = (person as THREE.Mesh<THREE.PlaneGeometry>).geometry.parameters.height;
    let behindEye = 0;
    const toScreen = (x: number, y: number) => {   // figure coords (heights; y down from the head) -> NDC
      const p = this.corner.set(x * h, h * (1 - y), 0).applyMatrix4(person.matrixWorld);
      if (p.clone().applyMatrix4(cam.matrixWorldInverse).z >= 0) behindEye++;
      p.project(cam); return [p.x, p.y] as Pt2;
    };
    const bodyPoly = PERSON_BODY.map(([x, y]) => toScreen(x, y));
    const headPoly = Array.from({ length: 16 }, (_, i) => toScreen(PERSON_HEAD.rx * Math.cos(i * Math.PI / 8), PERSON_HEAD.y + PERSON_HEAD.ry * Math.sin(i * Math.PI / 8)));
    if (behindEye) return behindEye < bodyPoly.length + headPoly.length; // partly behind the eye: right up close, it covers the view
    const corners: Pt2[] = [];
    for (let i = 0; i < 8; i++) {
      const p = this.corner.set(i & 1 ? tank.max.x : tank.min.x, i & 2 ? tank.max.y : tank.min.y, i & 4 ? tank.max.z : tank.min.z).project(cam);
      corners.push([p.x, p.y]);
    }
    const hull = convexHull(corners);
    return polysOverlap(bodyPoly, hull) || polysOverlap(headPoly, hull);
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
    // while shaping the ground only its dots are live: a near miss turns the view instead of moving a fish or a rock
    if (this.terrainEdit.on) return { vp, ray: this.ray.ray.clone(), ...none, mesh: undefined as THREE.Mesh | undefined };
    // the nearest fish, rock, wood or cave; a plant only when nothing else is under the pointer (its cards are mostly
    // see-through, so it would otherwise hide the fish behind it). A hit only counts in the middle of the piece's
    // on-screen box, so a drag that starts on a fin tip or a leaf's edge turns the view instead of moving the piece
    const items = vp.itemMeshes ?? [], core = (h: THREE.Intersection) => this.inCore(h.object as THREE.Mesh, ndc, vp);
    const hit = this.ray.intersectObjects([...(vp.fishMeshes ?? []), ...items.filter(m => !m.userData.plant)], false).find(core)
      ?? this.ray.intersectObjects(items.filter(m => m.userData.plant), false).find(core);
    const o = hit?.object;
    return { vp, ray: this.ray.ray.clone(), ...none, fishId: o && o.userData.item == null ? (o.userData.id as number) : null, itemId: o?.userData.item ?? null, mesh: o as THREE.Mesh | undefined };
  }

  private static CORE = 0.65; // share of the on-screen box (each way) that picks the piece
  private static CORE_MIN_PX = 12; // but never a half-size under this, so small fish stay easy to grab
  private box = new THREE.Box3(); private corner = new THREE.Vector3();
  /** Is the pointer (ndc) inside the central part of the mesh's projected bounding box? */
  private inCore(m: THREE.Mesh, ndc: THREE.Vector2, vp: Viewport) {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const b = this.box.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const p = this.corner.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(vp.cam);
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const hx = Math.max((x1 - x0) / 2 * Viewer.CORE, Viewer.CORE_MIN_PX * 2 / vp.w), hy = Math.max((y1 - y0) / 2 * Viewer.CORE, Viewer.CORE_MIN_PX * 2 / vp.h);
    return Math.abs(ndc.x - (x0 + x1) / 2) <= hx && Math.abs(ndc.y - (y0 + y1) / 2) <= hy;
  }

  /** Small JPEG of the current view for the saved-tanks list (drawn and read in one go: no preserved buffer needed).
   *  '' when there is nothing to picture (view collapsed or hidden): the save goes ahead without one. */
  thumbnail(w = 320): string {
    this.draw();
    const c = this.canvas, t = document.createElement('canvas');
    if (!c.width || !c.height) return '';
    t.width = w; t.height = Math.max(1, Math.round(w * c.height / c.width));
    const g = t.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL('image/jpeg', 0.75);
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
