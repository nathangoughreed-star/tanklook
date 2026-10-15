// 3D plants: one generator for every species, driven by `PLANT3D` in art/plants.ts. A leaf is a curved sheet along a
// centreline (rise from the vertical, arch toward the ground by the tip, twist about the midrib, a cupped or ridged
// cross-section, rippled edges), built twice so the upper side and the paler underside each face their own way.
// Leaves are set out by the plant's form: a rosette from one crown, a creeping rhizome, upright stems with leaf
// pairs, or a carpet of leaflets. Colour is per vertex (edge to midrib, tip tint, underside) with the form shading
// baked in (leaves facing up lighter, the inside and the base of the plant darker); the water lighting (aqPatch)
// then lights it as it lights the cards. Base at y = 0, height = the item's size (carpet: width = size).
//
// Growth (lane GR1, 2026-10-15): the plant is built once at full growth. The plant as it was before growth existed
// (the same random draws, so every saved plant keeps its look) is the part shown at its own growth `g0`; below that
// its leaves and stems shrink away and thin out, above it extra leaves, stems, side shoots, crowns or leaflets (their
// own random stream) come in. revealPlant() shows it at a growth (positions only), bendPlant() lays whatever is longer
// than the water above it over along the surface.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { PLANT_ASPECT, PLANT3D, growthLen, growthOf, type Leaf3D, type PlantType } from '../art/plants';
import { CARPET_H, MAX_STEMS } from '../scene/items';
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

/**
 * Growth tags: every vertex shows from growth `a` (hidden below), full from `a + w`, in between pulled toward its
 * anchor `anc` (a leaf's base: it grows in; or its own point on the midrib / stem: it gets longer). `pc` = the piece it
 * rides on (a leaf or stem whose centreline can lie over at the surface; -1 = none), `par` = where along that piece
 * (index into its centreline), `apar` = the anchor's place on it.
 */
interface Tag { a: number; w: number; anc: THREE.Vector3; pc: number; par: number; apar: number }
const TAGS = ['anc', 'gr', 'pc', 'par', 'apar'] as const;
/** Points along a stem's centreline (where it can bend over at the surface). */
const SEG = 40;
/** A leaf's growth: appears at `a`, full at `a + w`; `ext` = grows longer from its base (straps) instead of growing in;
 *  `on` = rides on a stem (its piece, its place there) instead of being a piece of its own. */
interface LeafTag { a: number; w: number; ext?: boolean; on?: { pc: number; par: number } }
const SHOWN: LeafTag = { a: -1, w: 1e-3 };
/** Shown from a, full by `by`: w cut so a + w stays at or under `by` (a plant's own part is full at its own growth). */
const fullBy = (a: number, w: number, by: number) => { a = Math.min(a, by - 0.005); return { a, w: Math.max(1e-4, Math.min(w, (by - a) * 0.999)) }; };

/** Vertices of one plant before merging: positions, base colours, triangles, growth tags. */
class Sheets {
  pos: number[] = []; col: number[] = []; idx: number[] = [];
  anc: number[] = []; gr: number[] = []; pc: number[] = []; par: number[] = []; apar: number[] = [];
  constructor(public pieces: number[][]) {}
  /** A grid of rows x cols points (row-major), with the base colour per point; front = as given, back = reversed. */
  grid(p: THREE.Vector3[], c: THREE.Color[], rows: number, cols: number, back: THREE.Color[] | undefined, tg: Tag[]) {
    for (const side of back ? [0, 1] : [0]) {
      const o = this.pos.length / 3;
      p.forEach((v, i) => {
        const k = side ? back![i] : c[i], t = tg[i];
        this.pos.push(v.x, v.y, v.z); this.col.push(k.r, k.g, k.b);
        this.anc.push(t.anc.x, t.anc.y, t.anc.z); this.gr.push(t.a, t.w); this.pc.push(t.pc); this.par.push(t.par); this.apar.push(t.apar);
      });
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
    setTags(g, this.anc, this.gr, this.pc, this.par, this.apar);
    return g;
  }
}
function setTags(g: THREE.BufferGeometry, anc: ArrayLike<number>, gr: ArrayLike<number>, pc: ArrayLike<number>, par: ArrayLike<number>, apar: ArrayLike<number>) {
  g.setAttribute('anc', new THREE.Float32BufferAttribute(anc as number[], 3));
  g.setAttribute('gr', new THREE.Float32BufferAttribute(gr as number[], 2));
  g.setAttribute('pc', new THREE.Float32BufferAttribute(pc as number[], 1));
  g.setAttribute('par', new THREE.Float32BufferAttribute(par as number[], 1));
  g.setAttribute('apar', new THREE.Float32BufferAttribute(apar as number[], 1));
}
/** Every vertex of g gets the tag fn(vertex index) gives. */
function tagEach(g: THREE.BufferGeometry, fn: (i: number) => Tag) {
  const n = g.attributes.position.count, anc = new Float32Array(n * 3), gr = new Float32Array(n * 2), pc = new Float32Array(n), par = new Float32Array(n), apar = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = fn(i);
    anc[i * 3] = t.anc.x; anc[i * 3 + 1] = t.anc.y; anc[i * 3 + 2] = t.anc.z; gr[i * 2] = t.a; gr[i * 2 + 1] = t.w; pc[i] = t.pc; par[i] = t.par; apar[i] = t.apar;
  }
  setTags(g, anc, gr, pc, par, apar);
  return g;
}
const tagAll = (g: THREE.BufferGeometry, a: number, w: number, anc: THREE.Vector3) => tagEach(g, () => ({ a, w, anc, pc: -1, par: 0, apar: 0 }));

/** How a leaf gives to the water: leans `k` toward the current (cx, cz) by the tip, plus an S-wobble of `wob` sideways. */
interface Bend { cx: number; cz: number; k: number; wob: number; ph: number }
const STIFF: Bend = { cx: 0, cz: 0, k: 0, wob: 0, ph: 0 };

/**
 * One leaf from `base`, heading `yaw` (0 = +x, toward the viewer = +pi/2), length L. `rise` / `arch` / `twist` / `bright`
 * are this leaf's draws; the colour pair is picked by the caller. `tag` = when it grows. Returns the blade's tip.
 */
