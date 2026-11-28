// R208 BH-S1: the exact local shapes of hardscape, for the affordance map (src/behavior/affordance.ts).
// The swim field (render/swimField.ts) is a coarse grid in which caves are solid boxes and rocks are their bounding boxes.
// That is fine for not bumping into things and useless for using them, so each solid piece also gets its own exact shape here:
// rounded boxes (rocks, ornaments), capsule limbs (wood), hollow shells (cave tube, half-log, cork flat and tube, coconut dome,
// stone arch) with their insides and mouths. Plain numbers, no three.js, runs in node.
// World = the viewer's: mm, x along the tank, y up, z = -depth. A piece's local frame turns by its yaw only, as itemToTank and
// the swim field do (pitch and roll are ignored: the field ignores them too, so fish and map agree).
import { SHELLS } from '../scene/items';

export type V3 = [number, number, number];

/** A piece's frame: (cx, cz) its anchor on the floor plan, cy its base height, (c, s) = cos / sin of its yaw. Local +z faces the front glass at yaw 0. */
export interface Frame { cx: number; cy: number; cz: number; c: number; s: number }
export const toWorld = (f: Frame, q: V3): V3 => [f.cx + f.c * q[0] + f.s * q[2], f.cy + q[1], f.cz - f.s * q[0] + f.c * q[2]];
export const toLocal = (f: Frame, p: V3): V3 => { const dx = p[0] - f.cx, dz = p[2] - f.cz; return [dx * f.c - dz * f.s, p[1] - f.cy, dx * f.s + dz * f.c]; };
export const dirToWorld = (f: Frame, q: V3): V3 => [f.c * q[0] + f.s * q[2], q[1], -f.s * q[0] + f.c * q[2]];

export type SolidKind = 'rock' | 'wood' | 'cave' | 'ornament';
export type Solid =
  | { t: 'rbox'; item: number; kind: SolidKind; f: Frame; hx: number; hy: number; hz: number; r: number; bound: [number, number, number, number] }
  | { t: 'cap'; item: number; kind: SolidKind; a: V3; b: V3; r0: number; r1: number; bound: [number, number, number, number] }
  | { t: 'shell'; item: number; kind: SolidKind; f: Frame; len: number; R: number; w: number; arc: number; yc: number; bound: [number, number, number, number] }
  | { t: 'dome'; item: number; kind: SolidKind; f: Frame; R: number; th0: number; eps: number; bound: [number, number, number, number] }
  | { t: 'arch'; item: number; kind: SolidKind; f: Frame; R0: number; tr: number; bound: [number, number, number, number] };

/** [cx, cy, cz, radius]: a sphere round the shape, so a query can skip shapes that are far away. */
export const boundOf = (f: Frame, hx: number, hy: number, hz: number, cyLocal = hy): [number, number, number, number] => {
  const c = toWorld(f, [0, cyLocal, 0]);
  return [c[0], c[1], c[2], Math.hypot(hx, hy, hz) + 2];
};

export const rboxSolid = (item: number, kind: SolidKind, f: Frame, l: number, h: number, w: number): Solid => {
  const r = Math.max(1, 0.3 * Math.min(l, h, w) / 2), hx = l / 2 - r, hy = h / 2 - r, hz = w / 2 - r;
  return { t: 'rbox', item, kind, f, hx: Math.max(0, hx), hy: Math.max(0, hy), hz: Math.max(0, hz), r, bound: boundOf(f, l / 2, h / 2, w / 2) };
};
export const capSolid = (item: number, kind: SolidKind, a: V3, b: V3, r0: number, r1: number): Solid => ({
  t: 'cap', item, kind, a, b, r0, r1, bound: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 2 + Math.max(r0, r1) + 2],
});

