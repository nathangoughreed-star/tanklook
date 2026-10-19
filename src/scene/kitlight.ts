// Kit light wiring (lane KC, 2026-10-19). A kit's light drives the EXISTING light model (scene/lightout.ts): this file only
// writes the kit's numbers into LightSettings, says how sure the PAR is, says which plants and care the result supports,
// and prices nothing (the equipment catalog, lane KK, plugs into `setUpgradePriceHook`). No second estimator: every PAR
// here comes from lightOutCached, with a published PAR scaling it through the `par` field.
import { LIBRARY } from './items';
import { defaultSetup } from './defaults';
import { CARE_NAME, FIT_PAR, fits, type FitLight } from './plantfit';
import { NEEDS, isCoralNeed, isLand, type PlantNeed } from './lightneeds';
import { TECHS, fitFixture, lightOutCached, wattsOf } from './lightout';
import type { GrowFeed, LidType, LightSettings, LightTech, LightType, Tank, TankSetup } from './types';

/** The part of a kit this lane reads (src/data/kits.ts KitModel.light / .lid; structural, so KB's type fits). */
export interface KitLight {
  type: LightType; tech: LightTech; count: number; /** null = not published (spec 'guess'): the tier default stands in. */ watts: number | null; par?: number;
  /** 'published' = the maker's PAR, 'listing' = type and wattage from the listing, 'guess' = a tier default was used. */
  spec: 'published' | 'listing' | 'guess';
}
export interface KitLike { light: KitLight; lid: LidType; water?: 'fresh' | 'salt'; tier?: 'budget' | 'mid' | 'plant' | 'reef'; tankRatedGal?: number }

/** LED watts per rated gallon when a listing gives none (lane KB: 'guess'), by kit tier; with a floor. ESTIMATES from
 * typical hood LEDs (budget hoods ~4-15 W) and planted / reef fixtures; the confidence label says "rough" when these are used. */
export const TIER_W_PER_GAL: Record<NonNullable<KitLike['tier']>, number> = { budget: 0.4, mid: 0.6, plant: 1.1, reef: 1.8 };
export const TIER_W_MIN = 4;
/** The kit's watts: its own, else the tier default for its rated gallons (null when neither is known). */
export function kitWatts(kit: KitLike): number | null {
  if (kit.light.watts && kit.light.watts > 0) return kit.light.watts;
  if (!kit.tankRatedGal) return null;
  return Math.max(TIER_W_MIN, Math.round(kit.tankRatedGal * TIER_W_PER_GAL[kit.tier ?? 'budget']));
}
/** Kits list a hood LED as 'flat' (no fixture in the model): a kit's light is a fixture, so an LED tech is an LED bar, a tube tech a tube. */
const typeOf = (l: KitLight): LightType => l.type !== 'flat' ? l.type : TECHS[l.tech].on.includes('tube') && !TECHS[l.tech].on.includes('led') ? 'tube' : 'led';

/**
 * Write the kit's light and lid into a copy of `setup` (the tank is the caller's: KitModel.tank is a catalog id).
 * The fixture's usual height and beam come first (fitFixture fresh), then the kit's own power and PAR, then a clamp so
 * every field sits in its fixture's range. A kit without a published PAR clears any earlier override.
 */
export function applyKitLight<S extends Pick<TankSetup, 'tank' | 'light' | 'lid'>>(setup: S, kit: KitLike): S {
  const light: LightSettings = { ...setup.light, type: typeOf(kit.light), tech: kit.light.tech, count: kit.light.count };
  delete light.par; delete light.bulbW; delete light.mount; delete light.pos;
  fitFixture(light, setup.tank, true);
  const w = kitWatts(kit);
  if (w) light.watts = w; else delete light.watts;
  if (kit.light.par && kit.light.par > 0) light.par = kit.light.par;
  fitFixture(light, setup.tank, false);
  return { ...setup, light, lid: kit.lid };
}
/** The thin store hook: the same, as one undoable edit of the active setup. */
export function applyKitToStore(store: { edit(fn: (t: TankSetup) => void): void }, kit: KitLike) {
  store.edit(t => { const n = applyKitLight(t, kit); t.light = n.light; t.lid = n.lid; });
}

