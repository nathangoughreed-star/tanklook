// Parametric fish painter: one shaded "body plan" (profile, tail, fins, markings, eye) drawn in the house style
// (see placeholder.ts), so the species list can grow without hand-drawing each fish. Same unit frame as the
// hand-drawn art: u = 0 (tail tip) .. 1 (nose tip) across the card width W (== adult TL), v = offset in widths
// from the card's centre line, + down. Tail and nose tips are sharp corners at u = 0 and u = 1 exactly.
import { type Ctx, type Proj, type Pt, blob, body, eye, fin, gill, hexA, rng, scales, shimmer, shape, soft, style, wavyBand } from './paint';

type Tail = 'fork' | 'notch' | 'round' | 'veil' | 'lyre' | 'double' | 'sword';
type FinShape = 'tri' | 'round' | 'sail' | 'long' | 'swept';
/** A fin along the back (dorsal) or belly (anal) from u0 (rear) to u1 (front), h tall (widths). */
export interface FinSpec { u0: number; u1: number; h: number; shape?: FinShape; tint?: string; a?: number; edge?: string }
/**
 * A median fin built from its structure (anatomy audit P1, lane S) instead of an outline: the base starts at `at`
 * (front, u) and runs `len` back along the body, and every height is measured from the body contour under it, so a
 * long fin stands clear along a domed back instead of showing only where the back falls away (the "rear paddle").
 * Front share `spines` of the base is spiny: `nSp` stiff spines (sharp tips, the membrane dipping `notch` between them)
 * rising from `spineH[0]` to `spineH[1]`; the soft rear rises to `h` (its highest point `rake` of the way back) and
 * ends `tip` round or in a point, the rear tip `trail` (u) behind the base end (trailing / extended rays).
 */
export interface MedianFin {
  at: number; len: number; h: number;
  spines?: number; spineH?: number | [number, number]; nSp?: number; notch?: number;
  rake?: number; tip?: 'round' | 'point'; trail?: number; drop?: number; // drop: the rear tip's height (share of h)
  lead?: number; // height where the soft part starts, share of h (default 0.55; low = a raked pennant)
  fringe?: boolean; // the soft part's edge ragged with free ray tips (pearl gourami male's anal fin)
  taper?: number; // the soft top falls in a straight line from the peak to this share of h at the base end (characins: high in front, low at the rear; off by default)
  tint?: string; a?: number; edge?: string;
}
type AnyFin = FinSpec | MedianFin;
const isMedian = (f: AnyFin): f is MedianFin => 'at' in f;
/** Is a fin rooted on the back (`top`) or belly at u? (the 3D card keeps the body's rim there, so the fin roots stay) */
export function finRooted(p: Plan, top: boolean, u: number) {
  const on = (f: AnyFin | undefined) => !!f && (isMedian(f) ? u > f.at - f.len - 0.02 && u < f.at + 0.02 : u > f.u0 - 0.02 && u < f.u1 + 0.02);
  return top ? on(p.dorsal) || on(p.dorsal2) : p.gono ? Math.abs(u - p.gono.at) < 0.03 : !p.analSplit && on(p.anal);
}
type Mark =
  | { k: 'band'; u0: number; u1: number; v0: number; v1: number; c: string; a?: number; f?: number; wave?: number }
  | { k: 'bars'; us: number[]; w: number; c: string; a?: number }
  | { k: 'spots'; n: number; u0: number; u1: number; v0: number; v1: number; r: number; c: string; a?: number }
  | { k: 'blob'; u: number; v: number; ru: number; rv: number; c: string; a?: number }
  | { k: 'poly'; pts: Pt[]; c: string; a?: number }; // points flagged 'c' are sharp corners (shape())

export interface Plan {
  depth: number;      // max body depth, widths
  pedU: number;       // where the body meets the tail (caudal fin length)
  ped: number;        // peduncle half-depth
  peak?: number;      // 0..1 along the body (tail->nose) where it is deepest
  back?: number;      // share of the depth above the centre line (0.5 symmetric; > 0.5 flat-bellied bottom fish)
  snout?: number;     // 0 pointed .. 1 blunt
  rostrum?: { len: number; h: number }; // a projecting snout: the head tapers to half-depth h at 1 - len, then a narrow snout runs on to the tip (tang)
  mouth?: number;     // nose offset (+ down, - up)
  noseCap?: number;   // the snout ends in a rounded cap this long (widths) instead of a point (loaches; off by default)
  shade: [string, string, string]; // back, flank, belly
  // cut (lyre): depth of the fork, share of the tail length (default 0.8); sword ('sword'): the fan ends at u = sword and
  // its lower rays run on as a slim tapering sword to the tip at u = 0 (unset: the short tab)
  // split (3D, off by default): a double caudal (fantail goldfish), two copies of the tail joined along the top whose
  // lower parts flare out sideways by this many degrees, more toward the rear (fish3d `splitTail`); the card draws it flat
  tail: { type: Tail; h: number; tint?: string; a?: number; edge?: string; cut?: number; sword?: number; split?: number };
  dorsal?: AnyFin; anal?: AnyFin; adipose?: boolean;
  dorsal2?: MedianFin; // a second, separate dorsal behind the first (gobies, cardinals)
  // male livebearers: the anal fin is a gonopodium, a slim rod from `at` lying back along the belly, `len` long
  gono?: { at: number; len: number; tint?: string };
  // analSplit (3D, off by default): a doubled anal fin (fantail goldfish), two copies hanging side by side whose lower
  // parts splay apart by this many degrees (fish3d `splitAnal`); the card draws one flat
  analSplit?: number;
  // ext: the leading ray runs on past the membrane by this much (widths); w: membrane width x the default
  // flat (3D, pelvic and pec, off by default): the fins held out flat to the sides all the time, as on the glass (hillstream loach)
  pelvic?: { u: number; len: number; tint?: string; thread?: boolean; angle?: number; ext?: number; w?: number; flat?: boolean }; // angle: degrees below horizontal (thread)
  pec?: { s?: number; v?: number; u?: number; flat?: boolean; w?: number; tint?: string }; // pectoral: size x the default, root height (0 top .. 1 belly, default 0.62), root u (default behind the gill), w: fan width x the default, tint: own colour (default: fin mixed with the flank)
  fin: string;        // default membrane tint
  ray?: string;
  marks?: Mark[];     // painted inside the body
  finMarks?: Mark[];  // painted inside the dorsal, anal and tail fins
  eye: { r: number; iris: [string, string]; u?: number; dv?: number; up?: number; bulge?: number }; // up (3D): 0 on the flank .. 1 on top of the head; bulge (3D): the dome's height, share of r (default 0.38)
  gape?: number;      // 3D: a mouth line this long (u) back from the snout tip on each flank (the body texture has no mouth)
  gapeDrop?: number;  // 3D: how far the mouth line curves down at its rear end (widths, default 0.02; 0 = straight)
  barbels?: number;   // barbel length (widths); bottom fish
  barbelR?: number;   // 3D: barbel root radius (widths, default 0.004); fine cylindrical barbels on slim fish (kuhli)
  bristles?: boolean; // bristlenose snout
  rim?: number;
  thick?: number;     // 3D: max body thickness / max body depth (laterally compressed < 0.5 < rounder)
  sectionExp?: number; // 3D: cross-section exponent (2 = elliptical; >2 = boxier); default 2.4
  gillLine?: number;   // 3D: faint raised operculum seam opacity (0..1); opt-in to avoid extra meshes for other species
  shimmerRgb?: string; // 2D: glint colour as 'r,g,b' (default warm gold)
  shimmer?: number;    // 2D: fine, deterministic warm scale glints (0..1); opt-in, projected to 3D flanks
  // 3D body shape (all optional): flat belly 0..1; cross-section widest low (+) or high (-); thickness at the peduncle
  // (share, default 0.55); head this share narrower than the trunk from the gill cover on; thickness kept to the snout
  // tip (share of max: a flat, wide snout)
  belly?: number; wide?: number; pedT?: number; step?: number; noseW?: number;
  angular?: number;   // 0 curved outline .. 1 straight back and belly lines meeting at a rounded apex (diamond: angelfish)
  scale?: number;     // scale size (widths) for the scale net; 0 = none (default 0.024)
  plates?: boolean;   // armoured (corydoras): two rows of bony plates instead of scales
  // drawn-outline bodies (shrimp): the side outline as a closed polygon (top from the nose back, then the bottom
  // forward) instead of the parametric one; no pectoral fins; thin limbs (3D tubes on both flanks)
  outline?: [number, number][];
  pectoral?: boolean; // default true
  limbs?: Limb[];
  drape?: number;     // 3D: the card's median fins ripple out of the card plane by this much (widths), so edge-on they read as fin, not board
  sharp?: boolean;    // 3D: keep the painted markings crisp where the surface turns away (large clean patches, not bars or spots)
}
/**
 * A thin limb (legs, antennae) as a tube on each flank, 3D only: rooted on the body at (u, v), running to the root +
 * `to` (widths: along the body, down, outward), bowed toward root + `via`; radius `r` at the root, tapering; colour `c`.
 */
export interface Limb { u: number; v: number; to: [number, number, number]; via?: [number, number, number]; r: number; c?: string } // c: own colour (default: the back's)

/** [top, bottom] at u from a closed outline (top from the nose back, bottom forward), linear between points. */
function outlineProfile(o: [number, number][]) {
  const k = o.reduce((m, q, i) => (q[0] < o[m][0] ? i : m), 0);
  const top = o.slice(0, k + 1).reverse(), bot = [...o.slice(k), o[0]]; // both by rising u
  const at = (c: [number, number][], u: number) => {
    if (u <= c[0][0]) return c[0][1];
    for (let i = 1; i < c.length; i++) if (u <= c[i][0]) { const [u0, v0] = c[i - 1], [u1, v1] = c[i]; return v0 + (v1 - v0) * (u - u0) / (u1 - u0 || 1); }
    return c[c.length - 1][1];
  };
  return (u: number): [number, number] => { const a = at(top, u), b = at(bot, u); return [Math.min(a, b), Math.max(a, b)]; };
}
export function profile(p: Plan) {
  if (p.outline) return outlineProfile(p.outline);
  const tp = p.peak ?? 0.55, back = p.back ?? 0.5, sn = p.snout ?? 0.5, mouth = p.mouth ?? 0, ro = p.rostrum, nose = ro ? 1 - ro.len : 1;
  const f = (u: number): [number, number] => {
    const t = Math.min(1, Math.max(0, (u - p.pedU) / (nose - p.pedU)));
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
    if (ro) { // the snout: a narrow tube from inside the head to the tip, rounded off at the end; joined smoothly
      const k = Math.max(0, (u - nose) / ro.len), hs = u < nose - ro.len ? 0 : ro.h * 2 * (1 - 0.5 * Math.min(1, k)) * Math.sqrt(Math.max(0, 1 - k ** 6));
      const j = 0.8 * ro.h * 2; hh = Math.max(hh, hs) + Math.max(0, j - Math.abs(hh - hs)) ** 2 / (4 * j) * (1 - Math.min(1, k)); vc = mouth * Math.min(1, Math.max(0, (u - p.pedU) / (1 - p.pedU) - 0.4) / 0.6) ** 2;
    }
    return [vc - hh * back, vc + hh * (1 - back)];
  };
  if (!p.noseCap) return f;
  // rounded cap: from u = 1 - cap the outline closes in a half ellipse, cap long and as deep as the body there
  const cap = p.noseCap, u0 = 1 - cap, [a0, b0] = f(u0);
  return (u: number): [number, number] => {
    if (u <= u0) return f(u);
    const k = Math.min(1, (u - u0) / cap), r = Math.sqrt(Math.max(0, 1 - k * k)), m = (a0 + b0) / 2, mv = m + ((p.mouth ?? 0) - m) * k * k;
    return [mv - (m - a0) * r, mv + (b0 - m) * r];
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

/** A ray or spine drawn on a fin: base (u, v) to tip (u, v), stroke width x the default. */
export type FinRay = [number, number, number, number, number];
/**
 * Outline and rays of a `MedianFin` on the contour `base` (the back for sg -1, the belly for sg 1). The outline runs
 * from the base's front up the leading spine, over the spine tips (sharp) and the membrane dips between them, along
 * the soft part, round its rear tip and back along a base line a little inside the body (the body covers it).
 */
function medianPts(f: MedianFin, base: (u: number) => number, sg: number): { pts: Pt[]; rays: FinRay[] } {
  const u1 = f.at, u0 = f.at - f.len, S = f.spines ?? 0, h = f.h;
  const [sh0, sh1] = typeof f.spineH === 'number' ? [f.spineH, f.spineH] : f.spineH ?? [h * 0.75, h * 0.9];
  const B = (u: number) => base(u) - sg * 0.02, T = (u: number, hh: number) => base(u) + sg * hh;
  const at = (s: number) => u1 - f.len * s; // s: 0 front .. 1 rear of the base
  const top: Pt[] = [], rays: FinRay[] = [];
  const lean = 0.35; // rays slope back from base to tip
  const ray = (u: number, hh: number, w: number) => rays.push([Math.min(u1, u + lean * hh), B(Math.min(u1, u + lean * hh)), u, T(u, hh), w]);
  let hEnd = 0;
  if (S > 0) {
    const n = f.nSp ?? Math.max(3, Math.round(S * f.len / 0.035)), nt = f.notch ?? 0.4;
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) : 1, hh = (sh0 + (sh1 - sh0) * k) * (i ? 1 : 0.6), s = S * (i + 0.75) / n, u = at(s); // the first spine is short
      if (i) { const hm = (hh + hEnd) / 2 * (1 - nt), um = at(S * (i + 0.25) / n); top.push([um, T(um, hm)]); }
      top.push([u, T(u, hh), 'c']); ray(u, hh, 2.2); hEnd = hh;
    }
  }
  // soft part: rises from the last spine (or from the leading ray) to h, `rake` of the way back, then eases off
  const r = Math.min(f.rake ?? 0.4, 0.999), n = 7, h0 = S > 0 ? hEnd * 0.85 : h * (f.lead ?? 0.55), pointy = f.tip === 'point';
  for (let i = S > 0 ? 1 : 0; i <= n; i++) {
    const t = i / n, s = S + (1 - S) * t, u = at(s);
    const hh = t < r ? h0 + (h - h0) * Math.sin(t / r * Math.PI / 2) : f.taper !== undefined ? h * (1 - (1 - f.taper) * (t - r) / (1 - r)) : h * (1 - (pointy ? 0 : 0.25) * ((t - r) / (1 - r)) ** 2);
    if (f.fringe && i > 0) { const um = at(S + (1 - S) * (i - 0.5) / n); top.push([um, T(um, hh * 0.86)], [u, T(u, hh * 1.06), 'c']); }
    else top.push(i === 0 ? [u, T(u, hh), 'c'] : [u, T(u, hh)]);
    ray(u, hh, i === 0 && S === 0 ? 2.2 : 1);
  }
  // rear: a point behind the base end (trailing rays) or a rounded lobe; then the free rear edge back to the body
  const ov = f.trail ?? (pointy ? 0.25 * h : 0.18 * h), hr = h * (f.drop ?? (pointy ? 0.75 : 0.6));
  if (pointy) { top.push([u0 - ov, T(u0 - ov, hr), 'c']); ray(u0 - ov, hr, 1); }
  else { top.push([u0 - ov * 0.7, T(u0 - ov * 0.7, hr)], [u0 - ov, T(u0 - ov, hr * 0.45)]); }
  const pts: Pt[] = [[u1 + 0.004, B(u1 + 0.004)], [u1, T(u1, 0.02)], ...top, [u0 - ov * 0.15, B(u0 - ov * 0.15)]];
  for (let k = 1; k <= 4; k++) { const u = u0 + (u1 - u0) * k / 5; pts.push([u, B(u)]); } // base line, rear to front
  return { pts, rays };
}

/** Gonopodium (male livebearers): the anal fin as a slim rod lying back along the belly, with a stiff dark leading ray. */
function gonoPts(g: { at: number; len: number }, belly: (u: number) => number): { pts: Pt[]; rays: FinRay[] } {
  const b0 = belly(g.at) - 0.012, tipU = g.at - g.len, tipV = belly(g.at) + 0.045;
  const pts: Pt[] = [[g.at + 0.012, b0], [g.at - 0.01, b0 + 0.03], [tipU + g.len * 0.25, tipV - 0.002], [tipU, tipV + 0.004, 'c'], [tipU + g.len * 0.3, tipV - 0.016], [g.at - 0.03, b0 + 0.004]];
  return { pts, rays: [[g.at + 0.004, b0 + 0.01, tipU + 0.004, tipV, 2.4]] };
}

function tailPts(t: Tail, pu: number, c: number, pd: number, th: number, cut = 0.8, sword?: number): Pt[] {
  const e = pu + 0.03;
  switch (t) {
    case 'fork': return [[e, c - pd], [pu * 0.55, c - th * 0.6], [0, c - th, 'c'], [pu * 0.42, c - th * 0.12], [pu * 0.5, c], [pu * 0.42, c + th * 0.12], [0, c + th, 'c'], [pu * 0.55, c + th * 0.6], [e, c + pd]];
    case 'lyre': return [[e, c - pd], [pu * 0.6, c - th * 0.5], [0, c - th, 'c'], [pu * (cut - 0.1), c - th * 0.15], [pu * cut, c], [pu * (cut - 0.1), c + th * 0.15], [0, c + th, 'c'], [pu * 0.6, c + th * 0.5], [e, c + pd]];
    case 'notch': return [[e, c - pd], [pu * 0.4, c - th * 0.85], [0, c - th, 'c'], [pu * 0.12, c], [0, c + th, 'c'], [pu * 0.4, c + th * 0.85], [e, c + pd]];
    case 'round': return [[e, c - pd], [pu * 0.65, c - th * 0.95], [pu * 0.18, c - th * 0.85], [0, c - th * 0.35], [0, c, 'c'], [0, c + th * 0.35], [pu * 0.18, c + th * 0.85], [pu * 0.65, c + th * 0.95], [e, c + pd]];
    case 'veil': return [[e, c - pd], [pu * 0.7, c - th * 0.9], [pu * 0.25, c - th * 0.95], [0.02, c - th * 0.4], [0, c + th * 0.1, 'c'], [0.03, c + th * 0.6], [pu * 0.3, c + th], [pu * 0.75, c + th * 0.8], [e, c + pd]];
    case 'double': return [[e, c - pd], [pu * 0.5, c - th * 0.7], [0, c - th * 0.55, 'c'], [pu * 0.35, c + th * 0.05], [0, c + th * 0.95, 'c'], [pu * 0.55, c + th * 0.7], [e, c + pd]];
    case 'sword': if (sword) {
      // fan from the peduncle to u = sword (truncate rear edge), then the sword: root 0.035 deep, tapering to an upturned point
      const ue = sword, f = (k: number) => ue + (pu - ue) * k, vs = c + th * 0.55, r = 0.0175;
      return [[e, c - pd], [f(0.45), c - th * 0.75], [f(0.08), c - th * 0.8, 'c'], [ue, c + th * 0.1], [ue, vs - r], [ue * 0.5, vs - r * 0.75], [0, vs - 0.012, 'c'],
        [ue * 0.5, vs + r * 0.5], [ue, vs + r], [f(0.5), c + th * 0.62], [e, c + pd]];
    }
      return [[e, c - pd], [pu * 0.45, c - th * 0.75], [pu * 0.3, c - th * 0.8, 'c'], [pu * 0.32, c + th * 0.2], [0, c + th * 0.55, 'c'], [pu * 0.35, c + th * 0.55], [pu * 0.5, c + th * 0.7], [e, c + pd]];
  }
}

