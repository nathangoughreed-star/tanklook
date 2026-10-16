import { describe, expect, it } from 'vitest';
import { SPECIES, getSpecies, searchSpecies } from '../src/data/species';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { styleGround } from '../src/scene/scapeground';
import { Store } from '../src/scene/store';
import { SCENE_VERSION, type TankSetup } from '../src/scene/types';
import { keepInWater, restsOnGround, setWaterLevel } from '../src/scene/water';
import { SWAMP_LEVEL, groundHeight, nearestLand, pieSize, radialSize, randomLand, sameGrid, ringCount, sampleTerrain, swampTerrain, terrainHeight, terrainPoints } from '../src/scene/terrain';
import { tankWeight } from '../src/scene/weight';
import { WATERLINE_GAP, spawnSnail, substrateHeight, waterK, waterY } from '../src/scene/physics';
import { SceneError, parseScene } from '../src/scene/validate';
import { bowlDims, inside, normTank } from '../src/scene/shape';

/** A v6 (pre-split) flat save built from the default setup: the shape every older file has. */
const v6 = (): Record<string, any> => { const { tank, ...rest } = structuredClone(defaultSetup()); return { version: 6, name: 'My tank', units: 'in', tankA: tank, tankB: { ...tank }, compare: false, ...rest }; };
/** Load a file and return its first tank. */
const load = (raw: unknown) => parseScene(raw).scene.tanks[0];
/** A store holding one tank. */
const storeOf = (t: TankSetup) => new Store({ ...defaultScene(), tanks: [t] });

describe('parseScene', () => {
  it('round-trips the default scene unchanged', () => {
    const s = defaultScene();
    expect(parseScene(JSON.parse(JSON.stringify(s))).scene).toEqual(s);
  });
  it('migrates a Phase 1 (v1) prototype save', () => {
    const v1 = { ...v6(), version: 1, render: { edge: 'soft', grid: true, rim: true, bg: 'blue', glass: '8', glassType: 'standard' } } as Record<string, unknown>;
    delete v1.name;
    const { scene, warnings } = parseScene(v1);
    expect(scene.version).toBe(SCENE_VERSION);
    expect(scene.tanks[0].render.glass).toBe(8);
    expect(scene.tanks[0].render.edge).toBe('cutout');
    expect(scene.name).toBe('My tank');
    expect(warnings.length).toBe(1);
  });
  it('rejects garbage and newer versions', () => {
    expect(() => parseScene('not json')).toThrow(SceneError);
    expect(() => parseScene({ hello: 1 })).toThrow(SceneError);
    expect(() => parseScene({ ...v6(), version: 99 })).toThrow(/newer version/);
  });
  it('clamps, drops unknown species, and repairs duplicate ids', () => {
    const s = v6();
    s.tankA.L = 1e9; s.camera.zoom = 50;
    s.fish = [
      { id: 1, species: 'neon', x: -50, y: 1, depth: 1 },
      { id: 1, species: 'neon', x: 1, y: 1, depth: 99999 },
      { id: 2, species: 'kraken', x: 1, y: 1, depth: 1 },
    ];
    const { scene, warnings } = parseScene(s);
    expect(scene.tanks[0].tank.L).toBe(5000);
    expect(scene.tanks[0].camera.zoom).toBe(12);
    expect(scene.tanks[0].fish.map(f => f.id)).toEqual([1, 3]);
    expect(scene.tanks[0].fish[0].x).toBe(0);
    expect(scene.tanks[0].fish[1].depth).toBe(scene.tanks[0].tank.D);
    expect(warnings.join()).toMatch(/unknown species/);
  });
});

describe('custom terrain from a bare bottom (audit #14)', () => {
  it('starts from the substrate corner depths, not a zero-thickness floor', () => {
    const s = defaultSetup(); s.substrate.show = false;
    const t = sampleTerrain(s, s.tank, 6);
    expect(Math.min(...t.h)).toBeGreaterThan(20);
    expect(Math.max(...t.h)).toBeCloseTo(s.substrate.bl, 0);
  });
});

describe('swamp layout (audit #15)', () => {
  it('shows its substrate, so the Substrate panel matches the land you see', () => {
    const st = new Store(defaultScene());
    st.edit(s => { s.substrate.show = false; s.layout.id = 'swamp'; styleGround(s); });
    expect(st.tank.substrate.show).toBe(true);
  });
});

