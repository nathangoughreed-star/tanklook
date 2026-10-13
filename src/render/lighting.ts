// A cheap top-down light model injected into unlit MeshBasicMaterials (three.js lights leave edge-on cards black).
// Each fixture is a set of emitters above the water (points for spots/LEDs, line segments for tubes).
// Brightness at a point = room light + sum(beam cone x distance falloff x surface facing), normalised so every
// fixture type gives the same mean at mid-height; only the distribution differs. Fish/plant cards ignore facing
// (they would be edge-on to a light straight above and turn black), so they just take the light level there.
// Room surfaces (wall, floor, stand, hood, person) are lit by the room light, plus light spilling out of the tank:
// with the room light off, the tank is the only light in the room (Nathan, 2026-10-08).
import * as THREE from 'three';
import { D2R, clamp } from '../scene/physics';
import type { LightSettings, LightType, Tank, WaterSettings } from '../scene/types';
import { waterK, waterY } from '../scene/physics';
import { bowlDims, footprint, insideBy, shapeOf, type P } from '../scene/shape';

export const AQ_MAX = 48, LAMP_Y = 50, REF = 320;
export const CONES: Record<Exclude<LightType, 'flat'>, [number, number]> = {
  spot: [Math.cos(18 * D2R), Math.cos(34 * D2R)], tube: [0.45, -0.15], led: [Math.cos(45 * D2R), Math.cos(75 * D2R)],
};
/** Spot beam (full angle, degrees) -> [cos inner, cos outer] half-angles; the default 52° gives the old 18°/34°. */
const spotCone = (deg: number): [number, number] => [Math.cos(Math.min(deg * 0.35, 80) * D2R), Math.cos(Math.min(deg * 0.65, 85) * D2R)];
/** The fixture's beam, and how much brighter it is per unit area than the standard one (same output, narrower beam). */
function beam(l: LightSettings): { cone: [number, number]; gain: number } {
  if (l.type !== 'spot') return { cone: CONES[l.type as Exclude<LightType, 'flat'>], gain: 1 };
  const deg = l.cone ?? 52, solid = (a: number) => 1 - Math.cos(a / 2 * D2R);
  return { cone: spotCone(deg), gain: solid(52) / solid(deg) };
}
/** [x, y, z, halfLength]: halfLength > 0 means a line emitter along x. */
export type Emitter = [number, number, number, number];

/** Fixture height above the tank top (mm): the setting, or LAMP_Y inside a hood. */
export const lampHeight = (l: LightSettings, lid: string) => (lid === 'hood' ? LAMP_Y : l.height ?? LAMP_Y);

export function emitters(T: Tank, l: LightSettings, height = l.height ?? LAMP_Y): Emitter[] {
  const { L, H, D } = T, y = H + height, n = l.count, E: Emitter[] = [];
  // spots: a count × rows grid (rows run front to back), centred over the tank. Auto spacing (0) spreads it to fill
  // the tank; a set spacing is centre to centre, with rows √3/2 of it apart in the triangular pattern. 'tri' staggers
  // the rows: the middle row (or the back one, with an even number) has `count` bulbs, its neighbours one fewer.
  if (l.type === 'spot' && l.pattern === 'fit') for (const [x, d] of fitSpots(T, n)) E.push([x, y, -d, 0]);
  else if (l.type === 'spot') {
    const m = l.rows ?? 1, s = l.spacing ?? 0, tri = l.pattern === 'tri';
    const sx = s > 0 ? s : L / n, sz = s > 0 ? (tri ? s * Math.sqrt(3) / 2 : s) : D / m;
    for (let j = 0; j < m; j++) {
      const k = tri && j % 2 !== (m % 2 ? ((m - 1) / 2) % 2 : 1) ? Math.max(n - 1, 1) : n, z = -D / 2 - (j - (m - 1) / 2) * sz;
      for (let i = 0; i < k; i++) E.push([L / 2 + (i - (k - 1) / 2) * sx, y, z, 0]);
    }
  }
  if (l.type === 'tube') for (let i = 0; i < n; i++) E.push([L / 2, y, -D * (i + 0.5) / n, L * 0.45]);
  if (l.type === 'led') {
    const cols = clamp(Math.round(L * 0.9 / 45), 2, 24);
    for (const r of [0.38, 0.62]) for (let c = 0; c < cols; c++) E.push([L * (0.05 + 0.9 * (c + 0.5) / cols), y, -D * r, 0]);
  }
  return E.slice(0, AQ_MAX);
}

