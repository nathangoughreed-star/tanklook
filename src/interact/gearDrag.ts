// Dragging the tech gear (lane TG, Nathan 2026-10-19: "let them be moveable by the user, gated to where makes sense"):
// a piece moves along what it mounts on. Glass gear (heaters, internal filters, CO2 diffusers, UV, powerheads) goes
// anywhere on the back or a side glass at any height; rim gear (HOB filters and skimmers, the canister's pipes, the
// overflow box, the ATO sensor) slides along the rim of a wall; floor gear (sponge filter, airstone) goes anywhere on
// the floor. The spot is saved in TechSetup.place[row] as shares of the wall (scene/tech.ts), so a resize keeps it.
import * as THREE from 'three';
import { backdropDepth, clamp, waterY } from '../scene/physics';
import { groundHeight } from '../scene/terrain';
import { inferTech, type GearPlace } from '../scene/tech';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import type { Viewer, Viewport } from '../render/viewer';
import { gearShown, type GearMount, type GearPiece } from '../render/gear3d';

/** A piece being dragged: its tank, tech row and mount, and whether it has moved. */
export interface GearDrag { vi: number; row: string; mount: GearMount; moved: boolean }
type Hit = { vp: Viewport; ray: THREE.Ray; mesh?: THREE.Mesh };

/** The gear piece under the pointer, nearer than the fish or piece the hit test found; null when there is none. */
export function gearGrab(hit: Hit): GearDrag | null {
  if (!gearShown() || !hit.vp.scene) return null;
  const pieces = hit.vp.scene.children.flatMap(o => (o.userData.gearPieces ?? []) as GearPiece[]);
  // the boxes are loose (a HOB's holds its body behind the glass), so of the pieces under the pointer the smallest wins:
  // the heater standing in front of the HOB's box is the heater
  let best: { p: GearPiece; d: number; vol: number } | null = null; const v = new THREE.Vector3(), sz = new THREE.Vector3();
  for (const p of pieces) {
    if (p.mount === 'fixed') continue;
    const at = hit.ray.intersectBox(p.box.clone().expandByScalar(4), v);
    if (!at) continue;
    const d = at.distanceTo(hit.ray.origin), vol = p.box.getSize(sz).x * sz.y * sz.z;
    if (!best || vol < best.vol) best = { p, d, vol };
  }
  if (!best) return null;
  // a fish or a rock in front of the gear wins (its own hit point, along the same ray); a plant does not: its cards are
  // mostly see-through, and the viewer's own hit test ranks plants below everything else too
  const other = hit.mesh && !hit.mesh.userData.plant ? new THREE.Raycaster(hit.ray.origin, hit.ray.direction).intersectObject(hit.mesh, false)[0] : undefined;
  if (other && other.distance < best.d - 5) return null;
  return { vi: hit.vp.i, row: best.p.row, mount: best.p.mount, moved: false };
}

/** Where the pointer's ray puts a piece with this mount in tank S (shares as TechSetup.place keeps them), or null. */
export function placeFor(S: TankSetup, ray: THREE.Ray, mount: GearMount, prev?: GearPlace): GearPlace | null {
  const T = S.tank, Db = T.D - backdropDepth(S.backdrop, T), lean = prev?.lean;
  if (mount === 'fixed') return null;
  if (mount === 'floor') {
    const y0 = groundHeight(S, T, T.L / 2, T.D / 2), p = ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0), new THREE.Vector3());
    if (!p) return null;
    return { wall: 'floor', at: clamp(p.x / T.L, 0.04, 0.96), y: clamp(-p.z / T.D, 0.06, 0.94) };
  }
  // the glass the eye looks at through the tank: where the ray leaves the water's box
  const box = new THREE.Box3(new THREE.Vector3(0, 0, -Db), new THREE.Vector3(T.L, T.H, 0)), far = ray.at(1e5, new THREE.Vector3());
  const out = new THREE.Ray(far, ray.direction.clone().negate()).intersectBox(box, new THREE.Vector3());
  if (!out) return null;
  // the floor or the front (a ray down through the water, or past the side): the nearest of the three walls it can hang on
  const dist = { back: Math.abs(out.z + Db), left: Math.abs(out.x), right: Math.abs(out.x - T.L) };
  const wall = (Object.keys(dist) as (keyof typeof dist)[]).reduce((a, b) => dist[a] <= dist[b] ? a : b);
  const at = wall === 'back' ? clamp(out.x / T.L, 0, 1) : clamp(-out.z / Db, 0, 1);
  const place: GearPlace = { wall, at };
  if (mount === 'glass') {
    const g = groundHeight(S, T, clamp(out.x, 1, T.L - 1), clamp(-out.z, 1, T.D - 1)), wy = waterY(T, S.water.level);
    place.y = clamp((out.y - g) / Math.max(1, wy - g), 0, 1);
    if (lean != null) place.lean = lean;
  }
  return place;
}

/** Follow the pointer: write the piece's new spot (coalesced into one undo step per drag). */
export function gearMove(viewer: Viewer, store: Store, g: GearDrag, clientX: number, clientY: number) {
  const hit = viewer.hitTest(clientX, clientY); if (!hit || hit.vp.i !== g.vi) return;
  const S = store.scene.tanks[g.vi], p = placeFor(S, hit.ray, g.mount, S.tech?.place?.[g.row]); if (!p) return;
  if (JSON.stringify(p) === JSON.stringify(S.tech?.place?.[g.row])) return;
  store.editTank(g.vi, t => { t.tech = withPlace(t, g.row, p); }, { coalesce: 'gear-drag' });
  g.moved = true;
}

/** t's tech with row's gear at `p` (an older file without tech gets its inferred rows, so its numbers stay the same). */
export function withPlace(t: TankSetup, row: string, p: GearPlace) {
  const tech = t.tech ?? { rows: inferTech(t).rows };
  return { ...tech, place: { ...tech.place, [row]: p } };
}

/** Shift + wheel over a heater turns it 15 degrees a notch (-90..90, 90 = lying flat; never so upright it leaves the water).
 *  Returns true when it took the wheel. */
export function gearLean(viewer: Viewer, store: Store, clientX: number, clientY: number, dir: number) {
  const hit = viewer.hitTest(clientX, clientY); if (!hit) return false;
  const g = gearGrab(hit); if (!g || g.row !== 'heater') return false;
  const S = store.scene.tanks[g.vi], prev = S.tech?.place?.[g.row];
  // not placed yet: where it is drawn now (its box's middle), then leaned
  const piece = hit.vp.scene!.children.flatMap(o => (o.userData.gearPieces ?? []) as GearPiece[]).find(p => p.row === g.row)!;
  const c = piece.box.getCenter(new THREE.Vector3()), from = prev ?? placeFor(S, new THREE.Ray(new THREE.Vector3(c.x, c.y, 5000), new THREE.Vector3(0, 0, -1)), 'glass');
  if (!from) return false;
  // from what is drawn: upright, or flat when it did not fit
  const now = from.lean ?? (piece.box.getSize(new THREE.Vector3()).y < 60 ? 90 : 0), lean = clamp(now + dir * 15, -90, 90);
  store.editTank(g.vi, t => { t.tech = withPlace(t, g.row, { ...from, lean }); }, { coalesce: 'gear-lean' });
  return true;
}
