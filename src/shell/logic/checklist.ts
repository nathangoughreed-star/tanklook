// UI2 shell step 10 (lane S10): the Get started checklist (screen map 1a; it replaces the Guided flow, decision 4). Five ticks read from the design,
// each opens the real section. Shown on a new tank until dismissed for good (kept per browser).
import { layerOf } from '../../scene/items';
import { bareSetup } from '../../scene/defaults';
import { filterState } from '../../scene/tech';
import type { TankSetup } from '../../scene/types';
import type { SectionId } from './sections';

export interface Step { id: 'tank' | 'scape' | 'plants' | 'animals' | 'equipment'; label: string; hint: string; section: SectionId; done: boolean }
export interface Checklist { steps: Step[]; done: number; all: boolean }

const sameBox = (a: TankSetup['tank'], b: TankSetup['tank']) => a.L === b.L && a.D === b.D && a.H === b.H;
/** The ticks, from the design alone (nothing is stored per step). */
export function checklistOf(T: TankSetup): Checklist {
  const plants = T.items.some(i => layerOf(i) === 'plant'), hard = T.items.some(i => layerOf(i) !== 'plant');
  const light = !!(T.light?.product || T.light?.owned), filter = filterState(T) !== 'unset';
  const missing = [light ? '' : 'a light', filter ? '' : 'a filter'].filter(Boolean);
  const steps: Step[] = [
    { id: 'tank', label: 'Pick a tank', hint: 'A real model or your own size', section: 'tank', done: !!T.product || !sameBox(T.tank, bareSetup().tank) },
    { id: 'scape', label: 'Shape the scape', hint: 'Rocks, wood and substrate', section: 'scape', done: hard },
    { id: 'plants', label: 'Add plants', hint: 'Or skip them for a bare look', section: 'plants', done: plants },
    { id: 'animals', label: 'Choose animals', hint: 'Who lives here', section: 'animals', done: T.fish.length > 0 },
    { id: 'equipment', label: 'Check the equipment', hint: missing.length ? `Needs ${missing.join(' and ')}` : 'Light and filter chosen', section: 'equipment', done: missing.length === 0 },
  ];
  const done = steps.filter(s => s.done).length;
  return { steps, done, all: done === steps.length };
}
/** A "new tank": nothing has been designed yet beyond the tank itself. */
export const isNewTank = (T: TankSetup): boolean => T.items.length === 0 && T.fish.length === 0;

/** The old permanent switch (`off`, before NT1): read once, then dropped; it counts as "hidden on the tank that was open". */
export const KEY = 'tanklook.ui2.checklist';
type Mem = Pick<Storage, 'getItem' | 'removeItem'>;
const ls = (): Mem | undefined => { try { return localStorage; } catch { return undefined; } };
export function migrateOldOff(m: Mem | undefined = ls()): boolean {
  try { if (m?.getItem(KEY) !== 'off') return false; m.removeItem(KEY); return true; } catch { return false; }
}

/** Whether the card is hidden for THIS tank (NT1, Nathan 2026-11-14): the × hides it for the tank that is open; a New or opened project shows it again; the header menu brings it back.
 *  `forced` = brought back by hand, so it shows even on a tank that already has pieces. Session state, not saved. */
export interface Hide { hidden: boolean; forced: boolean; epoch: number }
let hide: Hide = { hidden: migrateOldOff(), forced: false, epoch: 0 };
const subs = new Set<() => void>();
const set = (h: Hide) => { hide = h; for (const f of subs) f(); };
export const hideState = (): Hide => hide;
export const subscribeHide = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const hideChecklist = () => set({ ...hide, hidden: true, forced: false });
export const restoreChecklist = () => set({ ...hide, hidden: false, forced: true });
/** A different project is open (New, Open, an example): the card starts over. */
export const resetChecklist = () => set({ hidden: false, forced: false, epoch: hide.epoch + 1 });
/** Shown on a new tank, and from then on until every tick is done or the person hides it (`started`: it was already showing, so the first piece placed does not make it vanish; `forced`: brought back from the menu). */
export const showChecklist = (T: TankSetup, off: boolean, started = false, forced = false): boolean => !off && (forced || started || isNewTank(T)) && !checklistOf(T).all;
