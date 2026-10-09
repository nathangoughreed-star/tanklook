// Pointer: click a fish card to select it and drag it; drag empty space to orbit; wheel zooms (FOV only);
// shift + wheel moves the selected fish forward/back; click empty space to deselect; double-click it for straight-on.
// Middle-drag pans the picture for a look round the edge; it eases back to the framing on release.
// With split tanks, a view whose "Edit" box is ticked takes fish and terrain drags (that tank only) and pressing in it
// shows it in the panel; an unticked view only orbits, zooms and pans. Bottom dwellers and floor snails slide along the floor; snails on glass slide over the glass (round corners and curved shells).
// Aquascape items (rocks, wood, caves, plants) go where the pointer meets the ground or another piece, and rest on
// whatever is under them there; anything resting on the dragged piece rides along. Shift + wheel turns the selected piece.
import * as THREE from 'three';
import { fishTL, getSpecies, restsOnFloor } from '../data/species';
import { restsOnGround } from '../scene/water';
import { D2R, clamp } from '../scene/physics';
import { clampItem } from '../scene/items';
import { clampIn, nearestGlass } from '../scene/shape';
import { groundHeight } from '../scene/terrain';
import type { Store } from '../scene/store';
import type { Tank, TankSetup } from '../scene/types';
import type { Viewer, Viewport } from '../render/viewer';
import { LIMITS } from '../scene/validate';

type DragMode = 'front' | 'top' | 'side' | 'glass';

/** The drag plane follows the view: front-ish = parallel to glass; >45° from above = floor plan; side-on = side plane. */
export function dragModeFor(az: number, el: number): DragMode {
  return Math.abs(el) > 45 ? 'top' : Math.abs(Math.sin(az * D2R)) > 0.82 ? 'side' : 'front';
}

/** World-space outward normal of the glass at the point of the outline nearest (x, depth). */
function glassNormal(T: Tank, x: number, depth: number) {
  const n = nearestGlass(T, x, depth).n; return new THREE.Vector3(n[0], 0, -n[1]);
}

/** Solid (not plant) item meshes of a view, minus the ids in `skip`. */
const solids = (vp: Viewport, skip: Set<number>) => (vp.itemMeshes ?? []).filter(m => !m.userData.plant && !skip.has(m.userData.item));

/** Where a ray first meets the ground (marched through the tank) or a solid piece; null = it misses the tank floor. */
function surfaceHit(vp: Viewport, S: TankSetup, ray: THREE.Ray, skip: Set<number>): THREE.Vector3 | null {
  const T = S.tank, g = (x: number, z: number) => groundHeight(S, T, x, -z);
  const ray3 = new THREE.Raycaster(ray.origin, ray.direction), piece = ray3.intersectObjects(solids(vp, skip), false)[0]?.point;
  const box = new THREE.Box3(new THREE.Vector3(0, 0, -T.D), new THREE.Vector3(T.L, T.H * 2, 0)), start = ray.intersectBox(box, new THREE.Vector3());
  let ground: THREE.Vector3 | null = null;
  if (start) {
    const t0 = ray.origin.distanceTo(start), step = 3, p = new THREE.Vector3();
    for (let t = t0; t < t0 + 3 * (T.L + T.D + T.H); t += step) {
      ray.at(t, p);
      if (p.y <= g(p.x, p.z)) { // bisect between the last point above and this one
        let a = t - step, b = t;
        for (let k = 0; k < 12; k++) { const m = (a + b) / 2; ray.at(m, p); if (p.y <= g(p.x, p.z)) b = m; else a = m; }
        ground = ray.at(b, new THREE.Vector3()); break;
      }
      if (p.y < 0 || !box.containsPoint(p)) break;
    }
  }
  if (!piece) return ground;
  return !ground || ray.origin.distanceTo(piece) < ray.origin.distanceTo(ground) ? piece : ground;
}

/** Height (above the ground) of the top of whatever solid piece is under (x, depth), excluding `skip`; 0 = bare ground. */
function supportLift(vp: Viewport, S: TankSetup, x: number, depth: number, skip: Set<number>) {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, S.tank.H * 3 + 1000, -depth), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObjects(solids(vp, skip), false)[0];
  return hit ? Math.max(0, hit.point.y - groundHeight(S, S.tank, x, depth)) : 0;
}

