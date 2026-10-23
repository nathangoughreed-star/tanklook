// Expert calibration fit (research/expert-calibration.md section 4). Plain node, no dependencies, deterministic.
// Reads a round (research/calib/round-N.json, from GEN_CALIB=1 npx vitest run test/calib.test.ts) and the experts' answer files
// (the survey's "Export answers"), fits log multipliers on today's space factors (global water g, global floor f, per class c_k,
// per species d_j) plus a bias per expert, and writes research/calib/fit-round-N.{json,md}.
// Run: node scripts/calib-fit.mjs research/calib/round-1.json research/calib/answers/*.json
import { readFileSync, writeFileSync } from 'node:fs';

// prior sd of each log multiplier (0 = today's value). Species 0.10, classes 0.15: on synthetic rounds (scripts/calib-synth.mjs, 4 seeds)
// a species prior of 0.25 let a tankmate held at one count trade off against the focal species and recovered worse than no fit;
// 0.10 halved the focal species' error (0.034 vs 0.074 unfitted) and lowered the held-out error on every seed.
export const PRIOR = { g: 0.3, f: 0.2, c: 0.15, d: 0.1, b: 0.3 };
export const CAP = Math.log(1.25); // most a parameter may move in one round
const SOFT_K = 50;
const S_FLOOR = 0.10, S_DEFAULT = 0.2, BAND_K = 0.55; // noise floor, noise before any repeats, logistic scale per unit of noise

/** The parameter vector's layout for a round: names and the species / class index of each. */
export function layout(round) {
  const species = [...new Set(round.scenarios.flatMap(s => s.stock.map(x => x[0])))].sort();
  const cls = {};
  for (const s of round.scenarios) Object.assign(cls, s.cls);
  const classes = [...new Set(species.map(id => cls[id]))].sort();
  const names = ['g', 'f', ...classes.map(k => 'c:' + k), ...species.map(id => 'd:' + id)];
  const at = Object.fromEntries(names.map((n, i) => [n, i]));
  return { species, classes, cls, names, at, n: names.length };
}

/** log reading of tank s at focal count n under theta, and its gradient (sparse: [index, value][]). Ranks held at today's order. */
export function readLog(L, s, n, th) {
  const row = s.table[Math.max(0, Math.min(n, s.table.length - 1))];
  let W = 0;
  const parts = [];
  for (const [id, w] of Object.entries(row.water)) {
    if (!(w > 0)) continue;
    const ic = L.at['c:' + L.cls[id]], id_ = L.at['d:' + id], m = Math.exp(th[0] + th[ic] + th[id_]);
    W += w * m; parts.push([ic, id_, w * m]);
  }
  const F = row.floor * Math.exp(th[1]);
  if (!(W > 0) && !(F > 0)) return { v: -Infinity, grad: [] };
  // the engine takes the larger of water and floor; a sharp smooth max (log-sum-exp, SOFT_K) keeps the gradient continuous where they
  // swap (a hard max left BFGS stalled on that kink); it reads at most log(2) / SOFT_K = 1.4 % above the engine, only where they are equal
  const lW = W > 0 ? Math.log(W) : -Infinity, lF = F > 0 ? Math.log(F) : -Infinity, m = Math.max(lW, lF);
  const v = m + Math.log(Math.exp(SOFT_K * (lW - m)) + Math.exp(SOFT_K * (lF - m))) / SOFT_K, pW = Math.exp(SOFT_K * (lW - v)), pF = 1 - pW;
  const grad = [[0, pW], [1, pF]];
  for (const [ic, id_, x] of parts) { grad.push([ic, pW * x / W]); grad.push([id_, pW * x / W]); }
  return { v, grad };
}

const sig = z => 1 / (1 + Math.exp(-z));
const shownOf = s => s.stock.find(x => x[0] === s.focal)[1];

