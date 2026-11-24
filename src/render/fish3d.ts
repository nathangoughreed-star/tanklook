// 3D fish bodies (roadmap step 1, style test): the body is lofted from the body plan's side profile with a thickness
// per station, and a painted side texture (colours, markings, scales; no eye, gill or mouth, which would smear where
// the surface turns away from the side) is projected onto both flanks. Eyes are real domes set into the head. The flat
// card stays as the fins (thin membranes); its painted body sits inside the solid. Nose and tail tips are unchanged,
// so nose-to-tail stays adult TL.
import * as THREE from 'three';
import { analBox, bodyPlan, finRange, drawAnal, drawTail, eyeSpot, pairedFins, profile, tailBox, type Plan } from '../art/fishgen';
import { FIN_A, FIN_A2C, rng, style } from '../art/paint';
import type { EdgeMode } from '../scene/types';
import { cardMaterial, pairedFinTexture } from './textures';
import { PROJ_ART, type ProjLayer } from '../art/projart';
import { isShrimp3D, shrimpBody } from './shrimp3d';

/** Switches for before/after pictures (every species is drawn in 3D; the flat whole-fish card was removed 2026-10-15). `fade` = the session-10 fixes (turned-away paint fades, card body cut out, body-shape fields, barbels); off = session 9, for pictures. `wrap` = the turned-away paint is smeared lengthwise (bars and spots don't close into hoops over the back and throat); off = session 11's round blur. `merge` = a fish's parts that share a material are one mesh (lane FM: fewer draw calls, same picture); off = one mesh per part, for A/B timing. */
import { SWIM, SWIM_DECL, SWIM_VERT } from './swim';
export const fish3d = { fade: true, wrap: true, merge: true };

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
  // the inset scales with the fish's depth (at most 4 % of its half-depth): a fixed 0.006 was 13 % of a bichir's half-depth, and every
  // card rim kept under a fin root or at the tail stood above or below the solid as a band (method row 59)
  const inset = Math.min(INSET, 0.04 * maxHv);
  return (u: number): Section => {
    const [a, b] = prof(u), s = (u - p.pedU) / (1 - p.pedU), vc = (a + b) / 2, hv = Math.max(0, (b - a) / 2 - inset);
    // thickness follows depth but stays fuller toward the head (fish are widest behind the gills)
    let t = thick * (0.35 * hv + 0.65 * maxHv * Math.sin(Math.min(1, hv / maxHv) * Math.PI / 2)) * (pedT + (1 - pedT) * Math.sqrt(s));
    if (p.halfWidth) { // measured top-view widths: the body is as wide as the sheet's top view at every station (not tied to the depth)
      const h = p.halfWidth; let j = 0; while (j < h.length - 2 && h[j + 1][0] < u) j++;
      const [u0, w0] = h[j], [u1, w1] = h[j + 1], k = Math.min(1, Math.max(0, (u - u0) / (u1 - u0 || 1))); t = Math.max(0, w0 + (w1 - w0) * k - inset * 0.5);
    } else
    if (p.headW) t *= 1 + p.headW * smooth(0.5, 0.82, s); // a broad flat head (pleco), the trunk tapering behind it
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
  const c = Math.cos(th), exp = p.sectionExp ?? EXP, e = c < 0 ? exp * (1 + 2.5 * (p.belly ?? 0)) : exp;
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
function bodyGeometry(p: Plan, aspect: number, bend: number, swim = false) {
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
  // its own copy of the first ring: shared vertices averaged the cap's backward normal into the body's last ring, which then
  // shaded differently and showed as a line where the tail fin starts (E-GEN tang)
  const { vc } = ring(p.pedU), r0 = pos.length / 3, x0 = p.pedU - 0.5;
  for (let j = 0; j <= RING; j++) { pos.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]); uv.push(uv[j * 2], uv[j * 2 + 1]); }
  const c = pos.length / 3;
  pos.push(x0, -vc, bendZ(bend, x0)); uv.push(p.pedU, 0.5 - vc / aspect);
  for (let j = 0; j < RING; j++) idx.push(c, r0 + j + 1, r0 + j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  { // the cap takes the stalk ring's normals (its own face backward was read as turned away and faded dark: a dark sliver at the tail-fin joint seen at an angle)
    const nn = g.attributes.normal as THREE.BufferAttribute;
    for (let j = 0; j <= RING; j++) nn.setXYZ(r0 + j, nn.getX(j), nn.getY(j), nn.getZ(j));
    nn.setXYZ(r0 + RING + 1, 0, 0, 1);
  }
  // aCap 1 = the stalk cap: the outline hull skips it (edge-on from the side its rim drew a dark vertical line where the tail fin starts)
  g.setAttribute('aCap', new THREE.Float32BufferAttribute(Array.from({ length: pos.length / 3 }, (_, i) => (i >= r0 ? 1 : 0)), 1));
  // soft form shading: the belly and the underside of the flanks turn away from the light above
  const n = g.attributes.normal, col: number[] = [];
  for (let i = 0; i < n.count; i++) {
    const ny = n.getY(i), nz = Math.abs(n.getZ(i)), glow = p.shimmer ?? 0;
    // A shallow glancing highlight on luminous flanks. No global lighting requirement (fish use MeshBasicMaterial).
    const k = 1 - 0.28 * Math.max(0, -ny) + 0.04 * Math.max(0, ny)
      + glow * (0.07 * Math.pow(Math.max(0, ny * 0.6 + nz * 0.4), 4) - 0.045 * Math.max(0, -ny));
    col.push(k, k, k);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSwL', new THREE.Float32BufferAttribute(new Array(n.count).fill(swim ? 1 : 0), 1)); // swim in place (swim.ts): 1 = the unit body moves, 0 = holds still
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
    pos: pointAt(p, e.u, th, side, bend), n: normalAtTh(p, e.u, th, side, bend).add(new THREE.Vector3(p.eye.pupilFrac ? 0 : 0.2, 0, 0)).normalize(), /* measured (photo) eyes face straight out: the sheet's pupil is centred */ r: e.r, iris: e.iris, pupil: p.eye.pupil, bulge: p.eye.bulge ?? 0.38, pf: p.eye.pupilFrac,
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
 * A fine operculum seam projected onto the actual head surface, rather than painted onto the flat body card.
 * Geometry follows the head curvature on both flanks. Opt-in per Plan to avoid extra meshes elsewhere.
 */
function gillMeshes(art: string, p: Plan, bend: number, mat: THREE.Material) {
  const out: THREE.Mesh[] = [], gu = 1 - (1 - p.pedU) * 0.2;
  for (const side of [1, -1]) {
    const key = `gill:${art}:${bend}:${side}`;
    let g = geoCache.get(key);
    if (!g) {
      const pts = Array.from({ length: 11 }, (_, i) => {
        const k = i / 10, u = gu - 0.021 * Math.sin(k * Math.PI);
        const [top, bottom] = profile(p)(u), v = top + (bottom - top) * (0.18 + 0.66 * k);
        const th = thetaAt(sections(p)(u), v);
        return pointAt(p, u, th, side, bend).addScaledVector(normalAtTh(p, u, th, side, bend), 0.0014);
      });
      g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.0014, 4, false);
      g.userData.keep = true; geoCache.set(key, g);
    }
    out.push(new THREE.Mesh(g, mat));
  }
  return out;
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

/**
 * Bristlenose tentacles (`p.bristles`): fleshy, forked feelers along each side of the snout rim, growing forward, up and
 * out, the longest at the tip. Tubes tapering from the surface, each with two short branches.
 */
function tentacleMeshes(art: string, p: Plan, bend: number, mat: THREE.Material) {
  const out: THREE.Mesh[] = [];
  for (const side of [1, -1]) {
    const key = `tent:${art}:${bend}:${side}`;
    let g = geoCache.get(key);
    if (!g) {
      const parts: THREE.BufferGeometry[] = [];
      // [u on the head, section angle (pi/2 = the widest point), length, lean outward]
      const ROOTS: [number, number, number, number][] = [[0.992, 1.95, 0.045, 0.15], [0.975, 1.78, 0.052, 0.3], [0.955, 1.7, 0.044, 0.42], [0.934, 1.68, 0.034, 0.5], [0.995, 2.4, 0.022, 0.0]];
      ROOTS.forEach(([u, th, len, lean], i) => {
        const r0 = pointAt(p, u, th, side, bend), n = normalAtTh(p, u, th, side, bend);
        const dir = new THREE.Vector3(1, 0.35, side * lean).add(n.clone().multiplyScalar(0.6)).normalize();
        const end = r0.clone().addScaledVector(dir, len), mid = r0.clone().addScaledVector(dir, len * 0.5).add(new THREE.Vector3(0, 0.006 + i * 0.001, 0));
        parts.push(taperTube(new THREE.QuadraticBezierCurve3(r0.clone().addScaledVector(n, -0.003), mid, end), 0.0068, 8, 6));
        for (const sgn of [-1, 1]) { // two short forks near the tip
          const b0 = mid.clone().lerp(end, 0.55), side2 = new THREE.Vector3(0, 0.45, sgn * 0.55 * (side || 1)).normalize();
          const bend2 = b0.clone().addScaledVector(dir, len * 0.3).addScaledVector(side2, len * 0.28);
          parts.push(taperTube(new THREE.QuadraticBezierCurve3(b0, b0.clone().addScaledVector(dir, len * 0.18), bend2), 0.0036, 5, 5));
        }
      });
      g = mergeGeoms(parts); g.userData.keep = true; geoCache.set(key, g);
    }
    out.push(new THREE.Mesh(g, mat));
  }
  return out;
}
/** Plain concatenation of indexed geometries sharing position / normal / uv attributes. */
function mergeGeoms(parts: THREE.BufferGeometry[]) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = []; let base = 0;
  for (const g of parts) {
    const a = g.attributes; pos.push(...a.position.array as ArrayLike<number> as number[]); nor.push(...a.normal.array as ArrayLike<number> as number[]); uv.push(...a.uv.array as ArrayLike<number> as number[]);
    for (let i = 0; i < g.index!.count; i++) idx.push(base + g.index!.getX(i));
    base += a.position.count; g.dispose();
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); o.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); o.setIndex(idx);
  return o;
}

