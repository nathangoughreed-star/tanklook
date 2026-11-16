// Cling sim (R92): sucker-mouth algae grazers (otocinclus, bristlenose, hillstream loach) stuck to a surface, belly to it:
// mostly still, a slow rasping creep now and then, and an occasional quick dart to another surface (the ground or a flat glass
// pane). Plain numbers, no three.js. Surfaces: the ground (floorAt, tilted with the slope) and, in a rectangular tank, the four
// panes. A fish placed on a rock or a leaf has no surface model here: it stays where it was placed (see render/cling.ts).
// Orientation follows the surface: the card's x = heading, y = the surface normal into the water, z = x cross y (the card
// faces +z, as build.ts onGlass sets it), delivered as a quaternion.
import { rng } from '../art/paint';
import type { SwimField, V3 } from './swimTypes';

export interface ClingSpec {
  id: number;
  /** body length (mm) */
  len: number;
  /** distance from the surface to the mesh origin (mm) */
  off: number;
  /** creep speed, dart speed (mm/s); mean seconds between darts; share of the time fully still */
  creep: number; dart: number; dartEvery: number; still: number;
  /** a rectangular tank: the four panes are surfaces too */
  rect: boolean;
  /** where it was placed: on the ground or on a flat pane (normal into the water), position, heading unit vector along the surface */
  home: { surf: 'floor' | 'pane'; x: number; y: number; z: number; n: V3; h: V3 };
}
export interface ClingPose { x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number }
export interface ClingSim { step(dt: number): void; pose(id: number): ClingPose | null; reset(ids?: number[]): void }

const STILL = 0, CREEP = 1, DART = 2;
/** quaternion of the rotation whose columns are the unit vectors a (x), b (y), c (z) */
function quat(o: ClingPose, a: V3, b: V3, c: V3) {
  const m00 = a[0], m10 = a[1], m20 = a[2], m01 = b[0], m11 = b[1], m21 = b[2], m02 = c[0], m12 = c[1], m22 = c[2], tr = m00 + m11 + m22;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); o.qw = 0.25 / s; o.qx = (m21 - m12) * s; o.qy = (m02 - m20) * s; o.qz = (m10 - m01) * s; }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); o.qw = (m21 - m12) / s; o.qx = 0.25 * s; o.qy = (m01 + m10) / s; o.qz = (m02 + m20) / s; }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); o.qw = (m02 - m20) / s; o.qx = (m01 + m10) / s; o.qy = 0.25 * s; o.qz = (m12 + m21) / s; }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); o.qw = (m10 - m01) / s; o.qx = (m02 + m20) / s; o.qy = (m12 + m21) / s; o.qz = 0.25 * s; }
}

