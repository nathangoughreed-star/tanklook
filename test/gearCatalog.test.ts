// Lane TG: real heaters by brand (data/gear-catalog.json) and the generic heater sized to the tank.
import { describe, expect, it } from 'vitest';
import { HEATER_PRODUCTS, LIGHT_PRODUCTS, genericHeaterW, heaterProduct, heatersNear, lightProduct, lightsFor } from '../src/data/gearCatalog';
import { applyLightProduct, lightProductNote } from '../src/scene/lightproduct';
import { emitters, lightOutCached } from '../src/scene/lightout';
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

describe('light catalogue', () => {
  it('every light has a size, a rating and an https source', () => {
    expect(LIGHT_PRODUCTS.length).toBe(35);
    for (const p of LIGHT_PRODUCTS) {
      expect(p.lengthMm, p.id).toBeGreaterThan(40); expect(p.widthMm, p.id).toBeGreaterThan(10); expect(p.heightMm, p.id).toBeGreaterThan(5);
      expect(p.watts, p.id).toBeGreaterThan(0); expect(p.url, p.id).toMatch(/^https:\/\//); expect(p.popularity?.url, p.id).toMatch(/^https:\/\//);
      expect(p.fitMaxMm, p.id).toBeGreaterThanOrEqual(p.fitMinMm);
      expect(['bar', 'rim-legs', 'gooseneck', 'submersible', 'hanging']).toContain(p.mount);
      expect(p.colors.body, p.id).toMatch(/^#[0-9a-f]{6}$/i); expect(p.colors.leds.rows, p.id).toBeGreaterThan(0);
    }
    // the five shapes are all there, the bar the most common
    expect(LIGHT_PRODUCTS.filter(p => p.mount === 'bar').length).toBe(16);
    expect(new Set(LIGHT_PRODUCTS.map(p => p.mount)).size).toBe(5);
  });
  it('the picker offers the lights that fit the tank length, most popular first', () => {
    const t20 = lightsFor(610); // a 24 in tank
    expect(t20.map(p => p.id)).toContain('aquaneat-18-24');
    expect(t20.every(p => 610 >= p.fitMinMm && 610 <= p.fitMaxMm)).toBe(true);
    expect(t20[0].id).toBe('aquaneat-18-24'); // Amazon #1
    expect(lightsFor(610).map(p => p.id)).not.toContain('hygger-978-48-54');
    expect(lightsFor(1250).map(p => p.id)).toContain('hygger-978-48-54');
    expect(lightsFor(300).map(p => p.id)).toContain('datoo-mini-clip-7w');
    expect(lightsFor(5000)).toEqual([]);
  });
  it('a picked light sets the fixture and watts; no PAR published, so the model estimates it from the watts', () => {
    const sc = parseScene(JSON.parse(SCENES.planted)).scene, S = sc.tanks[sc.active], p = lightProduct('aquaneat-18-24')!;
    const l = { ...S.light }; applyLightProduct(l, S.tank, p);
    expect(l).toMatchObject({ product: 'aquaneat-18-24', type: 'led', watts: 12, tech: 'led-planted' });
    expect(l.par).toBeUndefined();
    const o = lightOutCached({ ...S, lid: 'open', light: l })!;
    expect(o.scale).toBe(1); expect(o.mean).toBeGreaterThan(0);
    expect(lightProductNote(p)).toMatch(/PAR not published: estimated from the 12 W/);
    expect(lightProductNote(lightProduct('hygger-978-48-54')!)).toMatch(/estimated: not published/);
    // the emitters run along the product's own body, not the tank's whole length
    const xs = emitters(S.tank, l).map(e => e[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(p.lengthMm);
    // the gooseneck nano is one LED puck
    const g = { ...S.light }; applyLightProduct(g, S.tank, lightProduct('datoo-mini-clip-7w'));
    expect(g).toMatchObject({ type: 'spot', count: 1, watts: 7 }); expect(emitters(S.tank, g).length).toBe(1);
    // generic again: the product goes, the rest stays
    applyLightProduct(l, S.tank, undefined); expect(l.product).toBeUndefined(); expect(l.watts).toBe(12);
  });
  it('a picked light is kept on reload, dropped when unknown or under a hood', () => {
    const sc = parseScene(JSON.parse(SCENES.planted)).scene, raw = JSON.parse(JSON.stringify(sc));
    const t = raw.tanks[raw.active]; t.light.product = 'pawfly-11w-12-18'; t.lid = 'open';
    expect(parseScene(raw).scene.tanks[raw.active].light.product).toBe('pawfly-11w-12-18');
    t.light.product = 'no-such'; expect(parseScene(raw).scene.tanks[raw.active].light.product).toBeUndefined();
    t.light.product = 'pawfly-11w-12-18'; t.lid = 'hood'; expect(parseScene(raw).scene.tanks[raw.active].light.product).toBeUndefined();
  });
});
