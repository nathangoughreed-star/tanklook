// Placeholder illustrations drawn on canvas. Fish are drawn in a unit frame: u = 0 (tail tip) .. 1 (nose tip)
// across the card width W, v = vertical offset in widths from the centre line.
// Fish style (2026-10-08): match the tank render, not a cartoon. No black outlines (a thin edge one shade darker
// at most), countershading (dark back, light belly) with a soft inner rim that rounds the body, soft-edged
// markings, small realistic eyes, fins as tinted membranes with fine rays. The silhouette stays crisp (cards use
// alpha-test cutout), so every opaque or fin pixel keeps alpha >= FIN_A, above the 0.5 cutoff with a mipmap margin.
import type { SubstrateType } from '../scene/types';

import { FIN_A, type Ctx, type Proj, type Pt, blob, body, eye, fin, gill, hexA, rng, soft, style, vgrad } from './paint';
export { rng } from './paint';
import { type FinSpec, GEN_ART, bodyPlan, profile } from './fishgen';
/** A 3D fish's card body cut-out (widths): this far inside the outline at fin roots (the solid is inset 0.006), this far outside elsewhere. */
const HOLLOW = 0.012, HOLLOW_OUT = 0.02;
import { HERP_ART } from './herps';


function drawTetra(ctx: Ctx, P: Proj, W: number) {
  const tint = '#aebbb8', ray = '#7f8b87';
  fin(ctx, P, W, [[0.61, -0.10], [0.55, -0.16, 'c'], [0.50, -0.155], [0.46, -0.10]], [0.53, -0.09], tint, ray, { rays: 7 });
  fin(ctx, P, W, [[0.48, 0.09], [0.40, 0.135, 'c'], [0.31, 0.12], [0.26, 0.06]], [0.38, 0.07], tint, ray, { rays: 9 });
  fin(ctx, P, W, [[0.64, 0.095], [0.58, 0.14, 'c'], [0.55, 0.095]], [0.60, 0.085], tint, ray, { rays: 4 });
  fin(ctx, P, W, [[0.26, -0.055], [0.225, -0.08, 'c'], [0.20, -0.05]], [0.23, -0.05], '#b9b7a2', ray, { rays: 0 });
  fin(ctx, P, W, [[0.19, -0.03], [0.09, -0.09], [0.0, -0.15, 'c'], [0.07, -0.045], [0.095, 0.0], [0.07, 0.045], [0.0, 0.15, 'c'], [0.09, 0.09], [0.19, 0.03]],
    [0.17, 0.0], tint, ray, { rays: 16 });
  const pts: Pt[] = [[1.0, 0.0, 'c'], [0.95, -0.055], [0.85, -0.095], [0.70, -0.115], [0.50, -0.105], [0.32, -0.07], [0.20, -0.042], [0.14, -0.036],
    [0.14, 0.036], [0.20, 0.042], [0.32, 0.07], [0.50, 0.10], [0.70, 0.105], [0.85, 0.085], [0.95, 0.045]];
  body(ctx, P, W, pts, -0.12, 0.11, [[0, '#4f5744'], [0.25, '#727e66'], [0.5, '#a4ada2'], [0.75, '#d0d2ca'], [1, '#e2e0d8']], 0.035, l => {
    soft(l, P, 0.15, 0.60, -0.008, 0.13, '#c4303a', 0.95, [0, 0.05], [0.015, 0]);       // red lower rear
    soft(l, P, 0.24, 0.93, -0.07, -0.006, '#2aa9e0', 1, [0.05, 0.03], [0.012, 0.01]); // iridescent blue line
    soft(l, P, 0.3, 0.85, -0.05, -0.025, '#bfeaf6', 0.45, [0.1, 0.1], [0.006, 0.006]);  // sheen on the line
    gill(l, P, W, 0.845, -0.045, 0.05, 0.02);
  });
  fin(ctx, P, W, [[0.80, 0.02], [0.72, 0.05, 'c'], [0.75, 0.065], [0.81, 0.045]], [0.80, 0.035], tint, ray, { a: 0.35, rays: 5 });
  eye(ctx, P, W, 0.905, -0.022, 0.024, ['#b9ccd2', '#4c5c63']);
}

