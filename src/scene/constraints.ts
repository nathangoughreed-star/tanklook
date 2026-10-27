// Guardrails (lane C1, 2026-10-27, Nathan's start-flow design; UI name "Guardrails"; code name "constraints"). Per TANK, stored on
// `TankSetup.constraints` (no version bump, absent = the tank has none yet). Hard caps in v1: startup $, monthly $, minutes a week,
// space; effort and experience are advisory only. A guardrail decides whether a COMPLETED build is recommended as compliant
// (C2); it never blocks building or editing, and the husbandry assessment never reads it. No locks in v1.
//
// API (kept small; C2 / C3 build on it):
//   Constraints, Cap                 the stored shape: per limit { on, value }; space is { on } only (its size is `layout.space`)
//   parseConstraints(raw)            validate a saved / shared value (undefined when absent or empty)
//   constraintsFromLimits(limits)    seed for a tank's first edit / a new project: the person's browser-profile Limits
//   effectiveLimits(S, profile)      the Limits the demand engine checks: the tank's guardrails when it has any, else the profile's
//                                    (a saved tank without the field reads the profile, so nothing changes for it)
//   activeSpace(S)                   layout.space while the space guardrail is on (or unset); undefined when switched off
//   lastUsed() / rememberLastUsed()  the person's last-used values (localStorage), the defaults for a NEW project
//   compliance(S, totals, profile)   (C2) per enabled guardrail pass / over / unknown, plus one overall line; see below
// A switched-off cap is never gated, but its cost / time is still shown (the demand bars read totals, not caps).
import type { Limits } from '../demand/types';
import factorsJson from '../data/factors.json';
import type { SpaceLimit, TankSetup, Units } from './types';
import { spaceFit, tankExtent } from './space';

export interface Cap { on: boolean; value: number }
export type Effort = 'low' | 'medium' | 'high';
export interface Constraints {
  startupUsd?: Cap;
  monthlyUsd?: Cap;
  minutesPerWeek?: Cap;
  /** The size itself stays in `layout.space`; this only switches the gating on or off. */
  space?: { on: boolean };
  /** Advisory (never gates). */
  effort?: Effort;
  experience?: 0 | 1 | 2;
}

const KEY = 'tanklook.constraints';
const cap = (v: unknown): Cap | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  return typeof o.value === 'number' && Number.isFinite(o.value) && o.value >= 0 && o.value <= 1e7 ? { on: o.on !== false, value: o.value } : undefined;
};

export function parseConstraints(raw: unknown): Constraints | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>, c: Constraints = {};
  const s = cap(o.startupUsd), m = cap(o.monthlyUsd), t = cap(o.minutesPerWeek);
  if (s) c.startupUsd = s; if (m) c.monthlyUsd = m; if (t) c.minutesPerWeek = t;
  if (o.space && typeof o.space === 'object') c.space = { on: (o.space as { on?: unknown }).on !== false };
  if (o.effort === 'low' || o.effort === 'medium' || o.effort === 'high') c.effort = o.effort;
  if (o.experience === 0 || o.experience === 1 || o.experience === 2) c.experience = o.experience;
  return Object.keys(c).length ? c : undefined;
}

const UPKEEP_USD = { free: factorsJson.limits.upkeepNearFreeUsdMo, low: factorsJson.limits.upkeepLowUsdMo } as const;

/** A starting set from the browser-profile Limits (an unset limit stays absent). */
export function constraintsFromLimits(l: Limits): Constraints {
  const c: Constraints = {};
  if (l.setupUsd !== undefined) c.startupUsd = { on: true, value: l.setupUsd };
  if (l.upkeep === 'free' || l.upkeep === 'low') c.monthlyUsd = { on: true, value: UPKEEP_USD[l.upkeep] };
  if (l.minPerWeek !== undefined) c.minutesPerWeek = { on: true, value: l.minPerWeek };
  return c;
}

/** The Limits the demand engine checks for this tank. `risk` is not a guardrail in v1: it always comes from the profile. */
export function effectiveLimits(S: Pick<TankSetup, 'constraints'> | undefined, profile: Limits): Limits {
  const c = S?.constraints;
  if (!c) return profile;
  const on = (k?: Cap) => (k && k.on ? k.value : undefined);
  const l: Limits = { setupUsd: on(c.startupUsd), minPerWeek: on(c.minutesPerWeek), upkeepUsd: on(c.monthlyUsd) };
  if (profile.risk) l.risk = profile.risk;
  return l;
}

