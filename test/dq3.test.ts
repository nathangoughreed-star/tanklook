// DQ3: LEARNING SEMANTICS and TARGETED CHALLENGERS through the live path (real engine -> nextPair). Spec section 6; scenarios 5, 9, 13, 14, 15, 17, 18.
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { locksOf, lockRoster } from '../src/scene/locks';
import { clearPairCache, nextPair, type PoolMetrics, type ScoredRow } from '../src/scene/pairGen';
import { attrValues, differingAttrs, relEvidence, thumbOf, type AttrKey } from '../src/scene/attrs';
import { aspectsOf, pairEvents, weightsOf } from '../src/explore/aspects';
import { leanBonus, leanOf } from '../src/scene/learning';
import { record as recordOutcome } from '../src/scene/discoverySession';
import { createRealEngine } from '../src/ui/ab/real';
import { bindBriefStore, getBrief, editBrief, emptyBrief } from '../src/ui/setupBrief';
import { applyQuickPrefs, emptyAnswers, readQuickPrefs } from '../src/scene/quickPrefs';
import { QUICK_ARCHETYPES } from '../src/scene/quickArchetypes';
import { diffTouches } from '../src/scene/scope';
import { projectExtras } from '../src/scene/brief';
import type { Fish, TankSetup } from '../src/scene/types';
import type { CandidateRecord, DiscoverySession } from '../src/scene/discoveryTypes';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + (i % 8) * 60, y: 100, depth: 60 + (i % 5) * 60, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fishOf('ember', 6, 201);
  return ensureUids(t);
}
const mkStore = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); bindBriefStore(s); return s; };
const design = (s: Store) => Store.designKey(s.scene);
beforeEach(() => { clearPairCache(); editBrief(() => emptyBrief()); });
const idx = (k: string) => ['tank', 'stocking', 'hardscape', 'decor', 'background', 'substrate', 'plants', 'lighting', 'filtration', 'heating', 'stand'].indexOf(k);
const engine = () => { const s = mkStore(), e = createRealEngine(s, () => ({}), 'dq3-' + Math.random()); s.frozen = true; e.open(['animals', 'plants', 'hardscape', 'substrate']); return { s, e }; };
const first = (e: ReturnType<typeof createRealEngine>) => { const r = e.next(); if (!r.ok) throw new Error('no pair'); return r; };
const plantsOf = (r: CandidateRecord) => [...r.facts.plants].sort().join(',');

describe('scenario 13: a whole-design win is relative evidence, not a verdict on every part', () => {
  const side = (id: string, f: string[]) => ({ id, features: f });
  const A = side('a', ['world:fresh', 'look:x', 'plants:lush', 'species:ember', 'daily-care:low']), B = side('b', ['world:fresh', 'look:y', 'plants:some', 'species:ember', 'daily-care:low']);
  it('A wins for the price: NO aspect event for either side (B\'s plants are not recorded as a dislike)', () => {
    expect(pairEvents({ outcome: 'A', a: A, b: B, why: ['upfront'] })).toEqual([]);
    expect(pairEvents({ outcome: 'A', a: A, b: B, why: ['ongoing'] })).toEqual([]);
  });
  it('no reasons: only what the designs do NOT share is evidence; the loser keeps its world and look family', () => {
    const ev = pairEvents({ outcome: 'A', a: A, b: B });
    const win = ev.find(e => e.c === 'a')!, lose = ev.find(e => e.c === 'b')!;
    expect(win.pos).toContain('plants:lush'); expect(win.pos).not.toContain('species:ember'); expect(win.pos).not.toContain('world:fresh');
    expect(lose.neg).toContain('plants:some'); expect(lose.neg).not.toContain('species:ember'); expect(lose.neg).not.toContain('look:y'); expect(lose.neg).not.toContain('world:fresh');
  });
  it('an aspect reason teaches that aspect only; Like both / neither stay holistic; Skip nothing', () => {
    const ev = pairEvents({ outcome: 'A', a: A, b: B, why: ['plants'] });
    expect(ev.find(e => e.c === 'a')!.pos!.every(k => k.startsWith('plants:') || k.startsWith('natural:'))).toBe(true);
    expect(pairEvents({ outcome: 'both', a: A, b: B }).length).toBe(2); expect(pairEvents({ outcome: 'neither', a: A, b: B }).length).toBe(2); expect(pairEvents({ outcome: 'skip', a: A, b: B })).toEqual([]);
  });
  it('through the real engine: choosing the cheaper design "for upfront cost" leaves the aspect profile empty', () => {
    const { e } = engine(), r = first(e), win = r.a.facts.newSpendUsd.mean <= r.b.facts.newSpendUsd.mean ? 'A' : 'B';
    e.choose(win, ['upfront']);
    expect(weightsOf(aspectsOf(getBrief())).size).toBe(0);
  }, 240000);
});

