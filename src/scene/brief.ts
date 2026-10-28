// The setup brief (lane U1, 2026-10-28, plan research/design/unified-setup-plan.md). One brief per tank / project that every entry point
// (an animal I want, a look I want, Sandbox, Suggest a setup) only PRE-FILLS. Pure data and helpers, no UI, no engine reads.
// Five groups, all optional, any order: animals, appearance, tank and equipment, constraints, preferences. Each item carries a status:
//   'hard'        a valid design must satisfy it (budget ceiling, max length, care time, existing tank, ...);
//   'preference'  ranks valid designs;
//   'locked'      a choice the generator may not change without asking.
// Animal welfare is NOT a status: it stays the stocking gates (stocking.ts / stockSummary.ts), a feasibility check no item can switch off.
// Storage: `TankSetup.brief` (types.ts), validated by `parseBrief` in scene/validate.ts, so it saves / loads / undoes with the project.
// An item with `off: true` is switched off but keeps its value (the Guardrails "on" toggle); it counts as not specified.
import { getTankModel } from '../data/tanks';
import type { DryGroup, Kind, OwnedKey, OwnedMap, Tag, Wants } from '../demand/suggest';
import type { Cap, Constraints, Effort } from './constraints';
import type { PlantMode } from './scapes';
import type { LayoutId, SpaceLimit } from './types';

export type Status = 'hard' | 'preference' | 'locked';
export const STATUSES: readonly Status[] = ['hard', 'preference', 'locked'];
export interface Item<T> { value: T; status: Status; off?: true }
export type GroupId = 'animals' | 'appearance' | 'equipment' | 'constraints' | 'preferences';
export const GROUPS: readonly { id: GroupId; label: string }[] = [
  { id: 'animals', label: 'Animals' }, { id: 'appearance', label: 'Appearance' }, { id: 'equipment', label: 'Tank and equipment' },
  { id: 'constraints', label: 'Constraints' }, { id: 'preferences', label: 'Preferences' },
];
/** A larger tank, more planted, ... : free-form wishes with no number (lane U6 edits these). */
export type Wish = 'larger-tank' | 'more-planted' | 'less-maintenance' | 'cheaper';
export const WISHES: readonly Wish[] = ['larger-tank', 'more-planted', 'less-maintenance', 'cheaper'];
export interface Stocked { species: string; count: number }

/** Every item id and its value type. The prefix is its group. */
export interface Values {
  'animals.kinds': Kind[];
  'animals.groups': DryGroup[];
  'animals.stock': Stocked[];
  'appearance.look': Exclude<LayoutId, 'none'>;
  'appearance.plantMode': PlantMode;
  'equipment.tank': { model?: string };
  'equipment.needStand': boolean;
  'constraints.budget': number;          // startup $ ceiling
  'constraints.monthly': number;         // $ a month
  'constraints.careMin': number;         // minutes a week (a field only: no model derives it yet)
  'constraints.setupHours': number;      // hours of set-up effort the person will spend (separate from upkeep)
  'constraints.maxSpace': SpaceLimit;    // mm
  'constraints.spaceGate': boolean;      // the Guardrails space switch (Constraints.space.on); absent = never set
  'constraints.existingTank': { model?: string };
  'constraints.owned': OwnedMap;
  'constraints.taxPct': number;          // sales tax %, editable, default 0
  'preferences.tags': Tag[];
  'preferences.wishes': Wish[];
  'preferences.effort': Effort;
  'preferences.experience': 0 | 1 | 2;
}
export type ItemId = keyof Values;
export const ITEM_IDS: readonly ItemId[] = ['animals.kinds', 'animals.groups', 'animals.stock', 'appearance.look', 'appearance.plantMode', 'equipment.tank',
  'equipment.needStand', 'constraints.budget', 'constraints.monthly', 'constraints.careMin', 'constraints.setupHours', 'constraints.maxSpace', 'constraints.spaceGate', 'constraints.existingTank',
  'constraints.owned', 'constraints.taxPct', 'preferences.tags', 'preferences.wishes', 'preferences.effort', 'preferences.experience'];

