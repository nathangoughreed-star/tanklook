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
  // recorded on origin/main before lane TG step 3 (2026-10-19): as saved, and with their tech made explicit; upkeep and minutes re-blessed 2026-10-21 (lane MW: water changes from the nitrogen budget, new feeding / glass / plant rows); terrarium risk 4.294 -> 4.373 re-blessed 2026-10-26 (lane S231: its light now clears the dome lamp); all four re-blessed 2026-10-21 (lane CB: combined sources moved adult sizes, group minimums and tank minimums); all four re-blessed 2026-10-21 (lane CB: combined sources moved adult sizes, group minimums and tank minimums); reef rows re-blessed 2026-10-22 (lane SN: the turbo snail mass now from Turbo cornutus, its 2 turbos make a little more waste); reef and paludarium risk re-blessed 2026-10-22 (temp-tiers: pairs sharing under 2 °C are a narrow margin now, not a compatibility flag, so their species lose the animal-warning risk points); reef and clownnano +tech re-blessed 2026-10-23 (lane SF: no sump in their filter, so the inferred skimmer is the hang-on one)
  // 2026-10-27 (Nathan: a dry tank's lamps count in the totals): arid +$132 setup +$10.81/mo (dome + UVB); python +$172 (+ its mesh lid) +$10.81/mo;
  // terrarium risk back to 4.294: its tree frogs (warm spot from 28 C) no longer infer a dome (BASK_C 29), so S231 no longer raises their light
  const LOCK: Record<string, number[]> = {"planted":[1334.104,53.447,55.66,8.229],"planted+tech":[1334.104,51.55,56.895,8.298],"iwagumi":[2111.437,43.308,53.943,6.696],"iwagumi+tech":[2111.437,41.904,54.425,6.826],"betta":[337.872,9.969,33.949,4.984],"betta+tech":[337.872,7.37,33.248,5.181],"paludarium":[1645.377,60.087,58.399,7.467],"paludarium+tech":[1631.377,54.75,59.682,7.566],"terrarium":[909.126,33.197,15.324,4.294],"terrarium+tech":[909.126,33.197,15.324,4.294],"reef":[3421.776,175.13,88.873,6.451],"reef+tech":[3302.944,159.459,97.931,6.624],"rainforest":[1512.939,74.961,36.904,4.005],"rainforest+tech":[1512.939,74.961,36.904,4.005],"arid":[1523.125,58.236,15.569,3.298],"arid+tech":[1523.125,58.236,15.569,3.298],"python":[1749.919,37.182,21.769,1.813],"python+tech":[1749.919,37.182,21.769,1.813],"blackwater":[1236.514,49.617,44.674,5.613],"blackwater+tech":[1236.514,48.876,45.909,5.785],"clownnano":[1556.626,96.605,73.753,6.326],"clownnano+tech":[1399.34,81.334,78.717,6.47]};
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
