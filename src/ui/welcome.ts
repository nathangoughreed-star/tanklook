// The Welcome screen (lane C4, Nathan 2026-10-27): the front door. Three tiles feed the same builder / scene as the New
// menu does, plus a "Suggest a setup" button (Discover is an action, not a path). The pure part (tile list, what a
// click does) is testable; attachWelcome wires the dialog in index.html.
export type WelcomeTileId = 'animal' | 'look' | 'equipment' | 'open';
export type WelcomeAction = 'stocking' | 'look' | 'sandbox' | 'suggest' | 'equipment';
export interface WelcomeTile { id: WelcomeTileId; title: string; blurb: string; action: WelcomeAction }

/** "What do you have in mind?" (Nathan's design note 2026-10-28): four pieces of information a person can give, not four ways to run the
 *  software. Each only pre-fills the shared setup brief (ui/setupBrief.ts). Sandbox is an editing method, so it is a separate "Build manually" link. */
export const WELCOME_TILES: readonly WelcomeTile[] = [
  { id: 'animal', title: 'Animals', blurb: 'I have a species or a community in mind.', action: 'stocking' },
  { id: 'look', title: 'Appearance', blurb: "I know the look I'd like to create.", action: 'look' },
  { id: 'equipment', title: 'Tank or equipment', blurb: "I'm starting with something I own.", action: 'equipment' },
  { id: 'open', title: "I'm open to ideas", blurb: "Help me discover what's possible.", action: 'suggest' },
];
export const SANDBOX_ACTION: WelcomeAction = 'sandbox';
export const SUGGEST_ACTION: WelcomeAction = 'suggest';
export const WELCOME_TITLE = 'What do you have in mind?';

/** What the screen does for an action: a call into the host (open a screen, start a tank) or a short coming-soon panel. */
export function welcomeOutcome(a: WelcomeAction): { kind: 'go'; to: 'stocking' | 'look' | 'sandbox' | 'suggest' | 'equipment' } | { kind: 'soon'; text: string } {
  switch (a) {
    case 'stocking': return { kind: 'go', to: 'stocking' };
    case 'sandbox': return { kind: 'go', to: 'sandbox' };
    case 'look': return { kind: 'go', to: 'look' };
    case 'suggest': return { kind: 'go', to: 'suggest' };
    case 'equipment': return { kind: 'go', to: 'equipment' };
  }
}

export interface WelcomeHost {
  /** Open the stocking screen (path 1). */ stocking(): void;
  /** Open the Suggest a setup panel (guardrails in, proposals out). */ suggest(): void;
  /** Open Create a look (path 2, lane C7). */ look(): void;
  /** Open the setup brief on the tank and equipment the person owns. */ equipment(): void;
  /** An empty tank in the editor. */ sandbox(): boolean;
  /** Open the old New / Open chooser (deals, starters, saved tanks). */ browse(menu: 'new' | 'open'): void;
}

import { attachWelcomeGuard } from './welcomeGuard';

import { getBrief, onBrief, primaryAction, type PrimaryId } from './setupBrief';

export function attachWelcome(host: WelcomeHost) {
  const dlg = document.getElementById('welcomeDlg') as HTMLDialogElement;
  const grid = document.getElementById('welcomeTiles')!, soon = document.getElementById('welcomeSoon')!;
  grid.innerHTML = WELCOME_TILES.map(t => `<button type="button" class="startpath welcomeTile" data-w="${t.action}" data-id="${t.id}"><b>${t.title}</b><span>${t.blurb}</span></button>`).join('');
  attachWelcomeGuard(document.getElementById('welcomeGuard')!);
  // the bottom button follows what the brief holds (setupBrief.primaryAction); the cards are the same actions as before
  const main = document.getElementById('welcomeSuggest') as HTMLButtonElement, PRIMARY: Record<PrimaryId, WelcomeAction> = { animals: 'stocking', styles: 'look', equipment: 'equipment', explore: 'suggest', generate: 'suggest' };
  const label = () => { const p = primaryAction(getBrief()); main.textContent = p.label; main.dataset.w = PRIMARY[p.id]; };
  onBrief(label); label();
  const run = (a: WelcomeAction) => {
    const o = welcomeOutcome(a);
    if (o.kind === 'soon') { soon.textContent = o.text; soon.hidden = false; return; }
    soon.hidden = true;
    if (o.to === 'sandbox') { if (host.sandbox()) dlg.close(); } else if (o.to === 'suggest') { dlg.close(); host.suggest(); } else if (o.to === 'look') { dlg.close(); host.look(); } else if (o.to === 'equipment') { dlg.close(); host.equipment(); } else { dlg.close(); host.stocking(); }
  };
  dlg.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-w],[data-browse]');
    if (!t) return;
    if (t.dataset.browse) { dlg.close(); host.browse(t.dataset.browse as 'new' | 'open'); } else run(t.dataset.w as WelcomeAction);
  });
  return { show() { soon.hidden = true; if (!dlg.open) dlg.showModal(); (grid.firstElementChild as HTMLElement | null)?.focus(); } };
}
