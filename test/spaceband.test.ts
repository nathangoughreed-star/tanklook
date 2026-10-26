// The stocking screen's Space band (S214 2026-10-26): the bar colour and the "past ideal" label read the same rounded percent, the one
// the screen prints, so a tank shown as "75 %" is always amber and labelled, and one shown as "74 %" never is.
import { describe, expect, it } from 'vitest';
import { spaceBand } from '../src/ui/stockPlanLogic';

describe('space band on the stocking screen', () => {
  it('follows the printed (rounded) percent', () => {
    expect(spaceBand(74.4)).toBe('ok');
    expect(spaceBand(74.6)).toBe('near');
    expect(spaceBand(74.99)).toBe('near');
    expect(spaceBand(100.4)).toBe('near');
    expect(spaceBand(100.5)).toBe('over');
  });
});
