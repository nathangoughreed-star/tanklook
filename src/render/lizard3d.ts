// Lizards in 3D (lane G1, 2026-10-16; roadmap Release 2): one body plan for every lizard, per species only data
// (art/lizards.ts). Not an adapted frog or fish: the body is lofted round a spine (so it can bend: a tail curled on the
// ground, wrapped round a branch), the head carries a lower jaw set in under the mouth line, lidless or lidded eyes,
// and (crested gecko) a fringe of spines over each eye running on as a crest along the head and back. Each limb is a
// real joint chain (shoulder / elbow / wrist, hip / knee / ankle) solved by two-bone IK from the girdle to a wrist set
// down on the surface the pose stands on, the hand / foot laid along that surface and five toes walked over it, so on a
// branch the toes curl round the bark. Toe pads are broad and flat with lamellae ridged across the underside.
// Poses: 'ground' (floor, cork, rock, a ledge), 'glass' (the pane or the 3D wall: belly flat, legs splayed), 'perch' (on
// a branch, along the limb, feet gripping round it, the prehensile tail wrapped round it).
// Unit frame as the herps: width 1 = total length, x = s - 0.5 for a straight body, y up, z to the animal's + side;
// the surface it stands on is the plane y = -ground (on a branch: the limb's top, its axis at y = -ground - R).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LIZARDS, curveOf, isLizard, lizardGround, type LizardLimb, type LizardSpec } from '../art/lizards';
import { rng } from '../art/paint';
import { boxUV, jointTube, paintMark } from './herp3d';

export { isLizard };
export type LizardPose = 'ground' | 'glass' | 'perch';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const spE = (c: number, e: number) => Math.sign(c) * Math.abs(c) ** (2 / e);
const TAU = Math.PI * 2;
/** Stations along the spine, points round the section. */
const NS = 280, RG = 48;
/** How far the belly, pads and tail sit off the surface (TL units; 0.1 mm on a 20 cm gecko). */
const GAP = 0.0005;

const geoCache = new Map<string, THREE.BufferGeometry>();
/** Built poses (body, limbs, spines, eye placements) by art + pose + branch radius. */
const poseCache = new Map<string, { body: THREE.BufferGeometry; limbs: THREE.BufferGeometry; spines: THREE.BufferGeometry | null; eyes: { c: THREE.Vector3; look: THREE.Vector3; F: { T: THREE.Vector3 } }[] }>();
const matCache = new Map<string, THREE.Material>();
function mat<M extends THREE.Material>(key: string, make: () => M): M {
  let m = matCache.get(key) as M | undefined;
  if (!m) { m = make(); m.userData.cached = true; m.userData.fish = true; matCache.set(key, m); }
  return m;
}
function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key); if (!g) { g = make(); g.userData.keep = true; geoCache.set(key, g); }
  return g;
}

// ---------- section ----------

type Sec = { w: number; t: number; b: number; b0: number };
function sectionFn(L: LizardSpec) {
  const hw = curveOf(L.hw), hT = curveOf(L.hT), hB = curveOf(L.hB);
  // both tips rounded off; b0 = the belly depth without that, for where the spine runs
  return (s: number): Sec => { const k = Math.sqrt(clamp01(s / 0.012)) * Math.sqrt(clamp01((1 - s) / 0.022)); return { w: hw(s) * k, t: hT(s) * k, b: hB(s) * k, b0: hB(s) }; };
}
/** The section point at angle th (0 = back midline, pi/2 = + side, pi = belly): [up, side] off the spine. */
function ringAt(L: LizardSpec, c: Sec, th: number): [number, number] {
  const cs = Math.cos(th), sn = Math.sin(th), e = cs >= 0 ? L.eT : L.eB;
  return [cs >= 0 ? c.t * spE(cs, L.eT) : c.b * spE(cs, L.eB), c.w * spE(sn, e)];
}
/** Half the section's perimeter (back to belly midline), for painting round marks round. */
function halfPerim(L: LizardSpec, c: Sec) {
  let s = 0, p = ringAt(L, c, 0);
  for (let j = 1; j <= 24; j++) { const q = ringAt(L, c, Math.PI * j / 24); s += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; }
  return Math.max(s, 1e-3);
}

// ---------- spine (per pose) ----------

interface Spine { p: THREE.Vector3[]; up: THREE.Vector3[] }
interface PoseCx { L: LizardSpec; G: number; sec: (s: number) => Sec; R: number }

/** The neck and head raised by `deg` (a smooth bend over the neck): the extra height at s. */
const headLift = (deg: number, from = 0.79) => (s: number) => {
  const q = s - from, k = Math.tan(deg * Math.PI / 180);
  return q <= 0 ? 0 : k * (q > 0.08 ? q - 0.04 : q * q / 0.16);
};
/**
 * A spine over the plane y = -G: the belly on it (raised lift(s)), heading psi(s) in that plane (radians, + toward + side),
 * built out from the vent in steps of exactly 1/NS, so the body keeps its length however it bends.
 */
