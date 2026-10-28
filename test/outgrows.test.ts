// S228 "fine for now" (research/outgrows.md): young animals are judged at their size, then stepped forward along their growth curves.
import { describe, expect, it } from 'vitest';
import { curveOf, grownLength, monthsToAdult, shareOf } from '../src/data/growth';
import { lifeStages } from '../src/data/lifestages';
import { getSpecies } from '../src/data/species';
import { getTankModel, TANK_MODELS } from '../src/data/tanks';
import { preyRisk } from '../src/scene/animalfit';
import { firstFail, grownBy } from '../src/scene/outgrows';
import { fitIn, tankOptions } from '../src/scene/tankfit';
import { laterLine, planFor, preyLater, preyLaterLine, type Pk } from '../src/ui/stockPlanLogic';

const sp = (id: string) => getSpecies(id)!;
const gal = (name: string) => TANK_MODELS.find(m => m.name === name)!;
const stage = (id: string, name: string) => lifeStages(sp(id))!.find(([n]) => n === name)![1];

describe('growth curves', () => {
  it('herps keep their own curve; fish a von Bertalanffy curve that ends at the adult length; snails none', () => {
    const g = curveOf(sp('leopardgecko'))!;
    expect(g.source).toBe('herp');
    expect(g.lengthAt(2)).toBe(125);
    const o = curveOf(sp('oscar'))!;
    expect(o.source).toBe('est'); // FishBase has no growth table for the oscar
    expect(o.lengthAt(12)).toBeGreaterThan(200); // about 9 in at a year
    expect(o.lengthAt(12)).toBeLessThan(260);
    expect(curveOf(sp('goldfish'))!.source).toBe('fishbase');
    expect(curveOf(sp('neon'))).toBeDefined();
    expect(monthsToAdult(sp('oscar'), 300)).toBe(0);
    expect(grownLength(sp('oscar'), 45, 600)).toBeUndefined(); // grown by then
  });
  it('size buttons for herps and for fish 100 mm or longer, not for small fish', () => {
    expect(lifeStages(sp('oscar'))!.map(([n]) => n)).toEqual(['hatchling', 'juvenile', 'sub-adult', 'adult']);
    expect(lifeStages(sp('neon'))).toBeNull();
  });
  it('an adult-sized animal is adult: the ordinary size spread never moves a verdict', () => {
    expect(shareOf(undefined, 300)).toBe(1);
    expect(shareOf(270, 300)).toBe(1);
    expect(shareOf(150, 300)).toBe(0.5);
  });
});

describe('the leopard gecko in a 24 x 12 x 12 terrarium', () => {
  const ten = getTankModel('t24x12x12')!, hatch = stage('leopardgecko', 'hatchling');
  it('a hatchling fits a 10 gal today; the grown gecko does not', () => {
    expect(fitIn([{ species: 'leopardgecko', n: 1, tl: hatch }], ten)!.fails).toEqual([]);
    expect(fitIn([{ species: 'leopardgecko', n: 1 }], ten)!.fails).toContain('floor');
  });
  it('the planner lists sizes for a land animal, reads the small terrarium "fine for now" with a time, and still recommends the grown size', () => {
    const picks: Pk[] = [{ id: 'leopardgecko', n: 1, tl: hatch }];
    const plan = planFor(picks, ten.id);
    expect(plan.options.length).toBeGreaterThan(5);
    expect(plan.fit!.fails).toEqual([]);
    const l = plan.later![ten.id];
    expect(l.months).toBeGreaterThan(1);
    expect(l.months).toBeLessThan(3);
    const line = laterLine(l, 'in');
    expect(line).toMatch(/^Fine now\. In about 2 months, at about 4\.\d in, it needs 2\.48 sq ft \(0\.23 m²\) of floor: Terrarium 30 x 12 in/);
    // the recommended size is the grown gecko's: 4.5 sq ft
    expect(plan.need!.fails).toEqual([]);
    expect(fitIn([{ species: 'leopardgecko', n: 1 }], plan.need!.tank)!.fails).toEqual([]);
    expect(plan.need!.tank.id).not.toBe(ten.id);
  });
  it('an adult reads too small, with no "for now"', () => {
    const plan = planFor([{ id: 'leopardgecko', n: 1 }], ten.id);
    expect(plan.fit!.fails).toContain('floor');
    expect(plan.later).toBeUndefined();
    expect(plan.problem).toMatch(/too small/i); // main's dryFit lists the species minimum first, so the generic wording
  });
});

describe('an oscar juvenile in a 55 with neons', () => {
  const picks: Pk[] = [{ id: 'oscar', n: 1, tl: stage('oscar', 'hatchling') }, { id: 'neon', n: 8 }];
  it('the prey gate reads the oscar\'s length: a 2 in oscar takes no neon, a grown one does, and it flips at about 4.5 in', () => {
    expect(preyRisk(sp('oscar'), sp('neon'), 45)).toBeNull();
    expect(preyRisk(sp('oscar'), sp('neon'))).toBe('eats');
    const l = preyLater(picks, 'oscar')!;
    expect(l.eater).toBe('Oscar');
    expect(l.eaten).toBe('Neon tetra');
    expect(l.lengthMm).toBeGreaterThan(110);
    expect(l.lengthMm).toBeLessThan(120); // 100 mm mouth at 300 mm: a 38 mm neon at 114 mm
    expect(preyLaterLine(l, 'in')).toMatch(/^Fine for now: in about \d month.*, at about 4\.[4-6] in, the oscar can eat the neon tetra\.$/);
  });
  it('the 55 gal holds the young oscar today, and says when it stops', () => {
    const t55 = gal('55 gal');
    const plan = planFor(picks, t55.id);
    expect(plan.fit!.fails).toEqual([]);
    expect(plan.later![t55.id].who).toBe('Oscar');
  });
});

describe('the shared stepping', () => {
  it('finds the first failing month and never asks about today', () => {
    const xs = [{ species: 'oscar', tl: 45 }];
    const o = firstFail(xs, at => (at[0].tl ?? 300) >= 150 ? 'big' : undefined)!;
    expect(grownBy(xs, o.months)[0].tl).toBeGreaterThanOrEqual(150);
    expect(grownBy(xs, o.months - 1)[0].tl).toBeLessThan(150);
    expect(firstFail([{ species: 'oscar' }], () => 'x')).toBeUndefined(); // adult already
  });
  it('the tank list for adults is as before (no tl: no "for now")', () => {
    expect(tankOptions([{ species: 'neon', n: 8 }]).every(o => o.short === undefined)).toBe(true);
    expect(getTankModel(gal('10 gal').id)).toBeDefined();
  });
});
