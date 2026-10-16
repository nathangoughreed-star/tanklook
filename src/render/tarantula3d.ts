// Tarantulas in 3D (lane TA, 2026-10-16; roadmap Release 2): the large-arachnid body plan, built on the jumping spider's
// pattern (render/spider3d.ts: lofts, painted textures, two-bone IK legs, hair) but a different animal: a heavy rounded
// carapace with a dented central fovea and a small eye tubercle at the front carrying all eight (small, close-set) eyes, big
// chelicerae with curved fangs, thick palps, a big round abdomen with a bald urticating-hair patch of short red bristles, and
// eight stout legs of seven segments (coxa, trochanter, femur, patella, tibia, metatarsus, tarsus) with pale golden knees,
// scopulae pads under the tarsi, tiny claws and a dense long coat. Per species only data (art/tarantulas.ts). The male
// carries a hook on the tibia of each front leg. Unlit like the herps: shading baked into vertex colours.
// Poses: 'ground' (floor, ledge, cork, rock: walking, an alternating tetrapod swinging), 'glass' (pane or 3D wall: all
// eight feet planted, belly close, any heading) and 'perch' (over a branch); each in a mode from the animal's `bend`:
// 'walk' (< .45), 'tuck' (resting, legs folded, belly low: .45-.85) and 'threat' (>= .85: rears up on the hind legs,
// front pair raised, fangs out and apart).
// Frame: unit = the body length = the card width; x forward, y up, z + side; the surface it stands on is the plane
// y = -ground (on a branch: the limb's top, its axis at y = -ground - R).
import * as THREE from 'three';
import { TARANTULAS, isTarantula, tarGround, type TarLeg, type TarSpec } from '../art/tarantulas';
import { V, bandedChain, cylinder, fuzz, ik, merge, plane, smooth, tint, type Surf } from './limbs';
import { boxUV, jointTube } from './herp3d';
import { clampAbove, eyeTexture, geo, grainTexture, loft, mat, paint, texture, type Loft, type Paint } from './spider3d';

export { isTarantula };
export type TarPose = 'ground' | 'glass' | 'perch';
export type TarMode = 'walk' | 'threat' | 'tuck';

/** A hex colour as a vertex colour: sRGB in, linear out (the textures decode the same way; the jumping spider's raw values read lighter). */
const col = (h: string, k = 1) => new THREE.Color(h).multiplyScalar(k * LIT);
/** The tank's light roughly doubles and saturates an animal's vertex colours (render/lighting.ts aqFish), so they are authored darker. */
const LIT = 0.42;

/** How far the feet sit off the surface (body lengths): the tarsus tip's radius. */
const TIP = 0.02;
const RG = 36, NC = RG + 1, NX = 64;

/** The mode a land animal's `bend` stands for (true = a threat). Random floor bends stay under .4, so they read as 'walk'. */
export const tarMode = (a?: number | boolean): TarMode => { const b = a === true ? 1 : a || 0; return b >= 0.85 ? 'threat' : b >= 0.45 ? 'tuck' : 'walk'; };
export function tarPose(surface?: string, R?: number): TarPose {
  return surface === 'glass' ? 'glass' : surface === 'perch' && R ? 'perch' : 'ground';
}

const bare = (g: THREE.BufferGeometry) => {
  const o = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(o.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') o.deleteAttribute(k);
  return o;
};

/** Height of the carapace's top surface above the point (x, z) (from the loft's own formula), or null off the side. */
function topY(S: TarSpec, L: Loft, x: number, z: number) {
  const c = L.sec(x), r = Math.abs(z) / c.hw;
  if (r >= 1) return null;
  const sn = r ** (S.eT / 2), cs = Math.sqrt(1 - sn * sn);
  return c.yc + c.top * cs ** (2 / S.eT);
}
/** The fovea: a shallow pit on the carapace's back (a smooth dip about (x, 0)); the loft's seam columns are re-joined after. */
function dent(g: THREE.BufferGeometry, f: TarSpec['fovea']) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y > 0.14) p.setY(i, y - f.depth * Math.exp(-(((x - f.x) / 0.03) ** 2 + (z / f.hw) ** 2)));
  }
  g.computeVertexNormals();
  const nm = g.attributes.normal, t = V(), u = V();
  for (let i = 0; i <= NX; i++) { const a = i * NC, b = a + RG; t.fromBufferAttribute(nm, a); u.fromBufferAttribute(nm, b); t.add(u).normalize(); nm.setXYZ(a, t.x, t.y, t.z); nm.setXYZ(b, t.x, t.y, t.z); }
  return g;
}