/**
 * Armour scutes (`p.keel`): a row of small raised bony plates down each flank (the lateral keel of an armoured catfish),
 * overlapping and pointing back, so the flank reads as plate and not a smooth tube.
 */
function scuteMeshes(art: string, p: Plan, bend: number, mat: THREE.Material) {
  const out: THREE.Mesh[] = [];
  for (const side of [1, -1]) {
    const key = `scute:${art}:${bend}:${side}`;
    let g = geoCache.get(key);
    if (!g) {
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 17; i++) {
        const u = p.pedU + 0.04 + (0.8 - p.pedU - 0.04) * i / 16, [t, b] = profile(p)(u);
        for (const row of [0.4, 0.6]) {
          const v = t + (b - t) * row, th = thetaAt(sections(p)(u), v), pt = pointAt(p, u, th, side, bend), n = normalAtTh(p, u, th, side, bend);
          const len = 0.02 * (0.7 + 0.5 * (u - p.pedU)), up = new THREE.Vector3(0, (b - t) * 0.045, 0);
          const a = pt.clone().addScaledVector(n, 0.0012), tip = pt.clone().addScaledVector(n, 0.0022).add(new THREE.Vector3(-len, 0, 0));
          const tri = new THREE.BufferGeometry();
          tri.setAttribute('position', new THREE.Float32BufferAttribute([...a.clone().add(up), ...a.clone().sub(up), ...tip], 3));
          tri.setAttribute('normal', new THREE.Float32BufferAttribute([...n, ...n, ...n], 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 2));
          tri.setIndex(side > 0 ? [0, 1, 2] : [1, 0, 2]);
          parts.push(tri);
        }
      }
      g = mergeGeoms(parts); g.userData.keep = true; geoCache.set(key, g);
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
    style.finA = edge === 'a2c' ? FIN_A2C : FIN_A; style.features = false; style.paired = false;
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
    style.finA = edge === 'a2c' ? FIN_A2C : FIN_A; style.features = false; style.paired = false;
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
function finMeshes(art: string, p: Plan, bend: number, edge: EdgeMode, cling = false, fin = 1) {
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
      // flat (plan option, off by default): held out flat like a fish on the glass all the time (hillstream loach)
      const flat = cling || !!(f.kind === 'pelvic' ? p.pelvic?.flat : p.pec?.flat), mesh = new THREE.Mesh(g, mat), a = (f.spread ?? (flat ? SPLAY : SPREAD)[f.kind]) * (finRange(art) && !cling ? 0.3 + 0.7 * Math.min(1, Math.max(0, fin)) : 1); // a folded fish holds its paired fins close too
      // root slightly inside the surface so the base never shows a gap
      const s = surfaceAt(p, f.root[0], f.root[1], side, bend), z0 = bendZ(bend, s.x);
      mesh.position.set(s.x, s.y, z0 + (s.z - z0) * 0.85);
      if (f.kind === 'pelvic') mesh.rotation.x = -side * a;
      else if (flat) mesh.rotation.set(-side * a, side * (f.sweep ?? 0.35), 0, 'YXZ'); // flat fin: a = swing of its span out about the body axis (pitch/roll), sweep = swing back about the vertical
      else mesh.rotation.set(-side * 0.25, side * a, 0, 'YXZ');
      if (f.kind === 'pectoral' && !flat) mesh.userData.pec = { side, a, rx: -side * 0.25 }; // fanned by the swim sim (render/roam.ts)
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
function eyeTexture(iris: [string, string], pupil = '#050606', fit?: { fp: number; fv: number }) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const ctx = c.getContext('2d')!, g = ctx.createLinearGradient(0, 0, 0, 128);
  if (fit) { // measured eye (photo-built fish): pupil to fp, the iris filling the visible cap up to fv, dark rim under the skin
    const { fp, fv } = fit, m = (fp + fv) / 2;
    g.addColorStop(0, pupil); g.addColorStop(fp, pupil); g.addColorStop(Math.min(fp + 0.012, m), iris[1]); g.addColorStop(m, iris[0]);
    g.addColorStop(fv, iris[1]); g.addColorStop(Math.min(1, fv + 0.03), '#20221d'); g.addColorStop(1, '#20221d');
  } else {
  // a big black pupil and a narrow, dark-edged iris: a pale wide ring reads as a cartoon eye
  g.addColorStop(0, pupil); g.addColorStop(0.2, pupil); g.addColorStop(0.23, iris[1]); g.addColorStop(0.27, iris[0]);
  g.addColorStop(0.33, iris[1]); g.addColorStop(0.38, '#20221d'); g.addColorStop(1, '#20221d');
  }
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
export function hullMaterial(px: string, color: THREE.Color, gated = true, swim = false) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...OUTLINE, ...(swim ? SWIM : {}), uCol: { value: color } }, side: THREE.BackSide,
    vertexShader: `${swim ? SWIM_DECL + ' ' : ''}uniform float uPop, uVpH; varying float vCap;${swim ? ' attribute float aCap;' : ''}
void main() {
  vec3 transformed = position; vCap = ${swim ? 'aCap' : '0.0'};
  ${swim ? SWIM_VERT : ''}
  vec4 p = modelMatrix * vec4(transformed, 1.0); vec3 n = normalize(mat3(modelMatrix) * normal);
  float d = max(-(viewMatrix * p).z, 1.0);
  p.xyz += n * (${px}) * 2.0 * d / (projectionMatrix[1][1] * uVpH);
  gl_Position = projectionMatrix * viewMatrix * p;
}`,
    fragmentShader: `uniform float uPop; uniform vec3 uCol; varying float vCap; void main() { ${gated ? 'if (uPop < 0.01) discard; ' : ''}if (vCap > 0.5) discard; gl_FragColor = vec4(uCol, 1.0); }`,
  });
  m.userData.cached = true;
  return m;
}
// the line thins on a fish that is small on screen (a 40 px ember wore a 2.5 px ring: ~4 % of its size, at most): d is the vertex depth, modelMatrix[0] the fish's width
export const outlineMat = hullMaterial('clamp(length(modelMatrix[0].xyz) * projectionMatrix[1][1] * uVpH / (2.0 * d) * 0.04, 1.0, max(2.5 * uPop, 1.0))', new THREE.Color(0.05, 0.04, 0.035), true, true);

