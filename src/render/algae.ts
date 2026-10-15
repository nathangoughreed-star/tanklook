// Dirty / algae view (lane AL, 2026-10-15): how the same scape looks weeks past a water change, or neglected. Display
// only: nothing here feeds stocking, light or growth. Every effect is a uniform, so dragging a Condition slider never
// rebuilds geometry or textures; at 0 every branch is skipped (or discarded), so a pristine tank renders as before.
//  - hardscape + substrate: a patch of the lit shader (render/lighting.ts aqPatch inserts ALGAE_GLSL / algaeStep)
//  - plant leaves (lane LA): a patch of the plant material (plant3d growShader inserts LEAF_GLSL / leafAlgae)
//  - glass: a translucent film just inside the panes, or a bowl's sphere (spot algae dots, a film heavier at the waterline)
//  (no water haze: Nathan 2026-10-15, algae shows on the glass and hardscape; the water hardly ever goes hazy)
//  - surface: a faint scum ring at the water line
// Freshwater: brown diatoms first, then green fuzz / hair on lit tops, black beard algae on edges. Salt: diatoms, red
// cyano sheets, bubble algae; coralline spots on the glass instead of green spot algae.
import * as THREE from 'three';
import type { ConditionSettings, Tank } from '../scene/types';
import { bowlDims, footprint, offsetRing, shapeOf } from '../scene/shape';
import { clamp } from '../scene/physics';

export type Amounts = Record<'glass' | 'hard' | 'sub' | 'surface' | 'leaf', number>;

/** Each effect's amount 0..1. One slider drives them all (Nathan 2026-10-15: no need to split by algae type); kept
 *  per effect here so a later lane can weight them apart. */
export function amounts(c: ConditionSettings | undefined): Amounts {
  const lv = clamp(c?.level ?? 0, 0, 1);
  return { glass: lv, hard: lv, sub: lv, surface: lv, leaf: lv };
}

/** Shared uniforms (set per viewport with the water, see setAlgaeUniforms): x hardscape, y substrate, z glass, w surface;
 *  uAlgL plant leaves (only the plant material has it, see leafAlgaeShader). */
export const AU = { uAlg: { value: new THREE.Vector4() }, uAlgSalt: { value: 0 }, uAlgL: { value: 0 } };

export function setAlgaeUniforms(c: ConditionSettings | undefined, salt: boolean) {
  const a = amounts(c);
  AU.uAlg.value.set(a.hard, a.sub, a.glass, a.surface); AU.uAlgSalt.value = salt ? 1 : 0; AU.uAlgL.value = a.leaf;
}

