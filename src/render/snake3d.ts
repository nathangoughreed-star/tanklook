// Snakes in 3D (lane BP, 2026-10-16; roadmap Release 2): the serpentine body plan, a limbless animal (not an adapted lizard).
// Per species only data (art/snakes.ts). A SPINE of exactly 280 steps of 1/280 of the total length (a pose bends the spine, never
// stretches it), laid on the surface the animal lies on: a path of headings (coil, S curve, helix round a limb) whose segments
// are lifted over the earlier coils they cross (a chain of spheres resting on one another), so a coil never passes through its
// own body. The body is a loft round that spine: a rounded-triangle section (flat belly, a low ridge down the back), a short
// thin tail, a neck narrower than the head, and a head of its own: broad skull, labial heat pits along the upper lip,
// nostrils, a vertical elliptical pupil in a gold eye. Painted analytically (blotches that hold a dark spot, cream belly with
// its plates, cream lip scales), the head with a texture of its own so a close crop stays crisp; over the paint a tiled layer
// of overlapping scales (dark rear edges, a catch of light on each) and a soft sheen, both baked into the mesh. Unlit, like the
// herps: shading is in the vertex colours.
// Poses (`snakePoseOf`; the pose family rides in `Fish.bend`: round((bend + 1) * 2) = 0..4, the remainder mirrors and varies it,
// so no new field and no scene version bump): on a floor / ledge / cork top 'ball' (defensive, head tucked in the middle),
// 'extended' (gently curved), 'coiled' (resting, the head laid on the coils), 'alert' (a loose coil, the neck raised in an S),
// 'serpentine' (a strong S); on a branch 'wrap' (a helix round the limb), 'wrapalert' (the same, head raised), 'drape' (along the
// top of the limb, the ends hanging over its sides).
// Frame: unit = the total length = the card width; x forward (the head), y up, z + side; the surface is the plane y = -ground
// (on a branch: the limb's top, its axis at y = -ground - R).
import * as THREE from 'three';
import { SNAKES, isSnake, snakeGround, type SnakeSpec } from '../art/snakes';
import { curveOf } from '../art/lizards';
import { rng } from '../art/paint';
import { V, TAU, clamp01, smooth } from './limbs';

export { isSnake };
export type SnakePose = 'ball' | 'extended' | 'coiled' | 'alert' | 'serpentine' | 'wrap' | 'wrapalert' | 'drape';

/** Steps along the spine. */
export const SPINE_N = 280;
const M = 3 * SPINE_N, RG = 40, ROWS = 48;
const PL = ['ball', 'extended', 'coiled', 'alert', 'serpentine'] as const;
const PC = ['wrap', 'drape', 'wrap', 'wrapalert', 'drape'] as const;

const matCache = new Map<string, THREE.Material>();
function mat<M extends THREE.Material>(key: string, make: () => M): M {
  let m = matCache.get(key) as M | undefined;
  if (!m) { m = make(); m.userData.cached = true; m.userData.fish = true; matCache.set(key, m); }
  return m;
}
const geoCache = new Map<string, THREE.BufferGeometry>();
function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key); if (!g) { g = make(); g.userData.keep = true; geoCache.set(key, g); }
  return g;
}
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255] as [number, number, number]; };
const mix = (a: number[], b: number[], k: number) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const spE = (c: number, e: number) => Math.sign(c) * Math.abs(c) ** (2 / e);
const frac = (x: number) => x - Math.floor(x);
const hash = (x: number, y: number) => frac(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);

// ---------- body profile and section ----------

interface Prof { hw: (s: number) => number; top: (s: number) => number; bot: (s: number) => number }
/** The station curves; `babyK` > 1 enlarges the head (a hatchling's head is big for its body). */
function profile(S: SnakeSpec, babyK: number): Prof {
  const f = (k: 1 | 2 | 3) => curveOf(S.stations.map(t => [t[0], t[k]] as [number, number]));
  const hw = f(1), tp = f(2), bt = f(3), hk = (s: number) => 1 + (babyK - 1) * smooth(0.9, S.neck + 0.012, s);
  return { hw: s => hw(s) * hk(s), top: s => tp(s) * hk(s), bot: s => bt(s) * hk(s) };
}
/** Share of the head's shape (0 on the body, 1 on the head) at s. */
const headMask = (S: SnakeSpec, s: number) => smooth(S.neck, S.neck + 0.022, s);
/** The section's point at angle a from the top (0 = back, pi/2 = + side, pi = belly): [up from the spine, side]. */
function section(S: SnakeSpec, hw: number, top: number, bot: number, a: number, hm: number): [number, number] {
  const cs = Math.cos(a), sn = Math.sin(a), e = cs >= 0 ? S.eT : S.eB, fold = a <= Math.PI ? a : TAU - a;
  let up = cs >= 0 ? top * spE(cs, S.eT) : bot * spE(cs, S.eB);
  // the lower jaw is narrower than the skull
  const side = hw * spE(sn, e) * (1 - 0.16 * hm * smooth(0.5 * Math.PI, 0.85 * Math.PI, fold));
  if (cs > 0 && hw > 1e-9) up += S.ridge * top * Math.exp(-(((side / hw) / 0.3) ** 2)) * cs * (1 - 0.7 * hm);
  return [up, side];
}

// ---------- the spine ----------

export interface Spine { P: THREE.Vector3[]; U: THREE.Vector3[]; rr: number[]; pose: SnakePose; cyl: number | null; ground: number }
export const snakePoseOf = (surface: string | undefined, R: number | undefined, bend: number) => {
  const q = (Math.min(1, Math.max(-1, bend || 0)) + 1) * 2, idx = Math.min(4, Math.max(0, Math.round(q))), v = q - idx;
  const cyl = surface === 'perch' && R && R > 0 ? R : null;
  // on the top of a rock or ledge (not a limb) only the small poses (ball, coil) fit: the others settle into the coil
  const pose: SnakePose = cyl ? (cyl < 0.012 ? 'drape' : PC[idx]) : surface === 'hardscape' && idx !== 0 && idx !== 2 ? 'coiled' : PL[idx];
  return { pose, idx, sign: v < 0 ? -1 : 1, mag: Math.round(Math.min(1, Math.abs(v) * 2) * 2) / 2, cyl };
};

