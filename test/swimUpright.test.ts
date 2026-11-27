// R150: a habit fish turns belly-to-surface only to placed hardscape, never the glass, floor or water surface. Yellow labs (mbuna, orient 0.5) in a
// bare 24 x 12 x 12 in tank fall back to a glass home; they rolled up to 45 deg onto their sides there, and in open water too (a capped clearance read). They must stay near upright (turn bank only).
import { describe, expect, it } from 'vitest';
import { HABIT } from '../src/scene/fishBehavior';
import { makeSwimSim } from './quietSim';
import type { SwimmerSpec } from '../src/scene/swimTypes';
import { boxTank } from './swimFieldDouble';

const L = 610, D = 305, TOP = 290, GROUND = 40;
// like the app's voxel field (render/swimField.ts): a capped read still returns the direction of the nearest solid. The plain double gives none
// when capped, which hid the bug: the live labs banked 45 deg toward the nearest pane in open water.
const box = boxTank(L, D, TOP, GROUND, []);
const field = { ...box, clearance: (x: number, y: number, z: number, grad?: number[], cap = 100) => Math.min(box.clearance(x, y, z, grad as never, 1e9), cap) };
const hab = (id: string) => ({ ...HABIT[id], hold: [...HABIT[id].hold] as [number, number] });
const home = (x: number, y: number, z: number) => ({ x, y, z, yaw: 0, pitch: 0, roll: 0 });

describe('swimUpright', () => {
  it('yellow labs in a bare tank stay upright beside the glass (120 s)', () => {
    const fish: SwimmerSpec[] = [0, 1, 2, 3].map(k => ({ id: k + 1, len: 100, zone: 'water', band: [0.1, 0.7], habit: hab('yellowlab'), home: home(150 + k * 100, 150, -150) }));
    const sim = makeSwimSim(fish, field, 7), dt = 1 / 30;
    let maxRoll = 0, over20 = 0, n = 0;
    for (let s = 0; s < 120 / dt; s++) {
      sim.step(dt);
      if (s < 10 / dt) continue;
      for (const f of fish) { const r = Math.abs(sim.pose(f.id)!.roll); maxRoll = Math.max(maxRoll, r); if (r > 20) over20++; n++; }
    }
    console.log(`yellowlab roll: max ${maxRoll.toFixed(1)} deg, ${(100 * over20 / n).toFixed(1)}% of frames over 20 deg`);
    expect(maxRoll).toBeLessThan(25); // turn bank (12) + flick shudder (9) at most
    expect(over20 / n).toBeLessThan(0.01);
  });
});
