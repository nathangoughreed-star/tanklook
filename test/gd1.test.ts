// Lane GD1: picking gear in the view, heater orientation, arrow-key nudges (interact/gearDrag.ts, render/gearSel.ts).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { nudgePlace, orientOf, placeFor, snapLean, withOrient, withPlace } from '../src/interact/gearDrag';
import { buildGear, gearPicks, type GearPiece } from '../src/render/gear3d';
import { gearSel, onGearSel, setGearSel } from '../src/render/gearSel';
import { parseTech } from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';

const ex = (name: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[name])).scene; return sc.tanks[sc.active]; };
const pieces = (S: TankSetup) => buildGear(S, S.tank, [])[0].userData.gearPieces as GearPiece[];

describe('heater orientation', () => {
  it('snaps to the three the menu offers and reads them back', () => {
    expect([0, 10, 30, 45, 60, 70, 90, -50, -90].map(snapLean)).toEqual([0, 0, 45, 45, 45, 90, 90, -45, -90]);
    expect(orientOf(undefined)).toBe('vertical'); expect(orientOf(90)).toBe('horizontal'); expect(orientOf(45)).toBe('angled');
    expect(withOrient({ wall: 'left', at: 0.4, y: 0.5 }, 'angled')).toEqual({ wall: 'left', at: 0.4, y: 0.5, lean: 45 });
  });
  it('a dragged heater keeps the orientation the owner chose', () => {
    const S = ex('planted'), T = S.tank;
    const p = placeFor(S, new THREE.Ray(new THREE.Vector3(T.L * 0.5, T.H * 0.5, 2000), new THREE.Vector3(0, 0, -1)), 'glass', { wall: 'back', at: 0.5, lean: 45 })!;
    expect(p.lean).toBe(45);
  });
  it('the three orientations draw the heater upright, at 45 degrees and flat, on the same glass', () => {
    const base = Object.keys(SCENES).map(ex).find(S => S.tank.H > 450 && S.tank.L > 800 && gearPicks(S).some(p => p.row?.split('.')[0] === 'heater'))!; const row = gearPicks(base).find(p => p.row?.split('.')[0] === 'heater')!.row!;
    const tilt = (lean: number) => {
      const S = { ...base, tech: withPlace(base, row, { wall: 'back', at: 0.5, y: 0.5, lean }) };
      const kit = buildGear(S, S.tank, []); const ax = kit[0].userData.heaterAxes as THREE.Vector3[];
      return Math.acos(Math.min(1, Math.abs(ax[0].y))) * 180 / Math.PI;
    };
    expect(tilt(0)).toBeLessThan(5); expect(tilt(45)).toBeGreaterThan(35); expect(tilt(45)).toBeLessThan(55); expect(tilt(90)).toBeGreaterThan(85);
  });
  it('an angled spot survives save and load', () => {
    expect(parseTech({ rows: {}, place: { heater: { wall: 'left', at: 0.3, y: 0.6, lean: 45 } } })!.place).toEqual({ heater: { wall: 'left', at: 0.3, y: 0.6, lean: 45 } });
  });
});

describe('nudging', () => {
  it('0.25 in along the back glass is a share of its length; the glass is never left', () => {
    const S = ex('planted'), T = S.tank;
    const p = nudgePlace(S, { wall: 'back', at: 0.5, y: 0.5 }, 'glass', 6.35, 0);
    expect(p.at).toBeCloseTo(0.5 + 6.35 / T.L, 5); expect(p.wall).toBe('back');
    expect(nudgePlace(S, { wall: 'back', at: 0.999, y: 0.5 }, 'glass', 600, 0).at).toBe(1);
    expect(nudgePlace(S, { wall: 'back', at: 0.5, y: 0.99 }, 'glass', 0, 9999).y).toBe(1);
    expect(nudgePlace(S, { wall: 'back', at: 0.5, y: 0.01 }, 'glass', 0, -9999).y).toBe(0);
  });
  it('a rim piece slides along its wall only; side glass: right on screen is toward the back on the left glass, the front on the right', () => {
    const S = ex('planted');
    expect(nudgePlace(S, { wall: 'back', at: 0.4 }, 'rim', 0, 50).y).toBeUndefined();
    expect(nudgePlace(S, { wall: 'left', at: 0.5, y: 0.5 }, 'glass', 20, 0).at).toBeGreaterThan(0.5);
    expect(nudgePlace(S, { wall: 'right', at: 0.5, y: 0.5 }, 'glass', 20, 0).at).toBeLessThan(0.5);
  });
  it('floor gear stays on the substrate: shares are held inside the floor', () => {
    const S = ex('planted');
    const p = nudgePlace(S, { wall: 'floor', at: 0.95, y: 0.9 }, 'floor', 9999, -9999);
    expect(p.at).toBe(0.96); expect(p.y).toBe(0.94);
  });
  it('a nudge is saved with the spot and the drawn piece follows it', () => {
    const base = ex('planted'); delete base.tech;
    const hob = gearPicks(base).find(p => p.row === 'filter')!;
    const from = hob.place ? undefined : { wall: 'back' as const, at: 0.3 };
    const S = { ...base, tech: withPlace(base, 'filter', nudgePlace(base, from ?? { wall: 'back', at: 0.3 }, 'rim', 63.5, 0)) };
    const pc = pieces(S).find(p => p.row === 'filter')!; expect(pc.mount).toBe('rim');
    expect(S.tech!.place!.filter.at).toBeCloseTo(0.3 + 63.5 / base.tank.L, 5);
  });
});

describe('the picked piece', () => {
  it('is view state: set, read, announced once, cleared', () => {
    let n = 0; const off = onGearSel(() => n++);
    setGearSel({ vi: 0, row: 'heater', mount: 'glass' }); expect(gearSel()?.row).toBe('heater'); expect(n).toBe(1);
    setGearSel({ vi: 0, row: 'heater', mount: 'glass' }); expect(n).toBe(1); // same pick: no news
    setGearSel(null); expect(gearSel()).toBeNull(); expect(n).toBe(2); off();
  });
});
