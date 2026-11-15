// R87: the light layout controls shared by the old Lighting section and the new shell (ui/logic/lightLayout.ts).
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { bestPos, fixtureOf, wattsOf } from '../src/scene/lightout';
import { capCount, countMax, layoutView, optimizePos, setBulb, setFixture, setHoodLed, setLightField, setMount, setPattern, setTech } from '../src/ui/logic/lightLayout';
import type { TankSetup } from '../src/scene/types';

const IN = 25.4;
const withTank = (t: Partial<TankSetup['tank']>, fx: Parameters<typeof setFixture>[1] = 'led'): TankSetup => {
  const s = defaultSetup(); s.tank = { ...s.tank, ...t }; s.lid = 'open'; setFixture(s, fx); return s;
};

describe('each control writes the field the old panel wrote', () => {
  it('numeric sliders', () => {
    const s = withTank({}, 'puck');
    for (const [k, v] of [['count', 3], ['rows', 2], ['cone', 60], ['height', 200], ['kelvin', 9000], ['watts', 30], ['par', 80], ['pos', -20]] as const) { setLightField(s, k, v); expect(s.light[k]).toBe(v); }
  });
  it('spacing under a bulb width (tubes: 20 mm) snaps to auto', () => {
    const s = withTank({}, 'puck'); setLightField(s, 'spacing', 60); expect(s.light.spacing).toBe(0); setLightField(s, 'spacing', 120); expect(s.light.spacing).toBe(120);
    const t = withTank({}, 'tube'); setLightField(t, 'spacing', 15); expect(t.light.spacing).toBe(0); setLightField(t, 'spacing', 40); expect(t.light.spacing).toBe(40);
  });
  it('brightness is exposure in stops while the power is set', () => {
    const s = withTank({}, 'puck'); expect(wattsOf(s)).toBeGreaterThan(0);
    setLightField(s, 'bright', 1); expect(s.light.bright).toBe(2);
    const f = withTank({}, 'puck'); f.light.type = 'flat'; setLightField(f, 'bright', 1.5); expect(f.light.bright).toBe(1.5);
  });
  it('count is capped by the fixture and the pattern', () => {
    const p = withTank({}, 'pendant'); p.light.count = 9; capCount(p.light); expect(p.light.count).toBe(4);
    const g = withTank({}, 'puck'); expect(countMax(g.light)).toBe(6);
    g.light.count = 10; setPattern(g, 'fit'); expect(g.light.pattern).toBe('fit'); expect(countMax(g.light)).toBe(12); expect(g.light.count).toBe(10);
    setPattern(g, 'grid'); expect(g.light.count).toBe(6);
  });
  it('mount, hood LED, bulb watts, fixture and lamp', () => {
    const s = withTank({}, 'led');
    setMount(s, 'hang'); expect(s.light.mount).toBe('hang');
    setHoodLed(s, 'bar'); expect(s.light.hoodLed).toBe('bar'); setHoodLed(s, 'strips'); expect(s.light.hoodLed).toBeUndefined();
    setFixture(s, 'pendant'); expect(fixtureOf(s.light)).toBe('pendant'); setBulb(s, 250); expect(s.light.bulbW).toBe(250);
    setFixture(s, 'tube'); expect(s.light.type).toBe('tube'); expect(s.light.product).toBeUndefined();
    setTech(s, 't8'); expect(s.light.tech).toBe('t8');
    setFixture(s, 'flat'); expect(s.light.type).toBe('flat');
  });
});

describe('Optimize gives the old panel\'s position', () => {
  const tanks: [string, Partial<TankSetup['tank']>][] = [
    ['24 x 12 rectangle', { L: 24 * IN, D: 12 * IN, H: 12 * IN }],
    ['48 x 18 rectangle', { L: 48 * IN, D: 18 * IN, H: 20 * IN }],
    ['36 x 16 bow front', { L: 36 * IN, D: 16 * IN, H: 18 * IN, shape: 'bow', bowMin: 9 * IN }],
  ];
  for (const [name, t] of tanks) for (const fx of ['led', 'tube'] as const) it(`${name}, ${fx}`, () => {
    const s = withTank(t, fx); s.light.pos = 35;
    const old = bestPos(s.tank, s.light); // what panels.ts used to compute inline
    expect(old).not.toBeNull();
    optimizePos(s); expect(s.light.pos).toBe(old);
    expect(layoutView(s).pos.even).toBe(true);
  });
  it('is a no-op for fixtures that are not bars', () => {
    const s = withTank({}, 'puck'); s.light.pos = 10; optimizePos(s); expect(s.light.pos).toBe(10);
  });
});

describe('the view shows each control only where it applies', () => {
  it('pucks: count, rows, spacing, beam, height; no front-to-back', () => {
    const v = layoutView(withTank({}, 'puck'));
    expect([v.count.show, v.rows.show, v.spacing.show, v.cone.show, v.height.show, v.pos.show]).toEqual([true, true, true, true, true, false]);
    expect(v.count.label).toBe('Bulbs');
  });
  it('tubes: spacing and position, no rows or beam', () => {
    const v = layoutView(withTank({}, 'tube'));
    expect([v.count.label, v.rows.show, v.cone.show, v.spacing.tube, v.pos.show]).toEqual(['Tubes', false, false, true, true]);
  });
  it('bars: position only; a hood hides height, mount and position', () => {
    const s = withTank({}, 'led'); const v = layoutView(s);
    expect([v.count.show, v.spacing.show, v.pos.show, v.mount.show]).toEqual([false, false, true, true]);
    s.lid = 'hood'; const h = layoutView(s);
    expect([h.pos.show, h.mount.show, h.height.disabled]).toEqual([false, false, true]);
  });
  it('no fixture hides everything but the fixture', () => {
    const v = layoutView(withTank({}, 'flat'));
    expect([v.count.show, v.height.show, v.kelvin.show, v.bright.show]).toEqual([false, false, false, false]);
  });
});
