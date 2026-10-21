// Amphibian painter (frogs, newts, axolotl), side view, in the fish house style (see placeholder.ts): no outlines,
// countershading with a soft inner rim, soft-edged markings, small realistic eyes. Same unit frame as the fish:
// u = 0 (rear / tail tip) .. 1 (nose tip) across the card width W (== total length), v = offset in widths from the card's
// centre line, + down. The animal stands on the ground line g = aspect / 2 - 0.015 (its lowest point, = rest).
// Legs on the far side are drawn first and darker; legs on the near side over the body.
import { type Ctx, type Proj, type Pt, type Stops, blob, body, fin, rng, soft } from './paint';
import type { Shell3D } from './snails';
import { LIZARD_ART, lizardMeta } from './lizards';
import { SPIDER_ART, spiderMeta } from './spiders';
import { SNAKE_ART, snakeMeta } from './snakes';
import { TARANTULA_ART, tarantulaMeta } from './tarantulas';

type J = [number, number, number]; // joint: u, v, radius (widths)

/** Closed outline of a tapered tube through the joints (round ends), for legs, toes, gill stalks. */
function tube(js: J[]): Pt[] {
  const n = js.length, L: Pt[] = [], R: Pt[] = [];
  const tan = (i: number) => {
    const a = js[Math.max(0, i - 1)], b = js[Math.min(n - 1, i + 1)], du = b[0] - a[0], dv = b[1] - a[1], l = Math.hypot(du, dv) || 1;
    return [du / l, dv / l];
  };
  for (let i = 0; i < n; i++) {
    const [u, v, r] = js[i], [tu, tv] = tan(i);
    L.push([u - tv * r, v + tu * r]); R.push([u + tv * r, v - tu * r]);
  }
  const [t0u, t0v] = tan(0), [t1u, t1v] = tan(n - 1), a = js[0], b = js[n - 1];
  return [[a[0] - t0u * a[2], a[1] - t0v * a[2]], ...L, [b[0] + t1u * b[2], b[1] + t1v * b[2]], ...R.reverse()];
}

const darker = (h: string, k: number) => {
  const n = parseInt(h.slice(1), 16), f = (c: number) => Math.round(c * k).toString(16).padStart(2, '0');
  return '#' + f(n >> 16) + f(n >> 8 & 255) + f(n & 255);
};
const shadeOf = (c: [string, string, string], k = 1): Stops =>
  [[0, darker(c[0], k)], [0.45, darker(c[1], k)], [1, darker(c[2], k)]];

/** A limb: tube + toes fanning from the last joint to the tips (each tip optionally with a round toe pad). */
function limb(ctx: Ctx, P: Proj, W: number, js: J[], toes: [number, number][], toeR: number, col: [string, string, string], far: boolean,
  paint: (l: Ctx) => void = () => {}, pad = 0) {
  const k = far ? 0.62 : 1, sh = shadeOf(col, k), end = js[js.length - 1];
  for (const t of toes) {
    body(ctx, P, W, tube([[end[0], end[1], toeR * 1.2], [t[0], t[1], toeR]]), end[1] - 0.02, end[1] + 0.02, sh, 0.01, () => {});
    if (pad) body(ctx, P, W, tube([[t[0] - pad * 0.3, t[1] - pad * 0.2, pad], [t[0] + pad * 0.3, t[1] - pad * 0.2, pad]]), t[1] - pad * 2, t[1], sh, 0.008, () => {});
  }
  const top = Math.min(...js.map(j => j[1] - j[2])), bot = Math.max(...js.map(j => j[1] + j[2]));
  body(ctx, P, W, tube(js), top, bot, sh, 0.02, paint);
}

