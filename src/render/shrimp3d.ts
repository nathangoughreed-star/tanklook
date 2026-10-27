// 3D shrimp (anatomy audit P0, lane M): a decapod body plan, not a lofted fish. A cephalothorax (carapace) and six
// abdominal segments, each its own shell lofted along one bent spine, the front of each tucked under the rear rim of
// the one before (the steps are geometry, not drawn lines), the pleura hanging down the flanks; a toothed rostrum,
// stalked eyes, antennules and long antennae; five pairs of jointed walking legs under the carapace (the first two
// small, carried forward), five pairs of small biramous swimmerets under the abdomen; and a flat tail fan (telson and
// two uropods each side) spread horizontally. Species data and paint: art/shrimps.ts. Unit frame as a fish card:
// width 1, x = u - 0.5 (head at +x, the rostrum tip at x = 0.5), y up, z to the side; the legs stand on y = -REST,
// the body carried s.stand above its default ride height (the legs reach down the extra).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SHRIMP3D, type Shrimp3D } from '../art/shrimps';
import { hullMaterial, taperTube } from './fish3d';

export const isShrimp3D = (art: string) => art in SHRIMP3D;
/** Ground below the card's centre line (widths): the card's resting offset (fishgen SHRIMP_META.rest). */
const REST = 0.16;

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.Material>();
function mat<M extends THREE.Material>(key: string, make: () => M): M {
  let m = matCache.get(key) as M | undefined;
  if (!m) { m = make(); m.userData.cached = true; m.userData.fish = true; matCache.set(key, m); }
  return m;
}
function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key); if (!g) { g = make(); g.userData.keep = true; geoCache.set(key, g); }
  return g;
}
const smooth = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const spE = (c: number, e: number) => Math.sign(c) * Math.abs(c) ** (2 / e);
const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
const Z = V(0, 0, 1);

