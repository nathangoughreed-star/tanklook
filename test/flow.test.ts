// The outlets' current (scene/flow.ts) and how the roaming fish answer it (swimSim: drift, effort, facing into it).
import { describe, expect, it } from 'vitest';
import { flowAt, outletJets, strongest } from '../src/scene/flow';
import { makeSwimSim } from './quietSim';
import { cast, field } from './swimCast';

describe('flow', () => {
  const at: [number, number, number] = [100, 300, -50], fwd: [number, number, number] = [0, 0, 1];
  it('is strong near the outlet, weak far from it, nothing behind it, and runs along the jet', () => {
    const j = outletJets('nozzle', 200, at, fwd), v = [0, 0, 0];
    const near = flowAt(j, 100, 300, 0, v); expect(v[2]).toBeGreaterThan(0); expect(Math.abs(v[0]) + Math.abs(v[1])).toBeLessThan(1e-9);
    const far = flowAt(j, 100, 300, 400), side = flowAt(j, 400, 300, 200), behind = flowAt(j, 100, 300, -200);
    expect(near).toBeGreaterThan(far * 3); expect(far).toBeGreaterThan(side); expect(behind).toBeLessThan(1e-3);
  });
  it('a spray bar spreads the same flow wider and gentler than a nozzle', () => {
    const nz = outletJets('nozzle', 200, at, fwd), sb = outletJets('spraybar', 200, at, fwd, [1, 0, 0], 400), ly = outletJets('lily', 200, at, fwd);
    expect(flowAt(sb, 100, 300, 150)).toBeLessThan(flowAt(ly, 100, 300, 150));
    expect(flowAt(ly, 100, 300, 150)).toBeLessThan(flowAt(nz, 100, 300, 150));
    expect(flowAt(sb, 260, 300, 150)).toBeGreaterThan(flowAt(nz, 260, 300, 150)); // off to the side, the bar still moves water
  });
  it('keeps the strongest jets when there are too many', () => {
    const js = [...outletJets('spraybar', 50, at, fwd, [1, 0, 0], 500), ...outletJets('nozzle', 300, at, fwd)];
    expect(strongest(js, 1)[0].r0).toBe(7);
  });
});

describe('swimSim in a current', () => {
  it('fish stay out of solids, beat harder in the jet, and are not all swept into one end', () => {
    const fish = cast(), jets = outletJets('nozzle', 400, [field.min[0] + 30, field.waterTop - 60, (field.min[2] + field.max[2]) / 2], [1, 0, 0]);
    const F = Object.assign(Object.create(field), { flow: (x: number, y: number, z: number, out: [number, number, number]) => flowAt(jets, x, y, z, out) });
    const sim = makeSwimSim(fish, F, 7), dt = 1 / 30, still = makeSwimSim(fish, field, 7);
    let minRatio = 1e9, beatMax = 1, xs = 0, xs0 = 0, n = 0;
    for (let s = 0; s < 120 / dt; s++) {
      sim.step(dt); still.step(dt);
      for (const f of fish) {
        const p = sim.pose(f.id)!, q = still.pose(f.id)!;
        expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
        minRatio = Math.min(minRatio, field.clearance(p.x, p.y, p.z, undefined, 1e6) / (f.len * 0.12));
        beatMax = Math.max(beatMax, p.beat ?? 1);
        if (f.zone !== 'bottom') { xs += p.x; xs0 += q.x; n++; }
      }
    }
    const L = field.max[0] - field.min[0];
    console.log(`flow: minClearance/radius=${minRatio.toFixed(3)} beatMax=${beatMax.toFixed(2)} meanX=${(xs / n).toFixed(0)} stillMeanX=${(xs0 / n).toFixed(0)} L=${L.toFixed(0)}`);
    expect(minRatio).toBeGreaterThanOrEqual(0.99);
    expect(beatMax).toBeGreaterThan(1.2);
    expect(xs / n - xs0 / n).toBeLessThan(L * 0.25); // pushed downstream a little, not piled against the far glass
  });
});
