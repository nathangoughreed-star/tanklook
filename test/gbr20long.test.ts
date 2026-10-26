// A pair of German blue rams in a 20 gal long (30 x 12 x 12 in) reads Recommended, not "below the recommended size" (Nathan 2026-10-26):
// the gallon figure names the catalogue size, and the glass holds up to 10 % less (71 L against 75.7), the slack every red line gets.
import { describe, expect, it } from 'vitest';
import { comboTank } from './aqcompare.test';
import { tankMinimum } from '../src/scene/tankMin';
import { minBar } from '../src/ui/fullnessTile';

describe('gallon figure vs the catalogue size', () => {
  it('a pair of rams in a 20 long is green on the tank minimum bar; a 10 gal still is not', () => {
    expect(minBar(tankMinimum(comboTank({ name: '', tank: [30, 12, 12], stock: [['gbr', 2]] }))).level).toBe('ok');
    expect(minBar(tankMinimum(comboTank({ name: '', tank: [20, 10, 12], stock: [['gbr', 2]] }))).level).not.toBe('ok');
  });
});
