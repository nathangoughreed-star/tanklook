// Parametric fish painter: one shaded "body plan" (profile, tail, fins, markings, eye) drawn in the house style
// (see placeholder.ts), so the species list can grow without hand-drawing each fish. Same unit frame as the
// hand-drawn art: u = 0 (tail tip) .. 1 (nose tip) across the card width W (== adult TL), v = offset in widths
// from the card's centre line, + down. Tail and nose tips are sharp corners at u = 0 and u = 1 exactly.
import { type Ctx, type Proj, type Pt, blob, body, eye, fin, gill, hexA, rng, scales, shape, soft, style, wavyBand } from './paint';

type Tail = 'fork' | 'notch' | 'round' | 'veil' | 'lyre' | 'double' | 'sword';
type FinShape = 'tri' | 'round' | 'sail' | 'long' | 'swept';
/** A fin along the back (dorsal) or belly (anal) from u0 (rear) to u1 (front), h tall (widths). */
export interface FinSpec { u0: number; u1: number; h: number; shape?: FinShape; tint?: string; a?: number; edge?: string }
type Mark =
  | { k: 'band'; u0: number; u1: number; v0: number; v1: number; c: string; a?: number; f?: number; wave?: number }
  | { k: 'bars'; us: number[]; w: number; c: string; a?: number }
  | { k: 'spots'; n: number; u0: number; u1: number; v0: number; v1: number; r: number; c: string; a?: number }
  | { k: 'blob'; u: number; v: number; ru: number; rv: number; c: string; a?: number }
  | { k: 'poly'; pts: [number, number][]; c: string; a?: number };

export interface Plan {
  depth: number;      // max body depth, widths
  pedU: number;       // where the body meets the tail (caudal fin length)
  ped: number;        // peduncle half-depth
  peak?: number;      // 0..1 along the body (tail->nose) where it is deepest
  back?: number;      // share of the depth above the centre line (0.5 symmetric; > 0.5 flat-bellied bottom fish)
  snout?: number;     // 0 pointed .. 1 blunt
  mouth?: number;     // nose offset (+ down, - up)
  shade: [string, string, string]; // back, flank, belly
  tail: { type: Tail; h: number; tint?: string; a?: number; edge?: string };
  dorsal?: FinSpec; anal?: FinSpec; adipose?: boolean;
  pelvic?: { u: number; len: number; tint?: string; thread?: boolean; angle?: number }; // angle: degrees below horizontal (thread)
  fin: string;        // default membrane tint
  ray?: string;
  marks?: Mark[];     // painted inside the body
  finMarks?: Mark[];  // painted inside the dorsal, anal and tail fins
  eye: { r: number; iris: [string, string]; u?: number; dv?: number; up?: number }; // up (3D): 0 on the flank .. 1 on top of the head
  barbels?: number;   // barbel length (widths); bottom fish
  bristles?: boolean; // bristlenose snout
  rim?: number;
  thick?: number;     // 3D: max body thickness / max body depth (laterally compressed < 0.5 < rounder)
  // 3D body shape (all optional): flat belly 0..1; cross-section widest low (+) or high (-); thickness at the peduncle
  // (share, default 0.55); head this share narrower than the trunk from the gill cover on; thickness kept to the snout
  // tip (share of max: a flat, wide snout)
  belly?: number; wide?: number; pedT?: number; step?: number; noseW?: number;
  angular?: number;   // 0 curved outline .. 1 straight back and belly lines meeting at a rounded apex (diamond: angelfish)
  scale?: number;     // scale size (widths) for the scale net; 0 = none (default 0.024)
  plates?: boolean;   // armoured (corydoras): two rows of bony plates instead of scales
}

export function profile(p: Plan) {
  const tp = p.peak ?? 0.55, back = p.back ?? 0.5, sn = p.snout ?? 0.5, mouth = p.mouth ?? 0;
  return (u: number): [number, number] => {
    const t = Math.min(1, Math.max(0, (u - p.pedU) / (1 - p.pedU)));
    let hh: number, vc = 0;
    if (t <= tp) hh = 2 * p.ped + (p.depth - 2 * p.ped) * Math.sin(t / tp * Math.PI / 2) ** 1.3;
    else {
      const s = (t - tp) / (1 - tp);
      hh = p.depth * Math.pow(Math.max(0, 1 - Math.pow(s, 1.6 + sn * 1.4)), 1 - 0.5 * sn); vc = mouth * s * s;
    }
    if (p.angular) {
      // straight lines from the peduncle and from the nose, joined by a smooth minimum so the apex is rounded
      const r0 = 2 * p.ped, l1 = r0 + (p.depth - r0) * t / tp, l2 = p.depth * (1 - t) / (1 - tp), k = 0.3 * p.depth;
      const h = Math.max(k - Math.abs(l1 - l2), 0) / k, line = (Math.min(l1, l2) - h * h * k / 4) * p.depth / (p.depth - k / 4);
      hh += (Math.min(line, p.depth) - hh) * p.angular;
    }
    return [vc - hh * back, vc + hh * (1 - back)];
  };
}

function finPts(f: FinSpec, base: (u: number) => number, sg: number): Pt[] {
  const d = f.u1 - f.u0, b = (u: number) => base(u) - sg * 0.015, h = f.h, bm = b((f.u0 + f.u1) / 2), V = (k: number) => bm + sg * h * k;
  switch (f.shape ?? 'tri') {
    case 'round': return [[f.u1, b(f.u1)], [f.u1 - d * 0.12, V(0.85)], [f.u0 + d * 0.45, V(1)], [f.u0 - d * 0.08, V(0.75)], [f.u0 - d * 0.06, b(f.u0)]];
    case 'sail': return [[f.u1, b(f.u1)], [f.u1 - d * 0.05, V(1), 'c'], [f.u0 + d * 0.25, V(0.78)], [f.u0 - d * 0.06, V(0.5)], [f.u0 - d * 0.06, b(f.u0)]];
    // tall sail swept back to a high pointed tip (angelfish)
    case 'swept': return [[f.u1, b(f.u1), 'c'], [f.u0 + d * 0.3, V(1), 'c'], [f.u0 + d * 0.06, V(0.55), 'c'], [f.u0 - d * 0.12, b(f.u0 - d * 0.12), 'c']]; // straight edges
    case 'long': return [[f.u1, b(f.u1)], [f.u1 - d * 0.25, V(0.65)], [f.u0, V(1)], [f.u0 - d * 0.3, V(0.9)], [f.u0 - d * 0.28, b(f.u0)]];
    default: return [[f.u1, b(f.u1)], [f.u1 - d * 0.35, V(1), 'c'], [f.u0, V(0.3)], [f.u0 - 0.01, b(f.u0)]];
  }
}

