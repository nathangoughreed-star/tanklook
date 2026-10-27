// Suggest a setup (lane C8, 2026-10-27; start-flow spec (d) "Help me discover", as the "Suggest a setup" action of the Guardrails design).
// Pure and on demand. Inputs: the person's guardrails (set-up $, $ a month, minutes a week, space) and optional appeal tags. It takes a short
// list of archetypes (data/archetypes.json), sizes each to the space with tankfit, builds it with scene/builds.ts (the same three builds the
// "An animal I want" path shows) and keeps only what passes EVERY check, all from the existing engines:
//   - meetsNeeds (filtration / space within the build's own limit) and the stocking summary with no Problem (husbandry, never switchable);
//   - compliance() over ALL enabled guardrails, on known data (an unknown guardrail is never green; all off = nothing to pass);
// then ranks by appeal tags matched + headroom under each enabled limit and shows up to three, preferring different kinds (families).
// Nathan's solver rules (2026-10-27) bind it as they bind Find solutions: nothing is credited that the model does not support (no bigger-filter
// or auto-water-changer time savings: the build's own gear and the engine's own totals decide), costs and minutes are estimates, and when nothing
// qualifies the answer is exactly NO_SUGGESTION, never "impossible", with the closest misses (what limit to raise) listed apart, never as fits.
// Deterministic: fixed archetype order, scores, ties by id. Only the guardrails are filters; appeal tags only rank.
import data from '../data/archetypes.json';
import { getSpecies } from '../data/species';
import { tankFromModel } from '../data/tanks';
import { buildsFor, distinctBuilds, meetsNeeds, type Build } from '../scene/builds';
import { compliance, effectiveLimits, type Compliance, type Constraints } from '../scene/constraints';
import { spaceFit } from '../scene/space';
import { tankOptions, type AnimalCount } from '../scene/tankfit';
import type { SpaceLimit, TankSetup, Units } from '../scene/types';
import { summaryOf } from '../ui/stockSummary';
import { demandOf } from './engine';
import { NO_SUGGESTION, type Money } from './makefit';
import { mean3 } from './range';
import type { Limits, UserProfile } from './types';

export { NO_SUGGESTION };
export type Family = 'fish' | 'invert' | 'salt' | 'terrarium';
export type Tag = 'colorful' | 'active' | 'calm' | 'natural' | 'unusual' | 'low-maint';
export const TAGS: readonly { id: Tag; label: string }[] = [
  { id: 'colorful', label: 'Colorful' }, { id: 'active', label: 'Active' }, { id: 'calm', label: 'Calm' },
  { id: 'natural', label: 'Natural' }, { id: 'unusual', label: 'Unusual' }, { id: 'low-maint', label: 'Low maintenance' },
];
export const FAMILY_LABEL: Record<Family, string> = { fish: 'freshwater fish', invert: 'freshwater invertebrates', salt: 'saltwater', terrarium: 'terrarium animals' };
export interface Archetype { id: string; title: string; family: Family; tags: Tag[]; animals: AnimalCount[]; why: string }
export const ARCHETYPES = data.archetypes as unknown as Archetype[];

/** Equipment the person already has (lane C8, Nathan 2026-10-27). The model has no owned-gear concept, so this is the minimal version: an owned
 *  item's set-up price comes off the proposal's set-up cost (and so off the budget guardrail). The proposal's own item still counts for husbandry
 *  (an owned filter is assumed to be as good as the one the build needs); upkeep and minutes are unchanged. */
export type OwnedKey = 'filter' | 'heater' | 'light' | 'lid' | 'stand' | 'testkit' | 'dryheat';
export const OWNED: readonly { id: OwnedKey; label: string; rows: string[] }[] = [
  { id: 'filter', label: 'Filter', rows: ['filter'] }, { id: 'heater', label: 'Heater', rows: ['heater'] }, { id: 'light', label: 'Light', rows: ['light'] },
  { id: 'lid', label: 'Lid / hood', rows: ['lid'] }, { id: 'stand', label: 'Stand', rows: ['stand'] }, { id: 'testkit', label: 'Water test kit', rows: ['testkit'] },
  { id: 'dryheat', label: 'Terrarium heat lamp, UVB, thermostat, gauge', rows: ['heatlamp', 'thermostat', 'uvb', 'gauge'] },
];
/** Set-up dollars the owned items (and an unneeded stand) take off a build's price. The build's price carries its deals, so each row's list price is
 *  scaled by the build's own price / list-price ratio. Never below zero. */
