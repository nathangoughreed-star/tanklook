// Reef pieces for the aquascape library (lane E, 2026-10-14): live rock and four corals (branching, plate, mushroom,
// leather). Procedural from (variant, seed, size), like the stones and wood in render/items.ts, which caches, bakes the
// light and clips them at the glass; this file only builds the shape, its unlit colours and its grit (shader detail)
// coordinates. Base on y = 0, centred on the anchor. Size = the piece's width (live rock: its length).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { stoneDims } from '../scene/items';
import { clean, grit, paint, waves } from './items';

type R = () => number;
type G = THREE.BufferGeometry;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const C = (hex: string) => new THREE.Color(hex);
/** Grit kinds (see GRIT in render/items.ts): 3 pitted rock, 11 hard coral (corallite dots), 12 soft tissue (polyp fuzz). */
const ROCK = 3, HARD = 11, SOFT = 12;
/** Live rock: edges sharper than this stay sharp, the rest is shaded smooth. */
const ROCK_CREASE = 55 * Math.PI / 180;

/** Smooth normals across a generator's seams (sphere / lathe edges), keeping it indexed so parts merge. */
function smooth(g: G) {
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  const m = mergeVertices(g);
  m.computeVertexNormals();
  return m;
}
/** A finished part: indexed, only the attributes every part has. */
const part = (g: G, kind: number, seed: number) => clean(grit(g, kind, seed), true);
/** Merge the parts and stand the result on y = 0. */
function stand(parts: G[]) {
  const g = mergeGeometries(parts)!;
  g.computeBoundingBox();
  return g.translate(0, -g.boundingBox!.min.y, 0);
}

// ---------- Live rock ----------
/**
 * Porous reef rock: a few overlapping craggy lumps, cream under patches of pink and purple coralline algae. Angular, not
 * rounded (Nathan 2026-10-14): each lump broken by a few flat faces with sharp edges,
 * and pitted with round holes of many sizes that go dark inside, besides the channels.
 */
function rockGeo(r: R, l: number, h: number, w: number) {
  const nz = waves(r), fine = waves(r, 8), hole = waves(r, 7), v = new THREE.Vector3(), u = new THREE.Vector3(), cut = -0.45, lumps: G[] = [];
  for (let m = 0, n = 3 + Math.floor(r() * 3); m < n; m++) {
    const c = m ? V((r() - 0.5) * 1.2, r() * 0.35, (r() - 0.5) * 0.7) : V(0, 0.1, 0), rad = m ? 0.35 + r() * 0.3 : 0.6, off = V(r() * 9, r() * 9, r() * 9);
    // broken faces: planes the lump is shaved flat against (not the underside, which sits in the pile)
    const faces = Array.from({ length: 5 + Math.floor(r() * 4) }, () => ({ n: V(r() - 0.5, r() * 0.9 - 0.25, r() - 0.5).normalize(), o: 0.6 + r() * 0.25 }));
    // pits: round holes over the surface, a few big ones and many small
    const pits = Array.from({ length: 26 + Math.floor(r() * 14) }, (_, i) => ({ d: V(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), w: i < 5 ? 0.2 + r() * 0.12 : 0.07 + r() * 0.1, k: 0.18 + r() * 0.22 }));
    const g: G = new THREE.IcosahedronGeometry(1, 4); // not indexed: creased normals below decide what is sharp
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    const p = g.attributes.position, dent = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      u.fromBufferAttribute(p, i).normalize();
      const q = u.clone().add(off);
      let k = 1 + 0.26 * nz(q.clone().multiplyScalar(1.9)) + 0.1 * fine(q.clone().multiplyScalar(5.5));
      k -= 0.3 * Math.max(0, hole(q.clone().multiplyScalar(4.5)) - 0.2); // channels
      v.copy(u).multiplyScalar(k);
      for (const f of faces) { const e = v.dot(f.n) - f.o; if (e > 0) v.addScaledVector(f.n, -e * 0.92); } // shaved flat
      let pit = 0;
      for (const P of pits) { const a = u.angleTo(P.d); if (a < P.w) pit = Math.max(pit, P.k * Math.sqrt(1 - (a / P.w) ** 2)); }
      v.multiplyScalar(1 - pit);
      dent[i] = 1 - pit * 2.2 - 0.6 * Math.max(0, 1 - k); // dark in pits and channels
      v.multiplyScalar(rad).add(c);
      p.setXYZ(i, v.x, Math.max(v.y, cut), v.z);
    }
    g.setAttribute('dent', new THREE.BufferAttribute(dent, 1));
    lumps.push(g);
  }
  const g = mergeGeometries(lumps)!, p = g.attributes.position, dent = g.attributes.dent;
  // fit the lumps to the piece's length, height and width
  g.computeBoundingBox();
  const bb = g.boundingBox!, cx = (bb.max.x + bb.min.x) / 2, cz = (bb.max.z + bb.min.z) / 2;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, (p.getX(i) - cx) * l / (bb.max.x - bb.min.x), (p.getY(i) - bb.min.y) * h / (bb.max.y - bb.min.y), (p.getZ(i) - cz) * w / (bb.max.z - bb.min.z));
  // smooth across the small triangles, sharp across the broken faces' edges and pit rims (Nathan 2026-10-14: angular
  // yes, but the triangles read too large and geometric with every one flat)
  toCreasedNormals(g, ROCK_CREASE);
  const base = C(['#b8a687', '#ad9c80', '#c2b294'][Math.floor(r() * 3)]), cor = [C('#8e4d86'), C('#c4698f'), C('#a65a9c')][Math.floor(r() * 3)];
  const patch = waves(r, 5), patch2 = waves(r, 4), algae = C('#6f6b45');
  paint(g, (q, i) => {
    const c = base.clone().multiplyScalar(0.3 + 0.7 * Math.min(1, Math.max(0, (dent.getX(i) - 0.25) / 0.7))); // dark holes
    const a = patch(q.clone().multiplyScalar(0.035)), b = patch2(q.clone().multiplyScalar(0.08));
    c.lerp(cor, Math.min(0.75, Math.max(0, (a - 0.05) * 1.8 + 0.3 * b)));        // coralline crust
    if (q.y > h * 0.4) c.lerp(algae, Math.min(0.35, Math.max(0, b * 1.4 - 0.25))); // a little turf algae on top
    return c;
  });
  g.deleteAttribute('dent');
  return g;
}