/** The heading round a spiral that runs in (ρ0 at the tail to ρ1 at the head) or out: the curvature at s. */
function spiralIn(Ls: number, rho1: number, pitch: number) {
  const n = (-2 * Math.PI * rho1 + Math.sqrt(4 * Math.PI ** 2 * rho1 ** 2 + 4 * Math.PI * pitch * Ls)) / (2 * Math.PI * pitch);
  const rho0 = rho1 + pitch * n, c = pitch / TAU;
  return (s: number) => 1 / Math.sqrt(Math.max(rho1 * rho1, rho0 * rho0 - 2 * c * s));
}
const spiralOut = (rho0: number, pitch: number) => { const c = pitch / TAU; return (s: number) => 1 / Math.sqrt(rho0 * rho0 + 2 * c * s); };

interface Curves { th: number[]; lift: number[]; phi0?: boolean }
/** The heading and the profile lift (raised head, rising neck) of each pose along the spine. */
function curves(S: SnakeSpec, pose: SnakePose, sign: number, mag: number, cylR: number | null, ss: number[], dmax: number): Curves {
  const N = ss.length - 1, th: number[] = new Array(N + 1).fill(0), lift: number[] = new Array(N + 1).fill(0), ds = 1 / N;
  const integ = (kappa: (s: number) => number) => { let t = 0; for (let i = 0; i <= N; i++) { th[i] = t; t += sign * kappa(ss[i] + ds / 2) * ds; } };
  const ph = S.blotch.seed * 1.7;
  if (pose === 'coiled') {
    const k = spiralIn(1, 0.052 + 0.012 * mag, dmax * (0.62 + 0.12 * mag));
    integ(s => k(s) * (0.35 + 0.65 * smooth(0, 0.07, s)) * (1 - 0.55 * smooth(0.9, 1, s)) * (1 + 0.1 * Math.sin(TAU * 2.3 * s + ph))); // a little irregular, like a real coil
  } else if (pose === 'alert') {
    const s0 = 0.56 + 0.06 * mag, k = spiralOut(0.05, dmax * 0.9), neck = 0.7 + 0.2 * mag;
    integ(s => s < s0 ? k(s) : k(s0) * (1 - smooth(s0, s0 + 0.09, s)) + sign * 0 + neck * Math.sin(TAU * (s - s0) / (1 - s0)) * 0.35 * smooth(s0 + 0.04, s0 + 0.12, s));
    const H = 0.105 + 0.03 * mag;
    for (let i = 0; i <= N; i++) lift[i] = H * smooth(0.68, 0.9, ss[i]) * (1 - 0.18 * smooth(0.95, 1, ss[i]));
  } else if (pose === 'extended' || pose === 'serpentine') {
    const A = pose === 'extended' ? 0.5 + 0.25 * mag : 0.95 + 0.2 * mag, f = pose === 'extended' ? 1.45 : 2.2;
    for (let i = 0; i <= N; i++) { th[i] = sign * A * Math.sin(TAU * f * ss[i] + ph) * (1 - 0.8 * smooth(0.78, 1, ss[i])) * (0.5 + 0.5 * smooth(0, 0.12, ss[i])); lift[i] = 0.012 * smooth(0.9, 1, ss[i]); }
  } else if (cylR !== null) {
    // helix round a limb: heading off the axis so each turn advances 2.3 body widths (a loose wrap), the tail lying straight along it first, the head straight along the top
    const Rc = cylR + 0.02, circ = TAU * Rc, adv = 2.3 * dmax, al = Math.atan2(circ, adv), end = pose === 'drape' ? 0 : 0.74 + 0.04 * mag;
    if (pose === 'drape') {
      const A = 0.28 + 0.25 * mag;
      for (let i = 0; i <= N; i++) th[i] = sign * A * Math.sin(TAU * 1.05 * ss[i] + ph) * (0.35 + 0.65 * Math.sin(Math.PI * ss[i]) ** 0.6);
    } else {
      for (let i = 0; i <= N; i++) th[i] = sign * al * (1 - smooth(end - 0.06, end + 0.03, ss[i])) * smooth(0.05, 0.13, ss[i]);
      if (pose === 'wrapalert') for (let i = 0; i <= N; i++) lift[i] = 0.05 * smooth(0.86, 0.97, ss[i]);
      else for (let i = 0; i <= N; i++) lift[i] = 0.01 * smooth(0.92, 1, ss[i]);
    }
    return { th, lift, phi0: pose !== 'drape' };
  }
  return { th, lift };
}

/** Lay the headings and lifts out on the surface: positions along it (a along x; lat = z, or the angle round a limb). */
function trace(th: number[], lift: number[], bot: number[], cylR: number | null) {
  const N = th.length - 1, ds = 1 / N, a = [0], lat = [0];
  for (let i = 1; i <= N; i++) {
    const dh = Math.max(-0.95 * ds, Math.min(0.95 * ds, lift[i] - lift[i - 1])), hs = Math.sqrt(ds * ds - dh * dh), t = (th[i - 1] + th[i]) / 2;
    a.push(a[i - 1] + hs * Math.cos(t));
    lat.push(lat[i - 1] + (cylR === null ? hs * Math.sin(t) : hs * Math.sin(t) / (cylR + bot[i] + lift[i])));
  }
  return { a, lat };
}

/** Lifts that keep every spine sphere clear of the earlier ones (a chain of spheres resting on each other). */
function stack(base: number[], pos: { a: number[]; lat: number[] }, rr: number[], ss: number[], cylR: number | null, bot: number[]) {
  const N = base.length - 1, L: number[] = [], k = cylR === null ? 1 : cylR + 0.02;
  for (let i = 0; i <= N; i++) {
    let h = base[i];
    for (let j = 0; j < i; j++) {
      const R = (rr[i] + rr[j]) * 1.03; if (ss[i] - ss[j] < 1.8 * R) continue;
      const da = pos.a[i] - pos.a[j];
      let dl = pos.lat[i] - pos.lat[j]; if (cylR !== null) { dl = ((dl + Math.PI) % TAU + TAU) % TAU - Math.PI; }
      const d = Math.hypot(da, dl * k);
      if (d < R) h = Math.max(h, bot[j] + L[j] + Math.sqrt(R * R - d * d) - bot[i]); // heights of the sphere centres: the belly's depth differs along the body
    }
    L.push(h);
  }
  return L;
}
const smoothSeries = (x: number[], w: number) => x.map((_, i) => { let s = 0, n = 0; for (let k = -w; k <= w; k++) { const j = i + k; if (j >= 0 && j < x.length) { s += x[j]; n++; } } return s / n; });

