// Surface anchors (roadmap Release 2, lane T3 2026-10-16): every surface an animal can sit on or cling to (the floor,
// the glass, the 3D wall, the tops of rock, ledges, branches, cork and wood) behind one query: the point on it, its
// normal and its kind. The exact shapes of the pieces and of the 3D wall live in the renderer, so it hands in a probe
// (render/items.ts solidProbe, render/build.ts onWall); without one, hardscape falls back to the floor.
// All vectors are in tank axes: [x, height, depth] (the renderer's z is -depth).
import { D2R } from './physics';
import { glassFrame } from './shape';
import { groundHeight } from './terrain';
import { woodLimbs } from './items';
import type { Item, Tank, TankSetup } from './types';

export type V3 = [number, number, number];
export type AnchorKind = 'floor' | 'glass' | 'wall' | 'rock' | 'ledge' | 'branch' | 'cork' | 'wood' | 'leaf';

export interface Anchor {
  kind: AnchorKind;
  /** The point on the surface. */
  p: V3;
  /** Unit normal out of the surface, into the open (on the glass: away from the pane, into the tank). */
  n: V3;
  /** The piece it is on (hardscape kinds). */
  item?: number;
  /** On a branch: the limb's axis point under p, its direction there (unit) and its radius, mm. */
  limb?: { c: V3; along: V3; r: number };
  /** On the glass or 3D wall: the heading asked for, laid into the surface (unit). */
  head?: V3;
  /** On hardscape: the map from the piece's own frame into tank axes (pass it to limbPaths to walk its limbs). */
  toTank?: (v: V3) => V3;
}

/** A ray straight down onto the solid pieces: the highest hit, its normal, the piece, the hit in the piece's own frame
 *  and the map from that frame into tank axes. */
export interface Hit { y: number; n: V3; item: number; local: V3; toTank(v: V3): V3 }
export interface AnchorProbe {
  /** The top of the solid pieces (no corals) under (x, depth), or null. */
  down?(x: number, depth: number): Hit | null;
  /** Where a body of length w at glass point `at` (outward normal `out`, heading `head`) lies on the 3D wall: the point
   *  and the normal into the tank, or null where no wall covers the pane. */
  wall?(at: V3, out: V3, head: V3, w: number): [V3, V3] | null;
  /** The top of the highest broad plant leaf under (x, depth) above the ground (leaf tops only: facing up, not carpet), its
   *  normal into the open, or null. For animals that may sit on leaves (species `onLeaves`). */
  leaf?(x: number, depth: number, up: number): { y: number; n: V3 } | null;
  /** The face of a leaf or solid piece (`item`: not coral) a clinger takes from the point (x, y, depth): the underside over it nearest
   *  height y (normal pointing down, at least `up`), or a steep side face (a rock's flank, a cave wall) within `reach` mm sideways,
   *  whichever is nearer (`at`: where that side face is, in tank axes), (facing down at least `up`), its normal pointing down, or null. */
  under?(x: number, depth: number, y: number, up: number, reach?: number): { y: number; n: V3; item?: number; at?: V3 } | null;
}

/** The kind of surface a piece offers. */
export function anchorKind(it: Pick<Item, 'kind' | 'variant'>): AnchorKind {
  if (it.variant === 'ledge') return 'ledge';
  if (it.variant === 'climb') return 'branch';
  if (it.variant === 'corkflat' || it.variant === 'corktube') return 'cork';
  return it.kind === 'wood' || it.variant === 'halflog' ? 'wood' : 'rock';
}
/** Surfaces an animal perches on (on top, gripping, along a limb or on the level top of a shelf) instead of lying on
 *  the slope it samples round itself, which off a thin branch or the edge of a shelf reaches the ground far below. */
