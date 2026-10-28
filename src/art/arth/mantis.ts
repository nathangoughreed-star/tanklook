// Orchid mantis (Hymenopus coronatus), adult female, standing side view: the art id `orchidmantis` (lane arthropods; polish pass 2026-10-28).
// From the Wikimedia Commons photos (Luc Viatour, the MHNL set, the Phalaenopsis pair): cream-white body with a pale green-grey cast on the back and a
// pink-lilac wash toward the leaf lobes; a small triangular head with a pointed crest between two large conical lilac-grey eyes; a slender neck-like
// pronotum with lobed edges and a green mark at the foreleg base; the raptorial forelegs folded up in front of the face (broad femur blade, spine row,
// the tibia laid back along it); four walking legs whose femora and tibiae carry broad flat petal lobes; folded wings as separate overlapping panels
// over a swollen abdomen. The lobes, eye cones, crest, wing panels and spines are `solids` (render/herp3d.ts), the rest is the usual loft and joint chains.
import type { Joint, Limb3D, Solid3D } from '../herps';
import type { Pt } from '../paint';
import { ground, type ArthSpec } from './util';

const A = 0.6, g = ground(A), CREAM = '#f0ecde', PINK = '#e9c4d8', LEG: [string, string] = ['#f1e6e4', '#dcbcd0'];
const LOBE: [string, string] = ['#f6ecec', '#dcb2cb'], WING: [string, string] = ['#eceddf', '#d6d0c8'], WING2: [string, string] = ['#f3e8e6', '#e2c8d2'];
const side: Pt[] = [[0.9, -0.235, 'c'], [0.86, -0.215], [0.8, -0.17], [0.72, -0.135], [0.62, -0.105], [0.5, -0.1], [0.36, -0.14], [0.22, -0.162], [0.1, -0.152], [0.05, -0.12, 'c'],
  [0.09, -0.06], [0.2, 0.02], [0.36, 0.065], [0.5, 0.05], [0.62, -0.03], [0.72, -0.075], [0.8, -0.12], [0.86, -0.185]];