// ---------- Branching (Acropora) ----------
/** A tapered tube along a gentle curve; colour per ring from `col(t)`, t = 0 base .. 1 end. */
function tube(pts: THREE.Vector3[], r0: number, r1: number, col: (t: number) => THREE.Color, cap = false) {
  const curve = new THREE.CatmullRomCurve3(pts), TS = 6, RS = 7;
  const g = new THREE.TubeGeometry(curve, TS, 1, RS, false), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i <= TS; i++) {
    const t = i / TS; curve.getPointAt(t, c);
    for (let j = 0; j <= RS; j++) { const k = i * (RS + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r0 + (r1 - r0) * t).add(c); p.setXYZ(k, v.x, v.y, v.z); }
  }
  g.computeVertexNormals();
  paint(g, (_, i) => col(Math.floor(i / (RS + 1)) / TS));
  const out: G[] = [g];
  if (cap) { const s = new THREE.SphereGeometry(r1 * 1.05, RS, 5).translate(...curve.getPointAt(1).toArray() as [number, number, number]); out.push(paint(s, () => col(1.15))); }
  return out;
}
const ACRO: [string, string][] = [['#b48d68', '#7fb2ea'], ['#8a6aa8', '#e6cdf2'], ['#6f9a5c', '#d9f0a2'], ['#c88a66', '#f7d4b4'], ['#5f8faa', '#bdf2ff']];
function branching(r: R, s: number) {
  const [b0, b1] = ACRO[Math.floor(r() * ACRO.length)].map(C), parts: G[] = [], DEPTH = 3;
  const col = (gen: number) => (t: number) => { const f = (gen + Math.min(t, 1)) / (DEPTH + 1); return b0.clone().lerp(b1, Math.max(0, (f - 0.45) / 0.55) ** 1.4 + (t > 1 ? 0.25 : 0)); };
  const turn = (d: THREE.Vector3, ang: number) => {
    const side = V(r() - 0.5, r() - 0.5, r() - 0.5).cross(d).normalize();
    return d.clone().applyAxisAngle(side, ang).add(V(0, 0.22, 0)).normalize();
  };
  const grow = (p: THREE.Vector3, d: THREE.Vector3, len: number, rad: number, gen: number) => {
    const end = p.clone().addScaledVector(d, len), mid = p.clone().lerp(end, 0.5).add(V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(len * 0.12));
    const last = gen === DEPTH;
    parts.push(...tube([p, mid, end], rad, rad * 0.8, col(gen), last));
    if (last) return;
    const kids = 2 + (r() < 0.4 ? 1 : 0);
    for (let k = 0; k < kids; k++) grow(end, turn(d, k === 0 ? (5 + r() * 12) * Math.PI / 180 : (24 + r() * 22) * Math.PI / 180), len * (0.72 + r() * 0.18), rad * 0.8, gen + 1);
  };
  const n = 6 + Math.floor(r() * 4), a0 = r() * 6.28;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * 6.28 + (r() - 0.5) * 0.6, el = (40 + r() * 35) * Math.PI / 180;
    grow(V(Math.cos(a) * 0.04 * s, 0, Math.sin(a) * 0.04 * s), V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), 0.16 * s, 0.032 * s, 0);
  }
  const foot = new THREE.SphereGeometry(0.12 * s, 12, 6).scale(1, 0.4, 1);
  parts.push(paint(foot, () => b0.clone().multiplyScalar(0.85)));
  const g = stand(parts.map(q => part(q, HARD, Math.round(s))));
  // fit the spread to the size: width = size
  const bb = g.boundingBox!, wide = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
  return g.scale(s / wide, s / wide, s / wide);
}

