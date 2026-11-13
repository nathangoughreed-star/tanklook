// Contact shadows and grounding (plan VF stage VF4, lane VF-C, 2026-11-11; fx `contact`, render/fx.ts).
// Pieces sat on the ground as if pasted on. Here:
// - one mesh of soft dark blobs on the ground under every stone, wood, cave and plant clump (darker and tighter under
//   hardscape, faint under plants): each blob a small grid draped over the ground itself (it follows the slope and the
//   ripples), all merged into ONE geometry, so one draw call in all. It multiplies what is under it (custom blending
//   dst * (1 - src)), writes no depth and is drawn in the transparent pass before the water (renderOrder 1), so the
//   plants and fish in front still hide it. Unlit (userData.nolight): it is a ratio, the light is already in dst.
// - a blob's shape comes from the piece's own mesh: the vertices within a band above the ground, their spread in the
//   floor plan (mean and covariance: an ellipse), so a branch resting on one end gets a shadow at that end only.
// - a dragged piece: the part is rebuilt (its key changes), but each blob is cached by its item's data, so only the
//   moved piece's blob is worked out again; the rest is a re-merge of a few thousand vertices.
// - (fx `ground`, VF3) a sparse few coarse grains round each hardscape piece's foot on fine freshwater grounds (sand, mud, soil):
//   two instanced meshes through render/scatter.ts.
// - `baseShade`: the lowest part of a stone or piece of wood a little darker in its baked vertex colour (recesses
//   by height above the piece's base, render/items.ts bakedShape). Concavity was not tried: the meshes are too coarse in
//   places to show it without blotches (the PDF's warning).
import * as THREE from 'three';
import { rng } from '../art/paint';
import { SUBSTRATES, shadesOf } from '../art/placeholder';
import { itemDims } from '../scene/items';
import { footprint } from '../scene/shape';
import type { Item, Tank, TankSetup } from '../scene/types';
import { roughOf } from '../scene/types';
import { FX } from './fx';
import { grainKinds, grainLooks, type GrainLook } from './grains';
import { scatter, type GroundAt } from './scatter';

/** fx, fd, berm, u: VF-C2 (fx embed): the piece's own footprint semi-axes, the berm's height (mm) and a per-piece random 0..1. */
interface Blob { x: number; d: number; ux: number; ud: number; rx: number; rd: number; dark: number; grains: boolean; fx?: number; fd?: number; berm?: number; u?: number }

const GRID = 21; // vertices per side of a blob's grid (11 cut the rippled sand mesh into dark polygons on a big blob: Nathan 2026-11-13)
const blobs = new Map<string, Blob | null>();
let mat: THREE.MeshBasicMaterial | undefined;
function contactMat() {
  if (mat) return mat;
  mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -12, polygonOffsetUnits: -8,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcColorFactor, toneMapped: false });
  mat.userData.keep = true;
  return mat;
}

/** A per-piece random 0..1 from its seed and id (stable while the piece is dragged or resized). */
const pieceU = (it: Item) => { const t = Math.sin((it.seed || 1) * 12.9898 + it.id * 78.233) * 43758.5453; return t - Math.floor(t); };

/**
 * VF-C2 (fx embed): how much deeper than the base rest a hardscape piece is set into the bed, mm, on top of
 * scene/items.ts itemSink: a stone 5-15 % of its height (3-35 mm), a cave 3-8 %, wood 4-12 % (2-12 mm), by a per-piece
 * draw. A piece stacked on another (lift above 2 mm) stays where it is. Render only: the scene's data does not move.
 */
export function embedSink(it: Item): number {
  if (!FX.embed || it.lift > 2 || !(it.kind === 'stone' || it.kind === 'wood' || it.kind === 'cave')) return 0;
  const h = itemDims(it)[1], u = pieceU(it);
  return it.kind === 'stone' ? Math.min(35, Math.max(3, h * (0.05 + 0.1 * u))) : it.kind === 'cave' ? Math.min(25, Math.max(2, h * (0.03 + 0.05 * u))) : Math.min(12, Math.max(2, h * (0.04 + 0.08 * u)));
}

const hardKind = (it: Item) => it.kind === 'stone' || it.kind === 'wood' || it.kind === 'cave';

