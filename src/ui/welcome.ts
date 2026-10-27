// The Welcome screen (lane C4, Nathan 2026-10-27): the front door. Three tiles feed the same builder / scene as the New
// menu does, plus a "Suggest a setup" button (Discover is an action, not a path). The pure part (tile list, what a
// click does) is testable; attachWelcome wires the dialog in index.html.
export type WelcomeTileId = 'animal' | 'look' | 'sandbox';
export type WelcomeAction = 'stocking' | 'soon-look' | 'sandbox' | 'suggest';
export interface WelcomeTile { id: WelcomeTileId; title: string; blurb: string; action: WelcomeAction }

export const WELCOME_TILES: readonly WelcomeTile[] = [
  { id: 'animal', title: 'An animal I want', blurb: 'Pick the animal; the tank it needs, and what it costs, follow.', action: 'stocking' },
  { id: 'look', title: 'A look I want', blurb: 'Start from a style: nature, iwagumi, jungle, reef.', action: 'soon-look' },
  { id: 'sandbox', title: 'Sandbox', blurb: 'An empty tank to fill yourself, no questions. Rebuild a tank you already own here.', action: 'sandbox' },
];
export const SUGGEST_ACTION: WelcomeAction = 'suggest';
export const WELCOME_TITLE = 'Welcome to TankLook';

/** What the screen does for an action: a call into the host (open a screen, start a tank) or a short coming-soon panel. */
export function welcomeOutcome(a: WelcomeAction): { kind: 'go'; to: 'stocking' | 'sandbox' | 'suggest' } | { kind: 'soon'; text: string } {
  switch (a) {
    case 'stocking': return { kind: 'go', to: 'stocking' };
    case 'sandbox': return { kind: 'go', to: 'sandbox' };
    case 'soon-look': return { kind: 'soon', text: 'Starting from a look is coming soon. For now, Sandbox lets you pick a scape style in the editor, or pick an animal and choose its scape after.' };
    case 'suggest': return { kind: 'go', to: 'suggest' };
  }
}

export interface WelcomeHost {
  /** Open the stocking screen (path 1). */ stocking(): void;
  /** Open the Suggest a setup panel (guardrails in, proposals out). */ suggest(): void;
  /** An empty tank in the editor. */ sandbox(): boolean;
  /** Open the old New / Open chooser (deals, starters, saved tanks). */ browse(menu: 'new' | 'open'): void;
}

export function attachWelcome(host: WelcomeHost) {
  const dlg = document.getElementById('welcomeDlg') as HTMLDialogElement;
  const grid = document.getElementById('welcomeTiles')!, soon = document.getElementById('welcomeSoon')!;
  grid.innerHTML = WELCOME_TILES.map(t => `<button type="button" class="startpath welcomeTile" data-w="${t.action}" data-id="${t.id}"><b>${t.title}</b><span>${t.blurb}</span></button>`).join('');
  const run = (a: WelcomeAction) => {
    const o = welcomeOutcome(a);
    if (o.kind === 'soon') { soon.textContent = o.text; soon.hidden = false; return; }
    soon.hidden = true;
    if (o.to === 'sandbox') { if (host.sandbox()) dlg.close(); } else if (o.to === 'suggest') { dlg.close(); host.suggest(); } else { dlg.close(); host.stocking(); }
  };
  dlg.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-w],[data-browse]');
    if (!t) return;
    if (t.dataset.browse) { dlg.close(); host.browse(t.dataset.browse as 'new' | 'open'); } else run(t.dataset.w as WelcomeAction);
  });
  return { show() { soon.hidden = true; if (!dlg.open) dlg.showModal(); (grid.firstElementChild as HTMLElement | null)?.focus(); } };
}