// ---------- Discs: plate, mushroom, leather cap ----------
/**
 * A thick rounded disc of radius R and thickness th (a squashed sphere), its outline and surface bent by
 * f(angle, rr) -> { r: radius factor, y: lift, mm } with rr = 0 at the centre .. 1 at the rim. Colours from
 * col(angle, rr, top) in the disc's own frame, before it is placed.
 */
function disc(R: number, th: number, f: (a: number, rr: number) => { r: number; y: number }, col: (a: number, rr: number, top: boolean) => THREE.Color) {
  const g0 = new THREE.SphereGeometry(1, 48, 12), p = g0.attributes.position, v = new THREE.Vector3(), info: [number, number, boolean][] = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const rr = Math.min(1, Math.hypot(v.x, v.z)), a = Math.atan2(v.z, v.x), o = f(a, rr);
    p.setXYZ(i, v.x * R * o.r, v.y * th + o.y, v.z * R * o.r);
  }
  const g = smooth(g0), q = g.attributes.position;
  // colours from the unbent unit sphere: recover (angle, rr, top) from the bent position's direction
  for (let i = 0; i < q.count; i++) { const x = q.getX(i), z = q.getZ(i), a = Math.atan2(z, x), rr = Math.min(1, Math.hypot(x, z) / (R * f(a, 1).r)); info.push([a, rr, q.getY(i) >= f(a, rr).y]); }
  return paint(g, (_, i) => col(...info[i]));
}

const PLATE: [string, string][] = [['#7a5338', '#d2aa78'], ['#5c8a4c', '#c4e48e'], ['#93506c', '#eaa6c6'], ['#a8743c', '#f2c466']];
/** Montipora-style plate coral: a spiral whorl of thin cupped plates, each a shelf tipped up at its outer edge, rising
 *  from a small encrusting base; paler at the growing rim. */
