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
const limitItems = (c: CoachCtx) => Object.entries(c.brief.items).filter(([k]) => k.startsWith('constraints.')).sort(([a], [b]) => a.localeCompare(b));

/** The demo path on today's controls: Kind -> Tank size -> Your limits -> Look. */
export const DEMO_STEPS: readonly CoachStep[] = [
  {
    id: 'kind', target: { section: 'fish', control: '#spKinds' }, title: 'What kind of setup?',
    why: 'Freshwater, saltwater, terrarium or vivarium decides which animals and plants the lists offer, and what the gear costs.',
    done: { changes: c => [c.tank.layout.kind, c.tank.water] }, skippable: true,
  },
  {
    id: 'size', target: { section: 'tank', control: '#presetA' }, title: 'Pick a tank size',
    why: 'Press Presets… and choose a tank. Everything else (stocking, light, filter, price) is worked out for its size.',
    done: { changes: c => [c.tank.tank, c.tank.product] }, skippable: true,
  },
  {
    id: 'limits', target: { dialog: 'limits' }, title: 'Your limits',
    why: 'Money, time, space and experience are all optional. A plan that goes over one shows a warning with a fix; it never stops you.',
    done: { changes: limitItems }, skippable: true,
  },
  {
    id: 'look', target: { section: 'quick', control: '#layout' }, title: 'Choose a look',
    why: 'The style fills the tank with a matching set of substrate, hardscape and plants. Shuffle draws another one; you can change any piece afterwards.',
    done: { changes: c => c.tank.layout.id }, skippable: true,
  },
];