// ---------- legs ----------

interface Cx { S: TarSpec; G: number; surf: Surf; pose: TarPose; mode: TarMode; R: number; body: THREE.Matrix4 }

/** One leg on one side: IK from the end of the trochanter to a tarsus tip on the surface (or, raised, in the air). Returns
 *  the joint points: hip, coxa end, trochanter end, femur end, patella end (the knee), tibia end, metatarsus end, tip. */
function legPoints(cx: Cx, l: TarLeg, i: number, side: number) {
  const { G, surf, pose, mode, R, body } = cx;
  // alternating tetrapod: legs 1 and 3 of one side with 2 and 4 of the other swing together
  const swing = mode === 'walk' && pose === 'ground' && i % 2 === (side > 0 ? 0 : 1);
  const hip = V(l.hx, 0.03, side * l.hz).applyMatrix4(body);
  let fx = l.foot[0], fz = l.foot[1];
  if (mode === 'tuck') { fx = l.hx + (fx - l.hx) * 0.46 + 0.03; fz = l.hz + (fz - l.hz) * 0.42 + 0.1; }
  if (pose === 'glass') fz *= 1.08;
  if (swing) fx += 0.075;
  const raised = mode === 'threat' && i === 0, half = mode === 'threat' && i === 1;
  const sg = Math.sign(fx - l.hx) || 1;
  const P1 = hip.clone().add(V(0.12 * sg, -0.3, side).normalize().transformDirection(body).multiplyScalar(l.len[0]));
  const P1b = P1.clone().add(V(0.1 * sg, 0.2, side).normalize().transformDirection(body).multiplyScalar(l.len[1]));
  const a = l.len[2] + l.len[3], b = l.len[4] + l.len[5] + l.len[6];
  let F: THREE.Vector3, pole = V(0, 1, 0).addScaledVector(V(0, 0, side), mode === 'tuck' ? 0.55 : 0.25);
  if (raised) {
    // the front pair up and forward, a little apart, one waving higher than the other
    F = P1b.clone().add(V(0.7, 0.5 + (side > 0 ? 0.07 : -0.02), side * 0.42));
    pole = V(-0.25, 1, side * 0.9);
  } else if (pose === 'perch') {
    const yA = -G - R, phi = Math.min(1.3, Math.asin(Math.min(1, fz / (R + 0.05))));
    F = surf.snap(V(fx, yA + Math.cos(phi) * (R + 0.03), side * Math.sin(phi) * (R + 0.03)));
  } else F = surf.snap(V(fx, -G, side * fz));
  if (!raised) {
    // out of reach: slide the foot in toward the coxa until the chain spans it
    for (let k = 0; k < 60 && F.distanceTo(P1b) > 0.95 * (a + b); k++) F = surf.snap(F.clone().lerp(surf.snap(P1b), 0.06));
    F.addScaledVector(surf.n(F), TIP + (swing ? 0.06 : 0));
    if (half) { F.add(V(0.06, 0.26, side * -0.05)); pole = V(-0.1, 1, side * 0.6); }
  } else if (F.distanceTo(P1b) > 0.95 * (a + b)) F = P1b.clone().add(F.sub(P1b).setLength(0.95 * (a + b)));
  const K = ik(P1b, F, a, b, pole), pn = pole.clone().normalize();
  // the femur ends a little short of the knee, up toward the pole: the patella is the short joint at the top
  const P2 = P1b.clone().lerp(K, l.len[2] / a).addScaledVector(pn, 0.02);
  const dir = F.clone().sub(K), tib = l.len[4] / b, met = (l.len[4] + l.len[5]) / b;
  const P5 = K.clone().addScaledVector(dir, tib), P6 = K.clone().addScaledVector(dir, met).addScaledVector(pn, -0.014);
  return [hip, P1, P1b, P2, K, P5, P6, F];
}

const cone = (r: number, len: number, at: THREE.Vector3, dir: THREE.Vector3, seg = 5) => {
  const c = new THREE.ConeGeometry(r, len, seg);
  c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize())).translate(at.x, at.y, at.z);
  return bare(c);
};

