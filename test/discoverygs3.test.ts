// Guided Setup Rev 03, Look First tail (lane GS3): the "Open to anything" World card, contextual water, the Suitable Animals step and the provisional
// enclosure chain. Pure logic only (no WebGL): src/ui/discovery/{logic,animals,tiles}.ts.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, ENVIRONMENTS, archetype, archetypesOf, type Archetype } from '../src/scene/archetypes';
import { TANK_MODELS, tankFromModel } from '../src/data/tanks';
import { getSpecies } from '../src/data/species';
import { whyAnimal } from '../src/scene/animalfit';
import { fitIn, type AnimalCount } from '../src/scene/tankfit';
import { spaceFit, tankExtent } from '../src/scene/space';
import {
  ANY_WORLD, NOTHING_KNOWN, animalsFirstSteps, choiceIds, envChoices, firstIn, firstOpen, knownOf, lookFirstSteps, nextIn, nextOf, prevOf, routeSteps, setPick, settle, stepsOf, type Picks,
} from '../src/ui/discovery/logic';
import { addAnimal, belongsIn, dropAnimal, stockingSuggestion, suitableAnimals } from '../src/ui/discovery/animals';
import { Previews, sceneWithAnimals, tankChoice } from '../src/ui/discovery/tiles';

const byName = (n: string) => TANK_MODELS.find(m => m.name === n && !m.terrarium)!;
const BREEDER40 = byName('40 gal breeder');
const built = (a: Archetype) => a.support !== 'coming-soon' && a.recipe.looks.length > 0;
const firstOf = (pred: (a: Archetype) => boolean) => ARCHETYPES.find(a => built(a) && pred(a))!;

describe('Open to anything (World step): it defers the world', () => {
  it('is the fourth, equal card in the old dialog, and goes away once the animals answer the world or it was already picked', () => {
    expect(envChoices(NOTHING_KNOWN).items.map(c => c.id)).toEqual([...ENVIRONMENTS.map(e => e.id), ANY_WORLD]);
    expect(choiceIds('environment', {}, NOTHING_KNOWN)).toContain(ANY_WORLD);
    expect(envChoices(NOTHING_KNOWN, false).items.map(c => c.id)).toEqual(ENVIRONMENTS.map(e => e.id));
    expect(envChoices(knownOf(['betta'])).items.map(c => c.id)).toEqual(['aquarium']);
  });

  it('picking it decides nothing: no world, no water, and the World step comes back right before Water', () => {
    const p = setPick({ environment: 'aquarium', waterType: 'freshwater', familyId: 'fw-wild' }, 'environment', ANY_WORLD);
    expect(p.worldOpen).toBe(true);
    expect(p.environment).toBeUndefined(); expect(p.waterType).toBeUndefined(); expect(p.familyId).toBeUndefined();
    // Look First (World belongs to the shared onboarding, so it is only here because it was deferred)
    expect(firstIn('look', false, p, NOTHING_KNOWN)).toBe('environment');
    expect(lookFirstSteps(p).map(c => c.id)).toEqual(['environment', 'family', 'archetype', 'density', 'animals']);
    const q = setPick(p, 'environment', 'aquarium');
    expect(q.worldOpen).toBe(true);   // stays, so the breadcrumb keeps World
    expect(lookFirstSteps(q).map(c => c.id)).toEqual(['environment', 'water', 'family', 'archetype', 'density', 'animals']);
    expect(nextIn('look', false, 'environment', q, NOTHING_KNOWN)).toBe('water');
  });

  it('animals that fix the world still answer it: nothing is deferred', () => {
    const k = knownOf(['ocellaris']), r = settle({ worldOpen: true }, k);
    expect(r.picks.environment).toBe('aquarium'); expect(r.picks.waterType).toBe('saltwater');
    expect(r.auto).toContain('environment'); expect(r.auto).toContain('water');
    expect(lookFirstSteps({ worldOpen: true }, k).map(c => c.id)).toEqual(['family', 'archetype', 'density', 'animals']);
  });
});