/** The blob under one item from its built mesh (world matrix up to date), or null (floating, a carpet, a coral). */
function blobOf(it: Item, m: THREE.Mesh, groundY: (x: number, d: number) => number): Blob | null {
  if (it.kind === 'coral' || it.kind === 'artificial' && it.lift > 30) return null;
  if (it.kind === 'plant') {
    const gy = groundY(it.x, it.depth);
    if (m.position.y > gy + 40 || it.lift > 30) return null; // a floater, or an epiphyte up on the wood
    const r = Math.min(140, Math.max(22, (it.spread ?? 0) / 2 + it.size * 0.07));
    return { x: it.x, d: it.depth, ux: 1, ud: 0, rx: r, rd: r, dark: 0.2, grains: false };
  }
  // hardscape: its vertices near the ground
  const pos = m.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 1500)), v = new THREE.Vector3();
  const band = 12 + 0.05 * it.size, pts: number[] = [];
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
    const h = v.y - groundY(v.x, -v.z); lo = Math.min(lo, h); hi = Math.max(hi, h);
    if (h < band) pts.push(v.x, -v.z);
  }
  if (pts.length < 6) return null;
  // Nathan 2026-11-12: a 31 mm pebble at the reef's front got a shadow three times its width at full rock darkness and
  // looked afloat. The shadow now goes by how the piece meets the ground: the pad and the darkness by its height above
  // the ground (a low pebble occludes little; every piece 60 mm or taller is as before), and a piece whose lowest point
  // is above the ground fades out by the gap (it is not resting there).
  const tall = Math.max(1, hi - Math.min(lo, 0)), gap = Math.max(0, lo), touch = Math.max(0, 1 - gap / (5 + 0.3 * tall));
  if (touch <= 0) return null;
  let mx = 0, md = 0; const n = pts.length / 2;
  for (let i = 0; i < pts.length; i += 2) { mx += pts[i]; md += pts[i + 1]; }
  mx /= n; md /= n;
  let sxx = 0, sdd = 0, sxd = 0;
  for (let i = 0; i < pts.length; i += 2) { const a = pts[i] - mx, b = pts[i + 1] - md; sxx += a * a; sdd += b * b; sxd += a * b; }
  sxx /= n; sdd /= n; sxd /= n;
  // principal axes of the covariance
  const tr = (sxx + sdd) / 2, det = Math.sqrt(Math.max(0, ((sxx - sdd) / 2) ** 2 + sxd * sxd)), l1 = tr + det, l2 = Math.max(0, tr - det);
  const ang = 0.5 * Math.atan2(2 * sxd, sxx - sdd), pad = Math.min(10 + 0.04 * it.size, 0.25 * tall);
  const rx = Math.min(it.size * 0.75, 1.9 * Math.sqrt(l1) + pad), rd = Math.min(it.size * 0.75, 1.9 * Math.sqrt(l2) + pad);
  return { x: mx, d: md, ux: Math.cos(ang), ud: Math.sin(ang), rx, rd: Math.max(rd, pad * 1.4), dark: (it.kind === 'wood' ? 0.5 : 0.55) * Math.min(1, Math.max(0.35, tall / 60)) * touch, grains: true,
    fx: 2 * Math.sqrt(l1), fd: Math.max(2 * Math.sqrt(l2), pad), berm: Math.min(9, Math.max(2, 0.045 * tall)) * (0.7 + 0.6 * pieceU(it)) * touch, u: pieceU(it) };
}

/** Linear value whose sRGB encoding is `a` (the material's output is encoded; the blend factor should be `a`). */
const lin = (a: number) => (a <= 0.04045 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4);

/**
 * The contact objects for the built items: the blob mesh (fx contact) and the coarse grains by the hardscape (fx ground,
 * fine grounds only). `ground` = the ground surface the substrate was drawn with (render/build.ts addSubstrate).
 */
