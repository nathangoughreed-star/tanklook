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
import { buildsFor, distinctBuilds, FILTRATION_LIMIT, meetsNeeds, type Build } from '../scene/builds';
import { filterProduct, FILTER_PRODUCTS, heaterProduct, HEATER_PRODUCTS, lightProduct, lightsFor, LIGHT_PRODUCTS, productName, pumpProduct, pumpRatedFor, PUMP_PRODUCTS, skimmerSuitsGal, SKIMMER_PRODUCTS } from '../data/gearCatalog';
import { stockingOf } from '../scene/stocking';
import { heatLoss, techOf, withUnits } from '../scene/tech';
import { volume } from '../scene/physics';
import { finishTiers } from '../scene/finish';
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
/** What the person is building (Nathan 2026-10-27): a freshwater or saltwater aquarium; a terrarium (a land enclosure, water off); a vivarium (a mix of water and land: paludarium, riparium). */
export type Kind = 'freshwater' | 'saltwater' | 'terrarium' | 'vivarium';
export const KINDS: readonly { id: Kind; label: string; blurb: string }[] = [
  { id: 'freshwater', label: 'Freshwater aquarium', blurb: 'fish, shrimp, snails' }, { id: 'saltwater', label: 'Saltwater aquarium', blurb: 'marine fish and invertebrates' },
  { id: 'terrarium', label: 'Terrarium', blurb: 'a land enclosure' }, { id: 'vivarium', label: 'Vivarium', blurb: 'water and land together: paludarium, riparium' },
];
/** Inside a terrarium or vivarium: reptiles and amphibians, or arthropods (tarantulas, scorpions, isopods, mantises). */
export type DryGroup = 'herp' | 'arthropod';
export const DRY_GROUPS: readonly { id: DryGroup; label: string }[] = [{ id: 'herp', label: 'Reptiles & amphibians' }, { id: 'arthropod', label: 'Arthropods (tarantula, jumping spider; no scorpions, isopods or mantises yet)' }];
export interface Archetype { id: string; kind: Kind; group?: DryGroup; title: string; family: Family; tags: Tag[]; animals: AnimalCount[]; why: string }
export const ARCHETYPES = data.archetypes as unknown as Archetype[];

/** Equipment the person already has (lane C8, Nathan 2026-10-27). The model has no owned-gear concept, so this is the minimal version. Per ticked
 *  item the person picks: the real product from the catalogue (credited at its real spec: it goes into the tank and an undersized one is flagged,
 *  not credited); "I don't care" (credited $0, the setup's own spec assumed adequate); or "I don't know" (not credited: priced as bought, with a
 *  note to check). Credit = the item's set-up price comes off the proposal's set-up cost and so off the budget guardrail. Upkeep and minutes are
 *  unchanged. */