const fitCache = new Map<string, P[]>();
/**
 * `n` bulb positions [x, depth] that cover the tank's outline evenly, for odd shapes a grid fits badly (Nathan,
 * 2026-10-13: a 90° pie wants one bulb toward the corner and one near each end of the arc). Centroidal Voronoi:
 * every bulb sits at the centre of the floor area nearer to it than to any other bulb, which minimises the mean
 * distance from the floor to its nearest bulb. Lloyd's iteration over a sample grid of the footprint, from a few
 * deterministic starts (farthest-point seeding), keeping the best; cached per outline and count.
 */
export function fitSpots(T: Tank, n: number): P[] {
  const key = `${shapeOf(T)}|${T.L}|${T.D}|${T.sides}|${T.bowMin}|${T.bowlFloor}|${T.pieDeg}|${n}`;
  const hit = fitCache.get(key);
  if (hit) return hit;
  const g = 48, S: P[] = [];
  for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) {
    const x = T.L * (i + 0.5) / g, d = T.D * (j + 0.5) / g;
    if (insideBy(T, x, d) > 0) S.push([x, d]);
  }
  if (!S.length) S.push([T.L / 2, T.D / 2]);
  const near = (p: P, c: P[]) => { let k = 0, b = Infinity; c.forEach((q, i) => { const v = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (v < b) { b = v; k = i; } }); return [k, b]; };
  let best: P[] = [], bestE = Infinity;
  // starts: farthest-point seeding from the centroid, and from each of a few spread samples
  const mean: P = [S.reduce((a, p) => a + p[0], 0) / S.length, S.reduce((a, p) => a + p[1], 0) / S.length];
  for (const first of [mean, S[0], S[S.length >> 1], S[S.length - 1], S[Math.floor(S.length / 3)]]) {
    let c: P[] = [first];
    while (c.length < n) { let f = S[0], fd = -1; for (const p of S) { const v = near(p, c)[1]; if (v > fd) { fd = v; f = p; } } c.push(f); }
    for (let it = 0; it < 120; it++) {
      const acc = c.map(() => [0, 0, 0]);
      for (const p of S) { const a = acc[near(p, c)[0]]; a[0] += p[0]; a[1] += p[1]; a[2]++; }
      const next = acc.map((a, i): P => (a[2] ? [a[0] / a[2], a[1] / a[2]] : c[i]));
      const moved = Math.max(...next.map((q, i) => Math.hypot(q[0] - c[i][0], q[1] - c[i][1])));
      c = next;
      if (moved < 0.05) break;
    }
    const E = S.reduce((a, p) => a + near(p, c)[1], 0);
    if (!best.length || E < bestE * (1 - 1e-6)) { bestE = E; best = c; }
  }
  // front to back, left to right, so the bulbs keep a stable order
  best = best.map(p => [+p[0].toFixed(1), +p[1].toFixed(1)] as P).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  fitCache.set(key, best); if (fitCache.size > 32) fitCache.delete(fitCache.keys().next().value!);
  return best;
}

/** JS twin of the shader loop (card mode: no facing term); used for normalisation. */
export function lightSum(E: Emitter[], p: [number, number, number], cone: [number, number]) {
  let sum = 0;
  for (const e of E) {
    const qx = e[3] > 0 ? clamp(p[0], e[0] - e[3], e[0] + e[3]) : e[0], dx = qx - p[0], dy = e[1] - p[1], dz = e[2] - p[2];
    const d = Math.hypot(dx, dy, dz), ly = dy / Math.max(d, 1);
    const c = THREE.MathUtils.smoothstep(ly, cone[1], cone[0]), r = d / REF;
    sum += c * (e[3] > 0 ? 1 / (1 + r) : 1 / (1 + r * r));
  }
  return sum;
}

/** Tanner Helland approximation, scaled to unit luminance so temperature doesn't change brightness. */
/**
 * Room brightness (0..1) from the Room light setting: 0 = lights off, full from 0.3 up. Eased, so the dim end of
 * the slider has room to work; the default 0.15 reads as a slightly dimmed room.
 */