/** The spine of a surface pose: heading curves traced on a plane or a limb, lifted over its own coils, then turned and centred. */
function planeSpine(S: SnakeSpec, P: Prof, pose: SnakePose, sign: number, mag: number, cylR: number | null, G: number): Spine {
  const N = SPINE_N, ss = Array.from({ length: N + 1 }, (_, i) => i / N), hw = ss.map(P.hw), bot = ss.map(P.bot);
  const rr = ss.map((s, i) => 0.5 * (hw[i] + 0.5 * (P.top(s) + bot[i])));
  const dmax = 2 * Math.max(...hw), cv = curves(S, pose, sign, mag, cylR, ss, dmax);
  let lift = cv.lift.slice(), pos = trace(cv.th, lift, bot, cylR);
  for (let pass = 0; pass < 8; pass++) {
    const st = stack(cv.lift, pos, rr, ss, cylR, bot), sm = smoothSeries(st, 3);
    lift = sm.map((v, i) => Math.max(v, st[i] * 0.985, cv.lift[i], pass < 5 ? 0 : lift[i] * 0.97)); // the last passes only ever raise, so the loop settles
    pos = trace(cv.th, lift, bot, cylR);
  }
  const Pt: THREE.Vector3[] = [], Ut: THREE.Vector3[] = [];
  if (cylR === null) {
    // turn the head's heading to +x, then centre the footprint
    const k = N - 6, ang = Math.atan2(pos.lat[N] - pos.lat[k], pos.a[N] - pos.a[k]), c = Math.cos(-ang), s2 = Math.sin(-ang);
    const x = pos.a.map((a, i) => a * c - pos.lat[i] * s2), z = pos.a.map((a, i) => a * s2 + pos.lat[i] * c);
    const cx = (Math.min(...x) + Math.max(...x)) / 2, cz = (Math.min(...z) + Math.max(...z)) / 2;
    for (let i = 0; i <= N; i++) { Pt.push(V(x[i] - cx, -G + bot[i] + lift[i], z[i] - cz)); Ut.push(V(0, 1, 0)); }
  } else {
    // the helix ends on the top of the limb: shift the angle so the head's end is at phi = 0
    const shift = cv.phi0 ? -pos.lat[N] : -pos.lat[N] / 2 + (pos.lat[0] - pos.lat[0]);
    const cx = (Math.min(...pos.a) + Math.max(...pos.a)) / 2, yA = -G - cylR;
    for (let i = 0; i <= N; i++) {
      const phi = pos.lat[i] + shift, n = V(0, Math.cos(phi), Math.sin(phi)), r = cylR + bot[i] + lift[i];
      Pt.push(V(pos.a[i] - cx, yA + r * n.y, r * n.z)); Ut.push(n);
    }
  }
  return { P: Pt, U: Ut, rr, pose, cyl: cylR, ground: G };
}

/** The defensive ball: a spiral over a sphere (the tail round the bottom to the top), the head diving into the middle. Rs by bisection so the length is 1. */
function ballSpine(S: SnakeSpec, P: Prof, sign: number, mag: number, G: number): Spine {
  const N = SPINE_N, ss = Array.from({ length: N + 1 }, (_, i) => i / N), hw = ss.map(P.hw), rr = ss.map((s, i) => 0.5 * (hw[i] + 0.5 * (P.top(s) + P.bot(s))));
  const dmax = 2 * Math.max(...hw), thA = 2.75, thB = 0.5 - 0.05 * mag, K = 1600;
  const dense = (Rs: number) => {
    const pitch = 1.06 * dmax / Rs, turns = (thA - thB) / pitch, out: THREE.Vector3[] = [], sp = (th: number, ph: number, r: number) => V(r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph));
    for (let k = 0; k <= K; k++) { const t = k / K; out.push(sp(thA + (thB - thA) * t, sign * TAU * turns * t, Rs)); }
    const pe = sign * TAU * turns;
    const dive = new THREE.CatmullRomCurve3([out[K], sp(0.3, pe + sign * 0.8, Rs * 0.66), sp(0.75, pe + sign * 1.5, Rs * 0.34), sp(1.5, pe + sign * 2.2, Rs * 0.16)], false, 'centripetal').getPoints(120);
    return out.concat(dive.slice(1));
  };
  const len = (pts: THREE.Vector3[]) => pts.reduce((l, p, i) => (i ? l + p.distanceTo(pts[i - 1]) : 0), 0);
  let lo = 0.03, hi = 0.16;
  for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2; if (len(dense(mid)) < 1) lo = mid; else hi = mid; }
  const Rs = (lo + hi) / 2, pts = dense(Rs), cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const tot = cum[cum.length - 1], Pt: THREE.Vector3[] = [], Ut: THREE.Vector3[] = [];
  for (let i = 0, j = 0; i <= N; i++) {
    const d = tot * i / N; while (j < cum.length - 2 && cum[j + 1] < d) j++;
    const f = (d - cum[j]) / (cum[j + 1] - cum[j] || 1), p = pts[j].clone().lerp(pts[j + 1], clamp01(f)), r = p.length();
    const n = p.clone().normalize(), up = V(0, 1, 0);
    Pt.push(p); Ut.push(n.lerp(up, 1 - smooth(0.18 * Rs, 0.7 * Rs, r)).normalize());
  }
  // rest the lowest part of the body on the ground line
  let low = Infinity; const T = V();
  for (let i = 0; i <= N; i++) {
    T.copy(Pt[Math.min(N, i + 1)]).sub(Pt[Math.max(0, i - 1)]).normalize();
    const u = Ut[i].clone().addScaledVector(T, -Ut[i].dot(T)).normalize(), sd = T.clone().cross(u);
    for (let q = 0; q < 24; q++) { const a = TAU * q / 24, [up, side] = section(S, hw[i], P.top(ss[i]), P.bot(ss[i]), a, 0); low = Math.min(low, Pt[i].y + u.y * up + sd.y * side); }
  }
  for (const p of Pt) p.y += -G - low + 0.0004;
  return { P: Pt, U: Ut, rr, pose: 'ball', cyl: null, ground: G };
}

