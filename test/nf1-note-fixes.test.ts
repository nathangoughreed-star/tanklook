// NF1: the Notes panel's fix registry: pure fixes, only where needed, idempotent, one undo step, hover text.
import { describe, expect, it } from 'vitest';
import { bareSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { substrateCheck } from '../src/scene/substrateCheck';
import { groundHeight } from '../src/scene/terrain';
import { Store } from '../src/scene/store';
import { emptyScene } from '../src/scene/defaults';
import { deepenBed, fixPlans } from '../src/shell/logic/noteFixes';
import { verdictOf } from '../src/scene/verdict';
import { emptyBrief } from '../src/ui/setupBrief';
import type { Fish, Item, TankSetup } from '../src/scene/types';

const plant = (variant: string, x: number, depth: number, id: number): Item => ({ id, kind: 'plant', variant, seed: 1, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: 200 }) as unknown as Item;
function tank(items: Item[], fish: Fish[] = []): TankSetup {
  const s = bareSetup();
  s.substrate = { ...s.substrate, show: true, type: 'gravel', fl: 1 * IN, fr: 1 * IN, bl: 1.5 * IN, br: 1.5 * IN };
  s.items = items; s.fish = fish; return s;
}
const g = (s: TankSetup, x: number, d: number) => groundHeight({ substrate: s.substrate, layout: s.layout, terrain: s.terrain }, s.tank, x, d);
const issues = (s: TankSetup) => { const v = verdictOf(s, s.brief ?? emptyBrief(), {}); return [...v.gates, ...v.hard, ...v.targets, ...v.advisories]; };

describe('deepen the substrate', () => {
  const items = () => [plant('sword', 200, 100, 1), plant('lotus', 600, 120, 2), plant('anubias', 400, 100, 3)];
  it('raises each short plant to exactly what it needs, clears the notes, leaves the rest of the bed alone', () => {
    const s = tank(items()), far = [g(s, 20, 20), g(s, s.tank.L - 20, s.tank.D - 20)];
    expect(substrateCheck(s).map(n => n.id).sort()).toEqual(['substrate:plant:lotus', 'substrate:plant:sword']);
    const r = deepenBed(s)!;
    expect(r.convertedToTerrain).toBe(true);
    expect(substrateCheck(s)).toEqual([]);
    expect(g(s, 200, 100)).toBeGreaterThanOrEqual(2 * 25.4 - 1); expect(g(s, 200, 100)).toBeLessThan(2 * 25.4 + 1);
    expect(g(s, 600, 120)).toBeGreaterThanOrEqual(3 * 25.4 - 1); expect(g(s, 600, 120)).toBeLessThan(3 * 25.4 + 1);
    expect(Math.abs(g(s, 20, 20) - far[0])).toBeLessThan(1); expect(Math.abs(g(s, s.tank.L - 20, s.tank.D - 20) - far[1])).toBeLessThan(1);   // only where needed: the far corners did not move (the new grid re-draws the old slope to within 1 mm)
  });
  it('never lowers the ground anywhere', () => {
    const s = tank(items()), b = structuredClone(s), T = s.tank;
    deepenBed(s);
    for (let i = 0; i <= 20; i++) for (let j = 0; j <= 10; j++) expect(g(s, T.L * i / 20, T.D * j / 10)).toBeGreaterThanOrEqual(g(b, T.L * i / 20, T.D * j / 10) - 0.5);
  });
  it('is idempotent: a second run finds nothing short and changes nothing', () => {
    const s = tank(items()); deepenBed(s); const once = JSON.stringify(s);
    expect(deepenBed(s)).toBeNull(); expect(JSON.stringify(s)).toBe(once);
  });
  it('items keep their own lift (they follow the ground)', () => {
    const s = tank(items()); deepenBed(s); expect(s.items.map(i => i.lift)).toEqual([0, 0, 0]);
  });
  it('a plant that needs nothing yields no fix', () => { expect(deepenBed(tank([plant('anubias', 300, 100, 1)]))).toBeNull(); });
  it('the plan counts the notes, describes the numbers, and one store edit is one undo step', () => {
    const s = tank(items()), plans = fixPlans(s, issues(s)), p = plans.find(x => x.kind === 'deepen')!;
    expect(p.label).toBe('Fix these (2)');
    expect(p.describe).toMatch(/the sword to 2 in \(\+\d/); expect(p.describe).toMatch(/the lotus to 3 in/);
    expect(p.describe).toMatch(/only under and around/); expect(p.describe).toMatch(/lb of substrate/); expect(p.describe).toMatch(/custom terrain/);
    const sc = emptyScene(); sc.tanks[0] = s;
    const st = new Store(sc), before = JSON.stringify(st.tank);
    st.editTank(0, t => p.apply(t));
    expect(substrateCheck(st.tank), JSON.stringify([st.tank.terrain.on, st.tank.items.map(i => [i.variant, g(st.tank, i.x, i.depth)])])).toEqual([]);
    st.undo();
    expect(JSON.stringify(st.tank)).toBe(before);
  });
});

describe('limits', () => {
  it('R137: care time is no longer a limit, so no time note or fix is ever raised', () => {
    const s = tank([]);
    const t = { setupUsd: 100, upkeepUsdMo: 5, minPerWeek: 44, risk: 1 } as never;
    const v = verdictOf(s, s.brief ?? emptyBrief(), { totals: t, limits: { minPerWeek: 30 }, units: 'in' });
    expect([...v.hard, ...v.targets].some(x => x.id === 'limit:time')).toBe(false);
  });
  it('no fix is offered for a note with no exact figure', () => {
    expect(fixPlans(tank([]), [{ id: 'stock:filter', tab: 'equipment', uids: [], text: 'x', relax: 'a bigger filter, or fewer animals' }])).toEqual([]);
  });
});
