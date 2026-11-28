// R208 BH-S1: the world affordance map (research/behavior/bh1-first-slice.md, layer 1).
// What the scape OFFERS a fish, built from scene data (never meshes) once per scene change: tagged places (cave-in, cave-mouth,
// overhang, crevice, root-mass, stem-thicket, open-sand, open-gravel, glass, surface), exact local shapes of the hardscape with
// hollow caves, permeable root masses and thickets, a buryable sand layer, and simple graze / sift food patches. A fish asks
// "nearest cave-mouth within 300 mm with cover > 0.6, not owned" and gets an answer from a spatial hash.
// No fish behaviour changes here and nothing reads this yet (S2 onward do). Plain numbers, no three.js, no DOM: runs in node.
import { isLimbWood, itemDims, itemSink, woodLimbs } from '../scene/items';
import { isCarpet, isFloat } from '../art/plants';
import { D2R } from '../scene/physics';
import { groundHeight } from '../scene/terrain';
import { SUBSTRATE_TRAITS } from '../data/substrateTraits';
import { swimFieldFor } from '../render/swimWorld';
import { buildSwimField } from '../render/swimField';
import type { Item, Tank, TankSetup } from '../scene/types';
import type { SwimField } from '../scene/swimTypes';
import {
  archSolid, capSolid, domeSolid, hollowOf, rboxSolid, sdSolid, shellFor, toWorld,
  type Frame, type Hollow, type Solid, type V3,
} from './shapes';

export type PlaceTag = 'cave-in' | 'cave-mouth' | 'overhang' | 'crevice' | 'root-mass' | 'stem-thicket' | 'open-sand' | 'open-gravel' | 'glass' | 'surface';
export const PLACE_TAGS: PlaceTag[] = ['cave-in', 'cave-mouth', 'overhang', 'crevice', 'root-mass', 'stem-thicket', 'open-sand', 'open-gravel', 'glass', 'surface'];

export interface Place {
  id: number;
  tag: PlaceTag;
  /** Where a fish takes it up (world mm; for glass the point on the pane, for sand the sand surface). */
  p: V3;
  /** Facing: the unit direction a fish sitting here looks (into the open for a mouth or overhang, away from the surface for glass / sand). */
  n: V3;
  /** 0 = open water .. 1 = enclosed: the share of directions blocked by hard pieces within about 13 cm (plants count half). */
  cover: number;
  /** How many fish fit. */
  capacity: number;
  /** The scene item it belongs to (null for glass, sand, surface). */
  item: number | null;
  /** The fish that holds it for good (null = free). A shared spot is never owned; its `users` count against `capacity`. */
  owner: number | null;
  users: number;
  /** crevice: gap width (mm). */
  width?: number;
}

/** Something a fish can be INSIDE of: a root mass or a plant thicket. density 0..1; `speed` = the share of its speed a fish keeps in it. */
export interface Permeable { item: number; kind: 'root' | 'stem'; min: V3; max: V3; cyl?: { x: number; z: number; r: number; y0: number; y1: number }; density: number; speed: number; hidden: boolean }

export interface FoodPatch { id: number; kind: 'graze' | 'sift'; surf: 'glass' | 'wood' | 'rock' | 'sand'; p: V3; n: V3; amount: number; regrowPerS: number }

export interface SandInfo { grain: string; depth: number; buryable: boolean }
export interface SurfaceHit { dist: number; n: V3; item: number | null; exact: boolean }

export interface AffordanceMap {
  places: Place[];
  solids: Solid[];
  hollows: Hollow[];
  perm: Permeable[];
  food: FoodPatch[];
  field: SwimField;
  counts(): Record<PlaceTag, number>;
  /** The nearest free place with one of the tags within `maxDist` (mm) of the point, or null. */
  find(tags: PlaceTag | PlaceTag[], x: number, y: number, z: number, maxDist: number, opts?: { minCover?: number; maxCover?: number; item?: number; ownedOk?: boolean }): Place | null;
  /** All places with the tags within `maxDist`, nearest first. */
  near(tags: PlaceTag | PlaceTag[], x: number, y: number, z: number, maxDist: number): Place[];
  /** The surface nearest a point: exact local shape when a hard piece is the nearest thing, else the swim field's distance and normal. */
  surfaceAt(x: number, y: number, z: number): SurfaceHit;
  /** Distance to the nearest hard piece (rock, wood, cave shell), negative inside the material; hollows are air. */
  hardDist(x: number, y: number, z: number): number;
  /** The hollow (cave, tube, half-log, arch, cork flat) the point is inside, and how deep (0 mouth .. 1 far end), else null. */
  hollowAt(x: number, y: number, z: number): { hollow: Hollow; depth: number } | null;
  /** Root mass or plant thicket the point is inside, else null. */
  permeableAt(x: number, y: number, z: number): Permeable | null;
  /** The sand layer under (x, z): its grain, depth and whether a fish can bury in it (sand or mud grain, deep enough). */
  sandAt(x: number, z: number): SandInfo;
  claim(p: Place, fish: number, owned?: boolean): boolean;
  release(p: Place, fish: number): void;
  graze(id: number, dt: number, rate: number): number;
  stepFood(dt: number): void;
}

