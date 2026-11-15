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
    expect([0, 10, 30, 45, 60, 90, -50, -30, -90].map(snapLean)).toEqual([0, 0, 0, 90, 90, 90, -90, 0, -90]);
    expect(orientOf(undefined)).toBe('vertical'); expect(orientOf(90)).toBe('horizontal'); expect(orientOf(50)).toBe('horizontal');
    expect(withOrient({ wall: 'left', at: 0.4, y: 0.5 }, 'horizontal')).toEqual({ wall: 'left', at: 0.4, y: 0.5, lean: 90 });
  });
  it('a dragged heater keeps the orientation the owner chose', () => {
    const S = ex('planted'), T = S.tank;
    const p = placeFor(S, new THREE.Ray(new THREE.Vector3(T.L * 0.5, T.H * 0.5, 2000), new THREE.Vector3(0, 0, -1)), 'glass', { wall: 'back', at: 0.5, lean: 90 })!;
    expect(p.lean).toBe(90);
  });
  it('the two orientations draw the heater upright and flat on the same glass, a saved diagonal snaps', () => {
    const base = Object.keys(SCENES).map(ex).find(S => S.tank.H > 450 && S.tank.L > 800 && gearPicks(S).some(p => p.row?.split('.')[0] === 'heater'))!; const row = gearPicks(base).find(p => p.row?.split('.')[0] === 'heater')!.row!;
    const tilt = (lean: number) => {
      const S = { ...base, tech: withPlace(base, row, { wall: 'back', at: 0.5, y: 0.5, lean }) };
      const kit = buildGear(S, S.tank, []); const ax = kit[0].userData.heaterAxes as THREE.Vector3[];
      return Math.acos(Math.min(1, Math.abs(ax[0].y))) * 180 / Math.PI;
    };
    expect(tilt(0)).toBeLessThan(5); expect(tilt(90)).toBeGreaterThan(85); expect(tilt(-30)).toBeLessThan(5); expect(tilt(50)).toBeGreaterThan(85);
  });
  it('a heater spot survives save and load', () => {
    expect(parseTech({ rows: {}, place: { heater: { wall: 'left', at: 0.3, y: 0.6, lean: 90 } } })!.place).toEqual({ heater: { wall: 'left', at: 0.3, y: 0.6, lean: 90 } });
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

describe('heater faces: front glass and the bottom', () => {
  const base = () => Object.keys(SCENES).map(ex).find(S => S.tank.H > 450 && S.tank.L > 800 && gearPicks(S).some(p => p.row?.startsWith('heater')))!;
  it('a ray from behind lands on the front glass; one that leaves through the floor lays a heater on the substrate', () => {
    const S = base(), T = S.tank;
    const behind = placeFor(S, new THREE.Ray(new THREE.Vector3(T.L * 0.4, T.H * 0.5, -3000), new THREE.Vector3(0, 0, 1)), 'glass', undefined, [0, 0], true)!;
    expect(behind.wall).toBe('front'); expect(behind.at).toBeCloseTo(0.4, 2);
    const down = new THREE.Ray(new THREE.Vector3(T.L * 0.3, 3000, -T.D / 2), new THREE.Vector3(0, -1, 0));
    const fl = placeFor(S, down, 'glass', undefined, [0, 0], true)!; expect(fl.wall).toBe('floor');
    // a non-heater on glass never takes the floor
    expect(placeFor(S, down, 'glass')!.wall).not.toBe('floor');
  });
  it('a front-glass heater and a floor heater are drawn: inside the tank, in front of / on the ground', () => {
    const b = base(), row = gearPicks(b).find(p => p.row?.startsWith('heater'))!.row!, T = b.tank;
    const box = (place: Parameters<typeof withPlace>[2]) => { const S = { ...b, tech: withPlace(b, row, place) }; return pieces(S).find(p => p.row === row)!.box; };
    const fr = box({ wall: 'front', at: 0.5, y: 0.5 }); expect(fr.min.z).toBeGreaterThan(-60); expect(fr.max.z).toBeLessThan(40); expect(fr.getCenter(new THREE.Vector3()).x).toBeCloseTo(T.L / 2, -2);
    const fl = box({ wall: 'floor', at: 0.5, y: 0.5 }), sz = fl.getSize(new THREE.Vector3());
    expect(sz.x).toBeGreaterThan(sz.y * 2); // lying flat
    expect(-fl.getCenter(new THREE.Vector3()).z).toBeCloseTo(T.D / 2, -2);
  });
  it('front-glass spots save and load; arrows slide along the front', () => {
    expect(parseTech({ rows: {}, place: { heater: { wall: 'front', at: 0.3, y: 0.5 } } })!.place!.heater.wall).toBe('front');
    expect(nudgePlace(base(), { wall: 'front', at: 0.5, y: 0.5 }, 'glass', 6.35, 0).at).toBeGreaterThan(0.5);
  });
});

describe('click cycle and tight boxes', () => {
  it('the second click at one spot with something behind skips the gear; a third returns; elsewhere or later does not', async () => {
    const { cycleSkip, cycleNote } = await import('../src/interact/gearDrag');
    const hit = (behind: boolean) => ({ vp: { i: 0 } as never, itemId: behind ? 5 : null, fishId: null });
    cycleNote(0, 100, 100, 'gear');
    expect(cycleSkip(hit(true), 102, 99)).toBe(true);
    expect(cycleSkip(hit(false), 100, 100)).toBe(false); // nothing behind: the gear stays picked
    expect(cycleSkip(hit(true), 140, 100)).toBe(false);
    cycleNote(0, 100, 100, 'under'); expect(cycleSkip(hit(true), 100, 100)).toBe(false); // third click: the gear again
  });
  it('the outline box is the body: smaller than the grab box for the CO2 set and the HOB', () => {
    const S = ex('planted'), all = pieces({ ...S, tech: { ...(S.tech ?? { rows: {} }), rows: { ...(S.tech?.rows ?? {}), filter: 'hob' } } });
    const vol = (b: THREE.Box3) => { const s = b.getSize(new THREE.Vector3()); return s.x * s.y * s.z; };
    for (const p of all) if (p.core) expect(vol(p.core)).toBeLessThanOrEqual(vol(p.box) + 1);
    expect(all.some(p => p.core && vol(p.core) < vol(p.box) * 0.9)).toBe(true);
  });
});

describe('rim gear: corners, braces, other gear, which edge', () => {
  it('clearSpot holds a body inside the limits and off blocked spans, taking the nearest free spot', async () => {
    const { clearSpot } = await import('../src/interact/gearDrag');
    const r = { lo: 10, hi: 610, hw: 60, blocked: [[290, 310]] as [number, number][] };
    expect(clearSpot(5, r)).toBe(70); expect(clearSpot(9999, r)).toBe(550); // corners
    expect(clearSpot(150, r)).toBe(150);
    expect(clearSpot(300, r)).toBe(230); // off the strip at 290..310 on the near side...
    expect(clearSpot(330, r)).toBe(370); // ...or the far side, whichever is nearer
    expect(clearSpot(300, { ...r, hi: 130 })).toBe(70); // no room: held inside
  });
  it('a HOB clamps clear of a cross brace strip and another piece on the same rim', async () => {
    const { rimFor, clearSpot } = await import('../src/interact/gearDrag');
    const { setPieceSource } = await import('../src/render/gearSel');
    const S = ex('planted'); S.render = { ...S.render, rim: false, brace: { width: 40, thickness: 6, cross: 1, crossWidth: 40 } };
    const T = S.tank, mk = (row: string, x0: number, x1: number) => ({ row, id: row, mount: 'rim' as const, box: new THREE.Box3(new THREE.Vector3(x0, 0, -T.D - 60), new THREE.Vector3(x1, 100, -T.D)) });
    setPieceSource(() => [mk('filter', 100, 200), mk('skimmer', 400, 440)]);
    const r = rimFor(S, 0, 'filter', 'back');
    expect(r.lo).toBeGreaterThanOrEqual(44); expect(r.blocked.length).toBe(2);
    const c = clearSpot(T.L / 2, r), strip = [T.L / 2 - 20, T.L / 2 + 20];
    expect(c + r.hw <= strip[0] + 0.2 * r.hw + 1e-6 || c - r.hw >= strip[1] - 0.2 * r.hw - 1e-6).toBe(true);
    setPieceSource(() => []);
  });
  it('a HOB hung on an end glass is drawn there, and no longer pushes the back wall out', async () => {
    const { hobWallGap } = await import('../src/scene/hobClear');
    const base = ex('planted'); delete base.tech; base.wall = { ...base.wall, show: true, side: 'back' };
    const hob = { ...base, tech: { rows: { ...techOfRows(base), filter: 'hob' } } } as TankSetup;
    const g0 = hobWallGap(hob);
    const side = { ...hob, tech: withPlace(hob, 'filter', { wall: 'left', at: 0.5 }) };
    expect(hobWallGap(side)).toBeLessThan(g0 || 1);
    const pc = pieces(side).find(p => p.row === 'filter')!; expect(pc.box.getCenter(new THREE.Vector3()).x).toBeLessThan(hob.tank.L * 0.2); // against the left glass
  });
});
function techOfRows(S: TankSetup) { return (S.tech?.rows ?? {}) as Record<string, string>; }
