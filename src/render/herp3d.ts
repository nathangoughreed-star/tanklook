// 3D amphibians: one limbed-body generator for frogs, newts and the axolotl (data `HERP3D` in art/herps.ts). The body
// is lofted from the card's own side outline (so the side view is the card's silhouette) with a half-width per station;
// its paint is laid out round the body (along x around the section), so bands and spots stay put from above as well as
// from the side. Legs are tubes through jointed points with toes resting on the ground; eyes are domes; the axolotl
// adds tail-fin membranes and gill stalks. Unit frame as a fish card: width 1, x = u - 0.5, y = -v, z to the side.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HERP3D, HERP3D_FLOAT, HERP3D_GLASS, HERP3D_PERCH, type Herp3D, type Limb3D, type Mark3D } from '../art/herps';
import { rng, type Pt } from '../art/paint';
import type { Surface } from '../scene/types';
import { taperTube } from './fish3d';
import { shellMesh } from './snail3d';
import { isLizard, lizardBody } from './lizard3d';
import { isSpider, spiderBody } from './spider3d';

export const isHerp3D = (art: string) => art in HERP3D || isLizard(art) || isSpider(art);
/** Floating at the water surface: the card-frame line v that sits at the surface (its float pose's `top`). */
export const herpFloatTop = (art: string) => HERP3D_FLOAT[art]?.top;

const geoCache = new Map<string, THREE.BufferGeometry>();
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

const smooth = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const spE = (c: number, e: number) => Math.sign(c) * Math.abs(c) ** (2 / e);

// ---------- body shape ----------

/** The card's smooth outline (paint.shape: quadratics through midpoints, 'c' = corner) as a dense polygon. */
function dense(pts: Pt[], n = 8): [number, number][] {
  const N = pts.length, mid = (a: Pt, b: Pt): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], out: [number, number][] = [];
  let cur = mid(pts[N - 1], pts[0]);
  for (let i = 0; i < N; i++) {
    const p = pts[i], m = mid(p, pts[(i + 1) % N]);
    if (p[2] === 'c') out.push(cur, [p[0], p[1]]);
    else for (let k = 0; k < n; k++) { const t = k / n; out.push([(1 - t) ** 2 * cur[0] + 2 * (1 - t) * t * p[0] + t * t * m[0], (1 - t) ** 2 * cur[1] + 2 * (1 - t) * t * p[1] + t * t * m[1]]); }
    cur = m;
  }
  return out;
}

/** Top and bottom of the outline at u (v, widths), and its u extent. */
function outline(side: Pt[]) {
  const o = dense(side), N = o.length;
  let lo = 0, hi = 0; o.forEach((q, i) => { if (q[0] < o[lo][0]) lo = i; if (q[0] > o[hi][0]) hi = i; });
  const chain = (a: number, b: number) => { const c: [number, number][] = []; for (let i = a; ; i = (i + 1) % N) { c.push(o[i]); if (i === b) break; } return c; };
  const c1 = chain(hi, lo), c2 = chain(lo, hi);
  const at = (c: [number, number][], u: number) => {
    for (let i = 1; i < c.length; i++) {
      const [u0, v0] = c[i - 1], [u1, v1] = c[i];
      if ((u - u0) * (u - u1) <= 0) return u1 === u0 ? v0 : v0 + (v1 - v0) * (u - u0) / (u1 - u0);
    }
    return c[0][1];
  };
  return { u0: o[lo][0], u1: o[hi][0], at: (u: number): [number, number] => { const a = at(c1, u), b = at(c2, u); return [Math.min(a, b), Math.max(a, b)]; } };
}

/** Half-width at u: a cosine blend through the control points, both ends rounded. */
function widthFn(wid: [number, number][], u0: number, u1: number) {
  const E = 0.045;
  return (u: number) => {
    let w = wid[0][1];
    if (u >= wid[wid.length - 1][0]) w = wid[wid.length - 1][1];
    else for (let i = 1; i < wid.length; i++) if (u <= wid[i][0]) {
      const [a, wa] = wid[i - 1], [b, wb] = wid[i], t = Math.max(0, (u - a) / (b - a)), k = (1 - Math.cos(t * Math.PI)) / 2;
      w = wa + (wb - wa) * k; break;
    }
    return w * Math.sqrt(Math.min(1, Math.max(0, (u - u0) / E))) * Math.sqrt(Math.min(1, Math.max(0, (u1 - u) / E)));
  };
}

