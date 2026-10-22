// Pairing saved with the tank (2026-10-22, Nathan: pairing changes the recommendation, so it is plan data that must survive the
// stocking screen -> editor -> save -> reopen). A status belongs to the two animals it was set for, by fish id: removing or replacing
// either one, or a third animal joining, makes it unknown again, and the store prunes it at once (fish ids can be reused).
import { pairRule } from '../data/groups';
import type { Fish, Pairing, TankSetup } from './types';

type PairTank = Pick<TankSetup, 'fish' | 'pairs'>;
/** The ids of the two animals of `id` in the tank, ascending, when there are exactly two. */
function twoIds(fish: Fish[], id: string): [number, number] | undefined {
  const f = fish.filter(x => x.species === id);
  return f.length === 2 ? [Math.min(f[0].id, f[1].id), Math.max(f[0].id, f[1].id)] : undefined;
}
/** The pairing that applies now: the saved status while exactly the same two animals are in the tank, else unknown. */
export function pairingIn(T: PairTank, id: string): Pairing {
  const e = T.pairs?.[id], two = twoIds(T.fish, id);
  return e && two && e.ids[0] === two[0] && e.ids[1] === two[1] ? e.status : 'unknown';
}
/** Set the pairing of the two animals of `id` now in the tank ('unknown' clears it; ignored unless it is a pair species with two). */
export function setPairing(T: PairTank, id: string, status: Pairing): void {
  const two = twoIds(T.fish, id), next = { ...T.pairs };
  delete next[id];
  if (status !== 'unknown' && two && pairRule(id)) next[id] = { status, ids: two };
  if (Object.keys(next).length) T.pairs = next; else delete T.pairs;
}
/** Drop every status whose two animals are no longer exactly the two in the tank. */
export function prunePairs(T: PairTank): void {
  if (!T.pairs) return;
  for (const id of Object.keys(T.pairs)) if (pairingIn(T, id) === 'unknown') setPairing(T, id, 'unknown');
}