describe('the steps of each route (breadcrumbs)', () => {
  it('Look First: Water (aquariums only), Family, Look, Density, Animals; World only when deferred or when discovery owns it', () => {
    expect(lookFirstSteps({ environment: 'aquarium' }).map(c => c.id)).toEqual(['water', 'family', 'archetype', 'density', 'animals']);
    expect(lookFirstSteps({ environment: 'terrarium', waterType: null }).map(c => c.id)).toEqual(['family', 'archetype', 'density', 'animals']);
    expect(lookFirstSteps({ environment: 'aquarium' }, NOTHING_KNOWN, true).map(c => c.id)).toEqual(['environment', 'water', 'family', 'archetype', 'density', 'animals']);
    expect(lookFirstSteps({ environment: 'aquarium' }).map(c => c.label)).toEqual(['Water', 'Family', 'Look', 'Density', 'Animals']);
  });
  it('Animals First: Family, Look, Density, with the water answered by the animals and no Suitable Animals step', () => {
    expect(animalsFirstSteps({}, knownOf(['betta'])).map(c => c.id)).toEqual(['family', 'archetype', 'density']);
    expect(animalsFirstSteps({}, knownOf(['ocellaris'])).map(c => c.id)).toEqual(['family', 'archetype', 'density']);
    expect(routeSteps('animals', { environment: 'aquarium' })).not.toContain('animals');
    expect(firstIn('animals', false, {}, knownOf(['betta']))).toBe('family');
  });
});

describe('contextual water and breadcrumbs', () => {
  it('Water appears only for a picked aquarium', () => {
    expect(stepsOf({})).not.toContain('water');
    expect(stepsOf({ environment: 'terrarium', waterType: null })).not.toContain('water');
    expect(stepsOf({ environment: 'paludarium', waterType: null })).not.toContain('water');
    expect(stepsOf({ environment: 'aquarium' })).toContain('water');
  });

  it('a step the animals answer is auto (the breadcrumb leaves it out) and the first open step is the next one', () => {
    const k = knownOf(['ocellaris']), r = settle({}, k);
    expect(r.auto).toEqual(expect.arrayContaining(['environment', 'water']));
    expect(firstOpen({}, k)).toBe('family');
    // freshwater too: water implied, never asked
    expect(settle({}, knownOf(['betta'])).auto).toContain('water');
  });
});

describe('Suitable Animals step order', () => {
  const done: Picks = { environment: 'aquarium', waterType: 'freshwater', familyId: 'fw-wild', archetypeId: 'blackwater-creek', density: 'balanced' };
  it('follows Density, is never required, and Back returns to Density', () => {
    expect(nextOf('density', done, NOTHING_KNOWN)).toBe('animals');
    expect(nextOf('animals', done, NOTHING_KNOWN)).toBe('done');
    expect(prevOf('animals', done, NOTHING_KNOWN)).toBe('density');
    expect(firstOpen(done, NOTHING_KNOWN)).toBe('done');   // complete without any animal
    expect(choiceIds('animals', done, NOTHING_KNOWN)).toEqual([]);
    expect(setPick(done, 'animals', 'x')).toEqual(done);
  });
});