type Body = { u0: number; u1: number; sec: (u: number) => { vc: number; hv: number; t: number }; ring: (u: number, th: number) => [number, number] };
function bodyShape(h: Herp3D): Body {
  const o = outline(h.side), w = widthFn(h.wid, o.u0, o.u1);
  const sec = (u: number) => { const [a, b] = o.at(u); return { vc: (a + b) / 2, hv: Math.max(0, (b - a) / 2), t: w(u) }; };
  return {
    u0: o.u0, u1: o.u1, sec,
    ring: (u, th) => { const s = sec(u), c = Math.cos(th), e = c < 0 ? h.belly : 2.4; return [s.vc - s.hv * spE(c, e), s.t * spE(Math.sin(th), e)]; },
  };
}
const surf = (b: Body, u: number, th: number, side = 1) => { const [v, z] = b.ring(u, th); return new THREE.Vector3(u - 0.5, -v, side * z); };
function normalAt(b: Body, u: number, th: number, side = 1) {
  const d = 0.003, n = surf(b, u + d, th, side).sub(surf(b, u - d, th, side)).cross(surf(b, u, th + d, side).sub(surf(b, u, th - d, side))).normalize();
  const c = new THREE.Vector3(u - 0.5, -b.sec(u).vc, 0);
  return n.dot(surf(b, u, th, side).sub(c)) < 0 ? n.negate() : n;
}
/** Half the section's perimeter at u (back midline to belly midline), for painting round markings round. */
const halfPerim = (b: Body, u: number) => { let s = 0, p = b.ring(u, 0); for (let j = 1; j <= 24; j++) { const q = b.ring(u, Math.PI * j / 24); s += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return Math.max(s, 1e-3); };

/** Soft form shading in vertex colours (as the snails): undersides turn away from the light above. */
function shade(g: THREE.BufferGeometry, dark = 0.28, col?: (ny: number) => THREE.Color, keepNormals = false) {
  if (!keepNormals) g.computeVertexNormals();
  const n = g.attributes.normal, out: number[] = [];
  for (let i = 0; i < n.count; i++) {
    const ny = n.getY(i), k = 1 - dark * Math.max(0, -ny) + 0.04 * Math.max(0, ny), c = col ? col(ny) : new THREE.Color(1, 1, 1);
    out.push(c.r * k, c.g * k, c.b * k);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(out, 3));
  return g;
}

/** Raised warts: each a smooth low dome pushed out from the section's centre, scattered (seeded) over a band round the body
 *  on both sides. Distances are in 3D, so a wart stays round wherever it sits. */
function wartBumps(b: Body, w: NonNullable<Herp3D['warts']>) {
  const r = rng(w.seed), ws: { c: THREE.Vector3; r: number }[] = [];
  for (let i = 0; i < w.n; i++) {
    const u = w.u[0] + r() * (w.u[1] - w.u[0]), a = w.a[0] + r() * (w.a[1] - w.a[0]), rad = w.r[0] + r() * (w.r[1] - w.r[0]);
    ws.push({ c: surf(b, u, r() < 0.5 ? a * Math.PI : Math.PI * 2 - a * Math.PI), r: rad });
  }
  // height, and 0..1 up the wart (its crown is lit, its foot shadowed: the body material is unlit)
  return (p: THREE.Vector3) => { let d = 0, f = 0; for (const q of ws) { const k = 1 - p.distanceToSquared(q.c) / (q.r * q.r); if (k > 0 && w.h * q.r * k * k > d) { d = w.h * q.r * k * k; f = k; } } return [d, f]; };
}

function bodyGeometry(b: Body, warts?: Herp3D['warts']) {
  const ST = warts ? 200 : 72, RG = warts ? 120 : 40; // stations along the body, points round the section (fine enough for warts)
  const bump = warts && wartBumps(b, warts), p = new THREE.Vector3(), lit: number[] = [];
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= ST; i++) {
    const u = b.u0 + (b.u1 - b.u0) * (1 - Math.cos(Math.PI * i / ST)) / 2; // denser at the nose and tail
    for (let j = 0; j <= RG; j++) {
      const th = Math.PI * 2 * j / RG, [v, z] = b.ring(u, th), a = th <= Math.PI ? th / Math.PI : 2 - th / Math.PI;
      let y = -v, zz = z;
      if (bump) {
        const [d, f] = bump(p.set(u - 0.5, y, z));
        if (d) { const vc = b.sec(u).vc, ry = vc - v, l = Math.hypot(ry, z) || 1; y += d * ry / l; zz += d * z / l; }
        lit.push(f ? (f < 0.35 ? 1 - 0.22 * Math.sin(f / 0.35 * Math.PI) : 1 + 0.28 * smooth(0.35, 1, f)) : 1);
      }
      pos.push(u - 0.5, y, zz); uv.push(u, 1 - a);
    }
  }
  const R = RG + 1;
  // wound outward (front faces out): before 2026-10-14 it was inside out, so you saw the far side's inside
  for (let i = 0; i < ST; i++) for (let j = 0; j < RG; j++) { const a = i * R + j, c = a + R; idx.push(a, a + 1, c, a + 1, c + 1, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  shade(g);
  if (bump) { const c = g.attributes.color; for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * lit[i], c.getY(i) * lit[i], c.getZ(i) * lit[i]); }
  return g;
}

// ---------- paint ----------

/** Body paint, x = u (0..1), y = a (0 back midline .. 1 belly midline): tone round the section, the species' marks, then light mottling. */
function bodyTexture(h: Herp3D, b: Body) {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!, gr = x.createLinearGradient(0, 0, 0, H);
  for (const [a, col] of h.tone) gr.addColorStop(a, col);
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  const ry = (u: number, r: number) => r * H / halfPerim(b, u); // a round mark of radius r (widths) in canvas rows at u
  for (const m of h.marks) paintMark(x, m, W, H, ry);
  // tone over the marks: a little darker along the back and belly midlines, faint blotchy mottling
  const t = document.createElement('canvas'); t.width = W; t.height = H;
  const tc = t.getContext('2d')!, tg = tc.createLinearGradient(0, 0, 0, H);
  tg.addColorStop(0, 'rgb(220,220,220)'); tg.addColorStop(0.3, '#fff'); tg.addColorStop(0.7, '#fff'); tg.addColorStop(1, 'rgb(225,225,225)');
  tc.fillStyle = tg; tc.fillRect(0, 0, W, H);
  const r = rng(3);
  for (let i = 0; i < 140; i++) {
    const u = r(), k = Math.round(215 + r() * 40), rr = 0.01 + r() * 0.03;
    tc.fillStyle = `rgba(${k},${k},${k},0.5)`; tc.beginPath(); tc.ellipse(u * W, r() * H, rr * W, ry(Math.min(0.98, Math.max(0.02, u)), rr), 0, 0, 7); tc.fill();
  }
  x.globalCompositeOperation = 'multiply'; x.drawImage(t, 0, 0); x.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export function paintMark(x: CanvasRenderingContext2D, m: Mark3D, W: number, H: number, ry: (u: number, r: number) => number) {
  x.save(); x.globalAlpha = m.o;
  if (m.k === 'band') {
    // a band on a midline carries on past it (the far half of the body mirrors this one), so its edge there stays sharp
    const a0 = m.a[0] <= 0 ? -0.1 : m.a[0], a1 = m.a[1] >= 1 ? 1.1 : m.a[1];
    if (m.blur) x.filter = `blur(${Math.round(m.blur * W)}px)`;
    x.fillStyle = m.c; x.beginPath();
    const rr = Math.min((m.u[1] - m.u[0]) / 2, 0.05) * W;
    x.roundRect(m.u[0] * W, a0 * H, (m.u[1] - m.u[0]) * W, (a1 - a0) * H, [rr]); x.fill();
  } else if (m.k === 'spots') {
    const r = rng(m.seed); x.fillStyle = m.c;
    for (let i = 0; i < m.n; i++) {
      const u = m.u[0] + r() * (m.u[1] - m.u[0]), a = m.a[0] + r() * (m.a[1] - m.a[0]), rad = m.r[0] + r() * (m.r[1] - m.r[0]);
      x.beginPath(); x.ellipse(u * W, a * H, rad * W, ry(u, rad), 0, 0, 7); x.fill();
      if (a - ry(u, rad) / H < 0) { x.beginPath(); x.ellipse(u * W, -a * H, rad * W, ry(u, rad), 0, 0, 7); x.fill(); } // mirrored over the back
    }
  } else {
    x.strokeStyle = m.c; x.lineWidth = m.w * W; x.lineCap = 'round'; x.beginPath();
    m.pts.forEach(([u, a], i) => (i ? x.lineTo(u * W, a * H) : x.moveTo(u * W, a * H))); x.stroke();
  }
  x.restore();
}

// ---------- eyes ----------

/** Eye dome paint (SphereGeometry uv: x = longitude, y = from the pole): pupil (round, horizontal slit or all dark), iris, dark rim, lid. */
function eyeTexture(e: Herp3D['eye'], lid: string) {
  const N = 128, c = document.createElement('canvas'); c.width = N; c.height = N;
  const x = c.getContext('2d')!, img = x.createImageData(N, N), col = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
  const [i0, i1, lc] = [col(e.iris[0]), col(e.iris[1]), col(lid)];
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const s = py / N, ph = px / N * Math.PI * 2;
    // the slit lies along local x (the body's length): longitude 0 and pi
    const pr = e.pupil === 'h' ? 0.24 * 0.1 / Math.hypot(0.1 * Math.cos(ph), 0.24 * Math.sin(ph)) : e.pupil === 'dark' ? 0.42 : 0.17;
    let rgb: number[];
    if (s < pr) rgb = [8, 9, 10];
    else if (s < 0.42) { const k = (s - pr) / (0.42 - pr); rgb = i0.map((v, i) => v + (i1[i] - v) * k); }
    else if (s < 0.47) rgb = [24, 24, 20];
    else rgb = lc;
    if (Math.hypot(s * Math.cos(ph) - 0.07, s * Math.sin(ph) + 0.1) < 0.035) rgb = [235, 235, 230]; // catchlight
    img.data.set([...rgb.map(Math.round), 255], (py * N + px) * 4);
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- limbs ----------

/** A tube through the joints (Catmull-Rom), its radius blended between the joints' radii, with round ends.
 *  `thigh` = a frog's thigh over the first segment: a smooth teardrop swelling to that radius near the hip, flattened
 *  against the flank (squeezed in z), and built with smooth normals (finer rings) so it reads as a muscle, not a faceted tube. */
export function jointTube(pts: THREE.Vector3[], radii: number[], thigh = 0, seg = false) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), N = (thigh ? 18 : 10) * (pts.length - 1), R = thigh ? 24 : 12;
  const tube = new THREE.TubeGeometry(curve, N, 1, R, false), pos = tube.attributes.position, c = new THREE.Vector3(), q = new THREE.Vector3();
  const len: number[] = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  // `seg`: an arthropod leg, each segment swelling between narrower joints
  const rAt = (f: number) => {
    const d = f * len[len.length - 1];
    for (let i = 1; i < len.length; i++) if (d <= len[i]) {
      const t = (d - len[i - 1]) / (len[i] - len[i - 1]), r = radii[i - 1] + (radii[i] - radii[i - 1]) * smooth(0, 1, t);
      return seg ? r * (0.74 + 0.34 * Math.sin(Math.PI * t) ** 0.6) : r;
    }
    return radii[radii.length - 1];
  };
  // 0..1 along the thigh segment (>1 beyond the knee): the teardrop's swell and the flattening
  const tt = (f: number) => (f * len[len.length - 1]) / len[1];
  const swell = (f: number) => { const t = tt(f); return t >= 1 ? 0 : Math.sin(Math.PI * Math.pow(Math.max(0, t), 0.62)) ** 1.1; };
  for (let k = 0; k < pos.count; k++) {
    const f = Math.floor(k / (R + 1)) / N; curve.getPointAt(f, c);
    let r = rAt(f);
    if (thigh) r += Math.max(0, thigh - r) * swell(f);
    q.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r);
    if (thigh) q.z *= 1 - 0.36 * (1 - smooth(0.55, 1.15, tt(f))) * smooth(0, 0.12, tt(f) + 0.12);
    q.add(c); pos.setXYZ(k, q.x, q.y, q.z);
  }
  if (thigh) tube.computeVertexNormals();
  const ends = [0, pts.length - 1].map(i => { const s = new THREE.SphereGeometry(radii[i], thigh ? 20 : 12, thigh ? 12 : 8); s.translate(pts[i].x, pts[i].y, pts[i].z); return s; });
  if (thigh) { // the hip cap is squeezed like the thigh
    const s = ends[0]; s.translate(-pts[0].x, -pts[0].y, -pts[0].z); s.scale(1, 1, 0.64); s.translate(pts[0].x, pts[0].y, pts[0].z);
    s.computeVertexNormals();
  }
  for (const s of ends) s.deleteAttribute('uv');
  tube.deleteAttribute('uv');
  return mergeGeometries([tube.toNonIndexed(), ...ends.map(s => s.toNonIndexed())])!;
}
const P3 = (u: number, v: number, z: number) => new THREE.Vector3(u - 0.5, -v, z);

