// UI2 shell: the ONE event for "open that section (and a group inside it)". Limit lines, the Cost drawer and Equipment all call this.
import { askOpen, type SectionId } from './logic/sections';

export const OPEN_EVENT = 'ui2:open';
export function openSection(section: SectionId, group?: string): void {
  askOpen(section, group);
  dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { section, group } }));
}
