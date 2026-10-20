// A new scene built from a bundle deal (lane KD): catalog tank, stand on, the kit's light and lid when the deal names a kit.
import { getTankModel, modelOfVariant, tankFromModel } from '../data/tanks';
import { kitById } from '../data/kits';
import { DEALS, dealAsKit, type Deal } from '../data/deals';
import { kitTech } from './tech';
import { dealOffers } from './deals';
import { defaultProfile } from './types';
import { emptyScene } from '../scene/defaults';
import { applyKitLight } from '../scene/kitlight';
import { inferTech } from '../scene/tech';
import type { Scene } from '../scene/types';

export function sceneFromDeal(d: Deal): Scene | undefined {
  const cat = d.tank ? getTankModel(d.tank) : undefined;
  if (!cat) return undefined;
  const m = d.dims ? modelOfVariant(cat, d.dims) : cat; // the bundle's own size on the catalog shape
  const sc = emptyScene(); let S = sc.tanks[0];
  S.tank = tankFromModel(m);
  S.camera = { ...S.camera, az: 35, el: 22, zoom: 0.8 }; // three-quarter view from above: the picture and the opened scene show the stand and the top
  // a bundle without a stand does not get one added: the user adds one or says they don't need one (the budget counts one meanwhile)
  const hasStand = d.includes.includes('stand');
  S.stand = { ...S.stand, show: hasStand, need: hasStand ? undefined : 'ask', style: d.look?.style ?? 'cabinet', finish: d.look?.finish ?? 'black' };
  S.lid = d.includes.includes('lid') ? d.look?.lid ?? 'hood' : 'open';
  const k = d.kit ? kitById(d.kit) : undefined;
  if (k) { S = applyKitLight(S, k as never); S.lid = k.lid; }
  else if (d.includes.includes('light')) { // a bundled LED (listings rarely give watts: the budget-tier default for this tank size stands in, flagged 'guess')
    S = applyKitLight(S, { light: { type: 'led', tech: 'led-white', count: 1, watts: d.look?.light?.watts ?? null, par: d.look?.light?.par, spec: d.look?.light?.par ? 'published' : d.look?.light?.watts ? 'listing' : 'guess' }, lid: S.lid, tier: 'budget', tankRatedGal: d.gal });
    if (d.look?.light?.kelvin) S.light = { ...S.light, kelvin: d.look.light.kelvin };
  }
  { // lane TG: the bundle's own filter and heater (drawn, and its gear rows); one it does not ship starts as 'none' for the user to add
    const t = kitTech(S, dealAsKit(d)) ?? (S.water.on ? { rows: { ...inferTech(S).rows } } : undefined);
    if (t) {
      if (!d.includes.includes('filter')) { t.rows.filter = 'none'; delete t.filterProduct; delete t.filterModel; delete t.filters; }
      if (!d.includes.includes('heater')) { t.rows.heater = 'none'; delete t.heaterProduct; delete t.heaterW; delete t.heaters; }
      S.tech = t;
    }
  }
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
