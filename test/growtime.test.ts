import { describe, expect, it } from 'vitest';
import { growthOf } from '../src/art/plants';
import { defaultScene } from '../src/scene/defaults';
import { makeItem } from '../src/scene/items';
import { GROW_RATE, growRate, setGrowTime, setPlantGrowth, speedOf, timeChanges } from '../src/scene/growtime';
import { Store } from '../src/scene/store';
import { parseScene } from '../src/scene/validate';
import type { Item, TankSetup } from '../src/scene/types';

// The tank's growth timeline (lane GR3, 2026-10-15)
function tank(...types: string[]) {
  const sc = defaultScene(), s = sc.tanks[0];
  s.items = types.map((v, i) => makeItem(s.tank, v, i + 1, i + 1, 100 + i * 50, 100));
  return { sc, s };
}
const byVariant = (s: TankSetup, v: string) => s.items.find(it => it.variant === v)!;

describe('growth timeline', () => {
  it('species speeds come from the plant data and feeding scales them, fast growers most', () => {
    expect(speedOf('anubias')).toBe('slow');
    expect(speedOf('ludwigia')).toBe('medium');
    expect(speedOf('rotala')).toBe('fast');
    expect(speedOf('no-such-plant')).toBe('medium');
    for (const f of ['low', 'ferts', 'co2'] as const) {
      expect(GROW_RATE[f].slow).toBeLessThan(GROW_RATE[f].medium);
      expect(GROW_RATE[f].medium).toBeLessThan(GROW_RATE[f].fast);
    }
    expect(GROW_RATE.co2.fast / GROW_RATE.low.fast).toBeGreaterThan(GROW_RATE.co2.slow / GROW_RATE.low.slow);
    // the slowest plant in a low-tech tank takes all of Time from planted to overgrown
    expect(GROW_RATE.low.slow).toBe(1);
  });

  it('Time grows each plant from its planted growth at its speed, clamped to overgrown', () => {
    const { s } = tank('anubias', 'ludwigia', 'rotala');
    for (const it of s.items) it.growth = 0.1;
    setGrowTime(s, 0.2);
    expect(byVariant(s, 'anubias').growth).toBeCloseTo(0.1 + 0.2 * 1);
    expect(byVariant(s, 'ludwigia').growth).toBeCloseTo(0.1 + 0.2 * 1.5);
    expect(byVariant(s, 'rotala').growth).toBeCloseTo(0.1 + 0.2 * 2);
    expect(s.grow.time).toBe(0.2);
    setGrowTime(s, 1);
    for (const it of s.items) expect(it.growth).toBe(1);
    setGrowTime(s, 5); // clamped
    expect(s.grow.time).toBe(1);
  });

  it('the tank setting changes the speed at the same Time', () => {
    const { s } = tank('rotala');
    s.items[0].growth = 0;
    setGrowTime(s, 0.1);
    expect(s.items[0].growth).toBeCloseTo(0.2);
    setGrowTime(s, 0.1, 'co2');
    expect(s.items[0].growth).toBeCloseTo(0.5);
    expect(s.grow.feed).toBe('co2');
    setGrowTime(s, 0.1, 'low');
    expect(s.items[0].growth).toBeCloseTo(0.2);
  });

  it('Time runs both ways: back at 0 every plant is exactly as planted (overgrown ones too)', () => {
    const { s } = tank('anubias', 'grass', 'stem', 'carpet', 'salvinia');
    s.items.forEach((it, i) => { it.growth = [0, 0.3, 0.55, 0.8, 1][i]; });
    const before = JSON.stringify(s.items);
    for (const t of [0.3, 1, 0.6, 0.05, 0]) setGrowTime(s, t);
    expect(JSON.stringify(s.items)).toBe(before);
    expect(s.items.every(it => it.planted == null)).toBe(true);
  });

  it('a starter plant with no growth of its own is untouched at Time 0 and grows from its saved size', () => {
    const { s } = tank('sword');
    const it = s.items[0], g0 = growthOf('sword', it.size);
    expect(it.growth).toBeUndefined();
    setGrowTime(s, 0);
    expect(it.growth).toBeUndefined();
    expect(timeChanges(s, 0)).toEqual([]);
    setGrowTime(s, 0.1);
    expect(it.growth).toBeCloseTo(Math.min(1, g0 + 0.1 * growRate('sword', 'low')), 3);
    setGrowTime(s, 0);
    expect(it.growth).toBeUndefined(); // back as it was: no growth of its own
    expect(it.planted).toBeUndefined();
  });

  it('a plant put in later, or regrown by hand, keeps its place when Time moves', () => {
    const { s } = tank('anubias');
    s.items[0].growth = 0.2;
    setGrowTime(s, 0.5);
    const late: Item = makeItem(s.tank, 'rotala', 9, 9, 300, 100); late.growth = 0.1;
    s.items.push(late);
    setGrowTime(s, 0.6); // the late plant grows from where it was put in
    expect(late.growth).toBeCloseTo(0.1 + 0.1 * 2);
    setGrowTime(s, 0);
    expect(late.growth).toBe(0); // before it was put in: just planted
    setGrowTime(s, 0.5);
    expect(late.growth).toBeCloseTo(0.1);
    // its own Growth slider at Time 0.5, then Time on
    setPlantGrowth(s.items[0], 0.4, s);
    setGrowTime(s, 0.6);
    expect(s.items[0].growth).toBeCloseTo(0.5);
    setGrowTime(s, 0.5);
    expect(s.items[0].growth).toBeCloseTo(0.4);
  });

  it('stagger: `only` holds plants back for a later call, and Time lands once all have moved', () => {
    const { s } = tank('grass', 'stem', 'crypt');
    const waiting = setGrowTime(s, 0.4, 'low', c => !c.first);
    expect(waiting.length).toBe(3); // all three are growing for the first time
    expect(s.grow.time).toBe(0);
    let left = waiting, n = 0;
    while (left.length) { const ok = new Set([left[0]]); left = setGrowTime(s, 0.4, 'low', c => ok.has(c.id)); n++; }
    expect(n).toBe(3);
    expect(s.grow.time).toBe(0.4);
    const once = JSON.stringify(s.items);
    const { s: s2 } = tank('grass', 'stem', 'crypt');
    setGrowTime(s2, 0.4);
    expect(JSON.stringify(s2.items)).toBe(once);
  });

  it('the setting and planted growth round-trip through a saved file; older files load as low-tech, Time 0', () => {
    const { sc, s } = tank('rotala', 'river');
    s.items[0].growth = 0.2;
    setGrowTime(s, 0.2, 'ferts');
    const back = parseScene(JSON.parse(JSON.stringify(sc))).scene;
    expect(back.tanks[0].grow).toEqual({ feed: 'ferts', time: 0.2 });
    expect(back.tanks[0].items[0].planted).toBe(0.2);
    expect(back.tanks[0].items[0].growth).toBeCloseTo(0.2 + 0.2 * 3);

    const old = JSON.parse(JSON.stringify(sc));
    delete old.tanks[0].grow;
    expect(parseScene(old).scene.tanks[0].grow).toEqual({ feed: 'low', time: 0 });
    old.tanks[0].grow = { feed: 'nitro', time: 7 };
    old.tanks[0].items[1] = { ...old.tanks[0].items[0], id: 99, variant: 'river', planted: 0.5 };
    const bad = parseScene(old).scene.tanks[0];
    expect(bad.grow).toEqual({ feed: 'low', time: 1 });
    expect(bad.items.find(it => it.id === 99)?.planted).toBeUndefined(); // only plants have one
  });

  it('moving Time is one undo step', () => {
    const { sc } = tank('rotala', 'grass');
    const store = new Store(sc);
    const start = JSON.stringify(store.scene);
    for (const t of [0.1, 0.2, 0.35, 0.5]) store.edit(s => { setGrowTime(s, t); }, { coalesce: 'growTime' });
    expect(store.scene.tanks[0].grow.time).toBe(0.5);
    store.undo();
    expect(JSON.stringify(store.scene)).toBe(start);
  });
});
