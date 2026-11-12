// DQ11: Keep this / Like / Dislike (ui/discover/keep.ts): Keep = the existing locks with default props, Pin position adds position,
// Like / Dislike write DQ8 feedback at item / category / design level (and take back), the kept count follows the locks live, markup states.
import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { layerOf } from '../src/scene/items';
import { locksOf } from '../src/scene/locks';
import { emptyBrief, projectExtras } from '../src/scene/brief';
import { barHtml, designElements, feedbackEntry, keepState, KEEP_PROPS, learnedText, pressFeedback, pressFor, setKeepFor, setLikeAttr, setPinFor, type FbScope } from '../src/ui/discover/keep';
import { countText, openCounts } from '../src/ui/discover/logic';
import type { TankSetup } from '../src/scene/types';

function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1);
  return ensureUids(t);
}
const mk = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); return s; };   // one no-op update first: the store normalises the design on its first write
const fb = (s: Store) => projectExtras(s.tank.brief ?? emptyBrief()).feedback ?? [];
const hardOf = (s: Store) => s.tank.items.find(i => layerOf(i) !== 'plant')!;
const scOf = (it: { variant: string; uid?: string }): FbScope => ({ level: 'item', cat: 'hardscape', target: it.variant, uid: it.uid });

describe('DQ11 Keep this', () => {
  it('Keep writes a lock with the default props (identity + count: position is NOT held)', () => {
    const s = mk(), it = hardOf(s), sc = scOf(it);
    const dk = Store.designKey(s.scene);
    setKeepFor(s, sc, true);
    const o = locksOf(s.tank).objects.find(x => x.target === it.uid)!;
    expect(o.props).toEqual([...KEEP_PROPS]); expect(o.props).not.toContain('position');
    expect(keepState(s.tank, sc)).toMatchObject({ state: 'all', pinned: false });
    expect(Store.designKey(s.scene)).toBe(dk);   // a lock is a requirement, not a design edit
    setKeepFor(s, sc, false); expect(locksOf(s.tank).objects.some(x => x.target === it.uid)).toBe(false);
  });
  it('Pin position adds position to the same lock, and un-pinning takes it off again', () => {
    const s = mk(), it = hardOf(s), sc = scOf(it);
    setKeepFor(s, sc, true); setPinFor(s, sc, true);
    expect(locksOf(s.tank).objects.find(x => x.target === it.uid)!.props).toEqual([...KEEP_PROPS, 'position']);
    expect(keepState(s.tank, sc).pinned).toBe(true); expect(barHtml(s.tank, sc)).toContain('Pin position');
    setPinFor(s, sc, false); expect(locksOf(s.tank).objects.find(x => x.target === it.uid)!.props).toEqual([...KEEP_PROPS]);
  });
  it('a category keeps all of its pieces; the design also keeps tank and substrate', () => {
    const s = mk(), hard: FbScope = { level: 'category', cat: 'hardscape' }, des: FbScope = { level: 'design', elements: [] };
    setKeepFor(s, hard, true);
    const hs = s.tank.items.filter(i => layerOf(i) !== 'plant'); expect(hs.length).toBeGreaterThan(0);
    expect(hs.every(i => locksOf(s.tank).objects.some(o => o.target === i.uid))).toBe(true); expect(keepState(s.tank, hard).state).toBe('all');
    setKeepFor(s, des, true);
    expect(locksOf(s.tank).objects.some(o => o.target === 'tank')).toBe(true); expect(locksOf(s.tank).objects.some(o => o.target === 'substrate')).toBe(true);
    expect(keepState(s.tank, des).state).toBe('all');
  });
  it('the kept count follows the locks live ("N kept, M open")', () => {
    const s = mk(), c0 = openCounts(s.effTank), it = hardOf(s);
    setKeepFor(s, scOf(it), true);
    const c1 = openCounts(s.effTank);
    expect(c1.kept).toBe(c0.kept + 1); expect(c1.open).toBe(c0.open - 1); expect(countText(c1)).toBe(`${c1.kept} kept, ${c1.open} open`);
  });
});

describe('DQ11 Like / Dislike', () => {
  it('item level: Like writes an entry, Dislike replaces it, the same press takes it back', () => {
    const s = mk(), it = hardOf(s), sc = scOf(it);
    expect(pressFor(s, sc, 1)).toBe(learnedText(sc, 1));
    expect(fb(s)).toHaveLength(1); expect(fb(s)[0]).toMatchObject({ level: 'item', cat: 'hardscape', target: it.variant, v: 1, elements: [it.variant] });
    pressFor(s, sc, -1); expect(fb(s)).toHaveLength(1); expect(fb(s)[0].v).toBe(-1);
    expect(pressFor(s, sc, -1)).toBe('Feedback taken back.'); expect(fb(s)).toHaveLength(0);
    expect(learnedText(sc, -1)).toMatch(/^Noted: fewer pieces like this /);
  });
  it('category level and design level', () => {
    const s = mk(), cat: FbScope = { level: 'category', cat: 'plants' }, des: FbScope = { level: 'design', elements: designElements(s.tank) };
    pressFor(s, cat, 1); pressFor(s, des, -1);
    expect(fb(s).map(f => f.level).sort()).toEqual(['category', 'design']);
    expect(fb(s).find(f => f.level === 'category')).toMatchObject({ cat: 'plants', v: 1 }); expect(fb(s).find(f => f.level === 'category')!.elements!.length).toBeGreaterThan(0);
    pressFor(s, cat, 1); pressFor(s, des, -1);   // both taken back
    expect(fb(s)).toHaveLength(0);
  });
  it('a category entry is found by its name even after the design moved on', () => {
    const s = mk(), cat: FbScope = { level: 'category', cat: 'plants' };
    pressFor(s, cat, 1);
    s.update(x => { const t = x.tanks[0], ps = t.items.filter(i => layerOf(i) === 'plant'); t.items = t.items.filter(i => layerOf(i) !== 'plant').concat(ps.slice(1)); }, { history: false });
    expect(feedbackEntry(fb(s), s.tank, cat)?.v).toBe(1);
    expect(pressFeedback(fb(s), s.tank, cat, 1)).toHaveLength(0);   // pressing again still takes it back: no duplicate entry
  });
  it('Keep and Like sit on the same item independently; "what do you like?" sets attr only when asked', () => {
    const s = mk(), it = hardOf(s), sc = scOf(it);
    setKeepFor(s, sc, true); pressFor(s, sc, 1);
    expect(keepState(s.tank, sc).state).toBe('all'); expect(fb(s)[0].attr).toBeUndefined();
    expect(barHtml(s.tank, sc, false)).toContain('What do you like?'); expect(barHtml(s.tank, sc, false)).not.toContain('data-attr=');
    setLikeAttr(s, sc, 'material'); expect(fb(s)[0]).toMatchObject({ v: 1, attr: 'material' }); expect(fb(s)).toHaveLength(1);
    setLikeAttr(s, sc, 'material'); expect(fb(s)[0].attr).toBeUndefined();   // pressed again clears it
    setKeepFor(s, sc, false); expect(fb(s)[0].v).toBe(1);   // releasing the keep leaves the Like
  });
  it('feedback is not a design edit', () => {
    const s = mk(), key = JSON.stringify([s.tank.items, s.tank.fish]), rev = s.rev;
    pressFor(s, scOf(hardOf(s)), -1);
    expect(JSON.stringify([s.tank.items, s.tank.fish])).toBe(key); expect(s.rev).toBe(rev); expect(fb(s)).toHaveLength(1);
  });
});
