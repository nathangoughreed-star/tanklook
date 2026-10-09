// Aquascape items (scene v9): the library of placeable rocks, wood, caves and plants, the pure shape skeletons the
// renderer builds them from (so placement code can find a branch to tie a fern to without three.js), and the starter
// sets that replace the old fixed layouts. All sizes physical (mm): a bigger tank gets more pieces, not bigger ones.
import { rng } from '../art/paint';
import { PLANT_ASPECT, type PlantType } from '../art/plants';
import { clamp, D2R } from './physics';
import { clampIn, shapeOf } from './shape';
import { groundHeight } from './terrain';
import type { Item, ItemKind, LayoutId, Tank, TankSetup } from './types';

export interface Variant { kind: ItemKind; label: string; hint: string; size: number; min: number; max: number }
export const LIBRARY: Record<string, Variant> = {
  river: { kind: 'stone', label: 'River stone', hint: 'Smooth, rounded, brown-grey.', size: 110, min: 15, max: 600 },
  seiryu: { kind: 'stone', label: 'Seiryu', hint: 'Upright blue-grey crag with pale veins.', size: 130, min: 20, max: 600 },
  dragon: { kind: 'stone', label: 'Dragon stone', hint: 'Clay-brown, pitted with holes.', size: 140, min: 20, max: 600 },
  lava: { kind: 'stone', label: 'Lava rock', hint: 'Dark red-brown, rough and porous.', size: 90, min: 15, max: 500 },
  slate: { kind: 'stone', label: 'Slate', hint: 'Flat layered slab; stack them into ledges.', size: 150, min: 30, max: 600 },
  branch: { kind: 'wood', label: 'Driftwood branch', hint: 'A rising trunk with side branches.', size: 380, min: 80, max: 1500 },
  spider: { kind: 'wood', label: 'Spider wood', hint: 'Thin pale roots spreading from a knot.', size: 320, min: 80, max: 1200 },
  manzanita: { kind: 'wood', label: 'Manzanita', hint: 'A red-brown tree that forks into fine twigs. Size = height.', size: 300, min: 80, max: 1200 },
  mopani: { kind: 'wood', label: 'Mopani', hint: 'A chunky two-tone piece, dark and honey.', size: 200, min: 60, max: 800 },
  arch: { kind: 'cave', label: 'Stone arch', hint: 'A rock arch to swim through.', size: 170, min: 50, max: 600 },
  tube: { kind: 'cave', label: 'Clay tube', hint: 'A terracotta spawning tube (plecos, cichlids).', size: 130, min: 40, max: 400 },
  coconut: { kind: 'cave', label: 'Coconut cave', hint: 'Half a coconut shell with a doorway.', size: 110, min: 50, max: 250 },
  fern: { kind: 'plant', label: 'Java fern', hint: 'Grows on wood and rock. Size = height.', size: 150, min: 30, max: 450 },
  anubias: { kind: 'plant', label: 'Anubias', hint: 'Grows on wood and rock. Size = height.', size: 90, min: 25, max: 300 },
  sword: { kind: 'plant', label: 'Amazon sword', hint: 'A big rosette. Size = height.', size: 250, min: 50, max: 600 },
  grass: { kind: 'plant', label: 'Vallisneria', hint: 'Tall grass-like leaves. Size = height.', size: 280, min: 40, max: 900 },
  stem: { kind: 'plant', label: 'Stem plant', hint: 'Size = height.', size: 220, min: 40, max: 900 },
  stemred: { kind: 'plant', label: 'Red stem plant', hint: 'Size = height.', size: 220, min: 40, max: 900 },
  carpet: { kind: 'plant', label: 'Carpet patch', hint: 'A low carpet plant. Size = patch width.', size: 160, min: 60, max: 400 },
};
export const KINDS: Record<ItemKind, string> = { stone: 'Stones', wood: 'Wood', cave: 'Caves', plant: 'Plants' };
export const MAX_ITEMS = 600;
/** Carpet cards, mm (about 3 cm tall, like a trimmed Monte Carlo carpet). */
export const CARPET_W = 100, CARPET_H = CARPET_W * PLANT_ASPECT.carpet;

