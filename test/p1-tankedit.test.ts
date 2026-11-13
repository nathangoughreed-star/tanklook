// Lane P1 (UI2 §7, 2026-11-13): the tank edit rules moved out of ui/panels.ts into scene/tankEdit.ts. Each rule is tested
// here, and the moved setTank / setKind bodies are checked against frozen copies of the old inline code (the "oracle"
// functions below, as they stood in panels.ts at build 1976) so the old shell behaves exactly as before.
import { describe, expect, it } from 'vitest';
import { Store as SceneStore } from '../src/scene/store';
import { locksOf, releaseProduct, breakNote } from '../src/scene/integrated';
import { TANK_MODELS, modelOfVariant, tankFromModel } from '../src/data/tanks';
import { applyTankPick } from '../src/ui/tankPick';
import { applyKind, tankKind, type SetupKind } from '../src/scene/pickerKind';
import { STYLE_KIND } from '../src/scene/items';
import { adaptToTank } from '../src/scene/reeval';
import { sameGrid, sampleTerrain } from '../src/scene/terrain';
import { BOWL_DEFAULT, PIE_DEFAULT, shapeOf } from '../src/scene/shape';
import { TECHS } from '../src/scene/lightout';
import { LIMITS } from '../src/scene/validate';
import {
  FRESH_CLEAR, SALT_CLEAR, applySetupKind, applyTankEdit, doorLocked, editTable, flatEnds, inchStep, lidLocked, reshape, setDoors,
  setGlass, setLid, setRim, shapeMemory, sideFromInput, sideWallLocked, tableLength, tableRound,
} from '../src/scene/tankEdit';
import type { Tank, TankSetup, TankShape } from '../src/scene/types';

const IN = 25.4;
const fresh = () => new SceneStore().tank;
const SHAPES: TankShape[] = ['rect', 'bow', 'arch', 'round', 'pie', 'bowl', 'poly'];

// ---- frozen copies of the old inline code (panels.ts, build 1976), for the oracle checks ----
const oldFlatEnds = (T: Tank) => ['rect', 'bow', 'arch'].includes(shapeOf(T));
function oldSetTankBody(s: TankSetup, next: (T: Tank) => Tank, coalesce?: string, glass?: number, also?: (s: TankSetup) => void) {
  if (also) also(s); else if (breakNote(s, 'size')) releaseProduct(s);
  const T = next(s.tank);
  if (glass != null) s.render.glass = glass;
  adaptToTank(s, T, { thin: coalesce === undefined });
  const te = s.terrain;
  if (te.h.length && !sameGrid(te, s.tank)) s.terrain = { ...sampleTerrain(s, s.tank, te.cols), on: te.on };
  const max = T.H * 0.5;
  for (const k of ['fl', 'fr', 'bl', 'br'] as const) s.substrate[k] = Math.min(s.substrate[k], max);
  if (!oldFlatEnds(s.tank)) { if (s.lid === 'hood') s.lid = 'glass'; if (s.wall.side === 'left' || s.wall.side === 'right') s.wall.side = 'back'; }
}
function oldShapeNext(mem: Map<TankShape, Pick<Tank, 'L' | 'H' | 'D'>>, T0: Tank, shape: TankShape) {
  const from = T0.shape ?? 'rect', back = mem.get(shape);
  mem.set(from, { L: T0.L, H: T0.H, D: T0.D });
  return (T: Tank) => ({ ...T, ...(back ? { L: back.L, D: back.D, ...(from === 'bowl' ? { H: back.H } : {}) } : {}), shape, sides: T.sides ?? 6, bowMin: T.bowMin ?? T.D * 0.7, bowlFloor: T.bowlFloor ?? T.L * BOWL_DEFAULT, bowlTop: T.bowlTop ?? T.L * BOWL_DEFAULT, pieDeg: T.pieDeg ?? PIE_DEFAULT });
}
function oldSetKind(s: TankSetup, k: SetupKind) {
  const was = !!s.water.salt;
  applyKind(s, k);
  if (was !== (k === 'saltwater') && k !== 'terrarium') {
    const [c, o] = k === 'saltwater' ? FRESH_CLEAR : SALT_CLEAR;
    if (s.water.color === c && s.water.opacity === o) [s.water.color, s.water.opacity] = k === 'saltwater' ? SALT_CLEAR : FRESH_CLEAR;
    if (STYLE_KIND[s.layout.id] === (k === 'saltwater' ? 'fresh' : 'salt')) s.layout = { ...s.layout, id: 'none' };
  }
}
/** A busy setup: hood, left wall, deep substrate, a terrain grid, some fish. */
function busy(shape: TankShape = 'rect'): TankSetup {
  const s = fresh();
  s.tank = { ...s.tank, L: 36 * IN, H: 16 * IN, D: 18 * IN, shape };
  s.lid = 'hood'; s.wall.side = 'left';
  for (const k of ['fl', 'fr', 'bl', 'br'] as const) s.substrate[k] = 200;
  s.terrain = { ...sampleTerrain(s, s.tank, 12), on: true };
  return s;
}
const strip = (s: TankSetup) => JSON.parse(JSON.stringify(s));

