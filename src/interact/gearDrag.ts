// Dragging the tech gear (lane TG, Nathan 2026-10-19: "let them be moveable by the user, gated to where makes sense"):
// a piece moves along what it mounts on. Glass gear (heaters, internal filters, CO2 diffusers, UV, powerheads) goes
// anywhere on the back or a side glass at any height; rim gear (HOB filters and skimmers, the canister's pipes, the
// overflow box, the ATO sensor) slides along the rim of a wall; floor gear (sponge filter, airstone) goes anywhere on
// the floor; a dry tank's lamps and misting go anywhere on the top (2026-10-21, Nathan: "slide anywhere theres surface").
// The spot is saved in TechSetup.place[row] as shares of the wall (scene/tech.ts), so a resize keeps it.
import * as THREE from 'three';
import { backdropDepth, clamp, waterY } from '../scene/physics';
import { groundHeight } from '../scene/terrain';
import { inferTech, type GearPlace } from '../scene/tech';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import type { Viewer, Viewport } from '../render/viewer';
import { gearShown, lidTop, onTop, type GearMount, type GearPiece } from '../render/gear3d';
import { cycle, piecesOf, type GearSelection } from '../render/gearSel';

/** A piece being dragged: its tank, tech row and mount, whether it has moved, and its half size along x and depth (mm;
 *  what keeps a piece on the top inside the tank's footprint). */
export interface GearDrag { vi: number; row: string; mount: GearMount; moved: boolean; half?: [number, number] }
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
  const size = best.p.box.getSize(new THREE.Vector3());
  return { vi: hit.vp.i, row: best.p.row, mount: best.p.mount, moved: false, half: [size.x / 2, size.z / 2] };
}

/** Where the pointer's ray puts a piece with this mount in tank S (shares as TechSetup.place keeps them), or null. */
export function placeFor(S: TankSetup, ray: THREE.Ray, mount: GearMount, prev?: GearPlace, half: [number, number] = [0, 0], heater = false, rim?: RimLimits): GearPlace | null {
  const T = S.tank, Db = T.D - backdropDepth(S.backdrop, T), lean = prev?.lean;
  if (mount === 'fixed') return null;
  if (mount === 'lid') {
    // the top's plane (a hood's curve: once more at the depth the first guess lands on), then held inside the footprint;
    // with no lid the spot is kept as pointed and the piece drawn on the rim nearest it (gear3d onTop)
    const top = lidTop(S, T), at = (y: number) => ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), new THREE.Vector3());
    let p = at(top.y(T.D / 2)); if (!p) return null;
    if (S.lid === 'hood') p = at(top.y(clamp(-p.z, 0, T.D))) ?? p;
    const [x, d] = top.open ? [clamp(p.x, 0, T.L), clamp(-p.z, 0, T.D)] : onTop(S, T, p.x, -p.z, half[0], half[1]);
    return { wall: 'lid', at: clamp(x / T.L, 0, 1), y: clamp(d / T.D, 0, 1) };
  }
  if (mount === 'floor') {
    const y0 = groundHeight(S, T, T.L / 2, T.D / 2), p = ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0), new THREE.Vector3());
    if (!p) return null;
    return { wall: 'floor', at: clamp(p.x / T.L, 0.04, 0.96), y: clamp(-p.z / T.D, 0.06, 0.94) };
  }
  if (mount === 'rim' && rim) {
    // lane GD1: rim gear slides along the rim of the wall it hangs on (back unless the owner moved it): the pointer's ray meets that wall's plane, and the spot is held clear
    const wall = rim.wall, pl = wall === 'back' ? new THREE.Plane(new THREE.Vector3(0, 0, 1), Db) : new THREE.Plane(new THREE.Vector3(1, 0, 0), wall === 'left' ? 0 : -T.L);
    const p = ray.intersectPlane(pl, new THREE.Vector3());
    if (p) { const len = wall === 'back' ? T.L : Db, c = clearSpot(wall === 'back' ? p.x : -p.z, rim); return { wall, at: clamp(c / len, 0, 1) }; }
  }
  // the glass the eye looks at through the tank: where the ray leaves the water's box
  const box = new THREE.Box3(new THREE.Vector3(0, 0, -Db), new THREE.Vector3(T.L, T.H, 0)), far = ray.at(1e5, new THREE.Vector3());
  const out = new THREE.Ray(far, ray.direction.clone().negate()).intersectBox(box, new THREE.Vector3());
  if (!out) return null;
  // lane GD1: the ray leaves the water through the floor (a heater lies on the substrate there) or through the front glass (seen from behind)
  if (mount === 'glass' && heater && out.y < 0.5 && T.shape !== 'bowl') return { wall: 'floor', at: clamp(out.x / T.L, 0.04, 0.96), y: clamp(-out.z / T.D, 0.06, 0.94) };
  if (mount === 'glass' && Math.abs(out.z) < 0.5 && out.y > 0.5) {
    const g = groundHeight(S, T, clamp(out.x, 1, T.L - 1), 1), wy = waterY(T, S.water.level), place: GearPlace = { wall: 'front', at: clamp(out.x / T.L, 0, 1), y: clamp((out.y - g) / Math.max(1, wy - g), 0, 1) };
    if (prev?.lean != null) place.lean = snapLean(prev.lean);
    return place;
  }
  // the floor or the front (a ray down through the water, or past the side): the nearest of the three walls it can hang on
  const dist = { back: Math.abs(out.z + Db), left: Math.abs(out.x), right: Math.abs(out.x - T.L) };
  // suction cups hold on glass only: with a 3D backdrop covering the back, glass gear snaps to a side glass (lane GM8)
  if (mount === 'glass' && backdropDepth(S.backdrop, T) > 0) dist.back = Infinity;
  const wall = (Object.keys(dist) as (keyof typeof dist)[]).reduce((a, b) => dist[a] <= dist[b] ? a : b);
  const at = wall === 'back' ? clamp(out.x / T.L, 0, 1) : clamp(-out.z / Db, 0, 1);
  const place: GearPlace = { wall, at };
  if (mount === 'glass') {
    const g = groundHeight(S, T, clamp(out.x, 1, T.L - 1), clamp(-out.z, 1, T.D - 1)), wy = waterY(T, S.water.level);
    place.y = clamp((out.y - g) / Math.max(1, wy - g), 0, 1);
    if (lean != null) place.lean = snapLean(lean); // upright, flat or the owner's Angled; nothing in between (GM8b, GD1)
  }
  return place;
}

