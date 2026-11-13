// P9 (2026-11-13; UI2 §2a, §3, §7 P9): Nathan's custom tanks. A custom tank is a named spec (shape, L / H / D, shape dims, glass, rim, optional own price,
// owned flag) kept in a per-browser library (localStorage `tanklook.customTanks`) shared by every setup. A setup holds its OWN copy (its tank + render
// glass / rim, plus `TankSetup.customTank` = name, library id, version, own price, owned), so a library edit or delete never changes a saved setup.
// Pure data layer: no UI. Storage is injected (node tests), and defaults to localStorage when there is one.
import { defaultSetup } from './defaults';
import { parseTank, parseCustomRef } from './validate';
import { newUid } from './uid';
import { autoName } from './customTankName';
import type { CustomTankRef, GlassType, Tank, TankSetup } from './types';

export const CUSTOM_KEY = 'tanklook.customTanks';
export { autoName };

export interface CustomTankSpec {
  name: string;
  tank: Tank;
  /** mm, or 'auto' (by interior height) */
  glass: 'auto' | number;
  glassType: GlassType;
  rim: boolean;
  /** the user's own price for this tank, USD; absent = the engine's estimate */
  priceUsd?: number;
  owned?: boolean;
}
export interface CustomTank extends CustomTankSpec { id: string; version: number; updated: number }
export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void }

const defStore = (): Store | undefined => { try { return (globalThis as { localStorage?: Store }).localStorage; } catch { return undefined; } };

/** One spec from untrusted JSON, validated like the scene's tank; undefined when it is not a spec at all. */
export function parseSpec(raw: unknown): CustomTankSpec | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (!o.tank || typeof o.tank !== 'object') return undefined;
  const tank = parseTank(o.tank, defaultSetup().tank);
  const ref = parseCustomRef({ name: typeof o.name === 'string' && o.name.trim() ? o.name : autoName(tank), priceUsd: o.priceUsd, owned: o.owned })!;
  return {
    name: ref.name, tank,
    glass: o.glass === 'auto' ? 'auto' : typeof o.glass === 'number' && o.glass >= 3 && o.glass <= 25 ? +o.glass.toFixed(2) : 'auto',
    glassType: o.glassType === 'lowiron' ? 'lowiron' : 'standard',
    rim: o.rim !== false,
    ...(ref.priceUsd !== undefined ? { priceUsd: ref.priceUsd } : {}),
    ...(ref.owned ? { owned: true } : {}),
  };
}

function parseEntry(raw: unknown): CustomTank | undefined {
  const s = parseSpec(raw), o = raw as Record<string, unknown>;
  if (!s || typeof o.id !== 'string' || !o.id) return undefined;
  return { ...s, id: o.id.slice(0, 64), version: typeof o.version === 'number' && Number.isInteger(o.version) && o.version >= 1 ? o.version : 1, updated: typeof o.updated === 'number' && Number.isFinite(o.updated) ? o.updated : 0 };
}

/** The saved library, oldest first; junk entries and duplicate ids are dropped, blocked storage reads as empty. */
export function loadLibrary(store: Store | undefined = defStore()): CustomTank[] {
  try {
    const j = JSON.parse(store?.getItem(CUSTOM_KEY) ?? '[]');
    const seen = new Set<string>(), out: CustomTank[] = [];
    for (const r of Array.isArray(j) ? j : []) { const e = parseEntry(r); if (e && !seen.has(e.id)) { seen.add(e.id); out.push(e); } }
    return out;
  } catch { return []; }
}
export function saveLibrary(lib: readonly CustomTank[], store: Store | undefined = defStore()): boolean {
  try { store?.setItem(CUSTOM_KEY, JSON.stringify(lib)); return !!store; } catch { return false; }
}

const find = (lib: readonly CustomTank[], id: string) => lib.find(e => e.id === id);
/** A name not already taken in the library ("Name", "Name 2", ...), case-insensitive. */
function freeName(lib: readonly CustomTank[], name: string, ignoreId?: string): string {
  const base = (name.trim() || 'Custom tank').slice(0, 76), taken = new Set(lib.filter(e => e.id !== ignoreId).map(e => e.name.toLowerCase()));
  let n = base, i = 2;
  while (taken.has(n.toLowerCase())) n = `${base} ${i++}`;
  return n;
}