/** Eye: dark-rimmed iris, pupil round or horizontal (frogs), catchlight. */
function herpEye(ctx: Ctx, P: Proj, W: number, u: number, v: number, r: number, iris: [string, string], pupil: 'round' | 'h' | 'dark') {
  const [x, y] = P(u, v), R = r * W, g = ctx.createRadialGradient(x, y - R * 0.35, R * 0.1, x, y, R);
  g.addColorStop(0, iris[0]); g.addColorStop(1, iris[1]);
  ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = R * 0.14; ctx.strokeStyle = 'rgba(18,18,16,0.55)'; ctx.stroke();
  ctx.fillStyle = '#0a0b0c'; ctx.beginPath();
  if (pupil === 'h') ctx.ellipse(x + R * 0.05, y, R * 0.62, R * 0.3, 0, 0, 7);
  else ctx.arc(x + R * 0.05, y, R * (pupil === 'dark' ? 0.85 : 0.5), 0, 7);
  ctx.fill();
  ctx.beginPath(); ctx.arc(x - R * 0.2, y - R * 0.3, R * 0.16, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fill();
}

/** Faint line (mouth, tympanum rim, skin folds). */
function line(ctx: Ctx, P: Proj, W: number, pts: [number, number][], a: number, w = 0.004) {
  ctx.beginPath(); pts.forEach(([u, v], i) => { const [x, y] = P(u, v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.strokeStyle = `rgba(14,16,12,${a})`; ctx.lineWidth = w * W; ctx.stroke();
}

// ---------- Frogs ----------
/** Sitting frog's torso + head, side view, in the design frame (ground at v = 0.265; see drawFrog's P). */
const FROG_TORSO: Pt[] = [[1.0, 0.035, 'c'], [0.975, -0.04], [0.9, -0.11], [0.8, -0.15], [0.68, -0.145], [0.52, -0.13], [0.36, -0.12], [0.2, -0.07],
  [0.08, 0.04], [0.05, 0.15], [0.1, 0.23], [0.22, 0.25], [0.42, 0.22], [0.6, 0.17], [0.76, 0.12], [0.9, 0.09], [0.97, 0.07]];
/** The frogs' shared half-width by u (3D). */
const FROG_WID: [number, number][] = [[0.06, 0.11], [0.2, 0.165], [0.42, 0.185], [0.62, 0.175], [0.78, 0.16], [0.9, 0.125], [1, 0.07]];
/** White's tree frog: the back dips a little behind a big, broad head (a neck), the head rises to the eyes. */
const TREEFROG_TORSO: Pt[] = [[1.0, 0.035, 'c'], [0.975, -0.05], [0.91, -0.125], [0.83, -0.16], [0.74, -0.15], [0.66, -0.13], [0.54, -0.135], [0.38, -0.125], [0.2, -0.07],
  [0.08, 0.04], [0.05, 0.15], [0.1, 0.23], [0.22, 0.25], [0.42, 0.22], [0.6, 0.17], [0.7, 0.14], [0.8, 0.115], [0.9, 0.09], [0.97, 0.07]];
const TREEFROG_WID: [number, number][] = [[0.06, 0.11], [0.2, 0.165], [0.42, 0.185], [0.6, 0.168], [0.69, 0.142], [0.79, 0.178], [0.87, 0.166], [0.94, 0.125], [1, 0.07]];
/** Fire-bellied toad: a short, flat, broad body (the rump well forward of the heels), a low wide head. */
const TOAD_TORSO: Pt[] = [[1.0, 0.05, 'c'], [0.975, -0.015], [0.91, -0.08], [0.82, -0.115], [0.7, -0.125], [0.55, -0.12], [0.4, -0.105], [0.28, -0.065],
  [0.19, 0.02], [0.16, 0.13], [0.2, 0.215], [0.3, 0.245], [0.45, 0.235], [0.62, 0.2], [0.78, 0.15], [0.9, 0.11], [0.97, 0.085]];
const TOAD_WID: [number, number][] = [[0.17, 0.13], [0.28, 0.2], [0.45, 0.225], [0.62, 0.215], [0.78, 0.19], [0.9, 0.145], [1, 0.08]];
/** African dwarf frog: flat and low, the head running straight into a long pointed snout, no neck, a flat belly. */
// dorso-ventrally compressed (Nathan 2026-10-16, thickened 2026-10-20): the body is flat, its height about 0.6 of its width. The outline was drawn
// round, so its heights are squashed toward the belly line, and the width widened a little
const ADF_FLAT = 0.68, ADF_BELLY = 0.24, adfV = (v: number) => ADF_BELLY - (ADF_BELLY - v) * ADF_FLAT;
const ADF_TORSO: Pt[] = ([[1.0, 0.1, 'c'], [0.97, 0.06], [0.9, 0.0], [0.8, -0.04], [0.68, -0.06], [0.52, -0.07], [0.36, -0.065], [0.22, -0.035],
  [0.11, 0.04], [0.08, 0.13], [0.12, 0.21], [0.24, 0.24], [0.44, 0.24], [0.62, 0.225], [0.78, 0.19], [0.9, 0.155], [0.97, 0.125]] as Pt[])
  .map(p => (p.length > 2 ? [p[0], adfV(p[1]), 'c'] : [p[0], adfV(p[1])]) as Pt);
const ADF_WID: [number, number][] = ([[0.1, 0.1], [0.24, 0.15], [0.44, 0.16], [0.62, 0.145], [0.74, 0.125], [0.84, 0.098], [0.92, 0.07], [0.97, 0.05], [1, 0.028]] as [number, number][])
  .map(([u, w]) => [u, w * 1.12]);
/** The frog's design height v (ground 0.265) in the card frame of aspect `aspect` (flatter frames squash toward the ground). */
const frogV = (aspect: number, v: number) => { const g = aspect / 2 - 0.015, k = (g + 0.25) / (0.265 + 0.25); return g - (0.265 - v) * k; };

// Sitting frog, nominal frame aspect 0.56 (ground g = 0.265); `flat` < 1 squashes heights toward the ground (toads).
interface FrogSpec {
  aspect: number;
  skin: [string, string, string];   // back, flank, belly
  leg: [string, string, string];
  iris: [string, string]; pupil: 'round' | 'h' | 'dark';
  pads?: number;                    // toe-pad radius (tree frogs)
  marks?: (l: Ctx, P: Proj, W: number) => void;
  legMarks?: (l: Ctx, P: Proj, W: number) => void;
  warts?: string;                   // wart colour (toads)
  torso?: Pt[];                     // own side outline (design frame), else FROG_TORSO
  wid?: [number, number][];         // own half-width by u (3D), else the shared frog's
  rump?: number;                    // the hip sits this far forward (u) on a short-bodied frog (toad)
  web?: number;                     // webbing reach on every foot (fully aquatic frogs), else the toad's hind feet only
  eye?: { u: number; v: number; r: number; th: number }; // own eye (design frame; th round the 3D section), else the shared one
}
const FROG_EYE = { u: 0.8, v: -0.14, r: 0.052, th: 0.9 };

function drawFrog(s: FrogSpec, ctx: Ctx, P0: Proj, W: number) {
  const g = s.aspect / 2 - 0.015, k = (g + 0.25) / (0.265 + 0.25);
  const P: Proj = (u, v) => P0(u, g - (0.265 - v) * k); // design at g = 0.265; v measured from the ground and scaled
  const pads = s.pads ?? 0, toe = 0.009;
  // far side: front arm and the toes of the hind foot peeking out
  limb(ctx, P, W, [[0.64, 0.1, 0.03], [0.665, 0.19, 0.022], [0.68, 0.25, 0.017]], [[0.62, 0.262], [0.66, 0.264]], toe, s.leg, true, undefined, pads);
  limb(ctx, P, W, [[0.2, 0.25, 0.018], [0.34, 0.255, 0.014]], [[0.44, 0.262], [0.41, 0.264]], toe, s.leg, true, undefined, pads);
  // torso + head
  body(ctx, P, W, s.torso ?? FROG_TORSO, -0.16, 0.25, shadeOf(s.skin), 0.05, l => {
    s.marks?.(l, P, W);
    if (s.warts) { const r = rng(7); for (let i = 0; i < 46; i++) blob(l, P, W, 0.12 + r() * 0.78, -0.12 + r() * 0.2, 0.011, 0.009, s.warts, 0.55); }
    soft(l, P, 0.3, 0.85, -0.15, -0.08, '#ffffff', 0.14, [0.12, 0.1], [0.02, 0.04]); // sheen along the back
  });
  // near hind leg: foot on the ground, shank folded under the thigh, thigh over the hip
  limb(ctx, P, W, [[0.11, 0.245, 0.026], [0.22, 0.252, 0.022], [0.3, 0.256, 0.016]], [[0.5, 0.262], [0.46, 0.26], [0.42, 0.264], [0.53, 0.264]], toe, s.leg, false, l => s.legMarks?.(l, P, W), pads);
  limb(ctx, P, W, [[0.44, 0.16, 0.036], [0.3, 0.2, 0.034], [0.14, 0.232, 0.03]], [], toe, s.leg, false, l => s.legMarks?.(l, P, W));
  body(ctx, P, W, [[0.06, 0.1], [0.12, 0.0], [0.28, 0.0], [0.43, 0.08], [0.47, 0.14], [0.4, 0.185], [0.22, 0.195], [0.08, 0.2]],
    0.0, 0.2, shadeOf(s.leg), 0.03, l => { s.legMarks?.(l, P, W); soft(l, P, 0.12, 0.42, 0.0, 0.06, '#ffffff', 0.12, [0.08, 0.08], [0.01, 0.03]); });
  // near front arm
  limb(ctx, P, W, [[0.69, 0.1, 0.034], [0.71, 0.18, 0.025], [0.73, 0.247, 0.019]], [[0.81, 0.262], [0.78, 0.264], [0.68, 0.263], [0.65, 0.26]], toe, s.leg, false, l => s.legMarks?.(l, P, W), pads);
  // face: tympanum, mouth, nostril, eye
  line(ctx, P, W, [[0.995, 0.04], [0.92, 0.035], [0.82, 0.025], [0.75, 0.01]], 0.22);
  ctx.save(); const [tx, ty] = P(0.685, -0.055); ctx.beginPath(); ctx.arc(tx, ty, 0.03 * W * k, 0, 7);
  ctx.strokeStyle = 'rgba(14,16,12,0.18)'; ctx.lineWidth = 0.004 * W; ctx.stroke(); ctx.restore();
  blob(ctx, P, W, 0.955, -0.03, 0.006, 0.004, '#141410', 0.6);
  const e = s.eye ?? FROG_EYE;
  blob(ctx, P, W, e.u, e.v + 0.01, e.r * 1.35, e.r * 1.15 * k, darker(s.skin[0], 0.7), 0.5); // socket shadow
  herpEye(ctx, P, W, e.u, e.v, e.r * k, s.iris, s.pupil);
}

const FROGS: Record<string, FrogSpec> = {
  // Dendrobates tinctorius: black with yellow back bands, blue legs with black spots
  dartfrog: {
    aspect: 0.56, skin: ['#151619', '#1c1d20', '#202227'], leg: ['#2c5fae', '#3a74c4', '#2d58a0'],
    iris: ['#2a2a2c', '#09090a'], pupil: 'dark', pads: 0.012,
    marks: (l, P, W) => {
      soft(l, P, 0.18, 0.9, -0.17, -0.07, '#f1c62a', 0.95, [0.06, 0.06], [0.01, 0.02]);
      soft(l, P, 0.12, 0.6, 0.0, 0.07, '#f1c62a', 0.9, [0.06, 0.08], [0.02, 0.02]);
      for (const [u, v, r] of [[0.5, -0.1, 0.03], [0.32, -0.08, 0.025], [0.66, -0.12, 0.022]] as const) blob(l, P, W, u, v, r, r * 0.7, '#151619', 0.95);
      soft(l, P, 0.2, 0.75, 0.13, 0.25, '#2c5fae', 0.85, [0.08, 0.08], [0.03, 0.01]); // blue belly showing
    },
    legMarks: (l, P, W) => { const r = rng(3); for (let i = 0; i < 26; i++) blob(l, P, W, 0.05 + r() * 0.8, 0.0 + r() * 0.27, 0.012, 0.01, '#101114', 0.9); },
  },
  // Ranoidea caerulea: plump jade green, cream belly, gold eye with a horizontal pupil, big toe pads, fold over the eardrum
  treefrog: {
    aspect: 0.56, skin: ['#5f9a4a', '#7cb35d', '#e8e2c4'], leg: ['#679f4f', '#80b462', '#d9d4b4'],
    iris: ['#e7c66a', '#8a6a22'], pupil: 'h', pads: 0.017, torso: TREEFROG_TORSO, wid: TREEFROG_WID,
    marks: (l, P, W) => {
      soft(l, P, 0.12, 0.98, 0.06, 0.26, '#efe9cf', 0.9, [0.06, 0.04], [0.04, 0.0]);
      line(l, P, W, [[0.86, -0.12], [0.76, -0.1], [0.66, -0.07], [0.6, -0.02]], 0.2, 0.012); // supratympanic fold
      const r = rng(5); for (let i = 0; i < 6; i++) blob(l, P, W, 0.25 + r() * 0.5, -0.1 + r() * 0.08, 0.008, 0.008, '#f4f3e6', 0.7);
    },
  },
  // Bombina orientalis: flatter, warty green back with black blotches, red-orange belly with black spots
  firetoad: {
    aspect: 0.5, skin: ['#4b7a32', '#5d8c3a', '#d9461e'], leg: ['#557f35', '#5f8a3a', '#cf4a1e'],
    iris: ['#b38a3a', '#4c3a18'], pupil: 'round', warts: '#3e6627', torso: TOAD_TORSO, wid: TOAD_WID, rump: 0.1,
    marks: (l, P, W) => {
      const r = rng(9); for (let i = 0; i < 14; i++) blob(l, P, W, 0.15 + r() * 0.7, -0.12 + r() * 0.14, 0.03, 0.02, '#111410', 0.85);
      soft(l, P, 0.1, 0.98, 0.1, 0.26, '#e04a1c', 0.95, [0.05, 0.04], [0.04, 0.0]);
      for (let i = 0; i < 10; i++) blob(l, P, W, 0.15 + r() * 0.7, 0.15 + r() * 0.08, 0.018, 0.014, '#141210', 0.85);
    },
    legMarks: (l, P, W) => { const r = rng(4); for (let i = 0; i < 12; i++) blob(l, P, W, 0.05 + r() * 0.8, 0.02 + r() * 0.24, 0.018, 0.014, '#111410', 0.8); },
  },
  // Hymenochirus boettgeri: olive-grey to brown, finely granular, small dark spots; paler grey belly; small lidless
  // eyes on the sides of the head; webbed fingers and toes
  adf: {
    aspect: 0.44, skin: ['#5f5a46', '#6e6852', '#9a9682'], leg: ['#574e3c', '#645a46', '#8e8a76'],
    iris: ['#a39a6a', '#3b3826'], pupil: 'round', warts: '#4f4a39', torso: ADF_TORSO, wid: ADF_WID, web: 1,
    eye: { u: 0.86, v: adfV(-0.015), r: 0.03, th: 1.05 },
    marks: (l, P, W) => {
      const r = rng(17); for (let i = 0; i < 22; i++) blob(l, P, W, 0.14 + r() * 0.74, -0.06 + r() * 0.14, 0.014, 0.011, '#2f2c21', 0.75);
      soft(l, P, 0.1, 0.98, 0.14, 0.25, '#a8a490', 0.8, [0.05, 0.04], [0.04, 0.0]);
    },
    legMarks: (l, P, W) => { const r = rng(18); for (let i = 0; i < 10; i++) blob(l, P, W, 0.05 + r() * 0.8, 0.02 + r() * 0.24, 0.012, 0.01, '#2f2c21', 0.7); },
  },
};

// ---------- Newts / salamanders ----------
interface SalSpec {
  aspect: number;
  skin: [string, string, string];
  leg: [string, string, string];
  iris: [string, string]; pupil: 'round' | 'dark';
  marks?: (l: Ctx, P: Proj, W: number) => void;
  head: number;   // head half-depth (widths)
  trunk: number;  // trunk half-depth
  finTail?: string; // tail fin membrane colour (axolotl)
  gills?: [string, string]; // external gills: stalk, fringe
  swimTail?: boolean; // a newt's deep, flattened swimming tail and a rounded head (no axolotl fin membrane)
}

/** Newt / axolotl body + tail, side view, card frame: tail tip at u = 0, nose at u = 1. */
function salSide(s: SalSpec): Pt[] {
  const g = s.aspect / 2 - 0.015, hd = s.head, tr = s.trunk, cv = g - 0.04 - tr;
  // newt: rounded snout, the tail holding most of the trunk's depth (crest above, keel below) to a short point
  if (s.swimTail) return [[1.0, cv + hd * 0.15], [0.988, cv - hd * 0.5], [0.955, cv - hd * 0.9], [0.9, cv - hd], [0.84, cv - hd * 0.9],
    [0.78, cv - tr * 0.95], [0.68, cv - tr], [0.55, cv - tr * 1.02], [0.45, cv - tr * 1.06], [0.32, cv - tr * 1.06], [0.2, cv - tr * 1.0],
    [0.1, cv - tr * 0.82], [0.035, cv - tr * 0.5], [0.0, cv - tr * 0.15, 'c'], [0.03, cv + tr * 0.25], [0.1, cv + tr * 0.55], [0.2, cv + tr * 0.72], [0.32, cv + tr * 0.82], [0.44, cv + tr * 0.9],
    [0.52, cv + tr], [0.68, cv + tr], [0.8, cv + tr * 0.95], [0.88, cv + hd * 0.85], [0.95, cv + hd * 0.72], [0.99, cv + hd * 0.45]];
  // axolotl: broad flat head, a slight neck behind the gills, a full belly sagging to the vent, the muscular tail tapering
  // to just short of the fin's tip (the fin carries the outline on round it)
  return [[1.0, cv + hd * 0.2, 'c'], [0.985, cv - hd * 0.55], [0.95, cv - hd * 0.85], [0.9, cv - hd * 0.92], [0.84, cv - hd * 0.82],
    [0.78, cv - tr * 0.92], [0.68, cv - tr * 0.98], [0.56, cv - tr * 0.95], [0.46, cv - tr * 0.82], [0.34, cv - tr * 0.62], [0.2, cv - tr * 0.4],
    [0.09, cv - tr * 0.2], [0.03, cv, 'c'], [0.09, cv + tr * 0.22], [0.2, cv + tr * 0.42], [0.34, cv + tr * 0.66], [0.46, cv + tr * 0.95],
    [0.56, cv + tr * 1.04], [0.68, cv + tr * 1.06], [0.8, cv + tr * 0.95], [0.88, cv + hd * 0.8], [0.95, cv + hd * 0.7], [0.99, cv + hd * 0.5]];
}

function drawSal(s: SalSpec, ctx: Ctx, P0: Proj, W: number) {
  const g = s.aspect / 2 - 0.015, P: Proj = (u, v) => P0(u, v), hd = s.head, tr = s.trunk, cv = g - 0.04 - tr; // body centre line
  const toe = 0.0065;
  // far legs, then the tail fin, then the far gills
  const legY = cv + tr * 0.6, foot = g - 0.004;
  limb(ctx, P, W, [[0.76, legY, 0.013], [0.725, (legY + foot) / 2, 0.01], [0.71, foot, 0.008]], [[0.69, g], [0.73, g]], toe, s.leg, true);
  limb(ctx, P, W, [[0.47, legY, 0.016], [0.43, (legY + foot) / 2, 0.012], [0.41, foot, 0.009]], [[0.38, g], [0.43, g]], toe, s.leg, true);
  if (s.finTail) { const f = axoFin(cv, tr); fin(ctx, P, W, [...f.top, [0.0, cv, 'c'], ...f.bot] as Pt[], [0.3, cv], s.finTail, darker(s.finTail, 0.75), { rays: 0, a: 0.7 }); }
  if (s.gills) gills(ctx, P, W, s, cv, true);
  // body: tail tip u = 0, head to u = 1
  body(ctx, P, W, salSide(s), cv - hd, cv + tr, shadeOf(s.skin), 0.035, l => {
    s.marks?.(l, P, W);
    soft(l, P, 0.2, 0.95, cv - hd, cv - tr * 0.5, '#ffffff', 0.12, [0.1, 0.05], [0.01, 0.02]); // sheen
  });
  // near legs
  limb(ctx, P, W, [[0.79, legY, 0.016], [0.775, (legY + foot) / 2, 0.012], [0.8, foot, 0.009]], [[0.84, g], [0.825, g], [0.775, g]], toe, s.leg, false);
  limb(ctx, P, W, [[0.5, legY, 0.019], [0.53, (legY + foot) / 2, 0.014], [0.5, foot, 0.01]], [[0.55, g], [0.47, g], [0.45, g]], toe, s.leg, false);
  if (s.gills) gills(ctx, P, W, s, cv, false);
  line(ctx, P, W, [[0.995, cv + hd * 0.35], [0.95, cv + hd * 0.42], [0.9, cv + hd * 0.35]], 0.22, 0.003);
  herpEye(ctx, P, W, 0.925, cv - hd * 0.35, hd * 0.28, s.iris, s.pupil);
}

/**
 * The axolotl's fin edge (card frame), one membrane: the dorsal fin rises from nothing over the shoulders, stays low
 * along the back, deepens over the tail, runs round the pointed tip past the muscle and forward underneath to the vent.
 */
function axoFin(cv: number, tr: number): { top: [number, number][]; bot: [number, number][] } {
  return {
    top: [[0.8, cv - tr * 0.92], [0.7, cv - tr - 0.005], [0.56, cv - tr * 0.95 - 0.012], [0.44, cv - tr * 0.8 - 0.024], [0.3, cv - tr * 0.55 - 0.033],
      [0.16, cv - tr * 0.3 - 0.035], [0.07, cv - 0.022]],
    bot: [[0.07, cv + 0.02], [0.16, cv + tr * 0.3 + 0.028], [0.3, cv + tr * 0.55 + 0.024], [0.4, cv + tr * 0.8 + 0.01], [0.47, cv + tr * 0.97]],
  };
}

/** Axolotl external gills: three stalks sweeping up and back from behind the head, fringed with filaments. */
function gills(ctx: Ctx, P: Proj, W: number, s: SalSpec, cv: number, far: boolean) {
  const [stalk, fringe] = s.gills!, k = far ? 0.65 : 1, du = far ? -0.015 : 0;
  const base: [number, number] = [0.82 + du, cv - s.head * 0.55];
  const tips: [number, number][] = [[0.74, cv - s.head - 0.065], [0.71, cv - s.head - 0.035], [0.7, cv - s.head * 0.4]];
  for (const [i, t] of tips.entries()) {
    const tip: [number, number] = [t[0] + du, t[1]], n = 7;
    for (let j = 1; j <= n; j++) { // filaments along the stalk
      const f = j / (n + 1), u = base[0] + (tip[0] - base[0]) * f, v = base[1] + (tip[1] - base[1]) * f;
      for (const sg of [-1, 1]) blob(ctx, P, W, u + 0.004 * sg, v - 0.012 + 0.012 * sg * (i === 2 ? 0.5 : 1), 0.006, 0.011, darker(fringe, k), 0.85);
    }
    body(ctx, P, W, tube([[base[0], base[1], 0.008], [tip[0], tip[1], 0.004]]), tip[1], base[1], shadeOf([stalk, stalk, stalk], k), 0.01, () => {});
  }
}

const SALS: Record<string, SalSpec> = {
  // Cynops orientalis: dark brown-black, granular, orange belly edge just visible
  firenewt: {
    aspect: 0.2, skin: ['#2a2420', '#3a312a', '#e2621e'], leg: ['#2e2823', '#3b322b', '#d8601f'], head: 0.035, trunk: 0.034,
    iris: ['#8a6a30', '#2a2010'], pupil: 'round', swimTail: true,
    marks: (l, P, W) => {
      const g = 0.2 / 2 - 0.015, cv = g - 0.04 - 0.034;
      soft(l, P, 0.35, 0.97, cv + 0.012, cv + 0.04, '#e8661c', 0.9, [0.08, 0.04], [0.01, 0.0]);
      const r = rng(12); for (let i = 0; i < 70; i++) blob(l, P, W, 0.05 + r() * 0.9, cv - 0.03 + r() * 0.04, 0.004, 0.003, '#57493c', 0.6);
    },
  },
  // Ambystoma mexicanum, leucistic: pale pink, red gills, small dark eyes, tail fin from mid-back
  axolotl: {
    aspect: 0.26, skin: ['#e9b9b4', '#f2cdc6', '#f6dcd4'], leg: ['#ecbdb6', '#f2ccc4', '#f5d8d0'], head: 0.06, trunk: 0.05,
    iris: ['#2a2224', '#0c0a0b'], pupil: 'dark', finTail: '#f0d2cc', gills: ['#d9707a', '#e2505e'],
    marks: (l, P, W) => { const r = rng(21); for (let i = 0; i < 12; i++) blob(l, P, W, 0.2 + r() * 0.7, -0.04 + r() * 0.06, 0.02, 0.012, '#e3a7a2', 0.35); },
  },
};

// ---------- Hermit crab (marine, lane C 2026-10-13) ----------
// A small crab body, two walking legs and a claw per side out of a borrowed snail shell. One set of joints feeds both the
// card and the 3D body (Limb3D: u, v, z, r); the shell is the snail generator's (Shell3D), opening forward.
interface HermitSpec { shell: [string, string, string]; mark: string; body: [string, string, string]; leg: [string, string, string]; eye: [string, string] }
const HERMIT_A = 0.7, HG = HERMIT_A / 2 - 0.015;
const HERMITS: Record<string, HermitSpec> = {
  // blue-leg (Clibanarius tricolor): blue legs, orange-red antennae, olive-brown body, a dull brown shell
  hermit: { shell: ['#4a4234', '#7a6c54', '#a49478'], mark: '#3a2e22', body: ['#4a4030', '#6a5c46', '#8a7a62'], leg: ['#1c2c5c', '#2c4c9c', '#4a66b0'], eye: ['#2a2a2a', '#0a0a0a'] },
};
// the cephalothorax out of the aperture, the soft abdomen running back into the shell (HERP3D's `shell` lines the aperture up on it)
const HERMIT_SIDE: Pt[] = [[0.88, 0.17, 'c'], [0.83, 0.1], [0.7, 0.085], [0.57, 0.095], [0.45, 0.115], [0.38, 0.165], [0.44, 0.225], [0.57, 0.245], [0.66, 0.245], [0.8, 0.225]];
const HERMIT_JOINT = '#d8893a'; // Clibanarius tricolor: orange-gold rings at the leg joints
const HERMIT_LIMBS: Limb3D[] = [
  // walking legs, jointed: coxa out of the body, the long merus up to the knee, carpus and propodus down, the dactyl to the sand
  { js: [[0.64, 0.2, 0.05, 0.021], [0.68, 0.11, 0.14, 0.019], [0.71, 0.15, 0.2, 0.016], [0.74, 0.24, 0.235, 0.013]], toes: [[0.03, 0.025]], toe: 0.01, seg: HERMIT_JOINT },
  { js: [[0.73, 0.2, 0.05, 0.021], [0.8, 0.11, 0.13, 0.019], [0.85, 0.15, 0.18, 0.016], [0.89, 0.24, 0.2, 0.013]], toes: [[0.04, 0.015]], toe: 0.01, seg: HERMIT_JOINT },
  // cheliped: arm forward and down to a heavy palm; the two fingers close in front of it
  { js: [[0.79, 0.2, 0.04, 0.024], [0.85, 0.215, 0.085, 0.022], [0.9, 0.25, 0.075, 0.02]], toes: [], toe: 0, seg: HERMIT_JOINT, claw: { palm: 0.075, r: 0.036, finger: 0.055 } },
  // eye stalk (no toes; the eye sits on its tip) and antenna (own colour)
  { js: [[0.85, 0.12, 0.02, 0.009], [0.89, 0.06, 0.035, 0.007]], toes: [], toe: 0 },
  { js: [[0.87, 0.15, 0.015, 0.0045], [0.95, 0.02, 0.05, 0.0035], [0.995, -0.14, 0.09, 0.0025]], toes: [], toe: 0, c: ['#d0582a', '#a8401c'] },
];
/** The borrowed shell: a globose (turbo-like) shell, the spire on top, its aperture forward and just behind the legs, the crab's body in it. */
const HERMIT_SHELL: Shell3D = { turns: 4, grow: 2.6, drop: 1.2, ap: [0.6, 0.7], axis: [-1, 0.5, 0], size: 0.56, tall: 0.5, at: 0.43, foot: 0, tent: 0, mark: 'spiral', open: [1, -0.4, 0], tilt: 40 };

function drawHermit(s: HermitSpec, ctx: Ctx, P: Proj, W: number) {
  const card = (l: Limb3D, far: boolean) => {
    const js = l.js.map(j => [j[0] - (far ? 0.02 : 0), j[1] - (far ? 0.015 : 0), j[3]] as J), e = js[js.length - 1], cl = l.claw;
    // a claw: the palm as a last fat joint, the two fingers as toes closing in front of it
    if (cl) js.push([e[0] + cl.palm * 0.5, e[1] + 0.01, cl.r]);
    const toes = cl ? [[e[0] + cl.palm + cl.finger, e[1] + 0.005], [e[0] + cl.palm + cl.finger * 0.9, e[1] + 0.02]] as [number, number][]
      : l.toes.map(([du]) => [e[0] + du, HG - l.toe * 0.5] as [number, number]);
    limb(ctx, P, W, js, toes, cl ? cl.r * 0.35 : l.toe, l.c ? [l.c[1], l.c[0], l.c[0]] : s.leg, far);
  };
  for (const l of HERMIT_LIMBS.slice(0, 3)) card(l, true);
  // shell: the body whorl, the spire behind and above it, the dark aperture toward the crab
  const sh: Stops = [[0, s.shell[2]], [0.5, s.shell[1]], [1, s.shell[0]]], cu = 0.3, cv = HG - 0.2;
  const ell = (u: number, v: number, ru: number, rv: number, n: number) => Array.from({ length: n }, (_, i) => [u + ru * Math.cos(i / n * Math.PI * 2), v + rv * Math.sin(i / n * Math.PI * 2)] as Pt);
  body(ctx, P, W, ell(0.14, cv - 0.2, 0.13, 0.1, 20), cv - 0.3, cv - 0.1, sh, 0.05, () => {});
  body(ctx, P, W, ell(cu, cv, 0.24, 0.2, 28), cv - 0.2, cv + 0.2, sh, 0.06, l => {
    for (const dv of [-0.12, -0.04, 0.05]) soft(l, P, 0.08, 0.52, cv + dv, cv + dv + 0.02, s.mark, 0.35, [0.04, 0.04], [0.008, 0.008]);
    soft(l, P, 0.16, 0.4, cv - 0.17, cv - 0.07, '#ffffff', 0.18, [0.08, 0.08], [0.03, 0.04]);
  });
  blob(ctx, P, W, 0.52, cv + 0.06, 0.04, 0.12, '#14100c', 0.85);
  body(ctx, P, W, HERMIT_SIDE, 0.085, 0.245, [[0, s.body[0]], [0.5, s.body[1]], [1, s.body[2]]], 0.03, () => {});
  for (const l of HERMIT_LIMBS) card(l, false);
  const st = HERMIT_LIMBS[3].js[1]; herpEye(ctx, P, W, st[0], st[1] - 0.012, 0.018, s.eye, 'dark');
}

export const HERP_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> = {
  ...Object.fromEntries(Object.entries(FROGS).map(([k, s]) => [k, (c: Ctx, P: Proj, W: number) => drawFrog(s, c, P, W)])),
  ...Object.fromEntries(Object.entries(SALS).map(([k, s]) => [k, (c: Ctx, P: Proj, W: number) => drawSal(s, c, P, W)])),
  ...Object.fromEntries(Object.entries(HERMITS).map(([k, s]) => [k, (c: Ctx, P: Proj, W: number) => drawHermit(s, c, P, W)])),
  ...LIZARD_ART,
  ...SPIDER_ART,
  ...SNAKE_ART,
  ...TARANTULA_ART,
};

/** Aspect + resting offset (the ground line) for amphibian art keys. */
export function herpMeta(art: string): { aspect: number; rest: number } | undefined {
  if (HERMITS[art]) return { aspect: HERMIT_A, rest: HG };
  const s = FROGS[art] ?? SALS[art]; if (!s) return lizardMeta(art) ?? spiderMeta(art) ?? tarantulaMeta(art) ?? snakeMeta(art);
  return { aspect: s.aspect, rest: s.aspect / 2 - 0.015 };
}

// ---------- 3D (render/herp3d.ts) ----------
// One limbed-body generator for every amphibian; per species only data. Positions are in the card frame (u 0 tail ..
// 1 nose, v down from the card's centre line, in widths) plus z = out to the animal's side (widths; the far side is
// mirrored). Body paint is laid out round the body: `a` = 0 on the back's midline .. 0.5 mid-flank .. 1 belly midline.

/** A joint of a limb: u, v, z, radius. */
export type Joint = [number, number, number, number];
export interface Limb3D {
  js: Joint[];                 // root (inside the body) .. wrist / end of the foot
  toes: [number, number][];    // toe tips as [du, dz] from the last joint; the tips rest on the ground
  toe: number;                 // toe radius at the root
  pad?: number;                // round toe pads (tree frogs)
  thigh?: number;              // frog thigh: peak radius of the smooth, flattened teardrop over the first segment
  blunt?: boolean;             // toes as jointed digits (a knuckle, round tips) instead of tapering spikes
  web?: number;                // webbing between neighbouring toes, out to this fraction of their length (toad hind feet)
  toeV?: number;               // the line v (card frame) the toe tips reach, else the ground line (a perch: below it, round the branch)
  seg?: string;                // an arthropod leg: segments swelling between narrow joints, the joints in this colour (hermit crab)
  claw?: { palm: number; r: number; finger: number }; // a chela on the end: palm length, palm half-height, finger length (widths)
  c?: [string, string];        // own colour (top, underside), else the species' legCol (hermit crab antennae)
}
export type Mark3D =
  | { k: 'band'; u: [number, number]; a: [number, number]; c: string; o: number; blur?: number }
  | { k: 'spots'; n: number; u: [number, number]; a: [number, number]; r: [number, number]; c: string; o: number; seed: number }
  | { k: 'line'; pts: [number, number][]; c: string; o: number; w: number };
export interface Herp3D {
  side: Pt[];                     // side outline (card frame), the loft's silhouette
  wid: [number, number][];        // half-width by u (widths), smoothed; both ends are rounded
  belly: number;                  // section exponent below the mid-line (higher = flatter belly); 2.4 above
  tone: [number, string][];       // colour round the section by a
  marks: Mark3D[];
  limbs: Limb3D[];
  legCol: [string, string];       // limbs: top, underside
  legSpots?: { c: string; r: number; n: number }; // n per unit of limb length
  eye: { u: number; th: number; r: number; iris: [string, string]; pupil: 'round' | 'h' | 'dark'; bulge: number; at?: [number, number, number] }; // at: on a stalk tip (u, v, z), not the body surface
  fin?: { top: [number, number][]; bot: [number, number][]; c: string; o: number }; // membranes along the tail (edges, card frame)
  gills?: { at: [number, number, number]; tips: [number, number, number][]; stalk: string; fringe: string };
  ground: number;                 // the ground line v (card frame)
  top?: number;                   // floating pose: the line v (card frame) that sits at the water surface
  shell?: { s: Shell3D; shell: [string, string, string]; mark: string }; // a carried snail shell (hermit crab), from the snail generator
  warts?: { n: number; u: [number, number]; a: [number, number]; r: [number, number]; h: number; seed: number }; // raised skin bumps (a: round the section, h: height / radius)
}

/** Frogs share one sitting pose (design frame, see FROG_TORSO); `fat` widens the body. */
function frog3D(s: FrogSpec, fat: number, tone: [number, string][], marks: Mark3D[], legSpots?: Herp3D['legSpots']): Herp3D {
  const V = (v: number) => frogV(s.aspect, v), J = (u: number, v: number, z: number, r: number): Joint => [u, V(v), z, r];
  const pad = s.pads, toe = 0.009, r = s.rump ?? 0, web = s.web ?? (s.warts ? 0.9 : undefined), e = s.eye ?? FROG_EYE;
  // the toad's webbed hind foot fans its toes wider
  const hindToes: [number, number][] = web ? [[0.13, -0.08], [0.18, -0.025], [0.18, 0.04], [0.13, 0.1], [0.06, 0.13]] : [[0.15, -0.06], [0.19, -0.015], [0.18, 0.035], [0.13, 0.08], [0.075, 0.105]];
  return {
    side: (s.torso ?? FROG_TORSO).map(p => (p.length > 2 ? [p[0], V(p[1]), 'c'] : [p[0], V(p[1])]) as Pt),
    wid: (s.wid ?? FROG_WID).map(([u, w]) => [u, w * fat]),
    belly: 3.2, tone, marks, legSpots,
    limbs: [
      // hind leg folded beside the body: thigh forward along the flank, shank back to the heel, the long foot forward;
      // jointed toes, the fourth the longest (webbed on the toad)
      { js: [J(0.13 + r, 0.12, 0.08 * fat, 0.066), J(0.44 + r * 0.3, 0.15, 0.185 * fat, 0.046), J(0.15 + r * 0.6, 0.228, 0.215 * fat, 0.022), J(0.3 + r * 0.5, 0.252, 0.235 * fat, 0.015)],
        toes: hindToes, toe, pad, thigh: 0.1, blunt: true, web },
      // front arm straight down under the shoulder, four fingers turned in and out
      { js: [J(0.7, 0.08, 0.1 * fat, 0.032), J(0.68, 0.17, 0.165 * fat, 0.024), J(0.725, 0.245, 0.17 * fat, 0.017)],
        toes: [[0.075, -0.04], [0.085, 0.01], [0.055, 0.055], [0.0, 0.07]], toe, pad, blunt: true, web: s.web },
    ],
    legCol: [s.leg[1], s.leg[2]],
    eye: { u: e.u, th: e.th, r: e.r * (frogV(s.aspect, 1) - frogV(s.aspect, 0)), iris: s.iris, pupil: s.pupil, bulge: 0.62 },
    ground: frogV(s.aspect, 0.265),
  };
}
/**
 * A tree frog resting on glass (Nathan's photos 2026-10-14): belly pressed flat on the pane (the ground line), arms
 * folded under the chin, hind legs folded tight along the flanks, every toe pad tucked in under the body.
 */
function frogOnGlass3D(s: FrogSpec, fat: number, tone: [number, string][], marks: Mark3D[]): Herp3D {
  const V = (v: number) => frogV(s.aspect, v), J = (u: number, v: number, z: number, r: number): Joint => [u, V(v), z, r];
  const pad = s.pads, toe = 0.009;
  // the sitting outline with its underside levelled onto the glass, a little lower over the back
  const side: Pt[] = [[1.0, 0.07, 'c'], [0.975, -0.01], [0.9, -0.08], [0.8, -0.115], [0.68, -0.115], [0.52, -0.105], [0.36, -0.095], [0.2, -0.05],
    [0.08, 0.06], [0.05, 0.16], [0.1, 0.235], [0.22, 0.255], [0.42, 0.258], [0.6, 0.255], [0.76, 0.245], [0.88, 0.22], [0.96, 0.15]];
  return {
    side: side.map(p => (p.length > 2 ? [p[0], V(p[1]), 'c'] : [p[0], V(p[1])]) as Pt),
    wid: ([[0.06, 0.11], [0.2, 0.17], [0.42, 0.19], [0.62, 0.18], [0.78, 0.16], [0.9, 0.125], [1, 0.07]] as [number, number][]).map(([u, w]) => [u, w * fat]),
    belly: 6, tone, marks,
    limbs: [
      // hind leg: thigh forward along the flank, shank back beside it, the long foot forward again, toes turned in under the belly
      { js: [J(0.14, 0.16, 0.11 * fat, 0.07), J(0.47, 0.205, 0.215 * fat, 0.05), J(0.13, 0.235, 0.235 * fat, 0.028), J(0.36, 0.252, 0.2 * fat, 0.016)],
        toes: [[0.15, -0.07], [0.14, -0.04], [0.12, -0.01], [0.09, 0.01], [0.05, 0.015]], toe, pad, thigh: 0.1 },
      // arm folded under the chin: elbow back along the side, hand forward and in
      { js: [J(0.72, 0.13, 0.11 * fat, 0.034), J(0.6, 0.22, 0.17 * fat, 0.027), J(0.73, 0.252, 0.11 * fat, 0.017)],
        toes: [[0.07, -0.05], [0.075, -0.025], [0.065, 0], [0.045, 0.02]], toe, pad },
    ],
    legCol: [s.leg[1], s.leg[2]],
    eye: { u: 0.8, th: 0.9, r: 0.052 * (frogV(s.aspect, 1) - frogV(s.aspect, 0)), iris: s.iris, pupil: s.pupil, bulge: 0.62 },
    ground: frogV(s.aspect, 0.265),
  };
}
/**
 * The African dwarf frog resting on the bottom: hind legs splayed out sideways (thigh out from the hip, knee bent
 * forward, shank back), the long webbed feet trailing back and out; arms out to the sides, hands spread forward.
 */
function adfLimbs(): Limb3D[] {
  const s = FROGS.adf, V = (v: number) => frogV(s.aspect, v), J = (u: number, v: number, z: number, r: number): Joint => [u, V(v), z, r];
  const toe = 0.011;
  return [
    { js: [J(0.16, 0.13, 0.08, 0.075), J(0.3, 0.215, 0.29, 0.052), J(0.1, 0.248, 0.37, 0.03), J(0.03, 0.256, 0.41, 0.022)],
      toes: [[-0.14, -0.05], [-0.18, 0.0], [-0.19, 0.05], [-0.17, 0.1], [-0.12, 0.14]], toe, thigh: 0.095, blunt: true, web: 1 },
    { js: [J(0.7, 0.1, 0.09, 0.036), J(0.72, 0.19, 0.2, 0.028), J(0.8, 0.248, 0.26, 0.02)],
      toes: [[0.1, -0.05], [0.115, 0.0], [0.1, 0.05], [0.06, 0.085]], toe: 0.009, blunt: true, web: 1 },
  ];
}
const FROG_FACE: Mark3D[] = [
  { k: 'line', pts: [[0.74, 0.6], [0.84, 0.63], [0.94, 0.64], [0.995, 0.58]], c: '#0e100c', o: 0.25, w: 0.004 }, // mouth
  { k: 'spots', n: 2, u: [0.968, 0.972], a: [0.17, 0.23], r: [0.005, 0.005], c: '#141410', o: 0.6, seed: 1 },      // nostrils
];

/** Newts / axolotl: sprawling legs from the flanks, toes splayed; `legScale` sizes legs and toes. */
function sal3D(s: SalSpec, wid: [number, number][], tone: [number, string][], marks: Mark3D[], legScale: number,
  extra: Partial<Herp3D> = {}): Herp3D {
  const g = s.aspect / 2 - 0.015, tr = s.trunk, cv = g - 0.04 - tr;
  const t = (u: number) => wid.reduce((m, q) => (Math.abs(q[0] - u) < Math.abs(m[0] - u) ? q : m))[1];
  const k = legScale, toe = 0.0055 * k, fy = g - toe;
  const leg = (u: number, dir: number): Limb3D => ({
    js: [[u, cv + tr * 0.25, t(u) * 0.6, 0.017 * k], [u + 0.01 * dir, cv + tr * 0.55, t(u) + 0.03 * k, 0.013 * k], [u + 0.02 * dir, fy - 0.004, t(u) + 0.045 * k, 0.009 * k]],
    toes: (dir > 0 ? [[0.03, -0.012], [0.032, 0.008], [0.022, 0.025], [0.004, 0.032]] : [[0.026, 0.004], [0.02, 0.02], [0.006, 0.03], [-0.012, 0.032], [-0.03, 0.022]])
      .map(([du, dz]) => [du * k, dz * k] as [number, number]),
    toe, blunt: s.swimTail,
  });
  return {
    side: salSide(s), wid, belly: 2.6, tone, marks,
    limbs: [leg(0.79, 1), leg(0.5, -1)],
    legCol: [s.leg[1], s.leg[2]],
    eye: { u: 0.925, th: 0.95, r: s.head * 0.26, iris: s.iris, pupil: s.pupil as 'round' | 'dark', bulge: 0.45 },
    ground: g,
    ...extra,
  };
}

const axo = SALS.axolotl, axoCv = axo.aspect / 2 - 0.015 - 0.04 - axo.trunk;

// White's tree frog: jade green above, cream below with a soft edge, a few white flecks, the fold over the eardrum
const TREEFROG_TONE: [number, string][] = [[0, '#5f9a4a'], [0.42, '#7cb35d'], [0.56, '#a9c98a'], [0.64, '#e8e2c4'], [1, '#efe9cf']];
const TREEFROG_MARKS: Mark3D[] = [
  { k: 'spots', n: 7, u: [0.25, 0.75], a: [0.1, 0.4], r: [0.007, 0.009], c: '#f4f3e6', o: 0.7, seed: 5 },
  { k: 'line', pts: [[0.86, 0.3], [0.76, 0.36], [0.66, 0.42], [0.6, 0.5]], c: '#3f6a2f', o: 0.3, w: 0.012 },
  ...FROG_FACE,
];

/** The pose an animal takes clinging to glass, where it differs from its resting one. */
export const HERP3D_GLASS: Record<string, Herp3D> = {};
/** The pose an animal takes perched on a branch or a shelf (scene/anchors.ts PERCHES), where it differs. */
export const HERP3D_PERCH: Record<string, Herp3D> = {};
/** The pose an animal takes floating at the water surface (species `cling: "top"`). */
export const HERP3D_FLOAT: Record<string, Herp3D> = {};

export const HERP3D: Record<string, Herp3D> = {
  // hermit crab: the small body out of the shell, legs and claw from HERMIT_LIMBS, the eyes on the stalk tips
  hermit: {
    side: HERMIT_SIDE, wid: [[0.4, 0.06], [0.55, 0.068], [0.68, 0.075], [0.8, 0.065], [0.88, 0.04]], belly: 2.6,
    tone: [[0, HERMITS.hermit.body[0]], [0.5, HERMITS.hermit.body[1]], [1, HERMITS.hermit.body[2]]], marks: [],
    limbs: HERMIT_LIMBS, legCol: [HERMITS.hermit.leg[1], HERMITS.hermit.leg[0]],
    eye: { u: 0.89, th: 0.3, r: 0.018, iris: HERMITS.hermit.eye, pupil: 'dark', bulge: 1, at: [0.89, 0.045, 0.035] },
    ground: HG, shell: { s: HERMIT_SHELL, shell: HERMITS.hermit.shell, mark: HERMITS.hermit.mark },
  },
  // yellow bands down each side of the back, black between with black spots; a lower side band; blue belly
  dartfrog: frog3D(FROGS.dartfrog, 1, [[0, '#17181b'], [0.6, '#1c1d20'], [0.82, '#202227'], [1, '#26467e']], [
    { k: 'band', u: [0.14, 0.95], a: [0.0, 0.34], c: '#f1c62a', o: 0.95, blur: 0.012 },
    { k: 'spots', n: 9, u: [0.25, 0.75], a: [0.0, 0.12], r: [0.022, 0.034], c: '#151619', o: 0.95, seed: 4 },
    { k: 'band', u: [0.12, 0.6], a: [0.5, 0.6], c: '#f1c62a', o: 0.9, blur: 0.014 },
    { k: 'band', u: [0.15, 0.8], a: [0.85, 1.0], c: '#2c5fae', o: 0.8, blur: 0.03 },
    ...FROG_FACE,
  ], { c: '#101114', r: 0.012, n: 34 }),
  treefrog: frog3D(FROGS.treefrog, 1.1, TREEFROG_TONE, TREEFROG_MARKS),
  // warty green back with black blotches; red-orange belly with black spots
  firetoad: { ...frog3D(FROGS.firetoad, 1.1, [[0, '#4b7a32'], [0.5, '#5d8c3a'], [0.66, '#5f8a38'], [0.73, '#d9461e'], [1, '#e04a1c']], [
    { k: 'spots', n: 26, u: [0.12, 0.88], a: [0.0, 0.5], r: [0.018, 0.034], c: '#111410', o: 0.85, seed: 9 },
    { k: 'spots', n: 110, u: [0.1, 0.92], a: [0.0, 0.55], r: [0.008, 0.012], c: '#3e6627', o: 0.6, seed: 7 },
    { k: 'spots', n: 18, u: [0.22, 0.85], a: [0.76, 1.0], r: [0.014, 0.022], c: '#141210', o: 0.85, seed: 10 },
    ...FROG_FACE,
  ], { c: '#111410', r: 0.016, n: 14 }),
    // low rounded warts over the back and upper flanks, none on the smooth belly
    warts: { n: 80, u: [0.24, 0.9], a: [0.04, 0.55], r: [0.013, 0.021], h: 0.5, seed: 31 } },
  // olive-grey, paler below; small dark spots; fine granular skin all over the back and flanks
  adf: { ...frog3D(FROGS.adf, 1, [[0, '#4f4636'], [0.5, '#5e5442'], [0.7, '#756b58'], [1, '#a29e8a']], [
    { k: 'spots', n: 70, u: [0.12, 0.95], a: [0.0, 0.65], r: [0.005, 0.01], c: '#2a251b', o: 0.8, seed: 41 },
    { k: 'spots', n: 260, u: [0.1, 0.97], a: [0.0, 0.65], r: [0.004, 0.007], c: '#3a3226', o: 0.6, seed: 42 },
    { k: 'line', pts: [[0.8, 0.62], [0.9, 0.64], [0.995, 0.6]], c: '#0e100c', o: 0.22, w: 0.003 }, // mouth
  ], { c: '#2f2c21', r: 0.01, n: 14 }),
    limbs: adfLimbs(),
    warts: { n: 120, u: [0.15, 0.95], a: [0.02, 0.6], r: [0.007, 0.011], h: 0.45, seed: 43 } },
  // dark brown-black and granular above, the orange belly showing low on the flank
  // a broad trunk, a rounded head a little wider than the neck, the tail flattened side to side
  firenewt: sal3D(SALS.firenewt, [[0, 0.002], [0.08, 0.004], [0.2, 0.007], [0.34, 0.01], [0.44, 0.014], [0.5, 0.026], [0.56, 0.038], [0.66, 0.045],
    [0.76, 0.043], [0.82, 0.035], [0.88, 0.04], [0.94, 0.037], [1, 0.022]],
    [[0, '#241f1b'], [0.5, '#3a312a'], [0.66, '#50382a'], [0.74, '#e2621e'], [1, '#e8661c']], [
      { k: 'spots', n: 160, u: [0.05, 0.97], a: [0.0, 0.6], r: [0.003, 0.004], c: '#57493c', o: 0.6, seed: 12 },
      { k: 'spots', n: 30, u: [0.35, 0.9], a: [0.8, 1.0], r: [0.004, 0.007], c: '#2a2420', o: 0.7, seed: 13 },
      { k: 'line', pts: [[0.9, 0.62], [0.96, 0.64], [0.995, 0.58]], c: '#0e100c', o: 0.25, w: 0.003 },
    ], 1),
  // leucistic: pale pink, faint darker mottling; broad flat head wider than the neck, a full rounded trunk with costal
  // grooves down the flanks, the tail flattened side to side; one fin from the shoulders round the tail to the vent;
  // three feathery gills a side
  axolotl: sal3D(axo, [[0, 0.003], [0.06, 0.006], [0.2, 0.011], [0.34, 0.017], [0.44, 0.03], [0.5, 0.05], [0.58, 0.063], [0.68, 0.066],
    [0.76, 0.062], [0.81, 0.058], [0.87, 0.073], [0.93, 0.075], [0.97, 0.063], [1, 0.042]],
    [[0, '#e9b9b4'], [0.5, '#f2cdc6'], [1, '#f6dcd4']], [
      { k: 'spots', n: 16, u: [0.2, 0.9], a: [0.0, 0.6], r: [0.016, 0.024], c: '#e3a7a2', o: 0.35, seed: 21 },
      ...Array.from({ length: 12 }, (_, i): Mark3D => ({ k: 'line', pts: [[0.535 + i * 0.019, 0.24], [0.53 + i * 0.019, 0.45], [0.535 + i * 0.019, 0.66]], c: '#d39690', o: 0.3, w: 0.0028 })),
      { k: 'line', pts: [[0.9, 0.62], [0.96, 0.66], [0.995, 0.58]], c: '#7a4a48', o: 0.3, w: 0.003 },
    ], 1.15, {
      fin: (() => { const f = axoFin(axoCv, axo.trunk); return { top: [...f.top, [0, axoCv - 0.002]], bot: [[0, axoCv + 0.002], ...f.bot], c: '#f0d2cc', o: 0.68 }; })(),
      gills: {
        at: [0.83, axoCv - axo.head * 0.45, 0.05],
        // top: up and back; middle: back and out; bottom: back, out and a little down. Spread out from the head as a crown.
        tips: [[0.755, axoCv - axo.head - 0.045, 0.11], [0.725, axoCv - axo.head - 0.012, 0.118], [0.72, axoCv - axo.head * 0.05, 0.122]],
        stalk: '#d9707a', fringe: '#e2505e',
      },
    }),
};
// on the glass the flat belly turns the lower flank toward you: the cream starts lower round the section
HERP3D_GLASS.treefrog = frogOnGlass3D(FROGS.treefrog, 1.12, [[0, '#5f9a4a'], [0.45, '#7cb35d'], [0.66, '#a9c98a'], [0.74, '#e8e2c4'], [1, '#efe9cf']], TREEFROG_MARKS);
// perched (lane T3, 2026-10-16): the sitting frog hunched over a branch, legs folded in tight under the body, feet
// gripping: toe tips curled down round the sides of the branch below the belly line, turned in under it
HERP3D_PERCH.treefrog = (() => {
  const s = FROGS.treefrog, fat = 1.1, V = (v: number) => frogV(s.aspect, v), J = (u: number, v: number, z: number, r: number): Joint => [u, V(v), z, r];
  const pad = s.pads, toe = 0.009, base = frog3D(s, fat, TREEFROG_TONE, TREEFROG_MARKS);
  return {
    ...base,
    limbs: [
      { js: [J(0.13, 0.12, 0.08 * fat, 0.066), J(0.44, 0.16, 0.165 * fat, 0.046), J(0.17, 0.235, 0.175 * fat, 0.022), J(0.31, 0.27, 0.13 * fat, 0.015)],
        toes: [[0.1, -0.075], [0.135, -0.06], [0.125, -0.04], [0.085, -0.02], [0.045, -0.005]], toe, pad, thigh: 0.1, blunt: true, toeV: V(0.335) },
      { js: [J(0.7, 0.08, 0.1 * fat, 0.032), J(0.69, 0.18, 0.14 * fat, 0.024), J(0.735, 0.262, 0.11 * fat, 0.017)],
        toes: [[0.06, -0.055], [0.075, -0.035], [0.06, -0.012], [0.02, 0.012]], toe, pad, blunt: true, toeV: V(0.315) },
    ],
  };
})();
// the African dwarf frog's "zen" float: hanging at the water line, back and snout just at the surface, all four legs
// spread out limp and drooping a little (the toe tips set the ground line below the belly)
HERP3D_FLOAT.adf = (() => {
  const s = FROGS.adf, V = (v: number) => frogV(s.aspect, v), J = (u: number, v: number, z: number, r: number): Joint => [u, V(v), z, r];
  const toe = 0.011;
  return {
    ...HERP3D.adf,
    limbs: [
      { js: [J(0.16, 0.13, 0.08, 0.075), J(0.28, 0.2, 0.3, 0.052), J(0.08, 0.26, 0.4, 0.03), J(0.0, 0.3, 0.45, 0.022)],
        toes: [[-0.14, -0.04], [-0.18, 0.01], [-0.19, 0.06], [-0.16, 0.11], [-0.11, 0.14]], toe, thigh: 0.095, blunt: true, web: 1 },
      { js: [J(0.7, 0.1, 0.09, 0.036), J(0.74, 0.2, 0.22, 0.028), J(0.8, 0.29, 0.3, 0.02)],
        toes: [[0.1, -0.04], [0.115, 0.01], [0.1, 0.055], [0.06, 0.09]], toe, blunt: true, web: 1 },
    ],
    ground: V(0.34), top: V(adfV(-0.07)),
  };
})();
