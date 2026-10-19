// Lizards (lane G1, 2026-10-16; roadmap Release 2): the data of one lizard body plan, built in 3D by render/lizard3d.ts,
// plus a plain side card for the no-WebGL fallback. Per species only numbers: the section along the spine, head and jaw,
// eyes, crests, two limb chains (shoulder / elbow / wrist / hand, hip / knee / ankle / foot) with five toes each, toe
// pads, the tail, the stance and the paint. Units are the animal's total length (TL, tail included) = the card width;
// s = 0 at the tail tip .. 1 at the nose tip, measured along the spine.
import type { Mark3D } from './herps';
import type { Ctx, Proj } from './paint';
import { rng } from './paint';

/** A limb: where it leaves the body, the bone chain and the five toes. */
export interface LizardLimb {
  s: number;                          // girdle station (shoulder / hip) along the spine
  th: number;                         // and round the section (0 back .. pi belly), on the + side
  len: [number, number, number];      // upper arm / thigh, forearm / shank, hand / foot (to the toe bases)
  r: [number, number, number, number]; // radius at the girdle, elbow / knee, wrist / ankle, toe bases
  toes: [number, number][];           // per toe (inner .. outer): length, splay (degrees off the foot's heading; + = outward)
  toe: number;                        // toe radius at the base
  pad?: number;                       // toe pad (lamellae) half-width at the tip; absent = slender clawed toes
  claw: number;                       // claw length
}

export interface LizardSpec {
  aspect: number;                     // card height / length (the picking target); the ground line is aspect / 2 - 0.015
  vent: number;                       // s of the vent: the tail is s 0 .. vent
  hw: [number, number][];             // half-width by s
  hT: [number, number][];             // spine to the back, by s
  hB: [number, number][];             // spine to the belly, by s
  eT: number; eB: number;             // section exponents above / below the spine (higher = flatter)
  jaw: { s: number; th: number; k: number }; // the head from s on: mouth line at section angle th, lower jaw k times as wide
  eye: { s: number; th: number; r: number; iris: [string, string]; lid?: boolean; ring: string; round?: boolean }; // round: a round pupil (anoles), else a vertical slit
  lash?: { n: number; len: number };  // crested gecko: the fringe of spines over each eye ("eyelashes")
  crest?: { n: number; len: number; to: number; th: number }; // and on along each side of the head and back to s = to
  front: LizardLimb; hind: LizardLimb;
  tail: { pad?: number; rings?: number; trail?: boolean }; // prehensile tip pad over the last `pad` of s; `rings` = segment grooves; `trail`: on a branch the tail lies along it instead of winding round it
  dewlap?: { sa: number; sb: number; depth: number; col: [string, string]; rim?: string; open?: number }; // the throat fan (males): from the chin s = sa back to s = sb, `depth` hanging when open; `open` 0 folded .. 1 displayed
  bumps?: { n: number; r: [number, number]; h: number; s: [number, number]; a: [number, number]; seed: number }; // tubercles
  stance: 'sprawl' | 'raised';        // body low and legs out (gecko on a branch or glass), or carried high (leopard gecko)
  climbs: boolean;                    // has clinging poses (glass / wall, branch); else every surface gets the ground pose
  tone: [number, string][];           // colour round the section by a (0 back midline .. 1 belly midline)
  marks: Mark3D[];
  limbCol: [string, string];          // top, underside
  limbSpots?: { c: string; r: number; n: number }; // dark spots (a map multiplied over the limb colour)
  limbPatch?: { c: string; k: number };             // light patches blotched over the legs (share k of the surface, roughly)
  padCol: string; clawCol: string; crestCol?: string;
}

