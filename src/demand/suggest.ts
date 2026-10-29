// Suggest a setup (lane C8, 2026-10-27; start-flow spec (d) "Help me discover", as the "Suggest a setup" action of the Guardrails design).
// Pure and on demand. Inputs: the person's guardrails (set-up $, $ a month, minutes a week, space) and optional appeal tags. It takes a short
// list of archetypes (data/archetypes.json), sizes each to the space with tankfit, builds it with scene/builds.ts (the same three builds the
// "An animal I want" path shows) and keeps only what passes EVERY check, all from the existing engines:
//   - meetsNeeds (filtration / space within the build's own limit) and the stocking summary with no Problem (husbandry, never switchable);
//   - compliance() over ALL enabled guardrails, on known data (an unknown guardrail is never green; all off = nothing to pass);
// Lane U2 (2026-10-28, unified setup plan): a POOL of candidates (archetype x tank size x design strategy x finish tier; the strategies are named in STRATEGIES) is filtered by welfare (the
// strict stocking rule above) and the hard constraints (the set-up ceiling INCLUDING tax, longest tank, space, an existing tank), then selectDiverse picks the strongest 2-3 that are
// MEANINGFULLY DIFFERENT (conceptDistance). The set-up budget is a CEILING, not a target: a cheaper concept is neither penalised nor rewarded; `climb` brings the old target behaviour back
// (the finish tier and tank climb as far as the ceiling lets them). Locked animals (Wants.animals) are never changed: only economy / aquascape / equipment / room to grow vary.
// Nathan's solver rules (2026-10-27) bind it as they bind Find solutions: nothing is credited that the model does not support (no bigger-filter
// or auto-water-changer time savings: the build's own gear and the engine's own totals decide), costs and minutes are estimates, and when nothing
// qualifies the answer is exactly NO_SUGGESTION, never "impossible", with the closest misses (what limit to raise) listed apart, never as fits.
// Deterministic: fixed archetype order, scores, ties by id. Only the guardrails are filters; appeal tags only rank.
import data from '../data/archetypes.json';
import { getSpecies } from '../data/species';
import { getTankModel, modelOfVariant, tankFromModel } from '../data/tanks';
import { DEALS, dealAsKit } from '../data/deals';
import type { TankModel } from '../data/tanks';
import { buildsFor, configKey, distinctBuilds, FILTRATION_LIMIT, meetsNeeds, type Build, type BuildId } from '../scene/builds';
import { filterProduct, FILTER_PRODUCTS, heaterProduct, HEATER_PRODUCTS, lightProduct, lightsFor, LIGHT_PRODUCTS, productName, pumpProduct, pumpRatedFor, PUMP_PRODUCTS, skimmerSuitsGal, SKIMMER_PRODUCTS } from '../data/gearCatalog';
import { stockingOf } from '../scene/stocking';
import { heatLoss, techOf, withUnits } from '../scene/tech';
import { volume } from '../scene/physics';
import { finishTiers } from '../scene/finish';
import { compliance, effectiveLimits, type Compliance, type Constraints } from '../scene/constraints';
import { spaceFit } from '../scene/space';
import { LAYOUTS } from '../scene/items';
import { rankStyles } from '../scene/scapes';
import { allLand, fitIn, isMixed, needsOf, tankOptions, type AnimalCount } from '../scene/tankfit';
import type { LayoutId, SpaceLimit, TankSetup, Units } from '../scene/types';
import { summaryOf } from '../ui/stockSummary';
import { briefToWants, type Brief } from '../scene/brief';
import { costLines, layerTotals, type CostLine, type Layer } from './costlines';
import { demandOf } from './engine';
import { NO_SUGGESTION, type Money } from './makefit';
import { mean3 } from './range';
import { explainInfeasible, phasesOf, type Infeasible, type Phases } from './infeasible';
import type { Limits, UserProfile } from './types';
import { tasteBonus, type Taste } from './taste';

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
export const DRY_GROUPS: readonly { id: DryGroup; label: string }[] = [{ id: 'herp', label: 'Reptiles & amphibians' }, { id: 'arthropod', label: 'Arthropods (tarantulas, scorpion, millipede, roach, isopods, mantis, stick insect, hermit crab, jumping spider)' }];
export interface Archetype { id: string; kind: Kind; group?: DryGroup; title: string; family: Family; tags: Tag[]; animals: AnimalCount[]; why: string }
export const ARCHETYPES = data.archetypes as unknown as Archetype[];

/** Equipment the person already has (lane C8, Nathan 2026-10-27). The model has no owned-gear concept, so this is the minimal version. Per ticked
 *  item the person picks: the real product from the catalogue (credited at its real spec: it goes into the tank and an undersized one is flagged,
 *  not credited); "I don't care" (credited $0, the setup's own spec assumed adequate); or "I don't know" (not credited: priced as bought, with a
 *  note to check). Credit = the item's set-up price comes off the proposal's set-up cost and so off the budget guardrail. Upkeep and minutes are
 *  unchanged. */
export type OwnedKey = 'filter' | 'heater' | 'light' | 'skimmer' | 'flow' | 'lid' | 'stand' | 'testkit' | 'dryheat' | 'siphon' | 'net' | 'conditioner' | 'thermometer' | 'bucket';
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
  { id: 'siphon', label: 'Siphon / gravel vacuum', rows: ['siphon'] }, { id: 'net', label: 'Fish net', rows: ['net'] }, { id: 'conditioner', label: 'Dechlorinator', rows: ['startconditioner'] },
  { id: 'thermometer', label: 'Thermometer', rows: ['thermometer'] }, { id: 'bucket', label: 'Bucket', rows: ['bucket'] },
  { id: 'dryheat', label: 'Terrarium heat lamp, UVB, thermostat, gauge', rows: ['heatlamp', 'thermostat', 'uvb', 'gauge'] },
];
/** What owning each item does to a build: set-up dollars off, the tank's tech when an owned filter goes in, and a note per item. The build's price
 *  carries its deals, so each row's list price is scaled by the build's own price / list-price ratio. Never below zero. */