export type OwnedKey = 'filter' | 'heater' | 'light' | 'skimmer' | 'flow' | 'lid' | 'stand' | 'testkit' | 'dryheat';
/** 'care' = I don't care, 'unknown' = I don't know, anything else = a catalogue product id. */
export type OwnedPick = string;
export type OwnedMap = Partial<Record<OwnedKey, OwnedPick>>;
export const PICK_CARE = 'care', PICK_UNKNOWN = 'unknown';
export interface OwnedNote { kind: 'credit' | 'flag' | 'ask'; text: string }
interface OwnedDef {
  id: OwnedKey; label: string; rows: string[];
  /** catalogue products to pick from (absent: no catalogue for it) */
  products?: () => { id: string; label: string }[];
  /** the real product: undersized / does not fit -> a flag; else no flag, with the tank's tech changed when the product goes into it */
  check?: (b: Build, id: string) => { flag?: string; tech?: TankSetup['tech'] };
}
const galOf = (S: TankSetup) => volume(S.tank).litres / 3.785;
const nm = (p: { brand: string; model: string }) => productName(p);
export const OWNED: readonly OwnedDef[] = [
  { id: 'filter', label: 'Filter', rows: ['filter'],
    products: () => FILTER_PRODUCTS.map(f => ({ id: f.id, label: `${nm(f)} (${f.kind}${f.gph ? `, ${f.gph} gph` : ''})` })),
    check: (b, id) => { const f = filterProduct(id); if (!f || !b.setup.water.on) return {};
      const tech = withUnits(techOf(b.setup), 'filter', [{ kind: f.kind, product: f.id }]), pct = Math.round(stockingOf({ ...b.setup, tech }).filtrationPercent), lim = FILTRATION_LIMIT[b.id];
      return pct > lim ? { flag: `Your ${nm(f)} is too small for this setup (filtration ${pct}%, over ${lim}%): the setup's own filter is priced instead.` } : { tech }; } },
  { id: 'heater', label: 'Heater', rows: ['heater'],
    products: () => HEATER_PRODUCTS.map(h => ({ id: h.id, label: `${nm(h)} (${h.watts} W)` })),
    check: (b, id) => { const h = heaterProduct(id); if (!h || !b.setup.water.on) return {}; const need = heatLoss(b.setup).needW;
      return h.watts < need * 0.95 ? { flag: `Your ${nm(h)} (${h.watts} W) is under the ${Math.round(need)} W this tank needs: the setup's own heater is priced instead.` } : {}; } },
  { id: 'light', label: 'Light', rows: ['light'],
    products: () => LIGHT_PRODUCTS.map(l => ({ id: l.id, label: `${nm(l)} (${l.watts} W)` })),
    check: (b, id) => { const l = lightProduct(id); if (!l) return {};
      if (!lightsFor(b.setup.tank.L).some(x => x.id === l.id)) return { flag: `Your ${nm(l)} fits tanks ${Math.round(l.fitMinMm / 25.4)}-${Math.round(l.fitMaxMm / 25.4)} in long, not this ${Math.round(b.setup.tank.L / 25.4)} in one: the setup's own light is priced instead.` };
      return b.setup.water.salt && l.water === 'fresh' ? { flag: `Your ${nm(l)} is a freshwater light: the setup's own light is priced instead.` } : {}; } },
  { id: 'skimmer', label: 'Protein skimmer (saltwater)', rows: ['skimmer'],
    products: () => SKIMMER_PRODUCTS.map(k => ({ id: k.id, label: `${nm(k)} (rated ${k.ratedGal ?? '?'} gal)` })),
    check: (b, id) => { const k = SKIMMER_PRODUCTS.find(x => x.id === id), suits = k ? skimmerSuitsGal(k) : undefined;
      return k && suits !== undefined && galOf(b.setup) > suits ? { flag: `Your ${nm(k)} suits about ${Math.round(suits)} gal, under this ${Math.round(galOf(b.setup))} gal tank: the setup's own skimmer is priced instead.` } : {}; } },
  { id: 'flow', label: 'Powerhead / wavemaker', rows: ['flow'],
    products: () => PUMP_PRODUCTS.filter(p => p.kind !== 'air').map(p => ({ id: p.id, label: `${nm(p)} (${p.gph ?? '?'} gph)` })),
    check: (b, id) => { const p = pumpProduct(id); return p && pumpRatedFor(p, galOf(b.setup)) === false ? { flag: `Your ${nm(p)} is not rated for this ${Math.round(galOf(b.setup))} gal tank: the setup's own pump is priced instead.` } : {}; } },
  { id: 'lid', label: 'Lid / hood', rows: ['lid'] }, { id: 'stand', label: 'Stand', rows: ['stand'] }, { id: 'testkit', label: 'Water test kit', rows: ['testkit'] },
  { id: 'dryheat', label: 'Terrarium heat lamp, UVB, thermostat, gauge', rows: ['heatlamp', 'thermostat', 'uvb', 'gauge'] },
];
/** What owning each item does to a build: set-up dollars off, the tank's tech when an owned filter goes in, and a note per item. The build's price
 *  carries its deals, so each row's list price is scaled by the build's own price / list-price ratio. Never below zero. */
export function ownedAssess(b: Build, owned: OwnedMap, needStand: boolean, P: UserProfile): { saved: number; tech?: TankSetup['tech']; notes: OwnedNote[] } {
  const rows = new Set<string>(needStand ? [] : ['stand']), notes: OwnedNote[] = [];
  let tech: TankSetup['tech'];
  const D = demandOf(b.setup, P), present = new Set(D.items.map(i => i.key));
  for (const o of OWNED) {
    const pick = owned[o.id];
    if (!pick || (o.id === 'stand' && !needStand) || !o.rows.some(r => present.has(r))) continue;
    if (pick === PICK_UNKNOWN) { notes.push({ kind: 'ask', text: `Check your ${o.label.toLowerCase()}: not credited, the setup's own is priced.` }); continue; }
    const r = pick !== PICK_CARE && o.check ? o.check(b, pick) : {};
    if (r.flag) { notes.push({ kind: 'flag', text: r.flag }); continue; }
    if (r.tech) tech = r.tech;
    o.rows.forEach(x => rows.add(x));
    notes.push({ kind: 'credit', text: pick === PICK_CARE ? `Your ${o.label.toLowerCase()}: $0 (the setup's spec is assumed to suit it).` : `Your ${o.products?.().find(x => x.id === pick)?.label ?? o.label}: $0, ${r.tech ? "and used in the tank" : "checked against this tank"}.` });
  }
  const list = D.totals.setupUsd, k = list > 0 ? b.setupUsd / list : 1;
  const saved = Math.min(b.setupUsd, Math.round(D.items.filter(i => rows.has(i.key) && i.setup).reduce((t, i) => t + mean3(i.setup!), 0) * k));
  return { saved, ...(tech ? { tech } : {}), notes };
}