function leaf(out: Sheets, f: Leaf3D, stalkCol: string, base: THREE.Vector3, yaw: number, L: number, rise: number, twist: number, cols: [string, string], bright: number, r: R, bend: Bend = STIFF, tag: LeafTag = SHOWN) {
  // across the blade: evenly spaced, plus two columns hugging the middle when there is a midrib line
  const us = Array.from({ length: f.seg[1] }, (_, j) => (j / (f.seg[1] - 1)) * 2 - 1);
  if (f.rib) us.splice(us.length >> 1, 1, -0.07, 0, 0.07);
  // rows: a few up the bare stalk (a narrow strip in the stalk colour), then the blade
  const NS = f.seg[0], NP = f.pet > 0 ? 3 : 0, NC = us.length, rows = NP + NS + 1, W = L * f.wid, SW = Math.max(0.6, W * 0.07);
  const rib = f.rib ? new THREE.Color(f.rib) : null, stalk = new THREE.Color(stalkCol), pts: THREE.Vector3[] = [], cs: THREE.Color[] = [], bs: THREE.Color[] = [];
  const edge = new THREE.Color(cols[0]), mid = new THREE.Color(cols[1]), under = new THREE.Color(f.under), tip = f.tip ? new THREE.Color(f.tip[0]) : null;
  const hx = Math.cos(yaw), hz = Math.sin(yaw), ph = r() * 6.28;
  // spots (optional): soft round blobs at (along, across), round on the leaf itself (across scaled by the width)
  const spot = f.spots ? new THREE.Color(f.spots.col) : null, blobs = f.spots ? Array.from({ length: Math.round(between(r, f.spots.n)) }, () => [0.08 + r() * 0.85, (r() - 0.5) * 1.6, 0.6 + r() * 0.4]) : [];
  const spotAt = (s: number, u: number) => {
    let k = 0;
    for (const [s0, u0, a] of blobs) k += a * Math.exp(-(((s - s0) / f.spots!.r) ** 2 + ((u - u0) * f.wid / 2 / f.spots!.r) ** 2));
    return Math.min(1, k);
  };
  const dir = (t: number) => {
    const a = rise + f.arch * t ** 1.5, w = bend.wob * Math.sin(t * Math.PI * 1.6 + bend.ph) * t;
    return V(Math.sin(a) * hx + bend.cx * bend.k * t ** 1.5 - hz * w, Math.cos(a), Math.sin(a) * hz + bend.cz * bend.k * t ** 1.5 + hx * w).normalize();
  };
  const c = base.clone(), line: number[] = [], tg: Tag[] = [], own = tag.on ? -1 : out.pieces.length, b0 = base.clone();
  // a strap gets longer: each row shows once the leaf has grown past it, the last stretch tapering in as it comes
  const e = Math.max(1e-4, tag.w * 0.15);
  let tPrev = 0;
  for (let i = 0; i < rows; i++) {
    const blade = i >= NP, s = blade ? (i - NP) / NS : 0, t = blade ? f.pet + (1 - f.pet) * s : f.pet * i / NP;
    for (let q = 0; q < 3; q++) c.addScaledVector(dir(tPrev + (t - tPrev) * (q + 0.5) / 3), L * (t - tPrev) / 3); // walk the centreline
    tPrev = t;
    line.push(c.x, c.y, c.z);
    const rowTag: Tag = tag.on ? { a: tag.a, w: tag.w, anc: b0, pc: tag.on.pc, par: tag.on.par, apar: tag.on.par }
      : tag.ext ? { a: tag.a + (tag.w - e) * t, w: e, anc: c.clone(), pc: own, par: i, apar: i }
        : { a: tag.a, w: tag.w, anc: b0, pc: own, par: i, apar: 0 };
    const d = dir(t);
    // across the blade: horizontal and square to the heading, turned about the midrib by the twist
    const side0 = V(-hz, 0, hx), side = side0.addScaledVector(d, -side0.dot(d)).normalize().applyAxisAngle(d, twist * s), up = new THREE.Vector3().crossVectors(side, d).normalize();
    const w = !blade ? SW : s >= 1 ? 0 : Math.max(NP ? SW : 0, W * Math.sin(Math.PI * Math.max(1e-3, s) ** f.prof[0]) ** f.prof[1]);
    for (let j = 0; j < NC; j++) {
      const u = us[j];
      const lift = blade ? f.fold * u * u * w / 2 + f.wave[0] * W * Math.abs(u) * Math.sin(s * Math.PI * f.wave[1] + ph + u) : 0;
      pts.push(c.clone().addScaledVector(side, u * w / 2).addScaledVector(up, lift));
      tg.push(rowTag);
      const k = blade ? edge.clone().lerp(mid, (1 - Math.abs(u)) ** 1.5) : stalk.clone();
      if (blade && rib && u === 0 && s > 0.02 && s < 0.9) k.lerp(rib, 0.55);
      if (blade && tip && s > 1 - f.tip![1]) k.lerp(tip, ((s - 1 + f.tip![1]) / f.tip![1]) ** 1.5);
      if (blade && spot) k.lerp(spot, 0.85 * spotAt(s, u));
      cs.push(k.multiplyScalar(bright)); bs.push(blade ? under.clone().lerp(k, 0.3).multiplyScalar(bright) : k);
    }
  }
  if (!tag.on) out.pieces.push(line);
  out.grid(pts, cs, rows, NC, bs, tg);
  return c;
}

/** A stalk or rhizome: a tapered tube through the points, flat colour; `ring(s, centre)` tags each ring (s = 0 base .. 1
 *  tip), else it is always shown. */
function tube(pts: THREE.Vector3[], r: number, col: string, N = Math.max(4, pts.length * 2), R = 4, ring?: (s: number, centre: THREE.Vector3) => Tag) {
  const curve = new THREE.CatmullRomCurve3(pts), g = taperTube(curve, r, N, R);
  const k = new THREE.Color(col), a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) { a[i] = k.r; a[i + 1] = k.g; a[i + 2] = k.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.deleteAttribute('uv');
  const tags = new Map<number, Tag>();
  return tagEach(g, i => {
    const j = Math.floor(i / (R + 1));
    let t = tags.get(j);
    if (!t) { const s = j / N; t = ring ? ring(s, curve.getPoint(s)) : { a: -1, w: 1e-3, anc: pts[0], pc: -1, par: 0, apar: 0 }; tags.set(j, t); }
    return t;
  });
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

/** One plant's colour cast: brighter or darker by k, warmer (yellower, + warm) or cooler (bluer, - warm). */
function tint(g: THREE.BufferGeometry, k: number, warm: number) {
  const c = g.attributes.color, m = [k * (1 + warm), k * (1 + warm / 2), k * (1 - warm)];
  for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * m[0], c.getY(i) * m[1], c.getZ(i) * m[2]);
}

/** A clump's own spread (mm across the circle its stems or crowns start in) and count; absent = the species' own, drawn
 *  from the seed (Nathan 2026-10-14: "5 stems over 12 inches" or "10 stems in 4 inches"). */
export interface Clump { spread?: number; stems?: number }

/** The spread and count a clump has when it has none of its own: the seed's draws, as plantGeometry makes them. */
export function clumpAuto(type: PlantType, seed: number, h: number) {
  const P = PLANT3D[type], r = rng(seed * 7919 + 13);
  if (!P) return { spread: h / PLANT_ASPECT[type], stems: 1 };
  const n0 = Math.round(between(r, P.n)), c0 = Math.round(between(r, P.crowns ?? [1, 1]));
  return { spread: Math.round(h / PLANT_ASPECT[type] * P.spread), stems: P.form === 'stem' ? n0 : c0 };
}

