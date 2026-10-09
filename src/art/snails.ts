// Snail cards in the house style, three views per species (same unit frame as the fish: u = 0 rear .. 1 head tip
// across W == crawling length, v = offset in widths from the card centre, + down):
//   side  - crawling on the substrate, seen from the side (card stands upright on the surface);
//   foot  - stuck to a glass pane, seen THROUGH that pane: the sole of the foot, head and tentacles, shell rim around it;
//   shell - the same snail seen from inside the tank: the back of the shell, head poking out at the front.
import { type Ctx, type Proj, type Pt, blob, body, hexA, soft } from './paint';

export type SnailView = 'side' | 'foot' | 'shell';
type Kind = 'nerite' | 'mystery' | 'ramshorn' | 'trumpet';
export interface SnailSpec { kind: Kind; shell: [string, string, string]; foot: [string, string]; mark: string }

export const SNAILS: Record<string, SnailSpec> = {
  nerite: { kind: 'nerite', shell: ['#4a4a22', '#8a8a3a', '#a8a050'], foot: ['#8a8070', '#c8bfae'], mark: '#1e1c14' },
  mystery: { kind: 'mystery', shell: ['#8a6420', '#c89a3a', '#e0bc68'], foot: ['#5a5650', '#9a948a'], mark: '#6a4818' },
  ramshorn: { kind: 'ramshorn', shell: ['#6a2a20', '#9a4a32', '#b86a4a'], foot: ['#9a3a32', '#c86a5a'], mark: '#4a1a14' },
  trumpet: { kind: 'trumpet', shell: ['#5a4a38', '#8a7a62', '#b0a080'], foot: ['#6a6258', '#a09888'], mark: '#4a2a1a' },
};

/** Card aspect (height / width) per view, and the side view's resting offset (v of the sole). */
export const SNAIL_META: Record<Kind, { side: number; glass: number }> = {
  nerite: { side: 0.62, glass: 0.8 },
  mystery: { side: 0.92, glass: 0.86 },
  ramshorn: { side: 0.86, glass: 0.62 },
  trumpet: { side: 0.5, glass: 0.34 },
};
/**
 * 3D snail (render/snail3d.ts), one generator for every shell: a logarithmic spiral, an aperture ellipse swept round
 * the coil axis, growing `grow` times per turn and sliding `drop` (share of the whorl radius) down the axis, so 0 is a
 * flat coil and a large drop a tall spire. `ap` = aperture [radial, axial] (shares of the whorl radius); `axis` =
 * where the spire points (x forward, y up, z to the side); `size` / `tall` = shell length / height at most (as on the side card), `at` = shell centre along the body,
 * `foot` = where the foot starts (all widths / card u, as on the side card); `tent` = tentacle length; `mark` = the
 * shell pattern: axial (zebra stripes along the growth lines), spiral (bands along the coil), growth (fine growth
 * lines), spots.
 */
export interface Shell3D { turns: number; grow: number; drop: number; ap: [number, number]; axis: [number, number, number]; size: number; tall: number; at: number; foot: number; tent: number; mark: 'axial' | 'spiral' | 'growth' | 'spots' }
export const SHELL3D: Record<Kind, Shell3D> = {
  nerite: { turns: 1.8, grow: 10, drop: 0.2, ap: [0.8, 0.9], axis: [-0.3, 0.35, 0.9], size: 0.8, tall: 0.42, at: 0.46, foot: 0.02, tent: 0.06, mark: 'axial' },
  mystery: { turns: 4, grow: 2.6, drop: 1, ap: [0.6, 0.7], axis: [-0.5, 0.85, 0.2], size: 0.66, tall: 0.76, at: 0.42, foot: 0.02, tent: 0.1, mark: 'spiral' },
  ramshorn: { turns: 4, grow: 1.9, drop: 0, ap: [0.4, 0.42], axis: [0, 0, 1], size: 0.7, tall: 0.7, at: 0.44, foot: 0.02, tent: 0.06, mark: 'growth' },
  trumpet: { turns: 9, grow: 1.32, drop: 7, ap: [0.45, 1.05], axis: [-0.9, 0.45, 0], size: 0.72, tall: 0.32, at: 0.35, foot: 0.32, tent: 0.06, mark: 'spots' },
};
export const shell3D = (art: string) => ({ ...SHELL3D[SNAILS[art].kind], spec: SNAILS[art] });

