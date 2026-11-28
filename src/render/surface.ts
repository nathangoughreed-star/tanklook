// The water surface from below (plan VF2 stage S4, lane VF2-B, R190 / R192; render/fx.ts `mirror`). Seen from a low front
// view, the underside of the surface is a mirror: past the critical angle (48.6 deg from straight up) water reflects all
// the light back down (total internal reflection), so the top band of the front view shows the scape upside down,
// rippled. The tank is drawn once more from the eye mirrored at the water line into a half-resolution picture, only
// what is under the water (an oblique near plane), and the surface samples it where it is, its ripple slope bending
// the lookup. The picture is redrawn only when its key changes (the view moved, the scene was built or patched, the
// size, the Show boxes); swimming animals are left out of it so swimming never redraws it, and plants keep the sway of
// the last redraw (the ripples hide that). Full quality only; the cheap tier is round 1's shimmer band (VF6, `waterline`).
//
// The shimmer itself (moving bright ripple lines along the underside) moved here from build.ts, unchanged.
import * as THREE from 'three';
import { FX, FXU } from './fx';
import { perf } from './perf';
import { FLOW_GLSL, SWAY } from './plant3d';
import { MAX_JETS } from '../scene/flow';

/** Shared by every surface material: set per view before it is drawn (mirrorPass), off after (mirrorOff). */
export const SURF = {
  uMirOn: { value: 0 },
  uMirTex: { value: null as THREE.Texture | null },
  /** World to the mirror picture's uv (bias x the mirrored camera's projection x view). */
  uMirMat: { value: new THREE.Matrix4() },
  /** How strong the mirror is overall (1 = the full total reflection: past the critical angle nothing gets through; the reflected light already went the longer way through the water). */
  uMirK: { value: 1 },
};

/** Water's refractive index: the sightline bends at the front glass, so in the water it climbs 1 / 1.33 as steeply. */
const N_WATER = 1.333;

/**
 * The surface's material (build.ts addWater): its ripple shimmer and, on Full quality, the mirror. The material is the
 * one the surface had (a clear tinted basic material, recoloured in place by patchLook).
 */
export function surfaceMaterial(m: THREE.MeshBasicMaterial) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uFxTime = FXU.uFxTime;
    Object.assign(sh.uniforms, SURF, { uJetN: SWAY.uJetN, uJetP: SWAY.uJetP, uJetD: SWAY.uJetD });
    sh.vertexShader = 'varying vec3 vSurfW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vSurfW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = `varying vec3 vSurfW;
