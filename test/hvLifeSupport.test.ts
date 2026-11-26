// Lane HV unit 1: one "missing life support" function; an unheated tropical tank is never green, a missing filter is a Caution not a grey pill.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { inferTech } from '../src/scene/tech';
import { lifeSupportOf, notChosenLine } from '../src/scene/lifeSupport';
import { summaryOf, summaryText } from '../src/ui/stockSummary';
import { habitatView, waterView } from '../src/shell/logic/checks';
import { checklistOf } from '../src/shell/logic/checklist';
import { planHtml } from '../src/ui/planSheet';
import { roomWorking } from '../src/ui/logic/room';
import { stockingMemo } from '../src/scene/stocking';
import { overWarn } from '../src/ui/stockPlanLogic';
import { lifeFixPlans } from '../src/shell/logic/lifeFix';
import { paperOf } from '../src/shell/logic/print';
import { defaultProfile } from '../src/demand/types';
import type { TankSetup } from '../src/scene/types';

const base = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const t = parseScene(JSON.parse(SCENES[k])).scene; return t.tanks[t.active].water.on; })!])).scene; return sc.tanks[sc.active]; };
const mk = (mix: [string, number][], rows?: Record<string, string>, extra: Partial<TankSetup> = {}): TankSetup => {
  const S = base(), f0 = S.fish[0];
  return { ...S, ...extra, tech: rows ? { rows: { ...inferTech(S).rows, ...rows } } : undefined, fish: mix.flatMap(([id, n]) => Array.from({ length: n }, () => ({ ...f0, species: id }))) } as TankSetup;
};
const env = (S: TankSetup) => summaryOf(S, 'in').cats.find(c => c.id === 'environment')!;