export function contactObjects(S: TankSetup, T: Tank, items: { it: Item; m: THREE.Mesh }[], ground: GroundAt, skin?: GroundSkin, surface?: GroundAt): THREE.Object3D[] {
  if (!FX.contact && !FX.ground && !FX.embed && !FX.mix) return [];
  const gsig = (FX.embed ? 'e' : '') + JSON.stringify([T, S.terrain, roughOf(S.substrate), S.substrate.show, S.layout.seed]), groundY = (x: number, d: number) => ground(x, d)[1];
  const list: Blob[] = [];
  for (const { it, m } of items) {
    const k = JSON.stringify(it) + gsig;
    let b = blobs.get(k);
    if (b === undefined) { b = blobOf(it, m, groundY); blobs.set(k, b); if (blobs.size > 600) blobs.delete(blobs.keys().next().value!); }
    if (b) list.push(b);
  }
  const out: THREE.Object3D[] = [];
  // VF-C2: the berm stands up to 9 mm above the ground, so the blob (drawn on the ground) was hidden under it and the berm stayed
  // lighter than the shaded sand round it (a pale cloud round every rock, Nathan 2026-11-12): over a painted berm the blob follows its surface
  const drape = surface ?? ground; // blobs and berms lie on the drawn mesh's own triangles (render/build.ts SURF)
  const berms = FX.embed && skin && skin.color === 0xffffff ? list.filter(b => b.grains && b.berm) : [];
  if (FX.contact && list.length) out.push(blobMesh(list, berms.length ? onBerm(berms, drape) : drape, surface ? 0.4 * roughOf(S.substrate) : roughOf(S.substrate)));
  if (FX.ground) out.push(...footGrains(S, T, list.filter(b => b.grains), ground));
  if (FX.mix) out.push(...coarseFeet(S, T, list.filter(b => b.grains && b.fx), ground));
  if (FX.embed && skin) out.push(...bermObjects(S, T, list.filter(b => b.grains && b.berm), drape, skin));
  return out;
}

/**
 * `rough` = the ground's Roughness setting, 0-100 (SR1 made 50 the default, 2026-11-12): the drawn ground is a 14 mm mesh over
 * ripples as fine as 22 mm, so between its vertices it deviates from the exact ground this blob is draped on; with a
 * 0.8 mm lift the ridges stood through the blob as pale hard-edged shards and the blob's triangles cut it into dark
 * polygons ("weird shadows", Nathan 2026-11-12). The lift grows with the roughness (about 2.6 mm at 50 %).
 */
