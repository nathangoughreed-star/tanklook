// Pointer: click a fish card to select it and drag it; drag empty space to orbit (about the point under the pointer); wheel zooms (FOV only) toward the
// pointer; shift + wheel moves the selected fish forward/back; click empty space to deselect; double-click it for straight-on.
// Middle-drag pans the picture and it stays panned; double middle-click, Home or the Re-centre button eases it back.
// With split tanks, a view whose "Edit" box is ticked takes fish and terrain drags (that tank only) and pressing in it
// shows it in the panel; an unticked view only orbits, zooms and pans. Bottom dwellers and floor snails slide along the
// floor, climbing onto a rock or wood if the species clings to hardscape; snails and plecos on glass slide over the glass
// (round corners and curved shells).
// Aquascape items (rocks, wood, caves, plants) go where the pointer meets the ground or another piece, and rest on
// whatever is under them there; anything resting on the dragged piece rides along. Shift + wheel turns the selected piece.
// Groups (lane MS): shift / ctrl / cmd + click, or a tap while the Multi button is on, adds an animal or piece to the selection or takes
// it out; shift + drag on empty water, or any drag there in Multi mode, draws a box that adds what it covers. Dragging or turning one
// member of a group of two or more moves or turns them all, the layout between them kept.
// Pieces take presses only while their menu (Hardscape, or Plants for plants and corals) is open, animals only while the Animals menu is.
import * as THREE from 'three';
import { clingsTo, fishTL, getSpecies, leafUp, restsOnFloor, speciesOf } from '../data/species';
import { restsOnGround } from '../scene/water';
import { D2R, backdropDepth, clamp, clampFish } from '../scene/physics';
import { clampItem } from '../scene/items';
import { glassFrame, nearestGlass } from '../scene/shape';
import { coralSeat, leafProbe, underProbe } from '../render/items';
import { dragPool, groundHeight, type PoolPart } from '../scene/terrain';
import type { Store } from '../scene/store';
import type { ItemKind, Tank, TankSetup } from '../scene/types';
import type { Viewer, Viewport } from '../render/viewer';
import { LIMITS } from '../scene/validate';
import { groupSize, moveGroup, settleFish, turnGroup, type Group } from '../scene/duplicate';
import { gearGrab, gearLean, gearMove, type GearDrag } from './gearDrag';
import { MAX_PATCHES, addArea, placeSingle, erasable, erasePatches, extendPath, newPatch, patchAt } from '../scene/brush';

type DragMode = 'front' | 'top' | 'side' | 'glass';

/** The drag plane follows the view: front-ish = parallel to glass; >45° from above = floor plan; side-on = side plane. */
export function dragModeFor(az: number, el: number): DragMode {
  return Math.abs(el) > 45 ? 'top' : Math.abs(Math.sin(az * D2R)) > 0.82 ? 'side' : 'front';
}

/** World-space outward normal of the glass at height y nearest (x, depth); tilted on a bowl, so the drag plane lies on the sphere. */
function glassNormal(T: Tank, x: number, depth: number, y: number) {
  const n = glassFrame(T, x, depth, y).n; return new THREE.Vector3(n[0], n[1], -n[2]);
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
    const t0 = ray.origin.distanceTo(start) + 0.01, step = 3, p = new THREE.Vector3(); // (just inside: on the box face it can read as outside)
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

/** Views within this many degrees of level drag aquascape pieces on an upright plane (see `move.wall`). */
export const EDGE_ON_EL = 20;

/** The upright plane through `at` facing the camera horizontally, if the view is near edge-on (|el| < EDGE_ON_EL). */
export function wallPlane(cam: THREE.Camera, el: number, at: THREE.Vector3): THREE.Plane | null {
  if (Math.abs(el) >= EDGE_ON_EL) return null;
  const n = cam.getWorldDirection(new THREE.Vector3()).setY(0);
  return n.lengthSq() < 1e-9 ? null : new THREE.Plane().setFromNormalAndCoplanarPoint(n.normalize(), at);
}

/** Height (above the ground) of the top of whatever solid piece is under (x, depth), excluding `skip`; 0 = bare ground. */
export function supportLift(vp: Viewport, S: TankSetup, x: number, depth: number, skip: Set<number>) {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, S.tank.H * 3 + 1000, -depth), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObjects(solids(vp, skip), false)[0];
  return hit ? Math.max(0, hit.point.y - groundHeight(S, S.tank, x, depth)) : 0;
}