export const LAYOUTS: Record<LayoutId, { label: string; hint: string }> = {
  none: { label: 'Bare tank', hint: 'No rocks, wood or plants.' },
  stones: { label: 'River stones', hint: 'A pile of smooth stones in the centre.' },
  driftwood: { label: 'Driftwood', hint: 'Branchy wood with java fern and anubias.' },
  planted: { label: 'Dense planted', hint: 'Stem plants and grasses at the back, swords, a carpet in front.' },
  iwagumi: { label: 'Iwagumi', hint: 'Angular stones on a low carpet.' },
  swamp: { label: 'Swamp / paludarium', hint: 'Land rising out of the water around one or two pools; fish stay in the water. Lowers the water when chosen.' },
};

type V3 = [number, number, number];
/** One wood limb: a smooth tube through `pts` (local mm, base on y = 0), radius r0 -> r1; tone 1 = a darker piece. */
export interface Limb { pts: V3[]; r0: number; r1: number; tone: number }

/** Stone length, height and width (mm) for its variant and seed. */
export function stoneDims(variant: string, seed: number, size: number): V3 {
  const r = rng(seed * 31 + 7);
  const [h0, h1, w0, w1] = ({ river: [0.45, 0.65, 0.7, 0.85], seiryu: [0.9, 1.4, 0.55, 0.75], dragon: [0.55, 0.9, 0.6, 0.8], lava: [0.5, 0.8, 0.65, 0.85], slate: [0.12, 0.24, 0.5, 0.8] } as Record<string, number[]>)[variant] ?? [0.6, 0.6, 0.7, 0.7];
  return [size, size * (h0 + r() * (h1 - h0)), size * (w0 + r() * (w1 - w0))];
}

const add3 = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm3 = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** The point a fraction t along a polyline (by length). */
export function along(pts: V3[], t: number): V3 {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2])), total = seg.reduce((a, b) => a + b, 0);
  let s = clamp(t, 0, 1) * total;
  for (let i = 0; i < seg.length; i++) {
    if (s <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, s / seg[i]) : 0; return pts[i].map((v, j) => v + (pts[i + 1][j] - v) * k) as V3; }
    s -= seg[i];
  }
  return pts[pts.length - 1];
}

