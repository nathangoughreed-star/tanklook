import { describe, expect, it } from 'vitest';
import { personSpot } from '../src/render/build';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { eyeClear } from '../src/scene/orbit';
import { WALL_GAP, glassThickness } from '../src/scene/physics';
import { normTank, offsetRing } from '../src/scene/shape';
import { cornerWalls, fitTable, roomBox, tableCentre, tableRange, tableRing, wallPlane } from '../src/scene/table';
import type { TankSetup } from '../src/scene/types';
import { parseScene } from '../src/scene/validate';

const tableSetup = (shape: 'rect' | 'round' = 'rect', L = 1200, D = 600): TankSetup => {
  const S = defaultSetup(); S.stand.show = true; S.stand.style = 'table'; S.stand.table = { shape, L, D: shape === 'round' ? L : D, x: 0, z: 0 };
  fitTable(S); return S;
};
/** Every point of the tank's rim outline lies on the table top. */
const onTop = (S: TankSetup) => {
  const T = S.tank, tb = S.stand.table, [cx, cd] = tableCentre(T, tb), t = glassThickness(T, S.render.glass) + 8;
  return offsetRing(T, t).every(([x, d]) => (tb.shape === 'round' ? Math.hypot(x - cx, d - cd) <= tb.L / 2 + 0.02
    : Math.abs(x - cx) <= tb.L / 2 + 0.02 && Math.abs(d - cd) <= tb.D / 2 + 0.02));
};

describe('table stand', () => {
  it('grows to hold the tank, never shrinks, and round keeps D = L', () => {
    const S = tableSetup('rect', 100, 100), t = glassThickness(S.tank, S.render.glass) + 8;
    expect(S.stand.table.L).toBeCloseTo(Math.ceil(S.tank.L + 2 * t), 6); expect(S.stand.table.D).toBeCloseTo(Math.ceil(S.tank.D + 2 * t), 6);
    const big = tableSetup('rect', 2000, 900); expect(big.stand.table.L).toBe(2000); expect(big.stand.table.D).toBe(900);
    const R = tableSetup('round', 100); expect(R.stand.table.D).toBe(R.stand.table.L); expect(onTop(R)).toBe(true);
  });
  it('clamps the tank onto the top, whatever the offset', () => {
    for (const shape of ['rect', 'round'] as const) for (const [x, z] of [[5000, 0], [0, -5000], [-3000, 3000], [120, 40]]) {
      const S = tableSetup(shape); S.stand.table.x = x; S.stand.table.z = z; fitTable(S);
      expect(onTop(S)).toBe(true);
    }
  });
  it('slider ranges are exactly the reachable offsets (rect) and stay on the top (round)', () => {
    const S = tableSetup('rect'), r = tableRange(S);
    S.stand.table.z = r.z1; fitTable(S); expect(S.stand.table.z).toBeCloseTo(r.z1, 6);
    S.stand.table.z = r.z1 + 10; fitTable(S); expect(S.stand.table.z).toBeCloseTo(r.z1, 6);
    const R = tableSetup('round'), rr = tableRange(R);
    R.stand.table.x = rr.x1; expect(onTop(R)).toBe(true); expect(rr.x1).toBeGreaterThan(0);
  });
  it('works for shaped tanks (round tank on a round table pushed to the back)', () => {
    const S = tableSetup('round', 900); S.tank = normTank({ L: 500, H: 450, D: 1, shape: 'round' }); S.stand.table.z = 1e4; fitTable(S);
    expect(onTop(S)).toBe(true); expect(S.stand.table.z).toBeGreaterThan(100);
  });
  it('moves the wall to the table edge and keeps the eye and the person clear of it', () => {
    const S = tableSetup('rect', 1400, 700); S.stand.table.z = -1e4; fitTable(S); // tank at the front: the table runs back
    S.wall.show = true; S.wall.side = 'back';
    const T = S.tank, ring = tableRing(T, S.stand.table), back = Math.max(...ring.map(p => p[1]));
    expect(wallPlane(S, T).back).toBeCloseTo(-back - WALL_GAP, 6);
    expect(roomBox(S, T).d1).toBeCloseTo(back, 6);
    expect(eyeClear(S, { ...S.camera, az: 0 })).toBe(true);
    S.wall.side = 'right'; S.person.show = true; S.person.side = 'right';
    const p = personSpot(S, T);
    expect(p.x + p.w / 2).toBeLessThanOrEqual(wallPlane(S, T).right); // they swapped sides or stand clear of the wall
    S.wall.show = false; S.person.side = 'left';
    const q = personSpot(S, T), left = Math.min(...ring.map(p => p[0]));
    expect(q.x + q.w / 2).toBeLessThan(left); // beside the table, not on it
  });
  it('round-trips through a file, and older files get a default table', () => {
    const sc = defaultScene(); sc.tanks[0] = tableSetup('round', 1100); sc.tanks[0].stand.table.x = 80; fitTable(sc.tanks[0]);
    const back = parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].stand;
    expect(back).toEqual(sc.tanks[0].stand);
    const old = JSON.parse(JSON.stringify(defaultScene())); delete old.tanks[0].stand.table;
    expect(parseScene(old).scene.tanks[0].stand.table).toEqual(defaultSetup().stand.table);
  });
});

