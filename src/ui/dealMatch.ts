// Deal match in the demand panel (lane DM, 2026-10-19; swap list 2026-10-27: up to 3 kits with saving and what you give up). Was: one line when a same-size bundle with gear as good for this build saves
// money; "Show it as Tank B" splits with the bundle's gear swapped in and B priced as the deal; on B, "Make this my tank" closes A
// (Ctrl+Z brings it back). Never a popup; a dismissed match stays dismissed for that scene (by name, in this browser).
import { MIN_SAVING_USD, dealSwaps, withDealGear } from '../demand/dealmatch';
import { DEAL_NOTE, NOT_SPONSORED } from '../data/deals';
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
    const d = pinnedDeal(sc.tanks[i])!, cost = (k: number) => demandOf(sc.tanks[k], P, { kit: pinnedKit(sc.tanks[k], k, P) }).totals.setupUsd;
    const ca = cost(1 - i), cb = cost(i), s = ca - cb, AB = 'AB';
    box.innerHTML = `<b>Tank ${AB[1 - i]}</b> ${usd(ca)} to set up · <b>Tank ${AB[i]}</b> as the ${esc(d.retailer + ' ' + d.name)} bundle ${usd(cb)}${Math.abs(s) >= 1 ? `: ${s > 0 ? 'saves' : 'costs'} about ${usd(Math.abs(s))}` : ''}. <button type="button" class="dmkeep">Make Tank ${AB[i]} my tank</button>`;
    box.querySelector<HTMLButtonElement>('.dmkeep')!.onclick = () => { store.closeTank(1 - i); changed(); };
  } else {
    const gone = dismissed()[sc.name] ?? [], swaps = dealSwaps(store.tank, P, { units: sc.units }).filter(w => !gone.includes(w.deal.id) && w.savingUsd > MIN_SAVING_USD).slice(0, 3);
    if (!swaps.length) return;
    box.innerHTML = `<div><b>Swap for a kit or sale</b> (shipping included; ${esc(DEAL_NOTE)}):</div>` + swaps.map((w, i) => {
      const d = w.deal;
      return `<div class="dmswap" data-i="${i}">&bull; <a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.retailer + ' ' + d.name)}</a> ${usd(d.price.usd)}${d.price.regularUsd ? ` (was ${usd(d.price.regularUsd)})` : ''}, ${esc(w.shipText)}: <b>saves about ${usd(w.savingUsd)}</b>${d.est ? ' (estimate)' : ''}${d.saleEnds ? `, sale ends ${esc(d.saleEnds)}` : ''}; ${esc(d.asOf)}`
        + `<br>You would change: ${w.changes.length ? w.changes.map(esc).join('; ') : 'nothing else'}.`
        + `<br>${w.tradeoffs.length ? `<span style="color:var(--warn)">What you give up: ${w.tradeoffs.map(esc).join('; ')}.</span>` : 'Gives up nothing we can find.'}`
        + (w.guesses.length ? `<br><i>Guessed: ${esc(w.guesses.join('; '))}</i>` : '')
        + `<br>${w.sameTank ? '<button type="button" class="dmshowb">Show it as Tank B</button> ' : ''}<a href="#" class="dmnot">Not now</a></div>`;
    }).join('') + `<div style="opacity:.7">${esc(NOT_SPONSORED)}.</div>`;
    box.querySelectorAll<HTMLElement>('.dmswap').forEach(row => {
      const w = swaps[+row.dataset.i!];
      const show = row.querySelector<HTMLButtonElement>('.dmshowb');
      if (show) show.onclick = () => { store.splitTankWith(a => { const b = withDealGear(a, w.deal); pinTank(b, w.deal); return b; }); changed(); };
      row.querySelector<HTMLAnchorElement>('.dmnot')!.onclick = e => { e.preventDefault(); dismiss(sc.name, w.deal.id); row.remove(); };
    });
  }
  el.prepend(box);
}