uniform float uFxTime;
uniform float uMirOn, uMirK;
uniform sampler2D uMirTex;
uniform mat4 uMirMat;
uniform int uJetN; uniform vec4 uJetP[${MAX_JETS}]; uniform vec4 uJetD[${MAX_JETS}];
${FLOW_GLSL}
// the ripple height at p (mm, squeezed along the tank so the lines stretch along it): four crossing waves on the caustic clock
float surfWave(vec2 p, float t) {
  return sin(p.x * 0.022 + p.y * 0.060 + 1.4 * sin(p.y * 0.031 + 0.21 * t) + 0.30 * t)
       + sin(p.x * 0.035 - p.y * 0.083 + 2.0 - 0.38 * t)
       + sin(p.x * 0.057 + p.y * 0.121 + 0.7 * sin(p.x * 0.019 - 0.17 * t) + 0.46 * t)
       + sin(p.x * 0.011 + p.y * 0.157 + 4.1 - 0.27 * t);
}
// The ripples follow the real current (Nathan 2026-11-27: "radiating out from the filter outflow"; the outlets' jets of
// scene/flow.ts, the same the plants sway in). U = the current just under the surface, mm/s: the wave pattern drifts with
// it (a flow map: two copies half a cycle apart, each carried along U and faded out before it stretches too far), and
// stronger current, choppier water. An outlet at or just over the surface (a lily, a spray bar, a HOB's spill) sends rings
// out from where it meets the water.
float surfRings(vec2 xz, float wy, float t) {
  float h = 0.0;
  for (int i = 0; i < ${MAX_JETS}; i++) {
    if (i >= uJetN) break;
    vec4 jp = uJetP[i], jd = uJetD[i];
    float d = wy - jp.y; // the outlet's depth under the surface (negative: over it, spilling in)
    float near = smoothstep(130.0, 25.0, d) * smoothstep(-120.0, -20.0, d);
    if (near <= 0.0) continue;
    vec2 c = jp.xz + jd.xz * max(d, 0.0) * 0.5; // where the jet comes up to the surface
    float r = length(xz - c), a = near * clamp(jd.w / 160.0, 0.25, 1.4);
    h += a * 2.2 * sin(r * 0.05 - t * 2.4) * exp(-r / 360.0) * smoothstep(0.0, 30.0, r); // broad rings (~5 in apart): seen nearly edge-on from the front they still read as arcs
  }
  return h;
}
float surfH(vec2 xz, vec2 U, float spd, float wy, float t) {
  vec2 sq = vec2(0.3, 1.3);
  if (uJetN == 0) return surfWave(xz * sq, t);
  float c = 0.3, f0 = fract(t * c), f1 = fract(t * c + 0.5), wt = abs(1.0 - 2.0 * f0), k = 0.35 / c;
  float h = mix(surfWave((xz - U * f1 * k) * sq, t + 7.3), surfWave((xz - U * f0 * k) * sq, t), wt);
  return h * (1.0 + 0.6 * spd) + surfRings(xz, wy, t);
}
` + sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
  {
    float t = uFxTime, wy = vSurfW.y;
    vec2 U = uJetN > 0 ? aqFlowAt(vec3(vSurfW.x, wy - 15.0, vSurfW.z)).xz : vec2(0.0);
    float spd = clamp(length(U) / 60.0, 0.0, 1.5); // 0 still water .. 1 a brisk surface current (60 mm/s, ~2.4 in/s)
    float h = surfH(vSurfW.xz, U, spd, wy, t);
    vec3 v = normalize(cameraPosition - vSurfW);
    float low = 1.0 - abs(v.y), f = low * low * low, below = v.y < 0.0 ? 1.0 : 0.3;
    float mir = 0.0;
    if (uMirOn > 0.5 && v.y < 0.0) {
      // the slope of the ripples (per world mm) tilts the mirror: the picture is looked up a little off the point
      vec2 g = vec2(surfH(vSurfW.xz + vec2(4.0, 0.0), U, spd, wy, t) - h, surfH(vSurfW.xz + vec2(0.0, 4.0), U, spd, wy, t) - h) / 4.0;
      vec3 q = vSurfW + vec3(g.x, 0.0, g.y) * 160.0;
      vec4 c = uMirMat * vec4(q, 1.0);
      vec2 uv = clamp(c.xy / c.w, 0.002, 0.998); // the picture covers the view: only a ripple's nudge reaches past its edge
      // in the water the sightline climbs 1 / n as steeply (refracted at the front glass): past the critical angle the
      // surface reflects everything, steeper it lets most light through (a few percent reflect)
      float vy = -v.y / ${N_WATER.toFixed(3)};
      float tir = smoothstep(0.71, 0.61, vy);
      mir = uMirK * mix(0.06, 1.0, tir);
      vec3 r = texture2D(uMirTex, uv).rgb;
      gl_FragColor = vec4(mix(gl_FragColor.rgb, r, mir), max(gl_FragColor.a, mir));
    }
    float line = pow(clamp(1.0 - abs(h) * 0.6, 0.0, 1.0), 7.0);
    float s = clamp((line * (0.35 + 0.9 * f) + f * 0.2 * (1.0 - mir)) * below, 0.0, 1.0) * (1.0 - 0.85 * mir); // over the mirror only a hint of the lines (at grazing angles they washed it out to silver)
    gl_FragColor = vec4(mix(gl_FragColor.rgb, vec3(0.88, 0.96, 1.0), s), max(gl_FragColor.a, s * 0.85));
  }`);
  };
  m.customProgramCacheKey = () => 'water-surface';
}

interface Pass { rt: THREE.WebGLRenderTarget; key: string }
/** One picture per view slot (side A / B), reused across rebuilds (as castPass.ts). */
const passes = new Map<number, Pass>();
/** `live`: the animals are in the picture too, so it is redrawn on every frame (their swimming moves them). Off: redrawn only on its key. */
export const mirrorOpts = { live: false };
let liveTick = 0;
/** Counts mirror pictures drawn (tests and the A/B scripts: swimming and caustic steps must add none). */
export const mirrorStats = { passes: 0 };
const vcam = new THREE.PerspectiveCamera();
vcam.matrixAutoUpdate = false;
const FLIP = new THREE.Matrix4().makeScale(-1, 1, 1);
const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

/** The surface mesh of a built scene (build.ts tags it), or null (no water). */
const surfOf = (sc: THREE.Scene) => sc.children.find(o => o.userData.waterSurface) as THREE.Mesh | undefined;

/**
 * The eye mirrored at the water line y = w, as a proper (right-handed) camera: world = mirror x eye x a flip of its own x,
 * and the projection flipped the same way, so the picture is the mirror image with no face winding turned round. Its
 * near plane is tilted onto the water line (an oblique projection), so only what lies under the water is drawn.
 */
