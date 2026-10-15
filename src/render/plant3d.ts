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
//
// Emersed growth (lane GR2, 2026-10-15): an 'emerge' plant that has a growth of its own also gets an emersed twin of
// every leaf (stiffer, rounder, darker; hidden until bent), and bendPlant() lets it climb on past the water line up to
// the lid or the light, upright, showing the emersed twin of each leaf above the water and the submersed one below.
// A lily (tiger lotus) gets pads on long stalks, shown only with water, stretched or shortened to lie on the surface.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { PLANT_ASPECT, PLANT3D, growthLen, growthOf, type Leaf3D, type PlantType } from '../art/plants';
import { CARPET_H, MAX_STEMS } from '../scene/items';
import { taperTube } from './fish3d';

/** Switches for review sheets: sway (off = every leaf rigid), emerse (off = no emersed
 *  twins: emerging plants lie over at the surface as in GR1), gpu (off = revealPlant on the CPU every growth step, as
 *  before lane GR4: the A/B timings). */
export const plant3d = { sway: true, emerse: true, gpu: true };

type R = () => number;
const MAX_LEAFLETS = 3000;
/** Most rosettes a floater with its own spread builds (one that fills a big tank at the most density). */
const FLOAT_MAX = 1000;
/** Where a carpet's leaflet `i` (its anchor at lx, lz) lands on the ground (null = left out). */
type Spot = (lx: number, lz: number, i: number) => { x: number; y: number; z: number; w: number } | null;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const between = (r: R, [a, b]: [number, number]) => lerp(a, b, r());

/**
 * Growth tags: every vertex shows from growth `a` (hidden below), full from `a + w`, in between pulled toward its
 * anchor `anc` (a leaf's base: it grows in; or its own point on the midrib / stem: it gets longer). `pc` = the piece it
 * rides on (a leaf or stem whose centreline can lie over at the surface; -1 = none), `par` = where along that piece
 * (index into its centreline), `apar` = the anchor's place on it.
 */
interface Tag { a: number; w: number; anc: THREE.Vector3; pc: number; par: number; apar: number; em?: number }
const TAGS = ['anc', 'gr', 'pc', 'par', 'apar', 'em'] as const;
/** Form tags (lane GR2): 0 always, 1 the submersed leaf of a pair, 2 its emersed twin, 3 a lily pad (with water only). */
const SUB = 1, EMERSED = 2, PAD = 3;
/** A growth tag no slider reaches: hidden. */
const HIDE = 99;
/** Points along a stem's centreline (where it can bend over at the surface). */
const SEG = 40;
/** A leaf's growth: appears at `a`, full at `a + w`; `ext` = grows longer from its base (straps) instead of growing in;
 *  `on` = rides on a stem (its piece, its place there) instead of being a piece of its own. */
interface LeafTag { a: number; w: number; ext?: boolean; on?: { pc: number; par: number }; em?: number; anc?: THREE.Vector3 }
const SHOWN: LeafTag = { a: -1, w: 1e-3 };
/** Shown from a, full by `by`: w cut so a + w stays at or under `by` (a plant's own part is full at its own growth). */
const fullBy = (a: number, w: number, by: number) => { a = Math.min(a, by - 0.005); return { a, w: Math.max(1e-4, Math.min(w, (by - a) * 0.999)) }; };

