// Guided Setup Rev 03, the one dialog (lane GS4, 2026-11-02; research/design/guided-setup-rev03.md sections 2 and 8). ONE dialog hosts the shared onboarding
// World -> Equipment -> Limits -> Starting Point, then hands the same dialog body to discovery (Look First: Water -> Family -> Archetype -> Density -> Suitable
// Animals; Animals First: the animals, then Family -> Archetype -> Density). The breadcrumb is contextual: the four onboarding steps before the branch, only the
// route's own steps after it (Water hidden when resolved). Back works across the seam. Every answer is written to the one project state (scene/project.ts); the
// shell never replaces the scene: only discovery's own exit to the editor does, and an onboarding step never deletes what is on screen.
import { clearItem, getItem, setItem, type Brief, type Route } from '../../scene/brief';
import { envOf, routeOf, worldOf } from '../../scene/project';
import type { Store } from '../../scene/store';
import type { AnimalCount } from '../../scene/tankfit';
import { mountDiscovery, type CrumbState, type DiscoveryHost, type Mounted } from '../discovery/screens';
import type { VStep } from '../discovery/logic';
import { editBrief, getBrief, lockedStock, setBrief } from '../setupBrief';
import { mountEquipmentStep } from './equipmentStep';
import { mountLimitsStep } from './limitsStep';
import { ONBOARD_STEPS, exploresOf, nextOnboard, onboardCrumbs, ownedTankOf, placeOf, prevOnboard, setSuggested, suggestedOf, type OnboardStep, type ShellCrumb } from './logic';
import { mountStartStep } from './startStep';
import { mountWorldStep } from './worldStep';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** What the Animals First entry gets. GS5 fills this point (`attachGuided(store, host, { animalsEntry })`): choose the animals, then call `done()` and the shell mounts
 *  discovery with them; `back()` returns to Starting Point. `park()` hides the dialog (a side panel is open) and the shell shows a dock that brings it back. */
export interface AnimalsEntryCtx {
  store: Store; host: DiscoveryHost; root: HTMLElement;
  /** the animals chosen so far (the locked stock in the brief, and the animals in the tank) */ roster(): AnimalCount[];
  done(): void; back(): void; park(): void;
}
export type AnimalsEntry = (c: AnimalsEntryCtx) => { destroy(): void };

/** The Animals First entry until GS5: the current animal screen (a side panel) opened from here, then back to this dialog with the roster it built. */
export const placeholderAnimals: AnimalsEntry = c => {
  c.root.innerHTML = `<h3 class="vd-ask">Which animals do you want?</h3>
<p class="hint">Pick the species and how many, and the list shows what suits together and what needs a bigger tank. When you are done, the dialog comes back with the look to build around them.</p>
<p class="gs-bigrow"><button type="button" class="gs-big" data-gs="open"><b>Open the animal list</b><span>Search the catalogue and build your roster.</span></button></p>
<p class="vd-nav"><button type="button" data-gs="back">Back</button> <button type="button" class="primary" data-gs="next">Continue with these animals</button> <span class="hint gs-rost"></span></p>`;
  const next = c.root.querySelector<HTMLButtonElement>('[data-gs="next"]')!, rost = c.root.querySelector<HTMLElement>('.gs-rost')!;
  const n = c.roster().reduce((a, r) => a + r.n, 0);
  next.disabled = n === 0; rost.textContent = n ? `${n} animal${n === 1 ? '' : 's'} chosen.` : 'No animals chosen yet.';
  c.root.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-gs]'); if (!t) return;
    if (t.dataset.gs === 'open') c.park(); else if (t.dataset.gs === 'next') c.done(); else c.back();
  });
  return { destroy() { c.root.replaceChildren(); } };
};