/**
 * Projected face layer (projart.ts): a copy of the body that shares its positions, normals and swim attribute but has its own UVs
 * (top: x along the card, z across it; front: z across, y up) and a vertex alpha that fades in where the surface faces up / forward.
 */
function projGeometry(g: THREE.BufferGeometry, kind: 'top' | 'front', L: ProjLayer) {
  const pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color, n = pos.count;
  const uv = new Float32Array(n * 2), c4 = new Float32Array(n * 4);
  const [a0, a1] = L.ramp ?? (kind === 'top' ? [0.45, 0.8] : [0.35, 0.75]);
  const iw = (L.img as HTMLCanvasElement).width, ih = (L.img as HTMLCanvasElement).height;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (kind === 'top') { uv[2 * i] = x + 0.5; uv[2 * i + 1] = 0.5 - z * iw / ih; }
    else { const k = L.k ?? 500; uv[2 * i] = 0.5 + z * k / iw; uv[2 * i + 1] = 0.5 + (y - (L.y0 ?? 0)) * (L.ky ?? k) / ih; }
    const f = kind === 'top' ? nor.getY(i) : nor.getX(i), t = Math.min(1, Math.max(0, (f - a0) / (a1 - a0)));
    c4[4 * i] = c4[4 * i + 1] = c4[4 * i + 2] = col.getX(i); c4[4 * i + 3] = t * t * (3 - 2 * t);
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', pos); o.setAttribute('normal', nor); o.setAttribute('aSwL', g.attributes.aSwL);
  o.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); o.setAttribute('color', new THREE.BufferAttribute(c4, 4));
  o.setIndex(g.index); o.userData.keep = true;
  return o;
}
const projGeoCache = new Map<string, THREE.BufferGeometry>();

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
export function fishBody(art: string, aspect: number, w: number, bend: number, map: THREE.Texture, edge: EdgeMode, cling = false, fin = 1, swim = false) {
  if (isShrimp3D(art)) return shrimpBody(art, w); // shrimp: their own body plan (shrimp3d.ts)
  const p = shaped(bodyPlan(art)!), b = Math.round(bend * 20) / 20, key = `${art}|${aspect}|${b}|${fish3d.fade}|${swim ? 's' : ''}`;
  let g = geoCache.get(key); if (!g) { g = bodyGeometry(p, aspect, b, swim); geoCache.set(key, g); }
  const grp = new THREE.Group(); grp.scale.setScalar(w);
  grp.add(new THREE.Mesh(g, fishMat(`body:${map.uuid}:${fish3d.fade}:${fish3d.wrap}`, () => {
    const t = bledTexture(map), m = new THREE.MeshBasicMaterial({ map: t.map, vertexColors: true }); m.userData.swim = true; if (p.bodyA !== undefined) { m.transparent = true; m.opacity = Math.min(1, p.bodyA + 0.15); m.depthWrite = false; } if (fish3d.fade) { m.userData.plain = p.sharp ? t.map : t.plain; m.userData.side = p.sharp ? SIDE_SHARP : fish3d.wrap ? SIDE : new THREE.Vector2(0.3, 0.75); } return m;
  })));
  if (p.bodyA === undefined) { const o = new THREE.Mesh(g, outlineMat); o.userData.nolight = true; grp.add(o); }
  const pa = PROJ_ART[art];
  if (pa) for (const kind of ['top', 'front'] as const) {
    const L = pa[kind]; if (!L) continue;
    const gk = `${key}|proj|${kind}`; let pg = projGeoCache.get(gk); if (!pg) { pg = projGeometry(g, kind, L); projGeoCache.set(gk, pg); }
    const m = new THREE.Mesh(pg, fishMat(`proj:${kind}:${art}`, () => {
      const t = new THREE.CanvasTexture(L.img as HTMLCanvasElement); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      const pm = new THREE.MeshBasicMaterial({ map: t, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      pm.userData.swim = true; return pm;
    }));
    m.renderOrder = 1; grp.add(m);
  }
  for (const e of eyePlacements(p, b)) {
    // measured eye (pupilFrac set; Nathan 2026-11-23: eyes too small and nearly all pupil): e.r is the eye's radius on the sheet. The head curves
    // away round the eye, so the dome shows almost to its equator and its outline is the eye; a point at polar angle th projects to r sin(th),
    // so the pupil edge sits at asin(pupilFrac) and the iris runs to asin(0.95), the dark rim only at the very edge
    const fit = e.pf ? { fp: Math.asin(Math.min(0.95, e.pf)) / Math.PI, fv: Math.asin(0.95) / Math.PI } : undefined;
    const m = new THREE.Mesh(dome(e.bulge), fishMat('eye:' + art, () => new THREE.MeshBasicMaterial({ map: eyeTexture(e.iris, e.pupil, fit) })));
    m.scale.setScalar(e.r); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.n);
    m.position.copy(e.pos).addScaledVector(e.n, -e.r * (0.3 - 0.5 * (e.bulge - 0.38))); // set into the head, bulging a little (rounder domes sit less deep)
    grp.add(m);
  }
  const belly = bellyPlate(art, p, b); if (belly) grp.add(belly);
  if (p.tail.split) for (const m of splitTail(art, p, b, edge)) grp.add(m);
  if (p.analSplit && p.anal && !p.gono) for (const m of splitAnal(art, p, b, edge)) grp.add(m);
  for (const f of finMeshes(art, p, b, edge, cling, fin)) grp.add(f);
  if (p.limbs) {
    const mat = (c?: string) => fishMat(`limb:${art}:${c ?? ''}`, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(c ?? p.shade[0]).multiplyScalar(0.9) })); // own colour (cleaner shrimp's white antennae) or the back's
    for (const m of limbMeshes(art, p, b, mat)) grp.add(m);
  }
  if (p.gape) for (const m of gapeMeshes(art, p, b, fishMat('gape:' + art, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(p.shade[0]).multiplyScalar(0.35) })))) grp.add(m);
  if (p.gillLine) {
    const mat = fishMat('gill:' + art, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(p.shade[0]).multiplyScalar(0.5), transparent: true, opacity: p.gillLine, depthWrite: false }));
    for (const m of gillMeshes(art, p, b, mat)) grp.add(m);
  }
  if (p.bristles) {
    const mat = fishMat('tent:' + art, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(p.shade[1]).lerp(new THREE.Color(p.shade[2]), 0.3).multiplyScalar(0.95) }));
    for (const m of tentacleMeshes(art, p, b, mat)) grp.add(m);
  }
  if (p.keel) {
    const mat = fishMat('scute:' + art, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(p.keel), side: THREE.DoubleSide }));
    for (const m of scuteMeshes(art, p, b, mat)) grp.add(m);
  }
  if (p.barbels) {
    const mat = fishMat('barbel:' + art, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(p.shade[2]).multiplyScalar(0.85) }));
    for (const m of barbelMeshes(p, b, mat)) grp.add(m);
  }
  if (fish3d.merge) mergeShared(grp);
  return grp;
}