/** What the growth tags need besides the vertices: the pieces' centrelines and the plant's current. */
export interface GrowData {
  anc: Float32Array; gr: Float32Array; pc: Float32Array; par: Float32Array; apar: Float32Array;
  pieces: Float32Array[]; cx: number; cz: number; sway: number;
  /** Pieces that start on another one (a side shoot on its stem): [piece, parent piece, place on the parent]. */
  links: number[][];
}
/** Move the tag attributes into userData.grow (CPU only: they never go to the GPU). */
function keepTags(g: THREE.BufferGeometry, pieces: number[][], cx: number, cz: number, sway: number, links: number[][]) {
  const A = (k: string) => (g.attributes[k].array as Float32Array);
  const G: GrowData = { anc: A('anc'), gr: A('gr'), pc: A('pc'), par: A('par'), apar: A('apar'), pieces: pieces.map(p => Float32Array.from(p)), cx, cz, sway, links };
  for (const k of TAGS) g.deleteAttribute(k);
  g.userData.grow = G;
}
/** Scale a part and its anchors (BufferGeometry.scale moves positions and normals only). */
function scalePart(g: THREE.BufferGeometry, sx: number, sy: number, sz: number) {
  g.scale(sx, sy, sz);
  const a = g.attributes.anc;
  for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) * sx, a.getY(i) * sy, a.getZ(i) * sz);
}

/**
 * The plant's geometry at full growth, base at y = 0; the part shown at growth `g0` (default: the growth whose size is h)
 * is the plant as built before growth existed, its tallest point at h. A carpet is a patch h wide on flat ground, built
 * once per (seed, size); carpetOnGround() then sets each leaflet on the ground under it (cheap, so it can run every drag
 * step). revealPlant() shows it at a growth. `more` = false leaves out everything past g0 (a plant nobody has grown: a
 * starter set or an older file costs what it did before growth). `size` = its saved size when h is less (capped under the
 * lid): what grows past g0 is sized from that.
 */
