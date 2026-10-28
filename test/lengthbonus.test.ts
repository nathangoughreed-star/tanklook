// Lane LB prototype: the swimmer length bonus (stocking.ts, off by default) and the turning-clearance heuristic (turnclear.ts, not wired).
import { afterEach, describe, expect, it } from 'vitest';
import { LENGTH_BONUS, lengthBetaOf, lengthFactor, stockingOf } from '../src/scene/stocking';
import { turnExempt, turnNeedMm, turnPct, turnWidthMm } from '../src/scene/turnclear';
import { getSpecies } from '../src/data/species';
import { bareSetup } from '../src/scene/defaults';
import { comboTank } from './aqcompare.test';

const sp = (id: string) => getSpecies(id)!;
afterEach(() => { LENGTH_BONUS.on = false; });

describe('length bonus', () => {
  it('is off by default: the factor is 1 whatever the shape', () => {
    expect(LENGTH_BONUS.on).toBe(false);
    for (const wl of [0.1, 0.5, 1]) expect(lengthFactor(sp('danio'), wl)).toBe(1);
  });
  it('leaves the reference shape alone, rewards longer tanks, penalises squarer ones, never past the cap', () => {
    LENGTH_BONUS.on = true;
    const d = sp('danio');
    expect(lengthFactor(d, LENGTH_BONUS.refWL)).toBeCloseTo(1, 12);
    expect(lengthFactor(d, 0.25)).toBeGreaterThan(1);
    expect(lengthFactor(d, 1)).toBeLessThan(1);
    expect(lengthFactor(d, 0.01)).toBeCloseTo(lengthFactor(d, LENGTH_BONUS.minWL), 12);
  });
  it('bottom dwellers and land animals get none; fast schoolers the most', () => {
    expect(lengthBetaOf(sp('bronzecory'))).toBe(0);
    expect(lengthBetaOf(sp('leopardgecko'))).toBe(0);
    expect(lengthBetaOf(sp('danio'))).toBeGreaterThan(lengthBetaOf(sp('neon')));
    expect(lengthBetaOf(sp('neon'))).toBeGreaterThan(lengthBetaOf(sp('betta')));
  });
  it('stockingOf: a 2:1 tank reads the same on or off, a 4:1 of the same area reads lower on, a square higher', () => {
    const at = (L: number, D: number) => { const s = comboTank({ name: 'x', tank: [L, D, 21], stock: [['danio', 24]] }); return stockingOf(s).percent; };
    const off = [at(36, 36), at(51, 25.5), at(72, 18)];
    LENGTH_BONUS.on = true;
    const on = [at(36, 36), at(51, 25.5), at(72, 18)];
    expect(on[0]).toBeGreaterThan(off[0]);
    expect(Math.abs(on[1] / off[1] - 1)).toBeLessThan(0.01);
    expect(on[2]).toBeLessThan(off[2]);
    expect(bareSetup().fish.length).toBe(0);
  });
});

describe('turning clearance (heuristic)', () => {
  it('wants k x adult length; coiling and long-tailed bodies are exempt', () => {
    expect(turnNeedMm(sp('oscar'), 1.5)).toBeCloseTo(1.5 * sp('oscar').tl, 9);
    expect(turnExempt(sp('ballpython'))).toBe(true);
    expect(turnNeedMm(sp('ballpython'), 2)).toBe(0);
  });
  it('a 2 in wide slot fails a danio at 1.5 x but not at 1 x; a sourced width is never weakened', () => {
    const g = { widthMm: 50.8 };
    expect(turnPct(sp('danio'), g, 1)).toBeLessThan(100);
    expect(turnPct(sp('danio'), g, 1.5)).toBeGreaterThan(100);
    expect(turnWidthMm(sp('danio'), 1, 400)).toBe(400);
  });
});