function drawAngel(ctx: Ctx, P: Proj, W: number) {
  const tint = '#c3c4bc', ray = '#86857c', bar = '#26262a';
  const bars = (c: Ctx, a: number) => {
    for (const [u, w] of [[0.865, 0.04], [0.645, 0.065], [0.43, 0.05]] as const) soft(c, P, u - w / 2, u + w / 2, -0.7, 0.7, bar, a, [0.012, 0.012], [0, 0]);
    soft(c, P, 0.20, 0.27, -0.7, 0.7, bar, a * 0.55, [0.02, 0.02], [0, 0]);
  };
  fin(ctx, P, W, [[0.66, -0.27], [0.56, -0.40], [0.40, -0.64, 'c'], [0.36, -0.48], [0.29, -0.26], [0.23, -0.07]], [0.42, -0.16], tint, ray,
    { rays: 18, extra: c => bars(c, 0.8) });
  fin(ctx, P, W, [[0.64, 0.25], [0.54, 0.40], [0.40, 0.64, 'c'], [0.36, 0.48], [0.29, 0.25], [0.23, 0.07]], [0.42, 0.15], tint, ray,
    { rays: 18, extra: c => bars(c, 0.8) });
  fin(ctx, P, W, [[0.25, -0.05], [0.12, -0.18], [0.0, -0.25, 'c'], [0.04, -0.08], [0.03, 0.0], [0.04, 0.08], [0.0, 0.25, 'c'], [0.12, 0.18], [0.25, 0.05]],
    [0.23, 0.0], tint, ray, { rays: 22, extra: c => soft(c, P, 0.0, 0.25, -0.3, 0.3, '#c9c6b8', 0.4, [0.08, 0], [0, 0]) });
  // Tall diamond body reaching up into the fin bases, so body and fins read as one shape, not a disc with fins.
  const pts: Pt[] = [[0.99, 0.0, 'c'], [0.93, -0.07], [0.76, -0.21], [0.60, -0.33], [0.50, -0.40], [0.42, -0.34], [0.33, -0.19], [0.25, -0.08], [0.20, -0.05],
    [0.20, 0.05], [0.25, 0.08], [0.33, 0.18], [0.42, 0.32], [0.50, 0.38], [0.60, 0.31], [0.76, 0.19], [0.93, 0.06]];
  body(ctx, P, W, pts, -0.38, 0.36, [[0, '#9a998e'], [0.3, '#c8c6ba'], [0.6, '#dad8cd'], [1, '#e4e1d7']], 0.035, l => {
    blob(l, P, W, 0.86, -0.15, 0.09, 0.07, '#c4a46a', 0.45);   // gold forehead
    blob(l, P, W, 0.60, -0.06, 0.22, 0.2, '#ffffff', 0.14);   // silver sheen
    bars(l, 0.9);
    gill(l, P, W, 0.83, -0.13, 0.12, 0.035);
  });
  fin(ctx, P, W, [[0.74, 0.20], [0.66, 0.40], [0.58, 0.63, 'c'], [0.70, 0.26], [0.72, 0.22]], [0.73, 0.21], '#e2ddcc', ray, { a: 0.8, rays: 2 });
  fin(ctx, P, W, [[0.78, 0.04], [0.68, 0.08, 'c'], [0.70, 0.11], [0.78, 0.075]], [0.78, 0.06], tint, ray, { a: 0.3, rays: 6 });
  eye(ctx, P, W, 0.875, -0.065, 0.026, ['#c8673f', '#5b2a1c']);
}