export function plantGeometry(type: PlantType, seed: number, h: number, clump: Clump = {}, g0 = growthOf(type, h), more = true, size = h) {
  const P = PLANT3D[type]!, r = rng(seed * 7919 + 13), pieces: number[][] = [], links: number[][] = [], out = new Sheets(pieces), extra: THREE.BufferGeometry[] = [];
  // growth beyond the plant's own part: its own random stream, drawn after everything else, so the part stays as it was
  const re = rng(seed * 6007 + 29), ex = new Sheets(pieces), exTubes: THREE.BufferGeometry[] = [];
  const Gr = P.grow, lg = Math.log(Math.max(1.0001, Gr.more)), size0 = growthLen(type, g0);
  /** Growth at which the i-th of the n0 own leaves / stems shows (they thin out below g0 at the species' rate). */
  const own = (i: number, n0: number) => Math.max(-0.3, g0 + Math.log((i + 1) / n0) / lg);
  /** Extra ones past n0: how many by growth 1, and when the j-th comes in. */
  const extras = (n0: number, cap: number) => !more ? 0 : Math.max(0, Math.min(cap, Math.round(n0 * Gr.more ** (1 - g0))) - n0);
  const extraAt = (j: number, n0: number) => Math.min(0.97, Math.max(g0 + 0.04, g0 + Math.log((n0 + j + 1) / n0) / lg));
  /** How much longer than the plant's own part something that grows in at growth a is. */
  const longer = (a: number) => growthLen(type, Math.min(1, a)) / size0 * size / h;
  // this plant's own build: leaf width, length, rise, droop, stalk thickness, leaf pairs and tint drawn round the
  // species' values (a triangular spread, most plants near the middle; own random stream, so the layout stays)
  const rt = rng(seed * 7907 + 3), tri = (a: number) => 1 + a * (rt() + rt() - 1);
  const kRise = tri(0.2), kStalk = tri(0.25), kNodes = tri(0.15), kTint = tri(0.06), warm = (rt() - 0.5) * 0.16, f: Leaf3D = { ...P.leaf,
    wid: P.leaf.wid * tri(0.18), len: P.leaf.len.map(v => v * tri(0.12)) as [number, number], rise: P.leaf.rise.map(v => v * kRise) as [number, number], arch: P.leaf.arch * tri(0.3) };
  const Wc = h / PLANT_ASPECT[type];
  const draws = (q: R) => ({ pick: () => f.cols[Math.floor(q() * f.cols.length)], twist: () => (q() - 0.5) * 2 * f.twist, bright: () => 0.9 + q() * 0.2 });
  const { pick, twist, bright } = draws(r), X = draws(re);
  // the water's give: one current direction for the whole plant (mostly along the tank, as a filter's flow runs), each
  // leaf leaning into it by its own amount, longer leaves more (own random stream: the leaf layout stays as it was)
  const rs = rng(seed * 104729 + 71), cur = (rs() < 0.5 ? 0 : Math.PI) + (rs() - 0.5) * 1.2, cx = Math.cos(cur), cz = Math.sin(cur);
  // how much current reaches this plant: anywhere from none (straight up) to a strong lean, all equally likely
  // (Nathan 2026-10-14: the red stems all bent about the same)
  const sway = plant3d.sway ? P.sway * 1.3 * rng(seed * 15485863 + 5)() : 0;
  const bend = (len = 1): Bend => ({ cx, cz, k: sway * (0.5 + rs()) * len, wob: sway * 0.5 * (rs() - 0.5) * 2 * len, ph: rs() * 6.28 });
  const done = (g: THREE.BufferGeometry) => { g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.keep = true; keepTags(g, pieces, cx, cz, sway, links); return g; };
  if (P.form === 'carpet' || P.form === 'float') {
    // a patch grows wider: a leaflet (rosette) at `rho` of the way to the patch's own edge shows once the patch has grown
    // that wide; past the edge, more of them out to the width at growth 1
    const reach = (rho: number) => g0 + Math.log(Math.max(0.02, rho)) / Math.log(Gr.len[1] / Gr.len[0]);
    const grown = more ? Math.max(1, Gr.len[1] / size0) : 1, rad = h / 2;
    if (P.form === 'carpet') {
      // leaflets over a disc with a ragged edge, lower toward it; past MAX_LEAFLETS a big patch gets bigger leaflets instead of more
      const want = Math.PI * rad * rad / 1000 * between(r, P.n), n = Math.round(Math.min(want, MAX_LEAFLETS)), grow = Math.sqrt(want / n), lobes = [r() * 6.28, r() * 6.28, r() * 6.28];
      const edgeAt = (a: number) => rad * (0.82 + 0.06 * Math.sin(3 * a + lobes[0]) + 0.05 * Math.sin(5 * a + lobes[1]) + 0.04 * Math.sin(8 * a + lobes[2]));
      const anchors: number[] = [], owner: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, edge = edgeAt(a);
        const d = Math.sqrt(r()) * edge, x = Math.cos(a) * d, z = Math.sin(a) * d, k = 1 - (d / edge) ** 3;
        const y = CARPET_H * k * (0.35 + 0.65 * r() ** 0.7), L = between(r, f.len) * grow, v0 = out.pos.length / 3;
        const t = reach(d / edge);
        leaf(out, f, P.stalk, V(x, Math.max(0, y - L * 0.5), z), r() * 6.28, L, between(r, f.rise), twist(), pick(), bright() * (0.8 + 0.2 * k), r, bend(0.5), { ...fullBy(t - 0.04, 0.04, g0), on: { pc: -1, par: 0 } });
        anchors.push(x, z);
        for (let v = v0; v < out.pos.length / 3; v++) owner.push(i);
      }
      // more leaflets out to the patch at growth 1 (same density, a ring round the patch)
      const wantX = Math.PI * rad * rad * (grown * grown - 1) / 1000 * between(re, P.n), m = Math.round(Math.min(wantX, MAX_LEAFLETS)), growX = Math.sqrt(Math.max(1, wantX / Math.max(1, m)));
      for (let i = 0; i < m; i++) {
        const a = re() * Math.PI * 2, edge = edgeAt(a), rho = Math.sqrt(1 + re() * (grown * grown - 1)), d = rho * edge, x = Math.cos(a) * d, z = Math.sin(a) * d;
        const k = Math.max(0.15, 1 - (rho / grown) ** 3) * 0.7, y = CARPET_H * k * (0.35 + 0.65 * re() ** 0.7), L = between(re, f.len) * growX, v0 = out.pos.length / 3;
        leaf(out, f, P.stalk, V(x, Math.max(0, y - L * 0.5), z), re() * 6.28, L, between(re, f.rise), X.twist(), X.pick(), X.bright() * (0.8 + 0.2 * k), re, bend(0.5), { ...fullBy(Math.max(g0 + 1e-3, reach(rho) - 0.04), 0.04, 1), on: { pc: -1, par: 0 } });
        anchors.push(x, z);
        for (let v = v0; v < out.pos.length / 3; v++) owner.push(n + i);
      }
      const g = out.geometry();
      shade(g, CARPET_H, 1e9);
      tint(g, kTint, warm);
      Object.assign(g.userData, { anchors: Float32Array.from(anchors), owner: Uint32Array.from(owner) });
      return done(g);
    }
    // y = 0 is the water surface: rosettes lie on it over a disc h wide (salvinia-like chains are rosettes too, just
    // more oval leaves), roots hang under each one
    const F = P.float!, n = Math.round(Math.min(600, Math.PI * rad * rad / 1000 * between(r, F.per)));
    const rosette = (q: R, D: ReturnType<typeof draws>, c: THREE.Vector3, t: { a: number; w: number }, into: THREE.BufferGeometry[]) => {
      const k = Math.round(between(q, F.leaves)), y0 = q() * 6.28, on = { ...t, on: { pc: -1, par: 0 } };
      for (let j = 0; j < k; j++) leaf(out, f, P.stalk, c, y0 + j * 6.28 / k + (q() - 0.5) * 0.4, between(q, f.len), between(q, f.rise), D.twist(), D.pick(), D.bright(), q, STIFF, on);
      for (let j = 0, m = Math.round(between(q, F.roots)); j < m; j++) {
        // a thin root that wanders a little on the way down
        const L = between(q, F.rootLen), dx = (q() - 0.5) * L * 0.5, dz = (q() - 0.5) * L * 0.5, wx = (q() - 0.5) * L * 0.15, wz = (q() - 0.5) * L * 0.15;
        into.push(tagAll(tube([0, 0.25, 0.5, 0.75, 1].map(s => V(c.x + dx * s * s + wx * Math.sin(s * 6), -L * s, c.z + dz * s * s + wz * Math.sin(s * 5))), 0.25, P.stalk, 6, 3), t.a, t.w, c));
      }
    };
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, rho = Math.sqrt(r()), d = rho * rad * 0.92, c = V(Math.cos(a) * d, 0.6, Math.sin(a) * d);
      rosette(r, { pick, twist, bright }, c, fullBy(reach(rho) - 0.05, 0.05, g0), extra);
    }
    // more rosettes out to the patch at growth 1
    const m = Math.round(Math.min(400, Math.PI * rad * rad * (grown * grown - 1) / 1000 * between(re, F.per)));
    for (let i = 0; i < m; i++) {
      const a = re() * 6.28, rho = Math.sqrt(1 + re() * (grown * grown - 1)), d = rho * rad * 0.92, c = V(Math.cos(a) * d, 0.6, Math.sin(a) * d);
      rosette(re, X, c, fullBy(Math.max(g0 + 1e-3, reach(rho) - 0.05), 0.05, 1), exTubes);
    }
    const leaves = out.geometry();
    shade(leaves, 2, 1e9);
    tint(leaves, kTint, warm);
    return done(mergeGeometries([leaves, ...extra.map(e => { e.computeVertexNormals(); return e; }), ...exTubes.map(e => { e.computeVertexNormals(); return e; })])!);
  }
  if (P.form === 'stem') {
    // upright stems, leaf pairs crossing at each node, the top ones smaller and more upright
    const n0 = Math.round(between(r, P.n)), n = clump.stems ? Math.min(MAX_STEMS, Math.round(clump.stems)) : n0, nodes = Math.round((P.nodes ?? 20) * kNodes);
    const base = clump.spread ? clump.spread / 2 : Wc * P.spread / 2, rad = Math.max(0.8, h * 0.006 * kStalk), e = 0.03;
    /**
     * One stem along at(t) (t = 0 base .. 1 top) with `nn` leaf pairs; T(t) = the growth at which it has grown up to t
     * (a stem gets longer from its base); its leaves grow in from there (the newest, at the tip, still small), full by
     * `by`. q / D: the random stream for its leaves.
     */
    const stem = (at: (t: number) => THREE.Vector3, nn: number, T: (t: number) => number, by: number, q: R, D: ReturnType<typeof draws>, into: Sheets, tubes: THREE.BufferGeometry[], r0 = rad, rings?: number, on?: { pc: number; par: number }) => {
      const pc = pieces.length, line: number[] = [];
      if (on) links.push([pc, on.pc, on.par]);
      for (let j = 0; j <= SEG; j++) { const p = at(j / SEG); line.push(p.x, p.y, p.z); }
      pieces.push(line);
      tubes.push(tube([0, 0.2, 0.4, 0.6, 0.8, 1].map(at), r0, P.stalk, rings, undefined, (s, c) => ({ ...fullBy(T(s) - e, e, by), anc: c, pc, par: s * SEG, apar: s * SEG })));
      let rot = q() * 6.28;
      for (let i = 1; i <= nn; i++) {
        const t = (i + q() * 0.4) / (nn + 0.4), up = 1 - t, L = h * between(q, f.len) * (1 - 0.6 * t ** 2);
        rot += Math.PI / 2 + (q() - 0.5) * 0.4;
        const tc = P.top && t > P.top.from ? P.top.cols[Math.floor(q() * P.top.cols.length)] : null;
        const rise = lerp(f.rise[0], f.rise[1], up ** 0.5) * (0.85 + q() * 0.3), cols = tc ?? D.pick(), br = D.bright();
        const tag: LeafTag = { ...fullBy(T(t) - e, e + 0.1, by), on: { pc, par: t * SEG } };
        for (const o of [0, Math.PI]) leaf(into, f, P.stalk, at(t), rot + o, L, rise, D.twist(), cols, br, q, bend(0.4), tag);
      }
      return pc;
    };
    /** A stem's path: from b, leaning by `lean` by the top and into the current. */
    const path = (b: THREE.Vector3, top: number, lean: THREE.Vector3, sb: Bend, out0 = V(0, 0, 0)) => {
      const side = V(-cz, 0, cx);
      return (t: number) => b.clone().addScaledVector(lean, t * t).addScaledVector(out0, Math.sqrt(t)).add(V(cx, 0, cz).multiplyScalar(sb.k * top * 0.45 * t * t))
        .addScaledVector(side, sb.wob * top * 0.15 * Math.sin(t * Math.PI * 1.3 + sb.ph) * t).setY(b.y + top * t);
    };
    // the plant's own stems: a cutting (the lower third) shows from when the stem comes in, the rest grows up by g0
    const CUT = 0.35, own0: { at: (t: number) => THREE.Vector3; top: number; T: (t: number) => number; pc: number }[] = [];
    for (let s = 0; s < n; s++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * base, b = V(Math.cos(a) * d, 0, Math.sin(a) * d);
      const top = h * (0.75 + 0.25 * r()), lean = V((r() - 0.5) * Wc * 0.4, 0, (r() - 0.5) * Wc * 0.4);
      // (a stem comes in as a cutting no earlier than growth 0: just planted = a few short cuttings)
      const at = path(b, top, lean, bend()), a0 = Math.min(Math.max(-0.02, own(s, n)), g0 - 0.06);
      const T = (t: number) => t <= CUT ? a0 : a0 + (t - CUT) / (1 - CUT) * (g0 - 0.02 - a0);
      own0.push({ at, top, T, pc: stem(at, nodes, T, g0, r, { pick, twist, bright }, out, extra) });
    }
    // more stems come up in the clump (a little wider as it grows, unless it has its own spread) and grow taller;
    // and side shoots off every stem, from low on it, curving up beside it
    const all = [...own0];
    for (let j = 0, m = Math.min(extras(n, 60), 60 - n); j < m; j++) {
      const a0 = extraAt(j, n), up = Math.min(0.25, 0.99 - a0), k = longer(a0 + up), a = re() * 6.28, d = Math.sqrt(re()) * base * (clump.spread ? 1 : 1 + 0.4 * (a0 - g0) / Math.max(0.05, 1 - g0));
      const b = V(Math.cos(a) * d, 0, Math.sin(a) * d), top = h * (0.75 + 0.25 * re()) * k, lean = V((re() - 0.5) * Wc * 0.4, 0, (re() - 0.5) * Wc * 0.4);
      // a new stem grows to its full length within a quarter of the growth scale (stem plants grow fast)
      const at = path(b, top, lean, bend()), T = (t: number) => a0 + t * up;
      all.push({ at, top, T, pc: stem(at, Math.round(nodes * Math.min(2, k)), T, 1, re, X, ex, exTubes, rad, Math.round(12 * Math.min(3, k))) }); // more rings: smooth where it lies over
    }
    if (more && g0 < 0.95) for (const p of all) for (let i = 0, k = Math.floor((Gr.shoots ?? 0) * (0.5 + re())); i < k; i++) {
      const tb = 0.15 + re() * 0.45, a0 = Math.max(p.T(tb) + 0.03, g0 + 0.04, g0 + (1 - g0) * (0.15 + 0.75 * re()));
      if (a0 > 0.95) continue;
      const up = Math.min(0.25, 0.99 - a0), len = p.top * (1 - tb) * (0.6 + 0.5 * re()) * longer(a0 + up) / longer(g0), yaw = re() * 6.28;
      const at = path(p.at(tb), len, V((re() - 0.5) * Wc * 0.3, 0, (re() - 0.5) * Wc * 0.3), bend(), V(Math.cos(yaw), 0, Math.sin(yaw)).multiplyScalar(Math.min(len * 0.25, Wc * 0.3)));
      stem(at, Math.max(3, Math.round(nodes * Math.min(1.5, len / Math.max(1, p.top)))), t => a0 + t * up, 1, re, X, ex, exTubes, rad * 0.7, Math.round(12 * Math.min(3, Math.max(1, len / h))), { pc: p.pc, par: tb * SEG }); // rides on its stem
    }
  } else if (P.form === 'moss') {
    // a ragged dome (radius = half the card width, height h) over a dark core; fronds all over it, pointing outward
    // along the dome's normal plus a scatter, the ones round the rim drooping over the edge. Growth: the clump is smaller
    // below g0 (down to under half), denser above it
    const R = Wc / 2, lump = [r() * 6.28, r() * 6.28, 0.6 + r() * 0.3], area = Math.PI * R * R;
    const rim = (a: number) => R * (0.85 + 0.09 * Math.sin(3 * a + lump[0]) + 0.06 * Math.sin(5 * a + lump[1]));
    const domeY = (d: number, a: number) => h * Math.sqrt(Math.max(0, 1 - d * d)) * (lump[2] + (1 - lump[2]) * (0.5 + 0.5 * Math.sin(2 * a + lump[1])));
    const O = V(0, 0, 0), small: LeafTag = g0 < 0.02 ? SHOWN : { a: -0.82 * g0, w: 1.82 * g0 * 0.999 }, oTag = { ...small, on: { pc: -1, par: 0 } };
    const frond = (q: R, D: ReturnType<typeof draws>, tag: LeafTag, into: Sheets) => {
      const a = q() * 6.28, d = Math.sqrt(q()) * 0.98, e = rim(a), base = V(Math.cos(a) * d * e, domeY(d, a) * 0.9, Math.sin(a) * d * e);
      const nrm = V(Math.cos(a) * d / R, Math.max(0.05, Math.sqrt(1 - d * d)) / h, Math.sin(a) * d / R).normalize();
      const up = Math.acos(Math.min(1, nrm.y)) + (q() - 0.5) * 1.6, yaw = a + (q() - 0.5) * 2.4;
      leaf(into, f, P.stalk, base, yaw, h * between(q, f.len), Math.max(0, up), D.twist(), D.pick(), D.bright() * (0.75 + 0.25 * d), q, bend(0.2), tag);
    };
    const n = Math.round(Math.min(MAX_LEAFLETS, area / 1000 * between(r, P.n)));
    for (let i = 0; i < n; i++) frond(r, { pick, twist, bright }, oTag, out);
    // the clump's own fronds shrink toward the middle below g0 (anchored at the centre, not each frond's base)
    for (let v = 0; v < out.anc.length; v += 3) out.anc[v] = out.anc[v + 1] = out.anc[v + 2] = 0;
    for (let j = 0, m = Math.min(n, extras(n, 2 * n)); j < m; j++) { const a0 = extraAt(j, n); frond(re, X, { ...fullBy(a0, 0.08, 1), on: { pc: -1, par: 0 } }, ex); }
    const core = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    const cp = core.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), z = cp.getZ(i), d = Math.hypot(x, z), a = Math.atan2(z, x), e = rim(a) * 0.92;
      cp.setXYZ(i, x * e, domeY(Math.min(1, d), a) * 0.85, z * e);
    }
    core.deleteAttribute('uv'); core.computeVertexNormals();
    const kc = new THREE.Color(P.stalk), ca = new Float32Array(cp.count * 3);
    for (let i = 0; i < ca.length; i += 3) { ca[i] = kc.r; ca[i + 1] = kc.g; ca[i + 2] = kc.b; }
    core.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    extra.push(tagAll(core, small.a, small.w, O));
  } else {
    // rosette: leaves from the crown(s), outer ones longer and spreading; rhizome: along a creeping root
    const n0 = Math.round(between(r, P.n)), c0 = Math.round(between(r, P.crowns ?? [1, 1])), rz = P.form === 'rhizome';
    // a clump with its own count keeps the species' leaves per crown
    const crowns = P.crowns && clump.stems ? Math.min(MAX_STEMS, Math.round(clump.stems)) : c0, n = Math.min(600, Math.round(n0 * crowns / c0));
    const half = (P.crowns && clump.spread ? clump.spread : Wc * P.spread) / 2, roots: THREE.Vector3[] = [];
    // straps (vallisneria, balansae, sagittaria) grow longer from the crown; broader leaves grow in whole
    const ext = !rz && P.leaf.wid < 0.1;
    if (rz) {
      const yaw = (r() - 0.5) * 0.6, dz = Math.sin(yaw) * half;
      for (let i = 0; i <= 4; i++) { const t = i / 4 * 2 - 1; roots.push(V(t * half * Math.cos(yaw), h * 0.012 + (r() - 0.5) * h * 0.01, t * dz + (r() - 0.5) * half * 0.15)); }
      extra.push(tube(roots, Math.max(1.5, h * 0.02 * kStalk), P.stalk));
    }
    // crowns: along a short row (the species' own look), or spread evenly over the clump's circle when it has its own
    // spread (a sunflower spiral, nudged so it does not read as a pattern)
    const centres = P.crowns && clump.spread
      ? Array.from({ length: crowns }, (_, i) => { const a = i * 2.39996 + (r() - 0.5) * 0.8, d = half * Math.sqrt((i + 0.5) / crowns) * (0.85 + r() * 0.3); return V(Math.cos(a) * d, 0, Math.sin(a) * d); })
      : Array.from({ length: crowns }, (_, i) => V(crowns > 1 ? (i / (crowns - 1) * 2 - 1) * half + (r() - 0.5) * half * 0.3 : 0, 0, (r() - 0.5) * half * 0.4));
    const onRhizome = (q: R) => { const u = q(), k = Math.min(3, Math.floor(u * 4)); return roots[k].clone().lerp(roots[k + 1], u * 4 - k); };
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1), outer = rz ? r() : 1 - t;
      let base: THREE.Vector3, yaw: number;
      if (rz) { base = onRhizome(r); yaw = r() * 6.28; }
      else { base = centres[i % crowns].clone().add(V((r() - 0.5) * h * 0.02, 0, (r() - 0.5) * h * 0.02)); yaw = i * 2.39996 + r() * 0.5; }
      const L = h * between(r, f.len) * (rz ? 1 : 0.75 + 0.25 * outer), rise = lerp(f.rise[0], f.rise[1], outer) * (0.85 + r() * 0.3);
      // below g0 the leaves thin out (the outer, older ones last) and every one is smaller, all full by g0
      const a0 = own(i, n);
      leaf(out, f, P.stalk, base, yaw, L, rise, twist(), pick(), bright(), r, bend(L / h), { ...fullBy(a0, Infinity, g0), ext });
    }
    // more leaves above g0, longer the later they come; a clump also puts out new crowns on runners, further out
    const more = extras(n, 600 - n), newCrowns: { c: THREE.Vector3; a: number }[] = [];
    if (more && P.crowns && g0 < 0.97) for (let k = 0, m = Math.round(crowns * Math.sqrt(Gr.more) ** (1 - g0)) - crowns; k < m; k++) {
      const a0 = g0 + (1 - g0) * (k + 0.5) / m * 0.85, ang = re() * 6.28, d = half * (clump.spread ? Math.sqrt(re()) : 1 + 0.8 * (a0 - g0) / Math.max(0.05, 1 - g0) * (0.6 + 0.4 * re()));
      newCrowns.push({ c: V(Math.cos(ang) * d, 0, Math.sin(ang) * d), a: a0 });
    }
    for (let j = 0; j < more; j++) {
      const a0 = extraAt(j, n), k = longer(a0 + 0.1), outer = re();
      const here = [...centres, ...newCrowns.filter(c => c.a <= a0).map(c => c.c)], c = here[Math.floor(re() * here.length)];
      const base = rz ? onRhizome(re) : c.clone().add(V((re() - 0.5) * h * 0.02, 0, (re() - 0.5) * h * 0.02)), yaw = re() * 6.28;
      const L = h * between(re, f.len) * (rz ? 1 : 0.75 + 0.25 * outer) * k, rise = lerp(f.rise[0], f.rise[1], outer) * (0.85 + re() * 0.3);
      // a longer leaf gets more rows (smooth where it lies over) and its ripples keep their spacing
      // (and a broad leaf widens less than it lengthens: width with the square root of the length; a strap keeps its width)
      const fk: Leaf3D = k > 1.05 ? { ...f, wid: ext ? f.wid / k : f.wid / Math.sqrt(k), seg: [Math.round(f.seg[0] * Math.min(3, k)), f.seg[1]], wave: [f.wave[0] / Math.sqrt(k), f.wave[1] * k] } : f;
      leaf(ex, fk, P.stalk, base, yaw, L, rise, X.twist(), X.pick(), X.bright(), re, bend(Math.min(1.5, L / h)), { ...fullBy(a0, ext ? 0.15 : 0.1, 1), ext });
    }
  }
  // scale to the height asked for (the leaves' arch makes their reach less than their length), shade the leaves while
  // they are still one smooth sheet each, then merge with the stalks. Only the plant's own part sets the scale.
  const leaves = out.geometry(), parts = [leaves, ...extra];
  const top = Math.max(...parts.map(g => { g.computeBoundingBox(); return g.boundingBox!.max.y; })), k = h / Math.max(1, top);
  // a plant whose leaves reach out wider than its card is drawn narrower (at most by a quarter), so it fits where the card did
  const reach = Math.max(...parts.map(g => Math.max(-g.boundingBox!.min.x, g.boundingBox!.max.x, -g.boundingBox!.min.z, g.boundingBox!.max.z))) * k;
  const kx = clump.spread ? 1 : Math.max(0.75, Math.min(1, Wc * 0.6 / Math.max(1, reach))); // a clump's own spread is kept
  const exLeaves = ex.pos.length ? ex.geometry() : null, all = [...parts, ...(exLeaves ? [exLeaves] : []), ...exTubes];
  for (const g of all) scalePart(g, k * kx, k, k * kx);
  for (const p of pieces) for (let i = 0; i < p.length; i += 3) { p[i] *= k * kx; p[i + 1] *= k; p[i + 2] *= k * kx; }
  for (const g of exLeaves ? [leaves, exLeaves] : [leaves]) { shade(g, h, Wc / 2); tint(g, kTint, warm); }
  return done(mergeGeometries(all)!);
}