/** GLSL for the lit shader (after AQ_FRAG's helpers: needs vAqP, vAqN, aqNoise, aqHash, uWater, uClip, uClipN). */
export const ALGAE_GLSL = `
uniform vec4 uAlg; uniform float uAlgSalt;
// hardscape (items.ts solidMaterial) defines these: algae keyed to the piece (its seeded local position, so it moves
// with the rock), and none on corals
#ifndef ALG_MASK
#define ALG_MASK 1.0
#endif
#ifndef ALG_POS
#define ALG_POS vAqP
#endif
float algN(vec3 p, vec3 n, float s) {  // triplanar value noise
  vec3 w = abs(n); w /= (w.x + w.y + w.z + 1e-4);
  return aqNoise(p.zy * s + 3.1) * w.x + aqNoise(p.xz * s + 17.0) * w.y + aqNoise(p.xy * s + 31.0) * w.z;
}
float algF(vec3 p, vec3 n, float s) { return 0.5 * algN(p, n, s) + 0.3 * algN(p, n, s * 2.03) + 0.2 * algN(p, n, s * 4.1); }
// sliced spheres on a 3D cell grid (cell mm): circles on any surface, \`k\` of the cells hold one
float algDots(vec3 p, float cell, float k, float r) {
  vec3 q = p / cell, c = floor(q); float h = aqHash(c.xy + c.z * 7.13);
  vec3 o = vec3(aqHash(c.xz + 1.7), aqHash(c.yz + 4.3), aqHash(c.xy + 9.1)) * 0.5 + 0.25;
  float d = length(q - c - o) / (r * (0.6 + 0.8 * aqHash(c.zx + 2.9)));
  return step(1.0 - k, h) * (1.0 - smoothstep(0.75, 1.0, d));
}
// how far (mm) a point is in from the nearest glass, in plan: the footprint's half-planes, else the box
float algEdge(vec3 p) {
  float d = min(min(p.x, uWater.x - p.x), min(-p.z, uWater.z + p.z));
  if (uClipN > 0) { d = 1e9; for (int i = 0; i < ${72}; i++) { if (i >= uClipN) break; vec3 h = uClip[i]; d = min(d, h.z - (h.x * p.x + h.y * p.z)); } }
  return d;
}
vec3 algaeStep(vec3 c, vec3 lt, float e, float isSub) {
  if (e <= 0.0) return c;
  vec3 p = isSub > 0.5 ? vAqP : ALG_POS, n = normalize(vAqN);
  float lum = dot(lt, vec3(0.2126, 0.7152, 0.0722)), lw = smoothstep(0.4, 1.6, lum);
  float up = smoothstep(-0.3, 0.8, n.y), big = algF(p, n, 0.018), mid = algN(p, n, 0.06), fine = algN(p, n, 0.7), hair = algN(p, n, 2.3);
  vec3 c0 = c;
  // 1. diatoms: a patchy brown film, the first thing a new or neglected tank grows; overgrown later
  float td = 0.68 - 0.3 * smoothstep(0.0, 0.6, e), dia = smoothstep(td - 0.08, td + 0.22, big * 0.8 + 0.25 * mid) * (0.55 + 0.45 * fine) * smoothstep(0.0, 0.3, e) * (1.0 - 0.4 * smoothstep(0.6, 1.0, e));
  c = mix(c, c0 * vec3(0.75, 0.62, 0.45) + vec3(0.20, 0.14, 0.06) * (0.6 + 0.8 * hair) * lt, 0.75 * dia);
  if (isSub > 0.5) {  // mulm and detritus where the flow drops it: along the glass, most in the corners
    float ed = algEdge(vAqP), m = (1.0 - smoothstep(8.0, 30.0 + 90.0 * e, ed)) * smoothstep(0.15, 0.9, e) * (0.55 + 0.45 * big);
    c = mix(c, vec3(0.13, 0.10, 0.07) * (0.8 + 0.4 * fine) * lt, 0.8 * m);
  }
  // 2. on the lit tops: green fuzz and hair (fresh) or red cyano sheets (salt), where the light is strong
  // patchy even at full: the light and the facing pick where, two noises break it up (the substrate a little less)
  float g = smoothstep(0.25, 1.0, e), t = 0.8 - 0.55 * g, v = (0.45 * big + 0.2 * mid + 0.42 * up * lw) * (isSub > 0.5 ? 0.66 : 1.0);
  float gc = smoothstep(t, t + 0.12, v) * g;
  vec3 gcol = uAlgSalt > 0.5 ? vec3(0.30, 0.03, 0.05) * (0.7 + 0.5 * fine) : mix(vec3(0.07, 0.15, 0.03), vec3(0.22, 0.34, 0.08), hair) * (0.7 + 0.5 * fine);
  c = mix(c, mix(gcol * min(lt, vec3(1.1)), c0, 0.2), (uAlgSalt > 0.5 ? 0.85 : 0.9) * gc);
  if (isSub > 0.5) return c;
  // 3. edges in flow: black beard algae tufts (fresh), bubble algae (salt)
  float b = smoothstep(0.5, 1.0, e);
  if (uAlgSalt > 0.5) {
    float bub = algDots(p, 9.0, 0.35 * b, 0.32);
    c = mix(c, vec3(0.22, 0.42, 0.18) * lt + 0.12 * lw * bub, 0.95 * bub);
  } else {
    float curv = length(fwidth(n)) / max(length(fwidth(p)), 1e-3);
    float bba = smoothstep(0.012, 0.04, curv) * smoothstep(0.5, 0.75, algN(p, n, 0.25) + 0.25 * b) * smoothstep(0.35, 0.7, hair) * b;
    c = mix(c, vec3(0.06, 0.065, 0.055) * (0.7 + 0.6 * hair) * lt, 0.9 * bba);
  }
  return c;
}`;

