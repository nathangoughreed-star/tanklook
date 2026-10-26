// The whole-scale gauge's inline style (S229 2026-10-26): the raw percent, clamped, and the ideal the colour stops follow.
import { describe, expect, it } from 'vitest';
import { IDEAL_MAX } from '../src/scene/stocking';
import { GAUGE_TIP, gaugeStyle } from '../src/ui/gauge';

describe('gauge style', () => {
  it('carries the raw percent and the ideal', () => {
    expect(gaugeStyle(57.3)).toBe(`--pct:57.3;--ideal:${IDEAL_MAX}`);
    expect(gaugeStyle(160)).toBe(`--pct:160;--ideal:${IDEAL_MAX}`); // past 100 the CSS scale runs to the percent
    expect(gaugeStyle(-2)).toBe(`--pct:0;--ideal:${IDEAL_MAX}`);
    expect(gaugeStyle(Infinity)).toBe(`--pct:999;--ideal:${IDEAL_MAX}`);
    expect(gaugeStyle(Number.NaN)).toBe(`--pct:999;--ideal:${IDEAL_MAX}`);
    expect(GAUGE_TIP).toContain(`${IDEAL_MAX}%`);
  });
});