/**
 * A carpet (from plantGeometry) set on the ground: each leaflet moves with its anchor as spot() moves it (in from the
 * glass, up or down with the ground); spot() = null leaves that leaflet out. Shares colours, normals and triangles.
 */
export function carpetOnGround(base: THREE.BufferGeometry, spot: Spot) {
  const { anchors, owner } = base.userData as { anchors: Float32Array; owner: Uint32Array }, n = anchors.length / 2, G = base.userData.grow as GrowData;
  const off = new Float32Array(n * 3), gone = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = anchors[i * 2], z = anchors[i * 2 + 1], p = spot(x, z);
    if (!p) gone[i] = 1; else { off[i * 3] = p.x - x; off[i * 3 + 1] = p.y; off[i * 3 + 2] = p.z - z; }
  }
  const src = base.attributes.position, pos = new Float32Array(src.count * 3), anc = new Float32Array(src.count * 3);
  for (let v = 0; v < src.count; v++) {
    const i = owner[v];
    if (gone[i]) continue; // a dropped leaflet collapses to the origin, under the ground
    pos[v * 3] = src.getX(v) + off[i * 3]; pos[v * 3 + 1] = src.getY(v) + off[i * 3 + 1]; pos[v * 3 + 2] = src.getZ(v) + off[i * 3 + 2];
    for (let q = 0; q < 3; q++) anc[v * 3 + q] = G.anc[v * 3 + q] + off[i * 3 + q];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  for (const k of ['color', 'normal']) g.setAttribute(k, base.attributes[k]);
  g.setIndex(base.index);
  g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.keep = true; g.userData.grow = { ...G, anc };
  return g;
}

