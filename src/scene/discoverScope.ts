// The five "Discovery can change this" switches (DX7, Nathan 2026-11-09): one per creative menu (Tank, Substrate, Hardscape, Plants, Animals).
// Stored with the project (`TankSetup.discoverOn`, the tabs that are ON; absent = all on, the default for a new project). This is the ONE home of
// the scope: the menu headers and the Discover panel both read and write it here. Constraints and Equipment have no switch. Pure: no DOM.
import { TABS, type Tab } from './scope';
import type { TankSetup } from './types';

/** The tabs whose switch is on. */
export function discoverTabs(S: Pick<TankSetup, 'discoverOn'>): Tab[] {
  const on = S.discoverOn; if (!on) return [...TABS];
  return TABS.filter(t => on.includes(t));
}
export const discoverIsOn = (S: Pick<TankSetup, 'discoverOn'>, t: Tab): boolean => discoverTabs(S).includes(t);

/** Set one switch on a tank (call inside a store update); all five on stores nothing. */
export function setDiscoverTab(S: TankSetup, t: Tab, on: boolean): void {
  const cur = new Set(discoverTabs(S)); if (on) cur.add(t); else cur.delete(t);
  const next = TABS.filter(x => cur.has(x));
  if (next.length === TABS.length) delete S.discoverOn; else S.discoverOn = next;
}

/** A saved `discoverOn`, or undefined when absent / not a list (= all on). An empty list is real: every switch off. */
export function parseDiscoverOn(v: unknown): Tab[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const next = TABS.filter(t => v.includes(t));
  return next.length === TABS.length ? undefined : next;
}