// ---------- crested gecko (Correlophus ciliatus) ----------
// ~20 cm TL, tail ~45 %; broad triangular head, a fringe of spines over each eye running on as a crest along the sides of
// the head and back; large lidless eyes with a slit pupil; broad toe pads; prehensile tail with an adhesive tip pad.
const CRESTED_SHAPE = {
  aspect: 0.15, vent: 0.45,
  hw: [[0, 0.004], [0.06, 0.007], [0.2, 0.012], [0.35, 0.017], [0.44, 0.023], [0.5, 0.04], [0.58, 0.05], [0.68, 0.052], [0.76, 0.045],
    [0.81, 0.031], [0.845, 0.035], [0.875, 0.046], [0.905, 0.045], [0.94, 0.036], [0.975, 0.022], [1, 0.01]] as [number, number][],
  hT: [[0, 0.003], [0.06, 0.0054], [0.2, 0.0111], [0.35, 0.0175], [0.44, 0.023], [0.5, 0.0284], [0.6, 0.0338], [0.7, 0.0338], [0.78, 0.0297], [0.82, 0.0243], [0.86, 0.027], [0.9, 0.0284], [0.94, 0.0243], [0.975, 0.0149], [1, 0.0068]] as [number, number][],
  hB: [[0, 0.003], [0.06, 0.0054], [0.2, 0.0099], [0.35, 0.0149], [0.44, 0.0189], [0.5, 0.023], [0.6, 0.0284], [0.7, 0.0284], [0.78, 0.023], [0.82, 0.0175], [0.86, 0.0189], [0.9, 0.0162], [0.94, 0.0135], [0.975, 0.0095], [1, 0.0054]] as [number, number][],
  eT: 2.2, eB: 3.4,
  jaw: { s: 0.85, th: 0.6 * Math.PI, k: 0.9 },
  lash: { n: 15, len: 0.0095 }, crest: { n: 34, len: 0.0045, to: 0.5, th: 0.3 * Math.PI },
  front: { s: 0.765, th: 0.62 * Math.PI, len: [0.058, 0.052, 0.024], r: [0.0143, 0.0111, 0.0081, 0.0062],
    toes: [[0.016, -62], [0.022, -30], [0.025, -2], [0.024, 26], [0.019, 54]], toe: 0.0031, pad: 0.0052, claw: 0.0016 } as LizardLimb,
  hind: { s: 0.505, th: 0.62 * Math.PI, len: [0.066, 0.062, 0.03], r: [0.0195, 0.0137, 0.0094, 0.0068],
    toes: [[0.018, -58], [0.025, -28], [0.03, -2], [0.032, 24], [0.025, 52]], toe: 0.0034, pad: 0.0058, claw: 0.0018 } as LizardLimb,
  tail: { pad: 0.06 },
  stance: 'sprawl' as const, climbs: true,
  limbCol: ['#b8763a', '#d9b98a'] as [string, string], padCol: '#d8c3a0', clawCol: '#e8dccb',
};
/** Fine dark speckle and the face of every crested gecko (mouth line, nostril, ear opening). */
const CRESTED_FACE: Mark3D[] = [
  { k: 'line', pts: [[0.856, 0.6], [0.9, 0.61], [0.95, 0.6], [0.997, 0.55]], c: '#3a2416', o: 0.75, w: 0.0022 },
  { k: 'spots', n: 1, u: [0.991, 0.991], a: [0.33, 0.33], r: [0.0022, 0.0022], c: '#2a1a10', o: 0.8, seed: 2 },
  { k: 'spots', n: 1, u: [0.866, 0.866], a: [0.47, 0.47], r: [0.0035, 0.0035], c: '#3a2618', o: 0.7, seed: 3 },
];
export const LIZARDS: Record<string, LizardSpec> = {
  // flame: a cream back from the crests up (head to tail base), rust-orange flanks, pale tan belly
  crestedgecko: {
    ...CRESTED_SHAPE,
    eye: { s: 0.935, th: 0.36 * Math.PI, r: 0.0165, iris: ['#c98c4a', '#7d4a22'], ring: '#a8672f' },
    tone: [[0, '#efd7a0'], [0.2, '#e8c98a'], [0.3, '#c27c3c'], [0.55, '#ad6630'], [0.78, '#c99258'], [1, '#e2c7a0']],
    marks: [
      { k: 'band', u: [0.42, 0.97], a: [0.0, 0.22], c: '#f3dfae', o: 0.75, blur: 0.012 },
      { k: 'band', u: [0.48, 0.8], a: [0.22, 0.32], c: '#e9c58c', o: 0.55, blur: 0.01 },
      { k: 'spots', n: 14, u: [0.5, 0.8], a: [0.27, 0.36], r: [0.004, 0.007], c: '#f0d39c', o: 0.4, seed: 5 },
      { k: 'spots', n: 420, u: [0.05, 0.99], a: [0.15, 0.85], r: [0.001, 0.0018], c: '#5a3018', o: 0.3, seed: 6 },
      ...CRESTED_FACE,
    ],
    crestCol: '#f4e2b4',
  },
  // harlequin: dark red-brown with cream patterns running up the flanks and onto the legs, a cream back
  crestedharlequin: {
    ...CRESTED_SHAPE,
    eye: { s: 0.935, th: 0.36 * Math.PI, r: 0.0165, iris: ['#b97b3e', '#6b3c1a'], ring: '#5e2c16' },
    tone: [[0, '#ecd6a6'], [0.18, '#e2c48e'], [0.27, '#7a3a1c'], [0.6, '#6e3218'], [0.8, '#8a4e2a'], [1, '#d8bb92']],
    marks: [
      { k: 'band', u: [0.42, 0.97], a: [0.0, 0.2], c: '#f2dfb2', o: 0.8, blur: 0.012 },
      { k: 'spots', n: 34, u: [0.47, 0.8], a: [0.3, 0.75], r: [0.008, 0.017], c: '#ecd3a2', o: 0.85, seed: 8 },
      { k: 'spots', n: 18, u: [0.3, 0.47], a: [0.25, 0.7], r: [0.006, 0.012], c: '#ecd3a2', o: 0.8, seed: 9 },
      { k: 'spots', n: 10, u: [0.84, 0.93], a: [0.4, 0.7], r: [0.004, 0.008], c: '#e8cc98', o: 0.7, seed: 10 },
      { k: 'spots', n: 420, u: [0.05, 0.99], a: [0.15, 0.85], r: [0.001, 0.0018], c: '#2a120a', o: 0.3, seed: 6 },
      ...CRESTED_FACE,
    ],
    limbCol: ['#7a3a1c', '#c9a77c'], limbPatch: { c: '#ecd3a2', k: 0.3 },
    crestCol: '#f0dcae',
  },
  // leopard gecko (Eublepharis macularius), "normal": ~22 cm TL; a big head, eyelids, a body carried on straighter legs,
  // slender clawed toes (no pads), a thick segmented fat-store tail; yellow with black spots, a pale belly, tubercles
  leopardgecko: {
    aspect: 0.18, vent: 0.42,
    hw: [[0, 0.004], [0.05, 0.0115], [0.15, 0.0312], [0.28, 0.0429], [0.38, 0.0416], [0.43, 0.0334], [0.48, 0.04], [0.58, 0.05], [0.68, 0.051], [0.76, 0.045], [0.8, 0.036], [0.835, 0.04], [0.87, 0.05], [0.905, 0.048], [0.945, 0.037], [0.978, 0.022], [1, 0.01]],
    hT: [[0, 0.0036], [0.05, 0.0108], [0.15, 0.0301], [0.28, 0.0389], [0.38, 0.0372], [0.43, 0.027], [0.5, 0.0288], [0.6, 0.0336], [0.7, 0.0336], [0.78, 0.0288], [0.82, 0.0252], [0.86, 0.0288], [0.9, 0.03], [0.945, 0.024], [0.978, 0.0144], [1, 0.006]],
    hB: [[0, 0.0036], [0.05, 0.0095], [0.15, 0.0265], [0.28, 0.0336], [0.38, 0.0319], [0.43, 0.023], [0.5, 0.024], [0.6, 0.0276], [0.7, 0.0276], [0.78, 0.0228], [0.82, 0.0192], [0.86, 0.0204], [0.9, 0.018], [0.945, 0.0144], [0.978, 0.0096], [1, 0.0048]],
    eT: 2.2, eB: 3,
    jaw: { s: 0.85, th: 0.6 * Math.PI, k: 0.9 },
    eye: { s: 0.93, th: 0.36 * Math.PI, r: 0.0125, iris: ['#6d6a62', '#2c2b28'], lid: true, ring: '#c9a646' },
    front: { s: 0.76, th: 0.62 * Math.PI, len: [0.064, 0.058, 0.024], r: [0.011, 0.008, 0.0055, 0.004],
      toes: [[0.014, -55], [0.019, -26], [0.022, 0], [0.021, 26], [0.016, 52]], toe: 0.0022, claw: 0.0035 },
    hind: { s: 0.49, th: 0.62 * Math.PI, len: [0.074, 0.07, 0.032], r: [0.015, 0.01, 0.0065, 0.0045],
      toes: [[0.016, -52], [0.023, -24], [0.028, 0], [0.03, 22], [0.022, 48]], toe: 0.0024, claw: 0.0038 },
    tail: { rings: 26 },
    bumps: { n: 170, r: [0.0028, 0.0045], h: 0.45, s: [0.12, 0.9], a: [0.0, 0.5], seed: 51 },
    stance: 'raised', climbs: false,
    tone: [[0, '#e7bb3c'], [0.4, '#e4b64a'], [0.56, '#eccf8c'], [0.66, '#f1e6d4'], [1, '#f4ede4']],
    marks: [
      { k: 'spots', n: 105, u: [0.44, 0.985], a: [0.0, 0.58], r: [0.003, 0.0068], c: '#1d1712', o: 0.9, seed: 52 },
      { k: 'spots', n: 70, u: [0.04, 0.44], a: [0.0, 0.6], r: [0.0035, 0.007], c: '#1d1712', o: 0.85, seed: 53 },
      { k: 'band', u: [0.0, 0.44], a: [0.0, 0.62], c: '#efe5d6', o: 0.55, blur: 0.01 },
      ...[0.09, 0.19, 0.29, 0.38].map((u): Mark3D => ({ k: 'band', u: [u, u + 0.035], a: [0.0, 0.6], c: '#8d7f8e', o: 0.5, blur: 0.006 })),
      { k: 'line', pts: [[0.858, 0.6], [0.9, 0.61], [0.95, 0.6], [0.997, 0.55]], c: '#2c2416', o: 0.5, w: 0.0016 },
      { k: 'spots', n: 1, u: [0.991, 0.991], a: [0.33, 0.33], r: [0.0022, 0.0022], c: '#1d1712', o: 0.8, seed: 2 },
      { k: 'spots', n: 1, u: [0.864, 0.864], a: [0.46, 0.46], r: [0.004, 0.004], c: '#2c2416', o: 0.75, seed: 3 },
    ],
    limbCol: ['#e3b64e', '#f0e6d6'], limbSpots: { c: '#1d1712', r: 0.004, n: 30 },
    padCol: '#efe4d2', clawCol: '#d9cdb8',
  },
};

