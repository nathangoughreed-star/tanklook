// Plant cards in the house style: no outlines, soft gradients, a midrib per leaf, muted natural greens.
// Each card is drawn upright with its base at the bottom-centre; the layout sizes it in mm.
import { hexA, rng } from './paint';

type Ctx = CanvasRenderingContext2D;
export type PlantType = 'stem' | 'stemred' | 'grass' | 'sword' | 'fern' | 'anubias' | 'carpet' | 'crypt'
  | 'montecarlo' | 'buce' | 'rotala' | 'ludwigia' | 'balansae';

/** Card aspect (height / width) per plant type. */
export const PLANT_ASPECT: Record<PlantType, number> = { stem: 3.2, stemred: 3.2, grass: 3.6, sword: 1.1, fern: 1.3, anubias: 0.8, carpet: 0.32, crypt: 1,
  montecarlo: 0.32, buce: 0.9, rotala: 3.6, ludwigia: 3, balansae: 3 };
/** Plants that grow as a low patch (size = patch width, height = CARPET_H) rather than upright (size = height). */
export const isCarpet = (v: string) => v === 'carpet' || v === 'montecarlo';

/** Leaf from base (x, y) along angle a (radians, 0 = up, + clockwise), length l, max width w, slight curl. */
function leaf(ctx: Ctx, x: number, y: number, a: number, l: number, w: number, cols: [string, string], curl = 0, rib = true) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-w + curl * l, -l * 0.45, curl * l * 1.5, -l);
  ctx.quadraticCurveTo(w + curl * l, -l * 0.45, 0, 0); ctx.closePath();
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, cols[0]); g.addColorStop(0.5, cols[1]); g.addColorStop(1, cols[0]);
  ctx.fillStyle = g; ctx.fill();
  if (rib && l > 12) { ctx.strokeStyle = hexA(cols[1], 0.9); ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(1, w * 0.12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(curl * l * 0.6, -l * 0.5, curl * l * 1.5, -l * 0.95); ctx.strokeStyle = 'rgba(230,240,200,0.6)'; ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
}

const GREENS: [string, string][] = [['#2f5e2a', '#5f9a48'], ['#36682e', '#6aa64e'], ['#2a5428', '#558c40'], ['#3d6e30', '#78b05a']];

interface StemCard { seed: number; stalk: string; low: [string, string][]; top: [string, string][]; from: number; len: number; wid: number; nodes: number }
function stem(ctx: Ctx, W: number, H: number, red: boolean, o?: StemCard) {
  const r = rng(o ? o.seed : red ? 21 : 17), n = 5, N = o?.nodes ?? 28;
  for (let s = 0; s < n; s++) {
    const bx = W * (0.3 + 0.4 * s / (n - 1)) + (r() - 0.5) * W * 0.06, tx = bx + (r() - 0.5) * W * 0.35, top = H * (0.02 + r() * 0.18);
    const at = (t: number) => [bx + (tx - bx) * t * t, H - (H - top) * t] as const;
    ctx.strokeStyle = o ? o.stalk : red ? '#6a4a2a' : '#3f6a2e'; ctx.lineWidth = W * 0.018; ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const [x, y] = at(i / 20); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    for (let i = 2; i <= N; i++) {
      const t = (i + r() * 0.6) / N, [x, y] = at(t), tip = Math.max(0, (t - 0.55) / 0.45), pal = o && (t > o.from ? o.top : o.low);
      const cols: [string, string] = pal ? pal[(i + s) % pal.length]
        : red ? (tip > 0.3 ? ['#8a3a2a', '#c0604a'] : ['#4e5a2a', '#7e8a42']) : (tip > 0.7 ? ['#4a8a34', '#80b85a'] : GREENS[(i + s) % 4]);
      const l = W * (0.15 - 0.05 * t) * (0.75 + r() * 0.5) * (o?.len ?? 1), w = l * (0.18 + r() * 0.1) * (o?.wid ?? 1), up = 0.25 + r() * 0.5;
      // leaf pairs alternate their twist so the stem does not read as a ladder
      leaf(ctx, x, y, -(Math.PI / 2 - up) * (i % 2 ? 1 : 0.7), l, w, cols, 0.06 * (r() - 0.3));
      leaf(ctx, x, y, (Math.PI / 2 - up) * (i % 2 ? 0.7 : 1), l * (0.8 + r() * 0.3), w, cols, -0.06 * (r() - 0.3));
    }
  }
}

function grass(ctx: Ctx, W: number, H: number) {
  const r = rng(3);
  for (let i = 0; i < 13; i++) {
    const bx = W * (0.25 + 0.5 * i / 12), tx = bx + (r() - 0.5) * W * 0.8, ty = H * (0.02 + r() * 0.3), bw = W * 0.045;
    const cx = (bx + tx) / 2 + (r() - 0.5) * W * 0.4, [c0, c1] = GREENS[i % 4];
    const g = ctx.createLinearGradient(bx - bw, 0, bx + bw, 0); g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c0);
    ctx.beginPath(); ctx.moveTo(bx - bw / 2, H); ctx.quadraticCurveTo(cx - bw / 2, H * 0.55, tx, ty);
    ctx.quadraticCurveTo(cx + bw / 2, H * 0.55, bx + bw / 2, H); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  }
}

