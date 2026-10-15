// 3D fish bodies (roadmap step 1, style test): the body is lofted from the body plan's side profile with a thickness
// per station, and a painted side texture (colours, markings, scales; no eye, gill or mouth, which would smear where
// the surface turns away from the side) is projected onto both flanks. Eyes are real domes set into the head. The flat
// card stays as the fins (thin membranes); its painted body sits inside the solid. Nose and tail tips are unchanged,
// so nose-to-tail stays adult TL.
import * as THREE from 'three';
import { analBox, bodyPlan, drawAnal, drawTail, eyeSpot, pairedFins, profile, tailBox, type Plan } from '../art/fishgen';
import { FIN_A, rng, style } from '../art/paint';
import { HERP3D } from '../art/herps';
import { SNAILS } from '../art/snails';
import type { EdgeMode } from '../scene/types';
import { cardMaterial, pairedFinTexture } from './textures';
import { isShrimp3D, shrimpBody } from './shrimp3d';

/** Species drawn in 3D (test set) and switches for before/after pictures. `fade` = the session-10 fixes (turned-away paint fades, card body cut out, body-shape fields, barbels); off = session 9, for pictures. `wrap` = the turned-away paint is smeared lengthwise (bars and spots don't close into hoops over the back and throat); off = session 11's round blur. */
export const fish3d = { on: true, fade: true, wrap: true, species: new Set(['cardinal', 'discus', 'bronzecory', 'tigerbarb', 'bristlenose', 'kuhli', 'angel', 'danio', 'guppy', 'dwarfgourami', 'gbr', 'harlequin', 'oto', 'clownloach', 'goldfish', 'ember', 'rummynose', 'chili', 'cherrybarb', 'platy', 'molly', 'swordtail', 'betta', 'honeygourami', 'bolivianram', 'kribensis', 'oscar', 'pandacory', 'sae', 'tetra', 'gourami', 'ocellaris', 'royalgramma', 'yellowtang', 'firefish', 'banggai', 'sixline', 'chromis', 'coralbeauty', 'watchman', 'cherryshrimp', 'amano', 'cleanershrimp', 'nerite', 'mystery', 'ramshorn', 'trumpet', 'turbo', 'hermit', 'dartfrog', 'treefrog', 'firetoad', 'adf', 'firenewt', 'axolotl',
  // females of the dimorphic species (species.json `female`)
  'betta_f', 'guppy_f', 'swordtail_f', 'dwarfgourami_f', 'honeygourami_f', 'cherrybarb_f', 'kribensis_f', 'gbr_f', 'gourami_f', 'peapuffer', 'peapuffer_f', 'hatchet', 'cpd', 'cpd_f', 'platy_f', 'molly_f']) };

export const has3D = (art: string) => fish3d.on && fish3d.species.has(art) && (bodyPlan(art)?.thick != null || art in SNAILS || art in HERP3D);

const STATIONS = 40, RING = 28, EXP = 2.4; // superellipse exponent: slightly boxy flanks
/** Pull the solid this far inside the painted outline (widths), so its edge never samples the card's transparent rim. */
const INSET = 0.006;
const spE = (c: number, e: number) => Math.sign(c) * Math.abs(c) ** (2 / e);
const bendZ = (bend: number, x: number) => bend * 0.14 * (1 - (2 * x) ** 2);

const smooth = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

type Section = { vc: number; hv: number; t: number; p: Plan };

/** Cross-section at u: centre line vc, half-depth hv, half-thickness t (all widths). */
function sections(p: Plan) {
  const prof = profile(p), thick = p.thick!, pedT = p.pedT ?? 0.55, gu = 1 - (1 - p.pedU) * 0.2; // gu: the gill cover
  const maxHv = Math.max(...Array.from({ length: 41 }, (_, i) => { const [a, b] = prof(p.pedU + (1 - p.pedU) * i / 40); return (b - a) / 2; }));
  return (u: number): Section => {
    const [a, b] = prof(u), s = (u - p.pedU) / (1 - p.pedU), vc = (a + b) / 2, hv = Math.max(0, (b - a) / 2 - INSET);
    // thickness follows depth but stays fuller toward the head (fish are widest behind the gills)
    let t = thick * (0.35 * hv + 0.65 * maxHv * Math.sin(Math.min(1, hv / maxHv) * Math.PI / 2)) * (pedT + (1 - pedT) * Math.sqrt(s));
    // armoured heads sit a step narrower than the trunk; a flat snout keeps its width to the tip (shovel)
    if (p.step) t *= 1 - p.step * smooth(gu - 0.015, gu + 0.02, u);
    if (p.noseW) {
      t = Math.max(t, p.noseW * thick * maxHv * smooth(0.55, 0.8, s) * (1 - 0.5 * smooth(0.9, 1, s)));
      const k = Math.max(0, (s - 0.86) / 0.14); t *= Math.sqrt(Math.max(0, 1 - k * k)); // a rounded shovel seen from above or below, not a square cut
    }
    return { vc, hv, t, p };
  };
}

