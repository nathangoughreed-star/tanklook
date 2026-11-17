// Lane S7 (2026-11-14; UI2 §7 step 7): the Scape and Plants view-models and edits (src/shell/logic/scape.ts, plants.ts).
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { LIBRARY } from '../src/scene/items';
import { isLocked } from '../src/scene/locks';
import * as SC from '../src/shell/logic/scape';
import * as PL from '../src/shell/logic/plants';

const mk = () => new Store();

describe('Substrate', () => {
  it('bare bottom turns the substrate and custom terrain off; a type brings it back', () => {
    const st = mk();
    SC.setTerrainOn(st, true);
    expect(st.tank.terrain.on).toBe(true);
    SC.setSubstrateType(st, 'bare');
    expect(st.tank.substrate.show).toBe(false); expect(st.tank.terrain.on).toBe(false);
    expect(SC.substrateView(st.tank, 'in').type).toBe('bare');
    SC.setSubstrateType(st, 'pea');
    expect(st.tank.substrate).toMatchObject({ show: true, type: 'pea' });
    expect(SC.substrateView(st.tank, 'in').type).toBe('pea');
  });
  it('slope presets set the four corner depths (capped at half the height) and read back as active', () => {
    const st = mk();
    SC.slopePreset(st, 'fb');
    const q = st.tank.substrate, max = st.tank.tank.H * 0.5;
    expect(q.fl).toBeCloseTo(Math.min(25.4, max)); expect(q.bl).toBeCloseTo(Math.min(76.2, max));
    const v = SC.substrateView(st.tank, 'in');
    expect(v.slopes.find(s => s.id === 'fb')!.active).toBe(true);
    expect(v.slopes.filter(s => s.active).length).toBe(1);
  });
  it('custom blend, roughness and litter edits land in the scene', () => {
    const st = mk();
    SC.setSubstrateType(st, 'custom');
    expect(SC.substrateView(st.tank, 'in').custom).toBe(true);
    SC.addBlendGrain(st); SC.setBlendGrain(st, 1, 'sand'); SC.setBlendMix(st, 40); SC.setBlendColor(st, 0, '#112233');
    expect(st.tank.substrate.custom).toMatchObject({ mix: 0.4, grains: [{ color: '#112233' }, { grain: 'sand' }] });
    SC.setBlendShare(st, 1, 30); expect(st.tank.substrate.custom.grains.map(g => g.share)).toEqual([70, 30]);
    SC.addBlendGrain(st); SC.addBlendGrain(st); SC.addBlendGrain(st); SC.addBlendGrain(st); // 5 at most
    expect(st.tank.substrate.custom.grains.length).toBe(5); expect(st.tank.substrate.custom.grains.reduce((a, g) => a + g.share, 0)).toBe(100);
    SC.removeBlendGrain(st, 4); SC.removeBlendGrain(st, 3); SC.removeBlendGrain(st, 2); SC.removeBlendGrain(st, 1); SC.removeBlendGrain(st, 0);
    expect(st.tank.substrate.custom.grains).toHaveLength(1); expect(st.tank.substrate.custom.grains[0].share).toBe(100); // never fewer than one
    SC.setRough(st, 20); expect(SC.substrateView(st.tank, 'in').roughText).toBe('20 %');
    expect(SC.substrateView(st.tank, 'in').litter.on).toBe(false);
    SC.setLitterLeaf(st, 'oak'); expect(st.tank.substrate.litter).toMatchObject({ leaf: 'oak', density: 40 });
    const s0 = st.tank.substrate.litter!.seed; SC.shuffleLitter(st); expect(st.tank.substrate.litter!.seed).not.toBe(s0);
  });
});

