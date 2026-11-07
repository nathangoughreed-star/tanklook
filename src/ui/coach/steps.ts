// The coach's step list as DATA (lane GW1, 2026-11-05). A step names WHERE to look (a side-panel section, a control inside it, or a dialog), what to decide and why, and
// when it is done. The runner (runner.ts) and the DOM host (dom.ts) know nothing about the individual steps, so the single-home cleanup (lane GW2) rewrites DEMO_STEPS only.
import type { Brief } from '../../scene/brief';
import type { Scene, TankSetup } from '../../scene/types';

/** What a step's `done` can read: the scene, the tank being edited and its brief. */
export interface CoachCtx { scene: Scene; tank: TankSetup; brief: Brief }

/** Where a step points. All three are optional and combine: a `section` (the `data-sec` of a side-panel `details`) is opened and scrolled into view; a `control` (a CSS
 *  selector, looked up inside that section when one is named) is highlighted; a `dialog` (a name the host knows) is opened and the card moves into it. */
export interface CoachTarget { section?: string; control?: string; dialog?: string }

/** Done = a predicate that turns true while the step is showing ("test"), or any change to some fields since the step opened ("changes", compared as JSON). */
export type CoachDone = { test: (c: CoachCtx) => boolean } | { changes: (c: CoachCtx) => unknown };

export interface CoachStep {
  id: string;
  target: CoachTarget;
  title: string;
  /** one or two short sentences: what to decide and why it matters */
  why: string;
  /** absent = an information step: Next is always available */
  done?: CoachDone;
  /** shows Skip while the step is not done; a step that is not skippable offers Next only once done */
  skippable: boolean;
}

/** the Your-limits answers: every brief item under `constraints.` */
const limitItems = (c: CoachCtx) => Object.entries(c.brief.items).filter(([k]) => k.startsWith('constraints.') && k !== 'constraints.owned' && k !== 'constraints.existingTank').sort(([a], [b]) => a.localeCompare(b));

/** What "Your limits" answers write: the brief's `constraints.*` items plus Experience (the care level). */
const careOf = (c: CoachCtx) => c.brief.items['preferences.experience'];
/** What My equipment writes: the owned map and owned tank in the brief, and the stand the furniture step sets. */
const gearOf = (c: CoachCtx) => [c.brief.items['constraints.owned'], c.brief.items['constraints.existingTank'], c.tank.stand];

/** The whole guided path (lane GW2, 2026-11-07): every step opens the ONE home of its setting (single-home table, research/design/sandbox-start-and-single-home.md).
 *  Kind -> Tank -> Placement -> My equipment -> Your limits -> Look -> Animals -> Review. Every step can be skipped; nothing is required but the tank the person already has. */
export const GUIDE_STEPS: readonly CoachStep[] = [
  {
    id: 'kind', target: { section: 'tank', control: '#spKinds' }, title: 'What kind of setup?',
    why: 'Freshwater, saltwater, terrarium or vivarium decides which animals and plants the lists offer, and what the gear costs.',
    done: { changes: c => [c.tank.layout.kind, c.tank.water] }, skippable: true,
  },
  {
    id: 'size', target: { section: 'tank', control: '#presetA' }, title: 'Pick a tank size',
    why: 'Press Presets… and choose a tank. Everything else (stocking, light, filter, price) is worked out for its size.',
    done: { changes: c => [c.tank.tank, c.tank.product] }, skippable: true,
  },
  {
    id: 'place', target: { section: 'room', control: '#placeRow' }, title: 'What does it sit on?',
    why: 'The floor, a stand or a table you already own. A stand adds cost and changes how high the tank is in the room.',
    done: { changes: c => [c.tank.stand] }, skippable: true,
  },
  {
    id: 'equipment', target: { dialog: 'equipment' }, title: 'What do you already have?',
    why: 'Tick the tank, stand, light, heater or filter you own. Owned gear counts as $0 in the budget and is used before anything new is suggested.',
    done: { changes: gearOf }, skippable: true,
  },
  {
    id: 'limits', target: { dialog: 'limits' }, title: 'Your limits',
    why: 'Money, time, space and experience are all optional. A plan that goes over one shows a warning with a fix; it never stops you.',
    done: { changes: c => [limitItems(c), careOf(c)] }, skippable: true,
  },
  {
    id: 'look', target: { section: 'quick', control: '#layout' }, title: 'Choose a look',
    why: 'The style fills the tank with a matching set of substrate, hardscape and plants. Browse looks shows pictures to choose from; Shuffle draws another one.',
    done: { changes: c => c.tank.layout.id }, skippable: true,
  },
  {
    id: 'animals', target: { section: 'fish', control: '#spSearch' }, title: 'Pick the animals',
    why: 'Search the list and add species. Each one shows whether it suits this tank, its water and the others already in it.',
    done: { changes: c => c.tank.fish.map(f => f.species) }, skippable: true,
  },
  {
    id: 'review', target: { section: 'brief' }, title: 'Check the whole plan',
    why: 'The setup brief and the cost panel show what this tank costs and where it goes over a limit. Change any setting from its own section at any time.',
    skippable: false,
  },
];

/** The short demo path GW1 shipped: Kind -> Tank size -> Your limits -> Look (the same steps, picked from the full path). */
export const DEMO_STEPS: readonly CoachStep[] = GUIDE_STEPS.filter(s => ['kind', 'size', 'limits', 'look'].includes(s.id));