/**
 * Section outline at angle th (0 = top, pi = bottom; z on the + flank): a superellipse, boxier below for a flat
 * belly (`belly`) and wider low or high (`wide`). Returns [v, z].
 */
function ringPt({ vc, hv, t, p }: Section, th: number): [number, number] {
  const c = Math.cos(th), e = c < 0 ? EXP * (1 + 2.5 * (p.belly ?? 0)) : EXP;
  return [vc - hv * spE(c, e), t * spE(Math.sin(th), e) * (1 - 0.5 * (p.wide ?? 0) * c)];
}

/** The angle on the + flank of section `sec` where the outline is at height v (v rises monotonically with th). */
function thetaAt(sec: Section, v: number) {
  let lo = 0, hi = Math.PI;
  for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (ringPt(sec, m)[0] < v) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/**
 * Unit body (card width 1, centred like the card plane: x = u - 0.5, y = -v), bent like `cardGeometry`.
 * UVs are the side projection of the card texture: (u, 0.5 - v / aspect).
 */
function bodyGeometry(p: Plan, aspect: number, bend: number) {
  const ring = sections(p), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i < STATIONS; i++) {
    const k = i / (STATIONS - 1), u = p.pedU + (1 - p.pedU) * (1 - Math.cos(k * Math.PI / 2) ** 1.5); // denser at the nose
    const sec = ring(u), x = u - 0.5, z0 = bendZ(bend, x);
    for (let j = 0; j <= RING; j++) {
      const [v, z] = ringPt(sec, j / RING * Math.PI * 2);
      pos.push(x, -v, z0 + z);
      uv.push(u, 0.5 - v / aspect);
    }
  }
  const R = RING + 1;
  for (let i = 0; i < STATIONS - 1; i++) for (let j = 0; j < RING; j++) {
    const a = i * R + j, b = a + R;
    idx.push(a, a + 1, b, a + 1, b + 1, b); // outward-facing (FrontSide)
  }
  // cap the cut at the peduncle (the tail fin on the card covers the joint)
  const { vc } = ring(p.pedU), c = pos.length / 3, x0 = p.pedU - 0.5;
  pos.push(x0, -vc, bendZ(bend, x0)); uv.push(p.pedU, 0.5 - vc / aspect);
  for (let j = 0; j < RING; j++) idx.push(c, j + 1, j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // soft form shading: the belly and the underside of the flanks turn away from the light above
  const n = g.attributes.normal, col: number[] = [];
  for (let i = 0; i < n.count; i++) { const ny = n.getY(i), k = 1 - 0.28 * Math.max(0, -ny) + 0.04 * Math.max(0, ny); col.push(k, k, k); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // how squarely the surface faces the side (1 = flank, 0 = edge-on to the projection): where the paint is reliable
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(Array.from({ length: n.count }, (_, i) => Math.abs(n.getZ(i))), 1));
  g.userData.keep = true; // shared across rebuilds
  return g;
}

/**
 * Where each eye sits on the body surface (unit frame) and which way it faces: the plan's eye point on each flank,
 * the dome's axis along the local surface normal, turned slightly forward (fish eyes look ahead a little).
 */
function eyePlacements(p: Plan, bend: number) {
  const e = eyeSpot(p), th0 = thetaAt(sections(p)(e.u), e.v);
  // `eye.up` turns the eye from the flank toward the top of the head (flattened fish: plecos look upward)
  const th = th0 + (EYE_TOP - th0) * (p.eye.up ?? 0);
  return [1, -1].map(side => ({
    pos: pointAt(p, e.u, th, side, bend), n: normalAtTh(p, e.u, th, side, bend).add(new THREE.Vector3(0.2, 0, 0)).normalize(), r: e.r, iris: e.iris, bulge: p.eye.bulge ?? 0.38,
  }));
}
/** Section angle of a fully raised eye (`eye.up` = 1): on the head's upper surface, a little off the midline. */
const EYE_TOP = 0.5;

/** Point on the body surface at station u, section angle th, on one flank (unit frame). */
function pointAt(p: Plan, u: number, th: number, side: number, bend: number) {
  const [v, z] = ringPt(sections(p)(u), th), x = u - 0.5;
  return new THREE.Vector3(x, -v, bendZ(bend, x) + side * z);
}
/** Point on the body surface at card (u, v) on one flank (unit frame). */
const surfaceAt = (p: Plan, u: number, v: number, side: number, bend: number) => pointAt(p, u, thetaAt(sections(p)(u), v), side, bend);

/** Outward surface normal at station u, section angle th (finite differences along the body and around the section). */
function normalAtTh(p: Plan, u: number, th: number, side: number, bend: number) {
  const at = (uu: number, t: number) => pointAt(p, uu, t, side, bend), d = 0.004;
  const n = at(u + d, th).sub(at(u - d, th)).cross(at(u, th + d).sub(at(u, th - d))).normalize();
  return n.z * side < 0 ? n.negate() : n;
}

/**
 * Barbels (bottom fish): two thin tapering pairs at the corners of the mouth, angled forward, down and out, rooted a
 * little inside the surface. `p.barbels` = the card's barbel length (widths).
 */
function barbelMeshes(p: Plan, bend: number, mat: THREE.Material) {
  const out: THREE.Mesh[] = [], len = p.barbels! * 2, nb = profile(p)(0.975)[1];
  let g = geoCache.get('barbel');
  if (!g) { g = new THREE.CylinderGeometry(0.25, 1, 1, 6, 1).translate(0, 0.5, 0); g.userData.keep = true; geoCache.set('barbel', g); }
  const DIRS: [number, number, number][] = [[0.35, -0.7, 0.62], [0.62, -0.72, 0.3]];
  for (const side of [1, -1]) DIRS.forEach((d, k) => {
    const m = new THREE.Mesh(g, mat), s = surfaceAt(p, 0.975 - k * 0.012, nb - 0.006, side, bend), z0 = bendZ(bend, s.x);
    const r = p.barbelR ?? 0.004; m.scale.set(r, len * (1 - 0.25 * k), r);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2] * side).normalize());
    m.position.set(s.x, s.y, z0 + (s.z - z0) * 0.8);
    out.push(m);
  });
  return out;
}

