// Lane OG1 (2026-11-03): the Overflowing Garden archetype: an open-top planted aquarium whose plants grow up and out of the tank on purpose.
// No lid in the scene or the gear, plants clearing the water more at denser stops, and no animal that needs a lid in its lists or roster.
import { describe, expect, it } from 'vitest';
import { SPECIES, getSpecies } from '../src/data/species';
import { TANK_MODELS, type TankModel } from '../src/data/tanks';
import { ARCHETYPES, FAMILIES, archetype, archetypesOf } from '../src/scene/archetypes';
import { GARDEN_LEVEL, STOPS, minTank, recipeBase, stopScene } from '../src/scene/recipes';
import { itemDims } from '../src/scene/items';
import { waterY } from '../src/scene/physics';
import { isOpenTop, needsLid } from '../src/scene/openTop';
import { rosterPlan, suitableAnimals } from '../src/ui/discovery/animals';
import { NOTHING_KNOWN, archetypeChoices, familyChoices, fits, knownOf } from '../src/ui/discovery/logic';
import { buildsFor } from '../src/scene/builds';
import { evaluateCandidate } from '../src/demand/suggest';
import { defaultProfile } from '../src/demand/types';
import { explorePool } from '../src/explore/pool';
import type { TankSetup } from '../src/scene/types';

const A = archetype('overgrown-garden')!;
const tank = (name: string): TankModel => TANK_MODELS.find(m => m.name === name && !m.terrarium)!;
const TANKS = ['20 gal long', '40 gal breeder', '75 gal'].map(tank);
/** the animals Nathan named (jumpers, crayfish, crabs, frogs) plus other known escape artists in the species data: every one needs a lid */
const ESCAPE_ARTISTS = ['hatchet', 'cpo', 'cajundwarf', 'rswcrayfish', 'redclaw', 'thaicrab', 'firetoad', 'firenewt', 'adf', 'axolotl', 'betta', 'danio', 'kuhli'];

/** how far (mm) the tallest plant reaches past the water line in a scene, how many plants do, and the total of their reach */
function overRim(S: TankSetup) {
  const water = waterY(S.tank, S.water.level);
  const reach = S.items.filter(it => it.kind === 'plant').map(it => itemDims(it)[1] - water);
  return { max: Math.max(0, ...reach), n: reach.filter(r => r > 20).length, sum: reach.filter(r => r > 0).reduce((a, b) => a + b, 0) };
}


describe('the archetype', () => {
  it('is a supported freshwater aquarium look in the Underwater Gardens family, with its own id', () => {
    expect(A).toBeTruthy(); expect(A.support).toBe('supported'); expect(A.env).toBe('aquarium'); expect(A.water).toBe('freshwater');
    expect(A.familyId).toBe('fw-gardens'); expect(FAMILIES.some(f => f.id === A.familyId)).toBe(true);
    expect(isOpenTop(A)).toBe(true);
    expect(new Set(ARCHETYPES.map(a => a.id)).size).toBe(ARCHETYPES.length);
    expect(archetype(A.contrast.sibling)).toBeTruthy();
  });
  it('is reachable in Discovery: Look First (water, family, look) and Animals First (a roster that suits it keeps it, one that needs a lid drops it)', () => {
    const p = { environment: 'aquarium', waterType: 'freshwater', familyId: 'fw-gardens' } as never;
    expect(familyChoices(p, NOTHING_KNOWN).items.some(f => f.id === 'fw-gardens')).toBe(true);
    expect(archetypeChoices(p, NOTHING_KNOWN).items.map(a => a.id)).toContain('overgrown-garden');
    expect(archetypesOf('fw-gardens').map(a => a.id)).toContain('overgrown-garden');
    expect(fits(A, knownOf(['neon', 'pandacory']))).toBe(true);
    expect(fits(A, knownOf(['neon', 'hatchet']))).toBe(false);
    expect(archetypeChoices(p, knownOf(['neon', 'hatchet'])).items.map(a => a.id)).not.toContain('overgrown-garden');
  });
});

