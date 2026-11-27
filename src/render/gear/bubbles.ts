// Air bubbles that form, rise and break at the surface (Nathan 2026-11-27: "bubbles that form, rise, and break at the surface",
// with a slider for how vigorous they are). Every bubble column of a tank (airstones, sponge filter lift tubes) is ONE mesh drawn
// in one call: the GPU places each bubble from the clock, so nothing is moved on the CPU per frame. Replaces the still spheres
// that were baked into the gear mesh (one icosahedron each, ~100 per airstone column).
//
// Physics, roughly: a bubble 1/16-1/4 in across rises at about 9 in/s (230 mm/s) whatever the air pressure, so the valve does
// not change the speed. More air = more bubbles, bigger ones, a column that wanders and spreads wider, a rougher surface.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { keep } from './common';

/** One column of bubbles: from `p` up to the water line `top` (mm). */
export interface BubbleStream {
  p: THREE.Vector3; top: number;
  /** bubbles a second with the valve wide open on a generic pump */ rate: number;
  /** the biggest bubble's radius, mm */ rmax: number;
  /** how far the column spreads by the time it reaches the top, mm, wide open */ spread: number;
  /** the pump's strength for this column (1 = a generic pump sized to the tank; a picked pump's air output, shared over its outlets) */ k: number;
}

/** Shared clock (s) and the live valve while the slider is held (-1 = each tank's own saved valve). viewer.ts sets uBubT. */
export const BUB = { uBubT: { value: 0 }, uLive: { value: -1 } };
const live = new Set<() => void>();
/** The viewer redraws when the slider moves (no rebuild until it is let go). */
export function onBubbleLive(f: () => void) { live.add(f); return () => live.delete(f); }
/** While the valve slider is dragged: every tank's bubbles follow it (v 0..1); null = back to the saved valve. */
export function setLiveValve(v: number | null) { BUB.uLive.value = v == null ? -1 : v; for (const f of live) f(); }

/** mm/s (about 9 in/s) */
const RISE = 230;
/** s: forming at the stone; sitting at the surface; the ring spreading after the pop */
const FORM = 0.12, SIT = 0.1, RING = 0.35;

const VERT = /* glsl */`
uniform float uBubT; uniform float uLive; uniform float uValve;
attribute vec3 aOrg; attribute vec4 aA; attribute vec4 aB;
varying float vKind; varying float vA; varying vec3 vN; varying vec3 vV;
float h11(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
void main() {
  float phase = aA.x, seed = aA.y, H = aA.z, kind = aA.w, L = aB.x, rmax = aB.y, spread = aB.z, k = aB.w;
  float flow = (uLive >= 0.0 ? uLive : uValve) * k;
  float cyc = uBubT / L + phase, n = floor(cyc), s = fract(cyc) * L;
  // this bubble, this time round: does the valve let it out (a soft edge so the slider fades bubbles in and out), how big
  float hr = h11(n * 1.7 + seed * 91.0), on = clamp((flow - hr * 1.05) / 0.08, 0.0, 1.0);
  float r = rmax * (0.45 + 0.55 * h11(n * 3.1 + seed * 53.0)) * (0.7 + 0.35 * min(flow, 1.3));
  float tRise = max(0.0, s - ${FORM}), hTop = H - 0.4 * r;
  float y = min(${RISE.toFixed(1)} * tRise, hTop), hh = y / H;
  float tTop = ${FORM} + hTop / ${RISE.toFixed(1)}, tPop = tTop + ${SIT};
  // wander: a drift off the column that grows with height (wider with more air), plus a quick zig-zag
  vec2 dir = vec2(h11(n * 5.3 + seed * 17.0) - 0.5, h11(n * 7.7 + seed * 29.0) - 0.5) * 2.0;
  vec2 off = dir * spread * (0.35 + 0.65 * clamp(flow, 0.0, 1.3)) * pow(hh, 0.7)
           + vec2(sin(uBubT * 9.0 + seed * 40.0), cos(uBubT * 7.0 + seed * 23.0)) * r * 0.7 * min(1.0, hh * 4.0);
  vec3 c = aOrg + vec3(off.x, y, off.y);
  vec3 w;
  if (kind < 0.5) {
    // grows as it forms at the stone and a little as it rises; flattens a touch; gone at the pop
    float g = clamp(s / ${FORM}, 0.0, 1.0) * (1.0 + 0.25 * hh) * on * step(s, tPop);
    vec3 q = position * vec3(1.0, 0.85, 1.0) * r * g;
    w = c + q; vN = normalize(position * vec3(1.0, 1.18, 1.0)); vA = 1.0;
  } else {
    // the ring where it broke: spreads to ~5 radii and fades
    float u = (s - tPop) / ${RING};
    float shown = step(0.0, u) * step(u, 1.0) * on;
    float R = r * (1.0 + 4.0 * u) * shown;
    w = vec3(c.x, aOrg.y + H - 0.8, c.z) + vec3(position.x, 0.0, position.z) * R;
    vN = vec3(0.0, 1.0, 0.0); vA = (1.0 - u) * shown;
  }
  vKind = kind;
  vec4 wp = modelMatrix * vec4(w, 1.0);
  vV = cameraPosition - wp.xyz; vN = normalize(mat3(modelMatrix) * vN);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FRAG = /* glsl */`
