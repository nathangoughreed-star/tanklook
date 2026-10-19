// The deal a scene was started from (lane KD): while pinned, the demand panel prices its bundle in place of the parts it covers.
// pinDeal() is called just before store.replace(); the load that follows promotes it, any other load (open, new) clears it.
// The bundle price holds only while the parts it includes are unchanged (dealdrift.ts); undoing the change brings it back.
// A preset tank picked on sale (pinPreset) is tracked the same way: its sale price holds while the tank stays that size.
// Per tank (lane DM, 2026-10-19): a deal pinned to one tank (Tank B built from a bundle) rides on the tank object as `dealPin`
// (the deal id and its parts' fingerprint), so undo, split and close carry it with the tank; a saved file drops it (parseSetup
// keeps known keys only). A tank's own pin comes before the scene's.
import { DEALS, dealAsKit, type Deal } from '../data/deals';
import { changedParts, partSig, type PartSig, type PricedPart } from './dealdrift';
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
/** The pinned bundle as a kit price, for tank `S` (index `i`): undefined once any part it covers was changed, or on another tank. */
export const pinnedKit = (S?: TankSetup, i = 0) => {
  const d = ownDeal(S);
  if (d) return changedParts(own(S)!.sig, S!).length ? undefined : dealAsKit(d);
  if (!active) return undefined;
  if (S && (!base || base.i !== i || changedParts(base.sig, S).length)) return undefined;
  return dealAsKit(active);
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
