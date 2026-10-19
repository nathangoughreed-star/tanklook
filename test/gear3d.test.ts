// Lane TG: the tech gear drawn in the tank (render/gear3d.ts).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { applyPreset } from '../src/scene/tech';
import { GEAR_LOOKS, buildGear, gearKey, gearPicks, gearSide, heaterLength } from '../src/render/gear3d';
import type { TankSetup } from '../src/scene/types';

const ex = (name: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[name])).scene; return sc.tanks[sc.active]; };
const box = (ms: THREE.Mesh[]) => { const b = new THREE.Box3(); for (const m of ms) b.expandByObject(m); return b; };

describe('gear3d', () => {
  it('draws what the Tech presets pick, and an old file its inferred gear', () => {
    const S = ex('planted');
    expect(gearPicks({ ...S, tech: undefined }).map(p => p.id)).toEqual(expect.arrayContaining(['hob-l']));
    expect(gearPicks({ ...S, tech: applyPreset(S, 'walstad') })).toEqual([]);
    const hi = gearPicks({ ...S, tech: applyPreset(S, 'hightech') }).map(p => p.id);
    expect(hi).toEqual(expect.arrayContaining(['co2'])); expect(hi.some(id => id.startsWith('canister'))).toBe(true);
    const R = ex('reef'), sps = gearPicks({ ...R, tech: applyPreset(R, 'sps') });
    expect(sps.map(p => p.id)).toEqual(expect.arrayContaining(['sump', 'wavemaker'])); expect(sps.find(p => p.id.startsWith('heater'))?.n).toBe(2);
    expect(gearPicks({ ...S, water: { ...S.water, on: false } })).toEqual([]);
  });

  it('merges a whole set into at most four meshes, inside the room and above the floor', () => {
    const S = ex('planted'), T = S.tank;
    for (const p of ['midplanted', 'hightech', 'lowtech']) {
      const ms = buildGear({ ...S, tech: applyPreset(S, p) }, T, []);
      expect(ms.length).toBeGreaterThan(0); expect(ms.length).toBeLessThanOrEqual(4);
      const b = box(ms); expect(b.min.x).toBeGreaterThan(-400); expect(b.max.x).toBeLessThan(T.L + 400); expect(b.max.y).toBeLessThan(T.H + 400);
    }
  });

  it('sizes from the class: a bigger HOB and a hotter heater are bigger', () => {
    const S = ex('planted'), w = (id: string) => box(buildGear(S, S.tank, [], [{ id }], 'left')).getSize(new THREE.Vector3());
    expect(w('hob-l').x).toBeGreaterThan(w('hob-s').x);
    expect(heaterLength(300)).toBeGreaterThan(heaterLength(50));
  });

  it('sits in the corner away from the hardscape, and keeps clear of it', () => {
    const S = ex('planted'), T = S.tank;
    const rock = new THREE.Box3(new THREE.Vector3(20, 0, -T.D), new THREE.Vector3(T.L * 0.3, 200, -T.D + 150));
    expect(gearSide(T, [rock])).toBe('right'); expect(gearSide(T, [])).toBe('left');
    // a rock against the back glass in the left corner: the heater (left) moves along the wall past it
    const ms = buildGear(S, T, [rock], [{ id: 'heater-100' }], 'left'), wet = ms.find(m => !m.userData.room && m.material instanceof THREE.MeshBasicMaterial)!;
    expect(new THREE.Box3().setFromObject(wet).min.x).toBeGreaterThan(rock.max.x - 5);
  });

  it('follows the owner placement and rebuilds when the hardscape moves', () => {
    const S = ex('planted'), t = applyPreset(S, 'midplanted');
    const right = gearPicks({ ...S, tech: { ...t, place: { filter: { wall: 'back', at: 0.9 } } } }).find(p => p.id.startsWith('hob'))!;
    expect(right.place?.wall).toBe('back'); expect(right.place!.u).toBeCloseTo(0.9 * S.tank.L, 0);
    expect(gearKey(S, ['a'])).not.toBe(gearKey(S, ['b']));
  });

  it('has a review model for every class', () => {
    expect(GEAR_LOOKS.length).toBe(21);
  });
});
