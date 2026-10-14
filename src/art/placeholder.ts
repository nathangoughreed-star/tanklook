// Placeholder illustrations drawn on canvas. Fish are drawn in a unit frame: u = 0 (tail tip) .. 1 (nose tip)
// across the card width W, v = vertical offset in widths from the centre line.
// Fish style (2026-10-08): match the tank render, not a cartoon. No black outlines (a thin edge one shade darker
// at most), countershading (dark back, light belly) with a soft inner rim that rounds the body, soft-edged
// markings, small realistic eyes, fins as tinted membranes with fine rays. The silhouette stays crisp (cards use
// alpha-test cutout), so every opaque or fin pixel keeps alpha >= FIN_A, above the 0.5 cutoff with a mipmap margin.
import type { Grain, SubstrateBlend, SubstrateType } from '../scene/types';

import { FIN_A, type Ctx, type Proj, type Pt, blob, body, eye, fin, gill, rng, soft, style } from './paint';
export { rng } from './paint';
import { type FinSpec, GEN_ART, bodyPlan, profile } from './fishgen';
/** A 3D fish's card body cut-out (widths): this far inside the outline at fin roots (the solid is inset 0.006), this far outside elsewhere. */
const HOLLOW = 0.012, HOLLOW_OUT = 0.02;
import { HERP_ART } from './herps';


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

export const FISH_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> = {
  angel: drawAngel, ...GEN_ART, ...HERP_ART,
};

