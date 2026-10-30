// Need-driven gear (lane GV2, Nathan 2026-10-30): "the tool doesn't assume you need anything until you add a species that needs it".
// `needsOf` reads the roster (and the plants) and returns what each one requires: the tank, a heater, a filter, a light tier, CO2,
// ferts, each with the reason, the species behind it, whether the tank has it, and a fix with its price. `withNeedGear` is the
// priced build of a tank started from its animals: a basic light until a plant needs more, and the feed those plants call for.
import { NEEDS, isCoralNeed, isLand, minPar, type PlantNeed } from '../scene/lightneeds';
import { isFloat } from '../art/plants';
import { lightOutCached } from '../scene/lightout';
import { applyLightProduct } from '../scene/lightproduct';
import { filterNeeded, feedFor, heaterNeeded, optionCost, roomOf, techOf } from '../scene/tech';
import { tankFor, type AnimalCount } from '../scene/tankfit';
import { volume } from '../scene/physics';
import { getSpecies } from '../data/species';
import { LIGHT_PRODUCTS, lightProduct, listedPrice, type LightProduct } from '../data/gearCatalog';
import { price as rowPrice, tankRowPrice } from './prices';
import { valueOf, type Brief } from '../scene/brief';
import type { Item, TankSetup } from '../scene/types';

export interface Need {
  kind: 'tank' | 'heater' | 'filter' | 'light' | 'co2' | 'ferts';
  why: string;
  species: string[];
  have: boolean;
  fix?: { label: string; deltaUsd: number };
}

const round = (x: number) => Math.round(x);
const deg = (c: number) => `${Math.round(c * 9 / 5 + 32)} °F`;
const nameOf = (id: string) => getSpecies(id)?.name ?? id;
const listOf = (ids: string[]) => ids.map(nameOf).join(', ');

/** The owner already has this gear: a brief pick (anything but "I don't care"), or a unit / light marked owned in the tank. */
function owns(S: TankSetup, brief: Brief | undefined, key: 'heater' | 'filter' | 'light'): boolean {
  const pick = brief ? valueOf(brief, 'constraints.owned')?.[key] : undefined;
  if (pick && pick !== 'care') return true;
  if (key === 'light') return !!S.light.owned;
  const units = key === 'heater' ? S.tech?.heaters : S.tech?.filters;
  return !!units?.length && units.every(u => u.owned);
}

// ---- light tiers

/** Live plants that ask the water light for something (not land plants, floaters or corals). */
export const livePlants = (S: TankSetup): Item[] => S.items.filter(it => it.kind === 'plant' && !!NEEDS[it.variant] && !isLand(NEEDS[it.variant]) && !isCoralNeed(NEEDS[it.variant]) && !isFloat(it.variant));
/** The PAR at the substrate the demanding plants want, 0 with none. */
export const parWanted = (S: TankSetup) => Math.max(0, ...livePlants(S).map(it => minPar(it.variant)));

/** Fresh-water catalogue lights that fit this tank's length and have a real listed price, cheapest first (a bar or clip, not a submersible). */
function fitting(S: TankSetup): LightProduct[] {
  const L = S.tank.L;
  return LIGHT_PRODUCTS.filter(p => p.water !== 'salt' && p.mount !== 'submersible' && p.mount !== 'hanging' && L >= p.fitMinMm && L <= p.fitMaxMm && !!listedPrice(p))
    .sort((a, b) => listedPrice(a)! - listedPrice(b)!);
}
/** Mean PAR at the substrate this catalogue light gives this tank (the light model's own estimate). */
function parOf(S: TankSetup, p: LightProduct): number {
  const T = structuredClone(S); T.light.owned = false; applyLightProduct(T.light, T.tank, p);
  return lightOutCached(T)?.mean ?? 0;
}
export interface LightPick { product: LightProduct; tier: 'basic' | 'planted'; par: number; priceUsd: number }
/** The basic light: the cheapest catalogue light that fits the tank's length (generic LED strips at the low end of the market: chosen so the default
 *  costs what the cheapest real fixture costs, never the planted-tank LED price the engine used for a priced-only flat fixture). Undefined on a salt or dry tank, or when none fits. */
