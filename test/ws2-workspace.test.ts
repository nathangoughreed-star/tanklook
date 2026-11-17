// Lane WS2 (2026-11-16; R111 build step 1): the workspace shell pure parts (src/shell/logic/workspace.ts) and the Scape tiles.
import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { LIBRARY } from '../src/scene/items';
import * as SC from '../src/shell/logic/scape';
import * as WS from '../src/shell/logic/workspace';

const mk = () => new Store();

describe('which rail sections open a workspace', () => {
  it('Scape does; every other section keeps its panel for now', () => {
    expect(WS.isWorkspace('scape')).toBe(true);
    for (const id of ['tank', 'plants', 'animals', 'equipment', 'preferences', 'constraints', 'discover', 'print', 'settings'] as const) expect(WS.isWorkspace(id)).toBe(false);
    expect(WS.isWorkspace(null)).toBe(false);
  });
});

describe('layout switch', () => {
  it('stacks at phone width (<= 699 px) and sits side by side from 700 px', () => {
    expect(WS.workspaceLayout(390)).toBe('stack'); expect(WS.workspaceLayout(699)).toBe('stack');
    expect(WS.workspaceLayout(700)).toBe('side'); expect(WS.workspaceLayout(1280)).toBe('side');
  });
});

describe('visit: entering, Revert this visit', () => {
  it('a fresh visit is clean; edits make it dirty; Revert puts the entry scene and the undo stack back', () => {
    const st = mk();
    st.edit(s => { s.substrate.rough = 11; });   // something before the visit: its undo step must survive the revert
    const before = JSON.stringify(st.scene), mark = st.mark;
    const v = WS.enterVisit(st);
    expect(WS.visitDirty(st, v)).toBe(false);
    SC.addPiece(st, 'seiryu'); SC.addPiece(st, 'branch'); SC.slopePreset(st, 'fb'); SC.setSubstrateType(st, 'pea');
    expect(st.tank.items.length).toBe(2);
    expect(WS.visitDirty(st, v)).toBe(true);
    WS.revertVisit(st, v);
    expect(JSON.stringify(st.scene)).toBe(before);
    expect(st.mark).toBe(mark); expect(st.canRedo).toBe(false);
    expect(WS.visitDirty(st, v)).toBe(false);
    st.undo(); expect(st.tank.substrate.rough).not.toBe(11);   // the pre-visit step is still in history
  });
  it('undoing back to the entry point counts as clean, and Revert then does nothing', () => {
    const st = mk(), v = WS.enterVisit(st);
    SC.addPiece(st, 'seiryu'); expect(WS.visitDirty(st, v)).toBe(true);
    st.undo(); expect(WS.visitDirty(st, v)).toBe(false);
    const rev = st.rev; WS.revertVisit(st, v); expect(st.rev).toBe(rev);
  });
  it('Revert also drops steps undone inside the visit (redo stack back to entry)', () => {
    const st = mk(); SC.addPiece(st, 'seiryu'); st.undo();
    const v = WS.enterVisit(st);   // entry state: nothing placed, one redo step waiting
    SC.addPiece(st, 'lace'); WS.revertVisit(st, v);
    expect(st.tank.items.length).toBe(0); expect(st.canRedo).toBe(true);
  });
});