function plate(r: R, s: number) {
  const [c0, c1] = PLATE[Math.floor(r() * PLATE.length)].map(C), parts: G[] = [], n = 3 + Math.floor(r() * 3), a0 = r() * 6.28, dir = r() < 0.5 ? 1 : -1;
  const col = (_: number, rr: number, top: boolean) => c0.clone().lerp(c1, rr ** 3).multiplyScalar(top ? 1 : 0.78);
  for (let i = 0; i < n; i++) {
    const R = s * (0.34 - 0.03 * i) * (0.9 + r() * 0.2), th = Math.max(1.2, 0.022 * s), ph = r() * 6.28, ph2 = r() * 6.28, cup = 0.08 + r() * 0.1, wav = 0.02 + r() * 0.03;
    const g = disc(R, th, (a, rr) => ({ r: 1 + 0.12 * Math.sin(3 * a + ph) + 0.05 * Math.sin(7 * a + ph2), y: R * (cup * rr * rr + wav * rr * Math.sin(4 * a + ph2)) }), col);
    part(g, HARD, Math.round(s) + i * 31);
    // round the spiral: centre pushed out from the axis, outer edge tipped up, each plate higher than the last
    const a = a0 + dir * i * 2.1, off = R * 0.7, up = 0.08 + r() * 0.17;
    g.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(V(-Math.sin(a), 0, Math.cos(a)), up)).translate(Math.cos(a) * off, s * (0.06 + 0.07 * i), Math.sin(a) * off);
    parts.push(g);
  }
  const foot = new THREE.SphereGeometry(0.13 * s, 14, 7).scale(1, 0.9, 1).translate(0, 0.05 * s, 0);
  parts.push(part(paint(foot, () => c0.clone().multiplyScalar(0.8)), HARD, Math.round(s) + 7));
  return stand(parts.map(g => clean(g, true)));
}

const MUSH: [string, string][] = [['#9c2f45', '#e27c8e'], ['#2f8a5a', '#8ee2aa'], ['#38509c', '#8eaaf2'], ['#6e3a8c', '#c69ce2'], ['#b0582f', '#f2a472']];
/** Discosoma-style mushroom corals: a cluster of flat discs with a mouth and radial lines, on a small live rock. */
function mushroom(r: R, s: number) {
  const rl = s * 0.62, rh = s * 0.2, rock = rockGeo(r, rl, rh, rl * 0.8), parts: G[] = [part(rock, ROCK, Math.round(s))], rp = rock.attributes.position;
  /** The rock's top near (x, z). */
  const topAt = (x: number, z: number, rad: number) => { let y = 0; for (let i = 0; i < rp.count; i++) if (Math.hypot(rp.getX(i) - x, rp.getZ(i) - z) < rad) y = Math.max(y, rp.getY(i)); return y; };
  const [c0, c1] = MUSH[Math.floor(r() * MUSH.length)].map(C), n = 6 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const R = s * (0.13 + r() * 0.09), th = R * 0.12, ph = r() * 6.28, rib = 10 + Math.floor(r() * 8), spot = r() < 0.5;
    const g = disc(R, th, (a, rr) => ({ r: 1 + 0.06 * Math.sin(5 * a + ph), y: R * (0.18 * (1 - rr * rr) - 0.12 * Math.exp(-rr * rr * 40) + 0.05 * rr * Math.sin(3 * a + ph)) }),
      (a, rr, top) => {
        if (!top) return c0.clone().multiplyScalar(0.7);
        const c = c0.clone().lerp(c1, 0.35 + 0.25 * Math.sin(a * rib) * rr + (rr > 0.8 ? 0.3 : 0));
        if (spot && Math.sin(a * rib * 0.5) * Math.sin(rr * 18) > 0.75) c.lerp(c1, 0.6);
        return rr < 0.12 ? c1.clone().lerp(C('#f3e6c8'), 0.4) : c; // pale mouth
      });
    part(g, SOFT, Math.round(s) + i * 17);
    // on the rock: spread round its top, tipped outward
    const a = i * 2.39996 + r() * 0.8, q = (0.2 + 0.8 * Math.sqrt((i + r()) / n)) * rl * 0.42, y = topAt(Math.cos(a) * q, Math.sin(a) * q, Math.max(R * 0.4, rl * 0.1)) + th * 0.5;
    const tip = new THREE.Quaternion().setFromAxisAngle(V(-Math.sin(a), 0, Math.cos(a)).normalize(), -(0.25 + 0.6 * q / (rl * 0.4)));
    g.applyQuaternion(tip).translate(Math.cos(a) * q, y, Math.sin(a) * q);
    parts.push(g);
  }
  return stand(parts.map(g => clean(g, false))); // the rock is flat-faceted (not indexed), so the discs follow
}

