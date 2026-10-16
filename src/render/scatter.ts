// Scatter (lane T1, 2026-10-16): many small things strewn over the ground as instanced meshes, a few draw calls for the
// lot. `scatter` is the shared tool: points drawn from a seed over the floor (thinned by a clumping field, kept off the
// glass and steep banks), each copy lying on the ground's tilt, turned and sized at random, lifted just clear of the
// ground and of the copies under it. Leaf litter is its first use (`litterMeshes`); pebbles or fine grass would bring
// their own kinds (geometry + material + size) and reuse the rest.
import * as THREE from 'three';
import { rng } from '../art/paint';
import { clamp, waterY } from '../scene/physics';
import { footprint } from '../scene/shape';
import type { LeafKind, Litter, Tank, TankSetup } from '../scene/types';

/** World position [x, y, z] of the ground at floor-plan point (x, depth); z = -depth (render/build.ts `G`). */
export type GroundAt = (x: number, d: number) => [number, number, number];
/** One kind of scattered thing: geometry in units of its size (long axis = local x, from -reach to +reach, lying in
 *  the xz plane, y up), its material, how often it is picked and its size range (mm). */
export interface ScatterKind { geo: THREE.BufferGeometry; mat: THREE.Material; weight: number; size: [number, number]; reach: number }
export interface ScatterSpec {
  seed: number; count: number; kinds: ScatterKind[];
  /** mm above the ground: random range. `pile` mm: each copy rests on the copies already under it (a 10 mm height grid
   *  over the floor, raised by `pile` under each copy's middle), so overlapping copies stack instead of cutting through. */
  lift: [number, number]; pile: number;
  /** Random tilt off the ground's tilt (radians); steepest ground kept (minimum normal y); clumping 0 = even, 1 = drifts. */
  tilt: number; slope: number; clump: number;
  /** Colour factor by height (mm): soaked leaves under the water are darker. */
  shade?: (y: number) => number;
  /** Grains (3D substrate): lift and pile also in units of each copy's size (sunk in: negative lift), the pile grid's
   *  cell (mm, default 10), and a palette each copy's colour is drawn from (default: a warm jitter round white). */
  liftK?: [number, number]; pileK?: number; cell?: number; palette?: THREE.Color[];
}

