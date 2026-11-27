import { describe, expect, it } from 'vitest';
import tips from '../src/data/loadingTips.json';
import { tipFor, SHOW_AFTER_MS, TIP_AFTER_MS } from '../src/shell/loading';
import { nextIndex } from '../src/shell/logic/result';

describe('FD: loading line and result card', () => {
  it('every tip has a source, and none is long', () => {
    for (const t of tips.tips) { expect(t.source.length).toBeGreaterThan(5); expect(t.text.length).toBeLessThan(120); }
  });
  it('tips take turns and wrap; nothing shows before 1 s, a tip only after 3 s', () => {
    expect(tipFor(0)).toBe(tips.tips[0].text); expect(tipFor(tips.tips.length)).toBe(tips.tips[0].text);
    expect(SHOW_AFTER_MS).toBe(1000); expect(TIP_AFTER_MS).toBe(3000);
  });
  it('See another steps through the examples and wraps', () => { expect(nextIndex(0, 3)).toBe(1); expect(nextIndex(2, 3)).toBe(0); expect(nextIndex(0, 0)).toBe(0); });
});