/**
 * The plant at growth g: every vertex at its place (shown), pulled toward its anchor (growing), or dropped (not there
 * yet). Positions only; colours and normals are shared with src, and so is src itself when everything is shown (a
 * plant at its own growth draws exactly as it was built). Cheap: it runs on every step of a slider drag.
 */
export function revealPlant(src: THREE.BufferGeometry, g: number) {
  const G = src.userData.grow as GrowData | undefined;
  if (!G) return src;
  const P = src.attributes.position.array as Float32Array, n = P.length / 3, gr = G.gr, anc = G.anc, s = new Float32Array(n);
  let all = true;
  for (let v = 0; v < n; v++) { s[v] = (g - gr[v * 2]) / gr[v * 2 + 1]; if (s[v] < 1) all = false; }
  if (all) return src;
  const pos = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    const k = s[v], o = v * 3;
    if (k >= 1) { pos[o] = P[o]; pos[o + 1] = P[o + 1]; pos[o + 2] = P[o + 2]; }
    else if (k > 0) for (let q = 0; q < 3; q++) pos[o + q] = anc[o + q] + (P[o + q] - anc[o + q]) * k;
    else for (let q = 0; q < 3; q++) pos[o + q] = anc[o + q];
  }
  // only the triangles with something showing go to the GPU
  const I = src.index!.array, keep: number[] = [];
  for (let t = 0; t < I.length; t += 3) if (s[I[t]] > 0 || s[I[t + 1]] > 0 || s[I[t + 2]] > 0) keep.push(I[t], I[t + 1], I[t + 2]);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  for (const k of ['color', 'normal']) if (src.attributes[k]) out.setAttribute(k, src.attributes[k]);
  out.setIndex(keep);
  out.computeBoundingBox(); out.computeBoundingSphere(); out.userData.keep = true;
  return out;
}