describe('stand and wall settings', () => {
  it('a new tank starts on a stand (audit #29)', () => {
    expect(defaultSetup().stand.show).toBe(true);
  });
  it('older files get both switched off; bad values are repaired', () => {
    const v2 = { ...v6(), version: 2 } as Record<string, unknown>;
    delete v2.stand; delete v2.wall;
    const { scene } = parseScene(v2);
    expect(scene.tanks[0].stand.show).toBe(false); expect(scene.tanks[0].wall.show).toBe(false);
    const bad = { ...v6(), stand: { show: true, height: 5, finish: 'gold' }, wall: { show: true, side: 'ceiling', color: 'red' } };
    const r = load(bad);
    expect(r.stand).toMatchObject({ show: true, height: 12 * 25.4, finish: 'black', style: 'cabinet' });
    expect(r.wall).toEqual({ show: true, side: 'back', color: '#d8d2c6' });
  });
  it('lid defaults to open for older files and keeps valid choices', () => {
    const old = v6() as Record<string, unknown>; delete old.lid;
    expect(load(old).lid).toBe('open');
    expect(load({ ...v6(), lid: 'hood' }).lid).toBe('hood');
    expect(load({ ...v6(), lid: 'trapdoor' }).lid).toBe('open');
  });
  it('person defaults off, clamps height and side', () => {
    const old = v6() as Record<string, unknown>; delete old.person;
    expect(load(old).person).toEqual({ show: false, height: 1750, side: 'left' });
    expect(load({ ...v6(), person: { show: true, height: 5000, side: 'up' } }).person).toEqual({ show: true, height: 2100, side: 'left' });
  });
  it('keeps a valid peninsula wall', () => {
    const s = { ...v6(), wall: { show: true, side: 'left', color: '#AABBCC' } };
    expect(load(s).wall).toEqual({ show: true, side: 'left', color: '#aabbcc' });
  });
});

describe('Store history', () => {
  it('undo / redo restore content but keep the camera', () => {
    const st = new Store(defaultScene()), n = st.tank.fish.length;
    st.edit(s => { s.fish.pop(); });
    st.cam(c => { c.az = 20; });
    st.undo();
    expect(st.tank.fish.length).toBe(n);
    expect(st.tank.camera.az).toBe(20);
    st.redo();
    expect(st.tank.fish.length).toBe(n - 1);
    expect(st.canRedo).toBe(false);
  });
  it('coalesces a continuous drag into one undo step, and seal() ends it', () => {
    const st = new Store(defaultScene()), x0 = st.tank.fish[0].x;
    for (let i = 1; i <= 10; i++) st.edit(s => { s.fish[0].x = x0 + i; }, { coalesce: 'drag' });
    st.seal();
    st.edit(s => { s.fish[0].x = 0; }, { coalesce: 'drag' });
    st.undo(); expect(st.tank.fish[0].x).toBe(x0 + 10);
    st.undo(); expect(st.tank.fish[0].x).toBe(x0);
    expect(st.canUndo).toBe(false);
  });
  it('camera-only changes are not undoable', () => {
    const st = new Store(defaultScene());
    st.cam(c => { c.zoom = 2; });
    expect(st.canUndo).toBe(false);
  });
  it('clears selection when the selected fish is removed', () => {
    const st = new Store(defaultScene()); st.select(st.tank.fish[0].id);
    st.edit(s => { s.fish.shift(); });
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
    expect(searchSpecies('cory').map(s => s.id).sort()).toEqual(['bronzecory', 'pandacory', 'pygmycory']);
    expect(searchSpecies('snail').every(s => s.kind === 'snail')).toBe(true);
    expect(searchSpecies('zzz')).toEqual([]);
    expect(searchSpecies('').length).toBe(SPECIES.length);
  });
});

describe('species data', () => {
  it('every species has a sane size, card aspect and resting offset', () => {
    expect(new Set(SPECIES.map(s => s.id)).size).toBe(SPECIES.length);
    for (const s of SPECIES) {
      expect(s.tl, s.id).toBeGreaterThanOrEqual(10); expect(s.tl, s.id).toBeLessThanOrEqual(s.body === 'snake' ? 1500 : 400);
      expect(s.aspect, s.id).toBeGreaterThan(0.1); expect(s.aspect, s.id).toBeLessThan(1.6);
      // the lowest point of the drawing lies inside the card, below the centre line
      expect(s.rest, s.id).toBeGreaterThan(0); expect(s.rest, s.id).toBeLessThanOrEqual(s.aspect / 2);
    }
  });
  it('keeps the scale anchors', () => {
    expect([getSpecies('neon')!.tl, getSpecies('angel')!.tl, getSpecies('chili')!.tl, getSpecies('oscar')!.tl]).toEqual([35, 150, 18, 300]);
    expect(SPECIES.filter(s => s.zone === 'bottom').length).toBeGreaterThanOrEqual(6);
    expect(SPECIES.filter(s => s.kind === 'snail').length).toBe(5); // 4 freshwater + the marine turbo
  });
});

