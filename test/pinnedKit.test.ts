import { describe, expect, it } from 'vitest';
import { suggestSetups } from '../src/demand/suggest';
import { defaultProfile } from '../src/demand/types';
import { demandOf } from '../src/demand/engine';
import { pinnedKit } from '../src/demand/pinned';
import { Store } from '../src/scene/store';
import { defaultScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';
import { makeItMine } from '../src/ui/suggest';
import { consequence } from '../src/ui/briefFeasibility';
import { emptyBrief, setTank } from '../src/ui/setupBrief';
import { valueOf } from '../src/scene/brief';
import { planOf, planText } from '../src/scene/plan';

// Lane GV9 fix 5: a starter kit picked through "I like this one" stays priced as the kit, in the brief bar and through save / reload.
describe('a pinned starter-kit price', () => {
  const P = defaultProfile(), r = suggestSetups({ constraints: {}, animals: [{ species: 'betta', n: 1 }] }, P, 'in', Date.parse('2026-10-30'));
  const p = r.proposals.find(x => x.build.bundle)!;
  const store = new Store(defaultScene());
  it('rides on the tank after make it mine, and the brief bar prices it', () => {
    expect(p, r.proposals.map(x => x.build.tank.id).join()).toBeTruthy();
    makeItMine(store, p);
    const kit = pinnedKit(store.tank, store.scene.active, P);
    expect(kit?.id).toBeTruthy();
    const withKit = demandOf(store.tank, P, { kit }).totals.setupUsd, parts = demandOf(store.tank, P).totals.setupUsd;
    expect(withKit).toBeLessThan(parts);
    const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
    expect(consequence(store.tank, emptyBrief(), P, 'in', kit).totals).toContain(`${usd(withKit)} to set up`);
  });
  it('make it mine fills the Tank row of the brief, and Undo brings the old row back (lane GV10)', () => {
    const st = new Store(defaultScene());
    st.tank.brief = setTank(emptyBrief(), { id: 'g20l' }); st.seal();
    makeItMine(st, p);
    expect(valueOf(st.tank.brief!, 'equipment.tank')).toEqual({ model: p.build.tank.id });
    st.undo();
    expect(valueOf(st.tank.brief!, 'equipment.tank')).toEqual({ model: 'g20l' });
    const own = new Store(defaultScene()); // a tank the person owns is not replaced by a picked one
    own.tank.brief = setTank(emptyBrief(), { id: 'g20h', owned: true }); makeItMine(own, p);
    expect(valueOf(own.tank.brief!, 'constraints.existingTank')).toEqual({ model: 'g20h' });
  });
  it('prices the plan sheet as the bundle, with its line (lane GV10)', () => {
    const kit = pinnedKit(store.tank, store.scene.active, P)!;
    const plan = planOf(store.tank, undefined, Date.parse('2026-10-30'), 'in', kit), parts = planOf(store.tank, undefined, Date.parse('2026-10-30'), 'in');
    expect(plan.setupUsd).toBe(Math.round(demandOf(store.tank, defaultProfile(), { now: Date.parse('2026-10-30'), kit }).totals.setupUsd));
    expect(plan.setupUsd).toBeLessThan(parts.setupUsd);
    expect(plan.bundle?.label).toContain(kit.label!);
    expect(planText(plan)).toContain('Priced as the bundle: ');
    expect(planText(parts)).not.toContain('Priced as the bundle');
  });
  it('survives a save and reload', () => {
    const back = parseScene(JSON.parse(JSON.stringify(store.scene))).scene, T = back.tanks[back.active];
    expect(pinnedKit(T, back.active, P)).toEqual(pinnedKit(store.tank, store.scene.active, P));
    expect(pinnedKit(T, back.active, P)).toBeTruthy();
  });
  it('a malformed saved pin is dropped', () => {
    const raw = JSON.parse(JSON.stringify(store.scene));
    raw.tanks[raw.active].dealPin = { id: 3, sig: 'x' };
    const back = parseScene(raw).scene;
    expect((back.tanks[back.active] as { dealPin?: unknown }).dealPin).toBeUndefined();
  });
});
