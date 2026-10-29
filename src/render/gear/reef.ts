// Reef and planted gear: sump, skimmers, UV, auto top-off and the chiller fan. (render/gear3d.ts split per type, lane GM1, 2026-10-29: moved as is, no behaviour change).
import * as THREE from 'three';
import { type FilterModel } from '../../demand/gear';
import { SUMP_FILL, sumpDefault, sumpOf, techOf } from '../../scene/tech';
import { fitsInStand } from '../../scene/standspace';
import { reefProduct } from '../../data/gearCatalog';
import { clamp } from '../../scene/physics';
import { GearPick, V, along, C, Frame, Spot, lerp, sucker, overRim, hexOf } from './common';

export function sump(f: Frame, sp: Spot) {
  const { kit, t, T } = f;
  // the sump tank (lane SF, Nathan 2026-10-26): its own size, inside the stand; beside the tank on the floor with no stand;
  // not drawn when it does not fit inside the stand (the Tech menu says so). The drain and return run to its chambers.
  const z = sumpOf(f.S, true) ?? sumpDefault(f.S), stand = f.S.stand.show, fits = fitsInStand(f.S, z);
  const cabinet = stand && (f.S.stand.style === 'cabinet' || f.S.stand.style === 'custom'), h = f.S.stand.height;
  const base = f.floor + (cabinet ? Math.min(70, h * 0.12) : 0) + 2;
  const cx = stand ? T.L / 2 : f.side === 'left' ? -t - 80 - z.L / 2 : T.L + t + 80 + z.L / 2, cz = stand ? -T.D / 2 : -(T.D - z.D / 2);
  const show = !stand || fits, x0 = cx - z.L / 2, drainX = x0 + z.L * 0.1, pumpX = x0 + z.L * 0.84, top = base + z.H;
  // overflow box hung on the back glass (inside box with a comb, a U-tube over the rim to the outside box), drain down
  const w = 130, d = 70, oh = 150, yT = f.H - 6, u = f.slot(sp.fixed ? sp.u : sp.u + w / 2, w + 8, yT - oh, yT, 0, d + 8, sp.fixed);
  f.box('wet', f.P(u, yT - oh / 2, d / 2 + 2), w, oh, d, C.black, 4);
  for (let i = 0; i < 12; i++) f.box('wet', f.P(u - w / 2 + 8 + i * (w - 16) / 11, f.wy - 6, d + 2.4), 3.2, 22, 1, 0x070808);
  kit.tube('clear', [f.P(u, f.wy - 40, d / 2), f.P(u, f.H + 40, d / 2), f.P(u, f.H + 60, -t / 2), f.P(u, f.H + 40, -t - 40), f.P(u, f.H - 40, -t - 40)], 12, C.glass, 0.1, 14);
  f.box('room', f.P(u, f.H - 70, -t - 40), w * 0.8, 140, 70, C.black, 4);
  const standY = stand ? f.top : f.floor, dB = f.P(u, f.H - 140, -t - 40);
  // the drain: down the back; into the sump's first chamber (in the stand, or out along the floor to the one beside the tank)
  const drain = [dB, f.P(u, standY + 40, -t - 50)];
  if (show) drain.push(V(drainX, Math.max(standY - 30, top + 40), dB.z), V(drainX, top + 20, cz), V(drainX, base + z.H * 0.6, cz));
  else drain.push(f.P(u, standY - 30, -t + 30));
  kit.tube('room', drain, 14, C.charcoal, 0, 10);
  // return: from the pump up the back and over the rim, loc-line beads curving forward, a flared nozzle
  const uR = f.slot(u + w / 2 + 120, 40, f.wy - 100, f.H, 0, 50), rr = 10, rB = f.P(uR, standY + 40, -t - 22);
  const ret = show ? [V(pumpX, base + 40, cz), V(pumpX, top + 20, cz), V(pumpX, Math.max(standY - 30, top + 40), rB.z), rB, f.P(uR, f.H + 10, -t - 22)]
    : [f.P(uR, standY - 30, -t + 30), rB, f.P(uR, f.H + 10, -t - 22)];
  kit.tube('room', ret, rr, C.black, 0, 10);
  kit.tube('wet', [f.P(uR, f.H + 10, -t - 22), f.P(uR, f.H + 34, -t / 2), f.P(uR, f.H + 10, 16), f.P(uR, f.wy - 30, 16)], rr, C.black, 0, 10);
  let p = f.P(uR, f.wy - 30, 16), dir = V(0, -1, 0);
  for (let i = 0; i < 4; i++) {
    const nd = dir.clone().lerp(V(0, -0.35, 1), 0.35).normalize(), q = p.clone().addScaledVector(nd, 14);
    kit.ball('wet', p.clone().addScaledVector(nd, 7), 10.5, C.locline, 0, 2); kit.rod('wet', p, q, 7.5, C.locline, { seg: 14 });
    p = q; dir = nd;
  }
  kit.lathe('wet', [[7, 0], [7.5, 10], [10, 22], [12, 24]], p, dir, C.locline, 0, 20);
  if (!show) return;
  // the sump: a glass box run SUMP_FILL full, two baffles, the skimmer (when it is the in-sump one) and the return pump
  const wl = z.H * SUMP_FILL, c = V(cx, base + z.H / 2, cz);
  kit.box('clear', c, z.L, z.H, z.D, C.glass); kit.parts.clear[kit.parts.clear.length - 1].getAttribute('aBase').array.fill(0.1);
  kit.box('clear', V(cx, base + wl / 2 + 3, cz), z.L - 8, wl, z.D - 8, 0xcfe7ec);
  for (const k of [0.33, 0.62]) kit.box('clear', V(x0 + z.L * k, base + z.H * 0.33, cz), 5, z.H * 0.62, z.D - 8, C.glass);
  if (techOf(f.S).rows.skimmer === 'sump') {
    const sx = x0 + z.L * 0.2, sr = clamp(z.D * 0.18, 30, 60), sh = clamp(z.H * 0.9, 150, 520);
    kit.rod('room', V(sx, base + 4, cz), V(sx, base + sh, cz), sr, C.black, { seg: 24 });
    kit.rod('clear', V(sx, base + sh, cz), V(sx, base + sh + sr * 1.4, cz), sr * 0.92, C.cup, { base: 0.35 });
  }
  const pw = clamp(z.L * 0.12, 50, 110);
  kit.box('room', V(pumpX, base + pw * 0.45, cz), pw, pw * 0.9, pw * 0.9, C.black, 10);
}

