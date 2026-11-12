// Lane AB7: the attribute panel's pure model: thumbs are SOFT (ranking only, never a filter), locks are the one existing lock model (now also holding lighting / filtration / heating),
// a lock holds across generations, and neither a thumb nor a lock touches a record in History.
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { emptyBrief } from '../src/ui/setupBrief';
import { projectExtras, setProjectExtras } from '../src/scene/brief';
import { clearPairCache, nextPair } from '../src/scene/pairGen';
import { startSession } from '../src/scene/discoverySession';
import { gearPart, locksOf, lockViolations } from '../src/scene/locks';
import { readQuickPrefs } from '../src/scene/quickPrefs';
import { ATTRS, attrValues, heldState, isHeld, sameValue, setThumb, thumbBonus, thumbMapOf, thumbOf, type ThumbMap } from '../src/scene/attrs';
import { holdAttr, releaseAttr } from '../src/ui/ab/logic';
import type { CandidateRecord } from '../src/scene/discoveryTypes';
import type { Fish, TankSetup } from '../src/scene/types';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + (i % 8) * 60, y: 100, depth: 60 + (i % 5) * 60, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fishOf('ember', 6, 201);
  return ensureUids(t);
}
const mk = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); return s; };
const B0 = emptyBrief();
const pair = (T: TankSetup, brief = B0) => { const r = nextPair({ tank: T, rev: 1 }, brief, startSession(1, ['plants', 'hardscape', 'animals', 'substrate', 'tank'], 'unsure', 's1'), () => undefined); if (!r.ok) throw new Error('no pair'); return r; };
let A: CandidateRecord;
beforeEach(() => { clearPairCache(); A = pair(project()).a; });
const val = (k: string) => attrValues(A.snapshot, A.facts).find(x => x.key === k)!;

describe('attribute values', () => {
  it('lists every attribute, in order, with a value in words and a lock target', () => {
    const v = attrValues(A.snapshot, A.facts);
    expect(v.map(x => x.key)).toEqual(ATTRS.map(a => a.key));
    expect(v.map(x => x.key)).toEqual(['tank', 'stocking', 'hardscape', 'background', 'substrate', 'plants', 'lighting', 'filtration', 'heating', 'stand']);
    for (const x of v) { expect(x.text.length).toBeGreaterThan(0); expect(x.elements.length).toBeGreaterThan(0); }
    expect(v[0].lock).toEqual({ kind: 'tank' });
    expect(sameValue(v[0], v[0])).toBe(true);
  });
});

describe('thumbs are soft guidance', () => {
  it('toggle on and off; up and down are mutually exclusive per attribute value', () => {
    let m: ThumbMap | undefined = setThumb(undefined, 'stocking', ['ember'], 1);
    expect(thumbOf(m, 'stocking', ['ember'])).toBe(1);
    m = setThumb(m, 'stocking', ['ember'], -1); expect(thumbOf(m, 'stocking', ['ember'])).toBe(-1); expect(Object.keys(m)).toHaveLength(1);
    m = setThumb(m, 'stocking', ['ember'], 0); expect(thumbOf(m, 'stocking', ['ember'])).toBe(0); expect(Object.keys(m)).toHaveLength(0);
    m = setThumb(setThumb(undefined, 'plants', ['a'], 1), 'plants', ['b'], -1); expect(thumbOf(m, 'plants', ['a'])).toBe(1); expect(thumbOf(m, 'plants', ['b'])).toBe(-1);
  });
  it('is a bounded ranking nudge: up raises, down lowers', () => {
    const els = val('stocking').elements;
    const up = thumbBonus(setThumb(undefined, 'stocking', els, 1), A.snapshot, A.facts), dn = thumbBonus(setThumb(undefined, 'stocking', els, -1), A.snapshot, A.facts);
    expect(up).toBeGreaterThan(0); expect(dn).toBeLessThan(0); expect(up).toBeLessThanOrEqual(0.5); expect(thumbBonus(undefined, A.snapshot, A.facts)).toBe(0);
    let many: ThumbMap | undefined; for (const k of ATTRS) many = setThumb(many, k.key, val(k.key).elements, -1);
    expect(thumbBonus(many, A.snapshot, A.facts)).toBeGreaterThanOrEqual(-0.5);
  });
  it('never filters: a thumbs-down on EVERY value of a design still yields pairs, and adds no hard preference or lock', () => {
    let m: ThumbMap | undefined; for (const x of attrValues(A.snapshot, A.facts)) m = setThumb(m, x.key, x.elements, -1);
    const b = setProjectExtras(B0, { ...projectExtras(B0), thumbs: m });   // legacy input: migrated into feedback on read
    clearPairCache(); const r = pair(project(), b);
    expect(r.ok).toBe(true); expect(readQuickPrefs(b)).toEqual(readQuickPrefs(B0));
    expect(project().locks).toBeUndefined();
  });
  it('survive the brief round trip (validated on load)', () => {
    const b = setProjectExtras(B0, { thumbs: setThumb(undefined, 'plants', ['x'], 1) });
    expect(projectExtras(b).thumbs).toBeUndefined(); expect(thumbMapOf(projectExtras(b).feedback)).toEqual({ 'plants|x': { v: 1, e: ['x'] } });
    expect(projectExtras(setProjectExtras(B0, { thumbs: { 'bad key': { v: 2, e: [] } } as never })).feedback).toBeUndefined();
  });
});

