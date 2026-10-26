// Otocinclus targets (Nathan 2026-10-23 and 2026-10-26): 12 in the 15 gal read 75 %, 25 are comfortable (ideal) in a 30 gal breeder and
// 50 in a 55 gal, smaller tanks progressively less defensible (GROUP_GROW); grazing is a caution past what the algae feeds and a problem
// past GRAZE_SEVERE times it (data/grazers.ts).
import { describe, expect, it } from 'vitest';
import { planFor } from '../src/ui/stockPlanLogic';
import { grazerLevel } from '../src/data/grazers';

const space = (n: number, tank: string) => planFor([{ id: 'oto', n }]).options.find(o => o.tank.name === tank)!.spacePct;
const GAL = 3.785;

describe('otocinclus', () => {
  it('keeps Nathan\'s targets', () => {
    expect(space(12, '15 gal')).toBeGreaterThan(74.5);
    expect(space(12, '15 gal')).toBeLessThan(75.5);
    expect(space(25, '30 gal breeder')).toBeLessThanOrEqual(75);
    expect(space(50, '55 gal')).toBeLessThan(75);
    expect(space(25, '20 gal long')).toBeGreaterThan(100);   // smaller tanks less defensible
    expect(space(50, '37 gal')).toBeGreaterThan(100);
  }, 60000);
  it('grades grazing: a caution, then a problem past 4x what the algae feeds', () => {
    expect(grazerLevel('oto', 4, 15 * GAL)).toBeNull();
    expect(grazerLevel('oto', 12, 15 * GAL)).toBe('short');   // feeds 4: 3x stays amber
    expect(grazerLevel('oto', 25, 20 * GAL)).toBe('severe');  // feeds 6
    expect(grazerLevel('oto', 25, 30 * GAL)).toBe('short');   // feeds 9
    expect(grazerLevel('oto', 50, 55 * GAL)).toBe('short');   // feeds 16
    expect(grazerLevel('oto', 50, 40 * GAL)).toBe('severe');  // feeds 12
  });
});
