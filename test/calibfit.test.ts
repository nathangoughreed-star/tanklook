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
