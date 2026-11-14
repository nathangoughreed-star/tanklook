// Lane SC (2026-11-14; UI2 §7 cleanup): leftovers of shell steps 3-10, the logic parts (src/shell/logic/*).
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { getSpecies } from '../src/data/species';
import { askOpen, takeOpen } from '../src/shell/logic/sections';
import { sizePct, sizeText, stagesOf, dropSpecies, copySelection, COPY_START, addSpecies, setCount } from '../src/shell/logic/animals';
import { kindView, setKind, dimLabels } from '../src/shell/logic/tank';
import { aqView } from '../src/shell/logic/aq';
import { categories, categoryView, customItem, customOf, addOwnAny, useItem, specOf, itemName } from '../src/shell/logic/equipment';
import { gearOfTank, GENERIC, isOwned } from '../src/scene/gearOwn';
import { gearKindsOf, lightKindOf } from '../src/scene/experienceGate';
import { heaterUnits, techOf } from '../src/scene/tech';

const sp = (id: string) => getSpecies(id)!;
const mk = () => new Store();

describe('one section-open ask', () => {
  it('carries the group to the section it names, once', () => {
    askOpen('constraints', 'home');
    expect(takeOpen('equipment')).toBeUndefined();
    expect(takeOpen('constraints')).toBe('home');
    expect(takeOpen('constraints')).toBeUndefined();
  });
});

