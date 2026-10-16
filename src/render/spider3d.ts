// Spiders in 3D (lane JS, 2026-10-16; roadmap Release 2): the jumping-spider body plan, the first arthropod. Per species
// only data (art/spiders.ts). A cephalothorax lofted with a raised, boxy eye field carrying all eight eyes in their real
// arrangement (the big forward-facing anterior median pair, the anterior laterals at the front corners, the tiny
// posterior medians and the posterior laterals on the sides of the field), chelicerae with their fangs, short pedipalps
// (the male's with the bulb), an oval abdomen painted with the species' white spots and bands, and eight legs of real
// segments (coxa, femur, patella, tibia, metatarsus, tarsus) solved by two-bone IK from the coxa to a tarsus tip set on
// the surface the pose stands on. Fine hair (render/limbs.ts fuzz): thousands of tiny tapered strands over the body and
// legs, a puff of white round the face, so it reads fuzzy and still crisp. Unlit, like the herps: shading baked into
// vertex colours.
// Poses: 'ground' (floor, cork, rock, a ledge: walking), 'glass' (the pane or 3D wall: clinging, belly close, legs spread)
// and 'perch' (on top of a branch, the legs reaching round the limb); each also with the front pair raised ('alert').
// Frame: unit = the body length = the card width; x forward, y up, z + side; the surface it stands on is the plane
// y = -ground (on a branch: the limb's top, its axis at y = -ground - R).
import * as THREE from 'three';
import { SPIDERS, isSpider, spiderGround, type SMark, type SpiderLeg, type SpiderSpec, type Stn } from '../art/spiders';
import { curveOf } from '../art/lizards';
import { rng } from '../art/paint';
import { V, TAU, bandedChain, clamp01, cylinder, fuzz, ik, merge, plane, smooth, tint, type Surf } from './limbs';
import { boxUV, jointTube } from './herp3d';

export { isSpider };
export type SpiderPose = 'ground' | 'glass' | 'perch';

const NX = 64, RG = 36;
/** How far the feet sit off the surface (body lengths): the tarsus tip's radius. */
const TIP = 0.016;

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
const col = (h: string, k = 1) => { const [r, g, b] = rgb(h); return new THREE.Color(r * k, g * k, b * k); };
const spE = (c: number, e: number) => Math.sign(c) * Math.abs(c) ** (2 / e);

// ---------- loft (carapace, abdomen) ----------