export const snailAspect = (art: string, view: SnailView) => SNAIL_META[SNAILS[art].kind][view === 'side' ? 'side' : 'glass'];
export const snailRest = (art: string) => SNAIL_META[SNAILS[art].kind].side / 2 - 0.015;

const ellipse = (u: number, v: number, ru: number, rv: number, n = 28): Pt[] =>
  Array.from({ length: n }, (_, i) => [u + ru * Math.cos(i / n * Math.PI * 2), v + rv * Math.sin(i / n * Math.PI * 2)] as Pt);

function tentacles(ctx: Ctx, P: Proj, W: number, u: number, v: number, len: number, spread: number, col: string, up = false) {
  ctx.strokeStyle = hexA(col, 0.9); ctx.lineWidth = 0.014 * W; ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const [x0, y0] = P(u, v), [x1, y1] = up ? P(u + len * 0.6, v - len * (0.5 + 0.25 * (s + 1))) : P(u + len, v + s * spread);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
}

/** Spiral whorl line around (u, v), turns from the outer radius r inward. */
function spiral(c: Ctx, P: Proj, W: number, u: number, v: number, r: number, turns: number, col: string, a: number, sq = 1) {
  c.strokeStyle = hexA(col, a); c.lineWidth = 0.012 * W; c.beginPath();
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, ang = t * turns * Math.PI * 2, rr = r * (1 - t * 0.92), [x, y] = P(u + rr * Math.cos(ang), v + rr * Math.sin(ang) * sq);
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.stroke();
}

function zebra(c: Ctx, P: Proj, W: number, s: SnailSpec, u0: number, u1: number, v0: number, v1: number) {
  c.strokeStyle = hexA(s.mark, 0.85); c.lineWidth = 0.028 * W;
  for (let i = 0; i < 9; i++) {
    const u = u0 + (u1 - u0) * (i + 0.5) / 9, [x0, y0] = P(u + 0.04, v0), [xm, ym] = P(u - 0.05, (v0 + v1) / 2), [x1, y1] = P(u + 0.03, v1);
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(xm, ym, x1, y1); c.stroke();
  }
}

function footSide(ctx: Ctx, P: Proj, W: number, s: SnailSpec, b: number, u0: number) {
  const pts: Pt[] = [[1, b - 0.035, 'c'], [0.96, b - 0.09], [0.86, b - 0.08], [0.5, b - 0.065], [u0 + 0.08, b - 0.045], [u0, b - 0.008, 'c'], [u0 + 0.1, b], [0.5, b], [0.92, b], [0.985, b - 0.012]];
  body(ctx, P, W, pts, b - 0.09, b, [[0, s.foot[0]], [1, s.foot[1]]], 0.02, () => {});
}

