// Land + water picks in path 1 become a paludarium (lane S241, Nathan 2026-10-26): the land is sized first at the herpstock minimum, the
// water animals get the pool that is left; extra wide shallow candidates; the land side's gear joins the water gear.
import { describe, expect, it } from 'vitest';
import { allLand, fitIn, isMixed, landNeed, stepUps, tankFor, tankOptions, type AnimalCount } from '../src/scene/tankfit';
import { buildsFor } from '../src/scene/builds';
import { getTankModel } from '../src/data/tanks';
import { hasLand, rowsFor, techOf } from '../src/scene/tech';
import { stockingOf } from '../src/scene/stocking';

const pick: AnimalCount[] = [{ species: 'dartfrog', n: 2 }, { species: 'chili', n: 10 }];
const IMAG = 'n_imagitarium_shallow_28';

describe('mixed picks', () => {
  it('only a land pick plus a non-land pick is a paludarium', () => {
    expect(isMixed(pick)).toBe(true);
    expect(isMixed([{ species: 'dartfrog', n: 2 }])).toBe(false);
    expect(isMixed([{ species: 'chili', n: 10 }])).toBe(false);
    expect(allLand(pick)).toBe(false);
    expect(isMixed([{ species: 'chili', n: 10 }, { species: 'firetoad', n: 2 }])).toBe(false); // semi-aquatic with fish: the water path, as before
  });
  it('the land is sized first: 2 dart frogs need 2.5 sq ft and 12 in', () => {
    expect(landNeed(pick)).toEqual({ floorSqFt: 2.5, hMin: 12 });
  });
  it('the Imagitarium Frameless Shallow 28 holds 2 dart frogs and 10 chili rasboras (land about 79 %, pool about 71 %)', () => {
    const f = fitIn(pick, IMAG)!;
    expect(f.fails).toEqual([]);
    expect(f.landPct).toBeGreaterThan(75); expect(f.landPct).toBeLessThan(83);
    expect(f.spacePct).toBeGreaterThan(60); expect(f.spacePct).toBeLessThan(80);
  });
  it('a tank too small for the land or the pool fails on floor / space', () => {
    expect(fitIn(pick, getTankModel('20gal')?.id ?? '')?.fails ?? ['floor']).not.toEqual([]);
    expect(tankOptions(pick).every(o => o.landPct !== undefined)).toBe(true);
    expect(tankFor(pick)!.fails).toEqual([]);
  });
  it('no step-ups are offered (the sizes are the list)', () => { expect(stepUps(pick, IMAG)).toEqual([]); });
});

describe('paludarium builds', () => {
  const m = getTankModel(IMAG)!;
  it('each build carries the water gear and the land side\'s heat / misting rows, priced', () => {
    const bs = buildsFor(pick, m);
    expect(bs.length).toBe(3);
    for (const b of bs) {
      expect(b.setup.water.on).toBe(true);
      expect(b.setup.layout.id).toBe('paludarium');
      expect(hasLand(b.setup)).toBe(true);
      expect(rowsFor(b.setup).some(r => r.id === 'mist')).toBe(true);
      expect(techOf(b.setup).rows.gauge).toBe('yes');
      expect(b.setupUsd).toBeGreaterThan(0);
      expect(b.gear.some(g => g.startsWith('Land side:'))).toBe(true);
      expect(b.spacePct).toBeLessThanOrEqual(100);
    }
    expect(bs[0].setupUsd).toBeLessThanOrEqual(bs[2].setupUsd);
  });
  it('the pool level is the share of floor the land leaves, at half height', () => {
    const S = buildsFor(pick, m)[0].setup;
    expect(S.water.level).toBeGreaterThan(0.09); expect(S.water.level).toBeLessThan(0.13);
    expect(stockingOf(S).spacePercent).toBeLessThanOrEqual(100);
  });
});