/** Where a piece or an animal dragged in from the panel would land under the pointer (Nathan 2026-10-15): the view's
 *  tank (one being edited), the ground or the solid piece there (minus `skip`), and the lift above the ground that
 *  rests it on that piece. Null = not over a tank's floor. */
export function placeAt(viewer: Viewer, store: Store, clientX: number, clientY: number, skip = new Set<number>()) {
  const hit = viewer.hitTest(clientX, clientY); if (!hit || !store.isEditing(hit.vp.i)) return null;
  const S = store.scene.tanks[hit.vp.i], p = surfaceHit(hit.vp, S, hit.ray, skip); if (!p) return null;
  const x = p.x, depth = -p.z;
  return { vi: hit.vp.i, x, depth, lift: supportLift(hit.vp, S, x, depth, skip) };
}
export type PlaceAt = NonNullable<ReturnType<typeof placeAt>>;

/** Animals and pieces whose middle lies inside the dragged rectangle (client coordinates) of a view: the box select. */
function boxPickIn(viewer: Viewer, store: Store, vp: Viewport, x0: number, y0: number, x1: number, y1: number): Group {
  const r = viewer.host.getBoundingClientRect(), S = store.scene.tanks[vp.i], g: Group = { fish: [], items: [] };
  const lx = Math.min(x0, x1) - r.left, hx = Math.max(x0, x1) - r.left, ly = Math.min(y0, y1) - r.top, hy = Math.max(y0, y1) - r.top;
  const c = new THREE.Vector3(), inside = (m: THREE.Mesh) => {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    c.copy(m.geometry.boundingBox!.getCenter(new THREE.Vector3())).applyMatrix4(m.matrixWorld).project(vp.cam);
    const px = vp.x + (c.x + 1) / 2 * vp.w, py = vp.y + (1 - c.y) / 2 * vp.h;
    return c.z < 1 && px >= lx && px <= hx && py >= ly && py <= hy;
  };
  for (const m of vp.fishMeshes ?? []) { const id = m.userData.id as number | undefined; if (id != null && !g.fish.includes(id) && inside(m)) g.fish.push(id); }
  for (const m of vp.itemMeshes ?? []) {
    const id = m.userData.item as number | undefined, it = id != null ? S.items.find(q => q.id === id) : undefined;
    if (it && !g.items.includes(id!) && inside(m)) g.items.push(id!);
  }
  return g;
}

/** `canPick`: whether aquascape pieces (of this kind) / animals can be picked and dragged now (only while their menu,
 *  Hardscape / Plants / Animals, is open); otherwise a press on one orbits like empty space. */
