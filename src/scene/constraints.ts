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
// A switched-off cap is never gated, but its cost / time is still shown (the demand bars read totals, not caps).
import type { Limits } from '../demand/types';
import factorsJson from '../data/factors.json';
import type { SpaceLimit, TankSetup } from './types';

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
