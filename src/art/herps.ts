// Amphibian painter (frogs, newts, axolotl), side view, in the fish house style (see placeholder.ts): no outlines,
// countershading with a soft inner rim, soft-edged markings, small realistic eyes. Same unit frame as the fish:
// u = 0 (rear / tail tip) .. 1 (nose tip) across the card width W (== total length), v = offset in widths from the card's
// centre line, + down. The animal stands on the ground line g = aspect / 2 - 0.015 (its lowest point, = rest).
// Legs on the far side are drawn first and darker; legs on the near side over the body.
import { type Ctx, type Proj, type Pt, type Stops, blob, body, fin, rng, soft } from './paint';

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
}

function drawFrog(s: FrogSpec, ctx: Ctx, P0: Proj, W: number) {
  const g = s.aspect / 2 - 0.015, k = (g + 0.25) / (0.265 + 0.25);
  const P: Proj = (u, v) => P0(u, g - (0.265 - v) * k); // design at g = 0.265; v measured from the ground and scaled
  const pads = s.pads ?? 0, toe = 0.009;
  // far side: front arm and the toes of the hind foot peeking out
  limb(ctx, P, W, [[0.64, 0.1, 0.03], [0.665, 0.19, 0.022], [0.68, 0.25, 0.017]], [[0.62, 0.262], [0.66, 0.264]], toe, s.leg, true, undefined, pads);
  limb(ctx, P, W, [[0.2, 0.25, 0.018], [0.34, 0.255, 0.014]], [[0.44, 0.262], [0.41, 0.264]], toe, s.leg, true, undefined, pads);
  // torso + head
  const pts: Pt[] = [[1.0, 0.035, 'c'], [0.975, -0.04], [0.9, -0.11], [0.8, -0.15], [0.68, -0.145], [0.52, -0.13], [0.36, -0.12], [0.2, -0.07],
    [0.08, 0.04], [0.05, 0.15], [0.1, 0.23], [0.22, 0.25], [0.42, 0.22], [0.6, 0.17], [0.76, 0.12], [0.9, 0.09], [0.97, 0.07]];
  body(ctx, P, W, pts, -0.16, 0.25, shadeOf(s.skin), 0.05, l => {
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
  blob(ctx, P, W, 0.8, -0.13, 0.07, 0.06 * k, darker(s.skin[0], 0.7), 0.5); // socket shadow
  herpEye(ctx, P, W, 0.8, -0.14, 0.052 * k, s.iris, s.pupil);
}

const FROGS: Record<string, FrogSpec> = {
  // Dendrobates tinctorius: black with yellow back bands, blue legs with black spots
  dartfrog: {
    aspect: 0.56, skin: ['#151619', '#1c1d20', '#202227'], leg: ['#2c5fae', '#3a74c4', '#2d58a0'],
    iris: ['#2a2a2c', '#09090a'], pupil: 'dark',
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
    iris: ['#e7c66a', '#8a6a22'], pupil: 'h', pads: 0.016,
    marks: (l, P, W) => {
      soft(l, P, 0.12, 0.98, 0.06, 0.26, '#efe9cf', 0.9, [0.06, 0.04], [0.04, 0.0]);
      line(l, P, W, [[0.86, -0.12], [0.76, -0.1], [0.66, -0.07], [0.6, -0.02]], 0.2, 0.012); // supratympanic fold
      const r = rng(5); for (let i = 0; i < 6; i++) blob(l, P, W, 0.25 + r() * 0.5, -0.1 + r() * 0.08, 0.008, 0.008, '#f4f3e6', 0.7);
    },
  },
  // Bombina orientalis: flatter, warty green back with black blotches, red-orange belly with black spots
  firetoad: {
    aspect: 0.5, skin: ['#4b7a32', '#5d8c3a', '#d9461e'], leg: ['#557f35', '#5f8a3a', '#cf4a1e'],
    iris: ['#b38a3a', '#4c3a18'], pupil: 'round', warts: '#3e6627',
    marks: (l, P, W) => {
      const r = rng(9); for (let i = 0; i < 14; i++) blob(l, P, W, 0.15 + r() * 0.7, -0.12 + r() * 0.14, 0.03, 0.02, '#111410', 0.85);
      soft(l, P, 0.1, 0.98, 0.1, 0.26, '#e04a1c', 0.95, [0.05, 0.04], [0.04, 0.0]);
      for (let i = 0; i < 10; i++) blob(l, P, W, 0.15 + r() * 0.7, 0.15 + r() * 0.08, 0.018, 0.014, '#141210', 0.85);
    },
    legMarks: (l, P, W) => { const r = rng(4); for (let i = 0; i < 12; i++) blob(l, P, W, 0.05 + r() * 0.8, 0.02 + r() * 0.24, 0.018, 0.014, '#111410', 0.8); },
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
}

function drawSal(s: SalSpec, ctx: Ctx, P0: Proj, W: number) {
  const g = s.aspect / 2 - 0.015, P: Proj = (u, v) => P0(u, v), hd = s.head, tr = s.trunk, cv = g - 0.04 - tr; // body centre line
  const toe = 0.0065;
  // far legs, then the tail fin, then the far gills
  const legY = cv + tr * 0.6, foot = g - 0.004;
  limb(ctx, P, W, [[0.76, legY, 0.013], [0.725, (legY + foot) / 2, 0.01], [0.71, foot, 0.008]], [[0.69, g], [0.73, g]], toe, s.leg, true);
  limb(ctx, P, W, [[0.47, legY, 0.016], [0.43, (legY + foot) / 2, 0.012], [0.41, foot, 0.009]], [[0.38, g], [0.43, g]], toe, s.leg, true);
  if (s.finTail) fin(ctx, P, W, [[0.62, cv - tr], [0.45, cv - tr - 0.03], [0.25, cv - tr - 0.025], [0.08, cv - 0.03], [0.0, cv, 'c'],
    [0.08, cv + 0.035], [0.2, cv + tr + 0.015], [0.34, cv + tr + 0.02], [0.44, cv + tr]], [0.3, cv], s.finTail, darker(s.finTail, 0.75), { rays: 0, a: 0.7 });
  if (s.gills) gills(ctx, P, W, s, cv, true);
  // body: tail tip u = 0, head to u = 1
  const pts: Pt[] = [[1.0, cv + hd * 0.25, 'c'], [0.985, cv - hd * 0.6], [0.94, cv - hd * 0.95], [0.87, cv - hd], [0.8, cv - tr * 0.9],
    [0.7, cv - tr], [0.55, cv - tr * 0.95], [0.42, cv - tr * 0.85], [0.28, cv - tr * 0.6], [0.14, cv - tr * 0.35], [0.0, cv, 'c'],
    [0.14, cv + tr * 0.35], [0.28, cv + tr * 0.6], [0.42, cv + tr * 0.85], [0.55, cv + tr], [0.7, cv + tr], [0.8, cv + tr * 0.95],
    [0.88, cv + hd * 0.9], [0.95, cv + hd * 0.8], [0.99, cv + hd * 0.6]];
  body(ctx, P, W, pts, cv - hd, cv + tr, shadeOf(s.skin), 0.035, l => {
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
    aspect: 0.2, skin: ['#2a2420', '#3a312a', '#e2621e'], leg: ['#2e2823', '#3b322b', '#d8601f'], head: 0.034, trunk: 0.032,
    iris: ['#8a6a30', '#2a2010'], pupil: 'round',
    marks: (l, P, W) => {
      const g = 0.2 / 2 - 0.015, cv = g - 0.04 - 0.032;
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

export const HERP_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> = {
  ...Object.fromEntries(Object.entries(FROGS).map(([k, s]) => [k, (c: Ctx, P: Proj, W: number) => drawFrog(s, c, P, W)])),
  ...Object.fromEntries(Object.entries(SALS).map(([k, s]) => [k, (c: Ctx, P: Proj, W: number) => drawSal(s, c, P, W)])),
};

/** Aspect + resting offset (the ground line) for amphibian art keys. */
export function herpMeta(art: string): { aspect: number; rest: number } | undefined {
  const s = FROGS[art] ?? SALS[art]; if (!s) return undefined;
  return { aspect: s.aspect, rest: s.aspect / 2 - 0.015 };
}