describe('room corner and distance to wall', () => {
  const pie = () => { const S = defaultSetup(); S.tank = normTank({ L: 1, H: 450, D: 600, shape: 'pie', pieDeg: 90 }); S.wall = { show: true, side: 'corner', color: '#ffffff' }; return S; };
  it('a 90° pie slice sits with its flat panes the gap off the two corner walls, corner behind the apex', () => {
    const S = pie(), T = S.tank, t = glassThickness(T, S.render.glass), cw = cornerWalls(S, T), k = Math.SQRT1_2;
    // the middle of each flat pane (inner face) is the glass plus the gap off its wall
    const dm = -T.D * (2 - k) / 2;
    for (const [w, p] of [[cw.left, [T.L / 4, dm]], [cw.right, [T.L * 0.75, dm]]] as const)
      expect(w.n[0] * p[0] + w.n[1] * p[1] - w.c).toBeCloseTo(WALL_GAP + t, 0);
    expect(cw.corner[0]).toBeCloseTo(T.L / 2, 6);
    expect(cw.corner[1]).toBeCloseTo(-T.D - (WALL_GAP + t) / k, 0);
  });
  it('the gap moves every wall placement; the eye and the person stay on the room side', () => {
    const S = pie(); S.wall.gap = 0;
    const T = S.tank, t = glassThickness(T, S.render.glass);
    expect(cornerWalls(S, T).corner[1]).toBeCloseTo(-T.D - (t + 1) / Math.SQRT1_2, 0); // 1 mm minimum
    S.wall.side = 'back'; S.wall.gap = 300; expect(wallPlane(S, T).back).toBeCloseTo(-T.D - t - 300, 6);
    S.wall.side = 'corner'; S.camera = { ...S.camera, az: 180 }; expect(eyeClear(S, S.camera)).toBe(false);
    S.camera = { ...S.camera, az: 0 }; expect(eyeClear(S, S.camera)).toBe(true);
    S.person.show = true; const p = personSpot(S, T), cw = cornerWalls(S, T);
    for (const w of [cw.left, cw.right]) expect(w.n[0] * p.x + w.n[1] * p.z).toBeGreaterThanOrEqual(w.c);
  });
  it('corner and gap survive a file round trip; older files keep the 50 mm gap', () => {
    const sc = defaultScene(); sc.tanks[0].wall = { show: true, side: 'corner', color: '#ffffff', gap: 120 };
    const back = parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].wall;
    expect(back.side).toBe('corner'); expect(back.gap).toBe(120);
    sc.tanks[0].wall = { show: true, side: 'back', color: '#ffffff' };
    expect(parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0].wall.gap).toBeUndefined();
  });
});
