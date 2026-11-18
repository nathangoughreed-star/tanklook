// Lane TK2 (2026-11-17): the hood product picker in the shell's Lid group, and the Tank tab's summary card listing everything chosen.
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { hoodView, chooseHood, lidDetail, hoodStore } from '../src/shell/logic/tank';
import { tankLines } from '../src/shell/logic/workspace';
import { hoodOf, hoodsFor } from '../src/data/hoods';
import type { TankSetup } from '../src/scene/types';

const IN = 25.4;
const with24 = (): TankSetup => { const S = defaultSetup(); S.tank = { L: 24 * IN, D: 12 * IN, H: 16 * IN }; return S; };

describe('TK2: hood products in the Lid group', () => {
  it('lists the products sold for a 24 x 12 tank, cheapest first, with price, store and fits', () => {
    const v = hoodView(with24());
    expect(v.none).toBe(false);
    expect(v.tiles.length).toBe(hoodsFor(with24().tank).length);
    expect(v.tiles.length).toBeGreaterThan(1);
    const prices = hoodsFor(with24().tank).map(h => h.priceUsd);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(v.tiles[0].price).toMatch(/^\$\d/); expect(v.tiles[0].store).toBeTruthy(); expect(v.tiles[0].fits).toMatch(/gal/);
    expect(v.tiles.some(t => t.on)).toBe(false); // lid is not a hood yet
  });
  it('a custom size with no product says so', () => {
    const S = defaultSetup(); S.tank = { L: 47 * IN, D: 17 * IN, H: 20 * IN };
    expect(hoodView(S)).toEqual({ tiles: [], none: true });
  });
  it('choosing a tile makes the lid a hood, records the product and marks that tile on', () => {
    const S = with24(), pick = hoodsFor(S.tank).at(-1)!;
    chooseHood(S, pick.id);
    expect(S.lid).toBe('hood'); expect(S.hoodProduct).toBe(pick.id); expect(hoodOf(S)!.id).toBe(pick.id);
    expect(hoodView(S).tiles.filter(t => t.on).map(t => t.id)).toEqual([pick.id]);
    expect(S.light.watts).toBe(pick.light.watts); // the hood's own light is the scene's light
  });
  it('store names come from the listing address', () => {
    expect(hoodStore({ url: 'https://www.petsmart.com/x' })).toBe('PetSmart');
    expect(hoodStore({ url: 'https://www.petco.com/x' })).toBe('Petco');
  });
});

describe('TK2: the Tank tab summary card', () => {
  it('a custom tank: Tank first as Custom, then dimensions, volume, water, lid; empty rows hidden', () => {
    const S = defaultSetup(); S.tank = { L: 36 * IN, D: 18 * IN, H: 16 * IN }; S.render.bg = 'none'; S.backdrop = { ...S.backdrop, kind: 'none' };
    const k = tankLines(S).map(l => l[0]);
    expect(k[0]).toBe('Tank'); expect(tankLines(S)[0][1]).toMatch(/^Custom/);
    expect(tankLines(S).find(l => l[0] === 'Dimensions')![1]).toBe('36 × 18 × 16 in');
    expect(k.indexOf('Dimensions')).toBeLessThan(k.indexOf('Volume')); expect(k.indexOf('Volume')).toBeLessThan(k.indexOf('Water'));
    expect(k).not.toContain('Background'); expect(k[k.length - 1]).toBe('Lid and top');
  });
  it('a background and a hood product appear, in the fixed order', () => {
    const S = with24(); S.render.bg = 'black'; if (!S.render.bgSides.length) S.render.bgSides = ['back'];
    const h = hoodsFor(S.tank)[0]; chooseHood(S, h.id);
    const L = tankLines(S), k = L.map(l => l[0]);
    expect(k.indexOf('Background')).toBeGreaterThan(k.indexOf('Water')); expect(k.indexOf('Lid and top')).toBe(k.length - 1);
    const lid = L.find(l => l[0] === 'Lid and top')![1];
    expect(lid).toContain(h.brand); expect(lid).toContain('$'); expect(lidDetail(S)).toBe(lid);
  });
});

import { STAND_PRODUCTS, standsFor } from '../src/data/stands';
import { setStandProduct } from '../src/scene/placement';
import { keepStandHolding, applyTankEdit } from '../src/scene/tankEdit';
describe('TK2: a picked stand when the tank changes', () => {
  const rated = STAND_PRODUCTS.find(p => !p.hidden && p.ratedGal && p.fits.length)!;
  const mk = (): TankSetup => { const S = defaultSetup(), [l, d] = rated.fits[0]; S.tank = { L: l * IN, D: d * IN, H: 16 * IN }; setStandProduct(S, rated); return S; };
  it('is kept while it fits and holds the tank', () => {
    const S = mk(); S.tank.H = Math.min(S.tank.H, 12 * IN);
    if (standsFor(S.tank).some(p => p.id === rated.id)) { keepStandHolding(S); expect(S.stand.product).toBe(rated.id); }
  });
  it('falls back to Generic with a one-line note when the footprint no longer fits', () => {
    const S = mk(); applyTankEdit(S, T => ({ ...T, L: T.L + 20 * IN }), { thin: true });
    expect(S.stand.product).toBeUndefined();
    expect(keepStandHolding(S)).toBe('');
  });
  it('falls back when the tank holds more than the stand is rated for', () => {
    const S = mk(); S.tank = { ...S.tank, H: S.tank.H * 3 }; // same footprint, far more water
    const note = keepStandHolding(S);
    expect(note).toMatch(/^Stand changed to Generic: .*rated/); expect(S.stand.product).toBeUndefined();
  });
});