export const roomLevel = (room: number) => 1 - (1 - clamp(room / 0.3, 0, 1)) ** 2;
/** How far (mm) the tank's light carries into the room before it falls to half. */
export const spillReach = (T: Tank) => 0.35 * Math.max(T.L, T.H, T.D) + 120;

export function kelvinRGB(K: number): [number, number, number] {
  const t = K / 100; let r: number, g: number, b: number;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255; }
  [r, g, b] = [r, g, b].map(v => clamp(v, 0, 255) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r / lum, g / lum, b / lum];
}

/** Shared uniforms; set per viewport before each render because Tank A and Tank B have different fixtures. */
export const LU = {
  uEm: { value: Array.from({ length: AQ_MAX }, () => new THREE.Vector4()) }, uEmN: { value: 0 }, uMode: { value: 0 },
  uAmb: { value: 0.25 }, uBright: { value: 1 }, uNorm: { value: 1 }, uConeIn: { value: 0.9 }, uConeOut: { value: 0.8 },
  uRef: { value: REF }, uLCol: { value: new THREE.Color(1, 1, 1) },
  uRoomK: { value: 1 }, uSpill: { value: new THREE.Color(1, 1, 1) }, uSpillR: { value: 500 },
  uTankMin: { value: new THREE.Vector3() }, uTankMax: { value: new THREE.Vector3() }, uTankRound: { value: 0 },
  uWater: { value: new THREE.Vector4() }, uWCol: { value: new THREE.Color() },
  // beam overlay's hit map: one beam per entry (x, fixture y, z, half-length along x), cos of its half-strength angle
  uBm: { value: Array.from({ length: AQ_MAX }, () => new THREE.Vector4()) }, uBmN: { value: 0 }, uBmCos: { value: 0 },
};
/** Water box (L, surface y, D) and tint per mm; set per viewport like the light. */
export function setWaterUniforms(T: Tank, w: WaterSettings) {
  LU.uWater.value.set(T.L, waterY(T, w.level), T.D, w.on ? waterK(w.opacity) : 0);
  LU.uWCol.value.set(w.color);
}
export function setLightUniforms(T: Tank, l: LightSettings, lid = 'open', beams = false) {
  const on = l.type !== 'flat'; LU.uMode.value = on ? 1 : 0;
  LU.uBmN.value = 0;
  if (on && beams) { const b = beamSegs(T, l, lid); b.segs.forEach((s, i) => LU.uBm.value[i].set(s[0], b.top, s[1], s[2])); LU.uBmN.value = b.segs.length; LU.uBmCos.value = Math.cos(b.half); }
  const hgt = lampHeight(l, lid), up = on ? hgt : 0;
  LU.uRoomK.value = roomLevel(l.room); LU.uSpillR.value = spillReach(T) + up * 0.5;
  // spill leaves the tank box, extended up to the fixture: a raised light also lights the room over the rim
  LU.uTankMin.value.set(0, 0, -T.D); LU.uTankMax.value.set(T.L, T.H + up, 0);
  // round, polygon and bowl tanks spill from an ellipse inscribed in that box, not the box itself (no square pool of light)
  LU.uTankRound.value = ['round', 'poly', 'bowl'].includes(shapeOf(T)) ? 1 : 0;
  // the spill shows most in a dark room (in a lit room the eye adapts and it barely registers); a raised fixture
  // throws more of its light past the tank (up to ~1.8x at 450 mm and above)
  const spill = 0.9 * (1 - 0.75 * roomLevel(l.room)) * (1 + 0.8 * clamp((up - LAMP_Y) / 400, 0, 1));
  if (on) LU.uSpill.value.setRGB(...kelvinRGB(l.kelvin)).multiplyScalar(spill * l.bright); else LU.uSpill.value.setRGB(spill, spill, spill);
  if (!on) return;
  const E = emitters(T, l, hgt), { cone, gain } = beam(l), ref: LightSettings = { ...l, spacing: 0, cone: 52 };
  E.forEach((e, i) => LU.uEm.value[i].set(...e)); LU.uEmN.value = E.length;
  // normalised with the fixture at the standard height, auto spacing and standard beam (sample a mid-height plane
  // across the tank), so raising it dims the tank (distance falloff) and evens it out (wider footprint), spreading
  // the bulbs past the glass loses light outside, and a narrower beam concentrates the same output (gain)
  const R = emitters(T, ref, LAMP_Y), rc = beam(ref).cone; let avg = 0, k = 0;
  for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) { avg += lightSum(R, [T.L * i / 6, T.H * 0.5, -T.D * j / 6], rc); k++; }
  LU.uNorm.value = gain * k / Math.max(avg, 1e-6); [LU.uConeIn.value, LU.uConeOut.value] = cone;
  LU.uAmb.value = l.room; LU.uBright.value = l.bright; LU.uLCol.value.setRGB(...kelvinRGB(l.kelvin));
}