describe('suitable animals', () => {
  const blackwater = archetype('blackwater-creek')!;
  const salty = firstOf(a => a.env === 'aquarium' && a.water === 'saltwater');
  const land = firstOf(a => a.env === 'terrarium');
  const names = (l: { sp: { id: string } }[]) => l.map(s => s.sp.id);

  it('offers only animals that belong in the world, suit the look, fit the tank, and are never the ones already added', () => {
    for (const [a, tank] of [[blackwater, BREEDER40], [salty, byName('75 gal')], [land, TANK_MODELS.find(m => m.terrarium && m.ratedGal >= 20)!]] as const) {
      const r = suitableAnimals(a, tank);
      expect(r.list.length, a.id).toBeGreaterThan(0);
      for (const s of r.list) {
        expect(belongsIn(a, s.sp), `${a.id}: ${s.sp.id}`).toBe(true);
        expect(fitIn([s.add], tank)?.fails ?? ['none'], `${a.id}: ${s.sp.id} fits`).toEqual([]);
        expect(s.add.n).toBeGreaterThanOrEqual(1);
      }
    }
    expect(suitableAnimals(salty, byName('75 gal')).list.every(s => s.sp.salt)).toBe(true);
    expect(suitableAnimals(blackwater, BREEDER40).list.every(s => !s.sp.salt && s.sp.habitat !== 'land')).toBe(true);
    expect(suitableAnimals(land, TANK_MODELS.find(m => m.terrarium && m.ratedGal >= 20)!).list.every(s => s.sp.habitat === 'land')).toBe(true);
  });

  it('the look own animals lead (the archetype focal animal first), and nothing but welfare-passing animals follow', () => {
    const l = suitableAnimals(blackwater, BREEDER40).list, lead = l.filter(s => s.ofLook).length;
    expect(l[0].sp.id).toBe('cardinal');
    expect(l.slice(0, lead).every(s => s.ofLook) && l.slice(lead).every(s => !s.ofLook)).toBe(true);
  });

  it('after one is added, the rest suit it and still fit with it', () => {
    const first = suitableAnimals(blackwater, BREEDER40).list[0], chosen = addAnimal([], first.add);
    const next = suitableAnimals(blackwater, BREEDER40, chosen);
    expect(names(next.list)).not.toContain(first.sp.id);
    for (const s of next.list) {
      expect(whyAnimal(s.sp, Infinity, 3, [first.sp]), s.sp.id).toBeNull();
      expect(fitIn([...chosen, s.add], BREEDER40)?.fails, s.sp.id).toEqual([]);
    }
    expect(names(suitableAnimals(blackwater, BREEDER40, dropAnimal(chosen, first.sp.id)).list)).toContain(first.sp.id);
  });

  it('a brackish look says so rather than offering freshwater animals', () => {
    const bk = firstOf(a => a.water === 'brackish');
    const r = suitableAnimals(bk, BREEDER40);
    expect(r.list).toEqual([]); expect(r.note).toMatch(/brackish/i);
  });

  it('the stocking suggestion is a small set that suits each other and fits the enclosure', () => {
    for (const [a, tank] of [[blackwater, BREEDER40], [salty, byName('75 gal')]] as const) {
      const set = stockingSuggestion(a, tank);
      expect(set.length, a.id).toBeGreaterThan(0); expect(set.length).toBeLessThanOrEqual(3);
      expect(new Set(set.map(s => s.species)).size).toBe(set.length);
      expect(fitIn(set, tank)?.fails, a.id).toEqual([]);
      for (const s of set) for (const o of set) if (s !== o) expect(whyAnimal(getSpecies(s.species)!, Infinity, 3, [getSpecies(o.species)!]), `${s.species} + ${o.species}`).toBeNull();
      expect(stockingSuggestion(a, tank)).toEqual(set);   // deterministic
    }
  });
});

