import { describe, expect, it } from 'vitest';
import { GAMMA_FRESH, HISCOCKS_TABLE, IN_MM, STOCK_METRIC, STOCK_US, hiscocksThickness, optimizeBrace, plate, rigidity, roundUpStock, solveGlass, thicknessLabel, toGlassBuild } from '../src/scene/glassSolver';

const tank = (l: number, d: number, h: number) => ({ L: l * IN_MM, D: d * IN_MM, H: h * IN_MM });
const fast = { terms: 41, grid: [25, 17] as [number, number] };

describe('GS1 Levy plate solver against published coefficients', () => {
  it('simply supported plate, uniform load: Timoshenko Table 8 (nu 0.3)', () => {
    const a = 500, t = 10, q = 0.01, E = 70000, nu = 0.3;
    for (const [r, wc, mc] of [[1, 0.00406, 0.0479], [2, 0.01013, 0.1017]]) {
      const res = plate({ a, b: r * a, t, load: { kind: 'uniform', q }, top: { kind: 'ss' }, E, nu, terms: 81, grid: [41, 41] });
      expect(res.w * rigidity(t, E, nu) / (q * a ** 4)).toBeCloseTo(wc, 4);
      expect(res.sigma * t * t / 6 / (q * a * a)).toBeCloseTo(mc, 3);
    }
  });
  it('four edges simply supported, hydrostatic: reproduces the hobby-calculator beta / alpha table within 5 %', () => {
    const H = 500, t = 10, g = 1e-5, E = 70000, nu = 0.3;
    HISCOCKS_TABLE.ratio.forEach((r, i) => {
      const res = plate({ a: r * H, b: H, t, load: { kind: 'hydro', gamma: g, h: H }, top: { kind: 'ss' }, E, nu, terms: 81, grid: [41, 33] });
      const beta = res.sigma * t * t / (g * H ** 3), alpha = res.w * E * t ** 3 / (g * H ** 5);
      expect(Math.abs(beta / HISCOCKS_TABLE.beta[i] - 1)).toBeLessThan(0.05);
      if (r >= 0.666) expect(Math.abs(alpha / HISCOCKS_TABLE.alpha[i] - 1)).toBeLessThan(0.05);
    });
  });
  it('a free top edge carries more stress than a supported one; an infinitely stiff edge beam equals a supported edge', () => {
    const base = { a: 1200, b: 500, t: 10, load: { kind: 'hydro' as const, gamma: GAMMA_FRESH, h: 475 }, ...fast };
    const free = plate({ ...base, top: { kind: 'edge', EI: 0 } }), ss = plate({ ...base, top: { kind: 'ss' } });
    const stiff = plate({ ...base, top: { kind: 'edge', EI: 1e18 } }), mid = plate({ ...base, top: { kind: 'edge', EI: 1e11 } });
    expect(free.sigma).toBeGreaterThan(1.3 * ss.sigma);
    expect(stiff.sigma / ss.sigma).toBeCloseTo(1, 3);
    expect(mid.sigma).toBeLessThan(free.sigma);
    expect(mid.w).toBeGreaterThan(ss.w);
    expect(mid.w).toBeLessThan(free.w);
  });
  it('a cross-brace tie holds the top edge and pulls inward', () => {
    const top = { kind: 'edge' as const, EI: 71700 * 6.35 * 50.8 ** 3 / 12 };
    const base = { a: 1829, b: 533, t: 12.7, load: { kind: 'hydro' as const, gamma: GAMMA_FRESH, h: 508 }, ...fast };
    const tied = plate({ ...base, top: { ...top, ties: [{ x: 914.5, width: 50.8 }] } }), none = plate({ ...base, top });
    expect(tied.ties[0]).toBeGreaterThan(0);
    expect(tied.w).toBeLessThan(none.w);
  });
});

