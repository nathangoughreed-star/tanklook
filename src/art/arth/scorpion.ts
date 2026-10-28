// Emperor scorpion (Pandinus imperator): the art id `emperorscorpion` (lane arthropods). Matte-glossy blue-black body, granular pitted carapace and tail, blue-black rugose pincers with keels and hairs,
// amber telson, the tail arched over the back (the card is 120 mm = body plus the arched tail), four pairs of walking legs, claws forward.
import type { Limb3D, Mark3D, Solid3D } from '../herps';
import { ground, type ArthSpec } from './util';

const A = 0.4, g = ground(A);
// real colours (photos 2026-10-28): a blue-black body with a faint slate-blue cast, matte-glossy; the pincers the same blue-black, not red; amber telson
const SLATE = '#090d14', CLAW: [string, string] = ['#0e141d', '#0a0e15'], AMBER: [string, string] = ['#8a5a24', '#3c2410'], KEEL = '#1c2536';
const side: [number, number, string?][] = [[0.8, g - 0.07, 'c'], [0.75, g - 0.12], [0.62, g - 0.135], [0.45, g - 0.13], [0.28, g - 0.115], [0.19, g - 0.07, 'c'], [0.22, g - 0.03], [0.45, g - 0.024], [0.68, g - 0.03]];
const J = (u: number, dv: number, z: number, r: number): [number, number, number, number] => [u, g - dv, z, r];
// four pairs of walking legs: femur up and out, tibia and foot down to the ground; the front pair reaches forward, the rear pair back
const legs: Limb3D[] = [[0.66, 0.08], [0.55, 0.01], [0.43, -0.03], [0.32, -0.07]].map(([u, k]) => ({
  js: [J(u, 0.05, 0.08, 0.019), J(u + k * 0.5 + 0.03, 0.105, 0.22, 0.017), J(u + k + 0.07, 0.06, 0.29, 0.0125), J(u + k + 0.1, 0.012, 0.33, 0.008)], toes: [[0.012, 0]] as [number, number][], toe: 0.007, seg: '#1c2230', waist: 0.82, c: ['#090d14', '#080b10'] as [string, string] }));
// pedipalps: short arm, then the big granular chela (palm and two fingers)
const palp: Limb3D = { js: [J(0.72, 0.065, 0.06, 0.03), J(0.78, 0.095, 0.14, 0.028), J(0.835, 0.07, 0.17, 0.027)], toes: [], toe: 0, seg: '#222a38', waist: 0.86, claw: { palm: 0.105, r: 0.062, finger: 0.075 }, c: CLAW };
// the tail: five slim segments climbing behind, arching over the back, tip pointing forward; the amber telson (bulb and sting) is its own limb
const TAILJ = [J(0.23, 0.07, 0, 0.034), J(0.13, 0.11, 0, 0.032), J(0.085, 0.2, 0, 0.03), J(0.1, 0.29, 0, 0.0285), J(0.18, 0.35, 0, 0.027), J(0.28, 0.37, 0, 0.025), J(0.37, 0.345, 0, 0.0235)];
const tail: Limb3D = { js: TAILJ, toes: [], toe: 0, seg: '#2a2c34', waist: 0.93, c: [SLATE, '#080b10'] };
const telson: Limb3D = { js: [J(0.36, 0.345, 0, 0.022), J(0.4, 0.33, 0, 0.0315), J(0.43, 0.31, 0, 0.012), J(0.445, 0.285, 0, 0.004)], toes: [], toe: 0, c: AMBER };
// tergite plates across the back (grooves) over a pitted, granular carapace
const marks: Mark3D[] = [
  { k: 'spots', n: 380, u: [0.2, 0.8], a: [0, 0.8], r: [0.0016, 0.0034], c: '#1c2434', o: 0.5, seed: 31 },
  { k: 'spots', n: 380, u: [0.2, 0.8], a: [0, 0.8], r: [0.0016, 0.0034], c: '#020305', o: 0.7, seed: 32 },
];
for (let i = 0; i < 7; i++) marks.push({ k: 'band', u: [0.205 + i * 0.075, 0.211 + i * 0.075], a: [0, 0.8], c: '#010203', o: 0.7 }, { k: 'band', u: [0.211 + i * 0.075, 0.226 + i * 0.075], a: [0, 0.8], c: '#161e2c', o: 0.2, blur: 0.004 });
marks.push({ k: 'band', u: [0.2, 0.8], a: [0, 0.04], c: '#1a2230', o: 0.5, blur: 0.004 }); // the median keel along the back
// small hairs (thin pointed solids): trichobothria along the pincers' edges, a few on the tail, and the pectines under the belly
const solids: Solid3D[] = [];
const hair = (u: number, v: number, z: number, nu: number, nv: number, nz: number, len: number, c: [string, string] = ['#1c2432', '#0c1018']) => {
  const n = Math.hypot(nu, nv, nz) || 1, h = len / 2;
  solids.push({ at: [u + nu / n * h, v + nv / n * h, z + nz / n * h], r: [h, 0.0011, 0.0011], ax: [nu / n, nv / n, nz / n], pt: 0.9, c });
};
// the chela: palm centre and half-axes (card frame, v down), ridges (keels) along its back and flanks, hairs round its edge
const PC = [0.879, g - 0.07 - 0.002, 0.17], PA = [0.0525, 0.062, 0.038];
for (const dz of [-0.014, 0.014, 0.026]) { // three keels along the palm's back, a long thin lighter ridge each
  const f = Math.sqrt(Math.max(0, 1 - (dz / PA[2]) ** 2));
  solids.push({ at: [PC[0] - 0.004, PC[1] - PA[1] * f * 0.98, PC[2] + dz], r: [0.05 * f + 0.01, 0.0036, 0.0036], ax: [1, 0.18, 0], c: [KEEL, '#10151e'] });
}
for (const dv of [-0.03, 0.002, 0.03]) // two flank ridges and the lower one, on the outer face
  solids.push({ at: [PC[0] - 0.002, PC[1] + dv, PC[2] + PA[2] * Math.sqrt(Math.max(0, 1 - (dv / PA[1]) ** 2)) * 0.97], r: [0.044, 0.0032, 0.0032], ax: [1, 0.14, 0], c: [KEEL, '#10151e'] });
