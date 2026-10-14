// A cheap top-down light model injected into unlit MeshBasicMaterials (three.js lights leave edge-on cards black).
// Each fixture is a set of emitters above the water (points for spots/LEDs, line segments for tubes).
// Brightness at a point = room light + sum(beam cone x distance falloff x surface facing), normalised so every
// fixture type gives the same mean at mid-height; only the distribution differs. Fish/plant cards ignore facing
// (they would be edge-on to a light straight above and turn black), so they just take the light level there.
// Room surfaces (wall, floor, stand, hood, person) are lit by the room light, plus light spilling out of the tank:
// with the room light off, the tank is the only light in the room (Nathan, 2026-10-08).
import * as THREE from 'three';
import { clamp } from '../scene/physics';
import type { LightSettings, Tank, WaterSettings } from '../scene/types';
import { waterK, waterY } from '../scene/physics';
import { bowlDims, footprint, shapeOf } from '../scene/shape';

import { AQ_MAX, LAMP_Y, LUXW, beamExp, emitters, lampHeight, lightEnv, lightOutCached, renderBright, type Emitter, type LightEnv, type LightScene } from '../scene/lightout';
// the fixture geometry lives with the light-output model now (lane K); re-exported so importers stay as they were
export { AQ_MAX, LAMP_Y, emitters, fitSpots, lampHeight, type Emitter } from '../scene/lightout';

export const REF = 320;

/** JS twin of the shader loop (card mode: no facing term); used for normalisation. */
export function lightSum(E: Emitter[], p: [number, number, number], m: number) {
  let sum = 0;
  for (const e of E) {
    const qx = e[3] > 0 ? clamp(p[0], e[0] - e[3], e[0] + e[3]) : e[0], dx = qx - p[0], dy = e[1] - p[1], dz = e[2] - p[2];
    const d = Math.hypot(dx, dy, dz), ly = dy / Math.max(d, 1);
    const c = ly > 0 ? ly ** m : 0, r = d / REF;
    sum += c * (e[3] > 0 ? 1 / (1 + r) : 1 / (1 + r * r));
  }
  return sum;
}

/**
 * Lane K2: the scene's beam is the model's cos^m (scene/lightout beamExp: half strength at the printed beam angle; LED
 * bar and tube m = 1), fading smoothly past the beam angle. A narrower spot puts the same output on a smaller area:
 * per unit of solid angle it is (m + 1) / (m52 + 1) x the standard 52° spot (pointNorm), the scene's normalisation.
 */
