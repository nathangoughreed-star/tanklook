// Preset aquascapes: generated from the tank size and a seed, never hand-placed. Stones and driftwood are real 3D
// meshes shaded per vertex (a top-front-left light baked in, like the hood and substrate); plants are crossed cards
// (one facing the glass, one edge-on to it, so they keep some body when orbiting). All sizes are physical (mm), so a
// bigger tank gets more pieces, not bigger ones. Built groups are cached: the scene rebuilds on every drag step.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { PLANT_ASPECT, type PlantType } from '../art/plants';
import { clamp, substrateHeight } from '../scene/physics';
import type { LayoutId, Scene, Tank } from '../scene/types';
import { cardMaterial, plantTexture } from './textures';

export const LAYOUTS: Record<LayoutId, { label: string; hint: string }> = {
  none: { label: 'Bare tank', hint: 'No rocks, wood or plants.' },
  stones: { label: 'River stones', hint: 'A pile of smooth stones in the centre.' },
  driftwood: { label: 'Driftwood', hint: 'Branchy wood with java fern and anubias.' },
  planted: { label: 'Dense planted', hint: 'Stem plants and grasses at the back, swords, a carpet in front.' },
  iwagumi: { label: 'Iwagumi', hint: 'Angular stones on a low carpet.' },
};

type R = () => number;
const LIGHT = new THREE.Vector3(-0.35, 1, 0.55).normalize();
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Smooth pseudo-noise from a few random plane waves (enough for stones and bark; no texture needed). */
function waves(r: R, n = 6) {
  const w = Array.from({ length: n }, () => ({ d: V(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(1 + r() * 3), ph: r() * 6.28 }));
  return (p: THREE.Vector3) => w.reduce((a, q) => a + Math.sin(p.dot(q.d) + q.ph), 0) / n;
}

/** Bake light + mottling into vertex colours. */
function bake(g: THREE.BufferGeometry, base: THREE.Color, mottle: (p: THREE.Vector3, i: number) => number) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, cols: number[] = [], v = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i);
    const k = (0.42 + 0.72 * Math.max(0, nn.dot(LIGHT)) + 0.08 * nn.y) * mottle(v, i);
    cols.push(base.r * k, base.g * k, base.b * k);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
}
function keep(m: THREE.Mesh) { m.geometry.userData.keep = true; (m.material as THREE.Material).userData.keep = true; return m; }
const vcMat = () => new THREE.MeshBasicMaterial({ vertexColors: true });

/** A stone: displaced sphere with a flattened base, radii (rx, ry, rz) mm, sitting with its base at `y`. */
function stone(r: R, rx: number, ry: number, rz: number, color: string, angular: boolean) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, angular ? 3 : 4);
  const nz = waves(r), p = g.attributes.position, v = new THREE.Vector3(), base = -0.55;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 + (angular ? 0.22 : 0.06) * nz(v.clone().multiplyScalar(angular ? 1.7 : 1.1)));
    if (angular) v.y += 0.25 * Math.max(0, v.y); // taller, more upright crags
    p.setXYZ(i, v.x * rx, Math.max(v.y, base) * ry, v.z * rz);
  }
  g.rotateY(r() * Math.PI * 2); g.rotateZ((r() - 0.5) * (angular ? 0.35 : 0.15));
  g.translate(0, -base * ry, 0); // base on y = 0
  if (!angular) { g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g); } // smooth normals; angular keeps flat facets
  const mot = waves(r, 5);
  bake(g, new THREE.Color(color), q => 1 + 0.16 * mot(q.clone().multiplyScalar(0.06)));
  return keep(new THREE.Mesh(g, vcMat()));
}

