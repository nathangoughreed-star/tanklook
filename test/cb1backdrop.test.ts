// Lane CB1: gear outside the glass (a HOB's body, hoses to a cabinet) never sits inside a 3D backdrop's slab.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { buildGear } from '../src/render/gear3d';
import type { BackdropKind, TankSetup } from '../src/scene/types';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const KINDS: BackdropKind[] = ['rock', 'river', 'reef', 'cork', 'moss', 'jungle'];
const scene = (kind: BackdropKind, filter: string, co2: string): TankSetup => {
  const sc = parseScene(JSON.parse(SCENES['planted'])).scene, S = sc.tanks[sc.active];
  S.backdrop = { kind, depth: 60, seed: 3 }; S.stand.show = true; S.stand.style = 'cabinet'; S.water.on = true;
  S.tech = { ...(S.tech ?? {}), rows: { ...(S.tech?.rows ?? {}), filter, co2 } } as TankSetup['tech'];
  return S;
};
/** Vertices of the built gear that sit inside the backdrop's slab (z from the back glass's inner face to the backdrop's front), below the tank top. */
function inSlab(S: TankSetup) {
  const T = S.tank, z0 = -T.D, z1 = -T.D + S.backdrop.depth, v = new THREE.Vector3(); let n = 0;
  for (const m of buildGear(S, T, [])) {
    if (m.renderOrder === 3.5) continue; // the water-flow overlay at the waterline, not a part
    const a = m.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); if (v.y > 0 && v.y < T.H - 8 && v.z > z0 + 2 && v.z < z1 - 6) n++; }
  }
  return n;
}
describe('gear against a 3D backdrop', () => {
  for (const k of KINDS) for (const f of ['hob', 'canister']) it(`${f} + CO2 on a ${k} backdrop: nothing in the backdrop's slab`, () => { expect(inSlab(scene(k, f, 'pressurized'))).toBe(0); });
});
