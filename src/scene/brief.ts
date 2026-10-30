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
import { parseTaste, type Taste } from '../demand/taste';
import type { LayoutId, SpaceLimit } from './types';

export type Status = 'hard' | 'preference' | 'locked';
export const STATUSES: readonly Status[] = ['hard', 'preference', 'locked'];
/** `flex` = willing to change this item (brief v2, lane NG2). */
export interface Item<T> { value: T; status: Status; off?: true; flex?: true }
/** A limit is a RANGE (brief v3, lane GV8, Nathan 2026-10-30): `value` is the upper bound ("at most"), `min` the lower bound ("at least"); either, both or neither may be set
 *  (neither = no item). A lower-only limit has no `value`, so `valueOf` (the upper bound) reads it as "no maximum". A narrow band ($400-420) is how a person names a target. */
export interface LimitItem<T> { value?: T; min?: T; status: Status; off?: true; flex?: true }
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
  'constraints.maxSpace': SpaceLimit;    // mm (max only: a footprint has no useful lower bound; the tank size in gallons below carries "not smaller than")
  'constraints.tankGal': number;         // tank size, gallons (rated); a range (brief v3)
  'constraints.spaceGate': boolean;      // the Guardrails space switch (Constraints.space.on); absent = never set
  'constraints.existingTank': { model?: string };
  'constraints.owned': OwnedMap;
  'constraints.taxPct': number;          // sales tax %, editable, default 0
  'constraints.phased': boolean;         // buy in phases: the tank stays unstocked until the animal-care essentials are in (lane U4); only the essentials count against the ceiling
  'preferences.hightech': boolean;       // the person wants the high-tech approach (CO2, strong light) for the planted look; hard unless dropped (lane U4)
  'preferences.lowtech': boolean;        // the planted look without CO2 or a strong light: dense plants chosen for the light the tank has, liquid ferts only (lane U5; set by U4's 'low-tech' alternative)
  'preferences.tags': Tag[];
  'preferences.wishes': Wish[];
  'preferences.effort': Effort;
  'preferences.experience': 0 | 1 | 2;
  // ---- brief v2 (lane NG2, 2026-10-29) ----
  'constraints.roomTempC': number;       // room temperature, stored metric (deg C); shown in deg F
  'constraints.tapWater': TapWater;      // where the water comes from and how hard it is
  'preferences.desired': Desire[];       // what the person wants from the tank
  'preferences.adapt': Adapt;            // how willing they are to change the plan
  'preferences.taste': Taste;            // what look-picker picks / rejections taught the ranking (lane NG5, demand/taste.ts)
  'preferences.future': Ambition[];      // future ambitions saved for later (the slot is empty until lane NG4 fills it)
}
export type WaterSrc = 'tap' | 'well' | 'ro';
export const WATER_SOURCES: readonly WaterSrc[] = ['tap', 'well', 'ro'];
/** hardness in dGH, pH 0-14; both optional (blank = not known) */
export interface TapWater { source: WaterSrc; hardnessDgh?: number; ph?: number }
export type Desire = 'watch' | 'plants' | 'breed' | 'centerpiece' | 'relax' | 'learn' | 'kids';
export const DESIRES: readonly Desire[] = ['watch', 'plants', 'breed', 'centerpiece', 'relax', 'learn', 'kids'];
export type Adapt = 'fixed' | 'some' | 'open';
export const ADAPTS: readonly Adapt[] = ['fixed', 'some', 'open'];
/** A goal parked for later: `text` is what the person said, `from` an optional note of the conflict it came from. */
export interface Ambition { text: string; from?: string }
/** Persistent conversation state: questions answered (QId strings of setupBrief) and the chosen direction. Open questions are derived from the items and this. */
export interface Dialog { answered: string[]; direction?: string }
export type ItemId = keyof Values;
export const ITEM_IDS: readonly ItemId[] = ['animals.kinds', 'animals.groups', 'animals.stock', 'appearance.look', 'appearance.plantMode', 'equipment.tank',
  'equipment.needStand', 'constraints.budget', 'constraints.monthly', 'constraints.careMin', 'constraints.setupHours', 'constraints.maxSpace', 'constraints.spaceGate', 'constraints.existingTank',
  'constraints.owned', 'constraints.tankGal', 'constraints.taxPct', 'constraints.phased', 'preferences.tags', 'preferences.wishes', 'preferences.effort', 'preferences.experience', 'preferences.hightech', 'preferences.lowtech',
  'constraints.roomTempC', 'constraints.tapWater', 'preferences.desired', 'preferences.adapt', 'preferences.future', 'preferences.taste'];