/** Follow the pointer: write the piece's new spot (coalesced into one undo step per drag). */
export function gearMove(viewer: Viewer, store: Store, g: GearDrag, clientX: number, clientY: number) {
  const hit = viewer.hitTest(clientX, clientY); if (!hit || hit.vp.i !== g.vi) return;
  const S = store.scene.tanks[g.vi], p = placeFor(S, hit.ray, g.mount, S.tech?.place?.[g.row], g.half, g.row.split('.')[0] === 'heater', g.mount === 'rim' ? rimFor(S, g.vi, g.row, S.tech?.place?.[g.row]?.wall) : undefined); if (!p) return;
  if (JSON.stringify(p) === JSON.stringify(S.tech?.place?.[g.row])) return;
  store.editTank(g.vi, t => { t.tech = withPlace(t, g.row, p); }, { coalesce: 'gear-drag' });
  g.moved = true;
}

/** t's tech with row's gear at `p` (an older file without tech gets its inferred rows, so its numbers stay the same). */
export function withPlace(t: TankSetup, row: string, p: GearPlace) {
  const tech = t.tech ?? { rows: inferTech(t).rows };
  return { ...tech, place: { ...tech.place, [row]: p } };
}

/** Shift + wheel over a heater flips it between upright and lying flat (never diagonal).
 *  Returns true when it took the wheel. */
export function gearLean(viewer: Viewer, store: Store, clientX: number, clientY: number, _dir: number) {
  const hit = viewer.hitTest(clientX, clientY); if (!hit || viewer.pairShown) return false;
  const g = gearGrab(hit); if (!g || g.row.split('.')[0] !== 'heater') return false;
  const S = store.scene.tanks[g.vi], prev = S.tech?.place?.[g.row];
  // not placed yet: where it is drawn now (its box's middle), then leaned
  const piece = hit.vp.scene!.children.flatMap(o => (o.userData.gearPieces ?? []) as GearPiece[]).find(p => p.row === g.row)!;
  const c = piece.box.getCenter(new THREE.Vector3()), from = prev ?? placeFor(S, new THREE.Ray(new THREE.Vector3(c.x, c.y, 5000), new THREE.Vector3(0, 0, -1)), 'glass');
  if (!from) return false;
  // from what is drawn: upright, or flat when it did not fit
  const now = from.lean ?? (piece.box.getSize(new THREE.Vector3()).y < 60 ? 90 : 0), lean = Math.abs(now) >= 45 ? 0 : 90; // Shift + wheel toggles upright / flat (GM8b: no diagonals)
  store.editTank(g.vi, t => { t.tech = withPlace(t, g.row, { ...from, lean }); }, { coalesce: 'gear-lean' });
  return true;
}

// ---------- GD1: picking, orientation, nudging ----------

