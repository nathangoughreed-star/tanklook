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

import { stockView, speciesDetail } from '../src/shell/logic/animals';
import { getSpecies } from '../src/data/species';

// vitest turns a ?raw css import into '', so read the file with Node's own fs
const css: string = (globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, e: string): string } } }).process.getBuiltinModule('fs').readFileSync('src/shell/shell.css', 'utf8');

describe('R47: every animal in the tank shows a stocking row', () => {
  it('rows add up to the animals: added through the picker, plus old-file fish with no sex or tracked sex', () => {
    const st = new Store(); st.edit(s => { s.fish = []; });
    expect(addSpecies(st, one('white cloud')).ok).toBe(true);
    expect(addSpecies(st, one('black molly')).ok).toBe(true);
    st.edit(s => { const id = s.fish.reduce((m, f) => Math.max(m, f.id), 0) + 1; s.fish.push({ ...s.fish[0], id, species: one('cardinal tetra').id }, { ...s.fish[0], id: id + 1, species: 'no-such-species' }); });
    const v = stockView(st.tank, 'guided', 'in', createFitter());
    expect(v.rows.reduce((n, r) => n + r.n, 0)).toBe(st.tank.fish.filter(f => getSpecies(f.species)).length);
    expect(v.rows.every(r => r.n > 0 && r.name)).toBe(true);
  });
  it('the stock row class is not the screen-reader-only class (.sr hid every row at 1 px)', () => {
    const hidden = [...css.matchAll(/([^{}]+)\{[^}]*clip: rect\(0 0 0 0\)[^}]*\}/g)].map(m => m[1].trim());
    expect(css.length, 'css loaded').toBeGreaterThan(1000); expect(hidden.length).toBeGreaterThan(0);
    for (const sel of hidden) expect(sel.split(',').map(x => x.trim())).not.toContain('.srow');
    expect(css).toMatch(/\.srow \{ display: grid/);
  });
});

describe('R48: the species detail model', () => {
  it('has care level, size, tank in gallons, group, temperament, water in deg F and the fit; leaves out what the catalogue lacks', () => {
    const S = emptyTank(), sp = one('white cloud'), f = createFitter();
    const d = speciesDetail(S, sp, f.exactNow(S, 'in', 'guided', sp), 'in'), k = d.rows.map(r => r[0]);
    for (const need of ['Care level', 'Adult size', 'Smallest tank', 'Group', 'Temperament', 'Water temperature', 'Swims in']) expect(k, need).toContain(need);
    expect(d.rows.find(r => r[0] === 'Smallest tank')![1]).toMatch(/gal/);
    expect(d.rows.find(r => r[0] === 'Water temperature')![1]).toMatch(/°F/);
    expect(d.rows.find(r => r[0] === 'Adult size')![1]).toMatch(/″/);
    expect(d.startCount).toBeGreaterThanOrEqual(6); expect(d.look).toBe(sp.look);
  });
  it('a held-back species says why', () => {
    const S = emptyTank(); S.tank = { ...S.tank, L: 406, H: 254, D: 203 };
    const sp = one('oscar'), d = speciesDetail(S, sp, createFitter().exactNow(S, 'in', 'guided', sp), 'in');
    expect(d.fit.level).not.toBe('ok'); expect(d.fit.text.length).toBeGreaterThan(5);
  });
});

import { noteIn } from '../src/shell/logic/animals';
describe('species notes in US units', () => {
  it('converts deg C ranges and single values in the text to deg F, leaves metric alone', () => {
    expect(noteIn('Cool water, about 18-22 °C; no heater needed', 'in')).toBe('Cool water, about 64-72 °F; no heater needed');
    expect(noteIn('A warm-water cory, about 24-28 °C (Seriously Fish): a', 'in')).toContain('75-82 °F');
    expect(noteIn('keep at 25 °C', 'in')).toBe('keep at 77 °F');
    expect(noteIn('about 18-22 °C', 'cm')).toBe('about 18-22 °C');
    const sp = one('white cloud'), S = emptyTank(), d = speciesDetail(S, sp, createFitter().exactNow(S, 'in', 'guided', sp), 'in');
    expect(d.note).not.toMatch(/°C/);
  });
});

describe('R51: a species already in the tank leaves the tiles', () => {
  it('drops out with its counts, and comes back when removed', () => {
    const st = new Store(); st.edit(s => { s.fish = []; });
    const f = createFitter(), sp = one('white cloud'), ids = (S: TankSetup) => pickView(S, 'in', 'guided', f, { ...DEFAULT_QUERY, fitsOnly: false });
    const before = ids(st.tank);
    expect(before.groups.flatMap(g => g.rows.map(r => r.id))).toContain(sp.id);
    expect(addSpecies(st, sp).ok).toBe(true);
    const after = ids(st.tank);
    expect(after.groups.flatMap(g => g.rows.map(r => r.id))).not.toContain(sp.id);
    expect(after.shown).toBe(before.shown - 1);
    expect(after.chips[0].n).toBe(before.chips[0].n - 1);
    st.edit(s => { s.fish = s.fish.filter(x => x.species !== sp.id); });
    expect(ids(st.tank).shown).toBe(before.shown);
  });
});