const AQ_VERT = 'varying vec3 vAqP; varying vec3 vAqN;';
const AQ_FRAG = `
uniform vec4 uEm[${AQ_MAX}]; uniform int uEmN; uniform float uMode, uAmb, uBright, uNorm, uConeIn, uConeOut, uRef, uCard, uSub, uFish; uniform vec3 uLCol;
float aqSpec = 0.0;
uniform float uRoomMat, uRoomK, uSpillR, uTankRound; uniform vec3 uSpill, uTankMin, uTankMax; uniform vec4 uWater; uniform vec3 uWCol;
varying vec3 vAqP; varying vec3 vAqN;
float aqHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float aqNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(aqHash(i), aqHash(i + vec2(1, 0)), f.x), mix(aqHash(i + vec2(0, 1)), aqHash(i + vec2(1, 1)), f.x), f.y);
}
// length (mm) of the eye-to-point sightline that runs through the water box (slab test, clipped to the segment)
float aqWaterPath() {
  vec3 o = cameraPosition, dv = vAqP - o;
  dv = mix(dv, vec3(1e-3), step(abs(dv), vec3(1e-3)));
  vec3 t0 = (vec3(0.0, 0.0, -uWater.z) - o) / dv, t1 = (vec3(uWater.x, uWater.y, 0.0) - o) / dv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), max(tn.z, 0.0)), b = min(min(tf.x, tf.y), min(tf.z, 1.0));
  return max(b - a, 0.0) * length(vAqP - o);
}
// 3D fish facing, measured against the flank that faces the viewer (horizontal, toward the camera): that flank gets
// exactly 1, like the card, so side views match the card's brightness; surfaces turned toward the light are brighter,
// away from it darker, symmetrically (so the curved flank averages to the card), which keeps the volume
float aqFishFacing(vec3 n, vec3 ld) {
  vec3 tv = cameraPosition - vAqP; vec3 nv = normalize(vec3(tv.x, 0.0, tv.z) + vec3(1e-4, 0.0, 0.0));
  float x = dot(n, ld) - dot(nv, ld);
  return 1.0 + 0.5 * x;
}
vec3 aqLight() {
  if (uRoomMat > 0.5) {  // room surface: room light + light leaving the tank (nearest point of the tank box)
    vec3 q = clamp(vAqP, uTankMin, uTankMax);
    if (uTankRound > 0.5) {  // nearest point of the inscribed ellipse in plan (radial projection: close enough for a soft falloff)
      vec2 c = 0.5 * (uTankMin.xz + uTankMax.xz), rr = 0.5 * (uTankMax.xz - uTankMin.xz), o = vAqP.xz - c;
      float k = length(o / rr); q.xz = c + o / max(k, 1.0);
    }
    vec3 tl = q - vAqP; float d = length(tl);
    vec3 ld = d > 1.0 ? tl / d : vec3(0.0, 1.0, 0.0); float r = d / uSpillR;
    float facing = uCard > 0.5 ? 0.6 : 0.3 + 0.7 * max(dot(normalize(vAqN), ld), 0.0);
    return vec3(uRoomK) + uSpill * (facing / (1.0 + r * r));
  }
  float sum = 0.0; vec3 n = normalize(vAqN);
  if (uMode < 0.5) {
    if (uFish < 0.5) return vec3(1.0);
    // flat light: 3D fish still need form, so a fixed soft key from above and slightly in front
    vec3 ld = normalize(vec3(-0.2, 1.0, 0.35)), hv = normalize(ld + normalize(cameraPosition - vAqP));
    aqSpec = 0.6 * pow(max(dot(n, hv), 0.0), 40.0);
    return vec3(aqFishFacing(n, ld));
  }
  for (int i = 0; i < ${AQ_MAX}; i++) {
    if (i >= uEmN) break;
    vec4 e = uEm[i];
    vec3 q = e.w > 0.0 ? vec3(clamp(vAqP.x, e.x - e.w, e.x + e.w), e.y, e.z) : e.xyz;
    vec3 tl = q - vAqP; float d = length(tl); vec3 ld = tl / max(d, 1.0);
    float cone = smoothstep(uConeOut, uConeIn, ld.y), r = d / uRef;
    float fall = e.w > 0.0 ? 1.0 / (1.0 + r) : 1.0 / (1.0 + r * r);
    float facing = uCard > 0.5 ? 1.0 : 0.3 + 0.9 * abs(dot(n, ld));
    // 3D fish body: lit from the light's side (flank toward the viewer = 1, back brighter, belly darker), plus a soft highlight
    if (uFish > 0.5) {
      facing = aqFishFacing(n, ld);
      vec3 hv = normalize(ld + normalize(cameraPosition - vAqP));
      aqSpec += cone * fall * pow(max(dot(n, hv), 0.0), 40.0);
    }
    sum += cone * fall * facing;
  }
  return vec3(uAmb) + uLCol * (uBright * uNorm * sum);
}
// beam overlay hit map (Nathan 2026-10-13: see where light does and does not land, and where it lands twice or more):
// x = how many beams reach this point (inside the half-strength angle), y = 1 on a beam's edge line
uniform vec4 uBm[${AQ_MAX}]; uniform int uBmN; uniform float uBmCos, uNoMap;
vec2 aqHits() {
  float n = 0.0, edge = 0.0;
  for (int i = 0; i < ${AQ_MAX}; i++) {
    if (i >= uBmN) break;
    vec4 e = uBm[i];
    vec3 q = vec3(clamp(vAqP.x, e.x - e.w, e.x + e.w), e.y, e.z), tl = q - vAqP;
    float f = tl.y / max(length(tl), 1.0) - uBmCos, w = fwidth(f);
    n += step(0.0, f);
    edge = max(edge, 1.0 - smoothstep(1.5 * w, 3.5 * w, abs(f)));
  }
  return vec2(n, edge);
}`;
// substrate anti-tiling: two copies of the texture (rotated + rescaled) blended by low-frequency noise, plus soft light/dark patches
const AQ_MAP = `#ifdef USE_MAP
  vec4 aqTex = texture2D(map, vMapUv);
  if (uSub > 0.5) {
    vec2 uv2 = mat2(0.8, -0.6, 0.6, 0.8) * vMapUv * 0.77 + vec2(0.31, 0.57);
    aqTex = mix(aqTex, texture2D(map, uv2), smoothstep(0.3, 0.7, aqNoise(vMapUv * 0.45)));
    aqTex.rgb *= 0.82 + 0.36 * aqNoise(vMapUv * 0.9 + 7.0);
  }
  diffuseColor *= aqTex;
#endif`;

