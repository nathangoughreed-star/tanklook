// 3D grains (lane T1, 2026-10-16; Nathan: coarse grounds read flat, a painted tile). Coarse grounds get real stones or
// bark chips through the shared scatter tool: one packed layer sunk into the top surface (the painted tile underneath,
// darkened, reads as the shadowed gaps between them) and a row pressed against each pane, so the cross-section seen
// through the glass is stones in profile. Fine grounds (sand, mud, soil, clay) stay a painted surface.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { GRAIN_LOOK, SUBSTRATES, shadesOf } from '../art/placeholder';
import { waterY } from '../scene/physics';
import { footprint } from '../scene/shape';
import type { Tank, TankSetup } from '../scene/types';
import { insideIn, scatter, type GroundAt, type ScatterKind } from './scatter';

/** How a ground's grains look in 3D: chips (bark) or stones, diameter range (mm), roundness 0-1, colours, flecked,
 *  darker when wet (terrestrial grounds only). */
export interface GrainLook { shape: 'stone' | 'chip'; size: [number, number]; round: number; colors: string[]; speckle: boolean; wet: boolean }
/** The ground's 3D grains, or null for a ground drawn as a surface only. Presets: bark and the gravel kinds; custom: one
 *  grain of gravel or pebbles (a blend with a second grain: not yet). Sizes from the tile art (radius px x mm per px). */
export function grainLook(sub: TankSetup['substrate']): GrainLook | null {
  if (sub.type === 'bark') return { shape: 'chip', size: [10, 22], round: 0.3, colors: SUBSTRATES.bark.shades, speckle: false, wet: true };
  if (sub.type === 'custom') {
    const b = sub.custom; if (b.grain2 !== 'none' || (b.grain !== 'gravel' && b.grain !== 'pebble')) return null;
    const G = GRAIN_LOOK[b.grain];
    return { shape: 'stone', size: [G.size[0] * 2, G.size[1] * 2], round: G.round, colors: shadesOf(b.color, 10, rng(5)), speckle: true, wet: false };
  }
  const t = SUBSTRATES[sub.type];
  if (t.kind !== 'pebble') return null;
  const mmPx = t.tile * 2 / 512; // tile px -> mm
  return { shape: 'stone', size: [t.size[0] * 2 * mmPx, t.size[1] * 2 * mmPx], round: t.round ?? 0.8, colors: t.shades, speckle: !!t.speckle, wet: !!t.terra };
}
/** About how far the grains rise above the painted ground (mm): leaf litter lies on them. */
export const grainTop = (g: GrainLook | null) => (g ? (g.size[0] + g.size[1]) / 2 * (g.shape === 'chip' ? 0.15 : 0.22) : 0);

const grainGeo = new Map<string, THREE.BufferGeometry[]>();
/** Six stone shapes for a roundness: a smooth-shaded subdivided icosahedron, its radius nudged by three broad bumps and
 *  a finer ripple (rougher the less round), flattened (stones settle on a flat side) and a little elongated; colour
 *  mottled per vertex (flecks for natural stone). Long axis = x, diameter 1. */