/** Inserted right after the lit colour is formed (outgoingLight = albedo x light): hardscape and substrate only. */
export const ALGAE_STEP = `if (uAlgH > 0.5 && uAlg.x > 0.0) outgoingLight = algaeStep(outgoingLight, aqLt, uAlg.x * ALG_MASK, 0.0);
if (uSub > 0.5 && uAlg.y > 0.0) outgoingLight = algaeStep(outgoingLight, aqLt, uAlg.y, 1.0);\n`;

/**
 * Algae on plant leaves (lane LA, 2026-10-15). Per vertex the plant's growth tags tell how old a leaf is (`aGrow.x` =
 * the growth it came in at, against the mesh's growth `aGrowth`) and how far out along it the point is (from its
 * anchor, the leaf's base); per mesh `aAlg` = (slowness: 1 slow grower .. 0 fast, the plant's height at full growth),
 * one instanced value on the plant's GPU view (plant3d grownView). Noise is keyed to the full-growth position, so a
 * leaf's spots stay put as it grows and move with the plant.
 *  - diatoms: a brown film on older and lower leaves first (every plant, fast growers outgrow most of it)
 *  - green spot dots and hair algae: slow growers (anubias, buce, java fern, crypts), the lit upper leaves most
 *  - black beard algae (Neglected): tufts on the outer ends of old slow-grower leaves
 * Fast stem plants stay cleanest; nothing above the water. Salt: red cyano instead of the greens.
 */
const LEAF_VERT = `attribute vec2 aAlg; varying vec3 vAlgP; varying vec4 vAlgT;
void leafAlgVert() {
  float h = max(aAlg.y, 20.0);
  vAlgP = position; vAlgT = vec4(aGrowth - aGrow.x, aAlg.x, clamp(position.y / h, 0.0, 1.0), length(position - aAnc));
}`;
const LEAF_GLSL = `uniform float uAlgL; varying vec3 vAlgP; varying vec4 vAlgT;
vec3 leafAlgae(vec3 c, vec3 lt, float e) {
  vec3 p = vAlgP, n = normalize(vAqN), c0 = c;
  float slow = vAlgT.y, old = max(smoothstep(0.05, 0.6, vAlgT.x), 1.0 - smoothstep(0.1, 0.45, vAlgT.z)), tip = smoothstep(22.0, 55.0, vAlgT.w);
  float lum = dot(lt, vec3(0.2126, 0.7152, 0.0722)), lw = smoothstep(0.35, 1.4, lum), up = smoothstep(0.0, 0.8, n.y);
  float wet = 1.0 - smoothstep(uWater.y - 2.0, uWater.y + 4.0, vAqP.y);  // nothing on emersed leaves
  float big = algF(p, n, 0.05), mid = algN(p, n, 0.16), fine = algN(p, n, 0.4), hair = algN(p, n, 1.0);
  // 1. diatoms: patchy brown dust on the old and low leaves, spreading up the plant as it gets worse
  float sd = mix(0.4, 1.0, slow), td = 0.8 - 0.3 * smoothstep(0.0, 0.7, e) - 0.2 * old;
  float dia = smoothstep(td - 0.06, td + 0.2, big * 0.75 + 0.25 * mid) * (0.5 + 0.5 * fine) * smoothstep(0.0, 0.3, e) * (0.35 + 0.65 * old) * sd * wet * (1.0 - 0.35 * smoothstep(0.6, 1.0, e));
  c = mix(c, c0 * vec3(0.78, 0.62, 0.42) + vec3(0.17, 0.12, 0.05) * (0.6 + 0.8 * hair) * lt, 0.8 * dia);
  // 2. green spot (round hard dots) and hair algae: slow growers, on the lit upper side; salt: red cyano sheets
  float g = smoothstep(0.2, 0.85, e) * mix(0.12, 1.0, slow * slow) * wet;
  if (uAlgSalt > 0.5) {
    float cy = smoothstep(0.62 - 0.3 * g, 0.75 - 0.3 * g, big * 0.6 + 0.4 * up * lw) * g;
    c = mix(c, vec3(0.32, 0.04, 0.06) * (0.7 + 0.5 * fine) * min(lt, vec3(1.1)), 0.85 * cy);
  } else {
    float spot = algDots(p, 3.6, g * (0.3 + 0.6 * up * lw) * (0.5 + 0.5 * old), 0.34);
    c = mix(c, vec3(0.08, 0.22, 0.04) * min(lt, vec3(1.2)), 0.92 * spot);
    float th = 1.0 - 0.45 * g, strand = algN(p * vec3(1.0, 0.2, 1.0), n, 0.6), hv = smoothstep(th, th + 0.1, 0.45 * big + 0.25 * mid + 0.45 * up * lw) * smoothstep(0.45, 0.8, strand) * g;
    c = mix(c, mix(vec3(0.10, 0.20, 0.04), vec3(0.26, 0.38, 0.10), hair) * (0.7 + 0.5 * fine) * min(lt, vec3(1.2)), 0.85 * hv);
  }
  // 3. black beard algae (fresh) at Neglected: dark tufts on the outer ends of old slow-grower leaves
  float b = smoothstep(0.55, 1.0, e) * mix(0.1, 1.0, slow) * wet;
  if (uAlgSalt < 0.5 && b > 0.0) {
    float bba = smoothstep(0.6, 0.75, algN(p, n, 0.35) + 0.3 * tip + 0.1 * old) * smoothstep(0.25, 0.55, hair) * tip * b;
    c = mix(c, vec3(0.05, 0.055, 0.045) * (0.7 + 0.6 * hair) * lt, 0.92 * bba);
  }
  return c;
}`;
/** Patch the plant material's lit shader (after the lighting patch and the GPU reveal's attributes, plant3d growShader):
 *  at Pristine (uAlgL = 0) it is skipped, so a plant renders exactly as before. */