interface Loft { geo: THREE.BufferGeometry; x0: number; x1: number; sec: (x: number) => { hw: number; top: number; bot: number; yc: number } }
function secFn(st: Stn[]) {
  const c = [1, 2, 3, 4].map(k => curveOf(st.slice().reverse().map(s => [s[0], s[k]] as [number, number])));
  return (x: number) => ({ hw: c[0](x), top: c[1](x), bot: c[2](x), yc: c[3](x) });
}
/** The section's point at angle th (0 = top, pi/2 = + side, pi = underside): [up from the centre line, side]. */
function ring(c: ReturnType<ReturnType<typeof secFn>>, th: number, eT: number, eB: number): [number, number] {
  const cs = Math.cos(th), sn = Math.sin(th), e = cs >= 0 ? eT : eB;
  return [cs >= 0 ? c.top * spE(cs, eT) : c.bot * spE(cs, eB), c.hw * spE(sn, e)];
}
function loft(st: Stn[], eT: number, eB: number, ends: [number, number]): Loft {
  const sec = secFn(st), x0 = st[st.length - 1][0], x1 = st[0][0], pos: number[] = [], uv: number[] = [];
  for (let i = 0; i <= NX; i++) {
    const u = i / NX, x = x0 + (x1 - x0) * u;
    const k = Math.sqrt(clamp01(u / ends[0])) * Math.sqrt(clamp01((1 - u) / ends[1])), c = sec(x);
    c.hw *= k; c.top *= k; c.bot *= k;
    for (let j = 0; j <= RG; j++) {
      const th = TAU * j / RG, [up, side] = ring(c, th, eT, eB);
      pos.push(x, c.yc + up, side); uv.push(u, th <= Math.PI ? th / Math.PI : 2 - th / Math.PI);
    }
  }
  const idx: number[] = [], C = RG + 1;
  for (let i = 0; i < NX; i++) for (let j = 0; j < RG; j++) { const a = i * C + j, b = a + C; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // wound outward? compare a side vertex's normal with its direction from the ring's centre
  const n = g.attributes.normal, p = g.attributes.position, mid = C * (NX >> 1), cen = V(), q = V(), nn = V().fromBufferAttribute(n, mid + (RG >> 2));
  for (let j = 0; j < RG; j++) cen.add(q.fromBufferAttribute(p, mid + j)); cen.divideScalar(RG);
  if (nn.dot(q.fromBufferAttribute(p, mid + (RG >> 2)).sub(cen)) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  // the seam's two columns share a normal
  const nm = g.attributes.normal, t = V(), u = V();
  for (let i = 0; i <= NX; i++) { const a = i * C, b = a + RG; t.fromBufferAttribute(nm, a); u.fromBufferAttribute(nm, b); t.add(u).normalize(); nm.setXYZ(a, t.x, t.y, t.z); nm.setXYZ(b, t.x, t.y, t.z); }
  return { geo: g, x0, x1, sec };
}
/** Height of the carapace's top surface above the point (x, z) (from the loft's own formula), or null off the side. */
function topY(S: SpiderSpec, L: Loft, x: number, z: number) {
  const c = L.sec(x), r = Math.abs(z) / c.hw;
  if (r >= 1) return null;
  const sn = r ** (S.eT / 2), cs = Math.sqrt(1 - sn * sn);
  return c.yc + c.top * cs ** (2 / S.eT);
}

// ---------- paint ----------

interface Paint { W: number; H: number; px: Float32Array; at(u: number, a: number, out: THREE.Color): THREE.Color }
/** Raster a part's marks into an RGB buffer (u along the part from the rear, a = 0 dorsal midline .. 1 underside). */
function paint(base: string, marks: SMark[], x0: number, x1: number, halfPerim: number, W = 512, H = 160): Paint {
  const px = new Float32Array(W * H * 3), b = rgb(base), len = x1 - x0;
  for (let i = 0; i < W * H; i++) { px[3 * i] = b[0]; px[3 * i + 1] = b[1]; px[3 * i + 2] = b[2]; }
  const blend = (i: number, c: number[], o: number) => { for (let k = 0; k < 3; k++) px[3 * i + k] += (c[k] - px[3 * i + k]) * Math.min(1, o); };
  for (const m of marks) {
    const c = rgb(m.k === 'mottle' ? m.c : m.c);
    if (m.k === 'mottle') {
      const r = rng(m.seed);
      for (let n = 0; n < m.n; n++) {
        const u = r(), a = r() * 0.9, rad = m.r[0] + r() * (m.r[1] - m.r[0]), ru = rad / len * W, ra = rad / halfPerim * H;
        const cx = u * W, cy = a * H, o = m.o * (0.4 + 0.6 * r());
        for (let y = Math.max(0, Math.floor(cy - ra)); y <= Math.min(H - 1, Math.ceil(cy + ra)); y++) for (let x = Math.max(0, Math.floor(cx - ru)); x <= Math.min(W - 1, Math.ceil(cx + ru)); x++) {
          const d = Math.hypot((x - cx) / ru, (y - cy) / ra); if (d < 1) blend(y * W + x, c, o * (1 - d * d));
        }
      }
      continue;
    }
    const soft = (m.soft ?? 0.005);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x0 + (x + 0.5) / W * len, s = (y + 0.5) / H * halfPerim;
      let v: number;
      if (m.k === 'ell') {
        const d = Math.hypot((X - m.x) / m.rx, (s - m.s) / m.rs); v = 1 - smooth(1 - soft / Math.min(m.rx, m.rs), 1, d);
        if (!m.one) { const d2 = Math.hypot((X - m.x) / m.rx, (s + m.s) / m.rs); v = Math.max(v, 1 - smooth(1 - soft / Math.min(m.rx, m.rs), 1, d2)); }
      } else {
        const ax = Math.min(smooth(m.x[0] - soft, m.x[0] + soft, X), 1 - smooth(m.x[1] - soft, m.x[1] + soft, X));
        const as = Math.min(smooth(m.s[0] - soft, m.s[0] + soft, s), 1 - smooth(m.s[1] - soft, m.s[1] + soft, s));
        v = ax * as;
      }
      if (v > 0.001) blend(y * W + x, c, v * m.o);
    }
  }
  return {
    W, H, px,
    at(u, a, out) {
      const x = Math.min(W - 1, Math.max(0, Math.floor(u * W))), y = Math.min(H - 1, Math.max(0, Math.floor(a * H))), i = 3 * (y * W + x);
      return out.setRGB(px[i], px[i + 1], px[i + 2]);
    },
  };
}
function texture(p: Paint) {
  const c = document.createElement('canvas'); c.width = p.W; c.height = p.H;
  const x = c.getContext('2d')!, img = x.createImageData(p.W, p.H), r = rng(3);
  for (let i = 0; i < p.W * p.H; i++) {
    const n = 0.93 + 0.14 * r(); // a fine speckle: the coat's grain
    img.data.set([Math.round(Math.min(255, p.px[3 * i] * 255 * n)), Math.round(Math.min(255, p.px[3 * i + 1] * 255 * n)), Math.round(Math.min(255, p.px[3 * i + 2] * 255 * n)), 255], 4 * i);
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4;
  return t;
}

// ---------- legs ----------

interface PoseCx { S: SpiderSpec; G: number; surf: Surf; pose: SpiderPose; R: number; alert: boolean; body: THREE.Matrix4 }

/** One leg on one side: IK from the coxa to a tarsus tip on the surface (or, raised, in the air). Returns the joint points. */
function legPoints(cx: PoseCx, l: SpiderLeg, i: number, side: number) {
  const { G, surf, pose, R, alert, body } = cx, gait = (i % 2 === (side > 0 ? 0 : 1) ? 1 : -1) * 0.035 * (cx.pose === 'glass' ? 1.2 : 1);
  const hip = V(l.hx, 0.03, side * l.hz).applyMatrix4(body);
  const fx = l.foot[0] + gait, fz = l.foot[1] * (pose === 'glass' ? 1.1 : 1);
  const raised = alert && i === 0;
  // the coxa: out to the side and a little down
  const cd = V(0.12 * Math.sign(fx - l.hx), -0.3, side).normalize().transformDirection(body).multiplyScalar(l.len[0]);
  const P1 = hip.clone().add(cd), a = l.len[1] + l.len[2], b = l.len[3] + l.len[4] + l.len[5];
  let F: THREE.Vector3, pole = V(0, 1, 0).addScaledVector(V(0, 0, side), 0.25);
  if (raised) {
    // the front pair up and forward, a little apart, one waving higher than the other
    F = P1.clone().add(V(0.36, 0.3 + (side > 0 ? 0.06 : -0.02), side * 0.42));
    pole = V(-0.2, 1, side * 0.9);
  } else if (pose === 'perch') {
    const yA = -G - R, phi = Math.min(1.3, Math.asin(Math.min(1, fz / (R + 0.04))));
    F = surf.snap(V(fx, yA + Math.cos(phi) * (R + 0.02), side * Math.sin(phi) * (R + 0.02)));
  } else F = surf.snap(V(fx, -G, side * fz));
  if (!raised) {
    // out of reach: slide the foot in toward the coxa until the chain spans it
    for (let k = 0; k < 40 && F.distanceTo(P1) > 0.96 * (a + b); k++) F = surf.snap(F.clone().lerp(surf.snap(P1), 0.06));
    F.addScaledVector(surf.n(F), TIP);
  } else if (F.distanceTo(P1) > 0.96 * (a + b)) F = P1.clone().add(F.sub(P1).setLength(0.96 * (a + b)));
  const K = ik(P1, F, a, b, pole);
  // the femur ends a little short of the knee, up toward the pole: the patella is the short joint between
  const fem = l.len[1] / a, P2 = P1.clone().lerp(K, fem).addScaledVector(pole.clone().normalize(), 0.012 + 0.02 * (raised ? 0 : 1));
  const dir = F.clone().sub(K), tib = l.len[3] / b, met = (l.len[3] + l.len[4]) / b;
  const P4 = K.clone().addScaledVector(dir, tib), P5 = K.clone().addScaledVector(dir, met).addScaledVector(pole.clone().normalize(), -0.012);
  return [hip, P1, P2, K, P4, P5, F];
}

function legGeometry(cx: PoseCx, l: SpiderLeg, i: number, side: number, seed: number) {
  const { S } = cx, pts = legPoints(cx, l, i, side), dark = col(S.legCol[0]), pale = col(S.legCol[1]);
  const bands = new Set(S.legBands), tipCol = col(S.legCol[0], 0.8);
  const parts = bandedChain(pts, [...l.r], (seg, ny) => {
    const base = bands.has(seg) ? pale : dark, k = 0.62 + 0.38 * smooth(-0.6, 0.4, ny);
    return base.clone().multiplyScalar(k);
  });
  const leg = merge(parts);
  // spines under the tibia and metatarsus
  const sp: THREE.BufferGeometry[] = [];
  const r = rng(seed);
  for (const seg of [3, 4]) for (let n = 0; n < 3; n++) {
    const a = pts[seg], b = pts[seg + 1], t = 0.2 + 0.3 * n + 0.1 * r(), at = a.clone().lerp(b, t), ax = b.clone().sub(a).normalize();
    const out = V(0, -0.6, side * 0.8).addScaledVector(ax, -V(0, -0.6, side * 0.8).dot(ax)).normalize();
    const c = new THREE.ConeGeometry(0.0045, 0.034, 4); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), out)).translate(...at.addScaledVector(out, l.r[seg] * 0.8 + 0.014).toArray() as [number, number, number]);
    c.deleteAttribute('uv'); sp.push(c.toNonIndexed());
  }
  // the claws and the tuft at the tip
  const F = pts[6], dirT = pts[6].clone().sub(pts[5]).normalize();
  for (const s2 of [-1, 1]) {
    const c = new THREE.ConeGeometry(0.004, 0.022, 4); const d = dirT.clone().addScaledVector(cx.surf.n(F), -0.55).addScaledVector(V(0, 0, 1), s2 * 0.2).normalize();
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d)).translate(...F.clone().addScaledVector(dirT, 0.004).addScaledVector(d, 0.006).toArray() as [number, number, number]);
    c.deleteAttribute('uv'); sp.push(c.toNonIndexed());
  }
  const spines = tint(merge(sp), () => tipCol.clone().multiplyScalar(0.9));
  const hair = fuzz(leg, {
    count: S.hair.leg, len: [0.010, 0.022], rad: 0.0017, seed, lean: 0.6, frost: 0.1,
    flow: () => F.clone().sub(pts[1]).normalize(),
    colour: (p, _uv, c) => {
      // the leg's own colour at the root: nearest joint segment
      let best = 0, bd = 9; for (let k = 0; k < 6; k++) { const m = pts[k].clone().lerp(pts[k + 1], 0.5), d = m.distanceTo(p); if (d < bd) { bd = d; best = k; } }
      return c.copy(bands.has(best) ? pale : dark).multiplyScalar(0.95);
    },
    keep: (p, n) => (n.dot(cx.surf.n(p)) < -0.4 ? 0.35 : 1),
  });
  return { leg, spines, hair, pts };
}