export function stoneGeos(round: number, speckle: boolean, detail: number) {
  const key = `s${round}${speckle}${detail}`; let gs = grainGeo.get(key); if (gs) return gs;
  const r = rng(91);
  gs = Array.from({ length: 6 }, () => {
    const g0 = new THREE.IcosahedronGeometry(0.5, detail); g0.deleteAttribute('normal'); g0.deleteAttribute('uv');
    const g = mergeVertices(g0), p = g.attributes.position, rough = (1 - round) * 0.5 + 0.06;
    const bumps = Array.from({ length: 3 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()), ph = r() * 9;
    const sy = 0.62 + r() * 0.25, sz = 0.72 + r() * 0.25, v = new THREE.Vector3(), col: number[] = [];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      let k = 1; for (const b of bumps) k += rough * 0.5 * Math.max(0, v.dot(b)) ** 2 - rough * 0.12;
      k += rough * 0.15 * Math.sin(v.x * 7 + ph) * Math.sin(v.y * 6 + ph * 2) * Math.sin(v.z * 8);
      p.setXYZ(i, v.x * 0.5 * k, v.y * 0.5 * k * sy, v.z * 0.5 * k * sz);
      const m = 0.9 + r() * 0.14 + (speckle && r() < 0.12 ? (r() < 0.5 ? -0.3 : 0.25) : 0); col.push(m, m, m);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    g.translate(0, sy * 0.25, 0); // its middle a quarter of its height up: lift 0 sinks it about halfway
    g.userData.keep = true; return g;
  });
  grainGeo.set(key, gs); return gs;
}
/** Six bark chips: a jittered slab, thinner toward its edges (an angular chunk, thinner than wide), the cut sides and
 *  the under face darker than the top; long axis = x, length 1. Planar UVs for the fibre texture along the length. */
function chipGeos() {
  let gs = grainGeo.get('chip'); if (gs) return gs;
  const r = rng(93);
  gs = Array.from({ length: 6 }, () => {
    const w = 0.5 + r() * 0.35, h = 0.16 + r() * 0.12, g0 = new THREE.BoxGeometry(1, h, w, 3, 1, 2);
    g0.deleteAttribute('normal'); g0.deleteAttribute('uv');
    const g = mergeVertices(g0, 1e-4), p = g.attributes.position, uv = new Float32Array(p.count * 2), col: number[] = [], off = r();
    const jit = new Map<string, number[]>(); // a corner of the outline moves the same on both faces
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = `${x.toFixed(3)},${z.toFixed(3)}`;
      if (!jit.has(k)) jit.set(k, [(r() - 0.5) * 0.18, (r() - 0.5) * 0.18 * w, (r() - 0.5) * 0.06]);
      const [jx, jz, jy] = jit.get(k)!, edge = Math.max(Math.abs(x) * 2, Math.abs(z) / w * 2);
      p.setXYZ(i, x + jx, y * (1 - 0.35 * edge) + jy + (y > 0 ? (r() - 0.5) * 0.03 : 0), z + jz);
      uv[i * 2] = x * 0.9 + off; uv[i * 2 + 1] = z * 0.9;
      const m = (y > 0 ? 1 : 0.7) * (0.9 + r() * 0.15); col.push(m, m, m);
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals(); g.translate(0, h * 0.2, 0); g.userData.keep = true; return g;
  });
  grainGeo.set('chip', gs); return gs;
}
let fibreTex: THREE.CanvasTexture | undefined;
/** Bark fibre: fine light and dark streaks along the length on a light grey (each chip's colour tints it). */
function barkFibre() {
  if (fibreTex) return fibreTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!, r = rng(97);
  x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) {
    const y = r() * 128, l = 20 + r() * 100, x0 = r() * 128, dy1 = (r() - 0.5) * 3;
    x.strokeStyle = r() < 0.55 ? `rgba(40,30,25,${0.2 + r() * 0.25})` : `rgba(255,245,235,${0.12 + r() * 0.2})`; x.lineWidth = 0.6 + r() * 1.6;
    for (const oy of [-128, 0, 128]) for (const ox of [-128, 0, 128]) { x.beginPath(); x.moveTo(x0 + ox, y + oy); x.lineTo(x0 + l + ox, y + oy + dy1); x.stroke(); }
  }
  fibreTex = new THREE.CanvasTexture(c); fibreTex.wrapS = fibreTex.wrapT = THREE.RepeatWrapping; fibreTex.colorSpace = THREE.SRGBColorSpace; fibreTex.userData.keep = true;
  return fibreTex;
}
const grainMat = new Map<string, THREE.MeshBasicMaterial>();
const glassMats = new Map<THREE.Material, THREE.MeshBasicMaterial>();
/** A grain's shape for the glass row: its colours times a fixed soft light baked in (lit from above, the faces toward
 *  either pane a little, darker toward the rim), so an unlit stone still reads round, not as a flat coin. */
