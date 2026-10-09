import { describe, expect, it } from 'vitest';
import { personSpot } from '../src/render/build';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { eyeClear } from '../src/scene/orbit';
import { WALL_GAP, glassThickness } from '../src/scene/physics';
import { normTank, offsetRing } from '../src/scene/shape';
import { fitTable, roomBox, tableCentre, tableRange, tableRing, wallPlane } from '../src/scene/table';
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