/** The limbs of a piece of wood, in its own frame: length along x, centred, base on y = 0. */
export function woodLimbs(variant: string, seed: number, size: number): Limb[] {
  const r = rng(seed * 17 + 3), s = size, j = (k: number) => (r() - 0.5) * k * s;
  if (variant === 'spider') {
    const rad = 0.022 * s, c: V3 = [0, 0.05 * s, 0], out: Limb[] = [{ pts: [[-0.03 * s, 0.02 * s, 0], c, [0.04 * s, 0.09 * s, 0.01 * s]], r0: rad * 2.2, r1: rad * 1.6, tone: 0 }];
    const n = 7 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.6, d: V3 = [Math.cos(a), 0, Math.sin(a) * 0.75], len = (0.36 + r() * 0.16) * s;
      const droop = r() < 0.35, rise = droop ? 0 : (0.25 + r() * 0.75) * len;
      const p1 = add3(add3(c, d, len * 0.3), [j(0.06), rise * 0.35 + (droop ? 0.02 * s : 0), j(0.06)]);
      const p2 = add3(add3(c, d, len * 0.65), [j(0.08), droop ? 0.03 * s : rise * 0.7, j(0.08)]);
      const p3 = add3(add3(c, d, len), [j(0.06), droop ? 0.01 * s : rise, j(0.06)]);
      out.push({ pts: [c, p1, p2, p3], r0: rad * (0.8 + r() * 0.5), r1: rad * 0.25, tone: 0 });
    }
    return out;
  }
  if (variant === 'manzanita') {
    const out: Limb[] = [];
    const grow = (p: V3, d: V3, len: number, rad: number, depth: number) => {
      const end = add3(p, d, len), m1 = add3(along([p, end], 0.35), [j(0.03), 0, j(0.03)]), m2 = add3(along([p, end], 0.7), [j(0.03), 0, j(0.03)]);
      out.push({ pts: [p, m1, m2, end], r0: rad, r1: rad * 0.7, tone: 0 });
      if (depth <= 0) return;
      const kids = depth > 1 && r() < 0.3 ? 3 : 2;
      for (let k = 0; k < kids; k++) {
        // turn away from the parent by 25-45° about a random sideways axis, with a slight pull upward
        const ang = (25 + r() * 20) * D2R, side = norm3([r() - 0.5, (r() - 0.5) * 0.2, r() - 0.5]);
        const perp = norm3(add3(side, d, -(side[0] * d[0] + side[1] * d[1] + side[2] * d[2])));
        const nd = norm3(add3(add3([d[0] * Math.cos(ang), d[1] * Math.cos(ang), d[2] * Math.cos(ang)], perp, Math.sin(ang) * (k % 2 ? -1 : 1)), [0, 0.15, 0]));
        grow(end, nd, len * (0.62 + r() * 0.12), rad * 0.62, depth - 1);
      }
    };
    grow([0, 0, 0], norm3([(r() - 0.5) * 0.3, 1, (r() - 0.5) * 0.3]), 0.36 * s, 0.045 * s, 3);
    for (let k = 0; k < 3; k++) { const a = r() * Math.PI * 2, l = (0.12 + r() * 0.1) * s; out.push({ pts: [[0, 0.03 * s, 0], [Math.cos(a) * l * 0.5, 0.02 * s, Math.sin(a) * l * 0.5], [Math.cos(a) * l, 0.008 * s, Math.sin(a) * l]], r0: 0.03 * s, r1: 0.01 * s, tone: 0 }); }
    return out;
  }
  if (variant === 'mopani') {
    const rad = 0.11 * s, main: V3[] = [[-0.42 * s, 0.09 * s, j(0.08)], [-0.18 * s, 0.26 * s + j(0.06), j(0.1)], [0.12 * s, 0.28 * s + j(0.06), j(0.1)], [0.4 * s, 0.08 * s, j(0.08)]];
    const p = along(main, 0.45 + r() * 0.15);
    return [
      { pts: main, r0: rad, r1: rad * 0.75, tone: 0 },
      { pts: [p, add3(p, [0.05 * s + j(0.08), 0.15 * s, 0.04 * s]), add3(p, [0.08 * s + j(0.1), 0.3 * s, 0.06 * s + j(0.06)])], r0: rad * 0.6, r1: rad * 0.28, tone: 0 },
    ];
  }
  // 'branch': a trunk rising from one end, three side branches and a lower limb (the old driftwood layout, as a piece)
  const rad = 0.055 * s;
  const trunk: V3[] = [[-0.42 * s, 0.3 * rad, 0.14 * s], [-0.16 * s, 0.2 * s + j(0.04), 0.05 * s + j(0.04)], [0.12 * s, 0.4 * s + j(0.05), -0.02 * s], [0.34 * s, 0.6 * s + j(0.05), -0.05 * s + j(0.05)]];
  const out: Limb[] = [{ pts: trunk, r0: rad, r1: rad * 0.35, tone: 0 }];
  for (const [t, dir, len] of [[0.45, -1, 0.3], [0.62, 1, 0.24], [0.3, 1, 0.2]] as const) {
    const p0 = along(trunk, t), dx = dir * len * s;
    out.push({ pts: [p0, add3(p0, [dx * 0.5, 0.11 * s, 0.05 * s]), add3(p0, [dx, 0.2 * s, j(0.14)])], r0: rad * 0.5, r1: rad * 0.18, tone: 0 });
  }
  out.push({ pts: [[0.5 * s, 0.25 * rad, 0.2 * s], [0.3 * s, 0.07 * s, 0.1 * s], [0.08 * s, 0.06 * s, -0.08 * s]], r0: rad * 0.75, r1: rad * 0.3, tone: 1 });
  return out;
}

