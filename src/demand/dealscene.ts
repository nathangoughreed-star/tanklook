// A new scene built from a bundle deal (lane KD): catalog tank, stand on, the kit's light and lid when the deal names a kit.
import { getTankModel, tankFromModel } from '../data/tanks';
import { kitById } from '../data/kits';
import { DEALS, type Deal } from '../data/deals';
import { dealOffers } from './deals';
import { defaultProfile } from './types';
import { emptyScene } from '../scene/defaults';
import { applyKitLight } from '../scene/kitlight';
import type { Scene } from '../scene/types';

export function sceneFromDeal(d: Deal): Scene | undefined {
  const m = d.tank ? getTankModel(d.tank) : undefined;
  if (!m) return undefined;
  const sc = emptyScene(); let S = sc.tanks[0];
  S.tank = tankFromModel(m);
  S.camera = { ...S.camera, az: 35, el: 22, zoom: 0.8 }; // three-quarter view from above: the picture and the opened scene show the stand and the top
  S.stand = { ...S.stand, show: d.includes.includes('stand'), style: d.look?.style ?? 'cabinet', finish: d.look?.finish ?? 'black' };
  S.lid = d.includes.includes('lid') ? d.look?.lid ?? 'hood' : 'open';
  const k = d.kit ? kitById(d.kit) : undefined;
  if (k) { S = applyKitLight(S, k as never); S.lid = k.lid; }
  sc.tanks[0] = S; sc.name = `${d.retailer} ${d.name}`;
  return sc;
}

const DAY = 864e5, FRESH_DAYS = 30;
/** Deals worth featuring on the start dialog: a real catalog tank, a live sale, a recent listing check; best saving first. */
export function featuredDeals(now = Date.now(), n = 3, deals: Deal[] = DEALS): { deal: Deal; scene: Scene; savingUsd: number }[] {
  const out: { deal: Deal; scene: Scene; savingUsd: number }[] = [];
  for (const deal of deals) {
    if (deal.saleEnds && Date.parse(deal.saleEnds + 'T23:59:59') < now) continue;
    if (now - Date.parse(deal.asOf) > FRESH_DAYS * DAY) continue;
    const scene = sceneFromDeal(deal);
    if (!scene) continue;
    const off = dealOffers(scene.tanks[0], defaultProfile(), { now }, [deal])[0];
    const saving = off ? off.savingUsd : 0;
    if (saving > 0 || deal.price.regularUsd) out.push({ deal, scene, savingUsd: saving });
  }
  return out.sort((a, b) => b.savingUsd - a.savingUsd).slice(0, n);
}