/** The space to hold the tank against: `layout.space`, unless the person switched the space guardrail off. */
export const activeSpace = (S: Pick<TankSetup, 'constraints' | 'layout'>): SpaceLimit | undefined => S.constraints?.space?.on === false ? undefined : S.layout.space;

export function lastUsed(): Constraints | undefined {
  try { return parseConstraints(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return undefined; }
}
export function rememberLastUsed(c: Constraints | undefined): void {
  try { if (c) localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

// ---- C2: the compliance line (Nathan 2026-10-27). An enabled guardrail decides whether a COMPLETED build is called compliant; it never
// blocks building or editing, and husbandry (stockSummary.ts) never reads it. "Within your guardrails" only when every enabled
// limit passes on KNOWN data; unknown reads unknown, never green; all off = numbers only, no pass / fail. The totals are the
// engine's calculated expected values (estimates), the caps are the person's own limits.
export type GuardId = 'startup' | 'monthly' | 'time' | 'space';
export type GuardState = 'pass' | 'over' | 'unknown';
export interface GuardResult { id: GuardId; label: string; state: GuardState; /** "45 / 30 min a week"; for unknown, why */ text: string }
export interface Compliance {
  /** every enabled guardrail, in a fixed order; empty when all are off */
  results: GuardResult[];
  over: number; unknown: number;
  /** 'off' = no guardrail is on (numbers only, nothing to pass or fail) */
  overall: 'within' | 'over' | 'unknown' | 'off';
  line: string;
}
export interface CostTotals { setupUsd: number; upkeepUsdMo: number; minPerWeek: number }

/** @param totals the demand engine's expected totals, or undefined when they are not known yet. */
export function compliance(S: Pick<TankSetup, 'constraints' | 'layout' | 'tank'>, totals: CostTotals | undefined, profile: Limits, units: Units = 'cm'): Compliance {
  const L = effectiveLimits(S, profile);
  const usd = (v: number) => '$' + Math.round(v).toLocaleString();
  const known = (v: number | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
  const results: GuardResult[] = [];
  const num = (id: GuardId, label: string, v: number | undefined, capv: number | undefined, fmt: (n: number) => string, unit: string) => {
    if (capv === undefined) return;
    if (!known(v)) results.push({ id, label, state: 'unknown', text: `${label}: not known yet (cap ${fmt(capv)}${unit})` });
    else results.push({ id, label, state: v > capv ? 'over' : 'pass', text: `${fmt(v)} / ${fmt(capv)}${unit}` });
  };
  num('startup', 'Set-up cost', totals?.setupUsd, L.setupUsd, usd, '');
  num('monthly', 'Upkeep', totals?.upkeepUsdMo, L.upkeepUsd ?? upkeepCapOf(L.upkeep), usd, ' a month');
  num('time', 'Time', totals?.minPerWeek, L.minPerWeek, n => String(Math.round(n)), ' min a week');
  const sp = S.constraints?.space?.on === true ? S.layout.space : activeSpace(S);
  if (S.constraints?.space?.on === true && !S.layout.space) results.push({ id: 'space', label: 'Space', state: 'unknown', text: 'Space: no size set yet' });
  else if (sp) {
    const f = spaceFit(S.tank, sp), e = tankExtent(S.tank), len = (mm: number) => units === 'in' ? `${Math.round(mm / 25.4 * 10) / 10}"` : `${Math.round(mm / 10)} cm`;
    results.push({ id: 'space', label: 'Space', state: f.fits ? 'pass' : 'over',
      text: f.fits ? `fits your ${len(sp.w)} x ${len(sp.d)} space` : `tank ${len(e.w)} x ${len(e.d)} vs your space ${len(sp.w)} x ${len(sp.d)}${sp.h && f.over.h ? `, ${len(f.over.h)} too tall` : ''}` });
  }
  const over = results.filter(r => r.state === 'over').length, unknown = results.filter(r => r.state === 'unknown').length;
  const overall = !results.length ? 'off' : over ? 'over' : unknown ? 'unknown' : 'within';
  const line = overall === 'off' ? 'No guardrails on: the numbers are shown, nothing is checked against a limit.'
    : overall === 'within' ? 'Within your guardrails'
    : overall === 'over' ? `${over} over: ${results.filter(r => r.state === 'over').map(r => `${r.label.toLowerCase()} ${r.text}`).join('; ')}`
    : `Not known: ${results.filter(r => r.state === 'unknown').map(r => r.text).join('; ')}`;
  return { results, over, unknown, overall, line };
}
const upkeepCapOf = (u: Limits['upkeep']): number | undefined => u === 'free' || u === 'low' ? UPKEEP_USD[u] : undefined;
