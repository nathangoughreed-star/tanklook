import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import { MAX_STEMS, clampItem, itemDims, makeItem } from '../src/scene/items';
import { parseScene } from '../src/scene/validate';

// Per-plant spread + stem count (2026-10-14): optional, absent = the species' own look
describe('clump spread and stems', () => {
  const scene = () => defaultScene(), T = () => scene().tanks[0].tank;

  it('round-trips through a saved file and is bounded on load', () => {
    const s = scene(), t = s.tanks[0];
    t.items = [makeItem(t.tank, 'stem', 1, 7, 300, 150, { spread: 120, stems: 9 }), makeItem(t.tank, 'grass', 2, 8, 500, 150, { spread: 1e6, stems: 999 }), makeItem(t.tank, 'sword', 3, 9, 700, 150)];
    const back = parseScene(JSON.stringify(s)).scene.tanks[0].items;
    expect(back[0]).toMatchObject({ spread: 120, stems: 9 });
    expect(back[1].stems).toBe(MAX_STEMS);
    expect(back[1].spread).toBeLessThanOrEqual(Math.min(t.tank.L, t.tank.D));
    expect(back[2].spread).toBeUndefined();
    expect(back[2].stems).toBeUndefined();
  });

  it('old files (no fields) load unchanged, and non-clumps drop them', () => {
    const it0 = makeItem(T(), 'stem', 1, 7, 300, 150);
    expect('spread' in it0 || 'stems' in it0).toBe(false);
    const anubias = { ...makeItem(T(), 'anubias', 2, 7, 300, 150), spread: 80, stems: 4 };
    clampItem(anubias, T());
    expect(anubias.spread).toBeUndefined();
    expect(anubias.stems).toBeUndefined();
  });

  it('a wide spread widens the picking size', () => {
    const narrow = makeItem(T(), 'stem', 1, 7, 300, 150), wide = { ...narrow, spread: 300 };
    expect(itemDims(wide)[0]).toBe(300);
    expect(itemDims(narrow)[0]).toBeLessThan(300);
  });
});
