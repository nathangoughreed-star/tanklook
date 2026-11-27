// UI2 shell step 9 (lane S9): the Compare helpers (src/shell/logic/compare.ts) on the real Store, tank diff and checks. Node only.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { Store } from '../src/scene/store';
import { defaultScene } from '../src/scene/defaults';
import { defaultProfile } from '../src/demand';
import { checksModel } from '../src/shell/logic/checks';
import { sideStore, sideIndexOf } from '../src/ui/sideStore';
import {
  startCompare, endCompare, useSide, setEditMode, editModeOf, setLinked, linkedOf, linkWord, diffRows, diffWord, sideTab, checkDiffs, checkCompare, checkFigure, letterOf,
} from '../src/shell/logic/compare';

const base = () => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => /plant/i.test(k)) ?? Object.keys(SCENES)[0]])).scene; return new Store({ ...defaultScene(), tanks: [{ ...sc.tanks[sc.active], product: undefined }] }); };   // FD: the planted example is now a catalog tank; these rows are about a free-size tank
const split = () => { const s = base(); startCompare(s); return s; };

describe('start / end / use this one', () => {
  it('Compare splits once: B is a copy of A, B is the tank being edited', () => {
    const s = base();
    expect(startCompare(s)).toBe(true);
    expect(s.scene.tanks).toHaveLength(2);
    expect(JSON.stringify(s.scene.tanks[1].fish)).toBe(JSON.stringify(s.scene.tanks[0].fish));
    expect(editModeOf(s.targets)).toBe('B');
    expect(startCompare(s)).toBe(false);
    expect(s.scene.tanks).toHaveLength(2);
  });
  it('Use this one keeps that side and drops the other; undo brings it back', () => {
    const s = split();
    s.editTank(1, t => { t.fish = []; });
    const note = useSide(s, 1);
    expect(note).toMatch(/Kept Tank B/);
    expect(s.scene.tanks).toHaveLength(1);
    expect(s.scene.tanks[0].fish).toHaveLength(0);
    s.undo(); expect(s.scene.tanks).toHaveLength(2);
    expect(s.scene.tanks[0].fish.length).toBeGreaterThan(0);
    useSide(s, 0); expect(s.scene.tanks).toHaveLength(1); expect(s.scene.tanks[0].fish.length).toBeGreaterThan(0);
  });
  it('End compare keeps the shown tank; with one tank nothing happens', () => {
    const s = split(); endCompare(s);
    expect(s.scene.tanks).toHaveLength(1);
    expect(() => { endCompare(s); useSide(s, 0); }).not.toThrow();
    expect(s.scene.tanks).toHaveLength(1);
  });
});

describe('Editing A / B / Both', () => {
  it('each mode sets the Store targets, the shown tank follows', () => {
    const s = split();
    setEditMode(s, 'A'); expect(editModeOf(s.targets)).toBe('A'); expect(s.scene.active).toBe(0);
    setEditMode(s, 'Both'); expect(editModeOf(s.targets)).toBe('Both');
    setEditMode(s, 'B'); expect(editModeOf(s.targets)).toBe('B'); expect(s.scene.active).toBe(1);
    expect(editModeOf([])).toBe('none');
  });
  it('an edit under "Both" reaches both tanks, under "A" only A', () => {
    const s = split();
    setEditMode(s, 'Both'); s.edit(t => { t.fish = []; });
    expect(s.scene.tanks.map(t => t.fish.length)).toEqual([0, 0]);
    s.undo(); setEditMode(s, 'A'); s.edit(t => { t.fish = []; });
    expect(s.scene.tanks[0].fish).toHaveLength(0); expect(s.scene.tanks[1].fish.length).toBeGreaterThan(0);
  });
});

describe('views linked', () => {
  it('toggles the Store camera lock', () => {
    const s = split();
    setLinked(s, false); expect(linkedOf(s)).toBe(false); expect(linkWord(false)).toBe('Views independent');
    setLinked(s, true); expect(linkedOf(s)).toBe(true); expect(linkWord(true)).toBe('Views linked');
  });
});

describe('differences', () => {
  it('identical copies differ in nothing; a change shows up in the rows and the checks', () => {
    const s = split(), P = defaultProfile(), u = s.scene.units;
    expect(diffRows(s.scene.tanks[0], s.scene.tanks[1], u)).toEqual([]);
    const m = () => [0, 1].map(i => checksModel(s.scene.tanks[i], i, u, P));
    expect(Object.values(checkDiffs(m()[0], m()[1])).some(Boolean)).toBe(false);
    s.editTank(1, t => { t.fish = t.fish.slice(0, 1); });
    expect(diffRows(s.scene.tanks[0], s.scene.tanks[1], u).length).toBeGreaterThan(0);
    const [a, b] = m(), cc = checkCompare(a, b);
    expect(cc.map(c => c.id)).toEqual(['habitat', 'cost', 'water', 'notes']);
    expect(cc.find(c => c.id === 'cost')!.a).toBe(checkFigure(a, 'cost'));
    expect(cc.some(c => c.differs)).toBe(true);
  });
  it('words and tab', () => {
    expect([diffWord(0), diffWord(1), diffWord(4)]).toEqual(['same', '1 diff', '4 diffs']);
    const s = split(), t = sideTab(s.scene.tanks[1], 1, 'in', true, 4);
    expect(t).toMatchObject({ letter: 'B', editing: true, diffs: 4, diffWord: '4 diffs' });
    expect(t.size).toMatch(/gal|in/);
    expect([letterOf(0), letterOf(1)]).toEqual(['A', 'B']);
  });
});

describe('sideStore as is', () => {
  it('a side store is pinned to its tank (checks of side B read tank B)', () => {
    const s = split(), b = sideStore(s, 1);
    expect(sideIndexOf(b)).toBe(1);
    expect(b.tank).toBe(s.scene.tanks[1]);
    b.edit(t => { t.fish = []; });
    expect(s.scene.tanks[1].fish).toHaveLength(0); expect(s.scene.tanks[0].fish.length).toBeGreaterThan(0);
  });
});

describe('match buttons (CP2)', () => {
  it('matchRow makes one side take the other value, one undo step', async () => {
    const { matchRow, matchAll } = await import('../src/shell/logic/compare');
    const s = split();
    s.update(sc => { sc.tanks[1].lid = sc.tanks[0].lid === 'glass' ? 'open' : 'glass'; sc.tanks[1].render.rim = !sc.tanks[0].render.rim; });
    const rows = diffRows(s.scene.tanks[0], s.scene.tanks[1], s.scene.units);
    expect(rows.length).toBe(2);
    const lidK = rows.find(r => /lid|top/i.test(r.a + r.b))!.k;
    const lidA = s.scene.tanks[0].lid;
    expect(matchRow(s, lidK, 1)).toMatch(/Tank B now matches Tank A/);
    expect(s.scene.tanks[1].lid).toBe(lidA);
    expect(diffRows(s.scene.tanks[0], s.scene.tanks[1], s.scene.units).length).toBe(1);
    s.undo(); expect(diffRows(s.scene.tanks[0], s.scene.tanks[1], s.scene.units).length).toBe(2);
    expect(matchAll(s, 0)).toMatch(/Tank A now matches Tank B in 2 settings/);
    expect(diffRows(s.scene.tanks[0], s.scene.tanks[1], s.scene.units).length).toBe(0);
    s.undo(); expect(diffRows(s.scene.tanks[0], s.scene.tanks[1], s.scene.units).length).toBe(2);
    expect(matchAll(split(), 1)).toBe('');
  });
});
