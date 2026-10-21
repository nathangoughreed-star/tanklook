// One tank-minimum evaluation (scene/tankMin.ts) is read by the Fullness bar, the tank-fit engine, the animal gate and the hard truths:
// behavioural invariants, not fixed percentages (Nathan 2026-10-21).
import { describe, expect, it } from 'vitest';
import { TANK_MODELS, tankFromModel } from '../src/data/tanks';
import { getSpecies } from '../src/data/species';
import { MIN_SLACK_PCT, whyAnimal } from '../src/scene/animalfit';
import { bareSetup } from '../src/scene/defaults';
import { hardTruths } from '../src/scene/plan';
import { volume } from '../src/scene/physics';
import { tankFor } from '../src/scene/tankfit';
import { measureMinimum, minFit, speciesMinimum, tankMinimum, type Geometry } from '../src/scene/tankMin';
import type { Fish } from '../src/scene/types';

const IDS = ['swordtail', 'oscar', 'danio', 'adf', 'neon', 'bristlenose', 'guppy'];
const SP = IDS.map(id => getSpecies(id)!);
const base: Geometry = { litres: 150, areaCm2: 4000, lengthMm: 900, widthMm: 450 };
const worse = (a: number, b: number) => a > b + 1e-9;

describe('the tank minimum is monotonic in each dimension', () => {
  it('more height (only water grows) never worsens it, and stops helping once the footprint dominates', () => {
    for (const sp of SP) {
      let prev = Infinity, floor = 0;
      for (const k of [0.5, 1, 2, 4, 8, 16]) { const p = speciesMinimum(sp, { ...base, litres: base.litres * k }).pct; expect(worse(p, prev), sp.id).toBe(false); prev = p; floor = p; }
      expect(speciesMinimum(sp, { ...base, litres: base.litres * 32 }).pct, sp.id).toBeCloseTo(floor, 6);
    }
  });
  it('more length, or more width (with the floor and water they bring) never worsens it', () => {
    for (const sp of SP) {
      for (const k of [1, 1.5, 2]) {
        const a = speciesMinimum(sp, base).pct, b = speciesMinimum(sp, { litres: base.litres * k, areaCm2: base.areaCm2 * k, lengthMm: base.lengthMm * k, widthMm: base.widthMm }).pct, c = speciesMinimum(sp, { litres: base.litres * k, areaCm2: base.areaCm2 * k, lengthMm: base.lengthMm, widthMm: base.widthMm * k }).pct;
        expect(worse(b, a), `${sp.id} length x${k}`).toBe(false); expect(worse(c, a), `${sp.id} width x${k}`).toBe(false);
      }
    }
  });
  it('a stated width counts in full: a very long, very narrow tank cannot bypass it', () => {
    const narrow: Geometry = { litres: 200, areaCm2: 2000, lengthMm: 2000, widthMm: 100 };
    const m = measureMinimum('middle', 50, 600, 300, narrow);
    expect(m.pct).toBeGreaterThan(100); expect(m.limiting).toBe('width');
  });
});

describe('a tall, narrow or tiny-floored tank cannot bypass the horizontal needs', () => {
  it('a tall cube is not roomy for a long swimmer or a big-bodied fish', () => {
    const tall: Geometry = { litres: 400, areaCm2: 900, lengthMm: 300, widthMm: 300 };
    for (const id of ['swordtail', 'oscar', 'danio']) expect(speciesMinimum(getSpecies(id)!, tall).pct, id).toBeGreaterThan(100);
  });
  it('a stated floor area is held in full (swordtail: 120 x 30 cm or equivalent), not the area estimated from litres', () => {
    const sw = getSpecies('swordtail')!, breeder: Geometry = { litres: 110, areaCm2: 4186, lengthMm: 910, widthMm: 460 };
    expect(speciesMinimum(sw, breeder).pct).toBeLessThan(100); // a 36 x 18 breeder: more floor than 120 x 30, less length
    expect(speciesMinimum(sw, { litres: 110, areaCm2: 3000, lengthMm: 1000, widthMm: 300 }).limiting).toBe('floor area');
  });
});

describe('the Fullness bar, the tank-fit engine, the animal gate and the hard truths agree', () => {
  const tanks = TANK_MODELS.filter(m => !m.terrarium && /^[\d.]+ (gal|ft)/.test(m.name)).filter((_, i) => i % 4 === 0).slice(0, 14);
  const setup = (m: (typeof TANK_MODELS)[number]) => { const S = bareSetup(); S.tank = tankFromModel(m); S.water.on = true; S.water.level = 0.9; return S; };
  const fishOf = (ids: string[]): Fish[] => ids.map((species, id) => ({ id: id + 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
  it('every species and tank: bar percent, gate verdict and hard truths give the same pass / fail', () => {
    for (const m of tanks) for (const sp of SP) {
      const S = { ...setup(m), fish: fishOf([sp.id]) }, row = tankMinimum(S).rows[0], fails = row.pct > MIN_SLACK_PCT;
      const why = whyAnimal(sp, volume(S.tank).litres, 3, [], { fit: minFit(S) });
      expect(why?.kind === 'size', `${sp.id} in ${m.name}: gate`).toBe(fails);
      const truths = hardTruths(S, [{ species: sp.id, n: 1 }], true).filter(t => t.text.includes('tank size'));
      expect(truths.length > 0, `${sp.id} in ${m.name}: hard truths`).toBe(fails);
    }
  });
  it('tankFor never offers a tank the bar calls too small', () => {
    for (const ids of [['swordtail'], ['oscar'], ['danio', 'bristlenose'], ['adf']]) {
      const t = tankFor(ids.map(species => ({ species, n: 1 })))!;
      expect(t.fails.includes('minimum') || t.minPct <= MIN_SLACK_PCT, ids.join()).toBe(true);
    }
  });
});
