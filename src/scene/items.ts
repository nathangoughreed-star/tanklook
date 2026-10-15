// Aquascape items (scene v9): the library of placeable rocks, wood, caves and plants, the pure shape skeletons the
// renderer builds them from (so placement code can find a branch to tie a fern to without three.js), and the starter
// sets that replace the old fixed layouts. All sizes physical (mm): a bigger tank gets more pieces, not bigger ones.
import { rng } from '../art/paint';
import { PLANT3D, PLANT_ASPECT, grownSize, isCarpet, isClump, isFloat, isPatch, type PlantType } from '../art/plants';
import { backdropDepth, clamp, clearOfWall, D2R } from './physics';
import { bowlDims, bowlRadius, clampIn, shapeOf } from './shape';
import { clampGround, groundHeight, radialTerrain, type Ground } from './terrain';
import type { Item, ItemKind, LayerDens, LayoutId, Tank, TankSetup } from './types';

/** `salt`: offered in a saltwater tank only (live rock, corals). */
export interface Variant { kind: ItemKind; label: string; hint: string; size: number; min: number; max: number; salt?: true }
export const LIBRARY: Record<string, Variant> = {
  river: { kind: 'stone', label: 'River stone', hint: 'Smooth, rounded, brown-grey.', size: 110, min: 15, max: 600 },
  seiryu: { kind: 'stone', label: 'Seiryu', hint: 'Upright blue-grey crag with pale veins.', size: 130, min: 20, max: 600 },
  dragon: { kind: 'stone', label: 'Dragon stone', hint: 'Clay-brown, pitted with holes.', size: 140, min: 20, max: 600 },
  lava: { kind: 'stone', label: 'Lava rock', hint: 'Dark red-brown, rough and porous.', size: 90, min: 15, max: 500 },
  slate: { kind: 'stone', label: 'Slate', hint: 'Flat layered slab; stack them into ledges.', size: 150, min: 30, max: 600 },
  liverock: { kind: 'stone', label: 'Live rock', hint: 'Porous reef rock crusted with pink and purple coralline algae; stack it and set corals on it.', size: 180, min: 30, max: 600, salt: true },
  branch: { kind: 'wood', label: 'Driftwood branch', hint: 'A rising trunk with side branches.', size: 380, min: 80, max: 1500 },
  spider: { kind: 'wood', label: 'Spider wood', hint: 'Thin pale roots spreading from a knot.', size: 320, min: 80, max: 1200 },
  manzanita: { kind: 'wood', label: 'Manzanita', hint: 'A red-brown tree that forks into fine twigs. Size = height.', size: 300, min: 80, max: 1200 },
  mopani: { kind: 'wood', label: 'Mopani', hint: 'A chunky two-tone piece, dark and honey.', size: 200, min: 60, max: 800 },
  arch: { kind: 'cave', label: 'Stone arch', hint: 'A rock arch to swim through.', size: 170, min: 50, max: 600 },
  tube: { kind: 'cave', label: 'Clay tube', hint: 'A terracotta spawning tube (plecos, cichlids).', size: 130, min: 40, max: 400 },
  coconut: { kind: 'cave', label: 'Coconut cave', hint: 'Half a coconut shell with a doorway.', size: 110, min: 50, max: 250 },
  fern: { kind: 'plant', label: 'Java fern', hint: 'Grows on wood and rock.', size: 150, min: 30, max: 450 },
  anubias: { kind: 'plant', label: 'Anubias', hint: 'Grows on wood and rock.', size: 90, min: 25, max: 300 },
  sword: { kind: 'plant', label: 'Amazon sword', hint: 'A big rosette.', size: 250, min: 50, max: 600 },
  grass: { kind: 'plant', label: 'Vallisneria', hint: 'Tall grass-like leaves.', size: 280, min: 40, max: 900 },
  stem: { kind: 'plant', label: 'Stem plant', hint: 'Upright stems of paired green leaves.', size: 220, min: 40, max: 900 },
  stemred: { kind: 'plant', label: 'Red stem plant', hint: 'Upright stems, red toward the top.', size: 220, min: 40, max: 900 },
  crypt: { kind: 'plant', label: 'Cryptocoryne', hint: 'A low rosette of wavy bronze-green leaves (C. wendtii).', size: 110, min: 30, max: 300 },
  buce: { kind: 'plant', label: 'Bucephalandra', hint: 'A small, slow rhizome plant for wood and rock: dark leaves with a blue or wine cast.', size: 70, min: 20, max: 200 },
  rotala: { kind: 'plant', label: 'Rotala', hint: 'A fine-leaved stem plant with pink tops.', size: 240, min: 40, max: 900 },
  ludwigia: { kind: 'plant', label: 'Ludwigia', hint: 'A stem plant with broad oval leaves, deep red at the top.', size: 220, min: 40, max: 900 },
  balansae: { kind: 'plant', label: 'Crypt balansae', hint: 'Tall, narrow crinkled leaves for the back.', size: 320, min: 60, max: 700 },
  ozelot: { kind: 'plant', label: "Echinodorus 'Ozelot'", hint: 'A mid-sized sword with maroon-spotted leaves.', size: 200, min: 50, max: 500 },
  sagittaria: { kind: 'plant', label: 'Dwarf sagittaria', hint: 'A low run of grassy tufts that spreads into a lawn.', size: 70, min: 30, max: 150 },
  moss: { kind: 'plant', label: 'Java moss', hint: 'A low mound of moss: on the ground, or raise it onto wood or rock.', size: 45, min: 15, max: 150 },
  redroot: { kind: 'plant', label: 'Red root floaters', hint: 'Small round leaves floating at the water line, red roots hanging below.', size: 200, min: 60, max: 600 },
  salvinia: { kind: 'plant', label: 'Salvinia', hint: 'Floating chains of cupped oval leaves at the water line.', size: 200, min: 60, max: 600 },
  frogbit: { kind: 'plant', label: 'Amazon frogbit', hint: 'Round glossy leaves floating at the water line, long fine roots hanging below.', size: 200, min: 70, max: 700 },
  lettuce: { kind: 'plant', label: 'Water lettuce', hint: 'Pale velvety rosettes floating at the water line, feathery roots below.', size: 250, min: 90, max: 700 },
  lotus: { kind: 'plant', label: 'Tiger lotus', hint: 'Broad red leaves blotched dark maroon; grown on, it sends lily pads up to the surface.', size: 120, min: 40, max: 250 },
  carpet: { kind: 'plant', label: 'Carpet patch', hint: 'A low carpet plant.', size: 160, min: 60, max: 400 },
  // corals (2026-10-14): size = width
  acropora: { kind: 'coral', label: 'Branching coral', hint: 'An Acropora-style colony of branches with pale tips. Size = width.', size: 160, min: 40, max: 500, salt: true },
  montipora: { kind: 'coral', label: 'Plate coral', hint: 'A whorl of thin cupped plates. Size = width.', size: 180, min: 40, max: 500, salt: true },
  mushroom: { kind: 'coral', label: 'Mushroom corals', hint: 'A cluster of flat discs on a small rock. Size = width.', size: 110, min: 40, max: 300, salt: true },
  leather: { kind: 'coral', label: 'Leather coral', hint: 'A toadstool leather: a pale stalk under a folded cap. Size = width.', size: 150, min: 40, max: 450, salt: true },
};
export const KINDS: Record<ItemKind, string> = { stone: 'Stones', wood: 'Wood', cave: 'Caves', plant: 'Plants', coral: 'Corals' };
export const MAX_ITEMS = 600;
/** Most stems or crowns one clump may have (a stem is about 1.5 k triangles). */
export const MAX_STEMS = 40;
/** Carpet cards, mm (about 3 cm tall, like a trimmed Monte Carlo carpet). */
export const CARPET_W = 100, CARPET_H = CARPET_W * PLANT_ASPECT.carpet;

export const LAYOUTS: Record<LayoutId, { label: string; hint: string }> = {
  none: { label: 'Bare tank', hint: 'No rocks, wood or plants.' },
  stones: { label: 'River stones', hint: 'A pile of smooth stones in the centre.' },
  driftwood: { label: 'Driftwood', hint: 'Branchy wood with java fern and anubias.' },
  planted: { label: 'Dense planted', hint: 'Stem plants and grasses at the back, swords, a carpet in front.' },
  iwagumi: { label: 'Iwagumi', hint: 'Angular stones on a low carpet.' },
  swamp: { label: 'Swamp / paludarium', hint: 'Land rising out of the water around one or two pools; fish stay in the water. Lowers the water when chosen.' },
  reef: { label: 'Reef', hint: 'Live rock stacked into islands, corals on the rock and the sand. Saltwater tanks only.' },
};

type V3 = [number, number, number];
/** One wood limb: a smooth tube through `pts` (local mm, base on y = 0), radius r0 -> r1; tone 1 = a darker piece. */
export interface Limb { pts: V3[]; r0: number; r1: number; tone: number }