/** Render a fish card (width W px, height from aspect) into a canvas. Nose points to +x (right). */
export function drawFishCard(art: string, aspect: number, W = 1024, finA = FIN_A, features = true, paired = true, hollow = false): HTMLCanvasElement {
  style.finA = finA; style.features = features; style.paired = paired;
  const c = document.createElement('canvas'), H = Math.round(W * aspect);
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.save(); (FISH_ART[art] ?? FISH_ART.tetra)(ctx, (u, v) => [u * W, H / 2 + v * W], W); ctx.restore(); // art may leave a clip set
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

/**
 * Substrate looks. Sand: flat grains on a base colour (too fine for shading to show). Gravel ('pebble'): packed, shaded
 * stones; `gloss` is the coated look of dyed aquarium gravel, `speckle` the mineral flecks of natural stone. Sizes are
 * radii in tile pixels (tile 90 → 512 px per 180 mm, so ~0.35 mm per pixel).
 */
export interface SubstrateLook {
  label: string; kind: 'sand' | 'pebble'; base: string; shades: string[]; size: [number, number]; tile: number;
  gloss?: number; speckle?: boolean; round?: number;
}
export type PresetSubstrate = Exclude<SubstrateType, 'custom'>;
export const SUBSTRATES: Record<PresetSubstrate, SubstrateLook> = {
  gravel: { label: 'Natural gravel', kind: 'pebble', base: '#241e17', tile: 90, size: [5, 11], speckle: true, gloss: 0.12, round: 0.75,
    shades: ['#9c8a70', '#7a6a55', '#b5a58c', '#8d8a82', '#6b6258', '#c9bfae', '#5a4f43', '#a39383', '#857565', '#4b4640', '#b39a7a', '#d6cdbd'] },
  pea:    { label: 'Pea gravel', kind: 'pebble', base: '#2a2219', tile: 90, size: [4, 8], speckle: true, gloss: 0.15, round: 0.88,
    shades: ['#c4a57e', '#b08d64', '#d8c1a0', '#9e7f5c', '#a99a86', '#e2d5c0', '#8a7058', '#bfae96'] },
  clown:  { label: 'Mixed colour gravel', kind: 'pebble', base: '#141414', tile: 90, size: [5, 9], gloss: 0.7, round: 0.85,
    shades: ['#d42a2a', '#1f5fd1', '#f2c81f', '#2ea84a', '#f06aa8', '#7b3fc4', '#f2801f', '#19b5b0', '#efefea', '#1e1e1e'] },
  blue:   { label: 'Blue gravel', kind: 'pebble', base: '#0b1430', tile: 90, size: [5, 9], gloss: 0.6, round: 0.85,
    shades: ['#2458c9', '#1c47a8', '#3a72e0', '#16388a', '#2f65d6'] },
  onyx:   { label: 'Black gravel', kind: 'pebble', base: '#0a0a0b', tile: 90, size: [5, 10], gloss: 0.45, round: 0.8,
    shades: ['#2a2a2e', '#1f1f22', '#36363b', '#18181a', '#414147'] },
  black:  { label: 'Black sand', kind: 'sand', base: '#222225', shades: ['#38383c', '#151517', '#4a4a50'], size: [1.5, 3.5], tile: 40 },
  white:  { label: 'White sand', kind: 'sand', base: '#ddd2bb', shades: ['#efe7d6', '#c9bc9f', '#f7f2e6'], size: [1.5, 3.5], tile: 40 },
  // marine (2026-10-13): oolitic aragonite is a bright, fine, faintly pink-cream sand; crushed coral is coarse,
  // chalky white and cream chips with the odd pink or grey fragment (drawn as flat chips: pebble shading made it grey)
  aragonite: { label: 'Aragonite sand (marine)', kind: 'sand', base: '#e9e3d4', shades: ['#f6f2e8', '#ddd3bf', '#fbf8f1', '#e8d9cc'], size: [1.2, 3], tile: 40 },
  coral:  { label: 'Crushed coral (marine)', kind: 'sand', base: '#bdb4a2', size: [2.5, 6.5], tile: 70,
    shades: ['#efe9dc', '#e2d8c4', '#f7f3ea', '#d3c7ae', '#e8d6cc', '#b9b2a6', '#f1e4d2', '#ddd5c9', '#a8a196'] },
};
const rgbOf = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const rgbStr = (c: number[], k = 1, a = 1) => `rgba(${c.map(v => Math.round(Math.min(255, Math.max(0, v * k)))).join(',')},${a})`;
/** Seamless substrate tile (grains and stones wrap across the edges). */
export function drawSubstrate(ctx: Ctx, W: number, type: PresetSubstrate) {
  const t = SUBSTRATES[type], r = rng(11); ctx.fillStyle = t.base; ctx.fillRect(0, 0, W, W);
  if (t.kind === 'pebble') return drawPebbles(ctx, W, t, r);
  const n = Math.round(W * W / (t.size[1] * t.size[1] * 2.2));
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * W, rx = t.size[0] + r() * (t.size[1] - t.size[0]), ry = rx * (0.6 + r() * 0.4), a = r() * 3;
    ctx.fillStyle = t.shades[i % t.shades.length];
    for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, rx, ry, a, 0, 7); ctx.fill(); }
  }
}
/**
 * Packed gravel, seen from above with the light from the upper left: stones dropped in random order, so later ones lie
 * on top; each casts a soft shadow down-right and is lit by a gradient (bright toward the light, dark at the rim).
 * Irregular rounded outlines, per-stone colour jitter, and for natural stone a few mineral flecks; coated gravel gets a
 * small specular glint. A pool of pre-rendered stones is stamped thousands of times (drawing each stone afresh took
 * seconds); the pile goes down in layers, each darkening what is under it, so the gaps read as depth, not outlines.
 */