function legGeometry(cx: Cx, l: TarLeg, i: number, side: number, seed: number) {
  const { S } = cx, pts = legPoints(cx, l, i, side), dark = col(S.legCol[0]), pale = col(S.legCol[1]), fur = col(S.legHair);
  const bands = new Set(S.legBands);
  const parts = bandedChain(pts, [...l.r], (seg, ny) => (bands.has(seg) ? pale : dark.clone().lerp(fur, 0.25)).clone().multiplyScalar(0.62 + 0.38 * smooth(-0.6, 0.4, ny)));
  const leg = merge(parts), extra: THREE.BufferGeometry[] = [];
  // tiny claws and, on the male's front pair, two hooks under the tibia's end
  const F = pts[7], dirT = F.clone().sub(pts[6]).normalize(), nF = cx.surf.n(F);
  for (const s2 of [-1, 1]) extra.push(cone(0.006, 0.03, F.clone().addScaledVector(dirT, 0.01).addScaledVector(nF, -0.012).add(V(0, 0, s2 * 0.012)), dirT.clone().addScaledVector(nF, -0.7).add(V(0, 0, s2 * 0.25))));
  if (S.hooks && i === 0) {
    const t0 = pts[5], t1 = pts[4], ax = t0.clone().sub(t1).normalize(), down = V(0, -1, side * 0.3).addScaledVector(ax, -V(0, -1, side * 0.3).dot(ax)).normalize();
    for (const s2 of [0, 1]) extra.push(cone(0.014, 0.075, t0.clone().addScaledVector(ax, -0.03 - 0.045 * s2).addScaledVector(down, l.r[5] + 0.02), down.clone().addScaledVector(ax, 0.55 - 0.3 * s2)));
  }
  const claws = tint(merge(extra), () => col('#1a110d'));
  // the hair: the leg's own colour at the root (nearest segment), long and dense
  const hair = fuzz(leg, {
    count: S.hair.leg, len: [0.014, 0.034], rad: 0.0052, seed, lean: 0.62, frost: 0,
    flow: () => F.clone().sub(pts[1]).normalize(),
    colour: (p, _uv, c) => {
      let best = 0, bd = 9; for (let k = 0; k < 7; k++) { const m = pts[k].clone().lerp(pts[k + 1], 0.5), d = m.distanceTo(p); if (d < bd) { bd = d; best = k; } }
      return c.copy(bands.has(best) ? pale : dark.clone().lerp(fur, 0.55)).multiplyScalar(1.02);
    },
    keep: (p, n) => (n.dot(cx.surf.n(p)) < -0.4 ? 0.4 : 1),
  });
  // the scopula: a dense pad of short pale hair under the tarsus and the end of the metatarsus
  const pad = fuzz(merge([parts[6], parts[5]]), {
    count: 650, len: [0.007, 0.015], rad: 0.0035, seed: seed + 1, lean: 0.3, frost: 0.05,
    colour: (_p, _u, c) => c.copy(col('#b69a86')),
    keep: (p, n) => (n.dot(cx.surf.n(p)) < -0.1 && p.distanceTo(pts[7]) < 0.3 ? 1 : 0),
  });
  return { leg, claws, hair, pad, pts };
}

// ---------- head parts ----------

function palpGeometry(cx: Cx, side: number) {
  const { S } = cx, P = S.palp, c = col(S.palpCol), fur = col(S.legHair);
  const out = cx.mode === 'threat', pts = P.pts.map(([x, y, z]) => V(x, y + (out ? 0.05 : 0), side * z * (out ? 1.7 : 1)).applyMatrix4(cx.body));
  for (const p of pts) { const k = cx.surf.snap(p), d = p.clone().sub(k).dot(cx.surf.n(p)); if (d < 0.03) p.addScaledVector(cx.surf.n(p), 0.03 - d); }
  const tube = bare(jointTube(pts, P.r, 0, true)), n = tube.attributes.normal, cl: number[] = [];
  for (let i = 0; i < n.count; i++) { const k = 0.7 + 0.3 * smooth(-0.6, 0.4, n.getY(i)), q = c.clone().lerp(fur, 0.3); cl.push(q.r * k, q.g * k, q.b * k); }
  tube.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  return { g: tube, hair: fuzz(tube, { count: 1500, len: [0.012, 0.028], rad: 0.0042, seed: side > 0 ? 71 : 72, lean: 0.45, frost: 0, flow: () => V(0.5, -0.2, 0), colour: (_p, _u, cc) => cc.copy(c).lerp(fur, 0.45) }) };
}

