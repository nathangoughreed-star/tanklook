// 3D grains (lane T1, 2026-10-16; Nathan: coarse grounds read flat, a painted tile). Coarse grounds get real stones or
// bark chips through the shared scatter tool: one packed layer sunk into the top surface (the painted tile underneath,
// darkened, reads as the shadowed gaps between them) and a row pressed against each pane, so the cross-section seen
// through the glass is stones in profile. Fine grounds (sand, mud, soil, clay) stay a painted surface.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../art/paint';
import { blendOrder, grainShape } from '../scene/blend';
import { GRAIN_LOOK, SUBSTRATES, blendWeights, blendZone, grain3D, shadesOf } from '../art/placeholder';
import { waterY } from '../scene/physics';
import { footprint } from '../scene/shape';
import type { BlendGrain, Tank, TankSetup } from '../scene/types';
import { FX } from './fx';
import { insideIn, scatter, type GroundAt, type ScatterKind } from './scatter';

/** How a ground's grains look in 3D: chips (bark) or stones, diameter range (mm), roundness 0-1, colours, flecked,
 *  darker when wet (terrestrial grounds only); `at`: the share of the floor it covers at a point (a blend's patches;
 *  absent = everywhere). */
export interface GrainLook {
  shape: 'stone' | 'chip'; size: [number, number]; round: number; colors: string[]; speckle: boolean; wet: boolean; at?: (x: number, d: number) => number;
  /** Grain editor (Nathan 2026-11-28; scene/blend.ts grainShape): 0-1 each; absent = from `round` (the presets). */
  sphere?: number; angular?: number; rough?: number; opacity?: number;
}
/** The ground's 3D grains, one look per layer, none for a ground drawn as a surface only. Presets: bark and the gravel
 *  kinds; custom: its gravel and pebbles, a blend's on the patches the ground shader paints them on (sand and mud stay
 *  painted). Sizes from the tile art (radius px x mm per px). */
export function grainLooks(sub: TankSetup['substrate']): GrainLook[] {
  if (sub.type === 'bark') return [{ shape: 'chip', size: [10, 22], round: 0.3, colors: SUBSTRATES.bark.shades, speckle: false, wet: true }];
  if (sub.type === 'custom') {
    const b = sub.custom, look = (bg: BlendGrain, at?: GrainLook['at']): GrainLook => {
      const G = GRAIN_LOOK[bg.grain], sh = grainShape(bg);
      return { shape: 'stone', size: sh.size ?? [G.size[0] * 2, G.size[1] * 2], round: G.round, colors: colorRange(bg.color, sh.color2), speckle: sh.opacity > 0.9, wet: false, at,
        sphere: sh.sphere, angular: sh.angular, rough: sh.rough, opacity: sh.opacity };
    };
    if (b.grains.length === 1) return grain3D(b.grains[0].grain) ? [look(b.grains[0])] : [];
    // one ratio per grain (art/placeholder `blendWeights`), the same the ground shader paints; each 3D grain's stones keep where it is
    const z = blendZone(b), out: GrainLook[] = [], ord = blendOrder(b);
    ord.forEach((g, k) => { if (grain3D(g.grain)) out.push(look(g, (x, d) => cover(blendWeights(b, x, d, z)[k]))); });
    return out;
  }
  const t = SUBSTRATES[sub.type];
  if (t.kind !== 'pebble') return [];
  const mmPx = t.tile * 2 / 512; // tile px -> mm
  return [{ shape: 'stone', size: [t.size[0] * 2 * mmPx, t.size[1] * 2 * mmPx], round: t.round ?? 0.8, colors: t.shades, speckle: !!t.speckle, wet: !!t.terra }];
}
/** Ten colours across a grain's range: `color` to `color2`, each a touch lighter or darker; no `color2` = shades of `color`. */
function colorRange(color: string, color2: string | null): string[] {
  if (!color2) return shadesOf(color, 10, rng(5));
  const r = rng(5), a = new THREE.Color(color), b = new THREE.Color(color2);
  return Array.from({ length: 10 }, (_, i) => '#' + a.clone().lerp(b, (i + r() * 0.8) / 9.8).offsetHSL(0, 0, (r() - 0.5) * 0.06).getHexString());
}
/** A grain look's shape, filled in from `round` where the editor left it (presets: rounder = smoother and less angular). */
const shapeOf = (g: GrainLook) => ({ sphere: g.sphere ?? 0.6, angular: g.angular ?? Math.max(0, 0.9 - g.round) * 0.8, rough: g.rough ?? 0.55, opacity: g.opacity ?? 1 });
/** Stones to keep so that a share `r` of the floor is covered (the layer is 1.25 stone-covers thick, so chance covers
 *  1 - exp(-K p): keeping r of them would show well over r of the floor as stone). */
