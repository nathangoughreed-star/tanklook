// Giant African millipede (Archispirostreptus gigas): the art id `africanmillipede` (lane arthropods). A long glossy brown-black tube of ~56 rings, a rust
// rim to each ring, rust-orange legs (generated, one visible pair per ring), a small head with two short antennae. 250 mm card, so the aspect is tiny.
import type { Limb3D, Mark3D } from '../herps';
import { ground, type ArthSpec } from './util';

const A = 0.12, g = ground(A), N = 56, U0 = 0.03, U1 = 0.9, R = 0.036;
// the back rises gently from the head and settles toward the tail (a slow S), the underside lifts a hair between the legs
const top = (u: number) => g - 0.07 - 0.005 * Math.sin((u - 0.1) * 5);
const side: [number, number, string?][] = [[0.965, g - 0.03, 'c'], [0.93, top(0.93) + 0.005]];
for (const u of [0.8, 0.6, 0.4, 0.2]) side.push([u, top(u)]);
side.push([0.06, top(0.06)], [0.015, g - 0.04, 'c'], [0.04, g - 0.012], [0.2, g - 0.012], [0.5, g - 0.012], [0.8, g - 0.012], [0.94, g - 0.016]);
const step = (U1 - U0) / N;
const marks: Mark3D[] = [];
for (let i = 0; i < N; i++) {
  const u = U0 + i * step;
  marks.push({ k: 'band', u: [u, u + step * 0.3], a: [0, 1], c: '#050303', o: 0.7 });                 // the groove between rings
  marks.push({ k: 'band', u: [u + step * 0.78, u + step * 1.02], a: [0, 1], c: '#8a3e1a', o: 0.4 });   // rust rear rim of the ring
}
marks.push({ k: 'band', u: [0.03, 0.92], a: [0, 0.2], c: '#7a4a2c', o: 0.35, blur: 0.015 });      // a bronze sheen along the back
// one leg pair per ring: short, hanging from under the tube and tilted rearward
const legs: Limb3D[] = [];
for (let i = 1; i < N - 1; i++) {
  const u = U0 + (i + 0.5) * step + 0.018, s = 0.0025 * Math.sin(i * 0.55);
  legs.push({ js: [[u, g - 0.022, 0.026, 0.0045], [u - 0.004 + s, g - 0.011, 0.036, 0.004], [u - 0.007 + s, g - 0.001, 0.04, 0.003]], toes: [[-0.002, 0]], toe: 0.0025 });
}
const ant: Limb3D = { js: [[0.945, g - 0.04, 0.012, 0.0035], [0.975, g - 0.028, 0.024, 0.003], [0.995, g - 0.012, 0.034, 0.002]], toes: [], toe: 0, c: ['#8a4a26', '#5a2c14'] };

export const SPEC: ArthSpec = { aspect: A, h: {
  side: side as never, wid: [[0.025, 0.026], [0.1, R], [0.8, R], [0.91, 0.032], [0.965, 0.022]], belly: 2.1,
  tone: [[0, '#2e1c14'], [0.35, '#1c110c'], [1, '#0e0806']], marks, limbs: [...legs, ant], legCol: ['#9a4e26', '#5e2c14'],
  eye: { u: 0.945, th: 0.9, r: 0.006, iris: ['#2a1a10', '#050303'], pupil: 'dark', bulge: 0.6 }, ground: g } };