/** One limb (the + side): the jointed tube, then toes from its last joint to tips on the ground, with pads. */
function limbGeometry(l: Limb3D, ground: number, col: (ny: number) => THREE.Color) {
  const js = l.js.map(j => P3(j[0], j[1], j[2])), end = js[js.length - 1], parts: THREE.BufferGeometry[] = [jointTube(js, l.js.map(j => j[3]), l.thigh, !!l.seg)];
  // the joints of a segmented leg: a narrow ring in the joint colour (painted after shading, below)
  const bands: [number, number][] = [];
  if (l.seg) for (let i = 1; i < js.length; i++) {
    const at = parts.reduce((n, g) => n + g.attributes.position.count, 0), s = new THREE.SphereGeometry(l.js[i][3] * 0.8, 10, 6).translate(js[i].x, js[i].y, js[i].z);
    s.deleteAttribute('uv'); const g = s.toNonIndexed(); parts.push(g); bands.push([at, at + g.attributes.position.count]);
  }
  if (l.claw) parts.push(...clawGeometry(js[js.length - 2], end, l.claw));
  const digits: THREE.Curve<THREE.Vector3>[] = [], gv = l.toeV ?? ground; // a perch: the toes reach below the ground line
  for (const [du, dz] of l.toes) {
    const tip = P3(l.js[l.js.length - 1][0] + du, gv - l.toe * (l.blunt ? 0.8 : 0.34), l.js[l.js.length - 1][2] + dz);
    if (l.blunt) {
      // a jointed digit: thick at the base, a raised knuckle, a round tip (capped by the disc on padded toes)
      const k = end.clone().lerp(tip, 0.42); k.y = Math.max(k.y, tip.y + l.toe * 1.4);
      parts.push(jointTube([end.clone(), k, tip], [l.toe * 1.3, l.toe * 0.95, l.toe * 0.85]));
      digits.push(new THREE.CatmullRomCurve3([end.clone(), k, tip], false, 'centripetal'));
    } else {
      const via = end.clone().lerp(tip, 0.5); via.y = Math.max(via.y, tip.y + l.toe * 0.8);
      const t = taperTube(new THREE.QuadraticBezierCurve3(end.clone(), via, tip), l.toe, 8, 6); t.deleteAttribute('uv'); parts.push(t.toNonIndexed());
    }
    if (l.pad) { // the toe disc: a flattened round pad at the tip, a little ahead of it
      const d = tip.clone().sub(end).setY(0).normalize().multiplyScalar(l.pad * 0.35);
      const s = new THREE.SphereGeometry(l.pad, 12, 8).scale(1, 0.5, 1).translate(tip.x + d.x, -gv + l.pad * 0.5, tip.z + d.z); s.deleteAttribute('uv'); parts.push(s.toNonIndexed());
    }
  }
  if (l.web && digits.length > 1) parts.push(webGeometry(digits, l.web));
  const g = shade(mergeGeometries(parts)!, 0.3, col, !!l.thigh);
  if (l.seg) {
    const c = g.attributes.color, n = g.attributes.normal, jc = new THREE.Color(l.seg);
    for (const [a, b] of bands) for (let i = a; i < b; i++) { const k = 1 - 0.3 * Math.max(0, -n.getY(i)); c.setXYZ(i, jc.r * k, jc.g * k, jc.b * k); }
  }
  return boxUV(g);
}

