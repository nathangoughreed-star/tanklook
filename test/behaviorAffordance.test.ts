// R208 BH-S1: the affordance map (src/behavior/affordance.ts) on the BH1 review tank and on small hand-made scenes.
import { describe, expect, it } from 'vitest';
import { bareSetup } from '../src/scene/defaults';
import { makeItem } from '../src/scene/items';
import { buildAffordance } from '../src/behavior/affordance';
import { bh1Scene } from '../src/behavior/bh1Scene';
import { bhParams } from '../src/behavior/params';
import { toLocal, toWorld } from '../src/behavior/shapes';

const sc = bh1Scene(), S = sc.tanks[0], T = S.tank;
const M = buildAffordance(S, T);
const cave = S.items.find(i => i.variant === 'coconut')!;

describe('review tank map', () => {
  it('finds each kind of place the BH1 picture shows', () => {
    const c = M.counts();
    expect(c['cave-in']).toBeGreaterThanOrEqual(1);
    expect(c['cave-mouth']).toBeGreaterThanOrEqual(1);
    expect(c.overhang).toBeGreaterThanOrEqual(1);
    expect(c.crevice).toBeGreaterThanOrEqual(1);
    expect(c['root-mass']).toBe(1);
    expect(c['stem-thicket']).toBeGreaterThanOrEqual(1);
    expect(c['open-sand']).toBeGreaterThanOrEqual(10);
    expect(c.glass).toBeGreaterThanOrEqual(10);
    expect(M.food.length).toBeGreaterThan(5);
  });
  it('the cave is hollow: air inside, wall in the shell, a mouth on the side the art opens', () => {
    const base = M.places.find(p => p.tag === 'cave-in')!;
    const sol = M.solids.find(x => x.item === cave.id)!;
    const f = (sol as unknown as { f: { cx: number; cy: number; cz: number; c: number; s: number } }).f;
    const h = M.hollowAt(base.p[0], base.p[1], base.p[2]);
    expect(h?.hollow.item).toBe(cave.id);
    expect(M.hardDist(base.p[0], base.p[1], base.p[2])).toBeGreaterThan(5);   // free to be in (a box would say solid)
    const R = cave.size / 2, wall = toWorld(f, [0, R * 0.2, -R * 0.97]);
    expect(M.hardDist(wall[0], wall[1], wall[2])).toBeLessThan(0);              // the back wall is material
    const mouth = M.places.find(p => p.tag === 'cave-mouth')!;
    expect(toLocal(f, mouth.p)[2]).toBeGreaterThan(R * 0.9);                   // outside, on the +z (doorway) side
    expect(M.hollowAt(mouth.p[0], mouth.p[1], mouth.p[2])).toBeNull();
    expect(M.hardDist(mouth.p[0], mouth.p[1], mouth.p[2])).toBeGreaterThan(0);
  });
  it('overhangs sit under a roof, crevices are narrow', () => {
    for (const p of M.places.filter(p => p.tag === 'overhang')) {
      expect(M.hardDist(p.p[0], p.p[1], p.p[2])).toBeGreaterThan(8);
      let roof = false; for (let t = 5; t <= 205; t += 5) if (M.hardDist(p.p[0], p.p[1] + t, p.p[2]) <= 0) { roof = true; break; }
      expect(roof).toBe(true);
    }
    for (const p of M.places.filter(p => p.tag === 'crevice')) { expect(p.width!).toBeLessThanOrEqual(46); expect(p.cover).toBeGreaterThanOrEqual(0.4); }
  });
  it('sand is buryable and deep enough; surfaceAt gives an exact normal at any angle', () => {
    const s = M.sandAt(450, -150);
    expect(s.grain).toBe('sand'); expect(s.buryable).toBe(true); expect(s.depth).toBeGreaterThan(40);
    const rock = M.solids.find(x => x.kind === 'rock' && x.t === 'rbox')!;
    let y = rock.bound[1] + rock.bound[3] + 2;
    while (M.hardDist(rock.bound[0], y, rock.bound[2]) > 1) y -= 1;              // land on the top of the rock
    const top = M.surfaceAt(rock.bound[0], y, rock.bound[2]);
    expect(top.exact).toBe(true); expect(top.dist).toBeLessThan(2);
    expect(Math.abs(top.n[1])).toBeGreaterThan(0.5);
    const far = M.surfaceAt(60, 300, -60);                                       // nowhere near a rock: the swim field answers
    expect(far.exact).toBe(false);
  });
  it('root mass and thicket are permeable and hide', () => {
    const root = M.perm.find(p => p.kind === 'root')!;
    expect(root.speed).toBeLessThan(0.6); expect(root.hidden).toBe(true);
    const pl = M.places.find(p => p.tag === 'root-mass')!;
    expect(M.permeableAt(pl.p[0], pl.p[1], pl.p[2])?.kind === 'root' || M.permeableAt(pl.p[0], pl.p[1], pl.p[2]) === null).toBe(true);
    expect(M.permeableAt(30, 300, -30)).toBeNull();
    const th = M.perm.find(p => p.kind === 'stem')!;
    expect(M.permeableAt(th.cyl!.x, th.cyl!.y0 + 30, th.cyl!.z)?.kind).toBe('stem');
  });
  it('find answers with cover, claiming and capacity', () => {
    const p = M.find('cave-in', cave.x, 50, -cave.depth, 300, { minCover: 0.6 })!;
    expect(p).toBeTruthy();
    expect(M.claim(p, 7, true)).toBe(true);
    expect(M.find('cave-in', cave.x, 50, -cave.depth, 300, { minCover: 0.6 })).toBeNull();
    expect(M.claim(p, 8, true)).toBe(false);
    M.release(p, 7);
    expect(M.find('cave-in', cave.x, 50, -cave.depth, 300)).toBe(p);
    expect(M.find('cave-in', 2000, 50, -400, 100)).toBeNull();
  });
  it('food patches are eaten and grow back', () => {
    const f = M.food[0]; expect(f.amount).toBe(1);
    expect(M.graze(f.id, 2, 0.1)).toBeCloseTo(0.2, 5); expect(f.amount).toBeCloseTo(0.8, 5);
    M.stepFood(420); expect(f.amount).toBe(1);
  });
  it('is quick enough to rebuild on a scene change', () => {
    const t0 = performance.now(); buildAffordance(S, T, { seed: 2 }); expect(performance.now() - t0).toBeLessThan(5000);
  });
});