export const beamGain = (l: LightSettings) => l.type === 'spot' ? (beamExp(l) + 1) / (beamExp({ type: 'spot', cone: 52 }) + 1) : 1;

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
  uAmb: { value: 0.25 }, uBright: { value: 1 }, uNorm: { value: 1 }, uBeamM: { value: 1 },
  uRef: { value: REF }, uLCol: { value: new THREE.Color(1, 1, 1) },
  uRoomK: { value: 1 }, uSpill: { value: new THREE.Color(1, 1, 1) }, uSpillR: { value: 500 },
  uTankMin: { value: new THREE.Vector3() }, uTankMax: { value: new THREE.Vector3() }, uTankRound: { value: 0 },
  uWater: { value: new THREE.Vector4() }, uWCol: { value: new THREE.Color() }, uPop: { value: 0 },
  // light map (beam overlay): on, weight per emitter, the beam's concentration (see aqIrr)
  uMapOn: { value: 0 }, uMapW: { value: 1 }, uMapGain: { value: 1 },
  // light output (lane K; watts set): the map in real units, a port of scene/lightout.ts bandsAt. uLoA: phi x 1e6 /
  // norm (per emitter), water surface y, losses x the PAR-override scale, wall-image weight (0 = no images);
  // uLoM: beam exponent (cos^m); uLoInd: bounced light per band (x the override scale); uLoWall: tank L, D; uLoK: absorption per mm per band; uLoSplit: photon share per band; uLoOut: per-band weight of
  // what is shown (PAR 1,1,1; lux LUXW); uMapDiv: the level at the bottom of the ramp (relative 1/16, PAR 2.5, lux 125)
  uLoOn: { value: 0 }, uLoA: { value: new THREE.Vector4() }, uLoWall: { value: new THREE.Vector2() },
  uLoK: { value: new THREE.Vector3() }, uLoSplit: { value: new THREE.Vector3() }, uLoOut: { value: new THREE.Vector3(1, 1, 1) },
  uMapDiv: { value: 1 / 16 }, uLoM: { value: 1 }, uLoInd: { value: new THREE.Vector3() },
};
/** The Light map ramp's bottom (navy) per unit: a colour step per doubling, yellow (4 steps up) on the "medium" band. */
export const MAP_DIV = { rel: 1 / 16, par: 2.5, lux: 125 } as const;
/** Water box (L, surface y, D) and tint per mm, and how far fish stand out (render.pop); set per viewport like the light. */
export function setWaterUniforms(T: Tank, w: WaterSettings, pop = 0) {
  LU.uPop.value = pop;
  LU.uWater.value.set(T.L, waterY(T, w.level), T.D, w.on ? waterK(w.opacity) : 0);
  LU.uWCol.value.set(w.color);
}
/**
 * The empty water's own colour (audit #18): drawn on the far faces of the water volume, as much of the water colour as
 * the sightline crosses (same slab test and `waterK` as the tint on objects). It draws only where nothing is behind it
 * (fragment depth pinned to the far plane, depth test "less"), so a fish, the background or the room wall, which are
 * tinted by their own shader, are not tinted twice; what it colours is the empty page seen through the water.
 */
export function waterVolumeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uWater: LU.uWater, uWCol: LU.uWCol, uPopV: LU.uPop },
    vertexShader: 'varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec4 uWater; uniform vec3 uWCol; varying vec3 vP;
