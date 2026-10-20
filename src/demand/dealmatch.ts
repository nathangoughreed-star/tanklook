// Deal match (lane DM, 2026-10-19): a bundle close to the user's build. Nathan: "if you are making a tank that happens to use
// tech similar to one that we found parts for on sale or especially in a bundle, it would suggest that to you, with what changes
// would have to be made, how much you would save vs your current build", shown as Tank B. Same tank size only (dealsFor's
// tolerance, via dealOffers); what may differ is the gear: light, lid, stand, filter, heater. Livestock, plants and hardscape
// carry over unchanged. A deal whose gear does worse for this build (a plant loses its light, the filter or heater is smaller,
// the risk goes up) is kept out of the offer, with what it breaks.
import { dealAsKit, dealGuesses, type Deal } from '../data/deals';
import { productName } from '../data/gearCatalog';
import { getTankModel, modelOfVariant, tankFromModel } from '../data/tanks';
import { applyKitLight } from '../scene/kitlight';
import { shapeOf } from '../scene/shape';
import { volume } from '../scene/physics';
import { heatLoss, filterFor, techOf } from '../scene/tech';
import type { Tank, TankSetup, Units } from '../scene/types';
import { tankDiff } from '../ui/diff';
import { dealOffers } from './deals';
import { demandOf, type DemandOpts } from './engine';
import { defaultFilter, filterName, matchFilter, matchHeater, type FilterKind } from './gear';
import { pinnedDeal, pinnedKit } from './pinned';
import type { UserProfile } from './types';

export interface DealMatch {
  deal: Deal;
  /** the current build with the deal's parts swapped in (same tank; livestock, plants, hardscape unchanged) */
  setup: TankSetup;
  /** setup $ of the build as it is priced now (its own pinned deal, if any) */
  currentUsd: number;
  /** setup $ of `setup` priced as the deal */
  withDealUsd: number;
  /** currentUsd - withDealUsd */
  savingUsd: number;
  /** about what the parts the deal covers cost now (savingUsd + the deal's price): the base for the percent threshold */
  partsUsd: number;
  /** what changes, in plain words ("Light: 30 W light -> 12 W light"), at most 4 */
  changes: string[];
  /** what the deal's gear does worse for this build; a match with any is not offered */
  breaks: string[];
  /** the deal's guesses (dealGuesses) */
  guesses: string[];
  bundle: boolean;
}

/** Offer only when the best match saves more than both of these (the share is of what the covered parts cost now). */
export const MIN_SAVING_USD = 10, MIN_SAVING_FRAC = 0.05;
const FILTER_KINDS: FilterKind[] = ['sponge', 'internal', 'hob', 'canister'];
/** Smaller than this share of the current flow / needed heat counts as worse (ratings are rough). */
const FLOW_OK = 0.8, HEAT_OK = 0.8;

/** The deal's own tank when the row names a catalog tank (its listed outer size on the catalog shape), else undefined. */
export function dealTank(d: Deal): Tank | undefined {
  const cat = d.tank ? getTankModel(d.tank) : undefined;
  return cat ? tankFromModel(d.dims ? modelOfVariant(cat, d.dims) : cat) : undefined;
}
/** Each side within this share (or 1.5 in, whichever is more): a rated 20 high and a 20 long hold the same, but are not the same tank. */
const SIDE_TOL = 0.1, SIDE_MIN_MM = 38;
/** The same tank (Nathan 2026-10-19: "don't suggest it if it requires a tank size change"): dealsFor's gallons, the same
 *  shape and each side close. A deal whose tank is not a catalog tank (a hex, an unlisted size) cannot be shown to match: never. */
export function sameTank(T: Tank, d: Deal): boolean {
  const D = dealTank(d);
  if (!D) return false;
  const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(SIDE_MIN_MM, SIDE_TOL * Math.max(a, b));
  return shapeOf(T) === shapeOf(D) && near(T.L, D.L) && near(T.D, D.D) && near(T.H, D.H);
}

/** The build with the deal's light, lid and stand in place of its own (the filter and heater are not scene settings: the price uses them). */
export function withDealGear(S: TankSetup, d: Deal): TankSetup {
  let B = structuredClone(S);
  const has = (p: string) => d.includes.includes(p as never);
  if (has('stand')) B.stand = { ...B.stand, show: true, need: B.stand.need === 'ask' ? 'added' : B.stand.need, style: d.look?.style ?? B.stand.style, finish: d.look?.finish ?? B.stand.finish };
  if (has('lid')) B.lid = d.look?.lid ?? 'hood';
  if (has('light')) { // as sceneFromDeal: the listing's LED, the budget default for its size when it gives no watts (flagged a guess)
    const L = d.look?.light;
    B = applyKitLight(B, { light: { type: 'led', tech: 'led-white', count: 1, watts: L?.watts ?? null, par: L?.par, spec: L?.par ? 'published' : L?.watts ? 'listing' : 'guess' }, lid: B.lid, tier: 'budget', tankRatedGal: d.gal });
    if (L?.kelvin) B.light = { ...B.light, kelvin: L.kelvin };
  }
  return B;
}