const COVER_K = 1.6;
const cover = (r: number) => Math.min(1, -Math.log(1 - Math.min(r, 0.999)) / COVER_K);
/** GB2: how mixed a multi-grain blend is, 0-1 (0 for anything else): the size sorting and knots of the ground effects fade out with it. */
/** Shuffle: a blend's seed moves its stones' random draws too (0 = the original draws). */
const blendSeed = (S: TankSetup) => (S.substrate.type === 'custom' ? (S.substrate.custom.seed ?? 0) * 101 : 0);
export const blendMixed = (S: TankSetup) => (S.substrate.type === 'custom' && S.substrate.custom.grains.length > 1 ? S.substrate.custom.mix : 0);
/** The ground's coarsest 3D grain, or null for a ground drawn as a surface only. */
export function grainLook(sub: TankSetup['substrate']): GrainLook | null {
  const gs = grainLooks(sub); return gs.length ? gs.reduce((a, g) => (g.size[1] > a.size[1] ? g : a)) : null;
}
/** Whether a blend has painted-only patches (sand or mud) beside its 3D stones. */
export const grainPatchy = (sub: TankSetup['substrate']) => sub.type === 'custom' && sub.custom.grains.length > 1 && !sub.custom.grains.every(g => grain3D(g.grain));
/** About how far the grains rise above the painted ground (mm): leaf litter lies on them. */
export const grainTop = (g: GrainLook | null) => (g ? (g.size[0] + g.size[1]) / 2 * (g.shape === 'chip' ? 0.15 : 0.22) : 0);

const grainGeo = new Map<string, THREE.BufferGeometry[]>();
/**
 * Ten stone shapes (grain editor, Nathan 2026-11-28: the six lumpy balls read cartoony). A subdivided icosahedron, then:
 * proportions from `sphere` (1 = a ball, every axis equal; lower = flatter and longer, each shape its own ratio); three broad
 * lumps and a ripple, fewer the rounder; `angular` cuts it with 7-11 random planes (a broken stone's flat faces and edges)
 * and turns its normals flat-faced; colour mottled per vertex (flecks for natural stone). Box-projected UVs for the surface
 * grain texture (no seam, no pinched pole). Long axis = x, diameter 1. Non-indexed (each face its own corners).
 */