/** A crab's claw (chela) on the end of the arm: a heavy palm flattened side to side, the fixed finger running on from
 *  its lower front edge and the hinged finger from its upper front edge, curving to meet it at the tips. */
function clawGeometry(prev: THREE.Vector3, wrist: THREE.Vector3, c: NonNullable<Limb3D['claw']>) {
  const d = wrist.clone().sub(prev).normalize(), side = d.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), up = side.clone().cross(d).normalize();
  const palm = new THREE.SphereGeometry(1, 18, 12).scale(c.palm / 2, c.r, c.r * 0.62);
  palm.applyMatrix4(new THREE.Matrix4().makeBasis(d, up, side).setPosition(wrist.clone().addScaledVector(d, c.palm * 0.42)));
  palm.deleteAttribute('uv');
  const front = wrist.clone().addScaledVector(d, c.palm * 0.78), at = (a: number, b: number) => front.clone().addScaledVector(d, a).addScaledVector(up, b);
  const tip = at(c.finger, -c.r * 0.12);
  const fixed = taperTube(new THREE.QuadraticBezierCurve3(at(0, -c.r * 0.45), at(c.finger * 0.55, -c.r * 0.5), tip), c.r * 0.42, 10, 8);
  const hinged = taperTube(new THREE.QuadraticBezierCurve3(at(-c.palm * 0.05, c.r * 0.42), at(c.finger * 0.6, c.r * 0.5), tip.clone().addScaledVector(up, c.r * 0.08)), c.r * 0.36, 10, 8);
  return [palm, fixed, hinged].map(g => { g.deleteAttribute('uv'); return g.toNonIndexed(); });
}