/** Items that are ranges (lower and upper bound): money, time, space, tank size. */
export const LIMIT_IDS = ['constraints.budget', 'constraints.monthly', 'constraints.careMin', 'constraints.setupHours', 'constraints.maxSpace', 'constraints.tankGal'] as const satisfies readonly ItemId[];
export type LimitId = typeof LIMIT_IDS[number];
/** The limits that are plain numbers (everything but the footprint): these take both bounds. */
export const NUM_LIMIT_IDS = ['constraints.budget', 'constraints.monthly', 'constraints.careMin', 'constraints.setupHours', 'constraints.tankGal'] as const satisfies readonly LimitId[];
export type NumLimitId = typeof NUM_LIMIT_IDS[number];
export const isLimitId = (id: ItemId): id is LimitId => (LIMIT_IDS as readonly string[]).includes(id);
export type ItemOf<K extends ItemId> = K extends LimitId ? LimitItem<Values[K]> : Item<Values[K]>;

// v3 (GV8): every limit is a range; `target` is retired (a narrow band does its job). v1 / v2 saves load with `value` as the upper bound, and an old `target` is dropped.
export const BRIEF_VERSION = 3;
export interface Brief { v: number; items: { [K in ItemId]?: ItemOf<K> }; dialog?: Dialog }

export const emptyBrief = (): Brief => ({ v: BRIEF_VERSION, items: {} });
export const groupOf = (id: ItemId): GroupId => id.split('.')[0] as GroupId;
export const idsOf = (g: GroupId): ItemId[] => ITEM_IDS.filter(i => groupOf(i) === g);

export function getItem<K extends ItemId>(b: Brief, id: K): ItemOf<K> | undefined { return b.items[id] as ItemOf<K> | undefined; }
/** The value while the item is on; undefined when absent or switched off. For a limit this is the UPPER bound (undefined = no maximum). */
export function valueOf<K extends ItemId>(b: Brief, id: K): Values[K] | undefined { const it = getItem(b, id); return it && !it.off ? it.value as Values[K] | undefined : undefined; }
/** The editable tax rate; 0 when unset. */
export const taxPct = (b: Brief): number => valueOf(b, 'constraints.taxPct') ?? 0;