describe('scene v4', () => {
  it('migrates the v3 sample plant to a layout preset', () => {
    const v3 = (show: boolean) => { const o = { ...v6(), version: 3, plant: { show, x: 100, depth: 50 } } as Record<string, unknown>; delete o.layout; return o; };
    const on = load(v3(true)), off = load(v3(false));
    expect(on.layout).toEqual({ id: 'planted', seed: 1, dens: { hard: 2, plant: 2, animal: 0 } }); expect(off.layout.id).toBe('none');
    expect('plant' in on).toBe(false);
  });
  it('keeps a surface for snails only, defaulting to the floor; a v7 pane becomes a point on the glass', () => {
    const s = v6();
    const raw = { ...s, fish: [
      { id: 1, species: 'nerite', x: 10, y: 50, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'front' },
      { id: 2, species: 'mystery', x: 10, y: 0, depth: 50, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'ceiling' },
      { id: 3, species: 'neon', x: 10, y: 50, depth: 50, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'front' },
    ] };
    const f = load(raw).fish;
    expect(f.map(q => q.surface)).toEqual(['glass', 'floor', undefined]);
    expect(f[0].depth).toBeCloseTo(0, 6); expect(f[0].x).toBeCloseTo(10, 6); // on the front pane, where it was
  });
});

describe('custom fish sizes', () => {
  const fish = (tl: unknown) => ({ id: 1, species: 'angel', x: 10, y: 50, depth: 50, yaw: 0, pitch: 0, roll: 0, bend: 0, tl });
  const loadFish = (tl: unknown) => load({ ...v6(), fish: [fish(tl)] }).fish[0];
  it('defaults to adult (no override stored)', () => {
    expect(loadFish(undefined).tl).toBeUndefined();
    expect(loadFish(150).tl).toBeUndefined(); // equal to the adult length
  });
  it('keeps a juvenile size and clamps to 15-130 % of adult', () => {
    expect(loadFish(60).tl).toBe(60);
    expect(loadFish(5).tl).toBe(Math.round(150 * 0.15));
    expect(loadFish(900).tl).toBe(Math.round(150 * 1.3));
    expect(loadFish('big').tl).toBeUndefined();
  });
});

describe('wall side', () => {
  it('loads the session-3 single peninsula as the right end', () => {
    expect(load({ ...v6(), wall: { show: true, side: 'peninsula', color: '#d8d2c6' } }).wall.side).toBe('right');
  });
});