/** Soft form shading as the fish body: undersides turn away from the light above; `k` scales it per vertex. */
function shade(g: THREE.BufferGeometry, k?: number[]) {
  g.computeVertexNormals();
  const n = g.attributes.normal, col: number[] = [];
  for (let i = 0; i < n.count; i++) { const ny = n.getY(i), s = (1 - 0.3 * Math.max(0, -ny) + 0.05 * Math.max(0, ny)) * (k ? k[i] : 1); col.push(s, s, s); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

// ---------- body ----------

/** Where the parts sit along the spine (fractions of its length) and the six segments' relative lengths. */
const CARA = 0.4, SEG = [1, 1.05, 1.05, 0.95, 0.9, 1.25];
const segRange = (k: number) => {
  const tot = SEG.reduce((a, b) => a + b), a = SEG.slice(0, k).reduce((s, b) => s + b, 0);
  return [CARA + (1 - CARA) * a / tot, CARA + (1 - CARA) * (a + SEG[k]) / tot];
};

/** The body's centre line, head to tail: the carapace level, the abdomen arched (`hump`) and the tail carried lower. */
function spine(s: Shrimp3D) {
  const xf = 0.5 - s.rost, xr = xf - 0.27, h = s.hump, xe = -0.38;
  const curve = new THREE.CatmullRomCurve3([V(xf, -0.026), V(xr + 0.12, -0.022), V(xr, -0.01 + 0.01 * h), V(xr - 0.13, 0.004 + 0.022 * h), V(xr - 0.26, -0.014 - 0.012 * h), V(xe, -0.055 - 0.045 * h)], false, 'centripetal');
  return {
    xf, curve,
    /** Centre, up-normal and tangent (toward the tail) at fraction t. */
    at(t: number) { const c = curve.getPointAt(t), tg = curve.getTangentAt(t); return { c, n: V(tg.y, -tg.x).normalize(), t: tg }; },
  };
}

/** A section: half-depth up and down, half-thickness, pleura (side plates hanging below the keel line). */
type Sec = { hv: number; t: number; pl: number };
/** Section outline at angle th (0 = dorsal midline, pi = keel; + flank at pi/2): [up, z]. */
function ring({ hv, t, pl }: Sec, th: number): [number, number] {
  const c = Math.cos(th), sn = Math.sin(th), e = 2.3;
  if (c >= 0) return [hv * spE(c, e), t * spE(sn, e)];
  return [-hv * (Math.abs(c) ** (2 / e) + pl * 2 * Math.abs(sn * c)), t * spE(sn, e) * (1 - 0.15 * pl * Math.abs(c))];
}

const NR = 26; // points round a section
/**
 * One shell lofted along the spine from fraction s0 (front) to s1 (rear): `sec(f)` the section at local f (0 front ..
 * 1 rear), `k(f)` its scale (ends rounded closed). Skin uv = (spine fraction, 0 dorsal .. 1 keel); vertex shade `dk`.
 */
function shellPart(sp: ReturnType<typeof spine>, s0: number, s1: number, n: number, sec: (f: number) => Sec, k: (f: number) => number, dk: (f: number) => number) {
  const pos: number[] = [], uv: number[] = [], shadeK: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const f = 1 - (0.5 - 0.5 * Math.cos(Math.PI * i / n)); // rear to front (x rising, as the fish loft), dense at the ends
    const s = s0 + (s1 - s0) * f, fr = sp.at(Math.min(1, Math.max(0, s))), q = sec(f), kk = k(f);
    for (let j = 0; j <= NR; j++) {
      const th = j / NR * Math.PI * 2, [up, z] = ring(q, th);
      const p = fr.c.clone().addScaledVector(fr.n, up * kk).addScaledVector(Z, z * kk);
      pos.push(p.x, p.y, p.z);
      uv.push(Math.min(1, Math.max(0, s)), 1 - (th <= Math.PI ? th : Math.PI * 2 - th) / Math.PI);
      shadeK.push(dk(f));
    }
  }
  const R = NR + 1;
  for (let i = 0; i < n; i++) for (let j = 0; j < NR; j++) { const a = i * R + j, b = a + R; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return shade(g, shadeK);
}

/** Rounded closed ends: scale 0 at f = 0 and 1, full beyond `a` from the front and `b` from the rear. */
const ends = (a: number, b: number) => (f: number) => {
  const q = (d: number, r: number) => { const x = Math.min(1, d / r); return Math.sqrt(Math.max(0, 1 - (1 - x) ** 2)); };
  return q(f, a) * q(1 - f, b);
};

/** Depth of the body (half, widths) along the abdomen: deep at the first segment, slim at the sixth. */
const HV = 0.068, SEG_HV = [0.066, 0.062, 0.057, 0.05, 0.043, 0.034], SEG_PL = [0.28, 0.36, 0.3, 0.22, 0.14, 0];

function bodyGeometry(s: Shrimp3D) {
  const sp = spine(s), d = s.deep, parts: THREE.BufferGeometry[] = [];
  // carapace: a blunt rounded head end (the eyes and antennae sit on it), full from a third back, a rim at the rear
  parts.push(shellPart(sp, 0, CARA + 0.01, 40,
    f => { const hv = HV * d * (0.62 + 0.38 * smooth(0, 0.45, f)); return { hv, t: hv * 0.76, pl: 0.12 * smooth(0.2, 0.5, f) }; },
    f => ends(0.16, 0.05)(f) * (1 + 0.04 * smooth(0.85, 1, f)), () => 1));
  // abdominal segments: each starts small, tucked under the previous one's rear rim, and ends in a slightly flared rim
  for (let k = 0; k < 6; k++) {
    const [a, b] = segRange(k), ov = (b - a) * (k ? 0.3 : 0.35), hv0 = SEG_HV[k] * d, hv1 = (SEG_HV[k + 1] ?? SEG_HV[5] * 0.85) * d;
    parts.push(shellPart(sp, a - ov, b, 22,
      f => { const hv = hv0 + (hv1 - hv0) * smooth(0.3, 1, f) * 0.6; return { hv, t: hv * (k === 5 ? 0.72 : 0.7), pl: SEG_PL[k] * smooth(0.15, 0.5, f) }; },
      f => ends(0.12, k === 5 ? 0.05 : 0.07)(f) * (0.88 + 0.12 * smooth(0.05, 0.4, f) + 0.05 * smooth(0.75, 1, f)),
      f => 0.78 + 0.22 * smooth(0.25, 0.5, f))); // the tucked front in the shadow of the rim before it
  }
  parts.push(rostrumGeometry(s, sp));
  return mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)))!;
}

