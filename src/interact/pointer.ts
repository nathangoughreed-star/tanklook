// Pointer: click a fish card to select it and drag it; drag empty space to orbit; wheel zooms (FOV only);
// shift + wheel moves the selected fish forward/back; click empty space to deselect; double-click it for straight-on.
// With split tanks, pressing in a view makes that tank the one being edited. Bottom dwellers and floor snails slide along the floor; snails on glass stay in their pane.
import * as THREE from 'three';
import { fishTL, getSpecies, restsOnFloor } from '../data/species';
import { restsOnGround } from '../scene/water';
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
  // custom terrain: dragging a grid dot up/down; the height follows the pointer at the dot's on-screen scale
  let lift: { k: number; y0: number; h0: number; mmPerPx: number; moved: boolean } | null = null;

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    let hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
    if (hit.vp.i !== store.scene.active) {        // activate that tank first (rebuilds: selection and dots move there)
      store.setActive(hit.vp.i); viewer.draw();
      hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
    canvas.classList.add('dragging');
    if (hit.dot != null && hit.mesh) {
      const cam = hit.vp.cam, dist = cam.position.distanceTo(hit.mesh.position);
      lift = { k: hit.dot, y0: e.clientY, h0: store.tank.terrain.h[hit.dot], mmPerPx: dist * 2 * Math.tan(cam.fov * D2R / 2) / cam.zoom / hit.vp.h, moved: false };
      viewer.terrainEdit.hot = hit.dot; viewer.rebuild();
      return;
    }
    if (hit.fishId == null || !hit.mesh) {
      const c = store.tank.camera; orbit = { x: e.clientX, y: e.clientY, az: c.az, el: c.el }; return;
    }
    store.select(hit.fishId);
    const t = store.tank, c = t.camera, f = t.fish.find(q => q.id === hit.fishId), sp = f && getSpecies(f.species);
    // the drag plane: the floor or the snail's pane for animals that cling to a surface, else it follows the view
    const surf = f?.surface ?? 'floor';
    const onGround = !!sp && !!f && (restsOnFloor(sp, surf) || (sp.kind !== 'snail' && restsOnGround(t, t.tank, sp, f.x, f.depth, fishTL(f, sp) * sp.aspect)));
    const mode: DragMode = onGround ? 'top' : sp?.kind === 'snail' ? (surf === 'left' || surf === 'right' ? 'side' : 'front') : dragModeFor(c.az, c.el);
    const n = mode === 'top' ? new THREE.Vector3(0, 1, 0) : mode === 'side' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, hit.mesh.position), p = new THREE.Vector3();
    if (!hit.ray.intersectPlane(pl, p)) return;
    drag = { vp: hit.vp, plane: pl, mode, off: p.sub(hit.mesh.position), moved: false };
  });

  canvas.addEventListener('pointermove', e => {
    if (lift) {
      const l = lift, h = +clamp(l.h0 + (l.y0 - e.clientY) * l.mmPerPx, 0, store.tank.tank.H * LIMITS.terrainMax).toFixed(1);
      store.edit(t => { t.terrain.h[l.k] = h; }, { coalesce: 'terrain' }); l.moved = true;
      return;
    }
    if (orbit) {
      const o = orbit;
      store.cam(c => {
        c.az = Math.round(((o.az - (e.clientX - o.x) * 0.4) + 540) % 360 - 180);
        c.el = Math.round(clamp(o.el + (e.clientY - o.y) * 0.4, ...LIMITS.el));
      });
      return;
    }
    if (!drag) return;
    const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit || hit.vp !== drag.vp) return;
    const p = new THREE.Vector3(); if (!hit.ray.intersectPlane(drag.plane, p)) return;
    p.sub(drag.off);
    const d = drag, T = d.vp.T;
    store.edit(t => {
      const f = t.fish.find(f => f.id === store.selId); if (!f) return;
      if (d.mode !== 'side') f.x = clamp(p.x, 0, T.L);
      if (d.mode !== 'top') f.y = clamp(p.y, 0, T.H);
      if (d.mode !== 'front') f.depth = clamp(-p.z, 0, T.D);
    }, { coalesce: 'drag' });
    d.moved = true;
  });

  const end = (e: PointerEvent) => {
    // a plain click on empty space (no orbit drag) clears the selection, so nothing is highlighted
    if (orbit && e.type === 'pointerup' && Math.hypot(e.clientX - orbit.x, e.clientY - orbit.y) < 4) store.select(null);
    if (drag?.moved || orbit || lift?.moved) store.seal();
    if (lift) { viewer.terrainEdit.hot = null; viewer.rebuild(); }
    drag = orbit = lift = null; canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener('dblclick', e => {
    const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit || hit.fishId != null) return;
    store.cam(c => Object.assign(c, { az: 0, el: 0, zoom: 1 }));
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!e.shiftKey) {
      const hit = viewer.hitTest(e.clientX, e.clientY);
      if (hit && hit.vp.i !== store.scene.active) store.setActive(hit.vp.i); // zoom the view under the pointer
      store.cam(c => { c.zoom = +clamp(c.zoom * (e.deltaY > 0 ? 1 / 1.1 : 1.1), ...LIMITS.zoom).toFixed(2); });
      return;
    }
    if (!store.selected) return;
    const dir = Math.sign(e.deltaY || e.deltaX);
    store.edit(t => {
      const f = t.fish.find(f => f.id === store.selId)!;
      f.depth = clamp(f.depth + dir * t.tank.D * 0.03, 0, t.tank.D);
    }, { coalesce: 'wheel-depth' });
  }, { passive: false });
}