describe('water (scene v5)', () => {
  it('migrates a v4 file to a full tank of clear water', () => {
    const v4 = { ...v6(), version: 4 } as Record<string, unknown>;
    delete v4.water;
    const { scene } = parseScene(v4);
    expect(scene.version).toBe(SCENE_VERSION);
    expect(scene.tanks[0].water).toEqual(defaultSetup().water);
    expect(scene.tanks[0].water.level).toBe(1);
    expect(scene.tanks[0].water.opacity).toBe(0);
  });
  it('clamps water settings on load', () => {
    const s = v6();
    s.water = { level: -3, color: 'red', opacity: 7 };
    const { scene } = parseScene(s);
    expect(scene.tanks[0].water).toEqual({ on: true, level: 0.1, color: defaultSetup().water.color, opacity: 0.95 });
  });
  it('keeps swimmers below the surface when the level drops, and leaves bottom dwellers alone', () => {
    const st = new Store(defaultScene());
    st.edit(s => { s.fish.push({ id: 99, species: 'bronzecory', x: 100, y: 250, depth: 50, yaw: 0, pitch: 0, roll: 0, bend: 0 }); });
    st.edit(s => { s.water.level = 0.4; });
    const top = waterY(st.tank.tank, 0.4);
    for (const f of st.tank.fish) {
      const sp = getSpecies(f.species)!;
      if (sp.zone === 'bottom') { expect(f.y).toBe(250); continue; }
      expect(f.y + sp.tl * sp.aspect / 2).toBeLessThanOrEqual(top + 1e-9);
    }
  });
  it('lowering the level moves swimmers with it (proportionally), so schools keep their shape', () => {
    // scaled, then fitted into the water (setWaterLevel fits them itself since final check item 5; the store did it after)
    const s = defaultSetup(), want = defaultSetup(), k = waterY(s.tank, 0.5) / waterY(s.tank, 1);
    for (const f of want.fish) f.y *= k;
    want.water.level = 0.5; keepInWater(want);
    setWaterLevel(s, 0.5);
    s.fish.forEach((f, i) => expect(f.y).toBeCloseTo(want.fish[i].y));
  });
  it('lowering the level below a tall fish keeps it about where it is (deepest nearby spot), not pinned to the left glass (audit #1)', () => {
    const st = new Store(defaultScene());
    st.edit(s => { s.fish = [116, 180, 250, 320, 380, 431].map((x, i) => ({ id: 200 + i, species: 'angel', x, y: 200, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0 })); });
    const xs = st.tank.fish.map(f => f.x);
    // 50 %: 140 mm of water everywhere, shallower than an angelfish is tall: they stay put and only drop
    for (const level of [0.5, 1]) {
      st.edit(s => setWaterLevel(s, level));
      st.tank.fish.forEach((f, i) => { expect(f.x).toBe(xs[i]); expect(f.depth).toBe(150); });
    }
    // 10 %: the sloped gravel stands above the water except at the front, so they go forward, but keep their x
    st.edit(s => setWaterLevel(s, 0.1));
    st.tank.fish.forEach((f, i) => expect(Math.abs(f.x - xs[i])).toBeLessThan(15));
  });
  it('lowering the level and raising it again brings swimmers back to their heights and spots (final check item 5)', () => {
    const st = new Store(defaultScene());
    st.edit(s => { s.fish = [116, 180, 250, 320, 380, 431].map((x, i) => ({ id: 300 + i, species: 'angel', x, y: 120 + 20 * i, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0 })); });
    const before = st.tank.fish.map(f => ({ x: f.x, y: f.y, depth: f.depth }));
    for (const level of [0.7, 0.4, 0.1, 0.4, 0.7, 1]) st.edit(s => setWaterLevel(s, level), { coalesce: 'wLevel' });
    st.tank.fish.forEach((f, i) => { expect(f.x).toBeCloseTo(before[i].x); expect(f.depth).toBeCloseTo(before[i].depth); expect(f.y).toBeCloseTo(before[i].y); });
    // a fish dragged while the water is low starts from where it was dropped
    st.edit(s => setWaterLevel(s, 0.1));
    const id = st.tank.fish[0].id;
    st.edit(s => { const f = s.fish.find(f => f.id === id)!; f.x = 300; });
    st.edit(s => setWaterLevel(s, 1));
    expect(st.tank.fish.find(f => f.id === id)!.x).toBe(300);
  });
  it('clamps a fish dragged above the water line', () => {
    const st = new Store(defaultScene()), id = st.tank.fish[0].id;
    st.edit(s => { s.water.level = 0.5; s.fish[0].y = s.tank.H; });
    const f = st.tank.fish.find(f => f.id === id)!, sp = getSpecies(f.species)!;
    expect(f.y).toBeCloseTo(waterY(st.tank.tank, 0.5) - sp.tl * sp.aspect / 2);
  });
  it('full = the water line WATERLINE_GAP below the interior top; tint 0 = clear', () => {
    const T = { L: 600, H: 300, D: 300 };
    expect(waterY(T, 1)).toBe(300 - WATERLINE_GAP);
    expect(waterK(0)).toBeCloseTo(0);
    expect(1 - Math.exp(-waterK(0.5) * 300)).toBeCloseTo(0.5);
  });
  it('glass snails spawn below a lowered water line', () => {
    const sub = defaultSetup().substrate, T = { L: 600, H: 300, D: 300 }, top = 150;
    let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2000; i++) { const p = spawnSnail((x, d) => substrateHeight(sub, T, x, d), T, 20, r, top); if (p.surface !== 'floor') expect(p.y).toBeLessThanOrEqual(top - 10 + 1e-9); }
  });
});