export function ownedSavings(b: Build, owned: readonly OwnedKey[], needStand: boolean, P: UserProfile): number {
  const D = demandOf(b.setup, P), list = D.totals.setupUsd, k = list > 0 ? b.setupUsd / list : 1;
  const rows = new Set<string>([...(needStand ? [] : ['stand']), ...OWNED.filter(o => owned.includes(o.id) && (needStand || o.id !== 'stand')).flatMap(o => o.rows)]);
  return Math.min(b.setupUsd, Math.round(D.items.filter(i => rows.has(i.key) && i.setup).reduce((t, i) => t + mean3(i.setup!), 0) * k));
}

export interface Wants {
  /** equipment already owned (set-up price $0) */
  owned?: OwnedKey[];
  /** will the person need a stand? default true (today's builds are priced with one); false = no stand cost */
  needStand?: boolean;
  /** the guardrails the proposals are checked against (the same shape a tank stores) */
  constraints: Constraints;
  /** the space the tank must stand in, mm (read while the space guardrail is on) */
  space?: SpaceLimit;
  tags?: Tag[];
}
export interface Proposal {
  archetype: Archetype;
  build: Build;
  /** the scene a click opens: the build's tank with the guardrails and space set */
  scene: TankSetup;
  totals: Money;
  /** set-up dollars the owned equipment / unneeded stand took off */
  saved: number;
  status: Compliance['results'];
  score: number;
  /** husbandry lines that read "not enough information" (the setup is offered with this caveat) */
  unknown: string[];
  /** the tags the person asked for that this one has */
  matched: Tag[];
}
export interface Miss { archetype: Archetype; build: Build; totals: Money; needs: Partial<Money>; text: string }
export interface Suggestions {
  /** every guardrail is off: nothing to check against, proposals are ranked by appeal alone */
  off: boolean;
  proposals: Proposal[];
  /** every archetype that has a setup passing all checks (proposals shows at most three of them) */
  qualified: string[];
  /** the kinds (families) that have a setup passing every check */
  kinds: Family[];
  note?: string;
  /** closest setups that pass every check except a money / time cap, and what to raise (never presented as fits) */
  misses: Miss[];
  message?: string;
}

const money = (b: Build): Money => ({ startupUsd: b.setupUsd, monthlyUsd: b.upkeepUsdMo, minPerWeek: b.minPerWeek });
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const relaxSize = (x: Partial<Money>) => (x.startupUsd ?? 0) / 100 + (x.monthlyUsd ?? 0) / 10 + (x.minPerWeek ?? 0) / 10;
/** The tanks to try for an archetype: the sizes that hold the animals (smallest first), those that fit the space only, at most `n`. */
const tanksFor = (a: Archetype, space: SpaceLimit | undefined, n: number) =>
  tankOptions(a.animals).filter(t => !t.fails.length && (!space || spaceFit(tankFromModel(t.tank), space).fits)).slice(0, n).map(t => t.tank);

/** Mean share left under each enabled money / time cap (0..1); 1 with none on. */
function headroom(t: Money, L: Limits): number {
  const parts = ([[t.startupUsd, L.setupUsd], [t.monthlyUsd, L.upkeepUsd], [t.minPerWeek, L.minPerWeek]] as [number, number | undefined][]).filter((p): p is [number, number] => p[1] !== undefined && p[1] > 0);
  return parts.length ? parts.reduce((s, [v, c]) => s + Math.max(0, 1 - v / c), 0) / parts.length : 1;
}