export function leafAlgaeShader(sh: THREE.WebGLProgramParametersWithUniforms) {
  if (!sh.fragmentShader.includes(ALGAE_STEP)) return; // not lit: nothing to patch
  (sh.uniforms as Record<string, THREE.IUniform>).uAlgL = AU.uAlgL;
  sh.vertexShader = sh.vertexShader.replace('void main() {', LEAF_VERT + '\nvoid main() {')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nleafAlgVert();');
  sh.fragmentShader = sh.fragmentShader.replace('void main() {', LEAF_GLSL + '\nvoid main() {')
    .replace(ALGAE_STEP, ALGAE_STEP + 'if (uAlgL > 0.0) outgoingLight = leafAlgae(outgoingLight, aqLt, uAlgL);\n');
}

type LightU = Record<string, THREE.IUniform>;

/** Light on the film and scum: the tank light's colour and brightness (they sit in it), or plain with a flat light. */
const LIT = `uniform float uMode, uAmb, uBright; uniform vec3 uLCol;
vec3 algLit() { return uMode > 1.5 ? vec3(uAmb) : uMode > 0.5 ? vec3(uAmb) + uLCol * min(uBright, 1.3) * 0.75 : vec3(1.0); }
float aH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float aN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(aH(i), aH(i + vec2(1, 0)), f.x), mix(aH(i + vec2(0, 1)), aH(i + vec2(1, 1)), f.x), f.y); }`;

/**
 * Algae on the glass: one translucent band per pane just inside it, substrate to water line. The pane nearest the eye
 * (looked through) grows less and fainter, so the tank still reads through the front glass. A bowl: one sphere zone.
 */
