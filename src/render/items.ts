// Meshes for aquascape items (scene/items.ts). Stones, wood and caves are real 3D, shaded per vertex (a top-front-left
// light baked in, like the hood and substrate); plants are crossed cards (one facing the glass, one edge-on, so they
// keep some body when orbiting). Each item is ONE mesh, so picking and the selection box are simple. Shapes are cached
// by (variant, seed, size) and the baked colours by turn as well: the scene rebuilds on every drag step.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { PLANT_ASPECT, type PlantType } from '../art/plants';
import { CARPET_H, CARPET_W, itemSink, stoneDims, woodLimbs, type Limb } from '../scene/items';
import { D2R } from '../scene/physics';
import { clampIn, insideBy } from '../scene/shape';
import { groundHeight } from '../scene/terrain';
import type { Item, Tank, TankSetup } from '../scene/types';
import { cardMaterial, plantTexture } from './textures';

type R = () => number;
const LIGHT = new THREE.Vector3(-0.35, 1, 0.55).normalize();
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const C = (hex: string) => new THREE.Color(hex);

/** Smooth pseudo-noise from a few random plane waves (enough for stones and bark; no texture needed). */
function waves(r: R, n = 6) {
  const w = Array.from({ length: n }, () => ({ d: V(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(1 + r() * 3), ph: r() * 6.28 }));
  return (p: THREE.Vector3) => w.reduce((a, q) => a + Math.sin(p.dot(q.d) + q.ph), 0) / n;
}

/** Set the unlit colour per vertex (stored in 'color'; bake() multiplies the light in). */
function paint(g: THREE.BufferGeometry, col: (p: THREE.Vector3, i: number) => THREE.Color) {
  const p = g.attributes.position, out = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { const c = col(v.fromBufferAttribute(p, i), i); out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g;
}
const shade = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);

/** Flip a geometry inside out (the inner wall of a cave). */
function inward(g: THREE.BufferGeometry) {
  const idx = g.index!;
  for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); }
  g.computeVertexNormals();
  return g;
}
/** Keep only position, normal and colour, all indexed or all not, so pieces merge. */
function clean(g: THREE.BufferGeometry, indexed: boolean) {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return indexed ? g : g.index ? g.toNonIndexed() : g;
}

// ---------- Stones ----------
const STONE: Record<string, string[]> = {
  river: ['#8a8378', '#9a9184', '#6e6a64', '#a89f90', '#7c7466', '#5f5c58'],
  seiryu: ['#6f7377', '#7d8084', '#62666b'],
  dragon: ['#8b6b4a', '#7d6248', '#94785a'],
  lava: ['#5a2f28', '#4a2b26', '#63362b'],
  slate: ['#4c5058', '#55534f', '#4a4d52'],
};
function stoneShape(variant: string, seed: number, size: number) {
  const r = rng(seed), [l, h, w] = stoneDims(variant, seed, size), base = C(STONE[variant][Math.floor(r() * STONE[variant].length)]);
  if (variant === 'slate') return slab(r, l, h, w, base);
  const angular = variant !== 'river', crag = variant === 'seiryu';
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, crag ? 3 : 4);
  const nz = waves(r), fine = waves(r, 8), p = g.attributes.position, v = new THREE.Vector3(), cut = -0.55;
  const top = crag ? 1.25 : 1, hk = h / (top - cut), dent = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let k = 1 + (variant === 'river' ? 0.06 : 0.2) * nz(v.clone().multiplyScalar(angular ? 1.7 : 1.1));
    if (variant === 'dragon') k -= 0.2 * Math.max(0, fine(v.clone().multiplyScalar(5)) - 0.12); // pits and holes
    if (variant === 'lava') k += 0.08 * fine(v.clone().multiplyScalar(9)) - 0.1 * Math.max(0, nz(v.clone().multiplyScalar(14)) - 0.2);
    dent[i] = k;
    v.multiplyScalar(k);
    if (crag) v.y += 0.25 * Math.max(0, v.y); // taller, more upright crags
    p.setXYZ(i, v.x * l / 2, (Math.max(v.y, cut) - cut) * hk, v.z * w / 2);
  }
  if (crag) g.rotateZ((r() - 0.5) * 0.3);
  if (!angular) { g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g); } // smooth normals; others keep flat facets
  g.computeVertexNormals();
  const mot = waves(r, 5), vein = waves(r, 3);
  return paint(g, (q, i) => {
    let k = 1 + 0.16 * mot(q.clone().multiplyScalar(0.06));
    if (variant === 'dragon' || variant === 'lava') k *= 0.55 + 0.45 * Math.min(1, Math.max(0, (dent[i] - 0.8) / 0.25)); // dark crevices
    const c = shade(base, k);
    if (crag && Math.abs(Math.sin(q.y * 0.11 + 4 * vein(q.clone().multiplyScalar(0.02)))) < 0.06) c.lerp(C('#d9dcd8'), 0.55); // calcite veins
    return c;
  });
}
/** Slate: a slab with chipped edges and layered bands. */
function slab(r: R, l: number, h: number, w: number, base: THREE.Color) {
  const g = new THREE.BoxGeometry(1, 1, 1, 6, 3, 5), nz = waves(r), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const e = nz(v.clone().multiplyScalar(3.2)), edge = Math.max(Math.abs(v.x), Math.abs(v.z)) * 2; // 1 at the rim
    const x = v.x * (1 + 0.12 * e), z = v.z * (1 + 0.12 * nz(v.clone().addScalar(3).multiplyScalar(2.6)));
    const y = (v.y + 0.5) * (v.y > 0 ? 1 - 0.25 * Math.max(0, edge - 0.6) + 0.06 * e : 1);
    p.setXYZ(i, x * l, y * h, z * w);
  }
  const ng = clean(g, false) as THREE.BufferGeometry;
  ng.computeVertexNormals();
  return paint(ng, q => shade(base, 1 + 0.1 * Math.sin(q.y / h * 22 + q.x * 0.01) + 0.06 * Math.sin(q.x * 0.05 + q.z * 0.07)));
}