/** Vertices of one plant before merging: positions, base colours, triangles, growth tags. */
class Sheets {
  pos: number[] = []; col: number[] = []; idx: number[] = [];
  anc: number[] = []; gr: number[] = []; pc: number[] = []; par: number[] = []; apar: number[] = []; em: number[] = [];
  constructor(public pieces: number[][]) {}
  /** A grid of rows x cols points (row-major), with the base colour per point; front = as given, back = reversed. */
  grid(p: THREE.Vector3[], c: THREE.Color[], rows: number, cols: number, back: THREE.Color[] | undefined, tg: Tag[]) {
    for (const side of back ? [0, 1] : [0]) {
      const o = this.pos.length / 3;
      p.forEach((v, i) => {
        const k = side ? back![i] : c[i], t = tg[i];
        this.pos.push(v.x, v.y, v.z); this.col.push(k.r, k.g, k.b);
        this.anc.push(t.anc.x, t.anc.y, t.anc.z); this.gr.push(t.a, t.w); this.pc.push(t.pc); this.par.push(t.par); this.apar.push(t.apar); this.em.push(t.em ?? 0);
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
    setTags(g, this.anc, this.gr, this.pc, this.par, this.apar, this.em);
    return g;
  }
}
function setTags(g: THREE.BufferGeometry, anc: ArrayLike<number>, gr: ArrayLike<number>, pc: ArrayLike<number>, par: ArrayLike<number>, apar: ArrayLike<number>, em: ArrayLike<number>) {
  g.setAttribute('anc', new THREE.Float32BufferAttribute(anc as number[], 3));
  g.setAttribute('gr', new THREE.Float32BufferAttribute(gr as number[], 2));
  g.setAttribute('pc', new THREE.Float32BufferAttribute(pc as number[], 1));
  g.setAttribute('par', new THREE.Float32BufferAttribute(par as number[], 1));
  g.setAttribute('apar', new THREE.Float32BufferAttribute(apar as number[], 1));
  g.setAttribute('em', new THREE.Float32BufferAttribute(em as number[], 1));
}
/** Every vertex of g gets the tag fn(vertex index) gives. */
function tagEach(g: THREE.BufferGeometry, fn: (i: number) => Tag) {
  const n = g.attributes.position.count, anc = new Float32Array(n * 3), gr = new Float32Array(n * 2), pc = new Float32Array(n), par = new Float32Array(n), apar = new Float32Array(n), em = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = fn(i);
    anc[i * 3] = t.anc.x; anc[i * 3 + 1] = t.anc.y; anc[i * 3 + 2] = t.anc.z; gr[i * 2] = t.a; gr[i * 2 + 1] = t.w; pc[i] = t.pc; par[i] = t.par; apar[i] = t.apar; em[i] = t.em ?? 0;
  }
  setTags(g, anc, gr, pc, par, apar, em);
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
    const em = tag.em ?? 0, rowTag: Tag = tag.on ? { a: tag.a, w: tag.w, anc: tag.anc ?? b0, pc: tag.on.pc, par: tag.on.par, apar: tag.on.par, em }
      : tag.ext ? { a: tag.a + (tag.w - e) * t, w: e, anc: c.clone(), pc: own, par: i, apar: i, em }
        : { a: tag.a, w: tag.w, anc: tag.anc ?? b0, pc: own, par: i, apar: 0, em };
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
export interface Clump {
  spread?: number; stems?: number;
  /** A floater's density: times the species' own rosettes per area (absent = 1). */
  dens?: number;
  /** The glass within its own spread, in its own frame: [nx, nz, e] per pane, a point (x, z) is inside by
   *  e - (x nx + z nz) mm. Stems, crowns and rosettes are only set down inside (a spread may reach past the glass). */
  clip?: number[];
}

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
  /** Form tags (lane GR2) when the plant has any: per vertex SUB / EMERSED / PAD (0 = always); `gr0` = the growth tags
   *  as built (in `gr` the emersed twins and the pads are hidden until bendPlant shows them). */
  em?: Float32Array; gr0?: Float32Array;
  /** An 'emerge' plant: it may climb past the water line (bendPlant with room above it). */
  emerge?: boolean;
  /** Rosette leaves and their emersed twins: [twin's piece, leaf's piece]. */
  twin?: number[][];
  /** Lily pad stalks (pieces), stretched to the surface. */
  pads?: number[];
  /** Emersed stiffness as a length, mm (a piece this long out of the water droops its tip by about 1 rad). */
  stiff?: number;
  /** Radius (mm) of the curve a drooping emersed piece levels out on as it comes down onto the water. */
  land?: number;
  /** Bent (lane GR2): per vertex the growth from which a SUB / EMERSED pair shows its emersed twin. */
  cut?: Float32Array;
  /** With form tags: the triangles that can show at some growth (`idx`) and their vertices (`live`), so a reveal skips
   *  the form that never shows (a stem leaf's twin under the water, every twin while the plant is not bent). */
  idx?: Uint32Array; live?: Uint32Array;
}
/** The triangles of `index` with a corner that can show (never(v) false), and the vertices they use. */
function liveOf(index: ArrayLike<number>, n: number, never: (v: number) => boolean) {
  const idx: number[] = [], used = new Uint8Array(n);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    if (never(a) && never(b) && never(c)) continue;
    idx.push(a, b, c); used[a] = used[b] = used[c] = 1;
  }
  const live: number[] = [];
  for (let v = 0; v < n; v++) if (used[v]) live.push(v);
  return { idx: Uint32Array.from(idx), live: Uint32Array.from(live) };
}
/** Move the tag attributes into userData.grow (CPU only: they never go to the GPU). */
function keepTags(g: THREE.BufferGeometry, pieces: number[][], cx: number, cz: number, sway: number, links: number[][], extra: Partial<GrowData> = {}) {
  const A = (k: string) => (g.attributes[k].array as Float32Array);
  const G: GrowData = { anc: A('anc'), gr: A('gr'), pc: A('pc'), par: A('par'), apar: A('apar'), pieces: pieces.map(p => Float32Array.from(p)), cx, cz, sway, links, ...extra };
  // twins and pads hidden until bendPlant decides (a plant with none keeps no form tags)
  const em = A('em');
  if (em.some(e => e > 0)) {
    G.em = em; G.gr0 = Float32Array.from(G.gr);
    for (let v = 0; v < em.length; v++) if (em[v] >= EMERSED) G.gr[v * 2] = HIDE;
    Object.assign(G, liveOf(g.index!.array, em.length, v => em[v] >= EMERSED));
  }
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
  /** Is (x, z) at least m mm inside the glass (clump.clip)? */
  const inTank = (x: number, z: number, m = 0) => { const c = clump.clip; if (c) for (let i = 0; i < c.length; i += 3) if (c[i + 2] - (x * c[i] + z * c[i + 1]) < m) return false; return true; };
  /** A point at distance k(q) * R in direction a(q) (q's draws), drawn again until it is inside the glass (no clip, or
   *  inside at once: exactly the draws it always made). */
  const inside = (q: R, R: number, k: (t: number) => number, a = (_t: number) => q() * 6.28) => {
    let x = 0, z = 0;
    for (let t = 0; t < 40; t++) { const an = a(t), d = k(t) * R; x = Math.cos(an) * d; z = Math.sin(an) * d; if (inTank(x, z, 3)) break; if (t === 39) x = z = 0; }
    return V(x, 0, z);
  };
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
  const draws = (q: R, ff = f) => ({ pick: () => ff.cols[Math.floor(q() * ff.cols.length)], twist: () => (q() - 0.5) * 2 * ff.twist, bright: () => 0.9 + q() * 0.2 });
  const { pick, twist, bright } = draws(r), X = draws(re);
  // emersed twins (lane GR2): only for an 'emerge' plant with a growth of its own, own random stream and own sheets (so
  // the plant's own part, its scale and its pieces stay exactly as they were)
  const E = more && plant3d.emerse && Gr.overflow === 'emerge' && P.emersed ? P.emersed : null, rq = rng(seed * 3571 + 41), es = new Sheets(pieces), twins: number[][] = [], padPieces: number[] = [];
  const fe: Leaf3D = E ? { ...f, ...E, len: f.len.map(v => v * (E.k ?? 1)) as [number, number] } : f, Q = draws(rq, fe);
  const emTag = <T extends LeafTag>(t: T): T => (E ? { ...t, em: SUB } : t);
  // the water's give: one current direction for the whole plant (mostly along the tank, as a filter's flow runs), each
  // leaf leaning into it by its own amount, longer leaves more (own random stream: the leaf layout stays as it was)
  const rs = rng(seed * 104729 + 71), cur = (rs() < 0.5 ? 0 : Math.PI) + (rs() - 0.5) * 1.2, cx = Math.cos(cur), cz = Math.sin(cur);
  // how much current reaches this plant: anywhere from none (straight up) to a strong lean, all equally likely
  // (Nathan 2026-10-14: the red stems all bent about the same)
  const sway = plant3d.sway ? P.sway * 1.3 * rng(seed * 15485863 + 5)() : 0;
  const bend = (len = 1): Bend => ({ cx, cz, k: sway * (0.5 + rs()) * len, wob: sway * 0.5 * (rs() - 0.5) * 2 * len, ph: rs() * 6.28 });
  const done = (g: THREE.BufferGeometry) => { g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.keep = true; keepTags(g, pieces, cx, cz, sway, links, { emerge: !!E, twin: twins, pads: padPieces, stiff: E ? (E.stiff ?? 220) * kStalk ** (2 / 3) : undefined, land: E?.land }); return g; };
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
    const F = P.float!, n = Math.round(Math.min(600, Math.PI * rad * rad / 1000 * between(r, F.per) * (clump.dens ?? 1)));
    const rosette = (q: R, D: ReturnType<typeof draws>, c: THREE.Vector3, t: { a: number; w: number }, into: THREE.BufferGeometry[]) => {
      const k = Math.round(between(q, F.leaves)), y0 = q() * 6.28, on = { ...t, on: { pc: -1, par: 0 } };
      for (let j = 0; j < k; j++) leaf(out, f, P.stalk, c, y0 + j * 6.28 / k + (q() - 0.5) * 0.4, between(q, f.len), between(q, f.rise), D.twist(), D.pick(), D.bright(), q, STIFF, on);
      for (let j = 0, m = Math.round(between(q, F.roots)); j < m; j++) {
        // a thin root that wanders a little on the way down
        const L = between(q, F.rootLen), dx = (q() - 0.5) * L * 0.5, dz = (q() - 0.5) * L * 0.5, wx = (q() - 0.5) * L * 0.15, wz = (q() - 0.5) * L * 0.15;
        into.push(tagAll(tube([0, 0.25, 0.5, 0.75, 1].map(s => V(c.x + dx * s * s + wx * Math.sin(s * 6), -L * s, c.z + dz * s * s + wz * Math.sin(s * 5))), 0.25, P.stalk, 6, 3), t.a, t.w, c));
      }
    };
    if (clump.spread) {
      // its own spread (Nathan 2026-10-15: "the same as regular plants"): rosettes over the whole circle at the species'
      // density times its own, the patch reaching out from the first one as it grows and over all of it by growth 1.
      // Only those inside the glass are built (the circle may reach past it); past FLOAT_MAX the first ones drawn
      const R1 = clump.spread / 2, lk = Math.log(Gr.len[1] / Gr.len[0]), at = (d: number) => 1 + Math.log(Math.max(1e-3, d / R1)) / lk;
      const rp = rng(seed * 4513 + 17), want = Math.round(Math.min(2e5, Math.PI * R1 * R1 / 1000 * between(rp, F.per) * (clump.dens ?? 1))), m0 = f.len[0] * 0.4;
      rosette(r, { pick, twist, bright }, V(0, 0.6, 0), fullBy(-0.06, 0.05, 1), extra); // (just planted = this one)
      for (let i = 1, built = 1; i < want && built < FLOAT_MAX; i++) {
        const a = rp() * 6.28, d = Math.sqrt(rp()) * R1, x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (!inTank(x, z, m0)) continue;
        rosette(r, { pick, twist, bright }, V(x, 0.6, z), fullBy(at(d) - 0.05, 0.05, 1), extra); built++;
      }
      const leaves = out.geometry();
      shade(leaves, 2, 1e9);
      tint(leaves, kTint, warm);
      return done(mergeGeometries([leaves, ...extra.map(e => { e.computeVertexNormals(); return e; })])!);
    }
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, rho = Math.sqrt(r()), d = rho * rad * 0.92, c = V(Math.cos(a) * d, 0.6, Math.sin(a) * d);
      // (the first one is there from the start: just planted = one rosette, lane GR2)
      rosette(r, { pick, twist, bright }, c, fullBy(i === 0 ? Math.min(-0.01, reach(rho) - 0.05) : reach(rho) - 0.05, 0.05, g0), extra);
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
        const tag: LeafTag = emTag({ ...fullBy(T(t) - e, e + 0.1, by), on: { pc, par: t * SEG } });
        for (const o of [0, Math.PI]) leaf(into, f, P.stalk, at(t), rot + o, L, rise, D.twist(), cols, br, q, bend(0.4), tag);
        // the emersed pair: held up stiffly along the stem (no sway: bend() would take draws from the plant's own stream)
        if (E) {
          const re2 = lerp(fe.rise[0], fe.rise[1], up ** 0.5) * (0.85 + rq() * 0.3), ce = Q.pick(), be = Q.bright();
          for (const o of [0, Math.PI]) leaf(es, fe, P.stalk, at(t), rot + o, L * (E.k ?? 1), re2, Q.twist(), ce, be, rq, STIFF, { ...tag, em: EMERSED });
        }
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
      const b = inside(r, base, () => Math.sqrt(r()));
      const top = h * (0.75 + 0.25 * r()), lean = V((r() - 0.5) * Wc * 0.4, 0, (r() - 0.5) * Wc * 0.4);
      // (a stem comes in as a cutting no earlier than growth 0: just planted = a few short cuttings)
      const at = path(b, top, lean, bend()), a0 = Math.min(Math.max(-0.02, own(s, n)), g0 - 0.06);
      const T = (t: number) => t <= CUT ? a0 : a0 + (t - CUT) / (1 - CUT) * (g0 - 0.02 - a0);
      own0.push({ at, top, T, pc: stem(at, nodes, T, g0, r, { pick, twist, bright }, out, extra) });
    }
    // more stems come up in the clump (a little wider as it grows, unless it has its own spread) and grow taller;
    // and side shoots off every stem, from low on it, curving up beside it
    const all = [...own0];
    // (an emerging clump, lane GR2, Nathan 2026-10-15: thinner and wider, so its stems out of the water read one by one)
    const em = Gr.overflow === 'emerge', thin = em ? 0.6 : 1, wider = em ? 2 : 0.4;
    for (let j = 0, m = Math.min(Math.round(extras(n, 60) * thin), 60 - n); j < m; j++) {
      const a0 = extraAt(Math.round(j / thin), n), up = Math.min(0.25, 0.99 - a0), k = longer(a0 + up);
      const b = inside(re, base * (clump.spread ? 1 : 1 + wider * (a0 - g0) / Math.max(0.05, 1 - g0)), () => Math.sqrt(re())), top = h * (0.75 + 0.25 * re()) * k, lean = V((re() - 0.5) * Wc * 0.4, 0, (re() - 0.5) * Wc * 0.4);
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
      ? Array.from({ length: crowns }, (_, i) => inside(r, half, t => (t ? Math.sqrt(r()) : Math.sqrt((i + 0.5) / crowns) * (0.85 + r() * 0.3)), t => (t ? r() * 6.28 : i * 2.39996 + (r() - 0.5) * 0.8))) // (past the glass: anywhere inside)
      : Array.from({ length: crowns }, (_, i) => V(crowns > 1 ? (i / (crowns - 1) * 2 - 1) * half + (r() - 0.5) * half * 0.3 : 0, 0, (r() - 0.5) * half * 0.4));
    const onRhizome = (q: R) => { const u = q(), k = Math.min(3, Math.floor(u * 4)); return roots[k].clone().lerp(roots[k + 1], u * 4 - k); };
    /** A leaf's emersed twin (a sword's leaf held up out of the water on its long stiff stalk): same crown, heading and
     *  growth, its own piece. */
    const later: (() => void)[] = [];
    const twin = (base: THREE.Vector3, yaw: number, L: number, outer: number, tag: LeafTag, pc: number, ff: Leaf3D) => {
      twins.push([pieces.length, pc]);
      leaf(es, ff, P.stalk, base, yaw, L * (E!.k ?? 1), lerp(ff.rise[0], ff.rise[1], outer) * (0.85 + rq() * 0.3), Q.twist(), Q.pick(), Q.bright(), rq, STIFF, { ...tag, em: EMERSED });
    };
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1), outer = rz ? r() : 1 - t;
      let base: THREE.Vector3, yaw: number;
      if (rz) { base = onRhizome(r); yaw = r() * 6.28; }
      else { base = centres[i % crowns].clone().add(V((r() - 0.5) * h * 0.02, 0, (r() - 0.5) * h * 0.02)); yaw = i * 2.39996 + r() * 0.5; }
      const L = h * between(r, f.len) * (rz ? 1 : 0.75 + 0.25 * outer), rise = lerp(f.rise[0], f.rise[1], outer) * (0.85 + r() * 0.3);
      // below g0 the leaves thin out (the outer, older ones last) and every one is smaller, all full by g0
      const a0 = own(i, n), tag = emTag({ ...fullBy(a0, Infinity, g0), ext }), pc = pieces.length;
      leaf(out, f, P.stalk, base, yaw, L, rise, twist(), pick(), bright(), r, bend(L / h), tag);
      if (E) later.push(() => twin(base, yaw, L, outer, tag, pc, fe));
    }
    // more leaves above g0, longer the later they come; a clump also puts out new crowns on runners, further out. A
    // spreading clump (sagittaria, lane GR2) makes its lawn: new crowns at the end of runners along the ground from the
    // crowns it has, the patch reaching out to about 4x its width by growth 1, its leaves lengthening less
    const more = extras(n, 600 - n), newCrowns: { c: THREE.Vector3; a: number }[] = [], spreads = Gr.overflow === 'spread';
    if (more && P.crowns && g0 < 0.97) for (let k = 0, m = Math.round(crowns * (spreads ? Gr.more : Math.sqrt(Gr.more)) ** (1 - g0)) - crowns; k < m; k++) {
      const a0 = g0 + (1 - g0) * (k + 0.5) / m * 0.85, ang = re() * 6.28;
      if (spreads && !clump.spread) {
        // the new crown somewhere out toward the lawn's edge by now, on a runner from the nearest crown it has
        const lim = half * (1 + 3.5 * (a0 - g0) / Math.max(0.05, 1 - g0)), d = lim * Math.sqrt(0.35 + 0.65 * re()), c = V(Math.cos(ang) * d, 0, Math.sin(ang) * d);
        const from = [...centres, ...newCrowns.map(q => q.c)].reduce((b, q) => (q.distanceToSquared(c) < b.distanceToSquared(c) ? q : b));
        newCrowns.push({ c, a: a0 });
        // the runner: a thin stalk along the ground, out from its crown as the new one comes
        const r0 = Math.max(0.35, h * 0.005), lift = h * 0.015;
        exTubes.push(tube([0, 0.33, 0.67, 1].map(s => from.clone().lerp(c, s).setY(r0 + lift * Math.sin(Math.PI * s))), r0, P.stalk, 8, 3,
          (s, cc) => ({ ...fullBy(Math.max(g0 + 1e-3, a0 - 0.05 + 0.04 * s), 0.01, 1), anc: cc, pc: -1, par: 0, apar: 0 })));
        continue;
      }
      if (clump.spread) { newCrowns.push({ c: inside(re, half, () => Math.sqrt(re()), t => (t ? re() * 6.28 : ang)), a: a0 }); continue; }
      const d = half * (1 + 0.8 * (a0 - g0) / Math.max(0.05, 1 - g0) * (0.6 + 0.4 * re()));
      newCrowns.push({ c: V(Math.cos(ang) * d, 0, Math.sin(ang) * d), a: a0 });
    }
    for (let j = 0; j < more; j++) {
      const a0 = extraAt(j, n), k0 = longer(a0 + 0.1), k = spreads ? Math.sqrt(k0) : k0, outer = re();
      const here = [...centres, ...newCrowns.filter(c => c.a <= a0).map(c => c.c)], c = here[Math.floor(re() * here.length)];
      const base = rz ? onRhizome(re) : c.clone().add(V((re() - 0.5) * h * 0.02, 0, (re() - 0.5) * h * 0.02)), yaw = re() * 6.28;
      const L = h * between(re, f.len) * (rz ? 1 : 0.75 + 0.25 * outer) * k, rise = lerp(f.rise[0], f.rise[1], outer) * (0.85 + re() * 0.3);
      // a longer leaf gets more rows (smooth where it lies over) and its ripples keep their spacing
      // (and a broad leaf widens less than it lengthens: width with the square root of the length; a strap keeps its width)
      const fk: Leaf3D = k > 1.05 ? { ...f, wid: ext ? f.wid / k : f.wid / Math.sqrt(k), seg: [Math.round(f.seg[0] * Math.min(3, k)), f.seg[1]], wave: [f.wave[0] / Math.sqrt(k), f.wave[1] * k] } : f;
      const tag = emTag({ ...fullBy(a0, ext ? 0.15 : 0.1, 1), ext }), pc = pieces.length;
      leaf(ex, fk, P.stalk, base, yaw, L, rise, X.twist(), X.pick(), X.bright(), re, bend(Math.min(1.5, L / h)), tag);
      if (E) later.push(() => twin(base, yaw, L, outer, tag, pc, k > 1.05 ? { ...fe, seg: [Math.round(fe.seg[0] * Math.min(3, k)), fe.seg[1]] } : fe));
    }
    // the emersed twins, after every leaf of the plant (so its pieces keep their numbers)
    for (const fn of later) fn();
  }
  // scale to the height asked for (the leaves' arch makes their reach less than their length), shade the leaves while
  // they are still one smooth sheet each, then merge with the stalks. Only the plant's own part sets the scale.
  const leaves = out.geometry(), parts = [leaves, ...extra];
  const top = Math.max(...parts.map(g => { g.computeBoundingBox(); return g.boundingBox!.max.y; })), k = h / Math.max(1, top);
  // a plant whose leaves reach out wider than its card is drawn narrower (at most by a quarter), so it fits where the card did
  const reach = Math.max(...parts.map(g => Math.max(-g.boundingBox!.min.x, g.boundingBox!.max.x, -g.boundingBox!.min.z, g.boundingBox!.max.z))) * k;
  const kx = clump.spread ? 1 : Math.max(0.75, Math.min(1, Wc * 0.6 / Math.max(1, reach))); // a clump's own spread is kept
  const exLeaves = ex.pos.length ? ex.geometry() : null, emLeaves = es.pos.length ? es.geometry() : null;
  const sheets = [leaves, ...(exLeaves ? [exLeaves] : []), ...(emLeaves ? [emLeaves] : [])], all = [...parts, ...sheets.slice(1), ...exTubes];
  for (const g of all) scalePart(g, k * kx, k, k * kx);
  for (const p of pieces) for (let i = 0; i < p.length; i += 3) { p[i] *= k * kx; p[i + 1] *= k; p[i + 2] *= k * kx; }
  for (const g of sheets) { shade(g, h, Wc / 2); tint(g, kTint, warm); }
  // lily pads (lane GR2), built in mm after the scaling: each on a long stalk from the crown, leaning out (later ones
  // further), the pad flat across its top. bendPlant stretches or shortens the stalk to lay the pad on the water
  if (P.pads) {
    const D = P.pads, rp = rng(seed * 2473 + 59), ps = new Sheets(pieces), Dp = draws(rp, D.leaf), LS = 300;
    const n1 = Math.max(D.n[0] + 1, Math.round(D.n[1] * (0.8 + 0.4 * rp())));
    for (let j = 0; j < n1; j++) {
      // pad j shows from growth a: the first at `from`, then evenly more up to n1 by growth 1
      const a = Math.min(0.96, D.from + (1 - D.from) * Math.max(0, j + 1 - D.n[0]) / (n1 - D.n[0])), u = (a - D.from) / (1 - D.from);
      const ang = j * 2.39996 + (rp() - 0.5) * 0.8, d = D.out * (0.25 + 0.75 * u) * (0.6 + 0.4 * rp()), top = V(Math.cos(ang) * d, LS, Math.sin(ang) * d);
      const b = V((rp() - 0.5) * 6, 0, (rp() - 0.5) * 6), at = (s: number) => b.clone().lerp(top, s ** 1.4).setY(LS * s), pc = pieces.length, line: number[] = [];
      for (let i = 0; i <= SEG; i++) { const p = at(i / SEG); line.push(p.x, p.y, p.z); }
      pieces.push(line); padPieces.push(pc);
      all.push(tube([0, 0.2, 0.4, 0.6, 0.8, 1].map(at), 1.2, D.stalk, 24, 4, (s, c) => ({ ...fullBy(a + 0.05 * s, 0.01, 1), anc: c, pc, par: s * SEG, apar: s * SEG, em: PAD })));
      const L = between(rp, D.len) * (0.65 + 0.35 * u), yaw = rp() * 6.28, base = top.clone().add(V(-Math.cos(yaw) * L / 2, 0.4, -Math.sin(yaw) * L / 2));
      leaf(ps, D.leaf, D.stalk, base, yaw, L, Math.PI / 2, 0, Dp.pick(), Dp.bright(), rp, STIFF, { ...fullBy(a + 0.05, 0.06, 1), on: { pc, par: SEG }, em: PAD, anc: top.clone() });
    }
    const pads = ps.geometry();
    shade(pads, 2, 1e9); tint(pads, kTint, warm);
    all.push(pads);
  }
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
    const x = anchors[i * 2], z = anchors[i * 2 + 1], p = spot(x, z, i);
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
 * A clump set on sloping ground (Nathan 2026-10-15: its crowns sat on one level plane): every leaf or stem moves up or
 * down with the ground under its own base (`off(x, z)`: the ground there less the ground under the plant's origin, in
 * the plant's own frame), fading out by the height F over the base where a plant lying over at the surface turns (so
 * the sheet on the water stays on the water). Bases are where each top piece starts (a side shoot rides its stem);
 * what belongs to no piece (runners, a core) moves with the ground under itself. Null = the ground is level under it
 * (within half a mm), so the plant as built stands; else its cache key and how to build it. Shares colours, normals
 * and triangles.
 */
