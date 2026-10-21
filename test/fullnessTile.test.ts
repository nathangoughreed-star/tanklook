// Lane P3 (path 1, 2026-10-20): the fullness tile's state (ui/fullnessTile.ts), the owner's space (scene/space.ts,
// layout.space), and its dashed outline in the build (render/spaceOutline.ts).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { buildTank, envKey } from '../src/render/build';
import { OUTLINE_FIT, OUTLINE_OVER, outlineEdges, spaceOutline } from '../src/render/spaceOutline';
import { defaultSpace, parseSpace, spaceFit, tankExtent } from '../src/scene/space';
import { stockingOf } from '../src/scene/stocking';
import { NEAR_FULL, bar, mg, nitrogenRows, forkDue, fromUnits, overLine, tileState, toUnits, topBy } from '../src/ui/fullnessTile';
import { floorOf, tankMinimum } from '../src/scene/tankMin';
import { minWarnings } from '../src/ui/fullnessTile';
import type { TankSetup } from '../src/scene/types';

// the build paints textures on canvases: a do-nothing 2D context is enough here (as in menuFocus.test.ts)
const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const ex = (name: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[name])).scene; return sc.tanks[sc.active]; };
const withFish = () => Object.keys(SCENES).map(ex).find(S => S.water.on && stockingOf(S).contributors.length >= 2)!;

describe('tank minimum bar', () => {
  it('is set by the most demanding species and ignores the count', () => {
    const S = withFish(), one = { ...S, fish: S.fish.slice(0, 1) }, m1 = tankMinimum(one);
    const many = { ...S, fish: Array.from({ length: 12 }, () => ({ ...S.fish[0] })) };
    expect(tankMinimum(many).percent).toBeCloseTo(m1.percent, 6);
    expect(tankMinimum({ ...S, fish: [] }).percent).toBe(0);
    expect(tankMinimum(S).rows[0].pct).toBe(tankMinimum(S).percent);
  });
  it('reads over 100 when the tank is shorter or smaller than the species asks', () => {
    const S = withFish(), sp = tankMinimum(S).rows[0], tight = { ...S, tank: { ...S.tank, L: Math.max(1, sp.minLengthMm / 2) } };
    if (sp.minLengthMm > 0) expect(tankMinimum(tight).percent).toBeGreaterThan(100);
  });
});

describe('tank minimum: run and area', () => {
  it('measures the longest floor side and the floor area whichever way the tank lies', () => {
    const S = withFish(), f = floorOf(S.tank), g = floorOf({ ...S.tank, L: S.tank.D, D: S.tank.L });
    expect(f.runMm).toBeCloseTo(Math.max(S.tank.L, S.tank.D), 0); expect(g.runMm).toBe(f.runMm);
    if ((S.tank.shape ?? 'rect') === 'rect') expect(f.areaCm2).toBeCloseTo(S.tank.L * S.tank.D / 100, 0);
  });
  it('holds swimmers to the run and bottom dwellers to the floor area', () => {
    const S = withFish(), fish = (species: string) => ({ ...S, fish: [{ ...S.fish[0], species }] });
    expect(tankMinimum(fish('danio')).rows[0].kind).toBe('run');
    expect(tankMinimum(fish('adf')).rows[0].kind).toBe('area');
  });
});

