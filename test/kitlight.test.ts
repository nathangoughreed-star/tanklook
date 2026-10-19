import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { lightOutCached, wattsOf } from '../src/scene/lightout';
import {
  applyKitLight, applyKitToStore, confidenceText, kitCapability, lightConfidence, overridePar, setUpgradePriceHook, upgradePath, type KitLike,
} from '../src/scene/kitlight';
import type { Tank, TankSetup } from '../src/scene/types';

const tank = (L: number, H: number, D: number, extra: Partial<Tank> = {}): Tank => ({ L: L * IN, H: H * IN, D: D * IN, ...extra });
const setupOn = (t: Tank, salt = false): TankSetup => { const s = defaultSetup(); return { ...s, tank: t, items: [], water: { ...s.water, salt } }; };

// Four hand-written stubs (lane KB's real kits replace them when they land): numbers are typical listings, not catalog data.
const STRIP: KitLike = { lid: 'glass', light: { type: 'led', tech: 'led-white', count: 1, watts: 4, spec: 'listing' } };            // 10 gal starter strip
const T5: KitLike = { lid: 'hood', light: { type: 'tube', tech: 't5-refl', count: 2, watts: 0, spec: 'listing' } };                 // 29 gal two-tube T5
const PLANTED: KitLike = { lid: 'open', light: { type: 'led', tech: 'led-planted', count: 1, watts: 36, par: 70, spec: 'published' } }; // 20 long planted
const REEF: KitLike = { lid: 'open', water: 'salt', light: { type: 'led', tech: 'led-reef', count: 1, watts: 90, spec: 'listing' } };    // bowfront reef
const G10 = tank(20, 12, 10), G29 = tank(30, 18, 12), G20L = tank(30, 12, 12), BOW = tank(36, 20, 20, { shape: 'bow', bowMin: 14 * IN });

describe('kit light wiring', () => {
  it('applyKitLight writes the kit into the light and lid, and leaves the input alone', () => {
    const s = setupOn(G10), before = JSON.stringify(s), n = applyKitLight(s, STRIP);
    expect(JSON.stringify(s)).toBe(before);
    expect(n.light).toMatchObject({ type: 'led', tech: 'led-white', count: 1, watts: 4 });
    expect(n.light.par).toBeUndefined();
    expect(n.lid).toBe('glass');
    expect(wattsOf(n)).toBe(4);
  });
  it('round-trips: a published PAR scales the estimate to it, clearing it brings the estimate back', () => {
    const s = applyKitLight(setupOn(G20L), PLANTED);
    expect(s.light.par).toBe(70);
    expect(lightOutCached(s)!.mean).toBeCloseTo(70, 6);
    const free = overridePar(s, null), est = lightOutCached(free)!.mean;
    expect(free.light.par).toBeUndefined();
    expect(est).not.toBeCloseTo(70, 0);
    expect(lightOutCached(overridePar(free, 55))!.mean).toBeCloseTo(55, 6);
    expect(lightOutCached(overridePar(overridePar(free, 55), 0))!.mean).toBeCloseTo(est, 6);
    // a second kit without a PAR drops the first kit's override
    expect(applyKitLight(s, STRIP).light.par).toBeUndefined();
  });
  it('tubes take their power from the tank width, not the kit; the hood is kept', () => {
    const n = applyKitLight(setupOn(G29), T5);
    expect(n.lid).toBe('hood');
    expect(wattsOf(n)).toBeGreaterThan(40);
  });
  it('the store hook is one edit of the active setup', () => {
    const s = setupOn(G10); let edits = 0;
    applyKitToStore({ edit(fn) { edits++; fn(s); } }, STRIP);
    expect(edits).toBe(1);
    expect(s.light.tech).toBe('led-white'); expect(s.lid).toBe('glass');
  });
});

describe('light confidence', () => {
  it('published / estimated / rough, with the tech band', () => {
    expect(lightConfidence(PLANTED.light)).toEqual({ level: 'published', plusMinus: 0.15 });
    expect(lightConfidence(STRIP.light)).toEqual({ level: 'estimated', plusMinus: 0.3 });
    expect(lightConfidence(T5.light)).toEqual({ level: 'rough', plusMinus: 0.8 }); // no wattage on the listing: tier default
    expect(lightConfidence({ ...STRIP.light, spec: 'guess' })).toEqual({ level: 'rough', plusMinus: 0.6 });
    expect(lightConfidence({ ...T5.light, watts: 108 })).toEqual({ level: 'estimated', plusMinus: 0.5 });
    expect(lightConfidence({ ...PLANTED.light, par: undefined })).toMatchObject({ level: 'estimated' }); // 'published' with no number is not
  });
  it('says it plainly', () => expect(confidenceText(lightConfidence(STRIP.light))).toBe('estimated, about ±30 %'));
});

