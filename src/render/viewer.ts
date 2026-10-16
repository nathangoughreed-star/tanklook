// Owns the WebGL renderer and the one or two viewports (one per tank setup; two after a split). Render-on-demand.
import * as THREE from 'three';
import { fishTL, speciesOf } from '../data/species';
import { D2R, clamp, depthRatio, floorY, tankUnderside } from '../scene/physics';
import { eyeDist, lensZoom } from '../scene/orbit';
import { tableOn, tableRing } from '../scene/table';
import { footprint } from '../scene/shape';
import type { Store } from '../scene/store';
import type { Fish, Tank, TankSetup } from '../scene/types';
import { HOOD_H, PART, buildTank, disposeScene, envKey, lookKey, patchLook, patchTank, personSpot, type BuiltTank, type PoolGrab, type TerrainEdit } from './build';
import { drawViewMap } from './viewmap';
import { applyFraming, fovFor, frameBox, frameStraightOn, placeCamera, windowCentre } from './camera';
import { glowColor, placeSlice, roomLevel, setLightUniforms, setWaterUniforms } from './lighting';
import { wattsOf } from '../scene/lightout';
import { placeShells } from './lightShells';
import { onPictureLoad, setMaxAnisotropy } from './textures';
import { OUTLINE } from './fish3d';
import { capping } from './items';
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
  /** Fixture parts and the beams above the rim: hidden while the eye is above them when `hideOverhead` is on (userData.overhead = that height). */
  overhead?: THREE.Object3D[];
  /** Frosted background sheets (build `bgMaterial`), with their faces as outward planes (`frostCull`). */
  frost?: { mesh: THREE.Mesh; planes: THREE.Plane[] }[];
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

/**
 * The part of the canvas (CSS px) an exported PNG keeps (audit #49: it had wide empty margins): the tanks' boxes (tank,
 * stand, table) with a margin of 6 % of the larger side, never past the canvas; split views keep their full width
 * between the outer tanks, so both stay side by side as on screen.
 */
export function exportCrop(content: { x0: number; x1: number; y0: number; y1: number }[], W: number, H: number) {
  if (!content.length) return { x: 0, y: 0, w: W, h: H };
  const x0 = Math.min(...content.map(c => c.x0)), x1 = Math.max(...content.map(c => c.x1));
  const y0 = Math.min(...content.map(c => c.y0)), y1 = Math.max(...content.map(c => c.y1));
  const m = 0.06 * Math.max(x1 - x0, y1 - y0);
  const x = Math.max(0, Math.floor(x0 - m)), y = Math.max(0, Math.floor(y0 - m));
  return { x, y, w: Math.min(W, Math.ceil(x1 + m)) - x, h: Math.min(H, Math.ceil(y1 + m)) - y };
}

/** The orbit centre (placeCamera looks at it), so tan units are measured from the direction to it. */
const pivot = (T: Tank) => new THREE.Vector3(T.L / 2, T.H / 2, -T.D / 2);

/**
 * The first surface the eye actually sees along `ray` (the orbit pivot, Viewer.pinOrbit): any mesh in the scene (rock,
 * gravel, backdrop, stand, room...), but not see-through overlays (glass, water, shadows, outlines: transparent without
 * depth writes), not where a clipping plane cuts the mesh away, and not through the clear part of a fish or plant card.
 */
function seenAt(scene: THREE.Scene, ray: THREE.Ray) {
  const shown = (o: THREE.Object3D | null): boolean => !o || (o.visible && shown(o.parent));
  for (const h of new THREE.Raycaster(ray.origin, ray.direction).intersectObject(scene, true)) {
    const o = h.object as THREE.Mesh; if (!o.isMesh || o.userData.dot != null || !shown(o)) continue;
    const ms = ([] as THREE.Material[]).concat(o.material), m = Array.isArray(o.material) ? ms[h.face?.materialIndex ?? 0] : ms[0];
    if (!m || !m.visible || !m.colorWrite || (m.transparent && !m.depthWrite) || m.depthTest === false) continue;
    if (m.clippingPlanes?.some(pl => pl.distanceToPoint(h.point) < 0)) continue;
    const map = (m as THREE.MeshBasicMaterial).map;
    if (map && h.uv && (m.alphaTest > 0 || m.alphaToCoverage || m.transparent) && alphaAt(map, h.uv) * m.opacity < Math.max(m.alphaTest, 0.3)) continue;
    return h.point.clone();
  }
  return null;
}
/**
 * How far along `ray` an orbit pivot may sit (Nathan 2026-10-15: "build an invisible wall around the tank"): where the
 * ray leaves the tank's box, or, for a ray that misses the tank, its closest approach to the tank centre. A point seen
 * beyond that (the room wall behind empty space) would swing the view wide.
 */
