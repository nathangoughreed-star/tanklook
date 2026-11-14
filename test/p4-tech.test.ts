// Lane P4 (2026-11-14): gear-choice edits in scene/techEdit.ts equal the code that was inline in ui/techMenu.ts (frozen
// copies below), and src/units.ts keeps the rounding of each copy it replaced.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { FILTER_MODELS, type FilterKind } from '../src/demand/gear';
import { FILTER_PRODUCTS, HEATER_PRODUCTS, genericHeaterW, lightProduct } from '../src/data/gearCatalog';
import { applyLightProduct } from '../src/scene/lightproduct';
import {
  applyPreset, feedFor, filterUnits, heatLoss, keepSet, optionDef, ownKeep, setFeed, sumpDefault, sumpFromModel, sumpOf, techOf, withChoice, withUnits, withoutUnit,
  type TechSetup,
} from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';
import { TANK_MODELS } from '../src/data/tanks';
import * as TE from '../src/scene/techEdit';
import * as U from '../src/units';

const load = (k: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[k])).scene; return sc.tanks[sc.active]; };
const planted = () => load('planted');
/** a planted tank with two heaters, two filters (one a product) and a sump, so every index operation has something to act on */
const loaded = (): TankSetup => {
  const S = planted(), h = HEATER_PRODUCTS[0], f = FILTER_PRODUCTS.find(p => p.kind === 'hob')!;
  let t = applyPreset(S, 'midplanted');
  t = withUnits(t, 'heater', [{ product: h.id, owned: true } as never, { w: 75, kit: true }]);
  t = withUnits(t, 'filter', [{ kind: 'hob', product: f.id }, { kind: 'sponge' }]);
  return { ...S, tech: t };
};

// ---- frozen copies of the old inline techMenu code
const heatersNowOld = (S: TankSetup, t: TechSetup) => heatLoss(S, t).units.map(u => ({ ...(u.product ? { product: u.product.id } : { w: u.watts }), ...(u.kit ? { kit: true } : {}), ...ownKeep(u) }));
const nextHeaterWOld = (S: TankSetup, t: TechSetup) => { const h = heatLoss(S, t), more = h.needW - h.totalW; return genericHeaterW(Math.max(more > 0.5 ? more : h.needW, 1)); };
const filterModelsOld = (kind: FilterKind) => FILTER_MODELS.filter(m => m.kind === kind).sort((a, b) => a.gph - b.gph);
const commitOld = (s: TankSetup, fn: (s: TankSetup) => TechSetup) => { s.tech = keepSet(s, fn(s)); if (s.water.on) s.grow.feed = feedFor(s); };

const same = (S: TankSetup, mine: (S: TankSetup) => TechSetup, old: (S: TankSetup) => TechSetup) => {
  const a = structuredClone(S), b = structuredClone(S);
  commitOld(a, old); TE.commitTech(b, mine);
  expect(JSON.parse(JSON.stringify(b.tech))).toEqual(JSON.parse(JSON.stringify(a.tech)));
  expect(b.grow.feed).toBe(a.grow.feed);
  expect(JSON.parse(JSON.stringify(mine(structuredClone(S))))).toEqual(JSON.parse(JSON.stringify(old(structuredClone(S)))));
};

