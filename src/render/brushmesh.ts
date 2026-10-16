// Brush patches in 3D (lane SB, 2026-10-16): each patch (scene/brush.ts) is drawn through the shared scatter tool at the
// points its seed and stroke give, as instanced meshes; the ground under each point is whatever `ground` says (the floor
// or the top of the piece there), so nothing lands inside rock or through the glass.
import * as THREE from 'three';
import { rng } from '../art/paint';
import { patchPoints } from '../scene/brush';
import { waterY } from '../scene/physics';
import { isPlantBrush } from '../scene/brush';
import type { Item, LiteBrushId, Patch, Tank, TankSetup } from '../scene/types';
import { itemMesh } from './items';
import { LIBRARY } from '../scene/items';
import { stoneGeos } from './grains';
import { leafKinds, scatter, type GroundAt, type ScatterKind } from './scatter';

const C = (...h: string[]) => h.map(c => new THREE.Color(c));
/** Colours each brush draws its things from (times the geometry's own grey). */
const PALETTE: Record<Exclude<LiteBrushId, 'leaf'>, THREE.Color[]> = {
  pebble: C('#8d8a82', '#a29b8c', '#6f6c68', '#b3a58d', '#7a7f80', '#948572', '#c0b8a8'),
  gravel: C('#8a8378', '#a89f8e', '#6c675f', '#b8ad98', '#7b7466', '#968c7a'),
  moss: C('#3f7a2e', '#4d8a35', '#356a28', '#5b9440', '#44782f'),
  twig: C('#8a6a44', '#9b7a50', '#75583a', '#a8895e'),
  hairgrass: C('#5da84a', '#4f9a40', '#69b455', '#58a046'),
  javamoss: C('#2f6b2a', '#3a7a30', '#2a5d26', '#437f36'),
  sphagnum: C('#9bb44a', '#a8c056', '#8aa43f', '#b3c765'),
};
/** Palette dimming per brush: unlit colours come out brighter than they look in the tank. */
const DIM: Record<Exclude<LiteBrushId, 'leaf'>, number> = { pebble: 0.62, gravel: 0.7, moss: 0.5, twig: 0.9, hairgrass: 0.78, javamoss: 0.62, sphagnum: 0.8 };
const cache = new Map<string, ScatterKind[]>();
const mats = new Map<string, THREE.MeshBasicMaterial>();
/** Double-sided: a mirrored copy's winding flips. */
const mat = (k: string, o: THREE.MeshBasicMaterialParameters = {}) => {
  let m = mats.get(k); if (!m) { m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, ...o }); m.userData.keep = true; mats.set(k, m); } return m;
};
const keep = (g: THREE.BufferGeometry) => { g.userData.keep = true; return g; };
const grey = (n: number, f: (i: number) => number) => { const a: number[] = []; for (let i = 0; i < n; i++) { const v = f(i); a.push(v, v, v); } return new THREE.Float32BufferAttribute(a, 3); };

