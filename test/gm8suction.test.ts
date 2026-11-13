// Lane GM8: suction-cup gear sticks only to glass (never to a 3D backdrop), and the drop checker hangs far from the CO2 diffuser.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { applyPreset } from '../src/scene/tech';
import { buildGear, gearPicks } from '../src/render/gear3d';
import type { TankSetup } from '../src/scene/types';

const IN = 25.4;
const ex = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES['planted'])).scene; return sc.tanks[sc.active]; };
const tank = (S: TankSetup, L: number, D: number, H: number, backdrop: boolean): TankSetup =>
  ({ ...S, tank: { ...S.tank, L: L * IN, D: D * IN, H: H * IN, shape: 'rect' }, backdrop: backdrop ? { kind: 'rock', depth: 90, seed: 3 } : { kind: 'none', depth: 0, seed: 1 }, tech: applyPreset(S, 'hightech') });
const cupsOf = (S: TankSetup) => {
  const picks = [...gearPicks(S), { id: 'co2' }].filter((p, i, a) => a.findIndex(q => q.id === p.id) === i);
  const ms = buildGear(S, S.tank, [], picks);
  return (ms[0]?.userData.cups ?? []) as { wall: string; p: THREE.Vector3 }[];
};
const SIZES: [string, number, number, number][] = [['20 gal', 24, 12, 16], ['40 gal', 36, 18, 16], ['75 gal', 48, 18, 21]];

describe('GM8 suction mounts', () => {
  for (const [name, L, D, H] of SIZES) {
    it(`${name}: with a 3D backdrop no cup is on the back wall; every cup is on a side glass plane`, () => {
      const S = tank(ex(), L, D, H, true), T = S.tank, cups = cupsOf(S);
      expect(cups.length).toBeGreaterThan(1);
      for (const c of cups) {
        expect(c.wall).not.toBe('back');
        expect(Math.min(Math.abs(c.p.x), Math.abs(c.p.x - T.L))).toBeLessThan(1);
      }
    });
    it(`${name}: no backdrop: cups sit on the back or side glass plane`, () => {
      const S = tank(ex(), L, D, H, false), T = S.tank, cups = cupsOf(S);
      expect(cups.length).toBeGreaterThan(1);
      for (const c of cups) {
        const d = c.wall === 'back' ? Math.abs(c.p.z + T.D) : Math.min(Math.abs(c.p.x), Math.abs(c.p.x - T.L));
        expect(d).toBeLessThan(1);
      }
    });
    for (const bd of [true, false]) {
      it(`${name}${bd ? ' with 3D backdrop' : ''}: the drop checker is at least half the tank length from the diffuser`, () => {
        const S = tank(ex(), L, D, H, bd), T = S.tank, cups = cupsOf(S);
        // the co2 builder pushes the diffuser cup first, the drop checker's last
        const dif = cups[cups.length - 2], chk = cups[cups.length - 1];
        expect(Math.hypot(dif.p.x - chk.p.x, dif.p.z - chk.p.z)).toBeGreaterThanOrEqual(T.L * 0.5);
      });
    }
  }
});

// Lane GM8b: heaters are vertical or horizontal, never diagonal (auto-placement, saved tilts, every pane, with and without a backdrop).
describe('GM8b heater axes', () => {
  const axes = (S: TankSetup, lean?: number) => {
    const place = lean == null ? undefined : { wall: 'left' as const, at: 0.5, lean };
    const ms = buildGear(S, S.tank, [], [{ id: 'heater-200', watts: 200, ...(place ? { place: { wall: 'left' as const, u: 100, lean } } : {}) }]);
    return (ms[0]?.userData.heaterAxes ?? []) as THREE.Vector3[];
  };
  for (const [name, L, D, H] of SIZES) for (const bd of [true, false]) for (const lean of [undefined, 20, -30, 50, 80]) {
    it(`${name}${bd ? ' with backdrop' : ''}${lean != null ? ` lean ${lean}` : ''}: axis within 1 degree of vertical or horizontal`, () => {
      const ax = axes(tank(ex(), L, D, H, bd), lean);
      expect(ax.length).toBe(1);
      const a = Math.abs(Math.asin(Math.min(1, Math.abs(ax[0].y)))) * 180 / Math.PI; // 0 = horizontal, 90 = vertical
      expect(Math.min(a, 90 - a)).toBeLessThan(1);
    });
  }
});