function blobMesh(list: Blob[], ground: GroundAt, rough = 0) {
  const lift = 0.8 + 0.035 * rough;
  const nv = GRID * GRID, pos = new Float32Array(list.length * nv * 3), col = new Float32Array(list.length * nv * 3), idx: number[] = [];
  list.forEach((b, bi) => {
    const o = bi * nv;
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      const u = (i / (GRID - 1)) * 2 - 1, w = (j / (GRID - 1)) * 2 - 1, R = 1.9; // the grid reaches well past the footprint: the fade
      const lx = u * R * b.rx, ld = w * R * b.rd, x = b.x + lx * b.ux - ld * b.ud, d = b.d + lx * b.ud + ld * b.ux;
      const g = ground(x, d), p = (o + i * GRID + j) * 3;
      pos[p] = g[0]; pos[p + 1] = g[1] + lift; pos[p + 2] = g[2];
      const rho = Math.hypot(u, w) * R, f = rho >= R ? 0 : Math.exp(-rho * rho * 0.6) * (1 - (rho / R) ** 4), a = lin(b.dark * f);
      col[p] = col[p + 1] = col[p + 2] = a;
    }
    for (let i = 0; i < GRID - 1; i++) for (let j = 0; j < GRID - 1; j++) {
      const a = o + i * GRID + j, c = a + GRID;
      idx.push(a, c, a + 1, a + 1, c, c + 1); // facing up (the other winding faced down and was culled)
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, contactMat());
  m.renderOrder = 1; m.userData.nolight = true; m.userData.contact = true; m.raycast = () => {}; // never picked
  m.frustumCulled = false;
  return m;
}

/** The bed's colour for the coarse grains, or null for a ground that already has 3D grains everywhere. */
function footLook(S: TankSetup): GrainLook | null {
  const sub = S.substrate;
  if (!sub.show) return null;
  let base: string;
  if (sub.type === 'custom') {
    if (sub.custom.grain !== 'sand' && sub.custom.grain !== 'mud') return null;
    base = sub.custom.color;
  } else {
    if (grainLooks(sub).length) return null;
    const t = SUBSTRATES[sub.type]; if (t.kind === 'bark') return null;
    base = t.shades[1] ?? t.base;
  }
  // none on marine sand (Nathan 2026-11-12: the pale crushed-shell grains round the reef rock read as white sprinkles)
  if (sub.type === 'aragonite' || sub.type === 'coral') return null;
  const r = rng(71);
  // a little darker and greyer than the bed (the coarse fraction)
  const colors = [...shadesOf(base, 6, r, 1.5).map(c => '#' + new THREE.Color(c).multiplyScalar(0.7).getHexString()), '#6d655c', '#8a8178'];
  return { shape: 'stone', size: [3, 8], round: 0.7, colors, speckle: true, wet: false };
}

function footGrains(S: TankSetup, T: Tank, list: Blob[], ground: GroundAt): THREE.InstancedMesh[] {
  const look = footLook(S);
  if (!look || !list.length) return [];
  const r = rng(131 + (S.layout.seed ?? 1)), at: [number, number][] = [];
  for (const b of list) {
    const per = Math.min(70, Math.round((b.rx + b.rd) * 0.35));
    for (let i = 0; i < per; i++) {
      const a = r() * Math.PI * 2, rho = 0.85 + 0.6 * Math.sqrt(r()) * (r() < 0.25 ? 1.8 : 1), lx = Math.cos(a) * rho * b.rx, ld = Math.sin(a) * rho * b.rd;
      at.push([b.x + lx * b.ux - ld * b.ud, b.d + lx * b.ud + ld * b.ux]);
    }
  }
  const kinds = grainKinds(look).slice(0, 2); // two shapes: two draw calls
  const ms = scatter(T, ground, { seed: 7, count: at.length, at, kinds, lift: [0, 0], pile: 0, tilt: 0.5, slope: 0.35, clump: 0, liftK: [-0.25, -0.05], pileK: 0.15, cell: 3,
    palette: look.colors.map(c => new THREE.Color(c).multiplyScalar(0.8)) });
  for (const m of ms) { m.userData.grains = true; m.userData.contact = true; m.raycast = () => {}; }
  return ms;
}

/**
 * Darken the lowest part of a hardscape piece's baked colours (the recess where it meets the ground, which the baked
 * light leaves as bright as its top): by height above the piece's lowest point along `up` (the room's up in the shape's
 * own frame), up to about 30 % at the very base, fading over about a tenth of the piece's height. In place on `col`.
 */
export function baseShade(pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, col: Float32Array, up: THREE.Vector3) {
  let lo = Infinity, hi = -Infinity; const v = new THREE.Vector3(), h = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { h[i] = v.fromBufferAttribute(pos, i).dot(up); lo = Math.min(lo, h[i]); hi = Math.max(hi, h[i]); }
  const h0 = Math.min(30, Math.max(5, (hi - lo) * 0.12));
  for (let i = 0; i < pos.count; i++) {
    const k = 1 - 0.3 * Math.exp(-(h[i] - lo) / h0);
    col[i * 3] *= k; col[i * 3 + 1] *= k; col[i * 3 + 2] *= k;
  }
}
export const contactKey = (items: Item[]) => 'contact' + JSON.stringify([FX.contact, FX.ground, FX.embed, FX.mix, items.filter(it => hardKind(it) || it.kind === 'plant' || it.kind === 'artificial')]);

// ---------- VF-C2: embedding (fx `embed`) ----------

/** What the ground mesh is drawn with (render/build.ts addSubstrate): the berm round a piece uses the same skin. */
export interface GroundSkin { map: THREE.Texture; color: number; tile: number; colAt: (x: number, d: number) => number[]; terra: boolean }

/**
 * A floor-plan point pulled inside the tank's outline (at least `gap` mm from every pane): the berm ring of a piece
 * standing at the glass otherwise reaches out through it (Nathan 2026-11-12, a slab out of the right pane). Works on any
 * outline (rect, bow-front, corner, round: footprint's edges, each with its inward normal).
 */
export function clampInside(T: Tank, gap = 0.6) {
  const E = footprint(T).edges;
  return (x: number, d: number): [number, number] => {
    for (let pass = 0; pass < 3; pass++) { // a corner needs two edges, a second pass settles the first's push
      let moved = false;
      for (const e of E) { const din = -((x - e.a[0]) * e.n[0] + (d - e.a[1]) * e.n[1]); if (din < gap) { x += e.n[0] * (din - gap); d += e.n[1] * (din - gap); moved = true; } }
      if (!moved) break;
    }
    return [x, d];
  };
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const BERM_OUT = 1.75; // the berm ends at this many footprints out
/** The berm's wobble round the piece: about 0.82..1.18 by angle, from the piece's draw. */
const wobble = (u: number, a: number) => 1 + 0.11 * Math.sin(a * 2 + u * 40) + 0.07 * Math.sin(a * 3 + u * 90 + 1) + 0.04 * Math.sin(a * 5 + u * 17);
/** How far out (in footprints) a floor-plan point is from a piece, and the berm's height there, mm: a plateau against the piece, falling away. */
function bermAt(b: Blob, x: number, d: number) {
  const lx = (x - b.x) * b.ux + (d - b.d) * b.ud, ld = -(x - b.x) * b.ud + (d - b.d) * b.ux;
  const rho = Math.hypot(lx / b.fx!, ld / b.fd!), r = rho / wobble(b.u ?? 0, Math.atan2(ld, lx));
  return { rho: r, h: r <= 1 ? b.berm! : b.berm! * smooth(0, 1, 1 - (r - 1) / (BERM_OUT - 1)) };
}

/**
 * Round each hardscape piece's base: a small berm of substrate (a mound in the bed's own skin and colour, draped on the
 * ground, highest against the piece and falling to nothing about 1.75 footprints out, its outline wobbling), a darker
 * damp ring where it meets the piece, and grains of the bed spilled over its slope (instanced, through scatter). Each
 * piece is built from its own blob, which is cached per item (a drag recomputes only the moved piece).
 */
function bermObjects(S: TankSetup, T: Tank, list: Blob[], ground: GroundAt, skin: GroundSkin): THREE.Object3D[] {
  if (!list.length) return [];
  // over 3D grains (gravel) a painted berm hides real stones under a flat dark smear (Nathan's blind test 2026-11-12: nano wood base):
  // the berm there is only its spilled grains, denser and a little damp-toned
  if (skin.color !== 0xffffff) return spillGrains(S, T, list, ground, 0.8, true);
  const NA = 28, NR = 7, nv = (NR + 1) * NA, pos = new Float32Array(list.length * nv * 3), col = new Float32Array(list.length * nv * 3), uv = new Float32Array(list.length * nv * 2), idx: number[] = [];
  const keep = clampInside(T), scale = skin.color === 0xffffff ? 1 : 0.5; // over 3D grains the berm is lower: the spilled grains make up the rest
  list.forEach((b, bi) => {
    const o = bi * nv, H = b.berm! * scale;
    for (let r = 0; r <= NR; r++) for (let k = 0; k < NA; k++) {
      const a = k / NA * Math.PI * 2, w = wobble(b.u ?? 0, a), t = 0.7 + (BERM_OUT - 0.7) * r / NR, rho = t * w;
      const lx = Math.cos(a) * rho * b.fx!, ld = Math.sin(a) * rho * b.fd!, [x, d] = keep(b.x + lx * b.ux - ld * b.ud, b.d + lx * b.ud + ld * b.ux);
      const g = ground(x, d), h = t <= 1 ? H : H * smooth(0, 1, 1 - (t - 1) / (BERM_OUT - 1)), i = o + r * NA + k, p = i * 3, c = skin.colAt(x, d);
      // the damp ring: darker and a touch cooler against the piece, back to the bed's colour about 1.5 footprints out
      const wet = 0.55 + 0.45 * smooth(0.9, 1.55, t);
      pos[p] = g[0]; pos[p + 1] = g[1] + h + (r === NR ? 0 : 0.15); pos[p + 2] = g[2];
      col[p] = c[0] * wet * 0.96; col[p + 1] = c[1] * wet; col[p + 2] = c[2] * wet * 1.04;
      uv[i * 2] = g[0] / skin.tile; uv[i * 2 + 1] = -g[2] / skin.tile;
    }
    for (let r = 0; r < NR; r++) for (let k = 0; k < NA; k++) {
      const a = o + r * NA + k, a1 = o + r * NA + (k + 1) % NA, c = a + NA, c1 = a1 + NA;
      idx.push(a, c, a1, a1, c, c1);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) if (n.getY(i) < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  g.computeBoundingSphere();
  const m = new THREE.MeshBasicMaterial({ map: skin.map, color: skin.color, vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  m.userData.sub = true;
  const mesh = new THREE.Mesh(g, m); mesh.userData.contact = true; mesh.raycast = () => {}; mesh.frustumCulled = false;
  return [mesh, ...spillGrains(S, T, list, ground, scale)];
}

/** Grains of the bed's own kind lying on each berm (a few per piece, sized like the bed's grains: a 3D ground's own stones, a fine bed's 2-4.5 mm). */
function spillGrains(S: TankSetup, T: Tank, list: Blob[], ground: GroundAt, scale: number, dense = false): THREE.InstancedMesh[] {
  const sub = S.substrate; if (!sub.show) return [];
  let look: GrainLook | null = grainLooks(sub)[0] ?? null;
  if (!look) {
    let base: string;
    if (sub.type === 'custom') base = sub.custom.color; else { const t = SUBSTRATES[sub.type]; if (t.kind === 'bark') return []; base = t.shades[1] ?? t.base; }
    look = { shape: 'stone', size: [2, 4.5], round: 0.7, colors: shadesOf(base, 8, rng(73), 1.5), speckle: false, wet: false };
  }
  const r = rng(151 + (S.layout.seed ?? 1)), at: [number, number][] = [];
  for (const b of list) {
    const per = Math.min(dense ? 160 : 90, Math.round((b.fx! + b.fd!) * (dense ? 0.9 : 0.45)));
    for (let i = 0; i < per; i++) {
      const a = r() * Math.PI * 2, t = 0.8 + 0.85 * r() * r(), w = wobble(b.u ?? 0, a), lx = Math.cos(a) * t * w * b.fx!, ld = Math.sin(a) * t * w * b.fd!;
      at.push([b.x + lx * b.ux - ld * b.ud, b.d + lx * b.ud + ld * b.ux]);
    }
  }
  const bermY = onBerm(list, ground, scale);
  const ms = scatter(T, bermY, { seed: 9, count: at.length, at, kinds: grainKinds(look).slice(0, 2), lift: [0, 0], pile: 0, tilt: 0.5, slope: 0.3, clump: 0, liftK: [-0.2, 0.05], pileK: 0.15, cell: 3,
    palette: look.colors.map(c => new THREE.Color(c).multiplyScalar(dense ? 0.62 : 0.68)) });
  for (const m of ms) { m.userData.grains = true; m.userData.contact = true; m.raycast = () => {}; }
  return ms;
}

// ---------- VF-C2: coarse grains at the feet of pieces (fx `mix`, size sorting) ----------

/** A few coarser grains of the bed's own colours round each piece's foot (the big ones settle there): a 3D ground's own stones 1-1.35 times its largest, a fine bed's 3-7 mm. Marine sand too (in the bed's colours, not darker). */
function coarseFeet(S: TankSetup, T: Tank, list: Blob[], ground: GroundAt): THREE.InstancedMesh[] {
  const sub = S.substrate; if (!sub.show || !list.length) return [];
  const g3 = grainLooks(sub)[0];
  let look: GrainLook;
  if (g3) look = g3.shape === 'chip' ? g3 : { ...g3, size: [g3.size[1], g3.size[1] * 1.35] };
  else {
    let base: string;
    if (sub.type === 'custom') base = sub.custom.color; else { const t = SUBSTRATES[sub.type]; if (t.kind === 'bark') return []; base = t.shades[1] ?? t.base; }
    look = { shape: 'stone', size: [3, 7], round: 0.7, colors: shadesOf(base, 8, rng(79), 1.5), speckle: true, wet: false };
  }
  const r = rng(171 + (S.layout.seed ?? 1)), at: [number, number][] = [];
  for (const b of list) {
    const per = Math.min(36, Math.round((b.fx! + b.fd!) * 0.2));
    for (let i = 0; i < per; i++) {
      const a = r() * Math.PI * 2, t = 0.9 + 0.55 * r(), lx = Math.cos(a) * t * b.fx!, ld = Math.sin(a) * t * b.fd!;
      at.push([b.x + lx * b.ux - ld * b.ud, b.d + lx * b.ud + ld * b.ux]);
    }
  }
  const ms = scatter(T, ground, { seed: 13, count: at.length, at, kinds: grainKinds(look).slice(0, 2), lift: [0, 0], pile: 0, tilt: 0.5, slope: 0.35, clump: 0, liftK: [-0.25, -0.05], pileK: 0.15, cell: 3,
    palette: look.colors.map(c => new THREE.Color(c).multiplyScalar(0.8)), vary: true });
  for (const m of ms) { m.userData.grains = true; m.userData.contact = true; m.raycast = () => {}; }
  return ms;
}

/** The ground with the berms' height added (the surface the berm meshes are drawn on). */
function onBerm(list: Blob[], ground: GroundAt, scale = 1): GroundAt {
  return (x, d) => {
    const g = ground(x, d); let h = 0;
    for (const b of list) { const l = bermAt(b, x, d); if (l.rho < BERM_OUT) h = Math.max(h, l.h * scale); }
    return [g[0], g[1] + h, g[2]];
  };
}