/** The rostrum: a thin blade from the top of the carapace front to the tip, toothed along its upper edge. */
function rostrumGeometry(s: Shrimp3D, sp: ReturnType<typeof spine>) {
  const base = sp.at(0.06), b0 = base.c.clone().addScaledVector(base.n, HV * s.deep * 0.62), tip = V(0.5, sp.at(0).c.y + HV * 0.45 + s.up);
  const mid = b0.clone().lerp(tip, 0.5).add(V(0, 0.006 + s.up * 0.3));
  const curve = new THREE.QuadraticBezierCurve3(b0, mid, tip), N = 24, RR = 10, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N, c = curve.getPoint(f), tg = curve.getTangent(f), n = V(-tg.y, tg.x).normalize();
    const hv = 0.011 * (1 - f) ** 0.8 + 0.0008, t = 0.0045 * (1 - f) + 0.0005;
    const tooth = f < 0.75 ? 0.006 * (1 - f) * (1 - ((f * 9) % 1)) : 0; // saw teeth pointing forward
    for (let j = 0; j <= RR; j++) {
      const th = j / RR * Math.PI * 2, cc = Math.cos(th), up = cc > 0 ? (hv + tooth) * spE(cc, 2.4) : hv * 0.8 * spE(cc, 2.4);
      const p = c.clone().addScaledVector(n, up).addScaledVector(Z, t * spE(Math.sin(th), 2.4));
      pos.push(p.x, p.y, p.z); uv.push(0.004, 1 - (th <= Math.PI ? th : Math.PI * 2 - th) / Math.PI);
    }
  }
  const R = RR + 1;
  for (let i = 0; i < N; i++) for (let j = 0; j < RR; j++) { const a = i * R + j, b = a + R; idx.push(a, a + 1, b, a + 1, b + 1, b); } // stations run toward +x, as the fish loft
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return shade(g);
}

function skinTexture(paint: (x: CanvasRenderingContext2D, W: number, H: number) => void, W = 512, H = 128) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!; paint(x, W, H);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- appendages ----------

/** A jointed limb: tapering cylinders between the joints with a small knob at each joint (no uv). */
function jointed(pts: THREE.Vector3[], r: number[]) {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = b.clone().sub(a), L = d.length();
    const c = new THREE.CylinderGeometry(r[i], r[i - 1], L, 7, 1, true).translate(0, L / 2, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); c.translate(a.x, a.y, a.z);
    parts.push(c);
  }
  pts.forEach((p, i) => { if (i < pts.length - 1) parts.push(new THREE.SphereGeometry(r[i] * 1.25, 8, 6).translate(p.x, p.y, p.z)); });
  for (const p of parts) p.deleteAttribute('uv');
  return mergeGeometries(parts.map(p => p.toNonIndexed()))!;
}

