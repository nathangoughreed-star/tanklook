// Lane DF1: Next on every Discovery step is open only when that step's pick is valid for the route, world, water and family, and Density never opens without a
// look under it (the bug: Next was hidden but not disabled, so a click still went to an empty Density). Pure logic only: src/ui/discovery/logic.ts.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../src/scene/archetypes';
import { SPECIES } from '../src/data/species';
import { NOTHING_KNOWN, firstIn, firstOpen, knownOf, landing, nextIn, setPick, settle, stepReady, type Picks, type Route } from '../src/ui/discovery/logic';

const soon = ARCHETYPES.find(a => a.support === 'coming-soon')!;
const built = ARCHETYPES.find(a => a.support !== 'coming-soon' && a.env === 'aquarium' && a.water === 'freshwater')!;
const other = ARCHETYPES.find(a => a.support !== 'coming-soon' && a.familyId !== built.familyId && a.env === 'aquarium' && a.water === 'freshwater')!;
const pathTo = (a: typeof built): Picks => ({ environment: a.env, waterType: a.env === 'aquarium' ? a.water : null, familyId: a.familyId });

describe('stepReady: Next is open only on a valid pick', () => {
  it('Look: not before a look is picked, yes once one the family offers is', () => {
    const p = pathTo(built);
    expect(stepReady('archetype', p, NOTHING_KNOWN)).toBe(false);
    expect(stepReady('archetype', { ...p, archetypeId: built.id }, NOTHING_KNOWN)).toBe(true);
  });

  it('a look from another family (a stale or carried-over pick) does not count', () => {
    expect(stepReady('archetype', { ...pathTo(built), archetypeId: other.id }, NOTHING_KNOWN)).toBe(false);
    expect(stepReady('family', { environment: 'aquarium', waterType: 'freshwater', familyId: other.familyId }, NOTHING_KNOWN)).toBe(true);
    expect(stepReady('family', { environment: 'terrarium', waterType: null, familyId: built.familyId }, NOTHING_KNOWN)).toBe(false);
  });

  it('a coming-soon look is a saved like, never the pick', () => {
    const p = { environment: soon.env, waterType: soon.env === 'aquarium' ? soon.water : null, familyId: soon.familyId, archetypeId: soon.id } as Picks;
    expect(stepReady('archetype', p, NOTHING_KNOWN)).toBe(false);
    expect(stepReady('density', { ...p, density: 'balanced', densityStop: 2 }, NOTHING_KNOWN)).toBe(false);
    expect(firstIn('look', false, { ...p, density: 'balanced', densityStop: 2 }, NOTHING_KNOWN)).toBe('archetype');
  });

  it('Density needs a look under it, and a density (the slider always holds one)', () => {
    const p = { ...pathTo(built), archetypeId: built.id };
    expect(stepReady('density', { ...pathTo(built), density: 'balanced', densityStop: 2 }, NOTHING_KNOWN)).toBe(false);   // a density but no look
    expect(stepReady('density', p, NOTHING_KNOWN)).toBe(false);
    expect(stepReady('density', p, NOTHING_KNOWN, true)).toBe(true);
    expect(stepReady('density', { ...p, density: 'full', densityStop: 4 }, NOTHING_KNOWN)).toBe(true);
  });

  it('Animals is optional, World and Water follow what is on offer', () => {
    expect(stepReady('animals', {}, NOTHING_KNOWN)).toBe(true);
    expect(stepReady('environment', {}, NOTHING_KNOWN)).toBe(false);
    expect(stepReady('environment', { environment: 'aquarium' }, NOTHING_KNOWN)).toBe(true);
    expect(stepReady('water', { environment: 'aquarium' }, NOTHING_KNOWN)).toBe(false);
    expect(stepReady('water', { environment: 'aquarium', waterType: 'saltwater' }, knownOf(['betta']))).toBe(false);   // freshwater animals: saltwater is not offered
  });
});

describe('landing: a move never goes past a step still waiting', () => {
  for (const route of ['look', 'animals'] as Route[]) {
    it(`${route}: Next with no look picked lands back on Look, not on an empty Density`, () => {
      const p = pathTo(built);
      expect(landing(route, false, nextIn(route, false, 'archetype', p, NOTHING_KNOWN), p, NOTHING_KNOWN)).toBe('archetype');
      expect(landing(route, false, 'density', p, NOTHING_KNOWN)).toBe('archetype');
      expect(landing(route, false, 'done', p, NOTHING_KNOWN)).toBe('archetype');
    });
    it(`${route}: with a valid look the move goes where it was asked`, () => {
      const p = { ...pathTo(built), archetypeId: built.id };
      expect(landing(route, false, 'density', p, NOTHING_KNOWN)).toBe('density');
      expect(landing(route, false, 'done', p, NOTHING_KNOWN)).toBe('done');
      expect(landing(route, false, 'archetype', p, NOTHING_KNOWN)).toBe('archetype');   // going back is always allowed
    });
  }

  it('Density with no family sends the person back to Family', () => {
    const p = { environment: 'aquarium', waterType: 'freshwater', archetypeId: built.id } as Picks;
    expect(landing('look', false, 'density', p, NOTHING_KNOWN)).toBe('family');
  });

  it('picking a different family clears the look, so Next closes until a new one is picked', () => {
    const p = setPick({ ...pathTo(built), archetypeId: built.id }, 'family', other.familyId);
    expect(p.archetypeId).toBeUndefined();
    expect(stepReady('archetype', p, NOTHING_KNOWN)).toBe(false);
  });
});

describe('every route, roster, tank and carried-over pick: the first step shown is never an empty Density', () => {
  const species = (SPECIES as { id: string }[]).map(s => s.id), rosters: string[][] = [[], ...species.filter((_, i) => i % 7 === 0).map(s => [s])];
  it('restart lands on a step whose earlier picks are valid', () => {
    const bad: string[] = [];
    for (const route of ['look', 'animals'] as Route[]) for (const ownsWorld of [false, true]) for (const r of rosters) for (const gal of [undefined, 5, 10, 20, 55]) {
      const k = knownOf(r, gal);
      for (const a of [undefined, ...ARCHETYPES]) for (const dens of [undefined, 'balanced' as const]) {
        const raw: Picks = { ...(a ? { ...pathTo(a), archetypeId: a.id } : {}), ...(dens ? { density: dens, densityStop: 2 } : {}) };
        const p = settle(raw, k).picks, s0 = firstIn(route, ownsWorld, p, k), at = s0 === 'done' ? 'density' : s0;
        const where = `${route}/${ownsWorld} ${a?.id} ${r.join()} ${gal}`;
        if (at === 'density' && !stepReady('archetype', p, k)) bad.push(`density without a valid look: ${where}`);
        if (landing(route, ownsWorld, at, p, k) !== at) bad.push(`landing moves the first step: ${where}`);
        if (firstOpen(p, k) === 'done' && !stepReady('archetype', p, k)) bad.push(`firstOpen done without a look: ${where}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
