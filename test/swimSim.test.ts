import { describe, expect, it } from 'vitest';
import { makeSwimSim } from '../src/scene/swimSim';
import { cast, field } from './swimCast';

describe('swimSim', () => {
  it('no fish ends a step inside an obstacle; school bounded; bottom dwellers hug the floor (600 s, 40 fish)', () => {
    const fish = cast(), sim = makeSwimSim(fish, field, 7), dt = 1 / 30;
    expect(fish.length).toBe(40);
    let minRatio = 1e9, maxSchool = 0, maxShoal = 0, bottomN = 0, bottomLow = 0, bottomMax = 0, moved = 0;
    const last = fish.map(f => ({ ...sim.pose(f.id)! }));
    for (let s = 0; s < 600 / dt; s++) {
      sim.step(dt);
      for (const f of fish) {
        const p = sim.pose(f.id)!;
        const c = field.clearance(p.x, p.y, p.z, undefined, 1e6);
        minRatio = Math.min(minRatio, c / (f.len * 0.12));
        expect(Number.isFinite(p.x + p.y + p.z + p.yaw + p.pitch + p.roll)).toBe(true);
        expect(Math.abs(p.pitch)).toBeLessThanOrEqual(30);
        if (f.zone === 'bottom') { const h = p.y - field.floorAt(p.x, p.z); bottomN++; if (h < f.len * 0.5) bottomLow++; bottomMax = Math.max(bottomMax, h); }
      }
      if (s > 60 / dt && s % 30 === 0) {
        for (const [a, b, set] of [[0, 12, 0], [12, 20, 1]] as const) {
          let cx = 0, cy = 0, cz = 0; for (let i = a; i < b; i++) { const p = sim.pose(fish[i].id)!; cx += p.x; cy += p.y; cz += p.z; }
          cx /= b - a; cy /= b - a; cz /= b - a;
          let mx = 0; for (let i = a; i < b; i++) { const p = sim.pose(fish[i].id)!; mx = Math.max(mx, Math.hypot(p.x - cx, p.y - cy, p.z - cz)); }
          if (set === 0) maxSchool = Math.max(maxSchool, mx); else maxShoal = Math.max(maxShoal, mx);
        }
      }
    }
    for (let i = 0; i < fish.length; i++) { const p = sim.pose(fish[i].id)!; moved += Math.hypot(p.x - last[i].x, p.z - last[i].z) > 0 ? 1 : 0; }
    console.log(`minClearance/radius=${minRatio.toFixed(3)} schoolMaxDist=${maxSchool.toFixed(0)} shoalMaxDist=${maxShoal.toFixed(0)} bottomLow=${(bottomLow / bottomN * 100).toFixed(1)}% bottomMaxH=${bottomMax.toFixed(0)}`);
    expect(minRatio).toBeGreaterThanOrEqual(0.99);
    expect(maxSchool).toBeLessThan(420);
    expect(maxShoal).toBeLessThan(550);
    expect(bottomLow / bottomN).toBeGreaterThan(0.97);
    expect(bottomMax).toBeLessThan(200);
    expect(moved).toBe(40);
  });

  it('is deterministic for a seed, and reset restores the placed pose', () => {
    const fish = cast(), a = makeSwimSim(fish, field, 3), b = makeSwimSim(fish, field, 3);
    for (let s = 0; s < 600; s++) { a.step(1 / 30); b.step(1 / 30); }
    for (const f of fish) expect(a.pose(f.id)).toEqual(b.pose(f.id));
    a.reset([fish[0].id]);
    expect(a.pose(fish[0].id)).toEqual({ x: fish[0].home.x, y: fish[0].home.y, z: fish[0].home.z, yaw: 20, pitch: 0, roll: 0 });
    expect(a.pose(999)).toBeNull();
    a.reset();
    for (const f of fish) expect(a.pose(f.id)!.x).toBe(f.home.x);
  });

  it('speeds stay in a believable range (a few body lengths per second at most)', () => {
    const fish = cast(), sim = makeSwimSim(fish, field, 11), dt = 1 / 30;
    const prev = fish.map(f => ({ ...sim.pose(f.id)! })); let worst = 0, sum = 0, cnt = 0;
    for (let s = 0; s < 120 / dt; s++) { if (s === Math.round(5 / dt)) worst = 0;
      sim.step(dt);
      fish.forEach((f, i) => { const p = sim.pose(f.id)!; const v = Math.hypot(p.x - prev[i].x, p.y - prev[i].y, p.z - prev[i].z) / dt / f.len; worst = Math.max(worst, v); if (f.len === 40) { sum += v; cnt++; } prev[i] = { ...p }; });
    }
    console.log(`max speed ${worst.toFixed(2)} BL/s, danio mean ${(sum / cnt).toFixed(2)} BL/s`);
    expect(worst).toBeLessThan(5);
  });

  it('step cost for 60 fish', () => {
    const fish = cast(); while (fish.length < 60) { const f = fish[fish.length % 40]; fish.push({ ...f, id: fish.length + 1, group: f.group && { key: f.group.key + 'b', tight: f.group.tight } }); }
    const sim = makeSwimSim(fish, field, 5);
    for (let s = 0; s < 300; s++) sim.step(1 / 60);
    const t0 = performance.now(), N = 3000; for (let s = 0; s < N; s++) sim.step(1 / 60);
    const ms = (performance.now() - t0) / N;
    console.log(`step cost, 60 fish: ${ms.toFixed(3)} ms`);
    expect(ms).toBeLessThan(1);
  });
});