/** The + side's legs and swimmerets (one geometry; the far side is the mirror). */
function legGeometry(s: Shrimp3D) {
  const sp = spine(s), G = -REST - s.stand, L = s.legL, parts: THREE.BufferGeometry[] = [];
  // five pairs of walking legs (pereiopods) under the carapace, front to rear (t runs head to tail): the roots spread
  // along it and the feet fan out from them, front pair forward, rear pair back, so no two legs cross
  [0.06, 0.11, 0.17, 0.25, 0.33].forEach((t, i) => {
    const f = sp.at(t), y0 = f.c.y - HV * s.deep * 0.75, x0 = f.c.x, b = V(x0, y0, 0.02);
    if (i === 0 && s.claw) return; // a crayfish's first pair are the big chelae (clawGeometry)
    if (i < 2) { // the two small front pairs (tiny pincers in these shrimp), carried forward and down
      const r = 0.0034;
      parts.push(jointed([b, V(x0 + 0.012, y0 - 0.026, 0.032), V(x0 + 0.04, y0 - 0.042 + i * 0.006, 0.032), V(x0 + 0.062, y0 - 0.046 + i * 0.008, 0.024)], [r, r * 0.9, r * 0.75, r * 0.6]));
      const tip = V(x0 + 0.062, y0 - 0.046 + i * 0.008, 0.024);
      parts.push(new THREE.SphereGeometry(0.005, 8, 6).scale(1.5, 0.8, 0.8).translate(tip.x + 0.004, tip.y, tip.z).deleteAttribute('uv').toNonIndexed());
      return;
    }
    const dx = [0.06, 0, -0.07][i - 2], zf = [0.1, 0.115, 0.105][i - 2] * L, r = 0.0042;
    // coxa down out of the carapace, the knee raised and well out to the side, the shank down and out to the foot
    parts.push(jointed([b, V(x0 + dx * 0.15, y0 - 0.012, 0.036), V(x0 + dx * 0.5, y0 + 0.002 + 0.006 * L, zf * 0.7), V(x0 + dx * 0.82, G + 0.03, zf * 0.94), V(x0 + dx, G + 0.002, zf)], [r, r * 0.95, r * 0.8, r * 0.6, r * 0.4]));
  });
  // swimmerets (pleopods) under abdominal segments 1-5: a short stalk forking into two small paddles, angled forward
  for (let k = 0; k < 5; k++) {
    const [a, b] = segRange(k), f = sp.at((a + b) / 2), fw = f.t.clone().negate(), dn = f.n.clone().negate(), hv = SEG_HV[k] * s.deep;
    const root = f.c.clone().addScaledVector(dn, hv * 0.8).addScaledVector(Z, 0.011);
    const len = 0.038 - k * 0.003, fork = root.clone().addScaledVector(dn, len * 0.45).addScaledVector(fw, len * 0.12).addScaledVector(Z, 0.003);
    parts.push(jointed([root, fork], [0.0034, 0.0028]));
    for (const [o, z] of [[0.1, 0.006], [-0.15, -0.002]]) {
      const tip = fork.clone().addScaledVector(dn, len * 0.55).addScaledVector(fw, len * (0.3 + o)).addScaledVector(Z, z);
      parts.push(jointed([fork, tip], [0.0026, 0.0012]));
    }
  }
  return shade(mergeGeometries(parts)!);
}

/** A crayfish's chelae (+ side): arm forward and out, a broad palm, two fingers closing at their tips; `patch` = only the colour patch on the palm's outer side. */
function clawGeometry(s: Shrimp3D, patch: boolean) {
  const c = s.claw!, k = c.size, sp = spine(s), f = sp.at(0.06), y0 = f.c.y - HV * s.deep * 0.75, x0 = f.c.x, parts: THREE.BufferGeometry[] = [];
  const el = V(x0 + 0.05 * k, y0 - 0.012, 0.045 * k), wr = V(x0 + 0.1 * k, y0 - 0.028, 0.075 * k + 0.02), pc = wr.clone().add(V(0.055 * k, 0.0, 0.012 * k));
  if (patch) {
    const g = new THREE.SphereGeometry(1, 12, 8).scale(0.03 * k, 0.012 * k, 0.012 * k).translate(pc.x, pc.y + 0.004 * k, pc.z + 0.03 * k);
    g.deleteAttribute('uv'); return g.toNonIndexed();
  }
  parts.push(jointed([V(x0, y0, 0.02), el, wr], [0.0075 * k, 0.0065 * k, 0.0055 * k]));
  const palm = new THREE.SphereGeometry(1, 14, 10).scale(0.06 * k, 0.022 * k, 0.03 * k).translate(pc.x, pc.y, pc.z);
  palm.deleteAttribute('uv'); parts.push(palm.toNonIndexed());
  // the fixed finger low, the movable one above it, both curving in so the tips meet
  const bz = pc.z - 0.004 * k, tipX = pc.x + 0.12 * k;
  parts.push(jointed([V(pc.x + 0.035 * k, pc.y - 0.012 * k, bz), V(pc.x + 0.08 * k, pc.y - 0.012 * k, bz - 0.008 * k), V(tipX, pc.y - 0.002 * k, bz - 0.022 * k)], [0.012 * k, 0.009 * k, 0.0025]));
  parts.push(jointed([V(pc.x + 0.035 * k, pc.y + 0.012 * k, bz), V(pc.x + 0.08 * k, pc.y + 0.018 * k, bz - 0.006 * k), V(tipX, pc.y + 0.003 * k, bz - 0.022 * k)], [0.012 * k, 0.009 * k, 0.0025]));
  return shade(mergeGeometries(parts)!);
}

