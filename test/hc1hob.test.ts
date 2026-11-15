// Lane HC1 (R59): a hang-on-back filter moves the room wall out, and with a 3D background stays one rigid piece with a notch cut for it.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { buildGear } from '../src/render/gear3d';
import { backdropGeometry } from '../src/render/backdrop';
import { wallGap, wallGapNote } from '../src/scene/table';
import { hobReach, HOB_WALL_MARGIN } from '../src/scene/hobClear';
import type { TankSetup } from '../src/scene/types';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const scene = (filter: string, depth: number, gap?: number): TankSetup => {
  const sc = parseScene(JSON.parse(SCENES['planted'])).scene, S = sc.tanks[sc.active];
  S.backdrop = depth ? { kind: 'rock', depth, seed: 3 } : { kind: 'none', depth: 0, seed: 1 } as any;
  S.stand.show = false; S.wall.show = true; S.wall.side = 'back'; if (gap !== undefined) S.wall.gap = gap; else delete S.wall.gap;
  S.tech = { ...(S.tech ?? {}), rows: { filter, heater: 'none' }, place: { filter: { wall: 'back', at: 0.5 } } } as TankSetup['tech'];
  return S;
};
// (only the strainer's foot may differ in height: the substrate under it is read at another depth) extents of the gear's vertices at the back wall (z within 80 mm of the glass's inner face and behind it, right of the heater at the left end): the HOB and its intake
const bbox = (S: TankSetup) => { const b = new THREE.Box3(), v = new THREE.Vector3(); for (const m of buildGear(S, S.tank, [])) { if (m.renderOrder === 3.5) continue; const q = m.geometry.attributes.position; for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i).applyMatrix4(m.matrixWorld); if (v.z < -S.tank.D + 80) b.expandByPoint(v); } } return b; };

describe('HOB and the room wall', () => {
  it('the wall stands at least the HOB depth plus half an inch off the glass', () => {
    const S = scene('hob', 0), r = hobReach(S);
    expect(r).toBeGreaterThan(80);
    expect(wallGap(S)).toBeGreaterThanOrEqual(r + HOB_WALL_MARGIN - 1e-6);
    expect(wallGapNote(S)).toMatch(/HOB/);
  });
  it("never closer than the person's own gap; no HOB: unchanged; wall off: unchanged", () => {
    expect(wallGap(scene('hob', 0, 600))).toBe(600);
    expect(wallGapNote(scene('hob', 0, 600))).toBe('');
    expect(wallGap(scene('canister', 0))).toBe(50);
    const S = scene('hob', 0); S.wall.show = false; expect(wallGap(S)).toBe(50);
  });
});
describe('HOB with a 3D background', () => {
  it('the gear keeps the same extents with the background on and off, and registers two notches', () => {
    const a = bbox(scene('hob', 0)), b = bbox(scene('hob', 60));
    for (const k of ['x', 'y', 'z'] as const) { expect(Math.abs(b.min[k] - a.min[k]), 'min ' + k).toBeLessThan(k === 'y' ? 8 : 1.5); expect(Math.abs(b.max[k] - a.max[k]), 'max ' + k).toBeLessThan(1.5); }
    const ns = buildGear(scene('hob', 60), scene('hob', 60).tank, []).flatMap(m => m.userData.backdropNotches ?? []);
    expect(new Set(ns).size).toBe(2);
    expect(buildGear(scene('hob', 0), scene('hob', 0).tank, []).some(m => m.userData.backdropNotches)).toBe(false);
  });
  it('the wall is cut down to the glass inside a notch', () => {
    const S = scene('hob', 60), T = S.tank, n = { x0: 100, x1: 200, yMin: 150 };
    const g = backdropGeometry(T, S.backdrop!, S.render.rim, S.render.bgSides, [n])!, p = g.attributes.position;
    let inside = 0, deep = 0;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), out = p.getZ(i) + T.D;
      if (x >= n.x0 && x <= n.x1 && y >= n.yMin) { inside++; if (out > 2) deep++; }
    }
    expect(inside).toBeGreaterThan(20); expect(deep).toBe(0);
  });
});
