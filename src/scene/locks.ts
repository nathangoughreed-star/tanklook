// Persistent "Keep this" locks (DX0; plan decisions 3 and 4). A lock is project state saved with the tank: it outlives a Discovery run.
// Locks bind proposals (scene/proposal.ts), never the user's own hand edits. Accepting a proposal never adds a lock.
//   object lock   { target: uid | 'tank' | 'substrate', props? }   props = the property groups held; absent = all of them (the object may not be removed either)
//   roster lock   { species, mode: exact | atLeast | speciesOnly, n } held against the animal rows (count only; sexes are not part of it)
//   substrate     one whole lock: settings + terrain grid + painted patches
import type { Fish, HeldValue, Item, Locks, ObjectLock, RosterLock, RosterMode, TankSetup } from './types';
import type { Brief } from './brief';

/** Property groups per kind of object: the fields each one covers (id and uid are identity, never a property). */
export const ITEM_PROPS: Record<string, readonly string[]> = {
  position: ['x', 'depth', 'lift'],
  size: ['size', 'spread', 'stems', 'dens', 'growth'],
  pose: ['yaw', 'pitch', 'tilt'],
  look: ['kind', 'variant', 'seed'],
  other: ['planted', 'parent'],
};
export const FISH_PROPS: Record<string, readonly string[]> = {
  species: ['species'],
  position: ['x', 'y', 'depth', 'yaw', 'pitch', 'roll', 'bend', 'surface'],
  size: ['tl'],
  sex: ['sex', 'gender'],
};
/** The tank target's groups, each a set of TankSetup keys. */
export const TANK_PROPS: Record<string, readonly (keyof TankSetup)[]> = {
  dimensions: ['tank'],
  room: ['stand', 'wall', 'person', 'lid', 'doors'],   // the room around the tank. The 3D BACKDROP is a physical wall INSIDE the habitat: it is Hardscape (HARDSCAPE_KEYS), not room
  water: ['water'],
};
/** The hardscape tab's non-item state (lane AB5): the relief backdrop (foam rock wall, cork, moss, jungle ...) is built into the habitat, so it moves, locks and prices with the hardscape. A lock on it has the target 'backdrop'. */
export const HARDSCAPE_KEYS: readonly (keyof TankSetup)[] = ['backdrop'];
/** The substrate lock covers these keys of the TankSetup (painted patches included). */
export const SUBSTRATE_KEYS: readonly (keyof TankSetup)[] = ['substrate', 'terrain', 'patches'];

/** AB7: supporting gear a person can hold fixed from the attribute panel. Same lock model as everything else (an object lock whose target is the part's name); `light` is the whole lighting setup,
 *  `filter` / `heater` are the tech rows of those names with their model / product / unit fields. Holding one keeps Discovery's candidates on that gear (confine) and rejects any that change it (violations). */
export const GEAR_LOCKS = ['light', 'filter', 'heater', 'stand'] as const;
export type GearLock = typeof GEAR_LOCKS[number];
const TECH_PARTS: Record<'filter' | 'heater', readonly (keyof NonNullable<TankSetup['tech']>)[]> = { filter: ['filterModel', 'filterProduct', 'filterless', 'filters'], heater: ['heaterW', 'heaterProduct', 'heaters'] };
export const isGearLock = (t: string): t is GearLock => (GEAR_LOCKS as readonly string[]).includes(t);
/** What a gear lock holds, as plain data (compared by value). */
export function gearPart(t: TankSetup, part: GearLock): unknown {
  if (part === 'light') return t.light;
  if (part === 'stand') return t.stand?.finish;   // the stand's colour only (cosmetic)
  const tech = t.tech as unknown as Record<string, unknown> | undefined;
  return { row: tech ? (tech.rows as Record<string, string> | undefined)?.[part] : undefined, ...Object.fromEntries(TECH_PARTS[part].map(k => [k, tech?.[k]])) };
}
/** Copy one gear part from `from` into `into` (in place). */
export function copyGear(into: TankSetup, from: TankSetup, part: GearLock): void {
  if (part === 'light') { into.light = structuredClone(from.light); return; }
  if (part === 'stand') { into.stand = { ...into.stand, finish: from.stand.finish }; return; }
  const src = from.tech as unknown as Record<string, unknown> | undefined;
  if (!src && !into.tech) return;
  const dst = (into.tech ??= structuredClone(from.tech) ?? { rows: {} }) as unknown as Record<string, unknown>, rows = (dst.rows ??= {}) as Record<string, string>;
  const row = (src?.rows as Record<string, string> | undefined)?.[part];
  if (row === undefined) delete rows[part]; else rows[part] = row;
  for (const k of TECH_PARTS[part]) { const v = src?.[k]; if (v === undefined) delete dst[k]; else dst[k] = structuredClone(v); }
}

