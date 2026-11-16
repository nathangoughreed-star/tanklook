// GS4 follow-up (2026-11-16; R110, Nathan: "Yes, on the 3D tank"): while "Where it fails" is open in the custom tank maker, each pane's map is painted onto
// the glass in the 3D view (stress: the green / amber / red local-SF colours; deflection: the blue map, with the panes bulged outward by the solver's own
// deflection grid times the exaggeration shown on the card). One singleton: the Maker attaches the viewer while it is open, the FailView shows / hides.
// The overlay is a THREE.Group added to the viewport's scene only while shown; it is not in any pick list (hit tests read fish / item / dot meshes only)
// and the maker's view is never exported, so nothing leaks into the main tank view. Hide / detach / unmount remove it and free its geometry.
import * as THREE from 'three';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { GLASS_MOR } from '../scene/glassSolver';
import { deflText, exaggeration, type Diagnosis, type PaneDiag } from '../scene/glassDiagnose';

export type FailMode = 'stress' | 'defl';
export type FailPane = PaneDiag['id'];
export interface FailDims { L: number; D: number; H: number; t: number }
export interface FailAnchor { id: FailPane; text: string; world: THREE.Vector3 }

const OUT = 0.3; // mm: the overlay sits just outside the glass so the transparent pane does not hide it
const TONE_RGB = { ok: new THREE.Color(0x3fb27f), near: new THREE.Color(0xe0a93b), bad: new THREE.Color(0xe05d5d) };
const BLUE = new THREE.Color(0x4f8ff7);

/** Sign that makes the largest deflection point positive (outward): the solution's sign convention is not relied on. */
export function outwardSign(p: PaneDiag): number {
  let m = 0, s = 1;
  for (const row of p.grid.w) for (const v of row) if (Math.abs(v) > Math.abs(m)) { m = v; s = Math.sign(v) || 1; }
  return s;
}
/** The exaggeration a pane is drawn with, in the card and in 3D alike. */
export const paneScale = (p: PaneDiag) => exaggeration(p.w, p.b);

/** Vertex positions (local x along the span, y up the pane, z outward) of a pane's mesh: z = w x scale in deflection mode, 0 in stress mode. */
export function paneVertices(p: PaneDiag, mode: FailMode, scale = paneScale(p)): Float32Array {
  const { nx, ny, w } = p.grid, sg = outwardSign(p), out = new Float32Array(nx * ny * 3);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = (j * nx + i) * 3;
    out[k] = p.a * i / (nx - 1); out[k + 1] = p.b * j / (ny - 1); out[k + 2] = mode === 'defl' ? sg * w[j][i] * scale : 0;
  }
  return out;
}

function paneColors(p: PaneDiag, mode: FailMode, target: number): Float32Array {
  const { nx, ny, w, sigma } = p.grid, allow = GLASS_MOR / target, out = new Float32Array(nx * ny * 3);
  let wm = 0; for (const row of w) for (const v of row) wm = Math.max(wm, Math.abs(v));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = (j * nx + i) * 3;
    let c: THREE.Color;
    if (mode === 'stress') { const r = sigma[j][i] / allow; c = (r <= 1 / 1.25 ? TONE_RGB.ok : r <= 1 ? TONE_RGB.near : TONE_RGB.bad).clone().multiplyScalar(0.55 + 0.45 * Math.min(1, r)); }
    else c = BLUE.clone().multiplyScalar(0.25 + 0.75 * (wm > 0 ? Math.abs(w[j][i]) / wm : 0));
    out[k] = c.r; out[k + 1] = c.g; out[k + 2] = c.b;
  }
  return out;
}

/** Where each pane group sits on the tank (interior box x 0..L, y 0..H, z -D..0, front at z = 0, glass outside): position and Y / X rotation. */
function frame(id: 'front' | 'back' | 'left' | 'right' | 'bottom', d: FailDims): { pos: [number, number, number]; rx: number; ry: number } {
  const { L, D, t } = d, o = t + OUT;
  switch (id) {
    case 'front': return { pos: [0, 0, o], rx: 0, ry: 0 };
    case 'back': return { pos: [L, 0, -D - o], rx: 0, ry: Math.PI };
    case 'left': return { pos: [-o, 0, -D], rx: 0, ry: -Math.PI / 2 };
    case 'right': return { pos: [L + o, 0, 0], rx: 0, ry: Math.PI / 2 };
    default: return { pos: [0, -o, -D], rx: Math.PI / 2, ry: 0 };
  }
}
const SOURCE: Record<'front' | 'back' | 'left' | 'right' | 'bottom', FailPane> = { front: 'front', back: 'front', left: 'ends', right: 'ends', bottom: 'bottom' };

