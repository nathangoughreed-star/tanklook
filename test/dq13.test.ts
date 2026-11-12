// DQ13: the A/B entry is retired (header Discover opens the in-editor card; ?ab=1 still reaches A/B); Compare picks a preview without writing the design.
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { emptyBrief } from '../src/ui/setupBrief';
import { clearPairCache } from '../src/scene/pairGen';
import { createInline } from '../src/ui/discover/logic';
import { comparePick } from '../src/ui/discover/inline';
import { abEnabled, openDiscovery, registerDiscovery, registerInline } from '../src/ui/discover/entry';
import type { TankSetup } from '../src/scene/types';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const read = (f: string) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8') as string;
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1);
  return ensureUids(t);
}
beforeEach(() => clearPairCache());

describe('DQ13: doors', () => {
  it('abEnabled only for ?ab=1', () => {
    expect(abEnabled('')).toBe(false); expect(abEnabled('?ab=0')).toBe(false); expect(abEnabled('?debug')).toBe(false); expect(abEnabled('?ab=1')).toBe(true);
  });
  it('openDiscovery opens the card, not A/B; resume opens nothing; ?ab=1 reaches A/B', () => {
    const inl = vi.fn(), ab = vi.fn();
    registerInline(inl); registerDiscovery(ab);
    (globalThis as { location?: unknown }).location = { search: '' };
    openDiscovery({}); openDiscovery({ from: 'guided' }); openDiscovery({ scope: ['plants'] });
    expect(inl).toHaveBeenCalledTimes(3); expect(inl).toHaveBeenLastCalledWith('plants'); expect(ab).not.toHaveBeenCalled();
    openDiscovery({ from: 'resume' }); expect(inl).toHaveBeenCalledTimes(3); expect(ab).not.toHaveBeenCalled();
    (globalThis as { location?: unknown }).location = { search: '?ab=1' };
    openDiscovery({ from: 'resume' }); expect(ab).toHaveBeenCalledTimes(1);
    delete (globalThis as { location?: unknown }).location;
  });
  it('the header button and per-section buttons go through openDiscovery', () => {
    expect(read('src/ui/panels.ts')).toMatch(/attachKeep\(store, t => e\.openDiscovery\(/);
    expect(read('src/ui/discover/keep.ts')).toContain('b.onclick = () => open()');
  });
});

describe('DQ13: Compare', () => {
  it('picking a back-list preview shows it, writes no design, adds one Like', () => {
    const t = project(), s = new Store({ ...defaultScene(), tanks: [t] });
    s.update(x => { x.tanks[0].water.level = 0.85; });
    const c = createInline(s, { brief: () => emptyBrief(), show: () => undefined, opts: { budgetMs: 30000, now: 1e12 } });
    expect(c.run('finish').ok).toBe(true); expect(c.regenerate()?.ok).toBe(true);
    expect(c.back().length).toBeGreaterThan(0);
    const before = Store.designKey(s.scene), rev = s.rev, shown = c.current()!.title, backTitle = c.back()[0].title;
    expect(comparePick(s, c, 0)).toBe(true);
    expect(c.current()!.title).toBe(backTitle); expect(c.back().some(p => p.title === shown)).toBe(true);
    expect(Store.designKey(s.scene)).toBe(before); expect(s.rev).toBe(rev);
    expect(s.tank.brief?.project?.feedback?.filter(f => f.level === 'design' && f.v === 1).length).toBe(1);
    expect(comparePick(s, c, 99)).toBe(false);
  });
});
