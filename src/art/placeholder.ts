// Placeholder illustrations drawn on canvas. Fish are drawn in a unit frame: u = 0 (tail tip) .. 1 (nose tip)
// across the card width W, v = vertical offset in widths from the centre line.
// Fish style (2026-10-08): match the tank render, not a cartoon. No black outlines (a thin edge one shade darker
// at most), countershading (dark back, light belly) with a soft inner rim that rounds the body, soft-edged
// markings, small realistic eyes, fins as tinted membranes with fine rays. The silhouette stays crisp (cards use
// alpha-test cutout), so every opaque or fin pixel keeps alpha >= FIN_A, above the 0.5 cutoff with a mipmap margin.
import { blendOrder } from '../scene/blend';
import { BRANDS, type BrandProduct } from '../data/substrateBrands';
import type { Grain, SubstrateBlend, SubstrateType } from '../scene/types';

import { FIN_A, type Ctx, type Proj, type Pt, blob, body, eye, fin, gill, rng, soft, style } from './paint';
export { rng } from './paint';
import { GEN_ART, bodyPlan, finRooted, profile } from './fishgen';
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
    const prof = profile(p), N = 96, u0 = p.pedU + (p.tailBlend ?? 0) + 0.008, us = Array.from({ length: N + 1 }, (_, i) => u0 + (1.02 - u0) * i / N); // u0: the cut starts a hair inside the solid, so the card tucks under its tail end (cut and body ending on the same line left a hairline seam where the tail fin starts)
    // the root rim scales with the fish's depth (at most 8 % of its half-depth, twice the solid's inset in fish3d.ts): 0.012 was a quarter
    // of a bichir's half-depth, and the flat unshaded rim over the shaded solid read as pale slabs above the anal fin, bases under the
    // finlets and a step at the tail (method row 59)
    const maxHv = Math.max(...Array.from({ length: 41 }, (_, i) => { const [a, b] = prof(p.pedU + (1 - p.pedU) * i / 40); return (b - a) / 2; }));
    const hol = Math.min(HOLLOW, 0.08 * maxHv);
    const top = (u: number) => (u < p.pedU + 0.03 || finRooted(p, true, u) || (p.adipose && Math.abs(u - p.pedU - 0.07) < 0.05) ? hol : -HOLLOW_OUT);
    const bot = (u: number) => (u < p.pedU + 0.03 || finRooted(p, false, u) ? hol : -HOLLOW_OUT);
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
  label: string; kind: 'sand' | 'pebble' | 'soil' | 'clay' | 'bark'; base: string; shades: string[]; size: [number, number]; tile: number;
  gloss?: number; speckle?: boolean; round?: number;
  /** Terrestrial ground (lane T1): its own colour when dry (no damp-soil tint above the water), darker when wet. */
  terra?: boolean;
  /** Second shade set: soil's coco fibres. */
  fibre?: string[];
}
export type PresetSubstrate = Exclude<SubstrateType, 'custom'>;
/** SB1: a real product (data/substrateBrands.ts) as a look. mm across -> tile px radius: 1 px = tile / 256 mm. */
function brandLook(b: BrandProduct): SubstrateLook {
  const tile = b.kind === 'sand' ? 40 : 90, px = (mm: number) => Math.max(1, Math.round(mm / 2 / (tile / 256) * 10) / 10);
  return { label: b.colour ? `${b.brand} ${b.name}, ${b.colour}` : `${b.brand} ${b.name}`, kind: b.kind, base: shade(b.base, 0.35), shades: b.shades.length ? b.shades : [b.base], size: [px(b.mm[0]), px(Math.max(b.mm[0] + 0.3, b.mm[1]))], tile, gloss: b.gloss, round: b.round, speckle: b.gloss < 0.25 && b.kind === 'pebble' };
}
const shade = (hex: string, k: number) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
const SOIL = ['#3d2b1e', '#4a3424', '#22170f', '#57402c', '#33241a', '#614731'], COCO = ['#9a6638', '#7f522d', '#b07a46', '#6a4426', '#c08a55'];
export const SUBSTRATES = {
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
  // terrestrial (lane T1, 2026-10-16). Soil / coco fibre: dark crumbly humus with ginger coco strands and the odd perlite
  // fleck; terrarium sand: warm tan desert sand; clay: terracotta with a fine dry-crack network; orchid bark: flat
  // reddish-brown chips with fibrous grain, packed like gravel. 'layered' = the soil on top of a clay-ball drainage layer.
  soil:   { label: 'Soil / coco fibre', kind: 'soil', base: '#2b1e15', tile: 60, size: [1.5, 5], terra: true, shades: SOIL, fibre: COCO },
  tsand:  { label: 'Terrarium sand', kind: 'sand', base: '#b8915f', size: [1.5, 3.5], tile: 40, terra: true,
    shades: ['#cfa877', '#a77f50', '#dcbc8f', '#9c7347', '#c49b69', '#e3c9a0', '#8f6a42'] },
  clay:   { label: 'Clay', kind: 'clay', base: '#8e5236', size: [1, 2.5], tile: 120, terra: true,
    shades: ['#9d5f40', '#83492f', '#a8694a', '#774229', '#b07554'] },
  bark:   { label: 'Orchid bark', kind: 'bark', base: '#1c110b', tile: 160, size: [14, 30], terra: true,
    shades: ['#6e3a22', '#7f4629', '#5c301c', '#8e5333', '#4f2a19', '#9a6040', '#6a4030'] },
  layered: { label: 'Layered: clay balls under soil', kind: 'soil', base: '#2b1e15', tile: 60, size: [1.5, 5], terra: true, shades: SOIL, fibre: COCO },
  // SB1 (2026-11-26): more dyed aquarium-gravel colours, as blue is
  red:    { label: 'Red gravel', kind: 'pebble', base: '#2a0b0b', tile: 90, size: [5, 9], gloss: 0.6, round: 0.85,
    shades: ['#c42a2a', '#a81f1f', '#dc3d3d', '#8a1818', '#cf3434'] },
  pink:   { label: 'Pink gravel', kind: 'pebble', base: '#2e1420', tile: 90, size: [5, 9], gloss: 0.6, round: 0.85,
    shades: ['#e8709f', '#d4568a', '#f28cb3', '#c24a7c', '#ee7aa6'] },
  green:  { label: 'Green gravel', kind: 'pebble', base: '#0c200f', tile: 90, size: [5, 9], gloss: 0.6, round: 0.85,
    shades: ['#2ea84a', '#25903c', '#43bd5f', '#1c7a30', '#35b052'] },
  wgrav:  { label: 'White gravel', kind: 'pebble', base: '#3a3a38', tile: 90, size: [5, 9], gloss: 0.5, round: 0.85,
    shades: ['#f2f0ea', '#e2dfd6', '#fbfaf6', '#d3cfc4', '#ece9e0'] },
  ...Object.fromEntries(BRANDS.map(b => [b.id, brandLook(b)])),
} as Record<PresetSubstrate, SubstrateLook>;
/** Expanded clay balls (LECA), the drainage layer of 'layered' ground, seen only in its cross-section at the glass. */
export const LECA: SubstrateLook = { label: 'Clay balls', kind: 'pebble', base: '#2a160c', tile: 90, size: [14, 24], speckle: true, gloss: 0, round: 0.97,
  shades: ['#b5653a', '#a35a33', '#c4774a', '#8f4e2d', '#b86d45', '#9c5634'] };
