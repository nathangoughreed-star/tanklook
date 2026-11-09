// Temporary Discovery scope (DX0; spec section 2): the tabs a run MAY change, chosen anew each run. editable = scope ∩ unlocked.
// An unchecked tab is immutable for the run whether or not its contents are locked; a checked tab is a ceiling, not an obligation.
// Pure: describes what may change (editableFields) and what a change did (diffTouches). Equipment is not a tab (plan decision 2): light, tech,
// layout seeds, brief and the rest are "support" state, free in a proposal (it is previewed and accepted whole) but never view state.
import { layerOf } from './items';
import { FISH_PROPS, ITEM_PROPS, SUBSTRATE_KEYS, TANK_PROPS, changedGroups, locksOf } from './locks';
import type { Fish, Item, Locks, TankSetup } from './types';

export type Tab = 'tank' | 'animals' | 'plants' | 'hardscape' | 'substrate';
export const TABS: readonly Tab[] = ['tank', 'animals', 'plants', 'hardscape', 'substrate'];
/** TankSetup keys that are the viewer, never design: a change there touches nothing. */
const VIEW_KEYS = new Set<string>(['camera', 'render']);
const LIST_KEYS = new Set<string>(['fish', 'items']);
const TANK_KEYS = new Set<string>(Object.values(TANK_PROPS).flat());
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface ListTouch { added: string[]; removed: string[]; /** uid -> the property groups that changed */ changed: Record<string, string[]> }
export interface Touches {
  tabs: Tab[];
  items: ListTouch; fish: ListTouch;
  /** the tank tab's changed groups (dimensions, room, water) */
  tank: string[];
  substrate: boolean;
  /** TankSetup keys changed that belong to no tab (light, tech, layout, brief, locks, ...) */
  support: string[];
}
const none = (): ListTouch => ({ added: [], removed: [], changed: {} });
const key = (o: Item | Fish) => o.uid ?? `id:${o.id}`;

function diffList<T extends Item | Fish>(a: T[], b: T[], table: Record<string, readonly string[]>, tabOf: (o: T) => Tab, tabs: Set<Tab>): ListTouch {
  const out = none(), A = new Map(a.map(o => [key(o), o])), B = new Map(b.map(o => [key(o), o]));
  for (const [k, o] of B) {
    const was = A.get(k);
    if (!was) { out.added.push(k); tabs.add(tabOf(o)); continue; }
    const g = changedGroups(table, was, o); if (g.length) { out.changed[k] = g; tabs.add(tabOf(o)); }
  }
  for (const [k, o] of A) if (!B.has(k)) { out.removed.push(k); tabs.add(tabOf(o)); }
  return out;
}

/** Which tabs, objects and properties differ between two states of the same tank. Pure. Objects are matched by uid (id when a state has none). */
export function diffTouches(before: TankSetup, after: TankSetup): Touches {
  const tabs = new Set<Tab>();
  const items = diffList(before.items, after.items, ITEM_PROPS, it => layerOf(it) === 'plant' ? 'plants' : 'hardscape', tabs);
  const fish = diffList(before.fish, after.fish, FISH_PROPS, () => 'animals', tabs);
  const tank = Object.entries(TANK_PROPS).filter(([, ks]) => ks.some(k => !same(before[k], after[k]))).map(([g]) => g);
  if (tank.length) tabs.add('tank');
  const substrate = SUBSTRATE_KEYS.some(k => !same(before[k], after[k]));
  if (substrate) tabs.add('substrate');
  if (!same(before.pairs, after.pairs)) tabs.add('animals');
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof TankSetup & string>, support: string[] = [];
  for (const k of keys) {
    if (VIEW_KEYS.has(k) || LIST_KEYS.has(k) || TANK_KEYS.has(k) || (SUBSTRATE_KEYS as readonly string[]).includes(k) || k === 'pairs') continue;
    if (!same(before[k], after[k])) support.push(k);
  }
  return { tabs: TABS.filter(t => tabs.has(t)), items, fish, tank, substrate, support };
}

/** Tabs a change touched that the run's scope does not include. */
export const outOfScope = (touched: Touches, scope: readonly Tab[]): Tab[] => touched.tabs.filter(t => !scope.includes(t));

export interface EditableObject { uid: string; /** property groups a run may change */ props: string[]; /** may be removed (no lock of any kind on it) */ removable: boolean }
export interface Editable {
  scope: Tab[];
  /** tank groups open to change (empty when the tank tab is off or the tank is locked) */
  tank: string[];
  substrate: boolean;
  items: EditableObject[]; fish: EditableObject[];
  /** a checked tab may take new pieces / animals */
  add: { hardscape: boolean; plants: boolean; animals: boolean };
  /** species a run must keep, with the floor each holds */
  roster: Locks['roster'];
}

/** What a run with `scope` may change in `tank`, given `locks`: editable = scope ∩ unlocked. */
export function editableFields(tank: TankSetup, scope: readonly Tab[], locks: Locks | undefined = tank.locks): Editable {
  const L = locks ?? locksOf(tank), on = (t: Tab) => scope.includes(t), lockOf = (u: string) => L.objects.find(o => o.target === u);
  const open = (o: Item | Fish, table: Record<string, readonly string[]>): EditableObject | null => {
    const k = o.uid ?? `id:${o.id}`, lk = lockOf(k), all = Object.keys(table);
    if (lk && !lk.props?.length) return null;
    return { uid: k, props: lk?.props?.length ? all.filter(p => !lk.props!.includes(p)) : all, removable: !lk };
  };
  const live = <T extends Item | Fish>(list: T[], table: Record<string, readonly string[]>, tab: (o: T) => Tab) => list.filter(o => on(tab(o))).map(o => open(o, table)).filter((x): x is EditableObject => !!x);
  const tl = lockOf('tank'), allTank = Object.keys(TANK_PROPS);
  return {
    scope: TABS.filter(on),
    tank: on('tank') ? (tl ? (tl.props?.length ? allTank.filter(g => !tl.props!.includes(g)) : []) : allTank) : [],
    substrate: on('substrate') && !lockOf('substrate'),
    items: live(tank.items, ITEM_PROPS, it => layerOf(it) === 'plant' ? 'plants' : 'hardscape'),
    fish: live(tank.fish, FISH_PROPS, () => 'animals'),
    add: { hardscape: on('hardscape'), plants: on('plants'), animals: on('animals') },
    roster: on('animals') ? L.roster.map(r => ({ ...r })) : [],
  };
}
