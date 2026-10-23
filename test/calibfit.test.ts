// The calibration fit (scripts/calib-fit.mjs) on synthetic experts (scripts/calib-synth.mjs): a known shift must come back.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain node script, no types
import { fitRound } from '../scripts/calib-fit.mjs';
// @ts-expect-error plain node script, no types
import { EXPERTS, knownShift, recovery, synthAnswers } from '../scripts/calib-synth.mjs';
import ROUND from '../research/calib/round-1.json';

const round = ROUND as any, clean = EXPERTS.map((e: any) => ({ ...e, noise: 1e-4 }));
const focal = [...new Set(round.scenarios.map((s: any) => s.focal))] as string[];
const cls: Record<string, string> = Object.assign({}, ...round.scenarios.map((s: any) => s.cls));
/** Mean |log| error of the focal species' effective multipliers against the truth, and the same with no fit. */
function focalError(fit: any, truth: Record<string, number>) {
  let e = 0, z = 0;
  for (const id of focal) { const t = (truth.g ?? 0) + (truth['c:' + cls[id]] ?? 0) + (truth['d:' + id] ?? 0); e += Math.abs(Math.log(fit.species[id].mult) - t); z += Math.abs(t); }
  return { fit: e / focal.length, none: z / focal.length };
}

describe('calibration fit on synthetic experts', () => {
  it('recovers a global shift (water x0.9) and the experts\' biases', () => {
    const fit = fitRound(round, synthAnswers(round, { g: Math.log(0.9) }, clean));
    expect(Math.abs(Math.log(fit.g / 0.9))).toBeLessThan(0.03);
    for (const e of clean) expect(Math.abs(fit.bias[e.expert] - e.bias), e.expert).toBeLessThan(0.03);
  });
  it('recovers a mixed shift with noisy experts better than no fit, on every seed', () => {
    const truth = knownShift(round);
    for (const seed of [1, 2, 3]) {
      const fit = fitRound(round, synthAnswers(round, truth, EXPERTS, seed)), f = focalError(fit, truth), all = recovery(round, fit, truth);
      expect(f.fit, `seed ${seed}`).toBeLessThan(0.65 * f.none);
      expect(all.err, `seed ${seed}`).toBeLessThan(all.none);
      expect(fit.error.fitAfter, `seed ${seed}`).toBeLessThan(fit.error.fitBefore);
      expect(fit.solver.gnorm).toBeLessThan(1e-3);
    }
  });
  it('moves nothing much when the experts agree with the engine', () => {
    const fit = fitRound(round, synthAnswers(round, {}, EXPERTS, 5));
    expect(Math.abs(Math.log(fit.g))).toBeLessThan(0.05);
    for (const [id, v] of Object.entries(fit.species) as [string, any][]) expect(Math.abs(Math.log(v.mult)), id).toBeLessThan(0.12);
    expect(fit.capped).toEqual([]);
  });
  it('estimates the experts\' own noise from the repeats', () => {
    const fit = fitRound(round, synthAnswers(round, {}, EXPERTS, 6));
    expect(fit.noise.pairs).toBeGreaterThanOrEqual(10);
    expect(fit.noise.s).toBeGreaterThan(0.06); expect(fit.noise.s).toBeLessThan(0.25);
  });
});

// @ts-expect-error plain node script, no types
import { review, rowsOf } from '../scripts/calib-review.mjs';
describe('calibration batch review', () => {
  it('reads a known shift back per pattern and leaves an engine-agreeing expert at no change', () => {
    const truth = { g: Math.log(0.9) }, f = synthAnswers(round, truth, [{ expert: 'x', bias: 0, noise: 1e-4 }])[0];
    const fixes = rowsOf(round, f).filter((r: any) => r.fix).map((r: any) => r.fix).sort((a: number, b: number) => a - b);
    expect(Math.abs(Math.log(fixes[fixes.length >> 1] / 0.9))).toBeLessThan(0.04);
    const md = review(round, synthAnswers(round, {}, [{ expert: 'y', bias: 0, noise: 1e-4 }])[0]);
    expect(md).toMatch(/Median fix [+-]?[0-3] %/);
    expect(md).not.toMatch(/\*\*flag\*\*/);
  });
});

// @ts-expect-error plain node script, no types
import { combine, fitRound as fit2, rowsOf as rows2 } from '../scripts/calib-fit.mjs';
import ROUND2 from '../research/calib/round-2.json';
import NGR from '../research/calib/answers/round-1-ngr.json';
describe('calibration fit, survey 2', () => {
  const r2 = ROUND2 as any, clean2 = EXPERTS.map((e: any) => ({ ...e, noise: 1e-4 }));
  it('reads a floor-only shift from the floor answers and leaves water alone', () => {
    const f = fit2(r2, synthAnswers(r2, { f: Math.log(1.2) }, clean2));
    expect(Math.abs(Math.log(f.f / 1.2))).toBeLessThan(0.05);
    expect(Math.abs(Math.log(f.g))).toBeLessThan(0.05);
  });
  it('reads a water-only shift from the water answers and leaves the floor alone', () => {
    const f = fit2(r2, synthAnswers(r2, { g: Math.log(0.85) }, clean2));
    expect(Math.abs(Math.log(f.g / 0.85))).toBeLessThan(0.05);
    expect(Math.abs(Math.log(f.f))).toBeLessThan(0.05);
  });
  it('leaves out tanks the expert calls too small or limited by habitat, and weights ambiguous counts half', () => {
    const [file] = synthAnswers(r2, {}, [{ expert: 'z', bias: 0, noise: 1e-4 }]);
    file.answers[0].limits = 'not-room';
    file.answers[1].bigEnough[file.answers[1].focal ? Object.keys(file.answers[1].bigEnough)[0] : ''] = false;
    const { rows, skipped } = rows2(r2, [file]);
    expect(rows.some((r: any) => r.s.id === file.answers[0].id || r.s.id === file.answers[1].id)).toBe(false);
    expect(skipped.length).toBe(2);
    for (const r of rows.filter((x: any) => x.ambiguous)) expect(r.w).toBeLessThan(1);
  });
  it('fits round 1 and round 2 together, with a round-1 file carried inside a round-2 export', () => {
    const [f2] = synthAnswers(r2, {}, [{ expert: 'ngr', bias: 0, noise: 1e-4 }]);
    const { round: both, files } = combine([round, r2], [{ ...f2, carried: [NGR, NGR] }]);
    expect(both.scenarios.length).toBe(round.scenarios.length + r2.scenarios.length);
    expect(files.length).toBe(2);
    const f = fit2(both, files);
    expect(f.rows).toBeGreaterThan(50);
    expect(f.skipped.some((x: string) => x.includes('1:f5'))).toBe(false); // f5 has no valid counts: nothing to skip, nothing fitted
  });
});
