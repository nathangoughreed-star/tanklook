// SL1 (2026-11-09): the start screen's pure rules. One screen, three plain choices; the choice is mandatory on first load.
// Steps: home (the three buttons) -> new (AB4: ONE habitat question with pictures; Deals and bundles stays a small link)
// / starters (the example gallery) / open (saved tanks + a file from the computer) / deals.
export type StartStep = 'home' | 'new' | 'starters' | 'open' | 'deals';
export type StartChoice = 'new' | 'starters' | 'open';

export const STEP_TITLE: Record<StartStep, string> = {
  home: 'Welcome', new: 'What are you building?', starters: 'Starter / Example Setups', open: 'Open Existing', deals: 'Deals and bundles',
};
export const CHOICES: readonly { id: StartChoice; label: string }[] = [
  { id: 'new', label: 'New Setup' }, { id: 'starters', label: 'Starter / Example Setups' }, { id: 'open', label: 'Open Existing' },
];

/** Each of the three buttons goes to the step of the same name. */
export const routeChoice = (c: StartChoice): StartStep => c;
/** The toolbar's New / Open land on the matching step; the welcome browse links ask for a menu and tab. */
export const stepForMenu = (menu: 'new' | 'open', tab?: 'starters' | 'open'): StartStep => menu === 'new' ? 'new' : tab === 'starters' ? 'starters' : 'open';
/** On first load the screen cannot be closed (no X, Esc or backdrop); opened from the toolbar a project is already open, so it can. */
export const canClose = (first: boolean) => !first;
/** Back goes one step up, ending at the three choices; the home step has no Back. */
export const backOf = (s: StartStep): StartStep | null => s === 'home' ? null : 'home';
/** The Open Existing list: one plain line when nothing is saved, the upload button is always there. */
export const EMPTY_LIBRARY = 'No saved tanks yet in this browser';
export const libraryState = (n: number): 'empty' | 'list' => n > 0 ? 'list' : 'empty';

/** AB4 (Discovery v2 spec 2.1): the one habitat question. A paludarium is the app's `vivarium` kind; "I don't know yet" starts the default (freshwater) empty project. */
import type { HabitatDirection } from '../scene/discoveryTypes';
import type { SetupKind } from '../scene/pickerKind';
export const HABITAT_CHOICES: readonly { id: HabitatDirection; label: string; tip: string }[] = [
  { id: 'freshwater', label: 'Freshwater aquarium', tip: 'Fish, shrimp, snails and plants in fresh water' },
  { id: 'saltwater', label: 'Saltwater aquarium', tip: 'A marine fish tank or reef' },
  { id: 'terrarium', label: 'Terrarium', tip: 'A dry or humid land enclosure' },
  { id: 'paludarium', label: 'Paludarium', tip: 'Water and land together' },
  { id: 'unsure', label: 'I don’t know yet', tip: 'Start empty; Discover can show every kind' },
];
export const kindOfDirection = (d: HabitatDirection): SetupKind => d === 'paludarium' ? 'vivarium' : d === 'unsure' ? 'freshwater' : d;
