// Lane GM7 (2026-10-29): the generic-only gear types: stat blocks inside their limits, price curves anchored on the rows the Tech menu
// prices and rising with their driver, one model per type that scales with its tunables, and the gear card on the Tech rows.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GENERIC_DEFS, genericPrice, genericStats, genericWatts, lidSurface, matMm, uvbWatts } from '../src/data/genericGear';
import { GEAR_CLASS, GEAR_LIMITS, GENERIC_TYPES, GEAR_TYPES, statsOf, type GenericType } from '../src/scene/gearSpec';
import { genericKit, genericMeshes } from '../src/render/gear/generic';
import { price } from '../src/demand/prices';
import techData from '../src/data/tech.json';
import { genericPanel } from '../src/ui/genericGearCard';

const size = (type: GenericType, stats?: object) => { const b = new THREE.Box3(); for (const m of genericMeshes(type, stats as never)) b.expandByObject(m); return b.getSize(new THREE.Vector3()); };
const parts = (type: GenericType, stats?: object) => { const k = genericKit(type, stats as never); return k.parts.room.length + k.parts.clear.length + k.parts.glow.length + k.parts.wet.length; };

describe('generic-only types', () => {
  it('are class generic, and the library list is unchanged', () => {
    expect(GENERIC_TYPES.length).toBe(17);
    for (const t of GENERIC_TYPES) expect(GEAR_CLASS[t]).toBe('generic');
    for (const t of GEAR_TYPES) expect(GEAR_CLASS[t]).toBe('library');
  });
  for (const t of GENERIC_TYPES) {
    it(`${t}: default inside its limits, priced, modelled`, () => {
      const s = statsOf({ type: t }) as unknown as Record<string, number>, lim = GEAR_LIMITS[t] as Record<string, [number, number]>;
      expect(Object.keys(lim).sort()).toEqual(Object.keys(s).sort());
      for (const k of Object.keys(s)) { expect(s[k]).toBeGreaterThanOrEqual(lim[k][0]); expect(s[k]).toBeLessThanOrEqual(lim[k][1]); }
      expect(GENERIC_DEFS[t].stats.map(m => m.stat).sort()).toEqual(Object.keys(s).sort());
      const p = genericPrice(t);
      expect(p.r.mode).toBeGreaterThan(0); expect(p.r.lo).toBeLessThanOrEqual(p.r.mode); expect(p.r.hi).toBeGreaterThanOrEqual(p.r.mode);
      const ms = genericMeshes(t); expect(ms.length).toBeGreaterThan(0); expect(ms.length).toBeLessThanOrEqual(4);
      expect(size(t).y).toBeGreaterThan(0);
      // every extreme of every stat builds and prices without NaN
      for (const k of Object.keys(lim)) for (const v of lim[k]) { const st = { [k]: v }; expect(Number.isFinite(genericPrice(t, st as never).r.mode), `${t}.${k}=${v}`).toBe(true); expect(parts(t, st)).toBeGreaterThan(0); }
    });
  }
  it('prices at the default are the rows the Tech menu already uses', () => {
    expect(genericPrice('thermostat').r.mode).toBe(price('dry:thermostat-onoff')!.mode);
    expect(genericPrice('thermostat', { dimming: 1 }).r.mode).toBe(price('dry:thermostat-dimming')!.mode);
    expect(genericPrice('timer').r.mode).toBe(price('dry:timer')!.mode);
    expect(genericPrice('mister').r.mode).toBe(price('dry:auto-mister')!.mode);
    expect(genericPrice('sump', { gal: 55 }).r.mode).toBeCloseTo(price('gear:sump')!.mode, 6);
    expect(genericPrice('rodi').r.mode).toBeCloseTo(price('gear:ro-unit')!.mode, 6);
    expect(genericPrice('returnpump', { gph: 330 }).r.mode).toBeCloseTo(price('gear:return-pump')!.mode, 6);
    expect(genericPrice('doser', { heads: 4 }).r.mode).toBeCloseTo(price('gear:dosing-pump')!.mode, 6);
    expect(genericPrice('heatlamp').r.mode).toBeCloseTo(price('dry:dome')!.mode + price('dry:basking-bulb')!.mode, 6);
    expect(genericPrice('uvb', { lengthIn: 22, strengthPct: 5 }).r.mode).toBeCloseTo(price('dry:uvb-t5-24')!.mode, 6);
    expect(genericPrice('uvb', { lengthIn: 12, strengthPct: 5 }).r.mode).toBeCloseTo(price('dry:uvb-low')!.mode, 6);
  });
  it('a bigger driver costs more (never less)', () => {
    const up: [GenericType, string, number[]][] = [['heatlamp', 'watts', [25, 75, 150, 250]], ['heatmat', 'watts', [4, 8, 16, 24, 60]], ['uvb', 'lengthIn', [12, 22, 34, 46]], ['uvb', 'strengthPct', [2, 5, 10, 14]],
      ['mister', 'nozzles', [1, 2, 4, 8]], ['fogger', 'mlPerHour', [100, 400, 1500]], ['doser', 'heads', [1, 2, 4, 6]], ['rodi', 'gpd', [25, 75, 300]], ['sump', 'gal', [5, 20, 55, 200]],
      ['returnpump', 'gph', [100, 600, 3000]], ['lilypipe', 'diameterIn', [0.5, 1, 2]], ['thermostat', 'channels', [1, 2, 4]], ['timer', 'channels', [1, 4, 8]], ['lid', 'lengthIn', [12, 24, 72]]];
    for (const [t, k, xs] of up) { let prev = -1; for (const x of xs) { const m = genericPrice(t, { [k]: x } as never).r.mode; expect(m, `${t}.${k}=${x}`).toBeGreaterThanOrEqual(prev); prev = m; } }
  });
  it('estimates are marked where a row is thin or extrapolated', () => {
    expect(genericPrice('lilypipe').est).toBe(true);
    expect(genericPrice('thermometer').est).toBe(true);
    expect(genericPrice('uvb', { lengthIn: 46 }).est).toBe(true);
    expect(genericPrice('mister').est).toBe(false);
    expect(genericPrice('timer').est).toBe(true);
  });
  it('models scale with their tunables', () => {
    expect(size('heatlamp', { watts: 250 }).x).toBeGreaterThan(size('heatlamp', { watts: 25 }).x);
    expect(size('uvb', { lengthIn: 46 }).x).toBeGreaterThan(size('uvb', { lengthIn: 12 }).x * 3);
    expect(size('heatmat', { watts: 24 }).x).toBeGreaterThan(size('heatmat', { watts: 8 }).x);
    expect(size('mister', { nozzles: 6 }).x).toBeGreaterThan(size('mister', { nozzles: 1 }).x);
    expect(size('fogger', { mlPerHour: 1500 }).y).toBeGreaterThan(size('fogger', { mlPerHour: 100 }).y);
    expect(size('doser', { heads: 6 }).x).toBeGreaterThan(size('doser', { heads: 1 }).x);
    expect(size('sump', { gal: 100 }).x).toBeGreaterThan(size('sump', { gal: 10 }).x);
    expect(size('lilypipe', { diameterIn: 2 }).x).toBeGreaterThan(size('lilypipe', { diameterIn: 0.5 }).x);
    expect(size('returnpump', { gph: 3000 }).y).toBeGreaterThan(size('returnpump', { gph: 100 }).y);
    expect(size('rodi', { gpd: 300 }).y).toBeGreaterThan(size('rodi', { gpd: 25 }).y);
    expect(size('thermostat', { dimming: 1 }).y).toBeGreaterThan(size('thermostat', { dimming: 0 }).y);
  });
  it('derived numbers: UVB tube watts, mat size, lid surface, power draw', () => {
    expect(uvbWatts(12)).toBe(8); expect(uvbWatts(22)).toBe(24); expect(uvbWatts(46)).toBe(54);
    const [l16, d16] = matMm(16); expect(Math.round(l16 / 25.4)).toBe(12); expect(Math.round(d16 / 25.4)).toBe(8);
    const surf = techData.heat.surface as Record<string, number>;
    expect(lidSurface({ openPct: 0, material: 0, hoodLed: 0, lengthIn: 24 })).toBe(surf.glass);
    expect(lidSurface({ openPct: 0, material: 1, hoodLed: 0, lengthIn: 24 })).toBe(surf.mesh);
    expect(lidSurface({ openPct: 0, material: 2, hoodLed: 0, lengthIn: 24 })).toBe(surf.hood);
    expect(lidSurface({ openPct: 100, material: 0, hoodLed: 0, lengthIn: 24 })).toBe(surf.open);
    expect(genericWatts('returnpump', { gph: 330 })).toBeCloseTo((techData.gear as unknown as Record<string, { watts: number }>).returnpump.watts, 6);
    expect(genericWatts('heatlamp', { watts: 100 })).toBe(100);
    expect(genericStats('uvb').strengthPct).toBe(5);
  });
});

describe('gear card on the Tech rows', () => {
  it('a row option with generic gear gets sliders, a price and no tabs', () => {
    const h = genericPanel('uvb', 'tube');
    expect(h).toContain('UVB strength'); expect(h).toContain('Tube length'); expect(h).toContain('data-gc="gen|uvb:uvb"'); expect(h).not.toContain('data-gc-tab'); expect(h).toMatch(/\$\d+ to \$\d+/);
    expect(genericPanel('uvb', 'low')).toContain('value="2.4"');
    expect(genericPanel('gauge', 'yes')).toContain('Thermometer'); expect(genericPanel('gauge', 'yes')).toContain('Hygrometer');
    expect(genericPanel('heatlamp', 'none')).toBe('');
    expect(genericPanel('filter', 'hob')).toBe('');
  });
});