export const BRIEF_VERSION = 1;
export interface Brief { v: number; items: { [K in ItemId]?: Item<Values[K]> } }

export const emptyBrief = (): Brief => ({ v: BRIEF_VERSION, items: {} });
export const groupOf = (id: ItemId): GroupId => id.split('.')[0] as GroupId;
export const idsOf = (g: GroupId): ItemId[] => ITEM_IDS.filter(i => groupOf(i) === g);

export function getItem<K extends ItemId>(b: Brief, id: K): Item<Values[K]> | undefined { return b.items[id] as Item<Values[K]> | undefined; }
/** The value while the item is on; undefined when absent or switched off. */
export function valueOf<K extends ItemId>(b: Brief, id: K): Values[K] | undefined { const it = getItem(b, id); return it && !it.off ? it.value : undefined; }
/** The editable tax rate; 0 when unset. */
export const taxPct = (b: Brief): number => valueOf(b, 'constraints.taxPct') ?? 0;

/** Set an item (new value; the status stays if it already had one, else 'preference' unless given). Returns a new brief. */
export function setItem<K extends ItemId>(b: Brief, id: K, value: Values[K], status?: Status): Brief {
  const old = getItem(b, id), it: Item<Values[K]> = { value, status: status ?? old?.status ?? 'preference' };
  return { ...b, items: { ...b.items, [id]: it } };
}
export function clearItem(b: Brief, id: ItemId): Brief {
  if (!(id in b.items)) return b;
  const items = { ...b.items }; delete items[id]; return { ...b, items };
}
export function setStatus(b: Brief, id: ItemId, status: Status): Brief {
  const it = b.items[id]; return it ? { ...b, items: { ...b.items, [id]: { ...it, status } } } : b;
}
/** Switch an item off (value kept) or back on. */
export function setOff(b: Brief, id: ItemId, off: boolean): Brief {
  const it = b.items[id]; if (!it) return b;
  const { off: _o, ...rest } = it; return { ...b, items: { ...b.items, [id]: (off ? { ...rest, off: true } : rest) as Item<unknown> } };
}
/** Lock an item the generator must not change (an animal, a tank, a look); no-op when absent. */
export const lock = (b: Brief, id: ItemId): Brief => setStatus(b, id, 'locked');
/** Back to a preference (a hard constraint stays hard: unlock only releases locks). */
export const unlock = (b: Brief, id: ItemId): Brief => b.items[id]?.status === 'locked' ? setStatus(b, id, 'preference') : b;
export const lockedIds = (b: Brief): ItemId[] => ITEM_IDS.filter(i => b.items[i]?.status === 'locked' && !b.items[i]!.off);
export const hardIds = (b: Brief): ItemId[] => ITEM_IDS.filter(i => b.items[i]?.status === 'hard' && !b.items[i]!.off);

/** A group is specified when at least one of its items is set and on. */
export const isSpecified = (b: Brief, g: GroupId): boolean => idsOf(g).some(i => valueOf(b, i) !== undefined);
/** The groups still empty, in display order: what progressive questions (lane U3) may still ask. */
export const openGroups = (b: Brief): GroupId[] => GROUPS.map(g => g.id).filter(g => !isSpecified(b, g));
export const isEmpty = (b: Brief): boolean => ITEM_IDS.every(i => !(i in b.items));

// ---- serialisable form: the brief is plain JSON already; parseBrief validates anything saved or shared ----
export const serializeBrief = (b: Brief): string => JSON.stringify(b);

const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const strs = <T extends string>(v: unknown, ok: readonly T[]): T[] | undefined => Array.isArray(v) ? [...new Set(v.filter((x): x is T => ok.includes(x as T)))] : undefined;
const KINDS: readonly Kind[] = ['freshwater', 'saltwater', 'terrarium', 'vivarium'];
const DRY: readonly DryGroup[] = ['herp', 'arthropod'];
const TAG_IDS: readonly Tag[] = ['colorful', 'active', 'calm', 'natural', 'unusual', 'low-maint'];
const OWNED_KEYS: readonly OwnedKey[] = ['filter', 'heater', 'light', 'skimmer', 'flow', 'lid', 'stand', 'testkit', 'dryheat'];
const MODES: readonly PlantMode[] = ['live', 'artificial', 'mixed'];
const modelOf = (v: unknown): { model?: string } | undefined => v && typeof v === 'object' ? (typeof (v as { model?: unknown }).model === 'string' ? { model: (v as { model: string }).model } : {}) : undefined;