export const emptyLocks = (): Locks => ({ objects: [], roster: [] });
export const locksOf = (t: TankSetup): Locks => t.locks ?? emptyLocks();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The groups of `table` whose fields differ between a and b (a field no group names counts as 'other' when the table has one, else 'look'). */
export function changedGroups(table: Record<string, readonly string[]>, a: object, b: object): string[] {
  const A = a as Record<string, unknown>, B = b as Record<string, unknown>, keys = new Set([...Object.keys(A), ...Object.keys(B)]);
  keys.delete('id'); keys.delete('uid');
  const out = new Set<string>();
  for (const k of keys) {
    if (same(A[k], B[k])) continue;
    out.add(Object.entries(table).find(([, f]) => f.includes(k))?.[0] ?? (table.other ? 'other' : 'species'));
  }
  return [...out];
}

// ------------------------------------------------------------------------------------------------ editing locks (pure, in place)
const upsert = <T>(list: T[], at: (x: T) => boolean, v: T) => { const i = list.findIndex(at); if (i >= 0) list[i] = v; else list.push(v); };
/** Lock an object / the tank / the substrate (replaces an earlier lock on the same target). */
export function lockObject(t: TankSetup, target: string, props?: string[], held?: HeldValue): Locks {
  const L = t.locks ??= emptyLocks();
  upsert(L.objects, o => o.target === target, { target, ...(props?.length ? { props: [...props] } : {}), ...(held ? { held: structuredClone(held) } : {}) });
  return L;
}
/** PS1: the design as Discovery sees it: the working design with every held lock value laid over it (a piece added, the tank / substrate / backdrop / gear set). The SAME object when nothing is held; the working design is never changed. */
export function effectiveTank(t: TankSetup): TankSetup {
  const hs = t.locks?.objects.filter(o => o.held);
  if (!hs?.length) return t;
  const out = structuredClone(t), rec = out as unknown as Record<string, unknown>;
  for (const o of hs) {
    const h = o.held!;
    if (h.item) { if (!out.items.some(i => i.uid === o.target)) out.items.push({ ...structuredClone(h.item), id: out.items.reduce((m, i) => Math.max(m, i.id), 0) + 1 }); continue; }
    if (!h.patch) continue;
    if (isGearLock(o.target)) copyGear(out, structuredClone(h.patch) as unknown as TankSetup, o.target);
    else for (const [k, v] of Object.entries(h.patch)) rec[k] = structuredClone(v);
  }
  return out;
}
/** Make It Yours made the held values real: the locks stay, the held copies go. */
export function dropHeld(t: TankSetup): void { for (const o of t.locks?.objects ?? []) delete o.held; }
export function unlockObject(t: TankSetup, target: string): Locks {
  const L = t.locks ??= emptyLocks(); L.objects = L.objects.filter(o => o.target !== target); return L;
}
export function lockRoster(t: TankSetup, species: string, mode: RosterMode, n = 1): Locks {
  const L = t.locks ??= emptyLocks();
  upsert(L.roster, r => r.species === species, { species, mode, n: Math.max(1, Math.round(n)) });
  return L;
}
export function unlockRoster(t: TankSetup, species: string): Locks {
  const L = t.locks ??= emptyLocks(); L.roster = L.roster.filter(r => r.species !== species); return L;
}
export const isLocked = (t: TankSetup, target: string) => locksOf(t).objects.some(o => o.target === target);

// ------------------------------------------------------------------------------------------------ queries
const countOf = (t: TankSetup, sp: string) => t.fish.reduce((n, f) => n + +(f.species === sp), 0);
/** Is this roster lock met by the animals of `t`? */
export const rosterMet = (t: TankSetup, r: RosterLock) => { const c = countOf(t, r.species); return r.mode === 'exact' ? c === r.n : r.mode === 'atLeast' ? c >= r.n : c >= 1; };

export type ViolationKind = 'removed' | 'changed' | 'roster' | 'substrate' | 'tank' | 'locks';
export interface Violation { kind: ViolationKind; target: string; props?: string[]; detail: string }