export function spineOf(S: SnakeSpec, surface: string | undefined, R: number | undefined, bend: number, babyK = 1): Spine {
  const { pose, sign, mag, cyl } = snakePoseOf(surface, R, bend), P = profile(S, babyK), G = snakeGround(S);
  return pose === 'ball' ? ballSpine(S, P, sign, mag, G) : planeSpine(S, P, pose, sign, mag, cyl, G);
}

// ---------- loft ----------

interface Ring { P: THREE.Vector3; T: THREE.Vector3; U: THREE.Vector3; S: THREE.Vector3; hw: number; top: number; bot: number; hm: number; s: number }
function rings(S: SnakeSpec, prof: Prof, sp: Spine): Ring[] {
  const N = SPINE_N, curve = new THREE.CatmullRomCurve3(sp.P, false, 'centripetal'), out: Ring[] = [];
  let prevU = sp.U[0].clone();
  for (let j = 0; j <= M; j++) {
    const s = j / M, f = Math.min(N - 1e-9, s * N), i = Math.floor(f), k = f - i, p = curve.getPoint(s), T = curve.getTangent(s).normalize();
    let u = sp.U[i].clone().lerp(sp.U[Math.min(N, i + 1)], k); u.addScaledVector(T, -u.dot(T));
    if (u.lengthSq() < 0.04) u = prevU.clone().addScaledVector(T, -prevU.dot(T)); u.normalize(); prevU = u;
    out.push({ P: p, T, U: u, S: T.clone().cross(u).normalize(), hw: prof.hw(s), top: prof.top(s), bot: prof.bot(s), hm: headMask(S, s), s });
  }
  return out;
}
const capK = (s: number) => Math.sqrt(clamp01(s / 0.006)) * Math.sqrt(clamp01((1 - s) / 0.007));

function loft(S: SnakeSpec, rs: Ring[]) {
  const C = RG + 1, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const r of rs) {
    const k = capK(r.s);
    for (let q = 0; q <= RG; q++) {
      const a = TAU * q / RG, [up, side] = section(S, r.hw * k, r.top * k, r.bot * k, a, r.hm);
      pos.push(r.P.x + r.U.x * up + r.S.x * side, r.P.y + r.U.y * up + r.S.y * side, r.P.z + r.U.z * up + r.S.z * side);
      uv.push(r.s, q / RG);
    }
  }
  for (let j = 0; j < M; j++) for (let q = 0; q < RG; q++) { const a = j * C + q, b = a + C; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // wound outward? the normal of a side vertex against its direction from the ring's axis
  const n = g.attributes.normal, p = g.attributes.position, j = M >> 1, q0 = RG >> 2, cen = V(), q = V();
  for (let t = 0; t < RG; t++) cen.add(q.fromBufferAttribute(p, j * C + t)); cen.divideScalar(RG);
  if (V().fromBufferAttribute(n, j * C + q0).dot(q.fromBufferAttribute(p, j * C + q0).sub(cen)) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals();
  }
  const nm = g.attributes.normal, t = V(), u = V();
  for (let i = 0; i <= M; i++) { const a = i * C, b = a + RG; t.fromBufferAttribute(nm, a); u.fromBufferAttribute(nm, b); t.add(u).normalize(); nm.setXYZ(a, t.x, t.y, t.z); nm.setXYZ(b, t.x, t.y, t.z); }
  return g;
}

// ---------- paint ----------

interface Bl { s: number; a: number; L: number; A: number; p1: number; p2: number }
function blotches(S: SnakeSpec, side: number): { main: Bl[]; fleck: Bl[] } {
  const r = rng(S.blotch.seed + side * 101), P = S.blotch.period, main: Bl[] = [], fleck: Bl[] = [];
  for (let s = 0.02 + side * P * 0.5; s < 0.96; s += P * (1 + (r() - 0.5) * 2 * S.blotch.jitter)) {
    const tp = 0.45 + 0.55 * smooth(0.02, 0.14, s);
    main.push({ s, a: (0.57 + (r() - 0.5) * 0.08) * Math.PI, L: P * (0.33 + 0.08 * r()) * tp, A: (0.15 + 0.05 * r()) * Math.PI * tp, p1: r() * TAU, p2: r() * TAU });
    const keep = r() < 0.55;
    if (keep) fleck.push({ s: s + P * 0.5, a: (0.14 + (r() - 0.5) * 0.05) * Math.PI, L: P * 0.13 * tp, A: 0.06 * Math.PI * tp, p1: r() * TAU, p2: r() * TAU });
  }
  return { main, fleck };
}
const near = (list: Bl[], s: number) => { let lo = 0, hi = list.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].s < s) lo = m + 1; else hi = m; } return lo; };