export function attachPointer(viewer: Viewer, store: Store, canPick: (what: 'items' | 'fish', kind?: ItemKind) => boolean = () => true) {
  const canvas = viewer.canvas;
  const boxPick = (vp: Viewport, x0: number, y0: number, x1: number, y1: number) => boxPickIn(viewer, store, vp, x0, y0, x1, y1);
  // dragging an aquascape item: `grab` = the grabbed point relative to the piece's base, kept under the pointer while
  // the base slides over the ground and other pieces; riders = pieces resting on it, which move with it
  type Rider = { id: number; dx: number; dd: number; dy: number };
  // `coral` = a coral: it never floats, and wherever it is let go it rests on the rock under the pointer (coralSeat), or the ground;
  // `float` = the piece was placed off any surface (the Move buttons / arrow keys): it slides level at its height instead;
  // `wall` = the view is near edge-on, so the pointer's ray grazes the floor: the piece slides across on an upright plane
  // facing the eye (left / right, depth kept) and rests on whatever is under it (audit #3)
  let box: { vp: Viewport; x: number; y: number; moved: boolean } | null = null;
  const boxEl = document.createElement('div'); boxEl.className = 'selbox'; boxEl.hidden = true; viewer.host.appendChild(boxEl);
  type FishRider = { id: number; dx: number; dd: number; dy: number };
  let move: { vp: Viewport; id: number; grab: THREE.Vector3; riders: Rider[]; fishRiders: FishRider[]; skip: Set<number>; float: THREE.Plane | null; wall: THREE.Plane | null; coral: boolean; moved: boolean } | null = null;
  let drag: { vp: Viewport; plane: THREE.Plane; mode: DragMode; off: THREE.Vector3; moved: boolean } | null = null;
  let orbit: { i: number; x: number; y: number; az: number; el: number } | null = null;
  let gear: GearDrag | null = null; // a piece of tech gear being dragged along what it mounts on (lane TG, interact/gearDrag.ts)
  // custom terrain: dragging a grid dot up/down; the height follows the pointer at the dot's on-screen scale
  let lift: { i: number; k: number; y0: number; h0: number; mmPerPx: number; moved: boolean } | null = null;
  /** A pool handle being dragged (Pools tool): across the level of the handle where it was grabbed. */
  let pool: { i: number; k: number; part: PoolPart; plane: THREE.Plane; moved: boolean } | null = null;
  // scatter brush (lane SB): a stroke in progress (paint: the patch it extends; erase: cuts); a held patch being dragged (Multi mode)
  let stroke: { vi: number; id: number | null; erase: boolean } | null = null;
  let pdrag: { vi: number; x: number; d: number; moved: boolean } | null = null;
  let patchPick: number | null = null; // a plain click on painted ground selects that patch (on release, unless it turned the view)
  const brushAt = (clientX: number, clientY: number) => {
    if (!stroke) return;
    const pl = placeAt(viewer, store, clientX, clientY); if (!pl || pl.vi !== stroke.vi) return;
    const B = store.brush, st = stroke, S = store.scene.tanks[st.vi];
    if (st.erase) { if (erasable(S, pl.x, pl.depth, B.size, B.target)) store.update(sc => { erasePatches(sc.tanks[st.vi], pl.x, pl.depth, B.size, B.target); }, { coalesce: 'brush-erase' }); return; }
    if (B.single && B.target == null) { // one thing per click
      if (st.id === -1) return; st.id = -1;
      store.update(sc => { placeSingle(sc.tanks[st.vi], B.id, B.leaf, pl.x, pl.depth, 1 + Math.floor(Math.random() * 999999)); }, { coalesce: 'brush-single' }); return;
    }
    if (B.target != null) { // adding area to the patch being edited
      if (!S.patches?.some(v => v.id === B.target)) return;
      store.update(sc => { const q = sc.tanks[st.vi].patches?.find(v => v.id === B.target); if (q) addArea(q, pl.x, pl.depth); }, { coalesce: 'brush-stroke' }); return;
    }
    store.update(sc => {
      const t = sc.tanks[st.vi]; let q = st.id != null ? t.patches?.find(v => v.id === st.id) : undefined;
      if (!q) { if ((t.patches?.length ?? 0) >= MAX_PATCHES) return; q = newPatch(t, B.id, B.size, B.density, 1 + Math.floor(Math.random() * 999999), B.leaf); (t.patches ??= []).push(q); st.id = q.id; }
      extendPath(q, pl.x, pl.depth);
    }, { coalesce: 'brush-stroke' });
  };

  // touch (audit #6): two fingers on a view pinch to zoom and move together to pan, toward the point between them; a
  // second finger while a fish, piece or terrain dot is being dragged is ignored. `first` = the finger that started the
  // gesture: only its lifting ends a drag.
  const touches = new Map<number, { x: number; y: number }>();
  let first: number | null = null;
  let pinch: { i: number; d0: number; z0: number; mid: { x: number; y: number } } | null = null;
  const fingers = () => [...touches.values()];
  const midOf = (a: { x: number; y: number }[]) => ({ x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 });

  // middle-drag: a pan that stays (Viewer.pans); a double middle-click re-centres
  let pan: { i: number; x: number; y: number } | null = null;
  let lastMid = { t: 0, x: 0, y: 0 };
  canvas.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }); // no browser autoscroll
  canvas.addEventListener('pointerdown', e => {
    if (e.button === 1) {
      const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
      e.preventDefault();
      const dbl = e.timeStamp - lastMid.t < 400 && Math.hypot(e.clientX - lastMid.x, e.clientY - lastMid.y) < 6;
      lastMid = dbl ? { t: 0, x: 0, y: 0 } : { t: e.timeStamp, x: e.clientX, y: e.clientY };
      if (dbl) { viewer.resetPan(); return; }
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
      const p0 = viewer.pans[hit.vp.i];
      pan = { i: hit.vp.i, x: e.clientX - p0.x, y: e.clientY - p0.y }; canvas.classList.add('panning');
      return;
    }
    if (e.button !== 0) return;
    if (e.pointerType === 'touch') {
      if (pinch || touches.size >= 2) return;
      if (touches.size === 1) { // the second finger: a pinch, unless something is being dragged
        if (drag || move || lift || stroke || pdrag) return;
        const hit0 = viewer.hitTest(e.clientX, e.clientY); if (!hit0) return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        try { canvas.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
        if (orbit) { const o = orbit; store.cam(c => { c.az = o.az; c.el = o.el; }, o.i); orbit = null; viewer.unpinOrbit(); } // undo the first finger's turn
        const f = fingers(), i = hit0.vp.i;
        pinch = { i, d0: Math.max(10, Math.hypot(f[0].x - f[1].x, f[0].y - f[1].y)), z0: store.scene.tanks[i].camera.zoom, mid: midOf(f) };
        return;
      }
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); first = e.pointerId;
    }
    patchPick = null;
    let hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
    const vi = hit.vp.i, editable = store.isEditing(vi);
    if (editable && vi !== store.scene.active) {  // show that tank in the panel first (rebuilds: the selection moves there)
      store.setActive(vi); viewer.draw();
      hit = viewer.hitTest(e.clientX, e.clientY); if (!hit) return;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
    // group select: modifier or Multi mode; a piece or animal toggles, empty water starts a box
    if (editable && hit.dot == null && !hit.pool && (e.shiftKey || e.ctrlKey || e.metaKey || store.multi)) {
      const it = hit.itemId != null ? store.scene.tanks[vi].items.find(q => q.id === hit!.itemId) : undefined;
      if (it) { store.toggle('item', it.id); return; } // (a group takes anything, whichever menu is open)
      if (hit.fishId != null) { store.toggle('fish', hit.fishId); return; }
      const pl = placeAt(viewer, store, e.clientX, e.clientY), pa = pl ? patchAt(store.scene.tanks[vi], pl.x, pl.depth) : null;
      if (pa) { // a painted patch: tap toggles it; dragging a selected one moves the whole selection
        if (store.group.patches?.includes(pa.id) && pl) { pdrag = { vi, x: pl.x, d: pl.depth, moved: false }; canvas.classList.add('dragging'); return; }
        store.togglePatch(pa.id); return;
      }
      box = { vp: hit.vp, x: e.clientX, y: e.clientY, moved: false }; return;
    }
    // scatter brush: paint or erase along the drag (a touch finger paints too; two fingers still pinch)
    if (editable && store.brush.on && !e.altKey && hit.dot == null && !hit.pool) { // (Alt held: orbit as usual)
      stroke = { vi, id: null, erase: store.brush.erase }; canvas.classList.add('dragging'); brushAt(e.clientX, e.clientY); return;
    }
    if (editable && hit.itemId == null && hit.fishId == null && hit.dot == null && !hit.pool && !store.brush.on) { const pl = placeAt(viewer, store, e.clientX, e.clientY); patchPick = pl ? patchAt(store.scene.tanks[vi], pl.x, pl.depth)?.id ?? null : null; }
    canvas.classList.add('dragging');
    if (editable && hit.pool && hit.mesh) {
      pool = { i: vi, ...hit.pool, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -hit.mesh.position.y), moved: false };
      viewer.terrainEdit.pool = hit.pool.k; viewer.terrainEdit.poolHot = hit.pool; viewer.rebuild();
      store.update(() => {}, { kind: 'select', history: false }); // the panel shows the grabbed pool
      return;
    }
    if (editable && hit.dot != null && hit.mesh) {
      const cam = hit.vp.cam, dist = cam.position.distanceTo(hit.mesh.position);
      lift = { i: vi, k: hit.dot, y0: e.clientY, h0: store.scene.tanks[vi].terrain.h[hit.dot], mmPerPx: dist * 2 * Math.tan(cam.fov * D2R / 2) / cam.zoom / hit.vp.h, moved: false };
      viewer.terrainEdit.hot = hit.dot; viewer.rebuild();
      return;
    }
    if (editable && hit.dot == null && !hit.pool && (gear = gearGrab(hit))) return;
    if (editable && hit.itemId != null && hit.mesh && (canPick('items', store.scene.tanks[vi].items.find(q => q.id === hit!.itemId)?.kind ?? 'stone') || (store.groupCount > 1 && store.inGroup('item', hit.itemId)))) {
      const inGroup = store.groupCount > 1 && store.inGroup('item', hit.itemId);
      if (inGroup) store.lead('item', hit.itemId); else store.selectItem(hit.itemId);
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
      // the rest of the group goes along at its place relative to this piece (kept at its height above the ground)
      const fishRiders: FishRider[] = [];
      if (inGroup) {
        const grp = store.group;
        for (const id of grp.items) {
          const q = S.items.find(z => z.id === id); if (!q || q.id === it.id || riders.some(r => r.id === id)) continue;
          riders.push({ id, dx: q.x - it.x, dd: q.depth - it.depth, dy: base(q) - base(it) });
        }
        for (const id of grp.fish) { const f = S.fish.find(z => z.id === id); if (f) fishRiders.push({ id, dx: f.x - it.x, dd: f.depth - it.depth, dy: f.y - base(it) }); }
      }
      const at = new THREE.Raycaster(hit.ray.origin, hit.ray.direction).intersectObject(hit.mesh, false)[0]?.point ?? hit.mesh.position;
      const skip = new Set([it.id, ...riders.map(r => r.id)]);
      const coral = it.kind === 'coral', float = !coral && Math.abs(it.lift - supportLift(hit.vp, S, it.x, it.depth, skip)) > 2 ? new THREE.Plane(new THREE.Vector3(0, 1, 0), -at.y) : null;
      move = { vp: hit.vp, id: it.id, grab: at.clone().sub(hit.mesh.position), riders, fishRiders, skip, float, wall: wallPlane(hit.vp.cam, S.camera.el, at), coral, moved: false };
      return;
    }
    if (!editable || hit.fishId == null || !hit.mesh || !(canPick('fish') || (store.groupCount > 1 && store.inGroup('fish', hit.fishId)))) {
      const c = store.scene.tanks[vi].camera; orbit = { i: vi, x: e.clientX, y: e.clientY, az: c.az, el: c.el };
      viewer.pinOrbit(e.clientX, e.clientY); return; // turn about what is under the pointer
    }
    if (store.groupCount > 1 && store.inGroup('fish', hit.fishId)) store.lead('fish', hit.fishId); else store.select(hit.fishId);
    const t = store.scene.tanks[vi], c = t.camera, f = t.fish.find(q => q.id === hit.fishId), sp = f && speciesOf(f);
    // the drag plane: the floor or the snail's pane for animals that cling to a surface, else it follows the view
    const surf = f?.surface ?? 'floor';
    const onGround = !!sp && !!f && (restsOnFloor(sp, surf) || (sp.kind !== 'snail' && restsOnGround(t, t.tank, sp, f.x, f.depth, fishTL(f, sp) * sp.aspect)));
    const mode: DragMode = surf === 'glass' ? 'glass' : onGround ? 'top' : dragModeFor(c.az, c.el);
    const n = mode === 'glass' ? glassNormal(t.tank, f!.x, f!.depth, f!.y) : mode === 'top' ? new THREE.Vector3(0, 1, 0) : mode === 'side' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, hit.mesh.position), p = new THREE.Vector3();
    if (!hit.ray.intersectPlane(pl, p)) return;
    // an animal on the glass follows the pointer itself (no grab offset), since its drag plane turns with the glass under it
    drag = { vp: hit.vp, plane: pl, mode, off: mode === 'glass' ? new THREE.Vector3() : p.sub(hit.mesh.position), moved: false };
  });

  canvas.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) {
      if (touches.size < 2) return;
      const p = pinch, f = fingers(), mid = midOf(f);
      const z = +clamp(p.z0 * Math.hypot(f[0].x - f[1].x, f[0].y - f[1].y) / p.d0, ...LIMITS.zoom).toFixed(2);
      viewer.zoomAt(p.i, mid.x, mid.y, p.mid.x, p.mid.y); p.mid = mid;
      if (z !== store.scene.tanks[p.i].camera.zoom) store.cam(c => { c.zoom = z; }, p.i); else viewer.draw();
      return;
    }
    if (e.pointerType === 'touch' && first != null && e.pointerId !== first) return;
    if (pan) { viewer.setPan(pan.i, e.clientX - pan.x, e.clientY - pan.y); return; }
    if (stroke) { brushAt(e.clientX, e.clientY); return; }
    if (pdrag) {
      const pl = placeAt(viewer, store, e.clientX, e.clientY), g = store.group, pd = pdrag; if (!pl || pl.vi !== pd.vi) return;
      const dx = pl.x - pd.x, dd = pl.depth - pd.d; if (!dx && !dd) return;
      store.edit(t => moveGroup(t, g, dx, dd), { coalesce: 'drag' }); pd.x = pl.x; pd.d = pl.depth; pd.moved = true; return;
    }
    if (box) {
      if (!box.moved && Math.hypot(e.clientX - box.x, e.clientY - box.y) < 4) return;
      box.moved = true;
      const r = viewer.host.getBoundingClientRect();
      Object.assign(boxEl.style, { left: Math.min(box.x, e.clientX) - r.left + 'px', top: Math.min(box.y, e.clientY) - r.top + 'px', width: Math.abs(e.clientX - box.x) + 'px', height: Math.abs(e.clientY - box.y) + 'px' });
      boxEl.hidden = false;
      return;
    }
    if (pool) {
      const P = pool, hit = viewer.hitTest(e.clientX, e.clientY), at = hit && hit.vp.i === P.i ? hit.ray.intersectPlane(P.plane, new THREE.Vector3()) : null;
      if (!at) return;
      store.editTank(P.i, t => {
        const ps = t.terrain.pools; if (!ps?.[P.k]) return;
        ps[P.k] = dragPool(ps[P.k], P.part, at.x / t.tank.L, -at.z / t.tank.D);
      }, { coalesce: 'pool' }); P.moved = true;
      return;
    }
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
    if (gear) { gearMove(viewer, store, gear, e.clientX, e.clientY); return; }
    if (move) {
      const m = move, hit = viewer.hitTest(e.clientX, e.clientY); if (!hit || hit.vp !== m.vp) return;
      // the ray the base travels along: the pointer's ray, shifted back by the grab point
      const S0 = store.scene.tanks[m.vp.i], base = hit.ray.clone(); base.origin.sub(m.grab);
      const plane = m.wall ?? m.float;
      const p = plane ? hit.ray.intersectPlane(plane, new THREE.Vector3())?.sub(m.grab) : surfaceHit(m.vp, S0, base, m.skip); if (!p) return;
      store.editTank(m.vp.i, t => {
        const it = t.items.find(q => q.id === m.id); if (!it) return;
        const y = groundHeight(t, t.tank, it.x, it.depth) + it.lift;
        it.x = p.x; it.depth = -p.z; clampItem(it, t.tank, t);
        // a coral seats on the rock (never on coral) at the point the pointer is on, so a ledge under a higher rock stays a ledge
        it.lift = m.coral ? coralSeat(t, it, solids(m.vp, m.skip).filter(o => !o.userData.coral), p.y + 1)
          : m.float ? y - groundHeight(t, t.tank, it.x, it.depth) : supportLift(m.vp, t, it.x, it.depth, m.skip);
        const top = groundHeight(t, t.tank, it.x, it.depth) + it.lift;
        for (const r of m.riders) {
          const q = t.items.find(z => z.id === r.id); if (!q) continue;
          q.x = it.x + r.dx; q.depth = it.depth + r.dd; clampItem(q, t.tank, t);
          q.lift = Math.max(0, top + r.dy - groundHeight(t, t.tank, q.x, q.depth));
        }
        for (const r of m.fishRiders) {
          const f = t.fish.find(z => z.id === r.id); if (!f) continue;
          f.x = it.x + r.dx; f.depth = it.depth + r.dd; f.y = top + r.dy; settleFish(t, f);
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
      const x0 = f.x, y0 = f.y, d0 = f.depth;
      if (d.mode === 'glass') {
        // slide over the glass: onto the nearest point of the outline, then the drag plane turns to the glass there,
        // so a snail can crawl round a curved shell or a corner
        f.y = clamp(p.y, 0, T.H); const g = nearestGlass(T, p.x, -p.z, f.y); f.x = g.x; f.depth = g.depth;
        d.plane.setFromNormalAndCoplanarPoint(glassNormal(T, g.x, g.depth, f.y), new THREE.Vector3(g.x, f.y, -g.depth));
        return;
      }
      if (d.mode !== 'side') f.x = clamp(p.x, 0, T.L);
      if (d.mode !== 'top') f.y = clamp(p.y, 0, T.H);
      if (d.mode !== 'front') f.depth = clamp(-p.z, 0, T.D);
      clampFish(f, T, backdropDepth(t.backdrop, T), t.render.bgSides);
      // over a rock, wood or cave it climbs on top (if it can), off it back down to the floor
      const sp = getSpecies(f.species);
      if (d.mode === 'top' && sp && clingsTo(sp, 'hardscape')) {
        // ... or onto a broad plant leaf, for the animals that sit on those
        const up = leafUp(sp), leaf = up > 0 && leafProbe(T, (d.vp.itemMeshes ?? []).filter(m => m.userData.plant), (x, dp) => groundHeight(t, t.tank, x, dp))(f.x, f.depth, up);
        f.surface = supportLift(d.vp, t, f.x, f.depth, new Set()) > 0 || leaf ? 'hardscape' : 'floor';
      }
      // dragged in a side or front view to just under a broad leaf: it clings there (a clinger that hangs); off it again: the floor
      if (sp && clingsTo(sp, 'under') && d.mode !== 'top') {
        const up = leafUp(sp), u = up > 0 ? underProbe((d.vp.itemMeshes ?? []).filter(m => m.userData.plant), solids(d.vp, new Set()).filter(m => !m.userData.coral), (x, dp) => groundHeight(t, t.tank, x, dp))(f.x, f.depth, f.y, up) : null;
        if (u && Math.abs(u.y - f.y) < Math.max(30, (sp.tl ?? 0))) { f.surface = 'under'; f.y = u.y; } else if (f.surface === 'under') f.surface = 'floor';
      }
      // the rest of the group moves by the same amount
      const rest = store.group; rest.fish = rest.fish.filter(id => id !== f.id);
      if (groupSize(rest)) moveGroup(t, rest, f.x - x0, f.depth - d0, f.y - y0);
    }, { coalesce: 'drag' });
    d.moved = true;
  });

  const end = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      touches.delete(e.pointerId);
      if (pinch) { if (!touches.size) { pinch = null; first = null; } return; } // lifting the last finger ends it
      if (first != null && e.pointerId !== first) return; // an ignored second finger
      first = null;
    }
    if (pan) { pan = null; canvas.classList.remove('panning'); return; }
    if (gear) { if (gear.moved) store.seal(); gear = null; canvas.classList.remove('dragging'); return; }
    if (stroke || pdrag) { stroke = null; pdrag = null; store.seal(); canvas.classList.remove('dragging'); return; }
    if (box) {
      const b = box; box = null; boxEl.hidden = true;
      if (b.moved && e.type === 'pointerup') store.addToGroup(boxPick(b.vp, b.x, b.y, e.clientX, e.clientY));
      return;
    }
    // a plain click on empty space (no orbit drag) clears the selection, so nothing is highlighted
    if (orbit && e.type === 'pointerup' && Math.hypot(e.clientX - orbit.x, e.clientY - orbit.y) < 4) { if (patchPick != null) store.selectPatch(patchPick); else store.select(null); }
    if (drag?.moved || orbit || lift?.moved || move?.moved || pool?.moved) store.seal();
    if (lift) { viewer.terrainEdit.hot = null; viewer.rebuild(); }
    if (pool) { viewer.terrainEdit.poolHot = null; viewer.rebuild(); }
    drag = orbit = lift = move = pool = null; viewer.unpinOrbit(); canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener('dblclick', e => {
    const hit = viewer.hitTest(e.clientX, e.clientY); if (!hit || hit.fishId != null || hit.itemId != null) return;
    store.cam(c => Object.assign(c, { az: 0, el: 0, zoom: 1 }), hit.vp.i);
    viewer.resetPan(); // the whole default view, now that zooming pans
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!e.shiftKey) {
      const hit = viewer.hitTest(e.clientX, e.clientY);
      // zoom the view under the pointer, toward the point under it
      const i = hit?.vp.i ?? store.scene.active, c0 = store.scene.tanks[i]?.camera.zoom;
      const z = c0 == null ? null : +clamp(c0 * (e.deltaY > 0 ? 1 / 1.1 : 1.1), ...LIMITS.zoom).toFixed(2);
      if (z == null || z === c0) return;
      if (hit) viewer.zoomAt(i, e.clientX, e.clientY);
      store.cam(c => { c.zoom = z; }, i);
      return;
    }
    const dir = Math.sign(e.deltaY || e.deltaX);
    if (gearLean(viewer, store, e.clientX, e.clientY, dir)) return; // Shift + wheel over a heater leans it (lane TG)
    if (store.groupCount > 1) { // turn the whole group 15° a notch about its centre
      const g = store.group;
      store.edit(t => turnGroup(t, g, dir * 15), { coalesce: 'wheel-turn' });
      return;
    }
    if (store.selectedItem) { // turn the selected piece 15° a notch
      const id = store.selItem;
      store.edit(t => { const it = t.items.find(q => q.id === id); if (it) { it.yaw = it.yaw + dir * 15; clampItem(it, t.tank, t); } }, { coalesce: 'wheel-turn' });
      return;
    }
    if (!store.selected) return;
    store.edit(t => {
      const f = t.fish.find(f => f.id === store.selId)!;
      if (f.surface === 'glass') return; // on the glass: depth is set by where on the glass it is
      f.depth = clamp(f.depth + dir * t.tank.D * 0.03, 0, t.tank.D);
      clampFish(f, t.tank, backdropDepth(t.backdrop, t.tank), t.render.bgSides);
    }, { coalesce: 'wheel-depth' });
  }, { passive: false });
}