export interface Overlay { root: THREE.Group; panes: { id: FailPane; side: string; group: THREE.Group; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[]; anchors: FailAnchor[]; dispose(): void }

/** Build the overlay group for a diagnosis (headless-safe: no renderer needed). */
export function buildOverlay(d: Diagnosis, mode: FailMode, dims: FailDims, u: 'in' | 'cm', hot: FailPane | null = null): Overlay {
  const root = new THREE.Group(); root.name = 'fail-overlay'; root.renderOrder = 20;
  const panes: Overlay['panes'] = [], anchors: FailAnchor[] = [];
  for (const side of ['front', 'back', 'left', 'right', 'bottom'] as const) {
    const p = d.panes.find(q => q.id === SOURCE[side])!, { nx, ny } = p.grid, N = paneScale(p);
    const g = new THREE.BufferGeometry();
    // a bottom resting on a flat stand is carried by the stand, not checked as a plate: drawn flat and neutral, labelled "on stand"
    const stand = p.onStand;
    g.setAttribute('position', new THREE.BufferAttribute(paneVertices(p, stand ? 'stress' : mode, N), 3));
    g.setAttribute('color', new THREE.BufferAttribute(stand ? paneColors(p, 'stress', d.target).map(() => 0.55) : paneColors(p, mode, d.target), 3));
    const idx: number[] = [];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, e = c + 1; idx.push(a, b, e, a, e, c); }
    g.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: hot && hot !== p.id ? 0.18 : hot === p.id ? 0.85 : 0.55, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 20; mesh.userData.failPane = p.id;
    const grp = new THREE.Group(), f = frame(side, dims);
    grp.position.set(...f.pos); grp.rotation.set(f.rx, f.ry, 0); grp.add(mesh);
    // undeformed outline, faint
    const o = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(p.a, 0, 0), new THREE.Vector3(p.a, p.b, 0), new THREE.Vector3(0, p.b, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
    o.renderOrder = 21; grp.add(o);
    // the marker (the 2D card's ring and cross) and its label, once per pane group: the front, the left end, the bottom
    if (side === 'front' || side === 'left' || side === 'bottom') {
      let at = p.at, z = 0, text: string;
      if (stand) { text = 'on stand'; at = { x: p.a / 2, y: p.b / 2 }; }
      else if (mode === 'stress') text = u === 'in' ? `${Math.round(p.sigma * 145.038).toLocaleString('en-US')} psi · SF ${Number.isFinite(p.sf) ? p.sf.toFixed(1) : '-'}` : `${p.sigma.toFixed(2)} MPa · SF ${Number.isFinite(p.sf) ? p.sf.toFixed(1) : '-'}`;
      else {
        let wi = 0, wj = 0, wm = 0; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (Math.abs(p.grid.w[j][i]) > wm) { wm = Math.abs(p.grid.w[j][i]); wi = i; wj = j; }
        at = { x: p.a * wi / (nx - 1), y: p.b * wj / (ny - 1) }; z = outwardSign(p) * p.grid.w[wj][wi] * N; text = deflText(p.w, u);
      }
      const r = p.b * 0.035, mk = new THREE.Group(); mk.position.set(at.x, at.y, z + 0.2); mk.renderOrder = 22;
      const mm = new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true });
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 33 }, (_, k) => new THREE.Vector3(Math.cos(k / 32 * 2 * Math.PI) * r, Math.sin(k / 32 * 2 * Math.PI) * r, 0))), mm);
      const cross = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-r * 1.7, 0, 0), new THREE.Vector3(r * 1.7, 0, 0), new THREE.Vector3(0, -r * 1.7, 0), new THREE.Vector3(0, r * 1.7, 0)]), mm);
      ring.renderOrder = cross.renderOrder = 22; mk.add(ring, cross); if (!stand) grp.add(mk);
      grp.updateMatrixWorld(true);
      anchors.push({ id: p.id, text, world: new THREE.Vector3(at.x, at.y, z + 0.2).applyMatrix4(grp.matrixWorld) });
    }
    root.add(grp); panes.push({ id: p.id, side, group: grp, mesh, mat });
  }
  root.updateMatrixWorld(true);
  const dispose = () => root.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach(x => x.dispose()); });
  return { root, panes, anchors, dispose };
}