/**
 * The mouth (`p.gape`): a thin dark line on each flank from the snout tip back along the jaw, curving a little down,
 * just outside the surface (the body's painted texture leaves the mouth out).
 */
function gapeMeshes(art: string, p: Plan, bend: number, mat: THREE.Material) {
  const out: THREE.Mesh[] = [], m0 = p.mouth ?? 0;
  for (const side of [1, -1]) {
    const key = `gape:${art}:${bend}:${side}`;
    let g = geoCache.get(key);
    if (!g) {
      const pts = Array.from({ length: 7 }, (_, i) => {
        const k = i / 6, u = 0.997 - p.gape! * k, [t, b] = profile(p)(u), v = Math.min(b - 0.003, Math.max(t + 0.003, m0 + 0.004 + (p.gapeDrop ?? 0.02) * k * k));
        const s = surfaceAt(p, u, v, side, bend), z0 = bendZ(bend, s.x);
        return new THREE.Vector3(s.x, s.y, z0 + (s.z - z0) * 1.04 + side * 0.001);
      });
      // a rounded snout (noseCap) is broad at the front: the line starts at the tip on the midline, so the two sides meet
      if (p.noseCap) { const z0 = bendZ(bend, 0.5); pts.unshift(new THREE.Vector3(0.5 + 0.002, -(m0 + 0.004), z0)); }
      g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0028, 5, false); g.userData.keep = true; geoCache.set(key, g);
    }
    out.push(new THREE.Mesh(g, mat));
  }
  return out;
}

/** Paired-fin spread from the body (radians): pelvics hang down and out, pectorals swing out behind the gill cover. */
/** A tube along `curve` from radius r at its start, tapering to a third at its end (limbs, tentacles). */
export function taperTube(curve: THREE.Curve<THREE.Vector3>, r: number, N = 12, R = 5) {
  const tube = new THREE.TubeGeometry(curve, N, r, R, false), pos = tube.attributes.position, c = new THREE.Vector3(), q = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) { // pull each ring toward the curve
    const s = Math.floor(k / (R + 1)) / N; curve.getPoint(s, c);
    q.fromBufferAttribute(pos, k).sub(c).multiplyScalar(1 - 0.67 * s).add(c); pos.setXYZ(k, q.x, q.y, q.z);
  }
  tube.computeVertexNormals();
  return tube;
}

/**
 * Limbs (`Plan.limbs`: legs, antennae) as tubes tapering to a third of the root radius, mirrored on both flanks:
 * a quadratic curve from the surface point at (u, v) to root + `to`, bowed toward root + `via`.
 */
function limbMeshes(art: string, p: Plan, bend: number, mat: (c?: string) => THREE.Material) {
  const out: THREE.Mesh[] = [];
  p.limbs!.forEach((l, i) => {
    for (const side of [1, -1]) {
      const key = `limb:${art}:${bend}:${side}:${i}`;
      let g = geoCache.get(key);
      if (!g) {
        const [t, b] = profile(p)(l.u), r0 = surfaceAt(p, l.u, Math.min(b - 0.004, Math.max(t + 0.004, l.v)), side, bend);
        const off = (d: [number, number, number]) => r0.clone().add(new THREE.Vector3(d[0], -d[1], d[2] * side));
        const via = l.via ? off(l.via) : r0.clone().lerp(off(l.to), 0.5);
        g = taperTube(new THREE.QuadraticBezierCurve3(r0, via, off(l.to)), l.r); g.userData.keep = true; geoCache.set(key, g);
      }
      out.push(new THREE.Mesh(g, mat(l.c)));
    }
  });
  return out;
}

/**
 * Double caudal (`tail.split`, fantail goldfish): two copies of the tail, the card's own left out. At the peduncle
 * they lie together in the card plane; further back their parts below the peduncle's top flare out to either side
 * (the lobes joined along the top, an upturned V from behind) and the whole lobe swings out a little (a V from above).
 */