export function clumpOnGround(src: THREE.BufferGeometry, off: (x: number, z: number) => number, F = Infinity): { key: string; build: () => THREE.BufferGeometry } | null {
  const G = src.userData.grow as GrowData | undefined;
  if (!G || G.pieces.length < 2) return null;
  const parent = new Map(G.links.map(([c, p]) => [c, p] as const));
  const top = (p: number) => { for (let k = 0; parent.has(p) && k < 8; k++) p = parent.get(p)!; return p; };
  // the ground under each base, looked up once per 2 mm cell (a crown's leaves start a few mm apart), to half a mm
  const cells = new Map<string, number>(), dyOf = new Float32Array(G.pieces.length);
  const at = (x: number, z: number) => { const c = `${Math.round(x / 2)},${Math.round(z / 2)}`; let v = cells.get(c); if (v == null) cells.set(c, v = Math.round(off(x, z) * 2) / 2); return v; };
  let any = false, h = 0;
  for (let p = 0; p < G.pieces.length; p++) {
    const b = G.pieces[top(p)]; dyOf[p] = b && b.length >= 3 ? at(b[0], b[2]) : 0;
    if (Math.abs(dyOf[p]) >= 0.5) any = true;
    h = (Math.imul(h, 31) + dyOf[p] * 2) | 0;
  }
  if (!any) return null;
  // the key: the ground offsets themselves (a drag that keeps the slope under it reuses the build)
  return { key: `g${G.pieces.length}:${h}`, build: () => {
    const wt = (y: number) => (Number.isFinite(F) && F > 0 ? Math.min(1, Math.max(0, 1 - y / F)) : 1);
    const P = src.attributes.position, pos = new Float32Array(P.count * 3), anc = new Float32Array(G.anc);
    for (let v = 0; v < P.count; v++) {
      const x = P.getX(v), y = P.getY(v), z = P.getZ(v), pc = G.pc[v];
      const dy = pc >= 0 ? dyOf[pc] : at(x, z);
      pos[v * 3] = x; pos[v * 3 + 1] = y + dy * wt(y); pos[v * 3 + 2] = z;
      anc[v * 3 + 1] += dy * wt(anc[v * 3 + 1]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    for (const k of ['color', 'normal']) if (src.attributes[k]) g.setAttribute(k, src.attributes[k]);
    g.setIndex(src.index);
    g.computeBoundingBox(); g.computeBoundingSphere();
    Object.assign(g.userData, src.userData, { keep: true, grow: { ...G, anc } });
    return g;
  } };
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
  // (a plant with form tags only walks the vertices that can show at some growth: `live`, `idx`)
  const cut = G.cut, em = G.em, live = G.live, N = live ? live.length : n;
  let all = !live;
  for (let j = 0; j < N; j++) {
    const v = live ? live[j] : j;
    s[v] = (g - gr[v * 2]) / gr[v * 2 + 1];
    // an emersed twin shows from its cut, the leaf it replaces until then (lane GR2)
    if (cut && em![v] && em![v] < PAD && (em![v] === SUB) === (g >= cut[v])) s[v] = -1;
    if (s[v] < 1) all = false;
  }
  if (all) return src;
  const pos = new Float32Array(n * 3);
  for (let j = 0; j < N; j++) {
    const v = live ? live[j] : j, k = s[v], o = v * 3;
    if (k >= 1) { pos[o] = P[o]; pos[o + 1] = P[o + 1]; pos[o + 2] = P[o + 2]; }
    else if (k > 0) for (let q = 0; q < 3; q++) pos[o + q] = anc[o + q] + (P[o + q] - anc[o + q]) * k;
    else for (let q = 0; q < 3; q++) pos[o + q] = anc[o + q];
  }
  // only the triangles with something showing go to the GPU
  const I = G.idx ?? src.index!.array, keep = new Uint32Array(I.length);
  let m = 0;
  for (let t = 0; t < I.length; t += 3) if (s[I[t]] > 0 || s[I[t + 1]] > 0 || s[I[t + 2]] > 0) { keep[m++] = I[t]; keep[m++] = I[t + 1]; keep[m++] = I[t + 2]; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  for (const k of ['color', 'normal']) if (src.attributes[k]) out.setAttribute(k, src.attributes[k]);
  out.setIndex(new THREE.BufferAttribute(keep.slice(0, m), 1));
  // bounds over the vertices that can show (as computeBoundingBox / Sphere would, without walking the dead ones)
  const box = new THREE.Box3(), c = new THREE.Vector3();
  for (let j = 0; j < N; j++) box.expandByPoint(c.fromArray(pos, (live ? live[j] : j) * 3));
  let r2 = 0;
  const mid = box.getCenter(new THREE.Vector3());
  for (let j = 0; j < N; j++) r2 = Math.max(r2, mid.distanceToSquared(c.fromArray(pos, (live ? live[j] : j) * 3)));
  out.boundingBox = box; out.boundingSphere = new THREE.Sphere(mid, Math.sqrt(r2)); out.userData.keep = true;
  return out;
}

// ---------- GPU reveal (lane GR4, 2026-10-15) ----------
// The same reveal as revealPlant, in the vertex shader: each vertex carries its anchor (`aAnc`) and its growth tags
// (`aGrow` = a, w, form, cut) and its mesh's growth (`aGrowth`: one value for the whole draw, an instanced attribute
// on the mesh's own light view of the plant, so every plant shares one material) places it, so a Growth or Time drag
// touches no geometry and makes no new material (a material per growth cost three.js 2..8 ms each). Hidden vertices wait at their anchors; a triangle with every corner hidden has at most two distinct anchors
// (a leaf's base, or two points on its midrib or stem), so it draws nothing, as revealPlant drops it (test/gpureveal).
// What runs on the CPU (picking, the selection box, the USDZ export) gets revealPlant's geometry from the view's `cpu()`.

/** Vertex shader: after begin_vertex (and after the lighting's vAqP, which needs the grown position). */
export const GROW_DECL = 'attribute vec3 aAnc; attribute vec4 aGrow; attribute float aGrowth;';
export const GROW_VERT = `{
  float aqS = aGrow.y > 0.0 ? (aGrowth - aGrow.x) / aGrow.y : (aGrowth >= aGrow.x ? 1.0 : -1.0);
  if (aGrow.z > 0.5 && aGrow.z < 2.5 && ((aGrow.z < 1.5) == (aGrowth >= aGrow.w))) aqS = -1.0;
  if (aqS < 1.0) transformed = aAnc + (transformed - aAnc) * max(aqS, 0.0);
}`;
/** Patch a plant material's shader to reveal at each mesh's growth (call after the lighting patch, which also edits
 *  begin_vertex). A geometry without the tags (no growth data) draws as it is: missing attributes read as 0. */
export function growShader(sh: THREE.WebGLProgramParametersWithUniforms) {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + GROW_DECL)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + GROW_VERT);
}
/** No cut (never switches) in the attribute: far past any growth. */
const NO_CUT = 1e6;
/** The growth tags as GPU attributes on src (once per built / bent / grounded plant) and the triangles that can show. */
function gpuParts(src: THREE.BufferGeometry, G: GrowData) {
  let p = src.userData.gpu as { anc: THREE.BufferAttribute; grow: THREE.BufferAttribute; index: THREE.BufferAttribute } | undefined;
  if (p) return p;
  const n = G.anc.length / 3, t = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) {
    t[v * 4] = G.gr[v * 2]; t[v * 4 + 1] = G.gr[v * 2 + 1]; t[v * 4 + 2] = G.em?.[v] ?? 0;
    const c = G.cut?.[v] ?? Infinity;
    t[v * 4 + 3] = c === Infinity ? NO_CUT : c === -Infinity ? -NO_CUT : c;
  }
  p = { anc: new THREE.BufferAttribute(G.anc, 3), grow: new THREE.BufferAttribute(t, 4), index: G.idx ? new THREE.BufferAttribute(G.idx, 1) : src.index! };
  src.userData.gpu = p;
  return p;
}
const SHARED = ['position', 'color', 'normal', 'aAnc', 'aGrow'] as const;
/**
 * The plant at growth g for the GPU: a light geometry sharing src's buffers (nothing is copied or uploaded again) plus
 * its growth (`aGrowth`, one value), drawn with the plant material; one per mesh, disposed with it (its dispose frees only its own vertex array
 * state, never src's buffers). Its bounding box is what shows at g (revealPlant's, worked out only when something asks:
 * the selection box, picking); its sphere is src's (culling). `userData.cpu()` = revealPlant(src, g), from `reveal` when
 * given (a cache). src itself when it has no growth tags.
 */
