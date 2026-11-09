// Stable identities (DX0, scene v10). `id` is per tank and is renumbered by every redraw; `uid` is what a lock, a proposal and an
// undo step refer to. A piece keeps its uid when it is kept (spread / clone), and a redraw that draws the same piece again hands the
// old uid back (carryUids), so "regenerate with nothing changed" changes no identity.
import type { Fish, Item, TankSetup } from './types';

let counter = 0;
/** A fresh uid: unique in practice across tanks, sessions and files (time + random + a counter). */
export function newUid(prefix = 'u'): string {
  counter = (counter + 1) % 1679616;
  return `${prefix}${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 6)}${counter.toString(36)}`;
}

/** Give every animal and item of `t` a uid it lacks, and a new one to any that repeats an earlier uid (a duplicate copy). In place. */
export function ensureUids(t: TankSetup, deterministic = false): TankSetup {
  const seen = new Set<string>();
  for (const [list, p] of [[t.items, 'i'], [t.fish, 'f']] as [(Item | Fish)[], string][]) {
    // deterministic (loading an older file): the same file always gets the same uids
    for (const o of list) { if (!o.uid || seen.has(o.uid)) o.uid = deterministic && !seen.has(`${p}${o.id}`) ? `${p}${o.id}` : newUid(p); seen.add(o.uid); }
  }
  return t;
}

/** Deterministic uids for a drawn set (the same draw gives the same uids, so a redraw changes no identity and generators stay reproducible): a hash of what the piece is plus its n-th occurrence. */
export function drawnUids<T extends Item | Fish>(list: T[], prefix: string, keyOf: (o: T) => string): T[] {
  const n = new Map<string, number>();
  for (const o of list) {
    if (o.uid) continue;
    const k = keyOf(o); let h = 2166136261; for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
    const c = (n.get(k) ?? 0) + 1; n.set(k, c); o.uid = `${prefix}${(h >>> 0).toString(36)}${c > 1 ? `-${c}` : ''}`;
  }
  return list;
}
export const itemKey = (it: Item) => [it.kind, it.variant, it.seed, Math.round(it.x), Math.round(it.depth), Math.round(it.size), it.parent ?? ''].join('|');

/** After a redraw: an item identical to one of `before` takes that one's uid; a species keeps its uids in order (the first n of the old group stay). Items / fish already carrying a uid are left. */
export function carryUids(before: { items: Item[]; fish: Fish[] }, after: TankSetup): TankSetup {
  const byKey = new Map<string, string[]>();
  for (const it of before.items) if (it.uid) { const k = itemKey(it), a = byKey.get(k); a ? a.push(it.uid) : byKey.set(k, [it.uid]); }
  const had = new Set(before.items.map(it => it.uid).filter(Boolean)), taken = new Set(after.items.filter(it => had.has(it.uid)).map(it => it.uid)); // kept pieces keep theirs; a freshly drawn piece (any uid it was born with) takes an identical old one's
  for (const it of after.items) {
    if (had.has(it.uid)) continue;
    const a = byKey.get(itemKey(it)); while (a?.length && taken.has(a[0])) a.shift();
    if (a?.length) { it.uid = a.shift(); taken.add(it.uid!); }
  }
  const bySp = new Map<string, string[]>();
  for (const f of before.fish) if (f.uid) { const a = bySp.get(f.species); a ? a.push(f.uid) : bySp.set(f.species, [f.uid]); }
  const hadF = new Set(before.fish.map(f => f.uid).filter(Boolean)), takenF = new Set(after.fish.filter(f => hadF.has(f.uid)).map(f => f.uid));
  for (const f of after.fish) {
    if (hadF.has(f.uid)) continue;
    const a = bySp.get(f.species); while (a?.length && takenF.has(a[0])) a.shift();
    if (a?.length) { f.uid = a.shift(); takenF.add(f.uid!); }
  }
  return ensureUids(after);
}
