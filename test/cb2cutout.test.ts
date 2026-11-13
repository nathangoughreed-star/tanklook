// Lane CB2 (R8): a cabinet's canister hoses pass through a cut-out in the back panel, never down its outside.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { buildGear } from '../src/render/gear3d';
import { tankUnderside } from '../src/scene/physics';
import { glassThickness } from '../src/scene/physics';
import { CUT_R } from '../src/render/gear/common';
import type { TankSetup } from '../src/scene/types';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const scene = (style: 'cabinet' | 'frame' | 'table', show = true): TankSetup => {
  const sc = parseScene(JSON.parse(SCENES['planted'])).scene, S = sc.tanks[sc.active];
  S.backdrop = { kind: 'none', depth: 0, seed: 1 } as any; S.stand.show = show; S.stand.style = style; S.water.on = true;
  S.tech = { ...(S.tech ?? {}), rows: { ...(S.tech?.rows ?? {}), filter: 'canister', co2: 'none' } } as TankSetup['tech'];
  return S;
};
const routes = (S: TankSetup) => buildGear(S, S.tank, []).flatMap(m => (m.userData.hoseRoutes as THREE.Vector3[][] | undefined) ?? []);

describe('canister hoses and the cabinet back panel', () => {
  it('every hose point below the tank bottom (less the top rail) is inside the cabinet or inside the cut-out', () => {
    const S = scene('cabinet'), T = S.tank, t = glassThickness(T, S.render.glass), top = tankUnderside(T, S.render), zOuter = -T.D - t;
    const rs = routes(S); expect(rs.length).toBe(2);
    for (const r of rs) {
      const curve = new THREE.CatmullRomCurve3(r, false, 'centripetal');
      for (const p of curve.getPoints(200)) {
        if (p.y >= top - 26) continue; // the hose's last 26 mm above the cut-out run beside the panel's 18 mm top rail
        const inside = p.z >= zOuter; // behind the panel's outer face is outside (z more negative)
        const inHole = p.z >= zOuter - 20 && Math.abs(p.y - (top - 68)) <= CUT_R;
        expect(inside || inHole, `hose at y=${p.y.toFixed(0)} z=${p.z.toFixed(0)} hangs outside the panel (zOuter ${zOuter.toFixed(0)} top ${top.toFixed(0)})`).toBe(true);
      }
    }
  });
  it('an open frame stand has no cut-out', () => { expect(routes(scene('frame')).length).toBe(0); });
  it('no stand: no cut-out', () => { expect(routes(scene('cabinet', false)).length).toBe(0); });
});