describe('swamp terrain', () => {
  const swampScene = (seed: number) => {
    const s = defaultSetup(); s.layout = { id: 'swamp', seed }; s.terrain = swampTerrain(s, s.tank, seed); setWaterLevel(s, SWAMP_LEVEL); return s;
  };
  it('has land above the water and a pool open to the front glass, for many seeds', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = swampScene(seed), A = s.tank, top = waterY(A, s.water.level);
      let land = 0, frontWet = 0;
      for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) if (groundHeight(s, A, A.L * i / 20, A.D * j / 20) > top) land++;
      for (let i = 0; i <= 20; i++) if (groundHeight(s, A, A.L * i / 20, 2) < top - 40) frontWet++;
      expect(land).toBeGreaterThan(441 * 0.25);
      expect(frontWet).toBeGreaterThan(2);
    }
  });
  it('moves swimmers and bottom dwellers off the land into the water, with room for their card', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const st = storeOf(swampScene(seed));
      st.edit(s => {
        for (let i = 0; i < 30; i++) s.fish.push({ id: 100 + i, species: i % 3 ? 'neon' : 'bronzecory', x: s.tank.L * (i / 30), y: s.tank.H * 0.9, depth: s.tank.D * 0.9, yaw: 0, pitch: 0, roll: 0, bend: 0 });
      });
      const s = st.tank, A = s.tank, top = waterY(A, s.water.level);
      for (const f of s.fish) {
        const sp = getSpecies(f.species)!, h = sp.tl * sp.aspect, g = groundHeight(s, A, f.x, f.depth);
        if (f.species === 'angel') { expect(g).toBeLessThan(top); continue; } // taller than the deepest pool: sits in the deepest water
        expect(g + h).toBeLessThanOrEqual(top + 1e-6);
        if (sp.zone !== 'bottom') { expect(f.y - h / 2).toBeGreaterThanOrEqual(g - 1e-6); expect(f.y + h / 2).toBeLessThanOrEqual(top + 1e-6); }
      }
    }
  });
  it('the ground is the substrate everywhere outside the swamp layout', () => {
    const s = defaultSetup(), A = s.tank;
    expect(groundHeight(s, A, 100, 100)).toBe(substrateHeight(s.substrate, A, 100, 100));
  });
});