function tailPts(t: Tail, pu: number, c: number, pd: number, th: number): Pt[] {
  const e = pu + 0.03;
  switch (t) {
    case 'fork': return [[e, c - pd], [pu * 0.55, c - th * 0.6], [0, c - th, 'c'], [pu * 0.42, c - th * 0.12], [pu * 0.5, c], [pu * 0.42, c + th * 0.12], [0, c + th, 'c'], [pu * 0.55, c + th * 0.6], [e, c + pd]];
    case 'lyre': return [[e, c - pd], [pu * 0.6, c - th * 0.5], [0, c - th, 'c'], [pu * 0.7, c - th * 0.15], [pu * 0.8, c], [pu * 0.7, c + th * 0.15], [0, c + th, 'c'], [pu * 0.6, c + th * 0.5], [e, c + pd]];
    case 'notch': return [[e, c - pd], [pu * 0.4, c - th * 0.85], [0, c - th, 'c'], [pu * 0.12, c], [0, c + th, 'c'], [pu * 0.4, c + th * 0.85], [e, c + pd]];
    case 'round': return [[e, c - pd], [pu * 0.65, c - th * 0.95], [pu * 0.18, c - th * 0.85], [0, c - th * 0.35], [0, c, 'c'], [0, c + th * 0.35], [pu * 0.18, c + th * 0.85], [pu * 0.65, c + th * 0.95], [e, c + pd]];
    case 'veil': return [[e, c - pd], [pu * 0.7, c - th * 0.9], [pu * 0.25, c - th * 0.95], [0.02, c - th * 0.4], [0, c + th * 0.1, 'c'], [0.03, c + th * 0.6], [pu * 0.3, c + th], [pu * 0.75, c + th * 0.8], [e, c + pd]];
    case 'double': return [[e, c - pd], [pu * 0.5, c - th * 0.7], [0, c - th * 0.55, 'c'], [pu * 0.35, c + th * 0.05], [0, c + th * 0.95, 'c'], [pu * 0.55, c + th * 0.7], [e, c + pd]];
    case 'sword': return [[e, c - pd], [pu * 0.45, c - th * 0.75], [pu * 0.3, c - th * 0.8, 'c'], [pu * 0.32, c + th * 0.2], [0, c + th * 0.55, 'c'], [pu * 0.35, c + th * 0.55], [pu * 0.5, c + th * 0.7], [e, c + pd]];
  }
}

/** Every outline the plan draws, for extents. */
function geometry(p: Plan) {
  const prof = profile(p), n = 16, top: Pt[] = [], bot: Pt[] = [];
  for (let i = 1; i < n; i++) { const u = 1 - (1 - p.pedU) * i / (n - 1); const [a, b] = prof(u); top.push([u, a]); bot.unshift([u, b]); }
  const bodyPts: Pt[] = [[1, p.mouth ?? 0, 'c'], ...top, ...bot];
  const [pt, pb] = prof(p.pedU), c = (pt + pb) / 2, pd = (pb - pt) / 2;
  const tail = tailPts(p.tail.type, p.pedU, c, pd, p.tail.h);
  const dorsal = p.dorsal && finPts(p.dorsal, u => prof(u)[0], -1);
  const anal = p.anal && finPts(p.anal, u => prof(u)[1], 1);
  let pelvic: Pt[] | undefined;
  if (p.pelvic) {
    const { u, len } = p.pelvic, b = prof(u)[1] - 0.01;
    // a thread hangs back at ~27 degrees, or steeper (`angle`): its points turn about the root
    const rot = ((p.pelvic.angle ?? 26.6) - 26.6) * Math.PI / 180, cr = Math.cos(rot), sr = Math.sin(rot);
    const R = (dx: number, dy: number, c?: 'c'): Pt => { const x = -dx * len, y = dy * len, qu = u + x * cr + y * sr, qv = b - x * sr + y * cr; return c ? [qu, qv, c] : [qu, qv]; };
    pelvic = p.pelvic.thread ? [[u + 0.01, b], R(0.55, 0.35), R(1, 0.5, 'c'), R(0.5, 0.3), [u - 0.01, b]]
      : [[u + 0.02, b], [u - len * 0.6, b + len * 0.75, 'c'], [u - len * 0.35, b + len * 0.25], [u - 0.03, b]];
  }
  return { prof, bodyPts, tail, dorsal, anal, pelvic, c };
}

/** Card aspect (height / width) and resting offset: v of the lowest body/pelvic point (bottom dwellers sit on it). */
export function planMeta(p: Plan) {
  const g = geometry(p), all = [g.bodyPts, g.tail, g.dorsal ?? [], g.anal ?? [], g.pelvic ?? []].flat();
  const ext = Math.max(...all.map(q => Math.abs(q[1])));
  const low = Math.max(...g.bodyPts.map(q => q[1]), ...(g.pelvic ?? []).map(q => q[1]));
  return { aspect: +(2 * ext + 0.03).toFixed(3), rest: +low.toFixed(3) };
}

/** Corydoras armour: two rows of plates meeting at the lateral line, each plate edge a faint curved seam. */
function plates(l: Ctx, P: Proj, W: number, p: Plan, prof: (u: number) => [number, number], head: number) {
  l.save(); l.lineWidth = Math.max(1, 0.003 * W);
  for (let u = p.pedU + 0.02; u < head - 0.02; u += 0.038) {
    const [t0, b0] = prof(u), t = t0 + (b0 - t0) * 0.16, b = b0 - (b0 - t0) * 0.14, mid = t0 + (b0 - t0) * 0.48;
    for (const [v0, v1] of [[t, mid], [mid, b]] as const) {
      const [x0, y0] = P(u, v0), [x1, y1] = P(u, v1), [cx, cy] = P(u - 0.018, (v0 + v1) / 2);
      l.beginPath(); l.moveTo(x0, y0); l.quadraticCurveTo(cx, cy, x1, y1); l.strokeStyle = 'rgba(14,16,10,0.09)'; l.stroke();
      l.lineWidth = Math.max(2, 0.008 * W); l.beginPath(); l.moveTo(x0 + 0.006 * W, y0); l.quadraticCurveTo(cx + 0.006 * W, cy, x1 + 0.006 * W, y1); l.strokeStyle = 'rgba(255,250,230,0.07)'; l.stroke(); l.lineWidth = Math.max(1, 0.003 * W);
    }
  }
  const [a0, b0] = prof(p.pedU), [a1, b1] = prof(head), [x0, y0] = P(p.pedU, (a0 + b0) / 2), [x1, y1] = P(head, a1 + (b1 - a1) * 0.48);
  l.beginPath(); l.moveTo(x0, y0); l.lineTo(x1, y1); l.strokeStyle = 'rgba(14,16,10,0.14)'; l.stroke();
  l.restore();
}

