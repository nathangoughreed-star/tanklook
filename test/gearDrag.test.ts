// Lane TG: dragging the tech gear, gated by how it mounts (interact/gearDrag.ts).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { placeFor, withPlace } from '../src/interact/gearDrag';
import { mountOf, gearPicks } from '../src/render/gear3d';
import { techOf } from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';

const ex = (name: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[name])).scene; return sc.tanks[sc.active]; };
const fromFront = (x: number, y: number, S: TankSetup) => new THREE.Ray(new THREE.Vector3(x, y, 2000), new THREE.Vector3(0, 0, -1).add(new THREE.Vector3(0, 0, 0)).normalize());

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
});