export function stoneGeos(round: number, speckle: boolean, detail: number, sphere = 0.6, angular = Math.max(0, 0.9 - round) * 0.8) {
  const q = (v: number) => Math.round(v * 10) / 10, sp = q(sphere), an = q(angular);
  const key = `s${round}${speckle}${detail}|${sp}|${an}`; let gs = grainGeo.get(key); if (gs) return gs;
  const r = rng(91), irr = 1 - sp; // irregularity: none for a ball (glass marbles are all alike)
  const dt = an > 0.25 ? Math.max(detail, 1) : detail; // facets need corners to cut
  gs = Array.from({ length: 10 }, () => {
    const g0 = new THREE.IcosahedronGeometry(0.5, dt); g0.deleteAttribute('normal'); g0.deleteAttribute('uv');
    const g = mergeVertices(g0), p = g.attributes.position, lump = irr * (0.5 * (1 - round) + 0.22) + 0.015 * (1 - an);
    const bumps = Array.from({ length: 3 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()), ph = r() * 9;
    const sy = 1 - irr * (0.3 + r() * 0.4), sz = 1 - irr * (0.1 + r() * 0.35); // flat (y) and narrow (z) against its length
    const planes = Array.from({ length: 6 + Math.floor(r() * 4) }, () => ({ n: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), d: 0.2 + r() * 0.17 })); // deep cuts: big flat faces
    const v = new THREE.Vector3(), col: number[] = [];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      let k = 1; for (const bp of bumps) k += lump * 0.5 * Math.max(0, v.dot(bp)) ** 2 - lump * 0.12;
      k += lump * 0.15 * Math.sin(v.x * 7 + ph) * Math.sin(v.y * 6 + ph * 2) * Math.sin(v.z * 8);
      let rad = 0.5 * k;
      if (an > 0) { let cut = rad; for (const pl of planes) { const c = v.dot(pl.n); if (c > 0.05) cut = Math.min(cut, pl.d / c); } rad += (Math.max(cut, rad * 0.4) - rad) * an; }
      p.setXYZ(i, v.x * rad, v.y * rad * sy, v.z * rad * sz);
      const m = 0.9 + r() * 0.14 + (speckle && r() < 0.12 ? (r() < 0.5 ? -0.3 : 0.25) : 0); col.push(m, m, m);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const smooth = g.toNonIndexed(), flat = smooth.clone(); flat.computeVertexNormals();
    const ns = smooth.attributes.normal, nf = flat.attributes.normal, pp = smooth.attributes.position, uv = new Float32Array(pp.count * 2), w = Math.min(1, Math.max(0, (an - 0.25) / 0.45)); // facets shade flat only once really angular (a 20-face grain shaded flat reads as a die)
    const a = new THREE.Vector3(), b = new THREE.Vector3(), ofs = [r(), r(), r(), r()];
    for (let i = 0; i < pp.count; i++) {
      a.fromBufferAttribute(ns, i); b.fromBufferAttribute(nf, i); a.lerp(b, w).normalize(); ns.setXYZ(i, a.x, a.y, a.z);
      // box projection by the face's own normal (its three corners share it)
      const f = i - (i % 3); b.fromBufferAttribute(nf, f);
      const ax = Math.abs(b.x), ay = Math.abs(b.y), az = Math.abs(b.z), x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i);
      const [u0, v0] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y];
      uv[i * 2] = u0 * 1.6 + ofs[0]; uv[i * 2 + 1] = v0 * 1.6 + ofs[1];
    }
    smooth.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    smooth.translate(0, sy * 0.25, 0); // its middle a quarter of its height up: lift 0 sinks it about halfway
    smooth.userData.keep = true; return smooth;
  });
  grainGeo.set(key, gs); return gs;
}
const grainTexs = new Map<string, THREE.CanvasTexture>();
/**
 * A stone's surface (grain editor): a tileable grey near 1 that the stone's colours multiply. Always a soft mottle and a
 * few mineral flecks; `rough` adds fine light and dark speckle and small pits (a granular, unpolished face). Glass
 * (`clear`): a plain face with faint swirls only. Quantized to fifths, so at most 12 textures.
 */