export function skimmerHob(f: Frame, sp: Spot, pk?: GearPick) {
  const { kit, t } = f, W = 120, D = 110, Hb = 300, yTop = f.H + 60, rp = reefProduct('skimmer', pk?.product), body = hexOf(rp?.colors?.body, C.black), cupc = hexOf(rp?.colors?.cup, C.cup);
  const u = f.slot(sp.fixed ? sp.u : sp.u + 40, 80, f.wy - 140, f.H, 0, 70, sp.fixed);
  // the reaction body behind the glass, its collection cup on top (skimmate in the bottom), the intake box inside
  f.box('room', f.P(u, yTop - Hb / 2, -t - 6 - D / 2), W, Hb, D, body, 12);
  const cc = f.P(u, yTop, -t - 6 - D / 2);
  kit.rod('clear', cc, cc.clone().add(V(0, 110, 0)), 44, cupc, { base: 0.18, seg: 28 });
  kit.rod('clear', cc.clone().add(V(0, 2, 0)), cc.clone().add(V(0, 12, 0)), 42, C.skimmate, { base: 0.55, seg: 28 }); // a thin layer of skimmate
  kit.rod('room', cc.clone().add(V(0, 110, 0)), cc.clone().add(V(0, 118, 0)), 46, C.black, { seg: 28 });
  kit.rod('clear', cc, cc.clone().add(V(0, 80, 0)), 14, C.cup, { base: 0.25, seg: 16 }); // the neck rising through the cup
  f.box('wet', f.P(u, f.H + 10, (30 - t) / 2), 80, 8, 30 + t + 6, C.black, 2);
  f.box('wet', f.P(u, f.wy - 60, 22), 70, 140, 40, C.black, 6);
  for (let i = 0; i < 7; i++) f.box('wet', f.P(u, f.wy - 110 + i * 9, 42.3), 52, 3, 1, 0x070808);
}