/** What the Explore entry gets (lane OX mounts here): the branch step of "Open to anything", after Limits. `back()` returns to Limits, `pickWorld()` to World. */
export interface ExploreEntryCtx { store: Store; host: DiscoveryHost; root: HTMLElement; back(): void; pickWorld(): void; close(): void }
export type ExploreEntry = (c: ExploreEntryCtx) => { destroy(): void };
/** Explore Complete Setups until lane OX: a stub screen. */
export const placeholderExplore: ExploreEntry = c => {
  c.root.innerHTML = `<h3 class="vd-ask">Explore complete setups</h3>
<p class="hint">Coming next: batches of complete, stocked setups to like, pass or save, and then make one yours.</p>
<p class="vd-nav"><button type="button" data-gs="back">Back</button> <button type="button" class="linkbtn" data-gs="world">or pick a world</button></p>`;
  c.root.addEventListener('click', e => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-gs]'); if (t?.dataset.gs === 'back') c.back(); else if (t?.dataset.gs === 'world') c.pickWorld(); });
  return { destroy() { c.root.replaceChildren(); } };
};

export interface GuidedOpts { animalsEntry?: AnimalsEntry; exploreEntry?: ExploreEntry }
export function attachGuided(store: Store, host: DiscoveryHost, o: GuidedOpts = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'libdlg startdlg vd gs'; dlg.setAttribute('aria-labelledby', 'gsTitle');
  dlg.innerHTML = `<form method="dialog" class="libhead"><h2 id="gsTitle">Guided setup</h2><button value="close" aria-label="Close">✕</button></form>
<ol class="vd-rail gs-crumbs" aria-label="Steps"></ol><div class="gs-body"></div>`;
  document.body.append(dlg);
  const dock = document.createElement('nav'); dock.className = 'vd-dock'; dock.hidden = true; dock.setAttribute('aria-label', 'Guided');
  dock.innerHTML = '<button type="button" class="primary" data-vd="resume">Next: pick the look for these animals</button><button type="button" class="linkbtn" data-vd="hide" aria-label="Hide">✕</button>';
  document.body.append(dock);
  const rail = dlg.querySelector<HTMLElement>('.gs-crumbs')!, body = dlg.querySelector<HTMLElement>('.gs-body')!;
  const entry = o.animalsEntry ?? placeholderAnimals, explore = o.exploreEntry ?? placeholderExplore;

  let parked: Brief | undefined;   // the project as it was when the side panel opened (that panel starts a new scene and brief until lane GS6 / GS5 change it)
  let mounted: Mounted | undefined, part: { destroy(): void } | undefined, at: OnboardStep = 'world', route: Route | undefined;
  const clear = () => { mounted?.destroy(); mounted = undefined; part?.destroy(); part = undefined; };
  const pane = () => { const d = document.createElement('div'); d.className = 'gs-pane'; body.replaceChildren(d); return d; };
  /** The breadcrumb: a step already taken is a button back to it; the current one is marked; the rest are not reachable yet. */
  function drawCrumbs(list: ShellCrumb[]) {

    rail.innerHTML = list.map(c => `<li class="vd-r${c.state === 'current' ? ' current' : c.state === 'done' ? ' done' : ''}"${c.state === 'current' ? ' aria-current="step"' : ''}>${c.state === 'todo' ? `<span>${esc(c.label)}</span>` : `<button type="button" data-crumb="${esc(c.id)}">${esc(c.label)}</button>`}</li>`).join('') + (route ? '<li class="vd-r"><span>Make it your own</span></li>' : '');
  }

  // ---- the shared onboarding ----
  const advance = () => { const n = nextOnboard(at); if (n) showStep(n); };
  function showStep(s: OnboardStep) {
    clear(); at = s; route = undefined; drawCrumbs(onboardCrumbs(s, worldOf(getBrief())));
    const root = pane(), back = () => { const p = prevOnboard(s); if (p) showStep(p); };
    switch (s) {
      case 'world': part = mountWorldStep(root, { host, next: advance, leave: () => dlg.close() }); break;
      case 'equipment': part = mountEquipmentStep(root, { store, status: host.status, next: advance, back }); break;
      case 'limits': part = mountLimitsStep(root, { next: advance, back }); break;
      case 'start': part = exploresOf(getBrief()) ? explore({ store, host, root, back, pickWorld: () => showStep('world'), close: () => dlg.close() }) : mountStartStep(root, { pick: r => showRoute(r), back }); break;
    }
    (root.querySelector('button') as HTMLElement | null)?.focus();
  }

  // ---- the route: Look First or Animals First, in the same dialog body ----
  /** The animals already chosen: the locked stock in the brief and the animals in the tank (what discovery reads when the shell passes none). */
  const rosterNow = (): AnimalCount[] => {
    const m = new Map<string, number>();
    for (const a of lockedStock(getBrief())) m.set(a.species, (m.get(a.species) ?? 0) + a.n);
    if (!m.size) for (const f of store.tank.fish) m.set(f.species, (m.get(f.species) ?? 0) + 1);
    return [...m].map(([species, n]) => ({ species, n }));
  };
  function showRoute(r: Route) {
    clear(); route = r; at = 'start';
    if (r === 'animals' && !rosterNow().length) { showAnimals(); return; }
    mountRoute(r);
  }
  function showAnimals() {
    clear(); route = 'animals';
    drawCrumbs([{ id: 'roster', label: 'Animals', state: 'current' }]);
    part = entry({ store, host, root: pane(), roster: rosterNow, done: () => showRoute('animals'), back: () => showStep('start'),
      park: () => { dlg.close(); const keep = getBrief(); host.stocking(); parked = keep; if (getBrief() !== keep) editBrief(() => keep); dock.hidden = false; } });
  }
  function mountRoute(r: Route) {
    const b = getBrief(), own = ownedTankOf(b), env = envOf(b), roster = r === 'animals' ? rosterNow() : undefined;
    // the pictures use the enclosure the project stands on: the owned tank (Required or Available) when there is one, else discovery's own provisional chain (known
    // space, size limits, animals, budget; else an example size) which it labels as a suggestion
    mounted = mountDiscovery(store, host, pane(), {
      route: r, ...(env ? { world: env } : {}), ...(roster ? { roster } : {}), ...(own ? { tank: { model: own.model, use: own.use } } : {}), allowBack: true,
      ...(r === 'look' ? { suggested: suggestedOf(b) } : {}), onSuggested: list => editBrief(bb => setSuggested(bb, list)),
      onCrumbs: steps => {
        drawCrumbs([...(r === 'animals' ? [{ id: 'roster', label: 'Animals', state: 'done' as const }] : []), ...steps.map((c: CrumbState) => ({ id: c.id, label: c.label, state: c.state }))]);
      },
      onExit: kind => { if (kind === 'back') showStep('start'); else dlg.close(); },
    });
    mounted.restart();
  }

  dlg.addEventListener('close', () => mounted?.stop());
  dlg.addEventListener('click', e => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('[data-crumb]'); if (!c) return;
    const id = c.dataset.crumb!;
    if (!route && (ONBOARD_STEPS as readonly string[]).includes(id)) showStep(id as OnboardStep);
    else if (id === 'roster') showAnimals();
    else mounted?.goTo(id as VStep);
  });
  dock.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-vd]'); if (!t) return;
    dock.hidden = true;
    if (t.dataset.vd !== 'resume') return;
    // the animal screen may have started a fresh scene: the project is put back as it was, with the animals the person chose there
    if (parked) { const now = getItem(getBrief(), 'animals.stock'); let b = parked; parked = undefined; b = now && !now.off ? setItem(b, 'animals.stock', now.value, now.status) : clearItem(b, 'animals.stock'); setBrief(b); }
    show();
  });
  /** Open Guided: at the step asked for ("Starting from something I have now" opens Equipment), else at the first onboarding step still waiting, else back inside the route. */
  function show(ask?: OnboardStep) {
    dock.hidden = true; if (!dlg.open) dlg.showModal();
    const p = placeOf(getBrief(), ask);
    if ('at' in p) showStep(p.at); else showRoute(p.route);
  }
  return { show, close: () => dlg.close(), dialog: dlg, routeOf: () => routeOf(getBrief()) };
}