/** Overall size of a piece: [length, height, width] in its own frame, mm (plants: card width, height, width). */
export function itemDims(it: Pick<Item, 'kind' | 'variant' | 'seed' | 'size'>): V3 {
  const s = it.size;
  if (it.kind === 'stone') return stoneDims(it.variant, it.seed, s);
  if (it.kind === 'plant') return it.variant === 'carpet' ? [s, CARPET_H, s] : [s / PLANT_ASPECT[it.variant as PlantType], s, s / PLANT_ASPECT[it.variant as PlantType]];
  if (it.kind === 'cave') return it.variant === 'arch' ? [s, 0.5 * s, 0.45 * s] : it.variant === 'tube' ? [s, 0.42 * s, 0.42 * s] : [s, 0.5 * s, s];
  return it.variant === 'manzanita' ? [0.7 * s, s, 0.7 * s] : it.variant === 'spider' ? [s, 0.5 * s, 0.8 * s] : it.variant === 'mopani' ? [s, 0.45 * s, 0.3 * s] : [s, 0.65 * s, 0.45 * s];
}

/** How far into the ground a piece is set, mm (stones nest in, plants are planted). */
export function itemSink(it: Item): number {
  if (it.kind === 'plant') return 4;
  const h = itemDims(it)[1];
  return it.kind === 'stone' ? 0.08 * h : it.kind === 'cave' ? 0.03 * h : 0;
}

/** Keep a piece's anchor inside the glass (by most of its half-width) and its size within its variant's range and the tank. */
export function clampItem(it: Item, T: Tank) {
  const v = LIBRARY[it.variant];
  if (v) {
    let max = v.max;
    if (it.kind === 'plant' && it.variant !== 'carpet') max = Math.min(max, (Math.min(T.L, T.D) - 6) * PLANT_ASPECT[it.variant as PlantType], T.H * 1.5);
    else max = Math.min(max, Math.max(T.L, T.D) * 1.1);
    it.size = Math.round(clamp(it.size, Math.min(v.min, max), max));
  }
  const [l, , w] = itemDims(it), half = it.kind === 'plant' && it.variant !== 'carpet' ? l / 2 + 3 : Math.max(l, w) * 0.35;
  const inset = Math.min(half, Math.min(T.L, T.D) * 0.45);
  it.x = clamp(it.x, inset, T.L - inset); it.depth = clamp(it.depth, inset, T.D - inset);
  if (shapeOf(T) !== 'rect') ({ x: it.x, depth: it.depth } = clampIn(T, it.x, it.depth, inset));
  it.lift = clamp(it.lift, 0, T.H);
  it.yaw = ((it.yaw + 540) % 360) - 180;
  it.tilt = clamp(it.tilt, -45, 45);
}

/** A point of a piece's own frame in the tank (x, depth, height above the floor), turned by its yaw (tilt ignored). */
export function itemToTank(S: TankSetup, it: Item, p: V3) {
  const c = Math.cos(it.yaw * D2R), s = Math.sin(it.yaw * D2R);
  return { x: it.x + p[0] * c + p[2] * s, depth: it.depth - (-p[0] * s + p[2] * c), y: groundHeight(S, S.tank, it.x, it.depth) + it.lift - itemSink(it) + p[1] };
}

export const nextItemId = (s: TankSetup) => s.items.reduce((m, it) => Math.max(m, it.id), 0) + 1;

/** A new item of `variant` at (x, depth), its default size (clamped to the tank), facing the glass. */
export function makeItem(T: Tank, variant: string, id: number, seed: number, x: number, depth: number, extra: Partial<Item> = {}): Item {
  const v = LIBRARY[variant];
  const it: Item = { id, kind: v.kind, variant, seed, x, depth, lift: 0, yaw: 0, tilt: 0, size: v.size, ...extra };
  clampItem(it, T);
  return it;
}

/**
 * Starter set: the old preset layouts, now placing ordinary editable items. Deterministic in (layout, tank, ground).
 */
