// SW1: the collision world for freely swimming fish (see src/scene/swimTypes.ts).
// A coarse voxel signed-distance grid over the water volume, built from SCENE DATA (item footprints, heights, wood limbs,
// plant sizes), never from meshes: `buildSwimField(S, T, opts)`. No three.js, no DOM; runs in node for tests.
//
// What goes in (all analytic, min-combined):
//   glass   exact for rect/poly/round/pie (insideBy); bowl by the sphere's radius at each height; arch: front pane shifted
//           by frontAt (approximate near the corners)
//   ground  groundHeight + opts.rise (the build's BD2 berm lift, optional) = floorAt(x,z), what resting animals use;
//           the vertical gap is scaled by the slope so distance is not overstated on a hill
//   water   waterY(T, level)
//   hard    stone / cave / coral / ornament: its oriented box (yaw only, as itemToTank does; pitch and roll ignored);
//           limb wood: one capsule per limb (radius r0..r1), shell-bark wood: its box
//   plants  SOFT: upright plants and artificial plants = a cylinder of PLANT_CORE (0.5) of their canopy radius, so a fish
//           may brush leaves but not cross the crown; carpets = a thin slab (floorAt is NOT raised, as the build rests
//           animals on the smooth ground); floaters are skipped (the water surface already bounds them)
// Approximated: caves are solid boxes (no swim-through), rocks are their bounding boxes (generous), the 3D backdrop wall
// and the tech gear are not in the field, nothing moves after build (rebuild on any scene change).
// Values are stored capped at +-`store` mm (default 100): clearance(..., cap) never sees farther than that, and the
// gradient is zero where the field is flat at the cap.
import { CARPET_H, isLimbWood, itemDims, itemSink, woodLimbs } from '../scene/items';
import { isCarpet, isFloat } from '../art/plants';
import { D2R, clamp, waterY } from '../scene/physics';
import { bowlRadius, frontAt, archBulge, insideBy, shapeOf } from '../scene/shape';
import { groundHeight } from '../scene/terrain';
import type { Item, Tank, TankSetup } from '../scene/types';
import { fishTL, getSpecies } from '../data/species';
import { sessileSpec } from '../art/sessile';
import type { SwimField, V3 } from '../scene/swimTypes';

export const PLANT_CORE = 0.5;

export interface SwimFieldOpts {
  /** Target cell edge (mm); raised automatically so the grid stays under `maxCells`. Default 12. */
  cell?: number;
  maxCells?: number;
  /** Distance stored (mm); the farthest `clearance` can report. Default 100. */
  store?: number;
  /** The build's berm lift above the smooth ground (bermRise); default none. */
  rise?: (x: number, depth: number) => number;
}

export interface SwimFieldEx extends SwimField {
  cell: number;
  dims: [number, number, number];
  /** x-fastest voxel data: index = i + nx * (j + ny * k), k along depth (z = -k*cell). Cell centres at (i+.5)*cell. */
  data: Float32Array;
  store: number;
}

type Prim =
  | { t: 'box'; cx: number; cy: number; cd: number; c: number; s: number; hx: number; hy: number; hz: number; r: number }
  | { t: 'cap'; ax: number; ay: number; ad: number; bx: number; by: number; bd: number; r0: number; r1: number }
  | { t: 'cyl'; cx: number; cd: number; y0: number; y1: number; r: number };

/** Signed distance to a primitive, point in (x, y, depth). */
function sdPrim(p: Prim, x: number, y: number, d: number): number {
  if (p.t === 'cyl') {
    const q = Math.hypot(x - p.cx, d - p.cd) - p.r, v = Math.abs(y - (p.y0 + p.y1) / 2) - (p.y1 - p.y0) / 2;
    return Math.min(Math.max(q, v), 0) + Math.hypot(Math.max(q, 0), Math.max(v, 0));
  }
  if (p.t === 'cap') {
    const abx = p.bx - p.ax, aby = p.by - p.ay, abd = p.bd - p.ad, apx = x - p.ax, apy = y - p.ay, apd = d - p.ad;
    const l2 = abx * abx + aby * aby + abd * abd, t = l2 > 1e-9 ? clamp((apx * abx + apy * aby + apd * abd) / l2, 0, 1) : 0;
    return Math.hypot(apx - abx * t, apy - aby * t, apd - abd * t) - (p.r0 + (p.r1 - p.r0) * t);
  }
  const dx = x - p.cx, dd = d - p.cd;
  const lx = dx * p.c + dd * p.s, lz = dx * p.s - dd * p.c, ly = y - p.cy;
  const qx = Math.abs(lx) - p.hx, qy = Math.abs(ly) - p.hy, qz = Math.abs(lz) - p.hz;
  return Math.min(Math.max(qx, qy, qz), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) - p.r;
}

