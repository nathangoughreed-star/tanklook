// Printed-scene tank backgrounds (the posters sold for the back glass): underwater scenes painted on a canvas, soft and
// out of focus so the fish in front stay the subject. Nathan 2026-10-28.
import { rng, type Ctx } from './paint';

export type BgScene = 'reefscene' | 'riverscene' | 'plantscene' | 'rockscene';

type Stops = [number, string][];
function vgrad(ctx: Ctx, w: number, h: number, stops: Stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [a, c] of stops) g.addColorStop(a, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
/** Slanting light shafts from the surface. */
function rays(ctx: Ctx, w: number, h: number, r: () => number, n: number, a: number) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, wd = (0.03 + r() * 0.06) * w, lean = (0.1 + r() * 0.15) * h;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + wd, 0); ctx.lineTo(x + wd - lean, h); ctx.lineTo(x - lean - wd, h); ctx.closePath(); ctx.fill();
  }
}
function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, fill: string) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 6.2832); ctx.fill();
}

export function drawScene(ctx: Ctx, kind: BgScene, w: number, h: number) {
  const r = rng(kind.length * 7919 + 13);
  if (kind === 'reefscene') {
    vgrad(ctx, w, h, [[0, '#4fb3d9'], [0.5, '#1f7fb0'], [1, '#0b3558']]);
    rays(ctx, w, h, r, 9, 0.12);
    // distant reef in haze, then nearer branching and plate corals, then sand
    for (let layer = 0; layer < 3; layer++) {
      const base = h * (0.78 + layer * 0.08), haze = 0.55 - layer * 0.2;
      const cols = [['#6a4f9c', '#c4698f', '#e08a5a'], ['#7a3f8c', '#d4527a', '#e5a03c'], ['#4a2a6a', '#b03060', '#d97b2a']][layer];
      for (let i = 0; i < w / (70 - layer * 14); i++) {
        const x = r() * w, ht = h * (0.1 + r() * 0.2) * (1 + layer * 0.35), c = cols[Math.floor(r() * 3)];
        ctx.globalAlpha = 1 - haze * (layer === 0 ? 1 : 0.3); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineCap = 'round';
        if (r() < 0.5) { // branching coral
          const br = (bx: number, by: number, ang: number, len: number, wd: number, d: number) => {
            ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(bx, by);
            const ex = bx + Math.sin(ang) * len, ey = by - Math.cos(ang) * len; ctx.lineTo(ex, ey); ctx.stroke();
            if (d > 0) { br(ex, ey, ang - 0.5 - r() * 0.3, len * 0.7, wd * 0.7, d - 1); br(ex, ey, ang + 0.5 + r() * 0.3, len * 0.7, wd * 0.7, d - 1); }
          };
          br(x, base, (r() - 0.5) * 0.3, ht * 0.45, 7 + layer * 3, 3);
        } else blob(ctx, x, base - ht * 0.3, ht * (0.5 + r() * 0.5), ht * 0.22, 0, c); // plate / mound
      }
      ctx.globalAlpha = 1;
      blob(ctx, w / 2, base + h * 0.2, w * 0.8, h * 0.18, 0, `rgba(11,53,88,${0.25 + layer * 0.1})`);
    }
    vgrad(ctx, w, h, [[0.9, 'rgba(210,190,150,0)'], [1, 'rgba(210,190,150,0.7)']]);
  } else if (kind === 'riverscene') {
    vgrad(ctx, w, h, [[0, '#9fd4cf'], [0.5, '#4d9a98'], [1, '#1e4a4e']]);
    rays(ctx, w, h, r, 7, 0.1);
    // a bed of rounded stones, larger and darker toward the front, a few out-of-focus reeds behind
    for (let i = 0; i < 18; i++) {
      const x = r() * w, ht = h * (0.25 + r() * 0.4);
      ctx.strokeStyle = `rgba(50,110,80,${0.25 + r() * 0.2})`; ctx.lineWidth = 3 + r() * 5;
      ctx.beginPath(); ctx.moveTo(x, h * 0.75); ctx.quadraticCurveTo(x + (r() - 0.5) * 60, h * 0.75 - ht * 0.5, x + (r() - 0.5) * 90, h * 0.75 - ht); ctx.stroke();
    }
    const pal = ['#8a8378', '#9a9184', '#6e6a64', '#a89f90', '#7c7466', '#5f5c58', '#9c8a70'];
    for (let row = 0; row < 5; row++) {
      const y = h * (0.72 + row * 0.07), sz = 28 + row * 18;
      for (let x = -sz; x < w + sz; x += sz * (1.2 + r() * 0.5)) {
        const c = pal[Math.floor(r() * pal.length)];
        blob(ctx, x, y + (r() - 0.5) * 14, sz * (0.6 + r() * 0.4), sz * (0.4 + r() * 0.25), (r() - 0.5) * 0.4, c);
        blob(ctx, x - sz * 0.15, y - sz * 0.12, sz * 0.35, sz * 0.18, 0, 'rgba(255,255,255,0.16)');
      }
      ctx.fillStyle = `rgba(20,50,50,${0.12})`; ctx.fillRect(0, y, w, h);
    }
  } else if (kind === 'plantscene') {
    vgrad(ctx, w, h, [[0, '#3f7a52'], [0.55, '#1f4a33'], [1, '#0d2418']]);
    rays(ctx, w, h, r, 8, 0.1);
    // dense stands of blurred stem plants and long grass blades, in three depths
    for (let layer = 0; layer < 3; layer++) {
      const n = 60 + layer * 25, greens = [['#4f8a4a', '#6fa65a', '#3b7040'], ['#3f7a3f', '#58943f', '#2c5f35'], ['#2c5f35', '#3b7a3a', '#1f4a2a']][layer];
      ctx.globalAlpha = 0.55 + layer * 0.2; ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const x = r() * w, ht = h * (0.3 + r() * 0.55 - layer * 0.08), lean = (r() - 0.5) * 70;
        ctx.strokeStyle = greens[Math.floor(r() * 3)]; ctx.lineWidth = 2 + r() * (3 + layer * 3);
        ctx.beginPath(); ctx.moveTo(x, h); ctx.bezierCurveTo(x, h - ht * 0.4, x + lean, h - ht * 0.7, x + lean * 1.4, h - ht); ctx.stroke();
        if (r() < 0.3) { blob(ctx, x + lean * 1.4, h - ht, 10 + r() * 16, 5 + r() * 8, r() * 3, greens[0]); }
      }
    }
    ctx.globalAlpha = 1;
    vgrad(ctx, w, h, [[0.85, 'rgba(40,28,18,0)'], [1, 'rgba(40,28,18,0.6)']]);
  } else {
    // rock wall: stacked grey-brown boulders in dim blue water, as for a rift-lake tank
    vgrad(ctx, w, h, [[0, '#4a6a7a'], [1, '#1a2a34']]);
    const pal = ['#6f7377', '#7d8084', '#62666b', '#76716a', '#5d6064', '#8a7f72'];
    for (let row = 0; row < 7; row++) {
      const y = h * (0.1 + row * 0.15), sz = 60 + r() * 50;
      for (let x = -sz; x < w + sz; x += sz * (1.1 + r() * 0.6)) {
        const dark = 1 - row * 0.06;
        blob(ctx, x, y + (r() - 0.5) * 20, sz * (0.7 + r() * 0.5), sz * (0.4 + r() * 0.25), (r() - 0.5) * 0.5, pal[Math.floor(r() * pal.length)]);
        blob(ctx, x, y, sz * 0.8, sz * 0.5, 0, `rgba(0,0,0,${0.25 * (1 - dark) + 0.15})`);
        blob(ctx, x - sz * 0.2, y - sz * 0.2, sz * 0.4, sz * 0.15, 0, 'rgba(255,255,255,0.1)');
      }
    }
    rays(ctx, w, h, r, 6, 0.07);
  }
  // out of focus, like a photo behind the glass: soften the whole sheet a little
  const copy = ctx.canvas.cloneNode() as HTMLCanvasElement; copy.getContext('2d')!.drawImage(ctx.canvas, 0, 0);
  ctx.clearRect(0, 0, w, h); ctx.filter = 'blur(2.5px)'; ctx.drawImage(copy, 0, 0); ctx.filter = 'none';
}