export function starterItems(S: TankSetup): Item[] {
  const T = S.tank, { L, H, D } = T, id = S.layout.id, out: Item[] = [];
  if (id === 'none') return out;
  const r = rng(S.layout.seed * 7919 + id.length * 104729), sub = (x: number, d: number) => groundHeight(S, T, x, d);
  const seed = () => 1 + Math.floor(r() * 1e9);
  const put = (variant: string, x: number, d: number, size: number, o: Partial<Item> = {}) => {
    const it = makeItem(T, variant, out.length + 1, seed(), x, d, { yaw: Math.round((r() - 0.5) * 360), size: Math.round(size), ...o });
    out.push(it); return it;
  };
  const room = (x: number, d: number, lift = 0) => H - sub(x, d) - lift - 15; // headroom to the water line
  /** A plant (crossed cards, facing the glass give or take 15°); too little headroom = left out. */
  const plant = (type: PlantType, x: number, d: number, h: number, lift = 0) => {
    const hh = Math.min(h, room(x, d, lift), (Math.min(L, D) - 6) * PLANT_ASPECT[type]);
    if (hh > 15) put(type, x, d, hh, { yaw: Math.round((r() - 0.5) * 30), lift });
  };
  const carpet = (d0: number, d1: number, skip?: (x: number, d: number) => boolean) => {
    for (let d = D * d0 + 45; d <= D * d1; d += 95) for (let x = 60 + r() * 30; x < L - 40; x += 115 + r() * 25) {
      const xx = x + (r() - 0.5) * 30, dd = d + (r() - 0.5) * 20;
      if (!skip?.(xx, dd)) put('carpet', xx, dd, 140 + r() * 30);
    }
  };

  if (id === 'stones') {
    const s0 = clamp(Math.min(L, D * 1.6, H * 1.4) * 0.22, 50, 180), cx = L * (0.45 + r() * 0.1), cz = D * 0.5;
    const main = put('river', cx, cz, s0 * 1.4);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.5, s = s0 * (0.4 + r() * 0.35), dist = s0 * (0.65 + r() * 0.35);
      put('river', cx + Math.cos(a) * dist, clamp(cz + Math.sin(a) * dist * 0.7, s * 0.5, D - s * 0.5), s * (1 + r() * 0.4));
    }
    const top = itemDims(main)[1] * 0.8;
    for (let i = 0; i < 2; i++) { const s = s0 * (0.35 + r() * 0.15); put('river', cx + (r() - 0.5) * s0 * 0.5, cz + (r() - 0.5) * s0 * 0.3, s * 1.1, { lift: top }); }
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, dist = s0 * (1.1 + r() * 1.0), s = 12 + r() * 16;
      put('river', clamp(cx + Math.cos(a) * dist, 20, L - 20), clamp(cz + Math.sin(a) * dist * 0.6, 20, D - 20), s * 1.2);
    }
  } else if (id === 'iwagumi') {
    const left = r() < 0.5, side = left ? 1 : -1, mx = L * (left ? 0.38 : 0.62), mh = clamp(H * 0.5, 70, 330);
    const spots: V3[] = [[mx, D * 0.55, 1], [mx + side * L * 0.2, D * 0.45, 0.6], [mx - side * L * 0.16, D * 0.7, 0.45], [mx + side * L * 0.36, D * 0.3, 0.3], [mx - side * L * 0.3, D * 0.35, 0.22]];
    const placed: V3[] = [];
    for (const [x, d, k] of spots) {
      const h = mh * k, it = put('seiryu', clamp(x, h * 0.4, L - h * 0.4), clamp(d, h * 0.3, D - h * 0.3), h * 0.62, { tilt: side * 7 });
      placed.push([it.x, it.depth, h * 0.45]);
    }
    carpet(0.05, 0.95, (x, d) => placed.some(([px, pd, rr]) => Math.hypot(x - px, (d - pd) * 1.3) < rr + 40));
    for (const [px, pd, rr] of placed) for (let i = 0; i < 3; i++) plant('grass', px + (r() - 0.5) * rr * 2.4, pd + rr * 0.8 + r() * 20, 60 + r() * 40);
  } else if (id === 'driftwood') {
    const flip = r() < 0.5, size = Math.min(L * 0.78, H * 0.82 / 0.68, D * 2.2);
    const wood = put('branch', L * 0.47, D * 0.62, size, { yaw: (flip ? 180 : 0) + Math.round((r() - 0.5) * 16) });
    // ferns and anubias tied onto the wood: on the trunk and the low limb
    const limbs = woodLimbs('branch', wood.seed, wood.size), at = (k: number, t: number) => itemToTank(S, wood, along(limbs[k].pts, t));
    const tieOn = (type: PlantType, k: number, t: number, h: number, dd = 0) => {
      const p = at(k, t), g = sub(p.x, p.depth + dd), rad = limbs[k].r0;
      plant(type, p.x, p.depth + dd, h, Math.max(0, p.y + rad * 0.2 - g));
    };
    for (const t of [0.25, 0.55]) tieOn('fern', 0, t, clamp(H * 0.4, 90, 220));
    for (const t of [0.4, 0.75]) tieOn('anubias', limbs.length - 1, t, clamp(H * 0.22, 60, 130), 10);
    const X = (f: number) => (flip ? 1 - f : f) * L;
    plant('anubias', X(0.2), D * 0.55, clamp(H * 0.25, 60, 140));
    for (const fx of [0.04, 0.1, 0.9, 0.96]) plant('grass', X(fx), D * (0.85 + r() * 0.1), H * (0.8 + r() * 0.15));
    for (let i = 0; i < 8; i++) { const s = 12 + r() * 18; put('river', X(0.1 + r() * 0.3), D * (0.6 + r() * 0.3), s * 1.2); }
  } else if (id === 'planted') {
    const BACK: PlantType[] = ['stem', 'stemred', 'grass', 'stem', 'stemred', 'stem'];
    const n = Math.max(4, Math.round(L / 70));
    for (let i = 0; i < n; i++) {
      const x = L * (0.03 + 0.94 * i / (n - 1)), type = BACK[(i + Math.floor(r() * 2)) % BACK.length];
      for (let k = 0; k < 2; k++) plant(type, x + (r() - 0.5) * 40, D * (0.78 + r() * 0.17), (H - sub(x, D * 0.85)) * (0.78 + r() * 0.2));
    }
    for (let x = L * 0.05; x < L * 0.97; x += 130 + r() * 50) {
      if (x > L * 0.38 && x < L * 0.62) continue; // open swimming space mid-front
      const t: PlantType = r() < 0.5 ? 'sword' : 'stem', d = D * (0.48 + r() * 0.18);
      plant(t, x, d, t === 'sword' ? clamp(H * 0.6, 120, 380) : H * (0.45 + r() * 0.15));
    }
    for (const fx of [0.08, 0.92]) plant('anubias', L * fx, D * 0.32, clamp(H * 0.22, 60, 130));
    carpet(0.04, 0.34);
  } else if (id === 'swamp') {
    // land: emersed grasses, swords, ferns and a few stones; pools: stems and grass growing up out of the water
    const land = (x: number, d: number) => sub(x, d) > H * 0.3;
    for (let x = 25; x < L - 25; x += 45 + r() * 35) for (let d = D * 0.08; d < D * 0.97; d += 50 + r() * 30) {
      const xx = x + (r() - 0.5) * 30, dd = d + (r() - 0.5) * 25, k = r();
      if (land(xx, dd)) {
        if (k < 0.45) plant('grass', xx, dd, clamp(H * (0.15 + r() * 0.2), 40, 160));
        else if (k < 0.6) plant('fern', xx, dd, clamp(H * (0.15 + r() * 0.1), 50, 140));
        else if (k < 0.7) plant('anubias', xx, dd, clamp(H * 0.1, 35, 90));
        else if (k < 0.78) plant('sword', xx, dd, clamp(H * (0.2 + r() * 0.1), 60, 200));
        else if (k < 0.84) put('river', xx, dd, (14 + r() * 26) * 1.2);
      } else if (k < 0.3) plant(r() < 0.5 ? 'stem' : 'grass', xx, dd, (H - sub(xx, dd)) * (0.6 + r() * 0.3));
    }
  }
  return out.slice(0, MAX_ITEMS);
}
