// Plant bundles (lane BS, 2026-10-27): a pack of aquascape plants at one price (data: src/data/plant-bundles.json, research in
// agentC/plant-bundles.json). Pinned on the tank like a gear sale (`plantPin`); the engine's `plantBundle` option prices the
// plants it covers as the pack. Suggested when the pack, shipping included, costs less than setting up the plants the tank has.
import data from '../data/plant-bundles.json';
import { policyFor, shipping } from '../data/shipping';
import type { TankSetup } from '../scene/types';
import { demandOf, type DemandOpts } from './engine';
import type { UserProfile } from './types';

export interface PlantBundle { id: string; retailer: string; name: string; priceUsd: number; regularUsd?: number; url: string; asOf: string; inStock: boolean; covers: Record<string, number>; guessed?: string }
export const PLANT_BUNDLES = (data as unknown as { bundles: PlantBundle[] }).bundles;
/** Same freshness as the gear deals: older than this is not offered. */
const FRESH_DAYS = 30, DAY = 864e5;
const fresh = (b: PlantBundle, now: number) => now - Date.parse(b.asOf) <= FRESH_DAYS * DAY;
export const bundleShip = (b: PlantBundle) => shipping(b.retailer, b.priceUsd);
export const bundleTotalUsd = (b: PlantBundle) => b.priceUsd + bundleShip(b).usd;
/** Plants (by variant) a tank has: the variants the pack can cover, and how many of its units go to use. */
function used(S: TankSetup, b: PlantBundle): number {
  const have = new Map<string, number>();
  for (const it of S.items) if (it.kind === 'plant') have.set(it.variant, (have.get(it.variant) ?? 0) + 1);
  let n = 0; for (const [v, c] of Object.entries(b.covers)) n += Math.min(c, have.get(v) ?? 0);
  return n;
}
type Pin = { plantPin?: string };
const pinId = (S?: TankSetup) => (S as (TankSetup & Pin) | undefined)?.plantPin;
export const pinPlantBundle = (S: TankSetup, b: PlantBundle) => { (S as TankSetup & Pin).plantPin = b.id; };
export const unpinPlantBundle = (S: TankSetup) => { delete (S as TankSetup & Pin).plantPin; };
export const pinnedPlantBundle = (S: TankSetup, list: PlantBundle[] = PLANT_BUNDLES) => list.find(b => b.id === pinId(S));
/** The engine's `plantBundle` option for a tank's pinned pack (none when nothing is pinned). */
export function plantBundleOpt(S: TankSetup, list: PlantBundle[] = PLANT_BUNDLES): DemandOpts['plantBundle'] {
  const b = pinnedPlantBundle(S, list);
  return b ? { id: b.id, priceUsd: bundleTotalUsd(b), asOf: b.asOf, covers: b.covers, label: `${b.retailer} ${b.name}${bundleShip(b).usd ? ` (+$${bundleShip(b).usd} shipping)` : ''}` } : undefined;
}
export interface PlantOffer { bundle: PlantBundle; savingUsd: number; /** plants of this tank the pack covers */ covered: number; shipText: string }
/** Packs worth showing, best saving first: in stock, fresh, shipping known, covering a plant the tank has, and costing less than
 *  setting those plants up one by one. Only the plants the tank actually has count. `opts` as for demandOf. */
export function plantBundleOffers(S: TankSetup, P: UserProfile, opts: DemandOpts = {}, list: PlantBundle[] = PLANT_BUNDLES, minSaving = 3): PlantOffer[] {
  if (pinId(S)) return [];
  const now = opts.now ?? Date.now(), base = demandOf(S, P, { ...opts, plantBundle: undefined }).totals.setupUsd, out: PlantOffer[] = [];
  for (const b of list) {
    const covered = b.inStock && fresh(b, now) && policyFor(b.retailer)?.standardShipUsd != null ? used(S, b) : 0;
    if (!covered) continue;
    const t = { id: b.id, priceUsd: bundleTotalUsd(b), asOf: b.asOf, covers: b.covers, label: b.name };
    const saving = base - demandOf(S, P, { ...opts, plantBundle: t }).totals.setupUsd;
    if (saving >= minSaving) out.push({ bundle: b, savingUsd: saving, covered, shipText: bundleShip(b).text });
  }
  return out.sort((a, b) => b.savingUsd - a.savingUsd);
}