describe('custom terrain (scene v6)', () => {
  const T = { L: 900, H: 400, D: 450 };
  const grid = (cols: number, rows: number, f: (i: number, j: number) => number) =>
    ({ on: true, cols, rows, h: Array.from({ length: cols * rows }, (_, k) => f(k % cols, Math.floor(k / cols))) });
  it('the surface passes exactly through every grid point', () => {
    const t = grid(7, 4, (i, j) => 20 + ((i * 37 + j * 53) % 90));
    for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++)
      expect(terrainHeight(t, T, T.L * i / 6, T.D * j / 3)).toBeCloseTo(t.h[j * 7 + i], 6);
  });
  it('is smooth between points: no jumps along a fine line, and a flat grid stays flat', () => {
    const t = grid(5, 3, (i, j) => (i === 2 && j === 1 ? 150 : 30));
    let prev = terrainHeight(t, T, 0, T.D / 2), maxStep = 0;
    for (let x = 1; x <= T.L; x++) { const h = terrainHeight(t, T, x, T.D / 2); maxStep = Math.max(maxStep, Math.abs(h - prev)); prev = h; }
    expect(maxStep).toBeLessThan(1.5); // 120 mm rise over a 225 mm cell, no steps
    const flat = grid(6, 3, () => 42);
    for (let k = 0; k < 50; k++) expect(terrainHeight(flat, T, (k * 97) % T.L, (k * 41) % T.D)).toBeCloseTo(42, 6);
  });
  it('never goes below the tank floor (overshoot is clamped)', () => {
    const t = grid(5, 3, (i) => (i === 2 ? 0 : 200));
    for (let x = 0; x <= T.L; x += 5) expect(terrainHeight(t, T, x, T.D / 2)).toBeGreaterThanOrEqual(0);
  });
  it('starts from the current floor and survives a grid change by resampling', () => {
    const s = defaultSetup(), A = s.tank;
    const t = sampleTerrain(s, A, 7);
    expect(t.h.length).toBe(t.cols * t.rows);
    s.terrain = t;
    for (const [x, d] of [[0, 0], [A.L, A.D], [A.L / 2, A.D / 2]]) expect(groundHeight(s, A, x, d)).toBeCloseTo(substrateHeight(s.substrate, A, x, d), 0);
    s.terrain.h[s.terrain.cols + 3] = 120;
    const before = groundHeight(s, A, A.L / 2, A.D / (s.terrain.rows - 1));
    s.terrain = sampleTerrain(s, A, 13);
    expect(groundHeight(s, A, A.L / 2, A.D / 2)).toBeGreaterThan(0);
    expect(Math.abs(groundHeight(s, A, A.L / 2, A.D / (sampleTerrain(defaultSetup(), A, 7).rows - 1)) - before)).toBeLessThan(15);
  });
  it('round tanks use a radial grid: centre dot, outer ring on the glass, even arc spacing, surface through every point', () => {
    const s = defaultSetup(), R: typeof s.tank = { ...s.tank, shape: 'round', D: s.tank.L };
    s.tank = R; s.substrate = { ...s.substrate, fl: 10, fr: 60, bl: 30, br: 90 };
    const t = sampleTerrain(s, R, 9), pts = terrainPoints(t, R);
    expect(t.radial).toBe(true); expect(t.rows).toBe(4); expect(t.h.length).toBe(radialSize(4)); expect(pts.length).toBe(t.h.length);
    expect(pts[0].x).toBeCloseTo(R.L / 2, 6); expect(pts[0].depth).toBeCloseTo(R.D / 2, 6);
    const ringR = R.L / 2 / t.rows;
    for (let k = 1, at = 1; k <= t.rows; at += ringCount(k), k++) {
      const n = ringCount(k), p = pts.slice(at, at + n);
      for (const q of p) expect(Math.hypot(q.x - R.L / 2, q.depth - R.D / 2)).toBeCloseTo(k * ringR, 6);
      expect(2 * Math.PI * k * ringR / n / ringR).toBeGreaterThan(0.9); expect(2 * Math.PI * k * ringR / n / ringR).toBeLessThan(1.1);
    }
    s.terrain = t; t.h = t.h.map((_, k) => 20 + (k * 37) % 90);
    pts.forEach((p, k) => expect(terrainHeight(t, R, p.x, p.depth)).toBeCloseTo(t.h[k], 6));
    let prev = terrainHeight(t, R, 0, R.D / 2), maxStep = 0; // smooth along a diameter, through the centre
    for (let x = 1; x <= R.L; x++) { const h = terrainHeight(t, R, x, R.D / 2); maxStep = Math.max(maxStep, Math.abs(h - prev)); prev = h; }
    expect(maxStep).toBeLessThan(3);
    expect(load(JSON.parse(JSON.stringify({ ...defaultScene(), tanks: [s] }))).terrain).toEqual(s.terrain);
  });
  it('bowls use the radial grid too, spanning the floor circle', () => {
    const s = defaultSetup(), B = normTank({ ...s.tank, shape: 'bowl' }), rb = bowlDims(B).rb;
    s.tank = B;
    const t = sampleTerrain(s, B, 9), pts = terrainPoints(t, B);
    expect(t.radial).toBe(true); expect(t.h.length).toBe(radialSize(t.rows));
    expect(pts[0].x).toBeCloseTo(B.L / 2, 6);
    const out = pts.slice(-ringCount(t.rows));
    for (const q of out) expect(Math.hypot(q.x - B.L / 2, q.depth - B.D / 2)).toBeCloseTo(rb, 6);
    t.h = t.h.map((_, k) => 20 + (k * 37) % 90);
    pts.forEach((p, k) => expect(terrainHeight(t, B, p.x, p.depth)).toBeCloseTo(t.h[k], 6));
  });
  it('round-trips through save/load and repairs a broken grid', () => {
    const s = defaultSetup(); s.terrain = sampleTerrain(s, s.tank, 5);
    expect(load(JSON.parse(JSON.stringify({ ...defaultScene(), tanks: [s] }))).terrain).toEqual(s.terrain);
    const bad = { ...s, terrain: { on: true, cols: 5, rows: 3, h: [1, 2, 3] } };
    expect(load({ ...defaultScene(), tanks: [bad] }).terrain.on).toBe(false);
  });
});

describe('dry tank (water off)', () => {
  it('keeps fish untouched in the data while dry, and older files load with water on', () => {
    const st = new Store(defaultScene()), ys = st.tank.fish.map(f => f.y);
    st.edit(s => { s.water.on = false; s.water.level = 0.2; s.fish[0].y = s.tank.H; });
    expect(st.tank.fish[0].y).toBe(st.tank.tank.H); // not clamped: hidden, not edited
    expect(st.tank.fish.slice(1).map(f => f.y)).toEqual(ys.slice(1));
    const old = v6(); delete old.water.on;
    expect(load(old).water.on).toBe(true);
  });
});

