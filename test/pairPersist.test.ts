// Pairing is plan data (2026-10-22): it survives the stocking screen -> build pick -> editor -> save -> reopen sequence with the same
// verdict, loads as unknown from older saves, and is dropped when a member of the pair is removed or replaced.
import { describe, expect, it } from 'vitest';
import { emptyScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';
import { Store } from '../src/scene/store';
import { crowdWarnings } from '../src/scene/territory';
import { pairingIn, setPairing } from '../src/scene/pairs';
import { carryAnimals } from '../src/scene/carry';
import { bump, notesOf, writePairs, type Pk } from '../src/ui/stockPlanLogic';
import type { Fish, Pairing, Scene, TankSetup } from '../src/scene/types';

const fish = (id: number, species: string): Fish => ({ id, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 });
const tankWith = (spec: [string, number][], firstId = 1) => {
  const s = emptyScene(); let id = firstId;
  s.tanks[0].fish = spec.flatMap(([sp, n]) => Array.from({ length: n }, () => fish(id++, sp)));
  return s;
};
const reopen = (s: Scene) => parseScene(JSON.parse(JSON.stringify(s))).scene;
/** What the owner is told about the rams: the stocking screen's band and line for the tank's pairing, and the editor's warning. */
const verdict = (T: TankSetup) => {
  const nt = notesOf({ id: 'gbr', n: 2, pair: pairingIn(T, 'gbr') });
  return { band: nt.band, line: nt.line, editor: crowdWarnings(T).find(w => /German blue ram/.test(w)) ?? null };
};
const STATES: Pairing[] = ['established', 'unconfirmed', 'unknown'];

describe('pairing survives stocking screen -> build pick -> editor -> save -> reopen', () => {
  for (const st of STATES) it(`${st}: same inputs, same verdict at every step`, () => {
    // stocking screen: the picks synced into the tank (stockPlan.ts sync), with the owner's pairing
    const picks: Pk[] = [{ id: 'gbr', n: 2, pair: st }, { id: 'cardinal', n: 15 }];
    const screen = tankWith([['gbr', 2], ['cardinal', 15]]);
    writePairs(screen.tanks[0], picks);
    const before = verdict(screen.tanks[0]);
    expect(pairingIn(screen.tanks[0], 'gbr')).toBe(st);
    // build pick: a fresh scene with new fish ids (buildPick.ts pick)
    const built = tankWith([['cardinal', 15], ['gbr', 2]], 100);
    carryAnimals(screen.tanks[0], built.tanks[0]);
    // editor: ordinary edits go through the store, which prunes stale pairings
    const store = new Store(); store.replace(built);
    store.edit(t => { t.fish.find(f => f.species === 'gbr')!.x += 10; });
    expect(verdict(store.tank)).toEqual(before);
    // save and reopen (Save, Download and share links all go through parseScene)
    const back = reopen(store.scene).tanks[0];
    expect(pairingIn(back, 'gbr')).toBe(st);
    expect(verdict(back)).toEqual(before);
  });
  it('the three states read differently (the round trip is not passing on a constant)', () => {
    const v = STATES.map(st => { const s = tankWith([['gbr', 2]]); setPairing(s.tanks[0], 'gbr', st); return verdict(reopen(s).tanks[0]); });
    expect(v[0].line).toMatch(/Suitable pair/); expect(v[0].band).not.toBe('ok'); expect(v[0].editor).toBeNull();
    expect(v[1].line).toMatch(/Compatibility unconfirmed/); expect(v[1].band).toBe('ok'); expect(v[1].editor).not.toMatch(/pairing not set/);
    expect(v[2].line).toMatch(/Compatibility unconfirmed/); expect(v[2].band).toBe('ok'); expect(v[2].editor).toMatch(/pairing not set/);
  });
});

describe('older and malformed saves load as unknown, never established', () => {
  it('no field', () => {
    const s = tankWith([['gbr', 2]]);
    expect(pairingIn(reopen(s).tanks[0], 'gbr')).toBe('unknown');
  });
  it('junk, wrong species, wrong ids, and the 2026-10-22 draft shape (a bare status string) are dropped', () => {
    const s = tankWith([['gbr', 2], ['angel', 2], ['kribensis', 2]]) as unknown as { tanks: Record<string, unknown>[] };
    s.tanks[0].pairs = {
      gbr: 'established', neon: { status: 'established', ids: [1, 2] },
      angel: { status: 'established', ids: [3, 99] }, kribensis: { status: 'married', ids: [5, 6] },
    };
    const T = reopen(s as unknown as Scene).tanks[0];
    expect(T.pairs).toBeUndefined();
    for (const id of ['gbr', 'angel', 'kribensis']) expect(pairingIn(T, id)).toBe('unknown');
  });
});

describe('changing the animals drops the pairing', () => {
  const established = () => { const st = new Store(); const s = tankWith([['gbr', 2]]); setPairing(s.tanks[0], 'gbr', 'established'); st.replace(s); return st; };
  it('removing one: pruned at once, and a new animal reusing the freed id does not inherit it', () => {
    const st = established();
    st.edit(t => { t.fish = t.fish.filter(f => f.id !== 2); });
    expect(st.tank.pairs).toBeUndefined();
    st.edit(t => { t.fish.push(fish(2, 'gbr')); }); // the editor hands out max id + 1, so id 2 comes back
    expect(pairingIn(st.tank, 'gbr')).toBe('unknown');
  });
  it('replacing one with a different animal', () => {
    const st = established();
    st.edit(t => { t.fish = [t.fish[0], fish(7, 'gbr')]; });
    expect(pairingIn(st.tank, 'gbr')).toBe('unknown');
    expect(st.tank.pairs).toBeUndefined();
  });
  it('a third joining, then leaving again: stays unknown', () => {
    const st = established();
    st.edit(t => { t.fish.push(fish(3, 'gbr')); });
    expect(st.tank.pairs).toBeUndefined();
    st.edit(t => { t.fish.pop(); });
    expect(pairingIn(st.tank, 'gbr')).toBe('unknown');
  });
  it('undo of a removal brings the pair and its status back (the same two animals)', () => {
    const st = established();
    st.edit(t => { t.fish.pop(); });
    st.undo();
    expect(pairingIn(st.tank, 'gbr')).toBe('established');
  });
  it('on the stocking screen, any change to the count clears the chosen pairing', () => {
    const p: Pk = { id: 'gbr', n: 2, pair: 'established' };
    expect(bump(bump(p, 'n', -1), 'n', 1).pair).toBeUndefined();
    expect(bump({ id: 'kribensis', n: 1, f: 1, pair: 'established' }, 'f', 1).pair).toBeUndefined();
    expect(bump({ id: 'gbr', n: 0, pair: 'established' }, 'n', -1).pair).toBe('established'); // a no-op press changes nothing
  });
});