function chelGeometry(cx: Cx, side: number) {
  const { S } = cx, C = S.chel, threat = cx.mode === 'threat';
  const spread = threat ? 0.085 : 0.058, a = V(0.49, 0.075, side * spread).applyMatrix4(cx.body);
  const drop = threat ? V(0.075, -0.115, side * 0.03) : V(0.045, -0.12, 0);
  const b = a.clone().add(drop.clone().transformDirection(cx.body).multiplyScalar(drop.length()));
  const tube = bare(jointTube([a, b], [C.r, C.r * 0.8], 0, true)), cc = col(S.chelCol), nm = tube.attributes.normal, cl: number[] = [];
  for (let i = 0; i < nm.count; i++) { const k = 0.6 + 0.4 * smooth(-0.4, 0.8, nm.getY(i)); cl.push(cc.r * k, cc.g * k, cc.b * k); }
  tube.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  // the fang: a curved dark horn from the chelicera's end (folded back in its groove, or swung out forward and apart)
  const sm = (x: number, y: number, z: number) => V(x, y, z).transformDirection(cx.body);
  const dir = threat ? sm(0.75, -0.62, side * 0.28) : sm(-0.18, -1, -side * 0.04), sweep = threat ? sm(0.2, 0.55, side * 0.1) : sm(0.5, 0.25, side * 0.04);
  const f0 = b.clone().addScaledVector(dir, -0.012), f1 = f0.clone().addScaledVector(dir, C.fang * 0.55).addScaledVector(sweep, C.fang * 0.16), f2 = f1.clone().addScaledVector(dir, C.fang * 0.4).addScaledVector(sweep, C.fang * 0.34);
  const fang = bare(jointTube([f0, f1, f2], [0.03, 0.02, 0.003], 0, true));
  const fcol = col('#4a1c0e'), fn = fang.attributes.normal, fc: number[] = [];
  for (let i = 0; i < fn.count; i++) { const k = 0.7 + 0.5 * smooth(-0.5, 0.8, fn.getY(i)); fc.push(fcol.r * k, fcol.g * k, fcol.b * k); }
  fang.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
  const hair = fuzz(tube, { count: 1300, len: [0.012, 0.03], rad: 0.004, seed: side > 0 ? 81 : 82, lean: 0.5, frost: 0, flow: () => b.clone().sub(a), colour: (_p, _u, c2) => c2.copy(col(S.chelCol)).lerp(col(S.legHair), 0.3) });
  return { g: merge([tube, fang]), hair };
}

/** The eye tubercle: a small mound on the carapace's front, tinted like the carapace. */
function tubercle(cx: Cx, car: Loft) {
  const { S } = cx, T = S.tubercle, cy = (topY(S, car, T.x, 0) ?? 0.2) - 0.012 + T.lift;
  const s = new THREE.SphereGeometry(1, 20, 14).scale(T.rx, T.ry, T.rz).translate(T.x, cy, 0).applyMatrix4(cx.body);
  const g = bare(s.toNonIndexed()); g.computeVertexNormals();
  const c = col(S.carapaceCol, 1.2), cl: number[] = [], nm = g.attributes.normal;
  for (let i = 0; i < nm.count; i++) { const k = 0.7 + 0.3 * smooth(-0.5, 0.7, nm.getY(i)); cl.push(c.r * k, c.g * k, c.b * k); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  return { g, cy };
}

function spinnerets(cx: Cx, xEnd: number, yc: number) {
  const out: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const c = new THREE.ConeGeometry(0.02, 0.07, 6); c.rotateZ(Math.PI / 2 + 0.25); c.translate(xEnd - 0.01, yc, s * 0.025); c.applyMatrix4(cx.body);
    out.push(bare(c));
  }
  return tint(merge(out), () => col(cx.S.abdomenCol, 0.8));
}

// ---------- assembly ----------

type Built = { chains: THREE.Vector3[][]; body: THREE.BufferGeometry[]; limbs: THREE.BufferGeometry; hair: THREE.BufferGeometry; eyes: { c: THREE.Vector3; look: THREE.Vector3; r: number; fwd: THREE.Vector3 }[]; paints: Paint[] };
const poseCache = new Map<string, Built>();