export const PERCHES: ReadonlySet<AnchorKind> = new Set(['branch', 'ledge', 'leaf']);

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** A vector of a piece's own frame (the renderer's local axes, z toward the front) turned like the piece and given in
 *  tank axes: roll (tilt) about z, then pitch about x, then yaw about the vertical (three's 'YXZ' Euler). */
export function turnOut(it: Pick<Item, 'yaw' | 'pitch' | 'tilt'>, v: V3): V3 {
  const [cz, sz] = [Math.cos(it.tilt * D2R), Math.sin(it.tilt * D2R)], [cx, sx] = [Math.cos(it.pitch * D2R), Math.sin(it.pitch * D2R)], [cy, sy] = [Math.cos(it.yaw * D2R), Math.sin(it.yaw * D2R)];
  let [x, y, z] = v;
  [x, y] = [x * cz - y * sz, x * sz + y * cz];
  [y, z] = [y * cx - z * sx, y * sx + z * cx];
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  return [x, y, -z];
}

/** The limb of a branch nearest `local` (a point on its surface, in the piece's own frame): direction (tank axes),
 *  radius (local's distance from the axis) and the axis point, still in the piece's frame (`cl`). */
export function limbAt(it: Item, local: V3): { cl: V3; along: V3; r: number } | null {
  let best: { cl: V3; along: V3; r: number } | null = null, bd = Infinity;
  for (const l of woodLimbs(it.variant, it.seed, it.size)) for (let i = 0; i + 1 < l.pts.length; i++) {
    const a = l.pts[i], b = l.pts[i + 1], ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = dot(ab, ab) || 1;
    const t = Math.max(0, Math.min(1, dot([local[0] - a[0], local[1] - a[1], local[2] - a[2]], ab) / L2)), c = add(a, ab, t);
    const d = Math.hypot(local[0] - c[0], local[1] - c[1], local[2] - c[2]);
    if (d < bd) { bd = d; best = { cl: c, along: norm(turnOut(it, ab)), r: d }; }
  }
  return best;
}

/**
 * Every limb of a piece of wood as a path in tank axes, for anything that runs along a branch (a vine, a perch walk):
 * the axis points from foot to tip (the limb's own control points, the renderer bends a smooth curve through them) and
 * the radius at the first and last. `toTank` from an anchor on that piece (Anchor.toTank). Cork and the bark shells give
 * their ridge line along the top.
 */
export function limbPaths(it: Item, toTank: (v: V3) => V3): { pts: V3[]; r0: number; r1: number }[] {
  return woodLimbs(it.variant, it.seed, it.size).map(l => ({ pts: l.pts.map(p => toTank(p)), r0: l.r0, r1: l.r1 }));
}

/**
 * The anchor query for one tank. `probe` = the renderer's view of the exact shapes (absent: no hardscape, no 3D wall).
 */
export function anchors(S: TankSetup, T: Tank = S.tank, probe: AnchorProbe = {}) {
  const items = new Map(S.items.map(it => [it.id, it]));
  const floor = (x: number, depth: number): Anchor => ({ kind: 'floor', p: [x, groundHeight(S, T, x, depth), depth], n: [0, 1, 0] });
  /** What an animal at (x, depth) rests on: with `hard`, the top of the solid piece under it where that is above the
   *  ground (rock, wood and caves; never coral), else the ground; with `leaves` (the least a leaf's normal may point up, see leafUp; 0 = not on leaves) too, a plant leaf above both. */
  const rest = (x: number, depth: number, hard = true, leaves = 0): Anchor => {
    const f = floor(x, depth);
    if (!hard) return f;
    const h = probe.down?.(x, depth), lf = leaves ? probe.leaf?.(x, depth, leaves) : null;
    // a leaf higher than the solid piece (or the ground) under it: sit on the leaf
    if (lf && lf.y > Math.max(f.p[1], h?.y ?? -Infinity)) return { kind: 'leaf', p: [x, lf.y, depth], n: lf.n };
    if (!h || !(h.y > f.p[1])) return f;
    const it = items.get(h.item), kind = it ? anchorKind(it) : 'rock', a: Anchor = { kind, p: [x, h.y, depth], n: h.n, item: h.item, toTank: h.toTank };
    if (it && kind === 'branch') {
      const l = limbAt(it, h.local);
      if (l) a.limb = { c: h.toTank(l.cl), along: l.along, r: l.r };
    }
    return a;
  };
  /**
   * `rest` for a spot that was only estimated at height y (Shuffle puts it on a limb's centre line, a few mm to a few cm off
   * the rendered limb): where the probe finds only the ground, or a surface far from y, look in rings out to `reach` mm for the
   * solid top nearest height y (within `tol` of it) and take that instead. A spot with nothing near it keeps `rest`'s answer.
   */
  const restNear = (x: number, depth: number, y: number, reach = 40, tol = 45, hard = true, leaves = 0): Anchor => {
    const here = rest(x, depth, hard, leaves);
    if (!hard || !probe.down || Math.abs(here.p[1] - y) <= tol) return here;
    let best: Anchor | null = null, bs = Infinity;
    for (let r = 4; r <= reach; r += 4) for (let k = 0; k < 16; k++) {
      const a = k / 16 * 2 * Math.PI, c = rest(x + Math.cos(a) * r, depth + Math.sin(a) * r, true, leaves);
      if (c.kind === 'floor' || c.kind === 'leaf') continue;
      const dy = Math.abs(c.p[1] - y);
      if (dy <= tol && dy + r * 0.5 < bs) { best = c; bs = dy + r * 0.5; }
    }
    return best ?? here;
  };
  /**
   * On the glass nearest (x, depth) at height y, or on the 3D wall where it covers that pane: `yaw` = the heading in the
   * pane (0 = level along it, 90 = straight up), `w` = the body length the wall is fitted under.
   */
  const glass = (x: number, depth: number, y: number, yaw: number, w: number): Anchor & { head: V3; out: V3 } => {
    const g = glassFrame(T, x, depth, y), out = g.n, a = yaw * D2R;
    const along = norm([-out[2], 0, out[0]]), climb = norm([-out[0] * out[1], 1 - out[1] * out[1], -out[2] * out[1]]);
    const head = add([along[0] * Math.cos(a), along[1] * Math.cos(a), along[2] * Math.cos(a)], climb, Math.sin(a));
    const at: V3 = [g.x, y, g.depth], wall = probe.wall?.(at, out, head, w);
    if (wall) {
      const [p, nw] = wall;
      return { kind: 'wall', p, n: nw, head: norm(add(head, nw, -dot(head, nw))), out };
    }
    return { kind: 'glass', p: at, n: [-out[0], -out[1], -out[2]], head, out };
  };
  /** The anchor nearest a point: the glass (or wall) beside it, or what lies under it, whichever is closer. */
  const nearest = (x: number, depth: number, y: number, w = 20): Anchor => {
    const r = rest(x, depth), g = glass(x, depth, y, 90, w);
    return Math.hypot(g.p[0] - x, g.p[1] - y, g.p[2] - depth) < Math.abs(y - r.p[1]) ? g : r;
  };
  /** Hanging under a leaf or the underside of a solid piece over (x, depth) at about height y: the point on the underside and its normal (pointing down), or null. */
  const under = (x: number, depth: number, y: number, up: number, reach?: number): Anchor | null => {
    const u = up ? probe.under?.(x, depth, y, up, reach) : null;
    if (!u) return null;
    const it = u.item === undefined ? undefined : items.get(u.item);
    return { kind: u.item === undefined ? 'leaf' : it ? anchorKind(it) : 'rock', p: u.at ?? [x, u.y, depth], n: u.n, ...(u.item === undefined ? {} : { item: u.item }) };
  };
  return { floor, rest, restNear, glass, nearest, under };
}
export type Anchors = ReturnType<typeof anchors>;
