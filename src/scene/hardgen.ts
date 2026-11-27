// Procedural hardscape (lane HG1, R187, 2026-11-27): the seeded generators' knobs, colours and wood skeletons.
// A stone or wood piece is drawn from its variant + seed (Shuffle = a new seed) and, after that, its own look settings
// (Item.hs): texture, colour, shade, and per family branches / spread / gnarl (wood) or layers / holes / height (rock).
// Every setting is 0..1 with 0.5 = the type's own look, and absent = 0.5, so a file saved before HG1 draws from its seed
// alone. The looks are written down from photos in research/hardscape/refs.md.
import { rng } from '../art/paint';
import type { HardStyle } from './types';

type V3 = [number, number, number];
/** One wood limb: a smooth tube through `pts` (local mm, base on y = 0), radius r0 -> r1; tone 1 = a darker piece.
 *  knob: how lumpy its radius is (0 = smooth); blunt: its far end snapped off (a broken stub, no worn round tip);
 *  lattice: a cholla skeleton (a hollow tube cut through with a lattice of holes). */
export interface Limb { pts: V3[]; r0: number; r1: number; tone: number; knob?: number; blunt?: boolean; lattice?: boolean }

export const HS_KEYS = ['tex', 'tone', 'branch', 'spread', 'gnarl', 'layers', 'holes', 'tall'] as const;
export type HsKey = typeof HS_KEYS[number];
/** A setting, 0..1 (0.5 when unset). */
export const hsv = (hs: HardStyle | undefined, k: HsKey) => hs?.[k] ?? 0.5;
/** A cache key part for the look settings ('' when none: older pieces keep their old keys). */
export const hsKey = (hs: HardStyle | undefined) => hs ? HS_KEYS.map(k => hs[k] ?? '').join(',') + '/' + (hs.col ?? '') : '';
/** Keep only known settings, clamped (file load, edits). Undefined when nothing is set. */
export function cleanHs(o: unknown): HardStyle | undefined {
  if (!o || typeof o !== 'object') return undefined;
  const src = o as Record<string, unknown>, out: HardStyle = {};
  for (const k of HS_KEYS) { const v = src[k]; if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.round(Math.min(1, Math.max(0, v)) * 100) / 100; }
  if (typeof src.col === 'number' && Number.isInteger(src.col) && src.col >= 0 && src.col < 12) out.col = src.col;
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------------------------------------------------------- colours
/** Colour choices per type (a swatch each). Stones: one tone, painted with its own mottling. Wood: [main, light] (mopani's
 *  light is its honey patches). Absent col = picked from the seed among the first few, as before HG1. From the photos
 *  in research/hardscape/refs.md. */
export const STONE_COLS: Record<string, { label: string; hex: string }[]> = {
  river: [{ label: 'Brown-grey', hex: '#8a8378' }, { label: 'Sand', hex: '#a89f90' }, { label: 'Slate grey', hex: '#6e6a64' }, { label: 'Tan', hex: '#9a8a70' }, { label: 'Charcoal', hex: '#55524e' }],
  seiryu: [{ label: 'Blue-grey', hex: '#444a52' }, { label: 'Light grey', hex: '#62676e' }, { label: 'Charcoal', hex: '#33373d' }],
  dragon: [{ label: 'Clay brown', hex: '#5e4a38' }, { label: 'Ochre', hex: '#6e5636' }, { label: 'Earth', hex: '#4c3e32' }, { label: 'Olive grey', hex: '#63604f' }],
  holey: [{ label: 'Cream', hex: '#d3cab4' }, { label: 'Bone', hex: '#e0d8c4' }, { label: 'Buff', hex: '#c2b496' }],
  lace: [{ label: 'Grey-brown', hex: '#5e5a54' }, { label: 'Charcoal', hex: '#45423e' }, { label: 'Rust grey', hex: '#6a5a4a' }, { label: 'Pale grey', hex: '#a8a49a' }],
  lava: [{ label: 'Red-brown', hex: '#5a2f28' }, { label: 'Black', hex: '#2e2a28' }, { label: 'Rust red', hex: '#7a3a2a' }],
  slate: [{ label: 'Dark grey', hex: '#4c5058' }, { label: 'Blue-black', hex: '#3a3e46' }, { label: 'Green-grey', hex: '#525a54' }, { label: 'Rust', hex: '#6a5444' }],
  shale: [{ label: 'Blue-grey', hex: '#34383f' }, { label: 'Black', hex: '#2a2a2e' }, { label: 'Brown-grey', hex: '#463e38' }, { label: 'Rust', hex: '#7a4e32' }],
  ledge: [{ label: 'Sandstone', hex: '#7e7262' }, { label: 'Buff', hex: '#9a8a70' }, { label: 'Grey', hex: '#736a5e' }],
};
/** How many colours a piece with no col picks among (by seed), as before HG1. */
export const STONE_SEEDED: Record<string, number> = { river: 5, seiryu: 3, dragon: 3, holey: 3, lace: 3, lava: 3, slate: 3, shale: 3, ledge: 3 };
export const WOOD_COLS: Record<string, { label: string; c: [string, string] }[]> = {
  spider: [{ label: 'Pale tan', c: ['#b48e64', '#c9a77c'] }, { label: 'Honey', c: ['#94683e', '#ae8050'] }, { label: 'Weathered grey', c: ['#8a8072', '#a19686'] }, { label: 'Aged brown', c: ['#6a4c32', '#80603f'] }],
  malaysian: [{ label: 'Dark brown', c: ['#2e1e14', '#4e3420'] }, { label: 'Chestnut', c: ['#5a3920', '#73492a'] }, { label: 'Near black', c: ['#261a12', '#3a2819'] }],
  mopani: [{ label: 'Two-tone', c: ['#6a482e', '#c8ae84'] }, { label: 'Dark', c: ['#3e2a1c', '#8a6a44'] }, { label: 'Pale', c: ['#8c6a45', '#d6c29c'] }],
  manzanita: [{ label: 'Red-orange', c: ['#9c5634', '#b06a44'] }, { label: 'Deep red', c: ['#6a3224', '#7e4030'] }, { label: 'Pale tan', c: ['#b89870', '#c8aa84'] }, { label: 'Grey twig', c: ['#9a8c74', '#aa9e86'] }],
  redmoor: [{ label: 'Orange-brown', c: ['#99602f', '#b47a42'] }, { label: 'Red-brown', c: ['#7a4632', '#93583f'] }, { label: 'Dark', c: ['#54301f', '#6c412c'] }],
  cholla: [{ label: 'Tan', c: ['#a07a48', '#b8945e'] }, { label: 'Brown', c: ['#86684a', '#a08060'] }, { label: 'Grey', c: ['#8a8070', '#a49a88'] }],
  branch: [{ label: 'Brown', c: ['#6b4a2e', '#5e4128'] }, { label: 'Grey', c: ['#7a7064', '#6a6056'] }, { label: 'Dark', c: ['#4a3220', '#3e2a1c'] }],
  climb: [{ label: 'Pale', c: ['#8d8170', '#7a6e60'] }, { label: 'Brown', c: ['#6e5a44', '#5e4c3a'] }],
};
/** Swatches for a variant (the editor's colour chips): [label, hex]. Empty = no colour choice. */
export function colours(variant: string): { label: string; hex: string }[] {
  if (STONE_COLS[variant]) return STONE_COLS[variant];
  return (WOOD_COLS[variant] ?? []).map(w => ({ label: w.label, hex: w.c[0] }));
}

// ---------------------------------------------------------------------------------------------------------------- knobs per type
/** Which look settings a variant offers (beyond texture, shade and colour, which every generated piece has). */
export const WOOD_GEN = new Set(['spider', 'malaysian', 'mopani', 'manzanita', 'redmoor', 'cholla', 'branch']);
export const ROCK_GEN = new Set(['river', 'seiryu', 'dragon', 'holey', 'lace', 'lava', 'slate', 'shale']);
export function hsFields(variant: string): HsKey[] {
  if (WOOD_GEN.has(variant)) return variant === 'cholla' ? ['tex', 'tone', 'branch', 'gnarl', 'holes'] : ['tex', 'tone', 'branch', 'spread', 'gnarl'];
  if (ROCK_GEN.has(variant)) {
    const f: HsKey[] = ['tex', 'tone', 'tall'];
    if (variant === 'slate' || variant === 'shale' || variant === 'seiryu') f.push('layers');
    if (variant === 'dragon' || variant === 'holey' || variant === 'lace' || variant === 'lava') f.push('holes');
    return f;
  }
  return [];
}
export const HS_LABEL: Record<HsKey, [string, string]> = {
  tex: ['Texture', 'Smooth and worn (left) to rough, deep grain and bark (right)'],
  tone: ['Shade', 'Lighter or darker than the colour'],
  branch: ['Branches', 'How many limbs and forks'],
  spread: ['Spread', 'Upright and narrow (left) to low and sprawling (right)'],
  gnarl: ['Gnarl', 'Straight (left) to twisted, kinked and knobbly (right)'],
  layers: ['Layers', 'How many layers or ledges it splits into'],
  holes: ['Holes', 'How pitted and holed it is'],
  tall: ['Height', 'Squat (left) to tall (right), for its length'],
};

// ---------------------------------------------------------------------------------------------------------------- wood skeletons
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const nrm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Turn `d` by `ang` radians toward a random direction square to it. */
function turn(d: V3, ang: number, r: () => number): V3 {
  const a = Math.abs(d[1]) < 0.9 ? [0, 1, 0] as V3 : [1, 0, 0] as V3, b1 = nrm(cross(d, a)), b2 = cross(d, b1), t = r() * Math.PI * 2;
  const s = nrm([b1[0] * Math.cos(t) + b2[0] * Math.sin(t), b1[1] * Math.cos(t) + b2[1] * Math.sin(t), b1[2] * Math.cos(t) + b2[2] * Math.sin(t)]);
  return nrm(add([d[0] * Math.cos(ang), d[1] * Math.cos(ang), d[2] * Math.cos(ang)], s, Math.sin(ang)));
}

/** One type's growth rules. Lengths and radii are fractions of the piece's size; angles in radians. */
interface Plan {
  /** main limbs [min, max] at branch 0.5 (branch 0 halves, 1 doubles) */ n: [number, number];
  /** where they start: a knot (all from one lumpy centre), a stump (from the top of a short upright trunk), a trunk (one
   *  long limb, the rest forking off it), a log (one thick lying limb with stubby limbs) */ base: 'knot' | 'stump' | 'trunk' | 'log';
  len: [number, number]; rad: number; taper: number;
  /** elevation of the main limbs [min, max] at spread 0.5 (spread 1 flattens them, 0 stands them up) */ el: [number, number];
  /** forks: chance per limb, how deep, angle, where along the parent, how long (of the parent), always two (a Y) */ fork: number; depth: number; fAng: [number, number]; kidT: [number, number]; kidLen: [number, number]; two?: boolean; /** most forks off one limb (2) */ kids?: number;
  /** wander per segment at gnarl 0.5 */ wander: number; knob: number; broken: number;
  /** pull per segment: + up (manzanita reaching up), - down (roots sagging) */ lift: number;
  /** size = height (manzanita) instead of length */ tall?: boolean;
}
const PLANS: Record<string, Plan> = {
  // a thick short knotted stub with a few long thin limbs rising out of it, forking, some tips snapped (refs: open, airy)
  // a thick short knotted stub, limbs rising out of it that fork again and again into many fine twigs tapering to nearly
  // nothing (refs: open, airy; R191: "many thin, fine tips ... not a few thick sticks")
  spider: { n: [5, 8], base: 'knot', len: [0.5, 0.85], rad: 0.016, taper: 0.05, el: [0.45, 1.25], fork: 0.95, depth: 3, fAng: [0.3, 0.65], kidT: [0.25, 0.85], kidLen: [0.3, 0.6], kids: 3, wander: 0.22, knob: 0.08, broken: 0.25, lift: 0.05 },
  // a knotty base with very many wiry, curling rootlets reaching out and up
  redmoor: { n: [10, 16], base: 'stump', len: [0.32, 0.55], rad: 0.011, taper: 0.15, el: [0.2, 1.25], fork: 0.8, depth: 3, fAng: [0.3, 0.75], kidT: [0.3, 0.85], kidLen: [0.35, 0.65], wander: 0.5, knob: 0.06, broken: 0.2, lift: 0.03 },
  // a tree: one trunk rising and splitting in Y forks into ever finer limbs, smooth, sinuous
  manzanita: { n: [1, 1], base: 'trunk', len: [0.3, 0.36], rad: 0.035, taper: 0.7, el: [1.2, 1.45], fork: 1, depth: 4, fAng: [0.3, 0.6], kidT: [0.8, 1], kidLen: [0.6, 0.85], two: true, wander: 0.16, knob: 0.04, broken: 0.12, lift: 0.06, tall: true },
  // near-black gnarled root mass: thick knuckled limbs spiking out and up, snapped ends, grooves
  malaysian: { n: [4, 7], base: 'knot', len: [0.24, 0.52], rad: 0.05, taper: 0.28, el: [0.35, 1.15], fork: 0.5, depth: 1, fAng: [0.4, 0.9], kidT: [0.3, 0.8], kidLen: [0.3, 0.6], wander: 0.3, knob: 0.16, broken: 0.6, lift: 0.04 },
  // one low chunky slab-like piece, two-tone, knobbly, one or two short limbs
  mopani: { n: [1, 2], base: 'log', len: [0.16, 0.3], rad: 0.085, taper: 0.5, el: [0.2, 0.8], fork: 0.2, depth: 1, fAng: [0.4, 0.9], kidT: [0.3, 0.8], kidLen: [0.4, 0.7], wander: 0.28, knob: 0.2, broken: 0.5, lift: 0.02 },
  // a driftwood branch: a trunk rising from one end with side branches that fork again
  branch: { n: [3, 6], base: 'trunk', len: [0.22, 0.4], rad: 0.04, taper: 0.3, el: [0.25, 0.6], fork: 0.6, depth: 2, fAng: [0.35, 0.75], kidT: [0.3, 0.85], kidLen: [0.4, 0.7], wander: 0.22, knob: 0.08, broken: 0.4, lift: 0.04 },
  // cholla skeleton: one hollow lattice tube, sometimes a second branching off
  cholla: { n: [1, 1], base: 'log', len: [0.3, 0.45], rad: 0.055, taper: 0.85, el: [0.2, 0.5], fork: 0.3, depth: 1, fAng: [0.5, 0.9], kidT: [0.3, 0.8], kidLen: [0.5, 0.8], wander: 0.08, knob: 0, broken: 1, lift: 0 },
};
export const isGenWood = (v: string) => v in PLANS;

/**
 * A generated piece of wood: limbs in its own frame, length along x, centred, base on y = 0, scaled so its length (or,
 * for manzanita, its height) is `size`.
 */
export function genWood(variant: string, seed: number, size: number, hs?: HardStyle): Limb[] {
  const P = PLANS[variant], r = rng(seed * 17 + 3);
  const nb = hsv(hs, 'branch'), sp = hsv(hs, 'spread'), gn = hsv(hs, 'gnarl');
  const nk = nb < 0.5 ? 0.5 + nb : 1 + 2 * (nb - 0.5); // 0.5x .. 2x limbs
  const wander = P.wander * (0.25 + 1.5 * gn), knob = P.knob * (0.3 + 1.4 * gn), elK = 1.6 - 1.2 * sp; // spread 1 flattens (x0.4), 0 lifts (x1.6)
  const out: Limb[] = [], SEG = 7;
  /** a limb from p along d; returns its points */
  const grow = (p: V3, d: V3, len: number, r0: number, depth: number, tone = 0): void => {
    const pts: V3[] = [p]; let q = p, dir = d;
    for (let i = 0; i < SEG; i++) {
      dir = turn(dir, wander * (0.5 + r()), r);
      dir = nrm(add(dir, [0, P.lift, 0]));
      q = add(q, dir, len / SEG);
      if (q[1] < r0 * 0.6) { q = [q[0], r0 * 0.6, q[2]]; dir = nrm([dir[0], Math.abs(dir[1]) * 0.3, dir[2]]); } // lies on the ground, does not dig in
      pts.push(q);
    }
    const r1 = Math.max(r0 * P.taper, 0.0007), blunt = r() < P.broken;
    out.push({ pts, r0, r1, tone, knob, blunt, ...(variant === 'cholla' ? { lattice: true } : {}) });
    if (depth <= 0) return;
    const most = P.kids ?? 2, kids = P.two ? (r() < 0.25 * nk ? 3 : 2) : r() < P.fork * Math.min(1.6, nk) ? Math.min(most, 1 + Math.floor(r() * most * Math.min(1.5, nk))) : 0;
    const t0 = P.kidT[0] + r() * (P.kidT[1] - P.kidT[0]);
    for (let k = 0; k < kids; k++) {
      const t = P.two ? t0 : P.kidT[0] + r() * (P.kidT[1] - P.kidT[0]), at = pts[Math.round(t * SEG)], rr = (r0 + (r1 - r0) * t) * (P.two ? 0.78 : 0.6 + r() * 0.2);
      const fa = P.fAng[0] + r() * (P.fAng[1] - P.fAng[0]);
      grow(at, turn(dir, fa, r), len * (P.kidLen[0] + r() * (P.kidLen[1] - P.kidLen[0])), rr, depth - 1, tone);
    }
  };
  const nMain = Math.max(1, Math.round((P.n[0] + r() * (P.n[1] - P.n[0])) * nk));
  const el = (k: number) => Math.min(1.5, (P.el[0] + (P.el[1] - P.el[0]) * k) * elK);
  if (P.base === 'knot' || P.base === 'stump') {
    // the crown: a few short fat lumps (knot) or a short leaning trunk (stump)
    const top: V3 = P.base === 'stump' ? [0, 0.18, 0] : [0, 0.05, 0];
    if (P.base === 'stump') out.push({ pts: [[-0.02, 0, 0.01], [0.0, 0.07, 0], add([0, 0.12, 0], [(r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.04]), top], r0: 0.055, r1: 0.04, tone: 0, knob: knob * 1.5, blunt: true });
    const kr = P.rad * (variant === 'malaysian' ? 1.8 : 2.6);
    for (let k = 0; k < 3; k++) { const a = r() * 6.28; out.push({ pts: [[0, kr * 0.8, 0], [Math.cos(a) * kr, kr * (1 + r() * 0.6), Math.sin(a) * kr], [Math.cos(a) * kr * 2, kr * 0.7, Math.sin(a) * kr * 2]], r0: kr, r1: kr * 0.7, tone: 0, knob: knob * 1.5, blunt: true }); }
    for (let i = 0; i < nMain; i++) {
      const az = (i / nMain) * Math.PI * 2 + (r() - 0.5) * 0.9, e = el(r());
      const d = nrm([Math.cos(az) * Math.cos(e) * 1.25, Math.sin(e), Math.sin(az) * Math.cos(e) * 0.8]); // longer along the piece's length
      const from = P.base === 'stump' ? add(top, [(r() - 0.5) * 0.04, -r() * 0.12, (r() - 0.5) * 0.04]) : add(top, d, 0.03);
      grow(from, d, P.len[0] + r() * (P.len[1] - P.len[0]), P.rad * (0.8 + r() * 0.5), P.depth);
    }
  } else if (P.base === 'trunk') {
    if (P.tall) {
      grow([0, 0, 0], nrm([(r() - 0.5) * 0.3, 1, (r() - 0.5) * 0.3]), P.len[0] + r() * (P.len[1] - P.len[0]), P.rad, P.depth);
      for (let k = 0; k < 3; k++) { const a = r() * 6.28; out.push({ pts: [[0, 0.03, 0], [Math.cos(a) * 0.06, 0.02, Math.sin(a) * 0.06], [Math.cos(a) * 0.13, 0.008, Math.sin(a) * 0.13]], r0: P.rad * 0.7, r1: P.rad * 0.2, tone: 0, knob }); }
    } else {
      // a trunk from one end, rising, its side limbs forking off along it
      const e = el(0.5), trunkD = nrm([1, Math.tan(e) * 0.9, (r() - 0.5) * 0.3]), pts: V3[] = [[-0.5, P.rad, (r() - 0.5) * 0.1]];
      let q = pts[0], d = trunkD;
      for (let i = 0; i < 8; i++) { d = nrm(add(turn(d, wander * 0.6 * (0.5 + r()), r), [0, 0.02, 0])); q = add(q, d, 1.05 / 8); pts.push(q); }
      out.push({ pts, r0: P.rad, r1: P.rad * P.taper, tone: 0, knob, blunt: r() < P.broken });
      for (let i = 0; i < nMain; i++) {
        const t = 0.2 + 0.7 * (i + r() * 0.7) / nMain, at = pts[Math.round(t * 8)], side = i % 2 ? 1 : -1;
        const dd = nrm(add(add(trunkD, [0, 0.6 + el(r()), side * (0.6 + r() * 0.6)]), [(r() - 0.5) * 0.6, 0, 0]));
        grow(at, dd, P.len[0] + r() * (P.len[1] - P.len[0]), P.rad * (1 - t * (1 - P.taper)) * 0.6, P.depth - 1);
      }
      // a lower root limb at the foot
      out.push({ pts: [[-0.5, P.rad, 0], [-0.42, P.rad * 0.6, 0.12], [-0.3, P.rad * 0.5, 0.2]], r0: P.rad * 0.7, r1: P.rad * 0.3, tone: 1, knob, blunt: true });
    }
  } else {
    // a log: one thick body lying, arched, its ends broken; the main limbs rise off it
    const pts: V3[] = []; let d = nrm([1, (r() - 0.3) * 0.5, (r() - 0.5) * 0.4]), q: V3 = [-0.5, P.rad * 0.9, 0];
    pts.push(q);
    const arch = (r() - 0.2) * 0.25;
    for (let i = 0; i < 8; i++) { d = nrm(add(turn(d, wander * 0.7 * (0.5 + r()), r), [0, arch * (i < 4 ? 1 : -1), 0])); q = add(q, d, 1 / 8); if (q[1] < P.rad * 0.8) q = [q[0], P.rad * 0.8, q[2]]; pts.push(q); }
    out.push({ pts, r0: P.rad, r1: P.rad * (variant === 'cholla' ? 0.9 : 0.7), tone: 0, knob, blunt: true, ...(variant === 'cholla' ? { lattice: true } : {}) });
    const nl = variant === 'cholla' ? (r() < 0.3 + 0.5 * nb ? 1 : 0) : nMain;
    for (let i = 0; i < nl; i++) {
      const t = 0.15 + 0.7 * (i + r()) / Math.max(1, nl), at = pts[Math.round(t * 8)];
      const dd = nrm([(r() - 0.5) * 1.2, Math.tan(el(r())), (r() - 0.5) * 1.4]);
      grow(at, dd, P.len[0] + r() * (P.len[1] - P.len[0]), P.rad * (0.45 + r() * 0.25), P.depth, 0);
    }
  }
  if (variant === 'cholla') for (const l of out) l.knob = hsv(hs, 'holes'); // its lattice reads the Holes setting from here
  // fit: centre on x and z, base on y = 0, scale to the size
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const l of out) for (const p of l.pts) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
  const k = size / Math.max(1e-6, P.tall ? hi[1] - Math.min(0, lo[1]) : hi[0] - lo[0]), cx = (lo[0] + hi[0]) / 2, cz = (lo[2] + hi[2]) / 2, y0 = Math.min(0, lo[1]);
  for (const l of out) { l.pts = l.pts.map(p => [(p[0] - cx) * k, Math.max(0, p[1] - y0) * k, (p[2] - cz) * k]); l.r0 *= k; l.r1 *= k; }
  return out;
}

/** Height scale for a rock (its Height setting): 0.5 = the type's own; 0 = 0.55x; 1 = 1.6x. */
export const tallK = (hs?: HardStyle) => { const t = hsv(hs, 'tall'); return t < 0.5 ? 0.55 + 0.9 * t : 1 + 1.2 * (t - 0.5); };
/** A pleasant name for a seed (the editor shows it so a look can be found again). */
export const seedName = (seed: number) => '#' + (seed % 100000).toString().padStart(5, '0');
