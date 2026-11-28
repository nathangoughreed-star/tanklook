// The 3D wall (TankSetup.backdrop): a relief panel inside the tank against the glass, like the foam rock, cork and moss
// backgrounds sold for tanks and terrariums, on every side the background is on (render.bgSides; Nathan 2026-10-15),
// running round the corners where two sides meet. One height field per style over the glass (along each run, up the height), pushed in from the glass by up to `depth` mm.
// BD1 (R199, Nathan 2026-11-27: "the 3d backgrounds are looking out of place with their low quality"): the grid only
// carries the form; colour and the surface normal are baked from the same field into textures at about 1 mm a texel, so
// edges, joints and cracks stay crisp, and the wall is lit by the scene's light (render/lighting.ts) through that normal
// instead of a light baked into the vertices. Looks from photos of real backgrounds: research/design/backdrop-3d-refs.md.
import * as THREE from 'three';
import { backdropDepth, RIM_H } from '../scene/physics';
import { backgroundRuns, footprint, shapeOf, type P } from '../scene/shape';
import type { BackdropKind, BackdropSettings, BgSide, Tank } from '../scene/types';
import { grit, solidParts } from './items';
import { bakeData, field, GRIT, sat, texelMM, texLayout, type BakeJob, type BakeOut, type TexLayout } from './backdropField';

export const BACKDROPS: Record<BackdropKind, string> = {
  none: 'None', rock: 'Rock wall', rockblock: 'Rock blocks', river: 'River stones', reef: 'Live rock wall', cork: 'Cork bark', corkplate: 'Cork plates', moss: 'Moss / plant mat', jungle: 'Jungle leaves',
};


const geoCache = new Map<string, THREE.BufferGeometry>();
const texCache = new Map<string, BackdropTex>();

/** The wall's textures: colour (sRGB) and the surface normal in the wall's frame (x along the run, y up, z out of the glass), runs stacked in rows. */
interface BackdropTex extends TexLayout { alb: THREE.DataTexture; nrm: THREE.DataTexture; nrmU: { value: THREE.Texture }; mat?: THREE.MeshBasicMaterial }


/** Texture from baked pixels. */
function dataTex(data: Uint8Array<ArrayBuffer>, W: number, H: number, srgb: boolean) {
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; t.userData.keep = true; return t;
}