export function ownedAssess(b: Build, owned: OwnedMap, needStand: boolean, P: UserProfile, ownTank = false): { saved: number; tech?: TankSetup['tech']; notes: OwnedNote[]; rows: string[] } {
  const rows = new Set<string>(needStand ? [] : ['stand']), notes: OwnedNote[] = [];
  let tech: TankSetup['tech'];
  const D = demandOf(b.setup, P, b.bundle ? { kit: dealAsKit(b.bundle) } : {}), present = new Set(D.items.map(i => i.key)); // a bundle's rows are priced with its kit, so the credits scale against the build's real total (lane U5)
  if (ownTank && present.has('tank')) { rows.add('tank'); notes.push({ kind: 'credit', text: 'Your tank: $0 (the generator only offers setups this tank holds).' }); }
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
  return { saved, ...(tech ? { tech } : {}), notes, rows: [...rows] };
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
  /** the guardrails the proposals are checked against (the same shape a tank stores). The set-up cap is a CEILING (lane U2): a concept that costs less is not penalised. */
  constraints: Constraints;
  /** the space the tank must stand in, mm (read while the space guardrail is on) */
  space?: SpaceLimit;
  tags?: Tag[];
  /** LOCKED animals (lane U2): the generator never changes them. Setups are then varied by economy / aquascape / equipment quality / room to grow only. */
  animals?: AnimalCount[];
  /** hard constraint: no tank longer than this, mm */
  maxLengthMm?: number;
  /** an EXISTING tank: the only tank offered, credited $0 ("you have"); a concept with no setup that this tank holds is not offered (never silently resized) */
  ownTank?: TankModel;
  /** sales tax, percent of the set-up purchase (default 0, editable); the all-in total and the budget ceiling both include it */
  taxPct?: number;
  /** the person wants to spend what they set (the old "target" behaviour, lane C9): every concept's finish tier climbs as far as the ceiling lets it, and the tank grows with the money.
   *  Off (default): each concept keeps its own tier (the ladder only decides how far UP a concept may climb). */
  climb?: boolean;
  /** hours of set-up effort the person will spend (from the brief, lane U1; not read by the generator yet) */
  setupHours?: number;
  /** the high-tech approach is a requirement (lane U4): only finishes with CO2 and a stronger light (the standard and lush tiers) are offered, so the look is not traded for a cheaper approach silently */
  hightech?: boolean;
  /** the planted look without CO2 (lane U5): the low-tech lush finish (dense live plants chosen for the light the tank has, liquid ferts only) is offered, then the basic and starter finishes */
  lowtech?: boolean;
  /** what the look picker's picks and rejections taught (lane NG5): adds to the score of concepts in a liked look, subtracts for a rejected one; ranking only, after every gate */
  taste?: Taste;
  /** buy in phases (lane U4): the set-up ceiling is checked against the animal-care essentials only; the animals are a second purchase after the tank has cycled (each concept carries its `phases`) */
  phased?: boolean;
  /** refinement chips (lane U6): "more planted" = every concept reaches for the lushest finish the ceiling carries (live, dense plants) */
  planted?: boolean;
  /** refinement chips (lane U6): "larger tank" = every concept sits one size up from where its strategy would (the ceiling and the animals still cap it) */
  larger?: boolean;
}

/** The design strategies a concept is built on (lane U2). Open animals: economy / size / look / balanced. Locked animals: economy / aquascape (look) / equipment / room (size). */
export type StrategyId = 'economy' | 'size' | 'look' | 'balanced' | 'equipment' | 'scape';
interface StrategyDef { /** a different aquascape style from the best-suited one */ scape?: true; id: StrategyId; size: 'small' | 'mid' | 'top'; build: BuildId; level: 0 | 1 | 2 | 3; grow?: boolean; label: string; lockedLabel?: string; blurb: string }
const STRATEGIES: readonly StrategyDef[] = [
  { id: 'economy', size: 'small', build: 'cheapest', level: 0, label: 'Cheapest start', lockedLabel: 'Economy', blurb: 'The smallest tank that holds them, the cheapest gear and a starter finish: the lowest all-in cost that still passes every check.' },
  { id: 'size', size: 'top', build: 'cheapest', level: 1, grow: true, label: 'Size first', lockedLabel: 'Room to grow', blurb: 'The biggest tank the ceiling and the animals allow, a basic finish: room and stability before looks.' },
  { id: 'look', size: 'mid', build: 'cheapest', level: 3, label: 'Look first', lockedLabel: 'Aquascape first', blurb: 'A mid-size tank at the lushest finish: plants, hardscape and the light and feeding that keep them.' },
  { id: 'balanced', size: 'mid', build: 'balanced', level: 2, label: 'Balanced', blurb: 'A mid-size tank, filter headroom and a full finish.' },
  { id: 'equipment', size: 'mid', build: 'leastWork', level: 1, label: 'Equipment quality', lockedLabel: 'Equipment quality', blurb: 'Gear that takes chores off your hands (the least-work build) in a mid-size tank, a basic finish.' },
  { id: 'scape', scape: true, size: 'mid', build: 'cheapest', level: 2, label: 'Different look', lockedLabel: 'Alternative aquascape', blurb: 'The same kind of animals in another aquascape style: different plants, hardscape and mood.' },
];
const OPEN_STRATEGIES: StrategyId[] = ['economy', 'size', 'look', 'balanced', 'scape'], LOCKED_STRATEGIES: StrategyId[] = ['economy', 'look', 'scape', 'equipment', 'size'];
export const strategyLabel = (id: StrategyId, locked = false) => { const d = STRATEGIES.find(x => x.id === id)!; return locked && d.lockedLabel ? d.lockedLabel : d.label; };

