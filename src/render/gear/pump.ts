// Air pump, airstone and powerhead / wavemaker. (render/gear3d.ts split per type, lane GM1, 2026-10-29: moved as is, no behaviour change).
import * as THREE from 'three';
import { type PumpProduct } from '../../data/gearCatalog';
import { clamp } from '../../scene/physics';
import { UP, V, along, hash, C, hexOr, Frame, Spot, lerp, line, overRim } from './common';

export function airPump(f: Frame, u: number, to: THREE.Vector3, bIn: number) {
  const { kit, t } = f, pu = -60, pb = 50;
  // on the floor at the back corner, beside the tank (a check valve on its line)
  const xs = f.side === 'left' ? -f.t - 90 : f.T.L + f.t + 90, z = f.P(0, 0, 0).z + pb;
  const pc = V(xs, f.floor + 30, z);
  kit.box('room', pc, 130, 60, 75, C.charcoal, 14, Math.PI / 2);
  for (const k of [-1, 1]) for (const j of [-1, 1]) kit.box('room', pc.clone().add(V(j * 26, -32, k * 50)), 14, 4, 14, C.black, 4);
  const nip = pc.clone().add(V(0, 30, -38));
  kit.rod('room', nip, nip.clone().add(V(0, 6, 0)), 3, C.grey);
  const route = overRim(f, u, to, bIn, f.H - 80, -t - 10);
  const last = route[route.length - 1];
  line(f, [...route, last.clone().add(V(0, -80, -10)), V(xs, f.floor + 80, z - 40), nip.clone().add(V(0, 6, 0))]);
  const cv = route[5]; kit.rod('room', cv.clone().add(V(0, -14, 0)), cv.clone().add(V(0, 14, 0)), 5, C.lightGrey); // check valve
  void pu;
}

export function airstone(f: Frame, sp: Spot) {
  const { kit } = f, b = Math.max(26, sp.b ?? 0), u = f.slot(sp.fixed ? sp.u : sp.u + 20, 44, 0, 40, 0, 52, sp.fixed), g = f.ground(u, b);
  kit.put('wet', new THREE.CylinderGeometry(12, 12, 38, 18, 4), C.stone, along(f.P(u, g + 10, b), f.along.clone().add(V(0, 0, 0.3)).normalize(), 0), 0, 0.3);
  bubbles(f, f.P(u, g + 22, b), f.wy, 26, 3);
  airPump(f, u, f.P(u, g + 14, b), b);
}

/** A rising column of bubbles from p to the surface: `n` per 100 mm, up to radius rmax, wandering a little as they rise. */
export function bubbles(f: Frame, p: THREE.Vector3, top: number, n: number, rmax: number) {
  const k = Math.max(1, Math.round(((top - p.y) / 100) * n));
  for (let i = 0; i < k; i++) {
    const y = p.y + ((i + hash(i, 1, 2) * 0.6) / k) * (top - p.y - 3), sway = 1 + (y - p.y) / 60;
    const r = rmax * (0.45 + 0.55 * hash(i, 3, 4)) * (0.8 + 0.25 * (y - p.y) / (top - p.y + 1));
    f.kit.ball('clear', V(p.x + (hash(i, 5, 6) - 0.5) * 2 * sway, y, p.z + (hash(i, 7, 8) - 0.5) * 2 * sway), r, C.water, 0.04, 1);
  }
}

/** A powerhead / wavemaker on the frame's glass at u, aimed into the tank and a little along it. A catalogue pump (lane GP) is drawn
 *  at its listed size (its longest side = the length from the mount to the cage, the middle one = the diameter) and its photo's colours. */
export function powerhead(f: Frame, sp: Spot, big: boolean, prod?: PumpProduct) {
  const dims = prod?.bodyMm ? [prod.bodyMm.w, prod.bodyMm.d, prod.bodyMm.h].sort((a, b) => b - a) : undefined;
  const mc = hexOr(prod?.colors.body, C.charcoal), cc = prod ? mc : C.black, hub = hexOr(prod?.colors.accent, C.grey);
  const { kit } = f, r = dims ? clamp(dims[1] / 2, 12, 45) : big ? 32 : 26, len = dims ? clamp((dims[0] - 10) / 1.5, 24, 150) : big ? 50 : 42, u = f.slot(sp.u, 2 * r + 6, 0, f.H, 0, len + 10, true);
  const y = lerp(f.ground(u, 30) + r + 30, f.wy - r - 20, sp.y ?? 0.7), p0 = f.P(u, y, 0);
  const dir = f.inward.clone().addScaledVector(f.along, f.wall === 'back' ? 0.12 : -0.12).normalize();
  // the magnet mount on the glass, the motor body, the cage with its bars and the propeller hub inside
  kit.put('wet', new THREE.CylinderGeometry(r * 0.85, r * 0.85, 10, 28), C.black, along(p0, dir, 5));
  kit.rod('wet', p0.clone().addScaledVector(dir, 10), p0.clone().addScaledVector(dir, 10 + len * 0.5), r, mc, { seg: 28 });
  const cg = p0.clone().addScaledVector(dir, 10 + len * 0.5), ce = p0.clone().addScaledVector(dir, 10 + len);
  kit.put('wet', new THREE.TorusGeometry(r - 1.5, 1.8, 6, 32), cc, along(ce, dir, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, o = V(Math.cos(a) * (r - 1.5), 0, Math.sin(a) * (r - 1.5)).applyQuaternion(q);
    kit.rod('wet', cg.clone().add(o), ce.clone().add(o), 1.4, cc, { seg: 5 });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2, o = V(Math.cos(a) * (r - 2), 0, Math.sin(a) * (r - 2)).applyQuaternion(q);
    kit.rod('wet', ce.clone().addScaledVector(o, -0.04), ce.clone().add(o), 1.2, C.black, { seg: 4 });
  }
  kit.rod('wet', cg, cg.clone().addScaledVector(dir, len * 0.3), r * 0.3, hub, { seg: 16, r2: r * 0.2 });
  // the cord, up the glass and over the rim
  kit.tube('room', overRim(f, u, p0.clone().addScaledVector(dir, 12).add(V(0, r * 0.7, 0)), 6, f.top + 30), 2.4, C.black, 0, 6);
}

