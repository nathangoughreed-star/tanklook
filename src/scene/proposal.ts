// A Discovery proposal (DX0; spec sections 5 and 8): a DELTA against the project at `baseRev`, never a replacement scene.
//   previewProposal(tank, p)   the tank with the delta applied, a new object; nothing in the store or the input moves (invariant 4)
//   checkProposal(tank, p)     would it break the scope or a lock?
//   applyProposal(store, p)    refuses a stale proposal (the project moved since baseRev, invariant 12), one that touches an unchecked tab
//                              (1) or a locked uid / property / roster floor (2, 3); otherwise ONE undo step. It never adds a lock (4).
//   deltaBetween(before, after) a whole generated tank in, the delta out: how a generator's result becomes a Proposal (DX2)
import { diffTouches, outOfScope, type Tab, type Touches } from './scope';
import { dropHeld, lockViolations, type Violation } from './locks';
import { ensureUids } from './uid';
import type { Fish, Item, TankSetup } from './types';
import type { Store } from './store';

/** Edits to one keyed list: by uid, so renumbered ids never matter. */
export interface ListDelta<T> { add?: T[]; remove?: string[]; change?: { uid: string; set: Partial<T> }[] }
export interface Delta {
  /** whole-field replacements of any TankSetup key except the lists (substrate, terrain, tank, light, tech, ...) */
  set?: Partial<Omit<TankSetup, 'fish' | 'items'>>;
  items?: ListDelta<Item>;
  fish?: ListDelta<Fish>;
}
export interface Proposal {
  /** the store revision the delta was made against */
  baseRev: number;
  /** the tabs this run may change; the delta must stay inside them */
  scope: Tab[];
  delta: Delta;
  /** one plain sentence for the card */
  summary: string;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const key = (o: Item | Fish) => o.uid ?? `id:${o.id}`;

function applyList<T extends Item | Fish>(list: T[], d: ListDelta<T> | undefined): T[] {
  if (!d) return list;
  const gone = new Set(d.remove ?? []), by = new Map((d.change ?? []).map(c => [c.uid, c.set]));
  const out = list.filter(o => !gone.has(key(o))).map(o => { const s = by.get(key(o)); return s ? { ...o, ...structuredClone(s), id: o.id, uid: o.uid } as T : o; });
  let id = list.reduce((m, o) => Math.max(m, o.id), 0);
  for (const a of d.add ?? []) { const n = structuredClone(a); if (out.some(o => o.id === n.id) || !(n.id > 0)) n.id = ++id; else id = Math.max(id, n.id); out.push(n); }
  return out;
}

/** The tank with `p.delta` applied (uids ensured). A new object: neither `tank` nor `p` is touched. */
export function previewProposal(tank: TankSetup, p: Proposal): TankSetup {
  const t = ensureUids(structuredClone(tank)), d = p.delta;
  if (d.set) Object.assign(t, structuredClone(d.set));
  t.items = applyList(t.items, d.items);
  t.fish = applyList(t.fish, d.fish);
  return ensureUids(t);
}

export interface Check { ok: boolean; after: TankSetup; touches: Touches; /** tabs touched outside the scope */ outside: Tab[]; violations: Violation[] }

/** Would applying `p` to `tank` stay inside its scope and keep every lock? Pure. A delta that edits `locks` is itself refused: a proposal never adds (or drops) a lock. */
export function checkProposal(tank: TankSetup, p: Proposal, lockBase?: TankSetup): Check {
  const base = ensureUids(structuredClone(tank)), after = previewProposal(base, p), touches = diffTouches(base, after);
  const violations = lockViolations(lockBase ? ensureUids(structuredClone(lockBase)) : base, after, base.locks);   // PS1: the locks are checked against the design with Discovery-held values laid over it
  if (!same(base.locks, after.locks)) violations.push({ kind: 'locks', target: 'locks', detail: 'A proposal cannot change locks.' });
  const outside = outOfScope(touches, p.scope);
  return { ok: !outside.length && !violations.length, after, touches, outside, violations };
}

export type ApplyResult =
  | { ok: true; touches: Touches }
  | { ok: false; reason: 'stale'; baseRev: number; currentRev: number }
  | { ok: false; reason: 'scope' | 'locks'; outside: Tab[]; violations: Violation[] };

/** Apply `p` to the store's active tank as ONE undo step, after the revision, scope and lock checks. Nothing changes when it refuses. Locks are never added. */
export function applyProposal(store: Store, p: Proposal): ApplyResult {
  if (p.baseRev !== store.rev) return { ok: false, reason: 'stale', baseRev: p.baseRev, currentRev: store.rev };
  const c = checkProposal(store.tank, p, store.effTank);
  if (!c.ok) return { ok: false, reason: c.violations.length ? 'locks' : 'scope', outside: c.outside, violations: c.violations };
  store.seal();
  const i = store.scene.active;
  store.update(s => { dropHeld(c.after); s.tanks[i] = c.after; });   // PS1: the held values are real now; the locks stay
  store.seal();
  return { ok: true, touches: c.touches };
}

/** The delta that turns `before` into `after` (uid-matched; every other key of `after` that differs is a whole-field set). Used to turn a generator's whole result into a proposal. */
export function deltaBetween(before: TankSetup, after: TankSetup): Delta {
  const b = ensureUids(structuredClone(before)), a = ensureUids(structuredClone(after)), d: Delta = {};
  const list = <T extends Item | Fish>(x: T[], y: T[]): ListDelta<T> | undefined => {
    const X = new Map(x.map(o => [key(o), o])), Y = new Map(y.map(o => [key(o), o])), out: ListDelta<T> = {};
    const add = y.filter(o => !X.has(key(o))), remove = x.filter(o => !Y.has(key(o))).map(key);
    const change = y.filter(o => X.has(key(o)) && !same(strip(X.get(key(o))!), strip(o))).map(o => ({ uid: key(o), set: { ...Object.fromEntries(Object.keys(strip(X.get(key(o))!)).map(k => [k, undefined])), ...strip(o) } as Partial<T> }));
    if (add.length) out.add = structuredClone(add); if (remove.length) out.remove = remove; if (change.length) out.change = change;
    return add.length || remove.length || change.length ? out : undefined;
  };
  const strip = <T extends Item | Fish>(o: T) => { const { id: _i, uid: _u, ...rest } = o; return rest; };
  const it = list(b.items, a.items), fi = list(b.fish, a.fish);
  if (it) d.items = it; if (fi) d.fish = fi;
  const set: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (k === 'items' || k === 'fish') continue;
    if (!same((b as unknown as Record<string, unknown>)[k], (a as unknown as Record<string, unknown>)[k])) set[k] = structuredClone((a as unknown as Record<string, unknown>)[k]);
  }
  if (Object.keys(set).length) d.set = set as Delta['set'];
  return d;
}
