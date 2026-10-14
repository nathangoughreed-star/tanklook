// Reef pieces for the aquascape library (lane E, 2026-10-14): live rock and four corals (branching, plate, mushroom,
// leather). Procedural from (variant, seed, size), like the stones and wood in render/items.ts, which caches, bakes the
// light and clips them at the glass; this file only builds the shape, its unlit colours and its grit (shader detail)
// coordinates. Base on y = 0, centred on the anchor. Size = the piece's width (live rock: its length).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { stoneDims } from '../scene/items';
import { clean, grit, paint, waves } from './items';

type R = () => number;
type G = THREE.BufferGeometry;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const C = (hex: string) => new THREE.Color(hex);
/** Grit kinds (see GRIT in render/items.ts): 3 pitted rock, 11 hard coral (corallite dots), 12 soft tissue (polyp fuzz). */
const ROCK = 3, HARD = 11, SOFT = 12;

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
/** Porous reef rock: a few overlapping knobbly lumps with holes, cream under patches of pink and purple coralline algae. */
function rockGeo(r: R, l: number, h: number, w: number) {
  const nz = waves(r), fine = waves(r, 8), hole = waves(r, 7), v = new THREE.Vector3(), cut = -0.45, lumps: G[] = [];
  for (let m = 0, n = 3 + Math.floor(r() * 3); m < n; m++) {
    const c = m ? V((r() - 0.5) * 1.2, r() * 0.35, (r() - 0.5) * 0.7) : V(0, 0.1, 0), rad = m ? 0.35 + r() * 0.3 : 0.6, off = V(r() * 9, r() * 9, r() * 9);
    let g: G = new THREE.IcosahedronGeometry(1, 3);
    g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
    const p = g.attributes.position, dent = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const q = v.clone().add(off);
      let k = 1 + 0.28 * nz(q.clone().multiplyScalar(1.9)) + 0.12 * fine(q.clone().multiplyScalar(5.5));
      k -= 0.4 * Math.max(0, hole(q.clone().multiplyScalar(4.5)) - 0.15); // holes and channels
      dent[i] = k;
      v.multiplyScalar(k * rad).add(c);
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
  g.computeVertexNormals();
  const base = C(['#b8a687', '#ad9c80', '#c2b294'][Math.floor(r() * 3)]), cor = [C('#8e4d86'), C('#c4698f'), C('#a65a9c')][Math.floor(r() * 3)];
  const patch = waves(r, 5), patch2 = waves(r, 4), algae = C('#6f6b45');
  paint(g, (q, i) => {
    const c = base.clone().multiplyScalar(0.55 + 0.45 * Math.min(1, Math.max(0, (dent.getX(i) - 0.75) / 0.3))); // dark holes
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
  return stand(parts.map(g => clean(g, true)));
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

/** The shape of a reef piece (unlit colours + aGrit), base on y = 0. */
export function reefShape(variant: string, seed: number, size: number): G {
  const r = rng(seed * 23 + 9);
  if (variant === 'liverock') { const [l, h, w] = stoneDims(variant, seed, size); return part(rockGeo(r, l, h, w), ROCK, seed); }
  if (variant === 'acropora') return branching(r, size);
  if (variant === 'montipora') return plate(r, size);
  if (variant === 'mushroom') return mushroom(r, size);
  return leather(r, size);
}
