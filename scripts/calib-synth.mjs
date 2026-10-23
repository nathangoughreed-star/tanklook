// Synthetic experts for the calibration fit (research/expert-calibration.md section 6): answers a round as experts would if the
// truth were today's factors times known multipliers, each expert with a bias and noise. The fit must recover the multipliers.
// Run: node scripts/calib-synth.mjs research/calib/round-1.json  (writes research/calib/answers-synth/*.json, fits, prints recovery)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fitRound, layout, readLog, report } from './calib-fit.mjs';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/** The known shift used by the check: water reads 10 % low, tiny fish 15 % more, the most-asked species 20 % more, floor 10 % more. */
export function knownShift(round) {
  const L = layout(round), count = {};
  for (const s of round.scenarios) for (const [id] of s.stock) count[id] = (count[id] ?? 0) + 1;
  const top = Object.entries(count).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
  return { g: Math.log(0.9), f: Math.log(1.1), 'c:tiny': Math.log(1.15), ['d:' + top]: Math.log(1.2), top };
}
export const EXPERTS = [{ expert: 'synth-A', bias: -0.08, noise: 0.12 }, { expert: 'synth-B', bias: -0.03, noise: 0.12 }, { expert: 'synth-C', bias: 0, noise: 0.12 },
  { expert: 'synth-D', bias: 0.04, noise: 0.12 }, { expert: 'synth-E', bias: 0.07, noise: 0.12 }];

/** Answer files for `round` under the true log multipliers `truth` (names as in layout(): g, f, c:<class>, d:<species>). */
export function synthAnswers(round, truth, experts = EXPERTS, seed = 1) {
  const L = layout(round), th = L.names.map(n => truth[n] ?? 0), r = rng(seed);
  const best = (s, target, eps) => {
    let bn = 1, bd = Infinity;
    for (let n = 1; n < s.table.length; n++) { const d = Math.abs(readLog(L, s, n, th).v + eps - target); if (d < bd) { bd = d; bn = n; } }
    return bn;
  };
  return experts.map(e => ({
    round: round.round, expert: e.expert, made: '2026-10-23', synthetic: true,
    answers: round.scenarios.map(s => {
      const shown = s.stock.find(x => x[0] === s.focal)[1], p = readLog(L, s, shown, th).v + e.bias + e.noise * gauss(r);
      const together = s.kind === 'single' ? null : ({ ok: 'yes', concern: 'caution', high: 'no' })[s.gate];
      return { id: s.id, band: p < Math.log(round.ideal) ? 0 : p < Math.log(round.limit) ? 1 : 2,
        ideal: best(s, Math.log(round.ideal), e.bias + e.noise * gauss(r)), limit: best(s, Math.log(round.limit), e.bias + e.noise * gauss(r)), together };
    }),
  }));
}

/** Recovery of each species' effective multiplier (water x class x own) against the truth, over species with `min` answers or more. */
export function recovery(round, fit, truth, min = 3) {
  const L = layout(round), out = [];
  for (const id of L.species) {
    const t = Math.exp((truth.g ?? 0) + (truth['c:' + L.cls[id]] ?? 0) + (truth['d:' + id] ?? 0)), v = fit.species[id];
    if (v.answers >= min) out.push({ id, truth: t, fit: v.mult, err: Math.abs(Math.log(v.mult / t)), none: Math.abs(Math.log(t)), answers: v.answers });
  }
  const mean = k => out.reduce((a, x) => a + x[k] * x.answers, 0) / out.reduce((a, x) => a + x.answers, 0);
  return { rows: out, err: mean('err'), none: mean('none') };
}

if (process.argv[1]?.endsWith('calib-synth.mjs')) {
  const path = process.argv[2] ?? 'research/calib/round-1.json', round = JSON.parse(readFileSync(path, 'utf8'));
  const truth = knownShift(round), files = synthAnswers(round, truth);
  mkdirSync('research/calib/answers-synth', { recursive: true });
  for (const f of files) writeFileSync(`research/calib/answers-synth/round-${round.round}-${f.expert}.json`, JSON.stringify(f, null, 1) + '\n');
  const fit = fitRound(round, files), rec = recovery(round, fit, truth);
  writeFileSync(`research/calib/fit-round-${round.round}-synth.md`, `Synthetic check: truth water x0.9, floor x1.1, tiny +15 %, ${truth.top} +20 %; 5 synthetic experts (bias -8..+7 %, noise 0.12).\n\n` +
    `Effective species multiplier error (answer-weighted mean |log|): ${rec.err.toFixed(3)}, vs ${rec.none.toFixed(3)} with no fit.\n\n` + report(fit));
  console.log(`truth: water x0.9, floor x1.1, tiny x1.15, ${truth.top} x1.2 | fit: water x${fit.g}, floor x${fit.f}, tiny x${fit.class.tiny}, ${truth.top} x${fit.species[truth.top].mult} total`);
  console.log(`species multiplier error ${rec.err.toFixed(3)} (no fit ${rec.none.toFixed(3)}); held-out ${fit.error.heldBefore.toFixed(3)} -> ${fit.error.heldAfter.toFixed(3)}; disagreement ${fit.error.disagreement.toFixed(3)}; capped ${fit.capped.join(',') || 'none'}`);
}