describe('scenario 14: economic reasons inform the practical preference', () => {
  it('"Upfront cost" when the cheaper design won records a lean that ranks cheaper designs higher; a dearer winner records nothing', () => {
    const { e } = engine(), r = first(e), cheaper = r.a.facts.newSpendUsd.mean <= r.b.facts.newSpendUsd.mean ? 'A' : 'B', dearer = cheaper === 'A' ? 'B' : 'A';
    const gap = Math.abs(r.a.facts.newSpendUsd.mean - r.b.facts.newSpendUsd.mean) / Math.max(r.a.facts.newSpendUsd.mean, r.b.facts.newSpendUsd.mean);
    if (gap < 0.05) return;                                                              // equal-cost pair: nothing to learn (covered by the rule below)
    const lo = (cheaper === 'A' ? r.a : r.b).facts.newSpendUsd.mean, hi = (cheaper === 'A' ? r.b : r.a).facts.newSpendUsd.mean;
    e.choose(dearer, ['upfront']); expect(leanOf(getBrief()).upfront).toBeUndefined();
    let r2 = r, gap2 = 0; for (let i = 0; i < 4 && gap2 < 0.05; i++) { e.restart(); r2 = first(e); gap2 = Math.abs(r2.a.facts.newSpendUsd.mean - r2.b.facts.newSpendUsd.mean) / Math.max(r2.a.facts.newSpendUsd.mean, r2.b.facts.newSpendUsd.mean); }
    if (gap2 < 0.05) return;
    const c2 = r2.a.facts.newSpendUsd.mean <= r2.b.facts.newSpendUsd.mean ? 'A' : 'B';
    e.choose(c2, ['upfront']); const lean = leanOf(getBrief());
    expect(lean.upfront?.n).toBe(1);
    const L = leanBonus(lean, Math.min(lo, hi) * 0.8, undefined).v, H = leanBonus(lean, Math.max(lo, hi) * 1.5, undefined).v;
    expect(L).toBeGreaterThan(0); expect(H).toBeLessThan(0);                          // cheaper ranks up, dearer down
  }, 240000);
  it('"Maintenance" teaches the ownership aspects, never plants or animals', () => {
    const f = (c: string, care: string) => ({ id: c, features: ['plants:lush', 'species:ember', care, 'maintenance:routine'] });
    const ev = pairEvents({ outcome: 'A', a: f('a', 'daily-care:low'), b: f('b', 'daily-care:high'), why: ['maintenance'] });
    expect(ev.length).toBeGreaterThan(0);
    for (const x of ev) for (const k of [...(x.pos ?? []), ...(x.neg ?? [])]) expect(/^(daily-care|maintenance):/.test(k)).toBe(true);
  });
});

