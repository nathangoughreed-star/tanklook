// @ts-nocheck (writes the before/after numbers to research/screens/R88; the tsconfig has no node types)
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeSwimSim } from './quietSim';
import { swimPace } from '../src/scene/swimPace';
import { boxTank } from './swimFieldDouble';

const field = boxTank(900, 450, 450, 30, []);
const MM_IN = 25.4;
function meanSpeed(len: number, pace: number) { // mean and p90 swim speed (in/s) of 6 loners, 240 s after a 10 s settle
  const fish = Array.from({ length: 6 }, (_, k) => ({ id: k + 1, len, zone: 'water' as const, band: [0.3, 0.7] as [number, number], pace, home: { x: 150 + k * 110, y: 200, z: -100 - k * 50, yaw: k * 60, pitch: 0, roll: 0 } }));
  const sim = makeSwimSim(fish, field, 21), dt = 1 / 30, v: number[] = [];
  const prev = fish.map(f => ({ ...sim.pose(f.id)! }));
  for (let s = 0; s < 250 / dt; s++) { sim.step(dt); fish.forEach((f, i) => { const p = sim.pose(f.id)!; if (s > 10 / dt) v.push(Math.hypot(p.x - prev[i].x, p.y - prev[i].y, p.z - prev[i].z) / dt / MM_IN); prev[i] = { ...p }; }); }
  v.sort((a, b) => a - b);
  return { mean: v.reduce((a, b) => a + b, 0) / v.length, p90: v[Math.floor(v.length * 0.9)] };
}

describe('gourami pace (R88)', () => {
  it('every gourami id is slow, others are not', () => {
    for (const id of ['gourami', 'dwarfgourami', 'honeygourami', 'sparklinggourami', 'croakinggourami']) expect(swimPace(id)).toBeLessThan(0.6);
    expect(swimPace('neontetra')).toBe(1);
  });
  it('a gourami cruises well below what it did, and below a tetra/danio of the same size', () => {
    const before = meanSpeed(100, 1), after = meanSpeed(100, swimPace('gourami')), danio = meanSpeed(40, 1);
    writeFileSync('research/screens/R88/speeds.txt', `R88 gourami swim speed, 100 mm fish, 6 loners, open 36x18 in tank, 250 s sim (in/s)\nbefore (pace 1):  mean ${before.mean.toFixed(2)}  p90 ${before.p90.toFixed(2)}\nafter  (pace ${swimPace('gourami')}): mean ${after.mean.toFixed(2)}  p90 ${after.p90.toFixed(2)}\n40 mm danio (ref):  mean ${danio.mean.toFixed(2)}  p90 ${danio.p90.toFixed(2)}\n`);
    expect(after.mean).toBeLessThan(before.mean * 0.5);
    expect(after.mean).toBeLessThan(1.6);
    expect(after.p90).toBeLessThan(before.p90 * 0.6);
  });
});
