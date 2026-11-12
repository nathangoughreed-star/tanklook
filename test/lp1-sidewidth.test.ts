import { describe, expect, it } from 'vitest';
import { SIDE_KEY, SIDE_MIN, clampSideWidth, defaultSideWidth, dragCollapses, loadSideWidth, maxSideWidth, saveSideWidth } from '../src/ui/sideWidth';

const fake = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };

describe('LP1 panel width', () => {
  it('default is min(700, half the window)', () => { expect(defaultSideWidth(1920)).toBe(700); expect(defaultSideWidth(1000)).toBe(500); });
  it('clamps to [280, 80 % of the window]', () => {
    expect(clampSideWidth(100, 1600)).toBe(SIDE_MIN);
    expect(clampSideWidth(5000, 1600)).toBe(1280);
    expect(clampSideWidth(612.4, 1600)).toBe(612);
    expect(maxSideWidth(200)).toBe(SIDE_MIN);
  });
  it('a drag well under the minimum collapses', () => { expect(dragCollapses(300)).toBe(false); expect(dragCollapses(250)).toBe(false); expect(dragCollapses(200)).toBe(true); });
  it('stores, reads and forgets the width', () => {
    const s = fake();
    expect(loadSideWidth(s)).toBeNull();
    saveSideWidth(512.7, s); expect(s.m.get(SIDE_KEY)).toBe('513'); expect(loadSideWidth(s)).toBe(513);
    saveSideWidth(null, s); expect(loadSideWidth(s)).toBeNull();
  });
  it('ignores junk and blocked storage', () => {
    const s = fake(); s.setItem(SIDE_KEY, 'abc'); expect(loadSideWidth(s)).toBeNull(); s.setItem(SIDE_KEY, '-5'); expect(loadSideWidth(s)).toBeNull();
    const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    expect(loadSideWidth(bad)).toBeNull(); expect(() => saveSideWidth(400, bad)).not.toThrow();
  });
});
