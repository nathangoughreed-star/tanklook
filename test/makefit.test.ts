// Find solutions v1 (lane C3): handoff section 9 scenarios (maintenance cap then more animals; a mitigation that fixes time but busts
// the startup budget; both caps make every mitigation infeasible; unknown input; several distinct solutions) plus Nathan's solver rules.
import { describe, expect, it } from 'vitest';
import { defaultProfile, demandOf } from '../src/demand';
import { findSolutions, NO_SUGGESTION } from '../src/demand/makefit';
import { compliance, type Constraints } from '../src/scene/constraints';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { summaryOf } from '../src/ui/stockSummary';
import { Store } from '../src/scene/store';
import { defaultScene } from '../src/scene/defaults';
import type { TankSetup } from '../src/scene/types';
import { filterState, techOf } from '../src/scene/tech';

const base = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const t = parseScene(JSON.parse(SCENES[k])).scene; return t.tanks[t.active].water.on; })!])).scene; return sc.tanks[sc.active]; };
const stock = (list: [string, number][], c?: Constraints): TankSetup => { const S = base(); let id = 1; return { ...S, ...(c ? { constraints: c } : {}), fish: list.flatMap(([sp, n]) => Array.from({ length: n }, () => ({ ...S.fish[0], id: id++, species: sp }))) }; };
const P = defaultProfile();
const now = (S: TankSetup) => demandOf(S, P).totals;
const LEVERS = ['undo', 'fewer', 'hose', 'feeder', 'tank'];

describe('Find solutions (lane C3)', () => {
  it('scene not over any guardrail: nothing to solve', () => {
    const S = stock([['neon', 8]]); const t = now(S);
    expect(findSolutions({ ...S, constraints: { minutesPerWeek: { on: true, value: t.minPerWeek + 5 } } }, P).status).toBe('within');
    expect(findSolutions({ ...S, constraints: { minutesPerWeek: { on: false, value: 1 } } }, P).status).toBe('off');
  });

  it('5: a maintenance cap, then animals over it: targeted mitigations are assessed before any "no suggestion"', () => {
    const S = stock([['neon', 8], ['danio', 8]]), t = now(S);
    S.constraints = { minutesPerWeek: { on: true, value: Math.floor(t.minPerWeek - 1) } };
    const r = findSolutions(S, P);
    expect(r.status).toBe('over');
    expect(r.compliant.length).toBeGreaterThan(0);
    for (const o of r.compliant) {
      expect(o.totals.minPerWeek).toBeLessThanOrEqual(t.minPerWeek - 1);               // the engine's own figure, re-checked
      expect(compliance(o.scene, { setupUsd: o.totals.startupUsd, upkeepUsdMo: o.totals.monthlyUsd, minPerWeek: o.totals.minPerWeek }, P.limits).overall).toBe('within');
      expect(o.status.every(x => x.state === 'pass')).toBe(true);
      expect(LEVERS).toContain(o.lever);
    }
  });

  it('6: a mitigation that fixes time but exceeds the enabled startup budget is not called compliant', () => {
    const S = stock([['neon', 8]]), t = now(S);
    S.constraints = { minutesPerWeek: { on: true, value: Math.floor(t.minPerWeek - 1) }, startupUsd: { on: true, value: Math.ceil(t.setupUsd) + 20 } };
    const r = findSolutions(S, P);
    expect(r.compliant.some(o => o.lever === 'hose')).toBe(false);               // the hose costs more than $20
    const hose = r.needsRelaxing.find(o => o.lever === 'hose');
    expect(hose).toBeTruthy();
    expect(hose!.needs.startupUsd).toBeGreaterThan(0);
    expect(hose!.needs.minPerWeek).toBeUndefined();                                // time is fixed; only the budget is short
    expect(hose!.status.find(x => x.id === 'startup')!.state).toBe('over');
  });

  it('7: both caps make every mitigation infeasible: honest message, no fabricated compliant option', () => {
    const S = stock([['neon', 8]]), t = now(S);
    S.constraints = { minutesPerWeek: { on: true, value: Math.floor(t.minPerWeek - 25) }, startupUsd: { on: true, value: Math.ceil(t.setupUsd) } };
    const r = findSolutions(S, P);
    expect(r.compliant).toEqual([]);
    expect(r.message).toBe(NO_SUGGESTION);
    expect(JSON.stringify(r)).not.toMatch(/impossible/i);
    expect(r.needsRelaxing.length).toBeGreaterThan(0);                              // the smallest changes that come closest
    expect(r.needsRelaxing.every(o => Object.keys(o.needs).length > 0)).toBe(true);
  });

  it('9: unknown input is never green, so nothing is offered as compliant', () => {
    const S = stock([['neon', 8]]), t = now(S);
    S.constraints = { minutesPerWeek: { on: true, value: Math.floor(t.minPerWeek - 1) }, space: { on: true } };
    const r = findSolutions({ ...S, layout: { ...S.layout, space: undefined } }, P);
    expect(r.compliant).toEqual([]);
    expect(r.needsRelaxing).toEqual([]);
    expect(r.message).toBe(NO_SUGGESTION);
  });

  it('10: several real solutions come back as distinct trade-offs (none dominated, no padding)', () => {
    const S = stock([['neon', 8], ['danio', 8]]), t = now(S);
    S.constraints = { minutesPerWeek: { on: true, value: Math.floor(t.minPerWeek - 1) } };
    const r = findSolutions(S, P);
    const hose = r.compliant.find(o => o.lever === 'hose'), feeder = r.compliant.find(o => o.lever === 'feeder');
    expect(hose && feeder).toBeTruthy();
    expect(hose!.delta.startupUsd).toBeGreaterThan(feeder!.delta.startupUsd);        // dearer ...
    expect(hose!.delta.minPerWeek).toBeLessThan(feeder!.delta.minPerWeek);           // ... saves more time
    expect(new Set(r.compliant.map(o => o.title)).size).toBe(r.compliant.length);
    expect(r.compliant.length).toBeLessThanOrEqual(4);
  });

  it('six fish to three that fixes money but breaks the minimum social group is not a solution', () => {
    const S = stock([['neon', 6]]), t = now(S);
    S.constraints = { startupUsd: { on: true, value: Math.floor(t.setupUsd - 12) } };
    const r = findSolutions(S, P);
    expect([...r.compliant, ...r.needsRelaxing].some(o => o.title.startsWith('3 Neon'))).toBe(false);
    expect(r.rejected.some(x => x.title.startsWith('3 Neon') && /minimum/.test(x.reason))).toBe(true);
    const problems = (T: TankSetup) => summaryOf(T).cats.filter(c => c.level === 'problem').length;
    for (const o of r.compliant) expect(problems(o.scene)).toBeLessThanOrEqual(problems(S));
  });

  it('a bigger tank that fixes crowding but breaks the space guardrail is not a solution', () => {
    const S = stock([['oscar', 2]]), t = now(S);
    S.layout = { ...S.layout, space: { w: S.tank.L, d: S.tank.D } };
    S.constraints = { space: { on: true }, minutesPerWeek: { on: true, value: Math.floor(t.minPerWeek - 1) } };
    const r = findSolutions(S, P);
    expect([...r.compliant, ...r.needsRelaxing].some(o => o.lever === 'tank')).toBe(false);
    expect(r.rejected.some(x => x.title.startsWith('The next size up') && /space/.test(x.reason))).toBe(true);
  });

  it('a bigger filter is not a lever (no time credit); only the listed levers appear', () => {
    const S = stock([['neon', 8], ['danio', 8]]), t = now(S);
    S.constraints = { minutesPerWeek: { on: true, value: Math.floor(t.minPerWeek - 1) } };
    const r = findSolutions(S, P, { previous: stock([['neon', 8]], S.constraints) });
    for (const o of [...r.compliant, ...r.needsRelaxing]) expect(LEVERS).toContain(o.lever);
    expect(JSON.stringify([...r.compliant, ...r.needsRelaxing].map(o => o.title))).not.toMatch(/filter/i);
  });

  it('the undo lever needs a real edit: none right after opening a scene, and never the tank from before the open', () => {
    const st = new Store(defaultScene());
    expect(st.previousTank).toBeUndefined();
    st.edit(t => { t.layout = { ...t.layout, space: { w: 1000, d: 500 } }; });
    expect(st.previousTank).toBeDefined();
    st.replace(defaultScene());                         // open a file / shared link: the undo step is the OLD tank
    expect(st.canUndo).toBe(true);
    expect(st.previousTank).toBeUndefined();
    st.edit(t => { t.layout = { ...t.layout, space: { w: 900, d: 400 } }; });
    expect(st.previousTank?.layout.space).toBeUndefined();   // the opened scene as it was, not the earlier tank
    st.undo();
    expect(st.previousTank).toBeUndefined();
  });
});

