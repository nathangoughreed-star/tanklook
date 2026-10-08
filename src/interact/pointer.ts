// Pointer: click a fish card to select it and drag it; drag empty space to orbit; wheel zooms (FOV only);
// shift + wheel moves the selected fish forward/back; double-click empty space returns to straight-on.
// Bottom dwellers and floor snails slide along the floor; snails on glass stay in their pane.
import * as THREE from 'three';
import { getSpecies, restsOnFloor } from '../data/species';
import { D2R, clamp } from '../scene/physics';
import type { Store } from '../scene/store';
import type { Viewer, Viewport } from '../render/viewer';
import { LIMITS } from '../scene/validate';

type DragMode = 'front' | 'top' | 'side';

/** The drag plane follows the view: front-ish = parallel to glass; >45° from above = floor plan; side-on = side plane. */
export function dragModeFor(az: number, el: number): DragMode {
  return Math.abs(el) > 45 ? 'top' : Math.abs(Math.sin(az * D2R)) > 0.82 ? 'side' : 'front';
}

export function attachPointer(viewer: Viewer, store: Store) {
  const canvas = viewer.canvas;
  let drag: { vp: Viewport; plane: THREE.Plane; mode: DragMode; off: THREE.Vector3; moved: boolean } | null = null;
  let orbit: { x: number; y: number; az: number; el: number } | null = null;

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
    canvas.classList.add('dragging');
    if (hit.fishId == null || !hit.mesh) {
      const c = store.scene.camera; orbit = { x: e.clientX, y: e.clientY, az: c.az, el: c.el }; return;
    }
    store.select(hit.fishId);
    const c = store.scene.camera, f = store.scene.fish.find(q => q.id === hit.fishId), sp = f && getSpecies(f.species);
    // the drag plane: the floor or the snail's pane for animals that cling to a surface, else it follows the view
    const surf = f?.surface ?? 'floor';
    const mode: DragMode = sp && restsOnFloor(sp, surf) ? 'top' : sp?.kind === 'snail' ? (surf === 'left' || surf === 'right' ? 'side' : 'front') : dragModeFor(c.az, c.el);
    const n = mode === 'top' ? new THREE.Vector3(0, 1, 0) : mode === 'side' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, hit.mesh.position), p = new THREE.Vector3();
    if (!hit.ray.intersectPlane(pl, p)) return;
    drag = { vp: hit.vp, plane: pl, mode, off: p.sub(hit.mesh.position), moved: false };
  });

  canvas.addEventListener('pointermove', e => {
    if (orbit) {
      const o = orbit;
      store.update(s => {
        s.camera.az = Math.round(((o.az - (e.clientX - o.x) * 0.4) + 540) % 360 - 180);
        s.camera.el = Math.round(clamp(o.el + (e.clientY - o.y) * 0.4, ...LIMITS.el));
      }, { kind: 'view' });
      return;
    }
    if (!drag) return;
    const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit || hit.vp !== drag.vp) return;
    const p = new THREE.Vector3(); if (!hit.ray.intersectPlane(drag.plane, p)) return;
    p.sub(drag.off);
    const d = drag, T = d.vp.T;
    store.update(s => {
      const f = s.fish.find(f => f.id === store.selId); if (!f) return;
      const A = s.tankA;
      if (d.mode !== 'side') f.x = clamp(p.x, 0, T.L) * A.L / T.L;
      if (d.mode !== 'top') f.y = clamp(p.y, 0, T.H) * A.H / T.H;
      if (d.mode !== 'front') f.depth = clamp(-p.z, 0, T.D) * A.D / T.D;
    }, { coalesce: 'drag' });
    d.moved = true;
  });

  const end = () => { if (drag?.moved || orbit) store.seal(); drag = orbit = null; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener('dblclick', e => {
    const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit || hit.fishId != null) return;
    store.update(s => Object.assign(s.camera, { az: 0, el: 0, zoom: 1 }), { kind: 'view' });
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!e.shiftKey) {
      store.update(s => { s.camera.zoom = +clamp(s.camera.zoom * (e.deltaY > 0 ? 1 / 1.1 : 1.1), ...LIMITS.zoom).toFixed(2); }, { kind: 'view' });
      return;
    }
    if (!store.selected) return;
    const dir = Math.sign(e.deltaY || e.deltaX);
    store.update(s => {
      const f = s.fish.find(f => f.id === store.selId)!;
      f.depth = clamp(f.depth + dir * s.tankA.D * 0.03, 0, s.tankA.D);
    }, { coalesce: 'wheel-depth' });
  }, { passive: false });
}
