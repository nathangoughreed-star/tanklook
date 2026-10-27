import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/data/species';
import { coopGoldfish, groupMinimum, stockingGroupMinimum } from '../src/scene/groupMin';

describe('group minimum tank', () => {
  it('gives a catalogue tank for the recommended minimum group', () => {
    const g = groupMinimum('neon')!;
    expect(g.n).toBeGreaterThanOrEqual(6);
    expect(g.gal).toBeGreaterThan(5);
    expect(g.dims).toMatch(/×/);
    expect(g.basis).toBe('tankmin');
  });
  it('goldfish keep the Fishkeeping World minimum and carry the Co-Op rule as a cross-check', () => {
    const g = groupMinimum('goldfish')!;
    expect(g.site).toBe('Fishkeeping World');
    expect(g.crossCheck?.site).toBe('Aquarium Co-Op');
    expect(coopGoldfish(1, 0).states).toContain('20 gal');
    expect(coopGoldfish(3, 0).states).toContain('40 gal');
    expect(groupMinimum('neon')!.crossCheck).toBeUndefined();
  });
  it('whole stocking = the largest single answer; unknown species are listed, not warned', () => {
    const r = stockingGroupMinimum(['neon', 'oscar', 'neon']);
    expect(r.rows.length).toBe(2);
    expect(r.tank?.by).toBe('Oscar');
    expect(stockingGroupMinimum(['nosuchspecies']).noData).toEqual(['nosuchspecies']);
  });
  it('answers (or declines) for every species without throwing', () => {
    let none = 0;
    for (const s of SPECIES) if (!groupMinimum(s)) none++;
    expect(none).toBeLessThan(SPECIES.length);
  });
});
