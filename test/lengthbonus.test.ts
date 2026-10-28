// Lane LB prototype: the swimmer length bonus (stocking.ts, off by default) and the turning-clearance heuristic (turnclear.ts, not wired).
import { afterEach, describe, expect, it } from 'vitest';
import { LENGTH_BONUS, lengthBetaOf, lengthFactor, stockingOf } from '../src/scene/stocking';
import { TURN_K, turnExempt, turnNeedMm, turnPct, turnWidthMm } from '../src/scene/turnclear';
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

describe('length bonus x turning clearance (Nathan 2026-10-28)', () => {
  it('a geometry failing clearance gets no positive credit: raw B_L becomes 1 before the reference normalisation', () => {
    LENGTH_BONUS.on = true;
    const d = sp('danio'), ok = turnNeedMm(d, TURN_K), refBl = 1 + lengthBetaOf(d) * (1 - Math.sqrt(LENGTH_BONUS.refWL));
    expect(lengthFactor(d, 0.1, ok)).toBeGreaterThan(1);                       // wide enough: full credit
    expect(lengthFactor(d, 0.1, ok - 1)).toBeCloseTo(1 / refBl, 12);            // one mm short: none, and the reference credit is gone too
    expect(lengthFactor(d, 0.1, ok - 1)).toBeLessThan(1);
    expect(lengthFactor(d, 0.1)).toBe(lengthFactor(d, 0.1, ok));                // no width given: not checked
  });
  it('stockingOf: the same fish read higher in a 72 x 2 in slot than in a 72 x 5 in tank of equal height once the bonus is on', () => {
    const at = (D: number) => stockingOf(comboTank({ name: 'x', tank: [72, D, 12], stock: [['danio', 6]] })).percent;
    LENGTH_BONUS.on = true;
    const thinPct = at(2) / at(3.5);
    LENGTH_BONUS.on = false;
    const offPct = at(2) / at(3.5);
    expect(thinPct).toBeGreaterThan(offPct); // the credit is withdrawn from the failing slot (2 in < 1.5 x 2.5 in), not given
  });
  it('the exempt bodies are never refused', () => {
    LENGTH_BONUS.on = true;
    expect(lengthFactor(sp('kuhli'), 0.1, 10)).toBeCloseTo(lengthFactor(sp('kuhli'), 0.1), 12);
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
