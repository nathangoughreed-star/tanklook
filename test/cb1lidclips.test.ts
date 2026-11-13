// Lane CB1 part 3: a rimless tank's glass lid is 1/4 in short of the opening and rests on acrylic clips.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { lidClipBoxes, clipLid, LID_SHORT, LID_CLIP_DROP } from '../src/render/lidClips';
import { lidTop } from '../src/render/gear/dry';
import { buildTank } from '../src/render/build';
import type { TankSetup } from '../src/scene/types';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const setup = (rim: boolean, lid: 'glass' | 'open' | 'mesh' = 'glass'): TankSetup => { const sc = parseScene(JSON.parse(SCENES['planted'])).scene, S = sc.tanks[sc.active]; S.render.rim = rim; S.lid = lid; return S; };

describe('glass lid clips', () => {
  it('only for a glass lid on a rimless rectangular tank', () => {
    expect(clipLid(setup(false), setup(false).tank)).toBe(true);
    expect(clipLid(setup(true), setup(true).tank)).toBe(false);
    expect(clipLid(setup(false, 'mesh'), setup(false).tank)).toBe(false);
    expect(clipLid(setup(false, 'open'), setup(false).tank)).toBe(false);
  });
  it('4 corner hooks (2 legs each) and 1-2 straight hooks per long side, 4 boxes a hook', () => {
    const S = setup(false), T = S.tank, n = lidClipBoxes(S, T).length / 4, straight = T.L > 1220 ? 2 : 1; // MID_CLIPS_2 (Nathan 2026-11-13: one mid clip up to 48 in)
    expect(n).toBe(8 + 2 * straight);
  });
  it('the ledges sit a few mm below the rim and the lid rests on them', () => {
    const S = setup(false), T = S.tank, top = lidTop(S, T).y(0);
    expect(top).toBeCloseTo(T.H - LID_CLIP_DROP, 5);
    for (const [, y, , , h] of lidClipBoxes(S, T)) expect(y + h / 2).toBeLessThanOrEqual(T.H + 3);
  });
  it('the built lid panels stop 1/4 in inside the opening on every side', () => {
    const S = setup(false), T = S.tank, sc = buildTank({ ...S, units: 'cm' }, T ? S.tank : S.tank, null).scene;
    const lid = sc.children.filter(o => o.userData.lidPart && (o as THREE.Mesh).isMesh && Array.isArray((o as THREE.Mesh).material) && (o as THREE.Mesh).geometry instanceof THREE.BoxGeometry);
    expect(lid.length).toBeGreaterThanOrEqual(2);
    const b = new THREE.Box3(); for (const o of lid) b.expandByObject(o);
    expect(b.min.x).toBeGreaterThanOrEqual(LID_SHORT - 1e-3);
    expect(b.max.x).toBeLessThanOrEqual(T.L - LID_SHORT + 1e-3);
  });
});
