// Roots against the glass (Nathan 2026-10-15): a plant planted near a pane shows its roots in the substrate's face there,
// as in a real tank. Drawn as thin ribbons in the plane of the pane, just outside the substrate's skirt (between it and
// the glass). How many, how long, how thick and how deep come from the plant's kind, its size and growth, how close it
// is to the pane, how crowded it is (its own stems or crowns and its neighbours' roots) and the substrate's depth there:
// a shallow bed turns them along the bottom glass into a mat, a deep one lets the big feeders run down.
import * as THREE from 'three';
import { PLANT3D, isCarpet, isFloat, type PlantType } from '../art/plants';
import { rng } from '../art/paint';
import { growthNow } from '../scene/growtime';
import { itemDims, plantBaseR } from '../scene/items';
import { footprint, shapeOf } from '../scene/shape';
import { groundHeight } from '../scene/terrain';
import type { Item, Tank, TankSetup } from '../scene/types';
import { clumpAuto } from './plant3d';

/**
 * Root habit per kind. reach: how far past its base the roots spread (fraction of the plant's height, carpets: of a
 * fixed 30 mm); deep: how deep they go at full growth (mm per mm of height, capped at `max`); per: main roots per 10 mm
 * of glass they cover, right at the pane; th: main root thickness (mm); fine: share of thin side roots; run: chance a
 * root is a runner along just under the surface (vallisneria, sagittaria); col: young root colour, old: aged.
 */
interface Habit { reach: number; deep: number; max: number; per: number; th: number; fine: number; run: number; col: number; old: number }
const HEAVY: Habit = { reach: 0.45, deep: 0.5, max: 110, per: 3.2, th: 0.9, fine: 0.6, run: 0, col: 0xe8dcc0, old: 0x8a6a44 };
const HABIT: Partial<Record<PlantType, Habit>> = {
  sword: HEAVY, ozelot: HEAVY,
  lotus: { ...HEAVY, deep: 0.45, per: 2.4, th: 1, col: 0xe4d4b4, old: 0x6e4a32 },
  crypt: { reach: 0.4, deep: 0.45, max: 80, per: 3.6, th: 0.6, fine: 0.5, run: 0.08, col: 0xeee4cc, old: 0x9a7a52 },
  grass: { reach: 0.12, deep: 0.12, max: 70, per: 2.6, th: 0.55, fine: 0.4, run: 0.3, col: 0xf0ead6, old: 0xa48862 },
  balansae: { reach: 0.12, deep: 0.12, max: 70, per: 2.2, th: 0.6, fine: 0.4, run: 0.15, col: 0xece2c8, old: 0x9a7a54 },
  sagittaria: { reach: 0.5, deep: 0.35, max: 40, per: 3, th: 0.45, fine: 0.5, run: 0.35, col: 0xf2ecd8, old: 0xa89068 },
  stem: { reach: 0.06, deep: 0.08, max: 45, per: 1.4, th: 0.35, fine: 0.7, run: 0, col: 0xf4f0e2, old: 0xb09a78 },
  stemred: { reach: 0.06, deep: 0.08, max: 45, per: 1.4, th: 0.35, fine: 0.7, run: 0, col: 0xf2e6dc, old: 0xa88470 },
  rotala: { reach: 0.06, deep: 0.08, max: 40, per: 1.6, th: 0.3, fine: 0.7, run: 0, col: 0xf4eee2, old: 0xb09a78 },
  ludwigia: { reach: 0.07, deep: 0.09, max: 45, per: 1.5, th: 0.35, fine: 0.7, run: 0, col: 0xf0e0d4, old: 0xa07a66 },
  carpet: { reach: 1, deep: 0, max: 22, per: 5, th: 0.22, fine: 0.8, run: 0.2, col: 0xf6f2e6, old: 0xbcaa88 },
  // rhizome plants belong on wood or rock; planted in the ground they put down a few wiry roots
  fern: { reach: 0.25, deep: 0.15, max: 40, per: 1, th: 0.5, fine: 0.4, run: 0, col: 0x6a5238, old: 0x3a2c20 },
  anubias: { reach: 0.3, deep: 0.2, max: 45, per: 1.2, th: 0.8, fine: 0.3, run: 0, col: 0xd8ccb0, old: 0x6a5238 },
  buce: { reach: 0.25, deep: 0.15, max: 35, per: 1, th: 0.6, fine: 0.3, run: 0, col: 0x7a6044, old: 0x40301e },
};