/** A driftwood limb along `pts`, radius r0 -> r1, bark streaks along its length; ends capped. */
function limb(r: R, pts: THREE.Vector3[], r0: number, r1: number, color: string) {
  const curve = new THREE.CatmullRomCurve3(pts), TS = 48, RS = 10, g = new THREE.TubeGeometry(curve, TS, 1, RS, false);
  const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), knot = r() * 10;
  for (let i = 0; i <= TS; i++) {
    const t = i / TS; curve.getPointAt(t, c);
    const rad = (r0 + (r1 - r0) * t) * (1 + 0.1 * Math.sin(t * 19 + knot));
    for (let j = 0; j <= RS; j++) { const k = i * (RS + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(rad * (1 + 0.07 * Math.sin(j * 2.3 + i * 0.7))).add(c); p.setXYZ(k, v.x, v.y, v.z); }
  }
  const grain = (i: number) => { const j = i % (RS + 1); return 1 + 0.16 * Math.sin(j * 2.9 + knot) + 0.06 * Math.sin(i * 0.37); };
  bake(g, new THREE.Color(color), (_, i) => grain(i));
  const grp = new THREE.Group(); grp.add(keep(new THREE.Mesh(g, vcMat())));
  for (const [t, rad] of [[0, r0], [1, r1]] as const) {
    const s = new THREE.SphereGeometry(rad * 1.02, 10, 8); s.translate(...curve.getPointAt(t).toArray() as [number, number, number]);
    bake(s, new THREE.Color(color).multiplyScalar(1.15), () => 1);
    grp.add(keep(new THREE.Mesh(s, vcMat())));
  }
  return grp;
}

/** Two crossed plant cards (front-facing + edge-on), base at (x, y, depth), h mm tall. */
function plant(S: Scene, type: PlantType, x: number, y: number, depth: number, h: number, r: R) {
  const w = h / PLANT_ASPECT[type], g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); g.userData.keep = true;
  const m = cardMaterial('plant:' + type, plantTexture(type), S.render.edge), grp = new THREE.Group();
  const a = new THREE.Mesh(g, m), b = new THREE.Mesh(g, m);
  a.rotation.y = (r() - 0.5) * 0.5; b.rotation.y = a.rotation.y + Math.PI / 2;
  grp.add(a, b); grp.position.set(x, y, -depth);
  return grp;
}

