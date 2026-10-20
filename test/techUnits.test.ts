// Heaters and filters as lists of units (Nathan 2026-10-20): as many as the owner adds, each generic or a catalogued
// product; a bundle's own unit keeps the bundle price while units added on top are priced as their own row.
import { describe, expect, it } from 'vitest';
import { DEALS, dealAsKit } from '../src/data/deals';
import { sceneFromDeal } from '../src/demand/dealscene';
import { changedParts, partSig } from '../src/demand/dealdrift';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import { gearPicks } from '../src/render/gear3d';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { applyPreset, filterUnits, heatLoss, heaterUnits, optionCost, parseTech, stockCapacity, unitCosts, withUnits, withoutUnit } from '../src/scene/tech';

const P = defaultProfile();
const planted = () => { const sc = parseScene(JSON.parse(SCENES.planted)).scene; return sc.tanks[sc.active]; };

describe('heaters as units', () => {
  it('adds up watts and prices, and draws one heater each', () => {
    const S = planted(), t = withUnits(applyPreset(S, 'midplanted'), 'heater', [{ product: 'topfin-50' }, { w: 100 }]);
    const h = heatLoss(S, t);
    expect(t.rows.heater).toBe('two'); expect(h.n).toBe(2); expect(h.totalW).toBe(150);
    const all = optionCost(S, 'heater', 'two', { tech: t }), each = unitCosts(S, 'heater', { tech: t });
    expect(all.setup.mode).toBeCloseTo(each[0].setup.mode + each[1].setup.mode, 6);
    expect(each[0].kwhMo + each[1].kwhMo).toBeCloseTo(all.kwhMo, 6);
    const picks = gearPicks({ ...S, tech: t }).filter(p => p.row?.startsWith('heater'));
    expect(picks.map(p => [p.row, p.watts, p.product])).toEqual([['heater', 50, 'topfin-50'], ['heater.1', 100, undefined]]);
  });
  it('removing the last one leaves no heater; place keys move down', () => {
    const S = planted(), t0 = withUnits(applyPreset(S, 'midplanted'), 'heater', [{ w: 50 }, { w: 75 }]);
    const t1 = withoutUnit({ ...t0, place: { 'heater.1': { wall: 'left', at: 0.5 } } }, 'heater', 0);
    expect(heaterUnits(t1)).toEqual([{ w: 75 }]); expect(t1.place?.heater).toEqual({ wall: 'left', at: 0.5 }); expect(t1.place?.['heater.1']).toBeUndefined();
    const t2 = withoutUnit(t1, 'heater', 0);
    expect(t2.rows.heater).toBe('none'); expect(heatLoss(S, t2).n).toBe(0);
  });
  it('a list survives save and load', () => {
    const t = parseTech({ rows: { heater: 'one' }, heaters: [{ product: 'topfin-50', kit: true }, { w: 75 }, { product: 'no-such' }], filters: [{ kind: 'hob', product: 'topfin-silenstream-pf20' }, { kind: 'sponge' }, { kind: 'bogus' }] })!;
    expect(t.heaters).toEqual([{ product: 'topfin-50', kit: true }, { w: 75 }, {}]); expect(t.rows.heater).toBe('two');
    expect(t.filters).toEqual([{ kind: 'hob', product: 'topfin-silenstream-pf20' }, { kind: 'sponge' }]); expect(t.rows.filter).toBe('hob');
  });
});

describe('filters as units', () => {
  it('flows add up; the best one sets the stocking', () => {
    const S = planted(), base = applyPreset(S, 'midplanted');
    const one = withUnits(base, 'filter', [{ kind: 'sponge' }]), two = withUnits(base, 'filter', [{ kind: 'sponge' }, { kind: 'canister' }]);
    expect(two.rows.filter).toBe('canister');
    const a = optionCost(S, 'filter', 'sponge', { tech: one }), b = optionCost(S, 'filter', 'canister', { tech: two });
    expect(b.turnover!).toBeGreaterThan(a.turnover!); expect(b.setup.mode).toBeGreaterThan(a.setup.mode);
    expect(stockCapacity(S, two)).toBeGreaterThan(stockCapacity(S, one));
    expect(gearPicks({ ...S, tech: two }).filter(p => p.row?.startsWith('filter')).length).toBe(2);
  });
});

describe('a bundle and units added on top', () => {
  const deal = DEALS.find(d => d.includes.includes('heater') && d.includes.includes('filter') && sceneFromDeal(d)?.tanks[0].tech?.heaters?.length)!;
  it('marks the bundle\'s own heater and filter', () => {
    const S = sceneFromDeal(deal)!.tanks[0];
    expect(S.tech!.heaters![0].kit).toBe(true);
    expect(filterUnits(S.tech!)[0]?.kit).toBe(true);
  });
  it('the Top Fin Essentials 20 ships its own Silenstream PF20 (named on the PetSmart contents graphic), not a generic filter', () => {
    const S = sceneFromDeal(DEALS.find(d => d.id === 'petsmart-top-fin-essentials-20')!)!.tanks[0];
    expect(S.tech!.filters).toEqual([{ kind: 'hob', product: 'topfin-silenstream-pf20', kit: true }]);
  });
  it('the Top Fin LED Black Glass 10 ships a Silenstream PF10 (its gallery contents graphic), not an internal filter', () => {
    const S = sceneFromDeal(DEALS.find(d => d.id === 'petsmart-top-fin-led-black-glass-10')!)!.tanks[0];
    expect(S.tech!.filters).toEqual([{ kind: 'hob', product: 'topfin-silenstream-pf10', kit: true }]);
  });
  it('adding a heater keeps the bundle price and charges only the new one', () => {
    const S = sceneFromDeal(deal)!.tanks[0], kit = dealAsKit(deal), sig = partSig(S, deal.includes);
    const more = { ...S, tech: withUnits(S.tech!, 'heater', [...S.tech!.heaters!, { product: 'topfin-50' }]) };
    expect(changedParts(sig, more)).toEqual([]);
    const d0 = demandOf(S, P, { kit }), d1 = demandOf(more, P, { kit });
    const extra = d1.items.find(c => c.key === 'heater+');
    expect(extra?.setup?.mode).toBeGreaterThan(10);
    expect(d1.totals.setupUsd).toBeGreaterThan(d0.totals.setupUsd);
    // removing the bundle's own heater is a change to the bundle
    expect(changedParts(sig, { ...S, tech: withoutUnit(S.tech!, 'heater', 0) })).toContain('heater');
  });
});
