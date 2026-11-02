// One persistent project (lane GS6, Nathan 2026-11-02, priority 2): the eight preservation invariants as acceptance tests, plus the acceptance journey
// 15 neon tetras -> 40 gal breeder -> dense underwater forest -> change to a 29 gal. Pure logic over the project state (scene/project.ts) and the scene
// (scene/reeval.ts); the Guided screens call exactly these functions (ui/discovery/screens.ts finish, ui/stockPlan.ts open, ui/panels.ts setTank).
import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/data/species';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { ARCHETYPES } from '../src/scene/archetypes';
import { emptyBrief, getItem, setItem, setVision, valueOf, visionOf, type Brief } from '../src/scene/brief';
import { emptyScene } from '../src/scene/defaults';
import { applyChange, constraintOf, enclosureOf, feasibilityOf, setConstraint, setWater, setWorld } from '../src/scene/project';
import { recipeScene } from '../src/scene/recipes';
import { handOff, hasDesign, lookUnchanged, reevaluate, suggestedAnimals } from '../src/scene/reeval';
import { stockingOf } from '../src/scene/stocking';
import type { TankSetup } from '../src/scene/types';

const M40 = getTankModel('g40b')!, M29 = getTankModel('g29')!;
const NEON = [{ species: 'neon', n: 15 }];
const hardIds = (S: TankSetup) => S.items.filter(i => i.kind !== 'plant' && i.kind !== 'artificial').map(i => i.id);
const roster = (S: TankSetup) => S.fish.map(f => [f.id, f.species]);

/** The project of the journey: the animals, the tank, the look and a limit, all on one brief. */
function journey(): { b: Brief; S: TankSetup } {
  let b = setWorld(emptyBrief(), 'aquarium');
  b = setWater(b, 'freshwater');
  b = setItem(b, 'animals.stock', [{ species: 'neon', count: 15 }], 'preference');
  b = setItem(b, 'equipment.tank', { model: M40.id }, 'preference');
  b = setVision(b, { ...visionOf(b), familyId: 'fw-sculpted', archetypeId: 'underwater-forest', density: 'full', densityStop: 4 });
  b = setConstraint(b, 'startup', 600);
  return { b, S: recipeScene('underwater-forest', 'full', M40, NEON)! };
}
const SALT = SPECIES.find(s => s.salt && s.habitat !== 'land')!;
const other = ARCHETYPES.find(a => a.env === 'aquarium' && a.water === 'freshwater' && a.id !== 'underwater-forest' && a.support !== 'coming-soon' && a.recipe.looks.length > 0)!;

describe('acceptance journey: 15 neon tetras -> 40 gal breeder -> dense underwater forest -> a 29 gal', () => {
  it('the tank changes: stocking is re-assessed, the hardscape and plants adapt to the new footprint, the roster is unchanged, the brief keeps everything', () => {
    const { b, S } = journey();
    const ch = applyChange(b, { tank: { model: M29.id } });
    const res = reevaluate({ before: b, after: ch.state, scene: S, tank: tankFromModel(M29) });
    // the roster: the same animals in the scene and in the brief
    expect(roster(res.scene)).toEqual(roster(S));
    expect(valueOf(ch.state, 'animals.stock')).toEqual(valueOf(b, 'animals.stock'));
    // stocking re-assessed in the new tank
    expect(res.stock).toBeDefined(); expect(res.stock!.now).toBeGreaterThan(res.stock!.was);
    expect(res.stock!.now).toBeCloseTo(stockingOf(res.scene).loadPercent, 0);
    // same pieces, adapted: every hardscape id kept, smaller; plants thinned, not regenerated
    expect(hardIds(res.scene)).toEqual(hardIds(S));
    expect(res.adapt!.factor).toBeLessThan(1); expect(res.adapt!.thinned.length).toBeGreaterThan(0);
    expect(res.scene.items.map(i => i.id).every(id => S.items.some(i => i.id === id))).toBe(true);
    // the look, the tank pick and the limit are the person's decisions: untouched
    expect(visionOf(ch.state).archetypeId).toBe('underwater-forest'); expect(visionOf(ch.state).density).toBe('full');
    expect(constraintOf(ch.state, 'startup')).toEqual(constraintOf(b, 'startup'));
    expect(res.kept.join(' ')).toMatch(/15 Neon tetras/); expect(res.changed.join(' ')).toMatch(/Tank .* gal to .* gal/);
    expect(res.input.fields).toContain('enclosure');
  });
  it('the input scene is not edited by the re-evaluation (Undo restores it exactly)', () => {
    const { b, S } = journey(), json = JSON.stringify(S);
    reevaluate({ before: b, after: applyChange(b, { tank: { model: M29.id } }).state, scene: S, tank: tankFromModel(M29) });
    expect(JSON.stringify(S)).toBe(json);
  });
});