function planarSpine(cx: PoseCx, psi: (s: number) => number, lift: (s: number) => number): Spine {
  const { L, G, sec } = cx, ds = 1 / NS, iv = Math.round(L.vent * NS), p: THREE.Vector3[] = new Array(NS + 1);
  const y = (s: number) => -G + sec(s).b0 + lift(s) + GAP;
  p[iv] = V(L.vent - 0.5, y(L.vent), 0);
  const step = (i: number, j: number) => {
    const sa = i / NS, sb = j / NS, dy = y(sb) - y(sa), h = Math.sqrt(Math.max(0, ds * ds - dy * dy)) * Math.sign(j - i), a = psi((sa + sb) / 2);
    p[j] = p[i].clone().add(V(Math.cos(a) * h, dy, Math.sin(a) * h));
  };
  for (let i = iv; i < NS; i++) step(i, i + 1);
  for (let i = iv; i > 0; i--) step(i, i - 1);
  return { p, up: p.map(() => V(0, 1, 0)) };
}
/**
 * On a branch (its axis along x at y = -G - R): the body along the top of the limb, belly on the bark; from just behind
 * the vent the tail leaves the top and winds round the limb (a helix whose angle off the limb grows to ~65°, easing off
 * after a turn and a quarter), its underside against the bark.
 */
function perchSpine(cx: PoseCx): Spine {
  const { L, sec, R, G } = cx, yA = -G - R, s0 = L.vent - 0.06, i0 = Math.round(s0 * NS);
  const sp = planarSpine(cx, () => 0, headLift(8)), p = sp.p, up = sp.up;
  let x = p[i0].x, phi = 0;
  for (let i = i0 - 1; i >= 0; i--) {
    const s = i / NS, rho = R + sec(s).b0 + GAP;
    const beta = 1.13 * smooth(0, 0.09, s0 - s) * (1 - 0.75 * smooth(1.6 * Math.PI, 2.3 * Math.PI, phi));
    x -= Math.cos(beta) / NS; phi += Math.sin(beta) / NS / rho;
    p[i] = V(x, yA + rho * Math.cos(phi), rho * Math.sin(phi)); up[i] = V(0, Math.cos(phi), Math.sin(phi));
  }
  return { p, up };
}

// ---------- surfaces the feet stand on ----------

interface Surf { snap(p: THREE.Vector3): THREE.Vector3; n(p: THREE.Vector3): THREE.Vector3 }
const plane = (y0: number): Surf => ({ snap: p => V(p.x, y0, p.z), n: () => V(0, 1, 0) });
const cylinder = (yA: number, R: number): Surf => ({
  snap: p => { const r = V(0, p.y - yA, p.z); if (r.lengthSq() < 1e-14) r.set(0, 1, 0); r.setLength(R); return V(p.x, yA + r.y, r.z); },
  n: p => { const r = V(0, p.y - yA, p.z); return r.lengthSq() < 1e-14 ? V(0, 1, 0) : r.normalize(); },
});
/** Points over the surface from p0, setting off along dir (kept in the surface as it goes): a discrete geodesic. */
function walk(S: Surf, p0: THREE.Vector3, dir: THREE.Vector3, len: number, n: number) {
  const pts = [S.snap(p0)], d = dir.clone();
  for (let k = 1; k <= n; k++) {
    const prev = pts[k - 1], nn = S.n(prev); d.addScaledVector(nn, -d.dot(nn)).normalize();
    pts.push(S.snap(prev.clone().addScaledVector(d, len / n)));
  }
  return pts;
}

// ---------- geometry helpers ----------