/** Stone length, height and width (mm) for its variant and seed. */
export function stoneDims(variant: string, seed: number, size: number): V3 {
  const r = rng(seed * 31 + 7);
  const [h0, h1, w0, w1] = ({ river: [0.45, 0.65, 0.7, 0.85], seiryu: [0.9, 1.4, 0.55, 0.75], dragon: [0.55, 0.9, 0.6, 0.8], lava: [0.5, 0.8, 0.65, 0.85], slate: [0.12, 0.24, 0.5, 0.8], liverock: [0.5, 0.75, 0.6, 0.85] } as Record<string, number[]>)[variant] ?? [0.6, 0.6, 0.7, 0.7];
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
    const rad = 0.03 * s, c: V3 = [0, 0.05 * s, 0], out: Limb[] = [{ pts: [[-0.03 * s, 0.02 * s, 0], c, [0.04 * s, 0.09 * s, 0.01 * s]], r0: rad * 3, r1: rad * 2, tone: 0 }];
    const n = 7 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.6, d: V3 = [Math.cos(a), 0, Math.sin(a) * 0.75], len = (0.36 + r() * 0.16) * s;
      const droop = r() < 0.35, rise = droop ? 0 : (0.25 + r() * 0.75) * len;
      const p1 = add3(add3(c, d, len * 0.3), [j(0.06), rise * 0.35 + (droop ? 0.02 * s : 0), j(0.06)]);
      const p2 = add3(add3(c, d, len * 0.65), [j(0.08), droop ? 0.03 * s : rise * 0.7, j(0.08)]);
      const p3 = add3(add3(c, d, len), [j(0.06), droop ? 0.01 * s : rise, j(0.06)]);
      out.push({ pts: [c, p1, p2, p3], r0: rad * (1.0 + r() * 0.5), r1: rad * 0.22, tone: 0 });
    }
    return out;
  }
  if (variant === 'manzanita') {
    const out: Limb[] = [];
    const grow = (p: V3, d: V3, len: number, rad: number, depth: number) => {
      const end = add3(p, d, len), m1 = add3(along([p, end], 0.35), [j(0.03), 0, j(0.03)]), m2 = add3(along([p, end], 0.7), [j(0.03), 0, j(0.03)]);
      out.push({ pts: [p, m1, m2, end], r0: rad, r1: rad * 0.62, tone: 0 });
      if (depth <= 0) return;
      const kids = depth > 1 && r() < 0.3 ? 3 : 2;
      for (let k = 0; k < kids; k++) {
        // turn away from the parent by 25-45° about a random sideways axis, with a slight pull upward
        const ang = (25 + r() * 20) * D2R, side = norm3([r() - 0.5, (r() - 0.5) * 0.2, r() - 0.5]);
        const perp = norm3(add3(side, d, -(side[0] * d[0] + side[1] * d[1] + side[2] * d[2])));
        const nd = norm3(add3(add3([d[0] * Math.cos(ang), d[1] * Math.cos(ang), d[2] * Math.cos(ang)], perp, Math.sin(ang) * (k % 2 ? -1 : 1)), [0, 0.15, 0]));
        grow(end, nd, len * (0.62 + r() * 0.12), rad * 0.66, depth - 1);
      }
    };
    grow([0, 0, 0], norm3([(r() - 0.5) * 0.3, 1, (r() - 0.5) * 0.3]), 0.36 * s, 0.062 * s, 3);
    for (let k = 0; k < 3; k++) { const a = r() * Math.PI * 2, l = (0.12 + r() * 0.1) * s; out.push({ pts: [[0, 0.03 * s, 0], [Math.cos(a) * l * 0.5, 0.02 * s, Math.sin(a) * l * 0.5], [Math.cos(a) * l, 0.008 * s, Math.sin(a) * l]], r0: 0.042 * s, r1: 0.012 * s, tone: 0 }); }
    return out;
  }
  if (variant === 'mopani') {
    const rad = 0.125 * s, main: V3[] = [[-0.42 * s, 0.09 * s, j(0.08)], [-0.18 * s, 0.26 * s + j(0.06), j(0.1)], [0.12 * s, 0.28 * s + j(0.06), j(0.1)], [0.4 * s, 0.08 * s, j(0.08)]];
    const p = along(main, 0.45 + r() * 0.15);
    return [
      { pts: main, r0: rad, r1: rad * 0.75, tone: 0 },
      { pts: [p, add3(p, [0.05 * s + j(0.08), 0.15 * s, 0.04 * s]), add3(p, [0.08 * s + j(0.1), 0.3 * s, 0.06 * s + j(0.06)])], r0: rad * 0.6, r1: rad * 0.28, tone: 0 },
    ];
  }
  // 'branch': a trunk rising from one end, three side branches and a lower limb (the old driftwood layout, as a piece)
  const rad = 0.085 * s;
  const trunk: V3[] = [[-0.42 * s, 0.3 * rad, 0.14 * s], [-0.16 * s, 0.2 * s + j(0.04), 0.05 * s + j(0.04)], [0.12 * s, 0.4 * s + j(0.05), -0.02 * s], [0.34 * s, 0.6 * s + j(0.05), -0.05 * s + j(0.05)]];
  const out: Limb[] = [{ pts: trunk, r0: rad, r1: rad * 0.35, tone: 0 }];
  for (const [t, dir, len] of [[0.45, -1, 0.3], [0.62, 1, 0.24], [0.3, 1, 0.2]] as const) {
    const p0 = along(trunk, t), dx = dir * len * s;
    out.push({ pts: [p0, add3(p0, [dx * 0.5, 0.11 * s, 0.05 * s]), add3(p0, [dx, 0.2 * s, j(0.14)])], r0: rad * 0.55, r1: rad * 0.16, tone: 0 });
  }
  out.push({ pts: [[0.5 * s, 0.25 * rad, 0.2 * s], [0.3 * s, 0.07 * s, 0.1 * s], [0.08 * s, 0.06 * s, -0.08 * s]], r0: rad * 0.75, r1: rad * 0.3, tone: 1 });
  return out;
}

/** Overall size of a piece: [length, height, width] in its own frame, mm (plants: card width, height, width). */
export function itemDims(it: Pick<Item, 'kind' | 'variant' | 'seed' | 'size' | 'spread' | 'growth'>): V3 {
  const s = it.kind === 'plant' ? grownSize(it.variant as PlantType, it.size, it.growth) : it.size; // a plant at its growth
  if (it.kind === 'stone') return stoneDims(it.variant, it.seed, s);
  // an upright plant grown past its saved size gets longer much faster than its footprint widens (long leaves and stems
  // lie over at the surface), so its width follows its length only up to 1.4x the saved size
  const sw = Math.min(s, it.size * 1.4);
  if (it.kind === 'plant') return isCarpet(it.variant) ? [s, CARPET_H, s] : isFloat(it.variant) ? [s, s * PLANT_ASPECT[it.variant as PlantType], s] : ((w: number) => [w, s, w])(it.spread ? Math.max(it.spread, sw / PLANT_ASPECT[it.variant as PlantType]) : sw / PLANT_ASPECT[it.variant as PlantType]) as [number, number, number];
  if (it.kind === 'coral') return [s, s * ({ acropora: 0.6, montipora: 0.45, mushroom: 0.4, leather: 0.6 } as Record<string, number>)[it.variant], s];
  if (it.kind === 'cave') return it.variant === 'arch' ? [s, 0.5 * s, 0.45 * s] : it.variant === 'tube' ? [s, 0.42 * s, 0.42 * s] : [s, 0.5 * s, s];
  return it.variant === 'manzanita' ? [0.7 * s, s, 0.7 * s] : it.variant === 'spider' ? [s, 0.5 * s, 0.8 * s] : it.variant === 'mopani' ? [s, 0.45 * s, 0.3 * s] : [s, 0.65 * s, 0.45 * s];
}

/** The radius of an upright plant's base, mm: the circle its crowns or stems start in (a clump's own spread, else the
 *  species' share of its width), at least a few mm for the stalk. */
export function plantBaseR(it: Pick<Item, 'kind' | 'variant' | 'seed' | 'size' | 'spread' | 'growth'>) {
  const P = PLANT3D[it.variant as PlantType];
  return Math.max(4, it.spread ? it.spread / 2 : itemDims(it)[0] * (P?.spread ?? 0.5) / 2);
}

/** How far into the ground a piece is set, mm (stones nest in, plants are planted). */
export function itemSink(it: Item): number {
  if (it.kind === 'plant') return 4;
  const h = itemDims(it)[1];
  return it.kind === 'stone' ? 0.08 * h : it.kind === 'cave' ? 0.03 * h : 0;
}

/** How far a piece may be pushed down into the substrate, fraction of the tank height (the deepest substrate is 0.5 H). */
export const LIFT_SINK = 0.5;