// ---------- Wood ----------
const WOOD: Record<string, [string, string]> = { branch: ['#6b4a2e', '#5e4128'], spider: ['#a3845e', '#8e7050'], manzanita: ['#74392a', '#8b4a36'], mopani: ['#3e2a1c', '#a3855c'] };
function limbGeo(r: R, L: Limb, cols: [string, string], variant: string) {
  const curve = new THREE.CatmullRomCurve3(L.pts.map(p => V(...p))), len = curve.getLength(), TS = Math.max(8, Math.min(48, Math.round(len / Math.max(4, L.r0)))), RS = L.r0 > 6 ? 10 : 7;
  const g = new THREE.TubeGeometry(curve, TS, 1, RS, false), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), knot = r() * 10;
  for (let i = 0; i <= TS; i++) {
    const t = i / TS; curve.getPointAt(t, c);
    const rad = (L.r0 + (L.r1 - L.r0) * t) * (1 + 0.1 * Math.sin(t * 19 + knot));
    for (let j = 0; j <= RS; j++) { const k = i * (RS + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(rad * (1 + 0.07 * Math.sin(j * 2.3 + i * 0.7))).add(c); p.setXYZ(k, v.x, v.y, v.z); }
  }
  g.computeVertexNormals();
  const base = C(cols[L.tone]), light = C(cols[1]), patch = waves(r, 4);
  paint(g, (q, i) => {
    const j = i % (RS + 1), grain = 1 + 0.16 * Math.sin(j * 2.9 + knot) + 0.06 * Math.sin(i * 0.37);
    if (variant === 'mopani') return base.clone().lerp(light, Math.min(1, Math.max(0, patch(q.clone().multiplyScalar(0.025)) * 2.2 + 0.35))).multiplyScalar(grain); // two-tone
    return shade(base, grain);
  });
  const parts = [clean(g, true)];
  for (const [t, rad] of [[0, L.r0], [1, L.r1]] as const) {
    const s = new THREE.SphereGeometry(rad * 1.02, RS, 6); s.translate(...curve.getPointAt(t).toArray() as [number, number, number]);
    parts.push(clean(paint(s, () => shade(base, 1.15)), true));
  }
  return mergeGeometries(parts)!;
}
function woodShape(variant: string, seed: number, size: number) {
  const r = rng(seed * 13 + 5);
  return mergeGeometries(woodLimbs(variant, seed, size).map(L => limbGeo(r, L, WOOD[variant] ?? WOOD.branch, variant)))!;
}