/** Index a (rows x (R+1)) grid of rings, wound outward; normals smooth, the seam's two columns averaged. */
function gridGeometry(pos: number[], rows: number, R: number, extra: Record<string, [number[], number]> = {}) {
  const idx: number[] = [], C = R + 1;
  for (let i = 0; i + 1 < rows; i++) for (let j = 0; j < R; j++) { const a = i * C + j, c = a + C; idx.push(a, a + 1, c, a + 1, c + 1, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  for (const [k, [a, n]] of Object.entries(extra)) g.setAttribute(k, new THREE.Float32BufferAttribute(a, n));
  g.setIndex(idx); g.computeVertexNormals();
  const nm = g.attributes.normal, t = V(), u = V();
  for (let i = 0; i < rows; i++) {
    const a = i * C, b = a + R; t.fromBufferAttribute(nm, a); u.fromBufferAttribute(nm, b); t.add(u).normalize();
    nm.setXYZ(a, t.x, t.y, t.z); nm.setXYZ(b, t.x, t.y, t.z);
  }
  return g;
}
/** Frames along a path: tangent, up (the reference laid square to it) and side = tangent x up. */
function frames(p: THREE.Vector3[], ups: THREE.Vector3[]) {
  return p.map((_, i) => {
    const T = p[Math.min(p.length - 1, i + 1)].clone().sub(p[Math.max(0, i - 1)]).normalize();
    const U = ups[i].clone().addScaledVector(T, -ups[i].dot(T)).normalize();
    return { T, U, S: T.clone().cross(U) };
  });
}
/**
 * A tube along a path with an elliptic section: rad(t, cos) = [half-height, half-width] (the section's top is the up
 * reference), col(t, cos) its colour. Non-indexed, with smooth normals.
 */
function sweep(p: THREE.Vector3[], ups: THREE.Vector3[], rad: (t: number, cs: number) => [number, number], col: (t: number, cs: number) => THREE.Color, R = 10) {
  const F = frames(p, ups), pos: number[] = [], cols: number[] = [];
  p.forEach((c, i) => {
    const t = i / (p.length - 1), { U, S } = F[i];
    for (let j = 0; j <= R; j++) {
      const th = TAU * j / R, cs = Math.cos(th), [rv, rl] = rad(t, cs), q = c.clone().addScaledVector(U, rv * cs).addScaledVector(S, rl * Math.sin(th)), k = col(t, cs);
      pos.push(q.x, q.y, q.z); cols.push(k.r, k.g, k.b);
    }
  });
  return gridGeometry(pos, p.length, R, { color: [cols, 3] }).toNonIndexed();
}
/** Form shading baked into the vertex colours (the herps' bodies are unlit): undersides darker. */
function shadeMul(g: THREE.BufferGeometry, dark = 0.3, up = V(0, 1, 0)) {
  const n = g.attributes.normal, c = g.attributes.color, q = V();
  for (let i = 0; i < n.count; i++) {
    const ny = q.fromBufferAttribute(n, i).dot(up), k = 1 - dark * Math.max(0, -ny) + 0.05 * Math.max(0, ny);
    c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
  }
  return g;
}
function colour(g: THREE.BufferGeometry, f: (ny: number) => THREE.Color) {
  const n = g.attributes.normal, out: number[] = [];
  for (let i = 0; i < n.count; i++) { const c = f(n.getY(i)); out.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(out, 3));
  return g;
}
/** Two-bone IK: the middle joint of a chain a + b from A to B, bent toward `pole`. */
function ik(A: THREE.Vector3, B: THREE.Vector3, a: number, b: number, pole: THREE.Vector3) {
  const d = B.clone().sub(A), L = Math.min(d.length(), (a + b) * 0.999), dir = d.normalize();
  const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  return A.clone().addScaledVector(dir, x).addScaledVector(pp, h);
}

// ---------- body ----------

interface Body { geo: THREE.BufferGeometry; p: THREE.Vector3[]; F: ReturnType<typeof frames> }
function bodyGeometry(cx: PoseCx, sp: Spine): Body {
  const { L, sec } = cx, F = frames(sp.p, sp.up), pos: number[] = [], uv: number[] = [], lit: number[] = [];
  const thm = L.jaw.th, cm = Math.cos(thm), r = rng(L.bumps?.seed ?? 1);
  // tubercles: seeded on both flanks, in (s, angle); their size in TL units
  const bumps = L.bumps ? Array.from({ length: L.bumps.n }, () => {
    const s = L.bumps!.s[0] + r() * (L.bumps!.s[1] - L.bumps!.s[0]), a = (L.bumps!.a[0] + r() * (L.bumps!.a[1] - L.bumps!.a[0])) * Math.PI, rad = L.bumps!.r[0] + r() * (L.bumps!.r[1] - L.bumps!.r[0]);
    return { s, th: r() < 0.5 ? a : TAU - a, r: rad, h: L.bumps!.h * rad };
  }) : [];
  // the orbits: the head swells round each eye, so the eye sits in the head instead of on it
  for (const th of [L.eye.th, TAU - L.eye.th]) bumps.push({ s: L.eye.s, th, r: L.eye.r * 1.9, h: L.eye.r * 0.55 });
  for (let i = 0; i <= NS; i++) {
    const s = i / NS, c = sec(s), { U, S } = F[i], meanR = (c.w + (c.t + c.b) / 2) / 2;
    const near = bumps.filter(b => Math.abs(b.s - s) < b.r);
    for (let j = 0; j <= RG; j++) {
      const th = TAU * j / RG, cs = Math.cos(th);
      let [up, side] = ringAt(L, c, th), k = 1, f = 0;
      if (s > L.jaw.s) {
        // the lower jaw set in under the mouth line (a lip), the line itself a shallow groove
        const kk = smooth(L.jaw.s, L.jaw.s + 0.025, s) * (1 - smooth(0.985, 1, s)), d = Math.min(Math.abs(th - thm), Math.abs(th - (TAU - thm)));
        side *= 1 - (1 - L.jaw.k) * kk * smooth(-0.05, 0.05, cm - cs);
        k *= 1 - 0.16 * kk * Math.exp(-((d / 0.07) ** 2));
      }
      if (L.tail.pad && s < L.tail.pad && cs < 0) {
        // the prehensile tail's tip pad: a flat underside with lamellae across it
        const kp = 1 - smooth(L.tail.pad * 0.6, L.tail.pad, s);
        up *= 1 - kp * (0.35 + 0.12 * (0.5 + 0.5 * Math.cos(TAU * s / 0.006))) * smooth(-0.2, -0.6, cs);
      }
      if (L.tail.rings && s < L.vent) k *= 1 - 0.035 * Math.max(0, Math.cos(Math.PI * s * L.tail.rings / L.vent)) ** 12 * smooth(0.01, 0.05, s);
      for (const b of near) {
        let dth = Math.abs(th - b.th); dth = Math.min(dth, TAU - dth);
        const q = 1 - ((s - b.s) ** 2 + (dth * meanR) ** 2) / (b.r * b.r);
        if (q > 0) { const h = b.h * q * q, rr = Math.hypot(up, side) || 1; if (1 + h / rr > k) { k = 1 + h / rr; if (b.r < L.eye.r) f = Math.max(f, q); } }
      }
      const pt = sp.p[i].clone().addScaledVector(U, up * k).addScaledVector(S, side * k);
      pos.push(pt.x, pt.y, pt.z); uv.push(s, 1 - (th <= Math.PI ? th / Math.PI : 2 - th / Math.PI));
      lit.push(f ? (f < 0.35 ? 1 - 0.18 * Math.sin(f / 0.35 * Math.PI) : 1 + 0.22 * smooth(0.35, 1, f)) : 1);
    }
  }
  const g = gridGeometry(pos, NS + 1, RG, { uv: [uv, 2], color: [lit.flatMap(l => [l, l, l]), 3] });
  // shade against the body's own up (on a branch the tail's underside faces the bark, whichever way that is)
  const n = g.attributes.normal, cl = g.attributes.color, q = V();
  for (let i = 0; i < n.count; i++) {
    const ny = q.fromBufferAttribute(n, i).dot(F[Math.floor(i / (RG + 1))].U), k = 1 - 0.18 * Math.max(0, -ny) + 0.04 * Math.max(0, ny);
    cl.setXYZ(i, cl.getX(i) * k, cl.getY(i) * k, cl.getZ(i) * k);
  }
  return { geo: g, p: sp.p, F };
}
/** A point on the body surface (from the built grid) and its normal: station s, angle th. */
function surfAt(b: Body, s: number, th: number) {
  const i = Math.round(s * NS), j = Math.round(((th % TAU + TAU) % TAU) / TAU * RG), k = i * (RG + 1) + j;
  const p = b.geo.attributes.position, n = b.geo.attributes.normal;
  return { p: V().fromBufferAttribute(p, k), n: V().fromBufferAttribute(n, k).normalize(), F: b.F[i] };
}

// ---------- paint ----------

function bodyTexture(L: LizardSpec, sec: (s: number) => Sec) {
  const W = 1024, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!, gr = x.createLinearGradient(0, 0, 0, H);
  for (const [a, col] of L.tone) gr.addColorStop(a, col);
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  const hp = new Map<number, number>(), ry = (u: number, r: number) => {
    const k = Math.round(Math.min(0.99, Math.max(0.01, u)) * 100); let h = hp.get(k);
    if (h === undefined) { h = halfPerim(L, sec(k / 100)); hp.set(k, h); }
    return r * H / h;
  };
  for (const m of L.marks) paintMark(x, m, W, H, ry);
  // granular scales: fine light and dark grain over everything, a touch darker along the back and belly midlines
  const t = document.createElement('canvas'); t.width = W; t.height = H;
  const tc = t.getContext('2d')!, tg = tc.createLinearGradient(0, 0, 0, H);
  tg.addColorStop(0, 'rgb(225,225,225)'); tg.addColorStop(0.25, '#fff'); tg.addColorStop(0.75, '#fff'); tg.addColorStop(1, 'rgb(230,230,230)');
  tc.fillStyle = tg; tc.fillRect(0, 0, W, H);
  const r = rng(11);
  for (let i = 0; i < 9000; i++) {
    const k = Math.round(200 + r() * 55); tc.fillStyle = `rgba(${k},${k},${k},0.55)`;
    tc.beginPath(); tc.arc(r() * W, r() * H, 0.7 + r() * 0.9, 0, 7); tc.fill();
  }
  x.globalCompositeOperation = 'multiply'; x.drawImage(t, 0, 0); x.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

/** Eye paint on the dome (SphereGeometry uv: x = longitude, y = from the pole = where it looks): a vertical slit pupil
 *  with a wavy edge (longitudes pi/2, 3pi/2 run up and down the head), a veined iris, a dark rim, the scale ring. */
function eyeTexture(e: LizardSpec['eye']) {
  const N = 160, c = document.createElement('canvas'); c.width = N; c.height = N;
  const x = c.getContext('2d')!, img = x.createImageData(N, N), col = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
  const [i0, i1, rc] = [col(e.iris[0]), col(e.iris[1]), col(e.ring)];
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const s = py / N, ph = px / N * TAU, along = Math.abs(Math.sin(ph)) * s, across = Math.abs(Math.cos(ph)) * s;
    const half = 0.022 * (1 + 0.5 * Math.sin(along * 70)) * (1 - (along / 0.4) ** 2);
    let rgb: number[];
    if (along < 0.4 && across < half) rgb = [6, 6, 6];
    else if (s < 0.43) {
      const k = s / 0.43, vein = 0.5 + 0.5 * Math.sin(ph * 7 + Math.sin(s * 31 + ph * 3) * 2.5) * Math.sin(s * 47 + Math.sin(ph * 5) * 2);
      rgb = i0.map((v, i) => (v + (i1[i] - v) * k ** 1.6) * (0.9 + 0.12 * vein) * (1 - 0.35 * smooth(0.8, 1, k)));
    } else if (s < 0.48) rgb = [22, 18, 14];
    else rgb = rc;
    if (Math.hypot(s * Math.cos(ph) - 0.09, s * Math.sin(ph) + 0.12) < 0.04) rgb = [238, 236, 230]; // catchlight on the spectacle
    img.data.set([...rgb.map(v => Math.round(Math.min(255, v))), 255], (py * N + px) * 4);
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function limbMaterial(art: string, L: LizardSpec) {
  return mat('lzlimb:' + art, () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true }), sp = L.limbSpots;
    if (!sp) return m;
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d')!, r = rng(19); x.fillStyle = '#fff'; x.fillRect(0, 0, S, S); x.fillStyle = sp.c;
    for (let i = 0; i < sp.n * 4; i++) { const rad = sp.r * S * (0.7 + 0.6 * r()), px = r() * S, py = r() * S; for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { x.beginPath(); x.ellipse(px + ox, py + oy, rad, rad * (0.7 + 0.3 * r()), r() * 3, 0, 7); x.fill(); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    m.map = t;
    return m;
  });
}

// ---------- limbs ----------

/** Where a foot goes in a pose, in the girdle's frame: along the body, out to the side, the foot's heading (degrees off
 *  the body axis, + outward; on a branch: + down round it), the elbow / knee's pull (along, up, out). */
interface FootPose { dx: number; dz: number; ha: number; pole: [number, number, number] }
interface PoseDef { front: FootPose; hind: FootPose; gait: number }
const POSES: Record<'sprawl' | 'raised', Record<LizardPose, PoseDef>> = {
  sprawl: {
    ground: { front: { dx: 0.03, dz: 0.074, ha: 30, pole: [-0.5, 0.7, 0.6] }, hind: { dx: -0.004, dz: 0.084, ha: 55, pole: [0.5, 0.7, 0.6] }, gait: 0.014 },
    glass: { front: { dx: 0.042, dz: 0.084, ha: 30, pole: [-0.6, 0.4, 0.7] }, hind: { dx: -0.03, dz: 0.09, ha: 112, pole: [0.6, 0.4, 0.7] }, gait: 0.02 },
    perch: { front: { dx: 0.028, dz: 0.06, ha: 50, pole: [-0.4, 0.8, 0.6] }, hind: { dx: -0.01, dz: 0.068, ha: 125, pole: [0.4, 0.8, 0.6] }, gait: 0.012 },
  },
  raised: {
    ground: { front: { dx: 0.026, dz: 0.06, ha: 22, pole: [-0.6, 0.55, 0.5] }, hind: { dx: -0.012, dz: 0.068, ha: 42, pole: [0.55, 0.6, 0.5] }, gait: 0.016 },
    glass: { front: { dx: 0.026, dz: 0.066, ha: 22, pole: [-0.7, 0.35, 0.6] }, hind: { dx: -0.012, dz: 0.074, ha: 42, pole: [0.6, 0.45, 0.6] }, gait: 0.016 },
    perch: { front: { dx: 0.026, dz: 0.066, ha: 22, pole: [-0.7, 0.35, 0.6] }, hind: { dx: -0.012, dz: 0.074, ha: 42, pole: [0.6, 0.45, 0.6] }, gait: 0.016 },
  },
};

/** One limb on one side: the bone chain from inside the body to the toe bases, the toes walked over the surface. */
function limbGeometry(cx: PoseCx, b: Body, l: LizardLimb, fp: FootPose, side: number, gait: number, surf: Surf, perch: boolean) {
  const { L } = cx, i = Math.round(l.s * NS), c = b.p[i], { T, U, S } = b.F[i], [a0, b0] = ringAt(L, cx.sec(l.s), l.th);
  const top = new THREE.Color(L.limbCol[0]), under = new THREE.Color(L.limbCol[1]), pad = new THREE.Color(L.padCol), claw = new THREE.Color(L.clawCol);
  // the shoulder / hip: inside the body, level with the spine, its joint no thicker than the belly is deep (it would
  // show through underneath)
  const gp = c.clone().addScaledVector(U, a0 * 0.1).addScaledVector(S, side * b0 * 0.5), r0 = Math.min(l.r[0], cx.sec(l.s).b0 * 0.85);
  const dx = fp.dx + gait;
  // the wrist's point on the surface and the hand's heading in it
  let wS: THREE.Vector3, head: THREE.Vector3;
  if (!perch) {
    wS = surf.snap(c.clone().addScaledVector(T, dx).addScaledVector(S, side * fp.dz));
    const n = surf.n(wS), Th = T.clone().addScaledVector(n, -T.dot(n)).normalize(), Sh = n.clone().cross(Th).negate().normalize(); // + side
    head = Th.multiplyScalar(Math.cos(fp.ha * Math.PI / 180)).addScaledVector(Sh, side * Math.sin(fp.ha * Math.PI / 180)).normalize();
  } else {
    // round from the top by the angle whose sideways reach is dz (no further than ~72°: thin limbs are gripped round)
    const R = cx.R, phi = Math.min(1.25, Math.asin(Math.min(1, fp.dz / (R + l.r[2])))), yA = -cx.G - R;
    wS = surf.snap(V(c.x + dx, yA + Math.cos(phi), side * Math.sin(phi)));
    const down = V(0, -Math.sin(phi), side * Math.cos(phi));
    head = V(1, 0, 0).multiplyScalar(Math.cos(fp.ha * Math.PI / 180)).addScaledVector(down, Math.sin(fp.ha * Math.PI / 180)).normalize();
  }
  // out of reach: slide the wrist in toward the girdle until the chain spans it
  for (let k = 0; k < 30 && wS.distanceTo(gp) > 0.97 * (l.len[0] + l.len[1]) - l.r[2]; k++) wS = surf.snap(wS.clone().lerp(surf.snap(gp), 0.08));
  const lift = (p: THREE.Vector3, h: number) => p.clone().addScaledVector(surf.n(p), h + GAP * 2);
  // (a little over the toes' gap: the curve from the elbow comes down steeply and settles onto the hand)
  const hand = walk(surf, wS, head, l.len[2], 4), W = lift(hand[0], l.r[2] + 0.0012), Hm = lift(hand[2], (l.r[2] + l.r[3]) / 2 + 0.0008), M = lift(hand[4], l.r[3]);
  const pole = V().addScaledVector(T, fp.pole[0]).addScaledVector(U, fp.pole[1]).addScaledVector(S, side * fp.pole[2]);
  const E = ik(gp, W, l.len[0], l.len[1], pole);
  const lc = (ny: number) => under.clone().lerp(top, smooth(-0.5, 0.3, ny));
  const arm = colour(jointTube([gp, E, W, Hm, M], [r0, l.r[1], l.r[2], (l.r[2] + l.r[3]) / 2, l.r[3]]), lc);
  if (L.limbPatch) { // harlequin: cream blotches over the legs (a smooth field of the position, so they wrap round)
    const pc = new THREE.Color(L.limbPatch.c), ps = arm.attributes.position, cl = arm.attributes.color, q = V(), c0 = new THREE.Color();
    for (let k = 0; k < ps.count; k++) {
      q.fromBufferAttribute(ps, k);
      const f = Math.sin(q.x * 150 + 1.3) * Math.sin(q.y * 170 + 0.7) * Math.sin(q.z * 130 * side + 2.1) + 0.5 * Math.sin(q.x * 310 + q.z * 270 + 0.4);
      const m = smooth(0.55 - L.limbPatch.k, 0.65 - L.limbPatch.k, f);
      c0.setRGB(cl.getX(k), cl.getY(k), cl.getZ(k)).lerp(pc, m); cl.setXYZ(k, c0.r, c0.g, c0.b);
    }
  }
  const parts: THREE.BufferGeometry[] = [arm];
  // the toes: fanned from the hand's end, each walked over the surface
  const n0 = surf.n(hand[4]), hd = hand[4].clone().sub(hand[3]).normalize(), q = hd.clone().cross(n0).normalize();
  if (q.dot(S) * side < 0) q.negate(); // q points to the outer toe
  l.toes.forEach(([len, splay], k) => {
    const a = splay * Math.PI / 180, dir = hd.clone().multiplyScalar(Math.cos(a)).addScaledVector(q, Math.sin(a));
    const base = surf.snap(hand[4].clone().addScaledVector(q, (k - 2) * l.toe * 1.5)), on = walk(surf, base, dir, len, 12);
    const tp = 0.55, padded = !!l.pad;
    const tip = (t: number) => Math.sqrt(clamp01((1 - t) / (padded ? 0.12 : 0.08)));
    const rw = (t: number) => (padded ? (t < tp ? l.toe * (1 - 0.25 * t / tp) : THREE.MathUtils.lerp(l.toe * 0.75, l.pad!, smooth(tp, 0.82, t))) : l.toe * (1 - 0.45 * t)) * tip(t);
    const rh = (t: number) => (padded ? (t < tp ? l.toe * (1 - 0.25 * t / tp) : THREE.MathUtils.lerp(l.toe * 0.75, l.pad! * 0.42, smooth(tp, 0.82, t))) : l.toe * (1 - 0.45 * t)) * tip(t);
    const knuckle = (t: number) => l.toe * 0.8 * Math.sin(Math.PI * Math.min(1, t / tp)) ** 2 * (t < tp ? 1 : 0);
    const path = on.map((p, j) => lift(p, rh(j / 12) + knuckle(j / 12))), ups = on.map(p => surf.n(p));
    const ridge = (t: number) => padded && t > tp ? 0.5 + 0.5 * Math.cos(TAU * (t - tp) / 0.075) : 0;
    parts.push(sweep(path, ups, (t, cs) => [rh(t) * (cs < 0 ? 1 - 0.28 * ridge(t) * smooth(-0.3, -0.8, cs) : 1), rw(t)],
      (t, cs) => (padded && t > tp - 0.05 && cs < 0.1 ? pad.clone() : lc(cs)), 10));
    // the claw: a small hooked cone off the tip, along the toe and down a little
    const nt = surf.n(on[on.length - 2]), end = path[path.length - 2].clone().addScaledVector(nt, l.claw * 0.3), cd = path[path.length - 1].clone().sub(path[path.length - 2]).normalize().addScaledVector(nt, -0.25).normalize();
    const cone = new THREE.ConeGeometry(l.claw * 0.28, l.claw, 6);
    cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), cd)).translate(...end.clone().addScaledVector(cd, l.claw * 0.45).toArray() as [number, number, number]);
    cone.deleteAttribute('uv');
    parts.push(colour(cone.toNonIndexed(), () => claw.clone()));
  });
  for (const g of parts) for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
  return parts;
}

