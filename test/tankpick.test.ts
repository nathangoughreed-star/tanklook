// Picking a library product sets the rim and lid it is sold with (S224, Nathan 2026-10-26: "the imagitarium tanks added are rimless
// yet they arent rimless in the tool ... I have to trust what you do now that we have so much equipment").
import { describe, expect, it } from 'vitest';
import { TANK_MODELS } from '../src/data/tanks';
import { defaultSetup } from '../src/scene/defaults';
import { applyTankPick, pickRimless } from '../src/ui/tankPick';

const products = TANK_MODELS.filter(m => !m.terrarium).flatMap(m => (m.variants ?? []).map(v => ({ m, v })));

describe('library picks', () => {
  it('every rimless product draws without a rim, every framed one with it, whatever was picked before', () => {
    for (const { m, v } of products) for (const before of [true, false]) {
      const s = defaultSetup(); s.render.rim = before;
      applyTankPick(s, m, v);
      expect(s.render.rim, `${m.id} ${v.brand} ${v.line}`).toBe(!pickRimless(m, v));
    }
  });
  it('the rimless Imagitarium tanks pick rimless with a glass top, not a hood', () => {
    const rimless = products.filter(({ v }) => /Imagitarium/.test(v.brand) && v.rimless);
    expect(rimless.length).toBeGreaterThanOrEqual(13);
    for (const { m, v } of rimless) {
      const s = defaultSetup(); s.lid = 'hood';
      applyTankPick(s, m, v);
      expect([s.render.rim, s.lid], `${v.line}`).toEqual([false, 'glass']);
    }
  });
  it('guard: a product named rimless or frameless carries the rimless flag', () => {
    const missing = products.filter(({ m, v }) => /rimless|frameless/i.test(v.line ?? '') && !pickRimless(m, v)).map(({ m, v }) => `${m.id}: ${v.brand} ${v.line}`);
    expect(missing).toEqual([]);
  });
});
