// UI2 shell step 1 (lane S1, 2026-11-13): the check bar / drawer view-models (src/shell/logic/checks.ts) and the rail rules
// (src/shell/logic/sections.ts). Node only (decision 7): the components just draw these.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { defaultProfile, demandOf } from '../src/demand';
import { stockingOf } from '../src/scene/stocking';
import { checksModel, costView, demandFor, fmtTemp, habitatView, notesView, riskWord, usd, waterView } from '../src/shell/logic/checks';
import { SECTIONS, PHONE_TABS, MORE, railClick, escape, COMES_IN } from '../src/shell/logic/sections';
import type { TankSetup } from '../src/scene/types';

const ex = (name: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[name])).scene; return sc.tanks[sc.active]; };
const withFish = () => Object.keys(SCENES).map(ex).find(S => S.water.on && !S.water.salt && stockingOf(S).contributors.length >= 2)!;

describe('habitat check', () => {
  it('a stocked tank: the pill is the stocking summary verdict, with the bars and topics', () => {
    const v = habitatView(withFish(), 'in');
    expect(v.empty).toBe(false);
    expect(['Compatible', 'Caution', 'Problem', 'Not enough information']).toContain(v.pill.word.split(' · ')[0]);
    expect(v.bars.map(b => b.key).slice(0, 2)).toEqual(['water', 'floor']);
    expect(v.cats.length).toBeGreaterThan(0);
    expect(v.sizeLine).toMatch(/gal/);
  });
  it('no animals: a neutral "No animals", no bars', () => {
    const S = withFish(), v = habitatView({ ...S, fish: [] }, 'in');
    expect(v).toMatchObject({ empty: true, pill: { tone: 'neutral', word: 'No animals' }, bars: [], cats: [] });
  });
});

describe('cost and time', () => {
  it('prices the tank as the old cost panel does, in dollars, $/mo and min/wk', () => {
    const S = withFish(), P = defaultProfile(), D = demandFor(S, 0, P), v = costView(D);
    expect(D.totals.setupUsd).toBeGreaterThan(0);
    expect(v.setup).toBe(usd(D.totals.setupUsd));
    expect(v.monthly).toMatch(/^\$[\d,]+\/mo$/);
    expect(v.minutes).toMatch(/^\d+ min\/wk$/);
    expect(v.rows.length).toBeGreaterThan(0);
    for (let i = 1; i < v.rows.length; i++) expect(Number(v.rows[i - 1].setup.replace(/\D/g, ''))).toBeGreaterThanOrEqual(Number(v.rows[i].setup.replace(/\D/g, '')));
    // with no pinned kit and no deals the plain engine agrees
    expect(demandOf(S, P).totals.setupUsd).toBeGreaterThan(0);
  });
  it('words the difficulty as the old panel does', () => {
    expect([riskWord(1), riskWord(4), riskWord(8)]).toEqual(['Easy', 'Moderate', 'Demanding']);
    expect(usd(1264.4)).toBe('$1,264');
  });
});

describe('water', () => {
  it('reads the recommended temperature in °F with US units, and a verdict', () => {
    const v = waterView(withFish(), 'in');
    expect(v.temp).toMatch(/^\d+ °F$/);
    expect(['fits', 'tight', 'does not fit', 'no data']).toContain(v.pill.word);
    expect(v.rows[0].label).toBe('Water');
    expect(fmtTemp(24, 'in')).toBe('75 °F');
    expect(fmtTemp(24.3, 'cm')).toBe('24.5 °C');
  });
});

describe('notes', () => {
  it('counts every issue, warns only for gates and hard limits', () => {
    const i = (t: string) => ({ id: t, tab: 'fish', uids: [], text: t }) as any;
    expect(notesView({ gates: [], hard: [], targets: [i('a')], advisories: [i('b')], feasible: true })).toMatchObject({ count: 2, tone: 'neutral' });
    expect(notesView({ gates: [i('g')], hard: [], targets: [], advisories: [], feasible: false })).toMatchObject({ count: 1, tone: 'warn' });
    expect(notesView({ gates: [], hard: [], targets: [], advisories: [], feasible: true }).groups).toEqual([]);
  });
  it('the whole model builds for every example scene without throwing', () => {
    for (const name of Object.keys(SCENES)) {
      const m = checksModel(ex(name), 0, 'in', defaultProfile());
      expect(m.habitat.pill.word.length).toBeGreaterThan(0);
      expect(typeof m.notes.count).toBe('number');
    }
  });
});

describe('rail and panel rules', () => {
  it('9 sections + Settings, Settings at the bottom; the phone shows four tabs and More holds the rest', () => {
    expect(SECTIONS.length).toBe(10);
    expect(SECTIONS.filter(s => s.bottom).map(s => s.id)).toEqual(['settings']);
    expect([...PHONE_TABS, ...MORE].sort()).toEqual(SECTIONS.map(s => s.id).sort());
    for (const s of SECTIONS) expect(COMES_IN[s.id]).toBeGreaterThan(1);
  });
  it('the open section\'s icon folds the panel; another opens that one', () => {
    expect(railClick('tank', 'tank')).toBeNull();
    expect(railClick('tank', 'animals')).toBe('animals');
    expect(railClick(null, 'print')).toBe('print');
  });
  it('Esc closes the drawer first, then the panel', () => {
    expect(escape({ drawer: 'cost', section: 'tank' })).toEqual({ drawer: null, section: 'tank' });
    expect(escape({ drawer: null, section: 'tank' })).toEqual({ drawer: null, section: null });
  });
});