/**
 * One draw per material (lane FM): the group's meshes that share a material (the two eyes, the two gape lines, each pair
 * of paired fins, the barbels, a doubled tail or anal) become one mesh, their own transforms baked into the vertices,
 * in the place of the first of them (so the material's first appearance, and its rank in the opaque sort, stay). Normals
 * are carried by mat3 of the transform, unnormalized, as the lit shader's `mat3(modelMatrix) * normal` takes them.
 */
export function mergeShared(grp: THREE.Group) {
  const by = new Map<THREE.Material, THREE.Mesh[]>();
  for (const o of grp.children) { const m = o as THREE.Mesh; if (m.isMesh && !Array.isArray(m.material)) by.set(m.material, [...by.get(m.material) ?? [], m]); }
  for (const [mat, parts] of by) {
    if (parts.length < 2) continue;
    for (const m of parts) m.updateMatrix();
    const key = 'merge:' + parts.map(m => m.geometry.uuid + ':' + m.matrix.elements.join(',')).join('|');
    let g = geoCache.get(key);
    if (!g) { const b = bakeMerge(parts); if (!b) continue; geoCache.set(key, g = b); }
    const one = new THREE.Mesh(g, mat);
    grp.children[grp.children.indexOf(parts[0])] = one; one.parent = grp;
    for (const m of parts) { if (m !== parts[0]) grp.remove(m); m.parent = null; }
  }
}

