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

export type DoorId = 'blank' | 'examples' | 'deals' | 'animal' | 'open';
export interface Door { id: DoorId; label: string; hint: string }
/** The doors; Open saved only when this browser has saved tanks. */
export function doorsFor(savedCount: number): Door[] {
  const d: Door[] = [
    { id: 'blank', label: 'Blank tank', hint: 'Pick fresh or salt water, then build it your way' },
    { id: 'examples', label: 'Example tanks', hint: 'Finished tanks to look at or start from' },
    { id: 'deals', label: 'Bundles and sales', hint: 'Kits and discounts' },
    { id: 'animal', label: 'From an animal I want', hint: 'Name a fish or critter and get a tank that suits it' },
  ];
  if (savedCount > 0) d.push({ id: 'open', label: 'Open a saved tank', hint: `${savedCount} saved in this browser` });
  return d;
}
/** The water choices on the Blank door (aquarium scope only, from the old start screen's rules). */
export const blankKinds = (): { kind: SetupKind; label: string; tip: string }[] => habitatChoices().map(c => ({ kind: kindOfDirection(c.id), label: c.label.replace(' aquarium', ''), tip: c.tip }));
