// 3D plants: one generator for every species, driven by `PLANT3D` in art/plants.ts. A leaf is a curved sheet along a
// centreline (rise from the vertical, arch toward the ground by the tip, twist about the midrib, a cupped or ridged
// cross-section, rippled edges), built twice so the upper side and the paler underside each face their own way.
// Leaves are set out by the plant's form: a rosette from one crown, a creeping rhizome, upright stems with leaf
// pairs, or a carpet of leaflets. Colour is per vertex (edge to midrib, tip tint, underside) with the form shading
// baked in (leaves facing up lighter, the inside and the base of the plant darker); the water lighting (aqPatch)
// then lights it as it lights the cards. Base at y = 0, height = the item's size (carpet: width = size).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { PLANT_ASPECT, PLANT3D, type Leaf3D, type PlantType } from '../art/plants';
import { CARPET_H } from '../scene/items';
import { taperTube } from './fish3d';

/** Switches for review sheets: on (off = the crossed cards), sway (off = every leaf rigid). */
export const plant3d = { on: true, sway: true };
export const has3DPlant = (type: PlantType) => plant3d.on && !!PLANT3D[type];

type R = () => number;
const MAX_LEAFLETS = 3000;
type Spot = (lx: number, lz: number) => { x: number; y: number; z: number; w: number } | null;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const between = (r: R, [a, b]: [number, number]) => lerp(a, b, r());

