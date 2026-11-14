// Lane S4 (2026-11-14; UI2 §7 step 4): the Animals section / Water look / Selection drawer view-models and edits (src/shell/logic/animals.ts).
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { getSpecies } from '../src/data/species';
import { createFitter } from '../src/ui/logic/animalPicker';
import {
  DEFAULT_QUERY, pickView, stockView, waterLook, selectionView, addSpecies, setCount, removeMisfits, applyPreset, setLevel, setTint, setColor,
  flip, del, dup, setSex, setPair, rowKeyOf,
} from '../src/shell/logic/animals';

const sp = (id: string) => getSpecies(id)!;
const mk = () => new Store();
const fitter = () => createFitter();

describe('Animals picker view', () => {
  it('"Fits this tank" is on by default and holds back what does not fit; off shows them', () => {
    const st = mk(), S = st.tank;
    const on = pickView(S, 'in', 'guided', fitter(), DEFAULT_QUERY), off = pickView(S, 'in', 'guided', fitter(), { ...DEFAULT_QUERY, fitsOnly: false });
    expect(DEFAULT_QUERY.fitsOnly).toBe(true);
    expect(off.shown).toBeGreaterThanOrEqual(on.shown);
    expect(on.hidden).toBe(off.shown - on.shown);
    expect(on.groups.every(g => g.rows.every(r => r.level === 'ok' && !r.reason))).toBe(true);
    // in a 15 gal tank some large animal does not fit: it is listed with its reason when the filter is off
    expect(off.groups.flatMap(g => g.rows).some(r => r.level !== 'ok' && r.reason.length > 0)).toBe(true);
    expect(on.hidden).toBeGreaterThan(0);
  });
  it('sandbox rules grey nothing', () => {
    const v = pickView(mk().tank, 'in', 'sandbox', fitter(), { ...DEFAULT_QUERY, fitsOnly: false });
    expect(v.groups.flatMap(g => g.rows).every(r => r.level === 'ok')).toBe(true);
    expect(v.hidden).toBe(0);
  });
  it('search narrows, a role chip narrows, the empty sentence says why', () => {
    const S = mk().tank, f = fitter();
    const q = pickView(S, 'in', 'sandbox', f, { q: 'neon', fitsOnly: false });
    expect(q.groups.flatMap(g => g.rows).some(r => r.id === 'neon')).toBe(true);
    const none = pickView(S, 'in', 'sandbox', f, { q: 'zzzzqqq', fitsOnly: false });
    expect(none.shown).toBe(0); expect(none.none).toMatch(/Nothing/);
    const r = pickView(S, 'in', 'sandbox', f, { q: '', role: 'school', fitsOnly: false });
    expect(r.groups.map(g => g.role)).toEqual(['school']);
    expect(r.chips[0]).toMatchObject({ label: 'All' });
  });
  it('a schooling species adds its start count; a second add is refused with a reason', () => {
    const st = mk();
    expect(addSpecies(st, sp('neon')).ok).toBe(true);
    const n = st.tank.fish.filter(f => f.species === 'neon').length;
    expect(n).toBeGreaterThan(1);
    const b = addSpecies(st, sp('neon'));
    expect(b).toMatchObject({ ok: false });
    expect((b as { why: string }).why).toMatch(/already in the stocking list/);
    expect(pickView(st.tank, 'in', 'sandbox', fitter(), { q: 'neon', fitsOnly: false }).groups.flatMap(g => g.rows).find(r => r.id === 'neon')!.inTank).toBe(n);
  });
});

describe('Stocking list', () => {
  it('counts, + / - / remove', () => {
    const st = mk(); addSpecies(st, sp('neon'));
    const n0 = st.tank.fish.length;
    setCount(st, sp('neon'), k => k + 1, undefined); setCount(st, sp('neon'), k => k + 1, undefined);
    expect(stockView(st.tank, 'sandbox', 'in', fitter()).rows[0]).toMatchObject({ id: 'neon', n: n0 + 2 });
    setCount(st, sp('neon'), k => k - 1, undefined);
    expect(st.tank.fish.length).toBe(n0 + 1);
    setCount(st, sp('neon'), () => 0, undefined);
    expect(st.tank.fish.length).toBe(0);
    expect(stockView(st.tank, 'sandbox', 'in', fitter()).rows).toEqual([]);
  });
  it('a dimorphic species has a row per sex', () => {
    const st = mk(), b = sp('betta'); expect(b.female).toBeTruthy();
    setCount(st, b, () => 1, undefined); setCount(st, b, () => 1, 'f');
    const rows = stockView(st.tank, 'sandbox', 'in', fitter()).rows;
    expect(rows.map(r => r.key)).toEqual(['betta', 'betta~f']);
    expect(rows[1].name).toMatch(/female/);
  });
  it('a count blocked by the tank says why and changes nothing (fish need water)', () => {
    const st = mk(); st.edit(s => { s.water.on = false; });
    const r = setCount(st, sp('neon'), () => 3, undefined);
    expect(r).toMatchObject({ ok: false }); expect(st.tank.fish.length).toBe(0);
  });
  it('a tank change leaves misfits, marked with a reason; Remove misfits takes exactly them off and Ctrl+Z brings them back', () => {
    const st = mk(); addSpecies(st, sp('neon')); addSpecies(st, sp('ocellaris'));
    st.edit(s => { s.water.salt = true; });
    const v = stockView(st.tank, 'sandbox', 'in', fitter());
    const neon = v.rows.find(r => r.id === 'neon')!;
    expect(neon.off).toBe(true); expect(neon.reason).toMatch(/does not live in saltwater/);
    const nNeon = st.tank.fish.filter(f => f.species === 'neon').length;
    expect(v.misfits).toBe(nNeon);
    expect(v.misfitText).toMatch(/not live in saltwater/);
    expect(removeMisfits(st).ok).toBe(true);
    expect(st.tank.fish.every(f => f.species !== 'neon')).toBe(true);
    expect(st.tank.fish.some(f => f.species === 'ocellaris')).toBe(true);
    expect(stockView(st.tank, 'sandbox', 'in', fitter()).misfits).toBe(0);
    st.undo();
    expect(st.tank.fish.filter(f => f.species === 'neon').length).toBe(nNeon);
  });
  it('a stocking made here is the same scene JSON the old UI reads (same counts)', () => {
    const st = mk(); addSpecies(st, sp('neon')); setCount(st, sp('betta'), () => 1, undefined);
    const copy = JSON.parse(JSON.stringify(st.scene)) as typeof st.scene;
    const by = (s: typeof st.scene) => s.tanks[s.active].fish.reduce((m, f) => (m[f.species] = (m[f.species] ?? 0) + 1, m), {} as Record<string, number>);
    expect(by(copy)).toEqual(by(st.scene));
    expect(by(copy).betta).toBe(1);
  });
});

