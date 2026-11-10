// Lane PS1 (supersedes AB9's allow-then-restore): Discovery never writes the working design. Keep / Lock only change requirements; a lock carries the value it holds until Make It Yours.
import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { emptyBrief } from '../src/ui/setupBrief';
import { clearPairCache, nextPair } from '../src/scene/pairGen';
import { startSession } from '../src/scene/discoverySession';
import { attrValues, foreignPieces, heldState } from '../src/scene/attrs';
import { acceptPlan, foreignOf, holdAttr, keepFromRecord, releaseAttr, releasePieces } from '../src/ui/ab/logic';
import { effectiveTank, isLocked, locksOf } from '../src/scene/locks';
import { parseScene } from '../src/scene/validate';
import type { CandidateRecord } from '../src/scene/discoveryTypes';
import type { TankSetup } from '../src/scene/types';

function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1);
  return ensureUids(t);
}
const SCOPE = ['plants', 'hardscape', 'animals', 'substrate', 'tank'] as const;
function setup() {
  clearPairCache();
  const s = new Store({ ...defaultScene(), tanks: [project()] });
  s.update(t => { t.tanks[0].water.level = 0.85; });   // a real edit: one undo step
  const r = nextPair({ tank: s.effTank, rev: s.rev }, emptyBrief(), startSession(s.rev, [...SCOPE], 'unsure', 's1'), () => undefined);
  if (!r.ok) throw new Error('no pair');
  return { s, a: r.a, b: r.b };
}
const noReq = (s: Store) => { const o = JSON.parse(JSON.stringify(s.scene)); for (const t of o.tanks) { delete t.locks; } return JSON.stringify(o); };

