// SS1 (2026-11-16): the new UI's Start sheet. Pure rules: when it shows by itself, and which doors it offers. No DOM.
import { habitatChoices, kindOfDirection } from '../../ui/startScreenLogic';
import type { SetupKind } from '../../scene/pickerKind';

export const WELCOME_KEY = 'tanklook.ui2.welcomed';
type St = Pick<Storage, 'getItem' | 'setItem'> | undefined;
const store = (st?: St): St => { try { return st ?? localStorage; } catch { return undefined; } };

/** By itself the sheet shows once: a first visit (nothing autosaved, no unreadable save) that has not seen it. New in the header menu shows it again. */
export function shouldWelcome(restored: unknown, error?: string, st?: St): boolean {
  if (restored || error) return false;
  try { return store(st)?.getItem(WELCOME_KEY) !== '1'; } catch { return true; }
}
export function markWelcomed(st?: St): void { try { store(st)?.setItem(WELCOME_KEY, '1'); } catch { /* private mode: it may show again */ } }

export type DoorId = 'examples' | 'animal' | 'have' | 'blank';
export interface Door { id: DoorId; label: string; hint: string }
/** The landing's headline and sub-line (R162: say the job, name what the visitor gets). */
export const HEADLINE = 'Build your aquarium in 3D before you buy anything, and see whether the fish will thrive, what it will cost, and exactly what to buy.';
export const SUBLINE = 'Free, no account. Calculated by fixed rules on published care data.';
/** The four doors, each named by the visitor's situation. Bundles and Open a saved tank are links under them (see `linksFor`). */
export function doorsFor(): Door[] {
  return [
    { id: 'examples', label: 'Show me tanks I could build', hint: 'Finished tanks with the price and a verdict' },
    { id: 'animal', label: 'Start from a fish I want', hint: 'Name a fish and get a tank that suits it' },
    { id: 'have', label: 'I already have a tank or gear', hint: 'Pick your tank size and add what you own' },
    { id: 'blank', label: 'Build my own from scratch', hint: 'An empty tank, and every choice is yours' },
  ];
}
export interface StartLink { id: 'deals' | 'open'; label: string }
/** The two quiet links under the doors: bundles and sales, and (only when this browser has saved tanks) Open a saved tank. */
export function linksFor(savedCount: number): StartLink[] {
  const l: StartLink[] = [{ id: 'deals', label: 'Bundles and sales' }];
  if (savedCount > 0) l.push({ id: 'open', label: `Open a saved tank (${savedCount})` });
  return l;
}
/** The water choices on the Blank door (aquarium scope only, from the old start screen's rules). */
export const blankKinds = (): { kind: SetupKind; label: string; tip: string }[] => habitatChoices().map(c => ({ kind: kindOfDirection(c.id), label: c.label.replace(' aquarium', ''), tip: c.tip }));

/** FD unit 2 (R162): a first visit shows a stocked example behind the sheet. While nothing has been changed in it, the Build my own and I already have a
 *  tank doors start from an empty tank without asking "Replace your project?". boot.tsx sets it; the first edit clears it. */
export const landing = { untouched: false };
/** The landing's layout: the modal sheet (default) or the docked variant (`?landing=dock`: the sheet beside the lit tank, a bottom sheet on a phone). Nathan picks one. */
export const landingDock = (search: string = typeof location === 'undefined' ? '' : location.search): boolean => new URLSearchParams(search).get('landing') === 'dock';
/** The example behind a first visit's sheet: a house example with only approved fish, priced and checked. */
export const LANDING_EXAMPLE = 'planted';
