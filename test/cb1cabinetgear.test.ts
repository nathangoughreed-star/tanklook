// Lane CB1: the gear row inside a cabinet never overlaps, and what does not fit goes beside the stand and is flagged in the Checks strip.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { cabinetGear, canisterBody, CO2_CYL_R, CAN_GAP } from '../src/scene/cabinetGear';
import { standInside } from '../src/scene/standspace';
import { verdictOf } from '../src/scene/verdict';
import { emptyBrief } from '../src/ui/setupBrief';
import type { TankSetup } from '../src/scene/types';

const setup = (L?: number): TankSetup => {
  const sc = parseScene(JSON.parse(SCENES['planted'])).scene, S = sc.tanks[sc.active];
  S.stand.show = true; S.stand.style = 'cabinet'; S.water.on = true;
  S.tech = { ...(S.tech ?? {}), rows: { ...(S.tech?.rows ?? {}), filter: 'canister', co2: 'pressurized' } } as TankSetup['tech'];
  if (L) S.tank.L = L;
  return S;
};

describe('cabinet gear row', () => {
  it('canister and CO2 cylinder stand apart, inside the cabinet', () => {
    const S = setup(), g = cabinetGear(S)!, can = canisterBody(S)!, room = standInside(S)!;
    expect(can).toBeTruthy(); expect(g.canisterBeside).toBe(false); expect(g.co2Beside).toBe(false);
    expect(g.co2X! - g.canisterX!).toBeGreaterThanOrEqual(can.r + CO2_CYL_R + CAN_GAP - 1e-6);
    expect(g.canisterX! - can.r).toBeGreaterThan(0 - 1e-6);
    expect(g.co2X! + CO2_CYL_R).toBeLessThan(S.tank.L + room.L); // inside
    expect(g.notes).toEqual([]);
  });
  it('a stand too narrow for the row puts the canister, then the cylinder, beside it and says so', () => {
    const S = setup(), can = canisterBody(S)!;
    S.tank.L = Math.round(2 * can.r + 60); // inside is barely wider than the canister
    const g = cabinetGear(S)!;
    expect(g.canisterBeside || g.co2Beside).toBe(true);
    expect(g.notes.length).toBeGreaterThan(0);
    const v = verdictOf(S, emptyBrief());
    expect(v.advisories.some(i => i.id.startsWith('stand:gear'))).toBe(true);
  });
  it('no cabinet, no layout', () => { const S = setup(); S.stand.style = 'frame'; expect(cabinetGear(S)).toBeUndefined(); S.stand.show = false; expect(cabinetGear(S)).toBeUndefined(); });
});