function drawPebbles(ctx: Ctx, W: number, t: SubstrateLook, r: () => number, density = 2.6 / 0.8, pick?: () => SubstrateLook) {
  const [s0, s1] = t.size, avg = (s0 + s1) / 2, n = Math.round(W * W * density / (Math.PI * avg * avg));
  const pool = Array.from({ length: 240 }, () => pebbleSprite(pick ? pick() : t, r));
  const LAYERS = 4;
  for (let i = 0; i < n; i++) {
    if (i && i % Math.ceil(n / LAYERS) === 0 && density > 1.5) { ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(0, 0, W, W); }
    const sp = pool[Math.floor(r() * pool.length)], x = r() * W - sp.o, y = r() * W - sp.o, s = sp.c.width;
    for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) {
      if (x + dx > W || x + dx + s < 0 || y + dy > W || y + dy + s < 0) continue;
      ctx.drawImage(sp.c, x + dx, y + dy);
    }
  }
}
/** One stone with its contact shadow on a small canvas; `o` = offset from the canvas corner to the stone's centre. */
function pebbleSprite(t: SubstrateLook, r: () => number) {
  const [s0, s1] = t.size, round = t.round ?? 0.8;
  const rad = s0 + Math.pow(r(), 1.4) * (s1 - s0), asp = 0.62 + r() * 0.36, rot = r() * Math.PI;
  const c = rgbOf(t.shades[Math.floor(r() * t.shades.length)]), tint = 0.86 + r() * 0.28;
  const o = Math.ceil(rad * 2), cv = document.createElement('canvas'); cv.width = cv.height = o * 2;
  const x = cv.getContext('2d')!;
  // contact shadow, down-right of the stone
  x.save(); x.translate(o + rad * 0.28, o + rad * 0.32); x.rotate(rot);
  const sg = x.createRadialGradient(0, 0, rad * 0.4, 0, 0, rad * 1.35);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = sg; x.beginPath(); x.ellipse(0, 0, rad * 1.35, rad * asp * 1.35, 0, 0, 7); x.fill(); x.restore();
  // irregular outline: K radii, jittered less the rounder the stone, smoothed through the midpoints
  const K = 9, rr = Array.from({ length: K }, () => 1 + (r() - 0.5) * (1 - round));
  const pt = (k: number) => { const a = (k % K) / K * Math.PI * 2, q = rr[k % K]; return [Math.cos(a) * rad * q, Math.sin(a) * rad * asp * q]; };
  const mid = (k: number) => { const [ax, ay] = pt(k), [bx, by] = pt(k + 1); return [(ax + bx) / 2, (ay + by) / 2]; };
  x.save(); x.translate(o, o); x.rotate(rot); x.beginPath();
  const m0 = mid(0); x.moveTo(m0[0], m0[1]);
  for (let k = 1; k <= K; k++) { const [px, py] = pt(k), [mx, my] = mid(k); x.quadraticCurveTo(px, py, mx, my); }
  x.closePath();
  // light from the upper left, in the stone's rotated frame
  const lx = -Math.cos(rot) * 0.38 - Math.sin(rot) * 0.42, ly = Math.sin(rot) * 0.38 - Math.cos(rot) * 0.42;
  const g = x.createRadialGradient(lx * rad, ly * rad * asp, rad * 0.05, lx * rad * 0.4, ly * rad * asp * 0.4, rad * 1.25);
  g.addColorStop(0, rgbStr(c, tint * 1.28)); g.addColorStop(0.45, rgbStr(c, tint)); g.addColorStop(1, rgbStr(c, tint * 0.5));
  x.fillStyle = g; x.fill(); x.clip();
  if (t.speckle) for (let k = Math.floor(r() * 5); k > 0; k--) {
    x.fillStyle = rgbStr(c, tint * (r() < 0.5 ? 0.6 : 1.35), 0.7);
    x.beginPath(); x.arc((r() - 0.5) * 1.1 * rad, (r() - 0.5) * 1.1 * rad * asp, (0.06 + r() * 0.1) * rad, 0, 7); x.fill();
  }
  const glint = (t.gloss ?? 0) * (0.6 + r() * 0.4);
  if (glint > 0.05) {
    const hx = lx * rad * 0.75, hy = ly * rad * asp * 0.75, hg = x.createRadialGradient(hx, hy, 0, hx, hy, rad * 0.38);
    hg.addColorStop(0, `rgba(255,255,255,${0.75 * glint})`); hg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = hg; x.fillRect(-rad * 1.5, -rad * 1.5, rad * 3, rad * 3);
  }
  x.restore();
  return { c: cv, o };
}
/**
 * Neutral human silhouette for scale, standing, front view. Drawn head-to-toe across the full canvas height H
 * (so card height == person height); x in units of H from the centre line.
 */
const PERSON_R: [number, number][] = [ // right half: neck, out along the shoulder, down the arm and back up, down the body and leg
  [0.034, 0.118], [0.1, 0.148], [0.135, 0.175], [0.15, 0.3], [0.148, 0.455], [0.132, 0.49], [0.114, 0.458],
  [0.105, 0.235], [0.094, 0.3], [0.087, 0.42], [0.097, 0.52], [0.086, 0.75], [0.066, 0.962], [0.084, 0.996],
  [0.018, 0.998], [0.016, 0.76], [0.0, 0.535],
];
/** The scale person's outline, in heights: x across from the centre line, y down from the top of the head.
 *  The body is one closed outline; the head an ellipse (centre and radii). Shared with the viewer's "does it block" test. */