/** A plant's roots, as they reach toward the glass. */
interface Rooted { it: Item; x: number; d: number; reach: number; deep: number; dens: number; age: number; hab: Habit }

/** The ribbons of every plant's roots that show at the glass, one mesh (null: none show). */
export function rootsMesh(S: TankSetup, T: Tank): THREE.Mesh | null {
  if (!S.substrate.show && !S.terrain.on) return null;
  if (shapeOf(T) === 'bowl') return null; // curved glass: not yet
  const plants: Rooted[] = [];
  for (const it of S.items) {
    if (it.kind !== 'plant' || isFloat(it.variant) || it.lift > 2) continue; // floating, or up on the hardscape
    const hab = HABIT[it.variant as PlantType]; if (!hab) continue;
    const [w, h] = itemDims(it), gr = Math.min(1, Math.max(0, growthNow(it))), age = 0.25 + 0.75 * gr;
    const carpet = isCarpet(it.variant), base = carpet ? w / 2 : plantBaseR(it);
    // planting density within the plant: more stems or crowns put down more roots
    const own = it.stems ?? (PLANT3D[it.variant as PlantType] ? clumpAuto(it.variant as PlantType, it.seed, it.size).stems : 1);
    const per = PLANT3D[it.variant as PlantType]?.form === 'stem' ? 6 : 2;
    plants.push({ it, x: it.x, d: it.depth, hab, age,
      reach: base + (carpet ? 30 : h) * hab.reach * age, deep: (carpet ? hab.max : Math.min(hab.max, h * hab.deep)) * (0.35 + 0.65 * gr),
      dens: Math.min(2.2, Math.max(0.5, Math.sqrt(own / per))) * age });
  }
  if (!plants.length) return null;
  // crowding: roots of neighbours that overlap push each other out toward the glass, and the bed fills denser
  for (const p of plants) {
    let n = 0; for (const q of plants) if (q !== p && Math.hypot(q.x - p.x, q.d - p.d) < (p.reach + q.reach) * 0.6) n++;
    const c = Math.min(1.7, 1 + 0.14 * n); p.reach *= Math.sqrt(c); p.dens *= c;
  }
  const pos: number[] = [], col: number[] = [], out = 0.2; // mm outside the skirt (the glass's outer face is 0.5 mm off)
  const fp = footprint(T);
  for (const p of plants) for (const e of fp.edges) {
    const dist = -((p.x - e.a[0]) * e.n[0] + (p.d - e.a[1]) * e.n[1]);
    if (dist >= p.reach || dist < -1) continue;
    const dir = [(e.b[0] - e.a[0]) / e.len, (e.b[1] - e.a[1]) / e.len], t0 = (p.x - e.a[0]) * dir[0] + (p.d - e.a[1]) * dir[1];
    const c = Math.sqrt(p.reach * p.reach - Math.max(0, dist) ** 2), u0 = Math.max(0.5, t0 - c), u1 = Math.min(e.len - 0.5, t0 + c);
    if (u1 - u0 < 1) continue;
    const prox = 1 - Math.max(0, dist) / p.reach, r = rng(p.it.seed * 131 + Math.round(e.s0) * 7 + 3);
    const gy = (u: number) => groundHeight(S, T, e.a[0] + dir[0] * u, e.a[1] + dir[1] * u);
    // the pane's point (u along it, y up) in the world, just outside the substrate
    const W = (u: number, y: number): [number, number, number] => [e.a[0] + dir[0] * u + e.n[0] * out, y, -(e.a[1] + dir[1] * u + e.n[1] * out)];
    const young = new THREE.Color(p.hab.col), old = new THREE.Color(p.hab.old), shade = 0.78; // as dark as the skirt
    /** One root from (u, y) heading a (radians, 0 = straight down, + toward +u), length len, thickness th. */
    const root = (u: number, y: number, a: number, len: number, th: number, tone: number, depth: number) => {
      const steps = Math.max(2, Math.round(len / 2.5)), step = len / steps, bot = Math.max(0.4, 0.15 * th);
      const cl = young.clone().lerp(old, tone).multiplyScalar(shade), tip = young.clone().multiplyScalar(shade * 1.05);
      let pu = u, py = y, pa = a;
      for (let k = 0; k < steps; k++) {
        pa += (r() - 0.5) * 0.7;
        let nu = pu + Math.sin(pa) * step, ny = py - Math.cos(pa) * step;
        if (ny < bot) { ny = bot; pa = Math.sign(Math.sin(pa) || (r() - 0.5)) * (1.35 + r() * 0.25); } // along the bottom glass
        const top = gy(nu) - 0.6; if (ny > top) { ny = top; pa = Math.sign(Math.sin(pa) || 1) * 1.2 + (r() - 0.5) * 0.4; } // stays under the surface
        if (nu < 0.5 || nu > e.len - 0.5) break;
        const f0 = 1 - k / steps, f1 = 1 - (k + 1) / steps, w0 = th * (0.3 + 0.7 * f0) / 2, w1 = th * (0.3 + 0.7 * f1) / 2;
        const du = nu - pu, dy = ny - py, l = Math.hypot(du, dy) || 1, su = -dy / l, sy = du / l;
        const q = [W(pu + su * w0, py + sy * w0), W(pu - su * w0, py - sy * w0), W(nu - su * w1, ny - sy * w1), W(nu + su * w1, ny + sy * w1)];
        const c0 = cl.clone().lerp(tip, 1 - f0), c1 = cl.clone().lerp(tip, 1 - f1);
        for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...q[i]); const cc = i < 2 ? c0 : c1; col.push(cc.r, cc.g, cc.b); }
        // side roots off the main ones, thin and short
        if (depth < 1 && th > 0.25 && r() < p.hab.fine * 0.45) root(nu, ny, pa + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.6), len * (0.15 + r() * 0.25) * f1, th * 0.45, Math.max(0, tone - 0.3), depth + 1);
        pu = nu; py = ny;
      }
    };
    const n = Math.min(70, Math.round(p.hab.per * (u1 - u0) / 10 * prox ** 1.3 * p.dens));
    for (let i = 0; i < n; i++) {
      // most roots come down near the plant's own line on the pane, fewer toward the ends of its reach
      const u = Math.min(u1, Math.max(u0, t0 + (r() + r() - 1) * c)), g = gy(u); if (g < 3) continue;
      const y = g - 1 - r() * Math.min(6, g * 0.25), side = Math.sign(u - t0) || 1, tone = Math.min(1, p.age * (0.3 + r() * 0.7));
      // the deeper the bed the further the feeders go; an old plant's longest roots reach the floor
      const len = Math.max(3, (p.deep + 4) * (0.4 + r() * 0.8) * (0.7 + 0.3 * prox));
      const th = p.hab.th * (0.55 + r() * 0.6) * (0.6 + 0.4 * p.age);
      if (r() < p.hab.run) root(u, Math.max(1, g - 2 - r() * 3), side * (1.45 + r() * 0.15), len * 1.4, th * 0.9, tone, 0); // a runner just under the surface
      else root(u, y, side * r() * 0.6 + (r() - 0.5) * 0.3, Math.min(len, g * 3), th, tone, 0);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  m.userData.roots = true;
  return m;
}

/** What the roots depend on besides the ground (a change to the ground rebuilds the whole tank). */
export const rootsKey = (S: TankSetup) => 'roots' + JSON.stringify(S.items.filter(it => it.kind === 'plant' && !isFloat(it.variant))
  .map(it => [it.variant, it.seed, Math.round(it.x), Math.round(it.depth), it.size, it.spread, it.stems, it.lift > 2, Math.round(growthNow(it) * 20)]));