// All ops return the NEW library and never mutate their input; call saveLibrary to keep it. `now` is injectable for tests.
export function addCustomTank(lib: readonly CustomTank[], spec: CustomTankSpec, now = Date.now()): { lib: CustomTank[]; entry: CustomTank } {
  const s = parseSpec(spec)!;
  const entry: CustomTank = { ...s, name: freeName(lib, s.name), id: newUid('ct'), version: 1, updated: now };
  return { lib: [...lib, entry], entry };
}
const sameTankSpec = (a: CustomTankSpec, b: CustomTankSpec) =>
  JSON.stringify([a.tank, a.glass, a.glassType, a.rim, a.priceUsd ?? null]) === JSON.stringify([b.tank, b.glass, b.glassType, b.rim, b.priceUsd ?? null]);
/** Edit: the version goes up by one when the tank (size, shape, glass, rim) or the price changes; a rename or the owned flag alone does not bump it. `priceUsd: undefined` in the patch clears the own price. */
export function editCustomTank(lib: readonly CustomTank[], id: string, patch: Partial<CustomTankSpec>, now = Date.now()): { lib: CustomTank[]; entry?: CustomTank } {
  const cur = find(lib, id);
  if (!cur) return { lib: [...lib] };
  const merged = parseSpec({ ...cur, ...patch })!;
  const entry: CustomTank = { ...merged, name: freeName(lib, merged.name, id), id, version: cur.version + (sameTankSpec(cur, merged) ? 0 : 1), updated: now };
  return { lib: lib.map(e => e.id === id ? entry : e), entry };
}
export const renameCustomTank = (lib: readonly CustomTank[], id: string, name: string, now = Date.now()) => editCustomTank(lib, id, { name }, now);
/** Duplicate: a new entry "Name copy" with a fresh id at version 1. */
export function duplicateCustomTank(lib: readonly CustomTank[], id: string, now = Date.now()): { lib: CustomTank[]; entry?: CustomTank } {
  const cur = find(lib, id);
  if (!cur) return { lib: [...lib] };
  const { id: _i, version: _v, updated: _u, ...spec } = cur;
  return addCustomTank(lib, { ...spec, name: `${cur.name} copy` }, now);
}
/** Delete: setups that use it keep their own copy (their `customTank.id` simply no longer resolves). */
export const deleteCustomTank = (lib: readonly CustomTank[], id: string): CustomTank[] => lib.filter(e => e.id !== id);

/** The spec a setup currently holds (its own copy), for "Save to my tanks" from a setup. */
export function specOfSetup(S: Pick<TankSetup, 'tank' | 'render' | 'customTank'>): CustomTankSpec {
  const c = S.customTank;
  return { name: c?.name ?? autoName(S.tank), tank: structuredClone(S.tank), glass: S.render.glass, glassType: S.render.glassType, rim: S.render.rim,
    ...(c?.priceUsd !== undefined ? { priceUsd: c.priceUsd } : {}), ...(c?.owned ? { owned: true } : {}) };
}

export const refOf = (e: CustomTank): CustomTankRef =>
  ({ name: e.name, id: e.id, version: e.version, ...(e.priceUsd !== undefined ? { priceUsd: e.priceUsd } : {}), ...(e.owned ? { owned: true } : {}) });

/** Put a library tank on a setup as the setup's own copy (tank, glass, rim, ref); a commercial product or kit is released. The caller regrids terrain / refits the scene as it does for any tank change. */
export function useCustomTank(S: TankSetup, e: CustomTank): void {
  S.tank = structuredClone(e.tank);
  S.render.glass = e.glass; S.render.glassType = e.glassType; S.render.rim = e.rim;
  S.customTank = refOf(e);
  delete S.product; delete S.integrated;
}

/** "Updated in my tanks: use the new version?": the library entry when it is newer than the setup's copy; undefined when the setup has no library link, the entry was deleted, or the copy is current. */
export function newerVersion(S: Pick<TankSetup, 'customTank'>, lib: readonly CustomTank[]): CustomTank | undefined {
  const c = S.customTank, e = c?.id ? find(lib, c.id) : undefined;
  return e && e.version > (c!.version ?? 0) ? e : undefined;
}
/** True when the setup's library link points at an entry that was deleted (the setup still has its copy). */
export const libraryLost = (S: Pick<TankSetup, 'customTank'>, lib: readonly CustomTank[]): boolean => !!S.customTank?.id && !find(lib, S.customTank.id);