/** Signed distance (mm) to the tank's outline, positive inside: shape.ts `insideBy` with the outline fetched once. */
export function insideIn(T: Tank) {
  const E = footprint(T).edges.map(e => [e.a[0], e.a[1], e.n[0], e.n[1]]);
  return (x: number, d: number) => { let m = Infinity; for (const [ax, ad, nx, nd] of E) m = Math.min(m, -((x - ax) * nx + (d - ad) * nd)); return m; };
}
/** Strew spec.count copies over the tank floor; one InstancedMesh per kind that got any. */
export function scatter(T: Tank, ground: GroundAt, spec: ScatterSpec): THREE.InstancedMesh[] {
  const r = rng(spec.seed * 7919 + 13), { L, D } = T, tot = spec.kinds.reduce((a, k) => a + k.weight, 0);
  const ph = Array.from({ length: 6 }, () => r() * Math.PI * 2), f1 = 1 / (90 + r() * 60), f2 = 1 / (130 + r() * 80);
  // clumping field: two crossed, warped waves (drifts 150-300 mm across), 0..1
  const field = (x: number, d: number) => 0.5 + 0.3 * Math.sin(x * f1 + ph[0] + 1.3 * Math.sin(d * f2 + ph[1])) + 0.2 * Math.sin(d * f1 * 1.3 + ph[2] + Math.sin(x * f2 + ph[3]));
  // flat arrays and scratch objects throughout (a fresh vector / matrix / colour per copy made 30k grains take 160 ms)
  const per: number[][] = spec.kinds.map(() => []), tint: number[][] = spec.kinds.map(() => []);
  const n = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), qy = new THREE.Quaternion(), qt = new THREE.Quaternion();
  const ax = new THREE.Vector3(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), mx = new THREE.Matrix4(), col = new THREE.Color(), e = 4;
  const PROBES = [[-1, 0], [1, 0], [0, -0.5], [0, 0.5]];
  const inBy = insideIn(T); // shape.ts insideBy without its outline lookup per call (that was most of the time)
  let placed = 0;
  // the pile: a height grid over the floor (padded past the glass by the widest copy's half reach)
  const PC = spec.cell ?? 10, pad = Math.ceil(Math.max(...spec.kinds.map(k => k.size[1] * k.reach)) * 0.5 / PC) + 2;
  const NX = Math.ceil(L / PC) + 2 * pad, NZ = Math.ceil(D / PC) + 2 * pad, pile = new Float32Array(NX * NZ);
  const cells = (x: number, d: number, rad: number, f: (k: number) => void) => {
    for (let i = Math.floor((x - rad) / PC); i <= Math.floor((x + rad) / PC); i++) for (let j = Math.floor((d - rad) / PC); j <= Math.floor((d + rad) / PC); j++)
      if (((i + 0.5) * PC - x) ** 2 + ((j + 0.5) * PC - d) ** 2 <= rad * rad + PC * PC / 2) f((i + pad) * NZ + j + pad);
  };
  for (let tries = 0; placed < spec.count && tries < spec.count * 6; tries++) {
    const x = r() * L, d = r() * D, pick = r() * tot, a = r() * Math.PI * 2, u = r(), mirror = r() < 0.5, tilt = r(), tiltA = r() * Math.PI * 2;
    const keep = r(), lift01 = r(), lift = spec.lift[0] + lift01 * (spec.lift[1] - spec.lift[0]), shade = r(), hue = r(), pal = spec.palette ? r() : 0; // pal only for grains: litter layouts unchanged
    if (keep > 1 - spec.clump + spec.clump * clamp((field(x, d) - 0.25) / 0.5, 0, 1)) continue;
    let ki = 0; for (let acc = spec.kinds[0].weight; acc < pick && ki < spec.kinds.length - 1;) acc += spec.kinds[++ki].weight;
    const K = spec.kinds[ki], size = K.size[0] + u * (K.size[1] - K.size[0]), reach = size * K.reach;
    if (inBy(x, d) < reach * 0.25) continue; // near the glass: its ends and sides are checked below
    const g = ground(x, d), gx0 = ground(x - e, d), gx1 = ground(x + e, d), gd0 = ground(x, d - e), gd1 = ground(x, d + e);
    n.set(gx1[0] - gx0[0], gx1[1] - gx0[1], gx1[2] - gx0[2]).cross(b.set(gd0[0] - gd1[0], gd0[1] - gd1[1], gd0[2] - gd1[2])).normalize();
    if (n.y < 0) n.negate();
    if (n.y < spec.slope) continue; // too steep to stay put
    // its two ends clear the ground (a long leaf over a hump would dip into it): lift by the worst shortfall
    const cx = Math.cos(a), cz = -Math.sin(a); let under = 0, over = 0, out = false;
    // both ends and both sides (half as far: the long axis is the reach)
    for (const [s, w] of PROBES) {
      const ex = x + (cx * s - cz * w) * reach, ed = d - (cz * s + cx * w) * reach; if (inBy(ex, ed) < 1) { out = true; break; }
      const plane = g[1] - (n.x * (ex - x) + n.z * (-(ed - d))) / n.y, gy = ground(ex, ed)[1];
      under = Math.max(under, gy - plane); over = Math.max(over, plane - gy);
    }
    // one end would hang out over a drop (a bank's edge) or run into a wall (its foot): it would have slid off; small
    // humps just lift it
    if (out || over > reach * 0.25 || under > reach * 0.25) continue; // `out`: would poke through the glass
    q.setFromUnitVectors(up, n); qy.setFromAxisAngle(up, a); ax.set(Math.cos(tiltA), 0, Math.sin(tiltA)); qt.setFromAxisAngle(ax, tilt * spec.tilt);
    q.multiply(qt).multiply(qy);
    let top = 0; cells(x, d, reach * 0.5, k => { top = Math.max(top, pile[k]); });
    const lk = spec.liftK ? (spec.liftK[0] + lift01 * (spec.liftK[1] - spec.liftK[0])) * size : 0;
    const h = lift + lk + under + top, inc = spec.pile + (spec.pileK ?? 0) * size;
    if (inc) cells(x, d, reach * 0.5, k => { pile[k] = top + inc; });
    pos.set(g[0] + n.x * h, g[1] + n.y * h, g[2] + n.z * h); scl.set(size, size, mirror ? -size : size);
    const pm = per[ki]; for (const v of mx.compose(pos, q, scl).elements) pm.push(v);
    const k = spec.shade?.(pos.y) ?? 1;
    if (spec.palette) col.copy(spec.palette[Math.floor(pal * spec.palette.length)]).multiplyScalar(0.85 + shade * 0.3);
    else col.setRGB(0.82 + shade * 0.3, 0.82 + shade * 0.3 - (hue - 0.5) * 0.06, 0.82 + shade * 0.3 - (hue - 0.5) * 0.12);
    tint[ki].push(col.r * k, col.g * k, col.b * k);
    placed++;
  }
  const out: THREE.InstancedMesh[] = [];
  spec.kinds.forEach((K, i) => {
    if (!per[i].length) return;
    const m = new THREE.InstancedMesh(K.geo, K.mat, per[i].length / 16);
    m.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(per[i]), 16);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(tint[i]), 3);
    m.computeBoundingSphere(); m.userData.scatter = true;
    out.push(m);
  });
  return out;
}