function sword(ctx: Ctx, W: number, H: number) {
  const r = rng(9), bx = W / 2, by = H;
  for (let i = 0; i < 16; i++) {
    const a = (i / 15 - 0.5) * 2.3 + (r() - 0.5) * 0.15, pet = H * (0.12 + r() * 0.1), l = H * (0.5 + r() * 0.35) - pet;
    const px = bx + Math.sin(a) * pet, py = by - Math.cos(a) * pet;
    ctx.strokeStyle = '#3a6a2c'; ctx.lineWidth = W * 0.012; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.stroke();
    leaf(ctx, px, py, a, l, l * 0.17, GREENS[i % 4], (r() - 0.5) * 0.1);
  }
}

function fern(ctx: Ctx, W: number, H: number) {
  const r = rng(13);
  ctx.strokeStyle = '#5a4a32'; ctx.lineWidth = H * 0.03; ctx.beginPath(); ctx.moveTo(W * 0.15, H * 0.97); ctx.lineTo(W * 0.85, H * 0.95); ctx.stroke();
  for (let i = 0; i < 11; i++) {
    const x = W * (0.18 + 0.64 * i / 10), a = (r() - 0.5) * 1.3, l = H * (0.55 + r() * 0.4);
    leaf(ctx, x, H * 0.96, a, l, l * 0.1, [['#244a22', '#3e7038'], ['#2a5226', '#4a7e40']][i % 2] as [string, string], (r() - 0.5) * 0.12);
  }
}

function anubias(ctx: Ctx, W: number, H: number, cols: [string, string][] = [['#1e3e1c', '#3a6a32']], n = 7, wid = 0.38, seed = 15) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const bx = W * (0.3 + 0.4 * r()), a = (i / (n - 1) - 0.5) * 2.0, pet = H * 0.25, px = bx + Math.sin(a) * pet, py = H - Math.cos(a) * pet;
    ctx.strokeStyle = '#2e5226'; ctx.lineWidth = W * 0.015; ctx.beginPath(); ctx.moveTo(bx, H); ctx.lineTo(px, py); ctx.stroke();
    const l = H * (0.5 + r() * 0.25); leaf(ctx, px, py, a * 0.8, l, l * wid, cols[i % cols.length], 0);
  }
}