type V3 = [number, number, number];
const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const dir = (a: V3, b: V3): V3 => [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
const len = (a: V3, b: V3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
/** A broad flat petal on a leg segment a..b: width `w` (half), `th` thick, hanging `sh` below the segment's line. */
const lobe = (a: V3, b: V3, w: number, th: number, sh = 0.006, c = LOBE, k = 0.55): Solid3D => {
  const m = mid(a, b);
  return { at: [m[0], m[1] + sh, m[2]], r: [len(a, b) * k, w, th], ax: dir(a, b), c };
};
// a walking leg: hip, knee (femur lobe), ankle (tibia lobe), tip; returns the chain and its two lobes
const walker = (hip: V3, knee: V3, ank: V3, tip: V3, wf: number, wt: number): [Limb3D, Solid3D[]] => [
  { js: [[...hip, 0.012], [...knee, 0.011], [...ank, 0.007], [...tip, 0.004]] as Joint[], toes: [[0.012, 0]], toe: 0.003, seg: '#f3eef0', c: LEG },
  [lobe(hip, knee, wf, 0.0045, 0.012), lobe(knee, ank, wt, 0.0035, 0.008, LOBE, 0.5)]];
const [hind, hindL] = walker([0.4, 0.045, 0.04], [0.26, 0.15, 0.14], [0.2, 0.23, 0.17], [0.16, g, 0.19], 0.036, 0.016);
const [midl, midL] = walker([0.57, 0.0, 0.035], [0.67, 0.12, 0.13], [0.61, 0.225, 0.17], [0.58, g, 0.185], 0.034, 0.015);

// the folded raptorial foreleg: the femur up and forward from the coxa (a broad blade with its spine row), the tibia laid back along it
const COX: V3 = [0.81, -0.1, 0.045], KNEE: V3 = [0.93, -0.25, 0.072], TIP: V3 = [0.895, -0.1, 0.052];
const spine = (a: V3, b: V3, t: number, z: number, l = 0.016): Solid3D => {
  const p: V3 = [a[0] + (b[0] - a[0]) * t - 0.012, a[1] + (b[1] - a[1]) * t + 0.004, z];
  return { at: [p[0] - 0.005, p[1] + 0.006, p[2]], r: [l, 0.0028, 0.0028], ax: [-0.5, 0.75, -0.6], pt: 1, c: ['#ecdfc8', '#bb9c74'] };
};
const solids: Solid3D[] = [
  // forelegs: femur blade, tibia blade, spines along both
  { at: mid(COX, KNEE).map((x, i) => i === 2 ? 0.07 : x) as V3, r: [0.1, 0.032, 0.012], ax: dir(COX, KNEE), c: ['#f4efe2', '#e6d8cf'] },
  { at: [0.925, -0.175, 0.055], r: [0.07, 0.017, 0.008], ax: dir(KNEE, TIP), c: ['#f1ead9', '#dccdc4'] },
  ...[0.18, 0.32, 0.46, 0.6, 0.74].map(t => spine(COX, KNEE, t, 0.052)),
  ...[0.25, 0.5, 0.75].map(t => spine(KNEE, TIP, t, 0.044, 0.011)),
  // head: a small triangular capsule, big conical lilac-grey eyes on its sides, a pointed crest between them, the mouth parts below
  { at: [0.915, -0.265, 0], r: [0.04, 0.03, 0.036], ax: [0.25, 1, 0], pt: 0.88, c: ['#f4eedb', '#eadfce'], one: true },
  { at: [0.925, -0.305, 0.036], r: [0.076, 0.019, 0.019], ax: [0.1, -1, 0.6], pt: 0.92, c: ['#dcd8e6', '#a9a2be'] },
  { at: [0.9, -0.322, 0], r: [0.04, 0.011, 0.011], ax: [0.35, -1, 0], pt: 1, c: ['#f0efd6', '#cfd6a8'], one: true },
  { at: [0.935, -0.215, 0.012], r: [0.02, 0.008, 0.008], ax: [0.3, 1, 0.2], pt: 0.9, c: ['#e8dccc', '#bfa890'] },
  // pronotum: lobed edges, and the green mark at its base (pale green on the cream)
  ...[[0.64, -0.075], [0.7, -0.098], [0.76, -0.125], [0.82, -0.156]].map(([u, v]): Solid3D => ({ at: [u, v, 0.029], r: [0.03, 0.012, 0.005], ax: [1, -0.45, 0], c: ['#f6ecee', '#dfb9cf'] })),
  { at: [0.8, -0.12, 0.036], r: [0.018, 0.006, 0.004], ax: [0.8, -1, 0.3], c: ['#76c04c', '#4f9a35'] },
  // wings: the two forewings overlap over the back, each a long panel, with a shorter pink panel beneath and a pale vein down each
  { at: [0.33, -0.134, 0.028], r: [0.21, 0.008, 0.05], ax: [1, 0.115, 0], c: WING },
  { at: [0.35, -0.124, 0.058], r: [0.185, 0.008, 0.036], up: [0, 1, -0.5], ax: [1, 0.1, 0], c: WING2 },
  { at: [0.31, -0.106, 0.078], r: [0.15, 0.007, 0.026], up: [0, 1, -0.9], ax: [1, 0.09, 0], c: WING },
  { at: [0.33, -0.143, 0.028], r: [0.2, 0.0035, 0.003], ax: [1, 0.115, 0], c: ['#cdbfa6', '#cdbfa6'] },
  // the abdomen's rear tip, a short pair of cerci
  { at: [0.05, -0.115, 0.01], r: [0.02, 0.006, 0.006], ax: [-1, -0.3, 0.3], pt: 0.8, c: ['#eadfd8', '#d2c0bc'] },
  ...hindL, ...midL,
];
const limbs: Limb3D[] = [
  hind, midl,
  // foreleg skeleton under the blades: coxa, femur, tibia
  { js: [[...COX, 0.017], [...KNEE, 0.01], [...TIP, 0.006]] as Joint[], toes: [], toe: 0, seg: '#f6f0ee', c: ['#f1e8e0', '#e3d0d4'] },
  // antennae: fine, long, curving up and back from between the eyes
  { js: [[0.925, -0.33, 0.01, 0.0032], [0.95, -0.42, 0.04, 0.0026], [0.9, -0.5, 0.075, 0.0018], [0.82, -0.55, 0.1, 0.0012]], toes: [], toe: 0, c: ['#3c3426', '#3c3426'] },
];
export const SPEC: ArthSpec = { aspect: A, h: {
  side, wid: [[0.05, 0.03], [0.15, 0.07], [0.3, 0.088], [0.45, 0.078], [0.56, 0.04], [0.64, 0.028], [0.85, 0.026], [0.9, 0.03]], belly: 2.2,
  tone: [[0, '#e8eadb'], [0.3, CREAM], [0.65, '#f1e4e4'], [1, PINK]],
  marks: [
    { k: 'band', u: [0.08, 0.5], a: [0.55, 1.0], c: '#e8c4da', o: 0.55, blur: 0.4 },
    ...[0.1, 0.17, 0.24, 0.31, 0.38, 0.45].map(u => ({ k: 'band' as const, u: [u, u + 0.006] as [number, number], a: [0.2, 1.1] as [number, number], c: '#cfbac6', o: 0.55, blur: 0.002 })),
  ],
  limbs, legCol: LEG, solids,
  // the small dark pupil spot on the near eye cone
  eye: { u: 0.93, th: 0.3, r: 0.0075, iris: ['#2a2830', '#0c0c10'], pupil: 'dark', bulge: 0.9, at: [0.94, -0.29, 0.064] }, ground: g } };