export type Confidence = 'published' | 'estimated' | 'rough';
/** How far a published figure can still be off at a different point of the tank (the maker measures at one spot). */
export const PUBLISHED_PM = 0.15;
/**
 * How sure the PAR is. published = the maker's PAR (the model is scaled to it); estimated = type + wattage from the
 * listing (the tech's own uncertainty, LED 30 %, tubes 50 %); rough = a tier default stood in for the wattage, so the
 * tech's band is widened by 30 points. `plusMinus` is a fraction (0.3 = about +-30 %).
 */
export function lightConfidence(l: Pick<KitLight, 'tech' | 'spec' | 'par' | 'watts'>): { level: Confidence; plusMinus: number } {
  const unc = TECHS[l.tech].unc;
  if (l.spec === 'published' && l.par && l.par > 0) return { level: 'published', plusMinus: PUBLISHED_PM };
  if (l.spec === 'guess' || !l.watts || !(l.watts > 0)) return { level: 'rough', plusMinus: Math.min(1, unc + 0.3) };
  return { level: 'estimated', plusMinus: unc };
}
/** "estimated, about +-30 %" for the UI. */
export function confidenceText(c: { level: Confidence; plusMinus: number }): string {
  return `${c.level}, about ±${Math.round(c.plusMinus * 100)} %`;
}

/** The user's override (the existing `par` field): a number sets it, null / 0 clears it and the estimate returns. */
export function overridePar<S extends Pick<TankSetup, 'light'>>(setup: S, par: number | null): S {
  const light = { ...setup.light };
  if (par && par > 0) light.par = par; else delete light.par;
  return { ...setup, light };
}

// ---- what a light supports ----

export type Level = 'none' | FitLight;
/** Lowest PAR at the substrate (mean) for each level: the planted-tank tiers fresh (15 / 30 / 50, lightneeds FRESH_TIERS),
 * the midpoints between the wizard's reef levels (soft 75, LPS 110, SPS 250 -> 50 / 92 / 180) salt. */
const LEVEL_MIN: Record<'fresh' | 'reef', Record<FitLight, number>> = { fresh: { low: 15, medium: 30, high: 50 }, reef: { low: 50, medium: 92, high: 180 } };
const LEVELS: FitLight[] = ['low', 'medium', 'high'];
const FRESH_NAME: Record<Level, string> = { none: 'Very low light', low: 'Low light', medium: 'Medium light', high: 'High light' };
const REEF_NAME: Record<Level, string> = { none: 'Fish only', low: 'Soft corals', medium: 'LPS', high: 'SPS' };
const levelOf = (par: number, salt: boolean): Level => LEVELS.reduce<Level>((a, l) => par >= LEVEL_MIN[salt ? 'reef' : 'fresh'][l] ? l : a, 'none');

/** Just the lamp: the setup with the aquascape's hills and shade taken out, so the number is the kit's, not the layout's. */
function bare<S extends TankSetup>(s: S): S { return { ...s, items: [], terrain: { ...s.terrain, on: false } }; }
function parOfSetup(s: TankSetup): number { return lightOutCached(bare(s))?.mean ?? 0; }

/** Reef care reads as dosing (plantfit's GrowFeed doubles for it: ferts = regular, co2 = daily). */
const DOSING: Record<GrowFeed, string> = { low: 'light', ferts: 'regular', co2: 'daily' };
const CARE_ORDER: GrowFeed[] = ['low', 'ferts', 'co2'];
/** The cheapest care that keeps this variant fine at `par` (null = no care tier does). */
function minCare(v: string, par: number): GrowFeed | null { return CARE_ORDER.find(c => fits(v, par, c)) ?? null; }
const isPlantKey = (v: string) => { const n = NEEDS[v]; return !!n && !isLand(n) && !isCoralNeed(n) && (n as PlantNeed).note !== 'succulent' && (n as PlantNeed).note !== 'floater'; };
const isCoralKey = (v: string) => isCoralNeed(NEEDS[v]);