function bbox(p: Prim): [number, number, number, number, number, number] { // x0 x1 y0 y1 d0 d1
  if (p.t === 'cyl') return [p.cx - p.r, p.cx + p.r, p.y0, p.y1, p.cd - p.r, p.cd + p.r];
  if (p.t === 'cap') { const r = Math.max(p.r0, p.r1); return [Math.min(p.ax, p.bx) - r, Math.max(p.ax, p.bx) + r, Math.min(p.ay, p.by) - r, Math.max(p.ay, p.by) + r, Math.min(p.ad, p.bd) - r, Math.max(p.ad, p.bd) + r]; }
  const e = Math.abs(p.c) * p.hx + Math.abs(p.s) * p.hz, f = Math.abs(p.s) * p.hx + Math.abs(p.c) * p.hz;
  return [p.cx - e, p.cx + e, p.cy - p.hy, p.cy + p.hy, p.cd - f, p.cd + f];
}

/** The solid primitives of the scene, in (x, y above the tank floor, depth). Exported for tests and debug. */
export function swimPrims(S: TankSetup, T: Tank): Prim[] {
  const out: Prim[] = [];
  for (const it of S.items) {
    if (it.variant === 'planter') continue; // rides the rim, out of the water
    const base = groundHeight(S, T, it.x, it.depth) + it.lift - itemSink(it);
    if (it.kind === 'plant' || it.kind === 'artificial') {
      if (isFloat(it.variant)) continue;
      const [l, h, w] = itemDims(it);
      if (it.kind === 'plant' && isCarpet(it.variant)) { out.push(boxOf(it, base, l / 2, CARPET_H / 2, w / 2, CARPET_H / 2)); continue; }
      out.push({ t: 'cyl', cx: it.x, cd: it.depth, y0: base, y1: base + h, r: Math.max(3, Math.max(l, w) / 2 * PLANT_CORE) });
      continue;
    }
    if (it.kind === 'wood' && isLimbWood(it.variant)) {
      const c = Math.cos(it.yaw * D2R), s = Math.sin(it.yaw * D2R);
      const tf = (q: V3) => ({ x: it.x + q[0] * c + q[2] * s, d: it.depth - (-q[0] * s + q[2] * c), y: base + q[1] });
      for (const lb of woodLimbs(it.variant, it.seed, it.size, it.hs)) {
        for (let i = 0; i + 1 < lb.pts.length; i++) {
          const a = tf(lb.pts[i]), b = tf(lb.pts[i + 1]), n = lb.pts.length - 1, ta = i / n, tb = (i + 1) / n;
          out.push({ t: 'cap', ax: a.x, ay: a.y, ad: a.d, bx: b.x, by: b.y, bd: b.d, r0: lb.r0 + (lb.r1 - lb.r0) * ta, r1: lb.r0 + (lb.r1 - lb.r0) * tb });
        }
      }
      continue;
    }
    const [l, h, w] = itemDims(it);
    out.push(boxOf(it, base, l / 2, h / 2, w / 2, h / 2));
  }
  return out;
}

function boxOf(it: Item, base: number, hx: number, hy: number, hz: number, cy: number): Prim {
  const a = it.yaw * D2R;
  return { t: 'box', cx: it.x, cy: base + cy, cd: it.depth, c: Math.cos(a), s: Math.sin(a), hx, hy, hz, r: 0 };
}

