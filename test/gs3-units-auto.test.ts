// GS3 (2026-11-16; Nathan via C25): both unit systems' glass sizes are always selectable, defaults and solver answers follow the unit setting,
// and a CUSTOM tank's 'auto' glass is solved (W13): rimless draws thicker than rimmed, commercial / other tanks keep the height table.
import { afterEach, describe, expect, it } from 'vitest';
import { GLASS_SIZES, IN_MM, STOCK_METRIC, STOCK_US, glassChoices, stockAll, solveGlass } from '../src/scene/glassSolver';
import { customGlass, solvedGlass } from '../src/scene/autoGlass';
import { glassThickness, setGlassUnits, IN } from '../src/scene/physics';
import { glassOption, glassText } from '../src/shell/logic/tank';
import type { Tank } from '../src/scene/types';

const box = (L: number, D: number, H: number): Tank => ({ L: L * IN, D: D * IN, H: H * IN } as Tank);
afterEach(() => setGlassUnits('in'));

describe('GS3 both unit systems are always on the list', () => {
  it('stockAll holds every US and every metric size, thinnest first, in either unit setting', () => {
    for (const u of ['in', 'cm'] as const) {
      const a = stockAll(u);
      for (const t of [...STOCK_US, ...STOCK_METRIC]) expect(a.some(x => Math.abs(x - t) < 0.11), `${u} ${t}`).toBe(true);
      expect([...a].sort((x, y) => x - y)).toEqual(a);
      expect(a.some(t => Math.abs(t - 4) < 0.01), 'the 4 mm Home Depot glass').toBe(true);
    }
  });
  it('labels each size in its own system, in either setting', () => {
    for (const u of ['in', 'cm'] as const) {
      expect(glassText(4, u)).toBe('4 mm'); expect(glassText(1 / 8 * IN_MM, u)).toBe('1/8 in'); expect(glassText(10, u)).toBe('10 mm'); expect(glassText(3 / 8 * IN_MM, u)).toBe('3/8 in'); expect(glassText(5, u)).toBe('5 mm');
    }
    expect(glassOption(4, 'in')).toBe('5/32 in (4 mm)'); expect(glassOption(1 / 8 * IN_MM, 'cm')).toBe('3 mm (1/8 in), double strength'); expect(glassOption(3, 'in')).toBe('1/8 in (3 mm), double strength');
  });
});

describe('GS3 defaults land on a stocked size in the unit setting', () => {
  it("'Typical for the height' is a US size in inches and a metric size in cm, every band", () => {
    const heights = [12, 16, 20, 24, 28, 36];
    setGlassUnits('in');
    for (const h of heights) expect(STOCK_US.some(t => Math.abs(t - glassThickness(box(48, 18, h), 'auto')) < 0.01), `US ${h}`).toBe(true);
    setGlassUnits('cm');
    for (const h of heights) expect(STOCK_METRIC.includes(glassThickness(box(48, 18, h), 'auto')), `metric ${h}`).toBe(true);
    expect(glassThickness(box(48, 18, 28), 'auto')).toBe(12); expect(glassThickness(box(48, 18, 36), 'auto')).toBe(15);
  });
  it('the solver answers in the unit setting (no 12.7 / 15.9 mm in metric)', () => {
    for (const [L, D, H] of [[48, 18, 24], [72, 24, 28], [36, 18, 20]]) {
      const m = solveGlass({ L: L * IN, D: D * IN, H: H * IN }, { units: 'metric', continuous: false });
      for (const p of ['front', 'left', 'bottom'] as const) expect(STOCK_METRIC.includes(m.panes[p].thickness!), `${L}x${D}x${H} ${p}`).toBe(true);
    }
  });
});

describe('GS3 W13: a custom tank draws the solver glass', () => {
  it("rimless draws at least as thick as rimmed, and 'auto' on a custom box is the solver's thinnest answer", () => {
    const T = box(48, 18, 24);
    const held = customGlass('auto', T, true, 'in'), free = customGlass('auto', T, false, 'in');
    expect(free).toBeGreaterThan(held);
    const s = solveGlass({ L: T.L, D: T.D, H: T.H }, { topEdge: 'free', continuous: false });
    expect(free).toBeCloseTo(Math.max(s.panes.front.thickness!, s.panes.left.thickness!, s.panes.bottom.thickness!), 6);
    expect(customGlass(9.525, T, false, 'in')).toBe(9.525); // a chosen thickness is kept
  });
  it('metric custom tanks get a metric size; a bowl (not a box) keeps the height table', () => {
    expect(STOCK_METRIC.includes(customGlass('auto', box(60, 24, 24), false, 'cm'))).toBe(true);
    setGlassUnits('in');
    const bowl = { L: 300, D: 300, H: 300, shape: 'bowl' } as unknown as Tank;
    expect(solvedGlass(bowl, true, 'in')).toBeNull();
    expect(customGlass('auto', bowl, true, 'in')).toBe(glassThickness(bowl, 'auto'));
  });
});

describe('GS3 one tiered list with both names (Nathan: all readily available sizes)', () => {
  it('every size once, grouped by where it is sold, 5/16 / 5/8 / 1 in special order, values in the unit setting', () => {
    for (const u of ['in', 'cm'] as const) {
      const g = glassChoices(u), flat = g.flatMap(x => x.items);
      expect(flat.length).toBe(11);
      expect(g.map(x => x.tier)).toEqual(['hardware', 'shop', 'special']);
      expect(g[0].items.length).toBe(2); expect(g[2].items.length).toBe(3);
      expect(flat.map(i => i.mm).every(v => (u === 'in' ? STOCK_US : STOCK_METRIC).some(t => Math.abs(t - v) < 1e-9))).toBe(true);
    }
    expect(glassChoices('in')[0].items.map(i => i.label)).toEqual(['3/32 in (2.5 mm), single strength', '1/8 in (3 mm), double strength']);
    expect(glassChoices('cm')[1].items.some(i => i.label === '6 mm (1/4 in)')).toBe(true);
    expect(GLASS_SIZES.filter(g => g.tier === 'special').map(g => g.usLabel)).toEqual(['5/16', '5/8', '1']);
  });
});