describe('heaters', () => {
  const hp = HEATER_PRODUCTS[0], hp2 = HEATER_PRODUCTS[HEATER_PRODUCTS.length - 1];
  for (const [name, S] of [['planted', planted()], ['loaded', loaded()]] as const) {
    it(`add generic / product, remove, pick, watts, tune (${name})`, () => {
      same(S, s => TE.addHeater(s), s => { const t = techOf(s); return withUnits(t, 'heater', [...heatersNowOld(s, t), { w: nextHeaterWOld(s, t) }]); });
      same(S, s => TE.addHeater(s, hp.id), s => { const t = techOf(s); return withUnits(t, 'heater', [...heatersNowOld(s, t), { product: hp.id }]); });
      expect(TE.nextHeaterW(S, techOf(S))).toBe(nextHeaterWOld(S, techOf(S)));
      for (const i of [0, 1]) {
        same(S, s => TE.removeHeater(s, i), s => { const t = techOf(s); return withoutUnit({ ...t, heaters: heatersNowOld(s, t) }, 'heater', i); });
        same(S, s => TE.pickHeaterProduct(s, i, hp2.id), s => { const t = techOf(s); return withUnits(t, 'heater', heatersNowOld(s, t).map((u, k) => k === i ? { product: hp2.id, ...(u.kit ? { kit: true } : {}), ...ownKeep(u) } : u)); });
        for (const v of [1, 7.4, 150, 5000]) same(S, s => TE.setHeaterWatts(s, i, v), s => { const t = techOf(s); return withUnits(t, 'heater', heatersNowOld(s, t).map((u, k) => k === i ? { ...u, w: Math.min(2000, Math.max(5, Math.round(v))) } : u)); });
        same(S, s => TE.tuneHeater(s, i), s => { const t = techOf(s), us = heatersNowOld(s, t), p = HEATER_PRODUCTS.find(x => x.id === (us[i] as { product?: string })?.product); return p ? withUnits(t, 'heater', us.map((u, k) => k === i ? { w: p.watts, ...(u.kit ? { kit: true } : {}), ...ownKeep(u) } : u)) : t; });
      }
    });
  }
  it('behaves: a product pick keeps the owned mark, tuning drops the product, watts clamp', () => {
    const S = loaded();
    const picked = heatLoss(S, TE.pickHeaterProduct(S, 0, hp2.id)).units[0];
    expect(picked.product?.id).toBe(hp2.id);
    const tuned = TE.tuneHeater(S, 0); expect(heatLoss(S, tuned).units[0].product).toBeUndefined(); expect(heatLoss(S, tuned).units[0].watts).toBe(hp.watts);
    expect(heatLoss(S, TE.setHeaterWatts(S, 1, 1)).units[1].watts).toBe(5); expect(heatLoss(S, TE.setHeaterWatts(S, 1, 9999)).units[1].watts).toBe(2000);
    expect(heatLoss(S, TE.removeHeater(S, 0)).n).toBe(1);
  });
});

describe('filters and the sump', () => {
  const fp = FILTER_PRODUCTS.find(p => p.kind === 'canister')!, fp2 = FILTER_PRODUCTS.find(p => p.kind === 'hob')!;
  for (const [name, S] of [['planted', planted()], ['loaded', loaded()]] as const) {
    it(`add, remove, model, size, product, tune, sump (${name})`, () => {
      same(S, s => TE.addFilter(s, 'sponge'), s => { const t = techOf(s); return withUnits(t, 'filter', [...filterUnits(t), { kind: 'sponge' }]); });
      same(S, s => TE.addFilter(s, 'canister', fp.id), s => { const t = techOf(s); return withUnits(t, 'filter', [...filterUnits(t), { kind: 'canister', product: fp.id }]); });
      same(S, s => TE.addSump(s), s => { const t = techOf(s); return { ...withUnits(t, 'filter', [...filterUnits(t), { kind: 'sump' }]), sump: t.sump ?? sumpDefault(s) }; });
      same(S, s => TE.removeFilter(s, 0), s => withoutUnit(techOf(s), 'filter', 0));
      const withSump = { ...S, tech: TE.addSump(S) };
      same(withSump, s => TE.removeSump(s), s => { const t = techOf(s); return withoutUnit(t, 'filter', filterUnits(t).findIndex(u => u.kind === 'sump')); });
      const m = TANK_MODELS[0];
      same(S, s => TE.pickSump(s, m), s => ({ ...techOf(s), sump: sumpFromModel(m) }));
      for (const side of ['L', 'D', 'H'] as const) for (const [v, u] of [[20, 'in'], [51, 'cm'], [0.5, 'in'], [900, 'in']] as const)
        same(withSump, s => TE.setSumpSide(s, side, v, u), s => { const t = techOf(s), z = sumpOf(s, true)!, mm = Math.min(3000, Math.max(50, Math.round(v * (u === 'in' ? 25.4 : 10)))); return { ...t, sump: { L: z.L, D: z.D, H: z.H, [side]: mm } }; });
      for (const i of [0, 1]) {
        same(S, s => TE.setFilterModel(s, i, 'x'), s => { const t = techOf(s); return withUnits(t, 'filter', filterUnits(t).map((u, k) => k === i ? { ...u, model: 'x' } : u)); });
        same(S, s => TE.pickFilterProduct(s, i, fp2.id), s => { const t = techOf(s); return withUnits(t, 'filter', filterUnits(t).map((u, k) => k === i ? { kind: u.kind, product: fp2.id, ...(u.kit ? { kit: true } : {}), ...ownKeep(u) } : u)); });
        for (const idx of [0, 1, 2, 9]) same(S, s => TE.setFilterSize(s, i, idx), s => { const t = techOf(s), us = filterUnits(t), kind = optionDef('filter', us[i]?.kind ?? '')?.kind, mm = kind ? filterModelsOld(kind)[Math.round(idx)] : undefined; return mm ? withUnits(t, 'filter', us.map((u, k) => k === i ? { kind: u.kind, model: mm.id, ...(u.kit ? { kit: true } : {}), ...ownKeep(u) } : u)) : t; });
        same(S, s => TE.tuneFilter(s, i), s => {
          const t = techOf(s), us = filterUnits(t), p = FILTER_PRODUCTS.find(x => x.id === us[i]?.product);
          if (!p) return t;
          const near = filterModelsOld(p.kind as FilterKind).sort((a, b) => Math.abs(Math.log(a.gph / (p.gph ?? a.gph))) - Math.abs(Math.log(b.gph / (p.gph ?? b.gph))))[0];
          return withUnits(t, 'filter', us.map((x, k) => k === i ? { kind: x.kind, ...(near ? { model: near.id } : {}), ...(x.kit ? { kit: true } : {}), ...ownKeep(x) } : x));
        });
      }
    });
  }
  it('behaves: a sump is added once with its size, a product tunes to a generic size', () => {
    const S = planted(), t = TE.addSump(S);
    expect(filterUnits(t).some(u => u.kind === 'sump')).toBe(true); expect(t.sump).toBeTruthy();
    expect(filterUnits(TE.removeSump({ ...S, tech: t })).some(u => u.kind === 'sump')).toBe(false);
    const L = loaded(), tf = TE.tuneFilter(L, 0);
    expect(filterUnits(tf)[0].product).toBeUndefined(); expect(filterUnits(tf)[0].model).toBeTruthy();
    expect(TE.filterModels('hob').map(m => m.gph)).toEqual([...TE.filterModels('hob').map(m => m.gph)].sort((a, b) => a - b));
  });
});

