// Nathan 2026-11-28: the Top Fin 36 gal bowfront bundle read "standard 36 gal bowfront" over "Volume 40 gal". PetSmart's 22.6 in height
// includes the hood; the glass is drawn at the catalog 36 bowfront's 20.9 in. The summary names both numbers: what the glass holds and the size it is sold as.
import { describe, expect, it } from 'vitest';
import { DEALS } from '../src/data/deals';
import { sceneFromDeal } from '../src/demand/dealscene';
import { tankLines } from '../src/shell/logic/workspace';
import { volume } from '../src/scene/physics';
import { defaultSetup } from '../src/scene/defaults';

describe.each(['petsmart-topfin-ensemble-36', 'petsmart-top-fin-bow-front-36'])('36 gal bowfront bundle volume: %s', id => {
  const S = sceneFromDeal(DEALS.find(d => d.id === id)!)!.tanks[0];
  it('holds about 38 gal inside the glass, not 40+', () => {
    const g = volume(S.tank).gallons;
    expect(g).toBeGreaterThan(36); expect(g).toBeLessThan(39.5);
  });
  it('the summary says inside the glass and the size it is sold as', () => {
    expect(tankLines(S).find(l => l[0] === 'Volume')![1]).toMatch(/^3[78] gal inside the glass \(sold as 36 gal\)$/);
  });
  it('a custom tank has no "sold as"', () => {
    const C = defaultSetup(); C.tank = { L: 36 * 25.4, D: 18 * 25.4, H: 16 * 25.4 }; delete C.product;
    expect(tankLines(C).find(l => l[0] === 'Volume')![1]).toBe('45 gal inside the glass');
  });
});