describe('PS1: Keep / Lock never write the working design', () => {
  it('design, undo stack and rev are identical after any sequence of keeps and locks', () => {
    const { s, a, b } = setup();
    const before = { design: Store.designKey(s.scene), snap: s.snapshotAll(), rev: s.rev, mark: s.mark, noReq: noReq(s) };
    s.frozen = true;
    for (const rec of [a, b]) {
      for (const v of attrValues(rec.snapshot, rec.facts)) if (v.lock) holdAttr(s, rec, v.lock);
      for (const it of rec.snapshot.items.slice(0, 3)) keepFromRecord(s, rec, { kind: 'item', uid: it.uid! });
      for (const k of ['substrate', 'tank', 'backdrop'] as const) keepFromRecord(s, rec, { kind: k });
      for (const part of ['light', 'filter', 'heater', 'stand'] as const) keepFromRecord(s, rec, { kind: 'gear', part });
    }
    expect(Store.designKey(s.scene)).toBe(before.design);
    expect(noReq(s)).toBe(before.noReq);
    const after = s.snapshotAll();
    expect(after.undo).toEqual(before.snap.undo); expect(after.redo).toEqual(before.snap.redo); expect(s.rev).toBe(before.rev); expect(s.mark).toBe(before.mark);
    expect(locksOf(s.tank).objects.length).toBeGreaterThan(0);
    // a store listener never sees a design change
    let designSeen = 0; s.subscribe(() => { if (Store.designKey(s.scene) !== before.design) designSeen++; });
    for (const v of attrValues(a.snapshot, a.facts)) if (v.lock) releaseAttr(s, v.lock);
    expect(designSeen).toBe(0);
  });
  it('locks hold their value and survive Close, reload and a fresh Discovery', () => {
    const { s, a: a0 } = setup();
    const a = { ...a0, snapshot: { ...a0.snapshot, backdrop: { ...a0.snapshot.backdrop, kind: s.tank.backdrop.kind === 'rock' ? 'none' : 'rock' } } } as CandidateRecord;   // a background the design does not have
    s.frozen = true;
    const bg = attrValues(a.snapshot, a.facts).find(v => v.key === 'background')!; holdAttr(s, a, bg.lock!);
    const light = attrValues(a.snapshot, a.facts).find(v => v.key === 'lighting')!; holdAttr(s, a, light.lock!);
    s.frozen = false;   // Close
    expect(locksOf(s.tank).objects.map(o => o.target)).toEqual(expect.arrayContaining(['backdrop', 'light']));
    const e = s.effTank; expect(JSON.stringify(e.backdrop)).toBe(JSON.stringify(a.snapshot.backdrop)); expect(JSON.stringify(e.light)).toBe(JSON.stringify(a.snapshot.light));
    const reloaded = parseScene(JSON.stringify(s.scene)).scene.tanks[0];   // autosave round trip
    expect(locksOf(reloaded).objects.find(o => o.target === 'backdrop')?.held).toBeTruthy();
    expect(JSON.stringify(effectiveTank(reloaded).backdrop)).toBe(JSON.stringify(a.snapshot.backdrop));
    expect(heldState(effectiveTank(reloaded), a.snapshot, bg.lock)).toBe('held');
  });
  it('a different hardscape lock REPLACES the old one (never accumulates), after a warning state', () => {
    const { s, a, b } = setup();
    const hard = (r: CandidateRecord) => attrValues(r.snapshot, r.facts).find(v => v.key === 'hardscape')!;
    const ha = hard(a), hb = hard(b); if (!ha.lock || !hb.lock || ha.lock.kind !== 'items' || hb.lock.kind !== 'items') return;
    if (JSON.stringify(ha.lock.uids) === JSON.stringify(hb.lock.uids)) return;
    s.frozen = true; holdAttr(s, a, ha.lock);
    expect(heldState(s.effTank, a.snapshot, ha.lock)).toBe('held');
    const mineOnly = foreignOf(s, b, hb.lock.uids);
    if (!mineOnly.length) return;   // B shares every held piece: nothing to replace
    expect(heldState(s.effTank, b.snapshot, hb.lock)).toBe('other');   // warning first
    expect(isLocked(s.tank, mineOnly[0])).toBe(true);                 // nothing changed yet
    releasePieces(s, mineOnly); holdAttr(s, b, hb.lock);
    for (const u of hb.lock.uids) expect(isLocked(s.tank, u)).toBe(true);
    expect(foreignPieces(s.effTank, b.snapshot, hb.lock.uids)).toEqual([]);
    const locked = locksOf(s.tank).objects.map(o => o.target).filter(t => s.effTank.items.some(i => i.uid === t));
    expect(new Set(locked)).toEqual(new Set(hb.lock.uids.filter(u => locked.includes(u))));
  });
  it('Make It Yours commits the candidate as ONE undo step, drops the held copies, keeps the locks; editing is normal after', () => {
    const { s, a } = setup();
    s.frozen = true;
    const lk = attrValues(a.snapshot, a.facts).find(v => v.key === 'background')!.lock!; holdAttr(s, a, lk);
    const depth = s.mark; s.frozen = false;
    const r = acceptPlan(s, a, startSession(s.rev, [...SCOPE], 'unsure', 's1'));
    expect(r.ok).toBe(true);
    expect(s.mark).toBe(depth + 1);
    expect(locksOf(s.tank).objects.some(o => o.target === 'backdrop')).toBe(true);
    expect(locksOf(s.tank).objects.some(o => o.held)).toBe(false);
    expect(JSON.stringify(s.tank.backdrop)).toBe(JSON.stringify(a.snapshot.backdrop));
    s.update(t => { t.tanks[0].water.level = 0.7; }); expect(s.tank.water.level).toBe(0.7); s.undo(); expect(s.tank.water.level).not.toBe(0.7);
  });
  it('an ordinary edit while Discovery is open is still refused', () => {
    const { s } = setup(); s.frozen = true; const w = s.tank.water.level;
    s.update(t => { t.tanks[0].water.level = 0.5; }); expect(s.tank.water.level).toBe(w);
  });
});