// ---------- Caves ----------
function caveShape(variant: string, seed: number, size: number) {
  const r = rng(seed * 7 + 11), s = size;
  if (variant === 'tube') {
    const rad = 0.21 * s, outer = C('#b0603a'), inner = C('#6a3a24'), nz = waves(r, 4);
    const o = new THREE.CylinderGeometry(rad, rad, s, 24, 1, true), i = inward(new THREE.CylinderGeometry(rad * 0.84, rad * 0.84, s, 24, 1, true));
    const parts = [paint(o, q => shade(outer, 1 + 0.08 * nz(q.clone().multiplyScalar(0.05)))), paint(i, () => inner)];
    for (const y of [-s / 2, s / 2]) { const ring = new THREE.RingGeometry(rad * 0.84, rad, 24).rotateX(y > 0 ? -Math.PI / 2 : Math.PI / 2).translate(0, y, 0); parts.push(paint(ring, () => shade(outer, 0.9))); }
    const g = mergeGeometries(parts.map(q => clean(q, true)))!;
    return g.rotateZ(Math.PI / 2).translate(0, rad, 0);
  }
  if (variant === 'coconut') {
    const rad = s / 2, outer = C('#4e3423'), inner = C('#7a5a3a'), fib = waves(r, 5);
    const door = (x: number, y: number, z: number) => z > 0.3 * rad && y < 0.55 * rad && Math.abs(x) < 0.38 * rad;
    const half = (k: number) => {
      const g = new THREE.SphereGeometry(rad * k, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed(), p = g.attributes.position, keep: number[] = [];
      for (let t = 0; t < p.count; t += 3) {
        const cx = (p.getX(t) + p.getX(t + 1) + p.getX(t + 2)) / 3, cy = (p.getY(t) + p.getY(t + 1) + p.getY(t + 2)) / 3, cz = (p.getZ(t) + p.getZ(t + 1) + p.getZ(t + 2)) / 3;
        if (!door(cx, cy, cz)) for (let q = 0; q < 3; q++) keep.push(p.getX(t + q), p.getY(t + q) * 0.92, p.getZ(t + q));
      }
      const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
      return out;
    };
    const o = half(1), i = half(0.93), ip = i.attributes.position;
    for (let t = 0; t < ip.count; t += 3) { const x = ip.getX(t + 1), y = ip.getY(t + 1), z = ip.getZ(t + 1); ip.setXYZ(t + 1, ip.getX(t + 2), ip.getY(t + 2), ip.getZ(t + 2)); ip.setXYZ(t + 2, x, y, z); }
    o.computeVertexNormals(); i.computeVertexNormals();
    paint(o, q => shade(outer, 1 + 0.14 * Math.sin(Math.atan2(q.z, q.x) * 40 + 3 * fib(q.clone().multiplyScalar(0.05)))));
    paint(i, () => inner);
    return mergeGeometries([o, i])!;
  }
  // arch: half a rough torus standing on its two feet
  const tr = 0.16 * s, R0 = 0.5 * s - tr, g0 = new THREE.TorusGeometry(R0, tr, 9, 30, Math.PI), nz = waves(r), p = g0.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.y, v.x), c = V(Math.cos(a) * R0, Math.sin(a) * R0, 0), d = v.clone().sub(c);
    d.multiplyScalar(1 + 0.25 * nz(v.clone().multiplyScalar(2.2 / s * 3)));
    v.copy(c).add(d.setZ(d.z * 1.4));
    p.setXYZ(i, v.x, Math.max(0, v.y), v.z);
  }
  const g = clean(g0, false), base = C(r() < 0.5 ? STONE.seiryu[0] : '#7d7064'), mot = waves(r, 5);
  g.computeVertexNormals();
  return paint(g, q => shade(base, 1 + 0.16 * mot(q.clone().multiplyScalar(0.05))));
}

// ---------- Plants ----------
/** Crossed cards, base at y = 0; a carpet patch = many small crossed cards in a disc, each set on the ground under it
 *  (spot() moves a card in from the glass and gives the width it has room for, or null leaves it out). */
function plantGeo(type: PlantType, seed: number, h: number, spot?: (lx: number, lz: number) => { x: number; y: number; z: number; w: number } | null) {
  const cards: THREE.BufferGeometry[] = [];
  const card = (w: number, hh: number, x: number, y: number, z: number, turn: number, crop = 1) => {
    for (const k of [0, 1]) {
      const pg = new THREE.PlaneGeometry(w, hh), uv = pg.attributes.uv;
      if (crop < 1) for (let i = 0; i < uv.count; i++) uv.setX(i, 0.5 + (uv.getX(i) - 0.5) * crop); // a narrowed card shows the middle of the picture, not a squeezed one
      cards.push(pg.translate(0, hh / 2, 0).rotateY(turn + k * Math.PI / 2).translate(x, y, z));
    }
  };
  if (type === 'carpet') {
    const r = rng(seed), rad = h / 2 - CARPET_W * 0.35, n = Math.max(3, Math.round(h * h / 4200));
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * Math.max(0, rad), x = Math.cos(a) * d, z = Math.sin(a) * d;
      const hh = CARPET_H * (0.8 + r() * 0.4), turn = (r() - 0.5) * 0.5, p = spot ? spot(x, z) : { x, y: 0, z, w: CARPET_W }; // draws taken even for a dropped card: the rest stay put
      if (p) card(p.w, hh, p.x, p.y, p.z, turn, p.w / CARPET_W);
    }
  } else card(h / PLANT_ASPECT[type], h, 0, 0, 0, 0);
  const g = mergeGeometries(cards)!;
  g.userData.keep = true;
  return g;
}