function aqPatch(this: THREE.Material, shader: THREE.WebGLProgramParametersWithUniforms) {
  this.userData.pre?.(shader); // the material's own patch (hardscape: glass clip and grit) still applies under the lighting
  Object.assign(shader.uniforms, LU, { uCard: { value: this.userData.card ? 1 : 0 }, uSub: { value: this.userData.sub ? 1 : 0 }, uFish: { value: this.userData.fish ? 1 : 0 }, uRoomMat: { value: this.userData.room ? 1 : 0 }, uNoMap: { value: this.userData.nomap ? 1 : 0 } });
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + AQ_VERT)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAqP = (modelMatrix * vec4(transformed, 1.0)).xyz; vAqN = normalize(mat3(modelMatrix) * normal);');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + AQ_FRAG)
    .replace('#include <opaque_fragment>', 'vec3 aqLt = aqLight(); outgoingLight *= aqLt;\n' +
      'if (uCard > 0.5) { float aqL = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)); outgoingLight = max(mix(vec3(aqL), outgoingLight, 1.35), 0.0); }\n' +
      'float aqM = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b);\n' +
      // 3D fish body: the card's saturation, then a shoulder instead of the hard clamp (which flattens the form shading
      // wherever the light is strong): values up to 0.6 are untouched, so the body matches its card, and only
      // highlights roll off toward 1; then the highlight and a faint silvery sheen toward the edges on top
      'if (uFish > 0.5) {\n' +
      '  float aqS = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)); outgoingLight = max(mix(vec3(aqS), outgoingLight, 1.35), 0.0);\n' +
      '  aqM = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b);\n' +
      '  if (aqM > 0.6) outgoingLight *= (0.6 + 0.4 * (1.0 - exp(-(aqM - 0.6) / 0.4))) / aqM;\n' +
      '  vec3 aqV = normalize(cameraPosition - vAqP); float aqRim = pow(1.0 - abs(dot(normalize(vAqN), aqV)), 3.0);\n' +
      '  outgoingLight += uLCol * (uBright * uNorm * aqSpec * 0.16) + vec3(0.03, 0.04, 0.045) * aqRim * min(dot(aqLt, vec3(0.333)), 1.5);\n' +
      '  outgoingLight = min(outgoingLight, vec3(1.0));\n' +
      '} else if (aqM > 1.0) outgoingLight /= aqM;\n' +
      // water colour: blend toward the lit water colour by how much water the sightline crosses
      'if (uWater.w > 0.0) { float aqF = 1.0 - exp(-uWater.w * aqWaterPath()); outgoingLight = mix(outgoingLight, uWCol * min(dot(aqLt, vec3(0.2126, 0.7152, 0.0722)), 1.0), aqF); }\n' +
      // beam overlay: a shade over everything in the tank, heaviest where no beam lands, lighter for each beam
      // (none / one / two / three or more: 0.8 / 0.5 / 0.15 / 0); no beam is also hatched, so it cannot pass for a
      // shadow; a bright line along each beam's edge
      'if (uBmN > 0 && uRoomMat < 0.5 && uNoMap < 0.5) { vec2 aqH = aqHits(); outgoingLight = mix(outgoingLight, vec3(0.04, 0.02, 0.1), aqH.x < 0.5 ? 0.8 : aqH.x < 1.5 ? 0.5 : aqH.x < 2.5 ? 0.15 : 0.0);\n' +
      '  if (aqH.x < 0.5) outgoingLight = mix(outgoingLight, vec3(0.75, 0.2, 0.3), 0.7 * step(0.8, fract((vAqP.x + vAqP.y + vAqP.z) / 18.0)));\n' +
      '  outgoingLight = mix(outgoingLight, vec3(1.0, 0.7, 0.0), aqH.y); }\n' +
      '#include <opaque_fragment>')
    .replace('#include <map_fragment>', AQ_MAP);
  // frosted film (build `bgMaterial`): with no scene lights, outgoingLight is only the light let through (transmission);
  // keep it aside, light the film's own white share like any surface, then add the transmitted light back unlit
  if (this.userData.frost) shader.fragmentShader = shader.fragmentShader
    .replace('vec3 aqLt = aqLight();', 'vec3 aqTr = outgoingLight; outgoingLight = diffuseColor.rgb * (1.0 - material.transmission);\nvec3 aqLt = aqLight();')
    .replace('#include <opaque_fragment>', 'outgoingLight += aqTr;\n#include <opaque_fragment>');
  // 3D fish body: the side projection smears where the surface turns away from the side (front of the head, back,
  // belly), so there the paint fades to a copy smeared lengthwise (fish3d `bledTexture`): colour fields and lengthwise
  // stripes stay, bars and spots dissolve instead of closing into hoops over the nape and throat (range: `uSide`);
  // and the same where the surface is seen edge-on (a thin body shows its far flank past the head, where both flanks'
  // bars would line up into a ring)
  if (this.userData.plain) {
    (shader.uniforms as Record<string, THREE.IUniform>).uPlain = { value: this.userData.plain };
    (shader.uniforms as Record<string, THREE.IUniform>).uSide = { value: this.userData.side ?? new THREE.Vector2(0.3, 0.75) };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSide; varying float vAqSide;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAqSide = aSide;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uPlain; uniform vec2 uSide; varying float vAqSide;')
      .replace('vec4 aqTex = texture2D(map, vMapUv);',
      'float aqG = abs(dot(normalize(vAqN), normalize(cameraPosition - vAqP)));\n' +
      'vec4 aqTex = mix(texture2D(uPlain, vMapUv), texture2D(map, vMapUv), smoothstep(uSide.x, uSide.y, vAqSide) * smoothstep(0.08, 0.3, aqG));');
  }
}
// one cache key per material kind keeps one compiled program per kind
const progKey = function (this: THREE.Material) { return 'aq' + (this.userData.card ? 'c' : '') + (this.userData.sub ? 's' : '') + (this.userData.room ? 'r' : '') + (this.userData.fish ? 'f' : '') + (this.userData.plain ? 'p' : '') + (this.userData.frost ? 'F' : '') + (this.userData.solid ? 'h' : '') + (this.userData.nomap ? 'n' : ''); };