const LEATHER: [string, string][] = [['#b9a874', '#ece0b4'], ['#9ba46c', '#dae2aa'], ['#c4a37c', '#f2dec4']];
/** Sarcophyton toadstool leather coral: a smooth pale stalk under a broad folded cap furred with polyps. */
function leather(r: R, s: number) {
  const [c0, c1] = LEATHER[Math.floor(r() * LEATHER.length)].map(C), stalkC = C('#ded4b6'), hgt = s * (0.38 + r() * 0.12), lean = (r() - 0.5) * 0.3;
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(s * (0.2 - 0.09 * Math.sin(t * Math.PI * 0.9) + 0.06 * t ** 4), t * hgt)); }
  const stalk = smooth(new THREE.LatheGeometry(prof, 24));
  paint(stalk, q => stalkC.clone().multiplyScalar(0.9 + 0.1 * q.y / hgt));
  const R = s * 0.5, folds = 5 + Math.floor(r() * 5), ph = r() * 6.28, amp = 0.08 + r() * 0.07;
  const cap = disc(R, Math.max(2, 0.06 * s), (a, rr) => ({ r: 1 + 0.07 * Math.sin(folds * a + ph) + 0.04 * Math.sin(3 * a), y: R * (0.12 * (1 - rr * rr) + amp * rr ** 2 * Math.sin(folds * a + ph) - 0.04 * rr ** 4) }),
    (_, rr, top) => top ? c0.clone().lerp(c1, 0.25 + 0.35 * rr ** 2) : stalkC.clone().multiplyScalar(0.85));
  return stand([
    part(stalk, SOFT, Math.round(s) + 3),
    part(cap, SOFT, Math.round(s)).rotateZ(lean).translate(-Math.sin(lean) * hgt * 0.5, hgt, 0),
  ].map(g => clean(g, true)));
}

