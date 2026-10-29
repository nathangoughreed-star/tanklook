// A dry tank's top: the lamps and misting, and where top gear may stand. (render/gear3d.ts split per type, lane GM1, 2026-10-29: moved as is, no behaviour change).
import * as THREE from 'three';
import { techOf } from '../../scene/tech';
import { backdropDepth, glassThickness, tankUnderside, floorY, clamp, HOOD_H, RIM_DROP, RIM_H } from '../../scene/physics';
import { chord } from '../../scene/shape';
import type { Tank, TankSetup } from '../../scene/types';
import { UP, V, Kit, C } from './common';

// ---------- a dry tank's top: the lamps and misting (2026-10-21; Nathan: "slide anywhere theres surface") ----------

/** The surface a dry tank's top gear stands on: its height at depth d (mm from the front), and whether there is a lid
 *  (mesh or glass panels on the rim lip, or the hood) or only the rim to stand on (lid 'open'). Mirrors addLid and
 *  addHood in render/build.ts. */
export function lidTop(S: TankSetup, T: Tank): { open: boolean; y: (d: number) => number } {
  const rim = S.render.rim;
  if (S.lid === 'open') return { open: true, y: () => T.H + (rim ? RIM_DROP : 0) };
  if (S.lid === 'hood') { const base = rim ? T.H + RIM_DROP : T.H, hf = 22, hb = HOOD_H - 3; return { open: false, y: d => base + hf + (hb - hf) * (1 - (1 - clamp(d / T.D, 0, 1)) ** 2) }; }
  const y = rim ? T.H - RIM_H + RIM_DROP + 10 : T.H + 4; // the panels' top face
  return { open: false, y: () => y };
}
/** Where a piece hx by hd mm (half sizes along x and depth) stands on the top near (x, d): held inside the footprint on
 *  a lid; with no lid, centred on the nearest rim (a long piece only on the front or back one). */
export function onTop(S: TankSetup, T: Tank, x: number, d: number, hx: number, hd: number): [number, number] {
  const m = 6, fit = (v: number, lo: number, hi: number) => (lo <= hi ? clamp(v, lo, hi) : (lo + hi) / 2);
  const cx = fit(x, hx + m, T.L - hx - m), [d0, d1] = chord(T, 0, clamp(cx, 1, T.L - 1)) ?? [0, T.D];
  if (!lidTop(S, T).open) return [cx, fit(d, d0 + hd + m, d1 - hd - m)];
  const r = (glassThickness(T, S.render.glass) + (S.render.rim ? 8 : 0)) / 2;
  const near: [number, [number, number]][] = [[Math.abs(d - d0), [cx, d0 - r]], [Math.abs(d1 - d), [cx, d1 + r]]];
  if (hx <= hd * 1.5) {
    const cd = fit(d, d0 + hd + m, d1 - hd - m), [e0, e1] = chord(T, 1, clamp(cd, 1, T.D - 1)) ?? [0, T.L];
    near.push([Math.abs(x - e0), [e0 - r, cd]], [Math.abs(e1 - x), [e1 + r, cd]]);
  }
  return near.reduce((a, b) => (b[0] < a[0] ? b : a))[1];
}
/** A cord or tube from p on the top back to the back edge, over it and down the outside to height yEnd (then to `end`). */
export function offBack(S: TankSetup, T: Tank, p: THREE.Vector3, yEnd: number, end?: THREE.Vector3) {
  const t = glassThickness(T, S.render.glass) + (S.render.rim ? 8 : 0), d1 = (chord(T, 0, clamp(p.x, 1, T.L - 1)) ?? [0, T.D])[1], top = lidTop(S, T).y(d1);
  const out = [p, V(p.x, Math.max(p.y, top) + 30, Math.min(p.z, -(d1 - 60))), V(p.x, top + 18, -(d1 + t / 2)), V(p.x, top - 20, -(d1 + t + 14)), V(p.x, yEnd, -(d1 + t + 14))];
  if (end) out.push(end);
  return out;
}

/** A spot on the top: x and depth from the front, mm. */
export interface TopSpot { x: number; d: number }
/** T5 tube lengths sold (mm: 12, 18, 22, 34 and 46 in). */
export const T5_MM = [288, 438, 550, 862, 1150];
/** The nearest spot to `want` where a piece of half size hx by hd clears every footprint in `taken` (clear air of 8 mm); the wanted spot
 *  when nothing is free. Top pieces do not stand on each other (Lid lamps follow-up, S240); with no lid the rim decides, so no search. */