const glassGeos = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
function glassGeo(g: THREE.BufferGeometry) {
  let b = glassGeos.get(g); if (b) return b;
  b = g.clone(); const n = b.attributes.normal, c = b.attributes.color;
  for (let i = 0; i < n.count; i++) {
    const k = 0.42 + 0.45 * Math.max(0, n.getY(i)) + 0.28 * Math.abs(n.getZ(i)) - 0.12 * Math.max(0, -n.getY(i));
    c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
  }
  b.userData.keep = true; glassGeos.set(g, b); return b;
}
const glassMat = (m: THREE.MeshBasicMaterial) => { let g = glassMats.get(m); if (!g) { g = m.clone(); g.userData.keep = true; delete g.userData.aq; /* clone() copies userData but not onBeforeCompile: a copied aq flag leaves it unlit */ glassMats.set(m, g); } return g; };
function grainKinds(g: GrainLook): ScatterKind[] {
  // small grains (gravel, under 8 mm): 20 triangles each, not 80 (18k stones in a 20-gal made it 2-3 ms)
  const geos = g.shape === 'chip' ? chipGeos() : stoneGeos(g.round, g.speckle, (g.size[0] + g.size[1]) / 2 < 8 ? 0 : 1);
  let mat = grainMat.get(g.shape);
  if (!mat) { mat = new THREE.MeshBasicMaterial({ vertexColors: true, ...(g.shape === 'chip' ? { map: barkFibre() } : {}) }); mat.userData.keep = true; grainMat.set(g.shape, mat); }
  return geos.map(geo => ({ geo, mat: mat!, weight: 1, size: g.size, reach: 0.5 }));
}
/** Grains in the top layer: enough to cover the floor about once, sunk in (stones about halfway, chips a little), packed
 *  (a pile grid of a third of a grain), each coloured from the ground's shades; darker under water if terrestrial. */
export const grainMeshes = (S: TankSetup, T: Tank, ground: GroundAt) => cachedGrains('top', S, T, () => topGrains(S, T, ground));
function topGrains(S: TankSetup, T: Tank, ground: GroundAt, area = footprint(T).area): THREE.InstancedMesh[] {
  const g = grainLook(S.substrate); if (!g) return [];
  const mean = (g.size[0] + g.size[1]) / 2, foot = Math.PI * (mean / 2) ** 2 * (g.shape === 'chip' ? 0.55 : 0.8);
  const wy = g.wet && S.water.on ? waterY(T, S.water.level) : -Infinity, chip = g.shape === 'chip';
  const out = scatter(T, ground, {
    seed: 11, count: Math.min(30000, Math.round(1.25 * area / foot)), kinds: grainKinds(g), lift: [0, 0], pile: 0, tilt: chip ? 0.35 : 0.5,
    slope: 0.35, clump: 0, liftK: chip ? [-0.05, 0.05] : [-0.18, 0], pileK: chip ? 0.12 : 0.18, cell: Math.max(1, mean / 3),
    // stones a shade under their tile colours: lit from above, their tops came out near white
    palette: g.colors.map(c => new THREE.Color(c).multiplyScalar(chip ? 1 : 0.8)), shade: y => (y < wy ? 0.55 : 1),
  });
  // drawn before the ground (renderOrder): the depth test then skips the ground's shading under them (fill was the cost)
  for (const m of out) { m.userData.grains = true; m.renderOrder = -1; }
  return out;
}
/** Grains pressed against the inside of each pane, from the tank floor up to the ground: the cross-section seen through
 *  the glass (stones long side along it, chips on edge at a slant). Not in a bowl (its glass curves away from the floor). */
