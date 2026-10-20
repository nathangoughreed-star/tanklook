// Lane TG: real heaters by brand (data/gear-catalog.json) and the generic heater sized to the tank.
import { describe, expect, it } from 'vitest';
import { HEATER_PRODUCTS, genericHeaterW, heaterProduct, heatersNear } from '../src/data/gearCatalog';
import { parseTech, heatLoss } from '../src/scene/tech';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { applyPreset } from '../src/scene/tech';
import { gearPicks } from '../src/render/gear3d';

describe('gear catalogue', () => {
  it('every heater has a size, a rating and a source', () => {
    for (const h of HEATER_PRODUCTS) { expect(h.lengthMm, h.id).toBeGreaterThan(40); /* mini heaters: the VCRAZE 10 W is 51 mm */ expect(h.diaMm).toBeGreaterThan(10); expect(h.watts).toBeGreaterThan(0); expect(h.url).toMatch(/^https:\/\//); }
    expect(heaterProduct('topfin-50')?.brand).toBe('Top Fin');
  });
  it('the generic heater is the smallest common size holding the need; nearby products list that size first', () => {
    expect(genericHeaterW(42)).toBe(50); expect(genericHeaterW(117)).toBe(150); expect(genericHeaterW(9999)).toBe(500);
    const near = heatersNear(42); expect(near.length).toBeGreaterThan(3); expect(near[0].watts).toBe(50);
  });
  it('a picked product is kept on reload, sizes the heat and is drawn', () => {
    expect(parseTech({ rows: { heater: 'one' }, heaterProduct: 'topfin-50' })?.heaterProduct).toBe('topfin-50');
    expect(parseTech({ rows: { heater: 'one' }, heaterProduct: 'no-such' })?.heaterProduct).toBeUndefined();
    const sc = parseScene(JSON.parse(SCENES.planted)).scene, S = sc.tanks[sc.active], t = { ...applyPreset(S, 'midplanted'), heaterProduct: 'aqueon-pro-150' };
    expect(heatLoss(S, t).heater.watts).toBeGreaterThanOrEqual(150);
    const pick = gearPicks({ ...S, tech: t }).find(p => p.row === 'heater')!;
    expect(pick.product).toBe('aqueon-pro-150'); expect(pick.watts).toBe(150);
    // without a product: the generic heater of the size the tank needs, not the price class
    const g = gearPicks({ ...S, tech: applyPreset(S, 'midplanted') }).find(p => p.row === 'heater')!;
    expect(g.watts).toBe(genericHeaterW(heatLoss(S).needW));
  });
});