/** Answer rows the fit uses: counts (ideal -> 75, limit -> 100) and bands, each tied to its expert and tank. */
export function rowsOf(round, files) {
  const byId = Object.fromEntries(round.scenarios.map(s => [s.id, s]));
  const rows = [], skipped = [];
  for (const f of files) for (const a of f.answers) {
    const s = byId[a.id];
    if (!s) { skipped.push(`${f.expert} ${a.id}: no such tank`); continue; }
    for (const [key, anchor] of [['ideal', round.ideal], ['limit', round.limit]]) {
      const n = a[key];
      if (n == null || n === '') continue;
      if (n < 1 || n >= s.table.length) { skipped.push(`${f.expert} ${a.id} ${key} ${n}: outside the table (0..${s.table.length - 1})`); continue; }
      rows.push({ type: 'count', key, expert: f.expert, s, n: Math.round(n), anchor: Math.log(anchor) });
    }
    if (a.band != null) rows.push({ type: 'band', expert: f.expert, s, n: shownOf(s), y: a.band, cuts: [Math.log(round.ideal), Math.log(round.limit)] });
  }
  return { rows, skipped };
}

/** Rounding of a count answer, as extra variance: the log step between neighbouring counts, squared, over 12. */
function roundVar(L, s, n) {
  const z = new Array(L.n).fill(0), a = readLog(L, s, Math.max(1, n - 1), z).v, b = readLog(L, s, n + 1, z).v;
  const step = Number.isFinite(a) && Number.isFinite(b) ? (b - a) / 2 : 0.3;
  return step * step / 12;
}

/** Within-expert noise from the repeats: sd of the difference of a repeat's log implied reading and its original's, / sqrt 2. */
export function repeatNoise(L, round, files) {
  const diffs = [], z = new Array(L.n).fill(0);
  const byId = Object.fromEntries(round.scenarios.map(s => [s.id, s]));
  for (const f of files) {
    const ans = Object.fromEntries(f.answers.map(a => [a.id, a]));
    for (const s of round.scenarios.filter(x => x.role === 'repeat')) {
      const a = ans[s.id], o = ans[s.of];
      if (!a || !o) continue;
      for (const k of ['ideal', 'limit']) if (a[k] >= 1 && o[k] >= 1) diffs.push(readLog(L, s, a[k], z).v - readLog(L, byId[s.of], o[k], z).v);
    }
  }
  if (diffs.length < 2) return { s: S_DEFAULT, pairs: diffs.length };
  const sd = Math.sqrt(diffs.reduce((a, d) => a + d * d, 0) / diffs.length) / Math.SQRT2;
  return { s: Math.max(S_FLOOR, sd), pairs: diffs.length };
}

/** Negative log posterior and its gradient over [theta..., bias per expert...]. Anchor tanks are left out (held out). */
function objective(L, rows, experts, s, prior) {
  const nb = experts.length, eAt = Object.fromEntries(experts.map((e, i) => [e, L.n + i]));
  const sd = L.names.map(n => n === 'g' ? prior.g : n === 'f' ? prior.f : n.startsWith('c:') ? prior.c : prior.d).concat(experts.map(() => prior.b));
  const fit = rows.filter(r => r.s.role !== 'anchor');
  for (const r of fit) if (r.type === 'count') r.v = s * s + roundVar(L, r.s, r.n);
  return x => {
    let f = 0;
    const g = new Array(x.length).fill(0);
    for (let i = 0; i < x.length; i++) { f += x[i] * x[i] / (2 * sd[i] * sd[i]); g[i] += x[i] / (sd[i] * sd[i]); }
    // the experts' mean bias is 0: their average sets the scale (a stiff penalty, not a hard constraint)
    if (nb > 1) { let sb = 0; for (let i = 0; i < nb; i++) sb += x[L.n + i]; f += 50 * sb * sb; for (let i = 0; i < nb; i++) g[L.n + i] += 100 * sb; }
    else g[L.n] = 0, x[L.n] = 0;
    for (const r of fit) {
      const { v, grad } = readLog(L, r.s, r.n, x), ib = eAt[r.expert], b = nb > 1 ? x[ib] : 0;
      if (!Number.isFinite(v)) continue;
      let dL;
      if (r.type === 'count') { const res = v + b - r.anchor; f += res * res / (2 * r.v); dL = res / r.v; }
      else {
        const sc = s * BAND_K, s1 = sig((r.cuts[0] - v - b) / sc), s2 = sig((r.cuts[1] - v - b) / sc);
        if (r.y === 0) { f -= Math.log(Math.max(1e-12, s1)); dL = (1 - s1) / sc; }
        else if (r.y === 2) { f -= Math.log(Math.max(1e-12, 1 - s2)); dL = -s2 / sc; }
        else { const p = Math.max(1e-12, s2 - s1); f -= Math.log(p); dL = (s2 * (1 - s2) - s1 * (1 - s1)) / p / sc; }
      }
      for (const [i, d] of grad) g[i] += dL * d;
      if (nb > 1) g[ib] += dL;
    }
    return { f, g };
  };
}