void main() {
  vec3 o = cameraPosition, dv = vP - o;
  dv = mix(dv, vec3(1e-3), step(abs(dv), vec3(1e-3)));
  vec3 t0 = (vec3(0.0, 0.0, -uWater.z) - o) / dv, t1 = (vec3(uWater.x, uWater.y, 0.0) - o) / dv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), max(tn.z, 0.0)), b = min(min(tf.x, tf.y), min(tf.z, 1.0));
  float f = 1.0 - exp(-uWater.w * max(b - a, 0.0) * length(vP - o));
  gl_FragColor = vec4(uWCol * 0.85, f);
  gl_FragDepth = 0.9999999;
}`,
    transparent: true, depthWrite: false, depthFunc: THREE.LessDepth, side: THREE.BackSide,
  });
}

/** `S` (the setup; lane K): with watts set, the brightness follows the computed lux and `l.bright` is the exposure. */
export function setLightUniforms(T: Tank, l: LightSettings, lid = 'open', beams = false, S?: LightScene) {
  const on = l.type !== 'flat'; LU.uMode.value = on ? 1 : 0;
  const lo = on && S ? lightOutCached({ ...S, tank: T }) : null, bright = lo ? renderBright(lo, l.bright) : l.bright;
  // light map: a spot bulb or a tube counts as one light; an LED bar's emitters share the output of four bulbs
  LU.uMapOn.value = on && beams ? 1 : 0;
  if (on) { LU.uMapGain.value = beamGain(l); LU.uMapW.value = l.type === 'led' ? 4 / Math.max(emitters(T, l).length, 1) : 1; }
  const hgt = lampHeight(l, lid), up = on ? hgt : 0;
  LU.uRoomK.value = roomLevel(l.room); LU.uSpillR.value = spillReach(T) + up * 0.5;
  // spill leaves the tank box, extended up to the fixture: a raised light also lights the room over the rim
  LU.uTankMin.value.set(0, 0, -T.D); LU.uTankMax.value.set(T.L, T.H + up, 0);
  // round, polygon and bowl tanks spill from an ellipse inscribed in that box, not the box itself (no square pool of light)
  LU.uTankRound.value = ['round', 'poly', 'bowl'].includes(shapeOf(T)) ? 1 : 0;
  // the spill shows most in a dark room (in a lit room the eye adapts and it barely registers); a raised fixture
  // throws more of its light past the tank (up to ~1.8x at 450 mm and above)
  const spill = 0.9 * (1 - 0.75 * roomLevel(l.room)) * (1 + 0.8 * clamp((up - LAMP_Y) / 400, 0, 1));
  if (on) LU.uSpill.value.setRGB(...kelvinRGB(l.kelvin)).multiplyScalar(spill * bright); else LU.uSpill.value.setRGB(spill, spill, spill);
  if (!on) return;
  const E = emitters(T, l, hgt), m = beamExp(l), gain = beamGain(l), ref: LightSettings = { ...l, spacing: 0, cone: 52 };
  E.forEach((e, i) => LU.uEm.value[i].set(...e)); LU.uEmN.value = E.length;
  // normalised with the fixture at the standard height, auto spacing and standard beam (sample a mid-height plane
  // across the tank), so raising it dims the tank (distance falloff) and evens it out (wider footprint), spreading
  // the bulbs past the glass loses light outside, and a narrower beam concentrates the same output (gain)
  const R = emitters(T, ref, LAMP_Y), rm = beamExp(ref); let avg = 0, k = 0;
  for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) { avg += lightSum(R, [T.L * i / 6, T.H * 0.5, -T.D * j / 6], rm); k++; }
  LU.uNorm.value = gain * k / Math.max(avg, 1e-6); LU.uBeamM.value = m;
  LU.uAmb.value = l.room; LU.uBright.value = bright; LU.uLCol.value.setRGB(...kelvinRGB(l.kelvin));
  const env = lo ? lightEnv({ ...S!, tank: T }) : null;
  LU.uLoOn.value = env ? 1 : 0; LU.uMapDiv.value = env ? MAP_DIV[l.mapUnit ?? 'par'] : MAP_DIV.rel;
  if (env) setLoUniforms(env, lo!.scale, l.mapUnit ?? 'par');
}
function setLoUniforms(env: LightEnv, scale: number, unit: 'par' | 'lux') {
  LU.uLoA.value.set(env.phi * 1e6 / env.norm, Number.isFinite(env.ys) ? env.ys : -1e6, env.trans * scale, env.walls ? env.walls.w : 0);
  LU.uLoWall.value.set(env.walls?.L ?? 0, env.walls?.D ?? 0);
  LU.uLoK.value.set(...env.k); LU.uLoSplit.value.set(...env.split); const o = unit === 'lux' ? LUXW : [1, 1, 1]; LU.uLoOut.value.set(o[0], o[1], o[2]);
  LU.uLoM.value = env.m; LU.uLoInd.value.set(...env.ind).multiplyScalar(scale);
  env.E.forEach((e, i) => LU.uEm.value[i].set(...e)); LU.uEmN.value = env.E.length;
}

const AQ_VERT = 'varying vec3 vAqP; varying vec3 vAqN;';
const AQ_FRAG = `
uniform vec4 uEm[${AQ_MAX}]; uniform int uEmN; uniform float uMode, uAmb, uBright, uNorm, uBeamM, uRef, uCard, uSub, uFish; uniform vec3 uLCol;
float aqSpec = 0.0;
uniform float uRoomMat, uRoomK, uSpillR, uTankRound; uniform vec3 uSpill, uTankMin, uTankMax; uniform vec4 uWater; uniform vec3 uWCol; uniform float uPop, uFishCard;
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
    float cone = pow(max(ld.y, 0.0), uBeamM), r = d / uRef;
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
// light map (beam overlay on; Nathan 2026-10-13): how much light lands on each point of the substrate, physically:
// per light, its beam profile at this angle off its axis, x cos of the angle it strikes the surface at, x inverse
// square of the distance (a tube, a line source: inverse distance), summed over the lights. Relative to one standard
// spot bulb (52°) 300 mm straight above a level surface = 1 (times Brightness), shown on a log scale, a colour step per
// doubling: 1/16 navy (dimmed below), 1/8 blue, 1/4 cyan, 1/2 green, 1 yellow, 2 orange, 4 red, 8 white.
uniform float uMapOn, uMapW, uMapGain, uLoOn, uMapDiv, uLoM; uniform vec4 uLoA; uniform vec2 uLoWall; uniform vec3 uLoK, uLoSplit, uLoOut, uLoInd;
// one emitter (or a wall image of it, weight w) at p: a port of scene/lightout.ts addSrc, PAR or lux by uLoOut
float aqSrc(vec3 p, vec3 n, vec3 ep, float h, float w) {
  float ys = uLoA.y, wd = p.y < ys ? ys - p.y : 0.0;
  float dy = wd > 0.0 ? ep.y - ys + wd / 1.33 : ep.y - p.y;
  if (dy <= 0.0) return 0.0;
  float e0, sinA;
  if (h > 0.0) {
    float dz = ep.z - p.z, r = max(length(vec2(dy, dz)), 1.0), xr = p.x - ep.x;
    float f = 0.5 * ((h - xr) / length(vec2(r, h - xr)) + (h + xr) / length(vec2(r, h + xr)));
    e0 = uLoA.x / (2.0 * h) * pow(dy / r, uLoM) * max((n.y * dy + n.z * dz) / r, 0.0) * f / r;
    sinA = abs(dz) / r;
  } else {
    vec3 dv = vec3(ep.x - p.x, dy, ep.z - p.z); float d = max(length(dv), 1.0);
    e0 = uLoA.x * pow(dy / d, uLoM) * max(dot(n, dv) / d, 0.0) / (d * d);
    sinA = length(dv.xz) / d;
  }
  e0 *= w * uLoA.z;
  vec3 a = vec3(1.0);
  if (wd > 0.0) { float s = sinA / 1.33; a = 0.97 * exp(-uLoK * (wd / sqrt(1.0 - s * s))); }
  return e0 * dot(uLoSplit * uLoOut, a);
}
// light output at this point (µmol/m²/s or lux): the emitters plus, under water in a rectangular tank, one mirror
// image of each across each side wall, counted where its ray meets the glass below the surface (lightout bandsAt)
float aqIrrAbs(vec3 p, vec3 n) {
  float sum = 0.0, ys = uLoA.y, pv = ys - (ys - p.y) / 1.33, L = uLoWall.x, D = uLoWall.y;
  for (int i = 0; i < ${AQ_MAX}; i++) {
    if (i >= uEmN) break;
    vec4 e = uEm[i];
    sum += aqSrc(p, n, e.xyz, e.w, 1.0);
    if (uLoA.w <= 0.0 || p.y >= ys || e.x < 0.0 || e.x > L || e.z > 0.0 || e.z < -D) continue;
    for (int k = 0; k < 4; k++) {
      vec3 im = k == 0 ? vec3(-e.x, e.y, e.z) : k == 1 ? vec3(2.0 * L - e.x, e.y, e.z) : k == 2 ? vec3(e.x, e.y, -e.z) : vec3(e.x, e.y, -2.0 * D - e.z);
      float c = k == 0 ? 0.0 : k == 1 ? L : k == 2 ? 0.0 : -D;
      float pa = k < 2 ? p.x : p.z, qa = k < 2 ? (e.w > 0.0 ? clamp(p.x, im.x - e.w, im.x + e.w) : im.x) : im.z;
      if (abs(pa - qa) < 1e-6) continue;
      float t = (pa - c) / (pa - qa), g = smoothstep(0.0, 20.0, (ys - (pv + t * (e.y - pv))) * 1.33);
      if (g > 0.0) sum += aqSrc(p, n, im, e.w, uLoA.w * g);
    }
  }
  // bounced light (lightout bounce): under water, or everywhere in a dry tank
  if (p.y < ys || ys < -1e5) sum += dot(uLoInd, uLoOut);
  return sum;
}
float aqIrr() {
  if (uLoOn > 0.5) return aqIrrAbs(vAqP, normalize(vAqN));
  float sum = 0.0; vec3 n = normalize(vAqN);
  for (int i = 0; i < ${AQ_MAX}; i++) {
    if (i >= uEmN) break;
    vec4 e = uEm[i];
    vec3 q = e.w > 0.0 ? vec3(clamp(vAqP.x, e.x - e.w, e.x + e.w), e.y, e.z) : e.xyz;
    vec3 tl = q - vAqP; float d = max(length(tl), 1.0); vec3 ld = tl / d;
    float prof = pow(max(ld.y, 0.0), uBeamM), inc = max(dot(n, ld), 0.0);
    sum += prof * inc * (e.w > 0.0 ? 300.0 / d : 90000.0 / (d * d));
  }
  return sum * uMapW * uMapGain * uBright;
}
vec3 aqRamp(float t) {  // t = log2(level) + 4, 0..7 -> navy, blue, cyan, green, yellow, orange, red, white
  vec3 c[8] = vec3[8](vec3(0.05, 0.05, 0.25), vec3(0.1, 0.25, 0.85), vec3(0.0, 0.7, 0.9), vec3(0.15, 0.8, 0.25),
    vec3(0.95, 0.9, 0.1), vec3(1.0, 0.55, 0.05), vec3(0.9, 0.1, 0.1), vec3(1.0, 0.9, 0.9));
  t = clamp(t, 0.0, 7.0); int k = int(min(floor(t), 6.0));
  return mix(c[k], c[k + 1], t - float(k));
}`;
// substrate anti-tiling: two copies of the texture (rotated + rescaled) blended by low-frequency noise, plus soft light/dark patches
const AQ_MAP = `#ifdef USE_MAP
  vec4 aqTex = texture2D(map, vMapUv);
  if (uSub > 0.5) {
    vec2 uv2 = mat2(0.8, -0.6, 0.6, 0.8) * vMapUv * 0.77 + vec2(0.31, 0.57);
    aqTex = mix(aqTex, texture2D(map, uv2), smoothstep(0.3, 0.7, aqNoise(vMapUv * 0.45)));
    aqTex.rgb *= 0.82 + 0.36 * aqNoise(vMapUv * 0.9 + 7.0);
  }
  // fish stand out (render.pop): a dark ring just outside the painted outline of a fish card (fins, flat fish), up to
  // 2.5 px wide on screen (at least 1 px), so its edge reads against sand or leaves. Drawn where the alpha drops off, not
  // only where it reaches zero, so soft, feathered fin edges get it too. The same width as the body's line (fish3d
  // outlineMat); an opaque fin's line is as dark as the body's, a see-through fin's fainter (Nathan 2026-10-13)
  if (uFishCard > 0.5 && uPop > 0.01) {
    vec2 aqD = fwidth(vMapUv) * max(2.5 * uPop, 1.0); float aqA = 0.0;
    for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398; aqA = max(aqA, texture2D(map, vMapUv + aqD * vec2(cos(a), sin(a))).a); }
    float aqO = smoothstep(0.1, 0.35, aqA - aqTex.a);
    aqTex = vec4(mix(aqTex.rgb, vec3(0.05, 0.04, 0.035), aqO), max(aqTex.a, aqO * mix(0.5, 1.0, smoothstep(0.7, 0.95, aqA))));
  }
  diffuseColor *= aqTex;