function splitTail(art: string, p: Plan, bend: number, edge: EdgeMode) {
  const tb = tailBox(p), m = 0.01, box = { u0: -m, v0: tb.v0 - m, w: tb.u1 + 2 * m, h: tb.v1 - tb.v0 + 2 * m };
  const [pt, pb] = profile(p)(p.pedU), hinge = tb.c - (pb - pt) * 0.35, tan = Math.tan(p.tail.split! * Math.PI / 180);
  const R = 1024, key = `tail2:${art}`;
  let tex = texCache.get(key + edge);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = Math.ceil(box.w * R); c.height = Math.ceil(box.h * R);
    const ctx = c.getContext('2d')!; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    style.finA = edge === 'a2c' ? 0.36 : FIN_A; style.features = false; style.paired = false;
    drawTail(p, ctx, (u, v) => [(u - box.u0) * R, (v - box.v0) * R], R);
    style.finA = FIN_A; style.features = true; style.paired = true;
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; texCache.set(key + edge, tex);
  }
  const mat = cardMaterial(key, tex, edge); mat.userData.fishCard = true; // outlined by fish stand out
  return [1, -1].map(side => {
    const gk = `${key}:${bend}:${side}`;
    let g = geoCache.get(gk);
    if (!g) {
      g = new THREE.PlaneGeometry(box.w, box.h, 24, 16); g.translate(box.u0 + box.w / 2 - 0.5, -(box.v0 + box.h / 2), 0);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), u = x + 0.5, v = -pos.getY(i), k = smooth(p.pedU + 0.02, p.pedU * 0.45, u); // 0 at the root .. 1 behind it
        pos.setZ(i, bendZ(bend, x) + side * k * (Math.max(0, v - hinge) * tan + 0.3 * (p.pedU - u) + 0.003));
      }
      g.computeVertexNormals(); g.computeBoundingSphere(); g.userData.keep = true; geoCache.set(gk, g);
    }
    return new THREE.Mesh(g, mat);
  });
}
const texCache = new Map<string, THREE.Texture>();

/**
 * Doubled anal fin (`analSplit`, fantail goldfish): two copies of the anal, the card's own left out. Along the belly
 * they lie together in the card plane; lower down they splay apart to either side (an inverted V from the front).
 */
function splitAnal(art: string, p: Plan, bend: number, edge: EdgeMode) {
  const ab = analBox(p), m = 0.01, box = { u0: ab.u0 - m, v0: ab.v0 - m, w: ab.u1 - ab.u0 + 2 * m, h: ab.v1 - ab.v0 + 2 * m };
  const prof = profile(p), tan = Math.tan(p.analSplit! * Math.PI / 180);
  const R = 1024, key = `anal2:${art}`;
  let tex = texCache.get(key + edge);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = Math.ceil(box.w * R); c.height = Math.ceil(box.h * R);
    const ctx = c.getContext('2d')!; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    style.finA = edge === 'a2c' ? 0.36 : FIN_A; style.features = false; style.paired = false;
    drawAnal(p, ctx, (u, v) => [(u - box.u0) * R, (v - box.v0) * R], R);
    style.finA = FIN_A; style.features = true; style.paired = true;
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; texCache.set(key + edge, tex);
  }
  const mat = cardMaterial(key, tex, edge); mat.userData.fishCard = true;
  return [1, -1].map(side => {
    const gk = `${key}:${bend}:${side}`;
    let g = geoCache.get(gk);
    if (!g) {
      g = new THREE.PlaneGeometry(box.w, box.h, 12, 12); g.translate(box.u0 + box.w / 2 - 0.5, -(box.v0 + box.h / 2), 0);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), u = x + 0.5, v = -pos.getY(i), below = Math.max(0, v - prof(Math.min(1, Math.max(0, u)))[1] + 0.02);
        pos.setZ(i, bendZ(bend, x) + side * (below * tan + 0.003));
      }
      g.computeVertexNormals(); g.computeBoundingSphere(); g.userData.keep = true; geoCache.set(gk, g);
    }
    return new THREE.Mesh(g, mat);
  });
}

const SPREAD = { pelvic: 0.6, pectoral: 0.75 };
/** Swing of the paired fins on a fish clinging to glass: pressed out flat against the pane, pectorals swept back. */
const SPLAY = { pelvic: 1.4, pectoral: 1.3 };

/**
 * Pectoral and pelvic fins as thin membranes on both flanks, rooted on the body surface and swung out from it
 * (pelvic about the body axis, pectoral about a vertical base), painted like the card's fins.
 */
