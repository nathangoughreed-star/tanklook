// The setup brief's shape, as lane U3 needs it. THIN LOCAL STAND-IN for lane U1's src/scene/brief.ts (five groups, items with a status,
// versioned serialisable form): every U3 file imports these types from HERE and nowhere else, so swapping to U1's real types is a change to
// this one file (re-export from '../scene/brief' and adapt `itemOf`). Welfare is not here on purpose: it is a gate, never an item.
export type GroupId = 'animals' | 'appearance' | 'tank' | 'constraints' | 'preferences';
/** hard = valid designs must satisfy it; preference = ranks valid designs; locked = a choice the generator may not change without asking. */
export type ItemStatus = 'hard' | 'preference' | 'locked';

export interface BriefItem {
  /** stable id: 'animal:betta', 'look:iwagumi', 'tank:owned', 'budget', 'space', 'careTime', 'pref:calm', 'priority:animals' ... */
  key: string;
  label: string;
  status: ItemStatus;
  /** the number or structure behind it (animal count, budget dollars, space w x d in mm, minutes a week) */
  value?: number | { w: number; d: number } | { species: string; n: number };
}
export interface Brief { v: 1; groups: Record<GroupId, BriefItem[]> }

export const GROUPS: readonly { id: GroupId; label: string }[] = [
  { id: 'animals', label: 'Animals' }, { id: 'appearance', label: 'Appearance' }, { id: 'tank', label: 'Tank and equipment' },
  { id: 'constraints', label: 'Constraints' }, { id: 'preferences', label: 'Preferences' },
];
export const emptyBrief = (): Brief => ({ v: 1, groups: { animals: [], appearance: [], tank: [], constraints: [], preferences: [] } });
export const briefItems = (b: Brief) => GROUPS.flatMap(g => b.groups[g.id]);
export const isEmpty = (b: Brief) => briefItems(b).length === 0;
export const findItem = (b: Brief, key: string) => briefItems(b).find(i => i.key === key);
export const hasPrefix = (b: Brief, prefix: string) => briefItems(b).some(i => i.key.startsWith(prefix));