function drawSide(s: SnailSpec, ctx: Ctx, P: Proj, W: number, A: number) {
  const b = A / 2 - 0.015, sh = s.shell;
  const S3 = (top: number, bot: number, pts: Pt[], paint: (l: Ctx) => void) =>
    body(ctx, P, W, pts, top, bot, [[0, sh[2]], [0.5, sh[1]], [1, sh[0]]], 0.06, paint);
  if (s.kind === 'trumpet') {
    footSide(ctx, P, W, s, b, 0.32);
    tentacles(ctx, P, W, 0.93, b - 0.07, 0.06, 0, s.foot[0], true);
    const pts: Pt[] = [[0.7, b - 0.05], [0.66, b - 0.2], [0.42, b - 0.24], [0, b - 0.34, 'c'], [0.3, b - 0.12], [0.5, b - 0.05]];
    S3(b - 0.34, b - 0.04, pts, l => {
      l.strokeStyle = hexA(s.mark, 0.5); l.lineWidth = 0.01 * W;
      for (let i = 1; i < 7; i++) { const u = 0.66 - i * 0.09, k = u / 0.66; const [x0, y0] = P(u + 0.03, b - 0.05 - 0.12 * (1 - k) - 0.02), [x1, y1] = P(u - 0.02, b - 0.2 - 0.14 * (1 - k)); l.beginPath(); l.moveTo(x0, y0); l.lineTo(x1, y1); l.stroke(); }
      for (let i = 0; i < 18; i++) blob(l, P, W, 0.1 + (i * 0.031) % 0.55, b - 0.1 - ((i * 0.053) % 0.15), 0.012, 0.008, s.mark, 0.6);
    });
    return;
  }
  footSide(ctx, P, W, s, b, 0.02);
  tentacles(ctx, P, W, 0.93, b - 0.07, s.kind === 'mystery' ? 0.1 : 0.06, 0, s.foot[0], true);
  if (s.kind === 'nerite') {
    const pts: Pt[] = [[0.86, b - 0.05], [0.84, b - 0.24], [0.62, b - 0.42], [0.36, b - 0.44], [0.12, b - 0.32], [0.06, b - 0.08], [0.12, b - 0.04]];
    S3(b - 0.44, b - 0.04, pts, l => { zebra(l, P, W, s, 0.1, 0.84, b - 0.46, b - 0.03); soft(l, P, 0.3, 0.7, b - 0.43, b - 0.32, '#ffffff', 0.18, [0.1, 0.1], [0.02, 0.05]); });
  } else if (s.kind === 'mystery') {
    const cu = 0.44, cv = b - 0.34, r = 0.32;
    S3(cv - 0.42, cv + r, [...ellipse(0.27, cv - 0.25, 0.13, 0.14, 16)], l => spiral(l, P, W, 0.27, cv - 0.25, 0.12, 1.5, s.mark, 0.5));
    S3(cv - r, cv + r, ellipse(cu, cv, r, r), l => {
      for (const dv of [-0.12, 0.05, 0.18]) soft(l, P, 0.1, 0.8, cv + dv, cv + dv + 0.03, s.mark, 0.4, [0.05, 0.05], [0.01, 0.01]);
      spiral(l, P, W, cu - 0.12, cv - 0.12, 0.2, 0.8, s.mark, 0.35);
      soft(l, P, 0.3, 0.62, cv - 0.28, cv - 0.1, '#ffffff', 0.18, [0.1, 0.1], [0.04, 0.06]);
    });
  } else {
    const cu = 0.44, cv = b - 0.36, r = 0.34;
    S3(cv - r, cv + r, ellipse(cu, cv, r, r), l => {
      for (let i = 1; i < 5; i++) { l.strokeStyle = hexA(s.mark, 0.5); l.lineWidth = 0.014 * W; l.beginPath(); const [x, y] = P(cu + 0.03 * i, cv); l.arc(x, y, (r - i * 0.075) * W, 0, 7); l.stroke(); }
      soft(l, P, 0.25, 0.6, cv - 0.3, cv - 0.15, '#ffffff', 0.16, [0.1, 0.1], [0.04, 0.05]);
    });
  }
}

/** Glass views share an outline: the shell's footprint centred on the card, head + tentacles at u -> 1. */
const GLASS: Record<Kind, { su: number; ru: number; rv: number; fu: number; fru: number; frv: number }> = {
  nerite: { su: 0.44, ru: 0.44, rv: 0.37, fu: 0.52, fru: 0.37, frv: 0.24 },
  mystery: { su: 0.46, ru: 0.46, rv: 0.41, fu: 0.52, fru: 0.4, frv: 0.28 },
  ramshorn: { su: 0.44, ru: 0.44, rv: 0.28, fu: 0.55, fru: 0.32, frv: 0.13 },
  trumpet: { su: 0.4, ru: 0.4, rv: 0.15, fu: 0.62, fru: 0.3, frv: 0.11 },
};

