import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import { LIBRARY, makeItem } from '../src/scene/items';
import { beginGrow, endGrow, setGrowTime, timeChanges } from '../src/scene/growtime';
import { MAX_PLANTS, daughtersAt, planBroods, syncBroods } from '../src/scene/propagate';
import { inside } from '../src/scene/shape';
import { parseScene } from '../src/scene/validate';
import type { GrowFeed, TankSetup } from '../src/scene/types';

// Plants that make more plants (lane PR, 2026-10-16)
function tank(...spec: [string, number, number][]) {
  const sc = defaultScene(), s = sc.tanks[0];
  s.items = spec.map(([v, x, d], i) => makeItem(s.tank, v, i + 1, i + 3, x, d));
  return { sc, s };
}
/** What the panel does for one Time step: derive the daughters, then write every plant's growth. */
function move(s: TankSetup, t: number, feed: GrowFeed = s.grow.feed) {
  syncBroods(s, t, feed);
  setGrowTime(s, t, feed);
}
const variantOf = (kind: string) => Object.keys(LIBRARY).find(k => LIBRARY[k].kind === kind)!;
const broods = (s: TankSetup) => s.items.filter(it => it.brood != null);
const snap = (s: TankSetup) => JSON.stringify(s.items.map(it => [it.id, it.variant, it.x, it.depth, it.growth, it.planted, it.parent]));

