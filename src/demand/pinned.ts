// The deal a scene was started from (lane KD): while pinned, the demand panel prices its bundle in place of the parts it covers.
// pinDeal() is called just before store.replace(); the load that follows promotes it, any other load (open, new) clears it.
import { dealAsKit, type Deal } from '../data/deals';
let pending: Deal | null = null, active: Deal | null = null;
export const pinDeal = (d: Deal) => { pending = d; };
export const unpinDeal = () => { pending = null; active = null; };
/** Call on every scene load. */
export const onSceneLoad = () => { active = pending; pending = null; };
export const pinnedDeal = () => active;
export const pinnedKit = () => (active ? dealAsKit(active) : undefined);
