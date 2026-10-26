// Land animals in path 1, "An animal I want" (lane LT, 2026-10-26): terrarium sizes judged on floor and height, three terrarium builds
// with heat / UVB / misting priced, and the plan sheet speaking of floor, not water.
import { describe, expect, it } from 'vitest';
import { allLand, tankFor, tankOptions, fitIn, buildSpan, type AnimalCount } from '../src/scene/tankfit';
import { buildsFor, distinctBuilds } from '../src/scene/builds';
import { dryNeedsOf, drySetup, dryRows } from '../src/scene/drygear';
import { getTankModel } from '../src/data/tanks';
import { planOf } from '../src/scene/plan';
import { planFor, startPick } from '../src/ui/stockPlanLogic';
import { price } from '../src/demand/prices';

const python: AnimalCount[] = [{ species: 'ballpython', n: 1 }];
const LAND = ['ballpython', 'leopardgecko', 'crestedgecko', 'greenanole', 'brownanole', 'dartfrog', 'treefrog', 'regaljumper', 'chacogoldenknee'];

describe('land animals get terrarium sizes', () => {
  it('only all-land picks take the terrarium path', () => {
    expect(allLand(python)).toBe(true);
    expect(allLand([...python, { species: 'neon', n: 6 }])).toBe(false);
    expect(allLand([{ species: 'neon', n: 6 }])).toBe(false);
    expect(allLand([])).toBe(false);
  });
  it('the ball python needs a 4 x 2 ft floor: the 48 x 24 x 24 in terrarium is the smallest that holds it', () => {
    const opts = tankOptions(python);
    expect(opts.length).toBeGreaterThan(5);
    expect(opts.every(o => o.tank.terrarium)).toBe(true);
    const need = tankFor(python)!;
    expect(need.fails).toEqual([]);
    expect(need.tank.id).toBe('t48x24x24');
    expect(fitIn(python, 't36x18x18')!.fails.length).toBeGreaterThan(0);
  });
  it('every land species finds a terrarium on the list', () => {
    for (const id of LAND) expect(tankFor([{ species: id, n: 1 }])?.fails, id).toEqual([]);
  });
  it('climbers fail a terrarium that is too short', () => {
    expect(fitIn([{ species: 'crestedgecko', n: 1 }], 't36x18x18')!.fails).toContain('height');
  });
  it('the stocking screen gets a plan with sizes and a cost span once a size is chosen', () => {
    const p = planFor([startPick('ballpython')], 't48x24x24');
    expect(p.options.length).toBeGreaterThan(0);
    expect(p.tank?.id).toBe('t48x24x24');
    expect(p.span!.setupUsd.cheapest).toBeGreaterThan(0);
    expect(buildSpan(python, 't48x24x24')!.setupUsd.balanced).toBeGreaterThanOrEqual(buildSpan(python, 't48x24x24')!.setupUsd.cheapest);
  });
});

describe('terrarium gear and builds', () => {
  it('needs follow the species: anoles a T5 and a lamp, a tarantula nothing, a dart frog misting', () => {
    expect(dryNeedsOf(['greenanole'])).toEqual({ heat: 'lamp', uvb: 't5', mist: true });
    expect(dryNeedsOf(['chacogoldenknee'])).toEqual({ heat: 'none', uvb: 'none', mist: false });
    expect(dryNeedsOf(['dartfrog']).mist).toBe(true);
    expect(dryNeedsOf(['leopardgecko']).mist).toBe(false);
  });
  it('every gear row has a price', () => {
    for (const id of LAND) for (const b of ['cheapest', 'leastWork', 'balanced'] as const) {
      const S = drySetup(getTankModel(tankFor([{ species: id, n: 1 }])!.tank.id)!, [{ species: id, n: 1 }], b);
      for (const r of dryRows(S)) expect(price(r.price), `${id} ${b} ${r.price}`).toBeDefined();
    }
  });
  it('the ball python gets three dry builds: heat on a thermostat, UVB, misting; cheapest the cheapest, least work the fewest minutes', () => {
    const bs = buildsFor(python, getTankModel('t48x24x24')!);
    expect(bs.map(b => b.id)).toEqual(['cheapest', 'leastWork', 'balanced']);
    for (const b of bs) {
      expect(b.setup.water.on).toBe(false);
      expect(b.gear.join(' ')).toMatch(/Basking bulb/);
      expect(b.gear.join(' ')).toMatch(/UVB/);
      expect(b.gear.join(' ')).not.toMatch(/Filter|Heater/);
      expect(b.setupUsd).toBeGreaterThan(0);
    }
    const [c, l, bal] = bs;
    expect(c.setupUsd).toBeLessThanOrEqual(bal.setupUsd);
    expect(l.minPerWeek).toBeLessThan(c.minPerWeek);
    expect(l.gear.join(' ')).toMatch(/Automatic misting/);
  });
  it('a leopard gecko needs no misting: no least-work build of its own (a timer saves no minutes)', () => {
    const a = [{ species: 'leopardgecko', n: 1 }];
    expect(distinctBuilds(buildsFor(a, tankFor(a)!.tank)).length).toBe(2);
  });
  it('a terrarium is priced from its own listings, not an aquarium per gallon', () => {
    const c = buildsFor(python, getTankModel('t48x24x24')!)[0];
    expect(c.setupUsd).toBeLessThan(1200);
  });
  it('a tarantula has nothing to choose between: one build', () => {
    const bs = distinctBuilds(buildsFor([{ species: 'chacogoldenknee', n: 1 }], tankFor([{ species: 'chacogoldenknee', n: 1 }])!.tank));
    expect(bs.length).toBe(1);
  });
  it('the plan sheet judges floor, prices the gear and says what each part is for', () => {
    const b = buildsFor(python, getTankModel('t48x24x24')!)[2];
    const p = planOf(b.setup, b, Date.now(), 'in');
    expect(p.title).toMatch(/terrarium/);
    expect(p.verdict[0].text).toMatch(/^Floor/);
    expect(p.verdict.some(v => /Filtration|water column/.test(v.text))).toBe(false);
    expect(p.rows.some(r => /UVB/.test(r.serves))).toBe(true);
    expect(p.missing).toEqual([]);
  });
});
