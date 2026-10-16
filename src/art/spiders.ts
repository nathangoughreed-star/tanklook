// Spiders (lane JS, 2026-10-16; roadmap Release 2): the data of the jumping-spider body plan, built in 3D by
// render/spider3d.ts, plus a plain side card for the no-WebGL fallback and picking. Unit = the BODY length (nose of the
// carapace to the spinnerets = the card width = the species' `tl`); legs reach well past the card. Body frame as the herps:
// x forward (the head at +x, the body spans -0.5 .. 0.5), y up, z to the animal's + side; heights y are measured from the
// underside of the carapace (the sternum), the standing surface lies at y = -stand below it.
import type { Ctx, Proj } from './paint';

/** A station along a loft: x, half-width, extent above and below its centre line, the centre line's height. */
export type Stn = [x: number, hw: number, top: number, bot: number, yc: number];
/** One of the eight legs (the + side; the far side mirrors it). */
export interface SpiderLeg {
  hx: number; hz: number;               // where the coxa leaves the underside (x along the body, z out from the midline)
  foot: [number, number];               // the tarsus tip's place on the surface in the walking pose (x, z from the midline)
  len: [number, number, number, number, number, number]; // coxa, femur, patella, tibia, metatarsus, tarsus
  r: [number, number, number, number, number, number, number]; // radius at the joints: hip, coxa/femur, femur/patella, patella/tibia, tibia/meta, meta/tarsus, tip
}
/** Marks painted onto a part's texture: (x along the body in body lengths, s = arc from the dorsal midline in body lengths). */
export type SMark =
  | { k: 'ell'; x: number; s: number; rx: number; rs: number; c: string; o: number; soft?: number; one?: boolean }
  | { k: 'band'; x: [number, number]; s: [number, number]; c: string; o: number; soft?: number }
  | { k: 'mottle'; n: number; r: [number, number]; c: string; o: number; seed: number };

export interface SpiderSpec {
  sex: 'm' | 'f';
  aspect: number;                       // card height / width
  stand: { ground: number; glass: number };  // underside of the carapace above the surface when walking, and when clinging
  carapace: Stn[]; abdomen: Stn[];
  eT: number; eB: number;               // section exponents (higher = boxier)
  legs: [SpiderLeg, SpiderLeg, SpiderLeg, SpiderLeg];
  // eyes: centre (x, z), radius; the carapace's top / front surface gives the height
  eyes: { ame: { y: number; z: number; r: number }; ale: { x: number; y: number; z: number; r: number }; pme: { x: number; z: number; r: number }; ple: { x: number; z: number; r: number } };
  palp: { pts: [number, number, number][]; r: number[]; bulb: number };
  chel: { col: [string, string]; len: number; r: number };
  // paint
  carapaceCol: string; abdomenCol: string; legCol: [string, string]; palpCol: string; hairCol: string;
  carapaceMarks: SMark[]; abdomenMarks: SMark[];
  legBands: number[];                   // segments (0 coxa .. 5 tarsus) that wear the pale colour
  hair: { body: number; leg: number };  // strands per body part / per leg
}

/** The ground line v (card frame, + down), = the resting offset. */
export const spiderGround = (S: SpiderSpec) => S.aspect / 2 - 0.015;

const CARAPACE: Stn[] = [
  [0.478, 0.05, 0.06, 0.06, 0.135], [0.46, 0.105, 0.085, 0.078, 0.14], [0.43, 0.135, 0.115, 0.095, 0.165], [0.36, 0.155, 0.13, 0.13, 0.16],
  [0.28, 0.165, 0.135, 0.16, 0.15], [0.2, 0.16, 0.11, 0.15, 0.125], [0.12, 0.125, 0.075, 0.115, 0.085], [0.06, 0.08, 0.05, 0.08, 0.055], [0.025, 0.035, 0.03, 0.04, 0.04],
];
const ABDOMEN_F: Stn[] = [
  [0.07, 0.045, 0.045, 0.045, 0.08], [0.0, 0.12, 0.09, 0.095, 0.11], [-0.1, 0.17, 0.11, 0.115, 0.12], [-0.22, 0.19, 0.12, 0.125, 0.125],
  [-0.34, 0.17, 0.115, 0.11, 0.115], [-0.45, 0.11, 0.075, 0.07, 0.1], [-0.53, 0.03, 0.03, 0.03, 0.1],
];
/** The male's abdomen: slimmer and a little shorter. */
const ABDOMEN_M: Stn[] = ABDOMEN_F.map(([x, hw, t, b, yc]) => [x * 0.9 - (x < 0 ? 0.01 : 0), hw * 0.8, t * 0.88, b * 0.88, yc] as Stn);

