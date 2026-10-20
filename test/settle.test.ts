import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { itemMesh, settleOn } from '../src/render/items';
import { defaultScene } from '../src/scene/defaults';
import { makeItem } from '../src/scene/items';
import { groundHeight } from '../src/scene/terrain';
import type { Item, TankSetup } from '../src/scene/types';

/** A tank whose substrate rises from `lo` mm at the left to `hi` at the right, holding `make`'s piece. */
function sloped(lo: number, hi: number, make: (S: TankSetup) => Item): [TankSetup, Item] {
  const S = defaultScene().tanks[0];
  S.terrain.on = false;
  Object.assign(S.substrate, { show: true, fl: lo, bl: lo, fr: hi, br: hi });
  const it = make(S);
  S.items = [it];
  return [S, it];
}
/** The lowest point of the piece's mesh near each of its two ends (outer fifth of its length along x), less the ground there. */
function endGaps(S: TankSetup, it: Item) {
  const m = itemMesh(S, S.tank, it)!; m.updateMatrixWorld(true);
  const pos = m.geometry.attributes.position, v = new THREE.Vector3(), pts: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).clone());
  const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), cut = (x1 - x0) / 5;
  const gap = (near: (p: THREE.Vector3) => boolean) => Math.min(...pts.filter(near).map(p => p.y - groundHeight(S, S.tank, p.x, -p.z)));
  return [gap(p => p.x < x0 + cut), gap(p => p.x > x1 - cut)];
}

describe('hardscape lies along the substrate (2026-10-20)', () => {
  it('a half log across a slope tips with it, both ends resting on the ground', () => {
    const [S, log] = sloped(30, 130, S => makeItem(S.tank, 'halflog', 1, 5, S.tank.L / 2, S.tank.D / 2, { size: 300 }, S));
    const st = settleOn(S, S.tank, log);
    expect(st.tilt).toBeGreaterThan(3);
    for (const g of endGaps(S, log)) expect(Math.abs(g)).toBeLessThan(12);
  });
  it('turned a quarter, the slope runs along its width and pitches it instead', () => {
    const [S, log] = sloped(30, 130, S => makeItem(S.tank, 'halflog', 1, 5, S.tank.L / 2, S.tank.D / 2, { size: 300, yaw: 90 }, S));
    const st = settleOn(S, S.tank, log);
    expect(Math.abs(st.pitch)).toBeGreaterThan(3);
    expect(st.tilt).toBe(0);
  });
  it('on level ground, stacked, or stood up, a piece keeps its own turn', () => {
    const [S, log] = sloped(60, 60, S => makeItem(S.tank, 'halflog', 1, 5, S.tank.L / 2, S.tank.D / 2, { size: 300 }, S));
    expect(settleOn(S, S.tank, log)).toEqual({ pitch: log.pitch, tilt: log.tilt, dy: 0 });
    const [S2, up] = sloped(30, 130, S => makeItem(S.tank, 'corkflat', 1, 5, S.tank.L / 2, S.tank.D / 2, { size: 300, tilt: 90 }, S));
    expect(settleOn(S2, S2.tank, up)).toEqual({ pitch: up.pitch, tilt: up.tilt, dy: 0 });
    const [S3, high] = sloped(30, 130, S => makeItem(S.tank, 'halflog', 1, 5, S.tank.L / 2, S.tank.D / 2, { size: 300, lift: 40 }, S));
    expect(settleOn(S3, S3.tank, high)).toEqual({ pitch: high.pitch, tilt: high.tilt, dy: 0 });
  });
});