describe('Water look', () => {
  it('level and tint edits go through the engine; presets follow the water type', () => {
    const st = mk(); addSpecies(st, sp('neon'));
    setLevel(st, 0.5); expect(st.tank.water.level).toBe(0.5);
    setTint(st, 0.3); expect(st.tank.water.opacity).toBe(0.3);
    expect(waterLook(st.tank, 'in').tintText).toBe('30%');
    expect(waterLook(st.tank, 'in').levelText).toMatch(/″ high$/);
    const L = waterLook(st.tank, 'in'); expect(L.presets.map(p => p.id)).toEqual(['clear', 'tannin', 'green']);
    applyPreset(st, L.presets[1]); expect(waterLook(st.tank, 'in').current).toBe('tannin');
    st.edit(s => { s.water.salt = true; });
    expect(waterLook(st.tank, 'in').presets.map(p => p.id)).toEqual(['clear', 'reef', 'ocean']);
  });
  it('a colour picked on clear water shows (tint raised); water off says so', () => {
    const st = mk(); setTint(st, 0); setColor(st, '#336699');
    expect(st.tank.water.opacity).toBe(0.3);
    st.edit(s => { s.water.on = false; });
    expect(waterLook(st.tank, 'in').on).toBe(false); expect(waterLook(st.tank, 'in').off).toMatch(/Water is off/);
  });
});

describe('Selection drawer', () => {
  it('shows the animal, sex for a dimorphic species, flip / duplicate / delete', () => {
    const st = mk(); setCount(st, sp('betta'), () => 1, undefined);
    const id = st.tank.fish[0].id; st.select(id);
    const v = selectionView(st.tank, st.selId, 'in')!;
    expect(v).toMatchObject({ id, name: sp('betta').name }); expect(v.sex).toEqual({ on: 'm' });
    expect(v.lines[0][0]).toBe('Length');
    const yaw = st.tank.fish[0].yaw; flip(st); expect(st.tank.fish[0].yaw).not.toBe(yaw);
    setSex(st, 'f'); expect(selectionView(st.tank, id, 'in')!.sex).toEqual({ on: 'f' });
    expect(rowKeyOf(st.tank.fish[0])).toBe('betta~f');
    dup(st); expect(st.tank.fish.length).toBe(2); expect(st.selId).not.toBe(id);
    del(st); expect(st.tank.fish.length).toBe(1);
  });
  it('nothing selected (or a vanished id) is null', () => {
    const st = mk(); expect(selectionView(st.tank, null, 'in')).toBeNull(); expect(selectionView(st.tank, 999, 'in')).toBeNull();
  });
  it('a pair species asks Pair while exactly two are in', () => {
    const st = mk(); st.edit(s => { s.water.salt = true; }); setCount(st, sp('ocellaris'), () => 2, undefined);
    st.select(st.tank.fish[0].id);
    const v = selectionView(st.tank, st.selId, 'in')!;
    expect(v.pair?.choices.map(c => c[0])).toEqual(['established', 'unconfirmed', 'unknown']);
    setPair(st, 'established'); expect(selectionView(st.tank, st.selId, 'in')!.pair!.on).toBe('established');
    setCount(st, sp('ocellaris'), () => 3, undefined); expect(selectionView(st.tank, st.selId, 'in')!.pair).toBeNull();
  });
  it('how big it looks comes from the viewer measurement', () => {
    const st = mk(); setCount(st, sp('betta'), () => 1, undefined);
    const v = selectionView(st.tank, st.tank.fish[0].id, 'in', () => ({ len: 50, ref: 100 }))!;
    expect(v.lines.find(l => l[0].startsWith('Looks'))![1]).toBe('50 % as big');
  });
});
