// Plant cards in the house style: no outlines, soft gradients, a midrib per leaf, muted natural greens.
// Each card is drawn upright with its base at the bottom-centre; the layout sizes it in mm.
import { hexA, rng } from './paint';

type Ctx = CanvasRenderingContext2D;
export type PlantType = 'stem' | 'stemred' | 'grass' | 'sword' | 'fern' | 'anubias' | 'carpet' | 'crypt';

/** Card aspect (height / width) per plant type. */
export const PLANT_ASPECT: Record<PlantType, number> = { stem: 3.2, stemred: 3.2, grass: 3.6, sword: 1.1, fern: 1.3, anubias: 0.8, carpet: 0.32, crypt: 1 };

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

function stem(ctx: Ctx, W: number, H: number, red: boolean) {
  const r = rng(red ? 21 : 17), n = 5;
  for (let s = 0; s < n; s++) {
    const bx = W * (0.3 + 0.4 * s / (n - 1)) + (r() - 0.5) * W * 0.06, tx = bx + (r() - 0.5) * W * 0.35, top = H * (0.02 + r() * 0.18);
    const at = (t: number) => [bx + (tx - bx) * t * t, H - (H - top) * t] as const;
    ctx.strokeStyle = red ? '#6a4a2a' : '#3f6a2e'; ctx.lineWidth = W * 0.018; ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const [x, y] = at(i / 20); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    for (let i = 2; i <= 28; i++) {
      const t = (i + r() * 0.6) / 28, [x, y] = at(t), tip = Math.max(0, (t - 0.55) / 0.45);
      const cols: [string, string] = red ? (tip > 0.3 ? ['#8a3a2a', '#c0604a'] : ['#4e5a2a', '#7e8a42']) : (tip > 0.7 ? ['#4a8a34', '#80b85a'] : GREENS[(i + s) % 4]);
      const l = W * (0.15 - 0.05 * t) * (0.75 + r() * 0.5), w = l * (0.18 + r() * 0.1), up = 0.25 + r() * 0.5;
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

function anubias(ctx: Ctx, W: number, H: number) {
  const r = rng(15);
  for (let i = 0; i < 7; i++) {
    const bx = W * (0.3 + 0.4 * r()), a = (i / 6 - 0.5) * 2.0, pet = H * 0.25, px = bx + Math.sin(a) * pet, py = H - Math.cos(a) * pet;
    ctx.strokeStyle = '#2e5226'; ctx.lineWidth = W * 0.015; ctx.beginPath(); ctx.moveTo(bx, H); ctx.lineTo(px, py); ctx.stroke();
    const l = H * (0.5 + r() * 0.25); leaf(ctx, px, py, a * 0.8, l, l * 0.38, ['#1e3e1c', '#3a6a32'], 0);
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

function carpet(ctx: Ctx, W: number, H: number) {
  const r = rng(19);
  for (let i = 0; i < 900; i++) {
    const x = W * (0.02 + r() * 0.96), edge = Math.min(x, W - x) / (W * 0.15), top = H * (1 - Math.min(1, edge) * (0.65 + r() * 0.3));
    const y = top + r() * (H - top), rr = W * (0.008 + r() * 0.006), [c0, c1] = GREENS[(i * 7) % 4];
    const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 0, x, y, rr); g.addColorStop(0, c1); g.addColorStop(1, c0);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.8, r() * 3, 0, 7); ctx.fill();
  }
}

export function drawPlantCard(type: PlantType, W = 512): HTMLCanvasElement {
  const c = document.createElement('canvas'), H = Math.round(W * PLANT_ASPECT[type]);
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ({ stem: () => stem(ctx, W, H, false), stemred: () => stem(ctx, W, H, true), grass: () => grass(ctx, W, H), sword: () => sword(ctx, W, H),
    fern: () => fern(ctx, W, H), anubias: () => anubias(ctx, W, H), carpet: () => carpet(ctx, W, H),
    crypt: () => crypt(ctx, W, H) })[type]();
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
};
