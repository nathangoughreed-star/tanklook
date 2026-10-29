import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';

// Lane GM3 (2026-10-29): the equip item kind is retired; a tank saved with one still loads, the piece as a plain stone.
describe('saved equipment items', () => {
  it('load as plain river stones, no crash, no skipped-item warning', () => {
    const raw = JSON.parse(JSON.stringify(defaultScene()));
    const t = raw.tanks[0], at = t.tank;
    const mk = (id: number, variant: string, size: number) => ({ id, kind: 'equip', variant, seed: 1, x: at.L / 2, depth: at.D / 2, lift: 0, yaw: 0, pitch: 0, tilt: 0, size });
    t.items = [mk(1, 'heater', 250), mk(2, 'hobfilter', 140), mk(3, 'lilypipe', 200), mk(4, 'mister', 240), mk(5, 'lightbar', 600)];
    const { scene, warnings } = parseScene(raw);
    const items = scene.tanks[0].items;
    expect(items).toHaveLength(5);
    for (const it of items) { expect(it.kind).toBe('stone'); expect(it.variant).toBe('river'); expect(it.size).toBeLessThanOrEqual(120); }
    expect(warnings.some(w => /unknown aquascape/.test(w))).toBe(false);
  });
});