/** A shell lying along local x: a half-log (arc pi), a cork flat (2.5 rad) or a tube (2 pi, a clay tube or cork round). R = outer radius, w = wall, yc = height of the axis. */
export function shellSolid(item: number, kind: SolidKind, f: Frame, len: number, R: number, w: number, arc: number, yc: number): Solid {
  return { t: 'shell', item, kind, f, len, R, w, arc, yc, bound: boundOf(f, len / 2, R, R, yc) };
}
/** A shell for one of the cave / cork variants of items.ts, at size s; null when the variant is not a shell. */
export function shellFor(item: number, kind: SolidKind, f: Frame, variant: string, s: number): Solid | null {
  if (variant === 'tube') { const R = 0.21 * s; return shellSolid(item, kind, f, s, R, 0.16 * R, 2 * Math.PI, R); }
  const sh = SHELLS[variant];
  if (!sh) return null;
  const R = sh.R * s, a = Math.min(sh.arc, 2 * Math.PI) / 2, h = sh.arc >= 2 * Math.PI ? 2 * R : R * (1 - Math.cos(a));
  return shellSolid(item, kind, f, s, R, sh.t * s, sh.arc, sh.arc >= 2 * Math.PI ? R : h - R);
}
export const domeSolid = (item: number, kind: SolidKind, f: Frame, s: number): Solid => ({ t: 'dome', item, kind, f, R: s / 2, th0: 0.42, eps: 0.58, bound: boundOf(f, s / 2, s / 2, s / 2, 0) });
export const archSolid = (item: number, kind: SolidKind, f: Frame, s: number): Solid => {
  const tr = 0.16 * s, R0 = 0.5 * s - tr;
  return { t: 'arch', item, kind, f, R0, tr, bound: boundOf(f, 0.5 * s, 0.5 * s, 1.4 * tr, 0.25 * s) };
};

/** Signed distance (mm, negative inside the material) from a world point to a solid. Exact for boxes and capsules, close for the shells (a few mm). */
export function sdSolid(sh: Solid, x: number, y: number, z: number): number {
  switch (sh.t) {
    case 'rbox': {
      const l = toLocal(sh.f, [x, y, z]), qx = Math.abs(l[0]) - sh.hx, qy = Math.abs(l[1] - (sh.hy + sh.r)) - sh.hy, qz = Math.abs(l[2]) - sh.hz;
      return Math.min(Math.max(qx, qy, qz), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) - sh.r;
    }
    case 'cap': {
      const abx = sh.b[0] - sh.a[0], aby = sh.b[1] - sh.a[1], abz = sh.b[2] - sh.a[2], apx = x - sh.a[0], apy = y - sh.a[1], apz = z - sh.a[2];
      const l2 = abx * abx + aby * aby + abz * abz, t = l2 > 1e-9 ? Math.min(1, Math.max(0, (apx * abx + apy * aby + apz * abz) / l2)) : 0;
      return Math.hypot(apx - abx * t, apy - aby * t, apz - abz * t) - (sh.r0 + (sh.r1 - sh.r0) * t);
    }
    case 'shell': {
      const l = toLocal(sh.f, [x, y, z]), ry = l[1] - sh.yc, rho = Math.hypot(ry, l[2]);
      const dRad = Math.abs(rho - (sh.R - sh.w / 2)) - sh.w / 2, dEnd = Math.abs(l[0]) - sh.len / 2;
      const a = Math.min(sh.arc, 2 * Math.PI) / 2, dAng = sh.arc >= 2 * Math.PI ? -1e9 : (Math.atan2(Math.abs(l[2]), ry) - a) * rho;
      return Math.max(dRad, dEnd, dAng);
    }
    case 'dome': {
      const l = toLocal(sh.f, [x, y, z]), qy = l[1] / 0.92, rho = Math.hypot(l[0], qy, l[2]);
      const sdShell = Math.max(rho - sh.R, 0.93 * sh.R - rho, -l[1]);
      const t = Math.atan2(l[0], l[2]), u = Math.abs(t) / sh.th0;
      if (u >= 1 || rho < 1e-6) return sdShell;
      const edge = sh.eps * Math.pow(1 - u ** 4, 0.25), e = Math.asin(Math.min(1, Math.max(-1, qy / rho)));
      return Math.max(sdShell, Math.min((sh.th0 - Math.abs(t)) * rho, (edge - e) * rho)); // the doorway is air: -(door sd), door sd = -min(..)
    }
    case 'arch': {
      const l = toLocal(sh.f, [x, y, z]), rho = Math.hypot(l[0], l[1]);
      return Math.max(Math.hypot(rho - sh.R0, l[2] / 1.4) - sh.tr, -l[1]);
    }
  }
}

