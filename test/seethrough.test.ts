// See-through bodies from the reference-photo check (method row 62): zones and inner solids come from body_clear, in anatomy terms.
import { describe, expect, it } from 'vitest';
import { BODY_CLASS, BODY_ZONES, PLANS, profile, seeThrough, type Plan } from '../src/art/fishgen';

const base = (): Plan => ({ ...PLANS.oscar, pedU: 0.2 });

describe('seeThrough', () => {
  it('a plan with no body_clear and no marks stays solid', () => {
    expect(seeThrough(base())).toBeUndefined();
  });
  it('a checked-solid fish (zones {}) stays solid', () => {
    expect(seeThrough({ ...base(), bodyClear: { zones: {} } })).toBeUndefined();
  });
  it('solid zones are dropped; each other zone takes its class and the anatomy table', () => {
    const st = seeThrough({ ...base(), bodyClear: { zones: { stalk: 'clear', head: 'solid', belly: 'faint' } } })!;
    expect(st.zones).toHaveLength(2);
    const stalk = st.zones.find(z => z.s0 === BODY_ZONES.stalk.s[0])!;
    expect(stalk.a).toBe(BODY_CLASS.clear);
    expect(st.zones.find(z => z.s0 === BODY_ZONES.belly.s[0])!.a).toBe(BODY_CLASS.faint);
  });
  it('inner solids sit inside the body: spine along it, sac in the lower half', () => {
    const p: Plan = { ...base(), bodyClear: { zones: { trunk: 'translucent' }, inner: { spine: null, sac: '#aabbcc' } } };
    const st = seeThrough(p)!, prof = profile(p);
    const spine = st.inner.find(i => i.k === 'spine')!, sac = st.inner.find(i => i.k === 'sac')!;
    expect(spine.k === 'spine' && spine.u0 < spine.u1 && spine.u0 >= p.pedU).toBe(true);
    if (sac.k !== 'sac') throw new Error('sac');
    const [t, b] = prof(sac.u);
    expect(sac.v).toBeGreaterThan((t + b) / 2);
    expect(sac.v + sac.rv).toBeLessThan(b);
    expect(sac.c).toBe('#aabbcc');
  });
});
