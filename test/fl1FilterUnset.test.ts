// Lane FL1 (Nathan 2026-11-03): a filter the scene draws is the tank's chosen filter, so the tile / summary never say "No filter chosen" over a drawn one.
import { describe, expect, it } from 'vitest';
import { getTankModel } from '../src/data/tanks';
import { ARCHETYPES } from '../src/scene/archetypes';
import { emptyScene } from '../src/scene/defaults';
import { handOff } from '../src/scene/reeval';
import { recipeScene } from '../src/scene/recipes';
import { filterState, setFilterless } from '../src/scene/tech';
import { gearPicks } from '../src/render/gear3d';
import type { TankSetup } from '../src/scene/types';

const M = getTankModel('g55') ?? getTankModel('g40b')!;
const drawsFilter = (S: TankSetup) => gearPicks(S).some(p => p.row === 'filter');
const animals = [{ species: 'zebra-danio', n: 6 }, { species: 'honey-gourami', n: 2 }];
const scenes = (): [string, TankSetup][] => {
  const out: [string, TankSetup][] = [];
  for (const a of ARCHETYPES) {
    const S = recipeScene(a.id, 'balanced', M, animals);
    if (!S) continue;
    out.push([`${a.id} recipe`, S]);
    const cur = emptyScene().tanks[0];
    out.push([`${a.id} hand-off`, handOff(cur, S, { accept: animals.map(x => x.species) }).scene]);
    out.push([`${a.id} animals first`, { ...S, stockFirst: true }]);
  }
  return out;
};

describe('FL1: drawn filter == chosen filter', () => {
  const all = scenes();
  it('sweeps some scenes', () => expect(all.length).toBeGreaterThan(10));
  it('a scene that draws a filter never reads unset, and one that reads unset draws none', () => {
    for (const [n, S] of all) {
      if (!S.water.on) continue;
      const draws = drawsFilter(S), st = filterState(S);
      if (draws) expect(st, n).not.toBe('unset');
      if (st === 'unset') expect(draws, n).toBe(false);
    }
  });
  it('ticking "no filter" draws none and reads filterless', () => {
    const S = structuredClone(all.find(([n]) => n.endsWith('recipe'))![1]); setFilterless(S, true);
    expect(filterState(S)).toBe('filterless'); expect(drawsFilter(S)).toBe(false);
  });
});