describe('HV life support', () => {
  it('unheated cardinals: a heater is missing, the pill is Caution (never green), the line has a Fix it destination', () => {
    const S = mk([['cardinal', 10]], { heater: 'none', filter: 'hob' });
    expect(lifeSupportOf(S).map(m => m.kind)).toEqual(['heater']);
    const sm = summaryOf(S, 'in'), it = env(S).items.find(i => i.support === 'heater')!;
    expect(it.level).toBe('caution'); expect(it.go).toBe('heater'); expect(it.text).toMatch(/Heater not chosen: Cardinal tetra wants 7\d.*°F/);
    expect(sm.worst).toBe('caution'); expect(sm.worst).not.toBe('ok');
    const hv = habitatView(S, 'in'); expect(hv.pill.tone).toBe('warn'); expect(hv.support.length).toBe(1);
  });
  it('the checklist, the plan sheet and the text print agree', () => {
    const S = mk([['cardinal', 10]], { heater: 'none', filter: 'hob' }), sm = summaryOf(S, 'in');
    expect(notChosenLine(sm.missing)).toBe('Not chosen yet: a heater');
    expect(summaryText(sm)[0]).toBe('Not chosen yet: a heater');
    expect(checklistOf(S).steps.find(s => s.id === 'equipment')!.hint).toMatch(/heater/);
    expect(checklistOf(S).steps.find(s => s.id === 'equipment')!.done).toBe(false);
  });
  it('a heater chosen clears it', () => {
    const S = mk([['cardinal', 10]], { heater: 'one', filter: 'hob' });
    expect(lifeSupportOf(S)).toEqual([]); expect(summaryOf(S, 'in').worst).toBe('ok');
  });
  it('scenario 0 (8 neon + 1 bristlenose, HOB, no heater): the bristlenose narrows the shared range above a 70 F room, so a heater is missing', () => {
    const S = mk([['neon', 8], ['bristlenose', 1]], { heater: 'none', filter: 'hob' });
    expect(lifeSupportOf(S).map(m => m.kind)).toEqual(['heater']); expect(summaryOf(S, 'in').worst).toBe('caution');
  });
  it('neon tetras alone: an assumed 70 F room is inside their range, so no heater is missing', () => {
    expect(lifeSupportOf(mk([['neon', 8]], { heater: 'none', filter: 'hob' }))).toEqual([]);
  });
  it('an entered cold room makes it an outside state and still a missing heater', () => {
    const S = mk([['cardinal', 10]], { heater: 'none', filter: 'hob' }); S.tech!.roomC = 18;
    expect(lifeSupportOf(S).map(m => m.kind)).toEqual(['heater']);
  });
  it('a missing filter is a Caution with a Fix it, not a grey pill', () => {
    const S = mk([['cardinal', 10]], { heater: 'one', filter: 'none' });
    const sm = summaryOf(S, 'in');
    expect(lifeSupportOf(S).map(m => m.kind)).toEqual(['filter']);
    expect(sm.worst).toBe('caution'); expect(env(S).items.find(i => i.support === 'filter')!.go).toBe('filter');
  });
  it('stock-first tank (the Start sheet animal door): a heater is inferred for cardinals, the filter is not until chosen', () => {
    const S = mk([['cardinal', 10]], undefined, { stockFirst: true });
    expect(lifeSupportOf(S).map(m => m.kind)).toEqual(['filter']);
  });
  it('Not checked never greys the pill: only unchecked lines leave the word at its best', () => {
    const S = mk([['cardinal', 10]], { heater: 'one', filter: 'hob' }), sm = summaryOf(S, 'in');
    expect(sm.worst).toBe('ok'); expect(sm.unchecked).toBeGreaterThanOrEqual(0);
    expect(habitatView(S, 'in').pill.tone).toBe('ok');
  });
  it('the plan sheet opens with Not chosen yet', () => {
    const S = mk([['cardinal', 10]], { heater: 'none', filter: 'hob' });
    expect(planHtml({ title: 't', tank: 'x', animals: ['a'], fits: true, rows: [], missing: [], verdict: [{ level: 'ok', text: 'a' }, { level: 'ok', text: 'b' }], setupUsd: 0, upkeepUsdMo: 0, minPerWeek: 0, rhythm: '', rhythmNote: '', cycleNote: '', deals: [], waterPct: 1, floorPct: 1 } as any, [], summaryOf(S, 'in'))).toMatch(/Not chosen yet: a heater/);
  });
  it('Room working: 40 cardinals count as ~27 for room, and headroom comes from the engine itself', () => {
    const S = mk([['cardinal', 40]], { heater: 'one', filter: 'hob' }, { tank: { ...base().tank, L: 914, D: 457, H: 406 } as any });
    const w = roomWorking(S, stockingMemo(S));
    expect(w.countAs[0]).toMatch(/^40 Cardinal tetras count as 2[67] for room/);
    expect(w.headroom).toMatch(/more/);
  });
  it('a rule with no source never speaks as a fight: schooling species (flat counts only) give no over-count warning at any count', () => {
    for (const id of ['neon', 'cardinal', 'ember', 'rummynose', 'danio', 'harlequin']) expect(overWarn({ id, n: 500 }), id).toBeUndefined();
  });
  it('the shell print list opens with Not chosen yet, and is silent once the heater is chosen', () => {
    const run = (rows: Record<string, string>) => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES)[0]])).scene; sc.tanks[sc.active] = mk([['cardinal', 10]], rows); return paperOf('shopping', new Set(['tank', 'equipment', 'animals', 'prices']), { scene: sc, active: sc.active, profile: defaultProfile(), now: Date.parse('2026-11-13') }); };
    expect(run({ heater: 'none', filter: 'hob' }).notChosen).toBe('Not chosen yet: a heater');
    expect(run({ heater: 'one', filter: 'hob' }).notChosen).toBeNull();
  });
  it('the header water chip says the room, not the setpoint, and never "fits", while the heater is missing', () => {
    const w = waterView(mk([['cardinal', 10]], { heater: 'none', filter: 'hob' }), 'in');
    expect(w.temp).toMatch(/70 °F \(assumed\) room/); expect(w.pill.word).toBe('no heater'); expect(w.pill.tone).toBe('warn');
    expect(waterView(mk([['cardinal', 10]], { heater: 'one', filter: 'hob' }), 'in').pill.word).toBe('fits');
  });
  it('Fix it states its effect and clears exactly that line: heater and filter', () => {
    const S = mk([['cardinal', 10]], { heater: 'none', filter: 'none' }), plans = lifeFixPlans(S, 'in');
    expect(plans.heater?.what).toMatch(/^Add a \d+ W heater/); expect(plans.heater?.describe).toMatch(/W heater/);
    expect(plans.filter?.what).toMatch(/^Add a .*filter/);
    const T = structuredClone(S); plans.heater!.apply(T); expect(lifeSupportOf(T).map(m => m.kind)).toEqual(['filter']);
    plans.filter!.apply(T); expect(lifeSupportOf(T)).toEqual([]);
    expect(habitatView(S, 'in').cats.flatMap(c => c.items).filter(i => i.fix).length).toBe(2);
  });
  it('R153: the Filtration meter shows with the plant credit tagged as our judgment, and never goes red', () => {
    const S = mk([['cardinal', 10]], { heater: 'one', filter: 'hob' }), b = habitatView(S, 'in').bars.find(x => x.key === 'filter')!;
    expect(b).toBeDefined(); expect(b.topLines.join(' ')).toMatch(/our judgment/); expect(b.tone).not.toBe('bad');
    const noFilter = mk([['cardinal', 10]], { heater: 'one', filter: 'none' }); expect(habitatView(noFilter, 'in').bars.some(x => x.key === 'filter')).toBe(false);
  });
});
