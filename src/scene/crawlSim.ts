// Crawler sim (R90): invertebrates that stay on a surface instead of swimming: shrimp, crabs and crayfish, snails.
// Plain numbers, no three.js. They walk the ground (floorAt) or crawl a flat glass pane, with stops to graze; a shrimp may
// now and then hop a short way and land on the ground again; a snail never leaves its surface. Obstacles come from the same
// SwimField as the swimmers (probed just above the ground, so the ground itself never reads as a wall).
// Conventions as swimSim: world mm, x along the tank, y up, z = -depth; yaw degrees, nose = +x at yaw 0, heading (cos y, -sin y)
// in (x, z). A pane crawler (`plane`) moves in the pane's (u, v) frame; its `yaw` is the in-plane spin about the pane normal
// (the card's own z, as build.ts sets it), and x/y/z are world.
import { rng } from '../art/paint';
import type { SwimField, SwimPose, V3 } from './swimTypes';

export interface CrawlPlane {
  /** world unit vectors: along the pane at spin 0, up the pane (in the card's plane) */
  u: V3; v: V3;
  /** bounds in pane coordinates u = p.u, v = p.v (world dot products), body centre */
  u0: number; u1: number; v0: number; v1: number;
  /** unit vector from the pane into the water */
  into: V3;
}
export interface CrawlSpec {
  id: number;
  /** body length (mm) */
  len: number;
  /** 'shrimp' hops now and then, 'snail' never leaves its surface; crabs and crayfish just walk */
  kind: 'shrimp' | 'snail' | 'crab' | 'frog';
  /** walking speed (mm/s) */
  speed: number;
  /** share of the time stopped to graze, 0..1 */
  graze: number;
  /** short hops per minute while walking (shrimp) */
  hop: number;
  /** height of the mesh origin above the ground (mm), floor crawlers */
  rest: number;
  plane?: CrawlPlane;
  home: SwimPose;
  /** frog: mean seconds between breathing trips to the surface */
  trip?: number;
}
/** Pose plus the leg angles (rad, about the body's side axis) a frog's limbs are drawn at: `hind` kick (0 at rest, negative = swept back), `fore`. 0 for everything else. */
export interface CrawlPose extends SwimPose { hind: number; fore: number }
export interface CrawlSim {
  step(dt: number): void;
  pose(id: number): CrawlPose | null;
  reset(ids?: number[]): void;
}

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const WALK = 0, GRAZE = 1, HOP = 2, ASC = 3, TOP = 4, DIVE = 5;
const FAN = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4];