function glassFilm(T: Tank, wy: number, lu: LightU) {
  const g = shapeOf(T) === 'bowl' ? bowlFilm(T, wy) : paneFilm(T, wy);
  const m = new THREE.ShaderMaterial({
    uniforms: { ...lu, uAlg: AU.uAlg, uAlgSalt: AU.uAlgSalt, uWY: { value: wy } },
    vertexShader: 'attribute vec2 aPane; varying vec3 vP, vN; varying vec2 vU, vPane; void main() { vU = uv; vPane = aPane; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: FILM_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 2; mesh.userData.nolight = true;
  return mesh;
}

/** The panes' film: per pane a band (uv = along the run, height; aPane = along this pane, its length). */
function paneFilm(T: Tank, wy: number) {
  const ring = offsetRing(T, -0.6), f = footprint(T), pos: number[] = [], nor: number[] = [], uv: number[] = [], pane: number[] = [];
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-6) continue;
    // inward normal in world (x, z = -depth): the ring runs round the footprint; flip to point at its centre
    let nx = -(b[1] - a[1]) / l, nd = (b[0] - a[0]) / l;
    const cx = f.ring.reduce((t, p) => t + p[0], 0) / f.ring.length, cd = f.ring.reduce((t, p) => t + p[1], 0) / f.ring.length;
    if (nx * (cx - a[0]) + nd * (cd - a[1]) < 0) { nx = -nx; nd = -nd; }
    const q = (p: number[], y: number, u: number) => { pos.push(p[0], y, -p[1]); nor.push(nx, 0, -nd); uv.push(s + u, y); pane.push(u, l); };
    q(a, 0, 0); q(b, 0, l); q(b, wy, l); q(a, 0, 0); q(b, wy, l); q(a, wy, 0);
    s += l;
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    .setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)).setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)).setAttribute('aPane', new THREE.Float32BufferAttribute(pane, 2));
}

/** Height bands and segments round of a bowl's film (as fine as its glass shell, render/build.ts). */
const BOWL_BANDS = 28, BOWL_SEG = 96;
/**
 * A bowl's film: a sphere zone 0.6 mm inside the glass, floor to water line, normals toward the centre. uv = arc round
 * the equator (so a blotch keeps its size round the bowl), height; no pane edges (aPane far from both ends). The seam
 * (angle 0) is at the front, on the glass looked through, where the film is faintest.
 */
function bowlFilm(T: Tank, wy: number) {
  const { R, c } = bowlDims(T), Rf = R - 0.6, top = Math.min(wy, T.H), pos: number[] = [], nor: number[] = [], uv: number[] = [], pane: number[] = [];
  const at = (i: number, j: number) => {
    const a = 2 * Math.PI * i / BOWL_SEG, y = top * j / BOWL_BANDS, r = Math.sqrt(Math.max(0, Rf * Rf - (y - c) ** 2));
    const x = r * Math.sin(a), z = r * Math.cos(a), k = Math.hypot(x, y - c, z) || 1;
    return { p: [R + x, y, -(R - z)], n: [-x / k, -(y - c) / k, -z / k], u: [Rf * a, y] };
  };
  const q = (v: ReturnType<typeof at>) => { pos.push(...v.p); nor.push(...v.n); uv.push(...v.u); pane.push(1e4, 2e4); };
  for (let i = 0; i < BOWL_SEG; i++) for (let j = 0; j < BOWL_BANDS; j++) {
    const a = at(i, j), b = at(i + 1, j), d = at(i + 1, j + 1), e = at(i, j + 1);
    q(a); q(b); q(d); q(a); q(d); q(e);
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    .setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)).setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)).setAttribute('aPane', new THREE.Float32BufferAttribute(pane, 2));
}