describe('invariant 1: opening a guided screen never deletes the current scene', () => {
  it('a scene with pieces, animals, a catalogue tank, a look or a roster counts as a design to keep; only an empty scene is pristine', () => {
    const { b, S } = journey();
    expect(hasDesign(S, b)).toBe(true);
    expect(hasDesign(emptyScene().tanks[0])).toBe(false);
    const fishOnly = emptyScene().tanks[0]; fishOnly.fish = S.fish.slice(0, 2); expect(hasDesign(fishOnly)).toBe(true);
    const tankOnly = emptyScene().tanks[0]; tankOnly.product = { model: M40.id }; expect(hasDesign(tankOnly)).toBe(true);
    expect(hasDesign(emptyScene().tanks[0], setItem(emptyBrief(), 'animals.stock', [{ species: 'neon', count: 3 }], 'preference'))).toBe(true);
  });
  it('the hand-off over a design never returns a pristine scene: the tank, gear and roster are carried over', () => {
    const { b, S } = journey(), gen = recipeScene(other.id, 'balanced', M40, NEON)!;
    const ho = handOff(S, gen, { brief: b });
    expect(ho.fresh).toBe(false); expect(roster(ho.scene)).toEqual(roster(S)); expect(ho.scene.tank).toEqual(S.tank);
  });
});

describe('invariant 2: selecting an animal updates the desired roster, it does not discard the appearance', () => {
  it('a new roster leaves the look, the density and the tank pick as they were, and the scene is not touched', () => {
    const { b, S } = journey(), ch = applyChange(b, { animals: [{ species: 'neon', count: 15 }, { species: 'corypanda', count: 6 }] });
    expect(visionOf(ch.state)).toEqual(visionOf(b)); expect(valueOf(ch.state, 'equipment.tank')).toEqual(valueOf(b, 'equipment.tank'));
    const res = reevaluate({ before: b, after: ch.state, scene: S });
    expect(JSON.stringify(res.scene)).toBe(JSON.stringify(S));
  });
});

describe('invariant 3: changing archetype keeps the tank, the selected animals and the applicable constraints', () => {
  it('the project state: another archetype changes only the look', () => {
    const { b } = journey(), ch = applyChange(b, { vision: { archetypeId: other.id, familyId: other.familyId } });
    expect(valueOf(ch.state, 'animals.stock')).toEqual(valueOf(b, 'animals.stock'));
    expect(valueOf(ch.state, 'equipment.tank')).toEqual(valueOf(b, 'equipment.tank'));
    expect(constraintOf(ch.state, 'startup')).toEqual(constraintOf(b, 'startup'));
    expect(visionOf(ch.state).density).toBe('full');
  });
  it('the scene: the new look replaces the pieces only, the roster and tank stay', () => {
    const { b, S } = journey(), gen = recipeScene(other.id, 'full', M40, NEON)!, ho = handOff(S, gen, { brief: b });
    expect(roster(ho.scene)).toEqual(roster(S)); expect(ho.scene.tank).toEqual(S.tank); expect(ho.scene.items).toEqual(gen.items);
  });
});

describe('invariant 4: changing tank dimensions re-evaluates and adapts, never regenerates an unrelated scene', () => {
  it('the same pieces survive (ids, kinds, variants, seeds); a change that is not the tank leaves the scene exactly as it was', () => {
    const { b, S } = journey(), res = reevaluate({ before: b, after: applyChange(b, { tank: { model: M29.id } }).state, scene: S, tank: tankFromModel(M29) });
    const key = (S: TankSetup) => S.items.map(i => `${i.id}:${i.kind}:${i.variant}:${i.seed}`);
    const kept = new Set(key(res.scene)); for (const k of key(S).filter(k => !res.adapt!.thinned.some(t => k.startsWith(`${t.id}:`)))) expect(kept.has(k)).toBe(true);
    const limits = reevaluate({ before: b, after: applyChange(b, { constraints: [{ id: 'startup', value: 900 }] }).state, scene: S });
    expect(JSON.stringify(limits.scene)).toBe(JSON.stringify(S)); expect(limits.changed).toEqual([]);
  });
});

describe('invariant 5: conflicts are surfaced, never resolved by silently removing the user\'s choices', () => {
  it('salt animals in freshwater: the animals stay in the brief and in the scene, the conflict is named with fixes that the person applies', () => {
    const { b, S } = journey(), ch = applyChange(b, { animals: [{ species: 'neon', count: 15 }, { species: SALT.id, count: 2 }] });
    expect(valueOf(ch.state, 'animals.stock')!.length).toBe(2);
    expect(ch.introduced.map(c => c.id)).toContain('water-vs-animals');
    expect(ch.introduced[0].fixes.length).toBeGreaterThan(0);
    const res = reevaluate({ before: b, after: ch.state, scene: S });
    expect(res.warnings.some(w => w.id === 'water-vs-animals' && w.severity === 'hard')).toBe(true);
    expect(res.scene.fish.length).toBe(S.fish.length);
  });
});