/** A lean snapped to the three the menu offers: 0 Vertical, +-45 Angled, +-90 Horizontal. */
export function snapLean(lean: number): number { const a = Math.abs(lean), g = Math.sign(lean) || 1; return a >= 67.5 ? g * 90 : a >= 22.5 ? g * 45 : 0; }
export type Orient = 'vertical' | 'horizontal' | 'angled';
export const orientOf = (lean: number | undefined): Orient => { const l = Math.abs(snapLean(lean ?? 0)); return l === 90 ? 'horizontal' : l === 45 ? 'angled' : 'vertical'; };
const LEAN: Record<Orient, number> = { vertical: 0, horizontal: 90, angled: 45 };
/** The spot with its heater's orientation set (the glass face and place along it stay). */
export const withOrient = (p: GearPlace, o: Orient): GearPlace => ({ ...p, lean: LEAN[o] });

/** Where a piece is drawn now as a spot (its box's middle put back on its mount), for a piece the file has no spot for yet. */
export function drawnPlace(S: TankSetup, piece: GearPiece): GearPlace | null {
  const c = piece.box.getCenter(new THREE.Vector3());
  return placeFor(S, new THREE.Ray(new THREE.Vector3(c.x, c.y, 5000), new THREE.Vector3(0, 0, -1)), piece.mount === 'rim' || piece.mount === 'glass' ? 'glass' : piece.mount);
}

/** The picked gear in the view: the piece under `hit`, with its spot as drawn. */
export function pickGear(hit: Hit, S: TankSetup): GearSelection | null {
  const g = gearGrab(hit); if (!g) return null;
  const piece = hit.vp.scene!.children.flatMap(o => (o.userData.gearPieces ?? []) as GearPiece[]).find(p => p.row === g.row);
  const from = S.tech?.place?.[g.row] ?? (piece ? drawnPlace(S, piece) ?? undefined : undefined);
  return { vi: g.vi, row: g.row, mount: g.mount, ...(from ? { from } : {}) };
}

/** `p` moved `dx` mm along its surface (right / toward the back) and `dy` mm up (a glass mount) or toward the back (floor, top);
 *  a rim piece slides along its wall only. Shares stay inside the same limits placeFor holds. */
export function nudgePlace(S: TankSetup, p: GearPlace, mount: GearMount, dx: number, dy: number, rim?: RimLimits): GearPlace {
  const T = S.tank, Db = T.D - backdropDepth(S.backdrop, T), q: GearPlace = { ...p };
  if (p.wall === 'floor') { q.at = clamp((p.at ?? 0.5) + dx / T.L, 0.04, 0.96); q.y = clamp((p.y ?? 0.8) - dy / T.D, 0.06, 0.94); return q; }
  if (p.wall === 'lid') { q.at = clamp((p.at ?? 0.5) + dx / T.L, 0, 1); q.y = clamp((p.y ?? 0.5) - dy / T.D, 0, 1); return q; }
  // along a wall: the back runs left to right, a side runs front to back (at 0 = front)
  q.at = clamp((p.at ?? 0) + (p.wall === 'back' || p.wall === 'front' ? dx / T.L : p.wall === 'left' ? dx / Db : -dx / Db), 0, 1);
  if (mount === 'glass') { const wy = waterY(T, S.water.level); q.y = clamp((p.y ?? 0.5) + dy / Math.max(1, wy), 0, 1); }
  if (mount === 'rim' && rim && rim.wall === p.wall) { const len = p.wall === 'back' ? T.L : Db; q.at = clamp(clearSpot(q.at * len, rim) / len, 0, 1); } // held clear of the corners, braces and other rim gear
  return q;
}

/** Whether this press should skip the gear and take what is behind it (the second click of a cycle). */
export function cycleSkip(hit: { vp: Viewport; itemId: number | null; fishId: number | null }, x: number, y: number): boolean {
  const l = cycle.last;
  return !!l && l.what === 'gear' && l.vi === hit.vp.i && performance.now() - l.t < 3000 && Math.hypot(x - l.x, y - l.y) < 6 && (hit.itemId != null || hit.fishId != null);
}
export const cycleNote = (vi: number, x: number, y: number, what: 'gear' | 'under') => { cycle.last = { x, y, t: performance.now(), vi, what }; };

/** The selection for a tapped row (a click target names the row without its number): the first matching piece, as drawn. */
export function pickRow(viewer: Viewer, store: Store, vi: number, row: string): GearSelection | null {
  const S = store.scene.tanks[vi], pieces = viewer.vps[vi]?.scene?.children.flatMap(o => (o.userData.gearPieces ?? []) as GearPiece[]) ?? [];
  const piece = pieces.find(p => p.row === row) ?? pieces.find(p => p.row.startsWith(row + '.')); if (!piece || !S) return null;
  const from = S.tech?.place?.[piece.row] ?? drawnPlace(S, piece) ?? undefined;
  return { vi, row: piece.row, mount: piece.mount, ...(from ? { from } : {}) };
}

