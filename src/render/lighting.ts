// A cheap top-down light model injected into unlit MeshBasicMaterials (three.js lights leave edge-on cards black).
// Each fixture is a set of emitters above the water (points for spots/LEDs, line segments for tubes).
// Brightness at a point = room light + sum(beam cone x distance falloff x surface facing), normalised so every
// fixture type gives the same mean at mid-height; only the distribution differs. Fish/plant cards ignore facing
// (they would be edge-on to a light straight above and turn black), so they just take the light level there.
import * as THREE from 'three';
import { D2R, clamp } from '../scene/physics';
import type { LightSettings, LightType, Tank } from '../scene/types';

export const AQ_MAX = 48, LAMP_Y = 50, REF = 320;
export const CONES: Record<Exclude<LightType, 'flat'>, [number, number]> = {
  spot: [Math.cos(18 * D2R), Math.cos(34 * D2R)], tube: [0.45, -0.15], led: [Math.cos(45 * D2R), Math.cos(75 * D2R)],
};
/** [x, y, z, halfLength]: halfLength > 0 means a line emitter along x. */
export type Emitter = [number, number, number, number];

export function emitters(T: Tank, l: LightSettings): Emitter[] {
  const { L, H, D } = T, y = H + LAMP_Y, n = l.count, E: Emitter[] = [];
  if (l.type === 'spot') for (let i = 0; i < n; i++) E.push([L * (i + 0.5) / n, y, -D / 2, 0]);
  if (l.type === 'tube') for (let i = 0; i < n; i++) E.push([L / 2, y, -D * (i + 0.5) / n, L * 0.45]);
  if (l.type === 'led') {
    const cols = clamp(Math.round(L * 0.9 / 45), 2, 24);
    for (const r of [0.38, 0.62]) for (let c = 0; c < cols; c++) E.push([L * (0.05 + 0.9 * (c + 0.5) / cols), y, -D * r, 0]);
  }
  return E.slice(0, AQ_MAX);
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
};
export function setLightUniforms(T: Tank, l: LightSettings) {
  const on = l.type !== 'flat'; LU.uMode.value = on ? 1 : 0; if (!on) return;
  const E = emitters(T, l), cone = CONES[l.type as Exclude<LightType, 'flat'>];
  E.forEach((e, i) => LU.uEm.value[i].set(...e)); LU.uEmN.value = E.length;
  let avg = 0, k = 0; // sample a mid-height plane across the tank
  for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) { avg += lightSum(E, [T.L * i / 6, T.H * 0.5, -T.D * j / 6], cone); k++; }
  LU.uNorm.value = k / Math.max(avg, 1e-6); [LU.uConeIn.value, LU.uConeOut.value] = cone;
  LU.uAmb.value = l.room; LU.uBright.value = l.bright; LU.uLCol.value.setRGB(...kelvinRGB(l.kelvin));
}

const AQ_VERT = 'varying vec3 vAqP; varying vec3 vAqN;';
const AQ_FRAG = `
uniform vec4 uEm[${AQ_MAX}]; uniform int uEmN; uniform float uMode, uAmb, uBright, uNorm, uConeIn, uConeOut, uRef, uCard, uSub; uniform vec3 uLCol;
varying vec3 vAqP; varying vec3 vAqN;
float aqHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float aqNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(aqHash(i), aqHash(i + vec2(1, 0)), f.x), mix(aqHash(i + vec2(0, 1)), aqHash(i + vec2(1, 1)), f.x), f.y);
}
vec3 aqLight() {
  if (uMode < 0.5) return vec3(1.0);
  float sum = 0.0; vec3 n = normalize(vAqN);
  for (int i = 0; i < ${AQ_MAX}; i++) {
    if (i >= uEmN) break;
    vec4 e = uEm[i];
    vec3 q = e.w > 0.0 ? vec3(clamp(vAqP.x, e.x - e.w, e.x + e.w), e.y, e.z) : e.xyz;
    vec3 tl = q - vAqP; float d = length(tl); vec3 ld = tl / max(d, 1.0);
    float cone = smoothstep(uConeOut, uConeIn, ld.y), r = d / uRef;
    float fall = e.w > 0.0 ? 1.0 / (1.0 + r) : 1.0 / (1.0 + r * r);
    float facing = uCard > 0.5 ? 1.0 : 0.3 + 0.9 * abs(dot(n, ld));
    sum += cone * fall * facing;
  }
  return vec3(uAmb) + uLCol * (uBright * uNorm * sum);
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
  Object.assign(shader.uniforms, LU, { uCard: { value: this.userData.card ? 1 : 0 }, uSub: { value: this.userData.sub ? 1 : 0 } });
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + AQ_VERT)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAqP = (modelMatrix * vec4(transformed, 1.0)).xyz; vAqN = normalize(mat3(modelMatrix) * normal);');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + AQ_FRAG)
    .replace('#include <opaque_fragment>', 'outgoingLight *= aqLight();\n' +
      'if (uCard > 0.5) { float aqL = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)); outgoingLight = max(mix(vec3(aqL), outgoingLight, 1.35), 0.0); }\n' +
      'float aqM = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b); if (aqM > 1.0) outgoingLight /= aqM;\n#include <opaque_fragment>')
    .replace('#include <map_fragment>', AQ_MAP);
}
// one cache key per material kind keeps one compiled program per kind
const progKey = function (this: THREE.Material) { return 'aq' + (this.userData.card ? 'c' : '') + (this.userData.sub ? 's' : ''); };

/** Light every opaque surface inside the tank (substrate, background, fish, plant); glass, rim, lines and the fixture stay unlit. */
export function applyLighting(sc: THREE.Scene) {
  sc.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || o.userData.nolight) return;
    for (const m of ([] as THREE.Material[]).concat(mesh.material)) {
      if (!(m as THREE.MeshBasicMaterial).isMeshBasicMaterial || (m.transparent && !m.userData.cached) || m.userData.aq) continue;
      if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
      m.userData.aq = true; m.userData.card = !!m.userData.cached;
      m.onBeforeCompile = aqPatch; m.customProgramCacheKey = progKey; m.needsUpdate = true;
    }
  });
}

export function addFixture(sc: THREE.Scene, T: Tank, l: LightSettings) {
  if (l.type === 'flat') return;
  const { L, H, D } = T, y = H + LAMP_Y;
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(...kelvinRGB(l.kelvin)).multiplyScalar(0.7).addScalar(0.35) });
  const dark = new THREE.MeshBasicMaterial({ color: 0x2a2e33 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, yy: number, z: number) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, yy, z); m.userData.nolight = true; sc.add(m); return m;
  };
  const E = emitters(T, l);
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
