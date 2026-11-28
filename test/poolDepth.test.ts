// R200 (APPROVED, Nathan 2026-11-27 "Approve 1.5x"): a fully aquatic fish is stocked in a paludarium pool only if the pool is >= POOL_BODY_HEIGHTS x its body height deep.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../src/scene/archetypes';
import { getTankModel } from '../src/data/tanks';
import { getSpecies } from '../src/data/species';
import { POOL_BODY_HEIGHTS, minPoolDepthMm, poolDepthMm, poolTooShallowIn, catalogueSizes } from '../src/scene/tankfit';
import { rosterPlan } from '../src/ui/discovery/animals';

const land = [{ species: 'dartfrog', n: 2 }, { species: 'firenewt', n: 2 }];
const tooShallow = (tank: string, id: string) => poolTooShallowIn(getTankModel(tank)!, land, { species: id, n: 1 });
const poolOf = (tank: string) => poolDepthMm(catalogueSizes(false).find(c => c.m.id === tank)!.T, land);

describe('pool depth for fully aquatic fish (R200, approved)', () => {
  it('the need is 1.5 x body height (tl x aspect); land and semi-aquatic animals have none', () => {
    expect(POOL_BODY_HEIGHTS).toBe(1.5);
    expect(minPoolDepthMm(getSpecies('neon')!)).toBeCloseTo(1.5 * 38 * 0.407, 1);
    expect(minPoolDepthMm(getSpecies('firenewt')!)).toBe(0);
    expect(minPoolDepthMm(getSpecies('dartfrog')!)).toBe(0);
  });
  it('30 gal breeder, pool 2.7 mm: neon and oscar are kept out', () => {
    expect(poolOf('g30b')).toBeCloseTo(2.7, 0);
    expect(tooShallow('g30b', 'neon')).toBe(true); expect(tooShallow('g30b', 'oscar')).toBe(true);
  });
  it('55 gal, pool 5 mm: neon and oscar are kept out', () => {
    expect(poolOf('g55')).toBeCloseTo(5.1, 0);
    expect(tooShallow('g55', 'neon')).toBe(true); expect(tooShallow('g55', 'oscar')).toBe(true);
  });
  it('75 gal, pool 64 mm (2.5 in): neon and guppy swim in, oscar (needs 261 mm) does not', () => {
    expect(poolOf('g75')).toBeCloseTo(64, 0);
    expect(tooShallow('g75', 'neon')).toBe(false); expect(tooShallow('g75', 'guppy')).toBe(false); expect(tooShallow('g75', 'oscar')).toBe(true);
  });
  it('the cypress swamp in the 30 gal breeder is dart frogs, fire newts and ramshorn snails, no fish', () => {
    const r = rosterPlan(ARCHETYPES.find(a => a.id === 'cypress-swamp')!, getTankModel('g30b')!).roster.map(c => c.species).sort();
    expect(r).toEqual(['dartfrog', 'firenewt', 'ramshorn']);
  });
});
