// Expert calibration fit (research/expert-calibration.md sections 4 and 10). Plain node, no dependencies, deterministic.
// Reads rounds (research/calib/round-N.json, from GEN_CALIB=1 npx vitest run test/calib.test.ts) and the experts' answer files
// (the survey's "Export answers"; survey 1 or 2, an earlier round carried inside a later export counts too), fits log multipliers on
// today's space factors (global water g, global floor f, per class c_k, per species d_j) plus a bias per expert, and writes
// research/calib/fit-round-N.{json,md}.
// Survey 2 (Nathan 2026-10-23): each count is fitted on the dimension its species fills (floor for bottom dwellers, water for swimmers,
// the larger for "all"-zone fish); floor and water bands on their own dimension, the overall band on the larger; an answer whose
// tank the expert called too small for a species, or limited by habitat rather than room, is left out; confidence weights.
// Run: node scripts/calib-fit.mjs research/calib/round-1.json research/calib/round-2.json research/calib/answers/*.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// prior sd of each log multiplier (0 = today's value). Species 0.10, classes 0.15: on synthetic rounds (scripts/calib-synth.mjs, 4 seeds)
// a species prior of 0.25 let a tankmate held at one count trade off against the focal species and recovered worse than no fit;
// 0.10 halved the focal species' error (0.034 vs 0.074 unfitted) and lowered the held-out error on every seed.
export const PRIOR = { g: 0.3, f: 0.2, c: 0.15, d: 0.1, b: 0.3 };
export const CAP = Math.log(1.25); // most a parameter may move in one round
const SOFT_K = 50;
const S_FLOOR = 0.10, S_DEFAULT = 0.2, BAND_K = 0.55; // noise floor, noise before any repeats, logistic scale per unit of noise
/** Confidence weights (survey 2: low / medium / high); answers without one count 1. Ambiguous counts (both dimensions near the anchor) count half. */
export const CONF_W = [0.5, 1, 1.5], AMBIG_W = 0.5;

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

/** Engine water and floor percent at row n of a table, today's factors. */
export const partsAt = (tbl, n) => { const r = tbl[Math.max(0, Math.min(n, tbl.length - 1))]; return { W: Object.values(r.water).reduce((a, b) => a + b, 0), F: r.floor }; };

/** log reading of a tank at count n (row n of `tbl`, the focal table by default) under theta, on dimension `dim` ('water', 'floor' or
 *  'max', the engine's larger of the two), and its gradient (sparse: [index, value][]). Ranks held at today's order. */