describe('the scene', () => {
  for (const T of TANKS) {
    describe(T.name, () => {
      const base = recipeBase(A, T)!;
      it('is buildable at all five stops, with no lid, a lowered water line and no lid in the gear', () => {
        expect(base).toBeTruthy(); expect(minTank(A).ratedGal).toBeLessThanOrEqual(T.ratedGal);
        for (let s = 0; s < STOPS; s++) {
          const S = stopScene(base, s);
          expect(S.lid, `stop ${s}`).toBe('open');
          expect(S.water.on).toBe(true); expect(S.water.level).toBeCloseTo(GARDEN_LEVEL, 5);
          expect(S.items.some(it => it.kind === 'plant'), `stop ${s} has plants`).toBe(true);
          expect(S.render.bg).toBe('custom');
        }
        expect(base.build.setup.lid).toBe('open');
        expect(base.build.gear.some(g => /lid/i.test(g)), base.build.gear.join(' | ')).toBe(false);
      });
      it('stands lucky bamboo canes above the water line at every stop, taller than the water is deep', () => {
        for (let s = 0; s < STOPS; s++) {
          const S = stopScene(base, s), water = waterY(S.tank, S.water.level), cane = S.items.filter(it => it.variant === 'bamboo');
          expect(cane.length, `stop ${s}`).toBeGreaterThan(0);
          expect(Math.max(...cane.map(it => itemDims(it)[1])), `stop ${s}`).toBeGreaterThan(water);
        }
      });
      it('is a tank plus houseplants by default, not a jungle: Balanced has no vallisneria or strap-leaf wall, a modest plant count, and pothos on the glass', () => {
        const S = stopScene(base, 2), plants = S.items.filter(it => it.kind === 'plant');
        expect(plants.some(it => it.variant === 'grass' || it.variant === 'balansae')).toBe(false);
        expect(plants.some(it => it.variant === 'pothos')).toBe(true);
        expect(plants.length, `${plants.length} plants`).toBeLessThan(120);
        expect(stopScene(base, 4).items.filter(it => it.kind === 'plant').length).toBeGreaterThan(plants.length * 1.5);
      });
      it('has more plant growing out of the water at each denser stop', () => {
        const r = Array.from({ length: STOPS }, (_, s) => overRim(stopScene(base, s)));
        expect(r[0].max, JSON.stringify(r)).toBeGreaterThan(0); // even the sparsest stop has stems reaching past the surface
        for (let s = 1; s < STOPS; s++) expect(r[s].sum, `stop ${s}: ${JSON.stringify(r)}`).toBeGreaterThan(r[s - 1].sum);
        expect(r[4].n, JSON.stringify(r)).toBeGreaterThan(r[0].n);
        expect(r[4].max).toBeGreaterThan(r[0].max * 1.5);
      });
    });
  }
});

describe('its animals', () => {
  it('needsLid names the escape artists and none of the quiet community fish', () => {
    for (const id of ESCAPE_ARTISTS) expect(needsLid(getSpecies(id)!), id).toBe(true);
    for (const id of ['neon', 'cardinal', 'pandacory', 'oto', 'bristlenose', 'cherryshrimp', 'harlequin', 'kribensis']) expect(needsLid(getSpecies(id)!), id).toBe(false);
  });
  for (const T of TANKS) {
    it(`${T.name}: the suggested roster has no jumper or escape artist and passes the strict welfare rule as built`, () => {
      const plan = rosterPlan(A, T);
      expect(plan.roster.length, plan.why).toBeGreaterThan(0);
      for (const r of plan.roster) expect(needsLid(getSpecies(r.species)!), r.species).toBe(false);
      const b = buildsFor(plan.roster, T, Date.now())[2], ev = evaluateCandidate({ constraints: {} }, defaultProfile(), 'in', Date.now(), { animals: plan.roster, tank: T, build: b });
      expect(ev.welfareWords, plan.roster.map(r => r.species).join()).toEqual([]);
    });
    it(`${T.name}: no animal that needs a lid is offered to add`, () => {
      const list = suitableAnimals(A, T, [], 200).list.map(s => s.sp.id);
      expect(list.length).toBeGreaterThan(3);
      for (const id of list) expect(needsLid(getSpecies(id)!), id).toBe(false);
      for (const id of ESCAPE_ARTISTS) expect(list).not.toContain(id);
    });
  }
  it('plenty of species stay allowed, and the named escape artists are not among them', () => {
    const allowed = SPECIES.filter(s => !s.salt && !needsLid(s)).map(s => s.id);
    expect(allowed.length).toBeGreaterThan(15);
    for (const id of ['hatchet', 'cpo', 'firetoad']) expect(allowed).not.toContain(id);
  });
});

describe('Explore', () => {
  it('its pool picks the archetype up from the registry, with a roster that needs no lid', () => {
    const r = explorePool({ constraints: {} }, defaultProfile(), 'in', Date.parse('2026-11-02'), { only: ['overgrown-garden'], sizes: 1, explain: false });
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) { expect(c.archetype.id).toBe('overgrown-garden'); for (const x of c.roster) expect(needsLid(getSpecies(x.species)!), x.species).toBe(false); }
  });
});