function paintMarks(c: Ctx, P: Proj, W: number, marks: Mark[] | undefined, seed: number) {
  const r = rng(seed);
  for (const m of marks ?? []) {
    if (m.k === 'band' && m.wave) wavyBand(c, P, m.u0, m.u1, m.v0, m.v1, m.wave, m.c, m.a ?? 0.9, seed + Math.round(m.v0 * 1000));
    else if (m.k === 'band') { const f = m.f ?? 0.02; soft(c, P, m.u0, m.u1, m.v0, m.v1, m.c, m.a ?? 0.9, [f, f], [f * 0.6, f * 0.6]); }
    else if (m.k === 'bars') for (const u of m.us) soft(c, P, u - m.w / 2, u + m.w / 2, -1, 1, m.c, m.a ?? 0.85, [m.w * 0.3, m.w * 0.3], [0, 0]);
    else if (m.k === 'blob') blob(c, P, W, m.u, m.v, m.ru, m.rv, m.c, m.a ?? 0.9);
    else if (m.k === 'poly') { shape(c, P, m.pts); c.fillStyle = hexA(m.c, m.a ?? 0.9); c.fill(); }
    else for (let i = 0; i < m.n; i++) {
      const rr = m.r * (0.7 + r() * 0.6);
      blob(c, P, W, m.u0 + r() * (m.u1 - m.u0), m.v0 + r() * (m.v1 - m.v0), rr, rr, m.c, m.a ?? 0.85);
    }
  }
}

const mixHex = (a: string, b: string, k: number) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
export interface PairedFin { kind: 'pelvic' | 'pectoral'; pts: Pt[]; root: [number, number]; tint: string; a?: number; rays: number }
/** The paired fins (pelvic if the plan has one, then the pectoral), in card coordinates. */
export function pairedFins(p: Plan): PairedFin[] {
  const g = geometry(p), out: PairedFin[] = [];
  if (g.pelvic) out.push({ kind: 'pelvic', pts: g.pelvic, root: [p.pelvic!.u, g.prof(p.pelvic!.u)[1]], tint: p.pelvic!.tint ?? p.fin, a: p.pelvic!.thread ? 0.85 : undefined, rays: p.pelvic!.thread ? 0 : 5 });
  const pu = 1 - (1 - p.pedU) * 0.24, [pt, pb] = g.prof(pu), pm = pt + (pb - pt) * 0.62, pl = Math.min((1 - p.pedU) * 0.17, p.depth * 0.75); // slender fish (loaches) keep small pectorals
  out.push({ kind: 'pectoral', pts: [[pu, pm - 0.01], [pu - pl, pm + pl * 0.3, 'c'], [pu - pl * 0.7, pm + pl * 0.55], [pu + 0.005, pm + 0.015]], root: [pu, pm], tint: mixHex(p.fin, p.shade[1], 0.35), a: 0.3, rays: 5 }); // pectoral takes on some flank colour: it lies against the body
  return out;
}
export function drawPairedFin(f: PairedFin, ctx: Ctx, P: Proj, W: number, ray = '#7d7a70') {
  fin(ctx, P, W, f.pts, f.root, f.tint, ray, { a: f.a, rays: f.rays });
  if (f.kind === 'pectoral' && f.a !== undefined) return; // the card's faint fan over the flank gets no spine
  // leading spine / first ray: the stiff front edge that gives a fin its structure
  const tip = f.pts.find(q => q[2] === 'c') ?? f.pts[1], [x0, y0] = P(f.root[0], f.root[1]), [x1, y1] = P(tip[0], tip[1]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = hexA(ray, f.kind === 'pectoral' ? 0.45 : 0.75); ctx.lineWidth = 0.006 * W; ctx.stroke();
}

/** Eye centre (u, v), radius and iris colours. */
export function eyeSpot(p: Plan) {
  const u = p.eye.u ?? 1 - (1 - p.pedU) * 0.09, [et, eb] = profile(p)(u);
  return { u, v: et + (eb - et) * (0.38 + (p.eye.dv ?? 0)), r: p.eye.r, iris: p.eye.iris };
}

export function drawPlan(p: Plan, ctx: Ctx, P: Proj, W: number) {
  const g = geometry(p), ray = p.ray ?? '#7d7a70';
  const finOpts = (f: { tint?: string; a?: number; edge?: string } | undefined, root: [number, number], pts: Pt[], seed: number) =>
    [pts, root, f?.tint ?? p.fin, ray, {
      a: f?.a, rays: 14, extra: (c: Ctx) => {
        paintMarks(c, P, W, p.finMarks, seed);
        if (f?.edge) { shape(c, P, pts); c.strokeStyle = hexA(f.edge, 0.55); c.lineWidth = 0.014 * W; c.stroke(); }
      },
    }] as const;
  const draw = (pts: Pt[] | undefined, root: [number, number], f: { tint?: string; a?: number; edge?: string } | undefined, seed: number) => {
    if (!pts) return; const [a, b, c2, d, e] = finOpts(f, root, pts, seed); fin(ctx, P, W, a, b, c2, d, e);
  };
  draw(g.tail, [p.pedU + 0.02, g.c], p.tail, 11);
  if (p.dorsal) draw(g.dorsal, [(p.dorsal.u0 + p.dorsal.u1) / 2, g.prof((p.dorsal.u0 + p.dorsal.u1) / 2)[0] + 0.02], p.dorsal, 12);
  if (p.anal) draw(g.anal, [(p.anal.u0 + p.anal.u1) / 2, g.prof((p.anal.u0 + p.anal.u1) / 2)[1] - 0.02], p.anal, 13);
  const paired = pairedFins(p);
  if (style.paired && paired[0]?.kind === 'pelvic') drawPairedFin(paired[0], ctx, P, W, ray);
  if (p.adipose) {
    const u = p.pedU + 0.07, b = g.prof(u)[0];
    fin(ctx, P, W, [[u + 0.03, b + 0.01], [u, b - 0.035, 'c'], [u - 0.03, b + 0.01]], [u, b], p.fin, ray, { rays: 0 });
  }
  const [t0, b0] = [Math.min(...g.bodyPts.map(q => q[1])), Math.max(...g.bodyPts.map(q => q[1]))];
  body(ctx, P, W, g.bodyPts, t0, b0, [[0, p.shade[0]], [0.4, p.shade[1]], [0.65, p.shade[1]], [1, p.shade[2]]], p.rim ?? 0.035, l => {
    paintMarks(l, P, W, p.marks, 7);
    const gu = 1 - (1 - p.pedU) * 0.2, [gt, gb] = g.prof(gu);
    if (style.features) gill(l, P, W, gu, gt + (gb - gt) * 0.2, gt + (gb - gt) * 0.85, 0.02);
  }, l => {
    const head = 1 - (1 - p.pedU) * 0.2;
    if (p.plates) plates(l, P, W, p, g.prof, head);
    else if ((p.scale ?? 0.024) > 0) scales(l, P, W, p.pedU - 0.02, head, p.scale ?? 0.024);
    if (!style.features) return;
    // mouth line: a short dark cleft back from the snout tip
    const m0 = p.mouth ?? 0, [mx, my] = P(1 - 0.004, m0 + 0.004), [ex, ey] = P(1 - (1 - p.pedU) * 0.045, m0 + 0.012);
    l.beginPath(); l.moveTo(mx, my); l.quadraticCurveTo((mx + ex) / 2, ey, ex, ey);
    l.strokeStyle = 'rgba(18,16,12,0.45)'; l.lineWidth = 0.004 * W; l.stroke();
  });
  // pectoral fin: faint fan behind the gill cover
  if (style.paired) drawPairedFin(paired[paired.length - 1], ctx, P, W, ray);
  if (p.barbels && style.paired) { // style.paired off = painted for the 3D pipeline, which has its own barbels
    const nb = g.prof(0.975)[1]; ctx.strokeStyle = hexA('#8b7b63', 0.9); ctx.lineWidth = 0.005 * W;
    for (const k of [0, 1]) {
      const [x0, y0] = P(0.985 - k * 0.012, nb - 0.004), [x1, y1] = P(0.96 - k * 0.02 - p.barbels * 0.3, nb + p.barbels);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0, (y0 + y1) / 2, x1, y1); ctx.stroke();
    }
  }
  if (p.bristles) {
    const r = rng(5); ctx.strokeStyle = hexA('#5a5446', 0.9); ctx.lineWidth = 0.006 * W;
    for (let i = 0; i < 6; i++) {
      const u = 0.93 + r() * 0.05, [tt] = g.prof(u), [x, y] = P(u, tt + 0.01);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.3) * 0.01 * W, y - (0.012 + r() * 0.01) * W); ctx.stroke();
    }
  }
  const e = eyeSpot(p);
  if (style.features) eye(ctx, P, W, e.u, e.v, e.r, e.iris);
}