export function grownView(src: THREE.BufferGeometry, g: number, reveal = () => revealPlant(src, g)) {
  const G = src.userData.grow as GrowData | undefined;
  if (!G) return src;
  const p = gpuParts(src, G), out = new THREE.BufferGeometry();
  for (const k of ['position', 'color', 'normal'] as const) if (src.attributes[k]) out.setAttribute(k, src.attributes[k]);
  out.setAttribute('aAnc', p.anc); out.setAttribute('aGrow', p.grow); out.setIndex(p.index);
  out.setAttribute('aGrowth', new THREE.InstancedBufferAttribute(Float32Array.of(g), 1));
  if (!src.boundingSphere) src.computeBoundingSphere();
  out.boundingSphere = src.boundingSphere;
  let cpu: THREE.BufferGeometry | undefined, box: THREE.Box3 | null = null;
  const shown = () => (cpu ??= reveal());
  Object.defineProperty(out, 'boundingBox', {
    get: () => box ??= (shown().boundingBox ?? (shown().computeBoundingBox(), shown().boundingBox)),
    set: (b: THREE.Box3 | null) => { box = b; }, configurable: true,
  });
  out.userData.growth = g; out.userData.cpu = shown;
  out.dispose = function (this: THREE.BufferGeometry) {
    for (const k of SHARED) this.deleteAttribute(k);
    this.setIndex(null);
    THREE.BufferGeometry.prototype.dispose.call(this);
  };
  return out;
}
/** Dispose a built / bent / grounded plant with its GPU growth tags (dispose alone would leave their buffers behind). */
export function dropPlant(g: THREE.BufferGeometry) {
  const p = g.userData.gpu as { anc: THREE.BufferAttribute; grow: THREE.BufferAttribute; index: THREE.BufferAttribute } | undefined;
  if (p) { g.setAttribute('aAnc', p.anc); g.setAttribute('aGrow', p.grow); if (p.index !== g.index) g.setAttribute('aIdx', p.index); }
  g.dispose();
}
/** Raycast a plant mesh against what shows (its view's revealPlant geometry), not the full-growth buffers it draws. */
export function plantRaycast(this: THREE.Mesh, rc: THREE.Raycaster, hits: THREE.Intersection[]) {
  const v = this.geometry, cpu = (v.userData.cpu as (() => THREE.BufferGeometry) | undefined)?.();
  if (!cpu) return THREE.Mesh.prototype.raycast.call(this, rc, hits);
  this.geometry = cpu;
  try { THREE.Mesh.prototype.raycast.call(this, rc, hits); } finally { this.geometry = v; }
}
/** What the CPU sees of a mesh: a plant view's revealed geometry, else the mesh's own (the USDZ export). */
export const cpuGeometry = (m: THREE.Mesh) => (m.geometry.userData.cpu as (() => THREE.BufferGeometry) | undefined)?.() ?? m.geometry;
/**
 * GPU reveal, on the CPU (tests): the positions GROW_VERT gives every vertex at growth g (float32, as the GPU) and the
 * triangles drawn (the view's index).
 */