// ---------- Lane T4 (2026-10-16): zoanthids, Euphyllia (hammer, torch), fine Acropora, bubble-tip anemone ----------
/** Highest rock top in a coarse grid over the rock's footprint, for setting polyps on it: top(x, z). */
function topGrid(g: G, n = 28) {
  g.computeBoundingBox();
  const bb = g.boundingBox!, p = g.attributes.position, sx = (bb.max.x - bb.min.x) / n || 1, sz = (bb.max.z - bb.min.z) / n || 1, h = new Float32Array(n * n).fill(-1);
  const cell = (x: number, z: number) => Math.min(n - 1, Math.max(0, Math.floor((x - bb.min.x) / sx))) * n + Math.min(n - 1, Math.max(0, Math.floor((z - bb.min.z) / sz)));
  for (let i = 0; i < p.count; i++) { const k = cell(p.getX(i), p.getZ(i)); h[k] = Math.max(h[k], p.getY(i)); }
  return (x: number, z: number) => h[cell(x, z)];
}
/** A unit sphere squashed to (rx, ry, rz), coloured by col(unit-sphere position), then turned to `q` and moved to `at`. */
function blob3(rx: number, ry: number, rz: number, seg: number, col: (u: THREE.Vector3) => THREE.Color, q: THREE.Quaternion, at: THREE.Vector3) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(3, seg >> 1));
  paint(g, u => col(u));
  return g.scale(rx, ry, rz).applyQuaternion(q).translate(at.x, at.y, at.z);
}
const UP = V(0, 1, 0);
const along = (d: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
/** Generator pieces (tubes, spheres, cylinders) ready to merge: no uv, normals from the final shape, grit. */
const soft = (g: G, s: number, indexed = false) => { g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.computeVertexNormals(); return clean(part(g, SOFT, Math.round(s)), indexed); };

// [skirt, disc, mouth]: rasta, fruit loop, sunny, dragon eye, eagle eye
const ZOA: [string, string, string][] = [['#2fa860', '#f07a28', '#3ac0d8'], ['#d83a7a', '#f2c84a', '#38a858'], ['#f2a020', '#2a7ad8', '#f2e05a'], ['#3ab0c8', '#8a3ab0', '#f07a28'], ['#5a9a3a', '#3a5ac8', '#f2e8b0']];
/** Zoanthid colony: a low mat of short polyps packed over the crown of a small rock, each a column under a round oral
 *  disc ringed by a short-tentacle skirt, the mouth a contrasting dot (roadmap: dense, low polyp mats). */
function zoanthid(r: R, s: number) {
  const rl = s * 0.9, rh = s * 0.2, rock = rockGeo(r, rl, rh, rl * 0.75), parts: G[] = [clean(part(rock, ROCK, Math.round(s)), false)], top = topGrid(rock);
  const [k0, k1, k2] = ZOA[Math.floor(r() * ZOA.length)].map(C), stem = k0.clone().lerp(C('#6a5a3a'), 0.55), rp = Math.max(3, s * 0.04);
  // hex grid over the rock's footprint, jittered; only where the rock top is high enough (the mat stays on the crown)
  const step = rp * 1.85;
  for (let zi = -rl, row = 0; zi <= rl; zi += step * 0.866, row++) for (let xi = -rl; xi <= rl; xi += step) {
    const x = xi + (row & 1 ? step / 2 : 0) + (r() - 0.5) * rp * 0.5, z = zi + (r() - 0.5) * rp * 0.5;
    if ((x / (rl * 0.5)) ** 2 + (z / (rl * 0.4)) ** 2 > 1) continue;
    const y0 = top(x, z); if (y0 < rh * 0.25) continue;
    const hp = rp * (0.5 + r() * 0.6), rr = rp * (0.85 + r() * 0.3), d = V((r() - 0.5) * 0.5 + x / rl * 0.6, 1, (r() - 0.5) * 0.5 + z / rl * 0.6).normalize(), q = along(d);
    const base = V(x, y0 - rp * 0.3, z), col = new THREE.CylinderGeometry(rr * 0.7, rr * 0.8, hp, 7, 1, true).translate(0, hp / 2, 0);
    paint(col, v => stem.clone().multiplyScalar(0.7 + 0.3 * v.y / hp));
    parts.push(soft(col.applyQuaternion(q).translate(base.x, base.y, base.z), s));
    const jag = r() * 6.28;
    parts.push(soft(blob3(rr * 1.15, rr * 0.32, rr * 1.15, 10, u => {
      const rad = Math.hypot(u.x, u.z), a = Math.atan2(u.z, u.x);
      if (u.y < 0) return stem.clone();
      if (rad > 0.78 + 0.08 * Math.sin(a * 14 + jag)) return k0.clone(); // the skirt of short tentacles
      return rad < 0.22 ? k2.clone() : k1.clone().lerp(k2, 0.25 * (1 - rad));
    }, q, base.clone().addScaledVector(d, hp)), s));
  }
  return stand(parts);
}

const HAMMER: [string, string][] = [['#4a7a5a', '#a8f0c8'], ['#7a6a3a', '#f2d070'], ['#5a6a8a', '#b8d8f8']];
const TORCH: [string, string][] = [['#6a7a3a', '#e8e070'], ['#8a6a4a', '#7af0e0'], ['#4a7a6a', '#f0c060']];
/**
 * Euphyllia: a few heads on short skeleton walls, each a dense bundle of fleshy tentacles. Hammer: short thick tentacles
 * ending in a crosswise "hammer" (anchor-shaped) tip. Torch: long, slim tentacles flowing to one side, each ending in a
 * small round, paler tip (roadmap: fleshy formations; long projecting tentacles).
 */
function euphyllia(r: R, s: number, torch: boolean) {
  const [c0, c1] = (torch ? TORCH : HAMMER)[Math.floor(r() * 3)].map(C), wall = C('#8a8070'), parts: G[] = [];
  const heads = 5 + Math.floor(r() * 4), flow = V(r() - 0.5, 0, r() - 0.5).normalize(), sway = torch ? 0.55 : 0.15;
  for (let h = 0; h < heads; h++) {
    const a = h * 2.39996 + r() * 0.6, q = s * 0.27 * Math.sqrt((h + 0.5) / heads), hy = s * (torch ? 0.14 : 0.16) * (1 - 0.4 * q / (s * 0.27)) + s * 0.04;
    const hc = V(Math.cos(a) * q, hy, Math.sin(a) * q), hr = s * (torch ? 0.07 : 0.08);
    // the skeleton wall under the head: a short stalk from the base
    parts.push(...tube([V(hc.x * 0.3, 0, hc.z * 0.3), V(hc.x * 0.7, hy * 0.5, hc.z * 0.7), hc.clone().add(V(0, -hr * 0.3, 0))], s * 0.035, hr * 0.7, () => wall));
    const n = torch ? 16 + Math.floor(r() * 8) : 14 + Math.floor(r() * 6);
    for (let t = 0; t < n; t++) {
      const b = t * 2.39996 + r() * 0.3, k = Math.sqrt((t + 0.5) / n), root = hc.clone().add(V(Math.cos(b) * hr * k, hr * 0.15, Math.sin(b) * hr * k));
      const out = V(Math.cos(b) * k * 0.8, 1, Math.sin(b) * k * 0.8).normalize();
      if (torch) {
        const len = s * (0.26 + r() * 0.12), rad = s * 0.012, side = out.clone().multiplyScalar(0.6).add(flow.clone().multiplyScalar(sway)).normalize();
        const p1 = root.clone().addScaledVector(out, len * 0.45), p2 = p1.clone().addScaledVector(side, len * 0.4).add(V(0, len * 0.05, 0)), p3 = p2.clone().addScaledVector(side, len * 0.25).add(V(0, -len * 0.12, 0));
        parts.push(...tube([root, p1, p2, p3], rad * 1.2, rad * 0.85, tt => c0.clone().lerp(c1, Math.max(0, tt - 0.75) * 2.5), true));
      } else {
        const len = s * (0.08 + r() * 0.05), rad = s * 0.017, end = root.clone().addScaledVector(out, len);
        parts.push(...tube([root, root.clone().lerp(end, 0.5).add(V((r() - 0.5) * len * 0.15, 0, (r() - 0.5) * len * 0.15)), end], rad, rad * 0.9, () => c0.clone()));
        // the hammer: a sausage lying across the tentacle's end, paler at its two ends
        const across = out.clone().cross(V(r() - 0.5, 0, r() - 0.5)).normalize(), qh = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), across);
        parts.push(blob3(rad * 2.6, rad * 1.2, rad * 1.2, 10, u => c0.clone().lerp(c1, 0.35 + 0.65 * Math.abs(u.x) ** 2), qh, end));
      }
    }
  }
  parts.push(paint(new THREE.SphereGeometry(0.14 * s, 14, 7).scale(1, 0.4, 1), () => wall.clone().multiplyScalar(0.8)));
  return stand(parts.map(g => soft(g, s, true)));
}