/** The colour (linear 0..1) of the skin at s along the body and angle a round it (0 = back .. pi = belly) on one side. */
function skinFn(S: SnakeSpec) {
  const C = Object.fromEntries(Object.entries(S.col).map(([k, v]) => [k, rgb(v)])) as Record<keyof SnakeSpec['col'], [number, number, number]>;
  const bl = [blotches(S, 0), blotches(S, 1)], PI = Math.PI, scale = S.scale;
  const eyeS = S.eye.s, eyeA = S.eye.a;
  return (s: number, tt: number, out: number[]) => {
    const side = tt < PI ? 0 : 1, a = tt < PI ? tt : TAU - tt, head = smooth(S.neck, S.neck + 0.017, s);
    let c = mix(C.dorsal, C.flank, smooth(0.15 * PI, 0.45 * PI, a));
    c = mix(c, [c[0] * 0.65, c[1] * 0.65, c[2] * 0.65], 0.55 * Math.max(0, 1 - Math.abs(a - 0.68 * PI) / (0.08 * PI)));
    const body = 1 - head;
    if (body > 0) {
      const list = bl[side], k0 = near(list.main, s);
      for (let k = Math.max(0, k0 - 2); k <= Math.min(list.main.length - 1, k0 + 2); k++) {
        const b = list.main[k], x = (s - b.s) / b.L, y = (a - b.a) / b.A, d = Math.hypot(x, y);
        if (d > 1.4) continue;
        const psi = Math.atan2(y, x), rf = 1 + 0.2 * Math.sin(3 * psi + b.p1) + 0.1 * Math.sin(5 * psi + b.p2), cov = (1 - smooth(rf - 0.16, rf, d)) * body;
        if (cov > 0) c = mix(c, mix(C.tan, C.tanEdge, smooth(rf - 0.55, rf - 0.04, d)), cov);
        const x2 = x / 0.3, y2 = (a - (b.a - 0.4 * b.A)) / (0.3 * b.A), dd = Math.hypot(x2, y2);
        if (dd < 1) c = mix(c, C.spot, 0.92 * (1 - smooth(0.55, 1, dd)) * body);
      }
      const f0 = near(list.fleck, s);
      for (let k = Math.max(0, f0 - 1); k <= Math.min(list.fleck.length - 1, f0 + 1); k++) {
        const b = list.fleck[k], d = Math.hypot((s - b.s) / b.L, (a - b.a) / b.A);
        if (d < 1) c = mix(c, mix(C.tan, C.dorsal, 0.45), 0.75 * (1 - smooth(0.5, 1, d)) * body);
      }
    }
    // the belly: cream, with a plate every `scale`, a few dark flecks along its edge
    const bel = smooth(0.72 * PI, 0.84 * PI, a);
    if (bel > 0) {
      const plate = frac(s / scale), cx = Math.floor(s / scale);
      let w = mix(C.belly, [C.belly[0] * 0.95, C.belly[1] * 0.93, C.belly[2] * 0.9], hash(cx, 3));
      if (plate < 0.09) w = w.map(v => v * 0.8);
      if (a < 0.9 * PI && hash(cx, side + 9) > 0.965) w = w.map(v => v * 0.62);
      c = mix(c, w, bel);
    }
    if (head > 0) {
      // head: dark crown, a tan stripe under the eye, cream lip scales and throat with a dark mouth line, sutures and pits
      let h: number[] = mix(C.head, [C.head[0] * 1.25, C.head[1] * 1.2, C.head[2] * 1.1], smooth(0.1 * PI, 0.35 * PI, a) * 0.0);
      h = mix(h, C.stripe, 0.85 * Math.max(0, 1 - Math.abs(a - 0.45 * PI) / (0.05 * PI)) * smooth(0.955, 0.972, s) * (1 - smooth(0.99, 0.998, s)));
      const lipA = 0.6 * PI, lipTop = 0.52 * PI;
      // the upper labial scales are cream with dark bars between; a dark mouth line; the throat cream
      h = mix(h, C.lip, smooth(lipTop - 0.03 * PI, lipTop + 0.02 * PI, a));
      const sut = frac((s - 0.9585) / 0.0034);
      if (a > lipTop && a < lipA && sut < 0.12 && s > 0.952) h = h.map(v => v * 0.55);
      if (Math.abs(a - lipA) < 0.008 * PI && s > 0.945) h = h.map(v => v * 0.3);
      for (let k = 0; k < 11; k++) { // heat pits along the upper lip, just above the mouth line
        const d = Math.hypot((s - (0.9585 + k * 0.0033 + 0.0017)) / 0.0009, (a - 0.578 * PI) / (0.014 * PI));
        if (d < 1) h = mix(h, C.pit, 0.95 * (1 - smooth(0.5, 1, d)));
      }
      const dn = Math.hypot((s - 0.9895) / 0.0008, (a - 0.27 * PI) / (0.02 * PI)); if (dn < 1) h = mix(h, C.pit, 0.95 * (1 - smooth(0.3, 1, dn)));
      const de = Math.hypot((s - eyeS) / 0.0042, (a - eyeA) / 0.34); if (de < 1) h = mix(h, C.pit, 0.6 * (1 - smooth(0.5, 1, de)));
      c = mix(c, h, head);
    }
    // each scale a touch lighter or darker (rows stagger by half a scale)
    const sc = scale * (1 - 0.4 * head), row = Math.floor(tt / TAU * ROWS), cell = Math.floor(s / sc + (row & 1) * 0.5), v = 1 + (0.92 + 0.16 * hash(cell, row) - 1) * (1 - 0.85 * bel); // the belly plates barely vary
    out[0] = c[0] * v; out[1] = c[1] * v; out[2] = c[2] * v;
    return out;
  };
}
/** Raster the skin over s0..s1 into an RGBA8 buffer (u along the body, v round it). */
function paintBuffer(S: SnakeSpec, s0: number, s1: number, W: number, H: number) {
  const skin = skinFn(S), data = new Uint8Array(W * H * 4), c = [0, 0, 0], enc = (x: number) => Math.round(255 * Math.min(1, Math.max(0, x))); // the hex colours are sRGB already: the texture is marked sRGB
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    skin(s0 + (x + 0.5) / W * (s1 - s0), (y + 0.5) / H * TAU, c);
    const i = 4 * (y * W + x); data[i] = enc(c[0]); data[i + 1] = enc(c[1]); data[i + 2] = enc(c[2]); data[i + 3] = 255;
  }
  return data;
}
function dataTex(data: Uint8Array<ArrayBuffer>, W: number, H: number, srgb: boolean, repeat = false) {
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat); t.needsUpdate = true;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.userData.keep = true; return t;
}
/** The overlapping-scale layer: two scales by two rows (rows staggered), each a rounded scale whose free rear edge casts a thin shadow, a soft catch of light on its middle. */
function scaleTile() {
  const W = 128, data = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const ux = x / W * 2, vy = y / W * 2, row = Math.floor(vy), u = frac(ux + (row & 1) * 0.5), v = frac(vy);
    const r = Math.hypot((u - 0.52) / 0.5, (v - 0.5) / 0.55);
    const dark = (smooth(0.82, 1.1, r) * 0.26 + (1 - smooth(0, 0.07, u)) * 0.2 * (1 - smooth(0.9, 1.1, r) * 0.3)) * 0.85;
    const hl = 0.1 * (1 - smooth(0.0, 0.85, Math.hypot((u - 0.62) / 0.5, (v - 0.4) / 0.5))) * (1 - dark);
    const al = Math.min(0.8, dark + hl), i = 4 * (y * W + x), g = dark + hl > 0 ? Math.round(255 * hl / (dark + hl)) : 0;
    data[i] = g; data[i + 1] = g; data[i + 2] = g; data[i + 3] = Math.round(255 * al);
  }
  return data;
}
let tileData: ReturnType<typeof scaleTile> | null = null;