// Cryptocoryne wendtii: a low rosette of wavy lance leaves on short stalks, brown-green to bronze
function crypt(ctx: Ctx, W: number, H: number) {
  const r = rng(23), cols: [string, string][] = [['#4a4a24', '#7a6a38'], ['#3e4a22', '#6a7238'], ['#5a4426', '#8a6a3e']];
  for (let i = 0; i < 12; i++) {
    const a = (i / 11 - 0.5) * 2.4 + (r() - 0.5) * 0.2, pet = H * (0.12 + r() * 0.1), l = H * (0.45 + r() * 0.35);
    const px = W / 2 + Math.sin(a) * pet, py = H - Math.cos(a) * pet;
    ctx.strokeStyle = '#5a4030'; ctx.lineWidth = W * 0.012; ctx.beginPath(); ctx.moveTo(W / 2, H); ctx.lineTo(px, py); ctx.stroke();
    leaf(ctx, px, py, a * 0.85, l, l * 0.24, cols[i % 3], (r() - 0.5) * 0.12);
  }
}

// Cryptocoryne balansae: tall narrow straps from one crown, the blade puckered all along (drawn as a wavy edge)
function balansae(ctx: Ctx, W: number, H: number) {
  const r = rng(29), cols: [string, string][] = [['#3a5a26', '#5e8040'], ['#4a5428', '#727a3e'], ['#42502a', '#6a7440']];
  for (let i = 0; i < 11; i++) {
    const bx = W * (0.4 + 0.2 * r()), a = (i / 10 - 0.5) * 0.9 + (r() - 0.5) * 0.15, l = H * (0.6 + r() * 0.38), w = W * 0.05, [c0, c1] = cols[i % 3];
    ctx.save(); ctx.translate(bx, H); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-w / 4, 0);
    for (let k = 1; k <= 40; k++) { const t = k / 40; ctx.lineTo(-w / 2 * Math.sin(Math.PI * t ** 0.3) * (1 + 0.35 * Math.sin(t * 60)), -l * t); }
    for (let k = 40; k >= 0; k--) { const t = k / 40; ctx.lineTo(w / 2 * Math.sin(Math.PI * t ** 0.3) * (1 + 0.35 * Math.sin(t * 60 + 1.5)), -l * t); }
    const g = ctx.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c0);
    ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }
}

function carpet(ctx: Ctx, W: number, H: number, cols = GREENS, seed = 19, round = 0.8) {
  const r = rng(seed);
  for (let i = 0; i < 900; i++) {
    const x = W * (0.02 + r() * 0.96), edge = Math.min(x, W - x) / (W * 0.15), top = H * (1 - Math.min(1, edge) * (0.65 + r() * 0.3));
    const y = top + r() * (H - top), rr = W * (0.008 + r() * 0.006), [c0, c1] = cols[(i * 7) % cols.length];
    const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 0, x, y, rr); g.addColorStop(0, c1); g.addColorStop(1, c0);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * round, r() * 3, 0, 7); ctx.fill();
  }
}

export function drawPlantCard(type: PlantType, W = 512): HTMLCanvasElement {
  const c = document.createElement('canvas'), H = Math.round(W * PLANT_ASPECT[type]);
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ({ stem: () => stem(ctx, W, H, false), stemred: () => stem(ctx, W, H, true), grass: () => grass(ctx, W, H), sword: () => sword(ctx, W, H),
    fern: () => fern(ctx, W, H), anubias: () => anubias(ctx, W, H), carpet: () => carpet(ctx, W, H),
    crypt: () => crypt(ctx, W, H), balansae: () => balansae(ctx, W, H),
    montecarlo: () => carpet(ctx, W, H, [['#4a9234', '#86c458'], ['#549c3a', '#92ce62'], ['#448a30', '#7cba52']], 31, 0.95),
    buce: () => anubias(ctx, W, H, [['#1c3428', '#3a5a46'], ['#262c38', '#46525e'], ['#34282c', '#5a4648']], 9, 0.3, 33),
    rotala: () => stem(ctx, W, H, false, { seed: 35, stalk: '#6a5a3a', low: [['#4a7a34', '#78a856'], ['#52823a', '#86b45e']], top: [['#b0606a', '#e0909a'], ['#b06a50', '#e09a78']], from: 0.6, len: 0.7, wid: 0.75, nodes: 40 }),
    ludwigia: () => stem(ctx, W, H, false, { seed: 37, stalk: '#6a3a2a', low: [['#5a4a2a', '#8a6a3e'], ['#5e4228', '#8e603c']], top: [['#7a2a22', '#b04a3a'], ['#6e2a2a', '#a04440']], from: 0.4, len: 1.1, wid: 2, nodes: 18 }) })[type]();
  return c;
}