// ---------- crest and eyes ----------

function spinesGeometry(cx: PoseCx, b: Body, eyes: { c: THREE.Vector3; p: THREE.Vector3; n: THREE.Vector3; look: THREE.Vector3; F: Body['F'][number] }[]) {
  const { L } = cx, parts: THREE.BufferGeometry[] = [], col = new THREE.Color(L.crestCol ?? L.tone[0][1]);
  const spine = (at: THREE.Vector3, dir: THREE.Vector3, len: number) => {
    const g = new THREE.ConeGeometry(len * 0.3, len, 5);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir)).translate(...at.clone().addScaledVector(dir, len * 0.4).toArray() as [number, number, number]);
    g.deleteAttribute('uv'); parts.push(g.toNonIndexed());
  };
  const re = L.eye.r;
  for (const [k, side] of [[0, 1], [1, -1]] as const) {
    const e = eyes[k], Ue = e.F.U.clone().addScaledVector(e.look, -e.F.U.dot(e.look)).normalize(), Fe = Ue.clone().cross(e.look).multiplyScalar(side);
    if (Fe.dot(e.F.T) < 0) Fe.negate();
    // the eyelashes: spines round the top of the eye, longest over its back
    if (L.lash) for (let i = 0; i < L.lash.n; i++) {
      const ph = Math.PI * (0.06 + 0.9 * i / (L.lash.n - 1)), rim = Fe.clone().multiplyScalar(Math.cos(ph)).addScaledVector(Ue, Math.sin(ph));
      const at = e.c.clone().addScaledVector(e.look, re * 0.42).addScaledVector(rim, re * 0.9);
      spine(at, rim.clone().multiplyScalar(0.65).addScaledVector(e.look, 0.45).addScaledVector(Ue, 0.2).normalize(), L.lash.len * (0.5 + 0.6 * smooth(0.25 * Math.PI, 0.8 * Math.PI, ph)));
    }
    // the crest: from behind the eye along the side of the head, the neck and the back, swept back, smaller as it goes
    if (L.crest) for (let i = 0; i < L.crest.n; i++) {
      const f = i / (L.crest.n - 1), s = L.eye.s - re * 1.3 - f * (L.eye.s - re * 1.3 - L.crest.to);
      const th = L.crest.th + 0.08 * (1 - smooth(0, 0.2, f)), q = surfAt(b, s, side > 0 ? th : TAU - th);
      spine(q.p, q.n.clone().multiplyScalar(0.8).addScaledVector(q.F.U, 0.35).addScaledVector(q.F.T, -0.55).normalize(), L.crest.len * (1 - 0.55 * f));
    }
  }
  return parts.length ? shadeMul(colour(mergeGeometries(parts)!, () => col.clone()), 0.3) : null;
}

