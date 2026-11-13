// Lane BD2 (2026-11-13, request R33): bottom dwellers rest ON the embed berm, not inside it.
import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildTank } from '../src/render/build';
import { FX_DEFAULT, setFx } from '../src/render/fx';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';
import planted4 from '../research/visual/vf0/scenes/planted4.json';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

afterEach(() => setFx({ embed: FX_DEFAULT.embed }));

/** One rock mid-tank; a bottom fish at each given offset (mm from the rock's middle along x). Returns each fish's height on the floor. */
function fishY(embed: boolean, offsets: number[]) {
  setFx({ embed, contact: true, ground: true });
  const S = structuredClone(parseScene(structuredClone(planted4) as never).scene.tanks[0]) as TankSetup;
  const rock = S.items.find(i => i.kind === 'wood' || i.kind === 'stone')!, cory = S.fish.find(f => f.species === 'bronzecory')!;
  S.items = [{ ...structuredClone(rock), id: 900, x: S.tank.L / 2, depth: S.tank.D / 2, lift: 0, size: 220, yaw: 0 }];
  S.fish = offsets.map((o, i) => ({ ...structuredClone(cory), id: 800 + i, x: S.tank.L / 2 + o, depth: S.tank.D / 2, y: 0, yaw: 90, pitch: 0, roll: 0 }));
  const b = buildTank({ ...S, units: 'in' } as TankSetup & { units: 'in' }, S.tank, null), ys: number[] = [];
  const cards: THREE.Object3D[] = [];
  b.scene.traverse(o => { if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).material && ((o as THREE.Mesh).material as THREE.Material).userData?.fishCard) cards.push(o); });
  for (const c of cards.filter(o => o.parent?.type === 'Scene')) ys.push(c.position.y);
  return ys;
}

describe('BD2 bottom dwellers and the embed berm', () => {
  it('a fish resting by an embedded piece stands on the berm; far from it nothing changes', () => {
    const near = [120, 135, 150, 170], far = [600];
    const off = fishY(false, [...near, ...far]), on = fishY(true, [...near, ...far]);
    expect(off).toHaveLength(5);
    const rises = on.map((y, i) => y - off[i]);
    expect(Math.max(...rises.slice(0, 4))).toBeGreaterThan(1); // at least 1 mm up on the berm (berm is 2-9 mm)
    expect(Math.min(...rises.slice(0, 4))).toBeGreaterThanOrEqual(-0.001); // never lower than the old flat ground
    expect(Math.abs(rises[4])).toBeLessThan(0.001); // far away: untouched
  });
});
