// Lane ST1 (Nathan 2026-11-05): the Sandbox's empty room, the docked tank picker's rows and live preview, and what the tank stands on.
import { afterEach, describe, expect, it } from 'vitest';
import { buildTank } from '../src/render/build';
import { tankView } from '../src/render/tankView';
import { defaultProfile, demandOf } from '../src/demand';
import { TANK_MODELS, tankFromModel } from '../src/data/tanks';
import { defaultScene } from '../src/scene/defaults';
import { DEFAULT_ENVIRONMENT, environmentGaps } from '../src/scene/defaultEnvironment';
import { IN } from '../src/scene/physics';
import { PLACEMENTS, minTop, placementOf, putOnFloor, putOnFurniture, putOnMyFurniture, putOnStand } from '../src/scene/placement';
import { sandboxRoomScene } from '../src/scene/sandboxRoom';
import { fitTable } from '../src/scene/table';
import { parseScene } from '../src/scene/validate';
import { gearPicks } from '../src/render/gear3d';
import { techParts } from '../src/scene/tech';
import { dockGroups, isBundle, modelIsBundle, offers, previewSetup, rangeText, roomZoom, startGear } from '../src/ui/tankDockLogic';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

afterEach(() => { tankView.empty = false; tankView.ghost = false; });

const all = (g: ReturnType<typeof dockGroups>) => g.flatMap(x => x.bands.flatMap(b => b.opts));
const names = (sc: { children: { name: string }[] }) => sc.children.map(c => c.name);

describe('the empty room', () => {
  it('is the default environment with the person, a wall, no stand and no tank in the picture', () => {
    const s = sandboxRoomScene('freshwater'), S = s.tanks[0];
    expect(environmentGaps({ ...S, stand: { ...S.stand, finish: DEFAULT_ENVIRONMENT.standFinish } })).toEqual([]);
    expect(S.person.show).toBe(true); expect(S.wall.show).toBe(true);
    expect(S.stand.show).toBe(false); expect(S.stand.need).toBe('none');
    expect(S.fish).toEqual([]); expect(S.items).toEqual([]);
    tankView.empty = true;
    const b = buildTank({ ...S, units: s.units }, S.tank, null);
    expect(b.scene.getObjectByName('person')).toBeTruthy();
    // no glass / water / lid: nothing the tank draws (the glass is tagged PART.glass)
    let glass = 0; b.scene.traverse(o => { if (o.userData.part === 1) glass++; });
    expect(glass).toBe(0);
    tankView.empty = false;
    const full = buildTank({ ...S, units: s.units }, S.tank, null);
    expect(full.scene.children.length).toBeGreaterThan(b.scene.children.length);
  });
  it('takes the kind: terrarium has no water, saltwater has salt', () => {
    expect(sandboxRoomScene('terrarium').tanks[0].water.on).toBe(false);
    expect(sandboxRoomScene('saltwater').tanks[0].water.salt).toBe(true);
    expect(sandboxRoomScene('vivarium').tanks[0].layout.kind).toBe('vivarium');
  });
});

describe('the docked picker rows', () => {
  it('filters by kind and groups by band, smallest first, each row with its size', () => {
    const fresh = dockGroups('freshwater'), terr = dockGroups('terrarium'), viv = dockGroups('vivarium');
    const ids = (g: ReturnType<typeof dockGroups>) => g.flatMap(x => x.bands.flatMap(b => b.opts)).map(o => o.m);
    expect(ids(fresh).every(m => !m.terrarium)).toBe(true);
    expect(ids(terr).every(m => m.terrarium)).toBe(true);
    expect(ids(terr).length).toBeGreaterThan(0);
    expect(ids(viv).length).toBe(ids(fresh).length + ids(terr).length);
    for (const g of fresh) for (const b of g.bands) { const gal = b.opts.filter(o => o.typical).map(o => o.gal); expect(gal).toEqual([...gal].sort((a, b) => a - b)); }
    for (const o of all(fresh)) { expect(o.dims).toMatch(/^\d/); expect(o.key).toBeTruthy(); }
    expect(new Set(all(fresh).map(o => o.key)).size).toBe(all(fresh).length);
    expect(offers(TANK_MODELS.find(m => m.terrarium)!, 'freshwater')).toBe(false);
  });
  it('searches, shows the finished range on model rows and none when it is not known', () => {
    const hit = all(dockGroups('freshwater', '75'));
    expect(hit.length).toBeGreaterThan(0);
    expect(dockGroups('freshwater', 'zzzz-no-such-tank')).toEqual([]);
    const withRange = all(dockGroups('freshwater')).filter(o => o.typical && o.range);
    expect(withRange.length).toBeGreaterThan(10); expect(withRange.every(o => o.range!.hi > o.range!.lo)).toBe(true); // FR1's table feeds the rows
    expect(rangeText(null)).toBe('');
    expect(rangeText({ lo: 850, hi: 3100 })).toBe('$850 - $3,100');
  });
});