function finMeshes(art: string, p: Plan, bend: number, edge: EdgeMode, cling = false) {
  const out: THREE.Mesh[] = [];
  for (const f of pairedFins(p)) {
    const us = f.pts.map(q => q[0]), vs = f.pts.map(q => q[1]), m = 0.01;
    const box = { u0: Math.min(...us) - m, v0: Math.min(...vs) - m, w: Math.max(...us) - Math.min(...us) + 2 * m, h: Math.max(...vs) - Math.min(...vs) + 2 * m };
    const key = `fin:${art}:${f.kind}`;
    let g = geoCache.get(key);
    if (!g) {
      g = new THREE.PlaneGeometry(box.w, box.h);
      // root at the origin; card frame (x = u, y = -v)
      g.translate(box.u0 + box.w / 2 - f.root[0], -(box.v0 + box.h / 2 - f.root[1]), 0); g.userData.keep = true; geoCache.set(key, g);
    }
    const mat = cardMaterial(key, pairedFinTexture(art, f, box, edge), edge); mat.userData.fishCard = true; // outlined by fish stand out
    for (const side of [1, -1]) {
      const mesh = new THREE.Mesh(g, mat), a = (cling ? SPLAY : SPREAD)[f.kind];
      // root slightly inside the surface so the base never shows a gap
      const s = surfaceAt(p, f.root[0], f.root[1], side, bend), z0 = bendZ(bend, s.x);
      mesh.position.set(s.x, s.y, z0 + (s.z - z0) * 0.85);
      if (f.kind === 'pelvic') mesh.rotation.x = -side * a;
      else if (cling) mesh.rotation.set(-side * a, side * 0.35, 0, 'YXZ');
      else mesh.rotation.set(-side * 0.25, side * a, 0, 'YXZ');
      out.push(mesh);
    }
  }
  return out;
}

/**
 * Undersides of the fish that cling to glass (seen belly-on through the pane): a painted plate over the lower part of
 * the body, projected straight up (so a round sucker disc stays round), its edges fading into the flanks' paint.
 * Painters draw in widths: `px(u, z)` = canvas point at station u (0 tail .. 1 nose), z across; `t(u)` = half-width there.
 */