/** Webbing between neighbouring digits, out to `reach` of their length; its free edge dips toward the foot between
 *  the toes. Both faces, so it shows from above and below without a double-sided material. */
function webGeometry(digits: THREE.Curve<THREE.Vector3>[], reach: number) {
  const pos: number[] = [], R = 5;
  for (let i = 0; i + 1 < digits.length; i++) {
    const A = digits[i], B = digits[i + 1], row = (j: number) => {
      const t = reach * j / R, a = A.getPointAt(t), b = B.getPointAt(t), m = A.getPointAt(t * 0.86).add(B.getPointAt(t * 0.86)).multiplyScalar(0.5);
      return [a, m, b];
    };
    let prev = row(0);
    for (let j = 1; j <= R; j++) {
      const cur = row(j);
      for (let c = 0; c < 2; c++) {
        const q = [prev[c], prev[c + 1], cur[c], cur[c + 1]];
        for (const [x, y, z] of [[0, 2, 1], [1, 2, 3], [0, 1, 2], [1, 3, 2]]) pos.push(...q[x].toArray(), ...q[y].toArray(), ...q[z].toArray());
      }
      prev = cur;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

/** Box mapping per triangle (non-indexed): uv from the position seen along the face's dominant axis, so spots stay round on tubes at any angle. */
export function boxUV(g: THREE.BufferGeometry) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const n = b.clone().sub(a).cross(c.clone().sub(a)), x = Math.abs(n.x), y = Math.abs(n.y), z = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k], [s, t] = y > Math.max(x, z) ? [v.x, v.z] : x > z ? [v.z, v.y] : [v.x, v.y];
      uv[(i + k) * 2] = s * 2; uv[(i + k) * 2 + 1] = t * 2;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Spots on the limbs (the map is box-mapped, see boxUV). */
function limbMaterial(art: string, h: Herp3D) {
  return mat('limb:' + art, () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true });
    const sp = h.legSpots; if (!sp) return m;
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d')!, r = rng(17); x.fillStyle = '#fff'; x.fillRect(0, 0, S, S); x.fillStyle = sp.c;
    for (let i = 0; i < sp.n * 4; i++) { const rad = sp.r * S * (0.7 + 0.6 * r()), px = r() * S, py = r() * S; for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { x.beginPath(); x.ellipse(px + ox, py + oy, rad, rad * (0.7 + 0.3 * r()), r() * 3, 0, 7); x.fill(); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    m.map = t;
    return m;
  });
}

// ---------- axolotl extras ----------

/** Tail fin membranes on the midline, from the body's top (bottom) out to the fin's edge. The edge is a smooth spline
 *  through its points; past the muscle's tip (u < the body's u0) the membrane runs on from the tip's centre line. */
function finGeometry(b: Body, f: NonNullable<Herp3D['fin']>) {
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const edgeFn = (e: [number, number][]) => {
    const s = new THREE.SplineCurve([...e].sort((p, q) => p[0] - q[0]).map(([u, v]) => new THREE.Vector2(u, v))).getPoints(200);
    return (u: number) => { for (let i = 1; i < s.length; i++) if (u <= s[i].x) { const k = (u - s[i - 1].x) / (s[i].x - s[i - 1].x || 1); return s[i - 1].y + (s[i].y - s[i - 1].y) * k; } return s[s.length - 1].y; };
  };
  for (const [e, sg] of [[f.top, -1], [f.bot, 1]] as const) {
    const ua = Math.min(...e.map(p => p[0])), ub = Math.max(...e.map(p => p[0])), n = 80, base = pos.length / 3, edge = edgeFn(e);
    for (let i = 0; i <= n; i++) {
      const u = ua + (ub - ua) * i / n, s = b.sec(Math.max(b.u0 + 1e-4, u)), body = s.vc + sg * s.hv * 0.85, out = edge(u);
      const tip = sg < 0 ? Math.min(out, body) : Math.max(out, body);
      pos.push(u - 0.5, -body, 0, u - 0.5, -tip, 0); col.push(0.82, 0.82, 0.82, 1, 1, 1);
    }
    for (let i = 0; i < n; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  return g;
}

/**
 * Gill stalks (rami) sweeping up, back and out from behind the head (the + side), each feathered along its length by
 * fine filaments: thin, curved, swept toward the tip and drooping, longest mid-stalk, irregular in length and spacing,
 * fanned to both sides of the stalk and a little off its plane. So the gill reads as a soft plume, not a comb.
 */
function gillGeometry(gl: NonNullable<Herp3D['gills']>) {
  const stalks: THREE.BufferGeometry[] = [], fringe: THREE.BufferGeometry[] = [], r = rng(41), Z = new THREE.Vector3(0, 0, 1);
  gl.tips.forEach((t, i) => {
    // the three bases stacked down the side of the neck, the top one highest
    const base = P3(gl.at[0] - 0.004 * i, gl.at[1] + (i - 1) * 0.011, gl.at[2]), tip = P3(t[0], t[1], t[2]);
    const via = base.clone().lerp(tip, 0.45).add(new THREE.Vector3(0, 0.006, 0.018)), curve = new THREE.QuadraticBezierCurve3(base, via, tip);
    const s = taperTube(curve, 0.0058, 14, 6); s.deleteAttribute('uv'); stalks.push(s.toNonIndexed());
    const n = 26, len0 = 0.026 * Math.min(1, curve.getLength() / 0.1);
    for (let j = 0; j < n; j++) {
      const f = 0.1 + 0.88 * (j + 0.3 + 0.4 * r()) / n, p = curve.getPoint(f), d = curve.getTangent(f);
      const w = new THREE.Vector3().crossVectors(Z, d).normalize(); // across the stalk, in the plume's plane
      for (const sg of [1, -1]) {
        const len = len0 * Math.sin(Math.PI * (0.1 + 0.82 * f)) ** 0.6 * (0.75 + 0.5 * r());
        const dir = w.clone().multiplyScalar(sg).addScaledVector(d, 0.6 + 0.25 * r()).addScaledVector(Z, (r() - 0.35) * 0.7).normalize();
        const a = p.clone().addScaledVector(w, sg * 0.002), e = a.clone().addScaledVector(dir, len);
        const m = a.clone().lerp(e, 0.5).addScaledVector(d, len * 0.12).add(new THREE.Vector3(0, -len * 0.1, 0)); // curls toward the tip, droops
        const q = taperTube(new THREE.QuadraticBezierCurve3(a, m, e), 0.0017, 5, 4); q.deleteAttribute('uv'); fringe.push(q.toNonIndexed());
      }
    }
  });
  return { stalks: shade(mergeGeometries(stalks)!, 0.3), fringe: shade(mergeGeometries(fringe)!, 0.22) };
}

// ---------- assembly ----------

/** The 3D amphibian for a card of width w, origin at the card's centre (the card frame's v = 0); add it as the card's child.
 *  `surface` 'glass' = clinging to a pane: its glass pose if it has one (tree frog), belly on the ground line; 'top' =
 *  floating at the water surface: its float pose (African dwarf frog); 'perch' = on a branch or shelf: its perch pose.
 *  Lizards (render/lizard3d.ts) take their own poses; `limbR` = the branch's radius (mm) they grip round. */
export function herpBody(art: string, w: number, surface?: Surface | 'perch', limbR?: number, alert = false) {
  if (isLizard(art)) return lizardBody(art, w, surface, limbR);
  if (isSpider(art)) return spiderBody(art, w, surface, limbR, alert);
  const pose = surface === 'glass' ? HERP3D_GLASS[art] : surface === 'top' ? HERP3D_FLOAT[art] : surface === 'perch' ? HERP3D_PERCH[art] : undefined;
  const h = pose || HERP3D[art], b = bodyShape(h), grp = new THREE.Group(), key = pose ? art + '~' + surface : art;
  const K = (k: string, make: () => THREE.BufferGeometry) => geo(key + k, make);
  grp.add(new THREE.Mesh(K(':body', () => bodyGeometry(b, h.warts)), mat('body:' + key, () => new THREE.MeshBasicMaterial({ map: bodyTexture(h, b), vertexColors: true }))));
  // limbs: the + side, mirrored for the far side (a negative scale; three flips the winding)
  const top = new THREE.Color(h.legCol[0]), under = new THREE.Color(h.legCol[1]);
  const lcol = (ny: number) => under.clone().lerp(top, smooth(-0.5, 0.3, ny));
  const lm = limbMaterial(art, h);
  h.limbs.forEach((l, i) => {
    const c = l.c, own = c && ((ny: number) => new THREE.Color(c[1]).lerp(new THREE.Color(c[0]), smooth(-0.5, 0.3, ny)));
    const g = K(':limb' + i, () => limbGeometry(l, h.ground, own || lcol));
    for (const side of [1, -1]) { const m = new THREE.Mesh(g, lm); m.scale.z = side; grp.add(m); }
  });
  // eyes
  const e = h.eye, lid = h.tone[0][1];
  const dome = K(':eye', () => new THREE.SphereGeometry(1, 24, 16).scale(1, e.bulge, 1));
  const em = mat('eye:' + art, () => new THREE.MeshBasicMaterial({ map: eyeTexture(e, lid) }));
  // a low skin mound round the dome (the eyelid): blends the eye into the head instead of a ball sitting on it (frogs only; stalk eyes keep their own)
  const mound = e.at ? null : K(':lid', () => shade(new THREE.SphereGeometry(1, 28, 16).scale(1.32, e.bulge * 0.7, 1.32), 0.3));
  const lm2 = mound && mat('lid:' + art, () => new THREE.MeshBasicMaterial({ color: lid, vertexColors: true }));
  for (const side of [1, -1]) {
    // sits on the surface normal but looks out sideways and a little ahead (amphibian eyes face the side, not the sky)
    // on a stalk (`at`): on its tip, looking out and ahead
    const p = e.at ? P3(e.at[0], e.at[1], side * e.at[2]) : surf(b, e.u, e.th, side), n = e.at ? new THREE.Vector3(0.3, 0.5, side).normalize() : normalAt(b, e.u, e.th, side);
    const look = n.clone().add(new THREE.Vector3(0.15, 0, side * 0.9)).normalize();
    const fwd = new THREE.Vector3(1, 0, 0).projectOnPlane(look).normalize(), m = new THREE.Mesh(dome, em);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, look, new THREE.Vector3().crossVectors(fwd, look)));
    m.scale.setScalar(e.r); m.position.copy(p).addScaledVector(n, e.r * (e.bulge - (e.at ? 0.55 : 0.82)));
    grp.add(m);
    if (mound) { const k = new THREE.Mesh(mound, lm2!); k.quaternion.copy(m.quaternion); k.scale.setScalar(e.r); k.position.copy(p).addScaledVector(n, e.r * (e.bulge * 0.7 - 0.9)); grp.add(k); }
  }
  if (h.fin) {
    const f = h.fin;
    grp.add(new THREE.Mesh(K(':fin', () => finGeometry(b, f)), mat('fin:' + art, () => new THREE.MeshBasicMaterial({ color: f.c, vertexColors: true, transparent: true, opacity: f.o, side: THREE.DoubleSide, depthWrite: false }))));
  }
  if (h.gills) {
    const gl = h.gills, sg = K(':gstalk', () => gillGeometry(gl).stalks), fg = K(':gfringe', () => gillGeometry(gl).fringe);
    const sm = mat('gstalk:' + art, () => new THREE.MeshBasicMaterial({ color: gl.stalk, vertexColors: true }));
    const fm = mat('gfringe:' + art, () => new THREE.MeshBasicMaterial({ color: gl.fringe, vertexColors: true }));
    for (const side of [1, -1]) for (const [g, m] of [[sg, sm], [fg, fm]] as const) { const o = new THREE.Mesh(g, m); o.scale.z = side; grp.add(o); }
  }
  if (h.shell) {
    // the borrowed shell's aperture sits off its coil axis: slide the shell sideways so the aperture is on the body's midline
    const sm = shellMesh(art, h.shell.s, h.shell), lip: THREE.Vector3[] | undefined = sm.geometry.userData.lip;
    sm.position.set(0, -h.ground, lip?.length ? -lip.reduce((z, p) => z + p.z, 0) / lip.length : 0); grp.add(sm);
  }
  grp.scale.setScalar(w);
  return grp;
}
