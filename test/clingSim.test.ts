import { describe, expect, it } from 'vitest';
import { makeClingSim, type ClingSpec } from '../src/scene/clingSim';
import { CLING } from '../src/scene/clingPace';
import { boxTank, type Obs } from './swimFieldDouble';

const L = 900, D = 450, GROUND = 30, IN = 25.4;
const OBS: Obs[] = [{ kind: 'box', min: [300, 0, -300], max: [420, 150, -200] }, { kind: 'cyl', x: 650, z: -150, r: 40, y0: 0, y1: 300 }];
const field = boxTank(L, D, 420, GROUND, OBS);
const spec = (id: number, sp: string, len: number, surf: 'floor' | 'pane', x: number, y: number, z: number, n: [number, number, number], h: [number, number, number], off = 2): ClingSpec => {
  const c = CLING[sp];
  return { id, len, off, creep: c.creepBL * len, dart: c.dartBL * len, dartEvery: c.dartEveryS, still: c.still, rect: true, home: { surf, x, y, z, n, h } };
};
const cast = () => [
  spec(1, 'oto', 33, 'floor', 100, GROUND + 2, -100, [0, 1, 0], [1, 0, 0]),
  spec(2, 'oto', 33, 'pane', 0 + 2, 200, -250, [1, 0, 0], [0, 0, 1]),            // on the left pane, heading along it
  spec(3, 'oto', 33, 'pane', 500, 180, -D + 2, [0, 0, 1], [1, 0, 0]),            // back pane
  spec(4, 'bristlenose', 125, 'floor', 500, GROUND + 6, -350, [0, 1, 0], [0, 0, 1]),
  spec(5, 'hillstream', 60, 'floor', 800, GROUND + 3, -400, [0, 1, 0], [-1, 0, 0]),
];
const rot = (q: { qx: number; qy: number; qz: number; qw: number }, v: [number, number, number]): [number, number, number] => { // q * v
  const { qx: x, qy: y, qz: z, qw: w } = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
};

describe('clingSim', () => {
  it('stays stuck to a surface belly-in (ground or pane), never in a rock, and now and then darts to another (900 s)', () => {
    const specs = cast(), sim = makeClingSim(specs, field, 11), dt = 1 / 30;
    let loose = 0, attached = 0, total = 0, darts = 0, wasFlying = specs.map(() => false);
    for (let s = 0; s < 900 / dt; s++) {
      sim.step(dt);
      specs.forEach((sp, i) => {
        const p = sim.pose(sp.id)!;
        expect(Number.isFinite(p.x + p.y + p.z + p.qw)).toBe(true);
        // distance to each surface along its normal, minus the offset
        const ds = [p.y - GROUND, p.x, L - p.x, p.z + D, -p.z].map(d => Math.abs(d - sp.off));
        const nr = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] as [number, number, number][];
        const k = ds.indexOf(Math.min(...ds)), on = ds[k] < 1.2, up = rot(p, [0, 1, 0]);
        total++;
        if (on) { attached++; const dn = up[0] * nr[k][0] + up[1] * nr[k][1] + up[2] * nr[k][2]; if (dn < 0.97) loose++; expect(dn, `fish ${sp.id} t=${(s * dt).toFixed(2)} surf ${k} pos ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)} up ${up.map(v => v.toFixed(2))}`).toBeGreaterThan(0.7); if (wasFlying[i]) darts++; wasFlying[i] = false; } else wasFlying[i] = true;
        for (const o of OBS) { // never inside a rock or plant
          if (o.kind === 'box') expect(p.x > o.min[0] && p.x < o.max[0] && p.z > o.min[2] && p.z < o.max[2] && p.y < o.max[1]).toBe(false);
          else expect(Math.hypot(p.x - o.x, p.z - o.z) > o.r || p.y > o.y1).toBe(true);
        }
      });
    }
    expect(attached / total).toBeGreaterThan(0.9);
    expect(darts).toBeGreaterThan(3);
    expect(loose / attached).toBeLessThan(0.02);
  });
  it('creeps slowly, mostly still; oto faster than a bristlenose', () => {
    const specs = cast(), sim = makeClingSim(specs, field, 4), dt = 1 / 30, dist = specs.map(() => 0), prev = specs.map(s => ({ ...sim.pose(s.id)! }));
    let still = 0, tot = 0;
    for (let s = 0; s < 600 / dt; s++) { sim.step(dt); specs.forEach((sp, i) => { const p = sim.pose(sp.id)!, d = Math.hypot(p.x - prev[i].x, p.y - prev[i].y, p.z - prev[i].z); if (d / dt < 3 * sp.len) { dist[i] += d; tot++; if (d / dt < 0.02 * sp.len) still++; } prev[i] = { ...p }; }); }
    const mean = dist.map(d => d / 600 / IN);
    expect(mean[0]).toBeLessThan(0.3); expect(mean[3]).toBeLessThan(0.15); expect(mean[3]).toBeLessThan(mean[0] + 0.1);
    expect(still / tot).toBeGreaterThan(0.4); // creep only: darts excluded above, so this is the share of time held still
  });
  it('is deterministic and reset restores the placed spot', () => {
    const specs = cast(), a = makeClingSim(specs, field, 3), b = makeClingSim(specs, field, 3);
    for (let s = 0; s < 1500; s++) { a.step(1 / 30); b.step(1 / 30); }
    for (const sp of specs) expect(a.pose(sp.id)).toEqual(b.pose(sp.id));
    a.reset(); for (const sp of specs) { const p = a.pose(sp.id)!; expect([p.x, p.y, p.z]).toEqual([sp.home.x, sp.home.y, sp.home.z]); }
  });
});