/** The sub-choice (reptiles & amphibians / arthropods) applies when Terrarium OR Vivarium is ticked. */
export const asksDryGroups = (kinds: readonly Kind[]) => kinds.includes('terrarium') || kinds.includes('vivarium');

export interface Wants {
  /** the kinds of setup wanted (default all four; at least one) */
  kinds?: Kind[];
  /** for a terrarium / vivarium: which animals (default both) */
  groups?: DryGroup[];
  /** equipment already owned (set-up price $0) */
  owned?: OwnedMap;
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
  /** what the owned equipment did: credited, flagged as too small / not fitting, or to check */
  ownedNotes: OwnedNote[];
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
  /** nothing is offered for what was ticked (not a guardrail result): there are no setups of that kind in the data yet */
  unavailable?: string;
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
  const wantKinds = w.kinds?.length ? w.kinds : KINDS.map(k => k.id), groups = w.groups?.length ? w.groups : DRY_GROUPS.map(g => g.id);
  const wanted = ARCHETYPES.filter(a => wantKinds.includes(a.kind) && (!a.group || groups.includes(a.group)));
  for (const a of wanted) {
    if (a.animals.some(x => !getSpecies(x.species))) continue;
    let best: Proposal | undefined, near: Miss | undefined;
    for (const m of tanksFor(a, space, SIZES_PER_ARCHETYPE)) {
      for (const b0 of distinctBuilds(buildsFor(a.animals, m, now))) {
        if (!meetsNeeds(b0)) continue;
        // a proposal is a FINISHED tank (lane C9, scene/finish.ts): the best finish tier (lush, full, starter) that still passes every check.
        // A build that already breaks a husbandry rule or a money / time cap before it is finished cannot be saved by plants (they only add), so it is not finished further.
        const needStand = w.needStand !== false;
        const scenOf = (b: Build, own: ReturnType<typeof ownedAssess>): TankSetup => ({ ...b.setup, ...(needStand ? {} : { stand: { ...b.setup.stand, show: false } }), ...(own.tech ? { tech: own.tech } : {}), constraints: C, layout: { ...b.setup.layout, ...(w.space ? { space: w.space } : {}) } });
        const own0 = ownedAssess(b0, w.owned ?? {}, needStand, P0), scene0 = scenOf(b0, own0);
        if (summaryOf(scene0, units).cats.some(c => c.level === 'problem' || c.level === 'caution')) continue;
        const over0 = compliance(scene0, { setupUsd: b0.setupUsd - own0.saved, upkeepUsdMo: b0.upkeepUsdMo, minPerWeek: b0.minPerWeek }, effectiveLimits(scene0, P0.limits), units).overall === 'over';
        for (const b of finishTiers(b0, now, over0)) {
        const own = ownedAssess(b, w.owned ?? {}, needStand, P0), saved = own.saved, scene = scenOf(b, own);
        const sm = summaryOf(scene, units);
        // husbandry is never traded for money or time: the strict rule (Nathan 2026-10-27) = nothing the stocking screen words as a Problem OR a
        // Caution in any of its five categories (past-ideal fullness, a short sex ratio, a missing cave ...). Only "not enough information" passes, and it is shown.
        if (sm.cats.some(c => c.level === 'problem' || c.level === 'caution')) continue;
        const t = { ...money(b), startupUsd: b.setupUsd - saved }, L = effectiveLimits(scene, P0.limits);
        const cp = compliance(scene, { setupUsd: t.startupUsd, upkeepUsdMo: t.monthlyUsd, minPerWeek: t.minPerWeek }, L, units);
        if (cp.overall !== 'off') anyOn = true;
        if (cp.overall === 'within' || cp.overall === 'off') {
          const matched = tags.filter(x => a.tags.includes(x));
          const p: Proposal = { archetype: a, build: b, scene, totals: t, saved, ownedNotes: own.notes, status: cp.results, score: matched.length * 10 + headroom(t, L) * 5 + (b.finish?.level ?? 0) * 2, matched,
            unknown: sm.cats.flatMap(c => c.items.filter(i => i.level === 'unknown').map(i => i.text)).slice(0, 1) };
          if (!best || p.score > best.score || p.score === best.score && t.startupUsd < best.totals.startupUsd) best = p;
          break; // the best finish that passes: a lesser tier of the same build adds nothing
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
  if (!wanted.length) out.unavailable = 'There are no setups of that kind to suggest yet. Tick another kind.';
  else if (!shown.length) out.message = NO_SUGGESTION;
  else if (kinds.length < 3 && anyOn) out.note = `Only ${kinds.length === 1 ? 'one kind' : `${kinds.length} kinds`} of setup fit${kinds.length === 1 ? 's' : ''} your guardrails: ${kinds.map(k => FAMILY_LABEL[k]).join(', ')}.`;
  return out;
}