/** The glass film's fragment shader (panes and bowl). */
const FILM_FRAG = `${LIT}
uniform vec4 uAlg; uniform float uAlgSalt, uWY; varying vec3 vP, vN; varying vec2 vU, vPane;
void main() {
  float e = uAlg.z; if (e <= 0.0) discard;
  float near = smoothstep(-0.08, 0.08, dot(vN, normalize(vP - cameraPosition)));  // the glass looked through (soft on a bowl's sphere)
  float hi = smoothstep(0.0, uWY, vU.y), wl = exp(-abs(uWY - vU.y) / 22.0);
  float big = 0.55 * aN(vU * 0.022) + 0.45 * aN(vU * 0.07 + 7.0);
  // the film: blotches with clear glass between (never an even veil, which reads as haze), growing in from the
  // pane's edges and corners (where the scraper misses), plus a band at the waterline
  float de = min(min(vPane.x, vPane.y - vPane.x), min(vU.y, uWY - vU.y)), edge = exp(-de / 70.0);
  float tb = 0.8 - 0.3 * e + 0.26 * near, blot = smoothstep(tb, tb + 0.22, big + 0.4 * edge + 0.1 * hi);
  float film = blot * (0.25 + 0.35 * e) * smoothstep(0.0, 0.3, e) + wl * smoothstep(0.1, 0.7, e) * 0.5 * (0.6 + 0.4 * big);
  // spot algae (coralline in salt): hard round dots, more on the lit upper glass
  vec2 q = vU / 7.0, c = floor(q), o = vec2(aH(c + 1.3), aH(c + 5.9)) * 0.6 + 0.2;
  float r = 0.13 + 0.17 * aH(c + 3.7), d = length(q - c - o) / r;
  float spot = step(1.0 - smoothstep(0.1, 1.0, e) * (0.10 + 0.30 * hi) * (0.5 + big), aH(c)) * (1.0 - smoothstep(0.7, 1.0, d));
  vec3 fc = uAlgSalt > 0.5 ? vec3(0.50, 0.40, 0.22) : mix(vec3(0.45, 0.40, 0.22), vec3(0.30, 0.42, 0.16), smoothstep(0.3, 0.9, e));
  vec3 sc = uAlgSalt > 0.5 ? vec3(0.62, 0.36, 0.52) : vec3(0.22, 0.40, 0.12);
  float a = clamp(film, 0.0, 0.75), as = 0.9 * spot;
  vec3 col = mix(fc, sc, as / max(as + a * (1.0 - as), 1e-4));
  gl_FragColor = vec4(col * algLit(), (as + a * (1.0 - as)) * (1.0 - 0.6 * near));
}`;

/** Scum on the water surface: a faint oily film along the glass, patchy. */
function surfaceScum(T: Tank, wy: number, lu: LightU) {
  const ring = footprint(T).ring, pos: number[] = [];
  for (let i = 1; i < ring.length - 1; i++) for (const p of [ring[0], ring[i], ring[i + 1]]) pos.push(p[0], wy + 0.3, -p[1]);
  const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { ...lu, uAlg: AU.uAlg, uAlgSalt: AU.uAlgSalt },
    vertexShader: 'varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `${LIT}
uniform vec4 uAlg, uWater; uniform vec3 uClip[72]; uniform int uClipN; uniform float uAlgSalt; varying vec3 vP;
void main() {
  float e = uAlg.w; if (e <= 0.0) discard;
  float d = min(min(vP.x, uWater.x - vP.x), min(-vP.z, uWater.z + vP.z));
  if (uClipN > 0) { d = 1e9; for (int i = 0; i < 72; i++) { if (i >= uClipN) break; vec3 h = uClip[i]; d = min(d, h.z - (h.x * vP.x + h.y * vP.z)); } }
  float n = 0.6 * aN(vP.xz * 0.02) + 0.4 * aN(vP.xz * 0.09 + 3.0);
  float a = e * 0.4 * (1.0 - smoothstep(4.0, 15.0 + 35.0 * e, d)) * smoothstep(0.35, 0.75, n); // along the glass only: an even film over the surface veils the whole tank seen from above
  vec3 col = uAlgSalt > 0.5 ? vec3(0.78, 0.72, 0.58) : vec3(0.82, 0.80, 0.62);
  col *= 0.9 + 0.2 * aN(vP.xz * 0.3);
  gl_FragColor = vec4(col * algLit(), clamp(a, 0.0, 0.5));
}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 5; mesh.userData.nolight = true;
  return mesh;
}

/** The glass film and the surface scum for a tank with water (build.ts buildTank); drawn only while their amount > 0. */
export function addAlgae(sc: THREE.Scene, T: Tank, wy: number, lu: LightU) {
  if (wy <= 0) return;
  sc.add(glassFilm(T, wy, lu));
  if (shapeOf(T) !== 'bowl') sc.add(surfaceScum(T, wy, lu)); // a bowl: no scum yet (it measures to the glass by the floor's outline)
}