// ---------- GD1: the rim ----------

/** Where rim gear may sit along the wall it hangs on (mm along the wall: x on the back, depth from the front on an end): `lo`..`hi` clear of the corners
 *  (and an eurobrace's end strips), `blocked` = spans the centre must keep a body half-width `hw` off (the brace's cross strips, other rim gear). */
export interface RimLimits { wall: 'back' | 'left' | 'right'; lo: number; hi: number; hw: number; blocked: [number, number][] }

/** The nearest centre to `c` that fits: inside the limits and off every blocked span; `c` held inside the limits when nothing is free. */
export function clearSpot(c: number, r: Pick<RimLimits, 'lo' | 'hi' | 'hw' | 'blocked'>): number {
  const ok = (x: number) => x - r.hw >= r.lo - 1e-6 && x + r.hw <= r.hi + 1e-6 && !r.blocked.some(([a, b]) => x + r.hw > a && x - r.hw < b);
  const cl = clamp(c, r.lo + r.hw, Math.max(r.lo + r.hw, r.hi - r.hw));
  if (ok(cl)) return cl;
  const cands = [r.lo + r.hw, r.hi - r.hw, ...r.blocked.flatMap(([a, b]) => [a - r.hw, b + r.hw])].filter(ok);
  return cands.length ? cands.reduce((m, x) => Math.abs(x - cl) < Math.abs(m - cl) ? x : m) : cl;
}

const RIM_GAP = 10;
/** The limits for `row` on `wall` of tank `vi`, read from the gear as drawn now (the other rim pieces) and the tank's brace. */
export function rimFor(S: TankSetup, vi: number, row: string, wall: GearPlace['wall'] | undefined): RimLimits {
  const T = S.tank, w: RimLimits['wall'] = wall === 'left' || wall === 'right' ? wall : 'back', Db = T.D - backdropDepth(S.backdrop, T), len = w === 'back' ? T.L : Db;
  const pieces = piecesOf(vi), mine = pieces.find(p => p.row === row);
  const spanOn = (b: THREE.Box3, on: string): [number, number] => on === 'back' ? [b.min.x, b.max.x] : [-b.max.z, -b.min.z], span = (b: THREE.Box3) => spanOn(b, w);
  const here = S.tech?.place?.[row]?.wall ?? 'back'; // the piece is measured on the wall it hangs on now: its width is what must fit the wall it is going to
  // the body: the core's width over the lip's share of it (hob() draws the lip 0.8 of the body wide)
  const c = mine ? spanOn(mine.core ?? mine.box, here) : [0, 0], hw = mine?.core ? Math.max(30, (c[1] - c[0]) / 2 / 0.8) : Math.max(30, (c[1] - c[0]) / 2);
  const br = S.render.brace && !S.render.rim ? S.render.brace : undefined, margin = Math.max(10, br ? br.width + 4 : 0), blocked: [number, number][] = [];
  if (br && w === 'back') {
    const n = Math.round(br.cross ?? 0), cw = br.crossWidth ?? br.width;
    for (let i = 0; i < n; i++) { const m = T.L * (i + 1) / (n + 1), a = m - cw / 2 + 0.2 * hw, b = m + cw / 2 - 0.2 * hw; blocked.push([Math.min(a, m - 1), Math.max(b, m + 1)]); } // the lip (0.8 of the body) is what meets a strip
  }
  for (const p of pieces) {
    if (p.row === row || p.mount !== 'rim') continue;
    if ((S.tech?.place?.[p.row]?.wall ?? 'back') !== w) continue;
    const [a, b] = span(p.core ?? p.box); blocked.push([a - RIM_GAP, b + RIM_GAP]);
  }
  return { wall: w, lo: margin, hi: len - margin, hw, blocked };
}

/** A rim piece moved to another wall's rim, centred as far as it can be (the menu's "Hangs on"). Null when it cannot hang there. */
export function hangOn(S: TankSetup, vi: number, row: string, wall: 'back' | 'left' | 'right'): GearPlace | null {
  const r = rimFor(S, vi, row, wall), T = S.tank, len = wall === 'back' ? T.L : T.D - backdropDepth(S.backdrop, T);
  if (r.hi - r.lo < 2 * r.hw) return null;
  const c = clearSpot(len / 2, r);
  return { wall, at: clamp(c / len, 0, 1) };
}
