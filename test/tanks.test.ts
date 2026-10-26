import { describe, expect, it } from 'vitest';
import { checkAll, VOL_EXCEPTIONS, VOL_TOL } from '../src/data/tankcheck';
import { TANK_MODELS, getTankModel, outerOf, saleLive, tankChoices, tankFromModel, tankFromOuter, variantUsd } from '../src/data/tanks';
import { glassThickness, IN, volume } from '../src/scene/physics';
import { emptyScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';

describe('tank catalog (lane KA)', () => {
  it('every entry passes: volume vs rating, outer round trip, band, unique ids', () => {
    const { reports, global } = checkAll();
    expect(global).toEqual([]);
    expect(reports.flatMap(r => r.problems.map(p => `${r.id}: ${p}`))).toEqual([]);
  });
  it('keeps the exception list short and explicit', () => {
    expect(VOL_TOL).toBe(0.08);
    expect(Object.keys(VOL_EXCEPTIONS).sort()).toEqual(['g125', 'g300']);
  });
  it('covers the size ladder and keeps the 11 original terrarium presets plus the researched maker sizes', () => {
    for (const id of ['g2_5', 'g5', 'g10', 'g29', 'g40b', 'g55', 'g75', 'g120', 'bow36', 'bow46', 'bow72', 'hex35', 'cor50', 'g125', 'g300', 'c6', 'c8']) expect(getTankModel(id), id).toBeDefined();
    expect(TANK_MODELS.filter(m => m.terrarium).length).toBe(14);
  });
  it('a 55 gallon derives the interior from outer minus glass', () => {
    const m = getTankModel('g55')!, T = tankFromModel(m);
    expect(T.L).toBeCloseTo(m.outer.L - 12, 1); expect(T.H).toBeCloseTo(m.outer.H - 6, 1);
    expect(volume(T).gallons).toBeGreaterThan(53);
  });
  it('custom tank in outer dimensions: auto glass is a fixed point of glassThickness', () => {
    const { tank, glass } = tankFromOuter({ outer: { L: 48 * IN, H: 22 * IN, D: 18 * IN } });
    expect(glassThickness(tank, 'auto')).toBe(glass);
    const o = outerOf(tank, glass);
    expect(o.L).toBeCloseTo(48 * IN, 1); expect(o.H).toBeCloseTo(22 * IN, 1); expect(o.D).toBeCloseTo(18 * IN, 1);
  });
  it('picker choices: grouped by band, terrariums last, every entry once', () => {
    const c = tankChoices();
    expect(c.length).toBe(TANK_MODELS.length);
    expect(c[c.length - 1].group).toBe('Terrariums');
    expect(c[0].group).toMatch(/^Nano/);
    expect(tankChoices({ terrariums: false }).length).toBe(TANK_MODELS.length - 14);
  });
  it('a sale counts while its page was read in the last 30 days and has not ended; a stale one reads the list price (S224)', () => {
    const now = Date.parse('2026-10-26T12:00:00Z'), v = { brand: 'X', L_in: 20, D_in: 10, H_in: 12, price_usd: 20, regular_usd: 40, checked: '2026-10-20' };
    expect(saleLive(v, now)).toBe(true); expect(variantUsd(v, now)).toBe(20);
    expect(saleLive({ ...v, checked: '2026-09-20' }, now)).toBe(false); expect(variantUsd({ ...v, checked: '2026-09-20' }, now)).toBe(40);
    expect(saleLive({ ...v, sale_ends: '2026-10-25' }, now)).toBe(false);
    expect(variantUsd({ ...v, regular_usd: undefined }, now)).toBe(20); // no list price: the one price there is
  });
  it("a maker's own glass thickness (9.5 / 15.9 mm) survives a save and reload, so the outside keeps the label size", () => {
    for (const g of [9.5, 15.9]) {
      const sc = emptyScene();
      sc.tanks[0].render.glass = g;
      expect(parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].render.glass).toBe(g);
    }
  });
});
