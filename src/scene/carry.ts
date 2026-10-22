// The guided-to-editor handoff (2026-10-22, Nathan): the build pick makes a fresh tank with new fish, and whatever the owner set on the
// stocking screen must reach it unchanged, or they approve one stocking and the editor assesses another. One old-to-new animal mapping
// carries every per-animal input: the drawn sex, the tracked sex (male / female / absent = unsexed) and the pairing.
import { prunePairs, pairingIn } from './pairs';
import type { Fish, TankSetup } from './types';

type CarryTank = Pick<TankSetup, 'fish' | 'pairs'>;
const bySpecies = (fish: Fish[]) => {
  const m = new Map<string, Fish[]>();
  for (const f of fish) m.set(f.species, [...(m.get(f.species) ?? []), f]);
  return m;
};

/** Old fish id -> new fish id: per species, the i-th animal of `from` is the i-th of `to` (both in list order). A species whose counts
 *  differ is left out (it is not the same group). */
export function animalMap(from: Fish[], to: Fish[]): Map<number, number> {
  const out = new Map<number, number>(), b = bySpecies(to);
  for (const [sp, olds] of bySpecies(from)) {
    const news = b.get(sp);
    if (news && news.length === olds.length) olds.forEach((o, i) => out.set(o.id, news[i].id));
  }
  return out;
}

/** Copy the per-animal inputs of `from` onto the same animals in `to`: sex (drawn), gender (tracked; absent stays absent, never
 *  inferred) and the pairings, all through one animalMap. */
export function carryAnimals(from: CarryTank, to: CarryTank): void {
  const map = animalMap(from.fish, to.fish), byId = new Map(to.fish.map(f => [f.id, f]));
  for (const o of from.fish) {
    const n = byId.get(map.get(o.id) ?? -1);
    if (!n) continue;
    if (o.sex) n.sex = o.sex; else delete n.sex;
    if (o.gender) n.gender = o.gender; else delete n.gender;
  }
  const pairs: NonNullable<TankSetup['pairs']> = {};
  for (const id of Object.keys(from.pairs ?? {})) {
    const st = pairingIn(from, id), e = from.pairs![id], a = map.get(e.ids[0]), b = map.get(e.ids[1]);
    if (st !== 'unknown' && a !== undefined && b !== undefined) pairs[id] = { status: st, ids: [Math.min(a, b), Math.max(a, b)] };
  }
  if (Object.keys(pairs).length) to.pairs = pairs; else delete to.pairs;
  prunePairs(to);
}