/** Fine-branching Acropora (bushy / tenuis style): many trunks splitting four times into slim branchlets with pale,
 *  bluntly rounded tips; spreads wider than tall (roadmap: fine-branching stony coral). */
function acroFine(r: R, s: number) {
  const [b0, b1] = ACRO[Math.floor(r() * ACRO.length)].map(C), parts: G[] = [], DEPTH = 4;
  const col = (gen: number) => (t: number) => { const f = (gen + Math.min(t, 1)) / (DEPTH + 1); return b0.clone().lerp(b1, Math.max(0, (f - 0.55) / 0.45) ** 1.3 + (t > 1 ? 0.3 : 0)); };
  const turn = (d: THREE.Vector3, ang: number) => d.clone().applyAxisAngle(V(r() - 0.5, r() - 0.5, r() - 0.5).cross(d).normalize(), ang).add(V(0, 0.3, 0)).normalize();
  const grow = (p: THREE.Vector3, d: THREE.Vector3, len: number, rad: number, gen: number) => {
    const end = p.clone().addScaledVector(d, len), last = gen === DEPTH;
    parts.push(...tube([p, p.clone().lerp(end, 0.5).add(V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(len * 0.1)), end], rad, rad * 0.82, col(gen), last));
    if (last) return;
    const kids = 2 + (r() < 0.3 ? 1 : 0);
    for (let k = 0; k < kids; k++) grow(end, turn(d, k === 0 ? (4 + r() * 10) * Math.PI / 180 : (28 + r() * 20) * Math.PI / 180), len * (0.7 + r() * 0.15), rad * 0.78, gen + 1);
  };
  const n = 10 + Math.floor(r() * 4), a0 = r() * 6.28;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * 6.28 + (r() - 0.5) * 0.5, el = (22 + r() * 40) * Math.PI / 180;
    grow(V(Math.cos(a) * 0.03 * s, 0, Math.sin(a) * 0.03 * s), V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), 0.12 * s, 0.02 * s, 0);
  }
  parts.push(paint(new THREE.SphereGeometry(0.1 * s, 12, 6).scale(1, 0.4, 1), () => b0.clone().multiplyScalar(0.85)));
  const g = stand(parts.map(q => part(q, HARD, Math.round(s))));
  const bb = g.boundingBox!, wide = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
  return g.scale(s / wide, s / wide, s / wide);
}

