// Deal match in the demand panel (lane DM, 2026-10-19): one line when a same-size bundle with gear as good for this build saves
// money; "Show it as Tank B" splits with the bundle's gear swapped in and B priced as the deal; on B, "Make this my tank" closes A
// (Ctrl+Z brings it back). Never a popup; a dismissed match stays dismissed for that scene (by name, in this browser).
import { bestMatch, withDealGear } from '../demand/dealmatch';
import { demandOf } from '../demand/engine';
import { pinTank, pinnedDeal, pinnedKit } from '../demand/pinned';
import type { UserProfile } from '../demand/types';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';

const KEY = 'tanklook.dealDismissed';
const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const own = (t: TankSetup) => !!(t as TankSetup & { dealPin?: string }).dealPin;

function dismissed(): Record<string, string[]> { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string[]>; } catch { return {}; } }
function dismiss(scene: string, id: string) {
  const d = dismissed(); d[scene] = [...new Set([...(d[scene] ?? []), id])];
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* best-effort */ }
}

/** Add the deal-match line to the deals area `el` (call after it is filled). `changed` re-renders the panel. */
export function renderDealMatch(el: HTMLElement, store: Store, P: UserProfile, changed: () => void) {
  const sc = store.scene, box = document.createElement('div');
  box.className = 'dmmatch';
  if (sc.tanks.length > 1) {
    // a split where one tank is priced as a bundle: both costs, and the button that keeps the bundle tank
    const i = sc.tanks.findIndex(own);
    if (i < 0) return;
    const d = pinnedDeal(sc.tanks[i])!, cost = (k: number) => demandOf(sc.tanks[k], P, { kit: pinnedKit(sc.tanks[k], k) }).totals.setupUsd;
    const ca = cost(1 - i), cb = cost(i), s = ca - cb, AB = 'AB';
    box.innerHTML = `<b>Tank ${AB[1 - i]}</b> ${usd(ca)} to set up · <b>Tank ${AB[i]}</b> as the ${esc(d.retailer + ' ' + d.name)} bundle ${usd(cb)}${Math.abs(s) >= 1 ? `: ${s > 0 ? 'saves' : 'costs'} about ${usd(Math.abs(s))}` : ''}. <button type="button" class="dmkeep">Make Tank ${AB[i]} my tank</button>`;
    box.querySelector<HTMLButtonElement>('.dmkeep')!.onclick = () => { store.closeTank(1 - i); changed(); };
  } else {
    const gone = dismissed()[sc.name] ?? [];
    const m = bestMatch(store.tank, P, { units: sc.units }, id => gone.includes(id));
    if (!m) return;
    box.innerHTML = `A bundle close to your build: <a href="${esc(m.deal.url)}" target="_blank" rel="noopener">${esc(m.deal.retailer + ' ' + m.deal.name)}</a>, saves about ${usd(m.savingUsd)}.`
      + `<br>Changes: ${m.changes.map(esc).join('; ')}.`
      + (m.guesses.length ? `<br><i>Guessed: ${esc(m.guesses.join('; '))}</i>` : '')
      + `<br><button type="button" class="dmshowb">Show it as Tank B</button> <a href="#" class="dmnot">Not now</a>`;
    box.querySelector<HTMLButtonElement>('.dmshowb')!.onclick = () => {
      store.splitTankWith(a => { const b = withDealGear(a, m.deal); pinTank(b, m.deal); return b; });
      changed();
    };
    box.querySelector<HTMLAnchorElement>('.dmnot')!.onclick = e => { e.preventDefault(); dismiss(sc.name, m.deal.id); box.remove(); };
  }
  el.prepend(box);
}
