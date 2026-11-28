// The air pump's valve (Nathan 2026-11-27) and the canister's return outlet survive a save and reload (parseTech).
import { describe, expect, it } from 'vitest';
import { parseTech } from '../src/scene/tech';

describe('air valve and return outlet are kept on load', () => {
  it('keeps airValve, held to 0..1', () => {
    expect(parseTech({ rows: { air: 'airstone' }, airValve: 1 })?.airValve).toBe(1);
    expect(parseTech({ rows: { air: 'airstone' }, airValve: 3 })?.airValve).toBe(1);
    expect(parseTech({ rows: { air: 'airstone' }, airValve: 'x' })?.airValve).toBeUndefined();
  });
  it('keeps a spray bar or nozzle outlet, drops anything else', () => {
    expect(parseTech({ rows: {}, returnOutlet: 'spraybar' })?.returnOutlet).toBe('spraybar');
    expect(parseTech({ rows: {}, returnOutlet: 'firehose' })?.returnOutlet).toBeUndefined();
  });
});