for (let i = 0; i < 16; i++) { // trichobothria: long fine hairs standing up from the palm's rim and the fingers' base
  const th = -2.6 + i * 0.2, x = Math.cos(th), y = Math.sin(th), f = 1;
  hair(PC[0] + PA[0] * x * f, PC[1] + PA[1] * y * f, PC[2] + (i % 3 - 1) * 0.012, x, y * 1.6, (i % 3 - 1) * 0.5, 0.017 + (i % 4) * 0.004);
}
for (let i = 0; i < 6; i++) { // fine hairs along the fingers' inner edges
  const f = 0.2 + i * 0.16; hair(PC[0] + 0.045 + 0.07 * f, PC[1] + 0.002 + 0.03 * f, PC[2] + 0.004, 0.2, -1, 0.6, 0.014);
}
for (let i = 0; i < TAILJ.length - 1; i++) { // keels along each tail segment: a ridge on the outer edge and one on each flank
  const [a, b] = [TAILJ[i], TAILJ[i + 1]], du = b[0] - a[0], dv = b[1] - a[1], L = Math.hypot(du, dv) || 1, r = (a[3] + b[3]) / 2;
  let nu = dv / L, nv = -du / L; if (nu * (a[0] - 0.2) + nv * (a[1] - (g - 0.2)) < 0) { nu = -nu; nv = -nv; } // normal pointing away from the arch's centre
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ln = L * 0.46;
  solids.push({ at: [m[0] + nu * r * 0.92, m[1] + nv * r * 0.92, 0], r: [ln, 0.0034, 0.0034], ax: [du / L, dv / L, 0], c: [KEEL, '#0a0d14'] });
  solids.push({ at: [m[0] + nu * r * 0.45, m[1] + nv * r * 0.45, r * 0.8], r: [ln, 0.003, 0.003], ax: [du / L, dv / L, 0], c: [KEEL, '#0a0d14'] });
}
for (let i = 0; i < TAILJ.length - 1; i++) { // a few hairs on each tail segment
  const [a, b] = [TAILJ[i], TAILJ[i + 1]], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], r = (a[3] + b[3]) / 2;
  hair(m[0], m[1] - r * 0.6, r * 0.8, 0, -0.4, 1, 0.016); hair(m[0] + 0.01, m[1] + r * 0.4, r * 0.9, 0, 0.3, 1, 0.014);
}
for (const [u, v] of [[0.5, g - 0.03], [0.4, g - 0.03]] as [number, number][]) { // the pectines: a pale comb plate on each side under the belly, five teeth
  solids.push({ at: [u, v + 0.006, 0.026], r: [0.034, 0.004, 0.011], ax: [1, 0, 0], c: ['#7a6a4a', '#4a3e2a'] });
  for (let t = 0; t < 5; t++) solids.push({ at: [u - 0.026 + t * 0.013, v + 0.016, 0.026], r: [0.0085, 0.0018, 0.0018], ax: [0.1, 1, 0], pt: 0.8, c: ['#7a6a4a', '#4a3e2a'] });
}

export const SPEC: ArthSpec = { aspect: A, h: {
  side: side as never, wid: [[0.19, 0.06], [0.35, 0.112], [0.55, 0.125], [0.72, 0.11], [0.8, 0.07]], belly: 2.6,
  tone: [[0, '#10161f'], [0.4, '#0c1118'], [1, '#06080b']], marks, limbs: [...legs, palp, tail, telson], legCol: ['#090d14', '#080b10'],
  warts: { n: 520, u: [0.2, 0.8], a: [0, 0.75], r: [0.004, 0.0075], h: 0.55, seed: 41 }, solids,
  legSpots: { c: '#9aa0aa', r: 0.012, n: 5 },
  eye: { u: 0.68, th: 0.25, r: 0.011, iris: ['#2a2420', '#050404'], pupil: 'dark', bulge: 0.6 }, ground: g } };
