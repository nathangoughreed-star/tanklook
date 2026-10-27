// Lane TG: dragging the tech gear, gated by how it mounts (interact/gearDrag.ts).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { placeFor, withPlace } from '../src/interact/gearDrag';
import { buildGear, gearPicks, lidTop, mountOf, type GearPiece } from '../src/render/gear3d';
import { parseTech, techOf } from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';

const ex = (name: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[name])).scene; return sc.tanks[sc.active]; };
const fromFront = (x: number, y: number, _S?: TankSetup) => new THREE.Ray(new THREE.Vector3(x, y, 2000), new THREE.Vector3(0, 0, -1));

describe('gear drag', () => {
  it('gates by mount: heaters on glass, HOBs on the rim, sponges on the floor, stand gear not at all', () => {
    expect(mountOf('heater-100')).toBe('glass'); expect(mountOf('hob-l')).toBe('rim'); expect(mountOf('canister-m')).toBe('rim');
    expect(mountOf('sponge-s')).toBe('floor'); expect(mountOf('internal-s')).toBe('glass'); expect(mountOf('unknown')).toBe('fixed');
  });
  it('a ray from the front lands on the back glass at its x and height; a rim mount keeps no height', () => {
    const S = ex('planted'), T = S.tank;
    const g = placeFor(S, fromFront(T.L * 0.3, T.H * 0.5, S), 'glass') as { wall: string; at: number; y: number };
    expect(g.wall).toBe('back'); expect(g.at).toBeCloseTo(0.3, 2); expect(g.y).toBeGreaterThan(0.2); expect(g.y).toBeLessThan(0.8);
    const r = placeFor(S, fromFront(T.L * 0.7, T.H * 0.9, S), 'rim') as { wall: string; at: number; y?: number };
    expect(r.wall).toBe('back'); expect(r.at).toBeCloseTo(0.7, 2); expect(r.y).toBeUndefined();
    expect(placeFor(S, fromFront(10, 10, S), 'fixed')).toBeNull();
  });
  it('a ray across the tank toward a side lands on that side glass', () => {
    const S = ex('planted'), T = S.tank;
    const ray = new THREE.Ray(new THREE.Vector3(T.L / 2, T.H / 2, -T.D * 0.4), new THREE.Vector3(-1, 0, 0));
    const p = placeFor(S, new THREE.Ray(ray.at(-3000, new THREE.Vector3()), ray.direction), 'glass')!;
    expect(p.wall).toBe('left'); expect(p.at).toBeCloseTo(0.4 * T.D / T.D, 1);
  });
  it('writing a spot to an old file keeps its inferred rows, and the drawn pick follows it', () => {
    const S = ex('planted'); delete S.tech;
    const before = techOf(S).rows, t = withPlace(S, 'filter', { wall: 'back', at: 0.8 });
    expect(t.rows).toEqual(before);
    const hob = gearPicks({ ...S, tech: t }).find(p => p.row === 'filter')!;
    expect(hob.place?.wall).toBe('back'); expect(hob.place!.u).toBeCloseTo(0.8 * S.tank.L, 0);
  });
  it('a saved spot survives a reload: floor wall, height, lean; junk is dropped or clamped', () => {
    const t = parseTech({ rows: { filter: 'sponge' }, place: { filter: { wall: 'floor', at: 0.3, y: 0.7 }, heater: { wall: 'left', at: 0.5, y: 2, lean: -120 }, air: { wall: 'roof' }, uv: { wall: 'back', y: 'x', lean: NaN } } })!;
    expect(t.place).toEqual({ filter: { wall: 'floor', at: 0.3, y: 0.7 }, heater: { wall: 'left', at: 0.5, y: 1, lean: -90 }, uv: { wall: 'back' } });
    expect(parseTech({ rows: { filter: 'hob' }, place: { filter: { wall: 'back', at: 0.2 } } })!.place).toEqual({ filter: { wall: 'back', at: 0.2 } }); // an old file's spot, as it was
  });
});