export interface Capability {
  /** The highest wizard level the light reaches ('none' = below even low). */
  level: Level; par: number; salt: boolean;
  /** Library variants that fit, by the cheapest care tier each needs. */
  plants: Record<GrowFeed, string[]>;
  /** The care the whole fitting list implies (the highest tier any of them needs); 'low' when only hardy plants fit. */
  care: GrowFeed;
  sentence: string;
}
/** In plain words: which wizard level this setup's light supports, which library plants fit it, and the care they imply. */
export function kitCapability(setup: TankSetup): Capability {
  const salt = !!setup.water.salt, par = parOfSetup(setup), level = levelOf(par, salt);
  const keys = Object.keys(NEEDS).filter(salt ? isCoralKey : isPlantKey);
  const plants: Record<GrowFeed, string[]> = { low: [], ferts: [], co2: [] };
  for (const v of keys) { const c = minCare(v, par); if (c) plants[c].push(v); }
  const all = CARE_ORDER.flatMap(c => plants[c]);
  const care = [...CARE_ORDER].reverse().find(c => plants[c].length) ?? 'low';
  const label = (v: string) => LIBRARY[v]?.label ?? v;
  const head = `${(salt ? REEF_NAME : FRESH_NAME)[level]} (about ${Math.round(par)} PAR)`;
  let sentence: string;
  if (!(par > 0)) sentence = 'No light estimate: set the light power first.';
  else if (!all.length) sentence = `${head}: nothing in the library thrives here${salt ? '' : '; try floating plants and a shade-loving fern'}.`;
  else {
    // fresh: the hardy plants first (the rest need more care); reef: every fitting coral, each tier of dosing is a gear step
    const shown = salt || !plants.low.length ? all : plants.low, easy = shown.slice(0, 7).map(label), more = shown.length - easy.length;
    const no: string[] = [];
    if (!salt) {
      if (!fits('carpet', par, 'co2')) no.push('no carpets');
      if (!fits('stemred', par, 'co2')) no.push('no red stems');
    } else if (!fits('acropora', par, 'co2')) no.push('no SPS');
    const extra = salt ? (care !== 'low' ? `; needs ${DOSING[care]} dosing` : '')
      : care !== 'low' && all.length > shown.length ? `; ${CARE_NAME[care]} widens the list to ${all.length} plants` : '';
    const hot = !salt && par > 80 ? '; very bright: most plants need floaters or a dimmer light to stay clear of algae' : '';
    sentence = `${head}: ${easy.join(', ')}${more > 0 ? ` and ${more} more` : ''}${extra}${no.length ? `; ${no.join(', ')}` : ''}${hot}.`;
  }
  return { level, par, salt, plants, care, sentence };
}

// ---- upgrade path ----

export type UpgradeVerdict = 'works as is' | 'swap the light' | 'effectively a new build';
export type GearCategory = 'light' | 'lid' | 'co2' | 'ferts' | 'dosing';
export interface UpgradeStep { category: GearCategory; reason: string; /** Filled by the equipment catalog (lane KK); null until then. */ priceUsd: { lo: number; mode: number; hi: number } | null }
export interface UpgradePath { verdict: UpgradeVerdict; current: Level; goal: FitLight; steps: UpgradeStep[]; neededWatts: number | null }

