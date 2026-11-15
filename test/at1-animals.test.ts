// Lane AT1 (2026-11-14; R42, R43): "Fits this tank" on an empty tank, the start group, and the selected animal's size.
import { describe, expect, it } from 'vitest';
import nathan from '../research/visual/vf0/scenes/nathan-20g-long-2026-11-13.json';
import { Store } from '../src/scene/store';
import { parseScene } from '../src/scene/validate';
import { searchSpecies } from '../src/data/species';
import { createFitter } from '../src/ui/logic/animalPicker';
import { startGroup } from '../src/ui/pickerStrict';
import { DEFAULT_QUERY, pickView, addSpecies, selectionView, setSize } from '../src/shell/logic/animals';
import type { TankSetup } from '../src/scene/types';

const one = (q: string) => searchSpecies(q)[0]!;
const emptyTank = (): TankSetup => { const sc = parseScene(nathan).scene; return { ...sc.tanks[sc.active], fish: [] }; };
const listed = (S: TankSetup) => new Set(pickView(S, 'in', 'guided', createFitter(), DEFAULT_QUERY).groups.flatMap(g => g.rows.map(r => r.id)));
const FOUR = ['black molly', 'cardinal tetra', 'cherry barb', 'chili rasbora'];

describe('Fits this tank on an empty tank', () => {
  it('lists black molly, cardinal tetra, cherry barb and chili rasbora in the 20 gal long', () => {
    const on = listed(emptyTank());
    for (const q of FOUR) expect(on.has(one(q).id), q).toBe(true);
  });
  it('still holds a school back where the tank is truly too small (cardinals in 5 gal)', () => {
    const S = emptyTank(); S.tank = { ...S.tank, L: 406, H: 254, D: 203 };   // 16 x 10 x 8 in, about 5.5 gal
    const f = createFitter().exactNow(S, 'in', 'guided', one('cardinal tetra'));
    expect(f.level).not.toBe('ok');
  });
});

describe('the start group', () => {
  it('a school starts at its recommended minimum, a sexed species at a mix that meets its ratio', () => {
    expect(startGroup(one('cardinal tetra')).total).toBeGreaterThanOrEqual(8);
    const m = startGroup(one('black molly')); expect(m.f).toBeGreaterThan(m.n);
    const c = startGroup(one('cherry barb')); expect(c.f).toBeGreaterThanOrEqual(2 * c.n);
  });
  it('Add puts the mix in: the females carry their sex', () => {
    const st = new Store(); st.edit(s => { s.fish = []; });
    const r = addSpecies(st, one('black molly')); expect(r.ok).toBe(true);
    const g = startGroup(one('black molly')), fish = st.tank.fish;
    expect(fish.length).toBe(g.total); expect(fish.filter(f => f.sex === 'f').length).toBe(g.f);
  });
});

describe('the selected animal size (R42)', () => {
  it('reads and sets % of adult size; 100 stores no override', () => {
    const st = new Store(); st.edit(s => { s.fish = []; }); addSpecies(st, one('cardinal tetra'));
    const f0 = st.tank.fish[0]; st.select(f0.id);
    expect(selectionView(st.tank, f0.id, 'in')!.size.pct).toBeGreaterThan(85);
    setSize(st, 50); expect(Math.abs(selectionView(st.tank, f0.id, 'in')!.size.pct - 50)).toBeLessThanOrEqual(1);
    expect(st.tank.fish.find(f => f.id === f0.id)!.tl).toBe(Math.round(one('cardinal tetra').tl / 2));
    setSize(st, 100); expect(st.tank.fish.find(f => f.id === f0.id)!.tl).toBeUndefined();
  });
});
