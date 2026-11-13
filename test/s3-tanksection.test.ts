// Lane S3 (2026-11-13; UI2 §7 step 3): the Tank section / picker / custom tank maker view-models (src/shell/logic/tank.ts), the glass panel
// (src/shell/logic/tankGlass.ts), the glass build saved on a custom tank (scene/customTanks.ts) and the solver's held top edge (scene/glassSolver.ts).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { defaultSetup } from '../src/scene/defaults';
import { addCustomTank, editCustomTank, loadLibrary, parseSpec, saveLibrary, type CustomTankSpec } from '../src/scene/customTanks';
import { solveGlass, IN_MM } from '../src/scene/glassSolver';
import { getTankModel } from '../src/data/tanks';
import { mapToTank } from '../src/scene/physics';
import {
  modelCard, customRows, commercialRows, chooseCommercial, chooseCustom, previewRow, makerSetup, makerFacts, priceView, startSpec, glassText, dims,
  sitsOnSummary, lidSummary, roomSummary, loadGroups, saveGroups, GROUP_DEFAULT, specChanged, SHAPE_MAIN, SHAPE_MORE,
} from '../src/shell/logic/tank';
import { glassPanel, defaultChoice, DISCLAIMER } from '../src/shell/logic/tankGlass';
import type { TankSetup } from '../src/scene/types';

const IN = 25.4;
const ex = (name: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[name])).scene; return sc.tanks[sc.active]; };
const spec = (over: Partial<CustomTankSpec> = {}): CustomTankSpec => ({ name: 'Den 40', tank: { L: 36 * IN, D: 18 * IN, H: 16 * IN }, glass: 'auto', glassType: 'standard', rim: true, ...over });
const fake = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
const firstCommercial = (S: TankSetup) => commercialRows(S, 'in').rows.find(r => r.opt && !r.opt.typical && r.opt.v && !r.inUse)!;

describe('Tank model card', () => {
  it('a custom setup: Custom card with its name, size line and "Edit"-able kind', () => {
    const S = defaultSetup(), c = modelCard(S, 'in', []);
    expect(c.kind).toBe('custom');
    expect(c.title).toBe('Custom 24 x 12 x 12 in');
    expect(c.rows.map(r => r[0])).toEqual(['Shape', 'Size', 'Glass, rim']);
    expect(c.rows[1][1]).toMatch(/^24 × 12 × 12 in · 15 gal$/);
    expect(c.note).toMatch(/lb filled/);
  });
  it('a commercial pick becomes a read-only Commercial card; the product stays held', () => {
    const S = defaultSetup(), r = firstCommercial(S);
    chooseCommercial(S, r.opt!);
    expect(S.product?.model).toBe(r.opt!.m.id);
    expect(S.customTank).toBeUndefined();
    const c = modelCard(S, 'in', []);
    expect(c.kind).toBe('commercial');
    expect(c.sub).toMatch(/^Commercial tank/);
    expect(c.note).toMatch(/size and build are fixed/);
    expect(commercialRows(S, 'in').rows.filter(x => x.inUse).map(x => x.key)).toEqual([r.key]);
  });
  it('a library tank in use: In use on its row; a newer library version shows on the card', () => {
    const S = defaultSetup();
    let { lib, entry } = addCustomTank([], spec(), 1);
    chooseCustom(S, entry);
    expect(S.customTank).toMatchObject({ id: entry.id, version: 1, name: 'Den 40' });
    expect(customRows(S, lib, 'in')[0]).toMatchObject({ inUse: true, name: 'Den 40' });
    expect(modelCard(S, 'in', lib).libId).toBe(entry.id);
    lib = editCustomTank(lib, entry.id, { rim: false }, 2).lib;
    expect(modelCard(S, 'in', lib).newer?.version).toBe(2);
    expect(modelCard(S, 'in', []).lost).toBe(true);
  });
});