// ---------- Shrimp (custom: segmented, rostrum forward, legs below, antennae swept back) ----------
interface ShrimpSpec { body: [string, string]; dots?: string; a?: number }
function drawShrimp(s: ShrimpSpec, ctx: Ctx, P: Proj, W: number) {
  const leg = hexA(s.body[0], 0.75);
  ctx.strokeStyle = leg; ctx.lineWidth = 0.008 * W;
  for (let i = 0; i < 5; i++) { const u = 0.72 - i * 0.07, [x, y] = P(u, 0.05), [x2, y2] = P(u - 0.03, 0.16); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); }
  for (let i = 0; i < 4; i++) { const u = 0.42 - i * 0.07, [x, y] = P(u, 0.07), [x2, y2] = P(u - 0.02, 0.12); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); }
  fin(ctx, P, W, [[0.16, -0.03], [0.02, -0.075], [0, -0.06, 'c'], [0.03, 0.0], [0, 0.07, 'c'], [0.03, 0.08], [0.16, 0.05]], [0.14, 0.01], s.body[0], s.body[0], { a: 0.8, rays: 6 });
  const pts: Pt[] = [[1, -0.075, 'c'], [0.86, -0.07], [0.78, -0.11], [0.6, -0.125], [0.42, -0.12], [0.28, -0.09], [0.16, -0.05], [0.13, 0.0],
    [0.16, 0.05], [0.28, 0.07], [0.42, 0.08], [0.6, 0.075], [0.75, 0.065], [0.84, 0.04], [0.86, -0.02]];
  body(ctx, P, W, pts, -0.125, 0.08, [[0, s.body[0]], [0.6, s.body[1]], [1, s.body[1]]], 0.03, l => {
    for (let i = 0; i < 5; i++) { const u = 0.62 - i * 0.09, [x, y0] = P(u, -0.13), [, y1] = P(u, 0.08); l.strokeStyle = 'rgba(30,10,10,0.14)'; l.lineWidth = 0.006 * W; l.beginPath(); l.moveTo(x, y0); l.quadraticCurveTo(x - 0.02 * W, (y0 + y1) / 2, x, y1); l.stroke(); }
    if (s.dots) for (let i = 0; i < 14; i++) blob(l, P, W, 0.2 + i * 0.045, 0.02 + (i % 2) * 0.012, 0.008, 0.005, s.dots, 0.8);
    soft(l, P, 0.2, 0.86, -0.13, -0.09, '#ffffff', 0.18, [0.05, 0.05], [0.01, 0.02]);
  });
  ctx.strokeStyle = hexA(s.body[0], 0.8); ctx.lineWidth = 0.004 * W;
  for (const k of [0, 1]) { const [x0, y0] = P(0.88, -0.07), [x1, y1] = P(0.3 - k * 0.12, -0.17 + k * 0.02); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(...P(0.75, -0.2), x1, y1); ctx.stroke(); }
  eye(ctx, P, W, 0.86, -0.06, 0.018, ['#3a2a22', '#120c0a']);
}