#endif`;

function aqPatch(this: THREE.Material, shader: THREE.WebGLProgramParametersWithUniforms) {
  this.userData.pre?.(shader); // the material's own patch (hardscape: glass clip and grit) still applies under the lighting
  Object.assign(shader.uniforms, LU, { uCard: { value: this.userData.card ? 1 : 0 }, uSub: { value: this.userData.sub ? 1 : 0 }, uFish: { value: this.userData.fish ? 1 : 0 }, uRoomMat: { value: this.userData.room ? 1 : 0 }, uFishCard: { value: this.userData.fishCard ? 1 : 0 } });
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + AQ_VERT)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAqP = (modelMatrix * vec4(transformed, 1.0)).xyz; vAqN = normalize(mat3(modelMatrix) * normal);');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + AQ_FRAG)
    .replace('#include <opaque_fragment>', 'vec3 aqLt = aqLight(); outgoingLight *= aqLt;\n' +
      'if (uCard > 0.5) { float aqL = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)); outgoingLight = max(mix(vec3(aqL), outgoingLight, 1.35 + 0.35 * uPop * uFishCard), 0.0) * (1.0 + 0.2 * uPop * uFishCard); }\n' +
      'float aqM = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b);\n' +
      // 3D fish body: the card's saturation, then a shoulder instead of the hard clamp (which flattens the form shading
      // wherever the light is strong): values up to 0.6 are untouched, so the body matches its card, and only
      // highlights roll off toward 1; then the highlight and a faint silvery sheen toward the edges on top
      'if (uFish > 0.5) {\n' +
      '  float aqS = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)); outgoingLight = max(mix(vec3(aqS), outgoingLight, 1.35 + 0.35 * uPop), 0.0) * (1.0 + 0.2 * uPop);\n' +
      '  aqM = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b);\n' +
      '  if (aqM > 0.6) outgoingLight *= (0.6 + 0.4 * (1.0 - exp(-(aqM - 0.6) / 0.4))) / aqM;\n' +
      '  vec3 aqV = normalize(cameraPosition - vAqP); float aqRim = pow(1.0 - abs(dot(normalize(vAqN), aqV)), 3.0);\n' +
      '  outgoingLight += uLCol * (uBright * uNorm * aqSpec * 0.16) + vec3(0.03, 0.04, 0.045) * aqRim * min(dot(aqLt, vec3(0.333)), 1.5);\n' +
      // fish stand out (render.pop): the outline darkens where the body turns edge-on, so it reads against sand or leaves
      '  outgoingLight *= 1.0 - 0.55 * uPop * smoothstep(0.55, 0.95, 1.0 - abs(dot(normalize(vAqN), aqV)));\n' +
      '  outgoingLight = min(outgoingLight, vec3(1.0));\n' +
      '} else if (aqM > 1.0) outgoingLight /= aqM;\n' +
      // water colour: blend toward the lit water colour by how much water the sightline crosses
      'if (uWater.w > 0.0) { float aqF = (1.0 - exp(-uWater.w * aqWaterPath())) * (1.0 - 0.6 * uPop * max(uFish, uFishCard)); outgoingLight = mix(outgoingLight, uWCol * min(dot(aqLt, vec3(0.2126, 0.7152, 0.0722)), 1.0), aqF); }\n' +
      // light map on the substrate (beam overlay on): false colour by level, a faint line at each doubling, the
      // grain kept faintly so the relief still reads; replaces the lit colour and the water haze
      'if (uMapOn > 0.5 && uSub > 0.5) { float aqT = log2(max(aqIrr(), 1e-6) / uMapDiv), aqW = fwidth(aqT);\n' +
      '  float aqG = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));\n' +
      '  outgoingLight = aqRamp(aqT) * (0.75 + 0.45 * aqG) * (aqT < 0.0 ? 0.35 : 1.0);\n' +
      '  outgoingLight *= 1.0 - 0.35 * (1.0 - smoothstep(0.5 * aqW, 1.5 * aqW, abs(fract(aqT + 0.5) - 0.5))) * step(0.0, aqT); }\n' +
      '#include <opaque_fragment>')
    .replace('#include <map_fragment>', AQ_MAP);
  this.userData.post?.(shader); // the material's patch of the lit shader (custom substrate: its grains blended by a mask)
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
const progKey = function (this: THREE.Material) { return 'aq' + (this.userData.card ? 'c' : '') + (this.userData.sub ? 's' : '') + (this.userData.room ? 'r' : '') + (this.userData.fish ? 'f' : '') + (this.userData.plain ? 'p' : '') + (this.userData.frost ? 'F' : '') + (this.userData.solid ? 'h' : '') + (this.userData.post ? 'b' : '') + (this.userData.fishCard ? 'k' : '') + (this.userData.plantClip ? 'g' : ''); };