// ---------- leaf litter ----------

/** Leaf looks: length range (mm), width / length, outline, colours of the upper and the under side. */
interface LeafLook { size: [number, number]; aspect: number; lobes: number; widest: number; top: string[]; under: string[]; vein: number; gloss: number }
const LEAVES: Record<Exclude<LeafKind, 'mixed'>, LeafLook> = {
  // dry oak: lobed, tan to chestnut, pale midrib
  oak: { size: [35, 75], aspect: 0.6, lobes: 4, widest: 0.6, vein: 1.25, gloss: 0,
    top: ['#8a5a2e', '#9b6a38', '#7a4b26', '#a8773f', '#6d4424', '#8f6236'], under: ['#ad885a', '#b8936a', '#a07a4e'] },
  // southern magnolia: leathery, long oval, dark brown and faintly glossy above, rusty felt below
  magnolia: { size: [60, 120], aspect: 0.4, lobes: 0, widest: 0.5, vein: 1.15, gloss: 0.14,
    top: ['#4a3420', '#5a3f26', '#3e2c1c', '#6b4a2a', '#54392a'], under: ['#9a5a2c', '#a8652f', '#8a4f27'] },
  // Indian almond (catappa): broad near the tip, red-brown to ochre, pale prominent veins
  catappa: { size: [70, 140], aspect: 0.55, lobes: 0, widest: 0.7, vein: 1.4, gloss: 0.05,
    top: ['#7a3b1e', '#94491f', '#a8582a', '#6a3018', '#b86a30', '#8a5426'], under: ['#a86a3a', '#b67a46', '#9a6034'] },
};
const KINDS = ['oak', 'magnolia', 'catappa'] as const;
const CELL = 384, COLS = 4; // atlas: a row per leaf kind; columns: two upper sides, an under side, a broken piece
/** Half-width (fraction of leaf length) at u (0 = stalk end, 1 = tip). */
function halfWidth(t: LeafLook, u: number, side: number, wob: number[]) {
  if (u <= 0 || u >= 1) return 0;
  const p = Math.log(0.5) / Math.log(t.widest), s = Math.sin(Math.PI * Math.pow(u, p)); // widest at t.widest
  let w = t.aspect / 2 * Math.pow(s, 0.8);
  // oak: deep rounded lobes with narrow sinuses between them, the two sides out of step
  if (t.lobes) w *= 0.3 + 0.7 * Math.pow(Math.abs(Math.sin(Math.PI * (t.lobes * u + (side > 0 ? 0.15 : 0.45)))), 0.35);
  return w * (1 + 0.04 * Math.sin(u * 23 + wob[side > 0 ? 0 : 1]) + 0.03 * Math.sin(u * 61 + wob[2]));
}
function hexRgb(h: string) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
const rgba = (c: number[], k = 1, a = 1) => `rgba(${c.map(v => Math.round(clamp(v * k, 0, 255))).join(',')},${a})`;
/** One leaf in its atlas cell: outline, colour drift and blotches, veins, a darker rim, fine grain; a broken piece
 *  loses a ragged chunk and gets holes. */
