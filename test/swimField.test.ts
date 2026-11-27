// SW1: the swim collision field (src/render/swimField.ts).
import { describe, expect, it } from 'vitest';
import { bareSetup } from '../src/scene/defaults';
import { LIBRARY, makeItem } from '../src/scene/items';
import { buildSwimField, fieldSlice, sliceAscii } from '../src/render/swimField';
import type { TankSetup } from '../src/scene/types';
import type { V3 } from '../src/scene/swimTypes';

const tank = (over: Partial<TankSetup['tank']> = {}): TankSetup => { const S = bareSetup(); S.tank = { L: 1219, H: 483, D: 305, ...over }; return S; };

describe('swim field', () => {
  it('empty tank: clearance is the distance to the nearest wall, floor or surface', () => {
    const S = tank(), f = buildSwimField(S, S.tank, { store: 400 });
    const g: V3 = [0, 0, 0];
    for (const [x, y, z] of [[60, 200, -150], [600, 40, -150], [600, 200, -30], [600, f.waterTop - 25, -150], [1200, 200, -150]] as V3[]) {
      const d = -z, want = Math.min(x, 1219 - x, y, f.waterTop - y, d, 305 - d);
      expect(f.clearance(x, y, z, g, 400)).toBeCloseTo(want, -0.5); // within a few mm
      expect(Math.abs(f.clearance(x, y, z, g, 400) - want)).toBeLessThan(6);
    }
    expect(f.clearance(600, 200, -150, g, 50)).toBe(50); // capped
    expect(f.floorAt(300, -100)).toBe(0);
  });

  it('gradient points away from the nearest wall', () => {
    const S = tank(), f = buildSwimField(S, S.tank), g: V3 = [9, 9, 9];
    f.clearance(20, 200, -150, g); expect(g[0]).toBeGreaterThan(0.9);
    f.clearance(1200, 200, -150, g); expect(g[0]).toBeLessThan(-0.9);
    f.clearance(600, 15, -150, g); expect(g[1]).toBeGreaterThan(0.9);
    f.clearance(600, f.waterTop - 15, -150, g); expect(g[1]).toBeLessThan(-0.9);
    f.clearance(600, 200, -10, g); expect(g[2]).toBeLessThan(-0.9); // front glass is z = 0: away is toward -z
    f.clearance(600, 200, -295, g); expect(g[2]).toBeGreaterThan(0.9);
  });

  it('a rock blocks and the gradient leaves it', () => {
    const S = tank(), v = Object.keys(LIBRARY).find(k => LIBRARY[k].kind === 'stone')!;
    S.items = [makeItem(S.tank, v, 1, 3, 600, 150, { size: 200 })];
    const f = buildSwimField(S, S.tank), g: V3 = [0, 0, 0];
    expect(f.clearance(600, 40, -150, g)).toBeLessThan(0);
    // 60 mm beside it, clearance is positive and the gradient has a sideways part pointing away from the rock's middle
    let found = false;
    for (let dx = 40; dx < 400 && !found; dx += 10) { const c = f.clearance(600 + dx, 40, -150, g, 100); if (c > 5 && c < 90) { expect(g[0]).toBeGreaterThan(0.5); found = true; } }
    expect(found).toBe(true);
    // the floor under it is the build's floor (bare tank: 0)
    expect(f.floorAt(600, -150)).toBe(0);
  });

  it('a bowl keeps fish inside the sphere', () => {
    const S = tank({ L: 400, H: 400, D: 400, shape: 'bowl' } as never), f = buildSwimField(S, S.tank, { store: 400 });
    expect(f.clearance(200, 200, -200, undefined, 400)).toBeGreaterThan(100);
    expect(f.clearance(8, f.waterTop / 2, -8, undefined, 400)).toBeLessThan(0); // the corner of the box is outside the sphere
    expect(f.clearance(10, 200, -200, undefined, 400)).toBeLessThan(25);
  });

  it('plants are soft: the canopy edge is open, the core is solid, carpets do not raise floorAt', () => {
    const S = tank(), lib = LIBRARY, pv = Object.keys(lib).find(k => lib[k].kind === 'plant' && k !== 'carpet' && !['redroot', 'salvinia', 'frogbit', 'lettuce'].includes(k))!;
    const it = makeItem(S.tank, pv, 1, 1, 600, 150, { size: 250 });
    S.items = [it];
    const f = buildSwimField(S, S.tank);
    expect(f.clearance(600, 100, -150)).toBeLessThan(0);
    // the canopy's full width (the item's own width) is mostly open: at 0.45 of the width off-centre the fish is outside the core
    const w = it.size * 0.5; // a rough canopy width; at the edge there is clearance
    expect(f.clearance(600 + w, 100, -150, undefined, 100)).toBeGreaterThan(0);
    S.items = [makeItem(S.tank, 'carpet', 2, 1, 600, 150, {})];
    const f2 = buildSwimField(S, S.tank);
    expect(f2.floorAt(600, -150)).toBe(0);
    expect(f2.clearance(600, 2, -150)).toBeLessThan(0);
  });

  it('builds a 4 ft tank with a scape within budget; clearance reuses grad and allocates nothing', () => {
    const S = tank(); S.layout.id = 'planted' as never;
    const lib = LIBRARY, stone = Object.keys(lib).find(k => lib[k].kind === 'stone')!, wood = Object.keys(lib).find(k => lib[k].kind === 'wood')!;
    S.items = [0, 1, 2, 3, 4].map(i => makeItem(S.tank, i % 2 ? stone : wood, i + 1, i + 1, 150 + i * 220, 100 + (i % 3) * 60, { size: 180 }));
    buildSwimField(S, S.tank); // warm
    const t0 = performance.now(); let f = buildSwimField(S, S.tank); for (let i = 0; i < 4; i++) f = buildSwimField(S, S.tank);
    const ms = (performance.now() - t0) / 5;
    console.log(`swimField build ${ms.toFixed(1)} ms, cell ${f.cell.toFixed(1)}, cells ${f.data.length}`);
    expect(ms).toBeLessThan(250);   // was 60 (52-59 ms alone on a quiet machine, so on the edge); CI measured 102 ms and a loaded local run 183 ms on 2026-11-27, swimField.ts unchanged since 8847eb3e: a gross-regression guard
    expect(f.data.length).toBeLessThanOrEqual(150000);
    const g: V3 = [0, 0, 0]; let sum = 0;
    for (let i = 0; i < 20000; i++) { sum += f.clearance(i % 1200, (i * 7) % 450, -((i * 13) % 300), g, 80); }
    expect(Number.isFinite(sum)).toBe(true);
    expect(Math.abs(Math.hypot(...g) - 1)).toBeLessThan(1e-6);
  });

  it('debug dumps render', () => {
    const S = tank(); S.items = [makeItem(S.tank, Object.keys(LIBRARY).find(k => LIBRARY[k].kind === 'stone')!, 1, 3, 600, 150, { size: 200 })];
    const f = buildSwimField(S, S.tank);
    const s = fieldSlice(f, 'xz', 100, 60);
    expect(s.data.length).toBe(s.w * s.h);
    expect(sliceAscii(f, 'xy', 150, 80)).toContain('#');
  });
});

