import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { SHARE_PREFIX, readShare, shareHash } from '../src/scene/share';
import { parseScene } from '../src/scene/validate';
import { activeSpace, constraintsFromLimits, effectiveLimits, parseConstraints, type Constraints } from '../src/scene/constraints';
import { defaultProfile, demandOf, limitState } from '../src/demand';

const C: Constraints = { startupUsd: { on: true, value: 500 }, monthlyUsd: { on: false, value: 25 }, minutesPerWeek: { on: true, value: 45 }, space: { on: false }, effort: 'low', experience: 1 };
const withC = () => { const s = defaultScene(); s.tanks[0].constraints = structuredClone(C); return s; };

describe('Guardrails state (lane C1)', () => {
  it('survives save / load and a share link', async () => {
    const s = parseScene(JSON.parse(JSON.stringify(withC()))).scene;
    expect(s.tanks[0].constraints).toEqual(C);
    const back = await readShare(await shareHash(s));
    expect(back.scene.tanks[0].constraints).toEqual(C);
    expect(SHARE_PREFIX).toBeTruthy();
  });
  it('is absent on a tank that never set it, and junk is dropped', () => {
    expect(parseScene(JSON.parse(JSON.stringify(defaultScene()))).scene.tanks[0].constraints).toBeUndefined();
    expect(parseConstraints({ startupUsd: { on: true, value: -3 }, effort: 'x' })).toBeUndefined();
    expect(parseConstraints({ startupUsd: { value: 80 } })).toEqual({ startupUsd: { on: true, value: 80 } });
  });
  it('a split copy carries it', () => {
    const st = new Store(withC());
    st.splitTank();
    expect(st.scene.tanks[1].constraints).toEqual(C);
  });
  it('a tank without it reads the profile; with it, only the switched-on caps gate', () => {
    const P = defaultProfile(); P.limits = { setupUsd: 100, upkeep: 'low', minPerWeek: 20, risk: 'safe' };
    expect(effectiveLimits(undefined, P.limits)).toBe(P.limits);
    expect(effectiveLimits({}, P.limits)).toBe(P.limits);
    expect(constraintsFromLimits(P.limits)).toEqual({ startupUsd: { on: true, value: 100 }, monthlyUsd: { on: true, value: 40 }, minutesPerWeek: { on: true, value: 20 } });
    const L = effectiveLimits({ constraints: C }, P.limits);
    expect(L).toEqual({ setupUsd: 500, minPerWeek: 45, upkeepUsd: undefined, risk: 'safe' });
    const D = demandOf(defaultScene().tanks[0], P);
    const st = limitState(D, { limits: effectiveLimits({ constraints: { monthlyUsd: { on: true, value: 0 } } }, P.limits) });
    expect(st.upkeep.limit).toBe(0);
    const off = limitState(D, { limits: L });
    expect(off.upkeep.limit).toBeUndefined(); expect(off.upkeep.over).toBe(false); expect(off.upkeep.value).toBe(D.totals.upkeepUsdMo);
  });
  it('space switched off is not held', () => {
    const t = defaultScene().tanks[0]; t.layout.space = { w: 900, d: 400 };
    expect(activeSpace(t)).toEqual({ w: 900, d: 400 });
    t.constraints = { space: { on: false } };
    expect(activeSpace(t)).toBeUndefined();
  });
});
