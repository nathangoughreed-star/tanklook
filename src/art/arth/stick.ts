// Indian stick insect (Carausius morosus), adult female: the art id `indianstick` (lane arthropods; polish pass 2026-10-28). From the Wikimedia Commons
// photos (adult on a tray from above, the side view, the front view with the red-bellied forelegs): a straight, thin, ridged twig body in olive green-brown
// with pale pinkish rings at the abdomen's segment joints and small knobs along the thorax and abdomen; a small flattened head with tiny eyes and thin long
// antennae; the front pair held forward together in line with the head, red on the inner base of the femur; long thin middle and hind legs with swollen knees,
// and the two sides in different poses (one middle leg reaching forward and the far one back, the hind legs apart). The card holds the whole animal, so
// the body takes about three quarters of the width and the forelegs reach to the nose end.
import type { Pt } from '../paint';
import type { Joint, Limb3D, Mark3D, Solid3D } from '../herps';
import { ground, type ArthSpec } from './util';

const A = 0.34, g = ground(A), BR = '#85815c', DK = '#5e5a3e', JOINT = '#4e4630';
const side: Pt[] = [[0.77, -0.074, 'c'], [0.73, -0.092], [0.66, -0.09], [0.5, -0.093], [0.3, -0.095], [0.1, -0.09], [0.03, -0.075, 'c'], [0.1, -0.05], [0.3, -0.05], [0.5, -0.049], [0.66, -0.055], [0.73, -0.057]];
// a leg's near side and its own far side (different pose); the knees swell, the joints are darker
const leg = (js: Joint[], farJs?: Joint[], extra: Partial<Limb3D> = {}): Limb3D => ({ js, farJs, toes: [[0.008, 0]], toe: 0.003, seg: JOINT, knee: 1.3, c: [BR, DK], ...extra });
const limbs: Limb3D[] = [
  // forelegs: held forward together, in line with the head; the far one a little lower and apart. Red on the inner base of the femur.
  leg([[0.67, -0.072, 0.01, 0.0086], [0.8, -0.098, 0.02, 0.0066], [0.9, -0.102, 0.026, 0.0053], [0.995, -0.09, 0.03, 0.0037]],
    [[0.67, -0.072, 0.01, 0.0086], [0.79, -0.092, 0.03, 0.0066], [0.89, -0.085, 0.048, 0.0053], [0.985, -0.066, 0.066, 0.0037]], { toes: [], tint: { r: 0.085, c: '#b8472f' } }),
  // middle: the near one forward (femur out and up, tibia down and forward), the far one back
  leg([[0.44, -0.07, 0.01, 0.0086], [0.5, -0.098, 0.07, 0.007], [0.47, -0.05, 0.13, 0.0053], [0.45, g, 0.165, 0.0037]],
    [[0.44, -0.07, 0.01, 0.0086], [0.35, -0.088, 0.075, 0.007], [0.3, -0.04, 0.14, 0.0053], [0.27, g, 0.18, 0.0037]]),
  // hind: the near one back and down, the far one out and a little forward
  leg([[0.2, -0.07, 0.01, 0.0086], [0.1, -0.1, 0.07, 0.007], [0.07, -0.03, 0.13, 0.0053], [0.03, g, 0.17, 0.0037]],
    [[0.2, -0.07, 0.01, 0.0086], [0.15, -0.092, 0.09, 0.007], [0.19, -0.035, 0.16, 0.0053], [0.15, g, 0.205, 0.0037]]),
  // antennae: very thin, forward and a little out, nearly as long as the forelegs
  leg([[0.76, -0.08, 0.006, 0.0018], [0.86, -0.118, 0.016, 0.0015], [0.95, -0.132, 0.026, 0.0012], [1.0, -0.128, 0.03, 0.0008]], undefined, { toes: [], toe: 0, seg: undefined, knee: undefined, c: ['#6c6240', '#6c6240'] }),
  // the two cerci at the rear
  leg([[0.04, -0.072, 0.003, 0.0029], [0.0, -0.07, 0.007, 0.0016]], undefined, { toes: [], toe: 0, seg: undefined, knee: undefined, c: [DK, DK] }),
];
const solids: Solid3D[] = [
  // the head: slightly flattened, a little paler than the neck, wider than tall
  { at: [0.742, -0.077, 0], r: [0.03, 0.0125, 0.0135], ax: [1, 0.15, 0], pt: 0.25, c: ['#938e5c', '#6c6840'], one: true },
  // the prothorax's hip bulges where the legs leave
  ...[0.67, 0.44, 0.2].map((u): Solid3D => ({ at: [u, -0.066, 0.011], r: [0.012, 0.009, 0.008], ax: [1, 0, 0], c: ['#8c8858', '#625c3a'] })),
];
const rings = (u0: number, u1: number, n: number) => Array.from({ length: n }, (_, i) => u0 + (u1 - u0) * i / (n - 1));
export const SPEC: ArthSpec = { aspect: A, h: {
  side, wid: [[0.03, 0.011], [0.1, 0.02], [0.5, 0.022], [0.66, 0.021], [0.74, 0.016], [0.77, 0.009]], belly: 2.4,
  tone: [[0, '#7f7c58'], [0.45, BR], [1, '#9c9870']],
  marks: [
    // fine ridges along the body (lighter, stretched down the back and flanks), the pale pinkish rings at the segment joints, the red blush at the foreleg base
    ...[0.12, 0.3, 0.5, 0.72].map((a): Mark3D => ({ k: 'line', pts: [[0.05, a], [0.7, a]], c: a < 0.2 ? '#c2bc86' : '#5a5232', o: 0.5, w: 0.0035 })),
    ...rings(0.06, 0.5, 9).map((u): Mark3D => ({ k: 'band', u: [u, u + 0.005], a: [0.0, 1.1], c: '#cdb496', o: 0.75, blur: 0.002 })),
    ...rings(0.52, 0.66, 3).map((u): Mark3D => ({ k: 'band', u: [u, u + 0.004], a: [0.0, 1.1], c: '#bfae88', o: 0.6, blur: 0.002 })),
    { k: 'band', u: [0.665, 0.7], a: [0.55, 1.0], c: '#b0503c', o: 0.45, blur: 0.012 },
  ],
  warts: { n: 90, u: [0.06, 0.7], a: [0.04, 0.5], r: [0.0035, 0.0055], h: 0.6, seed: 4 },
  limbs, legCol: [BR, DK], solids,
  eye: { u: 0.74, th: 0.3, r: 0.0062, iris: ['#3a3220', '#14100a'], pupil: 'dark', bulge: 0.85, at: [0.752, -0.082, 0.0125] }, ground: g } };
