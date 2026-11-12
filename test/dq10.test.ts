// DQ10: Discover as a non-freezing preview on the live editor (ui/discover/logic.ts createInline): the preview writes nothing, Apply is ONE undo step,
// a stale preview is refused, kept items are never touched, the A/B screen's engine is unchanged (the DQ7 golden keys still hold: test/dq7.test.ts).
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { emptyBrief } from '../src/ui/setupBrief';
import { clearPairCache } from '../src/scene/pairGen';
import { lockObject } from '../src/scene/locks';
import { countText, createInline, gapTabs, openCounts, relaxOf } from '../src/ui/discover/logic';
import type { TankSetup } from '../src/scene/types';

function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1);
  return ensureUids(t);
}
const mk = (edit?: (t: TankSetup) => void) => {
  clearPairCache();
  const t = project(); edit?.(t);
  const s = new Store({ ...defaultScene(), tanks: [t] });
  s.update(x => { x.tanks[0].water.level = 0.85; });   // a real edit: one undo step under it
  const shown: (TankSetup | null)[] = [];
  const c = createInline(s, { brief: () => emptyBrief(), show: x => shown.push(x), opts: { budgetMs: 30000, now: 1e12 } });
  return { s, c, shown };
};
const flags = (s: Store) => ({ design: Store.designKey(s.scene), rev: s.rev, undo: s.snapshotAll(), mark: s.mark, frozen: s.frozen });
beforeEach(() => clearPairCache());

describe('DQ10: the preview writes nothing and never freezes', () => {
  it('Finish my setup: design, rev, undo stack and locks are as they were; the store is not frozen', () => {
    const { s, c, shown } = mk();
    const before = flags(s), locks = JSON.stringify(s.tank.locks);
    const r = c.run('finish');
    expect(r.ok).toBe(true);
    expect(flags(s)).toEqual(before);
    expect(JSON.stringify(s.tank.locks)).toBe(locks);
    expect(s.frozen).toBe(false);
    expect(shown.at(-1)).toBeTruthy();   // drawn through the viewer hook
    // a manual edit still works while the preview is open
    s.update(x => { x.tanks[0].water.level = 0.8; });
    expect(s.tank.water.level).toBe(0.8);
  });
  it('Regenerate replaces the preview, writes nothing and keeps the earlier one in the back list', () => {
    const { s, c } = mk();
    const before = flags(s), r1 = c.run('finish');
    expect(r1.ok).toBe(true);
    const first = c.current()!.id, r2 = c.regenerate()!;
    expect(flags(s)).toEqual(before);
    if (r2.ok) { expect(c.current()!.id).not.toBe(first); expect(c.back().some(p => p.id === first)).toBe(true); expect(c.current()!.rec.key).not.toBe(c.back()[0].rec.key); }
  });
});

describe('DQ10: Apply', () => {
  it('is ONE undo step, and Undo returns the design as it was', () => {
    const { s, c } = mk();
    const r = c.run('finish'); expect(r.ok).toBe(true);
    const before = Store.designKey(s.scene), steps = s.snapshotAll();
    const a = c.apply(); expect(a.ok).toBe(true);
    expect(s.snapshotAll().undo.length).toBe(steps.undo.length + 1);   // exactly one step added
    expect(Store.designKey(s.scene)).not.toBe(before);
    expect(c.current()).toBeUndefined();
    s.undo();
    expect(Store.designKey(s.scene)).toBe(before);
    expect(s.snapshotAll().undo).toEqual(steps.undo);   // one Undo is back where it began
  });
  it('a stale preview is refused and nothing changes', () => {
    const { s, c, shown } = mk();
    c.run('finish'); expect(c.current()).toBeTruthy();
    s.update(x => { x.tanks[0].water.level = 0.7; });   // the design moves under the preview
    c.onChange();
    expect(c.current()!.stale).toBe(true);
    expect(shown.at(-1)).toBeNull();   // the picture is dropped
    const k = Store.designKey(s.scene), rev = s.rev;
    const a = c.apply();
    expect(a).toEqual({ ok: false, reason: 'stale' });
    expect(Store.designKey(s.scene)).toBe(k); expect(s.rev).toBe(rev);
  });
  it('even without onChange, a moved revision is refused (undo counts)', () => {
    const { s, c } = mk();
    c.run('finish'); s.undo();
    const k = Store.designKey(s.scene), a = c.apply();
    expect(a.ok).toBe(false); expect(Store.designKey(s.scene)).toBe(k);
  });
});

describe('DQ10: kept items stay', () => {
  it('every kept piece and animal is in the applied design exactly as it was', () => {
    const { s, c } = mk(t => { for (const o of [t.items[0], t.fish[0]].filter(Boolean)) lockObject(t, o.uid!); });
    const keepItems = s.tank.items.filter(i => i.uid && s.tank.locks?.objects.some(o => o.target === i.uid)), keepFish = s.tank.fish.filter(f => f.uid && s.tank.locks?.objects.some(o => o.target === f.uid));
    expect(keepItems.length + keepFish.length).toBeGreaterThan(0);
    expect(c.run('finish').ok).toBe(true);
    expect(c.apply().ok).toBe(true);
    for (const k of keepItems) { const n = s.tank.items.find(i => i.uid === k.uid); expect(n).toBeTruthy(); expect(JSON.stringify({ ...n, id: 0 })).toBe(JSON.stringify({ ...k, id: 0 })); }
    for (const k of keepFish) expect(s.tank.fish.some(f => f.uid === k.uid)).toBe(true);
  });
});

describe('DQ10: counts, sections and conflicts', () => {
  it('"N kept, M open" counts locked vs open items and animals', () => {
    const { s } = mk(t => { lockObject(t, t.items[0].uid!); });
    const c = openCounts(s.tank);
    expect(c.kept).toBe(1); expect(c.open).toBeGreaterThan(1);
    expect(countText(c)).toBe(`${c.kept} kept, ${c.open} open`);
  });
  it('Fill this section fills only an empty section and changes nothing else', () => {
    const { s, c } = mk(t => { t.fish = []; });
    expect(gapTabs(s.tank)).toContain('animals');
    const r = c.run('fill', 'animals');
    if (r.ok) { c.apply(); expect(s.tank.fish.length).toBeGreaterThan(0); }
    else expect(r.conflicts.length).toBeGreaterThan(0);   // no design fits: said, never faked
    const done = mk();
    expect(done.c.run('fill', 'plants')).toMatchObject({ ok: false, nothingMissing: true });   // plants are present: no gap
  });
  it('relaxations map to single edits that are applied alone', () => {
    const { s, c } = mk(t => { t.discoverOn = ['animals']; });
    const r = relaxOf('Switch a menu on, or release a kept menu', s.tank);
    expect(r.act).toBe('switchOn');
    const rev = s.rev; void c.relax(r);
    expect(s.tank.discoverOn).toContain(r.tab);
    expect(s.rev).toBeGreaterThanOrEqual(rev);
    expect(relaxOf('a bigger filter, or fewer animals', s.tank).act).toBeUndefined();
  });
  it('is refused while the A/B screen holds the store frozen', () => {
    const { s, c } = mk(); s.frozen = true;
    expect(c.run('finish')).toMatchObject({ ok: false });
  });
});
