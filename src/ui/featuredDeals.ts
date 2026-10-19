// Featured deals on the start dialog (lane KD): live retailer bundles as one-click starts.
// A card opens a new scene built from the deal with its bundle price pinned to the demand panel (src/demand/pinned.ts).
import { DEAL_NOTE } from '../data/deals';
import { featuredDeals } from '../demand/dealscene';
import { pinDeal } from '../demand/pinned';
import type { Scene } from '../scene/types';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (v: number) => '$' + Math.round(v).toLocaleString();

/** Fill `box` (the start dialog's deals slot); its heading (the previous sibling) hides when nothing qualifies. */
export function renderFeaturedDeals(box: HTMLElement, open: (name: string, scene: Scene) => void) {
  const list = featuredDeals(Date.now(), 3), head = box.previousElementSibling as HTMLElement | null;
  box.hidden = !list.length; if (head) head.hidden = !list.length;
  box.innerHTML = list.map(({ deal: d, savingUsd }, i) => {
    const inc = d.includes.filter(x => x !== 'tank').join(', ');
    return `<div class="libcard"><button class="libopen" data-deal="${i}" title="Open this setup, then customise it"><b>${esc(d.retailer)}: ${esc(d.name)}</b>` +
      `<span class="hint">${d.gal} gal tank${inc ? ' + ' + esc(inc) : ''}</span>` +
      `<span><b>${usd(d.price.usd)}</b>${d.price.regularUsd ? ` <s>${usd(d.price.regularUsd)}</s>` : ''}${savingUsd > 1 ? ` &middot; about ${usd(savingUsd)} under buying the parts` : ''}</span>` +
      `<span class="hint">${d.saleEnds ? 'sale ends ' + esc(d.saleEnds) + '; ' : ''}as of ${esc(d.asOf)}${d.est ? ' (estimate)' : ''}; ${esc(DEAL_NOTE)}</span></button>` +
      `<a class="hint" href="${esc(d.url)}" target="_blank" rel="noopener">listing</a></div>`;
  }).join('');
  box.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-deal]'), it = b && list[+b.dataset.deal!];
    if (!it) return;
    pinDeal(it.deal); open(it.scene.name, it.scene);
  };
}