/** Light every opaque surface inside the tank (substrate, background, fish, plant); glass, rim, lines and the fixture stay unlit. */
export function applyLighting(sc: THREE.Scene) {
  sc.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || o.userData.nolight) return;
    for (const m of ([] as THREE.Material[]).concat(mesh.material)) {
      if (!((m as THREE.MeshBasicMaterial).isMeshBasicMaterial || m.userData.frost) || (m.transparent && !m.userData.cached) || m.userData.aq) continue;
      if (o.userData.room) m.userData.room = true;
      if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
      m.userData.aq = true; m.userData.card = !!m.userData.cached && !m.userData.fish;
      m.onBeforeCompile = aqPatch; m.customProgramCacheKey = progKey; m.needsUpdate = true;
    }
  });
}

/** The lit face of a fixture at colour temperature `kelvin`. */
export const glowColor = (kelvin: number) => new THREE.Color(...kelvinRGB(kelvin)).multiplyScalar(0.7).addScalar(0.35);

export function addFixture(sc: THREE.Scene, T: Tank, l: LightSettings, ceiling?: number) {
  if (l.type === 'flat') return;
  const { L, H, D } = T, y = H + (l.height ?? LAMP_Y);
  const glow = new THREE.MeshBasicMaterial({ color: glowColor(l.kelvin) }); glow.userData.glow = true; // recoloured in place (viewer)
  const dark = new THREE.MeshBasicMaterial({ color: 0x2a2e33 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, yy: number, z: number) => {
    // `overhead`: hidden while the eye is above the fixture (viewer), where it would only cover the tank (audit #20)
    const m = new THREE.Mesh(geo, mat); m.position.set(x, yy, z); m.userData.nolight = true; m.userData.overhead = y; sc.add(m); return m;
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
  const half = Math.acos(0.5 ** (1 / beamExp(l))), top = T.H + lampHeight(l, lid);
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
  // beams cross on screen it does not darken; how much light reaches the substrate shows on it (the light map, aqIrr)
  const look = {
    color: 0xffe066, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  } as const;
  // above the rim the beam is drawn whole (light that misses the tank shows); inside, it stops at the glass
  // (inside, faint: the light map on the substrate carries the reading there)
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
    if (m === open) o.userData.overhead = top; // above the rim: hidden from above the fixture, where it floods the view (audit #20)
  }
}

/**
 * Dev check (lane K: the shader must agree with scene/lightout.ts within 2%): the Light map's aqIrr at world points
 * `pts` with normals `ns`, read back from the GPU with the current LU uniforms (set by the last rendered viewport).
 */
export function irrReadback(r: THREE.WebGLRenderer, pts: number[][], ns: number[][]): number[] {
  const n = pts.length, rt = new THREE.WebGLRenderTarget(n, 1, { type: THREE.FloatType });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((_, i) => [-1 + (2 * i + 1) / n, 0, 0]), 3));
  g.setAttribute('aP', new THREE.Float32BufferAttribute(pts.flat(), 3)); g.setAttribute('aN', new THREE.Float32BufferAttribute(ns.flat(), 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { ...LU, uCard: { value: 0 }, uSub: { value: 1 }, uFish: { value: 0 }, uRoomMat: { value: 0 }, uFishCard: { value: 0 } },
    vertexShader: AQ_VERT + '\nattribute vec3 aP; attribute vec3 aN;\nvoid main() { vAqP = aP; vAqN = aN; gl_PointSize = 1.0; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: AQ_FRAG + '\nvoid main() { gl_FragColor = vec4(aqIrr(), 0.0, 0.0, 1.0); }',
  });
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera();
  sc.add(new THREE.Points(g, m));
  const prev = r.getRenderTarget(); r.setRenderTarget(rt); r.setClearColor(0, 0); r.clear(); r.render(sc, cam);
  const px = new Float32Array(n * 4); r.readRenderTargetPixels(rt, 0, 0, n, 1, px); r.setRenderTarget(prev);
  rt.dispose(); g.dispose(); m.dispose();
  return Array.from({ length: n }, (_, i) => px[i * 4]);
}
