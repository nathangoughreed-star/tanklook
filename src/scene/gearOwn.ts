// The gear model (lane P8, Nathan 2026-11-13; UI2 §2a "Equipment", request R27). No DOM, no store; every operation takes a model and returns a new one.
//   OWNED   per gear category, the list of items the person HAS ("I have this", not "use it"). Owned = $0 in the cost lines.
//   IN USE  the one item in use per category (owned or bought).
//   LOCK    an independent "use this one for sure" flag per item, owned or not. Discover / Suggest / the generator must use a locked item and prefer owned items over buying.
// An item is a catalogue product id, or one of the tokens GENERIC / 'care' / 'unknown' (the owned-sheet answers). Categories are the brief's EquipKey names (tank, stand, filter, heater, light, ...)
// plus any extra the Equipment screen adds (co2, air, uv).
// Storage: `brief.project.gear` (additive, no version bump). Older saves have none: `gearOf` then derives the model from what they do have (`constraints.owned`, `existingTank`,
// `project.use`, the scene's owned flags and Discover's gear locks) via `migrateGear`, and `legacyOf` projects the model back into those fields, so every older reader keeps working.
import { BRIEF_VERSION, type Brief } from './brief';
import type { TankSetup } from './types';
import { filterUnits, heaterUnits } from './tech';

export const GENERIC = 'generic';
export interface CatGear { owned: string[]; use?: string; locked: string[] }
export type GearModel = Record<string, CatGear>;
export const emptyGear = (): GearModel => ({});

const MAX_CATS = 40, MAX_ITEMS = 12, idOk = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length < 80;
const uniq = (a: string[]) => [...new Set(a)];
/** A category with nothing in it is dropped, and `use` / locks that name an item are kept as they stand (a bought item has no owned entry). */
const tidy = (c: CatGear): CatGear | undefined => {
  const out: CatGear = { owned: uniq(c.owned).slice(0, MAX_ITEMS), locked: uniq(c.locked).slice(0, MAX_ITEMS) };
  if (c.use !== undefined) out.use = c.use;
  return out.owned.length || out.locked.length || out.use !== undefined ? out : undefined;
};
const put = (g: GearModel, cat: string, c: CatGear): GearModel => {
  const { [cat]: _old, ...rest } = g, t = tidy(c);
  return t ? { ...rest, [cat]: t } : rest;
};
const at = (g: GearModel, cat: string): CatGear => g[cat] ?? { owned: [], locked: [] };

/** Validate a saved model (undefined when empty). */
export function parseGear(raw: unknown): GearModel | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  let g: GearModel = {};
  for (const [cat, v] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_CATS)) {
    if (!idOk(cat) || !v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>, list = (x: unknown) => Array.isArray(x) ? x.filter(idOk) : [];
    g = put(g, cat, { owned: list(r.owned), locked: list(r.locked), ...(idOk(r.use) ? { use: r.use } : {}) });
  }
  return Object.keys(g).length ? g : undefined;
}

// ------------------------------------------------------------------------------------------------ operations
/** "I have this". The first thing owned in a category becomes the one in use when nothing is. */
export const ownItem = (g: GearModel, cat: string, item: string): GearModel => { const c = at(g, cat); return put(g, cat, { ...c, owned: [...c.owned, item], ...(c.use === undefined ? { use: item } : {}) }); };
/** "I don't have this": it leaves the owned list and the in-use slot, but a lock stays (the person may still want it bought). */
export const unownItem = (g: GearModel, cat: string, item: string): GearModel => { const c = at(g, cat), owned = c.owned.filter(x => x !== item), { use, ...rest } = c; return put(g, cat, { ...rest, owned, ...(use !== undefined && use !== item ? { use } : owned.length ? { use: owned[0] } : {}) }); };
/** The item in use for the category (owned or bought). */
export const setInUse = (g: GearModel, cat: string, item: string | undefined): GearModel => { const { use: _u, ...c } = at(g, cat); return put(g, cat, item === undefined ? c : { ...c, use: item }); };
/** "Use this one for sure", owned or not. Locking never changes ownership or which item is in use. */
export const lockItem = (g: GearModel, cat: string, item: string): GearModel => { const c = at(g, cat); return put(g, cat, { ...c, locked: [...c.locked, item] }); };
export const unlockItem = (g: GearModel, cat: string, item: string): GearModel => { const c = at(g, cat); return put(g, cat, { ...c, locked: c.locked.filter(x => x !== item) }); };