describe('small scenes', () => {
  const bed = (type: 'aragonite' | 'gravel') => { const E = bareSetup(); E.tank = { L: 800, H: 300, D: 300 }; E.substrate = { ...E.substrate, show: true, type, fl: 50, fr: 50, bl: 50, br: 50 }; return E; };
  it('an empty tank has glass, sand and surface places only', () => {
    const E = bed('aragonite'), c = buildAffordance(E, E.tank).counts();
    expect(c['open-sand']).toBeGreaterThan(5); expect(c.glass).toBeGreaterThan(5); expect(c.surface).toBeGreaterThan(0);
    expect(c['cave-in'] + c.overhang + c.crevice + c['root-mass']).toBe(0);
  });
  it('gravel is not buryable and is tagged open-gravel', () => {
    const E = bed('gravel'), m = buildAffordance(E, E.tank);
    expect(m.sandAt(300, -150).buryable).toBe(false); expect(m.counts()['open-gravel']).toBeGreaterThan(5); expect(m.counts()['open-sand']).toBe(0);
  });
  it('a clay tube and a half-log are hollow both ways; a cork flat gives an overhang not a cave', () => {
    const E = bed('aragonite');
    E.items = [makeItem(E.tank, 'tube', 1, 1, 200, 150, { size: 200 }), makeItem(E.tank, 'halflog', 2, 1, 450, 150, { size: 260 }), makeItem(E.tank, 'corkflat', 3, 1, 650, 150, { size: 300 })];
    const m = buildAffordance(E, E.tank);
    expect(m.hollows.length).toBe(3);
    expect(m.places.filter(p => p.tag === 'cave-mouth' && p.item === 2).length).toBe(2);
    expect(m.places.filter(p => p.tag === 'cave-in' && p.item === 3).length).toBe(0);
    expect(m.places.filter(p => p.tag === 'overhang' && p.item === 3).length).toBeGreaterThan(0);
  });
});

describe('params', () => {
  it('reads the switches', () => {
    expect(bhParams('?bh&places')).toEqual({ on: true, places: true, scene: '' });
    expect(bhParams('?scene=bh1')).toEqual({ on: true, places: false, scene: 'bh1' });
    expect(bhParams('')).toEqual({ on: false, places: false, scene: '' });
  });
});
