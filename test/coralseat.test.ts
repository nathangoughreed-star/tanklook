import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SEAT_SINK, coralSeat, itemMesh, seatCorals } from '../src/render/items';
import { defaultScene } from '../src/scene/defaults';
import { itemDims, makeItem } from '../src/scene/items';
import { Store } from '../src/scene/store';
import { groundHeight } from '../src/scene/terrain';
import type { Item, TankSetup } from '../src/scene/types';

/** A salt tank with the given pieces. */
function tank(items: (S: TankSetup) => Item[]): TankSetup {
  const s = defaultScene(), S = s.tanks[0];
  S.water.salt = true; S.items = items(S);
  return S;
}
const meshes = (S: TankSetup, keep: (it: Item) => boolean) => S.items.filter(keep).map(it => itemMesh(S, S.tank, it)!).map(m => (m.updateMatrixWorld(true), m));
/** Height of the rock surface straight under (x, depth), looking down from the sky; -Infinity = none. */
function surface(rocks: THREE.Object3D[], x: number, depth: number) {
  return new THREE.Raycaster(new THREE.Vector3(x, 5000, -depth), new THREE.Vector3(0, -1, 0)).intersectObjects(rocks, false)[0]?.point.y ?? -Infinity;
}
/**
 * A coral's base against the rock under its foot: `touch` = base minus the highest rock point under the middle of its
 * foot (it rests there, SEAT_SINK in); `mid` = base minus the rock straight under its centre (on a slope the foot rests on
 * its uphill edge, so the centre stands a little above the rock: at most the slope over the foot's half-width).
 */
function gaps(S: TankSetup, c: Item, rocks: THREE.Object3D[]) {
  const base = groundHeight(S, S.tank, c.x, c.depth) + c.lift, r = itemDims(c)[0] * 0.08;
  const high = Math.max(...[[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].map(([dx, dd]) => surface(rocks, c.x + dx, c.depth + dd)));
  return { touch: base - high, mid: base - surface(rocks, c.x, c.depth) };
}

describe('corals sit on the rock (lane Z, 2026-10-14)', () => {
  it('a coral over a tipped rock is seated with its base within a few mm of the surface under it', () => {
    for (const [pitch, tilt] of [[25, 0], [0, -30], [20, 25], [-15, 40]]) {
      const S = tank(S => {
        const rock = makeItem(S.tank, 'liverock', 1, 7, 300, 200, { size: 200, pitch, tilt }, S);
        // the reef layout's guess: the rock's top from its box
        const guess = itemDims(rock)[1] * 0.8;
        return [rock, makeItem(S.tank, 'acropora', 2, 3, 310, 205, { lift: guess }, S)];
      });
      seatCorals(S);
      const c = S.items[1], { touch, mid } = gaps(S, c, meshes(S, it => it.kind === 'stone'));
      expect(c.lift).toBeGreaterThan(0);
      expect(Math.abs(touch + SEAT_SINK)).toBeLessThan(1); // resting on it, a little in
      expect(mid).toBeGreaterThan(-SEAT_SINK - 1);          // not buried
      expect(mid).toBeLessThan(12);                          // and not floating
    }
  });

  it('dropped on rock it rests on the rock; dropped on sand it goes to the ground', () => {
    const S = tank(S => [makeItem(S.tank, 'liverock', 1, 7, 300, 200, { size: 200, tilt: 20 }, S), makeItem(S.tank, 'montipora', 2, 3, 600, 200, {}, S)]);
    const rocks = meshes(S, it => it.kind === 'stone'), c = S.items[1];
    // on the rock: the pointer's point is on the rock's top
    c.x = 300; c.lift = coralSeat(S, c, rocks, surface(rocks, 300, 200) + 1);
    const { touch, mid } = gaps(S, c, rocks);
    expect(c.lift).toBeGreaterThan(0);
    expect(Math.abs(touch + SEAT_SINK)).toBeLessThan(1);
    expect(mid).toBeLessThan(12);
    // on the sand, well clear of the rock
    const g2 = groundHeight(S, S.tank, 800, 200);
    expect(coralSeat(S, c, rocks, g2 + 1, 800, 200)).toBe(0);
  });

  it('dropped on a ledge under a higher rock it stays on the ledge, not on top of the pile', () => {
    const S = tank(S => {
      const low = makeItem(S.tank, 'liverock', 1, 7, 300, 200, { size: 260 }, S);
      const high = makeItem(S.tank, 'liverock', 2, 9, 340, 210, { size: 150, lift: itemDims(low)[1] * 0.85 }, S);
      return [low, high, makeItem(S.tank, 'mushroom', 3, 3, 300, 200, {}, S)];
    });
    const rocks = meshes(S, it => it.kind === 'stone'), c = S.items[2];
    const x = 230, d = 200, ledge = new THREE.Raycaster(new THREE.Vector3(x, 5000, -d), new THREE.Vector3(0, -1, 0)).intersectObject(rocks[0], false)[0].point.y;
    const lift = coralSeat(S, c, rocks, ledge + 1, x, d);
    expect(groundHeight(S, S.tank, x, d) + lift).toBeLessThan(ledge + 6);
    expect(lift).toBeGreaterThan(0);
  });

  it('a seated drag is one undo step back to where the coral was', () => {
    const st = new Store(defaultScene());
    st.edit(t => { t.water.salt = true; t.items = [makeItem(t.tank, 'liverock', 1, 7, 300, 200, { size: 200 }, t), makeItem(t.tank, 'acropora', 2, 3, 700, 200, {}, t)]; });
    st.seal();
    const before = { ...st.tank.items[1] }, rocks = meshes(st.tank, it => it.kind === 'stone');
    for (const x of [650, 500, 380, 300]) st.edit(t => {
      const c = t.items[1]; c.x = x;
      c.lift = coralSeat(t, c, rocks, surface(rocks, x, 200) + 1);
    }, { coalesce: 'item-drag' });
    st.seal();
    expect(st.tank.items[1].lift).toBeGreaterThan(0);
    st.undo();
    expect(st.tank.items[1]).toEqual(before);
  });
});