describe('approximate tank weight', () => {
  const bare = () => { const s = defaultSetup(); s.substrate.show = false; s.layout.id = 'none'; s.render.glass = 10; s.lid = 'open'; return s; };
  it('water = interior floor x water depth when there is no substrate', () => {
    const s = bare(), A = s.tank, w = tankWeight(s);
    expect(w.water).toBeCloseTo(A.L * A.D * waterY(A, 1) / 1e6, 6);
    expect(w.substrate).toBe(0);
  });
  it('glass from the pane sizes at their real thickness (2.5 kg/L)', () => {
    const s = bare(), { L, H, D } = s.tank, t = 10;
    const vol = ((L + 2 * t) * (D + 2 * t) * t + 2 * (L + 2 * t) * H * t + 2 * D * H * t) / 1e6;
    expect(tankWeight(s).glass).toBeCloseTo(vol * 2.5, 6);
    s.render.glass = 5; expect(tankWeight(s).glass).toBeLessThan(vol * 2.5 * 0.6);
  });
  it('substrate displaces water; lowering the level and going dry cut the water, land stays', () => {
    const s = defaultSetup(), full = tankWeight(s);
    expect(full.water).toBeLessThan(tankWeight(bare()).water);
    setWaterLevel(s, 0.5); expect(tankWeight(s).water).toBeLessThan(full.water * 0.6);
    s.water.on = false; const dry = tankWeight(s);
    expect(dry.water).toBe(0); expect(dry.substrate).toBeLessThan(full.substrate); // no pore water when dry
  });
});

describe('land and amphibious animals (habitat)', () => {
  const swamp = (seed: number) => { const s = defaultSetup(); s.layout = { id: 'swamp', seed }; s.terrain = swampTerrain(s, s.tank, seed); setWaterLevel(s, SWAMP_LEVEL); return s; };
  const animal = (id: number, species: string, x: number, y: number, depth: number) => ({ id, species, x, y, depth, yaw: 0, pitch: 0, roll: 0, bend: 0 });
  it('resolves habitat: fish water, snails both, frogs land, toad and newt both, axolotl a water bottom dweller', () => {
    expect(getSpecies('neon')!.habitat).toBe('water');
    expect(getSpecies('nerite')!.habitat).toBe('both');
    expect(getSpecies('dartfrog')!.habitat).toBe('land');
    expect(getSpecies('treefrog')!.habitat).toBe('land');
    expect(getSpecies('firetoad')!.habitat).toBe('both');
    expect(getSpecies('firenewt')!.habitat).toBe('both');
    expect(getSpecies('axolotl')!).toMatchObject({ habitat: 'water', zone: 'bottom' });
    expect(searchSpecies('land').map(s => s.id)).toEqual(expect.arrayContaining(['dartfrog', 'treefrog']));
  });
  it('moves land animals off submerged ground onto the nearest land', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const st = storeOf(swamp(seed));
      st.edit(s => { for (let i = 0; i < 20; i++) s.fish.push(animal(200 + i, 'dartfrog', s.tank.L * (i / 20), 50, 10)); });
      const s = st.tank, A = s.tank, top = waterY(A, s.water.level);
      for (const f of s.fish.filter(f => f.species === 'dartfrog')) expect(groundHeight(s, A, f.x, f.depth)).toBeGreaterThanOrEqual(top);
    }
  });
  it('amphibians swim in deep water and rest on land or in the shallows', () => {
    const s = swamp(3), A = s.tank, top = waterY(A, s.water.level), sp = getSpecies('firetoad')!, h = sp.tl * sp.aspect;
    const land = nearestLand(s, A, top, 0, 0)!;
    expect(restsOnGround(s, A, sp, land.x, land.depth, h)).toBe(true);
    let wet = 0;
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
      const x = A.L * i / 40, d = A.D * j / 40;
      if (top - groundHeight(s, A, x, d) >= h) { wet++; expect(restsOnGround(s, A, sp, x, d, h)).toBe(false); }
    }
    expect(wet).toBeGreaterThan(0);
    expect(restsOnGround({ ...s, water: { ...s.water, on: false } }, A, sp, land.x, land.depth, h)).toBe(true);
  });
  it('a full aquarium has no land; a dry tank is all land', () => {
    const s = defaultSetup(), A = s.tank;
    expect(nearestLand(s, A, waterY(A, s.water.level), 0, 0)).toBeNull();
    expect(randomLand(s, A, -1, Math.random)).not.toBeNull();
  });
});