const leg = (hx: number, foot: [number, number], len: SpiderLeg['len'], r: SpiderLeg['r']): SpiderLeg => ({ hx, hz: 0.075, foot, len, r });
const LEGS_F: SpiderSpec['legs'] = [
  leg(0.3, [0.86, 0.4], [0.07, 0.3, 0.13, 0.22, 0.15, 0.11], [0.05, 0.047, 0.053, 0.046, 0.04, 0.03, 0.018]),
  leg(0.22, [0.62, 0.74], [0.07, 0.26, 0.11, 0.18, 0.14, 0.1], [0.046, 0.043, 0.046, 0.04, 0.036, 0.027, 0.016]),
  leg(0.13, [-0.1, 0.84], [0.07, 0.26, 0.11, 0.17, 0.15, 0.1], [0.045, 0.042, 0.045, 0.038, 0.034, 0.026, 0.016]),
  leg(0.05, [-0.74, 0.62], [0.07, 0.3, 0.13, 0.22, 0.2, 0.12], [0.046, 0.043, 0.046, 0.039, 0.034, 0.025, 0.015]),
];
/** The male's legs: longer and a little lighter, the front pair stout. */
const LEGS_M: SpiderSpec['legs'] = LEGS_F.map((l, i) => ({ ...l, len: l.len.map(v => v * 1.1) as SpiderLeg['len'], r: l.r.map(v => v * (i === 0 ? 1.08 : 0.92)) as SpiderLeg['r'], foot: [l.foot[0] * 1.1, l.foot[1] * 1.1] })) as SpiderSpec['legs'];

// ---------- regal jumping spider (Phidippus regius) ----------
// Female ~15 mm: grey-brown, a row of white spots down a pale-edged abdomen. Male ~12 mm: black, a white band across the
// front of the abdomen and white spots behind it, white palps, banded legs, iridescent green-blue chelicerae.
const EYES = {
  ame: { y: 0.205, z: 0.046, r: 0.038 }, ale: { x: 0.425, y: 0.222, z: 0.108, r: 0.022 },
  pme: { x: 0.335, z: 0.125, r: 0.009 }, ple: { x: 0.26, z: 0.128, r: 0.028 },
};
const PALP_F = { pts: [[0.43, 0.05, 0.05], [0.5, 0.0, 0.085], [0.55, -0.04, 0.09], [0.585, -0.07, 0.075], [0.61, -0.09, 0.05]] as [number, number, number][], r: [0.022, 0.02, 0.018, 0.017, 0.015], bulb: 0 };
const PALP_M = { pts: [[0.43, 0.05, 0.05], [0.51, 0.0, 0.09], [0.57, -0.035, 0.105], [0.62, -0.06, 0.09], [0.655, -0.075, 0.07]] as [number, number, number][], r: [0.026, 0.027, 0.025, 0.026, 0.03], bulb: 0.042 };