describe('P1 flat ends and the locks they drive', () => {
  it('rect, bow and arch have flat ends; round, pie, bowl and poly do not', () => {
    const t = fresh().tank;
    expect(SHAPES.filter(sh => flatEnds({ ...t, shape: sh }))).toEqual(['rect', 'bow', 'arch']);
    expect(flatEnds({ ...t, shape: undefined })).toBe(true); // no shape = a rectangle
  });
  it('hood lid is off on a shape without flat ends; every lid is off on a kit that keeps its own', () => {
    const t = fresh().tank;
    expect(lidLocked({ ...t, shape: 'round' }, false, 'hood')).toBe(true);
    expect(lidLocked({ ...t, shape: 'round' }, false, 'glass')).toBe(false);
    expect(lidLocked({ ...t, shape: 'bow' }, false, 'hood')).toBe(true); // HD1: no hood is sold for a bow front
    expect(lidLocked({ ...t, shape: 'rect', L: 30.5 * 25.4, D: 12.5 * 25.4 }, false, 'hood')).toBe(false); // a standard 30 x 12 in size has hoods
    for (const l of ['open', 'glass', 'mesh', 'hood'] as const) expect(lidLocked(t, true, l)).toBe(true);
  });
  it('doors: rectangles only and not when the product holds them; "none" is always open', () => {
    const s = fresh();
    expect(doorLocked(s, 'hinged', false)).toBe(false);
    expect(doorLocked(s, 'sliding', true)).toBe(true);
    expect(doorLocked(s, 'none', true)).toBe(false);
    s.tank = { ...s.tank, shape: 'bow' };
    expect(doorLocked(s, 'hinged', false)).toBe(true);
    expect(doorLocked(s, 'none', false)).toBe(false);
  });
  it('the left / right wall needs flat ends', () => {
    const t = fresh().tank;
    expect(sideWallLocked({ ...t, shape: 'pie' })).toBe(true);
    expect(sideWallLocked({ ...t, shape: 'arch' })).toBe(false);
  });
});