describe('presets, rows, pumps, products, temperatures, feed', () => {
  const S = planted();
  it('preset and row option', () => {
    same(S, s => TE.pickPreset(s, 'midplanted'), s => applyPreset(s, 'midplanted'));
    same(S, s => TE.pickRowOption(s, 'co2', 'pressurized'), s => withChoice(s, 'co2', 'pressurized'));
    same(S, s => TE.pickRowOption(s, 'heater', 'none'), s => withChoice(s, 'heater', 'none'));
  });
  it('pump and row product, empty clears', () => {
    const old = (gear: string, id: string) => (s: TankSetup) => { const t = { ...techOf(s) }, pumps = { ...t.pumps }; if (id) pumps[gear] = id; else delete pumps[gear]; if (Object.keys(pumps).length) t.pumps = pumps; else delete t.pumps; return t; };
    const oldP = (row: string, id: string) => (s: TankSetup) => { const t = { ...techOf(s) }, products = { ...t.products }; if (id) products[row] = id; else delete products[row]; if (Object.keys(products).length) t.products = products; else delete t.products; return t; };
    for (const id of ['abc', '']) { same(S, s => TE.setPump(s, 'airpump', id), old('airpump', id)); same(S, s => TE.setRowProduct(s, 'skimmer', id), oldP('skimmer', id)); }
    const withP = { ...S, tech: TE.setPump(S, 'airpump', 'abc') };
    expect(TE.setPump(withP, 'airpump', '').pumps).toBeUndefined();
  });
  it('temperatures, both unit systems', () => {
    const clamp = (c: number) => Math.min(40, Math.max(0, c));
    for (const us of [true, false]) for (const raw of ['72', '24', '-50', '200', '']) {
      for (const key of ['targetC', 'measuredC'] as const)
        same(S, s => TE.setWaterTemp(s, key, raw, us, U.fToC), s => { const t = { ...techOf(s) }; if (raw === '') delete t[key]; else t[key] = clamp(us ? U.fToC(+raw) : +raw); return t; });
      if (raw !== '') same(S, s => TE.setRoomTemp(s, +raw, us, U.fToC), s => ({ ...techOf(s), roomC: clamp(us ? U.fToC(+raw) : +raw) }));
    }
  });
  it('feed sync and withTech', () => {
    const a = structuredClone(S), b = structuredClone(S); a.grow.feed = 'co2'; b.grow.feed = 'co2';
    a.tech = keepSet(a, setFeed(techOf(a), a.grow.feed, !!a.water.salt)); TE.syncFeed(b);
    expect(JSON.parse(JSON.stringify(b.tech))).toEqual(JSON.parse(JSON.stringify(a.tech)));
    const t = techOf(S), x = { ...S, tech: t };
    expect(TE.withTech(S, t)).toEqual({ ...x, grow: { ...S.grow, feed: feedFor(x) } });
  });
  it('light', () => {
    const a = structuredClone(S), b = structuredClone(S), id = 'no-such-light';
    TE.setLightWatts(a, 5000); expect(a.light.watts).toBe(1000); TE.setLightWatts(a, 0.2); expect(a.light.watts).toBe(1);
    TE.setLightWatts(a, 33.6); expect(a.light.watts).toBe(34);
    a.light.product = 'x' as never; TE.tuneLight(a); expect(a.light.product).toBeUndefined();
    const prod = lightProduct(id); if (!prod) { TE.pickLightProduct(b, id); const c = structuredClone(S); applyLightProduct(c.light, c.tank, lightProduct(id)); expect(b.light).toEqual(c.light); }
  });
});

