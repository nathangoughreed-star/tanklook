import { describe, expect, it } from 'vitest';
import { SPECIES, getSpecies, searchSpecies } from '../src/data/species';
import { defaultScene } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { SCENE_VERSION } from '../src/scene/types';
import { SceneError, parseScene } from '../src/scene/validate';

describe('parseScene', () => {
  it('round-trips the default scene unchanged', () => {
    const s = defaultScene();
    expect(parseScene(JSON.parse(JSON.stringify(s))).scene).toEqual(s);
  });
  it('migrates a Phase 1 (v1) prototype save', () => {
    const v1 = { ...defaultScene(), version: 1, render: { edge: 'soft', grid: true, rim: true, bg: 'blue', glass: '8', glassType: 'standard' } } as Record<string, unknown>;
    delete v1.name;
    const { scene, warnings } = parseScene(v1);
    expect(scene.version).toBe(SCENE_VERSION);
    expect(scene.render.glass).toBe(8);
    expect(scene.render.edge).toBe('cutout');
    expect(scene.name).toBe('My tank');
    expect(warnings.length).toBe(1);
  });
  it('rejects garbage and newer versions', () => {
    expect(() => parseScene('not json')).toThrow(SceneError);
    expect(() => parseScene({ hello: 1 })).toThrow(SceneError);
    expect(() => parseScene({ ...defaultScene(), version: 99 })).toThrow(/newer version/);
  });
  it('clamps, drops unknown species, and repairs duplicate ids', () => {
    const s = defaultScene() as unknown as Record<string, any>;
    s.tankA.L = 1e9; s.camera.zoom = 50;
    s.fish = [
      { id: 1, species: 'neon', x: -50, y: 1, depth: 1 },
      { id: 1, species: 'neon', x: 1, y: 1, depth: 99999 },
      { id: 2, species: 'kraken', x: 1, y: 1, depth: 1 },
    ];
    const { scene, warnings } = parseScene(s);
    expect(scene.tankA.L).toBe(5000);
    expect(scene.camera.zoom).toBe(4);
    expect(scene.fish.map(f => f.id)).toEqual([1, 3]);
    expect(scene.fish[0].x).toBe(0);
    expect(scene.fish[1].depth).toBe(scene.tankA.D);
    expect(warnings.join()).toMatch(/unknown species/);
  });
});

describe('stand and wall settings', () => {
  it('older files get both switched off; bad values are repaired', () => {
    const v2 = { ...defaultScene(), version: 2 } as Record<string, unknown>;
    delete v2.stand; delete v2.wall;
    const { scene } = parseScene(v2);
    expect(scene.stand.show).toBe(false); expect(scene.wall.show).toBe(false);
    const bad = { ...defaultScene(), stand: { show: true, height: 5, finish: 'gold' }, wall: { show: true, side: 'ceiling', color: 'red' } };
    const r = parseScene(bad).scene;
    expect(r.stand).toEqual({ show: true, height: 12 * 25.4, finish: 'black' });
    expect(r.wall).toEqual({ show: true, side: 'back', color: '#d8d2c6' });
  });
  it('lid defaults to open for older files and keeps valid choices', () => {
    const old = { ...defaultScene() } as Record<string, unknown>; delete old.lid;
    expect(parseScene(old).scene.lid).toBe('open');
    expect(parseScene({ ...defaultScene(), lid: 'hood' }).scene.lid).toBe('hood');
    expect(parseScene({ ...defaultScene(), lid: 'trapdoor' }).scene.lid).toBe('open');
  });
  it('person defaults off, clamps height and side', () => {
    const old = { ...defaultScene() } as Record<string, unknown>; delete old.person;
    expect(parseScene(old).scene.person).toEqual({ show: false, height: 1750, side: 'left' });
    expect(parseScene({ ...defaultScene(), person: { show: true, height: 5000, side: 'up' } }).scene.person).toEqual({ show: true, height: 2100, side: 'left' });
  });
  it('keeps a valid peninsula wall', () => {
    const s = { ...defaultScene(), wall: { show: true, side: 'right', color: '#AABBCC' } };
    expect(parseScene(s).scene.wall).toEqual({ show: true, side: 'right', color: '#aabbcc' });
  });
});