describe('picker', () => {
  it('commercial rows: size chips filter by gallons, a search narrows, every row says rim and size', () => {
    const S = defaultSetup(), all = commercialRows(S, 'in');
    expect(all.total).toBeGreaterThan(50);
    expect(all.rows.length).toBe(all.total);
    const big = commercialRows(S, 'in', { chips: new Set(['75+']) });
    expect(big.rows.length).toBeGreaterThan(0);
    expect(big.rows.every(r => r.opt!.gal >= 75)).toBe(true);
    expect(all.rows.every(r => /in · (rimmed|rimless)/.test(r.meta))).toBe(true);
    const q = commercialRows(S, 'in', { q: 'waterbox' });
    expect(q.rows.length).toBeGreaterThan(0); expect(q.rows.length).toBeLessThan(all.rows.length);
  });
  it('"Fits my space" keeps only tanks inside layout.space, and is off when no space is set', () => {
    const S = defaultSetup();
    expect(commercialRows(S, 'in').noSpace).toBe(true);
    S.layout.space = { w: 31 * IN, d: 13 * IN };
    const f = commercialRows(S, 'in', { fits: true });
    expect(f.noSpace).toBe(false);
    expect(f.rows.length).toBeGreaterThan(0); expect(f.rows.length).toBeLessThan(f.total);
  });
  it('a highlighted row draws a COPY: the scene is untouched', () => {
    const S = ex('planted'), before = JSON.stringify(S), r = firstCommercial(S);
    const p = previewRow(S, r);
    expect(JSON.stringify(S)).toBe(before);
    expect(p.product?.model).toBe(r.opt!.m.id);
    const { entry } = addCustomTank([], spec(), 1);
    const c = previewRow(S, customRows(S, [entry], 'in')[0]);
    expect(c.tank.L).toBeCloseTo(36 * IN); expect(JSON.stringify(S)).toBe(before);
  });
  it('choosing a custom tank fits the scene to it: animals keep their relative spot', () => {
    const S = ex('planted'), f0 = structuredClone(S.fish[0]), T0 = structuredClone(S.tank);
    const { entry } = addCustomTank([], spec({ rim: false }), 1);
    chooseCustom(S, entry);
    expect(S.tank).toMatchObject({ L: 36 * IN, D: 18 * IN, H: 16 * IN });
    expect(S.render.rim).toBe(false);
    expect(S.product).toBeUndefined();
    const want = mapToTank(T0, S.tank, f0);
    expect(S.fish[0].x).toBeCloseTo(want.x, 0);
  });
});

describe('summaries', () => {
  it('each group folds to one line', () => {
    const S = defaultSetup();
    expect(sitsOnSummary(S, 'in')).toBe('Cabinet, black');
    expect(lidSummary(S)).toBe('Open');
    S.wall.show = true; S.person.show = true;
    expect(roomSummary(S, 'in')).toBe('Wall behind · 8 ft ceiling · you, 5 ft 9 in');
  });
  it('groups remember open / closed per browser; Tank model open and the picker groups closed at first', () => {
    const st = fake();
    expect(loadGroups(st)).toEqual(GROUP_DEFAULT);
    expect(GROUP_DEFAULT).toMatchObject({ model: true, custom: false, commercial: false });
    saveGroups({ ...GROUP_DEFAULT, room: true }, st);
    expect(loadGroups(st).room).toBe(true);
  });
});

describe('custom tank maker', () => {
  it('starts from: the setup (new), a commercial copy named after it, or the library entry (edit)', () => {
    const S = defaultSetup(), r = firstCommercial(S);
    chooseCommercial(S, r.opt!);
    const copy = startSpec(S, 'copy', []);
    expect(copy.libId).toBeUndefined();
    expect(copy.spec.name).toMatch(/^Custom .* \(from .+\)$/);
    expect(copy.spec.tank).toEqual(S.tank);
    const fresh = startSpec(S, 'new', []);
    expect(fresh.spec).toMatchObject({ rim: false, glass: 'auto', tank: { L: S.tank.L, D: S.tank.D, H: S.tank.H } });
    expect(fresh.spec.tank.shape).toBeUndefined(); // a box
    const B = defaultSetup(); B.tank = { ...B.tank, shape: 'bow', bowMin: B.tank.D * 0.7 };
    expect(startSpec(B, 'new', []).spec.tank.shape).toBeUndefined();
    expect(SHAPE_MAIN).toEqual(['rect', 'pie', 'round']); expect(SHAPE_MORE[0]).toBe('bow');
    const { lib, entry } = addCustomTank([], spec(), 1), T = defaultSetup();
    chooseCustom(T, entry);
    expect(startSpec(T, 'edit', lib)).toMatchObject({ libId: entry.id, spec: { name: 'Den 40' } });
  });
  it('the scratch setup is an empty tank on a plain floor: no water, ground, stand, wall, person, animals or pieces', () => {
    const S = makerSetup(spec(), ex('planted'));
    expect(S.fish).toEqual([]); expect(S.items).toEqual([]);
    expect(S.water.level).toBe(0); expect(S.substrate.show).toBe(false);
    expect(S.stand.show).toBe(false); expect(S.wall.show).toBe(false); expect(S.person.show).toBe(false);
    expect(S.render.bg).toBe('none'); expect(S.product).toBeUndefined();
  });
  it('facts: gallons, filled pounds and footprint of a 48 x 18 x 21 in tank', () => {
    const f = makerFacts(spec({ tank: { L: 48 * IN, D: 18 * IN, H: 21 * IN } }), 'in');
    expect(f.gross).toBeCloseTo(78.5, 0);
    expect(f.water).toBeLessThan(f.gross);
    expect(f.lb).toBeGreaterThan(600); expect(f.lb).toBeLessThan(900);
    expect(f.footprint).toMatch(/^48\.\d × 18\.\d in$/);
    expect(f.L).toBe('48 in');
  });
  it('price: the estimate says how, and names what it does not count yet', () => {
    const p = priceView(spec({ rim: false, glassType: 'lowiron', tank: { L: 48 * IN, D: 18 * IN, H: 24 * IN, shape: 'bow', bowMin: 13 * IN } }));
    expect(p.estimate).toBeGreaterThan(0);
    expect(p.how).toMatch(/typical price of a stock \d+ gal tank/);
    expect(p.how).toMatch(/bow shape.*glass thickness.*low-iron.*rimless/);
    expect(p.own).toBe(false);
    expect(priceView(spec({ priceUsd: 520 })).own).toBe(true);
    expect(specChanged(spec(), spec({ priceUsd: 520 }))).toBe(true);
  });
  it('text helpers: glass as US fractions, sizes L x D x H', () => {
    expect(glassText(3 / 8 * IN, 'in')).toBe('3/8 in');
    expect(glassText(1 / 2 * IN, 'in')).toBe('1/2 in');
    expect(glassText(10, 'cm')).toBe('10 mm');
    expect(dims({ L: 36 * IN, D: 18 * IN, H: 16 * IN }, 'in')).toBe('36 × 18 × 16 in');
  });
});