/** Light every opaque surface inside the tank (substrate, background, fish, plant); glass, rim, lines and the fixture stay unlit. */
export function applyLighting(sc: THREE.Scene) {
  sc.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || o.userData.nolight) return;
    for (const m of ([] as THREE.Material[]).concat(mesh.material)) {
      if (!((m as THREE.MeshBasicMaterial).isMeshBasicMaterial || m.userData.frost) || (m.transparent && !m.userData.cached) || m.userData.aq) continue;
      if (o.userData.room) m.userData.room = true;
      if (o.userData.nomap) m.userData.nomap = true;
      if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
      m.userData.aq = true; m.userData.card = !!m.userData.cached && !m.userData.fish;
      m.onBeforeCompile = aqPatch; m.customProgramCacheKey = progKey; m.needsUpdate = true;
    }
  });
}

export function addFixture(sc: THREE.Scene, T: Tank, l: LightSettings, ceiling?: number) {
  if (l.type === 'flat') return;
  const { L, H, D } = T, y = H + (l.height ?? LAMP_Y);
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(...kelvinRGB(l.kelvin)).multiplyScalar(0.7).addScalar(0.35) });
  const dark = new THREE.MeshBasicMaterial({ color: 0x2a2e33 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, yy: number, z: number) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, yy, z); m.userData.nolight = true; sc.add(m); return m;
  };
  const E = emitters(T, l);
  // a raised fixture hangs from the ceiling on thin cables (two per bar, one per spot)
  if (ceiling != null && (l.height ?? LAMP_Y) > 110) {
    const top = l.type === 'spot' ? y + 45 : y + 23, len = Math.max(0, ceiling - top), wire = new THREE.MeshBasicMaterial({ color: 0x9aa0a6 });
    const at: [number, number][] = l.type === 'spot' ? E.map(e => [e[0], e[2]]) : [[L * 0.15, -D / 2], [L * 0.85, -D / 2]];
    for (const [x, z] of at) add(new THREE.CylinderGeometry(0.8, 0.8, len, 6), wire, x, top + len / 2, z);
  }
  if (l.type === 'spot') for (const e of E) {
    add(new THREE.CylinderGeometry(32, 40, 45, 24), dark, e[0], y + 22, e[2]);
    add(new THREE.CylinderGeometry(30, 30, 2, 24), glow, e[0], y - 1, e[2]);
  }
  if (l.type === 'tube') {
    add(new THREE.BoxGeometry(L * 0.98, 14, D * 0.9), dark, L / 2, y + 16, -D / 2);
    for (const e of E) { const t = add(new THREE.CylinderGeometry(9, 9, e[3] * 2, 12), glow, e[0], y, e[2]); t.rotation.z = Math.PI / 2; }
  }
  if (l.type === 'led') {
    add(new THREE.BoxGeometry(L * 0.96, 12, D * 0.45), dark, L / 2, y + 8, -D / 2);
    for (const e of E) add(new THREE.BoxGeometry(10, 2, 10), glow, e[0], y + 1, e[2]);
  }
}

