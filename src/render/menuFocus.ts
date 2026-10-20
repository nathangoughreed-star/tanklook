// Menu focus (lane TG, Nathan 2026-10-20: "everything thats NOT contained in that menu (in the screen view) is faded"):
// while the Tech, Animals, Hardscape or Plants section is open, what it is about is drawn as it is and the rest of the
// view fades toward the room (viewer.ts drawFocus, the painted-patch fade). No rebuild: the scene's top-level children
// are sorted by the tags the build already puts on them.
import type * as THREE from 'three';
import { PART } from './build';

/** The panel sections that focus the view (details.sec[data-sec] in index.html). */
export type FocusSec = 'tech' | 'fish' | 'hardscape' | 'plants';
export const FOCUS_SECS: readonly FocusSec[] = ['tech', 'fish', 'hardscape', 'plants'];

/** Does this top-level scene child belong to section `sec`? Tech = the gear and the light fixture (and its beams);
 *  Animals = fish, herps and corals; Hardscape = rocks, wood, a 3D back wall; Plants = plants. */
export function inFocus(o: THREE.Object3D, sec: FocusSec): boolean {
  const u = o.userData;
  if (sec === 'tech') return !!u.gear || u.overhead != null;
  if (u.gear) return false; // gear rides in the pieces' list (build.ts tags it ground), never in a scape section
  return u.part === (sec === 'fish' ? PART.animals : sec === 'hardscape' ? PART.hardscape : PART.plants);
}

/** The section whose menu must be open to pick / move this: gear in Tech, animals in Animals, a piece in its scape menu. */
export function pickSec(what: 'items' | 'fish' | 'gear', scape?: 'hardscape' | 'plants'): string {
  return what === 'gear' ? 'tech' : what === 'fish' ? 'fish' : scape ?? 'hardscape';
}