function pivotReach(T: Tank, ray: THREE.Ray) {
  const lo = [0, 0, -T.D], hi = [T.L, T.H, 0], o = ray.origin.toArray(), d = ray.direction.toArray();
  let t0 = 0, t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo[k] || o[k] > hi[k]) { t1 = -1; break; } continue; }
    const a = (lo[k] - o[k]) / d[k], b = (hi[k] - o[k]) / d[k];
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
  }
  return t1 >= t0 && t1 > 0 ? t1 : Math.max(0, pivot(T).sub(ray.origin).dot(ray.direction));
}
/** Texture alpha at uv, 0-1 (1 when the image cannot be read). Each texture is copied to a canvas once. */
const alphaCache = new WeakMap<THREE.Texture, ImageData | null>();
function alphaAt(t: THREE.Texture, uv: THREE.Vector2) {
  if (!alphaCache.has(t)) {
    let d: ImageData | null = null;
    try {
      const img = t.image as CanvasImageSource & { width: number; height: number };
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0); d = g.getImageData(0, 0, c.width, c.height);
    } catch { /* not drawable (a data texture) */ }
    alphaCache.set(t, d);
  }
  const d = alphaCache.get(t); if (!d) return 1;
  const p = uv.clone(); t.transformUv(p);
  const x = Math.min(d.width - 1, Math.max(0, Math.floor(p.x * d.width))), y = Math.min(d.height - 1, Math.max(0, Math.floor(p.y * d.height)));
  return d.data[(y * d.width + x) * 4 + 3] / 255;
}