// ------------------------------------------------------------------------------------------------ reads
export const categoriesOf = (g: GearModel): string[] => Object.keys(g);
export const isOwned = (g: GearModel, cat: string, item: string): boolean => at(g, cat).owned.includes(item);
export const isLockedItem = (g: GearModel, cat: string, item: string): boolean => at(g, cat).locked.includes(item);
export const inUseOf = (g: GearModel, cat: string): string | undefined => g[cat]?.use;
/** The items the person owns in the category: what Suggest and the generator prefer, at $0. */
export const ownedFor = (g: GearModel, cat: string): string[] => [...at(g, cat).owned];
/** The item that must be used for the category, if any: the locked one in use, else the first locked (owned or not). `owned` says whether it is $0. */
export function mustUse(g: GearModel, cat: string): { item: string; owned: boolean } | undefined {
  const c = at(g, cat), item = c.use !== undefined && c.locked.includes(c.use) ? c.use : c.locked[0];
  return item === undefined ? undefined : { item, owned: c.owned.includes(item) };
}
/** Every category with a locked item, with that item. */
export const mustUseAll = (g: GearModel): { cat: string; item: string; owned: boolean }[] => categoriesOf(g).flatMap(cat => { const m = mustUse(g, cat); return m ? [{ cat, ...m }] : []; });
/** Owned items cost $0 for the cost drawer / Print "Already owned": every owned item, in category order. */
export const ownedList = (g: GearModel): { cat: string; item: string; inUse: boolean }[] => categoriesOf(g).flatMap(cat => g[cat].owned.map(item => ({ cat, item, inUse: g[cat].use === item })));

// ------------------------------------------------------------------------------------------------ the brief
/** The model of a brief: its own field when it has one, else derived from the older fields (and the scene, when given). */
export const gearOf = (b: Brief, S?: TankSetup): GearModel => b.project?.gear ?? migrateGear(b, S);
/** Store the model (an empty one removes the field) and refresh the older fields it projects to, so every older reader (Suggest, cost lines, the Equipment sheet) sees the same facts. */
export function setGear(b: Brief, g: GearModel): Brief {
  const { gear: _g, use: _u, ...x } = b.project ?? {}, L = legacyOf(g), use = { ...(b.project?.use ?? {}) };
  for (const k of Object.keys(use) as (keyof typeof use)[]) if (k !== 'tank' && !(k in L.owned) && !(k in g)) delete use[k];
  for (const [k, u] of Object.entries(L.use)) use[k as keyof typeof use] = u;
  const items = { ...b.items } as Record<string, unknown>;
  if (Object.keys(L.owned).length) items['constraints.owned'] = { ...(items['constraints.owned'] as object | undefined), value: L.owned, status: 'preference' };
  else delete items['constraints.owned'];
  const next: Brief['project'] = { ...x, ...(Object.keys(g).length ? { gear: g } : {}), ...(Object.keys(use).length ? { use } : {}) };
  const { project: _p, ...rest } = b;
  return { ...rest, items: items as Brief['items'], ...(Object.keys(next ?? {}).length ? { project: next } : {}) };
}

/** The categories that older fields can carry one pick for (constraints.owned keys); the tank is `constraints.existingTank`. */
const LEGACY_PICK = (c: CatGear) => c.use !== undefined && c.owned.includes(c.use) ? c.use : c.owned[0];
/** The older fields a model projects to: `owned` = constraints.owned (one pick per category), `use` = project.use (a locked owned item is 'required'), `tank` = existingTank's model if owned. */
export function legacyOf(g: GearModel): { owned: Record<string, string>; use: Record<string, 'required' | 'available'>; tank?: string } {
  const owned: Record<string, string> = {}, use: Record<string, 'required' | 'available'> = {};
  let tank: string | undefined;
  for (const [cat, c] of Object.entries(g)) {
    const pick = LEGACY_PICK(c);
    if (pick === undefined) continue;
    if (cat === 'tank') tank = pick; else owned[cat] = pick;
    use[cat] = c.locked.includes(pick) ? 'required' : 'available';
  }
  return { owned, use, ...(tank !== undefined ? { tank } : {}) };
}