describe('tiles', () => {
  it('a tile adds exactly what the old chip did: the same addPiece edit, one undo step', () => {
    const st = mk(), t = WS.scapeTiles(st.tank, 'stone', '').groups[0].tiles[0], m0 = st.mark;
    const id = SC.addPiece(st, t.id);
    expect(id).not.toBeNull(); expect(st.tank.items.at(-1)!.variant).toBe(t.id); expect(st.mark).toBe(m0 + 1);
    st.undo(); expect(st.tank.items.length).toBe(0);
  });
  it('the four tabs list the hardscape kinds; the old library had the same ids', () => {
    const st = mk(), old = SC.libraryView(st.tank, 'hardscape', '');
    const ids = (l: { id: string }[]) => l.map(x => x.id).sort();
    const tiles = WS.SCAPE_TABS.flatMap(t => WS.scapeTiles(st.tank, t.id, '').groups.flatMap(g => g.tiles));
    expect(ids(tiles)).toEqual(ids(old.rows.flatMap(r => r.chips)));
    expect(WS.scapeTiles(st.tank, 'wood', '').groups.map(g => g.kind)).toEqual(['wood']);
  });
  it('search shows every kind that matches, whatever tab is open', () => {
    const st = mk(), r = WS.scapeTiles(st.tank, 'wood', 'limestone');
    expect(r.groups.every(g => g.kind === 'stone')).toBe(true); expect(r.shown).toBeGreaterThan(0);
    expect(WS.scapeTiles(st.tank, 'stone', 'zzzzqq').none).toMatch(/matches/);
  });
  it('placed counts show on the tile', () => {
    const st = mk(); SC.addPiece(st, 'seiryu'); SC.addPiece(st, 'seiryu');
    const t = WS.scapeTiles(st.tank, 'stone', '').groups[0].tiles.find(x => x.id === 'seiryu');
    expect(t?.count ?? 0).toBe(2);
  });
  it('limestone is flagged for soft-water animals, wood tannins for hard-water ones, and neither without them', () => {
    const st = mk(); st.tank.fish.length = 0;
    expect(WS.effectOf(st.tank, 'holey')).toMatchObject({ why: '', pills: [{ text: 'Raises pH + hardness', tone: 'neutral' }] });
    st.tank.fish.push({ id: 1, species: 'neon' } as never);
    const e = WS.effectOf(st.tank, 'holey');
    expect(e.why).toMatch(/like soft water/); expect(e.pills[0].tone).toBe('warn');
    st.tank.fish.length = 0; st.tank.fish.push({ id: 2, species: 'cajundwarf' } as never);
    const wood = Object.keys(LIBRARY).find(k => LIBRARY[k].kind === 'wood' && WS.effectOf(st.tank, k).pills[0]?.text === 'Tannins')!;
    expect(WS.effectOf(st.tank, wood).why).toMatch(/need hard water/);
    // flagged tiles sink below the rest
    st.tank.fish.length = 0; st.tank.fish.push({ id: 3, species: 'neon' } as never);
    const tiles = WS.scapeTiles(st.tank, 'stone', '').groups[0].tiles;
    const firstFlag = tiles.findIndex(t => t.why); expect(firstFlag).toBeGreaterThan(-1);
    expect(tiles.slice(firstFlag).every(t => t.why)).toBe(true);
  });
});

describe('facts box', () => {
  it('floor cover grows with the pieces; water effect names them; the tray groups by variant', () => {
    const st = mk(); st.tank.fish.length = 0;
    expect(WS.scapeFacts(st.tank)).toMatchObject({ total: 0, chem: 'None' });
    SC.addPiece(st, 'holey'); SC.addPiece(st, 'holey');
    const f = WS.scapeFacts(st.tank);
    expect(f.total).toBe(2); expect(f.cover).toBeGreaterThan(0); expect(f.cover).toBeLessThan(100);
    expect(f.chem).toMatch(/hardness/); expect(f.tray).toEqual([{ id: 'holey', label: LIBRARY.holey.label, n: 2, kind: 'stone' }]);
    SC.addPiece(st, 'holey'); expect(WS.scapeFacts(st.tank).cover).toBeGreaterThan(f.cover);
  });
});

describe('cross-section', () => {
  it('follows the corner depths front to back, and bare bottom is flat', () => {
    const st = mk(); SC.setSubstrateType(st, 'pea');
    SC.setCorner(st, 'fl', 25.4); SC.setCorner(st, 'fr', 25.4); SC.setCorner(st, 'bl', 76.2); SC.setCorner(st, 'br', 76.2);
    const cs = WS.crossSection(st.tank, 'in');
    expect(cs.front).toBeCloseTo(25.4, 0); expect(cs.back).toBeCloseTo(76.2, 0);
    expect(cs.frontText).toMatch(/^1.0/); expect(cs.ground.length).toBe(33); expect(cs.gridText).toBe('1 square = 1 in');
    SC.setSubstrateType(st, 'bare'); expect(WS.crossSection(st.tank, 'in').ground.every(g => g === 0)).toBe(true);
  });
});
