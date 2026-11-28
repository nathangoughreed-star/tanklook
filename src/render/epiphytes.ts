// Lane EP1 (R197 / R198, 2026-11-27): epiphytes (java fern, anubias, buce, java moss) sit ON the stone, wood, cave or
// ornament they are tied to, never in the water above it. The layouts and older files only guess a tie spot (a limb's
// axis, a box's top), and HG1's generated rock and wood moved every surface, which left tied plants hanging in open water
// (Nathan: "just kinda hanging out above the object they should be on"). Here the real meshes decide: each tied plant is
// moved to the nearest point of the actual surface, its base on it, its up leaned toward the surface's normal, and keeps
// its host's id and the tie point in the host's own frame (Item.host / hostAt) so it follows the host when it moves.
import * as THREE from 'three';
import { EPIPHYTES, seatHook } from '../scene/items';
import { D2R } from '../scene/physics';
import { isLocked } from '../scene/locks';
import { groundHeight } from '../scene/terrain';
import type { Item, TankSetup } from '../scene/types';
import { itemMesh } from './items';

/** Pieces an epiphyte can be tied onto: stone, wood, caves, ornaments (not a rim planter, which hangs on the glass). */
export const isHost = (it: Pick<Item, 'kind' | 'variant'>) => (it.kind === 'stone' || it.kind === 'wood' || it.kind === 'cave' || it.kind === 'ornament') && it.variant !== 'planter';
/** Plants this seats: an epiphyte tied to a piece, or raised off the ground (an older file's or a layout's tie guess).
 *  One standing on the substrate (lift 0, no host) is planted there and left alone. */
export const isTied = (it: Item) => it.kind === 'plant' && EPIPHYTES.has(it.variant) && (it.host != null || it.lift > 2);

/** A point on a piece's surface: where (world), the outward unit normal (world), the piece, the point in its mesh's frame. */
export interface SurfaceHit { item: number; p: THREE.Vector3; n: THREE.Vector3; local: THREE.Vector3; d: number }

const _q = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _cp = new THREE.Vector3(), _n = new THREE.Vector3(), _up = new THREE.Vector3();
const _tri = new THREE.Triangle(), _sph = new THREE.Sphere(), _inv = new THREE.Matrix4();
/** mm a downward face costs over an upward one when picking the nearest surface (a plant is tied on top or on a flank
 *  rather than under a limb, where it would hang upside down). */
const UNDER_COST = 20;

/**
 * The nearest point of the meshes' surfaces to world point `q` (each mesh: userData.item, matrices up to date), a downward
 * face counting UNDER_COST mm further. Null = no mesh.
 */
export function nearestSurface(meshes: THREE.Mesh[], q: THREE.Vector3): SurfaceHit | null {
  let best: SurfaceHit | null = null, bestCost = Infinity;
  for (const m of meshes) {
    const g = m.geometry, P = g.attributes.position as THREE.BufferAttribute | undefined;
    if (!P) continue;
    if (!g.boundingSphere) g.computeBoundingSphere();
    _sph.copy(g.boundingSphere!).applyMatrix4(m.matrixWorld);
    if (_sph.distanceToPoint(q) > bestCost) continue;
    _inv.copy(m.matrixWorld).invert();
    const ql = _q.copy(q).applyMatrix4(_inv), up = _up.set(0, 1, 0).transformDirection(_inv);
    const idx = g.index ? (g.index.array as ArrayLike<number>) : null, nt = (idx ? idx.length : P.count) / 3;
    let hitT = -1, hitCost = bestCost, hitD = 0;
    for (let t = 0; t < nt; t++) {
      const i0 = idx ? idx[3 * t] : 3 * t, i1 = idx ? idx[3 * t + 1] : 3 * t + 1, i2 = idx ? idx[3 * t + 2] : 3 * t + 2;
      _tri.set(_a.fromBufferAttribute(P, i0), _b.fromBufferAttribute(P, i1), _c.fromBufferAttribute(P, i2));
      const d = _tri.closestPointToPoint(ql, _cp).distanceTo(ql);
      if (d >= hitCost) continue;
      const ny = _tri.getNormal(_n).dot(up), cost = d + (ny < 0 ? -ny * UNDER_COST : 0);
      if (cost < hitCost) { hitCost = cost; hitT = t; hitD = d; }
    }
    if (hitT < 0) continue;
    const i0 = idx ? idx[3 * hitT] : 3 * hitT, i1 = idx ? idx[3 * hitT + 1] : 3 * hitT + 1, i2 = idx ? idx[3 * hitT + 2] : 3 * hitT + 2;
    _tri.set(_a.fromBufferAttribute(P, i0), _b.fromBufferAttribute(P, i1), _c.fromBufferAttribute(P, i2));
    const local = _tri.closestPointToPoint(ql, new THREE.Vector3());
    bestCost = hitCost;
    best = { item: m.userData.item, local, p: local.clone().applyMatrix4(m.matrixWorld), n: _tri.getNormal(new THREE.Vector3()).transformDirection(m.matrixWorld), d: hitD };
  }
  return best;
}

