// CO2 regulator, cylinder and drop checker. (render/gear3d.ts split per type, lane GM1, 2026-10-29: moved as is, no behaviour change).
import * as THREE from 'three';
import { clamp } from '../../scene/physics';
import { GearPick, V, along, hash, C, DROP_COLOURS, Frame, Spot, lerp, sucker, line, overRim } from './common';

export function co2(f: Frame, sp: Spot, level: GearPick['co2']) {
  const { kit, t } = f, b = 26, g0 = f.ground(sp.u, b);
  // diffuser low under the filter's outlet: a glass cup round a white ceramic disc, on a glass stem with a suction cup
  const y = lerp(g0 + 40, f.wy - 60, sp.y ?? 0.15), u = f.slot(sp.u, 40, y - 40, y + 40, 0, 50, sp.fixed);
  const c = f.P(u, y, b);
  kit.rod('clear', c.clone().add(V(0, -8, 0)), c.clone().add(V(0, 10, 0)), 15, C.glass, { base: 0.1, seg: 24 });
  kit.rod('wet', c.clone().add(V(0, 6, 0)), c.clone().add(V(0, 8, 0)), 13, C.white, { seg: 24 });
  kit.tube('clear', [c.clone().add(V(0, -8, 0)), c.clone().add(V(0, -18, 0)), f.P(u, y - 18, 8), f.P(u, y + 30, 6)], 3, C.glass, 0.12, 8);
  sucker(f, u, y + 10, 4);
  // the fine mist rising from the disc toward the outlet's flow
  for (let i = 0; i < 60; i++) {
    const h = hash(i, 9, 1) ** 1.6 * (f.wy - y - 20), dr = 4 + h * 0.18;
    kit.ball('clear', c.clone().add(V((hash(i, 2, 3) - 0.5) * dr * 2, 12 + h, (hash(i, 4, 5) - 0.5) * dr)), 0.7 + 0.5 * hash(i, 6, 7), C.water, 0.1, 0);
  }
  // the line up out of the tank, the bubble counter outside the rim, down to the cylinder
  const route = overRim(f, u, f.P(u, y + 30, 6), 6, f.H - 60, -t - 18);
  line(f, route, 0xc9d6d8);
  const bc = route[route.length - 1];
  kit.rod('clear', bc.clone().add(V(0, -60, 0)), bc.clone(), 10, C.glass, { base: 0.1, seg: 18 });
  kit.rod('clear', bc.clone().add(V(0, -58, 0)), bc.clone().add(V(0, -22, 0)), 8.5, 0xcfe8ee, { base: 0.35, seg: 18 });
  kit.rod('room', bc, bc.clone().add(V(0, 6, 0)), 10.5, C.black, { seg: 18 });
  const cyl = f.S.stand.show ? V(f.P(clamp(f.T.L * 0.7, 80, f.T.L - 80), 0, 0).x, f.floor, -f.T.D * 0.5) : V(f.side === 'left' ? -f.t - 110 : f.T.L + f.t + 110, f.floor, -f.T.D + 100);
  const ch = Math.min(430, (f.S.stand.show ? f.top - f.floor : 600) - 140);
  kit.rod('room', cyl, cyl.clone().add(V(0, ch - 60, 0)), 68, C.black, { seg: 28 });
  kit.rod('room', cyl.clone().add(V(0, ch - 60, 0)), cyl.clone().add(V(0, ch, 0)), 68, C.black, { seg: 28, r2: 20 });
  const rg = cyl.clone().add(V(0, ch + 30, 0));
  kit.rod('room', cyl.clone().add(V(0, ch, 0)), rg, 14, C.brass, { seg: 16 });
  kit.box('room', rg, 70, 34, 34, C.brass, 4);
  for (const k of [-1, 1]) {
    const gp = rg.clone().add(V(k * 36, 18, 0));
    kit.put('room', new THREE.CylinderGeometry(22, 22, 12, 24), C.black, along(gp, V(0, 0, 1), 0));
    kit.put('glow', new THREE.CircleGeometry(19, 24), C.gauge, new THREE.Matrix4().makeTranslation(gp.x, gp.y, gp.z + 6.2));
  }
  kit.box('room', rg.clone().add(V(0, 0, 38)), 34, 34, 40, C.black, 5); // solenoid
  // down the back of the tank, then (in a stand) in under its top to the regulator
  const b0 = bc.clone().add(V(0, -60, 0)), low = V(b0.x, f.top - 60, b0.z - 10);
  line(f, [b0, b0.clone().add(V(0, -40, -6)), V(b0.x, f.top + 30, b0.z - 10), low, V(rg.x, f.top - 80, low.z + 40), rg.clone().add(V(0, 40, 30))], 0xc9d6d8);
  // drop checker on the far end of the back glass, half way up: its reservoir green / blue / yellow
  const ud = f.T.L - 60, yd = f.wy * 0.62, pd = f.P(ud, yd, 22);
  kit.lathe('clear', [[0, 30], [8, 29], [13, 22], [15, 10], [15, 0], [14, -1]], pd, V(0, 1, 0), C.glass, 0.1, 24);
  kit.lathe('clear', [[0, 2], [13.5, 2], [13.5, 8], [10, 12], [0, 12]], pd, V(0, 1, 0), DROP_COLOURS[level ?? 'ok'], 0.62, 24);
  kit.tube('clear', [pd.clone().add(V(0, 30, 0)), pd.clone().add(V(0, 44, -6)), f.P(ud, yd + 44, 6)], 2.5, C.glass, 0.12, 8);
  sucker(f, ud, yd + 44, 6);
}