varying float vKind; varying float vA; varying vec3 vN; varying vec3 vV;
void main() {
  if (vA <= 0.001) discard;
  vec3 col; float a;
  if (vKind < 0.5) {
    // a bubble: clear in the middle, a bright rim (total reflection at its edge), a small highlight up top
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
    float hi = smoothstep(0.82, 0.97, dot(normalize(vN), normalize(vec3(0.2, 1.0, 0.45))));
    col = mix(vec3(0.78, 0.9, 0.96), vec3(1.0), f * 0.6 + hi);
    a = clamp(0.06 + 0.75 * f + 0.6 * hi, 0.0, 0.95);
  } else { col = vec3(0.92, 0.97, 1.0); a = 0.45 * vA; }
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

const pool = new Map<number, THREE.ShaderMaterial>();
/** One material per valve setting (the uniforms other than the valve are shared), so programs are shared too. */
function material(valve: number) {
  let m = pool.get(valve);
  if (!m) {
    m = keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { ...BUB, uValve: { value: valve } }, vertexShader: VERT, fragmentShader: FRAG }));
    pool.set(valve, m);
  }
  return m;
}

/** A unit bubble (an icosahedron, indexed) and a unit ring (flat, 14 segments, radii 0.72..1). */
const RING_SEG = 14;
const ball = (() => { const g = mergeVertices(new THREE.IcosahedronGeometry(1, 1).deleteAttribute('normal').deleteAttribute('uv')); return { pos: [...(g.attributes.position.array as Float32Array)], idx: [...g.index!.array] }; })();
const ring = (() => { const pos: number[] = [], idx: number[] = []; for (let i = 0; i < RING_SEG; i++) { const a = (i / RING_SEG) * Math.PI * 2; pos.push(Math.cos(a) * 0.72, 0, Math.sin(a) * 0.72, Math.cos(a), 0, Math.sin(a)); const j = 2 * i, n = 2 * ((i + 1) % RING_SEG); idx.push(j, j + 1, n, n, j + 1, n + 1); } return { pos, idx }; })();

/** The columns' mesh (null when there are none). `valve` 0..1: the tank's saved valve. */
export function bubbleMesh(streams: BubbleStream[], valve: number): THREE.Mesh | null {
  if (!streams.length) return null;
  const pos: number[] = [], idx: number[] = [], org: number[] = [], aa: number[] = [], bb: number[] = [];
  const box = new THREE.Box3();
  let si = 0;
  for (const st of streams) {
    const H = st.top - st.p.y; if (H < 8) continue;
    const L = FORM + H / RISE + SIT + RING;
    // enough slots for the most bubbles this column can show (valve wide open on this pump), capped
    const n = Math.min(320, Math.max(4, Math.ceil(st.rate * Math.min(1.4, st.k) * L)));
    const B = [L, st.rmax, st.spread, st.k];
    for (let i = 0; i < n; i++) {
      const seed = ((si * 0.618034 + i * 0.137) % 1) + si * 0.01, phase = (i + 0.6 * frac(Math.sin(i * 12.9898 + si * 78.233) * 43758.5)) / n;
      for (const [g, kind] of [[ball, 0], [ring, 1]] as const) {
        const v0 = pos.length / 3;
        pos.push(...g.pos); for (const j of g.idx) idx.push(v0 + j);
        for (let j = 0; j < g.pos.length / 3; j++) { org.push(st.p.x, st.p.y, st.p.z); aa.push(phase, seed, H, kind); bb.push(...B); }
      }
    }
    const pad = st.spread * 1.4 + st.rmax * 6;
    box.expandByPoint(new THREE.Vector3(st.p.x - pad, st.p.y - 2, st.p.z - pad)).expandByPoint(new THREE.Vector3(st.p.x + pad, st.top + 2, st.p.z + pad));
    si++;
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aOrg', new THREE.Float32BufferAttribute(org, 3));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(aa, 4));
  g.setAttribute('aB', new THREE.Float32BufferAttribute(bb, 4));
  g.setIndex(idx);
  g.boundingBox = box; g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  const m = new THREE.Mesh(g, material(Math.round(valve * 100) / 100));
  m.renderOrder = 3.5; // with the clear gear: after the water volume, before the surface and the panes
  m.userData.nolight = true; m.userData.bubbles = true; m.userData.gear = true;
  m.raycast = () => {}; // never picked or hit
  return m;
}
const frac = (x: number) => x - Math.floor(x);