export const PERSON_BODY: [number, number][] = [...PERSON_R, ...PERSON_R.slice(0, -1).reverse().map(([x, y]) => [-x, y] as [number, number])];
export const PERSON_HEAD = { y: 0.064, rx: 0.052, ry: 0.062 };

export function drawPerson(ctx: Ctx, W: number, H: number) {
  const P = (x: number, y: number): [number, number] => [W / 2 + x * H, 2 + y * (H - 4)];
  ctx.lineJoin = 'round'; ctx.fillStyle = '#7d8593'; ctx.strokeStyle = '#3a3f48'; ctx.lineWidth = 5;
  ctx.beginPath(); PERSON_BODY.forEach(([x, y], i) => { const [px, py] = P(x, y); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const [hx, hy] = P(0, PERSON_HEAD.y); ctx.beginPath(); ctx.ellipse(hx, hy, PERSON_HEAD.rx * H, PERSON_HEAD.ry * H, 0, 0, 7); ctx.fill(); ctx.stroke();
}

/**
 * Custom substrate grains (Nathan 2026-10-13). Radii in mm; `tile` = how far (mm) one texture tile spans, so a grain
 * keeps its real size at any texture resolution.
 */
export const GRAIN_LOOK: Record<Grain, { label: string; size: [number, number]; tile: number; round: number; gloss: number }> = {
  mud:    { label: 'Mud', size: [0.03, 0.08], tile: 80, round: 1, gloss: 0 },
  sand:   { label: 'Sand', size: [0.25, 0.55], tile: 80, round: 0.9, gloss: 0 },
  gravel: { label: 'Gravel', size: [1.8, 3.9], tile: 180, round: 0.8, gloss: 0.12 },
  pebble: { label: 'Pebbles', size: [6, 13], tile: 320, round: 0.9, gloss: 0.1 },
};
const GRAIN_ORDER: Grain[] = ['mud', 'sand', 'gravel', 'pebble'];
/** Repeat length (mm) of a custom substrate's mixed tile: the coarser grain's. */
export const blendTile = (b: SubstrateBlend) => Math.max(GRAIN_LOOK[b.grain].tile, b.grain2 === 'none' ? 0 : GRAIN_LOOK[b.grain2].tile);
export function blendLabel(b: SubstrateBlend) {
  const a = GRAIN_LOOK[b.grain].label;
  return b.grain2 === 'none' ? a : `${a} ${100 - b.share} % + ${GRAIN_LOOK[b.grain2].label.toLowerCase()} ${b.share} %`;
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgbOf(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1)), h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s, hh = ((h % 360) + 360) % 360, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.min(5, Math.floor(hh / 60))];
  return '#' + [r, g, b].map(v => Math.round(Math.min(1, Math.max(0, v + m)) * 255).toString(16).padStart(2, '0')).join('');
}
/** Natural variation round one picked colour: small hue and saturation drift, wider lightness, a few greyer stones. */
function shadesOf(hex: string, n: number, r: () => number, spread = 1) {
  const [h, s, l] = hexToHsl(hex);
  return Array.from({ length: n }, () => {
    const grey = r() < 0.2 ? 0.55 : 1;
    return hslToHex(h + (r() - 0.5) * 18 * spread, Math.min(1, s * grey * (0.8 + r() * 0.4)), Math.min(0.97, Math.max(0.03, l + (r() - 0.5) * 0.24 * spread)));
  });
}
const shadeHex = (hex: string, k: number) => '#' + rgbOf(hex).map(v => Math.round(Math.min(255, v * k)).toString(16).padStart(2, '0')).join('');

