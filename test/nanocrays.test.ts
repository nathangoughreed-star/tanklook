// Nano schoolers, crayfish, Thai micro crab and aquatic isopod (S238, 2026-10-26). Sources: research/groups-sources.md, src/data/provenance.ts.
import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { NEEDS } from '../src/data/careNeeds';
import { getSpecies } from '../src/data/species';
import { conflictsOf, rankTankmates } from '../src/ui/stockPlanLogic';

const NANO = ['greenneon', 'merah', 'exclamation', 'dwarfrasbora'];
const CRAYS = ['cpo', 'cajundwarf', 'rswcrayfish', 'redclaw'];

describe('nano schoolers', () => {
  it('are catalogued as schools of 8 or more in a 41 L (45 x 30 cm) tank, 22-27 C', () => {
    for (const id of NANO) {
      expect(getSpecies(id)?.group, id).toBe('school');
      expect(CARE[id].group, id).toBe(8);
      expect(CARE[id].minL, id).toBe(41);
      expect(CARE[id].temper, id).toBe(0);
      expect(CARE[id].temp![0], id).toBeGreaterThanOrEqual(22);
      expect(CARE[id].temp![1], id).toBeLessThanOrEqual(27);
    }
    expect(getSpecies('greenneon')?.sci).toBe('Paracheirodon simulans');
    expect(getSpecies('merah')?.sci).toBe('Boraras merah');
  });
});

describe('crayfish', () => {
  it('are catalogued and every one needs a lid', () => {
    for (const id of CRAYS) {
      expect(getSpecies(id)?.cat, id).toBe('fw-invert');
      expect((NEEDS[id] ?? []).some(n => n.text.startsWith('Lid')), id).toBe(true);
    }
    expect(getSpecies('cpo')?.sci).toBe('Cambarellus patzcuarensis');
    expect(getSpecies('redclaw')?.sci).toBe('Cherax quadricarinatus');
  });

  it('dwarf crayfish take shrimp but not nano fish; the large ones take small fish too', () => {
    expect(conflictsOf([{ id: 'cpo', n: 1 }, { id: 'cherryshrimp', n: 10 }], 'cherryshrimp').length).toBeGreaterThan(0);
    expect(conflictsOf([{ id: 'cpo', n: 1 }, { id: 'exclamation', n: 10 }], 'exclamation')).toEqual([]); // the one nano school whose water (pH 6-7, GH 1-10) overlaps a crayfish's
    // the soft acidic Boraras do not share a crayfish's hard water: a chemistry block, not a predation one
    expect(conflictsOf([{ id: 'cpo', n: 1 }, { id: 'merah', n: 10 }], 'merah').every(c => c.text.startsWith('water'))).toBe(true);
    for (const id of ['rswcrayfish', 'redclaw']) {
      expect(conflictsOf([{ id, n: 1 }, { id: 'merah', n: 10 }], 'merah').length, id).toBeGreaterThan(0);
      expect(conflictsOf([{ id, n: 1 }, { id: 'nerite', n: 1 }], 'nerite').length, id).toBeGreaterThan(0);
    }
  });

  it('one large crayfish per tank', () => {
    expect(CARE.rswcrayfish.solo).toBe(true);
    expect(CARE.redclaw.solo).toBe(true);
  });
});

describe('micro crab and isopod', () => {
  it('the Thai micro crab sits peacefully with shrimp and the exclamation point rasbora', () => {
    expect(getSpecies('thaicrab')?.sci).toBe('Limnopilos naiyanetri');
    expect(CARE.thaicrab.group).toBe(5);
    expect(conflictsOf([{ id: 'thaicrab', n: 5 }, { id: 'cherryshrimp', n: 10 }], 'cherryshrimp')).toEqual([]);
    expect(conflictsOf([{ id: 'thaicrab', n: 5 }, { id: 'exclamation', n: 10 }], 'thaicrab')).toEqual([]);
  });

  it('the isopod is a detritus colony', () => {
    expect(getSpecies('asellus')?.sci).toBe('Asellus aquaticus');
    expect(CARE.asellus.group).toBe(10);
    expect(rankTankmates([{ id: 'cpo', n: 1 }]).find(m => m.sp.id === 'asellus')).toBeDefined();
  });
});