type BellyPaint = (ctx: CanvasRenderingContext2D, px: (u: number, z: number) => [number, number], t: (u: number) => number, s: number) => void;
const BELLY_ARC = 0.42; // half the lower arc the plate covers (fraction of pi each side of the keel)
/** Speckles over the plate: n dots of radius r (widths) in colour c, seeded. */
function speckle(ctx: CanvasRenderingContext2D, px: (u: number, z: number) => [number, number], t: (u: number) => number, s: number, seed: number, n: number, u0: number, u1: number, r: number, c: string) {
  const R = rng(seed); ctx.fillStyle = c;
  for (let i = 0; i < n; i++) {
    const u = u0 + R() * (u1 - u0), [x, y] = px(u, (R() * 2 - 1) * t(u) * 0.95);
    ctx.globalAlpha = 0.35 + R() * 0.5; ctx.beginPath(); ctx.ellipse(x, y, r * s * (0.6 + R() * 0.8), r * s * (0.6 + R() * 0.8), R() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
/** The oral disc of a sucker-mouth catfish at station u: broad lips with papillae round a dark slit and the jaw pads. */
function suckerDisc(ctx: CanvasRenderingContext2D, px: (u: number, z: number) => [number, number], s: number, u: number, rz: number, ru: number, lip: [string, string], seed: number) {
  const [cx, cy] = px(u, 0), a = ru * s, b = rz * s, R = rng(seed);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(a, b));
  g.addColorStop(0, lip[1]); g.addColorStop(0.75, lip[0]); g.addColorStop(1, lip[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2); ctx.fill();
  // papillae: fine bumps over the lips, denser toward the rim
  for (let i = 0; i < 700; i++) {
    const th = R() * Math.PI * 2, k = 0.35 + Math.sqrt(R()) * 0.62, d = 0.0018 * s;
    ctx.fillStyle = R() < 0.5 ? 'rgba(255,250,235,0.16)' : 'rgba(40,34,24,0.14)';
    ctx.beginPath(); ctx.arc(cx + Math.cos(th) * a * k, cy + Math.sin(th) * b * k, d * (0.6 + R() * 0.8), 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(30,26,20,0.45)'; ctx.lineWidth = Math.max(1, 0.06 * a);
  ctx.beginPath(); ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2); ctx.stroke();
  // the mouth: a dark crescent behind the front lip, the two jaw pads in it
  ctx.fillStyle = '#1e1a14';
  ctx.beginPath(); ctx.ellipse(cx + a * 0.1, cy, a * 0.2, b * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6a5a3c';
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + a * 0.12, cy + sgn * b * 0.22, a * 0.08, b * 0.17, 0, 0, Math.PI * 2); ctx.fill(); }
}
/** Gill slits (one each side, just behind the head) and the vent. */
function slitsAndVent(ctx: CanvasRenderingContext2D, px: (u: number, z: number) => [number, number], t: (u: number) => number, s: number, gu: number, vu: number) {
  ctx.strokeStyle = 'rgba(25,22,16,0.55)'; ctx.lineWidth = Math.max(1, 0.006 * s); ctx.lineCap = 'round';
  for (const sgn of [-1, 1]) {
    const [x0, y0] = px(gu, sgn * t(gu) * 0.55), [x1, y1] = px(gu + 0.025, sgn * t(gu) * 0.85);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.2, y1, x1, y1); ctx.stroke();
  }
  const [vx, vy] = px(vu, 0); ctx.fillStyle = 'rgba(30,26,20,0.6)'; ctx.beginPath(); ctx.ellipse(vx, vy, 0.008 * s, 0.005 * s, 0, 0, Math.PI * 2); ctx.fill();
}
const BELLIES: Record<string, BellyPaint> = {
  // bristlenose: grey-brown, paler down the middle, freckled; a broad disc under the shovel head
  bristlenose: (ctx, px, t, s) => {
    const W = ctx.canvas.width, H = ctx.canvas.height, g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5e5848'); g.addColorStop(0.5, '#8e8670'); g.addColorStop(1, '#5e5848');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    speckle(ctx, px, t, s, 11, 260, 0.16, 0.98, 0.005, '#3e3a2e');
    speckle(ctx, px, t, s, 12, 90, 0.2, 0.75, 0.006, '#b4ab92');
    slitsAndVent(ctx, px, t, s, 0.8, 0.46);
    suckerDisc(ctx, px, s, 0.91, t(0.91) * 0.72, 0.062, ['#9a917a', '#7a725e'], 13);
  },
  // oto: a cream belly, the dark side stripe just showing at the edges; a small disc
  oto: (ctx, px, t, s) => {
    const W = ctx.canvas.width, H = ctx.canvas.height, g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5a5644'); g.addColorStop(0.12, '#b8b29a'); g.addColorStop(0.3, '#e2ddc8'); g.addColorStop(0.7, '#e2ddc8'); g.addColorStop(0.88, '#b8b29a'); g.addColorStop(1, '#5a5644');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    speckle(ctx, px, t, s, 21, 60, 0.6, 0.98, 0.004, '#8a8468');
    slitsAndVent(ctx, px, t, s, 0.8, 0.45);
    suckerDisc(ctx, px, s, 0.93, t(0.93) * 0.68, 0.04, ['#cfc8ae', '#b0a98e'], 22);
  },
};

function bellyPlate(art: string, p: Plan, bend: number) {
  const paint = BELLIES[art]; if (!paint) return null;
  const key = `belly|${art}|${bend}|${fish3d.fade}`;
  let g = geoCache.get(key);
  const ring = sections(p), Z = Math.max(...Array.from({ length: 41 }, (_, i) => ring(p.pedU + (1 - p.pedU) * i / 40).t)) * 1.02;
  if (!g) {
    const N = 18, pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
    for (let i = 0; i < STATIONS; i++) {
      const k = i / (STATIONS - 1), u = p.pedU + (1 - p.pedU) * (1 - Math.cos(k * Math.PI / 2) ** 1.5), sec = ring(u), x = u - 0.5, z0 = bendZ(bend, x);
      for (let j = 0; j <= N; j++) {
        const f = j / N * 2 - 1, [v, z] = ringPt(sec, Math.PI * (1 + BELLY_ARC * f)), lift = 1.015; // just outside the body
        pos.push(x, -(sec.vc + (v - sec.vc) * lift), z0 + z * lift);
        uv.push(u, 0.5 - z / (2 * Z));
        const a = (1 - smooth(0.55, 1, Math.abs(f))) * smooth(p.pedU, p.pedU + 0.08, u), sh = 0.92;
        col.push(sh, sh, sh, a);
      }
    }
    for (let i = 0; i < STATIONS - 1; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + N + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); } // outward, as the body
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx); g.computeVertexNormals(); g.userData.keep = true;
    geoCache.set(key, g);
  }
  const mat = fishMat(`belly:${art}`, () => {
    const W = 1024, H = Math.round(W * 2 * Z), c = document.createElement('canvas'); c.width = W; c.height = H;
    paint(c.getContext('2d')!, (u, z) => [u * W, (0.5 + z / (2 * Z)) * H], u => ring(u).t, W);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return new THREE.MeshBasicMaterial({ map: t, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  });
  return new THREE.Mesh(g, mat);
}

const geoCache = new Map<string, THREE.BufferGeometry>();
/** With `fade` off (before pictures): the session-9 shape, without the body-shape fields and barbels. */
const shaped = (p: Plan): Plan => (fish3d.fade ? p : { ...p, belly: 0, wide: 0, pedT: undefined, step: 0, noseW: 0, barbels: 0 });
const matCache = new Map<string, THREE.MeshBasicMaterial>();

/**
 * Colours bled outward into the transparent area (the body material is opaque, so where the solid reaches past the
 * painted outline, near the nose and at grazing angles, it would show the black of empty texels).
 */
function bledTexture(map: THREE.Texture) {
  const src = map.image as HTMLCanvasElement, c = document.createElement('canvas'), t = document.createElement('canvas');
  c.width = t.width = src.width; c.height = t.height = src.height;
  const ctx = c.getContext('2d')!, tc = t.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  for (let k = 0; k < 10; k++) {
    tc.clearRect(0, 0, t.width, t.height); tc.drawImage(c, 0, 0);
    ctx.globalCompositeOperation = 'destination-over';
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) ctx.drawImage(t, dx, dy);
    ctx.globalCompositeOperation = 'source-over';
  }
  // the nose tip's columns stretch over the whole front of the head: soften them into a smooth blend there
  const bl = document.createElement('canvas'); bl.width = c.width; bl.height = c.height;
  const bc = bl.getContext('2d')!; bc.filter = `blur(${Math.round(c.width * 0.008)}px)`; bc.drawImage(c, 0, 0); bc.filter = 'none';
  const mk = bc.createLinearGradient(c.width * 0.84, 0, c.width * 0.96, 0); mk.addColorStop(0, 'rgba(0,0,0,0)'); mk.addColorStop(1, '#000');
  bc.globalCompositeOperation = 'destination-in'; bc.fillStyle = mk; bc.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bl, 0, 0);
  const tex = (cv: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = map.colorSpace; t.anisotropy = 16; return t; };
  // the blurred copy shown where the surface turns away from the side (see aqPatch)
  const pl = document.createElement('canvas'); pl.width = c.width; pl.height = c.height;
  const pc = pl.getContext('2d')!;
  if (fish3d.wrap) {
    // lengthwise: two box averages along the body, so markings across it (bars, spots) dissolve into the colour
    // around them while lengthwise fields and stripes stay; then the round blur as before
    const n = 16, r = c.width * SMEAR;
    let src: HTMLCanvasElement = c;
    for (let pass = 0; pass < 2; pass++) {
      const acc = document.createElement('canvas'); acc.width = c.width; acc.height = c.height;
      const ac = acc.getContext('2d')!;
      for (let k = 0; k < n; k++) { ac.globalAlpha = 1 / (k + 1); ac.drawImage(src, Math.round(-r + 2 * r * k / (n - 1)), 0); }
      src = acc;
    }
    pc.filter = `blur(${Math.round(c.width * PLAIN_BLUR)}px)`; pc.drawImage(src, 0, 0);
  } else { pc.filter = `blur(${Math.round(c.width * PLAIN_BLUR)}px)`; pc.drawImage(c, 0, 0); }
  return { map: tex(c), plain: tex(pl) };
}
/** Blur of the turned-away paint (widths): wider than a bar or band, narrower than a colour field. */
const PLAIN_BLUR = 0.03;
/** Lengthwise smear of the turned-away paint (box half-width, widths; applied twice): wider than any bar or spot. */
const SMEAR = 0.08;
/** How squarely the surface must face the side (|normal.z|) before the sharp paint shows: the plain copy below x, the paint above y. */
const SIDE = new THREE.Vector2(0.45, 0.9);
/** `Plan.sharp` fish (one large clean patch): the sharp paint is shown everywhere but at the very silhouette (aqG still fades it there). */
const SIDE_SHARP = new THREE.Vector2(0, 0.05);