/** How far a leaf or stem flops from its plant's spine heading: the bell curve's sd, rad (about 30°). */
const SPREAD = 0.5;
/** A piece's centreline before (a) and after (b) lying over, and per point the turn between them. */
interface Bent { a: Float32Array; b: Float32Array; q: THREE.Quaternion[] }
/** How a piece moves: with its parent (a side shoot's base), then by its own lying over. */
interface Rec { pre?: { B: Rec; t: number }; own?: Bent }
const c0 = new THREE.Vector3(), c1 = new THREE.Vector3(), v3 = new THREE.Vector3(), qq = new THREE.Quaternion();
/** Move the point at arr[o] as the centreline moves at its place t (index into the centreline). */
function moveOn(arr: Float32Array, o: number, B: Bent, t: number) {
  const m = B.a.length / 3, i = Math.max(0, Math.min(m - 2, Math.floor(t))), f = Math.max(0, Math.min(1, t - i));
  c0.set(lerp(B.a[i * 3], B.a[i * 3 + 3], f), lerp(B.a[i * 3 + 1], B.a[i * 3 + 4], f), lerp(B.a[i * 3 + 2], B.a[i * 3 + 5], f));
  c1.set(lerp(B.b[i * 3], B.b[i * 3 + 3], f), lerp(B.b[i * 3 + 1], B.b[i * 3 + 4], f), lerp(B.b[i * 3 + 2], B.b[i * 3 + 5], f));
  qq.slerpQuaternions(B.q[i], B.q[i + 1], f);
  v3.set(arr[o], arr[o + 1], arr[o + 2]).sub(c0).applyQuaternion(qq).add(c1);
  arr[o] = v3.x; arr[o + 1] = v3.y; arr[o + 2] = v3.z;
}
function moveBy(arr: Float32Array, o: number, R: Rec, t: number) {
  if (R.pre) moveBy(arr, o, R.pre.B, R.pre.t);
  if (R.own) moveOn(arr, o, R.own, t);
}

