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
// - (fx `ground`, VF3) a sparse few coarse grains round each hardscape piece's foot on fine grounds (sand, mud, soil):
//   two instanced meshes through render/scatter.ts.
// - `baseShade`: the lowest part of a stone or piece of wood a little darker in its baked vertex colour (recesses
//   by height above the piece's base, render/items.ts bakedShape). Concavity was not tried: the meshes are too coarse in
//   places to show it without blotches (the PDF's warning).
import * as THREE from 'three';
import { rng } from '../art/paint';
import { SUBSTRATES, shadesOf } from '../art/placeholder';
import type { Item, Tank, TankSetup } from '../scene/types';
import { FX } from './fx';
import { grainKinds, grainLooks, type GrainLook } from './grains';
import { scatter, type GroundAt } from './scatter';

interface Blob { x: number; d: number; ux: number; ud: number; rx: number; rd: number; dark: number; grains: boolean }

const GRID = 11; // vertices per side of a blob's grid
const blobs = new Map<string, Blob | null>();
let mat: THREE.MeshBasicMaterial | undefined;
function contactMat() {
  if (mat) return mat;
  mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcColorFactor, toneMapped: false });
  mat.userData.keep = true;
  return mat;
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
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
    if (v.y - groundY(v.x, -v.z) < band) pts.push(v.x, -v.z);
  }
  if (pts.length < 6) return null;
  let mx = 0, md = 0; const n = pts.length / 2;
  for (let i = 0; i < pts.length; i += 2) { mx += pts[i]; md += pts[i + 1]; }
  mx /= n; md /= n;
  let sxx = 0, sdd = 0, sxd = 0;
  for (let i = 0; i < pts.length; i += 2) { const a = pts[i] - mx, b = pts[i + 1] - md; sxx += a * a; sdd += b * b; sxd += a * b; }
  sxx /= n; sdd /= n; sxd /= n;
  // principal axes of the covariance
  const tr = (sxx + sdd) / 2, det = Math.sqrt(Math.max(0, ((sxx - sdd) / 2) ** 2 + sxd * sxd)), l1 = tr + det, l2 = Math.max(0, tr - det);
  const ang = 0.5 * Math.atan2(2 * sxd, sxx - sdd), pad = 10 + 0.04 * it.size;
  const rx = Math.min(it.size * 0.75, 1.9 * Math.sqrt(l1) + pad), rd = Math.min(it.size * 0.75, 1.9 * Math.sqrt(l2) + pad);
  return { x: mx, d: md, ux: Math.cos(ang), ud: Math.sin(ang), rx, rd: Math.max(rd, pad * 1.4), dark: it.kind === 'wood' ? 0.5 : 0.55, grains: true };
}

/** Linear value whose sRGB encoding is `a` (the material's output is encoded; the blend factor should be `a`). */
const lin = (a: number) => (a <= 0.04045 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4);

/**
 * The contact objects for the built items: the blob mesh (fx contact) and the coarse grains by the hardscape (fx ground,
 * fine grounds only). `ground` = the ground surface the substrate was drawn with (render/build.ts addSubstrate).
 */
export function contactObjects(S: TankSetup, T: Tank, items: { it: Item; m: THREE.Mesh }[], ground: GroundAt): THREE.Object3D[] {
  if (!FX.contact && !FX.ground) return [];
  const gsig = JSON.stringify([T, S.terrain, S.substrate.rough, S.substrate.show, S.layout.seed]), groundY = (x: number, d: number) => ground(x, d)[1];
  const list: Blob[] = [];
  for (const { it, m } of items) {
    const k = JSON.stringify(it) + gsig;
    let b = blobs.get(k);
    if (b === undefined) { b = blobOf(it, m, groundY); blobs.set(k, b); if (blobs.size > 600) blobs.delete(blobs.keys().next().value!); }
    if (b) list.push(b);
  }
  const out: THREE.Object3D[] = [];
  if (FX.contact && list.length) out.push(blobMesh(list, ground));
  if (FX.ground) out.push(...footGrains(S, T, list.filter(b => b.grains), ground));
  return out;
}

function blobMesh(list: Blob[], ground: GroundAt) {
  const nv = GRID * GRID, pos = new Float32Array(list.length * nv * 3), col = new Float32Array(list.length * nv * 3), idx: number[] = [];
  list.forEach((b, bi) => {
    const o = bi * nv;
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      const u = (i / (GRID - 1)) * 2 - 1, w = (j / (GRID - 1)) * 2 - 1, R = 1.9; // the grid reaches well past the footprint: the fade
      const lx = u * R * b.rx, ld = w * R * b.rd, x = b.x + lx * b.ux - ld * b.ud, d = b.d + lx * b.ud + ld * b.ux;
      const g = ground(x, d), p = (o + i * GRID + j) * 3;
      pos[p] = g[0]; pos[p + 1] = g[1] + 0.8; pos[p + 2] = g[2];
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
  const r = rng(71), marine = sub.type === 'aragonite' || sub.type === 'coral';
  // a little darker and greyer than the bed (the coarse fraction), crushed shell pale for marine sand
  const colors = [...shadesOf(base, 6, r, 1.5).map(c => '#' + new THREE.Color(c).multiplyScalar(marine ? 0.8 : 0.7).getHexString()), ...(marine ? ['#e8ddd0', '#cfc6b8'] : ['#6d655c', '#8a8178'])];
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
export const contactKey = (items: Item[]) => 'contact' + JSON.stringify([FX.contact, FX.ground, items.filter(it => hardKind(it) || it.kind === 'plant' || it.kind === 'artificial')]);
