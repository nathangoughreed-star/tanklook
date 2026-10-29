// One simple, crisp, neutral model per generic-only gear type (lane GM7, 2026-10-29; design section 8), scaled by the type's tunables
// (stat blocks in scene/gearSpec.ts). Each builder stands the piece on y = 0 at the origin (mm, +x right, +z toward the viewer) in the
// room / glow / clear buckets of the gear Kit, so a placed copy is `kit.parts` moved into the scene. The dry-tank builders in dry.ts keep
// drawing what the Tech rows pick; these are the tunable counterparts the gear card previews. Neutral colours, no brand marks.
import * as THREE from 'three';
import { genericStats, matMm } from '../../data/genericGear';
import type { GenericType, StatBlock } from '../../scene/gearSpec';
import { UP, V, Kit, C } from './common';

const IN = 25.4;
const SCREEN = 0xbfe3a8, STEEL = 0xd6d9dc;
const cyl = (k: Kit, bk: 'room' | 'clear' | 'glow', x: number, y0: number, y1: number, z: number, r: number, col: number, o: { r2?: number; seg?: number; base?: number } = {}) => k.rod(bk, V(x, y0, z), V(x, y1, z), r, col, { seg: 24, ...o });

type Builder<T extends GenericType> = (k: Kit, s: StatBlock[T]) => void;
const B: { [T in GenericType]: Builder<T> } = {
  // a stick thermometer: a clear glass body with a red spirit column, probes on cords
  thermometer(k, s) {
    k.box('clear', V(0, 70, 0), 16, 140, 8, C.glass, 3, 0, 0.25);
    k.box('room', V(0, 55, 0.5), 3, 100, 8, C.red, 0);
    for (let i = 0; i < s.probes; i++) { const x = (i - (s.probes - 1) / 2) * 34 + 56; k.tube('room', [V(x - 18, 6, 0), V(x - 6, 22, 20), V(x, 6, 36)], 1.4, C.black, 0, 6); k.ball('room', V(x, 5, 36), 4, STEEL); }
  },
  // a round dial gauge on a short stand, a clear lens over a pale face
  hygrometer(k, s) {
    const r = 34;
    k.rod('room', V(0, r + 4, 0), V(0, r + 4, 10), r + 3, C.charcoal, { seg: 40 });
    k.rod('glow', V(0, r + 4, 10), V(0, r + 4, 10.8), r - 3, C.gauge, { seg: 40 });
    k.rod('room', V(0, r + 4, 11), V(14, r + 14, 11), 1.2, C.red, { seg: 6 });
    k.box('room', V(0, 3, 0), 40, 6, 24, C.charcoal, 3);
    for (let i = 0; i < s.probes; i++) k.tube('room', [V(-20 + i * 40, 6, -6), V(-30 + i * 60, 10, -30), V(-30 + i * 60, 4, -62)], 1.4, C.black, 0, 6);
  },
  // a controller box: dimming = a knob and a wider display; each channel is one outlet socket on its side
  thermostat(k, s) {
    const dim = s.dimming > 0.5, w = 100 + s.channels * 18 + (dim ? 20 : 0), h = dim ? 100 : 72, d = dim ? 58 : 44;
    k.box('room', V(0, h / 2, 0), w, h, d, dim ? 0x33353a : 0x2a4d8f, 6);
    k.box('glow', V(-w * (dim ? 0.12 : 0), h * 0.64, d / 2 + 0.6), w * (dim ? 0.46 : 0.5), h * 0.26, 1.2, SCREEN);
    if (dim) cyl(k, 'room', w * 0.3, h * 0.2, h * 0.2 + 0.1, d / 2 + 0.2, 9, STEEL, { seg: 20 }), k.rod('room', V(w * 0.3, h * 0.28, d / 2), V(w * 0.3, h * 0.28, d / 2 + 10), 9, STEEL, { seg: 16 });
    else for (const x of [-1, 1]) k.box('room', V(x * w * 0.3, h * 0.25, d / 2 + 1.5), 14, 9, 3, STEEL, 2);
    for (let i = 0; i < s.channels; i++) k.box('room', V(w / 2 + 4, h * 0.3, s.channels > 1 ? -d / 2 + 10 + i * (d - 20) / (s.channels - 1) : 0), 8, 22, 12, C.black, 2);
    k.tube('room', [V(0, h, 0), V(0, h + 36, -26), V(0, h + 8, -70)], 2.4, C.black, 0, 6);
  },
  // a plug-in timer: a pale body with a dial, one socket row per channel
  timer(k, s) {
    const w = 62 + (s.channels - 1) * 20;
    k.box('room', V(0, 38, 0), w, 76, 44, 0xf1f1ee, 8);
    k.rod('room', V(-(w - 62) / 2, 48, 22), V(-(w - 62) / 2, 48, 25), 17, 0xc9ccd0, { seg: 20 });
    k.box('glow', V(0, 18, 22.6), 30, 9, 1.2, SCREEN);
    for (let i = 1; i < s.channels; i++) k.box('room', V(-(w - 62) / 2 + 12 + i * 20 + 4, 38, 22.4), 14, 30, 1.4, C.charcoal, 2);
  },
  // a deep reflector dome on a ceramic socket with a basking bulb; the dome grows with the bulb watts (5.5 in to 8.5 in)
  heatlamp(k, s) {
    const R = 55 + (Math.min(250, Math.max(25, s.watts)) - 25) * 0.25, prof: [number, number][] = [[R, 0], [R * 0.99, R * 0.12], [R * 0.93, R * 0.38], [R * 0.8, R * 0.62], [R * 0.58, R * 0.82], [R * 0.34, R * 0.95], [R * 0.24, R * 0.98]];
    const c = V(0, 70, 0);
    k.lathe('room', prof, c, UP, C.black, 0.06, 32);
    k.lathe('glow', prof.map(([r, h]) => [r * 0.97, h - 1] as [number, number]).reverse(), c, UP, 0xd9cdb6, 0.06, 32);
    k.put('room', new THREE.TorusGeometry(R, 2.5, 6, 40), C.charcoal, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(c.x, c.y + 2.5, c.z));
    const neck = c.clone().add(V(0, R * 0.95, 0));
    k.rod('room', neck, neck.clone().add(V(0, 34, 0)), R * 0.27, C.black, { seg: 20 });
    k.rod('glow', c.clone().add(V(0, R * 0.6, 0)), neck, R * 0.12, 0xd9cdb6, { seg: 16 });
    k.ball('glow', c.clone().add(V(0, R * 0.45, 0)), R * 0.3 * Math.cbrt(Math.max(s.watts, 25) / 75), 0xffe2a8, 0.06, 2);
    k.tube('room', [neck.clone().add(V(0, 34, 0)), neck.clone().add(V(0, 60, -40)), V(0, 2, -R - 40)], 2.6, C.black, 0, 6);
  },
  // a thin mat: its size follows its watts (6x8 in at 8 W, 8x12 in at 16 W, 8x18 in at 24 W), a cord out of one corner
  heatmat(k, s) {
    const [len, dep] = matMm(s.watts);
    k.box('room', V(0, 1.5, 0), len, 3, dep, 0x1b1b1d, 1);
    k.box('room', V(0, 3.2, 0), len - 16, 0.6, dep - 16, 0x2b2c30, 0);
    k.tube('room', [V(-len / 2 + 14, 2, dep / 2 - 14), V(-len / 2 - 20, 2, dep / 2 + 20), V(-len / 2 - 70, 2, dep / 2 + 50)], 2.2, C.black, 0, 6);
  },
  // a T5 HO fixture: an aluminium channel on two end caps, the tube in clips; the length is the tube's, the end-cap bar the UVB strength
  uvb(k, s) {
    const len = s.lengthIn * IN * 0.96, W = s.strengthPct < 3.5 ? 46 : 56, y = 0;
    for (const x of [-1, 1]) k.box('room', V(x * (len / 2 + 17), y + 18, 0), 34, 36, W + 4, C.charcoal, 4);
    k.box('room', V(0, y + 34, 0), len, 4, W, C.black);
    for (const z of [-1, 1]) k.box('room', V(0, y + 23, z * (W / 2 - 1.5)), len, 22, 3, C.black);
    k.box('glow', V(0, y + 31.5, 0), len, 0.8, W - 8, 0xc8ccd2);
    k.rod('glow', V(-len / 2, y + 19, 0), V(len / 2, y + 19, 0), 8, 0xf4f1ff, { seg: 16 });
    for (const x of [-0.36, 0.36]) { k.put('room', new THREE.TorusGeometry(9.5, 1.6, 6, 16), STEEL, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(x * len, y + 19, 0)); k.box('room', V(x * len, y + 29, 0), 8, 8, 6, STEEL); }
    // the strength bar on the right cap: a lit strip whose length is the output (2 % to 14 %), violet toward the strong tubes
    const bar = 4 + 28 * Math.min(1, Math.max(0, (s.strengthPct - 2) / 12)), t = Math.min(1, Math.max(0, (s.strengthPct - 2) / 12));
    k.box('glow', V(len / 2 + 17, y + 18, W / 2 + 2.4), 4, bar, 1, new THREE.Color().lerpColors(new THREE.Color(0x9ad0ff), new THREE.Color(0xb48cff), t).getHex());
    k.tube('room', [V(len / 2 + 17, y + 36, 0), V(len / 2 + 40, y + 60, -30), V(len / 2 + 60, y + 10, -80)], 2.6, C.black, 0, 6);
  },
  // a nozzle manifold with one nozzle per count, the pump and reservoir beside it (the reservoir grows with the output)
  mister(k, s) {
    const n = Math.round(s.nozzles), gap = 34, w = (n - 1) * gap + 40, res = 120 * Math.cbrt(Math.max(s.mlPerHour, 100) / 400);
    k.rod('room', V(-w / 2, 40, 0), V(w / 2, 40, 0), 5, C.black, { seg: 14 });
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * gap; k.rod('room', V(x, 40, 0), V(x, 14, 0), 3.5, C.black, { seg: 12 }); k.rod('room', V(x, 14, 0), V(x, 6, 0), 5.5, C.charcoal, { seg: 12, r2: 2.5 }); }
    const rx = w / 2 + res / 2 + 40;
    k.box('clear', V(rx, res * 0.6, 0), res, res * 1.2, res * 0.78, C.glass, 6, 0, 0.3);
    k.box('clear', V(rx, res * 0.35, 0), res - 8, res * 0.7, res * 0.78 - 8, 0xcfe6ee, 0, 0, 0.45);
    k.box('room', V(rx, res * 1.2 + 12, 0), res + 10, 24, res * 0.78 + 8, C.black, 6);
    k.tube('room', [V(w / 2, 40, 0), V(w / 2 + 20, 30, 0), V(rx - res / 2, res * 1.2 + 14, 0)], 2.6, C.black, 0, 6);
  },
  // a fogger body (it grows with the output), a white outlet elbow and its ribbed hose
  fogger(k, s) {
    const g = Math.cbrt(Math.max(s.mlPerHour, 100) / 400), w = 220 * g, h = 180 * g, d = 160 * g;
    k.box('room', V(0, h / 2, 0), w, h, d, C.white, 12);
    k.box('room', V(0, h + 6, 0), w - 20, 12, d - 20, C.lightGrey, 6);
    k.rod('room', V(w * 0.3, h + 10, 0), V(w * 0.3, h + 60, 0), 16, C.white, { seg: 20 });
    k.tube('room', [V(w * 0.3, h + 60, 0), V(w * 0.5 + 40, h + 90, 0), V(w * 0.5 + 120, h + 30, 0)], 13, 0xdedcd6, 0, 12);
  },
  // a glass trumpet on a straight stem: the flared outlet's diameter is the stat (the stem is a typical 3/4 in)
  lilypipe(k, s) {
    const R = s.diameterIn * IN / 2, r = Math.min(R, 11), len = 150;
    const prof: [number, number][] = [[r, 0], [r, 40], [r * 1.05, 60], [R * 0.75, 76], [R * 0.92, 90], [R, 104], [R * 0.97, 108]];
    k.lathe('clear', prof, V(0, len - 40, 0), UP, C.glass, 0.3, 40);
    k.lathe('clear', prof.map(([a, b]) => [Math.max(a - 1.6, 0.5), b + 0.5] as [number, number]).reverse(), V(0, len - 40, 0), UP, 0xcfe6ee, 0.18, 40);
    k.rod('clear', V(0, 0, 0), V(0, len - 40, 0), r, C.glass, { seg: 24, base: 0.3 });
    k.rod('room', V(0, -6, 0), V(0, 0, 0), r + 4, C.black, { seg: 24 });
  },
  // a dosing pump: a body with one lit head per channel on the front, tubes out of the heads
  doser(k, s) {
    const n = Math.round(s.heads), w = 40 + n * 50, h = 90;
    k.box('room', V(0, h / 2, 0), w, h, 90, C.charcoal, 8);
    k.box('glow', V(0, h * 0.85, 45.6), w * 0.6, 12, 1.2, SCREEN);
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 50; k.rod('room', V(x, h * 0.4, 45), V(x, h * 0.4, 62), 17, C.white, { seg: 24 }); k.rod('room', V(x, h * 0.4, 62), V(x, h * 0.4, 66), 11, C.lightGrey, { seg: 20 }); k.tube('clear', [V(x, h * 0.4 - 14, 66), V(x, 12, 90), V(x + 12, 0, 130)], 1.8, 0xe6eef0, 0.2, 6); }
  },
  // a drum feeder: a clear hopper on a motor housing, one hopper per count
  feeder(k, s) {
    const n = Math.round(s.hoppers);
    k.box('room', V(0, 22, 0), 70 + (n - 1) * 62, 44, 70, C.black, 8);
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 62; k.rod('clear', V(x, 44, 0), V(x, 106, 0), 28, C.glass, { seg: 28, base: 0.3 }); k.rod('room', V(x, 106, 0), V(x, 112, 0), 30, C.white, { seg: 28 }); }
    k.box('glow', V(0, 28, 35.6), 26, 8, 1.2, SCREEN);
  },
  // an RO/DI unit: a row of filter canisters and a membrane housing on a bracket (taller with the rating)
  rodi(k, s) {
    const g = Math.cbrt(Math.max(s.gpd, 25) / 75), h = 250 * g, r = 38 * Math.sqrt(g);
    k.box('room', V(0, 6, -r - 6), 4 * r + 150, 12, 14, C.charcoal, 3);
    k.box('room', V(0, h * 0.55, -r - 10), 4 * r + 150, 14, 6, C.charcoal, 2);
    for (let i = 0; i < 4; i++) { const x = (i - 1.5) * (2 * r + 16), mem = i === 3; cyl(k, mem ? 'room' : 'clear', x, 12, 12 + h * (mem ? 0.9 : 1), 0, mem ? r * 0.55 : r, mem ? 0xeeeeea : C.glass, { base: 0.28 }); cyl(k, 'room', x, 12 + h * (mem ? 0.9 : 1), 12 + h * (mem ? 0.9 : 1) + 22, 0, mem ? r * 0.6 : r * 0.96, C.black); }
  },
  // a drop checker: a glass bulb on a stem holding a green solution, the suction cup on its side
  dropchecker(k, s) {
    for (let i = 0; i < Math.round(s.count); i++) {
      const x = (i - (s.count - 1) / 2) * 56, prof: [number, number][] = [[1, 0], [10, 6], [17, 22], [19, 38], [15, 56], [8, 66], [6, 78], [6.8, 86]];
      k.lathe('clear', prof, V(x, 20, 0), UP, C.glass, 0.28, 28);
      k.lathe('room', [[0.5, 0], [12, 4], [15, 18], [16, 30], [11, 40], [0.5, 42]], V(x, 22, 0), UP, 0x41b441, 0.1, 24);
      k.rod('room', V(x, 8, 0), V(x, 20, 0), 3, C.black, { seg: 10 });
      k.rod('room', V(x, 4, 0), V(x, 8, 0), 12, C.black, { seg: 20, r2: 6 });
    }
  },
  // a sump: a clear box with two baffles and the water in it; the box scales with the volume (a 20 gal long is about 24 x 12 x 16 in)
  sump(k, s) {
    const g = Math.cbrt(Math.max(s.gal, 5) / 20), L = 24 * IN * g, D = 12 * IN * g, H = 16 * IN * g;
    k.box('clear', V(0, H / 2, 0), L, H, D, C.glass, 4, 0, 0.3);
    k.box('clear', V(0, H * 0.35, 0), L - 12, H * 0.7, D - 12, 0xbfe0ea, 0, 0, 0.4);
    for (const x of [-0.22, 0.2]) k.box('clear', V(x * L, H * 0.45, 0), 6, H * 0.9, D - 8, C.glass, 0, 0, 0.35);
    k.box('room', V(0, 3, 0), L + 12, 6, D + 12, C.black, 2);
  },
  // the top: a frame of black trim, glass or mesh in it; "left open" lifts the back half off, a hood adds the box and its LED strip
  lid(k, s) {
    const L = s.lengthIn * IN, D = Math.min(L * 0.5, 305), open = Math.min(1, Math.max(0, s.openPct / 100)), mat = Math.round(s.material), t = 6;
    const closedD = D * (1 - open);
    k.box('room', V(0, t / 2, D / 2), L + 6, t, 8, C.black, 1); k.box('room', V(0, t / 2, -D / 2), L + 6, t, 8, C.black, 1);
    for (const x of [-1, 1]) k.box('room', V(x * (L / 2 + 1), t / 2, 0), 8, t, D + 8, C.black, 1);
    if (closedD > 6) {
      const cz = D / 2 - closedD / 2;
      if (mat === 1) { k.box('room', V(0, t + 1, cz), L - 4, 2, closedD, C.grey, 0); for (let x = -L / 2 + 14; x < L / 2; x += 14) k.box('room', V(x, t + 1.2, cz), 1.4, 2.4, closedD, C.black, 0); }
      else if (mat === 2) { k.box('room', V(0, 34, cz), L - 4, 52, closedD, C.charcoal, 6); if (s.hoodLed > 0.5) k.box('glow', V(0, 6.8, cz), L * 0.82, 1, Math.max(8, closedD * 0.35), 0xf4f1ff); }
      else k.box('clear', V(0, t + 1.5, cz), L - 4, 3, closedD, C.glass, 0, 0, 0.3);
    }
  },
  // a return pump: a volute body with a motor cap and an outlet nozzle; the body scales with the flow
  returnpump(k, s) {
    const g = Math.cbrt(Math.max(s.gph, 100) / 600), R = 46 * g, H = 90 * g;
    k.rod('room', V(0, 0, 0), V(0, H, 0), R, C.black, { seg: 32 });
    k.rod('room', V(0, H, 0), V(0, H + 36 * g, 0), R * 0.86, C.charcoal, { seg: 32 });
    k.rod('room', V(R * 0.7, H * 0.65, 0), V(R + 52 * g, H * 0.65, 0), 13 * Math.sqrt(g), C.black, { seg: 20 });
    for (const x of [-1, 1]) k.box('room', V(x * R * 0.75, 2, 0), 16, 4, 22, C.charcoal, 1);
    k.tube('room', [V(0, H + 36 * g, 0), V(-20, H + 60 * g, -30), V(-50, 2, -90)], 2.4, C.black, 0, 6);
  },
};

/** The model of one generic-only piece at the owner's stats (defaults for any left out), as a Kit to merge or mesh. Pure geometry. */
export function genericKit<T extends GenericType>(type: T, stats?: Partial<StatBlock[T]>): Kit {
  const k = new Kit();
  (B[type] as Builder<T>)(k, genericStats(type, stats));
  return k;
}
/** Its meshes (up to four, one per bucket), standing on y = 0 at the origin. */
export const genericMeshes = <T extends GenericType>(type: T, stats?: Partial<StatBlock[T]>): THREE.Mesh[] => genericKit(type, stats).meshes();