export interface Proposal {
  archetype: Archetype;
  build: Build;
  /** the scene a click opens: the build's tank with the guardrails and space set */
  scene: TankSetup;
  /** ALL-IN: startupUsd is set-up cost after owned credits and with sales tax (costLines sums to it exactly) */
  totals: Money;
  /** set-up dollars the owned equipment / unneeded stand took off */
  saved: number;
  /** the set-up total before tax, after owned credits, and the tax on it (taxPct, default 0) */
  preTaxUsd: number;
  taxUsd: number;
  taxPct: number;
  /** what the owned equipment did: credited, flagged as too small / not fitting, or to check */
  ownedNotes: OwnedNote[];
  status: Compliance['results'];
  score: number;
  /** husbandry lines that read "not enough information" (the setup is offered with this caveat) */
  unknown: string[];
  /** the tags the person asked for that this one has */
  matched: Tag[];
  /** the set-up total itemised (tank, stand, finish, animals, gear, supplies, tax; owned items $0) */
  costLines: CostLine[];
  /** the cost lines summed by the four standards (welfare / complete / display / enhancements) and sales tax, those with money only (lane U5) */
  layers: { layer: Layer; label: string; usd: number }[];
  /** set when the card uses well under the set-up budget because the animals' needs cap the build, not the money (only while `climb` is on) */
  capNote?: string;
  /** the design strategy this concept was built on, with its name and one-line meaning (lane U2) */
  strategy: StrategyId;
  strategyLabel: string;
  strategyBlurb: string;
  /** dollars left under the set-up ceiling (information only: never scored) */
  underCeilingUsd?: number;
  /** what this concept gives up for what it gains, in one or two plain sentences with the real numbers (welfare is never one of the things traded) */
  tradeoff: string;
  /** how hands-on the concept is, 0 (simple) .. 1 (demanding); experience shapes how it ranks and what the guidance says, and never removes a concept */
  complexity: number;
  /** buy-in-phases plan (only when the brief asks for phases): what to buy first, what after the tank has cycled */
  phases?: Phases;
  /** guidance for the person's experience level when it matters (a demanding build for a beginner, a very simple one for an expert) */
  experienceNote?: string;
}
export type LimitingFactor = 'budget' | 'upkeep' | 'time' | 'space' | 'tank' | 'animals' | 'welfare';
export type { Alternative, AltEdit, Infeasible, Phases } from './infeasible';
export interface Miss { archetype: Archetype; build: Build; totals: Money; needs: Partial<Money>; text: string }
export interface Suggestions {
  /** every guardrail is off: nothing to check against, proposals are ranked by appeal alone */
  off: boolean;
  proposals: Proposal[];
  /** every archetype that has a setup passing all checks (proposals shows at most three concepts) */
  qualified: string[];
  /** the kinds (families) that have a setup passing every check */
  kinds: Family[];
  note?: string;
  /** closest setups that pass every check except a money / time cap, and what to raise (never presented as fits) */
  misses: Miss[];
  message?: string;
  /** nothing is offered for what was ticked (not a guardrail result): there are no setups of that kind in the data yet */
  unavailable?: string;
  /** nothing qualified: WHY, as data (lane U4 words it and adds alternatives): the factor that limits the request and what would change the answer */
  infeasible?: Infeasible;
  /** the cheapest concept that passed every check, whatever the ceiling said about money (lane U4 uses it for 'the cheapest honest build is $N'); absent when nothing passed */
  cheapest?: Proposal;
  /** the pool the three were chosen from: valid concepts, and how many candidates welfare (the strict stocking rule) or a hard constraint turned away */
  stats: { pool: number; rejectedWelfare: number; rejectedConstraint: number };
}

const money = (b: Build): Money => ({ startupUsd: b.setupUsd, monthlyUsd: b.upkeepUsdMo, minPerWeek: b.minPerWeek });
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const relaxSize = (x: Partial<Money>) => (x.startupUsd ?? 0) / 100 + (x.monthlyUsd ?? 0) / 10 + (x.minPerWeek ?? 0) / 10;
/** The sizes that hold the animals (smallest first) and fit the space and the longest tank allowed. */
const fitsFor = (animals: AnimalCount[], space: SpaceLimit | undefined, maxLengthMm?: number) =>
  tankOptions(animals).filter(t => !t.fails.length && (!space || spaceFit(tankFromModel(t.tank), space).fits) && (!maxLengthMm || t.tank.outer.L <= maxLengthMm));

/** buildsFor, remembered for ten minutes of prices: Suggest asks for the same tank at several budgets. */
const BUILDS = new Map<string, Build[]>();
function buildsCached(animals: AnimalCount[], tank: TankModel, now: number): Build[] {
  const key = `${Math.floor(now / 600000)}|${tank.id}|${animals.map(x => x.species + x.n).join(',')}`;
  let r = BUILDS.get(key);
  if (!r) { r = distinctBuilds(buildsFor(animals, tank, now)); if (BUILDS.size >= 300) BUILDS.delete(BUILDS.keys().next().value!); BUILDS.set(key, r); }
  return r;
}

/** No tank is offered bigger than this many times the smallest that holds the animals: "more room" stops where the animals gain nothing from it. */
const MAX_GROW = 5;
const FINISH_ALLOWANCE = 1.12;
/** Groups are offered at these multiples of the archetype's own count when the tank holds them (the most the stocking rules allow: each rung is rechecked). Open animals only. */
const STOCK_UP = [2, 1.5];

