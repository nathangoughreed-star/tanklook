// Lane CB2 (R8): a cabinet's canister hoses pass through a cut-out in the back panel, never down its outside.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { buildGear } from '../src/render/gear3d';
import { tankUnderside } from '../src/scene/physics';
import { glassThickness } from '../src/scene/physics';
import { CUT_R } from '../src/render/gear/common';
import { cabinetGear, PUMP_W, UV_W, CO2_CYL_R } from '../src/scene/cabinetGear';
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
const full = (): TankSetup => { const S = scene('cabinet'); S.tech = { ...(S.tech ?? {}), filters: undefined, rows: { filter: 'canister', air: 'airstone', uv: 'uv', co2: 'pressurized', heater: 'none' } } as TankSetup['tech']; return S; };
const routes = (S: TankSetup) => buildGear(S, S.tank, []).flatMap(m => (m.userData.hoseRoutes as THREE.Vector3[][] | undefined) ?? []);

describe('every under-tank piece goes inside a cabinet (lane CB3, R83)', () => {
  it('canister, UV, air pump and CO2 cylinder are all in the cabinet row, clear of each other', () => {
    const S = full(), cg = cabinetGear(S)!, T = S.tank, t = glassThickness(T, S.render.glass);
    expect(cg.canisterBeside || cg.co2Beside || cg.pumpBeside || cg.uvBeside).toBe(false);
    const items = ([['canisterX', 190], ['uvX', UV_W], ['pumpX', PUMP_W], ['co2X', 2 * CO2_CYL_R]] as const).map(([k, w]) => ({ k, x: cg[k] as number, w }));
    for (const i of items) { expect(i.x, i.k).toBeTypeOf('number'); expect(i.x - i.w / 2).toBeGreaterThanOrEqual(-t); expect(i.x + i.w / 2).toBeLessThanOrEqual(T.L + t); }
    items.sort((a, b) => a.x - b.x);
    for (let i = 1; i < items.length; i++) expect(items[i].x - items[i].w / 2 - (items[i - 1].x + items[i - 1].w / 2), `${items[i - 1].k} / ${items[i].k}`).toBeGreaterThan(0);
  });
  it('no gear vertex below the cabinet top rail lies outside the cabinet volume', () => {
    const S = full(), T = S.tank, t = glassThickness(T, S.render.glass), top = tankUnderside(T, S.render), v = new THREE.Vector3(); let bad = 0, n = 0, first = '';
    for (const m of buildGear(S, T, [])) {
      if (m.renderOrder === 3.5) continue;
      const q = m.geometry.attributes.position;
      for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i).applyMatrix4(m.matrixWorld); if (v.y >= top - 100) continue; n++; const why = v.x < -t ? 'x-' : v.x > T.L + t ? 'x+' : v.z > t ? 'front' : v.z < -T.D - t - 3 ? 'back ' + v.z.toFixed(0) + ' y' + v.y.toFixed(0) + ' x' + v.x.toFixed(0) : v.y < top - S.stand.height - 2 ? 'floor ' + v.y.toFixed(0) : ''; if (why) { bad++; if (bad === 1) first = why; } }
    }
    expect(n).toBeGreaterThan(500); expect(bad, first).toBe(0);
  });
  it('the air line and the CO2 line also pass through a cut-out (4 lines, none hangs outside the panel)', () => {
    const S = full(), T = S.tank, t = glassThickness(T, S.render.glass), top = tankUnderside(T, S.render), zOuter = -T.D - t, rs = routes(S);
    expect(rs.length).toBe(4);
    for (const r of rs) for (const p of new THREE.CatmullRomCurve3(r, false, 'centripetal').getPoints(300)) {
      if (p.y >= top - 26) continue;
      expect(p.z >= zOuter || (p.z >= zOuter - 20 && Math.abs(p.y - (top - 68)) <= CUT_R), `line at y=${p.y.toFixed(0)} z=${p.z.toFixed(0)}`).toBe(true);
    }
  });
});
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
