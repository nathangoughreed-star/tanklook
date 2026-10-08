// Plant cards in the house style: no outlines, soft gradients, a midrib per leaf, muted natural greens.
// Each card is drawn upright with its base at the bottom-centre; the layout sizes it in mm.
import { hexA, rng } from './paint';

type Ctx = CanvasRenderingContext2D;
export type PlantType = 'stem' | 'stemred' | 'grass' | 'sword' | 'fern' | 'anubias' | 'carpet';

/** Card aspect (height / width) per plant type. */
export const PLANT_ASPECT: Record<PlantType, number> = { stem: 3.2, stemred: 3.2, grass: 3.6, sword: 1.1, fern: 1.3, anubias: 0.8, carpet: 0.32 };

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
    fern: () => fern(ctx, W, H), anubias: () => anubias(ctx, W, H), carpet: () => carpet(ctx, W, H) })[type]();
  return c;
}