type Hot = FailPane | null;
class FailOverlay {
  private viewer: (() => Viewer | undefined) | null = null; private store: Store | null = null; private host: HTMLElement | null = null;
  private ov: Overlay | null = null;
  private args: { d: Diagnosis; mode: FailMode; dims: FailDims; u: 'in' | 'cm' } | null = null;
  private hot: Hot = null; private hotCbs = new Set<(h: Hot) => void>(); private draws = new Set<() => void>();
  private down: { x: number; y: number } | null = null;
  private cleanups: (() => void)[] = [];

  /** The Maker calls this while it is open (the viewer, the store, the element that holds the canvas). */
  attach(viewer: () => Viewer | undefined, store: Store, host: HTMLElement) { this.detach(); this.viewer = viewer; this.store = store; this.host = host; this.listen(); }
  /** The Maker closed: everything is removed. */
  detach() { this.hide(); this.cleanups.forEach(f => f()); this.cleanups = []; this.viewer = null; this.store = null; this.host = null; }
  get on() { return !!this.ov; }
  get root(): THREE.Group | null { return this.ov?.root ?? null; }
  get anchors(): FailAnchor[] { return this.ov?.anchors ?? []; }
  get hovered(): Hot { return this.hot; }
  onHot(cb: (h: Hot) => void) { this.hotCbs.add(cb); return () => { this.hotCbs.delete(cb); }; }
  /** Subscribe to redraws (the labels follow the camera). */
  onFrame(cb: () => void) { this.draws.add(cb); return () => { this.draws.delete(cb); }; }

  show(d: Diagnosis, mode: FailMode, dims: FailDims, u: 'in' | 'cm') {
    this.args = { d, mode, dims, u }; this.rebuild();
  }
  setHot(h: Hot) { if (h === this.hot) return; this.hot = h; this.hotCbs.forEach(cb => cb(h)); if (this.args) this.rebuild(); }
  hide() {
    if (this.ov) { this.ov.root.parent?.remove(this.ov.root); this.ov.dispose(); this.ov = null; }
    this.args = null; this.hot = null;
    this.viewer?.()?.invalidate();
    this.draws.forEach(cb => cb());
  }

  private vp() { const v = this.viewer?.(), s = this.store; return v && s ? v.vps[s.scene.active] ?? v.vps[0] : undefined; }
  private rebuild() {
    if (this.ov) { this.ov.root.parent?.remove(this.ov.root); this.ov.dispose(); this.ov = null; }
    if (!this.args) return;
    this.ov = buildOverlay(this.args.d, this.args.mode, this.args.dims, this.args.u, this.hot);
    this.place();
    this.viewer?.()?.invalidate();
    this.draws.forEach(cb => cb());
  }
  /** Put the group on the viewport's scene (a rebuilt scene drops it: this runs again after every draw). */
  private place() { const vp = this.vp(); if (vp?.scene && this.ov && this.ov.root.parent !== vp.scene) vp.scene.add(this.ov.root); }

  private pick(clientX: number, clientY: number): FailPane | null {
    const v = this.viewer?.(), vp = this.vp(), host = v?.host; if (!v || !vp || !this.ov || !host) return null;
    const r = host.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
    if (x < vp.x || x > vp.x + vp.w || y < vp.y || y > vp.y + vp.h) return null;
    const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2((x - vp.x) / vp.w * 2 - 1, -(y - vp.y) / vp.h * 2 + 1), vp.cam);
    this.ov.root.updateMatrixWorld(true);
    const hit = rc.intersectObjects(this.ov.panes.map(p => p.mesh), false)[0];
    return hit ? (hit.object.userData.failPane as FailPane) : null;
  }
  private listen() {
    const v = this.viewer?.(), host = this.host; if (!v || !host) return;
    const onDrawn = () => { if (this.ov) { this.place(); } this.draws.forEach(cb => cb()); };
    v.onDrawn(onDrawn);
    const move = (e: PointerEvent) => { if (!this.ov || e.pointerType === 'touch' || e.buttons) return; this.setHot(this.pick(e.clientX, e.clientY)); };
    const dn = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY }; };
    const up = (e: PointerEvent) => { const d0 = this.down; this.down = null; if (!this.ov || !d0 || Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 5) return; const h = this.pick(e.clientX, e.clientY); this.setHot(h === this.hot ? null : h); };
    host.addEventListener('pointermove', move); host.addEventListener('pointerdown', dn); host.addEventListener('pointerup', up);
    this.cleanups.push(() => { host.removeEventListener('pointermove', move); host.removeEventListener('pointerdown', dn); host.removeEventListener('pointerup', up); (v as unknown as { drawnListeners?: Set<() => void> }).drawnListeners?.delete(onDrawn); });
  }
}
export const failOverlay = new FailOverlay();