/** Every outline the plan draws, for extents. */
function geometry(p: Plan) {
  const prof = profile(p), n = 16, top: Pt[] = [], bot: Pt[] = [];
  for (let i = 1; i < n; i++) { const u = 1 - (1 - p.pedU) * i / (n - 1); const [a, b] = prof(u); top.push([u, a]); bot.unshift([u, b]); }
  const bodyPts: Pt[] = [[1, p.mouth ?? 0, 'c'], ...top, ...bot];
  const [pt, pb] = prof(p.pedU), c = (pt + pb) / 2, pd = (pb - pt) / 2;
  const tail = tailPts(p.tail.type, p.pedU, c, pd, p.tail.h, p.tail.cut, p.tail.sword);
  const back = (u: number) => prof(u)[0], belly = (u: number) => prof(u)[1];
  const med = (f: AnyFin | undefined, base: (u: number) => number, sg: number) => !f ? undefined : isMedian(f) ? medianPts(f, base, sg) : { pts: finPts(f, base, sg), rays: undefined };
  const dorsalF = med(p.dorsal, back, -1), dorsal2F = med(p.dorsal2, back, -1);
  const analF = p.gono ? gonoPts(p.gono, belly) : med(p.anal, belly, 1);
  let pelvic: Pt[] | undefined;
  if (p.pelvic) {
    const { u, len } = p.pelvic, b = prof(u)[1] - 0.01, w = p.pelvic.w ?? 1, ext = p.pelvic.ext ?? 0;
    // a thread hangs back at ~27 degrees, or steeper (`angle`): its points turn about the root
    const rot = ((p.pelvic.angle ?? 26.6) - 26.6) * Math.PI / 180, cr = Math.cos(rot), sr = Math.sin(rot);
    const R = (dx: number, dy: number, c?: 'c'): Pt => { const x = -dx * len, y = dy * len, qu = u + x * cr + y * sr, qv = b - x * sr + y * cr; return c ? [qu, qv, c] : [qu, qv]; };
    // ext: the leading ray carries on past the membrane's tip, along the same line
    const tip: Pt = ext ? [u - (len + ext) * 0.6, b + (len + ext) * 0.75, 'c'] : [u - len * 0.6, b + len * 0.75, 'c'];
    pelvic = p.pelvic.thread ? [[u + 0.01, b], R(0.55, 0.35), R(1, 0.5, 'c'), R(0.5, 0.3), [u - 0.01, b]]
      : w === 1 && !ext ? [[u + 0.02, b], tip, [u - len * 0.35, b + len * 0.25], [u - 0.03, b]]
      : [[u + 0.02, b], tip, ...(ext ? [[u - len * 0.62, b + len * 0.72] as Pt] : []), [u - len * (0.35 + 0.3 * (w - 1)), b + len * 0.25 * w], [u - 0.03 * w, b]];
  }
  return { prof, bodyPts, tail, dorsal: dorsalF?.pts, dorsal2: dorsal2F?.pts, anal: analF?.pts, rays: { dorsal: dorsalF?.rays, dorsal2: dorsal2F?.rays, anal: analF?.rays }, pelvic, c };
}

/** Card aspect (height / width) and resting offset: v of the lowest body/pelvic point (bottom dwellers sit on it). */
export function planMeta(p: Plan) {
  const g = geometry(p), all = [g.bodyPts, g.tail, g.dorsal ?? [], g.dorsal2 ?? [], g.anal ?? [], g.pelvic ?? []].flat();
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
  if (p.pectoral === false) return out;
  const pu = p.pec?.u ?? 1 - (1 - p.pedU) * 0.24, [pt, pb] = g.prof(pu), pm = pt + (pb - pt) * (p.pec?.v ?? 0.62), pl = Math.min((1 - p.pedU) * 0.17, p.depth * 0.75) * (p.pec?.s ?? 1); // slender fish (loaches) keep small pectorals
  // w (off by default): a broad fan, the trailing edge this many times deeper (hillstream loach)
  const w = p.pec?.w ?? 1, pts: Pt[] = w === 1 ? [[pu, pm - 0.01], [pu - pl, pm + pl * 0.3, 'c'], [pu - pl * 0.7, pm + pl * 0.55], [pu + 0.005, pm + 0.015]]
    : [[pu, pm - 0.01], [pu - pl, pm + pl * 0.3, 'c'], [pu - pl * 0.8, pm + pl * (0.3 + 0.25 * w)], [pu - pl * 0.4, pm + pl * 0.3 * w], [pu + 0.005, pm + 0.015 * w]];
  out.push({ kind: 'pectoral', pts, root: [pu, pm], tint: p.pec?.tint ?? mixHex(p.fin, p.shade[1], 0.35), a: p.pec?.tint ? 0.8 : 0.45, rays: 5 }); // pectoral takes on some flank colour: it lies against the body
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

/** Draws one median fin or the tail in the plan's fin style (fin marks, edge). */
function finDrawer(p: Plan, ctx: Ctx, P: Proj, W: number) {
  const ray = p.ray ?? '#7d7a70';
  return (pts: Pt[] | undefined, root: [number, number], f: { tint?: string; a?: number; edge?: string } | undefined, seed: number, segs?: FinRay[]) => {
    if (!pts) return;
    const e = {
      a: f?.a, rays: 14, extra: (c: Ctx) => {
        paintMarks(c, P, W, p.finMarks, seed);
        if (f?.edge) { shape(c, P, pts); c.strokeStyle = hexA(f.edge, 0.55); c.lineWidth = 0.014 * W; c.stroke(); }
      },
    };
    fin(ctx, P, W, pts, root, f?.tint ?? p.fin, ray, segs ? { ...e, segs } : e);
  };
}
/** The tail fin alone (a split tail's lobes are their own 3D meshes, painted with this), and its centre line v. */
export function drawTail(p: Plan, ctx: Ctx, P: Proj, W: number) {
  const g = geometry(p); finDrawer(p, ctx, P, W)(g.tail, [p.pedU + 0.02, g.c], p.tail, 11);
}
/** The anal fin alone (a doubled anal's two fins are their own 3D meshes, painted with this). */
export function drawAnal(p: Plan, ctx: Ctx, P: Proj, W: number) {
  const g = geometry(p), f = p.anal!, mu = isMedian(f) ? f.at - f.len / 2 : (f.u0 + f.u1) / 2;
  finDrawer(p, ctx, P, W)(g.anal, [mu, g.prof(mu)[1] - 0.02], f, 13, g.rays.anal);
}
export const analBox = (p: Plan) => { const g = geometry(p), us = g.anal!.map(q => q[0]), vs = g.anal!.map(q => q[1]); return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) }; };
export const tailBox = (p: Plan) => { const g = geometry(p), vs = g.tail.map(q => q[1]); return { u1: Math.max(...g.tail.map(q => q[0])), v0: Math.min(...vs), v1: Math.max(...vs), c: g.c }; };