export const glassGrains = (S: TankSetup, T: Tank, groundY: (x: number, d: number) => number) => cachedGrains('glass', S, T, () => paneGrains(S, T, groundY));
function paneGrains(S: TankSetup, T: Tank, groundY: (x: number, d: number) => number): THREE.InstancedMesh[] {
  const g = grainLook(S.substrate); if (!g) return [];
  const kinds = grainKinds(g), r = rng(17), mean = (g.size[0] + g.size[1]) / 2, chip = g.shape === 'chip';
  const per: THREE.Matrix4[][] = kinds.map(() => []), tint: THREE.Color[][] = kinds.map(() => []);
  const pal = g.colors.map(c => new THREE.Color(c)), wy = g.wet && S.water.on ? waterY(T, S.water.level) : -Infinity;
  const q = new THREE.Quaternion(), qa = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3();
  const inBy = insideIn(T);
  for (const e of footprint(T).edges) {
    const yaw = Math.atan2(-(e.b[1] - e.a[1]), e.b[0] - e.a[0]); // world angle of the pane (z = -depth)
    const avg = (groundY(e.a[0], e.a[1]) + groundY(e.b[0], e.b[1]) + groundY((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2)) / 3;
    const n = Math.min(20000, Math.round(1.3 * e.len * avg / (mean * mean * (chip ? 0.35 : 0.6))));
    for (let i = 0; i < n; i++) {
      const t = r(), size = g.size[0] + r() * (g.size[1] - g.size[0]), ki = Math.floor(r() * kinds.length), c = pal[Math.floor(r() * pal.length)];
      const yy = r(), a = (r() - 0.5) * 0.6, tl = r() - 0.5, k = 0.85 + r() * 0.3;
      const px = e.a[0] + (e.b[0] - e.a[0]) * t, pd = e.a[1] + (e.b[1] - e.a[1]) * t, top = groundY(px, pd);
      // up to the surface, meeting the top layer (the painted surface stops short of the glass: render/build.ts `clipIn`)
      const under = size * (chip ? 0.25 : 0.35);
      if (top < under + size * 0.15) continue;
      const inset = size * (chip ? 0.2 : 0.36) + 0.4, x = px - e.n[0] * inset, d = pd - e.n[1] * inset;
      if (inBy(x, d) < inset - 0.5) continue; // a corner: the other pane is too near
      const y = Math.min(top - under, size * 0.15 + yy * top);
      qa.setFromAxisAngle(up, yaw + a); ax.set(1, 0, 0).applyQuaternion(qa);
      q.setFromAxisAngle(ax, chip ? Math.PI / 2 * (0.6 + 0.8 * Math.abs(tl)) * Math.sign(tl || 1) : tl * 0.6).multiply(qa);
      per[ki].push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, -d), q, new THREE.Vector3(size, size, size)));
      tint[ki].push(c.clone().multiplyScalar(k * 1.3 * (y < wy ? 0.55 : 1)));
    }
  }
  return kinds.flatMap((K, i) => {
    if (!per[i].length) return [];
    const m = new THREE.InstancedMesh(K.geo, K.mat, per[i].length);
    per[i].forEach((mx, j) => { m.setMatrixAt(j, mx); m.setColorAt(j, tint[i][j]); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.userData.scatter = true; m.userData.grains = true; m.renderOrder = -1;
    // lit like the top grains (Nathan 2026-10-16: with the room dark the cross-section must be darker than the top, and
    // follow the exposure, not sit at a fixed shade); the baked soft shade keeps the stones round side-on, and the
    // material is its own, as the lit shader is set up per material
    m.material = glassMat(K.mat as THREE.MeshBasicMaterial); m.geometry = glassGeo(K.geo);
    return [m];
  });
}

/** Grains made for a ground are kept (6 grounds) and handed out again as new meshes over the same arrays: the tank
 *  rebuilds its ground for edits that do not move it (a light, the litter), and 30k grains took tens of ms. The key
 *  is everything the ground's shape and look depend on (scene/terrain.ts Ground, the tank, the water line). */
interface GrainSnap { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[]; m: Float32Array; c: Float32Array | null; nolight: boolean; order: number }
const grainCache = new Map<string, GrainSnap[]>();
function cachedGrains(tag: string, S: TankSetup, T: Tank, make: () => THREE.InstancedMesh[]): THREE.InstancedMesh[] {
  const key = tag + JSON.stringify([{ ...S.substrate, litter: null }, S.terrain, S.layout.id, S.layout.seed, S.backdrop, S.render?.bgSides, T, S.water.on, S.water.level]);
  let snap = grainCache.get(key);
  if (snap) { grainCache.delete(key); grainCache.set(key, snap); } // most recent last
  else {
    const ms = make();
    snap = ms.map(m => ({ geo: m.geometry, mat: m.material, m: m.instanceMatrix.array as Float32Array, c: (m.instanceColor?.array as Float32Array) ?? null, nolight: !!m.userData.nolight, order: m.renderOrder }));
    grainCache.set(key, snap); if (grainCache.size > 6) grainCache.delete(grainCache.keys().next().value!);
    return ms;
  }
  return snap.map(g => {
    const m = new THREE.InstancedMesh(g.geo, g.mat, g.m.length / 16);
    m.instanceMatrix = new THREE.InstancedBufferAttribute(g.m, 16); if (g.c) m.instanceColor = new THREE.InstancedBufferAttribute(g.c, 3);
    m.computeBoundingSphere(); m.userData.scatter = true; m.userData.grains = true; m.renderOrder = g.order; if (g.nolight) m.userData.nolight = true;
    return m;
  });
}