/** Vertices of one plant before merging: positions, base colours, triangles. */
class Sheets {
  pos: number[] = []; col: number[] = []; idx: number[] = [];
  /** A grid of rows x cols points (row-major), with the base colour per point; front = as given, back = reversed. */
  grid(p: THREE.Vector3[], c: THREE.Color[], rows: number, cols: number, back?: THREE.Color[]) {
    for (const side of back ? [0, 1] : [0]) {
      const o = this.pos.length / 3;
      p.forEach((v, i) => { const k = side ? back![i] : c[i]; this.pos.push(v.x, v.y, v.z); this.col.push(k.r, k.g, k.b); });
      for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) {
        const a = o + i * cols + j, b = a + cols;
        if (side) this.idx.push(a, a + 1, b, a + 1, b + 1, b); else this.idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    return g;
  }
}

/**
 * One leaf from `base`, heading `yaw` (0 = +x, toward the viewer = +pi/2), length L. `rise` / `arch` / `twist` / `bright`
 * are this leaf's draws; the colour pair is picked by the caller. Returns the blade's tip.
 */
/** How a leaf gives to the water: leans `k` toward the current (cx, cz) by the tip, plus an S-wobble of `wob` sideways. */
interface Bend { cx: number; cz: number; k: number; wob: number; ph: number }
const STIFF: Bend = { cx: 0, cz: 0, k: 0, wob: 0, ph: 0 };

function leaf(out: Sheets, f: Leaf3D, stalkCol: string, base: THREE.Vector3, yaw: number, L: number, rise: number, twist: number, cols: [string, string], bright: number, r: R, bend: Bend = STIFF) {
  // across the blade: evenly spaced, plus two columns hugging the middle when there is a midrib line
  const us = Array.from({ length: f.seg[1] }, (_, j) => (j / (f.seg[1] - 1)) * 2 - 1);
  if (f.rib) us.splice(us.length >> 1, 1, -0.07, 0, 0.07);
  // rows: a few up the bare stalk (a narrow strip in the stalk colour), then the blade
  const NS = f.seg[0], NP = f.pet > 0 ? 3 : 0, NC = us.length, rows = NP + NS + 1, W = L * f.wid, SW = Math.max(0.6, W * 0.07);
  const rib = f.rib ? new THREE.Color(f.rib) : null, stalk = new THREE.Color(stalkCol), pts: THREE.Vector3[] = [], cs: THREE.Color[] = [], bs: THREE.Color[] = [];
  const edge = new THREE.Color(cols[0]), mid = new THREE.Color(cols[1]), under = new THREE.Color(f.under), tip = f.tip ? new THREE.Color(f.tip[0]) : null;
  const hx = Math.cos(yaw), hz = Math.sin(yaw), ph = r() * 6.28;
  const dir = (t: number) => {
    const a = rise + f.arch * t ** 1.5, w = bend.wob * Math.sin(t * Math.PI * 1.6 + bend.ph) * t;
    return V(Math.sin(a) * hx + bend.cx * bend.k * t ** 1.5 - hz * w, Math.cos(a), Math.sin(a) * hz + bend.cz * bend.k * t ** 1.5 + hx * w).normalize();
  };
  const c = base.clone();
  let tPrev = 0;
  for (let i = 0; i < rows; i++) {
    const blade = i >= NP, s = blade ? (i - NP) / NS : 0, t = blade ? f.pet + (1 - f.pet) * s : f.pet * i / NP;
    for (let q = 0; q < 3; q++) c.addScaledVector(dir(tPrev + (t - tPrev) * (q + 0.5) / 3), L * (t - tPrev) / 3); // walk the centreline
    tPrev = t;
    const d = dir(t);
    // across the blade: horizontal and square to the heading, turned about the midrib by the twist
    const side0 = V(-hz, 0, hx), side = side0.addScaledVector(d, -side0.dot(d)).normalize().applyAxisAngle(d, twist * s), up = new THREE.Vector3().crossVectors(side, d).normalize();
    const w = !blade ? SW : s >= 1 ? 0 : Math.max(NP ? SW : 0, W * Math.sin(Math.PI * Math.max(1e-3, s) ** f.prof[0]) ** f.prof[1]);
    for (let j = 0; j < NC; j++) {
      const u = us[j];
      const lift = blade ? f.fold * u * u * w / 2 + f.wave[0] * W * Math.abs(u) * Math.sin(s * Math.PI * f.wave[1] + ph + u) : 0;
      pts.push(c.clone().addScaledVector(side, u * w / 2).addScaledVector(up, lift));
      const k = blade ? edge.clone().lerp(mid, (1 - Math.abs(u)) ** 1.5) : stalk.clone();
      if (blade && rib && u === 0 && s > 0.02 && s < 0.9) k.lerp(rib, 0.55);
      if (blade && tip && s > 1 - f.tip![1]) k.lerp(tip, ((s - 1 + f.tip![1]) / f.tip![1]) ** 1.5);
      cs.push(k.multiplyScalar(bright)); bs.push(blade ? under.clone().lerp(k, 0.3).multiplyScalar(bright) : k);
    }
  }
  out.grid(pts, cs, rows, NC, bs);
  return c;
}

/** A stalk or rhizome: a tapered tube through the points, flat colour. */
function tube(pts: THREE.Vector3[], r: number, col: string) {
  const g = taperTube(new THREE.CatmullRomCurve3(pts), r, Math.max(4, pts.length * 2), 4);
  const k = new THREE.Color(col), a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) { a[i] = k.r; a[i + 1] = k.g; a[i + 2] = k.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.deleteAttribute('uv');
  return g;
}

/** Form shading: leaves facing up lighter, the base and the middle of the plant darker (`h` = height, `rad` = reach). */
function shade(g: THREE.BufferGeometry, h: number, rad: number) {
  g.computeVertexNormals();
  const n = g.attributes.normal, p = g.attributes.position, c = g.attributes.color;
  for (let i = 0; i < n.count; i++) {
    const ny = n.getY(i), y = p.getY(i) / h, out = Math.hypot(p.getX(i), p.getZ(i)) / rad;
    const k = (0.72 + 0.3 * Math.max(0, ny) - 0.12 * Math.max(0, -ny)) * (0.62 + 0.38 * Math.min(1, Math.max(y * 1.6, out)));
    c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
  }
}

/**
 * The plant's geometry, base at y = 0, its tallest point at h. A carpet is a patch h wide on flat ground, built once per
 * (seed, size); carpetOnGround() then sets each leaflet on the ground under it (cheap, so it can run every drag step).
 */
export function plantGeometry(type: PlantType, seed: number, h: number) {
  const P = PLANT3D[type]!, f = P.leaf, r = rng(seed * 7919 + 13), out = new Sheets(), extra: THREE.BufferGeometry[] = [];
  const Wc = h / PLANT_ASPECT[type], pick = () => f.cols[Math.floor(r() * f.cols.length)];
  const twist = () => (r() - 0.5) * 2 * f.twist, bright = () => 0.9 + r() * 0.2;
  // the water's give: one current direction for the whole plant (mostly along the tank, as a filter's flow runs), each
  // leaf leaning into it by its own amount, longer leaves more (own random stream: the leaf layout stays as it was)
  const rs = rng(seed * 104729 + 71), cur = (rs() < 0.5 ? 0 : Math.PI) + (rs() - 0.5) * 1.2, cx = Math.cos(cur), cz = Math.sin(cur), sway = plant3d.sway ? P.sway : 0;
  const bend = (len = 1): Bend => ({ cx, cz, k: sway * (0.5 + rs()) * len, wob: sway * 0.5 * (rs() - 0.5) * 2 * len, ph: rs() * 6.28 });
  if (P.form === 'carpet') {
    // leaflets over a disc with a ragged edge, lower toward it; past MAX_LEAFLETS a big patch gets bigger leaflets instead of more
    const rad = h / 2, want = Math.PI * rad * rad / 1000 * between(r, P.n), n = Math.round(Math.min(want, MAX_LEAFLETS)), grow = Math.sqrt(want / n), lobes = [r() * 6.28, r() * 6.28, r() * 6.28];
    const anchors = new Float32Array(n * 2), owner: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, edge = rad * (0.82 + 0.06 * Math.sin(3 * a + lobes[0]) + 0.05 * Math.sin(5 * a + lobes[1]) + 0.04 * Math.sin(8 * a + lobes[2]));
      const d = Math.sqrt(r()) * edge, x = Math.cos(a) * d, z = Math.sin(a) * d, k = 1 - (d / edge) ** 3;
      const y = CARPET_H * k * (0.35 + 0.65 * r() ** 0.7), L = between(r, f.len) * grow, v0 = out.pos.length / 3;
      leaf(out, f, P.stalk, V(x, Math.max(0, y - L * 0.5), z), r() * 6.28, L, between(r, f.rise), twist(), pick(), bright() * (0.8 + 0.2 * k), r, bend(0.5));
      anchors[i * 2] = x; anchors[i * 2 + 1] = z;
      for (let v = v0; v < out.pos.length / 3; v++) owner.push(i);
    }
    const g = out.geometry();
    shade(g, CARPET_H, 1e9);
    g.computeBoundingBox(); g.computeBoundingSphere();
    Object.assign(g.userData, { keep: true, anchors, owner: Uint32Array.from(owner) });
    return g;
  }
  if (P.form === 'stem') {
    // upright stems, leaf pairs crossing at each node, the top ones smaller and more upright
    const n = Math.round(between(r, P.n)), nodes = P.nodes ?? 20;
    for (let s = 0; s < n; s++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * Wc * P.spread / 2, b = V(Math.cos(a) * d, 0, Math.sin(a) * d);
      const top = h * (0.75 + 0.25 * r()), lean = V((r() - 0.5) * Wc * 0.4, 0, (r() - 0.5) * Wc * 0.4);
      const sb = bend(), side = V(-cz, 0, cx);
      const at = (t: number) => b.clone().addScaledVector(lean, t * t).add(V(cx, 0, cz).multiplyScalar(sb.k * top * 0.45 * t * t))
        .addScaledVector(side, sb.wob * top * 0.15 * Math.sin(t * Math.PI * 1.3 + sb.ph) * t).setY(top * t);
      extra.push(tube([0, 0.2, 0.4, 0.6, 0.8, 1].map(at), Math.max(0.8, h * 0.006), P.stalk));
      let rot = r() * 6.28;
      for (let i = 1; i <= nodes; i++) {
        const t = (i + r() * 0.4) / (nodes + 0.4), up = 1 - t, L = h * between(r, f.len) * (1 - 0.6 * t ** 2);
        rot += Math.PI / 2 + (r() - 0.5) * 0.4;
        const tc = P.top && t > P.top.from ? P.top.cols[Math.floor(r() * P.top.cols.length)] : null;
        const rise = lerp(f.rise[0], f.rise[1], up ** 0.5) * (0.85 + r() * 0.3), cols = tc ?? pick(), br = bright();
        for (const o of [0, Math.PI]) leaf(out, f, P.stalk, at(t), rot + o, L, rise, twist(), cols, br, r, bend(0.4));
      }
    }
  } else {
    // rosette: leaves from the crown(s), outer ones longer and spreading; rhizome: along a creeping root
    const n = Math.round(between(r, P.n)), crowns = Math.round(between(r, P.crowns ?? [1, 1])), rz = P.form === 'rhizome';
    const half = Wc * P.spread / 2, roots: THREE.Vector3[] = [];
    if (rz) {
      const yaw = (r() - 0.5) * 0.6, dz = Math.sin(yaw) * half;
      for (let i = 0; i <= 4; i++) { const t = i / 4 * 2 - 1; roots.push(V(t * half * Math.cos(yaw), h * 0.012 + (r() - 0.5) * h * 0.01, t * dz + (r() - 0.5) * half * 0.15)); }
      extra.push(tube(roots, Math.max(1.5, h * 0.02), P.stalk));
    }
    const centres = Array.from({ length: crowns }, (_, i) => V(crowns > 1 ? (i / (crowns - 1) * 2 - 1) * half + (r() - 0.5) * half * 0.3 : 0, 0, (r() - 0.5) * half * 0.4));
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1), outer = rz ? r() : 1 - t;
      let base: THREE.Vector3, yaw: number;
      if (rz) { const u = r(), k = Math.min(3, Math.floor(u * 4)); base = roots[k].clone().lerp(roots[k + 1], u * 4 - k); yaw = r() * 6.28; }
      else { base = centres[i % crowns].clone().add(V((r() - 0.5) * h * 0.02, 0, (r() - 0.5) * h * 0.02)); yaw = i * 2.39996 + r() * 0.5; }
      const L = h * between(r, f.len) * (rz ? 1 : 0.75 + 0.25 * outer), rise = lerp(f.rise[0], f.rise[1], outer) * (0.85 + r() * 0.3);
      leaf(out, f, P.stalk, base, yaw, L, rise, twist(), pick(), bright(), r, bend(L / h));
    }
  }
  // scale to the height asked for (the leaves' arch makes their reach less than their length), shade the leaves while
  // they are still one smooth sheet each, then merge with the stalks
  const leaves = out.geometry(), parts = [leaves, ...extra];
  const top = Math.max(...parts.map(g => { g.computeBoundingBox(); return g.boundingBox!.max.y; })), k = h / Math.max(1, top);
  // a plant whose leaves reach out wider than its card is drawn narrower (at most by a quarter), so it fits where the card did
  const reach = Math.max(...parts.map(g => Math.max(-g.boundingBox!.min.x, g.boundingBox!.max.x, -g.boundingBox!.min.z, g.boundingBox!.max.z))) * k;
  const kx = Math.max(0.75, Math.min(1, Wc * 0.6 / Math.max(1, reach)));
  for (const g of parts) g.scale(k * kx, k, k * kx);
  shade(leaves, h, Wc / 2);
  const g = mergeGeometries(parts)!;
  g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.keep = true;
  return g;
}

