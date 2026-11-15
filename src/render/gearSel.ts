// The piece of gear picked in the view (lane GD1, Nathan 2026-11-15: "a click on it, it highlights with its hitbox"). View state only:
// the viewer draws its box, the shell's Placement group reads it, the arrow keys nudge it. Not saved, no undo step.
import type { GearPlace } from '../scene/tech';
import type { GearMount } from './gear3d';

export interface GearSelection {
  vi: number; row: string; mount: GearMount;
  /** where it is drawn now when the file has no spot for it yet (what an orientation change starts from) */
  from?: GearPlace;
}
let cur: GearSelection | null = null;
const subs = new Set<() => void>();
export const gearSel = (): GearSelection | null => cur;
export function setGearSel(s: GearSelection | null) {
  if (s === cur || (s && cur && s.vi === cur.vi && s.row === cur.row && s.from === cur.from)) return;
  cur = s; subs.forEach(f => f());
}
/** Run `f` on every change; returns the way to stop. */
export function onGearSel(f: () => void): () => void { subs.add(f); return () => { subs.delete(f); }; }