// ---------- 3D plants (render/plant3d.ts) ----------
/** One kind of leaf: a curved sheet along a centreline that rises at `rise` from the vertical and bends `arch` more by the tip. */
export interface Leaf3D {
  /** Leaf length, fraction of the plant's height (min, max); the whole plant is then scaled to its height. Carpet: mm. */
  len: [number, number];
  /** Widest point / length. */
  wid: number;
  /** Width profile along the blade: sin(pi t^k)^p (k < 1 widest near the base, p small = parallel sides). */
  prof: [number, number];
  /** Angle from the vertical at the base, rad (min, max): first leaves / outer leaves get the max. */
  rise: [number, number];
  /** Extra bend toward the ground by the tip, rad. */
  arch: number;
  /** Turn of the blade about its own midrib by the tip, rad (random sign). */
  twist: number;
  /** Cross-section: + edges up (cupped), - edges down (a ridged blade); fraction of the half width. */
  fold: number;
  /** Edge ripple out of the blade's plane, fraction of the width, and ripples along the blade. */
  wave: [number, number];
  /** Bare stalk below the blade, fraction of the length. */
  pet: number;
  /** Upper side: [edge, midrib] colour pairs, one picked per leaf. */
  cols: [string, string][];
  /** Underside colour (paler, duller). */
  under: string;
  /** A pale midrib line down the middle of the upper side, optional. */
  rib?: string;
  /** Tip colour and how far down it runs (0..1 of the blade), optional. */
  tip?: [string, number];
  /** Samples along the blade and across it (3 = a midrib, 5 = room for a cup or a ripple). */
  seg: [number, number];
}
export interface Plant3D {
  /** rosette = leaves from one crown; rhizome = leaves along a creeping root; stem = upright stems with paired leaves;
   *  carpet = tiny leaflets over a patch. */
  form: 'rosette' | 'rhizome' | 'stem' | 'carpet';
  /** Leaves (rosette, rhizome), stems (stem), or leaflets per 1000 mm² of patch (carpet): min, max. */
  n: [number, number];
  /** How much it gives to the water current: 0 = stiff, 1 = limp (tall thin leaves lean and wave, short stiff ones barely). */
  sway: number;
  /** Width over which leaves / stems / crowns start, fraction of the card width. */
  spread: number;
  leaf: Leaf3D;
  /** Stalks and the rhizome. */
  stalk: string;
  /** Stem plants: leaf pairs up a stem; the top keeps getting smaller leaves. */
  nodes?: number;
  /** Stem plants: the leaf colours from this far up the stem (0..1), e.g. the red tops. */
  top?: { cols: [string, string][]; from: number };
  /** Crowns (rosette): several plants in one clump (vallisneria runners). */
  crowns?: [number, number];
}