/** BFGS with a backtracking line search. */
export function bfgs(fg, x0, iters = Number(process.env.CALIB_ITERS ?? 400)) {
  let x = x0.slice(), { f, g } = fg(x);
  const n = x.length;
  let H = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  let it = 0, stalls = 0;
  for (; it < iters; it++) {
    const p = H.map(row => -row.reduce((a, h, j) => a + h * g[j], 0));
    let t = 1, xn, r;
    const slope = p.reduce((a, pi, i) => a + pi * g[i], 0);
    if (slope >= 0) { H = H.map((row, i) => row.map((_, j) => i === j ? 1 : 0)); continue; }
    for (;;) { xn = x.map((xi, i) => xi + t * p[i]); r = fg(xn); if (r.f <= f + 1e-4 * t * slope || t < 1e-10) break; t /= 2; }
    // a stalled step (a kink where water and floor swap, or a stale curvature): restart from steepest descent; twice in a row ends it
    if (!(r.f < f)) { if (++stalls > 1) break; H = H.map((row, i) => row.map((_, j) => i === j ? 1 : 0)); continue; }
    stalls = 0;
    const s = xn.map((v, i) => v - x[i]), y = r.g.map((v, i) => v - g[i]), sy = s.reduce((a, v, i) => a + v * y[i], 0);
    x = xn; f = r.f; g = r.g;
    if (Math.sqrt(g.reduce((a, v) => a + v * v, 0)) < 1e-7) break;
    if (sy > 1e-12) {
      const Hy = H.map(row => row.reduce((a, h, j) => a + h * y[j], 0)), yHy = y.reduce((a, v, i) => a + v * Hy[i], 0);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) H[i][j] += ((sy + yHy) * s[i] * s[j]) / (sy * sy) - (Hy[i] * s[j] + s[i] * Hy[j]) / sy;
    }
  }
  return { x, f, it, gnorm: Math.sqrt(g.reduce((a, v) => a + v * v, 0)) };
}

/** rms of count residuals (log scale) on the rows given, under theta and the fitted biases. */
function rms(L, rows, th, bias) {
  const r = rows.filter(x => x.type === 'count').map(x => readLog(L, x.s, x.n, th).v + (bias[x.expert] ?? 0) - x.anchor).filter(Number.isFinite);
  return r.length ? Math.sqrt(r.reduce((a, v) => a + v * v, 0) / r.length) : NaN;
}