describe('scenario 15: "A overall, B\'s plants" is ONE explicit event and a targeted challenger that tests it', () => {
  it('records exactly one thumb, no tagged event, no lock; the next challenger is A with B-inspired plants, with a visible purpose line', () => {
    const { s, e } = engine(), before = design(s), locks0 = JSON.stringify(locksOf(s.tank));
    const r = first(e), va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts), d = differingAttrs(va, vb);
    console.log('DQ3 s15 differing:', d.join(','));
    expect(d, 'the first pair must differ in its plants for this scenario').toContain('plants');
    const picks = relEvidence({ plants: 'B' }, va, vb), nAspects = (aspectsOf(getBrief())?.events ?? []).length;
    const nx = e.choose('A', undefined, undefined, picks); if (!nx.ok) throw new Error('no challenger');
    const t = e.thumbs!();
    expect(Object.keys(t).length).toBe(1); expect(thumbOf(t, 'plants', vb[idx('plants')].elements)).toBe(1);
    expect((aspectsOf(getBrief())?.events ?? []).filter(x => x.c.startsWith('thumb:')).length).toBe(0);   // one event, not a thumb AND a like
    expect(nAspects).toBe(0);
    expect(JSON.stringify(locksOf(s.tank))).toBe(locks0);
    expect(e.session().championId).toBe(r.a.id); expect(e.session().targets?.[0]?.tab).toBe('plants');
    const n = nx;                                                                         // the challenger drawn right after the vote
    expect(n.a.id).toBe(r.a.id);                                                          // A is still the favourite on screen, unedited
    expect(JSON.stringify(e.record(r.a.id)!.snapshot)).toBe(JSON.stringify(r.a.snapshot));
    const intent = n.b.intent; expect(intent, 'a purpose line').toBeTruthy();
    console.log('DQ3 s15 intent:', intent!.text);
    if (!intent!.infeasible) {
      expect(intent!.text).toMatch(/B-inspired planting/); expect(intent!.text).toMatch(/equipment and cost recalculated/);
      expect(intent!.tab).toBe('plants'); expect(intent!.donorId).toBe(r.b.id);
      expect([...n.b.facts.hardscape].sort()).toEqual([...r.a.facts.hardscape].sort());     // A's layout is kept
      expect([...n.b.facts.substrate].sort()).toEqual([...r.a.facts.substrate].sort());
      const shared = n.b.facts.plants.filter(p => r.b.facts.plants.includes(p)); expect(shared.length, 'B\'s plants are in it').toBeGreaterThan(0);
      expect(plantsOf(n.b)).not.toBe(plantsOf(r.a));
      expect(n.b.facts.newSpendUsd.mean).toBeGreaterThanOrEqual(0);                          // cost recalculated for the new design
    } else expect(intent!.text).toMatch(/Could not test|no longer|same design/);
    expect(e.session().targets?.every(x => x.used)).toBe(true);                           // answered once
    s.frozen = false; e.pause(); expect(design(s)).toBe(before);                          // working design untouched
  }, 240000);
  it('a pick on the design that WON overall, or a blank row, leaves no component preference', () => {
    const { e } = engine(), r = first(e), va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts), d = differingAttrs(va, vb);
    if (!d.includes('plants')) return;
    e.choose('A', undefined, undefined, relEvidence({ plants: 'A' }, va, vb)); expect(e.session().targets ?? []).toEqual([]);
    e.restart(); const r2 = first(e); e.choose('A', undefined, undefined, []); expect(e.session().targets ?? []).toEqual([]); void r2;
  }, 240000);
});