/** One grain size in one colour as a SubstrateLook at this tile's scale (sizes to pixels). */
function grainLook(g: Grain, color: string, mmPx: number, r: () => number): SubstrateLook {
  const G = GRAIN_LOOK[g], kind = g === 'gravel' || g === 'pebble' ? 'pebble' : 'sand';
  return { label: G.label, kind, base: kind === 'pebble' ? shadeHex(color, 0.2) : shadeHex(color, 0.82), shades: shadesOf(color, 12, r, kind === 'sand' ? 0.6 : 1),
    size: [G.size[0] / mmPx, G.size[1] / mmPx], tile: G.tile, gloss: G.gloss, speckle: true, round: G.round };
}
/** Loose grains, `density` = area of grains per area of floor; grains under ~1.5 px are drawn as dots. */
function drawSand(ctx: Ctx, W: number, t: SubstrateLook, r: () => number, density: number) {
  const [s0, s1] = t.size, avg = (s0 + s1) / 2, n = Math.round(W * W * density / (Math.PI * avg * avg)), dots = s1 < 1.5;
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * W, rx = s0 + r() * (s1 - s0);
    ctx.fillStyle = t.shades[Math.floor(r() * t.shades.length)];
    if (dots) { const w = Math.max(1, rx * 2); ctx.fillRect(x, y, w, w); continue; }
    const ry = rx * (0.6 + r() * 0.4), a = r() * 3;
    for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) {
      if (x + dx > W + s1 || x + dx < -s1 || y + dy > W + s1 || y + dy < -s1) continue;
      ctx.beginPath(); ctx.ellipse(x + dx, y + dy, rx, ry, a, 0, 7); ctx.fill();
    }
  }
}
/** Mud / silt: smooth, with soft mottling, a fine silty grain and a few dark organic flecks; `cover` < 1 = patches over a bed. */
function drawMud(ctx: Ctx, W: number, color: string, r: () => number, cover = 1) {
  if (cover >= 1) { ctx.fillStyle = color; ctx.fillRect(0, 0, W, W); }
  const c = rgbOf(color), wrap = (x: number, y: number, rad: number, f: (x: number, y: number) => void) => {
    for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) if (x + dx < W + rad && x + dx > -rad && y + dy < W + rad && y + dy > -rad) f(x + dx, y + dy);
  };
  const spot = (x: number, y: number, rad: number, k: number, a0: number, a1: number) => wrap(x, y, rad, (px, py) => {
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, rgbStr(c, k, a0)); g.addColorStop(0.6, rgbStr(c, k, a1)); g.addColorStop(1, rgbStr(c, k, 0));
    ctx.fillStyle = g; ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  });
  // patches of this mud lying on the other grain
  if (cover < 1) for (let i = 0, n = Math.round(-Math.log(1 - cover * 0.97) * 90); i < n; i++) spot(r() * W, r() * W, W * (0.03 + r() * 0.06), 1, 0.95, 0.85);
  for (let i = 0; i < 70 * cover; i++) { const k = r() < 0.5 ? 0.88 : 1.1; spot(r() * W, r() * W, W * (0.04 + r() * 0.12), k, 0.22, 0.1); }
  if (cover >= 1) { // fine silt: per-pixel brightness jitter
    const im = ctx.getImageData(0, 0, W, W), px = im.data;
    for (let k = 0; k < px.length; k += 4) if (r() < 0.12) { const f = 0.93 + r() * 0.14; px[k] *= f; px[k + 1] *= f; px[k + 2] *= f; }
    ctx.putImageData(im, 0, 0);
  } else for (let i = 0; i < W * W * 0.12 * cover; i++) { ctx.fillStyle = rgbStr(c, 0.8 + r() * 0.4, 0.35); ctx.fillRect(r() * W, r() * W, 1, 1); }
  for (let i = 0; i < W * W * 0.0008 * cover; i++) { ctx.fillStyle = rgbStr(c, 0.45, 0.6); ctx.fillRect(r() * W, r() * W, 1 + r() * 2, 1 + r()); }
}
/** One grain in one colour covering `cover` of the tile (1 = the whole bed). */
function drawGrain(ctx: Ctx, W: number, g: Grain, color: string, mmPx: number, r: () => number, cover: number) {
  // a whole bed of a grain finer than the tile is drawn once at its own repeat and laid as a pattern (sand grain by grain
  // over a pebble-sized tile took ~10 s)
  const reps = cover >= 1 ? Math.round(W * mmPx / GRAIN_LOOK[g].tile) : 1;
  if (reps > 1) {
    const c = document.createElement('canvas'); c.width = c.height = Math.round(W / reps);
    drawGrain(c.getContext('2d')!, c.width, g, color, mmPx, r, 1);
    ctx.fillStyle = ctx.createPattern(c, 'repeat')!; ctx.fillRect(0, 0, W, W);
    return;
  }
  if (g === 'mud') return drawMud(ctx, W, color, r, cover);
  const t = grainLook(g, color, mmPx, r), dens = -Math.log(1 - Math.min(cover, 0.99) * 0.97);
  if (cover >= 1) { ctx.fillStyle = t.base; ctx.fillRect(0, 0, W, W); }
  // a partial cover over-counts by the stones' real area: flattened (aspect ~0.8) and skewed small (~0.8 of the mid size)
  if (t.kind === 'pebble') drawPebbles(ctx, W, t, r, cover >= 1 ? 2.6 / 0.8 : dens / 0.64); else drawSand(ctx, W, t, r, cover >= 1 ? 2.2 : dens / 0.8);
}
/**
 * A custom substrate tile, `which`: 'a' the first grain alone, 'b' the second alone, 'm' the two mixed grain by grain
 * (the finer one as the bed, the coarser covering its share of it; the same grain in two colours = each grain one or
 * the other). All three span `blendTile(b)` mm.
 */