const LEAF_GREENS: [string, string][] = GREENS;
export const PLANT3D: Partial<Record<PlantType, Plant3D>> = {
  fern: { sway: 0.3, form: 'rhizome', n: [13, 18], spread: 0.6, stalk: '#5a4a32', leaf: {
    len: [0.7, 1], wid: 0.1, prof: [0.8, 0.8], rise: [0.08, 0.6], arch: 0.4, twist: 0.5, fold: -0.25, wave: [0.1, 4], pet: 0.06,
    cols: [['#244a22', '#3e7038'], ['#2a5226', '#4a7e40']], under: '#355a30', rib: '#7aa060', tip: ['#3c7034', 0.3], seg: [10, 5] } },
  sword: { sway: 0.3, form: 'rosette', n: [16, 24], spread: 0.05, stalk: '#3a6a2c', leaf: {
    len: [0.75, 1], wid: 0.15, prof: [0.75, 0.8], rise: [0.05, 0.75], arch: 0.4, twist: 0.5, fold: -0.15, wave: [0.03, 3], pet: 0.3,
    cols: [['#3d7a2e', '#6aa64e'], ['#468a34', '#7ab85a'], ['#36702a', '#62a048']], under: '#5a8a48', rib: '#b0d098', seg: [10, 5] } },
  carpet: { sway: 0.1, form: 'carpet', n: [60, 70], spread: 1, stalk: '#3f6a2e', leaf: {
    len: [5, 7.5], wid: 0.75, prof: [0.9, 0.5], rise: [0.9, 1.5], arch: 0.1, twist: 0.3, fold: 0.2, wave: [0, 0], pet: 0,
    cols: LEAF_GREENS, under: '#5e8a48', seg: [2, 3] } },
  anubias: { sway: 0.08, form: 'rhizome', n: [10, 14], spread: 0.4, stalk: '#2e5226', leaf: {
    len: [0.6, 0.95], wid: 0.4, prof: [0.7, 0.55], rise: [0.1, 0.6], arch: 0.25, twist: 0.3, fold: 0.15, wave: [0.02, 2], pet: 0.25,
    cols: [['#1e3e1c', '#3a6a32'], ['#22441e', '#40723a']], under: '#3e6236', rib: '#5a8a4a', seg: [8, 5] } },
  grass: { sway: 1, form: 'rosette', n: [16, 24], crowns: [3, 5], spread: 0.5, stalk: '#3f6a2e', leaf: {
    len: [0.6, 1], wid: 0.035, prof: [1, 0.12], rise: [0.02, 0.3], arch: 0.5, twist: 1.5, fold: 0, wave: [0, 0], pet: 0,
    cols: LEAF_GREENS, under: '#5e8a48', seg: [12, 3] } },
  stem: { sway: 0.65, form: 'stem', n: [5, 7], nodes: 22, spread: 0.5, stalk: '#3f6a2e', top: { cols: [['#4a8a34', '#80b85a']], from: 0.8 }, leaf: {
    len: [0.11, 0.14], wid: 0.3, prof: [0.8, 0.6], rise: [0.5, 1.2], arch: 0.3, twist: 0.3, fold: -0.1, wave: [0, 0], pet: 0,
    cols: LEAF_GREENS, under: '#5e8a48', seg: [4, 3] } },
  stemred: { sway: 0.65, form: 'stem', n: [5, 7], nodes: 22, spread: 0.5, stalk: '#6a4a2a', top: { cols: [['#8a3a2a', '#c0604a'], ['#7e3426', '#b4583e']], from: 0.55 }, leaf: {
    len: [0.11, 0.14], wid: 0.3, prof: [0.8, 0.6], rise: [0.5, 1.2], arch: 0.3, twist: 0.3, fold: -0.1, wave: [0, 0], pet: 0,
    cols: [['#4e5a2a', '#7e8a42'], ['#56602e', '#86904a']], under: '#7a7a4a', seg: [4, 3] } },
  // Cryptocoryne wendtii: short stalked lance leaves with rippled edges, olive-brown to bronze, reddish underneath
  crypt: { sway: 0.15, form: 'rosette', n: [12, 18], crowns: [1, 3], spread: 0.3, stalk: '#5a4a30', leaf: {
    len: [0.75, 1], wid: 0.32, prof: [0.6, 0.8], rise: [0.15, 0.9], arch: 0.35, twist: 0.15, fold: -0.08, wave: [0.06, 5], pet: 0.28,
    cols: [['#44502a', '#72783e'], ['#4e4a2a', '#7e7040'], ['#5a462a', '#8a6a40'], ['#3e4c26', '#66763c']], under: '#84563c', rib: '#a09060', seg: [12, 5] } },
  // Monte Carlo (Micranthemum tweediei): a brighter, rounder-leaved carpet than the one above, a little denser
  montecarlo: { sway: 0.08, form: 'carpet', n: [75, 90], spread: 1, stalk: '#4a7a34', leaf: {
    len: [4, 6], wid: 0.95, prof: [1, 0.6], rise: [1, 1.5], arch: 0.08, twist: 0.3, fold: 0.25, wave: [0, 0], pet: 0,
    cols: [['#4a9234', '#86c458'], ['#549c3a', '#92ce62'], ['#448a30', '#7cba52']], under: '#6a9a50', seg: [2, 3] } },
  // Bucephalandra: a small creeping rhizome of stiff lance leaves, dark green with blue-grey and wine casts
  buce: { sway: 0.05, form: 'rhizome', n: [8, 12], spread: 0.45, stalk: '#3a3028', leaf: {
    len: [0.55, 0.9], wid: 0.28, prof: [0.7, 0.6], rise: [0.2, 0.8], arch: 0.2, twist: 0.25, fold: 0.1, wave: [0.04, 3], pet: 0.15,
    cols: [['#2a4a36', '#527a5e'], ['#323e4e', '#5e6e80'], ['#4a3438', '#7a5e62'], ['#2c4e38', '#58805e']], under: '#5e4a4e', rib: '#8aa898', seg: [8, 5] } },
  // Rotala rotundifolia: many fine stems of small narrow leaves, pink to orange at the top
  rotala: { sway: 0.7, form: 'stem', n: [7, 10], nodes: 30, spread: 0.55, stalk: '#6a5a3a', top: { cols: [['#b0606a', '#e0909a'], ['#b06a50', '#e09a78']], from: 0.6 }, leaf: {
    len: [0.07, 0.09], wid: 0.2, prof: [0.8, 0.6], rise: [0.45, 1.1], arch: 0.25, twist: 0.3, fold: -0.1, wave: [0, 0], pet: 0,
    cols: [['#4a7a34', '#78a856'], ['#52823a', '#86b45e']], under: '#8a8a5a', seg: [4, 3] } },
  // Ludwigia repens 'Rubin': fewer, thicker stems of broad oval leaves, olive-brown below, deep red at the top, red underneath
  ludwigia: { sway: 0.55, form: 'stem', n: [4, 6], nodes: 16, spread: 0.45, stalk: '#6a3a2a', top: { cols: [['#7a2a22', '#b04a3a'], ['#6e2a2a', '#a04440']], from: 0.4 }, leaf: {
    len: [0.12, 0.15], wid: 0.55, prof: [1, 0.6], rise: [0.6, 1.25], arch: 0.25, twist: 0.2, fold: 0.1, wave: [0, 0], pet: 0.05,
    cols: [['#5a4a2a', '#8a6a3e'], ['#5e4228', '#8e603c']], under: '#8a3a3a', seg: [5, 3] } },
  // Cryptocoryne balansae: tall narrow straps, the blade puckered all along, green to bronze; gives to the current
  balansae: { sway: 0.6, form: 'rosette', n: [8, 14], crowns: [1, 3], spread: 0.25, stalk: '#4a4a2a', leaf: {
    len: [0.6, 1], wid: 0.08, prof: [0.9, 0.3], rise: [0.03, 0.35], arch: 0.45, twist: 0.4, fold: -0.1, wave: [0.1, 16], pet: 0.08,
    cols: [['#3a5a26', '#5e8040'], ['#4a5428', '#727a3e'], ['#42502a', '#6a7440']], under: '#6a5a3a', seg: [28, 5] } },
};