export function mirrorCamera(cam: THREE.Camera, w: number, out = vcam) {
  const M = new THREE.Matrix4().set(1, 0, 0, 0, 0, -1, 0, 2 * w, 0, 0, 1, 0, 0, 0, 0, 1);
  cam.updateMatrixWorld();
  out.matrix.copy(M).multiply(cam.matrixWorld).multiply(FLIP);
  out.updateMatrixWorld(true); // also its matrixWorldInverse
  const P = out.projectionMatrix.copy(FLIP).multiply(cam.projectionMatrix).multiply(FLIP);
  // the clip plane (keep y < w: its normal points down, to the side the real eye is on) in the mirrored camera's space
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), w).applyMatrix4(out.matrixWorldInverse);
  const c = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant), e = P.elements;
  const q = new THREE.Vector4((Math.sign(c.x) + e[8]) / e[0], (Math.sign(c.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
  c.multiplyScalar(2 / c.dot(q));
  e[2] = c.x; e[6] = c.y; e[10] = c.z + 1; e[14] = c.w;
  out.projectionMatrixInverse.copy(P).invert();
  out.layers.mask = cam.layers.mask;
  return out;
}

/** World point to the mirror picture's uv (xy / w), for the camera mirrorCamera made. */
export const mirrorMatrix = (vc: THREE.Camera, out = new THREE.Matrix4()) => out.copy(BIAS).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);

/** Whether the mirror is drawn at all: its switch, Full quality, and the eye under the water line. */
export const mirrorWanted = (eyeY: number, waterY: number, level = perf.level) => FX.mirror && level === 0 && eyeY < waterY - 1;

/**
 * Before drawing a tank's view: make sure its mirror picture is current and point the shared uniforms at it, or switch
 * the mirror off. `rev` changes whenever the scene was built or patched; `w`, `h` = the view's size in device pixels.
 * Call with the view's Show-box hiding already applied (hidden parts are left out of the reflection too). `full`: the
 * Show view, which draws the mirror whatever the Performance level. `moving`: a camera-motion frame (no redraw: the mirror
 * waits for the rest frame, so orbiting costs nothing extra).
 */
export function mirrorPass(r: THREE.WebGLRenderer, slot: number, sc: THREE.Scene, cam: THREE.PerspectiveCamera, rev: number, w: number, h: number, extraKey = '', full = false, moving = false) {
  const surf = surfOf(sc), wy = surf?.userData.waterY as number | undefined;
  cam.updateMatrixWorld();
  if (!surf || wy === undefined || !surf.visible || !mirrorWanted(cam.matrixWorld.elements[13], wy, full ? 0 : perf.level)) { mirrorOff(); return false; }
  const rw = Math.max(16, Math.round(w / 2)), rh = Math.max(16, Math.round(h / 2));
  const key = [sc.id, rev, rw, rh, extraKey, mirrorOpts.live ? ++liveTick : 0, ...cam.matrixWorld.elements.map(x => x.toFixed(2)), ...cam.projectionMatrix.elements.map(x => x.toPrecision(6))].join(',');
  let p = passes.get(slot);
  if (!p) {
    const rt = new THREE.WebGLRenderTarget(rw, rh, { depthBuffer: true, stencilBuffer: true, type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace });
    rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter; rt.texture.generateMipmaps = false;
    p = { rt, key: '' }; passes.set(slot, p);
  }
  if (p.rt.width !== rw || p.rt.height !== rh) p.rt.setSize(rw, rh);
  // camera motion (an orbit, a zoom): no redraw, the mirror rests (the shimmer band shows) until the view stops and the rest frame redraws it
  if (moving && p.key !== key) { mirrorOff(); return false; }
  const vc = mirrorCamera(cam, wy);
  if (p.key !== key) { p.key = key; draw(r, sc, vc, p.rt); }
  SURF.uMirOn.value = 1; SURF.uMirTex.value = p.rt.texture; mirrorMatrix(vc, SURF.uMirMat.value);
  return true;
}

/** After the views are drawn: other renderers (stills, previews, AR) never sample a view's picture. */
export function mirrorOff() { SURF.uMirOn.value = 0; SURF.uMirTex.value = null; }

/** Animals (build.ts PART.animals) swim: left out of the picture so it stays valid while they move (corals, also that part, stay). */
const ANIMALS = 5;

function draw(r: THREE.WebGLRenderer, sc: THREE.Scene, vc: THREE.Camera, rt: THREE.WebGLRenderTarget) {
  const held: THREE.Object3D[] = [];
  for (const o of sc.children) if (o.visible && (o.userData.waterSurface || o.userData.surfaceLine || (!mirrorOpts.live && o.userData.part === ANIMALS && !o.userData.coral))) { o.visible = false; held.push(o); }
  const prev = r.getRenderTarget(), on = SURF.uMirOn.value;
  SURF.uMirOn.value = 0; // never sample the picture being drawn
  try {
    r.setRenderTarget(rt); r.clear(true, true, true); r.render(sc, vc); mirrorStats.passes++;
  } finally {
    r.setRenderTarget(prev); SURF.uMirOn.value = on;
    for (const o of held) o.visible = true;
  }
}

if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __mirror: unknown }).__mirror = { passes, SURF, stats: mirrorStats, opts: mirrorOpts };