// ---------- assembly ----------

/** The poses a species has: a lizard that does not climb (leopard gecko) stands in its ground pose everywhere. */
export function lizardPose(art: string, surface?: string, R?: number): LizardPose {
  const L = LIZARDS[art];
  if (!L?.climbs) return 'ground';
  return surface === 'glass' ? 'glass' : surface === 'perch' && R ? 'perch' : 'ground';
}

/**
 * The 3D lizard for a card of width w (origin at the card's centre; add it as the card's child), in the pose for its
 * surface: 'glass' (pane or 3D wall), 'perch' with R = the branch's radius in mm (gripping round it), else 'ground'.
 */
export function lizardBody(art: string, w: number, surface?: string, Rmm?: number) {
  const L = LIZARDS[art], G = lizardGround(L), sec = sectionFn(L);
  const R = Rmm ? Math.round(Rmm / w * 400) / 400 : 0, pose = lizardPose(art, surface, R), key = `${art}~${pose}${pose === 'perch' ? '~' + R : ''}`;
  const cx: PoseCx = { L, G, sec, R };
  const build = () => {
    const sp = pose === 'perch' ? perchSpine(cx)
      : pose === 'glass' ? planarSpine(cx, s => (s < L.vent ? 0.5 * Math.sin(Math.PI * (L.vent - s) / L.vent) : 0.03 * Math.sin(Math.PI * (s - L.vent) / (1 - L.vent))), headLift(3))
      : planarSpine(cx, s => (s < L.vent ? (L.stance === 'raised' ? 0.55 : 0.95) * Math.sin(Math.PI * (L.vent - s) / L.vent) : 0.06 * Math.sin(Math.PI * (s - L.vent) / (1 - L.vent))),
        L.stance === 'raised' ? (s => 0.026 * smooth(L.vent - 0.24, L.vent + 0.04, s) + headLift(9)(s)) : headLift(12));
    const b = bodyGeometry(cx, sp), surf = pose === 'perch' ? cylinder(-G - R, R) : plane(-G);
    const P = POSES[L.stance][pose], limbs: THREE.BufferGeometry[] = [];
    for (const side of [1, -1]) {
      limbs.push(...limbGeometry(cx, b, L.front, P.front, side, side * P.gait, surf, pose === 'perch'));
      limbs.push(...limbGeometry(cx, b, L.hind, P.hind, side, -side * P.gait, surf, pose === 'perch'));
    }
    const eyes = [1, -1].map(side => {
      const q = surfAt(b, L.eye.s, side > 0 ? L.eye.th : TAU - L.eye.th), look = q.n.clone().addScaledVector(q.F.T, 0.12).addScaledVector(q.F.S, side * 0.6).normalize();
      return { ...q, look, c: q.p.clone().addScaledVector(q.n, L.eye.r * -0.45) };
    });
    return { body: b.geo, limbs: boxUV(shadeMul(mergeGeometries(limbs)!, 0.3)), spines: spinesGeometry(cx, b, eyes), eyes };
  };
  let built = poseCache.get(key);
  if (!built) {
    built = build();
    for (const g of [built.body, built.limbs, built.spines]) if (g) g.userData.keep = true;
    poseCache.set(key, built);
  }
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(built.body, mat('lzbody:' + art, () => new THREE.MeshBasicMaterial({ map: bodyTexture(L, sec), vertexColors: true }))));
  grp.add(new THREE.Mesh(built.limbs, limbMaterial(art, L)));
  if (built.spines) grp.add(new THREE.Mesh(built.spines, mat('lzspine', () => new THREE.MeshBasicMaterial({ vertexColors: true }))));
  // eyes: the dome, the ring of small scales round it, a lid on a lidded eye
  // (a lidded eye: the lids are a mound of skin over the dome, open across the middle)
  const e = L.eye, dome = geo('lzeye', () => new THREE.SphereGeometry(1, 28, 18).scale(1, 0.85, 1));
  const em = mat('lzeye:' + art, () => new THREE.MeshBasicMaterial({ map: eyeTexture(e) }));
  const ring = geo('lzring', () => new THREE.TorusGeometry(0.85, 0.07, 6, 40).rotateX(Math.PI / 2).translate(0, 0.45, 0));
  const rm = mat('lzring:' + art, () => new THREE.MeshBasicMaterial({ color: e.ring }));
  const sock = e.lid ? geo('lzlid', () => shadeMul(colour(new THREE.SphereGeometry(1, 32, 16).scale(1.08, 0.82, 0.9), () => new THREE.Color(1, 1, 1)), 0.3)) : null;
  const sm = mat('lzsock:' + art, () => new THREE.MeshBasicMaterial({ color: L.tone[Math.min(2, L.tone.length - 1)][1], vertexColors: true }));
  for (const d of built.eyes) {
    const look = d.look, fwd = d.F.T.clone().projectOnPlane(look).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, look, V().crossVectors(fwd, look)));
    for (const [g, m] of [[dome, em], [ring, rm], ...(sock ? [[sock, sm]] : [])] as [THREE.BufferGeometry, THREE.Material][]) {
      const o = new THREE.Mesh(g, m); o.quaternion.copy(q); o.scale.setScalar(e.r); o.position.copy(d.c); grp.add(o);
    }
  }
  grp.userData.lizard = pose;
  grp.scale.setScalar(w);
  return grp;
}