/** Inter-expert disagreement: sd, across experts on the same tank and question, of the bias-free log reading at their counts. */
function disagreement(L, rows, bias) {
  const z = new Array(L.n).fill(0), by = new Map();
  for (const r of rows) if (r.type === 'count') {
    const key = `${r.s.of ?? r.s.id}:${r.key}`; // a repeat pools with its original
    const v = readLog(L, r.s, r.n, z).v + (bias[r.expert] ?? 0);
    if (Number.isFinite(v)) by.set(key, [...(by.get(key) ?? []), v]);
  }
  let ss = 0, df = 0;
  for (const vs of by.values()) if (vs.length > 1) { const m = vs.reduce((a, b) => a + b, 0) / vs.length; ss += vs.reduce((a, v) => a + (v - m) ** 2, 0); df += vs.length - 1; }
  return df ? Math.sqrt(ss / df) : NaN;
}

/** The whole fit: returns multipliers, biases, errors and the tables the report shows. */
export function fitRound(round, files, prior = PRIOR) {
  const L = layout(round), experts = [...new Set(files.map(f => f.expert))].sort();
  const { rows, skipped } = rowsOf(round, files), noise = repeatNoise(L, round, files);
  const fg = objective(L, rows, experts, noise.s, prior);
  const { x, it, gnorm } = bfgs(fg, new Array(L.n + experts.length).fill(0));
  const th = x.slice(0, L.n), capped = [];
  for (let i = 0; i < L.n; i++) if (Math.abs(th[i]) > CAP) { capped.push(L.names[i]); th[i] = Math.sign(th[i]) * CAP; }
  const bias = Object.fromEntries(experts.map((e, i) => [e, experts.length > 1 ? x[L.n + i] : 0]));
  const zero = new Array(L.n).fill(0), held = rows.filter(r => r.s.role === 'anchor'), used = rows.filter(r => r.s.role !== 'anchor');
  const answers = {};
  for (const r of used) for (const [id] of r.s.stock) answers[id] = (answers[id] ?? 0) + 1;
  const species = Object.fromEntries(L.species.map(id => [id, { mult: +Math.exp(th[0] + th[L.at['c:' + L.cls[id]]] + th[L.at['d:' + id]]).toFixed(4), own: +Math.exp(th[L.at['d:' + id]]).toFixed(4), cls: L.cls[id], answers: answers[id] ?? 0 }]));
  // limit / ideal count ratio: experts' against the engine's (tests the school curve)
  const ratio = [];
  for (const f of files) for (const a of f.answers) {
    const s = round.scenarios.find(t => t.id === a.id);
    if (!s || !(a.ideal >= 1) || !(a.limit >= 1)) continue;
    const at = p => s.table.findIndex(rw => Math.max(Object.values(rw.water).reduce((u, v) => u + v, 0), rw.floor) >= p);
    const ei = at(round.ideal), el = at(round.limit);
    if (ei > 0 && el > 0) ratio.push({ id: s.id, expert: f.expert, experts: a.limit / a.ideal, engine: el / ei });
  }
  const compat = {};
  for (const f of files) for (const a of f.answers) {
    const s = round.scenarios.find(t => t.id === a.id);
    if (!s || s.kind === 'single' || !a.together) continue;
    const k = `${s.gate} -> ${a.together}`; compat[k] = (compat[k] ?? 0) + 1;
  }
  return {
    round: round.round, experts, noise, solver: { it, gnorm }, skipped, rows: rows.length, held: held.length,
    g: +Math.exp(th[0]).toFixed(4), f: +Math.exp(th[1]).toFixed(4),
    class: Object.fromEntries(L.classes.map(k => [k, +Math.exp(th[L.at['c:' + k]]).toFixed(4)])), species, capped, bias,
    error: { heldBefore: rms(L, held, zero, bias), heldAfter: rms(L, held, th, bias), fitBefore: rms(L, used, zero, bias), fitAfter: rms(L, used, th, bias), disagreement: disagreement(L, rows, bias) },
    ratio, compat, theta: Object.fromEntries(L.names.map((n, i) => [n, th[i]])),
  };
}