/** A squashed, lumpy dome (moss cushion, java moss, sphagnum): diameter 1 along x, `h` tall, bumps from a seed. */
function dome(r: () => number, h: number, bump: number, detail = 2) {
  const g = new THREE.IcosahedronGeometry(0.5, detail), p = g.attributes.position, ph = [r() * 9, r() * 9, r() * 9], v = new THREE.Vector3();
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  const m = new THREE.BufferGeometry().setAttribute('position', p.clone());
  const q = m.attributes.position;
  for (let i = 0; i < q.count; i++) {
    v.fromBufferAttribute(q, i).normalize();
    const k = 1 + bump * (Math.sin(v.x * 9 + ph[0]) * Math.sin(v.z * 8 + ph[1]) + 0.6 * Math.sin(v.x * 21 + v.y * 5 + ph[2])) * 0.5;
    q.setXYZ(i, v.x * 0.5 * k, Math.max(v.y, -0.15) * 0.5 * k * h, v.z * 0.5 * k);
  }
  m.setAttribute('color', grey(q.count, i => 0.8 + 0.25 * Math.sin(i * 12.9898) * Math.cos(i * 4.1414)));
  m.computeVertexNormals(); return keep(m);
}
/** A tuft of thin blades fanned from one point (hairgrass): height 1, radius `spread` at the tips. */
function tuft(r: () => number, blades: number, spread: number) {
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  for (let b = 0; b < blades; b++) {
    const a = r() * Math.PI * 2, lean = spread * (0.3 + 0.7 * r()), h = 0.7 + 0.3 * r(), w = 0.03, base = pos.length / 3, S = 4;
    for (let s = 0; s <= S; s++) {
      const t = s / S, out = lean * t * t, cx = Math.cos(a) * out, cz = Math.sin(a) * out, ww = w * (1 - t * 0.85), px = -Math.sin(a) * ww, pz = Math.cos(a) * ww;
      pos.push(cx - px, t * h, cz - pz, cx + px, t * h, cz + pz);
      const k = 0.62 + 0.45 * t; col.push(k, k, k, k, k, k);
    }
    for (let s = 0; s < S; s++) { const i = base + s * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals(); return keep(g);
}
/** A fallen twig: a bent, tapered tube of length 1 along x with a fork stub, lying in the xz plane. */
function twig(r: () => number) {
  const bend = (r() - 0.5) * 0.25, fork = r() < 0.6, parts: THREE.BufferGeometry[] = [];
  const limb = (len: number, r0: number, ox: number, oz: number, ang: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector3(ox + Math.cos(ang) * t * len, 0, oz + Math.sin(ang) * t * len + bend * Math.sin(t * Math.PI) * len)); }
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, r0, 5, false));
  };
  limb(1, 0.04, -0.5, 0, 0);
  if (fork) limb(0.3, 0.025, -0.5 + 0.35 + r() * 0.3, 0, (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.4));
  const merged = parts.map(g => { const n = g.clone(); n.deleteAttribute('uv'); return n; });
  let nv = 0; for (const g of merged) nv += g.attributes.position.count;
  const pos = new Float32Array(nv * 3), idx: number[] = []; let o = 0;
  for (const g of merged) { pos.set(g.attributes.position.array as Float32Array, o * 3); (g.index ? Array.from(g.index.array) : []).forEach(i => idx.push(i + o)); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setIndex(idx);
  out.setAttribute('color', grey(nv, i => 0.82 + 0.2 * Math.sin(i * 3.7))); out.computeVertexNormals(); return keep(out);
}

/** The scatter kinds of a brush (geometry and material built once). */
function kindsFor(brush: Exclude<LiteBrushId, 'leaf'>): ScatterKind[] {
  let ks = cache.get(brush); if (ks) return ks;
  const r = rng(brush.length * 131 + 7), vars = <T,>(n: number, f: () => T) => Array.from({ length: n }, f);
  switch (brush) {
    case 'pebble': ks = stoneGeos(0.85, true, 1).map(geo => ({ geo, mat: mat('stone'), weight: 1, size: [10, 26] as [number, number], reach: 0.5 })); break;
    case 'gravel': ks = stoneGeos(0.6, true, 0).map(geo => ({ geo, mat: mat('stone'), weight: 1, size: [4, 9] as [number, number], reach: 0.5 })); break;
    case 'moss': ks = vars(4, () => dome(r, 0.3, 0.22, 3)).map(geo => ({ geo, mat: mat('moss'), weight: 1, size: [10, 24] as [number, number], reach: 0.5 })); break;
    case 'javamoss': ks = vars(4, () => dome(r, 0.7, 0.5, 3)).map(geo => ({ geo, mat: mat('moss'), weight: 1, size: [18, 38] as [number, number], reach: 0.5 })); break;
    case 'sphagnum': ks = vars(4, () => dome(r, 0.6, 0.2, 3)).map(geo => ({ geo, mat: mat('moss'), weight: 1, size: [16, 32] as [number, number], reach: 0.5 })); break;
    case 'hairgrass': ks = vars(5, () => tuft(r, 9, 0.35)).map(geo => ({ geo, mat: mat('blade', { side: THREE.DoubleSide }), weight: 1, size: [25, 45] as [number, number], reach: 0.3 })); break;
    case 'twig': ks = vars(4, () => twig(r)).map(geo => ({ geo, mat: mat('twig'), weight: 1, size: [30, 80] as [number, number], reach: 0.5 })); break;
  }
  cache.set(brush, ks); return ks;
}