// a dry tank's lamps and misting on the top (2026-10-21, Nathan: "slide anywhere theres surface")
describe('gear on the lid', () => {
  const python = (lid: TankSetup['lid']) => ({ ...ex('python'), lid });
  const fromAbove = (x: number, d: number) => new THREE.Ray(new THREE.Vector3(x, 3000, -d), new THREE.Vector3(0, -1, 0));
  const pieces = (S: TankSetup) => buildGear(S, S.tank, [])[0].userData.gearPieces as GearPiece[];
  const mid = (p: GearPiece) => ({ x: (p.box.min.x + p.box.max.x) / 2, d: -(p.box.min.z + p.box.max.z) / 2, y: p.box.min.y });
  it('a dry tank with a basking animal gets a dome lamp and a UVB tube, both on the top', () => {
    const S = python('mesh');
    expect(gearPicks(S).map(p => p.id)).toEqual(['heatdome', 'thermostat', 'uvb', 'gauge', 'handmister']);
    expect(['heatdome', 'uvb', 'mister', 'fogger'].map(mountOf)).toEqual(['lid', 'lid', 'lid', 'lid']);
    const top = lidTop(S, S.tank).y(0);
    for (const p of pieces(S)) { expect(p.mount).toBe('lid'); expect(p.box.min.y).toBeCloseTo(top, -1); }
  });
  it("a ray from above lands on the top anywhere, held inside the footprint by half the piece's size", () => {
    const S = python('mesh'), T = S.tank;
    const p = placeFor(S, fromAbove(T.L * 0.6, T.D * 0.3), 'lid', undefined, [100, 100])!;
    expect(p.wall).toBe('lid'); expect(p.at).toBeCloseTo(0.6, 2); expect(p.y).toBeCloseTo(0.3, 2);
    const q = placeFor(S, fromAbove(-500, T.D * 2), 'lid', undefined, [100, 100])!;
    expect(q.at! * T.L).toBeCloseTo(106, 0); expect(q.y! * T.D).toBeCloseTo(T.D - 106, 0);
  });
  it('the drawn piece follows its spot, keeps it through a resize, and with no lid sits on the nearest rim', () => {
    const S = python('mesh'), T = S.tank, dome1 = { ...S, tech: withPlace(S, 'heatlamp', { wall: 'lid', at: 0.7, y: 0.4 }) };
    const tech = withPlace(dome1, 'mist', { wall: 'lid', at: 0.5, y: 0.5 }), placed = { ...S, tech: { ...tech, rows: { ...tech.rows, mist: 'mister' } } };
    const dome = (X: TankSetup) => mid(pieces(X).find(p => p.row === 'heatlamp')!);
    expect(dome(placed).x).toBeCloseTo(0.7 * T.L, 0); expect(dome(placed).d).toBeCloseTo(0.4 * T.D, 0);
    expect(mid(pieces(placed).find(p => p.row === 'mist')!).x).toBeCloseTo(0.5 * T.L, 0);
    const small = { ...placed, tank: { ...T, L: 915, D: 457 } };
    expect(dome(small).x).toBeCloseTo(0.7 * 915, 0);
    const open = { ...placed, lid: 'open' as const };
    expect(dome(open).d).toBeLessThan(0); // the front rim is nearer than the back one at 0.4 of the depth
    expect(parseTech(JSON.parse(JSON.stringify(placed.tech)))!.place!.heatlamp).toEqual({ wall: 'lid', at: 0.7, y: 0.4 });
  });
  it('the lamps count in the totals, inferred or saved, so a drag never moves them; a misting system saves the spraying', () => {
    const S = python('mesh'), tot = (X: TankSetup) => demandOf(X, defaultProfile(), { now: Date.parse('2026-10-19') }).totals;
    const none = { ...S, tech: { rows: { heatlamp: 'none', thermostat: 'none', uvb: 'none', gauge: 'none', mist: 'none', timer: 'none' } } }, base = tot(S);
    expect(base.setupUsd - tot(none).setupUsd).toBeGreaterThan(100); // the dome and the UVB kit
    const dragged = { ...S, tech: withPlace(S, 'heatlamp', { wall: 'lid', at: 0.8, y: 0.3 }) };
    expect(tot(dragged)).toEqual(base);
    const mist = { ...S, tech: { ...techOf(S), rows: { ...techOf(S).rows, mist: 'mister' } } };
    expect(tot(mist).minPerWeek).toBeLessThan(base.minPerWeek);
  });
});