export function report(r) {
  const nf = v => Number.isFinite(v) ? v.toFixed(3) : 'n/a', pc = m => `${m >= 1 ? '+' : ''}${((m - 1) * 100).toFixed(0)} %`, e = r.error;
  let md = `# Expert calibration, fit of round ${r.round}\n\n${r.experts.length} experts (${r.experts.join(', ')}), ${r.rows} answers, ${r.held} on held-out anchors. Noise ${r.noise.s.toFixed(3)} (log) from ${r.noise.pairs} repeat pairs.\n\n`;
  md += `## Error (rms of log reading at the experts' counts)\n\n| | before | after |\n|---|---|---|\n| held-out anchors | ${nf(e.heldBefore)} | ${nf(e.heldAfter)} |\n| fitted tanks | ${nf(e.fitBefore)} | ${nf(e.fitAfter)} |\n\nInter-expert disagreement ${Number.isFinite(e.disagreement) ? e.disagreement.toFixed(3) : 'n/a (one expert)'}. ${e.heldAfter <= 1.1 * e.disagreement ? '**Stop rule met**: held-out error is within the experts\' own disagreement.' : 'Stop rule not met.'}\n\n`;
  md += `## Multipliers on today's factors\n\nWater (SPACE_PER_L) x${r.g}, floor x${r.f}. Classes: ${Object.entries(r.class).map(([k, m]) => `${k} ${pc(m)}`).join(', ')}.${r.capped.length ? ` Capped at x1.25: ${r.capped.join(', ')}.` : ''}\n\n| species | class | answers | total move | own move |\n|---|---|---|---|---|\n`;
  for (const [id, v] of Object.entries(r.species).sort((a, b) => Math.abs(Math.log(b[1].mult)) - Math.abs(Math.log(a[1].mult)))) if (Math.abs(v.mult - 1) >= 0.05) md += `| ${id} | ${v.cls} | ${v.answers} | ${pc(v.mult)} | ${pc(v.own)} |\n`;
  md += `\n## Experts\n\n| expert | bias |\n|---|---|\n${r.experts.map(x => `| ${x} | ${pc(Math.exp(r.bias[x]))} |`).join('\n')}\n`;
  if (r.ratio.length) { const m = a => [...a].sort((p, q) => p - q)[a.length >> 1]; md += `\n## Limit / ideal count\n\nMedian ratio, experts ${m(r.ratio.map(x => x.experts)).toFixed(2)}, engine ${m(r.ratio.map(x => x.engine)).toFixed(2)} (${r.ratio.length} answers). Experts higher means they find later fish cheaper than the school curve does.\n`; }
  if (Object.keys(r.compat).length) md += `\n## Compatibility: gate -> experts\n\n${Object.entries(r.compat).sort().map(([k, n]) => `- ${k}: ${n}`).join('\n')}\n`;
  if (r.skipped.length) md += `\n## Skipped answers\n\n${r.skipped.map(x => `- ${x}`).join('\n')}\n`;
  return md;
}

if (process.argv[1]?.endsWith('calib-fit.mjs')) {
  const [roundPath, ...answerPaths] = process.argv.slice(2);
  if (!roundPath || !answerPaths.length) { console.error('usage: node scripts/calib-fit.mjs research/calib/round-N.json answers1.json [...]'); process.exit(1); }
  const round = JSON.parse(readFileSync(roundPath, 'utf8')), files = answerPaths.map(p => JSON.parse(readFileSync(p, 'utf8')));
  const r = fitRound(round, files), base = roundPath.replace(/round-(\d+)\.json$/, 'fit-round-$1');
  writeFileSync(base + '.json', JSON.stringify(r, (k, v) => k === 'theta' ? undefined : v, 1) + '\n');
  writeFileSync(base + '.md', report(r));
  console.log(`fit round ${r.round}: water x${r.g}, floor x${r.f}; held-out error ${r.error.heldBefore?.toFixed(3)} -> ${r.error.heldAfter?.toFixed(3)}; wrote ${base}.{json,md}`);
}