/** Java moss drapes over its piece (render/items.ts mossHost, only while upright): never leaned. */
const DRAPES_ON_HOST: ReadonlySet<string> = new Set(['moss']);
/** The most a tied plant leans off upright toward its surface's normal, and the steepness (normal.y) under which it leans. */
const LEAN_MAX = 35, LEAN_FROM = 0.85;
/**
 * Puts plant `it` on surface point `h` (world): base on it, `host` / `hostAt` set, and (a fern, anubias or buce on a steep
 * face) leaned toward the normal by at most LEAN_MAX°; upright on a top, and java moss always upright (it drapes over the
 * piece itself, render/items.ts mossHost).
 */
export function tieTo(S: TankSetup, it: Item, h: SurfaceHit) {
  it.x = Math.round(h.p.x * 10) / 10 || 0; it.depth = Math.round(-h.p.z * 10) / 10 || 0;
  it.lift = Math.round((h.p.y - groundHeight(S, S.tank, it.x, it.depth)) * 10) / 10 || 0;
  it.host = h.item; it.hostAt = [h.local.x, h.local.y, h.local.z].map(v => Math.round(v * 10) / 10 || 0) as [number, number, number];
  if (DRAPES_ON_HOST.has(it.variant) || h.n.y >= LEAN_FROM) { it.pitch = 0; it.tilt = 0; return; }
  // lean the plant's up from straight up toward the normal by at most LEAN_MAX°, then as Euler YXZ (pitch, yaw, tilt):
  // R = Ry(yaw) Rx(pitch) Rz(tilt) takes (0, 1, 0) to (-sin t, cos t cos p, cos t sin p) in the yawed frame
  const ang = Math.acos(Math.min(1, h.n.y)), k = Math.min(1, LEAN_MAX * D2R / Math.max(ang, 1e-6));
  const u = new THREE.Vector3(0, 1, 0).lerp(h.n, k).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), -it.yaw * D2R);
  it.tilt = Math.round(Math.asin(Math.max(-1, Math.min(1, -u.x))) / D2R) || 0; // (|| 0: never -0, which a saved file reads back as 0)
  it.pitch = Math.round(Math.atan2(u.z, u.y) / D2R) || 0;
}
/** Unties a plant (it stands on the ground). */
export function untie(it: Item) { delete it.host; delete it.hostAt; it.lift = 0; it.pitch = 0; it.tilt = 0; }

/** The host meshes of a tank (matrices up to date). */
export function hostMeshes(S: TankSetup, skip?: Set<number>): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (const it of S.items) {
    if (!isHost(it) || skip?.has(it.id)) continue;
    const m = itemMesh(S, S.tank, it);
    if (m) { m.updateMatrixWorld(true); out.push(m); }
  }
  return out;
}

/** Where each tied plant was last seated (x, depth, lift), per tank: one that has not moved since follows its host. */
const lastSeat = new WeakMap<TankSetup, Map<number, string>>();
const seatKey = (it: Item) => `${it.x},${it.depth},${it.lift}`;
/** mm a tied plant may be off its host's tie point and still count as tied there (more: it was moved or pasted). */
const TIE_SLACK = 25;

/**
 * Seats every tied epiphyte of `S` on the real surface. A plant with a host follows it: the tie point in the host's frame,
 * snapped to that host's surface (it moved, turned, was resized or reshaped). One without a host, or moved away from its
 * tie point (dragged, pasted), takes the nearest surface of any piece; nearer to the ground than to any piece, it is
 * untied onto the ground. A locked plant is left as it is. Returns how many moved.
 */
export function seatEpiphytes(S: TankSetup): number {
  const tied = S.items.filter(it => isTied(it) && !(it.uid && isLocked(S, it.uid))); // a locked plant stays exactly where it is (DX0 locks)
  if (!tied.length) return 0;
  const meshes = hostMeshes(S), byId = new Map(meshes.map(m => [m.userData.item as number, m]));
  const seen = lastSeat.get(S) ?? new Map<number, string>();
  lastSeat.set(S, seen);
  let moved = 0;
  for (const it of tied) {
    const before = seatKey(it) + it.pitch + ',' + it.tilt, g = groundHeight(S, S.tank, it.x, it.depth);
    const base = new THREE.Vector3(it.x, g + it.lift, -it.depth), host = it.host != null ? byId.get(it.host) : undefined;
    let h: SurfaceHit | null = null;
    if (host && it.hostAt) {
      const at = new THREE.Vector3(...it.hostAt).applyMatrix4(host.matrixWorld);
      if (seen.get(it.id) === seatKey(it) || at.distanceTo(base) <= TIE_SLACK) h = nearestSurface([host], at);
    }
    if (!h) {
      h = nearestSurface(meshes, base);
      if (h && h.d > Math.max(0, it.lift) + 10) h = null; // the ground is nearer: it was never on a piece
    }
    if (h) tieTo(S, it, h); else untie(it);
    seen.set(it.id, seatKey(it));
    if (seatKey(it) + it.pitch + ',' + it.tilt !== before) moved++;
  }
  return moved;
}
seatHook.epiphytes = seatEpiphytes;
