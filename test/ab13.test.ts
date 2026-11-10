// Lane AB13: the A / No opinion / B attribute comparison. Staged picks reach the engine only with the overall vote (never Skip), as soft evidence on the preferred value only:
// no lock, no ban, no history rewrite, ranking nudge only. Old thumbs stay readable.
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { locksOf } from '../src/scene/locks';
import { clearPairCache } from '../src/scene/pairGen';
import { ATTRS, COMBINE_ATTR_TAB, attrValues, differingAttrs, relEvidence, thumbBonus, thumbOf, setThumb, type AttrKey } from '../src/scene/attrs';
import { createRealEngine } from '../src/ui/ab/real';
import { bindBriefStore } from '../src/ui/setupBrief';
import type { Fish, TankSetup } from '../src/scene/types';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + (i % 8) * 60, y: 100, depth: 60 + (i % 5) * 60, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fishOf('ember', 6, 201);
  return ensureUids(t);
}
const mkStore = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); bindBriefStore(s); return s; };
const design = (s: Store) => Store.designKey(s.scene);
beforeEach(() => clearPairCache());

const pairOf = (e: ReturnType<typeof createRealEngine>) => { const r = e.next(); if (!r.ok) throw new Error('no pair'); return r; };
const idx = (k: string) => ATTRS.findIndex(a => a.key === k);

describe('AB13 pure model', () => {
  it('rows are only the attributes that differ; identical ones get none (acceptance 10)', () => {
    const s = mkStore(), e = createRealEngine(s, () => ({}), 'ab13-d-' + Math.random()); e.open(['plants', 'hardscape', 'animals']);
    const r = pairOf(e), va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts), d = differingAttrs(va, vb);
    expect(d.length).toBeGreaterThan(0); expect(d.length).toBeLessThan(ATTRS.length);
    for (const a of ATTRS) { const i = idx(a.key); expect(d.includes(a.key)).toBe(JSON.stringify(va[i].elements) !== JSON.stringify(vb[i].elements) || va[i].text !== vb[i].text); }
  });
  it('relEvidence keeps only differing attributes, names the preferred side value, and an unselected attribute yields nothing (3)', () => {
    const s = mkStore(), e = createRealEngine(s, () => ({}), 'ab13-e-' + Math.random()); e.open(['plants', 'hardscape', 'animals']);
    const r = pairOf(e), va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts), d = differingAttrs(va, vb);
    const k = d[0], same = ATTRS.map(a => a.key).find(x => !d.includes(x)) as AttrKey;
    const ev = relEvidence({ [k]: 'B', ...(same ? { [same]: 'A' } : {}) }, va, vb);
    expect(ev).toEqual([{ attr: k, elements: vb[idx(k)].elements, side: 'B' }]);
    expect(relEvidence({}, va, vb)).toEqual([]); expect(relEvidence(undefined, va, vb)).toEqual([]);
  });
  it('Combine rows exist exactly for the five combinable parts', () => { expect(Object.keys(COMBINE_ATTR_TAB).sort()).toEqual(['hardscape', 'plants', 'stocking', 'substrate', 'tank']); });
  it('old thumbs (up and down) still nudge the ranking and stay readable', () => {
    const s = mkStore(), e = createRealEngine(s, () => ({}), 'ab13-o-' + Math.random()); e.open(['plants', 'hardscape', 'animals']); const r = pairOf(e);
    const els = attrValues(r.a.snapshot, r.a.facts).find(x => x.key === 'stocking')!.elements;
    const m = setThumb(undefined, 'stocking', els, -1); expect(thumbOf(m, 'stocking', els)).toBe(-1); expect(thumbBonus(m, r.a.snapshot, r.a.facts)).toBeLessThan(0);
  });
});

describe('AB13 through the real engine', () => {
  it('Prefer A with two picks: +1 on the preferred values only, no lock, working design untouched, no history rewrite (2, 4, 5, 8, 9)', () => {
    const s = mkStore(), e = createRealEngine(s, () => ({}), 'ab13-v-' + Math.random()), before = design(s), locks0 = JSON.stringify(locksOf(s.tank));
    s.frozen = true; e.open(['plants', 'hardscape', 'animals']); const r = pairOf(e), aJson = JSON.stringify(r.a), bJson = JSON.stringify(r.b);
    const va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts), d = differingAttrs(va, vb), pa = d[0], pb = d[1];
    e.choose('A', undefined, undefined, relEvidence({ [pa]: 'B', ...(pb ? { [pb]: 'A' } : {}) }, va, vb));
    const t = e.thumbs!();
    expect(thumbOf(t, pa, vb[idx(pa)].elements)).toBe(1);
    if (pb) expect(thumbOf(t, pb, va[idx(pb)].elements)).toBe(1);
    expect(thumbOf(t, pa, va[idx(pa)].elements)).toBe(0);                                  // the losing value is not marked down: no implicit dislike
    expect(Object.values(t).every(x => x.v === 1)).toBe(true);
    expect(JSON.stringify(locksOf(s.tank))).toBe(locks0);                                  // no lock
    const core = (x: typeof r.a | undefined) => JSON.stringify({ s: x?.snapshot, f: x?.facts }); expect(core(e.record(r.a.id))).toBe(core(r.a)); expect(core(e.record(r.b.id))).toBe(core(r.b)); void aJson; void bJson;   // history untouched
    e.pause(); s.frozen = false; expect(design(s)).toBe(before);
  }, 240000);
  it('Skip records no attribute evidence even when picks were staged (14); a plain vote adds none (1)', () => {
    const s = mkStore(), e = createRealEngine(s, () => ({}), 'ab13-s-' + Math.random()); s.frozen = true; e.open(['plants', 'hardscape', 'animals']); const r = pairOf(e);
    const va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts);
    e.choose('skip', undefined, undefined, relEvidence({ [differingAttrs(va, vb)[0]]: 'B' }, va, vb)); expect(Object.keys(e.thumbs!())).toHaveLength(0);
    const r2 = e.next(); if (r2.ok) { e.choose('B'); expect(Object.keys(e.thumbs!())).toHaveLength(0); }
    e.pause(); s.frozen = false;
  }, 240000);
  it('repeated picks never create a lock (5)', () => {
    const s = mkStore(), e = createRealEngine(s, () => ({}), 'ab13-l-' + Math.random()); s.frozen = true; e.open(['plants', 'hardscape', 'animals']); let r = pairOf(e);
    for (let i = 0; i < 3 && r.ok; i++) { const va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts); r = e.choose('A', undefined, undefined, relEvidence({ plants: 'B', stocking: 'B' }, va, vb)) as typeof r; }
    expect(locksOf(s.tank).objects.length + locksOf(s.tank).roster.length).toBe(0);
    e.pause(); s.frozen = false;
  }, 240000);
});