/**
 * The plant with everything longer than the water above it lying over along the surface (`F` = the surface's height over
 * the plant's base, mm): each leaf or stem rises as built until it nears F, turns over and runs along just under it, in
 * the current's direction with its own wobble (vallisneria and balansae make sheets, stem tips droop along the top).
 * Leaves riding on a stem go with it. Rebuilds positions and normals (once per water level / place, not per growth
 * step); src itself when nothing reaches the surface.
 */
export function bendPlant(src: THREE.BufferGeometry, F: number) {
  const G = src.userData.grow as GrowData | undefined;
  if (!G || !Number.isFinite(F)) return src;
  const parent = new Map(G.links.map(([c, p, t]) => [c, [p, t]] as const)), rec: (Rec | null)[] = [];
  // the sweep: a leaf or stem nearing the surface curves over on an arc of radius R (about half the water depth,
  // as overgrown vallisneria and stems do: they lean more and more over the top of the water column, then lie along it),
  // never steeper than that arc allows for the room left above it
  const R = Math.max(50, Math.min(250, F * 0.5));
  /** The steepest a centreline may climb with `room` mm left under the surface (sine of its elevation). */
  const spine = Math.atan2(G.cz, G.cx);
  const climb = (room: number) => room >= R ? 1 : room <= 0 ? Math.max(-0.2, room / R * 2) : Math.sqrt(1 - (1 - room / R) ** 2);
  const bendLine = (line: Float32Array, p: number): Bent | null => {
    const m = line.length / 3;
    let top = -Infinity;
    for (let i = 1; i < line.length; i += 3) top = Math.max(top, line[i]);
    if (top < F - R || m < 2) return null;
    const reach = top >= F;
    // where this one flops: the plant's spine (its current's heading: they all tend the same way) plus its own
    // deviation, drawn from a bell curve round the spine (sd SPREAD; its own stream per piece)
    const qr = rng(p * 7919 + 101 + Math.round(G.cz * 1e5)), gauss = Math.sqrt(-2 * Math.log(1 - qr() * 0.999)) * Math.cos(6.2832 * qr());
    const target = spine + SPREAD * gauss, tx = Math.cos(target), tz = Math.sin(target), ph = p * 2.39996;
    const out = new Float32Array(line.length);
    out[0] = line[0]; out[1] = line[1]; out[2] = line[2];
    let turning = false, th = 0, along = 0;
    for (let i = 0; i < m - 1; i++) {
      const o = i * 3, dx = line[o + 3] - line[o], dy = line[o + 4] - line[o + 1], dz = line[o + 5] - line[o + 2], L = Math.hypot(dx, dy, dz);
      if (L < 1e-6) { out[o + 3] = out[o]; out[o + 4] = out[o + 1]; out[o + 5] = out[o + 2]; continue; }
      let ux = dx / L, uy = dy / L, uz = dz / L;
      const y = out[o + 1];
      // below the arc it already starts to lean its way (the curve of the spine), more the higher it gets
      // (only one that reaches the surface; from no lower than 40 % of the depth)
      const from = Math.max(0.4 * F, F - 2 * R), lean = reach ? 0.4 * Math.max(0, Math.min(1, (y - from) / (F - R - from))) : 0;
      if (!turning && lean > 0) { ux += tx * lean; uz += tz * lean; const k = Math.hypot(ux, uy, uz); ux /= k; uy /= k; uz /= k; }
      // the climb allowed at the middle of this step (estimated, then once more from the estimate)
      let lim = climb(F - y - Math.max(0, uy) * L / 2);
      lim = climb(F - y - Math.max(-0.2, Math.min(uy, lim)) * L / 2);
      if (!turning && uy > lim) {
        // starting over: on the way it was heading (straight up: its own way)
        turning = true;
        th = Math.hypot(ux, uz) > 0.1 ? Math.atan2(uz, ux) : target;
      }
      if (turning) {
        // over and along the surface: steering round to its own heading through the arc, a slow wobble of its own
        th += Math.atan2(Math.sin(target - th), Math.cos(target - th)) * Math.min(1, L / (0.8 * R)) + 0.08 * Math.sin(along / 90 + ph) * L / 90;
        along += L;
        const vy = Math.max(-0.2, Math.min(uy, lim)), hz = Math.sqrt(1 - vy * vy);
        ux = Math.cos(th) * hz; uy = vy; uz = Math.sin(th) * hz;
      }
      out[o + 3] = out[o] + ux * L; out[o + 4] = out[o + 1] + uy * L; out[o + 5] = out[o + 2] + uz * L;
    }
    // per point: the turn taking the old direction to the new one (vertices keep their place round the centreline)
    const tan = (a: Float32Array, i: number) => {
      const i0 = Math.max(0, i - 1), i1 = Math.min(m - 1, i + 1);
      return V(a[i1 * 3] - a[i0 * 3], a[i1 * 3 + 1] - a[i0 * 3 + 1], a[i1 * 3 + 2] - a[i0 * 3 + 2]).normalize();
    };
    const q = Array.from({ length: m }, (_, i) => new THREE.Quaternion().setFromUnitVectors(tan(line, i), tan(out, i)));
    return { a: line, b: out, q };
  };
  G.pieces.forEach((line0, p) => {
    // a piece on another one (a side shoot) first goes where its parent took its base, then lies over itself
    const pp = parent.get(p), pre = pp && rec[pp[0]] ? { B: rec[pp[0]]!, t: pp[1] } : undefined;
    let line = line0;
    if (pre) { line = Float32Array.from(line0); for (let o = 0; o < line.length; o += 3) moveBy(line, o, pre.B, pre.t); }
    const own = bendLine(line, p);
    rec[p] = own || pre ? { pre, own: own ?? undefined } : null;
  });
  if (rec.every(b => !b)) return src;
  const P = src.attributes.position.array as Float32Array, n = P.length / 3, pos = Float32Array.from(P), anc = Float32Array.from(G.anc);
  for (let v = 0; v < n; v++) {
    const p = G.pc[v], B = p >= 0 ? rec[p] : null;
    if (!B) continue;
    moveBy(pos, v * 3, B, G.par[v]); moveBy(anc, v * 3, B, G.apar[v]);
    // whatever still sticks up past the surface (the leaves on a stem lying along it) is pressed flat against it
    for (const arr of [pos, anc]) if (arr[v * 3 + 1] > F) arr[v * 3 + 1] = F + (arr[v * 3 + 1] - F) * 0.12;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', src.attributes.color);
  g.setIndex(src.index);
  g.computeVertexNormals();
  g.computeBoundingBox(); g.computeBoundingSphere();
  Object.assign(g.userData, src.userData, { grow: { ...G, anc } });
  return g;
}