/** Per item: a value validator returning the clean value, or undefined to drop the item. */
const VALIDATE: { [K in ItemId]: (v: unknown) => Values[K] | undefined } = {
  'animals.kinds': v => { const a = strs(v, KINDS); return a?.length ? a : undefined; },
  'animals.groups': v => { const a = strs(v, DRY); return a?.length ? a : undefined; },
  'animals.stock': v => { if (!Array.isArray(v)) return undefined;
    const a = v.filter((x): x is Stocked => !!x && typeof x.species === 'string' && num(x.count, 1, 1e4)).map(x => ({ species: x.species, count: Math.round(x.count) })); return a.length ? a : undefined; },
  'appearance.look': v => typeof v === 'string' && v !== 'none' && v.length < 40 ? v as Values['appearance.look'] : undefined,
  'appearance.plantMode': v => MODES.includes(v as PlantMode) ? v as PlantMode : undefined,
  'equipment.tank': modelOf,
  'equipment.needStand': v => typeof v === 'boolean' ? v : undefined,
  'constraints.budget': v => num(v, 0, 1e7) ? v : undefined,
  'constraints.monthly': v => num(v, 0, 1e7) ? v : undefined,
  'constraints.careMin': v => num(v, 0, 10080) ? v : undefined,
  'constraints.spaceGate': v => typeof v === 'boolean' ? v : undefined,
  'constraints.setupHours': v => num(v, 0, 1000) ? v : undefined,
  'constraints.maxSpace': v => { const o = v as Partial<SpaceLimit> | undefined;
    return o && typeof o === 'object' && num(o.w, 1, 1e5) && num(o.d, 1, 1e5) ? { w: o.w, d: o.d, ...(num(o.h, 1, 1e5) ? { h: o.h } : {}) } : undefined; },
  'constraints.existingTank': modelOf,
  'constraints.owned': v => { if (!v || typeof v !== 'object') return undefined; const o: OwnedMap = {};
    for (const k of OWNED_KEYS) { const p = (v as Record<string, unknown>)[k]; if (typeof p === 'string' && p) o[k] = p; } return Object.keys(o).length ? o : undefined; },
  'constraints.taxPct': v => num(v, 0, 100) ? v : undefined,
  'preferences.tags': v => { const a = strs(v, TAG_IDS); return a?.length ? a : undefined; },
  'preferences.wishes': v => { const a = strs(v, WISHES); return a?.length ? a : undefined; },
  'preferences.effort': v => v === 'low' || v === 'medium' || v === 'high' ? v : undefined,
  'preferences.experience': v => v === 0 || v === 1 || v === 2 ? v : undefined,
};

/** Validate a saved / shared value; undefined when absent or empty (an old save without a brief). A newer version is read as far as it is understood. */
export function parseBrief(raw: unknown): Brief | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const items = (raw as { items?: unknown }).items, out = emptyBrief();
  if (!items || typeof items !== 'object') return undefined;
  const dst = out.items as Record<string, Item<unknown>>;
  for (const id of ITEM_IDS) {
    const it = (items as Record<string, unknown>)[id] as { value?: unknown; status?: unknown; off?: unknown } | undefined;
    if (!it || typeof it !== 'object') continue;
    const value = (VALIDATE[id] as (v: unknown) => unknown)(it.value);
    if (value === undefined) continue;
    dst[id] = { value, status: STATUSES.includes(it.status as Status) ? it.status as Status : 'preference', ...(it.off === true ? { off: true as const } : {}) };
  }
  return isEmpty(out) ? undefined : out;
}

