// Lanes OG1, OG2 (2026-11-03): the Overflowing Garden: a calm aquascape under an open top, houseplants in rim planters with their roots in the water, vines over the rim.
// No lid in the scene or the gear, plants clearing the water more at denser stops, and no animal that needs a lid in its lists or roster.
import { describe, expect, it } from 'vitest';
import { SPECIES, getSpecies } from '../src/data/species';
import { TANK_MODELS, type TankModel } from '../src/data/tanks';
import { ARCHETYPES, FAMILIES, archetype, archetypesOf } from '../src/scene/archetypes';
import { GARDEN_LEVEL, STOPS, minTank, recipeBase, shelterCount, stopScene, withBg } from '../src/scene/recipes';
import { LIBRARY } from '../src/scene/items';
import { PLANT3D } from '../src/art/plants';
import { NEEDS as PLANT_NEEDS } from '../src/scene/lightneeds';
import { priceRow } from '../src/demand/prices';
import { groundHeight } from '../src/scene/terrain';
import { rimHeadroom, rimmed } from '../src/render/items';
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

/** the houseplants of the rim planters, and the emersed stems that stand in the water */
const HOUSE = new Set(['peacelily', 'anthurium', 'calathea', 'palm', 'bamboo', 'pothos', 'philodendron']);
const EMERSED = new Set(['stem', 'stemred', 'ludwigia']);

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
      const rimOf = (S: TankSetup) => S.tank.H - 30;
      const base0 = (S: TankSetup, it: TankSetup['items'][number]) => groundHeight(S, S.tank, it.x, it.depth) + it.lift;
      it('puts a rim planter at every stop, its box on the glass edge and its roots reaching down to the water', () => {
        for (let s = 0; s < STOPS; s++) {
          const S = stopScene(base, s), pots = S.items.filter(it => it.variant === 'planter'), water = waterY(S.tank, S.water.level);
          expect(pots.length, `stop ${s}`).toBeGreaterThan(0);
          for (const pt of pots) {
            expect(base0(S, pt), `stop ${s}`).toBeGreaterThan(rimOf(S)); expect(base0(S, pt)).toBeLessThanOrEqual(S.tank.H);
            expect(base0(S, pt) - water, 'the longest roots reach the water').toBeLessThan(pt.size * 0.8);
          }
        }
      });
      it('keeps every houseplant in a planter (nothing rooted in the gravel but the calm underwater planting) and grows more of them at denser stops', () => {
        const count = (S: TankSetup) => S.items.filter(it => it.kind === 'plant' && HOUSE.has(it.variant)).length;
        const n = Array.from({ length: STOPS }, (_, s) => count(stopScene(base, s)));
        expect(n[0], JSON.stringify(n)).toBeGreaterThan(0); expect(n[0]).toBeLessThanOrEqual(4);
        for (let s = 1; s < STOPS; s++) expect(n[s], JSON.stringify(n)).toBeGreaterThanOrEqual(n[s - 1]);
        expect(n[4], JSON.stringify(n)).toBeGreaterThan(n[0] * 2);
        for (let s = 0; s < STOPS; s++) {
          const S = stopScene(base, s), pots = S.items.filter(it => it.variant === 'planter');
          for (const hp of S.items.filter(it => it.kind === 'plant' && HOUSE.has(it.variant))) {
            expect(base0(S, hp), `stop ${s} ${hp.variant}`).toBeGreaterThan(rimOf(S));
            expect(pots.some(pt => Math.abs(pt.x - hp.x) <= pt.size * 0.6 && Math.abs(pt.depth - hp.depth) <= pt.size * 0.45 && hp.lift > pt.lift), `stop ${s} ${hp.variant} stands on a planter`).toBe(true);
          }
        }
      });
      it('is a calm aquascape under the water at every stop: hardscape, no strap-leaf wall, no sword, few plants', () => {
        for (let s = 0; s < STOPS; s++) {
          const S = stopScene(base, s), low = S.items.filter(it => it.kind === 'plant' && !HOUSE.has(it.variant) && it.lift <= 1);
          expect(S.items.filter(it => it.kind === 'stone' || it.kind === 'wood').length, `stop ${s}`).toBeGreaterThan(1);
          expect(low.some(it => ['grass', 'balansae', 'sword', 'ozelot'].includes(it.variant)), `stop ${s}`).toBe(false);
          expect(low.length, `stop ${s} has ${low.length} plants under the rim`).toBeLessThan(45);
        }
      });
      it('lets vines spill over the rim: a pothos at the sparsest stop, philodendron and more vines at the denser ones, each started on a planter', () => {
        const vines = (s: number) => stopScene(base, s).items.filter(it => it.variant === 'pothos' || it.variant === 'philodendron');
        expect(vines(0).length).toBeGreaterThan(0);
        expect(vines(4).length).toBeGreaterThan(vines(0).length);
        expect(vines(4).some(it => it.variant === 'philodendron')).toBe(true);
        expect(vines(4).some(it => Math.abs(it.yaw) === 90), 'vines run off the ends of the tank').toBe(true);
        const S4 = stopScene(base, 4);
        for (const v of vines(4)) expect(base0(S4, v)).toBeGreaterThan(rimOf(S4));
      });
      it('has a few emersed stems breaking the surface at the denser stops, and none at the sparsest', () => {
        const stems = (s: number) => stopScene(base, s).items.filter(it => EMERSED.has(it.variant) && it.growth != null);
        expect(stems(0).length).toBe(0);
        expect(stems(4).length).toBeGreaterThan(2);
        const S = stopScene(base, 4), water = waterY(S.tank, S.water.level);
        expect(Math.max(...stems(4).map(it => itemDims(it)[1]))).toBeGreaterThan(water);
      });
      it('does not count the planters as hides, and a second dressing leaves the pieces as they are', () => {
        const S = stopScene(base, 3);
        expect(shelterCount(S)).toBe(S.items.filter(it => it.kind === 'wood' || (it.kind === 'cave' && it.variant !== 'planter')).length);
        const again = withBg(A, structuredClone(S));
        expect(again.items.length).toBe(S.items.length);
      });
      it('is framed with its houseplants (the camera counts what stands above the tank)', () => {
        expect(rimHeadroom(stopScene(base, 4))).toBeGreaterThan(stopScene(base, 4).tank.H * 0.2);
        expect(rimHeadroom(stopScene(base, 4))).toBeGreaterThan(rimHeadroom(stopScene(base, 0)));
      });
    });
  }
});