export function readLog(L, s, n, th, dim = 'max', tbl = s.table) {
  const row = tbl[Math.max(0, Math.min(n, tbl.length - 1))];
  let W = 0;
  const parts = [];
  for (const [id, w] of Object.entries(row.water)) {
    if (!(w > 0)) continue;
    const ic = L.at['c:' + L.cls[id]], id_ = L.at['d:' + id], m = Math.exp(th[0] + th[ic] + th[id_]);
    W += w * m; parts.push([ic, id_, w * m]);
  }
  const F = row.floor * Math.exp(th[1]);
  const water = () => { const grad = [[0, 1]]; for (const [ic, id_, x] of parts) { grad.push([ic, x / W]); grad.push([id_, x / W]); } return { v: Math.log(W), grad }; };
  if (dim === 'water') return W > 0 ? water() : { v: -Infinity, grad: [] };
  if (dim === 'floor') return F > 0 ? { v: Math.log(F), grad: [[1, 1]] } : { v: -Infinity, grad: [] };
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
const shownOf = (s, id = s.focal) => s.stock.find(x => x[0] === id)[1];
/** The floor share of a species in a tank: from the round's `uses` (round 2 on), else by zone (round 1). */
const floorShare = (s, id) => s.uses?.[id]?.floor ?? (s.invert?.[id] ? 0 : ({ bottom: 1, all: 0.5 })[s.zone?.[id]] ?? 0);
/** The dimension a count of species `id` is fitted on: the one it fills. */
export const dimOf = (s, id) => { const f = floorShare(s, id); return f >= 1 ? 'floor' : f <= 0 ? 'water' : 'max'; };
/** The focal counts of an answer, survey 1 or 2: { ideal, limit, status }. */
export const focalOf = a => a.focal ?? { ideal: a.ideal, limit: a.limit, status: a.countStatus ?? {} };

/** Answer rows the fit uses: counts (ideal -> 75, limit -> 100, on the species' own dimension) and bands, each tied to its expert and
 *  tank, with a weight. `skipped` says why an answer was left out. */
export function rowsOf(round, files) {
  const byId = Object.fromEntries(round.scenarios.map(s => [s.id, s]));
  const rows = [], skipped = [], flagged = [], cuts = [Math.log(round.ideal), Math.log(round.limit)];
  for (const f of files) for (const a of f.answers) {
    const s = byId[a.id];
    if (!s) { skipped.push(`${f.expert} ${a.id}: no such tank`); continue; }
    // a reviewer's reading of the expert's own note (research/calib/review-*.md): `skip` drops answers the note says are not what the
    // question asks (a preferred count that "does not make the tank green", a band set by compatibility); `set` restates a band, or the
    // "what limits" answer (`set.limits: null`: the note says the "not room" was compatibility, and its counts are room answers; S214 f1)
    const rv = a.review ?? {}, skip = new Set(rv.skip ?? []);
    const limits = rv.set && 'limits' in rv.set ? rv.set.limits : a.limits;
    if (limits === 'not-room') { skipped.push(`${f.expert} ${a.id}: habitat or food decides it, not room`); continue; }
    // review.set.bigEnough restates a misclicked big-enough answer from the expert's own note (S214, chatgpt-high p1b)
    const small = Object.entries({ ...(a.bigEnough ?? {}), ...(rv.set?.bigEnough ?? {}) }).filter(([, v]) => v === false).map(([id]) => id);
    if (small.length) { skipped.push(`${f.expert} ${a.id}: tank too small for ${small.join(', ')} (a tank-minimum answer, not room)`); continue; }
    if (rv.set && 'limits' in rv.set && a.limits !== limits) skipped.push(`${f.expert} ${a.id}: kept on review, "what limits" read as ${limits ?? 'room'} (${rv.why ?? 'see the review'})`);
    for (const k of skip) skipped.push(`${f.expert} ${a.id} ${k}: set aside on review (${rv.why ?? 'see the review'})`);
    const w = CONF_W[a.confidence] ?? 1, base = { expert: f.expert, s, w, picture: !!(a.picture ?? f.picture) };
    const counts = [[s.focal, s.table, focalOf(a), ['ideal', 'limit'], 'focal'], ...(a.mate && s.mateTable ? [[a.mate.id, s.mateTable, a.mate, ['ideal'], 'mate']] : [])];
    for (const [who, tbl, c, keys, role] of counts) for (const key of keys) {
      const n = skip.has(`${role}.${key}`) ? null : c[key];
      if (n == null || n === '') continue;
      if (n < 1 || n >= tbl.length) { skipped.push(`${f.expert} ${a.id} ${who} ${key} ${n}: outside the table (1..${tbl.length - 1})`); continue; }
      const anchor = key === 'ideal' ? round.ideal : round.limit, dim = dimOf(s, who), { W, F } = partsAt(tbl, n);
      // both dimensions near the anchor at that count: unclear which one the expert reacted to
      const ambiguous = Math.min(W, F) >= 0.8 * anchor && Math.max(W, F) / Math.max(1e-9, Math.min(W, F)) < 1.2;
      if (ambiguous) flagged.push(`${f.expert} ${a.id} ${who} ${key} ${n}: water ${W.toFixed(0)} %, floor ${F.toFixed(0)} % (weighted ${AMBIG_W})`);
      rows.push({ ...base, type: 'count', key, who, tbl, dim, n: Math.round(n), anchor: Math.log(anchor), w: w * (ambiguous ? AMBIG_W : 1), ambiguous });
    }
    const shown = shownOf(s);
    if (a.band != null) rows.push({ ...base, type: 'band', key: 'overall', tbl: s.table, dim: 'max', n: shown, y: a.band, cuts }); // survey 1: one band, the larger dimension
    for (const [key, dim] of [['floor', 'floor'], ['water', 'water'], ['overall', 'max']]) {
      const y = rv.set?.[key] ?? a[key];
      if (a.focal && y != null && !skip.has(key)) rows.push({ ...base, type: 'band', key, tbl: s.table, dim, n: shown, y, cuts });
    }
  }
  return { rows, skipped, flagged };
}

/** Rounding of a count answer, as extra variance: the log step between neighbouring counts, squared, over 12. */
function roundVar(L, r) {
  const z = new Array(L.n).fill(0), a = readLog(L, r.s, Math.max(1, r.n - 1), z, r.dim, r.tbl).v, b = readLog(L, r.s, r.n + 1, z, r.dim, r.tbl).v;
  const step = Number.isFinite(a) && Number.isFinite(b) ? (b - a) / 2 : 0.3;
  return step * step / 12;
}

/** Within-expert noise from the repeats: sd of the difference of a repeat's log implied reading and its original's, / sqrt 2. */
export function repeatNoise(L, round, files) {
  const diffs = [], z = new Array(L.n).fill(0);
  const byId = Object.fromEntries(round.scenarios.map(s => [s.id, s]));
  for (const f of files) {
    const ans = Object.fromEntries(f.answers.map(a => [a.id, focalOf(a)]));
    for (const s of round.scenarios.filter(x => x.role === 'repeat')) {
      const a = ans[s.id], o = ans[s.of], d = dimOf(s, s.focal);
      if (!a || !o) continue;
      for (const k of ['ideal', 'limit']) if (a[k] >= 1 && o[k] >= 1) diffs.push(readLog(L, s, a[k], z, d).v - readLog(L, byId[s.of], o[k], z, d).v);
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
  for (const r of fit) if (r.type === 'count') r.v = s * s + roundVar(L, r);
  return x => {
    let f = 0;
    const g = new Array(x.length).fill(0);
    for (let i = 0; i < x.length; i++) { f += x[i] * x[i] / (2 * sd[i] * sd[i]); g[i] += x[i] / (sd[i] * sd[i]); }
    // the experts' mean bias is 0: their average sets the scale (a stiff penalty, not a hard constraint)
    if (nb > 1) { let sb = 0; for (let i = 0; i < nb; i++) sb += x[L.n + i]; f += 50 * sb * sb; for (let i = 0; i < nb; i++) g[L.n + i] += 100 * sb; }
    else g[L.n] = 0, x[L.n] = 0;
    for (const r of fit) {
      const { v, grad } = readLog(L, r.s, r.n, x, r.dim, r.tbl), ib = eAt[r.expert], b = nb > 1 ? x[ib] : 0;
      if (!Number.isFinite(v)) continue;
      let dL;
      if (r.type === 'count') { const res = v + b - r.anchor; f += r.w * res * res / (2 * r.v); dL = r.w * res / r.v; }
      else {
        const sc = s * BAND_K, s1 = sig((r.cuts[0] - v - b) / sc), s2 = sig((r.cuts[1] - v - b) / sc);
        if (r.y === 0) { f -= r.w * Math.log(Math.max(1e-12, s1)); dL = r.w * (1 - s1) / sc; }
        else if (r.y === 2) { f -= r.w * Math.log(Math.max(1e-12, 1 - s2)); dL = -r.w * s2 / sc; }
        else { const p = Math.max(1e-12, s2 - s1); f -= r.w * Math.log(p); dL = r.w * (s2 * (1 - s2) - s1 * (1 - s1)) / p / sc; }
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
  const r = rows.filter(x => x.type === 'count').map(x => readLog(L, x.s, x.n, th, x.dim, x.tbl).v + (bias[x.expert] ?? 0) - x.anchor).filter(Number.isFinite);
  return r.length ? Math.sqrt(r.reduce((a, v) => a + v * v, 0) / r.length) : NaN;
}

/** Inter-expert disagreement: sd, across experts on the same tank and question, of the bias-free log reading at their counts. */
function disagreement(L, rows, bias) {
  const z = new Array(L.n).fill(0), by = new Map();
  for (const r of rows) if (r.type === 'count') {
    const key = `${r.s.of && r.s.role === 'repeat' ? r.s.of : r.s.id}:${r.who}:${r.key}`; // a repeat pools with its original
    const v = readLog(L, r.s, r.n, z, r.dim, r.tbl).v + (bias[r.expert] ?? 0);
    if (Number.isFinite(v)) by.set(key, [...(by.get(key) ?? []), v]);
  }
  let ss = 0, df = 0;
  for (const vs of by.values()) if (vs.length > 1) { const m = vs.reduce((a, b) => a + b, 0) / vs.length; ss += vs.reduce((a, v) => a + (v - m) ** 2, 0); df += vs.length - 1; }
  return df ? Math.sqrt(ss / df) : NaN;
}

/** A round's build: a short hash of its tanks (id, dimensions, stock). The survey carries it into every export (survey 3.1), so an
 *  answer file can be tied to the exact tanks it answered: round 3 was redrawn after the length audit under the same ids, and ChatGPT's
 *  first round-3 answers (2026-10-23) were about the earlier tanks (round-3a.json). FNV-1a, 32 bit, hex. */
export function buildOf(round) {
  const s = JSON.stringify(round.scenarios.map(t => [t.id, t.dimsIn, t.stock]));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/** Whether an answer file answered this round's tanks: by its build when it has one, else by every answer's species (and tankmate)
 *  matching the tank of that id. */
export function answersFit(R, f) {
  if (f.round !== R.round) return false;
  if (f.build) return f.build === buildOf(R);
  const by = Object.fromEntries(R.scenarios.map(s => [s.id, s]));
  return f.answers.every(a => { const s = by[a.id]; if (!s) return false; const sp = Object.keys(a.bigEnough ?? {}).sort().join(); return (!sp || sp === s.stock.map(x => x[0]).sort().join()) && (!a.mate || a.mate.id === s.mate); });
}
const labelOf = R => R.label ?? String(R.round);

/** Several rounds as one: scenario ids become "<label>:<id>" (repeats and pairs keep their links), and each answer file joins the round
 *  whose tanks it answered (answersFit), never by round number alone; an earlier round carried inside a later export joins its own round
 *  (once per expert, round and export time). Files that fit no round given come back in `unmatched`. */
export function combine(rounds, files) {
  const all = files.flatMap(f => [f, ...(f.carried ?? [])]), seen = new Set(), use = [];
  for (const f of all) { const k = `${f.round}|${f.expert}|${f.made}`; if (!seen.has(k)) { seen.add(k); use.push(f); } }
  const home = f => rounds.find(R => answersFit(R, f));
  const unmatched = use.filter(f => !home(f)).map(f => `${f.expert} round ${f.round} (${f.made ?? '?'}): its answers fit none of the rounds given (another build of that round?)`);
  if (rounds.length === 1) return { round: rounds[0], files: use.filter(f => home(f) === rounds[0]), unmatched };
  const p = (r, id) => `${r}:${id}`;
  const scenarios = rounds.flatMap(R => R.scenarios.map(s => ({ ...s, id: p(labelOf(R), s.id), ...(s.of ? { of: p(labelOf(R), s.of) } : {}) })));
  return { round: { round: rounds.map(labelOf).join('+'), ideal: rounds[0].ideal, limit: rounds[0].limit, scenarios }, unmatched,
    files: use.filter(f => home(f)).map(f => ({ ...f, answers: f.answers.map(a => ({ ...a, id: p(labelOf(home(f)), a.id) })) })) };
}

/** The whole fit: returns multipliers, biases, errors and the tables the report shows. */
export function fitRound(round, files, prior = PRIOR) {
  const L = layout(round), experts = [...new Set(files.map(f => f.expert))].sort();
  const { rows, skipped, flagged } = rowsOf(round, files), noise = repeatNoise(L, round, files);
  const fg = objective(L, rows, experts, noise.s, prior);
  const { x, it, gnorm } = bfgs(fg, new Array(L.n + experts.length).fill(0));
  const th = x.slice(0, L.n), capped = [];
  for (let i = 0; i < L.n; i++) if (Math.abs(th[i]) > CAP) { capped.push(L.names[i]); th[i] = Math.sign(th[i]) * CAP; }
  const bias = Object.fromEntries(experts.map((e, i) => [e, experts.length > 1 ? x[L.n + i] : 0]));
  const zero = new Array(L.n).fill(0), held = rows.filter(r => r.s.role === 'anchor'), used = rows.filter(r => r.s.role !== 'anchor');
  const answers = {};
  for (const r of used) for (const [id] of r.s.stock) answers[id] = (answers[id] ?? 0) + 1;
  const species = Object.fromEntries(L.species.map(id => [id, { mult: +Math.exp(th[0] + th[L.at['c:' + L.cls[id]]] + th[L.at['d:' + id]]).toFixed(4), own: +Math.exp(th[L.at['d:' + id]]).toFixed(4), cls: L.cls[id], answers: answers[id] ?? 0 }]));
  const byId = Object.fromEntries(round.scenarios.map(s => [s.id, s]));
  // limit / ideal count ratio on one-species tanks: experts' against the engine's (tests the school curve)
  const ratio = [];
  for (const f of files) for (const a of f.answers) {
    const s = byId[a.id], c = focalOf(a);
    if (!s || s.stock.length > 1 || !(c.ideal >= 1) || !(c.limit >= 1)) continue;
    const d = dimOf(s, s.focal), at = p => s.table.findIndex((_, n) => n > 0 && Math.exp(readLog(L, s, n, zero, d).v) >= p);
    const ei = at(round.ideal), el = at(round.limit);
    if (ei > 0 && el > 0) ratio.push({ id: s.id, expert: f.expert, experts: c.limit / c.ideal, engine: el / ei });
  }
  // the max rule: does the overall answer follow the tighter of the floor and water answers, as the engine's max does?
  const maxRule = { same: 0, lower: 0, higher: 0, cases: [] };
  for (const f of files) for (const a of f.answers) {
    if (a.overall == null || a.floor == null || a.water == null) continue;
    const m = Math.max(a.floor, a.water), k = a.overall === m ? 'same' : a.overall < m ? 'lower' : 'higher';
    maxRule[k]++; if (k !== 'same') maxRule.cases.push(`${f.expert} ${a.id}: floor ${a.floor}, water ${a.water}, overall ${a.overall}`);
  }
  const compat = {};
  for (const f of files) for (const a of f.answers) {
    const s = byId[a.id];
    if (!s || s.kind === 'single' || !a.together) continue;
    const k = `${s.gate} -> ${a.together}`; compat[k] = (compat[k] ?? 0) + 1;
  }
  return {
    round: round.round, experts, noise, solver: { it, gnorm }, skipped, flagged, rows: rows.length, held: held.length,
    g: +Math.exp(th[0]).toFixed(4), f: +Math.exp(th[1]).toFixed(4),
    class: Object.fromEntries(L.classes.map(k => [k, +Math.exp(th[L.at['c:' + k]]).toFixed(4)])), species, capped, bias,
    error: { heldBefore: rms(L, held, zero, bias), heldAfter: rms(L, held, th, bias), fitBefore: rms(L, used, zero, bias), fitAfter: rms(L, used, th, bias), disagreement: disagreement(L, rows, bias) },
    kinds: Object.fromEntries(files.map(f => [f.expert, f.expertKind ?? ''])), ratio, maxRule, compat, theta: Object.fromEntries(L.names.map((n, i) => [n, th[i]])),
  };
}

export function report(r) {
  const nf = v => Number.isFinite(v) ? v.toFixed(3) : 'n/a', pc = m => `${m >= 1 ? '+' : ''}${((m - 1) * 100).toFixed(0)} %`, e = r.error;
  let md = `# Expert calibration, fit of round ${r.round}\n\n${r.experts.length} experts (${r.experts.join(', ')}), ${r.rows} answers, ${r.held} on held-out anchors. Noise ${r.noise.s.toFixed(3)} (log) from ${r.noise.pairs} repeat pairs.${r.tables ? ` Engine readings: ${r.tables}.` : ''}\n\n`;
  md += `## Error (rms of log reading at the experts' counts)\n\n| | before | after |\n|---|---|---|\n| held-out anchors | ${nf(e.heldBefore)} | ${nf(e.heldAfter)} |\n| fitted tanks | ${nf(e.fitBefore)} | ${nf(e.fitAfter)} |\n\nInter-expert disagreement ${Number.isFinite(e.disagreement) ? e.disagreement.toFixed(3) : 'n/a (no tank answered by two experts yet)'}. ${e.heldAfter <= 1.1 * e.disagreement ? '**Stop rule met**: held-out error is within the experts\' own disagreement.' : 'Stop rule not met.'}\n\n`;
  md += `## Multipliers on today's factors\n\nWater (SPACE_PER_L) x${r.g}, floor x${r.f}. Classes: ${Object.entries(r.class).map(([k, m]) => `${k} ${pc(m)}`).join(', ')}.${r.capped.length ? ` Capped at x1.25: ${r.capped.join(', ')}.` : ''}\n\n| species | class | answers | total move | own move |\n|---|---|---|---|---|\n`;
  for (const [id, v] of Object.entries(r.species).sort((a, b) => Math.abs(Math.log(b[1].mult)) - Math.abs(Math.log(a[1].mult)))) if (Math.abs(v.mult - 1) >= 0.05) md += `| ${id} | ${v.cls} | ${v.answers} | ${pc(v.mult)} | ${pc(v.own)} |\n`;
  // an AI model is one expert among several with its own bias (survey 2.1 asks who is answering); read its rows apart before trusting a move
  md += `\n## Experts\n\n| expert | answering as | bias |\n|---|---|---|\n${r.experts.map(x => `| ${x} | ${r.kinds?.[x] === 'ai' ? 'AI model' : r.kinds?.[x] || '-'} | ${pc(Math.exp(r.bias[x]))} |`).join('\n')}\n`;
  if (r.ratio.length) { const m = a => [...a].sort((p, q) => p - q)[a.length >> 1]; md += `\n## Limit / ideal count (one-species tanks)\n\nMedian ratio, experts ${m(r.ratio.map(x => x.experts)).toFixed(2)}, engine ${m(r.ratio.map(x => x.engine)).toFixed(2)} (${r.ratio.length} answers). Experts higher means they find later fish cheaper than the school curve does.\n`; }
  const mr = r.maxRule;
  if (mr.same + mr.lower + mr.higher) md += `\n## The max rule\n\nOverall answer vs the tighter of the floor and water answers: same ${mr.same}, lower ${mr.lower}, higher ${mr.higher}. If "lower" or "higher" is common, experts do not judge by the tighter dimension alone and the engine's "larger of the two" needs revisiting.\n${mr.cases.map(x => `- ${x}`).join('\n')}\n`;
  if (Object.keys(r.compat).length) md += `\n## Compatibility: gate -> experts\n\n${Object.entries(r.compat).sort().map(([k, n]) => `- ${k}: ${n}`).join('\n')}\n`;
  if (r.flagged.length) md += `\n## Ambiguous counts (both dimensions near the anchor)\n\n${r.flagged.map(x => `- ${x}`).join('\n')}\n`;
  if (r.skipped.length) md += `\n## Left out\n\n${r.skipped.map(x => `- ${x}`).join('\n')}\n`;
  return md;
}

/** A round with its engine readings replaced by a tables file's (test/calibtables.test.ts: the frozen tanks re-read on the current
 *  engine). Tanks and counts stay as generated; `pctAsMade` keeps the reading the round was made with. */
export function withTables(round, T) {
  return { ...round, tables: T.made, scenarios: round.scenarios.map(s => T.tanks[s.id] ? { ...s, pctAsMade: s.pct, ...T.tanks[s.id] } : s) };
}
/** The tables file next to a round file, if any (research/calib/round-N.json -> research/calib/tables/round-N.json). */
export function loadTables(roundPath) {
  const p = roundPath.replace(/round-(\d+[a-z]?)\.json$/, 'tables/round-$1.json'); // round-3a.json: a frozen earlier build
  return p !== roundPath && existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

if (process.argv[1]?.endsWith('calib-fit.mjs')) {
  // --as-made fits on the engine readings stored at generation; by default each round reads its tables file (the current engine)
  const args = process.argv.slice(2), asMade = args.includes('--as-made');
  const docs = args.filter(a => !a.startsWith('--')).map(p => ({ p, j: JSON.parse(readFileSync(p, 'utf8')) }));
  const rounds = docs.filter(d => d.j.scenarios).map(d => { const T = asMade ? null : loadTables(d.p); if (!asMade && !T) console.warn(`${d.p}: no tables file, fitting on the readings it was made with`); return T ? withTables(d.j, T) : d.j; });
  const files = docs.filter(d => d.j.answers).map(d => d.j);
  if (!rounds.length || !files.length) { console.error('usage: node scripts/calib-fit.mjs [--as-made] round-N.json [...] answers.json [...]'); process.exit(1); }
  const { round, files: use, unmatched } = combine(rounds, files), r = fitRound(round, use);
  for (const u of unmatched) console.warn('not fitted: ' + u);
  r.skipped.unshift(...unmatched.map(u => 'whole file: ' + u));
  r.tables = asMade ? 'as made' : rounds.map(R => `round ${R.round}: ${R.tables ? 'current engine, ' + R.tables : 'as made'}`).join('; ');
  const base = `research/calib/fit-round-${String(round.round).replace(/\+/g, '-')}`;
  writeFileSync(base + '.json', JSON.stringify(r, (k, v) => k === 'theta' ? undefined : v, 1) + '\n');
  writeFileSync(base + '.md', report(r));
  console.log(`fit round ${r.round}: water x${r.g}, floor x${r.f}; held-out error ${r.error.heldBefore?.toFixed(3)} -> ${r.error.heldAfter?.toFixed(3)}; wrote ${base}.{json,md}`);
}