export function shaderReveal(src: THREE.BufferGeometry, g: number) {
  const G = src.userData.grow as GrowData, p = gpuParts(src, G), P = src.attributes.position.array as Float32Array, A = p.anc.array as Float32Array, T = p.grow.array as Float32Array;
  const f = Math.fround, u = f(g), pos = new Float32Array(P.length);
  for (let v = 0; v < P.length / 3; v++) {
    const a = T[v * 4], w = T[v * 4 + 1], e = T[v * 4 + 2], c = T[v * 4 + 3];
    let s = w > 0 ? f(f(u - a) / w) : u >= a ? 1 : -1;
    if (e > 0.5 && e < 2.5 && ((e < 1.5) === (u >= c))) s = -1;
    for (let q = 0; q < 3; q++) { const o = v * 3 + q; pos[o] = s < 1 ? f(A[o] + f(f(P[o] - A[o]) * Math.max(s, 0))) : P[o]; }
  }
  return { pos, index: p.index.array as ArrayLike<number> };
}

/** Room above the water an emerging plant needs to climb out (mm); with less it lies over at the surface. */
export const MIN_ROOM = 50;
/** Share of a sword's leaves reaching out of the water that turn emersed (the rest lie on the surface). */
const EMERSED_SHARE = 0.75;
/** How far a leaf or stem flops from its plant's spine heading: the bell curve's sd, rad (about 30°). */
const SPREAD = 0.5;
/** A piece's centreline before (a) and after (b) lying over, and per point the turn between them. */
interface Bent { a: Float32Array; b: Float32Array; q: THREE.Quaternion[] }
/** How a piece moves: with its parent (a side shoot's base), then by its own lying over, then along the glass. */
interface Rec { pre?: { B: Rec; t: number }; own?: Bent; wall?: Bent }
/** A leaf nearing a pane curves along it on an arc of about this radius (mm), and stays this far off the glass. */
const GLASS_ARC = 45, GLASS_GAP = 3;
/** Per point of a centreline: the turn taking its old direction (a) to its new one (b). */
function turnsOf(a: Float32Array, b: Float32Array) {
  const m = a.length / 3;
  const tan = (l: Float32Array, i: number) => {
    const i0 = Math.max(0, i - 1), i1 = Math.min(m - 1, i + 1);
    return V(l[i1 * 3] - l[i0 * 3], l[i1 * 3 + 1] - l[i0 * 3 + 1], l[i1 * 3 + 2] - l[i0 * 3 + 2]).normalize();
  };
  return Array.from({ length: m }, (_, i) => new THREE.Quaternion().setFromUnitVectors(tan(a, i), tan(b, i)));
}
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
  if (R.wall) moveOn(arr, o, R.wall, t);
}