// ---------- Caches and assembly ----------
const vcMat = (() => { const m = new THREE.MeshBasicMaterial({ vertexColors: true }); m.userData.keep = true; return m; })();
const shapes = new Map<string, THREE.BufferGeometry>(), baked = new Map<string, THREE.BufferGeometry>(), plants = new Map<string, THREE.BufferGeometry>();
function remember<T>(m: Map<string, T>, k: string, v: T, max: number, drop?: (v: T) => void) {
  m.set(k, v);
  if (m.size > max) { const [k0, v0] = m.entries().next().value!; m.delete(k0); drop?.(v0); }
  return v;
}
const dispose = (g: THREE.BufferGeometry) => g.dispose();

function solidShape(it: Item) {
  const k = `${it.variant}|${it.seed}|${it.size}`;
  return shapes.get(k) ?? remember(shapes, k, it.kind === 'stone' ? stoneShape(it.variant, it.seed, it.size) : it.kind === 'wood' ? woodShape(it.variant, it.seed, it.size) : caveShape(it.variant, it.seed, it.size), 150, dispose);
}
/** The shape with the light baked in for its turn and lean (the light stays put in the room while the piece turns). */
function bakedShape(it: Item) {
  const k = `${it.variant}|${it.seed}|${it.size}|${it.yaw}|${it.tilt}`;
  let g = baked.get(k);
  if (g) return g;
  const src = solidShape(it), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.yaw * D2R, it.tilt * D2R, 'YXZ')).invert();
  const L = LIGHT.clone().applyQuaternion(q), U = V(0, 1, 0).applyQuaternion(q);
  g = src.clone();
  const n = g.attributes.normal, a = src.attributes.color, out = new Float32Array(n.count * 3), nn = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    nn.fromBufferAttribute(n, i);
    const k2 = 0.42 + 0.72 * Math.max(0, nn.dot(L)) + 0.08 * nn.dot(U);
    out[i * 3] = a.getX(i) * k2; out[i * 3 + 1] = a.getY(i) * k2; out[i * 3 + 2] = a.getZ(i) * k2;
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.keep = true;
  return remember(baked, k, g, 400, dispose);
}

/** One placed item as a mesh in tank space (userData.item = its id, userData.plant for plants). Null = no room for it. */
export function itemMesh(S: TankSetup, T: Tank, it: Item): THREE.Mesh | null {
  const ground = groundHeight(S, T, it.x, it.depth), y = ground + it.lift - itemSink(it);
  let m: THREE.Mesh;
  if (it.kind === 'plant') {
    const type = it.variant as PlantType, carpet = type === 'carpet';
    const h = carpet ? it.size : Math.min(it.size, T.H - y - 15); // stops at the water line (the old layouts' rule)
    if (h < 15) return null;
    const c = Math.cos(it.yaw * D2R), s = Math.sin(it.yaw * D2R);
    // a carpet hugs the ground under each card: its key carries the spot (rebuilt only while it moves)
    const k = carpet ? `carpet|${it.seed}|${it.size}|${Math.round(it.x)}|${Math.round(it.depth)}|${it.yaw}|${it.lift}|${T.shape}|${T.L}|${T.D}|${T.sides}|${T.bowMin}` :`${type}|${it.seed}|${Math.round(h)}`;
    // near the glass a card is cut down to the width it has room for, so the carpet runs right up to the glass without
    // poking through; a card past the edge line is mirrored back in by as much (keeping the edge thick), and one more
    // than half a card past it is left out
    const EDGE = 8;
    const at = (lx: number, lz: number) => {
      let x = it.x + lx * c + lz * s, d = it.depth + lx * s - lz * c;
      const e = EDGE - insideBy(T, x, d);
      if (e > CARPET_W / 2) return null;
      if (e > 0) ({ x, depth: d } = clampIn(T, x, d, EDGE + e));
      const dx = x - it.x, dd = d - it.depth;
      return { x: dx * c + dd * s, y: groundHeight(S, T, x, d) - ground, z: dx * s - dd * c, w: Math.min(CARPET_W, 2 * insideBy(T, x, d)) };
    };
    const g = plants.get(k) ?? remember(plants, k, plantGeo(type, it.seed, h, carpet ? at : undefined), 300, dispose);
    if (carpet) g.computeBoundingBox();
    m = new THREE.Mesh(g, cardMaterial('plant:' + type, plantTexture(type), S.render.edge));
    m.userData.plant = true;
  } else m = new THREE.Mesh(bakedShape(it), vcMat);
  m.position.set(it.x, y, -it.depth);
  m.rotation.set(0, it.yaw * D2R, it.tilt * D2R, 'YXZ');
  m.userData.item = it.id;
  return m;
}