describe('Terrain', () => {
  it('starts closed (off), custom terrain samples the floor, flatten levels it, pools add / edit / remove', () => {
    const st = mk();
    expect(SC.terrainView(st.tank, 0)).toMatchObject({ on: false, pools: 0, summary: 'slopes' });
    SC.setTerrainOn(st, true);
    const t = SC.terrainView(st.tank, 0);
    expect(t.on).toBe(true); expect(t.hasGrid).toBe(true);
    SC.setTerrainCols(st, 7); expect(st.tank.terrain.cols).toBe(7);
    SC.flattenTerrain(st); expect(new Set(st.tank.terrain.h).size).toBe(1);
    SC.addPool(st); expect(st.tank.terrain.pools!.length).toBe(1);
    SC.setPoolField(st, 0, 'rx', 30); expect(st.tank.terrain.pools![0].rx).toBeCloseTo(0.3);
    expect(SC.terrainView(st.tank, 0).poolFields.find(f => f.key === 'rx')!.text).toBe('30 %');
    SC.removePool(st, 0); expect(st.tank.terrain.pools!.length).toBe(0);
    SC.setTerrainOn(st, false); expect(st.tank.terrain.on).toBe(false);
  });
});

describe('Hardscape and Decor library', () => {
  it('lists stones, wood, caves and decor; search narrows; corals are for saltwater only', () => {
    const st = mk();
    const all = SC.libraryView(st.tank, 'hardscape', '');
    expect(all.rows.map(r => r.kind)).toEqual(expect.arrayContaining(['stone', 'wood', 'cave', 'ornament']));
    expect(all.rows.every(r => r.chips.every(c => LIBRARY[c.id].kind === r.kind))).toBe(true);
    const q = SC.libraryView(st.tank, 'hardscape', 'seiryu');
    expect(q.shown).toBeGreaterThan(0); expect(q.shown).toBeLessThan(all.shown);
    expect(SC.libraryView(st.tank, 'hardscape', 'zzzzqq').none).toMatch(/Nothing/);
    expect(SC.libraryView(st.tank, 'plants', '').rows.some(r => r.kind === 'coral')).toBe(false);
  });
});

describe('Placed pieces', () => {
  it('add selects, rows group by species, remove / duplicate / remove all work, each one undo step', () => {
    const st = mk();
    const a = SC.addPiece(st, 'river')!, b = SC.addPiece(st, 'river')!, c = SC.addPiece(st, 'branch')!;
    expect(new Set([a, b, c]).size).toBe(3);
    const pv = SC.placedView(st.tank, 'hardscape', st.selItem, new Set());
    expect(pv.total).toBe(3); expect(pv.groups.map(g => g.rows.length).sort()).toEqual([1, 2]);
    expect(pv.groups.find(g => g.rows.length === 2)!.open).toBe(false);
    expect(pv.groups.find(g => g.rows.length === 1)!.rows[0].selected).toBe(true);
    SC.duplicatePiece(st, a); expect(st.tank.items.length).toBe(4);
    SC.removePiece(st, b); expect(st.tank.items.length).toBe(3);
    SC.clearPieces(st, 'hardscape'); expect(st.tank.items.length).toBe(0);
    st.undo(); expect(st.tank.items.length).toBe(3);
  });
  it('hardscape and plants are separate menus', () => {
    const st = mk(); SC.addPiece(st, 'river'); SC.addPiece(st, 'fern');
    expect(SC.placedView(st.tank, 'hardscape', null, new Set()).total).toBe(1);
    expect(SC.placedView(st.tank, 'plants', null, new Set()).total).toBe(1);
    SC.clearPieces(st, 'plants'); expect(st.tank.items.map(i => i.variant)).toEqual(['river']);
  });
  it('Keep locks the piece by uid, with its identity props (it may still move); a second press releases', () => {
    const st = mk(); const id = SC.addPiece(st, 'river')!, it = () => st.tank.items.find(x => x.id === id)!;
    expect(it().uid).toBeTruthy(); expect(SC.isKept(st.tank, it())).toBe(false);
    expect(SC.toggleKeep(st, id)).toBe(true);
    expect(isLocked(st.tank, it().uid!)).toBe(true);
    expect(st.tank.locks!.objects.find(o => o.target === it().uid)!.props).toEqual([...SC.KEEP_PROPS]);
    expect(SC.placedView(st.tank, 'hardscape', null, new Set()).groups[0].rows[0].kept).toBe(true);
    expect(SC.toggleKeep(st, id)).toBe(false); expect(SC.isKept(st.tank, it())).toBe(false);
  });
});