// ---------- eyes ----------

function eyeParts(r: number, baby: number) {
  const out: { g: THREE.BufferGeometry; m: THREE.Material; scale: [number, number, number]; at: [number, number, number] }[] = [];
  const ball = geo('snake:ball', () => {
    const g = new THREE.SphereGeometry(1, 20, 14), p = g.attributes.position, c: number[] = [], A = rgb('#6b4519'), B = rgb('#d3a04a');
    for (let i = 0; i < p.count; i++) { const k = smooth(0.15, 0.95, p.getY(i)), q = mix(A, B, k); c.push(q[0], q[1], q[2]); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g;
  });
  const dome = geo('snake:dome', () => new THREE.SphereGeometry(1, 16, 10));
  const k = r * baby;
  out.push({ g: dome, m: mat('snake:lid', () => new THREE.MeshBasicMaterial({ color: '#1a0f07' })), scale: [1.32 * k, 0.45 * k, 1.32 * k], at: [0, -0.18 * k, 0] });
  out.push({ g: ball, m: mat('snake:iris', () => new THREE.MeshBasicMaterial({ vertexColors: true })), scale: [k, 0.78 * k, k], at: [0, -0.08 * k, 0] });
  out.push({ g: dome, m: mat('snake:pupil', () => new THREE.MeshBasicMaterial({ color: '#050303' })), scale: [0.3 * k, 0.1 * k, 0.6 * k], at: [0, 0.69 * k, 0] });
  out.push({ g: dome, m: mat('snake:glint', () => new THREE.MeshBasicMaterial({ color: '#fff8ec' })), scale: [0.13 * k, 0.05 * k, 0.13 * k], at: [0.24 * k, 0.69 * k, -0.2 * k] });
  return out;
}

// ---------- assembly ----------

type Built = { body: THREE.BufferGeometry; head: THREE.BufferGeometry; scales: THREE.BufferGeometry; sheen: THREE.BufferGeometry; eyes: { p: THREE.Vector3; look: THREE.Vector3; f: THREE.Vector3 }[]; spine: Spine };
const poseCache = new Map<string, Built>();
const paintCache = new Map<string, { body: THREE.DataTexture; head: THREE.DataTexture }>();

/** The length-based enlargement of the head and eye of a small animal (1 = adult). */
export const babyOf = (S: SnakeSpec, wmm: number) => Math.round(Math.min(1.6, Math.max(1, (S.adult / Math.max(40, wmm)) ** 0.3)) * 20) / 20;

function build(S: SnakeSpec, surface: string | undefined, R: number, bend: number, baby: number): Built {
  const sp = spineOf(S, surface, R, bend, baby), prof = profile(S, baby), rs = rings(S, prof, sp), g = loft(S, rs), C = RG + 1;
  const { cyl, ground } = sp, pos = g.attributes.position, nrm = g.attributes.normal, q = V();
  // keep every vertex off the surface it lies on (a ring turned on a slope, a coil crossing)
  for (let i = 0; i < pos.count; i++) {
    q.fromBufferAttribute(pos, i);
    if (sp.pose === 'ball' || cyl === null) { if (q.y < -ground + 0.0003) { q.y = -ground + 0.0003; pos.setXYZ(i, q.x, q.y, q.z); } }
    else { const yA = -ground - cyl, r = Math.hypot(q.y - yA, q.z); if (r < cyl + 0.0003) { const k = (cyl + 0.0003) / (r || 1); pos.setXYZ(i, q.x, yA + (q.y - yA) * k, q.z * k); } }
  }
  g.computeVertexNormals();
  const nm = g.attributes.normal, t = V(), u = V();
  for (let i = 0; i <= M; i++) { const a = i * C, b = a + RG; t.fromBufferAttribute(nm, a); u.fromBufferAttribute(nm, b); t.add(u).normalize(); nm.setXYZ(a, t.x, t.y, t.z); nm.setXYZ(b, t.x, t.y, t.z); }
  // occlusion between coils: per ring, the nearest other part of the body and how close
  const N = SPINE_N, occ0: number[] = [], dir: THREE.Vector3[] = [];
  for (let j = 0; j <= M; j++) {
    const r = rs[j]; let best = 0; const dv = V();
    for (let i = 0; i <= N; i += 2) {
      const R2 = sp.rr[Math.min(N, Math.round(r.s * N))] + sp.rr[i], far = smooth(1.2 * R2, 2.6 * R2, Math.abs(i / N - r.s));
      if (far <= 0) continue;
      const d = r.P.distanceTo(sp.P[i]), o = (1 - smooth(R2 * 0.95, R2 * 2.4, d)) * far;
      if (o > best) { best = o; dv.copy(sp.P[i]).sub(r.P).normalize(); }
    }
    occ0.push(best); dir.push(dv);
  }
  const occ = smoothSeries(occ0, 9); // along the body, so no ring is darker than its neighbours by a step
  // vertex colours: form shading + coil occlusion, and the sheen (additive) and the scale layer's alpha (zero on the belly)
  const col: number[] = [], sheen: number[] = [], alpha: number[] = [], L = V(-0.35, 0.9, 0.3).normalize(), ny = V();
  for (let j = 0; j <= M; j++) for (let k = 0; k <= RG; k++) {
    const i = j * C + k; ny.fromBufferAttribute(nrm, i);
    const shade = 0.5 + 0.5 * smooth(-0.9, 0.7, ny.y), ao = 1 - 0.5 * occ[j] * clamp01(ny.dot(dir[j]) * 1.4 + 0.25), a = TAU * k / RG, fold = a <= Math.PI ? a : TAU - a;
    const kk = shade * ao; col.push(kk, kk, kk);
    const d = Math.max(0, ny.dot(L)), I = (0.1 * d ** 24 + 0.008 * d ** 4) * ao * (1 - smooth(0.7 * Math.PI, 0.85 * Math.PI, fold) * 0.8);
    sheen.push(I, I * 0.93, I * 0.8);
    alpha.push(kk, kk, kk, (1 - smooth(0.7 * Math.PI, 0.82 * Math.PI, fold)) * smooth(0.004, 0.03, rs[j].s) * (1 - smooth(0.984, 0.997, rs[j].s)));
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // split at the neck: the body's and the head's own uv (u along its part) so each has a texture of its own
  const j0 = Math.round(S.neck * M), slice = (from: number, to: number, s0: number, s1: number) => {
    const n = to - from + 1, p = new Float32Array(n * C * 3), nn = new Float32Array(n * C * 3), c = new Float32Array(n * C * 3), uv = new Float32Array(n * C * 2);
    p.set((g.attributes.position.array as Float32Array).subarray(from * C * 3, (to + 1) * C * 3)); nn.set((g.attributes.normal.array as Float32Array).subarray(from * C * 3, (to + 1) * C * 3));
    c.set((g.attributes.color.array as Float32Array).subarray(from * C * 3, (to + 1) * C * 3));
    for (let j = 0; j < n; j++) for (let k = 0; k < C; k++) { const s = rs[from + j].s; uv[2 * (j * C + k)] = (s - s0) / (s1 - s0); uv[2 * (j * C + k) + 1] = k / RG; }
    const idx = (g.index!.array as Uint32Array | Uint16Array).slice(from * RG * 6, to * RG * 6), base = from * C, ix = new Uint32Array(idx.length);
    for (let i = 0; i < idx.length; i++) ix[i] = idx[i] - base;
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(p, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); out.setAttribute('color', new THREE.BufferAttribute(c, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); out.setIndex(new THREE.BufferAttribute(ix, 1));
    return out;
  };
  const body = slice(0, j0, 0, S.neck), head = slice(j0, M, S.neck, 1);
  // overlays share the body's positions: the scale layer (rgba vertex colours) and the sheen (additive)
  const scales = new THREE.BufferGeometry(), sh = new THREE.BufferGeometry();
  for (const [dst, att] of [[scales, 'position'], [scales, 'normal'], [scales, 'uv'], [sh, 'position'], [sh, 'normal'], [sh, 'uv']] as const) dst.setAttribute(att, g.attributes[att]);
  scales.setIndex(g.index!); sh.setIndex(g.index!);
  scales.setAttribute('color', new THREE.Float32BufferAttribute(alpha, 4)); sh.setAttribute('color', new THREE.Float32BufferAttribute(sheen, 3));
  // eyes, on the head's sides, looking out and a little ahead
  const eyes: Built['eyes'] = [], er = rs[Math.round(S.eye.s * M)], k = capK(er.s);
  for (const sd of [1, -1]) {
    const [up, side] = section(S, er.hw * k, er.top * k, er.bot * k, sd > 0 ? S.eye.a : TAU - S.eye.a, er.hm);
    const p = er.P.clone().addScaledVector(er.U, up).addScaledVector(er.S, side), n = er.U.clone().multiplyScalar(Math.cos(S.eye.a)).addScaledVector(er.S, sd * Math.sin(S.eye.a)).normalize();
    const look = n.clone().addScaledVector(er.T, 0.28).normalize(), f = er.T.clone().addScaledVector(look, -er.T.dot(look)).normalize();
    eyes.push({ p: p.addScaledVector(n, -0.0004), look, f });
  }
  for (const x of [body, head, scales, sh]) x.userData.keep = true;
  return { body, head, scales, sheen: sh, eyes, spine: sp };
}

/** The built pose (cached) for a length w, surface and bend. */
function builtPose(art: string, w: number, surface: string | undefined, Rmm: number | undefined, bend: number) {
  const S = SNAKES[art], R = Rmm ? Math.round(Rmm / w * 200) / 200 : 0, baby = babyOf(S, w), pp = snakePoseOf(surface, R || undefined, bend);
  const surf = pp.cyl ? 'perch' : 'floor', key = `${art}~${pp.pose}~${pp.sign}~${pp.mag}~${pp.cyl ?? 0}~${baby}`;
  let built = poseCache.get(key);
  if (!built) {
    built = build(S, surf, R, bend, baby); poseCache.set(key, built);
    // a few dozen poses at most (about 3 MB each): the oldest goes, its buffers with it (a mesh still showing it re-uploads)
    if (poseCache.size > 24) { const [k, old] = poseCache.entries().next().value!; poseCache.delete(k); for (const g of [old.body, old.head, old.scales, old.sheen]) g.dispose(); }
  }
  return { pp, built };
}

/**
 * The parts of a floor pose that touch the ground, for settling it on uneven ground (render/build.ts restOn): sample points
 * of the spine as [x, y, z, r] (mm, the body frame: the surface is y = -ground), r = the coil sphere's radius, every point
 * whose underside is near the ground line, plus `ground` (mm).
 */
export function snakeContacts(art: string, w: number, bend = 0) {
  const { built } = builtPose(art, w, 'floor', undefined, bend), sp = built.spine, pts: [number, number, number, number][] = [];
  const lo = -sp.ground;
  for (let i = 0; i <= SPINE_N; i += 4) { const p = sp.P[i], r = sp.rr[i]; if (p.y - r < lo + 0.9 * r) pts.push([p.x * w, p.y * w, p.z * w, r * w]); }
  return { pts, ground: sp.ground * w };
}

/**
 * The 3D snake for a card of width w mm (the total length; origin at the card's centre; add it as the card's child), in the pose
 * for its surface and `bend` (the pose family, see the header): 'perch' with Rmm = the branch's radius in mm wraps or drapes it.
 */
export function snakeBody(art: string, w: number, surface?: string, Rmm?: number, bend = 0) {
  const S = SNAKES[art], baby = babyOf(S, w), { pp, built } = builtPose(art, w, surface, Rmm, bend);
  let tex = paintCache.get(art);
  if (!tex) {
    tex = { body: dataTex(paintBuffer(S, 0, S.neck, 2048, 384), 2048, 384, true), head: dataTex(paintBuffer(S, S.neck, 1, 384, 384), 384, 384, true) };
    paintCache.set(art, tex);
  }
  const grp = new THREE.Group();
  const base = (part: 'body' | 'head') => mat(`snbase:${art}:${part}`, () => new THREE.MeshBasicMaterial({ map: tex![part], vertexColors: true }));
  grp.add(new THREE.Mesh(built.body, base('body')), new THREE.Mesh(built.head, base('head')));
  // the scale layer (cells of S.scale along, ROWS round: the loft-wide uv) and the sheen over both parts
  const sc = new THREE.Mesh(built.scales, mat(`snscale:all:${art}`, () => {
    tileData ??= scaleTile();
    const t = dataTex(tileData, 128, 128, false, true); t.repeat.set(1 / (2 * S.scale), ROWS / 2);
    return new THREE.MeshBasicMaterial({ map: t, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }));
  sc.renderOrder = 1; grp.add(sc);
  const shn = new THREE.Mesh(built.sheen, mat('snsheen', () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })));
  shn.renderOrder = 2; shn.userData.nolight = true; grp.add(shn); // an unlit highlight: the lighting pass already adds its own gloss to the body
  for (const e of built.eyes) {
    const eg = new THREE.Group(), z = e.f.clone().cross(e.look).normalize();
    eg.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(e.f, e.look, z)); eg.position.copy(e.p);
    for (const part of eyeParts(S.eye.r, baby)) { const m = new THREE.Mesh(part.g, part.m); m.scale.set(...part.scale); m.position.set(...part.at); eg.add(m); }
    grp.add(eg);
  }
  grp.userData.snake = pp.pose; grp.userData.baby = baby;
  grp.scale.setScalar(w);
  return grp;
}

/** The spine of a pose at length w (tests and framing): its points in the body frame (mm), the radii of its coil spheres, the pose. */
export function snakeSpine(art: string, w: number, surface?: string, Rmm?: number, bend = 0) {
  const S = SNAKES[art], R = Rmm ? Math.round(Rmm / w * 200) / 200 : 0, pp = snakePoseOf(surface, R || undefined, bend);
  const sp = spineOf(S, pp.cyl ? 'perch' : 'floor', R, bend, babyOf(S, w));
  return { pts: sp.P.map(p => p.clone().multiplyScalar(w)), rr: sp.rr.map(r => r * w), pose: sp.pose, ground: sp.ground * w, cyl: sp.cyl === null ? null : sp.cyl * w };
}

/**
 * Settle a rigid floor pose on uneven ground (a slope, a bank, the edge of a cork slab): of the spots within a short slide of
 * where it was put (so a coil half over a slab's edge slides onto the slab) and the tilts up to `maxTilt` there, the one that
 * leaves the least air under the parts that touch (`snakeContacts`) with none of them inside the ground. `q` = the pose's
 * heading (the card's rotation), `at` = the origin's scene x, z, `ground(x, z)` = the ground's height at scene (x, z).
 * Returns the rotation to premultiply onto `q`, the origin's new x, z and its height.
 */
export function settleSnake(c: ReturnType<typeof snakeContacts>, q: THREE.Quaternion, at: { x: number; z: number }, ground: (x: number, z: number) => number, maxTilt: number) {
  const up = V(0, 1, 0), o = c.pts.map(([x, y, z]) => V(x, y, z).applyQuaternion(q)), r = c.pts.map(p => p[3]), n = o.length;
  const cands: { rot: THREE.Quaternion; phi: number; y: number[] }[] = [];
  const add = (phi: number, th: number) => {
    const rot = new THREE.Quaternion().setFromUnitVectors(up, V(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)));
    cands.push({ rot, phi, y: o.map(p => p.clone().applyQuaternion(rot).y) });
  };
  add(0, 0);
  for (let d = 5; d <= maxTilt * 180 / Math.PI + 1e-6; d += 5) for (let k = 0; k < 16; k++) add(d * Math.PI / 180, k * Math.PI / 8);
  /** The air under the contacts for tilt `cd` over ground heights g, and the origin height that rests it. */
  const evalG = (cd: { y: number[] }, g: number[]) => {
    let y0 = -Infinity; for (let i = 0; i < n; i++) y0 = Math.max(y0, g[i] - cd.y[i] + r[i]);
    let air = 0; for (let i = 0; i < n; i++) air += y0 + cd.y[i] - r[i] - g[i];
    return { y0, air };
  };
  const sr = r.reduce((a, b) => a + b, 0), reach = Math.max(...c.pts.map(p => Math.hypot(p[0], p[2]))), slide = 1.1 * reach;
  const offs: [number, number][] = [[0, 0]];
  for (const f of [0.25, 0.5, 0.75, 1]) for (let k = 0; k < 8; k++) offs.push([Math.cos(k * Math.PI / 4) * slide * f, Math.sin(k * Math.PI / 4) * slide * f]);
  const sample = (ox: number, oz: number, cd: { rot: THREE.Quaternion }) => o.map(p => { const t = p.clone().applyQuaternion(cd.rot); return ground(at.x + ox + t.x, at.z + oz + t.z); });
  let best = { off: offs[0], cd: cands[0] }, bs = Infinity;
  for (const off of offs) {
    const g = o.map(p => ground(at.x + off[0] + p.x, at.z + off[1] + p.z)), pen = 0.01 * Math.hypot(off[0], off[1]) * n;
    for (const cd of cands) { const sc = evalG(cd, g).air + 0.6 * cd.phi * sr + pen; if (sc < bs) { bs = sc; best = { off, cd }; } }
  }
  // the ground under the tilted body, not the level one: choose the tilt again there (same spot), then rest it
  const g1 = sample(best.off[0], best.off[1], best.cd);
  let cd = best.cd, sc1 = Infinity;
  for (const k of cands) { const e = evalG(k, g1).air + 0.6 * k.phi * sr; if (e < sc1) { sc1 = e; cd = k; } }
  const g2 = sample(best.off[0], best.off[1], cd);
  return { rot: cd.rot, x: at.x + best.off[0], z: at.z + best.off[1], y: evalG(cd, g2).y0 };
}
