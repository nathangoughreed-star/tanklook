import { describe, expect, it } from 'vitest';
import { reefShape } from '../src/render/coral3d';
import { defaultScene } from '../src/scene/defaults';
import { LIBRARY, itemDims, makeItem, starterItems } from '../src/scene/items';
import { defaultSetup } from '../src/scene/defaults';
import { LAYOUT_IDS } from '../src/scene/validate';
import { parseScene } from '../src/scene/validate';

const REEF = ['liverock', 'acropora', 'montipora', 'mushroom', 'leather'];

describe('live rock and corals (lane E, 2026-10-14)', () => {
  it('are library variants offered in salt tanks only; corals are their own kind, live rock a stone', () => {
    for (const v of REEF) expect(LIBRARY[v].salt).toBe(true);
    expect(LIBRARY.liverock.kind).toBe('stone');
    for (const v of REEF.slice(1)) expect(LIBRARY[v].kind).toBe('coral');
    expect(Object.entries(LIBRARY).filter(([, v]) => v.salt).map(([k]) => k).sort()).toEqual([...REEF].sort());
  });
  it('survive a save and load unchanged', () => {
    const s = defaultScene(), T = s.tanks[0].tank;
    s.tanks[0].water.salt = true;
    s.tanks[0].items = REEF.map((v, i) => makeItem(T, v, i + 1, 100 + i, T.L * (0.15 + 0.17 * i), T.D / 2, { lift: i * 10 }));
    const back = parseScene(JSON.parse(JSON.stringify(s)));
    expect(back.warnings).toEqual([]);
    expect(back.scene.tanks[0].items).toEqual(s.tanks[0].items);
  });
  it('shapes are deterministic, stand on y = 0, carry colour + grit, and are about their size wide', () => {
    for (const v of REEF) for (const seed of [1, 7, 12345]) {
      const size = LIBRARY[v].size, a = reefShape(v, seed, size), b = reefShape(v, seed, size), p = a.attributes.position;
      expect(Array.from(p.array as Float32Array)).toEqual(Array.from(b.attributes.position.array as Float32Array));
      for (const k of ['normal', 'color', 'aGrit']) expect(a.attributes[k]?.count).toBe(p.count);
      expect((p.array as Float32Array).every(Number.isFinite)).toBe(true);
      a.computeBoundingBox();
      const bb = a.boundingBox!, wide = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z), [l, h] = itemDims({ kind: LIBRARY[v].kind, variant: v, seed, size });
      expect(bb.min.y).toBeCloseTo(0, 3);
      expect(wide).toBeGreaterThan(0.6 * l); expect(wide).toBeLessThan(1.35 * l);
      expect(bb.max.y).toBeGreaterThan(0.4 * h); expect(bb.max.y).toBeLessThan(2 * h);
    }
  });
});

describe('Reef starter set (lane I, 2026-10-14)', () => {
  it('is a layout: live rock islands with corals, deterministic, a new arrangement per Shuffle seed', () => {
    expect(LAYOUT_IDS).toContain('reef');
    const s = defaultSetup(); s.water.salt = true; s.tank = { ...s.tank, L: 610, H: 457, D: 457 };
    const sets = [1, 2, 3, 4].map(seed => { s.layout = { id: 'reef', seed }; return starterItems(s); });
    s.layout = { id: 'reef', seed: 1 };
    expect(starterItems(s)).toEqual(sets[0]);
    for (const items of sets) {
      expect(items.filter(i => i.variant === 'liverock').length).toBeGreaterThanOrEqual(4);
      expect(items.filter(i => i.kind === 'coral').length).toBeGreaterThanOrEqual(2);
      expect(items.every(i => LIBRARY[i.variant].salt)).toBe(true);           // reef pieces only: no plants, no wood
      expect(items.some(i => i.kind === 'coral' && i.lift > 20)).toBe(true);   // corals up on the rock
      for (const i of items.filter(i => i.kind === 'coral')) expect(i.lift + itemDims(i)[1]).toBeLessThanOrEqual(s.tank.H); // under the top
    }
    expect(new Set(sets.map(a => JSON.stringify(a))).size).toBe(4);
  });
});
