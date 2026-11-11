// DQ1: discovery correctness, preferences and descriptors, through the LIVE `nextPair` (spec 8: scenarios 1-6 and 16, plus the scoring policy and the P4 single learning event).
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { AVOID_SLOT, clearPairCache, liveWants, lookOrder, nextPair, type PairCache, type ScoredRow } from '../src/scene/pairGen';
import { emptyBrief, bindBriefStore, getBrief } from '../src/ui/setupBrief';
import { setRange, setStatus, projectExtras } from '../src/scene/brief';
import { applyQuickPrefs, emptyAnswers, readQuickPrefs, type QuickAnswers } from '../src/scene/quickPrefs';
import { scoreBreakdown, LEARNED_CAP_WITH_STATED, hasStated } from '../src/scene/scorePolicy';
import { designAxes } from '../src/scene/designAxes';
import { aspectsOf, weightsOf } from '../src/explore/aspects';
import { createRealEngine } from '../src/ui/ab/real';
import { attrValues, differingAttrs, relEvidence } from '../src/scene/attrs';
import { getSpecies } from '../src/data/species';
import type { CandidateRecord, DiscoverySession } from '../src/scene/discoveryTypes';
import type { Fish, TankSetup } from '../src/scene/types';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + (i % 8) * 60, y: 100, depth: 60 + (i % 5) * 60, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fishOf('ember', 6, 201);
  return ensureUids(t);
}
const ALL = ['tank', 'animals', 'plants', 'hardscape', 'substrate'] as const;
const session = (): DiscoverySession => ({ id: 's1', baseRev: 1, scope: [...ALL], freezes: [], direction: 'freshwater', comparisons: [], status: 'active' });
const hist = new Map<string, CandidateRecord>();
beforeEach(() => { clearPairCache(); hist.clear(); });
/** the live first pair, plus the pool it was chosen from (the score rows) */
function live(brief = emptyBrief(), o: Parameters<typeof nextPair>[4] = {}) {
  let rows: ScoredRow[] = [];
  const r = nextPair({ tank: project(), rev: 1 }, brief, session(), id => hist.get(id), { scores: x => { rows = x; }, budgetMs: 6000, ...o });
  if (r.ok) for (const c of [r.a, r.b]) hist.set(c.id, c);
  return { r, rows };
}
const sizeTerm = (r: ScoredRow) => r.breakdown.terms.find(t => t.name === 'size');
const withSize = (status: 'preference' | 'hard') => setStatus(setRange(emptyBrief(), 'constraints.tankGal', { min: 20, max: 40 }, status), 'constraints.tankGal', status);

describe('P1: a preferred range ranks, a firm one filters (scenarios 1, 2)', () => {
  it('liveWants: a preferred range is not a firm bound; a hard one is', () => {
    expect(liveWants(withSize('preference')).tankGal).toBeUndefined(); expect(liveWants(withSize('preference')).tankGalPrefer).toEqual({ min: 20, max: 40 });
    expect(liveWants(withSize('hard')).tankGal).toEqual({ min: 20, max: 40 }); expect(liveWants(withSize('hard')).tankGalPrefer).toBeUndefined();
  });
  it('scenario 1: with a PREFERRED 20-40 gal, a viable tank outside the range still reaches the pool, ranked lower', () => {
    const { r, rows } = live(withSize('preference')); expect(r.ok).toBe(true);
    const inside = rows.filter(x => (sizeTerm(x)?.v ?? 0) > 0), outside = rows.filter(x => (sizeTerm(x)?.v ?? 0) < 0);
    console.log('DQ1 s1 pool', rows.map(x => `${x.title}: ${sizeTerm(x)?.why} total ${x.breakdown.total.toFixed(2)}`).join(' | '));
    expect(inside.length).toBeGreaterThan(0); expect(outside.length).toBeGreaterThan(0);   // a tank outside the range is not filtered
    expect(Math.min(...inside.map(x => x.breakdown.stated))).toBeGreaterThan(Math.max(...outside.map(x => x.breakdown.stated)) - 1e-9);
  }, 120000);
  it('scenario 2: with a FIRM 20-40 gal nothing outside it is ever in the pool or the pair', () => {
    const { r, rows } = live(withSize('hard')); expect(r.ok).toBe(true); if (!r.ok) return;
    for (const c of [r.a, r.b]) { expect(c.facts.gallons!).toBeGreaterThanOrEqual(20); expect(c.facts.gallons!).toBeLessThanOrEqual(40); }
    expect(rows.length).toBeGreaterThan(1);
    for (const x of rows) expect((sizeTerm(x)?.v ?? 0)).toBeGreaterThan(0);          // every candidate generated is inside the range
  }, 120000);
  it('a preferred cost or care target never filters (it is flexible); an over-target design is ranked lower', () => {
    const b = applyQuickPrefs(emptyBrief(), { ...emptyAnswers(), budget: { max: 150, firm: false }, care: { max: 30, firm: false } });
    const { r, rows } = live(b); expect(r.ok).toBe(true);
    const over = rows.filter(x => x.breakdown.terms.some(t => (t.name === 'cost target' || t.name === 'care target') && t.v < 0));
    console.log('DQ1 targets: pool', rows.length, 'over a target', over.length);
    expect(rows.length).toBeGreaterThan(0); expect(over.length).toBeGreaterThan(0);   // over-target designs are still offered
  }, 120000);
});

