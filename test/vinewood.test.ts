// Vines along the wood (lane T2 follow-up, on lane T3's anchors, 2026-10-16): a pothos or creeping fig near a piece of
// wood runs some of its vines along the limbs, and its mesh depends on that wood (the build key follows it).
import { describe, expect, it } from 'vitest';
import { itemDeps } from '../src/render/items';
import { plantGeometry } from '../src/render/plant3d';
import { emptyScene } from '../src/scene/defaults';
import { LIBRARY } from '../src/scene/items';
import type { Item, TankSetup } from '../src/scene/types';

// the build paints textures on canvases: a do-nothing 2D context is enough for positions
const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const piece = (id: number, variant: string, x: number, depth: number, e: Partial<Item> = {}): Item =>
  ({ id, kind: LIBRARY[variant].kind, variant, seed: 3, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: LIBRARY[variant].size, ...e });
function dry(items: Item[]): TankSetup {
  const S = structuredClone(emptyScene().tanks[0]);
  S.tank = { ...S.tank, L: 900, D: 450, H: 600 }; S.water.on = false; S.items = items; S.fish = [];
  return S;
}

describe('vines along the wood', () => {
  it('keys a vine on the wood near it, and on nothing for other plants or a vine with no wood in reach', () => {
    const pothos = piece(1, 'pothos', 250, 200, { growth: 0.7 }), fern = piece(3, 'tropfern', 260, 210);
    const near = dry([pothos, fern, piece(2, 'climb', 330, 230, { yaw: 20 })]), far = dry([pothos, fern, piece(2, 'climb', 820, 400)]);
    expect(itemDeps(near, pothos)).toMatch(/^\|L/);
    expect(itemDeps(far, pothos)).toBe('');
    expect(itemDeps(near, fern)).toBe('');
    // moving the branch changes the vine's key (its mesh is rebuilt), turning the fern does not
    const moved = dry([pothos, fern, piece(2, 'climb', 360, 230, { yaw: 20 })]);
    expect(itemDeps(moved, pothos)).not.toBe(itemDeps(near, pothos));
  });
  it('builds the same vine as before when there is no wood, and runs vines along a limb when there is', () => {
    const none = plantGeometry('pothos', 37, 450, {}, undefined, true, 450), again = plantGeometry('pothos', 37, 450, { limbs: undefined }, undefined, true, 450);
    expect(Array.from(again.attributes.position.array)).toEqual(Array.from(none.attributes.position.array));
    // a limb straight up from 30 mm beside the crown: followers climb it toward its tip (400 mm up)
    const limb = [3, 12, 6, 30, 0, 0, 30, 200, 0, 30, 400, 0];
    const on = plantGeometry('pothos', 37, 450, { limbs: limb }, undefined, true, 450), P = on.attributes.position.array;
    // some vine points hug the limb: within its radius + vine + a few mm of x = 30, z = 0, well up it
    let hug = 0;
    for (let i = 0; i < P.length; i += 3) if (P[i + 1] > 120 && P[i + 1] < 380 && Math.hypot(P[i] - 30, P[i + 2]) < 16) hug++;
    let hug0 = 0; const N = none.attributes.position.array;
    for (let i = 0; i < N.length; i += 3) if (N[i + 1] > 120 && N[i + 1] < 380 && Math.hypot(N[i] - 30, N[i + 2]) < 16) hug0++;
    expect(hug).toBeGreaterThan(200);
    expect(hug).toBeGreaterThan(hug0 * 3);
  });
});