const N = '#b9b8ad'; // neutral fin tint
export const PLANS: Record<string, Plan> = {
  cardinal: { thick: 0.42, depth: 0.22, pedU: 0.17, ped: 0.035, peak: 0.55, snout: 0.35, shade: ['#4d5443', '#9aa39a', '#c7c4bc'], tail: { type: 'fork', h: 0.14 }, fin: '#b7c0bd',
    dorsal: { u0: 0.47, u1: 0.6, h: 0.07 }, anal: { u0: 0.27, u1: 0.48, h: 0.05 }, adipose: true, pelvic: { u: 0.62, len: 0.06 },
    marks: [{ k: 'band', u0: 0.17, u1: 0.95, v0: -0.005, v1: 0.2, c: '#c02f38', a: 0.95, f: 0.012 }, { k: 'band', u0: 0.22, u1: 0.93, v0: -0.065, v1: -0.008, c: '#2aa9e0', a: 1, f: 0.01 }],
    eye: { r: 0.026, iris: ['#b9ccd2', '#4c5c63'] } },
  ember: { thick: 0.42, depth: 0.26, pedU: 0.2, ped: 0.04, peak: 0.5, snout: 0.4, shade: ['#b0522e', '#d9743e', '#e89a6a'], tail: { type: 'fork', h: 0.15, tint: '#d07a4e' }, fin: '#d58a5c',
    dorsal: { u0: 0.47, u1: 0.6, h: 0.08 }, anal: { u0: 0.28, u1: 0.5, h: 0.06 }, adipose: true, pelvic: { u: 0.6, len: 0.06 },
    marks: [{ k: 'band', u0: 0.4, u1: 0.95, v0: 0.04, v1: 0.15, c: '#f2c7a6', a: 0.5, f: 0.03 }], eye: { r: 0.03, iris: ['#d8a070', '#5b3020'] } },
  rummynose: { thick: 0.42, depth: 0.21, pedU: 0.2, ped: 0.035, peak: 0.55, snout: 0.35, shade: ['#8b927f', '#c9cdc2', '#e2e1da'], tail: { type: 'fork', h: 0.14 }, fin: '#c8ccc5',
    dorsal: { u0: 0.48, u1: 0.6, h: 0.07 }, anal: { u0: 0.27, u1: 0.48, h: 0.05 }, adipose: true, pelvic: { u: 0.62, len: 0.05 },
    marks: [{ k: 'blob', u: 0.93, v: -0.01, ru: 0.09, rv: 0.08, c: '#c4303a', a: 0.95 }],
    finMarks: [{ k: 'bars', us: [0.04, 0.12], w: 0.035, c: '#1e1e20', a: 0.85 }, { k: 'band', u0: 0, u1: 0.2, v0: -0.012, v1: 0.012, c: '#1e1e20', a: 0.85, f: 0.005 }],
    eye: { r: 0.024, iris: ['#d26a54', '#5a1e18'] } },
  harlequin: { thick: 0.38, depth: 0.31, pedU: 0.2, ped: 0.045, peak: 0.5, snout: 0.3, shade: ['#8a6f58', '#d29a7c', '#e8c3ad'], tail: { type: 'fork', h: 0.16, tint: '#d79c82' }, fin: '#d6a48c',
    dorsal: { u0: 0.47, u1: 0.6, h: 0.09 }, anal: { u0: 0.33, u1: 0.47, h: 0.06 }, pelvic: { u: 0.6, len: 0.06 },
    marks: [{ k: 'poly', pts: [[0.62, -0.06], [0.62, 0.02], [0.4, 0.1], [0.22, 0.03], [0.22, -0.03]], c: '#1f1d22', a: 0.88 }], eye: { r: 0.03, iris: ['#c8b8a0', '#55483a'] } },
  chili: { thick: 0.42, depth: 0.21, pedU: 0.2, ped: 0.035, peak: 0.5, snout: 0.35, shade: ['#a5402e', '#d4563c', '#e07a5c'], tail: { type: 'fork', h: 0.13, tint: '#c95a44' }, fin: '#cf7056',
    dorsal: { u0: 0.4, u1: 0.52, h: 0.07 }, anal: { u0: 0.3, u1: 0.44, h: 0.05 }, pelvic: { u: 0.56, len: 0.05 },
    marks: [{ k: 'band', u0: 0.22, u1: 0.85, v0: -0.012, v1: 0.012, c: '#2a1a18', a: 0.7, f: 0.01 }, { k: 'blob', u: 0.24, v: 0, ru: 0.03, rv: 0.025, c: '#1a1212', a: 0.8 }],
    eye: { r: 0.03, iris: ['#d07050', '#4a1a12'] } },
  danio: { thick: 0.5, depth: 0.19, pedU: 0.18, ped: 0.035, peak: 0.5, snout: 0.3, mouth: -0.01, shade: ['#9a9a7c', '#d6d2bc', '#ece8d8'], tail: { type: 'fork', h: 0.12 }, fin: N,
    dorsal: { u0: 0.4, u1: 0.52, h: 0.06 }, anal: { u0: 0.27, u1: 0.5, h: 0.06 }, pelvic: { u: 0.58, len: 0.05 },
    marks: [-0.055, -0.015, 0.025, 0.065].map(v => ({ k: 'band' as const, u0: 0.2, u1: 0.9, v0: v - 0.012, v1: v + 0.012, c: '#2b4f8c', a: 0.9, f: 0.008 })),
    finMarks: [-0.03, 0, 0.03].map(v => ({ k: 'band' as const, u0: 0.0, u1: 0.25, v0: v - 0.007, v1: v + 0.007, c: '#2b4f8c', a: 0.8, f: 0.004 })),
    eye: { r: 0.026, iris: ['#c9c2a6', '#4e4a3c'] } },
  cherrybarb: { thick: 0.4, depth: 0.29, pedU: 0.2, ped: 0.045, peak: 0.55, snout: 0.45, shade: ['#8a3a2a', '#c4473a', '#d97a62'], tail: { type: 'fork', h: 0.15, tint: '#c25a48' }, fin: '#c96b58',
    dorsal: { u0: 0.47, u1: 0.6, h: 0.1 }, anal: { u0: 0.3, u1: 0.42, h: 0.06 }, pelvic: { u: 0.58, len: 0.06 },
    marks: [{ k: 'band', u0: 0.2, u1: 0.9, v0: -0.01, v1: 0.012, c: '#4a1d16', a: 0.6, f: 0.01 }], eye: { r: 0.03, iris: ['#c9a080', '#4a2a1a'] } },
  tigerbarb: { thick: 0.38, depth: 0.42, pedU: 0.2, ped: 0.05, peak: 0.5, snout: 0.45, shade: ['#8c7a45', '#d8b670', '#ecd7a4'], tail: { type: 'fork', h: 0.17, tint: '#d07a4a', edge: '#c23a28' }, fin: '#d3a274',
    dorsal: { u0: 0.47, u1: 0.62, h: 0.12, tint: '#1f1f1f', a: 0.85, edge: '#c23a28' }, anal: { u0: 0.3, u1: 0.42, h: 0.08 }, pelvic: { u: 0.58, len: 0.07, tint: '#c4442e' },
    marks: [{ k: 'bars', us: [0.9, 0.67, 0.45, 0.24], w: 0.06, c: '#1c1c1e', a: 0.92 }], eye: { r: 0.032, iris: ['#cf6a3a', '#4a2010'] } },
  guppy: { thick: 0.45, depth: 0.2, pedU: 0.4, ped: 0.04, peak: 0.45, snout: 0.45, mouth: -0.015, shade: ['#7c8476', '#bfc4b8', '#ddddd2'], tail: { type: 'notch', h: 0.27, tint: '#e0782e', a: 0.85 }, fin: '#c6a37a',
    dorsal: { u0: 0.42, u1: 0.58, h: 0.09, tint: '#7fa6c6' }, anal: { u0: 0.47, u1: 0.55, h: 0.05 }, pelvic: { u: 0.65, len: 0.04 },
    marks: [{ k: 'blob', u: 0.55, v: 0, ru: 0.06, rv: 0.05, c: '#2d6fb0', a: 0.8 }, { k: 'blob', u: 0.47, v: 0.01, ru: 0.03, rv: 0.03, c: '#1a1a1a', a: 0.8 }, { k: 'blob', u: 0.68, v: 0.02, ru: 0.06, rv: 0.04, c: '#e0884a', a: 0.7 }],
    finMarks: [{ k: 'band', u0: 0, u1: 0.2, v0: -0.3, v1: 0.3, c: '#3a6ab8', a: 0.55, f: 0.08 }, { k: 'spots', n: 26, u0: 0.04, u1: 0.38, v0: -0.24, v1: 0.24, r: 0.014, c: '#2a2a40', a: 0.6 }],
    eye: { r: 0.026, iris: ['#c9b890', '#4a3e2c'] } },
  platy: { thick: 0.5, depth: 0.36, pedU: 0.2, ped: 0.06, peak: 0.45, snout: 0.6, mouth: -0.02, shade: ['#b0482a', '#de6a3a', '#eb9a6a'], tail: { type: 'notch', h: 0.16, tint: '#d87850' }, fin: '#da8a62',
    dorsal: { u0: 0.42, u1: 0.58, h: 0.09 }, anal: { u0: 0.42, u1: 0.5, h: 0.05 }, pelvic: { u: 0.62, len: 0.06 },
    eye: { r: 0.034, iris: ['#cfb890', '#4a3e2c'] } },
  molly: { thick: 0.5, depth: 0.31, pedU: 0.22, ped: 0.07, peak: 0.45, snout: 0.6, mouth: -0.02, shade: ['#141416', '#232427', '#33353a'], tail: { type: 'round', h: 0.16, tint: '#2a2b30', a: 0.75 }, fin: '#2d2e33',
    dorsal: { u0: 0.33, u1: 0.62, h: 0.12, shape: 'sail', a: 0.75 }, anal: { u0: 0.4, u1: 0.5, h: 0.06 }, pelvic: { u: 0.62, len: 0.05 },
    marks: [{ k: 'blob', u: 0.6, v: -0.02, ru: 0.15, rv: 0.08, c: '#6a7080', a: 0.18 }], eye: { r: 0.03, iris: ['#9a8a6a', '#2a2418'] } },
  swordtail: { thick: 0.45, depth: 0.27, pedU: 0.3, ped: 0.05, peak: 0.45, snout: 0.5, mouth: -0.015, shade: ['#a63a2a', '#d4553a', '#e4886a'], tail: { type: 'sword', h: 0.18, tint: '#d26a48' }, fin: '#d07a58',
    dorsal: { u0: 0.47, u1: 0.62, h: 0.09 }, anal: { u0: 0.5, u1: 0.57, h: 0.05 }, pelvic: { u: 0.65, len: 0.05 },
    finMarks: [{ k: 'band', u0: 0, u1: 0.25, v0: 0.06, v1: 0.12, c: '#1c1c1c', a: 0.85, f: 0.008 }], eye: { r: 0.028, iris: ['#cfb890', '#4a3e2c'] } },
  betta: { thick: 0.45, depth: 0.24, pedU: 0.36, ped: 0.08, peak: 0.4, snout: 0.6, mouth: -0.02, shade: ['#4a1428', '#8a1f34', '#a33a44'], tail: { type: 'veil', h: 0.38, tint: '#9c2236', a: 0.8 }, fin: '#a02a3c', ray: '#5a0f1c',
    dorsal: { u0: 0.32, u1: 0.55, h: 0.22, shape: 'long', a: 0.8 }, anal: { u0: 0.3, u1: 0.62, h: 0.25, shape: 'long', a: 0.8 }, pelvic: { u: 0.68, len: 0.12, thread: true, tint: '#9c2236' },
    marks: [{ k: 'spots', n: 60, u0: 0.38, u1: 0.85, v0: -0.08, v1: 0.08, r: 0.01, c: '#4f7fb8', a: 0.35 }],
    finMarks: [{ k: 'spots', n: 60, u0: 0, u1: 0.6, v0: -0.4, v1: 0.4, r: 0.015, c: '#4f7fb8', a: 0.25 }],
    eye: { r: 0.03, iris: ['#7a3030', '#1a0808'] } },
  dwarfgourami: { thick: 0.32, depth: 0.42, pedU: 0.2, ped: 0.06, peak: 0.5, snout: 0.5, mouth: -0.02, shade: ['#2f5c8a', '#c25a3a', '#d47a54'], tail: { type: 'round', h: 0.17, tint: '#c6603e' }, fin: '#c86a4a',
    dorsal: { u0: 0.22, u1: 0.55, h: 0.1, shape: 'round', edge: '#3c74b0' }, anal: { u0: 0.2, u1: 0.72, h: 0.12, shape: 'round', edge: '#3c74b0' }, pelvic: { u: 0.72, len: 0.4, thread: true, tint: '#d68a5a' },
    marks: [0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8].map(u => ({ k: 'band' as const, u0: u, u1: u + 0.035, v0: -0.25, v1: 0.25, c: '#3a78b8', a: 0.75, f: 0.01 })),
    finMarks: [{ k: 'spots', n: 40, u0: 0.05, u1: 0.7, v0: -0.35, v1: 0.35, r: 0.012, c: '#3a78b8', a: 0.6 }],
    eye: { r: 0.032, iris: ['#c8603a', '#3a1a10'] } },
  honeygourami: { thick: 0.32, depth: 0.38, pedU: 0.2, ped: 0.06, peak: 0.5, snout: 0.5, mouth: -0.02, shade: ['#b06a2a', '#e09a42', '#eabc78'], tail: { type: 'round', h: 0.15, tint: '#dca064' }, fin: '#dca064',
    dorsal: { u0: 0.25, u1: 0.55, h: 0.08, shape: 'round' }, anal: { u0: 0.22, u1: 0.68, h: 0.1, shape: 'round', edge: '#3a3020' }, pelvic: { u: 0.7, len: 0.3, thread: true, tint: '#e0a868' },
    marks: [{ k: 'band', u0: 0.65, u1: 0.95, v0: 0.05, v1: 0.2, c: '#2c2a30', a: 0.6, f: 0.04 }], eye: { r: 0.03, iris: ['#d08a40', '#4a2a10'] } },
  gbr: { thick: 0.36, depth: 0.44, pedU: 0.22, ped: 0.06, peak: 0.5, snout: 0.55, shade: ['#6b7a5a', '#b8b46a', '#d8c088'], tail: { type: 'round', h: 0.17, tint: '#b0907a' }, fin: '#b89a80',
    dorsal: { u0: 0.22, u1: 0.62, h: 0.13, shape: 'round', edge: '#c8443a' }, anal: { u0: 0.22, u1: 0.5, h: 0.1, shape: 'round' }, pelvic: { u: 0.65, len: 0.1, tint: '#c84a3a' },
    marks: [{ k: 'blob', u: 0.86, v: -0.02, ru: 0.12, rv: 0.12, c: '#e0b04a', a: 0.7 }, { k: 'bars', us: [0.87], w: 0.04, c: '#1a1a1e', a: 0.85 },
      { k: 'blob', u: 0.62, v: -0.04, ru: 0.05, rv: 0.06, c: '#1a1a1e', a: 0.75 }, { k: 'spots', n: 70, u0: 0.25, u1: 0.8, v0: -0.15, v1: 0.15, r: 0.012, c: '#5aa0d8', a: 0.75 }],
    finMarks: [{ k: 'spots', n: 50, u0: 0, u1: 0.65, v0: -0.4, v1: 0.4, r: 0.01, c: '#5aa0d8', a: 0.55 }],
    eye: { r: 0.032, iris: ['#c8443a', '#4a1210'] } },
  bolivianram: { thick: 0.36, depth: 0.38, pedU: 0.22, ped: 0.055, peak: 0.5, snout: 0.5, shade: ['#6a6450', '#b8ae8a', '#d8cfb0'], tail: { type: 'lyre', h: 0.17, tint: '#c2a890' }, fin: '#c2ac94',
    dorsal: { u0: 0.22, u1: 0.62, h: 0.12, shape: 'round', edge: '#c8443a' }, anal: { u0: 0.22, u1: 0.48, h: 0.09, shape: 'round' }, pelvic: { u: 0.65, len: 0.1, tint: '#d26a52' },
    marks: [{ k: 'blob', u: 0.58, v: -0.01, ru: 0.04, rv: 0.04, c: '#1a1a1e', a: 0.8 }, { k: 'bars', us: [0.87], w: 0.03, c: '#2a2a2c', a: 0.7 }, { k: 'blob', u: 0.8, v: 0.1, ru: 0.12, rv: 0.06, c: '#e8a868', a: 0.5 }],
    eye: { r: 0.03, iris: ['#c8443a', '#4a1210'] } },
  kribensis: { thick: 0.45, belly: 0.2, depth: 0.3, pedU: 0.2, ped: 0.05, peak: 0.55, snout: 0.45, shade: ['#5c5848', '#b3aa90', '#d8b8a8'], tail: { type: 'notch', h: 0.15, tint: '#c8ac6a' }, fin: '#c0a674',
    dorsal: { u0: 0.22, u1: 0.68, h: 0.08, shape: 'round', edge: '#c8443a' }, anal: { u0: 0.22, u1: 0.45, h: 0.08, shape: 'round' }, pelvic: { u: 0.66, len: 0.1, tint: '#7a4ca0' },
    marks: [{ k: 'band', u0: 0.2, u1: 0.92, v0: -0.02, v1: 0.02, c: '#2a2620', a: 0.8, f: 0.012 }, { k: 'blob', u: 0.62, v: 0.1, ru: 0.15, rv: 0.06, c: '#d0405a', a: 0.75 }],
    finMarks: [{ k: 'blob', u: 0.3, v: -0.17, ru: 0.025, rv: 0.025, c: '#1a1a1a', a: 0.85 }], eye: { r: 0.028, iris: ['#c8a050', '#3a2a10'] } },
  discus: { scale: 0.014, thick: 0.2, depth: 0.78, pedU: 0.13, ped: 0.07, peak: 0.45, snout: 0.85, mouth: 0.02, shade: ['#5a6a7a', '#3f8aa8', '#4a98b0'], tail: { type: 'notch', h: 0.14, tint: '#6a8a9a' }, fin: '#5a8698',
    dorsal: { u0: 0.15, u1: 0.72, h: 0.07, shape: 'round', edge: '#c8603a' }, anal: { u0: 0.15, u1: 0.68, h: 0.07, shape: 'round', edge: '#c8603a' }, pelvic: { u: 0.72, len: 0.12, tint: '#c8603a' },
    marks: [{ k: 'bars', us: [0.88, 0.2], w: 0.035, c: '#2a2a30', a: 0.55 }, ...[-0.3, -0.21, -0.12, -0.03, 0.06, 0.15, 0.24].map(v => ({ k: 'band' as const, u0: 0.12, u1: 0.98, v0: v, v1: v + 0.032, c: '#8a5a3a', a: 0.6, wave: 0.009 }))],
    eye: { r: 0.03, iris: ['#d04a2a', '#4a1208'] }, rim: 0.03 },
  angel: { thick: 0.2, angular: 0.8, depth: 0.78, pedU: 0.2, ped: 0.045, peak: 0.375, snout: 0.25, shade: ['#9a998e', '#d0cec2', '#e4e1d7'], tail: { type: 'notch', h: 0.24, tint: '#c3c4bc' }, fin: '#c3c4bc',
    dorsal: { u0: 0.3, u1: 0.66, h: 0.25, shape: 'swept' }, anal: { u0: 0.3, u1: 0.64, h: 0.25, shape: 'swept' }, pelvic: { u: 0.74, len: 0.45, thread: true, tint: '#e2ddcc', angle: 68 },
    marks: [{ k: 'blob', u: 0.86, v: -0.15, ru: 0.09, rv: 0.07, c: '#c4a46a', a: 0.45 }, { k: 'blob', u: 0.6, v: -0.06, ru: 0.22, rv: 0.2, c: '#ffffff', a: 0.14 },
      { k: 'bars', us: [0.865, 0.645, 0.43], w: 0.05, c: '#26262a', a: 0.9 }, { k: 'bars', us: [0.235], w: 0.06, c: '#26262a', a: 0.5 }],
    finMarks: [{ k: 'bars', us: [0.645, 0.43], w: 0.05, c: '#26262a', a: 0.8 }], eye: { r: 0.026, iris: ['#c8673f', '#5b2a1c'] } },
  oscar: { thick: 0.48, depth: 0.42, pedU: 0.2, ped: 0.07, peak: 0.5, snout: 0.55, mouth: 0.01, shade: ['#2a2a24', '#3e3b30', '#4a4438'], tail: { type: 'round', h: 0.16, tint: '#3a372e', a: 0.85 }, fin: '#3a372e',
    dorsal: { u0: 0.2, u1: 0.68, h: 0.08, shape: 'round', a: 0.85 }, anal: { u0: 0.2, u1: 0.45, h: 0.09, shape: 'round', a: 0.85 }, pelvic: { u: 0.62, len: 0.09 },
    marks: [{ k: 'spots', n: 12, u0: 0.3, u1: 0.8, v0: -0.05, v1: 0.15, r: 0.045, c: '#c8642a', a: 0.6 }, { k: 'blob', u: 0.24, v: -0.02, ru: 0.04, rv: 0.04, c: '#d8702a', a: 0.9 }, { k: 'blob', u: 0.24, v: -0.02, ru: 0.022, rv: 0.022, c: '#141414', a: 0.95 }],
    eye: { r: 0.03, iris: ['#c84a2a', '#3a1208'] } },
  goldfish: { thick: 0.55, depth: 0.52, pedU: 0.32, ped: 0.06, peak: 0.45, snout: 0.75, shade: ['#c8642a', '#e88a3a', '#f0b87a'], tail: { type: 'double', h: 0.3, tint: '#e8964e', a: 0.75 }, fin: '#ec9e5e',
    dorsal: { u0: 0.42, u1: 0.68, h: 0.14, shape: 'round', a: 0.75 }, anal: { u0: 0.38, u1: 0.48, h: 0.1, shape: 'round', a: 0.75 }, pelvic: { u: 0.7, len: 0.1 },
    marks: [{ k: 'blob', u: 0.65, v: -0.08, ru: 0.2, rv: 0.14, c: '#ffffff', a: 0.12 }], eye: { r: 0.035, iris: ['#2a2420', '#0a0806'] } },
  // ---------- bottom dwellers ----------
  bronzecory: { plates: true, thick: 0.72, belly: 0.9, wide: 0.5, pedT: 0.28, step: 0.18, noseW: 0.4, depth: 0.35, pedU: 0.18, ped: 0.06, peak: 0.6, back: 0.68, snout: 0.6, mouth: 0.06, shade: ['#4a5a48', '#8a8a62', '#d8c8a0'], tail: { type: 'fork', h: 0.15 }, fin: '#b0a888',
    dorsal: { u0: 0.5, u1: 0.68, h: 0.16, shape: 'sail' }, anal: { u0: 0.32, u1: 0.4, h: 0.06 }, adipose: true, pelvic: { u: 0.55, len: 0.08 },
    marks: [{ k: 'blob', u: 0.6, v: -0.04, ru: 0.25, rv: 0.08, c: '#5a8070', a: 0.45 }], barbels: 0.03, eye: { r: 0.032, iris: ['#c8b890', '#3a3020'], dv: -0.05 } },
  pandacory: { plates: true, thick: 0.72, belly: 0.9, wide: 0.5, pedT: 0.28, step: 0.18, noseW: 0.4, depth: 0.35, pedU: 0.18, ped: 0.06, peak: 0.6, back: 0.68, snout: 0.6, mouth: 0.06, shade: ['#c8c0b0', '#e8e0d0', '#f0ebe0'], tail: { type: 'fork', h: 0.15 }, fin: '#d8d2c4',
    dorsal: { u0: 0.5, u1: 0.68, h: 0.16, shape: 'sail', tint: '#2a2a2a', a: 0.85 }, anal: { u0: 0.32, u1: 0.4, h: 0.06 }, adipose: true, pelvic: { u: 0.55, len: 0.08 },
    marks: [{ k: 'bars', us: [0.885], w: 0.06, c: '#1c1c1c', a: 0.95 }, { k: 'blob', u: 0.24, v: -0.02, ru: 0.06, rv: 0.06, c: '#1c1c1c', a: 0.9 }], barbels: 0.03,
    eye: { r: 0.032, iris: ['#4a4040', '#0c0a0a'], dv: -0.05 } },
  bristlenose: { plates: true, thick: 1.3, belly: 1, wide: 0.6, noseW: 0.8, depth: 0.25, pedU: 0.16, ped: 0.05, peak: 0.75, back: 0.72, snout: 0.75, mouth: 0.05, shade: ['#3a3a30', '#5a5444', '#8a826a'], tail: { type: 'notch', h: 0.11, tint: '#4a4638', a: 0.85 }, fin: '#4a4638',
    dorsal: { u0: 0.42, u1: 0.68, h: 0.13, shape: 'sail', a: 0.85 }, anal: { u0: 0.3, u1: 0.36, h: 0.04 }, adipose: true, pelvic: { u: 0.58, len: 0.1 },
    marks: [{ k: 'spots', n: 70, u0: 0.16, u1: 0.95, v0: -0.18, v1: 0.05, r: 0.008, c: '#c8c0a0', a: 0.6 }],
    finMarks: [{ k: 'spots', n: 40, u0: 0, u1: 0.7, v0: -0.4, v1: 0.2, r: 0.008, c: '#c8c0a0', a: 0.5 }], bristles: true, eye: { r: 0.022, iris: ['#6a6040', '#1a1610'], dv: -0.12, up: 0.7 } },
  oto: { plates: true, thick: 0.95, belly: 0.8, wide: 0.4, noseW: 0.5, depth: 0.19, pedU: 0.17, ped: 0.035, peak: 0.65, back: 0.62, snout: 0.6, mouth: 0.03, shade: ['#6a6a50', '#a8a280', '#e0dcc8'], tail: { type: 'notch', h: 0.1 }, fin: '#c0bba4',
    dorsal: { u0: 0.5, u1: 0.62, h: 0.08, shape: 'sail' }, anal: { u0: 0.33, u1: 0.4, h: 0.04 }, pelvic: { u: 0.58, len: 0.06 },
    marks: [{ k: 'band', u0: 0.18, u1: 0.98, v0: -0.015, v1: 0.012, c: '#2a2820', a: 0.85, f: 0.008 }], finMarks: [{ k: 'blob', u: 0.08, v: 0, ru: 0.04, rv: 0.025, c: '#2a2820', a: 0.7 }],
    eye: { r: 0.024, iris: ['#b0a070', '#2a2418'], dv: -0.08, up: 0.3 } },
  kuhli: { thick: 0.85, depth: 0.085, pedU: 0.05, ped: 0.025, peak: 0.6, back: 0.55, snout: 0.6, mouth: 0.01, shade: ['#4a3a2a', '#d88a5a', '#ecc0a0'], tail: { type: 'round', h: 0.035, tint: '#c88a62' }, fin: '#d09a72',
    dorsal: { u0: 0.22, u1: 0.28, h: 0.025, shape: 'round' }, anal: { u0: 0.12, u1: 0.18, h: 0.02, shape: 'round' },
    marks: [{ k: 'bars', us: [0.93, 0.85, 0.77, 0.69, 0.61, 0.53, 0.45, 0.37, 0.29, 0.21, 0.13, 0.07], w: 0.035, c: '#2a2018', a: 0.85 }], barbels: 0.012,
    eye: { r: 0.008, iris: ['#6a5040', '#1a1008'] }, rim: 0.012 },
  clownloach: { thick: 0.6, belly: 0.4, depth: 0.28, pedU: 0.18, ped: 0.045, peak: 0.55, back: 0.6, snout: 0.25, mouth: 0.04, shade: ['#c8742a', '#e8a040', '#f0c070'], tail: { type: 'fork', h: 0.15, tint: '#c8443a' }, fin: '#c8443a',
    dorsal: { u0: 0.5, u1: 0.64, h: 0.11 }, anal: { u0: 0.3, u1: 0.4, h: 0.06 }, pelvic: { u: 0.56, len: 0.07 },
    marks: [{ k: 'bars', us: [0.86, 0.6, 0.3], w: 0.08, c: '#1c1a18', a: 0.92 }], finMarks: [{ k: 'bars', us: [0.57], w: 0.04, c: '#1c1a18', a: 0.9 }], barbels: 0.02,
    eye: { r: 0.022, iris: ['#c8a050', '#3a2a10'] } },
  sae: { thick: 0.55, belly: 0.3, depth: 0.2, pedU: 0.2, ped: 0.04, peak: 0.6, back: 0.58, snout: 0.45, mouth: 0.02, shade: ['#7a7258', '#bdb498', '#e0dccc'], tail: { type: 'fork', h: 0.13 }, fin: '#c8c2ae',
    dorsal: { u0: 0.5, u1: 0.62, h: 0.09 }, anal: { u0: 0.28, u1: 0.36, h: 0.05 }, pelvic: { u: 0.55, len: 0.06 },
    marks: [{ k: 'band', u0: 0.18, u1: 0.99, v0: -0.02, v1: 0.02, c: '#1c1a18', a: 0.92, f: 0.008 }], finMarks: [{ k: 'band', u0: 0.08, u1: 0.22, v0: -0.02, v1: 0.02, c: '#1c1a18', a: 0.85, f: 0.006 }], barbels: 0.012,
    eye: { r: 0.022, iris: ['#c8b890', '#3a3020'] } },
};

const SHRIMP: Record<string, ShrimpSpec> = {
  cherryshrimp: { body: ['#b8242a', '#d8444a'] },
  amano: { body: ['#9a9a8a', '#c8c4b4'], dots: '#6a4a3a' },
};
/** Card aspect / resting offset for the shrimp drawing. */
export const SHRIMP_META = { aspect: 0.4, rest: 0.16 };

export const GEN_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> = {
  ...Object.fromEntries(Object.entries(PLANS).map(([k, p]) => [k, (c: Ctx, P: Proj, W: number) => drawPlan(p, c, P, W)])),
  ...Object.fromEntries(Object.entries(SHRIMP).map(([k, s]) => [k, (c: Ctx, P: Proj, W: number) => drawShrimp(s, c, P, W)])),
};

/** Aspect + rest for generated art keys (shrimp included). */
export function artMeta(art: string): { aspect: number; rest: number } | undefined {
  if (PLANS[art]) return planMeta(PLANS[art]);
  if (SHRIMP[art]) return SHRIMP_META;
  return undefined;
}