// ---- adapter: Wants <-> Brief, lossless for everything Wants holds (suggestSetups is unchanged and still reads Wants) ----
const capItem = (c: Cap | undefined): Item<number> | undefined => c ? { value: c.value, status: 'hard', ...(c.on ? {} : { off: true as const }) } : undefined;
const capOf = (it: Item<number> | undefined): Cap | undefined => it ? { on: !it.off, value: it.value } : undefined;

export function briefFromWants(w: Wants): Brief {
  let b = emptyBrief();
  const pref = <K extends ItemId>(id: K, v: Values[K] | undefined) => { if (v !== undefined) b = setItem(b, id, v, 'preference'); };
  pref('animals.kinds', w.kinds ? [...w.kinds] : undefined);
  pref('animals.groups', w.groups ? [...w.groups] : undefined);
  pref('equipment.needStand', w.needStand);
  pref('constraints.owned', w.owned ? { ...w.owned } : undefined);
  pref('preferences.tags', w.tags ? [...w.tags] : undefined);
  const c = w.constraints, put = <K extends ItemId>(id: K, it: Item<Values[K]> | undefined) => { if (it) b = { ...b, items: { ...b.items, [id]: it } }; };
  put('constraints.budget', capItem(c.startupUsd)); put('constraints.monthly', capItem(c.monthlyUsd)); put('constraints.careMin', capItem(c.minutesPerWeek));
  if (w.space) put('constraints.maxSpace', { value: { ...w.space }, status: 'hard' });
  if (c.space) put('constraints.spaceGate', { value: c.space.on, status: 'hard' });
  if (w.setupHours !== undefined) b = setItem(b, 'constraints.setupHours', w.setupHours, 'hard');
  pref('preferences.effort', c.effort); pref('preferences.experience', c.experience);
  if (w.taxPct !== undefined) b = setItem(b, 'constraints.taxPct', w.taxPct, 'hard');
  if (w.animals?.length) b = setItem(b, 'animals.stock', w.animals.map(a => ({ species: a.species, count: a.n })), 'locked');
  if (w.ownTank) b = setItem(b, 'constraints.existingTank', { model: w.ownTank.id }, 'hard');
  return b;
}

/** Wants from a brief. `constraints` is always present (possibly {}), as Wants requires. */
export function briefToWants(b: Brief): Wants {
  const g = <K extends ItemId>(id: K) => getItem(b, id);
  const c: Constraints = {}, st = capOf(g('constraints.budget')), mo = capOf(g('constraints.monthly')), mi = capOf(g('constraints.careMin')), sp = g('constraints.maxSpace'), gate = g('constraints.spaceGate');
  if (st) c.startupUsd = st; if (mo) c.monthlyUsd = mo; if (mi) c.minutesPerWeek = mi;
  if (gate) c.space = { on: gate.value };
  const ef = g('preferences.effort'), ex = g('preferences.experience');
  if (ef) c.effort = ef.value; if (ex) c.experience = ex.value;
  const w: Wants = { constraints: c };
  const sh = g('constraints.setupHours'); if (sh && !sh.off) w.setupHours = sh.value;
  const kinds = g('animals.kinds'), groups = g('animals.groups'), owned = g('constraints.owned'), stand = g('equipment.needStand'), tags = g('preferences.tags');
  if (kinds) w.kinds = [...kinds.value]; if (groups) w.groups = [...groups.value]; if (owned) w.owned = { ...owned.value };
  if (stand) w.needStand = stand.value; if (tags) w.tags = [...tags.value];
  if (sp) w.space = { ...sp.value };
  // lane U2 hooks: the sales tax, a LOCKED stocking list (the generator never changes it) and an existing tank (the only tank offered, $0)
  const tax = g('constraints.taxPct'), stock = g('animals.stock'), own = g('constraints.existingTank');
  if (tax && !tax.off) w.taxPct = tax.value;
  if (stock && stock.status === 'locked' && stock.value.length) w.animals = stock.value.map(x => ({ species: x.species, n: x.count }));
  const model = own?.value.model ? getTankModel(own.value.model) : undefined;
  if (model) w.ownTank = model;
  return w;
}