export function makeClingSim(specs: ClingSpec[], field: SwimField, seed: number): ClingSim {
  const n = specs.length, R = rng(seed ^ 0x1b873593);
  const F = () => new Float64Array(n);
  // surface state: floor (a, b) = (x, z); pane (a, b) = (t, v) along the pane's horizontal tangent and up
  const surf = new Int8Array(n), a = F(), b = F(), th = F(), spd = F(), modeT = F(), phase = F(), wob = F();
  const mode = new Uint8Array(n);
  // dart: from/to world points and normals, flight clock
  const fx = F(), fy = F(), fz = F(), tx = F(), ty = F(), tz = F(), dur = F(), el = F(), tSurf = new Int8Array(n), tA = F(), tB = F();
  const hsx = F(), hsy = F(), hsz = F(), hlx = F(), hly = F(), hlz = F(), fnx = F(), fny = F(), fnz = F(), tnx = F(), tny = F(), tnz = F();
  const poses: ClingPose[] = [], idx = new Map<number, number>(), grad: V3 = [0, 0, 0];
  const A: V3 = [0, 0, 0], B: V3 = [0, 0, 0], C: V3 = [0, 0, 0];

  const x0 = field.min[0], x1 = field.max[0], z0 = field.min[2], z1 = field.max[2];
  // panes: 1 x=min (n +x), 2 x=max (n -x), 3 z=min (n +z), 4 z=max (n -z); tangent T (horizontal), plane coordinate value
  const PN: V3[] = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
  const PT: V3[] = [[1, 0, 0], [0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0]];
  const PC = [0, x0, x1, z0, z1]; // plane position along its normal axis
  const tRange = (s: number, m: number): [number, number] => { // range of the tangent coordinate t = dot(p, T)
    const lo = s === 1 || s === 2 ? z0 : x0, hi = s === 1 || s === 2 ? z1 : x1;
    const t = PT[s][0] + PT[s][2]; return t > 0 ? [lo + m, hi - m] : [-hi + m, -lo - m];
  };
  let floorMax = 0; for (let k = 0; k <= 12; k++) floorMax = Math.max(floorMax, field.floorAt(x0 + (x1 - x0) * k / 12, z0 + (z1 - z0) * k / 12));
  const m0 = (i: number) => specs[i].len * 0.5 + 2;
  const ms = (i: number) => Math.max(5, specs[i].len * 0.3); // probe height off the ground

  /** a surface point -> world position and normal (written into the out arrays at k) */
  function world(i: number, s: number, ca: number, cb: number, out: V3, nrm: V3) {
    const sp = specs[i];
    if (s === 0) {
      const e = 6, dx = field.floorAt(ca + e, cb) - field.floorAt(ca - e, cb), dz = field.floorAt(ca, cb + e) - field.floorAt(ca, cb - e);
      let nx = -dx / (2 * e), nz = -dz / (2 * e); const nl = Math.sqrt(nx * nx + 1 + nz * nz); nx /= nl; nz /= nl;
      nrm[0] = nx; nrm[1] = 1 / nl; nrm[2] = nz;
      const y = field.floorAt(ca, cb); out[0] = ca + nx * sp.off; out[1] = y + nrm[1] * sp.off; out[2] = cb + nz * sp.off;
    } else {
      const N = PN[s], T = PT[s]; nrm[0] = N[0]; nrm[1] = N[1]; nrm[2] = N[2];
      const base: V3 = [N[0] !== 0 ? PC[s] : 0, 0, N[2] !== 0 ? PC[s] : 0];
      out[0] = (N[0] !== 0 ? base[0] : ca * T[0]) + N[0] * sp.off; out[1] = cb + N[1] * sp.off; out[2] = (N[2] !== 0 ? base[2] : ca * T[2]) + N[2] * sp.off;
    }
  }
  /** a heading unit vector along the surface */
  function heading(s: number, ang: number, nrm: V3, out: V3) {
    if (s === 0) { const hx = Math.cos(ang), hz = -Math.sin(ang); // slide it into the slope's plane
      const d = hx * nrm[0] + hz * nrm[2]; out[0] = hx - d * nrm[0]; out[1] = -d * nrm[1]; out[2] = hz - d * nrm[2];
    } else { const T = PT[s]; out[0] = Math.cos(ang) * T[0]; out[1] = Math.sin(ang); out[2] = Math.cos(ang) * T[2]; }
    const l = Math.hypot(out[0], out[1], out[2]) || 1; out[0] /= l; out[1] /= l; out[2] /= l;
  }
  function orient(o: ClingPose, h: V3, up: V3) { // x = h, y = up made square to h, z = h cross y
    const d = h[0] * up[0] + h[1] * up[1] + h[2] * up[2];
    let ux = up[0] - d * h[0], uy = up[1] - d * h[1], uz = up[2] - d * h[2]; const l = Math.hypot(ux, uy, uz);
    if (l < 1e-6) { ux = 0; uy = 1; uz = 0; } else { ux /= l; uy /= l; uz /= l; }
    A[0] = h[0]; A[1] = h[1]; A[2] = h[2]; B[0] = ux; B[1] = uy; B[2] = uz;
    C[0] = h[1] * uz - h[2] * uy; C[1] = h[2] * ux - h[0] * uz; C[2] = h[0] * uy - h[1] * ux;
    quat(o, A, B, C);
  }

  /** something solid at this surface point (rock, plant, a plant against the pane)? */
  function blocked(i: number, s: number, ca: number, cb: number): boolean {
    const sp = specs[i];
    if (s === 0) {
      const h = ms(i), y = field.floorAt(ca, cb) + h; grad[0] = 0; grad[1] = 0; grad[2] = 0;
      const c = field.clearance(ca, y, cb, grad, h * 1.2);
      return !(c >= h * 0.8 || Math.abs(grad[1]) > 0.6);
    }
    const N = PN[s], T = PT[s], d = 16 + sp.len * 0.3;
    const wx = (N[0] !== 0 ? PC[s] : ca * T[0]) + N[0] * d, wy = cb, wz = (N[2] !== 0 ? PC[s] : ca * T[2]) + N[2] * d;
    return field.clearance(wx, wy, wz, undefined, d) < d * 0.6;
  }
  const inBounds = (i: number, s: number, ca: number, cb: number) => {
    if (s === 0) return ca > x0 + m0(i) && ca < x1 - m0(i) && cb > z0 + m0(i) && cb < z1 - m0(i);
    const [lo, hi] = tRange(s, m0(i)); return ca > lo && ca < hi && cb > floorMax + m0(i) && cb < field.waterTop - m0(i);
  };

  const P: V3 = [0, 0, 0], Nn: V3 = [0, 0, 0], H: V3 = [0, 0, 0];
  function place(i: number) { // write the attached pose
    const o = poses[i]; world(i, surf[i], a[i], b[i], P, Nn); heading(surf[i], th[i] + wob[i], Nn, H);
    o.x = P[0]; o.y = P[1]; o.z = P[2]; orient(o, H, Nn);
  }
  function setMode(i: number, m: number) {
    mode[i] = m; const s = specs[i];
    modeT[i] = m === STILL ? (6 + R() * 30) * (0.5 + s.still) : 2 + R() * 6;
  }
  function init(i: number) {
    const s = specs[i], h = s.home;
    if (h.surf === 'floor') { surf[i] = 0; a[i] = h.x; b[i] = h.z; th[i] = Math.atan2(-h.h[2], h.h[0]); }
    else {
      const ax = Math.abs(h.n[0]) > 0.5 ? (h.n[0] > 0 ? 1 : 2) : (h.n[2] > 0 ? 3 : 4); surf[i] = ax;
      a[i] = h.x * PT[ax][0] + h.z * PT[ax][2]; b[i] = h.y; th[i] = Math.atan2(h.h[1], h.h[0] * PT[ax][0] + h.h[2] * PT[ax][2]);
    }
    spd[i] = 0; el[i] = 0; wob[i] = 0; setMode(i, STILL); modeT[i] = 2 + R() * 10;
    const o = poses[i]; o.x = h.x; o.y = h.y; o.z = h.z; // the exact placed spot until the first step
    const hn = h.n; orient(o, h.h, hn);
  }
  for (let i = 0; i < n; i++) { idx.set(specs[i].id, i); poses.push({ x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 }); phase[i] = R() * 6.28; init(i); }

  const Fp: V3 = [0, 0, 0], Fn: V3 = [0, 0, 0], Tp: V3 = [0, 0, 0], Tn: V3 = [0, 0, 0];
  function startDart(i: number): boolean {
    const s = specs[i];
    for (let tries = 0; tries < 8; tries++) {
      const ts = s.rect ? Math.floor(R() * 5) : 0;
      let ca: number, cb: number;
      if (ts === 0) { ca = x0 + m0(i) + R() * (x1 - x0 - 2 * m0(i)); cb = z0 + m0(i) + R() * (z1 - z0 - 2 * m0(i)); }
      else { const [lo, hi] = tRange(ts, m0(i)), v0 = floorMax + m0(i), v1 = field.waterTop - m0(i); if (v1 <= v0 || hi <= lo) continue; ca = lo + R() * (hi - lo); cb = v0 + R() * (v1 - v0); }
      if (!inBounds(i, ts, ca, cb) || blocked(i, ts, ca, cb)) continue;
      world(i, ts, ca, cb, Tp, Tn); world(i, surf[i], a[i], b[i], Fp, Fn);
      const d = Math.hypot(Tp[0] - Fp[0], Tp[1] - Fp[1], Tp[2] - Fp[2]);
      if (d < s.len * 2 || d > 450) continue; // a real dart, not a shuffle; not across the whole tank
      let ok = true; // the line must be clear of solid things
      for (let k = 1; k < 8 && ok; k++) { const t = k / 8; if (field.clearance(Fp[0] + (Tp[0] - Fp[0]) * t, Fp[1] + (Tp[1] - Fp[1]) * t, Fp[2] + (Tp[2] - Fp[2]) * t, undefined, s.len * 0.4) < s.len * 0.25) ok = false; }
      if (!ok) continue;
      fx[i] = Fp[0]; fy[i] = Fp[1]; fz[i] = Fp[2]; tx[i] = Tp[0]; ty[i] = Tp[1]; tz[i] = Tp[2]; fnx[i] = Fn[0]; fny[i] = Fn[1]; fnz[i] = Fn[2]; tnx[i] = Tn[0]; tny[i] = Tn[1]; tnz[i] = Tn[2];
      { const dx = Tp[0] - Fp[0], dy = Tp[1] - Fp[1], dz = Tp[2] - Fp[2], dl = Math.hypot(dx, dy, dz), dd = (dx * Tn[0] + dy * Tn[1] + dz * Tn[2]) / dl;
        let lx = dx / dl - dd * Tn[0], ly = dy / dl - dd * Tn[1], lz = dz / dl - dd * Tn[2], ll = Math.hypot(lx, ly, lz);
        if (ll < 0.3) { if (ts === 0) { const r = R() * 6.28; lx = Math.cos(r); ly = 0; lz = -Math.sin(r); } else { lx = PT[ts][0] * (R() < 0.5 ? 1 : -1); ly = 0; lz = PT[ts][2] * (lx * PT[ts][0] >= 0 ? 1 : -1); } ll = Math.hypot(lx, ly, lz) || 1; }
        hlx[i] = lx / ll; hly[i] = ly / ll; hlz[i] = lz / ll; }
      heading(surf[i], th[i], Fn, H); hsx[i] = H[0]; hsy[i] = H[1]; hsz[i] = H[2]; // the heading it takes off with
      tSurf[i] = ts; tA[i] = ca; tB[i] = cb; dur[i] = Math.max(0.25, d / s.dart); el[i] = 0; mode[i] = DART; return true;
    }
    return false;
  }

  function inner(dt: number, T: number) {
    for (let i = 0; i < n; i++) {
      const s = specs[i], o = poses[i];
      if (mode[i] === DART) {
        el[i] += dt; const u = Math.min(1, el[i] / dur[i]), e = u * u * (3 - 2 * u);
        const dx = tx[i] - fx[i], dy = ty[i] - fy[i], dz = tz[i] - fz[i], dl = Math.hypot(dx, dy, dz) || 1;
        o.x = fx[i] + dx * e; o.y = fy[i] + dy * e; o.z = fz[i] + dz * e;
        { const lw = Math.max(0, 1 - u / 0.25), sw = lw * lw * (3 - 2 * lw); H[0] = dx / dl + (hsx[i] - dx / dl) * sw; H[1] = dy / dl + (hsy[i] - dy / dl) * sw; H[2] = dz / dl + (hsz[i] - dz / dl) * sw; const hl0 = Math.hypot(H[0], H[1], H[2]) || 1; H[0] /= hl0; H[1] /= hl0; H[2] /= hl0; }
        const w = Math.max(0, Math.min(1, (u - 0.4) / 0.35)), uw = w * w * (3 - 2 * w); // belly turns to the new surface in the middle of the flight
        Nn[0] = fnx[i] + (tnx[i] - fnx[i]) * uw; Nn[1] = fny[i] + (tny[i] - fny[i]) * uw; Nn[2] = fnz[i] + (tnz[i] - fnz[i]) * uw;
        // in flight the dorsal side stays up unless the surface says otherwise
        if (u < 0.5) Nn[1] += 0.8 * Math.sin(Math.PI * u * 2);
        { const hx = H[0] + (hlx[i] - H[0]) * uw, hy = H[1] + (hly[i] - H[1]) * uw, hz = H[2] + (hlz[i] - H[2]) * uw, hl = Math.hypot(hx, hy, hz) || 1; H[0] = hx / hl; H[1] = hy / hl; H[2] = hz / hl; }
        orient(o, H, Nn);
        if (u >= 1) { // landed: heading along the new surface
          surf[i] = tSurf[i]; a[i] = tA[i]; b[i] = tB[i];
          world(i, surf[i], a[i], b[i], P, Nn);
          const dd = H[0] * Nn[0] + H[1] * Nn[1] + H[2] * Nn[2], hx = H[0] - dd * Nn[0], hy = H[1] - dd * Nn[1], hz = H[2] - dd * Nn[2];
          if (surf[i] === 0) th[i] = Math.atan2(-hz, hx); else { const Tt = PT[surf[i]]; th[i] = Math.atan2(hy, hx * Tt[0] + hz * Tt[2]); }
          if (Math.hypot(hx, hy, hz) < 0.3) th[i] = R() * 6.28;
          spd[i] = 0; setMode(i, STILL); modeT[i] = 4 + R() * 12;
        }
        continue;
      }
      modeT[i] -= dt;
      if (modeT[i] <= 0) {
        if (mode[i] === STILL && s.dartEvery > 0 && R() < Math.min(1, 35 / s.dartEvery) && startDart(i)) { /* darting */ }
        else setMode(i, mode[i] === STILL ? CREEP : STILL);
        if (mode[i] === DART) continue;
      }
      // creep: slow, wandering, steered off anything ahead
      let target = 0;
      if (mode[i] === CREEP) {
        target = s.creep * (0.7 + 0.3 * Math.sin(T * 0.9 + phase[i]));
        th[i] += 0.25 * Math.sin(T * 0.3 + phase[i]) * dt;
        const look = s.len * 0.8 + 4, ca = a[i], cb = b[i];
        const dx = surf[i] === 0 ? Math.cos(th[i]) : Math.cos(th[i]), dz = surf[i] === 0 ? -Math.sin(th[i]) : Math.sin(th[i]);
        const ahead = (ang: number) => { const q = th[i] + ang, qx = ca + Math.cos(q) * look, qz = cb + (surf[i] === 0 ? -Math.sin(q) : Math.sin(q)) * look; return !inBounds(i, surf[i], qx, qz) || blocked(i, surf[i], qx, qz); };
        void dx; void dz;
        if (ahead(0)) {
          let turned = false;
          for (const ang of [0.6, -0.6, 1.2, -1.2, 2.0, -2.0]) if (!ahead(ang)) { th[i] += Math.sign(ang) * Math.min(Math.abs(ang), 1.5 * dt * 3); turned = true; break; }
          if (!turned) { target = 0; setMode(i, STILL); }
          else target *= 0.4;
        }
      }
      const ac = s.creep * 2 * dt; spd[i] += Math.max(-ac, Math.min(ac, target - spd[i]));
      if (spd[i] < 0) spd[i] = 0;
      const step = spd[i] * dt;
      if (step > 0) {
        const na = a[i] + Math.cos(th[i]) * step, nb = b[i] + (surf[i] === 0 ? -Math.sin(th[i]) : Math.sin(th[i])) * step;
        if (inBounds(i, surf[i], na, nb) && !blocked(i, surf[i], na, nb)) { a[i] = na; b[i] = nb; } else spd[i] = 0;
      }
      wob[i] = mode[i] === CREEP ? 0.05 * Math.sin(T * 9 + phase[i]) : 0; // the rasp
      place(i);
    }
  }
  let T = 0;
  return {
    step(dt: number) { if (!(dt > 0)) return; if (dt > 0.25) dt = 0.25; const sub = Math.ceil(dt / 0.05), h = dt / sub; for (let k = 0; k < sub; k++) { T += h; inner(h, T); } },
    pose(id: number) { const k = idx.get(id); return k === undefined ? null : poses[k]; },
    reset(ids?: number[]) { const list = ids ? ids.map(id => idx.get(id)).filter((k): k is number => k !== undefined) : specs.map((_, i) => i); for (const i of list) init(i); },
  };
}