/** Lane KK plugs the equipment prices in here: (category, tank) -> a price range or null. */
export type UpgradePriceHook = (category: GearCategory, ctx: { tank: Tank; neededWatts: number | null; salt: boolean }) => UpgradeStep['priceUsd'];
let priceHook: UpgradePriceHook = () => null;
export function setUpgradePriceHook(h: UpgradePriceHook | null) { priceHook = h ?? (() => null); }

/** More than this many times the kit's light is a new build, not a swap (the tank, hood and wiring all change). */
export const SWAP_MAX_RATIO = 3;
/** Most LED watts per gallon a freshwater / reef swap can reasonably ask for before the tank is the problem. */
export const MAX_W_PER_GAL: Record<'fresh' | 'reef', number> = { fresh: 2.5, reef: 6 };

/**
 * What it takes to reach `goal` from this kit. The light is judged by PAR (linear in watts): reach the goal's PAR by
 * a bigger or better fixture ('swap the light'), unless that is more than SWAP_MAX_RATIO times the light it has or more
 * power per gallon than a tank takes ('effectively a new build'). CO2 and ferts are add-ons the plants' care tier asks for
 * and are listed whatever the verdict (a kit comes without them); a hood holding the stock light is a lid change.
 */
export function upgradePath(kit: KitLike, tank: Tank, goal: FitLight, salt = kit.water === 'salt'): UpgradePath {
  const base = defaultSetup(), s = bare({ ...base, tank, water: { ...base.water, salt } });
  const set = applyKitLight(s, kit), cur = parOfSetup(set), current = levelOf(cur, salt);
  const goalPar = FIT_PAR[salt ? 'reef' : 'fresh'][goal], need = LEVEL_MIN[salt ? 'reef' : 'fresh'][goal];
  const ctx = (neededWatts: number | null) => ({ tank, neededWatts, salt });
  const step = (category: GearCategory, reason: string, neededWatts: number | null = null): UpgradeStep => ({ category, reason, priceUsd: priceHook(category, ctx(neededWatts)) });
  const steps: UpgradeStep[] = [];
  const lightOk = cur >= need, w = wattsOf(set), gal = gallons(tank);
  let verdict: UpgradeVerdict = 'works as is', neededWatts: number | null = null;
  if (!lightOk) {
    neededWatts = cur > 0 ? Math.ceil(w * goalPar / cur) : null;
    const ratio = cur > 0 ? goalPar / cur : Infinity;
    if (!(ratio <= SWAP_MAX_RATIO) || (neededWatts ?? Infinity) > MAX_W_PER_GAL[salt ? 'reef' : 'fresh'] * gal) {
      verdict = 'effectively a new build';
      steps.push(step('light', `needs about ${Number.isFinite(ratio) ? Math.round(ratio * 10) / 10 : 'many'} times the light this kit gives (${Math.round(cur)} PAR vs about ${Math.round(goalPar)}); more than a fixture swap`, neededWatts));
    } else {
      verdict = 'swap the light';
      steps.push(step('light', `${Math.round(cur)} PAR now, about ${Math.round(goalPar)} needed: roughly ${neededWatts} W of ${salt ? 'reef' : 'planted'} LED`, neededWatts));
    }
    if (kit.lid === 'hood') steps.push(step('lid', 'the hood holds the stock light: a stronger light means an open-top fixture or a new hood'));
  }
  if (salt && goal !== 'low') steps.push(step('dosing', goal === 'medium' ? 'regular calcium / alkalinity dosing for LPS' : 'daily dosing (alkalinity, calcium, magnesium) for SPS'));
  if (!salt && goal !== 'low') steps.push(step('ferts', goal === 'medium' ? 'liquid fertiliser (root tabs for swords)' : 'regular liquid fertiliser and root tabs'));
  if (!salt && goal === 'high') steps.push(step('co2', 'CO2 injection: red stems and carpets need it'));
  return { verdict, current, goal, steps, neededWatts };
}
const gallons = (t: Tank) => (t.L * t.H * t.D) / 3785411.784; // box volume; shapes only make it smaller, so the cap is a little generous
