// Herp stocking check (Nathan 2026-10-19): floor area, height, group size, water and tankmate rules for reptiles and amphibians.
import { describe, expect, it } from 'vitest';
import { HERP, floorFor } from '../src/data/herpstock';
import { SPECIES } from '../src/data/species';
import { defaultScene } from '../src/scene/defaults';
import { herpCheck } from '../src/scene/herpcheck';
import type { Fish, TankSetup } from '../src/scene/types';

const IN = 25.4;
const setup = (L: number, D: number, H: number, species: string[], water = false): TankSetup => {
  const s = JSON.parse(JSON.stringify(defaultScene().tanks[0])) as TankSetup;
  Object.assign(s.tank, { L: L * IN, D: D * IN, H: H * IN, shape: undefined }); s.water.on = water;
  s.fish = species.map((sp, i) => ({ id: i + 1, species: sp, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }) as Fish);
  return s;
};
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
});