interface Sizes { list: TankModel[]; top: number; ceiling: boolean }
/**
 * The tank sizes a concept can use, smallest first, and the index of the biggest one the ceiling allows (found by bisection on the cheapest build's cost, which
 * only rises with size; `taxK` = 1 + the tax rate). `ceiling`: that top size is the biggest the animals gain from, so a ceiling left over is the animals' limit, not the money's.
 * An existing tank is the only size. No set-up cap: the four smallest sizes.
 */
function sizesFor(animals: AnimalCount[], w: Wants, space: SpaceLimit | undefined, cap: number | undefined, taxK: number, now: number): Sizes {
  if (w.ownTank) {
    const t = w.ownTank, f = fitIn(animals, t);
    const ok = f && !f.fails.length && (!space || spaceFit(tankFromModel(t), space).fits) && (!w.maxLengthMm || t.outer.L <= w.maxLengthMm);
    return ok ? { list: [t], top: 0, ceiling: true } : { list: [], top: 0, ceiling: false };
  }
  const fits = fitsFor(animals, space, w.maxLengthMm);
  if (!fits.length) return { list: [], top: 0, ceiling: false };
  if (cap === undefined) { const list = fits.slice(0, 4).map(t => t.tank); return { list, top: list.length - 1, ceiling: false }; }
  const list = fits.filter(t => t.litres <= fits[0].litres * MAX_GROW).map(t => t.tank);
  const cost = (i: number) => taxK * FINISH_ALLOWANCE * Math.min(Infinity, ...buildsCached(animals, list[i], now).filter(meetsNeeds).map(b => b.setupUsd)); // the finish adds about this much to the cheapest build
  let lo = 0, hi = list.length - 1;
  if (cost(hi) > cap) { while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (cost(mid) <= cap) lo = mid; else hi = mid - 1; } hi = lo; }
  return { list, top: hi, ceiling: hi === list.length - 1 };
}

/** Mean share left under each enabled upkeep / time cap (0..1); 1 with none on. The set-up cap is a ceiling: it is never scored (no reward for spending, none for saving). */
function headroom(t: Money, L: Limits): number {
  const parts = ([[t.monthlyUsd, L.upkeepUsd], [t.minPerWeek, L.minPerWeek]] as [number, number | undefined][]).filter((p): p is [number, number] => p[1] !== undefined && p[1] > 0);
  return parts.length ? parts.reduce((s, [v, c]) => s + Math.max(0, 1 - v / c), 0) / parts.length : 1;
}

/** The share of the set-up cap a card must use to count as using the budget when `climb` is on; below it the card says why. */
export const USES_BUDGET = 0.85;

/** The locked animals as an archetype: the catalogue one when the list is exactly its animals, else a plain one named after them (no tags). Undefined for an unknown species. */
export function lockedArchetype(animals: AnimalCount[]): Archetype | undefined {
  const live = animals.filter(a => a.n > 0);
  if (!live.length || live.some(a => !getSpecies(a.species))) return undefined;
  const sig = (l: AnimalCount[]) => l.map(a => a.species + a.n).sort().join(',');
  const same = ARCHETYPES.find(a => sig(a.animals) === sig(live));
  if (same) return same;
  const salt = needsOf(live).salt, land = allLand(live), mixed = isMixed(live);
  const kind: Kind = land ? 'terrarium' : mixed ? 'vivarium' : salt ? 'saltwater' : 'freshwater', family: Family = land || mixed ? 'terrarium' : salt ? 'salt' : 'fish';
  const names = live.map(a => `${a.n > 1 ? a.n + ' ' : ''}${getSpecies(a.species)!.name}`);
  return { id: 'locked-' + sig(live), kind, family, title: names.join(', '), tags: [], animals: live, why: 'The animals you chose.' };
}

/** How different two concepts are (0..1): the kind of animal (family), the archetype, the tank, the finish tier, the price band, the strategy, the aquascape style. Weights sum to 1. */
export function conceptDistance(a: Proposal, b: Proposal): number {
  const hi = Math.max(a.totals.startupUsd, b.totals.startupUsd), lo = Math.min(a.totals.startupUsd, b.totals.startupUsd);
  return (a.archetype.family !== b.archetype.family ? 0.2 : 0) + (a.archetype.id !== b.archetype.id ? 0.2 : 0) + (a.build.tank.id !== b.build.tank.id ? 0.15 : 0)
    + ((a.build.finish?.tier ?? '') !== (b.build.finish?.tier ?? '') ? 0.1 : 0) + (hi > 0 && (hi - lo) / hi >= 0.25 ? 0.1 : 0) + (a.strategy !== b.strategy ? 0.15 : 0)
    + ((a.build.finish?.style ?? '') !== (b.build.finish?.style ?? '') ? 0.1 : 0);
}
/** A pick must differ from every concept already chosen by at least this much, unless nothing does. */
export const MIN_DISTANCE = 0.3;
const DIVERSITY_WEIGHT = 14;

/** Up to `n` of the pool: the strongest first, then each next one maximising its own score plus DIVERSITY_WEIGHT x its distance to the nearest already chosen (never under MIN_DISTANCE while any other clears it). */
export function selectDiverse(pool: Proposal[], n = 3): Proposal[] {
  const rank = (a: Proposal, b: Proposal) => b.score - a.score || a.archetype.id.localeCompare(b.archetype.id) || a.strategy.localeCompare(b.strategy);
  const left = [...pool].sort(rank), out: Proposal[] = [];
  if (left.length) out.push(left.shift()!);
  while (out.length < n && left.length) {
    const val = (p: Proposal) => ({ p, d: Math.min(...out.map(o => conceptDistance(o, p))) });
    const scored = left.map(val), far = scored.filter(x => x.d >= MIN_DISTANCE), from = far.length ? far : scored;
    const best = from.reduce((m, x) => x.p.score + DIVERSITY_WEIGHT * x.d > m.p.score + DIVERSITY_WEIGHT * m.d ? x : m, from[0]);
    if (!far.length) break; // the rest are near-copies of what is shown: three concepts that mean something beat three that look alike
    out.push(best.p); left.splice(left.indexOf(best.p), 1);
  }
  return out.sort(rank);
}