describe('animals carry into Make It Your Own; density never changes stocking', () => {
  const a = archetype('blackwater-creek')!;
  it('the scene opens with the animals added and the look the density step showed; the density never changes the animals', () => {
    const tank = tankChoice(archetypesOf(a.familyId))!.model, set: AnimalCount[] = stockingSuggestion(a, tank), pv = new Previews();
    expect(set.length).toBeGreaterThan(0);
    const want = set.flatMap(c => Array(c.n).fill(c.species)).sort(), roster = (S: { fish: { species: string }[] }) => S.fish.map(f => f.species).sort();
    const hard = (S: { items: { kind: string; variant: string; x: number }[] }) => S.items.map(i => `${i.kind}:${i.variant}:${Math.round(i.x)}`).sort();
    for (let stop = 0; stop <= 4; stop++) {
      const bare = pv.scenesOf(a, tank)!.stop(stop), withAn = sceneWithAnimals(pv, a, tank, set, stop)!;
      expect(roster(withAn), `stop ${stop}`).toEqual(want);                 // the animals chosen, no more and no fewer, at every density
      expect(hard(withAn), `stop ${stop}`).toEqual(hard(bare));               // the pieces the density step showed, in the same places
      expect(withAn.tank).toEqual(bare.tank); expect(withAn.layout.dens).toEqual(bare.layout.dens);
      expect(withAn.layout).toEqual(bare.layout); expect(withAn.water.level).toBe(bare.water.level); expect(withAn.render.bg).toBe(bare.render.bg);
    }
    // none chosen: the scene is exactly the one the density step showed (its own default animals, as before this step existed)
    expect(sceneWithAnimals(pv, a, tank, [], 2)).toEqual(pv.scenesOf(a, tank)!.stop(2));
  });
});

describe('the provisional enclosure chain (Rev 03 section 4)', () => {
  const arches = archetypesOf('fw-wild');
  it('your tank first, then a labelled provisional one from what is known, then an editable example', () => {
    expect(tankChoice(arches, { yours: BREEDER40 })).toMatchObject({ source: 'owned-required', basis: 'yours' });
    expect(tankChoice(arches, { yours: BREEDER40, use: 'available' })).toMatchObject({ source: 'owned-available', basis: 'yours', model: { id: BREEDER40.id } });
    expect(tankChoice(arches)).toMatchObject({ source: 'suggested', basis: 'example' });
    expect(tankChoice(arches, { budgetKnown: true })).toMatchObject({ source: 'suggested', basis: 'budget' });
    expect(tankChoice(arches, { floorGal: 75 })).toMatchObject({ source: 'suggested', basis: 'size' });
    expect(tankChoice(arches, { maxGal: 60 })).toMatchObject({ source: 'suggested', basis: 'size' });
    expect(tankChoice(arches, { animals: [{ species: 'neon', n: 6 }] })).toMatchObject({ source: 'suggested', basis: 'animals' });
    const pick = tankChoice(arches, { floorGal: 75 })!.model.id;
    expect(tankChoice(arches, { pick, yours: undefined })).toMatchObject({ source: 'picked', basis: 'picked' });
    for (const o of [{}, { budgetKnown: true }, { floorGal: 75 }]) expect(tankChoice(arches, o)!.why.length).toBeGreaterThan(0);
  });

  it('known dimensions give the biggest suitable tank that fits the space, never one past it', () => {
    const e = tankExtent(tankFromModel(tankChoice(arches, { floorGal: 40 })!.model)), space = { w: e.w + 30, d: e.d + 30 };   // just room for a tank of the 40 gal class
    const tc = tankChoice(arches, { maxSpace: space })!;
    expect(tc).toMatchObject({ source: 'suggested', basis: 'space' });
    expect(spaceFit(tankFromModel(tc.model), space).fits).toBe(true);
    const bigger = tankChoice(arches, { maxSpace: { w: 1500, d: 700 } })!;
    expect(bigger.model.ratedGal).toBeGreaterThanOrEqual(tc.model.ratedGal);
    expect(spaceFit(tankFromModel(bigger.model), { w: 1500, d: 700 }).fits).toBe(true);
  });

  it('a limit no size can meet is dropped, never a dead end: a tank still comes back, still editable', () => {
    const tc = tankChoice(arches, { maxSpace: { w: 100, d: 100 } })!;
    expect(tc.source).toBe('suggested'); expect(tc.model).toBeDefined();
    expect(tankChoice(arches, { maxGal: 1 })!.model).toBeDefined();
  });
});
