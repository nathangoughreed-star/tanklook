import { describe, expect, it } from 'vitest';
import { GENERIC, applyOwned, emptyOwned, ownedMissing, ownedReady } from '../src/ui/ownedGear';
import { emptyScene } from '../src/scene/defaults';
import { filterUnits, heaterUnits, techOf, unitCosts } from '../src/scene/tech';
import { ownedGearLines } from '../src/scene/ownedGear';
import { buildSheet } from '../src/scene/setupsheet';
import { HEATER_PRODUCTS } from '../src/data/gearCatalog';

describe('owned gear sheet', () => {
  it('stays unfinished until every ticked item is answered', () => {
    const s = emptyOwned();
    expect(ownedReady(s)).toBe(false); // nothing ticked
    s.on.add('tank'); s.on.add('heater'); s.on.add('filter');
    expect(ownedMissing(s)).toEqual(['tank', 'heater', 'filter']);
    s.tank = 'x'; s.heater = GENERIC; s.filterKind = 'hob';
    expect(ownedMissing(s)).toEqual(['filter']); // a kind is not yet a product or generic
    s.filter = GENERIC;
    expect(ownedReady(s)).toBe(true);
  });
  it('applies a product, a generic one, and clears what is unticked', () => {
    const S = emptyScene().tanks[0], h = HEATER_PRODUCTS[0];
    const s = emptyOwned(); s.on.add('heater'); s.on.add('filter'); s.heater = h.id; s.filterKind = 'canister'; s.filter = GENERIC;
    applyOwned(S, s);
    expect(heaterUnits(techOf(S))).toEqual([{ product: h.id, owned: true }]);
    expect(filterUnits(techOf(S))).toEqual([{ kind: 'canister', owned: true }]);
    s.on.delete('heater'); applyOwned(S, s);
    expect(heaterUnits(techOf(S))).toEqual([]);
  });
  it('saves every ticked and answered item as owned ($0 you have), generic or exact, and never records a paid price', () => {
    const S = emptyScene().tanks[0];
    const s = emptyOwned(); s.on.add('light'); s.on.add('heater'); s.on.add('filter');
    s.light = GENERIC; s.heater = GENERIC; s.filterKind = 'hob'; s.filter = GENERIC;
    applyOwned(S, s);
    expect(S.light.owned).toBe(true);
    expect(heaterUnits(techOf(S)).every(u => u.owned && u.paidUsd === undefined)).toBe(true);
    expect(filterUnits(techOf(S)).every(u => u.owned && u.paidUsd === undefined)).toBe(true);
    expect(S.light.paidUsd).toBeUndefined();
    expect(unitCosts(S, 'heater')[0].setup.mode).toBe(0);
    expect(unitCosts(S, 'filter')[0].setup.mode).toBe(0);
    const labels = ownedGearLines(S).map(l => [l.label.split(':')[0], l.usd]);
    expect(labels).toEqual(expect.arrayContaining([['Light', 0], ['Heater', 0], ['Filter', 0]]));
    expect(buildSheet({ ...emptyScene(), tanks: [S], active: 0 }).sections.find(x => x.title === 'Already have')?.rows.length).toBeGreaterThanOrEqual(3);
    // exact products are owned too
    s.heater = HEATER_PRODUCTS[0].id; applyOwned(S, s);
    expect(heaterUnits(techOf(S))[0]).toEqual({ product: HEATER_PRODUCTS[0].id, owned: true });
  });
  it('unticked items are not owned and a light untick clears the flag', () => {
    const S = emptyScene().tanks[0];
    const s = emptyOwned(); s.on.add('light'); s.light = GENERIC; applyOwned(S, s);
    expect(S.light.owned).toBe(true);
    s.on.delete('light'); s.on.add('heater'); s.heater = GENERIC; applyOwned(S, s);
    expect(S.light.owned).toBeUndefined();
    expect(filterUnits(techOf(S))).toEqual([]);
    expect(ownedGearLines(S).map(l => l.label.split(':')[0])).toEqual(['Heater']);
    // ticked but not yet answered: not owned yet
    s.on.add('light'); s.light = undefined; applyOwned(S, s);
    expect(S.light.owned).toBeUndefined();
  });
});