describe('kit capability', () => {
  it('a 4 W strip on a 10 gal is a low-light, low-tech tank: no carpets, no red stems', () => {
    const c = kitCapability(applyKitLight(setupOn(G10), STRIP));
    expect(['none', 'low']).toContain(c.level);
    expect(c.care).toBe('low');
    expect(c.plants.low).toEqual(expect.arrayContaining(['anubias', 'fern']));
    expect(c.sentence).toMatch(/^(Very low|Low) light \(about \d+ PAR\): /);
    expect(c.sentence).toMatch(/Anubias|anubias/); expect(c.sentence).toMatch(/no carpets/); expect(c.sentence).toMatch(/no red stems/);
  });
  it('a published 70 PAR planted LED on a 20 long reaches high and widens the list with CO2', () => {
    const c = kitCapability(applyKitLight(setupOn(G20L), PLANTED));
    expect(c.level).toBe('high');
    expect(c.par).toBeCloseTo(70, 6);
    expect(c.sentence).not.toMatch(/very bright/);
    expect(c.plants.co2.length).toBeGreaterThan(0);
    expect(c.plants.co2).toContain('stemred');
    expect(c.care).toBe('co2');
    expect(c.sentence).not.toMatch(/no carpets/);
  });
  it('far too much light says so', () => {
    const c = kitCapability(applyKitLight(setupOn(G10), { ...STRIP, light: { ...STRIP.light, watts: 30 } }));
    expect(c.par).toBeGreaterThan(80); expect(c.sentence).toMatch(/very bright/);
  });
  it('more light never shrinks what fits', () => {
    const lo = kitCapability(applyKitLight(setupOn(G29), { ...STRIP, light: { ...STRIP.light, watts: 10 } }));
    const hi = kitCapability(applyKitLight(setupOn(G29), { ...STRIP, light: { ...STRIP.light, watts: 30 } }));
    expect(hi.par).toBeGreaterThan(lo.par);
    expect(lo.plants.co2).not.toContain('stemred'); expect(hi.plants.co2).toContain('stemred'); // the demanding plants arrive with the light
    expect(['none', 'low', 'medium', 'high'].indexOf(hi.level)).toBeGreaterThanOrEqual(['none', 'low', 'medium', 'high'].indexOf(lo.level));
  });
  it('a reef LED on a bowfront gives a reef sentence with corals', () => {
    const c = kitCapability(applyKitLight(setupOn(BOW, true), REEF));
    expect(c.salt).toBe(true);
    expect(c.sentence).toMatch(/(Fish only|Soft corals|LPS|SPS) \(about \d+ PAR\)/);
    expect(c.plants.low.concat(c.plants.ferts, c.plants.co2).every(v => ['mushroom', 'zoanthid', 'leather', 'macroalgae', 'seafan', 'hammer', 'torch', 'anemone', 'montipora', 'montiplate', 'acropora', 'acrofine'].includes(v))).toBe(true);
  });
  it('the aquascape does not move the number: it is the kit', () => {
    const s = applyKitLight(setupOn(G20L), PLANTED);
    const withScape = { ...s, items: defaultSetup().items };
    expect(kitCapability(withScape).par).toBeCloseTo(kitCapability(s).par, 6);
  });
});

describe('upgrade path', () => {
  it('a planted kit toward medium works as is (ferts listed as an add-on, no light swap)', () => {
    const p = upgradePath(PLANTED, G20L, 'medium');
    expect(p.verdict).toBe('works as is');
    expect(p.steps.map(s => s.category)).toEqual(['ferts']);
  });
  it('a low strip toward low works as is with nothing to buy', () => {
    const p = upgradePath({ ...STRIP, light: { ...STRIP.light, watts: 12 } }, G10, 'low');
    expect(p.verdict).toBe('works as is'); expect(p.steps).toEqual([]);
  });
  it('a modest light toward high light is a swap, with CO2 and ferts alongside', () => {
    const p = upgradePath({ ...STRIP, light: { ...STRIP.light, watts: 10 } }, G29, 'high');
    expect(p.verdict).toBe('swap the light');
    expect(p.current).toBe('low');
    expect(p.steps.map(s => s.category)).toEqual(['light', 'ferts', 'co2']);
    expect(p.neededWatts).toBeGreaterThan(10);
  });
  it('a starter strip on a 10 gal toward high light is still just a swap (a small tank needs little)', () => {
    const p = upgradePath(STRIP, G10, 'high');
    expect(p.verdict).toBe('swap the light'); expect(p.neededWatts).toBeLessThan(25);
  });
  it('a hood kit that needs a stronger light also lists the lid', () => {
    const p = upgradePath({ ...T5, light: { ...T5.light, count: 1 } }, tank(48, 20, 20), 'high');
    expect(p.verdict).not.toBe('works as is');
    expect(p.steps.map(s => s.category)).toContain('lid');
  });
  it('a fish-only white LED on a big reef bowfront toward SPS is effectively a new build, with dosing', () => {
    const fishOnly: KitLike = { lid: 'glass', water: 'salt', light: { type: 'led', tech: 'led-white', count: 1, watts: 15, spec: 'guess' } };
    const p = upgradePath(fishOnly, BOW, 'high');
    expect(p.verdict).toBe('effectively a new build');
    expect(p.steps.map(s => s.category)).toEqual(expect.arrayContaining(['light', 'dosing']));
    expect(p.steps.map(s => s.category)).not.toContain('co2');
  });
  it('a reef LED that already gives LPS light works as is toward medium', () => {
    expect(upgradePath(REEF, BOW, 'medium').verdict).toBe('works as is');
  });
  it('the price hook is called per step and defaults to none', () => {
    expect(upgradePath(STRIP, G10, 'high').steps.every(s => s.priceUsd === null)).toBe(true);
    setUpgradePriceHook(() => ({ lo: 10, mode: 20, hi: 40 }));
    try { expect(upgradePath(STRIP, G10, 'high').steps.every(s => s.priceUsd?.mode === 20)).toBe(true); }
    finally { setUpgradePriceHook(null); }
  });
});