/**
 * Keep a piece's anchor inside the glass (plants by most of their half-width; hardscape may run through it) and its size
 * within its variant's range and the tank. Pass the ground `g` wherever there is one: a bowl's glass at the substrate is
 * wider than its floor disc, and without it a bowl keeps pieces over the floor (the old, too-tight rule).
 */
export function clampItem(it: Item, T: Tank, g?: Ground) {
  const v = LIBRARY[it.variant];
  if (v) {
    let max = v.max;
    if (it.kind === 'plant' && !isPatch(it.variant)) max = Math.min(max, (Math.min(T.L, T.D) - 6) * PLANT_ASPECT[it.variant as PlantType], T.H * 1.5);
    else max = Math.min(max, Math.max(T.L, T.D) * 1.1);
    it.size = Math.round(clamp(it.size, Math.min(v.min, max), max));
  }
  // hardscape may run through the glass (cut off there by the renderer, 2026-10-12): only its anchor stays inside. An
  // upright plant keeps its base (the circle its crowns or stems start in) inside, so it can be planted right against
  // the glass; leaves arching past a pane are cut off there like hardscape (Nathan 2026-10-15). A bowl still keeps the
  // whole plant clear (its glass closes in above)
  const [l, , w] = itemDims(it), half = it.kind === 'plant' ? (isPatch(it.variant) ? Math.max(l, w) * 0.35 : shapeOf(T) === 'bowl' ? l / 2 + 3 : plantBaseR(it) + 2) : 0;
  const inset = Math.min(half, Math.min(T.L, T.D) * 0.45);
  it.x = clamp(it.x, inset, T.L - inset); it.depth = clamp(it.depth, inset, T.D - inset);
  if (g && shapeOf(T) === 'bowl') { // a plant stays clear of the glass over its whole height (the sphere closes in above)
    const lift = clamp(it.lift, 0, T.H), up = it.kind === 'plant' && !isPatch(it.variant) ? itemDims(it)[1] : 0;
    ({ x: it.x, depth: it.depth } = clampGround(g, T, it.x, it.depth, inset, lift, lift + up));
  } else if (shapeOf(T) !== 'rect') ({ x: it.x, depth: it.depth } = clampIn(T, it.x, it.depth, inset));
  // a plant stands in front of the 3D wall (rocks and wood may sink into it, like into the glass)
  const wall = it.kind === 'plant' ? backdropDepth(g?.backdrop, T) : 0;
  if (wall) ({ x: it.x, depth: it.depth } = clearOfWall(T, it.x, it.depth, wall * 0.7 + half * 0.5, g?.render?.bgSides));
  it.lift = clamp(it.lift, -LIFT_SINK * T.H, T.H);
  // a clump's own spread and count (absent = the species' own); dropped on anything that is not a clump
  if (it.kind === 'plant' && isClump(it.variant)) {
    if (it.spread != null) it.spread = Math.round(clamp(it.spread, 10, Math.max(10, Math.min(T.L, T.D) - 6)));
    if (it.stems != null) it.stems = Math.round(clamp(it.stems, 1, MAX_STEMS));
  } else { delete it.spread; delete it.stems; }
  // a plant's growth, 0..1 (absent = back-solved from its size); nothing else has one
  if (it.kind === 'plant' && it.growth != null) it.growth = Math.round(clamp(it.growth, 0, 1) * 1000) / 1000;
  else delete it.growth;
  it.yaw = ((it.yaw + 540) % 360) - 180;
  it.pitch = clamp(it.pitch, -90, 90);
  it.tilt = ((it.tilt + 540) % 360) - 180;
}

/** A point of a piece's own frame in the tank (x, depth, height above the floor), turned by its yaw (pitch and roll ignored). */
export function itemToTank(S: TankSetup, it: Item, p: V3) {
  const c = Math.cos(it.yaw * D2R), s = Math.sin(it.yaw * D2R);
  return { x: it.x + p[0] * c + p[2] * s, depth: it.depth - (-p[0] * s + p[2] * c), y: groundHeight(S, S.tank, it.x, it.depth) + it.lift - itemSink(it) + p[1] };
}

/**
 * The tops of the solid pieces (stones, wood, caves) as somewhere a clinging animal can sit: their rough upward-facing
 * area (mm²) and a random spot on them in proportion to it, (x, depth) and an estimate of the height there. The renderer
 * finds the exact top under (x, depth); this only has to land on the piece.
 */
export function hardscape(S: TankSetup) {
  const parts: { area: number; spot: (r: () => number) => { x: number; depth: number; y: number } }[] = [];
  for (const it of S.items) {
    if (it.kind === 'plant' || it.kind === 'coral') continue; // no grazing on live coral (Nathan 2026-10-14)
    if (it.kind === 'wood') {
      for (const l of woodLimbs(it.variant, it.seed, it.size)) {
        const len = l.pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - l.pts[i][0], p[1] - l.pts[i][1], p[2] - l.pts[i][2]), 0);
        parts.push({ area: len * (l.r0 + l.r1), spot: r => { const t = 0.1 + r() * 0.8, p = itemToTank(S, it, along(l.pts, t)); return { ...p, y: p.y + l.r0 + (l.r1 - l.r0) * t }; } });
      }
      continue;
    }
    const [l, h, w] = itemDims(it);
    parts.push({ area: l * w * 0.5, spot: r => itemToTank(S, it, [(r() - 0.5) * l * 0.4, h, (r() - 0.5) * w * 0.4]) });
  }
  const area = parts.reduce((a, p) => a + p.area, 0);
  return {
    area,
    spot(r: () => number) {
      let k = r() * area;
      for (const p of parts) { if ((k -= p.area) <= 0) return p.spot(r); }
      return parts.length ? parts[parts.length - 1].spot(r) : null;
    },
  };
}
export type Hardscape = ReturnType<typeof hardscape>;

export const nextItemId = (s: TankSetup) => s.items.reduce((m, it) => Math.max(m, it.id), 0) + 1;

/** A new item of `variant` at (x, depth), its default size (clamped to the tank), facing the glass. */
export function makeItem(T: Tank, variant: string, id: number, seed: number, x: number, depth: number, extra: Partial<Item> = {}, g?: Ground): Item {
  const v = LIBRARY[variant];
  const it: Item = { id, kind: v.kind, variant, seed, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: v.size, ...extra };
  clampItem(it, T, g);
  return it;
}

/** One group of a starter set: where it sits (fractions of L and D) and its weight (1 = the main group). */
interface Focus { x: number; d: number; k: number }
/**
 * How a starter set is drawn. Seed 1 is the set as designed; every other seed (Shuffle) rolls a style so a shuffle
 * gives a genuinely different tank, not the same picture nudged (Nathan 2026-10-13): how big the pieces are, where the
 * groups sit (centre, one side, two groups, thirds, scattered) and how far solid pieces lean and tip. How full each
 * layer is no longer comes from the seed (lane SD, 2026-10-15): the density sliders set it (`LayerDens`, `STYLES`).
 * A later composition picker plugs in here, as a choice of `foci`.
 */
export interface Style { classic: boolean; scale: number; foci: Focus[]; wild: number; open: number }
export function starterStyle(seed: number): Style {
  const q = rng(seed * 104723 + 17), pick = <T>(a: T[]) => a[Math.floor(q() * a.length) % a.length];
  if (seed === 1) return { classic: true, scale: 1, foci: [{ x: 0.5, d: 0.5, k: 1 }], wild: 0, open: 0.5 };
  q(); q(); // the density roll before lane SD: still drawn, so every older seed keeps its composition, scale and lean
  const scale = 0.65 + q() * 0.8, j = () => (q() - 0.5) * 0.1, side = q() < 0.5 ? 1 : -1, s = (f: number) => 0.5 + side * (f - 0.5);
  const foci: Focus[] = pick<() => Focus[]>([
    () => [{ x: 0.5 + j(), d: 0.5 + j(), k: 1 }],                                          // centre
    () => [{ x: s(0.28) + j(), d: 0.55 + j(), k: 1 }],                                     // one side, open water on the other
    () => [{ x: s(0.24) + j(), d: 0.55 + j(), k: 1 }, { x: s(0.76) + j(), d: 0.5 + j(), k: 0.55 + q() * 0.4 }], // two groups, a valley between
    () => [{ x: s(0.36) + j(), d: 0.55 + j(), k: 1 }, { x: s(0.7) + j(), d: 0.4 + j(), k: 0.35 + q() * 0.2 }], // thirds: main + a smaller one
    (n = 3 + Math.floor(q() * 2)) => Array.from({ length: n }, (_, i) => ({ x: (i + 0.5 + (q() - 0.5) * 0.6) / n, d: 0.3 + q() * 0.45, k: 0.4 + q() * 0.4 })), // scattered
  ])();
  const open = foci.length === 1 ? 1 - foci[0].x : foci.length === 2 ? (foci[0].x + foci[1].x) / 2 : -1; // open water (fraction of L), -1 none
  return { classic: false, scale, foci, wild: q(), open };
}