/** Per brush: sink into the ground (mm lift range), pile (stack on neighbours, mm), tilt off the ground (radians). */
const FEEL: Record<LiteBrushId, { lift: [number, number]; pile: number; tilt: number; liftK?: [number, number] }> = {
  leaf: { lift: [0.5, 1.5], pile: 2.5, tilt: 0.12 },
  pebble: { lift: [0, 0], pile: 0, tilt: 0.5, liftK: [-0.2, 0.0] },
  gravel: { lift: [0, 0], pile: 0, tilt: 0.5, liftK: [-0.2, 0.0] },
  moss: { lift: [0, 0], pile: 0.6, tilt: 0.05, liftK: [-0.12, -0.04] },
  javamoss: { lift: [0, 0], pile: 0.8, tilt: 0.08, liftK: [-0.1, -0.02] },
  sphagnum: { lift: [0, 0], pile: 0.6, tilt: 0.05, liftK: [-0.1, -0.02] },
  hairgrass: { lift: [0, 0], pile: 0, tilt: 0.12, liftK: [-0.08, 0] },
  twig: { lift: [0.5, 1.5], pile: 2, tilt: 0.1 },
};

const plantCache = new Map<string, ScatterKind[]>();
/** Most vertices one patch of plants may draw (a heavy species gets fewer clumps rather than a slow frame). */
const PLANT_VERTS = 1_200_000;
/** The painted plant's own clumps: three seeds of the library plant built once (its real geometry, a small clump), instanced. */
function plantKinds(S: TankSetup, T: Tank, variant: string): ScatterKind[] {
  const key = `${variant}|${JSON.stringify([T, S.water.on && S.water.level, S.lid])}`;
  let ks = plantCache.get(key); if (ks) return ks;
  ks = [];
  for (let k = 0; k < 3; k++) {
    const it = { id: 9000 + k, kind: 'plant', variant, seed: 11 + k * 17, x: T.L / 2, depth: T.D / 2, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: libSize(variant), spread: 45 } as Item;
    const m = itemMesh(S, T, it); if (!m) continue;
    const geo = m.geometry.clone(); geo.userData.keep = true; geo.computeBoundingBox();
    const bb = geo.boundingBox!, reach = Math.max(bb.max.x, -bb.min.x, bb.max.z, -bb.min.z) * 0.55;
    const mt = m.material as THREE.MeshBasicMaterial; mt.userData.keep = true;
    ks.push({ geo, mat: mt, weight: 1, size: [0.8, 1.2], reach });
  }
  if (plantCache.size >= 24) { const first = plantCache.keys().next().value!; for (const o of plantCache.get(first)!) o.geo.dispose(); plantCache.delete(first); }
  plantCache.set(key, ks); return ks;
}
const libSize = (variant: string) => (LIBRARY[variant]?.size ?? 100) * 0.8;

/** The instanced meshes of one patch lying on `ground`. */
export function patchMeshes(S: TankSetup, T: Tank, ground: GroundAt, p: Patch): THREE.InstancedMesh[] {
  let at = patchPoints(p); if (!at.length) return [];
  if (isPlantBrush(p.brush)) {
    const kinds = plantKinds(S, T, p.brush.slice(6)); if (!kinds.length) return [];
    const verts = kinds.reduce((a, k) => a + k.geo.attributes.position.count, 0) / kinds.length;
    at = at.slice(0, Math.max(1, Math.floor(PLANT_VERTS / verts)));
    return scatter(T, ground, { seed: p.seed, count: at.length, at, kinds, lift: [0, 0], pile: 0, tilt: 0.04, slope: 0.5, clump: 0, palette: [new THREE.Color(1, 1, 1)] });
  }
  const b = p.brush as LiteBrushId, f = FEEL[b], wy = S.water.on ? waterY(T, S.water.level) : -Infinity;
  const kinds = b === 'leaf' ? leafKinds(p.leaf ?? 'mixed') : kindsFor(b);
  const pal = b === 'leaf' ? undefined : PALETTE[b].map(c => c.clone().multiplyScalar(DIM[b]));
  return scatter(T, ground, {
    seed: p.seed, count: at.length, at, kinds, lift: f.lift, liftK: f.liftK, pile: f.pile, tilt: f.tilt, slope: b === 'leaf' ? 0.55 : 0.4, clump: 0,
    ...(pal ? { palette: pal } : {}),
    shade: y => (y < wy ? (b === 'leaf' ? 0.55 : 0.9) : 1),
  });
}