/**
 * The plant with everything longer than the water above it lying over along the surface (`F` = the surface's height over
 * the plant's base, mm): each leaf or stem rises as built until it nears F, turns over and runs along just under it, in
 * the current's direction with its own wobble (vallisneria and balansae make sheets, stem tips droop along the top).
 * Leaves riding on a stem go with it. Rebuilds positions and normals (once per water level / place, not per growth
 * step); src itself when nothing reaches the surface.
 *
 * Lane GR2: `o.ceil` = the lid or the light over the base (mm). An 'emerge' plant with at least MIN_ROOM above the water
 * climbs on past it instead, straightening up once out of the water, and lies over only under the ceiling; above the
 * water each leaf shows its emersed twin. `o.water` = there is water: a lily's pads lie on it (hidden without).
 *
 * `o.walls` = the panes near the plant, in its own frame: per pane its outward normal (x, z) and its distance from the
 * base (mm), flat. A leaf or stem nearing one curves along it instead of being cut off at the glass (Nathan
 * 2026-10-15), keeping its height and how far it reaches sideways; F may then be Infinity (nothing reaches the water).
 */
export function bendPlant(src: THREE.BufferGeometry, F: number, o: { ceil?: number; water?: boolean; walls?: number[] } = {}) {
  const G = src.userData.grow as GrowData | undefined;
  const walls = o.walls ?? [], W = walls.length / 3;
  if (!G || (!Number.isFinite(F) && !W)) return src;
  const parent = new Map(G.links.map(([c, p, t]) => [c, [p, t]] as const)), rec: (Rec | null)[] = [];
  // emerging: a piece that climbs out (a stem, an emersed twin) lies over under the ceiling (Sc); the water line (F) is
  // where it turns emersed. A sword's submersed leaves still lie over at the water line
  const climbs = !!G.emerge && o.ceil != null && o.ceil - F >= MIN_ROOM, Sc = climbs ? o.ceil! - 4 : F, padSet = new Set(G.pads ?? []);
  const twinned = new Map<number, number>(), twins = new Set<number>();
  for (const [t, l] of G.twin ?? []) { twinned.set(t, l); twinned.set(l, l); twins.add(t); }
  /** Does piece p climb out (else it lies over at the water line)? */
  const up = (p: number) => climbs && (!twinned.has(p) || twins.has(p));
  const spine = Math.atan2(G.cz, G.cx);
  /** Bends a centreline: climbing out to the ceiling (emerge) or lying over at the water line. */
  const bender = (emerge: boolean) => {
  const S = emerge ? Sc : F;
  // the sweep: a leaf or stem nearing the surface curves over on an arc of radius R (about half the water depth,
  // as overgrown vallisneria and stems do: they lean more and more over the top of the water column, then lie along it),
  // never steeper than that arc allows for the room left above it (emerging: the arc fits in the room above the water)
  const R = emerge ? Math.max(30, Math.min(250, F * 0.5, (S - F) * 0.8)) : Math.max(50, Math.min(250, F * 0.5));
  /** The steepest a centreline may climb with `room` mm left under the surface (sine of its elevation). */
  const climb = (room: number) => room >= R ? 1 : room <= 0 ? Math.max(-0.2, room / R * 2) : Math.sqrt(1 - (1 - room / R) ** 2);
  return (line: Float32Array, p: number): Bent | null => {
    const m = line.length / 3;
    let top = -Infinity;
    for (let i = 1; i < line.length; i += 3) top = Math.max(top, line[i]);
    if ((top < S - R && !(emerge && top > F)) || m < 2) return null;
    const reach = top >= S;
    // where this one flops: the plant's spine (its current's heading: they all tend the same way) plus its own
    // deviation, drawn from a bell curve round the spine (sd SPREAD; its own stream per piece)
    const qr = rng(p * 7919 + 101 + Math.round(G.cz * 1e5)), gauss = Math.sqrt(-2 * Math.log(1 - qr() * 0.999)) * Math.cos(6.2832 * qr());
    const target = spine + SPREAD * gauss, tx = Math.cos(target), tz = Math.sin(target), ph = p * 2.39996;
    const out = new Float32Array(line.length);
    out[0] = line[0]; out[1] = line[1]; out[2] = line[2];
    // out of the water a piece holds itself up as a cantilever (lane GR2, Nathan 2026-10-15: "more flop"): each point
    // carries the weight of everything beyond it, so it bends by (free length beyond)^2 / stiffness. `Lc` = its stiffness
    // as a length (a piece Lc long droops its tip by about 1 rad): the species' value, a thicker stem stiffer, each piece
    // its own draw, and a leaf that starts steeper (an inner sword leaf) stiffer. What sags back to the water lies on it
    const seg = new Float32Array(m), rest = new Float32Array(m);
    for (let i = 0; i < m - 1; i++) seg[i] = Math.hypot(line[i * 3 + 3] - line[i * 3], line[i * 3 + 4] - line[i * 3 + 1], line[i * 3 + 5] - line[i * 3 + 2]);
    for (let i = m - 2, acc = 0; i >= 0; i--) { rest[i] = acc + seg[i] / 2; acc += seg[i]; }
    const qs = rng(p * 131 + 7 + Math.round(G.cx * 1e4)), steep = seg[0] > 1e-6 ? Math.max(0, (line[4] - line[1]) / seg[0]) : 1;
    const Lc = (G.stiff ?? 220) * (0.5 + 0.6 * qs()) * (0.8 + 0.35 * steep), Lc3 = Lc * Lc * Lc, Rl = G.land ?? 50;
    let turning = false, th = 0, along = 0, droop = 0, lying = false;
    for (let i = 0; i < m - 1; i++) {
      const o = i * 3, dx = line[o + 3] - line[o], dy = line[o + 4] - line[o + 1], dz = line[o + 5] - line[o + 2], L = Math.hypot(dx, dy, dz);
      if (L < 1e-6) { out[o + 3] = out[o]; out[o + 4] = out[o + 1]; out[o + 5] = out[o + 2]; continue; }
      let ux = dx / L, uy = dy / L, uz = dz / L;
      const y = out[o + 1];
      // below the arc it already starts to lean its way (the curve of the spine), more the higher it gets
      // (only one that reaches the surface; from no lower than 40 % of the depth)
      // (emerging: out of the water its own weight bends it further, the cantilever droop; never straighter than it
      // grew under water: Nathan 2026-10-15)
      if (emerge && !turning && y > F - 1) {
        if (lying) {
          // on the water: it wanders a little, and its last stretch turns back up into the air
          th += 0.1 * Math.sin(along / 70 + ph) * L / 70; along += L;
          const up = 0.55 * Math.max(0, 1 - rest[i] / (0.3 * Lc)), hz = Math.sqrt(1 - up * up);
          ux = Math.cos(th) * hz; uy = up; uz = Math.sin(th) * hz;
        }
        else {
          const h0 = Math.hypot(ux, uz), hd = h0 > 0.08 ? Math.atan2(uz, ux) : target;
          // (the lever stops where it would rest on the water again: what lies there is carried by the water)
          const lever = Math.min(rest[i], 0.8 * Lc);
          droop += 3 * lever * lever / Lc3 * L;
          let el = Math.max(-1.45, Math.atan2(uy, h0) - droop);
          // coming down to the water it levels out on a curve (radius Rl, the species' own: soft for a sword leaf,
          // tighter for a stem) instead of landing on a kink
          const above = y - F - 1;
          if (droop > 0.05 && el < 0 && above < Rl) el = Math.max(el, -Math.asin(Math.sqrt(Math.max(0, 1 - (1 - Math.max(0, above) / Rl) ** 2))));
          ux = Math.cos(hd) * Math.cos(el); uy = Math.sin(el); uz = Math.sin(hd) * Math.cos(el);
          // sagged back down to the water: from here it lies on it
          if ((y + uy * L < F + 1 || (above < 0.5 && uy <= 0.01)) && droop > 0.05) { lying = true; th = Math.atan2(uz, ux); uy = (F + 1 - y) / L; const k = Math.hypot(ux, uz) || 1, hz = Math.sqrt(Math.max(0, 1 - uy * uy)); ux *= hz / k; uz *= hz / k; }
        }
      }
      const from = emerge ? Math.max(F, S - 1.6 * R) : Math.max(0.4 * F, F - 2 * R), lean = reach ? 0.4 * Math.max(0, Math.min(1, (y - from) / Math.max(1, S - R - from))) : 0;
      if (!turning && lean > 0) { ux += tx * lean; uz += tz * lean; const k = Math.hypot(ux, uy, uz); ux /= k; uy /= k; uz /= k; }
      // the climb allowed at the middle of this step (estimated, then once more from the estimate)
      let lim = climb(S - y - Math.max(0, uy) * L / 2);
      lim = climb(S - y - Math.max(-0.2, Math.min(uy, lim)) * L / 2);
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
    return { a: line, b: out, q: turnsOf(line, out) };
  };
  };
  const bendUp = bender(true), bendOver = bender(false);
  /** A lily pad's stalk: stretched or shortened so its top (and the pad on it) lies on the water. */
  const padLine = (line: Float32Array, p: number): Bent => {
    const m = line.length / 3, k = (F + 3.4 + (p % 5) * 0.12) / Math.max(1, line[line.length - 2]), out = Float32Array.from(line);
    for (let i = 1; i < out.length; i += 3) out[i] *= k;
    return { a: line, b: out, q: Array.from({ length: m }, () => new THREE.Quaternion()) };
  };
  /** The steepest a centreline may head into a pane with `room` mm left before it (cosine share of its sideways run). */
  const toward = (room: number) => room >= GLASS_ARC ? 1 : room <= 0 ? Math.max(-0.3, room / GLASS_ARC * 2) : Math.sqrt(1 - (1 - room / GLASS_ARC) ** 2);
  /** Along the glass: each step keeps its rise and its sideways length, but heads into a pane no more than the arc
   *  allows for the room left, the rest turned along the pane (straight at it: either way, its own draw). */
  const hug = (line: Float32Array, p: number): Bent | null => {
    const m = line.length / 3;
    let near = false;
    for (let i = 0; i < m && !near; i++) for (let w = 0; w < W; w++) if (line[i * 3] * walls[w * 3] + line[i * 3 + 2] * walls[w * 3 + 1] > walls[w * 3 + 2] - GLASS_GAP - GLASS_ARC) { near = true; break; }
    if (!near || m < 2) return null;
    const side = ((p * 2654435761) >>> 0) & 1 ? 1 : -1, out = new Float32Array(line.length);
    out[0] = line[0]; out[1] = line[1]; out[2] = line[2];
    for (let i = 0; i < m - 1; i++) {
      const j = i * 3;
      let dx = line[j + 3] - line[j], dz = line[j + 5] - line[j + 2];
      const h = Math.hypot(dx, dz);
      if (h > 1e-6) for (let w = 0; w < W; w++) {
        const nx = walls[w * 3], nz = walls[w * 3 + 1], into = (dx * nx + dz * nz) / h;
        const lim = toward(walls[w * 3 + 2] - GLASS_GAP - (out[j] * nx + out[j + 2] * nz) - Math.max(0, into) * h / 2);
        if (into <= lim) continue;
        let tx = dx / h - into * nx, tz = dz / h - into * nz;
        const t = Math.hypot(tx, tz);
        if (t < 0.05) { tx = -nz * side; tz = nx * side; } else { tx /= t; tz /= t; }
        const k = Math.sqrt(Math.max(0, 1 - lim * lim));
        dx = (tx * k + nx * lim) * h; dz = (tz * k + nz * lim) * h;
      }
      out[j + 3] = out[j] + dx; out[j + 4] = line[j + 4] - line[j + 1] + out[j + 1]; out[j + 5] = out[j + 2] + dz;
    }
    return { a: line, b: out, q: turnsOf(line, out) };
  };
  G.pieces.forEach((line0, p) => {
    if (padSet.has(p)) { rec[p] = o.water ? { own: padLine(line0, p) } : null; return; }
    // a piece on another one (a side shoot) first goes where its parent took its base, then lies over itself
    const pp = parent.get(p), pre = pp && rec[pp[0]] ? { B: rec[pp[0]]!, t: pp[1] } : undefined;
    let line = line0;
    if (pre) { line = Float32Array.from(line0); for (let o = 0; o < line.length; o += 3) moveBy(line, o, pre.B, pre.t); }
    const own = Number.isFinite(F) ? (up(p) ? bendUp : bendOver)(line, p) : null, wall = W ? hug(own?.b ?? line, p) : null;
    rec[p] = own || pre || wall ? { pre, own: own ?? undefined, wall: wall ?? undefined } : null;
  });
  if (rec.every(b => !b)) return src;
  const P = src.attributes.position.array as Float32Array, n = P.length / 3, pos = Float32Array.from(P), anc = Float32Array.from(G.anc);
  for (let v = 0; v < n; v++) {
    const p = G.pc[v], B = p >= 0 ? rec[p] : null;
    if (!B) continue;
    moveBy(pos, v * 3, B, G.par[v]); moveBy(anc, v * 3, B, G.apar[v]);
    // whatever still sticks up past the surface (the leaves on a stem lying along it) is pressed flat against it
    const S = up(p) ? Sc : F;
    if (!padSet.has(p)) for (const arr of [pos, anc]) if (arr[v * 3 + 1] > S) arr[v * 3 + 1] = S + (arr[v * 3 + 1] - S) * 0.12;
    // and whatever of a blade still reaches past a pane (its edge, turned toward the glass) is pressed in against it
    for (let w = 0; w < W; w++) for (const arr of [pos, anc]) {
      const nx = walls[w * 3], nz = walls[w * 3 + 1], s = arr[v * 3] * nx + arr[v * 3 + 2] * nz - (walls[w * 3 + 2] - 1);
      if (s > 0) { arr[v * 3] -= nx * s; arr[v * 3 + 2] -= nz * s; }
    }
  }
  // which form each leaf shows (lane GR2): `cut` = the growth from which a leaf shows its emersed twin, before it the
  // submersed one (revealPlant). A leaf on a stem: emersed once its base on the bent stem is out of the water (from the
  // start, or never). A sword's leaf: once grown long enough to reach out of the water, for about half its leaves (the
  // rest lie on the surface as before; a sword out of the water still keeps submersed leaves). Pads: with water only
  let gr = G.gr, cut: Float32Array | undefined;
  if (G.em && G.gr0) {
    gr = Float32Array.from(G.gr0); cut = new Float32Array(n).fill(Infinity);
    const aw = new Map<number, number>(), at = new Map<number, number>();
    for (let v = 0; v < n; v++) if (G.em[v] === SUB && twinned.has(G.pc[v]) && !aw.has(G.pc[v])) aw.set(G.pc[v], v);
    /** The growth at which rosette leaf l (scaling up from its base as it grows) first reaches past the water. */
    const cutOf = (l: number) => {
      let c = at.get(l);
      if (c != null) return c;
      const line = G.pieces[l], v = aw.get(l), half = ((l * 2654435761) >>> 0) / 2 ** 32 < EMERSED_SHARE;
      let top = -Infinity;
      for (let i = 1; i < line.length; i += 3) top = Math.max(top, line[i]);
      const need = (F + 2 - line[1]) / Math.max(1e-3, top - line[1]);
      c = !half || v == null || need >= 1 ? Infinity : G.gr0![v * 2] + G.gr0![v * 2 + 1] * Math.max(0, need);
      at.set(l, c);
      return c;
    };
    for (let v = 0; v < n; v++) {
      const e = G.em[v];
      if (!e) continue;
      if (e === PAD) { if (!o.water) gr[v * 2] = HIDE; continue; }
      if (!climbs) continue; // (no room: every leaf stays submersed)
      const l = twinned.get(G.pc[v]);
      cut[v] = l != null ? cutOf(l) : anc[v * 3 + 1] > F ? -Infinity : Infinity;
    }
  }
  const em = G.em, never = (v: number) => gr[v * 2] >= HIDE || (!!cut && (em![v] === SUB ? cut[v] === -Infinity : em![v] === EMERSED && cut[v] === Infinity));
  const lv = em ? liveOf(src.index!.array, n, never) : {};
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', src.attributes.color);
  g.setIndex(src.index);
  g.computeVertexNormals();
  g.computeBoundingBox(); g.computeBoundingSphere();
  Object.assign(g.userData, src.userData, { grow: { ...G, anc, gr, cut, ...lv } });
  delete g.userData.gpu; // (src's GPU tags: this one gets its own)
  return g;
}

// ---------- Prebuild in a worker (lane GR4, 2026-10-15) ----------
// A plant's full growth (65..350 ms to build, more to bend) is built off the main thread ahead of its first growth
// (render/plantWorker.ts), so the first drag is warm. The geometry crosses as plain arrays (moved, not copied).

/** A geometry as plain arrays: attributes, index, bounds, userData (growth tags: typed arrays and numbers only). */
export interface Packed { attrs: Record<string, [Float32Array, number]>; index?: Uint32Array | Uint16Array; box?: number[]; sphere?: number[]; userData: Record<string, unknown> }
/** Pack g; `skip` = attributes and index left out (a bent plant shares its colours and triangles with the built one). */
export function packGeometry(g: THREE.BufferGeometry, skip: string[] = []): Packed {
  const attrs: Packed['attrs'] = {};
  for (const [k, a] of Object.entries(g.attributes)) if (!skip.includes(k)) attrs[k] = [a.array as Float32Array, a.itemSize];
  const b = g.boundingBox, s = g.boundingSphere;
  return { attrs, index: skip.includes('index') || !g.index ? undefined : g.index.array as Uint32Array, box: b ? [...b.min.toArray(), ...b.max.toArray()] : undefined, sphere: s ? [...s.center.toArray(), s.radius] : undefined, userData: g.userData };
}
export function unpackGeometry(p: Packed, base?: THREE.BufferGeometry) {
  const g = new THREE.BufferGeometry();
  for (const [k, [a, n]] of Object.entries(p.attrs)) g.setAttribute(k, new THREE.BufferAttribute(a, n));
  if (base) for (const k of ['color', 'normal']) if (!p.attrs[k] && base.attributes[k]) g.setAttribute(k, base.attributes[k]);
  g.setIndex(p.index ? new THREE.BufferAttribute(p.index, 1) : base?.index ?? null);
  if (p.box) g.boundingBox = new THREE.Box3(new THREE.Vector3().fromArray(p.box), new THREE.Vector3().fromArray(p.box, 3));
  if (p.sphere) g.boundingSphere = new THREE.Sphere(new THREE.Vector3().fromArray(p.sphere), p.sphere[3]);
  Object.assign(g.userData, p.userData);
  return g;
}
/** Every distinct ArrayBuffer under v (the transfer list). */
export function buffersOf(v: unknown, out = new Set<ArrayBuffer>()) {
  if (ArrayBuffer.isView(v)) out.add(v.buffer as ArrayBuffer);
  else if (Array.isArray(v)) for (const x of v) buffersOf(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) buffersOf(x, out);
  return out;
}
/** A prebuild job: plantGeometry's arguments and the lying over (water over the base F, ceiling C) to apply; a carpet
 *  is kept until its `ground` message brings where each leaflet lands (looked up on the main thread). */
export type PlantJob = { id: number; args: Parameters<typeof plantGeometry>; switches: typeof plant3d; bend?: { F: number; C?: number; water: boolean; walls?: number[] }; carpet?: boolean }
  | { id: number; ground: Float32Array };
export interface JobOut { id: number; full?: Packed; bent?: Packed; ground?: Packed; anchors?: Float32Array }
const kept = new Map<number, THREE.BufferGeometry>();
/** Run a job (in the worker): the built plant and, when it lies over, the bent one (its colours and triangles shared).
 *  A carpet first hands back only its leaflets' anchors; its `ground` (x, y, z, w per leaflet, NaN = left out) then
 *  brings back the built carpet and the carpet set on the ground (its colours, normals and triangles shared). */
export function runJob(j: PlantJob): JobOut {
  if ('ground' in j) {
    const full = kept.get(j.id)!, q = j.ground;
    kept.delete(j.id);
    const g = carpetOnGround(full, (_x, _z, i) => Number.isNaN(q[i * 4]) ? null : { x: q[i * 4], y: q[i * 4 + 1], z: q[i * 4 + 2], w: q[i * 4 + 3] });
    return { id: j.id, full: packGeometry(full), ground: packGeometry(g, ['color', 'normal', 'index']) };
  }
  Object.assign(plant3d, j.switches);
  const full = plantGeometry(...j.args);
  if (j.carpet) { kept.set(j.id, full); return { id: j.id, anchors: Float32Array.from(full.userData.anchors as Float32Array) }; }
  const b = j.bend ? bendPlant(full, j.bend.F, { ceil: j.bend.C, water: j.bend.water, walls: j.bend.walls }) : full;
  return { id: j.id, full: packGeometry(full), bent: b === full ? undefined : packGeometry(b, ['color', 'index']) };
}
/** Send a plant's buffers (with its GPU growth tags) to the GPU now, by drawing it into a 1 x 1 target, so its first
 *  draw in the tank uploads nothing (several MB for a grown stem clump or carpet): one buffer per call (each draw
 *  uploads only what is new), `step` 0, 1, ... Returns the next step, or -1 once everything is up. */
let upTarget: THREE.WebGLRenderTarget | undefined;
const upScene = new THREE.Scene(), upCam = new THREE.OrthographicCamera(), upMat = new THREE.MeshBasicMaterial();
export function uploadPlant(r: THREE.WebGLRenderer, src: THREE.BufferGeometry, step = 0) {
  const all = grownView(src, 1);
  if (all === src) return -1;
  // (positions first, drawn without triangles; then the triangles; then one attribute at a time)
  const has = ['position', 'index', 'color', 'normal', 'aAnc', 'aGrow'].filter(k => k === 'index' || all.attributes[k]), ks = has.slice(0, step + 1), v = new THREE.BufferGeometry();
  for (const k of ks) if (k !== 'index') v.setAttribute(k, all.attributes[k]);
  v.setIndex(ks.includes('index') ? all.index : null); v.boundingSphere = all.boundingSphere; v.dispose = all.dispose;
  const m = new THREE.Mesh(v, upMat), was = r.getRenderTarget();
  m.frustumCulled = false; upScene.add(m);
  r.setRenderTarget(upTarget ??= new THREE.WebGLRenderTarget(1, 1));
  r.render(upScene, upCam);
  r.setRenderTarget(was);
  upScene.remove(m); v.dispose(); all.dispose();
  return ks.length < has.length ? step + 1 : -1;
}