// ---------- head parts ----------

function palpGeometry(cx: PoseCx, side: number) {
  const { S } = cx, P = S.palp, c = col(S.palpCol), out: THREE.BufferGeometry[] = [];
  const pts = P.pts.map(([x, y, z]) => V(x, y, side * z).applyMatrix4(cx.body));
  // keep the tip off the surface it stands on
  for (const p of pts) { const k = cx.surf.snap(p); const d = p.clone().sub(k).dot(cx.surf.n(p)); if (d < 0.02) p.addScaledVector(cx.surf.n(p), 0.02 - d); }
  const tube = jointTube(pts, P.r, 0, true), n = tube.attributes.normal;
  const cl: number[] = []; for (let i = 0; i < n.count; i++) { const k = 0.7 + 0.3 * smooth(-0.6, 0.4, n.getY(i)); cl.push(c.r * k, c.g * k, c.b * k); }
  tube.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  for (const k of Object.keys(tube.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') tube.deleteAttribute(k);
  out.push(tube);
  if (P.bulb) { // the male's palp: a swollen bulb at the tip, dark with a pale cap
    const t = pts[pts.length - 1], d = t.clone().sub(pts[pts.length - 2]).normalize();
    const s = new THREE.SphereGeometry(P.bulb, 14, 10).scale(1, 0.9, 1.15); s.translate(t.x + d.x * P.bulb * 0.4, t.y + d.y * P.bulb * 0.4 - 0.004, t.z + d.z * P.bulb * 0.4);
    s.deleteAttribute('uv'); const g2 = s.toNonIndexed(); g2.computeVertexNormals(); out.push(tint(g2, ny => new THREE.Color(0.1, 0.07, 0.06).multiplyScalar(0.7 + 0.5 * smooth(-0.5, 0.6, ny))));
  }
  const g = merge(out);
  return { g, hair: fuzz(g, { count: 900, len: [0.010, 0.024], rad: 0.002, seed: side > 0 ? 71 : 72, lean: 0.4, frost: 0.1, flow: () => V(0.5, -0.1, 0), colour: (_p, _u, cc) => cc.copy(c).multiplyScalar(1.05) }) };
}

function chelGeometry(cx: PoseCx, side: number) {
  const { S } = cx, C = S.chel, a = V(0.436, 0.1, side * 0.043).applyMatrix4(cx.body), b = V(0.436 + C.len * 0.42, 0.1 - C.len * 0.95, side * 0.05).applyMatrix4(cx.body);
  const g = jointTube([a, b], [C.r, C.r * 0.82], 0, false), nm = g.attributes.normal, cl: number[] = [], A = col(C.col[0]), B = col(C.col[1]);
  for (let i = 0; i < nm.count; i++) {
    // iridescent: green on the lit side, blue-violet turning away
    const t = clamp01(0.5 + 0.7 * nm.getY(i) * -1 + 0.3 * nm.getX(i)), c = A.clone().lerp(B, smooth(0.25, 0.9, t)).multiplyScalar(0.55 + 0.45 * smooth(-0.3, 0.9, nm.getY(i)));
    cl.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
  // the fang: a dark curved cone folding in under the chelicera
  const fang = new THREE.ConeGeometry(0.012, 0.05, 6), d = b.clone().sub(a).normalize().addScaledVector(V(-0.3, 0, -side * 0.15).transformDirection(cx.body), 0.5).normalize();
  fang.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d)).translate(...b.clone().addScaledVector(d, 0.02).toArray() as [number, number, number]);
  fang.deleteAttribute('uv');
  return merge([g, tint(fang.toNonIndexed(), () => new THREE.Color(0.22, 0.09, 0.05))]);
}

/** A puff of white hair round the face (the clypeus under the big eyes, the "moustache") over a small ellipsoid. */
function facePuff(cx: PoseCx, c: THREE.Color) {
  const s = new THREE.SphereGeometry(0.052, 14, 10).scale(0.8, 0.8, 2.0); s.translate(0.452, 0.115, 0); s.applyMatrix4(cx.body);
  s.deleteAttribute('uv'); const g = s.toNonIndexed(); g.computeVertexNormals();
  return fuzz(g, { count: 1200, len: [0.010, 0.026], rad: 0.0022, seed: 41, lean: 0.35, frost: 0.12, flow: () => V(1, -0.2, 0), colour: (_p, _u, cc) => cc.copy(c) });
}

function spinnerets(cx: PoseCx, xEnd: number, yc: number) {
  const out: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const c = new THREE.ConeGeometry(0.014, 0.05, 6); c.rotateZ(Math.PI / 2 + 0.2); c.translate(xEnd - 0.012, yc, s * 0.012); c.applyMatrix4(cx.body); c.deleteAttribute('uv');
    out.push(c.toNonIndexed());
  }
  return tint(merge(out), () => col(cx.S.abdomenCol, 1.6));
}