/** Seamless tile of a look that is not a preset (LECA). */
export function drawLook(ctx: Ctx, W: number, t: SubstrateLook) {
  const r = rng(17); ctx.fillStyle = t.base; ctx.fillRect(0, 0, W, W); drawPebbles(ctx, W, t, r, 2.2);
}
const rgbOf = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const rgbStr = (c: number[], k = 1, a = 1) => `rgba(${c.map(v => Math.round(Math.min(255, Math.max(0, v * k)))).join(',')},${a})`;
/** Call f at (x, y) and at each wrapped copy that reaches into the W x W tile. */
function wrap9(W: number, x: number, y: number, rad: number, f: (x: number, y: number) => void) {
  for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) if (x + dx < W + rad && x + dx > -rad && y + dy < W + rad && y + dy > -rad) f(x + dx, y + dy);
}
/** Soft light and dark blotches over the base (moisture and humus patches). */
function mottle(ctx: Ctx, W: number, r: () => number, n: number, r0: number, r1: number, a: number) {
  for (let i = 0; i < n; i++) {
    const rad = r0 + r() * (r1 - r0), dark = r() < 0.5, x = r() * W, y = r() * W;
    wrap9(W, x, y, rad, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, dark ? `rgba(0,0,0,${a})` : `rgba(255,235,210,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    });
  }
}
/** Per-pixel grain: each pixel times 1 +- amp, so flat fills do not read as plastic. */
function grain(ctx: Ctx, W: number, r: () => number, amp: number) {
  const im = ctx.getImageData(0, 0, W, W), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const k = 1 + (r() - 0.5) * 2 * amp; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
  ctx.putImageData(im, 0, 0);
}
/**
 * Soil / coco fibre: humus blotches, packed crumbs (each lit at the top left, a dark rim at the bottom right), coco
 * strands lying in loose curls over and between the crumbs, and a few white perlite flecks.
 */
function drawSoil(ctx: Ctx, W: number, t: SubstrateLook, r: () => number) {
  mottle(ctx, W, r, 70, 20, 90, 0.35);
  const [s0, s1] = t.size, n = Math.round(W * W / 26);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * W, rad = s0 + Math.pow(r(), 2) * (s1 - s0), c = rgbOf(t.shades[Math.floor(r() * t.shades.length)]), k = 0.8 + r() * 0.4;
    const asp = 0.7 + r() * 0.3, rot = r() * 3;
    wrap9(W, x, y, rad + 2, (px, py) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(px + rad * 0.3, py + rad * 0.35, rad, rad * 0.8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = rgbStr(c, k); ctx.beginPath(); ctx.ellipse(px, py, rad, rad * asp, rot, 0, 7); ctx.fill();
      if (rad > 2) { ctx.fillStyle = rgbStr(c, k * 1.35, 0.6); ctx.beginPath(); ctx.arc(px - rad * 0.3, py - rad * 0.3, rad * 0.4, 0, 7); ctx.fill(); }
    });
  }
  const F = t.fibre ?? t.shades;
  ctx.lineCap = 'round';
  for (let i = 0; i < 220; i++) { // coco strands: thin curved hairs
    const x = r() * W, y = r() * W, len = 20 + r() * 90, a = r() * Math.PI * 2, bend = (r() - 0.5) * 1.6;
    const c = rgbOf(F[Math.floor(r() * F.length)]), w = 0.5 + r() * 0.9, k = 0.7 + r() * 0.4;
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len, mx = (x + x1) / 2 - Math.sin(a) * len * bend * 0.5, my = (y + y1) / 2 + Math.cos(a) * len * bend * 0.5;
    const cx = (x + x1) / 2, cy = (y + y1) / 2;
    wrap9(W, cx, cy, len, (px, py) => {
      const ox = px - cx, oy = py - cy, stroke = (d: number) => { ctx.beginPath(); ctx.moveTo(x + ox + d, y + oy + d); ctx.quadraticCurveTo(mx + ox + d, my + oy + d, x1 + ox + d, y1 + oy + d); ctx.stroke(); };
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = w + 1.2; stroke(0.9);
      ctx.strokeStyle = rgbStr(c, k, 0.9); ctx.lineWidth = w; stroke(0);
    });
  }
  for (let i = 0; i < 26; i++) { // perlite
    const x = r() * W, y = r() * W, rad = 1.2 + r() * 2.2, rot = r() * 3;
    wrap9(W, x, y, rad, (px, py) => { ctx.fillStyle = 'rgba(232,230,222,0.85)'; ctx.beginPath(); ctx.ellipse(px, py, rad, rad * 0.8, rot, 0, 7); ctx.fill(); });
  }
  grain(ctx, W, r, 0.06);
}
/**
 * Clay: smooth terracotta with broad tonal drift, a fine silt grain, and a seamless network of dry cracks (cell borders
 * of a Voronoi pattern on the torus: dark where a pixel is about as near its second-nearest centre as its nearest),
 * each crack's lip a touch lighter where the plate curls up.
 */
function drawClay(ctx: Ctx, W: number, t: SubstrateLook, r: () => number) {
  mottle(ctx, W, r, 60, 20, 90, 0.14);
  const [s0, s1] = t.size, n = Math.round(W * W / 14);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rgbStr(rgbOf(t.shades[Math.floor(r() * t.shades.length)]), 0.9 + r() * 0.25, 0.5);
    const w = s0 + r() * (s1 - s0); ctx.fillRect(r() * W, r() * W, w, w);
  }
  const cx = Array.from({ length: 34 }, () => [r() * W, r() * W]);
  const im = ctx.getImageData(0, 0, W, W), d = im.data;
  const tw = Math.PI * 2 / W; // the crack lines wander: the cells are looked up at a wobbled point (whole waves per tile, seamless)
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    let a = 1e9, b = 1e9;
    const sx = x + 4 * Math.sin(tw * 9 * y + 1.7) + 2 * Math.sin(tw * 23 * y), sy = y + 4 * Math.sin(tw * 11 * x + 0.4) + 2 * Math.sin(tw * 19 * x);
    for (const [px, py] of cx) {
      let dx = Math.abs(sx - px) % W, dy = Math.abs(sy - py) % W; if (dx > W / 2) dx = W - dx; if (dy > W / 2) dy = W - dy;
      const q = Math.sqrt(dx * dx + dy * dy); if (q < a) { b = a; a = q; } else if (q < b) b = q;
    }
    const gap = b - a, i = (y * W + x) * 4, k = gap < 1.2 ? 0.35 + gap * 0.25 : gap < 4 ? 1.08 - (gap - 1.2) * 0.028 : 1;
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
  }
  ctx.putImageData(im, 0, 0);
  grain(ctx, W, r, 0.05);
}
/**
 * Orchid bark: flat, angular chips dropped in layers (like the gravel pile, each layer darkening the one under it).
 * Each chip an irregular polygon longer than wide, its fibrous grain as fine streaks along its length, a darker rough
 * outer face on some, a soft contact shadow and a thin lit edge.
 */
function drawBark(ctx: Ctx, W: number, t: SubstrateLook, r: () => number) {
  const [s0, s1] = t.size, avg = (s0 + s1) / 2, n = Math.round(W * W * 2.6 / (Math.PI * avg * avg * 0.15));
  const pool = Array.from({ length: 90 }, () => barkSprite(t, r));
  for (let i = 0; i < n; i++) {
    if (i && i % Math.ceil(n / 4) === 0) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(0, 0, W, W); }
    const sp = pool[Math.floor(r() * pool.length)], h = sp.width / 2, x = r() * W, y = r() * W;
    wrap9(W, x, y, h, (px, py) => ctx.drawImage(sp, px - h, py - h));
  }
  grain(ctx, W, r, 0.05);
}
function barkSprite(t: SubstrateLook, r: () => number) {
  const [s0, s1] = t.size, len = s0 + Math.pow(r(), 1.3) * (s1 - s0), wid = len * (0.5 + r() * 0.4), rot = r() * Math.PI;
  const o = Math.ceil(len * 0.75), cv = document.createElement('canvas'); cv.width = cv.height = o * 2;
  const x = cv.getContext('2d')!, c = rgbOf(t.shades[Math.floor(r() * t.shades.length)]), tint = 0.85 + r() * 0.3, outer = r() < 0.4;
  // a blocky chunk: points round a squarish outline (superellipse), each corner knocked about, the odd one broken off
  const K = 7 + Math.floor(r() * 4), pts = Array.from({ length: K }, (_, k) => {
    const a = (k + (r() - 0.5) * 0.5) / K * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), q = (r() < 0.15 ? 0.7 : 0.88) + r() * 0.16;
    return [Math.sign(c) * Math.abs(c) ** 0.45 * len * 0.5 * q, Math.sign(sn) * Math.abs(sn) ** 0.45 * wid * 0.5 * q];
  });
  const path = (dx: number, dy: number) => { x.beginPath(); pts.forEach(([px, py], k) => k ? x.lineTo(px + dx, py + dy) : x.moveTo(px + dx, py + dy)); x.closePath(); };
  x.translate(o, o); x.rotate(rot);
  x.fillStyle = 'rgba(0,0,0,0.45)'; path(len * 0.06, wid * 0.1); x.fill(); // contact shadow
  path(0, 0); x.fillStyle = rgbStr(c, tint * (outer ? 0.7 : 1)); x.fill(); x.save(); x.clip();
  for (let k = 0; k < 10; k++) { // grain streaks along the chip, faint
    const yy = (r() - 0.5) * wid, l = len * (0.3 + r() * 0.7), xx = (r() - 0.5) * (len - l);
    x.strokeStyle = r() < 0.55 ? rgbStr(c, tint * 0.75, 0.35) : rgbStr(c, tint * 1.15, 0.25); x.lineWidth = 0.5 + r() * 0.8;
    x.beginPath(); x.moveTo(xx - l / 2, yy); x.lineTo(xx + l / 2, yy + (r() - 0.5) * 2); x.stroke();
  }
  if (outer) for (let k = 0; k < 6; k++) { // rough outer face: dark fissures
    x.strokeStyle = 'rgba(20,10,5,0.6)'; x.lineWidth = 1 + r() * 1.5; const yy = (r() - 0.5) * wid;
    x.beginPath(); x.moveTo(-len / 2, yy); x.lineTo(len / 2, yy + (r() - 0.5) * wid * 0.4); x.stroke();
  }
  const g = x.createLinearGradient(-len * 0.3, -wid * 0.5, len * 0.3, wid * 0.5); // light from the upper left
  g.addColorStop(0, 'rgba(255,230,200,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = g; x.fillRect(-len, -len, len * 2, len * 2);
  x.restore(); path(0, 0); x.strokeStyle = rgbStr(c, tint * 1.4, 0.5); x.lineWidth = 1; x.stroke();
  return cv;
}
/** Seamless substrate tile (grains and stones wrap across the edges). */
export function drawSubstrate(ctx: Ctx, W: number, type: PresetSubstrate) {
  const t = SUBSTRATES[type], r = rng(11); ctx.fillStyle = t.base; ctx.fillRect(0, 0, W, W);
  if (t.kind === 'pebble') return drawPebbles(ctx, W, t, r);
  if (t.kind === 'soil') return drawSoil(ctx, W, t, r);
  if (t.kind === 'clay') return drawClay(ctx, W, t, r);
  if (t.kind === 'bark') return drawBark(ctx, W, t, r);
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
export const GRAIN_ORDER: Grain[] = ['mud', 'sand', 'gravel', 'pebble'];
/** Repeat length (mm) of a custom substrate's mixed tile: the coarser grain's. */
export const blendTile = (b: SubstrateBlend) => Math.max(...b.grains.map(g => GRAIN_LOOK[g.grain].tile));
/** 'Sand 60 % + gravel 25 % + pebbles 15 %' (one grain: 'Sand'). */
export function blendLabel(b: SubstrateBlend) {
  const [g0, ...rest] = b.grains, a = GRAIN_LOOK[g0.grain].label;
  return rest.length ? `${a} ${g0.share} % + ${rest.map(g => `${GRAIN_LOOK[g.grain].label.toLowerCase()} ${g.share} %`).join(' + ')}` : a;
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
export function shadesOf(hex: string, n: number, r: () => number, spread = 1) {
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
/** Which tile of a blend: 'a'..'e' = the grain at that place of `blendOrder` alone, 'm' = all mixed grain by grain. */
export type BlendTileId = 'a' | 'b' | 'c' | 'd' | 'e' | 'm';
export const BLEND_TILE_IDS: BlendTileId[] = ['a', 'b', 'c', 'd', 'e'];
/**
 * A custom substrate tile, `which`: 'a'-'e' each grain alone (in `blendOrder`), 'm' all mixed grain by grain (the finest
 * as the bed, each coarser one covering its share of what lies under it; the same grain in several colours = each grain
 * one or the other). All span `blendTile(b)` mm.
 */
export function drawBlendTile(ctx: Ctx, W: number, b: SubstrateBlend, which: BlendTileId) {
  const mmPx = blendTile(b) / W, r = rng(11), gs = b.grains;
  if (which !== 'm' || gs.length === 1) { const g = blendOrder(b)[Math.max(0, BLEND_TILE_IDS.indexOf(which))] ?? gs[0]; return drawGrain(ctx, W, g.grain, g.color, mmPx, r, 1); }
  const p = gs.map(g => g.share / 100);
  if (gs.every(g => g.grain === gs[0].grain)) {
    const g = gs[0].grain;
    if (g === 'mud') {
      drawMud(ctx, W, gs[0].color, r); let cum = gs[0].share;
      for (let k = 1; k < gs.length; k++) { cum += gs[k].share; drawMud(ctx, W, gs[k].color, r, cum > 0 ? gs[k].share / cum : 0); }
      return;
    }
    const ts = gs.map(x => grainLook(g, x.color, mmPx, r));
    const either = () => { const u = r(); let acc = 0; for (let k = gs.length - 1; k > 0; k--) { acc += p[k]; if (u < acc) return ts[k]; } return ts[0]; };
    let big = 0; p.forEach((v, k) => { if (v > p[big]) big = k; });
    ctx.fillStyle = ts[big].base; ctx.fillRect(0, 0, W, W);
    if (g === 'sand') return drawSand(ctx, W, { ...ts[0], shades: Array.from({ length: 48 }, () => either().shades[Math.floor(r() * 12)]) }, r, 2.2);
    return drawPebbles(ctx, W, ts[0], r, 2.6 / 0.8, either);
  }
  // fine to coarse: the finest is the bed, each coarser grain covers its share of what is under it (3D stones lie on the bed in 3D)
  const order = gs.map((g, i) => ({ g, i })).sort((a, c) => GRAIN_ORDER.indexOf(a.g.grain) - GRAIN_ORDER.indexOf(c.g.grain) || a.i - c.i);
  let cum = 0;
  order.forEach(({ g }, k) => {
    cum += g.share;
    if (k === 0) drawGrain(ctx, W, g.grain, g.color, mmPx, r, 1);
    else if (!grain3D(g.grain)) drawGrain(ctx, W, g.grain, g.color, mmPx, r, cum > 0 ? Math.min(1, g.share / cum) : 0);
  });
}

/**
 * SM1 (Nathan 2026-11-14): a two-grain blend is one continuous local ratio r(x, depth) of grain 2 (0-1), not three looks.
 * `substrateField`: a seamless 256x256 map of two standardized noises (mean 0, sd 1, bytes 128 + 40 z): R broad drifts
 * (3 and 6 cells per repeat), G local pockets (7 and 14 cells).
 */
const FIELD_N = 256;
let fieldCache: Uint8Array<ArrayBuffer> | undefined;
export function substrateField() {
  if (fieldCache) return fieldCache;
  const N = FIELD_N, r = rng(29), data = new Uint8Array(N * N * 4);
  [[[3, 1], [6, 0.5]], [[7, 1], [14, 0.3]]].forEach((octs, ch) => {
    const f = new Float32Array(N * N);
    for (const [cells, amp] of octs) {
      const g = Array.from({ length: cells * cells }, () => r());
      const at = (i: number, j: number) => g[(j % cells) * cells + (i % cells)];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const u = x / N * cells, v = y / N * cells, i = Math.floor(u), j = Math.floor(v), s = u - i, t = v - j;
        const S = s * s * (3 - 2 * s), T = t * t * (3 - 2 * t);
        f[y * N + x] += amp * ((at(i, j) * (1 - S) + at(i + 1, j) * S) * (1 - T) + (at(i, j + 1) * (1 - S) + at(i + 1, j + 1) * S) * T);
      }
    }
    let m = 0; for (const v of f) m += v; m /= f.length;
    let sd = 0; for (const v of f) sd += (v - m) ** 2; sd = Math.sqrt(sd / f.length) || 1;
    for (let k = 0; k < N * N; k++) data[k * 4 + ch] = Math.max(0, Math.min(255, Math.round(128 + 40 * (f[k] - m) / sd)));
  });
  for (let k = 0; k < N * N; k++) { data[k * 4 + 2] = 0; data[k * 4 + 3] = 255; }
  return (fieldCache = data);
}
/** The grain-by-grain threshold noise: uniform 0-1 (rank-equalized, so a ratio r puts grain 2 on a share r of the grains),
 *  smooth over 4 texels = one grain, seamless, 256x256, 64 grains per repeat. */
let fineCache: Uint8Array<ArrayBuffer> | undefined;
export function substrateFine() {
  if (fineCache) return fineCache;
  // GB3: random, but stratified in 2x2 blocks (each block holds the four quarters of 0-1 in a random order): no large knots
  // of one grain, yet no lattice or rows either (GB2's R2 lattice read as a grid)
  const N = FIELD_N, cells = 64, r = rng(53), g = new Array<number>(cells * cells);
  for (let bj = 0; bj < cells; bj += 2) for (let bi = 0; bi < cells; bi += 2) {
    const q = [0, 1, 2, 3]; for (let k = 3; k > 0; k--) { const m = Math.floor(r() * (k + 1)); [q[k], q[m]] = [q[m], q[k]]; }
    g[bj * cells + bi] = (q[0] + r()) / 4; g[bj * cells + bi + 1] = (q[1] + r()) / 4; g[(bj + 1) * cells + bi] = (q[2] + r()) / 4; g[(bj + 1) * cells + bi + 1] = (q[3] + r()) / 4;
  }
  const f = new Float32Array(N * N);
  const at = (i: number, j: number) => g[(j % cells) * cells + (i % cells)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N * cells, v = y / N * cells, i = Math.floor(u), j = Math.floor(v), s = u - i, t = v - j;
    const S = s * s * (3 - 2 * s), T = t * t * (3 - 2 * t);
    f[y * N + x] = (at(i, j) * (1 - S) + at(i + 1, j) * S) * (1 - T) + (at(i, j + 1) * (1 - S) + at(i + 1, j + 1) * S) * T;
  }
  const order = Array.from(f.keys()).sort((a, b) => f[a] - f[b]), data = new Uint8Array(N * N * 4);
  order.forEach((k, rank) => { const v = Math.round(rank / (N * N - 1) * 255); data[k * 4] = data[k * 4 + 1] = data[k * 4 + 2] = v; data[k * 4 + 3] = 255; });
  return (fineCache = data);
}
/** Grains coarse enough to be drawn as 3D stones (render/grains.ts). */
export const grain3D = (g: Grain | 'none') => g === 'gravel' || g === 'pebble';
/**
 * The blend's ratio field parameters (render/build.ts `blendGrains` draws it, render/grains.ts puts its 3D stones on it):
 * r = sigmoid(bias + amp * z), z the standardized drift + pocket noise of `substrateField`. `mix` sets how uneven r is
 * (1 = nearly even, 0 = strong drifts and pockets); `bias` is found so the floor-wide mean of r is exactly the share.
 * `scale`: field repeats per texture tile, `fine`: threshold-noise repeats per tile (one noise cell = one grain of the
 * coarser kind), `off`: the fields' starts, a hash of the blend's own values so every blend lays out differently.
 */
const ZD = 0.8, ZP = 0.6; // drift and pocket weights (sd 1 together)
const sig = (x: number) => 1 / (1 + Math.exp(-x));
const biasCache = new Map<string, number>();
/** GB1: where each further grain's own ratio field starts, as a fraction of a repeat (blendOrder places 2-4; place 1 has none, as before). */
export const GRAIN_FIELD_OFF: [number, number][] = [[0, 0], [0, 0], [0.31, 0.57], [0.67, 0.13], [0.83, 0.41]];
/** GB3: three or more grains: each grain k (0 included) has its own patch field, the same noise map started at these far-apart
 *  points of it, and its weight is exp(bias_k + amp * z_k); the ratios are the weights over their sum (a softmax), so any grain
 *  can patch anywhere, independently of the others. Two grains keep the single field. */
export const GRAIN_FIELD_OFF_N: [number, number][] = [[0, 0], [0.38, 0.62], [0.76, 0.24], [0.14, 0.86], [0.52, 0.48]];
const nBiasCache = new Map<string, number[]>();
/** Log-weight biases of grains 0..n-1 (grain 0 = 0) so each grain's floor-wide mean ratio is its share. */
function biasesN(shares: number[], amp: number): number[] {
  const key = `${shares.join(',')}:${amp}`, hit = nBiasCache.get(key); if (hit) return hit;
  const tot = shares.reduce((a, v) => a + v, 0) || 1, sh = shares.map(v => Math.max(1e-4, v / tot));
  const F = substrateField(), N = FIELD_N, b = sh.map(() => 0), zs: number[][] = [];
  for (let k = 0; k < N * N; k += 7) { const i = k % N, j = Math.floor(k / N); zs.push(sh.map((_, g) => { const ii = (i + Math.round(GRAIN_FIELD_OFF_N[g][0] * N)) % N, jj = (j + Math.round(GRAIN_FIELD_OFF_N[g][1] * N)) % N, o = (jj * N + ii) * 4; return ((F[o] - 128) * ZD + (F[o + 1] - 128) * ZP) / 40; })); }
  for (let it = 0; it < 80; it++) {
    const m = sh.map(() => 0);
    for (const z of zs) { const w = z.map((v, g) => Math.exp(b[g] + amp * v)), t = w.reduce((a, v) => a + v, 0); w.forEach((v, g) => { m[g] += v / t / zs.length; }); }
    sh.forEach((p, g) => { b[g] += Math.log(p / Math.max(m[g], 1e-9)); }); const b0 = b[0]; for (let g = 0; g < b.length; g++) b[g] -= b0;
  }
  nBiasCache.set(key, b); if (nBiasCache.size > 50) nBiasCache.delete(nBiasCache.keys().next().value!);
  return b;
}
function biasFor(p2: number, amp: number) {
  const key = `${p2}:${amp}`;
  let bias = biasCache.get(key);
  if (bias === undefined) {
    if (p2 <= 0.002) bias = -14; else if (p2 >= 0.998) bias = 14;
    else {
      const F = substrateField(), zs: number[] = []; for (let k = 0; k < FIELD_N * FIELD_N; k += 7) zs.push(((F[k * 4] - 128) * ZD + (F[k * 4 + 1] - 128) * ZP) / 40);
      let lo = -16, hi = 16;
      for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; let s = 0; for (const z of zs) s += sig(m + amp * z); if (s / zs.length < p2) lo = m; else hi = m; }
      bias = (lo + hi) / 2;
    }
    biasCache.set(key, bias);
  }
  return bias;
}
export function blendZone(b: SubstrateBlend) {
  const ord = blendOrder(b), amp = 3.8 * (1 - b.mix); // GB2: 0 at a full mix: the ratio is the share everywhere
  // `biases[k]`: grain k of `blendOrder` (k >= 1) has its mean ratio at its share; [0] is the remainder. `bias` = grain 1's (two grains: the second's, as before)
  const biases = ord.map((g, k) => (k ? biasFor(Math.min(1, Math.max(0, g.share / 100)), amp) : 0));
  if (ord.length > 2) { const bn = biasesN(ord.map(g => g.share), amp); bn.forEach((v, k) => { biases[k] = v; }); } // GB3
  const bias = ord.length > 1 ? biases[1] : -14;
  const cell = Math.max(0.5, Math.max(...b.grains.map(g => GRAIN_LOOK[g.grain].size[0] + GRAIN_LOOK[g.grain].size[1])) * 0.9); // mm: mean diameter ~ r0 + r1
  let h = 2166136261; for (const c of `${b.grains.map(g => g.color).join('')}${b.grains.slice(1).map(g => g.share).join('')}${b.mix}${b.seed ? `#${b.seed}` : ''}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const t = blendTile(b), off = [((h >>> 0) % 1000) / 1000, ((h >>> 10) % 1000) / 1000, ((h >>> 5) % 1000) / 1000, ((h >>> 15) % 1000) / 1000];
  return { bias, biases, amp, scale: t / 1000, fine: t / (64 * cell), off };
}
/** The local ratio of grain `k` of `blendOrder` (k >= 1) at floor point (x, depth) mm, as the ground shader finds it (the
 *  field sampled bilinearly with wrap, like the GPU's linear filter), before the ratios are made to fit in 1. */
function rawRatio(b: SubstrateBlend, k: number, x: number, d: number, z: ReturnType<typeof blendZone>): number {
  const N = FIELD_N, M = substrateField(), t = blendTile(b), [ex, ey] = GRAIN_FIELD_OFF[k];
  const u = ((x / t) * z.scale + z.off[0] + ex) * N - 0.5, v = ((d / t) * z.scale + z.off[1] + ey) * N - 0.5, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const at = (a: number, c: number, ch: number) => M[((((c % N) + N) % N) * N + (((a % N) + N) % N)) * 4 + ch];
  const smp = (ch: number) => (at(i, j, ch) * (1 - fu) + at(i + 1, j, ch) * fu) * (1 - fv) + (at(i, j + 1, ch) * (1 - fu) + at(i + 1, j + 1, ch) * fu) * fv;
  return sig(z.biases[k] + z.amp * (((smp(0) - 128) * ZD + (smp(1) - 128) * ZP) / 40));
}
/** The blend's local ratio of every grain (0-1, summing to 1) at floor point (x, depth) mm, in `blendOrder`: [0] the
 *  remainder; the others' own drifts and pockets, scaled down together where they would add past 1 (as the ground shader does). */
export function blendWeights(b: SubstrateBlend, x: number, d: number, z = blendZone(b)): number[] {
  const n = b.grains.length; if (n === 1) return [1];
  if (n > 2) { // GB3: a softmax of independent per-grain fields
    const N = FIELD_N, M = substrateField(), t = blendTile(b), lw = z.biases.map((bk, k) => {
      const [ex, ey] = GRAIN_FIELD_OFF_N[k], u = ((x / t) * z.scale + z.off[0] + ex) * N - 0.5, v = ((d / t) * z.scale + z.off[1] + ey) * N - 0.5, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
      const at = (a: number, c: number, ch: number) => M[((((c % N) + N) % N) * N + (((a % N) + N) % N)) * 4 + ch];
      const smp = (ch: number) => (at(i, j, ch) * (1 - fu) + at(i + 1, j, ch) * fu) * (1 - fv) + (at(i, j + 1, ch) * (1 - fu) + at(i + 1, j + 1, ch) * fu) * fv;
      return bk + z.amp * (((smp(0) - 128) * ZD + (smp(1) - 128) * ZP) / 40);
    }), mx = Math.max(...lw), e = lw.map(v => Math.exp(v - mx)), s = e.reduce((a, v) => a + v, 0);
    return e.map(v => v / s);
  }
  const w = Array.from({ length: n - 1 }, (_, k) => rawRatio(b, k + 1, x, d, z)), tot = w.reduce((a, v) => a + v, 0), k = tot > 1 ? tot : 1;
  return [1 - tot / k, ...w.map(v => v / k)];
}
/** The blend's ratio of the second grain, 0-1, at floor point (x, depth) mm (two grains; with more, `blendWeights`). */
export function blendRatio(b: SubstrateBlend, x: number, d: number, z = blendZone(b)): number {
  return blendWeights(b, x, d, z)[1] ?? 0;
}
