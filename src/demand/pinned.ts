// The deal a scene was started from (lane KD): while pinned, the demand panel prices its bundle in place of the parts it covers.
// pinDeal() is called just before store.replace(); the load that follows promotes it, any other load (open, new) clears it.
// The bundle price holds only while the parts it includes are unchanged (dealdrift.ts); undoing the change brings it back.
// A preset tank picked on sale (pinPreset) is tracked the same way: its sale price holds while the tank stays that size.
// Per tank (lane DM, 2026-10-19): a deal pinned to one tank (Tank B built from a bundle) rides on the tank object as `dealPin`
// (the deal id and its parts' fingerprint), so undo, split and close carry it with the tank, and since lane GV9 (2026-10-30) a saved
// file and a reload keep it too (parseSetup `dealPin`). A tank's own pin comes before the scene's.
import { DEALS, dealAsKit, type Deal } from '../data/deals';
import { changedParts, partList, partSig, type PartSig, type PricedPart } from './dealdrift';
import { demandOf } from './engine';
import type { UserProfile } from './types';
import type { TankSetup } from '../scene/types';
let pending: Deal | null = null, active: Deal | null = null, base: { i: number; sig: PartSig } | null = null;
type Own = { id: string; sig: PartSig };
const own = (t?: TankSetup): Own | undefined => (t as (TankSetup & { dealPin?: Own }) | undefined)?.dealPin;
const ownDeal = (t?: TankSetup, list: Deal[] = DEALS) => { const o = own(t); return o ? list.find(d => d.id === o.id) : undefined; };
export const pinDeal = (d: Deal) => { pending = d; };
/** Unpin: the tank's own pin when it has one, else the scene's. */
export const unpinDeal = (t?: TankSetup) => {
  if (own(t)) { delete (t as TankSetup & { dealPin?: Own }).dealPin; return; }
  pending = null; active = null; base = null;
};
/** Call on every scene load, with the tank the deal was built into (index `i`). */
export const onSceneLoad = (i = 0, S?: TankSetup) => {
  active = pending; pending = null; preset = null;
  base = active && S ? { i, sig: partSig(S, active.includes) } : null;
};
/** The deal a tank is priced as: its own pin, else the scene's (a featured deal opened as a scene). No tank = the scene's. */
export const pinnedDeal = (t?: TankSetup, list: Deal[] = DEALS): Deal | null => ownDeal(t, list) ?? active;
/** Parts of the bundle the user has changed on tank `S` (index `i`) (empty = the bundle price holds). */
export const dealDrift = (S: TankSetup, i = 0): PricedPart[] => {
  const o = own(S);
  if (o && ownDeal(S)) return changedParts(o.sig, S);
  return active && base && base.i === i ? changedParts(base.sig, S) : [];
};
/** The bundle the tank was pinned to, with the parts changed since (undefined on another tank, or when nothing is pinned). */
const pinState = (S?: TankSetup, i = 0): { d: Deal; drift: PricedPart[] } | undefined => {
  const d = ownDeal(S);
  if (d) return { d, drift: changedParts(own(S)!.sig, S!) };
  if (!active) return undefined;
  if (!S) return { d: active, drift: [] };
  return base && base.i === i ? { d: active, drift: changedParts(base.sig, S) } : undefined;
};
/** The bundle still bought, its changed parts bought on top (its own ones left over): its price now stands in only for the
 *  parts still its own. None once the tank changed: the bundle is that tank. */
export const keptKit = (d: Deal, drift: PricedPart[]) => {
  if (drift.includes('tank')) return undefined;
  const k = dealAsKit(d), gone = new Set<string>(drift);
  return { ...k, includes: k.includes.filter(p => !gone.has(p)), label: `${k.label} (bundle kept; your own ${partList(drift)} bought on top)`,
    filter: gone.has('filter') ? undefined : k.filter, heater: gone.has('heater') ? undefined : k.heater };
};
/** The pinned bundle as a kit price, for tank `S` (index `i`): the whole bundle while its parts are unchanged. Once a part
 *  changed (2026-10-20), with the user's profile `P`: the bundle kept with the new part bought on top when that costs less
 *  to set up than buying every part separately, else undefined (the parts). Without `P`, undefined once a part changed. */
export const pinnedKit = (S?: TankSetup, i = 0, P?: UserProfile) => {
  const st = pinState(S, i);
  if (!st) return undefined;
  if (!st.drift.length) return dealAsKit(st.d);
  const k = P && S ? keptKit(st.d, st.drift) : undefined;
  return k && demandOf(S!, P!, { kit: k }).totals.setupUsd < demandOf(S!, P!).totals.setupUsd ? k : undefined;
};
/** Price this tank as `d` from now on (it stays with the tank through undo, split and close, until a part it covers changes). */
export const pinTank = (t: TankSetup, d: Deal) => { (t as TankSetup & { dealPin?: Own }).dealPin = { id: d.id, sig: partSig(t, d.includes) }; };

/** A catalog tank picked while on sale: what the user saw, so a resize can say the sale no longer applies. */
export interface PresetSale { i: number; sig: PartSig; product: string; retailer: string; usd: number }
let preset: PresetSale | null = null;
export const pinPreset = (i: number, S: TankSetup, sale: { product: string; retailer: string; usd: number } | undefined) => {
  preset = sale ? { i, sig: partSig(S, ['tank']), ...sale } : null;
};
export const pinnedPreset = () => preset;
export const presetDrift = (S: TankSetup, i: number) => (preset && preset.i === i ? changedParts(preset.sig, S).length > 0 : false);