describe('units table (each copy kept its rounding)', () => {
  it('length', () => {
    expect(U.unitMM('in')).toBe(25.4); expect(U.unitMM('cm')).toBe(10);
    expect(U.toUnit(300, 'in')).toBe(11.81); expect(U.toUnit(300, 'cm')).toBe(30); expect(U.fromUnit(12, 'in')).toBeCloseTo(304.8, 9); expect(U.fromUnit(30, 'cm')).toBe(300);
    expect(U.fmtLen(304.8, 'in')).toBe('12.0″'); expect(U.fmtLen(304.8, 'cm')).toBe('30.5 cm'); expect(U.fmtLen(304.8, 'in', 2)).toBe('12.00″');
    expect(U.toUnits(300, 'in')).toBe(11.8); expect(U.toUnits(305, 'cm')).toBe(31); expect(U.toUnits(304, 'cm')).toBe(30);
    expect(U.toUnitsTenth(305, 'cm')).toBe(30.5); expect(U.toUnitsTenth(300, 'in')).toBe(11.8);
    expect(U.fromUnits(12, 'in')).toBe(305); expect(U.fromUnits(30.5, 'cm')).toBe(305); expect(U.fromUnits(U.toUnits(500, 'in'), 'in')).toBe(500);
    expect(U.fmtLenShort(304.8, 'in')).toBe('12"'); expect(U.fmtLenShort(304.8, 'cm')).toBe('30 cm');
    expect(U.mmToIn(609.6)).toBe(24); expect(U.inToMm(24)).toBe(610);
    expect(U.fmtHeight(1778, 'in')).toBe('5′10″'); expect(U.fmtHeight(1778, 'cm')).toBe('1.78 m');
  });
  it('temperature', () => {
    expect(U.cToF(25)).toBe(77); expect(U.cToF(23.5)).toBe(74); expect(U.cToFHalf(23.5)).toBe(74.5); expect(U.cToFHalf(25)).toBe(77);
    expect(U.fToC(77)).toBe(25); expect(U.fToC(75)).toBe(24); expect(U.fToC(74)).toBe(23.5);
    expect(U.deltaCToF(5)).toBe(9); expect(U.deltaCToF(3)).toBe(5);
    expect(U.fmtTemp(25, true)).toBe('77 °F'); expect(U.fmtTemp(25.3, false)).toBe('25.3 °C'); expect(U.fmtTemp(25)).toBe('25 °C');
    expect(U.fmtTempHalf(25.3, 'in')).toBe('78 °F'); expect(U.fmtTempHalf(25.3, 'cm')).toBe('25.5 °C');
  });
  it('volume and area', () => {
    expect(U.fmtVol(75.7, 'in')).toBe('20 gal'); expect(U.fmtVol(75.7, 'cm')).toBe('76 L');
    expect(U.fmtArea(645.16, 'in')).toBe('100 sq in'); expect(U.fmtArea(645.16, 'cm')).toBe('645 cm²');
  });
  it('the old homes re-export the same functions', async () => {
    const physics = await import('../src/scene/physics'), stock = await import('../src/ui/stockSummary'), hab = await import('../src/ui/logic/habitat');
    expect(physics.fmtLen).toBe(U.fmtLen); expect(physics.toUnit).toBe(U.toUnit); expect(physics.fromUnit).toBe(U.fromUnit); expect(physics.unitMM).toBe(U.unitMM); expect(physics.IN).toBe(U.IN);
    expect(stock.toUnits).toBe(U.toUnits); expect(hab.fromUnits).toBe(U.fromUnits); expect(hab.fmtLen(304.8, 'in')).toBe(U.fmtLenShort(304.8, 'in'));
    expect(stock.fmtOf('in')).toMatchObject({}); expect(stock.fmtOf('in').vol(75.7)).toBe('20 gal'); expect(stock.fmtOf('cm').area(100)).toBe('100 cm²');
  });
});
