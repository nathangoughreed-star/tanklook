// Featured deals on the start dialog (lane KD): live retailer bundles as one-click starts.
// A card opens a new scene built from the deal with its bundle price pinned to the demand panel (src/demand/pinned.ts).
import { DEAL_NOTE } from '../data/deals';
import { featuredDeals } from '../demand/dealscene';
import { pinDeal } from '../demand/pinned';
import type { Deal } from '../data/deals';
import type { Scene } from '../scene/types';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const FINISH = { black: '#1d1f24', white: '#e8e6e0', oak: '#b58a58' };
const PARTS: Record<string, string> = { tank: 'tank', stand: 'stand', lid: 'lid', light: 'light', filter: 'filter', heater: 'heater' };
/** Front-view picture of the setup: tank (real aspect), lid, stand in its style and finish. */
function pic(d: Deal, sc: Scene): string {
  const S = sc.tanks[0], L = S.tank.L, H = S.tank.H, W = 120, h = Math.max(30, Math.min(52, W * H / L)), stand = S.stand.show, sh = stand ? 38 : 0, y0 = 8, col = FINISH[S.stand.finish] ?? FINISH.black;
  const lid = S.lid === 'open' ? '' : `<rect x="4" y="${y0}" width="${W - 8}" height="5" rx="1" fill="${S.lid === 'glass' ? '#9fb8c4' : '#15171b'}"/>`;
  const led = d.includes.includes('light') ? `<rect x="14" y="${y0 + 5}" width="${W - 28}" height="2" fill="#f4f0d8"/>` : '';
  const ty = y0 + 5, st = !stand ? '' : S.stand.style === 'frame'
    ? `<g fill="${col}"><rect x="6" y="${ty + h}" width="4" height="${sh}"/><rect x="${W - 10}" y="${ty + h}" width="4" height="${sh}"/><rect x="4" y="${ty + h}" width="${W - 8}" height="4"/><rect x="6" y="${ty + h + sh * 0.55}" width="${W - 12}" height="3"/></g>`
    : `<rect x="4" y="${ty + h}" width="${W - 8}" height="${sh}" fill="${col}" stroke="#555" stroke-width=".6"/><rect x="${W / 2 - .5}" y="${ty + h + 4}" width="1" height="${sh - 8}" fill="#555"/><circle cx="${W / 2 - 5}" cy="${ty + h + sh / 2}" r="1.2" fill="#aaa"/><circle cx="${W / 2 + 5}" cy="${ty + h + sh / 2}" r="1.2" fill="#aaa"/>`;
  return `<svg viewBox="0 0 ${W} ${ty + h + sh + 4}" width="100%" role="img" aria-label="${esc(d.name)}">${lid}${led}<rect x="6" y="${ty}" width="${W - 12}" height="${h}" fill="#4f7f94" fill-opacity=".35" stroke="#9fc4d4" stroke-width="1"/>${st}</svg>`;
}
const usd = (v: number) => '$' + Math.round(v).toLocaleString();

/** Fill `box` (the start dialog's deals slot); its heading (the previous sibling) hides when nothing qualifies. */
export function renderFeaturedDeals(box: HTMLElement, open: (name: string, scene: Scene) => void) {
  const list = featuredDeals(Date.now(), 3), head = box.previousElementSibling as HTMLElement | null;
  box.hidden = !list.length; if (head) head.hidden = !list.length;
  box.innerHTML = list.map(({ deal: d, savingUsd, scene }, i) => {
    const sc = scene.tanks[0], got = d.includes.map(x => x === 'stand' ? `stand (${sc.stand.finish} ${sc.stand.style})` : x === 'lid' ? `${sc.lid === 'glass' ? 'glass canopy' : sc.lid} lid` : PARTS[x]), no = (['filter', 'heater'] as const).filter(x => !d.includes.includes(x));
    return `<div class="libcard"><button class="libopen" data-deal="${i}" title="Open this setup, then customise it"><b style="white-space:normal">${esc(d.retailer)}: ${esc(d.name)}</b>` +
      `${pic(d, scene)}<span class="hint">Comes with: ${esc(got.join(', '))}${no.length ? `. Not included: ${no.join(', ')}` : ''}</span>` +
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
