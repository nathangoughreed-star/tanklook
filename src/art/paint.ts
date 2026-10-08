// Shared canvas painting helpers for the card art (fish, snails, plants). Style rules: see placeholder.ts.

export type Ctx = CanvasRenderingContext2D;
export type Proj = (u: number, v: number) => [number, number];
export type Pt = [number, number] | [number, number, 'c'];
export type Stops = [number, string][];

export function rng(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Closed smooth path through midpoints; points tagged 'c' are sharp corners (nose/tail tips, so calibration is exact). */
export function shape(ctx: Ctx, P: Proj, pts: Pt[]) {
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

export const FIN_A = 0.62;
export const hexA = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
/** Blank canvas the size of ctx's, for building a layer before compositing it. */
export function layer(ctx: Ctx) {
  const c = document.createElement('canvas'); c.width = ctx.canvas.width; c.height = ctx.canvas.height;
  const l = c.getContext('2d')!; l.lineJoin = 'round'; l.lineCap = 'round'; return l;
}
export function vgrad(ctx: Ctx, P: Proj, v0: number, v1: number, stops: Stops) {
  const g = ctx.createLinearGradient(0, P(0, v0)[1], 0, P(0, v1)[1]);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}
/** Soft-edged rectangle of colour; feathers (in widths) per side: fu = [tail side, nose side], fv = [top, bottom]. */
export function soft(ctx: Ctx, P: Proj, u0: number, u1: number, v0: number, v1: number, color: string, a: number,
  fu: [number, number], fv: [number, number]) {
  const t = layer(ctx), [x0, y0] = P(u0, v0), [x1, y1] = P(u1, v1), du = u1 - u0, dv = v1 - v0;
  const ramp = (g: CanvasGradient, f: [number, number], d: number, on: string, off: string) => {
    g.addColorStop(0, off); g.addColorStop(Math.min(f[0] / d, 0.5), on);
    g.addColorStop(Math.max(1 - f[1] / d, 0.5), on); g.addColorStop(1, off); return g;
  };
  t.fillStyle = ramp(t.createLinearGradient(x0, 0, x1, 0), fu, du, hexA(color, a), hexA(color, 0));
  t.fillRect(x0, y0, x1 - x0, y1 - y0);
  t.globalCompositeOperation = 'destination-in';
  t.fillStyle = ramp(t.createLinearGradient(0, y0, 0, y1), fv, dv, '#000', 'rgba(0,0,0,0)');
  t.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.drawImage(t.canvas, 0, 0);
}
/** Soft elliptical spot, radii in widths. */
export function blob(ctx: Ctx, P: Proj, W: number, u: number, v: number, ru: number, rv: number, color: string, a: number) {
  const [x, y] = P(u, v); ctx.save(); ctx.translate(x, y); ctx.scale(ru * W, rv * W);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, hexA(color, a)); g.addColorStop(0.5, hexA(color, a * 0.7)); g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}

/** Fin membrane: translucent tint plus fine rays fanning from root to the outline. */
export function fin(ctx: Ctx, P: Proj, W: number, pts: Pt[], root: [number, number], tint: string, ray: string,
  { a = FIN_A, rays = 14, extra }: { a?: number; rays?: number; extra?: (c: Ctx) => void } = {}) {
  ctx.save(); shape(ctx, P, pts); ctx.fillStyle = hexA(tint, a); ctx.fill(); ctx.clip();
  extra?.(ctx);
  const [rx, ry] = P(root[0], root[1]); ctx.strokeStyle = hexA(ray, Math.min(0.5, a * 0.6)); ctx.lineWidth = 0.0022 * W;
  for (let i = 0; i < rays; i++) {
    const t = (i + 0.5) / rays * (pts.length - 1), k = Math.floor(t), f = t - k, p0 = pts[k], p1 = pts[Math.min(k + 1, pts.length - 1)];
    const [ex, ey] = P(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f);
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + (ex - rx) * 1.2, ry + (ey - ry) * 1.2); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Opaque body on its own layer: countershading gradient (stops from v=top to v=bot), markings painted inside it
 * (source-atop, so they never change the silhouette), then a soft inner rim and a thin darker edge that round it.
 */
export function body(ctx: Ctx, P: Proj, W: number, pts: Pt[], top: number, bot: number, shade: Stops, rim: number, paint: (l: Ctx) => void) {
  const l = layer(ctx);
  shape(l, P, pts); l.fillStyle = vgrad(l, P, top, bot, shade); l.fill();
  l.globalCompositeOperation = 'source-atop';
  paint(l);
  shape(l, P, pts);
  for (const k of [1, 0.7, 0.45, 0.25]) {
    l.lineWidth = rim * W * k; l.strokeStyle = vgrad(l, P, top, bot, [[0, 'rgba(14,16,12,0.08)'], [1, 'rgba(14,16,12,0.035)']]); l.stroke();
  }
  l.lineWidth = 0.005 * W; l.strokeStyle = 'rgba(14,16,12,0.2)'; l.stroke();
  ctx.drawImage(l.canvas, 0, 0);
}
/** Gill-cover line: a faint arc bulging toward the tail. */
export function gill(ctx: Ctx, P: Proj, W: number, u: number, v0: number, v1: number, bulge: number) {
  const [x0, y0] = P(u, v0), [x1, y1] = P(u, v1), [cx, cy] = P(u - bulge, (v0 + v1) / 2);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.strokeStyle = 'rgba(20,20,16,0.16)'; ctx.lineWidth = 0.008 * W; ctx.stroke();
}
/** Small realistic eye: coloured/metallic iris (light top to dark rim), dark pupil set forward, tiny catchlight. */
export function eye(ctx: Ctx, P: Proj, W: number, u: number, v: number, r: number, iris: [string, string]) {
  const [x, y] = P(u, v), R = r * W, g = ctx.createRadialGradient(x, y - R * 0.35, R * 0.1, x, y, R);
  g.addColorStop(0, iris[0]); g.addColorStop(1, iris[1]);
  ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = R * 0.12; ctx.strokeStyle = 'rgba(18,18,16,0.5)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(x + R * 0.08, y, R * 0.56, 0, 7); ctx.fillStyle = '#0b0c0d'; ctx.fill();
  ctx.beginPath(); ctx.arc(x - R * 0.12, y - R * 0.24, R * 0.14, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
}