describe('Piece editor', () => {
  it('shows the sliders of its kind: stones size, plants growth, clumps spread + stems, decor position', () => {
    const st = mk();
    const r = SC.addPiece(st, 'river')!, f = SC.addPiece(st, 'stem')!, o = SC.addPiece(st, 'castle')!, fl = SC.addPiece(st, 'salvinia')!;
    const view = (id: number) => SC.pieceView(st.tank, st.tank.items.find(x => x.id === id)!, 'in');
    const ids = (id: number) => view(id).fields.map(x => x.id);
    expect(ids(r)).toEqual(expect.arrayContaining(['iSize', 'iYaw', 'iPitch', 'iTilt', 'iLift'])); expect(ids(r)).not.toContain('iGrowth');
    expect(ids(f)).toEqual(expect.arrayContaining(['iGrowth', 'iSpread', 'iStems'])); expect(ids(f)).not.toContain('iSize');
    expect(ids(o)).toEqual(expect.arrayContaining(['iX', 'iDepth']));
    expect(ids(fl)).toContain('iDens');
    expect(view(r).nudge).toBe(true); expect(view(f).nudge).toBe(false);
  });
  it('a slider edit goes through ITEM_FIELDS and clamps; a drag is one undo step', () => {
    const st = mk(); const id = SC.addPiece(st, 'river')!, it = () => st.tank.items.find(x => x.id === id)!;
    st.seal();
    const y0 = it().yaw;
    SC.setField(st, id, 'iYaw', 30); SC.setField(st, id, 'iYaw', 45); st.seal();
    expect(it().yaw).toBe(45);
    st.undo(); expect(it().yaw).toBe(y0);
    SC.setField(st, id, 'iX', 1e9); expect(it().x).toBeLessThanOrEqual(st.tank.tank.L);
    SC.setField(st, id, 'nope', 1);
  });
  it('nudge steps the piece; drop sets it on the ground; reshape changes the seed', () => {
    const st = mk(); const id = SC.addPiece(st, 'river')!, it = () => st.tank.items.find(x => x.id === id)!;
    SC.nudgePiece(st, id, 'y', 1, 20); expect(it().lift).toBeGreaterThan(0);
    SC.dropPiece(st, id); expect(it().lift).toBe(0);
    const x0 = it().x; SC.nudgePiece(st, id, 'x', 1, 5); expect(it().x).not.toBe(x0);
    const s0 = it().seed; SC.reshapePiece(st, id); expect(it().seed).not.toBe(s0);
  });
});

describe('Brush and group bars', () => {
  it('brush view follows the store; picking a brush clamps the size into its range', () => {
    const st = mk();
    SC.brushOn(st, true); expect(SC.brushView(st, 'in').on).toBe(true);
    SC.pickBrush(st, 'gravel'); const v = SC.brushView(st, 'in');
    expect(v).toMatchObject({ id: 'gravel', label: 'Gravel' }); expect(v.size).toBeGreaterThanOrEqual(v.sizeMin); expect(v.size).toBeLessThanOrEqual(v.sizeMax);
    expect(v.groups[1].options.length).toBeGreaterThan(3);
    SC.brushOn(st, false); expect(st.brush.on).toBe(false);
  });
  it('the group bar shows for two or more; duplicate / turn / size / delete act on the group', () => {
    const st = mk(); const a = SC.addPiece(st, 'river')!, b = SC.addPiece(st, 'branch')!;
    expect(SC.groupBarView(st.group).show).toBe(false);
    st.selectGroup({ fish: [], items: [a, b] });
    expect(SC.groupBarView(st.group)).toMatchObject({ show: true, n: 2, text: '2 pieces' });
    const y0 = st.tank.items.map(i => i.yaw); SC.groupTurn(st, 15);
    expect(st.tank.items.map(i => i.yaw)).not.toEqual(y0);
    const s0 = st.tank.items[0].size; SC.groupSizeBy(st, 1.1); expect(st.tank.items[0].size).toBeGreaterThan(s0);
    const r = SC.groupDuplicate(st); expect('made' in r).toBe(true); expect(st.tank.items.length).toBe(4);
    SC.groupDelete(st); expect(st.tank.items.length).toBe(2); expect(st.groupCount).toBe(0);
  });
});