describe('the new parts', () => {
  const PLANTS = ['peacelily', 'anthurium', 'calathea', 'palm', 'philodendron', 'bamboo'];
  it('each houseplant is in the library, drawn in 3D, a land plant that needs no light or CO2, and priced from a retailer', () => {
    for (const v of PLANTS) {
      expect(LIBRARY[v]?.kind, v).toBe('plant'); expect(PLANT3D[v as never], v).toBeTruthy();
      expect(PLANT_NEEDS[v], v).toEqual({ band: 'land' });
      const row = priceRow(`plant:${v}`); expect(row, v).toBeTruthy(); expect(row.url, v).toMatch(/^https:\/\//); expect(row.lo).toBeLessThan(row.hi);
    }
  });
  it('the rim planter is a priced hardscape piece that sizes by its width', () => {
    expect(LIBRARY.planter?.kind).toBe('cave'); expect(priceRow('hard:planter')?.url).toMatch(/^https:\/\//);
    expect(itemDims({ kind: 'cave', variant: 'planter', seed: 1, size: 100 } as never)[0]).toBe(100);
  });
  it('a plant is at the rim only when its base is up at the glass top: such a plant is drawn free of the glass', () => {
    const T = { H: 400 } as never;
    expect(rimmed(T, 380)).toBe(true); expect(rimmed(T, 100)).toBe(false);
  });
  it('the philodendron vines run out toward the viewer and none climb', () => {
    expect(PLANT3D.philodendron!.vine!.out).toBeCloseTo(Math.PI / 2, 5);
    expect(PLANT3D.philodendron!.vine!.climb).toBe(0);
  });
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