function drawLeaf(x: CanvasRenderingContext2D, ox: number, oy: number, t: LeafLook, variant: number, r: () => number) {
  const under = variant === 2, broken = variant === 3, pal = under ? t.under : t.top;
  const len = CELL * 0.9, x0 = ox + CELL * 0.05, cy = oy + CELL / 2, wob = [r() * 9, r() * 9, r() * 9];
  const P = (u: number, side: number) => [x0 + u * len, cy + side * halfWidth(t, u, side, wob) * len];
  const outline = () => {
    x.beginPath(); x.moveTo(x0, cy);
    for (let i = 1; i <= 90; i++) { const [px, py] = P(i / 90, -1); x.lineTo(px, py); }
    for (let i = 89; i >= 1; i--) { const [px, py] = P(i / 90, 1); x.lineTo(px, py); }
    x.closePath();
  };
  const base = hexRgb(pal[Math.floor(r() * pal.length)]), tip = hexRgb(pal[Math.floor(r() * pal.length)]);
  x.save(); outline(); x.clip();
  const g = x.createLinearGradient(x0, 0, x0 + len, 0); g.addColorStop(0, rgba(base, 0.95)); g.addColorStop(1, rgba(tip, 1.05));
  x.fillStyle = g; x.fillRect(ox, oy, CELL, CELL);
  for (let i = 0; i < 14; i++) { // broad patches of another shade from the palette: the leaf dried unevenly
    const px = x0 + r() * len, py = cy + (r() - 0.5) * t.aspect * len, rad = 25 + r() * 70, c = hexRgb(pal[Math.floor(r() * pal.length)]);
    const bg = x.createRadialGradient(px, py, 0, px, py, rad);
    bg.addColorStop(0, rgba(c, 0.8 + r() * 0.4, 0.35)); bg.addColorStop(1, rgba(c, 1, 0));
    x.fillStyle = bg; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 26; i++) { // small soft mottles, mostly darker
    const px = x0 + r() * len, py = cy + (r() - 0.5) * t.aspect * len, rad = 4 + r() * 16, dark = r() < 0.7;
    const bg = x.createRadialGradient(px, py, 0, px, py, rad);
    bg.addColorStop(0, dark ? 'rgba(30,15,5,0.2)' : 'rgba(255,225,170,0.12)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = bg; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  // fine reticulate veinlets between the main veins, barely there
  x.lineWidth = 0.7;
  for (let i = 0; i < 160; i++) {
    const px = x0 + r() * len, py = cy + (r() - 0.5) * t.aspect * len, a = r() * Math.PI, l = 4 + r() * 10;
    x.strokeStyle = r() < 0.5 ? 'rgba(255,230,190,0.1)' : 'rgba(20,10,4,0.12)';
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  // veins: midrib (raised and paler on the under side), side veins curving out toward the edge
  const vc = under ? 1.35 : t.vein; x.lineCap = 'round';
  x.strokeStyle = rgba(base, vc, 0.8); x.lineWidth = under ? 5 : 3.5;
  x.beginPath(); x.moveTo(x0, cy); for (let i = 1; i <= 20; i++) { const u = i / 20; x.lineTo(x0 + u * len, cy + Math.sin(u * 3 + wob[0]) * 1.5); } x.stroke();
  const nv = t.lobes ? t.lobes + 1 : 7 + Math.floor(r() * 3);
  for (const side of [-1, 1]) for (let k = 1; k <= nv; k++) {
    const u = (k - 0.5 + (side > 0 ? 0.25 : 0)) / (nv + 0.5) * 0.92, ue = Math.min(0.97, u + 0.16), [ex, ey] = P(ue, side);
    x.strokeStyle = rgba(base, vc, under ? 0.6 : 0.42); x.lineWidth = under ? 2.2 : 1.4;
    x.beginPath(); x.moveTo(x0 + u * len, cy); x.quadraticCurveTo(x0 + (u + 0.1) * len, cy + (ey - cy) * 0.35, ex, ey * 0.96 + cy * 0.04); x.stroke();
  }
  if (t.gloss && !under) { // leathery sheen along one half
    const sg = x.createLinearGradient(0, cy - t.aspect * len * 0.4, 0, cy); sg.addColorStop(0, 'rgba(255,240,215,0)'); sg.addColorStop(0.6, `rgba(255,240,215,${t.gloss})`); sg.addColorStop(1, 'rgba(255,240,215,0)');
    x.fillStyle = sg; x.fillRect(ox, oy, CELL, CELL);
  }
  outline(); x.strokeStyle = 'rgba(25,12,4,0.35)'; x.lineWidth = 5; x.stroke(); // a slightly darker, drier rim
  x.restore();
  // stalk
  x.strokeStyle = rgba(base, 0.7); x.lineWidth = 4; x.beginPath(); x.moveTo(x0 + 6, cy); x.lineTo(ox + CELL * 0.015, cy + (r() - 0.5) * 8); x.stroke();
  // fine grain over the leaf (only where it is drawn)
  const im = x.getImageData(ox, oy, CELL, CELL), d = im.data;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { const k = 1 + (r() - 0.5) * 0.14; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
  x.putImageData(im, ox, oy);
  x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
  if (broken) { // a slanted, finely ragged tear across the leaf: everything past it gone
    const u0 = 0.5 + r() * 0.2, slant = (r() - 0.5) * 0.5, pts: number[][] = [];
    for (let i = 0; i <= 40; i++) { const v = i / 40 - 0.5; pts.push([x0 + (u0 + slant * v + (r() - 0.5) * 0.025) * len, cy + v * CELL]); }
    x.beginPath(); x.moveTo(ox + CELL, oy); pts.forEach(([px, py]) => x.lineTo(px, py)); x.lineTo(ox + CELL, oy + CELL); x.closePath(); x.fill();
  }
  for (let i = Math.floor(r() * (broken ? 3 : 2.4)); i > 0; i--) { // insect holes
    const px = x0 + (0.15 + r() * 0.6) * len, py = cy + (r() - 0.5) * t.aspect * len * 0.6, rad = 2 + r() * 6;
    x.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, q = rad * (0.7 + r() * 0.5); x.lineTo(px + Math.cos(a) * q, py + Math.sin(a) * q); } x.closePath(); x.fill();
  }
  x.restore();
}
let atlas: THREE.CanvasTexture | undefined;
function leafAtlas() {
  if (atlas) return atlas;
  const c = document.createElement('canvas'); c.width = CELL * COLS; c.height = CELL * KINDS.length;
  const x = c.getContext('2d')!, r = rng(4242);
  KINDS.forEach((k, row) => { for (let v = 0; v < COLS; v++) drawLeaf(x, v * CELL, row * CELL, LEAVES[k], v, r); });
  atlas = new THREE.CanvasTexture(c); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4; atlas.userData.keep = true;
  return atlas;
}
/** A leaf's surface over its whole atlas cell (1 x 1, the leaf 0.9 long): cupped across, the tip and stalk curled up,
 *  a slight twist; lowest along the midrib at y = 0. */
function leafGeometry(kind: number, variant: number, r: () => number) {
  const t = LEAVES[KINDS[kind]], hw = t.aspect * 0.45, cup = (0.06 + r() * 0.16) * hw, curl = (0.02 + r() * 0.12) * 0.45, twist = (r() - 0.5) * 0.12;
  // only as wide as the leaf (its widest half-width plus the outline's wobble): the cell's empty margins were most of
  // the shaded fragments (3.6 ms at full density on the terrarium example)
  const zw = hw * 1.1 + 0.01, x0 = -0.49, x1 = 0.47;
  const g = new THREE.PlaneGeometry(x1 - x0, 2 * zw, 10, 4).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, 0), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Z = p.getZ(i), lift = cup * (Z / hw) ** 2 + curl * (X / 0.45) ** 2 * (X > 0 ? 1 : 0.5) + twist * X * Z;
    p.setY(i, lift);
    uv.setXY(i, (variant + X + 0.5) / COLS, 1 - (kind + 0.5 + Z) / KINDS.length); // cell coordinates from the position
  }
  g.computeVertexNormals(); g.userData.keep = true;
  return g;
}
let kinds: { geo: THREE.BufferGeometry; kind: number; variant: number }[] | undefined, leafMat: THREE.MeshBasicMaterial | undefined;
/** Leaf-litter scatter kinds for the setting's leaf look: per leaf kind two upper sides, an under side and a piece. */
function leafKinds(leaf: LeafKind): ScatterKind[] {
  if (!kinds) { const r = rng(77); kinds = KINDS.flatMap((_, k) => [0, 1, 2, 3].map(v => ({ geo: leafGeometry(k, v, r), kind: k, variant: v }))); }
  if (!leafMat) { leafMat = new THREE.MeshBasicMaterial({ map: leafAtlas(), alphaTest: 0.5, side: THREE.DoubleSide }); leafMat.userData.keep = true; }
  const share = leaf === 'mixed' ? [0.4, 0.3, 0.3] : KINDS.map(k => (k === leaf ? 1 : 0));
  return kinds.filter(k => share[k.kind] > 0).map(k => {
    const t = LEAVES[KINDS[k.kind]], piece = k.variant === 3, s = piece ? 0.6 : 1;
    return { geo: k.geo, mat: leafMat!, weight: share[k.kind] * [0.32, 0.32, 0.18, 0.18][k.variant], size: [t.size[0] * s / 0.9, t.size[1] * s / 0.9], reach: 0.45 };
  });
}
/** How many leaves make the setting's density: at 100 % the floor is mostly covered, piled in drifts. */
export function litterCount(l: Litter, area: number) {
  const ks = leafKinds(l.leaf), tot = ks.reduce((a, k) => a + k.weight, 0);
  const mean = ks.reduce((a, k) => { const t = LEAVES[KINDS[kinds!.find(c => c.geo === k.geo)!.kind]], s = (k.size[0] + k.size[1]) / 2 * 0.9; return a + k.weight * s * s * t.aspect * 0.65; }, 0) / tot;
  return Math.min(4000, Math.round(l.density / 100 * 3.5 * area / mean));
}
/** The tank's leaf litter, lying on the ground given by `ground` (absent or 0 % = none). */
export function litterMeshes(S: TankSetup, T: Tank, ground: GroundAt, area = footprint(T).area): THREE.InstancedMesh[] {
  const l = S.substrate.litter; if (!l?.density) return [];
  const wy = S.water.on ? waterY(T, S.water.level) : -Infinity;
  return scatter(T, ground, { seed: l.seed, count: litterCount(l, area), kinds: leafKinds(l.leaf), lift: [0.5, 1.5], pile: 2.5, tilt: 0.12, slope: 0.55, clump: 0.7,
    shade: y => (y < wy ? 0.55 : 1) });
}