// ---- ranges ----
/** A lower and an upper bound; either may be missing (a missing bound is not a limit). */
export interface Range { min?: number; max?: number }
/** The range of a numeric limit while the item is on; {} when absent or off. */
export function rangeOf(b: Brief, id: NumLimitId): Range {
  const it = getItem(b, id); if (!it || it.off) return {};
  return { ...(it.min !== undefined ? { min: it.min } : {}), ...(it.value !== undefined ? { max: it.value } : {}) };
}
/** The lower bound of a numeric limit (undefined = none). */
export const minOf = (b: Brief, id: NumLimitId): number | undefined => rangeOf(b, id).min;
/** Clean a range: drop non-numbers and negatives; a lower bound above the upper bound is SWAPPED (both figures the person gave are kept, never one dropped). */
export function cleanRange(r: Range): Range {
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  let min = ok(r.min) ? r.min : undefined, max = ok(r.max) ? r.max : undefined;
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  return { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
}
/** Set a numeric limit's range (either bound, both, or neither: neither removes the item). The status stays if the item had one, else 'hard'; flex / off are kept. */
export function setRange(b: Brief, id: NumLimitId, r: Range, status?: Status): Brief {
  const c = cleanRange(r), old = getItem(b, id);
  if (c.min === undefined && c.max === undefined) return clearItem(b, id);
  const it: LimitItem<number> = { ...(c.max !== undefined ? { value: c.max } : {}), ...(c.min !== undefined ? { min: c.min } : {}), status: status ?? old?.status ?? 'hard' };
  if (old?.off) it.off = true;
  if (old?.flex) it.flex = true;
  return { ...b, items: { ...b.items, [id]: it } };
}
/** Change one bound and keep the other (even while the item is switched off). undefined clears that bound. */
export function setBound(b: Brief, id: NumLimitId, which: 'min' | 'max', v: number | undefined): Brief {
  const it = getItem(b, id);
  return setRange(b, id, { ...(it?.min !== undefined ? { min: it.min } : {}), ...(it?.value !== undefined ? { max: it.value } : {}), [which]: v });
}
/** Where a figure stands against a range. */
export function against(r: Range, n: number): 'below' | 'in' | 'above' { return r.max !== undefined && n > r.max ? 'above' : r.min !== undefined && n < r.min ? 'below' : 'in'; }
/** The middle of a band (both bounds set), else undefined: what ranking aims at ("a narrow band is a target"). */
export const midOf = (r: Range): number | undefined => r.min !== undefined && r.max !== undefined ? (r.min + r.max) / 2 : undefined;
/** The figure ranking aims at: the middle of the band; undefined unless both bounds are set (and never for the footprint). */
export function targetOf(b: Brief, id: LimitId): number | undefined { return id === 'constraints.maxSpace' ? undefined : midOf(rangeOf(b, id)); }
/** "$300-600", "at least $300", "up to $600 a month", "20-40 min a week": `pre` goes before each figure ("$"), `unit` after the last one (" a month", " gal"). */
export function rangeText(r: Range, unit = '', pre = ''): string {
  const f = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-US');
  if (r.min !== undefined && r.max !== undefined) return `${pre}${f(r.min)}-${f(r.max)}${unit}`;
  if (r.min !== undefined) return `at least ${pre}${f(r.min)}${unit}`;
  if (r.max !== undefined) return `up to ${pre}${f(r.max)}${unit}`;
  return '';
}
/** "Willing to change" flag on any item. */
export function setFlex(b: Brief, id: ItemId, flex: boolean): Brief {
  const it = b.items[id]; if (!it) return b;
  const { flex: _f, ...rest } = it; return { ...b, items: { ...b.items, [id]: (flex ? { ...rest, flex: true } : rest) as Item<unknown> } };
}
export const isFlex = (b: Brief, id: ItemId): boolean => !!b.items[id]?.flex;
/** The persistent conversation state (never undefined). */
export const dialogOf = (b: Brief): Dialog => b.dialog ?? { answered: [] };
export function setDialog(b: Brief, d: Dialog): Brief {
  const { dialog: _d, ...rest } = b;
  return d.answered.length || d.direction ? { ...rest, dialog: { answered: [...new Set(d.answered)], ...(d.direction ? { direction: d.direction } : {}) } } : rest;
}

/** Set an item (new value; the status stays if it already had one, else 'preference' unless given). Returns a new brief. */
export function setItem<K extends ItemId>(b: Brief, id: K, value: Values[K], status?: Status): Brief {
  const old = getItem(b, id) as LimitItem<Values[K]> | undefined, it: LimitItem<Values[K]> = { value, status: status ?? old?.status ?? 'preference' };
  // a limit's lower bound survives a new upper bound unless the new one is below it
  if (isLimitId(id) && old?.min !== undefined && typeof value === 'number' && typeof old.min === 'number' && old.min <= value) it.min = old.min;
  if (old?.flex) it.flex = true;
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
/** Anything worth saving: items or conversation state (isEmpty looks at items only). */
export const hasState = (b: Brief): boolean => !isEmpty(b) || !!b.dialog;

// ---- serialisable form: the brief is plain JSON already; parseBrief validates anything saved or shared ----
export const serializeBrief = (b: Brief): string => JSON.stringify(b);

const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const strs = <T extends string>(v: unknown, ok: readonly T[]): T[] | undefined => Array.isArray(v) ? [...new Set(v.filter((x): x is T => ok.includes(x as T)))] : undefined;
const KINDS: readonly Kind[] = ['freshwater', 'saltwater', 'terrarium', 'vivarium'];
const DRY: readonly DryGroup[] = ['herp', 'arthropod'];
const TAG_IDS: readonly Tag[] = ['colorful', 'active', 'calm', 'natural', 'unusual', 'low-maint'];
const OWNED_KEYS: readonly OwnedKey[] = ['filter', 'heater', 'light', 'skimmer', 'flow', 'lid', 'stand', 'testkit', 'dryheat', 'siphon', 'net', 'conditioner', 'thermometer', 'bucket'];
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
  'constraints.tankGal': v => num(v, 0, 1e5) ? v : undefined,
  'constraints.maxSpace': v => { const o = v as Partial<SpaceLimit> | undefined;
    return o && typeof o === 'object' && num(o.w, 1, 1e5) && num(o.d, 1, 1e5) ? { w: o.w, d: o.d, ...(num(o.h, 1, 1e5) ? { h: o.h } : {}) } : undefined; },
  'constraints.existingTank': modelOf,
  'constraints.owned': v => { if (!v || typeof v !== 'object') return undefined; const o: OwnedMap = {};
    for (const k of OWNED_KEYS) { const p = (v as Record<string, unknown>)[k]; if (typeof p === 'string' && p) o[k] = p; } return Object.keys(o).length ? o : undefined; },
  'constraints.taxPct': v => num(v, 0, 100) ? v : undefined,
  'constraints.phased': v => typeof v === 'boolean' ? v : undefined,
  'preferences.hightech': v => typeof v === 'boolean' ? v : undefined,
  'preferences.lowtech': v => typeof v === 'boolean' ? v : undefined,
  'preferences.tags': v => { const a = strs(v, TAG_IDS); return a?.length ? a : undefined; },
  'preferences.wishes': v => { const a = strs(v, WISHES); return a?.length ? a : undefined; },
  'preferences.effort': v => v === 'low' || v === 'medium' || v === 'high' ? v : undefined,
  'preferences.experience': v => v === 0 || v === 1 || v === 2 ? v : undefined,
  'constraints.roomTempC': v => num(v, -10, 60) ? Math.round(v * 10) / 10 : undefined,
  'constraints.tapWater': v => { const o = v as Partial<TapWater> | undefined;
    if (!o || typeof o !== 'object' || !WATER_SOURCES.includes(o.source as WaterSrc)) return undefined;
    return { source: o.source as WaterSrc, ...(num(o.hardnessDgh, 0, 60) ? { hardnessDgh: o.hardnessDgh } : {}), ...(num(o.ph, 0, 14) ? { ph: o.ph } : {}) }; },
  'preferences.desired': v => { const a = strs(v, DESIRES); return a?.length ? a : undefined; },
  'preferences.adapt': v => ADAPTS.includes(v as Adapt) ? v as Adapt : undefined,
  'preferences.taste': parseTaste,
  'preferences.future': v => { if (!Array.isArray(v)) return undefined;
    const a = v.filter((x): x is Ambition => !!x && typeof x.text === 'string' && x.text.trim().length > 0).slice(0, 20)
      .map(x => ({ text: x.text.trim().slice(0, 300), ...(typeof x.from === 'string' && x.from ? { from: x.from.slice(0, 120) } : {}) })); return a.length ? a : undefined; },
};

/** Validate a saved / shared value; undefined when absent or empty (an old save without a brief). A newer version is read as far as it is understood. */
export function parseBrief(raw: unknown): Brief | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const items = (raw as { items?: unknown }).items, out = emptyBrief();
  if (!items || typeof items !== 'object') return undefined;
  const dst = out.items as Record<string, Item<unknown> | LimitItem<unknown>>;
  for (const id of ITEM_IDS) {
    const it = (items as Record<string, unknown>)[id] as { value?: unknown; min?: unknown; status?: unknown; off?: unknown; flex?: unknown } | undefined;
    if (!it || typeof it !== 'object') continue;
    const check = VALIDATE[id] as (v: unknown) => unknown, value = check(it.value);
    const common = { status: STATUSES.includes(it.status as Status) ? it.status as Status : 'preference', ...(it.off === true ? { off: true as const } : {}), ...(it.flex === true ? { flex: true as const } : {}) };
    if (isLimitId(id)) {
      // a limit: an upper bound (`value`, as every v1 / v2 save has it), a lower bound (`min`, v3), or both; an old `target` is dropped. min > max is swapped; a footprint takes no lower bound.
      let hi = value, lo = id === 'constraints.maxSpace' ? undefined : check(it.min);
      if (typeof hi === 'number' && typeof lo === 'number' && lo > hi) [hi, lo] = [lo, hi];
      if (hi === undefined && lo === undefined) continue;
      dst[id] = { ...(hi !== undefined ? { value: hi } : {}), ...(lo !== undefined ? { min: lo } : {}), ...common };
      continue;
    }
    if (value === undefined) continue;
    dst[id] = { value, ...common };
  }
  const d = (raw as { dialog?: { answered?: unknown; direction?: unknown } }).dialog;
  if (d && typeof d === 'object') {
    const answered = Array.isArray(d.answered) ? d.answered.filter((x): x is string => typeof x === 'string' && x.length < 30).slice(0, 40) : [];
    const dl = setDialog(out, { answered, direction: typeof d.direction === 'string' && d.direction.length < 30 ? d.direction : undefined }).dialog;
    if (dl) out.dialog = dl;
  }
  return hasState(out) ? out : undefined;
}

