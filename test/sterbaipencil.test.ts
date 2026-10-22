// Sterba's corydoras and the dwarf pencilfish (2026-10-22): the classic ram and Apistogramma companions, added so the tankmate list
// for German blue rams is not near-empty. Sources: Seriously Fish and FishBase (research/sourcing/N1.json, research/climate/batch-11.md).
import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { getSpecies } from '../src/data/species';
import { crowdWarnings } from '../src/scene/territory';
import { conflictsOf, rankTankmates } from '../src/ui/stockPlanLogic';
import { comboTank } from './aqcompare.test';

describe('sterbai and dwarf pencilfish', () => {
  it('are in the catalogue with their care data', () => {
    expect(getSpecies('sterbai')?.sci).toBe('Corydoras sterbai');
    expect(getSpecies('dwarfpencil')?.sci).toBe('Nannostomus marginatus');
    expect(CARE.sterbai.temp).toEqual([24, 28]);       // Seriously Fish 24-28
    expect(CARE.dwarfpencil.temp).toEqual([24, 28]);
    expect(CARE.sterbai.group).toBe(6);                // SF: a group of at least six
    expect(CARE.dwarfpencil.zone).toBe('middle');
  });

  it('both are suggested as tankmates for a German blue ram pair', () => {
    const mates = rankTankmates([{ id: 'gbr', n: 2 }]);
    for (const id of ['sterbai', 'dwarfpencil']) {
      const m = mates.find(x => x.sp.id === id)!;
      expect(m.ok, `${id}: ${m.why}`).toBe(true);
    }
    // the warm cory is the point: the cooler bronze cory does not share the ram's water
    expect(mates.find(x => x.sp.id === 'bronzecory')!.ok).toBe(false);
  });

  it('a cockatoo pair with 9 dwarf pencilfish in a 24 x 12 x 12 in tank: no fighting warning, no clash', () => {
    const S = comboTank({ name: '', tank: [24, 12, 12], stock: [['cockatoo', 2], ['dwarfpencil', 9]] });
    S.fish.forEach((x, i) => { if (i === 1) x.sex = 'f'; });
    expect(crowdWarnings(S)).toEqual([]);
    expect(conflictsOf([{ id: 'cockatoo', n: 1, f: 1 }, { id: 'dwarfpencil', n: 9 }], 'dwarfpencil')).toEqual([]);
  });
});
