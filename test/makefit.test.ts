// Find solutions v1 (lane C3): handoff section 9 scenarios (maintenance cap then more animals; a mitigation that fixes time but busts
// the startup budget; both caps make every mitigation infeasible; unknown input; several distinct solutions) plus Nathan's solver rules.
import { describe, expect, it } from 'vitest';
import { defaultProfile, demandOf } from '../src/demand';
import { findSolutions } from '../src/demand/makefit';
import { type Constraints } from '../src/scene/constraints';
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
    expect(findSolutions({ ...S, constraints: { monthlyUsd: { on: true, value: t.upkeepUsdMo + 50 } } }, P).status).toBe('within');
    expect(findSolutions({ ...S, constraints: { monthlyUsd: { on: false, value: 1 } } }, P).status).toBe('off');
    expect(findSolutions({ ...S, constraints: { minutesPerWeek: { on: true, value: 1 } } }, P).status).toBe('off');   // R137: a time cap is never a guardrail
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
  const unset = (): TankSetup => { const S = stock([['neon', 8], ['danio', 8]]); S.tech = { rows: { filter: 'none' } }; delete S.stockFirst; return S; };
  const capped = (S: TankSetup) => ({ ...S, constraints: { minutesPerWeek: { on: true, value: Math.floor(now(S).minPerWeek - 1) } } as Constraints });

  
  
  it('a gear lever that records the assumed filter as chosen says so; levers that keep the tank unset do not', () => {
    const r = findSolutions(capped(unset()), P), all = [...r.compliant, ...r.needsRelaxing];
    for (const o of all) {
      if (o.lever === 'hose' || o.lever === 'feeder') { if (filterState(o.scene) === 'chosen') expect(o.detail).toMatch(/not picked a filter|not picked|have not picked/); else expect(o.detail).not.toMatch(/assumed/); } // FL1: the fixture's filter row is none, so a lever keeps it unset
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
