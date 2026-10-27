// Limits and drivers (lane DS, 2026-10-19): one expected number per bar, checked against the user's one number per limit.
// The Monte Carlo spread, percentiles and "likely range" were removed: Nathan's decision was to ask only "what do you want your
// expected cost to be?". The expected value is Demand.totals (the same figure the old sample mean converged to).
import { FACTORS, kwhRate, riskLabel } from './engine';
import { mean3 } from './range';
import type { Contribution, Demand, Limits } from './types';

export interface BarState { value: number; limit?: number; over: boolean }
export interface LimitState { setup: BarState; upkeep: BarState; minutes: BarState; risk: BarState & { label: 'safe' | 'moderate' | 'demanding' } }
const UPKEEP_CAP = (l: Limits['upkeep']) => l === 'free' ? FACTORS.limits.upkeepNearFreeUsdMo : l === 'low' ? FACTORS.limits.upkeepLowUsdMo : undefined;
const RISK_CAP = (l: Limits['risk']) => l === 'safe' ? 'safe' : l === 'moderate' ? 'moderate' : undefined;

/** Every limit is read against the expected value. */
export function limitState(D: Demand, P: { limits: Limits }): LimitState {
  const L = P.limits, T = D.totals;
  const bar = (value: number, limit?: number): BarState => ({ value, limit, over: limit !== undefined && value > limit });
  const label = riskLabel(T.risk), rc = RISK_CAP(L.risk);
  return {
    setup: bar(T.setupUsd, L.setupUsd), upkeep: bar(T.upkeepUsdMo, L.upkeepUsd ?? UPKEEP_CAP(L.upkeep)), minutes: bar(T.minPerWeek, L.minPerWeek),
    risk: { ...bar(T.risk), over: rc === 'safe' ? label !== 'safe' : rc === 'moderate' ? label === 'demanding' : false, label },
  };
}

/** The items driving a bar, biggest first (expected contribution; the rows add up to the bar). */
export function drivers(D: Demand, P: { kwhUsd?: number }, bar: 'setup' | 'upkeep' | 'minutes' | 'risk', top = 8) {
  const f = bar === 'upkeep' ? 'upkeep' : bar === 'setup' ? 'setup' : 'minutes';
  const rows = D.items.map((c: Contribution) => ({
    key: c.key, label: c.label, n: c.n ?? 1,
    mean: bar === 'risk' ? c.risk : (c[f] ? mean3(c[f]!) : 0) * (bar === 'setup' ? mean3(FACTORS.priceLevel) : 1) + (bar === 'upkeep' ? (c.kwhMo ?? 0) * kwhRate(P) + (c.lossMo ?? 0) : 0),
  }));
  return rows.filter(r => r.mean > 0).sort((a, b) => b.mean - a.mean).slice(0, top);
}