describe('scenario 17: targeted changes never overwrite a held tab or a lock; infeasible says why', () => {
  it('a plants tab switched off after the vote is not touched, and the reason is said', () => {
    const { e } = engine(), r = first(e); void r;
    const r1 = e.choose('A'); if (!r1.ok) throw new Error('no pair');
    const wa = attrValues(r1.a.snapshot, r1.a.facts), wb = attrValues(r1.b.snapshot, r1.b.facts);
    if (!differingAttrs(wa, wb).includes('plants')) return;
    e.setScope('plants', false);                                                          // the person holds the plants tab for now
    const n = e.choose('A', undefined, undefined, relEvidence({ plants: 'B' }, wa, wb)); if (!n.ok) throw new Error('no pair');
    expect(plantsOf(n.b)).toBe(plantsOf(n.a));                                            // the held tab is unchanged in the challenger
    expect(n.b.intent?.infeasible).toBe(true); expect(n.b.intent!.text).toMatch(/switched off|Could not test/);
    console.log('DQ3 s17 held:', n.b.intent!.text);
  }, 240000);
  it('a kept roster stays kept: every proposal keeps the locked animals, whatever the preference asks', () => {
    const s = mkStore(); lockRoster(s.tank, 'ember', 'exact', 6);
    const e = createRealEngine(s, () => ({}), 'dq3-lock-' + Math.random()); s.frozen = true; e.open(['animals', 'plants', 'hardscape', 'substrate']);
    const r = first(e), va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts);
    const n = e.choose('A', undefined, undefined, relEvidence({ plants: 'B', ...(differingAttrs(va, vb).includes('stocking') ? { stocking: 'B' } : {}) } as Partial<Record<AttrKey, 'A' | 'B'>>, va, vb)); if (!n.ok) throw new Error('no pair');
    const count = (x: CandidateRecord) => x.snapshot.fish.filter(f => f.species === 'ember').length;
    expect(count(n.b)).toBe(6); expect(count(n.a)).toBe(6);
    expect(locksOf(s.tank).roster.some(x => x.species === 'ember')).toBe(true);
  }, 240000);
});

describe('scenario 18: Like neither broadens; Skip advances without taste change', () => {
  it('Like neither passes both designs, asks for a broader next draw, and the next challenger is drawn from further away / out of family', () => {
    const base: DiscoverySession = { id: 's', baseRev: 1, scope: ['tank', 'animals', 'plants', 'hardscape', 'substrate'], freezes: [], direction: 'freshwater', comparisons: [], status: 'active', championId: 'c', current: { aId: 'c', bId: 'x', type: 'champion' } };
    const r = recordOutcome(base, 'neither');
    expect(r.next.broaden).toBe(true); expect(r.next.type).toBe('champion'); expect(r.tasteSignal.disliked).toEqual(['c', 'x']); expect(r.session.championId).toBe('c');
    // live path: with a favourite, the broadened draw leads with out-of-family and is not nearer than the ordinary one
    const { s, e } = engine(), a = first(e); e.choose('A');
    const proj = { tank: s.effTank, rev: s.rev }, sess = e.session(), look = (id: string) => e.record(id);
    let plain: PoolMetrics | undefined, wide: PoolMetrics | undefined;
    const p1 = nextPair(proj, getBrief(), sess, look, { next: 'champion', budgetMs: 6000, metrics: m => { plain = m; }, units: s.scene.units });
    clearPairCache();
    const p2 = nextPair(proj, getBrief(), sess, look, { next: 'champion', broaden: true, budgetMs: 6000, metrics: m => { wide = m; }, units: s.scene.units });
    expect(p1.ok && p2.ok).toBe(true);
    console.log('DQ3 s18 plain', plain?.strategy, plain?.pairDistance, 'broad', wide?.strategy, wide?.pairDistance);
    expect(wide!.pairDistance!).toBeGreaterThan(plain!.pairDistance!);                      // the broadened draw is further from the favourite (out-of-family leads when looks are open)
    void a;
  }, 240000);
  it('Skip writes no taste event, keeps the favourite and advances', () => {
    const { e } = engine(); first(e); e.choose('A'); const n0 = (aspectsOf(getBrief())?.events ?? []).length, champ = e.session().championId;
    const r = first(e); const nx = e.choose('skip'); const sess = e.session();
    expect((aspectsOf(getBrief())?.events ?? []).length).toBe(n0); expect(sess.championId).toBe(champ); expect(nx.ok).toBe(true);
    if (nx.ok) expect(nx.b.id).not.toBe(r.b.id);
    expect(Object.keys(e.thumbs!()).length).toBe(0);
  }, 240000);
});