type StyleId = Exclude<LayoutId, 'none'>;
/** How hands-on a concept is (0..1): the minutes a week, salt water, a CO2 rig, a very small volume (little margin for error). Inputs are the build's own numbers, nothing new is modelled. */
function complexityOf(b: Build, S: TankSetup): number {
  const rows = S.water.on ? techOf(S).rows : {}, co2 = rows.co2 && rows.co2 !== 'none' ? 0.15 : 0, small = S.water.on && b.tank.ratedGal < 10 ? 0.1 : 0;
  return Math.min(1, Math.min(b.minPerWeek, 120) / 120 * 0.5 + (S.water.on && S.water.salt ? 0.25 : 0) + co2 + small + (b.finish?.level === 3 ? 0.1 : 0));
}
function experienceNote(exp: 0 | 1 | 2 | undefined, cx: number, min: number): string | undefined {
  if (exp === 0 && cx >= 0.5) return `More hands-on than a first tank usually needs (about ${Math.round(min)} min a week, more to learn): fine if you enjoy it.`;
  if (exp === 2 && cx < 0.2) return 'A simple build: you could take it further (more plants, stronger light, CO2) if you want a project.';
  return undefined;
}
/** The stand's price in this build (list price scaled by the build's deals), for the "no stand" trade-off line. */
const standCost = (b: Build, P: UserProfile) => { const D = demandOf(b.setup, P), r = D.items.find(i => i.key === 'stand'), k = D.totals.setupUsd > 0 ? b.setupUsd / D.totals.setupUsd : 1; return r?.setup ? Math.round(mean3(r.setup) * k) : 0; };
/** One or two plain sentences: what this concept gains and what it gives up, with the real numbers. Welfare is never on the list (it is a gate, not a trade). */
/** The tanks of the current kit deals (a starter kit that includes tank, filter and heater, not sold out), each as the maker's own variant of its catalogue tank, when the animals fit in it (lane U5). */
function kitTanks(animals: AnimalCount[], now: number, smallest: TankModel): TankModel[] {
  const out: TankModel[] = [], cap = smallest.ratedGal * 2; // speed: kits within double the smallest size, the two cheapest
  for (const d of [...DEALS].sort((x, y) => x.price.usd - y.price.usd)) {
    if (d.terrarium || d.gal > cap || d.gal < smallest.ratedGal || !['tank', 'filter', 'heater'].every(k => d.includes.includes(k as never)) || (d.saleEnds && Date.parse(d.saleEnds) < now)) continue;
    const cat = d.tank ? getTankModel(d.tank) : undefined; if (!cat) continue;
    const m = d.dims ? modelOfVariant(cat, d.dims) : cat, f = fitIn(animals, m);
    if (f && !f.fails.length) out.push(m);
  }
  return out.slice(0, 2);
}
function tradeoffOf(p: Pick<Proposal, 'build' | 'totals' | 'underCeilingUsd'>, sd: StrategyDef, needStand: boolean, standUsd: number): string {
  const gal = Math.round(p.build.tank.ratedGal), tier = p.build.finish?.tier, left = p.underCeilingUsd ? ` ${usd(p.underCeilingUsd)} stays under your ceiling.` : '';
  const stand = !needStand && standUsd > 0 ? ` No stand: it sits on a sturdy counter or dresser (a stand would add about ${usd(standUsd)}).` : '';
  const finishWord = tier === 'starter' ? 'a starter finish (few plants, a little hardscape)' : tier === 'lean' ? 'a basic finish' : tier === 'standard' ? 'a full finish' : 'a lush finish';
  const t: Record<StrategyId, string> = {
    economy: `Lowest cost: the smallest tank that holds them (${gal} gal) and ${finishWord}, so less room and a plainer look.${left}`,
    size: `Room first: ${gal} gal gives stability and space; the money goes to the tank, so ${finishWord}.${left}`,
    look: `Look first: ${finishWord} in ${gal} gal; more plants mean more light and feeding (about ${Math.round(p.totals.minPerWeek)} min a week) and less room than the biggest tank.${left}`,
    balanced: `A middle path: ${gal} gal, a filter with headroom and ${finishWord}; nothing is stretched, nothing is the best it could be.${left}`,
    equipment: `Easier upkeep: gear that saves chores costs more than the plainest gear, in ${gal} gal with ${finishWord}.${left}`,
    scape: `Same animals, another look (${p.build.finish ? LAYOUTS[p.build.finish.style].label : 'a different style'}): ${finishWord} in ${gal} gal; the cost is close to the other looks, the mood is different.${left}`,
  };
  return t[sd.id] + stand;
}