/** The parts' geometries in the group's frame, one after the other (null if their attributes differ or one is mirrored). */
function bakeMerge(parts: THREE.Mesh[]) {
  const names = Object.keys(parts[0].geometry.attributes).sort();
  if (parts.some(m => Object.keys(m.geometry.attributes).sort().join() !== names.join() || !m.geometry.index || m.matrix.determinant() <= 0)) return null;
  const n = parts.reduce((s, m) => s + m.geometry.attributes.position.count, 0), out: Record<string, Float32Array> = {}, idx: number[] = [];
  for (const k of names) out[k] = new Float32Array(n * parts[0].geometry.attributes[k].itemSize);
  const v = new THREE.Vector3(), N = new THREE.Matrix3();
  let base = 0;
  for (const m of parts) {
    const ga = m.geometry.attributes, c = ga.position.count; N.setFromMatrix4(m.matrix);
    for (const k of names) {
      const a = ga[k], s = a.itemSize, o = out[k];
      for (let i = 0; i < c; i++) {
        if (k === 'position') { v.fromBufferAttribute(a, i).applyMatrix4(m.matrix); o.set([v.x, v.y, v.z], (base + i) * 3); }
        else if (k === 'normal') { v.fromBufferAttribute(a, i).applyMatrix3(N); o.set([v.x, v.y, v.z], (base + i) * 3); }
        else for (let j = 0; j < s; j++) o[(base + i) * s + j] = a.array[i * s + j];
      }
    }
    const ix = m.geometry.index!;
    for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
    base += c;
  }
  const g = new THREE.BufferGeometry();
  for (const k of names) g.setAttribute(k, new THREE.BufferAttribute(out[k], parts[0].geometry.attributes[k].itemSize));
  g.setIndex(idx); g.userData.keep = true; // shared across rebuilds
  // the parts' own boxes, turned: what Box3.setFromObject took from them (the review sheets and preview tile frame by it)
  g.boundingBox = new THREE.Box3();
  for (const m of parts) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); g.boundingBox.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrix)); }
  return g;
}