// ---- adapter: Wants <-> Brief, lossless for everything Wants holds (suggestSetups is unchanged and still reads Wants) ----
const capItem = (c: Cap | undefined): LimitItem<number> | undefined => c ? { value: c.value, status: 'hard', ...(c.on ? {} : { off: true as const }) } : undefined;
const capOf = (it: LimitItem<number> | undefined): Cap | undefined => it && it.value !== undefined ? { on: !it.off, value: it.value } : undefined;

export function briefFromWants(w: Wants): Brief {
  let b = emptyBrief();
  const pref = <K extends ItemId>(id: K, v: Values[K] | undefined) => { if (v !== undefined) b = setItem(b, id, v, 'preference'); };
  pref('animals.kinds', w.kinds ? [...w.kinds] : undefined);
  pref('animals.groups', w.groups ? [...w.groups] : undefined);
  pref('equipment.needStand', w.needStand);
  pref('constraints.owned', w.owned ? { ...w.owned } : undefined);
  pref('preferences.tags', w.tags ? [...w.tags] : undefined);
  const c = w.constraints, put = <K extends ItemId>(id: K, it: ItemOf<K> | undefined) => { if (it) b = { ...b, items: { ...b.items, [id]: it } }; };
  put('constraints.budget', capItem(c.startupUsd)); put('constraints.monthly', capItem(c.monthlyUsd)); put('constraints.careMin', capItem(c.minutesPerWeek));
  if (w.space) put('constraints.maxSpace', { value: { ...w.space }, status: 'hard' });
  if (c.space) put('constraints.spaceGate', { value: c.space.on, status: 'hard' });
  if (w.setupHours !== undefined) b = setItem(b, 'constraints.setupHours', w.setupHours, 'hard');
  pref('preferences.effort', c.effort); pref('preferences.experience', c.experience);
  if (w.taxPct !== undefined) b = setItem(b, 'constraints.taxPct', w.taxPct, 'hard');
  if (w.animals?.length) b = setItem(b, 'animals.stock', w.animals.map(a => ({ species: a.species, count: a.n })), 'locked');
  if (w.ownTank) b = setItem(b, 'constraints.existingTank', { model: w.ownTank.id }, 'hard');
  if (w.phased) b = setItem(b, 'constraints.phased', true, 'hard');
  if (w.hightech) b = setItem(b, 'preferences.hightech', true, 'hard');
  if (w.lowtech) b = setItem(b, 'preferences.lowtech', true, 'hard');
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
  const sh = g('constraints.setupHours'); if (sh && !sh.off && sh.value !== undefined) w.setupHours = sh.value;
  const kinds = g('animals.kinds'), groups = g('animals.groups'), owned = g('constraints.owned'), stand = g('equipment.needStand'), tags = g('preferences.tags');
  if (kinds) w.kinds = [...kinds.value]; if (groups) w.groups = [...groups.value]; if (owned) w.owned = { ...owned.value };
  if (stand) w.needStand = stand.value; if (tags) w.tags = [...tags.value];
  if (sp?.value) w.space = { ...sp.value };
  // lane U2 hooks: the sales tax, a LOCKED stocking list (the generator never changes it) and an existing tank (the only tank offered, $0)
  const tax = g('constraints.taxPct'), stock = g('animals.stock'), own = g('constraints.existingTank');
  if (tax && !tax.off) w.taxPct = tax.value;
  if (stock && stock.status === 'locked' && stock.value.length) w.animals = stock.value.map(x => ({ species: x.species, n: x.count }));
  const model = own?.value.model ? getTankModel(own.value.model) : undefined;
  if (model) w.ownTank = model;
  const ph = g('constraints.phased'), ht = g('preferences.hightech'), lt = g('preferences.lowtech');
  if (ph && !ph.off && ph.value) w.phased = true;
  if (ht && !ht.off && ht.value) w.hightech = true;
  if (lt && !lt.off && lt.value) w.lowtech = true;
  // lane GV8: lower bounds filter ("do not offer builds below this"), and the middle of a band ranks (a narrow band is a target)
  const lows: NonNullable<Wants['mins']> = {}, lo = (id: NumLimitId) => minOf(b, id);
  const lb = lo('constraints.budget'), lm = lo('constraints.monthly'), lc = lo('constraints.careMin'), lh = lo('constraints.setupHours');
  if (lb !== undefined) lows.startupUsd = lb; if (lm !== undefined) lows.monthlyUsd = lm; if (lc !== undefined) lows.minPerWeek = lc; if (lh !== undefined) lows.setupHours = lh;
  if (Object.keys(lows).length) w.mins = lows;
  const gal = rangeOf(b, 'constraints.tankGal'); if (gal.min !== undefined || gal.max !== undefined) w.tankGal = gal;
  const mt = targetOf(b, 'constraints.budget'), hh = targetOf(b, 'constraints.setupHours');
  if (mt !== undefined) w.startupTarget = mt; if (hh !== undefined) w.setupHoursTarget = hh;
  const tz = valueOf(b, 'preferences.taste'); if (tz) w.taste = tz;   // lane NG5: ranking only
  const wi = valueOf(b, 'preferences.wishes');   // lane U6: the refinement chips write these
  if (wi?.includes('more-planted')) w.planted = true;
  if (wi?.includes('larger-tank')) w.larger = true;
  return w;
}
