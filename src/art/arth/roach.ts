// Madagascar hissing cockroach (Gromphadorhina portentosa), the male: art id `hissingroach` (lane arthropods). Wingless glossy mahogany oval, tan edge to the
// pronotum and the plates, ribbed abdomen, six legs, long antennae, two horn-like bumps on the pronotum.
import type { Limb3D, Mark3D } from '../herps';
import { ground, type ArthSpec } from './util';

const A = 0.42, g = ground(A);
const J = (u: number, dv: number, z: number, r: number): [number, number, number, number] => [u, g - dv, z, r];
const side: [number, number, string?][] = [[0.97, g - 0.085, 'c'], [0.9, g - 0.17], [0.76, g - 0.205], [0.52, g - 0.215], [0.28, g - 0.19], [0.08, g - 0.11], [0.04, g - 0.085, 'c'], [0.15, g - 0.05], [0.5, g - 0.042], [0.82, g - 0.05]];
// legs: coxa under the body, femur out and up, spiny tibia down to the ground; three pairs, the front forward, the hind back
const legs: Limb3D[] = [[0.78, 0.08], [0.58, 0.0], [0.38, -0.09]].map(([u, k]) => ({
  js: [J(u, 0.075, 0.1, 0.028), J(u + k * 0.45 + 0.02, 0.115, 0.25, 0.024), J(u + k + 0.05, 0.07, 0.33, 0.017), J(u + k + 0.06, 0.012, 0.35, 0.01)], toes: [[0.012, 0]] as [number, number][], toe: 0.007, seg: '#3a2010' }));
// long antennae, swept up and forward, then out; horns on the male's pronotum
const ant = (z: number): Limb3D => ({ js: [J(0.94, 0.09, z * 0.5, 0.006), J(0.985, 0.2, z, 0.005), J(0.955, 0.3, z * 2.3, 0.0035), J(0.89, 0.37, z * 3.6, 0.0022)], toes: [], toe: 0, c: ['#3a2010', '#24140a'] });
const horn: Limb3D = { js: [J(0.82, 0.19, 0.08, 0.03), J(0.855, 0.218, 0.08, 0.02), J(0.875, 0.232, 0.078, 0.011)], toes: [], toe: 0, c: ['#1c0e08', '#120a06'] };
const marks: Mark3D[] = [
  { k: 'band', u: [0.76, 0.99], a: [0.42, 0.54], c: '#a8805a', o: 0.7 },     // tan margin of the pronotum
  { k: 'band', u: [0.74, 0.99], a: [0, 0.3], c: '#1a0c08', o: 0.85, blur: 0.012 },    // dark glossy pronotum
  { k: 'band', u: [0.04, 0.76], a: [0.44, 0.54], c: '#9a6a40', o: 0.5 },    // tan plate edges along the flank
  { k: 'band', u: [0.04, 0.76], a: [0, 0.1], c: '#2a1208', o: 0.4, blur: 0.02 },
];
for (let i = 0; i < 9; i++) marks.push({ k: 'band', u: [0.06 + i * 0.077, 0.066 + i * 0.077], a: [0, 0.55], c: '#1a0a04', o: 0.55 });

export const SPEC: ArthSpec = { aspect: A, h: {
  side: side as never, wid: [[0.05, 0.1], [0.28, 0.2], [0.6, 0.215], [0.86, 0.17], [0.97, 0.09]], belly: 2.4,
  tone: [[0, '#5a1f0e'], [0.35, '#6e2c14'], [0.5, '#7a3a1a'], [1, '#3a1608']], marks, limbs: [...legs, ant(0.04), horn], legCol: ['#4a2410', '#2a1408'],
  eye: { u: 0.955, th: 1.3, r: 0.014, iris: ['#1a1008', '#040202'], pupil: 'dark', bulge: 0.6 }, ground: g } };