describe('Find solutions on a tank with no filter chosen (lane B3, after B2 assumedFilter)', () => {
  const unset = (): TankSetup => { const S = stock([['neon', 8], ['danio', 8]]); delete S.tech; delete S.stockFirst; return S; };
  const capped = (S: TankSetup) => ({ ...S, constraints: { minutesPerWeek: { on: true, value: Math.floor(now(S).minPerWeek - 1) } } as Constraints });

  it('is unset, and the like-for-like baseline is the same engine totals as before the lever search', () => {
    const S = capped(unset());
    expect(filterState(S)).toBe('unset');
    const r = findSolutions(S, P), t = now(S);
    expect(r.status).toBe('over');
    for (const o of r.compliant) expect(o.totals.minPerWeek - o.delta.minPerWeek).toBeCloseTo(t.minPerWeek, 6);
  });

  it('offers sensible levers only; no filter or auto water changer credit', () => {
    const r = findSolutions(capped(unset()), P);
    expect(r.compliant.length).toBeGreaterThan(0);
    for (const o of [...r.compliant, ...r.needsRelaxing]) {
      expect(LEVERS).toContain(o.lever);
      expect(`${o.title} ${o.detail}`).not.toMatch(/auto(matic)? water.?chang|bigger filter|larger filter|canister/i);
      expect(o.scene.tech?.rows.ato ?? 'none').toBe('none');
    }
  });

  it('a gear lever that records the assumed filter as chosen says so; levers that keep the tank unset do not', () => {
    const r = findSolutions(capped(unset()), P), all = [...r.compliant, ...r.needsRelaxing];
    for (const o of all) {
      if (o.lever === 'hose' || o.lever === 'feeder') { expect(filterState(o.scene)).toBe('chosen'); expect(o.detail).toMatch(/not picked a filter|not picked|have not picked/); }
      else expect(o.detail).not.toMatch(/assumed/);
    }
  });

  it('a tank whose owner chose a filter gets no such note', () => {
    const S = capped(stock([['neon', 8], ['danio', 8]]));
    S.tech = { ...techOf(S), filters: undefined, rows: { ...techOf(S).rows, filter: 'canister' } };
    const r = findSolutions(S, P);
    for (const o of [...r.compliant, ...r.needsRelaxing]) expect(o.detail).not.toMatch(/assumed/);
  });
});