/**
 * Beam overlay (Nathan 2026-10-13): where each fixture's light falls to half strength, drawn as a faint solid from the
 * fixture down to the tank floor. A spot's is a cone at its printed beam angle; a tube's (a line source) is a wedge
 * along it with rounded ends; an LED bar's many emitters are drawn as one such wedge per row (the outline of a row of
 * identical cones). The half-strength angle is the middle of the shader's cone ramp, so the overlay matches the light.
 * Fainter or stronger with the Brightness slider. Cut off at the glass like hardscape; the substrate hides the part below it, leaving the footprint on the ground.
 */
/** The overlay's beams: half-strength half-angle, fixture height and one [x centre, z, half-length] per beam (an LED bar: one per row). */
function beamSegs(T: Tank, l: LightSettings, lid: string) {
  const { cone } = beam(l), half = Math.acos((cone[0] + cone[1]) / 2), top = T.H + lampHeight(l, lid);
  const segs: [number, number, number][] = [];
  const E = emitters(T, l, lampHeight(l, lid));
  if (l.type === 'led') {
    const rows = new Map<number, number[]>();
    for (const e of E) rows.set(e[2], [...(rows.get(e[2]) ?? []), e[0]]);
    for (const [z, xs] of rows) { const a = Math.min(...xs), b = Math.max(...xs); segs.push([(a + b) / 2, z, (b - a) / 2]); }
  } else for (const e of E) segs.push([e[0], e[2], e[3]]);
  return { half, top, segs };
}

