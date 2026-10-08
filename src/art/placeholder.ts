// Placeholder illustrations drawn on canvas with hard silhouettes (art rule: clean outlines, transparent
// background, no soft glows or baked shadows). Fish are drawn in a unit frame: u = 0 (tail tip) .. 1 (nose tip)
// across the card width W, v = vertical offset in widths from the centre line.
import type { SubstrateType } from '../scene/types';

type Ctx = CanvasRenderingContext2D;
type Proj = (u: number, v: number) => [number, number];
type Pt = [number, number] | [number, number, 'c'];

export function rng(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Closed smooth path through midpoints; points tagged 'c' are sharp corners (nose/tail tips, so calibration is exact). */
function shape(ctx: Ctx, P: Proj, pts: Pt[]) {
  const n = pts.length, m = (a: readonly unknown[], b: readonly unknown[]) =>
    [((a[0] as number) + (b[0] as number)) / 2, ((a[1] as number) + (b[1] as number)) / 2];
  const q = pts.map(p => [...P(p[0], p[1]), p[2]] as [number, number, string | undefined]);
  ctx.beginPath(); const s = m(q[n - 1], q[0]); ctx.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const p = q[i], mid = m(p, q[(i + 1) % n]);
    if (p[2] === 'c') { ctx.lineTo(p[0], p[1]); ctx.lineTo(mid[0], mid[1]); }
    else ctx.quadraticCurveTo(p[0], p[1], mid[0], mid[1]);
  }
  ctx.closePath();
}
const OUT = '#1b2028';
function fillStroke(ctx: Ctx, fill: string, w: number) { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = w; ctx.stroke(); }
function eye(ctx: Ctx, P: Proj, u: number, v: number, r: number, W: number) {
  const [x, y] = P(u, v);
  ctx.beginPath(); ctx.arc(x, y, r * W, 0, 7); ctx.fillStyle = '#f4f4ee'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * W * 0.55, 0, 7); ctx.fillStyle = '#111'; ctx.fill();
}
function band(ctx: Ctx, P: Proj, u0: number, v0: number, u1: number, v1: number, color: string) {
  const [x0, y0] = P(u0, v0), [x1, y1] = P(u1, v1); ctx.fillStyle = color; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

function drawTetra(ctx: Ctx, P: Proj, W: number) {
  shape(ctx, P, [[0.58, -0.10], [0.52, -0.165, 'c'], [0.45, -0.09]]); fillStroke(ctx, '#b7c2bd', 5);
  shape(ctx, P, [[0.47, 0.09], [0.38, 0.145, 'c'], [0.27, 0.06]]); fillStroke(ctx, '#b7c2bd', 5);
  const body: Pt[] = [[1.0, 0.0, 'c'], [0.93, -0.07], [0.72, -0.115], [0.45, -0.10], [0.24, -0.045], [0.17, -0.04], [0.0, -0.15, 'c'], [0.09, 0.0], [0.0, 0.15, 'c'], [0.17, 0.04], [0.24, 0.045], [0.45, 0.10], [0.72, 0.115], [0.93, 0.07]];
  shape(ctx, P, body); ctx.fillStyle = '#c3cbc4'; ctx.fill();
  ctx.save(); ctx.clip();
  band(ctx, P, 0.15, -0.2, 1, -0.06, '#6f7f5e');       // olive back
  band(ctx, P, 0.2, -0.065, 0.95, -0.006, '#0fb6ff');  // electric-blue line
  band(ctx, P, 0.17, -0.006, 0.6, 0.13, '#ff2533');    // red lower rear
  ctx.restore(); shape(ctx, P, body); ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
  eye(ctx, P, 0.9, -0.025, 0.024, W);
}
function drawAngel(ctx: Ctx, P: Proj, W: number) {
  shape(ctx, P, [[0.74, 0.22], [0.58, 0.63, 'c'], [0.70, 0.24]]); fillStroke(ctx, '#e8e4d6', 4);
  const body: Pt[] = [[0.99, 0.0, 'c'], [0.92, -0.12], [0.78, -0.27], [0.62, -0.36], [0.50, -0.50], [0.40, -0.64, 'c'], [0.36, -0.40], [0.27, -0.12], [0.22, -0.08], [0.10, -0.22], [0.0, -0.25, 'c'], [0.04, 0.0], [0.0, 0.25, 'c'], [0.10, 0.22], [0.22, 0.08], [0.27, 0.12], [0.36, 0.40], [0.40, 0.64, 'c'], [0.50, 0.50], [0.62, 0.34], [0.78, 0.24], [0.92, 0.10]];
  shape(ctx, P, body); ctx.fillStyle = '#dcd8c8'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#2b2a28';
  for (const [u, w] of [[0.86, 0.045], [0.64, 0.06], [0.42, 0.05]]) { const [x] = P(u - w / 2, 0), [x2] = P(u + w / 2, 0); ctx.fillRect(x, 0, x2 - x, 99999); }
  ctx.restore(); shape(ctx, P, body); ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
  eye(ctx, P, 0.875, -0.07, 0.03, W);
}
function drawGourami(ctx: Ctx, P: Proj, W: number) {
  shape(ctx, P, [[0.76, 0.15], [0.38, 0.29, 'c'], [0.73, 0.17]]); fillStroke(ctx, '#e3a35c', 4);
  const body: Pt[] = [[1.0, 0.0, 'c'], [0.95, -0.08], [0.80, -0.17], [0.55, -0.20], [0.42, -0.27], [0.20, -0.25, 'c'], [0.18, -0.12], [0.10, -0.18], [0.0, -0.15, 'c'], [0.0, 0.15, 'c'], [0.10, 0.18], [0.18, 0.12], [0.20, 0.25, 'c'], [0.45, 0.25], [0.66, 0.17], [0.85, 0.13], [0.95, 0.07]];
  shape(ctx, P, body); ctx.fillStyle = '#b9a685'; ctx.fill();
  ctx.save(); ctx.clip();
  const [x, y] = P(0.78, 0.13); ctx.beginPath(); ctx.ellipse(x, y, 0.16 * W, 0.08 * W, 0, 0, 7); ctx.fillStyle = '#d9702b'; ctx.fill();
  const r = rng(7); ctx.fillStyle = '#f4ecd9';
  for (let i = 0; i < 260; i++) { const [px, py] = P(0.05 + r() * 0.85, -0.27 + r() * 0.5); ctx.beginPath(); ctx.arc(px, py, (0.006 + r() * 0.006) * W, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#2f281f'; ctx.lineWidth = 0.014 * W; ctx.beginPath();
  for (let i = 0; i <= 14; i++) { const [px, py] = P(0.88 - i * 0.05, (i % 2 ? 0.012 : -0.012)); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  ctx.stroke();
  ctx.restore(); shape(ctx, P, body); ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
  eye(ctx, P, 0.9, -0.035, 0.026, W);
}

export const FISH_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> = {
  tetra: drawTetra, angel: drawAngel, gourami: drawGourami,
};

/** Render a fish card (width W px, height from aspect) into a canvas. Nose points to +x (right). */
export function drawFishCard(art: string, aspect: number, W = 1024): HTMLCanvasElement {
  const c = document.createElement('canvas'), H = Math.round(W * aspect);
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; ctx.lineJoin = 'round';
  (FISH_ART[art] ?? drawTetra)(ctx, (u, v) => [u * W, H / 2 + v * W], W);
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
export function drawPlant(ctx: Ctx, W: number, H: number) {
  const r = rng(3), greens = ['#3f8a3a', '#56a043', '#2f7031', '#6bb04e'];
  for (let i = 0; i < 9; i++) {
    const bx = W * (0.3 + 0.4 * i / 8), tx = bx + (r() - 0.5) * W * 0.7, ty = H * (0.02 + r() * 0.3), bw = W * 0.05;
    const cx = (bx + tx) / 2 + (r() - 0.5) * W * 0.4;
    ctx.beginPath(); ctx.moveTo(bx - bw / 2, H); ctx.quadraticCurveTo(cx - bw / 2, H * 0.55, tx, ty);
    ctx.quadraticCurveTo(cx + bw / 2, H * 0.55, bx + bw / 2, H); ctx.closePath();
    ctx.fillStyle = greens[i % 4]; ctx.fill(); ctx.strokeStyle = '#173a17'; ctx.lineWidth = 4; ctx.stroke();
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