// [column / disc, tentacle, bubble tip]: rose, green, red, tan
const BTA: [string, string, string][] = [['#8a3a3a', '#c85a6a', '#f27a98'], ['#6a5a3a', '#7aa060', '#c8f080'], ['#5a1a1a', '#a82a2a', '#e8504a'], ['#7a6a4a', '#b8a070', '#e8d0a0']];
/** Bubble-tip anemone: a short flared column under an oral disc crowded with tentacles, each swelling into a bulb
 *  just below its tip (the "bubble"); not a coral, a soft focal point (roadmap). */
function anemone(r: R, s: number) {
  const [c0, c1, c2] = BTA[Math.floor(r() * BTA.length)].map(C), parts: G[] = [], R0 = s * 0.2, ch = s * 0.08;
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; prof.push(new THREE.Vector2(R0 * (0.75 + 0.35 * t * t), t * ch)); }
  prof.push(new THREE.Vector2(0, ch * 1.05));
  parts.push(paint(new THREE.LatheGeometry(prof, 20), q => c0.clone().multiplyScalar(0.75 + 0.25 * q.y / ch)));
  const n = 70 + Math.floor(r() * 30);
  for (let t = 0; t < n; t++) {
    const b = t * 2.39996, k = Math.sqrt((t + 0.5) / n), root = V(Math.cos(b) * R0 * 1.05 * k, ch, Math.sin(b) * R0 * 1.05 * k);
    const out = V(Math.cos(b) * (0.25 + 0.9 * k), 1.1 - 0.5 * k, Math.sin(b) * (0.25 + 0.9 * k)).normalize(), len = s * (0.17 + 0.07 * (1 - k) + r() * 0.05), rad = s * 0.014;
    const bend = out.clone().add(V((r() - 0.5) * 0.4, -0.15 * k, (r() - 0.5) * 0.4)).normalize();
    const p1 = root.clone().addScaledVector(out, len * 0.5), bulb = p1.clone().addScaledVector(bend, len * 0.32), tip = bulb.clone().addScaledVector(bend, len * 0.18);
    parts.push(...tube([root, p1, bulb], rad, rad * 1.1, () => c1.clone()));
    parts.push(blob3(rad * 1.55, rad * 2, rad * 1.55, 9, u => c1.clone().lerp(c2, 0.5 + 0.5 * u.y), along(bend), bulb)); // the bubble
    parts.push(...tube([bulb, bulb.clone().lerp(tip, 0.5), tip], rad * 0.9, rad * 0.55, () => c2.clone(), true));
  }
  return stand(parts.map(g => soft(g, s, true)));
}

/** Scale a piece (standing on y = 0) so its spread = size. */
function fit(g: G, s: number) {
  g.computeBoundingBox();
  const bb = g.boundingBox!, k = s / (Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1);
  return g.scale(k, k, k);
}

/** The shape of a reef piece (unlit colours + aGrit), base on y = 0. */
export function reefShape(variant: string, seed: number, size: number): G {
  const r = rng(seed * 23 + 9);
  if (variant === 'liverock') { const [l, h, w] = stoneDims(variant, seed, size); return part(rockGeo(r, l, h, w), ROCK, seed); }
  if (variant === 'acropora') return branching(r, size);
  if (variant === 'montipora') return plate(r, size);
  if (variant === 'mushroom') return mushroom(r, size);
  if (variant === 'zoanthid') return fit(zoanthid(r, size), size);
  if (variant === 'hammer') return fit(euphyllia(r, size, false), size);
  if (variant === 'torch') return fit(euphyllia(r, size, true), size);
  if (variant === 'acrofine') return acroFine(r, size);
  if (variant === 'anemone') return fit(anemone(r, size), size);
  return leather(r, size);
}
