import { describe, expect, it } from 'vitest';
import { GENERIC, applyOwned, emptyOwned, ownedMissing, ownedReady } from '../src/ui/ownedGear';
import { emptyScene } from '../src/scene/defaults';
import { filterUnits, heaterUnits, techOf } from '../src/scene/tech';
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
    expect(heaterUnits(techOf(S))).toEqual([{ product: h.id }]);
    expect(filterUnits(techOf(S))).toEqual([{ kind: 'canister' }]);
    s.on.delete('heater'); applyOwned(S, s);
    expect(heaterUnits(techOf(S))).toEqual([]);
  });
});