export function basicLight(S: TankSetup): LightPick | undefined {
  if (!S.water.on || S.water.salt) return undefined;
  const p = fitting(S)[0];
  return p ? { product: p, tier: 'basic', par: parOf(S, p), priceUsd: listedPrice(p)! } : undefined;
}
/** The light this roster calls for: the basic one, or the cheapest fitting light that reaches the PAR the plants want (the strongest fitting one when none does). */
export function lightFor(S: TankSetup): LightPick | undefined {
  const basic = basicLight(S);
  if (!basic) return undefined;
  const want = parWanted(S);
  if (want <= 0 || basic.par >= want) return basic;
  const list = fitting(S);
  const p = list.find(q => parOf(S, q) >= want) ?? list.reduce((a, b) => parOf(S, b) > parOf(S, a) ? b : a, list[0]);
  return { product: p, tier: 'planted', par: parOf(S, p), priceUsd: listedPrice(p)! };
}
/** The light of the tank itself: its own catalogue light, else a generic fixture the owner drew (Undefined: none set, the basic one is assumed). */
const ownLight = (S: TankSetup) => S.light.product ? lightProduct(S.light.product) : undefined;

// ---- what the plants ask of the care

const rank = { none: 0, recommended: 1, required: 2 } as const;
/** The plants whose CO2 / ferts demand is 'required'. */
function carePlants(S: TankSetup, what: 'co2' | 'ferts'): string[] {
  return [...new Set(livePlants(S).filter(it => (NEEDS[it.variant] as PlantNeed)[what] === 'required').map(it => it.variant))];
}
const plantName = (v: string) => v;
export const careRank = rank;

/** A tank started from its animals, priced for what its roster needs: a basic (or planted) catalogue light where it has none of its own, and the feed (ferts / CO2) its plants require, raised never lowered. A copy; the tank itself is untouched. */
export function withNeedGear(S: TankSetup): TankSetup {
  if (!S.stockFirst || !S.water.on || S.water.salt) return S;
  const T = structuredClone(S), lp = ownLight(S);
  let changed = false;
  if (!lp && !(S.light.watts && S.light.watts > 0) && S.light.type === 'flat') {
    const pick = lightFor(S);
    if (pick) { applyLightProduct(T.light, T.tank, pick.product); changed = true; }
  }
  if (S.tech?.rows.co2 === undefined && S.tech?.rows.ferts === undefined) { // the owner has not chosen the care rows
    const feed = carePlants(S, 'co2').length ? 'co2' : carePlants(S, 'ferts').length ? 'ferts' : undefined;
    if (feed && (S.grow.feed === 'low' || (feed === 'co2' && S.grow.feed !== 'co2'))) { T.grow.feed = feed; changed = true; }
  }
  return changed ? T : S;
}

// ---- the needs

