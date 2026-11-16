// FS1 part 3 (2026-11-15, R89): sparkling gourami (Trichopsis pumila) and croaking gourami (Trichopsis vittata). Sources: Seriously Fish (45 x 30 cm pair/small group
// for the sparkling, 60 x 30 cm for a pair of croaking; both need surface cover and a covered tank) and FishBase (length-weight, water).
import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { getSpecies } from '../src/data/species';
import { tankMinimum } from '../src/scene/tankMin';
import { whysAnimal } from '../src/scene/animalfit';
import { PLANS, finRange } from '../src/art/fishgen';
import { SWIM_PACE } from '../src/scene/swimPace';
import { makeSwimSim } from '../src/scene/swimSim';
import { lidNeedOf } from '../src/data/lidNeed';
import { comboTank } from './aqcompare.test';
import { field } from './swimCast';
import type { SwimmerSpec } from '../src/scene/swimTypes';

describe('sparkling and croaking gourami', () => {
  it('are in the catalogue with care data from Seriously Fish', () => {
    expect(getSpecies('sparklinggourami')?.sci).toBe('Trichopsis pumila');
    expect(getSpecies('croakinggourami')?.sci).toBe('Trichopsis vittata');
    expect(CARE.sparklinggourami.temp).toEqual([24, 28]);
    expect(CARE.croakinggourami.temper).toBe(1);   // peaceful unless breeding
    expect(CARE.croakinggourami.solo).toBeUndefined(); // a pair is fine
  });
  it('tank minimum: 45 x 30 cm for the sparkling, 60 x 30 cm for the croaking; a 10 gal is too small for the croaking only', () => {
    const ten = (id: string) => tankMinimum(comboTank({ name: '', tank: [20, 10, 12], stock: [[id, 2]] }));
    expect(ten('sparklinggourami').percent).toBeLessThanOrEqual(100);
    expect(ten('croakinggourami').lengthShort).toBe(true);
    const twentyLong = tankMinimum(comboTank({ name: '', tank: [30, 12, 12], stock: [['croakinggourami', 2]] }));
    expect(twentyLong.lengthShort).toBe(false);
    expect(whysAnimal(getSpecies('croakinggourami')!, 40, 3, []).some(w => w.kind === 'size')).toBe(true);
  });
  it('both need a closed top (labyrinth air; the croaking is a jumper)', () => {
    for (const id of ['sparklinggourami', 'croakinggourami']) expect(lidNeedOf(id).need).toBe('required');
  });
  it('the models exist, slow-fin ranges, and pace values below the default', () => {
    for (const id of ['sparklinggourami', 'croakinggourami']) { expect(PLANS[id]).toBeTruthy(); expect(finRange(id)).toMatchObject({ lo: 0.7, hi: 1 }); expect(SWIM_PACE[id]).toBeLessThan(0.6); }
  });
  it('the roaming sim swims a paced fish about as slowly as its pace says', () => {
    const mk = (id: number, pace?: number, x = 450): SwimmerSpec => ({ id, len: 48, zone: 'water', band: [0.3, 0.7], ...(pace ? { pace } : {}), home: { x, y: 250, z: -225, yaw: 0, pitch: 0, roll: 0 } });
    const run = (pace?: number) => { const sim = makeSwimSim([mk(1, pace)], field, 3), dt = 1 / 30; let d = 0, p0 = { ...sim.pose(1)! }; for (let s = 0; s < 90 / dt; s++) { sim.step(dt); const p = sim.pose(1)!; d += Math.hypot(p.x - p0.x, p.y - p0.y, p.z - p0.z); p0 = { ...p }; } return d; };
    const slow = run(0.35), normal = run();
    expect(slow).toBeLessThan(normal * 0.6);
    expect(slow).toBeGreaterThan(0);
  });
});
