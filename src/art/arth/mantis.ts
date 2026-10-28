// Orchid mantis (Hymenopus coronatus), adult female, standing side view: the art id `orchidmantis` (lane arthropods). From the Luc Viatour photo
// (Wikimedia Commons): cream-white body with a pink-lilac wash, a green neck mark, pale lilac-grey cone eyes, the spined raptorial forelegs
// folded up in front, the four walking legs with flattened petal lobes on the femora, the wings folded over a swollen abdomen curving up at the rear.
import type { Limb3D } from '../herps';
import type { Pt } from '../paint';
import { ground, type ArthSpec } from './util';

const A = 0.6, g = ground(A), CREAM = '#efe6d6', PINK = '#e6bfd0', LEG: [string, string] = ['#efe3e4', '#d9bccb'];
const side: Pt[] = [[0.99, -0.17, 'c'], [0.96, -0.22], [0.89, -0.23], [0.83, -0.19], [0.76, -0.1], [0.62, -0.06], [0.45, -0.08], [0.28, -0.13], [0.12, -0.17], [0.05, -0.15, 'c'],
  [0.07, -0.07], [0.2, 0.03], [0.4, 0.07], [0.58, 0.04], [0.7, -0.03], [0.8, -0.1], [0.9, -0.13], [0.97, -0.14]];
// the petal lobes: the femur swells to a broad, flat blade (radius is the half-height; the flattening is the leg's own)
const walker = (u: number, ku: number, tu: number, z: number, k = 0): Limb3D => ({ js: [[u, 0.03, 0.025, 0.013], [ku, 0.14 + k, z * 0.6, 0.038], [ku - 0.02, 0.22 + k, z * 0.9, 0.024], [tu, g, z, 0.005]], toes: [[0.01, 0]], toe: 0.004, seg: '#f3eef0', c: LEG });
const limbs: Limb3D[] = [
  walker(0.5, 0.4, 0.3, 0.2), walker(0.6, 0.58, 0.55, 0.16, 0.01), // hind, middle (right side; the far side mirrors)
  // raptorial foreleg folded up: coxa forward, femur (spined, deep) down-forward, tibia folded back up against it
  { js: [[0.82, -0.08, 0.05, 0.024], [0.9, -0.01, 0.08, 0.032], [0.955, 0.03, 0.075, 0.02], [0.95, -0.06, 0.07, 0.014], [0.9, -0.15, 0.065, 0.01]], toes: [], toe: 0, seg: '#f6f0ee', c: ['#f1e8e0', '#e3d0d4'] },
  // antennae
  { js: [[0.93, -0.2, 0.012, 0.0035], [0.96, -0.3, 0.03, 0.003], [0.9, -0.35, 0.06, 0.002]], toes: [], toe: 0, c: ['#4a4232', '#4a4232'] },
];
export const SPEC: ArthSpec = { aspect: A, h: {
  side, wid: [[0.05, 0.04], [0.2, 0.09], [0.4, 0.1], [0.58, 0.055], [0.72, 0.04], [0.84, 0.04], [0.93, 0.055], [0.99, 0.02]], belly: 2.2,
  tone: [[0, CREAM], [0.5, '#f1dfe2'], [1, PINK]],
  marks: [{ k: 'band', u: [0.15, 0.5], a: [0.0, 0.3], c: '#ead0e0', o: 0.55, blur: 0.4 }, { k: 'band', u: [0.72, 0.8], a: [0.0, 0.4], c: '#5fae3c', o: 0.9, blur: 0.2 }],
  limbs, legCol: LEG,
  eye: { u: 0.93, th: 0.3, r: 0.036, iris: ['#cfc8de', '#8a82a6'], pupil: 'round', bulge: 1.1, at: [0.935, -0.225, 0.04] }, ground: g } };