describe('tank only vs kits and bundles (ST2)', () => {
  const fresh = dockGroups('freshwater'), tank = fresh.find(g => g.id === 'tank')!, kit = fresh.find(g => g.id === 'kit')!;
  it('has two groups, each in size bands in order, each band counting its choices and its price range', () => {
    expect(fresh.map(g => g.id)).toEqual(['tank', 'kit']);
    for (const g of fresh) {
      const order = g.bands.map(b => ['nano', 'small', 'mid', 'large', 'monster'].indexOf(b.band)); expect(order).toEqual([...order].sort((a, b) => a - b));
      for (const b of g.bands) { expect(b.n).toBe(b.opts.length); expect(b.n).toBeGreaterThan(0); if (b.lo != null) expect(b.hi!).toBeGreaterThanOrEqual(b.lo); expect(b.id).toBe(`${g.id}:${b.band}`); }
    }
  });
  it('the rule: sold with gear = kit; the SpongeBob starter kit and the Vehipa kit are bundles, a plain Aqueon glass tank is not', () => {
    const k = all([kit]), t = all([tank]);
    expect(k.some(o => /SpongeBob/i.test(o.m.name))).toBe(true);
    expect(t.some(o => /SpongeBob/i.test(o.m.name))).toBe(false);
    expect(k.some(o => o.v && /Vehipa/i.test(o.v.brand + (o.v.line ?? '')))).toBe(true);
    expect(t.filter(o => o.v).every(o => !isBundle(o.v!))).toBe(true);
    expect(t.every(o => !modelIsBundle(o.m))).toBe(true);
    expect(isBundle({ brand: 'X', line: 'Plain rectangle', L_in: 1, D_in: 1, H_in: 1 })).toBe(false);
    expect(isBundle({ brand: 'X', line: 'Plain', L_in: 1, D_in: 1, H_in: 1, includes: { filter: true } })).toBe(true);
    expect(isBundle({ brand: 'X', line: 'Plain', L_in: 1, D_in: 1, H_in: 1, price_kind: 'kit' })).toBe(true);
    expect(isBundle({ brand: 'X', line: 'LED Starter Kit', L_in: 1, D_in: 1, H_in: 1 })).toBe(true);
    // every generic size is a bare tank unless its own name is a kit
    expect(t.filter(o => o.typical).length).toBeGreaterThan(40);
  });
  it('nothing is listed twice and nothing is lost', () => {
    const keys = [...all([tank]), ...all([kit])].map(o => o.key); expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('a bare tank brings no equipment (ST2)', () => {
  const opts = all(dockGroups('freshwater')), room = () => sandboxRoomScene('freshwater').tanks[0];
  const bareOpt = opts.find(o => o.typical && !modelIsBundle(o.m) && o.m.ratedGal >= 20 && o.m.ratedGal <= 60)!;
  it('the empty room itself holds no gear: flat (no) light, open top, no tech list', () => {
    const S = room(); expect(S.light.type).toBe('flat'); expect(S.lid).toBe('open'); expect(S.tech).toBeUndefined();
  });
  it('the preview of a tank-only pick draws and lists no gear, and Choose gives the same', () => {
    const S = room(), p = previewSetup(S, bareOpt, true);
    expect(gearPicks(p)).toEqual([]); expect(techParts(p)).toEqual([]);
    expect(demandOf(p, defaultProfile()).items.some(c => c.key === 'heater')).toBe(false);
    expect(p.light.type).toBe('flat'); expect(p.lid).not.toBe('hood');
    // without the Sandbox flag (changing a tank in the editor) the scene's own gear logic is left alone
    expect(gearPicks(previewSetup(S, bareOpt)).length).toBeGreaterThan(0);
    // Choose: the same gear
    const q = structuredClone(p); delete q.tech; q.tech = startGear(q, bareOpt)!; expect(gearPicks(q)).toEqual([]);
  });
  it('ST3: the cost panel of a bare tank prices the tank (and the room kit), no filter and no dechlorinator, until gear is added', () => {
    const p = previewSetup(room(), bareOpt, true), keys = demandOf(p, defaultProfile()).items.filter(c => c.setup).map(c => c.key);
    expect(keys).toContain('tank'); expect(keys).not.toContain('filter'); expect(keys).not.toContain('startconditioner');
    // adding a filter brings its line back
    const q = structuredClone(p); q.tech = { ...q.tech!, rows: { ...q.tech!.rows, filter: 'hob' } };
    expect(demandOf(q, defaultProfile()).items.some(c => c.key === 'filter' && c.setup)).toBe(true);
  });
  it('ST3: the Sandbox room lens fits the 6 ft person at the smallest tanks (no clamp to the old 0.1 floor)', () => {
    const smallest = Math.min(...TANK_MODELS.filter(m => m.ratedGal <= 3).map(m => roomZoom(tankFromModel(m))), 0.34);
    expect(smallest).toBeGreaterThanOrEqual(0.05); expect(smallest).toBeLessThan(0.1);
    for (const m of TANK_MODELS) { const T = tankFromModel(m), z = roomZoom(T), span = Math.max(T.L, T.H * 1.6), want = span * 0.34 / 1219; if (span >= 1000 && want <= 0.6) expect(z).toBeCloseTo(want, 6); expect(z).toBeLessThanOrEqual(Math.max(0.05, want) + 1e-9); }
  });
  it('a kit brings only what it includes: a filter that comes with it stays, the heater it lacks does not', () => {
    const kit = opts.find(o => o.v && isBundle(o.v) && !o.v.kit && o.v.includes?.filter && !o.v.includes.heater && o.m.ratedGal >= 20)!;
    expect(kit).toBeTruthy();
    const p = previewSetup(room(), kit, true), parts = techParts(p).map(x => x.gear);
    expect(parts.some(g => /filter|hob|canister|sponge/.test(g)) || gearPicks(p).length > 0).toBe(true);
    expect(parts).not.toContain('heater');
    // a kit whose contents are not recorded keeps the defaults it always had
    const unknown = opts.find(o => o.v && isBundle(o.v) && !o.v.kit && !o.v.includes);
    if (unknown) expect(startGear(room(), unknown)).toBeUndefined();
  });
});

describe('the live preview', () => {
  it('draws the highlighted size on a copy; the saved scene does not change until Choose', () => {
    const s = sandboxRoomScene('freshwater'), base = s.tanks[0], before = JSON.stringify(s);
    const o = all(dockGroups('freshwater')).find(x => x.typical && x.m.ratedGal >= 50)!;
    const p = previewSetup(base, o);
    expect(JSON.stringify(s)).toBe(before);
    expect(p).not.toBe(base);
    const want = tankFromModel(o.v ? { ...o.m } : o.m);
    expect(Math.abs(p.tank.L - want.L)).toBeLessThan(1); expect(Math.abs(p.tank.H - want.H)).toBeLessThan(1);
    expect(p.person.show).toBe(true);   // the room stays
    // flipping through sizes gives different tanks
    const q = previewSetup(base, all(dockGroups('freshwater')).find(x => x.typical && x.m.ratedGal <= 5)!);
    expect(q.tank.L).toBeLessThan(p.tank.L);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('what the tank stands on', () => {
  const base = () => defaultScene().tanks[0];
  it('floor: no stand drawn, none counted', () => {
    const S = base(); putOnStand(S); expect(placementOf(S)).toBe('stand');
    putOnFloor(S);
    expect(S.stand.show).toBe(false); expect(S.stand.need).toBe('none'); expect(placementOf(S)).toBe('floor');
    expect(demandOf(S, defaultProfile()).items.some(c => c.key === 'stand')).toBe(false);
  });
  it('stand: a cabinet or a frame in a finish, counted in the budget', () => {
    const S = base(); putOnFloor(S);
    putOnStand(S, { style: 'frame', finish: 'oak' });
    expect(S.stand).toMatchObject({ show: true, need: 'added', style: 'frame', finish: 'oak' });
    expect(demandOf(S, defaultProfile()).items.some(c => c.key === 'stand')).toBe(true);
    putOnStand(S, { style: 'cabinet', finish: 'white' }); expect(S.stand.style).toBe('cabinet');
  });
  it('own furniture is the existing table style with the person\'s measurements, no new field, not counted', () => {
    const S = base(), keys = JSON.stringify([...Object.keys(S.stand), 'need'].filter((k, i, a) => a.indexOf(k) === i).sort());
    const r = putOnFurniture(S, { shape: 'rect', L: 60 * IN, D: 24 * IN, height: 34 * IN });
    expect(S.stand).toMatchObject({ show: true, need: 'added', style: 'table', height: 34 * IN });
    expect(S.stand.table).toMatchObject({ shape: 'rect', L: 60 * IN, D: 24 * IN, x: 0, z: 0 });
    expect(r.grown).toBe(false); expect(placementOf(S)).toBe('furniture');
    expect(JSON.stringify(Object.keys(S.stand).sort())).toBe(keys);
    expect(demandOf(S, defaultProfile()).items.some(c => c.key === 'stand')).toBe(false);
  });
  it('a top smaller than the tank is grown to hold it, and says so; a round top is as wide as it is deep', () => {
    const S = base(), min = minTop(S, 'rect');
    const r = putOnFurniture(S, { shape: 'rect', L: 6 * IN, D: 6 * IN, height: 30 * IN });
    expect(r.grown).toBe(true);
    expect(S.stand.table.L).toBeGreaterThanOrEqual(min.L - 1); expect(S.stand.table.D).toBeGreaterThanOrEqual(min.D - 1);
    const R = putOnFurniture(S, { shape: 'round', L: 60 * IN, D: 10, height: 30 * IN });
    expect(S.stand.table.D).toBe(S.stand.table.L); expect(R.grown).toBe(false);
    const T0 = JSON.stringify(S.stand.table); fitTable(S); expect(JSON.stringify(S.stand.table)).toBe(T0); // already fitted
  });
  it('My own furniture starts from 30 in high and a 36 x 18 in top, or what it already is', () => {
    const S = base(); putOnFloor(S); putOnMyFurniture(S);
    expect(S.stand.height).toBe(30 * IN); expect(S.stand.table.shape).toBe('rect');
    S.stand.height = 40 * IN; putOnMyFurniture(S); expect(S.stand.height).toBe(40 * IN);
  });
  it('lists the three choices', () => { expect(PLACEMENTS.map(p => p[0])).toEqual(['floor', 'stand', 'furniture']); });
});

describe('old saves load unchanged', () => {
  it('a saved scene round-trips and a scene without a stand.need keeps reading as it did', () => {
    const s = defaultScene(), txt = JSON.stringify(s);
    expect(JSON.stringify(parseScene(txt).scene)).toBe(JSON.stringify(parseScene(JSON.stringify(parseScene(txt).scene)).scene));
    const old = JSON.parse(txt); delete old.tanks[0].stand.need;
    const S = parseScene(JSON.stringify(old)).scene.tanks[0];
    expect(S.stand.show).toBe(true); expect(placementOf(S)).toBe('stand'); expect(S.stand.need).toBeUndefined();
    expect(S.tank).toEqual(s.tanks[0].tank);
  });
  it('the empty room saves and loads as a scene with a tank', () => {
    const s = sandboxRoomScene('freshwater'), back = parseScene(JSON.stringify(s)).scene;
    expect(back.tanks).toHaveLength(1); expect(back.tanks[0].tank).toEqual(s.tanks[0].tank);
  });
});
void names;