const ROOTY = new Set(['spider', 'redmoor', 'manzanita']);
const SLOT_W = 60, SLOT_L = 35; // mm of floor one resting fish takes in a hollow
const MIN_BURY = 15;            // mm of sand a body needs to go under

const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const DIRS: V3[] = Array.from({ length: 20 }, (_, i) => { const y = 1 - 2 * (i + 0.5) / 20, r = Math.sqrt(1 - y * y), a = i * 2.399963; return [r * Math.cos(a), y, r * Math.sin(a)] as V3; });
const HDIRS: V3[] = Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4), 0, Math.sin(i * Math.PI / 4)] as V3);
function mulberry(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** The grain a setup's substrate is mostly made of, '' when it is not a water-tank bed. */
export function substrateGrain(S: TankSetup): string {
  const sub = S.substrate;
  if (!sub.show) return '';
  if (sub.type === 'custom') { const g = sub.custom.grains.slice().sort((a, b) => b.share - a.share)[0]; return g?.grain ?? 'gravel'; }
  return SUBSTRATE_TRAITS[sub.type]?.grain ?? 'gravel';
}

interface Plant { item: number; x: number; z: number; r: number; y0: number; y1: number }

export function buildAffordance(S: TankSetup, T: Tank, opts: { seed?: number; timing?: [string, number][] } = {}): AffordanceMap {
  let tm = performance.now();
  const mark = (n: string) => { const t = performance.now(); opts.timing?.push([n, Math.round(t - tm)]); tm = t; };
  const field = swimFieldFor({ S, T }).field;
  // the swim field treats caves as solid boxes and rocks as bounding boxes, which would hide every gap: the places are found against the
  // hard shapes below, and only the glass, floor and water line are read from a field built without any items
  const env = buildSwimField({ ...S, items: [] }, T);
  const solids: Solid[] = [], hollows: Hollow[] = [], plants: Plant[] = [], perm: Permeable[] = [];
  const itemById = new Map<number, Item>();

  // ---- 1. exact local shapes of every hard piece, hollows, plants --------------------------------------------------------
  for (const it of S.items) {
    if (it.variant === 'planter') continue;
    itemById.set(it.id, it);
    const base = groundHeight(S, T, it.x, it.depth) + it.lift - itemSink(it), a = it.yaw * D2R;
    const f: Frame = { cx: it.x, cy: base, cz: -it.depth, c: Math.cos(a), s: Math.sin(a) };
    const [l, h, w] = itemDims(it);
    if (it.kind === 'plant' || it.kind === 'artificial') {
      if (isFloat(it.variant) || (it.kind === 'plant' && isCarpet(it.variant))) continue;
      if (h >= 40) plants.push({ item: it.id, x: it.x, z: -it.depth, r: Math.max(3, Math.max(l, w) / 2 * 0.5), y0: base, y1: base + h });
      continue;
    }
    if (it.kind === 'stone' || it.kind === 'ornament') { solids.push(rboxSolid(it.id, it.kind === 'stone' ? 'rock' : 'ornament', f, l, h, w)); continue; }
    if (it.kind === 'coral') continue; // soft
    if (it.kind === 'cave') {
      if (it.variant === 'dish' || it.variant === 'stonedish') continue;
      const sh = it.variant === 'coconut' ? domeSolid(it.id, 'cave', f, it.size) : it.variant === 'arch' ? archSolid(it.id, 'cave', f, it.size) : shellFor(it.id, 'cave', f, it.variant, it.size);
      if (!sh) { solids.push(rboxSolid(it.id, 'cave', f, l, h, w)); continue; }
      solids.push(sh); const hol = hollowOf(sh, 'cave'); if (hol) hollows.push(hol);
      continue;
    }
    if (it.kind === 'wood') {
      if (!isLimbWood(it.variant)) { // cork flat (a lean-to) and cork tube: shells
        const sh = shellFor(it.id, 'wood', f, it.variant, it.size);
        if (sh) { solids.push(sh); const hol = hollowOf(sh, it.variant === 'corkflat' ? 'overhang' : 'cave'); if (hol) hollows.push(hol); }
        continue;
      }
      const limbs = woodLimbs(it.variant, it.seed, it.size, it.hs), mn: V3 = [1e9, 1e9, 1e9], mx: V3 = [-1e9, -1e9, -1e9];
      for (const lb of limbs) {
        const n = lb.pts.length - 1;
        for (let i = 0; i < n; i++) {
          const ra = lb.r0 + (lb.r1 - lb.r0) * i / n, rb = lb.r0 + (lb.r1 - lb.r0) * (i + 1) / n;
          const pa = toWorld(f, lb.pts[i] as V3), pb = toWorld(f, lb.pts[i + 1] as V3);
          solids.push(capSolid(it.id, 'wood', pa, pb, ra, rb));
          for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pa[k] - ra, pb[k] - rb); mx[k] = Math.max(mx[k], pa[k] + ra, pb[k] + rb); }
        }
      }
      if (ROOTY.has(it.variant) && limbs.length >= 4) {
        const density = Math.min(0.85, 0.25 + 0.5 * Math.min(1, limbs.length / 12));
        perm.push({ item: it.id, kind: 'root', min: mn, max: mx, density, speed: 1 - 0.8 * density, hidden: density > 0.4 });
      }
    }
  }
  for (const p of plants) {
    const it = itemById.get(p.item)!, stemmy = ['grass', 'stem', 'stemred', 'rotala', 'ludwigia', 'hairgrass', 'hornwort', 'anacharis', 'sagittaria', 'balansae'].includes(it.variant);
    const density = stemmy ? 0.6 : 0.4;
    perm.push({ item: p.item, kind: 'stem', min: [p.x - p.r, p.y0, p.z - p.r], max: [p.x + p.r, p.y1, p.z + p.r], cyl: { x: p.x, z: p.z, r: p.r, y0: p.y0, y1: p.y1 }, density, speed: 1 - 0.7 * density, hidden: density > 0.4 });
  }

  mark('shapes');
  // ---- 2. distance queries -----------------------------------------------------------------------------------------------
  // exact distance to the nearest hard piece, valid up to ~32 mm away (farther reads as 1e9): every solid sits in the 40 mm cells its bound
  // sphere (grown by 32 mm) touches, so a query loops a handful of shapes, not the hundreds of limbs of a root piece
  const XC = 40, XR = 32, xk = (i: number, j: number, k: number) => (i + 512) * 1048576 + (j + 512) * 1024 + (k + 512);
  const xcells = new Map<number, Solid[]>();
  for (const sh of solids) {
    const [bx, by, bz, br] = sh.bound, r = br + XR;
    for (let i = Math.floor((bx - r) / XC); i <= Math.floor((bx + r) / XC); i++) for (let j = Math.floor((by - r) / XC); j <= Math.floor((by + r) / XC); j++) for (let k = Math.floor((bz - r) / XC); k <= Math.floor((bz + r) / XC); k++) {
      const key = xk(i, j, k); (xcells.get(key) ?? xcells.set(key, []).get(key)!).push(sh);
    }
  }
  const exactDist = (x: number, y: number, z: number): number => {
    let best = 1e9;
    for (const s of xcells.get(xk(Math.floor(x / XC), Math.floor(y / XC), Math.floor(z / XC))) ?? []) {
      const b = s.bound, d = Math.hypot(x - b[0], y - b[1], z - b[2]) - b[3];
      if (d >= best) continue;
      const v = sdSolid(s, x, y, z);
      if (v < best) best = v;
    }
    return best;
  };
  // a coarse grid of the same distance (capped at CAP mm) so far-away queries cost one trilinear read; near a surface the exact loop answers
  const CAP = 48;
  let gx0 = 0, gy0 = 0, gz0 = 0, gc = 8, gnx = 0, gny = 0, gnz = 0, gdata = new Float32Array(0);
  if (solids.length) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    const box = (s: Solid): [number, number, number, number, number, number] => s.t === 'cap'
      ? [Math.min(s.a[0], s.b[0]) - s.r0 - CAP, Math.max(s.a[0], s.b[0]) + s.r1 + CAP, Math.min(s.a[1], s.b[1]) - s.r0 - CAP, Math.max(s.a[1], s.b[1]) + s.r1 + CAP, Math.min(s.a[2], s.b[2]) - s.r0 - CAP, Math.max(s.a[2], s.b[2]) + s.r1 + CAP]
      : [s.bound[0] - s.bound[3] - CAP, s.bound[0] + s.bound[3] + CAP, s.bound[1] - s.bound[3] - CAP, s.bound[1] + s.bound[3] + CAP, s.bound[2] - s.bound[3] - CAP, s.bound[2] + s.bound[3] + CAP];
    const boxes = solids.map(box);
    for (const b of boxes) { x0 = Math.min(x0, b[0]); x1 = Math.max(x1, b[1]); y0 = Math.min(y0, b[2]); y1 = Math.max(y1, b[3]); z0 = Math.min(z0, b[4]); z1 = Math.max(z1, b[5]); }
    gc = Math.max(8, Math.cbrt((x1 - x0) * (y1 - y0) * (z1 - z0) / 1500000));
    gx0 = x0; gy0 = y0; gz0 = z0; gnx = Math.ceil((x1 - x0) / gc) + 1; gny = Math.ceil((y1 - y0) / gc) + 1; gnz = Math.ceil((z1 - z0) / gc) + 1;
    gdata = new Float32Array(gnx * gny * gnz).fill(CAP);
    solids.forEach((sh, n) => {
      const b = boxes[n], i0 = Math.max(0, Math.floor((b[0] - gx0) / gc)), i1 = Math.min(gnx - 1, Math.ceil((b[1] - gx0) / gc)), j0 = Math.max(0, Math.floor((b[2] - gy0) / gc)), j1 = Math.min(gny - 1, Math.ceil((b[3] - gy0) / gc)), k0 = Math.max(0, Math.floor((b[4] - gz0) / gc)), k1 = Math.min(gnz - 1, Math.ceil((b[5] - gz0) / gc));
      for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const idx = i + gnx * (j + gny * k), v = sdSolid(sh, gx0 + i * gc, gy0 + j * gc, gz0 + k * gc);
        if (v < gdata[idx]) gdata[idx] = v;
      }
    });
  }
  const gridDist = (x: number, y: number, z: number): number => {
    const fx = (x - gx0) / gc, fy = (y - gy0) / gc, fz = (z - gz0) / gc;
    if (fx < 0 || fy < 0 || fz < 0 || fx >= gnx - 1 || fy >= gny - 1 || fz >= gnz - 1) return CAP;
    const i = fx | 0, j = fy | 0, k = fz | 0, tx = fx - i, ty = fy - j, tz = fz - k, o = i + gnx * (j + gny * k), sy = gnx, sz = gnx * gny, d = gdata;
    const a = d[o] * (1 - tx) + d[o + 1] * tx, b = d[o + sy] * (1 - tx) + d[o + sy + 1] * tx, c = d[o + sz] * (1 - tx) + d[o + sz + 1] * tx, e = d[o + sz + sy] * (1 - tx) + d[o + sz + sy + 1] * tx;
    return (a * (1 - ty) + b * ty) * (1 - tz) + (c * (1 - ty) + e * ty) * tz;
  };
  /** Distance (mm) to the nearest hard piece, negative inside the material; capped at about 48 (a far answer is "far"). Exact near a surface. */
  const hardDist = (x: number, y: number, z: number): number => {
    if (!solids.length) return CAP;
    const g = gridDist(x, y, z);
    return g > 14 ? g : exactDist(x, y, z);
  };
  /** Which of the hollows (if any) holds the point. Inside a hollow the shell's own SD is positive (air) except in its wall. */
  const hollowAt = (x: number, y: number, z: number) => {
    for (const h of hollows) { const d = h.inside(x, y, z); if (d >= 0) return { hollow: h, depth: d }; }
    return null;
  };
  const inCave = (x: number, y: number, z: number) => hollowAt(x, y, z)?.hollow.kind === 'cave';
  const plantDist = (x: number, y: number, z: number): number => {
    let best = 1e9;
    for (const p of plants) {
      const q = Math.hypot(x - p.x, z - p.z) - p.r, v = Math.abs(y - (p.y0 + p.y1) / 2) - (p.y1 - p.y0) / 2;
      best = Math.min(best, Math.min(Math.max(q, v), 0) + Math.hypot(Math.max(q, 0), Math.max(v, 0)));
    }
    return best;
  };
  const grad = (x: number, y: number, z: number): V3 => {
    const e = 1.5;
    return norm([hardDist(x + e, y, z) - hardDist(x - e, y, z), hardDist(x, y + e, z) - hardDist(x, y - e, z), hardDist(x, y, z + e) - hardDist(x, y, z - e)]);
  };
  const nearestItem = (x: number, y: number, z: number): number | null => {
    let best = 1e9, id: number | null = null;
    for (const s of solids) { const d = Math.hypot(x - s.bound[0], y - s.bound[1], z - s.bound[2]) - s.bound[3]; if (d >= best) continue; const v = sdSolid(s, x, y, z); if (v < best) { best = v; id = s.item; } }
    return id;
  };
  const fg: V3 = [0, 0, 0];
  const surfaceAt = (x: number, y: number, z: number): SurfaceHit => {
    const coarse = field.clearance(x, y, z, fg, 200), cn: V3 = [fg[0], fg[1], fg[2]];
    const hd = hardDist(x, y, z);
    if (hd < CAP - 1 && hd <= coarse + 1) return { dist: hd, n: grad(x, y, z), item: nearestItem(x, y, z), exact: true };
    return { dist: coarse, n: cn, item: null, exact: false };
  };
  const permeableAt = (x: number, y: number, z: number): Permeable | null => {
    for (const p of perm) {
      if (p.cyl) { if (Math.hypot(x - p.cyl.x, z - p.cyl.z) <= p.cyl.r && y >= p.cyl.y0 && y <= p.cyl.y1) return p; continue; }
      if (x >= p.min[0] - 8 && x <= p.max[0] + 8 && y >= p.min[1] - 8 && y <= p.max[1] + 8 && z >= p.min[2] - 8 && z <= p.max[2] + 8 && hardDist(x, y, z) < 22) return p;
    }
    return null;
  };
  const floorAt = (x: number, z: number) => field.floorAt(x, z);
  /** Share of 20 directions blocked within `range` by a hard piece (1) or a plant (.5). */
  const coverAt = (x: number, y: number, z: number, range = 130): number => {
    let n = 0;
    for (const d of DIRS) {
      let t = 3;
      while (t < range) {
        const px = x + d[0] * t, py = y + d[1] * t, pz = z + d[2] * t, hd = hardDist(px, py, pz);
        if (hd <= 0) { if (py <= floorAt(px, pz)) break; n += 1; break; } // material below the sand is no cover
        const pd = plants.length ? plantDist(px, py, pz) : 1e9;
        if (pd <= 0) { n += 0.5; break; }
        t += Math.max(3, Math.min(hd, pd));
      }
    }
    return n / DIRS.length;
  };
  const clearOk = (x: number, y: number, z: number, r: number) => env.clearance(x, y, z, undefined, r + 1) > r;
  const runFree = (x: number, y: number, z: number, d: V3, len: number): boolean => {
    for (let t = 6; t <= len;) { const px = x + d[0] * t, py = y + d[1] * t, pz = z + d[2] * t, hd = hardDist(px, py, pz); if (hd <= 1 || !clearOk(px, py, pz, 1)) return false; t += Math.max(6, hd * 0.8); }
    return true;
  };

  mark('dist grid + helpers');
  // ---- 3. places ---------------------------------------------------------------------------------------------------------
  const places: Place[] = [];
  const add = (tag: PlaceTag, p: V3, n: V3, cover: number, capacity: number, item: number | null, extra: Partial<Place> = {}) => places.push({ id: places.length, tag, p, n, cover, capacity, item, owner: null, users: 0, ...extra });

  // caves: cave-in at the inner floor, cave-mouth just outside each way in
  for (const h of hollows) {
    const fit = h.floorW * h.floorL / (SLOT_W * SLOT_L);
    if (h.kind === 'overhang') continue; // the cork flat's underside is found as an overhang below
    const innerH = h.solid.t === 'dome' ? 0.93 * h.solid.R * 0.92 : h.solid.t === 'shell' ? h.solid.R - h.solid.w : h.solid.t === 'arch' ? h.solid.R0 - h.solid.tr : 0;
    if (innerH < 14) continue; // no pilot fits
    const fl = floorAt(h.centre[0], h.centre[2]), c: V3 = [h.centre[0], Math.max(fl, h.centre[1]) + 6, h.centre[2]];
    add('cave-in', c, h.mouths[0].dir, Math.max(coverAt(c[0], c[1], c[2]), 0.7), Math.max(1, Math.min(6, Math.floor(fit))), h.item);
    for (const m of h.mouths) {
      const out = Math.max(8, 0.15 * m.w), p: V3 = [m.p[0] + m.dir[0] * out, Math.max(floorAt(m.p[0] + m.dir[0] * out, m.p[2] + m.dir[2] * out) + 6, m.p[1]), m.p[2] + m.dir[2] * out];
      add('cave-mouth', p, m.dir, coverAt(p[0], p[1], p[2]), 2, h.item);
    }
  }

  // sampling box round the hard pieces
  const gridOver = (step: number, margin: number, fn: (x: number, y: number, z: number) => void) => {
    if (!solids.length) return;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const s of solids) { const b = s.bound; x0 = Math.min(x0, b[0] - b[3]); x1 = Math.max(x1, b[0] + b[3]); y0 = Math.min(y0, b[1] - b[3]); y1 = Math.max(y1, b[1] + b[3]); z0 = Math.min(z0, b[2] - b[3]); z1 = Math.max(z1, b[2] + b[3]); }
    x0 = Math.max(0.5 * step, x0 - margin); x1 = Math.min(field.max[0], x1 + margin); z0 = Math.max(field.min[2], z0 - margin); z1 = Math.min(0, z1 + margin); y1 = Math.min(field.waterTop, y1 + margin);
    for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) {
      const fl = floorAt(x, z);
      for (let y = Math.max(fl + 10, y0 - margin); y <= y1; y += step) fn(x, y, z);
    }
  };
  /** Keep the best of each crowd: greedy by score, nothing within `radius` of one kept. */
  const thin = <T extends { p: V3; score: number }>(list: T[], radius: number): T[] => {
    const out: T[] = [], cell = new Map<string, T[]>(), key = (v: number) => Math.floor(v / radius);
    for (const c of list.sort((a, b) => b.score - a.score)) {
      let ok = true;
      for (let i = -1; i <= 1 && ok; i++) for (let j = -1; j <= 1 && ok; j++) for (let k = -1; k <= 1 && ok; k++) for (const o of cell.get(`${key(c.p[0]) + i},${key(c.p[1]) + j},${key(c.p[2]) + k}`) ?? []) if (Math.hypot(o.p[0] - c.p[0], o.p[1] - c.p[1], o.p[2] - c.p[2]) < radius) { ok = false; break; }
      if (!ok) continue;
      out.push(c); const k = `${key(c.p[0])},${key(c.p[1])},${key(c.p[2])}`; (cell.get(k) ?? cell.set(k, []).get(k)!).push(c);
    }
    return out;
  };

  mark('caves');
  // overhangs: free spot under a roof at least ~5 cm wide, open on at least one side, not inside a hollow
  const ceiling = (x: number, y: number, z: number): number => { for (let t = 5; t <= 205;) { const hd = hardDist(x, y + t, z); if (hd <= 0) return t; t += Math.max(4, hd * 0.8); } return 1e9; };
  const ov: { p: V3; n: V3; cover: number; score: number; item: number | null }[] = [];
  gridOver(20, 100, (x, y, z) => {
    const hd = hardDist(x, y, z);
    if (hd < 9 || !clearOk(x, y, z, 9) || inCave(x, y, z)) return;
    const t = ceiling(x, y, z);
    if (t < 12 || t > 200) return;
    let cols = 0;
    for (const [dx, dz] of [[15, 0], [-15, 0], [0, 15], [0, -15]]) if (ceiling(x + dx, y, z + dz) <= t + 30) cols++;
    if (cols < 2) return;
    let nx = 0, nz = 0, open = 0;
    for (const d of HDIRS) if (runFree(x, y, z, d, 100)) { nx += d[0]; nz += d[2]; open++; }
    if (!open) return;
    const cov = coverAt(x, y, z);
    if (cov < 0.2 || cov > 0.92) return;
    ov.push({ p: [x, y, z], n: norm([nx, 0, nz]), cover: cov, score: cov, item: nearestItem(x, y + t, z) });
  });
  for (const o of thin(ov, 50).slice(0, 80)) add('overhang', o.p, o.n, o.cover, Math.max(1, Math.round(70 / 60)), o.item);

  mark('overhang');
  // crevices: a slot 6..46 mm wide between two hard pieces, running at least 55 mm open along it
  const cr: { p: V3; n: V3; cover: number; score: number; width: number; item: number | null }[] = [];
  const hit = (x: number, y: number, z: number, d: V3, max: number): number => { for (let t = 3; t <= max;) { const hd = hardDist(x + d[0] * t, y + d[1] * t, z + d[2] * t); if (hd <= 0) return t; t += Math.max(3, hd * 0.8); } return 1e9; };
  gridOver(10, 30, (x, y, z) => {
    const hd = hardDist(x, y, z);
    if (hd < 3 || hd > 24 || !clearOk(x, y, z, 3) || inCave(x, y, z)) return;
    for (let i = 0; i < 4; i++) {
      const d = HDIRS[i], e = HDIRS[(i + 2) % 8], a = hit(x, y, z, d, 46), b = a > 46 ? 1e9 : hit(x, y, z, [-d[0], 0, -d[2]], 46);
      if (a + b > 46 || a < 3 || b < 3) continue;
      if (!(runFree(x, y, z, e, 55) || runFree(x, y, z, [-e[0], 0, -e[2]], 55))) continue;
      const cov = coverAt(x, y, z, 100);
      if (cov < 0.4) continue;
      const open = runFree(x, y, z, e, 55) ? e : ([-e[0], 0, -e[2]] as V3);
      cr.push({ p: [x, y, z], n: open, cover: cov, score: cov - Math.abs(a - b) / 100, width: a + b, item: nearestItem(x + d[0] * a, y, z + d[2] * a) });
      return;
    }
  });
  for (const c of thin(cr, 45).slice(0, 80)) add('crevice', c.p, c.n, c.cover, 1, c.item, { width: c.width });

  mark('crevice');
  // root masses and thickets: one place in the middle of each permeable volume
  for (const pv of perm) {
    const c: V3 = pv.cyl ? [pv.cyl.x, pv.cyl.y0 + 0.4 * (pv.cyl.y1 - pv.cyl.y0), pv.cyl.z] : [(pv.min[0] + pv.max[0]) / 2, (pv.min[1] + pv.max[1]) / 2, (pv.min[2] + pv.max[2]) / 2];
    const vol = pv.cyl ? Math.PI * pv.cyl.r ** 2 * (pv.cyl.y1 - pv.cyl.y0) : (pv.max[0] - pv.min[0]) * (pv.max[1] - pv.min[1]) * (pv.max[2] - pv.min[2]);
    add(pv.kind === 'root' ? 'root-mass' : 'stem-thicket', c, [0, 1, 0], Math.min(1, pv.density + 0.1), Math.max(1, Math.min(8, Math.round(vol / 60000))), pv.item);
  }

  mark('roots');
  // open sand / gravel: free floor, little cover, gentle slope
  const grain = substrateGrain(S), sandy = grain === 'sand' || grain === 'mud', stepF = 70;
  for (let x = stepF / 2; x < field.max[0]; x += stepF) for (let z = field.min[2] + stepF / 2; z < 0; z += stepF) {
    const fl = floorAt(x, z), y = fl + 18;
    if (!clearOk(x, y, z, 15) || hardDist(x, y, z) < 30 || hollowAt(x, y, z) || (plants.length && plantDist(x, y, z) < 12)) continue;
    const sx = (floorAt(x + 20, z) - floorAt(x - 20, z)) / 40, sz = (floorAt(x, z + 20) - floorAt(x, z - 20)) / 40;
    if (Math.hypot(sx, sz) > 0.47) continue; // steeper than 25 degrees
    const cov = coverAt(x, y, z, 100);
    if (cov > 0.35) continue;
    const free = Math.min(hardDist(x, y, z), env.clearance(x, y, z, undefined, 150));
    add(sandy ? 'open-sand' : 'open-gravel', [x, fl, z], norm([-sx, 1, -sz]), cov, Math.max(1, Math.min(8, Math.round(free / 25))), null);
  }

  mark('sand');
  // glass: panes seen from inside, one place per ~9 cm of pane, between the floor and the water line
  const gl = new Map<string, boolean>();
  const g: V3 = [0, 0, 0];
  for (let x = 25; x < field.max[0]; x += 50) for (let z = field.min[2] + 25; z < 0; z += 50) for (let y = 35; y < field.waterTop - 25; y += 50) {
    if (y < floorAt(x, z) + 30) continue;
    const c = env.clearance(x, y, z, g, 60);
    if (c <= 0 || c > 30 || g[1] > 0.5 || g[1] < -0.5) continue; // a side or back wall, not floor or surface
    if (hardDist(x, y, z) < 40 || (plants.length && plantDist(x, y, z) < 20)) continue;
    const wp: V3 = [x - g[0] * c, y - g[1] * c, z - g[2] * c], k = `${Math.round(wp[0] / 90)},${Math.round(wp[1] / 90)},${Math.round(wp[2] / 90)}`;
    if (gl.has(k)) continue;
    gl.set(k, true);
    add('glass', wp, [g[0], g[1], g[2]], 0, 2, null);
  }

  mark('glass');
  // surface: the water line, for fish that gulp air
  for (let x = 60; x < field.max[0]; x += 120) for (let z = field.min[2] + 60; z < 0; z += 120) {
    if (env.clearance(x, field.waterTop - 14, z, undefined, 20) < 10) continue;
    add('surface', [x, field.waterTop, z], [0, -1, 0], 0, 2, null);
  }

  mark('surface');
  // ---- 4. the place index --------------------------------------------------------------------------------------------------
  const CELL = 100, cellOf = (v: number) => Math.floor(v / CELL), hk = (i: number, j: number, k: number) => (i + 512) * 1048576 + (j + 512) * 1024 + (k + 512);
  const hash = new Map<number, Place[]>();
  for (const p of places) { const k = hk(cellOf(p.p[0]), cellOf(p.p[1]), cellOf(p.p[2])); (hash.get(k) ?? hash.set(k, []).get(k)!).push(p); }
  const near = (tags: PlaceTag | PlaceTag[], x: number, y: number, z: number, maxDist: number): Place[] => {
    const set = Array.isArray(tags) ? tags : [tags], out: { p: Place; d: number }[] = [], r = Math.ceil(maxDist / CELL);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) for (const p of hash.get(hk(cellOf(x) + i, cellOf(y) + j, cellOf(z) + k)) ?? []) {
      if (!set.includes(p.tag)) continue;
      const d = Math.hypot(p.p[0] - x, p.p[1] - y, p.p[2] - z);
      if (d <= maxDist) out.push({ p, d });
    }
    return out.sort((a, b) => a.d - b.d).map(o => o.p);
  };
  const find: AffordanceMap['find'] = (tags, x, y, z, maxDist, o = {}) =>
    near(tags, x, y, z, maxDist).find(p => (o.minCover == null || p.cover >= o.minCover) && (o.maxCover == null || p.cover <= o.maxCover) && (o.item == null || p.item === o.item) && (o.ownedOk || p.owner == null) && p.users < p.capacity) ?? null;

  // ---- 5. food patches -----------------------------------------------------------------------------------------------------
  const rnd = mulberry(opts.seed ?? (S.items.length * 977 + Math.round(T.L)));
  const food: FoodPatch[] = [];
  const addFood = (kind: FoodPatch['kind'], surf: FoodPatch['surf'], p: V3, n: V3) => food.push({ id: food.length, kind, surf, p, n, amount: 1, regrowPerS: 1 / 420 });
  const glassPlaces = places.filter(p => p.tag === 'glass' && p.p[1] < 0.65 * field.waterTop);
  glassPlaces.forEach((p, i) => { if (i % 3 === 0) addFood('graze', 'glass', p.p, p.n); });
  const byItem = new Map<number, Solid[]>();
  for (const s of solids) (byItem.get(s.item) ?? byItem.set(s.item, []).get(s.item)!).push(s);
  for (const [id, ss] of byItem) {
    const it = itemById.get(id)!;
    if (it.kind === 'wood' && ss[0].t === 'cap') {
      for (let k = 0; k < Math.min(4, Math.ceil(ss.length / 6)); k++) {
        const s = ss[Math.floor(rnd() * ss.length)];
        if (s.t !== 'cap') continue;
        const t = rnd(), c: V3 = [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t, s.a[2] + (s.b[2] - s.a[2]) * t], d = norm([rnd() - 0.5, rnd() - 0.2, rnd() - 0.5]);
        for (let u = 0; u < 80; u += 1) { const px = c[0] + d[0] * u, py = c[1] + d[1] * u, pz = c[2] + d[2] * u; if (hardDist(px, py, pz) > 0.5) { addFood('graze', 'wood', [px, py, pz], grad(px, py, pz)); break; } }
      }
    } else if (it.kind === 'stone') {
      const s = ss[0], c: V3 = [s.bound[0], s.bound[1], s.bound[2]];
      for (let k = 0; k < 3; k++) {
        const d = norm([rnd() - 0.5, rnd() * 0.8 - 0.1, rnd() - 0.5]);
        for (let u = 0; u < s.bound[3] + 4; u += 1) { const px = c[0] + d[0] * u, py = c[1] + d[1] * u, pz = c[2] + d[2] * u; if (hardDist(px, py, pz) > 0.5) { addFood('graze', 'rock', [px, py, pz], grad(px, py, pz)); break; } }
      }
    }
  }
  places.filter(p => p.tag === 'open-sand').forEach((p, i) => { if (i % 2 === 0) addFood('sift', 'sand', p.p, p.n); });

  mark('food');
  // ---- 6. the map ----------------------------------------------------------------------------------------------------------
  const sandAt = (x: number, z: number): SandInfo => {
    const depth = groundHeight(S, T, x, -z);
    return { grain, depth, buryable: (grain === 'sand' || grain === 'mud') && depth >= MIN_BURY };
  };
  return {
    places, solids, hollows, perm, food, field,
    counts: () => { const o = Object.fromEntries(PLACE_TAGS.map(t => [t, 0])) as Record<PlaceTag, number>; for (const p of places) o[p.tag]++; return o; },
    find, near, surfaceAt, hardDist, hollowAt, permeableAt, sandAt,
    claim: (p, fish, owned = false) => { if (owned) { if (p.owner != null && p.owner !== fish) return false; p.owner = fish; return true; } if (p.users >= p.capacity) return false; p.users++; return true; },
    release: (p, fish) => { if (p.owner === fish) p.owner = null; else if (p.users > 0) p.users--; },
    graze: (id, dt, rate) => { const f = food[id]; if (!f) return 0; const take = Math.min(f.amount, rate * dt); f.amount -= take; return take; },
    stepFood: dt => { for (const f of food) f.amount = Math.min(1, f.amount + f.regrowPerS * dt); },
  };
}
