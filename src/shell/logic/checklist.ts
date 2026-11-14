// UI2 shell step 10 (lane S10): the Get started checklist (screen map 1a; it replaces the Guided flow, decision 4). Five ticks read from the design,
// each opens the real section. Shown on a new tank until dismissed for good (kept per browser).
import { layerOf } from '../../scene/items';
import { bareSetup } from '../../scene/defaults';
import type { TankSetup } from '../../scene/types';
import type { SectionId } from './sections';

export interface Step { id: 'tank' | 'scape' | 'plants' | 'animals' | 'equipment'; label: string; hint: string; section: SectionId; done: boolean }
export interface Checklist { steps: Step[]; done: number; all: boolean }

const sameBox = (a: TankSetup['tank'], b: TankSetup['tank']) => a.L === b.L && a.D === b.D && a.H === b.H;
/** The ticks, from the design alone (nothing is stored per step). */
export function checklistOf(T: TankSetup): Checklist {
  const plants = T.items.some(i => layerOf(i) === 'plant'), hard = T.items.some(i => layerOf(i) !== 'plant');
  const gear = !!(T.light?.product || T.light?.owned || T.tech?.heaters?.length || T.tech?.filters?.length);
  const steps: Step[] = [
    { id: 'tank', label: 'Pick a tank', hint: 'A real model or your own size', section: 'tank', done: !!T.product || !sameBox(T.tank, bareSetup().tank) },
    { id: 'scape', label: 'Shape the scape', hint: 'Rocks, wood and substrate', section: 'scape', done: hard },
    { id: 'plants', label: 'Add plants', hint: 'Or skip them for a bare look', section: 'plants', done: plants },
    { id: 'animals', label: 'Choose animals', hint: 'Who lives here', section: 'animals', done: T.fish.length > 0 },
    { id: 'equipment', label: 'Check the equipment', hint: 'Light, filter, heater', section: 'equipment', done: gear },
  ];
  const done = steps.filter(s => s.done).length;
  return { steps, done, all: done === steps.length };
}
/** A "new tank": nothing has been designed yet beyond the tank itself. */
export const isNewTank = (T: TankSetup): boolean => T.items.length === 0 && T.fish.length === 0;

export const KEY = 'tanklook.ui2.checklist';
type Mem = Pick<Storage, 'getItem' | 'setItem'>;
const ls = (): Mem | undefined => { try { return localStorage; } catch { return undefined; } };
export const dismissed = (m: Mem | undefined = ls()): boolean => { try { return m?.getItem(KEY) === 'off'; } catch { return false; } };
export const dismiss = (m: Mem | undefined = ls()): void => { try { m?.setItem(KEY, 'off'); } catch { /* private window: it comes back next visit */ } };
/** Shown on a new tank, and from then on until every tick is done or the person dismisses it (`started`: it was already showing, so the first piece placed does not make it vanish). A tank that already has a design never shows it. */
export const showChecklist = (T: TankSetup, off: boolean, started = false): boolean => !off && (started || isNewTank(T)) && !checklistOf(T).all;