/**
 * The fish card's plane, subdivided for plans with `drape` (betta: the median fins, the part of the card outside the body,
 * wave out of the plane, more toward the tail, so seen edge-on they read as a fin and not a board) and for fish whose fin
 * posture `fin` (lane FE1: 0 folded .. 1 erect, the drawn card) is below 1. Folding turns each point of the dorsal and anal
 * fins about its own base on the back or belly line, back toward the tail by (1 - fin) x 77 degrees, so the rays lie down
 * along the body and the fan closes on itself (it is a rotation, not a squash: the rays keep their length, the fin's height
 * above the body shrinks by the cosine). The fin ends on the body's outline there (never inside the solid), and the tail
 * fin and the body itself stay. Null for plans with neither (the plain card geometry is used).
 */
export const FOLD_MAX = 1.35;
/** Whether this body plan can swim in place (swim.ts): the plain one-tail fish. A doubled tail or anal (fantail goldfish) is built from separate pieces that would not follow the body: still for now. */
export const swims = (art: string) => { const p = bodyPlan(art); return !!p && !isShrimp3D(art) && !p.tail.split && !p.analSplit && !p.limbs; };
export function drapedCard(art: string, w: number, h: number, bend: number, fin = 1): THREE.BufferGeometry | null {
  const p = bodyPlan(art), fold = p && finRange(art) ? (1 - Math.min(1, Math.max(0, fin))) * FOLD_MAX : 0;
  if (!p || !(p.drape || fold > 0.01)) return null;
  const prof = profile(p), g = new THREE.PlaneGeometry(w, h, fold ? 120 : 40, fold ? 64 : 16), pos = g.attributes.position, sa = Math.sin(fold), ca = Math.cos(fold);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = 0;
    const u = x / w + 0.5, v = -y / w, [t, b] = prof(Math.max(u, p.pedU));
    if (p.drape) { const out = Math.max(0, t - v, v - b), ramp = smooth(0.01, 0.14, out), tailer = 1 + 1.5 * smooth(p.pedU + 0.1, 0, u); z = p.drape * w * ramp * tailer * Math.sin(u * 10 + 0.7); }
    if (fold && u > p.pedU) {
      const up = t - v, dn = v - b;
      if (up > 0 || dn > 0) {
        const out = Math.max(up, dn), u2 = Math.max(0.02, u - out * sa * 0.55), [t2, b2] = prof(Math.max(u2, p.pedU));
        const v2 = up > 0 ? Math.min(t - out * ca, t2 - 0.003) : Math.max(b + out * ca, b2 + 0.003); // lifted by its own base, never below the outline it lies over (continuous: no shards over a body's apex)
        x = (u2 - 0.5) * w; y = -v2 * w;
      }
    }
    pos.setXYZ(i, x, y, bendZ(bend, x / w) * w + z);
  }
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