function build(S: TarSpec, pose: TarPose, R: number, mode: TarMode): Built {
  const G = tarGround(S), surf: Surf = pose === 'perch' ? cylinder(-G - R, R) : plane(-G);
  const stand = mode === 'tuck' ? S.stand.tuck : pose === 'glass' ? S.stand.glass : S.stand.ground;
  // the body frame: the carapace's underside at -G + stand; a threat rears up about the hind hips
  const pitch = mode === 'threat' ? 0.42 : 0, piv = -0.05;
  const body = new THREE.Matrix4().makeTranslation(0, -G + stand + (mode === 'threat' ? 0.07 : 0), 0)
    .multiply(new THREE.Matrix4().makeTranslation(piv, 0, 0)).multiply(new THREE.Matrix4().makeRotationZ(pitch)).multiply(new THREE.Matrix4().makeTranslation(-piv, 0, 0));
  const inv = body.clone().invert(), cx: Cx = { S, G, surf, pose, mode, R, body };
  const car = loft(S.carapace, S.eT, S.eB, [0.04, 0.03]), abd = loft(S.abdomen, 2.15, 2.3, [0.03, 0.1]);
  dent(car.geo, S.fovea);
  const abdMinX = S.abdomen[S.abdomen.length - 1][0];
  const pCar = paint(S.carapaceCol, S.carapaceMarks, car.x0, car.x1, 0.5), pAbd = paint(S.abdomenCol, S.abdomenMarks, abd.x0, abd.x1, 0.6);
  const up = V(0, 1, 0).transformDirection(body), hairParts: THREE.BufferGeometry[] = [], limbParts: THREE.BufferGeometry[] = [], chains: THREE.Vector3[][] = [];
  const inPatch = (p: THREE.Vector3) => { const q = p.clone().applyMatrix4(inv); return q.y > 0.1 && Math.abs(q.x - S.patch.x) < 0.17 && Math.abs(q.z) < S.patch.hw * (1 - Math.abs(q.x - S.patch.x) * 2.4); };
  const finish = (l: Loft, p: Paint, hairN: number, seed: number, flowX: number, isAbd: boolean, len: [number, number], rad: number) => {
    const g = l.geo.clone(); g.applyMatrix4(body);
    const n = g.attributes.normal, cl: number[] = [], q = V();
    for (let i = 0; i < n.count; i++) { const ny = q.fromBufferAttribute(n, i).dot(up), k = 1 - 0.32 * Math.max(0, -ny) + 0.05 * Math.max(0, ny); cl.push(k * LIT, k * LIT, k * LIT); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    const hair = fuzz(g, {
      count: hairN, len, rad, seed, lean: 0.55, frost: 0,
      flow: () => V(flowX, 0.2, 0).transformDirection(body),
      colour: (_pt, uv, c) => p.at(uv!.x, uv!.y, c).convertSRGBToLinear().multiplyScalar(1.05 * LIT),
      keep: (pt, nn) => (nn.dot(up) < -0.5 ? 0.3 : isAbd && inPatch(pt) ? 0.12 : 1),
    });
    return { g, hair };
  };
  const cB = finish(car, pCar, S.hair.body * 0.4, 11, -1, false, [0.011, 0.024], 0.0042), aB = finish(abd, pAbd, S.hair.body * 0.6, 12, -1, true, [0.018, 0.042], 0.005);
  for (const h of [cB.hair, aB.hair]) if (h) hairParts.push(h);
  // the urticating patch: a bald oval on the back of the abdomen, short stiff red bristles standing up
  const bristles = fuzz(aB.g, { count: 3600, len: [0.008, 0.02], rad: 0.0016, seed: 14, lean: 0.1, frost: 0.05, colour: (_p, _u, c) => c.copy(col(S.patch.col)), keep: pt => (inPatch(pt) ? 1 : 0) });
  if (bristles) hairParts.push(bristles);
  const tb = tubercle(cx, car); limbParts.push(tb.g);
  const tbHair = fuzz(tb.g, { count: 500, len: [0.01, 0.022], rad: 0.002, seed: 15, lean: 0.4, frost: 0.02, flow: () => V(1, 0.1, 0).transformDirection(body), colour: (_p, _u, c) => c.copy(col(S.carapaceCol, 1.5)) });
  if (tbHair) hairParts.push(tbHair);
  for (const side of [1, -1]) {
    S.legs.forEach((l, i) => {
      const L = legGeometry(cx, l, i, side, 100 + i * 7 + (side > 0 ? 0 : 3));
      chains.push(L.pts); limbParts.push(L.leg, L.claws); for (const h of [L.hair, L.pad]) if (h) hairParts.push(h);
    });
    const P = palpGeometry(cx, side); limbParts.push(P.g); if (P.hair) hairParts.push(P.hair);
    const C = chelGeometry(cx, side); limbParts.push(C.g); if (C.hair) hairParts.push(C.hair);
  }
  limbParts.push(spinnerets(cx, abdMinX, S.abdomen[S.abdomen.length - 1][4]));
  const limbs = boxUV(merge(limbParts.map(bare))), hair = merge(hairParts);
  clampAbove(limbs, surf); clampAbove(hair, surf);
  // eight small eyes on the tubercle, two rows of four, all looking up and out along its surface
  const T = S.tubercle, eyes: Built['eyes'] = [], fwd = V(1, 0, 0).transformDirection(body);
  const spot = (dx: number, z: number) => {
    const k = 1 - (dx / T.rx) ** 2 - (z / T.rz) ** 2, y = tb.cy + T.ry * Math.sqrt(Math.max(0.04, k));
    return { c: V(T.x + dx, y - S.eyeR * 0.45, z).applyMatrix4(body), look: V(dx / (T.rx * T.rx), Math.sqrt(Math.max(0.04, k)) / T.ry, z / (T.rz * T.rz)).normalize().transformDirection(body) };
  };
  for (const s of [1, -1]) for (const [dx, z] of [[0.017, 0.013], [0.006, 0.037], [-0.014, 0.012], [-0.014, 0.038]]) eyes.push({ ...spot(dx, s * z), r: S.eyeR, fwd });
  return { chains, body: [cB.g, aB.g], limbs, hair, eyes, paints: [pCar, pAbd] };
}

/**
 * The 3D tarantula for a card of width w (the body length; origin at the card's centre; add it as the card's child), on the
 * surface given: 'glass' (pane or 3D wall), 'perch' with Rmm = the branch's radius in mm, else 'ground'. `bend` = the mode
 * (tarMode): 0 walking, about .5 resting with the legs tucked, 1 the threat pose.
 */
export function tarantulaBody(art: string, w: number, surface?: string, Rmm?: number, bend: number | boolean = 0) {
  const S = TARANTULAS[art], R = Rmm ? Math.round(Rmm / w * 200) / 200 : 0, pose = tarPose(surface, R), mode = tarMode(bend);
  const key = `${art}~${pose}${pose === 'perch' ? '~' + R : ''}~${mode}`;
  let built = poseCache.get(key);
  if (!built) {
    built = build(S, pose, R, mode);
    for (const g of [...built.body, built.limbs, built.hair]) g.userData.keep = true;
    poseCache.set(key, built);
  }
  const b = built, grp = new THREE.Group();
  const tex = (i: number) => mat(`tabody${i}:${art}`, () => new THREE.MeshBasicMaterial({ map: texture(b.paints[i]), vertexColors: true }));
  b.body.forEach((g, i) => grp.add(new THREE.Mesh(g, tex(i))));
  grp.add(new THREE.Mesh(b.limbs, mat('talimb', () => new THREE.MeshBasicMaterial({ vertexColors: true, map: grainTexture() }))));
  grp.add(new THREE.Mesh(b.hair, mat('tahair', () => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }))));
  const dome = geo('taeye', () => new THREE.SphereGeometry(1, 16, 12)), eyeMat = mat('taeye', () => new THREE.MeshBasicMaterial({ map: eyeTexture(false) }));
  for (const e of b.eyes) {
    const look = e.look, f = e.fwd.clone().projectOnPlane(look).normalize();
    if (f.lengthSq() < 0.5) f.set(0, 0, 1).projectOnPlane(look).normalize();
    const m = new THREE.Mesh(dome, eyeMat);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, look, V().crossVectors(f, look))); m.scale.setScalar(e.r); m.position.copy(e.c);
    grp.add(m);
  }
  grp.userData.tarantula = pose; grp.userData.mode = mode;
  grp.scale.setScalar(w);
  return grp;
}

/** The eight leg chains (hip, coxa end, trochanter end, femur end, knee, tibia end, metatarsus end, tip) of a pose, in the body's frame at width w (tests). */
export function tarantulaChains(art: string, w: number, surface?: string, Rmm?: number, bend: number | boolean = 0) {
  const S = TARANTULAS[art], R = Rmm ? Math.round(Rmm / w * 200) / 200 : 0, pose = tarPose(surface, R);
  return build(S, pose, R, tarMode(bend)).chains.map(c => c.map(p => p.clone().multiplyScalar(w)));
}
