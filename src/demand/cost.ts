// Cost distributions (lane KK phase 1): totals as an expected value with a likely range. Items are triangular; they move together
// through a few shared factors (one price level, one electricity rate, one loss rate per domain) plus a Gaussian copula with a
// single correlation rho across items; ~2000 seeded draws, so the numbers are stable. Run when the scene settles, not per frame.
import { FACTORS, riskLabel } from './engine';
import { mean3, phi, rng, triInv } from './range';
import { DOMAINS, type Contribution, type Demand, type Domain, type Limits, type Range3, type UserProfile } from './types';

export interface Dist {
  mean: number;
  /** percentiles 0..100 inclusive (101 values) */
  q: number[];
  p10: number; p50: number; p85: number; p90: number;
}
export type Shares = Map<string, number>;
export interface CostResult {
  setup: Dist; upkeep: Dist; minutes: Dist;
  /** each item's share of the total's variance (covariance with the total / variance of the total); sums to 1 */
  share: { setup: Shares; upkeep: Shares; minutes: Shares };
  draws: number;
}
export const pct = (d: Dist, p: number) => { const x = Math.min(100, Math.max(0, p)), i = Math.floor(x), f = x - i; return d.q[i] + (i < 100 ? (d.q[i + 1] - d.q[i]) * f : 0); };
const mk = (xs: Float64Array): Dist => {
  const s = Float64Array.from(xs).sort(), n = s.length, q: number[] = [];
  for (let p = 0; p <= 100; p++) q.push(s[Math.min(n - 1, Math.round(p / 100 * (n - 1)))]);
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  return { mean, q, p10: q[10], p50: q[50], p85: q[85], p90: q[90] };
};

const tri = (r: { lo: number; mode: number; hi: number }): Range3 => ({ lo: r.lo, mode: r.mode, hi: r.hi });
export interface CostOpts { draws?: number; seed?: number }

export function costDistribution(D: Demand, P: UserProfile, opts: CostOpts = {}): CostResult {
  const N = opts.draws ?? 2000, R = rng(opts.seed ?? 20261019), rho = FACTORS.correlation, a = Math.sqrt(rho), b = Math.sqrt(1 - rho);
  const items = D.items, m = items.length;
  const kwhBase = P.kwhUsd ?? mean3(tri(FACTORS.kwhUsd)), kwhSpread = P.kwhUsd !== undefined ? { lo: 0.95, mode: 1, hi: 1.05 } : { lo: FACTORS.kwhSpread.lo, mode: 1, hi: FACTORS.kwhSpread.hi };
  const loss = (d: Domain) => tri((FACTORS.annualLoss as Record<Domain, Range3[]>)[d][P.skill[d]]);
  const price = tri(FACTORS.priceLevel);
  const out = { setup: new Float64Array(N), upkeep: new Float64Array(N), minutes: new Float64Array(N) };
  const sumX = { setup: new Float64Array(m), upkeep: new Float64Array(m), minutes: new Float64Array(m) };
  const sumXT = { setup: new Float64Array(m), upkeep: new Float64Array(m), minutes: new Float64Array(m) };
  const x = { setup: new Float64Array(m), upkeep: new Float64Array(m), minutes: new Float64Array(m) };
  const lossDraw: Partial<Record<Domain, number>> = {};
  for (let k = 0; k < N; k++) {
    const zs = R.z(), zu = R.z(), zm = R.z(), pl = triInv(price, R.u()), kw = kwhBase * triInv(kwhSpread, R.u());
    for (const d of DOMAINS) lossDraw[d] = triInv(loss(d), R.u());
    let ts = 0, tu = 0, tm = 0;
    for (let i = 0; i < m; i++) {
      const c = items[i];
      const s = c.setup ? triInv(c.setup, phi(a * zs + b * R.z())) * pl : 0;
      let u = (c.upkeep ? triInv(c.upkeep, phi(a * zu + b * R.z())) : 0) + (c.kwhMo ?? 0) * kw;
      if (c.livestock && c.domain) u += s * (lossDraw[c.domain] ?? 0) / 12;
      const t = c.minutes ? triInv(c.minutes, phi(a * zm + b * R.z())) : 0;
      x.setup[i] = s; x.upkeep[i] = u; x.minutes[i] = t; ts += s; tu += u; tm += t;
    }
    out.setup[k] = ts; out.upkeep[k] = tu; out.minutes[k] = tm;
    for (const f of ['setup', 'upkeep', 'minutes'] as const) { const T = out[f][k]; for (let i = 0; i < m; i++) { sumX[f][i] += x[f][i]; sumXT[f][i] += x[f][i] * T; } }
  }
  const share = (f: 'setup' | 'upkeep' | 'minutes'): Shares => {
    const mt = out[f].reduce((p, v) => p + v, 0) / N, vt = out[f].reduce((p, v) => p + (v - mt) * (v - mt), 0) / N, r: Shares = new Map();
    for (let i = 0; i < m; i++) r.set(items[i].key, vt > 0 ? (sumXT[f][i] / N - sumX[f][i] / N * mt) / vt : 0);
    return r;
  };
  return { setup: mk(out.setup), upkeep: mk(out.upkeep), minutes: mk(out.minutes), share: { setup: share('setup'), upkeep: share('upkeep'), minutes: share('minutes') }, draws: N };
}