describe('light height', () => {
  it('older files load with the old fixed 50 mm; out-of-range heights clamp', () => {
    const s = v6(); delete s.light.height;
    expect(load(s).light.height).toBe(50);
    expect(load({ ...v6(), light: { ...defaultSetup().light, height: 5000 } }).light.height).toBe(900);
  });
  it('a raised fixture lights the tank less but more evenly', async () => {
    const { emitters, lightSum } = await import('../src/render/lighting'), { beamExp } = await import('../src/scene/lightout');
    const T = { L: 914, H: 406, D: 457 }, l = { ...defaultSetup().light, type: 'spot' as const, count: 2 }, cone = beamExp(l);
    const stats = (h: number) => {
      const E = emitters(T, l, h), v: number[] = [];
      for (let i = 1; i <= 9; i++) v.push(lightSum(E, [T.L * i / 10, T.H * 0.3, -T.D / 2], cone));
      const mean = v.reduce((a, b) => a + b) / v.length; return { mean, spread: (Math.max(...v) - Math.min(...v)) / mean };
    };
    const low = stats(50), high = stats(400);
    expect(high.mean).toBeLessThan(low.mean); expect(high.spread).toBeLessThan(low.spread);
  });
});

describe('pie slice terrain grid', () => {
  const pieSetup = (deg = 90) => { const s = defaultSetup(); s.tank = normTank({ L: 1, H: 450, D: 600, shape: 'pie', pieDeg: deg }); s.substrate = { ...s.substrate, fl: 40, fr: 40, bl: 80, br: 80 }; return s; };
  it('arcs round the apex: a dot at the apex, every dot inside the glass, outer arc on the curve', () => {
    const s = pieSetup(), T = s.tank, t = sampleTerrain(s, T, 13);
    expect(t.radial).toBe(true); expect(t.arc).toBe(90);
    const pts = terrainPoints(t, T);
    expect(pts.length).toBe(pieSize(t.rows, 90)); expect(t.h.length).toBe(pts.length);
    expect(pts[0].x).toBeCloseTo(T.L / 2, 6); expect(pts[0].depth).toBeCloseTo(T.D, 6);
    for (const p of pts) expect(inside(T, p.x, p.depth, -1)).toBe(true); // on the true arc, a hair outside the faceted glass
    const outer = pts.slice(-3); for (const p of outer) expect(Math.hypot(p.x - T.L / 2, p.depth - T.D)).toBeCloseTo(T.D, 1);
  });
  it('the surface passes through every grid point and moves only near an edited one', () => {
    const s = pieSetup(120), T = s.tank, t = sampleTerrain(s, T, 13), pts = terrainPoints(t, T);
    pts.forEach((p, k) => expect(terrainHeight(t, T, p.x, p.depth)).toBeCloseTo(t.h[k], 3));
    const k = pts.length - 4, far = pts[1], before = terrainHeight(t, T, far.x, far.depth);
    t.h[k] += 60; expect(terrainHeight(t, T, pts[k].x, pts[k].depth)).toBeCloseTo(t.h[k], 3);
    expect(terrainHeight(t, T, far.x, far.depth)).toBeCloseTo(before, 3);
  });
  it('changing the angle or shape asks for a resample; the grid survives a file round trip', () => {
    const s = pieSetup(), t = sampleTerrain(s, s.tank, 13);
    expect(sameGrid(t, s.tank)).toBe(true);
    expect(sameGrid(t, normTank({ ...s.tank, pieDeg: 180 }))).toBe(false);
    expect(sameGrid(t, normTank({ ...s.tank, shape: 'round' }))).toBe(false);
    const sc = defaultScene(); sc.tanks[0].tank = s.tank; sc.tanks[0].terrain = t;
    const back = parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].terrain;
    expect(back.arc).toBe(90); expect(back.h).toEqual(t.h);
  });
  it('a pie slice saved with an old rectangular grid loads on the polar grid, same surface', () => {
    const s = pieSetup(), T = s.tank, sc = defaultScene(); s.substrate = { ...s.substrate, fl: 20, fr: 20, bl: 90, br: 90 };
    const rect = { ...sampleTerrain(s, { L: T.L, H: T.H, D: T.D }, 13), on: true }; // as the panel made it before the fix
    expect(rect.radial).toBeUndefined();
    sc.tanks[0] = { ...sc.tanks[0], tank: T, substrate: s.substrate, terrain: rect };
    const te = parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].terrain;
    expect(te.arc).toBe(90); expect(te.on).toBe(true);
    for (const [x, d] of [[T.L / 2, T.D * 0.9], [T.L / 2, T.D * 0.2]]) expect(terrainHeight(te, T, x, d)).toBeCloseTo(terrainHeight(rect, T, x, d), -1);
  });
});