describe('locks: the one lock model, held across generations', () => {
  it('lock and unlock every attribute through the same locks the other controls use', () => {
    const s = mk();
    for (const x of attrValues(A.snapshot, A.facts)) {
      if (!x.lock) continue;
      expect(isHeld(s.tank, x.lock)).toBe(false);
      expect(holdAttr(s, A, x.lock).ok).toBe(true); expect(isHeld(s.tank, x.lock)).toBe(true);
      releaseAttr(s, x.lock); expect(isHeld(s.tank, x.lock)).toBe(false);
    }
    expect(locksOf(s.tank).objects).toHaveLength(0); expect(locksOf(s.tank).roster).toHaveLength(0);
  });
  it('a held lighting / filtration / heating stays fixed in every later candidate and any change breaks the lock', () => {
    const s = mk(); for (const k of ['lighting', 'filtration', 'heating', 'stand']) holdAttr(s, A, val(k).lock!);
    expect(locksOf(s.tank).objects.map(o => o.target).sort()).toEqual(['filter', 'heater', 'light', 'stand']);
    const T = structuredClone(s.tank); clearPairCache();
    const r = pair(T); for (const c of [r.a, r.b]) for (const part of ['light', 'filter', 'heater', 'stand'] as const) expect(JSON.stringify(gearPart(c.snapshot, part))).toBe(JSON.stringify(gearPart(T, part)));
    const bad = structuredClone(T); bad.light = { ...bad.light, count: bad.light.count + 1 };
    expect(lockViolations(T, bad).some(v => v.target === 'light')).toBe(true); expect(lockViolations(T, T)).toEqual([]);
  });
  it('a locked stocking and a locked tank hold in the next pair', () => {
    const s = mk(); holdAttr(s, A, val('stocking').lock!); holdAttr(s, A, val('tank').lock!);
    const T = structuredClone(s.effTank); clearPairCache(); const r = pair(T);
    for (const c of [r.a, r.b]) { for (const sp of A.facts.stocking) expect(c.snapshot.fish.filter(f => f.species === sp.species)).toHaveLength(sp.n); expect(c.facts.gallons).toBe(A.facts.gallons); }
  });
  it('a background lock is a normal lock on the saved design', () => {
    const s = mk(); holdAttr(s, A, val('background').lock!);
    expect(locksOf(structuredClone(s.tank)).objects.map(o => o.target)).toContain('backdrop');
  });
});

describe('stand color', () => {
  it('defaults to black, reads as an attribute, and the generator never varies it unlocked', () => {
    expect(val('stand').text).toBe('Black');
    const r = pair(project()); expect(r.a.snapshot.stand.finish).toBe('black'); expect(r.b.snapshot.stand.finish).toBe('black');
  });
});

describe('History is immutable', () => {
  it('thumbs and locks never change a record', () => {
    const s = mk(), a0 = JSON.stringify(A);
    for (const x of attrValues(A.snapshot, A.facts)) { setThumb(undefined, x.key, x.elements, 1); if (x.lock) { holdAttr(s, A, x.lock); releaseAttr(s, x.lock); } }
    expect(JSON.stringify(A)).toBe(a0);
  });
});

describe('AB10: a persistent lock names ONE value (no contradictory Locked badges)', () => {
  const twoDifferent = () => { clearPairCache(); const p = pair(project()); const b = structuredClone(p.b); const bd = (r: CandidateRecord, kind: 'rock' | 'none') => { const c = structuredClone(r); (c.snapshot as TankSetup).backdrop = { ...(c.snapshot.backdrop), kind } as TankSetup['backdrop']; return c; }; return { a: bd(p.a, 'rock'), b: bd({ ...p.b, snapshot: b.snapshot } as CandidateRecord, 'none') }; };
  const bg = (r: CandidateRecord) => attrValues(r.snapshot, r.facts).find(x => x.key === 'background')!.lock!;
  it('locking A background: A reads held, B (a different background) reads other, never held', () => {
    const { a, b } = twoDifferent(); const s = mk();
    expect(heldState(s.effTank, a.snapshot, bg(a))).toBe('free');
    holdAttr(s, a, bg(a));
    expect(heldState(s.effTank, a.snapshot, bg(a))).toBe('held');
    expect(heldState(s.effTank, b.snapshot, bg(b))).toBe('other');
  });
  it('locking B afterwards REPLACES the lock: exactly one lock entry, now B held and A other', () => {
    const { a, b } = twoDifferent(); const s = mk();
    holdAttr(s, a, bg(a)); holdAttr(s, b, bg(b));
    expect(locksOf(s.tank).objects.filter(o => o.target === 'backdrop')).toHaveLength(1);
    expect(s.tank.backdrop.kind).toBe('none');
    expect(heldState(s.effTank, b.snapshot, bg(b))).toBe('held');
    expect(heldState(s.effTank, a.snapshot, bg(a))).toBe('other');
  });
  it('the same value on both sides is held on both (one value, no contradiction); unlock frees both', () => {
    const { a } = twoDifferent(); const s = mk(); holdAttr(s, a, bg(a));
    const twin = structuredClone(a);
    expect(heldState(s.effTank, twin.snapshot, bg(twin))).toBe('held');
    releaseAttr(s, bg(a)); expect(heldState(s.effTank, twin.snapshot, bg(twin))).toBe('free');
  });
  it('the lock survives a regenerated pair and a close / reopen (it lives on the working project, not on a card)', () => {
    const { a } = twoDifferent(); const s = mk(); holdAttr(s, a, bg(a));
    const saved = JSON.parse(JSON.stringify(s.tank.locks)); clearPairCache(); const p2 = pair(s.effTank);
    expect(locksOf(s.tank)).toEqual(saved);
    for (const r of [p2.a, p2.b]) expect(heldState(s.effTank, r.snapshot, bg(r))).toBe(r.snapshot.backdrop.kind === 'rock' ? 'held' : 'other');
  });
});
