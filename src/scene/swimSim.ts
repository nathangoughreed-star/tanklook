// Free-roam swimming sim (lane SW2): moves every fish round the tank in plain numbers, against a SwimField.
// Conventions (checked against build.ts / scatter.ts): nose = +x at yaw 0, heading (cos p cos y, sin p, -cos p sin y),
// so yaw = atan2(-hz, hx) in degrees; pitch positive = nose up; roll = bank, top toward the inside of the turn.
// Fish heading is a unit vector turned at a limited rate toward a desired direction (goal + flocking + avoidance);
// a hard projection at the end of every step keeps each centre at least its body radius out of anything solid.
// step() allocates nothing: per-fish state lives in typed arrays, scratch values are locals.
import { rng } from '../art/paint';
import type { MakeSwimSim, SwimField, SwimPose, SwimSim, SwimmerSpec, V3 } from './swimTypes';
import { makeIsItem, pickHomes } from './swimHome';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const MAX_SUB = 1 / 30; // longest internal step (s): a long frame is split so nothing tunnels
const PIV = 0.2; // slow-turn pivot, body lengths ahead of the centre (~0.3 TL behind the snout)
const MOVE = 0, REST = 1, HOP = 2; // modes: swim, hover/graze, bottom-dweller hop

export const makeSwimSim: MakeSwimSim = (fish: SwimmerSpec[], field: SwimField, seed: number): SwimSim => {
  const n = fish.length, R = rng(seed ^ 0x5bd1e995);
  const F = () => new Float64Array(n);
  const px = F(), py = F(), pz = F(), hx = F(), hy = F(), hz = F(), spd = F();
  const dsx = F(), dsy = F(), dsz = F(), gmarg = F(), pace = F(), rad = F(), len = F(), cruise = F(), turn = F(), band0 = F(), band1 = F(), marg = F();
  const gx = F(), gy = F(), gz = F(), goalT = F(), modeT = F(), burstT = F(), ownT = F();
  const ph1 = F(), ph2 = F(), ph3 = F(), w1 = F(), w2 = F(), side = F(), pitchS = F(), rollS = F(), yawRate = F(), vyB = F(), hopH = F();
  const avx = F(), avy = F(), avz = F(), avK = F(), c0 = F(), g0x = F(), g0y = F(), g0z = F(), indep = F();
  // FB1: hovering (hov: weight, hovPec: fan width, hovCau: tail kept) and digging / hiding (digSt: 0 none, 1 approach, 2 nose in, 3 hold, 4 wriggle out, 5 walk to a hide, 6 hidden)
  const hov = F(), hovPec = F(), hovCau = F(), fanS = F(), calmS = F(), holdX = F(), holdZ = F(), nudgeT = F(), kick = F();
  const dRate = F(), dDepth = F(), dPitch = F(), dH0 = F(), dH1 = F(), dHide = F(), dHT0 = F(), dHT1 = F(), dK = F(), dDark = F(), dRest = F();
  const digT = F(), digK = F(), digTgt = F(), digCd = F(), hgx = F(), hgz = F(), dgx = F(), dgz = F(), wig = F(), digHold = F(), sinkS = F();
  const sRate = F(), sTau = F(), sTurn = F(), pulseT = F(), pulseP = F(), burstLeft = F(), jitA = F(), pv0 = F(); // burst-and-coast
  const subMode = new Uint8Array(n), subT = F(), mx0 = F(), mx1 = F(), mx2 = F(); // FB2: 0 pulse-glide, 1 slow cruise, 2 hover
  const restS = F(), breathS = F(); // FB2: a bottom dweller's share of time resting (0 = the old mix) and its breathing amount
  // FB3: habit (home spot, leash, posture, small actions). hS: 0 free, 1 dart to home, 2 hold in it, 3 peek out, 4 go to peck, 5 pecking, 6 patrol, 7 flick, 8 hop, 9 still after a hop
  const isItem = makeIsItem(field);
  const RH = rng(seed ^ 0x3c6ef372); // its own stream: a tank with habit fish does not move the others' randomness
  const hb = new Uint8Array(n), hS = new Uint8Array(n), hPost = new Uint8Array(n); // hPost: 0 mid, 1 perch, 2 hoverLow, 3 hug
  const hLeash = F(), hGap = F(), hOri = F(), hHov = F(), hAct = F(), hRt = new Float64Array(n * 5), hH0 = F(), hH1 = F(), hmx = F(), hmy = F(), hmz = F(), hnx = F(), hny = F(), hnz = F();
  const hT = F(), hCd = F(), htx = F(), hty = F(), htz = F(), hqx = F(), hqy = F(), hqz = F(), hDur = F(), hLap = F(), flickS = F();
  let ovOn = 0, ovx = 0, ovy = 0, ovz = 0, ovSpd = -1, ovFace = 0, ofx = 0, ofy = 0, ofz = 0; // this fish's override this step: where to go, how fast, which way to face
  const restFlag = new Uint8Array(n), digSt = new Uint8Array(n), hasDig = new Uint8Array(n);
  const fanIdx = new Int8Array(n), mode = new Uint8Array(n), gi = new Int32Array(n).fill(-1), bottom = new Uint8Array(n), tight = new Uint8Array(n);
  // FB2: which of pulse-glide / slow cruise / hover comes next (seeded, by the species' time shares; each lasts 5-15 s so the shares are time shares)
  const pickSub = (i: number) => { const u = R(); return u < mx0[i] ? 0 : u < mx0[i] + mx1[i] ? 1 : 2; };
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
  const gRest = new Float64Array(G), gSub = new Uint8Array(G), gSubT = new Float64Array(G), gHov = new Float64Array(G), gMode = new Uint8Array(G), gTight = new Uint8Array(G), gBottom = new Uint8Array(G);

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
  // FB3: a goal for a habit fish (or its group, through its first member i): a point within the leash of its home, in its posture's height
  function habitGoal(ax: Float64Array, ay: Float64Array, az: Float64Array, k: number, i: number): boolean {
    const L = len[i], r = rad[i], rr = hLeash[i] * L, wide = rr >= L * 30, post = hPost[i];
    for (let t = 0; t < 14; t++) {
      let x: number, z: number;
      if (wide) { x = field.min[0] + r * 2 + RH() * Math.max(1, field.max[0] - field.min[0] - 4 * r); z = field.min[2] + r * 2 + RH() * Math.max(1, field.max[2] - field.min[2] - 4 * r); }
      else { const a = RH() * 6.283, d = rr * Math.sqrt(RH()); x = clamp(hmx[i] + Math.cos(a) * d, field.min[0] + r * 2, field.max[0] - r * 2); z = clamp(hmz[i] + Math.sin(a) * d, field.min[2] + r * 2, field.max[2] - r * 2); }
      const fl = field.floorAt(x, z); let y: number;
      if (post === 1 || bottom[i]) y = fl + r * 1.3;
      else if (post === 2) y = hmy[i] + hHov[i] * L * (0.5 + RH()) - (hHov[i] < 0.5 ? L * RH() * 0.8 : 0); // a hoverer with no hover height (clownfish) works down into its host
      else if (post === 3) y = hmy[i] + (RH() - 0.5) * Math.min(rr, L * 5);
      else y = hmy[i] + hHov[i] * L + (RH() - 0.5) * Math.min(rr, L * 6);
      y = clamp(y, fl + r * 1.3, field.waterTop - r * 2);
      const need = post === 3 ? r * 1.05 : r * 2, c = field.clearance(x, y, z, undefined, r * (hGap[i] + 1.2));
      if (c < need) continue;
      if (post === 3 && t < 10 && (c > r * (hGap[i] + 0.6) || !isItem(x, y, z, c, r))) continue; // a hugger wants a point near a rock face, not the glass
      ax[k] = x; ay[k] = y; az[k] = z; return true;
    }
    ax[k] = hmx[i] + hnx[i] * r * 2; ay[k] = clamp(hmy[i] + hHov[i] * L, field.floorAt(hmx[i], hmz[i]) + r * 1.3, field.waterTop - r * 2); az[k] = hmz[i] + hnz[i] * r * 2;
    return true;
  }
  const fishGoal = (i: number) => { if (hb[i]) { habitGoal(gx, gy, gz, i, i); goalT[i] = 0; return; } goalT[i] = pickGoal(gx, gy, gz, i, px[i], pz[i], band0[i], band1[i], gmarg[i], !!bottom[i], rad[i]) ? 0 : 35; };
  const groupGoal = (g: number) => {
    const f = gFirst[g];
    if (hb[f]) { habitGoal(ggx, ggy, ggz, g, f); ggT[g] = 0; return; }
    ggT[g] = pickGoal(ggx, ggy, ggz, g, gcx[g], gcz[g], band0[f], band1[f], gmarg[f] + Math.min(len[f] * 4, Math.sqrt(gN[g]) * len[f] * 0.5), !!gBottom[g], rad[f]) ? 0 : 35;
  };

  function setMode(i: number, m: number) {
    if (sRate[i] > 0 && !bottom[i]) { mode[i] = MOVE; modeT[i] = 1e9; return; } // FB2: a burst-and-coast species stays in MOVE; its hovers are the sub-mode (subMode 2)
    mode[i] = m;
    if (bottom[i]) modeT[i] = m === REST && restS[i] > 0 ? 6 * restS[i] / (1 - restS[i]) * (0.5 + R()) : m === REST ? 5 + R() * 20 : m === HOP ? 1.2 + R() * 0.5 : 3 + R() * 6;
    else if (hov[i] > 0) modeT[i] = m === REST ? (3 + R() * 8) * (0.6 + hov[i]) : (10 + R() * 30) * (1.5 - hov[i]);
    else modeT[i] = pace[i] < 1 ? (m === REST ? 3 + R() * 7 : 6 + R() * 14) : m === REST ? 2 + R() * 4 : 15 + R() * 40;
  }
  function setGroupMode(g: number, m: number) {
    gMode[g] = m;
    if (!gBottom[g] && gHov[g] > 0) gModeT[g] = m === REST ? (3 + R() * 7) * (0.6 + gHov[g]) : (12 + R() * 30) * (1.5 - gHov[g]); // a water group that hovers together
    else gModeT[g] = m === REST ? (gRest[g] > 0 ? 6 * gRest[g] / (1 - gRest[g]) * (0.5 + R()) : 6 + R() * 20) : 3 + R() * 6;
  }

  function initFish(i: number) {
    const s = fish[i], h = s.home, yaw = h.yaw * D2R, p = bottom[i] ? 0 : h.pitch * D2R;
    px[i] = h.x; py[i] = h.y; pz[i] = h.z;
    hx[i] = Math.cos(p) * Math.cos(yaw); hy[i] = Math.sin(p); hz[i] = -Math.cos(p) * Math.sin(yaw);
    spd[i] = 0; vyB[i] = 0; yawRate[i] = 0; pitchS[i] = h.pitch; rollS[i] = h.roll; avK[i] = 0; c0[i] = 1e9; dsx[i] = 0; dsy[i] = 0; dsz[i] = 0; fanIdx[i] = 0; burstT[i] = 0; ownT[i] = 0; hopH[i] = 0;
    const P = poses[i]; P.x = h.x; P.y = h.y; P.z = h.z; P.yaw = h.yaw; P.pitch = h.pitch; P.roll = h.roll;
    subMode[i] = sRate[i] > 0 ? pickSub(i) : 0; subT[i] = 5 + R() * 10; if (sRate[i] > 0 && gi[i] >= 0) subMode[i] = gSub[gi[i]];
    restFlag[i] = 0; nudgeT[i] = 0; kick[i] = 0; fanS[i] = 0; calmS[i] = 1; digSt[i] = 0; digK[i] = 0; digCd[i] = hasDig[i] ? 5 + R() * 40 : 0; wig[i] = 0; sinkS[i] = 0;
    if (gi[i] < 0 || !bottom[i]) setMode(i, bottom[i] ? REST : MOVE);
    else { mode[i] = gMode[gi[i]]; modeT[i] = 0; }
    if (!bottom[i]) modeT[i] = 5 + R() * 30; // loners hover later, not at once
    hS[i] = 0; hT[i] = 0; flickS[i] = 0; if (hb[i]) hCd[i] = 2 + RH() * 15;
  }

  for (let i = 0; i < n; i++) {
    const s = fish[i];
    idIndex.set(s.id, i);
    poses.push({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fan: 0, calm: 1, dig: 0 });
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
    if (s.hover && s.hover.w > 0) { hov[i] = Math.min(1, s.hover.w); hovPec[i] = s.hover.pec; hovCau[i] = s.hover.caudal; }
    if (s.rest && bottom[i]) restS[i] = clamp(s.rest, 0.05, 0.97);
    if (s.style && !bottom[i]) { const m = s.style.mix ?? [1, 0, 0], tot = m[0] + m[1] + m[2] || 1; mx0[i] = m[0] / tot; mx1[i] = m[1] / tot; mx2[i] = m[2] / tot; if (!s.hover) { hovPec[i] = 0.6; hovCau[i] = 0.3; } sRate[i] = s.style.rate; sTau[i] = s.style.tau; sTurn[i] = s.style.turn; pulseT[i] = R() / s.style.rate; }
    if (s.dig && bottom[i]) {
      const d = s.dig; hasDig[i] = 1; dRate[i] = d.rate; dDepth[i] = d.depth; dPitch[i] = d.pitch; dH0[i] = d.hold[0]; dH1[i] = d.hold[1]; dHide[i] = d.hide; dHT0[i] = d.hideT[0]; dHT1[i] = d.hideT[1]; dK[i] = clamp(d.k, 0, 1); dDark[i] = clamp(d.dark, 0, 1); dRest[i] = d.rest;
    }
  }
  { // FB3: habit fish get a home spot and their numbers; one with no home (a free-water species) swims as before
    const homes = pickHomes(fish, field, RH);
    for (let i = 0; i < n; i++) {
      const h = fish[i].habit, hm = homes[i]; if (!h || !hm) continue;
      hb[i] = 1; hPost[i] = h.post === 'perch' ? 1 : h.post === 'hoverLow' ? 2 : h.post === 'hug' ? 3 : 0;
      hLeash[i] = h.leash; hGap[i] = h.gap; hOri[i] = h.orient; hHov[i] = h.hoverH; hAct[i] = h.act; hH0[i] = h.hold[0]; hH1[i] = h.hold[1];
      hRt[i * 5] = h.dart; hRt[i * 5 + 1] = h.peck; hRt[i * 5 + 2] = h.patrol; hRt[i * 5 + 3] = h.flick; hRt[i * 5 + 4] = h.hop;
      hmx[i] = hm.x; hmy[i] = hm.y; hmz[i] = hm.z; hnx[i] = hm.nx; hny[i] = hm.ny; hnz[i] = hm.nz;
      hCd[i] = 3 + RH() * 20;
      cruise[i] *= 0.3 + h.act; // a tang cruises, a watchman barely moves
      if (!bottom[i]) { band0[i] = 0; band1[i] = 1; } // its height comes from its home, not the species' band
      if (h.post === 'hug' || h.post === 'hoverLow') marg[i] = rad[i] * 2.2 + len[i] * 0.1; // may work close to a face
    }
  }
  for (let g = 0; g < G; g++) {
    const f = gFirst[g]; gHov[g] = hov[f]; gRest[g] = restS[f]; gTight[g] = tight[f]; gBottom[g] = bottom[f]; gSide[g] = R() < 0.5 ? -1 : 1; gPh[g] = R() * 6.28; gSpeedW[g] = 0.2 + R() * 0.3;
    gSub[g] = sRate[f] > 0 && !bottom[f] ? pickSub(f) : 0; gSubT[g] = 5 + R() * 10;
    gcx[g] = gcy[g] = gcz[g] = 0;
    for (let m = gStart[g]; m < gStart[g + 1]; m++) { const i = gMem[m]; gcx[g] += fish[i].home.x; gcz[g] += fish[i].home.z; }
    gcx[g] /= gN[g]; gcz[g] /= gN[g]; ghx[g] = 1; ggx[g] = gcx[g]; ggy[g] = fish[f].home.y; ggz[g] = gcz[g];
    setGroupMode(g, gBottom[g] ? REST : MOVE);
    groupGoal(g);
  }
  for (let i = 0; i < n; i++) { gx[i] = fish[i].home.x; gy[i] = fish[i].home.y; gz[i] = fish[i].home.z; initFish(i); fishGoal(i); }

  // ---- FB1: hold direction (a hovering fish keeps its heading, turned a little at each nudge)
  function setHold(i: number, a: number) {
    const g = gi[i]; let sx = g >= 0 ? ghx[g] : hx[i], sz = g >= 0 ? ghz[g] : hz[i]; // a school hovers facing the way the school was heading
    let hh = Math.sqrt(sx * sx + sz * sz); if (hh < 1e-6) { sx = hx[i]; sz = hz[i]; hh = Math.sqrt(sx * sx + sz * sz) || 1; }
    const ang = (R() - 0.5) * 2 * (g >= 0 ? a * 0.5 : a), c = Math.cos(ang), s = Math.sin(ang), ux = sx / hh, uz = sz / hh;
    holdX[i] = ux * c - uz * s; holdZ[i] = ux * s + uz * c;
  }
  // a cover spot for a hiding fish: the nearest of a few samples with something over it or tight beside it (rock, wood, plants), still clear of the solid itself
  function findHide(i: number): boolean {
    const L = len[i], r = rad[i]; let best = -1, bd = 1e18;
    for (let t = 0; t < 28; t++) {
      const x = field.min[0] + r * 2 + R() * Math.max(1, field.max[0] - field.min[0] - 4 * r), z = field.min[2] + r * 2 + R() * Math.max(1, field.max[2] - field.min[2] - 4 * r);
      const y = field.floorAt(x, z) + r * 1.3;
      grad[0] = 0; grad[1] = 0; grad[2] = 0;
      const c = field.clearance(x, y, z, grad, L);
      if (c < r * 1.05 || c > L * 0.5) continue; // inside something, or out in the open
      const over = field.clearance(x, y + L * 0.7, z, undefined, L) < L * 0.4, side = Math.abs(grad[1]) < 0.5 && c < r * 2.4;
      if (!over && !side) continue;
      const d = (x - px[i]) ** 2 + (z - pz[i]) ** 2 - (over ? L * L * 4 : 0);
      if (d < bd) { bd = d; best = t; hgx[i] = x; hgz[i] = z; }
    }
    return best >= 0;
  }
  const bedAt = (x: number, z: number) => field.floorAt(x, z) - field.min[1]; // thickness of the bed under (x, z): the lowest the body may go
  function startDig(i: number) {
    const wantHide = R() < dHide[i] + (1 - dK[i]) * (1 - dHide[i]) * 0.7; // no sand: more cover-seeking
    if (wantHide && findHide(i)) { digSt[i] = 5; digT[i] = 0; return; }
    if (R() < dK[i] && bedAt(px[i], pz[i]) > 8) { // burrow here
      digSt[i] = 1; digT[i] = 0; digTgt[i] = 0.7 + R() * 0.3; digHold[i] = dH0[i] + R() * (dH1[i] - dH0[i]);
      let hh = Math.sqrt(hx[i] * hx[i] + hz[i] * hz[i]); if (hh < 1e-6) hh = 1;
      dgx[i] = hx[i] / hh; dgz[i] = hz[i] / hh; return;
    }
    digCd[i] = 6 + R() * 14; // nothing to do this time
  }
  function endDig(i: number) { digSt[i] = 0; digCd[i] = 15 + R() * 45 / (1 + dDark[i]); digK[i] = 0; wig[i] = 0; }
  function digStep(i: number, dt: number, L: number, T: number) {
    digT[i] += dt; const st = digSt[i];
    if (st === 1) { if (digT[i] > 0.9) { digSt[i] = 2; digT[i] = 0; } }
    else if (st === 2) { // nose in: the head goes down, the body follows, a quick wag and a busy tail
      digK[i] = Math.min(digTgt[i], digK[i] + dt / 2.4 * digTgt[i]); wig[i] = 1;
      if (digK[i] >= digTgt[i] - 1e-6 || bedAt(px[i], pz[i]) < 6) { digSt[i] = 3; digT[i] = 0; wig[i] = 0; }
    } else if (st === 3) { // hold: sifting, a slow breath of depth
      digK[i] = digTgt[i] * (0.96 + 0.04 * Math.sin(T * 1.7 + ph1[i])); if (digT[i] > digHold[i] || bedAt(px[i], pz[i]) < 6) { digSt[i] = 4; digT[i] = 0; }
    } else if (st === 4) { // wriggle out
      digK[i] -= dt / 1.7; wig[i] = 1; if (digK[i] <= 0) endDig(i);
    } else if (st === 5) { // walk to the cover
      const dd = Math.hypot(hgx[i] - px[i], hgz[i] - pz[i]);
      if (dd < L * 0.35 || digT[i] > 28) { if (dd < L * 0.9) { digSt[i] = 6; digT[i] = 0; digHold[i] = dHT0[i] + R() * (dHT1[i] - dHT0[i]); let hh = Math.sqrt(hx[i] * hx[i] + hz[i] * hz[i]); if (hh < 1e-6) hh = 1; dgx[i] = hx[i] / hh; dgz[i] = hz[i] / hh; } else endDig(i); }
    } else if (st === 6) { if (digT[i] > digHold[i]) endDig(i); }
  }

  // ---- FB3: habit actions. Each is a short script over the normal steering: it sets an override (where to go, how fast, which way to face) for this step.
  // speed toward a target: slows as it arrives, and while the head is not yet pointing at it (a fast fish that cannot turn only orbits)
  const slow = (i: number, v: number, tx: number, ty: number, tz: number) => {
    const dx = tx - px[i], dy = bottom[i] ? 0 : ty - py[i], dz = tz - pz[i], d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
    const al = (hx[i] * dx + hy[i] * dy + hz[i] * dz) / d;
    return Math.min(v * clamp(0.2 + 1.2 * al, 0.2, 1), 6 + 2.5 * d);
  };
  function startAct(i: number) {
    const o = i * 5, tot = hRt[o] + hRt[o + 1] + hRt[o + 2] + hRt[o + 3] + hRt[o + 4], L = len[i], r = rad[i];
    if (tot <= 0) { hCd[i] = 30; return; }
    hCd[i] = -Math.log(1 - RH() * 0.999) * 60 / tot; // the next one comes about 60 / tot s later, whatever it is
    let u = RH() * tot, k = 0; while (k < 4 && u >= hRt[o + k]) { u -= hRt[o + k]; k++; }
    hT[i] = 0;
    if (k === 0) { hS[i] = 1; hDur[i] = hH0[i] + RH() * (hH1[i] - hH0[i]); return; }
    if (k === 1) { // peck: a point on a solid within the leash, a little way off it
      for (let t = 0; t < 12; t++) {
        const rr = hLeash[i] * L, a = RH() * 6.283, d = rr >= L * 30 ? RH() * L * 8 : rr * Math.sqrt(RH());
        const x = clamp((rr >= L * 30 ? px[i] : hmx[i]) + Math.cos(a) * d, field.min[0] + r * 2, field.max[0] - r * 2), z = clamp((rr >= L * 30 ? pz[i] : hmz[i]) + Math.sin(a) * d, field.min[2] + r * 2, field.max[2] - r * 2);
        const fl = field.floorAt(x, z), y = clamp((bottom[i] ? fl + r * 1.3 : hmy[i] + (RH() - 0.5) * L * 4), fl + r * 1.3, field.waterTop - r * 2);
        grad[0] = 0; grad[1] = 0; grad[2] = 0; const c = field.clearance(x, y, z, grad, L * 2);
        if (c < r * 1.05 || c > r * 2.4 || (!bottom[i] && grad[1] > 0.8) || !isItem(x, y, z, c, r)) continue; // beside a rock face (or under a ledge), not floating, not the floor
        htx[i] = x; hty[i] = y; htz[i] = z; hqx[i] = grad[0]; hqy[i] = grad[1]; hqz[i] = grad[2]; hS[i] = 4; hDur[i] = (2 + Math.floor(RH() * 4)) * 0.45; return;
      }
      hS[i] = 0; return;
    }
    if (k === 2) { // patrol: out along a line 4-8 body lengths and back, a few times
      const a = RH() * 6.283, d = L * (4 + RH() * 4), rr = hLeash[i] * L;
      let x = px[i] + Math.cos(a) * d, z = pz[i] + Math.sin(a) * d;
      if (rr < L * 30) { const dx = x - hmx[i], dz = z - hmz[i], dd = Math.hypot(dx, dz); if (dd > rr) { x = hmx[i] + dx / dd * rr; z = hmz[i] + dz / dd * rr; } }
      x = clamp(x, field.min[0] + r * 2, field.max[0] - r * 2); z = clamp(z, field.min[2] + r * 2, field.max[2] - r * 2);
      htx[i] = x; hty[i] = bottom[i] ? field.floorAt(x, z) + r * 1.3 : py[i]; htz[i] = z; hqx[i] = px[i]; hqy[i] = py[i]; hqz[i] = pz[i]; hLap[i] = 2 + Math.floor(RH() * 3); hS[i] = 6; return;
    }
    if (k === 3) { hS[i] = 7; hDur[i] = 1.2 + RH() * 1.6; return; }
    // hop: 1-3 body lengths, then stand still a while
    { const rr = hLeash[i] * L, a = RH() * 6.283, d = L * (1 + RH() * 2); let x = px[i] + Math.cos(a) * d, z = pz[i] + Math.sin(a) * d;
      if (rr < L * 30) { const dx = x - hmx[i], dz = z - hmz[i], dd = Math.hypot(dx, dz); if (dd > rr) { x = hmx[i] + dx / dd * rr; z = hmz[i] + dz / dd * rr; } }
      x = clamp(x, field.min[0] + r * 2, field.max[0] - r * 2); z = clamp(z, field.min[2] + r * 2, field.max[2] - r * 2);
      htx[i] = x; hty[i] = bottom[i] ? field.floorAt(x, z) + r * 1.3 : py[i] + (RH() - 0.5) * L; htz[i] = z; hS[i] = 8; hDur[i] = 3 + RH() * 7; }
  }
  function habitStep(i: number, dt: number) {
    ovOn = 0; ovSpd = -1; ovFace = 0;
    const L = len[i], s = hS[i], cr = cruise[i];
    if (s === 0) {
      hCd[i] -= dt; if (hCd[i] <= 0) startAct(i);
      if (hLeash[i] < 30) { // too far from home: go back
        const d = Math.hypot(px[i] - hmx[i], pz[i] - hmz[i]);
        if (d > hLeash[i] * L * 1.3 + L) { ovOn = 1; ovx = hmx[i]; ovy = hmy[i] + hHov[i] * L; ovz = hmz[i]; ovSpd = slow(i, cr * 1.1, ovx, ovy, ovz); }
      }
      return;
    }
    hT[i] += dt;
    if (s === 1) { // dart to the home spot
      ovOn = 1; ovx = hmx[i]; ovy = hmy[i]; ovz = hmz[i]; ovSpd = slow(i, L * 4, ovx, ovy, ovz);
      if (Math.hypot(ovx - px[i], ovz - pz[i], bottom[i] ? 0 : ovy - py[i]) < L * 0.4) { hS[i] = 2; hT[i] = 0; } else if (hT[i] > 12) { hS[i] = 0; hT[i] = 0; } // never got there: give it up
    } else if (s === 2) { // tucked in, facing out
      ovOn = 1; ovx = hmx[i]; ovy = hmy[i]; ovz = hmz[i]; ovSpd = 0; ovFace = 1; ofx = hnx[i]; ofy = 0; ofz = hnz[i]; if (Math.abs(ofx) + Math.abs(ofz) < 0.2) ovFace = 0;
      if (hT[i] > hDur[i]) { hS[i] = 3; hT[i] = 0; }
    } else if (s === 3) { // peek out: a body length or two off the face, then carry on
      ovOn = 1; ovx = hmx[i] + hnx[i] * L * 1.8; ovy = hmy[i] + hny[i] * L * 1.8; ovz = hmz[i] + hnz[i] * L * 1.8; ovSpd = slow(i, L * 0.9, ovx, ovy, ovz);
      if (Math.hypot(ovx - px[i], ovz - pz[i]) < L * 0.5 || hT[i] > 4) { hS[i] = 0; hT[i] = 0; hCd[i] = Math.max(hCd[i], 2 + RH() * 4); }
    } else if (s === 4) {
      ovOn = 1; ovx = htx[i] + hqx[i] * rad[i] * 1.4; ovy = hty[i] + hqy[i] * rad[i] * 1.4; ovz = htz[i] + hqz[i] * rad[i] * 1.4; ovSpd = slow(i, cr * 0.9 + L * 0.3, ovx, ovy, ovz);
      if (Math.hypot(ovx - px[i], ovz - pz[i], bottom[i] ? 0 : ovy - py[i]) < L * 0.5 || hT[i] > 9) { hS[i] = 5; hT[i] = 0; }
    } else if (s === 5) { // pecking: snout to the surface, a few quick bites
      ovOn = 1; ovx = htx[i] + hqx[i] * rad[i] * 1.4; ovy = hty[i] + hqy[i] * rad[i] * 1.4; ovz = htz[i] + hqz[i] * rad[i] * 1.4; ovSpd = 0; ovFace = 1; ofx = -hqx[i]; ofy = -hqy[i] * 0.6; ofz = -hqz[i];
      if (hT[i] > hDur[i]) { hS[i] = 0; hT[i] = 0; }
    } else if (s === 6) {
      const toB = hLap[i] % 2 === 0; ovOn = 1; ovx = toB ? htx[i] : hqx[i]; ovy = toB ? hty[i] : hqy[i]; ovz = toB ? htz[i] : hqz[i]; ovSpd = slow(i, cr * 1.2, ovx, ovy, ovz);
      if (Math.hypot(ovx - px[i], ovz - pz[i]) < L * 0.8 || hT[i] > 12) { hLap[i]--; hT[i] = 0; if (hLap[i] <= 0) hS[i] = 0; }
    } else if (s === 7) { ovOn = 1; ovx = px[i]; ovy = py[i]; ovz = pz[i]; ovSpd = 0; if (hT[i] > hDur[i]) { hS[i] = 0; hT[i] = 0; } }
    else if (s === 8) {
      ovOn = 1; ovx = htx[i]; ovy = hty[i]; ovz = htz[i]; ovSpd = slow(i, L * 1.7, ovx, ovy, ovz);
      if (Math.hypot(ovx - px[i], ovz - pz[i]) < L * 0.4 || hT[i] > 2.5) { hS[i] = 9; hT[i] = 0; }
    } else { ovOn = 1; ovx = px[i]; ovy = py[i]; ovz = pz[i]; ovSpd = 0; if (hT[i] > hDur[i]) { hS[i] = 0; hT[i] = 0; } }
  }

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
      if (sRate[gFirst[g]] > 0 && !gBottom[g]) { gSubT[g] -= dt; if (gSubT[g] <= 0) { gSub[g] = pickSub(gFirst[g]); gSubT[g] = 5 + R() * 10; } } // FB2: the school switches style together
      if (gBottom[g] || gHov[g] > 0) {
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
        if (!isB && g < 0 && sRate[i] === 0 && mode[i] === REST && R() < dt * 0.02) { mode[i] = MOVE; modeT[i] = 10 + R() * 30; }
      } else {
        const gm = gMode[g];
        if (mode[i] !== HOP) {
          // a grouped bottom dweller follows the group's mode, a few stragglers a beat late
          if (mode[i] !== gm) { modeT[i] -= dt; if (modeT[i] <= 0) { mode[i] = gm; modeT[i] = R() * 2.5 + (indep[i] ? 3 : 0); if (gm === MOVE && R() < 0.04) { mode[i] = HOP; modeT[i] = 1.2 + R() * 0.5; hopH[i] = L * (0.5 + R() * 0.7); } } }
        } else { modeT[i] -= dt; if (modeT[i] <= 0) { mode[i] = gMode[g]; modeT[i] = 1 + R() * 2; } }
      }
      if (g >= 0 && !isB && gHov[g] > 0 && sRate[i] === 0) mode[i] = gMode[g]; // a hovering shoal stops together
      // digging / hiding (bottom dwellers with a DigSpec): a rare event, then a small state machine that overrides steering and speed
      if (hasDig[i] === 1 && mode[i] !== HOP) {
        if (digSt[i] === 0) { digCd[i] -= dt; if (digCd[i] <= 0 && R() < dt * dRate[i] / 60 * (1 + 1.5 * dDark[i])) startDig(i); }
        else digStep(i, dt, L, T);
      }
      const dst = digSt[i];
      ovOn = 0; if (hb[i]) habitStep(i, dt); // FB3
      if (sRate[i] > 0) {
        const was = subMode[i];
        if (g >= 0) subMode[i] = gSub[g]; else { subT[i] -= dt; if (subT[i] <= 0) { subMode[i] = pickSub(i); subT[i] = 5 + R() * 10; } }
        if (subMode[i] === 0 && was !== 0) { pulseT[i] = 0.3 + R() * 0.7; pulseP[i] = pulseT[i] + 0.4; burstLeft[i] = 0; pv0[i] = 0; jitA[i] = 0; } // coming out of a hover or a cruise: the first pulse is a beat away, not at once
      }
      // burst-and-coast: when a pulse is due, a short burst starts and the heading is nudged by a few degrees (toward the goal / school, which `wish` already is)
      if (sRate[i] > 0 && mode[i] === MOVE && dst === 0 && subMode[i] === 0) {
        pulseT[i] -= dt;
        if (pulseT[i] <= 0) { pulseP[i] = (0.7 + R() * 0.6) / sRate[i]; pulseT[i] = pulseP[i]; burstLeft[i] = Math.min(0.2, pulseP[i] * 0.3); jitA[i] = (R() - 0.5) * 2 * sTurn[i] * D2R; pv0[i] = 0; }
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
        if (dd < (hb[i] ? L * 0.7 : L * 2) || goalT[i] > 45) { fishGoal(i); if (!isB && g < 0 && sRate[i] === 0 && R() < 0.35) { mode[i] = REST; modeT[i] = 2 + R() * 5; } }
      } else { tx = ggx[g]; ty = ggy[g]; tz = ggz[g]; }
      if (ovOn) { tx = ovx; ty = ovy; tz = ovz; }
      let wx = tx - px[i], wy = isB ? 0 : ty - py[i], wz = tz - pz[i];
      let wm = Math.sqrt(wx * wx + wy * wy + wz * wz);
      if (wm < 1e-6) { wx = hx[i]; wy = 0; wz = hz[i]; wm = Math.sqrt(wx * wx + wz * wz) || 1; }
      wx /= wm; wy /= wm; wz /= wm;
      // FB1: a hovering fish holds its heading (nudged now and then); a digging one faces its spot; one on its way to cover heads for it
      let held = false;
      if (ovOn) {
        if (ovFace) { wx = ofx; wy = isB ? 0 : ofy; wz = ofz; wm = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1; wx /= wm; wy /= wm; wz /= wm; }
        held = ovSpd < len[i] * 0.2;
      } else if (dst > 0) {
        if (dst === 5) { wx = hgx[i] - px[i]; wz = hgz[i] - pz[i]; wy = 0; wm = Math.sqrt(wx * wx + wz * wz) || 1; wx /= wm; wz /= wm; } else { wx = dgx[i]; wz = dgz[i]; wy = 0; }
        held = true;
      } else if ((hov[i] > 0 && mode[i] === REST) || (sRate[i] > 0 && mode[i] === MOVE && subMode[i] === 2)) {
        if (!restFlag[i]) { restFlag[i] = 1; setHold(i, 0.4); nudgeT[i] = 1 + R() * 2.5; kick[i] = 0; }
        else { nudgeT[i] -= dt; if (nudgeT[i] <= 0) { setHold(i, 0.5); kick[i] = 0.35 + R() * 0.3; nudgeT[i] = 1.5 + R() * 4; } }
        wx = holdX[i]; wz = holdZ[i]; wy = 0; held = true;
      } else restFlag[i] = 0;
      if (kick[i] > 0) kick[i] -= dt;
      if (sRate[i] > 0 && mode[i] === MOVE && dst === 0 && subMode[i] === 0 && jitA[i] !== 0) { const c = Math.cos(jitA[i]), sn = Math.sin(jitA[i]), x2 = wx * c - wz * sn; wz = wx * sn + wz * c; wx = x2; }
      // slow side-to-side meander so paths are not ruler straight
      const amp = held ? 0 : g < 0 ? 0.28 : tight[i] ? 0 : 0.15;
      if (amp > 0) { const a = amp * Math.sin(T * w1[i] + ph1[i]) + 0.4 * amp * Math.sin(T * w2[i] * 0.6 + ph2[i]), c = Math.cos(a), s = Math.sin(a); const x2 = wx * c - wz * s; wz = wx * s + wz * c; wx = x2; }

      let over = 0, boost = 1;
      if (g >= 0 && dst === 0) {
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
      K = dst > 0 || (ovOn && hS[i] >= 1 && hS[i] <= 5 && Math.hypot(ovx - px[i], ovz - pz[i], isB ? 0 : ovy - py[i]) < L * 3) ? 0 : clamp(K, 0, 1); // a fish going into its home or to a peck does not shy off the rock
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
      const pulsing = sRate[i] > 0 && mode[i] === MOVE && dst === 0 && subMode[i] === 0;
      // turning takes way on (Nathan 2026-11-25: "they yaw and pitch effortlessly about their centroid ... in place"): a fish
      // turns by bending its body as it swims, so the full rate needs ~0.6 BL/s; nearly still it can only scull round slowly
      // on its fins (a quarter of the rate; near something it still turns away quickly). One resting on the bed barely turns.
      const bedRest = isB && mode[i] === REST && dst === 0, way0 = bedRest ? 0.08 : 0.25;
      // burst-and-coast swimmers under way (FB2: they turn in their bursts) and the home-keeping habit species (FB3: belly to the rock, held spot) keep their tuned rates; a burst swimmer hovering does not
      const free = (sRate[i] > 0 && mode[i] === MOVE && dst === 0 && subMode[i] !== 2) || ((ovOn || hb[i] > 0) && !held);
      const way = free ? 1 : clamp(way0 + (bedRest ? 0 : 0.75 * K) + 0.75 * spd[i] / (L * 0.6), way0, 1);
      const maxStep = turn[i] * (1 + 0.5 * K) * dt * (isB ? 1.3 : 1) * (pulsing ? (burstLeft[i] > 0 ? 1.6 : 0.5) : 1) * way;
      const yawBefore = Math.atan2(-hz[i], hx[i]), ohx = hx[i], ohy = hy[i], ohz = hz[i];
      let nx: number, ny: number, nz: number;
      if (ang <= maxStep) { nx = dx; ny = dy; nz = dz; }
      else { const t = maxStep / ang; nx = hx[i] * (1 - t) + dx * t; ny = hy[i] * (1 - t) + dy * t; nz = hz[i] * (1 - t) + dz * t; }
      if (isB) ny = 0;
      // pitch limit
      const lim = Math.sin((isB ? 0 : 20) * D2R);
      if (ny > lim || ny < -lim) { const hs = Math.sqrt(Math.max(1e-9, nx * nx + nz * nz)), nh = Math.sqrt(1 - lim * lim); ny = ny > 0 ? lim : -lim; nx = nx / hs * nh; nz = nz / hs * nh; }
      const nm = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      hx[i] = nx / nm; hy[i] = ny / nm; hz[i] = nz / nm;
      // the body swings about a point ahead of its middle (behind the head, near the pectorals), not about its centre: the
      // head leads and the tail sweeps out. Pivot PIV body lengths ahead of the centre stays put through the turn. Only
      // as way comes off: under way, the swim itself already carries the body round an arc. Skipped where the swing would
      // take it within its radius of something solid (a fish tucked against a rock just turns about its middle).
      { const a = free ? 0 : L * PIV * clamp(1 - spd[i] / (L * 0.6), 0, 1), sx = a * (ohx - hx[i]), sy = isB ? 0 : a * (ohy - hy[i]), sz = a * (ohz - hz[i]);
        if (sx * sx + sy * sy + sz * sz > 1e-8 && field.clearance(px[i] + sx, py[i] + sy, pz[i] + sz, undefined, m) >= r) { px[i] += sx; py[i] += sy; pz[i] += sz; } }
      let dyaw = Math.atan2(-hz[i], hx[i]) - yawBefore; if (dyaw > Math.PI) dyaw -= 2 * Math.PI; else if (dyaw < -Math.PI) dyaw += 2 * Math.PI;
      yawRate[i] += (dyaw / dt - yawRate[i]) * Math.min(1, dt * 5);

      // ---- speed
      const sv = 1 + 0.18 * Math.sin(T * w1[i] + ph3[i]) + 0.1 * Math.sin(T * w2[i] + ph2[i]);
      let target: number;
      if (isB) target = mode[i] === REST ? L * (restS[i] > 0 ? 0.012 : 0.05) * (0.5 + 0.5 * Math.sin(T * 0.5 + ph1[i]) ** 2) : mode[i] === HOP ? L * 0.9 : L * 0.55 * sv * boost;
      else if (mode[i] === REST) target = L * 0.04;
      else {
        target = cruise[i] * sv * boost;
        if (g >= 0 && tight[i]) target *= 1 + 0.12 * Math.sin(T * gSpeedW[g] + gPh[g]);
        if (burstT[i] > 0) target *= pace[i] < 1 ? 1.5 : 2.6;
      }
      if (sRate[i] > 0 && mode[i] === MOVE && dst === 0 && !isB) { if (subMode[i] === 1) target = cruise[i] * sv * boost * 0.5; else if (subMode[i] === 2) target = L * 0.04; } // FB2: slow steady cruise / hover
      if (held && kick[i] > 0 && dst === 0) target += L * 0.2; // a small shift in the water
      if (ovOn && ovSpd >= 0) target = ovSpd; // FB3
      if (dst > 0) target = dst === 1 ? L * 0.12 : dst === 2 ? L * 0.05 : dst === 4 ? L * 0.28 : dst === 5 ? L * 0.4 : 0; // approach, push in, wriggle out, walk to cover, hold still
      target *= 1 - 0.5 * K;
      if (pulsing) {
        if (pv0[i] === 0) { const P = pulseP[i], e = 1 - Math.exp(-P / sTau[i]); pv0[i] = Math.min(Math.max(target, 1e-3) * P / (sTau[i] * e), L * 7) * (1 - 0.5 * K); } // the peak that averages to the cruise speed over a pulse
        if (burstLeft[i] > 0) { burstLeft[i] -= dt; spd[i] += (pv0[i] - spd[i]) * Math.min(1, dt * 18); } // the burst: quick acceleration
        else spd[i] *= Math.exp(-dt / sTau[i]);                                                              // the glide: the speed decays
      } else {
      const ac = (target > spd[i] ? 2.5 : 3.5) * L * (1 + K) * dt * (ovOn && hS[i] === 1 ? 4 : 1);
      spd[i] += clamp(target - spd[i], -ac, ac);
      }
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
      let pt: number, sk = 0;
      if (digK[i] > 0.001) { // FB1: sunk into the bed, nose down; never deeper than the bed under it
        const bed = bedAt(px[i], pz[i]) - 0.5, full = Math.max(0, r * 1.3 - dRest[i]) + dRest[i] * dDepth[i];
        let k = digK[i], head = 0.45 * L * Math.sin(dPitch[i] * k * D2R); sk = full * k;
        if (sk + head > bed) { const f = bed > 0 ? bed / (sk + head) : 0; k *= f; sk *= f; }
        sinkS[i] = k; pt = -dPitch[i] * k;
      } else { sinkS[i] = 0; pt = 0; }
      if (digK[i] <= 0.001) pt = isB ? (mode[i] === REST ? -20 : clamp(Math.atan2(vyB[i], Math.max(spd[i], 1)) * R2D * 0.5, -15, 15) - 5) : clamp(Math.asin(clamp(hy[i], -1, 1)) * R2D, -28, 28);
      P.x = px[i]; P.y = py[i] - sk; P.z = pz[i];
      P.yaw = Math.atan2(-hz[i], hx[i]) * R2D + (wig[i] > 0 ? wig[i] * 11 * Math.sin(T * 9 + ph2[i]) * (dst === 2 ? 1 : 0.6) : 0);
      // pectoral fanning and tail beat: a hovering fish fans while it is slow, and its tail follows its speed; a digger wriggles in and out and lies still in between
      { const hover2 = sRate[i] > 0 && mode[i] === MOVE && dst === 0 && subMode[i] === 2, pulsing2 = sRate[i] > 0 && mode[i] === MOVE && dst === 0 && subMode[i] === 0 && pv0[i] > 0, rel = spd[i] / L, fanT = dst > 0 ? 0 : hovPec[i] * clamp(1 - rel / 0.3, 0, 1);
        fanS[i] += (fanT - fanS[i]) * Math.min(1, dt * 1.5);
        let calmT = 1;
        if (dst > 0) calmT = dst === 2 || dst === 4 ? 1.6 : dst === 1 || dst === 5 ? 0.9 : 0.12;
        else if (pulsing2) calmT = 0.1 + 1.3 * clamp((spd[i] / Math.max(pv0[i], 1e-3) - 0.3) / 0.7, 0, 1); // beating in the burst, nearly still in the glide
        else if (sRate[i] > 0 && mode[i] === MOVE && subMode[i] === 1) calmT = 0.4 + 0.6 * clamp(rel / 0.8, 0, 1);
        else if (hov[i] > 0 || hover2) calmT = hovCau[i] + (1 - hovCau[i]) * clamp(rel / 0.35, 0, 1);
        calmS[i] += (calmT - calmS[i]) * Math.min(1, dt * (pulsing2 ? 14 : 3));
        { const bT = restS[i] > 0 && isB && mode[i] === REST && dst === 0 && spd[i] < L * 0.05 ? 1 : 0; breathS[i] += (bT - breathS[i]) * Math.min(1, dt * 2); if (restS[i] > 0) P.breath = breathS[i]; }
        P.fan = fanS[i]; P.calm = calmS[i]; P.dig = sk; if (sRate[i] > 0) P.sub = mode[i] === MOVE ? subMode[i] : 2; }
      if (hb[i] && hS[i] === 5) pt += -22 + 8 * Math.sin(T * 15 + ph1[i]); // FB3: pecking: the snout bobs at the surface
      pitchS[i] += (pt - pitchS[i]) * Math.min(1, dt * 4);
      let rollT = clamp(-yawRate[i] * R2D * 0.12, -12, 12);
      if (hb[i]) {
        if (hOri[i] > 0 && !isB && c0[i] < r + L * 0.6) { // FB3: near a rock face the belly turns toward it (upside down under a ledge)
          const yw = Math.atan2(-hz[i], hx[i]), sy = Math.sin(yw), cy = Math.cos(yw), dh = g0x[i] * hx[i] + g0y[i] * hy[i] + g0z[i] * hz[i];
          const ux = g0x[i] - dh * hx[i], uy = g0y[i] - dh * hy[i], uz = g0z[i] - dh * hz[i], um = Math.sqrt(ux * ux + uy * uy + uz * uz);
          if (um > 0.25) { const th = Math.atan2((ux * sy + uz * cy) / um, uy / um) * R2D * hOri[i], w = clamp((r + L * 0.6 - c0[i]) / (L * 0.35), 0, 1); rollT = rollT * (1 - w) + th * w; }
        }
        if (hS[i] === 7) rollT += 9 * Math.sin(T * 20) * Math.sin(Math.PI * clamp(hT[i] / Math.max(hDur[i], 0.1), 0, 1)); // a flick: a quick shudder
        let dr = rollT - rollS[i]; dr = ((dr + 540) % 360) - 180;
        rollS[i] += dr * Math.min(1, dt * 3); if (rollS[i] > 180) rollS[i] -= 360; else if (rollS[i] < -180) rollS[i] += 360;
      } else rollS[i] += (rollT - rollS[i]) * Math.min(1, dt * 4);
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
