// Lane S231: the light fixture clears a dry tank's lid gear (scene/topgear.ts).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { buildGear, lidTop, type GearPiece } from '../src/render/gear3d';
import { clearTopGear, topGearReach, TOP_GEAR_GAP } from '../src/scene/topgear';
import type { TankSetup } from '../src/scene/types';

const python = (lid: TankSetup['lid'], rim = false): TankSetup => { const sc = parseScene(JSON.parse(SCENES.python)).scene, S = sc.tanks[sc.active]; return { ...S, lid, render: { ...S.render, rim }, light: { ...S.light, type: 'led', height: 50, mount: 'legs' } }; };
describe('light over top gear', () => {
  it('the reach covers every built piece, on each lid and with or without a rim', () => {
    for (const lid of ['mesh', 'glass', 'open'] as const) for (const rim of [false, true]) {
      const S = python(lid, rim), top = S.tank.H + 0, reach = topGearReach(S);
      const hi = Math.max(...(buildGear(S, S.tank, [])[0].userData.gearPieces as GearPiece[]).map(p => p.box.max.y));
      expect(reach).toBeGreaterThanOrEqual(hi - top - 0.5); expect(reach).toBeLessThan(hi - top + 12);
      expect(lidTop(S, S.tank).y(0)).toBeLessThan(top + reach);
    }
  });
  it('raises a low light, leaves a higher one, and ignores a hood and a wet tank', () => {
    const S = python('mesh'); expect(clearTopGear(S)).toBe(true); expect(S.light.height).toBeGreaterThanOrEqual(topGearReach(S) + TOP_GEAR_GAP);
    const h = S.light.height; S.light.height = h + 100; expect(clearTopGear(S)).toBe(false); expect(S.light.height).toBe(h + 100);
    const H = python('hood'); expect(clearTopGear(H)).toBe(false); expect(H.light.height).toBe(50);
    const W = python('mesh'); W.water = { ...W.water, on: true }; expect(clearTopGear(W)).toBe(false);
  });
});