/** Every way `after` breaks a lock that `before` did not (a lock the user's own edits already broke is not charged to the proposal): a held object removed or its held properties changed, the tank or the substrate changed, a roster floor crossed. Pure. */
export function lockViolations(before: TankSetup, after: TankSetup, locks: Locks | undefined = before.locks): Violation[] {
  const out: Violation[] = [];
  if (!locks) return out;
  const pool = (t: TankSetup): Map<string, Item | Fish>[] => [new Map(t.items.filter(i => i.uid).map(i => [i.uid!, i])), new Map(t.fish.filter(f => f.uid).map(f => [f.uid!, f]))];
  const tables = [ITEM_PROPS, FISH_PROPS], B = pool(before), A = pool(after);
  for (const o of locks.objects) {
    if (o.target === 'backdrop') {
      if (HARDSCAPE_KEYS.some(k => !same(before[k], after[k]))) out.push({ kind: 'changed', target: 'backdrop', detail: 'The 3D backdrop changed.' });
    } else if (isGearLock(o.target)) {
      if (!same(gearPart(before, o.target), gearPart(after, o.target))) out.push({ kind: 'changed', target: o.target, detail: `The ${o.target === 'light' ? 'lighting' : o.target === 'filter' ? 'filtration' : o.target === 'stand' ? 'stand color' : 'heating'} changed.` });
    } else if (o.target === 'substrate') {
      if (SUBSTRATE_KEYS.some(k => !same(before[k], after[k]))) out.push({ kind: 'substrate', target: 'substrate', detail: 'The substrate (settings, terrain or patches) changed.' });
    } else if (o.target === 'tank') {
      const held = o.props?.length ? o.props : Object.keys(TANK_PROPS), hit = held.filter(g => (TANK_PROPS[g] ?? []).some(k => !same(before[k], after[k])));
      if (hit.length) out.push({ kind: 'tank', target: 'tank', props: hit, detail: `The tank's ${hit.join(', ')} changed.` });
    } else {
      for (let i = 0; i < B.length; i++) {
        const was = B[i].get(o.target); if (!was) continue;
        const now = A[i].get(o.target);
        if (!now) { out.push({ kind: 'removed', target: o.target, detail: 'A kept piece was removed.' }); continue; }
        const hit = changedGroups(tables[i], was, now).filter(g => !o.props?.length || o.props.includes(g));
        if (hit.length) out.push({ kind: 'changed', target: o.target, props: hit, detail: `A kept piece changed: ${hit.join(', ')}.` });
      }
    }
  }
  for (const r of locks.roster) {
    const was = countOf(before, r.species), now = countOf(after, r.species);
    if (now === was) continue; // unchanged by this edit
    const bad = r.mode === 'exact' ? now !== r.n : r.mode === 'atLeast' ? now < r.n && now < was : now < 1;
    if (bad) out.push({ kind: 'roster', target: r.species, detail: `${r.species}: ${r.mode === 'exact' ? `exactly ${r.n}` : r.mode === 'atLeast' ? `at least ${r.n}` : 'the species stays'} is kept, the change leaves ${now}.` });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ persistence
const MODES: readonly RosterMode[] = ['exact', 'atLeast', 'speciesOnly'];
/** Validate saved locks (anything malformed is dropped); undefined when nothing is left. */
export function parseLocks(raw: unknown): Locks | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { objects?: unknown; roster?: unknown }, objects: ObjectLock[] = [], roster: RosterLock[] = [], seenO = new Set<string>(), seenR = new Set<string>();
  for (const o of Array.isArray(r.objects) ? r.objects.slice(0, 2000) : []) {
    const t = (o as ObjectLock | null)?.target; if (typeof t !== 'string' || !t || seenO.has(t)) continue; seenO.add(t);
    const props = Array.isArray((o as ObjectLock).props) ? (o as ObjectLock).props!.filter((p): p is string => typeof p === 'string').slice(0, 12) : [];
    const h = (o as ObjectLock).held, held = h && typeof h === 'object' && (h.item && typeof h.item === 'object' || h.patch && typeof h.patch === 'object') && JSON.stringify(h).length < 400000 ? { held: h } : {};
    objects.push({ target: t, ...(props.length ? { props } : {}), ...held });
  }
  for (const x of Array.isArray(r.roster) ? r.roster.slice(0, 200) : []) {
    const q = x as RosterLock | null; if (!q || typeof q.species !== 'string' || seenR.has(q.species) || !MODES.includes(q.mode)) continue; seenR.add(q.species);
    roster.push({ species: q.species, mode: q.mode, n: Number.isFinite(q.n) ? Math.max(1, Math.min(999, Math.round(q.n))) : 1 });
  }
  return objects.length || roster.length ? { objects, roster } : undefined;
}

/** v10 migration: the brief's locked roster rows (`status: 'locked'`) become `exact` roster locks. */
export function rosterLocksFromBrief(b: Brief | undefined): RosterLock[] {
  const it = b?.items?.['animals.stock'];
  if (!it || it.off || it.status !== 'locked' || !Array.isArray(it.value)) return [];
  return it.value.filter(s => s && typeof s.species === 'string' && s.count > 0).map(s => ({ species: s.species, mode: 'exact' as const, n: Math.round(s.count) }));
}