/** Antennules (two short forked feelers forward) and the long antennae swept back over the body (+ side). */
function antennaGeometry(s: Shrimp3D) {
  const sp = spine(s), f = sp.at(0.015), r0 = f.c.clone().add(V(0.004, 0.004, 0.012)), parts: THREE.BufferGeometry[] = [];
  const tube = (c: THREE.Curve<THREE.Vector3>, r: number) => { const t = taperTube(c, r, 20, 5); t.deleteAttribute('uv'); return t.toNonIndexed(); };
  // the long antennae (second antennae): up and back over the body
  for (const [l, y, z] of [[0.58, 0.1, 0.085], [0.7, 0.075, 0.13]]) {
    const L = l * s.ant;
    parts.push(tube(new THREE.QuadraticBezierCurve3(r0.clone(), r0.clone().add(V(-0.12, 0.11, 0.03)), r0.clone().add(V(-L, y, z))), 0.0032));
  }
  // antennules (first antennae): a short stalk forward, then two flagella
  const st = r0.clone().add(V(0.035, 0.012, 0.006));
  parts.push(tube(new THREE.LineCurve3(r0.clone().add(V(0, 0.004, -0.004)), st), 0.0036));
  for (const [dx, dy, dz] of [[0.09, 0.05, 0.03], [0.07, 0.015, 0.045]]) parts.push(tube(new THREE.QuadraticBezierCurve3(st.clone(), st.clone().add(V(dx * 0.5, dy * 0.6, dz * 0.3)), st.clone().add(V(dx, dy, dz))), 0.0022));
  // antennal scale (scaphocerite): a small flat blade beside the antennule stalk
  const sc = new THREE.SphereGeometry(1, 10, 6).scale(0.03, 0.005, 0.009).translate(r0.x + 0.022, r0.y - 0.004, r0.z + 0.014);
  sc.deleteAttribute('uv'); parts.push(sc.toNonIndexed());
  return shade(mergeGeometries(parts)!);
}

/**
 * The tail fan, lying flat: the telson down the middle and two uropods each side (inner and outer blade), splayed in
 * the plane of the body's end tilted halfway back toward level, the outer blades' edges a little lower (cupped).
 * uv per blade: (root .. tip, across).
 */
function fanGeometry(s: Shrimp3D) {
  const sp = spine(s), e = sp.at(1), ax = e.t.clone().lerp(V(-1, 0, 0), 0.5).normalize(), up = V(ax.y, -ax.x).normalize();
  const root = e.c.clone().addScaledVector(up, SEG_HV[5] * s.deep * 0.15), parts: THREE.BufferGeometry[] = [];
  const leaf = (ang: number, side: number, len: number, wid: number, z0: number, point: boolean) => {
    const dir = ax.clone().applyAxisAngle(up, ang * side), across = new THREE.Vector3().crossVectors(up, dir).normalize();
    const NA = 12, NB = 4, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= NA; i++) {
      const a = i / NA, w = point ? wid * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, a * 1.6) / 2)) * (1 - 0.75 * a ** 2) : wid * Math.sin(Math.PI * (0.12 + 0.88 * a) ** 0.75) ** 0.6 * (a < 0.98 ? 1 : 0.6);
      for (let j = 0; j <= NB; j++) {
        // cupped: each uropod rolled so its outer edge sits lower, the tips a little down
        const b = j / NB * 2 - 1, droop = -0.016 * a * a - w * b * side * Math.sin(Math.abs(ang) * 1.3) * (0.5 + 0.5 * a) + 0.002 * (1 - b * b);
        const p = root.clone().addScaledVector(Z, z0 * side).addScaledVector(dir, len * a).addScaledVector(across, w * b).addScaledVector(up, droop);
        pos.push(p.x, p.y, p.z); uv.push(a, (b + 1) / 2);
      }
    }
    for (let i = 0; i < NA; i++) for (let j = 0; j < NB; j++) { const a = i * (NB + 1) + j, b = a + NB + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    parts.push(g.toNonIndexed());
  };
  leaf(0, 1, 0.115, 0.016, 0, true); // telson
  for (const side of [1, -1]) { leaf(0.32, side, 0.12, 0.023, 0.008, false); leaf(0.62, side, 0.13, 0.028, 0.012, false); }
  const g = mergeGeometries(parts)!; g.computeVertexNormals();
  return g;
}