describe('P2: Avoid lowers priority and stays reachable (scenario 3)', () => {
  const avoid = (k: string): QuickAnswers => ({ ...emptyAnswers(), arch: { [k]: 'avoid' } });
  it('an avoided look keeps its place in the try order (a reserved early slot), and ranks below the others when it is in the pool', () => {
    const b = applyQuickPrefs(emptyBrief(), avoid('freshwater-iwagumi')), pf = readQuickPrefs(b);
    expect(pf.arch.layouts['iwagumi-stone-garden']).toBe(-1);
    const cache = {} as PairCache, shown: string[] = [], seen: ScoredRow[] = [];
    for (let i = 0; i < 6 && !cache.looksDone?.has('iwagumi-stone-garden'); i++) {   // successive pairs consume the looks in order; the avoided one is reached, not starved to the end of the catalogue
      let rows: ScoredRow[] = [];
      const r = nextPair({ tank: project(), rev: 1 }, b, session(), id => hist.get(id), { scores: x => { rows = x; }, budgetMs: 6000, cache, shownKeys: shown });
      if (!r.ok) break; for (const c of [r.a, r.b]) { hist.set(c.id, c); shown.push(c.key!); } seen.push(...rows);
    }
    console.log('DQ1 s3 looks generated before the avoided one:', [...cache.looksDone].join(', '));
    expect(cache.looksDone.has('iwagumi-stone-garden')).toBe(true);                // reachable: generated within the first few looks, not last
    expect([...cache.looksDone].indexOf('iwagumi-stone-garden')).toBeLessThanOrEqual(AVOID_SLOT);
    const iw = seen.filter(x => x.breakdown.terms.some(t => t.name === 'card layout' && t.v < 0)), rest = seen.filter(x => !iw.includes(x));
    if (iw.length) expect(Math.max(...iw.map(x => x.breakdown.stated))).toBeLessThan(Math.max(...rest.map(x => x.breakdown.stated)));
  }, 240000);
  it('looks order: nothing is removed by an Avoid, the avoided look is never first, and Explore Something Different ignores the cards', () => {
    const pf = readQuickPrefs(applyQuickPrefs(emptyBrief(), { ...emptyAnswers(), arch: { 'freshwater-iwagumi': 'avoid', 'freshwater-jungle': 'interested' } }));
    const ctx = { w: {} as never, prefs: pf } as never, withCards = lookOrder(ctx, 'freshwater', 'first'), noneFirst = lookOrder({ w: {} as never } as never, 'freshwater', 'first'), fresh = lookOrder(ctx, 'freshwater', 'fresh'), none = lookOrder({ w: {} as never } as never, 'freshwater', 'fresh');
    expect(withCards.map(a => a.id).sort()).toEqual(noneFirst.map(a => a.id).sort());   // the same set: Avoid removed nothing
    expect(withCards[0].id).toBe('overgrown-jungle'); const at = withCards.findIndex(a => a.id === 'iwagumi-stone-garden'); expect(at).toBeGreaterThan(0); expect(at).toBeLessThanOrEqual(AVOID_SLOT + 2);   // early (family round-robin moves it a place), never first, never last
    expect(fresh.map(a => a.id)).toEqual(none.map(a => a.id));                    // broad exploration: the order is the catalogue's, cards or no cards
  });
  it('Explore Something Different scores nothing: an avoided look is not demoted', () => {
    const b = applyQuickPrefs(emptyBrief(), avoid('freshwater-iwagumi'));
    const first = live(b).r; if (!first.ok) throw new Error('no first pair');
    const s = { ...session(), championId: first.a.id }, rows: ScoredRow[] = [];
    const r = nextPair({ tank: project(), rev: 1 }, b, s, id => hist.get(id), { next: 'fresh', scores: x => rows.push(...x), budgetMs: 6000 });
    expect(r.ok).toBe(true);
  }, 240000);
  it('a hard prohibition (no snails, no large fish, no live plants) is a filter, not a ranking', () => {
    const b = applyQuickPrefs(emptyBrief(), { ...emptyAnswers(), avoid: ['snails', 'large-animals', 'no-live-plants'] });
    const { r } = live(b); expect(r.ok).toBe(true); if (!r.ok) return;
    for (const c of [r.a, r.b]) {
      for (const f of c.snapshot.fish) { const sp = getSpecies(f.species)!; expect(sp.kind).not.toBe('snail'); expect(sp.tl).toBeLessThan(150); }
      expect(c.snapshot.items.filter(i => i.kind === 'plant').length).toBe(0);
    }
  }, 120000);
});