export function clearOnTop(S: TankSetup, T: Tank, want: TopSpot, hx: number, hd: number, taken: [number, number, number, number][]): TopSpot {
  const gap = 8, free = (x: number, d: number) => taken.every(([tx, td, thx, thd]) => Math.abs(x - tx) >= hx + thx + gap || Math.abs(d - td) >= hd + thd + gap);
  const [wx, wd] = onTop(S, T, want.x, want.d, hx, hd);
  if (lidTop(S, T).open || free(wx, wd)) return { x: wx, d: wd };
  let best: TopSpot | undefined, bestD = Infinity;
  for (let x = 0; x <= T.L; x += 10) for (let d = 0; d <= T.D; d += 10) {
    const [cx, cd] = onTop(S, T, x, d, hx, hd), dist = (cx - wx) ** 2 + (cd - wd) ** 2;
    if (dist < bestD && free(cx, cd)) { best = { x: cx, d: cd }; bestD = dist; }
  }
  return best ?? { x: wx, d: wd };
}
/** The UVB tube drawn: the kit that is priced (the low-output row is the 12 in shade-dweller kit, the full row a 24 in T5 HO), shortened to the
 *  longest standard tube up to ~3/4 of the tank's length. */
export const uvbLen = (S: TankSetup, T: Tank) => Math.min(techOf(S).rows.uvb === 'low' ? T5_MM[0] : 610, T5_MM.filter(l => l <= Math.max(T.L * 0.72, T5_MM[0])).pop()!);
/** Each top piece's builder (its body; the cord or tube it returns is drawn after, outside its grab box) and default spot. */
export const TOP: Record<string, { at: (T: Tank) => TopSpot; /** half its footprint (mm along x, in depth), as its builder clamps it */ half: (S: TankSetup, T: Tank) => [number, number]; build: (S: TankSetup, T: Tank, kit: Kit, sp: TopSpot) => () => void }> = {
  // a deep reflector dome with a ceramic socket and a basking bulb: black outside, bare aluminium inside lit by the
  // bulb, a rolled lip on the mesh (8.5" on a tank over 3 ft, else 5.5")
  heatdome: { at: T => ({ x: T.L * 0.22, d: T.D * 0.4 }), half: (_S, T) => { const R = (T.L >= 900 ? 108 : 70) + 3; return [R, R]; }, build(S, T, kit, sp) {
    const R = T.L >= 900 ? 108 : 70, [x, d] = onTop(S, T, sp.x, sp.d, R + 3, R + 3), c = V(x, lidTop(S, T).y(d), -d);
    const prof: [number, number][] = [[R, 0], [R * 0.99, R * 0.12], [R * 0.93, R * 0.38], [R * 0.8, R * 0.62], [R * 0.58, R * 0.82], [R * 0.34, R * 0.95], [R * 0.24, R * 0.98]];
    kit.lathe('room', prof, c, UP, C.black, 0.06, 32);
    kit.lathe('glow', prof.map(([r, h]) => [r * 0.97, h - 1] as [number, number]).reverse(), c, UP, 0xd9cdb6, 0.06, 32);
    kit.put('room', new THREE.TorusGeometry(R, 2.5, 6, 40), C.charcoal, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(c.x, c.y + 2.5, c.z));
    const neck = c.clone().add(V(0, R * 0.95, 0)); // the socket wider than the dome's top opening, so it closes it
    kit.rod('room', neck, neck.clone().add(V(0, 34, 0)), R * 0.27, C.black, { seg: 20 });
    kit.rod('glow', c.clone().add(V(0, R * 0.6, 0)), neck, R * 0.12, 0xd9cdb6, { seg: 16 });
    kit.ball('glow', c.clone().add(V(0, R * 0.45, 0)), R * 0.3, 0xffe2a8, 0.06, 2);
    return () => kit.tube('room', offBack(S, T, neck.clone().add(V(0, 34, 0)), tankUnderside(T, S.render) + 20), 2.6, C.black, 0, 6);
  } },
  // a T5 UVB fixture: an aluminium channel (open below, its reflector inside) on two end caps, the tube held in clips;
  // the longest standard tube up to ~3/4 of the tank's length
  uvb: { at: T => ({ x: T.L * 0.22, d: T.D * 0.74 }), half: (S, T) => [uvbLen(S, T) / 2 + 34, 30], build(S, T, kit, sp) {
    const len = uvbLen(S, T), W = 56;
    const [x, d] = onTop(S, T, sp.x, sp.d, len / 2 + 34, W / 2 + 2), y = lidTop(S, T).y(d), z = -d;
    for (const k of [-1, 1]) kit.box('room', V(x + k * (len / 2 + 17), y + 18, z), 34, 36, W + 4, C.charcoal, 4);
    kit.box('room', V(x, y + 34, z), len, 4, W, C.black);
    for (const k of [-1, 1]) kit.box('room', V(x, y + 23, z + k * (W / 2 - 1.5)), len, 22, 3, C.black);
    kit.box('glow', V(x, y + 31.5, z), len, 0.8, W - 8, 0xc8ccd2);
    kit.rod('glow', V(x - len / 2, y + 19, z), V(x + len / 2, y + 19, z), 8, 0xf4f1ff, { seg: 16 });
    for (const k of [-0.36, 0.36]) {
      kit.put('room', new THREE.TorusGeometry(9.5, 1.6, 6, 16), 0xd6d9dc, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(x + k * len, y + 19, z));
      kit.box('room', V(x + k * len, y + 29, z), 8, 8, 6, 0xd6d9dc);
    }
    return () => kit.tube('room', offBack(S, T, V(x + len / 2 + 17, y + 36, z), tankUnderside(T, S.render) + 20), 2.6, C.black, 0, 6);
  } },
  // a misting nozzle through the top (a nut on the mesh, the nozzle under it), its tube to the pump and reservoir on
  // the floor behind the tank
  mister: { at: T => ({ x: T.L * 0.78, d: T.D * 0.8 }), half: () => [14, 14], build(S, T, kit, sp) {
    const [x, d] = onTop(S, T, sp.x, sp.d, 14, 14), y = lidTop(S, T).y(d), z = -d;
    kit.rod('room', V(x, y, z), V(x, y + 5, z), 12, C.black, { seg: 6 });
    kit.rod('room', V(x, y + 5, z), V(x, y + 26, z), 7, C.black, { seg: 16 });
    kit.rod('room', V(x, y, z), V(x, y - 16, z), 4, C.black, { seg: 12 });
    kit.rod('room', V(x, y - 16, z), V(x, y - 22, z), 5.5, C.charcoal, { seg: 12, r2: 2.5 });
    return () => {
      const fy = floorY(T, S.render, S.stand), rx = clamp(x, 110, T.L - 110), rz = -(T.D + 120);
      kit.box('clear', V(rx, fy + 110, rz), 180, 220, 140, C.glass, 6, 0, 0.3);
      kit.box('clear', V(rx, fy + 70, rz), 170, 130, 130, 0xcfe6ee, 0, 0, 0.45);
      kit.box('room', V(rx, fy + 232, rz), 190, 24, 150, C.black, 6);
      kit.tube('room', offBack(S, T, V(x, y + 26, z), fy + 300, V(rx, fy + 244, rz)), 2.6, C.black, 0, 6);
    };
  } },
  // a fogger's outlet: a white elbow standing in a hole in the top, its ribbed hose to the fogger on the floor behind
  fogger: { at: T => ({ x: T.L * 0.8, d: T.D * 0.82 }), half: () => [22, 22], build(S, T, kit, sp) {
    const [x, d] = onTop(S, T, sp.x, sp.d, 22, 22), y = lidTop(S, T).y(d), z = -d;
    kit.rod('room', V(x, y - 12, z), V(x, y + 40, z), 20, C.white, { seg: 20 });
    kit.rod('room', V(x, y + 40, z), V(x, y + 46, z), 22, C.white, { seg: 20 });
    return () => {
      const fy = floorY(T, S.render, S.stand), rx = clamp(x, 130, T.L - 130), rz = -(T.D + 130);
      kit.box('room', V(rx, fy + 90, rz), 220, 180, 160, C.white, 12);
      kit.box('room', V(rx, fy + 186, rz), 200, 12, 140, C.lightGrey, 6);
      kit.tube('room', offBack(S, T, V(x, y + 46, z), fy + 280, V(rx, fy + 192, rz)), 14, 0xdedcd6, 0, 12);
    };
  } },
};

