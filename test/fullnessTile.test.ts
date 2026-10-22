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
import { spaceBand } from '../src/ui/stockPlanLogic';
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
  // S229 (Nathan 2026-10-26): the load bars' fill is a gradient keyed to where it reaches on the track (green to the ideal line, amber half
  // way to the limit, red at 100), so the colour is positional and the fill is the raw percent; the band (label, pill, reason text) reads the
  // rounded percent, the same one S214's spaceBand reads on the stocking screen, so the two screens never disagree on the word.
  it('bands agree with the stocking screen on the rounded percent; the fill stays unrounded', () => {
    for (const p of [74.4, 74.6, 74.99, 75, 87.5, 99.6, 100.4, 100.5, 130]) expect(bar(p).level, `${p}`).toBe(spaceBand(p));
    expect(bar(74.6)).toMatchObject({ level: 'near', fill: 74.6, text: '75%' }); // printed 75 %, tip just short of the line
    expect(bar(100.4)).toMatchObject({ level: 'near', fill: 100, text: '100%' }); // printed 100 %, full bar, not over
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
    expect(w).toHaveLength(1); expect(w[0].level).toBe('over'); expect(w[0].text).toMatch(/^1 Swordtail: wants a tank at least 80 cm long \(FishBase \+ Seriously Fish\), this one is 70 cm/);
    expect(tileState(S, stockingOf(S)).head.level).toBe('over');
  });
  it('prints lengths in inches when the scene is in inches', () => {
    const S = one('swordtail', 700, 520), w = tileState(S, stockingOf(S), 'in').mins;
    expect(w[0].text).toMatch(/at least 31\.5" long \(FishBase \+ Seriously Fish\), this one is 27\.6"/);
  });
  it('gives a yellow bar when a species is above its minimum but below the recommended size (lane MM: danio red 20 in derived, green 35.5 in Seriously Fish)', () => {
    const S = one('danio', 650, 300, 330), st = tileState(S, stockingOf(S));
    expect(st.min.level).toBe('near'); // Nathan 2026-10-22: the yellow bar says why, in a yellow line
    expect(st.mins).toEqual([{ level: 'near', text: '1 Zebra danio: below the recommended size: Seriously Fish recommends 90 cm long, this one is 65 cm long' }]);
    expect(st.topMin[0].note).toBe('at least 50 cm x 26 cm (est. from gallons); Recommended 90 cm x 30 cm');
  });
  it('red and amber never name the same species twice', () => {
    for (const sp of ['swordtail', 'danio', 'adf', 'oscar']) for (const L of [300, 450, 650, 900, 1500]) {
      const S = one(sp, L, 300), names = minWarnings(tankMinimum(S), 'cm').map(x => x.text.split(':')[0]);
      expect(new Set(names).size, `${sp} ${L}`).toBe(names.length);
    }
  });
});
import { summaryOf } from '../src/ui/stockSummary';

// Filter gate (lane NB for Nathan 2026-10-21): no Filtration bar until the owner has a filter, or ticks "no filter" (Walstad).
import { filterCapacity } from '../src/scene/nitrogen';
import { filterState, setFilterless, withChoice as choose } from '../src/scene/tech';
describe('filter gate', () => {
  const tank = () => { const s = withFish(); delete s.tech; return s; };
  it('inferred gear is unset: the budget runs on an assumed default filter, and the summary is never green (B1, Nathan 2026-10-27)', () => {
    const s = tank(), r = stockingOf(s), st = tileState(s, r);
    expect(filterState(s)).toBe('unset'); expect(st.filter).toBe('unset');
    expect(st.head.pct).toBeCloseTo(r.loadPercent, 9);
    expect(r.nitrogen.filter.kind).not.toBe('none');
    const env = summaryOf(s).cats.find(c => c.id === 'environment')!;
    expect(env.level).not.toBe('ok'); expect(env.items.some(i => i.level === 'unknown' && /No filter chosen/.test(i.text))).toBe(true);
    expect(env.items.map(i => i.text).join(' ')).not.toMatch(/impossible/i);
  });
  it('a path-1 tank (filter none until chosen) is worked against the same assumed filter as a plain inferred one', () => {
    const a = tank(), b = tank(); b.stockFirst = true;
    expect(stockingOf(b).filtrationPercent).toBeCloseTo(stockingOf(a).filtrationPercent, 9);
    expect(stockingOf(b).nitrogen.filter.kind).not.toBe('none');
  });
  it('a chosen filter or the Walstad tick has no "No filter chosen" line', () => {
    const s = tank(); s.tech = choose(s, 'filter', 'hob');
    expect(summaryOf(s).cats.find(c => c.id === 'environment')!.items.some(i => /No filter chosen/.test(i.text))).toBe(false);
    const w = tank(); setFilterless(w, true);
    expect(summaryOf(w).cats.find(c => c.id === 'environment')!.items.some(i => /No filter chosen/.test(i.text))).toBe(false);
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
    expect(gearPicks(p1).some(p => p.row?.startsWith('heater'))).toBe(false); // no heater either until one is added (Nathan 2026-10-26)
    p1.tech = choose(p1, 'filter', 'hob'); expect(filters(p1)).toBeGreaterThan(0);
  });
});

describe('Water column and Floor bars (lane HB, Nathan 2026-10-21: Space split in two)', () => {
  const fishes = (c: Record<string, number>) => Object.entries(c).flatMap(([species, n]) => Array.from({ length: n }, () => species))
    .map((species, i) => ({ id: i + 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
  const S0 = withFish(), at = (c: Record<string, number>, L = 36, D = 18, H = 16): TankSetup => ({ ...S0, tank: { ...S0.tank, L: L * 25.4, D: D * 25.4, H: H * 25.4 }, fish: fishes(c) });
  it('a cory-heavy stock: the Floor bar is the fuller one and lists only bottom dwellers; the pill follows the larger', () => {
    const S = at({ bronzecory: 15, danio: 5 }), r = stockingOf(S), st = tileState(S, r, 'in');
    expect(st.floor.pct).toBeGreaterThan(st.water.pct); expect(st.spaceBy).toBe('floor');
    expect(st.topFloor.map(t => t.name)).toEqual(['Bronze corydoras']);
    expect(st.space.pct).toBeCloseTo(st.floor.pct, 9);
  });
  it('midwater fish only: the floor is free', () => {
    const S = at({ danio: 10 }), st = tileState(S, stockingOf(S), 'in');
    expect(st.floor.pct).toBe(0); expect(st.topFloor).toEqual([]); expect(st.spaceBy).toBe('water');
  });
  it('over on the floor: the reason asks for floor, not water', () => {
    const S = at({ bronzecory: 10 }, 30, 12, 36), r = stockingOf(S);
    expect(r.spaceBy).toBe('floor'); expect(r.spacePercent).toBeGreaterThan(100);
    expect(r.reasons.join(' ')).toMatch(/floor is too small for the bottom dwellers.*sq in of floor/);
  });
});