describe('P1 applyTankEdit (setTank)', () => {
  it('a resize keeps the substrate under half the new height', () => {
    const s = busy();
    applyTankEdit(s, T => ({ ...T, H: 10 * IN }), { thin: true });
    expect(s.tank.H).toBeCloseTo(10 * IN);
    for (const k of ['fl', 'fr', 'bl', 'br'] as const) expect(s.substrate[k]).toBeLessThanOrEqual(5 * IN + 1e-9);
  });
  it('reshaping to a shape without flat ends turns a hood to glass and a side wall to the back', () => {
    for (const sh of ['round', 'pie', 'bowl', 'poly'] as const) {
      const s = busy();
      applyTankEdit(s, T => ({ ...T, shape: sh, sides: 6, pieDeg: PIE_DEFAULT, bowlFloor: T.L * BOWL_DEFAULT, bowlTop: T.L * BOWL_DEFAULT }), { thin: true });
      expect(s.lid, sh).toBe('glass');
      expect(s.wall.side, sh).toBe('back');
    }
    const s = busy(); s.wall.side = 'right';
    applyTankEdit(s, T => ({ ...T, shape: 'bow', bowMin: T.D * 0.7 }), { thin: true });
    expect(s.lid).toBe('hood'); expect(s.wall.side).toBe('right'); // a bowfront keeps both
  });
  it('the terrain is resampled into the new shape\'s grid', () => {
    const s = busy();
    applyTankEdit(s, T => ({ ...T, shape: 'round' }), { thin: true });
    expect(sameGrid(s.terrain, s.tank)).toBe(true);
    expect(s.terrain.on).toBe(true);
  });
  it('a library pick sets the glass and the product; a plain edit releases a held size', () => {
    const m = TANK_MODELS.find(x => !x.terrarium && x.variants?.length)!, v = m.variants![0], mm = modelOfVariant(m, v);
    const s = fresh();
    applyTankEdit(s, () => tankFromModel(mm), { thin: true, glass: 6, also: t => applyTankPick(t, m, v) });
    expect(s.render.glass).toBe(6);
    expect(s.product).toBeTruthy();
    applyTankEdit(s, T => ({ ...T, L: T.L + IN }), { thin: true });
    expect(s.product).toBeUndefined();
  });
  it('the adapt hook gets the next tank and the thin flag (the old shell passes adaptForEdit)', () => {
    const s = fresh(), seen: [number, boolean][] = [];
    applyTankEdit(s, T => ({ ...T, L: 30 * IN }), { thin: false, adapt: (_s, T, thin) => seen.push([T.L, thin]) });
    expect(seen).toEqual([[30 * IN, false]]);
  });
  it('matches the old inline setTank on every shape, resize and reshape (oracle)', () => {
    for (const from of SHAPES) for (const to of SHAPES) {
      const a = busy(from), b = busy(from);
      a.tank = { ...a.tank, sides: 6, pieDeg: PIE_DEFAULT }; b.tank = structuredClone(a.tank);
      const next = (T: Tank) => ({ ...T, shape: to, L: T.L * 0.8, sides: T.sides ?? 6, bowMin: T.bowMin ?? T.D * 0.7, bowlFloor: T.bowlFloor ?? T.L * BOWL_DEFAULT, bowlTop: T.bowlTop ?? T.L * BOWL_DEFAULT, pieDeg: T.pieDeg ?? PIE_DEFAULT });
      oldSetTankBody(a, next);
      applyTankEdit(b, next, { thin: true });
      expect(strip(b), `${from} -> ${to}`).toEqual(strip(a));
    }
  });
});