/** The filter the build has now: the Tech menu's choice, else the engine's default for the size. gph Infinity = a sump, 0 = none. */
function filterNow(S: TankSetup): { name: string; gph: number } {
  const gal = volume(S.tank).gallons;
  if (!S.tech) { const m = defaultFilter(gal); return { name: filterName(m), gph: m.gph }; }
  const t = techOf(S), kind = t.rows.filter;
  if (kind === 'sump') return { name: 'sump', gph: Infinity };
  if (!FILTER_KINDS.includes(kind as FilterKind)) return { name: 'no filter', gph: 0 };
  const f = filterFor(S, kind as FilterKind, t.filterModel, t.filterProduct);
  return { name: `${f.product ? productName(f.product) : filterName(f.model)}${f.n > 1 ? ` ×${f.n}` : ''}`, gph: f.gph };
}

/** Light, lid, stand, filter and heater changes, and what the deal's gear does worse. */
function compare(S: TankSetup, B: TankSetup, d: Deal, units: Units, now: ReturnType<typeof demandOf>, after: ReturnType<typeof demandOf>) {
  const changes: string[] = [], breaks: string[] = [], gal = volume(S.tank).gallons, k = dealAsKit(d);
  // scene settings: the split view's own diff, so the offer reads like the compare tabs
  for (const [a, b] of tankDiff(S, B, units)) changes.push(`${a} → ${b}`);
  if (k.filter) {
    const m = matchFilter({ ...k.filter, gal })?.model ?? defaultFilter(gal), cur = filterNow(S);
    const name = k.filter.name ? `${k.filter.name} (${m.gph} gph)` : filterName(m);
    if (cur.gph === 0) changes.push(`Filter added: ${name}`);
    else changes.push(`Filter: ${cur.name} → ${name}`);
    if (cur.gph === Infinity) breaks.push(`a ${name} filter in place of your sump`);
    else if (m.gph < cur.gph * FLOW_OK) breaks.push(`the filter moves ${m.gph} gph, against ${Math.round(cur.gph)} gph now`);
  }
  if (k.heater || d.includes.includes('heater')) {
    const t = S.tech ? techOf(S) : undefined, none = t?.rows.heater === 'none';
    const w = k.heater?.watts, need = S.water.on ? heatLoss(S).needW : 0;
    changes.push(none ? `Heater added${w ? `: ${matchHeater(w).label}` : ''}` : `Heater: the bundle's${w ? ` ${w} W` : ' (power not listed)'}`);
    if (w && S.fish.length && !none && w < need * HEAT_OK) breaks.push(`the ${w} W heater is small for this tank (about ${Math.round(need)} W needed on a cold night)`);
  }
  // the engine's own gates: a plant losing its light, an animal no longer fitting
  for (const w of after.warnings) if (!now.warnings.includes(w)) breaks.push(w);
  if (after.totals.risk > now.totals.risk + 0.05 && !breaks.length) breaks.push(`risk goes from ${now.totals.risk.toFixed(1)} to ${after.totals.risk.toFixed(1)}`);
  return { changes: changes.slice(0, 4).concat(changes.length > 4 ? [`and ${changes.length - 4} more`] : []), breaks };
}

/**
 * Every same-size deal as a Tank B for this build, best saving first (bundles ahead of single-part sales at about equal
 * saving). Built on dealOffers(): its size and stand filter and its expiry rule pick the candidates. `units` words the changes.
 */
export function dealMatches(S: TankSetup, P: UserProfile, opts: DemandOpts & { units?: Units } = {}, deals?: Deal[]): DealMatch[] {
  if (!S.water.on) return [];
  const units = opts.units ?? 'in', cur = pinnedKit(S, 0, P), pin = pinnedDeal(S), now = demandOf(S, P, { ...opts, kit: cur });
  const out: DealMatch[] = [];
  for (const { deal } of dealOffers(S, P, opts, deals)) {
    if (pin?.id === deal.id || !sameTank(S.tank, deal)) continue; // this tank's own deal (priced, or just left by changing a part), or another tank of about the same gallons
    const B = withDealGear(S, deal), after = demandOf(B, P, { ...opts, kit: dealAsKit(deal) });
    const { changes, breaks } = compare(S, B, deal, units, now, after);
    out.push({ deal, setup: B, currentUsd: now.totals.setupUsd, withDealUsd: after.totals.setupUsd, savingUsd: now.totals.setupUsd - after.totals.setupUsd, partsUsd: now.totals.setupUsd - after.totals.setupUsd + deal.price.usd, changes, breaks, guesses: dealGuesses(deal), bundle: deal.includes.length > 2 });
  }
  const bucket = (m: DealMatch) => Math.round(m.savingUsd / 5); // "about equal" = within $5
  return out.sort((a, b) => bucket(b) - bucket(a) || Number(b.bundle) - Number(a.bundle) || b.savingUsd - a.savingUsd);
}

/** The match worth one line in the demand panel: nothing broken, saving over the threshold, not dismissed. */
export function bestMatch(S: TankSetup, P: UserProfile, opts: DemandOpts & { units?: Units } = {}, dismissed: (id: string) => boolean = () => false, deals?: Deal[]): DealMatch | undefined {
  return dealMatches(S, P, opts, deals).find(m => !m.breaks.length && !dismissed(m.deal.id) && m.savingUsd > MIN_SAVING_USD && m.savingUsd > MIN_SAVING_FRAC * m.partsUsd);
}

/** "A bundle close to your build: PetSmart Top Fin ..., saves about $40." */
export const matchLine = (m: DealMatch) => `A bundle close to your build: ${m.deal.retailer} ${m.deal.name}, saves about $${Math.round(m.savingUsd).toLocaleString('en-US')}.`;
