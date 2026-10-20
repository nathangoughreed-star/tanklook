// Lane SE2 (2026-10-20, Nathan: "cap them"): a starter at the Full animal stop never reads over 100 % in our stocking engine,
// across every freshwater and marine style, four tank sizes and five seeds. (Land-only terrariums are not counted against water.)
import { expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { starterAnimals } from '../src/scene/starter';
import { stockingOf } from '../src/scene/stocking';
import { styleGround } from '../src/scene/scapeground';
import { STYLES, isLandStyle, isReefy } from '../src/scene/items';

it('every starter at the Full stop stays at or under 100 %', () => {
  let n = 0;
  for (const id of Object.keys(STYLES)) {
    if (isLandStyle(id as any)) continue;
    for (const dim of [[24, 12, 16], [36, 18, 18], [48, 13, 20], [72, 18, 22]]) for (const seed of [1, 2, 3, 5, 8]) {
      const s = defaultSetup(); s.tank = { ...s.tank, L: dim[0] * IN, D: dim[1] * IN, H: dim[2] * IN }; s.water.on = true; s.water.salt = isReefy(id as any);
      s.layout = { id: id as any, seed, dens: { hard: 2, plant: 2, animal: 4 } }; s.fish = []; styleGround(s);
      s.fish = starterAnimals(s, 1); if (!s.fish.length) continue;
      n++; expect(stockingOf(s).percent, `${id} ${dim.join('x')} seed ${seed}`).toBeLessThanOrEqual(100);
    }
  }
  expect(n).toBeGreaterThan(200);
});
