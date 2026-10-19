// The deal a scene was started from (lane KD): while pinned, the demand panel prices its bundle in place of the parts it covers.
// pinDeal() is called just before store.replace(); the load that follows promotes it, any other load (open, new) clears it.
// Per tank (lane DM, 2026-10-19): a deal pinned to one tank (Tank B built from a bundle) rides on the tank object as `dealPin`
// (the deal id), so undo, split and close carry it with the tank; a saved file drops it (parseSetup keeps known keys only).
import { DEALS, dealAsKit, type Deal } from '../data/deals';
import type { TankSetup } from '../scene/types';
let pending: Deal | null = null, active: Deal | null = null;
type Pinnable = TankSetup & { dealPin?: string };
export const pinDeal = (d: Deal) => { pending = d; };
/** Unpin: the tank's own pin when it has one, else the scene's. */
export const unpinDeal = (t?: TankSetup) => { if (t && (t as Pinnable).dealPin) { delete (t as Pinnable).dealPin; return; } pending = null; active = null; };
/** Call on every scene load. */
export const onSceneLoad = () => { active = pending; pending = null; };
/** The deal a tank is priced as: its own pin, else the scene's (a featured deal opened as a scene). No tank = the scene's. */
export const pinnedDeal = (t?: TankSetup, list: Deal[] = DEALS): Deal | null => {
  const id = t && (t as Pinnable).dealPin;
  return (id && list.find(d => d.id === id)) || active;
};
export const pinnedKit = (t?: TankSetup) => { const d = pinnedDeal(t); return d ? dealAsKit(d) : undefined; };
/** Price this tank as `d` (it stays with the tank through undo, split and close). */
export const pinTank = (t: TankSetup, d: Deal) => { (t as Pinnable).dealPin = d.id; };