export function addBeams(sc: THREE.Scene, T: Tank, l: LightSettings, lid: string) {
  if (l.type === 'flat') return;
  const { half, top, segs } = beamSegs(T, l, lid);
  const bowl = shapeOf(T) === 'bowl', planes: THREE.Plane[] = [];
  if (!bowl) for (const e of footprint(T).edges) planes.push(new THREE.Plane(new THREE.Vector3(-e.n[0], 0, e.n[1]), e.a[0] * e.n[0] + e.a[1] * e.n[1]));
  // a working view, not a look (Nathan 2026-10-13): bold, and the union of the beams drawn once (stencil), so where
  // beams cross on screen it does not darken; how many beams reach a spot shows on the surfaces (the hit map)
  const look = {
    color: 0xffe066, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  } as const;
  // above the rim the beam is drawn whole (light that misses the tank shows); inside, it stops at the glass
  // (inside, faint: the hit map on the surfaces below carries the reading there)
  const open = new THREE.MeshBasicMaterial(look), mat = new THREE.MeshBasicMaterial({ ...look, opacity: 0.1, clippingPlanes: planes });
  if (bowl) { // a bowl: inside the sphere
    const b = bowlDims(T), v = (x: number) => x.toFixed(1);
    mat.onBeforeCompile = sh => {
      sh.vertexShader = 'varying vec3 vBeamW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vBeamW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vBeamW;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
  if (distance(vBeamW, vec3(${v(T.L / 2)}, ${v(b.c)}, ${v(-T.D / 2)})) > ${v(b.R)}) discard;`);
    };
    mat.customProgramCacheKey = () => `beam-bowl-${v(T.L)}-${v(b.c)}`;
  }
  // a stadium (half-length h, radius r) round the line under the emitter: one ring at the fixture (r = 0), one at the floor
  const K = 24, ring = (cx: number, z: number, h: number, r: number, y: number) => {
    const p: number[] = [];
    for (const s of [1, -1]) for (let i = 0; i <= K; i++) {
      const a = (s > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI * i / K; // +h end: -90..90°, -h end: 90..270°
      p.push(cx + s * h + r * Math.cos(a), y, z + r * Math.sin(a));
    }
    return p;
  };
  const tan = Math.tan(half), n = 2 * (K + 1);
  for (const [cx, z, h] of segs) for (const [y0, y1, m] of [[top, T.H, open], [T.H, 0, mat]] as const) {
    const pos = [...ring(cx, z, h, (top - y0) * tan, y0), ...ring(cx, z, h, (top - y1) * tan, y1)], idx: number[] = [];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, j, n + i, j, n + j, n + i); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const o = new THREE.Mesh(g, m); o.userData.nolight = true; o.renderOrder = 5; sc.add(o);
  }
  // outline: the beam's edge where it crosses the rim, and its sides from the fixture down to there (four per beam);
  // inside the tank the hit map draws the edges on the surfaces themselves
  const line = new THREE.LineBasicMaterial({ color: 0xffb000, transparent: true, opacity: 0.9, depthWrite: false }), lp: number[] = [];
  for (const [cx, z, h] of segs) {
    const R = (top - T.H) * tan, rim = ring(cx, z, h, R, T.H);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; lp.push(rim[3 * i], rim[3 * i + 1], rim[3 * i + 2], rim[3 * j], rim[3 * j + 1], rim[3 * j + 2]); }
    for (const [dx, dz] of [[h + R, 0], [-h - R, 0], [h, R], [-h, -R]]) lp.push(cx + Math.sign(dx) * h, top, z, cx + dx, T.H, z + dz);
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lo = new THREE.LineSegments(lg, line); lo.userData.nolight = true; lo.renderOrder = 6; sc.add(lo);
}
