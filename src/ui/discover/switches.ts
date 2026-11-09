// The "Discovery can change this" switches (lane DX7). One per creative menu header (Tank, Substrate, Hardscape, Plants, Animals); the Discover panel shows
// the SAME five, bound to the same project state (`TankSetup.discoverOn`, scene/discoverScope.ts), never a second copy. Constraints and Equipment have none.
import { discoverIsOn, setDiscoverTab } from '../../scene/discoverScope';
import type { Tab } from '../../scene/scope';
import { TABS } from '../../scene/scope';
import type { Store } from '../../scene/store';

/** The menu (details.sec data-sec) each switch sits in. */
export const MENU_OF: Record<Tab, string> = { tank: 'tank', substrate: 'substrate', hardscape: 'hardscape', plants: 'plants', animals: 'fish' };
export const SWITCH_TEXT = 'Discovery can change this';
const NAME: Record<Tab, string> = { tank: 'Tank', substrate: 'Substrate', hardscape: 'Hardscape', plants: 'Plants', animals: 'Animals' };

/** One switch as HTML (a button with role=switch: a button inside a summary does not toggle the menu). `text` defaults to the long label. */
export const switchHtml = (tab: Tab, on: boolean, text = SWITCH_TEXT): string =>
  `<button type="button" class="dxsw" role="switch" data-sw="${tab}" aria-checked="${on}" aria-label="${SWITCH_TEXT}: ${NAME[tab]}"><span class="dxtrack" aria-hidden="true"></span><span>${text}</span></button>`;

/** Flip one switch in the project (not an undo step: it is a setting, like a lock). */
export function toggleSwitch(store: Store, tab: Tab, on?: boolean): void {
  const now = discoverIsOn(store.tank, tab), want = on ?? !now;
  if (want === now) return;
  store.update(s => { setDiscoverTab(s.tanks[s.active], tab, want); }, { history: false });
}

/** Keep every `[data-sw]` button under `root` in step with the project. */
export function syncSwitches(store: Store, root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-sw]').forEach(b => b.setAttribute('aria-checked', String(discoverIsOn(store.tank, b.dataset.sw as Tab))));
}

/** Click handling for switches inside `root` (delegated: the panel redraws its markup). A click never opens or closes the menu it sits in. */
export function wireSwitches(store: Store, root: HTMLElement, after?: () => void): void {
  root.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sw]'); if (!b || !root.contains(b)) return;
    e.preventDefault(); e.stopPropagation(); toggleSwitch(store, b.dataset.sw as Tab); syncSwitches(store, document); after?.();
  });
}

/** Put the switch into the five menu headers and keep it in step with the project. */
export function attachMenuSwitches(store: Store): void {
  for (const t of TABS) {
    const sum = document.querySelector<HTMLElement>(`details.sec[data-sec="${MENU_OF[t]}"] > summary`);
    if (sum && !sum.querySelector('[data-sw]')) sum.insertAdjacentHTML('beforeend', switchHtml(t, discoverIsOn(store.tank, t)));
    if (sum) wireSwitches(store, sum);
  }
  store.subscribe(kind => { if (kind !== 'view' && kind !== 'select') syncSwitches(store); });
}