describe('Plants library and gate', () => {
  it('with the gate off nothing is greyed; with light and care chosen, unsuitable plants are greyed with a reason', () => {
    const st = mk();
    st.edit(s => { s.layout.fit = 'low'; s.layout.careSet = true; s.grow.feed = 'low'; });
    expect(PL.plantLibrary(st.tank, '').greyed).toBe(0);
    PL.setPlantsGate(st, true);
    const lib = PL.plantLibrary(st.tank, '');
    expect(lib.gate.active).toBe(true);
    expect(lib.greyed).toBeGreaterThan(0);
    const grey = lib.rows.flatMap(r => r.chips).filter(c => c.why);
    expect(grey.every(c => c.why.length > 5)).toBe(true);
    // greyed chips sink below the rest of their row
    for (const r of lib.rows) { const i = r.chips.findIndex(c => c.why); if (i >= 0) expect(r.chips.slice(i).every(c => c.why)).toBe(true); }
    // advice only: a greyed plant can still be added
    expect(SC.addPiece(st, grey[0].id)).not.toBeNull();
  });
  it('the experience input is passed through: chosen = false says what is missing and greys nothing', () => {
    const st = mk(); PL.setPlantsGate(st, true);
    st.edit(s => { s.layout.fit = 'low'; });
    const lib = PL.plantLibrary(st.tank, '', false);
    expect(lib.gate.active).toBe(false); expect(lib.gate.hint).toMatch(/care level/); expect(lib.greyed).toBe(0);
    expect(PL.plantLibrary(st.tank, '', true).gate.active).toBe(true);
    PL.setPlantsGate(st, false); expect(st.tank.layout.gatePlants).toBeUndefined();
  });
  it('search narrows the plants', () => {
    const st = mk();
    const all = PL.plantLibrary(st.tank, ''), q = PL.plantLibrary(st.tank, 'anubias');
    expect(q.shown).toBeGreaterThan(0); expect(q.shown).toBeLessThan(all.shown);
  });
});

describe('Growth over time', () => {
  const planted = () => { const st = mk(); SC.addPiece(st, 'fern'); SC.addPiece(st, 'stem'); return st; };
  const sync = { raf: (f: () => void) => { f(); return 0; }, cancel: () => {} };
  it('with no plants the view says so and is disabled', () => {
    const st = mk(), g = PL.createGrowth(st, () => {}, sync);
    expect(PL.growthView(st.tank, g.state)).toMatchObject({ plants: 0, disabled: 'No plants to grow' });
    g.dispose();
  });
  it('moving Time grows every plant; the keep / undo question appears at rest; Undo puts the plants back, Keep is one undo step', () => {
    const st = planted(), g = PL.createGrowth(st, () => {}, sync);
    const before = st.tank.items.map(i => i.growth);
    g.move(100); g.release();
    const v = PL.growthView(st.tank, g.state);
    expect(v.ask).toBe(true); expect(v.time).toBe(100);
    // every plant has a growth of its own now; daughters born by Time 100 % are plants too
    expect(st.tank.items.every(i => i.growth != null)).toBe(true); expect(st.tank.items.length).toBeGreaterThanOrEqual(2);
    g.undo();
    expect(st.tank.items.map(i => i.growth)).toEqual(before);
    expect(PL.growthView(st.tank, g.state).ask).toBe(false);
    g.move(60); g.release(); const grown = st.tank.items.map(i => i.growth);
    g.keep();
    expect(st.tank.items.map(i => i.growth)).toEqual(grown);
    expect(PL.growthView(st.tank, g.state).ask).toBe(false);
    st.undo(); expect(st.tank.items.map(i => i.growth)).toEqual(before);
    g.dispose();
  });
  it('feeding changes the speed: more feeding grows further in the same Time', () => {
    const a = planted(), b = planted();
    const ga = PL.createGrowth(a, () => {}, sync), gb = PL.createGrowth(b, () => {}, sync);
    ga.setFeed('low'); gb.setFeed('co2');
    ga.move(30); gb.move(30);
    const sum = (s: Store) => s.tank.items.reduce((n, i) => n + (i.growth ?? 0), 0);
    expect(sum(b)).toBeGreaterThan(sum(a));
    ga.dispose(); gb.dispose();
  });
});
