// Pointer: click a fish card to select it and drag it; drag empty space to orbit; wheel zooms (FOV only);
// shift + wheel moves the selected fish forward/back; double-click empty space returns to straight-on.
// Bottom dwellers and floor snails slide along the floor; snails on glass stay in their pane.
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
    const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
    canvas.classList.add('dragging');
    if (hit.dot != null && hit.mesh) {
      const cam = hit.vp.cam, dist = cam.position.distanceTo(hit.mesh.position);
      lift = { k: hit.dot, y0: e.clientY, h0: store.scene.terrain.h[hit.dot], mmPerPx: dist * 2 * Math.tan(cam.fov * D2R / 2) / cam.zoom / hit.vp.h, moved: false };
      viewer.terrainEdit.hot = hit.dot; viewer.rebuild();
      return;
    }
    if (hit.fishId == null || !hit.mesh) {
      const c = store.scene.camera; orbit = { x: e.clientX, y: e.clientY, az: c.az, el: c.el }; return;
    }
    store.select(hit.fishId);
    const c = store.scene.camera, f = store.scene.fish.find(q => q.id === hit.fishId), sp = f && getSpecies(f.species);
    // the drag plane: the floor or the snail's pane for animals that cling to a surface, else it follows the view
    const surf = f?.surface ?? 'floor';
    const onGround = !!sp && !!f && (restsOnFloor(sp, surf) || (sp.kind !== 'snail' && restsOnGround(store.scene, store.scene.tankA, sp, f.x, f.depth, fishTL(f, sp) * sp.aspect)));
    const mode: DragMode = onGround ? 'top' : sp?.kind === 'snail' ? (surf === 'left' || surf === 'right' ? 'side' : 'front') : dragModeFor(c.az, c.el);
    const n = mode === 'top' ? new THREE.Vector3(0, 1, 0) : mode === 'side' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, hit.mesh.position), p = new THREE.Vector3();
    if (!hit.ray.intersectPlane(pl, p)) return;
    drag = { vp: hit.vp, plane: pl, mode, off: p.sub(hit.mesh.position), moved: false };
  });

  canvas.addEventListener('pointermove', e => {
    if (lift) {
      const l = lift, h = +clamp(l.h0 + (l.y0 - e.clientY) * l.mmPerPx, 0, store.scene.tankA.H * LIMITS.terrainMax).toFixed(1);
      store.update(s => { s.terrain.h[l.k] = h; }, { coalesce: 'terrain' }); l.moved = true;
      return;
    }
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

  const end = () => {
    if (drag?.moved || orbit || lift?.moved) store.seal();
    if (lift) { viewer.terrainEdit.hot = null; viewer.rebuild(); }
    drag = orbit = lift = null; canvas.classList.remove('dragging');
  };
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
