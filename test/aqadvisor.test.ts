import { describe, expect, it } from 'vitest';
import ids from '../src/data/aqadvisor.json';
import { aqAdvisorUrl, aqKey, aqQuery } from '../src/data/aqadvisor';
import { SPECIES } from '../src/data/species';
import { defaultScene } from '../src/scene/defaults';
import { footprint } from '../src/scene/shape';
import type { Fish, TankSetup } from '../src/scene/types';
// @ts-expect-error plain-JS worker module, no types
import { aqParams, parseStocking } from '../worker/aqadvisor-proxy.js';

const fish = (species: string, n: number): Fish[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
const setup = (f: Fish[]): TankSetup => {
  const s = defaultScene().tanks[0];
  s.tank = { L: 609.6, H: 406.4, D: 304.8 }; // 24 x 16 x 12 in
  s.fish = f;
  return s;
};

describe('AqAdvisor request', () => {
  it('maps every species that lives in water, and only those; stand-ins only for the ones AqAdvisor lacks', () => {
    const map = ids as Record<string, { standIn?: boolean }>;
    for (const sp of SPECIES) expect(sp.id in map, sp.id).toBe(sp.habitat !== 'land');
    expect(Object.keys(map).filter(k => map[k].standIn).sort()).toEqual(['axolotl', 'firenewt', 'firetoad']);
  });

  it('counts per species in a stable order, tank in inches', () => {
    const q = aqQuery(setup([...fish('cardinal', 10), ...fish('bronzecory', 6)]))!;
    expect(q.sel).toBe('200909300034:6::,200909300039:10::');
    expect([q.l, q.d, q.h]).toEqual([24, 12, 16]);
    expect(q.counted).toBe(16);
    expect(aqKey(q)).toBe(aqKey(aqQuery(setup([...fish('bronzecory', 6), ...fish('cardinal', 10)]))!));
    expect(aqAdvisorUrl(q)).toContain('AlreadySelected=200909300034%3A6%3A%3A%2C200909300039%3A10%3A%3A');
  });

  it('stand-ins are counted, land animals skipped; nothing to ask for a dry tank or land animals only', () => {
    const q = aqQuery(setup([...fish('neon', 8), ...fish('axolotl', 1), ...fish('dartfrog', 2)]))!;
    expect(q.counted).toBe(9);
    expect(q.standIns).toEqual([{ name: 'Axolotl', as: 'Dojo Loach', count: 1 }]);
    expect(q.skipped.map(k => k.count)).toEqual([2]);
    expect(aqQuery(setup(fish('dartfrog', 2)))).toBeNull();
    const dry = setup(fish('neon', 8)); dry.water.on = false;
    expect(aqQuery(dry)).toBeNull();
  });

  it('odd shapes: the box keeps the bottom area', () => {
    const s = setup(fish('neon', 8));
    for (const tank of [{ L: 508, H: 406.4, D: 508, shape: 'round' as const }, { L: 914.4, H: 508, D: 406.4, shape: 'bow' as const, bowMin: 254 },
      { L: 609.6, H: 508, D: 609.6, shape: 'poly' as const, sides: 6 }]) {
      s.tank = tank;
      const q = aqQuery(s)!;
      expect(q.l * q.d, tank.shape).toBeCloseTo(footprint(tank).area / 25.4 ** 2, -1);
      expect(q.h).toBeCloseTo(tank.H / 25.4, 1);
    }
    s.tank = { L: 508, H: 406.4, D: 508, shape: 'round' };
    expect(aqQuery(s)!.d).toBeCloseTo(20 * Math.PI / 4, 1); // 20" round: 314 in² floor = 20 x 15.7"
  });
});

describe('AqAdvisor proxy', () => {
  it('reads the stocking level from the results page', () => {
    expect(parseStocking('filtration capacity is 897% . Your aquarium stocking level is <b>66%</b> .')).toBe(66);
    expect(parseStocking('Your aquarium stocking level is 244% . Your tank is seriously overstocked.')).toBe(244);
    expect(parseStocking('<html>no species selected</html>')).toBeNull();
  });

  it('forwards only well-formed stocking requests', () => {
    const ok = new URLSearchParams({ sel: '200909300039:10::,200909300034:6::', l: '24', d: '12', h: '16' });
    expect(aqParams(ok)?.get('AlreadySelected')).toBe('200909300039:10::,200909300034:6::');
    for (const bad of [{ sel: 'x' }, { sel: '200909300039:10::&evil=1' }, { l: '0' }, { h: '9999' }] as Record<string, string>[])
      expect(aqParams(new URLSearchParams({ ...Object.fromEntries(ok), ...bad }))).toBeNull();
  });
});
