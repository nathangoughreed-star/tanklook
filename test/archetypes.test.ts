import { describe, expect, it } from 'vitest';
import { ARCHETYPES, DEPS, ENVIRONMENTS, FAMILIES, WATERS, archetype, archetypesOf, family, familiesOf, type Env, type Water } from '../src/scene/archetypes';
import { LAYOUTS } from '../src/scene/items';

const ids = [...ENVIRONMENTS, ...WATERS, ...FAMILIES, ...ARCHETYPES].map(c => c.id);

describe('archetype registry (lane VD1)', () => {
  it('has unique ids across environments, waters, families and archetypes', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every card a name and a one-line tagline', () => {
    for (const c of [...ENVIRONMENTS, ...WATERS, ...FAMILIES, ...ARCHETYPES]) {
      expect(c.name, c.id).toBeTruthy();
      expect(c.tagline, c.id).toBeTruthy();
      expect(c.tagline, c.id).not.toMatch(/\n/);
    }
    // Taglines never promise what the engine may contradict.
    for (const c of [...FAMILIES, ...ARCHETYPES]) expect(c.tagline, c.id).not.toMatch(/\b(cheap|easy)\b/i);
  });

  it('has the spec family lists per branch, in order', () => {
    const names = (env: Env, w: Water | null) => familiesOf(env, w).map(f => f.name);
    expect(names('aquarium', 'freshwater')).toEqual(['Underwater Gardens', 'Sculpted Nature', 'Wild Habitats', 'Clean & Minimal', 'Bright & Playful', 'Fish Showcases']);
    expect(names('aquarium', 'saltwater')).toEqual(['Living Coral Gardens', 'Fish-First Oceans', 'Natural Ocean Habitats', 'Sculpted Reef Landscapes', 'Glowing & Otherworldly']);
    expect(names('aquarium', 'brackish')).toEqual(['Mangrove & Estuary', 'Mudflat & Shoreline', 'Rocky Coast & Tidepool', 'Fish-First Brackish Habitats', 'Brackish Planting']);
    expect(names('terrarium', null)).toEqual(['Tropical Rainforest', 'Desert & Drylands', 'Enchanted Woodland', 'Rocks, Cliffs & Canopies', 'Botanical Worlds', 'Creature Showcases']);
    expect(names('paludarium', null)).toEqual(['Rainforest Waterfalls', 'Overgrown Riverbanks', 'Swamps & Mangroves', 'Rocky Streams & Cliffs', 'Fantasy Water Gardens', 'Waterside Creature Habitats']);
    // Terrarium and paludarium ignore a stray water type.
    expect(familiesOf('terrarium', 'freshwater')).toEqual(familiesOf('terrarium', null));
    expect(FAMILIES.length).toBe(28);
  });

  it('gives every family a flat placeholder colour', () => {
    for (const f of FAMILIES) expect(f.colour, f.id).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('resolves every family, cross-link, alternative and contrast sibling', () => {
    for (const a of ARCHETYPES) {
      const f = family(a.familyId);
      expect(f, `${a.id} family`).toBeDefined();
      expect(f!.env, a.id).toBe(a.env);
      expect(f!.water, a.id).toBe(a.water);
      for (const x of a.alsoIn ?? []) expect(family(x), `${a.id} alsoIn ${x}`).toBeDefined();
      if (a.alternative) expect(archetype(a.alternative), `${a.id} alternative`).toBeDefined();
      // Milestone 1 names siblings that milestone 2 adds; milestone 2 makes this strict.
      expect(a.contrast.sibling, a.id).not.toBe(a.id);
    }
  });

  it('fills every archetype field', () => {
    for (const a of ARCHETYPES) {
      expect(a.fingerprint.length, a.id).toBeGreaterThanOrEqual(2);
      expect(a.fingerprint.length, a.id).toBeLessThanOrEqual(4);
      expect(a.contrast.how, a.id).toBeTruthy();
      expect(a.recipe.notes, a.id).toBeTruthy();
      for (const d of ['open', 'balanced', 'full'] as const) {
        expect(a.density[d].label, `${a.id} ${d}`).toBeTruthy();
        expect(a.density[d].note, `${a.id} ${d}`).toBeTruthy();
      }
      for (const d of a.deps) expect(DEPS as readonly string[], `${a.id} dep ${d}`).toContain(d);
      expect(a.env === 'aquarium' ? a.water : null, a.id).toBe(a.water);
    }
  });

  it('maps only to looks that exist', () => {
    for (const a of ARCHETYPES) for (const l of a.recipe.looks) expect(LAYOUTS[l], `${a.id} look ${l}`).toBeDefined();
  });

  it('sets support by rule and gives every coming-soon a partial alternative', () => {
    for (const a of ARCHETYPES) {
      expect(a.support, a.id).toBe(a.recipe.looks.length ? 'partial' : 'coming-soon');
      if (a.support !== 'coming-soon') continue;
      expect(a.alternative, `${a.id} needs an alternative`).toBeDefined();
      expect(archetype(a.alternative!)!.support, `${a.id} -> ${a.alternative}`).not.toBe('coming-soon');
    }
  });

  it('has archetypes in every family (no dead ends), cross-links included', () => {
    for (const f of FAMILIES) expect(archetypesOf(f.id).length, f.id).toBeGreaterThanOrEqual(1);
    // The mudskipper mudflat is found under Brackish and shown again under the paludarium creature habitats (spec 01).
    expect(archetypesOf('pa-creature').map(a => a.id)).toContain('mudskipper-mudflat');
    expect(archetype('mudskipper-mudflat')!.resolvesTo).toBe('paludarium');
  });
});