function drawFoot(s: SnailSpec, ctx: Ctx, P: Proj, W: number) {
  const g = GLASS[s.kind];
  // shell rim seen past the edge of the foot (darker: its underside)
  body(ctx, P, W, s.kind === 'trumpet' ? [[0.78, -0.12], [0.4, -0.15], [0, 0, 'c'], [0.4, 0.15], [0.78, 0.12]] : ellipse(g.su, 0, g.ru, g.rv), -g.rv, g.rv,
    [[0, s.shell[0]], [0.5, s.shell[1]], [1, s.shell[0]]], 0.05, l => soft(l, P, 0, 1, -1, 1, '#000000', 0.25, [0, 0], [0, 0]));
  // head and tentacles reaching the front edge
  tentacles(ctx, P, W, g.fu + g.fru * 0.8, 0, 1 - (g.fu + g.fru * 0.8), g.frv * 0.7, s.foot[0]);
  // sole: pale, with the faint transverse waves a crawling foot shows on glass
  body(ctx, P, W, ellipse(g.fu, 0, g.fru, g.frv), -g.frv, g.frv, [[0, s.foot[0]], [0.5, s.foot[1]], [1, s.foot[0]]], 0.03, l => {
    l.strokeStyle = hexA(s.foot[0], 0.35); l.lineWidth = 0.01 * W;
    for (let i = 0; i < 7; i++) { const u = g.fu - g.fru * 0.8 + i * g.fru * 0.26, [x0, y0] = P(u, -g.frv), [xm, ym] = P(u + 0.03, 0), [x1, y1] = P(u, g.frv); l.beginPath(); l.moveTo(x0, y0); l.quadraticCurveTo(xm, ym, x1, y1); l.stroke(); }
    blob(l, P, W, g.fu + g.fru * 0.78, 0, 0.03, 0.03, '#3a2a22', 0.6); // mouth
  });
}

function drawShell(s: SnailSpec, ctx: Ctx, P: Proj, W: number) {
  const g = GLASS[s.kind];
  // foot edge peeking out around the shell, head and tentacles in front
  body(ctx, P, W, ellipse(g.fu, 0, g.fru * 1.05, g.frv * 1.15), -g.frv, g.frv, [[0, s.foot[1]], [1, s.foot[0]]], 0.02, () => {});
  tentacles(ctx, P, W, g.fu + g.fru * 0.85, 0, 1 - (g.fu + g.fru * 0.85), g.frv * 0.7, s.foot[0]);
  const pts = s.kind === 'trumpet' ? [[0.78, -0.12], [0.4, -0.15], [0, 0, 'c'], [0.4, 0.15], [0.78, 0.12]] as Pt[] : ellipse(g.su, 0, g.ru * 0.97, g.rv);
  body(ctx, P, W, pts, -g.rv, g.rv, [[0, s.shell[2]], [0.5, s.shell[1]], [1, s.shell[0]]], 0.07, l => {
    if (s.kind === 'nerite') zebra(l, P, W, s, 0.02, 0.86, -g.rv, g.rv);
    else if (s.kind === 'mystery') spiral(l, P, W, g.su - 0.08, -0.03, g.ru * 0.85, 2.2, s.mark, 0.55, g.rv / g.ru);
    else if (s.kind === 'ramshorn') {
      l.strokeStyle = hexA(s.mark, 0.45); l.lineWidth = 0.012 * W;
      for (let i = 0; i < 14; i++) { const u = 0.04 + i * 0.062, [x0, y0] = P(u, -g.rv), [x1, y1] = P(u + 0.02, g.rv); l.beginPath(); l.moveTo(x0, y0); l.lineTo(x1, y1); l.stroke(); }
    } else {
      l.strokeStyle = hexA(s.mark, 0.5); l.lineWidth = 0.012 * W;
      for (let i = 1; i < 8; i++) { const u = 0.78 - i * 0.1, h = 0.15 * (u / 0.78 + 0.1), [x0, y0] = P(u + 0.03, -h), [x1, y1] = P(u - 0.03, h); l.beginPath(); l.moveTo(x0, y0); l.lineTo(x1, y1); l.stroke(); }
    }
    soft(l, P, g.su - g.ru * 0.5, g.su + g.ru * 0.4, -g.rv * 0.7, -g.rv * 0.1, '#ffffff', 0.18, [0.08, 0.08], [0.04, 0.05]);
  });
}

export function drawSnailCard(art: string, view: SnailView, W = 512): HTMLCanvasElement {
  const s = SNAILS[art], A = snailAspect(art, view), c = document.createElement('canvas'), H = Math.round(W * A);
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const P: Proj = (u, v) => [u * W, H / 2 + v * W];
  if (view === 'side') drawSide(s, ctx, P, W, A); else if (view === 'foot') drawFoot(s, ctx, P, W); else drawShell(s, ctx, P, W);
  return c;
}
