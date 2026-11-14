import { describe, expect, it } from 'vitest';
import { blendRatio, blendZone, substrateFine } from '../src/art/placeholder';
import type { SubstrateBlend } from '../src/scene/types';

const mk = (share: number, mix: number, grain: SubstrateBlend['grain'] = 'sand', grain2: SubstrateBlend['grain'] = 'gravel'): SubstrateBlend =>
  ({ grain, color: '#c9b48a', grain2, color2: '#3a342c', share, mix } as SubstrateBlend);
/** r over a 2 m x 2 m floor, a grid every `step` mm. */
function field(b: SubstrateBlend, step = 10, size = 2000) {
  const z = blendZone(b), n = size / step, g: number[][] = [];
  for (let j = 0; j < n; j++) { g.push([]); for (let i = 0; i < n; i++) g[j].push(blendRatio(b, i * step, j * step, z)); }
  return g;
}
const mean = (g: number[][]) => g.flat().reduce((a, v) => a + v, 0) / g.flat().length;
const sd = (g: number[][]) => { const m = mean(g); return Math.sqrt(g.flat().reduce((a, v) => a + (v - m) ** 2, 0) / g.flat().length); };

describe('blend ratio field (SM1)', () => {
  it('its floor-wide mean is the share', () => {
    for (const share of [10, 30, 50, 80]) for (const mix of [0, 0.5, 1]) expect(mean(field(mk(share, mix))) * 100).toBeCloseTo(share, -0.5 + 0); // within ~3 %
  });
  it('is smooth: neighbours 10 mm apart differ by little', () => {
    for (const mix of [0, 0.5, 1]) {
      const g = field(mk(30, mix)); let worst = 0;
      for (let j = 0; j < g.length - 1; j++) for (let i = 0; i < g.length - 1; i++) worst = Math.max(worst, Math.abs(g[j][i] - g[j][i + 1]), Math.abs(g[j][i] - g[j + 1][i]));
      expect(worst).toBeLessThan([0.3, 0.2, 0.05][mix * 2]);
    }
  });
  it('mix 1 is nearly flat, mix 0 spans pure to pure, and the default has pockets', () => {
    expect(sd(field(mk(30, 1)))).toBeLessThan(0.06);
    const g0 = field(mk(30, 0)).flat(), g5 = field(mk(30, 0.5)).flat();
    expect(Math.min(...g0)).toBeLessThan(0.03); expect(Math.max(...g0)).toBeGreaterThan(0.9);
    expect(sd([g5])).toBeGreaterThan(0.1); expect(sd([g5])).toBeLessThan(sd([g0]));
    expect(Math.max(...g5) - Math.min(...g5)).toBeGreaterThan(0.4);
  });
  it('the grain threshold noise is uniform, so a ratio r gives grain 2 a share r of the grains', () => {
    const f = substrateFine(), n = f.length / 4; let c = 0;
    for (let k = 0; k < n; k++) if (f[k * 4] / 255 < 0.3) c++;
    expect(c / n).toBeCloseTo(0.3, 1);
  });
  it('shares of 0 and 100 are pure', () => {
    expect(mean(field(mk(0, 0.5), 100))).toBeLessThan(0.001); expect(mean(field(mk(100, 0.5), 100))).toBeGreaterThan(0.999);
  });
});