/** The model an older save implies: `constraints.owned` picks (owned, in use), `existingTank`, `project.use` 'required' = locked, then the scene's owned flags and Discover's gear locks. */
export function migrateGear(b: Brief, S?: TankSetup): GearModel {
  let g: GearModel = {};
  const owned = ((b.items['constraints.owned'] as { value?: Record<string, string>; off?: boolean } | undefined))?.value ?? {}, use = b.project?.use ?? {};
  const own = (cat: string, item: string, locked: boolean) => { g = ownItem(g, cat, item); if (locked) g = lockItem(g, cat, item); };
  const tank = b.items['constraints.existingTank'] as { value?: { model?: string }; off?: boolean } | undefined;
  if (tank && !tank.off) own('tank', tank.value?.model ?? GENERIC, use.tank === 'required');
  for (const [cat, pick] of Object.entries(owned)) if (idOk(pick)) own(cat, pick, use[cat as keyof typeof use] === 'required');
  if (S) {
    // gear marked owned on the scene by an older save or the Tech checkbox, which the brief never heard of
    const flag = (cat: string, item: string | undefined) => { if (!g[cat]?.owned.length) own(cat, item ?? GENERIC, false); };
    if (S.light.owned) flag('light', S.light.product);
    const h = S.tech ? heaterUnits(S.tech).find(u => u.owned) : undefined, f = S.tech ? filterUnits(S.tech).find(u => u.owned) : undefined;
    if (h) flag('heater', h.product);
    if (f) flag('filter', f.product);
    // Discover's "Keep this" on light / filter / heater is the same lock: it holds the item in use
    for (const o of S.locks?.objects ?? []) {
      if (o.target !== 'light' && o.target !== 'filter' && o.target !== 'heater') continue;
      const item = g[o.target]?.use ?? g[o.target]?.owned[0] ?? GENERIC;
      if (!g[o.target]) g = setInUse(g, o.target, item);
      g = lockItem(g, o.target, item);
    }
  }
  return g;
}

/** The gear parts (Discover's lock targets) whose in-use item is locked: the one lock, shown to the older Keep buttons. */
export const lockedGearParts = (g: GearModel): ('light' | 'filter' | 'heater')[] =>
  (['light', 'filter', 'heater'] as const).filter(p => { const c = g[p]; return !!c && c.use !== undefined && c.locked.includes(c.use); });

// ------------------------------------------------------------------------------------------------ what Suggest and the generator read
/** `requiredOwned` (kept in every design) and `lockedGear` (locked but not owned: kept too, and priced as bought), as `suggest.ts` Wants carries them. The tank is handled by `ownTank`. */
export function gearWants(b: Brief): { requiredOwned: string[]; lockedGear: Record<string, string> } {
  const g = gearOf(b), requiredOwned: string[] = [], lockedGear: Record<string, string> = {};
  for (const { cat, item, owned } of mustUseAll(g)) {
    if (cat === 'tank') continue;
    if (owned) requiredOwned.push(cat); else if (item !== GENERIC && item !== 'care' && item !== 'unknown') lockedGear[cat] = item;
  }
  return { requiredOwned, lockedGear };
}

/** The older owned fields changed by hand (the Equipment sheet's `setEquipment` / `removeEquipment` / `setOwnedUse`): fold the change into the model so there is still one truth.
 *  Per category, the pick the model projects (`legacyOf`) is swapped for the one the older fields now hold; its lock follows `project.use`. No model = nothing to do. */