describe('P1 shape memory (reshape)', () => {
  it('going back to a shape brings its own length and depth back', () => {
    const mem = shapeMemory(), T0: Tank = { ...fresh().tank, L: 36 * IN, H: 16 * IN, D: 18 * IN, shape: 'rect' };
    const T1 = reshape(mem, T0, 'round')(T0);
    expect(T1.shape).toBe('round');
    const T1r = { ...T1, D: T1.L }; // round derives D = L (rescaleTank)
    const T2 = reshape(mem, T1r, 'rect')(T1r);
    expect([T2.L, T2.D, T2.H]).toEqual([36 * IN, 18 * IN, 16 * IN]);
  });
  it('leaving a bowl brings the height back too; leaving anything else keeps the current height', () => {
    const mem = shapeMemory(), T0: Tank = { ...fresh().tank, L: 20 * IN, H: 12 * IN, D: 10 * IN, shape: 'rect' };
    const bowl = { ...reshape(mem, T0, 'bowl')(T0), H: 9 * IN };
    expect(reshape(mem, bowl, 'rect')(bowl).H).toBe(12 * IN);
    const mem2 = shapeMemory(), T3 = reshape(mem2, T0, 'pie')(T0), T3h = { ...T3, H: 15 * IN };
    expect(reshape(mem2, T3h, 'rect')(T3h).H).toBe(15 * IN);
  });
  it('fills the shape fields it lacks and keeps those it has', () => {
    const mem = shapeMemory(), T0: Tank = { L: 600, H: 400, D: 300 };
    const T = reshape(mem, T0, 'poly')(T0);
    expect(T).toMatchObject({ shape: 'poly', sides: 6, bowMin: 210, bowlFloor: 600 * BOWL_DEFAULT, bowlTop: 600 * BOWL_DEFAULT, pieDeg: PIE_DEFAULT });
    const T2 = reshape(shapeMemory(), { ...T0, sides: 8, pieDeg: 90 }, 'pie')({ ...T0, sides: 8, pieDeg: 90 });
    expect([T2.sides, T2.pieDeg]).toEqual([8, 90]);
  });
  it('remembers under the ACTIVE tank but applies to each edited tank (split view), as before (oracle)', () => {
    const A: Tank = { L: 900, H: 400, D: 450, shape: 'rect' }, B: Tank = { L: 600, H: 300, D: 300, shape: 'bow', bowMin: 200 };
    const m1 = shapeMemory(), m2 = new Map<TankShape, Pick<Tank, 'L' | 'H' | 'D'>>();
    for (const sh of ['round', 'rect', 'bowl', 'pie', 'rect'] as const) {
      const n1 = reshape(m1, A, sh), n2 = oldShapeNext(m2, A, sh);
      expect(n1(B), sh).toEqual(n2(B)); expect(n1(A), sh).toEqual(n2(A));
      Object.assign(A, n1(A));
    }
    expect([...m1]).toEqual([...m2]);
  });
});

describe('P1 typed sides', () => {
  it('nothing usable: not a number, zero or below', () => {
    for (const v of [NaN, Infinity, 0, -3]) expect(sideFromInput(v, 'in')).toBeNull();
  });
  it('inches and centimetres to mm, inside the limits', () => {
    expect(sideFromInput(20, 'in')).toEqual({ mm: 20 * IN, clamped: false });
    expect(sideFromInput(50, 'cm')).toEqual({ mm: 500, clamped: false });
  });
  it('out of range is clamped and says so', () => {
    expect(sideFromInput(1, 'in')).toEqual({ mm: LIMITS.tankMin, clamped: true });
    expect(sideFromInput(400, 'in')).toEqual({ mm: LIMITS.tankMax, clamped: true });
  });
  it('arrow steps: half inches under 18 in, whole from there; down from 18 is a half', () => {
    expect(inchStep(17.5, 1)).toBe(0.5); expect(inchStep(18, 1)).toBe(1);
    expect(inchStep(18, -1)).toBe(0.5); expect(inchStep(19, -1)).toBe(1);
  });
});

describe('P1 lid, doors, rim, glass', () => {
  it('a hood swaps a metal halide pendant for LED, in its colour range', () => {
    const s = fresh(); s.light.type = 'spot'; s.light.tech = 'mh'; s.light.kelvin = 10000;
    setLid(s, 'hood');
    expect(s.lid).toBe('hood'); expect(s.light.tech).toBe('led-white');
    const [a, b] = TECHS['led-white'].k; expect(s.light.kelvin).toBeGreaterThanOrEqual(a); expect(s.light.kelvin).toBeLessThanOrEqual(b);
  });
  it('another lid leaves the pendant; a hood leaves other lights', () => {
    const s = fresh(); s.light.type = 'spot'; s.light.tech = 'mh';
    setLid(s, 'glass'); expect(s.light.tech).toBe('mh');
    const t = fresh(), before = structuredClone(t.light);
    setLid(t, 'hood'); // HD1: a hood brings its own light, type and watts, when a product fits; a tank no hood fits keeps its light
    if (t.hoodProduct) expect(t.light.watts).toBeGreaterThan(0); else expect(t.light).toEqual(before);
  });
  it('a lid change on a kit that holds its lid releases the product', () => {
    const k = TANK_MODELS.find(m => m.variants?.some(v => v.kit))!, v = k.variants!.find(x => x.kit)!;
    const s = fresh(); applyTankPick(s, k, v); s.tank = tankFromModel(modelOfVariant(k, v));
    expect(locksOf(s)?.lid).toBe(true);
    setLid(s, 'open');
    expect(s.lid).toBe('open'); expect(s.integrated).toBeUndefined();
  });
  it('doors: none deletes the field', () => {
    const s = fresh(); setDoors(s, 'sliding'); expect(s.doors).toBe('sliding');
    setDoors(s, 'none'); expect('doors' in s).toBe(false);
  });
  it('rim on a rimless product releases it; on a custom tank just sets it', () => {
    const m = TANK_MODELS.find(x => x.variants?.some(v => v.rimless))!, v = m.variants!.find(x => x.rimless)!;
    const s = fresh(); applyTankPick(s, m, v); s.tank = tankFromModel(modelOfVariant(m, v));
    setRim(s, true); expect(s.render.rim).toBe(true); expect(s.product).toBeUndefined();
    const t = fresh(); setRim(t, false); expect(t.render.rim).toBe(false);
  });
  it('glass: auto or a number of mm', () => {
    const s = fresh(); setGlass(s, '10'); expect(s.render.glass).toBe(10); setGlass(s, 'auto'); expect(s.render.glass).toBe('auto');
  });
});