describe('GS1 tank solve', () => {
  it('rounds up to stock and labels US sizes', () => {
    expect(roundUpStock(6.4)).toBeCloseTo(5 / 16 * IN_MM);
    expect(roundUpStock(6.4, STOCK_METRIC)).toBe(8);
    expect(roundUpStock(30, STOCK_METRIC)).toBeNull();
    expect(thicknessLabel(STOCK_US[2])).toBe('3/8"');
  });
  it('the hobby formula: 950 mm water, ratio 3 gives about 25 mm (published worked example)', () => {
    expect(hiscocksThickness(3 * 950, 950, { gamma: 1e-5, mor: 19.2 }).t).toBeCloseTo(25.07, 1);
  });
  it('55 gal 48x13x21 unbraced: front needs more than the supported-top calculators say, ends less', () => {
    const s = solveGlass(tank(48, 13, 21), { mode: 'perPane', ...fast });
    const hob = hiscocksThickness(48 * IN_MM, 21 * IN_MM - 25).t;
    expect(s.panes.front.required).toBeGreaterThan(hob * 1.1);
    expect(s.panes.left.required).toBeLessThan(s.panes.front.required);
    expect(s.panes.front.label).toBe('1/2"');
    expect(s.panes.front.sf).toBeGreaterThanOrEqual(3.8);
    expect(s.panes.bottom.thickness).toBe(s.panes.front.thickness); // full-support rule
  });
  it('uniform mode uses one thickness everywhere; per-pane never uses more glass', () => {
    const spec = tank(48, 18, 21);
    const u = solveGlass(spec, fast), p = solveGlass(spec, { ...fast, mode: 'perPane' });
    expect(new Set(Object.values(u.panes).map(x => x.thickness)).size).toBe(1);
    expect(p.volumeIn3).toBeLessThanOrEqual(u.volumeIn3 + 1e-9);
  });
  it('monotonic: taller, longer, higher SF, salt water never need thinner glass; a brace needs less', () => {
    const req = (o: Parameters<typeof solveGlass>[1], s = tank(48, 18, 21)) => solveGlass(s, { mode: 'perPane', ...fast, ...o }).panes.front.required;
    const base = req({});
    expect(req({}, tank(48, 18, 24))).toBeGreaterThan(base);
    expect(req({}, tank(60, 18, 21))).toBeGreaterThan(base);
    expect(req({ safetyFactor: 5 })).toBeGreaterThan(base);
    expect(req({ gamma: GAMMA_FRESH * 1.025 })).toBeGreaterThan(base);
    expect(req({ brace: { width: 76.2, thickness: 9.525 } })).toBeLessThan(base);
  });
  it('a bottom carried only on its edges is solved as a plate and needs more than the walls', () => {
    const s = solveGlass(tank(48, 18, 21), { mode: 'perPane', bottomSupport: 'perimeter', ...fast });
    expect(s.panes.bottom.governs).not.toBe('rule');
    expect(s.panes.bottom.required).toBeGreaterThan(s.panes.front.required);
    expect(s.panes.bottom.thickness!).toBeGreaterThanOrEqual(s.panes.front.thickness!);
  });
  it('a pane beyond the stock list is flagged, not silently capped', () => {
    const s = solveGlass(tank(96, 36, 60), { units: 'metric', ...fast });
    expect(s.ok).toBe(false);
    expect(s.panes.front.thickness).toBeNull();
    expect(toGlassBuild(s, null)).toBeNull();
  });
});

describe('GS1 eurobrace optimizer', () => {
  it('75 gal: a brace saves glass and the best option meets the safety factor everywhere', () => {
    const o = optimizeBrace(tank(48, 18, 21), { mode: 'perPane', ...fast });
    expect(o.options[0].label).toBe('No brace');
    expect(o.best.brace).not.toBeNull();
    expect(o.best.costIndex).toBeLessThan(100);
    const s = o.best.solution;
    expect(s.ok).toBe(true);
    for (const p of ['front', 'left'] as const) expect(s.panes[p].sf).toBeGreaterThanOrEqual(3.8 - 1e-9);
    expect(s.brace!.sf).toBeGreaterThanOrEqual(3.8 - 1e-9);
    expect(o.best.opening.depth).toBeGreaterThanOrEqual(6 * IN_MM);
    expect(s.panes.front.thickness!).toBeLessThan(o.options[0].solution.panes.front.thickness!);
  });
});
