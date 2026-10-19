// Herp stocking check (Nathan 2026-10-19): floor area, height, group size, water and tankmate rules for reptiles and amphibians.
import { describe, expect, it } from 'vitest';
import { HERP, floorFor } from '../src/data/herpstock';
import { SPECIES } from '../src/data/species';
import { defaultScene } from '../src/scene/defaults';
import { herpCheck } from '../src/scene/herpcheck';
import type { Fish, TankSetup } from '../src/scene/types';

const IN = 25.4;
const setup = (L: number, D: number, H: number, species: string[], water = false, extra: (Partial<Fish> | undefined)[] = []): TankSetup => {
  const s = JSON.parse(JSON.stringify(defaultScene().tanks[0])) as TankSetup;
  Object.assign(s.tank, { L: L * IN, D: D * IN, H: H * IN, shape: undefined }); s.water.on = water;
  s.fish = species.map((sp, i) => ({ id: i + 1, species: sp, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0, ...extra[i] }) as Fish);
  return s;
};
const info = (s: TankSetup, who: string) => herpCheck(s).filter(i => i.who === who && i.level === 'info').map(i => i.text);
const lv = (s: TankSetup, who: string, l: 'warn' | 'note') => herpCheck(s).filter(i => i.who === who && i.level === l).map(i => i.text);

describe('herp stocking check', () => {
  it('has a rule for every roster herp (by scientific name)', () => {
    for (const sp of SPECIES) if (['amphibian', 'reptile'].includes(sp.cat)) expect(HERP[sp.sci], sp.id).toBeTruthy();
  });
  it('floor space grows with the animals', () => {
    expect(floorFor(HERP['Ambystoma mexicanum'], 2)).toEqual([3.75, 3.75]);
    expect(floorFor(HERP['Eublepharis macularius'], 1)).toEqual([4.5, 6]);
  });
  it('leopard gecko: 36x18 is the minimum, 20 long is too small, two are a note, three a warning', () => {
    expect(lv(setup(36, 18, 18, ['leopardgecko']), 'Leopard gecko', 'warn')).toEqual([]);
    expect(lv(setup(30, 12, 12, ['leopardgecko']), 'Leopard gecko', 'warn').join()).toMatch(/floor/);
    expect(lv(setup(48, 24, 24, ['leopardgecko', 'leopardgecko']), 'Leopard gecko', 'note').join()).toMatch(/males/);
    expect(lv(setup(72, 24, 24, Array(3).fill('leopardgecko')), 'Leopard gecko', 'warn').join()).toMatch(/at most 2/);
  });
  it('crested morphs count as one species; height matters', () => {
    expect(lv(setup(24, 24, 36, ['crestedgecko', 'crestedharlequin']), 'Crested gecko', 'note').join()).toMatch(/Never two males/);
    expect(lv(setup(18, 18, 18, ['crestedgecko']), 'Crested gecko', 'warn').join()).toMatch(/tall/);
  });
  it('ball python: more than one warns', () => {
    expect(lv(setup(48, 24, 24, ['ballpython', 'ballpython']), 'Ball python', 'warn').join()).toMatch(/at most 1/);
  });
  it('mixing species warns; allowed mates do not', () => {
    expect(lv(setup(48, 24, 36, ['crestedgecko', 'treefrog']), 'Crested gecko', 'warn').join()).toMatch(/not with/);
    expect(lv(setup(36, 18, 18, ['adf', 'neon', 'adf', 'adf'], true), 'African dwarf frog', 'warn')).toEqual([]);
    expect(lv(setup(36, 18, 18, ['axolotl', 'neon'], true), 'Axolotl', 'warn').join()).toMatch(/not with/);
  });
  it('aquatic animals need water; a lone dwarf frog is lonely', () => {
    expect(lv(setup(36, 18, 18, ['axolotl'], false), 'Axolotl', 'warn').join()).toMatch(/water/);
    expect(lv(setup(30, 12, 12, ['adf'], true), 'African dwarf frog', 'note').join()).toMatch(/lonely/);
  });
  it('a tank with no herps says nothing', () => { expect(herpCheck(setup(36, 18, 18, ['neon'], true))).toEqual([]); });
  it('a juvenile is judged by its length, and told how long the enclosure lasts', () => {
    // a 4 in leopard gecko fits a 20 long (2.5 sq ft) now; the 36x18 minimum it will need is only 4.5
    const t = setup(30, 12, 12, ['leopardgecko'], false, [{ tl: 100 }]);
    expect(lv(t, 'Leopard gecko', 'warn')).toEqual([]);
    expect(info(t, 'Leopard gecko').join()).toMatch(/last about .*month/);
    // fully grown, the same tank is too small
    expect(lv(setup(30, 12, 12, ['leopardgecko'], false, [{ tl: 220 }]), 'Leopard gecko', 'warn').join()).toMatch(/floor/);
    // a juvenile in an adult-sized tank is never told it will be outgrown
    expect(info(setup(48, 24, 24, ['leopardgecko'], false, [{ tl: 100 }]), 'Leopard gecko')).toEqual([]);
    // a hatchling ball python needs far less floor than an adult
    expect(lv(setup(24, 12, 12, ['ballpython'], false, [{ tl: 250 }]), 'Ball python', 'warn')).toEqual([]);
    expect(lv(setup(24, 12, 12, ['ballpython'], false, [{ tl: 1100 }]), 'Ball python', 'warn').join()).toMatch(/floor/);
  });
  it('height is a growth limit too: a juvenile crested gecko outgrows a short tank', () => {
    const t = setup(18, 18, 18, ['crestedgecko'], false, [{ tl: 100 }]);
    expect(lv(t, 'Crested gecko', 'warn')).toEqual([]);
    expect(info(t, 'Crested gecko').join()).toMatch(/in of height/);
  });
  it('tracked sexes: two males warn, a pair breeds, unsexed pairs are told how to sex', () => {
    const two = (a: 'm' | 'f' | undefined, b: 'm' | 'f' | undefined) => setup(48, 24, 36, ['crestedgecko', 'crestedgecko'], false, [{ gender: a }, { gender: b }]);
    expect(lv(two('m', 'm'), 'Crested gecko', 'warn').join()).toMatch(/males fight/);
    expect(lv(two('m', 'f'), 'Crested gecko', 'note').join()).toMatch(/breed/);
    expect(lv(two('f', 'f'), 'Crested gecko', 'warn')).toEqual([]);
    expect(lv(two(undefined, 'f'), 'Crested gecko', 'note').join()).toMatch(/not sexed yet/);
    const darts = (a: 'm' | 'f', b: 'm' | 'f') => setup(24, 18, 18, ['dartfrog', 'dartfrog'], false, [{ gender: a }, { gender: b }]);
    expect(lv(darts('f', 'f'), 'Dyeing dart frog', 'warn').join()).toMatch(/females/);
    expect(lv(darts('m', 'f'), 'Dyeing dart frog', 'warn').join()).not.toMatch(/females/);
  });
  it('every rule has a sexing note, a growth curve and a final adult stage', () => {
    for (const [sci, r] of Object.entries(HERP)) {
      expect(r.sexing.how, sci).toBeTruthy(); expect(r.grow.length, sci).toBeGreaterThan(1);
      expect(r.stages[r.stages.length - 1].k, sci).toBe(1);
      for (let i = 1; i < r.grow.length; i++) { expect(r.grow[i][0]).toBeGreaterThan(r.grow[i - 1][0]); expect(r.grow[i][1]).toBeGreaterThanOrEqual(r.grow[i - 1][1]); }
    }
  });
});