describe('fullness bars', () => {
  it('grades a bar ok / near / over and caps the fill at 100', () => {
    expect(bar(40)).toMatchObject({ level: 'ok', fill: 40, text: '40%' });
    expect(bar(NEAR_FULL).level).toBe('near');
    expect(bar(130)).toMatchObject({ level: 'over', fill: 100, text: '130%' });
    expect(bar(Infinity)).toMatchObject({ level: 'over', fill: 100, text: 'over 999%' });
    expect(bar(-3).fill).toBe(0);
  });
  it('lists who fills each bar most, with shares of that bar', () => {
    const S = withFish(), r = stockingOf(S);
    for (const by of ['space', 'load'] as const) {
      const t = topBy(r, by, 99);
      expect(t.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 6);
      for (let i = 1; i < t.length; i++) expect(t[i].share).toBeLessThanOrEqual(t[i - 1].share);
    }
    expect(topBy(r, 'space').length).toBeLessThanOrEqual(3);
  });
  it('shows for a wet tank with animals or a space set, not otherwise', () => {
    const S = withFish(), r = stockingOf(S);
    const st = tileState(S, r);
    expect(st.show).toBe(true);
    expect(st.space.pct).toBeCloseTo(r.spacePercent); expect(st.filt.pct).toBeCloseTo(r.filtrationPercent);
    expect(st.head.pct).toBeCloseTo(Math.max(r.spacePercent, r.filtrationPercent)); // the minimum no longer feeds the percentage (it warns by name)
    const empty = { ...S, fish: [] }, re = stockingOf(empty);
    expect(tileState(empty, re).show).toBe(false);
    expect(tileState({ ...empty, layout: { ...S.layout, space: { w: 900, d: 400 } } }, re).show).toBe(true);
    expect(tileState({ ...S, water: { ...S.water, on: false } }, r).show).toBe(false);
  });
  it('breaks the ammonia down into plants, bacteria and what is left', () => {
    const r = stockingOf(withFish()), rows = nitrogenRows(r.nitrogen), labels = rows.map(x => x.label);
    expect(labels.slice(0, 3)).toEqual(['Animals make', 'Plants take', 'Filter bacteria']);
    expect(labels.includes('Left in the water')).toBe(r.nitrogen.unprocessed > 0);
    expect(mg(0.0042)).toBe('4.2 mg'); expect(mg(0.0421)).toBe('42 mg');
  });
  it('opens the fork card only on the edit that takes the tank past the space', () => {
    expect(forkDue(true, false)).toBe(true);
    expect(forkDue(false, false)).toBe(false); // still past: no new card every change
    expect(forkDue(undefined, false)).toBe(false); // a file opened already past it
    expect(forkDue(false, true)).toBe(false);
    expect(forkDue(true, undefined)).toBe(false); // space removed
  });
  it('converts the fields in the scene units', () => {
    expect(toUnits(900, 'cm')).toBe(90); expect(fromUnits(90, 'cm')).toBe(900);
    expect(toUnits(914, 'in')).toBe(36); expect(fromUnits(36, 'in')).toBe(914);
  });
});

describe('the owner\'s space', () => {
  const T = { L: 762, H: 457, D: 305 };
  it('fits, or says by how much each side goes past', () => {
    expect(spaceFit(T, { w: 900, d: 400 })).toEqual({ fits: true, over: { w: 0, d: 0, h: 0 } });
    const f = spaceFit(T, { w: 700, d: 300, h: 400 });
    expect(f).toEqual({ fits: false, over: { w: 62, d: 5, h: 57 } });
    expect(overLine(f, 'cm')).toBe('6 cm too long, 1 cm too deep and 6 cm too tall for your space.');
    expect(overLine(spaceFit(T, { w: 700, d: 400 }), 'cm')).toBe('6 cm too long for your space.');
  });
  it('counts a round tank by its footprint box', () => {
    const e = tankExtent({ L: 500, H: 400, D: 500, shape: 'round' });
    expect(e.w).toBeCloseTo(500, -1); expect(e.d).toBeCloseTo(500, -1);
  });
  it('starts "Set my space" a little bigger than the tank, in whole 5 cm', () => {
    const s = defaultSpace(T);
    expect(spaceFit(T, s).fits).toBe(true);
    expect(s.w % 50).toBe(0); expect(s.d % 50).toBe(0); expect(s.h).toBeUndefined();
  });
  it('parses only usable sizes', () => {
    expect(parseSpace({ w: 900.4, d: 400, h: 600 })).toEqual({ w: 900, d: 400, h: 600 });
    expect(parseSpace({ w: 900, d: 400, h: 'x' })).toEqual({ w: 900, d: 400 });
    for (const bad of [undefined, null, 5, {}, { w: 900 }, { w: -1, d: 400 }, { w: 1e9, d: 400 }, { w: NaN, d: 400 }]) expect(parseSpace(bad)).toBeUndefined();
  });
});