describe('Store history', () => {
  it('undo / redo restore content but keep the camera', () => {
    const st = new Store(defaultScene()), n = st.scene.fish.length;
    st.update(s => { s.fish.pop(); });
    st.update(s => { s.camera.az = 20; }, { kind: 'view' });
    st.undo();
    expect(st.scene.fish.length).toBe(n);
    expect(st.scene.camera.az).toBe(20);
    st.redo();
    expect(st.scene.fish.length).toBe(n - 1);
    expect(st.canRedo).toBe(false);
  });
  it('coalesces a continuous drag into one undo step, and seal() ends it', () => {
    const st = new Store(defaultScene()), x0 = st.scene.fish[0].x;
    for (let i = 1; i <= 10; i++) st.update(s => { s.fish[0].x = x0 + i; }, { coalesce: 'drag' });
    st.seal();
    st.update(s => { s.fish[0].x = 0; }, { coalesce: 'drag' });
    st.undo(); expect(st.scene.fish[0].x).toBe(x0 + 10);
    st.undo(); expect(st.scene.fish[0].x).toBe(x0);
    expect(st.canUndo).toBe(false);
  });
  it('camera-only changes are not undoable', () => {
    const st = new Store(defaultScene());
    st.update(s => { s.camera.zoom = 2; }, { kind: 'view' });
    expect(st.canUndo).toBe(false);
  });
  it('clears selection when the selected fish is removed', () => {
    const st = new Store(defaultScene()); st.select(st.scene.fish[0].id);
    st.update(s => { s.fish.shift(); });
    expect(st.selId).toBe(null);
  });
  it('saves to and restores from storage', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) } as Storage;
    const st = new Store(defaultScene()); st.update(s => { s.name = 'Saved'; }); st.saveLocal(storage);
    expect(Store.loadLocal(storage)?.name).toBe('Saved');
    mem.set('tanklook.scene', '{broken');
    expect(Store.loadLocal(storage)).toBe(null);
  });
});

describe('species search', () => {
  it('finds by common, scientific and partial names, case-insensitively', () => {
    expect(searchSpecies('NEON')[0].id).toBe('neon');
    expect(searchSpecies('pterophyllum')[0].id).toBe('angel');
    expect(searchSpecies('pearl gour')[0].id).toBe('gourami');
    expect(searchSpecies('cory').map(s => s.id).sort()).toEqual(['bronzecory', 'pandacory']);
    expect(searchSpecies('snail').every(s => s.kind === 'snail')).toBe(true);
    expect(searchSpecies('zzz')).toEqual([]);
    expect(searchSpecies('').length).toBe(SPECIES.length);
  });
});

describe('species data', () => {
  it('every species has a sane size, card aspect and resting offset', () => {
    expect(new Set(SPECIES.map(s => s.id)).size).toBe(SPECIES.length);
    for (const s of SPECIES) {
      expect(s.tl, s.id).toBeGreaterThanOrEqual(15); expect(s.tl, s.id).toBeLessThanOrEqual(400);
      expect(s.aspect, s.id).toBeGreaterThan(0.1); expect(s.aspect, s.id).toBeLessThan(1.6);
      // the lowest point of the drawing lies inside the card, below the centre line
      expect(s.rest, s.id).toBeGreaterThan(0); expect(s.rest, s.id).toBeLessThanOrEqual(s.aspect / 2);
    }
  });
  it('keeps the scale anchors', () => {
    expect([getSpecies('neon')!.tl, getSpecies('angel')!.tl, getSpecies('chili')!.tl, getSpecies('oscar')!.tl]).toEqual([35, 150, 18, 300]);
    expect(SPECIES.filter(s => s.zone === 'bottom').length).toBeGreaterThanOrEqual(6);
    expect(SPECIES.filter(s => s.kind === 'snail').length).toBe(4);
  });
});

describe('scene v4', () => {
  it('migrates the v3 sample plant to a layout preset', () => {
    const v3 = (show: boolean) => { const o = { ...defaultScene(), version: 3, plant: { show, x: 100, depth: 50 } } as Record<string, unknown>; delete o.layout; return o; };
    const on = parseScene(v3(true)).scene, off = parseScene(v3(false)).scene;
    expect(on.layout).toEqual({ id: 'planted', seed: 1 }); expect(off.layout.id).toBe('none');
    expect('plant' in on).toBe(false);
  });
  it('keeps a surface for snails only, defaulting to the floor', () => {
    const s = defaultScene();
    const raw = { ...s, fish: [
      { id: 1, species: 'nerite', x: 10, y: 50, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'front' },
      { id: 2, species: 'mystery', x: 10, y: 0, depth: 50, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'ceiling' },
      { id: 3, species: 'neon', x: 10, y: 50, depth: 50, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'front' },
    ] };
    const f = parseScene(raw).scene.fish;
    expect(f.map(q => q.surface)).toEqual(['front', 'floor', undefined]);
  });
});

describe('custom fish sizes', () => {
  const fish = (tl: unknown) => ({ id: 1, species: 'angel', x: 10, y: 50, depth: 50, yaw: 0, pitch: 0, roll: 0, bend: 0, tl });
  const load = (tl: unknown) => parseScene({ ...defaultScene(), fish: [fish(tl)] }).scene.fish[0];
  it('defaults to adult (no override stored)', () => {
    expect(load(undefined).tl).toBeUndefined();
    expect(load(150).tl).toBeUndefined(); // equal to the adult length
  });
  it('keeps a juvenile size and clamps to 15-130 % of adult', () => {
    expect(load(60).tl).toBe(60);
    expect(load(5).tl).toBe(Math.round(150 * 0.15));
    expect(load(900).tl).toBe(Math.round(150 * 1.3));
    expect(load('big').tl).toBeUndefined();
  });
});
