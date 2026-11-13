// AQ1 (2026-11-13): aquarium scope (src/scope.ts) hides every terrarium, paludarium and herp option at the choke points; scope 'all' restores them.
// Vitest starts in 'all' (so the engine tests are untouched); each test here switches scope itself.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aquariumOnly, setScope, scope } from '../src/scope';
import { SPECIES, categoriesInScope, searchSpecies } from '../src/data/species';
import { scopeSpecies } from '../src/scope';
import { setupKinds, SETUP_KINDS } from '../src/scene/pickerKind';
import { habitatChoices, ALL_HABITAT_CHOICES } from '../src/ui/startScreenLogic';
import { WORLD_CARDS, worldCards } from '../src/ui/guided/logic';
import { NOTHING_KNOWN, envChoices } from '../src/ui/discovery/logic';
import { ALL_STYLE_GROUPS, LIBRARY, isLandStyle, isSwampy, styleGroups, variantInScope } from '../src/scene/items';
import { ARCHETYPES } from '../src/scene/archetypes';
import { isBuildable } from '../src/explore/pool';
import { lookOrder } from '../src/ui/explore/session';
import { EXAMPLES, examplesInScope } from '../src/examples';
import { archetypesFor } from '../src/scene/quickArchetypes';
import { QUICK_ARCHETYPES } from '../src/scene/quickArchetypes';
import { stockingSuggestion, suitableAnimals } from '../src/ui/discovery/animals';
import { TANK_MODELS } from '../src/data/tanks';
import { archetype } from '../src/scene/archetypes';
import { getSpecies } from '../src/data/species';
import { kindInScope } from '../src/scope';

const HERP_CATS = new Set(['amphibian', 'reptile', 'land-invert']);
beforeEach(() => setScope('aquarium'));
afterEach(() => setScope('all'));

describe('aquarium scope', () => {
  it('is the mode under test here, and vitest otherwise runs in all', () => { expect(aquariumOnly()).toBe(true); setScope('all'); expect(scope()).toBe('all'); });
  it('no reptile, amphibian or land invertebrate reaches the species lists or search', () => {
    expect(scopeSpecies(SPECIES).some(s => HERP_CATS.has(s.cat))).toBe(false);
    expect(scopeSpecies(SPECIES).length).toBeGreaterThan(40);
    expect(categoriesInScope().map(c => c[0])).toEqual(['fw-fish', 'fw-invert', 'sw-fish', 'sw-invert']);
    for (const q of ['gecko', 'frog', 'python', 'tarantula', 'newt']) expect(searchSpecies(q).some(s => HERP_CATS.has(s.cat)), q).toBe(false);
  });
  it('the world, habitat and kind choices are the aquariums only', () => {
    expect(worldCards().map(c => c.id)).toEqual(['aquarium']);
    expect(habitatChoices().map(c => c.id)).toEqual(['freshwater', 'saltwater']);
    expect(setupKinds().map(k => k[0])).toEqual(['freshwater', 'saltwater']);
    expect(envChoices(NOTHING_KNOWN).items.map(c => c.id)).toEqual(['aquarium']);
    expect(setupKinds().map(k => k[2]).join(' ')).not.toMatch(/frog/i);
  });
  it('no terrarium or paludarium style, land plant or herp furniture is offered; riparium plants stay', () => {
    const ids = styleGroups().flatMap(g => g.ids);
    expect(ids.some(i => isLandStyle(i) || isSwampy(i))).toBe(false);
    expect(ids).toEqual(expect.arrayContaining(['planted', 'reef', 'blackwater', 'malawi']));
    for (const v of ['pothos', 'echeveria', 'bromeliad', 'barrel', 'climb', 'halflog', 'dish', 'stonedish']) expect(variantInScope(v), v).toBe(false);
    for (const v of ['anubias', 'peacelily', 'monstera', 'rimplanter'].filter(v => LIBRARY[v])) expect(variantInScope(v), v).toBe(true);
  });
  it('Discover never draws a terrarium or paludarium look, and the quick cards are aquariums only', () => {
    const looks = ARCHETYPES.filter(isBuildable);
    expect(looks.length).toBeGreaterThan(10);
    expect(looks.every(a => a.env === 'aquarium')).toBe(true);
    const order = lookOrder();
    expect(order.length).toBeGreaterThan(5);
    expect(order.every(id => ARCHETYPES.find(a => a.id === id)!.env === 'aquarium')).toBe(true);
    for (const d of ['terrarium', 'paludarium', 'unsure'] as const) expect(archetypesFor(d).every(a => a.habitat === 'freshwater' || a.habitat === 'saltwater'), d).toBe(true);
    expect(archetypesFor('freshwater').length).toBeGreaterThan(0);
  });
  it('the starter gallery drops the land examples', () => {
    expect(examplesInScope().some(x => /gecko|frog|paludarium|python|terrarium/i.test(x.name))).toBe(false);
    expect(examplesInScope().length).toBeGreaterThan(4);
  });
  it('a suggested stocking draws no land animal', () => {
    const tank = TANK_MODELS.find(m => m.name === '40 gal breeder' && !m.terrarium)!;
    for (const id of ['blackwater-creek', 'iwagumi-stone-garden']) {
      const a = archetype(id)!, r = suitableAnimals(a, tank);
      expect(r.list.length, id).toBeGreaterThan(0);
      expect(r.list.some(s => HERP_CATS.has(s.sp.cat)), id).toBe(false);
      expect(stockingSuggestion(a, tank).every(c => !HERP_CATS.has(getSpecies(c.species)!.cat)), id).toBe(true);
    }
  });
});

describe('scope all restores today\'s app', () => {
  it('every option is back', () => {
    setScope('all');
    expect(scopeSpecies(SPECIES).length).toBe(SPECIES.length);
    expect(worldCards().map(c => c.id)).toEqual(WORLD_CARDS.map(c => c.id));
    expect(habitatChoices().length).toBe(ALL_HABITAT_CHOICES.length);
    expect(setupKinds().length).toBe(SETUP_KINDS.length);
    expect(styleGroups().flatMap(g => g.ids).length).toBe(ALL_STYLE_GROUPS.flatMap(g => g.ids).length);
    expect(examplesInScope().length).toBe(EXAMPLES.length);
    expect(archetypesFor('terrarium').length).toBe(QUICK_ARCHETYPES.filter(a => a.habitat === 'terrarium').length);
    expect(kindInScope('terrarium')).toBe(true);
    expect(envChoices(NOTHING_KNOWN).items.map(c => c.id)).toContain('terrarium');
  });
});
