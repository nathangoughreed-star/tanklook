// Maintenance as a rhythm (lane C6 wiring, 2026-10-27): the demand model's weekly minutes split by how often each task comes round,
// and how long the tank can be left alone. Information only: no guardrail reads it. The weekly total is the same number as
// demand.totals.minPerWeek (daily x 7 + weekly + monthly + yearly + mixed adds back up to it). Data: src/data/rhythm.json.
import rj from '../data/rhythm.json';
import { getSpecies } from '../data/species';
import { mean3 } from './range';
import type { TankSetup } from '../scene/types';
import type { Demand } from './types';

export type Beat = 'daily' | 'weekly' | 'monthly' | 'occasional' | 'mixed';
export interface RhythmPart {
  beat: Beat;
  /** minutes per day / week / month / year (per week for 'mixed': tasks with no stated interval) */
  min: number;
  unit: 'day' | 'week' | 'month' | 'year';
  /** the same work as minutes a week, so the parts add to the total */
  minPerWeek: number;
  rows: { label: string; everyDays?: number; minPerWeek: number }[];
}
export interface Away { days: number; by: string; status: 'sourced' | 'estimate'; says: string }
export interface Rhythm { parts: RhythmPart[]; text: string; minPerWeek: number; away?: Away; awayText: string }

type AwayRow = { days: number; status: string; says: string };
const MONTH = 365 / 12;
export const beatOf = (everyDays: number | undefined): Beat => everyDays === undefined ? 'mixed' : everyDays <= 1.5 ? 'daily' : everyDays <= 7 ? 'weekly' : everyDays <= 45 ? 'monthly' : 'occasional';
const UNIT = { daily: 'day', weekly: 'week', monthly: 'month', occasional: 'year', mixed: 'week' } as const;
const PER_WEEK = { daily: 1 / 7, weekly: 1, monthly: MONTH / 7, occasional: 365 / 7, mixed: 1 } as const; // minutes per period = minutes a week x this

/** The interval a routine row carries (data/rhythm.json), for rows the engine does not already give one. */
export const choreDays = (key: keyof typeof rj.chores): number => rj.chores[key].everyDays;

function mins(n: number): string {
  if (n < 0.95) return `${n < 0.1 ? '<0.1' : n.toFixed(1)} min`;
  if (n < 10) return `${Math.round(n * 2) / 2} min`;
  if (n < 120) return `${Math.round(n)} min`;
  return `${Math.round(n / 6) / 10} h`;
}

/** How long this tank can be left alone: the shortest tolerance among its animals (corals when there are none). */
export function awayOf(S: Pick<TankSetup, 'fish' | 'items'>): Away | undefined {
  let best: Away | undefined;
  const take = (a: Away) => { if (!best || a.days < best.days) best = a; };
  for (const f of S.fish) {
    const sp = getSpecies(f.species);
    if (!sp) continue;
    const r = (rj.away.species as Record<string, AwayRow>)[sp.id] ?? (rj.away.cat as Record<string, AwayRow>)[sp.cat];
    if (r) take({ days: r.days, by: sp.name, status: r.status === 'sourced' ? 'sourced' : 'estimate', says: r.says });
  }
  if (!best && S.items.some(i => i.kind === 'coral')) take({ days: rj.away.coral.days, by: 'Corals', status: 'estimate', says: rj.away.coral.says });
  return best;
}

export function rhythmOf(D: Pick<Demand, 'items'>, S: Pick<TankSetup, 'fish' | 'items'>): Rhythm {
  const by = new Map<Beat, RhythmPart>();
  let total = 0;
  for (const c of D.items) {
    const w = c.minutes ? mean3(c.minutes) : 0;
    if (w <= 0) continue;
    total += w;
    const b = beatOf(c.everyDays);
    let p = by.get(b);
    if (!p) by.set(b, p = { beat: b, min: 0, unit: UNIT[b], minPerWeek: 0, rows: [] });
    p.minPerWeek += w; p.rows.push({ label: c.label, everyDays: c.everyDays, minPerWeek: w });
  }
  const parts = (['daily', 'weekly', 'monthly', 'occasional', 'mixed'] as Beat[]).map(b => by.get(b)).filter((p): p is RhythmPart => !!p);
  for (const p of parts) p.min = p.minPerWeek * PER_WEEK[p.beat];
  const phrase = (p: RhythmPart) => p.beat === 'mixed' ? `${mins(p.min)} a week, spread out` : `${mins(p.min)} ${p.beat === 'occasional' ? 'a year' : p.beat}`;
  const text = parts.length ? parts.map(phrase).join(' + ') : 'no routine work';
  const away = awayOf(S);
  const awayText = away ? `${away.days} day${away.days === 1 ? '' : 's'} away at most (${away.by}${away.status === 'estimate' ? ', estimate' : ''})` : '';
  return { parts, text, minPerWeek: total, away, awayText };
}

/** What is sourced and what is not, for a tooltip or the plan sheet. */
export function rhythmNote(r: Rhythm): string {
  return 'Minutes per job are an estimate (no page states them); how often each job comes round is from the maintenance research (research/maintenance/cadence.json). The weekly total is unchanged.'
    + (r.away ? ` Away-days: ${r.away.says}${r.away.status === 'estimate' ? ' (estimate)' : ''}; the shortest tolerance in the stocking counts, and someone looking in on the tank can extend it.` : '');
}
