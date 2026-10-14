// Audit #52-53: which edits may skip the full rebuild. envKey must change for anything the meshes outside the fish and
// items depend on, and stay put for fish / item edits and the values patched in place (lookKey) or set as uniforms.
// That the incremental path then draws the same pixels as a full rebuild is checked in the browser
// (src/render/incrementalCheck.ts: 144 edits over the six examples + a split view, 0 pixels differ).
import { describe, expect, it } from 'vitest';
import { envKey, lookKey } from '../src/render/build';
import { emptyScene } from '../src/scene/defaults';
import type { TankSetup } from '../src/scene/types';

const tank = () => structuredClone(emptyScene().tanks[0]);
const changed = (fn: (t: TankSetup) => void) => { const a = tank(), b = tank(); fn(b); return { env: envKey(a) !== envKey(b), look: lookKey(a) !== lookKey(b) }; };

describe('envKey / lookKey', () => {
  it('ignores fish, items, the camera and the uniform-only values', () => {
    for (const fn of [
      (t: TankSetup) => t.fish.push({ id: 1, species: 'neon', x: 100, y: 50, depth: 80, yaw: 0, pitch: 0, roll: 0, bend: 0 }),
      (t: TankSetup) => t.items.push({ id: 1, kind: 'stone', variant: 'seiryu', seed: 1, x: 100, depth: 80, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: 80 }),
      (t: TankSetup) => { t.camera.az += 10; },
      (t: TankSetup) => { t.light.kelvin += 500; t.light.bright = 0.5; t.light.room = 0.2; },
      (t: TankSetup) => { t.render.pop = 0.9; },
    ]) expect(changed(fn)).toEqual({ env: false, look: false });
  });
  it('sends the colours patched in place to lookKey', () => {
    expect(changed(t => { t.water.color = '#336633'; })).toEqual({ env: false, look: true });
    expect(changed(t => { t.wall.color = '#123456'; })).toEqual({ env: false, look: true });
    expect(changed(t => { t.substrate.custom.color2 = '#123456'; t.substrate.custom.mix = 0.9; })).toEqual({ env: false, look: true });
  });
  it('rebuilds when the water volume appears or goes (opacity 0 has none)', () => {
    const a = tank(); a.water.opacity = 0.3;
    const b = structuredClone(a); b.water.opacity = 0.5;
    const c = structuredClone(a); c.water.opacity = 0;
    expect(envKey(a)).toBe(envKey(b));
    expect(envKey(a)).not.toBe(envKey(c));
  });
  it('rebuilds for geometry: water level, tank size, substrate grain, stand, light height', () => {
    for (const fn of [
      (t: TankSetup) => { t.water.level = 0.5; },
      (t: TankSetup) => { t.tank.L += 10; },
      (t: TankSetup) => { t.substrate.custom.grain2 = t.substrate.custom.grain2 === 'none' ? 'sand' : 'none'; },
      (t: TankSetup) => { t.stand.height += 10; },
      (t: TankSetup) => { t.light.height = (t.light.height ?? 100) + 50; },
      (t: TankSetup) => { t.render.beams = !t.render.beams; },
    ]) expect(changed(fn).env).toBe(true);
  });
});