/** The entry point for a setup brief (lane U1/U2): locks, hard items and the experience level are read through the adapter; the brief wins over any Constraints a caller keeps beside it. */
export function suggestFromBrief(b: Brief, P0: UserProfile, units: Units = 'cm', now = Date.now()): Suggestions { return suggestSetups(briefToWants(b), P0, units, now); }
export function suggestSetups(w: Wants, P0: UserProfile, units: Units = 'cm', now = Date.now()): Suggestions {
  const cap = w.constraints.startupUsd?.on ? w.constraints.startupUsd.value : undefined;
  if (w.phased && cap !== undefined) {
    // phased purchase: money is checked on the essentials only; the animals come after the tank has cycled
    const off = { ...w, phased: false, constraints: { ...w.constraints, startupUsd: { ...w.constraints.startupUsd!, on: false } } };
    const r = generate(off, P0, units, now, false), all = [...r.proposals, ...(r.cheapest ? [r.cheapest] : [])];
    const ok = all.map(p => ({ ...p, phases: phasesOf(p) })).filter(p => p.phases.phase1Usd <= cap).map(p => ({ ...p, scene: { ...p.scene, constraints: w.constraints } }));
    const shown = r.proposals.map(p => ok.find(q => q.build === p.build)).filter((p): p is typeof ok[number] => !!p);
    const use = shown.length ? shown : ok.slice(0, 1);
    if (use.length) return { ...r, off: false, proposals: use, misses: [], message: undefined, infeasible: undefined, note: `Phased: ${usd(cap)} covers the essentials now; the animals are bought after the tank has cycled.` };
    return generate({ ...w, phased: false }, P0, units, now, true);
  }
  return generate(w, P0, units, now, true);
}
function generate(w: Wants, P0: UserProfile, units: Units, now: number, explain: boolean): Suggestions {
  const C = w.constraints, tags = w.tags ?? [], taxPct = Math.min(25, Math.max(0, w.taxPct ?? 0)), taxK = 1 + taxPct / 100;
  const space = C.space?.on === false ? undefined : w.space;
  const pool: Proposal[] = [], misses: Miss[] = [];
  const stats = { pool: 0, rejectedWelfare: 0, rejectedConstraint: 0 };
  let anyOn = false;
  const locked = w.animals?.some(a => a.n > 0) ? lockedArchetype(w.animals) : undefined, isLocked = !!w.animals?.some(a => a.n > 0);
  const wantKinds = w.kinds?.length ? w.kinds : KINDS.map(k => k.id), groups = w.groups?.length ? w.groups : DRY_GROUPS.map(g => g.id);
  const wanted = isLocked ? (locked ? [locked] : []) : ARCHETYPES.filter(a => wantKinds.includes(a.kind) && (!a.group || groups.includes(a.group)));
  const cap = C.startupUsd?.on ? C.startupUsd.value : undefined;
  /** A stand is priced unless the person said otherwise; the cheapest-start concept of a small tank (10 gal or less, about 100 lb full) is offered on a sturdy counter instead, and says so. */
  const standFor = (tank: TankModel, noStand: boolean) => w.needStand ?? !(noStand && tank.ratedGal <= 10);
  const ownedMap = w.owned ?? {};
  const ownsKitPart = (inc: readonly string[]) => OWNED.some(o => o.id in ownedMap && o.rows.some(r => inc.includes(r)));
  const scenOf = (b: Build, own: ReturnType<typeof ownedAssess>, needStand: boolean): TankSetup => ({ ...b.setup, ...(needStand ? {} : { stand: { ...b.setup.stand, show: false } }), ...(own.tech ? { tech: own.tech } : {}), constraints: C, layout: { ...b.setup.layout, ...(w.space ? { space: w.space } : {}) } });
  const taxOf = (preTax: number) => Math.round(Math.max(0, preTax) * taxPct / 100);
  const wordsOf = (cats: ReturnType<typeof summaryOf>['cats']) => cats.some(c => c.level === 'problem' || c.level === 'caution');

  // one concept: these animals in this tank, this build, at most this finish tier -> the best passing tier, or why not. Remembered for the call (strategies often meet on one concept).
  type Out = { p?: Omit<Proposal, 'strategy' | 'strategyLabel' | 'strategyBlurb' | 'score' | 'tradeoff' | 'complexity' | 'experienceNote'> & { levelOf: number; needStand: boolean }; near?: Miss; welfare?: boolean };
  const MEMO = new Map<string, Out>();
  const attempt = (a: Archetype, animals: AnimalCount[], tank: TankModel, pref: BuildId, maxLevel: 0 | 1 | 2 | 3, style?: StyleId, noStand = false): Out => {
    const needStand = standFor(tank, noStand);
    const bs = buildsCached(animals, tank, now).filter(b => meetsNeeds(b) && !(w.ownTank && b.bundle) && !(b.bundle && ownsKitPart(b.bundle.includes))); // a kit price cannot be split: owning a part of it leaves the parts build (lane U5)
    const b0 = bs.find(b => b.id === pref || b.also?.includes(pref)) ?? [...bs].sort((x, y) => pref === 'leastWork' ? x.minPerWeek - y.minPerWeek : pref === 'balanced' ? x.filtrationPct - y.filtrationPct : x.setupUsd - y.setupUsd)[0];
    if (!b0) return {};
    const key = `${a.id}|${tank.id}|${animals.map(x => x.species + x.n).join(',')}|${configKey(b0)}|${maxLevel}|${style ?? ''}|${needStand}`;
    const hit = MEMO.get(key); if (hit) return hit;
    let out: Out = {}, near: Miss | undefined;
    const own0 = ownedAssess(b0, ownedMap, needStand, P0, !!w.ownTank), scene0 = scenOf(b0, own0, needStand);
    // a proposal is a FINISHED tank (lane C9, scene/finish.ts): the best finish tier up to maxLevel that still passes every check. A build that already breaks a husbandry rule or a money / time cap
    // before it is finished cannot be saved by plants (they only add), so it is not finished further.
    if (wordsOf(summaryOf(scene0, units).cats)) { out = { welfare: true }; MEMO.set(key, out); return out; }
    const pre0 = b0.setupUsd - own0.saved, over0 = compliance(scene0, { setupUsd: pre0 + taxOf(pre0), upkeepUsdMo: b0.upkeepUsdMo, minPerWeek: b0.minPerWeek }, effectiveLimits(scene0, P0.limits), units).overall === 'over';
    let welfare = false;
    for (const b of finishTiers(b0, now, over0, maxLevel, style, !!w.lowtech)) {
      const own = ownedAssess(b, ownedMap, needStand, P0, !!w.ownTank), saved = own.saved, scene = scenOf(b, own, needStand), sm = summaryOf(scene, units);
      // husbandry is never traded for money or time: the strict rule (Nathan 2026-10-27) = nothing the stocking screen words as a Problem OR a Caution in any of its five categories. Only "not enough information" passes, and it is shown.
      if (style && !b.setup.items.some(i => i.kind === 'plant' || i.kind === 'artificial' || i.kind === 'coral')) continue; // another look is still a planted (or reefed) tank, never a pile of stones
      if (wordsOf(sm.cats)) { welfare = true; continue; }
      if (w.hightech && (b.finish?.level ?? 0) < 2) continue; // a stated high-tech approach is never silently swapped for a plainer one
      const preTax = b.setupUsd - saved, tax = taxOf(preTax), t = { ...money(b), startupUsd: preTax + tax }, L = effectiveLimits(scene, P0.limits);
      const cp = compliance(scene, { setupUsd: t.startupUsd, upkeepUsdMo: t.monthlyUsd, minPerWeek: t.minPerWeek }, L, units);
      if (cp.overall !== 'off') anyOn = true;
      if (cp.overall === 'within' || cp.overall === 'off') {
        const matched = tags.filter(x => a.tags.includes(x));
        const cl = costLines(b, own.rows, t.startupUsd, needStand, P0, tax, `Sales tax (${taxPct}%)`);
        out = { p: { needStand, archetype: a, build: b, scene, totals: t, saved, preTaxUsd: preTax, taxUsd: tax, taxPct, ownedNotes: own.notes, status: cp.results, matched, levelOf: b.finish?.level ?? 0,
          costLines: cl, layers: layerTotals(cl),
          unknown: sm.cats.flatMap(c => c.items.filter(i => i.level === 'unknown').map(i => i.text)).slice(0, 1) } };
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
    if (!out.p) out = { ...(near ? { near } : {}), ...(welfare ? { welfare: true } : {}) };
    MEMO.set(key, out); return out;
  };

  // two stages (speed): every archetype is first screened by its cheapest-start concept (the one most likely to pass: if that fails on money nothing of the kind will); the strategies
  // beyond it are then run for the strongest few archetypes only (the best of each family first), the rest stay in the pool by their screening concept.
  type Ctx = Sizes & { altStyle?: StyleId };
  const ctxs = new Map<string, Ctx>();
  const runStrategy = (a: Archetype, id: StrategyId) => {
    const c = ctxs.get(a.id); if (!c) return;
    const { list, top, ceiling, altStyle } = c;
    const mid = Math.ceil(top / 2), idxOf = (z: StrategyDef['size']) => Math.min(top, (z === 'small' ? 0 : z === 'top' ? top : mid) + (w.larger ? 1 : 0));
    const sd = STRATEGIES.find(x => x.id === id)!;
    if (sd.scape && !altStyle) return;
    const maxLevel = w.climb || w.planted ? 3 : w.hightech || w.lowtech ? Math.max(sd.level, 2) as 0 | 1 | 2 | 3 : sd.level;
    let found: Out | undefined, near: Miss | undefined;
    // the strategy's own size first; a size the money cannot carry once finished falls back one size down at a time, a size the welfare rule turns away (too full) goes one size UP (at most three tries)
    for (let tries = 0, i = idxOf(sd.size), dir = -1; i >= 0 && i < list.length && tries < 3 && !found?.p; i += dir, tries++) {
      const tank = list[i], stocks: AnimalCount[][] = [];
      if (sd.grow && !isLocked && a.animals.some(x => x.n >= 3)) for (const f of STOCK_UP) {
        const more = a.animals.map(x => ({ ...x, n: x.n >= 3 ? Math.round(x.n * f) : x.n })), fit = fitIn(more, tank);
        if (fit && !fit.fails.length) { stocks.push(more); break; }
      }
      stocks.push(a.animals);
      let welfareOnly = false;
      for (const stock of stocks) {
        let r = attempt(a, stock, tank, sd.build, maxLevel, sd.scape ? altStyle : undefined, id === 'economy');
        // a small tank the stand makes unaffordable is offered on a sturdy counter instead (the card says so), when the person has not said they need a stand
        if (!r.p && w.needStand === undefined && id !== 'economy') { const q = attempt(a, stock, tank, sd.build, maxLevel, sd.scape ? altStyle : undefined, true); if (q.p) r = q; }
        if (r.welfare && !r.p) stats.rejectedWelfare++;
        if (r.near && (!near || relaxSize(r.near.needs) < relaxSize(near.needs))) near = r.near;
        if (r.p) { found = r; break; }
        welfareOnly = !!r.welfare && !r.near;
        if (!r.welfare && !r.near) stats.rejectedConstraint++;
      }
      dir = welfareOnly ? 1 : -1;
    }
    // lane U5: the cheapest start also looks at the next sizes up and at starter kits with their own tank (heater, filter, light, thermometer and net in one price): a kit can undercut the smallest tank's parts
    if (id === 'economy' && found?.p && !w.ownTank) for (const tk of kitTanks(a.animals, now, list[0])) { const q = attempt(a, a.animals, tk, sd.build, maxLevel, undefined, true); if (q.p && q.p.totals.startupUsd < found!.p!.totals.startupUsd) found = q; }
    if (!found?.p) { if (near) misses.push(near); return; }
    const { levelOf, needStand, ...p } = found.p, t = p.totals, L = effectiveLimits(p.scene, P0.limits), cx = complexityOf(p.build, p.scene), exp = C.experience;
    // climb (the old target behaviour): a card that stops short because the animals' needs cap it (the biggest tank they gain from, at the fullest finish) is as good a use of the money as the animals allow
    const limited = !!(w.climb && ceiling && L.setupUsd && t.startupUsd < USES_BUDGET * L.setupUsd && levelOf === 3 && id === 'size');
    // experience shapes how hands-on concepts RANK (a gentle push), never whether one is offered
    const score = p.matched.length * 10 + headroom(t, L) * 5 + levelOf * 1.5 - p.unknown.length * 0.5 + (exp === 0 ? -6 * cx : exp === 2 ? 3 * cx : 0)
      + (w.climb && L.setupUsd ? (limited ? 1 : Math.min(1, t.startupUsd / L.setupUsd)) * 20 : 0)
      + tasteBonus(w.taste, p.build.finish?.style);   // lane NG5 hook: ranking only
    const base = { ...p, score, strategy: id, strategyLabel: strategyLabel(id, isLocked), strategyBlurb: sd.blurb,
      ...(L.setupUsd ? { underCeilingUsd: Math.max(0, Math.round(L.setupUsd - t.startupUsd)) } : {}),
      ...(limited ? { capNote: 'This is the most this kind needs: a bigger tank or more animals would not suit them, so part of your budget is left over.' } : {}) };
    const note = experienceNote(exp, cx, t.minPerWeek);
    pool.push({ ...base, complexity: cx, tradeoff: tradeoffOf(base, sd, needStand, standCost(p.build, P0)), ...(note ? { experienceNote: note } : {}) } as Proposal);
  };
  const strategies = isLocked ? LOCKED_STRATEGIES : OPEN_STRATEGIES;
  for (const a of wanted) {
    if (a.animals.some(x => !getSpecies(x.species))) continue;
    const z = sizesFor(a.animals, w, space, cap, taxK, now);
    if (!z.list.length) { stats.rejectedConstraint++; continue; }
    const ranked = rankStyles(a.animals);
    ctxs.set(a.id, { ...z, altStyle: ranked.slice(1).find(r => r.score >= (ranked[0]?.score ?? 0) - 0.6)?.style });
    runStrategy(a, 'economy');
  }
  const screened = [...new Set(pool.map(p => p.archetype.id))].map(id => ({ a: wanted.find(x => x.id === id)!, score: Math.max(...pool.filter(p => p.archetype.id === id).map(p => p.score)) })).sort((x, y) => y.score - x.score);
  const MORE = isLocked ? 1 : 3, deep: Archetype[] = [];
  for (const x of screened) if (!deep.some(d => d.family === x.a.family)) deep.push(x.a); // the best of each family first
  for (const x of screened) if (deep.length < MORE && !deep.includes(x.a)) deep.push(x.a);
  // the alternative-aquascape concept only for the strongest archetype (each strategy is a finished tank to build and price)
  for (const a of deep.slice(0, MORE)) for (const id of strategies) if (id !== 'economy' && (id !== 'scape' || isLocked || a === deep[0])) runStrategy(a, id);
  // the same concept reached by two strategies is one concept: the first (strongest) keeps it
  const seen = new Set<string>(), uniq: Proposal[] = [];
  for (const p of [...pool].sort((a, b) => b.score - a.score)) { const k = `${p.archetype.id}|${p.build.tank.id}|${configKey(p.build)}|${p.build.finish?.tier}|${p.build.finish?.style}|${p.build.animals.map(x => x.species + x.n).join(',')}`; if (!seen.has(k)) { seen.add(k); uniq.push(p); } }
  stats.pool = uniq.length;
  const shown = selectDiverse(uniq, 3);
  const rank = (a: Proposal, b: Proposal) => b.score - a.score || a.archetype.id.localeCompare(b.archetype.id);
  const sorted = [...uniq].sort(rank), kinds = [...new Set(sorted.map(p => p.archetype.family))];
  const bestMiss = new Map<string, Miss>();
  for (const m of misses) { const o = bestMiss.get(m.archetype.id); if (!o || relaxSize(m.needs) < relaxSize(o.needs)) bestMiss.set(m.archetype.id, m); }
  const shownIds = new Set(sorted.map(p => p.archetype.id));
  const out: Suggestions = { off: !anyOn, proposals: shown, qualified: [...new Set(sorted.map(p => p.archetype.id))], kinds, stats,
    misses: [...bestMiss.values()].filter(m => !shownIds.has(m.archetype.id)).sort((a, b) => relaxSize(a.needs) - relaxSize(b.needs)).slice(0, 3) };
  if (uniq.length) out.cheapest = [...uniq].sort((a, b) => a.totals.startupUsd - b.totals.startupUsd)[0];
  if (wanted.length && !shown.length && explain) out.infeasible = explainInfeasible({ w, misses: out.misses, stats, locked: isLocked, space, P: P0, units, now, run: x => generate(x, P0, units, now, false) });
  if (!wanted.length) out.unavailable = isLocked ? 'Those animals are not in the data yet.' : 'There are no setups of that kind to suggest yet. Tick another kind.';
  else if (!shown.length) out.message = NO_SUGGESTION;
  else if (!isLocked && kinds.length < 3 && anyOn && wanted.some(a => a.family !== kinds[0])) out.note = `Only ${kinds.length === 1 ? 'one kind' : `${kinds.length} kinds`} of setup fit${kinds.length === 1 ? 's' : ''} your guardrails: ${kinds.map(k => FAMILY_LABEL[k]).join(', ')}.`;
  return out;
}
