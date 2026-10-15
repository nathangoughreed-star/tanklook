// Dark spots (Nathan 2026-10-15: "the point of this feature is to identify any dark spots in the tank like at upper
// edges or corners"): one see-through surface round every pocket of water where the light is below a set level (PAR 30
// by default, the low / medium line), the darkest point labelled, and the share of the water that is dark. The light
// model (scene/lightout.ts bandsAt, on a surface facing up, as the substrate map and the layer read it) is sampled on a
// grid through the water, right up to the glass and the surface, and the level traced by marching tetrahedra; the
// surface is left open where it meets the glass or the ground. Built again only when the light, tank or ground changes.
import * as THREE from 'three';
import { bandsAt, lightEnvCached, luxOf, parOf, wattsOf } from '../scene/lightout';
import { bowlRadius, insideBy } from '../scene/shape';
import { waterY } from '../scene/physics';
import { groundHeight } from '../scene/terrain';
import type { Tank, TankSetup } from '../scene/types';

// a cube's 8 corners (i, j, k bits) split into 6 tetrahedra along the 0-7 diagonal
const CORNER = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const TETS = [[0, 1, 3, 7], [0, 3, 2, 7], [0, 2, 6, 7], [0, 6, 4, 7], [0, 4, 5, 7], [0, 5, 1, 7]];

/** Triangles of the surface v = level through a grid of values (NaN-free), as world positions. */
function trace(v: Float32Array, inside: Uint8Array, n: [number, number, number], at: (i: number, j: number, k: number) => THREE.Vector3, level: number) {
  const [nx, ny, nz] = n, idx = (i: number, j: number, k: number) => (i * (ny + 1) + j) * (nz + 1) + k, tris: number[] = [];
  const P = Array.from({ length: 8 }, () => new THREE.Vector3()), val = new Array<number>(8);
  const mid = (a: number, b: number) => { const f = (level - val[a]) / (val[b] - val[a]); return P[a].clone().lerp(P[b], f); };
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    let any = 0, out = false;
    for (let c = 0; c < 8; c++) { const [a, b, d] = CORNER[c], q = idx(i + a, j + b, k + d); val[c] = v[q]; out ||= !inside[q]; any |= (val[c] > level ? 1 : 2); }
    if (any !== 3 || out) continue; // no surface here, or the cube reaches past the glass or into the ground
    for (let c = 0; c < 8; c++) { const [a, b, d] = CORNER[c]; P[c].copy(at(i + a, j + b, k + d)); }
    for (const t of TETS) {
      const ins = t.filter(c => val[c] > level), outs = t.filter(c => val[c] <= level);
      if (ins.length === 1) tri(mid(ins[0], outs[0]), mid(ins[0], outs[1]), mid(ins[0], outs[2]));
      else if (ins.length === 3) tri(mid(outs[0], ins[0]), mid(outs[0], ins[1]), mid(outs[0], ins[2]));
      else if (ins.length === 2) {
        const a = mid(ins[0], outs[0]), b = mid(ins[0], outs[1]), c = mid(ins[1], outs[0]), d = mid(ins[1], outs[1]);
        tri(a, b, d); tri(a, d, c);
      }
    }
  }
  return tris;
}

/** Where the light counts as dark by default: PAR 30, the low / medium line for plants (lux: 50 per µmol, 1,500). */
export const DARK_PAR = 30;
export const darkOf = (l: TankSetup['light'], unit: 'par' | 'lux') => (l.mapDark ?? DARK_PAR) * (unit === 'lux' ? 50 : 1);

type Grid = { v: Float32Array; inside: Uint8Array; n: [number, number, number]; at: (i: number, j: number, k: number) => THREE.Vector3; unit: 'par' | 'lux' };
const gridCache = new Map<string, Grid | null>();
/**
 * The light (PAR or lux on a surface facing up) on a grid through the water, from just above the floor to just under
 * the surface and just inside the glass, so the corners and the top edges are read (Nathan 2026-10-15: the point is
 * finding the dark spots there). Points below the ground or outside a curved outline are marked out. Cached.
 */