export function reconcileGear(b: Brief): Brief {
  if (!b.project?.gear) return b;
  let g = b.project.gear;
  const now = migrateGear({ ...b, project: { ...b.project, gear: undefined } }), cur = legacyOf(g), nl = legacyOf(now);
  const cats = new Set([...Object.keys(cur.owned), ...Object.keys(nl.owned), ...(cur.tank !== undefined || nl.tank !== undefined ? ['tank'] : [])]);
  for (const cat of cats) {
    const a = cat === 'tank' ? cur.tank : cur.owned[cat], z = cat === 'tank' ? nl.tank : nl.owned[cat];
    if (a === z) { if (z !== undefined && (nl.use[cat] === 'required') !== (cur.use[cat] === 'required')) g = nl.use[cat] === 'required' ? lockItem(g, cat, z) : unlockItem(g, cat, z); continue; }
    if (a !== undefined) g = unownItem(g, cat, a);
    if (z !== undefined) { g = setInUse(ownItem(g, cat, z), cat, z); if (nl.use[cat] === 'required') g = lockItem(g, cat, z); }
  }
  return { ...b, project: { ...b.project, ...(Object.keys(g).length ? { gear: g } : { gear: undefined }) } };
}

// ------------------------------------------------------------------------------------------------ Discover's one lock
/** The item of a gear part as the design holds it right now: the product id, or GENERIC. */
export function gearItemOf(S: TankSetup, part: 'light' | 'filter' | 'heater'): string {
  if (part === 'light') return S.light.product ?? GENERIC;
  const u = S.tech ? (part === 'heater' ? heaterUnits(S.tech) : filterUnits(S.tech))[0] : undefined;
  return u?.product ?? GENERIC;
}
const tankGear = (T: TankSetup) => gearOf(T.brief ?? { v: BRIEF_VERSION, items: {} }, T);
const writeGear = (T: TankSetup, g: GearModel) => { T.brief = setGear(T.brief ?? { v: BRIEF_VERSION, items: {} }, g); };
/** The Equipment screen's "Use this one for sure" on the item in use: a DESIGN edit (the caller wraps it in store.edit, with undo). Discover's Keep never calls this: it writes only `T.locks` (PS1). */
export function keepGear(T: TankSetup, part: 'light' | 'filter' | 'heater', item: string): void {
  let g = tankGear(T); if (g[part]?.use !== item) g = setInUse(g, part, item);
  writeGear(T, lockItem(g, part, item));
}
/** Take the Keep off a gear part: every lock on that category goes. */
export function unkeepGear(T: TankSetup, part: string): void {
  let g = tankGear(T); for (const it of [...(g[part]?.locked ?? [])]) g = unlockItem(g, part, it);
  if (g !== tankGear(T) || T.brief?.project?.gear) writeGear(T, g);
}
/** Is the gear part held, by Discover's Keep or by the Equipment screen's lock? One answer. */
export const isGearKept = (T: TankSetup, part: string): boolean => !!T.locks?.objects.some(o => o.target === part) || lockedGearParts(tankGear(T)).includes(part as 'light');
/** The lock targets the model holds that the scene's lock list does not name yet (what `locksOf` adds, so Discover and its checks honor a lock set from the Equipment screen). */
export const modelLockTargets = (T: TankSetup): ('light' | 'filter' | 'heater')[] => T.brief?.project?.gear ? lockedGearParts(T.brief.project.gear).filter(p => !T.locks?.objects.some(o => o.target === p)) : [];

/** What must be used for a category on this tank, from BOTH stores through one read: the brief's lock (Equipment screen, a design edit) and Discover's Keep (`T.locks`, PS1: persistent, never a design write; it holds the item in use). */
export function mustUseOf(T: TankSetup, cat: string): { item: string; owned: boolean; by: 'equipment' | 'discover' } | undefined {
  const m = mustUse(T.brief?.project?.gear ?? migrateGear(T.brief ?? { v: BRIEF_VERSION, items: {} }, T), cat);
  if (m && T.brief?.project?.gear) return { ...m, by: 'equipment' };
  if ((cat === 'light' || cat === 'filter' || cat === 'heater') && T.locks?.objects.some(o => o.target === cat)) { const item = gearItemOf(T, cat); return { item, owned: !!T.brief?.project?.gear?.[cat]?.owned.includes(item), by: 'discover' }; }
  return m ? { ...m, by: 'equipment' } : undefined;
}