/** A dry tank's small gear that is not on the top (not dragged): the heat mat under the glass, the thermostat and timer boxes and the
 *  hand sprayer on the floor behind, the gauge on the inside of the back glass. Each builder returns nothing; its x is a fixed slot. */
export const BESIDE: Record<string, (S: TankSetup, T: Tank, kit: Kit) => void> = {
  heatmat(S, T, kit) {
    const len = Math.min(T.L * 0.34, 460), dep = Math.min(T.D * 0.7, 210), x = T.L * 0.22 + len * 0.1, y = tankUnderside(T, S.render) - 2.5, z = -T.D / 2, fy = floorY(T, S.render, S.stand);
    kit.box('room', V(x, y, z), len, 3, dep, 0x1b1b1d, 1);
    kit.tube('room', [V(x - len / 2 + 30, y, -(T.D - 24)), V(x - len / 2 + 30, y - 3, -(T.D + 22)), V(x - len / 2 + 30, fy + 70, -(T.D + 30)), V(x - len / 2 + 30, fy + 4, -(T.D + 80))], 2.2, C.black, 0, 6);
  },
  // a dimming box (Herpstat-like, a knob and a screen) is bigger than an on/off one (a probe jack and a small display)
  thermostat(S, T, kit) {
    const dim = techOf(S).rows.thermostat === 'dimming', w = dim ? 150 : 120, h = dim ? 100 : 70, d = dim ? 60 : 45, fy = floorY(T, S.render, S.stand), x = Math.max(80, w / 2 + 20), z = -(T.D + 90);
    kit.box('room', V(x, fy + h / 2, z), w, h, d, dim ? 0x33353a : 0x2a4d8f, 6);
    kit.box('glow', V(x, fy + h * 0.62, z + d / 2 + 0.6), w * 0.5, h * 0.26, 1.2, 0xbfe3a8);
    if (dim) kit.rod('room', V(x + w * 0.28, fy + h * 0.3, z + d / 2), V(x + w * 0.28, fy + h * 0.3, z + d / 2 + 10), 9, 0xd6d9dc, { seg: 16 });
    else for (const k of [-1, 1]) kit.box('room', V(x + k * w * 0.3, fy + h * 0.25, z + d / 2 + 1.5), 14, 9, 3, 0xd6d9dc, 2);
    kit.tube('room', [V(x, fy + h, z), V(x, fy + h + 40, z - 30), V(x, fy + h + 10, -(T.D + 22))], 2.4, C.black, 0, 6);
  },
  timer(S, T, kit) {
    const fy = floorY(T, S.render, S.stand), x = Math.max(80, 150 + 95), z = -(T.D + 90);
    kit.box('room', V(x, fy + 38, z), 62, 76, 44, 0xf1f1ee, 8);
    kit.rod('room', V(x, fy + 48, z + 22), V(x, fy + 48, z + 25), 17, 0xc9ccd0, { seg: 20 });
    kit.box('glow', V(x, fy + 18, z + 22.6), 30, 9, 1.2, 0xbfe3a8);
  },
  handmister(S, T, kit) {
    const fy = floorY(T, S.render, S.stand), x = T.L - Math.max(70, T.L * 0.06), z = -(T.D + 90);
    kit.rod('clear', V(x, fy, z), V(x, fy + 210, z), 40, 0xcfe6ee, { seg: 24, base: 0.3 });
    kit.rod('room', V(x, fy + 210, z), V(x, fy + 232, z), 32, C.black, { seg: 20 });
    kit.rod('room', V(x, fy + 232, z), V(x + 32, fy + 244, z), 8, C.black, { seg: 12 });
    kit.rod('room', V(x + 4, fy + 210, z - 6), V(x + 44, fy + 196, z - 6), 5, C.black, { seg: 10 });
  },
  gauge(S, T, kit) {
    const Db = T.D - backdropDepth(S.backdrop, T), x = T.L * 0.58, y = T.H * 0.6, z = -(Db - 10);
    kit.box('room', V(x, y, z), 62, 38, 9, 0x26272b, 3);
    kit.box('glow', V(x, y, z + 4.8), 50, 24, 1, 0xcfe8c8);
    kit.tube('room', [V(x + 31, y - 10, z), V(x + 60, y - 30, z + 4), V(x + 60, y - 80, z + 10)], 1.6, C.black, 0, 6);
  },
};