export const SPIDERS: Record<string, SpiderSpec> = {
  regaljumper: {
    sex: 'm', aspect: 0.52, stand: { ground: 0.2, glass: 0.1 },
    carapace: CARAPACE, abdomen: ABDOMEN_M, eT: 2.5, eB: 3.2, legs: LEGS_M, eyes: EYES, palp: PALP_M,
    chel: { col: ['#0f7a66', '#2a3fae'], len: 0.1, r: 0.036 },
    carapaceCol: '#0e0d0f', abdomenCol: '#0c0b0d', legCol: ['#0d0c0e', '#bdb9b0'], palpCol: '#ece9e2', hairCol: '#f2efe8',
    carapaceMarks: [
      { k: 'band', x: [0.4, 0.47], s: [0.0, 0.2], c: '#cfcbc2', o: 0.55, soft: 0.01 }, // pale hair round the eye field's front
      { k: 'band', x: [0.04, 0.46], s: [0.15, 0.2], c: '#d8d4cb', o: 0.5, soft: 0.01 }, // white hair along the carapace's edge
    ],
    abdomenMarks: [
      { k: 'band', x: [-0.1, 0.0], s: [0, 0.32], c: '#f4f1ea', o: 1, soft: 0.006 }, // the white band over the front of the abdomen
      { k: 'ell', x: -0.2, s: 0, rx: 0.06, rs: 0.07, c: '#f4f1ea', o: 1, soft: 0.006 }, // a white patch in the middle
      { k: 'ell', x: -0.3, s: 0.0, rx: 0.045, rs: 0.04, c: '#f4f1ea', o: 1, soft: 0.006 },
      { k: 'ell', x: -0.37, s: 0.08, rx: 0.03, rs: 0.03, c: '#f4f1ea', o: 1, soft: 0.006 },
      { k: 'band', x: [-0.46, 0.05], s: [0.25, 0.3], c: '#ebe8e0', o: 0.55, soft: 0.01 }, // pale flanks
    ],
    legBands: [2, 4], hair: { body: 14000, leg: 2600 },
  },
  regaljumper_f: {
    sex: 'f', aspect: 0.52, stand: { ground: 0.2, glass: 0.1 },
    carapace: CARAPACE, abdomen: ABDOMEN_F, eT: 2.5, eB: 3.2, legs: LEGS_F, eyes: EYES, palp: PALP_F,
    chel: { col: ['#3f7d6a', '#43599a'], len: 0.1, r: 0.036 },
    carapaceCol: '#4b4238', abdomenCol: '#6b6355', legCol: ['#43392d', '#7a6d5b'], palpCol: '#a99b86', hairCol: '#b3a58e',
    carapaceMarks: [
      { k: 'band', x: [0.36, 0.47], s: [0.0, 0.2], c: '#a79883', o: 0.55, soft: 0.012 }, // paler round the eyes
      { k: 'band', x: [0.04, 0.4], s: [0.12, 0.2], c: '#8a7c68', o: 0.45, soft: 0.02 },
      { k: 'mottle', n: 90, r: [0.01, 0.025], c: '#2d2720', o: 0.35, seed: 5 },
    ],
    abdomenMarks: [
      { k: 'band', x: [-0.5, 0.05], s: [0, 0.1], c: '#8d826f', o: 0.55, soft: 0.04 }, // a paler middle
      { k: 'mottle', n: 200, r: [0.012, 0.035], c: '#2e2a24', o: 0.4, seed: 9 },
      { k: 'ell', x: -0.08, s: 0, rx: 0.045, rs: 0.04, c: '#f2efe7', o: 0.95, soft: 0.006 }, // the row of white spots down the back
      { k: 'ell', x: -0.22, s: 0, rx: 0.05, rs: 0.045, c: '#f2efe7', o: 0.95, soft: 0.006 },
      { k: 'ell', x: -0.36, s: 0, rx: 0.04, rs: 0.036, c: '#f2efe7', o: 0.95, soft: 0.006 },
      { k: 'ell', x: -0.15, s: 0.13, rx: 0.025, rs: 0.025, c: '#e6e0d3', o: 0.8, soft: 0.006 },
      { k: 'ell', x: -0.29, s: 0.14, rx: 0.025, rs: 0.025, c: '#e6e0d3', o: 0.8, soft: 0.006 },
      { k: 'band', x: [-0.48, 0.03], s: [0.27, 0.32], c: '#d9d2c3', o: 0.6, soft: 0.012 }, // pale edge
    ],
    legBands: [2, 4], hair: { body: 14000, leg: 2600 },
  },
};
export const isSpider = (art: string) => art in SPIDERS;
export function spiderMeta(art: string): { aspect: number; rest: number } | undefined {
  const S = SPIDERS[art]; return S && { aspect: S.aspect, rest: spiderGround(S) };
}

/** The side card (no-WebGL fallback and the picking target): abdomen, carapace, legs standing on the ground line, the eyes. */
function drawSpider(S: SpiderSpec, ctx: Ctx, P: Proj, W: number) {
  const g = spiderGround(S), base = g - S.stand.ground; // y of the carapace's underside (card frame, + down)
  const pt = (x: number, y: number) => P(x + 0.5, base - y);
  const blob = (st: Stn[], col: string) => {
    const top: [number, number][] = [], bot: [number, number][] = [];
    for (const [x, , t, b, yc] of st) { top.push(pt(x, yc + t)); bot.push(pt(x, yc - b)); }
    ctx.fillStyle = col; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); bot.reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const legs = (col: string, k: number) => {
    ctx.strokeStyle = col; S.legs.forEach((l, i) => {
      const f = l.foot[0] + (i === 1 ? 0.04 : 0) * k, a = pt(l.hx, 0.02), kx = (l.hx + f) / 2 + (i < 2 ? 0.02 : -0.02), kn = pt(kx, 0.38 - 0.03 * i), b = pt(f, -S.stand.ground);
      ctx.lineWidth = l.r[2] * 2 * W; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...kn); ctx.stroke();
      ctx.lineWidth = l.r[4] * 2 * W; ctx.beginPath(); ctx.moveTo(...kn); ctx.lineTo(...b); ctx.stroke();
    });
  };
  legs(S.legCol[0], 0);
  blob(S.abdomen, S.abdomenCol); blob(S.carapace, S.carapaceCol);
  ctx.fillStyle = S.abdomen === ABDOMEN_M ? '#f4f1ea' : '#f2efe7';
  for (const m of S.abdomenMarks) if (m.k === 'ell') { const [x, y] = pt(m.x, 0.24); ctx.beginPath(); ctx.ellipse(x, y, m.rx * W * 0.8, m.rs * W * 0.5, 0, 0, 7); ctx.fill(); }
  const e = S.eyes.ame, [ex, ey] = pt(0.46, e.y);
  ctx.fillStyle = '#0a0a0b'; ctx.beginPath(); ctx.arc(ex, ey, e.r * W, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(ex - e.r * W * 0.3, ey - e.r * W * 0.3, e.r * W * 0.25, 0, 7); ctx.fill();
}
export const SPIDER_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> =
  Object.fromEntries(Object.entries(SPIDERS).map(([k, S]) => [k, (c: Ctx, P: Proj, W: number) => drawSpider(S, c, P, W)]));