function build(S: Scene, T: Tank, id: LayoutId, seed: number): THREE.Group {
  const out = new THREE.Group(), { L, H, D } = T, sub = (x: number, d: number) => substrateHeight(S.substrate, T, x, d);
  const r = rng(seed * 7919 + id.length * 104729);
  const room = (x: number, d: number, y = sub(x, d)) => H - y - 15; // headroom to the water line
  // Crossed cards reach half a card width in both x and depth whatever their turn, so the whole card must fit
  // inside the glass: a plant wider than the tank is scaled down, then its base is kept half a width from every pane.
  const addPlant = (type: PlantType, x: number, d: number, h: number, yIn?: number) => {
    const gap = 3, maxW = Math.min(L, D) - 2 * gap;
    let hh = Math.min(h, maxW * PLANT_ASPECT[type]);
    const half = hh / PLANT_ASPECT[type] / 2;
    x = clamp(x, half + gap, L - half - gap); d = clamp(d, half + gap, D - half - gap);
    const y = yIn ?? sub(x, d) - 4;
    hh = Math.min(hh, room(x, d, y)); if (hh > 15) out.add(plant(S, type, x, y, d, hh, r));
  };
  const addStone = (x: number, d: number, rx: number, ry: number, rz: number, color: string, angular = false, lift = 0) => {
    const s = stone(r, rx, ry, rz, color, angular); s.position.set(x, sub(x, d) - ry * 0.12 + lift, -d); out.add(s); return s;
  };
  const carpet = (d0: number, d1: number, skip?: (x: number, d: number) => boolean) => {
    const cw = 100, ch = cw * PLANT_ASPECT.carpet; // ~3 cm, like a trimmed Monte Carlo carpet
    for (let d = D * d0; d <= D * d1; d += 35) for (let x = 30 + r() * 30; x < L - 25; x += 65 + r() * 25) {
      const xx = x + (r() - 0.5) * 30, dd = d + (r() - 0.5) * 20;
      if (!skip?.(xx, dd)) addPlant('carpet', xx, dd, ch * (0.8 + r() * 0.4));
    }
  };

  if (id === 'stones') {
    const RIVER = ['#8a8378', '#9a9184', '#6e6a64', '#a89f90', '#7c7466', '#5f5c58'], col = () => RIVER[Math.floor(r() * RIVER.length)];
    const s0 = clamp(Math.min(L, D * 1.6, H * 1.4) * 0.22, 50, 180), cx = L * (0.45 + r() * 0.1), cz = D * 0.5;
    addStone(cx, cz, s0 * 0.7, s0 * 0.42, s0 * 0.55, col());
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.5, s = s0 * (0.4 + r() * 0.35), dist = s0 * (0.65 + r() * 0.35);
      addStone(cx + Math.cos(a) * dist, clamp(cz + Math.sin(a) * dist * 0.7, s * 0.5, D - s * 0.5), s * (0.5 + r() * 0.2), s * (0.3 + r() * 0.1), s * (0.4 + r() * 0.15), col());
    }
    for (let i = 0; i < 2; i++) { const s = s0 * (0.35 + r() * 0.15); addStone(cx + (r() - 0.5) * s0 * 0.5, cz + (r() - 0.5) * s0 * 0.3, s * 0.55, s * 0.3, s * 0.45, col(), false, s0 * 0.42 * 0.9); }
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, dist = s0 * (1.1 + r() * 1.0), s = 12 + r() * 16;
      addStone(clamp(cx + Math.cos(a) * dist, 20, L - 20), clamp(cz + Math.sin(a) * dist * 0.6, 20, D - 20), s * 0.6, s * 0.35, s * 0.5, col());
    }
  } else if (id === 'iwagumi') {
    const SEIRYU = ['#6f7377', '#7d8084', '#62666b'], col = () => SEIRYU[Math.floor(r() * 3)];
    const left = r() < 0.5, side = left ? 1 : -1, mx = L * (left ? 0.38 : 0.62), mh = clamp(H * 0.5, 70, 330);
    const stones: [number, number, number][] = [[mx, D * 0.55, 1], [mx + side * L * 0.2, D * 0.45, 0.6], [mx - side * L * 0.16, D * 0.7, 0.45], [mx + side * L * 0.36, D * 0.3, 0.3], [mx - side * L * 0.3, D * 0.35, 0.22]];
    const placed: [number, number, number][] = [];
    for (const [x, d, k] of stones) {
      const h = mh * k, xx = clamp(x, h * 0.4, L - h * 0.4), dd = clamp(d, h * 0.3, D - h * 0.3);
      const s = addStone(xx, dd, h * 0.42, h * 0.62, h * 0.32, col(), true); s.rotation.z = side * 0.12; placed.push([xx, dd, h * 0.45]);
    }
    carpet(0.05, 0.95, (x, d) => placed.some(([px, pd, rr]) => Math.hypot(x - px, (d - pd) * 1.3) < rr));
    for (const [px, pd, rr] of placed) for (let i = 0; i < 3; i++) addPlant('grass', px + (r() - 0.5) * rr * 2.4, pd + rr * 0.8 + r() * 20, 60 + r() * 40);
  } else if (id === 'driftwood') {
    const WOOD = '#6b4a2e', rad = clamp(L * 0.042, 18, 50), top = (y: number) => Math.min(y, H * 0.82);
    const flip = r() < 0.5, X = (f: number) => (flip ? 1 - f : f) * L;
    const trunk = [V(X(0.14), sub(X(0.14), D * 0.8) + rad * 0.3, -D * 0.8), V(X(0.36), top(H * 0.22), -D * 0.62), V(X(0.55), top(H * 0.5), -D * 0.48), V(X(0.7), top(H * 0.78), -D * 0.42)];
    out.add(limb(r, trunk, rad, rad * 0.35, WOOD));
    const along = new THREE.CatmullRomCurve3(trunk);
    for (const [t, dir, len] of [[0.45, -1, 0.22], [0.62, 1, 0.18], [0.3, 1, 0.15]] as const) {
      const p0 = along.getPointAt(t), dx = dir * (flip ? -1 : 1) * L * len;
      out.add(limb(r, [p0, V(p0.x + dx * 0.5, top(p0.y + H * 0.15), p0.z + D * 0.05), V(p0.x + dx, top(p0.y + H * 0.28), p0.z + (r() - 0.5) * D * 0.15)], rad * 0.5, rad * 0.18, WOOD));
    }
    const low = [V(X(0.92), sub(X(0.92), D * 0.85) + rad * 0.25, -D * 0.85), V(X(0.78), top(H * 0.12), -D * 0.7), V(X(0.62), top(H * 0.1), -D * 0.42)];
    out.add(limb(r, low, rad * 0.75, rad * 0.3, '#5e4128'));
    for (const t of [0.25, 0.55]) { const p = along.getPointAt(t); addPlant('fern', p.x, -p.z, clamp(H * 0.4, 90, 220), p.y + rad * 0.2); }
    for (const t of [0.4, 0.75]) { const p = new THREE.CatmullRomCurve3(low).getPointAt(t); addPlant('anubias', p.x, -p.z + 10, clamp(H * 0.22, 60, 130), p.y + rad * 0.2); }
    addPlant('anubias', X(0.2), D * 0.55, clamp(H * 0.25, 60, 140));
    for (const fx of [0.04, 0.1, 0.9, 0.96]) addPlant('grass', X(fx), D * (0.85 + r() * 0.1), H * (0.8 + r() * 0.15));
    for (let i = 0; i < 8; i++) { const s = 12 + r() * 18, x = X(0.1 + r() * 0.3); addStone(x, D * (0.6 + r() * 0.3), s * 0.6, s * 0.35, s * 0.5, '#7c7466'); }
  } else if (id === 'planted') {
    const BACK: PlantType[] = ['stem', 'stemred', 'grass', 'stem', 'stemred', 'stem'];
    const n = Math.max(4, Math.round(L / 70));
    for (let i = 0; i < n; i++) {
      const x = L * (0.03 + 0.94 * i / (n - 1)), type = BACK[(i + Math.floor(r() * 2)) % BACK.length];
      for (let k = 0; k < 2; k++) addPlant(type, x + (r() - 0.5) * 40, D * (0.78 + r() * 0.17), (H - sub(x, D * 0.85)) * (0.78 + r() * 0.2));
    }
    for (let x = L * 0.05; x < L * 0.97; x += 130 + r() * 50) {
      if (x > L * 0.38 && x < L * 0.62) continue; // open swimming space mid-front
      const t: PlantType = r() < 0.5 ? 'sword' : 'stem', d = D * (0.48 + r() * 0.18);
      addPlant(t, x, d, t === 'sword' ? clamp(H * 0.6, 120, 380) : H * (0.45 + r() * 0.15));
    }
    for (const fx of [0.08, 0.92]) addPlant('anubias', L * fx, D * 0.32, clamp(H * 0.22, 60, 130));
    carpet(0.04, 0.34);
  }
  return out;
}

const cache = new Map<string, THREE.Group>();
/** The layout for tank T, cached by everything it depends on; returns a clone sharing geometry and materials. */
export function layoutGroup(S: Scene, T: Tank): THREE.Group | null {
  const { id, seed } = S.layout; if (id === 'none') return null;
  const key = JSON.stringify([id, seed, T, S.substrate, S.render.edge]);
  let g = cache.get(key);
  if (!g) {
    g = build(S, T, id, seed); cache.set(key, g);
    if (cache.size > 6) { const [k0, g0] = cache.entries().next().value!; cache.delete(k0); release(g0); }
  }
  return g.clone(true);
}
function release(g: THREE.Group) {
  g.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.geometry.dispose(); const mat = m.material as THREE.Material; if (!mat.userData.cached) mat.dispose(); });
}