/** Eye dome texture by angle from the pole (SphereGeometry: top pole = uv.y 1): pupil, iris, then dark rim. */
function eyeTexture(iris: [string, string]) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const ctx = c.getContext('2d')!, g = ctx.createLinearGradient(0, 0, 0, 128);
  // a big black pupil and a narrow, dark-edged iris: a pale wide ring reads as a cartoon eye
  g.addColorStop(0, '#050606'); g.addColorStop(0.2, '#0a0b0c'); g.addColorStop(0.23, iris[1]); g.addColorStop(0.27, iris[0]);
  g.addColorStop(0.33, iris[1]); g.addColorStop(0.38, '#20221d'); g.addColorStop(1, '#20221d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const domes = new Map<number, THREE.BufferGeometry>();
/** Eye dome, `b` = its height (share of the radius): flat for most fish, rounder for bulging eyes (puffers). */
const dome = (b = 0.38) => { let g = domes.get(b); if (!g) { g = new THREE.SphereGeometry(1, 24, 16); g.scale(1, b, 1); g.userData.keep = true; domes.set(b, g); } return g; };

/**
 * Fish stand out (render.pop): a dark outline round the solid body, drawn as the body's back faces pushed out along
 * the normals by a constant width on screen (2.5 px x render.pop, at least 1 px; the same width as the fins' line, lighting.ts AQ_MAP), so only a rim shows past the body.
 * Set per viewport by the viewer: `uPop` = render.pop, `uVpH` = the viewport's height in CSS px.
 */
export const OUTLINE = { uPop: { value: 0 }, uVpH: { value: 1 } };
/**
 * A silhouette line round a solid: its back faces pushed out along the normals by `px` (a GLSL expression, CSS px on
 * screen; may use uPop), in `color`. `gated`: hidden while render.pop is 0 (the fish body's); the furniture's (build.ts
 * `ink`) is always drawn.
 */
export function hullMaterial(px: string, color: THREE.Color, gated = true) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...OUTLINE, uCol: { value: color } }, side: THREE.BackSide,
    vertexShader: `uniform float uPop, uVpH;
void main() {
  vec4 p = modelMatrix * vec4(position, 1.0); vec3 n = normalize(mat3(modelMatrix) * normal);
  float d = max(-(viewMatrix * p).z, 1.0);
  p.xyz += n * (${px}) * 2.0 * d / (projectionMatrix[1][1] * uVpH);
  gl_Position = projectionMatrix * viewMatrix * p;
}`,
    fragmentShader: `uniform float uPop; uniform vec3 uCol; void main() { ${gated ? 'if (uPop < 0.01) discard; ' : ''}gl_FragColor = vec4(uCol, 1.0); }`,
  });
  m.userData.cached = true;
  return m;
}
// the line thins on a fish that is small on screen (a 40 px ember wore a 2.5 px ring: ~4 % of its size, at most): d is the vertex depth, modelMatrix[0] the fish's width
const outlineMat = hullMaterial('clamp(length(modelMatrix[0].xyz) * projectionMatrix[1][1] * uVpH / (2.0 * d) * 0.04, 1.0, max(2.5 * uPop, 1.0))', new THREE.Color(0.05, 0.04, 0.035));