// ---- limits: what each bar is checked against
export interface BarState { value: number; limit?: number; over: boolean }
export interface LimitState { setup: BarState; upkeep: BarState; minutes: BarState; risk: BarState & { label: 'safe' | 'moderate' | 'demanding' } }
const UPKEEP_CAP = (l: Limits['upkeep']) => l === 'free' ? FACTORS.limits.upkeepNearFreeUsdMo : l === 'low' ? FACTORS.limits.upkeepLowUsdMo : undefined;
const RISK_CAP = (l: Limits['risk']) => l === 'safe' ? 'safe' : l === 'moderate' ? 'moderate' : undefined;

/** Which number is checked against a $ limit: the expected value ("what I expect to spend") or the 85th percentile ("the most I can spend"). */
export function limitState(D: Demand, C: CostResult, P: UserProfile): LimitState {
  const L = P.limits, cap = L.budgetMode === 'cap', at = (d: Dist) => (cap ? pct(d, FACTORS.budgetCapPercentile) : d.mean);
  const bar = (value: number, limit?: number): BarState => ({ value, limit, over: limit !== undefined && value > limit });
  const label = riskLabel(D.totals.risk), rc = RISK_CAP(L.risk);
  return {
    setup: bar(at(C.setup), L.setupUsd), upkeep: bar(at(C.upkeep), UPKEEP_CAP(L.upkeep)), minutes: bar(C.minutes.mean, L.minPerWeek),
    risk: { ...bar(D.totals.risk), over: rc === 'safe' ? label !== 'safe' : rc === 'moderate' ? label === 'demanding' : false, label },
  };
}

/** The items driving a bar, biggest first: mean contribution and share of the uncertainty. */
export function drivers(D: Demand, C: CostResult, bar: 'setup' | 'upkeep' | 'minutes' | 'risk', top = 8) {
  const rows = D.items.map(c => ({
    key: c.key, label: c.label, n: c.n ?? 1,
    mean: bar === 'risk' ? c.risk : (c[bar === 'upkeep' ? 'upkeep' : bar === 'setup' ? 'setup' : 'minutes'] ? mean3((c as Required<Contribution>)[bar === 'upkeep' ? 'upkeep' : bar === 'setup' ? 'setup' : 'minutes']) : 0) + (bar === 'upkeep' ? (c.kwhMo ?? 0) * (FACTORS.kwhUsd.mode) + (c.lossMo ?? 0) : 0),
    share: bar === 'risk' ? 0 : C.share[bar].get(c.key) ?? 0,
  }));
  return rows.filter(r => r.mean > 0).sort((a, b) => b.mean - a.mean).slice(0, top);
}