describe('Animals: size, life stage, drop, copies', () => {
  it('the size slider is clamped to 15-130 and reads as a length', () => {
    expect(sizePct(0)).toBe(100); expect(sizePct(5)).toBe(15); expect(sizePct(400)).toBe(130);
    expect(sizeText(100, undefined, 'in')).toBe('Adult ±10 %');
    expect(sizeText(50, sp('neon'), 'in')).toMatch(/^50% · .*"? ±10 %$/);
  });
  it('a species with life stages gets buttons that set the slider; fish under the size threshold get none', () => {
    const snake = Object.values({ x: 1 }).length && sp('crestedgecko');
    const st = snake ? stagesOf(snake, 'in', 100) : null;
    if (snake) { expect(st && st.length).toBeGreaterThan(1); expect(st!.every(b => b.pct >= 15 && b.pct <= 130)).toBe(true); expect(st!.some(b => b.on)).toBe(true); }
    expect(stagesOf(sp('neon'), 'in', 100)).toBeNull();
    expect(stagesOf(undefined, 'in', 100)).toBeNull();
  });
  it('the new-animal size is applied to what is added (stored as a custom length)', () => {
    const st = mk(); expect(addSpecies(st, sp('neon'), undefined, 60).ok).toBe(true);
    const full = mk(); addSpecies(full, sp('neon'), undefined, 100);
    const a = st.tank.fish.map(f => f.tl ?? 0), b = full.tank.fish.map(f => f.tl ?? 0);
    expect(b.every(x => x === 0 || x > 0)).toBe(true);
    expect(Math.max(...a.filter(x => x > 0))).toBeLessThan(sp('neon').tl);
  });
  it('a species dropped into the tank adds its start count at the spot, one more when already there; one undo step', () => {
    const st = mk();
    const at = { vi: 0, x: 200, depth: 150, y: 0 } as never;
    expect(dropSpecies(st, sp('neon'), undefined, at).ok).toBe(true);
    const n0 = st.tank.fish.length; expect(n0).toBeGreaterThan(0);
    expect(dropSpecies(st, sp('neon'), undefined, at).ok).toBe(true);
    expect(st.tank.fish.length).toBe(n0 + 1);
    const nu = st.tank.fish.length; st.undo(); expect(st.tank.fish.length).toBeLessThan(nu);
  });
  it('Copies makes N more of the selection, selects them, undoes in one step, and refuses an empty selection', () => {
    const st = mk();
    expect(copySelection(st, COPY_START).ok).toBe(false);
    setCount(st, sp('neon'), () => 1, undefined);
    st.select(st.tank.fish[0].id);
    const r = copySelection(st, { ...COPY_START, n: 4 }, 7);
    expect(r).toEqual({ ok: true, made: 4 });
    expect(st.tank.fish.length).toBe(5);
    expect(st.group.fish.length).toBe(4);
    st.undo(); expect(st.tank.fish.length).toBe(1);
  });
});

describe('Tank: Kind and edge labels', () => {
  it('Kind switches the setup and says what the Animals list will show', () => {
    const st = mk(), k = kindView(st.tank);
    expect(k.opts.map(o => o[0])).toContain(k.on);
    const other = k.opts.find(o => o[0] !== k.on);
    if (other) { const said = setKind(st, other[0]); expect(said).toMatch(/Animals list/); expect(kindView(st.tank).on).toBe(other[0]); st.undo(); expect(kindView(st.tank).on).toBe(k.on); }
    expect(setKind(st, kindView(st.tank).on)).toBe('');
  });
  it('dimension labels sit on the length, depth and height edges, and drop when an edge is behind the eye', () => {
    const T = { L: 1000, D: 400, H: 500 };
    const proj = (x: number, y: number, z: number): [number, number] => [x * 0.5 + 100, 400 - y * 0.5 + z * 0.2];
    const l = dimLabels(T, { L: '39"', D: '16"', H: '20"' }, proj, 10);
    expect(l.map(x => x.id)).toEqual(['L', 'D', 'H']);
    expect(l[0].x).toBeCloseTo(100 + 250); expect(l[0].y).toBeCloseTo(400 + 10);
    expect(l[2].x).toBeCloseTo(100 + 500 + 10); expect(l[2].y).toBeCloseTo(400 - 125);
    expect(dimLabels(T, { L: 'a', D: 'b', H: 'c' }, (x, y) => (y > 0 ? null : [x, y])).map(x => x.id)).toEqual(['L', 'D']);
  });
});

describe('AqAdvisor row', () => {
  it('hidden with no fish; shows the link and a Check only when the proxy is up', () => {
    const st = mk(); expect(aqView(st.tank).show).toBe(false);
    addSpecies(st, sp('neon'));
    const base = { done: new Map<string, number>(), busy: new Set<string>(), err: new Map<string, string>(), queued: new Set<string>(), wait: 0 };
    const up = aqView(st.tank, { ...base, up: 'up', proxy: 'https://p' });
    expect(up.show && up.canCheck && up.url.startsWith('http')).toBe(true);
    expect(aqView(st.tank, { ...base, up: 'down', proxy: 'https://p' }).canCheck).toBe(false);
    expect(aqView(st.tank, { ...base, up: 'down', proxy: 'https://p' }).text).toMatch(/can’t check/);
    const q = aqView(st.tank, { ...base, up: 'up', proxy: '' }); expect(q.canCheck).toBe(false);
  });
  it('an answer over 100 % is called overstocked', () => {
    const st = mk(); addSpecies(st, sp('neon'));
    const done = new Map<string, number>();
    const first = aqView(st.tank, { done, busy: new Set(), err: new Map(), queued: new Set(), up: 'up', proxy: 'x', wait: 0 });
    expect(first.show).toBe(true);
  });
});

describe('Equipment: every tech row has a sub-menu; Add one I own', () => {
  it('a dry tank offers its own categories (heat lamp, thermostat, UVB ...) with Generic and no catalogue', () => {
    const st = mk(); st.edit(s => { s.water.on = false; });
    const ids = categories(st.tank).map(c => c.id);
    expect(ids).toEqual(expect.arrayContaining(['heatlamp', 'thermostat', 'uvb']));
    const v = categoryView(st.tank, 'heatlamp', 'in');
    expect(v.buy.map(r => r.item)).toEqual([GENERIC]);
    expect(v.label).toBe('Heat lamp');
  });
  it('Generic on a no-product row turns the row on', () => {
    const st = mk(); st.edit(s => { s.water.on = false; });
    expect((techOf(st.tank).rows.thermostat ?? 'none')).toBe('none');
    st.edit(s => useItem(s, 'thermostat', GENERIC));
    expect(techOf(st.tank).rows.thermostat).not.toBe('none');
  });
  it('a heater or light I own needs a name and a wattage; other things need a name', () => {
    expect(specOf('heater')).toBeDefined(); expect(specOf('feeder')).toBeUndefined();
    expect(customItem('heater', 'Hydor 150')).toBeUndefined();
    expect(customItem('heater', '  ', 150)).toBeUndefined();
    expect(customItem('heater', 'Hydor 150', 9999)).toBeUndefined();
    expect(customItem('heater', 'Hydor | 150', 150)).toBe('own:Hydor 150|150');
    expect(customItem('feeder', 'Eheim')).toBe('own:Eheim');
    expect(customOf('own:Hydor 150|150')).toEqual({ name: 'Hydor 150', watts: 150 });
    expect(itemName('heater', 'own:Hydor 150|150')).toBe('Hydor 150');
  });
  it('owned heater of any brand: listed in I own at $0, and Use puts a heater of that wattage on the design', () => {
    const st = mk();
    st.edit(s => { expect(addOwnAny(s, 'heater', 'Hydor 150', 150)).toBe(true); });
    const item = 'own:Hydor 150|150';
    expect(isOwned(gearOfTank(st.tank), 'heater', item)).toBe(true);
    let v = categoryView(st.tank, 'heater', 'in'), row = v.owned.find(r => r.item === item)!;
    expect(row.name).toBe('Hydor 150'); expect(row.sub).toMatch(/150 W/); expect(row.price).toBe('Owned · $0');
    st.edit(s => useItem(s, 'heater', item));
    expect(heaterUnits(techOf(st.tank))[0].w).toBe(150);
    v = categoryView(st.tank, 'heater', 'in'); row = v.owned.find(r => r.item === item)!;
    expect(row.inUse).toBe(true);
    st.undo(); expect(isOwned(gearOfTank(st.tank), 'heater', item)).toBe(true);
  });
  it('owned light of any brand sets the light watts', () => {
    const st = mk(); st.edit(s => { addOwnAny(s, 'light', 'Old shop light', 24); });
    st.edit(s => useItem(s, 'light', 'own:Old shop light|24'));
    expect(st.tank.light.watts).toBe(24);
  });
});

describe('experience gate: light is a gear kind', () => {
  it('a strong light over plants is lightplanted, over salt water lightreef, else basic', () => {
    const st = mk(), S = st.tank;
    expect(['lightbasic', 'lightplanted']).toContain(lightKindOf(S));
    st.edit(s => { s.light.type = 'led'; s.light.watts = 400; s.items.push({ id: 900, kind: 'plant', variant: 'dwarf-hairgrass', x: 100, depth: 100, yaw: 0, scale: 1, seed: 1 } as never); });
    expect(lightKindOf(st.tank)).toBe('lightplanted');
    expect(gearKindsOf(st.tank)).toContain('lightplanted');
    st.edit(s => { s.light.watts = 2; });
    expect(lightKindOf(st.tank)).toBe('lightbasic');
    st.edit(s => { s.water.on = false; });
    expect(lightKindOf(st.tank)).toBeNull();
  });
});