const fishMat = (key: string, make: () => THREE.MeshBasicMaterial) => {
  let m = matCache.get(key);
  if (!m) { m = make(); m.userData.cached = true; m.userData.fish = true; matCache.set(key, m); }
  return m;
};

/**
 * The solid body + eyes for a fish card of width w; add it as a child of the card mesh. `map` = the species' body
 * texture (painted without eye, gill and mouth). Geometry is shared per species + bend. `cling` = on the glass: the
 * paired fins pressed out flat.
 */
export function fishBody(art: string, aspect: number, w: number, bend: number, map: THREE.Texture, edge: EdgeMode, cling = false) {
  if (isShrimp3D(art)) return shrimpBody(art, w); // shrimp: their own body plan (shrimp3d.ts)
  const p = shaped(bodyPlan(art)!), b = Math.round(bend * 20) / 20, key = `${art}|${aspect}|${b}|${fish3d.fade}`;
  let g = geoCache.get(key); if (!g) { g = bodyGeometry(p, aspect, b); geoCache.set(key, g); }
  const grp = new THREE.Group(); grp.scale.setScalar(w);
  grp.add(new THREE.Mesh(g, fishMat(`body:${map.uuid}:${fish3d.fade}:${fish3d.wrap}`, () => {
    const t = bledTexture(map), m = new THREE.MeshBasicMaterial({ map: t.map, vertexColors: true }); if (fish3d.fade) { m.userData.plain = p.sharp ? t.map : t.plain; m.userData.side = p.sharp ? SIDE_SHARP : fish3d.wrap ? SIDE : new THREE.Vector2(0.3, 0.75); } return m;
  })));
  { const o = new THREE.Mesh(g, outlineMat); o.userData.nolight = true; grp.add(o); }
  for (const e of eyePlacements(p, b)) {
    const m = new THREE.Mesh(dome(e.bulge), fishMat('eye:' + art, () => new THREE.MeshBasicMaterial({ map: eyeTexture(e.iris) })));
    m.scale.setScalar(e.r); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.n);
    m.position.copy(e.pos).addScaledVector(e.n, -e.r * (0.3 - 0.5 * (e.bulge - 0.38))); // set into the head, bulging a little (rounder domes sit less deep)
    grp.add(m);
  }
  const belly = bellyPlate(art, p, b); if (belly) grp.add(belly);
  if (p.tail.split) for (const m of splitTail(art, p, b, edge)) grp.add(m);
  if (p.analSplit && p.anal && !p.gono) for (const m of splitAnal(art, p, b, edge)) grp.add(m);
  for (const f of finMeshes(art, p, b, edge, cling)) grp.add(f);
  if (p.limbs) {
    const mat = (c?: string) => fishMat(`limb:${art}:${c ?? ''}`, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(c ?? p.shade[0]).multiplyScalar(0.9) })); // own colour (cleaner shrimp's white antennae) or the back's
    for (const m of limbMeshes(art, p, b, mat)) grp.add(m);
  }
  if (p.gape) for (const m of gapeMeshes(art, p, b, fishMat('gape:' + art, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(p.shade[0]).multiplyScalar(0.35) })))) grp.add(m);
  if (p.barbels) {
    const mat = fishMat('barbel:' + art, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(p.shade[2]).multiplyScalar(0.85) }));
    for (const m of barbelMeshes(p, b, mat)) grp.add(m);
  }
  return grp;
}

/**
 * The fish card's plane, subdivided and rippled for plans with `drape` (betta): the median fins (the part of the card
 * outside the body) wave out of the plane, more toward the tail, so seen edge-on they read as a fin and not a board.
 * Null for plans without it (the plain card geometry is used).
 */
export function drapedCard(art: string, w: number, h: number, bend: number): THREE.BufferGeometry | null {
  const p = bodyPlan(art); if (!p?.drape) return null;
  const prof = profile(p), g = new THREE.PlaneGeometry(w, h, 40, 16), pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), u = x / w + 0.5, v = -pos.getY(i) / w, [t, b] = prof(Math.max(u, p.pedU));
    const out = Math.max(0, t - v, v - b), ramp = smooth(0.01, 0.14, out), tailer = 1 + 1.5 * smooth(p.pedU + 0.1, 0, u);
    pos.setZ(i, bendZ(bend, x / w) * w + p.drape * w * ramp * tailer * Math.sin(u * 10 + 0.7));
  }
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