describe('glass panel (GS1)', () => {
  it('rimless 48 x 24 x 24 in: free top, brace table of three rows, SF met, joints and disclaimer', () => {
    const p = glassPanel({ L: 48 * IN, D: 24 * IN, H: 24 * IN }, false, defaultChoice(), 'in');
    expect(p.supported).toBe(true); expect(p.top).toBe('free');
    expect(p.braces.map(b => b.kind)).toEqual(['none', 'perimeter', 'cross']);
    expect(p.braces[0].cost).toBe(100);
    expect(p.braces.find(b => b.on)?.kind).toBe('none');
    expect(p.panes[0].thickness).toBe('5/8 in');
    expect(p.sfOk).toBe(true);
    expect(p.joints.length).toBeGreaterThan(0);
    expect(p.use?.build.panes.front).toBeCloseTo(5 / 8 * IN);
    expect(DISCLAIMER).toMatch(/not an engineering approval/);
  });
  it('a brace thins the walls (perimeter + cross cheaper than none)', () => {
    const p = glassPanel({ L: 48 * IN, D: 24 * IN, H: 24 * IN }, false, { ...defaultChoice(), brace: 'cross', mode: 'perPane' }, 'in');
    const on = p.braces.find(b => b.on)!;
    expect(on.kind).toBe('cross'); expect(on.cost).toBeLessThan(100);
    expect(p.use!.build.brace?.cross).toBeGreaterThan(0);
  });
  it('rimmed 75 gal (48 x 18 x 21 in outer): the trim holds the top, 3/8 in like framed 75s, no brace table', () => {
    const m = getTankModel('g75')!;
    const T = { L: m.outer.L - 2 * m.glassMm, D: m.outer.D - 2 * m.glassMm, H: m.outer.H - m.glassMm };
    const p = glassPanel(T, true, defaultChoice(), 'in');
    expect(p.top).toBe('held'); expect(p.braces).toEqual([]);
    expect(p.panes[0].thickness).toBe('3/8 in');
    const free = glassPanel(T, false, defaultChoice(), 'in');
    expect(free.panes[0].mm!).toBeGreaterThan(p.panes[0].mm!); // rimless needs thicker glass
  });
  it('non-box shapes: the check says it covers box tanks only', () => {
    const p = glassPanel({ L: 48 * IN, D: 18 * IN, H: 24 * IN, shape: 'bow', bowMin: 13 * IN }, false, defaultChoice(), 'in');
    expect(p.supported).toBe(false); expect(p.reason).toMatch(/box tanks/);
  });
  it('solver: topEdge held is the simply supported top (thinner than free), a brace still wins', () => {
    const s = { L: 48 * IN_MM, D: 18 * IN_MM, H: 21 * IN_MM };
    const held = solveGlass(s, { topEdge: 'held' }), free = solveGlass(s);
    expect(held.panes.front.required).toBeLessThan(free.panes.front.required);
    expect(held.panes.front.required / IN_MM).toBeCloseTo(0.373, 1);
    const br = { width: 2 * IN_MM, thickness: 3 / 8 * IN_MM };
    expect(solveGlass(s, { topEdge: 'held', brace: br }).panes.front.required).toBeCloseTo(solveGlass(s, { brace: br }).panes.front.required, 6);
  });
});

describe('custom tank glass build (P9 spec + GS1)', () => {
  it('saved, round-tripped through the library, bumps the version, junk dropped', () => {
    const p = glassPanel({ L: 36 * IN, D: 18 * IN, H: 16 * IN }, false, defaultChoice(), 'in');
    const st = fake();
    let { lib, entry } = addCustomTank([], spec({ rim: false }), 1);
    const e2 = editCustomTank(lib, entry.id, { glass: p.use!.glass, glassBuild: p.use!.build }, 2);
    lib = e2.lib;
    expect(e2.entry!.version).toBe(2);
    saveLibrary(lib, st);
    expect(loadLibrary(st)[0].glassBuild).toEqual(p.use!.build);
    expect(parseSpec({ ...spec(), glassBuild: { panes: { front: 'x' }, safetyFactor: 3.8 } })?.glassBuild).toBeUndefined();
    expect(parseSpec(spec())?.glassBuild).toBeUndefined();
  });
});
