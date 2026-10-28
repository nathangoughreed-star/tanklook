// Lane LB prototype: the swimmer length bonus (stocking.ts, off by default) and the turning-clearance heuristic (turnclear.ts, not wired).
import { afterEach, describe, expect, it } from 'vitest';
import { LENGTH_BONUS, elongationOf, epsRect, lengthBetaOf, lengthFactor, stockingOf } from '../src/scene/stocking';
import { TURN_K, turnExempt, turnNeedMm, turnPct, turnWidthMm } from '../src/scene/turnclear';
import { getSpecies } from '../src/data/species';
import { bareSetup } from '../src/scene/defaults';
import { comboTank } from './aqcompare.test';

const sp = (id: string) => getSpecies(id)!;
afterEach(() => { LENGTH_BONUS.on = false; });

const IN = 25.4;
const tankOf = (shape: 'rect' | 'round' | 'poly', L: number, D: number, sides?: number) => ({ ...bareSetup().tank, shape, L: L * IN, D: D * IN, H: 21 * IN, ...(sides ? { sides } : {}) });
const rectOf = (wl: number) => tankOf('rect', 100, 100 * wl);
const bl = (id: string, eps: number) => 1 + lengthBetaOf(sp(id)) * Math.min(LENGTH_BONUS.maxEps, eps);

describe('length bonus', () => {
  it('is off by default: the factor is 1 whatever the shape', () => {
    expect(LENGTH_BONUS.on).toBe(false);
    for (const e of [0, 0.3, 0.6]) expect(lengthFactor(sp('danio'), e)).toBe(1);
  });
  it('elongation: circle 0, square 0.20, 2:1 0.29, 4:1 0.45, 8:1 0.60, hexagon between circle and square', () => {
    const round = elongationOf(tankOf('round', 36, 36)), sq = elongationOf(rectOf(1)), hex = elongationOf(tankOf('poly', 36, 36, 6));
    expect(round).toBeLessThan(0.005);
    expect(sq).toBeCloseTo(0.202, 2);
    expect(elongationOf(rectOf(0.5))).toBeCloseTo(0.286, 2);
    expect(elongationOf(rectOf(0.25))).toBeCloseTo(0.45, 2);
    expect(elongationOf(rectOf(0.125))).toBeCloseTo(0.604, 2);
    expect(hex).toBeGreaterThan(round); expect(hex).toBeLessThan(sq);
    expect(epsRect(0.5)).toBeCloseTo(LENGTH_BONUS.refEps, 12);
  });
  it('the circle has the lowest B_L of all shapes; the reference tank is unchanged; longer reads roomier; the cap holds', () => {
    LENGTH_BONUS.on = true;
    const d = sp('danio'), eps = [elongationOf(tankOf('round', 36, 36)), elongationOf(tankOf('poly', 36, 36, 6)), ...[1, .5, .25, .125, .03].map(w => elongationOf(rectOf(w)))];
    for (const e of eps.slice(1)) expect(bl('danio', eps[0])).toBeLessThanOrEqual(bl('danio', e));
    expect(lengthFactor(d, epsRect(0.5))).toBeCloseTo(1, 12);
    expect(lengthFactor(d, epsRect(0.25))).toBeGreaterThan(1);
    expect(lengthFactor(d, eps[0])).toBeLessThan(lengthFactor(d, epsRect(1)));   // a circle reads stricter than a square, which reads stricter than 2:1
    expect(lengthFactor(d, epsRect(1))).toBeLessThan(1);
    expect(lengthFactor(d, elongationOf(rectOf(0.01)))).toBeCloseTo(lengthFactor(d, epsRect(0.125)), 9);
  });
  it('bottom dwellers and land animals get none; fast schoolers the most', () => {
    expect(lengthBetaOf(sp('bronzecory'))).toBe(0);
    expect(lengthBetaOf(sp('leopardgecko'))).toBe(0);
    expect(lengthBetaOf(sp('danio'))).toBeGreaterThan(lengthBetaOf(sp('neon')));
    expect(lengthBetaOf(sp('neon'))).toBeGreaterThan(lengthBetaOf(sp('betta')));
  });
  it('stockingOf: a round tank reads stricter than a 2:1 of equal area for swimmers, the same for bottom dwellers; the 2:1 is unchanged', () => {
    const at = (t: ReturnType<typeof tankOf>, id: string, n: number) => { const s = comboTank({ name: 'x', tank: [36, 36, 21], stock: [[id, n]] }); s.tank = t; return stockingOf(s).spacePercent; };
    const A = 36 * 36, R = Math.sqrt(A / Math.PI) * 2, Lx = Math.sqrt(A * 2), two = tankOf('rect', Lx, Lx / 2), round = tankOf('round', R, R), thin = tankOf('rect', Math.sqrt(A * 4), Math.sqrt(A / 4));
    const r = (id: string, n: number) => { LENGTH_BONUS.on = false; const o = [at(two, id, n), at(round, id, n), at(thin, id, n)]; LENGTH_BONUS.on = true; const w = [at(two, id, n), at(round, id, n), at(thin, id, n)]; LENGTH_BONUS.on = false; return { o, w }; };
    const d = r('danio', 24);
    expect(d.w[0]).toBeCloseTo(d.o[0], 6);
    expect(d.w[1]).toBeGreaterThan(d.o[1] * 1.1);
    expect(d.w[2]).toBeLessThan(d.o[2]);
    const c = r('bronzecory', 8);
    expect(c.w[1]).toBeCloseTo(c.o[1], 9); expect(c.w[2]).toBeCloseTo(c.o[2], 9);
    expect(bareSetup().fish.length).toBe(0);
  });
});

describe('length bonus x turning clearance (Nathan 2026-10-28)', () => {
  it('a geometry failing clearance gets no positive credit: raw B_L becomes 1 before the reference normalisation', () => {
    LENGTH_BONUS.on = true;
    const d = sp('danio'), ok = turnNeedMm(d, TURN_K), refBl = 1 + lengthBetaOf(d) * LENGTH_BONUS.refEps;
    expect(lengthFactor(d, 0.5, ok)).toBeGreaterThan(1);                       // wide enough: full credit
    expect(lengthFactor(d, 0.5, ok - 1)).toBeCloseTo(1 / refBl, 12);            // one mm short: none, and the reference credit is gone too
    expect(lengthFactor(d, 0.5, ok - 1)).toBeLessThan(1);
    expect(lengthFactor(d, 0.5)).toBe(lengthFactor(d, 0.5, ok));                // no width given: not checked
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
    expect(lengthFactor(sp('kuhli'), 0.5, 10)).toBeCloseTo(lengthFactor(sp('kuhli'), 0.5), 12);
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