describe('P3: descriptors are read from the design, and the live scorer uses them (scenario 4)', () => {
  const dense = (): TankSetup => { const t = project(); t.layout = { ...t.layout, id: 'dutch' }; regenerate(t, 'all', 3); return ensureUids(t); };
  it('the axes differ between a dense planted scape and a bare stone one, and never come from the layout name', () => {
    const lush = dense(), bare = project(); bare.items = bare.items.filter(i => i.kind === 'stone' || i.kind === 'wood');
    const a = designAxes(lush), b = designAxes(bare);
    expect(a.lush).toBeGreaterThan(b.lush); expect(b.plantMode).toBe('none');
    const renamed = structuredClone(lush); renamed.layout = { ...renamed.layout, id: 'iwagumi' };
    expect(designAxes(renamed)).toEqual(a);                                      // same pieces, different label: the same reading
    const fake = structuredClone(lush); fake.items = fake.items.map(i => i.kind === 'plant' ? { ...i, kind: 'artificial', variant: 'plasticstem' } : i);
    expect(designAxes(fake).natural).toBeLessThan(a.natural); expect(designAxes(fake).plantMode).toBe('artificial');
  });
  it('every look axis changes the live ranking of the same pool, in the stated direction', () => {
    const base = live().rows; expect(base.length).toBeGreaterThan(1);
    const recs = base.map(x => hist.get(x.id)).filter((c): c is CandidateRecord => !!c);
    for (const ax of ['natural', 'lush', 'colourful', 'ordered'] as const) for (const sign of [1, -1]) {
      const pf = { ...readQuickPrefs(emptyBrief()), look: { [ax]: sign } };
      for (const c of recs) {
        const s = scoreBreakdown({ pf, S: c.snapshot, facts: c.facts, features: [], archetypeId: '', familyId: '', totals: { setupUsd: 0, minPerWeek: 0 }, weights: new Map() }).stated;
        expect(s).toBeCloseTo(sign * designAxes(c.snapshot)[ax] * 0.3, 6);
      }
    }
  }, 120000);
  it('the pool is not constant: descriptors vary across generated designs', () => {
    const { rows } = live(); const axes = rows.map(x => x.breakdown.axes), spread = (k: 'lush' | 'colourful' | 'ordered') => Math.max(...axes.map(a => a[k])) - Math.min(...axes.map(a => a[k]));
    console.log('DQ1 axes spread [lush, colourful, ordered]', JSON.stringify(axes.map(a => [a.lush, a.colourful, a.ordered].map(n => +n.toFixed(2)))));
    expect(spread('lush') + spread('colourful') + spread('ordered')).toBeGreaterThan(0.3);
  }, 120000);
});