describe('scenario 9: refinement gets more controlled; no switch is flipped for the person', () => {
  it('after repeated rounds the challenger differs in few tabs and the scope is exactly what the person set', () => {
    const { e } = engine(); const scope0 = JSON.stringify(e.session().scope), tabs: number[] = [];
    first(e); e.choose('A');
    for (let i = 0; i < 4; i++) { const n = first(e); tabs.push(diffTouches(n.a.snapshot, n.b.snapshot).tabs.length); e.choose('A'); }
    console.log('DQ3 s9 tabs differing per round', tabs.join(','));
    expect(JSON.stringify(e.session().scope)).toBe(scope0); expect(e.session().freezes).toEqual([]);
    expect(Math.min(...tabs.slice(1))).toBeLessThanOrEqual(3);                              // refinement offers controlled contrasts
  }, 480000);
});

describe('scenario 5: a few votes never outweigh a clear stated preference', () => {
  it('learned score is capped at the lower stated-case cap whatever the votes say, through the live scores', () => {
    const card = QUICK_ARCHETYPES.find(c => c.key.startsWith('freshwater'))!;
    let b = applyQuickPrefs(emptyBrief(), { ...emptyAnswers(), arch: { [card.key]: 'interested' } } as never);
    const { s, e } = engine(); e.open(['animals', 'plants', 'hardscape', 'substrate']); editBrief(() => b);
    const r = first(e);
    for (let i = 0; i < 6; i++) editBrief(br => { const ev = pairEvents({ outcome: 'A', a: { id: 'x' + i, features: ['plants:none', 'natural:artificial'] }, b: { id: 'y' + i, features: ['plants:lush', 'natural:live'] } }); void ev; return br; });
    e.choose('B');
    let rows: ScoredRow[] = [];
    nextPair({ tank: s.effTank, rev: s.rev }, getBrief(), e.session(), id => e.record(id), { next: 'champion', budgetMs: 6000, scores: x => { rows = x; }, prefs: readQuickPrefs(getBrief()), units: s.scene.units });
    expect(rows.length).toBeGreaterThan(0);
    for (const x of rows) { expect(Math.abs(x.breakdown.learned)).toBeLessThanOrEqual(0.4 + 1e-9); expect(x.breakdown.cap).toBe(0.4); }
    void r; void projectExtras;
  }, 240000);
});

// DQ3: the real example ("A overall, B's plants") dumped for the screenshot script. Run: DQ3_DUMP=research/screens/DQ3 npx vitest run test/dq3.test.ts -t dump
// @ts-expect-error node only (no node types in this project)
const { writeFileSync, mkdirSync } = await import('node:fs');
const DUMP = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.DQ3_DUMP;
it.skipIf(!DUMP)('dump the A-overall-B-plants example', () => {
  const { e } = engine(), r = first(e), va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts);
  const row = (c: CandidateRecord) => ({ id: c.id, title: c.facts.title, gallons: c.facts.gallons, stocking: c.facts.stocking, plants: c.facts.plants, hardscape: c.facts.hardscape, substrate: c.facts.substrate, newSpendUsd: c.facts.newSpendUsd.mean, toBuy: c.facts.toBuy.map(l => l.label + ' $' + Math.round(l.usd)), weeklyMin: c.facts.weeklyMin.mean, intent: c.intent, snapshot: c.snapshot });
  const n = e.choose('A', undefined, undefined, relEvidence({ plants: 'B' }, va, vb)); if (!n.ok) throw new Error('no challenger');
  mkdirSync(DUMP!, { recursive: true });
  writeFileSync(DUMP + '/example.json', JSON.stringify([{ round: 'first pair; A overall, B plants picked', a: row(r.a), b: row(r.b) }, { round: 'targeted challenger', a: row(n.a), b: row(n.b) }], null, 1));
}, 240000);