function drawGourami(ctx: Ctx, P: Proj, W: number) {
  const tint = '#a8987a', ray = '#73654f', r = rng(7);
  const pearls = (c: Ctx, n: number, u0: number, u1: number, v0: number, v1: number, a = 0.8) => {
    for (let i = 0; i < n; i++) blob(c, P, W, u0 + r() * (u1 - u0), v0 + r() * (v1 - v0), 0.007 + r() * 0.005, 0.007 + r() * 0.005, '#f2eadb', a);
  };
  fin(ctx, P, W, [[0.50, -0.19], [0.40, -0.25], [0.22, -0.27, 'c'], [0.20, -0.17], [0.20, -0.08]], [0.33, -0.14], tint, ray,
    { rays: 12, extra: c => pearls(c, 30, 0.22, 0.46, -0.27, -0.15, 0.6) });
  fin(ctx, P, W, [[0.68, 0.17], [0.50, 0.24], [0.30, 0.27], [0.19, 0.26, 'c'], [0.18, 0.14], [0.20, 0.08]], [0.40, 0.14], tint, ray,
    { rays: 22, extra: c => {
      c.fillStyle = vgrad(c, P, 0.16, 0.27, [[0, hexA('#c87a3e', 0)], [1, hexA('#c87a3e', 0.9)]]); c.fillRect(0, 0, W, c.canvas.height);
      pearls(c, 40, 0.2, 0.62, 0.17, 0.25, 0.55);
    } });
  fin(ctx, P, W, [[0.20, -0.07], [0.10, -0.16], [0.0, -0.15, 'c'], [0.02, 0.0], [0.0, 0.15, 'c'], [0.10, 0.16], [0.20, 0.07]], [0.18, 0.0], tint, ray,
    { rays: 20, extra: c => pearls(c, 50, 0.02, 0.2, -0.15, 0.15, 0.55) });
  const pts: Pt[] = [[1.0, 0.0, 'c'], [0.96, -0.07], [0.86, -0.16], [0.70, -0.20], [0.50, -0.20], [0.32, -0.15], [0.20, -0.09], [0.16, -0.08],
    [0.16, 0.08], [0.20, 0.09], [0.32, 0.15], [0.50, 0.19], [0.70, 0.18], [0.86, 0.13], [0.96, 0.06]];
  body(ctx, P, W, pts, -0.20, 0.19, [[0, '#5e5644'], [0.3, '#8f8266'], [0.6, '#b0a283'], [1, '#d3c6a8']], 0.035, l => {
    blob(l, P, W, 0.78, 0.15, 0.20, 0.09, '#cc5a22', 1);     // orange breast
    pearls(l, 220, 0.18, 0.88, -0.20, 0.12);
    l.strokeStyle = hexA('#2a251d', 0.35); l.lineWidth = 0.022 * W; l.beginPath();
    for (let i = 0; i <= 13; i++) { const [px, py] = P(0.86 - i * 0.05, (i % 2 ? 0.01 : -0.01)); if (i) l.lineTo(px, py); else l.moveTo(px, py); }
    l.stroke(); l.strokeStyle = hexA('#2a251d', 0.55); l.lineWidth = 0.01 * W; l.stroke();
    blob(l, P, W, 0.215, 0.0, 0.03, 0.03, '#2a251d', 0.7);    // tail-base spot
    gill(l, P, W, 0.83, -0.09, 0.08, 0.025);
  });
  fin(ctx, P, W, [[0.77, 0.15], [0.56, 0.245], [0.38, 0.295, 'c'], [0.56, 0.232], [0.74, 0.17]], [0.75, 0.16], '#d99a5c', ray, { a: 0.85, rays: 0 });
  fin(ctx, P, W, [[0.80, 0.03], [0.70, 0.07, 'c'], [0.72, 0.10], [0.80, 0.07]], [0.80, 0.05], tint, ray, { a: 0.3, rays: 6 });
  eye(ctx, P, W, 0.905, -0.035, 0.024, ['#d0b48a', '#5e4a2e']);
}

export const FISH_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> = {
  tetra: drawTetra, angel: drawAngel, gourami: drawGourami, ...GEN_ART, ...HERP_ART,
};

