// Lane HV unit 2 (R156): the animal row says adult size, and a young animal's own size and time to grow.
import { describe, expect, it } from 'vitest';
import { sizeLine } from '../src/shell/logic/animals';
import { getSpecies } from '../src/data/species';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';

const base = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const t = parseScene(JSON.parse(SCENES[k])).scene; return t.tanks[t.active].water.on; })!])).scene; return sc.tanks[sc.active]; };
describe('R156 size line', () => {
  const sp = getSpecies('oscar')!;
  it('adult size only when no length is recorded', () => {
    const S = base(); S.fish = [{ ...S.fish[0], species: 'oscar', tl: undefined }];
    expect(sizeLine(S, sp, undefined, 'in')).toMatch(/^Adult about \d+(\.\d)?"$/);
  });
  it('a young oscar shows its own size and months to grow, in cm when asked', () => {
    const S = base(); S.fish = [{ ...S.fish[0], species: 'oscar', tl: 50 }];
    expect(sizeLine(S, sp, undefined, 'in')).toMatch(/^Adult about .*"; yours are 2" now, about \d+ months? to grow$/);
    expect(sizeLine(S, sp, undefined, 'cm')).toMatch(/yours are 5 cm now/);
  });
  it('a grown animal is just adult', () => {
    const S = base(); S.fish = [{ ...S.fish[0], species: 'oscar', tl: sp.tl }];
    expect(sizeLine(S, sp, undefined, 'in')).not.toMatch(/yours/);
  });
});