/** The faces of a frosted sheet as planes whose normal points away from the tank's centre (outside = the room side). */
function outwardPlanes(m: THREE.Mesh, T: Tank): THREE.Plane[] {
  const pos = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : pos.count;
  const c = new THREE.Vector3(T.L / 2, T.H / 2, -T.D / 2), tri = new THREE.Triangle(), out: THREE.Plane[] = [], v = [0, 1, 2].map(() => new THREE.Vector3());
  m.updateMatrixWorld();
  for (let i = 0; i < n; i += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(m.matrixWorld);
    tri.set(v[0], v[1], v[2]); if (tri.getArea() < 1e-6) continue;
    const p = tri.getPlane(new THREE.Plane());
    if (p.distanceToPoint(c) > 0) p.negate();
    if (!out.some(q => q.normal.dot(p.normal) > 0.99999 && Math.abs(q.constant - p.constant) < 0.01)) out.push(p);
  }
  return out;
}
/** frostCull: a mesh in the tank draws nothing into an off-screen target (the transmission pass); the canvas pass is untouched. */
function skipOffscreen(this: THREE.Object3D, r: THREE.WebGLRenderer, _s: THREE.Scene, _c: THREE.Camera, g: THREE.BufferGeometry) {
  if (r.getRenderTarget() === null) return;
  this.userData.range = g.drawRange.count; g.drawRange.count = -1; // a negative count draws nothing (three's renderBufferDirect)
}
function restoreRange(this: THREE.Object3D, _r: THREE.WebGLRenderer, _s: THREE.Scene, _c: THREE.Camera, g: THREE.BufferGeometry) {
  if (this.userData.range === undefined) return;
  g.drawRange.count = this.userData.range; delete this.userData.range;
}

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly vps: Viewport[];
  private dirty = true;
  private needsBuild = true;
  /** Custom terrain editing: show grid dots in the edited tanks; `hot` = the dot being dragged. UI state, not scene data. */
  terrainEdit: TerrainEdit = { on: false, hot: null, pool: 0 };
  private drawnListeners = new Set<() => void>();
  /**
   * Middle-drag pan per view, screen px: slides the image window (a lens shift, like the framing), so the eye,
   * perspective and orbit centre are untouched. It stays put (orbit and zoom keep it) until re-centred with
   * resetPan (Nathan 2026-10-13; it used to ease back on release). Locked views pan together. Wheel zoom pans too (zoomAt).
   */
  pans = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  private panAnim = 0;
  private panListeners = new Set<() => void>();
  onPan(fn: () => void) { this.panListeners.add(fn); }
  get panned() { return this.pans.some(p => p.x || p.y); }
  private panChanged() { this.dirty = true; for (const fn of this.panListeners) fn(); }
  setPan(i: number, x: number, y: number) {
    cancelAnimationFrame(this.panAnim);
    for (const [k, p] of this.pans.entries()) if (k === i || this.store.scene.camLock) { p.x = x; p.y = y; }
    this.panChanged();
  }
  /** Image window each view was last drawn with, tan units (centre and half-size). */
  private shown: { cx: number; cy: number; hx: number; hy: number }[] = [];
  private anchor: { i: number; nx: number; ny: number; u: number; v: number; r: number } | null = null;
  /**
   * Call before a wheel zoom in view i: the next draw pans so the point under the pointer stays under it (Nathan
   * 2026-10-13). Ticks that land before that draw keep the first tick's point. A pinch passes where its fingers' midpoint
   * was (`fromX`, `fromY`): the point that was there goes to where the midpoint is now, so it zooms and pans at once.
   */
  zoomAt(i: number, clientX: number, clientY: number, fromX = clientX, fromY = clientY) {
    const vp = this.vps[i], w = this.shown[i]; if (!w || this.anchor?.i === i) return;
    const r = this.host.getBoundingClientRect(), n = (x: number, y: number) => [(x - r.left - vp.x) / vp.w * 2 - 1, 1 - (y - r.top - vp.y) / vp.h * 2];
    const [nx, ny] = n(clientX, clientY), [fx, fy] = n(fromX, fromY);
    // r: eye to orbit centre, so a zoom that steps the eye back (below LENS_ZOOM_MIN) can rescale the point at the tank's depth
    this.anchor = { i, nx, ny, u: w.cx + fx * w.hx, v: w.cy + fy * w.hy, r: vp.cam.position.distanceTo(pivot(vp.T)) };
  }
  /**
   * Orbit about the point under the pointer (Nathan 2026-10-15: "if I want to orbit around a fish I hover over the fish
   * and orbit"): while pinned, every draw pans view i so `P` stays at (nx, ny). The eye still circles the tank centre at
   * the Eye distance (camera rule); only the image window follows. The fish, rock or plant under the pointer, else the
   * point under it at the orbit centre's depth. Cleared with unpinOrbit when the drag ends; the pan stays.
   */
  private pin: { i: number; nx: number; ny: number; P: THREE.Vector3 } | null = null;
  pinOrbit(clientX: number, clientY: number) {
    const hit = this.hitTest(clientX, clientY); if (!hit || !this.shown[hit.vp.i]) return; // not drawn yet: no camera to aim from
    const vp = hit.vp, r = this.host.getBoundingClientRect(), x = clientX - r.left - vp.x, y = clientY - r.top - vp.y;
    const seen = vp.scene && seenAt(vp.scene, hit.ray), reach = pivotReach(vp.T, hit.ray);
    const P = seen && seen.distanceTo(hit.ray.origin) <= reach ? seen : hit.ray.at(reach, new THREE.Vector3());
    this.pin = { i: vp.i, nx: x / vp.w * 2 - 1, ny: 1 - y / vp.h * 2, P };
  }
  unpinOrbit() { this.pin = null; }
  /** Ease every view back to its framing. */
  resetPan() {
    cancelAnimationFrame(this.panAnim);
    const from = this.pans.map(p => ({ ...p })), t0 = performance.now(), ms = 220;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3;
      for (const [i, p] of this.pans.entries()) { p.x = from[i].x * (1 - e); p.y = from[i].y * (1 - e); }
      this.panChanged();
      if (k < 1) this.panAnim = requestAnimationFrame(step);
    };
    this.panAnim = requestAnimationFrame(step);
  }

  constructor(readonly canvas: HTMLCanvasElement, readonly host: HTMLElement, readonly store: Store) {
    // a stencil buffer: hardscape cut open by the glass is capped (render/items.ts capPasses), the beam overlay drawn once
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false, stencil: true });
    capping.on = !!this.renderer.getContext().getContextAttributes()?.stencil;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true; // hardscape is cut off at the glass (render/items.ts solidMaterial)
    // a mesh frostCull leaves out of the transmission pass draws nothing there, but three would still pick (and on a
    // first visit link) a program for it, a second one per material because that pass writes linear colour: 25 s for
    // the hardscape alone on iwagumi (lane EF1). Skipping the call draws exactly the same.
    const direct = this.renderer.renderBufferDirect;
    this.renderer.renderBufferDirect = (cam, sc, g, m, o, grp) => {
      if (g.drawRange.count < 0 && o.userData.range !== undefined) return; // skipOffscreen's mark
      direct(cam, sc, g, m, o, grp);
    };
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
    // opaque draw order as three's default (materials grouped, then front to back), but the groups ranked by where
    // each material first appears in the scene instead of by its id, i.e. by when it was created: a patched scene
    // (build.ts patchTank) and a full rebuild then draw ties in the same order and match pixel for pixel (audit #52-53)
    this.renderer.setOpaqueSort((a, b) => a.groupOrder - b.groupOrder || a.renderOrder - b.renderOrder
      || (this.rank.get(a.material) ?? 0) - (this.rank.get(b.material) ?? 0) || a.z - b.z || a.id - b.id);
    const S = store.scene;
    this.vps = (['A', 'B'] as const).map((key, i) => ({ i, key, cam: new THREE.PerspectiveCamera(40, 1, 10, 40000), S: S.tanks[0], T: S.tanks[0].tank, x: 0, y: 0, w: 1, h: 1 }));
    store.subscribe(kind => { if (kind !== 'view') this.needsBuild = true; if (kind === 'load') this.revealNext = true; this.dirty = true; });
    new ResizeObserver(() => { this.dirty = true; }).observe(host);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { this.dirty = true; });
    onPictureLoad(() => { this.dirty = true; }); // a background picture finished decoding into its texture
    // three's loop (window frames, or the XR session's while one runs); an AR session draws through xrFrame instead (render/ar.ts)
    this.renderer.setAnimationLoop((t, f) => {
      if (this.xrFrame && f) this.xrFrame(t, f);
      else {
        if (this.dirty && this.needsBuild) this.buildAndLink();
        if (this.reveal) this.revealTick(performance.now());
        if (this.dirty && !this.reveal?.wait) { this.dirty = false; this.draw(); }
      }
    });
  }

  /** Build now; after a full build, start linking every program it needs before the draw uses them (startLinks). The
   *  first load and an opened file or example are then shown part by part as their programs are ready (reveal). */
  private buildAndLink() {
    this.build();
    if (!this.lastBuild.includes('full')) return;
    this.startLinks();
    if (this.revealNext) this.startReveal();
    this.revealNext = false;
  }

  // ---------- Reveal: the tank builds piece by piece while its programs link (lane PL) ----------
  /** The next full build is a first load or an opened file / example (a store 'load'): reveal it. */
  private revealNext = true;
  /**
   * While set, each view draws only its parts (build.ts PART, in order) up to `shown`: a part shows once every
   * program of it and of the parts before it has linked (asked without waiting: KHR_parallel_shader_compile), so the
   * page never waits on a link and no part shows with a program still linking. `wait`: the first REVEAL_GRACE ms, in
   * which nothing new is drawn; all ready by then (a warm load) = the whole tank at once, no animation and no hint.
   */
  private reveal: { t0: number; wait: boolean; shown: number[]; step: number; fade: number } | null = null;
  private overlay: HTMLCanvasElement | null = null;
  private lastFrame: HTMLCanvasElement | null = null;
  private static REVEAL_GRACE = 150; private static REVEAL_STEP = 160; private static REVEAL_FADE = 260;
  private startReveal() {
    this.reveal = { t0: performance.now(), wait: true, shown: [-1, -1], step: 0, fade: 0 };
  }
  /** How many parts of view vp could show now: the longest run, from the first part, whose programs are all linked. */
  private readyParts(vp: Viewport) {
    if (!vp.scene) return PART.animals;
    const props = this.renderer.properties, live = new Set<unknown>(this.renderer.info.programs);
    const parts = Array.from({ length: PART.animals + 1 }, () => [] as THREE.Object3D[]);
    for (const o of vp.scene.children) parts[o.userData.part ?? 0].push(o);
    // in order, stopping at the first part still linking (a program once ready stays so: three asks the driver no more)
    for (const [p, objs] of parts.entries()) {
      let ready = true;
      for (const o of objs) o.traverse(c => {
        if (ready) for (const m of ([] as THREE.Material[]).concat((c as THREE.Mesh).material ?? [])) {
          // every variant startLinks made of this material (the canvas pass and the frost pass's linear one)
          const progs = (props.get(m) as { programs?: Map<string, { isReady(): boolean }> }).programs;
          for (const g of progs?.values() ?? []) if (live.has(g) && !g.isReady()) { ready = false; return; }
        }
      });
      if (!ready) return p - 1;
    }
    return PART.animals;
  }
  private revealTick(now: number) {
    const R = this.reveal!, views = this.active, ready = views.map(vp => this.readyParts(vp));
    if (R.wait) {
      if (ready.every(k => k === PART.animals)) { this.endReveal(); return; } // warm: the whole tank at once
      if (now - R.t0 < Viewer.REVEAL_GRACE) return;
      R.wait = false; this.hint(true); this.dirty = true; // the empty room first: the picture the first part fades in over
      return;
    }
    // one part per REVEAL_STEP at most, so parts linked together still come in one after another
    if (now - R.step >= Viewer.REVEAL_STEP && views.some((vp, k) => R.shown[vp.i] < ready[k])) {
      this.fadeFrom(now);
      for (const [k, vp] of views.entries()) if (R.shown[vp.i] < ready[k]) R.shown[vp.i]++;
      R.step = now; this.dirty = true;
      performance.mark(`tank part ${Math.min(...views.map(vp => R.shown[vp.i]))}`); // for timing (scripts/cold-ab.mjs --probe)
    }
    const a = 1 - (now - R.fade) / Viewer.REVEAL_FADE;
    if (this.overlay) this.overlay.style.opacity = String(Math.max(0, a));
    if (a <= 0 && views.every(vp => R.shown[vp.i] >= PART.animals)) this.endReveal();
  }
  /** Start a cross-fade from the picture on screen now (the last frame, under what is left of a fade still running). */
  private fadeFrom(now: number) {
    const R = this.reveal!, c = this.canvas, last = this.lastFrame;
    let o = this.overlay;
    if (!o) {
      o = this.overlay = document.createElement('canvas'); o.className = 'revealFade'; o.setAttribute('aria-hidden', 'true');
      c.after(o);
    }
    Object.assign(o.style, { left: c.offsetLeft + 'px', top: c.offsetTop + 'px', width: c.clientWidth + 'px', height: c.clientHeight + 'px' });
    const g = o.getContext('2d')!, a = Math.max(0, 1 - (now - R.fade) / Viewer.REVEAL_FADE);
    if (o.width !== c.width || o.height !== c.height) { o.width = c.width; o.height = c.height; if (last) g.drawImage(last, 0, 0, o.width, o.height); }
    else if (last) { g.globalAlpha = 1 - a; g.drawImage(last, 0, 0, o.width, o.height); g.globalAlpha = 1; } // on screen: a x overlay + (1 - a) x last frame
    o.style.opacity = '1'; R.fade = now;
  }
  private endReveal() {
    performance.mark(this.reveal?.wait ? 'tank at once' : 'tank complete');
    this.reveal = null; this.hint(false); this.dirty = true;
    this.overlay?.remove(); this.overlay = null; this.lastFrame = null;
  }
  /** The small "Building the tank…" note while a reveal runs (index.html #buildHint). */
  private hint(on: boolean) { const h = document.getElementById('buildHint'); if (h) h.hidden = !on; }
  /** During a reveal, keep a copy of each frame (the canvas is cleared once shown): the next part fades in over it. */
  private keepFrame() {
    const c = this.canvas, l = this.lastFrame ??= document.createElement('canvas');
    if (l.width !== c.width || l.height !== c.height) { l.width = c.width; l.height = c.height; }
    const g = l.getContext('2d')!; g.clearRect(0, 0, l.width, l.height); g.drawImage(c, 0, 0);
  }
  private primeRT = new THREE.WebGLRenderTarget(1, 1);
  private primeMats = new Map<number, THREE.Material>();
  /**
   * Start linking every program the next draw needs, all at once (three's compile; with KHR_parallel_shader_compile
   * the driver links them in parallel on its own threads). On a first visit nothing is cached, and the draw linked
   * them one after another, each at its first use: 26-100 s on Windows, where D3D's shader compiler does the work; now
   * the draw waits about as long as the slowest one (lane EF1). (Letting the page run on until they are all ready, and
   * only then drawing, came out the same speed but not pixel-identical on paludarium's stone cracks: not taken.)
   * three's compile() takes the clipping-plane count from the last mesh it drew, not from the material, so the
   * materials are compiled in groups by their plane count, each after a mesh with that many planes was "drawn"
   * (primeClip); without that the glass-clipped hardscape and plants would get the wrong program and link again.
   */
  private startLinks() {
    const r = this.renderer;
    const planes = (o: THREE.Object3D) => (([] as THREE.Material[]).concat((o as THREE.Mesh).material)[0]?.clippingPlanes?.length ?? 0);
    const compile = (objs: THREE.Object3D[], vp: Viewport) => {
      const groups = new Map<number, THREE.Object3D[]>();
      for (const o of objs) { const n = planes(o); groups.set(n, [...groups.get(n) ?? [], o]); }
      for (const [n, list] of groups) {
        this.primeClip(n);
        // compile() only traverses the scene it is given: a stand-in that yields this group (and no lights: the real
        // scene is the target, whose lights it gathers)
        const part = { traverse: (fn: (o: THREE.Object3D) => void) => list.forEach(fn), traverseVisible: () => {} } as unknown as THREE.Scene;
        r.compile(part, vp.cam, vp.scene);
      }
    };
    for (const vp of this.active) {
      if (!vp.scene) continue;
      placeCamera(vp.cam, vp.T, vp.S.camera);
      const objs: THREE.Object3D[] = [];
      vp.scene.traverse(o => { const m = o as THREE.Mesh; if (m.material && (m.isMesh || (o as THREE.Line).isLine || (o as THREE.Points).isPoints || (o as THREE.Sprite).isSprite)) objs.push(o); });
      compile(objs, vp);
      // a frosted film draws the opaque meshes a second time into its transmission picture, which takes linear colour:
      // another program each, for the meshes the frost cull leaves in (see the renderBufferDirect hook)
      if (vp.frost?.length) {
        const culled = new Set(this.frostCull(vp));
        for (const o of culled) { o.onBeforeRender = THREE.Object3D.prototype.onBeforeRender; o.onAfterRender = THREE.Object3D.prototype.onAfterRender; }
        const prev = r.getRenderTarget();
        r.setRenderTarget(this.primeRT);
        const mats = (o: THREE.Object3D) => ([] as THREE.Material[]).concat((o as THREE.Mesh).material);
        compile(objs.filter(o => !culled.has(o) && mats(o).some(m => !m.transparent && !(m as THREE.MeshPhysicalMaterial).transmission)), vp);
        // and a two-sided film's back faces, which three draws into that picture too (as BackSide)
        const back = objs.filter(o => mats(o).some(m => (m as THREE.MeshPhysicalMaterial).transmission > 0 && m.side === THREE.DoubleSide));
        for (const o of back) for (const m of mats(o)) { m.side = THREE.BackSide; m.needsUpdate = true; }
        compile(back, vp);
        for (const o of back) for (const m of mats(o)) { m.side = THREE.DoubleSide; m.needsUpdate = true; }
        r.setRenderTarget(prev);
      }
    }
  }
  /** Leave three's clipping state at n planes: "draw" a mesh whose material has n of them (it draws nothing, into a
   *  1x1 target, and its program is a two-line one that links at once). */
  private primeClip(n: number) {
    const r = this.renderer;
    let m = this.primeMats.get(n);
    if (!m) {
      m = new THREE.RawShaderMaterial({ vertexShader: 'void main() { gl_Position = vec4(0.0); }', fragmentShader: 'precision mediump float;\nvoid main() { gl_FragColor = vec4(0.0); }', clippingPlanes: Array.from({ length: n }, () => new THREE.Plane()) });
      this.primeMats.set(n, m);
    }
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    g.setDrawRange(0, -1); // a negative count: three picks the program (and so the clipping state), then draws nothing
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
    const sc = new THREE.Scene(); sc.add(mesh);
    const prev = r.getRenderTarget(), cam = this.vps[0].cam;
    r.setRenderTarget(this.primeRT); r.render(sc, cam); r.setRenderTarget(prev);
    g.dispose();
  }
  /** Set while an AR session runs: it draws every XR frame itself and the normal render-on-demand pauses (render/ar.ts). */
  xrFrame: ((t: number, frame: XRFrame) => void) | null = null;

  onDrawn(fn: () => void) { this.drawnListeners.add(fn); }
  invalidate() { this.dirty = true; }
  /** Rebuild on the next frame (UI-only state that changes the scene, like terrain editing). */
  rebuild() { this.needsBuild = this.dirty = true; this.built = []; } // always a full build (textures loaded, terrain dots)
  /** Apply pending store edits to the scenes now, without drawing (an AR session draws itself: render/ar.ts). */
  buildNow() { if (this.needsBuild) this.build(); }

  /** The viewports on screen: one per tank. */
  get active() { return this.vps.slice(0, this.store.scene.tanks.length); }
  /** The viewport of the tank the panel edits. */
  get current() { return this.active[this.store.scene.active] ?? this.active[0]; }

  /** Opaque draw order: each material's place of first appearance in the scene being drawn (see the constructor). */
  private rank = new Map<THREE.Material, number>();
  /** Per view: the key its meshes outside the fish and items were built from (`viewKey`), and its `lookKey`. */
  private built: { env: string; look: string }[] = [];
  /** false = every change rebuilds the whole scene, as before audit #52-53 (the fallback; dev checks compare the two). */
  incremental = true;
  /** true = fixture parts and beams above the rim hide while the eye is above them (audit #20); off by default, so the
   *  light always shows (Nathan 2026-10-14). A per-viewer display preference, set from the View panel. */
  hideOverhead = false;
  /** What the last build did per view: 'full', 'patch' (with the number of fish / items rebuilt), or 'same'. */
  lastBuild: string[] = [];
  /**
   * What a view's meshes outside the fish and items depend on (envKey: everything but the fish, items, camera, the
   * values that are only uniforms and the colours patched in place), plus whether it is edited and the terrain dots.
   * Unchanged: only the fish and items whose own data or selection changed are rebuilt (patchTank). Colour
   * temperature, brightness and room light reach the picture through uniforms set every draw (audit #51).
   */
  private viewKey(i: number) {
    const S = this.store.scene.tanks[i]; if (!S) return '';
    return JSON.stringify([envKey(S), this.store.scene.units, this.store.isEditing(i), this.terrainEdit]);
  }

  private build() {
    const sc = this.store.scene;
    this.lastBuild = [];
    for (const vp of this.vps) {
      const S = sc.tanks[vp.i], old = this.built[vp.i];
      if (!S) { disposeScene(vp.scene); vp.scene = undefined; this.built[vp.i] = { env: '', look: '' }; continue; }
      const on = this.store.isEditing(vp.i); // selection outline and terrain dots only in the tanks being edited
      const env = this.viewKey(vp.i), look = lookKey(S), units = { ...S, units: sc.units };
      vp.S = S; vp.T = S.tank;
      if (this.incremental && vp.scene && old?.env === env) {
        if (old.look !== look) patchLook(vp.scene, S);
        const n = patchTank(vp as BuiltTank, units, S.tank, on ? this.sel.fish : null, on ? this.sel.items : null);
        vp.scene.traverse(o => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined; if (m?.userData?.glow) m.color.copy(glowColor(S.light.kelvin)); });
        this.lastBuild[vp.i] = n ? `patch ${n}` : old.look !== look ? 'look' : 'same';
      } else {
        disposeScene(vp.scene);
        Object.assign(vp, buildTank(units, S.tank, on ? this.sel.fish : null, on && this.terrainEdit.on ? this.terrainEdit : undefined, on ? this.sel.items : null));
        vp.overhead = []; vp.frost = [];
        (vp.scene as THREE.Scene | undefined)?.traverse(o => {
          if (o.userData.overhead != null) vp.overhead!.push(o);
          if (((o as THREE.Mesh).material as THREE.Material | undefined)?.userData?.frost) vp.frost!.push({ mesh: o as THREE.Mesh, planes: outwardPlanes(o as THREE.Mesh, S.tank) });
        });
        this.lastBuild[vp.i] = 'full';
      }
      this.built[vp.i] = { env, look };
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
    for (const vp of active) {
      placeCamera(vp.cam, vp.T, vp.S.camera);
      for (const o of vp.overhead ?? []) o.visible = !this.hideOverhead || vp.cam.position.y < o.userData.overhead;
    }
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
    // lens from the straight-on view, kept at every orbit angle (see frameStraightOn); it frames the tank (and a hood)
    // only: a stand or table runs off the bottom and shows once zoomed out (Nathan 2026-10-14, audit #29: on a stand,
    // the default tank was a small box on top of the cabinet)
    const boxes = active.map(vp => frameStraightOn(vp.T, vp.S.camera, vp.w / vp.h, headroom(vp.S)));
    // locked (or one tank): one FOV for all, so sizes stay directly comparable; unlocked: each view frames itself
    const shared = fovFor(Math.max(...boxes.map(b => b.t)), lensZoom(active[0].S.camera));
    const fovOf = (k: number) => (sc.camLock || active.length === 1 ? shared : fovFor(boxes[k].t, lensZoom(active[k].S.camera)));
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
    const frame = (k: number) => {
      const vp = active[k], fov = fovOf(k);
      const hy = Math.tan(fov * D2R / 2), hx = hy * vp.w / vp.h;
      // locked: the shared window while both tanks fit in it; zoomed past that, each view frames
      // its own tank, so a taller tank beside it never leaves this one cropped to the wall (Nathan 2026-10-09)
      const own = wins[k], u = lockedWin?.tank;
      const { tank, all } = u && u.x1 - u.x0 <= 2 * hx && u.y1 - u.y0 <= 2 * hy ? lockedWin! : own;
      // centred on the tank (#29, Nathan 2026-10-14: the stand runs off the bottom); zooming out eases toward tank + stand
      const a = windowCentre(all, tank, hx, hy), t = windowCentre(tank, tank, hx, hy), out = clamp((1 - vp.S.camera.zoom) / 0.3, 0, 1);
      return { fov, hx, hy, c: { cx: t.cx + (a.cx - t.cx) * out, cy: t.cy + (a.cy - t.cy) * out } };
    };
    // wheel zoom: pan so the point that was under the pointer is under it again (zoomAt)
    const a = this.anchor, ak = a ? active.findIndex(v => v.i === a.i) : -1; this.anchor = null;
    if (a && ak >= 0) {
      const { hx, hy, c } = frame(ak), vp = active[ak], k = a.r / vp.cam.position.distanceTo(pivot(vp.T));
      this.setPan(a.i, (c.cx + a.nx * hx - a.u * k) * vp.w / (2 * hx), (a.v * k - c.cy - a.ny * hy) * vp.h / (2 * hy));
    }
    // orbit drag: pan so the pinned point is under the pointer again (pinOrbit)
    const q = this.pin, qk = q ? active.findIndex(v => v.i === q.i) : -1;
    if (q && qk >= 0) {
      const { hx, hy, c } = frame(qk), vp = active[qk], v = q.P.clone().applyMatrix4(vp.cam.matrixWorldInverse), d = -v.z;
      if (d > 1) this.setPan(q.i, (c.cx - v.x / d + q.nx * hx) * vp.w / (2 * hx), (v.y / d - q.ny * hy - c.cy) * vp.h / (2 * hy));
    }
    this.content = [];
    for (const [k, vp] of active.entries()) {
      const S = vp.S, { fov, hx, hy, c } = frame(k);
      const pan = this.pans[vp.i]; c.cx -= pan.x * 2 * hx / vp.w; c.cy += pan.y * 2 * hy / vp.h; // the picture follows the pointer
      this.shown[vp.i] = { cx: c.cx, cy: c.cy, hx, hy };
      // the tank + stand (+ table) on the canvas, CSS px: what an exported PNG is cropped to (audit #49)
      const a = wins[k].all, px = (t: number) => vp.x + ((t - c.cx) / hx + 1) / 2 * vp.w, py = (t: number) => vp.y + (1 - ((t - c.cy) / hy + 1) / 2) * vp.h;
      this.content[k] = { x0: Math.max(vp.x, px(a.x0)), x1: Math.min(vp.x + vp.w, px(a.x1)), y0: Math.max(vp.y, py(a.y1)), y1: Math.min(vp.y + vp.h, py(a.y0)), vx: vp.x, vw: vp.w };
      applyFraming(vp.cam, fov, vp.w, vp.h, c.cx, c.cy);
      const person = vp.scene?.getObjectByName('person');
      if (person) this.placePerson(vp, person, headroom(S), bottom(S));
      r.setViewport(vp.x, vp.y, vp.w, vp.h); r.setScissor(vp.x, vp.y, vp.w, vp.h);
      r.setClearColor(new THREE.Color(0xd9dde2).multiplyScalar(0.06 + 0.94 * roomLevel(S.light.room))); r.clear(); // the space beyond the room dims with the room light
      setLightUniforms(vp.T, S.light, S.lid, S.render.beams, S); setWaterUniforms(vp.T, S.water, S.render.pop, S.condition);
      placeSlice(vp.scene!, vp.T, { ...S, tank: vp.T }, wattsOf({ ...S, tank: vp.T }) > 0); placeShells(vp.scene!, vp.T, S); OUTLINE.uPop.value = S.render.pop; OUTLINE.uVpH.value = vp.h; // placeSlice: the Light map layer at a set height
      // keep the cleared alpha (1): alpha-to-coverage fins would otherwise leave a translucent canvas, through which
      // the page shows on screen and a viewer's background (often white) in an exported PNG
      this.rank.clear(); vp.scene!.traverse(o => { const m = (o as THREE.Mesh).material; if (m) for (const x of ([] as THREE.Material[]).concat(m)) if (!this.rank.has(x)) this.rank.set(x, this.rank.size); });
      const cb = r.state.buffers.color, gl = r.getContext();
      cb.setMask(true); gl.colorMask(true, true, true, false); cb.setLocked(true);
      const culled = this.frostCull(vp);
      // a reveal running: only the parts shown so far (the rest are still linking; see revealTick)
      const upTo = this.reveal ? this.reveal.shown[vp.i] : PART.animals, held: THREE.Object3D[] = [];
      if (upTo < PART.animals) for (const o of vp.scene!.children) if (o.visible && (o.userData.part ?? 0) > upTo) { o.visible = false; held.push(o); }
      r.render(vp.scene!, vp.cam);
      for (const o of held) o.visible = true;
      for (const o of culled) { o.onBeforeRender = THREE.Object3D.prototype.onBeforeRender; o.onAfterRender = THREE.Object3D.prototype.onAfterRender; }
      cb.setLocked(false); cb.setMask(true); gl.colorMask(true, true, true, true);
    }
    r.setScissorTest(false);
    if (this.reveal) this.keepFrame();
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
      const pm = A.scene?.getObjectByName('person'), pp = pm && A.S.person.show ? personSpot(A.S, A.T) : null; // where they stand in this view
      drawViewMap(box.querySelector('canvas')!, A.S, A.T, sc.units, eye, view, pm && pp ? { x: pm.position.x, z: pm.position.z, w: pp.w } : null);
    }
    for (const fn of this.drawnListeners) fn();
  }

  /**
   * Frosted film: three draws every opaque mesh a second time, into the picture the film blurs (its transmission pass),
   * which on a big tank cost as much as the frame itself. What is in the tank can only show through the film when the
   * eye is outside one of the film's faces (looking at it from behind, or a film all round): otherwise the film is behind
   * it all, so those meshes are left out of that pass (Nathan 2026-10-14: the faint shadow they cast on the film may go).
   * Returns the meshes whose hooks to reset after the render.
   */
  private frostCull(vp: Viewport): THREE.Object3D[] {
    if (!vp.frost?.length || !vp.scene) return [];
    const eye = vp.cam.position;
    if (vp.frost.some(f => f.planes.some(p => p.distanceToPoint(eye) > 0))) return [];
    vp.scene.updateMatrixWorld(); // meshes built or patched since the last frame are placed first
    const T = vp.T, ring = footprint(T).ring, box = this.box, mid = this.corner, out: THREE.Object3D[] = [];
    const x0 = Math.min(...ring.map(p => p[0])), x1 = Math.max(...ring.map(p => p[0])), d0 = Math.min(...ring.map(p => p[1])), d1 = Math.max(...ring.map(p => p[1]));
    vp.scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.geometry || !(m.isMesh || (o as THREE.Line).isLine) || (m.material as THREE.Material).userData?.frost) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      box.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld).getCenter(mid);
      if (mid.x < x0 || mid.x > x1 || -mid.z < d0 || -mid.z > d1 || mid.y < 0 || mid.y > T.H) return;
      o.onBeforeRender = skipOffscreen; o.onAfterRender = restoreRange; out.push(o);
    });
    return out;
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
      fish: f, ...sA, formula: depthRatio(eyeDist(A.S.camera), f.depth),
      sideAngle: Math.acos(Math.min(1, Math.abs(n.dot(v)))) / D2R,
    };
  }

  /** The scale person stands at their home spot, facing the viewer. If from this view they would cover part of the
   *  tank or stand, they step sideways across the view, away from the tank, just far enough to stand clear; they
   *  are never hidden (Nathan 2026-10-13). */
  private placePerson(vp: Viewport, person: THREE.Object3D, headroom: number, bottom: number) {
    const home = (person.userData.home ??= person.position.clone()) as THREE.Vector3, cam = vp.cam;
    cam.updateMatrixWorld();
    const e = cam.matrixWorld.elements, rl = Math.hypot(e[0], e[2]) || 1, rx = e[0] / rl, rz = e[2] / rl; // screen-right, level
    // step toward the screen side they already stand on, relative to the tank's centre
    const s = (vp.T.L / 2 - home.x) * rx + (-vp.T.D / 2 - home.z) * rz > 0 ? -1 : 1;
    const at = (d: number) => {
      person.position.set(home.x + s * d * rx, home.y, home.z + s * d * rz);
      person.rotation.y = Math.atan2(cam.position.x - person.position.x, cam.position.z - person.position.z); person.updateMatrixWorld();
      return this.personBlocks(vp, person, headroom, bottom);
    };
    if (!at(0)) return;
    let lo = 0, hi = 200;
    while (hi < 50000 && at(hi)) { lo = hi; hi *= 2; }
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (at(m)) lo = m; else hi = m; }
    at(hi + 50); // a small gap past touching
  }

  /** Does the scale person stand between the camera and the tank or stand, covering part of them on screen? */
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
  /** What the selection highlights: every animal / piece of the group (null = none). */
  private get sel() { const g = this.store.group; return { fish: g.fish.length ? new Set(g.fish) : null, items: g.items.length ? new Set(g.items) : null }; }

  hitTest(clientX: number, clientY: number) {
    const r = this.host.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
    const vp = this.active.find(v => x >= v.x && x <= v.x + v.w);
    if (!vp) return null;
    const ndc = new THREE.Vector2((x - vp.x) / vp.w * 2 - 1, -(y - vp.y) / vp.h * 2 + 1);
    this.ray.setFromCamera(ndc, vp.cam);
    const dot = this.terrainEdit.on ? this.ray.intersectObjects(vp.dotMeshes ?? [], false).sort((a, b) => (b.object.userData.pool ? 1 : 0) - (a.object.userData.pool ? 1 : 0))[0] : undefined;
    const none = { fishId: null as number | null, itemId: null as number | null, dot: null as number | null, pool: null as PoolGrab | null };
    if (dot) return { vp, ray: this.ray.ray.clone(), ...none, mesh: dot.object as THREE.Mesh, dot: (dot.object.userData.dot ?? null) as number | null, pool: (dot.object.userData.pool ?? null) as PoolGrab | null };
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

  /** Per drawn view: the tank + stand's box on the canvas (CSS px) and the view's own left / width. */
  private content: { x0: number; x1: number; y0: number; y1: number; vx: number; vw: number }[] = [];

  // ---------- Export: render bigger, crop to the tanks, label split views, then save ----------
  exportPNG(mult: number): Promise<Blob> {
    const dpr = this.renderer.getPixelRatio(), k = dpr * mult;
    this.renderer.setPixelRatio(k);
    this.draw();
    const out = exportCrop(this.content, this.canvas.width / k, this.canvas.height / k);
    const t = document.createElement('canvas'); t.width = Math.round(out.w * k); t.height = Math.round(out.h * k);
    const g = t.getContext('2d')!;
    g.drawImage(this.canvas, out.x * k, out.y * k, t.width, t.height, 0, 0, t.width, t.height);
    this.renderer.setPixelRatio(dpr); this.dirty = true;
    if (this.content.length > 1) { // split: an A / B badge at the top-left of each view, as in the Compare chips
      const fs = Math.round(Math.max(18, 0.035 * out.h) * k);
      g.font = `700 ${fs}px system-ui, "Segoe UI", sans-serif`; g.textBaseline = 'top';
      this.content.forEach((c, i) => {
        const x = (Math.max(c.vx, out.x) - out.x) * k + fs * 0.6, y = fs * 0.6, label = 'AB'[i], w = g.measureText(label).width + fs * 0.8;
        g.fillStyle = 'rgba(20, 24, 30, 0.75)'; g.fillRect(x, y, w, fs * 1.5);
        g.fillStyle = '#fff'; g.fillText(label, x + fs * 0.4, y + fs * 0.25);
      });
    }
    return new Promise((resolve, reject) => {
      t.toBlob(b => {
        if (b) resolve(b); else reject(new Error('The browser could not create the image (it may be too large; try a smaller size).'));
      }, 'image/png');
    });
  }
}