export function uv(f: Frame, sp: Spot, filter: FilterModel | undefined, pk?: GearPick) {
  const u0 = sp.u;
  const { kit, t } = f, rp = reefProduct('uv', pk?.product), tube = hexOf(rp?.colors?.body, C.white);
  if (filter && filter.kind === 'canister' || !filter) {
    // inline on the outlet hose: in the stand beside the canister (behind the tank there is rarely room before the
    // wall), else behind the tank: a white tube with grey end caps and a blue indicator window
    const c = f.S.stand.show ? f.P(clamp(f.T.L * 0.25, 140, f.T.L - 140) + 190, f.floor + 170, f.T.D * 0.45) : f.P(u0, (f.floor + f.H) / 2, -t - 34);
    kit.rod('room', c.clone().add(V(0, -140, 0)), c.clone().add(V(0, 140, 0)), 30, tube, { seg: 28 });
    for (const k of [-1, 1]) kit.rod('room', c.clone().add(V(0, k * 140, 0)), c.clone().add(V(0, k * 160, 0)), 32, C.grey, { seg: 28 });
    kit.box('glow', c.clone().add(V(0, 100, 30.2)), 8, 24, 1, C.uvBlue);
    return;
  }
  // a submersible unit on the back glass beside the filter: the lamp tube and its pump head
  const w = 46, h = 200, yT = lerp(Math.min(f.ground(u0, 32) + h + 10, f.wy - 30), f.wy - 30, sp.y ?? 1), u = f.slot(sp.fixed ? u0 : u0 + w / 2, w + 6, yT - h, yT, 0, 60, sp.fixed), b = 32;
  kit.rod('wet', f.P(u, yT - h, b), f.P(u, yT - 40, b), 22, rp ? hexOf(rp.colors?.body, C.charcoal) : C.charcoal, { seg: 24 });
  kit.rod('wet', f.P(u, yT - 40, b), f.P(u, yT, b), 24, C.black, { seg: 24 });
  f.box('glow', f.P(u, yT - 110, b + 22.2), 6, 40, 1, C.uvBlue);
  for (const k of [0.25, 0.7]) sucker(f, u, yT - h * k, b - 22);
  kit.tube('room', overRim(f, u, f.P(u, yT, b), b, f.top + 20), 2.6, C.black, 0, 6);
}

export function ato(f: Frame, sp: Spot, pk?: GearPick) {
  const { kit, t } = f, u = f.slot(sp.u, 30, f.wy - 30, f.H, 0, 30, sp.fixed), y = f.wy, body = hexOf(reefProduct('ato', pk?.product)?.colors?.body, C.black);
  f.box('wet', f.P(u, y + 8, 12), 22, 34, 18, body, 4);
  kit.rod('clear', f.P(u, y - 2, 21), f.P(u, y - 14, 21), 4, C.glass, { base: 0.3, seg: 12 });
  f.box('wet', f.P(u, f.H + 6, (14 - t) / 2), 24, 6, 14 + t + 8, C.black, 2);
  kit.tube('room', overRim(f, u, f.P(u, y + 25, 12), 12, f.top + 20), 2, C.black, 0, 6);
}

/** A surface skimmer (OASE CrystalSkim style) on the back glass: a box on suction cups with its intake slot at the water line. */
export function surfaceSkim(f: Frame, sp: Spot, pk?: GearPick) {
  const { kit } = f, body = hexOf(reefProduct('surfskim', pk?.product)?.colors?.body, C.grey), u = f.slot(sp.u, 70, f.wy - 150, f.wy + 6, 0, 60, sp.fixed), y = f.wy - 60;
  f.box('wet', f.P(u, y, 34), 62, 120, 44, body, 8);
  f.box('wet', f.P(u, f.wy - 2, 58), 50, 4, 12, C.black, 1); // the intake slot, riding the surface
  for (const k of [0.25, 0.75]) sucker(f, u, y - 60 + 120 * k, 12);
  kit.tube('room', overRim(f, u, f.P(u, y + 60, 34), 34, f.top + 20), 2.4, C.black, 0, 6);
}
/** A chiller fan on the rim: a housing with two fan rings blowing across the water. */
export function chillerFan(f: Frame, sp: Spot, pk?: GearPick) {
  const { kit, t } = f, body = hexOf(reefProduct('chiller', pk?.product)?.colors?.body, C.charcoal), u = f.slot(sp.u, 120, f.H - 10, f.H + 60, 0, 70, sp.fixed);
  f.box('room', f.P(u, f.H + 38, (50 - t) / 2), 110, 52, 56, body, 6);
  for (const k of [-1, 1]) kit.put('room', new THREE.TorusGeometry(19, 2.2, 6, 24), C.black, along(f.P(u + k * 28, f.H + 38, -t / 2 + 28), f.inward, 0));
  f.box('wet', f.P(u, f.H + 6, (30 - t) / 2), 80, 6, 30 + t + 8, C.black, 2);
}

