// Lane TG step 3: real filters (and the heaters retail kits ship) from data/gear-catalog.json: drawn at their own size and
// colours, picked in the Tech menu, matched to the bundles that ship them, and priced from their listing.
import { describe, expect, it } from 'vitest';
import { FILTER_PRODUCTS, HEATER_PRODUCTS, filterByName, filterProduct, filtersNear, heaterForBundle, listedPrice } from '../src/data/gearCatalog';
import { DEALS, dealAsKit } from '../src/data/deals';
import { sceneFromDeal } from '../src/demand/dealscene';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import { SCENES } from '../src/examples/scenes';
import { gearPicks } from '../src/render/gear3d';
import { GEAR, applyPreset, filterFor, optionCost, parseTech, techOf, withChoice } from '../src/scene/tech';
import { parseScene } from '../src/scene/validate';
import { price as rowPrice } from '../src/demand/prices';

const tankOf = (id: string) => parseScene(JSON.parse(SCENES[id])).scene.tanks[0];
const HEX = /^#[0-9a-f]{6}$/i;

describe('filter catalogue', () => {
  it('every filter has a kind, a body size, a source and a body colour read from a photo', () => {
    expect(FILTER_PRODUCTS.length).toBeGreaterThan(40);
    for (const kind of ['hob', 'canister', 'internal', 'sponge']) expect(FILTER_PRODUCTS.some(f => f.kind === kind), kind).toBe(true);
    for (const f of FILTER_PRODUCTS) {
      expect(f.bodyMm.w * f.bodyMm.d * f.bodyMm.h, f.id).toBeGreaterThan(0);
      expect(f.url, f.id).toMatch(/^https?:\/\//);
      expect(f.colors.body.hex, f.id).toMatch(HEX);
      expect(f.colors.photo, f.id).toMatch(/^https?:\/\//);
    }
    expect(new Set(FILTER_PRODUCTS.map(f => f.id)).size).toBe(FILTER_PRODUCTS.length);
  });
  it('offers products of the kind rated for about this tank, and finds the one a listing names', () => {
    const near = filtersNear('hob', 20);
    expect(near.length).toBeGreaterThan(3);
    expect(near.every(f => f.kind === 'hob' && (f.galMax ?? 99) >= 10)).toBe(true);
    expect(filterByName('AquaClear 20', 'hob')?.id).toBe('aquaclear-20');
    expect(filterByName('Top Fin internal filter', 'internal', 20)?.id).toBe('topfin-if20');
    expect(filterByName('integrated filter', 'internal')).toBeUndefined();
    expect(heaterForBundle('PetSmart Top Fin Bow Front 36', 200)?.id).toBe('topfin-200');
  });
});

describe('a picked filter', () => {
  const S = tankOf('planted'), t = { ...applyPreset(S, 'midplanted') };
  const hob = FILTER_PRODUCTS.find(f => f.kind === t.rows.filter && listedPrice(f))!;
  const T = { ...t, filterProduct: hob.id };
  it('is kept on reload; dropped when unknown or when the filter row changes', () => {
    expect(parseTech(T)?.filterProduct).toBe(hob.id);
    expect(parseTech({ ...T, filterProduct: 'no-such' })?.filterProduct).toBeUndefined();
    expect(withChoice({ ...S, tech: T }, 'filter', 'sponge').filterProduct).toBeUndefined();
  });
  it('sets the flow, is drawn, and its listed price replaces the class price', () => {
    const f = filterFor({ ...S, tech: T }, hob.kind, undefined, hob.id);
    expect(f.product?.id).toBe(hob.id); expect(f.gph).toBe((hob.gph ?? f.model.gph) * f.n);
    expect(gearPicks({ ...S, tech: T }).find(p => p.row === 'filter')?.product).toBe(hob.id);
    const c = optionCost({ ...S, tech: T }, 'filter', hob.kind, { tech: T });
    expect(c.setup.mode).toBeCloseTo(listedPrice(hob)! * f.n, 6);
    // an estimated price is not used: the class price stays
    const guess = FILTER_PRODUCTS.find(f => f.kind === hob.kind && f.priceUsd && !listedPrice(f));
    if (guess) {
      const TG = { ...t, filterProduct: guess.id }, g = filterFor({ ...S, tech: TG }, guess.kind, undefined, guess.id), cg = optionCost({ ...S, tech: TG }, 'filter', guess.kind, { tech: TG });
      expect(cg.setup.mode / g.n).toBeCloseTo(rowPrice(g.model.priceKey)!.mode * (GEAR.filter.modelPriceK?.[g.model.id] ?? 1), 6);
    }
  });
  it('a picked heater with a listed price is priced from it', () => {
    const hp = HEATER_PRODUCTS.find(h => listedPrice(h))!, TH = { ...t, rows: { ...t.rows, heater: 'one' }, heaterProduct: hp.id };
    expect(optionCost({ ...S, tech: TH }, 'heater', 'one', { tech: TH }).setup.mode).toBeCloseTo(listedPrice(hp)!, 6);
  });
});

describe('the examples (no product picked) do not move', () => {
  // recorded on origin/main before lane TG step 3 (2026-10-19): as saved, and with their tech made explicit
  const LOCK: Record<string, number[]> = {"planted":[1337.093,52.933,54.441,7.731],"planted+tech":[1337.093,51.131,55.081,7.82],"iwagumi":[2111.437,43.006,67.082,5.767],"iwagumi+tech":[2111.437,41.645,67.095,5.933],"betta":[337.872,9.952,27.041,5.64],"betta+tech":[337.872,7.354,26.068,5.81],"paludarium":[1645.377,58.952,54.649,7.992],"paludarium+tech":[1631.377,53.713,55.329,8.071],"terrarium":[736.198,19.816,18.473,4.294],"terrarium+tech":[736.198,19.816,18.473,4.294],"reef":[3421.776,156.992,74.857,8.608],"reef+tech":[3309.597,141.586,82.859,8.676],"rainforest":[1463.308,73.003,31.583,4.005],"rainforest+tech":[1463.308,73.003,31.583,4.005],"arid":[1380.183,36.148,19.883,3.298],"arid+tech":[1380.183,36.148,19.883,3.298],"python":[1549.696,65.682,19.713,1.813],"python+tech":[1549.696,65.682,19.713,1.813],"blackwater":[1275.347,51.243,43.254,5.613],"blackwater+tech":[1275.347,50.596,43.894,5.785],"clownnano":[1579.869,100.899,66.678,6.326],"clownnano+tech":[1426.053,85.748,71.843,6.47]};
  it('setup, upkeep, minutes and risk are unchanged for all 11 examples', () => {
    expect(Object.keys(SCENES).length).toBe(11);
    for (const id of Object.keys(SCENES)) {
      const S = tankOf(id);
      for (const [k, T] of [['', S], ['+tech', { ...S, tech: S.water.on ? techOf(S) : undefined }]] as const) {
        const x = demandOf(T, defaultProfile(), { now: Date.parse('2026-10-19') }).totals;
        expect([x.setupUsd, x.upkeepUsdMo, x.minPerWeek, x.risk].map(v => Math.round(v * 1000) / 1000), id + k).toEqual(LOCK[id + k]);
      }
    }
  });
});

describe('bundles draw their exact gear', () => {
  it('a bundle naming a catalogued filter or brand heater opens with that product', () => {
    let filters = 0, heaters = 0;
    for (const d of DEALS) {
      const S = sceneFromDeal(d)?.tanks[0]; if (!S?.tech) continue;
      const k = dealAsKit(d), fp = k.filter && filterByName(`${k.filter.name ?? ''} ${k.filter.rating ?? ''}`, k.filter.kind);
      const own = S.tech.filters?.[0]?.product; // the bundle's own units (2026-10-20: heaters / filters are lists)
      if (fp) { expect(own, d.id).toBeDefined(); expect(filterProduct(own)?.brand, d.id).toBe(fp.brand); filters++; }
      if (S.tech.heaters?.[0]?.product) heaters++;
    }
    expect(filters).toBeGreaterThanOrEqual(20); expect(heaters).toBeGreaterThanOrEqual(12);
  });
});