export function attachPointer(viewer: Viewer, store: Store) {
  const canvas = viewer.canvas;
  // dragging an aquascape item: `grab` = the grabbed point relative to the piece's base, kept under the pointer while
  // the base slides over the ground and other pieces; riders = pieces resting on it, which move with it
  type Rider = { id: number; dx: number; dd: number; dy: number };
  let move: { vp: Viewport; id: number; grab: THREE.Vector3; riders: Rider[]; skip: Set<number>; moved: boolean } | null = null;
  let drag: { vp: Viewport; plane: THREE.Plane; mode: DragMode; off: THREE.Vector3; moved: boolean } | null = null;
  let orbit: { i: number; x: number; y: number; az: number; el: number } | null = null;
  // custom terrain: dragging a grid dot up/down; the height follows the pointer at the dot's on-screen scale
  let lift: { i: number; k: number; y0: number; h0: number; mmPerPx: number; moved: boolean } | null = null;

  // middle-drag: a temporary pan that eases back on release (Viewer.pan)
  let pan: { i: number; x: number; y: number } | null = null;
  canvas.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }); // no browser autoscroll
  canvas.addEventListener('pointerdown', e => {
    if (e.button === 1) {
      const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
      pan = { i: hit.vp.i, x: e.clientX, y: e.clientY }; canvas.classList.add('panning');
      return;
    }
    if (e.button !== 0) return;
    let hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
    const vi = hit.vp.i, editable = store.isEditing(vi);
    if (editable && vi !== store.scene.active) {  // show that tank in the panel first (rebuilds: the selection moves there)
      store.setActive(vi); viewer.draw();
      hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
    canvas.classList.add('dragging');
    if (editable && hit.dot != null && hit.mesh) {
      const cam = hit.vp.cam, dist = cam.position.distanceTo(hit.mesh.position);
      lift = { i: vi, k: hit.dot, y0: e.clientY, h0: store.scene.tanks[vi].terrain.h[hit.dot], mmPerPx: dist * 2 * Math.tan(cam.fov * D2R / 2) / cam.zoom / hit.vp.h, moved: false };
      viewer.terrainEdit.hot = hit.dot; viewer.rebuild();
      return;
    }
    if (editable && hit.itemId != null && hit.mesh) {
      store.selectItem(hit.itemId);
      const S = store.scene.tanks[vi], it = S.items.find(q => q.id === hit!.itemId);
      if (!it) return;
      // riders: pieces standing on this one (a stone on the pile, a fern tied to the wood); they move along with it
      const base = (q: typeof it) => groundHeight(S, S.tank, q.x, q.depth) + q.lift, riders: Rider[] = [];
      for (const q of S.items) {
        if (q.id === it.id || q.lift <= 0) continue;
        const down = new THREE.Raycaster(new THREE.Vector3(q.x, S.tank.H * 3 + 1000, -q.depth), new THREE.Vector3(0, -1, 0));
        const under = down.intersectObjects(solids(hit.vp, new Set([q.id])), false)[0];
        if (under?.object === hit.mesh) riders.push({ id: q.id, dx: q.x - it.x, dd: q.depth - it.depth, dy: base(q) - base(it) });
      }
      const at = new THREE.Raycaster(hit.ray.origin, hit.ray.direction).intersectObject(hit.mesh, false)[0]?.point ?? hit.mesh.position;
      move = { vp: hit.vp, id: it.id, grab: at.clone().sub(hit.mesh.position), riders, skip: new Set([it.id, ...riders.map(r => r.id)]), moved: false };
      return;
    }
    if (!editable || hit.fishId == null || !hit.mesh) {
      const c = store.scene.tanks[vi].camera; orbit = { i: vi, x: e.clientX, y: e.clientY, az: c.az, el: c.el }; return;
    }
    store.select(hit.fishId);
    const t = store.scene.tanks[vi], c = t.camera, f = t.fish.find(q => q.id === hit.fishId), sp = f && getSpecies(f.species);
    // the drag plane: the floor or the snail's pane for animals that cling to a surface, else it follows the view
    const surf = f?.surface ?? 'floor';
    const onGround = !!sp && !!f && (restsOnFloor(sp, surf) || (sp.kind !== 'snail' && restsOnGround(t, t.tank, sp, f.x, f.depth, fishTL(f, sp) * sp.aspect)));
    const mode: DragMode = onGround ? 'top' : sp?.kind === 'snail' ? 'glass' : dragModeFor(c.az, c.el);
    const n = mode === 'glass' ? glassNormal(t.tank, f!.x, f!.depth) : mode === 'top' ? new THREE.Vector3(0, 1, 0) : mode === 'side' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, hit.mesh.position), p = new THREE.Vector3();
    if (!hit.ray.intersectPlane(pl, p)) return;
    // a glass snail follows the pointer itself (no grab offset), since its drag plane turns with the glass under it
    drag = { vp: hit.vp, plane: pl, mode, off: mode === 'glass' ? new THREE.Vector3() : p.sub(hit.mesh.position), moved: false };
  });

  canvas.addEventListener('pointermove', e => {
    if (pan) { viewer.setPan(pan.i, e.clientX - pan.x, e.clientY - pan.y); return; }
    if (lift) {
      const l = lift, h = +clamp(l.h0 + (l.y0 - e.clientY) * l.mmPerPx, 0, store.scene.tanks[l.i].tank.H * LIMITS.terrainMax).toFixed(1);
      store.editTank(l.i, t => { t.terrain.h[l.k] = h; }, { coalesce: 'terrain' }); l.moved = true;
      return;
    }
    if (orbit) {
      const o = orbit;
      store.cam(c => {
        c.az = Math.round(((o.az - (e.clientX - o.x) * 0.4) + 540) % 360 - 180);
        c.el = Math.round(clamp(o.el + (e.clientY - o.y) * 0.4, ...LIMITS.el));
      }, o.i);
      return;
    }
    if (move) {
      const m = move, hit = viewer.hitTest(e.clientX, e.clientY); if (!hit || hit.vp !== m.vp) return;
      // the ray the base travels along: the pointer's ray, shifted back by the grab point
      const S0 = store.scene.tanks[m.vp.i], base = hit.ray.clone(); base.origin.sub(m.grab);
      const p = surfaceHit(m.vp, S0, base, m.skip); if (!p) return;
      store.editTank(m.vp.i, t => {
        const it = t.items.find(q => q.id === m.id); if (!it) return;
        it.x = p.x; it.depth = -p.z; clampItem(it, t.tank);
        it.lift = supportLift(m.vp, t, it.x, it.depth, m.skip);
        const top = groundHeight(t, t.tank, it.x, it.depth) + it.lift;
        for (const r of m.riders) {
          const q = t.items.find(z => z.id === r.id); if (!q) continue;
          q.x = it.x + r.dx; q.depth = it.depth + r.dd; clampItem(q, t.tank);
          q.lift = Math.max(0, top + r.dy - groundHeight(t, t.tank, q.x, q.depth));
        }
      }, { coalesce: 'item-drag' });
      m.moved = true;
      return;
    }
    if (!drag) return;
    const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit || hit.vp !== drag.vp) return;
    const p = new THREE.Vector3(); if (!hit.ray.intersectPlane(drag.plane, p)) return;
    p.sub(drag.off);
    const d = drag, T = d.vp.T;
    store.editTank(d.vp.i, t => {
      const f = t.fish.find(f => f.id === store.selId); if (!f) return;
      if (d.mode === 'glass') {
        // slide over the glass: onto the nearest point of the outline, then the drag plane turns to the glass there,
        // so a snail can crawl round a curved shell or a corner
        const g = nearestGlass(T, p.x, -p.z); f.x = g.x; f.depth = g.depth; f.y = clamp(p.y, 0, T.H);
        d.plane.setFromNormalAndCoplanarPoint(glassNormal(T, g.x, g.depth), new THREE.Vector3(g.x, f.y, -g.depth));
        return;
      }
      if (d.mode !== 'side') f.x = clamp(p.x, 0, T.L);
      if (d.mode !== 'top') f.y = clamp(p.y, 0, T.H);
      if (d.mode !== 'front') f.depth = clamp(-p.z, 0, T.D);
      const q = clampIn(T, f.x, f.depth); f.x = q.x; f.depth = q.depth;
    }, { coalesce: 'drag' });
    d.moved = true;
  });

  const end = (e: PointerEvent) => {
    if (pan) { pan = null; viewer.releasePan(); canvas.classList.remove('panning'); return; }
    // a plain click on empty space (no orbit drag) clears the selection, so nothing is highlighted
    if (orbit && e.type === 'pointerup' && Math.hypot(e.clientX - orbit.x, e.clientY - orbit.y) < 4) store.select(null);
    if (drag?.moved || orbit || lift?.moved || move?.moved) store.seal();
    if (lift) { viewer.terrainEdit.hot = null; viewer.rebuild(); }
    drag = orbit = lift = move = null; canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener('dblclick', e => {
    const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit || hit.fishId != null || hit.itemId != null) return;
    store.cam(c => Object.assign(c, { az: 0, el: 0, zoom: 1 }), hit.vp.i);
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!e.shiftKey) {
      const hit = viewer.hitTest(e.clientX, e.clientY);
      // zoom the view under the pointer
      store.cam(c => { c.zoom = +clamp(c.zoom * (e.deltaY > 0 ? 1 / 1.1 : 1.1), ...LIMITS.zoom).toFixed(2); }, hit?.vp.i ?? store.scene.active);
      return;
    }
    const dir = Math.sign(e.deltaY || e.deltaX);
    if (store.selectedItem) { // turn the selected piece 15° a notch
      const id = store.selItem;
      store.edit(t => { const it = t.items.find(q => q.id === id); if (it) { it.yaw = it.yaw + dir * 15; clampItem(it, t.tank); } }, { coalesce: 'wheel-turn' });
      return;
    }
    if (!store.selected) return;
    store.edit(t => {
      const f = t.fish.find(f => f.id === store.selId)!;
      if (f.surface === 'glass') return; // on the glass: depth is set by where on the glass it is
      f.depth = clamp(f.depth + dir * t.tank.D * 0.03, 0, t.tank.D);
      const q = clampIn(t.tank, f.x, f.depth); f.x = q.x; f.depth = q.depth;
    }, { coalesce: 'wheel-depth' });
  }, { passive: false });
}