function sampleLight(S: TankSetup, T: Tank): Grid | null {
  const { mapSlice: _s, bright: _b, kelvin: _k, room: _r, mapShells: _m, mapDark: _d, mapStep: _p, mapStepLux: _x, ...l } = S.light;
  const key = JSON.stringify([T, l, S.lid, S.water, S.substrate, S.layout.id, S.layout.seed, S.terrain]);
  if (gridCache.has(key)) return gridCache.get(key)!;
  const env = lightEnvCached({ ...S, tank: T });
  let g: Grid | null = null;
  if (env) {
    const unit = S.light.mapUnit ?? 'par', top = (S.water.on ? waterY(T, S.water.level) : T.H) - 3, e = 4;
    const nx = 40, ny = Math.max(8, Math.round(nx * top / T.L)), nz = Math.max(8, Math.round(nx * T.D / T.L));
    const X = (i: number) => e + (T.L - 2 * e) * i / nx, Y = (j: number) => e + (top - 2 * e) * j / ny, Dp = (k: number) => e + (T.D - 2 * e) * k / nz;
    const v = new Float32Array((nx + 1) * (ny + 1) * (nz + 1)), inside = new Uint8Array(v.length);
    let n = 0;
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) for (let k = 0; k <= nz; k++, n++) {
      const x = X(i), y = Y(j), d = Dp(k);
      inside[n] = insideBy(T, x, d) > 0 && Math.hypot(x - T.L / 2, d - T.D / 2) <= bowlRadius(T, y) && y >= groundHeight(S, T, x, d) ? 1 : 0;
      const b = bandsAt(env, [x, y, -d]);
      v[n] = unit === 'lux' ? luxOf(b) : parOf(b);
    }
    g = { v, inside, n: [nx, ny, nz], at: (i, j, k) => new THREE.Vector3(X(i), Y(j), -Dp(k)), unit };
  }
  gridCache.set(key, g); if (gridCache.size > 4) gridCache.delete(gridCache.keys().next().value!);
  return g;
}

/** How much of the water is below the dark level, and the darkest point (its value and where, in words). */
export function darkStats(S: TankSetup, T: Tank) {
  const g = sampleLight(S, T);
  if (!g) return null;
  const thr = darkOf(S.light, g.unit), [nx, ny, nz] = g.n;
  let all = 0, dark = 0, min = Infinity, at = 0;
  for (let q = 0; q < g.v.length; q++) if (g.inside[q]) { all++; if (g.v[q] < thr) dark++; if (g.v[q] < min) { min = g.v[q]; at = q; } }
  if (!all) return null;
  const k = at % (nz + 1), j = Math.floor(at / (nz + 1)) % (ny + 1), i = Math.floor(at / ((ny + 1) * (nz + 1)));
  const third = (t: number, w: [string, string, string]) => w[Math.min(2, Math.floor(t * 3))];
  const where = [third(j / ny, ['bottom', 'middle', 'top']), third(k / nz, ['front', 'middle', 'back']), third(i / nx, ['left', 'centre', 'right'])]
    .filter(w => w !== 'middle' && w !== 'centre').join(' ') || 'middle';
  return { thr, share: dark / all, min, p: g.at(i, j, k), where, unit: g.unit };
}

/** The dark-spot shell: the surface round every pocket of water below the dark level, and the darkest point's label. */
export function buildShells(S: TankSetup, T: Tank): THREE.Group {
  const grp = new THREE.Group(), g = sampleLight(S, T), st = darkStats(S, T);
  grp.userData.labels = [];
  if (!g || !st) return grp;
  const pos = trace(g.v, g.inside, g.n, g.at, st.thr);
  if (pos.length) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3b2bd0, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }));
    m.userData = { nolight: true }; m.renderOrder = 11; grp.add(m);
  }
  if (st.share > 0) grp.userData.labels = [{ p: st.p, text: `darkest ${Math.round(st.min).toLocaleString('en-US')}` }];
  return grp;
}

/** Show the dark-spot shell in a viewport's scene when the map shows real units and it is on; built again on a change. */
export function placeShells(sc: THREE.Scene, T: Tank, S: TankSetup) {
  let g = sc.getObjectByName('lightShells') as THREE.Group | undefined;
  const on = !!S.light.mapShells && S.render.beams && wattsOf({ ...S, tank: T }) > 0;
  if (!on) { if (g) g.visible = false; return; }
  const { mapSlice: _s, bright: _b, kelvin: _k, room: _r, mapStep: _p, mapStepLux: _x, ...l } = S.light; // what it does not depend on
  const key = JSON.stringify([T, l, S.lid, S.water, S.substrate, S.layout.id, S.layout.seed, S.terrain]);
  if (!g || g.userData.key !== key) {
    if (g) { g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } }); sc.remove(g); }
    g = buildShells(S, T); g.name = 'lightShells'; Object.assign(g.userData, { key, nolight: true }); sc.add(g);
  }
  g.visible = true;
}