export function drawPlan(p: Plan, ctx: Ctx, P: Proj, W: number) {
  const g = geometry(p), ray = p.ray ?? '#7d7a70', draw = finDrawer(p, ctx, P, W);
  // root of a fin's ray fan: the middle of its base, just inside the body
  const mid = (f: AnyFin) => (isMedian(f) ? f.at - f.len / 2 : (f.u0 + f.u1) / 2);
  if (!(p.tail.split && !style.paired)) draw(g.tail, [p.pedU + 0.02, g.c], p.tail, 11); // a 3D fish's split tail: fish3d draws its two lobes
  if (p.dorsal) draw(g.dorsal, [mid(p.dorsal), g.prof(mid(p.dorsal))[0] + 0.02], p.dorsal, 12, g.rays.dorsal);
  if (p.dorsal2) draw(g.dorsal2, [mid(p.dorsal2), g.prof(mid(p.dorsal2))[0] + 0.02], p.dorsal2, 14, g.rays.dorsal2);
  if (p.gono) draw(g.anal, [p.gono.at, g.prof(p.gono.at)[1]], { tint: p.gono.tint, a: 0.85 }, 13, g.rays.anal);
  else if (p.anal && !(p.analSplit && !style.paired)) drawAnal(p, ctx, P, W); // a 3D fish's doubled anal: fish3d draws its two fins
  const paired = pairedFins(p);
  if (style.paired && paired[0]?.kind === 'pelvic') drawPairedFin(paired[0], ctx, P, W, ray);
  if (p.adipose) {
    const u = p.pedU + 0.07, b = g.prof(u)[0];
    fin(ctx, P, W, [[u + 0.03, b + 0.01], [u, b - 0.035, 'c'], [u - 0.03, b + 0.01]], [u, b], p.fin, ray, { rays: 0 });
  }
  const [t0, b0] = [Math.min(...g.bodyPts.map(q => q[1])), Math.max(...g.bodyPts.map(q => q[1]))];
  body(ctx, P, W, g.bodyPts, t0, b0, [[0, p.shade[0]], [0.4, p.shade[1]], [0.65, p.shade[1]], [1, p.shade[2]]], p.rim ?? 0.035, l => {
    paintMarks(l, P, W, p.marks, 7);
    if (p.shimmer) shimmer(l, P, W, p.pedU + 0.025, 1 - (1 - p.pedU) * 0.14, g.prof, p.shimmer, p.shimmerRgb);
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
/** The shrimp drawing's outline (shared by the card and the 3D body). */
const SHRIMP_OUTLINE: [number, number][] = [[1, -0.075], [0.86, -0.07], [0.78, -0.11], [0.6, -0.125], [0.42, -0.12], [0.28, -0.09], [0.16, -0.05], [0.13, 0.0],
  [0.16, 0.05], [0.28, 0.07], [0.42, 0.08], [0.6, 0.075], [0.75, 0.065], [0.84, 0.04], [0.86, -0.02]];
// stripeW: the back stripe's width (widths, default 0.007); ant: antenna colour and length (x the default)
interface ShrimpSpec { body: [string, string]; dots?: string; a?: number; glass?: number; dashes?: string; stripe?: string; stripeW?: number; ant?: [string, number]; back?: string } // back: a broad band over the upper flank
/** Outline depth at u: [top, bottom] (v), read off the drawing's outline. */
function shrimpSpan(u: number): [number, number] {
  const top = SHRIMP_OUTLINE.slice(0, 8).reverse(), bot = SHRIMP_OUTLINE.slice(7);
  const at = (pts: [number, number][]) => {
    for (let i = 1; i < pts.length; i++) { const [u0, v0] = pts[i - 1], [u1, v1] = pts[i]; if (u <= u1 || i === pts.length - 1) return v0 + (v1 - v0) * Math.min(1, Math.max(0, (u - u0) / (u1 - u0))); }
    return 0;
  };
  return [at(top), at(bot)];
}
/** Glass-shrimp markings (Amano): rows of broken dark dashes and dots along the flank, a pale stripe down the back. */
function shrimpMarks(ctx: Ctx, P: Proj, W: number, s: ShrimpSpec) {
  const r = rng(7);
  if (s.back) for (let i = 0; i < 40; i++) { const u = 0.17 + 0.68 * i / 40, [t, b] = shrimpSpan(u); soft(ctx, P, u, u + 0.03, t - 0.02, t + (b - t) * 0.42, s.back, 0.9, [0, 0], [0, 0.02]); }
  if (s.stripe) {
    ctx.strokeStyle = s.stripe; ctx.lineWidth = (s.stripeW ?? 0.007) * W; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const u = 0.2 + 0.62 * i / 40, [t, b] = shrimpSpan(u), [x, y] = P(u, t + (b - t) * 0.07); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  if (!s.dashes) return;
  ctx.strokeStyle = ctx.fillStyle = s.dashes; ctx.lineWidth = 0.0055 * W;
  for (const f of [0.38, 0.58, 0.78]) {
    for (let u = 0.2 + r() * 0.02; u < 0.8; ) {
      const [t, b] = shrimpSpan(u), v = t + (b - t) * f;
      if (r() < 0.35) { const [x, y] = P(u, v); ctx.beginPath(); ctx.arc(x, y, 0.0045 * W, 0, Math.PI * 2); ctx.fill(); u += 0.018 + r() * 0.012; continue; }
      const len = 0.012 + r() * 0.016, u1 = u + len, [t1, b1] = shrimpSpan(u1);
      ctx.beginPath(); ctx.moveTo(...P(u, v)); ctx.lineTo(...P(u1, t1 + (b1 - t1) * f)); ctx.stroke();
      u = u1 + 0.008 + r() * 0.014;
    }
  }
}
function drawShrimp(s: ShrimpSpec, ctx: Ctx, P: Proj, W: number) {
  if (!style.paired) return; // painted for the 3D shrimp: render/shrimp3d.ts builds and paints the whole animal, its card stays empty
  const leg = hexA(s.body[0], 0.75), limbs = true;
  ctx.strokeStyle = leg; ctx.lineWidth = 0.008 * W;
  if (limbs) for (let i = 0; i < 5; i++) { const u = 0.72 - i * 0.07, [x, y] = P(u, 0.05), [x2, y2] = P(u - 0.03, 0.16); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); }
  if (limbs) for (let i = 0; i < 4; i++) { const u = 0.42 - i * 0.07, [x, y] = P(u, 0.07), [x2, y2] = P(u - 0.02, 0.12); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); }
  fin(ctx, P, W, [[0.16, -0.03], [0.02, -0.075], [0, -0.06, 'c'], [0.03, 0.0], [0, 0.07, 'c'], [0.03, 0.08], [0.16, 0.05]], [0.14, 0.01], s.body[0], s.body[0], { a: s.glass ? 0.35 : 0.8, rays: 6 });
  const pts: Pt[] = SHRIMP_OUTLINE.map(([u, v], i) => (i ? [u, v] : [u, v, 'c']));
  body(ctx, P, W, pts, -0.125, 0.08, [[0, s.body[0]], [0.6, s.body[1]], [1, s.body[1]]], 0.03, l => {
    for (let i = 0; i < 5; i++) { const u = 0.62 - i * 0.09, [x, y0] = P(u, -0.13), [, y1] = P(u, 0.08); l.strokeStyle = 'rgba(30,10,10,0.14)'; l.lineWidth = 0.006 * W; l.beginPath(); l.moveTo(x, y0); l.quadraticCurveTo(x - 0.02 * W, (y0 + y1) / 2, x, y1); l.stroke(); }
    shrimpMarks(l, P, W, s);
    if (s.dots) for (let i = 0; i < 14; i++) blob(l, P, W, 0.2 + i * 0.045, 0.02 + (i % 2) * 0.012, 0.008, 0.005, s.dots, 0.8);
    soft(l, P, 0.2, 0.86, -0.13, -0.09, '#ffffff', 0.18, [0.05, 0.05], [0.01, 0.02]);
  });
  const [ac, al] = s.ant ?? [s.body[0], 1];
  ctx.strokeStyle = hexA(ac, 0.8); ctx.lineWidth = 0.004 * W;
  if (limbs) for (const k of [0, 1]) { const [x0, y0] = P(0.88, -0.07), [x1, y1] = P(0.88 - (0.58 + k * 0.12) * al, -0.17 + k * 0.02); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(...P(0.75, -0.2), x1, y1); ctx.stroke(); }
  if (style.features) eye(ctx, P, W, 0.86, -0.06, 0.018, ['#3a2a22', '#120c0a']);
}

const N = '#b9b8ad'; // neutral fin tint
/** A zigzag line as a thin polygon (a `poly` mark): n segments from u0 to u1, peaks at +/- amp, half-thickness t. */
const zigzag = (u0: number, u1: number, n: number, amp: number, t: number): [number, number][] => {
  const mid = Array.from({ length: n + 1 }, (_, i) => [u0 + (u1 - u0) * i / n, i % 2 ? amp : -amp] as [number, number]);
  return [...mid.map(([u, v]) => [u, v - t] as [number, number]), ...mid.reverse().map(([u, v]) => [u, v + t] as [number, number])];
};

export const PLANS: Record<string, Plan> = {
  cardinal: { shimmer: 0.8, shimmerRgb: '190,225,255', gillLine: 0.28, noseCap: 0.03, gape: 0.022, gapeDrop: 0.005, thick: 0.42, depth: 0.23, pedU: 0.18, ped: 0.03, peak: 0.64, snout: 0.55, shade: ['#4d5443', '#9aa39a', '#c7c4bc'], tail: { type: 'lyre', h: 0.14, cut: 0.5 }, fin: '#b7c0bd',
    // characin fins: dorsal mid-back, tall in front; anal on a long base, tallest in front
    dorsal: { at: 0.62, len: 0.06, h: 0.09, rake: 0.12, taper: 0.4, lead: 0.6, tip: 'point', trail: 0.05, drop: 0.2 }, anal: { at: 0.48, len: 0.21, h: 0.05, rake: 0.05, lead: 0.9, drop: 0.5, trail: 0.01 }, adipose: true, pelvic: { u: 0.62, len: 0.06 },
    // Cardinal: the red band runs the whole length of the lower flank (thicker than the neon's), the blue line is the same length; silvery sheen at the belly edge
    marks: [
      { k: 'band', u0: 0.17, u1: 0.95, v0: -0.005, v1: 0.2, c: '#c02f38', a: 0.95, f: 0.012 },
      { k: 'band', u0: 0.2, u1: 0.93, v0: 0.12, v1: 0.2, c: '#e8a0a0', a: 0.28, f: 0.03 },  // paler, translucent red toward the belly
      { k: 'band', u0: 0.2, u1: 0.8, v0: -0.115, v1: -0.07, c: '#33402f', a: 0.35, f: 0.016 },
      { k: 'band', u0: 0.2, u1: 0.94, v0: -0.082, v1: 0.004, c: '#5ac8ff', a: 0.2, f: 0.02 },
      { k: 'band', u0: 0.22, u1: 0.93, v0: -0.062, v1: -0.014, c: '#2f7ff0', a: 1, f: 0.008 },
      { k: 'band', u0: 0.28, u1: 0.9, v0: -0.052, v1: -0.03, c: '#78d6ff', a: 0.85, f: 0.006 }],
    eye: { r: 0.026, iris: ['#b9ccd2', '#4c5c63'] } },
  // neon: was hand-drawn (drawTetra); outline, fins and colours taken from that drawing
  tetra: { shimmer: 0.8, shimmerRgb: '190,225,255', gillLine: 0.28, noseCap: 0.03, gape: 0.022, gapeDrop: 0.005, thick: 0.42, depth: 0.22, pedU: 0.18, ped: 0.03, peak: 0.66, snout: 0.6, shade: ['#56604a', '#a4ada2', '#dcdad2'], tail: { type: 'lyre', h: 0.15, cut: 0.5 }, fin: '#aebbb8',
    dorsal: { at: 0.62, len: 0.06, h: 0.085, rake: 0.12, taper: 0.4, lead: 0.6, tip: 'point', trail: 0.05, drop: 0.2 }, anal: { at: 0.48, len: 0.2, h: 0.045, rake: 0.05, lead: 0.9, drop: 0.5, trail: 0.01 }, adipose: true, pelvic: { u: 0.6, len: 0.05 },
    // Reference (Wikimedia Commons, Neonsalmler 19/Portraet 3): a thin, glowing blue line from the eye to the adipose fin; the red band only on the
    // rear half of the lower flank; a silvery, translucent belly under and ahead of it; a dark olive back.
    marks: [
      { k: 'band', u0: 0.22, u1: 0.93, v0: 0.05, v1: 0.17, c: '#f1f4f1', a: 0.5, f: 0.03 },    // silver translucent belly
      { k: 'band', u0: 0.16, u1: 0.5, v0: 0.012, v1: 0.105, c: '#d2323c', a: 0.95, f: 0.012 }, // red band, rear half, rounded at its front
      { k: 'blob', u: 0.5, v: 0.0585, ru: 0.095, rv: 0.0465, c: '#d2323c', a: 0.95 },
      { k: 'band', u0: 0.2, u1: 0.8, v0: -0.115, v1: -0.07, c: '#33402f', a: 0.35, f: 0.016 }, // darker back
      { k: 'band', u0: 0.2, u1: 0.94, v0: -0.075, v1: 0.004, c: '#5ac8ff', a: 0.2, f: 0.02 },  // glow around the stripe
      { k: 'band', u0: 0.2, u1: 0.94, v0: -0.054, v1: -0.014, c: '#2f7ff0', a: 1, f: 0.008 }, // blue stripe
      { k: 'band', u0: 0.26, u1: 0.9, v0: -0.045, v1: -0.027, c: '#78d6ff', a: 0.85, f: 0.006 }], // bright core
    eye: { r: 0.024, iris: ['#b9ccd2', '#4c5c63'] } },
  // Ember tetra (Hyphessobrycon amandae): luminous copper/orange, rounded snout, clear warm fins.
  // The shape and coloration describe a well-colored adult; adult total length is kept in species.json.
  ember: { noseCap: 0.022, gape: 0.018, gapeDrop: 0.004, thick: 0.42, sectionExp: 2.05, gillLine: 0.34, shimmer: 0.7, drape: 0.014,
    depth: 0.245, pedU: 0.2, ped: 0.034, peak: 0.61, snout: 0.6,
    shade: ['#9e3b22', '#ed722f', '#f2b57b'], tail: { type: 'fork', h: 0.15, tint: '#df7b45', a: 0.72 }, fin: '#dd925f', ray: '#994d30',
    dorsal: { at: 0.61, len: 0.068, h: 0.11, rake: 0.12, taper: 0.4, lead: 0.6, tip: 'point', trail: 0.05, drop: 0.2, tint: '#e78240', a: 0.82 },
    anal: { at: 0.5, len: 0.24, h: 0.057, rake: 0.05, lead: 0.9, drop: 0.5, trail: 0.01, tint: '#d4774d', a: 0.7 },
    adipose: true, pelvic: { u: 0.6, len: 0.06, tint: '#dda06d' }, pec: { s: 0.85, tint: '#e6b184' },
    marks: [
      { k: 'blob', u: 0.67, v: 0.006, ru: 0.25, rv: 0.085, c: '#ffc765', a: 0.5 }, // luminous gold through the flank
      { k: 'band', u0: 0.42, u1: 0.95, v0: 0.068, v1: 0.165, c: '#fce2ae', a: 0.4, f: 0.035 }, // translucent lower body
      { k: 'blob', u: 0.855, v: 0.047, ru: 0.065, rv: 0.073, c: '#b74824', a: 0.25 }, // flush around gill plate
      { k: 'band', u0: 0.22, u1: 0.74, v0: -0.105, v1: -0.076, c: '#a34524', a: 0.25, f: 0.014 }, // darkened back line
    ],
    eye: { r: 0.031, u: 0.905, dv: -0.02, iris: ['#f2c889', '#60301c'] } },
  rummynose: { gape: 0.022, gapeDrop: 0.005, thick: 0.42, depth: 0.21, pedU: 0.2, ped: 0.028, peak: 0.66, snout: 0.45, shade: ['#8b927f', '#c9cdc2', '#e2e1da'], tail: { type: 'fork', h: 0.14 }, fin: '#c8ccc5',
    dorsal: { at: 0.61, len: 0.06, h: 0.09, rake: 0.12, taper: 0.4, lead: 0.6, tip: 'point', trail: 0.05, drop: 0.2 }, anal: { at: 0.47, len: 0.21, h: 0.045, rake: 0.05, lead: 0.9, drop: 0.5, trail: 0.01 }, adipose: true, pelvic: { u: 0.62, len: 0.05 },
    marks: [{ k: 'blob', u: 0.93, v: -0.01, ru: 0.09, rv: 0.08, c: '#c4303a', a: 0.95 }],
    finMarks: [{ k: 'bars', us: [0.04, 0.12], w: 0.035, c: '#1e1e20', a: 0.85 }, { k: 'band', u0: 0, u1: 0.2, v0: -0.012, v1: 0.012, c: '#1e1e20', a: 0.85, f: 0.005 }],
    eye: { r: 0.024, iris: ['#d26a54', '#5a1e18'] } },
  // dwarf pencilfish (Nannostomus marginatus): slim cigar, pointed head and tiny mouth, no adipose; a broad black stripe snout to
  // tail with a gold line above and below it, red along the top of the stripe mid-body, a lower black belly stripe; red in the dorsal,
  // anal and pelvic fins (reference photos 2026-10-22)
  dwarfpencil: { noseCap: 0.02, gape: 0.014, gapeDrop: 0.002, thick: 0.42, depth: 0.19, pedU: 0.19, ped: 0.034, peak: 0.56, back: 0.5, snout: 0.58, mouth: -0.012,
    shade: ['#5e4e32', '#b89a62', '#f5f2ea'], tail: { type: 'fork', h: 0.135, tint: '#d6cbb6', a: 0.8 }, fin: '#e2d9c8',
    dorsal: { at: 0.6, len: 0.07, h: 0.085, rake: 0.15, taper: 0.45, lead: 0.6, tip: 'point', trail: 0.04, drop: 0.25, tint: '#d63a2a', a: 0.7 },
    anal: { at: 0.4, len: 0.08, h: 0.06, rake: 0.1, lead: 0.85, drop: 0.45, trail: 0.02, tint: '#d63a2a', a: 0.8, edge: '#1a1614' },
    pelvic: { u: 0.55, len: 0.05, tint: '#d8442e' }, pec: { s: 0.7, tint: '#efe8da' },
    marks: [
      { k: 'band', u0: 0.18, u1: 0.95, v0: -1, v1: -0.05, c: '#4a3c24', a: 0.5, f: 0.02 },
      { k: 'band', u0: 0.2, u1: 0.95, v0: -0.054, v1: -0.04, c: '#2a2016', a: 0.7, f: 0.006 },
      { k: 'band', u0: 0.19, u1: 0.97, v0: -0.04, v1: -0.016, c: '#e8c454', a: 0.95, f: 0.005 },
      { k: 'band', u0: 0.3, u1: 0.84, v0: -0.036, v1: -0.012, c: '#c8302a', a: 0.8, f: 0.016 },
      { k: 'band', u0: 0.15, u1: 1, v0: -0.016, v1: 0.02, c: '#15110e', a: 1, f: 0.004 },
      { k: 'band', u0: 0.2, u1: 0.93, v0: 0.02, v1: 0.032, c: '#f1dc98', a: 0.9, f: 0.004 },
      { k: 'band', u0: 0.15, u1: 1, v0: 0.032, v1: 1, c: '#f6f3ec', a: 0.85, f: 0.01 },
      { k: 'band', u0: 0.34, u1: 0.78, v0: 0.046, v1: 0.056, c: '#221a14', a: 0.75, f: 0.008 }],
    finMarks: [{ k: 'blob', u: 0.17, v: 0.012, ru: 0.02, rv: 0.02, c: '#c8302a', a: 0.55 }],
    eye: { r: 0.026, iris: ['#d9c27a', '#4a3018'] }, scale: 0.014 },
  // rhomboid: deep at the shoulder, straight back and belly lines to a slender peduncle; the black patch a triangular rear-body wedge
  harlequin: { sharp: true, thick: 0.38, depth: 0.33, pedU: 0.2, ped: 0.03, peak: 0.58, angular: 0.7, snout: 0.3, shade: ['#8a6f58', '#d29a7c', '#e8c3ad'], tail: { type: 'fork', h: 0.16, tint: '#d79c82' }, fin: '#d6a48c',
    dorsal: { u0: 0.47, u1: 0.6, h: 0.09 }, anal: { u0: 0.33, u1: 0.47, h: 0.06 }, pelvic: { u: 0.6, len: 0.06 },
    marks: [{ k: 'poly', pts: [[0.62, -0.115, 'c'], [0.6, -0.02], [0.61, 0.075, 'c'], [0.19, 0.004, 'c']], c: '#1f1d22', a: 0.9 }], eye: { r: 0.03, iris: ['#c8b8a0', '#55483a'] } },
  chili: { noseCap: 0.03, gape: 0.02, gapeDrop: 0.005, thick: 0.42, depth: 0.21, pedU: 0.2, ped: 0.03, peak: 0.58, snout: 0.6, shade: ['#a5402e', '#d4563c', '#e07a5c'], tail: { type: 'fork', h: 0.13, tint: '#c95a44' }, fin: '#cf7056',
    dorsal: { at: 0.53, len: 0.06, h: 0.08, rake: 0.3, lead: 0.6, tip: 'point', trail: 0.045, drop: 0.2 }, anal: { at: 0.45, len: 0.1, h: 0.055, rake: 0.05, lead: 0.85, tip: 'point', trail: 0.03, drop: 0.35 }, pelvic: { u: 0.56, len: 0.05 },
    marks: [{ k: 'band', u0: 0.22, u1: 0.85, v0: -0.012, v1: 0.012, c: '#2a1a18', a: 0.7, f: 0.01 }, { k: 'blob', u: 0.24, v: 0, ru: 0.03, rv: 0.025, c: '#1a1212', a: 0.8 }],
    eye: { r: 0.03, iris: ['#d07050', '#4a1a12'] } },
  danio: { gape: 0.032, gapeDrop: 0.012, barbels: 0.018, thick: 0.5, depth: 0.19, pedU: 0.18, ped: 0.032, peak: 0.55, snout: 0.4, mouth: -0.025, shade: ['#9a9a7c', '#d6d2bc', '#ece8d8'], tail: { type: 'fork', h: 0.12 }, fin: N,
    dorsal: { at: 0.5, len: 0.11, h: 0.07, rake: 0.3, lead: 0.7, drop: 0.5, trail: 0.02 }, anal: { at: 0.49, len: 0.2, h: 0.065, rake: 0.2, lead: 0.75, drop: 0.45, trail: 0.02 }, pelvic: { u: 0.58, len: 0.05 },
    marks: [-0.055, -0.015, 0.025, 0.065].map(v => ({ k: 'band' as const, u0: 0.2, u1: 0.9, v0: v - 0.012, v1: v + 0.012, c: '#2b4f8c', a: 0.9, f: 0.008 })),
    finMarks: [-0.03, 0, 0.03].map(v => ({ k: 'band' as const, u0: 0.0, u1: 0.25, v0: v - 0.007, v1: v + 0.007, c: '#2b4f8c', a: 0.8, f: 0.004 })),
    eye: { r: 0.026, iris: ['#c9c2a6', '#4e4a3c'] } },
  cherrybarb: { gape: 0.025, gapeDrop: 0.006, thick: 0.4, depth: 0.26, pedU: 0.2, ped: 0.04, peak: 0.6, snout: 0.5, shade: ['#8a3a2a', '#c4473a', '#d97a62'], tail: { type: 'fork', h: 0.15, tint: '#c25a48' }, fin: '#c96b58',
    dorsal: { at: 0.61, len: 0.12, h: 0.12, rake: 0.2, lead: 0.6, tip: 'point', trail: 0.05, drop: 0.25 }, anal: { at: 0.44, len: 0.11, h: 0.075, rake: 0.2, lead: 0.7, tip: 'point', trail: 0.035, drop: 0.3 }, pelvic: { u: 0.58, len: 0.07, w: 1.2 },
    marks: [{ k: 'band', u0: 0.2, u1: 0.9, v0: -0.01, v1: 0.012, c: '#4a1d16', a: 0.6, f: 0.01 }], eye: { r: 0.03, iris: ['#c9a080', '#4a2a1a'] } },
  tigerbarb: { thick: 0.38, depth: 0.42, pedU: 0.2, ped: 0.05, peak: 0.5, snout: 0.45, shade: ['#8c7a45', '#d8b670', '#ecd7a4'], tail: { type: 'fork', h: 0.17, tint: '#d07a4a', edge: '#c23a28' }, fin: '#d3a274',
    dorsal: { at: 0.64, len: 0.15, h: 0.17, rake: 0.15, lead: 0.6, tip: 'point', trail: 0.06, drop: 0.25, tint: '#1f1f1f', a: 0.85, edge: '#c23a28' }, anal: { at: 0.44, len: 0.13, h: 0.1, rake: 0.2, lead: 0.7, tip: 'point', trail: 0.04, drop: 0.3 }, pelvic: { u: 0.6, len: 0.11, w: 1.5, tint: '#c4442e' }, pec: { s: 1.3 },
    marks: [{ k: 'bars', us: [0.9, 0.67, 0.45, 0.24], w: 0.06, c: '#1c1c1e', a: 0.92 }], eye: { r: 0.032, iris: ['#cf6a3a', '#4a2010'] } },
  // male: the anal fin is a gonopodium; small upturned mouth
  guppy: { gape: 0.035, gapeDrop: 0.008, thick: 0.45, depth: 0.2, pedU: 0.4, ped: 0.04, peak: 0.45, snout: 0.4, mouth: -0.03, shade: ['#7c8476', '#bfc4b8', '#ddddd2'], tail: { type: 'notch', h: 0.27, tint: '#e0782e', a: 0.85 }, fin: '#c6a37a',
    dorsal: { u0: 0.42, u1: 0.58, h: 0.09, tint: '#7fa6c6' }, gono: { at: 0.57, len: 0.11 }, pelvic: { u: 0.65, len: 0.04 },
    marks: [{ k: 'blob', u: 0.55, v: 0, ru: 0.06, rv: 0.05, c: '#2d6fb0', a: 0.8 }, { k: 'blob', u: 0.47, v: 0.01, ru: 0.03, rv: 0.03, c: '#1a1a1a', a: 0.8 }, { k: 'blob', u: 0.68, v: 0.02, ru: 0.06, rv: 0.04, c: '#e0884a', a: 0.7 }],
    finMarks: [{ k: 'band', u0: 0, u1: 0.2, v0: -0.3, v1: 0.3, c: '#3a6ab8', a: 0.55, f: 0.08 }, { k: 'spots', n: 26, u0: 0.04, u1: 0.38, v0: -0.24, v1: 0.24, r: 0.014, c: '#2a2a40', a: 0.6 }],
    eye: { r: 0.026, iris: ['#c9b890', '#4a3e2c'] } },
  // male: the anal fin is a gonopodium (platy_f keeps the anal fin; same body)
  platy: { gape: 0.03, gapeDrop: 0.008, thick: 0.5, depth: 0.36, pedU: 0.21, ped: 0.06, peak: 0.45, snout: 0.6, mouth: -0.03, shade: ['#b0482a', '#de6a3a', '#eb9a6a'], tail: { type: 'round', h: 0.17, tint: '#d87850' }, fin: '#da8a62',
    dorsal: { at: 0.62, len: 0.2, h: 0.12, rake: 0.35, lead: 0.6, drop: 0.6, trail: 0.04 }, gono: { at: 0.52, len: 0.12 }, anal: { at: 0.5, len: 0.1, h: 0.07, rake: 0.3, lead: 0.7, tip: 'point', trail: 0.03, drop: 0.4 }, pelvic: { u: 0.62, len: 0.06 },
    eye: { r: 0.034, iris: ['#cfb890', '#4a3e2c'] } },
  // male: the anal fin is a gonopodium (molly_f keeps the anal fin; same body)
  molly: { gape: 0.032, gapeDrop: 0.008, thick: 0.5, depth: 0.31, pedU: 0.24, ped: 0.065, peak: 0.45, snout: 0.55, mouth: -0.035, shade: ['#141416', '#232427', '#33353a'], tail: { type: 'round', h: 0.18, tint: '#2a2b30', a: 0.75 }, fin: '#2d2e33',
    dorsal: { at: 0.64, len: 0.28, h: 0.12, rake: 0.55, lead: 0.5, drop: 0.7, trail: 0.05, a: 0.75 }, gono: { at: 0.53, len: 0.13 }, anal: { at: 0.5, len: 0.1, h: 0.07, rake: 0.3, lead: 0.7, tip: 'point', trail: 0.03, drop: 0.4 }, pelvic: { u: 0.62, len: 0.05 },
    marks: [{ k: 'blob', u: 0.6, v: -0.02, ru: 0.15, rv: 0.08, c: '#6a7080', a: 0.18 }], eye: { r: 0.03, iris: ['#9a8a6a', '#2a2418'] } },
  // male: long slim body, gonopodium, upturned mouth, the sword the lower caudal rays drawn out
  swordtail: { gape: 0.03, gapeDrop: 0.008, thick: 0.45, depth: 0.16, pedU: 0.45, ped: 0.035, peak: 0.45, snout: 0.4, mouth: -0.025, shade: ['#a63a2a', '#d4553a', '#e4886a'], tail: { type: 'sword', h: 0.11, sword: 0.3, tint: '#d26a48' }, fin: '#d07a58',
    dorsal: { u0: 0.58, u1: 0.7, h: 0.07 }, gono: { at: 0.69, len: 0.09 }, pelvic: { u: 0.74, len: 0.04 },
    finMarks: [{ k: 'band', u0: 0, u1: 0.33, v0: 0.062, v1: 0.09, c: '#1c1c1c', a: 0.85, f: 0.006 }], eye: { r: 0.022, iris: ['#cfb890', '#4a3e2c'] } },
  // anal fin from just behind the pelvics back to the peduncle, long pointed pelvics, upturned jaw
  betta: { drape: 0.03, gape: 0.04, gapeDrop: 0.008, thick: 0.45, depth: 0.24, pedU: 0.36, ped: 0.08, peak: 0.4, snout: 0.5, mouth: -0.035, shade: ['#4a1428', '#8a1f34', '#a33a44'], tail: { type: 'veil', h: 0.38, tint: '#9c2236', a: 0.92 }, fin: '#a02a3c', ray: '#5a0f1c',
    dorsal: { at: 0.56, len: 0.2, h: 0.2, rake: 0.65, trail: 0.1, drop: 0.6, a: 0.8 }, anal: { at: 0.65, len: 0.3, h: 0.24, rake: 0.75, trail: 0.1, drop: 0.7, a: 0.8 },
    pelvic: { u: 0.69, len: 0.15, ext: 0.05, w: 0.6, tint: '#9c2236' },
    marks: [{ k: 'spots', n: 60, u0: 0.38, u1: 0.85, v0: -0.08, v1: 0.08, r: 0.01, c: '#4f7fb8', a: 0.35 }],
    finMarks: [{ k: 'spots', n: 60, u0: 0, u1: 0.6, v0: -0.4, v1: 0.4, r: 0.015, c: '#4f7fb8', a: 0.25 }],
    eye: { r: 0.03, iris: ['#7a3030', '#1a0808'] } },
  // pearl gourami: was hand-drawn (drawGourami); outline, fins and markings taken from that drawing
  gourami: { thick: 0.32, depth: 0.39, pedU: 0.17, ped: 0.08, peak: 0.45, snout: 0.55, mouth: -0.045, shade: ['#5e5644', '#a09274', '#d3c6a8'], tail: { type: 'round', h: 0.16, tint: '#a8987a' }, fin: '#a8987a', ray: '#73654f',
    // short dorsal set back, pointed in the male; anal from behind the pelvics to the peduncle, its rear rays drawn out in a fringe
    dorsal: { at: 0.5, len: 0.26, h: 0.1, spines: 0.35, nSp: 5, spineH: [0.05, 0.07], notch: 0.3, tip: 'point', trail: 0.14, drop: 0.9, rake: 0.6 },
    anal: { at: 0.7, len: 0.5, h: 0.11, spines: 0.4, nSp: 7, spineH: [0.03, 0.07], notch: 0.18, rake: 0.7, tip: 'point', trail: 0.07, fringe: true, edge: '#c87a3e' }, pelvic: { u: 0.72, len: 0.4, thread: true, tint: '#c8b48a' },
    marks: [{ k: 'blob', u: 0.78, v: 0.15, ru: 0.2, rv: 0.09, c: '#cc5a22', a: 1 }, { k: 'spots', n: 200, u0: 0.18, u1: 0.88, v0: -0.2, v1: 0.12, r: 0.009, c: '#f2eadb', a: 0.9 },
      { k: 'poly', pts: zigzag(0.86, 0.21, 13, 0.01, 0.006), c: '#2a251d', a: 0.6 }, { k: 'blob', u: 0.215, v: 0, ru: 0.03, rv: 0.03, c: '#2a251d', a: 0.7 }],
    finMarks: [{ k: 'spots', n: 110, u0: 0.02, u1: 0.62, v0: -0.27, v1: 0.27, r: 0.009, c: '#f2eadb', a: 0.6 }],
    eye: { r: 0.024, iris: ['#d0b48a', '#5e4a2e'] } },
  dwarfgourami: { thick: 0.32, depth: 0.42, pedU: 0.2, ped: 0.06, peak: 0.5, snout: 0.55, mouth: -0.045, shade: ['#2f5c8a', '#c25a3a', '#d47a54'], tail: { type: 'round', h: 0.17, tint: '#c6603e' }, fin: '#c86a4a',
    // gourami fins: long bases, low spiny fronts deepening to the rear; the male's soft dorsal and anal end in points
    dorsal: { at: 0.62, len: 0.38, h: 0.1, spines: 0.6, nSp: 7, spineH: [0.035, 0.07], notch: 0.18, tip: 'point', trail: 0.07, rake: 0.6, edge: '#3c74b0' },
    anal: { at: 0.68, len: 0.46, h: 0.12, spines: 0.5, nSp: 7, spineH: [0.03, 0.08], notch: 0.18, tip: 'point', trail: 0.06, rake: 0.65, edge: '#3c74b0' }, pelvic: { u: 0.72, len: 0.4, thread: true, tint: '#d68a5a' },
    marks: [0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8].map(u => ({ k: 'band' as const, u0: u, u1: u + 0.035, v0: -0.25, v1: 0.25, c: '#3a78b8', a: 0.75, f: 0.01 })),
    finMarks: [{ k: 'spots', n: 40, u0: 0.05, u1: 0.7, v0: -0.35, v1: 0.35, r: 0.012, c: '#3a78b8', a: 0.6 }],
    eye: { r: 0.032, iris: ['#c8603a', '#3a1a10'] } },
  honeygourami: { thick: 0.32, depth: 0.38, pedU: 0.2, ped: 0.06, peak: 0.5, snout: 0.55, mouth: -0.045, shade: ['#b06a2a', '#e09a42', '#eabc78'], tail: { type: 'round', h: 0.15, tint: '#dca064' }, fin: '#dca064',
    dorsal: { at: 0.6, len: 0.36, h: 0.085, spines: 0.6, nSp: 6, spineH: [0.03, 0.06], notch: 0.18, tip: 'point', trail: 0.05, rake: 0.6 },
    anal: { at: 0.67, len: 0.45, h: 0.1, spines: 0.5, nSp: 6, spineH: [0.03, 0.07], notch: 0.18, tip: 'point', trail: 0.05, rake: 0.65, edge: '#3a3020' }, pelvic: { u: 0.7, len: 0.3, thread: true, tint: '#e0a868' },
    marks: [{ k: 'band', u0: 0.7, u1: 1, v0: 0.04, v1: 0.26, c: '#4a3a30', a: 0.42, f: 0.14 }, { k: 'blob', u: 0.84, v: 0.14, ru: 0.09, rv: 0.07, c: '#3a2e2a', a: 0.35 }], eye: { r: 0.03, iris: ['#d08a40', '#4a2a10'] } },
  gbr: { thick: 0.36, depth: 0.44, pedU: 0.22, ped: 0.06, peak: 0.5, snout: 0.55, shade: ['#6b7a5a', '#b8b46a', '#d8c088'], tail: { type: 'round', h: 0.17, tint: '#b0907a' }, fin: '#b89a80',
    // dorsal from over the gill cover to the peduncle: tall black front spines (male), soft rear drawn out to a point
    dorsal: { at: 0.8, len: 0.52, h: 0.12, spines: 0.5, nSp: 8, spineH: [0.17, 0.08], tip: 'point', trail: 0.07, edge: '#c8443a' },
    anal: { at: 0.52, len: 0.27, h: 0.1, spines: 0.25, nSp: 3, spineH: [0.04, 0.07], tip: 'point', trail: 0.05 }, pelvic: { u: 0.67, len: 0.11, ext: 0.07, tint: '#c84a3a' },
    marks: [{ k: 'blob', u: 0.86, v: -0.02, ru: 0.12, rv: 0.12, c: '#e0b04a', a: 0.7 }, { k: 'bars', us: [0.87], w: 0.04, c: '#1a1a1e', a: 0.85 },
      { k: 'blob', u: 0.62, v: -0.04, ru: 0.05, rv: 0.06, c: '#1a1a1e', a: 0.75 }, { k: 'spots', n: 70, u0: 0.25, u1: 0.8, v0: -0.15, v1: 0.15, r: 0.012, c: '#5aa0d8', a: 0.75 }],
    finMarks: [{ k: 'spots', n: 50, u0: 0, u1: 0.65, v0: -0.4, v1: 0.4, r: 0.01, c: '#5aa0d8', a: 0.55 }, { k: 'band', u0: 0.66, u1: 0.8, v0: -0.6, v1: -0.2, c: '#1a1a1e', a: 0.85, f: 0.02 }],
    eye: { r: 0.032, iris: ['#c8443a', '#4a1210'] } },
  bolivianram: { thick: 0.36, depth: 0.38, pedU: 0.22, ped: 0.055, peak: 0.5, snout: 0.5, shade: ['#6a6450', '#b8ae8a', '#d8cfb0'], tail: { type: 'lyre', h: 0.17, tint: '#c2a890', cut: 0.42 }, fin: '#c2ac94',
    // raised front spines, soft rear to a point; a shallow tail fork with the outer rays drawn out; long pelvics
    dorsal: { at: 0.8, len: 0.54, h: 0.11, spines: 0.55, nSp: 9, spineH: [0.15, 0.075], tip: 'point', trail: 0.06, edge: '#c8443a' },
    anal: { at: 0.5, len: 0.26, h: 0.1, spines: 0.25, nSp: 3, spineH: [0.04, 0.07], tip: 'point', trail: 0.05 }, pelvic: { u: 0.67, len: 0.11, ext: 0.08, tint: '#d26a52' },
    marks: [{ k: 'blob', u: 0.58, v: -0.01, ru: 0.04, rv: 0.04, c: '#1a1a1e', a: 0.8 }, { k: 'bars', us: [0.87], w: 0.03, c: '#2a2a2c', a: 0.7 }, { k: 'blob', u: 0.8, v: 0.1, ru: 0.12, rv: 0.06, c: '#e8a868', a: 0.5 }],
    eye: { r: 0.03, iris: ['#c8443a', '#4a1210'] } },
  kribensis: { thick: 0.45, belly: 0.2, depth: 0.27, pedU: 0.2, ped: 0.05, peak: 0.55, snout: 0.45, shade: ['#5c5848', '#b3aa90', '#d8b8a8'], tail: { type: 'notch', h: 0.15, tint: '#c8ac6a' }, fin: '#c0a674',
    // dorsal over the gill cover to the peduncle, low spiny front; the male's soft dorsal and anal drawn out to points
    dorsal: { at: 0.8, len: 0.56, h: 0.09, spines: 0.6, nSp: 9, spineH: [0.05, 0.065], notch: 0.25, tip: 'point', trail: 0.09, rake: 0.6, edge: '#c8443a' },
    anal: { at: 0.5, len: 0.27, h: 0.09, spines: 0.25, nSp: 3, spineH: [0.035, 0.06], tip: 'point', trail: 0.08 }, pelvic: { u: 0.66, len: 0.1, ext: 0.03, tint: '#7a4ca0' },
    marks: [{ k: 'band', u0: 0.2, u1: 0.92, v0: -0.02, v1: 0.02, c: '#2a2620', a: 0.8, f: 0.012 }, { k: 'blob', u: 0.62, v: 0.1, ru: 0.15, rv: 0.06, c: '#d0405a', a: 0.75 }],
    finMarks: [{ k: 'blob', u: 0.3, v: -0.17, ru: 0.025, rv: 0.025, c: '#1a1a1a', a: 0.85 }], eye: { r: 0.028, iris: ['#c8a050', '#3a2a10'] } },
  discus: { scale: 0.014, thick: 0.2, depth: 0.78, pedU: 0.13, ped: 0.07, peak: 0.45, snout: 0.85, mouth: 0.02, shade: ['#5a6a7a', '#3f8aa8', '#4a98b0'], tail: { type: 'notch', h: 0.14, tint: '#6a8a9a' }, fin: '#5a8698',
    // dorsal and anal follow the disc from behind the head and the pelvics round to the tail root
    dorsal: { at: 0.8, len: 0.64, h: 0.075, spines: 0.35, nSp: 7, spineH: [0.03, 0.06], notch: 0.15, rake: 0.75, trail: 0.05, drop: 0.85, edge: '#c8603a' },
    anal: { at: 0.7, len: 0.54, h: 0.075, spines: 0.2, nSp: 4, spineH: [0.03, 0.06], notch: 0.15, rake: 0.75, trail: 0.05, drop: 0.85, edge: '#c8603a' }, pelvic: { u: 0.72, len: 0.12, tint: '#c8603a' }, gape: 0.03,
    marks: [{ k: 'bars', us: [0.88, 0.2], w: 0.035, c: '#2a2a30', a: 0.55 }, ...[-0.3, -0.21, -0.12, -0.03, 0.06, 0.15, 0.24].map(v => ({ k: 'band' as const, u0: 0.12, u1: 0.98, v0: v, v1: v + 0.032, c: '#8a5a3a', a: 0.6, wave: 0.002 }))],
    eye: { r: 0.03, iris: ['#d04a2a', '#4a1208'] }, rim: 0.03 },
  angel: { thick: 0.2, angular: 0.8, depth: 0.78, pedU: 0.2, ped: 0.045, peak: 0.375, snout: 0.25, shade: ['#9a998e', '#d0cec2', '#e4e1d7'], tail: { type: 'notch', h: 0.24, tint: '#c3c4bc' }, fin: '#c3c4bc',
    // dorsal and anal: long bases, the spines stepping up the leading edge, the soft rays sweeping back to high trailing tips
    dorsal: { at: 0.68, len: 0.42, h: 0.42, spines: 0.3, nSp: 5, spineH: [0.04, 0.11], notch: 0.12, rake: 0.9, tip: 'point', trail: 0.13, drop: 1 },
    anal: { at: 0.66, len: 0.4, h: 0.4, spines: 0.25, nSp: 4, spineH: [0.04, 0.1], notch: 0.12, rake: 0.9, tip: 'point', trail: 0.13, drop: 1 }, pelvic: { u: 0.74, len: 0.45, thread: true, tint: '#e2ddcc', angle: 68 },
    marks: [{ k: 'blob', u: 0.86, v: -0.15, ru: 0.09, rv: 0.07, c: '#c4a46a', a: 0.45 }, { k: 'blob', u: 0.6, v: -0.06, ru: 0.22, rv: 0.2, c: '#ffffff', a: 0.14 },
      { k: 'bars', us: [0.865, 0.645, 0.43], w: 0.05, c: '#26262a', a: 0.9 }, { k: 'bars', us: [0.235], w: 0.06, c: '#26262a', a: 0.5 }],
    finMarks: [{ k: 'bars', us: [0.645, 0.43], w: 0.05, c: '#26262a', a: 0.8 }], eye: { r: 0.026, iris: ['#c8673f', '#5b2a1c'] } },
  // v2 body (lane S); colours from Nathan's reference photo (red tiger oscar): olive-grey head and upper front, near-black
  // rear body, many small orange spots, orange throat and gill cover; nose rounded slightly (noseCap)
  oscar: { noseCap: 0.02, gape: 0.07, pec: { s: 1.6 }, thick: 0.48, depth: 0.42, pedU: 0.2, ped: 0.07, peak: 0.5, snout: 0.45, mouth: 0.025, shade: ['#3c3f31', '#1b1c17', '#2c241a'], tail: { type: 'round', h: 0.16, tint: '#1f201c', a: 0.9 }, fin: '#1f201c',
    dorsal: { at: 0.76, len: 0.52, h: 0.11, spines: 0.6, nSp: 9, spineH: [0.05, 0.07], notch: 0.3, rake: 0.6, trail: 0.05, a: 0.9 },
    anal: { at: 0.48, len: 0.26, h: 0.1, spines: 0.25, nSp: 3, spineH: [0.04, 0.06], rake: 0.5, trail: 0.04, a: 0.9 }, pelvic: { u: 0.64, len: 0.1, w: 1.2 },
    marks: [{ k: 'blob', u: 0.42, v: 0.04, ru: 0.34, rv: 0.25, c: '#0e0f0c', a: 0.8 }, { k: 'blob', u: 0.85, v: -0.05, ru: 0.21, rv: 0.16, c: '#8f9274', a: 0.85 }, { k: 'blob', u: 0.95, v: 0.0, ru: 0.06, rv: 0.06, c: '#b0a878', a: 0.7 },
      { k: 'blob', u: 0.86, v: 0.13, ru: 0.12, rv: 0.08, c: '#d8913c', a: 0.8 }, { k: 'spots', n: 30, u0: 0.72, u1: 0.83, v0: -0.03, v1: 0.15, r: 0.011, c: '#e2742a', a: 0.9 },
      { k: 'spots', n: 80, u0: 0.29, u1: 0.74, v0: -0.09, v1: 0.17, r: 0.01, c: '#ec8a2c', a: 0.9 }, { k: 'spots', n: 9, u0: 0.32, u1: 0.65, v0: -0.02, v1: 0.15, r: 0.022, c: '#e07a28', a: 0.85 },
      { k: 'blob', u: 0.24, v: -0.02, ru: 0.04, rv: 0.04, c: '#e2802a', a: 0.95 }, { k: 'blob', u: 0.24, v: -0.02, ru: 0.022, rv: 0.022, c: '#141414', a: 0.95 }],
    eye: { r: 0.03, iris: ['#b8743c', '#2e1a0a'] } },
  // fantail (Nathan 2026-10-14): egg-shaped body, a paired double caudal that splits and spreads sideways (seen from above), larger paired fins
  goldfish: { analSplit: 45, thick: 0.68, depth: 0.52, pedU: 0.32, ped: 0.06, peak: 0.45, snout: 0.75, shade: ['#c8642a', '#e88a3a', '#f0b87a'], tail: { type: 'notch', h: 0.3, split: 45, tint: '#e8964e', a: 0.75 }, fin: '#ec9e5e',
    dorsal: { u0: 0.42, u1: 0.68, h: 0.14, shape: 'round', a: 0.75 }, anal: { u0: 0.37, u1: 0.48, h: 0.13, shape: 'round', a: 0.75 }, pelvic: { u: 0.7, len: 0.15, w: 1.4 }, pec: { s: 2 },
    marks: [{ k: 'blob', u: 0.65, v: -0.08, ru: 0.2, rv: 0.14, c: '#ffffff', a: 0.12 }], eye: { r: 0.035, iris: ['#2a2420', '#0a0806'] } },
  // marbled hatchetfish: straight back, deep keel of a belly (most of the depth under the centre line), upturned mouth,
  // big high eye, small dorsal set far back over a long anal fin; silvery with dark marbled bands slanting across the keel
  hatchet: { pec: { s: 2.3, v: 0.3 }, thick: 0.3, depth: 0.42, pedU: 0.2, ped: 0.035, peak: 0.6, back: 0.2, snout: 0.3, mouth: -0.05, shade: ['#6e7258', '#c8c6b2', '#e6e2d4'], tail: { type: 'fork', h: 0.13 }, fin: N,
    dorsal: { at: 0.38, len: 0.08, h: 0.07, rake: 0.4 }, anal: { at: 0.52, len: 0.3, h: 0.05, rake: 0.2, trail: 0.02, drop: 0.7 }, adipose: true, pelvic: { u: 0.5, len: 0.03 },
    marks: [{ k: 'band', u0: 0.2, u1: 0.84, v0: -0.035, v1: -0.018, c: '#2a2a22', a: 0.8, f: 0.006 },
      ...[0.26, 0.38, 0.5, 0.62].map(u => ({ k: 'poly' as const, pts: [[u, -0.01], [u + 0.03, -0.01], [u + 0.2, 0.34], [u + 0.165, 0.34]] as [number, number][], c: '#3a3426', a: 0.7 }))],
    eye: { r: 0.045, iris: ['#c8c4a8', '#3a3828'], dv: -0.02 } },
  // celestial pearl danio (male): blue-grey with pearly spots, orange belly, fins barred black and red-orange
  cpd: { noseCap: 0.03, gape: 0.02, gapeDrop: 0.006, thick: 0.45, depth: 0.22, pedU: 0.2, ped: 0.038, peak: 0.55, snout: 0.75, shade: ['#26323e', '#40505e', '#d8743e'], tail: { type: 'lyre', h: 0.14, cut: 0.38, tint: '#e0502a', a: 0.7 }, fin: '#e0502a',
    dorsal: { u0: 0.38, u1: 0.5, h: 0.08, shape: 'round', a: 0.75 }, anal: { u0: 0.3, u1: 0.46, h: 0.07, shape: 'round', a: 0.75 }, pelvic: { u: 0.58, len: 0.06, tint: '#e0502a' },
    marks: [{ k: 'blob', u: 0.62, v: 0.08, ru: 0.22, rv: 0.04, c: '#e07a3a', a: 0.7 }, { k: 'spots', n: 45, u0: 0.24, u1: 0.84, v0: -0.08, v1: 0.05, r: 0.011, c: '#ecdcb0', a: 0.9 }],
    finMarks: [{ k: 'bars', us: [0.055, 0.135], w: 0.022, c: '#1a1a1e', a: 0.8 },
      { k: 'band', u0: 0.3, u1: 0.55, v0: -0.148, v1: -0.128, c: '#1a1a1e', a: 0.85, f: 0.004 }, { k: 'band', u0: 0.25, u1: 0.5, v0: 0.135, v1: 0.155, c: '#1a1a1e', a: 0.85, f: 0.004 }],
    eye: { r: 0.032, iris: ['#c8b890', '#3a3020'] } },
  // pea puffer (male): dark keel stripe along the belly, wrinkle lines behind the eye, yellowish fins
  peapuffer: { scale: 0, gape: 0.009, gapeDrop: 0.002, thick: 0.75, depth: 0.4, pedU: 0.2, ped: 0.05, peak: 0.65, snout: 0.7, mouth: -0.01, shade: ['#76763a', '#c4b65a', '#ece6cc'], tail: { type: 'round', h: 0.12, tint: '#d8cc80', a: 0.55 }, fin: '#d8cc80',
    dorsal: { u0: 0.22, u1: 0.3, h: 0.08, shape: 'round', a: 0.55 }, anal: { u0: 0.22, u1: 0.3, h: 0.07, shape: 'round', a: 0.55 },
    marks: [{ k: 'blob', u: 0.6, v: -0.06, ru: 0.25, rv: 0.08, c: '#7ab070', a: 0.18 }, { k: 'spots', n: 9, u0: 0.27, u1: 0.8, v0: -0.13, v1: 0.03, r: 0.034, c: '#3e3c1e', a: 0.75 },
      { k: 'spots', n: 14, u0: 0.25, u1: 0.85, v0: -0.12, v1: 0.06, r: 0.016, c: '#3e3c1e', a: 0.6 }, { k: 'band', u0: 0.4, u1: 0.8, v0: 0.125, v1: 0.15, c: '#34321e', a: 0.6, f: 0.025 },
      ...[0.8, 0.818, 0.836].map(u => ({ k: 'poly' as const, pts: [[u, 0.02], [u + 0.007, 0.02], [u - 0.004, 0.075], [u - 0.011, 0.075]] as [number, number][], c: '#5a3a1e', a: 0.55 })), { k: 'spots', n: 120, u0: 0.22, u1: 0.92, v0: -0.17, v1: 0.15, r: 0.006, c: '#5a5428', a: 0.3 }],
    eye: { r: 0.05, iris: ['#9ad0b8', '#1e2a24'], up: 0.3, bulge: 0.65 } },
  // white cloud mountain minnow: slim cool-water schooler; bronze back, a gold line over a dark band, red tail root,
  // red fins edged white
  whitecloud: { gape: 0.025, gapeDrop: 0.006, thick: 0.45, depth: 0.2, pedU: 0.2, ped: 0.035, peak: 0.55, snout: 0.45, mouth: -0.015, shade: ['#5a4a32', '#9a8458', '#dcd0b4'], tail: { type: 'fork', h: 0.13, tint: '#c8483a', a: 0.75 }, fin: '#d87850',
    dorsal: { at: 0.52, len: 0.1, h: 0.085, rake: 0.3, lead: 0.7, drop: 0.5, trail: 0.02, tint: '#c8483a', edge: '#f0ece0' }, anal: { at: 0.46, len: 0.12, h: 0.07, rake: 0.3, lead: 0.7, drop: 0.5, trail: 0.02, tint: '#c8483a', edge: '#f0ece0' }, pelvic: { u: 0.58, len: 0.05, tint: '#d87850' },
    marks: [{ k: 'band', u0: 0.2, u1: 0.9, v0: -0.012, v1: 0.01, c: '#3a3428', a: 0.6, f: 0.008 }, { k: 'band', u0: 0.22, u1: 0.9, v0: -0.026, v1: -0.012, c: '#e8d880', a: 0.85, f: 0.005 },
      { k: 'blob', u: 0.23, v: 0, ru: 0.05, rv: 0.025, c: '#c83a28', a: 0.75 }],
    finMarks: [{ k: 'band', u0: 0, u1: 0.18, v0: -0.03, v1: 0.03, c: '#a82a20', a: 0.6, f: 0.01 }], eye: { r: 0.03, iris: ['#c8b080', '#3a2a10'] } },
  // comet goldfish: the single-tailed, long-bodied goldfish; long deeply forked tail, big scales, orange-red
  comet: { gape: 0.02, gapeDrop: 0.004, scale: 0.032, thick: 0.5, depth: 0.29, pedU: 0.3, ped: 0.045, peak: 0.5, snout: 0.6, shade: ['#c84a1e', '#e8742e', '#f0a868'], tail: { type: 'fork', h: 0.24, tint: '#ec8a4a', a: 0.8 }, fin: '#ec8a4a',
    dorsal: { at: 0.66, len: 0.25, h: 0.12, spines: 0.08, nSp: 1, spineH: 0.13, rake: 0.2, drop: 0.45, trail: 0.03, a: 0.85 }, anal: { at: 0.4, len: 0.07, h: 0.08, rake: 0.3, drop: 0.5, trail: 0.02, a: 0.85 }, pelvic: { u: 0.58, len: 0.09 }, pec: { s: 1.3 },
    marks: [{ k: 'blob', u: 0.62, v: -0.07, ru: 0.22, rv: 0.08, c: '#ffffff', a: 0.12 }], eye: { r: 0.028, iris: ['#2a2420', '#0a0806'] } },
  // ---------- marine (lane C, 2026-10-13) ----------
  // ocellaris clownfish: orange, three white bars edged black (head, mid-body bulging forward, peduncle), fins edged black
  ocellaris: { pec: { s: 1.6 }, gape: 0.03, gapeDrop: 0.003, thick: 0.45, depth: 0.36, pedU: 0.2, ped: 0.065, peak: 0.55, snout: 0.6, shade: ['#c8561a', '#ec7a24', '#f09440'], tail: { type: 'round', h: 0.15, tint: '#e8762a', edge: '#1a1614' }, fin: '#e8762a',
    // one long dorsal from the nape: low spiny front, taller rounded soft rear; anal from behind the vent
    dorsal: { at: 0.74, len: 0.5, h: 0.11, spines: 0.45, nSp: 10, spineH: [0.05, 0.065], notch: 0.3, rake: 0.5, trail: 0.03, drop: 0.7, edge: '#1a1614' },
    anal: { at: 0.48, len: 0.23, h: 0.1, spines: 0.2, nSp: 2, spineH: [0.04, 0.07], notch: 0.3, rake: 0.5, trail: 0.03, drop: 0.7, edge: '#1a1614' }, pelvic: { u: 0.66, len: 0.09, tint: '#e8762a' },
    marks: [{ k: 'bars', us: [0.81, 0.54, 0.26], w: 0.085, c: '#1a1614', a: 0.85 }, { k: 'bars', us: [0.81, 0.54, 0.26], w: 0.062, c: '#f6f4ee', a: 1 },
      { k: 'blob', u: 0.57, v: -0.06, ru: 0.03, rv: 0.08, c: '#f6f4ee', a: 1 }],
    finMarks: [{ k: 'bars', us: [0.54], w: 0.062, c: '#f6f4ee', a: 0.9 }], eye: { r: 0.032, iris: ['#d0702a', '#2a1206'] } },
  // royal gramma: violet front half, yellow rear half, a black spot at the front of the dorsal, a dark line through the eye
  royalgramma: { gape: 0.045, gapeDrop: 0.003, mouth: -0.01, thick: 0.4, depth: 0.29, pedU: 0.18, ped: 0.05, peak: 0.55, snout: 0.45, shade: ['#6a2a8a', '#9a44b8', '#a85ac0'], tail: { type: 'notch', h: 0.14, tint: '#f0c020' }, fin: '#9a44b8',
    // long dorsal from the nape to the peduncle, the soft rear raised; anal from behind the vent
    dorsal: { at: 0.76, len: 0.6, h: 0.085, spines: 0.4, nSp: 12, spineH: [0.04, 0.06], notch: 0.2, rake: 0.7, trail: 0.05, drop: 0.85 },
    anal: { at: 0.5, len: 0.32, h: 0.08, spines: 0.15, nSp: 3, spineH: [0.035, 0.06], notch: 0.2, rake: 0.7, trail: 0.04, drop: 0.85 }, pelvic: { u: 0.7, len: 0.16, thread: true, tint: '#9a44b8', angle: 45 },
    marks: [{ k: 'band', u0: 0.1, u1: 0.5, v0: -1, v1: 1, c: '#f2c21e', a: 1, f: 0.06 }, { k: 'band', u0: 0.84, u1: 1, v0: -0.03, v1: -0.017, c: '#2a1430', a: 0.7, f: 0.005 }],
    finMarks: [{ k: 'band', u0: 0, u1: 0.46, v0: -1, v1: 1, c: '#f2c21e', a: 0.95, f: 0.05 }, { k: 'blob', u: 0.72, v: -0.17, ru: 0.025, rv: 0.025, c: '#18121a', a: 0.9 }],
    eye: { r: 0.03, iris: ['#7a3a8a', '#1a0a1e'] } },
  // yellow tang: tall disc, long low-set snout, tall rounded dorsal and anal fins, a white scalpel on the peduncle
  yellowtang: { rostrum: { len: 0.08, h: 0.05 }, gape: 0.02, scale: 0.012, thick: 0.22, angular: 0.5, depth: 0.56, pedU: 0.17, ped: 0.045, peak: 0.45, snout: 0.3, mouth: 0.02, shade: ['#d8b018', '#f2d02a', '#f6dc5a'], tail: { type: 'notch', h: 0.18, tint: '#f0cc2a' }, fin: '#f0cc2a',
    // dorsal from behind the head and anal from behind the pelvics both run to the peduncle: the tang's tall disc
    dorsal: { at: 0.74, len: 0.54, h: 0.16, spines: 0.35, nSp: 5, spineH: [0.08, 0.14], notch: 0.2, rake: 0.45, trail: 0.04, drop: 0.7 },
    anal: { at: 0.6, len: 0.4, h: 0.15, spines: 0.12, nSp: 3, spineH: [0.07, 0.12], notch: 0.2, rake: 0.4, trail: 0.04, drop: 0.7 }, pelvic: { u: 0.66, len: 0.08 },
    marks: [{ k: 'blob', u: 0.2, v: 0, ru: 0.022, rv: 0.009, c: '#fbfaf2', a: 1 }, { k: 'blob', u: 0.62, v: -0.1, ru: 0.25, rv: 0.18, c: '#ffffff', a: 0.12 }],
    eye: { r: 0.03, iris: ['#3a3020', '#0a0806'], dv: -0.06, u: 0.8 } },
  // firefish: slender, white with a yellow head, the rear turning orange-red to a dark red tail; tall front dorsal spike
  firefish: { thick: 0.45, depth: 0.17, pedU: 0.18, ped: 0.035, peak: 0.6, snout: 0.5, mouth: -0.02, shade: ['#d8d2c4', '#f0ece2', '#f6f3ec'], tail: { type: 'round', h: 0.09, tint: '#a8241c' }, fin: '#d8c8b0',
    // first dorsal a tall slender pennant raked back; second dorsal long and low; anal long, matching it
    dorsal: { at: 0.78, len: 0.06, h: 0.08, lead: 0.5, rake: 1, tip: 'point', trail: 0.11, drop: 3.9, a: 0.85 }, dorsal2: { at: 0.64, len: 0.42, h: 0.07, rake: 0.5, trail: 0.03, a: 0.85 },
    anal: { at: 0.56, len: 0.35, h: 0.065, rake: 0.5, trail: 0.03, tint: '#d84a28' }, pelvic: { u: 0.74, len: 0.06 },
    marks: [{ k: 'band', u0: 0.1, u1: 0.42, v0: -1, v1: 1, c: '#e0522a', a: 0.95, f: 0.08 }, { k: 'band', u0: 0.1, u1: 0.25, v0: -1, v1: 1, c: '#8a1a14', a: 0.6, f: 0.04 }, { k: 'blob', u: 0.94, v: -0.02, ru: 0.08, rv: 0.08, c: '#f2c83a', a: 0.85 }],
    finMarks: [{ k: 'band', u0: 0, u1: 0.4, v0: -1, v1: 1, c: '#d84a28', a: 0.8, f: 0.05 }], eye: { r: 0.034, iris: ['#c8b890', '#2a2010'] } },
  // banggai cardinal: silver with three black bars, white dots, tall dorsals, long pelvics, a deeply forked streamer tail
  banggai: { thick: 0.38, depth: 0.42, pedU: 0.24, ped: 0.05, peak: 0.5, snout: 0.45, shade: ['#8a8a84', '#c8c8c0', '#e2e0dc'], tail: { type: 'fork', h: 0.22, tint: '#b8b8b0', edge: '#1a1a1a' }, fin: '#9a9a94',
    // spiny first dorsal; second dorsal and anal with long front rays sweeping back to trailing tips; big pelvics
    dorsal: { at: 0.72, len: 0.1, h: 0.18, spines: 1, nSp: 6, spineH: [0.32, 0.16], notch: 0.35 }, dorsal2: { at: 0.57, len: 0.2, h: 0.27, rake: 0.05, tip: 'point', trail: 0.14, drop: 0.55 },
    anal: { at: 0.55, len: 0.2, h: 0.27, spines: 0.12, nSp: 2, spineH: [0.06, 0.1], rake: 0.08, tip: 'point', trail: 0.13, drop: 0.55 }, pelvic: { u: 0.68, len: 0.2, ext: 0.07, w: 1.3, tint: '#1e1e1e' },
    marks: [{ k: 'bars', us: [0.885, 0.66, 0.42], w: 0.06, c: '#1a1a1a', a: 0.92 }, { k: 'spots', n: 34, u0: 0.24, u1: 0.4, v0: -0.12, v1: 0.14, r: 0.009, c: '#f6f6f0', a: 0.95 }],
    finMarks: [{ k: 'spots', n: 30, u0: 0.2, u1: 0.55, v0: -0.4, v1: 0.4, r: 0.009, c: '#f6f6f0', a: 0.9 }, { k: 'bars', us: [0.42], w: 0.06, c: '#1a1a1a', a: 0.85 }],
    eye: { r: 0.034, iris: ['#c8c0a0', '#1a1810'] } },
  // six-line wrasse: orange-brown with six thin blue lines nose to tail, a dark spot on the peduncle, a greenish tail
  sixline: { gape: 0.018, gapeDrop: 0.002, thick: 0.42, depth: 0.25, pedU: 0.18, ped: 0.05, peak: 0.55, snout: 0.55, shade: ['#4a4a7a', '#c8683a', '#7a7aa8'], tail: { type: 'round', h: 0.12, tint: '#6a9a7a' }, fin: '#8a8ab0',
    // one continuous low dorsal from the nape to the peduncle
    dorsal: { at: 0.77, len: 0.58, h: 0.06, spines: 0.55, nSp: 9, spineH: [0.04, 0.05], notch: 0.15, rake: 0.6, trail: 0.03, drop: 0.8, edge: '#c8443a' },
    anal: { at: 0.5, len: 0.31, h: 0.055, spines: 0.2, nSp: 3, spineH: [0.03, 0.045], notch: 0.15, rake: 0.6, trail: 0.03, drop: 0.8 }, pelvic: { u: 0.7, len: 0.06 },
    marks: [...[-0.085, -0.055, -0.025, 0.005, 0.035, 0.065].map(v => ({ k: 'band' as const, u0: 0.2, u1: 0.97, v0: v - 0.007, v1: v + 0.007, c: '#3a58c8', a: 0.85, f: 0.006 })),
      { k: 'blob', u: 0.21, v: -0.035, ru: 0.016, rv: 0.016, c: '#141418', a: 0.9 }],
    eye: { r: 0.028, iris: ['#c8a040', '#2a1a08'] } },
  // blue-green chromis: iridescent pale blue-green, deeply forked tail, long spiny dorsal
  chromis: { pec: { s: 1.3 }, gape: 0.02, gapeDrop: 0.002, thick: 0.38, depth: 0.33, pedU: 0.22, ped: 0.042, peak: 0.55, snout: 0.45, shade: ['#4a9a9a', '#8ad0c8', '#c8ece4'], tail: { type: 'lyre', h: 0.19, tint: '#a8dcd4', a: 0.7, cut: 0.75 }, fin: '#a8dcd4',
    // dorsal from over the gill cover, spiny front then a soft rear to a point; anal from behind the vent
    dorsal: { at: 0.77, len: 0.54, h: 0.1, spines: 0.6, nSp: 12, spineH: [0.06, 0.085], notch: 0.1, rake: 0.5, tip: 'point', trail: 0.04, drop: 0.7, a: 0.7 },
    anal: { at: 0.5, len: 0.28, h: 0.09, spines: 0.15, nSp: 2, spineH: [0.04, 0.07], notch: 0.1, rake: 0.4, tip: 'point', trail: 0.04, drop: 0.7, a: 0.7 }, pelvic: { u: 0.68, len: 0.1 },
    marks: [{ k: 'blob', u: 0.6, v: -0.08, ru: 0.25, rv: 0.1, c: '#d8fff6', a: 0.2 }], eye: { r: 0.036, iris: ['#7aa0a0', '#1a2a2a'] } },
  // coral beauty: dwarf angel; deep blue-violet back and belly round an orange flank crossed by thin dark bars
  coralbeauty: { gape: 0.035, scale: 0.016, thick: 0.35, depth: 0.45, pedU: 0.2, ped: 0.06, peak: 0.5, snout: 0.42, mouth: 0.01, shade: ['#28287a', '#e0702a', '#32328a'], tail: { type: 'round', h: 0.17, tint: '#2a2a80' }, fin: '#2a2a80',
    // long spiny dorsal from the nape, soft rear rounded off to a short point; anal the same from behind the vent
    dorsal: { at: 0.76, len: 0.55, h: 0.11, spines: 0.6, nSp: 10, spineH: [0.06, 0.085], notch: 0.3, rake: 0.6, trail: 0.06, drop: 0.7, edge: '#5a8ad8' },
    anal: { at: 0.52, len: 0.31, h: 0.11, spines: 0.3, nSp: 3, spineH: [0.05, 0.08], notch: 0.3, rake: 0.5, trail: 0.06, drop: 0.7, edge: '#5a8ad8' }, pelvic: { u: 0.68, len: 0.11, ext: 0.03, tint: '#d8682a' },
    marks: [{ k: 'bars', us: [0.32, 0.38, 0.44, 0.5, 0.56, 0.62, 0.68, 0.74], w: 0.012, c: '#3a2a6a', a: 0.45 }, { k: 'blob', u: 0.9, v: 0.02, ru: 0.08, rv: 0.12, c: '#3a3aa0', a: 0.5 }],
    eye: { r: 0.03, iris: ['#3a3aa0', '#0e0e2a'] } },
  // yellow watchman goby: rests on the sand; yellow with faint bars and blue head spots, eyes high, rounded tail
  watchman: { thick: 0.68, belly: 0.5, wide: 0.3, depth: 0.19, pedU: 0.18, ped: 0.045, peak: 0.65, back: 0.6, snout: 0.7, mouth: 0.02, shade: ['#c8a020', '#e8c838', '#f0d870'], tail: { type: 'round', h: 0.1, tint: '#e0c040' }, fin: '#e0c040',
    // two separate dorsals (spiny, then soft), anal under the second; the pelvics are a fused disc under the chest
    dorsal: { at: 0.68, len: 0.15, h: 0.1, spines: 1, nSp: 6, spineH: [0.11, 0.08], notch: 0.3 }, dorsal2: { at: 0.5, len: 0.3, h: 0.09, rake: 0.5, trail: 0.035 },
    anal: { at: 0.48, len: 0.27, h: 0.075, rake: 0.5, trail: 0.03 }, pelvic: { u: 0.7, len: 0.08, w: 1.3 }, gape: 0.07, pec: { s: 1.6 },
    marks: [{ k: 'bars', us: [0.3, 0.44, 0.58, 0.72], w: 0.05, c: '#a07a20', a: 0.3 }, { k: 'spots', n: 12, u0: 0.78, u1: 0.98, v0: -0.06, v1: 0.05, r: 0.008, c: '#5ab0e0', a: 0.85 }],
    finMarks: [{ k: 'spots', n: 10, u0: 0.25, u1: 0.6, v0: -0.2, v1: -0.1, r: 0.008, c: '#5ab0e0', a: 0.7 }],
    eye: { r: 0.03, iris: ['#c8a040', '#2a1a08'], dv: -0.16, up: 0.55 } },
  // blue tang: royal blue oval with the black "palette" from eye to tail, a yellow tail and peduncle wedge
  bluetang: { gape: 0.02, gapeDrop: 0.004, scale: 0.012, thick: 0.25, angular: 0.3, depth: 0.5, pedU: 0.2, ped: 0.045, peak: 0.5, snout: 0.4, mouth: 0.01, shade: ['#1a3a9a', '#2a5ac8', '#3a6ad0'], tail: { type: 'notch', h: 0.2, tint: '#f0c820', edge: '#141420' }, fin: '#2a4ab8',
    dorsal: { at: 0.8, len: 0.62, h: 0.1, spines: 0.3, nSp: 9, spineH: [0.05, 0.08], notch: 0.2, rake: 0.5, trail: 0.03, drop: 0.8, edge: '#141420' },
    anal: { at: 0.62, len: 0.42, h: 0.09, spines: 0.1, nSp: 3, spineH: [0.05, 0.07], notch: 0.2, rake: 0.5, trail: 0.03, drop: 0.8, edge: '#141420' }, pelvic: { u: 0.7, len: 0.08 }, pec: { s: 1.4 },
    marks: [{ k: 'poly', pts: [[0.88, -0.07], [0.72, -0.19], [0.42, -0.19], [0.22, -0.05], [0.2, 0.03], [0.4, -0.04], [0.56, -0.02], [0.74, 0.03], [0.86, 0.01]], c: '#141420', a: 0.95 },
      { k: 'blob', u: 0.56, v: -0.11, ru: 0.13, rv: 0.04, c: '#2a5ac8', a: 1 }, { k: 'band', u0: 0.16, u1: 0.24, v0: -0.04, v1: 0.05, c: '#f0c820', a: 0.95, f: 0.015 }],
    eye: { r: 0.034, u: 0.82, iris: ['#2a2420', '#0a0806'] } },
  // mandarin dragonet (male): bottom-oriented, scaleless, broad head with high domed eyes, big fan pectorals, a tall
  // first dorsal; blue-green covered in wavy orange lines
  mandarin: { gape: 0.03, gapeDrop: 0.006, scale: 0, thick: 0.9, belly: 0.6, wide: 0.4, noseW: 0.5, depth: 0.2, pedU: 0.2, ped: 0.045, peak: 0.7, back: 0.62, snout: 0.7, mouth: 0.02, shade: ['#2a6a8a', '#2a8aa8', '#3a6ab8'], tail: { type: 'round', h: 0.12, tint: '#d0602a' }, fin: '#d0602a',
    dorsal: { at: 0.66, len: 0.1, h: 0.2, spines: 1, nSp: 4, spineH: [0.3, 0.15], notch: 0.2, tint: '#d0602a' }, dorsal2: { at: 0.52, len: 0.3, h: 0.11, rake: 0.6, trail: 0.04, drop: 0.8 },
    anal: { at: 0.5, len: 0.3, h: 0.08, rake: 0.5, trail: 0.03 }, pelvic: { u: 0.74, len: 0.1, w: 1.5 }, pec: { s: 2.4, v: 0.55 },
    marks: [...[-0.09, -0.06, -0.03, 0, 0.03, 0.06].map(v => ({ k: 'band' as const, u0: 0.18, u1: 0.96, v0: v - 0.0045, v1: v + 0.0045, c: '#ec7a2a', a: 0.9, wave: 0.012 })),
      { k: 'spots', n: 18, u0: 0.2, u1: 0.95, v0: -0.1, v1: 0.08, r: 0.006, c: '#ec7a2a', a: 0.8 }],
    finMarks: [...[-0.2, -0.15, 0.12, 0.16].map(v => ({ k: 'band' as const, u0: 0, u1: 0.6, v0: v - 0.008, v1: v + 0.008, c: '#2a6ab8', a: 0.8, wave: 0.01 })), { k: 'bars', us: [0.06, 0.12], w: 0.015, c: '#2a6ab8', a: 0.7 }],
    eye: { r: 0.045, iris: ['#c84a2a', '#2a0a06'], dv: -0.1, up: 0.6, bulge: 0.6 } },
  // ---------- bottom dwellers ----------
  bronzecory: { pec: { s: 1.9, v: 0.85 }, plates: true, thick: 0.72, belly: 0.9, wide: 0.5, pedT: 0.28, step: 0.18, noseW: 0.4, depth: 0.35, pedU: 0.18, ped: 0.06, peak: 0.6, back: 0.68, snout: 0.6, mouth: 0.06, shade: ['#4a5a48', '#8a8a62', '#d8c8a0'], tail: { type: 'fork', h: 0.15 }, fin: '#b0a888',
    // triangular dorsal on one stout spine, highest at the front
    dorsal: { at: 0.68, len: 0.13, h: 0.17, spines: 0.12, nSp: 1, spineH: 0.2, rake: 0.1, drop: 0.3 }, anal: { u0: 0.32, u1: 0.4, h: 0.06 }, adipose: true, pelvic: { u: 0.55, len: 0.09, w: 1.3 },
    marks: [{ k: 'blob', u: 0.6, v: -0.04, ru: 0.25, rv: 0.08, c: '#5a8070', a: 0.45 }], barbels: 0.03, eye: { r: 0.032, iris: ['#c8b890', '#3a3020'], dv: -0.05 } },
  pandacory: { pec: { s: 1.9, v: 0.85 }, plates: true, thick: 0.72, belly: 0.9, wide: 0.5, pedT: 0.28, step: 0.18, noseW: 0.4, depth: 0.35, pedU: 0.18, ped: 0.06, peak: 0.6, back: 0.68, snout: 0.6, mouth: 0.06, shade: ['#c8c0b0', '#e8e0d0', '#f0ebe0'], tail: { type: 'fork', h: 0.15 }, fin: '#d8d2c4',
    dorsal: { at: 0.68, len: 0.13, h: 0.17, spines: 0.12, nSp: 1, spineH: 0.2, rake: 0.1, drop: 0.3, tint: '#2a2a2a', a: 0.85 }, anal: { u0: 0.32, u1: 0.4, h: 0.06 }, adipose: true, pelvic: { u: 0.55, len: 0.09, w: 1.3 },
    marks: [{ k: 'bars', us: [0.885], w: 0.06, c: '#1c1c1c', a: 0.95 }, { k: 'blob', u: 0.24, v: -0.02, ru: 0.06, rv: 0.06, c: '#1c1c1c', a: 0.9 }], barbels: 0.03,
    eye: { r: 0.032, iris: ['#4a4040', '#0c0a0a'], dv: -0.05 } },
  bristlenose: { pec: { s: 2.1, v: 0.85 }, plates: true, thick: 1.3, belly: 1, wide: 0.6, noseW: 0.9, depth: 0.23, pedU: 0.16, ped: 0.05, peak: 0.6, back: 0.72, snout: 0.6, mouth: 0.05, shade: ['#3a3a30', '#5a5444', '#8a826a'], tail: { type: 'notch', h: 0.11, tint: '#4a4638', a: 0.85 }, fin: '#4a4638',
    dorsal: { at: 0.66, len: 0.26, h: 0.17, spines: 0.1, nSp: 1, spineH: 0.19, rake: 0.25, drop: 0.7, a: 0.85 }, anal: { u0: 0.3, u1: 0.36, h: 0.04 }, adipose: true, pelvic: { u: 0.58, len: 0.15, w: 1.4 },
    marks: [{ k: 'spots', n: 70, u0: 0.16, u1: 0.95, v0: -0.18, v1: 0.05, r: 0.008, c: '#c8c0a0', a: 0.6 }],
    finMarks: [{ k: 'spots', n: 40, u0: 0, u1: 0.7, v0: -0.4, v1: 0.2, r: 0.008, c: '#c8c0a0', a: 0.5 }], bristles: true, eye: { r: 0.022, iris: ['#6a6040', '#1a1610'], dv: -0.12, up: 0.7 } },
  oto: { pec: { s: 1.7, v: 0.85 }, plates: true, thick: 0.95, belly: 0.8, wide: 0.4, noseW: 0.5, depth: 0.19, pedU: 0.17, ped: 0.035, peak: 0.65, back: 0.62, snout: 0.6, mouth: 0.03, shade: ['#6a6a50', '#a8a280', '#e0dcc8'], tail: { type: 'fork', h: 0.11 }, fin: '#c0bba4',
    dorsal: { at: 0.63, len: 0.12, h: 0.1, spines: 0.12, nSp: 1, spineH: 0.12, rake: 0.12, drop: 0.35 }, anal: { u0: 0.33, u1: 0.4, h: 0.04 }, pelvic: { u: 0.58, len: 0.07, w: 1.2 },
    marks: [{ k: 'band', u0: 0.18, u1: 0.98, v0: -0.015, v1: 0.012, c: '#2a2820', a: 0.85, f: 0.008 }], finMarks: [{ k: 'blob', u: 0.08, v: 0, ru: 0.04, rv: 0.025, c: '#2a2820', a: 0.7 }],
    eye: { r: 0.024, iris: ['#b0a070', '#2a2418'], dv: -0.08, up: 0.3 } },
  // blunt loach head, fine cylindrical barbels, the trunk fullest behind mid-body and the tail laterally compressed
  kuhli: { thick: 0.85, pedT: 0.35, depth: 0.085, pedU: 0.05, ped: 0.02, peak: 0.78, back: 0.55, snout: 0.95, noseCap: 0.04, mouth: 0.01, barbelR: 0.0013, shade: ['#4a3a2a', '#d88a5a', '#ecc0a0'], tail: { type: 'round', h: 0.035, tint: '#c88a62' }, fin: '#d09a72',
    dorsal: { u0: 0.22, u1: 0.28, h: 0.025, shape: 'round' }, anal: { u0: 0.12, u1: 0.18, h: 0.02, shape: 'round' },
    marks: [{ k: 'bars', us: [0.93, 0.85, 0.77, 0.69, 0.61, 0.53, 0.45, 0.37, 0.29, 0.21, 0.13, 0.07], w: 0.035, c: '#2a2018', a: 0.85 }], barbels: 0.016,
    eye: { r: 0.008, iris: ['#6a5040', '#1a1008'] }, rim: 0.012 },
  clownloach: { pec: { s: 1.6, v: 0.75 }, gape: 0.025, thick: 0.6, belly: 0.4, depth: 0.29, pedU: 0.18, ped: 0.045, peak: 0.52, back: 0.62, snout: 0.38, mouth: 0.05, shade: ['#c8742a', '#e8a040', '#f0c070'], tail: { type: 'fork', h: 0.15, tint: '#c8443a' }, fin: '#c8443a',
    dorsal: { at: 0.64, len: 0.16, h: 0.13, rake: 0.25, drop: 0.55 }, anal: { at: 0.4, len: 0.1, h: 0.085, rake: 0.4, drop: 0.6 }, pelvic: { u: 0.56, len: 0.1, w: 1.3 },
    marks: [{ k: 'bars', us: [0.86, 0.6, 0.3], w: 0.08, c: '#1c1a18', a: 0.92 }], finMarks: [{ k: 'bars', us: [0.57], w: 0.04, c: '#1c1a18', a: 0.9 }], barbels: 0.02,
    eye: { r: 0.022, iris: ['#c8a050', '#3a2a10'] } },
  sae: { pec: { s: 1.2 }, gape: 0.02, gapeDrop: 0.006, thick: 0.55, belly: 0.3, depth: 0.2, pedU: 0.2, ped: 0.04, peak: 0.58, back: 0.58, snout: 0.5, mouth: 0.03, shade: ['#7a7258', '#bdb498', '#e0dccc'], tail: { type: 'fork', h: 0.13 }, fin: '#c8c2ae',
    dorsal: { at: 0.63, len: 0.13, h: 0.11, rake: 0.12, tip: 'point', drop: 0.35 }, anal: { at: 0.37, len: 0.08, h: 0.055, rake: 0.3, drop: 0.5 }, pelvic: { u: 0.55, len: 0.07, w: 1.1 },
    marks: [{ k: 'band', u0: 0.18, u1: 0.99, v0: -0.02, v1: 0.02, c: '#1c1a18', a: 0.92, f: 0.008 }], finMarks: [{ k: 'band', u0: 0.08, u1: 0.22, v0: -0.02, v1: 0.02, c: '#1c1a18', a: 0.85, f: 0.006 }], barbels: 0.012,
    eye: { r: 0.022, iris: ['#c8b890', '#3a3020'] } },
  // ---------- aquatic roster (lane T4, 2026-10-16): new silhouettes, scales and habitats ----------
  // pygmy corydoras: a miniature, slimmer cory; silver-grey with a black stripe snout to tail root, a pale line above it
  // Sterba's corydoras (Corydoras sterbai): dark grey-black, the head and front of the body covered in cream dots that run together
  // into broken lengthwise lines behind the dorsal; cream-orange belly; bright orange pectoral spines and pelvic fins; the tail and
  // dorsal clear, barred and spotted dark (reference photos 2026-10-22)
  sterbai: { pec: { s: 1.6, v: 0.85, tint: '#c44400' }, plates: true, thick: 0.72, belly: 0.9, wide: 0.5, pedT: 0.3, step: 0.18, noseW: 0.4, depth: 0.31, pedU: 0.19, ped: 0.06, peak: 0.6, back: 0.66, snout: 0.6, mouth: 0.06,
    shade: ['#1f2326', '#353a3a', '#e8b878'], tail: { type: 'fork', h: 0.17, tint: '#cfcabd', a: 0.85 }, fin: '#d2ccbc',
    dorsal: { at: 0.7, len: 0.13, h: 0.17, spines: 0.12, nSp: 1, spineH: 0.2, rake: 0.1, drop: 0.3, tint: '#7d7a70', a: 0.65 },
    anal: { u0: 0.31, u1: 0.4, h: 0.06, tint: '#cfc6b0', a: 0.7 }, adipose: true, pelvic: { u: 0.55, len: 0.09, w: 1.3, tint: '#c44400' },
    marks: [
      { k: 'band', u0: 0.55, u1: 0.98, v0: 0.07, v1: 1, c: '#eaa860', a: 0.85, f: 0.035 },
      ...[-0.1, -0.084, -0.068, -0.052, -0.036, -0.02, -0.004, 0.012, 0.028, 0.044, 0.06].map((v): Mark => ({ k: 'band', u0: 0.18, u1: 0.58, v0: v, v1: v + 0.0055, c: '#d6cbac', a: 0.6, f: 0.006, wave: 0.006 })),
      { k: 'spots', n: 330, u0: 0.48, u1: 0.98, v0: -0.19, v1: 0.07, r: 0.006, c: '#efe6cf', a: 0.95 },
      { k: 'spots', n: 120, u0: 0.8, u1: 0.99, v0: -0.15, v1: 0.05, r: 0.0045, c: '#f2ead6', a: 0.95 }],
    finMarks: [{ k: 'bars', us: [0.025, 0.055, 0.085, 0.115, 0.145, 0.175], w: 0.008, c: '#262828', a: 0.75 },
      { k: 'spots', n: 40, u0: 0.58, u1: 0.72, v0: -0.4, v1: -0.15, r: 0.007, c: '#262828', a: 0.7 }],
    barbels: 0.035, eye: { r: 0.032, iris: ['#cdbd95', '#2a2418'], dv: -0.05 } },
  pygmycory: { pec: { s: 1.7, v: 0.85 }, plates: true, thick: 0.7, belly: 0.8, wide: 0.45, pedT: 0.3, step: 0.15, noseW: 0.35, depth: 0.27, pedU: 0.18, ped: 0.05, peak: 0.6, back: 0.64, snout: 0.62, mouth: 0.05, shade: ['#6a6e66', '#b4b6ac', '#e4e2d8'], tail: { type: 'fork', h: 0.14, a: 0.6 }, fin: '#d0cec4',
    dorsal: { at: 0.66, len: 0.12, h: 0.14, spines: 0.12, nSp: 1, spineH: 0.16, rake: 0.1, drop: 0.3, a: 0.65 }, anal: { u0: 0.32, u1: 0.4, h: 0.05, a: 0.6 }, adipose: true, pelvic: { u: 0.55, len: 0.08, w: 1.2 },
    marks: [{ k: 'band', u0: 0.15, u1: 0.97, v0: -0.006, v1: 0.02, c: '#1c1c1a', a: 0.9, f: 0.008 }, { k: 'band', u0: 0.22, u1: 0.9, v0: -0.03, v1: -0.017, c: '#f2f0e6', a: 0.45, f: 0.006 },
      { k: 'band', u0: 0.18, u1: 0.95, v0: -1, v1: -0.06, c: '#4e504a', a: 0.35, f: 0.03 }], barbels: 0.028, eye: { r: 0.034, iris: ['#c8c0a8', '#2a2a24'], dv: -0.05 } },
  // reticulated hillstream loach (Sewellia): flat as a sucker disc, round head, eyes on top, broad low paired fins;
  // golden with dark vermiculations, fins banded
  hillstream: { pec: { s: 2.4, v: 0.92, flat: true, w: 2.4 }, thick: 1.9, belly: 1, wide: 0.6, noseW: 1, pedT: 0.35, depth: 0.15, pedU: 0.16, ped: 0.032, peak: 0.72, back: 0.78, snout: 0.95, mouth: 0.05, scale: 0, shade: ['#4a3e22', '#c8a442', '#e8dcb0'], tail: { type: 'notch', h: 0.09, tint: '#d0ac50' }, fin: '#d8b858',
    dorsal: { at: 0.6, len: 0.17, h: 0.07, rake: 0.3, drop: 0.6 }, anal: { at: 0.34, len: 0.07, h: 0.04, rake: 0.3 }, pelvic: { u: 0.52, len: 0.28, w: 1.6, flat: true },
    marks: [...[-0.1, -0.07, -0.04, -0.012].map(v => ({ k: 'band' as const, u0: 0.18, u1: 0.95, v0: v - 0.008, v1: v + 0.008, c: '#20190e', a: 0.8, wave: 0.012 })),
      { k: 'spots', n: 90, u0: 0.18, u1: 0.96, v0: -0.12, v1: 0.02, r: 0.011, c: '#20190e', a: 0.75 }],
    finMarks: [{ k: 'bars', us: [0.04, 0.1], w: 0.022, c: '#20190e', a: 0.8 }, { k: 'spots', n: 30, u0: 0.3, u1: 0.7, v0: -0.2, v1: -0.06, r: 0.01, c: '#20190e', a: 0.7 }],
    eye: { r: 0.022, iris: ['#b0a070', '#1a160e'], dv: -0.15, up: 0.75 } },
  // yellow lab (male): the first mbuna; lemon yellow, the long spiny dorsal with a black band under a white edge,
  // black pelvics and a dark anal fin
  yellowlab: { gape: 0.035, gapeDrop: 0.008, thick: 0.42, belly: 0.1, depth: 0.29, pedU: 0.2, ped: 0.055, peak: 0.55, snout: 0.42, mouth: 0.01, shade: ['#d4a812', '#f2d02a', '#f6e070'], tail: { type: 'round', h: 0.15, tint: '#f0cc2a' }, fin: '#f0cc2a',
    dorsal: { at: 0.78, len: 0.6, h: 0.1, spines: 0.65, nSp: 14, spineH: [0.06, 0.085], notch: 0.2, rake: 0.6, tip: 'point', trail: 0.05, drop: 0.75, edge: '#f6f4ee' },
    anal: { at: 0.48, len: 0.26, h: 0.1, spines: 0.3, nSp: 3, spineH: [0.04, 0.07], notch: 0.2, tip: 'point', trail: 0.04, tint: '#2a2820', a: 0.85 }, pelvic: { u: 0.68, len: 0.11, ext: 0.03, tint: '#1a1a18' },
    marks: [{ k: 'blob', u: 0.6, v: -0.07, ru: 0.25, rv: 0.08, c: '#fff6c0', a: 0.18 }],
    finMarks: [{ k: 'band', u0: 0.18, u1: 0.8, v0: -0.4, v1: -0.192, c: '#1a1a18', a: 0.9, f: 0.008 }], eye: { r: 0.031, iris: ['#2a2420', '#0a0806'] } },
  // Boeseman's rainbowfish (male): deep, keeled back, small pointed head, big eye; blue-grey front, orange rear,
  // dark bars between; a small first dorsal, a long second dorsal and a long anal reaching far forward
  boesemani: { gape: 0.02, gapeDrop: 0.004, thick: 0.3, angular: 0.3, depth: 0.38, pedU: 0.2, ped: 0.045, peak: 0.55, back: 0.56, snout: 0.3, mouth: -0.01, shade: ['#34446e', '#6e80a8', '#c8b878'], tail: { type: 'fork', h: 0.16, tint: '#e0902e' }, fin: '#d89a40',
    dorsal: { at: 0.58, len: 0.06, h: 0.06, spines: 1, nSp: 5, spineH: [0.065, 0.05], notch: 0.3, tint: '#6e7488' }, dorsal2: { at: 0.48, len: 0.27, h: 0.12, lead: 0.35, rake: 0.85, tip: 'point', trail: 0.06, drop: 1 },
    anal: { at: 0.62, len: 0.44, h: 0.11, lead: 0.3, rake: 0.85, tip: 'point', trail: 0.06, drop: 1 }, pelvic: { u: 0.64, len: 0.08 },
    marks: [{ k: 'band', u0: 0.08, u1: 0.5, v0: -1, v1: 1, c: '#e8902a', a: 0.95, f: 0.06 }, { k: 'band', u0: 0.4, u1: 0.62, v0: -1, v1: 1, c: '#e0c050', a: 0.45, f: 0.05 },
      { k: 'bars', us: [0.5, 0.55, 0.6], w: 0.022, c: '#24263a', a: 0.6 }, { k: 'blob', u: 0.75, v: -0.08, ru: 0.2, rv: 0.08, c: '#a8b8e0', a: 0.25 }],
    finMarks: [{ k: 'band', u0: 0, u1: 0.5, v0: -1, v1: 1, c: '#e8902a', a: 0.6, f: 0.05 }], eye: { r: 0.036, iris: ['#d8d0c0', '#2a2a2a'] } },
  // cockatoo dwarf cichlid (male): the "crest", tall front dorsal spines with deep notches; dark band eye to tail, lyre
  // tail spotted red; big mouth
  cockatoo: { gape: 0.05, gapeDrop: 0.01, thick: 0.4, belly: 0.15, depth: 0.29, pedU: 0.22, ped: 0.055, peak: 0.55, snout: 0.4, mouth: 0.01, shade: ['#6a6248', '#c4b480', '#e8dcb0'], tail: { type: 'lyre', h: 0.18, cut: 0.32, tint: '#e0b050', edge: '#c8402a' }, fin: '#dcc070',
    dorsal: { at: 0.8, len: 0.58, h: 0.1, spines: 0.6, nSp: 10, spineH: [0.22, 0.075], notch: 0.5, rake: 0.6, tip: 'point', trail: 0.08, drop: 0.8, edge: '#d8603a' },
    anal: { at: 0.5, len: 0.26, h: 0.11, spines: 0.25, nSp: 3, spineH: [0.04, 0.07], tip: 'point', trail: 0.07 }, pelvic: { u: 0.67, len: 0.12, ext: 0.05, tint: '#d8b060' },
    marks: [{ k: 'band', u0: 0.22, u1: 0.93, v0: -0.016, v1: 0.016, c: '#2a2418', a: 0.8, f: 0.01 }, ...[0.05, 0.085].map(v => ({ k: 'band' as const, u0: 0.3, u1: 0.72, v0: v - 0.006, v1: v + 0.006, c: '#5a4a30', a: 0.45, f: 0.006 })),
      { k: 'spots', n: 18, u0: 0.72, u1: 0.92, v0: 0.01, v1: 0.09, r: 0.008, c: '#5a8ac8', a: 0.75 }, { k: 'blob', u: 0.9, v: 0.06, ru: 0.02, rv: 0.035, c: '#2a2418', a: 0.6 }],
    finMarks: [{ k: 'spots', n: 40, u0: 0.01, u1: 0.22, v0: -0.18, v1: 0.18, r: 0.009, c: '#c8402a', a: 0.85 }, { k: 'spots', n: 20, u0: 0.25, u1: 0.75, v0: -0.3, v1: -0.12, r: 0.008, c: '#c8402a', a: 0.6 }],
    eye: { r: 0.03, iris: ['#c8a040', '#2a1a08'] } },
  // ---------- Lake Malawi roster (lane CP, 2026-10-16) ----------
  // peacock (Aulonocara, male): deeper than a mbuna, steep forehead, big sensory-pit chin; electric blue, a yellow-orange
  // wash over the back and rear, long blue-edged dorsal and anal fins that trail behind
  peacock: { gape: 0.045, gapeDrop: 0.01, thick: 0.4, belly: 0.12, depth: 0.31, pedU: 0.2, ped: 0.055, peak: 0.5, back: 0.5, snout: 0.38, mouth: 0.012, shade: ['#1c4fa8', '#2e7ad8', '#8cc4f0'], tail: { type: 'round', h: 0.16, tint: '#4a8ce0', edge: '#f0c040' }, fin: '#3a80d8',
    dorsal: { at: 0.8, len: 0.66, h: 0.1, spines: 0.6, nSp: 16, spineH: [0.05, 0.075], notch: 0.15, rake: 0.7, tip: 'point', trail: 0.12, drop: 0.8, edge: '#f0c848' },
    anal: { at: 0.5, len: 0.26, h: 0.1, spines: 0.3, nSp: 3, spineH: [0.04, 0.07], tip: 'point', trail: 0.08, tint: '#4a88d8' }, pelvic: { u: 0.67, len: 0.13, ext: 0.05, tint: '#3070c8' },
    marks: [{ k: 'band', u0: 0.45, u1: 0.98, v0: -1, v1: 0.2, c: '#f0b830', a: 0.6, f: 0.22 }, { k: 'band', u0: 0.2, u1: 0.8, v0: -0.04, v1: -0.01, c: '#2a50a0', a: 0.3, f: 0.01 },
      { k: 'blob', u: 0.6, v: -0.06, ru: 0.22, rv: 0.07, c: '#a8d8ff', a: 0.25 }], eye: { r: 0.033, iris: ['#c8d8e8', '#0a1830'] } },
  // Demasoni (Pseudotropheus demasoni): a small slim mbuna, blue-grey with a ladder of black vertical bars
  demasoni: { gape: 0.04, gapeDrop: 0.008, thick: 0.4, belly: 0.1, depth: 0.25, pedU: 0.2, ped: 0.055, peak: 0.55, snout: 0.4, mouth: 0.01, shade: ['#5a8cc0', '#8cb8e0', '#d8e8f4'], tail: { type: 'round', h: 0.14, tint: '#7aa8d4' }, fin: '#8ab4dc',
    dorsal: { at: 0.78, len: 0.62, h: 0.09, spines: 0.65, nSp: 17, spineH: [0.055, 0.075], notch: 0.15, rake: 0.5, tip: 'point', trail: 0.04, drop: 0.7 },
    anal: { at: 0.48, len: 0.24, h: 0.09, spines: 0.3, nSp: 3, spineH: [0.04, 0.06], tip: 'point', trail: 0.03 }, pelvic: { u: 0.68, len: 0.11, ext: 0.03, tint: '#6a98c8' },
    marks: [{ k: 'bars', us: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], w: 0.034, c: '#141c2c', a: 0.88 }], finMarks: [{ k: 'band', u0: 0.18, u1: 0.8, v0: -0.4, v1: -0.2, c: '#18202c', a: 0.5, f: 0.008 }], eye: { r: 0.032, iris: ['#6a8ab0', '#0a0c14'] } },
  // kadango (Copadichromis borleyi, male): a slim open-water haplochromine; blue-grey body flushing red over the back and
  // the whole of the dorsal, anal and tail fins, a long jawed head
  kadango: { gape: 0.05, gapeDrop: 0.01, thick: 0.36, belly: 0.08, depth: 0.25, pedU: 0.2, ped: 0.05, peak: 0.55, snout: 0.5, mouth: 0.012, shade: ['#3a5a88', '#7a9ac0', '#d0d8e0'], tail: { type: 'fork', h: 0.17, tint: '#d8402e', edge: '#f08a50' }, fin: '#d84a34',
    dorsal: { at: 0.78, len: 0.58, h: 0.1, spines: 0.55, nSp: 15, spineH: [0.055, 0.08], notch: 0.15, rake: 0.6, tip: 'point', trail: 0.1, drop: 0.7, tint: '#d8402e', edge: '#f08a50' },
    anal: { at: 0.5, len: 0.24, h: 0.1, spines: 0.3, nSp: 3, spineH: [0.04, 0.07], tip: 'point', trail: 0.06, tint: '#d8402e' }, pelvic: { u: 0.67, len: 0.12, ext: 0.04, tint: '#c83a2a' },
    marks: [{ k: 'band', u0: 0.4, u1: 0.98, v0: -1, v1: -0.12, c: '#d03a2a', a: 0.55, f: 0.08 }, { k: 'bars', us: [0.3, 0.42, 0.54, 0.66], w: 0.03, c: '#2a3a58', a: 0.3 }], eye: { r: 0.033, iris: ['#d0d8e0', '#101820'] } },
  // Malawi squeaker (Synodontis njassae): a humped, forward-heavy catfish; mottled brown with dark spots, long
  // barbels, a tall stout dorsal spine, a big adipose fin and a deeply forked tail
  syno: { pec: { s: 2, v: 0.85 }, thick: 0.9, belly: 0.9, wide: 0.5, pedT: 0.3, noseW: 0.5, depth: 0.28, pedU: 0.18, ped: 0.05, peak: 0.42, back: 0.5, snout: 0.7, mouth: 0.04, shade: ['#3a2c20', '#7a6448', '#c8b490'], tail: { type: 'fork', h: 0.2, tint: '#6a5a44', a: 0.9 }, fin: '#6a5a44',
    dorsal: { at: 0.5, len: 0.16, h: 0.2, spines: 0.12, nSp: 1, spineH: 0.24, rake: 0.2, drop: 0.3, a: 0.9 }, anal: { u0: 0.34, u1: 0.4, h: 0.06 }, adipose: true, pelvic: { u: 0.58, len: 0.1, w: 1.3 },
    marks: [{ k: 'spots', n: 60, u0: 0.2, u1: 0.95, v0: -0.2, v1: 0.1, r: 0.012, c: '#1c1610', a: 0.6 }, { k: 'blob', u: 0.45, v: -0.1, ru: 0.3, rv: 0.1, c: '#2a2018', a: 0.3 }],
    finMarks: [{ k: 'spots', n: 18, u0: 0.1, u1: 0.8, v0: -0.4, v1: 0.1, r: 0.012, c: '#1c1610', a: 0.55 }], barbels: 0.075, eye: { r: 0.03, iris: ['#c8b890', '#20180e'], dv: -0.03 } },
  // blunt-nosed mbuna (Labeotropheus trewavasae, male): the fleshy overhanging snout, a deep blue body with a long
  // orange-edged dorsal
  labeo: { gape: 0.03, gapeDrop: 0.016, thick: 0.46, belly: 0.1, depth: 0.31, pedU: 0.2, ped: 0.06, peak: 0.55, snout: 0.15, mouth: 0.03, shade: ['#2a4a8a', '#4a76b8', '#a0c0e0'], tail: { type: 'round', h: 0.15, tint: '#5a82c0' }, fin: '#4a78b8',
    dorsal: { at: 0.8, len: 0.68, h: 0.1, spines: 0.7, nSp: 17, spineH: [0.06, 0.085], notch: 0.15, rake: 0.55, tip: 'point', trail: 0.04, drop: 0.75, edge: '#f09a3a' },
    anal: { at: 0.48, len: 0.25, h: 0.1, spines: 0.3, nSp: 3, spineH: [0.04, 0.07], tip: 'point', trail: 0.03, tint: '#3a5a98' }, pelvic: { u: 0.68, len: 0.12, ext: 0.03, tint: '#2a3a68' },
    marks: [{ k: 'bars', us: [0.28, 0.4, 0.52, 0.64, 0.76], w: 0.03, c: '#1a2a52', a: 0.35 }, { k: 'blob', u: 0.6, v: -0.05, ru: 0.22, rv: 0.07, c: '#9cc4f0', a: 0.2 }], eye: { r: 0.03, iris: ['#c8b080', '#1a1408'] } },
  // golden mbuna (Melanochromis auratus, male): near black with a pale yellow-white stripe along the back and flank
  auratus: { gape: 0.035, gapeDrop: 0.008, thick: 0.4, belly: 0.1, depth: 0.26, pedU: 0.2, ped: 0.055, peak: 0.55, snout: 0.42, mouth: 0.01, shade: ['#1a1814', '#2a2822', '#5a5444'], tail: { type: 'round', h: 0.15, tint: '#242018' }, fin: '#2a2620',
    dorsal: { at: 0.78, len: 0.64, h: 0.1, spines: 0.65, nSp: 18, spineH: [0.055, 0.08], notch: 0.15, rake: 0.55, tip: 'point', trail: 0.04, drop: 0.75, edge: '#e8d070' },
    anal: { at: 0.48, len: 0.25, h: 0.09, spines: 0.3, nSp: 3, spineH: [0.04, 0.065], tip: 'point', trail: 0.03, tint: '#1e1c18' }, pelvic: { u: 0.68, len: 0.11, ext: 0.03, tint: '#181612' },
    marks: [{ k: 'band', u0: 0.12, u1: 0.96, v0: -0.075, v1: -0.045, c: '#f0e090', a: 0.9, f: 0.012 }, { k: 'band', u0: 0.2, u1: 0.94, v0: 0.04, v1: 0.07, c: '#f0e090', a: 0.8, f: 0.012 }],
    eye: { r: 0.03, iris: ['#d8c060', '#0a0806'] } },
  // Livingstone's cichlid (Nimbochromis livingstonii): a big, deep-headed predator; mottled yellow-grey with irregular blue-black blotches
  livingstonii: { gape: 0.06, gapeDrop: 0.012, thick: 0.4, belly: 0.14, depth: 0.32, pedU: 0.22, ped: 0.06, peak: 0.5, snout: 0.5, mouth: 0.012, shade: ['#625638', '#8e7e4c', '#bcb088'], tail: { type: 'round', h: 0.16, tint: '#b8a060', edge: '#4a6a9a' }, fin: '#b0a068',
    dorsal: { at: 0.8, len: 0.6, h: 0.11, spines: 0.55, nSp: 15, spineH: [0.06, 0.09], notch: 0.15, rake: 0.6, tip: 'point', trail: 0.1, drop: 0.8, edge: '#4a78b0' },
    anal: { at: 0.5, len: 0.26, h: 0.11, spines: 0.3, nSp: 3, spineH: [0.04, 0.07], tip: 'point', trail: 0.06 }, pelvic: { u: 0.67, len: 0.13, ext: 0.04, tint: '#a09060' },
    marks: [{ k: 'spots', n: 16, u0: 0.18, u1: 0.94, v0: -0.14, v1: 0.1, r: 0.045, c: '#2a3a6a', a: 0.65 }, { k: 'spots', n: 36, u0: 0.1, u1: 0.96, v0: -0.16, v1: 0.12, r: 0.016, c: '#2a2a40', a: 0.5 }],
    finMarks: [{ k: 'spots', n: 22, u0: 0.1, u1: 0.8, v0: -0.4, v1: 0.1, r: 0.012, c: '#2a3a6a', a: 0.5 }], eye: { r: 0.032, iris: ['#d0b060', '#1a1408'] } },
  // dogtooth cichlid (Cynotilapia afra, male): slim and blue-grey with seven black bars, a bright yellow dorsal
  afra: { gape: 0.042, gapeDrop: 0.008, thick: 0.38, belly: 0.08, depth: 0.25, pedU: 0.2, ped: 0.052, peak: 0.55, snout: 0.42, mouth: 0.01, shade: ['#3a6aa8', '#6a9cd0', '#c8dcf0'], tail: { type: 'round', h: 0.14, tint: '#6a98cc' }, fin: '#7aa4d4',
    dorsal: { at: 0.78, len: 0.64, h: 0.1, spines: 0.65, nSp: 17, spineH: [0.055, 0.08], notch: 0.15, rake: 0.55, tip: 'point', trail: 0.05, drop: 0.7, tint: '#f0d030', edge: '#fff0a0' },
    anal: { at: 0.48, len: 0.24, h: 0.09, spines: 0.3, nSp: 3, spineH: [0.04, 0.065], tip: 'point', trail: 0.03 }, pelvic: { u: 0.68, len: 0.11, ext: 0.03, tint: '#5a88bc' },
    marks: [{ k: 'bars', us: [0.24, 0.33, 0.42, 0.51, 0.6, 0.69, 0.78], w: 0.03, c: '#141c2c', a: 0.8 }], eye: { r: 0.031, iris: ['#9ab4d0', '#0a0c14'] } },
};

// ---------- females of the dimorphic species (species.json `female`): the male's plan with the female's shape, fins and
// colours. Females of these are shorter-finned and duller; livebearer females are larger, deeper bodied and carry a dark
// gravid spot above the anal fin; dwarf cichlid females are smaller with a coloured belly.
const her = (male: string, o: Partial<Plan>): Plan => ({ ...PLANS[male], ...o });
Object.assign(PLANS, {
  // short round tail and fins, deeper body, duller red with faint stress stripes, white egg spot behind the ventrals
  betta_f: her('betta', { depth: 0.27, pedU: 0.24, ped: 0.07, peak: 0.45, shade: ['#4e2630', '#7e3440', '#a05a5a'], tail: { type: 'round', h: 0.15, tint: '#8a2a3a', a: 0.8 },
    dorsal: { at: 0.56, len: 0.13, h: 0.08, rake: 0.6, a: 0.8 }, anal: { at: 0.64, len: 0.36, h: 0.09, rake: 0.7, a: 0.8 }, pelvic: { u: 0.69, len: 0.1, ext: 0.03, w: 0.6, tint: '#9c2236' },
    marks: [{ k: 'band', u0: 0.28, u1: 0.85, v0: -0.045, v1: -0.025, c: '#3a1418', a: 0.35, f: 0.012 }, { k: 'band', u0: 0.28, u1: 0.8, v0: 0.02, v1: 0.04, c: '#3a1418', a: 0.3, f: 0.012 },
      { k: 'spots', n: 30, u0: 0.35, u1: 0.85, v0: -0.08, v1: 0.08, r: 0.008, c: '#4f7fb8', a: 0.25 }, { k: 'blob', u: 0.6, v: 0.115, ru: 0.014, rv: 0.011, c: '#f4efe6', a: 0.95 }],
    finMarks: [{ k: 'spots', n: 20, u0: 0, u1: 0.3, v0: -0.2, v1: 0.2, r: 0.01, c: '#4f7fb8', a: 0.2 }] }),
  // larger and deeper, olive-silver with a net of scales, plain short tail, dark gravid spot, a fan anal fin (no gonopodium)
  guppy_f: her('guppy', { thick: 0.5, depth: 0.27, pedU: 0.27, ped: 0.05, peak: 0.5, snout: 0.5, shade: ['#76785e', '#b2b196', '#dcd8c4'], tail: { type: 'notch', h: 0.14, tint: '#c8b490', a: 0.6 }, fin: '#c8bea4', gono: undefined,
    dorsal: { u0: 0.42, u1: 0.54, h: 0.07 }, anal: { u0: 0.38, u1: 0.48, h: 0.06 }, pelvic: { u: 0.63, len: 0.05 },
    marks: [{ k: 'blob', u: 0.5, v: 0.075, ru: 0.045, rv: 0.035, c: '#2a2420', a: 0.55 }], finMarks: [{ k: 'spots', n: 12, u0: 0.02, u1: 0.22, v0: -0.1, v1: 0.1, r: 0.01, c: '#7a6a4a', a: 0.3 }],
    eye: { r: 0.024, iris: ['#c9b890', '#4a3e2c'] } }),
  // no sword: a plain notched tail; deeper, a fan anal fin, gravid spot
  swordtail_f: her('swordtail', { gono: undefined, depth: 0.24, pedU: 0.22, ped: 0.05, dorsal: { u0: 0.47, u1: 0.62, h: 0.09 }, eye: { r: 0.028, iris: ['#cfb890', '#4a3e2c'] }, shade: ['#a84a34', '#d0684a', '#e6987a'], tail: { type: 'notch', h: 0.15, tint: '#d26a48' },
    anal: { u0: 0.38, u1: 0.5, h: 0.07 }, pelvic: { u: 0.63, len: 0.05 }, finMarks: [], marks: [{ k: 'blob', u: 0.48, v: 0.09, ru: 0.035, rv: 0.03, c: '#4a1a10', a: 0.45 }] }),
  // silvery grey with faint brownish bars, rounded dorsal, no blue fin edges
  dwarfgourami_f: her('dwarfgourami', { shade: ['#5f6f78', '#9ba4a3', '#cbcfc6'], tail: { type: 'round', h: 0.16, tint: '#a8aca4' }, fin: '#b0b2aa',
    dorsal: { at: 0.62, len: 0.38, h: 0.08, spines: 0.6, nSp: 7, spineH: [0.035, 0.065], notch: 0.18, rake: 0.6 },
    anal: { at: 0.68, len: 0.46, h: 0.1, spines: 0.5, nSp: 7, spineH: [0.03, 0.075], notch: 0.18, rake: 0.6 }, pelvic: { u: 0.72, len: 0.38, thread: true, tint: '#c8a888' },
    marks: [0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8].map(u => ({ k: 'band' as const, u0: u, u1: u + 0.03, v0: -0.2, v1: 0.2, c: '#a07a5e', a: 0.3, f: 0.012 })),
    finMarks: [{ k: 'spots', n: 20, u0: 0.05, u1: 0.6, v0: -0.3, v1: 0.3, r: 0.01, c: '#8a8478', a: 0.3 }] }),
  // drab silvery tan with a brown stripe from eye to tail, no black throat
  honeygourami_f: her('honeygourami', { shade: ['#8a7a5a', '#c2ae86', '#e4d8bc'], tail: { type: 'round', h: 0.15, tint: '#d0c0a0' }, fin: '#d2c4a4',
    dorsal: { at: 0.6, len: 0.36, h: 0.075, spines: 0.6, nSp: 6, spineH: [0.03, 0.055], notch: 0.18, rake: 0.6 },
    anal: { at: 0.67, len: 0.45, h: 0.09, spines: 0.5, nSp: 6, spineH: [0.03, 0.065], notch: 0.18, rake: 0.6 }, pelvic: { u: 0.7, len: 0.28, thread: true, tint: '#e0c898' },
    marks: [{ k: 'band', u0: 0.24, u1: 0.84, v0: -0.012, v1: 0.022, c: '#8a6a44', a: 0.45, f: 0.05 }] }),
  // tan-brown with the dark lateral stripe clearer, a touch deeper
  cherrybarb_f: her('cherrybarb', { depth: 0.31, shade: ['#7c6448', '#bea27c', '#e0ceb0'], tail: { type: 'fork', h: 0.15, tint: '#c8a888' }, fin: '#cdb094',
    marks: [{ k: 'band', u0: 0.2, u1: 0.9, v0: -0.012, v1: 0.014, c: '#3a2a1e', a: 0.75, f: 0.01 }] }),
  // smaller and rounder, bright cherry belly, rounded fins with a gold-edged dorsal and dark dorsal spots
  kribensis_f: her('kribensis', { belly: 0.3, depth: 0.34, peak: 0.5, tail: { type: 'round', h: 0.14, tint: '#c8ac6a' },
    dorsal: { at: 0.8, len: 0.55, h: 0.08, spines: 0.6, nSp: 9, spineH: [0.05, 0.065], notch: 0.25, trail: 0.025, edge: '#d8b040' },
    anal: { at: 0.5, len: 0.26, h: 0.07, spines: 0.25, nSp: 3, spineH: [0.03, 0.055], trail: 0.02 }, pelvic: { u: 0.66, len: 0.1, tint: '#7a4ca0' },
    marks: [{ k: 'band', u0: 0.2, u1: 0.92, v0: -0.02, v1: 0.02, c: '#2a2620', a: 0.8, f: 0.012 }, { k: 'blob', u: 0.6, v: 0.12, ru: 0.18, rv: 0.08, c: '#c8305a', a: 0.9 }, { k: 'blob', u: 0.62, v: 0.1, ru: 0.08, rv: 0.04, c: '#8a3a9a', a: 0.35 }],
    finMarks: [{ k: 'blob', u: 0.32, v: -0.18, ru: 0.025, rv: 0.025, c: '#1a1a1a', a: 0.85 }, { k: 'blob', u: 0.45, v: -0.185, ru: 0.022, rv: 0.022, c: '#1a1a1a', a: 0.8 }] }),
  // smaller, lower dorsal, a pink belly patch, fewer blue spangles
  gbr_f: her('gbr', { dorsal: { at: 0.8, len: 0.52, h: 0.1, spines: 0.5, nSp: 8, spineH: [0.07, 0.08], trail: 0.03, edge: '#c8443a' }, anal: { at: 0.52, len: 0.27, h: 0.09, spines: 0.25, nSp: 3, spineH: [0.04, 0.065], trail: 0.03 }, pelvic: { u: 0.67, len: 0.1, ext: 0.03, tint: '#c84a3a' },
    marks: [{ k: 'blob', u: 0.86, v: -0.02, ru: 0.12, rv: 0.12, c: '#e0b04a', a: 0.6 }, { k: 'bars', us: [0.87], w: 0.04, c: '#1a1a1e', a: 0.85 },
      { k: 'blob', u: 0.62, v: -0.04, ru: 0.05, rv: 0.06, c: '#1a1a1e', a: 0.75 }, { k: 'blob', u: 0.6, v: 0.14, ru: 0.13, rv: 0.07, c: '#d8587a', a: 0.75 },
      { k: 'spots', n: 40, u0: 0.25, u1: 0.8, v0: -0.15, v1: 0.1, r: 0.011, c: '#5aa0d8', a: 0.55 }],
    finMarks: [{ k: 'spots', n: 25, u0: 0, u1: 0.65, v0: -0.4, v1: 0.4, r: 0.01, c: '#5aa0d8', a: 0.4 }] }),
  // greener and duller, rounder belly, smaller spots, paler fins with faint bars
  cpd_f: her('cpd', { depth: 0.24, shade: ['#46503e', '#76806a', '#c8a07a'], tail: { type: 'lyre', h: 0.14, cut: 0.38, tint: '#d8a07a', a: 0.55 }, fin: '#d8a07a',
    dorsal: { u0: 0.38, u1: 0.5, h: 0.07, shape: 'round', a: 0.6 }, anal: { u0: 0.3, u1: 0.46, h: 0.06, shape: 'round', a: 0.6 }, pelvic: { u: 0.58, len: 0.06, tint: '#d8a07a' },
    marks: [{ k: 'blob', u: 0.62, v: 0.09, ru: 0.22, rv: 0.04, c: '#d8a070', a: 0.4 }, { k: 'spots', n: 40, u0: 0.24, u1: 0.84, v0: -0.08, v1: 0.05, r: 0.009, c: '#e4dcbc', a: 0.75 }],
    finMarks: [{ k: 'bars', us: [0.055, 0.135], w: 0.02, c: '#2a2a2a', a: 0.45 }] }),
  platy_f: her('platy', { gono: undefined }),
  molly_f: her('molly', { gono: undefined }),
  // rounder, no belly stripe or eye wrinkles, rounder spots, clear fins
  peapuffer_f: her('peapuffer', { thick: 0.8, depth: 0.44, tail: { type: 'round', h: 0.12, tint: '#d4d0b8', a: 0.5 }, fin: '#d4d0b8',
    dorsal: { u0: 0.22, u1: 0.3, h: 0.08, shape: 'round', a: 0.5 }, anal: { u0: 0.22, u1: 0.3, h: 0.07, shape: 'round', a: 0.5 },
    marks: [{ k: 'blob', u: 0.6, v: -0.06, ru: 0.25, rv: 0.09, c: '#7ab070', a: 0.18 }, { k: 'spots', n: 10, u0: 0.27, u1: 0.8, v0: -0.14, v1: 0.04, r: 0.036, c: '#3e3c1e', a: 0.72 },
      { k: 'spots', n: 10, u0: 0.25, u1: 0.85, v0: -0.13, v1: 0.06, r: 0.02, c: '#3e3c1e', a: 0.55 }, { k: 'spots', n: 120, u0: 0.22, u1: 0.92, v0: -0.18, v1: 0.16, r: 0.006, c: '#5a5428', a: 0.27 }] }),
  // no orange-red breast, a rounded dorsal and a plain anal fin
  gourami_f: her('gourami', { dorsal: { at: 0.5, len: 0.26, h: 0.08, spines: 0.35, nSp: 5, spineH: [0.05, 0.065], notch: 0.3, trail: 0.025 },
    anal: { at: 0.7, len: 0.5, h: 0.09, spines: 0.4, nSp: 7, spineH: [0.03, 0.065], notch: 0.18, rake: 0.6, trail: 0.03 }, pelvic: { u: 0.72, len: 0.35, thread: true, tint: '#d8ccb0' },
    marks: PLANS.gourami.marks!.slice(1) }),
  // ---------- aquatic roster females (lane T4) ----------
  // peacock female: drab silver-brown with faint bars, short colourless fins
  peacock_f: her('peacock', { shade: ['#6a5a48', '#a89878', '#d8cdb0'], tail: { type: 'round', h: 0.15, tint: '#b8a888' }, fin: '#b8a888',
    dorsal: { at: 0.8, len: 0.64, h: 0.08, spines: 0.6, nSp: 16, spineH: [0.045, 0.06], notch: 0.15, rake: 0.7, tip: 'point', trail: 0.03, drop: 0.8 },
    anal: { at: 0.5, len: 0.25, h: 0.08, spines: 0.3, nSp: 3, spineH: [0.04, 0.06], tip: 'point', trail: 0.02 }, pelvic: { u: 0.67, len: 0.11, tint: '#b8a888' },
    marks: [{ k: 'bars', us: [0.3, 0.42, 0.54, 0.66, 0.78], w: 0.028, c: '#4a3c2c', a: 0.35 }] }),
  // kadango female: silver, a faint dark midline, pale fins
  kadango_f: her('kadango', { shade: ['#6a7078', '#a8b0b4', '#e0e2e0'], tail: { type: 'fork', h: 0.16, tint: '#c0c4c4' }, fin: '#c4c8c8',
    dorsal: { at: 0.78, len: 0.58, h: 0.09, spines: 0.55, nSp: 15, spineH: [0.05, 0.07], notch: 0.15, rake: 0.6, tip: 'point', trail: 0.03, drop: 0.7 },
    anal: { at: 0.5, len: 0.23, h: 0.09, spines: 0.3, nSp: 3, spineH: [0.04, 0.06], tip: 'point', trail: 0.02 }, pelvic: { u: 0.67, len: 0.11, tint: '#c8cccc' },
    marks: [{ k: 'band', u0: 0.22, u1: 0.93, v0: -0.012, v1: 0.012, c: '#3a4048', a: 0.45, f: 0.01 }] }),
  // golden mbuna female: gold with black stripes (the male is the dark one)
  auratus_f: her('auratus', { shade: ['#a07818', '#e0b030', '#f4dc80'], tail: { type: 'round', h: 0.14, tint: '#e0b838' }, fin: '#dcb030',
    dorsal: { at: 0.78, len: 0.64, h: 0.09, spines: 0.65, nSp: 18, spineH: [0.05, 0.07], notch: 0.15, rake: 0.55, tip: 'point', trail: 0.03, drop: 0.75, edge: '#f4e8a0' },
    anal: { at: 0.48, len: 0.24, h: 0.09, spines: 0.3, nSp: 3, spineH: [0.04, 0.06], tip: 'point', trail: 0.02, tint: '#d8b030' }, pelvic: { u: 0.68, len: 0.1, tint: '#d8b030' },
    marks: [{ k: 'band', u0: 0.12, u1: 0.96, v0: -0.075, v1: -0.045, c: '#1a1814', a: 0.9, f: 0.012 }, { k: 'band', u0: 0.2, u1: 0.94, v0: 0.04, v1: 0.07, c: '#1a1814', a: 0.85, f: 0.012 }] }),
  // yellow pelvics and anal, the dorsal's black band fainter
  yellowlab_f: her('yellowlab', { anal: { at: 0.48, len: 0.25, h: 0.09, spines: 0.3, nSp: 3, spineH: [0.04, 0.065], notch: 0.2, tip: 'point', trail: 0.03 }, pelvic: { u: 0.68, len: 0.1, tint: '#e8c43a' },
    finMarks: [{ k: 'band', u0: 0.18, u1: 0.8, v0: -0.4, v1: -0.196, c: '#2a2820', a: 0.5, f: 0.008 }] }),
  // slimmer, silver with a yellow wash, no deep keel; faint bars
  boesemani_f: her('boesemani', { depth: 0.31, angular: 0.15, shade: ['#5a6070', '#a8aab0', '#dcd4b4'], tail: { type: 'fork', h: 0.15, tint: '#d8c08a' }, fin: '#d4c094',
    marks: [{ k: 'band', u0: 0.08, u1: 0.5, v0: -1, v1: 1, c: '#d8b86a', a: 0.6, f: 0.06 }, { k: 'bars', us: [0.52, 0.58], w: 0.02, c: '#3a3a44', a: 0.3 }],
    finMarks: [{ k: 'band', u0: 0, u1: 0.5, v0: -1, v1: 1, c: '#d8b86a', a: 0.4, f: 0.05 }] }),
  // small and yellow, a bold black stripe and flank spot, black leading edge on the pelvics, short round fins
  cockatoo_f: her('cockatoo', { depth: 0.31, shade: ['#a08a3a', '#e4c440', '#f0e090'], tail: { type: 'round', h: 0.14, tint: '#e0c860' }, fin: '#e0c860',
    dorsal: { at: 0.8, len: 0.56, h: 0.08, spines: 0.6, nSp: 10, spineH: [0.06, 0.06], notch: 0.25, rake: 0.6, trail: 0.025, edge: '#1a1a18' },
    anal: { at: 0.5, len: 0.25, h: 0.08, spines: 0.25, nSp: 3, spineH: [0.035, 0.055], trail: 0.02 }, pelvic: { u: 0.67, len: 0.1, tint: '#1a1a18' },
    marks: [{ k: 'band', u0: 0.22, u1: 0.93, v0: -0.018, v1: 0.018, c: '#1a1810', a: 0.95, f: 0.008 }, { k: 'blob', u: 0.55, v: 0, ru: 0.035, rv: 0.035, c: '#1a1810', a: 0.9 },
      { k: 'blob', u: 0.9, v: 0.06, ru: 0.02, rv: 0.035, c: '#1a1810', a: 0.7 }], finMarks: [] }),
  // smaller, the first dorsal only a little taller than the second
  mandarin_f: her('mandarin', { dorsal: { at: 0.66, len: 0.1, h: 0.1, spines: 1, nSp: 4, spineH: [0.13, 0.1], notch: 0.2, tint: '#d0602a' } }),
});

// nano schoolers (S238, 2026-10-26): built from the chili and neon plans with their own paint; no reference photos opened, so colours are from
// Seriously Fish's descriptions (recorded as model v1 on the review page)
Object.assign(PLANS, {
  // green neon tetra (Paracheirodon simulans): a blue-green stripe from the eye to the tail base, a silvery-white belly, clear forked tail, no red band
  greenneon: her('tetra', { depth: 0.2, shade: ['#4e5e4a', '#a2b0a0', '#e8eae2'], tail: { type: 'fork', h: 0.14, tint: '#c4ccc8', a: 0.7 }, fin: '#c4ccc8',
    marks: [
      { k: 'band', u0: 0.22, u1: 0.93, v0: 0.04, v1: 0.17, c: '#f4f6f2', a: 0.5, f: 0.03 },    // silver translucent belly
      { k: 'band', u0: 0.2, u1: 0.8, v0: -0.115, v1: -0.07, c: '#2f3f2b', a: 0.35, f: 0.016 },
      { k: 'band', u0: 0.2, u1: 0.95, v0: -0.076, v1: 0.004, c: '#5af0c8', a: 0.2, f: 0.02 },
      { k: 'band', u0: 0.2, u1: 0.95, v0: -0.056, v1: -0.014, c: '#1fb58c', a: 1, f: 0.008 },
      { k: 'band', u0: 0.26, u1: 0.9, v0: -0.047, v1: -0.027, c: '#8ef2d4', a: 0.85, f: 0.006 }],
    eye: { r: 0.026, iris: ['#bcd2cc', '#3c5a52'] } }),
  // strawberry rasbora (Boraras merah): a red-orange body, a large dark blotch behind the gill cover and a smaller one at the tail base
  merah: her('chili', { shade: ['#b6402a', '#dc623a', '#eca882'], tail: { type: 'fork', h: 0.13, tint: '#d4684a', a: 0.8 }, fin: '#d8785a',
    marks: [{ k: 'band', u0: 0.24, u1: 0.7, v0: -0.008, v1: 0.008, c: '#3a1c16', a: 0.45, f: 0.008 }, { k: 'blob', u: 0.62, v: -0.002, ru: 0.06, rv: 0.04, c: '#201210', a: 0.85 }, { k: 'blob', u: 0.24, v: 0, ru: 0.025, rv: 0.022, c: '#201210', a: 0.85 }],
    eye: { r: 0.03, iris: ['#d88a58', '#4a1a12'] } }),
  // exclamation point rasbora (Boraras urophthalmoides): orange-red; a black stripe along the rear body and a round black spot on the tail base, the "!"
  exclamation: her('chili', { depth: 0.2, shade: ['#c0602c', '#e88c44', '#f4cc9c'], tail: { type: 'fork', h: 0.13, tint: '#e0905a', a: 0.8 }, fin: '#e4a070',
    marks: [{ k: 'band', u0: 0.34, u1: 0.74, v0: -0.01, v1: 0.01, c: '#1e1210', a: 0.9, f: 0.008 }, { k: 'blob', u: 0.23, v: 0, ru: 0.03, rv: 0.026, c: '#1e1210', a: 0.9 }],
    eye: { r: 0.03, iris: ['#dc9a5c', '#4a2a12'] } }),
  // dwarf spotted rasbora (Boraras maculatus): red-orange with a dark shoulder spot, a dark spot on the tail base and a thin dark line between
  dwarfrasbora: her('chili', { depth: 0.22, shade: ['#b23c2c', '#d85c3c', '#e8a282'], tail: { type: 'fork', h: 0.13, tint: '#cc6048', a: 0.8 }, fin: '#d0725a',
    marks: [{ k: 'band', u0: 0.26, u1: 0.62, v0: -0.006, v1: 0.006, c: '#2a1814', a: 0.6, f: 0.006 }, { k: 'blob', u: 0.66, v: -0.004, ru: 0.034, rv: 0.036, c: '#1c100e', a: 0.9 }, { k: 'blob', u: 0.23, v: 0, ru: 0.03, rv: 0.026, c: '#1c100e', a: 0.9 }],
    eye: { r: 0.03, iris: ['#d07a50', '#4a1a12'] } }),
});

const SHRIMP: Record<string, ShrimpSpec> = {
  cherryshrimp: { body: ['#b8242a', '#d8444a'] },
  amano: { body: ['#6e7a7c', '#94a0a0'], glass: 0.3, dashes: '#3a1e16', stripe: '#e8d8a0' },
  // skunk cleaner (Lysmata amboinensis): red back split by a broad white stripe, orange-yellow flanks, long white antennae
  cpo: { body: ['#d8681e', '#f0a050'] }, cajundwarf: { body: ['#8a7a5e', '#b4a686'] }, rswcrayfish: { body: ['#b02a1c', '#d86a50'] }, redclaw: { body: ['#3e6e62', '#78a090'] },
  cleanershrimp: { body: ['#c8281e', '#e8a838'], back: '#c42a20', stripe: '#f6f4ee', stripeW: 0.022, ant: ['#f4f2ea', 1.35] },
};
/**
 * The shrimp's fish-style plan: gives the card its outline; the 3D body itself is
 * render/shrimp3d.ts (art/shrimps.ts), not this loft.
 */
const shrimpPlan = (s: ShrimpSpec): Plan => ({
  outline: SHRIMP_OUTLINE, thick: 0.6, pedT: 0.6, depth: 0.205, pedU: 0.14, ped: 0.05, pectoral: false,
  shade: [s.body[0], s.body[1], s.body[1]], tail: { type: 'fork', h: 0.1 }, fin: s.body[0],
  eye: { r: 0.022, u: 0.835, dv: -0.17, iris: ['#3a2a22', '#120c0a'] },
  limbs: [
    ...[0, 1, 2, 3, 4].map(i => ({ u: 0.72 - i * 0.07, v: 0.045, to: [-0.03, 0.11, 0.03], via: [-0.005, 0.03, 0.04], r: 0.005 }) as Limb),
    ...[0, 1, 2, 3].map(i => ({ u: 0.42 - i * 0.07, v: 0.06, to: [-0.02, 0.05, 0.02], r: 0.004 }) as Limb),
    ...[[0.58, -0.1, 0.08, -0.13, 0.03], [0.7, -0.08, 0.13, -0.12, 0.05]].map(([l, v, z, vv, vz]) => ({ u: 0.88, v: -0.065, to: [-l * (s.ant?.[1] ?? 1), v, z], via: [-0.13, vv, vz], r: 0.003, c: s.ant?.[0] }) as Limb),
  ],
});
const SHRIMP_PLANS = Object.fromEntries(Object.entries(SHRIMP).map(([k, s]) => [k, shrimpPlan(s)]));
/** The body plan the 3D loft and the card cut-out use: a fish plan, or a drawn body's (shrimp). */
export const bodyPlan = (art: string): Plan | undefined => PLANS[art] ?? SHRIMP_PLANS[art];
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