/** What this roster requires, in order: tank, heater, filter, light, CO2, ferts. `brief` defaults to the tank's own. Nothing is listed before a species or plant calls for it. */
export function needsOf(S: TankSetup, brief: Brief | undefined = S.brief): Need[] {
  const out: Need[] = [];
  const wet = S.water.on, gal = volume(S.tank).gallons;
  const animals: AnimalCount[] = [];
  for (const f of S.fish) { const a = animals.find(x => x.species === f.species); if (a) a.n++; else animals.push({ species: f.species, n: 1 }); }
  const ids = animals.map(a => a.species);

  // tank: the smallest comfortable tank for the roster
  const fit = animals.length ? tankFor(animals) : undefined;
  if (fit && !fit.fails.length) {
    const have = gal >= fit.gallons * 0.98, pNew = tankRowPrice(fit.gallons)?.mode ?? 0, pNow = tankRowPrice(gal)?.mode ?? 0;
    out.push({
      kind: 'tank', species: ids, have,
      why: `${listOf(ids)} ${ids.length > 1 ? 'are' : 'is'} comfortable from about ${round(fit.gallons)} gal (${fit.tank.name ?? 'a ' + round(fit.gallons) + ' gal tank'})`,
      ...(have ? {} : { fix: { label: `Upgrade to a comfortable tank: ${round(fit.gallons)} gal`, deltaUsd: Math.max(0, round(pNew - pNow)) } }),
    });
  }

  if (wet) {
    // heater: a species' minimum comfortable temperature above the room
    const cold = heaterNeeded(S);
    if (cold.length) {
      const room = roomOf(S), t = techOf(S), has = owns(S, brief, 'heater') || (t.rows.heater ?? 'none') !== 'none';
      const cost = optionCost(S, 'heater', 'one', { tech: t }).setup.mode;
      out.push({
        kind: 'heater', species: cold.map(c => c.id), have: has,
        why: `${cold.map(c => `${c.name} (${deg(c.lowC)} or warmer)`).join(', ')} need${cold.length > 1 ? '' : 's'} warmer water than a ${deg(room.c)} room${room.set ? '' : ' (assumed: room temperature not set)'}`,
        ...(owns(S, brief, 'heater') ? {} : { fix: { label: 'Add a heater sized to the tank', deltaUsd: round(cost) } }),
      });
    }
    // filter: any animal that lives in the water
    if (filterNeeded(S)) {
      const t = techOf(S), has = owns(S, brief, 'filter') || (t.rows.filter ?? 'none') !== 'none';
      const cost = optionCost(S, 'filter', gal <= 60 ? 'hob' : 'canister', { tech: t }).setup.mode;
      out.push({
        kind: 'filter', species: ids.filter(id => getSpecies(id)?.habitat !== 'land'), have: has,
        why: `${listOf(ids.filter(id => getSpecies(id)?.habitat !== 'land'))} live${ids.length === 1 ? 's' : ''} in the water and need${ids.length === 1 ? 's' : ''} it filtered`,
        ...(owns(S, brief, 'filter') ? {} : { fix: { label: `Add a ${gal <= 60 ? 'hang-on-back' : 'canister'} filter for ${round(gal)} gal`, deltaUsd: round(cost) } }),
      });
    }
  }

  // light, CO2, ferts: from the live plants
  const plants = livePlants(S);
  if (wet && plants.length) {
    const want = parWanted(S), basic = basicLight(S), pick = lightFor(S), own = ownLight(S);
    const mine = own ? parOf(S, own) : basic?.par ?? 0;
    const names = [...new Set(plants.filter(it => minPar(it.variant) >= (want - 0.01)).map(it => it.variant))];
    if (basic && want > basic.par) {
      const has = owns(S, brief, 'light') ? true : own ? mine >= want : false;
      const base = own ? listedPrice(own) ?? 0 : basic.priceUsd;
      out.push({
        kind: 'light', species: names, have: has,
        why: `${names.map(plantName).join(', ')} want${names.length > 1 ? '' : 's'} about ${round(want)} PAR at the substrate; a basic light gives about ${round(basic.par)}`,
        ...(owns(S, brief, 'light') || !pick ? {} : { fix: { label: `Upgrade the light: ${pick.product.brand} ${pick.product.model}`, deltaUsd: Math.max(0, round(pick.priceUsd - base)) } }),
      });
    }
    const feed = feedFor(S);
    const co2 = carePlants(S, 'co2'), ferts = carePlants(S, 'ferts');
    if (co2.length) out.push({
      kind: 'co2', species: co2, have: feed === 'co2',
      why: `${co2.join(', ')} need${co2.length > 1 ? '' : 's'} injected CO2 to thrive`,
      fix: { label: 'Add a CO2 kit', deltaUsd: round(rowPrice('gear:co2-kit')?.mode ?? 90) },
    });
    if (ferts.length || co2.length) {
      const f = ferts.length ? ferts : co2;
      out.push({
        kind: 'ferts', species: f, have: feed !== 'low',
        why: `${f.join(', ')} need${f.length > 1 ? '' : 's'} regular fertilizer`,
        fix: { label: 'Add an all-in-one fertilizer (a few dollars a month)', deltaUsd: 0 },
      });
    }
  }
  return out;
}