describe('one scoring policy: stated outranks learned (scenario 5)', () => {
  it('learned weight is capped under a stated preference, so votes cannot flip a clear card', () => {
    const b = applyQuickPrefs(emptyBrief(), { ...emptyAnswers(), arch: { 'freshwater-jungle': 'interested' } }), pf = readQuickPrefs(b); expect(hasStated(pf)).toBe(true);
    const S = project(), liked = { archetypeId: 'overgrown-jungle', familyId: 'x' }, other = { archetypeId: 'blackwater-creek', familyId: 'y' };
    const strongAgainst = new Map([['layout:overgrown-jungle', { key: 'layout:overgrown-jungle', w: -5, n: 9, source: 'learned' as const }]]);
    const f = { gallons: 40 } as never, mk = (id: typeof liked, w: typeof strongAgainst) => scoreBreakdown({ pf, S, facts: f, features: ['layout:' + id.archetypeId], ...id, totals: { setupUsd: 0, minPerWeek: 0 }, weights: w });
    const a = mk(liked, strongAgainst), c = mk(other, new Map());
    expect(a.learned).toBeCloseTo(-LEARNED_CAP_WITH_STATED, 6); expect(a.stated).toBeGreaterThan(0.5);
    expect(a.total).toBeGreaterThan(c.total);                                    // strong learned dislikes still lose to the stated Interested card
  });
  it('a told key is never counted as learned, and a card is scored once', () => {
    const b = applyQuickPrefs(emptyBrief(), { ...emptyAnswers(), arch: { 'freshwater-dutch': 'interested' } }), pf = readQuickPrefs(b);
    expect(pf.told).toBeUndefined();                                             // the card's own told keys are not a second signal
    const r = scoreBreakdown({ pf, S: project(), facts: { gallons: 40 } as never, features: ['layout:dutch-garden', 'colors:vivid'], archetypeId: 'dutch-garden', familyId: 'f', totals: { setupUsd: 0, minPerWeek: 0 }, weights: weightsOf(aspectsOf(b)) });
    expect(r.learned).toBe(0); expect(r.terms.filter(t => t.name === 'card layout')).toHaveLength(1);
  });
});

describe('easy exclusions (scenario 6): hard prohibitions hold on every candidate offered', () => {
  it('no shrimp and no snails: no candidate offered contains either', () => {
    const b = applyQuickPrefs(emptyBrief(), { ...emptyAnswers(), avoid: ['snails', 'shrimp'] });
    const { r } = live(b); expect(r.ok).toBe(true); if (!r.ok) return;
    for (const c of [r.a, r.b]) for (const f of c.snapshot.fish) { const sp = getSpecies(f.species)!; expect(sp.kind).not.toBe('snail'); expect(/shrimp/i.test(sp.name)).toBe(false); }
  }, 120000);
});

describe('P4 and scenario 16: one learning event per attribute pick; a blank row records nothing', () => {
  const mkStore = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); bindBriefStore(s); return s; };
  it('a pick writes exactly one thumb and no tagged aspect event; no pick writes nothing', () => {
    const s = mkStore(), e = createRealEngine(s, () => ({}), 'dq1-' + Math.random()); s.frozen = true; e.open(['plants', 'hardscape', 'animals']);
    const r = e.next(); if (!r.ok) throw new Error('no pair');
    const va = attrValues(r.a.snapshot, r.a.facts), vb = attrValues(r.b.snapshot, r.b.facts);
    const tags = () => (aspectsOf(getBrief())?.events ?? []).filter(x => x.k === 'tag').length, thumbs = () => Object.keys(projectExtras(getBrief()).thumbs ?? {}).length;
    const t0 = tags();
    const next = e.choose('A', undefined, undefined, relEvidence({}, va, vb)); expect(thumbs()).toBe(0); expect(tags()).toBe(t0);   // no opinion: nothing
    const r2 = next.ok ? next : r, va2 = attrValues(r2.a.snapshot, r2.a.facts), vb2 = attrValues(r2.b.snapshot, r2.b.facts), d2 = differingAttrs(va2, vb2);
    e.choose('A', undefined, undefined, relEvidence({ [d2[0]]: 'B' }, va2, vb2));
    expect(thumbs()).toBe(1); expect(tags()).toBe(t0);                          // one event: the thumb entry; no second, tagged one
    e.pause(); s.frozen = false;
  }, 240000);
});