describe('invariant 6: generated alternatives stay candidates until the user selects one', () => {
  it('the look\'s own animals are never silently added: skipping Suitable Animals leaves the roster empty, they are offered as suggestions', () => {
    const gen = recipeScene('underwater-forest', 'full', M40)!;   // the density preview, drawn with the look's focal animals
    expect(gen.fish.length).toBeGreaterThan(0);
    const ho = handOff(emptyScene().tanks[0], gen, { accept: [] });
    expect(ho.scene.fish).toEqual([]);
    const b = setVision(emptyBrief(), { secondaryLikes: [], archetypeId: 'underwater-forest', density: 'full' });
    expect(suggestedAnimals(b, M40.id).length).toBeGreaterThan(0);
  });
  it('only the animals the person picked join the roster', () => {
    const gen = recipeScene('underwater-forest', 'full', M40)!, pick = gen.fish[0].species, ho = handOff(emptyScene().tanks[0], gen, { accept: [pick] });
    expect(ho.scene.fish.length).toBeGreaterThan(0); expect(ho.scene.fish.every(f => f.species === pick)).toBe(true);
  });
});

describe('invariant 7: returning to an earlier guided step does not erase later decisions unless they truly no longer apply', () => {
  it('changing an earlier answer keeps the look, the density and the roster, and says what no longer fits', () => {
    const { b } = journey(), ch = applyChange(b, { water: 'saltwater' });
    expect(visionOf(ch.state).archetypeId).toBe('underwater-forest'); expect(visionOf(ch.state).density).toBe('full'); expect(valueOf(ch.state, 'animals.stock')).toEqual(valueOf(b, 'animals.stock'));
    expect(ch.introduced.map(c => c.id)).toEqual(expect.arrayContaining(['water-vs-animals', 'water-vs-look']));
  });
  it('re-choosing the look that is already in the editor changes nothing, so hand edits survive', () => {
    const { b, S } = journey();
    expect(lookUnchanged(S, b, { archetypeId: 'underwater-forest', density: 'full', densityStop: 4 }, M40.id)).toBe(false);   // no recipe saved yet: the first hand-off draws
    const done = setVision(b, { ...visionOf(b), renderRecipe: { look: 'forest', plantMode: 'live', dens: { hard: 1, plant: 1 }, env: 'aquarium' } });
    expect(lookUnchanged(S, done, { archetypeId: 'underwater-forest', density: 'full', densityStop: 4 }, M40.id)).toBe(true);
    expect(lookUnchanged(S, done, { archetypeId: other.id, density: 'full', densityStop: 4 }, M40.id)).toBe(false);
    expect(lookUnchanged(S, done, { archetypeId: 'underwater-forest', density: 'open', densityStop: 0 }, M40.id)).toBe(false);
  });
});

describe('invariant 8: the REQUESTED design stays apart from the currently FEASIBLE one', () => {
  const land = SPECIES.find(s => s.habitat === 'land')!;
  it('an animal that cannot live in this world is retained in the request with the reason and fixes, and left out of the feasible roster', () => {
    const { b } = journey(), c = applyChange(b, { animals: [{ species: 'neon', count: 15 }, { species: land.id, count: 1 }] }).state, f = feasibilityOf(c);
    expect(f.requested.animals.map(a => a.species)).toEqual(['neon', land.id]);
    expect(f.feasible.animals.map(a => a.species)).toEqual(['neon']); expect(f.feasible.ok).toBe(false);
    const r = f.retained.find(x => x.conflict === 'world-vs-animals')!;
    expect(r.what).toMatch(new RegExp(land.name)); expect(r.reason).toMatch(/aquarium/); expect(r.fixes.length).toBeGreaterThan(0);
    expect(valueOf(c, 'animals.stock')!.some(a => a.species === land.id)).toBe(true);   // never dropped
  });
  it('a hard space limit smaller than the tank is kept as the request, with the reason; a fitting one reports nothing', () => {
    const { b } = journey();
    const tight = setConstraint(b, 'space', { w: 24, d: 12 }, 'hard'), f = feasibilityOf(tight);
    expect(f.requested.space).toEqual({ w: 24, d: 12 }); expect(f.retained.some(r => r.conflict === 'enclosure-vs-space' && /bigger than the space/.test(r.reason))).toBe(true);
    expect(enclosureOf(tight).model).toBe(M40.id);   // the chosen tank is still the request
    expect(feasibilityOf(setConstraint(b, 'space', { w: 60, d: 30 }, 'hard')).retained.filter(r => r.conflict === 'enclosure-vs-space')).toEqual([]);
  });
  it('an unaffected design reports nothing retained', () => { expect(feasibilityOf(journey().b).retained).toEqual([]); expect(getItem(journey().b, 'animals.stock')).toBeTruthy(); });
});
