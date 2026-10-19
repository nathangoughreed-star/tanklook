// A bundle's price holds only while the parts it includes are unchanged; a preset's sale only while the tank keeps its size.
import { describe, expect, it } from 'vitest';
import { DEALS } from '../src/data/deals';
import { sceneFromDeal } from '../src/demand/dealscene';
import { changedParts, partList, partSig } from '../src/demand/dealdrift';
import { dealDrift, onSceneLoad, pinDeal, pinnedKit, pinPreset, presetDrift, unpinDeal } from '../src/demand/pinned';

const deal = DEALS.find(d => sceneFromDeal(d) && d.includes.includes('light') && d.includes.includes('stand'))!;
const fresh = () => structuredClone(sceneFromDeal(deal)!.tanks[0]);

describe('deal drift', () => {
  it('a fresh bundle scene matches its bundle', () => {
    const S = fresh();
    expect(changedParts(partSig(S, deal.includes), S)).toEqual([]);
  });
  it('resizing the tank, swapping the light or the stand finish breaks the bundle', () => {
    const base = partSig(fresh(), deal.includes);
    const a = fresh(); a.tank = { ...a.tank, L: a.tank.L + 50 };
    expect(changedParts(base, a)).toEqual(['tank']);
    const b = fresh(); b.light = { ...b.light, count: b.light.count + 1 }; b.stand = { ...b.stand, finish: b.stand.finish === 'oak' ? 'white' : 'oak' };
    expect(changedParts(base, b).sort()).toEqual(['light', 'stand']);
  });
  it('fish, plants and colour temperature do not', () => {
    const base = partSig(fresh(), deal.includes);
    const S = fresh(); S.light = { ...S.light, kelvin: S.light.kelvin + 1000 }; S.fish = [];
    expect(changedParts(base, S)).toEqual([]);
  });
  it('a filter picked by hand breaks a bundle that includes one; the inferred one does not', () => {
    const parts = ['filter'], S = fresh(), base = partSig(S, parts);
    expect(changedParts(base, S)).toEqual([]);
    const T = fresh(); T.tech = { rows: { filter: 'canister' } };
    expect(changedParts(base, T)).toEqual(base.filter![0] === 'canister' ? [] : ['filter']);
  });
  it('pinnedKit drops the bundle price once a part changed, and brings it back when undone', () => {
    const S = fresh();
    pinDeal(deal); onSceneLoad(0, S);
    expect(pinnedKit(S, 0)).toBeDefined();
    const T = structuredClone(S); T.tank = { ...T.tank, H: T.tank.H + 40 };
    expect(pinnedKit(T, 0)).toBeUndefined();
    expect(dealDrift(T, 0)).toEqual(['tank']);
    expect(pinnedKit(S, 0)).toBeDefined();
    expect(pinnedKit(S, 1)).toBeUndefined(); // another tank in a split scene
    unpinDeal();
  });
  it('a preset on sale drifts only when the tank changes', () => {
    const S = fresh();
    pinPreset(0, S, { product: 'X', retailer: 'Y', usd: 30 });
    const T = structuredClone(S); T.lid = 'open';
    expect(presetDrift(T, 0)).toBe(false);
    T.tank = { ...T.tank, D: T.tank.D + 30 };
    expect(presetDrift(T, 0)).toBe(true);
  });
  it('lists parts in plain words', () => {
    expect(partList(['tank'])).toBe('tank size');
    expect(partList(['tank', 'light', 'filter'])).toBe('tank size, light and filter');
  });
});
