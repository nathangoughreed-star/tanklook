// CM2 (2026-11-14): a plain click on a thing in the view opens it in the new shell (the old UI's interact/clickMenu.ts openMenuFor
// only knows the old DOM). The target -> section/group mapping is pure (testable); the open goes through the shell's one open event.
import type { ClickTarget } from '../interact/clickMenu';
import type { ItemKind } from '../scene/types';
import type { Store } from '../scene/store';
import type { SectionId } from './logic/sections';
import { openSection } from './open';

export interface ShellOpen { section: SectionId; /** equipment: a category id; tank: a group id */ group?: string }

/** Where a click target lives in the shell. Hardscape and decor are Scape, plants and corals are Plants. */
export function shellTarget(t: ClickTarget, scape: (k: ItemKind) => 'hardscape' | 'plants'): ShellOpen {
  switch (t.kind) {
    case 'fish': return { section: 'animals' };
    case 'item': return { section: scape(t.item) === 'plants' ? 'plants' : 'scape' };
    case 'gear': return { section: 'equipment', group: t.row };
    case 'light': return { section: 'equipment', group: 'light' };
    case 'stand': return { section: 'tank', group: 'sits' };
    case 'lid': return { section: 'tank', group: 'lid' };
  }
}

/** The section effects in App clear the selection when the section changes; a click-open keeps the thing it just selected. */
let keepUntil = 0;
export const keepingSelection = () => performance.now() < keepUntil;

/** Open the shell at the clicked thing and select it (animal -> Selection drawer, piece / plant -> its editing bar). */
export function openClicked(t: ClickTarget, store: Store, scape: (k: ItemKind) => 'hardscape' | 'plants'): void {
  const o = shellTarget(t, scape);
  keepUntil = performance.now() + 600;
  openSection(o.section, o.group); // first: on a phone the open closes the drawer, then the selection below reopens it
  if (t.kind === 'fish') store.select(t.id);
  else if (t.kind === 'item') store.selectItem(t.id);
}
