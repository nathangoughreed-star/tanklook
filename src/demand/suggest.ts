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
import type { TankModel } from '../data/tanks';
import { buildsFor, distinctBuilds, FILTRATION_LIMIT, meetsNeeds, type Build } from '../scene/builds';
import { filterProduct, FILTER_PRODUCTS, heaterProduct, HEATER_PRODUCTS, lightProduct, lightsFor, LIGHT_PRODUCTS, productName, pumpProduct, pumpRatedFor, PUMP_PRODUCTS, skimmerSuitsGal, SKIMMER_PRODUCTS } from '../data/gearCatalog';
import { stockingOf } from '../scene/stocking';
import { heatLoss, techOf, withUnits } from '../scene/tech';
import { volume } from '../scene/physics';
import { finishTiers } from '../scene/finish';
import { compliance, effectiveLimits, type Compliance, type Constraints } from '../scene/constraints';
import { spaceFit } from '../scene/space';
import { fitIn, tankOptions, type AnimalCount } from '../scene/tankfit';
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
  /** set when the card uses well under the set-up budget because the animals' needs cap the build, not the money */
  capNote?: string;
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
/** The sizes that hold the animals (smallest first) and fit the space. */
const fitsFor = (animals: AnimalCount[], space: SpaceLimit | undefined) =>
  tankOptions(animals).filter(t => !t.fails.length && (!space || spaceFit(tankFromModel(t.tank), space).fits));

/** buildsFor, remembered for ten minutes of prices: Suggest asks for the same tank at several budgets. */
const BUILDS = new Map<string, Build[]>();
function buildsCached(animals: AnimalCount[], tank: TankModel, now: number): Build[] {
  const key = `${Math.floor(now / 600000)}|${tank.id}|${animals.map(x => x.species + x.n).join(',')}`;
  let r = BUILDS.get(key);
  if (!r) { r = distinctBuilds(buildsFor(animals, tank, now)); if (BUILDS.size >= 300) BUILDS.delete(BUILDS.keys().next().value!); BUILDS.set(key, r); }
  return r;
}

/** One thing to build: these animals in this tank. */
interface Rung { animals: AnimalCount[]; tank: TankModel }
/** No tank is offered bigger than this many times the smallest that holds the animals: "more room" stops where the animals gain nothing from it. */
const MAX_GROW = 5;
const FINISH_ALLOWANCE = 1.12;
/** Groups are offered at these multiples of the archetype's own count when the tank holds them (the most the stocking rules allow: each rung is rechecked). */
const STOCK_UP = [2, 1.5];
/**
 * The budget is a TARGET as well as a limit (Nathan 2026-10-27): with a set-up cap on, the rungs are the biggest tank whose cheapest build is under it
 * (found by bisection: cost only rises with size), one size down, and the top tank with a bigger group where its needs allow. `ceiling`: the top rung is
 * the biggest size the animals gain from, so a budget left over is the animals' limit, not the money's. With no set-up cap: the smallest sizes, as before.
 */
function rungsFor(a: Archetype, space: SpaceLimit | undefined, cap: number | undefined, now: number): { rungs: Rung[]; ceiling: boolean } {
  const fits = fitsFor(a.animals, space);
  if (!fits.length) return { rungs: [], ceiling: false };
  if (cap === undefined) return { rungs: fits.slice(0, 4).map(t => ({ animals: a.animals, tank: t.tank })), ceiling: false };
  const list = fits.filter(t => t.litres <= fits[0].litres * MAX_GROW);
  const cost = (i: number) => FINISH_ALLOWANCE * Math.min(Infinity, ...buildsCached(a.animals, list[i].tank, now).filter(meetsNeeds).map(b => b.setupUsd)); // the finish adds about this much to the cheapest build
  let lo = 0, hi = list.length - 1;
  if (cost(hi) > cap) { while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (cost(mid) <= cap) lo = mid; else hi = mid - 1; } hi = lo; }
  const top = list[hi], rungs: Rung[] = [{ animals: a.animals, tank: top.tank }];
  for (const i of new Set([hi - 1, 0])) if (i >= 0 && i < hi) rungs.push({ animals: a.animals, tank: list[i].tank }); // then one size down and the smallest, tried only while nothing has qualified
  if (a.animals.some(x => x.n >= 3)) for (const f of STOCK_UP) {
    const more = a.animals.map(x => ({ ...x, n: x.n >= 3 ? Math.round(x.n * f) : x.n }));
    const fit = fitIn(more, top.tank);
    if (fit && !fit.fails.length) { rungs.unshift({ animals: more, tank: top.tank }); break; }
  }
  return { rungs, ceiling: hi === list.length - 1 };
}

/** Mean share left under each enabled money / time cap (0..1); 1 with none on. The set-up cap is a target, not a headroom, when `target` (it is scored by how much of it is used). */
function headroom(t: Money, L: Limits, target = false): number {
  const parts = ([[t.startupUsd, target ? undefined : L.setupUsd], [t.monthlyUsd, L.upkeepUsd], [t.minPerWeek, L.minPerWeek]] as [number, number | undefined][]).filter((p): p is [number, number] => p[1] !== undefined && p[1] > 0);
  return parts.length ? parts.reduce((s, [v, c]) => s + Math.max(0, 1 - v / c), 0) / parts.length : 1;
}

/** The share of the set-up cap a card must use to count as using the budget; below it the card says why. */
export const USES_BUDGET = 0.85;
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
    const cap = C.startupUsd?.on ? C.startupUsd.value : undefined, { rungs, ceiling } = rungsFor(a, space, cap, now);
    for (const { animals: stock, tank: m } of rungs) {
      for (const b0 of buildsCached(stock, m, now)) {
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
          // a card that stops short because the animals' needs cap it (the biggest tank they gain from, at the fullest finish) is as good a use of the budget as the animals allow
          const limited = !!(ceiling && L.setupUsd && t.startupUsd < USES_BUDGET * L.setupUsd && b.finish?.level === 3);
          const p: Proposal = { archetype: a, build: b, scene, totals: t, saved, ownedNotes: own.notes, status: cp.results, matched,
            score: matched.length * 10 + headroom(t, L, !!L.setupUsd) * 5 + (L.setupUsd ? (limited ? 1 : Math.min(1, t.startupUsd / L.setupUsd)) * 20 : 0) + (b.finish?.level ?? 0) * 2,
            ...(limited ? { capNote: 'This is the most this kind needs: a bigger tank or more animals would not suit them, so part of your budget is left over.' } : {}),
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
      // the first rung that qualifies is the biggest the budget (or the animals) allows: the smaller rungs would only score lower, so they are not built
      if (best && cap !== undefined) break;
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