/**
 * The density sliders (lane SD; continuous and widened 2026-10-15, Nathan: "from a single plant / rock / fish all the
 * way up to a level where it no longer looks good at all"). A value is in stop units: 0..4 are the old stops (Sparse ..
 * Packed, animals None .. Full), hardscape and plants run on down to -1 (one piece) and up to 6 (far too dense), animals
 * up to 6 (well past a safe bioload). `DENS_NAMES[i]` names value i - 1; `ANIMAL_NAMES[i]` names value i.
 */
export const DENS_RANGE = [-1, 6] as const, ANIMAL_RANGE = [0, 6] as const;
export const DENS_NAMES = ['One piece', 'Sparse', 'Light', 'Medium', 'Full', 'Packed', 'Overgrown', 'Far too much'] as const;
export const ANIMAL_NAMES = ['None', 'Few', 'Some', 'Many', 'Full', 'Overstocked', 'Far overstocked'] as const;
/** The name nearest a slider value. */
export function densName(k: 'hard' | 'plant' | 'animal', v: number) {
  if (k === 'animal') return v <= 0 ? 'None' : v < 0.5 ? 'One or two' : ANIMAL_NAMES[clamp(Math.round(v), 0, 6)];
  return DENS_NAMES[clamp(Math.round(v), -1, 6) + 1];
}
/** Medium hardscape and plants (the set as designed), no animals: what a new tank and an old file's seed 1 get. */
export const DEFAULT_DENS: LayerDens = { hard: 2, plant: 2, animal: 0 };
/** The layers a starter set is drawn in, each from its own random stream: hardscape first, plants and corals placed
 *  round it, then animals (scene/starter.ts). */
export type Layer = 'hard' | 'plant' | 'animal';
export const layerOf = (it: Pick<Item, 'kind'>): Layer => it.kind === 'plant' || it.kind === 'coral' ? 'plant' : 'hard';

/**
 * What each starter style allows (lane SD). `hard` / `plant`: the density at Sparse and at Packed; Medium is 1, the set
 * as designed, and the stops between are even steps (`stopDens`). `stones`: a style that counts its stones (iwagumi:
 * odd numbers, 7 at most) gives the count per stop instead. `animals`: the species pool (scene/starter.ts) a full tank
 * is stocked from. A new style adds a row here and a branch in `starterItems`.
 */
export interface StyleSpec { hard: [number, number]; plant: [number, number]; stones?: readonly number[]; animals: readonly string[] }
export const STYLES: Record<Exclude<LayoutId, 'none'>, StyleSpec> = {
  stones: { hard: [0.3, 2.4], plant: [0.3, 2.2], animals: ['danio', 'tigerbarb', 'cherrybarb', 'kribensis', 'bronzecory', 'bristlenose', 'platy', 'nerite', 'kuhli'] },
  driftwood: { hard: [0.35, 2.2], plant: [0.4, 2.2], animals: ['cardinal', 'rummynose', 'angel', 'honeygourami', 'bolivianram', 'gbr', 'pandacory', 'bristlenose', 'kuhli', 'amano', 'nerite'] },
  planted: { hard: [0.3, 2], plant: [0.6, 2.4], animals: ['neon', 'cardinal', 'rummynose', 'harlequin', 'ember', 'cherrybarb', 'dwarfgourami', 'honeygourami', 'bolivianram', 'pandacory', 'oto', 'amano', 'cherryshrimp', 'nerite'] },
  iwagumi: { hard: [0.55, 1.8], plant: [0.4, 2], stones: [3, 3, 5, 5, 7], animals: ['ember', 'chili', 'harlequin', 'rummynose', 'cpd', 'neon', 'oto', 'amano', 'cherryshrimp', 'nerite'] },
  swamp: { hard: [0.3, 2.5], plant: [0.5, 2], animals: ['dartfrog', 'treefrog', 'firetoad', 'firenewt', 'guppy', 'ember', 'ramshorn'] },
  reef: { hard: [0.4, 2], plant: [0.4, 2.2], animals: ['ocellaris', 'royalgramma', 'firefish', 'banggai', 'chromis', 'sixline', 'watchman', 'coralbeauty', 'yellowtang', 'cleanershrimp', 'turbo', 'hermit'] },
};
/** A slider value as a density within a style's [Sparse, Packed] range: Medium (2) is 1, smooth in between. Past
 *  Packed it keeps climbing, to three times Packed at 6; below Sparse it stays Sparse (the layer is then thinned to a
 *  share of its pieces, `keepShare`). */
export function stopDens(stop: number, [lo, hi]: readonly [number, number]) {
  const s = clamp(stop, 0, 6);
  return s <= 2 ? lo + (1 - lo) * s / 2 : s <= 4 ? 1 + (hi - 1) * (s - 2) / 2 : hi * (1 + (s - 4));
}
/** Below Sparse (value -1..0): the share of the Sparse layer's pieces kept, down to one piece at -1. */
export const keepShare = (stop: number) => stop >= 0 ? 1 : clamp(stop + 1, 0, 1);
/** A file from before lane SD: the stops nearest the density its seed rolled then (sparse 0.3-0.6, medium 0.8-1.2,
 *  packed 1.5-2.4), no animals (the starter sets never placed any). */
export function legacyDens(seed: number): LayerDens {
  if (seed === 1) return { ...DEFAULT_DENS };
  const q = rng(seed * 104723 + 17), b = q(), dens = b < 0.34 ? 0.3 + q() * 0.3 : b < 0.67 ? 0.8 + q() * 0.4 : 1.5 + q() * 0.9;
  const stop = dens < 0.45 ? 0 : dens < 0.7 ? 1 : dens < 1.3 ? 2 : dens < 1.9 ? 3 : 4;
  return { hard: stop, plant: stop, animal: 0 };
}
/** Stone height over size, per stone (an iwagumi stone is sized from the height it should stand). */
const STONE_RATIO: Record<string, number> = { seiryu: 0.62, river: 1.1 };

/**
 * Starter set: the old preset layouts, now placing ordinary editable items, drawn in the seed's `starterStyle` at the
 * layout's density stops. Deterministic in (layout, seed, stops, tank, ground). Each layer draws from its own random
 * stream (seed x layer), so a plant-stop change leaves every rock where it was. `keepHard`: the hardscape to keep (a
 * plants-only regenerate); plants are then placed round those pieces, wherever they now stand.
 */
