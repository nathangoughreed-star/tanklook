// The deal a scene was started from (lane KD): while pinned, the demand panel prices its bundle in place of the parts it covers.
// pinDeal() is called just before store.replace(); the load that follows promotes it, any other load (open, new) clears it.
// The bundle price holds only while the parts it includes are unchanged (dealdrift.ts); undoing the change brings it back.
// A preset tank picked on sale (pinPreset) is tracked the same way: its sale price holds while the tank stays that size.
import { dealAsKit, type Deal } from '../data/deals';
import { changedParts, partSig, type PartSig, type PricedPart } from './dealdrift';
import type { TankSetup } from '../scene/types';
let pending: Deal | null = null, active: Deal | null = null, base: { i: number; sig: PartSig } | null = null;
export const pinDeal = (d: Deal) => { pending = d; };
export const unpinDeal = () => { pending = null; active = null; base = null; };
/** Call on every scene load, with the tank the deal was built into (index `i`). */
export const onSceneLoad = (i = 0, S?: TankSetup) => {
  active = pending; pending = null; preset = null;
  base = active && S ? { i, sig: partSig(S, active.includes) } : null;
};
export const pinnedDeal = () => active;
/** Parts of the bundle the user has changed on tank `i` (empty = the bundle price holds). */
export const dealDrift = (S: TankSetup, i = 0): PricedPart[] => (active && base && base.i === i ? changedParts(base.sig, S) : []);
/** The pinned bundle as a kit price, for tank `S` (index `i`): undefined once any part it covers was changed, or on another tank. */
export const pinnedKit = (S?: TankSetup, i = 0) => {
  if (!active) return undefined;
  if (S && (!base || base.i !== i || changedParts(base.sig, S).length)) return undefined;
  return dealAsKit(active);
};

/** A catalog tank picked while on sale: what the user saw, so a resize can say the sale no longer applies. */
export interface PresetSale { i: number; sig: PartSig; product: string; retailer: string; usd: number }
let preset: PresetSale | null = null;
export const pinPreset = (i: number, S: TankSetup, sale: { product: string; retailer: string; usd: number } | undefined) => {
  preset = sale ? { i, sig: partSig(S, ['tank']), ...sale } : null;
};
export const pinnedPreset = () => preset;
export const presetDrift = (S: TankSetup, i: number) => (preset && preset.i === i ? changedParts(preset.sig, S).length > 0 : false);