// ---------- anoles (lane AN, 2026-10-19): green anole (Anolis carolinensis), brown anole (Anolis sagrei) ----------
// Slim, long-tailed, light climbers: ~15-20 cm TL of which the whip tail is ~60 %, a narrow wedge head with a long flat
// snout, big round-pupilled eyes under lids, long slender toes with a small adhesive pad, no tail pad (the tail trails).
// Males carry a dewlap, a fan of skin under the throat (folded to a fold of coloured skin, displayed as a sail).
// `k` swells the body (the brown anole is the stockier lizard); `hd` the head.
const anoleCurves = (k: number, hd: number, kv = 1.22) => {
  const sc = (pts: [number, number][], f: (s: number) => number) => pts.map(([s, v]) => [s, +(v * f(s)).toFixed(5)] as [number, number]);
  const f = (s: number) => (s > 0.89 ? hd : 1) * (s > 0.5 && s < 0.9 ? k : 1), fv = (s: number) => f(s) * (s > 0.5 ? kv * (s > 0.9 ? 1.05 : 1) : 1);
  return {
    hw: sc([[0, 0.0015], [0.1, 0.0034], [0.3, 0.0074], [0.5, 0.0128], [0.6, 0.0185], [0.66, 0.0235], [0.75, 0.0262], [0.83, 0.0252], [0.88, 0.0195],
      [0.91, 0.0185], [0.935, 0.0225], [0.96, 0.0168], [0.985, 0.0095], [1, 0.0036]], f),
    hT: sc([[0, 0.0014], [0.1, 0.0032], [0.3, 0.007], [0.5, 0.0118], [0.6, 0.0165], [0.66, 0.0225], [0.75, 0.0265], [0.83, 0.0245], [0.88, 0.0195],
      [0.91, 0.0185], [0.935, 0.0185], [0.96, 0.0135], [0.985, 0.0085], [1, 0.0036]], fv),
    hB: sc([[0, 0.0014], [0.1, 0.0032], [0.3, 0.0068], [0.5, 0.0112], [0.6, 0.0155], [0.66, 0.0215], [0.75, 0.0245], [0.83, 0.0225], [0.88, 0.0165],
      [0.91, 0.0125], [0.935, 0.0115], [0.96, 0.0095], [0.985, 0.0068], [1, 0.0034]], fv),
  };
};
const ANOLE_SHAPE = {
  aspect: 0.11, vent: 0.6, eT: 2.4, eB: 3.2,
  jaw: { s: 0.925, th: 0.6 * Math.PI, k: 0.92 },
  front: { s: 0.865, th: 0.62 * Math.PI, len: [0.046, 0.043, 0.022], r: [0.0085, 0.0062, 0.0045, 0.0034],
    toes: [[0.012, -60], [0.018, -30], [0.023, -2], [0.021, 26], [0.015, 54]], toe: 0.0021, pad: 0.0034, claw: 0.0015 } as LizardLimb,
  hind: { s: 0.64, th: 0.62 * Math.PI, len: [0.064, 0.064, 0.034], r: [0.0115, 0.0078, 0.0054, 0.0038],
    toes: [[0.014, -56], [0.023, -27], [0.032, -2], [0.037, 24], [0.026, 50]], toe: 0.0023, pad: 0.0037, claw: 0.0016 } as LizardLimb,
  tail: { trail: true },
  stance: 'sprawl' as const, climbs: true,
  padCol: '#d9d3c0', clawCol: '#cfc7b6',
};
/** Mouth line, nostril, the ear opening: common to every anole. */
const ANOLE_FACE: Mark3D[] = [
  { k: 'line', pts: [[0.93, 0.6], [0.955, 0.61], [0.98, 0.6], [0.997, 0.55]], c: '#2e2a1c', o: 0.7, w: 0.0016 },
  { k: 'spots', n: 1, u: [0.992, 0.992], a: [0.33, 0.33], r: [0.0016, 0.0016], c: '#1e1a10', o: 0.8, seed: 2 },
  { k: 'spots', n: 1, u: [0.912, 0.912], a: [0.47, 0.47], r: [0.0028, 0.0028], c: '#2e2a1c', o: 0.65, seed: 3 },
];
const GREEN = anoleCurves(1, 1), BROWN = anoleCurves(1.12, 1.1), BROWN_F = anoleCurves(1.02, 1.0);
const GREEN_DEW = { sa: 0.975, sb: 0.893, depth: 0.052, col: ['#e45a7c', '#f3a5bb'] as [string, string] };
const BROWN_DEW = { sa: 0.975, sb: 0.893, depth: 0.056, col: ['#e24f1c', '#f2a526'] as [string, string], rim: '#f4d23a' };
const GREEN_EYE = { s: 0.962, th: 0.37 * Math.PI, r: 0.0086, iris: ['#b98a3c', '#6e4a1c'] as [string, string], lid: true, ring: '#5d8d3a', round: true };
const BROWN_EYE = { s: 0.962, th: 0.37 * Math.PI, r: 0.0086, iris: ['#a07038', '#4e3012'] as [string, string], lid: true, ring: '#6e5236', round: true };
/** Scattered fine dark speckle (scale texture) over the flanks. */
const speck = (c: string, o: number, seed: number): Mark3D => ({ k: 'spots', n: 360, u: [0.05, 0.99], a: [0.1, 0.9], r: [0.0009, 0.0016], c, o, seed });
/** The green anole's pale lip line; the female's pale line down the back. */
const GREEN_MARKS = (stripe: boolean): Mark3D[] => [
  { k: 'band', u: [0.62, 0.97], a: [0.52, 0.66], c: '#eef2d8', o: 0.35, blur: 0.01 },
  speck('#2d4a1c', 0.22, 6),
  ...(stripe ? [{ k: 'band', u: [0.3, 0.93], a: [0.0, 0.1], c: '#f1f0dc', o: 0.7, blur: 0.006 } as Mark3D,
    { k: 'spots', n: 22, u: [0.62, 0.9], a: [0.08, 0.25], r: [0.004, 0.008], c: '#2f3a1c', o: 0.4, seed: 12 } as Mark3D] : []),
  { k: 'spots', n: 7, u: [0.64, 0.84], a: [0.28, 0.5], r: [0.003, 0.006], c: '#f2f0d4', o: 0.35, seed: 14 },
  ...ANOLE_FACE,
];
const BROWN_MARKS = (female: boolean): Mark3D[] => [
  speck('#2a1a0c', 0.3, 7),
  // a dark chevron / diamond pattern down the back, bold in the female and framed by a pale stripe
  ...(female ? [{ k: 'band', u: [0.3, 0.93], a: [0.0, 0.09], c: '#e7d8b4', o: 0.85, blur: 0.005 } as Mark3D,
    { k: 'band', u: [0.3, 0.93], a: [0.09, 0.14], c: '#3b2813', o: 0.55, blur: 0.006 } as Mark3D,
    { k: 'spots', n: 34, u: [0.62, 0.9], a: [0.1, 0.26], r: [0.004, 0.008], c: '#3b2813', o: 0.6, seed: 21 } as Mark3D] :
    [{ k: 'spots', n: 30, u: [0.4, 0.9], a: [0.0, 0.22], r: [0.006, 0.012], c: '#4a3319', o: 0.55, seed: 22 } as Mark3D,
      { k: 'spots', n: 12, u: [0.62, 0.9], a: [0.3, 0.5], r: [0.003, 0.006], c: '#d8c196', o: 0.4, seed: 23 } as Mark3D]),
  { k: 'band', u: [0.62, 0.93], a: [0.52, 0.64], c: '#e9dcc0', o: 0.4, blur: 0.01 },
  ...ANOLE_FACE,
];
const anole = (o: Partial<LizardSpec> & Pick<LizardSpec, 'hw' | 'hT' | 'hB' | 'eye' | 'tone' | 'marks' | 'limbCol'>): LizardSpec => ({ ...ANOLE_SHAPE, ...o });
const GREEN_TONE: [number, string][] = [[0, '#62a03c'], [0.22, '#72b046'], [0.5, '#8cbb5c'], [0.7, '#cfdfb0'], [1, '#ecf1de']];
const GREENBROWN_TONE: [number, string][] = [[0, '#6b5230'], [0.22, '#7c6038'], [0.5, '#8d7248'], [0.7, '#cdbd96'], [1, '#e9e1cc']];
const BROWN_TONE: [number, string][] = [[0, '#6e5334'], [0.2, '#80623c'], [0.5, '#94744a'], [0.7, '#cdb88f'], [1, '#e8dcc2']];
const BROWNF_TONE: [number, string][] = [[0, '#8a6c46'], [0.2, '#957650'], [0.5, '#a58760'], [0.7, '#d4c19c'], [1, '#ece2cb']];
Object.assign(LIZARDS, {
  // green anole, male: bright green (able to turn brown), a pink dewlap with a paler edge
  greenanole: anole({ ...GREEN, eye: GREEN_EYE, tone: GREEN_TONE, marks: GREEN_MARKS(false), limbCol: ['#6aa842', '#d9e6bd'], dewlap: GREEN_DEW }),
  // female: a little smaller, slimmer, a pale line down the back; her dewlap is a small pale-pink flap
  greenanole_f: anole({ ...anoleCurves(0.92, 0.94), eye: GREEN_EYE, tone: GREEN_TONE, marks: GREEN_MARKS(true), limbCol: ['#6aa842', '#d9e6bd'],
    dewlap: { ...GREEN_DEW, depth: 0.018, col: ['#f0c4cc', '#f6dde0'] } }),
  // the same lizard in its brown phase (cold, stressed, on bark)
  greenanolebrown: anole({ ...GREEN, eye: { ...GREEN_EYE, ring: '#6a5a3a' }, tone: GREENBROWN_TONE, marks: [{ k: 'spots', n: 18, u: [0.64, 0.9], a: [0.0, 0.3], r: [0.004, 0.009], c: '#43321a', o: 0.35, seed: 31 }, ...GREEN_MARKS(false)], limbCol: ['#7a6038', '#d9cfae'], dewlap: GREEN_DEW }),
  // brown anole, male: brown, mottled, a deep orange-red dewlap edged yellow
  brownanole: anole({ ...BROWN, eye: BROWN_EYE, tone: BROWN_TONE, marks: BROWN_MARKS(false), limbCol: ['#7a5c38', '#dccdaa'], dewlap: BROWN_DEW }),
  // female: smaller, paler, the pale vertebral stripe between dark chevrons; no real dewlap
  brownanole_f: anole({ ...BROWN_F, eye: BROWN_EYE, tone: BROWNF_TONE, marks: BROWN_MARKS(true), limbCol: ['#8a6c46', '#e0d3b4'],
    dewlap: { ...BROWN_DEW, depth: 0.012, col: ['#d9c9a4', '#e6dcc0'], rim: undefined } }),
});