export function makeCrawlSim(specs: CrawlSpec[], field: SwimField, seed: number): CrawlSim {
  const n = specs.length, R = rng(seed ^ 0x2545f491);
  const F = () => new Float64Array(n);
  const px = F(), pz = F(), pu = F(), pv = F(), th = F(), spd = F(), modeT = F(), hopT = F(), hopY = F(), hopVx = F();
  const tripT = F(), kph = F(), w1 = F(), p1 = F(), w2 = F(), p2 = F(), pitchS = F(), rollS = F(), turnS = F(), nod = F();
  const mode = new Uint8Array(n), poses: CrawlPose[] = [], idx = new Map<number, number>();
  const grad: V3 = [0, 0, 0];
  const body = (i: number) => Math.max(2, specs[i].len * 0.22); // half-footprint kept clear (mm)
  const hh = (i: number) => Math.max(5, specs[i].len * 0.25); // probe height above the ground (mm)

  /** Blocked ahead? clearance at a point just above the ground; the ground itself reads hh, a rock or plant side less. Writes the push-away direction into grad. */
  function blockedAt(i: number, x: number, z: number): number {
    const h = hh(i);
    const y = field.floorAt(x, z) + h;
    grad[0] = 0; grad[1] = 0; grad[2] = 0;
    const c = field.clearance(x, y, z, grad, h * 1.2);
    if (c >= h * 0.8 || Math.abs(grad[1]) > 0.6) { grad[0] = 0; grad[2] = 0; return 0; } // open, or only ground / a carpet top under it
    return 1 - Math.max(0, c) / (h * 0.8);
  }

  // pane probe: clearance a little into the water over the point at pane coords (u, v) - something touching the pane there?
  function paneBlocked(i: number, u: number, v: number): number {
    const s = specs[i], P = s.plane!, d = 16 + s.len * 0.3;
    const wx = s.home.x + (u - hu[i]) * P.u[0] + (v - hv[i]) * P.v[0] + P.into[0] * d;
    const wy = s.home.y + (u - hu[i]) * P.u[1] + (v - hv[i]) * P.v[1] + P.into[1] * d;
    const wz = s.home.z + (u - hu[i]) * P.u[2] + (v - hv[i]) * P.v[2] + P.into[2] * d;
    const c = field.clearance(wx, wy, wz, undefined, d);
    return c < d * 0.6 ? 1 : 0;
  }
  const hu = F(), hv = F();

  function init(i: number) {
    const s = specs[i], h = s.home, P = s.plane;
    if (P) { hu[i] = h.x * P.u[0] + h.y * P.u[1] + h.z * P.u[2]; hv[i] = h.x * P.v[0] + h.y * P.v[1] + h.z * P.v[2]; pu[i] = hu[i]; pv[i] = hv[i]; th[i] = h.yaw * D2R; }
    else { px[i] = h.x; pz[i] = h.z; th[i] = h.yaw * D2R; }
    spd[i] = 0; hopT[i] = 0; hopY[i] = 0; pitchS[i] = h.pitch; rollS[i] = h.roll; turnS[i] = 0; nod[i] = 0;
    mode[i] = GRAZE; modeT[i] = R() * 3; tripT[i] = s.trip ? s.trip * (0.2 + R() * 0.6) : 1e9; kph[i] = 0;
    const o = poses[i]; o.hind = 0; o.fore = 0; o.x = h.x; o.y = h.y; o.z = h.z; o.yaw = h.yaw; o.pitch = h.pitch; o.roll = h.roll;
  }
  for (let i = 0; i < n; i++) {
    idx.set(specs[i].id, i); poses.push({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, hind: 0, fore: 0 });
    w1[i] = 0.2 + R() * 0.3; p1[i] = R() * 6.28; w2[i] = 0.6 + R() * 0.5; p2[i] = R() * 6.28;
    init(i);
  }
  const snail = (i: number) => specs[i].kind === 'snail';
  function setMode(i: number, m: number) {
    const s = specs[i]; mode[i] = m;
    const walk = snail(i) ? 12 + R() * 30 : 2 + R() * 5;
    if (m === WALK) modeT[i] = walk;
    else modeT[i] = Math.max(1, walk * s.graze / Math.max(0.05, 1 - s.graze) * (0.6 + R() * 0.8));
  }

  /** A frog's breathing trip: kick straight up, a pause at the top, a quick dart back down. Returns false if the column above is not clear. */
  function startTrip(i: number): boolean {
    const s = specs[i], f0 = field.floorAt(px[i], pz[i]) + s.rest, top = field.waterTop - s.len * 0.3, thr = s.len * 0.3;
    if (top - f0 < s.len * 2) return false;
    for (let k = 1; k <= 8; k++) if (field.clearance(px[i], f0 + (top - f0) * k / 8, pz[i], undefined, thr) < thr * 0.9) return false;
    mode[i] = ASC; spd[i] = 0; kph[i] = 0; return true;
  }
  function trip(i: number, dt: number, T: number) {
    const s = specs[i], o = poses[i], f0 = field.floorAt(px[i], pz[i]) + s.rest, lift = field.waterTop - s.len * 0.3 - f0;
    let ph = 0, hind = 0, fore = 0, pit = 0;
    if (mode[i] === ASC) {
      kph[i] += dt * 2.2 * 2 * Math.PI; ph = Math.sin(kph[i]);
      hopY[i] += s.len * 1.5 * (1 + 0.7 * ph) * dt; // the kick pulses the climb
      hind = -0.45 + 0.75 * ph; fore = 0.2 * Math.sin(kph[i] + 1); pit = 60;
      if (hopY[i] >= lift) { hopY[i] = lift; mode[i] = TOP; modeT[i] = 1.5 + R() * 2.5; }
    } else if (mode[i] === TOP) {
      modeT[i] -= dt; hopY[i] = lift + s.len * 0.1 * Math.sin(T * 2.5 + p1[i]);
      hind = -0.25 + 0.15 * Math.sin(T * 3); fore = 0.1 * Math.sin(T * 2); pit = 35;
      if (modeT[i] <= 0) mode[i] = DIVE;
    } else {
      const v = Math.max(s.len * 0.6, Math.min(s.len * 5.5, hopY[i] * 4)); // quick, easing off near the bottom
      hopY[i] -= v * dt; hind = -0.7; fore = 0.3; pit = -60 * Math.min(1, hopY[i] / (s.len * 3)); // levels out before it lands
      if (hopY[i] <= 0) { hopY[i] = 0; setMode(i, GRAZE); modeT[i] = 4 + R() * 8; tripT[i] = s.trip! * (0.5 + R()); }
    }
    pitchS[i] += (pit - pitchS[i]) * Math.min(1, dt * 6); rollS[i] += (0 - rollS[i]) * Math.min(1, dt * 4);
    o.hind += (hind - o.hind) * Math.min(1, dt * 10); o.fore += (fore - o.fore) * Math.min(1, dt * 10);
    o.x = px[i]; o.z = pz[i]; o.y = f0 + hopY[i]; o.yaw = th[i] * R2D; o.pitch = pitchS[i]; o.roll = rollS[i];
  }

  function inner(dt: number, T: number) {
    for (let i = 0; i < n; i++) {
      const s = specs[i], isP = !!s.plane, b = body(i);
      if (mode[i] >= ASC) { trip(i, dt, T); continue; }
      if (s.trip && (mode[i] === GRAZE || mode[i] === WALK) && (tripT[i] -= dt) <= 0) { if (startTrip(i)) { trip(i, dt, T); continue; } tripT[i] = 20; }
      modeT[i] -= dt;
      if (mode[i] === HOP) {
        hopT[i] -= dt;
        if (hopT[i] <= 0) { hopY[i] = 0; setMode(i, GRAZE); modeT[i] = 0.5 + R() * 2; }
      } else if (modeT[i] <= 0) setMode(i, mode[i] === WALK ? GRAZE : WALK);

      // heading: slow wander, steered away from anything ahead
      const cx = isP ? pu[i] : px[i], cz = isP ? pv[i] : pz[i];
      const hx = Math.cos(th[i]), hz = isP ? Math.sin(th[i]) : -Math.sin(th[i]);
      const look = b + s.len * 0.7 + spd[i] * 0.8;
      let want = th[i] + (snail(i) ? 0.12 : 0.3) * Math.sin(T * w1[i] + p1[i]) * dt * 6 * (1 + Math.sin(T * w2[i] + p2[i]) * 0.5);
      if (mode[i] !== GRAZE) {
        const k0 = isP ? paneBlocked(i, cx + hx * look, cz + hz * look) : blockedAt(i, cx + hx * look, cz + hz * look);
        // bounds (pane edges / the water line and floor) count as blocked too
        let kb = 0;
        if (isP) { const P = s.plane!, nu = cx + hx * look, nv = cz + hz * look; if (nu < P.u0 || nu > P.u1 || nv < P.v0 || nv > P.v1) kb = 1; }
        if (k0 > 0 || kb > 0) {
          let best = -1e9, bj = 0;
          for (let j = 0; j < 9; j++) {
            const a = th[i] + FAN[j], dx = Math.cos(a), dz = isP ? Math.sin(a) : -Math.sin(a), qx = cx + dx * look, qz = cz + dz * look;
            let blocked = isP ? paneBlocked(i, qx, qz) : blockedAt(i, qx, qz);
            if (isP) { const P = s.plane!; if (qx < P.u0 || qx > P.u1 || qz < P.v0 || qz > P.v1) blocked = 1; }
            const sc = -3 * blocked - 0.15 * Math.abs(FAN[j]) + (j === 0 ? 0.2 : 0);
            if (sc > best) { best = sc; bj = j; }
          }
          want = th[i] + FAN[bj];
          if (best <= -3) { setMode(i, GRAZE); modeT[i] = 1 + R() * 3; want = th[i] + (R() < 0.5 ? 1 : -1) * 2.2; } // boxed in: stop, then turn right round
        }
      }
      let dth = want - th[i]; dth = Math.atan2(Math.sin(dth), Math.cos(dth));
      const maxTurn = (snail(i) ? 35 : s.kind === 'crab' ? 90 : 130) * D2R * dt * (mode[i] === GRAZE ? (s.kind === 'shrimp' ? 0.04 : 0.25) : 1); // a shrimp feeding sits facing one way
      th[i] += Math.max(-maxTurn, Math.min(maxTurn, dth)); turnS[i] += (Math.max(-maxTurn, Math.min(maxTurn, dth)) / dt - turnS[i]) * Math.min(1, dt * 4);

      // speed
      let target = 0;
      if (mode[i] === WALK) target = s.speed * (0.75 + 0.25 * Math.sin(T * w2[i] + p2[i]) + 0.1 * Math.sin(T * 3.1 + p1[i]));
      else if (mode[i] === HOP) target = hopVx[i];
      if (mode[i] === GRAZE && s.kind === 'shrimp') target = s.speed * 0.08 * (0.5 + 0.5 * Math.sin(T * 2 + p1[i])); // picks at the surface, edging along
      const ac = (snail(i) ? 0.6 : 4) * s.speed * dt;
      spd[i] += Math.max(-ac, Math.min(ac, target - spd[i]));

      // a hop: swim a short way (shrimp, from the ground only) and land on the ground again
      if (s.kind === 'shrimp' && mode[i] === WALK && !isP && R() < s.hop / 60 * dt) {
        const dist = s.len * (1.2 + R() * 1.5), hx2 = Math.cos(th[i]), hz2 = -Math.sin(th[i]);
        if (blockedAt(i, px[i] + hx2 * (dist + b), pz[i] + hz2 * (dist + b)) === 0 && blockedAt(i, px[i] + hx2 * dist * 0.5, pz[i] + hz2 * dist * 0.5) === 0) {
          mode[i] = HOP; hopT[i] = 0.7 + R() * 0.3; hopVx[i] = dist / hopT[i]; spd[i] = hopVx[i]; hopY[i] = 0; modeT[i] = 99;
        }
      }
      if (mode[i] === HOP) hopY[i] = Math.sin(Math.PI * Math.max(0, 1 - hopT[i] / 0.85)) * s.len * 0.6;

      // move
      const mx = Math.cos(th[i]) * spd[i] * dt, mz = (isP ? Math.sin(th[i]) : -Math.sin(th[i])) * spd[i] * dt;
      const o = poses[i];
      if (isP) {
        const P = s.plane!;
        pu[i] = Math.max(P.u0, Math.min(P.u1, pu[i] + mx)); pv[i] = Math.max(P.v0, Math.min(P.v1, pv[i] + mz));
        const du = pu[i] - hu[i], dv = pv[i] - hv[i];
        o.x = s.home.x + du * P.u[0] + dv * P.v[0]; o.y = s.home.y + du * P.u[1] + dv * P.v[1]; o.z = s.home.z + du * P.u[2] + dv * P.v[2];
        o.yaw = th[i] * R2D; o.pitch = s.home.pitch; o.roll = s.home.roll;
        continue;
      }
      px[i] += mx; pz[i] += mz;
      // hard guarantee: never inside anything solid (push out sideways)
      for (let it = 0; it < 3; it++) {
        const h = hh(i), y = field.floorAt(px[i], pz[i]) + h;
        grad[0] = 0; grad[1] = 0; grad[2] = 0;
        const c = field.clearance(px[i], y, pz[i], grad, h * 1.2);
        if (c >= h * 0.8 || Math.abs(grad[1]) > 0.6) break;
        const gl = Math.hypot(grad[0], grad[2]); if (gl < 1e-6) break;
        const push = (h * 0.8 - c) + 0.05;
        px[i] += grad[0] / gl * push; pz[i] += grad[2] / gl * push;
      }
      px[i] = Math.max(field.min[0] + b, Math.min(field.max[0] - b, px[i])); pz[i] = Math.max(field.min[2] + b, Math.min(field.max[2] - b, pz[i]));
      // pose: on the ground, tilted along the slope, nodding while it grazes
      const f0 = field.floorAt(px[i], pz[i]), e = Math.max(4, s.len * 0.3), c = Math.cos(th[i]), sn = -Math.sin(th[i]);
      const pitch = Math.atan2(field.floorAt(px[i] + c * e, pz[i] + sn * e) - field.floorAt(px[i] - c * e, pz[i] - sn * e), 2 * e) * R2D;
      const roll = Math.atan2(field.floorAt(px[i] - sn * e, pz[i] + c * e) - field.floorAt(px[i] + sn * e, pz[i] - c * e), 2 * e) * R2D;
      let nd = 0;
      if (mode[i] === GRAZE && s.kind !== 'snail') nd = s.kind === 'shrimp' ? -2 + 1.2 * Math.sin(T * 1.3 + p1[i]) : -5 + 4 * Math.sin(T * 5 + p1[i]); // dips and picks
      if (mode[i] === HOP) nd = 14 * Math.cos(Math.PI * Math.max(0, Math.min(1, 1 - hopT[i] / 0.85)));
      if (s.kind === 'shrimp') o.fore += ((mode[i] === GRAZE ? 1 : 0.15) - o.fore) * Math.min(1, dt * 3); // FB2: the front claws work while it sits (render/crawl.ts swings them)
      pitchS[i] += (pitch + nd - pitchS[i]) * Math.min(1, dt * 8); rollS[i] += (roll - rollS[i]) * Math.min(1, dt * 8);
      o.x = px[i]; o.z = pz[i]; o.y = f0 + s.rest + hopY[i]; o.yaw = th[i] * R2D; o.pitch = pitchS[i]; o.roll = rollS[i];
      if (s.kind === 'frog') { const wk = mode[i] === WALK && spd[i] > s.speed * 0.2, sw = Math.sin(T * 2 * Math.PI * 0.9 + p1[i]); o.hind += ((wk ? 0.4 * sw : 0) - o.hind) * Math.min(1, dt * 8); o.fore += ((wk ? -0.3 * sw : 0) - o.fore) * Math.min(1, dt * 8); } // leg-walk: legs swing alternately; at rest the splayed pose
    }
  }

  let T = 0;
  return {
    step(dt: number) {
      if (!(dt > 0)) return;
      if (dt > 0.25) dt = 0.25;
      const sub = Math.ceil(dt / 0.05), h = dt / sub;
      for (let k = 0; k < sub; k++) { T += h; inner(h, T); }
    },
    pose(id: number) { const k = idx.get(id); return k === undefined ? null : poses[k]; },
    reset(ids?: number[]) {
      const list = ids ? ids.map(id => idx.get(id)).filter((k): k is number => k !== undefined) : specs.map((_, i) => i);
      for (const i of list) init(i);
    },
  };
}
