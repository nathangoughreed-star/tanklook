// Emperor scorpion (Pandinus imperator): the art id `emperorscorpion` (lane arthropods). Glossy greenish black body, blackish-red granular pincers,
// amber telson, the tail arched over the back (the card is 120 mm = body plus the arched tail), four pairs of walking legs, claws forward.
import type { Limb3D, Mark3D } from '../herps';
import { ground, type ArthSpec } from './util';

const A = 0.4, g = ground(A);
const BLACK = '#080c0b', CLAW: [string, string] = ['#240b08', '#0e0403'], AMBER: [string, string] = ['#5a3410', '#2a1606'];
const side: [number, number, string?][] = [[0.8, g - 0.07, 'c'], [0.75, g - 0.12], [0.62, g - 0.135], [0.45, g - 0.13], [0.28, g - 0.115], [0.19, g - 0.07, 'c'], [0.22, g - 0.03], [0.45, g - 0.024], [0.68, g - 0.03]];
const J = (u: number, dv: number, z: number, r: number): [number, number, number, number] => [u, g - dv, z, r];
// four pairs of walking legs: femur up and out, tibia and foot down to the ground; the front pair reaches forward, the rear pair back
const legs: Limb3D[] = [[0.66, 0.08], [0.55, 0.01], [0.43, -0.03], [0.32, -0.07]].map(([u, k]) => ({
  js: [J(u, 0.05, 0.08, 0.019), J(u + k * 0.5 + 0.03, 0.105, 0.22, 0.017), J(u + k + 0.07, 0.06, 0.29, 0.0125), J(u + k + 0.1, 0.012, 0.33, 0.008)], toes: [[0.012, 0]] as [number, number][], toe: 0.007, seg: '#2a2a28' }));
// pedipalps: short arm, then the big granular chela (palm and two fingers)
const palp: Limb3D = { js: [J(0.72, 0.065, 0.06, 0.03), J(0.78, 0.095, 0.14, 0.028), J(0.835, 0.07, 0.17, 0.027)], toes: [], toe: 0, seg: '#3a1812', claw: { palm: 0.105, r: 0.062, finger: 0.075 }, c: CLAW };
// the tail: five slim segments climbing behind, arching over the back, tip pointing forward; the amber telson (bulb and sting) is its own limb
const tail: Limb3D = { js: [J(0.23, 0.07, 0, 0.034), J(0.13, 0.11, 0, 0.032), J(0.085, 0.2, 0, 0.03), J(0.1, 0.29, 0, 0.0285), J(0.18, 0.35, 0, 0.027), J(0.28, 0.37, 0, 0.025), J(0.37, 0.345, 0, 0.0235)], toes: [], toe: 0, seg: '#2a1a14', c: [BLACK, '#0a0e0e'] };
const telson: Limb3D = { js: [J(0.36, 0.345, 0, 0.022), J(0.4, 0.33, 0, 0.0315), J(0.43, 0.31, 0, 0.012), J(0.445, 0.285, 0, 0.004)], toes: [], toe: 0, c: AMBER };
// tergite plates across the back, and the pale-brown granular pincer shine
const marks: Mark3D[] = [];
for (let i = 0; i < 7; i++) marks.push({ k: 'band', u: [0.205 + i * 0.075, 0.209 + i * 0.075], a: [0, 0.75], c: '#030505', o: 0.55 });
marks.push({ k: 'band', u: [0.2, 0.46], a: [0, 0.18], c: '#2a3a34', o: 0.22, blur: 0.02 });

export const SPEC: ArthSpec = { aspect: A, h: {
  side: side as never, wid: [[0.19, 0.06], [0.35, 0.112], [0.55, 0.125], [0.72, 0.11], [0.8, 0.07]], belly: 2.6,
  tone: [[0, '#151e1c'], [0.4, BLACK], [1, '#050707']], marks, limbs: [...legs, palp, tail, telson], legCol: ['#141a18', '#080b0a'],
  eye: { u: 0.68, th: 0.25, r: 0.011, iris: ['#2a2420', '#050404'], pupil: 'dark', bulge: 0.6 }, ground: g } };
