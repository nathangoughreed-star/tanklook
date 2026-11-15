// A simple SwimField for testing the swim sim without the real collision world: a glass box tank with a flat substrate,
// boxes (rocks / wood) and vertical cylinders (plant clumps) as obstacles. Analytic distances and gradients.
import type { SwimField, V3 } from '../src/scene/swimTypes';

export interface BoxObs { kind: 'box'; min: V3; max: V3 }
export interface CylObs { kind: 'cyl'; x: number; z: number; r: number; y0: number; y1: number }
export type Obs = BoxObs | CylObs;

export function boxTank(L: number, D: number, waterTop: number, ground: number, obs: Obs[]): SwimField {
  return {
    min: [0, 0, -D], max: [L, waterTop, 0], waterTop,
    floorAt: () => ground,
    clearance(x, y, z, grad, cap = 1e9) {
      let best = cap, gx = 0, gy = 0, gz = 0;
      const set = (d: number, a: number, b: number, c: number) => { if (d < best) { best = d; gx = a; gy = b; gz = c; } };
      set(x, 1, 0, 0); set(L - x, -1, 0, 0); set(z + D, 0, 0, 1); set(-z, 0, 0, -1);
      set(y - ground, 0, 1, 0); set(waterTop - y, 0, -1, 0);
      for (const o of obs) {
        if (o.kind === 'box') {
          const cx = Math.max(o.min[0], Math.min(x, o.max[0])), cy = Math.max(o.min[1], Math.min(y, o.max[1])), cz = Math.max(o.min[2], Math.min(z, o.max[2]));
          const dx = x - cx, dy = y - cy, dz = z - cz, d = Math.hypot(dx, dy, dz);
          if (d > 0) set(d, dx / d, dy / d, dz / d);
          else { // inside: nearest face
            const f: [number, number, number, number][] = [[x - o.min[0], -1, 0, 0], [o.max[0] - x, 1, 0, 0], [y - o.min[1], 0, -1, 0], [o.max[1] - y, 0, 1, 0], [z - o.min[2], 0, 0, -1], [o.max[2] - z, 0, 0, 1]];
            let b = f[0]; for (const q of f) if (q[0] < b[0]) b = q;
            set(-b[0], b[1], b[2], b[3]);
          }
        } else {
          const dx = x - o.x, dz = z - o.z, rr = Math.hypot(dx, dz), ex = rr - o.r, ey = y < o.y0 ? o.y0 - y : y > o.y1 ? y - o.y1 : 0;
          const sy = y < o.y0 ? -1 : 1;
          if (ey === 0 && ex < 0) { // inside: out through the side or the cap
            const dTop = Math.min(y - o.y0, o.y1 - y);
            if (-ex < dTop) set(ex, rr > 0 ? dx / rr : 1, 0, rr > 0 ? dz / rr : 0); else set(-dTop, 0, y - o.y0 < o.y1 - y ? -1 : 1, 0);
          } else {
            const ox = Math.max(ex, 0), d = Math.hypot(ox, ey);
            if (d > 0) set(d, rr > 0 ? dx / rr * ox / d : 0, ey > 0 ? sy * ey / d : 0, rr > 0 ? dz / rr * ox / d : 0);
          }
        }
      }
      if (grad) { grad[0] = gx; grad[1] = gy; grad[2] = gz; }
      return best;
    },
  };
}