const SIZES_PER_ARCHETYPE = 4;
export function suggestSetups(w: Wants, P0: UserProfile, units: Units = 'cm', now = Date.now()): Suggestions {
  const C = w.constraints, tags = w.tags ?? [];
  const space = C.space?.on === false ? undefined : w.space;
  const proposals: Proposal[] = [], misses: Miss[] = [];
  let anyOn = false;
  for (const a of ARCHETYPES) {
    if (a.animals.some(x => !getSpecies(x.species))) continue;
    let best: Proposal | undefined, near: Miss | undefined;
    for (const m of tanksFor(a, space, SIZES_PER_ARCHETYPE)) {
      for (const b of distinctBuilds(buildsFor(a.animals, m, now))) {
        if (!meetsNeeds(b)) continue;
        const needStand = w.needStand !== false, saved = ownedSavings(b, w.owned ?? [], needStand, P0);
        const scene: TankSetup = { ...b.setup, ...(needStand ? {} : { stand: { ...b.setup.stand, show: false } }), constraints: C, layout: { ...b.setup.layout, ...(w.space ? { space: w.space } : {}) } };
        const sm = summaryOf(scene, units);
        // husbandry is never traded for money or time: the strict rule (Nathan 2026-10-27) = nothing the stocking screen words as a Problem OR a
        // Caution in any of its five categories (past-ideal fullness, a short sex ratio, a missing cave ...). Only "not enough information" passes, and it is shown.
        if (sm.cats.some(c => c.level === 'problem' || c.level === 'caution')) continue;
        const t = { ...money(b), startupUsd: b.setupUsd - saved }, L = effectiveLimits(scene, P0.limits);
        const cp = compliance(scene, { setupUsd: t.startupUsd, upkeepUsdMo: t.monthlyUsd, minPerWeek: t.minPerWeek }, L, units);
        if (cp.overall !== 'off') anyOn = true;
        if (cp.overall === 'within' || cp.overall === 'off') {
          const matched = tags.filter(x => a.tags.includes(x));
          const p: Proposal = { archetype: a, build: b, scene, totals: t, saved, status: cp.results, score: matched.length * 10 + headroom(t, L) * 5, matched,
            unknown: sm.cats.flatMap(c => c.items.filter(i => i.level === 'unknown').map(i => i.text)).slice(0, 1) };
          if (!best || p.score > best.score || p.score === best.score && t.startupUsd < best.totals.startupUsd) best = p;
        } else if (cp.overall === 'over' && cp.unknown === 0 && !cp.results.some(r => r.id === 'space' && r.state !== 'pass')) {
          const needs: Partial<Money> = {};
          for (const r of cp.results) if (r.state === 'over') {
            if (r.id === 'startup') needs.startupUsd = Math.ceil(t.startupUsd - (L.setupUsd ?? 0));
            else if (r.id === 'monthly') needs.monthlyUsd = Math.ceil(t.monthlyUsd - (L.upkeepUsd ?? 0));
            else if (r.id === 'time') needs.minPerWeek = Math.ceil(t.minPerWeek - (L.minPerWeek ?? 0));
          }
          const text = [needs.startupUsd ? `+${usd(needs.startupUsd)} set-up` : '', needs.monthlyUsd ? `+${usd(needs.monthlyUsd)} a month` : '', needs.minPerWeek ? `+${needs.minPerWeek} min a week` : ''].filter(Boolean).join(', ');
          if (text && (!near || relaxSize(needs) < relaxSize(near.needs))) near = { archetype: a, build: b, totals: t, needs, text };
        }
      }
    }
    if (best) proposals.push(best); else if (near) misses.push(near);
  }
  // up to three: the best of each kind first, then the next best of a kind already shown (a different archetype); never a setup that failed a check
  const rank = (a: Proposal, b: Proposal) => b.score - a.score || a.archetype.id.localeCompare(b.archetype.id);
  const sorted = [...proposals].sort(rank), shown: Proposal[] = [];
  for (const p of sorted) if (shown.length < 3 && !shown.some(s => s.archetype.family === p.archetype.family)) shown.push(p);
  for (const p of sorted) if (shown.length < 3 && !shown.includes(p)) shown.push(p);
  shown.sort(rank);
  const kinds = [...new Set(sorted.map(p => p.archetype.family))];
  const out: Suggestions = { off: !anyOn, proposals: shown, qualified: sorted.map(p => p.archetype.id), kinds, misses: misses.sort((a, b) => relaxSize(a.needs) - relaxSize(b.needs)).slice(0, 3) };
  if (!shown.length) out.message = NO_SUGGESTION;
  else if (kinds.length < 3 && anyOn) out.note = `Only ${kinds.length === 1 ? 'one kind' : `${kinds.length} kinds`} of setup fit${kinds.length === 1 ? 's' : ''} your guardrails: ${kinds.map(k => FAMILY_LABEL[k]).join(', ')}.`;
  return out;
}