describe('plant propagation', () => {
  it('a mature runner plant makes daughters at fixed places, born later and later', () => {
    const { s } = tank(['sagittaria', 300, 150]);
    const p = s.items[0]; p.growth = 0.5;
    const a = daughtersAt(p, 1, 'low', s.tank, 0.5), b = daughtersAt(p, 1, 'low', s.tank, 0.5);
    expect(a.length).toBeGreaterThan(3);
    expect(a).toEqual(b); // deterministic
    for (let i = 1; i < a.length; i++) expect(a[i].born).toBeGreaterThan(a[i - 1].born);
    // the n-th daughter never moves when later Time adds more
    const early = daughtersAt(p, 0.5, 'low', s.tank, 0.5);
    expect(early.length).toBeLessThan(a.length);
    expect(a.slice(0, early.length)).toEqual(early);
    // an immature plant waits until it is grown; a species without breed data makes none
    const baby = daughtersAt({ ...p, growth: 0 }, 0.1, 'low', s.tank, 0);
    expect(baby.length).toBe(0);
    expect(daughtersAt(makeItem(s.tank, 'carpet', 9, 1, 100, 100), 1, 'low', s.tank, 1)).toEqual([]);
  });

  it('feeding breeds faster', () => {
    const { s } = tank(['grass', 300, 150]);
    const p = s.items[0]; p.growth = 0.5;
    const low = daughtersAt(p, 0.4, 'low', s.tank, 0.5).length, co2 = daughtersAt(p, 0.4, 'co2', s.tank, 0.5).length;
    expect(co2).toBeGreaterThan(low);
  });

  it('scrubbing Time both ways is stable: the same Time gives the same tank, back at 0 the daughters are gone', () => {
    const { s } = tank(['sagittaria', 300, 150], ['crypt', 150, 100], ['salvinia', 400, 200]);
    beginGrow(s);
    move(s, 0.6);
    const at06 = snap(s), n06 = broods(s).length;
    expect(n06).toBeGreaterThan(5);
    move(s, 1); move(s, 0.3);
    expect(broods(s).length).toBeLessThan(n06);
    move(s, 0.6);
    expect(snap(s)).toBe(at06);
    move(s, 0);
    expect(broods(s).length).toBe(0);
    expect(s.items.length).toBe(3);
    // every plant is back as it was
    for (const it of s.items) expect(it.growth == null || it.growth >= 0).toBe(true);
  });

  it('a daughter is born at growth 0 and grows from its birth', () => {
    const { s } = tank(['sagittaria', 300, 150]);
    beginGrow(s, 'rel'); s.items[0].growth = 0.5;
    move(s, 0.3);
    const d = broods(s);
    expect(d.length).toBeGreaterThan(0);
    const first = d[0], pl = first.planted!;
    expect(pl).toBeLessThan(0);
    expect(first.growth).toBeGreaterThanOrEqual(0);
    expect(first.growth).toBeLessThan(0.9);
    expect(first.parent).toBe(1);
    expect(timeChanges(s, 0.3).length).toBe(0); // nothing left to move at that Time
  });

  it('daughters land inside the tank, off the rocks and wood, never on the glass', () => {
    const { s } = tank(['sagittaria', 120, 80], ['grass', 20, 20]);
    const rock = makeItem(s.tank, variantOf('stone'), 3, 5, 200, 150);
    rock.size = 260;
    s.items.push(rock);
    for (const it of s.items) if (it.kind === 'plant') it.growth = 0.6;
    const plan = planBroods(s, 1, 'low');
    expect(plan.length).toBeGreaterThan(5);
    for (const p of plan) {
      expect(inside(s.tank, p.d.x, p.d.depth, 6)).toBe(true);
      expect(Math.hypot(p.d.x - rock.x, p.d.depth - rock.depth)).toBeGreaterThan(20);
    }
  });

  it('a rhizome plant on wood stays on its wood', () => {
    const { s } = tank(['anubias', 300, 150]);
    const wood = makeItem(s.tank, variantOf('wood'), 2, 4, 300, 150);
    wood.size = 400;
    s.items.push(wood);
    const a = s.items[0]; a.growth = 0.8; a.lift = 40;
    const plan = planBroods(s, 1, 'low');
    expect(plan.length).toBeGreaterThan(0);
    for (const p of plan) expect(p.d.lift).toBe(40);
  });

  it('floaters stay at the water line, and stop at the cover', () => {
    const { s } = tank(['salvinia', 300, 150]);
    s.items[0].growth = 0.8; s.items[0].spread = 200;
    const few = planBroods(s, 1, 'low').length;
    expect(few).toBeGreaterThan(0);
    s.items[0].spread = 3000; // a patch bigger than the surface: nothing is left to cover
    expect(planBroods(s, 1, 'low').length).toBe(0);
    s.water.on = false; // floaters need water
    s.items[0].spread = 200;
    expect(planBroods(s, 1, 'low').length).toBe(0);
  });

  it('past the plant cap nothing spawns', () => {
    const { s } = tank();
    for (let i = 0; i < MAX_PLANTS - 4; i++) s.items.push(makeItem(s.tank, 'anubias', i + 1, 1, 50 + (i % 20) * 10, 50 + Math.floor(i / 20) * 10));
    const sag = makeItem(s.tank, 'sagittaria', 999, 1, 400, 150); sag.growth = 0.8; s.items.push(sag);
    const plan = planBroods(s, 1, 'low');
    expect(plan.length).toBe(MAX_PLANTS - s.items.filter(it => it.kind === 'plant').length);
    s.items.push(makeItem(s.tank, 'grass', 1000, 1, 100, 100), makeItem(s.tank, 'grass', 1001, 1, 120, 100));
    expect(planBroods(s, 1, 'low').length).toBe(Math.max(0, MAX_PLANTS - s.items.filter(it => it.kind === 'plant').length));
    // the cap keeps the earliest births, so Time only ever adds
    const a = planBroods(s, 0.5, 'low').map(p => p.key), b = planBroods(s, 1, 'low').map(p => p.key);
    for (const k of a) expect(b).toContain(k);
  });

  it('keeping the preview makes the daughters real plants with a parent, and a file round-trips them', () => {
    const { sc, s } = tank(['sagittaria', 300, 150]);
    s.items[0].growth = 0.5;
    beginGrow(s, 'rel');
    move(s, 1);
    const n = broods(s).length;
    expect(n).toBeGreaterThan(2);
    endGrow(s);
    expect(broods(s).length).toBe(0);
    expect(s.items.length).toBe(1 + n);
    for (const it of s.items.slice(1)) { expect(s.items.some(q => q.id === it.parent)).toBe(true); expect(it.planted).toBeUndefined(); expect(it.growth).toBeGreaterThanOrEqual(0); }
    const back = parseScene(JSON.parse(JSON.stringify(sc)));
    const t = back.scene.tanks[0];
    expect(t.items.length).toBe(1 + n);
    expect(t.items.filter(it => it.parent != null).length).toBe(n);
    expect(t.items.filter(it => it.parent === 1).length).toBeGreaterThan(2);
    // a bad parent is dropped
    const bad = JSON.parse(JSON.stringify(sc)); bad.tanks[0].items[1].parent = 999;
    expect(parseScene(bad).scene.tanks[0].items[1].parent).toBeUndefined();
    // a new preview goes in new directions: the kept daughters are not made twice
    beginGrow(s, 'rel');
    move(s, 1);
    const kept = new Set(s.items.filter(it => it.brood == null).map(it => `${it.x},${it.depth}`));
    for (const b of broods(s)) expect(kept.has(`${b.x},${b.depth}`)).toBe(false);
  });
});
