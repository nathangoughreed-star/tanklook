// UI2 shell: the rail's sections (screen map §2a) and the phone tab bar's split of them (§6). Pure data + one helper.
import type { IconName } from '../icons';

export type SectionId = 'tank' | 'scape' | 'plants' | 'animals' | 'equipment' | 'preferences' | 'constraints' | 'discover' | 'print' | 'settings';
export interface Section { id: SectionId; title: string; icon: IconName; /** the rail draws a divider before it */ gap?: boolean; /** pinned to the rail's bottom */ bottom?: boolean }

/** 9 sections + Settings, in rail order. */
export const SECTIONS: Section[] = [
  { id: 'tank', title: 'Tank', icon: 'tank' },
  { id: 'scape', title: 'Scape', icon: 'scape' },
  { id: 'plants', title: 'Plants', icon: 'plants' },
  { id: 'animals', title: 'Animals', icon: 'animals' },
  { id: 'equipment', title: 'Equipment', icon: 'gear' },
  { id: 'preferences', title: 'Preferences', icon: 'prefs', gap: true },
  { id: 'constraints', title: 'Constraints', icon: 'limits' },
  { id: 'discover', title: 'Discover', icon: 'ideas', gap: true },
  { id: 'print', title: 'Print', icon: 'print' },
  { id: 'settings', title: 'Settings', icon: 'settings', bottom: true },
];
export const sectionOf = (id: SectionId) => SECTIONS.find(s => s.id === id)!;

/** Phone tab bar: the first four sections, then More (§6). */
export const PHONE_TABS: SectionId[] = ['tank', 'scape', 'plants', 'animals'];
export const MORE: SectionId[] = SECTIONS.map(s => s.id).filter(id => !PHONE_TABS.includes(id));

/** A rail click: the open section's icon folds the panel (null), any other opens that section (§6). */
export const railClick = (open: SectionId | null, id: SectionId): SectionId | null => open === id ? null : id;

/** Esc closes the drawer first, then the panel (§6). */
export function escape(s: { drawer: string | null; section: SectionId | null }): { drawer: string | null; section: SectionId | null } {
  return s.drawer ? { ...s, drawer: null } : { ...s, section: null };
}

/** Which step of the migration fills each section (screen map §7), shown in the empty placeholder. */
export const COMES_IN: Record<SectionId, number> = { tank: 3, scape: 7, plants: 7, animals: 4, equipment: 6, preferences: 5, constraints: 5, discover: 10, print: 8, settings: 8 };