export function drawBlendTile(ctx: Ctx, W: number, b: SubstrateBlend, which: 'a' | 'b' | 'm') {
  const mmPx = blendTile(b) / W, r = rng(11);
  if (which === 'a' || b.grain2 === 'none') return drawGrain(ctx, W, b.grain, b.color, mmPx, r, 1);
  if (which === 'b') return drawGrain(ctx, W, b.grain2, b.color2, mmPx, r, 1);
  const p2 = b.share / 100;
  if (b.grain === b.grain2) {
    const g = b.grain;
    if (g === 'mud') { drawMud(ctx, W, b.color, r); return drawMud(ctx, W, b.color2, r, p2); }
    const t1 = grainLook(g, b.color, mmPx, r), t2 = grainLook(g, b.color2, mmPx, r), either = () => (r() < p2 ? t2 : t1);
    ctx.fillStyle = p2 > 0.5 ? t2.base : t1.base; ctx.fillRect(0, 0, W, W);
    if (g === 'sand') return drawSand(ctx, W, { ...t1, shades: Array.from({ length: 48 }, () => either().shades[Math.floor(r() * 12)]) }, r, 2.2);
    return drawPebbles(ctx, W, t1, r, 2.6 / 0.8, either);
  }
  const second = GRAIN_ORDER.indexOf(b.grain2) > GRAIN_ORDER.indexOf(b.grain); // the second grain is the coarser
  const [fine, fc, coarse, cc, cov] = second ? [b.grain, b.color, b.grain2, b.color2, p2] : [b.grain2, b.color2, b.grain, b.color, 1 - p2];
  drawGrain(ctx, W, fine, fc, mmPx, r, 1);
  drawGrain(ctx, W, coarse, cc, mmPx, r, cov);
}

/**
 * Where the two grains lie on the floor: a seamless 256x256 noise field (three octaves, 0-1) and its sorted values, so
 * a share of the floor maps to a threshold exactly (`maskQuantile`).
 */
let maskCache: { data: Uint8Array<ArrayBuffer>; sorted: Float32Array } | undefined;
export function substrateMask() {
  if (maskCache) return maskCache;
  const N = 256, r = rng(29), f = new Float32Array(N * N);
  for (const [cells, amp] of [[4, 1], [8, 0.5], [16, 0.25]] as const) {
    const g = Array.from({ length: cells * cells }, () => r());
    const at = (i: number, j: number) => g[(j % cells) * cells + (i % cells)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N * cells, v = y / N * cells, i = Math.floor(u), j = Math.floor(v), s = u - i, t = v - j;
      const S = s * s * (3 - 2 * s), T = t * t * (3 - 2 * t);
      f[y * N + x] += amp * ((at(i, j) * (1 - S) + at(i + 1, j) * S) * (1 - T) + (at(i, j + 1) * (1 - S) + at(i + 1, j + 1) * S) * T);
    }
  }
  let lo = Infinity, hi = -Infinity; for (const v of f) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const data = new Uint8Array(N * N * 4);
  for (let k = 0; k < N * N; k++) { const v = Math.round((f[k] - lo) / (hi - lo) * 255); data[k * 4] = data[k * 4 + 1] = data[k * 4 + 2] = v; data[k * 4 + 3] = 255; }
  const sorted = Float32Array.from({ length: N * N }, (_, k) => data[k * 4] / 255).sort();
  return (maskCache = { data, sorted });
}
/** The mask value below which `p` (0-1) of the floor lies. */
export function maskQuantile(p: number) {
  const s = substrateMask().sorted;
  if (p <= 0) return -0.01;
  if (p >= 1) return 1.01;
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}