function grainTex(rough: number, clear: boolean) {
  const rq = Math.round(rough * 5) / 5, key = `${rq}${clear}`; let t = grainTexs.get(key); if (t) return t;
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!, r = rng(131 + rq * 10);
  x.fillStyle = clear ? '#f4f4f4' : '#e6e6e6'; x.fillRect(0, 0, N, N);
  const dot = (px: number, py: number, rad: number, fill: string) => { x.fillStyle = fill; for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { x.beginPath(); x.arc(px + ox, py + oy, rad, 0, Math.PI * 2); x.fill(); } };
  // soft mottle: big faint blotches
  for (let i = 0; i < (clear ? 6 : 26); i++) dot(r() * N, r() * N, 8 + r() * 22, r() < 0.5 ? `rgba(0,0,0,${0.03 + r() * 0.04})` : `rgba(255,255,255,${0.03 + r() * 0.05})`);
  if (!clear) {
    for (let i = 0; i < 10; i++) dot(r() * N, r() * N, 1 + r() * 2.2, r() < 0.5 ? `rgba(20,16,12,${0.25 + r() * 0.3})` : `rgba(255,252,245,${0.3 + r() * 0.3})`); // mineral flecks
    const n = Math.round(rq * 1600);
    for (let i = 0; i < n; i++) dot(r() * N, r() * N, 0.5 + r() * 0.7, r() < 0.55 ? `rgba(0,0,0,${0.12 + 0.3 * r() * rq})` : `rgba(255,255,255,${0.1 + 0.25 * r() * rq})`); // grit
    for (let i = 0; i < Math.round(rq * 70); i++) dot(r() * N, r() * N, 0.8 + r() * 1.3, `rgba(0,0,0,${0.3 + 0.3 * r()})`); // pits
  }
  t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.keep = true;
  grainTexs.set(key, t); return t;
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
const glassMat = (m: THREE.MeshBasicMaterial) => { let g = glassMats.get(m); if (!g) { g = m.clone(); g.userData.keep = true; g.userData.pane = true; delete g.userData.aq; /* clone() copies userData but not onBeforeCompile: a copied aq flag leaves it unlit */ glassMats.set(m, g); } return g; };
export function grainKinds(g: GrainLook): ScatterKind[] {
  if (g.shape === 'chip') {
    let mat = grainMat.get('chip');
    if (!mat) { mat = new THREE.MeshBasicMaterial({ vertexColors: true, map: barkFibre() }); mat.userData.keep = true; grainMat.set('chip', mat); }
    return chipGeos().map(geo => ({ geo, mat: mat!, weight: 1, size: g.size, reach: 0.5 }));
  }
  // small grains (gravel, under 8 mm): 20 triangles each, not 80 (18k stones in a 20-gal made it 2-3 ms)
  const sh = shapeOf(g), geos = stoneGeos(g.round, g.speckle, (g.size[0] + g.size[1]) / 2 < 8 ? 0 : 1, sh.sphere, sh.angular), mat = stoneMat(sh.rough, sh.opacity);
  return geos.map(geo => ({ geo, mat, weight: 1, size: g.size, reach: 0.5 }));
}
/**
 * A stone material (grain editor): the surface texture for its roughness; a highlight that sharpens and brightens the
 * smoother the stone (polished and glass stones shine, rough ones none). Below full opacity the stone is shaded as glass,
 * in step with how clear it is: deeper colour, bright through its middle (light passing through) and dark toward the edge
 * where it reflects, with a thin bright rim. Opaque and lit: a dithered see-through (alphaHash) read as frosted speckle.
 * Added to the lit shader (render/lighting.ts aqPatch) through its `post` hook.
 */
function stoneMat(rough: number, opacity: number) {
  const rq = Math.round(rough * 10) / 10, oq = Math.round(opacity * 20) / 20, clear = oq < 0.95, key = `stone${rq}|${oq}`;
  let m = grainMat.get(key); if (m) return m;
  m = new THREE.MeshBasicMaterial({ vertexColors: true, map: grainTex(rq, clear) });
  const gloss = (1 - rq) ** 2 * (clear ? 1.1 : 0.45), shin = (8 + (1 - rq) * 70).toFixed(1), gc = clear ? Math.min(1, (1 - oq) / 0.7) : 0;
  m.userData.keep = true; m.userData.ng = key;
  if (gloss > 0.01 || clear) m.userData.post = (sh: THREE.WebGLProgramParametersWithUniforms) => {
    sh.fragmentShader = sh.fragmentShader.replace(/#include <opaque_fragment>(?![\s\S]*#include <opaque_fragment>)/,
      `{ vec3 gV = normalize(cameraPosition - vAqP), gN = normalize(vAqN), gH = normalize(normalize(vec3(-0.2, 1.0, 0.35)) + gV);
  float gL = min(dot(aqLt, vec3(0.333)), 1.5), gFace = abs(dot(gN, gV)), gF = pow(1.0 - gFace, 3.0);
  vec3 gY = vec3(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)));
  outgoingLight = mix(outgoingLight, max(mix(gY, outgoingLight, 1.4), 0.0) * (0.35 + 0.95 * pow(gFace, 1.6)), ${gc.toFixed(3)});
  outgoingLight += vec3(${gloss.toFixed(3)} * pow(max(dot(gN, gH), 0.0), ${shin}) + ${(0.3 * gc).toFixed(3)} * gF) * gL; }
#include <opaque_fragment>`);
  };
  grainMat.set(key, m); return m;
}
/** Grains in the top layer: enough to cover the floor about once, sunk in (stones about halfway, chips a little), packed
 *  (a pile grid of a third of a grain), each coloured from the ground's shades; darker under water if terrestrial. */
export const grainMeshes = (S: TankSetup, T: Tank, ground: GroundAt) => cachedGrains('top', S, T, () => grainLooks(S.substrate).flatMap((g, i) => topGrains(S, T, ground, g, i)));
function topGrains(S: TankSetup, T: Tank, ground: GroundAt, g: GrainLook, layer: number, area = footprint(T).area): THREE.InstancedMesh[] {
  const mean = (g.size[0] + g.size[1]) / 2, foot = Math.PI * (mean / 2) ** 2 * (g.shape === 'chip' ? 0.55 : 0.8);
  const wy = g.wet && S.water.on ? waterY(T, S.water.level) : -Infinity, chip = g.shape === 'chip', count = Math.min(30000, Math.round(1.6 * area / foot)); // 1.6 covers (was 1.25): fewer painted gaps showing
  // a blend's layer: points over the floor kept by its share there (a few spare for the ones scatter turns down)
  let at: [number, number][] | undefined;
  if (g.at) {
    // VF3 (fx ground): thinned by a clumping field, so the stones gather in dense knots with sparse fringes (not an even
    // pepper), more near hardscape and on slopes; the same number of tries, so about as many stones in all
    // GB2: the knots fade out as the blend's Mixed rises (none at 100 %). GB3: the points are plain random draws, only kept
    // to the same number in every 4-point cell of the floor (no big clumps or gaps, no lattice or rows: Nathan 11-18 found
    // the even grid uncanny), each kept by the grain's share at random
    const loose = 1 - blendMixed(S), cl = FX.ground && loose > 0.01 ? clumpField(S, ground) : null, K = cl ? 1 + 0.7 * loose : 1;
    const r = rng(23 + layer + blendSeed(S)), n = Math.round(count * 1.15 * K * T.L * T.D / area), per = 4, cs = Math.sqrt(per * T.L * T.D / Math.max(1, n)), nx = Math.max(1, Math.ceil(T.L / cs)), nz = Math.max(1, Math.ceil(T.D / cs));
    at = [];
    for (let j = 0; j < nz && at.length < count * 1.2; j++) for (let i = 0; i < nx && at.length < count * 1.2; i++) for (let q = 0; q < per; q++) {
      const x = (i + r()) * T.L / nx, d = (j + r()) * T.D / nz, f = cl ? 1 + loose * (cl(x, d) - 1) : 1;
      if (r() < g.at(x, d) * f / K) at.push([x, d]);
    }
  }
  const out = scatter(T, ground, {
    seed: 11 + layer + blendSeed(S), count, at, kinds: grainKinds(g), lift: [0, 0], pile: 0, tilt: chip ? 0.35 : 0.5,
    slope: 0.35, clump: 0, liftK: chip ? [-0.05, 0.05] : [-0.18, 0], pileK: chip ? 0.12 : 0.18, cell: Math.max(1, mean / 3),
    // stones a shade under their tile colours: lit from above, their tops came out near white
    palette: g.colors.map(c => new THREE.Color(c).multiplyScalar(chip ? 1 : 0.8)), shade: y => (y < wy ? 0.55 : 1),
    ...(FX.mix && !chip ? { sortAt: sortField(S, ground, layer, 1 - blendMixed(S)), vary: true } : FX.mix ? { vary: true } : {}), // VF-C2
  });
  // drawn before the ground (renderOrder): the depth test then skips the ground's shading under them (fill was the cost)
  for (const m of out) { m.userData.grains = true; m.renderOrder = -1; }
  return out;
}
/** Grains pressed against the inside of each pane, from the tank floor up to the ground: the cross-section seen through
 *  the glass (stones long side along it, chips on edge at a slant). Not in a bowl (its glass curves away from the floor). */
export const glassGrains = (S: TankSetup, T: Tank, groundY: (x: number, d: number) => number) => cachedGrains('glass', S, T, () => grainLooks(S.substrate).flatMap((g, i) => paneGrains(S, T, groundY, g, i)));
function paneGrains(S: TankSetup, T: Tank, groundY: (x: number, d: number) => number, g: GrainLook, layer: number): THREE.InstancedMesh[] {
  const kinds = grainKinds(g), r = rng(17 + layer + blendSeed(S)), mean = (g.size[0] + g.size[1]) / 2, chip = g.shape === 'chip';
  const per: THREE.Matrix4[][] = kinds.map(() => []), tint: THREE.Color[][] = kinds.map(() => []);
  const pal = g.colors.map(c => new THREE.Color(c)), wy = g.wet && S.water.on ? waterY(T, S.water.level) : -Infinity;
  const q = new THREE.Quaternion(), qa = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3();
  const inBy = insideIn(T);
  for (const e of footprint(T).edges) {
    const yaw = Math.atan2(-(e.b[1] - e.a[1]), e.b[0] - e.a[0]); // world angle of the pane (z = -depth)
    const avg = (groundY(e.a[0], e.a[1]) + groundY(e.b[0], e.b[1]) + groundY((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2)) / 3;
    const n = Math.min(20000, Math.round((FX.ground ? 1.5 : 1.3) * e.len * avg / (mean * mean * (chip ? 0.35 : 0.6))));
    for (let i = 0; i < n; i++) {
      const t = r(), size = g.size[0] + r() * (g.size[1] - g.size[0]), ki = Math.floor(r() * kinds.length), c = pal[Math.floor(r() * pal.length)];
      const yy = r(), a = (r() - 0.5) * 0.6, tl = r() - 0.5, k = 0.85 + r() * 0.3;
      const px = e.a[0] + (e.b[0] - e.a[0]) * t, pd = e.a[1] + (e.b[1] - e.a[1]) * t, top = groundY(px, pd);
      // up to the surface, meeting the top layer (the painted surface stops short of the glass: render/build.ts `clipIn`)
      const under = size * (chip ? 0.25 : 0.35);
      if (top < under + size * 0.15) continue;
      const inset = size * (chip ? 0.2 : 0.36) + 0.4, x = px - e.n[0] * inset, d = pd - e.n[1] * inset;
      if (inBy(x, d) < inset - 0.5) continue; // a corner: the other pane is too near
      if (g.at && r() >= g.at(px, pd)) continue; // a blend: only on this grain's patches
      // VF3 (fx ground): packed tighter toward the floor and darker there, as gravel pressed against glass looks
      const y = Math.min(top - under, size * 0.15 + (FX.ground ? yy ** 1.6 : yy) * top);
      qa.setFromAxisAngle(up, yaw + a); ax.set(1, 0, 0).applyQuaternion(qa);
      q.setFromAxisAngle(ax, chip ? Math.PI / 2 * (0.6 + 0.8 * Math.abs(tl)) * Math.sign(tl || 1) : tl * 0.6).multiply(qa);
      per[ki].push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, -d), q, new THREE.Vector3(size, size, size)));
      tint[ki].push(c.clone().multiplyScalar(k * 1.3 * (y < wy ? 0.55 : 1) * (FX.ground ? 0.7 + 0.3 * Math.min(1, y / (top || 1)) : 1)));
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
  const key = tag + (FX.mix ? 'm' : '') + (FX.ground ? 'g' : '') + JSON.stringify([{ ...S.substrate, litter: null }, S.terrain, S.layout.id, S.layout.seed, S.backdrop, S.render?.bgSides, T, S.water.on, S.water.level]);
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

// ---------- VF3: substrate variation (lane VF-C, 2026-11-11; fx `ground`) ----------

/** Seeded smooth value noise, 0..1, at unit cell size. */
function valueNoise(seed: number) {
  const sd = seed * 12.9898, hs = (a: number, b: number) => { const t = Math.sin(a * 127.1 + b * 311.7 + sd) * 43758.5453; return t - Math.floor(t); };
  return (x: number, z: number) => {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
    return (hs(ix, iz) * (1 - u) + hs(ix + 1, iz) * u) * (1 - w) + (hs(ix, iz + 1) * (1 - u) + hs(ix + 1, iz + 1) * u) * w;
  };
}
/**
 * The ground's broad colour patches: a factor per colour channel at floor-plan point (x, depth), from low-frequency
 * world-space noise (patches about 6-10 in across, a finer 3 in octave on top): a few % lighter or darker and a touch
 * warmer or cooler, so a plain sand bed is not one flat colour. Null while fx `ground` is off. Build time only (the
 * ground's vertex colours, render/build.ts addSubstrate).
 */
export function groundTint(S: TankSetup): ((x: number, d: number) => [number, number, number]) | null {
  if (!FX.ground) return null;
  const a = valueNoise((S.layout.seed ?? 1) + 31), b = valueNoise((S.layout.seed ?? 1) + 57), c = valueNoise((S.layout.seed ?? 1) + 83);
  return (x, d) => {
    const lum = 0.65 * (a(x / 220, d / 220) - 0.5) + 0.35 * (b(x / 75 + 4, d / 75 + 9) - 0.5), warm = c(x / 300 + 2, d / 300 + 5) - 0.5;
    const k = 1 + 0.26 * lum; // about +-9 %
    return [k * (1 + 0.05 * warm), k, k * (1 - 0.07 * warm)];
  };
}
/**
 * How strongly the blend's 3D flecks gather at (x, depth), mean about 1: knots about 1-2 in across inside drifts about
 * 5 in across, raised on slopes, nearly empty between knots. Nothing here depends on the items (Nathan 2026-11-12):
 * the ground is not rebuilt when a piece is dragged (render/build.ts patchTank), so a gathering near the hardscape stayed
 * where the piece had been. The extra grains at a piece's foot are in the contact part (render/contact.ts), which is.
 */
function clumpField(S: TankSetup, ground: GroundAt) {
  const big = valueNoise((S.layout.seed ?? 1) + 101), knot = valueNoise((S.layout.seed ?? 1) + 113);
  return (x: number, d: number) => {
    const drift = big(x / 130, d / 130), k = knot(x / 38 + 3, d / 38 + 7);
    const e = 6, gx = ground(x + e, d)[1] - ground(x - e, d)[1], gd = ground(x, d + e)[1] - ground(x, d - e)[1], slope = Math.min(1, Math.hypot(gx, gd) / (2 * e) * 2);
    const v = 3 * Math.max(0, drift - 0.3) * 2.2 * Math.max(0, k - 0.2) * 2.4 + 0.6 * slope;
    return Math.min(2.6, v);
  };
}

// ---------- VF-C2: size sorting (fx `mix`) ----------

/**
 * Where a ground's coarse grains lie (0 = fine .. 1 = coarse), for scatter's `sortAt`: coarse in the hollows (the ground
 * lower than its surroundings 45 mm out, where grains roll and settle) and in broad patches, fine on the humps and in
 * the open flats. Depends on the ground and the seed only (not on the items: the ground is not rebuilt on a drag). The
 * coarse grains by a piece's foot are in render/contact.ts.
 */
function sortField(S: TankSetup, ground: GroundAt, layer: number, loose = 1) {
  const n = valueNoise((S.layout.seed ?? 1) + 131 + layer * 7), R = 45;
  return (x: number, d: number) => {
    const h = ground(x, d)[1];
    const mean = (ground(x - R, d)[1] + ground(x + R, d)[1] + ground(x, d - R)[1] + ground(x, d + R)[1]) / 4;
    const hollow = Math.max(-1, Math.min(1, (mean - h) / 7));
    return Math.max(0, Math.min(1, 0.3 + loose * (1.1 * (n(x / 110, d / 110) - 0.5) + 0.45 * hollow))); // GB2: sorting fades out with the blend's Mixed
  };
}
