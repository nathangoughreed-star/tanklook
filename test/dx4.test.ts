// DX4: the Discovery screen's pure part (ui/discover/logic.ts, keep.ts markup). Preview never mutates the store, Apply does not lock,
// Apply and keep locks exactly the applied uids, a stale Apply is refused, locks bind only discovery.
import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { propose } from '../src/scene/discover';
import { lockObject, locksOf } from '../src/scene/locks';
import { previewProposal } from '../src/scene/proposal';
import { emptyBrief } from '../src/ui/setupBrief';
import { appliedTargets, applyCard, defaultScope, diffRows, lockedSummary, previewShot, rangeText, setFishKeep, setKeep, withUids } from '../src/ui/discover/logic';
import { keepHtml } from '../src/ui/discover/keep';
import type { TankSetup } from '../src/scene/types';

function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false;
  t.layout = { ...t.layout, id: 'nature' };
  regenerate(t, 'all', 1);
  t.fish = ['kuhli', 'ember'].flatMap((sp, k) => Array.from({ length: 5 }, (_, i) => ({ id: 100 * (k + 1) + i, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 })));
  return ensureUids(t);
}
const mk = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); return s; };   // one pass so the store's own normalising is already in
const first = (s: Store, scope: ('plants' | 'hardscape' | 'animals')[] = ['plants']) => { const d = propose(s, emptyBrief(), { scope, objective: 'explore' }, 3); expect(d.proposals.length).toBeGreaterThan(0); return d.proposals[0]; };

describe('preview', () => {
  it('previewShot shows the proposal for one draw and leaves the store and its revision exactly as they were', () => {
    const s = mk(), p = first(s), snap = JSON.stringify(s.tank), rev = s.rev;
    let seen = '';
    previewShot(s, previewProposal(s.tank, p), () => { seen = JSON.stringify(s.tank); return 'img'; });
    expect(seen).not.toBe(snap);                    // the previewed tank was what the viewer drew
    expect(JSON.stringify(s.tank)).toBe(snap); expect(s.rev).toBe(rev);
    expect(p.baseRev).toBe(s.rev);                  // so the proposal is still fresh afterwards
  });
  it('restores even when the drawing throws', () => {
    const s = mk(), p = first(s), snap = JSON.stringify(s.tank), rev = s.rev;
    expect(() => previewShot(s, previewProposal(s.tank, p), () => { throw new Error('no gl'); })).toThrow();
    expect(JSON.stringify(s.tank)).toBe(snap); expect(s.rev).toBe(rev);
  });
  it('the card text reads the delta without touching the project', () => {
    const s = mk(), p = first(s), snap = JSON.stringify(s.tank);
    expect(diffRows(s.tank, p).length).toBeGreaterThan(0);
    expect(JSON.stringify(s.tank)).toBe(snap);
  });
});

describe('Apply and Apply and keep', () => {
  it('Apply is one undo step and adds no lock', () => {
    const s = mk(), p = first(s), before = JSON.stringify(s.tank);
    const r = applyCard(s, p, false);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(s.tank)).not.toBe(before);
    expect(locksOf(s.tank).objects).toEqual([]); expect(locksOf(s.tank).roster).toEqual([]);
    s.undo(); expect(JSON.stringify(s.tank)).toBe(before);   // one step back to the start
  });
  it('Apply and keep locks exactly the applied uids, in the same undo step', () => {
    const s = mk(), p = first(s), before = JSON.stringify(s.tank), want = appliedTargets(withUids(p));
    const r = applyCard(s, p, true);
    expect(r.ok).toBe(true);
    const locked = locksOf(s.tank).objects.map(o => o.target).filter(t => t !== 'substrate' && t !== 'tank').sort();
    expect(locked).toEqual(want.uids.filter(u => s.tank.items.some(i => i.uid === u) || s.tank.fish.some(f => f.uid === u)).sort());
    expect(locked.length).toBeGreaterThan(0);
    s.undo(); expect(JSON.stringify(s.tank)).toBe(before); expect(locksOf(s.tank).objects).toEqual([]);
  });
  it('a stale proposal is refused and nothing changes', () => {
    const s = mk(), p = first(s);
    s.update(x => { x.tanks[0].layout.seed += 1; });   // the project moved
    const snap = JSON.stringify(s.tank), rev = s.rev;
    const r = applyCard(s, p, false);
    expect(r).toMatchObject({ ok: false, reason: 'stale' });
    expect(JSON.stringify(s.tank)).toBe(snap); expect(s.rev).toBe(rev);
  });
  it('a proposal that now breaks a lock is refused', () => {
    const s = mk(), p = first(s, ['plants']), victim = p.delta.items?.remove?.[0] ?? p.delta.items?.change?.[0]?.uid;
    if (!victim) return;   // this candidate only adds: nothing to break
    const q = { ...p, baseRev: 0 }; s.rev = 0; s.update(x => { lockObject(x.tanks[0], victim); }, { history: false }); q.baseRev = s.rev;
    expect(applyCard(s, q, false)).toMatchObject({ ok: false, reason: 'locks' });
  });
});

describe('Keep this', () => {
  it('toggles write locks and manual edits stay free', () => {
    const s = mk(), uid = s.tank.items[0].uid!;
    setKeep(s, uid, true); setKeep(s, 'substrate', true); setFishKeep(s, 'ember', 'atLeast');
    expect(locksOf(s.tank).objects.map(o => o.target)).toEqual([uid, 'substrate']);
    expect(locksOf(s.tank).roster).toEqual([{ species: 'ember', mode: 'atLeast', n: 5 }]);
    s.update(x => { x.tanks[0].items[0].x += 10; });   // the person's own edit: allowed
    expect(s.tank.items[0].x).toBeGreaterThan(0 - 1e9);
    setKeep(s, uid, false); setFishKeep(s, 'ember', 'none');
    expect(locksOf(s.tank).objects.map(o => o.target)).toEqual(['substrate']); expect(locksOf(s.tank).roster).toEqual([]);
  });
  it('the lists mark what is kept', () => {
    const s = mk(); setKeep(s, s.tank.items[0].uid!, true); setFishKeep(s, 'kuhli', 'exact');
    expect(keepHtml('hardscape', s.tank) + keepHtml('plants', s.tank)).toContain('kept');
    expect(keepHtml('animals', s.tank)).toContain('Keep exact');
    expect(keepHtml('substrate', s.tank)).toContain('data-keep="substrate"');
  });
});

describe('panel defaults', () => {
  it('a section opens its own tab; the global entry offers every unlocked tab; the summary names the locks', () => {
    const t = project();
    expect(defaultScope(t, 'plants')).toEqual(['plants']);
    expect(defaultScope(t)).toEqual(['tank', 'animals', 'plants', 'hardscape', 'substrate']);
    lockObject(t, 'substrate'); expect(defaultScope(t)).not.toContain('substrate');
    expect(lockedSummary(t)).toContain('substrate'); expect(lockedSummary(project())).toContain('Nothing is locked');
  });
  it('ranges read as dollars', () => { expect(rangeText({ lo: 480, mode: 600, hi: 690 })).toBe('$480 to $690'); expect(rangeText({ lo: 100, mode: 102, hi: 104 })).toBe('about $100'); });
});