export const isLizard = (art: string) => art in LIZARDS;

/** Cosine blend through (s, value) points: the section measures along the body. */
export function curveOf(pts: [number, number][]) {
  return (s: number) => {
    if (s <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (s <= pts[i][0]) {
      const [a, va] = pts[i - 1], [b, vb] = pts[i], k = (1 - Math.cos(Math.PI * (s - a) / (b - a))) / 2;
      return va + (vb - va) * k;
    }
    return pts[pts.length - 1][1];
  };
}
/** The ground line v (card frame, + down), = the resting offset. */
export const lizardGround = (L: LizardSpec) => L.aspect / 2 - 0.015;
export function lizardMeta(art: string): { aspect: number; rest: number } | undefined {
  const L = LIZARDS[art]; return L && { aspect: L.aspect, rest: lizardGround(L) };
}

/** The side card (shown only without WebGL): the body's outline standing on the ground line, the near legs, the eye. */
function drawLizard(L: LizardSpec, ctx: Ctx, P: Proj, W: number) {
  const g = lizardGround(L), hT = curveOf(L.hT), hB = curveOf(L.hB), lift = L.stance === 'raised' ? 0.016 : 0.002;
  const spine = (s: number) => g - hB(s) - (s > L.vent - 0.1 ? lift : lift * Math.max(0, (s - L.vent + 0.25) / 0.15));
  const N = 120, top: [number, number][] = [], bot: [number, number][] = [];
  for (let i = 0; i <= N; i++) { const s = i / N; top.push([s, spine(s) - hT(s)]); bot.push([s, spine(s) + hB(s)]); }
  const leg = (l: LizardLimb, dx: number, col: string) => {
    const [x0, y0] = P(l.s, spine(l.s) + hB(l.s) * 0.3), [x1, y1] = P(l.s + dx, g - 0.004);
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = l.r[1] * 2 * W;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 - dx * W * 0.4, y0 - l.r[0] * W, x1, y1); ctx.stroke();
    ctx.lineWidth = l.toe * 2 * W; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + l.toes[2][0] * W * Math.sign(dx || 1), y1 + l.toe * W); ctx.stroke();
  };
  leg(L.front, 0.025, L.limbCol[1]); leg(L.hind, -0.02, L.limbCol[1]);
  const gr = ctx.createLinearGradient(0, P(0, g - 0.06)[1], 0, P(0, g)[1]);
  gr.addColorStop(0, L.tone[0][1]); gr.addColorStop(0.55, L.tone[2][1]); gr.addColorStop(1, L.tone[L.tone.length - 1][1]);
  ctx.fillStyle = gr; ctx.beginPath();
  top.forEach(([u, v], i) => { const [x, y] = P(u, v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  for (const [u, v] of bot.reverse()) { const [x, y] = P(u, v); ctx.lineTo(x, y); }
  ctx.fill();
  const r = rng(7); ctx.fillStyle = 'rgba(30,20,12,0.35)';
  for (let i = 0; i < 90; i++) { const s = 0.05 + r() * 0.92, [x, y] = P(s, spine(s) - hT(s) * (0.2 + r() * 0.6)); ctx.beginPath(); ctx.arc(x, y, (0.002 + r() * 0.003) * W, 0, 7); ctx.fill(); }
  leg(L.front, 0.03, L.limbCol[0]); leg(L.hind, -0.015, L.limbCol[0]);
  const e = L.eye, [ex, ey] = P(e.s, spine(e.s) - hT(e.s) * 0.35);
  ctx.fillStyle = e.iris[0]; ctx.beginPath(); ctx.arc(ex, ey, e.r * W, 0, 7); ctx.fill();
  ctx.fillStyle = '#0b0b0a'; ctx.beginPath(); ctx.ellipse(ex, ey, e.r * W * 0.18, e.r * W * 0.8, 0, 0, 7); ctx.fill();
}
export const LIZARD_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> =
  Object.fromEntries(Object.entries(LIZARDS).map(([k, L]) => [k, (c: Ctx, P: Proj, W: number) => drawLizard(L, c, P, W)]));
