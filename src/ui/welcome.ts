// The Welcome screen = the Guided workspace (lane C4 2026-10-27; rebuilt by lane GV1 2026-10-30 as a stepper, ui/guided/). The four start
// intents are picture cards on step 2 (guided/steps.ts INTENT_CARDS); WELCOME_TILES keeps their ids for the callers that name them.
// The pure part (tile list, what an action does) is testable; attachWelcome wires the dialog in index.html.
import type { Store } from '../scene/store';
import { INTENT_CARDS } from './guided/steps';
import { attachGuidedFlow, type GuidedHost } from './guided/flow';

export type WelcomeTileId = 'animal' | 'look' | 'equipment' | 'open';
export type WelcomeAction = 'stocking' | 'look' | 'sandbox' | 'suggest' | 'equipment';
export interface WelcomeTile { id: WelcomeTileId; title: string; blurb: string; action: WelcomeAction }

/** "Where do you want to start?" (step 2): four pieces of information a person can give, not four ways to run the software. Sandbox is an
 *  editing method, so it is a separate "Build manually" link. Existing equipment and Open to ideas both lead to Suggest (GV1). */
const TILE_OF = { animals: ['animal', 'stocking'], look: ['look', 'look'], equipment: ['equipment', 'suggest'], ideas: ['open', 'suggest'] } as const;
export const WELCOME_TILES: readonly WelcomeTile[] = INTENT_CARDS.map(c => ({ id: TILE_OF[c.id][0] as WelcomeTileId, title: c.title, blurb: c.line, action: TILE_OF[c.id][1] as WelcomeAction }));
export const SANDBOX_ACTION: WelcomeAction = 'sandbox';
export const SUGGEST_ACTION: WelcomeAction = 'suggest';
export const WELCOME_TITLE = 'Guided setup';

/** What the screen does for an action: a call into the host (open a screen, start a tank). */
export function welcomeOutcome(a: WelcomeAction): { kind: 'go'; to: 'stocking' | 'look' | 'sandbox' | 'suggest' | 'equipment' } {
  return { kind: 'go', to: a };
}

export interface WelcomeHost extends GuidedHost {
  /** An empty tank in the editor. */ sandbox(): boolean;
  /** Open the old New / Open chooser (deals, starters, saved tanks). */ browse(menu: 'new' | 'open'): void;
}

export function attachWelcome(store: Store, host: WelcomeHost) {
  const dlg = document.getElementById('welcomeDlg') as HTMLDialogElement;
  const flow = attachGuidedFlow(dlg, store, host);
  dlg.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-w],[data-browse]');
    if (!t) return;
    if (t.dataset.browse) { dlg.close(); host.browse(t.dataset.browse as 'new' | 'open'); } else if (t.dataset.w === 'sandbox' && host.sandbox()) dlg.close();
  });
  return { show: flow.show, state: flow.state };
}
