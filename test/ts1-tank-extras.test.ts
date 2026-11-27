// TS1 (2026-11-17): the three controls the parity audit found dropped (ranks 8, 9, 10): condition, background pictures / arc / glass outlines,
// table position and stand finish. Each control is checked through a real Store: the same TankSetup field the old panel wrote changes.
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { emptyScene } from '../src/scene/defaults';
import { defaultSetup } from '../src/scene/defaults';
import { putOnStand, putOnMyFurniture } from '../src/scene/placement';
import {
  conditionWord, CONDITION_STOPS, setCondition, bgArcShown, arcText, setBgArc, setEdges, addPicture, removePicture, togglePicSide, setPicFit, setPicScale, PIC_MAX,
  tablePos, setTableX, setTableZ, placeTank, setStandFinish, finishCss, tableOn, picSummary,
} from '../src/shell/logic/tank';
import { TABLE_MAX } from '../src/scene/table';
import { IN } from '../src/scene/physics';

const mk = () => { const st = new Store(emptyScene()); return st; };
const fmt = (mm: number) => `${Math.round(mm / IN)} in`;

describe('TS1 condition', () => {
  it('words follow the old panel thresholds', () => {
    expect(conditionWord(0)).toBe('Pristine'); expect(conditionWord(0.2)).toBe('A few weeks'); expect(conditionWord(0.5)).toBe('Overdue'); expect(conditionWord(1)).toBe('Neglected');
    for (const [l, w] of CONDITION_STOPS) expect(conditionWord(l)).toBe(w);
  });
  it('wiring: the slider writes condition.level, clamped', () => {
    const st = mk(); st.edit(s => setCondition(s, 0.9)); expect(st.tank.condition).toEqual({ level: 0.9 });
    st.edit(s => setCondition(s, 4)); expect(st.tank.condition.level).toBe(1);
    st.edit(s => setCondition(s, -1)); expect(st.tank.condition.level).toBe(0);
  });
});

describe('TS1 glass outlines and arc', () => {
  it('wiring: outlines write render.edges', () => {
    const st = mk(); st.edit(s => setEdges(s, false)); expect(st.tank.render.edges).toBe(false); st.edit(s => setEdges(s, true)); expect(st.tank.render.edges).toBe(true);
  });
  it('arc shows on round and bowl tanks with a background, and writes render.bgArc', () => {
    const S = defaultSetup(); expect(bgArcShown(S)).toBe(false);
    S.tank.shape = 'bowl'; expect(bgArcShown(S)).toBe(true); S.render.bg = 'none'; expect(bgArcShown(S)).toBe(false);
    const st = mk(); st.edit(s => setBgArc(s, 200)); expect(st.tank.render.bgArc).toBe(200);
    expect(arcText(360)).toBe('360° (all round)'); expect(arcText(145)).toBe('145°');
  });
});

describe('TS1 background pictures', () => {
  it('adds on the first free side, up to four, never twice', () => {
    const st = mk(); const L = () => st.tank.render.bgImages;
    st.edit(s => { s.render.bgImages = []; });
    st.edit(s => { expect(addPicture(s, 'a').ok).toBe(true); });
    expect(L()[0]).toMatchObject({ img: 'a', fit: 'fill', sides: ['back'], scale: 50 });
    st.edit(s => { expect(addPicture(s, 'a').ok).toBe(false); });
    for (const id of ['b', 'c', 'd']) st.edit(s => { addPicture(s, id); });
    expect(L().map(b => b.sides[0])).toEqual(['back', 'left', 'right', 'front']);
    st.edit(s => { expect(addPicture(s, 'e')).toMatchObject({ ok: false }); }); expect(L().length).toBe(PIC_MAX);
    expect(picSummary(st.tank)).toBe('4 pictures');
  });
  it('sides: off when set, touching sides join and leave other pictures, opposite sides refuse', () => {
    const st = mk(); st.edit(s => { s.render.bgImages = []; addPicture(s, 'a'); addPicture(s, 'b'); }); // a: back, b: left
    st.edit(s => { expect(togglePicSide(s, 'a', 'right')).toBe(''); }); // back + right touch
    expect(st.tank.render.bgImages[0].sides).toEqual(['back', 'right']);
    st.edit(s => { expect(togglePicSide(s, 'a', 'left')).toBe(''); }); // takes left from b
    expect(st.tank.render.bgImages[1].sides).toEqual([]);
    st.edit(s => { togglePicSide(s, 'a', 'left'); }); // off again
    expect(st.tank.render.bgImages[0].sides).toEqual(['back', 'right']);
    let why = ''; st.edit(s => { s.render.bgImages[1].sides = ['left']; why = togglePicSide(s, 'b', 'right'); });
    expect(why).toMatch(/do not meet/); // right was a's, left and right do not touch
  });
  it('fit, tile size and remove write the picture entry', () => {
    const st = mk(); st.edit(s => { s.render.bgImages = []; addPicture(s, 'a'); });
    st.edit(s => setPicFit(s, 'a', 'tile')); st.edit(s => setPicScale(s, 'a', 80));
    expect(st.tank.render.bgImages[0]).toMatchObject({ fit: 'tile', scale: 80 });
    st.edit(s => removePicture(s, 'a')); expect(st.tank.render.bgImages).toEqual([]);
  });
});

describe('TS1 table position and stand finish', () => {
  const furn = () => { const st = mk(); st.edit(s => putOnMyFurniture(s)); return st; };
  it('position shows only on a table or custom stand', () => {
    const st = mk(); st.edit(s => putOnStand(s, { style: 'cabinet' })); expect(tableOn(st.tank)).toBe(false);
    st.edit(s => putOnMyFurniture(s)); expect(tableOn(st.tank)).toBe(true);
  });
  it('wiring: left/right and front/back write stand.table.x / z; words say how far', () => {
    const st = furn(); const r = tablePos(st.tank, fmt);
    expect(r.x1).toBeGreaterThan(r.x0);
    st.edit(s => setTableX(s, 100)); st.edit(s => setTableZ(s, -50));
    expect(st.tank.stand.table.x).toBe(100); expect(st.tank.stand.table.z).toBe(-50);
    const t = tablePos(st.tank, fmt); expect(t.xText).toMatch(/right/); expect(t.zText).toMatch(/forward/);
  });
  it('wiring: Centre / Back / Front', () => {
    const st = furn(); st.edit(s => setTableX(s, 80));
    st.edit(s => placeTank(s, 'centre')); expect(st.tank.stand.table).toMatchObject({ x: 0, z: 0 }); expect(tablePos(st.tank, fmt).xText).toBe('Centered');
    st.edit(s => placeTank(s, 'back')); expect(st.tank.stand.table.x).toBe(0); expect(st.tank.stand.table.z).toBeGreaterThan(0); expect(st.tank.stand.table.z).toBeLessThanOrEqual(TABLE_MAX);
    st.edit(s => placeTank(s, 'front')); expect(st.tank.stand.table.z).toBeLessThan(0);
  });
  it('wiring: stand finish writes stand.finish and keeps the stand shown', () => {
    const st = mk(); st.edit(s => putOnStand(s, { style: 'cabinet' }));
    st.edit(s => setStandFinish(s, 'black')); expect(st.tank.stand.finish).toBe('black'); expect(st.tank.stand.show).toBe(true);
    expect(finishCss('black')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