export function buildSwimField(S: TankSetup, T: Tank, opts: SwimFieldOpts = {}): SwimFieldEx {
  const rise = opts.rise ?? (() => 0), store = opts.store ?? 100, maxCells = opts.maxCells ?? 150000;
  const waterTop = waterY(T, S.water.level), L = T.L, D = T.D, H = Math.max(waterTop, 1);
  let h = Math.max(opts.cell ?? 12, Math.cbrt(L * H * D / maxCells));
  const dims = (hh: number): [number, number, number] => [Math.max(2, Math.ceil(L / hh)), Math.max(2, Math.ceil(H / hh)), Math.max(2, Math.ceil(D / hh))];
  let [nx, ny, nz] = dims(h);
  while (nx * ny * nz > maxCells) { h *= 1.05; [nx, ny, nz] = dims(h); }
  const hx = L / nx, hy = H / ny, hz = D / nz; // cells fit the box exactly (slightly anisotropic)
  const data = new Float32Array(nx * ny * nz);
  const shape = shapeOf(T), bowl = shape === 'bowl', arch = shape === 'arch', bulge = arch ? archBulge(T) : 0;
  const floorCol = new Float32Array(nx * nz), scaleCol = new Float32Array(nx * nz), glass2 = new Float32Array(nx * nz);
  const flo = (x: number, d: number) => groundHeight(S, T, x, d) + rise(x, d);
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * hx, d = (k + 0.5) * hz, c = k * nx + i;
    const f = flo(x, d), gx = (flo(x + hx, d) - flo(x - hx, d)) / (2 * hx), gd = (flo(x, d + hz) - flo(x, d - hz)) / (2 * hz);
    floorCol[c] = f; scaleCol[c] = 1 / Math.sqrt(1 + gx * gx + gd * gd);
    glass2[c] = bowl || arch ? 0 : insideBy(T, x, d);
  }
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
    const y = (j + 0.5) * hy, rb = bowl ? bowlRadius(T, y) : 0, fa = arch ? frontAt(T, y) : 0;
    for (let i = 0; i < nx; i++) {
      const x = (i + 0.5) * hx, d = (k + 0.5) * hz, c = k * nx + i;
      let g = glass2[c];
      if (bowl) g = rb - Math.hypot(x - L / 2, d - D / 2);
      else if (arch) g = insideBy(T, x, d + (bulge - fa) * clamp(1 - d / (D / 2), 0, 1));
      const v = Math.min(g, waterTop - y, (y - floorCol[c]) * scaleCol[c]);
      data[i + nx * (j + ny * k)] = clamp(v, -store, store);
    }
  }
  // stamp each solid into the grid, only in its box grown by `store`
  for (const p of swimPrims(S, T)) {
    const b = bbox(p);
    const i0 = Math.max(0, Math.floor((b[0] - store) / hx)), i1 = Math.min(nx - 1, Math.ceil((b[1] + store) / hx));
    const j0 = Math.max(0, Math.floor((b[2] - store) / hy)), j1 = Math.min(ny - 1, Math.ceil((b[3] + store) / hy));
    const k0 = Math.max(0, Math.floor((b[4] - store) / hz)), k1 = Math.min(nz - 1, Math.ceil((b[5] + store) / hz));
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const idx = i + nx * (j + ny * k), v = sdPrim(p, (i + 0.5) * hx, (j + 0.5) * hy, (k + 0.5) * hz);
      if (v < data[idx]) data[idx] = Math.max(v, -store);
    }
  }

  const ix = 1 / hx, iy = 1 / hy, iz = 1 / hz, sx = nx, sy = nx * ny;
  const x0 = 0.5 * hx, y0 = 0.5 * hy, d0 = 0.5 * hz;
  // trilinear sample at fractional cell coords (clamped to the grid: outside the box reads the nearest cell, and the
  // wall terms keep it honest by `outside` below)
  function sample(fx: number, fy: number, fz: number): number {
    fx = fx < 0 ? 0 : fx > nx - 1 ? nx - 1 : fx; fy = fy < 0 ? 0 : fy > ny - 1 ? ny - 1 : fy; fz = fz < 0 ? 0 : fz > nz - 1 ? nz - 1 : fz;
    let i = fx | 0, j = fy | 0, k = fz | 0; if (i >= nx - 1) i = nx - 2; if (j >= ny - 1) j = ny - 2; if (k >= nz - 1) k = nz - 2;
    const tx = fx - i, ty = fy - j, tz = fz - k, o = i + sx * j + sy * k;
    const a = data[o] * (1 - tx) + data[o + 1] * tx, b = data[o + sx] * (1 - tx) + data[o + sx + 1] * tx;
    const c = data[o + sy] * (1 - tx) + data[o + sy + 1] * tx, e = data[o + sy + sx] * (1 - tx) + data[o + sy + sx + 1] * tx;
    return (a * (1 - ty) + b * ty) * (1 - tz) + (c * (1 - ty) + e * ty) * tz;
  }
  const anchors: NonNullable<SwimField['anchors']> = [];
  for (const it of S.items) { // FB3: what each solid is, for fish that pick a home (rock, cave, host, plant)
    if (it.variant === 'planter' || ((it.kind === 'plant' || it.kind === 'artificial') && isFloat(it.variant))) continue;
    const [l, hh, w] = itemDims(it), base = groundHeight(S, T, it.x, it.depth) + it.lift - itemSink(it);
    anchors.push({ kind: it.kind, variant: it.variant, x: it.x, z: -it.depth, y0: base, y1: base + hh, r: Math.max(l, w) / 2 });
  }
  for (const f of S.fish) { // a sessile animal (anemone) is a host: the swimmers that shelter in it hold just over its tentacles
    const sp = getSpecies(f.species); if (sp?.kind !== 'sessile') continue;
    const w = fishTL(f, sp), base = f.surface === 'hardscape' ? f.y : groundHeight(S, T, f.x, f.depth);
    anchors.push({ kind: 'coral', variant: sessileSpec(sp.art).shape, x: f.x, z: -f.depth, y0: base, y1: base + w * 0.4, r: w / 2 });
  }
  const field: SwimFieldEx = {
    min: [0, 0, -D], max: [L, waterTop, 0], waterTop, cell: h, dims: [nx, ny, nz], data, store, anchors,
    floorAt: (x, z) => flo(x, -z),
    clearance(x, y, z, grad, cap = store) {
      const d = -z, fx = (x - x0) * ix, fy = (y - y0) * iy, fz = (d - d0) * iz;
      let v = sample(fx, fy, fz);
      // outside the box: the cell value is the nearest one's, minus how far we are past it (so it never rises when leaving)
      const ox = x < 0 ? -x : x > L ? x - L : 0, oy = y < 0 ? -y : y > waterTop ? y - waterTop : 0, od = d < 0 ? -d : d > D ? d - D : 0;
      if (ox || oy || od) v = Math.min(v, 0) - Math.hypot(ox, oy, od);
      if (grad) {
        const gx = sample(fx + 1, fy, fz) - sample(fx - 1, fy, fz), gy = sample(fx, fy + 1, fz) - sample(fx, fy - 1, fz), gz = sample(fx, fy, fz + 1) - sample(fx, fy, fz - 1);
        // finite differences are per cell pair: rescale to mm, then normalise; depth is -z
        const ax = gx * ix, ay = gy * iy, ad = gz * iz, n = Math.hypot(ax, ay, ad);
        if (n > 1e-9) { grad[0] = ax / n; grad[1] = ay / n; grad[2] = -ad / n; } else { grad[0] = 0; grad[1] = 0; grad[2] = 0; }
      }
      return v > cap ? cap : v;
    },
  };
  return field;
}