/** Render a fish card (width W px, height from aspect) into a canvas. Nose points to +x (right). */
export function drawFishCard(art: string, aspect: number, W = 1024, finA = FIN_A, features = true, paired = true, hollow = false): HTMLCanvasElement {
  style.finA = finA; style.features = features; style.paired = paired;
  const c = document.createElement('canvas'), H = Math.round(W * aspect);
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.save(); (FISH_ART[art] ?? drawTetra)(ctx, (u, v) => [u * W, H / 2 + v * W], W); ctx.restore(); // art may leave a clip set
  style.finA = FIN_A; style.features = true; style.paired = true;
  // a 3D fish's card keeps only the fins: cut the body out. Past the outline where no fin is rooted (the card's
  // painted rim and outline otherwise show as a dark hoop at the edge of the solid seen at an angle), a little inside
  // it where one is, so the fin roots stay
  const p = bodyPlan(art);
  if (hollow && p) {
    const prof = profile(p), N = 96, us = Array.from({ length: N + 1 }, (_, i) => p.pedU + (1.02 - p.pedU) * i / N);
    const rooted = (f: FinSpec | undefined, u: number) => !!f && u > f.u0 - 0.02 && u < f.u1 + 0.02;
    const top = (u: number) => (u < p.pedU + 0.03 || rooted(p.dorsal, u) || (p.adipose && Math.abs(u - p.pedU - 0.07) < 0.05) ? HOLLOW : -HOLLOW_OUT);
    const bot = (u: number) => (u < p.pedU + 0.03 || rooted(p.anal, u) ? HOLLOW : -HOLLOW_OUT);
    const at = (u: number) => prof(Math.min(u, 1));
    ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath();
    us.forEach((u, i) => { const v = at(u)[0] + top(u); i ? ctx.lineTo(u * W, H / 2 + v * W) : ctx.moveTo(u * W, H / 2 + v * W); });
    for (const u of us.reverse()) ctx.lineTo(u * W, H / 2 + (at(u)[1] - bot(u)) * W);
    ctx.fill(); ctx.globalCompositeOperation = 'source-over';
  }
  return c;
}

export const SUBSTRATES: Record<SubstrateType, { label: string; base: string; shades: string[]; size: [number, number]; tile: number }> = {
  gravel: { label: 'Natural gravel', base: '#7d6c55', shades: ['#a08a6c', '#5e5040', '#8f8576', '#b8a68a', '#4a4239'], size: [5, 11], tile: 90 },
  black:  { label: 'Black sand', base: '#222225', shades: ['#38383c', '#151517', '#4a4a50'], size: [1.5, 3.5], tile: 40 },
  white:  { label: 'White sand', base: '#ddd2bb', shades: ['#efe7d6', '#c9bc9f', '#f7f2e6'], size: [1.5, 3.5], tile: 40 },
};
/** Seamless grain tile (grains wrap across the edges). */
export function drawSubstrate(ctx: Ctx, W: number, type: SubstrateType) {
  const t = SUBSTRATES[type], r = rng(11); ctx.fillStyle = t.base; ctx.fillRect(0, 0, W, W);
  const n = Math.round(W * W / (t.size[1] * t.size[1] * 2.2));
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * W, rx = t.size[0] + r() * (t.size[1] - t.size[0]), ry = rx * (0.6 + r() * 0.4), a = r() * 3;
    ctx.fillStyle = t.shades[i % t.shades.length];
    for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, rx, ry, a, 0, 7); ctx.fill(); }
  }
}
/**
 * Neutral human silhouette for scale, standing, front view. Drawn head-to-toe across the full canvas height H
 * (so card height == person height); x in units of H from the centre line.
 */
export function drawPerson(ctx: Ctx, W: number, H: number) {
  const R: [number, number][] = [ // right half: neck, out along the shoulder, down the arm and back up, down the body and leg
    [0.034, 0.118], [0.1, 0.148], [0.135, 0.175], [0.15, 0.3], [0.148, 0.455], [0.132, 0.49], [0.114, 0.458],
    [0.105, 0.235], [0.094, 0.3], [0.087, 0.42], [0.097, 0.52], [0.086, 0.75], [0.066, 0.962], [0.084, 0.996],
    [0.018, 0.998], [0.016, 0.76], [0.0, 0.535],
  ];
  const pts = [...R, ...R.slice(0, -1).reverse().map(([x, y]) => [-x, y] as [number, number])];
  const P = (x: number, y: number): [number, number] => [W / 2 + x * H, 2 + y * (H - 4)];
  ctx.lineJoin = 'round'; ctx.fillStyle = '#7d8593'; ctx.strokeStyle = '#3a3f48'; ctx.lineWidth = 5;
  ctx.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P(x, y); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const [hx, hy] = P(0, 0.064); ctx.beginPath(); ctx.ellipse(hx, hy, 0.052 * H, 0.062 * H, 0, 0, 7); ctx.fill(); ctx.stroke();
}
