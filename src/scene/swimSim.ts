// Free-roam swimming sim (lane SW2): moves every fish round the tank in plain numbers, against a SwimField.
// Conventions (checked against build.ts / scatter.ts): nose = +x at yaw 0, heading (cos p cos y, sin p, -cos p sin y),
// so yaw = atan2(-hz, hx) in degrees; pitch positive = nose up; roll = bank, top toward the inside of the turn.
// Fish heading is a unit vector turned at a limited rate toward a desired direction (goal + flocking + avoidance);
// a hard projection at the end of every step keeps each centre at least its body radius out of anything solid.
// step() allocates nothing: per-fish state lives in typed arrays, scratch values are locals.
import { rng } from '../art/paint';
import type { MakeSwimSim, SwimField, SwimPose, SwimSim, SwimmerSpec, V3 } from './swimTypes';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const MAX_SUB = 1 / 30; // longest internal step (s): a long frame is split so nothing tunnels
const MOVE = 0, REST = 1, HOP = 2; // modes: swim, hover/graze, bottom-dweller hop

export const makeSwimSim: MakeSwimSim = (fish: SwimmerSpec[], field: SwimField, seed: number): SwimSim => {
  const n = fish.length, R = rng(seed ^ 0x5bd1e995);
  const F = () => new Float64Array(n);
  const px = F(), py = F(), pz = F(), hx = F(), hy = F(), hz = F(), spd = F();
  const dsx = F(), dsy = F(), dsz = F(), gmarg = F(), pace = F(), rad = F(), len = F(), cruise = F(), turn = F(), band0 = F(), band1 = F(), marg = F();
  const gx = F(), gy = F(), gz = F(), goalT = F(), modeT = F(), burstT = F(), ownT = F();
  const ph1 = F(), ph2 = F(), ph3 = F(), w1 = F(), w2 = F(), side = F(), pitchS = F(), rollS = F(), yawRate = F(), vyB = F(), hopH = F();
  const avx = F(), avy = F(), avz = F(), avK = F(), c0 = F(), g0x = F(), g0y = F(), g0z = F(), indep = F();
  const fanIdx = new Int8Array(n), mode = new Uint8Array(n), gi = new Int32Array(n).fill(-1), bottom = new Uint8Array(n), tight = new Uint8Array(n);
  const poses: SwimPose[] = [], idIndex = new Map<number, number>();
  const grad: V3 = [0, 0, 0];

  // groups
  const keyIdx = new Map<string, number>(); let G = 0;
  for (let i = 0; i < n; i++) { const g = fish[i].group; if (g) { let k = keyIdx.get(g.key); if (k === undefined) { k = G++; keyIdx.set(g.key, k); } gi[i] = k; } }
  const gStart = new Int32Array(G + 1), gMem = new Int32Array(n), gN = new Int32Array(G), gFirst = new Int32Array(G).fill(-1);
  for (let i = 0; i < n; i++) if (gi[i] >= 0) gN[gi[i]]++;
  for (let g = 0; g < G; g++) gStart[g + 1] = gStart[g] + gN[g];
  { const fill = new Int32Array(G); for (let i = 0; i < n; i++) { const g = gi[i]; if (g < 0) continue; gMem[gStart[g] + fill[g]++] = i; if (gFirst[g] < 0) gFirst[g] = i; } }
  const GF = () => new Float64Array(G);
  const gcx = GF(), gcy = GF(), gcz = GF(), ghx = GF(), ghy = GF(), ghz = GF(), gpol = GF(), gspread = GF();
  const ggx = GF(), ggy = GF(), ggz = GF(), ggT = GF(), gModeT = GF(), gSide = GF(), gPh = GF(), gSpeedW = GF();
  const gMode = new Uint8Array(G), gTight = new Uint8Array(G), gBottom = new Uint8Array(G);

  const FAN = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6]; // radians off the heading
  // clearance at a probe point; a bottom dweller probes above the ground so the ground itself never reads as an obstacle
  const probeC = (_i: number, x: number, y: number, z: number, m: number, isB: boolean) => {
    if (isB) { const fl = field.floorAt(x, z) + m + 1; if (y < fl) y = fl; }
    return field.clearance(x, y, z, undefined, m);
  };
  const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
  const midX = (field.min[0] + field.max[0]) / 2, midY = (field.min[1] + field.max[1]) / 2, midZ = (field.min[2] + field.max[2]) / 2;

  // Pick a wander goal (3 valid samples, the farthest from (fx, fz) wins) into the given arrays at index k.
  const cx3 = [0, 0, 0, 0], cz3 = [0, 0, 0, 0], cy3 = [0, 0, 0, 0];
  function pickGoal(ax: Float64Array, ay: Float64Array, az: Float64Array, k: number, fx: number, fz: number, lo: number, hi: number, margin: number, isBottom: boolean, r: number) {
    const need = Math.min(margin, r * 4 + 24);
    let found = 0;
    for (let t = 0; t < 16 && found < 4; t++) {
      const x = field.min[0] + margin + R() * Math.max(1, field.max[0] - field.min[0] - 2 * margin);
      const z = field.min[2] + margin + R() * Math.max(1, field.max[2] - field.min[2] - 2 * margin);
      const fl = field.floorAt(x, z), free = field.waterTop - fl;
      if (free < r * 2.5) continue;
      const y = isBottom ? fl + r * 1.3 : fl + (lo + R() * (hi - lo)) * free;
      if (field.clearance(x, y, z, undefined, need) < (isBottom ? r * 1.5 : need)) continue;
      cx3[found] = x; cy3[found] = y; cz3[found] = z; found++;
    }
    if (!found) { void fx; void fz; return false; } // none free this time: keep the old goal
    let b = 0, bd = -1;
    for (let t = 0; t < found; t++) { const d = (cx3[t] - fx) ** 2 + (cz3[t] - fz) ** 2; if (d > bd) { bd = d; b = t; } }
    ax[k] = cx3[b]; ay[k] = cy3[b]; az[k] = cz3[b];
    return true;
  }
  const fishGoal = (i: number) => { goalT[i] = pickGoal(gx, gy, gz, i, px[i], pz[i], band0[i], band1[i], gmarg[i], !!bottom[i], rad[i]) ? 0 : 35; };
  const groupGoal = (g: number) => {
    const f = gFirst[g];
    ggT[g] = pickGoal(ggx, ggy, ggz, g, gcx[g], gcz[g], band0[f], band1[f], gmarg[f] + Math.min(len[f] * 4, Math.sqrt(gN[g]) * len[f] * 0.5), !!gBottom[g], rad[f]) ? 0 : 35;
  };

  function setMode(i: number, m: number) {
    mode[i] = m;
    if (bottom[i]) modeT[i] = m === REST ? 5 + R() * 20 : m === HOP ? 1.2 + R() * 0.5 : 3 + R() * 6;
    else modeT[i] = pace[i] < 1 ? (m === REST ? 3 + R() * 7 : 6 + R() * 14) : m === REST ? 2 + R() * 4 : 15 + R() * 40;
  }
  function setGroupMode(g: number, m: number) {
    gMode[g] = m; gModeT[g] = m === REST ? 6 + R() * 20 : 3 + R() * 6;
  }

  function initFish(i: number) {
    const s = fish[i], h = s.home, yaw = h.yaw * D2R, p = bottom[i] ? 0 : h.pitch * D2R;
    px[i] = h.x; py[i] = h.y; pz[i] = h.z;
    hx[i] = Math.cos(p) * Math.cos(yaw); hy[i] = Math.sin(p); hz[i] = -Math.cos(p) * Math.sin(yaw);
    spd[i] = 0; vyB[i] = 0; yawRate[i] = 0; pitchS[i] = h.pitch; rollS[i] = h.roll; avK[i] = 0; c0[i] = 1e9; dsx[i] = 0; dsy[i] = 0; dsz[i] = 0; fanIdx[i] = 0; burstT[i] = 0; ownT[i] = 0; hopH[i] = 0;
    const P = poses[i]; P.x = h.x; P.y = h.y; P.z = h.z; P.yaw = h.yaw; P.pitch = h.pitch; P.roll = h.roll;
    if (gi[i] < 0 || !bottom[i]) setMode(i, bottom[i] ? REST : MOVE);
    else { mode[i] = gMode[gi[i]]; modeT[i] = 0; }
    if (!bottom[i]) modeT[i] = 5 + R() * 30; // loners hover later, not at once
  }

  for (let i = 0; i < n; i++) {
    const s = fish[i];
    idIndex.set(s.id, i);
    poses.push({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 });
    len[i] = s.len; rad[i] = s.len * 0.12; bottom[i] = s.zone === 'bottom' ? 1 : 0; tight[i] = s.group?.tight ? 1 : 0;
    const bl = 1.2 * Math.pow(40 / Math.max(10, s.len), 0.25); // body lengths per second, cruising
    pace[i] = s.pace ?? 1;
    cruise[i] = s.len * bl * (0.85 + R() * 0.3) * pace[i];
    turn[i] = clamp(75 * Math.pow(40 / Math.max(10, s.len), 0.4), 22, 100) * D2R * (0.85 + R() * 0.3);
    band0[i] = Math.min(s.band[0], s.band[1]); band1[i] = Math.max(s.band[0], s.band[1]);
    marg[i] = rad[i] * 3 + s.len * 0.2;
    gmarg[i] = Math.max(marg[i], s.len * 1.6);
    ph1[i] = R() * 6.28; ph2[i] = R() * 6.28; ph3[i] = R() * 6.28; w1[i] = 0.25 + R() * 0.3; w2[i] = 0.7 + R() * 0.6;
    side[i] = R() < 0.5 ? -1 : 1; indep[i] = R() < 0.3 ? 1 : 0;
  }
  for (let g = 0; g < G; g++) {
    const f = gFirst[g]; gTight[g] = tight[f]; gBottom[g] = bottom[f]; gSide[g] = R() < 0.5 ? -1 : 1; gPh[g] = R() * 6.28; gSpeedW[g] = 0.2 + R() * 0.3;
    gcx[g] = gcy[g] = gcz[g] = 0;
    for (let m = gStart[g]; m < gStart[g + 1]; m++) { const i = gMem[m]; gcx[g] += fish[i].home.x; gcz[g] += fish[i].home.z; }
    gcx[g] /= gN[g]; gcz[g] /= gN[g]; ghx[g] = 1; ggx[g] = gcx[g]; ggy[g] = fish[f].home.y; ggz[g] = gcz[g];
    setGroupMode(g, gBottom[g] ? REST : MOVE);
    groupGoal(g);
  }
  for (let i = 0; i < n; i++) { gx[i] = fish[i].home.x; gy[i] = fish[i].home.y; gz[i] = fish[i].home.z; initFish(i); fishGoal(i); }

  function inner(dt: number, T: number, tick: number) {
    // ---- group statistics, goals, modes
    for (let g = 0; g < G; g++) {
      let sx = 0, sy = 0, sz = 0, ax = 0, ay = 0, az = 0;
      const a = gStart[g], b = gStart[g + 1], cnt = b - a;
      for (let m = a; m < b; m++) { const i = gMem[m]; sx += px[i]; sy += py[i]; sz += pz[i]; ax += hx[i]; ay += hy[i]; az += hz[i]; }
      gcx[g] = sx / cnt; gcy[g] = sy / cnt; gcz[g] = sz / cnt;
      const am = Math.sqrt(ax * ax + ay * ay + az * az);
      gpol[g] = am / cnt;
      if (am > 1e-6) { ghx[g] = ax / am; ghy[g] = ay / am; ghz[g] = az / am; }
      let sp2 = 0;
      for (let m = a; m < b; m++) { const i = gMem[m]; sp2 += (px[i] - gcx[g]) ** 2 + (py[i] - gcy[g]) ** 2 + (pz[i] - gcz[g]) ** 2; }
      gspread[g] = Math.sqrt(sp2 / cnt);
      ggT[g] += dt;
      const f = gFirst[g], dd = Math.sqrt((ggx[g] - gcx[g]) ** 2 + (ggz[g] - gcz[g]) ** 2);
      if (dd < len[f] * 1.5 + gspread[g] * 0.5 || ggT[g] > 45) groupGoal(g);
      if (gBottom[g]) {
        gModeT[g] -= dt;
        if (gModeT[g] <= 0) setGroupMode(g, gMode[g] === REST ? MOVE : REST);
      }
    }

    for (let i = 0; i < n; i++) {
      const L = len[i], r = rad[i], m = marg[i], g = gi[i], isB = bottom[i] === 1;
      goalT[i] += dt;
      // ---- mode (swim / rest) timers
      if (g < 0 || !isB) {
        modeT[i] -= dt;
        if (modeT[i] <= 0) {
          if (isB) { if (mode[i] === REST) { if (R() < 0.06) { setMode(i, HOP); hopH[i] = L * (0.5 + R() * 0.7); } else setMode(i, MOVE); } else setMode(i, REST); }
          else if (g < 0) setMode(i, mode[i] === MOVE ? REST : MOVE);
          else modeT[i] = 20 + R() * 40; // shoal / school fish keep moving
        }
        if (!isB && g < 0 && mode[i] === REST && R() < dt * 0.02) { mode[i] = MOVE; modeT[i] = 10 + R() * 30; }
      } else {
        const gm = gMode[g];
        if (mode[i] !== HOP) {
          // a grouped bottom dweller follows the group's mode, a few stragglers a beat late
          if (mode[i] !== gm) { modeT[i] -= dt; if (modeT[i] <= 0) { mode[i] = gm; modeT[i] = R() * 2.5 + (indep[i] ? 3 : 0); if (gm === MOVE && R() < 0.04) { mode[i] = HOP; modeT[i] = 1.2 + R() * 0.5; hopH[i] = L * (0.5 + R() * 0.7); } } }
        } else { modeT[i] -= dt; if (modeT[i] <= 0) { mode[i] = gMode[g]; modeT[i] = 1 + R() * 2; } }
      }
      if (burstT[i] > 0) burstT[i] -= dt;
      else if (!isB && mode[i] === MOVE && (g < 0 || !tight[i]) && R() < dt / 70) burstT[i] = 0.8 + R() * 1.2;

      // ---- where it wants to go
      let useOwn = g < 0;
      if (g >= 0 && !tight[i]) { if (ownT[i] > 0) { ownT[i] -= dt; useOwn = true; } else if (indep[i] && R() < dt / 60) { ownT[i] = 10 + R() * 15; fishGoal(i); } }
      let tx: number, ty: number, tz: number;
      if (useOwn) {
        tx = gx[i]; ty = gy[i]; tz = gz[i];
        const dd = Math.sqrt((tx - px[i]) ** 2 + (tz - pz[i]) ** 2 + (isB ? 0 : (ty - py[i]) ** 2));
        if (dd < L * 2 || goalT[i] > 45) { fishGoal(i); if (!isB && g < 0 && R() < 0.35) { mode[i] = REST; modeT[i] = 2 + R() * 5; } }
      } else { tx = ggx[g]; ty = ggy[g]; tz = ggz[g]; }
      let wx = tx - px[i], wy = isB ? 0 : ty - py[i], wz = tz - pz[i];
      let wm = Math.sqrt(wx * wx + wy * wy + wz * wz);
      if (wm < 1e-6) { wx = hx[i]; wy = 0; wz = hz[i]; wm = Math.sqrt(wx * wx + wz * wz) || 1; }
      wx /= wm; wy /= wm; wz /= wm;
      // slow side-to-side meander so paths are not ruler straight
      const amp = g < 0 ? 0.28 : tight[i] ? 0 : 0.15;
      if (amp > 0) { const a = amp * Math.sin(T * w1[i] + ph1[i]) + 0.4 * amp * Math.sin(T * w2[i] * 0.6 + ph2[i]), c = Math.cos(a), s = Math.sin(a); const x2 = wx * c - wz * s; wz = wx * s + wz * c; wx = x2; }

      let over = 0, boost = 1;
      if (g >= 0) {
        const t = tight[i] === 1, cnt = gN[g];
        const r0 = L * (t ? 1.5 : 4) + Math.sqrt(cnt) * L * (t ? 0.45 : 1.6);
        const dxc = gcx[g] - px[i], dyc = (isB ? 0 : gcy[g] - py[i]), dzc = gcz[g] - pz[i];
        const dc = Math.sqrt(dxc * dxc + dyc * dyc + dzc * dzc);
        over = Math.max(0, (dc - r0) / r0);
        if (over > 0.8) ownT[i] = 0;
        let wg = (t ? 0.7 : 0.6), wa = (t ? 1 : 0.35);
        if (ownT[i] > 0) { wg = 1; wa = 0.1; }
        let wc = (t ? 0.35 : 0.12) + (t ? 2 : 1.2) * over; wc *= dc < r0 ? dc / r0 : 1; if (ownT[i] > 0 && over < 0.8) wc *= 0.3; wc = Math.min(wc, 2.5);
        let vx = wx * wg, vy = wy * wg, vz = wz * wg;
        vx += ghx[g] * wa; vy += (isB ? 0 : ghy[g]) * wa; vz += ghz[g] * wa;
        if (dc > 1e-3) { vx += dxc / dc * wc; vy += dyc / dc * wc; vz += dzc / dc * wc; }
        wx = vx; wy = vy; wz = vz;
        boost = 1 + 0.7 * Math.min(1, over) + (over > 1 ? 0.5 : 0);
      }
      // separation (everyone, brute force: cutoff on dx, n is tens)
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const same = g >= 0 && gi[j] === g;
        const sr = same ? L * (tight[i] ? 1.7 : 2.4) : (L + len[j]) * 0.8;
        const dx = px[i] - px[j]; if (dx > sr || dx < -sr) continue;
        const dz = pz[i] - pz[j]; if (dz > sr || dz < -sr) continue;
        const dy = py[i] - py[j]; if (dy > sr || dy < -sr) continue;
        const d2 = dx * dx + dy * dy + dz * dz; if (d2 >= sr * sr) continue;
        const d = Math.sqrt(d2) + 1e-3, k = (same ? 2 : 1.2) * (1 - d / sr) / d;
        wx += dx * k; wy += (isB ? 0 : dy) * k; wz += dz * k;
      }
      // keep to the preferred band of the water column
      if (!isB) {
        const fl = field.floorAt(px[i], pz[i]), free = Math.max(1, field.waterTop - fl);
        const lo = fl + band0[i] * free, hi = fl + band1[i] * free;
        const out = py[i] < lo ? lo - py[i] : py[i] > hi ? hi - py[i] : 0;
        if (out !== 0) wy += clamp(out / (L * 3), -1, 1) * 0.8;
      }
      wm = Math.sqrt(wx * wx + wy * wy + wz * wz);
      if (wm < 1e-6) { wx = hx[i]; wy = hy[i]; wz = hz[i]; wm = 1; }
      wx /= wm; wy /= wm; wz /= wm;

      // ---- look for obstacles (every other step per fish, staggered; the cache applies in between).
      // Three probes ahead / left / right say how blocked the way is; if blocked, a fan of directions is scored by
      // free space and by agreement with where the fish wants to go, so a corner is escaped toward open water.
      if (((tick + i) & 1) === 0) {
        const la = r + L * 1.8 + spd[i] * 1.5;
        let hh = Math.sqrt(hx[i] * hx[i] + hz[i] * hz[i]); if (hh < 1e-6) hh = 1;
        const ux = hx[i] / hh, uz = hz[i] / hh;
        let Kp = 0;
        for (let pr = 0; pr < 3; pr++) {
          const a = pr === 1 ? 0.7 : pr === 2 ? -0.7 : 0, c = Math.cos(a), sn = Math.sin(a), f = pr === 0 ? la : la * 0.8;
          const k = 1 - probeC(i, px[i] + (ux * c - uz * sn) * f, pr === 0 ? py[i] + hy[i] * la : py[i], pz[i] + (ux * sn + uz * c) * f, m, isB) / m;
          Kp = Math.max(Kp, pr === 0 ? k : k * 0.8);
        }
        if (isB && Kp > 0.3 && probeC(i, px[i] + hx[i] * la, py[i] + L * 0.45, pz[i] + hz[i] * la, m, false) > m * 0.9) hopH[i] = Math.max(hopH[i], L * 0.6); // low thing ahead: climb it
        if (Kp <= 0.02) { avK[i] = 0; fanIdx[i] = 0; }
        else {
          let wh = Math.sqrt(wx * wx + wz * wz), wxh = 0, wzh = 0; if (wh > 1e-6) { wxh = wx / wh; wzh = wz / wh; }
          const wyc = isB ? 0 : clamp(wy, -0.34, 0.34);
          let best = -1e9, bx = ux, by = 0, bz = uz, bj = 0;
          for (let j = 0; j < 11; j++) {
            let fx: number, fy: number, fz: number;
            if (j < 9) { const a = FAN[j], c = Math.cos(a), sn = Math.sin(a); fx = ux * c - uz * sn; fz = ux * sn + uz * c; fy = wyc; }
            else if (isB) break;
            else { const s2 = j === 9 ? 0.34 : -0.34, c2 = 0.94; fx = ux * c2; fz = uz * c2; fy = s2; }
            const cj = probeC(i, px[i] + fx * la, py[i] + fy * la, pz[i] + fz * la, m, isB);
            const q = cj / m > 1 ? 1 : cj / m < -1 ? -1 : cj / m;
            const align = fx * wxh + fz * wzh + (j < 9 ? 0 : fy * wy);
            const sc = 2 * q + align + (j === fanIdx[i] ? 0.3 : 0) - 0.08 * Math.abs(j < 9 ? FAN[j] : 0);
            if (sc > best) { best = sc; bx = fx; by = fy; bz = fz; bj = j; }
          }
          fanIdx[i] = bj;
          avx[i] = bx; avy[i] = by; avz[i] = bz; avK[i] = clamp(Kp * 1.4, 0, 1);
        }
      }
      // the clearance at the fish itself (from last step's projection): too close to something, push straight off
      let K = avK[i], ax = avx[i], ay = avy[i], az = avz[i];
      if (c0[i] < m) {
        const k0 = clamp(1 - c0[i] / m, 0, 1);
        let gx_ = g0x[i], gy_ = g0y[i], gz_ = g0z[i];
        if (isB) gy_ = 0;
        const gl = Math.sqrt(gx_ * gx_ + gy_ * gy_ + gz_ * gz_);
        if (gl > 1e-6 && !(isB && g0y[i] > 0.6)) {
          const am0 = Math.sqrt(ax * ax + ay * ay + az * az);
          if (am0 < 1e-6) { ax = hx[i]; ay = hy[i]; az = hz[i]; }
          ax += gx_ / gl * k0 * 1.5; ay += gy_ / gl * k0 * 1.5; az += gz_ / gl * k0 * 1.5; if (k0 * 1.2 > K) K = k0 * 1.2;
        }
      }
      K = clamp(K, 0, 1);
      let dx = wx, dy = wy, dz = wz;
      if (K > 0) {
        const am = Math.sqrt(ax * ax + ay * ay + az * az);
        if (am > 1e-6) { dx = wx * (1 - K) + ax / am * K; dy = wy * (1 - K) + ay / am * K; dz = wz * (1 - K) + az / am * K; }
      }
      if (isB) dy = 0;
      let dm = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dm < 1e-6) { dx = hx[i]; dy = hy[i]; dz = hz[i]; dm = 1; }
      dx /= dm; dy /= dm; dz /= dm;
      // smooth the wish a little so a flip between two options is not a flick of the tail (less so when something is close)
      { const k = Math.min(1, dt * (2.5 + 8 * K)); if (dsx[i] === 0 && dsy[i] === 0 && dsz[i] === 0) { dsx[i] = hx[i]; dsy[i] = hy[i]; dsz[i] = hz[i]; }
        dsx[i] += (dx - dsx[i]) * k; dsy[i] += (dy - dsy[i]) * k; dsz[i] += (dz - dsz[i]) * k;
        const sm = Math.sqrt(dsx[i] * dsx[i] + dsy[i] * dsy[i] + dsz[i] * dsz[i]);
        if (sm > 0.05) { dx = dsx[i] / sm; dy = dsy[i] / sm; dz = dsz[i] / sm; dsx[i] = dx; dsy[i] = dy; dsz[i] = dz; } else { dsx[i] = hx[i]; dsy[i] = hy[i]; dsz[i] = hz[i]; } }
      // a direct about-turn has no short way round: swing to one side
      const dot = hx[i] * dx + hy[i] * dy + hz[i] * dz;
      if (dot < -0.95) { const sd = g >= 0 ? gSide[g] : side[i]; dx += -hz[i] * sd * 0.7; dz += hx[i] * sd * 0.7; dm = Math.sqrt(dx * dx + dy * dy + dz * dz); dx /= dm; dy /= dm; dz /= dm; }

      // ---- turn (limited rate, quicker when something is close)
      const cd = clamp(hx[i] * dx + hy[i] * dy + hz[i] * dz, -1, 1), ang = Math.acos(cd);
      const maxStep = turn[i] * (1 + 0.5 * K) * dt * (isB ? 1.3 : 1);
      const yawBefore = Math.atan2(-hz[i], hx[i]);
      let nx: number, ny: number, nz: number;
      if (ang <= maxStep) { nx = dx; ny = dy; nz = dz; }
      else { const t = maxStep / ang; nx = hx[i] * (1 - t) + dx * t; ny = hy[i] * (1 - t) + dy * t; nz = hz[i] * (1 - t) + dz * t; }
      if (isB) ny = 0;
      // pitch limit
      const lim = Math.sin((isB ? 0 : 20) * D2R);
      if (ny > lim || ny < -lim) { const hs = Math.sqrt(Math.max(1e-9, nx * nx + nz * nz)), nh = Math.sqrt(1 - lim * lim); ny = ny > 0 ? lim : -lim; nx = nx / hs * nh; nz = nz / hs * nh; }
      const nm = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      hx[i] = nx / nm; hy[i] = ny / nm; hz[i] = nz / nm;
      let dyaw = Math.atan2(-hz[i], hx[i]) - yawBefore; if (dyaw > Math.PI) dyaw -= 2 * Math.PI; else if (dyaw < -Math.PI) dyaw += 2 * Math.PI;
      yawRate[i] += (dyaw / dt - yawRate[i]) * Math.min(1, dt * 5);

      // ---- speed
      const sv = 1 + 0.18 * Math.sin(T * w1[i] + ph3[i]) + 0.1 * Math.sin(T * w2[i] + ph2[i]);
      let target: number;
      if (isB) target = mode[i] === REST ? L * 0.05 * (0.5 + 0.5 * Math.sin(T * 0.5 + ph1[i]) ** 2) : mode[i] === HOP ? L * 0.9 : L * 0.55 * sv * boost;
      else if (mode[i] === REST) target = L * 0.04;
      else {
        target = cruise[i] * sv * boost;
        if (g >= 0 && tight[i]) target *= 1 + 0.12 * Math.sin(T * gSpeedW[g] + gPh[g]);
        if (burstT[i] > 0) target *= pace[i] < 1 ? 1.5 : 2.6;
      }
      target *= 1 - 0.5 * K;
      const ac = (target > spd[i] ? 2.5 : 3.5) * L * (1 + K) * dt;
      spd[i] += clamp(target - spd[i], -ac, ac);
      if (spd[i] < 0) spd[i] = 0;

      // ---- move
      px[i] += hx[i] * spd[i] * dt; pz[i] += hz[i] * spd[i] * dt;
      if (isB) {
        const ahx = px[i] + hx[i] * L * 0.6, ahz = pz[i] + hz[i] * L * 0.6;
        const fl = Math.max(field.floorAt(px[i], pz[i]), field.floorAt(ahx, ahz));
        const tyB = fl + r * 1.3 + (mode[i] === HOP ? hopH[i] : hopH[i] * 0.5 * (avK[i] > 0.3 ? 1 : 0));
        const want = clamp((tyB - py[i]) * 2, -L * 0.4, L * 0.8);
        vyB[i] += (want - vyB[i]) * Math.min(1, dt * 3);
        py[i] += vyB[i] * dt;
        if (hopH[i] > 0 && mode[i] !== HOP) hopH[i] = Math.max(0, hopH[i] - L * dt * 0.3);
      } else py[i] += hy[i] * spd[i] * dt;

      // ---- hard guarantee: centre never ends a step inside its body radius of anything solid
      px[i] = clamp(px[i], field.min[0] + r, field.max[0] - r); pz[i] = clamp(pz[i], field.min[2] + r, field.max[2] - r); py[i] = clamp(py[i], field.min[1] + r, field.max[1] - r);
      for (let it = 0; it < 5; it++) {
        grad[0] = 0; grad[1] = 0; grad[2] = 0;
        const c = field.clearance(px[i], py[i], pz[i], grad, m);
        c0[i] = c; g0x[i] = grad[0]; g0y[i] = grad[1]; g0z[i] = grad[2];
        if (c >= r) break;
        let gl = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1] + grad[2] * grad[2]);
        if (gl < 1e-6) { // no direction known: head for the middle of the tank
          grad[0] = midX - px[i]; grad[1] = midY - py[i]; grad[2] = midZ - pz[i]; gl = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1] + grad[2] * grad[2]) || 1;
        }
        const ux = grad[0] / gl, uy = grad[1] / gl, uz = grad[2] / gl, push = r - c + 0.01;
        px[i] += ux * push; py[i] += uy * push; pz[i] += uz * push;
        const dg = hx[i] * ux + hy[i] * uy + hz[i] * uz; // stop heading into it
        if (dg < 0) { hx[i] -= dg * ux; hy[i] -= dg * uy; hz[i] -= dg * uz; if (isB) hy[i] = 0; const hm = Math.sqrt(hx[i] * hx[i] + hy[i] * hy[i] + hz[i] * hz[i]); if (hm > 1e-6) { hx[i] /= hm; hy[i] /= hm; hz[i] /= hm; } else { hx[i] = ux; hy[i] = 0; hz[i] = uz; } }
      }

      // ---- pose
      const P = poses[i];
      P.x = px[i]; P.y = py[i]; P.z = pz[i];
      P.yaw = Math.atan2(-hz[i], hx[i]) * R2D;
      let pt: number;
      if (isB) pt = mode[i] === REST ? -20 : clamp(Math.atan2(vyB[i], Math.max(spd[i], 1)) * R2D * 0.5, -15, 15) - 5;
      else pt = clamp(Math.asin(clamp(hy[i], -1, 1)) * R2D, -28, 28);
      pitchS[i] += (pt - pitchS[i]) * Math.min(1, dt * 4);
      rollS[i] += (clamp(-yawRate[i] * R2D * 0.12, -12, 12) - rollS[i]) * Math.min(1, dt * 4);
      P.pitch = pitchS[i]; P.roll = rollS[i];
    }
  }

  let T = 0, tick = 0;
  return {
    step(dt: number) {
      if (!(dt > 0)) return;
      if (dt > 0.25) dt = 0.25;
      const sub = Math.ceil(dt / MAX_SUB), h = dt / sub;
      for (let s = 0; s < sub; s++) { T += h; inner(h, T, tick++); }
    },
    pose(id: number) { const k = idIndex.get(id); return k === undefined ? null : poses[k]; },
    reset(ids?: number[]) {
      const list = ids ? ids.map(id => idIndex.get(id)).filter((k): k is number => k !== undefined) : fish.map((_, i) => i);
      for (const i of list) { initFish(i); fishGoal(i); }
      const seen = new Set<number>(); for (const i of list) { const g = gi[i]; if (g >= 0 && !seen.has(g)) { seen.add(g); groupGoal(g); } }
    },
  };
};

export type { SwimField };