export function starterItems(S: TankSetup, keepHard?: Item[]): Item[] {
  const T = S.tank, { L, H, D } = T, id = S.layout.id, out: Item[] = keepHard ? keepHard.map(it => ({ ...it })) : [];
  if (id === 'none') return out;
  const spec = STYLES[id], DS = S.layout.dens ?? DEFAULT_DENS, sub = (x: number, d: number) => groundHeight(S, T, x, d);
  const st = starterStyle(S.layout.seed), designed = st.classic; // designed: seed 1, the set's own materials and groups
  const stream = (k: number) => rng(S.layout.seed * 7919 + id.length * 104729 + k * 1000003);
  // the layer being drawn: its random stream, a second one for style picks (so a pick does not shift with the count of
  // pieces drawn before it), its density, and `classic` = the set exactly as designed (seed 1 at Medium)
  let r = stream(1), q = stream(11), dens = 1, classic = false, nid = out.reduce((m, it) => Math.max(m, it.id), 0) + 1;
  const pick = <T>(a: T[]) => a[Math.floor(q() * a.length) % a.length];
  const layer = (k: 'hard' | 'plant', draw: () => void) => {
    if (k === 'hard' && keepHard) return;
    const stop = DS[k], n0 = out.length; r = stream(k === 'hard' ? 1 : 2); q = stream(k === 'hard' ? 11 : 12);
    dens = stopDens(stop, spec[k]); classic = designed && stop === 2; draw();
    if (stop < 0) { // below Sparse: keep the first pieces the layer placed (the main ones come first), one at the least
      const mine = out.slice(n0).filter(it => layerOf(it) === k), keep = new Set(mine.slice(0, Math.max(1, Math.round(mine.length * keepShare(stop)))));
      out.splice(n0, out.length - n0, ...out.slice(n0).filter(it => layerOf(it) !== k || keep.has(it)));
    }
  };
  const seed = () => 1 + Math.floor(r() * 1e9);
  const many = (n: number, k = 1) => Math.max(0, Math.round(n * dens * k + (classic ? 0 : r() - 0.5)));
  // The layouts are drawn on the L x D box. A round tank or bowl squeezes the box onto its disc of ground (elliptical
  // grid mapping) instead of clamping each piece in, which piled a whole layout onto one ring round the middle
  // (2026-10-12): the back row stays at the back, the corners land at the rim. A bowl's disc is the glass at the ground.
  const bowl = shapeOf(T) === 'bowl', disc = radialTerrain(T);
  const map = (x: number, d: number) => {
    if (!disc) return { x, d };
    const u = clamp(2 * x / L - 1, -1, 1), v = clamp(2 * d / D - 1, -1, 1), a = u * Math.sqrt(1 - v * v / 2), b = v * Math.sqrt(1 - u * u / 2);
    let rx = L / 2, rd = D / 2;
    if (bowl) for (let k = 0; k < 3; k++) rx = rd = bowlRadius(T, sub(L / 2 + a * rx, D / 2 + b * rd)) - 3;
    return { x: L / 2 + a * rx, d: D / 2 + b * rd };
  };
  /** A piece at (x, d) on the box (`raw`: already a spot in the tank, e.g. on a piece placed before). */
  const put = (variant: string, x: number, d: number, size: number, o: Partial<Item> = {}, raw = false) => {
    const p = raw ? { x, d } : map(x, d);
    const it = makeItem(T, variant, nid++, seed(), p.x, p.d, { yaw: Math.round((r() - 0.5) * 360), size: Math.round(size), ...o }, S);
    out.push(it); return it;
  };
  /** The hardscape pieces placed so far (or kept), e.g. the wood to tie ferns on. */
  const solids = () => out.filter(it => layerOf(it) === 'hard');
  /** Lean and tip for a solid piece in this style (none for a designed set or a round river stone). */
  const tip = (variant: string, k = 1): Partial<Item> => designed || variant === 'river' ? {} : { pitch: Math.round((r() - 0.5) * 50 * st.wild * k), tilt: Math.round((r() - 0.5) * 40 * st.wild * k) };
  const room = (x: number, d: number, lift = 0) => H - sub(x, d) - lift - 15; // headroom to the water line
  /** A plant (crossed cards, facing the glass give or take 15°); too little headroom = left out. In a bowl it is cut
   *  down to fit under the sphere where it stands (to half its height at most; clampItem eases the rest in off the
   *  glass), so plants rise towards the middle instead of all moving there. */
  const plant = (type: PlantType, x: number, d: number, h: number, lift = 0, raw = false) => {
    const p = raw ? { x, d } : map(x, d);
    let hh = Math.min(h, room(p.x, p.d, lift), (Math.min(L, D) - 6) * PLANT_ASPECT[type]);
    if (bowl) {
      const { R, c } = bowlDims(T), y0 = sub(p.x, p.d) + lift, q0 = Math.hypot(p.x - L / 2, p.d - D / 2);
      const h0 = hh;
      for (let k = 0; k < 3; k++) { const q = q0 + hh / PLANT_ASPECT[type] / 2 + 3; hh = Math.max(h0 / 2, Math.min(hh, (q < R ? c + Math.sqrt(R * R - q * q) : 0) - y0)); }
    }
    if (hh > 15) put(type, p.x, p.d, hh, { yaw: Math.round((r() - 0.5) * 30), lift }, true);
  };
  /** Carpet from depth d0 to d1 (fractions of D, 0 = front glass). A carpet over most of the floor (iwagumi) is a
   *  jittered grid with a ragged back edge; a band along the front read as a strip by the glass (Nathan 2026-10-13),
   *  so a narrow one is laid as round patches instead, mostly towards the front but free to wander back (in a round tank
   *  spread from side to side, so the carpet reaches the rim, not one patch in the middle). Off a classic
   *  set, a sparse style leaves bare patches. */
  const carpet = (d0: number, d1: number, skip?: (x: number, d: number) => boolean) => {
    const ph = [r() * 6, r() * 6, 0.004 + r() * 0.006], patchy = !classic && dens < 1 ? 0.9 - dens : -2;
    if (d1 - d0 < 0.6) {
      const n = Math.max(2, Math.round(L * D * (d1 - d0 + 0.2) / 45000 * clamp(dens, 0.5, 1.5)));
      for (let i = 0; i < n; i++) {
        const cx = disc ? L * (i + 0.2 + r() * 0.6) / n : L * (0.04 + r() * 0.92), cd = D * Math.min(0.85, d0 + (d1 - d0 + 0.35) * r() ** 1.5), rad = 60 + r() * 120;
        for (let k = 0, m = Math.max(1, Math.round((rad / 55) ** 2)); k < m; k++) {
          const a = r() * 6.28, q = k ? rad * Math.sqrt(r()) : 0, p = map(clamp(cx + Math.cos(a) * q, 40, L - 40), clamp(cd + Math.sin(a) * q * 0.8, 30, D - 30));
          if (!skip?.(p.x, p.d)) put('carpet', p.x, p.d, 120 + r() * 50, {}, true);
        }
      }
      return;
    }
    const soft = D * 0.18;
    for (let d = D * d0 + 45; d <= D * d1 + soft; d += 95) for (let x = 60 + r() * 60; x < L - 40; x += 115) {
      const xx = x + (r() - 0.5) * 100, dd = Math.min(d + (r() - 0.5) * 85, D - 30);
      if (dd > D * d1 && r() < (dd - D * d1) / soft) continue;
      if (Math.sin(xx * ph[2] + ph[0]) + Math.sin(dd * ph[2] * 1.7 + ph[1]) < patchy * 2 - 0.6) continue;
      const p = map(clamp(xx, 40, L - 40), Math.max(dd, 30));
      if (!skip?.(p.x, p.d)) put('carpet', p.x, p.d, 140 + r() * 30, {}, true);
    }
  };
  /**
   * Plants scattered in clumps over the floor, with no rows (Nathan 2026-10-13: rows of short plants in front and tall
   * ones behind "look like a farm"). Depth only sets the odds: each kind has a heat zone (anubias front, ferns and
   * swords in the middle, stems and grass behind) and the height a clump may reach rises front to back, but any clump
   * lands at a random spot. `w` weights the kinds, `n` clumps (before density), between depths d0..d1; inside the
   * open-water `gap` (fraction of L, the front 60 %) a clump is mostly turned away. Clumps keep off the hardscape.
   */
  const ZONE: Partial<Record<PlantType, [number, number]>> = { anubias: [0.2, 0.35], fern: [0.4, 0.38], sword: [0.5, 0.35], grass: [0.78, 0.4], stem: [0.75, 0.38], stemred: [0.78, 0.36] };
  const CAP: Partial<Record<PlantType, number>> = { anubias: clamp(H * 0.22, 60, 130), fern: clamp(H * 0.4, 90, 240), sword: clamp(H * 0.6, 120, 380) };
  const scatter = (w: Partial<Record<PlantType, number>>, n: number, o: { d0?: number; d1?: number; gap?: number; half?: number } = {}) => {
    const { d0 = 0.08, d1 = 0.96, gap = -1, half = 0 } = o, hs = designed ? 1 : 0.75 + 0.25 * st.scale;
    const solid = solids().map(it => [it.x, it.depth, itemDims(it)[0] * 0.4] as const);
    const centres: [number, number][] = [];
    for (let c = 0, tries = 0, want = Math.max(1, Math.round(n * dens)); c < want && tries < want * 12; tries++) {
      // best of 3 candidates (farthest from the clumps so far): spread out, not even
      let best: [number, number] | null = null, bd = -1;
      for (let k = 0; k < 3; k++) {
        const x = L * (0.03 + r() * 0.94), t = d0 + r() * (d1 - d0), d = D * t;
        if (r() > 0.65 + 0.35 * t) continue;                                    // the back fills up a little more than the front
        if (gap >= 0 && t < 0.6 && Math.abs(x / L - gap) < half && r() < 0.85) continue;
        if (solid.some(([sx, sd, sr]) => Math.hypot(x - sx, d - sd) < sr)) continue;
        const dist = Math.min(1e6, ...centres.map(([cx, cd]) => Math.hypot(x - cx, d - cd)));
        if (dist > bd) { bd = dist; best = [x, d]; }
      }
      if (!best) continue;
      centres.push(best); c++;
      const [x, d] = best, t = d / D;
      // the kind: its weight times how well this depth suits it (a soft bump, so strays happen)
      const odds = (Object.keys(w) as PlantType[]).map(k => { const [m, s] = ZONE[k] ?? [0.5, 0.3]; return [k, w[k]! * (0.2 + Math.exp(-(((t - m) / s) ** 2)))] as const; });
      let pickK = r() * odds.reduce((a, [, v]) => a + v, 0), type = odds[0][0];
      for (const [k, v] of odds) if ((pickK -= v) <= 0) { type = k; break; }
      const p = map(x, d), reach = (H - sub(p.x, p.d)) * (0.3 + 0.7 * Math.min(1, Math.max(0, t) ** 1.1)) * (0.75 + r() * 0.45) * hs;
      const h0 = Math.min(CAP[type] ? CAP[type]! * (0.7 + r() * 0.4) : Infinity, reach);
      const m = type === 'stem' || type === 'stemred' ? 2 + Math.floor(r() * 4) : type === 'grass' ? 2 + Math.floor(r() * 3) : type === 'sword' ? (r() < 0.25 ? 2 : 1) : 1 + Math.floor(r() * 2);
      const rad = type === 'sword' ? 55 : type === 'anubias' ? 30 : 38;
      for (let k = 0; k < m; k++) {
        const a = r() * 6.28, q = k ? rad * Math.sqrt(r()) : 0, dx = Math.cos(a) * q, dd = Math.sin(a) * q;
        plant(type, clamp(x + dx, 15, L - 15), clamp(d + dd, 15, D - 15), h0 * (0.85 + r() * 0.2 + 0.15 * dd / rad));
      }
    }
  };
  /** A small stone group (an accent for planted / wood sets). */
  const rocks = (f: Focus, variant: string, s0: number) => {
    put(variant, L * f.x, D * f.d, s0 * 1.3, tip(variant));
    for (let i = 0, n = many(3, f.k); i < n; i++) { const a = r() * 6.28, dd = s0 * (0.7 + r() * 0.5); put(variant, L * f.x + Math.cos(a) * dd, D * f.d + Math.sin(a) * dd * 0.6, s0 * (0.4 + r() * 0.4), tip(variant)); }
  };

  if (id === 'stones') {
    const base = clamp(Math.min(L, D * 1.6, H * 1.4) * 0.22, 50, 180) * st.scale;
    layer('hard', () => {
      const mats = designed ? ['river'] : pick([['river'], ['river'], ['seiryu'], ['dragon'], ['lava'], ['slate'], ['river', 'lava'], ['seiryu', 'dragon'], ['dragon', 'lava']]);
      const mat = () => mats[Math.floor(r() * mats.length)];
      for (const f of st.foci) {
        const s0 = base * Math.sqrt(f.k), cx = L * f.x * (classic ? 0.9 + r() * 0.2 : 1), cz = D * f.d, v0 = mat();
        const main = put(v0, cx, cz, s0 * 1.4, tip(v0, 0.6));
        for (let i = 0, n = many(7, f.k); i < n; i++) {
          const a = (i / n) * Math.PI * 2 + r() * 0.5, s = s0 * (0.4 + r() * 0.35), dist = s0 * (0.65 + r() * 0.35) * (classic ? 1 : 0.7 + 0.5 / dens), v = mat();
          put(v, cx + Math.cos(a) * dist, clamp(cz + Math.sin(a) * dist * 0.7, s * 0.5, D - s * 0.5), s * (1 + r() * 0.4), tip(v));
        }
        // stones resting on the main one; slate stacks into a ledge of shrinking slabs
        let top = itemDims(main)[1] * (v0 === 'slate' ? 0.95 : 0.8);
        for (let i = 0, n = v0 === 'slate' ? 2 + Math.floor(r() * 3) : dens < 0.5 ? 0 : 2; i < n; i++) {
          const s = v0 === 'slate' ? s0 * 1.4 * (0.85 - 0.12 * i) : s0 * (0.35 + r() * 0.15) * 1.1;
          const it = put(v0, cx + (r() - 0.5) * s0 * 0.5, cz + (r() - 0.5) * s0 * 0.3, s, { lift: top, ...(v0 === 'slate' ? { pitch: Math.round((r() - 0.5) * 8) } : tip(v0, 0.4)) });
          if (v0 === 'slate') top += itemDims(it)[1] * 0.95;
        }
        for (let i = 0, n = many(16, f.k); i < n; i++) {
          const a = r() * Math.PI * 2, dist = s0 * (1.1 + r() * (classic ? 1 : 0.6 + 1.2 / dens)), s = 12 + r() * 16;
          put(mat(), clamp(cx + Math.cos(a) * dist, 20, L - 20), clamp(cz + Math.sin(a) * dist * 0.6, 20, D - 20), s * 1.2);
        }
      }
    });
    // off the designed set, now and then a few plants tucked round the foot of a group (more often, more of them, the
    // fuller the plant stop)
    layer('plant', () => {
      if (!classic) for (const f of st.foci) if (r() < clamp(0.2 + 0.25 * dens, 0, 0.85)) for (let i = 0, n = many(3, f.k); i < n; i++) {
        const s0 = base * Math.sqrt(f.k), cx = L * f.x, cz = D * f.d, a = r() * 6.28, dd = s0 * (0.9 + r() * 0.4);
        plant(r() < 0.5 ? 'anubias' : 'fern', cx + Math.cos(a) * dd, cz + Math.abs(Math.sin(a)) * dd * 0.6, clamp(H * (0.15 + r() * 0.15), 50, 160));
      }
    });
  } else if (id === 'iwagumi') {
    const mh = clamp(H * 0.5, 70, 330) * st.scale;
    layer('hard', () => {
      // a main stone and satellites stepping out to alternate sides, each smaller; the stop sets how many stones in all
      // (odd, 7 at most: the style's rule) and how far apart they stand. The designed set: 5 in fixed spots.
      const stone = designed ? 'seiryu' : pick(['seiryu', 'seiryu', 'dragon', 'lava', 'river']), side = (st.foci[0].x <= 0.5 ? 1 : -1) * (classic && r() < 0.5 ? -1 : 1);
      const lean = designed ? 7 : Math.round(4 + st.wild * 22), ratio = STONE_RATIO[stone] ?? 0.8; // size from the wanted height
      const total = DS.hard > 4 ? 7 + 2 * Math.round(DS.hard - 4) : spec.stones![clamp(Math.round(DS.hard), 0, 4)] ?? 5, foci = st.foci.slice(0, total), sk = foci.reduce((a, f) => a + f.k, 0);
      const share = foci.map(f => Math.floor((total - foci.length) * f.k / sk));
      share[0] += total - foci.length - share.reduce((a, b) => a + b, 0);
      foci.forEach((f, fi) => {
        const mx = classic ? L * (side > 0 ? 0.38 : 0.62) : L * f.x, md = D * f.d, k0 = Math.sqrt(f.k), n = share[fi];
        const spots: V3[] = classic ? [[mx, D * 0.55, 1], [mx + side * L * 0.2, D * 0.45, 0.6], [mx - side * L * 0.16, D * 0.7, 0.45], [mx + side * L * 0.36, D * 0.3, 0.3], [mx - side * L * 0.3, D * 0.35, 0.22]]
          : [[mx, md, k0], ...Array.from({ length: n }, (_, i): V3 => {
            const sg = i % 2 ? -side : side, dist = L * (0.05 + 0.045 * (i + 1)) * (0.7 + 0.6 * r()) * k0 * (0.6 + 0.5 / Math.sqrt(dens));
            return [mx + sg * dist, md + (r() - 0.5) * D * 0.45, k0 * 0.62 * Math.pow(0.8, i) * (0.75 + 0.5 * r())];
          })];
        for (const [x, d, k] of spots) {
          const h = mh * k;
          put(stone, clamp(x, h * 0.4, L - h * 0.4), clamp(d, h * 0.3, D - h * 0.3), h * ratio, { tilt: side * lean, ...(designed ? {} : { pitch: Math.round((r() - 0.3) * 20 * st.wild) }) });
        }
      });
    });
    layer('plant', () => {
      // round the stones where they stand now (kept or just placed): the carpet keeps off them, hair grass at their feet
      const placed = solids().map(it => [it.x, it.depth, it.size / (STONE_RATIO[it.variant] ?? 0.8) * 0.45] as const);
      const front = !classic && r() < 0.3; // carpet only in front of the stones, sand behind
      carpet(0.05, front ? 0.5 : 0.95, (x, d) => placed.some(([px, pd, rr]) => Math.hypot(x - px, (d - pd) * 1.3) < rr + 40));
      for (const [px, pd, rr] of placed) for (let i = 0, n = classic ? 3 : many(3); i < n; i++) plant('grass', px + (r() - 0.5) * rr * 2.4, pd + rr * 0.8 + r() * 20, (60 + r() * 40) * (designed ? 1 : 0.8 + 0.4 * st.scale), 0, true);
      if (!classic && dens > 1 && r() < 0.3 + 0.4 * (dens - 1)) scatter({ grass: 1 }, L * D / 60000, { d0: 0.65 });
    });
  } else if (id === 'driftwood') {
    const kinds = ['branch', 'branch', 'spider', 'manzanita', 'mopani'];
    layer('hard', () => {
      if (classic) {
        const flip = r() < 0.5, size = Math.min(L * 0.78, H * 0.82 / 0.68, D * 2.2), X = (f: number) => (flip ? 1 - f : f) * L;
        put('branch', L * 0.47, D * 0.62, size, { yaw: (flip ? 180 : 0) + Math.round((r() - 0.5) * 16) });
        for (let i = 0; i < 8; i++) { const s = 12 + r() * 18; put('river', X(0.1 + r() * 0.3), D * (0.6 + r() * 0.3), s * 1.2); }
        return;
      }
      // one piece of wood per group (three at most; one at the sparsest stop), pebbles round it; mostly one kind of wood
      const same = q() < 0.65, k0 = designed ? 'branch' : pick(kinds), pebble = designed ? 'river' : pick(['river', 'river', 'lava', 'dragon']);
      const vs = st.foci.map(() => same || designed ? k0 : pick(kinds));
      st.foci.slice(0, dens < 0.5 ? 1 : 3).forEach((f, fi) => {
        const v = vs[fi], g = Math.sqrt(f.k) * st.scale;
        const size = v === 'manzanita' ? H * (0.6 + r() * 0.3) * g : v === 'mopani' ? Math.min(L * 0.35, D * 1.2) * g : v === 'spider' ? Math.min(L * 0.55, D * 1.6) * g : Math.min(L * 0.7, H * 0.82 / 0.68, D * 2.2) * g;
        put(v, L * f.x, D * (f.d + 0.08), size, { yaw: Math.round((r() - 0.5) * 360) });
        for (let i = 0, n = many(5, f.k); i < n; i++) { const s = 12 + r() * 22; put(pebble, L * (f.x + (r() - 0.5) * 0.3), D * (f.d + (r() - 0.3) * 0.35), s * 1.2, tip(pebble)); }
      });
    });
    layer('plant', () => {
      // ferns and anubias tied onto the wood, wherever it stands now
      const woods = solids().filter(it => it.kind === 'wood'), limbsOf = (w: Item) => woodLimbs(w.variant, w.seed, w.size);
      const tieOn = (w: Item, type: PlantType, k: number, t: number, h: number, dd = 0) => {
        const limbs = limbsOf(w), p = itemToTank(S, w, along(limbs[k].pts, t)), g = sub(p.x, p.depth + dd);
        plant(type, p.x, p.depth + dd, h, Math.max(0, p.y + limbs[k].r0 * 0.2 - g), true);
      };
      if (classic) {
        const wood = woods[0], flip = wood ? Math.abs(wood.yaw) > 90 : false, X = (f: number) => (flip ? 1 - f : f) * L;
        if (wood) {
          const n = limbsOf(wood).length;
          for (const t of [0.25, 0.55]) tieOn(wood, 'fern', 0, t, clamp(H * 0.4, 90, 220));
          for (const t of [0.4, 0.75]) tieOn(wood, 'anubias', n - 1, t, clamp(H * 0.22, 60, 130), 10);
        }
        plant('anubias', X(0.2), D * 0.55, clamp(H * 0.25, 60, 140));
        for (const fx of [0.04, 0.1, 0.9, 0.96]) plant('grass', X(fx), D * (0.85 + r() * 0.1), H * (0.8 + r() * 0.15));
        return;
      }
      woods.forEach((w, wi) => {
        const f = st.foci[wi] ?? { k: 0.6 }, limbs = limbsOf(w);
        for (let i = 0, n = many(4, f.k); i < n; i++) {
          const k = Math.floor(r() * limbs.length), t = 0.2 + r() * 0.6, p = itemToTank(S, w, along(limbs[k].pts, t)), fern = k === 0 ? r() < 0.7 : r() < 0.3;
          plant(fern ? 'fern' : 'anubias', p.x, p.depth, fern ? clamp(H * 0.35, 80, 220) * (0.7 + 0.4 * r()) : clamp(H * 0.2, 55, 130), Math.max(0, p.y + limbs[k].r0 * 0.2 - sub(p.x, p.depth)), true);
        }
      });
      scatter(pick<Partial<Record<PlantType, number>>>([{ grass: 1 }, { stem: 1, stemred: 1, anubias: 0.4 }, { grass: 1, stem: 1, fern: 0.5 }]), L * D / (dens > 1.2 ? 30000 : 70000), { d0: 0.15 });
      if (r() < 0.3 + 0.2 * dens) carpet(0.04, 0.3);
    });
  } else if (id === 'planted' && disc) {
    // round tank or bowl: a planted mound, not rows along the back glass, which on a disc left the middle bare
    // (2026-10-12). Tall stems in a cluster just behind the centre (tallest in its middle), swords, ferns and grass
    // round it from side to side, anubias at the front sides, carpet across the front; the front middle stays open.
    layer('plant', () => {
      const cx = L / 2, cd = D / 2, rg = bowl ? bowlRadius(T, sub(cx, cd)) - 3 : Math.min(L, D) / 2;
      const at = (a: number, k: number) => [cx + Math.sin(a) * k * rg, cd + Math.cos(a) * k * rg] as const; // a = 0: straight back
      const STEMS: PlantType[] = designed ? ['stem', 'stemred', 'stem', 'grass', 'stem'] : pick<PlantType[]>([['stem', 'stemred', 'stem', 'grass', 'stem'], ['stemred', 'stem'], ['grass', 'stem'], ['stem']]);
      const mr = 0.5 * rg * (classic ? 1 : 0.7 + 0.3 * Math.min(dens, 1.4)), md = cd + 0.15 * rg;
      const n = Math.max(5, Math.round(Math.PI * mr * mr / 3400 * dens)), turn = r() * 6;
      for (let i = 0; i < n; i++) { // a sunflower spiral, jittered: evenly filled, no rows
        const k = Math.sqrt((i + 0.5) / n), a = turn + i * 2.39996, x = cx + Math.sin(a) * k * mr + (r() - 0.5) * 25, d = md + Math.cos(a) * k * mr + (r() - 0.5) * 25;
        plant(STEMS[(i + Math.floor(r() * 2)) % STEMS.length], x, d, (H - sub(x, d)) * (0.95 - 0.3 * k) * (0.9 + r() * 0.1) * (designed ? 1 : 0.7 + 0.3 * st.scale), 0, true);
      }
      const ring = 0.76 * rg, m = Math.max(dens < 0.5 ? 2 : 4, Math.round(1.5 * Math.PI * ring / 120 * dens));
      for (let i = 0; i < m; i++) {
        const a = -0.75 * Math.PI + 1.5 * Math.PI * (i + 0.5) / m + (r() - 0.5) * 0.15, [x, d] = at(a, ring / rg + (r() - 0.5) * 0.1), k = r();
        const t: PlantType = k < 0.45 ? 'sword' : k < 0.7 ? 'fern' : 'grass';
        plant(t, x, d, t === 'sword' ? clamp(H * 0.5, 100, 320) : t === 'fern' ? clamp(H * 0.35, 80, 220) : H * (0.35 + r() * 0.15), 0, true);
      }
      for (const s of [-1, 1]) { const [x, d] = at(s * 0.68 * Math.PI, 0.82); plant('anubias', x, d, clamp(H * 0.2, 60, 130), 0, true); }
      if (classic || r() < 0.75) carpet(0.04, 0.34);
    });
  } else if (id === 'planted') {
    // a rock group or a piece of wood in the front of a planted tank (none in the designed set or at the sparsest
    // stop, more often the fuller the stop; at the fullest a second on the other side). Placed first: plants keep off it.
    layer('hard', () => {
      if (classic) return;
      const pAcc = clamp((dens - 0.3) / 1.2, 0, 1), gx = st.open >= 0 ? st.open : -1, x0 = gx >= 0 ? gx + (gx < 0.5 ? 0.18 : -0.18) : 0.3 + q() * 0.4;
      const accents = (r() < pAcc ? 1 : 0) + (dens > 1.6 ? 1 : 0);
      for (let i = 0; i < accents; i++) {
        const f = { x: i ? clamp(1 - x0, 0.15, 0.85) : x0, d: 0.32, k: 0.6 }, w = r();
        if (w < 0.6) rocks(f, pick(['seiryu', 'dragon', 'river', 'lava']), clamp(H * 0.18, 30, 90) * st.scale);
        else put(pick(['mopani', 'spider', 'branch']), L * f.x, D * 0.45, Math.min(L * 0.35, D * 1.2) * st.scale);
      }
    });
    layer('plant', () => {
      // open water where the style has one (mid-front in the designed set), unless the tank is packed
      const gap = st.open < 0 || dens > 1.9 ? -1 : st.open, half = classic ? 0.12 : 0.1 + 0.1 / dens;
      const mix: Partial<Record<PlantType, number>> = designed ? { stem: 3, stemred: 2, grass: 1, sword: 1.2, anubias: 0.5, fern: 0.3 }
        : pick<Partial<Record<PlantType, number>>>([
          { stem: 2, stemred: 1.5, grass: 1, sword: 1, anubias: 0.5, fern: 0.4 },
          { grass: 3, sword: 1.5, anubias: 0.5 },                               // vallisneria jungle
          { stem: 2, stemred: 2, fern: 1, anubias: 0.6 },                       // Dutch-style stems
          { stemred: 2, stem: 1, sword: 1.5 },
          { grass: 1.5, stem: 1, fern: 1.5, anubias: 1 },                       // low-tech ferns and anubias
        ]);
      scatter(mix, L * D / 16000, { gap, half });
      const solid = solids();
      if (classic || r() < 0.5 + 0.25 * dens) carpet(0.04, 0.34, (x, d) => solid.some(it => Math.hypot(x - it.x, d - it.depth) < itemDims(it)[0] * 0.4));
    });
  } else if (id === 'swamp') {
    // land: emersed grasses, swords, ferns and a few stones; pools: stems and grass growing up out of the water
    const land = (x: number, d: number) => { const p = map(x, d); return sub(p.x, p.d) > H * 0.3; }, hs = designed ? 1 : st.scale;
    /** Walk the ground in jittered steps (closer the denser) and hand each spot to `at`. */
    const walk = (at: (x: number, d: number) => void) => {
      const step = 1 / Math.sqrt(dens);
      for (let x = 25; x < L - 25; x += (45 + r() * 35) * step) for (let d = D * 0.08; d < D * 0.97; d += (50 + r() * 30) * step) at(x + (r() - 0.5) * 30, d + (r() - 0.5) * 25);
    };
    layer('hard', () => {
      const stone = designed ? 'river' : pick(['river', 'dragon', 'lava', 'seiryu']), pRock = classic ? 0.06 : 0.03 + q() * 0.12;
      walk((x, d) => { if (r() < pRock && land(x, d)) put(stone, x, d, (14 + r() * 26) * 1.2 * (designed ? 1 : 0.6 + st.scale), tip(stone)); });
    });
    layer('plant', () => walk((xx, dd) => {
      const k = r();
      if (land(xx, dd)) { // the spots past 0.78 stay bare ground
        if (k < 0.45) plant('grass', xx, dd, clamp(H * (0.15 + r() * 0.2), 40, 160) * hs);
        else if (k < 0.6) plant('fern', xx, dd, clamp(H * (0.15 + r() * 0.1), 50, 140) * hs);
        else if (k < 0.7) plant('anubias', xx, dd, clamp(H * 0.1, 35, 90));
        else if (k < 0.78) plant('sword', xx, dd, clamp(H * (0.2 + r() * 0.1), 60, 200) * hs);
      } else if (k < 0.3) plant(r() < 0.5 ? 'stem' : 'grass', xx, dd, (H - sub(xx, dd)) * (0.6 + r() * 0.3));
    }));
  } else if (id === 'reef') {
    // live rock islands (two in the designed set, a channel between), a few rocks stacked on each; branching and plate
    // corals up on the rock, mushrooms and leathers lower down and on the sand. Offered in a saltwater tank only (the UI).
    const foci = designed ? [{ x: 0.3, d: 0.55, k: 1 }, { x: 0.73, d: 0.5, k: 0.7 }] : st.foci;
    // a long tank gets wider islands of more rocks, not bigger rocks
    const base = clamp(Math.min(L, D * 1.5, H * 1.3) * 0.3, 60, 240) * st.scale, wide = clamp(L / (base * 3.5), 1, 2.5);
    layer('hard', () => {
      for (const f of foci) {
        const s0 = base * Math.sqrt(f.k), cx = L * f.x, cz = D * f.d, rocks: Item[] = [];
        rocks.push(put('liverock', cx, cz, s0 * 1.3, tip('liverock', 0.4)));
        for (let i = 0, n = Math.max(2, many(4 * wide, f.k)); i < n; i++) {
          const a = (i / n) * Math.PI * 2 + r() * 0.6, dist = s0 * (0.55 + r() * 0.3) * (1 + (wide - 1) * r());
          rocks.push(put('liverock', clamp(cx + Math.cos(a) * dist, 20, L - 20), clamp(cz + Math.sin(a) * dist * 0.55 / Math.sqrt(wide), 20, D - 20), s0 * (0.6 + r() * 0.35), tip('liverock')));
        }
        // stacked: one or two rocks up on the base, smaller as they go, and more until the main island stands about half
        // the water deep (a smaller island a little less), so a big tank's reef is not a low strip (Nathan 2026-10-14)
        const want = ((S.water.on ? H * S.water.level : H) - sub(cx, cz)) * 0.5 * (f.k < 1 ? 0.85 : 1);
        let top = itemDims(rocks[0])[1] * 0.75;
        for (let i = 0, n = dens < 0.5 ? 1 : 1 + Math.floor(r() * 2); i < 6 && (i < n || top < want) && room(cx, cz, top) > 60; i++) {
          const it = put('liverock', rocks[0].x + (r() - 0.5) * s0 * 0.4, rocks[0].depth + (r() - 0.5) * s0 * 0.2, s0 * Math.max(0.45, 0.75 - 0.1 * i), { lift: Math.round(top), ...tip('liverock', 0.5) }, true);
          top += itemDims(it)[1] * 0.7;
        }
      }
      // rubble: small live rock pieces scattered on the sand
      for (let i = 0, n = many(5); i < n; i++) put('liverock', L * (0.05 + r() * 0.9), D * (0.1 + r() * 0.8), 30 + r() * 25);
    });
    layer('plant', () => {
      const mix: Record<string, number> = designed ? { acropora: 2, montipora: 1.5, mushroom: 1, leather: 1 }
        : pick([{ acropora: 2, montipora: 1.5, mushroom: 1, leather: 1 }, { acropora: 3, montipora: 2, mushroom: 0.5, leather: 0.3 }, // SPS
          { mushroom: 2, leather: 2, acropora: 0.5, montipora: 0.5 }, { montipora: 3, acropora: 1, mushroom: 1, leather: 0.5 }]);    // soft, plates
      const coral = (high: boolean) => { // weighted pick, branching and plates preferred up high, soft corals down low
        const w = Object.entries(mix).map(([v, n]) => [v, n * ((v === 'acropora' || v === 'montipora') === high ? 1.6 : 0.6)] as const);
        let k = r() * w.reduce((a, [, n]) => a + n, 0);
        for (const [v, n] of w) if ((k -= n) <= 0) return v;
        return w[0][0];
      };
      /** A coral at (x, d), standing at `lift`, shrunk to the headroom under the water line (left out under 30 mm). */
      const grow = (v: string, x: number, d: number, size: number, lift: number) => {
        const k = itemDims({ kind: 'coral', variant: v, seed: 1, size: 1 })[1], s = Math.min(size, room(x, d, lift) / k, LIBRARY[v].max);
        if (s >= 30) put(v, x, d, s, { lift: Math.round(lift) }, true);
      };
      // each island's rocks, wherever they stand now: the hardscape nearest its centre, within the island's reach
      const island = foci.map(() => [] as Item[]);
      for (const rk of solids()) {
        let bi = 0, bd = Infinity;
        foci.forEach((f, i) => { const dd = Math.hypot(rk.x - L * f.x, rk.depth - D * f.d); if (dd < bd) { bd = dd; bi = i; } });
        if (bd < base * Math.sqrt(foci[bi].k) * (1 + wide)) island[bi].push(rk);
      }
      foci.forEach((f, fi) => {
        const s0 = base * Math.sqrt(f.k), cx = L * f.x, cz = D * f.d, rks = island[fi];
        // corals on the rock: each on a rock's top (the stacked ones first), a little off its middle
        const tops = rks.map(rk => ({ rk, y: rk.lift + itemDims(rk)[1] * 0.8 })).sort((a, b) => b.y - a.y);
        if (tops.length) for (let i = 0, n = Math.max(2, many(3 + wide, f.k)); i < n; i++) {
          const { rk, y } = tops[i % tops.length], [rl, , rw] = itemDims(rk), high = i < tops.length / 2;
          grow(coral(high), rk.x + (r() - 0.5) * rl * 0.35, rk.depth + (r() - 0.5) * rw * 0.3, s0 * (0.55 + r() * 0.35), y);
        }
        // and one or two at the foot, on the sand in front
        for (let i = 0, n = many(1.5, f.k); i < n; i++) {
          const a = Math.PI * (0.15 + r() * 0.7);
          grow(coral(false), clamp(cx + Math.cos(a) * s0 * 1.1, 30, L - 30), clamp(cz - Math.sin(a) * s0 * 0.75, 30, D - 30), s0 * (0.45 + r() * 0.3), 0);
        }
      });
    });
  }
  const items = out.slice(0, MAX_ITEMS);
  seatHook.corals?.({ ...S, items });
  return items;
}

/**
 * Set by the renderer (it has the pieces' real shapes): drops each raised coral onto the actual top of the rock under
 * it. The layouts only guess a rock's top from its box, which left corals floating over a tipped or lumpy rock.
 */
export const seatHook: { corals?: (S: TankSetup) => void } = {};