/**
 * A carpet (from plantGeometry) set on the ground: each leaflet moves with its anchor as spot() moves it (in from the
 * glass, up or down with the ground); spot() = null leaves that leaflet out. Shares colours, normals and triangles.
 */
export function carpetOnGround(base: THREE.BufferGeometry, spot: Spot) {
  const { anchors, owner } = base.userData as { anchors: Float32Array; owner: Uint32Array }, n = anchors.length / 2;
  const off = new Float32Array(n * 3), gone = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = anchors[i * 2], z = anchors[i * 2 + 1], p = spot(x, z);
    if (!p) gone[i] = 1; else { off[i * 3] = p.x - x; off[i * 3 + 1] = p.y; off[i * 3 + 2] = p.z - z; }
  }
  const src = base.attributes.position, pos = new Float32Array(src.count * 3);
  for (let v = 0; v < src.count; v++) {
    const i = owner[v];
    if (gone[i]) continue; // a dropped leaflet collapses to the origin, under the ground
    pos[v * 3] = src.getX(v) + off[i * 3]; pos[v * 3 + 1] = src.getY(v) + off[i * 3 + 1]; pos[v * 3 + 2] = src.getZ(v) + off[i * 3 + 2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  for (const k of ['color', 'normal']) g.setAttribute(k, base.attributes[k]);
  g.setIndex(base.index);
  g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.keep = true;
  return g;
}
