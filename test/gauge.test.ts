// The whole-scale gauge's inline style (S229 2026-10-26): the raw percent, clamped, and the ideal the colour stops follow.
import { describe, expect, it } from 'vitest';
import { IDEAL_MAX } from '../src/scene/stocking';
import { GAUGE_AMBER, GAUGE_GREEN, GAUGE_RED, GAUGE_TIP, gaugeColor, gaugeStyle, gaugeText } from '../src/ui/gauge';

describe('gauge style', () => {
  it('carries the raw percent and the ideal', () => {
    expect(gaugeStyle(57.3)).toBe(`--pct:57.3;--ideal:${IDEAL_MAX}`);
    expect(gaugeStyle(160)).toBe(`--pct:160;--ideal:${IDEAL_MAX}`); // past 100 the CSS scale runs to the percent
    expect(gaugeStyle(-2)).toBe(`--pct:0;--ideal:${IDEAL_MAX}`);
    expect(gaugeStyle(Infinity)).toBe(`--pct:999;--ideal:${IDEAL_MAX}`);
    expect(gaugeStyle(Number.NaN)).toBe(`--pct:999;--ideal:${IDEAL_MAX}`);
    expect(GAUGE_TIP).toContain(`${IDEAL_MAX}%`);
  });
  // Nathan 2026-10-26: the pill at 76 % "should still be pretty much green": the colour is where the line sits on the gradient, not the band's
  it('colour at a percent follows the gradient; text dark only while amber dominates', () => {
    expect(gaugeColor(60)).toBe(GAUGE_GREEN); expect(gaugeColor(IDEAL_MAX)).toBe(GAUGE_GREEN);
    expect(gaugeColor(87.5)).toBe(GAUGE_AMBER);
    expect(gaugeColor(100)).toBe(GAUGE_RED); expect(gaugeColor(105)).toBe(GAUGE_RED); expect(gaugeColor(Infinity)).toBe(GAUGE_RED);
    expect(gaugeColor(76)).toBe('#3c9e64'); // 8 % of the way to amber
    expect(gaugeColor(81.25)).toBe('#849c44'); // half way green -> amber
    expect(gaugeColor(93.75)).toBe('#d96f27'); // half way amber -> red
    expect(gaugeText(60)).toBe('#fff'); expect(gaugeText(76)).toBe('#fff'); expect(gaugeText(81.25)).toBe('#1d2330'); expect(gaugeText(87.5)).toBe('#1d2330'); expect(gaugeText(93.75)).toBe('#1d2330'); expect(gaugeText(95)).toBe('#fff'); expect(gaugeText(100)).toBe('#fff');
  });
});