/** Debug: a slice of the field as a row-major Float32Array of clearance (mm). `plane` 'xz' = top-down at height `at`, 'xy' = side view at z = -at. */
export function fieldSlice(f: SwimFieldEx, plane: 'xz' | 'xy', at: number, w = 120): { w: number; h: number; data: Float32Array } {
  const L = f.max[0], D = -f.min[2], hh = Math.max(2, Math.round(w * (plane === 'xz' ? D : f.waterTop) / L)), data = new Float32Array(w * hh);
  for (let r = 0; r < hh; r++) for (let c = 0; c < w; c++) {
    const x = (c + 0.5) / w * L;
    data[r * w + c] = plane === 'xz' ? f.clearance(x, at, -((r + 0.5) / hh * D)) : f.clearance(x, f.waterTop * (1 - (r + 0.5) / hh), -at);
  }
  return { w, h: hh, data };
}

/** Debug: the slice as ASCII; '#' solid, then '9'..'0' for the clearance in tenths of `cap`, ' ' beyond it. */
export function sliceAscii(f: SwimFieldEx, plane: 'xz' | 'xy', at: number, w = 100, cap = 60): string {
  const s = fieldSlice(f, plane, at, w), rows: string[] = [];
  for (let r = 0; r < s.h; r++) {
    let line = '';
    for (let c = 0; c < s.w; c++) { const v = s.data[r * s.w + c]; line += v <= 0 ? '#' : v >= cap ? ' ' : String(Math.min(9, Math.floor(v / cap * 10))); }
    rows.push(line);
  }
  return rows.join('\n');
}

/** Debug: the slice as RGBA bytes (red = solid, shades of blue by clearance, white beyond `cap`), ready for ImageData / a PNG encoder. */
export function sliceRGBA(f: SwimFieldEx, plane: 'xz' | 'xy', at: number, w = 400, cap = 60): { w: number; h: number; rgba: Uint8ClampedArray } {
  const s = fieldSlice(f, plane, at, w), rgba = new Uint8ClampedArray(s.w * s.h * 4);
  for (let n = 0; n < s.data.length; n++) {
    const v = s.data[n], t = clamp(v / cap, 0, 1);
    rgba[n * 4] = v <= 0 ? 200 : 255 - 200 * t; rgba[n * 4 + 1] = v <= 0 ? 40 : 255 - 150 * t; rgba[n * 4 + 2] = v <= 0 ? 40 : 255; rgba[n * 4 + 3] = 255;
  }
  return { w: s.w, h: s.h, rgba };
}