/** A way into a hollow: world position and the unit direction out of it (the way the art opens), and its size. */
export interface Mouth { p: V3; dir: V3; w: number; h: number }
/** The hollow inside a shell: `inside(p)` = how deep p is in it (0 = at a mouth plane .. 1 = the far end), -1 when p is not inside. */
export interface Hollow {
  item: number;
  /** 'cave' = a shelter to go into (cave-in); 'overhang' = a lean-to (cork flat) whose underside is an overhang. */
  kind: 'cave' | 'overhang';
  solid: Solid;
  mouths: Mouth[];
  /** The inner floor centre (world) and its extent: a fish rests here. */
  centre: V3; floorW: number; floorL: number;
  inside(x: number, y: number, z: number): number;
}

export function hollowOf(sh: Solid, kind: 'cave' | 'overhang'): Hollow | null {
  if (sh.t === 'shell') {
    const f = sh.f, Ri = sh.R - sh.w, a = Math.min(sh.arc, 2 * Math.PI) / 2, hl = sh.len / 2, yTop = sh.yc + Ri;
    const w = 2 * Ri * (sh.arc >= 2 * Math.PI ? 1 : Math.sin(Math.min(a, Math.PI / 2)));
    const mouths: Mouth[] = ([-1, 1] as const).map(sg => ({ p: toWorld(f, [sg * hl, Math.max(0, sh.yc), 0]), dir: dirToWorld(f, [sg, 0, 0]), w, h: Math.min(2 * Ri, yTop) }));
    return {
      item: sh.item, kind, solid: sh, mouths, centre: toWorld(f, [0, 0, 0]), floorW: w, floorL: sh.len,
      inside(x, y, z) {
        const l = toLocal(f, [x, y, z]), ry = l[1] - sh.yc, rho = Math.hypot(ry, l[2]);
        if (rho >= Ri || Math.abs(l[0]) >= hl || l[1] < 0) return -1;
        if (sh.arc < 2 * Math.PI && Math.atan2(Math.abs(l[2]), ry) > a) return -1;
        return 1 - Math.abs(l[0]) / hl;
      },
    };
  }
  if (sh.t === 'dome') {
    const f = sh.f, Ri = 0.93 * sh.R, th = sh.th0;
    const mouths: Mouth[] = [{ p: toWorld(f, [0, 0.3 * sh.R, sh.R]), dir: dirToWorld(f, [0, 0, 1]), w: 2 * sh.R * Math.sin(th), h: sh.R * 0.92 * Math.sin(sh.eps) }];
    return {
      item: sh.item, kind, solid: sh, mouths, centre: toWorld(f, [0, 0, -0.2 * sh.R]), floorW: 1.6 * Ri, floorL: 1.6 * Ri,
      inside(x, y, z) {
        const l = toLocal(f, [x, y, z]), rho = Math.hypot(l[0], l[1] / 0.92, l[2]);
        if (rho >= Ri || l[1] < 0) return -1;
        return Math.min(1, Math.max(0, (sh.R - l[2]) / (2 * sh.R)));
      },
    };
  }
  if (sh.t === 'arch') {
    const f = sh.f, Ri = sh.R0 - sh.tr, hz = sh.tr * 1.4;
    const mouths: Mouth[] = ([-1, 1] as const).map(sg => ({ p: toWorld(f, [0, 0, sg * hz]), dir: dirToWorld(f, [0, 0, sg]), w: 2 * Ri, h: Ri }));
    return {
      item: sh.item, kind, solid: sh, mouths, centre: toWorld(f, [0, 0, 0]), floorW: 2 * Ri, floorL: 2 * hz,
      inside(x, y, z) {
        const l = toLocal(f, [x, y, z]);
        if (l[1] < 0 || Math.hypot(l[0], l[1]) >= Ri || Math.abs(l[2]) >= hz) return -1;
        return 1 - Math.abs(l[2]) / hz;
      },
    };
  }
  return null;
}