describe('layout.space in the file', () => {
  it('round-trips through save and open', () => {
    const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES)[0]])).scene;
    sc.tanks[0].layout.space = { w: 1000, d: 450, h: 800 };
    const back = parseScene(JSON.parse(JSON.stringify(sc))).scene;
    expect(back.tanks[0].layout.space).toEqual({ w: 1000, d: 450, h: 800 });
    expect(back.version).toBe(sc.version); // no version bump
  });
  it('old files (no space) open without one and without warnings about it', () => {
    for (const name of Object.keys(SCENES)) {
      const { scene, warnings } = parseScene(JSON.parse(SCENES[name]));
      expect(scene.tanks.every(t => t.layout.space === undefined)).toBe(true);
      expect(warnings.join(' ')).not.toMatch(/space/i);
    }
  });
  it('a broken space is dropped, the rest of the file kept', () => {
    const raw = JSON.parse(SCENES[Object.keys(SCENES)[0]]);
    for (const t of raw.tanks ?? [raw]) if (t.layout) t.layout.space = { w: 'wide' };
    const { scene } = parseScene(raw);
    expect(scene.tanks[0].layout.space).toBeUndefined();
  });
});

describe('the dashed outline', () => {
  const S = ex(Object.keys(SCENES)[0]);
  it('is absent until a space is set, and does not rebuild the tank when it changes', () => {
    expect(spaceOutline(S, S.tank)).toEqual([]);
    expect(envKey({ ...S, layout: { ...S.layout, space: { w: 900, d: 400 } } })).toBe(envKey(S));
  });
  it('is a rectangle on the stand top, a box with a height; back edge on the tank back, centred on its length', () => {
    const e = tankExtent(S.tank), sp = { w: e.w + 200, d: e.d + 100 };
    const flat = outlineEdges({ ...S, layout: { ...S.layout, space: sp } }, S.tank);
    expect(flat.length).toBe(4);
    const xs = flat.flatMap(([a, b]) => [a.x, b.x]), zs = flat.flatMap(([a, b]) => [a.z, b.z]);
    expect(Math.min(...xs)).toBeCloseTo(-100); expect(Math.max(...xs)).toBeCloseTo(e.w + 100);
    expect(Math.min(...zs)).toBeCloseTo(-e.d); expect(Math.max(...zs)).toBeCloseTo(100);
    expect(outlineEdges({ ...S, layout: { ...S.layout, space: { ...sp, h: 600 } } }, S.tank).length).toBe(12);
  });
  it('is teal when the tank fits, red when it does not, and is drawn in the built tank', () => {
    const e = tankExtent(S.tank);
    const col = (w: number) => ((spaceOutline({ ...S, layout: { ...S.layout, space: { w, d: e.d + 50 } } }, S.tank)[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHex();
    expect(col(e.w + 100)).toBe(OUTLINE_FIT); expect(col(e.w - 100)).toBe(OUTLINE_OVER);
    const set = { ...S, layout: { ...S.layout, space: { w: e.w + 100, d: e.d + 50 } }, units: 'cm' as const };
    const kids = buildTank(set, S.tank, null).scene.children.filter(o => o.userData.spaceOutline);
    expect(kids.length).toBe(2);
    expect(buildTank({ ...S, units: 'cm' }, S.tank, null).scene.children.some(o => o.userData.spaceOutline)).toBe(false);
  });
});

describe('tank minimum warnings (binary, AqAdvisor style)', () => {
  const one = (species: string, L: number, D: number, H = 400) => { const S = withFish(); return { ...S, tank: { ...S.tank, shape: 'rect' as const, L, D, H }, fish: [{ ...S.fish[0], species }] }; };
  it('says nothing while every species has its minimum, and the pill is not forced red', () => {
    const S = one('danio', 1500, 500, 500), st = tileState(S, stockingOf(S));
    expect(st.mins).toEqual([]);
  });
  it('names the species and the unmet measure in red when the tank is under its minimum', () => {
    const S = one('swordtail', 700, 520), w = tileState(S, stockingOf(S)).mins;
    expect(w).toHaveLength(1); expect(w[0].level).toBe('over'); expect(w[0].text).toMatch(/^1 Swordtail: wants a tank at least 80 cm long, this one is 70 cm/);
    expect(tileState(S, stockingOf(S)).head.level).toBe('over');
  });
  it('prints lengths in inches when the scene is in inches', () => {
    const S = one('swordtail', 700, 520), w = tileState(S, stockingOf(S), 'in').mins;
    expect(w[0].text).toMatch(/at least 31\.5" long, this one is 27\.6"/);
  });
  it('gives an amber note when a species is held but would be happier larger (a danio school: 40 L floor, 75 L comfort)', () => {
    const S = one('danio', 650, 300, 330), w = minWarnings(tankMinimum(S), 'cm');
    expect(w.every(x => x.level === 'near')).toBe(true); expect(w[0].text).toMatch(/cramped/);
  });
  it('red and amber never name the same species twice', () => {
    for (const sp of ['swordtail', 'danio', 'adf', 'oscar']) for (const L of [300, 450, 650, 900, 1500]) {
      const S = one(sp, L, 300), names = minWarnings(tankMinimum(S), 'cm').map(x => x.text.split(':')[0]);
      expect(new Set(names).size, `${sp} ${L}`).toBe(names.length);
    }
  });
});

// Filter gate (lane NB for Nathan 2026-10-21): no Filtration bar until the owner has a filter, or ticks "no filter" (Walstad).
import { filterCapacity } from '../src/scene/nitrogen';
import { filterState, setFilterless, withChoice as choose } from '../src/scene/tech';
describe('filter gate', () => {
  const tank = () => { const s = withFish(); delete s.tech; return s; };
  it('inferred gear is unset: the pill and the reason come from space alone', () => {
    const s = tank(), r = stockingOf(s), st = tileState(s, r);
    expect(filterState(s)).toBe('unset'); expect(st.filter).toBe('unset');
    expect(st.head.pct).toBeCloseTo(r.spacePercent, 9); expect(st.reason).not.toMatch(/filter/i);
  });
  it('set to none by a kit or the Tech menu, without the box: still unset', () => {
    const s = tank(); s.tech = choose(s, 'filter', 'none');
    expect(filterState(s)).toBe('unset');
  });
  it('a chosen filter is chosen, as today', () => {
    const s = tank(); s.tech = choose(s, 'filter', 'hob');
    expect(filterState(s)).toBe('chosen'); expect(tileState(s, stockingOf(s)).head.pct).toBeCloseTo(stockingOf(s).percent, 9);
  });
  it('ticked: filterless, the other rows stay inferred, the budget is the surface bacteria alone; unticked: back to unset', () => {
    const s = tank(); setFilterless(s, true);
    expect(filterState(s)).toBe('filterless'); expect(Object.keys(s.tech!.rows)).toEqual(['filter']); expect(s.tech!.filters).toEqual([]);
    const r = stockingOf(s), litres = r.capacity.litres, bare = filterCapacity({ ...s, tech: { rows: { filter: 'none' } } }, litres, r.capacity.tempC);
    expect(r.nitrogen.filter.kind).toBe('none'); expect(r.nitrogen.filterG).toBeCloseTo(bare.gDay, 12); expect(r.nitrogen.filter.mediaL).toBe(0);
    setFilterless(s, false); expect(filterState(s)).toBe('unset');
  });
});

import { gearPicks } from '../src/render/gear3d';
import { withUnits, techOf } from '../src/scene/tech';
describe('filter gate follow-ups (Nathan 2026-10-21)', () => {
  const tank = () => { const s = withFish(); delete s.tech; return s; };
  const roundTrip = (S: TankSetup) => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES)[0]])).scene; sc.tanks[sc.active] = S; const b = parseScene(JSON.parse(JSON.stringify(sc))).scene; return b.tanks[b.active]; };
  it('adding a filter clears the Walstad tick: removing it again asks for a filter', () => {
    const s = tank(); setFilterless(s, true);
    s.tech = withUnits(techOf(s), 'filter', [{ kind: 'hob' }]); expect(s.tech.filterless).toBeUndefined(); expect(filterState(s)).toBe('chosen');
    s.tech = withUnits(s.tech, 'filter', []); expect(filterState(s)).toBe('unset');
  });
  it('the tick, the feeding and the path-1 flag survive a save and reload', () => {
    const s = tank(); setFilterless(s, true); s.feeding = 'heavy'; s.stockFirst = true;
    const b = roundTrip(s);
    expect(filterState(b)).toBe('filterless'); expect(b.feeding).toBe('heavy'); expect(b.stockFirst).toBe(true);
  });
  it('a path-1 tank draws no filter until one is added; an ordinary tank still draws the inferred one', () => {
    const filters = (S: TankSetup) => gearPicks(S).filter(p => p.row?.startsWith('filter')).length;
    const plain = tank(); expect(filters(plain)).toBeGreaterThan(0);
    const p1 = { ...tank(), stockFirst: true }; expect(filters(p1)).toBe(0);
    expect(gearPicks(p1).length).toBeGreaterThan(0); // the heater is still drawn
    p1.tech = choose(p1, 'filter', 'hob'); expect(filters(p1)).toBeGreaterThan(0);
  });
});