// ---------- the whole animal ----------

let hull: THREE.Material | undefined;
/** The solid shrimp for a card of width w (add it as a child of the card mesh, whose own painting is empty for 3D shrimp). */
export function shrimpBody(art: string, w: number) {
  const s = SHRIMP3D[art], grp = new THREE.Group(), see = s.glass ? { transparent: true, opacity: s.glass } : {};
  const body = geo(art + ':body', () => bodyGeometry(s));
  grp.add(new THREE.Mesh(body, mat('body:' + art, () => new THREE.MeshBasicMaterial({ map: skinTexture(s.skin), vertexColors: true, ...see }))));
  if (s.marks) { // the markings stay solid on the see-through body: the same surface again, carrying only them
    const m = s.marks;
    grp.add(new THREE.Mesh(body, mat('marks:' + art, () => new THREE.MeshBasicMaterial({ map: skinTexture((x, W, H) => m(x, W, H), 1024, 256), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))));
  } else {
    hull ??= hullMaterial('max(2.5 * uPop, 1.0)', new THREE.Color(0.05, 0.04, 0.035));
    const o = new THREE.Mesh(body, hull); o.userData.nolight = true; grp.add(o);
  }
  grp.add(new THREE.Mesh(geo(art + ':fan', () => fanGeometry(s)), mat('fan:' + art, () => new THREE.MeshBasicMaterial({ map: skinTexture(s.fan, 128, 64), transparent: true, side: THREE.DoubleSide, depthWrite: !s.glass }))));
  const legs = geo(art + ':legs', () => legGeometry(s)), ants = geo(art + ':ant', () => antennaGeometry(s));
  const lm = mat('leg:' + art, () => new THREE.MeshBasicMaterial({ color: s.leg, vertexColors: true, ...see }));
  const am = mat('ant:' + art, () => new THREE.MeshBasicMaterial({ color: s.antC, vertexColors: true, ...(s.glass ? see : {}) }));
  if (s.claw) {
    const cg = geo(art + ':claw', () => clawGeometry(s, false)), pm = s.claw.patch ? mat('patch:' + art, () => new THREE.MeshBasicMaterial({ color: s.claw!.patch, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })) : undefined;
    for (const side of [1, -1]) {
      const o = new THREE.Mesh(cg, lm); o.scale.z = side; grp.add(o);
      if (pm) { const q = new THREE.Mesh(geo(art + ':patch', () => clawGeometry(s, true)), pm); q.scale.z = side; grp.add(q); }
    }
  }
  for (const side of [1, -1]) for (const [g, m] of [[legs, lm], [ants, am]] as const) { const o = new THREE.Mesh(g, m); o.scale.z = side; grp.add(o); }
  // stalked eyes: a short stalk out of the carapace front, a dark ball on its end, looking out and a little forward
  const sp = spine(s), f = sp.at(0.03), eyeR = 0.0135;
  const stalk = geo(art + ':stalk', () => {
    const a = f.c.clone().add(V(-0.008, 0.016, 0.012)), b = f.c.clone().add(V(0.006, 0.026, 0.038));
    return shade(jointed([a, b], [0.0065, 0.0055]));
  });
  const ball = geo('shrimp:eye', () => new THREE.SphereGeometry(1, 16, 12));
  const em = mat('eye:' + art, () => new THREE.MeshBasicMaterial({ color: s.eye }));
  for (const side of [1, -1]) {
    const st = new THREE.Mesh(stalk, lm); st.scale.z = side; grp.add(st);
    const e = new THREE.Mesh(ball, em); e.scale.set(eyeR * 1.1, eyeR, eyeR); e.position.copy(f.c).add(V(0.009, 0.028, side * (0.038 + eyeR * 0.55))); grp.add(e);
  }
  for (const o of grp.children) o.position.y += s.stand; // body up on its legs; the feet (at -REST - stand) land on -REST
  grp.scale.setScalar(w);
  return grp;
}
