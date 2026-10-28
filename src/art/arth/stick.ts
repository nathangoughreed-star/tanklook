// Indian stick insect (Carausius morosus), adult female: the art id `indianstick` (lane arthropods). From the reference photo (Wikimedia Commons,
// on raspberry): a straight, thin, ridged twig body in brown with a green-grey cast, a small head with a red blush at the base of the forelegs,
// the front pair held forward in line with the head, the middle and hind pairs angled out and back, thread antennae. The card holds the whole
// animal, so the body takes about three quarters of the width and the forelegs reach to the nose end.
import type { Pt } from '../paint';
import type { Limb3D } from '../herps';
import { ground, type ArthSpec } from './util';

const A = 0.34, g = ground(A), BR = '#86704c', DK = '#5e4e34';
const side: Pt[] = [[0.76, -0.075, 'c'], [0.72, -0.1], [0.66, -0.095], [0.5, -0.094], [0.3, -0.095], [0.1, -0.09], [0.03, -0.075, 'c'], [0.1, -0.048], [0.3, -0.05], [0.5, -0.048], [0.66, -0.056], [0.72, -0.048]];
const leg = (js: [number, number, number, number][], c?: [string, string]): Limb3D => ({ js, toes: [], toe: 0, seg: '#55452c', c: c ?? [BR, DK] });
const limbs: Limb3D[] = [
  // forelegs: held forward together, in line with the head (red at the coxa)
  leg([[0.67, -0.072, 0.01, 0.011], [0.8, -0.1, 0.022, 0.008], [0.9, -0.1, 0.03, 0.007], [0.99, -0.088, 0.03, 0.005]]),
  // middle: femur out and up, tibia down to the ground
  leg([[0.44, -0.07, 0.01, 0.011], [0.38, -0.12, 0.07, 0.009], [0.32, -0.04, 0.13, 0.007], [0.26, g, 0.17, 0.005]]),
  // hind: back and down
  leg([[0.2, -0.07, 0.01, 0.011], [0.1, -0.11, 0.07, 0.009], [0.07, -0.03, 0.13, 0.007], [0.03, g, 0.17, 0.005]]),
  // antennae: thin, forward
  leg([[0.74, -0.08, 0.008, 0.0025], [0.86, -0.12, 0.016, 0.002], [0.97, -0.14, 0.02, 0.0015]], ['#6a5a3c', '#6a5a3c']),
];
export const SPEC: ArthSpec = { aspect: A, h: {
  side, wid: [[0.03, 0.012], [0.1, 0.02], [0.5, 0.022], [0.66, 0.02], [0.74, 0.016], [0.77, 0.008]], belly: 2.4,
  tone: [[0, '#8c7a54'], [0.5, BR], [1, '#6e6a48']],
  marks: [{ k: 'band', u: [0.62, 0.7], a: [0.2, 0.8], c: '#c0483a', o: 0.7, blur: 0.3 }, { k: 'line', pts: [[0.05, 0.1], [0.7, 0.1]], c: '#4e3f2a', o: 0.5, w: 0.004 }],
  limbs, legCol: [BR, DK],
  eye: { u: 0.74, th: 0.3, r: 0.008, iris: ['#3a2f20', '#1a140c'], pupil: 'dark', bulge: 0.8 }, ground: g } };
