import { describe, expect, it } from 'vitest';
import { outcomeOf } from '../src/scene/plantfit';

describe('expected plant outcomes (lane OC)', () => {
  it('a hardy plant below its ideal light only gets a recommendation', () => {
    const o = outcomeOf('sword', 12, 'low');
    expect(o.state).toBe('ok');
    expect(o.severity).toBe(0);
    expect(o.text).toMatch(/thrives best/i);
  });
  it('a demanding plant in dim light struggles, and harder the dimmer it is', () => {
    const a = outcomeOf('carpet', 35, 'co2'), b = outcomeOf('carpet', 10, 'co2');
    expect(a.state).toBe('struggle');
    expect(b.severity).toBeGreaterThan(a.severity);
    expect(b.severity).toBeLessThanOrEqual(1);
  });
  it('a plant that needs CO2 struggles in a low-tech tank even in good light, and not with CO2', () => {
    expect(outcomeOf('stemred', 80, 'low')).toMatchObject({ state: 'struggle', why: 'care' });
    expect(outcomeOf('stemred', 80, 'co2').state).toBe('thrive');
  });
  it('inside the range is plain thriving; land plants always are', () => {
    expect(outcomeOf('anubias', 20, 'low').state).toBe('thrive');
    expect(outcomeOf('pothos', 1, 'low').state).toBe('thrive');
  });
});