// ---------- eyes ----------

function eyeTexture(ring: boolean) {
  const N = 96, c = document.createElement('canvas'); c.width = N; c.height = N;
  const x = c.getContext('2d')!, img = x.createImageData(N, N);
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const s = py / N, ph = px / N * TAU;
    let v: number[] = [5, 5, 6];
    if (ring && s > 0.3 && s < 0.5) { const k = smooth(0.3, 0.42, s) * (1 - smooth(0.44, 0.5, s)); v = [5 + 70 * k, 5 + 28 * k, 5 + 14 * k]; } // a dull amber ring round the black
    if (Math.hypot(s * Math.cos(ph) - 0.12, s * Math.sin(ph) + 0.16) < 0.07) v = [236, 236, 232]; // the catchlight
    else if (Math.hypot(s * Math.cos(ph) + 0.1, s * Math.sin(ph) - 0.2) < 0.035) v = [120, 120, 125];
    img.data.set([...v.map(Math.round), 255], (py * N + px) * 4);
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A fine grain multiplied over the legs and palps (a bare tube looks like plastic; this is the coat under the hair). */
let grain: THREE.CanvasTexture | null = null;
function grainTexture() {
  if (grain) return grain;
  const N = 128, c = document.createElement('canvas'); c.width = N; c.height = N;
  const x = c.getContext('2d')!, img = x.createImageData(N, N), r = rng(23);
  for (let i = 0; i < N * N; i++) { const k = 205 + Math.round(50 * r() ** 0.6); img.data.set([k, k, k, 255], 4 * i); }
  x.putImageData(img, 0, 0);
  grain = new THREE.CanvasTexture(c); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.colorSpace = THREE.SRGBColorSpace; grain.userData.keep = true;
  return grain;
}

// ---------- assembly ----------

export function spiderPose(surface?: string, R?: number): SpiderPose {
  return surface === 'glass' ? 'glass' : surface === 'perch' && R ? 'perch' : 'ground';
}

type Built = { chains: THREE.Vector3[][]; body: THREE.BufferGeometry[]; limbs: THREE.BufferGeometry; hair: THREE.BufferGeometry; eyes: { c: THREE.Vector3; look: THREE.Vector3; r: number; ring: boolean; fwd: THREE.Vector3 }[]; pose: SpiderPose };
const poseCache = new Map<string, Built>();

/** Keep a built part off the surface (no strand through the pane or the bark). */
function clampAbove(g: THREE.BufferGeometry, surf: Surf, margin = 0.0008) {
  const p = g.attributes.position, q = V();
  for (let i = 0; i < p.count; i++) {
    q.fromBufferAttribute(p, i);
    const s = surf.snap(q), n = surf.n(q), d = q.clone().sub(s).dot(n);
    if (d < margin) { q.copy(s).addScaledVector(n, margin); p.setXYZ(i, q.x, q.y, q.z); }
  }
  return g;
}

function build(S: SpiderSpec, pose: SpiderPose, R: number, alert: boolean): Built {
  const G = spiderGround(S), surf: Surf = pose === 'perch' ? cylinder(-G - R, R) : plane(-G);
  const stand = pose === 'glass' ? S.stand.glass : S.stand.ground;
  // the body frame: the underside of the carapace at -G + stand; alert pitches the head up about the middle legs
  const pitch = alert ? 0.2 : 0, body = new THREE.Matrix4().makeTranslation(0, -G + stand + (alert ? 0.03 : 0), 0)
    .multiply(new THREE.Matrix4().makeTranslation(0.1, 0, 0)).multiply(new THREE.Matrix4().makeRotationZ(pitch)).multiply(new THREE.Matrix4().makeTranslation(-0.1, 0, 0));
  const cx: PoseCx = { S, G, surf, pose, R, alert, body };
  const car = loft(S.carapace, S.eT, S.eB, [0.035, 0.03]), abd = loft(S.abdomen, 2.2, 2.4, [0.02, 0.08]);
  const abdMinX = S.abdomen[S.abdomen.length - 1][0], pCar = paint(S.carapaceCol, S.carapaceMarks, car.x0, car.x1, 0.3), pAbd = paint(S.abdomenCol, S.abdomenMarks, abd.x0, abd.x1, 0.34);
  const bodyParts: THREE.BufferGeometry[] = [], chains: THREE.Vector3[][] = [];
  const limbParts: THREE.BufferGeometry[] = [];
  // body meshes: textured, shaded against the body's own up
  const finish = (l: Loft, p: Paint, hairN: number, seed: number, flowX: number) => {
    const g = l.geo.clone(); g.applyMatrix4(body);
    const n = g.attributes.normal, cl: number[] = [], up = V(0, 1, 0).transformDirection(body), q = V();
    for (let i = 0; i < n.count; i++) { const ny = q.fromBufferAttribute(n, i).dot(up), k = 1 - 0.32 * Math.max(0, -ny) + 0.05 * Math.max(0, ny); cl.push(k, k, k); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    const hair = fuzz(g, {
      count: hairN, len: [0.009, 0.02], rad: 0.0018, seed, lean: 0.55, frost: 0.1,
      flow: () => V(flowX, 0.2, 0).transformDirection(body),
      colour: (_pt, uv, c) => p.at(uv!.x, uv!.y, c).multiplyScalar(1.02),
      keep: (_pt, nn) => (nn.dot(up) < -0.5 ? 0.3 : 1),
    });
    return { g, hair };
  };
  const cB = finish(car, pCar, S.hair.body * 0.46, 11, -1), aB = finish(abd, pAbd, S.hair.body * 0.54, 12, -1);
  bodyParts.push(cB.g, aB.g);
  const hairParts: THREE.BufferGeometry[] = [];
  for (const h of [cB.hair, aB.hair]) if (h) hairParts.push(h);
  // legs, palps, chelicerae
  for (const side of [1, -1]) {
    S.legs.forEach((l, i) => {
      const L = legGeometry(cx, l, i, side, 100 + i * 7 + (side > 0 ? 0 : 3));
      chains.push(L.pts); limbParts.push(L.leg, L.spines); if (L.hair) hairParts.push(L.hair);
    });
    const P = palpGeometry(cx, side); limbParts.push(P.g); if (P.hair) hairParts.push(P.hair);
    limbParts.push(chelGeometry(cx, side));
  }
  const puff = facePuff(cx, col(S.hairCol)); if (puff) hairParts.push(puff);
  limbParts.push(spinnerets(cx, abdMinX, S.abdomen[S.abdomen.length - 1][4]));
  const limbs = boxUV(merge(limbParts)), hair = merge(hairParts);
  clampAbove(limbs, surf); clampAbove(hair, surf);
  // eyes
  const E = S.eyes, eyes: Built['eyes'] = [], fwd = V(1, 0, 0).transformDirection(body);
  const place = (c: THREE.Vector3, look: THREE.Vector3, r: number, ring: boolean) => eyes.push({ c: c.applyMatrix4(body), look: look.normalize().transformDirection(body), r, ring, fwd });
  for (const s of [1, -1]) {
    place(V(0.448, E.ame.y, s * E.ame.z), V(1, -0.04, s * 0.12), E.ame.r, true);
    place(V(E.ale.x, E.ale.y, s * E.ale.z), V(0.8, 0.12, s * 0.55), E.ale.r, false);
    const ty = (x: number, z: number, r: number) => (topY(S, car, x, z) ?? 0.2) - r * 0.45;
    place(V(E.pme.x, ty(E.pme.x, E.pme.z, E.pme.r), s * E.pme.z), V(0.05, 0.65, s * 0.75), E.pme.r, false);
    place(V(E.ple.x, ty(E.ple.x, E.ple.z, E.ple.r), s * E.ple.z), V(-0.2, 0.6, s * 0.75), E.ple.r, false);
  }
  return { chains, body: bodyParts, limbs, hair, eyes, pose, ...{ paints: [pCar, pAbd] } } as Built & { paints: Paint[] };
}

/**
 * The 3D spider for a card of width w (the body length; origin at the card's centre; add it as the card's child), in the pose
 * for its surface: 'glass' (pane or 3D wall), 'perch' with Rmm = the branch's radius in mm, else 'ground'; `alert` raises the
 * front pair.
 */
export function spiderBody(art: string, w: number, surface?: string, Rmm?: number, alert = false) {
  const S = SPIDERS[art], R = Rmm ? Math.round(Rmm / w * 200) / 200 : 0, pose = spiderPose(surface, R);
  const key = `${art}~${pose}${pose === 'perch' ? '~' + R : ''}${alert ? '~a' : ''}`;
  let built = poseCache.get(key) as (Built & { paints: Paint[] }) | undefined;
  if (!built) {
    built = build(S, pose, R, alert) as Built & { paints: Paint[] };
    for (const g of [...built.body, built.limbs, built.hair]) g.userData.keep = true;
    poseCache.set(key, built);
  }
  const grp = new THREE.Group();
  const tex = (i: number) => mat(`spbody${i}:${art}`, () => new THREE.MeshBasicMaterial({ map: texture(built!.paints[i]), vertexColors: true }));
  built.body.forEach((g, i) => grp.add(new THREE.Mesh(g, tex(i))));
  grp.add(new THREE.Mesh(built.limbs, mat('splimb', () => new THREE.MeshBasicMaterial({ vertexColors: true, map: grainTexture() }))));
  grp.add(new THREE.Mesh(built.hair, mat('sphair', () => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }))));
  const dome = geo('speye', () => new THREE.SphereGeometry(1, 20, 14));
  for (const e of built.eyes) {
    const look = e.look, f = e.fwd.clone().projectOnPlane(look).normalize();
    if (f.lengthSq() < 0.5) f.set(0, 0, 1).projectOnPlane(look).normalize();
    const m = new THREE.Mesh(dome, mat('speye:' + (e.ring ? 'r' : 'b'), () => new THREE.MeshBasicMaterial({ map: eyeTexture(e.ring) })));
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, look, V().crossVectors(f, look))); m.scale.setScalar(e.r); m.position.copy(e.c);
    grp.add(m);
  }
  grp.userData.spider = pose; grp.userData.alert = alert;
  grp.scale.setScalar(w);
  return grp;
}

/** The eight leg chains (hip, coxa end, femur end, knee, tibia end, metatarsus end, tip) of a pose, in the body's own frame at width w (tests). */
export function spiderChains(art: string, w: number, surface?: string, Rmm?: number, alert = false) {
  const S = SPIDERS[art], R = Rmm ? Math.round(Rmm / w * 200) / 200 : 0, pose = spiderPose(surface, R);
  return build(S, pose, R, alert).chains.map(c => c.map(p => p.clone().multiplyScalar(w)));
}