/** The viewer's redraw (set by render/viewer.ts): the full textures land a moment after the wall first shows. */
export const backdropHooks: { landed: () => void } = { landed: () => {} };
// up to 3 workers share each full bake, a band of rows each
const pool: Worker[] = [];
let poolOk: boolean | undefined, jobN = 0;
const jobs = new Map<number, (d: BakeOut | null) => void>();
function bakePool() {
  if (poolOk !== undefined) return poolOk ? pool : null;
  poolOk = false;
  try {
    if (typeof Worker === 'undefined') return null;
    const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
    for (let k = 0; k < n; k++) {
      const w = new Worker(new URL('./backdropWorker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<{ id: number; out: BakeOut }>) => { const fn = jobs.get(e.data.id); jobs.delete(e.data.id); fn?.(e.data.out); };
      w.onerror = () => { for (const x of pool) x.terminate(); pool.length = 0; poolOk = false; const left = [...jobs.values()]; jobs.clear(); for (const fn of left) fn(null); };
      pool.push(w);
    }
    poolOk = true;
  } catch { for (const x of pool) x.terminate(); pool.length = 0; }
  return poolOk ? pool : null;
}

/**
 * The wall's textures. The full bake (~1 mm texels, a second or more on a big tank) runs in workers, a band of rows each;
 * until it lands the wall shows a quick bake at 5x the texel size (same layout, 1/25 the work), so an edit never stalls
 * the page. No workers (tests, an old browser): the full bake runs here.
 */
function bakeTex(kind: BackdropKind, seed: number, lens: number[], top: number, depth: number, gap: number): BackdropTex {
  const area = lens.reduce((a, l) => a + l * top, 0), mm = texelMM(area), job: BakeJob = { kind, seed, lens, top, depth, gap, mm };
  const lay = texLayout(lens, top, mm), ws = bakePool();
  const first = bakeData(ws ? { ...job, mm: mm * 5 } : job);
  const tex: BackdropTex = { ...lay, alb: dataTex(first.alb, first.W, first.H, true), nrm: dataTex(first.nrm, first.W, first.H, false), nrmU: { value: null as unknown as THREE.Texture } };
  tex.nrmU.value = tex.nrm;
  if (ws) {
    const { W, H } = lay, alb = new Uint8Array(W * H * 4), nrm = new Uint8Array(W * H * 4), band = Math.ceil(H / ws.length);
    let left = ws.length, failed = false;
    const done = (out: BakeOut | null) => {
      if (!out) failed = true; else { alb.set(out.alb, out.r0 * W * 4); nrm.set(out.nrm, out.r0 * W * 4); }
      if (--left) return;
      if (![...texCache.values()].includes(tex)) return; // dropped from the cache meanwhile
      if (failed) { const d = bakeData(job); alb.set(d.alb); nrm.set(d.nrm); }
      const old = [tex.alb, tex.nrm];
      tex.alb = dataTex(alb, W, H, true); tex.nrm = dataTex(nrm, W, H, false); tex.nrmU.value = tex.nrm;
      if (tex.mat) tex.mat.map = tex.alb;
      for (const t of old) t.dispose();
      backdropHooks.landed();
    };
    ws.forEach((w, k) => { const id = ++jobN; jobs.set(id, done); w.postMessage({ id, job: { ...job, r0: k * band, r1: (k + 1) * band } }); });
  }
  return tex;
}


/**
 * The lit shader's normal (vAqN) replaced by the texture's, turned from the wall's frame (aBdT along the run, up, aBdN out of
 * the glass) into the world, so the scene light reads every ledge and crack per pixel.
 */
const bdPost = (nrmU: { value: THREE.Texture }) => (sh: THREE.WebGLProgramParametersWithUniforms) => {
  sh.uniforms.uBdNrm = nrmU;
  sh.vertexShader = 'attribute vec3 aBdT;\nattribute vec3 aBdN;\nvarying vec3 vBdT;\nvarying vec3 vBdN;\n' + sh.vertexShader
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBdT = normalize(mat3(modelMatrix) * aBdT); vBdN = normalize(mat3(modelMatrix) * aBdN);');
  sh.fragmentShader = sh.fragmentShader
    .replace('varying vec3 vAqP; varying vec3 vAqN;', 'varying vec3 vAqP; varying vec3 vAqN;\nvarying vec3 vBdT;\nvarying vec3 vBdN;\nuniform sampler2D uBdNrm;\nvec3 aqBdN;\n#define vAqN aqBdN')
    .replace('void main() {', `void main() {
  { vec3 bdN = normalize(vBdN), bdT = normalize(vBdT - bdN * dot(vBdT, bdN)), bdB = cross(bdN, bdT); bdB *= sign(bdB.y + 1e-4);
    vec3 bdS = texture2D(uBdNrm, vMapUv).xyz * 2.0 - 1.0; aqBdN = normalize(bdT * bdS.x + bdB * bdS.y + bdN * bdS.z); }`);
};

function texMaterial(T: Tank, tex: BackdropTex) {
  if (tex.mat) return tex.mat;
  const { planes, pre } = solidParts(T);
  const m = new THREE.MeshBasicMaterial({ map: tex.alb, clippingPlanes: planes, side: THREE.DoubleSide });
  m.onBeforeCompile = pre;
  m.customProgramCacheKey = () => 'glass-clip-bd';
  Object.assign(m.userData, { keep: true, solid: true, pre, post: bdPost(tex.nrmU), ng: 'bd' });
  return (tex.mat = m);
}

/** The wall's geometry for one tank (cached by tank and settings: the scene rebuilds on every edit). */
export interface BackdropNotch { x0: number; x1: number; yMin: number }
export function backdropGeometry(T: Tank, b: BackdropSettings, rim = false, sides: readonly BgSide[] = ['back'], notches: readonly BackdropNotch[] = []): THREE.BufferGeometry | null {
  const depth = backdropDepth(b, T);
  if (!depth || !sides.length) return null;
  const base = `${shapeOf(T)}|${T.L}|${T.D}|${T.H}|${T.sides}|${T.sideLens}|${T.bowMin}|${T.pieDeg}|${T.frontBulge}|${b.kind}|${depth}|${b.seed}|${rim}|${[...sides].sort()}`;
  const key = `${base}|${notches.map(n => `${n.x0.toFixed(1)},${n.x1.toFixed(1)},${n.yMin.toFixed(1)}`).join(';')}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const f = field(b.kind, b.seed), col = new THREE.Color(), gap = 1.5;
  // stop just under the lid (Nathan 2026-10-15): rimmed, under the rim band (it hides the cut top from the front);
  // rimless, a few mm under the glass top resting on the panes
  const top = rim ? T.H - RIM_H : T.H - 4;
  const pos: number[] = [], uvs: number[] = [], tans: number[] = [], nins: number[] = [], idx: number[] = [], inward: number[] = [];
  // inward = toward the middle of the footprint (every tank shape is convex)
  const E = footprint(T).edges, mid: P = [E.reduce((a, e) => a + e.a[0], 0) / E.length, E.reduce((a, e) => a + e.a[1], 0) / E.length];
  const runList = backgroundRuns(T, sides, 145, 0).map(run => {
    const acc = [0];
    for (let i = 1; i < run.length; i++) acc.push(acc[i - 1] + Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]));
    return { run, acc, len: acc[acc.length - 1] };
  }).filter(r => r.len >= 10);
  if (!runList.length) return null;
  let tex = texCache.get(base);
  if (!tex) {
    tex = bakeTex(b.kind, b.seed, runList.map(r => r.len), top, depth, gap); texCache.set(base, tex);
    // a texture set drops out only once no cached geometry still uses it
    if (texCache.size > 3) for (const [k0, t0] of texCache) { if (k0 !== base && ![...geoCache.values()].some(g0 => g0.userData.bdTex === t0)) { texCache.delete(k0); t0.alb.dispose(); t0.nrm.dispose(); t0.mat?.dispose(); break; } }
  }
  const tx = tex;
  runList.forEach(({ run, acc, len }, ri) => {
    const rm = tx.runs[ri], mm = tx.mm;
    const step = Math.min(8, Math.max(4, Math.max(len, top) / 260)), ny = Math.ceil(top / step) + 1;
    const segN = (k: number): P => { // inward normal of segment k-1 -> k
      const a = run[k - 1], c = run[k], tl = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      const n: P = [-(c[1] - a[1]) / tl, (c[0] - a[0]) / tl];
      return n[0] * (mid[0] - a[0]) + n[1] * (mid[1] - a[1]) < 0 ? [-n[0], -n[1]] : n;
    };
    // corners where two sides meet get a column of their own, pushed out along the mitre so both faces meet there
    const corner = new Map<number, P>();
    const mitre = (n0: P, n1: P): P => { const m: P = [n0[0] + n1[0], n0[1] + n1[1]], ml = Math.hypot(m[0], m[1]) || 1, half = Math.max(0.3, (m[0] * n0[0] + m[1] * n0[1]) / ml); return [m[0] / ml / half, m[1] / ml / half]; };
    for (let k = 1; k < run.length - 1; k++) {
      const n0 = segN(k), n1 = segN(k + 1);
      if (n0[0] * n1[0] + n0[1] * n1[1] < 0.94) corner.set(acc[k], mitre(n0, n1));
    }
    // all the way round (every side chosen): the seam is a corner too, and has no ends to close
    const closed = Math.hypot(run[0][0] - run[run.length - 1][0], run[0][1] - run[run.length - 1][1]) < 1e-6;
    if (closed) { const m = mitre(segN(run.length - 1), segN(1)); corner.set(0, m); corner.set(len, m); }
    // open ends stop `gap` short of the side glass: an end cap in the pane's own plane z-fights the glass and the
    // substrate there (moiré down the side pane, Nathan 2026-10-15)
    const e = closed ? 0 : gap;
    const ss = Array.from({ length: Math.ceil((len - 2 * e) / step) + 1 }, (_, i) => Math.min(len - e, e + i * step));
    for (const s0 of corner.keys()) ss.push(s0);
    ss.sort((a, b) => a - b);
    const uq = [...new Set(ss)], us = uq.filter((s0, i) => i === 0 || i === uq.length - 1 || s0 - uq[i - 1] > step * 0.3 || corner.has(s0));
    for (let i = us.length - 2; i > 0; i--) if (!corner.has(us[i]) && (corner.has(us[i + 1]) || corner.has(us[i - 1])) && Math.min(us[i + 1] - us[i], us[i] - us[i - 1]) < step * 0.3) us.splice(i, 1);
    const nu = us.length;
    const pointAt = (s: number): [P, P, P] => { // point on the glass, the inward normal (mitred at a corner) and the run's direction
      let k = 1; while (k < acc.length - 1 && acc[k] < s) k++;
      const a = run[k - 1], c = run[k], t = (s - acc[k - 1]) / Math.max(1e-9, acc[k] - acc[k - 1]), tl = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      return [[a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t], corner.get(s) ?? segN(k), [(c[0] - a[0]) / tl, (c[1] - a[1]) / tl]];
    };
    const v0 = pos.length / 3;
    const vert = (p: P, n: P, d: P, out: number, y: number, s: number) => {
      pos.push(p[0] + n[0] * out, y, -(p[1] + n[1] * out)); inward.push(n[0], -n[1]);
      const nl = Math.hypot(n[0], n[1]) || 1;
      tans.push(d[0], 0, -d[1]); nins.push(n[0] / nl, 0, -n[1] / nl);
      uvs.push((Math.min(len, Math.max(0, s)) / mm + 0.5) / tx.W, (rm.row0 + Math.min(top, Math.max(0, y)) / mm + 0.5) / tx.H);
    };
    for (let i = 0; i < nu; i++) {
      const s = us[i], [p, n, d] = pointAt(s);
      for (let j = 0; j < ny; j++) {
        const y = Math.min(top, j * step), h = sat(f(s, y, col));
        // a notch for gear over the glass (lane HC1): on the back wall the relief is cut down to the glass between x0 and x1, from yMin up
        const cut = Math.abs(n[1]) > 0.9 && notches.some(q => p[0] >= q.x0 && p[0] <= q.x1 && y >= q.yMin);
        vert(p, n, d, cut ? gap : gap + h * (depth - gap), y, s);
      }
    }
    for (let i = 0; i < nu - 1; i++) for (let j = 0; j < ny - 1; j++) {
      const a = v0 + i * ny + j, b2 = a + ny;
      idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
    }
    // caps: the cut top, and each end where it meets the side glass, closed back to the glass (textured with the edge they close)
    const capRow = (list: number[], close: (k: number) => [P, P, P, number, number]) => {
      const b0 = pos.length / 3;
      list.forEach((_v, k) => { const [p, n, d, y, s] = close(k); vert(p, n, d, 0.5, y, s); });
      for (let k = 0; k < list.length - 1; k++) idx.push(list[k], list[k + 1], b0 + k, list[k + 1], b0 + k + 1, b0 + k);
    };
    const tops = Array.from({ length: nu }, (_, i) => v0 + i * ny + ny - 1);
    capRow(tops, k => { const [p, n, d] = pointAt(us[k]); return [p, n, d, top, us[k]]; });
    for (const i of closed ? [] : [0, nu - 1]) {
      const colV = Array.from({ length: ny }, (_, j) => v0 + i * ny + j), [p, n, d] = pointAt(us[i]);
      capRow(colV, k => [p, n, d, Math.min(top, k * step), us[i]]);
    }
  });
  if (!idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('aBdT', new THREE.Float32BufferAttribute(tans, 3));
  g.setAttribute('aBdN', new THREE.Float32BufferAttribute(nins, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // wind the faces toward the room inside the tank (back faces are drawn darker, as a cut-open inside)
  const nrm = g.attributes.normal;
  let dot = 0;
  for (let i = 0; i < nrm.count; i += 7) dot += nrm.getX(i) * inward[i * 2] + nrm.getZ(i) * inward[i * 2 + 1];
  if (dot < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  grit(g, GRIT[b.kind], b.seed);
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.keep = true; g.userData.bdTex = tex;
  geoCache.set(key, g);
  if (geoCache.size > 6) { const [k0, g0] = geoCache.entries().next().value!; geoCache.delete(k0); g0.dispose(); }
  return g;
}

/** Add the wall to a tank's scene on `sides` (nothing when off, no sides, or in a bowl). */
export function addBackdrop(sc: THREE.Scene, b: BackdropSettings | undefined, T: Tank, rim = false, sides: readonly BgSide[] = ['back'], notches: readonly BackdropNotch[] = []) {
  if (!b) return;
  const g = backdropGeometry(T, b, rim, sides, notches);
  if (!g) return;
  const m = new THREE.Mesh(g, texMaterial(T, g.userData.bdTex as BackdropTex));
  m.userData.backdrop = true;
  sc.add(m);
  return m;
}
