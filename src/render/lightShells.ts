// Light map shells (Nathan 2026-10-15: see the light at every point in the tank, "a static 3d representation using
// surfaces"): see-through surfaces round the lamps, one per contour level (the map's spacing, at most five shown), each
// in the map's colour for its level. Inside a shell the light is above that level. The light model (scene/lightout.ts
// bandsAt, on a surface facing up, as the substrate map and the layer read it) is sampled on a grid through the tank,
// and each level traced by marching tetrahedra. A shell is left open where it meets the glass or the ground (a closed
// one would line the whole tank wherever the light is above its level). Built again only when the light, tank or ground changes; placed in each viewport's scene.
import * as THREE from 'three';
import { bandsAt, lightEnvCached, luxOf, parOf, wattsOf } from '../scene/lightout';
import { bowlRadius, insideBy } from '../scene/shape';
import { groundHeight } from '../scene/terrain';
import type { Tank, TankSetup } from '../scene/types';
import { MAP_DIV, mapStepOf } from './lighting';

const RAMP = [[0.05, 0.05, 0.25], [0.1, 0.25, 0.85], [0.0, 0.7, 0.9], [0.15, 0.8, 0.25], [0.95, 0.9, 0.1], [1.0, 0.55, 0.05], [0.9, 0.1, 0.1], [1.0, 0.9, 0.9]];
/** The map's colour ramp (lighting.ts aqRamp): t = log2(level / MAP_DIV), 0..7. */
function ramp(t: number) {
  t = Math.min(Math.max(t, 0), 7); const k = Math.min(Math.floor(t), 6), f = t - k;
  return new THREE.Color(...RAMP[k].map((v, i) => v + (RAMP[k + 1][i] - v) * f) as [number, number, number]);
}

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

/** The shells for a setup: one mesh per level (at most five), or an empty group when the light has no real units. */
export function buildShells(S: TankSetup, T: Tank): THREE.Group {
  const grp = new THREE.Group(), env = lightEnvCached({ ...S, tank: T });
  if (!env) return grp;
  const unit = S.light.mapUnit ?? 'par', div = MAP_DIV[unit], step = mapStepOf(S.light, unit);
  const nx = 40, ny = Math.max(8, Math.round(nx * T.H / T.L)), nz = Math.max(8, Math.round(nx * T.D / T.L));
  const at = (i: number, j: number, k: number) => new THREE.Vector3(T.L * i / nx, T.H * j / ny, -T.D * k / nz);
  const v = new Float32Array((nx + 1) * (ny + 1) * (nz + 1)), inside = new Uint8Array(v.length);
  let hi = 0, n = 0;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) for (let k = 0; k <= nz; k++, n++) {
    const x = T.L * i / nx, y = T.H * j / ny, d = T.D * k / nz;
    // the model reads anywhere; outside the glass or below the ground is only marked, so no surface is drawn there
    inside[n] = insideBy(T, x, d) > 0 && Math.hypot(x - T.L / 2, d - T.D / 2) <= bowlRadius(T, y) && y >= groundHeight(S, T, x, d) ? 1 : 0;
    const b = bandsAt(env, [x, y, -d]);
    v[n] = unit === 'lux' ? luxOf(b) : parOf(b); if (inside[n]) hi = Math.max(hi, v[n]);
  }
  // the levels: the map's contour spacing (or doublings), thinned to at most five
  const all: number[] = [];
  if (step) for (let q = step; q < hi; q += step) all.push(q);
  else for (let q = div; q < hi; q *= 2) all.push(q);
  const every = Math.ceil(all.length / 5), levels = all.filter((_, i) => (all.length - 1 - i) % every === 0);
  const labels: { p: THREE.Vector3; level: number }[] = [];
  grp.userData.labels = labels;
  for (const level of levels) {
    const pos = trace(v, inside, [nx, ny, nz], at, level);
    if (!pos.length) continue;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: ramp(Math.log2(level / div)), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    m.userData = { nolight: true, level }; m.renderOrder = 11; grp.add(m);
    // its value at its lowest point (where it reaches furthest down under a lamp), for the contour labels (ui/lightContours)
    let lo = 1; for (let q = 4; q < pos.length; q += 3) if (pos[q] < pos[lo]) lo = q;
    labels.push({ p: new THREE.Vector3(pos[lo - 1], pos[lo], pos[lo + 1]), level });
  }
  return grp;
}

/** Show the shells in a viewport's scene when the map shows real units and shells are on; built again on a change. */
export function placeShells(sc: THREE.Scene, T: Tank, S: TankSetup) {
  let g = sc.getObjectByName('lightShells') as THREE.Group | undefined;
  const on = !!S.light.mapShells && S.render.beams && wattsOf({ ...S, tank: T }) > 0;
  if (!on) { if (g) g.visible = false; return; }
  const { mapSlice: _s, bright: _b, kelvin: _k, room: _r, ...l } = S.light; // what the shells do not depend on
  const key = JSON.stringify([T, l, S.lid, S.water, S.substrate, S.layout.id, S.layout.seed, S.terrain]);
  if (!g || g.userData.key !== key) {
    if (g) { g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } }); sc.remove(g); }
    g = buildShells(S, T); g.name = 'lightShells'; Object.assign(g.userData, { key, nolight: true }); sc.add(g);
  }
  g.visible = true;
}