describe('P1 table geometry', () => {
  it('a table edit turns the table style on, unless the stand is custom, and shows the stand', () => {
    const s = fresh(); s.stand.show = false; s.stand.style = 'cabinet';
    editTable(s, tb => { tb.x = 10; });
    expect([s.stand.style, s.stand.show, s.stand.need, s.stand.table.x]).toEqual(['table', true, 'added', 10]);
    const c = fresh(); c.stand.style = 'custom'; editTable(c, () => {}); expect(c.stand.style).toBe('custom');
  });
  it('a round top is square, from the larger side; its length keeps it square', () => {
    const tb = { shape: 'rect' as const, L: 300, D: 500, x: 0, z: 0 };
    const t = { ...tb } as typeof tb | { shape: 'round'; L: number; D: number; x: number; z: number };
    tableRound(t); expect([t.shape, t.L, t.D]).toEqual(['round', 500, 500]);
    tableLength(t, 420); expect([t.L, t.D]).toEqual([420, 420]);
    const r = { ...tb }; tableLength(r, 420); expect([r.L, r.D]).toEqual([420, 500]);
  });
});

describe('P1 setup kind (setKind)', () => {
  it('fresh clear water becomes salt clear and back; a custom colour stays', () => {
    const s = fresh(); [s.water.color, s.water.opacity] = FRESH_CLEAR;
    applySetupKind(s, 'saltwater'); expect([s.water.color, s.water.opacity]).toEqual(SALT_CLEAR); expect(tankKind(s)).toBe('saltwater');
    applySetupKind(s, 'freshwater'); expect([s.water.color, s.water.opacity]).toEqual(FRESH_CLEAR);
    const t = fresh(); t.water.color = '#123456'; applySetupKind(t, 'saltwater'); expect(t.water.color).toBe('#123456');
  });
  it('a layout style of the other water is cleared', () => {
    const s = fresh(); s.layout = { ...s.layout, id: 'malawi' };
    applySetupKind(s, 'saltwater'); expect(s.layout.id).toBe('none');
  });
  it('matches the old inline setKind for every kind from every kind (oracle)', () => {
    const kinds: SetupKind[] = ['freshwater', 'saltwater', 'terrarium', 'vivarium'];
    for (const from of kinds) for (const to of kinds) for (const id of ['none', 'reef', 'malawi', 'arid'] as const) {
      const a = fresh(); applyKind(a, from); a.layout = { ...a.layout, id }; if (!a.water.salt) [a.water.color, a.water.opacity] = FRESH_CLEAR;
      const b = structuredClone(a);
      oldSetKind(a, to); applySetupKind(b, to);
      expect(strip(b), `${from} -> ${to} (${id})`).toEqual(strip(a));
    }
  });
});
